import { useEffect, useState } from 'react';
import {
  connectivityService,
  type ConnectivityState,
} from '../services/database/connectivityService';

/**
 * useConnectivity — estado central de online/offline.
 *
 * - `browserOnline`: navigator.onLine
 * - `supabaseReachable`: null (desconhecido) | true | false
 * - `effectiveOnline`: browserOnline && supabaseReachable !== false
 *
 * Quando o Supabase cai, `effectiveOnline` fica false sozinho
 * mesmo com internet — a UI deve usar este valor.
 */
export function useConnectivity(): ConnectivityState {
  const [state, setState] = useState<ConnectivityState>(() =>
    connectivityService.getState()
  );

  useEffect(() => {
    connectivityService.startMonitoring();
    return connectivityService.subscribe(setState);
  }, []);

  return state;
}
