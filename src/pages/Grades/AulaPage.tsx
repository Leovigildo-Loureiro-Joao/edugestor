import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPlus, FiCalendar, FiClock, FiBook, FiUsers, 
  FiEdit2, FiTrash2, FiFilter, FiRefreshCw, FiX,
  FiBarChart2, FiTarget, FiMessageSquare, FiCheckCircle,
  FiUpload, FiDownload, FiTrendingUp, FiEye, FiStar,
  FiCopy,
  FiAlertCircle,
  FiTrendingDown
} from 'react-icons/fi';
import { aulaService } from '../../services/database/aulaService.ts';
import { AulaForm } from '../../components/aulas/AulaForm.tsx';
import { AulaCardTurma, AulaStatus } from '../../components/aulas/AulaCard-min.tsx';
import { turmaService } from '../../services/database/turmas.ts';
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
import { getPendingCount } from '../../utils/emitPendingSync.ts';
import {  useConfirmModal } from '../../components/ui/ComfirmModal.tsx';
import { useAlert } from '../../components/ui/AlertBadge.tsx';
import { getDiaSemanaFromDate } from '../../utils/getDiaDaSemana.ts';
import { HeatmapHorarios } from '../../components/aulas/HeatmapHorarios.tsx';
import { ModalPlanoAula } from '../../components/aulas/PlanoAulasModal.tsx';
import { SyncDataDetail } from '../../components/ui/SyncDataDetail.tsx';
import { planoAulaService, PlanoAula } from '../../services/database/planoAulasService.ts';
import CalendarioMini from '../../components/aulas/CalendarioMin.tsx';

