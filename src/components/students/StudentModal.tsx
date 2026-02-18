import { FiBarChart2, FiBook, FiPlus, FiSave, FiX } from "react-icons/fi";
import { AlunoDesempenho } from "../../pages/Turmas/TurmasPage";
import { Student } from "../../types";
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback, useMemo } from "react";
import { RxPerson, RxCalendar, RxRocket, RxSection } from "react-icons/rx";
import { AvaliacaoFormData } from "../../types/avaliacao";
import { useAutoSave } from "../../hooks/useAutoSave";
import { SelectTyped } from "./StudentForm";
import db from "../../services/database/db";
import { avaliacaoService } from "../../services/database/avaliacao";
import { toast } from 'react-hot-toast';
import { FaChartLine, FaGraduationCap } from 'react-icons/fa';
import { alunosService } from "../../services/database/alunosService";

interface StudentModalProps {
  alunoSelecionado: AlunoDesempenho | null;
  setAlunoSelecionado: (aluno: AlunoDesempenho | null) => void;
  loadTurmaDetails?: ()=>void 
  onNotaAdicionada?: () => void;
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
  initialTab = 'overview'
}: StudentModalProps) => {
  const [abaAtiva, setAbaAtiva] = useState<'overview' | 'notas' | 'analise'>('overview');
  const [config, setConfig] = useState<string[]>([]);
  const [disciplinas, setDisciplinas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsDisciplinas, setStatsDisciplinas] = useState<DisciplinaStats[]>([]);
  const [mediaGeral, setMediaGeral] = useState<number>(0);
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
    const avaliacoes= async () =>{
      const result=await avaliacaoService.getAvaliacoesByAluno(alunoSelecionado?.id||"")
        if (result) {
          calcularEstatisticas((await result).avaliacoes);
        }
    }
    avaliacoes()
   
  }, [alunoSelecionado,calcularEstatisticas]);

  // Carrega configurações
  useEffect(() => {
    const loadConfig = async () => {
      if (!alunoSelecionado) return;
      console.log(alunoSelecionado)
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
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        toast.error('Erro ao carregar configurações');
      }
    };

    loadConfig();
  }, [alunoSelecionado]);

  // Configuração do auto-save
  const storageKey = useMemo(
    () => alunoSelecionado?.id ? `edugestor_draft_nota_${alunoSelecionado.id}` : 'edugestor_new_nota_draft',
    [alunoSelecionado?.id]
  );

  const initialData: AvaliacaoFormData = useMemo(() => ({
    aluno_id: alunoSelecionado?.id || "",
    turma_id: alunoSelecionado?.turma_id || "",
    data_avaliacao: new Date().toISOString().split('T')[0],
    disciplina: disciplinas[0]||"",
    nota: 0,
    periodo: "1º trimestre",
    tipo_avaliacao: config[0]||"",
    observacoes: ""
  }), [alunoSelecionado]);

  const {
    data: formData,
    setData: setFormData,
    clearDraft,
    hasUnsavedChanges
  } = useAutoSave(storageKey, initialData, 2000);

  // Handlers
  const handleChange = useCallback((field: keyof AvaliacaoFormData, value: string | number) => {
    setFormData((prev:any) => ({ ...prev, [field]: value }));
  }, [setFormData]);

  const handleSelectChange = useCallback((field: keyof AvaliacaoFormData) => 
    (value: string) => {
      setFormData((prev:any) => ({ ...prev, [field]: value }));
    }, [setFormData]
  );

    const cleanForm = ()=>{
      setFormData(initialData)
      clearDraft()
    }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alunoSelecionado) return;

    try {
      setLoading(true);
      
      // Validações
      if (!formData.disciplina) {
        toast.error('Selecione uma disciplina');
        return;
      }
      if (formData.nota < 0 || formData.nota > 20) {
        toast.error('Nota deve estar entre 0 e 20');
        return;
      }

      await avaliacaoService.criarAvaliacao({
        ...formData,
        aluno_id: alunoSelecionado.id,
        turma_id: alunoSelecionado.turma_id
      });
     cleanForm()
      setAbaAtiva("overview")
      toast.success('Nota adicionada com sucesso!');
     
      
      // Recarregar dados
      if (onNotaAdicionada) onNotaAdicionada();
      
      // Atualizar estatísticas
      const novasAvaliacoes = await avaliacaoService.getAvaliacoesByAluno(alunoSelecionado.id);
      if (novasAvaliacoes) {
        calcularEstatisticas(novasAvaliacoes.avaliacoes);
        setAlunoSelecionado(await alunosService.getDesempemhoAluno(alunoSelecionado.id))
      }

    } catch (error: any) {
      console.error('Erro ao salvar nota:', error);
      toast.error(error.message || 'Erro ao salvar nota');
    } finally {
      setLoading(false);
    }
  };

  const getSituacaoColor = useCallback((situacao: string) => {
    switch(situacao) {
      case 'aprovado': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'reprovado': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'recuperacao': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }, []);

  const getSituacaoText = useCallback((situacao: string) => {
    switch(situacao) {
      case 'aprovado': return 'Aprovado';
      case 'reprovado': return 'Reprovado';
      case 'recuperacao': return 'Recuperação';
      default: return 'Pendente';
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={() => {setAlunoSelecionado(null);loadTurmaDetails();}}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <RxPerson className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {alunoSelecionado.nome_completo}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span>#{alunoSelecionado.numero_estudante}</span>
                    <span className="h-1 w-1 bg-gray-400 rounded-full"></span>
                    <span>{alunoSelecionado.turma_nome}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSituacaoColor('recuperacao')}`}>
                      {getSituacaoText()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Média: <strong className="text-lg text-gray-900 dark:text-white">{mediaGeral.toFixed(1)}</strong>
                </span>
                <button
                  onClick={() => {setAlunoSelecionado(null);loadTurmaDetails();}}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <FiX size={24} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6">
              <nav className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                {[
                  { id: 'overview', label: 'Visão Geral', icon: FiBarChart2 },
                  { id: 'analise', label: 'Análise', icon: FaChartLine },
                  { id: 'notas', label: 'Nova Nota', icon: FiPlus }
                ].map(aba => (
                  <button
                    key={aba.id}
                    onClick={() => setAbaAtiva(aba.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      abaAtiva === aba.id
                        ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <aba.icon size={16} />
                    {aba.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* ABA: VISÃO GERAL */}
            {abaAtiva === 'overview' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Estatísticas Rápidas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl">
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Média Geral</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {mediaGeral.toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl">
                    <div className="text-sm text-green-600 dark:text-green-400 font-medium">Total Avaliações</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {alunoSelecionado.avaliacao?.length || 0}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-xl">
                    <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Melhor Disciplina</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white mt-1 truncate">
                      {statsDisciplinas[0]?.nome || 'N/A'}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-4 rounded-xl">
                    <div className="text-sm text-amber-600 dark:text-amber-400 font-medium">Progresso</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {((mediaGeral / 20) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Tabela de Avaliações */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <FaGraduationCap />
                      Histórico de Avaliações
                    </h4>
                  </div>
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
                            Período
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                            Status
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
                                {avaliacao.nota >= 10 ? 'Aprovado' : 'Reprovado'}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ABA: ANÁLISE */}
            {abaAtiva === 'analise' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Gráfico de Desempenho */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Desempenho por Disciplina
                  </h4>
                  <div className="space-y-4">
                    {statsDisciplinas.map((disciplina, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-900 dark:text-white">
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
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Mín: {disciplina.piorNota}</span>
                          <span>{disciplina.totalAvaliacoes} avaliações</span>
                          <span>Máx: {disciplina.melhorNota}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <RxRocket className="text-blue-600 dark:text-blue-400" size={24} />
                      <h5 className="font-semibold text-gray-900 dark:text-white">Pontos Fortes</h5>
                    </div>
                    <ul className="space-y-2">
                      {statsDisciplinas
                        .filter(d => d.media >= 17)
                        .map((disciplina, index) => (
                          <li key={index} className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{disciplina.nome}</span>
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                              {disciplina.media.toFixed(1)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <RxCalendar className="text-red-600 dark:text-red-400" size={24} />
                      <h5 className="font-semibold text-gray-900 dark:text-white">Precisa Melhorar</h5>
                    </div>
                    <ul className="space-y-2">
                      {statsDisciplinas
                        .filter(d => d.media < 10)
                        .map((disciplina, index) => (
                          <li key={index} className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{disciplina.nome}</span>
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">
                              {disciplina.media.toFixed(1)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ABA: NOVA NOTA */}
            {abaAtiva === 'notas' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Disciplina */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                        Disciplina *
                      </label>
                      <SelectTyped
                        vect={disciplinas}
                        onChange={handleSelectChange('disciplina')}
                        placeholder="Selecione a disciplina"
                        icon={FiBook}
                        value={formData.disciplina}
                        multiuser={false}
                      />
                    </div>

                    {/* Data */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                        Data da Avaliação *
                      </label>
                      <div className="relative">
                        <RxCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="date"
                          required
                          value={formData.data_avaliacao}
                          onChange={(e) => handleChange('data_avaliacao', e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>

                    {/* Nota */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white">
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
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="Ex: 16.5"
                      />
                    </div>

                    {/* Tipo de Avaliação */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                        Tipo de Avaliação *
                      </label>
                      <SelectTyped
                        vect={config}
                        value={formData.tipo_avaliacao}
                        icon={RxSection}
                        onChange={handleSelectChange('tipo_avaliacao')}
                        placeholder="Selecione o tipo"
                        required
                      />
                    </div>

                    {/* Período */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                        Período *
                      </label>
                      <SelectTyped
                        vect={["1º Trimestre", "2º Trimestre", "3º Trimestre"]}
                        icon={RxSection}
                        value={formData.periodo}
                        onChange={handleSelectChange('periodo')}
                        placeholder="Selecione o período"
                        required
                      />
                    </div>

                    {/* Observações */}
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                        Observações
                      </label>
                      <textarea
                        value={formData.observacoes || ''}
                        onChange={(e) => handleChange('observacoes', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        rows={3}
                        placeholder="Observações sobre o desempenho do aluno..."
                      />
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {hasUnsavedChanges && (
                        <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Alterações não salvas
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={cleanForm}
                        className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        disabled={loading}
                      >
                        Limpar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Salvando...
                          </>
                        ) : (
                          <>
                            <FiSave size={18} />
                            Salvar Avaliação
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
    </AnimatePresence>
  );
};
