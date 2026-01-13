// src/pages/Turmas/TurmaDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion,AnimatePresence } from 'framer-motion';
import { 
  FiArrowLeft, 
  FiEdit, 
  FiUsers, 
  FiCalendar, 
  FiStar, 
  FiClock,
  FiBook,
  FiBarChart2,
  FiActivity,
  FiTarget,
  FiPlus,
  FiPlusCircle,
} from 'react-icons/fi';
import { 
  FaCrown, 
  FaMedal, 
  FaAward as FaAwardSolid,
  FaChalkboardTeacher,
  FaMoneyBill,
  FaRegWindowMinimize
} from 'react-icons/fa';
import { 
  RxPerson 
} from 'react-icons/rx';
import { turmaService } from '../../services/database/turmas';
import { alunosService } from '../../services/database/alunosService';
import { HorarioAula, HorarioAulaForm, Turma } from '../../types/turma';
import { Student } from '../../types';
import HorarioModal from '../../components/turmas/HorarioModal';
import { StudentModal } from '../../components/students/StudentModal';
import { AulaCardMin } from '../../components/aulas/AulaCard.tsx';
import { aulaService, frequenciaService } from '../../services/database';
import { Aula, AulaFormData } from '../../types/aula';
import { SelectTyped } from '../../components/students/StudentForm';
import { AulaForm } from '../../components/aulas/AulaForm';
import toast from 'react-hot-toast';
import { AulaStatus } from '../../components/aulas/AulaCard-min';
import { ModalFrequencia } from '../../components/attendance/FrequeciaModal';
import { RegistroFrequenciaLote } from '../../types/frequencia';


// Tipos atualizados para refletir o StudentForm
export interface AlunoDesempenho extends Student {
  media: number;
  presenca: number;
  ultimaAvaliacao: number;
}

interface TurmaDetailsData extends Turma {
  alunos: AlunoDesempenho[];
  horarios: HorarioAula[];
  vagas?: number;
}

const TurmaDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [turma, setTurma] = useState<TurmaDetailsData | null>(null);
  const [aulaSelect, setAulaSelect] = useState<Aula | null>(null);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<'overview' | 'alunos'| 'aulas'>('overview');
  const [alunosFiltrados, setAlunosFiltrados] = useState<AlunoDesempenho[]>([]);
  const [filtroTipoMatricula, setFiltroTipoMatricula] = useState<'todos' | 'regular' | 'reforco_personalizado'>('todos');
  const [filtroGrupoAprendizado, setFiltroGrupoAprendizado] = useState<string>('todos');
  const [filtroNivelConhecimento, setFiltroNivelConhecimento] = useState<string>('todos');
  const [horarioEditando, setHorarioEditando] = useState<HorarioAula | null>(null);
  const [isHorarioModalOpen, setIsHorarioModalOpen] = useState(false);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [toqgle,setToggle]=useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoDesempenho|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTurma, setQuickAddTurma] = useState('');
  const [quickAddData, setQuickAddData] = useState(new Date().toISOString().split('T')[0]);
  const [aulaEditando, setAulaEditando] = useState<Aula | null>(null);

  // Grupos de aprendizado - alinhado com StudentForm
  const gruposAprendizado = [
    { value: 'gama', label: 'Gama - Aprendizado Rápido' },
    { value: 'beta', label: 'Beta - Ritmo Moderado' },
    { value: 'alfa', label: 'Alfa - Necessita mais tempo' }
  ];

  // Níveis de conhecimento - alinhado com StudentForm
  const niveisConhecimento = [
    { value: 'A', label: 'A - Excelente' },
    { value: 'B', label: 'B - Bom' },
    { value: 'C', label: 'C - Precisa melhorar' }
  ];

  const handleEditarHorario = (horario: HorarioAula) => {
  setHorarioEditando(horario);
  setIsHorarioModalOpen(true);
};
const registrarFrequencia = async (registros:RegistroFrequenciaLote) => {
    try {
      console.log('📝 Registrando frequência para aula:', registros);
      await frequenciaService.registrarFrequenciaLote(registros);
      
      setAulas(prev => prev.filter(aula => aula.id !== registros.aula_id));
      console.log('✅ Frequência registrada e aula removida da lista');
      
      setTimeout(() => {
        loadTurmaDetails();
      }, 500);
      
    } catch (error) {
      console.error('❌ Erro ao registrar frequência:', error);
    }
  };

