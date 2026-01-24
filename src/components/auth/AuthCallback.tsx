// /auth/callback.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import db, { supabase } from '../../services/database/db';
import toast from 'react-hot-toast';
import { profileService } from '../../services/database/profileService';
import { User } from '@supabase/supabase-js';

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

  const handleAuthCallback = async (user: User) => {
  try {
    // 1. Verificar se usuário já existe no sistema
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle(); // Use maybeSingle para evitar erro 406

    // 2. Se usuário NÃO existe, verificar se foi convidado
    if (!existingProfile) {
      // Buscar em usuários pendentes locais (Dexie)
      const pendingUser = await db.profiles
        .where('email')
        .equals(user.email || '')
        .first();

      if (pendingUser) {
        // Usuário foi convidado pelo admin
        console.log('✅ Usuário convidado encontrado:', pendingUser.email);
        
        // Criar perfil no Supabase (admin já criou via admin panel)
        const { error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            nome: pendingUser.full_name,
            role: pendingUser.role,
            instituicao_id: pendingUser.instituicao_id,
            created_by: pendingUser.created_at,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (createError) throw createError;

        // Atualizar status local
        await db.profiles.update(pendingUser.id, {
          sync_status: 'synced',
          supabase_id: user.id
        });

      } else {
        // ❌ Usuário NÃO foi convidado - ACESSO NEGADO
        console.log('❌ Usuário não autorizado:', user.email);
        
        // Sign out e mostrar mensagem
        await supabase.auth.signOut();
        
        // Mostrar mensagem amigável
        toast.error('Você precisa ser convidado por um administrador para acessar o sistema.');
        
        // Redirecionar para página de convite
        window.location.href = '/convite-necessario';
        return;
      }
    }

    // 3. Usuário existe ou foi criado - carregar perfil
    const finalProfile = existingProfile || (await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()).data;

    if (!finalProfile) {
      throw new Error('Perfil não encontrado');
    }

    // 4. Salvar localmente (Dexie + localStorage)
    await profileService.saveProfile(finalProfile);
    
    // 5. Redirecionar baseado no role
    const redirectTo = finalProfile.role === 'admin' 
      ? '/admin' 
      : '/dashboard';
    
    navigate(redirectTo);
    
    toast.success(`Bem-vindo, ${finalProfile.nome || finalProfile.email}!`);

  } catch (error) {
    console.error('❌ Erro no callback de autenticação:', error);
    toast.error('Erro ao processar login');
    await supabase.auth.signOut();
  }
};

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


export default AuthCallback;