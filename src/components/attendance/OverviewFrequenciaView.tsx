import { FiAlertCircle, FiCheckCircle, FiClock, FiFileText, FiUsers } from "react-icons/fi";
import { motion } from "framer-motion";
import { Aula } from "../../types/aula";
import { Student } from "../../types/aluno";
import { usePagination } from "../../hooks/usePagination";
import { PaginationControls } from "../ui/PaginationControls";

type LinhaAluno = {
  alunoId: string;
  nome: string;
  numero: string;
  turma: string;
  total: number;
  presencas: number;
  faltas: number;
  faltasJustificadas: number;
  atrasos: number;
};

const pct = (value: number, total: number) => (total > 0 ? (value / total) * 100 : 0);

export const OverviewFrequenciaView = ({
  alunos,
  frequenciasFiltradas,
  filtroData,
  filtroTurma
}: {
  alunos: Student[];
  frequenciasFiltradas: Aula[];
  filtroData: string;
  filtroTurma: string;
}) => {
  const alunoMap = new Map(alunos.map((aluno) => [aluno.id, aluno]));
  const acumulador = new Map<string, LinhaAluno>();

  frequenciasFiltradas.forEach((aula) => {
    const registros = aula.registro || [];
    registros.forEach((registro) => {
      const aluno = alunoMap.get(registro.aluno_id);
      const linhaAtual =
        acumulador.get(registro.aluno_id) ||
        {
          alunoId: registro.aluno_id,
          nome: aluno?.nome_completo || "Aluno não encontrado",
          numero: String(aluno?.numero_estudante || "-"),
          turma: aluno?.turma_nome || aula.turmas?.nome_turma || "Sem turma",
          total: 0,
          presencas: 0,
          faltas: 0,
          faltasJustificadas: 0,
          atrasos: 0
        };

      linhaAtual.total += 1;
      if (registro.presente) {
        linhaAtual.presencas += 1;
        if (registro.atraso ?? (registro.participacao === false)) linhaAtual.atrasos += 1;
      } else {
        linhaAtual.faltas += 1;
        if (registro.justificativa?.trim()) linhaAtual.faltasJustificadas += 1;
      }

      acumulador.set(registro.aluno_id, linhaAtual);
    });
  });

  const linhas = Array.from(acumulador.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  const totalRegistros = linhas.reduce((acc, linha) => acc + linha.total, 0);
  const totalPresencas = linhas.reduce((acc, linha) => acc + linha.presencas, 0);
  const totalFaltas = linhas.reduce((acc, linha) => acc + linha.faltas, 0);
  const totalFaltasJustificadas = linhas.reduce((acc, linha) => acc + linha.faltasJustificadas, 0);
  const totalAtrasos = linhas.reduce((acc, linha) => acc + linha.atrasos, 0);

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
  } = usePagination<LinhaAluno>({
    items: linhas,
    initialPageSize: 10,
    resetDeps: [linhas, filtroData, filtroTurma]
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center justify-between text-gray-600 dark:text-gray-300 text-sm">
            Total Registros
            <FiUsers />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{totalRegistros}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between text-green-700 text-sm">
            Presença
            <FiCheckCircle />
          </div>
          <div className="mt-2 text-2xl font-bold text-green-800">{pct(totalPresencas, totalRegistros).toFixed(1)}%</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between text-red-700 text-sm">
            Faltas
            <FiAlertCircle />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-800">{pct(totalFaltas, totalRegistros).toFixed(1)}%</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between text-amber-700 text-sm">
            Faltas Justificadas
            <FiFileText />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-800">{pct(totalFaltasJustificadas, totalRegistros).toFixed(1)}%</div>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <div className="flex items-center justify-between text-indigo-700 text-sm">
            Atrasos
            <FiClock />
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-800">{pct(totalAtrasos, totalRegistros).toFixed(1)}%</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Overview por Aluno</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr className="text-left text-gray-700 dark:text-gray-300">
                <th className="px-4 py-3 font-semibold">Aluno</th>
                <th className="px-4 py-3 font-semibold">Turma</th>
                <th className="px-4 py-3 font-semibold">Registros</th>
                <th className="px-4 py-3 font-semibold">Presença</th>
                <th className="px-4 py-3 font-semibold">Faltas</th>
                <th className="px-4 py-3 font-semibold">Faltas Just.</th>
                <th className="px-4 py-3 font-semibold">Atrasos</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((linha) => (
                <motion.tr key={linha.alunoId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{linha.nome}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">#{linha.numero}</div>
                  </td>
                  <td className="px-4 py-3">{linha.turma}</td>
                  <td className="px-4 py-3">{linha.total}</td>
                  <td className="px-4 py-3 text-green-700 font-semibold">{pct(linha.presencas, linha.total).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-red-700 font-semibold">{pct(linha.faltas, linha.total).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-amber-700 font-semibold">{pct(linha.faltasJustificadas, linha.total).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-indigo-700 font-semibold">{pct(linha.atrasos, linha.total).toFixed(1)}%</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {linhas.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Nenhum registro encontrado com os filtros atuais.
          </div>
        )}
      </div>

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
        sizeOptions={[10, 20, 30]}
      />
    </div>
  );
};
