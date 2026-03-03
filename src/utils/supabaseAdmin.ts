// utils/supabaseAdmin (APENAS NO BACKEND/SERVER)
import { createClient } from '@supabase/supabase-js';

// Esta função só deve ser chamada no backend
export const createAdminClient = () => {
  // Verificar se está no client-side (browser)
  if (typeof window !== 'undefined') {
    throw new Error('Service Role Key não deve ser usada no frontend!');
  }
  
  const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL ||
    (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY;

  return createClient(
    supabaseUrl!,
    serviceRoleKey!, // Service Role Key
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

// Ou diretamente:
export const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL ||
    (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
