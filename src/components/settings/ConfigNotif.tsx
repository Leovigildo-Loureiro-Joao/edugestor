import { motion } from 'framer-motion';
import { FiInfo } from 'react-icons/fi';

export const ConfiguracoesNotificacoes = () => {

  return (
   <motion.div 
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-6">Configurações de Notificações</h2>

      {/* Aviso - Funcionalidade será adicionada futuramente */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg p-6 flex items-start gap-4"
      >
        <FiInfo className="text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" size={24} />
        <div className="flex-1">
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
            Funcionalidade indisponível
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Esta funcionalidade ainda não está disponível no sistema. Futuramente será adicionada. 
            Fique atento às atualizações para esta e outras melhorias.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ConfiguracoesNotificacoes;
