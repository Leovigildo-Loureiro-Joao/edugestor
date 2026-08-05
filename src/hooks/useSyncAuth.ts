
import { useState, useEffect } from 'react';
import { supabase } from '../services/database/db';
import { hasPermission as checkPermission } from '../constants/roles';

export const useSyncAuth = () => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);


  useEffect(() => {
    const updateAuthData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setAuthToken(session.access_token);
        
        const role = session.user.user_metadata?.user_role;
        setUserRole(role);
        
        localStorage.setItem('jwt_token', session.access_token);
        localStorage.setItem('user_role', role || 'admin');
      } else {
        setAuthToken(null);
        setUserRole(null);
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_role');
      }
    };

    updateAuthData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        await updateAuthData();
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const getAuthHeaders = () => {
    if (!authToken) return {};
    
    return {
      'Authorization': `Bearer ${authToken}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  };

  const hasPermission = (requiredRole: string): boolean => {
    return checkPermission(userRole || undefined, requiredRole);
  };

  return {
    authToken,
    userRole,
    getAuthHeaders,
    hasPermission,
    isAuthenticated: !!authToken
  };
};
