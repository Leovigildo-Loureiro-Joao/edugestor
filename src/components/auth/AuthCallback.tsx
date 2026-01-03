// /auth/callback.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/database/db';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // O Supabase processa o token automaticamente
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
          console.log('✅ OAuth callback bem-sucedido');
          
          // Setup adicional para usuário OAuth
          await setupOAuthUser(session.user);
          
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('❌ Erro no callback OAuth:', error);
        navigate('/login?error=oauth_failed');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processando autenticação...</p>
      </div>
    </div>
  );
};

// ⭐ Setup especial para usuários OAuth
const setupOAuthUser = async (user: User) => {
  try {
    // 1. Extrair dados do provedor OAuth
    const userMetadata = user.user_metadata;
    const provider = user.app_metadata?.provider || 'google';
    
    // 2. Determinar role baseado no email OAuth
    let userRole = 'user';
    const email = user.email || userMetadata?.email;
    
    if (email) {
      if (email.endsWith('@escola.com')) userRole = 'teacher';
      if (email.endsWith('@admin.escola.com')) userRole = 'admin';
    }
    
    // 3. Atualizar metadados no Supabase
    const { error } = await supabase.auth.updateUser({
      data: {
        user_role: userRole,
        provider: provider,
        full_name: userMetadata?.full_name || userMetadata?.name,
        avatar_url: userMetadata?.avatar_url,
        first_login: new Date().toISOString()
      }
    });
    
    if (error) throw error;
    
    console.log(`✅ Usuário OAuth configurado com role: ${userRole}`);
  } catch (error) {
    console.error('❌ Erro ao setup usuário OAuth:', error);
  }
};

export default AuthCallback;