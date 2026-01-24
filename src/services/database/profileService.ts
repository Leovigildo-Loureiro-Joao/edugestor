// services/database/profileService.ts
import { use } from 'react';
import db, { supabase, supabaseUrl } from './db';
import { syncManager } from './syncManager';
import { SyncStatus } from '../../types/base';

export const profileService = {
  // ✅ Salvar perfil localmente
  async saveProfile(profile: any) {
    try {
      // Se você tem tabela profiles no Dexie
      await db.table('profiles')?.put({
        id: profile.id,
        email: profile.email,
        role: profile.role || 'user',
        nome: profile.nome || '',
        updated_at: new Date().toISOString(),
        sync_status: 'pending'
      });
      
      // Também salvar no localStorage para acesso rápido
      localStorage.setItem('user_profile', JSON.stringify(profile));
      localStorage.setItem('has_admin_setup', 'true');
      
      console.log('✅ Perfil salvo localmente');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
    }
  },
  
  // ✅ Buscar perfil local
  async getLocalProfile() {
    try {
      // 1. Tentar localStorage primeiro
      const localProfile = localStorage.getItem('user_profile');
      if (localProfile) {
        const profile =JSON.parse(localProfile);
        localStorage.setItem("active_instituicao_id",profile.instituicao_id)
        return JSON.parse(localProfile);
      }
      
      // 2. Tentar Dexie
      const profiles = await db.table('profiles')?.toArray();
      if (profiles && profiles.length > 0) {
        localStorage.setItem("active_instituicao_id",profiles[0].instituicao_id)
        return profiles[0];
      }
      
      return null;
    } catch (error) {
      console.log('⚠️ Não há perfil local');
      return null;
    }
  },
  
  // ✅ Verificar se há admin local
  async hasLocalAdmin() {
    try {
      // Check localStorage flag
      if (localStorage.getItem('has_admin_setup') === 'true') {
        return true;
      }
      
      // Check Dexie
      const adminCount = await db.table('profiles')
        ?.where('role')
        .equals('admin')
        .count();
      
      return (adminCount || 0) > 0;
    } catch {
      return false;
    }
  },

   // ✅ ADMIN: Adicionar usuário (apenas admin pode)
  async addUserByAdmin(userData: {
    email: string;
    nome: string;
    role: 'manager' | 'teacher' | 'user';
    instituicao_id: string;
  }, adminId: string) {
    try {
      // 1. Verificar se é admin
      const adminProfile = await this.getLocalProfile();
      if (adminProfile?.role !== 'admin') {
        throw new Error('Apenas administradores podem adicionar usuários');
      }

      // 2. Criar usuário OFFLINE primeiro
      const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const offlineUser = {
        id: tempUserId,
        email: userData.email,
        nome: userData.nome,
        role: userData.role,
        instituicao_id: userData.instituicao_id,
        status: 'pending', // Pendente de ativação
        created_by: adminId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'pending' as SyncStatus,
        is_local: true
      };

      // 3. Salvar localmente
      await db.profiles.add(offlineUser);
      
      // 4. Salvar no localStorage para acesso rápido
      const pendingUsers = JSON.parse(localStorage.getItem('pending_users') || '[]');
      pendingUsers.push(offlineUser);
      localStorage.setItem('pending_users', JSON.stringify(pendingUsers));

      // 5. Adicionar à fila de sync (mas NÃO sincronizar automaticamente)
      await syncManager.markAsSynced('profiles', offlineUser.id);

      return {
        success: true,
        message: 'Usuário adicionado localmente. Será sincronizado quando houver internet.',
        userId: tempUserId
      };
    } catch (error) {
      console.error('Erro ao adicionar usuário:', error);
      throw error;
    }
  },

  async  testToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('❌ Nenhuma sessão ativa');
      return false;
    }

    console.log('🔑 Token:', session.access_token.substring(0, 20) + '...');
    console.log('📧 Email do usuário na sessão:', session.user?.email);

    // Testar direto com a API do Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': anonKey
      }
    });

    if (response.ok) {
      const userData = await response.json();
      console.log('✅ Token válido! Usuário:', userData.email);
      return true;
    } else {
      const error = await response.json();
      console.error('❌ Token inválido:', error);
      return false;
    }

  } catch (error) {
    console.error('❌ Erro ao testar token:', error);
    return false;
  }
},

  // ✅ Sincronizar usuários pendentes (APENAS quando admin quiser)
