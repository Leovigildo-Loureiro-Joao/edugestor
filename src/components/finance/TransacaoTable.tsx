import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  FiTrendingUp, FiTrendingDown, FiEdit2, FiTrash2, 
  FiDollarSign, FiBarChart, FiBriefcase, FiCreditCard, 
  FiShoppingBag, FiCoffee, FiTruck, FiHome, FiCalendar,
  FiClock, FiChevronRight
} from 'react-icons/fi';
import { Transacao } from '../../types/transacao';

interface TransacoesTableProps {
  transacoes: Transacao[];
  onEditar: (transacao: Transacao) => void;
  onExcluir: (transacao: Transacao) => void;
  mes: number;
  ano: number;
}

// Configuração das categorias com ícones e cores
const categoriasConfig = [
  { value: 'investimento', label: 'Investimento', icon: FiBarChart, cor: 'green' },
  { value: 'mensalidade', label: 'Mensalidade', icon: FiDollarSign, cor: 'blue' },
  { value: 'matricula', label: 'Matrícula', icon: FiBriefcase, cor: 'purple' },
  { value: 'cartão', label: 'Cartão', icon: FiCreditCard, cor: 'orange' },
  { value: 'material', label: 'Material', icon: FiShoppingBag, cor: 'red' },
  { value: 'alimentacao', label: 'Alimentação', icon: FiCoffee, cor: 'yellow' },
  { value: 'transporte', label: 'Transporte', icon: FiTruck, cor: 'indigo' },
  { value: 'utilidades', label: 'Utilidades', icon: FiHome, cor: 'gray' },
  { value: 'salario', label: 'Salários', icon: FiDollarSign, cor: 'pink' }
];

// Meses do ano
const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const TransacoesTable: React.FC<TransacoesTableProps> = ({
  transacoes,
  onEditar,
  onExcluir,
  mes,
  ano
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const formatarValor = (valor: number, tipo: 'entrada' | 'saida') => {
    const formatter = new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    const valorFormatado = formatter.format(valor);
    return tipo === 'entrada' ? `+${valorFormatado}` : `-${valorFormatado}`;
  };

  const getCategoriaInfo = (categoriaValue: string) => {
    return categoriasConfig.find(c => c.value === categoriaValue) || {
      label: categoriaValue,
      icon: FiDollarSign,
      cor: 'gray'
    };
  };

  const formatarData = (data: Date) => {
    return data.toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: 'short'
    });
  };

  const formatarHora = (data: Date) => {
    return data.toLocaleTimeString('pt-AO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Versão Mobile com Cards
  if (isMobile) {
    return (
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {transacoes.map((transacao, index) => {
            const data = new Date(transacao.data);
            const categoria = getCategoriaInfo(transacao.categoria);
            const Icon = categoria.icon;
            
            return (
              <motion.div
                key={transacao.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 overflow-hidden
                  ${transacao.tipo === 'entrada' 
                    ? 'border-l-green-500' 
                    : 'border-l-red-500'
                  }
                `}
              >
                {/* Cabeçalho do Card */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`
                        flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center
                        ${transacao.tipo === 'entrada'
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        }
                      `}>
                        {Icon && <Icon size={20} />}
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {categoria.label}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <FiCalendar size={10} />
                          {formatarData(data)} • {formatarHora(data)}
                        </p>
                      </div>
                    </div>

                    {/* Valor */}
                    <div className="text-right">
                      <span className={`text-lg font-bold ${
                        transacao.tipo === 'entrada'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatarValor(transacao.valor, transacao.tipo)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Descrição */}
                {transacao.descricao && (
                  <div className="px-4 pb-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {transacao.descricao}
                    </p>
                  </div>
                )}

                {/* Footer com Ações */}
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ID: #{transacao.id.slice(-6)}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEditar(transacao)}
                        className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Editar transação"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      
                      <button
                        onClick={() => onExcluir(transacao)}
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Excluir transação"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {transacoes.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 px-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <FiDollarSign className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Nenhuma transação encontrada
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {meses[mes - 1]} de {ano} • Tente ajustar os filtros
            </p>
          </motion.div>
        )}
      </div>
    );
  }

  // Versão Desktop (tabela original com scroll)
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Header da Tabela */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Transações ({transacoes.length})
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {meses[mes - 1]} de {ano}
            </p>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50">
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Data
              </th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tipo
              </th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Categoria
              </th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Descrição
              </th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Valor
              </th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {transacoes.map((transacao) => {
              const data = new Date(transacao.data);
              const categoria = getCategoriaInfo(transacao.categoria);
              const Icon = categoria.icon;
              
              return (
                <motion.tr
                  key={transacao.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <FiCalendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {data.toLocaleDateString('pt-AO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <FiClock className="h-3 w-3" />
                          {data.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${
                      transacao.tipo === 'entrada'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                    }`}>
                      {transacao.tipo === 'entrada' ? (
                        <>
                          <FiTrendingUp className="h-3 w-3" />
                          Investimento
                        </>
                      ) : (
                        <>
                          <FiTrendingDown className="h-3 w-3" />
                          Despesa
                        </>
                      )}
                    </span>
                  </td>
                  
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {Icon && (
                        <div className={`p-1.5 rounded-lg ${
                          transacao.tipo === 'entrada' 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          <Icon className={`h-4 w-4 ${
                            transacao.tipo === 'entrada' 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`} />
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {categoria.label}
                      </span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="text-sm text-gray-900 dark:text-white max-w-md truncate">
                      {transacao.descricao || '—'}
                    </div>
                  </td>
                  
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className={`text-base font-bold ${
                      transacao.tipo === 'entrada'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatarValor(transacao.valor, transacao.tipo)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      AOA
                    </div>
                  </td>
                  
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEditar(transacao)}
                        className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <FiEdit2 className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => onExcluir(transacao)}
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {transacoes.length === 0 && (
        <div className="text-center py-12">
          <FiDollarSign className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Nenhuma transação encontrada
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Tente ajustar os filtros para encontrar mais resultados
          </p>
        </div>
      )}
    </div>
  );
};