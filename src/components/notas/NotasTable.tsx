import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiEye, FiEdit3, FiUser, FiBookOpen, FiTrendingUp, FiChevronRight, FiCheckCircle, FiAlertOctagon, FiX, FiXCircle, FiClock } from 'react-icons/fi';

import { Student } from '../../types';
import { AlunoDesempenho } from '../../types/aluno';
import { usePagination } from '../../hooks/usePagination';
import { PaginationControls } from '../ui/PaginationControls';


type SituacaoNota = 'aprovado' | 'recuperacao' | 'reprovado' | 'pendente';

interface AlunoNotas extends AlunoDesempenho {
  avaliacao: any[];
  situacao_notas: SituacaoNota;
}

interface NotasTableProps {
  alunos: AlunoNotas[];
  onVerDetalhes: (aluno: AlunoNotas) => void;
  onLancarNota: (aluno: AlunoNotas) => void;
}

const getSituacaoColor = (situacao: SituacaoNota) => {
  switch (situacao) {
    case 'aprovado':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-l-4 border-green-500';
    case 'recuperacao':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-l-4 border-yellow-500';
    case 'reprovado':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-l-4 border-red-500';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-l-4 border-gray-400';
  }
};

const getSituacaoText = (situacao: SituacaoNota) => {
  switch (situacao) {
    case 'aprovado':
      return 'Bom desempenho';
    case 'recuperacao':
      return 'Em atenção';
    case 'reprovado':
      return 'Desempenho baixo';
    default:
      return 'Sem dados';
  }
};

const getSituacaoIcon = (situacao: SituacaoNota) => {
  switch (situacao) {
    case 'aprovado':
      return FiCheckCircle;
    case 'recuperacao':
      return FiAlertOctagon;
    case 'reprovado':
      return FiXCircle;
    default:
      return FiClock;
  }
};

const getSituacaoStyles = (situacao: SituacaoNota) => {
  switch (situacao) {
    case 'aprovado':
      return {
        iconClass: 'text-green-600 dark:text-green-400',
        badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      };
    case 'recuperacao':
      return {
        iconClass: 'text-yellow-600 dark:text-yellow-400',
        badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      };
    case 'reprovado':
      return {
        iconClass: 'text-red-600 dark:text-red-400',
        badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      };
    default:
      return {
        iconClass: 'text-gray-500 dark:text-gray-400',
        badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      };
  }
};

const ProgressBar = ({ value }: { value: number }) => {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${
          width >= 75 ? 'bg-emerald-500' : width >= 50 ? 'bg-amber-500' : 'bg-red-500'
        }`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

export const NotasTable: React.FC<NotasTableProps> = ({
  alunos,
  onVerDetalhes,
  onLancarNota
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    startItem,
    endItem,
    paginatedItems
  } = usePagination<AlunoNotas>({
    items: alunos,
    initialPageSize: 10,
    resetDeps: [alunos]
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
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
          {paginatedItems.map((aluno, index) => {
            const mediaPercent = (aluno.media / 20) * 100;
            const Icon = getSituacaoIcon(aluno.situacao_notas);
            const situacaoStyles = getSituacaoStyles(aluno.situacao_notas);
            
            return (
              <motion.div
                key={aluno.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow ${getSituacaoColor(aluno.situacao_notas).split(' ')[0]}`}
                style={{ borderLeftWidth: '4px' }}
              >
                {/* Cabeçalho do Card */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`
                        flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center
                        ${aluno.media >= 10 
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                          : aluno.media >= 8
                          ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        }
                      `}>
                        <FiUser size={20} />
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          {aluno.nome_completo}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            #{aluno.numero_estudante}
                          </span>
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <FiBookOpen size={10} />
                          {aluno.turma_id || 'Sem turma'}
                        </p>
                      </div>
                    </div>

                    {/* Badge de Situação */}
                    <div className="flex flex-col items-end">
                      <span className={`text-2xl ${situacaoStyles.iconClass}`}>
                        <Icon />
                      </span>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {getSituacaoText(aluno.situacao_notas)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detalhes do Card */}
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                  {/* Grid de informações */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">Qtd. Notas</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {aluno.avaliacao.length}
                      </span>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">Média</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {aluno.media.toFixed(1)}
                      </span>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">Frequência</span>
                      <span
                        className={`text-lg font-bold ${
                          aluno.presenca >= 75
                            ? 'text-green-600 dark:text-green-400'
                            : aluno.presenca >= 60
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {aluno.presenca.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500 dark:text-gray-400">Progresso</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {mediaPercent.toFixed(1)}%
                      </span>
                    </div>
                    <ProgressBar value={mediaPercent} />
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => onVerDetalhes(aluno)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      <FiEye size={16} />
                      <span className="text-sm font-medium">Detalhes</span>
                    </button>
                    
                    <button
                      onClick={() => onLancarNota(aluno)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                    >
                      <FiEdit3 size={16} />
                      <span className="text-sm font-medium">Lançar</span>
                    </button>
                  </div>
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
            <FiTrendingUp className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum aluno encontrado</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Tente ajustar os filtros para ver mais resultados.
            </p>
          </motion.div>
        )}
        <PaginationControls
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          sizeOptions={[8, 12, 20]}
          className="mt-2 border-0 px-0 py-0"
        />
      </div>
    );
  }

  // Versão Desktop (tabela original com scroll)
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px]">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Aluno
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Turma
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Qtd Notas
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Média
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Progresso
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Frequência
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Situação
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedItems.map((aluno: AlunoNotas, index) => {
              const Icon = getSituacaoIcon(aluno.situacao_notas);
              const situacaoStyles = getSituacaoStyles(aluno.situacao_notas);

              return (
                <motion.tr
                key={aluno.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`
                      flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold
                      ${aluno.media >= 10 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : aluno.media >= 8
                        ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      }
                    `}>
                      {aluno.avaliacao.length}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{aluno.nome_completo}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">#{aluno.numero_estudante}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                  {aluno.turma_nome || 'Sem turma'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                    {aluno.avaliacao.length}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                    aluno.media >= 10 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : aluno.media >= 8
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {aluno.media.toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-3 min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={(aluno.media / 20) * 100} />
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-12">
                      {((aluno.media / 20) * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={aluno.presenca} />
                    <span
                      className={`text-xs w-12 font-semibold ${
                        aluno.presenca >= 75
                          ? 'text-green-600 dark:text-green-400'
                          : aluno.presenca >= 60
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {aluno.presenca.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg ${situacaoStyles.iconClass}`}>
                      <Icon />
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${situacaoStyles.badgeClass}`}>
                      {getSituacaoText(aluno.situacao_notas)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onVerDetalhes(aluno)}
                      className="p-2 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Ver detalhes"
                    >
                      <FiEye size={16} />
                    </button>
                    <button
                      onClick={() => onLancarNota(aluno)}
                      className="p-2 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                      title="Lançar nota"
                    >
                      <FiEdit3 size={16} />
                    </button>
                  </div>
                </td>
              </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {alunos.length === 0 && (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          Nenhum aluno encontrado com os filtros atuais.
        </div>
      )}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        startItem={startItem}
        endItem={endItem}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        sizeOptions={[10, 20, 40]}
      />
    </div>
  );
};
