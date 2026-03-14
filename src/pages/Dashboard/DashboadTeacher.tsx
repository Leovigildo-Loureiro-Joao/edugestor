// pages/Dashboard/ProfessorDashboard.tsx
import React, { useState, useEffect } from 'react';
import { 
  FiStar,
  FiAward,
  FiTrendingUp,
  FiTrendingDown,
  FiBookOpen,
  FiUsers,
  FiCalendar,
  FiClock,
  FiBarChart2,
  FiPieChart,
  FiActivity,
  FiCheckCircle,
  FiXCircle,
  FiUser,
  FiChevronRight,
  FiDownload,
  FiFilter,
  FiSearch,
  FiMail,
  FiPhone,
  FiMessageCircle
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { profileService } from '../../services/database/profileService';
import { useAuth } from '../../contexts/AuthContext';
import { turmaService } from '../../services/database/turmas';
import { alunosService } from '../../services/database/alunosService';
import { aulaService } from '../../services/database/aulaService';
import { avaliacaoService } from '../../services/database/avaliacao';
import { frequenciaService } from '../../services/database/frequenciaService';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line,
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import Avatar from '../../components/ui/Avatar';

// ============ DADOS REAIS BASEADOS NO PROFESSOR ============
type DashboardProfile = {
  id?: string;
  full_name?: string;
  nome?: string;
  email?: string;
  instituicao_id?: string;
  avatar_url?: string;
  photo_url?: string;
  foto_url?: string;
  foto?: string;
};

const getDistribuicaoNotas = (alunos: any[]) => [
  { name: '0-9.9 (Reprov.)', count: alunos.filter((a: any) => a.mediaFinal < 10).length },
  { name: '10-13.9 (Recup.)', count: alunos.filter((a: any) => a.mediaFinal >= 10 && a.mediaFinal < 14).length },
  { name: '14-16.9 (Bom)', count: alunos.filter((a: any) => a.mediaFinal >= 14 && a.mediaFinal < 17).length },
  { name: '17-20 (Excelente)', count: alunos.filter((a: any) => a.mediaFinal >= 17).length }
];

const buildProfessorDashboardData = async (params: {
  professorId?: string;
  profile?: DashboardProfile | null;
  teacherNameKey?: string | null;
  photoURL?: string | null;
}) => {
  const profile = params.profile
    ? params.profile
    : await profileService.getLocalProfile();

  const professorNome = profile?.full_name || profile?.nome || profile?.email || 'Professor';
  const teacherNameKey = (params.teacherNameKey || '').toLowerCase().trim();
  const instituicaoId = profile?.instituicao_id;

  const turmasTodas = await turmaService.getTurmas();
  const turmas = (turmasTodas || []).filter((t: any) => {
    if (t.deleted) return false;
    if (instituicaoId && t.instituicao_id && t.instituicao_id !== instituicaoId) return false;
    return teacherNameKey ? (t.professor || '').toLowerCase().trim() === teacherNameKey : false;
  });

  const turmaIds = turmas.map((t) => t.id);
  const aulas = turmaIds.length
    ? (await Promise.all(turmaIds.map((turmaId) => aulaService.getAulasPorTurma(turmaId)))).flat()
    : [];
  const aulaIds = aulas.map((a) => a.id);
  const frequencias = aulaIds.length
    ? (await Promise.all(aulaIds.map((aulaId) => frequenciaService.getFrequenciaPorAula(aulaId)))).flat()
    : [];
  const avaliacoesPorTurma = turmaIds.length
    ? (await Promise.all(turmaIds.map((turmaId) => avaliacaoService.getAvaliacoesByTurma(turmaId)))).flat()
    : [];
  const alunosTodos = await alunosService.getAllStudents();
  const alunos = turmaIds.length
    ? (alunosTodos || []).filter((aluno: any) => turmaIds.includes(aluno.turma_id))
    : [];

  const frequenciaPorAluno = new Map<string, { presentes: number; total: number }>();
  for (const freq of frequencias) {
    const current = frequenciaPorAluno.get(freq.aluno_id) || { presentes: 0, total: 0 };
    current.total += 1;
    if (freq.presente) current.presentes += 1;
    frequenciaPorAluno.set(freq.aluno_id, current);
  }

  const avaliacoesPorAluno = new Map<string, any[]>();
  for (const av of avaliacoesPorTurma) {
    const list = avaliacoesPorAluno.get(av.aluno_id) || [];
    list.push(av);
    avaliacoesPorAluno.set(av.aluno_id, list);
  }

  const periodoLabel: Record<string, string> = {
    '1º trimestre': '1º Trim',
    '2º trimestre': '2º Trim',
    '3º trimestre': '3º Trim'
  };

  const notasPorPeriodo = {
    '1º Trim': [] as number[],
    '2º Trim': [] as number[],
    '3º Trim': [] as number[]
  };

  for (const av of avaliacoesPorTurma) {
    const label = periodoLabel[av.periodo];
    if (label) notasPorPeriodo[label as '1º Trim' | '2º Trim' | '3º Trim'].push(av.nota);
  }

  const mediaPeriodo = (values: number[]) =>
    values.length ? Math.round((values.reduce((acc, n) => acc + n, 0) / values.length) * 10) / 10 : 0;

  const mediasPorBimestre = [
    { nome: '1º Trim', media: mediaPeriodo(notasPorPeriodo['1º Trim']) },
    { nome: '2º Trim', media: mediaPeriodo(notasPorPeriodo['2º Trim']) },
    { nome: '3º Trim', media: mediaPeriodo(notasPorPeriodo['3º Trim']) }
  ];

  const mediaGeralAvaliacoes = mediaPeriodo(avaliacoesPorTurma.map((a) => a.nota));
  mediasPorBimestre.push({ nome: 'Geral', media: mediaGeralAvaliacoes });

  const alunosPorTurma = turmas.map((turma) => {
    const alunosDaTurma = alunos.filter((a) => a.turma_id === turma.id);
    const alunosComNotas = alunosDaTurma.map((aluno) => {
      const avaliacoesAluno = avaliacoesPorAluno.get(aluno.id) || [];
      const porPeriodo: Record<string, number[]> = {
        '1º Trim': [],
        '2º Trim': [],
        '3º Trim': [],
        'Geral': []
      };

      for (const av of avaliacoesAluno) {
        const label = periodoLabel[av.periodo] || 'Geral';
        porPeriodo[label] = porPeriodo[label] || [];
        porPeriodo[label].push(av.nota);
      }

      const notas = ['1º Trim', '2º Trim', '3º Trim'].map((b) => {
        const values = porPeriodo[b] || [];
        const nota = values.length
          ? values.reduce((acc, n) => acc + n, 0) / values.length
          : 0;
        return { trimestre: b, nota: Math.round(nota * 10) / 10 };
      });

      const mediaFinal =
        notas.reduce((acc, n) => acc + n.nota, 0) / (notas.length || 1);
      notas.push({ trimestre: 'Geral', nota: Math.round(mediaFinal * 10) / 10 });

      const freq = frequenciaPorAluno.get(aluno.id);
      const presenca = freq && freq.total > 0
        ? Math.round((freq.presentes / freq.total) * 100)
        : 0;

      const status = mediaFinal >= 14 ? 'Aprovado' : mediaFinal >= 10 ? 'Recuperação' : 'Reprovado';

      return {
        id: aluno.id,
        nome: aluno.nome_completo  || 'Aluno',
        turma:aluno.turma_nome,
        notas,
        mediaFinal: Math.round(mediaFinal * 10) / 10,
        status,
        presenca
      };
    });

    alunosComNotas.sort((a, b) => b.mediaFinal - a.mediaFinal);

    return {
      nome: turma.nome_turma,
      alunos: alunosComNotas,
      media: alunosComNotas.length
        ? alunosComNotas.reduce((acc, a) => acc + a.mediaFinal, 0) / alunosComNotas.length
        : 0,
      aprovados: alunosComNotas.filter((a) => a.status === 'Aprovado').length,
      reprovados: alunosComNotas.filter((a) => a.status === 'Reprovado').length
    };
  });

  const todosAlunos = alunosPorTurma.flatMap((t: any) => t.alunos);
  const topAlunos = [...todosAlunos].sort((a, b) => b.mediaFinal - a.mediaFinal).slice(0, 5);
  const topPorTurma = alunosPorTurma.map((t: any) => ({
    turma: t.nome,
    top3: t.alunos.slice(0, 3).map((a: any, idx: number) => ({
      ...a,
      posicao: idx + 1
    }))
  }));

  const distribuicaoNotas = getDistribuicaoNotas(todosAlunos);

  const disciplinaStats = new Map<string, number[]>();
  for (const av of avaliacoesPorTurma) {
    const key = av.disciplina || 'Disciplina';
    const list = disciplinaStats.get(key) || [];
    list.push(av.nota);
    disciplinaStats.set(key, list);
  }

  const competencias = Array.from(disciplinaStats.entries())
    .map(([disciplina, notas]) => {
      const media = mediaPeriodo(notas);
      return {
        competencia: disciplina,
        valor: Math.round((media / 20) * 100)
      };
    })
    .slice(0, 6);

  const aulasRecentes = aulas
    .sort((a, b) => new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime())
    .slice(0, 5)
    .map((aula) => {
      const total = frequencias.filter((f) => f.aula_id === aula.id).length;
      const presentes = frequencias.filter((f) => f.aula_id === aula.id && f.presente).length;
      const presenca = total > 0 ? Math.round((presentes / total) * 100) : 0;
      return {
        assunto: aula.tema_aula || aula.disciplina || 'Aula',
        data: new Date(aula.data_aula).toLocaleDateString('pt-AO'),
        presenca,
        desempenho: presenca
      };
    });

  const alertas = todosAlunos
    .filter((a: any) => a.mediaFinal < 12)
    .slice(0, 3)
    .map((a: any) => ({
      nome: a.nome,
      media: a.mediaFinal,
      turma: alunosPorTurma.find((t: any) => t.alunos.includes(a))?.nome
    }));

  const totalPresencas = Array.from(frequenciaPorAluno.values()).reduce((acc, v) => acc + v.presentes, 0);
  const totalRegistros = Array.from(frequenciaPorAluno.values()).reduce((acc, v) => acc + v.total, 0);
  const presencaMedia = totalRegistros > 0 ? Math.round((totalPresencas / totalRegistros) * 100) : 0;

  const professorDisciplina = (() => {
    const stats = Array.from(disciplinaStats.entries()).sort((a, b) => b[1].length - a[1].length);
    return stats[0]?.[0] || 'Disciplina';
  })();

  return {
    professor: {
      nome: professorNome,
      disciplina: professorDisciplina,
      turmas: turmas.map((t) => t.nome_turma),
      foto: params.photoURL || null,
      email: profile?.email || '',
      telefone: ''
    },
    mediasPorBimestre,
    alunosPorTurma,
    topAlunos,
    topPorTurma,
    distribuicaoNotas,
    competencias: competencias.length > 0 ? competencias : [{ competencia: 'Desempenho', valor: 0 }],
    aulasRecentes,
    alertas,
    estatisticas: {
      totalAlunos: todosAlunos.length,
      mediaGeral: mediaGeralAvaliacoes,
      aprovados: todosAlunos.filter((a: any) => a.mediaFinal >= 14).length,
      recuperacao: todosAlunos.filter((a: any) => a.mediaFinal >= 10 && a.mediaFinal < 14).length,
      reprovados: todosAlunos.filter((a: any) => a.mediaFinal < 10).length,
      presencaMedia
    }
  };
};


// ============ COMPONENTE PRINCIPAL ============
interface ProfessorDashboardProps {
  professorId?: string;
}

const ProfessorDashboard: React.FC<ProfessorDashboardProps> = ({ 
  professorId
}) => {
  const { user, profile } = useAuth() as { user: any; profile: any };
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [turmaSelecionada, setTurmaSelecionada] = useState<string | 'todas'>('todas');
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'trimestre' | 'semestre' | 'ano'>('trimestre');
  const [visaoAluno, setVisaoAluno] = useState<'ranking' | 'turmas'>('ranking');
  const [ultimaAtualizacao] = useState(new Date());

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const teacherNameKey = (profile?.full_name || profile?.nome || profile?.email || '').toLowerCase().trim();
        const photoURL =
          (profile as any)?.avatar_url ||
          (profile as any)?.photo_url ||
          (profile as any)?.foto_url ||
          (profile as any)?.foto ||
          (user as any)?.user_metadata?.avatar_url ||
          (user as any)?.user_metadata?.picture ||
          (user as any)?.user_metadata?.picture_url ||
          (user as any)?.user_metadata?.avatar ||
          null;
        const data = await buildProfessorDashboardData({
          professorId,
          profile,
          teacherNameKey,
          photoURL
        });
        if (!alive) return;
        setDados(data);
      } catch (error) {
        console.error('Erro ao carregar dashboard do professor:', error);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadData();

    return () => {
      alive = false;
    };
  }, [professorId, profile, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">Carregando dashboard do professor...</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Buscando dados de alunos e turmas</p>
        </div>
      </div>
    );
  }

  if (!dados) return null;

  const { professor, mediasPorBimestre, alunosPorTurma, competencias, aulasRecentes, alertas, estatisticas } = dados;

  const turmasFiltradas = turmaSelecionada === 'todas'
    ? alunosPorTurma
    : alunosPorTurma.filter((t: any) => t.nome === turmaSelecionada);

  const alunosFiltrados = turmasFiltradas.flatMap((t: any) => t.alunos);

  const getNotaPeriodo = (aluno: any, periodo: 'trimestre' | 'semestre' | 'ano') => {
    const notas = aluno.notas || [];
    const get = (label: string) => notas.find((n: any) => n.trimestre === label)?.nota ?? 0;
    if (periodo === 'trimestre') return get('1º Trim') + get('2º Trim') + get('3º Trim');
    if (periodo === 'ano') return get('Geral');
    const s1 = (get('1º Trim') + get('2º Trim')) / 2;
    const s2 = (get('3º Trim') + get('Geral')) / 2;
    return Math.round(((s1 + s2) / 2) * 10) / 10;
  };

  const topAlunos = [...alunosFiltrados]
    .sort((a, b) => getNotaPeriodo(b, periodoSelecionado) - getNotaPeriodo(a, periodoSelecionado))
    .slice(0, 5)
    .map((aluno: any) => ({
      ...aluno,
      notaPeriodo: getNotaPeriodo(aluno, periodoSelecionado)
    }));

  const topPorTurma = turmasFiltradas.map((t: any) => ({
    turma: t.nome,
    top3: [...t.alunos]
      .sort((a: any, b: any) => getNotaPeriodo(b, periodoSelecionado) - getNotaPeriodo(a, periodoSelecionado))
      .slice(0, 3)
      .map((a: any, idx: number) => ({
        ...a,
        posicao: idx + 1,
        notaPeriodo: getNotaPeriodo(a, periodoSelecionado)
      }))
  }));

  const distribuicaoNotas = getDistribuicaoNotas(alunosFiltrados);
  const totalDistribuicao = distribuicaoNotas.reduce((acc, faixa) => acc + faixa.count, 0);

  const mediasPorPeriodo = (() => {
    if (periodoSelecionado === 'trimestre') {
      return mediasPorBimestre.filter((m: any) => m.nome !== 'Geral');
    }
    if (periodoSelecionado === 'ano') {
      const geral = mediasPorBimestre.find((m: any) => m.nome === 'Geral');
      return geral ? [geral] : [];
    }
    // semestre
    const t1 = mediasPorBimestre.find((m: any) => m.nome === '1º Trim')?.media || 0;
    const t2 = mediasPorBimestre.find((m: any) => m.nome === '2º Trim')?.media || 0;
    const t3 = mediasPorBimestre.find((m: any) => m.nome === '3º Trim')?.media || 0;
    const geral = mediasPorBimestre.find((m: any) => m.nome === 'Geral')?.media || t3;
    return [
      { nome: '1º Sem', media: Math.round(((t1 + t2) / 2) * 10) / 10 },
      { nome: '2º Sem', media: Math.round(((t3 + geral) / 2) * 10) / 10 }
    ];
  })();

  // Cores para os gráficos
  const CORES = {
    primaria: '#3B82F6',
    secundaria: '#10B981',
    alerta: '#EF4444',
    aviso: '#F59E0B',
    roxo: '#8B5CF6',
    rosa: '#EC4899'
  };

  const CORES_PIE = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 space-y-6">
      {/* ===== HEADER ===== */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar
              name={professor.nome}
              src={professor.foto}
              alt={professor.nome}
              size={64}
              className="border-4 border-white shadow-lg"
            />
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {professor.nome}
            </h1>
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 mt-1">
              <span className="flex items-center gap-1">
                <FiBookOpen size={14} />
                {professor.disciplina}
              </span>
              <span className="flex items-center gap-1">
                <FiUsers size={14} />
                {professor.turmas.join(' • ')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow">
            <FiMail className="text-gray-600 dark:text-gray-400" size={18} />
          </button>
          <button className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow">
            <FiPhone className="text-gray-600 dark:text-gray-400" size={18} />
          </button>
          <button className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow">
            <FiMessageCircle className="text-gray-600 dark:text-gray-400" size={18} />
          </button>
          <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center gap-2">
            <FiDownload size={16} />
            Relatório
          </button>
        </div>
      </motion.div>

      {/* ===== FILTROS ===== */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow p-4"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setVisaoAluno('ranking')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                visaoAluno === 'ranking' 
                  ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Ranking Geral
            </button>
            <button
              onClick={() => setVisaoAluno('turmas')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                visaoAluno === 'turmas' 
                  ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Por Turma
            </button>
          </div>

          <select
            value={turmaSelecionada}
            onChange={(e) => setTurmaSelecionada(e.target.value)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
          >
            <option value="todas">Todas as Turmas</option>
            {professor.turmas.map((turma: string) => (
              <option key={turma} value={turma}>{turma}</option>
            ))}
          </select>

          <select
            value={periodoSelecionado}
            onChange={(e) => setPeriodoSelecionado(e.target.value as any)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
          >
            <option value="trimestre">Por Trimestre</option>
            <option value="semestre">Por Semestre</option>
            <option value="ano">Anual</option>
          </select>

          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar aluno..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <FiFilter size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </motion.div>

      {/* ===== CARDS DE ESTATÍSTICAS ===== */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Alunos</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{estatisticas.totalAlunos}</h3>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FiUsers className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {professor.turmas.length} turmas
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Média Geral</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{estatisticas.mediaGeral.toFixed(1)}</h3>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FiAward className="text-green-600 dark:text-green-400" size={20} />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs">
            <FiTrendingUp className="text-green-500" size={12} />
            <span className="text-green-600 dark:text-green-400">+0.8 vs. anterior</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Aprovados</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{estatisticas.aprovados}</h3>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <FiCheckCircle className="text-emerald-600 dark:text-emerald-400" size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {Math.round((estatisticas.aprovados / estatisticas.totalAlunos) * 100)}% da turma
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Em Recuperação</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{estatisticas.recuperacao}</h3>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <FiActivity className="text-yellow-600 dark:text-yellow-400" size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-yellow-600">
            Precisam de atenção
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Presença Média</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{estatisticas.presencaMedia}%</h3>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FiCalendar className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Acima da média escolar
          </div>
        </div>
      </motion.div>

      {/* ===== ALERTAS ===== */}
      {alertas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 mb-3">
            <FiXCircle size={18} />
            <span className="font-medium">Alunos com baixo desempenho (média {'<'} 12)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {alertas
              .filter((alerta: any) => turmaSelecionada === 'todas' || alerta.turma === turmaSelecionada)
              .map((alerta: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between bg-white dark:bg-red-900/40 p-3 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">{alerta.nome}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{alerta.turma}</p>
                </div>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">{alerta.media.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ===== GRÁFICOS PRINCIPAIS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolução das Médias por Bimestre */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Evolução das Médias - {professor.disciplina}
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">2024</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mediasPorPeriodo}>
                <defs>
                  <linearGradient id="colorMedia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CORES.primaria} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={CORES.primaria} stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="nome" stroke="#6B7280" />
                <YAxis domain={[0, 20]} stroke="#6B7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: 'none', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value?: number) => [`${Number(value ?? 0).toFixed(1)} valores`, 'Média']}
                />
                <Area 
                  type="monotone" 
                  dataKey="media" 
                  stroke={CORES.primaria} 
                  fillOpacity={1} 
                  fill="url(#colorMedia)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição de Notas */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Distribuição de Notas
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-4 mb-4">
            Escala de notas: 0 a 20 valores.
          </p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribuicaoNotas}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {distribuicaoNotas.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CORES_PIE[index % CORES_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value?: number) => {
                    const numericValue = Number(value ?? 0);
                    const percentual = totalDistribuicao > 0 ? (numericValue * 100) / totalDistribuicao : 0;
                    return [`${numericValue} aluno(s) • ${percentual.toFixed(1)}%`, 'Quantidade'];
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES_PIE[0] }}></div>
              <span className="text-gray-600 dark:text-gray-400">0-9.9: Reprovação</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES_PIE[3] }}></div>
              <span className="text-gray-600 dark:text-gray-400">17-20: Excelente</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== TOP ALUNOS ===== */}
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FiAward className="text-yellow-500" />
            {visaoAluno === 'ranking' ? 'Top Alunos' : 'Melhores por Turma'}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Baseado na média final
          </span>
        </div>

        {visaoAluno === 'ranking' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {topAlunos.slice(0, 4).map((aluno: any, index: number) => (
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
                    {aluno.turma || 'Sem turma'} • Média: {(aluno.notaPeriodo ?? aluno.mediaFinal).toFixed(1)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {topPorTurma.map((turma: any) => (
              <div
                key={turma.turma}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <h4 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center justify-between">
                  <span>{turma.turma}</span>
                  <span className="text-xs text-gray-500">Top 3</span>
                </h4>
                <div className="space-y-2">
                  {turma.top3.map((aluno: any) => (
                    <div key={aluno.id} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs font-bold">
                        {aluno.posicao}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {aluno.nome}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Média: {(aluno.notaPeriodo ?? aluno.mediaFinal).toFixed(1)} • Presença: {aluno.presenca}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ===== GRÁFICOS SECUNDÁRIOS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar de Competências */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Desempenho por Competência
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={competencias}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis dataKey="competencia" tick={{ fill: '#6B7280', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6B7280' }} />
                <Radar 
                  name="Turma" 
                  dataKey="valor" 
                  stroke={CORES.primaria} 
                  fill={CORES.primaria} 
                  fillOpacity={0.6} 
                />
                <Tooltip 
                  formatter={(value?: number) => [`${Number(value ?? 0)}%`, 'Desempenho']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Aulas Recentes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Últimas Aulas
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">Esta semana</span>
          </div>
          <div className="space-y-4">
            {aulasRecentes.map((aula: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FiBookOpen className="text-blue-600 dark:text-blue-400" size={16} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{aula.assunto}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <FiCalendar size={12} />
                        {aula.data}
                      </span>
                      <span className="flex items-center gap-1">
                        <FiUsers size={12} />
                        Presença: {aula.presenca}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${
                    aula.desempenho >= 80 ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {aula.desempenho}%
                  </span>
                  <p className="text-xs text-gray-500">desempenho</p>
                </div>
              </motion.div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
            Ver todas as aulas
          </button>
        </div>
      </div>

      {/* ===== TABELA DE ALUNOS ===== */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Desempenho por Aluno
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Aluno
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Turma
                </th>
                {periodoSelecionado === 'trimestre' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      1º Trim
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      2º Trim
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      3º Trim
                    </th>
                  </>
                )}
                {periodoSelecionado === 'semestre' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      1º Sem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      2º Sem
                    </th>
                  </>
                )}
                {periodoSelecionado === 'ano' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Geral
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Média Final
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {turmasFiltradas.flatMap((turma: any) => 
                turma.alunos.slice(0, 10).map((aluno: any, idx: number) => (
                  <tr key={aluno.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {aluno.nome}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {turma.nome}
                    </td>
                    {periodoSelecionado === 'trimestre' && (
                      <>
                        {aluno.notas
                          .filter((n: any) => n.trimestre !== 'Geral')
                          .slice(0, 3)
                          .map((nota: any, i: number) => (
                            <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {nota.nota.toFixed(1)}
                            </td>
                          ))}
                      </>
                    )}
                    {periodoSelecionado === 'semestre' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {Math.round(((getNotaPeriodo(aluno, 'trimestre') / 3) * 10)) / 10}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {Math.round(((getNotaPeriodo(aluno, 'ano') + getNotaPeriodo(aluno, 'trimestre') / 3) / 2) * 10) / 10}
                        </td>
                      </>
                    )}
                    {periodoSelecionado === 'ano' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {getNotaPeriodo(aluno, 'ano').toFixed(1)}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {aluno.mediaFinal.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        aluno.status === 'Aprovado' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : aluno.status === 'Recuperação'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {aluno.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProfessorDashboard;
