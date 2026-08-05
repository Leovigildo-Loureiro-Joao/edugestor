import { useMemo } from "react";
import { FiBarChart2, FiBook, FiCheckCircle, FiClock, FiDownload, FiTrendingDown, FiTrendingUp, FiUsers } from "react-icons/fi"
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { getDiaSemanaFromDate } from "../../utils/getDiaDaSemana";
import { Aula } from "../../types/aula";

export const GraficoComponent=({aulas,estatisticas}:{aulas:Aula[],estatisticas:any})=>{
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];    

      const dadosDesempenhoTurmas = useMemo(() => {
        const turmasUnicas = [...new Set(aulas.map(a => a.turmas?.nome_turma))].filter(Boolean);
        return turmasUnicas.slice(0, 5).map(turma => ({
          turma,
          aulas: aulas.filter(a => a.turmas?.nome_turma === turma).length,
          participacao: Math.floor(Math.random() * 30) + 60
        }));
      }, [aulas]);
    
      const metricasPorDisciplina = useMemo(() => {
        const disciplinasUnicas = [...new Set(aulas.map(a => a.disciplina))];
        return disciplinasUnicas.map(disciplina => ({
          disciplina,
          aulas: aulas.filter(a => a.disciplina === disciplina).length,
          participacao: Math.floor(Math.random() * 30) + 60,
          atividades: Math.floor(Math.random() * 10) + 5,
          mediaNotas: Math.random() * 5 + 10,
          tendencia: Math.random() > 0.5 ? Math.floor(Math.random() * 20) : -Math.floor(Math.random() * 10)
        }));
      }, [aulas]);

        const dadosEvolucaoSemanal = useMemo(() => {
          
          return Array.from({ length: 4 }, (_, i) => ({
            semana: `Sem ${i + 1}`,
            aulas: Math.floor(Math.random() * 20) + 10,
            participacao: Math.floor(Math.random() * 30) + 60
          }));
        }, [aulas]);


    const dadosGraficoDisciplinas = useMemo(() => {
        const disciplinasMap = new Map<string, number>();
        
        aulas.forEach(aula => {
          const count = disciplinasMap.get(aula.disciplina) || 0;
          disciplinasMap.set(aula.disciplina, count + 1);
        });
        
        return Array.from(disciplinasMap.entries()).map(([nome, count]) => ({
          nome,
          value: count
        }));
      }, [aulas]);

      
      const prepararDadosHeatmap = useMemo(() => {
        return aulas.map(aula => ({
          dia: getDiaSemanaFromDate(aula.data_aula),
          horario: aula.hora_inicio?.split(':')[0] + ':00',
          aulas: 1,
          turmas: [aula.turmas?.nome_turma].filter(Boolean)
        }));
      }, [aulas]);

      const dadosGraficoAulasPorDia = useMemo(() => {
          const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
          const contagemPorDia = [0, 0, 0, 0, 0, 0, 0];
          
          aulas.forEach(aula => {
            const data = new Date(aula.data_aula);
            const dia = data.getDay();
            contagemPorDia[dia]++;
          });
          
          return diasDaSemana.map((dia, index) => ({
            dia,
            aulas: contagemPorDia[index]
          }));
        }, [aulas]);
      
        
    return <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                  <FiBarChart2 className="mr-2" />
                  Análise e Estatísticas
                </h2>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-white dark:bg-gray-700 border rounded-lg flex items-center gap-2">
                    <FiDownload /> Exportar
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                    Período: Últimos 30 dias
                  </button>
                </div>
              </div>

              {/* KPIs Principais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Aulas Ministradas', value: estatisticas?.ministradas || 0, icon: FiCheckCircle, color: 'green' },
                  { label: 'Taxa Participação', value: estatisticas?.mediaParticipacao ? `${estatisticas.mediaParticipacao}%` : '0%', icon: FiUsers, color: 'blue' },
                  { label: 'Horas de Aula', value: estatisticas?.horasTotais ? `${estatisticas.horasTotais}h` : '0h', icon: FiClock, color: 'purple' },
                  { label: 'Alunos Presentes', value: estatisticas?.alunosPresentes || 0, icon: FiUsers, color: 'orange' }
                ].map((kpi, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">{kpi.label}</p>
                        <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                      </div>
                      <div className={`p-2 bg-${kpi.color}-100 dark:bg-${kpi.color}-900 rounded-lg`}>
                        <kpi.icon className={`text-${kpi.color}-600`} />
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {idx === 0 && 'No período atual'}
                      {idx === 1 && 'Média de participação'}
                      {idx === 2 && 'Total de horas'}
                      {idx === 3 && 'Total de presenças'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Gráficos em Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Gráfico 1: Evolução Semanal */}
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Evolução Semanal de Aulas
                    </h3>
                    <span className="text-sm text-gray-500">Últimas 4 semanas</span>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dadosEvolucaoSemanal}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="semana" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="aulas" 
                          stroke="#3B82F6" 
                          strokeWidth={3}
                          dot={{ r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="participacao" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gráfico 2: Comparativo Turmas */}
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Desempenho por Turma
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosDesempenhoTurmas}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="turma" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="aulas" fill="#3B82F6" name="Total Aulas" />
                        <Bar dataKey="participacao" fill="#10B981" name="Participação (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

               
               
              </div>

              {/* Tabela de Métricas Detalhadas */}
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Métricas Detalhadas por Disciplina
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3">Disciplina</th>
                        <th className="text-left py-3">Aulas</th>
                        <th className="text-left py-3">Participação</th>
                        <th className="text-left py-3">Atividades</th>
                        <th className="text-left py-3">Média Notas</th>
                        <th className="text-left py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metricasPorDisciplina.map((metrica, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-100 dark:hover:bg-gray-700">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
                                <FiBook className="text-blue-600" />
                              </div>
                              {metrica.disciplina}
                            </div>
                          </td>
                          <td className="py-3">{metrica.aulas}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{ width: `${metrica.participacao}%` }}
                                />
                              </div>
                              {metrica.participacao}%
                            </div>
                          </td>
                          <td className="py-3">{metrica.atividades}</td>
                          <td className="py-3">{metrica.mediaNotas.toFixed(1)}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs flex w-min flex-nowrap ${
                              metrica.tendencia > 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {metrica.tendencia > 0 ? <FiTrendingDown/> : <FiTrendingUp/>} {Math.abs(metrica.tendencia)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
}
