import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiX, FiUser, FiCalendar, FiCreditCard,
  FiDownload, FiEye, FiFileText, FiCheckCircle, FiClock,
  FiAlertCircle
} from 'react-icons/fi';

interface Pagamento {
  id: string;
  mes_referencia: string;
  data_vencimento?: string;
  data_pagamento?: string;
  valor_pago: number;
  valor_falta: number;
  estado: 'pago' | 'pendente' | 'atrasado';
  transacao_id?: string;
  forma_pagamento?: string;
  observacoes?: string;
}

interface HistoricoPagamentosModalProps {
  isOpen: boolean;
  onClose: () => void;
  aluno: {
    id: string;
    nome_completo: string;
    numero_estudante?: string;
    turma?: string;
  } | null;
  historico: Pagamento[];
  onVerPerfil?: (alunoId: string) => void;
  onExportar?: () => void;
  onVerRecibo?: (pagamentoId: string) => void;
}

export const HistoricoPagamentosModal: React.FC<HistoricoPagamentosModalProps> = ({
  isOpen,
  onClose,
  aluno,
  historico,
  onVerPerfil,
  onExportar,
  onVerRecibo
}) => {
  const getStatusConfig = (status: string) => {
    const configs = {
      pago: {
        icon: FiCheckCircle,
        label: 'Pago',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        textColor: 'text-green-700 dark:text-green-400',
        borderColor: 'border-green-200 dark:border-green-800'
      },
      pendente: {
        icon: FiClock,
        label: 'Pendente',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        textColor: 'text-yellow-700 dark:text-yellow-400',
        borderColor: 'border-yellow-200 dark:border-yellow-800'
      },
      atrasado: {
        icon: FiAlertCircle,
        label: 'Atrasado',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        textColor: 'text-red-700 dark:text-red-400',
        borderColor: 'border-red-200 dark:border-red-800'
      }
    };
    return configs[status as keyof typeof configs] || configs.pendente;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (!isOpen || !aluno) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 overflow-y-auto"
      >
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal Container */}
        <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-6xl bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <FiCreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Histórico de Pagamentos
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <FiUser className="h-3.5 w-3.5" />
                      <span className="font-medium">{aluno.nome_completo}</span>
                      {aluno.numero_estudante && (
                        <>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span>Nº {aluno.numero_estudante}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Badge de total */}
                  <div className="hidden sm:block px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Total: <span className="font-semibold text-gray-900 dark:text-white">
                        {historico.length} {historico.length === 1 ? 'pagamento' : 'pagamentos'}
                      </span>
                    </span>
                  </div>
                  
                  {/* Botões de ação header */}
                  {onExportar && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onExportar}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg hidden sm:block"
                      title="Exportar extrato"
                    >
                      <FiDownload className="h-5 w-5" />
                    </motion.button>
                  )}
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <FiX className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>
              
              {/* Info resumo mobile */}
              <div className="sm:hidden mt-3 flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Total de pagamentos
                </span>
                <span className="text-sm font-semibold bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  {historico.length} {historico.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6">
              {historico.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                    <FiFileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nenhum pagamento encontrado
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400">
                    Este aluno ainda não possui registros de pagamento.
                  </p>
                </div>
              ) : (
                <>
                  {/* Versão Desktop: Tabela */}
                  <div className="hidden md:block">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Mês
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Vencimento
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Pagamento
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Valor Pago
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Valor em Falta
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Ação
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {historico.map((pagamento, index) => {
                          const statusConfig = getStatusConfig(pagamento.estado);
                          const StatusIcon = statusConfig.icon;
                          
                          return (
                            <motion.tr
                              key={pagamento.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                                {pagamento.mes_referencia}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                {formatDate(pagamento.data_vencimento)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                {formatDate(pagamento.data_pagamento)}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                {formatCurrency(pagamento.valor_pago)}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                {formatCurrency(pagamento.valor_falta)}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                                  <StatusIcon className="h-3 w-3" />
                                  {statusConfig.label}
                                </span>
                              </td>
                             
                              <td className="px-4 py-3 text-right">
                                {pagamento.estado === 'pago' && onVerRecibo && (
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onVerRecibo(pagamento.id)}
                                    className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                    title="Ver recibo"
                                  >
                                    <FiEye className="h-4 w-4" />
                                  </motion.button>
                                )}
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Versão Mobile: Cards */}
                  <div className="md:hidden space-y-3">
                    {historico.map((pagamento, index) => {
                      const statusConfig = getStatusConfig(pagamento.estado);
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <motion.div
                          key={pagamento.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                        >
                          {/* Header do Card */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-lg ${statusConfig.bgColor}`}>
                                <StatusIcon className={`h-4 w-4 ${statusConfig.textColor}`} />
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(pagamento.valor_pago)}
                                </span>
                                <span className={`ml-2 inline-flex px-2 py-0.5 rounded-full text-xs ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                                  {statusConfig.label}
                                </span>
                              </div>
                            </div>
                            
                            {pagamento.estado === 'pago' && onVerRecibo && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onVerRecibo(pagamento.id)}
                                className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                              >
                                <FiEye className="h-4 w-4" />
                              </motion.button>
                            )}
                          </div>
                          
                          {/* Detalhes do Card */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mês</p>
                              <p className="text-gray-900 dark:text-white flex items-center gap-1">
                                <FiCalendar className="h-3 w-3 text-gray-400" />
                                {pagamento.mes_referencia}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vencimento</p>
                              <p className="text-gray-900 dark:text-white text-xs">
                                {formatDate(pagamento.data_vencimento)}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pagamento</p>
                              <p className="text-gray-900 dark:text-white">
                                {formatDate(pagamento.data_pagamento)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Em Falta</p>
                              <p className="text-gray-900 dark:text-white">
                                {formatCurrency(pagamento.valor_falta)}
                              </p>
                            </div>
                            
                          
                          </div>
                          
                          {/* Observações se houver */}
                          {pagamento.observacoes && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {pagamento.observacoes}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            
            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Resumo financeiro mobile */}
                <div className="sm:hidden">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total pago</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(
                      historico
                        .filter(p => p.estado === 'pago')
                        .reduce((acc, p) => acc + p.valor_pago, 0)
                    )}
                  </p>
                </div>
                
                {/* Ações footer */}
                <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
                  {onExportar && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onExportar}
                      className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center gap-2 order-2 sm:order-1"
                    >
                      <FiDownload className="h-4 w-4" />
                      <span>Exportar Extrato</span>
                    </motion.button>
                  )}
                  
                  {onVerPerfil && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onClose();
                        onVerPerfil(aluno.id);
                      }}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 order-1 sm:order-2"
                    >
                      <FiUser className="h-4 w-4" />
                      <span>Ver Perfil Completo</span>
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
