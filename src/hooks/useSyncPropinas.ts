import { useEffect, useRef } from "react";
import { propinaService } from "../services/database";

export function useSyncTurmas() {
  const isSyncingRef = useRef(false);

  const sync = async () => {
    if (isSyncingRef.current || !navigator.onLine) return;
    
    isSyncingRef.current = true;
    try {
      console.log('🔄 Hook: Iniciando sincronização bidirecional...');
      await propinaService.syncAllPending();
    } catch (error) {
      console.error('❌ Hook: Erro na sincronização:', error);
    } finally {
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    // Sincronizar quando ficar online
    const handleOnline = () => {
      console.log('🌐 Conexão restaurada, sincronizando em 10s...');
      setTimeout(sync, 10000);
    };

    // Sincronizar a cada 5 minutos
    const interval = setInterval(sync, 300000);
    
    window.addEventListener('online', handleOnline);
    
    // Sincronização inicial
    setTimeout(sync, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, []);

  return { sync };
}