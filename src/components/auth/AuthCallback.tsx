
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import db, { supabase } from '../../services/database/db';
import { profileService } from '../../services/database/profileService';
import { User } from '@supabase/supabase-js';
import { useAlert } from '../ui/AlertBadge';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
          
          await handleAuthCallback(session.user);
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
    
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle(); 

    
    if (!existingProfile) {
      
      const pendingUser = await db.profiles
        .where('email')
        .equals(user.email || '')
        .first();

      if (pendingUser) {
        
        
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

        
        await db.profiles.update(pendingUser.id, {
          sync_status: 'synced',
          supabase_id: user.id
        });

      } else {
        
        
        await supabase.auth.signOut();
        
        
        showAlert({ type: 'error', title: 'Você precisa ser convidado por um administrador para acessar o sistema.' });
        
        
        navigate('/login?error=' + encodeURIComponent('Você precisa ser convidado por um administrador para acessar o sistema.'));
        return;
      }
    }

    
    const finalProfile = existingProfile || (await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()).data;

    if (!finalProfile) {
      throw new Error('Perfil não encontrado');
    }

    
    await profileService.saveProfile(finalProfile);
    
    
    const redirectTo = finalProfile.role === 'admin' 
      ? '/admin' 
      : '/dashboard';
    
    navigate(redirectTo);
    
    showAlert({ type: 'success', title: `Bem-vindo, ${finalProfile.nome || finalProfile.email}!` });

  } catch (error) {
    console.error('❌ Erro no callback de autenticação:', error);
    showAlert({ type: 'error', title: 'Erro ao processar login' });
    await supabase.auth.signOut();
  }
};

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Processando autenticação...</p>
      </div>
    </div>
  );
};




export default AuthCallback;
