import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiUser,
  FiMail,
  FiLock,
  FiCalendar,
  FiEdit2,
  FiSave,
  FiX,
  FiBell,
  FiShield,
  FiDatabase,
  FiGlobe,
  FiUpload,
  FiKey,
  FiCheckCircle
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { notificacaoService } from '../../services/database/notificacaoService';


const ProfilePage: React.FC = () => {
  const { user, profile, updateProfile, changePassword } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [profileStats, setProfileStats] = useState({
    totalNotifications: 0,
    unreadNotifications: 0,
    lastLogin: '',
    accountAge: ''
  });

  // Estados do formulário
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || user?.email || '',
    role: profile?.role || 'user',
    created_at: profile?.created_at || user?.created_at || ''
  });

  // Estados de senha
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Estados de notificações
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    desktopNotifications: true,
    newsletter: false,
    securityAlerts: true
  });

  useEffect(() => {
    if (user || profile) {
      setFormData({
        full_name: profile?.full_name || '',
        email: profile?.email || user?.email || '',
        role: profile?.role || 'user',
        created_at: profile?.created_at || user?.created_at || ''
      });
      loadProfileStats();
    }
  }, [user, profile]);

  const loadProfileStats = async () => {
    try {
      // Carregar estatísticas de notificações
      const [allNotifications, unreadNotifications] = await Promise.all([
        notificacaoService.listarNotificacoes(),
        notificacaoService.contarNotificacoesNaoLidas()
      ]);

      // Calcular idade da conta
      const createdDate = new Date(profile?.created_at || user?.created_at || Date.now());
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      setProfileStats({
        totalNotifications: allNotifications.length,
        unreadNotifications,
        lastLogin: new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        accountAge: diffDays > 365 
          ? `${Math.floor(diffDays / 365)} ano(s)` 
          : `${diffDays} dia(s)`
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (setting: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await updateProfile({
        full_name: formData.full_name
      });

      // Criar notificação de atualização de perfil
      await notificacaoService.criarNotificacaoSistema({
        titulo: 'Perfil Atualizado',
        corpo: 'Seus dados de perfil foram atualizados com sucesso',
        tipo: 'perfil',
        meta: { updated_at: new Date().toISOString() }
      });

      setSuccessMessage('Perfil atualizado com sucesso!');
      setIsEditing(false);
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('As senhas não coincidem');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);

      // Criar notificação de alteração de senha
      await notificacaoService.criarNotificacaoSistema({
        titulo: 'Senha Alterada',
        corpo: 'Sua senha foi alterada com sucesso',
        tipo: 'segurança',
        meta: { changed_at: new Date().toISOString() }
      });

      setSuccessMessage('Senha alterada com sucesso!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setIsChangingPassword(false);
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'manager': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'teacher': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gestor';
      case 'teacher': return 'Professor';
      default: return 'Usuário';
    }
  };

  // Função para gerar avatar com iniciais
  const getAvatarInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Animação para entrada da página
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Meu Perfil
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gerencie suas informações pessoais, segurança e preferências
          </p>
        </motion.div>

        {/* Mensagens de feedback */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
          >
            <div className="flex items-center">
              <FiCheckCircle className="text-green-600 dark:text-green-400 mr-3" />
              <p className="text-green-800 dark:text-green-300">{successMessage}</p>
            </div>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <p className="text-red-800 dark:text-red-300">{errorMessage}</p>
          </motion.div>
        )}

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Coluna 1: Informações do Perfil */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
            
            {/* Card: Informações Pessoais */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                        {getAvatarInitials(formData.full_name || formData.email || '')}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                        <FiUser className="text-white text-xs" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {isEditing ? (
                          <input
                            type="text"
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleInputChange}
                            className="bg-transparent border-b border-blue-500 focus:outline-none text-xl font-semibold"
                            placeholder="Seu nome"
                          />
                        ) : (
                          formData.full_name || 'Usuário'
                        )}
                      </h2>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(formData.role)}`}>
                          {getRoleLabel(formData.role)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {user?.id?.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSaveProfile}
                          disabled={loading}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
                        >
                          <FiSave />
                          <span>{loading ? 'Salvando...' : 'Salvar'}</span>
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center space-x-2"
                        >
                          <FiX />
                          <span>Cancelar</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center space-x-2"
                      >
                        <FiEdit2 />
                        <span>Editar Perfil</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <FiMail className="inline mr-2" />
                        Email
                      </label>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-gray-900 dark:text-white">{user?.email}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <FiCalendar className="inline mr-2" />
                        Conta criada em
                      </label>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-gray-900 dark:text-white">
                          {new Date(formData.created_at || '').toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <FiShield className="inline mr-2" />
                        Nível de Acesso
                      </label>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className={`font-medium ${getRoleColor(formData.role)} px-3 py-1 rounded-full inline-block`}>
                          {getRoleLabel(formData.role)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          Permissões de {formData.role === 'admin' ? 'administrador completo' : 'usuário básico'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <FiGlobe className="inline mr-2" />
                        Idioma
                      </label>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-gray-900 dark:text-white">Português (Brasil)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Alterar Senha */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <FiKey className="mr-2" />
                  Segurança da Conta
                </h3>
              </div>
              
              <div className="p-6">
                {isChangingPassword ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Senha Atual
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700"
                        placeholder="Digite sua senha atual"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nova Senha
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700"
                        placeholder="Digite a nova senha"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confirmar Nova Senha
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700"
                        placeholder="Confirme a nova senha"
                      />
                    </div>
                    
                    <div className="flex space-x-2 pt-4">
                      <button
                        onClick={handleChangePassword}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
                      >
                        <FiSave />
                        <span>{loading ? 'Alterando...' : 'Alterar Senha'}</span>
                      </button>
                      <button
                        onClick={() => setIsChangingPassword(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-start">
                        <FiKey className="text-yellow-600 dark:text-yellow-400 mt-1 mr-3" />
                        <div>
                          <h4 className="font-medium text-yellow-800 dark:text-yellow-300">
                            Recomendamos alterar sua senha periodicamente
                          </h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                            Use uma senha forte com letras, números e caracteres especiais
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setIsChangingPassword(true)}
                      className="px-4 py-2 border-2 border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg flex items-center space-x-2"
                    >
                      <FiKey />
                      <span>Alterar Senha</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Card: Notificações */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <FiBell className="mr-2" />
                  Configurações de Notificação
                </h3>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {Object.entries(notificationSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {key === 'emailNotifications' && 'Notificações por Email'}
                          {key === 'pushNotifications' && 'Notificações Push'}
                          {key === 'desktopNotifications' && 'Notificações na Área de Trabalho'}
                          {key === 'newsletter' && 'Receber Newsletter'}
                          {key === 'securityAlerts' && 'Alertas de Segurança'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {key === 'emailNotifications' && 'Receba notificações no seu email'}
                          {key === 'pushNotifications' && 'Notificações em tempo real'}
                          {key === 'desktopNotifications' && 'Mostrar notificações no sistema'}
                          {key === 'newsletter' && 'Atualizações e novidades'}
                          {key === 'securityAlerts' && 'Alertas importantes de segurança'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleNotificationChange(key as keyof typeof notificationSettings)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          value ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            value ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Coluna 2: Estatísticas e Ações Rápidas */}
          <motion.div variants={itemVariants} className="space-y-6">
            
            {/* Card: Estatísticas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <FiDatabase className="mr-2" />
                  Estatísticas
                </h3>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Notificações</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {profileStats.totalNotifications}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Não lidas</p>
                      <p className="text-xl font-bold text-red-600 dark:text-red-400">
                        {profileStats.unreadNotifications}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Último Login</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {profileStats.lastLogin}
                    </p>
                  </div>
                  
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tempo de Conta</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {profileStats.accountAge}
                    </p>
                  </div>
                  
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status da Conta</p>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <p className="font-medium text-green-600 dark:text-green-400">Ativa</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Ações Rápidas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Ações Rápidas
                </h3>
              </div>
              
              <div className="p-6">
                <div className="space-y-3">
                  <button
                    onClick={() => console.log('Exportar dados')}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center space-x-3"
                  >
                    <FiUpload />
                    <span>Exportar Meus Dados</span>
                  </button>
                  
                  <button
                    onClick={() => console.log('Atividade')}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center space-x-3"
                  >
                    <FiDatabase />
                    <span>Ver Atividade</span>
                  </button>
                  
                  <button
                    onClick={() => console.log('Sessões')}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center space-x-3"
                  >
                    <FiShield />
                    <span>Sessões Ativas</span>
                  </button>
                  
                  <button
                    onClick={() => console.log('Suporte')}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-3"
                  >
                    <FiBell />
                    <span>Solicitar Suporte</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card: Dicas de Segurança */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Dicas de Segurança
              </h3>
              
              <ul className="space-y-3">
                <li className="flex items-start">
                  <FiCheckCircle className="text-white mr-2 mt-1" />
                  <span className="text-white/90">Use senhas fortes e únicas</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-white mr-2 mt-1" />
                  <span className="text-white/90">Ative a verificação em duas etapas</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-white mr-2 mt-1" />
                  <span className="text-white/90">Revise as sessões ativas regularmente</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-white mr-2 mt-1" />
                  <span className="text-white/90">Mantenha seus dados atualizados</span>
                </li>
              </ul>
              
              <button
                onClick={() => console.log('Mais segurança')}
                className="w-full mt-4 px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium"
              >
                Saiba Mais
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* Footer Informativo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Última atualização: {new Date().toLocaleDateString('pt-BR')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Para suporte técnico, entre em contato com administrador@escola.com
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <button
                onClick={() => console.log('Recarregar')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Recarregar Dados
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
