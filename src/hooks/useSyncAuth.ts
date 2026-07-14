
import { useState, useEffect } from 'react';
import { supabase } from '../services/database/db';

export const useSyncAuth = () => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);


  useEffect(() => {
    const updateAuthData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Token JWT para sincronização
        setAuthToken(session.access_token);
        
        // Role do usuário para RLS
        const role = session.user.user_metadata?.user_role;
        setUserRole(role);
        
        // Salvar no localStorage para uso offline
        localStorage.setItem('jwt_token', session.access_token);
        localStorage.setItem('user_role', role || 'admin');
      } else {
        setAuthToken(null);
        setUserRole(null);
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_role');
      }
    };

    // Atualizar inicialmente
    updateAuthData();

    // Ouvir mudanças
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        await updateAuthData();
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Função para obter headers autenticados
  const getAuthHeaders = () => {
    if (!authToken) return {};
    
    return {
      'Authorization': `Bearer ${authToken}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  };

  // Função para verificar permissões
  const hasPermission = (requiredRole: string): boolean => {
    if (!userRole) return false;
    
    const roleHierarchy = {
      'admin': 3,
      'teacher': 2,
      'secretary': 1,
      'user': 0
    };
    
    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
    
    return userLevel >= requiredLevel;
  };

  return {
    authToken,
    userRole,
    getAuthHeaders,
    hasPermission,
    isAuthenticated: !!authToken
  };
};