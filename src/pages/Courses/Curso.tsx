import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlus, FiBook, FiClock, FiSearch, FiUsers, FiBookOpen } from 'react-icons/fi';
import { FaMoneyBillWave, FaChalkboardTeacher } from 'react-icons/fa';
import { SelectTyped } from '../../components/students/StudentForm';
import { StatCard } from '../../components/students/StatCard';
import { SyncStatusBadge } from '../../components/ui/SyncStatusBadge';
import { getPendingCount } from '../../utils/emitPendingSync';
import { useConfirmModal } from '../../components/ui/ComfirmModal';
import { useAlert } from '../../components/ui/AlertBadge';
import { SyncDataDetail } from '../../components/ui/SyncDataDetail';
import { CourseTable } from '../../components/cousers/CourseTable'; // Ajuste o path
import { cursosService } from '../../services/database';
import { Course } from '../../types/curso';
import { PageLoader } from '../../components/ui/PageLoader';
import { createThrottledCallback, shouldHandleDbChangedEvent } from '../../utils/dbChangedEvent';

export const Courses = () => {
  const [cursos, setCursos] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos Status');
  const [filtroDisciplina, setFiltroDisciplina] = useState<string>('Todas disciplinas');
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [syncStats, setSyncStats] = useState(0);
  
  const { confirm, ModalComponent } = useConfirmModal();
  const { showAlert } = useAlert();
  const nav = useNavigate();

  const { status, disciplinas } = useMemo(() => {
    const stats = ['Todos Status', 'Ativos', 'Inativos'];
    const todasDisciplinas = cursos.flatMap(curso => 
      curso.disciplinas.filter(disciplina => disciplina && disciplina.trim() !== "")
    );
    const disciplinasUnicas = ['Todas disciplinas', ...new Set(todasDisciplinas)];
    return {
      status: stats,
      disciplinas: disciplinasUnicas
    };
  }, [cursos]);

  useEffect(() => {
    Reload();
  }, []);

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    const throttledReload = createThrottledCallback(() => {
      Reload();
    }, 2500);
    
    const handleDbChanged = (event: Event) => {
      if (shouldHandleDbChangedEvent(event, ['cursos'])) {
        throttledReload();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('db-changed', handleDbChanged);
    
    const loadSyncStats = async () => {
      try {
        const turmasPendentes = await getPendingCount("cursos");
        setSyncStats(turmasPendentes);
      } catch (error) {
        console.error('Erro ao carregar sync stats:', error);
      }
    };

    loadSyncStats();
    
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

  const handleForceSync = async () => {
    try {
      await cursosService.syncCursos();
      Reload();
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

  function Reload() {
    localStorage.setItem("last_rota", "/cursos");
    const loadCursos = async () => {
      try {
        setLoading(true);
        const cursosData = await cursosService.getCourses();
        setCursos(cursosData || []);
      } catch (error) {
        console.error('Erro ao carregar cursos:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCursos();
  }

  const estatisticas = useMemo(() => {
    const cursosFiltrados = cursos.filter(curso => {
      const matchesSearch = curso.nome?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filtroStatus === 'Todos Status' || 
                          (filtroStatus === 'Ativos' && curso.ativo) ||
                          (filtroStatus === 'Inativos' && !curso.ativo);
      const matchesDisciplinas = filtroDisciplina === 'Todas disciplinas' || curso.disciplinas.includes(filtroDisciplina);
      
      return matchesSearch && matchesStatus && matchesDisciplinas;
    });

    const total = cursosFiltrados.length;
    const ativos = cursosFiltrados.filter(c => c.ativo).length;
    const inativos = cursosFiltrados.filter(c => !c.ativo).length;
    const totalVagas = cursosFiltrados.reduce((acc, cur) => acc + cur.vagas, 0);
    const totalInscritos = cursosFiltrados.reduce((acc, cur) => acc + (cur.alunos ?? 0), 0);
    const taxaOcupacao = totalVagas > 0 ? (totalInscritos / totalVagas) * 100 : 0;
    const receitaPotencial = cursosFiltrados.reduce((acc, cur) => acc + (cur.preco * (cur.alunos ?? 0)), 0);

    return {
      total,
      ativos,
      inativos,
      totalVagas,
      totalInscritos,
      taxaOcupacao,
      receitaPotencial
    };
  }, [cursos, searchTerm, filtroDisciplina, filtroStatus]);

  const filteredCourses = cursos.filter(curso => {
    const matchesSearch = curso.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filtroStatus === 'Todos Status' || 
                        (filtroStatus === 'Ativos' && curso.ativo) ||
                        (filtroStatus === 'Inativos' && !curso.ativo);
    const matchesDisciplinas = filtroDisciplina === 'Todas disciplinas' || curso.disciplinas.includes(filtroDisciplina);
    return matchesSearch && matchesStatus && matchesDisciplinas;
  });

  const deleteCurso = async (curso: Course) => {
    const confirmed = await confirm({
      type: 'delete',
      title: 'Excluir Curso',
      message: `Tem certeza que deseja excluir ${curso.nome}? Todos dados ligados a ele permanecerão.`,
      isDestructive: true,
      confirmText: 'Excluir',
      onConfirm: async () => {
        try {
          await cursosService.deleteCourse(curso.id);
          setCursos(cursos.filter(t => t.id !== curso.id));
          showAlert({
            type: 'success',
            title: 'Curso excluído!',
            message: `${curso.nome} foi removido do sistema.`,
            duration: 3000
          });
        } catch (error) {
          showAlert({
            type: 'error',
            title: 'Erro ao excluir',
            message: 'Não foi possível excluir o curso. Verifique sua conexão.',
            duration: 5000
          });
        }
      }
    });
  };

  if (loading) {
    return <PageLoader title="Carregando cursos" subtitle="Preparando listagem e estatísticas..." />;
  }

  return (
    <>
      <div className="space-y-6 p-4 dark:bg-gray-900 min-h-screen">
        {/* Cabeçalho */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">Gestão de Cursos</h1>
              <SyncStatusBadge tableName="cursos" />
            </div>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Gerencie os cursos da instituição</p>
          </motion.div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/cursos/novo"
              className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 my-5 hover:to-indigo-800 text-white px-4 py-2.5 transition-all rounded-md hover:bg-primary-700 flex items-center justify-center space-x-2 whitespace-nowrap"
            >
              <FiPlus size={18} />
              <span>Novo Curso</span>
            </Link>
          </div>
        </div>

        {syncStats > 0 && (
          <SyncDataDetail
            syncStats={syncStats}
            onlineStatus={onlineStatus}
            handleForceSync={handleForceSync}
            table="cursos"
            data={filteredCourses}
          />
        )}

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 px-0">
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-[300px]">
              <FiSearch className="absolute left-3 top-5 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <SelectTyped 
                vect={status} 
                icon={FiUsers} 
                onChange={setFiltroStatus}
                value={filtroStatus}
              />
            </div>
            <div className="flex-1">
              <SelectTyped 
                vect={disciplinas} 
                icon={FiBookOpen} 
                onChange={setFiltroDisciplina}
                value={filtroDisciplina}
              />
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard 
            title="Cursos Filtrados" 
            value={estatisticas.total}
            subtitle={estatisticas.total === cursos.length ? 'Todos os cursos' : `${((estatisticas.total / cursos.length) * 100).toFixed(1)}% do total`}
            icon={FiBook}
            color="blue"
            trend={estatisticas.total > 0 ? 'positive' : 'neutral'}
          />
          <StatCard 
            title="Alunos Inscritos" 
            value={estatisticas.totalInscritos}
            subtitle={`${estatisticas.taxaOcupacao.toFixed(1)}% das vagas ocupadas`}
            icon={FiUsers}
            color="red"
            trend={estatisticas.totalInscritos > 0 ? 'positive' : 'neutral'}
          />
          <StatCard 
            title="Cursos Ativos" 
            value={estatisticas.ativos}
            subtitle={estatisticas.total > 0 ? `${((estatisticas.ativos / estatisticas.total) * 100).toFixed(1)}% dos filtrados` : 'Sem dados'}
            icon={FaChalkboardTeacher}
            color="purple"
            trend={estatisticas.ativos > 0 ? 'positive' : 'neutral'}
          />
          <StatCard 
            title="Receita Potencial" 
            value={`${(estatisticas.receitaPotencial / 1000).toFixed(0)}K AOA`}
            subtitle="Valor mensal estimado"
            icon={FaMoneyBillWave}
            color="green"
            trend={estatisticas.receitaPotencial > 0 ? 'positive' : 'neutral'}
          />
        </div>

        {/* Indicador de Filtros Ativos */}
        {(searchTerm || filtroDisciplina !== 'Todas disciplinas' || filtroStatus !== 'Todos Status') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Filtros ativos:</span>
                {searchTerm && (
                  <span className="inline-flex items-center bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
                    🔍 {searchTerm}
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="ml-2 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filtroDisciplina !== 'Todas disciplinas' && (
                  <span className="inline-flex items-center bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
                    <FiBookOpen className='mr-2'/> 
                    {filtroDisciplina}
                    <button 
                      onClick={() => setFiltroDisciplina('Todas disciplinas')}
                      className="ml-2 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filtroStatus !== 'Todos Status' && (
                  <span className="inline-flex items-center bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
                    {filtroStatus === 'Ativos' ? '✅ Ativos' : '❌ Inativos'}
                    <button 
                      onClick={() => setFiltroStatus('Todos Status')}
                      className="ml-2 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFiltroDisciplina('Todas disciplinas');
                  setFiltroStatus('Todos Status');
                }}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium whitespace-nowrap"
              >
                Limpar todos os filtros
              </button>
            </div>
          </div>
        )}

        {/* Tabela/Cards de Cursos */}
        <CourseTable
          cursos={filteredCourses}
          onDelete={deleteCurso}
          onReload={Reload}
          searchTerm={searchTerm}
        />
      </div>
      <ModalComponent />
    </>
  );
};

export default Courses;
