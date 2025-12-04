// src/pages/Students/Students.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit, FiTrash2, FiUser, FiSearch } from 'react-icons/fi';
import { studentsService } from '../../services/database';
import { Select } from '../../components/ui/Select';
import { FaBookAtlas, FaGraduationCap, FaPeopleGroup } from 'react-icons/fa6';
import { RxPerson } from 'react-icons/rx';
import { StatCard } from '../../components/students/StatCard';
import { Student } from '../../types';
import { SelectTyped } from '../../components/students/StudentForm';


const Students = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroProfessor, setFiltroProfessor] = useState('Todos Professores');
  const [filtroTurma, setFiltroTurma] = useState('Todas Turmas');
  const nav = useNavigate();

  const abrirAluno = (alunoId: string) => {
    console.log('Abrir aluno com ID:', alunoId);
    nav(`/alunos/${alunoId}`);
  };

  const { professores, turmas } = useMemo(() => {
    const profs = [...new Set(students.map(s => s.turmas?.professor).filter(Boolean))];
    const turms = [...new Set(students.map(s => s.turmas?.nome_turma).filter(Boolean))];
    
    return {
      professores: ['Todos Professores', ...profs],
      turmas: ['Todas Turmas', ...turms]
    };
  }, [students]);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const studentsData = await studentsService.getStudents();
      setStudents(studentsData);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
    } finally {
      setLoading(false);
    }
  };

  const estatisticas = useMemo(() => {
    const alunosFiltrados = students.filter(student => {
      const matchesSearch = student.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (student.numero_estudante+"")?.includes(searchTerm);
      
      const matchesProfessor = filtroProfessor === 'Todos Professores' || 
                             student.turmas?.professor === filtroProfessor;
      
      const matchesTurma = filtroTurma === 'Todas Turmas' || 
                          student.turmas?.nome_turma === filtroTurma;

      return matchesSearch && matchesProfessor && matchesTurma;
    });

    const total = alunosFiltrados.length;
    const ativos = alunosFiltrados.filter(s => s.estado === 'ativo').length;
    const inativos = alunosFiltrados.filter(s => s.estado !== 'ativo').length;
    const transferidos = alunosFiltrados.filter(s => s.estado === 'transferido').length;
    const desistentes = alunosFiltrados.filter(s => s.estado === 'desistente').length;
    const cartaoPago = alunosFiltrados.filter(s => s.cartao_pago).length;

    return {
      total,
      ativos,
      inativos,
      transferidos,
      desistentes,
      cartaoPago,
      percentualCartao: total > 0 ? ((cartaoPago / total) * 100) : 0
    };
  }, [students, searchTerm, filtroProfessor, filtroTurma]);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (student.numero_estudante+"")?.includes(searchTerm);
    
    const matchesProfessor = filtroProfessor === 'Todos Professores' || 
                           student.turmas?.professor === filtroProfessor;
    
    const matchesTurma = filtroTurma === 'Todas Turmas' || 
                        student.turmas?.nome_turma === filtroTurma;

    return matchesSearch && matchesProfessor && matchesTurma;
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho com Busca Integrada */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Gestão de Alunos</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Gerencie os alunos da instituição</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Busca */}
          <div className="relative flex-1 min-w-[300px]">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou número de estudante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          
          {/* Botão Novo Aluno */}
          <Link
            to="/alunos/novo"
            className="bg-blue-600 text-white px-4 py-2.5 transition-colors rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 whitespace-nowrap font-medium"
          >
            <FiPlus size={18} />
            <span>Novo Aluno</span>
          </Link>
        </div>
      </div>

      {/* Filtros Rápidos */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Professor</label>
            <SelectTyped 
              vect={professores} 
              icon={RxPerson} 
              onChange={setFiltroProfessor}
              value={filtroProfessor}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Turma</label>
            <SelectTyped 
              vect={turmas} 
              icon={FaBookAtlas} 
              onChange={setFiltroTurma}
              value={filtroTurma}
            />
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard 
          title="Alunos Filtrados" 
          value={estatisticas.total}
          subtitle={estatisticas.total === students.length ? 'Todos os alunos' : `${((estatisticas.total / students.length) * 100).toFixed(1)}% do total`}
          icon={FaPeopleGroup}
          color="blue"
          trend={estatisticas.total > 0 ? 'positive' : 'neutral'}
        />
        
        <StatCard 
          title="Ativos" 
          value={estatisticas.ativos}
          subtitle={estatisticas.total > 0 ? `${((estatisticas.ativos / estatisticas.total) * 100).toFixed(1)}% dos filtrados` : 'Sem dados'}
          icon={FaGraduationCap}
          color="green"
          trend={estatisticas.ativos > 0 ? 'positive' : 'neutral'}
        />
        
        <StatCard 
          title="Inativos" 
          value={estatisticas.inativos}
          subtitle={
            <>
              {estatisticas.transferidos > 0 && <span className="text-orange-500">{estatisticas.transferidos}T</span>}
              {estatisticas.transferidos > 0 && estatisticas.desistentes > 0 && ' • '}
              {estatisticas.desistentes > 0 && <span className="text-red-500">{estatisticas.desistentes}D</span>}
            </>
          }
          icon={FiUser}
          color="red"
          trend="neutral"
        />
        
        <StatCard 
          title="Cartão Pago" 
          value={estatisticas.cartaoPago}
          subtitle={estatisticas.total > 0 ? `${estatisticas.percentualCartao.toFixed(1)}% dos filtrados` : 'Sem dados'}
          icon={FaBookAtlas}
          color="purple"
          trend={estatisticas.percentualCartao > 50 ? 'positive' : 'neutral'}
        />
      </div>

      {/* Indicador de Filtros Ativos */}
      {(searchTerm || filtroProfessor !== 'Todos Professores' || filtroTurma !== 'Todas Turmas') && (
        <div className="bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 rounded-lg p-4">
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
                  {filtroProfessor}
                  <button 
                    onClick={() => setFiltroProfessor('Todos Professores')}
                    className="ml-2 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                  >
                    ×
                  </button>
                </span>
              )}
              {filtroTurma !== 'Todas Turmas' && (
                <span className="inline-flex items-center bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
                  {filtroTurma}
                  <button 
                    onClick={() => setFiltroTurma('Todas Turmas')}
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
                setFiltroTurma('Todas Turmas');
              }}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium whitespace-nowrap"
            >
              Limpar todos os filtros
            </button>
          </div>
        </div>
      )}

      {/* Lista de Alunos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-600 dark:bg-blue-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Aluno
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Professor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Número de Estudante
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Turma
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStudents.map((student, index) => (
                <motion.tr
                  key={student.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        onClick={() => abrirAluno(student.id)} 
                        className="flex-shrink-0 cursor-pointer text-blue-600 hover:text-white hover:bg-blue-700 transition-colors h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center"
                      >
                        <FiUser />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {student.nome_completo}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          {student.contacto_principal}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {student.turmas?.professor || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {student.numero_estudante}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {student.turmas?.nome_turma || 'Sem turma'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      student.estado === 'ativo' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : student.estado === 'transferido'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {student.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Link
                      to={`/alunos/editar/${student.id}`}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <FiEdit size={16} className="inline" />
                    </Link>
                    <button
                      onClick={() => {
                        studentsService.deleteStudent(student.id);
                        setStudents(prev => prev.filter(s => s.id !== student.id));

                      }}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ml-2"
                    >
                      <FiTrash2 size={16} className="inline" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <FiUser className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum aluno encontrado</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Tente ajustar os termos da busca.' : 'Comece adicionando um novo aluno.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Students;