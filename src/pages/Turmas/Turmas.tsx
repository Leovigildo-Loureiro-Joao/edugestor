import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlus, FiBook, FiClock, FiSearch } from 'react-icons/fi';
import { FaGraduationCap } from 'react-icons/fa';
import { turmaService } from '../../services/database';
import { SelectTyped } from '../../components/students/StudentForm';
import { instituicaoIdValue } from '../../utils/getInstituicaoID';
import { StatCard } from '../../components/students/StatCard';
import { SyncStatusBadge } from '../../components/ui/SyncStatusBadge';
import { getPendingCount } from '../../utils/emitPendingSync';
import { useConfirmModal } from '../../components/ui/ComfirmModal';
import { useAlert } from '../../components/ui/AlertBadge';
import { SyncDataDetail } from '../../components/ui/SyncDataDetail';
import { TurmaTable } from '../../components/turmas/TurmasTable'; // Ajuste o path conforme necessário
import { HorarioAula, Turma } from '../../types/turma';
import { PageLoader } from '../../components/ui/PageLoader';
import { createThrottledCallback, shouldHandleDbChangedEvent } from '../../utils/dbChangedEvent';
import { profileService } from '../../services/database/profileService';

interface Estatisticas {
  total: number;
  manha: number;
  tarde: number;
  noite: number;
}

