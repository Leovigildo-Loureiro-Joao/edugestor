// src/contexts/AuthContext.tsx - VERSÃO CORRIGIDA
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/database/db';
import type { User, Session } from '@supabase/supabase-js';

// Tipos para o contexto
interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'teacher' | 'user';
  instituicao_id?: string;
  full_name?: string;
  created_at: string;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null); // 🔥 NOVO ESTADO
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState<Session | null>(null);

  // 🔥 FUNÇÃO PARA OBTER PERFIL DO USUÁRIO
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      return data as UserProfile;
    } catch (error) {
      console.error('❌ Erro ao buscar perfil:', error);
      return null;
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
  const hasPermission = (requiredRole: UserProfile['role']): boolean => {
    const roleHierarchy = {
      'user': 0,
      'teacher': 1,
      'manager': 2,
      'admin': 3
    };
    
    if (!profile) return false;
    return roleHierarchy[profile.role] >= roleHierarchy[requiredRole];
  };

  // Atualizar useEffect para buscar perfil
  useEffect(() => {
    const initializeAuth = async () => {
      try {
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
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // 🔥 ATUALIZAR PERFIL QUANDO MUDAR AUTENTICAÇÃO
        if (newSession?.user) {
          const userProfile = await fetchUserProfile(newSession.user.id);
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // 🔥 CRIAR PERFIL DO USUÁRIO
  const createUserProfile = async (user: User) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            email: user.email,
            role: 'user', // 🔥 ROLE PADRÃO
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;
      
      console.log('✅ Perfil criado com role:', 'user');
    } catch (error) {
      console.error('Erro ao criar perfil:', error);
    }
  };

    // Login com email e senha
  const login = async (email: string, password: string) => {
    try {
      setError('');
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
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

  // Registro de novo usuário
  const register = async (email: string, password: string, displayName: string) => {
    try {
      setError('');
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName }
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

  // ✅ Login com Google CORRIGIDO
  const loginWithGoogle = async () => {
    try {
      setError('');
      console.log('🔄 Iniciando login com Google...');
      
      // 🔧 Limpar estado anterior para evitar conflitos
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account'
          }
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
    // 🔥 REMOVI O finally - não altere loading aqui!
  };

  // Logout
  const logout = async () => {
    try {
      setError('');
      console.log('🚪 Fazendo logout...');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log('✅ Logout bem-sucedido');
    } catch (error: any) {
      console.error('❌ Erro no logout:', error);
      const errorMessage = getSupabaseErrorMessage(error);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };


  // 🔥 ATUALIZAR ROLE DO USUÁRIO (SÓ ADMIN)
  const updateUserRole = async (userId: string, newRole: UserProfile['role']) => {
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
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      throw error;
    }
  };

  // 🔥 ADICIONE AO VALUE DO CONTEXT
  const value: AuthContextType = {
    user,
    profile, // 🔥 NOVO
    session,
    login,
    register,
    logout,
    loginWithGoogle,
    loading,
    error,
    clearError,
    isAuthenticated: !!user,
    isAdmin, // 🔥 NOVO
    isManagerOrAdmin, // 🔥 NOVO
    hasPermission, // 🔥 NOVO
    updateUserRole // 🔥 NOVO
  };

  

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Atualize a interface
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null; // 🔥 NOVO
  session: Session | null;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => any;
  register: (email: string, password: string, displayName: string) => any;
  logout: () => any;
  loginWithGoogle: () => any;
  clearError: () => void;
  isAuthenticated: boolean;
  isAdmin: () => boolean; // 🔥 NOVO
  isManagerOrAdmin: () => boolean; // 🔥 NOVO
  hasPermission: (requiredRole: string) => boolean; // 🔥 NOVO
  updateUserRole?: (userId: string, newRole: string) => any; // 🔥 NOVO
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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


