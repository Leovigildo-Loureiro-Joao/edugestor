// src/pages/Turmas/TurmaDetails
import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiArrowLeft, 
  FiEdit, 
  FiUsers, 
  FiCalendar, 
  FiStar, 
  FiClock,
  FiBook,
  FiBarChart2,
  FiActivity,
  FiTarget,
  FiPlus,
  FiTrash,
  FiCheckCircle,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiExternalLink
} from 'react-icons/fi';
import { 
  FaCrown, 
  FaMedal, 
  FaAward as FaAwardSolid,
  FaChalkboardTeacher,
  FaMoneyBill
} from 'react-icons/fa';
import { 
  RxPerson 
} from 'react-icons/rx';
import { turmaService } from '../../services/database/turmas';
import { alunosService } from '../../services/database/alunosService';
import { HorarioAula, HorarioAulaForm, Turma } from '../../types/turma';
const HorarioModal = lazy(() => import('../../components/turmas/HorarioModal'));
const StudentModal = lazy(() =>
  import('../../components/students/StudentModal').then((module) => ({ default: module.StudentModal }))
);
import { aulaService, frequenciaService } from '../../services/database';
import { Aula, AulaFormData, PlanoAula } from '../../types/aula';
const AulaForm = lazy(() =>
  import('../../components/aulas/AulaForm').then((module) => ({ default: module.AulaForm }))
);
import { AulaStatus } from '../../components/aulas/AulaCard-min';
const ModalFrequencia = lazy(() =>
  import('../../components/attendance/FrequeciaModal').then((module) => ({ default: module.ModalFrequencia }))
);
import { RegistroFrequenciaLote } from '../../types/frequencia';
import { useConfirmModal } from '../../components/ui/ComfirmModal';
import { useAlert } from '../../components/ui/AlertBadge';
import HorarioCellMenu from '../../components/turmas/HorarioCellMenu';
import { planoAulaService } from '../../services/database/planoAulasService';
import { AlunoDesempenho } from '../../types/aluno';
import { PageLoader } from '../../components/ui/PageLoader';
import { profileService } from '../../services/database/profileService';
import { useSmartBack } from '../../hooks/useSmartBack';
const TurmaAlunosSection = lazy(() =>
  import('../../components/turmas/details/TurmaAlunosSection').then((module) => ({ default: module.TurmaAlunosSection }))
);
const TurmaAulasSection = lazy(() =>
  import('../../components/turmas/details/TurmaAulasSection').then((module) => ({ default: module.TurmaAulasSection }))
);
const MotionLink = motion(Link);

interface TurmaDetailsData extends Turma {
  alunos: AlunoDesempenho[];
  horarios: HorarioAula[];
  vagas?: number;
}
interface PlanoComAulasTurma extends PlanoAula {
  aulas_turma: Aula[];
}

