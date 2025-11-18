import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiCalendar, FiClock, FiBook, FiUsers, FiEdit2, FiTrash2, FiFilter } from 'react-icons/fi';
import { aulaService } from '../../services/database/aulaService';
import { AulaForm } from '../../components/aulas/AulaForm';
import { AulaCard } from '../../components/aulas/AulaCard';

export const AulasPage = () => {
  const [aulas, setAulas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [aulaEditando, setAulaEditando] = useState(null);
  const [filtroData, setFiltroData] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('');

  // Carregar aulas
  useEffect(() => {
    carregarAulas();
  }, []);

  const carregarAulas = async () => {
    try {
      setLoading(true);
      const aulasData = await aulaService.getAulasRecentes();
      setAulas(aulasData);
    } catch (error) {
      console.error('Erro ao carregar aulas:', error);
      alert('Erro ao carregar aulas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCriarAula = async (aulaData) => {
    try {
      await aulaService.criarAula(aulaData);
      setShowForm(false);
      carregarAulas();
    } catch (error) {
      alert('Erro ao criar aula: ' + error.message);
    }
  };

  const handleEditarAula = async (aulaData) => {
    try {
      await aulaService.atualizarAula(aulaEditando.id, aulaData);
      setShowForm(false);
      setAulaEditando(null);
      carregarAulas();
    } catch (error) {
      alert('Erro ao atualizar aula: ' + error.message);
    }
  };

  const handleDeletarAula = async (aulaId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta aula?')) {
      return;
    }

    try {
      await aulaService.deletarAula(aulaId);
      carregarAulas();
    } catch (error) {
      alert('Erro ao excluir aula: ' + error.message);
    }
  };

  const handleEditarClick = (aula) => {
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
    const matchTurma = filtroTurma ? aula.turma_id === filtroTurma : true;
    return matchData && matchTurma;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestão de Aulas</h1>
            <p className="text-gray-600 mt-2">Gerencie as aulas ministradas</p>
          </div>
          
          <button
            onClick={handleNovoClick}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <FiPlus className="h-5 w-5" />
            Nova Aula
          </button>
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

        {/* Formulário (Modal) */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <AulaForm
                aula={aulaEditando}
                onSubmit={aulaEditando ? handleEditarAula : handleCriarAula}
                onCancel={handleCancelarForm}
                loading={loading}
              />
            </div>
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
              {filtroData || filtroTurma 
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