// Função para salvar horário
const handleSalvarHorario = async (horario: HorarioAulaForm & { id?: string }): Promise<void> => {
  try {
    if (horario.id) {
      // Atualizar horário existente
      await turmaService.updateHorario(horario.id, horario);
    } else {
      // Criar novo horário
      await turmaService.createHorario(
        horario as HorarioAulaForm,
        id || ''
      );
    }
    
    // Recarregar dados da turma
    loadTurmaDetails();
  } catch (error) {
    console.error('Erro ao salvar horário:', error);
    throw error;
  }
};
// Função para excluir horário
const handleExcluirHorario = async (horarioId: string) => {
  try {
    await turmaService.excluirHorario(horarioId);
    loadTurmaDetails();
  } catch (error) {
    console.error('Erro ao excluir horário:', error);
    throw error;
  }
};


  useEffect(() => {
    loadTurmaDetails();
  }, [id]);

  useEffect(() => {
    if (turma?.alunos) {
      let filtered = turma.alunos;

      // Filtrar por tipo de matrícula
      if (filtroTipoMatricula !== 'todos') {
        filtered = filtered.filter(aluno => aluno.tipo_matricula === filtroTipoMatricula);
      }

      // Filtrar por grupo de aprendizado
      if (filtroGrupoAprendizado !== 'todos') {
        filtered = filtered.filter(aluno => aluno.grupo_aprendizado === filtroGrupoAprendizado);
      }

      // Filtrar por nível de conhecimento
      if (filtroNivelConhecimento !== 'todos') {
        filtered = filtered.filter(aluno => aluno.nivel_conhecimento === filtroNivelConhecimento);
      }

      setAlunosFiltrados(filtered);
    }
  }, [turma, filtroTipoMatricula, filtroGrupoAprendizado, filtroNivelConhecimento]);

  const loadTurmaDetails = async () => {
    try {
      setLoading(true);
      // Carregar dados da turma
      const turmaData = await turmaService.findById(id||'');
      
      if (!turmaData) {
        setLoading(false);
        return;
      }

      // Carregar alunos desta turma
      const horario = await turmaService.getHorarios(turmaData.id);
      // Transformar alunos com dados de desempenho simulados
      const alunosDes=[]
      const alunosComDesempenho: Promise<AlunoDesempenho>[] = await alunosService.getDesempemhoTurma(turmaData.id)
      setAulas(await aulaService.getAulasPorTurma(turmaData.id))
      for (const element of alunosComDesempenho) {
        alunosDes.push(await element)
      }
   
      // Dados completos da turma
      const turmaCompleta: TurmaDetailsData = {
        ...turmaData,
        alunos:  alunosDes,
        horarios: horario,
        professor: turmaData.professor || 'Professor a definir',
        vagas: 30 // Valor padrão
      };

      setTurma(turmaCompleta);
      setAlunosFiltrados(alunosDes);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar turma:', error);
      setLoading(false);
    }
  };

  const getTipoMatriculaLabel = (tipo: string) => {
    switch (tipo) {
      case 'regular': return 'Turma Regular';
      case 'reforco_personalizado': return 'Reforço Personalizado';
      default: return tipo;
    }
  };

  const getGrupoAprendizadoLabel = (grupo: string) => {
    const grupoObj = gruposAprendizado.find(g => g.value === grupo);
    return grupoObj ? grupoObj.label.split(' - ')[0] : grupo;
  };

  const getNivelConhecimentoLabel = (nivel: string) => {
    const nivelObj = niveisConhecimento.find(n => n.value === nivel);
    return nivelObj ? nivelObj.label.split(' - ')[0] : nivel;
  };

  const getBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'regular': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'reforco_personalizado': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getBadgeColorGrupo = (grupo: string) => {
    switch (grupo) {
      case 'gama': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'beta': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'alfa': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getBadgeColorNivel = (nivel: string) => {
    switch (nivel) {
      case 'A': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      case 'B': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'C': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

    const handleCriarAula = async (aulaData: AulaFormData) => {
      try {
        await aulaService.criarAula(aulaData);
        setShowForm(false);
        await loadTurmaDetails();
        toast.success('Aula criada com sucesso!');
      } catch (error: any) {
        console.error('Erro ao criar aula:', error);
        toast.error(error.message || 'Erro ao criar aula');
      }
    };

    async function handelActualizar(status: AulaStatus,aulaSelect:Aula) {
       
      if(aulaSelect.status=="ministrada"){
        setAulaSelect(aulaSelect)
        return ""
      }
        
      if(aulaSelect){
        const aula=await aulaService.atualizarAula(aulaSelect.id,{status:status,turmas:aulaSelect.turmas})
        setAulas(prev => prev.map(e => aula&&e.id === aula.id ? aula : e));
      }
      
    }

    const handleEditarAula = async (aulaData: AulaFormData) => {
      if (!aulaEditando) return;
      
      try {
        await aulaService.atualizarAula(aulaEditando.id, aulaData);
        setShowForm(false);
        setAulaEditando(null);
        await loadTurmaDetails();
        toast.success('Aula atualizada com sucesso!');
      } catch (error: any) {
        console.error('Erro ao atualizar aula:', error);
        toast.error(error.message || 'Erro ao atualizar aula');
      }
    };
  
    const handleDeletarAula = async (id: string) => {
      if (window.confirm('Tem certeza que deseja excluir esta aula?')) {
        try {
          await aulaService.deletarAula(id);
          await loadTurmaDetails();
          toast.success('Aula excluída com sucesso!');
        } catch (error) {
          console.error('Erro ao excluir aula:', error);
          toast.error('Erro ao excluir aula');
        }
      }
    };
  
    const handleQuickAdd = async () => {
      if (!quickAddTurma) {
        toast.error('Selecione uma turma');
        return;
      }
  
      try {
        await aulaService.criarAula({
          turma_id: quickAddTurma,
          data_aula: quickAddData,
          disciplina: turmas.find(t => t.id === quickAddTurma)?.curso_nome || '',
          hora_inicio: '08:00',
          hora_fim: '09:30',
          tema_aula: 'Aula do dia',
          status: 'planeada',
          turmas: turma as Turma
        });
        
        setShowQuickAdd(false);
        setQuickAddTurma('');
        await loadTurmaDetails();
        toast.success('Aula adicionada rapidamente!');
      } catch (error) {
        toast.error('Erro ao adicionar aula rápida');
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

  const taxaOcupacao = turma.vagas ? (turma.alunos.length / turma.vagas) * 100 : 0;
  const mediaGeral = turma.alunos.length > 0 
    ? (turma.alunos.reduce((acc, aluno) => acc + aluno.media, 0) / turma.alunos.length).toFixed(1)
    : '0.0';

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
                  {turma.nome_turma}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  turma.estado === 'ativa' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {turma.estado === 'ativa' ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <FiBook size={16} />
                  {turma.curso_nome}
                </span>
                <span className="flex items-center gap-1">
                  <FiCalendar size={16} />
                  {turma.ano_lectivo}
                </span>
                <span className="flex items-center gap-1">
                  <FiUsers size={16} />
                  {turma.alunos.length} alunos
                </span>
              </div>
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
              { id: 'alunos', label: 'Alunos', icon: FiUsers },
              { id: 'aulas', label: 'Aulas', icon: FiBook }
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
        <div className={" "+(toqgle?"flex flex-col-reverse":"grid grid-cols-1 lg:grid-cols-3")+" gap-6"}>
          {/* Coluna Principal */}
          <div className={" "+(toqgle?"lg:col-span-1":"lg:col-span-2 space-y-6")+" "}>
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
                        onClick={()=> navigate("/alunos/"+aluno.id)}
                        key={aluno.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{scale:1.05,transition:{duration:0.3},boxShadow: '0 8px 15px rgba(0, 0, 0, 0.1)'}}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-lg border-2 cursor-pointer ${
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
                            {index === 2 && <FaAwardSolid className="text-amber-600" />}
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                              {index === 0 ? '1º Lugar' : index === 1 ? '2º Lugar' : '3º Lugar'}
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {aluno.media.toFixed(1)}
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                            <RxPerson className="text-blue-600 dark:text-blue-400" size={24} />
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {aluno.nome_completo}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {aluno.numero_estudante}
                          </p>
                          
                          {/* Badges de informação */}
                          <div className="flex flex-wrap justify-center gap-1 mt-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${getBadgeColor(aluno.tipo_matricula || 'regular')}`}>
                              {getTipoMatriculaLabel(aluno.tipo_matricula || 'regular')}
                            </span>
                            {aluno.grupo_aprendizado && (
                              <span className={`px-2 py-1 text-xs rounded-full ${getBadgeColorGrupo(aluno.grupo_aprendizado)}`}>
                                {getGrupoAprendizadoLabel(aluno.grupo_aprendizado)}
                              </span>
                            )}
                          </div>
                          
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
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{turma.alunos.length}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Alunos</div>
                    </div>
                    
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <FiStar className="mx-auto text-green-600 dark:text-green-400 mb-2" size={24} />
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {mediaGeral}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Média Geral</div>
                    </div>
                    
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <FaMoneyBill className="mx-auto text-purple-600 dark:text-purple-400 mb-2" size={24} />
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {turma.alunos.filter(a => a.tipo_matricula === 'regular').length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Matrículas Regulares</div>
                    </div>
                    
                    <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <FiTarget className="mx-auto text-amber-600 dark:amber-400 mb-2" size={24} />
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {turma.alunos.filter(a => a.tipo_matricula === 'reforco_personalizado').length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Reforços</div>
                    </div>
                  </div>

                  {/* Distribuição por Grupo de Aprendizado */}
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Distribuição por Grupo de Aprendizado
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {gruposAprendizado.map(grupo => {
                        const count = turma.alunos.filter(a => a.grupo_aprendizado === grupo.value).length;
                        return (
                          <div key={grupo.value} className="text-center">
                            <div className={`px-3 py-2 rounded-lg ${getBadgeColorGrupo(grupo.value)}`}>
                              <div className="text-lg font-bold">{count}</div>
                              <div className="text-xs">{grupo.label.split(' - ')[0]}</div>
                            </div>
                          </div>
                        );
                      })}
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
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Lista de Alunos ({alunosFiltrados.length}/{turma.alunos.length})
                  </h2>
                  
                  {/* Filtros */}
                  <div className="flex flex-wrap gap-2">
                    {/* Filtro Tipo Matrícula */}
                    <select
                      value={filtroTipoMatricula}
                      onChange={(e) => setFiltroTipoMatricula(e.target.value as any)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="todos">Todos os tipos</option>
                      <option value="regular">Turma Regular</option>
                      <option value="reforco_personalizado">Reforço Personalizado</option>
                    </select>

                    {/* Filtro Grupo Aprendizado */}
                    <select
                      value={filtroGrupoAprendizado}
                      onChange={(e) => setFiltroGrupoAprendizado(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="todos">Todos os grupos</option>
                      {gruposAprendizado.map(grupo => (
                        <option key={grupo.value} value={grupo.value}>
                          {grupo.label}
                        </option>
                      ))}
                    </select>

                    {/* Filtro Nível Conhecimento */}
                    <select
                      value={filtroNivelConhecimento}
                      onChange={(e) => setFiltroNivelConhecimento(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="todos">Todos os níveis</option>
                      {niveisConhecimento.map(nivel => (
                        <option key={nivel.value} value={nivel.value}>
                          {nivel.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Aluno
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Tipo Matrícula
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Grupo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Nível
                        </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Qtd Notas
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
                      {alunosFiltrados.map((aluno) => (
                        <tr  key={aluno.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div onClick={()=>{
                                setAlunoSelecionado(aluno)
                              }}  className="w-8 h-8 bg-blue-100 text-blue-600  dark:text-blue-400 hover:bg-blue-400 hover:text-blue-100 transition-all cursor-pointer dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <RxPerson className="" size={14} />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {aluno.nome_completo}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {aluno.numero_estudante}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColor(aluno.tipo_matricula || 'regular')}`}>
                              {getTipoMatriculaLabel(aluno.tipo_matricula || 'regular')}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {aluno.grupo_aprendizado && (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColorGrupo(aluno.grupo_aprendizado)}`}>
                                {getGrupoAprendizadoLabel(aluno.grupo_aprendizado)}
                              </span>
                            )}
                          </td>
                           <td className="px-4 py-3 whitespace-nowrap">
                            {aluno.nivel_conhecimento && (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColorNivel(aluno.nivel_conhecimento)}`}>
                                {getNivelConhecimentoLabel(aluno.nivel_conhecimento)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3  whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {aluno.avaliacao?.length}
                          </td>
                         
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              aluno.media >= 17 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : aluno.media >= 14
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {aluno.media.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3  whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {aluno.presenca}%
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {aluno.ultimaAvaliacao}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {alunosFiltrados.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Nenhum aluno encontrado com os filtros aplicados.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {abaAtiva === 'aulas' && (
               <div className="flex flex-wrap gap-4">
                 
                     <div className="flex w-full items-center justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                            <FiBook className="mr-2" />
                            Lista de Aulas
                          </h2>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            Gerencie e visualize suas aulas
                          </p>
                        </div>
                        <div className='gap-5 flex'>
                          <button 
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                          >
                            <FiPlus className="inline mr-2" />
                            Nova Aula
                          </button>
                           <button 
                            onClick={() => setShowQuickAdd(true)}
                            className="px-4 py-2 bg-violet-100 text-violet-700 dark:bg-violet-800 dark:text-violet-300 rounded-lg hover:bg-violet-200 dark:hover:bg-violet-700 transition-colors"
                          >
                            <FiPlus className="inline mr-2" />
                            Aula Rapida
                          </button>
                        </div>
                            
                      
                  </div>
                 
                  {aulas.length>0?aulas.map((aula, index) => (
                    <AulaCardMin
                      key={aula.id}
                      aula={aula}
                      onEditar={()=>{
                        setAulaEditando(aula)
                        setShowForm(true)
                      }}
                      onDeletar={handleDeletarAula}
                      index={index}
                      onActualizar={(status:AulaStatus)=>{
                        handelActualizar(status,aula)
                      }}
                    />
                  )):
                  <div className="text-center py-12">
                    <FiBook className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma aula encontrada</h3>
                    <p className="text-gray-500 mt-2">
                          Sem turmas
                    </p>
                  </div>
                  }
                </div>
            )}
          </div>

          {/* Sidebar - Informações da Turma */}
          <div className="space-y-6">
           <span onClick={()=> setToggle(!toqgle)}  className=' -mt-5 -mb-10  text-sm gap-2 float-right text-center rounded-md duration-150 cursor-pointer hover:text-primary-500 transition-all p-2 flex items-center flex-row-reverse justify-center'>
                    {!toqgle?"Ocultar":"Mostrar"} informações
                </span>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={"bg-white "+(toqgle?"hidden":"block")+" dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"}
            >
               
             <div>
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
                    <p className="font-medium text-gray-900 dark:text-white">{turma.curso_nome}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <FiUsers className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Capacidade</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {turma.alunos.length}/{turma.vagas}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FiActivity className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Estado</p>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {turma.estado}
                    </p>
                  </div>
                </div>

                {/* Distribuição por Tipo de Matrícula */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Tipos de Matrícula</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Regular:</span>
                      <span className="font-medium">
                        {turma.alunos.filter(a => a.tipo_matricula === 'regular').length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Reforço:</span>
                      <span className="font-medium">
                        {turma.alunos.filter(a => a.tipo_matricula === 'reforco_personalizado').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {turma.descricao && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Descrição</p>
                  <p className="text-gray-900 dark:text-white text-sm">{turma.descricao}</p>
                </div>
              )}
             </div>
            </motion.div>

            {/* Próximas Aulas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={"bg-white "+(toqgle?"hidden":"block") +" transition-all dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"}
            >
             <div className="flex items-center justify-between">
                 <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Horários da Turma
              </h3>
            <button
            onClick={() => {
              setHorarioEditando(null);
              setIsHorarioModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <FiPlus size={18} />
     
          </button>
             </div>
              <HorarioModal
                isOpen={isHorarioModalOpen}
                onClose={() => {
                  setIsHorarioModalOpen(false);
                  setHorarioEditando(null);
                }}
                onSubmit={handleSalvarHorario}
                onDelete={handleExcluirHorario}
                horarioEdit={horarioEditando}
                turmaId={turma.id}
                title={horarioEditando ? 'Editar Horário' : 'Adicionar Horário'}
              />
              
              <div className="space-y-3">
                {turma.horarios.map((horario, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <FiClock className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {horario.disciplina}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                        {horario.dia_semana} • {horario.hora_inicio} - {horario.hora_fim}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {horario.sala} • {horario.professor_responsavel}
                      </p>
                    </div>
                  </div>
                ))}
                
                {turma.horarios.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Nenhum horário definido
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <StudentModal loadTurmaDetails={loadTurmaDetails} alunoSelecionado={alunoSelecionado} setAlunoSelecionado={setAlunoSelecionado} />
       {/* Quick Actions */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6"
            >
              <h3 className="font-semibold dark:text-white text-gray-800 mb-4">Ações Rápidas</h3>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => {
                    setShowForm(true)
                  }}
                  className="px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                >
                  <FiPlus className="inline mr-2" />
                  Nova Aula
                </button>
                <button className="px-4 py-2 bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-700 transition-colors">
                  <FiCalendar className="inline mr-2" />
                  Agendar Múltiplas Aulas
                </button>
                <button className="px-4 py-2 bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors">
                  <FiUsers className="inline mr-2" />
                  Relatório de Participação
                </button>
              </div>
            </motion.div>
      
            {/* Modal Form */}
            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                  onClick={() => {
                    setShowForm(false);
                    setAulaEditando(null);
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
                    onClick={e => e.stopPropagation()}
                  >
                    <AulaForm
                      aula={aulaEditando}
                      turmas={[{ value: turma.id, label: turma.nome_turma }]}
                      onSubmit={aulaEditando ? handleEditarAula : handleCriarAula}
                      onCancel={() => {
                        setShowForm(false);
                        setAulaEditando(null);
                      }}
                      loading={loading}
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
      
            {/* Modal Quick Add */}
            <AnimatePresence>
              {showQuickAdd && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                  onClick={() => setShowQuickAdd(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
                    onClick={e => e.stopPropagation()}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Adicionar Aula Rápida</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Turma
                          <p className='p-4 mt-1 border-gray-400 border rounded-sm'>{turma.nome_turma}</p>
                        </label>
                        
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Data
                        </label>
                        <input
                          type="date"
                          value={quickAddData}
                          onChange={(e) => setQuickAddData(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() =>{ setShowQuickAdd(false);setQuickAddTurma(turma.id)}}
                        className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleQuickAdd}
                        className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Adicionar
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {aulaSelect&&<motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                onClick={() => {
                  setShowForm(false);
                  setAulaEditando(null);
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
    
                <ModalFrequencia
                  aula={aulaSelect}
                  setAulaSelect={setAulaSelect}
                  isExpandida={true}
                  onRegistrarFrequencia={registrarFrequencia}
                />
                </motion.div>
            </motion.div>}        
          </AnimatePresence>
                  
    </div>
  );
};

export default TurmaDetails;