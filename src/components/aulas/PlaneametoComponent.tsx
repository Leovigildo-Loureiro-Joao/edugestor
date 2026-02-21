import { FiAlertCircle, FiBarChart2, FiBook, FiCalendar, FiEdit2, FiTarget, FiTrash2, FiTrendingUp } from "react-icons/fi";
import { SelectTyped } from "../students/StudentForm";
import CalendarioMini from "./CalendarioMin";
import { useMemo, useState } from "react";
import { Aula } from "../../types/aula";

export const PlaneamentoComponent=(
    {
    setShowPlaneamento,
    planosAula,
    aulas,
    metas,
    setAulaEditando,
    setShowForm,
    handleDeletarAula
    }:{
        setShowPlaneamento:any,
    aulas:Aula[],
    metas:any[],
    planosAula:any,
    setAulaEditando:any,
    setShowForm:any,
    handleDeletarAula:any
    })=>{
        const [periodoPlaneamento, setPeriodoPlaneamento] = useState('Esta semana');

        const progressoMetas = useMemo(() => {
    const totalMeta = metas.reduce((acc, item) => acc + (item.meta || 0), 0);
    const totalAtual = metas.reduce((acc, item) => acc + (item.atual || 0), 0);
    if (!totalMeta) return 0;
    return Math.min(100, Math.round((totalAtual / totalMeta) * 100));
  }, [metas]);

        const proximasAulas = useMemo(() => {
            const hoje = new Date();
            return aulas
              .filter((aula) => {
                const data = new Date(aula.data_aula);
                return data >= hoje && !aula.deleted;
              })
              .sort((a, b) => new Date(a.data_aula).getTime() - new Date(b.data_aula).getTime());
          }, [aulas]);
        
          const periodoPlaneamentoRange = useMemo(() => {
              const hoje = new Date();
              const inicio = new Date(hoje);
              inicio.setHours(0, 0, 0, 0);
              const fim = new Date(hoje);
              fim.setHours(23, 59, 59, 999);
          
              if (periodoPlaneamento === 'Próxima semana') {
                inicio.setDate(inicio.getDate() + 7);
                fim.setDate(fim.getDate() + 13);
                return { inicio, fim };
              }
          
              if (periodoPlaneamento === 'Este mês') {
                return {
                  inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1, 0, 0, 0, 0),
                  fim: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999)
                };
              }
          
              fim.setDate(fim.getDate() + 6);
              return { inicio, fim };
            }, [periodoPlaneamento]);

const checklist = useMemo(() => {
    const hoje = new Date();
    const aulasHoje = aulas.filter((aula) => new Date(aula.data_aula).toDateString() === hoje.toDateString());
    const aulasHojeMinistradas = aulasHoje.filter((aula) => aula.status === 'ministrada').length;
    const proximas7 = aulas.filter((aula) => {
      const data = new Date(aula.data_aula);
      const fim = new Date();
      fim.setDate(fim.getDate() + 7);
      return data >= hoje && data <= fim;
    });

    return [
      {
        tarefa: 'Aulas de hoje ministradas',
        concluido: aulasHoje.length > 0 && aulasHojeMinistradas === aulasHoje.length,
        prazo: 'Hoje'
      },
      {
        tarefa: 'Planeamento dos próximos 7 dias',
        concluido: proximas7.length > 0,
        prazo: 'Esta semana'
      },
      {
        tarefa: 'Metas académicas atualizadas',
        concluido: metas.length > 0 && progressoMetas >= 50,
        prazo: 'Mês atual'
      },
      {
        tarefa: 'Planos de aula criados',
        concluido: planosAula.length > 0,
        prazo: 'Contínuo'
      }
    ];
  }, [aulas, metas, planosAula, progressoMetas]);

