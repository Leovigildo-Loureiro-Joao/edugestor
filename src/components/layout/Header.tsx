// src/components/layout/Header.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiSearch, 
  FiMoon,
  FiSun,
  FiWifi,
  FiWifiOff,
  FiUser,
  FiLogOut,
  FiSettings,
  FiUserCheck
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { initializeSyncSystem } from '../../services/database/syncManager';
import { NotificacoesBellInteligente } from './Notificao';
import { notificacaoService } from '../../services/database/notificacaoService';

// Interface para o status de sincronização
interface SyncStatus {
  pending: number;
  errors: number;
}

// Interface para o usuário
interface User {
  id: string;
  name: string;
  email?: string;
  // Adicione outras propriedades conforme necessário
}

// Interface para o contexto de autenticação
interface AuthContextType {
  logout: () => Promise<void>;
  user: User | null;
  // Adicione outras propriedades conforme necessário
}

// Interface para as props do componente
interface HeaderProps {
  setIsDarkMode: (isDark: boolean) => void;
  isDarkMode: boolean;
}

// Extendendo a interface Window para incluir propriedades personalizadas
declare global {
  interface Window {
    db?: {
      syncQueue: {
        where: (field: string) => {
          equals: (value: string) => {
            count: () => Promise<number>;
          };
          anyOf: (values: string[]) => {
            count: () => Promise<number>;
          };
        };
        // Adicione outras propriedades conforme necessário
      };
      // Adicione outras tabelas conforme necessário
    };
  }
}

const Header: React.FC<HeaderProps> = ({ setIsDarkMode, isDarkMode }) => {
  const { logout, user } = useAuth() as AuthContextType;
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ pending: 0, errors: 0 });

  useEffect(() => {
    // ✅ Inicializar sistema de sincronização
    const initSync = async () => {
      try {
        await initializeSyncSystem();
        console.log('✅ Sistema de sincronização inicializado');
        await verificarStatusSincronizacao();
      } catch (error) {
        console.error('❌ Erro ao inicializar sincronização:', error);
      }
    };

    initSync();

    // Monitorar status de sincronização periodicamente
    const syncInterval = setInterval(verificarStatusSincronizacao, 30000); // A cada 30 segundos
    
    return () => {
      clearInterval(syncInterval);
    };
  }, []);

  const verificarStatusSincronizacao = async () => {
    try {
      // Verificar itens pendentes na fila de sync
      if (window.db?.syncQueue) {
        const syncQueue = await window.db.syncQueue.where('status').equals('pending').count();
        const syncErrors = await window.db.syncQueue.where('status').equals('failed').count();
        
        setSyncStatus({
          pending: syncQueue,
          errors: syncErrors
        });

        // Se estiver online e houver pendências, tentar sincronizar
        if (isOnline && syncQueue > 0) {
          console.log(`🔄 ${syncQueue} itens pendentes para sincronizar`);
          setSaveStatus('saving');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status de sincronização:', error);
    }
  };

  const getStatusColor = (): string => {
    if (!isOnline) return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400';
    
    switch (saveStatus) {
      case 'saving':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'saved':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      case 'error':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
    }
  };

  // Monitorar conexão
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Quando voltar a ficar online, tentar sincronizar
      setTimeout(verificarStatusSincronizacao, 2000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setSaveStatus('saved'); // Reset status quando offline
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusText = useCallback((): string => {
    if (!isOnline) return 'Modo Offline';
    
    if (syncStatus.pending > 0) {
      return `${syncStatus.pending} pendente(s)`;
    }
    
    if (syncStatus.errors > 0) {
      return `${syncStatus.errors} erro(s)`;
    }
    
    switch (saveStatus) {
      case 'saving':
        return 'Sincronizando...';
      case 'saved':
        return 'Sincronizado';
      case 'error':
        return 'Erro na sinc';
      default:
        return 'Online';
    }
  }, [isOnline, saveStatus, syncStatus]);

  // Monitorar mudança de tema do sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('darkMode')) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [setIsDarkMode]);

  const toggleDarkMode = (): void => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    
    // Notificação de mudança de tema
    notificacaoService.criarNotificacaoSistema({
      titulo: 'Tema alterado',
      corpo: `Modo ${newMode ? 'escuro' : 'claro'} ativado`,
      tipo: 'sistema'
    });
  };

  const handleLogout = async (): Promise<void> => {
    try {
      // Criar notificação de logout
      await notificacaoService.criarNotificacaoSistema({
        titulo: 'Logout realizado',
        corpo: `Usuário ${user?.name || 'Desconhecido'} desconectou-se do sistema`,
        tipo: 'segurança'
      });

      // Aguardar um pouco antes de fazer logout
      setTimeout(() => {
        logout();
      }, 500);
    } catch (error) {
      console.error('Erro ao criar notificação de logout:', error);
      logout();
    }
  };

  const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>): Promise<void> => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Criar notificação de busca
      await notificacaoService.criarNotificacaoSistema({
        titulo: 'Busca realizada',
        corpo: `Termo buscado: "${searchQuery}"`,
        tipo: 'busca',
        meta: { query: searchQuery }
      });
    }
  };

  const getUserInitials = (): string => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleSyncClick = async (): Promise<void> => {
    if (isOnline && syncStatus.pending > 0) {
      setSaveStatus('saving');
      try {
        // Aqui você chamaria o serviço de sincronização
        console.log('🔄 Iniciando sincronização manual...');
        
        // Simulação de sincronização
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setSaveStatus('saved');
        await verificarStatusSincronizacao();
        
        // Notificação de sincronização bem-sucedida
        await notificacaoService.criarNotificacaoSistema({
          titulo: 'Sincronização concluída',
          corpo: 'Dados sincronizados com sucesso',
          tipo: 'sincronizacao'
        });
      } catch (error) {
        setSaveStatus('error');
        console.error('Erro na sincronização:', error);
      }
    }
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>

        {/* Lado Direito - Ícones e Status */}
        <div className="flex items-center space-x-4 ml-6">
          
          {/* Status de Sincronização */}
          <button
            onClick={handleSyncClick}
            disabled={!isOnline || syncStatus.pending === 0}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
              isOnline && syncStatus.pending > 0 
                ? 'cursor-pointer hover:opacity-90' 
                : 'cursor-default'
            } ${getStatusColor()}`}
            title={!isOnline 
              ? 'Modo Offline' 
              : syncStatus.pending > 0 
                ? 'Clique para sincronizar' 
                : syncStatus.errors > 0 
                  ? 'Erros na sincronização' 
                  : 'Tudo sincronizado'
            }
          >
            {isOnline ? (
              <FiWifi className="text-sm" />
            ) : (
              <FiWifiOff className="text-sm" />
            )}
            <span className="text-sm font-medium">{getStatusText()}</span>
            
            {/* Badge para pendências */}
            {syncStatus.pending > 0 && (
              <span className="bg-yellow-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {syncStatus.pending}
              </span>
            )}
            
            {/* Badge para erros */}
            {syncStatus.errors > 0 && syncStatus.pending === 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {syncStatus.errors}
              </span>
            )}
          </button>

          {/* Modo Dark/Light */}
          <button
            onClick={toggleDarkMode}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
            aria-label={isDarkMode ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
          >
            {isDarkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>

          {/* Componente de Notificações */}
          <div className="relative">
            <NotificacoesBellInteligente userRole={localStorage.getItem("user_role")||"admin"} />
          </div>

         
        </div>
      </div>
    </header>
  );
};

export default Header;