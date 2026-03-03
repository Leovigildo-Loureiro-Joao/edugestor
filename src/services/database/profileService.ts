// services/database/profileService
import db, { supabase } from './db';
import { syncManager } from './syncManager';
import { SyncStatus } from '../../types/base';
import { auditLogService } from '../audit/auditLogService';
import { UserProfile } from '../../types/profile';

export const profileService = {
  getSessionUserId(): string | null {
    try {
      const rawSession = localStorage.getItem('supabase.auth.session');
      if (!rawSession) return null;
      const parsed = JSON.parse(rawSession);
      return parsed?.user?.id || null;
    } catch {
      return null;
    }
  },

  // ✅ Salvar perfil localmente
  async saveProfile(profile: any, options?: { syncStatus?: SyncStatus }) {
    try {
      const now = new Date().toISOString();
      const syncStatus: SyncStatus = options?.syncStatus || profile.sync_status || 'synced';
      // Se você tem tabela profiles no Dexie
      await db.table('profiles')?.put({
        id: profile.id,
        email: profile.email,
        role: profile.role || 'user',
        full_name: profile.full_name || profile.nome || '',
        instituicao_id: profile.instituicao_id || '',
        nome: profile.nome || '',
        updated_at: now,
        created_at: profile.created_at || now,
        deleted: false,
        sync_status: syncStatus
      });
      
      // Também salvar no localStorage para acesso rápido
      localStorage.setItem('user_profile', JSON.stringify({
        ...profile,
        sync_status: syncStatus,
        updated_at: now
      }));
      localStorage.setItem('has_admin_setup', 'true');
      if (profile?.role) localStorage.setItem('user_role', profile.role);
      if (profile?.id) localStorage.setItem('user_id', profile.id);
      if (profile?.instituicao_id) localStorage.setItem('active_instituicao_id', profile.instituicao_id);
      
      } catch (error) {
      console.error('Erro ao salvar perfil:', error);
    }
  },
  
  // ✅ Buscar perfil local
  async getLocalProfile():Promise<UserProfile|null> {
    try {
      const currentUserId = localStorage.getItem('user_id') || this.getSessionUserId();

      // 1. Tentar localStorage primeiro
      const localProfile = localStorage.getItem('user_profile');
      if (localProfile) {
        const profile = JSON.parse(localProfile);
        const isCurrentUser = !currentUserId || profile?.id === currentUserId;
        if (isCurrentUser) {
          if (profile?.instituicao_id) localStorage.setItem("active_instituicao_id", profile.instituicao_id);
          if (profile?.id) localStorage.setItem("user_id", profile.id);
          if (profile?.role) localStorage.setItem("user_role", profile.role);
          return profile;
        }
      }
      
      // 2. Tentar Dexie pelo usuário atual
      if (currentUserId) {
        const ownProfile = await db.table('profiles')?.get(currentUserId);
        if (ownProfile) {
          if (ownProfile?.instituicao_id) localStorage.setItem("active_instituicao_id", ownProfile.instituicao_id);
          if (ownProfile?.id) localStorage.setItem("user_id", ownProfile.id);
          if (ownProfile?.role) localStorage.setItem("user_role", ownProfile.role);
          return ownProfile;
        }
      }

      // Sem user_id resolvido, evita assumir perfil de outro usuário em dispositivo compartilhado.
      return null;
    } catch (error) {
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
    } catch (error) {
      console.error('Erro ao verificar admin local:', error);
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
      await auditLogService.log('PERMISSION_DENIED_OPERATION', {
        area: 'profileService',
        operation: 'add_user_by_admin',
        target_email: userData.email
      });
      throw new Error('Apenas administradores podem adicionar usuários');
    }

    // 2. Criar usuário OFFLINE primeiro
    const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const offlineUser = {
      id: tempUserId,
      email: userData.email,
      full_name: userData.nome,
      role: userData.role,
      instituicao_id: userData.instituicao_id,
      status: 'pending', // Pendente de ativação
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending' as SyncStatus, // ✅ Começa como pending
    };

    // 3. Salvar localmente
    await db.profiles.add(offlineUser);
    
    // 4. Salvar no localStorage para acesso rápido
    const pendingUsers = JSON.parse(localStorage.getItem('pending_users') || '[]');
    pendingUsers.push(offlineUser);
    localStorage.setItem('pending_users', JSON.stringify(pendingUsers));
    
    // 5. NÃO marcar como synced ainda! Remover esta linha:
    // await syncManager.markAsSynced('profiles', offlineUser.id);

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

    
    // Testar direto com a API do Supabase
    const supabaseUrl =
      import.meta.env.VITE_SUPABASE_URL ||
      (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey =
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': anonKey
      }
    });

    if (response.ok) {
      const userData = await response.json();
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


async syncPendingUsers() {
  try {
    // Buscar apenas usuários com sync_status = 'pending'
    const pendingUsers = await db.profiles
      .where('sync_status')
      .equals('pending')
      .toArray();


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

    // Preparar dados - filtrar apenas campos necessários
    const usersToSync = pendingUsers.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      instituicao_id: user.instituicao_id
    }));

    const EDGE_FUNCTION_URL = 'https://fbgpygnqzcifbfzxqlzh.supabase.co/functions/v1/sync';
    
    // Configurar fetch com timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ pendingUsers: usersToSync }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));

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
    // Processar resultados
    if (result.details && Array.isArray(result.details)) {
      let successCount = 0;
      let errorCount = 0;
      
      for (const detail of result.details) {
        if (detail.status === 'success' || detail.status === 'updated' || detail.status === 'created_profile') {
          // ✅ SÓ AGORA marcar como synced
          await db.profiles.update(detail.id, {
            sync_status: 'synced',
            supabase_id: detail.supabaseId,
            updated_at: new Date().toISOString()
          });

          // Remover do localStorage
          const pendingInStorage = JSON.parse(localStorage.getItem('pending_users') || '[]');
          const updatedPending = pendingInStorage.filter((u: any) => u.id !== detail.id);
          localStorage.setItem('pending_users', JSON.stringify(updatedPending));
          
          successCount++;
          } else {
          // Marcar como erro
          await db.profiles.update(detail.id, {
            sync_status: 'failed',
            sync_error: detail.error,
            updated_at: new Date().toISOString()
          });
          
          errorCount++;
          console.error(`❌ Falha no usuário ${detail.email}:`, detail.error);
        }
      }
      
      
      return {
        ...result,
        localStats: { successCount, errorCount }
      };
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
    
    return {
      success: false,
      message: error.message || 'Erro desconhecido na sincronização'
    };
  }
},

// Dentro da Edge Function, substitua o loop for...of


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
    } catch (error:any) {
      console.error('Erro ao buscar usuários:', error);
      return { success: false, data: [], error: error.message };
    }
  },

  // ✅ Atualizar usuário (admin only)
  async updateUser(userId: string, updates: Partial<any>) {
    try {
      const adminProfile = await this.getLocalProfile();
      if (adminProfile?.role !== 'admin') {
        await auditLogService.log('PERMISSION_DENIED_OPERATION', {
          area: 'profileService',
          operation: 'update_user',
          target_user_id: userId
        });
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
        await auditLogService.log('PERMISSION_DENIED_OPERATION', {
          area: 'profileService',
          operation: 'delete_user',
          target_user_id: userId
        });
        throw new Error('Apenas administradores podem deletar usuários');
      }

      // Não permitir deletar a si mesmo
      if (userId === adminProfile.id) {
        throw new Error('Você não pode deletar sua própria conta');
      }

      // Marcar como deletado localmente
      await db.profiles.update(userId, {
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

      return localUsers.filter(user => !user.deleted);
    } catch (error) {
      console.error('Erro ao buscar todos usuários:', error);
      return [];
    }
  }
};
