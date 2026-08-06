// Students - VERSÃO ATUALIZADA
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlus, FiUser, FiSearch, FiLayers } from 'react-icons/fi';
import { alunosService } from '../../services/database/alunosService';
import { turmaService } from '../../services/database/turmas';
import { cursosService } from '../../services/database/curso';
import { FaBookAtlas, FaGraduationCap, FaPeopleGroup } from 'react-icons/fa6';
import { RxPerson } from 'react-icons/rx';
import { StatCard } from '../../components/students/StatCard';
import { Student } from '../../types';
import { Course } from '../../types/curso';
import { Turma } from '../../types/turma';
import { SelectTyped } from '../../components/students/StudentForm';
import { getPendingCount } from '../../utils/emitPendingSync';
import { useConfirmModal } from '../../components/ui/ComfirmModal';
import { useAlert } from '../../components/ui/AlertBadge'; // ✅ Use useAlert
import { SyncStatusBadge } from '../../components/ui/SyncStatusBadge';
import { SyncDataDetail } from '../../components/ui/SyncDataDetail';
import { instituicaoIdValue } from '../../utils/getInstituicaoID';
import { StudentsTable } from '../../components/students/StudentsTable';
import { ReforcoSectionModal } from '../../components/students/ReforcoSectionModal';
import { PageLoader } from '../../components/ui/PageLoader';
import { createThrottledCallback, shouldHandleDbChangedEvent } from '../../utils/dbChangedEvent';
import db from '../../services/database/db';

