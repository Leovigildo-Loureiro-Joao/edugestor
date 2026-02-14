// src/contexts/AuthContext.tsx - VERSÃO CORRIGIDA
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/database/db';
import type { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '../types/profile';
import { profileService } from '../services/database/profileService';
import { updateJWTClaims } from '../utils/update_claims_jwt';

// 🔥 INTERFACE E CONTEXTO DEVEM VIR ANTES DO PROVIDER
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, displayName: string) => Promise<any>;
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
        role: 'user',
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
      
      console.log('✅ Perfil criado com role:', 'user');
      
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
        console.log('🔄 Atualizando claims do JWT...', {
          current: currentClaims,
          expected: expectedClaims
        });
        
        // Chamar Edge Function para atualizar JWT
        const success = await updateJWTClaims({
          instituicao_id: userProfile.instituicao_id,
          user_role: userProfile.role
        });
        
        if (success) {
          console.log('✅ JWT atualizado com novos claims');
          
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
        console.log('ℹ️ Claims do JWT já estão atualizados');
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
    const userProfile = await fetchUserProfile(user.id);
    
    if (!userProfile) {
      console.warn('⚠️ Perfil não encontrado após login');
      return;
    }
    
    // 2. Verificar/atualizar JWT com claims corretos
    await updateUserMetadata(user);
    
    // 3. Setup adicional
    await setupUserAfterLogin(user);
    
    // 4. Salvar tokens no localStorage para sincronização offline
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      localStorage.setItem('supabase.auth.token', session.access_token);
      localStorage.setItem('supabase.auth.refresh_token', session.refresh_token);
    }
    
    console.log('✅ Login completo, JWT sincronizado');
    
  } catch (error) {
    console.error('❌ Erro no pós-login:', error);
  }
};

  // 🔥 NOVA FUNÇÃO: Mudar instituição ativa (para usuários com múltiplas instituições)
  const switchInstituicao = async (instituicaoId: string) => {
    try {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      // 1. Verificar se usuário tem acesso a esta instituição
      const { data: instituicoes, error } = await supabase
        .from('user_instituicoes')
        .select('instituicao_id')
        .eq('user_id', user.id)
        .eq('instituicao_id', instituicaoId)
        .single();
      
      if (error || !instituicoes) {
        throw new Error('Usuário não tem acesso a esta instituição');
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
      
      console.log(`✅ Instituição alterada para: ${instituicaoId}`);
      
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
        console.log('❌ Nenhum token JWT disponível');
        return;
      }
      
      const token = session.data.session.access_token;
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      console.log('🔍 DEBUG - JWT Claims:', {
        sub: payload.sub,
        email: payload.email,
        // Claims customizados
        user_role: payload.user_role,
        instituicao_id: payload.instituicao_id,
        active_instituicao_id: payload.active_instituicao_id,
        // App metadata (Edge Function)
        app_metadata: payload.app_metadata,
        // User metadata (Supabase Auth)
        user_metadata: payload.user_metadata,
        // Timestamps
        exp: new Date(payload.exp * 1000),
        iat: new Date(payload.iat * 1000)
      });
      
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
            const localProfile = await profileService.getLocalProfile();
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
          const userProfile = await fetchUserProfile(session.user.id);
          setProfile(userProfile);
          
          // Se não tem perfil, criar um com role padrão 'user'
          if (!userProfile) {
            await createUserProfile(session.user);
          }
        }
      } catch (error) {
        console.error('Erro na inicialização:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event:any, newSession:any) => {
        console.log(`🔄 Auth state changed: ${event}`);
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // 🔥 ATUALIZAR PERFIL QUANDO MUDAR AUTENTICAÇÃO
        if (newSession?.user) {
          const userProfile = await fetchUserProfile(newSession.user.id);
          setProfile(userProfile);
          
          // Salvar sessão no localStorage
          localStorage.setItem('supabase.auth.session', JSON.stringify(newSession));
        } else {
          setProfile(null);
          localStorage.removeItem('supabase.auth.session');
          localStorage.removeItem('active_instituicao_id');
        }
        
        setLoading(false);
      }
    );

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
      
      // ⭐ NOVO: Após login, verificar/atualizar metadados do usuário
      await handleSuccessfulLogin(data.user!);
      console.log('✅ Login bem-sucedido');
      return data;
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
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
      console.log('🔄 Iniciando login com Google...');
      
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
      
      console.log('✅ Redirecionando para Google OAuth');
      return data;
    } catch (error: any) {
      console.error('❌ Erro no login com Google:', error);
      const errorMessage = getSupabaseErrorMessage(error);
      setError(errorMessage);
      throw error;
    }
  };

  // Registro de novo usuário
  const register = async (email: string, password: string, displayName: string) => {
    try {
      setError('');
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            display_name: displayName,
            user_role: 'user'
          }
        }
      });

      if (error) throw error;
      
      console.log('✅ Registro bem-sucedido');
      return data;
    } catch (error: any) {
      console.error('❌ Erro no registro:', error);
      const errorMessage = getSupabaseErrorMessage(error);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setError('');
      console.log('🚪 Fazendo logout...');
      
      // Limpar dados locais
      localStorage.removeItem('supabase.auth.session');
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.refresh_token');
      localStorage.removeItem('active_instituicao_id');
      
      // Fazer logout no Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Limpar estados
      setUser(null);
      setProfile(null);
      setSession(null);
      
      console.log('✅ Logout bem-sucedido');
    } catch (error: any) {
      console.error('❌ Erro no logout:', error);
      const errorMessage = getSupabaseErrorMessage(error);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // 🔥 ATUALIZAR ROLE DO USUÁRIO (SÓ ADMIN)
  const updateUserRole = async (userId: string, newRole: string) => {
    if (!isAdmin()) {
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
      
      console.log(`✅ Role atualizada para ${newRole}`);
      
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

    try {
      if (navigator.onLine) {
        const { error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', user.id);

        if (error) throw error;

        if (updates.full_name) {
          await supabase.auth.updateUser({
            data: { full_name: updates.full_name }
          });
        }
      }

      const mergedProfile = {
        ...(profile || { id: user.id, email: user.email || '', role: 'user' }),
        ...updates,
        updated_at: now
      } as UserProfile;

      await profileService.saveProfile(mergedProfile);
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
    debugJWTClaims    
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
