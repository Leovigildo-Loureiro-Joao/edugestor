
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiArrowLeft, FiEdit, FiUsers, FiClock, FiDollarSign, 
  FiBook, FiUser, FiBarChart2, FiTrendingUp, FiTrendingDown,
  FiCalendar, FiCheckCircle, FiXCircle, FiActivity, FiPieChart,
  FiAward, FiTarget
} from 'react-icons/fi';
import { Course } from '../../types/curso';
import { Turma, TurmaCompleta } from '../../types/turma';
import { Aula } from '../../types/aula';
import { Frequencia } from '../../types/frequencia';
import { cursosService } from '../../services/database/curso';
import { turmaService } from '../../services/database/turmas';
import { avaliacaoService } from '../../services/database/avaliacao';
import { frequenciaService } from '../../services/database/frequenciaService';
import { PageLoader } from '../../components/ui/PageLoader';
import { StatCard } from '../../components/students/StatCard';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { aulaService } from '../../services/database';
import { useSmartBack } from '../../hooks/useSmartBack';

interface TurmaDesempenho extends Turma {
  estatisticas: {
    totalAulas: number;
    aulasMinistradas: number;
    taxaPresenca: number;
    mediaNotas: number;
    alunosAtivos: number;
    alunosComMedia: number;
  };
}

interface AnaliseCurso {
  totalTurmas: number;
  totalAlunos: number;
  totalAulas: number;
  aulasMinistradas: number;
  taxaPresencaGeral: number;
  mediaNotasGeral: number;
  turmasAtivas: number;
  desempenhoTurmas: TurmaDesempenho[];
  distribuicaoPresenca: {
    excelente: number; 
    bom: number;       
    regular: number;   
    critico: number;   
  };
  topDisciplinas: Array<{
    nome: string;
    media: number;
    totalAulas: number;
  }>;
}

