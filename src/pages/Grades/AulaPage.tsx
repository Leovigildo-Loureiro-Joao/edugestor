import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPlus, FiCalendar, FiClock, FiBook, FiUsers, 
  FiEdit2, FiTrash2, FiFilter, FiRefreshCw, FiX,
  FiBarChart2, FiTarget, FiMessageSquare, FiCheckCircle,
  FiUpload, FiDownload, FiTrendingUp, FiEye, FiStar,
  FiCopy,
  FiAlertCircle,
  FiTrendingDown,
  FiChevronDown
} from 'react-icons/fi';
import { aulaService } from '../../services/database/aulaService.ts';
import { AulaForm } from '../../components/aulas/AulaForm.tsx';
import { AulaCardTurma, AulaStatus } from '../../components/aulas/AulaCard-min.tsx';
import { Aula, AulaFormData } from '../../types/aula.ts';
import { HorarioAula, Turma } from '../../types/turma.ts';
import { SelectTyped } from '../../components/students/StudentForm.tsx';
import { toast } from 'react-hot-toast';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { ModalDetalhesAula } from '../../components/aulas/AulaModal.tsx';
import { ListaView, ViewModeNavbar } from '../../components/aulas/AulaLista.tsx';
import { TimelineWindows } from '../../components/aulas/TimelineAulas.tsx';
import { ModalFrequencia } from '../../components/attendance/FrequeciaModal.tsx';
import { Student } from '../../types/aluno.ts';
import { frequenciaService } from '../../services/database/frequenciaService.ts';
import { RegistroFrequenciaLote } from '../../types/frequencia.ts';
import { estrategiaService } from '../../services/database/estrategiaService.ts';
import { SyncStatusBadge } from '../../components/ui/SyncStatusBadge.tsx';
import {  useConfirmModal } from '../../components/ui/ComfirmModal.tsx';
import { useAlert } from '../../components/ui/AlertBadge.tsx';
import { getDiaSemanaFromDate } from '../../utils/getDiaDaSemana.ts';
import { ModalPlanoAula } from '../../components/aulas/PlanoAulasModal.tsx';
import { SyncDataDetail } from '../../components/ui/SyncDataDetail.tsx';
import { planoAulaService, PlanoAula } from '../../services/database/planoAulasService.ts';
import CalendarioMini from '../../components/aulas/CalendarioMin.tsx';
import { useNavigate, useParams } from 'react-router-dom';
import db from '../../services/database/db.ts';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID.ts';
import { alunosService, turmaService } from '../../services/database/index.ts';
import { AulasPageHeader } from '../../components/aulas/AulasPageHeader.tsx';
import { AulasStatsGrid } from '../../components/aulas/AulasStatsGrid.tsx';
import { AulaQuickAddModal } from '../../components/aulas/AulaQuickAddModal.tsx';
import { PlanoDetalhes } from '../../components/aulas/PlanoAulaDetalhesModal.tsx';
import { PlanoAulaComponent } from '../../components/aulas/PlanoAulaPage.tsx';
import { PlaneamentoComponent } from '../../components/aulas/PlaneametoComponent.tsx';
import { GraficoComponent } from '../../components/aulas/GraficoComponent.tsx';
import TabNavigation from '../../components/ui/TabNavigation.tsx';
import { PageLoader } from '../../components/ui/PageLoader.tsx';
import { usePagination } from '../../hooks/usePagination.ts';
import { PaginationControls } from '../../components/ui/PaginationControls.tsx';