export const AulasPage = () => {
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
  const [viewMode, setViewMode] = useState<'cards' | 'timeline' | 'list'>('cards');
  const [sortBy, setSortBy] = useState('data_desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const [alunos,setAlunos]=useState<Student[]>([])
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [syncStats, setSyncStats] = useState(0);
  const [showPlaneamento, setShowPlaneamento] = useState(false);
  const [periodoPlaneamento, setPeriodoPlaneamento] = useState('Esta semana');
  const [planosAula, setPlanosAula] = useState<PlanoAula[]>([]);
  const [planoDetalhes, setPlanoDetalhes] = useState<PlanoAula | null>(null);
  const [planoTemplate, setPlanoTemplate] = useState<Partial<PlanoAula> | null>(null);
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
  const [periodoAnalise, setPeriodoAnalise] = useState('30dias');

  // No seu AulasPage.tsx


// Adicione esta função para preparar os dados:
const prepararDadosHeatmap = useMemo(() => {
  return aulas.map(aula => ({
    dia: getDiaSemanaFromDate(aula.data_aula),
    horario: aula.hora_inicio?.split(':')[0] + ':00',
    aulas: 1,
    turmas: [aula.turmas?.nome_turma].filter(Boolean)
  }));
}, [aulas]);
  // Gerar dados para análise
  const dadosEvolucaoSemanal = useMemo(() => {
    // Implementar lógica para gerar dados semanais
    return Array.from({ length: 4 }, (_, i) => ({
      semana: `Sem ${i + 1}`,
      aulas: Math.floor(Math.random() * 20) + 10,
      participacao: Math.floor(Math.random() * 30) + 60
    }));
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

  const proximasAulas = useMemo(() => {
    const hoje = new Date();
    return aulas
      .filter((aula) => {
        const data = new Date(aula.data_aula);
        return data >= hoje && !aula.deleted;
      })
      .sort((a, b) => new Date(a.data_aula).getTime() - new Date(b.data_aula).getTime());
  }, [aulas]);

  const dadosDesempenhoTurmas = useMemo(() => {
    const turmasUnicas = [...new Set(aulas.map(a => a.turmas?.nome_turma))].filter(Boolean);
    return turmasUnicas.slice(0, 5).map(turma => ({
      turma,
      aulas: aulas.filter(a => a.turmas?.nome_turma === turma).length,
      participacao: Math.floor(Math.random() * 30) + 60
    }));
  }, [aulas]);

  const metricasPorDisciplina = useMemo(() => {
    const disciplinasUnicas = [...new Set(aulas.map(a => a.disciplina))];
    return disciplinasUnicas.map(disciplina => ({
      disciplina,
      aulas: aulas.filter(a => a.disciplina === disciplina).length,
      participacao: Math.floor(Math.random() * 30) + 60,
      atividades: Math.floor(Math.random() * 10) + 5,
      mediaNotas: Math.random() * 5 + 10,
      tendencia: Math.random() > 0.5 ? Math.floor(Math.random() * 20) : -Math.floor(Math.random() * 10)
    }));
  }, [aulas]);

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

  const progressoMetas = useMemo(() => {
    const totalMeta = metas.reduce((acc, item) => acc + (item.meta || 0), 0);
    const totalAtual = metas.reduce((acc, item) => acc + (item.atual || 0), 0);
    if (!totalMeta) return 0;
    return Math.min(100, Math.round((totalAtual / totalMeta) * 100));
  }, [metas]);

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
                onChange={(e) => setFiltroTurma(e)}
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
                onChange={(e) => setFiltroStatus(e)}
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
  const [activeTab, setActiveTab] = useState<'lista' | 'graficos' | 'planeamento' | 'planos'>('lista');

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  // Carregar disciplinas únicas
  useEffect(() => {
    const disciplinasUnicas = [...new Set(aulas.map(a => a.disciplina))];
    setDisciplinas(['Todas Disciplinas', ...disciplinasUnicas]);
  }, [aulas]);

  const loadData = async () => {
    try {
      setLoading(true);
    
      const [aulasData, turmasData, stats, metasP, planosData] = await Promise.all([
        aulaService.getAulasRecentes(),
        turmaService.getTurmas(),
        aulaService.getEstatisticas(),
        estrategiaService.getMetasAdemicas(),
        planoAulaService.getPlanos()
      ]);
      setMetas(metasP)
      setAulas(aulasData);
      setTurmas(turmasData || []);
      setPlanosAula(planosData || []);
      const horarios=[]
      for (const turm of turmasData) {
        if(turm.horarios)
          for (const hora of turm.horarios) {
            horarios.push(hora)
          }
      }
      setHorarios(horarios)
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

  const aulasFiltradas = aulas.length==0?[]:aulas.filter((aula)=>{
      const matchesTurma=filtroTurma==="Todas Turmas"||filtroTurma===aula.turmas?.nome_turma
      const matchesStatus=filtroStatus==="Todos"||filtroStatus===aula.status
      const matchesData=filtroData===""||filtroData===aula.data_aula
      return matchesTurma && matchesStatus && matchesData
   });

  useEffect(() => {
    switch (sortBy) {
      case 'data_desc':
        aulasFiltradas.sort((a:Aula, b:Aula) => new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime());
        break;
      case 'data_asc':
        aulasFiltradas.sort((a:Aula, b:Aula) => new Date(a.data_aula).getTime() - new Date(b.data_aula).getTime());
        break;
      case 'disciplina_asc':
        aulasFiltradas.sort((a:Aula, b:Aula) => a.disciplina.localeCompare(b.disciplina));
        break;
      case 'disciplina_desc':
        aulasFiltradas.sort((a:Aula, b:Aula) => b.disciplina.localeCompare(a.disciplina));
        break;
      case 'status':
        const statusOrder = { ministrada: 1, planeada: 2, adiada: 3, cancelada: 4 };
        aulasFiltradas.sort((a:Aula, b:Aula) => (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5));
        break;
    }

  }, [sortBy, aulasFiltradas,filtroData,filtroStatus,filtroTurma]);

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
        dia_semana:getDiaSemanaFromDate(quickAddData)
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
      
      const handleDbChanged = (event: Event) => {
        const detail = (event as CustomEvent).detail;
        if (!detail?.table || ['aulas', 'turmas', 'frequencias'].includes(detail.table)) {
          loadData();
        }
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      window.addEventListener('db-changed', handleDbChanged);


      // Carregar estatísticas de sincronização
      const loadSyncStats = async () => {
        try {
          const turmasPendentes = await getPendingCount("aulas");
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

      const interval=setInterval(handleSyncUpdate,30000)    
      
      window.addEventListener('sync-pending', handleSyncUpdate);
      window.addEventListener('sync-complete', handleSyncUpdate);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('db-changed', handleDbChanged);
        window.removeEventListener('sync-pending', handleSyncUpdate);
        window.removeEventListener('sync-complete', handleSyncUpdate);
        clearInterval(interval)
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
        

  // Dados para gráficos
  const dadosGraficoAulasPorDia = useMemo(() => {
    const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const contagemPorDia = [0, 0, 0, 0, 0, 0, 0];
    
    aulas.forEach(aula => {
      const data = new Date(aula.data_aula);
      const dia = data.getDay();
      contagemPorDia[dia]++;
    });
    
    return diasDaSemana.map((dia, index) => ({
      dia,
      aulas: contagemPorDia[index]
    }));
  }, [aulas]);

  const dadosGraficoDisciplinas = useMemo(() => {
    const disciplinasMap = new Map<string, number>();
    
    aulas.forEach(aula => {
      const count = disciplinasMap.get(aula.disciplina) || 0;
      disciplinasMap.set(aula.disciplina, count + 1);
    });
    
    return Array.from(disciplinasMap.entries()).map(([nome, count]) => ({
      nome,
      value: count
    }));
  }, [aulas]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

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
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
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
            setAulas(prev => prev.map((e:Aula) => aula&&e.id === aula.id ? aula : e));
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
    <div className="min-h-screen rounded-md dark:bg-gray-900 p-4 md:p-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex  justify-between items-center flex-wrap gap-4"
      >
        <div className="flex items-center gap-4 mb-4">
      
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Gestão de Aulas</h1>
              <SyncStatusBadge tableName="aulas" />
            </div>
            <p className="text-gray-600 dark:text-gray-200 mt-1">
              Planeie, ministre e analise o impacto das suas aulas
            </p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={() => setShowQuickAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-medium shadow-sm"
          >
            <FiPlus className="h-5 w-5" />
            Aula Rápida
          </button>
          
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium shadow-sm"
          >
            <FiPlus className="h-5 w-5" />
            Nova Aula Detalhada
          </button>
          
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 transition-all font-medium"
          >
            <FiRefreshCw className="h-5 w-5" />
            Atualizar
          </button>
        </div>
      </motion.div>

      {syncStats > 0 && 
        <SyncDataDetail 
          syncStats={syncStats} 
          onlineStatus={onlineStatus} 
          handleForceSync={handleForceSync}
          table="aulas"
          data={aulas}
        />
      }
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{delay:0.3}} 
          className="bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6 border-l-4 border-blue-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-white text-sm">Total de Aulas</p>
              <h3 className="text-2xl dark:text-white font-bold">{aulas.length}</h3>
            </div>
            <FiBook className="text-3xl text-blue-500" />
          </div>
          <div className="mt-2 text-sm text-blue-600 dark:text-blue-300">
            {aulas.filter(a => a.status === 'ministrada').length} ministradas
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.05 }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{delay:0.2}} 
          className="bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6 border-l-4 border-green-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-white text-sm">Próximas Aulas</p>
              <h3 className="text-2xl dark:text-white font-bold">
                {aulas.filter(a => 
                  new Date(a.data_aula) >= new Date() && 
                  a.status === 'planeada'
                ).length}
              </h3>
            </div>
            <FiCalendar className="text-3xl text-green-500" />
          </div>
          <div className="mt-2 text-sm text-green-600 dark:text-green-300">
            Para os próximos dias
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.05 }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{delay:0.1}} 
          className="bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6 border-l-4 border-purple-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-white text-sm">Turmas Ativas</p>
              <h3 className="text-2xl dark:text-white font-bold">
                {[...new Set(aulas.map(a => a.turma_id))].length}
              </h3>
            </div>
            <FiUsers className="text-3xl text-purple-500" />
          </div>
          <div className="mt-2 text-sm text-purple-600 dark:text-purple-300">
            Com aulas agendadas
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.05 }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6 border-l-4 border-orange-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-white text-sm">Taxa Conclusão</p>
              <h3 className="text-2xl dark:text-white font-bold">
                {aulas.length > 0 
                  ? Math.round((aulas.filter(a => a.status === 'ministrada').length / aulas.length) * 100)
                  : 0}%
              </h3>
            </div>
            <FiCheckCircle className="text-3xl text-orange-500" />
          </div>
          <div className="mt-2 text-sm text-orange-600 dark:text-orange-300">
            Aulas concluídas
          </div>
        </motion.div>
      </div>


      {/* Tabs Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-white dark:bg-gray-700 rounded-xl shadow-md p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              {tab.icon}
              <span className="font-medium">{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-2 py-1 text-xs rounded-full ${
                  activeTab === tab.id
                    ? 'bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-700 rounded-2xl shadow-xl overflow-hidden"
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
                    aulas={aulas}
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
                    aulas={aulasFiltradas||[]}
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
                      {aulasFiltradas.map((aula, index) => (
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
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                  <FiBarChart2 className="mr-2" />
                  Análise e Estatísticas
                </h2>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-white dark:bg-gray-700 border rounded-lg flex items-center gap-2">
                    <FiDownload /> Exportar
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                    Período: Últimos 30 dias
                  </button>
                </div>
              </div>

              {/* KPIs Principais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Aulas Ministradas', value: estatisticas?.ministradas || 0, icon: FiCheckCircle, color: 'green' },
                  { label: 'Taxa Participação', value: estatisticas?.mediaParticipacao ? `${estatisticas.mediaParticipacao}%` : '0%', icon: FiUsers, color: 'blue' },
                  { label: 'Horas de Aula', value: estatisticas?.horasTotais ? `${estatisticas.horasTotais}h` : '0h', icon: FiClock, color: 'purple' },
                  { label: 'Alunos Presentes', value: estatisticas?.alunosPresentes || 0, icon: FiUsers, color: 'orange' }
                ].map((kpi, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">{kpi.label}</p>
                        <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                      </div>
                      <div className={`p-2 bg-${kpi.color}-100 dark:bg-${kpi.color}-900 rounded-lg`}>
                        <kpi.icon className={`text-${kpi.color}-600`} />
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {idx === 0 && 'No período atual'}
                      {idx === 1 && 'Média de participação'}
                      {idx === 2 && 'Total de horas'}
                      {idx === 3 && 'Total de presenças'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Gráficos em Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Gráfico 1: Evolução Semanal */}
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Evolução Semanal de Aulas
                    </h3>
                    <span className="text-sm text-gray-500">Últimas 4 semanas</span>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dadosEvolucaoSemanal}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="semana" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="aulas" 
                          stroke="#3B82F6" 
                          strokeWidth={3}
                          dot={{ r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="participacao" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gráfico 2: Comparativo Turmas */}
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Desempenho por Turma
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosDesempenhoTurmas}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="turma" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="aulas" fill="#3B82F6" name="Total Aulas" />
                        <Bar dataKey="participacao" fill="#10B981" name="Participação (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

               
               
              </div>

              {/* Tabela de Métricas Detalhadas */}
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Métricas Detalhadas por Disciplina
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3">Disciplina</th>
                        <th className="text-left py-3">Aulas</th>
                        <th className="text-left py-3">Participação</th>
                        <th className="text-left py-3">Atividades</th>
                        <th className="text-left py-3">Média Notas</th>
                        <th className="text-left py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metricasPorDisciplina.map((metrica, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-100 dark:hover:bg-gray-700">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
                                <FiBook className="text-blue-600" />
                              </div>
                              {metrica.disciplina}
                            </div>
                          </td>
                          <td className="py-3">{metrica.aulas}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{ width: `${metrica.participacao}%` }}
                                />
                              </div>
                              {metrica.participacao}%
                            </div>
                          </td>
                          <td className="py-3">{metrica.atividades}</td>
                          <td className="py-3">{metrica.mediaNotas.toFixed(1)}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs flex w-min flex-nowrap ${
                              metrica.tendencia > 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {metrica.tendencia > 0 ? <FiTrendingDown/> : <FiTrendingUp/>} {Math.abs(metrica.tendencia)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {/* Planeamento Tab */}
          {activeTab === 'planeamento' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
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
                          <div className="text-sm text-gray-600">{aula.turmas?.nome_turma}</div>
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
                      <tr key={aula.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
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
                          <div className="text-sm text-gray-600">{insight.descricao}</div>
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
                <button className="w-full mt-4 px-4 py-2 border border-dashed rounded-lg text-gray-600 hover:text-gray-800">
                  + Adicionar nova tarefa
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Planos de Aula Tab */}
        {activeTab === 'planos' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                <FiTarget className="mr-2" />
                Planos de Aula
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPlanoTemplate(null);
                    setShowPlaneamento(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
                >
                  <FiPlus /> Novo Plano
                </button>
              </div>
            </div>

            {planosAula.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {planosAula.map((plano) => (
                  <div key={plano.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {plano.titulo}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {plano.disciplina}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        plano.status === 'ativo' ? 'bg-green-100 text-green-800' :
                        plano.status === 'rascunho' ? 'bg-yellow-100 text-yellow-800' :
                        plano.status === 'arquivado' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {plano.status}
                      </span>
                    </div>

                    {plano.descricao && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 line-clamp-2">
                        {plano.descricao}
                      </p>
                    )}

                    <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center justify-between">
                        <span>Tipo</span>
                        <span className="font-medium">{plano.tipo}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Aulas planeadas</span>
                        <span className="font-medium">{plano.aulas_planeadas}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Aulas geradas</span>
                        <span className="font-medium">{plano.aulas_geradas?.length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Turmas</span>
                        <span className="font-medium">{plano.turma_ids?.length || 0}</span>
                      </div>
                    </div>

                    {(plano.data_inicio || plano.data_fim) && (
                      <div className="mt-4 text-xs text-gray-500">
                        {plano.data_inicio && (
                          <div>Início: {new Date(plano.data_inicio).toLocaleDateString('pt-AO')}</div>
                        )}
                        {plano.data_fim && (
                          <div>Fim: {new Date(plano.data_fim).toLocaleDateString('pt-AO')}</div>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleVerDetalhesPlano(plano.id)}
                        className="px-3 py-1.5 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-1"
                      >
                        <FiEye /> Ver detalhes
                      </button>
                      <button
                        onClick={() => handleUsarTemplatePlano(plano.id)}
                        className="px-3 py-1.5 text-xs rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center gap-1"
                      >
                        <FiCopy /> Usar como template
                      </button>
                      <button
                        onClick={() => handleGerarAulasDoPlano(plano.id)}
                        className="px-3 py-1.5 text-xs rounded-md bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-1"
                      >
                        <FiUpload /> Gerar aulas
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FiTarget className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                  Nenhum plano de aula encontrado
                </h3>
                <p className="text-gray-500 dark:text-gray-300 mt-2 max-w-md mx-auto">
                  Crie um plano de aula para organizar as suas aulas por série ou módulo.
                </p>
                <button
                  onClick={() => {
                    setPlanoTemplate(null);
                    setShowPlaneamento(true);
                  }}
                  className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Criar Primeiro Plano
                </button>
              </div>
            )}
          </div>
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
              }}
              onPlanoCriado={(plano) => {
                setShowPlaneamento(false);
                setPlanoTemplate(null);
                loadData();
              }}
              templateParaCopiar={planoTemplate}
            />

      <AnimatePresence>
        {planoDetalhes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setPlanoDetalhes(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {planoDetalhes.titulo}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{planoDetalhes.disciplina}</p>
                </div>
                <button onClick={() => setPlanoDetalhes(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <FiX />
                </button>
              </div>

              {planoDetalhes.descricao && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{planoDetalhes.descricao}</p>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <span className="text-gray-500">Tipo</span>
                  <div className="font-medium">{planoDetalhes.tipo}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <span className="text-gray-500">Status</span>
                  <div className="font-medium">{planoDetalhes.status}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <span className="text-gray-500">Aulas planeadas</span>
                  <div className="font-medium">{planoDetalhes.aulas_planeadas}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <span className="text-gray-500">Aulas geradas</span>
                  <div className="font-medium">{planoDetalhes.aulas_geradas?.length || 0}</div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Objetivos de Aprendizagem</h4>
                <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  {(planoDetalhes.objetivos_aprendizagem || []).map((objetivo, index) => (
                    <li key={`${planoDetalhes.id}-objetivo-${index}`}>{objetivo}</li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Conteúdos</h4>
                <div className="space-y-2">
                  {(planoDetalhes.conteudos || []).map((conteudo, index) => (
                    <div key={`${planoDetalhes.id}-conteudo-${index}`} className="border rounded-lg p-3">
                      <div className="font-medium text-sm">{conteudo.titulo}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{conteudo.descricao}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setPlanoDetalhes(null)}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
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
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
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
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
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
      

      {/* Modal Quick Add */}
      <AnimatePresence>
        {showQuickAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowQuickAdd(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Adicionar Aula Rápida</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Turma
                  </label>
                  <SelectTyped
                    vect={["Selecione a turma",...(turmas.map(t => ({value:t.id,label:t.nome_turma})))]}
                    value={quickAddTurma}
                    onChange={(value:any) => setQuickAddTurma(value)}
                    placeholder="Selecione a turma"
                  />
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
                  onClick={() => setShowQuickAdd(false)}
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
          <ModalComponent />

      </AnimatePresence>
    </div>
  );
};