export const CourseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<'info' | 'analise'>('info');
  const [analise, setAnalise] = useState<AnaliseCurso | null>(null);

  useEffect(() => {
    loadCourseDetails();
  }, [id]);

  const loadCourseDetails = async () => {
    try {
      setLoading(true);
      const courseData = await cursosService.getCoursesId(id || "");
      
      if (courseData) {
        setCourse(courseData);
        
        
        await carregarAnaliseCurso(courseData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar curso:', error);
      setLoading(false);
    }
  };

  const carregarAnaliseCurso = async (curso: Course) => {
    try {
      if (!curso.turmas?.length) {
        setAnalise(null);
        return;
      }

      
      const turmasComDesempenho: TurmaDesempenho[] = [];
      let totalAlunos = 0;
      let totalAulas = 0;
      let totalAulasMinistradas = 0;
      let totalPresencas = 0;
      let totalFrequencias = 0;
      let totalNotas = 0;
      let totalAvaliacoes = 0;

      
      const distribuicao = {
        excelente: 0,
        bom: 0,
        regular: 0,
        critico: 0
      };

      
      const disciplinasMap = new Map<string, { soma: number; count: number; aulas: number }>();

      for (const turma of curso.turmas) {
        
        const aulas = await aulaService.getAulasPorTurma(turma.id);
        const aulasMinistradas = aulas.filter(a => a.status === 'ministrada');
        
        
        const frequencias = await Promise.all(
          aulasMinistradas.map(a => frequenciaService.getFrequenciaPorAula(a.id))
        );
        const todasFrequencias = frequencias.flat();
        
        
        const avaliacoes = await avaliacaoService.getAvaliacoesByTurma(turma.id);
        
        
        const alunosTurma = turma.qtd || 0;
        totalAlunos += alunosTurma;
        
        const qtdAulas = aulas.length;
        const qtdAulasMinistradas = aulasMinistradas.length;
        totalAulas += qtdAulas;
        totalAulasMinistradas += qtdAulasMinistradas;
        
        
        let presencasTurma = 0;
        let totalRegistros = 0;
        
        todasFrequencias.forEach(f => {
          if (f.presente) presencasTurma++;
          totalRegistros++;
        });
        
        totalPresencas += presencasTurma;
        totalFrequencias += totalRegistros;
        
        const taxaPresenca = totalRegistros > 0 ? (presencasTurma / totalRegistros) * 100 : 0;
        
        
        if (taxaPresenca >= 90) distribuicao.excelente++;
        else if (taxaPresenca >= 70) distribuicao.bom++;
        else if (taxaPresenca >= 50) distribuicao.regular++;
        else distribuicao.critico++;
        
        
        let somaNotas = 0;
        avaliacoes.forEach(av => {
          somaNotas += av.nota;
          totalAvaliacoes++;
          
          
          const disc = disciplinasMap.get(av.disciplina) || { soma: 0, count: 0, aulas: 0 };
          disc.soma += av.nota;
          disc.count++;
          disciplinasMap.set(av.disciplina, disc);
        });
        
        totalNotas += somaNotas;
        
        const mediaNotas = avaliacoes.length > 0 ? somaNotas / avaliacoes.length : 0;
        
        
        const alunosComMedia = await avaliacaoService.getAlunosComMediaAcima(turma.id, 10);
        
        turmasComDesempenho.push({
          ...turma,
          estatisticas: {
            totalAulas: qtdAulas,
            aulasMinistradas: qtdAulasMinistradas,
            taxaPresenca,
            mediaNotas,
            alunosAtivos: alunosTurma,
            alunosComMedia: alunosComMedia.length
          }
        });
        
        
        aulasMinistradas.forEach(aula => {
          const disc = disciplinasMap.get(aula.disciplina) || { soma: 0, count: 0, aulas: 0 };
          disc.aulas++;
          disciplinasMap.set(aula.disciplina, disc);
        });
      }

      
      const mediaNotasGeral = totalAvaliacoes > 0 ? totalNotas / totalAvaliacoes : 0;
      const taxaPresencaGeral = totalFrequencias > 0 ? (totalPresencas / totalFrequencias) * 100 : 0;

      
      const topDisciplinas = Array.from(disciplinasMap.entries())
        .map(([nome, data]) => ({
          nome,
          media: data.count > 0 ? data.soma / data.count : 0,
          totalAulas: data.aulas
        }))
        .sort((a, b) => b.media - a.media)
        .slice(0, 5);

      setAnalise({
        totalTurmas: curso.turmas.length,
        totalAlunos,
        totalAulas,
        aulasMinistradas: totalAulasMinistradas,
        taxaPresencaGeral,
        mediaNotasGeral,
        turmasAtivas: curso.turmas.filter(t => t.estado === 'ativa').length,
        desempenhoTurmas: turmasComDesempenho,
        distribuicaoPresenca: distribuicao,
        topDisciplinas
      });

    } catch (error) {
      console.error('Erro ao carregar análise do curso:', error);
    }
  };

  const taxaOcupacao = course ? ((course.alunos??0) / course.vagas) * 100 : 0;

  if (loading) {
    return <PageLoader title="Abrindo detalhes do curso" subtitle="Carregando disciplinas, turmas e indicadores..." />;
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Curso não encontrado</h2>
          <button
            onClick={() => goBack('/cursos')}
            className="mt-4 p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            aria-label="Voltar"
          >
            <FiArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
       <div className="mb-8">
   
      <div className="flex items-start gap-3 mb-4">
        <motion.button
          whileHover={{ scale: 1.1, x: -3 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => goBack('/cursos')}
          className="p-2.5 flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
          aria-label="Voltar"
        >
          <FiArrowLeft className="h-5 w-5" />
        </motion.button>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight truncate">
              {course.nome}
            </h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 ${
              course.ativo 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
            }`}>
              {course.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Gerencie as informações e acompanhe o desempenho do curso
          </p>
        </div>
      </div>

  {/* Ações e tabs - agora abaixo do título no mobile */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    {/* Tabs */}
    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
      <button
        onClick={() => setAbaAtiva('info')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
          abaAtiva === 'info'
            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        <FiBook size={16} />
        <span>Informações</span>
      </button>
      <button
        onClick={() => setAbaAtiva('analise')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
          abaAtiva === 'analise'
            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        <FiBarChart2 size={16} />
        <span>Análise</span>
      </button>
    </div>

    {/* Botão editar */}
    <Link
      to={`/cursos/editar/${course.id}`}
      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium w-full sm:w-auto"
    >
      <FiEdit size={18} />
      Editar Curso
    </Link>
  </div>
</div>

        <AnimatePresence mode="wait">
          {abaAtiva === 'info' ? (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Coluna principal - Informações do Curso */}
              <div className="lg:col-span-2 space-y-6">
                {/* Cartão de Informações */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                >
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
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
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
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

                {/* Turmas */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                >
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Turmas ({(course.turmas??[]).length})
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(course.turmas??[]).map((turma, index) => (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        transition={{ delay: index * 0.05 }}
                        key={index}
                        className="flex cursor-pointer gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                        onClick={() => navigate("/turmas/" + turma.id)}
                      >
                        <FiBook className="text-blue-600 dark:text-blue-400 mt-2" size={16} />
                        <div className='flex-col gap-1 flex'>
                          <span className="text-gray-900 dark:text-white font-medium">{turma.nome_turma}</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">Professor: {turma.professor}</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">Turno: {turma.turno}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <FiUsers size={12} className="text-gray-400" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">{turma.qtd || 0} alunos</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Sidebar - Estatísticas de Vagas */}
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                >
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Estatísticas de Vagas
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <span>Vagas ocupadas</span>
                        <span className={(course.alunos??0) > course.vagas ? 'text-red-600 font-bold' : ''}>
                          {(course.alunos ?? 0)}/{course.vagas}
                        </span>
                      </div>
                    
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 relative">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 absolute top-0 left-0 ${
                            (course.alunos??0) > course.vagas 
                              ? 'bg-red-700' 
                              : taxaOcupacao > 90 
                                ? 'bg-red-500'
                                : taxaOcupacao > 70
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(taxaOcupacao, 100)}%` }}
                        />
                        
                        {(course.alunos??0) > course.vagas && (
                          <div 
                            className="h-2 rounded-full bg-red-700 absolute top-0"
                            style={{ 
                              width: '4px',
                              left: '100%',
                              transform: 'translateX(-2px)'
                            }}
                            title={`Excedente: ${(course.alunos??0) - course.vagas} alunos`}
                          />
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.min(taxaOcupacao, 100).toFixed(1)}% de ocupação
                        </p>
                        
                        {(course.alunos??0) > course.vagas && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                            Excedente: +{(course.alunos??0) - course.vagas}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${
                          (course.alunos??0) > course.vagas 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-blue-600 dark:text-blue-400'
                        }`}>
                          {(course.alunos??0) > course.vagas ? 0 : course.vagas - (course.alunos??0)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Vagas livres</p>
                        {(course.alunos??0) > course.vagas && (
                          <p className="text-xs text-red-500 dark:text-red-400">
                            Capacidade excedida
                          </p>
                        )}
                      </div>
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${
                          (course.alunos??0) > course.vagas 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {(course.alunos??0)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Alunos inscritos</p>
                        {(course.alunos??0) > course.vagas && (
                          <p className="text-xs text-red-500 dark:text-red-400">
                            +{(course.alunos??0) - course.vagas} acima
                          </p>
                        )}
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
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Receita Estimada
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Mensal</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {(course.preco * (course.alunos??0)).toLocaleString('pt-AO')} AOA
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Total do curso (6 meses)</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {(course.preco * (course.alunos??0) * 6).toLocaleString('pt-AO')} AOA
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            
            <motion.div
              key="analise"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {analise ? (
                <>
                  {/* Cards de Estatísticas Gerais */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      title="Turmas Ativas"
                      value={analise.turmasAtivas}
                      subtitle={`de ${analise.totalTurmas} turmas`}
                      icon={FiUsers}
                      color="blue"
                      trend={analise.turmasAtivas > 0 ? 'positive' : 'neutral'}
                    />
                    
                    <StatCard
                      title="Média de Presença"
                      value={`${analise.taxaPresencaGeral.toFixed(1)}%`}
                      subtitle={`${analise.aulasMinistradas} de ${analise.totalAulas} aulas`}
                      icon={FiActivity}
                      color="green"
                      trend={analise.taxaPresencaGeral >= 70 ? 'positive' : 'negative'}
                      progress
                      percent={analise.taxaPresencaGeral}
                    />
                    
                    <StatCard
                      title="Média de Notas"
                      value={analise.mediaNotasGeral.toFixed(1)}
                      subtitle="/20 pontos"
                      icon={FiAward}
                      color="purple"
                      trend={analise.mediaNotasGeral >= 14 ? 'positive' : analise.mediaNotasGeral >= 10 ? 'neutral' : 'negative'}
                      progress
                      percent={(analise.mediaNotasGeral / 20) * 100}
                    />
                    
                    <StatCard
                      title="Total Alunos"
                      value={analise.totalAlunos}
                      subtitle="matriculados"
                      icon={FiTarget}
                      color="orange"
                      trend={analise.totalAlunos > 0 ? 'positive' : 'neutral'}
                    />
                  </div>

                  {/* Distribuição de Presença */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                      >
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <FiPieChart className="text-blue-600" />
                          Distribuição de Presença
                        </h3>
                        
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-green-600 dark:text-green-400">Excelente (≥90%)</span>
                              <span className="font-medium">{analise.distribuicaoPresenca.excelente} turmas</span>
                            </div>
                            <ProgressBar 
                              value={analise.distribuicaoPresenca.excelente} 
                              max={analise.totalTurmas}
                              color="green"
                              height="sm"
                            />
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-blue-600 dark:text-blue-400">Bom (70-90%)</span>
                              <span className="font-medium">{analise.distribuicaoPresenca.bom} turmas</span>
                            </div>
                            
                            <ProgressBar 
                              value={analise.distribuicaoPresenca.bom} 
                              max={analise.totalTurmas}
                              color="blue"
                            />
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-yellow-600 dark:text-yellow-400">Regular (50-70%)</span>
                              <span className="font-medium">{analise.distribuicaoPresenca.regular} turmas</span>
                            </div>
                            <ProgressBar 
                              value={analise.distribuicaoPresenca.regular} 
                              max={analise.totalTurmas}
                              color="yellow"
                            />
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-red-600 dark:text-red-400">Crítico (&lt;50%)</span>
                              <span className="font-medium">{analise.distribuicaoPresenca.critico} turmas</span>
                            </div>
                            <ProgressBar 
                              value={analise.distribuicaoPresenca.critico} 
                              max={analise.totalTurmas}
                              color="red"
                            />
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Top Disciplinas */}
                    <div className="lg:col-span-2">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                      >
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <FiTrendingUp className="text-green-600" />
                          Top Disciplinas por Média
                        </h3>
                        
                        <div className="space-y-4">
                          {analise.topDisciplinas.map((disciplina, index) => (
                            <div key={index}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {disciplina.nome}
                                </span>
                                <span className="text-gray-600 dark:text-gray-400">
                                  {disciplina.media.toFixed(1)} | {disciplina.totalAulas} aulas
                                </span>
                              </div>
                              <ProgressBar 
                                value={disciplina.media} 
                                max={20}
                                color={disciplina.media >= 14 ? 'green' : disciplina.media >= 10 ? 'yellow' : 'red'}
                              />
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Tabela de Desempenho por Turma */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <FiBarChart2 className="text-purple-600" />
                        Desempenho por Turma
                      </h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Turma</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Aulas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Presença</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Média</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Alunos</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Com Média ≥10</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {analise.desempenhoTurmas.map((turma) => (
                            <motion.tr
                              key={turma.id}
                              whileHover={{ scale: 1.001 }}
                              className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              onClick={() => navigate(`/turmas/${turma.id}`)}
                            >
                              <td className="px-6 py-4">
                                <div className="font-medium text-gray-900 dark:text-white">{turma.nome_turma}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{turma.professor}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {turma.estatisticas.aulasMinistradas}/{turma.estatisticas.totalAulas}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {((turma.estatisticas.aulasMinistradas / turma.estatisticas.totalAulas) * 100 || 0).toFixed(0)}%
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${
                                    turma.estatisticas.taxaPresenca >= 80 ? 'text-green-600 dark:text-green-400' :
                                    turma.estatisticas.taxaPresenca >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-red-600 dark:text-red-400'
                                  }`}>
                                    {turma.estatisticas.taxaPresenca.toFixed(1)}%
                                  </span>
                                  <ProgressBar 
                                    value={taxaOcupacao} 
                                    max={100}
                                    color={taxaOcupacao > 90 ? 'red' : taxaOcupacao > 70 ? 'yellow' : 'green'}
                                    showLabel={false}
                                    height="md"
                                  />

                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  turma.estatisticas.mediaNotas >= 14 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                  turma.estatisticas.mediaNotas >= 10 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                }`}>
                                  {turma.estatisticas.mediaNotas.toFixed(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                {turma.estatisticas.alunosAtivos}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1">
                                  <FiCheckCircle className="text-green-500" size={14} />
                                  <span className="text-sm text-gray-900 dark:text-white">
                                    {turma.estatisticas.alunosComMedia}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    ({((turma.estatisticas.alunosComMedia / turma.estatisticas.alunosAtivos) * 100 || 0).toFixed(0)}%)
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  turma.estado === 'ativa' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                  turma.estado === 'concluida' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {turma.estado}
                                </span>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                </>
              ) : (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <FiBarChart2 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                    Nenhum dado de análise disponível
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">
                    {course.turmas?.length === 0 
                      ? 'Este curso ainda não possui turmas cadastradas.'
                      : 'Aguardando registros de aulas e avaliações.'}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CourseDetails;
