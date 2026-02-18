import { useState } from "react";
import { FiActivity, FiSave, FiShield } from "react-icons/fi";
import { SelectTyped } from "../students/StudentForm";
import { motion } from "framer-motion";
import { useAlert } from "../ui/AlertBadge";

export const ConfiguracoesBackup = () => {
  const [config, setConfig] = useState({
    backupAutomatico: true,
    frequenciaBackup: 'diario', // diario, semanal, mensal
    manterBackups: 30, // dias
    backupNotificacoes: true,
    ultimoBackup: null as string | null
  });
  const { showAlert } = useAlert(); 
  const [backupProgress, setBackupProgress] = useState(0);
  const [fazendoBackup, setFazendoBackup] = useState(false);

  const fazerBackupManual = async () => {
    setFazendoBackup(true);
    setBackupProgress(0);
    
    // Simular progresso do backup
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setFazendoBackup(false);
          setConfig(prev => ({...prev, ultimoBackup: new Date().toISOString()}));
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const restaurarBackup = async () => {
    // Implementar restauração
    showAlert({
        type: 'warning',
        title: 'Selecione o arquivo',
        message: 'Selecione o arquivo de backup para restaurar',
        duration: 3000
    });
  };

  return (
     <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Backup e Restauração</h2>
      
      <div className="space-y-8">
        
        {/* Status do Backup */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-blue-900 mb-2">Status do Backup</h3>
              <p className="text-blue-700">
                {config.ultimoBackup 
                  ? `Último backup: ${new Date(config.ultimoBackup).toLocaleString('pt-AO')}`
                  : 'Nenhum backup realizado ainda'
                }
              </p>
            </div>
            <div className="text-right">
              <button
                onClick={fazerBackupManual}
                disabled={fazendoBackup}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {fazendoBackup ? 'Fazendo Backup...' : 'Backup Manual'}
              </button>
            </div>
          </div>

          {fazendoBackup && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-blue-700 mb-2">
                <span>Progresso</span>
                <span>{backupProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${backupProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Configurações de Backup Automático */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Backup Automático</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Backup automático
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Realiza backup automático dos dados do sistema
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.backupAutomatico}
                onChange={(e) => setConfig(prev => ({...prev, backupAutomatico: e.target.checked}))}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
            </div>

            {config.backupAutomatico && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Frequência
                  </label>
                   <SelectTyped
                      vect={["Diário","Semanal","Semanal","Mensal"]}
                      icon={FiActivity}
                      onChange={(e:any) => setConfig(prev => ({...prev, frequenciaBackup: e}))}
                    />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Manter backups (dias)
                  </label>
                  <input
                    type="number"
                    value={config.manterBackups}
                    onChange={(e) => setConfig(prev => ({...prev, manterBackups: parseInt(e.target.value)}))}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="365"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="backupNotificacoes"
                      checked={config.backupNotificacoes}
                      onChange={(e) => setConfig(prev => ({...prev, backupNotificacoes: e.target.checked}))}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="backupNotificacoes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enviar notificação por email após backup
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Restauração */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Restauração de Dados</h3>
          
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
            <div className="flex items-center gap-2 text-yellow-700">
              <FiShield className="text-yellow-600" />
              <span className="font-medium">Atenção</span>
            </div>
            <p className="text-sm text-yellow-600 mt-1">
              A restauração de backup substituirá todos os dados atuais. 
              Esta ação não pode ser desfeita.
            </p>
          </div>

          <button
            onClick={restaurarBackup}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Restaurar a partir de Backup
          </button>
        </div>

        {/* Informações do Sistema */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Informações do Sistema</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Versão do Sistema</label>
              <p className="text-gray-900 dark:text-white">1.0.0</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Última Atualização</label>
              <p className="text-gray-900 dark:text-white">22/11/2024</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tamanho da Base de Dados</label>
              <p className="text-gray-900 dark:text-white">15.2 MB</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Backups Armazenados</label>
              <p className="text-gray-900 dark:text-white">3 arquivos</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            <FiSave size={18} />
            Salvar Configurações de Backup
          </button>
        </div>
      </div>
    </motion.div>
  );
};