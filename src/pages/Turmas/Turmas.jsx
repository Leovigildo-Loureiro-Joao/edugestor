import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit, FiTrash2, FiUsers, FiBook, FiClock, FiSearch } from 'react-icons/fi';
import { turmaService } from '../../services/database/turmas.ts';
import { Select } from '../../components/ui/Select';

const Turmas = () => {
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTurno, setFiltroTurno] = useState('Todos Turnos');
  const [filtroCurso, setFiltroCurso] = useState('Todos Cursos');

  useEffect(() => {
    loadTurmas();
  }, []);

  const loadTurmas = async () => {
    try {
      setLoading(true);
      const turmasData = await turmaService.getTurmas();
      setTurmas(turmasData);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta turma?')) {
      try {
        await turmaService.deleteTurma(id);
        setTurmas(turmas.filter(t => t.id !== id));
      } catch (error) {
        console.error('Erro ao excluir turma:', error);
        //alert('Erro ao excluir turma. Verifique se não há alunos vinculados.');
      }
    }
  };

  const turmasFiltradas = turmas.filter(turma => {
    const matchesSearch = turma.nome_turma?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTurno = filtroTurno === 'Todos Turnos' || turma.turno === filtroTurno;
    const matchesCurso = filtroCurso === 'Todos Cursos' || turma.curso === filtroCurso;

    return matchesSearch && matchesTurno && matchesCurso;
  });

  const estatisticas = {
    total: turmasFiltradas.length,
    manha: turmasFiltradas.filter(t => t.turno === 'Manhã').length,
    tarde: turmasFiltradas.filter(t => t.turno === 'Tarde').length,
    noite: turmasFiltradas.filter(t => t.turno === 'Noite').length
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Gestão de Turmas</h1>
          <p className="text-gray-600 mt-1">Gerencie as turmas da instituição</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Busca */}
          <div className="relative flex-1 min-w-[250px]">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome da turma..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          {/* Botão Nova Turma */}
          <Link
            to="/turmas/nova"
            className="bg-primary-600 text-white px-4 py-2.5 rounded-lg hover:bg-primary-700 flex items-center justify-center space-x-2 whitespace-nowrap"
          >
            <FiPlus size={18} />
            <span>Nova Turma</span>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-lg">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
            <Select 
              vect={['Todos Turnos', 'Manhã', 'Tarde', 'Noite']} 
              icon={FiClock} 
              onChange={setFiltroTurno}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Curso</label>
            <Select 
              vect={['Todos Cursos', 'Alfabetização', 'Reforço', 'Iniciação','Inglês',"Caligrafia"]} 
              icon={FiBook} 
              onChange={setFiltroCurso}
            />
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Turmas Filtradas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{estatisticas.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <FiBook className="text-blue-600 text-lg" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Manhã</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{estatisticas.manha}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-xl">
              <FiClock className="text-orange-600 text-lg" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tarde</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{estatisticas.tarde}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <FiClock className="text-green-600 text-lg" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Noite</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{estatisticas.noite}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-xl">
              <FiClock className="text-purple-600 text-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Turmas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Turma
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Curso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Professor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Turno
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Capacidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Ano Lectivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {turmasFiltradas.map((turma, index) => (
                <motion.tr
                  key={turma.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="hover:bg-white"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <FiBook className="text-primary-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {turma.nome_turma}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {turma.curso}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {turma.professor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      turma.turno === 'Manhã' 
                        ? 'bg-orange-100 text-orange-800'
                        : turma.turno === 'Tarde'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {turma.turno}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <FiUsers className="text-gray-400" />
                      <span>{turma.capacidade_maxima} alunos</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {turma.ano_lectivo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Link
                      to={`/turmas/editar/${turma.id}`}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      <FiEdit size={16} className="inline" />
                    </Link>
                    <button
                      onClick={() => handleDelete(turma.id)}
                      className="text-danger-600 hover:text-danger-900 ml-2"
                    >
                      <FiTrash2 size={16} className="inline" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {turmasFiltradas.length === 0 && (
          <div className="text-center py-12">
            <FiBook className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma turma encontrada</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Tente ajustar os termos da busca.' : 'Comece criando uma nova turma.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Turmas;