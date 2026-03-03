// src/components/layout/Header
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useNavigate } from 'react-router-dom';
import db from '../../services/database/db';
import { initializeSyncSystem, syncManager } from '../../services/database/syncManager';
import { NotificacoesBellInteligente } from './Notificao';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';

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

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  path: string;
  type: 'page' | 'aluno' | 'turma' | 'curso';
}

const Header: React.FC<HeaderProps> = ({ setIsDarkMode, isDarkMode }) => {
  const { logout, user } = useAuth() as AuthContextType;
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ pending: 0, errors: 0 });
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const staticSearchItems: SearchResultItem[] = [
    { id: 'pg-dashboard', title: 'Dashboard', subtitle: 'Visão geral do sistema', path: '/dashboard', type: 'page' },
    { id: 'pg-alunos', title: 'Alunos', subtitle: 'Gestão de alunos', path: '/alunos', type: 'page' },
    { id: 'pg-turmas', title: 'Turmas', subtitle: 'Gestão de turmas', path: '/turmas', type: 'page' },
    { id: 'pg-cursos', title: 'Cursos', subtitle: 'Gestão de cursos', path: '/cursos', type: 'page' },
    { id: 'pg-frequencia', title: 'Frequência', subtitle: 'Registro de presença', path: '/frequencia', type: 'page' },
    { id: 'pg-notas', title: 'Notas', subtitle: 'Gestão de avaliações', path: '/notas', type: 'page' },
    { id: 'pg-aulas', title: 'Aulas', subtitle: 'Planejamento de aulas', path: '/aulas', type: 'page' },
    { id: 'pg-financeiro', title: 'Financeiro', subtitle: 'Resumo financeiro', path: '/financeiro', type: 'page' },
    { id: 'pg-financeiro-pagamentos', title: 'Pagamentos', subtitle: 'Propinas e pendências', path: '/financeiro/pagamentos', type: 'page' },
    { id: 'pg-financeiro-transacoes', title: 'Transações', subtitle: 'Entradas e saídas', path: '/financeiro/transacoes', type: 'page' },
    { id: 'pg-estrategia', title: 'Estratégia', subtitle: 'Metas, tarefas e planeamento', path: '/estrategia', type: 'page' },
    { id: 'pg-config', title: 'Configurações', subtitle: 'Parâmetros do sistema', path: '/configuracoes', type: 'page' }
  ];

  useEffect(() => {
    // ✅ Inicializar sistema de sincronização
    const initSync = async () => {
      try {
        await initializeSyncSystem();
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
      const instituicaoId = instituicaoIdValue();
      const syncQueue = instituicaoId
        ? await db.syncQueue
            .where('instituicao_id')
            .equals(instituicaoId)
            .and((item) => item.status === 'pending')
            .count()
        : 0;
      const syncErrors = instituicaoId
        ? await db.syncQueue
            .where('instituicao_id')
            .equals(instituicaoId)
            .and((item) => item.status === 'failed')
            .count()
        : 0;
      
      setSyncStatus({
        pending: syncQueue,
        errors: syncErrors
      });

      // Se estiver online e houver pendências, sinalizar estado
      if (isOnline && syncQueue > 0) {
        setSaveStatus('saving');
      } else if (isOnline && syncQueue === 0) {
        setSaveStatus(syncErrors > 0 ? 'error' : 'saved');
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
  };

  const runGlobalSearch = useCallback(async (rawQuery: string) => {
    const query = rawQuery.trim().toLowerCase();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const instituicaoId = instituicaoIdValue();

      const staticMatches = staticSearchItems
        .filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            item.subtitle.toLowerCase().includes(query)
        )
        .slice(0, 6);

      const [alunos, turmas, cursos] = await Promise.all([
        db.alunos
          .filter((a) =>
            !a.deleted &&
            (!instituicaoId || a.instituicao_id === instituicaoId) &&
            (
              (a.nome_completo || '').toLowerCase().includes(query) ||
              String(a.numero_estudante || '').includes(query)
            )
          )
          .limit(4)
          .toArray(),
        db.turmas
          .filter((t) =>
            !t.deleted &&
            (!instituicaoId || t.instituicao_id === instituicaoId) &&
            (
              (t.nome_turma || '').toLowerCase().includes(query) ||
              (t.professor || '').toLowerCase().includes(query)
            )
          )
          .limit(3)
          .toArray(),
        db.cursos
          .filter((c) =>
            !c.deleted &&
            (!instituicaoId || c.instituicao_id === instituicaoId) &&
            (
              (c.nome || '').toLowerCase().includes(query) ||
              (c.disciplinas || []).some((d: string) => d.toLowerCase().includes(query))
            )
          )
          .limit(3)
          .toArray()
      ]);

      const alunoResults: SearchResultItem[] = alunos.map((a) => ({
        id: `aluno-${a.id}`,
        title: a.nome_completo || 'Aluno',
        subtitle: `Aluno #${a.numero_estudante || ''}`,
        path: `/alunos/${a.id}`,
        type: 'aluno'
      }));

      const turmaResults: SearchResultItem[] = turmas.map((t) => ({
        id: `turma-${t.id}`,
        title: t.nome_turma || 'Turma',
        subtitle: `Professor: ${t.professor || 'N/D'}`,
        path: `/turmas/${t.id}`,
        type: 'turma'
      }));

      const cursoResults: SearchResultItem[] = cursos.map((c) => ({
        id: `curso-${c.id}`,
        title: c.nome || 'Curso',
        subtitle: `${(c.disciplinas || []).length} disciplina(s)`,
        path: `/cursos/${c.id}`,
        type: 'curso'
      }));

      setSearchResults([...staticMatches, ...alunoResults, ...turmaResults, ...cursoResults].slice(0, 10));
    } catch (error) {
      console.error('Erro na pesquisa global:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>): Promise<void> => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = searchResults[0];
      if (first) {
        navigate(first.path);
        setShowSearchResults(false);
        setSearchQuery('');
      }
    } else if (e.key === 'Escape') {
      setShowSearchResults(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      runGlobalSearch(searchQuery);
    }, 200);

    return () => clearTimeout(timeout);
  }, [searchQuery, runGlobalSearch]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!searchContainerRef.current) return;
      if (!searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);


  const handleSyncClick = async (): Promise<void> => {
    if (!isOnline) return;
    setSaveStatus('saving');
    try {
      // 1) Enviar pendências locais primeiro
      await syncManager.uploadBatch();
      await syncManager.uploadFailedItems()

      // 2) Limpar marcadores de sincronização incremental para forçar download completo
      Object.keys(localStorage)
        .filter((key) => key.startsWith('last_sync_'))
        .forEach((key) => localStorage.removeItem(key));

      // 3) Baixar tudo novamente
      await syncManager.downloadBatch();

      setSaveStatus('saved');
      await verificarStatusSincronizacao();
      } catch (error) {
      setSaveStatus('error');
      console.error('Erro na sincronização:', error);
    }
  };

return (
    <header className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-3 sm:py-4 shadow-sm relative z-10 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Lado Esquerdo - Busca */}
        <div className="flex items-center flex-1 min-w-0"> {/* min-w-0 permite encolher */}
          <div ref={searchContainerRef} className="relative w-full max-w-2xl"> {/* Removido max-w-lg e aumentado */}
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar alunos, turmas, relatórios..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchResults(true)}
              onKeyDown={handleSearch}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm sm:text-base transition-all duration-200"
            />

            {/* Placeholder responsivo para mobile */}
            <style>{`
              @media (max-width: 640px) {
                input::placeholder {
                  content: "Buscar...";
                }
              }
            `}</style>

            {showSearchResults && (searchQuery.trim().length > 0) && (
              <div className="absolute top-12 sm:top-14 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-40">
                {isSearching ? (
                  <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">Pesquisando...</div>
                ) : searchResults.length > 0 ? (
                  <ul className="max-h-80 overflow-auto divide-y divide-gray-100 dark:divide-gray-700">
                    {searchResults.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => {
                            navigate(item.path);
                            setShowSearchResults(false);
                            setSearchQuery('');
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-300">{item.subtitle}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                    Nenhum resultado encontrado para "{searchQuery}".
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito - Ícones e Status */}
        <div className="flex items-center gap-1 sm:gap-2 ml-0 sm:ml-2 flex-shrink-0">
          
          {/* Status de Sincronização - versão compacta no mobile */}
          <button
            onClick={handleSyncClick}
            disabled={!isOnline}
            className={`relative flex items-center justify-center sm:justify-start gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg transition-all ${
              isOnline ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
            } ${getStatusColor()}`}
            title={!isOnline 
              ? 'Modo Offline' 
              : syncStatus.pending > 0
                ? 'Clique para forçar full sync'
                : syncStatus.errors > 0 
                  ? 'Clique para tentar full sync'
                  : 'Clique para atualizar tudo (full sync)'
            }
          >
            {isOnline ? (
              <FiWifi className="text-sm sm:text-base" />
            ) : (
              <FiWifiOff className="text-sm sm:text-base" />
            )}
            <span className="text-xs sm:text-sm font-medium hidden sm:inline">
              {getStatusText()}
            </span>
            
            
          </button>

          {/* Modo Dark/Light */}
          <button
            onClick={toggleDarkMode}
            className="p-2 sm:p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
            aria-label={isDarkMode ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
          >
            {isDarkMode ? <FiSun size={18} className="sm:text-lg" /> : <FiMoon size={18} className="sm:text-lg" />}
          </button>

          {/* Componente de Notificações */}
          <div className="relative">
            <NotificacoesBellInteligente userRole={(localStorage.getItem("user_role") as 'aluno' | 'teacher' | 'admin' | 'manager') ||"admin"} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
