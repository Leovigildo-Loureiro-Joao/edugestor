import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCalendar, FiUsers, FiFilter, FiCheckCircle } from 'react-icons/fi';
import { frequenciaService } from '../../services/database/frequenciaService';
import { aulaService } from '../../services/database/aulaService';
import { studentsService } from '../../services/database/students';
import { AulaFrequenciaCard } from '../../components/attendance/aulaFrequenciaCard';

export const FrequenciaPage = () => {
  const [aulas, setAulas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroData, setFiltroData] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('');

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Buscar aulas recentes
      const aulasRecentes = await aulaService.getAulasRecentes(30);
      setAulas(aulasRecentes);

      // Buscar alunos
      const alunosData = await studentsService.getStudents();
      setAlunos(alunosData);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const registrarFrequencia = async (aulaId, registros) => {
    try {
      await frequenciaService.registrarFrequenciaLote(aulaId, registros);
      alert('Frequência registrada com sucesso!');
      carregarDados(); // Recarrega para atualizar estatísticas
    } catch (error) {
      alert('Erro ao registrar frequência: ' + error.message);
    }
  };

  // Filtrar aulas
  const aulasFiltradas = aulas.filter(aula => {
    const matchData = filtroData ? aula.data_aula === filtroData : true;
    const matchTurma = filtroTurma ? aula.turma_id === filtroTurma : true;
    return matchData && matchTurma;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FiCheckCircle className="h-8 w-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">Registro de Frequência</h1>
          </div>
          <p className="text-gray-600">Marque a presença dos alunos em cada aula</p>
        </div>

        {/* Filtros */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filtrar por:</span>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
              <select
                value={filtroTurma}
                onChange={(e) => setFiltroTurma(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Todas as turmas</option>
                <option value="10A">10ª A</option>
                <option value="10B">10ª B</option>
                <option value="11A">11ª A</option>
                <option value="11B">11ª B</option>
                <option value="12A">12ª A</option>
                <option value="12B">12ª B</option>
              </select>
            </div>

            <button
              onClick={() => { setFiltroData(''); setFiltroTurma(''); }}
              className="mt-6 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Lista de Aulas para Registrar Frequência */}
        <div className="grid gap-6">
          {aulasFiltradas.map((aula, index) => (
            <AulaFrequenciaCard
              key={aula.id}
              aula={aula}
              alunos={alunos.filter(aluno => aluno.turma_id === aula.turma_id)}
              onRegistrarFrequencia={registrarFrequencia}
              index={index}
            />
          ))}
        </div>

        {aulasFiltradas.length === 0 && !loading && (
          <div className="text-center py-12">
            <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma aula encontrada</h3>
            <p className="text-gray-500 mt-2">
              {filtroData || filtroTurma 
                ? 'Tente ajustar os filtros' 
                : 'Crie algumas aulas primeiro'
              }
            </p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>
    </div>
  );
};