// src/pages/Admin/PromoteToAdmin.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/database/db';
import { useAuth } from '../../contexts/AuthContext';
import jpg from '../../assets/admin.jpg';

export {jpg};
const PromoteToAdmin = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Chave secreta para promover a admin (armazene em .env em produção)
  const ADMIN_SECRET_KEY = 'ESCOLA_SETUP_2024';

  const handlePromote = async () => {
    if (secretKey !== ADMIN_SECRET_KEY) {
      setError('Chave secreta incorreta');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verificar se o usuário já tem perfil
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (existingProfile) {
        // Atualizar perfil existente
        const { error } = await supabase
          .from('profiles')
          .update({
            role: 'admin',
            updated_at: new Date().toISOString()
          })
          .eq('id', user?.id);

        if (error) throw error;
      } else {
        // Criar novo perfil como admin
        const { error } = await supabase
          .from('profiles')
          .insert([
            {
              id: user?.id,
              email: user?.email,
              role: 'admin',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]);

        if (error) throw error;
      }

      // Recarregar a página para atualizar o contexto
      window.location.href = '/dashboard';
    } catch (error: any) {
      setError(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Se já é admin, redirecionar
  if (profile?.role === 'admin') {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
     <section className='flex'>
        <img src={jpg} alt="" />
         <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">👑</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Tornar-se Administrador
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Digite a chave secreta para se tornar administrador do sistema
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Chave Secreta
              </label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Digite a chave secreta"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Dica:</strong> Para testes, você pode usar a chave:{' '}
                <code className="bg-blue-100 px-2 py-1 rounded">ESCOLA_SETUP_2024</code>
              </p>
              <p className="text-xs text-blue-600 mt-2">
                ⚠️ Em produção, remova esta dica e use uma chave segura!
              </p>
            </div>

            <button
              onClick={handlePromote}
              disabled={loading || !secretKey}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processando...' : 'Tornar-se Admin'}
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50 dark:bg-gray-900 transition-colors"
            >
              Voltar ao Dashboard
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Se perdeu a chave, contate o desenvolvedor.
            </p>
          </div>
        </div>
     </section>
    </div>
  );
};

export default PromoteToAdmin;