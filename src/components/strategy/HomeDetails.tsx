// components/strategy/DashboardIntegrado.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FiCalendar, 
  FiTarget,
  FiCheckCircle,
  FiClock,
  FiUsers,
  FiTrendingUp,
  FiBarChart2,
  FiDollarSign,
  FiActivity,
  FiAward,
  FiBookOpen,
  FiHome,
  FiAlertCircle,
  FiChevronRight
} from 'react-icons/fi';
import { Meta, Tarefa } from '../../types/eventos';
import AreaChart from '../ui/AreaChart';
import db from '../../services/database/db';
import { Student } from '../../types/aluno';
import { Avaliacao } from '../../types/avaliacao';
import { Frequencia } from '../../types/frequencia';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';

interface DashboardIntegradoProps {
  metas: Meta[];
  tarefas: Tarefa[];
}

const DashboardIntegrado: React.FC<DashboardIntegradoProps> = ({ metas, tarefas }) => {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const [dadosMatriculasAnuais, setDadosMatriculasAnuais] = useState<Array<{ periodo: string; valor: number; categoria: string }>>([]);
  const [dadosSatisfacaoTrimestral, setDadosSatisfacaoTrimestral] = useState<Array<{ periodo: string; valor: number; categoria: string }>>([]);
  const [dadosFrequenciaMensal, setDadosFrequenciaMensal] = useState<Array<{ periodo: string; valor: number; categoria: string }>>([]);

  const metasConcluidas = metas.filter(m => m.status === 'concluida');
  const tarefasConcluidas = tarefas.filter(t => t.status === 'concluida' || t.concluida);

  const totalItens = metas.length + tarefas.length;
  const totalConcluidos = metasConcluidas.length + tarefasConcluidas.length;
  const progressoTotal = totalItens > 0 ? Math.round((totalConcluidos / totalItens) * 100) : 0;

  const progressoMensal = meses.map((mes, index) => {
    const metasAteMes = metasConcluidas.filter(m => {
      const data = new Date(m.updated_at || m.created_at || 0);
      return data.getMonth() <= index;
    }).length;
    const tarefasAteMes = tarefasConcluidas.filter(t => {
      const data = new Date(t.data_conclusao || t.updated_at || t.created_at || 0);
      return data.getMonth() <= index;
    }).length;
    const totalAteMes = metasAteMes + tarefasAteMes;
    const valor = totalItens > 0 ? Math.round((totalAteMes / totalItens) * 100) : 0;
    return { periodo: mes, valor, categoria: 'Progresso' };
  });

  // Estatísticas calculadas
  const estatisticas = {
    totalMetas: metas.length,
    metasConcluidas: metasConcluidas.length,
    metasAndamento: metas.filter(m => m.status === 'em_andamento').length,
    metasAtrasadas: metas.filter(m => m.status === 'atrasada').length,
    tarefasPendentes: tarefas.filter(t => !t.concluida && t.status !== 'concluida').length,
    tarefasHoje: tarefas.filter(t => {
      if (!t.data_limite) return false;
      const hoje = new Date().toDateString();
      const dataTarefa = new Date(t.data_limite).toDateString();
      return hoje === dataTarefa;
    }).length,
  };

  const hoje = new Date();
  const fimSemana = new Date();
  fimSemana.setDate(hoje.getDate() + 7);

  const compromissosSemana = tarefas
    .filter(t => t.data_limite)
    .filter(t => {
      const data = new Date(t.data_limite as string);
      return data >= hoje && data <= fimSemana;
    })
    .slice(0, 5)
    .map(t => {
      const data = new Date(t.data_limite as string);
      return {
        id: t.id,
        dia: data.toLocaleDateString('pt-AO', { weekday: 'short' }),
        titulo: t.titulo,
        hora: data.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
        tipo: t.categoria || 'tarefa'
      };
    });

  const tarefasHojeLista = tarefas.filter(t => {
    if (!t.data_limite) return false;
    return new Date(t.data_limite).toDateString() === hoje.toDateString();
  });

  // Metas prioritárias
  const metasPrioritarias = metas
    .filter(m => m.prioridade === 'alta' || m.prioridade === 'critica')
    .slice(0, 3);

  const resumoPorArea = [
    { area: 'Académica', tipo: 'academica', icon: <FiBookOpen className="text-blue-600" />,color:'blue'},
    { area: 'Financeira', tipo: 'financeira', icon: <FiDollarSign className="text-green-600" /> ,color:'green'},
    { area: 'Operacional', tipo: 'operacional', icon: <FiActivity className="text-purple-600" /> ,color:'purple'},
    { area: 'Marketing', tipo: 'marketing', icon: <FiTrendingUp className="text-orange-600" /> ,color:'orange'},
    { area: 'Infraestrutura', tipo: 'infraestrutura', icon: <FiHome className="text-teal-600" /> ,color:'teal'},
    { area: 'Qualidade', tipo: 'qualidade', icon: <FiAward className="text-indigo-600" /> ,color:'blue'},
  ].map((area) => {
    const metasArea = metas.filter(m => m.tipo === area.tipo);
    const concluidasArea = metasArea.filter(m => m.status === 'concluida').length;
    const progresso = metasArea.length > 0 ? Math.round((concluidasArea / metasArea.length) * 100) : 0;
    return {
      ...area,
      progresso,
      metas: metasArea.length
    };
  });

  const metricasAcademicas = useMemo(() => {
    const totalMatriculasAno = dadosMatriculasAnuais.reduce((acc, item) => acc + item.valor, 0);

    const satisfacaoComDados = dadosSatisfacaoTrimestral.filter((item) => item.valor > 0);
    const mediaSatisfacaoAnual = satisfacaoComDados.length > 0
      ? satisfacaoComDados.reduce((acc, item) => acc + item.valor, 0) / satisfacaoComDados.length
      : 0;
    const variacaoSatisfacao = satisfacaoComDados.length >= 2
      ? satisfacaoComDados[satisfacaoComDados.length - 1].valor - satisfacaoComDados[satisfacaoComDados.length - 2].valor
      : 0;

    const frequenciasComDados = dadosFrequenciaMensal.filter((item) => item.valor > 0);
    const mediaFrequenciaAnual = frequenciasComDados.length > 0
      ? frequenciasComDados.reduce((acc, item) => acc + item.valor, 0) / frequenciasComDados.length
      : 0;
    const variacaoFrequencia = frequenciasComDados.length >= 2
      ? frequenciasComDados[frequenciasComDados.length - 1].valor - frequenciasComDados[frequenciasComDados.length - 2].valor
      : 0;

    return {
      totalMatriculasAno,
      mediaSatisfacaoAnual,
      variacaoSatisfacao,
      mediaFrequenciaAnual,
      variacaoFrequencia
    };
  }, [dadosMatriculasAnuais, dadosSatisfacaoTrimestral, dadosFrequenciaMensal]);

  useEffect(() => {
    const carregarIndicadoresReais = async () => {
      try {
        const activeInstituicaoId = instituicaoIdValue();
        if (!activeInstituicaoId) {
          setDadosMatriculasAnuais([]);
          setDadosFrequenciaMensal([]);
          setDadosSatisfacaoTrimestral([]);
          return;
        }

        const [alunos, avaliacoes, frequencias] = await Promise.all([
          db.alunos
            .filter((a) => !a.deleted && a.instituicao_id === activeInstituicaoId)
            .toArray() as Promise<Student[]>,
          db.avaliacoes
            .filter((a) => !a.deleted && a.instituicao_id === activeInstituicaoId)
            .toArray() as Promise<Avaliacao[]>,
          db.frequencias
            .filter((f) => !f.deleted && f.instituicao_id === activeInstituicaoId)
            .toArray() as Promise<Frequencia[]>
        ]);

        const anoAtual = new Date().getFullYear();
        const normalizarData = (valor?: string) => {
          if (!valor) return null;
          const data = new Date(valor);
          return Number.isNaN(data.getTime()) ? null : data;
        };

        const resolveDataMatricula = (aluno: Student): Date | null => {
          const dataMatricula = normalizarData(aluno.data_matricula);
          const dataCriacao = normalizarData(aluno.created_at);

          if (dataMatricula && dataCriacao) {
            return dataMatricula < dataCriacao ? dataMatricula : dataCriacao;
          }
          return dataMatricula || dataCriacao;
        };

        const matriculasPorMes = Array.from({ length: 12 }, (_, mesIndex) => {
          const total = alunos.filter((aluno) => {
            const dataBase = resolveDataMatricula(aluno);
            if (!dataBase) return false;
            return dataBase.getFullYear() === anoAtual && dataBase.getMonth() === mesIndex;
          }).length;

          return { periodo: meses[mesIndex], valor: total, categoria: 'Matrículas' };
        });

        const frequenciaPorMes = Array.from({ length: 12 }, (_, mesIndex) => {
          const registrosMes = frequencias.filter((registro) => {
            const data = normalizarData(registro.data_aula);
            return !!data && data.getFullYear() === anoAtual && data.getMonth() === mesIndex;
          });

          const presentes = registrosMes.filter((registro) => registro.presente).length;
          const percentual = registrosMes.length > 0 ? (presentes / registrosMes.length) * 100 : 0;
          return { periodo: meses[mesIndex], valor: Number(percentual.toFixed(1)), categoria: 'Frequência' };
        });

        const trimestreBounds = [
          { label: '1º Tri', inicio: 0, fim: 2 },
          { label: '2º Tri', inicio: 3, fim: 5 },
          { label: '3º Tri', inicio: 6, fim: 8 },
          { label: '4º Tri', inicio: 9, fim: 11 }
        ];

        const satisfacaoPorTrimestre = trimestreBounds.map((trimestre) => {
          const avaliacoesTri = avaliacoes.filter((avaliacao) => {
            const data = normalizarData(avaliacao.data_avaliacao);
            return !!data && data.getFullYear() === anoAtual && data.getMonth() >= trimestre.inicio && data.getMonth() <= trimestre.fim;
          });

          const frequenciasTri = frequencias.filter((registro) => {
            const data = normalizarData(registro.data_aula);
            return !!data && data.getFullYear() === anoAtual && data.getMonth() >= trimestre.inicio && data.getMonth() <= trimestre.fim;
          });

          const mediaNotasEscala5 = avaliacoesTri.length > 0
            ? (avaliacoesTri.reduce((acc, avaliacao) => acc + avaliacao.nota, 0) / avaliacoesTri.length) / 4
            : 0;

          const presencasTri = frequenciasTri.filter((registro) => registro.presente).length;
          const mediaPresencaEscala5 = frequenciasTri.length > 0
            ? ((presencasTri / frequenciasTri.length) * 5)
            : 0;

          const temBase = avaliacoesTri.length > 0 || frequenciasTri.length > 0;
          const satisfacao = temBase
            ? Number((mediaNotasEscala5 * 0.7 + mediaPresencaEscala5 * 0.3).toFixed(2))
            : 0;

          return { periodo: trimestre.label, valor: satisfacao, categoria: 'Satisfação' };
        });

        setDadosMatriculasAnuais(matriculasPorMes);
        setDadosFrequenciaMensal(frequenciaPorMes);
        setDadosSatisfacaoTrimestral(satisfacaoPorTrimestre);
      } catch (error) {
        console.error('Erro ao carregar indicadores reais do dashboard:', error);
      }
    };

    const handleDbChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail?.table || ['alunos', 'avaliacoes', 'frequencias'].includes(detail.table)) {
        carregarIndicadoresReais();
      }
    };

    carregarIndicadoresReais();
    window.addEventListener('db-changed', handleDbChanged);

    return () => {
      window.removeEventListener('db-changed', handleDbChanged);
    };
  }, []);

  return (
    <div className="p-6">
      {/* Cabeçalho do Dashboard */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center">
          <FiTrendingUp className="mr-3 text-blue-600" />
          Estatísticas Gerais
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Visão completa do planejamento escolar em todos os níveis
        </p>
      </motion.div>

      
      {/* Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Visão Anual com AreaChart */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg flex items-center">
                <FiTrendingUp className="mr-2 text-blue-600" />
                Evolução Anual do Progresso
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">{new Date().getFullYear()}</span>
            </div>
            
            <AreaChart
              data={progressoMensal}
              titulo="Progresso Cumulativo"
              descricao="Evolução mensal de metas e tarefas concluídas"
              altura={250}
              cores={['#3B82F6']}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-700 mb-1">Progresso Geral</div>
                <div className="text-2xl font-bold">{progressoTotal}%</div>
                <div className="text-xs text-blue-600">Metas e tarefas concluídas</div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-700 mb-1">Metas Concluídas</div>
                <div className="text-2xl font-bold">
                  {metas.length > 0 ? Math.round((metasConcluidas.length / metas.length) * 100) : 0}%
                </div>
                <div className="text-xs text-green-600">{metasConcluidas.length} de {metas.length}</div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-700 mb-1">Tarefas Concluídas</div>
                <div className="text-2xl font-bold">
                  {tarefas.length > 0 ? Math.round((tarefasConcluidas.length / tarefas.length) * 100) : 0}%
                </div>
                <div className="text-xs text-purple-600">{tarefasConcluidas.length} de {tarefas.length}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Semana Atual */}
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 h-full">
            <h3 className="font-bold text-lg mb-6 flex items-center">
              <FiCalendar className="mr-2 text-green-600" />
              Esta Semana
            </h3>
            
            <div className="space-y-3">
              {compromissosSemana.map(compromisso => (
                <motion.div
                  key={compromisso.id}
                  whileHover={{ x: 5 }}
                  className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{compromisso.titulo}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center mt-1">
                        <FiClock className="mr-1 h-3 w-3" />
                        {compromisso.hora} • {compromisso.dia}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 mx-2 rounded bg-green-100 text-green-800">
                      {compromisso.tipo}
                    </span>
                  </div>
                </motion.div>
              ))}

              {compromissosSemana.length === 0 && (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  Sem tarefas com prazo nesta semana
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">Metas da Semana</h4>
              <div className="space-y-2">
                {metasPrioritarias.map(meta => (
                  <div key={meta.id} className="flex items-center text-sm">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      meta.status === 'concluida' ? 'bg-green-500' :
                      meta.status === 'em_andamento' ? 'bg-blue-500' :
                      meta.status === 'atrasada' ? 'bg-red-500' : 'bg-gray-500'
                    }`} />
                    <span className="truncate flex-1">{meta.titulo}</span>
                    <span className="font-bold">{meta.progresso}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Segunda Linha - Gráficos Adicionais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Matrículas Anuais */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center">
            <FiUsers className="mr-2 text-green-600" />
            Matrículas por Mês
          </h3>
          <AreaChart
            data={dadosMatriculasAnuais}
            titulo="Novas Matrículas Mensais"
            descricao="Quantidade de novas matrículas por mês"
            altura={200}
            cores={['#10B981']}
          />
          <div className="mt-4 text-center">
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{metricasAcademicas.totalMatriculasAno}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total de matrículas no ano</div>
          </div>
        </div>
        
        {/* Satisfação Trimestral */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center">
            <FiAward className="mr-2 text-orange-600" />
            Satisfação por Trimestre
          </h3>
          <AreaChart
            data={dadosSatisfacaoTrimestral}
            titulo="Índice de Satisfação"
            descricao="Composição: avaliações e presença nas aulas (escala 1-5)"
            altura={200}
            cores={['#F59E0B']}
          />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold">{metricasAcademicas.mediaSatisfacaoAnual.toFixed(2)}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Média Anual</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-bold ${metricasAcademicas.variacaoSatisfacao >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metricasAcademicas.variacaoSatisfacao >= 0 ? '+' : ''}{metricasAcademicas.variacaoSatisfacao.toFixed(2)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">vs trimestre anterior</div>
            </div>
          </div>
        </div>
        
        {/* Frequência Mensal */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center">
            <FiActivity className="mr-2 text-purple-600" />
            Frequência Mensal
          </h3>
          <AreaChart
            data={dadosFrequenciaMensal}
            titulo="Taxa de Frequência (%)"
            descricao="Percentual médio mensal de presenças"
            altura={200}
            cores={['#8B5CF6']}
          />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold">{metricasAcademicas.mediaFrequenciaAnual.toFixed(1)}%</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Média Anual</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-bold ${metricasAcademicas.variacaoFrequencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metricasAcademicas.variacaoFrequencia >= 0 ? '+' : ''}{metricasAcademicas.variacaoFrequencia.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">vs mês anterior</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hoje */}
      <div className="lg:col-span-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg flex items-center">
              <FiClock className="mr-2 text-blue-600" />
              Hoje - {new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {estatisticas.tarefasHoje} tarefas para hoje
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tarefasHojeLista.map(item => (
              <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <FiCalendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">
                      {new Date(item.data_limite as string).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Prazo</div>
                  </div>
                </div>
                <h4 className="font-semibold mt-2">{item.titulo}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.descricao || 'Sem descrição'}</p>
              </div>
            ))}
          </div>

          {tarefasHojeLista.length === 0 && (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              Sem tarefas com prazo para hoje
            </div>
          )}
          
          {/* Tarefas Urgentes de Hoje */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold mb-4 text-gray-700 dark:text-gray-300">Tarefas Urgentes</h4>
            <div className="space-y-3">
              {tarefas
                .filter(t => {
                  if (!t.data_limite) return false;
                  const hoje = new Date().toDateString();
                  const dataTarefa = new Date(t.data_limite).toDateString();
                  return hoje === dataTarefa && t.prioridade === 'alta';
                })
                .slice(0, 3)
                .map(tarefa => (
                  <div key={tarefa.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg">
                    <div className="flex items-center">
                      <FiAlertCircle className="text-red-500 mr-3" />
                      <div>
                        <div className="font-medium">{tarefa.titulo}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{tarefa.responsavel_nome}</div>
                      </div>
                    </div>
                    <button className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200">
                      Resolver
                    </button>
                  </div>
                ))}
              
              {tarefas.filter(t => {
                if (!t.data_limite) return false;
                const hoje = new Date().toDateString();
                const dataTarefa = new Date(t.data_limite).toDateString();
                return hoje === dataTarefa && t.prioridade === 'alta';
              }).length === 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  Nenhuma tarefa urgente para hoje
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resumo de Áreas */}
      <div className="mt-6 bg-gradient-to-r from-gray-50 to-white rounded-xl shadow p-6">
        <h3 className="font-bold text-lg mb-6">Resumo por Área</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {resumoPorArea.map((area, idx) => (
            <motion.div 
            initial={{y:-10,opacity:0}}
            animate={{y:0,opacity:1}}
            
            key={idx} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center">
              <div className={`inline-block p-3 rounded-full bg-${area.color}-100 mb-3`}>
                {area.icon}
              </div>
              <div className="font-bold text-2xl">{area.progresso}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{area.area}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{area.metas} metas</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardIntegrado;
