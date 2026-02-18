// components/aulas/ModalPlanoAula.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiX, FiBook, FiCalendar, FiClock, FiTarget, 
  FiUsers, FiFileText, FiCheckCircle, FiPlus,
  FiTrash2, FiCopy, FiSave, FiDownload, FiChevronRight,
  FiChevronLeft, FiAward, FiTool, FiGrid, FiList,
  FiStar, FiHeart, FiLayers, FiCheckSquare
} from 'react-icons/fi';
import { turmaService } from '../../services/database/turmas';
import { planoAulaService } from '../../services/database/planoAulasService';
import { SelectTyped } from '../students/StudentForm';
import { toast } from 'react-hot-toast';

interface ModalPlanoAulaProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanoCriado?: (plano: any) => void;
  templateParaCopiar?: any;
  planoExistente?: any;
}

interface Conteudo {
  ordem: number;
  titulo: string;
  descricao: string;
  duracao: number;
  metodologia: string;
  atividades: string[];
  recursos?: string[];
  objetivos_especificos?: string[];
}

export const ModalPlanoAula: React.FC<ModalPlanoAulaProps> = ({
  isOpen,
  onClose,
  onPlanoCriado,
  templateParaCopiar,
  planoExistente
}) => {
  const planoInicial = {
    tipo: 'unica' as 'unica' | 'serie' | 'modulo',
    titulo: '',
    descricao: '',
    disciplina: '',
    
    // Metadados pedagógicos
    objetivos_aprendizagem: [''],
    competencias_desenvolvidas: [''],
    recursos_necessarios: [''],
    metodologia_principal: 'expositiva' as 'expositiva' | 'dialogada' | 'pratica' | 'ativa' | 'hibrida',
    avaliacao: '',
    
    // Estrutura
    duracao_total: 45,
    aulas_planeadas: 1,
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: new Date().toISOString().split('T')[0],
    frequencia: 'semanal' as 'diaria' | 'semanal' | 'quinzenal',
    
    // Conteúdo estruturado
    conteudos: [] as Conteudo[],
    
    // Turmas selecionadas
    turma_ids: [] as string[],
    
    status: 'rascunho' as 'rascunho' | 'ativo'
  };

  const [etapa, setEtapa] = useState<'basico' | 'conteudo' | 'recursos' | 'revisao'>('basico');
  const [turmas, setTurmas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [progresso, setProgresso] = useState(25);

  // Estado do formulário
  const [plano, setPlano] = useState(planoInicial);

  // Carregar turmas
  React.useEffect(() => {
    carregarTurmas();
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    
    if (templateParaCopiar || planoExistente) {
      setPlano({
        ...planoInicial,
        ...(templateParaCopiar || planoExistente),
        status: 'rascunho'
      });
      setEtapa('basico');
      return;
    }

    setPlano(planoInicial);
    setEtapa('basico');
  }, [isOpen, templateParaCopiar, planoExistente]);

  React.useEffect(() => {
    // Atualizar progresso baseado na etapa
    const progressos = {
      basico: 25,
      conteudo: 50,
      recursos: 75,
      revisao: 100
    };
    setProgresso(progressos[etapa]);
  }, [etapa]);

  const carregarTurmas = async () => {
    try {
      const turmasData = await turmaService.getTurmas();
      setTurmas(turmasData || []);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  const handleSalvar = async () => {
    setCarregando(true);
    try {
      let planoSalvo;
      if (!planoExistente) {
        planoSalvo = await planoAulaService.criarPlano(plano);
      } else {
        planoSalvo = await planoAulaService.atualizarPlano(planoExistente.id, plano);
      }
      toast.success(planoExistente ? 'Plano atualizado com sucesso!' : 'Plano de aula criado com sucesso!');
      onPlanoCriado?.(planoSalvo);
      onClose();
    } catch (error) {
      toast.error(planoExistente ? 'Erro ao atualizar plano' : 'Erro ao criar plano de aula');
      console.error(error);
    } finally {
      setCarregando(false);
    }
  };

  const handleGerarAulas = async () => {
    setCarregando(true);
    try {
      const aulasGeradas = await planoAulaService.gerarAulasDoPlano(plano);
      toast.success(`${aulasGeradas.length} aulas geradas com sucesso!`);
      onPlanoCriado?.({ ...plano, aulas_geradas: aulasGeradas });
      onClose();
    } catch (error) {
      toast.error('Erro ao gerar aulas');
      console.error(error);
    } finally {
      setCarregando(false);
    }
  };

  const adicionarConteudo = () => {
    setPlano({
      ...plano,
      conteudos: [
        ...plano.conteudos,
        {
          ordem: plano.conteudos.length + 1,
          titulo: '',
          descricao: '',
          duracao: 15,
          metodologia: 'expositiva',
          atividades: [''],
          recursos: [''],
          objetivos_especificos: ['']
        }
      ]
    });
  };

  const removerConteudo = (index: number) => {
    const novosConteudos = plano.conteudos.filter((_, i) => i !== index);
    const reordenados = novosConteudos.map((c, i) => ({ ...c, ordem: i + 1 }));
    setPlano({ ...plano, conteudos: reordenados });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 overflow-y-auto"
      >
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal Container */}
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-5xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header com gradiente azul */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <FiBook className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {templateParaCopiar ? 'Novo Plano a partir de Template' : 
                       planoExistente ? 'Editar Plano de Aula' : 
                       'Novo Plano de Aula'}
                    </h2>
                    <p className="text-sm text-blue-100">
                      {templateParaCopiar ? 'Use um template existente como base' : 
                       planoExistente ? 'Modifique os detalhes do plano' : 
                       'Crie um plano de aula estruturado'}
                    </p>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 hover:bg-blue-800 rounded-lg transition-colors"
                >
                  <FiX className="h-5 w-5 text-white" />
                </motion.button>
              </div>
              
              {/* Barra de Progresso */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-blue-100 mb-1">
                  <span>Informações Básicas</span>
                  <span>Conteúdo</span>
                  <span>Recursos</span>
                  <span>Revisão</span>
                </div>
                <div className="h-2 bg-blue-800/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progresso}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
              </div>
              
              {/* Navegação por etapas */}
              <div className="flex justify-between mt-4">
                {[
                  { id: 'basico', label: 'Básico', icon: FiFileText },
                  { id: 'conteudo', label: 'Conteúdo', icon: FiLayers },
                  { id: 'recursos', label: 'Recursos', icon: FiTool },
                  { id: 'revisao', label: 'Revisão', icon: FiCheckSquare }
                ].map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => setEtapa(step.id as any)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                      etapa === step.id 
                        ? 'bg-white text-blue-600 shadow-lg' 
                        : 'text-blue-100 hover:bg-blue-700'
                    }`}
                  >
                    <step.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{step.label}</span>
                    {index < 3 && (
                      <FiChevronRight className={`h-4 w-4 ${
                        etapa === step.id ? 'text-blue-600' : 'text-blue-300'
                      }`} />
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Conteúdo com scroll */}
            <div className="max-h-[65vh] overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              <AnimatePresence mode="wait">
                <motion.div
                  key={etapa}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* ETAPA 1: Informações Básicas */}
                  {etapa === 'basico' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Título */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Título do Plano <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={plano.titulo}
                            onChange={(e) => setPlano({...plano, titulo: e.target.value})}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Ex: Introdução à Álgebra Linear"
                          />
                        </motion.div>
                        
                        {/* Disciplina */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Disciplina <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={plano.disciplina}
                            onChange={(e) => setPlano({...plano, disciplina: e.target.value})}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Ex: Matemática"
                          />
                        </motion.div>
                      </div>
                      
                      {/* Descrição */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Descrição
                        </label>
                        <textarea
                          value={plano.descricao}
                          onChange={(e) => setPlano({...plano, descricao: e.target.value})}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl h-32 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="Descreva os objetivos principais deste plano de aula..."
                        />
                      </motion.div>
                      
                      {/* Grid de configurações */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6"
                      >
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tipo de Plano
                          </label>
                          <select
                            value={plano.tipo}
                            onChange={(e) => setPlano({...plano, tipo: e.target.value as any})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                          >
                            <option value="unica">Aula Única</option>
                            <option value="serie"> Série de Aulas</option>
                            <option value="modulo"> Módulo Completo</option>
                          </select>
                        </div>
                        
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Duração Total (min)
                          </label>
                          <input
                            type="number"
                            value={plano.duracao_total}
                            onChange={(e) => setPlano({...plano, duracao_total: parseInt(e.target.value)})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                          />
                        </div>
                        
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nº de Aulas
                          </label>
                          <input
                            type="number"
                            value={plano.aulas_planeadas}
                            onChange={(e) => setPlano({...plano, aulas_planeadas: parseInt(e.target.value)})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                          />
                        </div>
                      </motion.div>
                    </div>
                  )}
                  
                  {/* ETAPA 2: Conteúdo */}
                  {etapa === 'conteudo' && (
                    <div className="space-y-8">
                      {/* Objetivos de Aprendizagem */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl"
                      >
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <FiTarget className="text-blue-500" />
                          Objetivos de Aprendizagem
                        </h4>
                        
                        <div className="space-y-3">
                          {plano.objetivos_aprendizagem.map((objetivo, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex gap-2"
                            >
                              <input
                                type="text"
                                value={objetivo}
                                onChange={(e) => {
                                  const novos = [...plano.objetivos_aprendizagem];
                                  novos[index] = e.target.value;
                                  setPlano({...plano, objetivos_aprendizagem: novos});
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                                placeholder={`Objetivo ${index + 1}`}
                              />
                              {plano.objetivos_aprendizagem.length > 1 && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => {
                                    const novos = plano.objetivos_aprendizagem.filter((_, i) => i !== index);
                                    setPlano({...plano, objetivos_aprendizagem: novos});
                                  }}
                                  className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                >
                                  <FiTrash2 />
                                </motion.button>
                              )}
                            </motion.div>
                          ))}
                        </div>
                        
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setPlano({
                            ...plano, 
                            objetivos_aprendizagem: [...plano.objetivos_aprendizagem, '']
                          })}
                          className="mt-3 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <FiPlus /> Adicionar objetivo
                        </motion.button>
                      </motion.div>
                      
                      {/* Estrutura do Conteúdo */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <FiLayers className="text-blue-500" />
                            Estrutura do Conteúdo
                          </h4>
                          
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={adicionarConteudo}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                          >
                            <FiPlus /> Adicionar Etapa
                          </motion.button>
                        </div>
                        
                        <div className="space-y-4">
                          {plano.conteudos.map((conteudo, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 font-semibold">
                                    {conteudo.ordem}
                                  </div>
                                  <h5 className="font-medium text-gray-900 dark:text-white">
                                    {conteudo.titulo || 'Nova Etapa'}
                                  </h5>
                                </div>
                                
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => removerConteudo(index)}
                                  className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg"
                                >
                                  <FiTrash2 />
                                </motion.button>
                              </div>
                              
                              <div className="space-y-4">
                                <input
                                  type="text"
                                  value={conteudo.titulo}
                                  onChange={(e) => {
                                    const novos = [...plano.conteudos];
                                    novos[index].titulo = e.target.value;
                                    setPlano({...plano, conteudos: novos});
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                  placeholder="Título da etapa"
                                />
                                
                                <textarea
                                  value={conteudo.descricao}
                                  onChange={(e) => {
                                    const novos = [...plano.conteudos];
                                    novos[index].descricao = e.target.value;
                                    setPlano({...plano, conteudos: novos});
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 h-20"
                                  placeholder="Descrição detalhada da etapa..."
                                />
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs text-gray-500">Duração (min)</label>
                                    <input
                                      type="number"
                                      value={conteudo.duracao}
                                      onChange={(e) => {
                                        const novos = [...plano.conteudos];
                                        novos[index].duracao = parseInt(e.target.value);
                                        setPlano({...plano, conteudos: novos});
                                      }}
                                      className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="text-xs text-gray-500">Metodologia</label>
                                    <select
                                      value={conteudo.metodologia}
                                      onChange={(e) => {
                                        const novos = [...plano.conteudos];
                                        novos[index].metodologia = e.target.value;
                                        setPlano({...plano, conteudos: novos});
                                      }}
                                      className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    >
                                      <option value="expositiva">📢 Expositiva</option>
                                      <option value="dialogada">💬 Dialogada</option>
                                      <option value="pratica">🔧 Prática</option>
                                      <option value="ativa">⚡ Ativa</option>
                                      <option value="hibrida">🔄 Híbrida</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                          
                          {plano.conteudos.length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                              <FiLayers className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                              <p className="text-gray-500 dark:text-gray-400">
                                Nenhuma etapa adicionada. Clique em "Adicionar Etapa" para começar.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* ETAPA 3: Recursos e Avaliação */}
                  {etapa === 'recursos' && (
                    <div className="space-y-8">
                      {/* Recursos Necessários */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl"
                      >
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <FiTool className="text-blue-500" />
                          Recursos Necessários
                        </h4>
                        
                        <div className="space-y-3">
                          {plano.recursos_necessarios.map((recurso, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex gap-2"
                            >
                              <input
                                type="text"
                                value={recurso}
                                onChange={(e) => {
                                  const novos = [...plano.recursos_necessarios];
                                  novos[index] = e.target.value;
                                  setPlano({...plano, recursos_necessarios: novos});
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                                placeholder="Ex: Projetor, material impresso..."
                              />
                              {plano.recursos_necessarios.length > 1 && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => {
                                    const novos = plano.recursos_necessarios.filter((_, i) => i !== index);
                                    setPlano({...plano, recursos_necessarios: novos});
                                  }}
                                  className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                >
                                  <FiTrash2 />
                                </motion.button>
                              )}
                            </motion.div>
                          ))}
                        </div>
                        
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setPlano({
                            ...plano,
                            recursos_necessarios: [...plano.recursos_necessarios, '']
                          })}
                          className="mt-3 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <FiPlus /> Adicionar recurso
                        </motion.button>
                      </motion.div>
                      
                      {/* Avaliação */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl"
                      >
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <FiAward className="text-blue-500" />
                          Estratégia de Avaliação
                        </h4>
                        
                        <textarea
                          value={plano.avaliacao}
                          onChange={(e) => setPlano({...plano, avaliacao: e.target.value})}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl h-32 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                          placeholder="Descreva como será avaliado o aprendizado..."
                        />
                      </motion.div>
                      
                      {/* Turmas Destino */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl"
                      >
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <FiUsers className="text-blue-500" />
                          Turmas Destino
                        </h4>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {turmas.map((turma) => (
                            <motion.label
                              key={turma.id}
                              whileHover={{ scale: 1.02 }}
                              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                                plano.turma_ids.includes(turma.id)
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={plano.turma_ids.includes(turma.id)}
                                onChange={(e) => {
                                  const novosIds = e.target.checked
                                    ? [...plano.turma_ids, turma.id]
                                    : plano.turma_ids.filter(id => id !== turma.id);
                                  setPlano({...plano, turma_ids: novosIds});
                                }}
                                className="mr-3"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {turma.nome_turma}
                                </span>
                                <p className="text-xs text-gray-500">{turma.curso_nome}</p>
                              </div>
                            </motion.label>
                          ))}
                        </div>
                      </motion.div>
                    </div>
                  )}
                  
                  {/* ETAPA 4: Revisão */}
                  {etapa === 'revisao' && (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <FiCheckCircle className="text-blue-600" />
                          Resumo do Plano
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Título</p>
                            <p className="font-medium text-gray-900 dark:text-white">{plano.titulo || '—'}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Disciplina</p>
                            <p className="font-medium text-gray-900 dark:text-white">{plano.disciplina || '—'}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Tipo</p>
                            <p className="font-medium text-gray-900 dark:text-white capitalize">{plano.tipo}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Duração Total</p>
                            <p className="font-medium text-gray-900 dark:text-white">{plano.duracao_total} min</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Aulas Planejadas</p>
                            <p className="font-medium text-gray-900 dark:text-white">{plano.aulas_planeadas}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Etapas</p>
                            <p className="font-medium text-gray-900 dark:text-white">{plano.conteudos.length}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Turmas</p>
                            <p className="font-medium text-gray-900 dark:text-white">{plano.turma_ids.length} selecionadas</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                              plano.status === 'ativo' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {plano.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Ações Finais */}
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Próximos Passos</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSalvar}
                            disabled={carregando}
                            className="p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <FiSave />
                            {carregando ? 'Salvando...' : 'Apenas Salvar Plano'}
                          </motion.button>
                          
                          {plano.tipo !== 'unica' && (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={handleGerarAulas}
                              disabled={carregando}
                              className="p-4 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              <FiCalendar />
                              {carregando ? 'Gerando...' : 'Salvar e Gerar Aulas'}
                            </motion.button>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                          Ao gerar aulas, o sistema criará automaticamente {plano.aulas_planeadas} aulas baseadas neste plano.
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Footer com navegação */}
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between">
                {etapa !== 'basico' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const etapas = ['basico', 'conteudo', 'recursos', 'revisao'];
                      const index = etapas.indexOf(etapa);
                      setEtapa(etapas[index - 1] as any);
                    }}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FiChevronLeft /> Voltar
                  </motion.button>
                )}
                
                <div className="flex space-x-3 ml-auto">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </motion.button>
                  
                  {etapa !== 'revisao' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const etapas = ['basico', 'conteudo', 'recursos', 'revisao'];
                        const index = etapas.indexOf(etapa);
                        setEtapa(etapas[index + 1] as any);
                      }}
                      className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center gap-2"
                    >
                      Continuar <FiChevronRight />
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};