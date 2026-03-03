import { FiActivity, FiBarChart2, FiCheckSquare, FiClock, FiTrendingUp, FiUsers } from "react-icons/fi";
import { motion } from "framer-motion";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Estatisticas } from "../../pages/Attendance/Frequencia";
import { Aula } from "../../types/aula";
import { Frequencia } from "../../types/frequencia";

type PuetLinha = {
  aulaId: string;
  disciplina: string;
  turma: string;
  data: string;
  total: number;
  presencas: number;
  faltasJustificadas: number;
  faltasNaoJustificadas: number;
  tardy: number;
};

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const calcularLinhaPuet = (aula: Aula): PuetLinha => {
  const registro = (aula.registro || []) as Frequencia[];
  const presencas = registro.filter((r) => r.presente).length;
  const faltasJustificadas = registro.filter((r) => !r.presente && Boolean(r.justificativa?.trim())).length;
  const faltasNaoJustificadas = registro.filter((r) => !r.presente && !r.justificativa?.trim()).length;
  const tardy = registro.filter((r) => r.presente && (r.atraso ?? (r.participacao === false))).length;

  return {
    aulaId: aula.id,
    disciplina: aula.disciplina || "Sem disciplina",
    turma: aula.turmas?.nome_turma || "Sem turma",
    data: aula.data_aula,
    total: registro.length,
    presencas,
    faltasJustificadas,
    faltasNaoJustificadas,
    tardy
  };
};

export const EstatisticasView = ({
  estatisticas,
  aulasFiltradas,
  frequenciasFiltradas
}: {
  estatisticas: Estatisticas | null;
  aulasFiltradas: Aula[];
  frequenciasFiltradas: Aula[];
}) => {
  const linhasPuet = frequenciasFiltradas
    .filter((aula) => (aula.registro || []).length > 0)
    .map(calcularLinhaPuet);

  const totaisPuet = linhasPuet.reduce(
    (acc, linha) => {
      acc.total += linha.total;
      acc.presencas += linha.presencas;
      acc.faltasJustificadas += linha.faltasJustificadas;
      acc.faltasNaoJustificadas += linha.faltasNaoJustificadas;
      acc.tardy += linha.tardy;
      return acc;
    },
    { total: 0, presencas: 0, faltasJustificadas: 0, faltasNaoJustificadas: 0, tardy: 0 }
  );

  const taxaPresencaFiltro = totaisPuet.total > 0 ? (totaisPuet.presencas / totaisPuet.total) * 100 : 0;

  const evolucao = Array.isArray(estatisticas?.porData)
    ? estatisticas?.porData.map((item: any) => ({
        ...item,
        presenca: toNumber(item.presenca),
        ausencias: toNumber(item.ausencias)
      }))
    : [];

  const cards = [
    {
      label: "Taxa de Registro",
      value: `${(estatisticas?.taxaRegistro || 0).toFixed(1)}%`,
      icon: FiCheckSquare,
      tone: "text-blue-600 bg-blue-50 border-blue-200"
    },
    {
      label: "Taxa de Presença (Filtro)",
      value: `${taxaPresencaFiltro.toFixed(1)}%`,
      icon: FiUsers,
      tone: "text-green-600 bg-green-50 border-green-200"
    },
    {
      label: "Aulas Pendentes",
      value: `${aulasFiltradas.length}`,
      icon: FiClock,
      tone: "text-amber-600 bg-amber-50 border-amber-200"
    },
    {
      label: "Aulas Registradas (Filtro)",
      value: `${linhasPuet.length}`,
      icon: FiBarChart2,
      tone: "text-indigo-600 bg-indigo-50 border-indigo-200"
    }
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.tone}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{card.label}</span>
              <card.icon />
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
          </div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FiActivity className="text-blue-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Tabela PUET de Frequência</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Estrutura no formato planilha: Presenças, Faltas Justificadas, Faltas Não Justificadas e Tardy.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr className="text-left text-gray-700 dark:text-gray-300">
                <th className="px-4 py-3 font-semibold">Data</th>
                <th className="px-4 py-3 font-semibold">Disciplina</th>
                <th className="px-4 py-3 font-semibold">Turma</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Presenças</th>
                <th className="px-4 py-3 font-semibold">Faltas Just.</th>
                <th className="px-4 py-3 font-semibold">Faltas N/Just.</th>
                <th className="px-4 py-3 font-semibold">Tardy</th>
                <th className="px-4 py-3 font-semibold">Tx. Presença</th>
              </tr>
            </thead>
            <tbody>
              {linhasPuet.map((linha) => {
                const taxa = linha.total > 0 ? (linha.presencas / linha.total) * 100 : 0;
                return (
                  <tr key={linha.aulaId} className="border-t border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                    <td className="px-4 py-3">{new Date(linha.data).toLocaleDateString("pt-AO")}</td>
                    <td className="px-4 py-3 font-medium">{linha.disciplina}</td>
                    <td className="px-4 py-3">{linha.turma}</td>
                    <td className="px-4 py-3">{linha.total}</td>
                    <td className="px-4 py-3 text-green-600 font-semibold">{linha.presencas}</td>
                    <td className="px-4 py-3 text-amber-600 font-semibold">{linha.faltasJustificadas}</td>
                    <td className="px-4 py-3 text-red-600 font-semibold">{linha.faltasNaoJustificadas}</td>
                    <td className="px-4 py-3 text-indigo-600 font-semibold">{linha.tardy}</td>
                    <td className="px-4 py-3 font-semibold">{taxa.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-900/40 border-t border-gray-200 dark:border-gray-700">
              <tr className="font-semibold text-gray-900 dark:text-white">
                <td className="px-4 py-3" colSpan={3}>Total do filtro</td>
                <td className="px-4 py-3">{totaisPuet.total}</td>
                <td className="px-4 py-3 text-green-700">{totaisPuet.presencas}</td>
                <td className="px-4 py-3 text-amber-700">{totaisPuet.faltasJustificadas}</td>
                <td className="px-4 py-3 text-red-700">{totaisPuet.faltasNaoJustificadas}</td>
                <td className="px-4 py-3 text-indigo-700">{totaisPuet.tardy}</td>
                <td className="px-4 py-3">{taxaPresencaFiltro.toFixed(1)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {linhasPuet.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Nenhum registro encontrado com os filtros atuais.
          </div>
        )}

        <div className="px-5 pb-5 text-xs text-gray-500 dark:text-gray-400">
          Tardy usa o campo `atraso` quando disponível (com fallback para o dado legado).
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FiTrendingUp className="text-blue-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Evolução de Presenças</h3>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolucao}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="data" stroke="#6b7280" />
              <YAxis domain={[0, 100]} stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb"
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="presenca" stroke="#2563eb" strokeWidth={2.5} name="Presenças (%)" />
              <Line type="monotone" dataKey="ausencias" stroke="#ef4444" strokeWidth={2.5} name="Ausências (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};
