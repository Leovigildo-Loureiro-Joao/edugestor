import { hasPermission as checkPermission } from '../constants/roles';

export const useSyncAuthInManager = () => {
  const tryParseJSON = (value: string | null): any | null => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const extractTokenFromAnyShape = (raw: any): string | null => {
    if (!raw) return null;
    if (typeof raw === 'string' && raw.split('.').length === 3) return raw;
    if (Array.isArray(raw)) {
      for (const item of raw) {
        const token = extractTokenFromAnyShape(item);
        if (token) return token;
      }
      return null;
    }
    if (typeof raw === 'object') {
      if (typeof raw.access_token === 'string') return raw.access_token;
      if (raw.session) return extractTokenFromAnyShape(raw.session);
      if (raw.currentSession) return extractTokenFromAnyShape(raw.currentSession);
      if (raw.data) return extractTokenFromAnyShape(raw.data);
    }
    return null;
  };

  const getFallbackTokenFromStorage = (): string | null => {
    const sessionToken = extractTokenFromAnyShape(
      tryParseJSON(localStorage.getItem('supabase.auth.session'))
    );
    if (sessionToken) return sessionToken;

    const supabaseInternalKey = Object.keys(localStorage).find((key) =>
      key.startsWith('sb-') && key.endsWith('-auth-token')
    );
    if (supabaseInternalKey) {
      return extractTokenFromAnyShape(tryParseJSON(localStorage.getItem(supabaseInternalKey)));
    }

    return null;
  };

  
  const getAuthData = () => {
    

    const token = localStorage.getItem('jwt_token') || getFallbackTokenFromStorage();
    if (token && !localStorage.getItem('jwt_token')) {
      try {
        localStorage.setItem('jwt_token', token);
      } catch {
        
      }
    }
    const userRole = localStorage.getItem('user_role') || 'admin';
    const localProfile = localStorage.getItem('user_profile');
    let userId=localStorage.getItem("user_id") || null;
    if (localProfile) {
      const profile =JSON.parse(localProfile);
      userId= profile.id;
    }


    return {
      authToken: token,
      userRole,
      userId,
      isAuthenticated: !!token || !!localStorage.getItem('supabase.auth.session')
    };
  };

  const getAuthHeaders = () => {
    const token = getAuthData().authToken;
    if (!token) return {};

    return {
      'Authorization': `Bearer ${token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  };

  const hasPermission = (requiredRole: string): boolean => {
    const { userRole } = getAuthData();
    return checkPermission(userRole, requiredRole);
  };

  return {
    getAuthData,
    getAuthHeaders,
    hasPermission
  };
};