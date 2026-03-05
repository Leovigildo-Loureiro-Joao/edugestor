import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const useSmartBack = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback((fallbackRoute: string = '/dashboard') => {
    const lastRoute =
      sessionStorage.getItem('last_rota') ||
      localStorage.getItem('last_rota');
    const currentRoute = `${location.pathname}${location.search}${location.hash}`;

    if (
      lastRoute &&
      lastRoute.startsWith('/') &&
      lastRoute !== currentRoute
    ) {
      navigate(lastRoute);
      return;
    }

    navigate(fallbackRoute);
  }, [navigate, location.pathname, location.search, location.hash]);
};
