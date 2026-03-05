import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiX, FiUser, FiBook, FiCalendar, FiClock, 
  FiDollarSign, FiTrendingUp, FiTrendingDown, 
  FiCheckCircle, FiAlertCircle, FiEdit2,
  FiArrowLeft, FiCreditCard, FiBarChart2,
  FiUsers, FiStar, FiAward
} from 'react-icons/fi';
import { FaIdCard } from 'react-icons/fa';
import { propinaService } from '../../services/database/propinas';
import { alunosService } from '../../services/database/alunosService';
import { Student } from '../../types/aluno';
import { frequenciaService } from '../../services/database/frequenciaService';
import { Propina } from '../../types/propina';
import { FrequenciaData } from '../../types/frequencia';
import { Avaliacao } from '../../types/avaliacao';
import { avaliacaoService } from '../../services/database/avaliacao';
import { Bar, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { instituicaoService } from '../../services/database/insitituicao';
import { transacaoService } from '../../services/database';
import { PageLoader } from '../../components/ui/PageLoader';
import { usePagination } from '../../hooks/usePagination';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { useSmartBack } from '../../hooks/useSmartBack';

const StudentPage: React.FC = () => {
  const { id, seccao } = useParams<{ id: string; seccao?: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const tabSections = ['overview', 'propinas', 'frequencia', 'desempenho', 'informacoes'] as const;
  type StudentSection = (typeof tabSections)[number];
  const [activeTab, setActiveTab] = useState(0);
  const [aluno, setAluno] = useState<Student | undefined>(undefined);
  const [propinas, setPropinas] = useState<Propina[]>([]);
  const [frequencias, setFrequencias] = useState<FrequenciaData[]>([]);
  const [notas, setNotas] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [isOpen, setOpen] = useState(false);
  const [cartao, setCartao] = useState(0);

  const CartaoPagar = async () => {
    const resultadoCartao = await transacaoService.processarPagamento({
      categoria: "cartão",
      data: new Date().toISOString(),
      descricao: `Pagamento de cartão estudante - ${aluno?.nome_completo}`,
      tipo: "entrada",
      valor: cartao
    });
    if (resultadoCartao.sucesso) {
      await alunosService.updateStudent(aluno?.id || "", {
        cartao_pago: true
      });
    }
    setOpen(false);
    carregarDadosAluno();
  };

  useEffect(() => {
    if (id) {
      carregarDadosAluno();
    }
  }, [id]);

  useEffect(() => {
    const secaoAtual = seccao as StudentSection | undefined;
    if (secaoAtual && tabSections.includes(secaoAtual)) {
      setActiveTab(tabSections.indexOf(secaoAtual));
      return;
    }
    setActiveTab(0);
  }, [seccao]);

  const handleTabChange = (index: number) => {
    if (!id) return;
    const section = tabSections[index] || 'overview';
    setActiveTab(index);
    navigate(`/alunos/${id}/${section}`);
  };

  const carregarDadosAluno = async () => {
    try {
      setLoading(true);

      const alunoData = await alunosService.getStudentById(id!);
      setAluno(alunoData);

      const propinasData = await propinaService.getByAluno(id!);
      setPropinas(propinasData);

      const frequenciasData = await frequenciaService.getByAluno(id!, 30);
      setFrequencias(frequenciasData);

      const notasData = await avaliacaoService.getAvaliacoesByAluno(id!);
      setNotas(notasData);

      const cartaoData = await instituicaoService.getConfig();
      setCartao(cartaoData?.valor_cartao || 1000);

    } catch (error) {
      console.error('Erro ao carregar dados do aluno:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularEstatisticas = () => {
    const totalPropinas = propinas.length;
    const propinasPagas = propinas.filter(p => p.estado === 'pago').length;
    const totalPago = propinas.reduce((sum, p) => sum + p.valor_pago, 0);
    const totalFalta = propinas.reduce((sum, p) => sum + p.valor_falta, 0);

    const totalFrequencias = frequencias.length;
    const presencas = frequencias.filter(f => f.presente).length;
    const frequenciaPercent = totalFrequencias > 0 ? (presencas / totalFrequencias) * 100 : 0;

    const mediaNotas = notas?.estatisticas?.mediaGeral || 0;

    return {
      totalPropinas,
      propinasPagas,
      totalPago,
      totalFalta,
      frequenciaPercent,
      mediaNotas
    };
  };

  const stats = calcularEstatisticas();
  const disciplinasReforcoSelecionadas = aluno?.disciplinas_reforco || [];
  const {
    page: propinasPage,
    setPage: setPropinasPage,
    pageSize: propinasPageSize,
    setPageSize: setPropinasPageSize,
    totalItems: propinasTotalItems,
    totalPages: propinasTotalPages,
    startItem: propinasStartItem,
    endItem: propinasEndItem,
    paginatedItems: propinasPaginadas
  } = usePagination<Propina>({
    items: propinas,
    initialPageSize: 10,
    resetDeps: [propinas, activeTab]
  });

  const {
    page: frequenciasPage,
    setPage: setFrequenciasPage,
    pageSize: frequenciasPageSize,
    setPageSize: setFrequenciasPageSize,
    totalItems: frequenciasTotalItems,
    totalPages: frequenciasTotalPages,
    startItem: frequenciasStartItem,
    endItem: frequenciasEndItem,
    paginatedItems: frequenciasPaginadas
  } = usePagination<FrequenciaData>({
    items: frequencias,
    initialPageSize: 10,
    resetDeps: [frequencias, activeTab]
  });

  const notasList: Avaliacao[] = Array.isArray(notas?.avaliacoes) ? notas.avaliacoes : [];
  const {
    page: notasPage,
    setPage: setNotasPage,
    pageSize: notasPageSize,
    setPageSize: setNotasPageSize,
    totalItems: notasTotalItems,
    totalPages: notasTotalPages,
    startItem: notasStartItem,
    endItem: notasEndItem,
    paginatedItems: notasPaginadas
  } = usePagination<Avaliacao>({
    items: notasList,
    initialPageSize: 10,
    resetDeps: [notasList, activeTab]
  });

  const evolucaoReforcoPorDisciplina = useMemo(() => {
    const avaliacoesAluno: Avaliacao[] = Array.isArray(notas?.avaliacoes) ? notas.avaliacoes : [];
    if (disciplinasReforcoSelecionadas.length === 0) return [];

    const ordemPeriodo: Record<string, number> = {
      '1 trimestre': 1,
      '2 trimestre': 2,
      '3 trimestre': 3
    };

    const normalizar = (valor: string) =>
      (valor || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace('º', '')
        .trim();

    return disciplinasReforcoSelecionadas.map((disciplinaReforco) => {
      const avaliacoesDisciplina = avaliacoesAluno.filter(
        (av) => normalizar(av.disciplina) === normalizar(disciplinaReforco)
      );

      const totalAvaliacoes = avaliacoesDisciplina.length;
      const mediaAtual =
        totalAvaliacoes > 0
          ? avaliacoesDisciplina.reduce((acc, curr) => acc + curr.nota, 0) / totalAvaliacoes
          : 0;

      const trimestralMap = new Map<string, { soma: number; count: number; ordem: number }>();
      avaliacoesDisciplina.forEach((av) => {
        const periodoRaw = normalizar(av.periodo || '');
        const chavePeriodo =
          periodoRaw.includes('1') ? '1º Trimestre' : periodoRaw.includes('2') ? '2º Trimestre' : '3º Trimestre';
        const ordem = ordemPeriodo[periodoRaw] || (chavePeriodo === '1º Trimestre' ? 1 : chavePeriodo === '2º Trimestre' ? 2 : 3);

        const atual = trimestralMap.get(chavePeriodo) || { soma: 0, count: 0, ordem };
        atual.soma += av.nota;
        atual.count += 1;
        trimestralMap.set(chavePeriodo, atual);
      });

      const evolucaoTrimestral = Array.from(trimestralMap.entries())
        .map(([periodo, dados]) => ({
          periodo,
          media: dados.count > 0 ? dados.soma / dados.count : 0,
          ordem: dados.ordem
        }))
        .sort((a, b) => a.ordem - b.ordem);

      const primeiro = evolucaoTrimestral[0]?.media ?? null;
      const ultimo = evolucaoTrimestral[evolucaoTrimestral.length - 1]?.media ?? null;
      const tendencia = primeiro !== null && ultimo !== null ? ultimo - primeiro : 0;

      return {
        disciplina: disciplinaReforco,
        totalAvaliacoes,
        mediaAtual,
        tendencia,
        evolucaoTrimestral
      };
    });
  }, [disciplinasReforcoSelecionadas, notas]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
      case 'pago':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'atrasado':
      case 'desistente':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getNotaColor = (nota: number) => {
    return nota >= 10 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  if (loading) {
    return <PageLoader title="Abrindo detalhes do aluno" subtitle="Carregando perfil, propinas e desempenho..." />;
  }

  if (!aluno) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto p-8"
        >
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiAlertCircle className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Aluno não encontrado</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">O aluno que você está procurando não existe ou foi removido.</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/alunos')}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all font-medium"
          >
            Voltar para lista de alunos
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* HEADER REFINADO */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200/80 dark:border-gray-700  top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 py-4">
            {/* Informações do Aluno */}
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1, x: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => goBack('/alunos')}
                className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <FiArrowLeft className="h-5 w-5" />
              </motion.button>

              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/30">
                  {aluno.nome_completo?.charAt(0) || 'A'}
                </div>
                {aluno.estado === 'ativo' && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"
                  />
                )}
              </motion.div>

              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {aluno.nome_completo}
                  {aluno.tipo_matricula === 'reforco_personalizado' && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      Reforço
                    </span>
                  )}
                </h1>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <FiUser className="h-3.5 w-3.5" />
                    #{aluno.numero_estudante}
                  </span>
                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                  <span className="flex items-center gap-1">
                    <FiBook className="h-3.5 w-3.5" />
                    {aluno.turma_nome || 'Sem turma'}
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Ações */}
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center gap-2"
            >
              <span className={`px-4 py-2 rounded-xl text-sm font-medium ${getStatusColor(aluno.estado)}`}>
                {aluno.estado}
              </span>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/financeiro/pagamento/' + aluno.id)}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/30 flex items-center gap-2"
              >
                <FiDollarSign className="h-4 w-4" />
                Pagar Propina
              </motion.button>

              {!aluno.cartao_pago && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-xl hover:from-violet-600 hover:to-violet-700 shadow-lg shadow-violet-500/30 flex items-center gap-2"
                >
                  <FiCreditCard className="h-4 w-4" />
                  Pagar Cartão
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/alunos/editar/' + aluno.id)}
                className="p-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors"
              >
                <FiEdit2 className="h-5 w-5" />
              </motion.button>
            </motion.div>
          </div>

          {/* Mini Stats Row */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center gap-6 pb-4 text-sm"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <FiTrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Frequência</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">{stats.frequenciaPercent.toFixed(1)}%</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiAward className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Média</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">{stats.mediaNotas.toFixed(1)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <FiDollarSign className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Dívida</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">{stats.totalFalta.toLocaleString('pt-BR')} Kz</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TABS REFINADAS */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200/80 dark:border-gray-700 overflow-hidden mb-8"
        >
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40">
            {[
              { icon: FiUser, label: 'Visão Geral' },
              { icon: FiDollarSign, label: 'Propinas' },
              { icon: FiClock, label: 'Frequência' },
              { icon: FiBarChart2, label: 'Desempenho' },
              { icon: FiStar, label: 'Informações' }
            ].map((tab, index) => (
              <motion.button
                key={tab.label}
                whileHover={{ y: -1 }}
                whileTap={{ y: 0 }}
                className={`flex-1 px-3 sm:px-6 py-4 font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === index
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-gray-800'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/40'
                }`}
                onClick={() => handleTabChange(index)}
              >
                <tab.icon className={`h-4 w-4 ${activeTab === index ? 'text-blue-600' : ''}`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </motion.button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div className="p-8">
            {/* ABA 0: VISÃO GERAL */}
            {activeTab === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.1 }}
                className="space-y-8"
              >
                {/* STATS CARDS REFINADOS */}
                {/* STATS CARDS */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <motion.div
    initial={{ y: -20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.1 }}
    className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200"
  >
    <div className="text-3xl font-bold text-green-800">{stats.frequenciaPercent.toFixed(1)}%</div>
    <div className="text-green-700 font-medium mt-2">Frequência</div>
    <div className="text-green-600 text-sm mt-1">Últimos 30 dias</div>
  </motion.div>
  
  <motion.div
    initial={{ y: -20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.2 }}
    className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200"
  >
    <div className="text-3xl font-bold text-blue-800">{stats.mediaNotas.toFixed(1)}</div>
    <div className="text-blue-700 font-medium mt-2">Média Geral</div>
    <div className="text-blue-600 text-sm mt-1">{notas?.avaliacoes?.length || 0} avaliações</div>
  </motion.div>
  
  <motion.div
    initial={{ y: -20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.3 }}
    className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200"
  >
    <div className="text-3xl font-bold text-red-800">{stats.totalFalta.toLocaleString('pt-BR')} Kz</div>
    <div className="text-red-700 font-medium mt-2">Pendente</div>
    <div className="text-red-600 text-sm mt-1">Em atraso</div>
  </motion.div>
</div>

                {/* GRÁFICO DE EVOLUÇÃO */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                    <FiBarChart2 className="h-5 w-5 text-blue-600" />
                    Evolução do Desempenho
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={notas?.estatisticas?.evolucao || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="data" stroke="#6b7280" />
                        <YAxis yAxisId="left" domain={[0, 20]} stroke="#6b7280" />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#6b7280" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                        />
                        <Legend />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="media" 
                          stroke="#3B82F6" 
                          strokeWidth={3}
                          name="Nota Média"
                          dot={{ r: 4, fill: '#3B82F6' }}
                          activeDot={{ r: 6 }}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="frequencia" 
                          stroke="#10B981" 
                          strokeWidth={3}
                          name="Frequência %"
                          dot={{ r: 4, fill: '#10B981' }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* REFORÇO (se aplicável) */}
                {aluno.tipo_matricula === 'reforco_personalizado' && disciplinasReforcoSelecionadas.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 p-6 rounded-2xl border border-purple-200/80 dark:border-purple-900/40 shadow-sm"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                          <FiStar className="h-5 w-5 text-purple-600" />
                          Evolução nas Disciplinas de Reforço
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Turma: <span className="font-medium text-purple-700">{aluno.turma_nome || 'Sem turma'}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {disciplinasReforcoSelecionadas.map((disc) => (
                          <span
                            key={disc}
                            className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 text-xs font-medium"
                          >
                            {disc}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {evolucaoReforcoPorDisciplina.map((item) => {
                        const tendenciaPositiva = item.tendencia > 0.1;
                        const tendenciaNegativa = item.tendencia < -0.1;
                        const tendenciaLabel = tendenciaPositiva
                          ? `+${item.tendencia.toFixed(1)}`
                          : tendenciaNegativa
                          ? item.tendencia.toFixed(1)
                          : 'Estável';

                        return (
                          <motion.div
                            key={item.disciplina}
                            whileHover={{ y: -2 }}
                            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold text-gray-800 dark:text-white">{item.disciplina}</h4>
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                  tendenciaPositiva
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : tendenciaNegativa
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {tendenciaLabel}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {item.totalAvaliacoes} avaliação(ões)
                            </p>
                            <div className="mt-3 text-2xl font-bold text-indigo-700">
                              {item.mediaAtual.toFixed(1)}
                              <span className="text-sm font-medium text-gray-500 dark:text-gray-400"> / 20</span>
                            </div>

                            <div className="h-36 mt-3">
                              {item.evolucaoTrimestral.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={item.evolucaoTrimestral}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2ff" />
                                    <XAxis dataKey="periodo" fontSize={11} />
                                    <YAxis domain={[0, 20]} fontSize={11} />
                                    <Tooltip />
                                    <Line
                                      type="monotone"
                                      dataKey="media"
                                      stroke="#6366f1"
                                      strokeWidth={2.5}
                                      dot={{ r: 3 }}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              ) : (
                                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                                  Sem notas nesta disciplina ainda
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* PROPINAS RECENTES */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <FiDollarSign className="h-5 w-5 text-green-600" />
                    Propinas Recentes
                  </h3>
                  <div className="space-y-3">
                    {propinas.slice(0, 5).map((propina, index) => (
                      <motion.div
                        key={propina.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">{propina.mes_referencia}</span>
                          <span className={`ml-3 px-2 py-1 text-xs rounded-full ${getStatusColor(propina.estado)}`}>
                            {propina.estado}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900 dark:text-white">{propina.valor_pago.toLocaleString('pt-BR')} Kz</div>
                          {propina.valor_falta > 0 && (
                            <div className="text-red-600 text-sm">
                              Falta: {propina.valor_falta.toLocaleString('pt-BR')} Kz
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ABA 1: PROPINAS (mantido igual, apenas adicionei animações) */}
            {activeTab === 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
              >
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Mês</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Valor Pago</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Valor em Falta</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Vencimento</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {propinasPaginadas.map((propina: Propina, key: number) => (
                      <motion.tr
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: key * 0.05 }}
                        key={propina.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{propina.mes_referencia}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {propina.valor_pago.toLocaleString('pt-BR')} Kz
                        </td>
                        <td className={`px-4 py-3 text-sm font-medium ${
                          propina.valor_falta > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {propina.valor_falta.toLocaleString('pt-BR')} Kz
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(propina.estado)}`}>
                            {propina.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {new Date(propina.data_vencimento).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {propina.data_pagamento
                            ? new Date(propina.data_pagamento).toLocaleDateString('pt-BR')
                            : '-'
                          }
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                <PaginationControls
                  page={propinasPage}
                  totalPages={propinasTotalPages}
                  totalItems={propinasTotalItems}
                  startItem={propinasStartItem}
                  endItem={propinasEndItem}
                  pageSize={propinasPageSize}
                  onPageChange={setPropinasPage}
                  onPageSizeChange={(size) => {
                    setPropinasPageSize(size);
                    setPropinasPage(1);
                  }}
                  sizeOptions={[10, 20, 40]}
                />
              </motion.div>
            )}

            {/* ABA 2: FREQUÊNCIA (mantido igual, apenas animações) */}
            {activeTab === 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
              >
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Justificativa</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Aula</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Participação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {frequenciasPaginadas.map((freq, key) => (
                      <motion.tr
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: key * 0.05 }}
                        key={freq.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {new Date(freq.data_aula).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            freq.presente ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {freq.presente ? 'Presente' : 'Falta'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {freq.justificativa || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {freq.disciplina || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            freq.participacao ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {freq.participacao ? "Participou" : "Não participou"}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                <PaginationControls
                  page={frequenciasPage}
                  totalPages={frequenciasTotalPages}
                  totalItems={frequenciasTotalItems}
                  startItem={frequenciasStartItem}
                  endItem={frequenciasEndItem}
                  pageSize={frequenciasPageSize}
                  onPageChange={setFrequenciasPage}
                  onPageSizeChange={(size) => {
                    setFrequenciasPageSize(size);
                    setFrequenciasPage(1);
                  }}
                  sizeOptions={[10, 20, 40]}
                />
              </motion.div>
            )}

            {/* ABA 3: DESEMPENHO (mantido igual, apenas animações) */}
            {activeTab === 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
              >
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Disciplina</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Avaliação</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nota</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {notasPaginadas.map((nota: Avaliacao, key: number) => (
                      <motion.tr
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: key * 0.05 }}
                        key={nota.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{nota.disciplina}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{nota.tipo_avaliacao}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getNotaColor(nota.nota)}`}>
                            {nota.nota.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {new Date(nota.data_avaliacao).toLocaleDateString('pt-BR')}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                <PaginationControls
                  page={notasPage}
                  totalPages={notasTotalPages}
                  totalItems={notasTotalItems}
                  startItem={notasStartItem}
                  endItem={notasEndItem}
                  pageSize={notasPageSize}
                  onPageChange={setNotasPage}
                  onPageSizeChange={(size) => {
                    setNotasPageSize(size);
                    setNotasPage(1);
                  }}
                  sizeOptions={[10, 20, 40]}
                />
              </motion.div>
            )}

            {/* ABA 4: INFORMAÇÕES (mantido igual, apenas animações) */}
            {activeTab === 4 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gray-50 dark:bg-gray-700/40 p-6 rounded-xl"
                >
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Dados Pessoais</h3>
                  <div className="space-y-3">
                    <div>
                      <strong className="text-gray-700 dark:text-gray-300">Nome:</strong>{' '}
                      <span className="text-gray-600 dark:text-gray-400">{aluno.nome_completo}</span>
                    </div>
                    <div>
                      <strong className="text-gray-700 dark:text-gray-300">Idade:</strong>{' '}
                      <span className="text-gray-600 dark:text-gray-400">
                        {aluno.data_nascimento ? new Date().getFullYear() - new Date(aluno.data_nascimento).getFullYear() : 'Não definida'}
                      </span>
                    </div>
                    <div>
                      <strong className="text-gray-700 dark:text-gray-300">Sexo:</strong>{' '}
                      <span className="text-gray-600 dark:text-gray-400">{aluno.sexo === 'M' ? 'Masculino' : 'Feminino'}</span>
                    </div>
                    <div>
                      <strong className="text-gray-700 dark:text-gray-300">Contacto:</strong>{' '}
                      <span className="text-gray-600 dark:text-gray-400">{aluno.contacto_principal || 'Não informado'}</span>
                    </div>
                    <div>
                      <strong className="text-gray-700 dark:text-gray-300">Email:</strong>{' '}
                      <span className="text-gray-600 dark:text-gray-400">{aluno.email || 'Não informado'}</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gray-50 dark:bg-gray-700/40 p-6 rounded-xl"
                >
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Informações Acadêmicas</h3>
                  <div className="space-y-3">
                    <div>
                      <strong className="text-gray-700 dark:text-gray-300">Turma:</strong>{' '}
                      <span className="text-gray-600 dark:text-gray-400">{aluno.turma_nome || 'Não definida'}</span>
                    </div>
                    <div>
                      <strong className="text-gray-700 dark:text-gray-300">Propina:</strong>{' '}
                      <span className="text-gray-600 dark:text-gray-400">{aluno.propina}</span>
                    </div>
                    <div>
                      <strong className="text-gray-700 dark:text-gray-300">Professor:</strong>{' '}
                      <span className="text-gray-600 dark:text-gray-400">{aluno.professor || 'Não definido'}</span>
                    </div>
                    <div>
                      <strong className="text-gray-700 dark:text-gray-300">Nº Estudante:</strong>{' '}
                      <span className="text-gray-600 dark:text-gray-400">{aluno.numero_estudante}</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="lg:col-span-2 bg-gray-50 dark:bg-gray-700/40 p-6 rounded-xl"
                >
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Endereço</h3>
                  <p className="text-gray-600 dark:text-gray-400">{aluno.endereco || "Não foi disponibilizado..."}</p>
                </motion.div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* MODAL DE PAGAMENTO DO CARTÃO */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-none sm:max-w-xl h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 dark:bg-white/10 rounded-xl">
                        <FaIdCard className="h-6 w-6 text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-white">
                        Confirmar Pagamento do Cartão
                      </h2>
                    </div>
                    <button
                      onClick={() => setOpen(false)}
                      className="p-2 hover:bg-violet-800 rounded-lg transition-colors text-white/80 hover:text-white"
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
                    <FiUser className="h-5 w-5 text-violet-600" />
                    <span className="font-medium text-gray-900 dark:text-white">{aluno.nome_completo}</span>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Valor do Cartão</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {cartao.toLocaleString('pt-BR')} Kz
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Este valor será registrado nas transações da instituição
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={CartaoPagar}
                    className="px-6 py-2 bg-gradient-to-r from-violet-600 to-violet-700 text-white rounded-lg hover:from-violet-700 hover:to-violet-800 shadow-lg shadow-violet-500/30 transition-all font-medium"
                  >
                    Confirmar Pagamento
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentPage;
