import { FiBarChart2, FiBook, FiPlus, FiSave, FiX, FiChevronRight, FiTrendingUp, FiTrendingDown, FiEdit2, FiTrash2, FiMoreVertical } from "react-icons/fi";
import { Student } from "../../types";
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback, useMemo } from "react";
import { RxPerson, RxCalendar, RxRocket, RxSection } from "react-icons/rx";
import { AvaliacaoFormData } from "../../types/avaliacao";
import { useAutoSave } from "../../hooks/useAutoSave";
import { SelectTyped } from "./StudentForm";
import db from "../../services/database/db";
import { avaliacaoService } from "../../services/database/avaliacao";
import { FaChartLine, FaGraduationCap } from 'react-icons/fa';
import { alunosService } from "../../services/database/alunosService";
import { useAlert } from "../ui/AlertBadge";
import { AlunoDesempenho } from "../../types/aluno";
import { instituicaoIdValue } from "../../utils/getInsitituicaoID";
import { ConfirmModalProps, useConfirmModal } from "../ui/ComfirmModal";
import { Avaliacao } from "../../types/avaliacao";
import { profileService } from "../../services/database/profileService";

type ConfirmFn = (props: Omit<ConfirmModalProps, "isOpen">) => Promise<boolean>;

interface StudentModalProps {
  alunoSelecionado: AlunoDesempenho | null;
  setAlunoSelecionado: (aluno: AlunoDesempenho | null) => void;
  loadTurmaDetails?: ()=>void 
  onNotaAdicionada?: () => void;
  confirm?: ConfirmFn;
  initialTab?: 'overview' | 'notas' | 'analise';
}

interface DisciplinaStats {
  nome: string;
  media: number;
  melhorNota: number;
  piorNota: number;
  totalAvaliacoes: number;
}

