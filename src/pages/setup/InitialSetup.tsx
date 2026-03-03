// src/pages/Setup/InitialSetup - VERSÃO SIMPLIFICADA
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/database/db';
import { jpg } from '../admin/PromoteToAdmin';
import { logo } from '../../components/auth/Login';

const InitialSetup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({
    email: 'admin@escola.com',
    password: 'Admin123!',
    confirmPassword: 'Admin123!',
    fullName: 'Administrador Principal'
  });

  // Verificar se já existe admin
  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .limit(1);

      if (data && data.length > 0) {
        navigate('/login'); // Já tem admin, vá para login
      }
    };

    checkAdmin();
  }, [navigate]);

  const createFirstAdmin = async () => {
    setLoading(true);
    setMessage('Criando administrador principal...');

    try {
      // 1. Registrar o usuário admin
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminCredentials.email,
        password: adminCredentials.password,
        options: {
          data: {
            display_name: adminCredentials.fullName
          }
        }
      });

      if (authError) throw authError;

      // 2. Criar perfil do admin manualmente (em caso de problemas com trigger)
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: adminCredentials.email,
            role: 'admin',
            full_name: adminCredentials.fullName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) throw profileError;
      }

      setMessage('✅ Administrador criado com sucesso! Redirecionando para login...');
      
      // 3. Esperar um pouco e redirecionar
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao criar admin:', error);
      
      // Tratamento de erros específicos
      if (error.message?.includes('already registered')) {
        setMessage('❌ Este email já está registrado. Use outro email ou faça login.');
      } else if (error.message?.includes('Invalid email')) {
        setMessage('❌ Email inválido. Use um email válido.');
      } else {
        setMessage(`❌ Erro: ${error.message || 'Falha ao criar administrador'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdminCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!adminCredentials.email.includes('@')) {
      setMessage('❌ Por favor, insira um email válido');
      return false;
    }
    
    if (adminCredentials.password.length < 6) {
      setMessage('❌ A senha deve ter pelo menos 6 caracteres');
      return false;
    }
    
    if (adminCredentials.password !== adminCredentials.confirmPassword) {
      setMessage('❌ As senhas não coincidem');
      return false;
    }
    
    if (!adminCredentials.fullName.trim()) {
      setMessage('❌ Por favor, insira o nome completo');
      return false;
    }
    
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    
    if (validateForm()) {
      createFirstAdmin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">

     <section className='rounded-2xl shadow-xl max-w-5xl flex justify-center'>
        <img src={jpg} alt="" className='w-1/2 rounded-l-2xl object-cover'/>
         <div className=" w-1/2 bg-white dark:bg-gray-800 rounded-r-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <img src={logo} alt="" className='w-20 h-20 rounded-full' />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Configuração Inicial
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Crie o primeiro administrador do sistema
          </p>
        </div>

        {!showAdminForm ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-3">
                Bem-vindo ao EduGestor
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                É necessário configurar um administrador principal antes de usar o sistema.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-800 mb-2">Aviso Importante</h3>
                <p className="text-sm text-blue-800">
                  O primeiro usuário criado será o <strong>Administrador Principal</strong> com acesso total ao sistema.
                </p>
              </div>

              <button
                onClick={() => setShowAdminForm(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Configurar Administrador
              </button>
              
              <button
                onClick={() => navigate('/login')}
                className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50 dark:bg-gray-900 transition-colors mt-3"
              >
                Já tenho uma conta
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                name="fullName"
                value={adminCredentials.fullName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: João Silva"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email do Administrador *
              </label>
              <input
                type="email"
                name="email"
                value={adminCredentials.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin@escola.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Senha *
              </label>
              <input
                type="password"
                name="password"
                value={adminCredentials.password}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirmar Senha *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={adminCredentials.confirmPassword}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite a senha novamente"
              />
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.includes('✅') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            <div className="pt-4 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {loading ? 'Criando Administrador...' : 'Criar Administrador'}
              </button>
              
              <button
                type="button"
                onClick={() => setShowAdminForm(false)}
                disabled={loading}
                className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50 dark:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Voltar
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Dica: Use um email que você tenha acesso para recuperação de senha.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
            Após criar o admin, você poderá adicionar outros usuários.
          </p>
        </div>
      </div>
     </section>
    </div>
  );
};

export default InitialSetup;