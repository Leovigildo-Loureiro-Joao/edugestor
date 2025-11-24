import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiCalendar, FiClock, FiBook, FiUsers, FiEdit2, FiTrash2, FiFilter, FiRefreshCw, FiX } from 'react-icons/fi';
import { aulaService } from '../../services/database/aulaService.ts';
import { AulaForm } from '../../components/aulas/AulaForm.jsx';
import { AulaCard } from '../../components/aulas/AulaCard.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { turmaService } from '../../services/database/turmas.ts';
import { Aula, AulaFormData } from '../../types/aula.ts';
import { Turma} from '../../types/turma.ts';
import { FaBookAtlas } from 'react-icons/fa6';

export const AulasPage = () => {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [aulaEditando, setAulaEditando] = useState<Aula | null>(null);
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0]);
  const [filtroTurma, setFiltroTurma] = useState('Todas Turmas');
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [disciplinas] = useState([
    'Matemática', 'Português', 'Física', 'Química', 'Biologia', 
    'História', 'Geografia', 'Inglês', 'Educação Física'
  ]);

  // Carregar aulas e turmas
  useEffect(() => {
    carregarAulas();
    carregarTurmas();
  }, []);

  const carregarAulas = async () => {
    try {
      setLoading(true);
      const aulasData = await aulaService.getAulasRecentes();
      setAulas(aulasData);
    } catch (error) {
      console.error('Erro ao carregar aulas:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarTurmas = async () => {
    try {
      const turmasData = await turmaService.getTurmas();
      setTurmas(turmasData||[]);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  const handleCriarAula = async (aulaData: AulaFormData) => {
    try {
      await aulaService.criarAula(aulaData);
      setShowForm(false);
      carregarAulas();
    } catch (error) {
      console.error('Erro ao criar aula:', error);
    }
  };

  const handleEditarAula = async (aulaData: AulaFormData) => {
    if (!aulaEditando?.id) return;

    try {
      await aulaService.atualizarAula(aulaEditando.id, aulaData);
      setShowForm(false);
      setAulaEditando(null);
      carregarAulas();
    } catch (error) {
      console.error('Erro ao atualizar aula:', error);
    }
  };

  const handleDeletarAula = async (aulaId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta aula?')) return;

    try {
      await aulaService.deletarAula(aulaId);
      carregarAulas();
    } catch (error) {
      console.error('Erro ao excluir aula:', error);
    }
  };

  const handleEditarClick = (aula: Aula) => {
    setAulaEditando(aula);
    setShowForm(true);
  };

  const handleNovoClick = () => {
    setAulaEditando(null);
    setShowForm(true);
  };

  const handleCancelarForm = () => {
    setShowForm(false);
    setAulaEditando(null);
  };

  // Filtrar aulas
  const aulasFiltradas = aulas.filter(aula => {
    const matchData = filtroData ? aula.data_aula === filtroData : true;
    const matchTurma = filtroTurma !== 'Todas Turmas' ? aula.turma_id === filtroTurma : true;
    return matchData && matchTurma;
  });

  // Preparar dados para os selects
  const turmasSelect = ['Todas Turmas', ...turmas.map(t => t.nome_turma)];
  const turmasFormSelect = turmas.map(t => t.nome_turma);

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestão de Aulas</h1>
            <p className="text-gray-600 mt-2">Gerencie as aulas ministradas</p>
          </div>
          
          <button
            onClick={handleNovoClick}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            <FiPlus className="h-5 w-5" />
            Nova Aula
          </button>
        </div>

        {/* Filtros Elegantes */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-end gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-50 rounded-lg">
                <FiFilter className="text-primary-600 text-lg" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Filtros</h3>
                <p className="text-sm text-gray-500">Filtre as aulas conforme necessário</p>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Filtro Data */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Data da Aula
                </label>
                <div className="relative">
                  <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={filtroData}
                    onChange={(e) => setFiltroData(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Filtro Turma */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Turma
                </label>
                <Select 
                  vect={turmasSelect} 
                  icon={FaBookAtlas} 
                  onChange={setFiltroTurma}
                />
              </div>

              {/* Botão Limpar */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 opacity-0">
                  Ações
                </label>
                <button
                  onClick={() => { setFiltroData(''); setFiltroTurma('Todas Turmas'); }}
                  className="w-full px-4 py-2.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-white hover:text-gray-700 transition-all duration-200 font-medium flex items-center justify-center gap-2"
                >
                  <FiRefreshCw size={16} />
                  Limpar Filtros
                </button>
              </div>
            </div>
          </div>

          {/* Indicador de Filtros Ativos */}
          {(filtroData || filtroTurma !== 'Todas Turmas') && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Filtros ativos:</span>
                <div className="flex flex-wrap gap-2">
                  {filtroData && (
                    <span className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm">
                      <FiCalendar size={14} />
                      {new Date(filtroData).toLocaleDateString('pt-AO')}
                      <button 
                        onClick={() => setFiltroData('')}
                        className="hover:text-primary-900 transition-colors"
                      >
                        <FiX size={14} />
                      </button>
                    </span>
                  )}
                  {filtroTurma !== 'Todas Turmas' && (
                    <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                      <FaBookAtlas size={14} />
                      {filtroTurma}
                      <button 
                        onClick={() => setFiltroTurma('Todas Turmas')}
                        className="hover:text-blue-900 transition-colors"
                      >
                        <FiX size={14} />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Formulário (Modal) */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <AulaForm
              aula={aulaEditando}
              turmas={turmasFormSelect}
              disciplinas={disciplinas}
              onSubmit={aulaEditando ? handleEditarAula : handleCriarAula}
              onCancel={handleCancelarForm}
              loading={loading}
            />
          </div>
        )}

        {/* Lista de Aulas */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid gap-6">
            {aulasFiltradas.map((aula, index) => (
              <AulaCard
                key={aula.id}
                aula={aula}
                onEditar={() => handleEditarClick(aula)}
                onDeletar={() => handleDeletarAula(aula.id)}
                index={index}
              />
            ))}
          </div>
        )}

        {aulasFiltradas.length === 0 && !loading && (
          <div className="text-center py-12">
            <FiBook className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma aula encontrada</h3>
            <p className="text-gray-500 mt-2">
              {filtroData || filtroTurma !== 'Todas Turmas' 
                ? 'Tente ajustar os filtros' 
                : 'Crie sua primeira aula'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};