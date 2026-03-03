import React from 'react';
import { motion } from 'framer-motion';
import { RxPerson, RxSection, RxStar } from 'react-icons/rx';
import { AlunoDesempenho } from '../../../types/aluno';
import { usePagination } from '../../../hooks/usePagination';
import { PaginationControls } from '../../ui/PaginationControls';
import { SelectTyped } from '../../students/StudentForm';

interface TurmaAlunosSectionProps {
  alunosFiltrados: AlunoDesempenho[];
  totalAlunos: number;
  filtroTipoMatricula: 'todos' | 'regular' | 'reforco_personalizado';
  setFiltroTipoMatricula: React.Dispatch<React.SetStateAction<'todos' | 'regular' | 'reforco_personalizado'>>;
  filtroGrupoAprendizado: string;
  setFiltroGrupoAprendizado: React.Dispatch<React.SetStateAction<string>>;
  filtroNivelConhecimento: string;
  setFiltroNivelConhecimento: React.Dispatch<React.SetStateAction<string>>;
  gruposAprendizado: { value: string; label: string }[];
  niveisConhecimento: { value: string; label: string }[];
  getBadgeColor: (tipo: string) => string;
  getBadgeColorGrupo: (grupo: string) => string;
  getBadgeColorNivel: (nivel: string) => string;
  getTipoMatriculaLabel: (tipo: string) => string;
  getGrupoAprendizadoLabel: (grupo: string) => string;
  getNivelConhecimentoLabel: (nivel: string) => string;
  onSelectAluno: (aluno: AlunoDesempenho) => void;
}

export const TurmaAlunosSection: React.FC<TurmaAlunosSectionProps> = ({
  alunosFiltrados,
  totalAlunos,
  filtroTipoMatricula,
  setFiltroTipoMatricula,
  filtroGrupoAprendizado,
  setFiltroGrupoAprendizado,
  filtroNivelConhecimento,
  setFiltroNivelConhecimento,
  gruposAprendizado,
  niveisConhecimento,
  getBadgeColor,
  getBadgeColorGrupo,
  getBadgeColorNivel,
  getTipoMatriculaLabel,
  getGrupoAprendizadoLabel,
  getNivelConhecimentoLabel,
  onSelectAluno
}) => {
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
  } = usePagination<AlunoDesempenho>({
    items: alunosFiltrados,
    initialPageSize: 10,
    resetDeps: [alunosFiltrados, filtroTipoMatricula, filtroGrupoAprendizado, filtroNivelConhecimento]
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
    >
      <div className="flex flex-col  justify-between mb-4 gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Lista de Alunos ({alunosFiltrados.length}/{totalAlunos})
        </h2>

        <div className="flex gap-2 ">

          <SelectTyped
            vect={[
              { value: 'todos', label: 'Todos os tipos' },
              { value: 'regular', label: 'Turma Regular' },
              { value: 'reforco_personalizado', label: 'Reforço Personalizado' }
            ]}
            icon={RxPerson}
            value={filtroTipoMatricula}
            onChange={(e:any) => setFiltroTipoMatricula(e)}
            
          />
            

          <SelectTyped
            vect={gruposAprendizado}
            value={filtroGrupoAprendizado}
            onChange={(e:any) => setFiltroGrupoAprendizado(e)}
            icon={RxSection}
          />
          

          <SelectTyped
            vect={niveisConhecimento}
            value={filtroNivelConhecimento}
            onChange={(e:any) => setFiltroNivelConhecimento(e)}
            icon={RxStar}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aluno</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo Matrícula</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Grupo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nível</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Qtd Notas</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Média</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Presença</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Última Aval.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedItems.map((aluno) => (
              <tr key={aluno.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => onSelectAluno(aluno)}
                      className="w-8 h-8 bg-blue-100 text-blue-600 dark:text-blue-400 hover:bg-blue-400 hover:text-blue-100 transition-all cursor-pointer dark:bg-blue-900 rounded-full flex items-center justify-center"
                    >
                      <RxPerson size={14} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{aluno.nome_completo}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{aluno.numero_estudante}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColor(aluno.tipo_matricula || 'regular')}`}>
                    {getTipoMatriculaLabel(aluno.tipo_matricula || 'regular')}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {aluno.grupo_aprendizado && (
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColorGrupo(aluno.grupo_aprendizado)}`}>
                      {getGrupoAprendizadoLabel(aluno.grupo_aprendizado)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {aluno.nivel_conhecimento && (
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColorNivel(aluno.nivel_conhecimento)}`}>
                      {getNivelConhecimentoLabel(aluno.nivel_conhecimento)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{aluno.avaliacao?.length}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      aluno.media >= 17
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : aluno.media >= 14
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}
                  >
                    {aluno.media.toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{aluno.presenca}%</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{aluno.ultimaAvaliacao}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {alunosFiltrados.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Nenhum aluno encontrado com os filtros aplicados.
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
    </motion.div>
  );
};