const TurmaDetails = () => {
  const [compactar,setCompactar] = useState(false);
  const { id, seccao } = useParams<{ id: string; seccao?: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const secoesTurma = ['overview', 'alunos', 'aulas', 'horario'] as const;
  type SecaoTurma = (typeof secoesTurma)[number];
  const [turma, setTurma] = useState<TurmaDetailsData | null>(null);
  const [aulaSelect, setAulaSelect] = useState<Aula | null>(null);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<SecaoTurma>('overview');
  const [filtroTipoMatricula, setFiltroTipoMatricula] = useState<'todos' | 'regular' | 'reforco_personalizado'>('todos');
  const [filtroGrupoAprendizado, setFiltroGrupoAprendizado] = useState<string>('todos');
  const [filtroNivelConhecimento, setFiltroNivelConhecimento] = useState<string>('todos');
  const [horarioEditando, setHorarioEditando] = useState<HorarioAula | null>(null);
  const [isHorarioModalOpen, setIsHorarioModalOpen] = useState(false);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoDesempenho|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [loadingAulas, setLoadingAulas] = useState(false);
  const [alunosLoaded, setAlunosLoaded] = useState(false);
  const [aulasLoaded, setAulasLoaded] = useState(false);
  const [showPlanoModal, setShowPlanoModal] = useState(false);
  const [loadingPlanos, setLoadingPlanos] = useState(false);
  const [planosTurma, setPlanosTurma] = useState<PlanoComAulasTurma[]>([]);
  const [quickAddTurma, setQuickAddTurma] = useState('');
  const [quickAddData, setQuickAddData] = useState(new Date().toISOString().split('T')[0]);
  const [aulaEditando, setAulaEditando] = useState<Aula | null>(null);
  const [canManageTurmas, setCanManageTurmas] = useState(true);
  const { confirm, ModalComponent } = useConfirmModal();
  const { showAlert } = useAlert(); 

  // Grupos de aprendizado - alinhado com StudentForm
  const gruposAprendizado = [
    { value: 'gama', label: 'Gama - Aprendizado Rápido' },
    { value: 'beta', label: 'Beta - Ritmo Moderado' },
    { value: 'alfa', label: 'Alfa - Necessita mais tempo' }
  ];

  // Níveis de conhecimento - alinhado com StudentForm
  const niveisConhecimento = [
    { value: 'A', label: 'A - Excelente' },
    { value: 'B', label: 'B - Bom' },
    { value: 'C', label: 'C - Precisa melhorar' }
  ];

  const handleEditarHorario = (horario: HorarioAula) => {
    setHorarioEditando(horario);
    setIsHorarioModalOpen(true);
  };

  const registrarFrequencia = async (registros: RegistroFrequenciaLote) => {
    try {
      await frequenciaService.registrarFrequenciaLote(registros);
      setAulas(prev => prev.filter(aula => aula.id !== registros.aula_id));
      setTimeout(() => {
        setAulasLoaded(false);
        loadAulasTurma();
      }, 500);
    } catch (error) {
      console.error('❌ Erro ao registrar frequência:', error);
    }
  };

  const handleSalvarHorario = async (horario: HorarioAulaForm & { id?: string }): Promise<void> => {
    try {
      let disciplinaAdicionadaAoCurso = false;

      if (turma?.horarios) {
        const conflito = verificarConflitoHorario(
          turma.horarios,
          horario,
          !!horario.id
        );
        
        if (conflito) {
          showAlert({
            type: 'error',
            title: 'Conflito de horário',
            message: `Não foi possível salvar: ${conflito}`,
            duration: 5000
          });
          throw new Error(conflito);
        }
      }
      
      if (horario.id) {
        const resultado = await turmaService.updateHorario(horario.id, horario);
        disciplinaAdicionadaAoCurso = !!resultado?.disciplinaAdicionadaAoCurso;
      } else {
        const resultado = await turmaService.createHorario(
          horario as HorarioAulaForm,
          id || ''
        );
        disciplinaAdicionadaAoCurso = !!resultado?.disciplinaAdicionadaAoCurso;
      }
      
      loadTurmaDetails();
      
      showAlert({
        type: 'success',
        title: horario.id ? 'Horário atualizado!' : 'Horário adicionado!',
        message: 'Horário salvo com sucesso.',
        duration: 3000
      });

      if (disciplinaAdicionadaAoCurso && horario.disciplina?.trim()) {
        showAlert({
          type: 'info',
          title: 'Disciplina adicionada ao curso',
          message: `A disciplina "${horario.disciplina}" foi adicionada automaticamente ao curso da turma.`,
          duration: 4500
        });
      }
    } catch (error) {
      console.error('Erro ao salvar horário:', error);
      showAlert({
        type: 'error',
        title: 'Erro ao salvar horário',
        message: error instanceof Error ? error.message : 'Não foi possível salvar o horário.',
        duration: 5000
      });
      throw error;
    }
  };

  const verificarConflitoHorario = (
    horariosExistentes: HorarioAula[],
    novoHorario: HorarioAulaForm & { id?: string },
    isEdicao: boolean
  ): string | null => {
    const { id, dia_semana, hora_inicio, hora_fim } = novoHorario;
    
    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const inicioNovo = toMinutes(hora_inicio);
    const fimNovo = toMinutes(hora_fim);
    
    for (const horario of horariosExistentes) {
      if (isEdicao && horario.id === id) {
        continue;
      }
      
      if (horario.dia_semana === dia_semana) {
        const inicioExistente = toMinutes(horario.hora_inicio);
        const fimExistente = toMinutes(horario.hora_fim);
        
        const sobrepoe = (
          (inicioNovo >= inicioExistente && inicioNovo < fimExistente) ||
          (fimNovo > inicioExistente && fimNovo <= fimExistente) ||
          (inicioNovo <= inicioExistente && fimNovo >= fimExistente)
        );
        
        if (sobrepoe) {
          return `Conflito com: ${horario.disciplina} (${horario.hora_inicio} - ${horario.hora_fim})`;
        }
      }
    }
    
    if (inicioNovo >= fimNovo) {
      return 'Hora de término deve ser maior que hora de início';
    }
    
    const duracao = fimNovo - inicioNovo;
    if (duracao > 180) {
      return 'Aula não pode durar mais de 3 horas';
    }
    
    return null;
  };

  const handleExcluirHorario = async (horarioId: string) => {
    try {
      await turmaService.excluirHorario(horarioId);
      loadTurmaDetails();
    } catch (error) {
      console.error('Erro ao excluir horário:', error);
      throw error;
    }
  };

  const loadTurmaDetails = useCallback(async () => {
    try {
      setLoading(true);
      const turmaData = await turmaService.findById(id || '');

      if (!turmaData) {
        setTurma(null);
        return;
      }

      const horario = await turmaService.getHorarios(turmaData.id);
      setTurma((prev) => ({
        ...turmaData,
        alunos: prev?.alunos || [],
        horarios: horario,
        professor: turmaData.professor || 'Professor a definir',
        vagas: 30
      }));
    } catch (error) {
      console.error('Erro ao carregar turma:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadAlunosTurma = useCallback(async () => {
    if (!id || loadingAlunos || alunosLoaded) return;
    try {
      setLoadingAlunos(true);
      const alunosPromessas = await alunosService.getDesempemhoTurma(id);
      const alunosDes = await Promise.all(alunosPromessas);
      setTurma((prev) => (prev ? { ...prev, alunos: alunosDes } : prev));
      setAlunosLoaded(true);
    } catch (error) {
      console.error('Erro ao carregar alunos da turma:', error);
    } finally {
      setLoadingAlunos(false);
    }
  }, [id, loadingAlunos, alunosLoaded]);

  const loadAulasTurma = useCallback(async () => {
    if (!id || loadingAulas || aulasLoaded) return;
    try {
      setLoadingAulas(true);
      const aulasTurma = await aulaService.getAulasPorTurma(id);
      setAulas(aulasTurma);
      setAulasLoaded(true);
    } catch (error) {
      console.error('Erro ao carregar aulas da turma:', error);
    } finally {
      setLoadingAulas(false);
    }
  }, [id, loadingAulas, aulasLoaded]);

  useEffect(() => {
    setAlunosLoaded(false);
    setAulasLoaded(false);
    setAulas([]);
    loadTurmaDetails();
  }, [loadTurmaDetails]);

  useEffect(() => {
    const loadRole = async () => {
      const profile = await profileService.getLocalProfile();
      const role = profile?.role || localStorage.getItem('user_role');
      setCanManageTurmas(role !== 'teacher');
    };
    loadRole();
  }, []);

  useEffect(() => {
    if (abaAtiva === 'overview' || abaAtiva === 'alunos') {
      loadAlunosTurma();
    }
    if (abaAtiva === 'aulas') {
      loadAulasTurma();
    }
  }, [abaAtiva, loadAlunosTurma, loadAulasTurma]);

  useEffect(() => {
    const secaoParam = seccao as SecaoTurma | undefined;
    if (secaoParam && secoesTurma.includes(secaoParam)) {
      setAbaAtiva(secaoParam);
      return;
    }
    setAbaAtiva('overview');
  }, [seccao]);

  const carregarPlanosDaTurma = async () => {
    if (!id) return;
    try {
      setLoadingPlanos(true);
      const planos = await planoAulaService.getPlanos({ turma_id: id });

      const planosComAulas = await Promise.all(
        planos.map(async (plano) => {
          const aulasDoPlano = await Promise.all(
            (plano.aulas_geradas || []).map((aulaId) => aulaService.getAulaById(aulaId))
          );

          const aulasTurma = aulasDoPlano
            .filter((aula): aula is Aula => Boolean(aula && aula.turma_id === id && !aula.deleted))
            .sort((a, b) => new Date(a.data_aula).getTime() - new Date(b.data_aula).getTime());

          return {
            ...plano,
            aulas_turma: aulasTurma
          };
        })
      );

      setPlanosTurma(planosComAulas);
    } catch (error) {
      console.error('Erro ao carregar planos da turma:', error);
      showAlert({
        type: 'error',
        title: 'Erro ao carregar planos',
        message: 'Não foi possível carregar os planos de aula da turma.',
        duration: 4000
      });
    } finally {
      setLoadingPlanos(false);
    }
  };

  const abrirPlanoModal = async () => {
    setShowPlanoModal(true);
    await carregarPlanosDaTurma();
  };

  const atualizarStatusAulaPlano = async (aula: Aula, status: AulaStatus) => {
    try {
      await aulaService.atualizarAula(aula.id, {
        status,
        turmas: aula.turmas
      });
      await carregarPlanosDaTurma();
      setAulasLoaded(false);
      await loadAulasTurma();
    } catch (error) {
      console.error('Erro ao atualizar status da aula:', error);
      showAlert({
        type: 'error',
        title: 'Erro ao atualizar aula',
        message: 'Não foi possível sinalizar o estado da aula.',
        duration: 3500
      });
    }
  };

  const handleSecaoChange = (novaSecao: SecaoTurma) => {
    setAbaAtiva(novaSecao);
    if (!id) return;
    navigate(`/turmas/${id}/${novaSecao}`);
  };

  const getTipoMatriculaLabel = (tipo: string) => {
    switch (tipo) {
      case 'regular': return 'Turma Regular';
      case 'reforco_personalizado': return 'Reforço Personalizado';
      default: return tipo;
    }
  };

  const getGrupoAprendizadoLabel = (grupo: string) => {
    const grupoObj = gruposAprendizado.find(g => g.value === grupo);
    return grupoObj ? grupoObj.label.split(' - ')[0] : grupo;
  };

  const getNivelConhecimentoLabel = (nivel: string) => {
    const nivelObj = niveisConhecimento.find(n => n.value === nivel);
    return nivelObj ? nivelObj.label.split(' - ')[0] : nivel;
  };

  const getBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'regular': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'reforco_personalizado': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getBadgeColorGrupo = (grupo: string) => {
    switch (grupo) {
      case 'gama': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'beta': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'alfa': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getBadgeColorNivel = (nivel: string) => {
    switch (nivel) {
      case 'A': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      case 'B': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'C': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getDiaSemanaFromDate = (dateString: string): string => {
    const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const date = new Date(dateString);
    return dias[date.getDay()];
  };

  const handleCriarAula = async (aulaData: AulaFormData) => {
    try {
      await aulaService.criarAula(aulaData);
      setShowForm(false);
      setAulasLoaded(false);
      await loadAulasTurma();
      showAlert({ type: 'success', title: 'Aula criada com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao criar aula:', error);
      showAlert({ type: 'error', title: error.message || 'Erro ao criar aula' });
    }
  };

  async function handelActualizar(status: AulaStatus, aulaSelect: Aula) {
    if(aulaSelect.status === "ministrada") {
      setAulaSelect(aulaSelect);
      return;
    }
      
    if(aulaSelect) {
      const aula = await aulaService.atualizarAula(aulaSelect.id, { status: status, turmas: aulaSelect.turmas });
      setAulas(prev => prev.map(e => aula && e.id === aula.id ? aula : e));
    }
  }

  const handleEditarAula = async (aulaData: AulaFormData) => {
    if (!aulaEditando) return;
    
    try {
      await aulaService.atualizarAula(aulaEditando.id, aulaData);
      setShowForm(false);
      setAulaEditando(null);
      setAulasLoaded(false);
      await loadAulasTurma();
      showAlert({ type: 'success', title: 'Aula atualizada com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao atualizar aula:', error);
      showAlert({ type: 'error', title: error.message || 'Erro ao atualizar aula' });
    }
  };

  const handleDeletarAula = async (aula: Aula) => {
    const confirmed = await confirm({
      type: 'delete',
      title: 'Excluir Aula',
      message: `Tem certeza que deseja excluir esta aula?`,
      isDestructive: true,
      confirmText: 'Excluir',
      onConfirm: async () => {
        try {
          await aulaService.deletarAula(aula.id);
          setAulas(prev => prev.filter(a => a.id !== aula.id));
          showAlert({ type: 'success', title: 'Aula excluída com sucesso!' });
          showAlert({
            type: 'success',
            title: 'Aula excluída!',
            message: `Aula excluída com sucesso`,
            duration: 3000
          });
        } catch (error) {
          showAlert({
            type: 'error',
            title: 'Erro ao excluir',
            message: 'Não foi possível excluir a aula. Verifique sua conexão.',
            duration: 5000
          });
          console.error('Erro ao excluir aula:', error);
        }
      }
    });
  };

  const handleQuickAdd = async () => {
    if (!quickAddTurma) {
      showAlert({ type: 'error', title: 'Selecione uma turma' });
      return;
    }

    try {
      await aulaService.criarAula({
        turma_id: quickAddTurma,
        dia_semana: getDiaSemanaFromDate(quickAddData) as "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado" | "domingo",
        data_aula: quickAddData,
        disciplina: turma?.curso_nome || '',
        hora_inicio: '08:00',
        hora_fim: '09:30',
        tema_aula: 'Aula do dia',
        status: 'planeada',
        turmas: turma as Turma
      });
      
      setShowQuickAdd(false);
      setQuickAddTurma('');
      setAulasLoaded(false);
      await loadAulasTurma();
      showAlert({ type: 'success', title: 'Aula adicionada rapidamente!' });
    } catch (error) {
      showAlert({ type: 'error', title: 'Erro ao adicionar aula rápida' });
    }
  };

  const alunosFiltrados = useMemo(() => {
    if (!turma?.alunos) return [];
    let filtered = turma.alunos;
    if (filtroTipoMatricula !== 'todos') {
      filtered = filtered.filter(aluno => aluno.tipo_matricula === filtroTipoMatricula);
    }
    if (filtroGrupoAprendizado !== 'todos') {
      filtered = filtered.filter(aluno => aluno.grupo_aprendizado === filtroGrupoAprendizado);
    }
    if (filtroNivelConhecimento !== 'todos') {
      filtered = filtered.filter(aluno => aluno.nivel_conhecimento === filtroNivelConhecimento);
    }
    return filtered;
  }, [turma?.alunos, filtroTipoMatricula, filtroGrupoAprendizado, filtroNivelConhecimento]);

  const top3Alunos = useMemo(
    () => [...(turma?.alunos || [])].sort((a, b) => b.media - a.media).slice(0, 3),
    [turma?.alunos]
  );

  const regularCount = useMemo(
    () => turma?.alunos.filter(a => a.tipo_matricula === 'regular').length || 0,
    [turma?.alunos]
  );

  const reforcoCount = useMemo(
    () => turma?.alunos.filter(a => a.tipo_matricula === 'reforco_personalizado').length || 0,
    [turma?.alunos]
  );

  const horariosAgrupados = useMemo(() => turma && horarios(turma), [turma]);
  const diaSemanaAtual = useMemo(() => getDiaSemanaFromDate(new Date().toISOString()), []);
  const horariosHoje = useMemo(
    () => turma?.horarios.filter(e => e.dia_semana === diaSemanaAtual) || [],
    [turma?.horarios, diaSemanaAtual]
  );

  if (loading) {
    return <PageLoader title="Abrindo detalhes da turma" subtitle="Carregando dados acadêmicos, horários e estatísticas..." />;
  }

  if (!turma) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Turma não encontrada</h2>
          <button
            onClick={() => goBack('/turmas')}
            className="mt-4 p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            aria-label="Voltar"
          >
            <FiArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  const week = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

  function horarios(turma: Turma): HorarioAula[][] {
    if (!turma) return [];
    const horarios = turma.horarios;
    if (!horarios || horarios.length === 0) {
      return [];
    }

    const horariosPorHora: Record<string, HorarioAula[]> = {};
    
    horarios.forEach((horario) => {
      const chave = `${horario.hora_inicio}-${horario.hora_fim}`;
      if (!horariosPorHora[chave]) {
        horariosPorHora[chave] = [];
      }
      horariosPorHora[chave].push(horario);
    });

    return Object.values(horariosPorHora)
      .sort((a, b) => {
        const horaA = a[0].hora_inicio;
        const horaB = b[0].hora_inicio;
        return horaA.localeCompare(horaB);
      });
  }

  const taxaOcupacao = turma.vagas ? (turma.alunos.length / turma.vagas) * 100 : 0;
  const mediaGeral = turma.alunos.length > 0 
    ? (turma.alunos.reduce((acc, aluno) => acc + aluno.media, 0) / turma.alunos.length).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="mb-8">
          <div className="flex items-start gap-3 mb-4">
            <motion.button
              whileHover={{ scale: 1.1, x: -3 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => goBack('/turmas')}
              className="p-2.5 flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              aria-label="Voltar"
            >
              <FiArrowLeft className="h-5 w-5" />
            </motion.button>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight truncate">
                      {turma.nome_turma}
                    </h1>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 ${
                      turma.estado === 'ativa' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {turma.estado === 'ativa' ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    {canManageTurmas ? (
                      <MotionLink
                        to={`/cursos/${turma.curso_id}`}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        className="group inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
                        title="Abrir curso"
                      >
                        <FiBook size={16} />
                        <span>{turma.curso_nome}</span>
                        <FiExternalLink size={13} className="opacity-0 transition-opacity group-hover:opacity-100" />
                      </MotionLink>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1">
                        <FiBook size={16} />
                        <span>{turma.curso_nome}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <FiCalendar size={16} />
                      {turma.ano_lectivo}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiUsers size={16} />
                      {loadingAlunos && !alunosLoaded ? '...' : turma.alunos.length} alunos
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={abrirPlanoModal}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                  >
                    <FiBook size={18} />
                    Plano de Aula
                  </button>
                  {canManageTurmas && (
                    <Link
                      to={`/turmas/editar/${turma.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      <FiEdit size={18} />
                      Editar Turma
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Visão Geral', icon: FiBarChart2 },
              { id: 'alunos', label: 'Alunos', icon: FiUsers },
              { id: 'aulas', label: 'Aulas', icon: FiBook },
              { id: 'horario', label: 'Horário', icon: FiClock }
            ].map(aba => (
              <button
                key={aba.id}
                onClick={() => handleSecaoChange(aba.id as SecaoTurma)}
                className={`flex items-center justify-center gap-2 py-4 px-2 sm:px-1 border-b-2 font-medium text-sm ${
                  abaAtiva === aba.id
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <aba.icon size={18} />
                <span className="hidden sm:inline">{aba.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Conteúdo das Abas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Principal */}
          <div className={`${compactar ? 'lg:col-span-9' : 'lg:col-span-8'} space-y-6`}>
            {/* ABA: VISÃO GERAL */}
            {abaAtiva === 'overview' && (
              loadingAlunos && !alunosLoaded ? (
                <PageLoader
                  title="Carregando visão geral"
                  subtitle="Buscando desempenho e distribuição dos alunos..."
                  fullScreen={false}
                />
              ) : (
                <>
                  {/* Top 3 Alunos - Destaque */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Top 3 Melhores Desempenhos
                      </h2>
                      <FaCrown className="text-yellow-500" size={24} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {top3Alunos.map((aluno, index) => (
                        <motion.div
                          onClick={() => navigate("/alunos/"+aluno.id)}
                          key={aluno.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.05, transition: { duration: 0.3 }, boxShadow: '0 8px 15px rgba(0, 0, 0, 0.1)' }}
                          transition={{ delay: index * 0.1 }}
                          className={`p-4 rounded-lg border-2 cursor-pointer ${
                            index === 0 
                              ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-700'
                              : index === 1
                              ? 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 border-gray-200 dark:border-gray-600'
                              : 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {index === 0 && <FaCrown className="text-yellow-500" />}
                              {index === 1 && <FaMedal className="text-gray-400" />}
                              {index === 2 && <FaAwardSolid className="text-amber-600" />}
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                {index === 0 ? '1º Lugar' : index === 1 ? '2º Lugar' : '3º Lugar'}
                              </span>
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                              {aluno.media.toFixed(1)}
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                              <RxPerson className="text-blue-600 dark:text-blue-400" size={24} />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                              {aluno.nome_completo}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {aluno.numero_estudante}
                            </p>
                            
                            <div className="flex flex-wrap justify-center gap-1 mt-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${getBadgeColor(aluno.tipo_matricula || 'regular')}`}>
                                {getTipoMatriculaLabel(aluno.tipo_matricula || 'regular')}
                              </span>
                              {aluno.grupo_aprendizado && (
                                <span className={`px-2 py-1 text-xs rounded-full ${getBadgeColorGrupo(aluno.grupo_aprendizado)}`}>
                                  {getGrupoAprendizadoLabel(aluno.grupo_aprendizado)}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                              <span>Presença: {aluno.presenca}%</span>
                              <span>Última: {aluno.ultimaAvaliacao}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Estatísticas da Turma */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                  >
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Estatísticas da Turma
                    </h2>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <FiUsers className="mx-auto text-blue-600 dark:text-blue-400 mb-2" size={24} />
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{turma.alunos.length}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Alunos</div>
                      </div>
                      
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <FiStar className="mx-auto text-green-600 dark:text-green-400 mb-2" size={24} />
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {mediaGeral}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Média Geral</div>
                      </div>
                      
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <FaMoneyBill className="mx-auto text-purple-600 dark:text-purple-400 mb-2" size={24} />
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {regularCount}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Matrículas Regulares</div>
                      </div>
                      
                      <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <FiTarget className="mx-auto text-amber-600 dark:text-amber-400 mb-2" size={24} />
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {reforcoCount}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Reforços</div>
                      </div>
                    </div>

                    {/* Distribuição por Grupo de Aprendizado */}
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        Distribuição por Grupo de Aprendizado
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        {gruposAprendizado.map(grupo => {
                          const count = turma.alunos.filter(a => a.grupo_aprendizado === grupo.value).length;
                          return (
                            <div key={grupo.value} className="text-center">
                              <div className={`px-3 py-2 rounded-lg ${getBadgeColorGrupo(grupo.value)}`}>
                                <div className="text-lg font-bold">{count}</div>
                                <div className="text-xs">{grupo.label.split(' - ')[0]}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                </>
              )
            )}      

            {/* ABA: ALUNOS */}
            {abaAtiva === 'alunos' && (
              <Suspense fallback={<PageLoader title="Carregando alunos" subtitle="Buscando desempenho e indicadores..." fullScreen={false} />}>
                {loadingAlunos ? (
                  <PageLoader title="Carregando alunos" subtitle="Buscando desempenho e indicadores..." fullScreen={false} />
                ) : (
                  <TurmaAlunosSection
                    alunosFiltrados={alunosFiltrados}
                    totalAlunos={turma.alunos.length}
                    filtroTipoMatricula={filtroTipoMatricula}
                    setFiltroTipoMatricula={setFiltroTipoMatricula}
                    filtroGrupoAprendizado={filtroGrupoAprendizado}
                    setFiltroGrupoAprendizado={setFiltroGrupoAprendizado}
                    filtroNivelConhecimento={filtroNivelConhecimento}
                    setFiltroNivelConhecimento={setFiltroNivelConhecimento}
                    gruposAprendizado={gruposAprendizado}
                    niveisConhecimento={niveisConhecimento}
                    getBadgeColor={getBadgeColor}
                    getBadgeColorGrupo={getBadgeColorGrupo}
                    getBadgeColorNivel={getBadgeColorNivel}
                    getTipoMatriculaLabel={getTipoMatriculaLabel}
                    getGrupoAprendizadoLabel={getGrupoAprendizadoLabel}
                    getNivelConhecimentoLabel={getNivelConhecimentoLabel}
                    onSelectAluno={setAlunoSelecionado}
                  />
                )}
              </Suspense>
            )}

            {/* ABA: AULAS */}
            {abaAtiva === 'aulas' && (
              <Suspense fallback={<PageLoader title="Carregando aulas" subtitle="Buscando agenda e registros da turma..." fullScreen={false} />}>
                {loadingAulas ? (
                  <PageLoader title="Carregando aulas" subtitle="Buscando agenda e registros da turma..." fullScreen={false} />
                ) : (
                  <TurmaAulasSection
                    aulas={aulas}
                    onNovaAula={() => setShowForm(true)}
                    onAulaRapida={() => setShowQuickAdd(true)}
                    onEditarAula={(aula) => {
                      setAulaEditando(aula);
                      setShowForm(true);
                    }}
                    onDeletarAula={handleDeletarAula}
                    onActualizarAula={(status, aula) => {
                      handelActualizar(status, aula);
                    }}
                  />
                )}
              </Suspense>
            )}

            {/* ABA: HORÁRIO */}
            {abaAtiva === 'horario' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      Horário da Turma
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {canManageTurmas ? 'Gerencie os horários das aulas da turma' : 'Visualize os horários das aulas da turma'}
                    </p>
                  </div>
                  {canManageTurmas && (
                    <button
                      onClick={() => {
                        setHorarioEditando(null);
                        setIsHorarioModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <FiPlus size={18} />
                      Adicionar Horário
                    </button>
                  )}
                </div>

                {canManageTurmas && (
                  <Suspense fallback={null}>
                    <HorarioModal
                      isOpen={isHorarioModalOpen}
                      onClose={() => {
                        setIsHorarioModalOpen(false);
                        setHorarioEditando(null);
                      }}
                      confirm={confirm}
                      onSubmit={handleSalvarHorario}
                      onDelete={handleExcluirHorario}
                      horarioEdit={horarioEditando}
                      turmaId={turma.id}
                      title={horarioEditando ? 'Editar Horário' : 'Adicionar Horário'}
                    />
                  </Suspense>
                )}
                
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Hora
                        </th>
                        {week.map((dia) => (
                          <th 
                            key={dia} 
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                          >
                            {dia.charAt(0).toUpperCase() + dia.slice(1)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(horariosAgrupados??[]).length > 0 ? (
                        (horariosAgrupados??[]).map((horario: HorarioAula[], key: number) => (
                          <motion.tr
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: key * 0.1 }}
                            key={horario[0]?.id || key}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          >
                            <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                              {horario[0]?.hora_inicio} - {horario[0]?.hora_fim}
                            </td>
                            {week.map((dia) => {
                              const hora = horario.find(f => f.dia_semana === dia);
                              return (
                                <td key={dia} className="py-2">
                                  <HorarioCellMenu
                                    hora={hora}
                                    onEditar={(h) => {
                                      setHorarioEditando(h);
                                      setIsHorarioModalOpen(true);
                                    }}
                                    onExcluir={handleExcluirHorario}
                                    confirm={confirm}
                                    showAlert={showAlert}
                                    setHorarioEditando={setHorarioEditando}
                                    setIsHorarioModalOpen={setIsHorarioModalOpen}
                                    showActions={canManageTurmas}
                                  />
                                </td>
                              );
                            })}
                          </motion.tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center">
                            <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                              <FiCalendar size={48} className="mb-2" />
                              <p className="text-lg font-medium">Nenhum horário cadastrado</p>
                              <p className="text-sm mt-1">
                                {canManageTurmas ? 'Clique em "Adicionar Horário" para começar' : 'Nenhum horário cadastrado'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>

          {/* SIDEBAR - INFORMAÇÕES DA TURMA (VERSÃO OTIMIZADA) */}
          <div className={`${compactar ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-6`}>
  <motion.button
  onClick={() => setCompactar(!compactar)}
  className="w-full flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm text-gray-700 transition-all hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 hover:shadow-sm"
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
  <span className="font-medium">
    {compactar ? 'Expandir painel' : 'Compactar painel'}
  </span>
  <motion.div
    animate={{ rotate: compactar ? 180 : 0 }}
    transition={{ duration: 0.3 }}
  >
    {compactar ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
  </motion.div>
</motion.button>


<motion.div
  layout
  initial={false}
  animate={{ width: '100%', height: 'auto' }}
  transition={{ layout: { duration: 0.4, type: "spring", stiffness: 300, damping: 25 } }}
  className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${
    compactar ? 'p-3' : 'p-6'  // Quando compactar=true, padding menor
  }`}
>
  {/* Quando compactar=true, mostra apenas informações essenciais */}
  <motion.div layout="position">
    <motion.h3 
      layout="position"
      className={`font-semibold text-gray-900 dark:text-white ${compactar ? 'text-base mb-2' : 'text-lg mb-4'}`}
    >
      {compactar ? 'Turma' : 'Informações da Turma'}
    </motion.h3>
    
    <motion.div layout className="space-y-3">
      {/* Professor - sempre visível */}
      <motion.div layout className="flex items-center gap-2">
        <FaChalkboardTeacher className="text-gray-400 flex-shrink-0" size={compactar ? 16 : 20} />
        <motion.div layout="position" className="min-w-0 flex-1">
          {!compactar && <p className="text-xs text-gray-600 dark:text-gray-400">Professor</p>}
          <p className={`font-medium text-gray-900 dark:text-white truncate ${compactar ? 'text-sm' : 'text-base'}`}>
            {compactar ? `Prof: ${turma.professor?.split(' ')[0]}` : turma.professor}
          </p>
        </motion.div>
      </motion.div>

      {/* Curso - sempre visível */}
      {canManageTurmas ? (
        <MotionLink
          to={`/cursos/${turma.curso_id}`}
          layout
          className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20"
          whileHover={{ x: compactar ? 0 : 2 }}
          title="Ir para curso"
        >
          <FiBook className="text-gray-400 flex-shrink-0" size={compactar ? 16 : 20} />
          <motion.div layout="position" className="flex-1 min-w-0">
            {!compactar && <p className="text-xs text-gray-600 dark:text-gray-400">Curso</p>}
            <p className={`font-medium text-gray-900 dark:text-white truncate ${compactar ? 'text-sm' : 'text-base'}`}>
              {compactar ? (turma.curso_nome??"").substring(0, 15) + '...' : turma.curso_nome}
            </p>
          </motion.div>
        </MotionLink>
      ) : (
        <motion.div layout className="flex items-center gap-2 rounded-lg p-1">
          <FiBook className="text-gray-400 flex-shrink-0" size={compactar ? 16 : 20} />
          <motion.div layout="position" className="flex-1 min-w-0">
            {!compactar && <p className="text-xs text-gray-600 dark:text-gray-400">Curso</p>}
            <p className={`font-medium text-gray-900 dark:text-white truncate ${compactar ? 'text-sm' : 'text-base'}`}>
              {compactar ? (turma.curso_nome??"").substring(0, 15) + '...' : turma.curso_nome}
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* Alunos/Capacidade - sempre visível */}
      <motion.div layout className="flex items-center gap-2">
        <FiUsers className="text-gray-400 flex-shrink-0" size={compactar ? 16 : 20} />
        <motion.div layout="position">
          {!compactar && <p className="text-xs text-gray-600 dark:text-gray-400">Capacidade</p>}
          <p className={`font-medium text-gray-900 dark:text-white ${compactar ? 'text-sm' : 'text-base'}`}>
            {compactar ? `${turma.alunos.length}/${turma.vagas}` : `${turma.alunos.length}/${turma.vagas} alunos`}
          </p>
        </motion.div>
      </motion.div>

      {/* Elementos que só aparecem quando NÃO está compactado */}
      <AnimatePresence>
        {!compactar && (
          <>
            {/* Estado */}
            <motion.div
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 pt-1"
            >
              <FiActivity className="text-gray-400 flex-shrink-0" size={20} />
              <motion.div layout="position">
                <p className="text-xs text-gray-600 dark:text-gray-400">Estado</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {turma.estado}
                </p>
              </motion.div>
            </motion.div>

            {/* Tipos de Matrícula */}
            <motion.div
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-3 border-t border-gray-200 dark:border-gray-700"
            >
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Tipos de Matrícula</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>Regular:</span>
                  <span className="font-medium">{regularCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Reforço:</span>
                  <span className="font-medium">{reforcoCount}</span>
                </div>
              </div>
            </motion.div>

            {/* Descrição */}
            {turma.descricao && (
              <motion.div
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-3 border-t border-gray-200 dark:border-gray-700"
              >
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Descrição</p>
                <p className="text-gray-900 dark:text-white text-sm line-clamp-2">
                  {turma.descricao}
                </p>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </motion.div>
  </motion.div>
</motion.div>


<motion.div
  layout
  transition={{ layout: { duration: 0.4 } }}
  className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all ${
    compactar ? 'p-3' : 'p-6'
  }`}
>
  <motion.div layout="position">
    <motion.h3 
      layout="position"
      className={`font-semibold text-gray-900 dark:text-white ${compactar ? 'text-base mb-2' : 'text-lg mb-4'}`}
    >
      {compactar ? 'Aulas' : 'Próximas Aulas'}
    </motion.h3>
    
    <motion.div layout className="space-y-2">
      <AnimatePresence mode="popLayout">
        {horariosHoje.length > 0 ? (
          horariosHoje.slice(0, compactar ? 2 : undefined).map((horario, index) => (
            <motion.div
              key={horario.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <FiClock className="text-violet-600 dark:text-violet-400 flex-shrink-0" size={compactar ? 14 : 16} />
              
              <motion.div layout="position" className="flex-1 min-w-0">
                <p className={`font-medium text-gray-900 dark:text-white truncate ${compactar ? 'text-xs' : 'text-sm'}`}>
                  {compactar ? horario.disciplina.substring(0, 8) + '...' : horario.disciplina}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {horario.hora_inicio}
                  {!compactar && ` - ${horario.hora_fim}`}
                </p>
              </motion.div>

              {canManageTurmas && (
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => {
                      setHorarioEditando(horario);
                      setIsHorarioModalOpen(true);
                    }}
                    className="p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                    <FiEdit className="text-blue-600 dark:text-blue-400" size={compactar ? 12 : 14} />
                  </button>
                  
                  <button
                    onClick={async () => {
                      await confirm({
                        type: 'delete',
                        title: 'Excluir Horário',
                        message: `Tem certeza?`,
                        isDestructive: true,
                        confirmText: 'Excluir',
                        onConfirm: async () => {
                          try {
                            await handleExcluirHorario(horario.id);
                          } catch (error) {
                            console.error('Erro:', error);
                          }
                        }
                      });
                    }}
                    className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <FiTrash className="text-red-600 dark:text-red-400" size={compactar ? 12 : 14} />
                  </button>
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
            {compactar ? 'Sem aulas' : 'Nenhum horário definido'}
          </p>
        )}
        
        {compactar && horariosHoje.length > 2 && (
          <p className="text-xs text-blue-600 dark:text-blue-400 text-center">
            +{horariosHoje.length - 2} mais
          </p>
        )}
      </AnimatePresence>
    </motion.div>
  </motion.div>
</motion.div>

          </div>
        </div>
      </div>

      {/* Modais e componentes lazy */}
      <Suspense fallback={null}>
        <StudentModal loadTurmaDetails={loadTurmaDetails} alunoSelecionado={alunoSelecionado} setAlunoSelecionado={setAlunoSelecionado} />
      </Suspense>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <h3 className="font-semibold dark:text-white text-gray-800 mb-4">Ações Rápidas</h3>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="inline mr-2" />
            Nova Aula
          </button>
          <button className="px-4 py-2 bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-700 transition-colors">
            <FiCalendar className="inline mr-2" />
            Agendar Múltiplas Aulas
          </button>
          <button className="px-4 py-2 bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors">
            <FiUsers className="inline mr-2" />
            Relatório de Participação
          </button>
        </div>
      </motion.div>

      {/* Modal Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
            onClick={() => {
              setShowForm(false);
              setAulaEditando(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-none sm:max-w-4xl h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <Suspense fallback={null}>
                <AulaForm
                  aula={aulaEditando}
                  comfirm={confirm}
                  turmas={[{ value: turma.id, label: turma.nome_turma }]}
                  onSubmit={aulaEditando ? handleEditarAula : handleCriarAula}
                  onCancel={() => {
                    setShowForm(false);
                    setAulaEditando(null);
                  }}
                  turmaHorarios={turma.horarios}
                  loading={loading}
                  aulaExistentes={turma.aulas}
                />
              </Suspense>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Planos */}
      <AnimatePresence>
        {showPlanoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
            onClick={() => setShowPlanoModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-none sm:max-w-5xl h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-750"
              >
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FiBook className="text-blue-500" />
                    Planos de Aula da Turma
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Visualize e sinalize aulas ministradas ou não ministradas.
                  </p>
                </motion.div>
                
                <motion.button
                  onClick={() => setShowPlanoModal(false)}
                  className="px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <FiX className="inline mr-1" />
                  Fechar
                </motion.button>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="p-6 overflow-y-auto max-h-[78vh] space-y-4"
              >
                {loadingPlanos && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-12"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Carregando planos...</p>
                  </motion.div>
                )}

                {!loadingPlanos && planosTurma.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <FiBook className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Nenhum plano encontrado
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Esta turma ainda não possui planos de aula.
                      </p>
                    </motion.div>
                  </motion.div>
                )}

                {!loadingPlanos && planosTurma.map((plano, planoIndex) => {
                  const ministradas = plano.aulas_turma.filter((aula) => aula.status === 'ministrada').length;
                  const naoMinistradas = plano.aulas_turma.length - ministradas;

                  return (
                    <motion.div
                      key={plano.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + planoIndex * 0.1 }}
                      whileHover={{ scale: 1.01 }}
                      className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/30 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                        <motion.div
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.5 + planoIndex * 0.1 }}
                        >
                          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-blue-500 rounded-full"></span>
                            {plano.titulo}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {plano.disciplina} • {plano.tipo} • {plano.frequencia || 'diaria'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Aulas planeadas: {plano.aulas_planeadas} • Geradas: {plano.aulas_turma.length}
                          </p>
                        </motion.div>
                        
                        <motion.div 
                          initial={{ x: 10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.5 + planoIndex * 0.1 }}
                          className="text-xs flex gap-3 bg-white dark:bg-gray-800 p-2 rounded-lg"
                        >
                          <motion.span 
                            whileHover={{ scale: 1.05 }}
                            className="text-green-700 dark:text-green-400 flex items-center gap-1"
                          >
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Ministradas: {ministradas}
                          </motion.span>
                          <motion.span 
                            whileHover={{ scale: 1.05 }}
                            className="text-amber-700 dark:text-amber-400 flex items-center gap-1"
                          >
                            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                            Não ministradas: {naoMinistradas}
                          </motion.span>
                        </motion.div>
                      </div>

                      {plano.aulas_turma.length === 0 ? (
                        <motion.p 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.6 + planoIndex * 0.1 }}
                          className="text-sm text-gray-500 dark:text-gray-400 italic"
                        >
                          Nenhuma aula gerada deste plano para esta turma.
                        </motion.p>
                      ) : (
                        <motion.div 
                          initial="hidden"
                          animate="visible"
                          variants={{
                            hidden: { opacity: 0 },
                            visible: {
                              opacity: 1,
                              transition: {
                                staggerChildren: 0.05,
                                delayChildren: 0.7 + planoIndex * 0.1
                              }
                            }
                          }}
                          className="space-y-2"
                        >
                          {plano.aulas_turma.map((aula, aulaIndex) => (
                            <motion.div
                              key={aula.id}
                              variants={{
                                hidden: { opacity: 0, x: -20 },
                                visible: { opacity: 1, x: 0 }
                              }}
                              whileHover={{ scale: 1.01, backgroundColor: 'rgba(59, 130, 246, 0.02)' }}
                              className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                  <FiBook className="text-blue-500 text-xs" />
                                  {aula.tema_aula}
                                </p>
                                
                                <div className="flex flex-wrap items-center gap-3 mt-1">
                                  <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                    <FiCalendar size={10} />
                                    {new Date(aula.data_aula).toLocaleDateString('pt-AO')}
                                  </span>
                                  <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                    <FiClock size={10} />
                                    {aula.dia_semana} • {aula.hora_inicio} - {aula.hora_fim}
                                  </span>
                                </div>

                                {aula.conteudo_ministrado && (
                                  <motion.p 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8 + aulaIndex * 0.1 }}
                                    className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 bg-gray-50 dark:bg-gray-900/30 p-2 rounded"
                                  >
                                    <span className="font-medium">Conteúdo:</span> {aula.conteudo_ministrado}
                                  </motion.p>
                                )}

                                {!!aula.objetivos_aprendizagem?.length && (
                                  <div className="mt-2">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                      Objetivos ({aula.objetivos_aprendizagem.length}):
                                    </p>
                                    <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                                      {aula.objetivos_aprendizagem.slice(0, 2).map((obj, i) => (
                                        <li key={i} className="truncate">{obj}</li>
                                      ))}
                                      {aula.objetivos_aprendizagem.length > 2 && (
                                        <li className="text-blue-500">+{aula.objetivos_aprendizagem.length - 2} mais</li>
                                      )}
                                    </ul>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <motion.span 
                                  whileHover={{ scale: 1.05 }}
                                  className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                                    aula.status === 'ministrada'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                  }`}
                                >
                                  {aula.status === 'ministrada' ? <FiCheckCircle size={10} /> : <FiClock size={10} />}
                                  {aula.status}
                                </motion.span>
                                
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => atualizarStatusAulaPlano(aula, 'ministrada')}
                                  className="px-2.5 py-1.5 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-1"
                                >
                                  <FiCheckCircle size={12} />
                                  Ministrada
                                </motion.button>
                                
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => atualizarStatusAulaPlano(aula, 'planeada')}
                                  className="px-2.5 py-1.5 text-xs rounded-md bg-gray-600 text-white hover:bg-gray-700 transition-colors flex items-center gap-1"
                                >
                                  <FiClock size={12} />
                                  Não ministrada
                                </motion.button>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Quick Add */}
      <AnimatePresence>
        {showQuickAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
            onClick={() => setShowQuickAdd(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-none sm:max-w-md h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Adicionar Aula Rápida</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Turma
                    <p className='p-4 mt-1 border-gray-400 border rounded-sm'>{turma.nome_turma}</p>
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Data
                  </label>
                  <input
                    type="date"
                    value={quickAddData}
                    onChange={(e) => setQuickAddData(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowQuickAdd(false); setQuickAddTurma(turma.id); }}
                  className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleQuickAdd}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Adicionar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação */}
      <ModalComponent />

      {/* Modal de Frequência */}
      <AnimatePresence>
        {aulaSelect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
            onClick={() => {
              setShowForm(false);
              setAulaEditando(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-none sm:max-w-4xl h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <Suspense fallback={null}>
                <ModalFrequencia
                  aula={aulaSelect}
                  setAulaSelect={setAulaSelect}
                  onRegistrarFrequencia={registrarFrequencia}
                />
              </Suspense>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TurmaDetails;
