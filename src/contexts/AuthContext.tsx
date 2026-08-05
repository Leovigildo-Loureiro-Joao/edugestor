import React, { createContext, useContext, useEffect, useState } from 'react';
import db, { supabase } from '../services/database/db';
import type { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '../types/profile';
import { profileService } from '../services/database/profileService';
import { updateJWTClaims } from '../utils/update_claims_jwt';
import { auditLogService } from '../services/audit/auditLogService';

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

  const isAdmin = (): boolean => {
    return profile?.role === 'admin';
  };

  const isManagerOrAdmin = (): boolean => {
    return profile?.role === 'admin' || profile?.role === 'manager';
  };

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
      
      await profileService.saveProfile(newProfile as UserProfile);
      setProfile(newProfile as UserProfile);
      
    } catch (error) {
      console.error('Erro ao criar perfil:', error);
    }
  };

  const updateUserMetadata = async (user: User | null) => {
    if (!user) return;
    
    try {
      const userProfile = await fetchUserProfile(user.id);
      
      if (!userProfile) {
        console.warn('⚠️ Perfil do usuário não encontrado');
        return;
      }
      
      const currentClaims = user.user_metadata || {};
      const expectedClaims = {
        user_role: userProfile.role,
        instituicao_id: userProfile.instituicao_id,
        active_instituicao_id: userProfile.instituicao_id
      };
      
      const needsUpdate = 
        currentClaims.user_role !== expectedClaims.user_role ||
        currentClaims.instituicao_id !== expectedClaims.instituicao_id;
      
      if (needsUpdate) {
        const success = await updateJWTClaims({
          instituicao_id: userProfile.instituicao_id,
          user_role: userProfile.role
        });
        
        if (success) {
          if (userProfile.instituicao_id) {
            localStorage.setItem('active_instituicao_id', userProfile.instituicao_id);
          }
          localStorage.setItem('user_role', userProfile.role);
          
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
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('instituicao_id, role')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      if (userProfile?.instituicao_id) {
        localStorage.setItem('active_instituicao_id', userProfile.instituicao_id);
        
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

const handleSuccessfulLogin = async (user: User) => {
  try {
    let userProfile = await fetchUserProfile(user.id);
    
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

    if (!isValidRole(userProfile?.role)) {
      await forceLogout(`Role inválido: ${userProfile?.role || 'nenhum'}`);
      return;
    }

    persistAuthBootstrap(userProfile);
    
    await updateUserMetadata(user);
    
    await setupUserAfterLogin(user);

    if (userProfile?.role === 'admin' && navigator.onLine) {
      void profileService.syncPendingUsers().then(result => {
        if (result.success && result.localStats && result.localStats.successCount > 0) {
          console.log(`✅ Auto-sync: ${result.localStats.successCount} usuário(s) sincronizado(s)`);
        }
      }).catch(() => {});
    }
    
    } catch (error) {
    console.error('❌ Erro no pós-login:', error);
    localStorage.setItem('user_id', user.id);
  }
};

  const switchInstituicao = async (instituicaoId: string) => {
    try {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('instituicao_id')
        .eq('id', user.id)
        .single();
      
      if (error || !profile) {
        throw new Error('Perfil do usuário não encontrado');
      }
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          instituicao_id: instituicaoId,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      const success = await updateJWTClaims({
        instituicao_id: instituicaoId,
        active_instituicao_id: instituicaoId
      });
      
      if (!success) {
        console.warn('⚠️ JWT não atualizado via Edge Function, aplicando fallback local');
        await supabase.auth.updateUser({
          data: {
            instituicao_id: instituicaoId,
            active_instituicao_id: instituicaoId
          }
        });
      }
      
      localStorage.setItem('active_instituicao_id', instituicaoId);
      
      const updatedProfile = await fetchUserProfile(user.id);
      setProfile(updatedProfile);
      
      await supabase.auth.refreshSession();
      
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ Erro ao mudar instituição:', error);
      setError(error.message || 'Erro ao mudar instituição');
      throw error;
    }
  };

  const debugJWTClaims = async (): Promise<void> => {
    try {
      const session = await supabase.auth.getSession();
      
      if (!session.data.session?.access_token) {
        return;
      }
      
      const token = session.data.session.access_token;
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      return payload;
      
    } catch (error) {
      console.error('❌ Erro ao decodificar JWT:', error);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
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

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          localStorage.setItem('user_id', session.user.id);
          const localProfile = await profileService.getLocalProfile().catch(() => null);
          if (localProfile) {
            setProfile(localProfile);
            persistAuthBootstrap(localProfile);
          }
          setLoading(false);

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

      try {
        localStorage.setItem('supabase.auth.session', JSON.stringify(newSession));
      } catch {
        console.warn('⚠️ Não foi possível salvar sessão local (quota/storage indisponível)');
      }

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

  const login = async (email: string, password: string) => {
    try {
      setError('');
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
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

  const register = async (email: string, password: string, displayName: string, institutionName: string) => {
    try {
      setError('');
      setLoading(true);
      
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

  const completePendingRegistration = async (user: User, displayName: string, institutionName: string) => {
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

    if (instituicaoId) {
      await supabase.auth.updateUser({
        data: {
          instituicao_id: instituicaoId,
          active_instituicao_id: instituicaoId,
          user_role: 'admin'
        }
      });
    }

    if (instituicaoId) {
      const jwtSuccess = await updateJWTClaims({
        instituicao_id: instituicaoId,
        user_role: 'admin'
      });
      
      if (!jwtSuccess) {
        console.warn('⚠️ JWT claims não atualizados no registo pendente, usando fallback local');
        await supabase.auth.updateUser({
          data: {
            instituicao_id: instituicaoId,
            active_instituicao_id: instituicaoId,
            user_role: 'admin'
          }
        });
      }
    }

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

    localStorage.removeItem('pending_registration');

    return localProfile;
  };

  const logout = async () => {
    try {
      setError('');
      const previousUser = user;
      const previousProfilePromise = profileService.getLocalProfile().catch(() => null);

      clearLocalAuthState();
      setUser(null);
      setProfile(null);
      setSession(null);

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

      void (async () => {
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) {
          console.warn('⚠️ Falha ao encerrar sessão no Supabase, sessão local já foi limpa:', error);
        }
      })();

      } catch (error: any) {
      console.error('❌ Erro no logout:', error);
      clearLocalAuthState();
      setUser(null);
      setProfile(null);
      setSession(null);
    }
  };

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