const Turmas: React.FC = () => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [canManageTurmas, setCanManageTurmas] = useState(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filtroTurno, setFiltroTurno] = useState<string>('Todos Turnos');
  const [filtroCurso, setFiltroCurso] = useState<string>('Todos Cursos');
  const [filtroAnoLectivo, setFiltroAnoLectivo] = useState('Todos ano lectivos');
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [syncStats, setSyncStats] = useState(0);
  const [selectedTurmaIds, setSelectedTurmaIds] = useState<string[]>([]);
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [horarioModalLoading, setHorarioModalLoading] = useState(false);
  const [horariosTurmaSelecionada, setHorariosTurmaSelecionada] = useState<HorarioAula[]>([]);
  const [turmaSelecionadaNome, setTurmaSelecionadaNome] = useState('');
  const anoLectivo = ["Todos ano lectivos", "2024-2025", "2025-2026", "2027-2028", "2028-2029", "2030-2031"];
  const { confirm, ModalComponent } = useConfirmModal();
  const { showAlert } = useAlert();
  const nav = useNavigate();

  useEffect(() => {
    Reload();
  }, []);

  useEffect(() => {
      setSelectedTurmaIds((prev) => prev.filter((id) => turmas.some((turma) => turma.id === id)));
    }, [turmas]);

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    const throttledReload = createThrottledCallback(() => {
      Reload();
    }, 2500);
    
    const handleDbChanged = (event: Event) => {
      if (shouldHandleDbChangedEvent(event, ['turmas'])) {
        throttledReload();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('db-changed', handleDbChanged);
    
    const loadSyncStats = async () => {
      try {
        const turmasPendentes = await getPendingCount("turmas");
        setSyncStats(turmasPendentes);
      } catch (error) {
        console.error('Erro ao carregar sync stats:', error);
      }
    };

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
      await turmaService.syncTurmas();
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
    const loadTurmas = async (): Promise<void> => {
      try {
        setLoading(true);
        const turmasData: Turma[] = await turmaService.getTurmas();
        const profile = await profileService.getLocalProfile();
        const role = profile?.role || localStorage.getItem('user_role');
        setCanManageTurmas(role !== 'teacher');
        const teacherNameKey = (profile?.full_name || profile?.nome || profile?.email || '').toLowerCase().trim();

        if (role === 'teacher' && teacherNameKey) {
          setTurmas(
            (turmasData || []).filter(
              (t) => (t.professor || '').toLowerCase().trim() === teacherNameKey
            )
          );
          return;
        }

        setTurmas(turmasData);
      } catch (error) {
        showAlert({
          type: 'error',
          title: 'Erro ao carregar dados!',
          message: `Não foi possível carregar as turmas da base de dados.`,
          duration: 5000
        });
        console.error('Erro ao carregar turmas:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTurmas();
  }

  const { cursosInst } = useMemo(() => {
    const cursosSet = new Set<string>();
    turmas.forEach(curso => {
      if (curso.curso_nome) {
        cursosSet.add(curso.curso_nome);
      }
    });
    return {
      cursosInst: ['Todos Cursos', ...Array.from(cursosSet)],
    };
  }, [turmas]);

  const handleDelete = async (turmaSel: Turma): Promise<void> => {
    if (!canManageTurmas) {
      showAlert({
        type: 'warning',
        title: 'Ação não permitida',
        message: 'Professores não podem excluir turmas.',
        duration: 3000
      });
      return;
    }

    const confirmed = await confirm({
      type: 'delete',
      title: 'Excluir Turma',
      message: `Tem certeza que deseja excluir ${turmaSel.nome_turma}? Todos dados ligados a ela permanecerão.`,
      isDestructive: true,
      confirmText: 'Excluir',
      onClose() {
        
      },
      onConfirm: async () => {
        try {
          await turmaService.deleteTurma(turmaSel.id);
          setTurmas(turmas.filter(t => t.id !== turmaSel.id));
          showAlert({
            type: 'success',
            title: 'Turma excluída!',
            message: `${turmaSel.nome_turma} foi removida do sistema.`,
            duration: 3000
          });
        } catch (error) {
          showAlert({
            type: 'error',
            title: 'Erro ao excluir',
            message: 'Não foi possível excluir a turma. Verifique sua conexão.',
            duration: 5000
          });
        }
      }
    });
  };

  const handleViewHorario = async (turmaSel: Turma): Promise<void> => {
    try {
      setTurmaSelecionadaNome(turmaSel.nome_turma || 'Turma');
      setShowHorarioModal(true);
      setHorarioModalLoading(true);
      const horarios = await turmaService.getHorarios(turmaSel.id);
      setHorariosTurmaSelecionada((horarios || []).filter((h: HorarioAula) => !h.deleted));
    } catch (error) {
      setHorariosTurmaSelecionada([]);
      showAlert({
        type: 'error',
        title: 'Erro ao carregar horarios',
        message: 'Nao foi possivel carregar os horarios desta turma.',
        duration: 4000
      });
    } finally {
      setHorarioModalLoading(false);
    }
  };

  const horariosOrdenados = useMemo(() => {
    const ordemDias: Record<string, number> = {
      segunda: 1,
      terca: 2,
      'terca-feira': 2,
      quarta: 3,
      quinta: 4,
      sexta: 5,
      sabado: 6,
      domingo: 7
    };
    return [...horariosTurmaSelecionada].sort((a, b) => {
      const diaA = ordemDias[(a.dia_semana || '').toLowerCase()] || 99;
      const diaB = ordemDias[(b.dia_semana || '').toLowerCase()] || 99;
      if (diaA !== diaB) return diaA - diaB;
      return (a.hora_inicio || '').localeCompare(b.hora_inicio || '');
    });
  }, [horariosTurmaSelecionada]);

  const turmasFiltradas: Turma[] = turmas.filter((turma: Turma) => {
    const matchesSearch = turma.nome_turma?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTurno = filtroTurno === 'Todos Turnos' || turma.turno === filtroTurno;
    const matchesCurso = filtroCurso === 'Todos Cursos' || turma.curso_nome === filtroCurso;
    const matchesAnoLectivo = filtroAnoLectivo === 'Todos ano lectivos' || turma.ano_lectivo === filtroAnoLectivo;
    return matchesSearch && matchesTurno && matchesCurso && matchesAnoLectivo;
  });

  const estatisticas: Estatisticas = {
    total: turmasFiltradas.length,
    manha: turmasFiltradas.filter(t => t.turno.toLowerCase() === 'manhã').length,
    tarde: turmasFiltradas.filter(t => t.turno.toLowerCase() === 'tarde').length,
    noite: turmasFiltradas.filter(t => t.turno.toLowerCase() === 'noite').length
  };

  if (loading) {
    return <PageLoader title="Carregando turmas" subtitle="Preparando listagem e filtros..." />;
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                Gestão de Turmas
              </h1>
              <SyncStatusBadge tableName="turmas" />
            </div>            
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Gerencie as turmas da instituição</p>
          </motion.div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Busca */}
            <div className="relative flex-1 min-w-[300px]">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {canManageTurmas && (
              <Link
                to="/turmas/nova"
                className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-2.5 transition-colors rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 whitespace-nowrap font-medium"
              >
                <FiPlus size={18} />
                <span>Nova Turma</span>
              </Link>
            )}
          </div>
        </div>

        {syncStats > 0 && (
          <SyncDataDetail
            syncStats={syncStats}
            onlineStatus={onlineStatus}
            handleForceSync={handleForceSync}
            table="turmas"
            data={turmas.filter(t => t.id.startsWith('local_'))}
          />
        )}

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg">
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <SelectTyped 
                vect={['Todos Turnos', 'Manhã', 'Tarde', 'Noite']} 
                icon={FiClock} 
                onChange={setFiltroTurno}
                darkMode
              />
            </div>
            <div className="flex-1">
              <SelectTyped 
                vect={cursosInst} 
                icon={FiBook} 
                onChange={setFiltroCurso}
                darkMode
              />
            </div>
            <div className="flex-1">
              <SelectTyped 
                vect={anoLectivo} 
                icon={FaGraduationCap} 
                onChange={setFiltroAnoLectivo}
                value={filtroAnoLectivo}
              />
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard 
            color="blue"
            icon={FiBook}
            title="Turmas Filtradas"
            subtitle={estatisticas.total === turmas.length ? 'Todas turmas' : `${((estatisticas.total / turmas.length) * 100).toFixed(1)}% do total`}
            value={estatisticas.total}
            trend={estatisticas.total > 0 ? 'positive' : 'neutral'}
          />
          <StatCard 
            color="orange"
            icon={FiClock}
            title="Manhã"
            subtitle={estatisticas.manha === turmasFiltradas.length ? 'Manhã' : `${((estatisticas.manha / turmasFiltradas.length) * 100).toFixed(1)}% do total`}
            value={estatisticas.manha}
            trend={estatisticas.manha > 0 ? 'positive' : 'neutral'}
          />
          <StatCard 
            color="green"
            icon={FiClock}
            title="Tarde"
            subtitle={estatisticas.tarde === turmasFiltradas.length ? 'Tarde' : `${((estatisticas.tarde / turmasFiltradas.length) * 100).toFixed(1)}% do total`}
            value={estatisticas.tarde}
            trend={estatisticas.tarde > 0 ? 'positive' : 'neutral'}
          />
          <StatCard 
            color="purple"
            icon={FiClock}
            title="Noite"
            subtitle={estatisticas.noite === turmasFiltradas.length ? 'Noite' : `${((estatisticas.noite / turmasFiltradas.length) * 100).toFixed(1)}% do total`}
            value={estatisticas.noite}
            trend={estatisticas.noite > 0 ? 'positive' : 'neutral'}
          />
        </div>

        {/* Tabela/Cards de Turmas */}
        <TurmaTable
          turmas={turmasFiltradas}
          selectTurmaIds={selectedTurmaIds}
          onDelete={handleDelete}
          onViewHorario={handleViewHorario}
          onReload={Reload}
          searchTerm={searchTerm}
          canManageActions={canManageTurmas}
        />
      </div>

      {showHorarioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Horario da turma</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{turmaSelecionadaNome}</p>
              </div>
              <button
                onClick={() => {
                  setShowHorarioModal(false);
                  setHorariosTurmaSelecionada([]);
                }}
                className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
              >
                Fechar
              </button>
            </div>

            <div className="p-4 max-h-[65vh] overflow-y-auto">
              {horarioModalLoading ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">Carregando horarios...</p>
              ) : horariosOrdenados.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">Nenhum horario cadastrado para esta turma.</p>
              ) : (
                <div className="space-y-2">
                  {horariosOrdenados.map((horario) => (
                    <div
                      key={horario.id}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/30"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {horario.disciplina || 'Disciplina'}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {horario.dia_semana} | {horario.hora_inicio} - {horario.hora_fim}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Sala: {horario.sala || 'N/A'} | Prof: {horario.professor_responsavel || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ModalComponent />
    </>
  );
};

export default Turmas;