const Students = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroProfessor, setFiltroProfessor] = useState('Todos Professores');
  const [filtroTurma, setFiltroTurma] = useState('Todas Turmas');
  const [filtroEstado, setFiltroEstado] = useState('Todos estados');
  const [filtroDisciplinaReforco, setFiltroDisciplinaReforco] = useState('Todas disciplinas de reforço');
  const [isCartao, setCartao] = useState(false);
  const [isExpanded, setExpanded] = useState(false);
  const [filtroAnoLectivo, setFiltroAnoLectivo] = useState('Todos ano lectivos');
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const nav = useNavigate();
  const [syncStats, setSyncStats] = useState(0);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [creatingSection, setCreatingSection] = useState(false);
  const [availableTurmas, setAvailableTurmas] = useState<Turma[]>([]);
  const [professorOptions, setProfessorOptions] = useState<string[]>(['Todos Professores']);
  const [sectionForm, setSectionForm] = useState({
    modo: 'nova' as 'nova' | 'existente',
    turmaExistenteId: '',
    nomeTurma: '',
    professor: '',
    turno: 'manhã' as 'manhã' | 'tarde' | 'noite',
    cursoId: '',
    anoLectivo: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  });
  const { confirm, ModalComponent } = useConfirmModal();
  const { showAlert } = useAlert(); // ✅ Hook correto

  // Carregar estatísticas de sincronização
  useEffect(() => {
        // Monitorar status online
        const handleOnline = () => setOnlineStatus(true);
        const handleOffline = () => setOnlineStatus(false);
        const throttledReload = createThrottledCallback(() => {
          reload();
        }, 2500);

        const handleDbChanged = (event: Event) => {
          if (shouldHandleDbChangedEvent(event, ['alunos'])) {
            throttledReload();
          }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('db-changed', handleDbChanged);

        // Carregar estatísticas de sincronização
        const loadSyncStats = async () => {
          try {
            const turmasPendentes = await getPendingCount("alunos");
            setSyncStats(turmasPendentes);
          } catch (error) {
            console.error('Erro ao carregar sync stats:', error);
          }
        };

        loadSyncStats();

        // Ouvir eventos de sincronização
        const handleSyncUpdate = () => {
          loadSyncStats();
        };
        const interval = setInterval(handleSyncUpdate, 30000);

        window.addEventListener('sync-pending', handleSyncUpdate);
        window.addEventListener('sync-complete', handleSyncUpdate);

        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          window.removeEventListener('db-changed', handleDbChanged);
          window.removeEventListener('sync-pending', handleSyncUpdate);
          window.removeEventListener('sync-complete', handleSyncUpdate);
          throttledReload.cancel();
          clearInterval(interval);
        };
      }, []);

  useEffect(() => {
    const loadProfessores = async () => {
      try {
        const instituicaoId = instituicaoIdValue();
        const professores = await db.profiles
          .where('role')
          .equals('teacher')
          .toArray();

        const filtrados = instituicaoId
          ? professores.filter((p: any) => p.instituicao_id === instituicaoId)
          : professores;

        const nomes = filtrados
          .map((p: any) => p.full_name || p.nome || p.email || 'Professor')
          .filter((n: string) => n && n.trim().length > 0);

        const unique = Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b));
        setProfessorOptions(['Todos Professores', ...unique]);
      } catch (error) {
        console.error('Erro ao carregar professores:', error);
      }
    };

    loadProfessores();
  }, []);


  const handleForceSync = async () => {
    try {
      await alunosService.syncAlunos();
      reload()
      // ✅ USANDO O NOVO SISTEMA DE ALERT
      showAlert({
        type: 'success',
        title: 'Sincronização concluída!',
        message: 'Os dados foram sincronizados com o servidor.',
        duration: 3000
      });

    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro na sincronização',
        message: 'Não foi possível sincronizar com o servidor.',
        duration: 5000
      });
    }
  };

  const abrirAluno = (alunoId: string) => {
    nav(`/alunos/${alunoId}`);
  };

  const estadoSet = ["Todos estados", "ativo", "inativo", "transferido", "desistente"];
  const anoLectivoSet = ["Todos ano lectivos", "2024-2025", "2025-2026", "2026-2027","2027-2028", "2028-2029", "2030-2031"];
  const disciplinasReforcoSet = useMemo(() => {
    const disciplinas = new Set<string>();
    students
      .filter((student) => student.tipo_matricula === 'reforco_personalizado')
      .forEach((student) => (student.disciplinas_reforco || []).forEach((disc) => disciplinas.add(disc)));
    return ['Todas disciplinas de reforço', ...Array.from(disciplinas).sort((a, b) => a.localeCompare(b))];
  }, [students]);

  // Extrair projfessores e turmas únicos
  const { professores, turmas } = useMemo(() => {
    const profsSet = new Set<string>();
    const turmsSet = new Set<string>();

    students.forEach(student => {
      if (student.professor) profsSet.add(student.professor);
      if (student.turma_nome) turmsSet.add(student.turma_nome);
    });

    return {
      professores: professorOptions.length > 0
        ? professorOptions
        : ['Todos Professores', ...Array.from(profsSet)],
      turmas: ['Todas Turmas', ...Array.from(turmsSet)]
    };
  }, [students, professorOptions]);

  // Carregar alunos
  const reload = async () => {
    try {
      setLoading(true);
      const studentsData = await alunosService.getAllStudents();
      setStudents(studentsData);
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro ao carregar dados',
        message: 'Não foi possível carregar os alunos da base de dados.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  // Função para deletar aluno
  const handleDeleteStudent = async (student: Student) => {
    const confirmed = await confirm({

      type: 'delete',
      title: 'Excluir Aluno',
      message: `Tem certeza que deseja excluir ${student.nome_completo}? Os dados ligados a ele permanecerão.`,
      isDestructive: true,
      confirmText: 'Excluir',
      onConfirm: async () => {
        try {
          await alunosService.deleteStudent(student.id);
          setStudents(prev => prev.filter(s => s.id !== student.id));
          reload();
          showAlert({
            type: 'success',
            title: 'Aluno excluído!',
            message: `${student.nome_completo} foi removido do sistema.`,
            duration: 3000
          });

        } catch (error) {
          showAlert({
            type: 'error',
            title: 'Erro ao excluir',
            message: 'Não foi possível excluir o aluno. Verifique sua conexão.',
            duration: 5000
          });
        }
      }
    });
  };

  // Calcular estatísticas
  const estatisticas = useMemo(() => {
    const alunosFiltrados = students.filter(student => {
      const nomeMatch = student.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const numeroMatch = student.numero_estudante?.toString().includes(searchTerm) || false;
      const matchesSearch = nomeMatch || numeroMatch;

      const matchesProfessor = filtroProfessor === 'Todos Professores' || student.professor === filtroProfessor;
      const matchesTurma = filtroTurma === 'Todas Turmas' || student.turma_nome === filtroTurma;
      const matchesEstado = filtroEstado === 'Todos estados' || student.estado === filtroEstado;
      const matchesAnoLectivo = filtroAnoLectivo === 'Todos ano lectivos' || student.ano_lectivo === filtroAnoLectivo;
      const matchesCartap = isCartao ? student.cartao_pago === true : true;
      const matchesDisciplinaReforco =
        filtroDisciplinaReforco === 'Todas disciplinas de reforço' ||
        (student.tipo_matricula === 'reforco_personalizado' &&
          (student.disciplinas_reforco || []).includes(filtroDisciplinaReforco));

      return (
        matchesSearch &&
        matchesProfessor &&
        matchesTurma &&
        matchesAnoLectivo &&
        matchesEstado &&
        matchesCartap &&
        matchesDisciplinaReforco
      );
    });

    const total = alunosFiltrados.length;
    const ativos = alunosFiltrados.filter(s => s.estado === 'ativo').length;
    const transferidos = alunosFiltrados.filter(s => s.estado === 'transferido').length;
    const desistentes = alunosFiltrados.filter(s => s.estado === 'desistente').length;
    const inativos = transferidos + desistentes;
    const cartaoPago = alunosFiltrados.filter(s => s.cartao_pago).length;

    return {
      total,
      ativos,
      inativos,
      transferidos,
      desistentes,
      cartaoPago,
      percentualCartao: total > 0 ? ((cartaoPago / total) * 100) : 0
    };
  }, [students, searchTerm, filtroProfessor, filtroTurma, filtroAnoLectivo, filtroEstado, isCartao, filtroDisciplinaReforco]);

  // Filtrar alunos para a tabela
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const nomeMatch = student.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const numeroMatch = student.numero_estudante?.toString().includes(searchTerm) || false;
      const matchesSearch = nomeMatch || numeroMatch;

      const matchesProfessor = filtroProfessor === 'Todos Professores' || student.professor === filtroProfessor;
      const matchesTurma = filtroTurma === 'Todas Turmas' || student.turma_nome === filtroTurma;
      const matchesEstado = filtroEstado === 'Todos estados' || student.estado === filtroEstado;
      const matchesAnoLectivo = filtroAnoLectivo === 'Todos ano lectivos' || student.ano_lectivo === filtroAnoLectivo;
      const matchesCartap = isCartao ? student.cartao_pago === true : true;
      const matchesDisciplinaReforco =
        filtroDisciplinaReforco === 'Todas disciplinas de reforço' ||
        (student.tipo_matricula === 'reforco_personalizado' &&
          (student.disciplinas_reforco || []).includes(filtroDisciplinaReforco));

      return (
        matchesSearch &&
        matchesProfessor &&
        matchesTurma &&
        matchesAnoLectivo &&
        matchesEstado &&
        matchesCartap &&
        matchesDisciplinaReforco
      );
    });
  }, [students, searchTerm, filtroProfessor, filtroTurma, filtroAnoLectivo, filtroEstado, isCartao, filtroDisciplinaReforco]);

  const reforcoStudents = useMemo(
    () => filteredStudents.filter((student) => student.tipo_matricula === 'reforco_personalizado'),
    [filteredStudents]
  );

  const reforcoSelectedCount = useMemo(
    () => selectedStudentIds.filter((id) => reforcoStudents.some((student) => student.id === id)).length,
    [selectedStudentIds, reforcoStudents]
  );

  useEffect(() => {
    setSelectedStudentIds((prev) => prev.filter((id) => students.some((student) => student.id === id)));
  }, [students]);

  const handleToggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleToggleSelectAllReforco = () => {
    const reforcoIds = reforcoStudents.map((student) => student.id);
    const allSelected = reforcoIds.length > 0 && reforcoIds.every((id) => selectedStudentIds.includes(id));
    setSelectedStudentIds((prev) => {
      if (allSelected) {
        return prev.filter((id) => !reforcoIds.includes(id));
      }
      const merged = new Set([...prev, ...reforcoIds]);
      return Array.from(merged);
    });
  };

  const normalizeNome = (value: string) =>
    (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  const getOrCreateReforcoCourseId = async (): Promise<string> => {
    const instituicaoId = instituicaoIdValue() || '';
    if (!instituicaoId) {
      throw new Error('instituicao_id ausente para criar/usar curso Reforço.');
    }

    const cursos = await cursosService.getCourses();
    const cursoExistente = (cursos || []).find((curso) => normalizeNome(curso.nome) === 'reforço');
    if (cursoExistente?.id) return cursoExistente.id;

    const novoCursoId = await cursosService.create({
      nome: 'Reforço',
      preco: 2500,
      duracao: '3 meses',
      disciplinas: ['Reforço'],
      vagas: 99,
      descricao: 'Curso padrao para turmas ficticias de reforco personalizado',
      ativo: true,
      instituicao_id: instituicaoId,
    });

    return novoCursoId;
  };

  const ensureTurmaHasCurso = async (turmaId: string): Promise<void> => {
    const turma = await turmaService.getTurmaById(turmaId);
    if (!turma) return;

    if (!turma.curso_id || !turma.curso_id.trim()) {
      const reforcoCourseId = await getOrCreateReforcoCourseId();
      await turmaService.editTurma(turmaId, { curso_id: reforcoCourseId });
    }
  };

  const openSectionModal = async () => {
    if (reforcoSelectedCount === 0) {
      showAlert({
        type: 'warning',
        title: 'Selecione alunos de reforço',
        message: 'Escolha pelo menos um aluno de reforço personalizado na lista.',
        duration: 3500,
      });
      return;
    }

    try {
      const listaTurmas = await turmaService.getTurmas();
      setAvailableTurmas((listaTurmas || []).filter((turma) => !turma.deleted && turma.estado === 'ativa'));
      setSectionForm((prev) => ({
        ...prev,
        turmaExistenteId: prev.turmaExistenteId || listaTurmas?.[0]?.id || '',
      }));
      setShowSectionModal(true);
    } catch {
      setAvailableTurmas([]);
      setShowSectionModal(true);
    }
  };

  const handleCreateSection = async () => {
    if (sectionForm.modo === 'nova' && !sectionForm.nomeTurma.trim()) {
      showAlert({
        type: 'warning',
        title: 'Nome obrigatório',
        message: 'Informe o nome da seção/turma fictícia.',
        duration: 3000,
      });
      return;
    }

    if (sectionForm.modo === 'nova' && !sectionForm.professor.trim()) {
      showAlert({
        type: 'warning',
        title: 'Professor obrigatório',
        message: 'Informe o nome do professor responsável.',
        duration: 3000,
      });
      return;
    }

    if (sectionForm.modo === 'existente' && !sectionForm.turmaExistenteId) {
      showAlert({
        type: 'warning',
        title: 'Turma obrigatória',
        message: 'Selecione uma turma existente para vincular os alunos.',
        duration: 3000,
      });
      return;
    }

    const selectedIds = selectedStudentIds.filter((id) =>
      students.some((student) => student.id === id && student.tipo_matricula === 'reforco_personalizado')
    );

    if (selectedIds.length === 0) {
      showAlert({
        type: 'warning',
        title: 'Sem alunos válidos',
        message: 'Selecione alunos de reforço personalizado para criar a seção.',
        duration: 3000,
      });
      return;
    }

    try {
      setCreatingSection(true);
      let turmaId = sectionForm.turmaExistenteId;

      if (sectionForm.modo === 'nova') {
        const reforcoCourseId = await getOrCreateReforcoCourseId();
        turmaId = await turmaService.createTurma({
          nome_turma: sectionForm.nomeTurma.trim(),
          professor: sectionForm.professor.trim(),
          turno: sectionForm.turno,
          curso_id: reforcoCourseId,
          ano_lectivo: sectionForm.anoLectivo,
          capacidade_maxima: Math.max(selectedIds.length, 10),
          estado: 'ativa',
          descricao: 'Turma de apoio para reforço personalizado',
        });
      }

      await ensureTurmaHasCurso(turmaId);

      await Promise.all(
        selectedIds.map((alunoId) =>
          alunosService.updateStudent(alunoId, {
            turma_id: turmaId,
            tipo_matricula: 'reforco_personalizado',
          })
        )
      );

      setSelectedStudentIds((prev) => prev.filter((id) => !selectedIds.includes(id)));
      setShowSectionModal(false);
      setSectionForm((prev) => ({ ...prev, nomeTurma: '', professor: '' }));
      await reload();

      showAlert({
        type: 'success',
        title: sectionForm.modo === 'nova' ? 'Seção criada com sucesso' : 'Alunos vinculados com sucesso',
        message:
          sectionForm.modo === 'nova'
            ? `${selectedIds.length} aluno(s) foram adicionados à nova seção.`
            : `${selectedIds.length} aluno(s) foram adicionados à turma selecionada.`,
        duration: 3500,
      });
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro ao criar seção',
        message: 'Não foi possível criar a seção e vincular os alunos.',
        duration: 5000,
      });
    } finally {
      setCreatingSection(false);
    }
  };

  // Se estiver carregando
  if (loading) {
    return <PageLoader title="Carregando alunos" subtitle="Preparando listagem e filtros..." />;
  }

  return (
    <>
      <div className="space-y-6 p-5">
        {/* Header Principal com Título e Controles */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <motion.div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                  Gestão de Alunos
                </h1>
                <SyncStatusBadge tableName="alunos" />
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                Gerencie os alunos da instituição
              </p>
            </motion.div>
          </div>

          {/* Seção Direita - Controles e Ações */}
          <div className="w-full lg:w-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Barra de Busca */}
              <div className="relative flex-1 min-w-[280px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nome ou número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg
                          bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                          placeholder-gray-500 dark:placeholder-gray-400
                          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          transition-colors duration-200"
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={openSectionModal}
                  className="inline-flex items-center px-4 py-2.5 rounded-lg font-medium border
                          border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100
                          dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700
                          transition-all duration-200"
                >
                  <FiLayers className="mr-2" size={18} />
                  <span>Criar Seção Reforço ({reforcoSelectedCount})</span>
                </button>
                <Link
                  to="/alunos/novo"
                  className="inline-flex items-center px-4 py-2.5 rounded-lg font-medium
                          bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700
                          text-white shadow-sm hover:shadow
                          transition-all duration-200"
                >
                  <FiPlus className="mr-2" size={18} />
                  <span>Novo Aluno</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Banner de Alerta - Aparece apenas se houver pendentes */}
        {syncStats > 0 && (
          <SyncDataDetail
            syncStats={syncStats}
            onlineStatus={onlineStatus}
            handleForceSync={handleForceSync}
            table="alunos"
            data={students.filter(s => s.id.startsWith('local_'))}
          />
        )}

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Alunos Filtrados"
            value={estatisticas.total}
            subtitle={estatisticas.total === students.length ? 'Todos os alunos' : `${((estatisticas.total / students.length) * 100).toFixed(1)}% do total`}
            icon={FaPeopleGroup}
            color="blue"
            trend={estatisticas.total > 0 ? 'positive' : 'neutral'}
          />

          <StatCard
            title="Ativos"
            value={estatisticas.ativos}
            subtitle={estatisticas.total > 0 ? `${((estatisticas.ativos / estatisticas.total) * 100).toFixed(1)}% dos filtrados` : 'Sem dados'}
            icon={FaGraduationCap}
            color="green"
            trend={estatisticas.ativos > 0 ? 'positive' : 'neutral'}
          />

          <StatCard
            title="Inativos"
            value={estatisticas.inativos}
            subtitle={
              <>
                {estatisticas.transferidos > 0 && <span className="text-orange-500">{estatisticas.transferidos}T</span>}
                {estatisticas.transferidos > 0 && estatisticas.desistentes > 0 && ' • '}
                {estatisticas.desistentes > 0 && <span className="text-red-500">{estatisticas.desistentes}D</span>}
              </>
            }
            icon={FiUser}
            color="red"
            trend="neutral"
          />

          <StatCard
            title="Cartão Pago"
            value={estatisticas.cartaoPago}
            subtitle={estatisticas.total > 0 ? `${estatisticas.percentualCartao.toFixed(1)}% dos filtrados` : 'Sem dados'}
            icon={FaBookAtlas}
            color="purple"
            trend={estatisticas.percentualCartao > 50 ? 'positive' : 'neutral'}
            funcion={() => {
              setCartao(!isCartao);
              showAlert({
                type: 'info',
                title: isCartao ? 'Mostrando todos' : 'Filtrando por cartão pago',
                duration: 2000
              });
            }}
          />
        </div>

        {/* Filtros Rápidos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Filtros:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 flex-1">
              <SelectTyped
                vect={professores}
                icon={RxPerson}
                onChange={setFiltroProfessor}
                value={filtroProfessor}
                className="w-full"
              />
              <SelectTyped
                vect={turmas}
                icon={FiLayers}
                onChange={setFiltroTurma}
                value={filtroTurma}
                className="w-full"
              />
              <SelectTyped
                vect={estadoSet}
                icon={FaPeopleGroup}
                onChange={setFiltroEstado}
                value={filtroEstado}
                className="w-full"
              />
              <SelectTyped
                vect={anoLectivoSet}
                icon={FaGraduationCap}
                onChange={setFiltroAnoLectivo}
                value={filtroAnoLectivo}
                className="w-full"
              />
              <SelectTyped
                vect={disciplinasReforcoSet}
                icon={FiLayers}
                onChange={setFiltroDisciplinaReforco}
                value={filtroDisciplinaReforco}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {reforcoStudents.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Subdivisão rápida por disciplina de reforço
            </h3>
            <div className="flex flex-wrap gap-2">
              {disciplinasReforcoSet
                .filter((disc) => disc !== 'Todas disciplinas de reforço')
                .map((disciplina) => {
                  const count = reforcoStudents.filter((student) =>
                    (student.disciplinas_reforco || []).includes(disciplina)
                  ).length;
                  if (count === 0) return null;

                  const isActive = filtroDisciplinaReforco === disciplina;
                  return (
                    <button
                      key={disciplina}
                      onClick={() =>
                        setFiltroDisciplinaReforco(isActive ? 'Todas disciplinas de reforço' : disciplina)
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {disciplina} ({count})
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        <StudentsTable
          filteredStudents={filteredStudents}
          reforcoStudents={reforcoStudents}
          selectedStudentIds={selectedStudentIds}
          searchTerm={searchTerm}
          onToggleSelectAllReforco={handleToggleSelectAllReforco}
          onToggleStudentSelection={handleToggleStudentSelection}
          onOpenStudent={abrirAluno}
          onDeleteStudent={handleDeleteStudent}
          onReload={reload}
        />
      </div>

      <ModalComponent />
      <ReforcoSectionModal
        show={showSectionModal}
        creating={creatingSection}
        selectedCount={reforcoSelectedCount}
        availableTurmas={availableTurmas}
        form={sectionForm}
        onClose={() => setShowSectionModal(false)}
        onChange={(patch) => setSectionForm((prev) => ({ ...prev, ...patch }))}
        onSubmit={handleCreateSection}
      />
    </>
  );
};

export default Students;
