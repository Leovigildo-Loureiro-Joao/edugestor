import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit, FiTrash2, FiUsers, FiBook, FiClock, FiSearch } from 'react-icons/fi';
import { turmaService } from '../../services/database';
import { Select } from '../../components/ui/Select';
import {Turma} from "../../types/turma"
import { SelectTyped } from '../../components/students/StudentForm';

// Definição das interfaces

interface Estatisticas {
  total: number;
  manha: number;
  tarde: number;
  noite: number;
}

interface TurmasFiltros {
  turno: string;
  curso: string;
}

const Turmas: React.FC = () => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filtroTurno, setFiltroTurno] = useState<string>('Todos Turnos');
  const [filtroCurso, setFiltroCurso] = useState<string>('Todos Cursos');
  const nav = useNavigate();

  useEffect(() => {
      Reload();
    }, []);

  
    function Reload(){
  
      const loadTurmas = async (): Promise<void> => {
        try {
          setLoading(true);
          const turmasData: Turma [] = await turmaService.getTurmas();
          setTurmas(turmasData);
        } catch (error) {
          console.error('Erro ao carregar turmas:', error);
        } finally {
          setLoading(false);
        }
      };
      loadTurmas();
    }
 

 

  const abrirTurma = (cursoId: string): void => {
    console.log('Abrir curso com ID:', cursoId);
    nav(`/turmas/${cursoId}`);
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (window.confirm('Tem certeza que deseja excluir esta turma?')) {
      try {
        await turmaService.deleteTurma(id);
        setTurmas(turmas.filter(t => t.id !== id));
      } catch (error) {
        console.error('Erro ao excluir turma:', error);
        // alert('Erro ao excluir turma. Verifique se não há alunos vinculados.');
      }
    }
  };

  const turmasFiltradas: Turma[] = !turmas ? [] : turmas.filter((turma: Turma) => {
    const matchesSearch = turma.nome_turma?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTurno = filtroTurno === 'Todos Turnos' || turma.turno === filtroTurno;
    const matchesCurso = filtroCurso === 'Todos Cursos' || turma.curso_nome === filtroCurso;

    return matchesSearch && matchesTurno && matchesCurso;
  });

  const estatisticas: Estatisticas = {
    total: turmasFiltradas.length,
    manha: turmasFiltradas.filter(t => t.turno.toLowerCase() === 'manhã').length,
    tarde: turmasFiltradas.filter(t => t.turno.toLowerCase() === 'tarde').length,
    noite: turmasFiltradas.filter(t => t.turno.toLowerCase() === 'noite').length
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 dark:border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 dark:bg-gray-900 min-h-screen p-4">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Gestão de Turmas</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie as turmas da instituição</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Busca */}
          <div className="relative flex-1 min-w-[250px]">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por nome da turma..."
              value={searchTerm}
              onChange={(e:any) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          
          {/* Botão Nova Turma */}
          <Link
            to="/turmas/nova"
            className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 my-5 hover:to-indigo-800 dark:bg-primary-500 text-white px-4 py-2.5 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 flex items-center justify-center space-x-2 whitespace-nowrap transition-colors"
          >
            <FiPlus size={18} />
            <span>Nova Turma</span>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turno</label>
            <SelectTyped 
              vect={['Todos Turnos', 'Manhã', 'Tarde', 'Noite']} 
              icon={FiClock} 
              onChange={setFiltroTurno}
              darkMode
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Curso</label>
            <SelectTyped 
              vect={['Todos Cursos', 'Alfabetização', 'Reforço', 'Iniciação', 'Inglês', 'Caligrafia']} 
              icon={FiBook} 
              onChange={setFiltroCurso}
              darkMode
            />
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm dark:shadow-gray-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Turmas Filtradas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{estatisticas.total}</p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
              <FiBook className="text-blue-600 dark:text-blue-400 text-lg" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm dark:shadow-gray-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Manhã</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-500 mt-1">{estatisticas.manha}</p>
            </div>
            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-xl">
              <FiClock className="text-orange-600 dark:text-orange-400 text-lg" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm dark:shadow-gray-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tarde</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-500 mt-1">{estatisticas.tarde}</p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-xl">
              <FiClock className="text-green-600 dark:text-green-400 text-lg" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm dark:shadow-gray-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Noite</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-500 mt-1">{estatisticas.noite}</p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl">
              <FiClock className="text-purple-600 dark:text-purple-400 text-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Turmas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary-600 dark:bg-primary-700">
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
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {turmasFiltradas.map((turma: Turma, index: number) => (
                <motion.tr
                  key={turma.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap" onClick={() => abrirTurma(turma.id)}>
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors">
                        <FiBook className="" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {turma.nome_turma}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {turma?.curso_nome}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {turma.professor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      turma.turno.toLowerCase() === 'manhã' 
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                        : turma.turno.toLowerCase()=== 'tarde'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                    }`}>
                      {turma.turno}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    <div className="flex items-center space-x-2">
                      <FiUsers className="text-gray-400 dark:text-gray-500" />
                      <span>{turma.capacidade_maxima} alunos</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {turma.ano_lectivo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Link
                      to={`/turmas/editar/${turma.id}`}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 transition-colors"
                    >
                      <FiEdit size={16} className="inline" />
                    </Link>
                    <button
                      onClick={() => handleDelete(turma.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 ml-2 transition-colors"
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
            <FiBook className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhuma turma encontrada</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Tente ajustar os termos da busca.' : 'Comece criando uma nova turma.'}
            </p>
             <button className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 my-5 hover:to-indigo-800 text-white px-8 py-2 rounded-lg font-medium "
              onClick={Reload}>Reload pagina</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Turmas;