export const AulasPage = () => {
  const {seccao} = useParams()
  const navigate= useNavigate()
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [aulaExpandida, setAulaExpandida] = useState<Aula | null>(null);
  const [loading, setLoading] = useState(false);
  const [aulaSelect, setAulaSelect] = useState<Aula | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTurma, setQuickAddTurma] = useState('');
  const [quickAddData, setQuickAddData] = useState(new Date().toISOString().split('T')[0]);
  const [aulaEditando, setAulaEditando] = useState<Aula | null>(null);
  const [filtroData, setFiltroData] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('Todas Turmas');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [horarios, setHorarios] = useState<HorarioAula[]>([]);
  const [disciplinas, setDisciplinas] = useState<string[]>([]);
  const [estatisticas, setEstatisticas] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'timeline' | 'list'>(seccao as 'cards' | 'timeline' | 'list'||"cards");
  const [sortBy, setSortBy] = useState('data_desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const [alunos,setAlunos]=useState<Student[]>([])
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [syncStats, setSyncStats] = useState(0);
  const [showPlaneamento, setShowPlaneamento] = useState(false);
  
  const [planosAula, setPlanosAula] = useState<PlanoAula[]>([]);
  const [planoDetalhes, setPlanoDetalhes] = useState<PlanoAula | null>(null);
  const [planoTemplate, setPlanoTemplate] = useState<Partial<PlanoAula> | null>(null);
  const [planoEditar, setPlanoEditar] = useState<PlanoAula | null>(null);
  const { confirm, ModalComponent } = useConfirmModal();
  const { showAlert } = useAlert();   
  const [isExpanded,setExpanded]=useState(false)
  const [metas,setMetas]=useState<{
                      label:string,
                      atual:number,
                      meta:number,
                      kpi:{
                        label:string,
                        atual:number,
                        meta:number
                      }[]|undefined
                    }[]>([])
    // Atualizar contador de filtros
  const aulasLive = useLiveQuery<Aula[]>(async () => {
    const [todasAulas, todasTurmas, todasFrequencias] = await Promise.all([
      db.aulas.filter((aula) => !aula.deleted && aula.instituicao_id === instituicaoIdValue()).toArray(),
      db.turmas.filter((turma) => !turma.deleted && turma.instituicao_id === instituicaoIdValue()).toArray(),
      db.frequencias.filter((registro) => !registro.deleted && registro.instituicao_id === instituicaoIdValue()).toArray()
    ]);

    const turmaMap = new Map(todasTurmas.map((turma) => [turma.id, turma]));

    return todasAulas
      .sort((a, b) => new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime())
      .map((aula) => ({
        ...aula,
        turmas: turmaMap.get(aula.turma_id),
        registro: todasFrequencias.filter((f) => f.aula_id === aula.id)
      }));
  }, []);

  const turmasLive = useLiveQuery<Turma[]>(async () => {
    const [todasTurmas, todosCursos, todasAulas, todosAlunos, todosHorarios] = await Promise.all([
      turmaService.getTurmas(),
      db.cursos.filter((curso) => !curso.deleted && curso.instituicao_id === instituicaoIdValue()).toArray(),
      aulaService.getAllAulas(),
      alunosService.getAllStudents(),
      db.turma_horarios.filter((horario) => !horario.deleted && horario.instituicao_id === instituicaoIdValue()).toArray()
    ]);

    const cursosMap = new Map(todosCursos.map((curso) => [curso.id, curso.nome]));

    const alunosPorTurma = todosAlunos.reduce((acc, aluno) => {
      if (!aluno.turma_id) return acc;
      acc[aluno.turma_id] = (acc[aluno.turma_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const aulasPorTurma = todasAulas.reduce((acc, aula) => {
      if (!aula.turma_id) return acc;
      if (!acc[aula.turma_id]) acc[aula.turma_id] = [];
      acc[aula.turma_id].push(aula);
      return acc;
    }, {} as Record<string, Aula[]>);

    const horariosPorTurma = todosHorarios.reduce((acc, horario) => {
      if (!acc[horario.turma_id]) acc[horario.turma_id] = [];
      acc[horario.turma_id].push(horario);
      return acc;
    }, {} as Record<string, HorarioAula[]>);

    return todasTurmas
      .sort((a, b) => (a.nome_turma || '').localeCompare(b.nome_turma || ''))
      .map((turma) => ({
        ...turma,
        curso_nome: turma.curso_id ? cursosMap.get(turma.curso_id) : undefined,
        qtd: alunosPorTurma[turma.id] || 0,
        aulas: aulasPorTurma[turma.id] || [],
        horarios: horariosPorTurma[turma.id] || []
      }));
  }, []);

  const planosAulaLive = useLiveQuery<PlanoAula[]>(async () => {
    const planos = await db.plano_aulas.filter((plano) => !plano.deleted && plano.instituicao_id === instituicaoIdValue()).toArray();
    return planos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, []);

        const [isMobile, setIsMobile] = useState(false);

      useEffect(() => {
        const checkMobile = () => {
          setIsMobile(window.innerWidth < 640);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
      }, []);



  const pendentesAulasLive = useLiveQuery<number>(async () => {
    const instituicaoId = instituicaoIdValue();
    if (!instituicaoId) return 0;
    return db.syncQueue
      .where('instituicao_id')
      .equals(instituicaoId)
      .and((item) => item.table === 'aulas' && item.status === 'pending')
      .count();
  }, [], 0);

  const activeTab=useMemo(()=>{
    return seccao?seccao:"lista"
  },[seccao])
  
  useEffect(() => {
    let count = 0;
    if (filtroData) count++;
    if (filtroTurma !== 'Todas Turmas') count++;
    if (filtroStatus !== 'Todos') count++;
    setFilterCount(count);

  }, [filtroData, filtroTurma, filtroStatus]);

    const registrarFrequencia = async (registros:RegistroFrequenciaLote) => {
      try {
        
        let p=0
        for (const element of registros.registros) {
          if(element.participacao)
            p++
        }
        const participacao=(p*100)/registros.registros.length
        aulaService.atualizarAula(registros.aula_id,{
          taxa_participacao:participacao
        })
        console.log('📝 Registrando frequência para aula:', registros);
        await frequenciaService.registrarFrequenciaLote(registros);
        
        setAulas(prev => prev.filter(aula => aula.id !== registros.aula_id));
        showAlert({
          type: 'success',
          title: 'Registrado com sucesso',
          message: 'Frequência registrada e aula removida da lista de aulas pendentes',
          duration: 2000
        });
        
        setTimeout(() => {
          setAulaSelect(null)
          loadData();
        }, 500);
        
      } catch (error) {
        showAlert({
          type: 'error',
          title: 'Erro ao registrar frequências',
          message: 'Não foi possível registrar a presença dos alunos.',
          duration: 5000
        });
        console.error('❌ Erro ao registrar frequência:', error);
      }
    };

  // Filtros expandíveis
  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <motion.div
        initial={{ opacity: 0, height: 0,overflow:"hidden" }}
        animate={{ opacity: 1, height: 'auto',overflow:"" }}
        exit={{ opacity: 0, height: 0,overflow:"hidden" }}
        className=" z-50"
      >
        <div className="bg-gray-50 dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro de Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data
              </label>
              <input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Filtro de Turma */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Turma
              </label>
              <SelectTyped
                value={filtroTurma}
                vect={["Todas Turmas",...(turmas.map((t)=> t.nome_turma))]}
                onChange={(e:any) => setFiltroTurma(e)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
             
            </div>

            {/* Filtro de Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <SelectTyped
                value={filtroStatus}
                vect={["Todos","ministrada","planeada","adiada","cancelada"]}
                onChange={(e:any) => setFiltroStatus(e)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
               
            </div>
          </div>

          {/* Botões de ação dos filtros */}
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => {
                setFiltroData('');
                setFiltroTurma('Todas Turmas');
                setFiltroStatus('Todos');
              }}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Limpar Filtros
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Aplicar
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  // Estado para controlar a aba ativa
  

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (aulasLive) {
      setAulas(aulasLive);
    }
  }, [aulasLive]);

  useEffect(() => {
    if (turmasLive) {
      setTurmas(turmasLive);
      const horarios = turmasLive.flatMap((turma) => turma.horarios || []);
      setHorarios(horarios);
    }
  }, [turmasLive]);

  useEffect(() => {
    if (planosAulaLive) {
      setPlanosAula(planosAulaLive);
    }
  }, [planosAulaLive]);

  useEffect(() => {
    setSyncStats(pendentesAulasLive || 0);
  }, [pendentesAulasLive]);

  // Carregar disciplinas únicas
  useEffect(() => {
    const disciplinasUnicas = [...new Set(aulas.map(a => a.disciplina))];
    setDisciplinas(['Todas Disciplinas', ...disciplinasUnicas]);
  }, [aulas]);

  const loadData = async () => {
    try {
      setLoading(true);
    
      const [stats, metasP] = await Promise.all([
        aulaService.getEstatisticas(),
        estrategiaService.getMetasAdemicas()
      ]);
      setMetas(metasP)
      setEstatisticas(stats);
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro ao carregar os dados',
        message: 'Não foi possivel aceder a base de dados. Verifique sua conexão.',
        duration: 5000
      });
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados das aulas');
    } finally {
      setLoading(false);
    }
  };

  const aulasFiltradas = useMemo(() => {
    const filtradas = aulas.length === 0 ? [] : aulas.filter((aula) => {
      const matchesTurma = filtroTurma === "Todas Turmas" || filtroTurma === aula.turmas?.nome_turma;
      const matchesStatus = filtroStatus === "Todos" || filtroStatus === aula.status;
      const matchesData = filtroData === "" || filtroData === aula.data_aula;
      return matchesTurma && matchesStatus && matchesData;
    });

    const sorted = [...filtradas];
    switch (sortBy) {
      case 'data_desc':
        sorted.sort((a: Aula, b: Aula) => new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime());
        break;
      case 'data_asc':
        sorted.sort((a: Aula, b: Aula) => new Date(a.data_aula).getTime() - new Date(b.data_aula).getTime());
        break;
      case 'disciplina_asc':
        sorted.sort((a: Aula, b: Aula) => a.disciplina.localeCompare(b.disciplina));
        break;
      case 'disciplina_desc':
        sorted.sort((a: Aula, b: Aula) => b.disciplina.localeCompare(a.disciplina));
        break;
      case 'status': {
        const statusOrder = { ministrada: 1, planeada: 2, adiada: 3, cancelada: 4 } as Record<string, number>;
        sorted.sort((a: Aula, b: Aula) => (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5));
        break;
      }
    }
    return sorted;
  }, [aulas, filtroTurma, filtroStatus, filtroData, sortBy]);

  const {
    page: aulasPage,
    setPage: setAulasPage,
    pageSize: aulasPageSize,
    setPageSize: setAulasPageSize,
    totalItems: aulasTotalItems,
    totalPages: aulasTotalPages,
    startItem: aulasStartItem,
    endItem: aulasEndItem,
    paginatedItems: aulasPaginadas
  } = usePagination<Aula>({
    items: aulasFiltradas,
    initialPageSize: 9,
    resetDeps: [aulasFiltradas, viewMode, activeTab, filtroData, filtroStatus, filtroTurma]
  });

  // Handlers
  const handleCriarAula = async (aulaData: AulaFormData) => {
    try {
      await aulaService.criarAula(aulaData);
      setShowForm(false);
      await loadData();
      
      showAlert({
          type: 'success',
          title: 'Aula adicionada!',
          message: 'Uma nova aula adicionada com sucesso a base de dados.',
          duration: 3000
        });
        toast.success('Aula adicionada com sucesso!');
      
      } catch (error) {
        console.error("Erro ao salva",error)
        toast.error('Aula adicionada com sucesso!');
        showAlert({
          type: 'error',
          title: 'Erro ao salvar',
          message: 'Verifica se realmente tem permissão para tal.',
          duration: 5000
        });
      };
  };

  const handleEditarAula = async (aulaData: AulaFormData) => {
    if (!aulaEditando) return;
    
    try {
      await aulaService.atualizarAula(aulaEditando.id, aulaData);
      setShowForm(false);
      setAulaEditando(null);
      await loadData();
      showAlert({
          type: 'success',
          title: 'Aula adicionada!',
          message: 'Uma nova aula adicionada a base de dados.',
          duration: 3000
        });
        toast.success('Aula atualizada com sucesso!');
      } catch (error:any) {
        showAlert({
          type: 'error',
          title: 'Erro ao salvar',
          message: 'Verifica se realmente tem permissão para tal.',
          duration: 5000
        });
          console.error('Erro ao atualizar aula:', error);
          toast.error(error.message || 'Erro ao atualizar aula');
      }; 
  };


  const handleDeletarPlano = async (aula:PlanoAula) => {
    const confirmed = await confirm({
      type: 'delete',
      title: 'Excluir Plano de Aula',
      message: `Tem certeza que deseja excluir de ${aula.disciplina}? Os dados ligados a serão eliminados.`,
      isDestructive: true,
      confirmText: 'Excluir',
      onConfirm: async () => {
        try {
          await planoAulaService.deletarPlanoAula(aula.id);
          setPlanosAula(prev => prev.filter(s => s.id !== aula.id));
          toast.success('Plano de aula excluída com sucesso!');
          showAlert({
            type: 'success',
            title: 'Plano de Aula excluída!',
            message: `Aula da ${aula.disciplina} foi removida do sistema.`,
            duration: 3000
          });
          
        } catch (error) {
          showAlert({
            type: 'error',
            title: 'Erro ao excluir',
            message: 'Não foi possível excluir o plano de aula. Verifique sua conexão.',
            duration: 5000
          });
        }
      }
    });

  };


  const handleDeletarAula = async (aula:Aula) => {
    const confirmed = await confirm({
      type: 'delete',
      title: 'Excluir Aula',
      message: `Tem certeza que deseja excluir de ${aula.disciplina}? Os dados ligados a serão eliminados.`,
      isDestructive: true,
      confirmText: 'Excluir',
      onConfirm: async () => {
        try {
          await aulaService.deletarAula(aula.id);
          setAulas(prev => prev.filter(s => s.id !== aula.id));
          toast.success('Aula excluída com sucesso!');
          showAlert({
            type: 'success',
            title: 'Aula excluída!',
            message: `Aula da ${aula.disciplina} foi removida do sistema.`,
            duration: 3000
          });
          
        } catch (error) {
          showAlert({
            type: 'error',
            title: 'Erro ao excluir',
            message: 'Não foi possível excluir a aula. Verifique sua conexão.',
            duration: 5000
          });
        }
      }
    });

  };


  const handleQuickAdd = async () => {
    if (!quickAddTurma) {
      toast.error('Selecione uma turma');
      showAlert({
        type: 'warning',
        title: 'Selecione uma turma',
        message: 'Selecione a turma que tera a aula.',
        duration: 3000
      });
      return;
    }

    try {
      
      await aulaService.criarAula({
        turma_id: quickAddTurma,
        data_aula: quickAddData,
        disciplina: turmas.find(t => t.id === quickAddTurma)?.curso_nome || '',
        hora_inicio: '08:00',
        hora_fim: '09:30',
        tema_aula: 'Aula do dia',
        status: 'planeada',
        turmas: turmas.find(t => t.id === quickAddTurma),
        dia_semana:getDiaSemanaFromDate(quickAddData) as  "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado" | "domingo"
      });

      
      setShowQuickAdd(false);
      setQuickAddTurma('');
      showAlert({
          type: 'info',
          title: 'Aula adicionada rapidamente!',
          message: 'Altere o tema da aula e data caso seja necessario.',
          duration: 3000
        });
      await loadData();
      toast.success('Aula adicionada rapidamente!');
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro ao adicionar a aula!',
        message: 'Verifique suas permissões',
        duration: 3000
      });
      toast.error('Erro ao adicionar aula rápida');
    }
  };

  useEffect(() => {
      // Monitorar status online
      const handleOnline = () => setOnlineStatus(true);
      const handleOffline = () => setOnlineStatus(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }, []);
    
    
    const handleForceSync = async () => {
      try {
        await aulaService.syncAulas();
        loadData();
       
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
      };
    };
      
  

  // Tabs disponíveis
  const tabs = [
    { 
      id: 'lista' as const, 
      label: 'Lista de Aulas', 
      icon: <FiBook />, 
      count: aulasFiltradas?.length 
    },
    { 
      id: 'graficos' as const, 
      label: 'Análise', 
      icon: <FiBarChart2 /> 
    },
    { 
      id: 'planeamento' as const, 
      label: 'Planeamento', 
      icon: <FiTarget /> 
    },
    { 
      id: 'planos' as const, 
      label: 'Planos de Aula', 
      icon: <FiTarget />,
      count: planosAula.length
    }
  ];

  if (loading) {
    return <PageLoader title="Carregando aulas" subtitle="Preparando calendário, planos e filtros..." />;
  }

  async function handleActualizar(status: AulaStatus,aulaSelect:Aula) {
   
    if(aulaSelect.status=="ministrada"){
       setAulaSelect(aulaSelect)
       return ""
    }
    if(aulaSelect){
        const operacao=(status=="adiada"?"Adiar":"Concluir");
       const confirmed = await confirm({
          type: 'save',
          title: operacao+' Aula',
          message: `Tem certeza que deseja ${operacao.toLocaleLowerCase()} esta aula?`,
          isDestructive: false,
          confirmText: operacao,
          onConfirm: async () => {
            const aula=await aulaService.atualizarAula(aulaSelect.id,{status:status,turmas:aulaSelect.turmas})
            setAulas((prev:Aula[]) => prev.map((e:Aula) => aula&&e.id === aula.id ? aula : e));
            console.log(status+""+aula)
          }
        });
    }
    
  }

  const handleVerDetalhesPlano = async (planoId: string) => {
    const detalhes = await planoAulaService.getPlano(planoId);
    if (!detalhes) {
      showAlert({
        type: 'warning',
        title: 'Plano não encontrado',
        message: 'Não foi possível carregar os detalhes do plano selecionado.',
        duration: 3000
      });
      return;
    }
    setPlanoDetalhes(detalhes);
  };

  const handleUsarTemplatePlano = async (planoId: string) => {
    try {
      const template = await planoAulaService.usarComoTemplate(planoId);
      setPlanoTemplate(template);
      setShowPlaneamento(true);
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro ao carregar template',
        message: 'Não foi possível usar este plano como template.',
        duration: 4000
      });
    }
  };

  const handleEditarPlano = async (plano: PlanoAula) => {
    try {
      setPlanoEditar(plano)
      setShowPlaneamento(true);
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro ao carregar template',
        message: 'Não foi possível usar este plano como template.',
        duration: 4000
      });
    }
  };


  const handleGerarAulasDoPlano = async (planoId: string) => {
    try {
      const aulasIds = await planoAulaService.gerarAulasDoPlano(planoId);
      showAlert({
        type: 'success',
        title: 'Aulas geradas com sucesso',
        message: `${aulasIds.length} aula(s) gerada(s) a partir do plano.`,
        duration: 4000
      });
      await loadData();
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro ao gerar aulas',
        message: 'Não foi possível gerar aulas a partir deste plano.',
        duration: 4000
      });
    }
  };

  return (
    <div className="min-h-screen rounded-md dark:bg-gray-900 p-4  md:p-6">
      <AulasPageHeader
        onQuickAdd={() => setShowQuickAdd(true)}
        onDetailedAdd={() => setShowForm(true)}
        onRefresh={loadData}
      />

      {syncStats > 0 && 
        <SyncDataDetail 
          syncStats={syncStats} 
          onlineStatus={onlineStatus} 
          handleForceSync={handleForceSync}
          table="aulas"
          data={aulas}
        />
      }
      <AulasStatsGrid aulas={aulas} />

      {/* Tabs Navigation */}
      <TabNavigation 
        activeTab={activeTab}
        tabs={tabs}
        onTabChange={(tabId) => {
          navigate(`/aulas/${tabId}`);
        }}
        path='/aulas/'
      />
      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-700 rounded-2xl shadow-xl overflow-hidden mt-6"
        >
          {/* Lista de Aulas Tab */}
          {activeTab === 'lista' && (
            <>
             <ViewModeNavbar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortBy={sortBy}
              onSortChange={setSortBy}
              filterCount={filterCount}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
            />
            {/* Filtros Expandíveis */}
            {renderFilters()}

            {/* Conteúdo Principal */}
            <div className="p-6 z-10">
              {/* Seção de Timeline (sempre visível no topo) */}
              
              {viewMode === 'timeline' ? (
                // Visualização Timeline Completa
                <div className="mb-8">
                  <TimelineWindows
                    aulas={aulasPaginadas}
                    onAulaClick={(aula) => setAulaExpandida(aula)}
                    onEditClick={(aula) => {
                      setAulaEditando(aula);
                      setShowForm(true);
                    }}
                    onDeleteClick={handleDeletarAula}
                    showActions={true}
                  />
                </div>
              ) : viewMode === 'list' ? (
                // Visualização Lista
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  <ListaView
                    aulas={aulasPaginadas || []}
                    onEditar={(aula) => {
                      setAulaEditando(aula);
                      setShowForm(true);
                    }}
                   
                    onDeletar={handleDeletarAula}
                    onExpandir={(aula) => setAulaExpandida(aula)}
                  />
                </div>
              ) : (
                // Visualização Cards (padrão)
                <div>
                  {aulasFiltradas&&aulasFiltradas.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {aulasPaginadas.map((aula, index) => (
                        <AulaCardTurma
                          key={aula.id}
                          aula={aula}
                          onEditar={() => {
                            setAulaEditando(aula);
                            setShowForm(true);
                          }}
                          onActualizar={(status)=>{
                            handleActualizar(status,aula)
                          }}
                          onDeletar={() => {handleDeletarAula(aula)}}
                          index={index}
                          onExpandir={() => setAulaExpandida(aula)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FiBook className="mx-auto h-16 w-16 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                        Nenhuma aula encontrada
                      </h3>
                      <p className="text-gray-500 dark:text-gray-300 mt-2 max-w-md mx-auto">
                        {filterCount > 0 
                          ? 'Tente ajustar os filtros para encontrar mais resultados' 
                          : 'Comece criando sua primeira aula usando o botão acima'
                        }
                      </p>
                      <button
                        onClick={() => setShowForm(true)}
                        className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        Criar Primeira Aula
                      </button>
                    </div>
                  )}
                </div>
                )}
                <PaginationControls
                  page={aulasPage}
                  totalPages={aulasTotalPages}
                  totalItems={aulasTotalItems}
                  startItem={aulasStartItem}
                  endItem={aulasEndItem}
                  pageSize={aulasPageSize}
                  onPageChange={setAulasPage}
                  onPageSizeChange={(size) => {
                    setAulasPageSize(size);
                    setAulasPage(1);
                  }}
                  sizeOptions={[9, 18, 30]}
                  className="mt-6"
                />

              {/* Modal de Detalhes da Aula */}
              <ModalDetalhesAula 
                aulaExpandida={aulaExpandida} 
                setAulaExpandida={setAulaExpandida} 
                setShowForm={setShowForm} 
                setAulaEditando={setAulaEditando} 
                handleEditarAula={handleEditarAula} 
                handleDeletarAula={handleDeletarAula} 
              />
            </div>
            </>
          )}

          {/* Gráficos Tab */}
          {activeTab === 'graficos' && (
            <GraficoComponent aulas={aulas} estatisticas={estatisticas}/>
          )}
          {/* Planeamento Tab */}
          {activeTab === 'planeamento' && (
          <PlaneamentoComponent
            aulas={aulas}
            metas={metas}
            planosAula={planosAula}
            handleDeletarAula={handleDeletarAula}
            setAulaEditando={setAulaEditando}
            setShowForm={setShowForm}
            setShowPlaneamento={setShowPlaneamento}
          />
        )}
        {/* Planos de Aula Tab */}
        {activeTab === 'planos' && (
          <PlanoAulaComponent
            handleDeletarPlano={handleDeletarPlano}
            handleEditarPlano={handleEditarPlano}
            handleGerarAulasDoPlano={handleGerarAulasDoPlano}
            handleUsarTemplatePlano={handleUsarTemplatePlano}
            handleVerDetalhesPlano={handleVerDetalhesPlano}
            setShowPlaneamento={setShowPlaneamento}
            planosAula={planosAula}
            setPlanoTemplate={setPlanoDetalhes}
          />
        )}
        </motion.div>
      </AnimatePresence>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6"
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
      <ModalPlanoAula
              isOpen={showPlaneamento}
              onClose={() => {
                setShowPlaneamento(false);
                setPlanoTemplate(null);
                setPlanoEditar(null);
              }}
              onPlanoCriado={(plano) => {
                setShowPlaneamento(false);
                setPlanoTemplate(null);
                setPlanoEditar(null);
                loadData();
              }}
              planoExistente={planoEditar}
              templateParaCopiar={planoTemplate}
            />

      <AnimatePresence>
        {planoDetalhes && (
          <PlanoDetalhes planoDetalhes={planoDetalhes} setPlanoDetalhes={setPlanoDetalhes}/>
        )}
      </AnimatePresence>
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
              <AulaForm
                aula={aulaEditando}
                turmas={turmas.map(t => ({ value: t.id, label: t.nome_turma }))}
                onSubmit={aulaEditando ? handleEditarAula : handleCriarAula}
                onCancel={() => {
                  setShowForm(false);
                  setAulaEditando(null);
                }}
                loading={loading}
                comfirm={confirm}
                aulaExistentes={aulas}
                turmaHorarios={horarios}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
          {aulaSelect&&<motion.div
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

            <ModalFrequencia
              aula={aulaSelect}
              setAulaSelect={setAulaSelect}
              onRegistrarFrequencia={registrarFrequencia}
            />
            </motion.div>
        </motion.div>}        
      </AnimatePresence>
      

      <AulaQuickAddModal
        open={showQuickAdd}
        turmas={turmas}
        quickAddTurma={quickAddTurma}
        quickAddData={quickAddData}
        onClose={() => setShowQuickAdd(false)}
        onChangeTurma={setQuickAddTurma}
        onChangeData={setQuickAddData}
        onSubmit={handleQuickAdd}
      />
      <ModalComponent />
    </div>
  );
};