const planeamentoSemanal = useMemo(() => {
    return aulas
      .filter((aula) => {
        const data = new Date(aula.data_aula);
        return data >= periodoPlaneamentoRange.inicio && data <= periodoPlaneamentoRange.fim;
      })
      .sort((a, b) => new Date(a.data_aula).getTime() - new Date(b.data_aula).getTime())
      .map((aula) => ({
        id: aula.id,
        dia: new Date(aula.data_aula).toLocaleDateString('pt-AO', { weekday: 'long' }),
        data: new Date(aula.data_aula).toLocaleDateString('pt-AO'),
        horario: `${aula.hora_inicio || '--:--'} - ${aula.hora_fim || '--:--'}`,
        disciplina: aula.disciplina,
        turma: aula.turmas?.nome_turma || 'Sem turma',
        tema: aula.tema_aula || aula.conteudo_ministrado || 'Sem tema definido',
        status: aula.status
      }));
  }, [aulas, periodoPlaneamentoRange]);        

    const insights = useMemo(() => {
    const totalAulasPeriodo = planeamentoSemanal.length;
    const ministradas = planeamentoSemanal.filter((aula) => aula.status === 'ministrada').length;
    const adiada = planeamentoSemanal.filter((aula) => aula.status === 'adiada').length;
    const planeadas = planeamentoSemanal.filter((aula) => aula.status === 'planeada').length;
    const taxaExecucao = totalAulasPeriodo > 0 ? Math.round((ministradas / totalAulasPeriodo) * 100) : 0;

    return [
        {
        icone: <FiBarChart2 className="text-blue-600" />,
        titulo: 'Taxa de execução',
        descricao: `${taxaExecucao}% das aulas do período já foram ministradas`
        },
        {
        icone: <FiAlertCircle className="text-orange-600" />,
        titulo: 'Aulas adiadas',
        descricao: `${adiada} aula(s) adiada(s) no período selecionado`
        },
        {
        icone: <FiTarget className="text-green-600" />,
        titulo: 'Aulas pendentes',
        descricao: `${planeadas} aula(s) planeada(s) por executar`
        }
    ];
    }, [planeamentoSemanal]);
        

    return <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                <FiTarget className="mr-2" />
                Planeamento e Monitoramento
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowPlaneamento(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
                >
                  <FiCalendar /> Novo Planeamento
                </button>
              </div>
            </div>
            
            {/* Cards de Visão Geral */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Card 1: Próximas Aulas */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Próximas Aulas</h3>
                  <span className="text-sm text-gray-500">{periodoPlaneamento}</span>
                </div>
                <div className="space-y-3">
                  {proximasAulas.slice(0, 3).map(aula => (
                    <div key={aula.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{aula.disciplina}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{aula.turmas?.nome_turma}</div>
                        </div>
                        <span className="text-sm font-semibold">{aula.hora_inicio || '--:--'}-{aula.hora_fim || '--:--'}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                          {aula.dia_semana}
                        </span>
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                          {aula.disciplina}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 text-center text-blue-600 hover:text-blue-800 text-sm">
                  Ver todas ({proximasAulas.length})
                </button>
              </div>

              {/* Card 2: Metas do Mês */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Metas do Mês</h3>
                  <span className="text-sm text-green-600">{progressoMetas}% concluído</span>
                </div>
                <div className="space-y-4">
                  {metas.slice(0, 3).map((meta, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{meta.label}</span>
                        <span>{meta.atual}/{meta.meta}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            meta.atual >= meta.meta ? 'bg-green-600' : 
                            meta.atual >= meta.meta * 0.7 ? 'bg-yellow-500' : 
                            'bg-red-500'
                          }`}
                          style={{ width: `${(meta.atual / meta.meta) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Progresso Geral</span>
                    <span className="font-semibold">{progressoMetas}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full" style={{ width: `${progressoMetas}%` }} />
                  </div>
                </div>
              </div>

              {/* Card 3: Calendário Mini */}
              <CalendarioMini aulas={aulas} />
            </div>

            {/* Tabela de Planeamento Detalhado */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden mb-6">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Planeamento Detalhado da Semana
                </h3>
                <div className="w-44">
                  <SelectTyped
                    value={periodoPlaneamento}
                    vect={['Esta semana', 'Próxima semana', 'Este mês']}
                    onChange={(value: string) => setPeriodoPlaneamento(value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="py-3 px-4 text-left">Dia</th>
                      <th className="py-3 px-4 text-left">Horário</th>
                      <th className="py-3 px-4 text-left">Disciplina</th>
                      <th className="py-3 px-4 text-left">Turma</th>
                      <th className="py-3 px-4 text-left">Tema</th>
                      <th className="py-3 px-4 text-left">Status</th>
                      <th className="py-3 px-4 text-left">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planeamentoSemanal.map((aula) => (
                      <tr key={aula.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-3 px-4">
                          <div className="font-medium">{aula.dia}</div>
                          <div className="text-sm text-gray-500">{aula.data}</div>
                        </td>
                        <td className="py-3 px-4">{aula.horario}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
                              <FiBook className="text-blue-600" />
                            </div>
                            {aula.disciplina}
                          </div>
                        </td>
                        <td className="py-3 px-4">{aula.turma}</td>
                        <td className="py-3 px-4">
                          <div className="max-w-xs truncate" title={aula.tema}>
                            {aula.tema}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            aula.status === 'planeada' ? 'bg-blue-100 text-blue-800' :
                            aula.status === 'ministrada' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {aula.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              className="p-1 text-blue-600 hover:text-blue-800"
                              onClick={() => {
                                const aulaEncontrada = aulas.find((item) => item.id === aula.id);
                                if (!aulaEncontrada) return;
                                setAulaEditando(aulaEncontrada);
                                setShowForm(true);
                              }}
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              className="p-1 text-red-600 hover:text-red-800"
                              onClick={() => {
                                const aulaEncontrada = aulas.find((item) => item.id === aula.id);
                                if (!aulaEncontrada) return;
                                handleDeletarAula(aulaEncontrada);
                              }}
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {planeamentoSemanal.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
                          Nenhuma aula encontrada para o período selecionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Seção de Insights e Recomendações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Insights */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FiTrendingUp /> Insights Automáticos
                </h3>
                <div className="space-y-4">
                  {insights.map((insight, idx) => (
                    <div key={idx} className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        {insight.icone}
                        <div>
                          <div className="font-medium">{insight.titulo}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{insight.descricao}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Checklist de Preparação */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Checklist de Aula</h3>
                <div className="space-y-3">
                  {checklist.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={item.concluido} onChange={() => {}} />
                        <span className={item.concluido ? 'line-through text-gray-500' : ''}>
                          {item.tarefa}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">{item.prazo}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100">
                  + Adicionar nova tarefa
                </button>
              </div>
            </div>
          </div>
}
