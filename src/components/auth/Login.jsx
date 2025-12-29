// src/components/auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext.tsx';
import logo from '../../assets/logo.png';
import bg from '../../assets/funcionario-que-trabalha-num-ambiente-de-comercializacao.jpg';
import { FiMail, FiLock, FiUser } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useNavigate, useLocation } from 'react-router-dom';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    confirmPassword: ''
  });
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState('');
  
  const { user, login, register, loginWithGoogle, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Frases para a máquina de escrever
  const phrases = [
    "Gestão Académica Inteligente",
    "Controle de Frequência Avançado",
    "Sistema Financeiro Completo",
    "Relatórios em Tempo Real",
    "Plataforma de Aprendizagem",
    "Comunicação Eficiente"
  ];

  // Máquina de escrever
  useEffect(() => {
    const currentPhrase = phrases[currentIndex];
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Escrevendo
        if (currentText.length < currentPhrase.length) {
          setCurrentText(currentPhrase.slice(0, currentText.length + 1));
        } else {
          // Terminou de escrever, espera e começa a apagar
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        // Apagando
        if (currentText.length > 0) {
          setCurrentText(currentText.slice(0, currentText.length - 1));
        } else {
          // Terminou de apagar, vai para próxima frase
          setIsDeleting(false);
          setCurrentIndex((prev) => (prev + 1) % phrases.length);
        }
      }
    }, isDeleting ? 50 : 100);

    return () => clearTimeout(timeout);
  }, [currentText, currentIndex, isDeleting, phrases]);

  // Verificar se há erro na query string (do callback)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const errorParam = searchParams.get('error');
    
    if (errorParam) {
      // Decodificar a mensagem de erro
      const errorMessage = decodeURIComponent(errorParam);
      if (errorMessage === 'auth_failed') {
        setFormError('Falha na autenticação. Tente novamente.');
      } else {
        setFormError(errorMessage);
      }
      
      // Limpar a query string
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const validateForm = () => {
    setFormError('');
    
    if (!isLogin) {
      // Validação para registro
      if (!formData.displayName.trim()) {
        setFormError('Por favor, informe seu nome completo');
        return false;
      }
      
      if (formData.password.length < 6) {
        setFormError('A senha deve ter pelo menos 6 caracteres');
        return false;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setFormError('As senhas não coincidem');
        return false;
      }
    }
    
    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setFormError('Por favor, informe um email válido');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setFormError('');
    
    if (!validateForm()) {
      return;
    }

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData.email, formData.password, formData.displayName);
        // Após registro bem-sucedido, redirecionar para página de boas-vindas
        navigate('/welcome');
      }
    } catch (error) {
      console.error('Erro de autenticação:', error);
      // O erro já é tratado no AuthContext
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    setFormError('');
    
    try {
      await loginWithGoogle();
      // O redirecionamento é feito pelo próprio Supabase
    } catch (error) {
      console.error('Erro no login com Google:', error);
      setFormError('Erro ao tentar login com Google. Tente novamente.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpar erros quando o usuário começa a digitar
    if (formError) {
      setFormError('');
    }
  };

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className='flex flex-col lg:flex-row w-full max-w-6xl bg-white rounded-2xl shadow-xl overflow-hidden'>
        {/* Lado Esquerdo - Imagem com overlay e máquina de escrever */}
        <div className='lg:w-1/2 relative'>
          <div className="relative h-64 lg:h-full">
            <img 
              src={bg} 
              className='w-full h-full object-cover' 
              alt="Ambiente educativo" 
            />
            {/* Overlay escuro gradiente */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-black/30"></div>
            
            {/* Conteúdo sobre a imagem */}
            <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center"
              >
                <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                  EduGestor Pro
                </h2>
                
                {/* Máquina de escrever */}
                <div className="h-16 lg:h-20 flex items-center justify-center">
                  <p className="text-xl lg:text-2xl font-medium text-primary-300">
                    {currentText}
                    <span className="ml-1 animate-pulse">|</span>
                  </p>
                </div>

                {/* Dicas de login para teste */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="mt-8 bg-black/40 backdrop-blur-sm rounded-lg p-4 max-w-md"
                >
                  <h3 className="text-sm font-semibold text-primary-200 mb-2">
                    💡 Para testes:
                  </h3>
                  <div className="text-left text-sm space-y-1">
                    <p><strong>Admin:</strong> admin@escola.com / Admin123!</p>
                    <p><strong>Como se tornar admin?</strong> Acesse /setup/promote-admin</p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Lado Direito - Formulário */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:w-1/2 p-6 lg:p-8 flex flex-col justify-center"
        >
          <div className='flex flex-col items-center justify-center mb-6'>
            <img src={logo} className='w-16 h-16 lg:w-20 lg:h-20 mb-4' alt="EduGestor Logo" />
            <div className="text-center">
              <h1 className="text-2xl lg:text-3xl font-bold text-primary-600">EduGestor</h1>
              <p className="text-gray-600 mt-2 text-sm lg:text-base">
                {isLogin ? 'Entre na sua conta' : 'Crie sua conta'}
              </p>
            </div>
          </div>

          {/* Exibir erros */}
          {(error || formError) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 rounded-lg mb-4 text-sm ${
                error?.includes('✅') 
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {error || formError}
            </motion.div>
          )}

          {/* Botão de Login Social */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
            >
              <FcGoogle className="text-xl" />
              {loading ? 'Processando...' : 'Continuar com Google'}
            </button>

            {/* Mensagem sobre primeiro acesso */}
            {!isLogin && (
              <div className="text-center text-sm text-gray-600">
                <p>Após o registro, você terá acesso como usuário básico.</p>
                <p>Para acesso administrativo, contate um administrador existente.</p>
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
                  Nome Completo *
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm lg:text-base"
                    placeholder="Seu nome completo"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm lg:text-base"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha *
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm lg:text-base"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Senha *
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm lg:text-base"
                    placeholder="Confirme sua senha"
                  />
                </div>
              </div>
            )}

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
            >
              {loading ? 'Processando...' : (isLogin ? 'Entrar com Email' : 'Criar Conta')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                clearError();
                setFormError('');
                setFormData({
                  email: '',
                  password: '',
                  displayName: '',
                  confirmPassword: ''
                });
              }}
              className="text-primary-600 hover:text-primary-700 font-medium text-sm lg:text-base"
            >
              {isLogin ? 'Não tem uma conta? Registre-se' : 'Já tem uma conta? Entre'}
            </button>
          </div>

          {/* Link para promoção a admin (apenas para login) */}
          {isLogin && (
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/setup/promote-admin')}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Precisa de acesso administrativo?
              </button>
            </div>
          )}

          {/* Informações de segurança */}
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>✅ Seus dados estão seguros com criptografia de ponta</p>
            <p className="mt-1">⚠️ Use apenas para testes educacionais</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export { Login };