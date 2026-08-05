
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

  
  async saveProfile(profile: any, options?: { syncStatus?: SyncStatus }) {
    try {
      const now = new Date().toISOString();
      const syncStatus: SyncStatus = options?.syncStatus || profile.sync_status || 'synced';
      
      await db.table('profiles')?.put({
        id: profile.id,
        email: profile.email,
        role: profile.role || 'admin',
        full_name: profile.full_name || profile.nome || '',
        instituicao_id: profile.instituicao_id || '',
        nome: profile.nome || '',
        updated_at: now,
        created_at: profile.created_at || now,
        deleted: false,
        sync_status: syncStatus
      });
      
      
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
  
  
  async getLocalProfile():Promise<UserProfile|null> {
    try {
      const currentUserId = localStorage.getItem('user_id') || this.getSessionUserId();

      
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
      
      
      if (currentUserId) {
        const ownProfile = await db.table('profiles')?.get(currentUserId);
        if (ownProfile) {
          if (ownProfile?.instituicao_id) localStorage.setItem("active_instituicao_id", ownProfile.instituicao_id);
          if (ownProfile?.id) localStorage.setItem("user_id", ownProfile.id);
          if (ownProfile?.role) localStorage.setItem("user_role", ownProfile.role);
          return ownProfile;
        }
      }

      
      return null;
    } catch (error) {
      return null;
    }
  },
  
  
  async hasLocalAdmin() {
    try {
      
      if (localStorage.getItem('has_admin_setup') === 'true') {
        return true;
      }
      
      
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

   
  
async addUserByAdmin(userData: {
  email: string;
  nome: string;
  role: 'manager' | 'teacher' | 'user';
  instituicao_id: string;
}, adminId: string) {
  try {
    
    const adminProfile = await this.getLocalProfile();
    if (adminProfile?.role !== 'admin') {
      await auditLogService.log('PERMISSION_DENIED_OPERATION', {
        area: 'profileService',
        operation: 'add_user_by_admin',
        target_email: userData.email
      });
      throw new Error('Apenas administradores podem adicionar usuários');
    }

    
    const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const offlineUser = {
      id: tempUserId,
      email: userData.email,
      full_name: userData.nome,
      role: userData.role,
      instituicao_id: userData.instituicao_id,
      status: 'pending', 
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending' as SyncStatus, 
    };

    
    await db.profiles.add(offlineUser);
    
    
    const pendingUsers = JSON.parse(localStorage.getItem('pending_users') || '[]');
    pendingUsers.push(offlineUser);
    localStorage.setItem('pending_users', JSON.stringify(pendingUsers));
    
    
    

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

    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('❌ Erro ao obter sessão:', sessionError);
      return {
        success: false,
        message: 'Sessão expirada. Faça login novamente.',
        requiresLogin: true
      };
    }

    
    const usersToSync = pendingUsers.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      instituicao_id: user.instituicao_id
    }));

    const EDGE_FUNCTION_URL = 'https://fbgpygnqzcifbfzxqlzh.supabase.co/functions/v1/sync';
    
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
        
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    if (result.details && Array.isArray(result.details)) {
      let successCount = 0;
      let errorCount = 0;
      
      for (const detail of result.details) {
        if (detail.status === 'success' || detail.status === 'updated' || detail.status === 'created_profile') {
          
          await db.profiles.update(detail.id, {
            sync_status: 'synced',
            supabase_id: detail.supabaseId,
            updated_at: new Date().toISOString()
          });

          
          const pendingInStorage = JSON.parse(localStorage.getItem('pending_users') || '[]');
          const updatedPending = pendingInStorage.filter((u: any) => u.id !== detail.id);
          localStorage.setItem('pending_users', JSON.stringify(updatedPending));
          
          successCount++;
          } else {
          
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




  
  async getLocalUsers() {
    try {
      const users = await db.profiles.toArray();
      return users;
    } catch (error) {
      console.error('Erro ao buscar usuários locais:', error);
      return [];
    }
  },

  
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

      
      await db.profiles.update(userId, {
        ...updates,
        updated_at: new Date().toISOString(),
        sync_status: 'pending' 
      });

      
      await syncManager.markAsSynced('profiles', userId);

      return { success: true, message: 'Usuário atualizado localmente' };
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  },

  
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

      
      if (userId === adminProfile.id) {
        throw new Error('Você não pode deletar sua própria conta');
      }

      
      await db.profiles.update(userId, {
        deleted_at: new Date().toISOString(),
        sync_status: 'pending'
      });

      
      await syncManager.markAsSynced('profiles', userId);

      return { success: true, message: 'Usuário marcado para exclusão' };
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      throw error;
    }
  },

  
  isAdmin(profile: any): boolean {
    return profile?.role === 'admin';
  },

  
  async getAllUsers() {
    try {
      const localUsers = await this.getLocalUsers();
      
      
      if (navigator.onLine) {
        const remoteUsers = await this.getSupabaseUsers();
        if (remoteUsers.success) {
          
          const remoteMap = new Map();
          remoteUsers.data.forEach((user: any) => remoteMap.set(user.email, user));
          
          localUsers.forEach(localUser => {
            if (remoteMap.has(localUser.email)) {
              
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
