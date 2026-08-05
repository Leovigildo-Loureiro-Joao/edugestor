
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/logo.png';
import logoBlack from '../../assets/logoblack1.png';
import adminBg from '../../assets/admin.jpg';
import { FiMail, FiLock, FiUser } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAlert } from '../ui/AlertBadge';
import { supabase } from '../../services/database/db';
import { auditLogService } from '../../services/audit/auditLogService';

export {logo,logoBlack};
const PHRASES = [
  'Gestão Académica Inteligente',
  'Controle de Frequência Avançado',
  'Sistema Financeiro Completo',
  'Relatórios em Tempo Real',
  'Plataforma de Aprendizagem',
  'Comunicação Eficiente'
];

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    confirmPassword: '',
    institutionName: ''
  });
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showIllustration, setShowIllustration] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [openingAccount, setOpeningAccount] = useState(false);
  
  const { user, login, register, loginWithGoogle, loading, error, clearError, completePendingRegistration } = useAuth();
  const navigate = useNavigate();
  const { showAlert } = useAlert(); 
  const location = useLocation();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const onMediaChange = () => setShowIllustration(mediaQuery.matches);
    onMediaChange();
    mediaQuery.addEventListener('change', onMediaChange);
    return () => mediaQuery.removeEventListener('change', onMediaChange);
  }, []);

  
  useEffect(() => {
    const currentPhrase = PHRASES[currentIndex];
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        
        if (currentText.length < currentPhrase.length) {
          setCurrentText(currentPhrase.slice(0, currentText.length + 1));
        } else {
          
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        
        if (currentText.length > 0) {
          setCurrentText(currentText.slice(0, currentText.length - 1));
        } else {
          
          setIsDeleting(false);
          setCurrentIndex((prev) => (prev + 1) % PHRASES.length);
        }
      }
    }, isDeleting ? 50 : 100);

    return () => clearTimeout(timeout);
  }, [currentText, currentIndex, isDeleting]);

  
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const errorParam = searchParams.get('error');
    
    if (errorParam) {
      
      const errorMessage = decodeURIComponent(errorParam);
      if (errorMessage === 'auth_failed') {
        setFormError('Falha na autenticação. Tente novamente.');
      } else {
        setFormError(errorMessage);
      }
      
      
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const validateForm = () => {
    setFormError('');
    
    if (!isLogin) {
      
      if (!formData.displayName.trim()) {
        setFormError('Por favor, informe seu nome completo');
        return false;
      }
      
      if (!formData.institutionName.trim()) {
        setFormError('Por favor, informe o nome da instituição');
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
        await register(formData.email, formData.password, formData.displayName, formData.institutionName);
        localStorage.removeItem('pending_registration');
        setRegistrationComplete(true);
      }
    } catch (error) {
       showAlert({
            title:"Erro de autenticação",
            type:"error",
            duration:5000,
            message:"Contacte ao administrador para verificar suas permissões"
          })
      console.error('Erro de autenticação:', error);
      
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    setFormError('');
    
    try {
      await loginWithGoogle();
      
    } catch (error) {
      showAlert({
            title:"Erro no login com Google",
            type:"error",
            duration:5000,
            message:"Contacte ao administrador para verificar suas permissões"
          })
      console.error('Erro no login com Google:', error);
      setFormError('Erro ao tentar login com Google. Tente novamente.');
    }
  };

  const handleForgotPassword = async () => {
    const email = formData.email?.trim();
    if (!email) {
      setFormError('Informe o email para recuperar a senha.');
      await auditLogService.log('AUTH_PASSWORD_RESET_REQUEST_INVALID', {
        reason: 'missing_email_on_request'
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`
      });
      if (error) throw error;

      await auditLogService.log('AUTH_PASSWORD_RESET_REQUEST', { email });
      showAlert({
        title: 'Pedido enviado',
        type: 'success',
        duration: 5000,
        message: 'Se o email existir, enviaremos instruções para redefinir a senha.'
      });
    } catch (error) {
      await auditLogService.log('AUTH_PASSWORD_RESET_REQUEST_FAILED', {
        email,
        reason: error?.message || 'unknown'
      });
      setFormError('Não foi possível processar a recuperação agora.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    
    if (formError) {
      setFormError('');
    }
  };

  const handleOpenAccount = async () => {
    setOpeningAccount(true);
    setFormError('');
    try {
      await completePendingRegistration(user, formData.displayName, formData.institutionName);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Erro ao abrir conta:', err);
      setFormError('Erro ao criar sua conta. Tente novamente.');
    } finally {
      setOpeningAccount(false);
    }
  };

  useEffect(() => {
    if (user && !registrationComplete) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate, registrationComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className='flex flex-col lg:flex-row w-full max-w-6xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden'>
        {/* Lado Esquerdo - Imagem com overlay e máquina de escrever */}
        {showIllustration && (
        <div className='lg:w-1/2 relative'>
          <div className="relative h-64 lg:h-full">
            <motion.img
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              src={adminBg}
              className='w-full h-full object-cover'
              alt="Ambiente educacional"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
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
                  <p className="text-xl lg:text-2xl font-bold text-primary-200">
                    {currentText}
                    <span className="ml-1 animate-pulse">|</span>
                  </p>
                </div>

                
              </motion.div>
            </div>
          </div>
        </div>
        )}

        {/* Lado Direito - Formulário */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`${showIllustration ? 'lg:w-1/2' : 'w-full'} p-6 lg:p-8 flex flex-col justify-center`}
        >
          <div className='flex flex-col items-center justify-center mb-6'>
            <img src={logo} className='w-24 h-24 lg:w-32 lg:h-32 mb-4' alt="EduGestor Logo" />
            <div className="text-center">
              <h1 className="text-2xl lg:text-3xl font-bold text-primary-600">EduGestor</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm lg:text-base">
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

          {registrationComplete ? (
            /* Tela de abertura de conta */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <FiUser className="text-3xl text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                Conta criada com sucesso!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm lg:text-base">
                Clique no botão abaixo para abrir sua conta e acessar o sistema.
              </p>
              <button
                onClick={handleOpenAccount}
                disabled={openingAccount}
                className="w-full max-w-xs mx-auto bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
              >
                {openingAccount ? 'Processando...' : 'Abrir Conta'}
              </button>
              <button
                onClick={() => {
                  setRegistrationComplete(false);
                  setIsLogin(true);
                  setFormData({
                    email: '',
                    password: '',
                    displayName: '',
                    confirmPassword: '',
                    institutionName: ''
                  });
                }}
                className="mt-4 text-primary-600 hover:text-primary-700 font-medium text-sm"
              >
                Voltar ao login
              </button>
            </motion.div>
          ) : (
            <>
              {/* Botão de Login Social */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                >
                  <FcGoogle className="text-xl" />
                  {loading ? 'Processando...' : 'Continuar com Google'}
                </button>

                {/* Mensagem sobre primeiro acesso */}
                {!isLogin && (
                  <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                    <p>Ao se registrar, você criará sua própria instituição.</p>
                    <p>Você será o administrador da instituição criada.</p>
                  </div>
                )}
              </div>

              {/* Divisor */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Ou continue com email</span>
                </div>
              </div>

              {/* Formulário de Email/Senha */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm lg:text-base"
                        placeholder="Seu nome completo"
                      />
                    </div>
                  </div>
                )}

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome da Instituição *
                    </label>
                    <div className="relative">
                      <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        name="institutionName"
                        value={formData.institutionName}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm lg:text-base"
                        placeholder="Ex: Escola Secundária Central"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm lg:text-base"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm lg:text-base"
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm lg:text-base"
                        placeholder="Confirme sua senha"
                      />
                    </div>
                  </div>
                )}

                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
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
                      confirmPassword: '',
                      institutionName: ''
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
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:text-gray-100"
                  >
                    Precisa de acesso administrativo?
                  </button>
                </div>
              )}

              {/* Informações de segurança */}
              <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
                <p> Seus dados estão seguros com criptografia de ponta</p>
                <p className="mt-1">Use apenas para testes educacionais</p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export { Login };
