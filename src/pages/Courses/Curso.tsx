// src/pages/Courses/Courses.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit, FiTrash2, FiBook, FiSearch, FiClock, FiUsers } from 'react-icons/fi';
import { Select } from '../../components/ui/Select';
import { FaMoneyBillWave, FaChalkboardUser } from 'react-icons/fa6';
import { StatCard } from '../../components/students/StatCard';
import { FaChalkboardTeacher } from 'react-icons/fa';
import { Course, CourseFormData } from '../../types/curso';
import { cursosService } from '../../services/database';
import { SelectTyped } from '../../components/students/StudentForm';
// Mock data - depois substitui pelo service real

 
export const Courses = () => {
  const [cursos, setCursos] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroProfessor, setFiltroProfessor] = useState('Todos Professores');
  const [filtroStatus, setFiltroStatus] = useState('Todos Status');
  const nav = useNavigate();

  const abrirCurso = (cursoId: string) => {
    console.log('Abrir curso com ID:', cursoId);
    nav(`/cursos/${cursoId}`);
  };

  const { status } = useMemo(() => {
    const stats = ['Todos Status', 'Ativos', 'Inativos'];
    
    return {
      status: stats
    };
  }, [cursos]);


  useEffect(() => {
    Reload();
  }, []);

  function Reload(){

  const loadCursos = async () => {
    try {
      setLoading(true);
      const cursosData = await cursosService.getCourse();
        setCursos(cursosData||[]);
       
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
      }finally{
      setLoading(false);
    }
  };
      loadCursos();
  }

 

  const estatisticas = useMemo(() => {
    const cursosFiltrados = cursos.filter(curso => {
      const matchesSearch = curso.nome?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filtroStatus === 'Todos Status' || 
                          (filtroStatus === 'Ativos' && curso.ativo) ||
                          (filtroStatus === 'Inativos' && !curso.ativo);

      return matchesSearch  && matchesStatus;
    });

    const total = cursosFiltrados.length;
    const ativos = cursosFiltrados.filter(c => c.ativo).length;
    const inativos = cursosFiltrados.filter(c => !c.ativo).length;
    const totalVagas = cursosFiltrados.reduce((acc, cur) => acc + cur.vagas, 0);
    const totalInscritos = cursosFiltrados.reduce((acc, cur) => acc + cur.alunos, 0);
    const taxaOcupacao = totalVagas > 0 ? (totalInscritos / totalVagas) * 100 : 0;
    const receitaPotencial = cursosFiltrados.reduce((acc, cur) => acc + (cur.preco * cur.alunos), 0);

    return {
      total,
      ativos,
      inativos,
      totalVagas,
      totalInscritos,
      taxaOcupacao,
      receitaPotencial
    };
  }, [cursos, searchTerm, filtroProfessor, filtroStatus]);

  const filteredCourses = cursos.filter(curso => {
    const matchesSearch = curso.nome?.toLowerCase().includes(searchTerm.toLowerCase());

    
    const matchesStatus = filtroStatus === 'Todos Status' || 
                        (filtroStatus === 'Ativos' && curso.ativo) ||
                        (filtroStatus === 'Inativos' && !curso.ativo);

    return matchesSearch  && matchesStatus;
  });

  const deleteCurso = (cursoId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este curso?')) {
      setCursos(prev => prev.filter(curso => curso.id !== cursoId));
    }
  };

    if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com Busca Integrada */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Gestão de Cursos</h1>
          <p className="text-gray-600 dark:text-gray-100 mt-1">Gerencie os cursos da instituição</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Busca */}
        
          
          {/* Botão Novo Curso */}
          <Link
            to="/cursos/novo"
            className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 my-5 hover:to-indigo-800 text-white px-4 py-2.5 transition-colors rounded-md hover:bg-primary-700 flex items-center justify-center space-x-2 whitespace-nowrap"
          >
            <FiPlus size={18} />
            <span>Novo Curso</span>
          </Link>
        </div>
      </div>

      {/* Filtros Rápidos */}
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
           <div className="relative flex-1 min-w-[300px]">
            <FiSearch className="absolute left-3 top-5 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <SelectTyped 
              vect={status} 
              icon={FiUsers} 
              onChange={setFiltroStatus}
              value={filtroStatus}
            />
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard 
          title="Cursos Filtrados" 
          value={estatisticas.total}
          subtitle={estatisticas.total === cursos.length ? 'Todos os cursos' : `${((estatisticas.total / cursos.length) * 100).toFixed(1)}% do total`}
          icon={FiBook}
          color="blue"
          trend={estatisticas.total > 0 ? 'positive' : 'neutral'}
        />
        
        <StatCard 
          title="Alunos Inscritos" 
          value={estatisticas.totalInscritos}
          subtitle={`${estatisticas.taxaOcupacao.toFixed(1)}% das vagas ocupadas`}
          icon={FiUsers}
          color="green"
          trend={estatisticas.totalInscritos > 0 ? 'positive' : 'neutral'}
        />
        
        <StatCard 
          title="Cursos Ativos" 
          value={estatisticas.ativos}
          subtitle={estatisticas.total > 0 ? `${((estatisticas.ativos / estatisticas.total) * 100).toFixed(1)}% dos filtrados` : 'Sem dados'}
          icon={FaChalkboardTeacher}
          color="purple"
          trend={estatisticas.ativos > 0 ? 'positive' : 'neutral'}
        />
        
        <StatCard 
          title="Receita Potencial" 
          value={`${(estatisticas.receitaPotencial / 1000).toFixed(0)}K AOA`}
          subtitle="Valor mensal estimado"
          icon={FaMoneyBillWave}
          color="green"
          trend={estatisticas.receitaPotencial > 0 ? 'positive' : 'neutral'}
        />
      </div>

      {/* Indicador de Filtros Ativos */}
      {(searchTerm || filtroProfessor !== 'Todos Professores' || filtroStatus !== 'Todos Status') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Filtros ativos:</span>
              {searchTerm && (
                <span className="inline-flex items-center bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
                  🔍 {searchTerm}
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="ml-2 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                  >
                    ×
                  </button>
                </span>
              )}
              {filtroProfessor !== 'Todos Professores' && (
                <span className="inline-flex items-center bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
                  👨‍🏫 {filtroProfessor}
                  <button 
                    onClick={() => setFiltroProfessor('Todos Professores')}
                    className="ml-2 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                  >
                    ×
                  </button>
                </span>
              )}
              {filtroStatus !== 'Todos Status' && (
                <span className="inline-flex items-center bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
                  {filtroStatus === 'Ativos' ? '✅ Ativos' : '❌ Inativos'}
                  <button 
                    onClick={() => setFiltroStatus('Todos Status')}
                    className="ml-2 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setFiltroProfessor('Todos Professores');
                setFiltroStatus('Todos Status');
              }}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium whitespace-nowrap"
            >
              Limpar todos os filtros
            </button>
          </div>
        </div>
      )}

      {/* Lista de Cursos */}
      <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Curso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Preço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Disciplinas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Vagas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Turmas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCourses.map((curso, index) => (
                <motion.tr
                  key={curso.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        onClick={() => abrirCurso(curso.id)} 
                        className="flex-shrink-0 cursor-pointer text-primary-600 hover:text-white hover:bg-primary-700 transition-colors h-10 w-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center"
                      >
                        <FiBook />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium dark:text-white text-gray-900">
                          {curso.nome}
                        </div>
                       
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap dark:text-white text-sm text-gray-900">
                    {curso.preco.toLocaleString('pt-AO')} AOA
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {curso.disciplinas.map((disciplina, idx) => (
                        <span 
                          key={idx}
                          className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs px-2 py-1 rounded"
                        >
                          {disciplina}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{curso.alunos}/{curso.vagas}</span>
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${(curso.alunos/ curso.vagas) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                   <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {curso.turmas.map((turma, idx) => (
                        <span 
                          key={idx}
                          className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs px-2 py-1 rounded"
                        >
                          {turma.nome_turma}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      curso.ativo 
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
                    }`}>
                      {curso.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Link
                      to={`/cursos/editar/${curso.id}`}
                      className="text-primary-600 hover:text-primary-900 dark:hover:text-primary-400"
                    >
                      <FiEdit size={16} className="inline" />
                    </Link>
                    <button
                      onClick={() => deleteCurso(curso.id)}
                      className="text-red-600 hover:text-red-900 dark:hover:text-red-400 ml-2"
                    >
                      <FiTrash2 size={16} className="inline" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <FiBook className="mx-auto h-12 w-12 dark:text-gray-400 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium dark:text-white text-gray-900">Nenhum curso encontrado</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Tente ajustar os termos da busca.' : 'Comece adicionando um novo curso.'}
            </p>
              <button className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-2 rounded-lg font-medium hover:from-blue-700 my-5 hover:to-indigo-800"
              onClick={Reload}>Reload pagina</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;