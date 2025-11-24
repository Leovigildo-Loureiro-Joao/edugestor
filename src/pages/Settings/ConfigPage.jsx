import { useState, useEffect } from 'react';
import { FiSettings, FiSave, FiRefreshCw, FiDatabase, FiUser, FiDollarSign, FiBell, FiShield } from 'react-icons/fi';
import { ConfiguracoesGerais } from '../../components/settings/ConfigGeral';
import { ConfiguracoesFinanceiras } from '../../components/settings/ConfigFinance';
import { ConfiguracoesAcademicas } from '../../components/settings/ConfigAcademy';
import { ConfiguracoesSeguranca } from '../../components/settings/ConfigSecure';
import { ConfiguracoesBackup } from '../../components/settings/ConfigBackup';
import ConfiguracoesNotificacoes from '../../components/settings/ConfigNotif';

export const ConfiguracoesPage = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FiSettings className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Configurações do Sistema</h1>
          </div>
          <p className="text-gray-600">Gerencie as configurações da sua escola</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar de Navegação */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('geral')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'geral' 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiSettings className="inline mr-3" />
                  Configurações Gerais
                </button>

                <button
                  onClick={() => setActiveTab('financeiro')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'financeiro' 
                      ? 'bg-green-100 text-green-700 border border-green-200' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiDollarSign className="inline mr-3" />
                  Configurações Financeiras
                </button>

                <button
                  onClick={() => setActiveTab('academico')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'academico' 
                      ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiUser className="inline mr-3" />
                  Configurações Acadêmicas
                </button>

                <button
                  onClick={() => setActiveTab('notificacoes')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'notificacoes' 
                      ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiBell className="inline mr-3" />
                  Notificações
                </button>

                <button
                  onClick={() => setActiveTab('backup')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'backup' 
                      ? 'bg-red-100 text-red-700 border border-red-200' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiDatabase className="inline mr-3" />
                  Backup & Restauração
                </button>

                <button
                  onClick={() => setActiveTab('seguranca')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'seguranca' 
                      ? 'bg-gray-100 text-gray-700 border border-gray-200' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiShield className="inline mr-3" />
                  Segurança
                </button>
              </nav>
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className="lg:col-span-3">
            {activeTab === 'geral' && <ConfiguracoesGerais />}
            {activeTab === 'financeiro' && <ConfiguracoesFinanceiras />}
            {activeTab === 'academico' && <ConfiguracoesAcademicas />}
            {activeTab === 'notificacoes' && <ConfiguracoesNotificacoes />}
            {activeTab === 'backup' && <ConfiguracoesBackup />}
            {activeTab === 'seguranca' && <ConfiguracoesSeguranca />}
          </div>
        </div>
      </div>
    </div>
  );
};