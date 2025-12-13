// src/pages/Turmas/TurmaDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiArrowLeft, 
  FiEdit, 
  FiUsers, 
  FiCalendar, 
  FiStar, 
  FiClock,
  FiBook,
  FiMapPin,
  FiUser,
  FiPlus,
  FiTrash2,
  FiBarChart2
} from 'react-icons/fi';
import { FaCrown, FaMedal, FaAward, FaChalkboardTeacher } from 'react-icons/fa';
import { AlunoDesempenho, HorarioAula } from '../../types/turma';

// Definição dos cursos e suas disciplinas
const CURSOS_DISCIPLINAS = {
  "ALPHA": ["Português", "Matemática", "Estudo do Meio", "Expressão Artística", "Educação Física"],
  "BETA": ["Matemática Avançada", "Física", "Química", "Biologia", "Geologia"],
  "GAMA": ["Língua Portuguesa", "Literatura", "História", "Geografia", "Filosofia"],
  "DELTA": ["Inglês", "Francês", "Espanhol", "Alemão", "Línguas Locais"],
  "Reforço Matemática Avançada": ["Álgebra", "Geometria", "Aritmética", "Cálculo", "Estatística"],
  "Reforço de Línguas": ["Gramática", "Leitura", "Escrita", "Conversação", "Interpretação"]
};

interface TurmaDetails {
  id: number;
  nome: string;
  professor: string;
  curso: string;
  ano: string;
  vagas: number;
  alunosInscritos: number;
  descricao: string;
  ativa: boolean;
  alunos: AlunoDesempenho[];
  horarios: HorarioAula[];
}

const TurmaDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [turma, setTurma] = useState<TurmaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<'overview' | 'horarios' | 'alunos'>('overview');
  const [novoHorario, setNovoHorario] = useState({
    dia: 'segunda',
    horaInicio: '08:00',
    horaFim: '09:30',
    disciplina: '',
    sala: '',
    professor: ''
  });

  // Obter disciplinas disponíveis para o curso da turma
  const disciplinasDisponiveis = turma ? 
    CURSOS_DISCIPLINAS[turma.curso as keyof typeof CURSOS_DISCIPLINAS] || 
    CURSOS_DISCIPLINAS.ALPHA : 
    CURSOS_DISCIPLINAS.ALPHA;

  useEffect(() => {
    loadTurmaDetails();
  }, [id]);

  const loadTurmaDetails = async () => {
    try {
      setLoading(true);
      // TODO: Substituir pelo service real
      
      // Mock data
      setTimeout(() => {
        setTurma({
          id: Number(id),
          nome: "10ª A - Matemática",
          professor: "Arão Silva",
          curso: "Reforço Matemática Avançada",
          ano: "2024",
          vagas: 25,
          alunosInscritos: 18,
          descricao: "Turma de reforço em matemática para alunos da 10ª classe, focada em álgebra e geometria.",
          ativa: true,
          alunos: [
            {
              id: 1,
              nome: "Maria Santos",
              numero_estudante: "2024001",
              media: 18.5,
              presenca: 95,
              ultimaAvaliacao: 19,
            },
            {
              id: 2,
              nome: "João Pereira",
              numero_estudante: "2024002",
              media: 17.2,
              presenca: 92,
              ultimaAvaliacao: 18,
            },
            {
              id: 3,
              nome: "Ana Costa",
              numero_estudante: "2024003",
              media: 16.8,
              presenca: 98,
              ultimaAvaliacao: 17,
            },
            {
              id: 4,
              nome: "Carlos Lima",
              numero_estudante: "2024004",
              media: 15.5,
              presenca: 85,
              ultimaAvaliacao: 16,
            }
          ],
          horarios: [
            {
              id: 1,
              dia: 'segunda',
              horaInicio: '14:00',
              horaFim: '15:30',
              disciplina: 'Álgebra',
              sala: 'Sala 2',
              professor: 'Arão Silva'
            },
            {
              id: 2,
              dia: 'quarta',
              horaInicio: '14:00',
              horaFim: '15:30',
              disciplina: 'Geometria',
              sala: 'Sala 2',
              professor: 'Arão Silva'
            },
            {
              id: 3,
              dia: 'sexta',
              horaInicio: '15:30',
              horaFim: '17:00',
              disciplina: 'Revisão Geral',
              sala: 'Sala 2',
              professor: 'Arão Silva'
            }
          ]
        });
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Erro ao carregar turma:', error);
      setLoading(false);
    }
  };

  const adicionarHorario = () => {
    if (turma && novoHorario.disciplina && novoHorario.sala) {
      const horario = {
        id: Math.max(...turma.horarios.map(h => h.id)) + 1,
        ...novoHorario
      };
      
      setTurma(prev => prev ? {
        ...prev,
        horarios: [...prev.horarios, horario]
      } : null);
      
      setNovoHorario({
        dia: 'segunda',
        horaInicio: '08:00',
        horaFim: '09:30',
        disciplina: '',
        sala: '',
        professor: turma?.professor || ''
      });
    }
  };

  const removerHorario = (horarioId: number) => {
    if (turma) {
      setTurma(prev => prev ? {
        ...prev,
        horarios: prev.horarios.filter(h => h.id !== horarioId)
      } : null);
    }
  };

  const top3Alunos = turma?.alunos
    .sort((a, b) => b.media - a.media)
    .slice(0, 3) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando turma...</p>
        </div>
      </div>
    );
  }

  if (!turma) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Turma não encontrada</h2>
          <button
            onClick={() => navigate('/turmas')}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Voltar para a lista de turmas
          </button>
        </div>
      </div>
    );
  }

  const taxaOcupacao = (turma.alunosInscritos / turma.vagas) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/turmas')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <FiArrowLeft size={20} />
            Voltar para Turmas
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {turma.nome}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  turma.ativa 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {turma.ativa ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {turma.curso} • {turma.ano}
              </p>
            </div>
            
            <Link
              to={`/turmas/editar/${turma.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <FiEdit size={18} />
              Editar Turma
            </Link>
          </div>
        </div>

        {/* Abas */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Visão Geral', icon: FiBarChart2 },
              { id: 'alunos', label: 'Alunos', icon: FiUsers }
            ].map(aba => (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  abaAtiva === aba.id
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <aba.icon size={18} />
                {aba.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Conteúdo das Abas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* ABA: VISÃO GERAL */}
            {abaAtiva === 'overview' && (
              <>
                {/* Top 3 Alunos - Destaque */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Top 3 Melhores Desempenhos
                    </h2>
                    <FaCrown className="text-yellow-500" size={24} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {top3Alunos.map((aluno, index) => (
                      <motion.div
                        key={aluno.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-lg border-2 ${
                          index === 0 
                            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-700'
                            : index === 1
                            ? 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 border-gray-200 dark:border-gray-600'
                            : 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {index === 0 && <FaCrown className="text-yellow-500" />}
                            {index === 1 && <FaMedal className="text-gray-400" />}
                            {index === 2 && <FaAward className="text-amber-600" />}
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                              {index === 0 ? '1º Lugar' : index === 1 ? '2º Lugar' : '3º Lugar'}
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {aluno.media}
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                            <FiUser className="text-blue-600 dark:text-blue-400" size={24} />
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {aluno.nome}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {aluno.numero_estudante}
                          </p>
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                            <span>Presença: {aluno.presenca}%</span>
                            <span>Última: {aluno.ultimaAvaliacao}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Estatísticas da Turma */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Estatísticas da Turma
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <FiUsers className="mx-auto text-blue-600 dark:text-blue-400 mb-2" size={24} />
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{turma.alunosInscritos}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Alunos</div>
                    </div>
                    
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <FiStar className="mx-auto text-green-600 dark:text-green-400 mb-2" size={24} />
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {(turma.alunos.reduce((acc, aluno) => acc + aluno.media, 0) / turma.alunos.length).toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Média Geral</div>
                    </div>
                    
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <FiCalendar className="mx-auto text-purple-600 dark:text-purple-400 mb-2" size={24} />
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{turma.horarios.length}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Aulas/Semana</div>
                    </div>
                    
                    <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <FiBarChart2 className="mx-auto text-amber-600 dark:text-amber-400 mb-2" size={24} />
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{taxaOcupacao.toFixed(1)}%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Ocupação</div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}      

            {/* ABA: ALUNOS */}
            {abaAtiva === 'alunos' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Lista de Alunos ({turma.alunos.length})
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Aluno
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Nº Estudante
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Média
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Presença
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Última Aval.
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {turma.alunos.map((aluno, index) => (
                        <tr key={aluno.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <FiUser className="text-blue-600 dark:text-blue-400" size={14} />
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {aluno.nome}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {aluno.numero_estudante}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              aluno.media >= 17 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : aluno.media >= 14
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {aluno.media}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {aluno.presenca}%
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {aluno.ultimaAvaliacao}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar - Informações da Turma */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Informações da Turma
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <FaChalkboardTeacher className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Professor</p>
                    <p className="font-medium text-gray-900 dark:text-white">{turma.professor}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <FiBook className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Curso</p>
                    <p className="font-medium text-gray-900 dark:text-white">{turma.curso}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <FiUsers className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Vagas</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {turma.alunosInscritos}/{turma.vagas}
                    </p>
                  </div>
                </div>

                {/* Disciplinas do Curso */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Disciplinas do Curso</p>
                  <div className="flex flex-wrap gap-1">
                    {disciplinasDisponiveis.slice(0, 4).map((disciplina) => (
                      <span 
                        key={disciplina}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs rounded"
                      >
                        {disciplina}
                      </span>
                    ))}
                    {disciplinasDisponiveis.length > 4 && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                        +{disciplinasDisponiveis.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {turma.descricao && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Descrição</p>
                  <p className="text-gray-900 dark:text-white text-sm">{turma.descricao}</p>
                </div>
              )}
            </motion.div>

            {/* Próximas Aulas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Próximas Aulas
              </h3>
              
              <div className="space-y-3">
                {turma.horarios.slice(0, 3).map((horario, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <FiClock className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {horario.disciplina}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                        {horario.dia} • {horario.horaInicio}
                      </p>
                    </div>
                  </div>
                ))}
                
                {turma.horarios.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Nenhuma aula agendada
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TurmaDetails;