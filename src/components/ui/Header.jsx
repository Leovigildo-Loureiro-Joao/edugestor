// src/components/layout/Header.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiBell, 
  FiSearch, 
  FiMoon,
  FiSun,
  FiWifi,
  FiWifiOff
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { initializeSyncSystem } from '../../services/database/syncManager.ts';

const Header = ({ setIsDarkMode, isDarkMode }) => {
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

    useEffect(() => {
      // ✅ Inicializar sistema de sincronização
      const initSync = async () => {
        await initializeSyncSystem();
        console.log('✅ Sistema de sincronização inicializado');
      };
      
      initSync();
    }, []);

  const { logout, user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const getStatusColor = () => {
    switch (saveStatus) {
      case 'saving':
        return 'text-warning-600 bg-warning-50 dark:bg-warning-900/20 dark:text-warning-400';
      case 'saved':
        return 'text-success-600 bg-success-50 dark:bg-success-900/20 dark:text-success-400';
      case 'error':
        return 'text-danger-600 bg-danger-50 dark:bg-danger-900/20 dark:text-danger-400';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  // Monitorar conexão
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Limpar intervalos e listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusText = useCallback(() => {
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
  }, [isOnline, saveStatus]);

  // Monitorar mudança de tema do sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      if (!localStorage.getItem('darkMode')) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [setIsDarkMode]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-white dark:bg-gray-800 px-6 py-4 shadow-sm relative z-10 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        
        {/* Lado Esquerdo - Busca */}
        <div className="flex items-center flex-1 max-w-lg">
          <div className="relative w-full">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Buscar alunos, turmas, relatórios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>

        {/* Lado Direito - Ícones e Status */}
        <div className="flex items-center space-x-4 ml-6">
          
          {/* Status de Save/Conexão */}
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
            isOnline 
              ? getStatusColor()
              : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}>
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
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
            aria-label={isDarkMode ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
          >
            {isDarkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>

          {/* Notificações */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative"
              aria-label={`Notificações (${unreadNotifications} não lidas)`}
            >
              <FiBell size={18} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
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
                  className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50"
                >
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Notificações</h3>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                          !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              {notification.title}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                              {notification.message}
                            </p>
                          </div>
                          {!notification.read && (
                            <span className="bg-blue-500 w-2 h-2 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {notification.time}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                    <button className="w-full text-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium py-2">
                      Ver todas as notificações
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

         
        </div>
      </div>
    </header>
  );
};

export default Header;