// utils/supabaseAdmin.ts (APENAS NO BACKEND/SERVER)
import { createClient } from '@supabase/supabase-js';

// Esta função só deve ser chamada no backend
export const createAdminClient = () => {
  // Verificar se está no client-side (browser)
  if (typeof window !== 'undefined') {
    throw new Error('Service Role Key não deve ser usada no frontend!');
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service Role Key
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
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);