export const StudentModal = ({
  alunoSelecionado,
  setAlunoSelecionado,
  loadTurmaDetails,
  onNotaAdicionada,
  confirm,
  initialTab = 'overview'
}: StudentModalProps) => {
  const [abaAtiva, setAbaAtiva] = useState<'overview' | 'notas' | 'analise'>('overview');
  const [config, setConfig] = useState<string[]>([]);
  const [disciplinas, setDisciplinas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsDisciplinas, setStatsDisciplinas] = useState<DisciplinaStats[]>([]);
  const [mediaGeral, setMediaGeral] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const [editandoAvaliacao, setEditandoAvaliacao] = useState<Avaliacao | null>(null);
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { confirm: localConfirm, ModalComponent: LocalModalComponent } = useConfirmModal();
  const confirmAction = confirm ?? localConfirm;
  const canDeleteGrade = userRole === 'admin' || userRole === 'manager';
  
  const { showAlert } = useAlert();
  

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calcula estatísticas das disciplinas
  const calcularEstatisticas = useCallback((avaliacoes: any[]) => {
    const statsMap = new Map<string, { notas: number[], soma: number }>();

    avaliacoes?.forEach(av => {
      if (!statsMap.has(av.disciplina)) {
        statsMap.set(av.disciplina, { notas: [], soma: 0 });
      }
      const stat = statsMap.get(av.disciplina)!;
      stat.notas.push(av.nota);
      stat.soma += av.nota;
    });

    const stats: DisciplinaStats[] = Array.from(statsMap.entries()).map(([nome, data]) => ({
      nome,
      media: data.soma / data.notas.length,
      melhorNota: Math.max(...data.notas),
      piorNota: Math.min(...data.notas),
      totalAvaliacoes: data.notas.length
    }));

    const mediaTotal = stats.length > 0 
      ? stats.reduce((acc, cur) => acc + cur.media, 0) / stats.length
      : 0;

    setStatsDisciplinas(stats);
    setMediaGeral(mediaTotal);
  }, []);

  useEffect(() => {
    if (alunoSelecionado) {
      setAbaAtiva(initialTab);
    }
  }, [alunoSelecionado, initialTab]);

  useEffect(() => {
    const carregarAvaliacoes = async () =>{
      const result = await avaliacaoService.getAvaliacoesByAluno(alunoSelecionado?.id||"")
      if (result) {
        calcularEstatisticas(result.avaliacoes);
      }
    }
    carregarAvaliacoes()
  }, [alunoSelecionado, calcularEstatisticas]);

  useEffect(() => {
    const loadUserRole = async () => {
      const profile = await profileService.getLocalProfile();
      setUserRole(profile?.role || localStorage.getItem('user_role'));
    };
    loadUserRole();
  }, []);

  // Carrega configurações
  useEffect(() => {
    const loadConfig = async () => {
      if (!alunoSelecionado) return;
      try {
        const [configValue] = await Promise.all([
          db.system_config
            .where('key_name')
            .equals('assessment_types')
            .and(config => !config.deleted)
            .first(),
        ]);

        setConfig(configValue?.value?.map((val: any) => val.nome) || []);
        
        // Buscar disciplinas via turma -> curso
        if (alunoSelecionado.turma_id) {
          const turma = await db.turmas.get(alunoSelecionado.turma_id);
          if (turma?.curso_id) {
            const curso = await db.cursos.get(turma.curso_id);
            setDisciplinas(curso?.disciplinas || []);
          } else {
            setDisciplinas([]);
          }
        }
        if (alunoSelecionado.disciplinas_reforco.length>0) {
          setDisciplinas([...(new Set(...disciplinas,alunoSelecionado.disciplinas_reforco))]);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        showAlert({
          type: 'error',
          title: 'Erro ao carregar',
          message: 'Não foi possível carregar configurações do aluno.',
          duration: 3000
        });
      }
    };

    loadConfig();
  }, [alunoSelecionado, showAlert]);

  // Configuração do auto-save
  const storageKey = useMemo(
    () => alunoSelecionado?.id ? `edugestor_draft_nota_${alunoSelecionado.id}` : 'edugestor_new_nota_draft',
    [alunoSelecionado?.id]
  );

  const initialData: AvaliacaoFormData = useMemo(() => ({
    aluno_id: alunoSelecionado?.id || "",
    turma_id: alunoSelecionado?.turma_id || "",
    data_avaliacao: new Date().toISOString().split('T')[0],
    disciplina: disciplinas[0] || "",
    nota: 0,
    instituicao_id: instituicaoIdValue(),
    periodo: "1º trimestre",
    tipo_avaliacao: config[0] || "",
    observacoes: ""
  }), [alunoSelecionado, disciplinas, config]);

  const {
    data: formData,
    setData: setFormData,
    clearDraft,
    hasUnsavedChanges
  } = useAutoSave(storageKey, initialData, 2000);

  // Atualiza o formulário quando começar a editar uma avaliação
  useEffect(() => {
    if (editandoAvaliacao) {
      setFormData({
        aluno_id: editandoAvaliacao.aluno_id,
        turma_id: editandoAvaliacao.turma_id,
        data_avaliacao: editandoAvaliacao.data_avaliacao,
        disciplina: editandoAvaliacao.disciplina,
        nota: editandoAvaliacao.nota,
        instituicao_id: editandoAvaliacao.instituicao_id,
        periodo: editandoAvaliacao.periodo,
        tipo_avaliacao: editandoAvaliacao.tipo_avaliacao,
        observacoes: editandoAvaliacao.observacoes || ""
      });
      setAbaAtiva('notas');
    }
  }, [editandoAvaliacao, setFormData]);

  // Handlers
  const handleChange = useCallback((field: keyof AvaliacaoFormData, value: string | number) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  }, [setFormData]);

  const handleSelectChange = useCallback((field: keyof AvaliacaoFormData) => 
    (value: string) => {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
    }, [setFormData]
  );

  const cleanForm = () => {
    setFormData(initialData);
    clearDraft();
    setEditandoAvaliacao(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alunoSelecionado) return;

    try {
      setLoading(true);
      
      // Validações
      if (!formData.disciplina || formData.disciplina === "Selecione a disciplina") {
        showAlert({
          type: 'warning',
          title: 'Disciplina obrigatória',
          message: 'Selecione uma disciplina.',
          duration: 2500
        });
        return;
      }

      if (!formData.tipo_avaliacao || formData.tipo_avaliacao === "Selecione o tipo de avalição") {
        showAlert({
          type: 'warning',
          title: 'Tipo obrigatório',
          message: 'Selecione o tipo de avaliação.',
          duration: 2500
        });
        return;
      }

      if (formData.nota < 0 || formData.nota > 20) {
        showAlert({
          type: 'warning',
          title: 'Nota inválida',
          message: 'A nota deve estar entre 0 e 20.',
          duration: 2500
        });
        return;
      }

      if (editandoAvaliacao) {
        // Atualizar avaliação existente
        await avaliacaoService.atualizarAvaliacao(editandoAvaliacao.id, {
          ...formData,
          aluno_id: alunoSelecionado.id,
          turma_id: alunoSelecionado.turma_id
        });
        
        showAlert({
          type: 'success',
          title: 'Avaliação atualizada',
          message: 'Nota atualizada com sucesso.',
          duration: 2500
        });
      } else {
        // Criar nova avaliação
        await avaliacaoService.criarAvaliacao({
          ...formData,
          aluno_id: alunoSelecionado.id,
          turma_id: alunoSelecionado.turma_id
        });
        
        showAlert({
          type: 'success',
          title: 'Avaliação salva',
          message: 'Nota adicionada com sucesso.',
          duration: 2500
        });
      }
      
      cleanForm();
      setAbaAtiva("overview");
      
      // Recarregar dados
      if (onNotaAdicionada) onNotaAdicionada();
      
      // Atualizar estatísticas
      const novasAvaliacoes = await avaliacaoService.getAvaliacoesByAluno(alunoSelecionado.id);
      if (novasAvaliacoes) {
        calcularEstatisticas(novasAvaliacoes.avaliacoes);
        setAlunoSelecionado(await alunosService.getDesempemhoAluno(alunoSelecionado.id));
      }

    } catch (error: any) {
      console.error('Erro ao salvar nota:', error);
      showAlert({
        type: 'error',
        title: 'Erro ao salvar',
        message: error.message || 'Não foi possível salvar a nota.',
        duration: 3500
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (avaliacao: Avaliacao) => {
      if (!canDeleteGrade) {
        showAlert({
          type: 'warning',
          title: 'Sem permissão',
          message: 'Apenas manager ou admin podem apagar notas.',
          duration: 3000
        });
        return;
      }

      await confirmAction({
        type: 'delete',
        title: 'Excluir Avaliação',
        message: `Tem certeza que deseja excluir esta avaliação de ${avaliacao.disciplina}? Esta ação não pode ser desfeita.`,
        isDestructive: true,
        confirmText: 'Excluir',
        onConfirm: async () => {
          try {
            setLoading(true);
            await avaliacaoService.deletarAvaliacao(avaliacao.id);
            
            showAlert({
              type: 'success',
              title: 'Avaliação removida',
              message: 'Nota removida com sucesso.',
              duration: 2500
            });

            // Recarregar dados
            if (onNotaAdicionada) onNotaAdicionada();
            
            // Atualizar estatísticas
            const novasAvaliacoes = await avaliacaoService.getAvaliacoesByAluno(alunoSelecionado?.id || "");
            if (novasAvaliacoes) {
              calcularEstatisticas(novasAvaliacoes.avaliacoes);
              if (alunoSelecionado) {
                setAlunoSelecionado(await alunosService.getDesempemhoAluno(alunoSelecionado.id));
              }
            }

          } catch (error: any) {
            console.error('Erro ao deletar avaliação:', error);
            showAlert({
              type: 'error',
              title: 'Erro ao remover',
              message: error.message || 'Não foi possível remover a nota.',
              duration: 3500
            });
          } finally {
            setLoading(false);
          }
        }
      });
    };

    

  const getSituacaoColor = useCallback((situacao: string) => {
    switch(situacao) {
      case 'aprovado': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'reprovado': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'recuperacao': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }, []);

  const getNotaColor = useCallback((nota: number) => {
    if (nota >= 17) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
    if (nota >= 14) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    if (nota >= 10) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  }, []);

  if (!alunoSelecionado) return null;

  return (
    <>
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
        onClick={() => {
          setAlunoSelecionado(null);
          loadTurmaDetails?.();
          setEditandoAvaliacao(null);
          setMenuAberto(null);
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`bg-white dark:bg-gray-900 rounded-t-lg md:rounded-lg shadow-2xl w-full overflow-hidden ${
            isMobile ? 'h-[90vh]' : 'max-w-6xl h-auto max-h-[90vh]'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header Mobile/Desktop */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className={`flex-shrink-0 ${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center`}>
                  <RxPerson className="text-white" size={isMobile ? 20 : 24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-bold text-gray-900 dark:text-white truncate ${isMobile ? 'text-base' : 'text-lg sm:text-xl'}`}>
                    {alunoSelecionado.nome_completo}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>#{alunoSelecionado.numero_estudante}</span>
                    <span className="h-1 w-1 bg-gray-400 rounded-full"></span>
                    <span className="truncate">{alunoSelecionado.turma_nome}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Média</div>
                  <div className={`font-bold text-blue-600 dark:text-blue-400 ${isMobile ? 'text-base' : 'text-lg'}`}>
                    {mediaGeral.toFixed(1)}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAlunoSelecionado(null);
                    loadTurmaDetails?.();
                    setEditandoAvaliacao(null);
                    setMenuAberto(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <FiX size={isMobile ? 20 : 24} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Tabs Mobile/Desktop */}
            <div className="mt-4">
              <div className={`flex ${isMobile ? 'gap-1' : 'space-x-1'} bg-gray-100 dark:bg-gray-800 p-1 rounded-lg`}>
                {[
                  { id: 'overview', label: 'Visão Geral', icon: FiBarChart2 },
                  { id: 'analise', label: 'Análise', icon: FaChartLine },
                  { id: 'notas', label: editandoAvaliacao ? 'Editar Nota' : 'Nova Nota', icon: editandoAvaliacao ? FiEdit2 : FiPlus }
                ].map(aba => (
                  <button
                    key={aba.id}
                    onClick={() => setAbaAtiva(aba.id as any)}
                    className={`flex items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-lg font-medium text-xs md:text-sm transition-all flex-1 ${
                      abaAtiva === aba.id
                        ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <aba.icon size={isMobile ? 14 : 16} />
                    {!isMobile && aba.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className={`p-4 md:p-6 overflow-y-auto ${isMobile ? 'pb-20' : 'pb-10'} max-h-[calc(90vh-120px)] md:max-h-[calc(90vh-200px)]`}>
            {/* ABA: VISÃO GERAL */}
            {abaAtiva === 'overview' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4 md:space-y-6"
              >
                {/* Cards de Estatísticas Mobile/Desktop */}
                <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-1 md:grid-cols-4 gap-4'}`}>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-3 md:p-4 rounded-lg">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Média Geral</div>
                    <div className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                      {mediaGeral.toFixed(1)}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-3 md:p-4 rounded-lg">
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium">Avaliações</div>
                    <div className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                      {(alunoSelecionado.avaliacao ?? []).length || 0}
                    </div>
                  </div>

                  {!isMobile && (
                    <>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg">
                        <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Melhor Disciplina</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white mt-1 truncate">
                          {statsDisciplinas[0]?.nome || 'N/A'}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-4 rounded-lg">
                        <div className="text-sm text-amber-600 dark:text-amber-400 font-medium">Progresso</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {((mediaGeral / 20) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Cards de Progresso Mobile */}
                {isMobile && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-3 rounded-lg">
                      <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Melhor Disciplina</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {statsDisciplinas[0]?.nome || 'N/A'}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-3 rounded-lg">
                      <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Progresso</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {((mediaGeral / 20) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                )}

                {/* Tabela de Avaliações */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-hidden">
                  <div className="p-3 md:p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm md:text-base">
                      <FaGraduationCap />
                      Histórico de Avaliações
                    </h4>
                    {editandoAvaliacao && (
                      <button
                        onClick={() => {
                          setEditandoAvaliacao(null);
                          cleanForm();
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Cancelar edição
                      </button>
                    )}
                  </div>
                  
                  {/* Mobile: Cards de Avaliações */}
                  {isMobile ? (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {alunoSelecionado.avaliacao?.map((avaliacao, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-3 hover:bg-white dark:hover:bg-gray-800/50 transition-colors relative"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white text-sm">
                                {avaliacao.disciplina}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {avaliacao.tipo_avaliacao} • {new Date(avaliacao.data_avaliacao).toLocaleDateString('pt-AO')}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-bold ${getNotaColor(avaliacao.nota)}`}>
                                {avaliacao.nota}
                              </span>
                              
                              {/* Menu de ações mobile */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuAberto(menuAberto === avaliacao.id ? null : avaliacao.id);
                                  }}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                                >
                                  <FiMoreVertical size={16} />
                                </button>
                                
                                {menuAberto === avaliacao.id && (
                                  <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditandoAvaliacao(avaliacao);
                                        setMenuAberto(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                    >
                                      <FiEdit2 size={14} />
                                      Editar
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(avaliacao);
                                        setMenuAberto(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                                      disabled={!canDeleteGrade}
                                    >
                                      <FiTrash2 size={14} />
                                      Excluir
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 dark:text-gray-400">
                              {avaliacao.periodo}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full ${
                              avaliacao.nota >= 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {avaliacao.nota >= 10 ? 'Meta OK' : 'Abaixo da meta'}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    /* Desktop: Tabela com ações */
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                              Disciplina
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                              Tipo
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                              Nota
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                              Data
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                              Trimestre
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                              Leitura
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {alunoSelecionado.avaliacao?.map((avaliacao, index) => (
                            <motion.tr
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="hover:bg-white dark:hover:bg-gray-800/50 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                {avaliacao.disciplina}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {avaliacao.tipo_avaliacao}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getNotaColor(avaliacao.nota)}`}>
                                  {avaliacao.nota}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {new Date(avaliacao.data_avaliacao).toLocaleDateString('pt-AO')}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {avaliacao.periodo}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  avaliacao.nota >= 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {avaliacao.nota >= 10 ? 'Meta >= 10' : 'Abaixo de 10'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setEditandoAvaliacao(avaliacao)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    title="Editar avaliação"
                                  >
                                    <FiEdit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(avaliacao)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Excluir avaliação"
                                    disabled={!canDeleteGrade}
                                  >
                                    <FiTrash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ABA: ANÁLISE */}
            {abaAtiva === 'analise' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4 md:space-y-6"
              >
                {/* Gráfico de Desempenho */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm md:text-base">
                    Desempenho por Disciplina
                  </h4>
                  <div className="space-y-4">
                    {statsDisciplinas.map((disciplina, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-xs md:text-sm">
                          <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px] md:max-w-none">
                            {disciplina.nome}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            Média: <strong className="text-gray-900 dark:text-white">{disciplina.media.toFixed(1)}</strong>
                          </span>
                        </div>
                        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(disciplina.media / 20) * 100}%` }}
                            transition={{ duration: 1, delay: index * 0.1 }}
                            className={`absolute h-full rounded-full ${
                              disciplina.media >= 17 ? 'bg-emerald-500' :
                              disciplina.media >= 14 ? 'bg-blue-500' :
                              disciplina.media >= 10 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                          />
                        </div>
                        {!isMobile && (
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Mín: {disciplina.piorNota}</span>
                            <span>{disciplina.totalAvaliacoes} avaliações</span>
                            <span>Máx: {disciplina.melhorNota}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Insights Mobile/Desktop */}
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 lg:grid-cols-2 gap-6'}`}>
                  {/* Pontos Fortes */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 md:p-5">
                    <div className="flex items-center gap-2 md:gap-3 mb-3">
                      <RxRocket className="text-blue-600 dark:text-blue-400" size={isMobile ? 20 : 24} />
                      <h5 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Pontos Fortes</h5>
                    </div>
                    <div className="space-y-2">
                      {statsDisciplinas.filter(d => d.media >= 14).map((disciplina, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px] md:max-w-none">
                            {disciplina.nome}
                          </span>
                          <span className="text-xs md:text-sm font-bold text-blue-600 dark:text-blue-400">
                            {disciplina.media.toFixed(1)}
                          </span>
                        </div>
                      ))}
                      {statsDisciplinas.filter(d => d.media >= 14).length === 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Nenhum destaque ainda</p>
                      )}
                    </div>
                  </div>

                  {/* Precisa Melhorar */}
                  <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg p-4 md:p-5">
                    <div className="flex items-center gap-2 md:gap-3 mb-3">
                      <FiTrendingDown className="text-red-600 dark:text-red-400" size={isMobile ? 20 : 24} />
                      <h5 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Precisa Melhorar</h5>
                    </div>
                    <div className="space-y-2">
                      {statsDisciplinas.filter(d => d.media < 10).map((disciplina, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px] md:max-w-none">
                            {disciplina.nome}
                          </span>
                          <span className="text-xs md:text-sm font-bold text-red-600 dark:text-red-400">
                            {disciplina.media.toFixed(1)}
                          </span>
                        </div>
                      ))}
                      {statsDisciplinas.filter(d => d.media < 10).length === 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Tudo dentro da média!</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ABA: NOVA NOTA / EDITAR NOTA */}
            {abaAtiva === 'notas' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                  {editandoAvaliacao && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
                      Editando avaliação de {editandoAvaliacao.disciplina} - {new Date(editandoAvaliacao.data_avaliacao).toLocaleDateString('pt-AO')}
                    </div>
                  )}
                  
                  <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-2 gap-6'}`}>
                    {/* Disciplina */}
                    <div className="space-y-2">
                      <label className="block text-xs md:text-sm font-semibold text-gray-900 dark:text-white">
                        Disciplina *
                      </label>
                      <SelectTyped
                        vect={["Selecione a disciplina", ...disciplinas]}
                        onChange={handleSelectChange('disciplina')}
                        placeholder="Selecione a disciplina"
                        icon={FiBook}
                        value={formData.disciplina}
                        multiuser={false}
                      />
                    </div>

                    {/* Data */}
                    <div className="space-y-2">
                      <label className="block text-xs md:text-sm font-semibold text-gray-900 dark:text-white">
                        Data da Avaliação *
                      </label>
                      <div className="relative">
                        <RxCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={isMobile ? 16 : 18} />
                        <input
                          type="date"
                          required
                          value={formData.data_avaliacao}
                          onChange={(e) => handleChange('data_avaliacao', e.target.value)}
                          className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2.5 md:py-3 text-sm border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>

                    {/* Nota */}
                    <div className="space-y-2">
                      <label className="block text-xs md:text-sm font-semibold text-gray-900 dark:text-white">
                        Nota (0-20) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.1"
                        required
                        value={formData.nota || ''}
                        onChange={(e) => handleChange('nota', parseFloat(e.target.value))}
                        className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="Ex: 16.5"
                      />
                    </div>

                    {/* Tipo de Avaliação */}
                    <div className="space-y-2">
                      <label className="block text-xs md:text-sm font-semibold text-gray-900 dark:text-white">
                        Tipo de Avaliação *
                      </label>
                      <SelectTyped
                        vect={["Selecione o tipo de avalição", ...config]}
                        value={formData.tipo_avaliacao}
                        icon={RxSection}
                        onChange={handleSelectChange('tipo_avaliacao')}
                        placeholder="Selecione o tipo"
                        required
                      />
                    </div>

                    {/* Trimestre */}
                    <div className="space-y-2">
                      <label className="block text-xs md:text-sm font-semibold text-gray-900 dark:text-white">
                        Trimestre (análise) *
                      </label>
                      <SelectTyped
                        vect={["1º Trimestre", "2º Trimestre", "3º Trimestre"]}
                        icon={RxSection}
                        value={formData.periodo}
                        onChange={handleSelectChange('periodo')}
                        placeholder="Selecione o período"
                        required
                      />
                      {!isMobile && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Usado para comparar evolução entre trimestres
                        </p>
                      )}
                    </div>

                    {/* Observações */}
                    <div className={`${isMobile ? 'col-span-1' : 'md:col-span-2'} space-y-2`}>
                      <label className="block text-xs md:text-sm font-semibold text-gray-900 dark:text-white">
                        Observações
                      </label>
                      <textarea
                        value={formData.observacoes || ''}
                        onChange={(e) => handleChange('observacoes', e.target.value)}
                        className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        rows={isMobile ? 2 : 3}
                        placeholder="Observações sobre o desempenho do aluno..."
                      />
                    </div>
                  </div>

                  {/* Botões de Ação Mobile/Desktop */}
                  <div className={`flex items-center justify-between pt-4 md:pt-6 border-t border-gray-200 dark:border-gray-800 ${isMobile ? 'flex-col gap-3' : ''}`}>
                    {isMobile && hasUnsavedChanges && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Rascunho salvo
                      </div>
                    )}
                    
                    <div className={`flex ${isMobile ? 'w-full gap-2' : 'gap-3'}`}>
                      <button
                        type="button"
                        onClick={cleanForm}
                        className={`${
                          isMobile ? 'flex-1' : 'px-5'
                        } py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}
                        disabled={loading}
                      >
                        {editandoAvaliacao ? 'Cancelar' : 'Limpar'}
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className={`${
                          isMobile ? 'flex-1' : 'px-5'
                        } py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs md:text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span>Salvando...</span>
                          </>
                        ) : (
                          <>
                            <FiSave size={isMobile ? 16 : 18} />
                            <span>{isMobile ? (editandoAvaliacao ? 'Atualizar' : 'Salvar') : (editandoAvaliacao ? 'Atualizar Avaliação' : 'Salvar Avaliação')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ✅ Modal de Confirmação do Sistema - Renderizado aqui */}
      {!confirm && <LocalModalComponent />}
      
    </AnimatePresence>
    
    </>
    
  );
};
