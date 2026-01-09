// src/pages/Courses/CourseDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiEdit, FiUsers, FiClock, FiDollarSign, FiBook, FiUser } from 'react-icons/fi';
import { Course } from '../../types/curso';
import { cursosService } from '../../services/database/curso';


 const CourseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem("last_rota","/cursos/"+id)
    loadCourseDetails();
  }, [id]);

  const loadCourseDetails = async () => {
    try {
      setLoading(true);
      // TODO: Substituir pelo service real
      const courseData = await cursosService.getCourseId(id||"");
      
      // Mock data
        console.log(courseData)
        setCourse(courseData);
         setLoading(false);
        
    } catch (error) {
      console.error('Erro ao carregar curso:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando curso...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Curso não encontrado</h2>
          <button
            onClick={() => navigate('/cursos')}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Voltar para a lista de cursos
          </button>
        </div>
      </div>
    );
  }

  const taxaOcupacao = (course.alunos / course.vagas) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/cursos')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <FiArrowLeft size={20} />
            Voltar para Cursos
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {course.nome}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  course.ativo 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {course.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Gerencie as informações e alunos deste curso
              </p>
            </div>
            
            <Link
              to={`/cursos/editar/${course.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <FiEdit size={18} />
              Editar Curso
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações Principais */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cartão de Informações */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Informações do Curso
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                 
                  
                  <div className="flex items-center gap-3">
                    <FiDollarSign className="text-gray-400" size={20} />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Preço</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {course.preco.toLocaleString('pt-AO')} AOA
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <FiClock className="text-gray-400" size={20} />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Duração</p>
                      <p className="font-medium text-gray-900 dark:text-white">{course.duracao}</p>
                    </div>
                  </div>
                  
                 
                </div>
              </div>
              
              {course.descricao && (
                <div className="mt-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Descrição</p>
                  <p className="text-gray-900 dark:text-white">{course.descricao}</p>
                </div>
              )}
            </motion.div>

            {/* Disciplinas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Disciplinas ({course.disciplinas.length})
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {course.disciplinas.map((disciplina, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <FiBook className="text-blue-600 dark:text-blue-400" size={16} />
                    <span className="text-gray-900 dark:text-white font-medium">{disciplina}</span>
                  </div>
                ))}
              </div>
            </motion.div>

                   {/* Disciplinas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Turmas ({course.turmas.length})
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {course.turmas.map((turma, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.05, background:'linear-gradient(rgb(255, 255, 255),rgb(240, 249, 255))',boxShadow: '0 8px 15px rgba(0, 0, 0, 0.1)',transition: { duration: 0.3 } }}
                    transition={{ delay: 0.1 }}
                    key={index}
                    className="flex cursor-pointer gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    onClick={()=>navigate("/turmas/"+turma.id)}
                  >
                    <FiBook className="text-blue-600 dark:text-blue-400 mt-2" size={16} />
                   <div className='flex-col gap-1 flex'>
                       <span className="text-gray-900 dark:text-white font-medium">{turma.nome_turma}</span>
                      <span className="text-gray-900 dark:text-white font-normal">Professor: {turma.professor}</span>
                      <span className="text-gray-900  dark:text-white font-normal">Turno: {turma.turno}</span>
                   </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar - Estatísticas */}
          <div className="space-y-6">
            {/* Estatísticas de Vagas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Estatísticas de Vagas
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>Vagas ocupadas</span>
                    <span>{course.alunos}/{course.vagas}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${taxaOcupacao}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {taxaOcupacao.toFixed(1)}% de ocupação
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {course.vagas - course.alunos}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Vagas livres</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {course.alunos}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Alunos inscritos</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Receita Estimada */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Receita Estimada
              </h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Mensal</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {(course.preco * course.alunos).toLocaleString('pt-AO')} AOA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total do curso</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {(course.preco * course.alunos * 6).toLocaleString('pt-AO')} AOA
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;