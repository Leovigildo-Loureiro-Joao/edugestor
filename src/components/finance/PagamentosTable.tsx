import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  FiUser, FiDollarSign, FiCheckCircle, FiClock, 
  FiXCircle, FiChevronRight, FiCalendar, FiBookOpen 
} from 'react-icons/fi';
import { Student } from '../../types/aluno';

interface PagamentosTableProps {
  alunos: Student[];
  filtroMes: string;
  filtroStatus: string;
  getMesesPagosFormatados: (aluno: Student, mes: string) => string;
  getMesesPendentesFormatados: (aluno: Student, mes: string) => string;
  getMesesPagosAluno: (aluno: Student) => string[];
  getMesesPendentesAluno: (aluno: Student) => string[];
  Pendente: (aluno: Student) => boolean;
  onPagar: (aluno: Student) => void;
  onVerAluno: (alunoId: string) => void;
}

export const PagamentosTable: React.FC<PagamentosTableProps> = ({
  alunos,
  filtroMes,
  filtroStatus,
  getMesesPagosFormatados,
  getMesesPendentesFormatados,
  getMesesPagosAluno,
  getMesesPendentesAluno,
  Pendente,
  onPagar,
  onVerAluno
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Versão Mobile com Cards
  if (isMobile) {
    return (
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {alunos.map((aluno, index) => {
            const pagamentoEmDia = Pendente(aluno);
            const mesesPagos = getMesesPagosAluno(aluno);
            const mesesPendentes = getMesesPendentesAluno(aluno);
            
            return (
              <motion.div
                key={aluno.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 overflow-hidden
                  ${pagamentoEmDia 
                    ? 'border-l-green-500' 
                    : 'border-l-red-500'
                  }
                `}
              >
                {/* Cabeçalho do Card */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div 
                        onClick={() => onVerAluno(aluno.id)}
                        className={`
                          flex-shrink-0 h-14 w-14 rounded-full flex items-center justify-center cursor-pointer
                          ${pagamentoEmDia
                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                          }
                        `}
                      >
                        <FiUser size={24} />
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          {aluno.nome_completo}
                          <FiChevronRight className="text-gray-400" size={16} />
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <span>#{aluno.numero_estudante}</span>
                          <span>•</span>
                          <FiBookOpen size={10} />
                          <span>{aluno.turma_nome || 'Sem turma'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Badge de Status */}
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${
                      pagamentoEmDia
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                    }`}>
                      {pagamentoEmDia ? (
                        <>
                          <FiCheckCircle size={12} />
                          Em Dia
                        </>
                      ) : (
                        <>
                          <FiClock size={12} />
                          Pendente
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Detalhes de Pagamento */}
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                  {/* Grid de Meses */}
                  <div className="space-y-3 mb-4">
                    {/* Meses Pagos */}
                    {filtroStatus !== "Pendente" && mesesPagos.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <FiCheckCircle className="text-green-500" size={14} />
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Pagos ({mesesPagos.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {mesesPagos.slice(0, 4).map((mes, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full"
                            >
                              {mes}
                            </span>
                          ))}
                          {mesesPagos.length > 4 && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                              +{mesesPagos.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Meses Pendentes */}
                    {filtroStatus !== "Pago" && mesesPendentes.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <FiClock className="text-red-500" size={14} />
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Pendentes ({mesesPendentes.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {mesesPendentes.slice(0, 4).map((mes, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full"
                            >
                              {mes}
                            </span>
                          ))}
                          {mesesPendentes.length > 4 && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                              +{mesesPendentes.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Mês Específico (se filtrado) */}
                    {filtroMes !== 'Todos os Meses' && (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FiCalendar className="text-blue-500" size={14} />
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                            {filtroMes}: {
                              mesesPagos.includes(filtroMes.slice(0, 3)) 
                                ? '✅ Pago' 
                                : '⏳ Pendente'
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botão Pagar */}
                  <button
                    onClick={() => onPagar(aluno)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <FiDollarSign size={18} />
                    Realizar Pagamento
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {alunos.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 px-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <FiUser className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Nenhum estudante encontrado
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Tente ajustar os filtros para ver mais resultados
            </p>
          </motion.div>
        )}
      </div>
    );
  }

  // Versão Desktop (tabela original melhorada)
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Cabeçalho da Tabela */}
      <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-300 text-sm">
        <div className="col-span-3">Estudante</div>
        <div className="col-span-2">Turma</div>
        <div className="col-span-3">Meses Pagos / Pendentes</div>
        <div className="col-span-2">Status Geral</div>
        <div className="col-span-2 text-center">Ação</div>
      </div>

      {/* Lista de Estudantes */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <AnimatePresence>
          {alunos.map((aluno, index) => {
            const pagamentoEmDia = Pendente(aluno);
            
            return (
              <motion.div
                key={aluno.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.03 }}
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
              >
                {/* Estudante */}
                <div className="col-span-3">
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => onVerAluno(aluno.id)} 
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center cursor-pointer 
                        transition-colors
                        ${pagamentoEmDia
                            ? 'bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/40'
                          : 'bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/40'
                        }
                      `}
                    >
                      <FiUser className={`${
                        pagamentoEmDia ? 'text-green-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{aluno.nome_completo}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">#{aluno.numero_estudante}</div>
                    </div>
                  </div>
                </div>

                {/* Turma */}
                <div className="col-span-2 text-gray-700 dark:text-gray-300">
                  {aluno.turma_nome || 'N/A'}
                </div>

                {/* Meses Pagos/Pendentes */}
                <div className="col-span-3">
                  <div className="space-y-2">
                    {/* Meses Pagos */}
                    {filtroStatus !== "Pendente" && (
                      <div className="flex items-start gap-2">
                        <FiCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" size={14} />
                        <div className="text-sm">
                          <span className="font-medium text-green-600">Pagos:</span>{' '}
                          <span className="text-gray-700 dark:text-gray-300">
                            {getMesesPagosFormatados(aluno, filtroMes)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Meses Pendentes */}
                    {filtroStatus !== "Pago" && (
                      <div className="flex items-start gap-2">
                        <FiClock className="text-red-500 mt-0.5 flex-shrink-0" size={14} />
                        <div className="text-sm">
                          <span className="font-medium text-red-600">Pendentes:</span>{' '}
                          <span className="text-gray-700 dark:text-gray-300">
                            {getMesesPendentesFormatados(aluno, filtroMes)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contadores */}
                  <div className="flex gap-3 mt-1 text-xs">
                    {filtroStatus !== "Pendente" && (
                      <span className="text-green-600">✓ {getMesesPagosAluno(aluno).length}</span>
                    )}
                    {filtroStatus !== "Pago" && (
                      <span className="text-red-600">✗ {getMesesPendentesAluno(aluno).length}</span>
                    )}
                  </div>
                </div>

                {/* Status Geral */}
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                    pagamentoEmDia
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                  }`}>
                    {pagamentoEmDia ? (
                      <>
                        <FiCheckCircle size={14} />
                        Em Dia
                      </>
                    ) : (
                      <>
                        <FiClock size={14} />
                        Pendente
                      </>
                    )}
                  </span>
                </div>

                {/* Ação */}
                <div className="col-span-2 text-center">
                  <button
                    onClick={() => onPagar(aluno)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-green-600 text-white hover:bg-green-700"
                    title="Realizar pagamento"
                  >
                    <FiDollarSign size={16} />
                    <span>Pagar</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Mensagem quando não há resultados */}
      {alunos.length === 0 && (
        <div className="text-center py-12">
          <FiUser className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Nenhum estudante encontrado
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Tente ajustar os filtros de busca
          </p>
        </div>
      )}
    </div>
  );
};
