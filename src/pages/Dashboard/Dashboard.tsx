// pages/Dashboard/index
import React, { useState, useEffect } from 'react';
import { 
  FiUsers, 
  FiDollarSign, 
  FiUserCheck,
  FiActivity,
  FiClock,
  FiBookOpen,
  FiTarget,
  FiAlertCircle,
  FiAward,
  FiAlertTriangle,
  FiPieChart,
  FiXCircle,
  FiCalendar,
  FiBarChart2,
  FiTrendingUp,
  FiTrendingDown
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedStat } from '../../components/dashboad/AnimateStates';
import { AlunosTurmaChart } from '../../components/dashboad/AlunosTurmaChart';
import { GraficoDesempenho } from '../../components/dashboad/Strategic';
import { InadimplenciaChart } from '../../components/dashboad/InaplendenciaChart';
import { NotasChart } from '../../components/dashboad/NotasChart';
import { FluxoCaixaChart } from '../../components/dashboad/FluxoCaixaChart';
import { ProximosEventos } from '../../components/dashboad/ProximosEventos';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Tooltip } from '../../components/ui/Tooltip';
import { PageLoader } from '../../components/ui/PageLoader';
import { ErrorSection } from '../../components/ui/ErrorSection';
import { dashboardService } from '../../services/dashboard/dashboardService';
import { estrategiaService } from '../../services/database/estrategiaService';
import { profileService } from '../../services/database/profileService';
import ProfessorDashboard from './DashboadTeacher';
import { DashboardStats, EstrategiaStats, StatCard } from '../../types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [estrategiaStats, setEstrategiaStats] = useState<EstrategiaStats>({
    tarefasPendentes: 0,
    metasConcluidas: 0,
    metasAtrasadas: 0,
    proximasAtividades: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date());
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const syncTheme = () => setIsDark(root.classList.contains('dark'));
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const loadRole = async () => {
      try {
        const profile = await profileService.getLocalProfile();
        const role = profile?.role || localStorage.getItem('user_role');
        setUserRole(role);
      } catch {
        setUserRole(localStorage.getItem('user_role'));
      } finally {
        setRoleChecked(true);
      }
    };

    loadRole();
  }, []);
  

  function Reload() {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [dashboardStats, estrategiaData, metas] = await Promise.all([
          dashboardService.getDashboardStats(),
          estrategiaService.getResumoEstrategico(),
          estrategiaService.getMetas()
        ]);
        
        setStats(dashboardStats);
        setUltimaAtualizacao(new Date());
        
        setEstrategiaStats({
          ...estrategiaData,
          proximasAtividades: Array.isArray(estrategiaData.proximasAtividades) 
            ? estrategiaData.proximasAtividades 
            : []
        });
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }

  useEffect(() => {
    if (!roleChecked) return;
    if (userRole === 'teacher') {
      setLoading(false);
      return;
    }

    Reload();
    
    // Atualizar a cada 5 minutos
    const interval = setInterval(() => {
      Reload();
    }, 300000);
    
    return () => clearInterval(interval);
  }, [roleChecked, userRole]);

  const calcularChangeParaCard = (
    titulo: string, 
    valorAtual: number, 
    valorAnterior: number
  ): string => {
    if (!valorAnterior || valorAnterior === 0) {
      return `+${valorAtual} (novo)`;
    }
    
    const variacaoAbsoluta = valorAtual - valorAnterior;
    const variacaoPercentual = (variacaoAbsoluta / valorAnterior) * 100;
    const sinal = variacaoAbsoluta >= 0 ? "+" : "";

    if (Math.abs(variacaoPercentual) > 500) {
      return `${sinal}${variacaoAbsoluta}`;
    }
    
    return `${sinal}${variacaoPercentual.toFixed(1)}%`;
  };

  const calcularVariacaoMonetaria = (atual: number, anterior: number): string => {
    if (!anterior || anterior === 0) return "+0%";
    
    const variacao = atual - anterior;
    const percentual = (variacao / anterior) * 100;
    const sinal = variacao >= 0 ? "+" : "";
    
    const valorFormatado = Math.abs(variacao).toLocaleString('pt-AO', {
      style: 'currency',
      currency: 'AOA'
    });
    
    return `${sinal}${valorFormatado} (${sinal}${percentual.toFixed(1)}%)`;
  };

  const calcularVariacaoPercentualDireta = (atual: number, anterior: number): string => {
    if (!anterior) return "+0%";
    
    const variacao = atual - anterior;
    const sinal = variacao >= 0 ? "+" : "";
    return `${sinal}${variacao.toFixed(1)}%`;
  };

  if (!roleChecked || loading) {
    return <PageLoader title="Carregando dashboard" subtitle="Calculando métricas e indicadores..." />;
  }

  if (userRole === 'teacher') {
    return <ProfessorDashboard />;
  }

  if (!stats) {
    return ErrorSection("Erro ao buscar as Estatisticas", Reload);
  }

  const totalMetasEstrategia = stats.metasTotal || 0;
  const progressoEstrategia = totalMetasEstrategia > 0
    ? Math.round((estrategiaStats.metasConcluidas / totalMetasEstrategia) * 100)
    : 0;

  // Cards principais
  const statCards: StatCard[] = [
    // Acadêmico
    {
      title: "Total de Alunos",
      value: stats.totalAlunos,
      change: calcularChangeParaCard("Total de Alunos", stats.totalAlunos, stats.totalAlunosAnterior),
      color: "blue",
      icon: FiUsers,
      aux: "",
      description: "Total de alunos matriculados na instituição"
    },
    {
      title: "Alunos Ativos", 
      value: stats.alunosAtivos,
      change: calcularChangeParaCard("Alunos Ativos", stats.alunosAtivos, stats.totalAlunosAnterior),
      color: "green",
      icon: FiUserCheck,
      aux: "",
      description: "Alunos com matrícula ativa"
    },
    {
      title: "Taxa de Aprovação",
      value: stats.aprovacaoGeral || 0,
      change: calcularVariacaoPercentualDireta(stats.aprovacaoGeral || 0, stats.aprovacaoAnterior || 0),
      color: "emerald",
      icon: FiAward,
      aux: "%",
      progress: stats.aprovacaoGeral || 0,
      target: 75,
      description: "Percentual de alunos aprovados"
    },
    {
      title: "Alunos em Risco",
      value: stats.alunosRisco || 0,aux: "",
      change: calcularChangeParaCard("Alunos em Risco", stats.alunosRisco || 0, stats.alunosRiscoAnterior || 0),
      color: "orange",
      icon: FiAlertTriangle,
      alert: (stats.alunosRisco || 0) > 10,
      description: "Alunos com baixo desempenho ou frequência"
    },

    // Financeiro
    {
      title: "Saldo Atual",
      value: stats.saldoAtual || 0,
      change: calcularVariacaoMonetaria(stats.saldoAtual || 0, stats.saldoAnterior || 0),
      color: "blue",
      icon: FiDollarSign,
      aux: "kz",
      fix: true,
      description: "Entradas - Saídas"
    },
    {
      title: "Propinas Pagas",
      value: stats.propinaPagas,
      change: calcularVariacaoMonetaria(stats.propinaPagas, stats.propinaPagasAnterior),
      color: "emerald", 
      icon: FiTrendingUp,
      aux: "kz",
      fix: true,
      description: "Total de propinas recebidas no mês"
    },
    {
      title: "Propinas Pendentes",
      value: stats.propinaPendentes,
      change: calcularVariacaoMonetaria(stats.propinaPendentes, stats.propinaPendentesAnterior),
      color: "orange",
      icon: FiClock,
      aux: "kz",
      fix: true,
      description: "Valor em aberto"
    },
    {
      title: "Inadimplência",
      value: stats.inadimplencia || 0,
      change: calcularVariacaoPercentualDireta(stats.inadimplencia || 0, stats.inadimplenciaAnterior || 0),
      color: "red",
      icon: FiAlertCircle,
      aux: "%",
      alert: (stats.inadimplencia || 0) > 20,
      progress: stats.inadimplencia || 0,
      target: 10,
      description: "Percentual de alunos inadimplentes"
    },

    // Operacional
    {
      title: "Frequência Média",
      value: stats.frequencias,
      change: calcularVariacaoPercentualDireta(stats.frequencias, stats.frequenciasP),
      color: "purple",
      icon: FiActivity,
      aux: "%",
      progress: stats.frequencias,
      target: 85,
      description: "Média de presença nas aulas"
    },
    {
      title: "Aulas Ministradas",
      value: stats.aulasMinistradas,
      change: calcularVariacaoPercentualDireta(stats.aulasMinistradas, stats.aulasMinistradasP),
      color: "indigo",
      icon: FiBookOpen,
      aux: "",
      description: "Total de aulas realizadas"
    },
    {
      title: "Ocupação Média",
      value: stats.ocupacaoMedia || 0,
      change: calcularVariacaoPercentualDireta(stats.ocupacaoMedia || 0, stats.ocupacaoAnterior || 0),
      color: "purple",
      icon: FiPieChart,
      aux: "%",
      progress: stats.ocupacaoMedia || 0,
      target: 80,
      description: "Percentual médio de ocupação das turmas"
    },
    {
      title: "Aulas Canceladas",
      value: stats.aulasCanceladas || 0,
      change: calcularVariacaoPercentualDireta(stats.aulasCanceladas || 0, stats.aulasCanceladasAnterior || 0),
      color: "red",
      icon: FiXCircle,
      aux: "%",
      alert: (stats.aulasCanceladas || 0) > 10,
      description: "Percentual de aulas canceladas"
    },

    // Estratégico
    {
      title: "Visão Estratégica",
      value: `${estrategiaStats.metasConcluidas}/${totalMetasEstrategia}`,
      change: `${progressoEstrategia}%`,
      color: "red",
      icon: FiTarget,
      aux: "metas",
      progress: progressoEstrategia,
      target: 100,
      linkTo: "/estrategia",
      description: "Progresso das metas estratégicas"
    }
  ];

  // Cards de alerta (para mostrar apenas os mais críticos)
  const alertCards = statCards.filter(card => card.alert).slice(0, 2);

  return (
    <div className="space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            Dashboard
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Visão geral da instituição
          </p>
        </motion.div>
        
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500 dark:text-gray-300 hidden md:block">
            Última atualização: {ultimaAtualizacao.toLocaleString('pt-AO')}
          </span>
          <button
            onClick={Reload}
            className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Atualizar dados"
          >
            <FiBarChart2 size={18} />
          </button>
        </div>
      </div>

      {/* Alertas Críticos */}
      <AnimatePresence>
        {alertCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
          >
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 mb-2">
              <FiAlertCircle size={18} />
              <span className="font-medium">Atenção - Indicadores Críticos</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {alertCards.map(card => (
                <div key={card.title} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{card.title}</span>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">
                    {card.value} {card.aux}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid Principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.slice(0, 8).map((stat, index) => (
          <Tooltip key={stat.title} content={stat.description || stat.title}>
            <div className="relative">
              <AnimatedStat stat={stat} index={index} />
              {stat.alert && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </div>
          </Tooltip>
        ))}
      </div>

      {/* KPIs Personalizados */}
      {stats.indicadoresChave && stats.indicadoresChave.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiTarget className="text-blue-600" />
            Indicadores Chave (KPIs)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.indicadoresChave.map((kpi, index) => (
              <div key={kpi.nome} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{kpi.nome}</span>
                  <span className={`font-medium ${
                    kpi.valor >= kpi.meta ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {kpi.valor}{kpi.unidade} / {kpi.meta}{kpi.unidade}
                  </span>
                </div>
                <ProgressBar 
                  value={kpi.valor} 
                  max={kpi.meta}
                  color={kpi.cor}
                  height="sm"
                  showLabel={false}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráficos - Primeira Linha */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          
          <AlunosTurmaChart />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Desempenho Geral
            </h3>
            <Tooltip content="Média de notas por disciplina">
              <FiActivity className="text-gray-400 cursor-help" size={16} />
            </Tooltip>
          </div>
          <GraficoDesempenho tema={isDark ? 'escuro' : 'claro'} />
        </div>
      </div>

      {/* Gráficos - Segunda Linha */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Fluxo de Caixa (6 meses)
            </h3>
            <Tooltip content="Evolução de entradas, saídas e saldo">
              <FiTrendingUp className="text-gray-400 cursor-help" size={16} />
            </Tooltip>
          </div>
          <FluxoCaixaChart data={stats.fluxoCaixa || []} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Próximos Eventos
            </h3>
            <Tooltip content="Agenda dos próximos 7 dias">
              <FiCalendar className="text-gray-400 cursor-help" size={16} />
            </Tooltip>
          </div>
          <ProximosEventos
            eventos={estrategiaStats.proximasAtividades.slice(0, 5).map((atividade, index) => ({
              id: `${atividade.titulo}-${index}`,
              titulo: atividade.titulo,
              data: atividade.data_limite || new Date().toISOString(),
              tipo: 'tarefa' as const,
              descricao: `Prioridade ${atividade.prioridade}`
            }))}
          />
        </div>
      </div>

      {/* Gráficos - Terceira Linha */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Inadimplência por Turma
            </h3>
            <Tooltip content="Percentual de alunos inadimplentes por turma">
              <FiAlertCircle className="text-gray-400 cursor-help" size={16} />
            </Tooltip>
          </div>
          <InadimplenciaChart data={stats.inadimplenciaPorTurma || []} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Desempenho por Disciplina
            </h3>
            <Tooltip content="Média de notas por disciplina (Radar)">
              <FiPieChart className="text-gray-400 cursor-help" size={16} />
            </Tooltip>
          </div>
          <NotasChart data={stats.notasMedias || []} />
        </div>
      </div>

      {/* Top Alunos */}
      {stats.topAlunos && stats.topAlunos.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              🏆 Top Alunos
            </h3>
            <Tooltip content="Alunos com melhor desempenho">
              <FiAward className="text-gray-400 cursor-help" size={16} />
            </Tooltip>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.topAlunos.slice(0, 4).map((aluno, index) => (
              <motion.div
                key={aluno.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {aluno.nome}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {aluno.turma} • Média: {aluno.media.toFixed(1)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Versão Mobile: Cards compactos para mais estatísticas */}
      <div className="lg:hidden grid grid-cols-2 gap-3">
        {statCards.slice(8, 12).map((stat, index) => (
          <Tooltip key={stat.title} content={stat.description || stat.title}>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="text-blue-600" size={14} />
                <span className="text-xs text-gray-600 dark:text-gray-400">{stat.title}</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  {stat.value}{stat.aux}
                </span>
                <span className={`text-xs ${
                  stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
              </div>
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
