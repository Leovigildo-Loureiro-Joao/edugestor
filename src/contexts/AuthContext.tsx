// src/contexts/AuthContext - VERSÃO CORRIGIDA
import React, { createContext, useContext, useEffect, useState } from 'react';
import db, { supabase } from '../services/database/db';
import type { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '../types/profile';
import { profileService } from '../services/database/profileService';
import { updateJWTClaims } from '../utils/update_claims_jwt';
import { auditLogService } from '../services/audit/auditLogService';

// 🔥 INTERFACE E CONTEXTO DEVEM VIR ANTES DO PROVIDER
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, displayName: string, institutionName: string) => Promise<any>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<any>;
  clearError: () => void;
  isAuthenticated: boolean;
  isAdmin: () => boolean;
  isManagerOrAdmin: () => boolean;
  hasPermission: (requiredRole: string) => boolean;
  updateUserRole: (userId: string, newRole: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  switchInstituicao: (instituicaoId: string) => Promise<{ success: boolean }>;
  debugJWTClaims: () => Promise<void>;
  completePendingRegistration: (user: User, displayName: string, institutionName: string) => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState<Session | null>(null);

  // 🔥 FUNÇÃO PARA OBTER PERFIL DO USUÁRIO
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      if (!navigator.onLine) {
        return await profileService.getLocalProfile();
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Perfil não encontrado online, buscando local...');
        return await profileService.getLocalProfile();
      }

      if (data) {
        await profileService.saveProfile(data);
      }
      
      return data as UserProfile;
    } catch (error) {
      console.error('❌ Erro ao buscar perfil:', error);
      return await profileService.getLocalProfile();
    }
  };

  const clearError = () => setError('');

  const VALID_ROLES = ['admin', 'manager', 'teacher', 'user'];

  const isValidRole = (role?: string): boolean => {
    return !!role && VALID_ROLES.includes(role);
  };

  const forceLogout = async (reason: string) => {
    console.warn(`⚠️ Logout forçado: ${reason}`);
    await auditLogService.log('AUTH_FORCE_LOGOUT', { reason });
    await supabase.auth.signOut();
    clearLocalAuthState();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const clearLocalAuthState = () => {
    localStorage.removeItem('supabase.auth.session');
    localStorage.removeItem('active_instituicao_id');
    localStorage.removeItem('user_profile');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_id');
    localStorage.removeItem('jwt_token');
  };

  const persistAuthBootstrap = (profileData?: Partial<UserProfile> | null) => {
    if (!profileData) return;
    if (profileData.id) localStorage.setItem('user_id', profileData.id);
    if (profileData.role) localStorage.setItem('user_role', profileData.role);
    if (profileData.instituicao_id) {
      localStorage.setItem('active_instituicao_id', profileData.instituicao_id);
    }
  };

  // 🔥 VERIFICAR SE É ADMIN
  const isAdmin = (): boolean => {
    return profile?.role === 'admin';
  };

  // 🔥 VERIFICAR SE É MANAGER OU ADMIN
  const isManagerOrAdmin = (): boolean => {
    return profile?.role === 'admin' || profile?.role === 'manager';
  };

  // 🔥 VERIFICAR PERMISSÃO ESPECÍFICA
  const hasPermission = (requiredRole: string): boolean => {
    const roleHierarchy: Record<string, number> = {
      'user': 0,
      'teacher': 1,
      'manager': 2,
      'admin': 3
    };
    
    if (!profile?.role) return false;
    return roleHierarchy[profile.role] >= (roleHierarchy[requiredRole] || 0);
  };

  // 🔥 CRIAR PERFIL DO USUÁRIO
  const createUserProfile = async (user: User) => {
    try {
      const newProfile: Partial<UserProfile> = {
        id: user.id,
        email: user.email || '',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        full_name: user.user_metadata?.full_name || 
                  user.user_metadata?.name || 
                  user.email?.split('@')[0] || 
                  'Usuário'
      };

      const { error } = await supabase
        .from('profiles')
        .insert([newProfile]);

      if (error) throw error;
      
      // Salvar localmente
      await profileService.saveProfile(newProfile as UserProfile);
      setProfile(newProfile as UserProfile);
      
    } catch (error) {
      console.error('Erro ao criar perfil:', error);
    }
  };

  // ⭐ FUNÇÃO ATUALIZADA: Atualizar metadados do usuário
  const updateUserMetadata = async (user: User | null) => {
    if (!user) return;
    
    try {
      // Buscar perfil atualizado
      const userProfile = await fetchUserProfile(user.id);
      
      if (!userProfile) {
        console.warn('⚠️ Perfil do usuário não encontrado');
        return;
      }
      
      // Verificar se já tem os claims corretos
      const currentClaims = user.user_metadata || {};
      const expectedClaims = {
        user_role: userProfile.role,
        instituicao_id: userProfile.instituicao_id,
        active_instituicao_id: userProfile.instituicao_id
      };
      
      // Verificar se precisa atualizar
      const needsUpdate = 
        currentClaims.user_role !== expectedClaims.user_role ||
        currentClaims.instituicao_id !== expectedClaims.instituicao_id;
      
      if (needsUpdate) {
        // Chamar Edge Function para atualizar JWT
        const success = await updateJWTClaims({
          instituicao_id: userProfile.instituicao_id,
          user_role: userProfile.role
        });
        
        if (success) {
          // Atualizar localStorage
          if (userProfile.instituicao_id) {
            localStorage.setItem('active_instituicao_id', userProfile.instituicao_id);
          }
          localStorage.setItem('user_role', userProfile.role);
          
          // Atualizar metadados locais no Supabase Auth
          await supabase.auth.updateUser({
            data: expectedClaims
          });
        } else {
          console.warn('⚠️ Não foi possível atualizar JWT via Edge Function');
        }
      } else {
        }
      
    } catch (error) {
      console.error('❌ Erro ao atualizar metadados:', error);
    }
  };

  const setupUserAfterLogin = async (user: User) => {
    try {
      // 1. Verificar se usuário tem instituição associada
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('instituicao_id, role')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      if (userProfile?.instituicao_id) {
        localStorage.setItem('active_instituicao_id', userProfile.instituicao_id);
        
        // Atualizar metadados com instituição ativa
        await supabase.auth.updateUser({
          data: { 
            active_instituicao_id: userProfile.instituicao_id
          }
        });
      }
    } catch (error) {
      console.error('❌ Erro ao setup usuário:', error);
    }
  };

  // Chamar após login bem-sucedido
const handleSuccessfulLogin = async (user: User) => {
  try {
    // 1. Buscar perfil atualizado
    let userProfile = await fetchUserProfile(user.id);
    
    // Se não existe perfil, verificar se há registo pendente (utilizador que verificou email)
    if (!userProfile) {
      const pendingData = localStorage.getItem('pending_registration');
      if (pendingData) {
        try {
          const { displayName, institutionName } = JSON.parse(pendingData);
          userProfile = await completePendingRegistration(user, displayName, institutionName);
        } catch (err) {
          console.error('❌ Erro ao completar registo pendente:', err);
          await forceLogout('Perfil não pôde ser criado');
          return;
        }
      } else {
        console.warn('⚠️ Perfil não encontrado após login');
        await forceLogout('Perfil não encontrado');
        return;
      }
    }

    // Verificar se o role é válido
    if (!isValidRole(userProfile?.role)) {
      await forceLogout(`Role inválido: ${userProfile?.role || 'nenhum'}`);
      return;
    }

    persistAuthBootstrap(userProfile);
    
    // 2. Verificar/atualizar JWT com claims corretos
    await updateUserMetadata(user);
    
    // 3. Setup adicional
    await setupUserAfterLogin(user);
    
    } catch (error) {
    console.error('❌ Erro no pós-login:', error);
    localStorage.setItem('user_id', user.id);
  }
};

  // 🔥 NOVA FUNÇÃO: Mudar instituição ativa (para usuários com múltiplas instituições)
  const switchInstituicao = async (instituicaoId: string) => {
    try {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      // 1. Verificar se usuário tem acesso a esta instituição (via profiles)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('instituicao_id')
        .eq('id', user.id)
        .single();
      
      if (error || !profile) {
        throw new Error('Perfil do usuário não encontrado');
      }
      
      // 2. Atualizar perfil com instituição ativa
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          instituicao_id: instituicaoId,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      // 3. Atualizar JWT claims via Edge Function
      const success = await updateJWTClaims({
        instituicao_id: instituicaoId,
        active_instituicao_id: instituicaoId
      });
      
      if (!success) {
        console.warn('⚠️ JWT não atualizado via Edge Function, usando fallback');
      }
      
      // 4. Atualizar localStorage
      localStorage.setItem('active_instituicao_id', instituicaoId);
      
      // 5. Atualizar estado local
      const updatedProfile = await fetchUserProfile(user.id);
      setProfile(updatedProfile);
      
      // 6. Refresh session para garantir sincronização
      await supabase.auth.refreshSession();
      
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ Erro ao mudar instituição:', error);
      setError(error.message || 'Erro ao mudar instituição');
      throw error;
    }
  };

    // 🔥 FUNÇÃO DE DEBUG: Verificar claims do JWT atual
  const debugJWTClaims = async (): Promise<void> => {
    try {
      const session = await supabase.auth.getSession();
      
      if (!session.data.session?.access_token) {
        return;
      }
      
      const token = session.data.session.access_token;
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Removido log de debug para evitar impacto/perf
      
      return payload;
      
    } catch (error) {
      console.error('❌ Erro ao decodificar JWT:', error);
    }
  };

  // Atualizar useEffect para buscar perfil
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Primeiro tentar do localStorage
        const storedSession = localStorage.getItem('supabase.auth.session');
        if (storedSession && !navigator.onLine) {
          const session = JSON.parse(storedSession);
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            localStorage.setItem('user_id', session.user.id);
            const localProfile = await profileService.getLocalProfile();
            
            if (!isValidRole(localProfile?.role)) {
              await forceLogout(`Role inválido offline: ${localProfile?.role || 'nenhum'}`);
              return;
            }
            
            setProfile(localProfile);
          }
          setLoading(false);
          return;
        }

        // Se online, buscar do Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // 🔥 BUSCAR PERFIL DO USUÁRIO
        if (session?.user) {
          localStorage.setItem('user_id', session.user.id);
          // Prioriza perfil local para liberar a UI rapidamente.
          const localProfile = await profileService.getLocalProfile().catch(() => null);
          if (localProfile) {
            setProfile(localProfile);
            persistAuthBootstrap(localProfile);
          }
          setLoading(false);

          // Atualiza perfil remoto em background sem bloquear render inicial.
          void (async () => {
            const userProfile = await fetchUserProfile(session.user!.id);
            
            if (!userProfile) {
              await forceLogout('Perfil não encontrado na inicialização');
              return;
            }
            
            if (!isValidRole(userProfile.role)) {
              await forceLogout(`Role inválido na inicialização: ${userProfile.role}`);
              return;
            }
            
            setProfile(userProfile);
            persistAuthBootstrap(userProfile);
          })();
          return;
        }
      } catch (error) {
        console.error('Erro na inicialização:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, newSession: any) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      if (!newSession?.user) {
        setProfile(null);
        clearLocalAuthState();
        return;
      }

      localStorage.setItem('user_id', newSession.user.id);

      // Salvar sessão no localStorage (fallback offline) sem quebrar em quota.
      try {
        localStorage.setItem('supabase.auth.session', JSON.stringify(newSession));
      } catch {
        console.warn('⚠️ Não foi possível salvar sessão local (quota/storage indisponível)');
      }

      // Perfil atualizado em background para não segurar a navegação.
      void (async () => {
        const userProfile = await fetchUserProfile(newSession.user.id);
        
        if (!userProfile) {
          await forceLogout('Perfil não encontrado no onAuthStateChange');
          return;
        }
        
        if (!isValidRole(userProfile.role)) {
          await forceLogout(`Role inválido no onAuthStateChange: ${userProfile.role}`);
          return;
        }
        
        setProfile(userProfile);
        persistAuthBootstrap(userProfile);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Login com email e senha
  const login = async (email: string, password: string) => {
    try {
      setError('');
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Tarefas pós-login em background para não travar entrada no sistema.
      void handleSuccessfulLogin(data.user!);
      void auditLogService.log('AUTH_LOGIN', {
        action_label: 'Fez Login',
        source: 'auth',
        table_name: 'profiles',
        record_id: data.user?.id || null,
        new_values: {
          email: data.user?.email || email,
          provider: 'password'
        }
      });

      return data;
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      await auditLogService.log('AUTH_LOGIN_FAILED', {
        email,
        reason: error?.message || 'unknown'
      });
      const errorMessage = getSupabaseErrorMessage(error);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setError('');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline'
          },
          scopes: 'email profile',
        }
      });

      if (error) throw error;
      
      return data;
    } catch (error: any) {
      console.error('❌ Erro no login com Google:', error);
      const errorMessage = getSupabaseErrorMessage(error);
      setError(errorMessage);
      throw error;
    }
  };

  // Registro de novo usuário – cria apenas o utilizador no Supabase Auth.
  // A instituição e o perfil são criados após o utilizador verificar o email e fazer login.
  const register = async (email: string, password: string, displayName: string, institutionName: string) => {
    try {
      setError('');
      setLoading(true);
      
      // 1. Registrar o usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            display_name: displayName,
            institution_name: institutionName,
            user_role: 'admin'
          }
        }
      });

      if (authError) throw authError;
      
      if (!authData.user) {
        throw new Error('Erro ao criar usuário');
      }

      // Guardar dados de registo pendente para completar após verificação de email
      localStorage.setItem('pending_registration', JSON.stringify({
        email,
        displayName,
        institutionName
      }));

      return authData;
    } catch (error: any) {
      console.error('❌ Erro no registro:', error);
      const errorMessage = getSupabaseErrorMessage(error);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Completar registo pendente: criar instituição e perfil após verificação de email
  const completePendingRegistration = async (user: User, displayName: string, institutionName: string) => {
    // 1. Criar a instituição no Supabase
    const { data: instituicaoData, error: instituicaoError } = await supabase
      .from('instituicao')
      .insert([{
        nome_escola: institutionName,
        email: user.email,
        ano_lectivo: `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'synced'
      }])
      .select()
      .single();

    if (instituicaoError) {
      console.error('Erro ao criar instituição:', instituicaoError);
    }

    const instituicaoId = instituicaoData?.id || null;

    // 2. Salvar instituição localmente no Dexie
    if (instituicaoId && instituicaoData) {
      await db.instituicao.put({
        id: instituicaoId,
        nome_escola: institutionName,
        email: user.email,
        ano_lectivo: `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'synced'
      });
      localStorage.setItem('active_instituicao_id', instituicaoId);
    }

    // 3. Criar o perfil do usuário
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        role: 'admin',
        full_name: displayName,
        instituicao_id: instituicaoId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
    }

    // 4. Atualizar metadados do usuário
    if (instituicaoId) {
      await supabase.auth.updateUser({
        data: {
          instituicao_id: instituicaoId,
          active_instituicao_id: instituicaoId,
          user_role: 'admin'
        }
      });
    }

    // 5. Atualizar JWT claims via Edge Function
    if (instituicaoId) {
      await updateJWTClaims({
        instituicao_id: instituicaoId,
        user_role: 'admin'
      });
    }

    // 6. Salvar perfil localmente
    const localProfile = {
      id: user.id,
      email: user.email || '',
      role: 'admin' as const,
      full_name: displayName,
      instituicao_id: instituicaoId || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'synced' as const
    };

    await profileService.saveProfile(localProfile);
    setProfile(localProfile);

    // 7. Limpar dados de registo pendente
    localStorage.removeItem('pending_registration');

    return localProfile;
  };

  // Logout
  const logout = async () => {
    try {
      setError('');
      const previousUser = user;
      const previousProfilePromise = profileService.getLocalProfile().catch(() => null);

      // Limpeza local sempre
      clearLocalAuthState();
      setUser(null);
      setProfile(null);
      setSession(null);

      // Executa tarefas remotas em background para não atrasar a UI.
      void (async () => {
        try {
          const previousProfile = await previousProfilePromise;
          await auditLogService.log('AUTH_LOGOUT', {
            action_label: 'Fez Logout',
            source: 'auth',
            table_name: 'profiles',
            record_id: previousUser?.id || null,
            new_values: {
              email: previousUser?.email || previousProfile?.email || null
            },
            instituicao_id: previousProfile?.instituicao_id
          });
        } catch (logError) {
          console.warn('⚠️ Falha ao registrar logout na auditoria:', logError);
        }
      })();

      // Tenta encerrar sessão remota, mas sem bloquear o logout local.
      void (async () => {
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) {
          console.warn('⚠️ Falha ao encerrar sessão no Supabase, sessão local já foi limpa:', error);
        }
      })();

      } catch (error: any) {
      console.error('❌ Erro no logout:', error);
      // Mesmo com erro inesperado, garantimos limpeza local para não prender sessão.
      clearLocalAuthState();
      setUser(null);
      setProfile(null);
      setSession(null);
    }
  };

  // 🔥 ATUALIZAR ROLE DO USUÁRIO (SÓ ADMIN)
  const updateUserRole = async (userId: string, newRole: string) => {
    if (!isAdmin()) {
      await auditLogService.log('PERMISSION_DENIED_OPERATION', {
        area: 'AuthContext',
        operation: 'update_user_role',
        target_user_id: userId,
        requested_role: newRole
      });
      throw new Error('Apenas administradores podem alterar roles');
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      
      // Se for o próprio usuário, atualizar estado local
      if (user?.id === userId) {
        const updatedProfile = await fetchUserProfile(userId);
        setProfile(updatedProfile);
      }
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const now = new Date().toISOString();
    const payload = {
      ...updates,
      updated_at: now
    };
    const instituicaoId =
      updates.instituicao_id ||
      profile?.instituicao_id ||
      localStorage.getItem('active_instituicao_id') ||
      '';

    try {
      if (navigator.onLine) {
        const { error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', user.id);

        if (error) throw error;

        if (updates.full_name) {
          // Atualização de metadata não deve bloquear o fluxo principal do perfil.
          supabase.auth
            .updateUser({
              data: { full_name: updates.full_name }
            })
            .catch((err) => {
              console.error('Erro ao atualizar metadata do usuário:', err);
            });
        }

        if (instituicaoId) {
          await db.syncQueue
            .where('table')
            .equals('profiles')
            .and((item) => item.record_id === user.id && item.instituicao_id === instituicaoId)
            .delete();
        }
      }

      const mergedProfile = {
        ...(profile || { id: user.id, email: user.email || '', role: 'admin' }),
        ...updates,
        instituicao_id: instituicaoId || profile?.instituicao_id,
        updated_at: now
      } as UserProfile;

      if (!navigator.onLine) {
        const pendingProfile = {
          ...mergedProfile,
          sync_status: 'pending'
        } as UserProfile;

        if (instituicaoId) {
          await db.syncQueue.add({
            instituicao_id: instituicaoId,
            table: 'profiles',
            record_id: user.id,
            operation: 'upsert',
            status: 'pending',
            created_at: now,
            data: JSON.stringify(pendingProfile)
          });
        }

        await profileService.saveProfile(pendingProfile, { syncStatus: 'pending' });
        setProfile(pendingProfile);
        return;
      }

      await profileService.saveProfile(mergedProfile, { syncStatus: 'synced' });
      setProfile(mergedProfile);
    } catch (error: any) {
      console.error('❌ Erro ao atualizar perfil:', error);
      throw new Error(error?.message || 'Erro ao atualizar perfil');
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user?.email) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // Reautenticar para validar senha atual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        throw new Error('Senha atual incorreta');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }
    } catch (error: any) {
      console.error('❌ Erro ao alterar senha:', error);
      throw new Error(error?.message || 'Erro ao alterar senha');
    }
  };

  // 🔥 ADICIONE AO VALUE DO CONTEXT
  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    error,
    login,
    register,
    logout,
    loginWithGoogle,
    clearError,
    isAuthenticated: !!user,
    isAdmin,
    isManagerOrAdmin,
    hasPermission,
    updateUserRole,
    updateProfile,
    changePassword,
    switchInstituicao, 
    debugJWTClaims,
    completePendingRegistration
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
};

const getSupabaseErrorMessage = (error: any): string => {
  const errorMessages: Record<string, string> = {
    'Invalid login credentials': 'Email ou senha incorretos',
    'Email not confirmed': 'Email não confirmado',
    'Invalid email': 'Email inválido',
    'User already registered': 'Este email já está em uso',
    'Weak password': 'Senha muito fraca (mínimo 6 caracteres)',
    'Network request failed': 'Erro de conexão. Verifique sua internet',
    'Too many requests': 'Muitas tentativas. Tente novamente mais tarde',
    'Signup disabled': 'Cadastro desativado',
  };

  return errorMessages[error.message] || error.message || 'Erro desconhecido na autenticação';
};
