// src/components/layout/Header.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiBell, 
  FiSearch, 
  FiUser, 
  FiLogOut, 
  FiSettings,
  FiMoon,
  FiSun,
  FiSave,
  FiWifi,
  FiWifiOff
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving', 'saved', 'error'
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Monitorar status de conexão
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSaveStatus('saving');
      // Simular sincronização com servidor
      setTimeout(() => setSaveStatus('saved'), 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSaveStatus('saved'); // Dados salvos localmente
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Simular auto-save periódico
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline) {
        setSaveStatus('saving');
        // Simular salvamento
        setTimeout(() => setSaveStatus('saved'), 1000);
      }
    }, 30000); // Salva a cada 30 segundos

    return () => clearInterval(interval);
  }, [isOnline]);

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // Aqui você implementaria a lógica para mudar o tema
  };

  const notifications = [
    {
      id: 1,
      title: 'Propina em Atraso',
      message: '5 alunos com propinas pendentes',
      time: '10 min atrás',
      type: 'warning',
      read: false
    },
    {
      id: 2,
      title: 'Frequência Baixa',
      message: 'João Silva com 30% de faltas',
      time: '1 hora atrás',
      type: 'danger',
      read: false
    },
    {
      id: 3,
      title: 'Backup Realizado',
      message: 'Backup automático concluído com sucesso',
      time: '2 horas atrás',
      type: 'success',
      read: true
    }
  ];

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const getStatusColor = () => {
    switch (saveStatus) {
      case 'saving':
        return 'text-warning-600 bg-warning-50';
      case 'saved':
        return 'text-success-600 bg-success-50';
      case 'error':
        return 'text-danger-600 bg-danger-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <FiSave className="animate-spin" />;
      case 'saved':
        return <FiSave />;
      case 'error':
        return <FiSave />;
      default:
        return <FiSave />;
    }
  };

  const getStatusText = () => {
    if (!isOnline) return 'Modo Offline';
    
    switch (saveStatus) {
      case 'saving':
        return 'Salvando...';
      case 'saved':
        return 'Tudo salvo';
      case 'error':
        return 'Erro ao salvar';
      default:
        return 'Pronto';
    }
  };

  return (
    <header className="bg-white px-6 py-4  bg-center shadow-sm relative z-10">
    
      <div className="flex items-center justify-between">
        
        {/* Lado Esquerdo - Busca */}
        <div className="flex items-center flex-1 max-w-lg">
          <div className="relative w-full">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar alunos, turmas, relatórios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Lado Direito - Ícones e Status */}
        <div className="flex items-center space-x-4 ml-6">
          
          {/* Status de Save/Conexão */}
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${getStatusColor()}`}>
            {isOnline ? (
              <FiWifi className="text-sm" />
            ) : (
              <FiWifiOff className="text-sm" />
            )}
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>

          {/* Modo Dark/Light */}
          <button
            onClick={toggleDarkMode}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title={isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
          >
            {isDarkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>

          {/* Notificações */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative"
            >
              <FiBell size={18} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-danger-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                >
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Notificações</h3>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {notification.title}
                            </p>
                            <p className="text-gray-600 text-sm mt-1">
                              {notification.message}
                            </p>
                          </div>
                          {!notification.read && (
                            <span className="bg-primary-500 w-2 h-2 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {notification.time}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="p-2 border-t border-gray-200">
                    <button className="w-full text-center text-primary-600 hover:text-primary-700 text-sm font-medium py-2">
                      Ver todas as notificações
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Menu do Usuário */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <FiUser className="text-white text-sm" />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.displayName || 'Administrador'}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.email || 'admin@edugestor.ao'}
                </p>
              </div>
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                >
                  <div className="p-2">
                    <button className="flex items-center space-x-3 w-full p-3 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      <FiUser size={16} />
                      <span className="text-sm">Meu Perfil</span>
                    </button>
                    
                    <button className="flex items-center space-x-3 w-full p-3 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      <FiSettings size={16} />
                      <span className="text-sm">Configurações</span>
                    </button>

                    <hr className="my-2" />

                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 w-full p-3 text-left text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                    >
                      <FiLogOut size={16} />
                      <span className="text-sm">Sair</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Overlay para fechar menus ao clicar fora */}
      {(showUserMenu || showNotifications) && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </header>
  );
};

export default Header;