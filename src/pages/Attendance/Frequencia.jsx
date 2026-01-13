import { useState, useEffect } from 'react';
import { 
  FiCalendar, 
  FiFilter, 
  FiCheckCircle, 
  FiRefreshCw, 
  FiUsers, 
  FiBarChart2, 
  FiClock, 
  FiCheckSquare,
  FiChevronRight,
  FiBook,
  FiTarget
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { aulaService } from '../../services/database/aulaService.ts';
import { alunosService } from '../../services/database/alunosService.ts';
import { turmaService } from '../../services/database/turmas.ts';
import { Select } from '../../components/ui/Select.jsx';
import { ModalFrequencia } from '../../components/attendance/FrequeciaModal.tsx';
import { EstatisticasView } from '../../components/attendance/EstatisticasView.jsx';
import { FrequenciasRegistradasView } from '../../components/attendance/FrequenciasRegistradasView.jsx';

export const FrequenciaPage = () => {
  const [aulas, setAulas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroData, setFiltroData] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('Todas Turmas');
  const [view, setView] = useState('pendentes');
  const [estatisticas, setEstatisticas] = useState(null);
  const [frequenciasRegistradas, setFrequenciasRegistradas] = useState([]);
  const [modalAberta, setModalAberta] = useState(false);
  const [aulaSelecionada, setAulaSelecionada] = useState(null);

  useEffect(() => {
    carregarDados();
    carregarTurmas();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      console.log('🔄 Carregando dados...');
      
      const aulasRecentes = await aulaService.getAulasRecentes(30);
      const alunosData = await alunosService.getAllStudents();
      setAlunos(alunosData);

      // Filtrar apenas aulas ministradas sem frequência
      const aulasSemFrequencia = aulasRecentes.filter(aula => 
        aula.status === 'ministrada' && (!aula.registro || aula.registro.length === 0)
      );
      setAulas(aulasSemFrequencia);

      // Filtrar aulas com frequência já registrada
      const aulasComFrequencia = aulasRecentes.filter(aula => 
        aula.status === 'ministrada' && aula.registro && aula.registro.length > 0
      );
      setFrequenciasRegistradas(aulasComFrequencia);

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarTurmas = async () => {
    try {
      const turmasData = await turmaService.getTurmas();
      setTurmas(turmasData || []);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  const handleRegistrarFrequencia = async (registros) => {
    try {
      console.log('📝 Registrando frequência:', registros);
      await frequenciaService.registrarFrequenciaLote(registros);
      setAulas(prev => prev.filter(a => a.id !== registros.aula_id));
      setModalAberta(false);
      carregarDados();
      
    } catch (error) {
      console.error('❌ Erro ao registrar:', error);
    }
  };

  const abrirModalRegistro = (aula) => {
    setAulaSelecionada(aula);
    setModalAberta(true);
  };

  // Filtrar aulas
  const aulasFiltradas = aulas.filter(aula => {
    const matchData = filtroData ? aula.data_aula === filtroData : true;
    const matchTurma = filtroTurma !== 'Todas Turmas' 
      ? aula.turmas?.nome_turma === filtroTurma
      : true;
    return matchData && matchTurma;
  });

  // Filtrar frequências registradas
  const frequenciasFiltradas = frequenciasRegistradas.filter(aula => {
    const matchData = filtroData ? aula.data_aula === filtroData : true;
    const matchTurma = filtroTurma !== 'Todas Turmas' 
      ? aula.turmas?.nome_turma === filtroTurma
      : true;
    return matchData && matchTurma;
  });

  const turmasSelect = ['Todas Turmas', ...turmas.map(t => t.nome_turma)];

  // Animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  const cardHoverVariants = {
    hover: {
      y: -4,
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen p-4 md:p-6"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 px-4">
             
              <div>
                <h1 className="text-3xl font-bold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700">
                  Controle de Frequência
                </h1>
                <p className="text-gray-600">Gerencie a presença dos alunos de forma eficiente</p>
              </div>
            </div>
          </div>

          {/* Navegação */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="p-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'pendentes', icon: FiClock, label: 'Pendentes', count: aulasFiltradas.length, color: 'blue' },
                { id: 'registradas', icon: FiCheckSquare, label: 'Registradas', count: frequenciasFiltradas.length, color: 'green' },
                { id: 'estatisticas', icon: FiBarChart2, label: 'Estatísticas', count: null, color: 'purple' }
              ].map((tab) => (
                <motion.button
                  key={tab.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView(tab.id)}
                  className={`relative flex items-center justify-between p-4 rounded-xl font-medium transition-all duration-300 ${
                    view === tab.id 
                      ? `bg-${tab.color}-100 text-${tab.color}-700 border-2 border-${tab.color}-300 shadow-md` 
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      view === tab.id 
                        ? `bg-${tab.color}-200` 
                        : 'bg-gray-100'
                    }`}>
                      <tab.icon size={20} />
                    </div>
                    <span className="font-semibold">{tab.label}</span>
                  </div>
                  
                  {tab.count !== null && tab.count > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`px-2 py-1 text-xs font-bold text-white rounded-full ${
                        view === tab.id 
                          ? `bg-${tab.color}-600` 
                          : `bg-${tab.color}-500`
                      }`}
                    >
                      {tab.count}
                    </motion.span>
                  )}
                  
                  <motion.div
                    animate={{ x: view === tab.id ? 0 : -5, opacity: view === tab.id ? 1 : 0 }}
                    className="text-gray-400"
                  >
                    <FiChevronRight size={18} />
                  </motion.div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-2xl shadow-lg mb-8 border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiFilter className="text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-lg">Filtros</h3>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-2">
                    <FiCalendar size={14} />
                    Data Específica
                  </span>
                </label>
                <motion.input
                  whileFocus={{ scale: 1.01 }}
                  type="date"
                  value={filtroData}
                  onChange={(e) => setFiltroData(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-2">
                    <FiUsers size={14} />
                    Turma
                  </span>
                </label>
                <Select 
                  vect={turmasSelect} 
                  onChange={setFiltroTurma}
                  value={filtroTurma}
                  className="p-3 border border-gray-300 rounded-xl"
                />
              </div>
              
              <div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setFiltroData(''); setFiltroTurma('Todas Turmas'); }}
                  className="w-full p-3 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border border-gray-300 rounded-xl hover:from-gray-200 hover:to-gray-100 transition-all duration-300 flex items-center justify-center gap-2 font-medium"
                >
                  <FiRefreshCw size={16} />
                  Limpar Filtros
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Conteúdo Principal */}
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
                />
                <p className="text-gray-600 font-medium">Carregando dados...</p>
              </div>
            ) : (
              <div>
                {view === 'pendentes' && (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4"
                  >
                    {aulasFiltradas.map((aula, index) => (
                      <motion.div
                        key={aula.id}
                        variants={itemVariants}
                        whileHover="hover"
                        custom={index}
                        variants={{ ...itemVariants, hover: cardHoverVariants.hover }}
                        className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
                      >
                        <div className="p-6">
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl">
                                  <FiBook className="h-5 w-5 text-blue-600" />
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg">
                                  {aula.disciplina || 'Aula Sem Disciplina'}
                                </h3>
                                <motion.span
                                  initial={{ scale: 0.8 }}
                                  animate={{ scale: 1 }}
                                  className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full"
                                >
                                  Pendente
                                </motion.span>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 ml-11">
                                <span className="flex items-center gap-2">
                                  <FiCalendar size={14} className="text-gray-400" />
                                  <span className="font-medium">
                                    {new Date(aula.data_aula).toLocaleDateString('pt-AO', {
                                      weekday: 'short',
                                      day: 'numeric',
                                      month: 'short'
                                    })}
                                  </span>
                                </span>
                                <span className="flex items-center gap-2">
                                  <FiUsers size={14} className="text-gray-400" />
                                  <span>{aula.turmas?.nome_turma || 'Turma'}</span>
                                </span>
                                {aula.tema_aula && (
                                  <span className="flex items-center gap-2">
                                    <FiTarget size={14} className="text-gray-400" />
                                    <span className="text-gray-500 truncate max-w-xs">{aula.tema_aula}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => abrirModalRegistro(aula)}
                              className="ml-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold shadow-md"
                            >
                              Registrar
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {aulasFiltradas.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm"
                      >
                        <div className="inline-flex p-4 bg-green-100 rounded-full mb-4">
                          <FiCheckCircle className="h-12 w-12 text-green-600" />
                        </div>
                        <h3 className="mt-4 text-xl font-bold text-gray-900">
                          Nenhuma frequência pendente!
                        </h3>
                        <p className="text-gray-600 mt-2 max-w-md mx-auto">
                          Todas as frequências estão em dia. Continue o bom trabalho! 🎉
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {view === 'registradas' && (
                  <FrequenciasRegistradasView 
                    frequenciasFiltradas={frequenciasFiltradas}
                    filtroData={filtroData}
                    filtroTurma={filtroTurma}
                  />
                )}

                {view === 'estatisticas' && (
                  <EstatisticasView 
                    estatisticas={estatisticas}
                    aulasFiltradas={aulasFiltradas}
                    frequenciasFiltradas={frequenciasFiltradas}
                  />
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modal de Registro */}
      <AnimatePresence>
        {modalAberta && aulaSelecionada && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalAberta(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                <ModalFrequencia
                  aula={aulaSelecionada}
                  onRegistrarFrequencia={handleRegistrarFrequencia}
                  isExpandida={true}
                  setAulaSelect={setAulaSelecionada}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};