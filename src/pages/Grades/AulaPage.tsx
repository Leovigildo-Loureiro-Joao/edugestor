import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPlus, FiCalendar, FiClock, FiBook, FiUsers, 
  FiEdit2, FiTrash2, FiFilter, FiRefreshCw, FiX,
  FiBarChart2, FiTarget, FiMessageSquare, FiCheckCircle,
  FiUpload, FiDownload, FiTrendingUp, FiEye, FiStar
} from 'react-icons/fi';
import { aulaService } from '../../services/database/aulaService.ts';
import { AulaForm } from '../../components/aulas/AulaForm.tsx';
import { AulaCardTurma, AulaStatus } from '../../components/aulas/AulaCard-min.tsx';
import { turmaService } from '../../services/database/turmas.ts';
import { Aula, AulaFormData } from '../../types/aula.ts';
import { Turma } from '../../types/turma.ts';
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
  const [disciplinas, setDisciplinas] = useState<string[]>([]);
  const [estatisticas, setEstatisticas] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'timeline' | 'list'>('cards');
  const [sortBy, setSortBy] = useState('data_desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const [alunos,setAlunos]=useState<Student[]>([])
  const [metas,setMetas]=useState<{
                      label:string,
                      atual:number,
                      meta:{
                        label:string,
                        atual:number,
                        meta:number
                      }[]|undefined
                    }[]>([])
    // Atualizar contador de filtros
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
        console.log('✅ Frequência registrada e aula removida da lista');
        
        setTimeout(() => {
          setAulaSelect(null)
          loadData();
        }, 500);
        
      } catch (error) {
        console.error('❌ Erro ao registrar frequência:', error);
      }
    };


  const CustomLegend = ({ payload }:{payload:any}) => {
    console.log(payload)
    return <div className="flex flex-wrap justify-center gap-2 mt-4">
      {payload.map((entry:any, index:any) => (
        <div
          key={`legend-${index}`}
          className="flex items-center gap-2 px-3 py-1 bg-gray-50 dark:bg-gray-500  rounded-full text-xs cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span>
            {entry.payload.nome}
          </span>
        </div>
      ))}
    </div>
  };

  const CustomTooltip = ({ active, payload }:{active:any,payload:any}) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800  p-4 border border-gray-200 rounded-lg shadow-xl">
          <p className="font-bold text-gray-900 mb-2 dark:text-gray-300">{data.name}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-50">Disciplina:</span>
              <span className="font-semibold dark:text-white">{data.nome}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-green-600 ">Total:</span>
              <span className="font-semibold dark:text-white">{data.value || 0}</span>
            </div>
          
          </div>
        </div>
      );
    }
    return null;
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
  const [activeTab, setActiveTab] = useState<'lista' | 'graficos' | 'planeamento'>('lista');

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
    
      const [aulasData, turmasData, stats,metasP] = await Promise.all([
        aulaService.getAulasRecentes(),
        turmaService.getTurmas(),
        aulaService.getEstatisticas(),
        estrategiaService.getMetasAdemicas()
      ]);
      setMetas(metasP)
      setAulas(aulasData);
      setTurmas(turmasData || []);
      setEstatisticas(stats);
    } catch (error) {
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
      toast.success('Aula criada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao criar aula:', error);
      toast.error(error.message || 'Erro ao criar aula');
    }
  };

  const handleEditarAula = async (aulaData: AulaFormData) => {
    if (!aulaEditando) return;
    
    try {
      await aulaService.atualizarAula(aulaEditando.id, aulaData);
      setShowForm(false);
      setAulaEditando(null);
      await loadData();
      toast.success('Aula atualizada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar aula:', error);
      toast.error(error.message || 'Erro ao atualizar aula');
    }
  };

  const handleDeletarAula = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta aula?')) {
      try {
        await aulaService.deletarAula(id);
        await loadData();
        toast.success('Aula excluída com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir aula:', error);
        toast.error('Erro ao excluir aula');
      }
    }
  };

  const handleQuickAdd = async () => {
    if (!quickAddTurma) {
      toast.error('Selecione uma turma');
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
        turmas: turmas.find(t => t.id === quickAddTurma)
      });
      
      setShowQuickAdd(false);
      setQuickAddTurma('');
      await loadData();
      toast.success('Aula adicionada rapidamente!');
    } catch (error) {
      toast.error('Erro ao adicionar aula rápida');
    }
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
      const aula=await aulaService.atualizarAula(aulaSelect.id,{status:status,turmas:aulaSelect.turmas})
      setAulas(prev => prev.map(e => aula&&e.id === aula.id ? aula : e));
      console.log(aula)
    }
    
  }

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
            <h1 className="text-2xl md:text-3xl font-bold dark:text-white text-gray-800">
              Gestão de Aulas
            </h1>
            <p className="text-gray-600 dark:text-gray-200 mt-1">
              Planeie, ministre e analise o impacto das suas aulas
            </p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap gap-3 mb-6">
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
                          onDeletar={() => handleDeletarAula(aula.id)}
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
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center mb-6">
                <FiBarChart2 className="mr-2" />
                Análise de Aulas
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FiCalendar className="text-blue-600" />
                    Distribuição por Dia da Semana
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosGraficoAulasPorDia}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="dia" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar 
                          dataKey="aulas" 
                          fill="#3B82F6" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FiBook className="text-green-600" />
                    Distribuição por Disciplina
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dadosGraficoDisciplinas}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.nome}: ${entry.value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {dadosGraficoDisciplinas.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip/>} />
                        <Legend content={<CustomLegend  />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Estatísticas Detalhadas */}
              {estatisticas && (
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <FiTrendingUp className="text-purple-600" />
                    Estatísticas Avançadas
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-white">Status das Aulas</h4>
                      <div className="space-y-3">
                        {Object.entries(estatisticas.porStatus || {}).map(([status, count]) => (
                          <div key={status} className="flex justify-between items-center">
                            <span className="text-gray-700 dark:text-gray-300 capitalize">{status}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-white">Top Turmas</h4>
                      <div className="space-y-3">
                        {estatisticas.topTurmas?.slice(0, 5).map((turma: any) => (
                          <div key={turma.id} className="flex justify-between items-center">
                            <span className="text-gray-700 dark:text-gray-300 truncate">{turma.nome_turma}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{turma.aulas.length} aulas</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-white">Indicadores</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 dark:text-gray-300">Média Duração</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {estatisticas.mediaDuracao || '0'} min
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 dark:text-gray-300">Taxa Cancelamento</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {estatisticas.taxaCancelamento || '0'}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 dark:text-gray-300">Aulas/Mês</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {estatisticas.aulasPorMes || '0'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Planeamento Tab */}
          {activeTab === 'planeamento' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center mb-6">
                <FiTarget className="mr-2" />
                Planeamento
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FiCalendar className="text-red-600" />
                    Próximas Aulas Agendadas
                  </h3>
                  <div className="space-y-3">
                    {aulas
                      .filter(a => {
                        console.log(new Date(a.data_aula).getUTCDate())
                        console.log(new Date().getUTCDate())
                        return new Date(a.data_aula).getUTCDate() >= new Date().getUTCDate() && a.status === 'planeada'
                      })
                      .sort((a, b) => new Date(a.data_aula).getTime() - new Date(b.data_aula).getTime())
                      .slice(0, 5)
                      .map(aula => (
                        <div key={aula.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{aula.disciplina}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {aula.turmas?.nome_turma} • {new Date(aula.data_aula).toLocaleDateString('pt-AO')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-300">{aula.hora_inicio}</span>
                            <button
                              onClick={() => {
                                setAulaEditando(aula);
                                setShowForm(true);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <FiEdit2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FiStar className="text-yellow-600" />
                    Metas do Mês
                  </h3>
                  <div className="space-y-4">
                    {metas.map((op, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-900 dark:text-white">{op.label}</span>
                         </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${Math.min((op.atual / 100) * 100, 100)}%` }}
                          />
                        </div>
                        {
                          op.meta?.map((m,i)=>(
                             <div key={index} className="ml-8 space-y-2">
                             <div className="flex justify-between text-sm">
                              <span className="font-medium text-gray-900 dark:text-white">{m.label}</span>
                              
                              <span className="text-gray-600 dark:text-gray-300">{m.atual}/{m.meta}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${Math.min((m.atual / m.meta) * 100, 100)}%` }}
                              />
                            </div>
                            </div>
                          ))
                        }
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
                    vect={turmas.map(t => ({value:t.id,label:t.nome_turma}))}
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
      </AnimatePresence>
    </div>
  );
};