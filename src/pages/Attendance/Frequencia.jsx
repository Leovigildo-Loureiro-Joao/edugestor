import { useState, useEffect } from 'react';
import { FiCalendar, FiFilter, FiCheckCircle, FiRefreshCw, FiX, FiChevronDown, FiChevronUp, FiUsers, FiBarChart2, FiClock, FiCheckSquare } from 'react-icons/fi';
import { frequenciaService } from '../../services/database/frequenciaService.ts';
import { aulaService } from '../../services/database/aulaService.ts';
import { studentsService } from '../../services/database/students.ts';
import { turmaService } from '../../services/database/turmas.ts';
import { Select } from '../../components/ui/Select.jsx';
import { FaBookAtlas } from 'react-icons/fa6';
import { AulaFrequenciaItem } from '../../components/attendance/aulaFrequenciaCard.jsx';
import { EstatisticasView } from '../../components/attendance/EstatisticasView.jsx';
import { FrequenciasRegistradasView } from '../../components/attendance/FrequenciasRegistradasView.jsx';

export const FrequenciaPage = () => {
  const [aulas, setAulas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroData, setFiltroData] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('Todas Turmas');
  const [aulasExpandidas, setAulasExpandidas] = useState({});
  const [view, setView] = useState('pendentes');
  const [estatisticas, setEstatisticas] = useState(null);
  const [frequenciasRegistradas, setFrequenciasRegistradas] = useState([]);

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
    carregarTurmas();
  }, []);

  // Recalcular estatísticas quando filtros ou dados mudarem
  useEffect(() => {
    if (aulas.length > 0 || frequenciasRegistradas.length > 0) {
      console.log('🔄 Recalculando estatísticas devido a mudança nos dados ou filtros');
      carregarEstatisticas();
    }
  }, [filtroData, filtroTurma, aulas, frequenciasRegistradas]); // Adicione os filtros aqui

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Carregando dados...');
      
      // Buscar aulas recentes
      const aulasRecentes = await aulaService.getAulasRecentes(30);
      console.log('📚 Aulas recebidas:', aulasRecentes);
      
      // Buscar alunos
      const alunosData = await studentsService.getStudents();
      console.log('👥 Alunos recebidos:', alunosData);
      setAlunos(alunosData);

      // Filtrar apenas aulas sem frequência registrada
      const aulasSemFrequencia = await filtrarAulasSemFrequencia(aulasRecentes);
      console.log('✅ Aulas sem frequência:', aulasSemFrequencia);
      setAulas(aulasSemFrequencia);

      // Carregar frequências registradas
      await carregarFrequenciasRegistradas(aulasRecentes);

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarFrequenciasRegistradas = async (aulasRecentes) => {
    try {
      const frequenciasComAulas = [];
      
      console.log('🔄 Carregando frequências registradas para', aulasRecentes?.length, 'aulas');
      
      for (const aula of aulasRecentes) {
        try {
          console.log(`📖 Verificando frequência da aula ${aula.id}: ${aula.disciplina}`);
          const frequencia = await frequenciaService.getFrequenciaPorAula(aula.id);
          console.log(`📊 Frequência encontrada para aula ${aula.id}:`, frequencia?.length || 0, 'registros');
          
          if (frequencia && frequencia.length > 0) {
            const presentes = frequencia.filter(f => f.presente).length;
            console.log(`✅ Aula ${aula.id} tem ${presentes}/${frequencia.length} presentes`);
            
            frequenciasComAulas.push({
              aula,
              frequencia,
              totalAlunos: frequencia.length,
              presentes: presentes
            });
          } else {
            console.log(`❌ Aula ${aula.id} sem frequência registrada`);
          }
        } catch (error) {
          console.error(`⚠️ Erro ao carregar frequência da aula ${aula.id}:`, error);
        }
      }
      
      console.log('🎯 Total de frequências registradas encontradas:', frequenciasComAulas.length);
      setFrequenciasRegistradas(frequenciasComAulas);
      
      return frequenciasComAulas;
      
    } catch (error) {
      console.error('❌ Erro geral ao carregar frequências registradas:', error);
      setFrequenciasRegistradas([]);
      return [];
    }
  };

  const carregarEstatisticas = async () => {
    try {
      console.log('📊 Calculando estatísticas com filtros:', { filtroData, filtroTurma });
      
      // Usar os dados FILTRADOS para calcular estatísticas
      const totalAulasFiltradas = aulasFiltradas.length + frequenciasFiltradas.length;
      
      // Taxa de registro baseada nos dados filtrados
      const taxaRegistro = totalAulasFiltradas > 0 
        ? (frequenciasFiltradas.length / totalAulasFiltradas) * 100 
        : 0;
      
      // Calcular taxa de presença apenas das frequências FILTRADAS
      let totalRegistrosFilter = 0;
      let totalPresencaFilter = 0;
      
      frequenciasFiltradas.forEach(item => {
        totalRegistrosFilter += item.totalAlunos;
        totalPresencaFilter += item.presentes;
      });
      
      const taxaPresenca = totalRegistrosFilter > 0 
        ? (totalPresencaFilter / totalRegistrosFilter) * 100 
        : 0;

      // Estatísticas gerais (sem filtro) para referência
      const totalAulasGeral = aulas.length + frequenciasRegistradas.length;
      const taxaRegistroGeral = totalAulasGeral > 0 
        ? (frequenciasRegistradas.length / totalAulasGeral) * 100 
        : 0;

      let totalRegistrosGeral = 0;
      let totalPresencaGeral = 0;
      
      frequenciasRegistradas.forEach(item => {
        totalRegistrosGeral += item.totalAlunos;
        totalPresencaGeral += item.presentes;
      });
      
      const taxaPresencaGeral = totalRegistrosGeral > 0 
        ? (totalPresencaGeral / totalRegistrosGeral) * 100 
        : 0;

      const novasEstatisticas = {
        // Estatísticas COM filtro
        totalAulas: totalAulasFiltradas,
        aulasPendentes: aulasFiltradas.length,
        aulasRegistradas: frequenciasFiltradas.length,
        taxaRegistro,
        taxaPresenca,
        totalPresencas: totalPresencaFilter,
        totalRegistros: totalRegistrosFilter,
        
        // Estatísticas SEM filtro (para referência)
        totalAulasGeral,
        aulasPendentesGeral: aulas.length,
        aulasRegistradasGeral: frequenciasRegistradas.length,
        taxaRegistroGeral,
        taxaPresencaGeral,
        totalPresencasGeral: totalPresencaGeral,
        totalRegistrosGeral: totalRegistrosGeral,
        
        // Dados básicos
        totalAlunos: alunos.length,
        turmasAtivas: turmas.length,
        
        // Informações do filtro atual
        filtroAtivo: !!(filtroData || filtroTurma !== 'Todas Turmas'),
        filtroData,
        filtroTurma
      };
      
      console.log('📈 Estatísticas calculadas:', novasEstatisticas);
      setEstatisticas(novasEstatisticas);
      
    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas:', error);
    }
  };

  // Resto do código permanece igual...
  const filtrarAulasSemFrequencia = async (aulas) => {
    if (!aulas || aulas.length === 0) {
      console.log('📭 Nenhuma aula recebida para filtrar');
      return [];
    }

    const aulasFiltradas = [];
    
    console.log(`🔍 Verificando ${aulas.length} aulas por frequência...`);
    
    for (const aula of aulas) {
      try {
        console.log(`📖 Verificando aula ${aula.id}: ${aula.disciplina || aula.materia} - ${aula.data_aula}`);
        
        const frequencia = await frequenciaService.getFrequenciaPorAula(aula.id);
        console.log(`📊 Frequência para aula ${aula.id}:`, frequencia);
        
        if (!frequencia || frequencia.length === 0) {
          console.log(`✅ Aula ${aula.id} SEM frequência - ADICIONANDO`);
          aulasFiltradas.push(aula);
        } else {
          console.log(`❌ Aula ${aula.id} COM frequência - IGNORANDO`);
        }
      } catch (error) {
        console.error(`⚠️ Erro ao verificar aula ${aula.id}:`, error);
        aulasFiltradas.push(aula);
      }
    }
    
    console.log(`🎯 Total de aulas sem frequência: ${aulasFiltradas.length}`);
    return aulasFiltradas;
  };

  const carregarTurmas = async () => {
    try {
      const turmasData = await turmaService.getTurmas();
      console.log('🏫 Turmas carregadas:', turmasData);
      setTurmas(turmasData);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  const registrarFrequencia = async (aulaId, registros) => {
    try {
      console.log('📝 Registrando frequência para aula:', aulaId, registros);
      await frequenciaService.registrarFrequenciaLote(aulaId, registros);
      
      setAulas(prev => prev.filter(aula => aula.id !== aulaId));
      console.log('✅ Frequência registrada e aula removida da lista');
      
      setTimeout(() => {
        carregarDados();
      }, 500);
      
    } catch (error) {
      console.error('❌ Erro ao registrar frequência:', error);
    }
  };

  const toggleExpandirAula = (aulaId) => {
    setAulasExpandidas(prev => ({
      ...prev,
      [aulaId]: !prev[aulaId]
    }));
  };

  // Preparar dados para os selects
  const turmasSelect = ['Todas Turmas', ...turmas.map(t => t.nome_turma)];

  // Filtrar aulas
  const aulasFiltradas = aulas.filter(aula => {
    const matchData = filtroData ? aula.data_aula === filtroData : true;
    
    let matchTurma = true;
    if (filtroTurma !== 'Todas Turmas') {
      matchTurma = 
        aula.turmas?.nome_turma === filtroTurma ||
        aula.turma_nome === filtroTurma || 
        aula.turma_id === filtroTurma;
    }
    
    return matchData && matchTurma;
  });

  // Filtrar frequências registradas
  const frequenciasFiltradas = frequenciasRegistradas.filter(item => {
    const matchData = filtroData ? item.aula.data_aula === filtroData : true;
    
    let matchTurma = true;
    if (filtroTurma !== 'Todas Turmas') {
      matchTurma = 
        item.aula.turmas?.nome_turma === filtroTurma ||
        item.aula.turma_nome === filtroTurma || 
        item.aula.turma_id === filtroTurma;
    }
    
    return matchData && matchTurma;
  });

  const recarregarTudo = () => {
    console.log('🔄 Recarregando dados manualmente...');
    carregarDados();
    carregarTurmas();
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header com Navegação */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FiCheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Controle de Frequência</h1>
                <p className="text-gray-600">Gerencie a presença dos alunos</p>
              </div>
            </div>
          </div>

          {/* Navegação em Carrossel */}
          <div className="p-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setView('pendentes')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                  view === 'pendentes' 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <FiClock size={18} />
                Pendentes
                {aulasFiltradas.length > 0 && (
                  <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                    {aulasFiltradas.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setView('registradas')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                  view === 'registradas' 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <FiCheckSquare size={18} />
                Registradas
                {frequenciasFiltradas.length > 0 && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    {frequenciasFiltradas.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setView('estatisticas')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                  view === 'estatisticas' 
                    ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <FiBarChart2 size={18} />
                Estatísticas
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white  p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={filtroData}
                  onChange={(e) => setFiltroData(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Turma
                </label>
                <Select 
                  vect={turmasSelect} 
                  onChange={setFiltroTurma}
                />
              </div>
               <div className="flex items-end">
                <button
                onClick={() => { setFiltroData(''); setFiltroTurma('Todas Turmas'); }}
                className="px-4 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-white"
              >
                <span className="flex items-center gap-2">
                  <FiRefreshCw size={16} />
                  Limpar Filtros
                </span>
  
               
              </button>
               </div>
            </div>
          </div>
        </div>

        {/* Conteúdo Dinâmico */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div>
            {view === 'pendentes' && (
              <div className="space-y-4">
                {aulasFiltradas.map((aula) => (
                  <AulaFrequenciaItem
                    key={aula.id}
                    aula={aula}
                    alunos={alunos.filter(aluno => {
                      return aluno.turma_id === aula.turma_id || 
                             aluno.turma_nome === aula.turmas?.nome_turma;
                    })}
                    onRegistrarFrequencia={registrarFrequencia}
                    isExpandida={aulasExpandidas[aula.id]}
                    onToggleExpandir={() => toggleExpandirAula(aula.id)}
                  />
                ))}

                {aulasFiltradas.length === 0 && (
                  <div className="text-center py-12">
                    <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      {filtroData || filtroTurma !== 'Todas Turmas' 
                        ? 'Nenhuma aula pendente encontrada' 
                        : 'Nenhuma aula pendente para registrar frequência'
                      }
                    </h3>
                    <p className="text-gray-500 mt-2">
                      Todas as frequências estão em dia! 🎉
                    </p>
                  </div>
                )}
              </div>
            )}

            {view === 'registradas' && <FrequenciasRegistradasView filtroData={filtroData} filtroTurma={filtroTurma} frequenciasFiltradas={frequenciasFiltradas} />}
            {view === 'estatisticas' && <EstatisticasView estatisticas={estatisticas} aulasFiltradas={aulasFiltradas} frequenciasFiltradas={frequenciasFiltradas}/>}
          </div>
        )}
      </div>
    </div>
  );
};