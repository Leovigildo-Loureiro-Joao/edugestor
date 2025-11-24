import { FiBarChart2, FiCheckSquare, FiUsers } from "react-icons/fi";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

  // Componente de Estatísticas
  export const EstatisticasView = ({estatisticas,aulasFiltradas,frequenciasFiltradas}) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Cartão de Resumo */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FiBarChart2 className="text-blue-600 text-lg" />
          </div>
          <h3 className="font-semibold text-gray-900">Resumo Geral</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Total de Aulas:</span>
            <span className="font-semibold">{estatisticas?.totalAulas || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Aulas Registradas:</span>
            <span className="font-semibold text-green-600">{estatisticas?.aulasRegistradas || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Aulas Pendentes:</span>
            <span className="font-semibold text-orange-600">{estatisticas?.aulasPendentes || 0}</span>
          </div>
        </div>
      </div>

      {/* Taxa de Registro */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <FiCheckSquare className="text-green-600 text-lg" />
          </div>
          <h3 className="font-semibold text-gray-900">Taxa de Registro</h3>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {estatisticas?.taxaRegistro?.toFixed(1) || 0}%
          </div>
          <p className="text-gray-600 text-sm">das aulas têm frequência registrada</p>
        </div>
      </div>

      {/* Taxa de Presença */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FiUsers className="text-purple-600 text-lg" />
          </div>
          <h3 className="font-semibold text-gray-900">Taxa de Presença</h3>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {estatisticas?.taxaPresenca?.toFixed(1) || 0}%
          </div>
          <p className="text-gray-600 text-sm">média de alunos presentes</p>
        </div>
      </div>

      {/* Informações Adicionais */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm md:col-span-2 lg:col-span-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{estatisticas?.totalAlunos || 0}</div>
            <div className="text-gray-600 text-sm">Total Alunos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{estatisticas?.turmasAtivas || 0}</div>
            <div className="text-gray-600 text-sm">Turmas Ativas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{aulasFiltradas.length}</div>
            <div className="text-gray-600 text-sm">Pendentes (Filtro)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{frequenciasFiltradas.length}</div>
            <div className="text-gray-600 text-sm">Registradas (Filtro)</div>
          </div>
        </div>
        <div className="h-80 mt-6 border-t-2 pt-6 border-gray-200 flex flex-col justify-center items-center gap-5">
          <h2 className="text-gray-600 font-semibold">Desempenho das presencas</h2>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                { mes: 'Set', ausencias: 12.5, presença: 85 },
                { mes: 'Out', ausencias: 13.2, presença: 78 },
                { mes: 'Nov', ausencias: 14.5, presença: 92 },
                { mes: 'Dez', ausencias: 15.1, presença: 88 },
                { mes: 'Jan', ausencias: 16.2, presença: 95 },
                { mes: 'Fev', ausencias: 15.8, presença: 90 }
                ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="mes" />
                <YAxis yAxisId="left" domain={[0, 20]} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="ausencias" 
                    stroke="#f6573b" 
                    strokeWidth={3}
                    name="Ausencias %"
                    dot={{ r: 4 }}
                />
                <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="presença" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    name="Presencas %"
                    dot={{ r: 4 }}
                />
                </LineChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
