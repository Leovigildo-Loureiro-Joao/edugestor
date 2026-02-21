import { useState, useEffect } from 'react';
import { FiSettings, FiSave, FiRefreshCw, FiDatabase, FiUser, FiDollarSign, FiBell, FiShield, FiHome } from 'react-icons/fi';
import { ConfiguracoesGerais } from '../../components/settings/ConfigGeral';
import { motion } from 'framer-motion';
import { ConfiguracoesFinanceiras } from '../../components/settings/ConfigFinance';
import { ConfiguracoesAcademicas } from '../../components/settings/ConfigAcademy';
import { ConfiguracoesSeguranca } from '../../components/settings/ConfigSecure';
import { ConfiguracoesBackup } from '../../components/settings/ConfigBackup';
import { useNavigate, useParams } from 'react-router-dom';

import ConfiguracoesNotificacoes from '../../components/settings/ConfigNotif';
import { SyncStatusBadge } from '../../components/ui/SyncStatusBadge';

export const ConfiguracoesPage = () => {
  const { seccao } = useParams();
  const navigate = useNavigate();
  const secoes = ['geral', 'financeiro', 'academico', 'notificacoes', 'seguranca'];
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');

  useEffect(() => {
    if (seccao && secoes.includes(seccao)) {
      setActiveTab(seccao);
      return;
    }
    setActiveTab('geral');
  }, [seccao]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/configuracoes/${tab}`);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 ">
      <div className="max-w-8xl mx-auto">
        
        {/* Header */}
         <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
           transition={{delay:0.1}}
              className="mb-8">
          <div className='flex gap-3 items-center'>
            <div className="flex items-center gap-3 mb-2">
            <FiSettings className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold dark:text-white text-gray-900 leading-tight">Configurações do Sistema</h1>
          </div>
          <SyncStatusBadge tableName='system_config' />
          </div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-100">Gerencie as configurações da sua escola</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar de Navegação */}
           <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{delay:0.2}} className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 dark:border-gray-600 rounded-lg border border-gray-200 shadow-sm p-4">
              <nav className="space-y-2">
                <button
                  onClick={() => handleTabChange('geral')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'geral' 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'text-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiHome className="inline mr-3" />
                 Informações da Escola
                </button>

                <button
                  onClick={() => handleTabChange('financeiro')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'financeiro' 
                      ? 'bg-green-100 text-green-700 border border-green-200' 
                      : 'text-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiDollarSign className="inline mr-3" />
                  Configurações Financeiras
                </button>

                <button
                  onClick={() => handleTabChange('academico')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'academico' 
                      ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                      : 'text-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiUser className="inline mr-3" />
                  Configurações Acadêmicas
                </button>

                <button
                  onClick={() => handleTabChange('notificacoes')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'notificacoes' 
                      ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' 
                      : 'text-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiBell className="inline mr-3" />
                  Notificações
                </button>

                <button
                  onClick={() => handleTabChange('seguranca')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'seguranca' 
                      ? 'bg-gray-100 text-gray-700 border border-gray-200' 
                      : 'text-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiShield className="inline mr-3" />
                  Segurança
                </button>
              </nav>
            </div>
          </motion.div>

          {/* Conteúdo Principal */}
          <div className="lg:col-span-3">
            {activeTab === 'geral' && <ConfiguracoesGerais />}
            {activeTab === 'financeiro' && <ConfiguracoesFinanceiras />}
            {activeTab === 'academico' && <ConfiguracoesAcademicas />}
            {activeTab === 'notificacoes' && <ConfiguracoesNotificacoes />}
            {activeTab === 'seguranca' && <ConfiguracoesSeguranca />}
          </div>
        </div>
      </div>
    </div>
  );
};