async syncPendingUsers() {
  try {
    console.log('🔄 Iniciando sincronização de usuários pendentes...');

    const pendingUsers = await db.profiles
      .where('sync_status')
      .equals('pending')
      .toArray();

    console.log(`📋 ${pendingUsers.length} usuário(s) pendente(s) encontrado(s)`);

    if (pendingUsers.length === 0) {
      return { success: true, message: 'Nenhum usuário pendente para sincronizar' };
    }

    if (!navigator.onLine) {
      return { success: false, message: 'Sem conexão com a internet' };
    }

    // Obter sessão atual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('❌ Erro ao obter sessão:', sessionError);
      return {
        success: false,
        message: 'Sessão expirada. Faça login novamente.',
        requiresLogin: true
      };
    }

    console.log('🔑 Token JWT obtido, usuário:', session.user?.email);

    // Preparar dados
    const usersToSync = pendingUsers.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      instituicao_id: user.instituicao_id
    }));

    console.log('🚀 Chamando Edge Function com dados:', usersToSync);

    const EDGE_FUNCTION_URL = 'https://fbgpygnqzcifbfzxqlzh.supabase.co/functions/v1/sync-users';
    
    console.log('🌐 URL da Edge Function:', EDGE_FUNCTION_URL);

    // Configurar fetch com timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ pendingUsers: usersToSync }),
      signal: controller.signal,
      mode: 'cors' // Explicitamente definir modo CORS
    }).finally(() => clearTimeout(timeoutId));

    console.log('📨 Resposta recebida, status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na resposta:', errorText);
      
      let errorMessage = 'Erro ao sincronizar usuários';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        // Não é JSON
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('📦 Resposta da Edge Function:', result);

    // Processar resultados
    if (result.details) {
      console.log('📊 Processando detalhes dos resultados...');
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const detail of result.details) {
        if (detail.status === 'success' || detail.status === 'updated') {
          await db.profiles.update(detail.id, {
            sync_status: 'synced',
            supabase_id: detail.supabaseId,
            updated_at: new Date().toISOString()
          });

          // Remover do localStorage se aplicável
          const pendingInStorage = JSON.parse(localStorage.getItem('pending_users') || '[]');
          const updatedPending = pendingInStorage.filter((u: any) => u.id !== detail.id);
          localStorage.setItem('pending_users', JSON.stringify(updatedPending));
          
          successCount++;
          console.log(`✅ Usuário ${detail.email} sincronizado com ID: ${detail.supabaseId}`);
        } else {
          await db.profiles.update(detail.id, {
            sync_status: 'error',
            sync_error: detail.error,
            updated_at: new Date().toISOString()
          });
          
          errorCount++;
          console.error(`❌ Falha no usuário ${detail.email}:`, detail.error);
        }
      }
      
      console.log(`🎯 Finalizado: ${successCount} sucesso(s), ${errorCount} erro(s)`);
    }

    return result;

  } catch (error: any) {
    console.error('💥 Erro na sincronização:', error);
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: 'Tempo limite excedido. Verifique sua conexão.',
        timeout: true
      };
    }
    
    if (error.message.includes('autenticado') || error.message.includes('token') || error.message.includes('Sessão')) {
      return {
        success: false,
        message: 'Sessão expirada. Faça login novamente.',
        requiresLogin: true
      };
    }
    
    if (error.message.includes('administradores')) {
      return {
        success: false,
        message: 'Apenas administradores podem sincronizar usuários.',
        requiresAdmin: true
      };
    }
    
    return {
      success: false,
      message: error.message || 'Erro desconhecido na sincronização'
    };
  }
},

  // ✅ Buscar usuários locais (incluindo pendentes)
  async getLocalUsers() {
    try {
      const users = await db.profiles.toArray();
      return users;
    } catch (error) {
      console.error('Erro ao buscar usuários locais:', error);
      return [];
    }
  },

  // ✅ Buscar usuários do Supabase (apenas quando online)
  async getSupabaseUsers(instituicaoId?: string) {
    try {
      if (!navigator.onLine) {
        return { success: false, data: [], message: 'Offline' };
      }

      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (instituicaoId) {
        query = query.eq('instituicao_id', instituicaoId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: `Encontrados ${data?.length || 0} usuários`
      };
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      return { success: false, data: [], error: error.message };
    }
  },

  // ✅ Atualizar usuário (admin only)
  async updateUser(userId: string, updates: Partial<any>) {
    try {
      const adminProfile = await this.getLocalProfile();
      if (adminProfile?.role !== 'admin') {
        throw new Error('Apenas administradores podem atualizar usuários');
      }

      // Atualizar localmente
      await db.profiles.update(userId, {
        ...updates,
        updated_at: new Date().toISOString(),
        sync_status: 'pending' // Marcar para sincronização
      });

      // Adicionar à fila de sync
      await syncManager.markAsSynced('profiles', userId);

      return { success: true, message: 'Usuário atualizado localmente' };
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  },

  // ✅ Deletar usuário (admin only)
  async deleteUser(userId: string) {
    try {
      const adminProfile = await this.getLocalProfile();
      if (adminProfile?.role !== 'admin') {
        throw new Error('Apenas administradores podem deletar usuários');
      }

      // Não permitir deletar a si mesmo
      if (userId === adminProfile.id) {
        throw new Error('Você não pode deletar sua própria conta');
      }

      // Marcar como deletado localmente
      await db.profiles.update(userId, {
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        sync_status: 'pending'
      });

      // Adicionar à fila de sync
      await syncManager.markAsSynced('profiles', userId);

      return { success: true, message: 'Usuário marcado para exclusão' };
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      throw error;
    }
  },

  // ✅ Verificar se usuário é admin
  isAdmin(profile: any): boolean {
    return profile?.role === 'admin';
  },

  // ✅ Obter todos os usuários (locais + remotos quando online)
  async getAllUsers() {
    try {
      const localUsers = await this.getLocalUsers();
      
      // Se online, buscar do Supabase também
      if (navigator.onLine) {
        const remoteUsers = await this.getSupabaseUsers();
        if (remoteUsers.success) {
          // Combinar, dando prioridade aos locais (mais recentes)
          const remoteMap = new Map();
          remoteUsers.data.forEach((user: any) => remoteMap.set(user.email, user));
          
          localUsers.forEach(localUser => {
            if (remoteMap.has(localUser.email)) {
              // Atualizar local com dados do remoto
              Object.assign(localUser, remoteMap.get(localUser.email));
            }
          });
        }
      }

      return localUsers.filter(user => user.status !== 'deleted');
    } catch (error) {
      console.error('Erro ao buscar todos usuários:', error);
      return [];
    }
  }
};