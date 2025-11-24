// src/components/auth/Login.jsx
import React, { useState,useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { FiMail, FiLock, FiUser, FiPhone } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    phone: ''
  });

  
  
  const { user,login, register, loginWithGoogle, loginWithPhone, loading, error, clearError,isAuthenticated } = useAuth();


  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData.email, formData.password, formData.displayName);
      }
    } catch (error) {
      console.error('Erro de autenticação:', error);
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Erro no login com Google:', error);
    }
  };

  const handlePhoneLogin = async () => {
    clearError();
    // Implementação básica - você pode expandir isso com um modal específico para telefone
    if (formData.phone) {
      try {
        await loginWithPhone(formData.phone);
      } catch (error) {
        console.error('Erro no login com telefone:', error);
      }
    } else {
      setError('Por favor, insira seu número de telefone');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const navigate = useNavigate(); // ✅ HOOK PARA NAVEGAÇÃO

useEffect(() => {
  console.log('🔍 Login component - user:', user);
  console.log('🔍 Login component - isAuthenticated:', !!user);
  console.log('🔍 Login component - loading:', loading);
  
  if (user) {
    console.log('🎯 USUÁRIO DETECTADO! Redirecionando para dashboard...');
    console.log('🎯 User details:', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    });
    navigate('/dashboard', { replace: true });
  }
}, [user, loading, navigate]);

  // E adicione este loading state no return:


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">EduGestor</h1>
          <p className="text-gray-600 mt-2">
            {isLogin ? 'Entre na sua conta' : 'Crie sua conta'}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg mb-4"
          >
            {error}
          </motion.div>
        )}

        {/* Botões de Login Social */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-white focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FcGoogle className="text-xl" />
            Continuar com Google
          </button>

          {/* Opção de Telefone (apenas para login) */}
          {isLogin && (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="+244 9"
                  />
                </div>
              </div>
              <button
                onClick={handlePhoneLogin}
                disabled={loading || !formData.phone}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                SMS
              </button>
            </div>
          )}
        </div>

        {/* Divisor */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Ou continue com email</span>
          </div>
        </div>

        {/* Formulário de Email/Senha */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  required={!isLogin}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Seu nome completo"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Sua senha"
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Carregando...' : (isLogin ? 'Entrar com Email' : 'Criar Conta')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              clearError();
              setFormData({
                email: '',
                password: '',
                displayName: '',
                phone: ''
              });
            }}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            {isLogin ? 'Precisa de uma conta? Registre-se' : 'Já tem uma conta? Entre'}
          </button>
        </div>

        {/* Informações de segurança */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Seus dados estão seguros conosco. Usamos criptografia de ponta.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;