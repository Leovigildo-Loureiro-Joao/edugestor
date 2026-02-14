// components/aulas/ModalPlanoAula.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiX, FiBook, FiCalendar, FiClock, FiTarget, 
  FiUsers, FiFileText, FiCheckCircle, FiPlus,
  FiTrash2, FiCopy, FiSave, FiDownload
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
}

export const ModalPlanoAula: React.FC<ModalPlanoAulaProps> = ({
  isOpen,
  onClose,
  onPlanoCriado,
  templateParaCopiar
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
    metodologia_principal: 'expositiva',
    avaliacao: '',
    
    // Estrutura
    duracao_total: 45,
    aulas_planeadas: 1,
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: new Date().toISOString().split('T')[0],
    frequencia: 'semanal' as 'diaria' | 'semanal' | 'quinzenal',
    
    // Conteúdo estruturado
    conteudos: [
      {
        ordem: 1,
        titulo: 'Introdução',
        descricao: '',
        duracao: 15,
        metodologia: 'expositiva',
        atividades: ['']
      }
    ],
    
    // Turmas selecionadas
    turma_ids: [] as string[],
    
    status: 'rascunho' as 'rascunho' | 'ativo'
  };

  const [etapa, setEtapa] = useState<'basico' | 'conteudo' | 'recursos' | 'revisao'>('basico');
  const [turmas, setTurmas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Estado do formulário
  const [plano, setPlano] = useState(planoInicial);

  // Carregar turmas
  React.useEffect(() => {
    carregarTurmas();
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    if (templateParaCopiar) {
      setPlano({
        ...planoInicial,
        ...templateParaCopiar,
        status: 'rascunho'
      });
      setEtapa('basico');
      return;
    }

    setPlano(planoInicial);
    setEtapa('basico');
  }, [isOpen, templateParaCopiar]);

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
      const planoSalvo = await planoAulaService.criarPlano(plano);
      
      toast.success('Plano de aula criado com sucesso!');
      onPlanoCriado?.(planoSalvo);
      onClose();
    } catch (error) {
      toast.error('Erro ao criar plano de aula');
      console.error(error);
    } finally {
      setCarregando(false);
    }
  };

  const handleGerarAulas = async () => {
    // Gerar aulas automáticas baseadas no plano
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-5xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FiBook className="h-6 w-6 text-white" />
                  <h2 className="text-xl font-bold text-white">
                    {templateParaCopiar ? 'Novo Plano a partir de Template' : 'Novo Plano de Aula'}
                  </h2>
                  <span className="px-2 py-1 bg-purple-500 text-xs text-white rounded-full">
                    {templateParaCopiar ? 'Usar Template' : 'Criar Novo'}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  <FiX className="h-5 w-5 text-white" />
                </button>
              </div>
              
              {/* Etapas */}
              <div className="flex justify-center mt-4 space-x-8">
                {['basico', 'conteudo', 'recursos', 'revisao'].map((step, index) => (
                  <button
                    key={step}
                    onClick={() => setEtapa(step as any)}
                    className={`flex items-center ${etapa === step ? 'text-white' : 'text-purple-200'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                      etapa === step 
                        ? 'bg-white text-purple-600' 
                        : 'bg-purple-500 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium capitalize">
                      {step === 'basico' && 'Básico'}
                      {step === 'conteudo' && 'Conteúdo'}
                      {step === 'recursos' && 'Recursos'}
                      {step === 'revisao' && 'Revisão'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Conteúdo */}
            <div className="max-h-[70vh] overflow-y-auto p-6">
              {etapa === 'basico' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Informações Básicas
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Título do Plano *
                      </label>
                      <input
                        type="text"
                        value={plano.titulo}
                        onChange={(e) => setPlano({...plano, titulo: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                        placeholder="Ex: Introdução à Álgebra Linear"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Disciplina *
                      </label>
                      <input
                        type="text"
                        value={plano.disciplina}
                        onChange={(e) => setPlano({...plano, disciplina: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                        placeholder="Ex: Matemática"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Descrição
                    </label>
                    <textarea
                      value={plano.descricao}
                      onChange={(e) => setPlano({...plano, descricao: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg h-32 bg-white dark:bg-gray-700"
                      placeholder="Descreva os objetivos principais deste plano de aula..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tipo de Plano
                      </label>
                      <select
                        value={plano.tipo}
                        onChange={(e) => setPlano({...plano, tipo: e.target.value as any})}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                      >
                        <option value="unica">Aula Única</option>
                        <option value="serie">Série de Aulas</option>
                        <option value="modulo">Módulo Completo</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Duração Total (min)
                      </label>
                      <input
                        type="number"
                        value={plano.duracao_total}
                        onChange={(e) => setPlano({...plano, duracao_total: parseInt(e.target.value)})}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nº de Aulas
                      </label>
                      <input
                        type="number"
                        value={plano.aulas_planeadas}
                        onChange={(e) => setPlano({...plano, aulas_planeadas: parseInt(e.target.value)})}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {etapa === 'conteudo' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Conteúdo e Estrutura
                  </h3>
                  
                  {/* Objetivos de Aprendizagem */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Objetivos de Aprendizagem
                    </label>
                    <div className="space-y-3">
                      {plano.objetivos_aprendizagem.map((objetivo, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={objetivo}
                            onChange={(e) => {
                              const novos = [...plano.objetivos_aprendizagem];
                              novos[index] = e.target.value;
                              setPlano({...plano, objetivos_aprendizagem: novos});
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                            placeholder={`Objetivo ${index + 1}`}
                          />
                          {plano.objetivos_aprendizagem.length > 1 && (
                            <button
                              onClick={() => {
                                const novos = plano.objetivos_aprendizagem.filter((_, i) => i !== index);
                                setPlano({...plano, objetivos_aprendizagem: novos});
                              }}
                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <FiTrash2 />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setPlano({
                        ...plano, 
                        objetivos_aprendizagem: [...plano.objetivos_aprendizagem, '']
                      })}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <FiPlus className="mr-1" /> Adicionar objetivo
                    </button>
                  </div>
                  
                  {/* Estrutura do Conteúdo */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Estrutura do Conteúdo
                      </label>
                      <button
                        onClick={() => setPlano({
                          ...plano,
                          conteudos: [...plano.conteudos, {
                            ordem: plano.conteudos.length + 1,
                            titulo: '',
                            descricao: '',
                            duracao: 15,
                            metodologia: 'expositiva',
                            atividades: ['']
                          }]
                        })}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <FiPlus className="mr-1" /> Adicionar etapa
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {plano.conteudos.map((conteudo, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-800 dark:text-white">
                              Etapa {conteudo.ordem}: {conteudo.titulo || 'Sem título'}
                            </h4>
                            <button
                              onClick={() => {
                                const novos = plano.conteudos.filter((_, i) => i !== index);
                                // Reordenar
                                const reordenados = novos.map((c, i) => ({...c, ordem: i + 1}));
                                setPlano({...plano, conteudos: reordenados});
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                          
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={conteudo.titulo}
                              onChange={(e) => {
                                const novos = [...plano.conteudos];
                                novos[index].titulo = e.target.value;
                                setPlano({...plano, conteudos: novos});
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                              placeholder="Título da etapa"
                            />
                            
                            <textarea
                              value={conteudo.descricao}
                              onChange={(e) => {
                                const novos = [...plano.conteudos];
                                novos[index].descricao = e.target.value;
                                setPlano({...plano, conteudos: novos});
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg h-20"
                              placeholder="Descrição detalhada..."
                            />
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-sm text-gray-600 dark:text-gray-400">Duração (min)</label>
                                <input
                                  type="number"
                                  value={conteudo.duracao}
                                  onChange={(e) => {
                                    const novos = [...plano.conteudos];
                                    novos[index].duracao = parseInt(e.target.value);
                                    setPlano({...plano, conteudos: novos});
                                  }}
                                  className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg"
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm text-gray-600 dark:text-gray-400">Metodologia</label>
                                <select
                                  value={conteudo.metodologia}
                                  onChange={(e) => {
                                    const novos = [...plano.conteudos];
                                    novos[index].metodologia = e.target.value;
                                    setPlano({...plano, conteudos: novos});
                                  }}
                                  className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg"
                                >
                                  <option value="expositiva">Expositiva</option>
                                  <option value="dialogada">Dialogada</option>
                                  <option value="pratica">Prática</option>
                                  <option value="ativa">Ativa</option>
                                  <option value="hibrida">Híbrida</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {etapa === 'recursos' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Recursos e Avaliação
                  </h3>
                  
                  {/* Recursos Necessários */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Recursos Necessários
                    </label>
                    <div className="space-y-2">
                      {plano.recursos_necessarios.map((recurso, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={recurso}
                            onChange={(e) => {
                              const novos = [...plano.recursos_necessarios];
                              novos[index] = e.target.value;
                              setPlano({...plano, recursos_necessarios: novos});
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                            placeholder="Ex: Projetor, material impresso..."
                          />
                          <button
                            onClick={() => {
                              const novos = plano.recursos_necessarios.filter((_, i) => i !== index);
                              setPlano({...plano, recursos_necessarios: novos});
                            }}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setPlano({
                        ...plano,
                        recursos_necessarios: [...plano.recursos_necessarios, '']
                      })}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <FiPlus className="mr-1" /> Adicionar recurso
                    </button>
                  </div>
                  
                  {/* Avaliação */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Estratégia de Avaliação
                    </label>
                    <textarea
                      value={plano.avaliacao}
                      onChange={(e) => setPlano({...plano, avaliacao: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg h-32 bg-white dark:bg-gray-700"
                      placeholder="Descreva como será avaliado o aprendizado..."
                    />
                  </div>
                  
                  {/* Turmas */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Turmas Destino
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {turmas.map(turma => (
                        <label key={turma.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={plano.turma_ids.includes(turma.id)}
                            onChange={(e) => {
                              const novosIds = e.target.checked
                                ? [...plano.turma_ids, turma.id]
                                : plano.turma_ids.filter(id => id !== turma.id);
                              setPlano({...plano, turma_ids: novosIds});
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">{turma.nome_turma}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {etapa === 'revisao' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Revisão do Plano
                  </h3>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between border-b pb-3">
                        <span className="font-medium">Título:</span>
                        <span>{plano.titulo || 'Não definido'}</span>
                      </div>
                      
                      <div className="flex justify-between border-b pb-3">
                        <span className="font-medium">Disciplina:</span>
                        <span>{plano.disciplina || 'Não definido'}</span>
                      </div>
                      
                      <div className="flex justify-between border-b pb-3">
                        <span className="font-medium">Tipo:</span>
                        <span className="capitalize">{plano.tipo}</span>
                      </div>
                      
                      <div className="flex justify-between border-b pb-3">
                        <span className="font-medium">Duração Total:</span>
                        <span>{plano.duracao_total} minutos</span>
                      </div>
                      
                      <div className="flex justify-between border-b pb-3">
                        <span className="font-medium">Aulas Planejadas:</span>
                        <span>{plano.aulas_planeadas}</span>
                      </div>
                      
                      <div className="flex justify-between border-b pb-3">
                        <span className="font-medium">Etapas de Conteúdo:</span>
                        <span>{plano.conteudos.length}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="font-medium">Turmas:</span>
                        <span>{plano.turma_ids.length} selecionadas</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <div className="flex items-center">
                      <FiCheckCircle className="text-blue-600 mr-2" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Plano pronto para ser salvo ou gerar aulas automaticamente
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleSalvar}
                        disabled={carregando}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {carregando ? 'Salvando...' : 'Salvar Plano'}
                      </button>
                      
                      {plano.tipo !== 'unica' && (
                        <button
                          onClick={handleGerarAulas}
                          disabled={carregando}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {carregando ? 'Gerando...' : 'Gerar Aulas'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer com navegação */}
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between">
                {etapa !== 'basico' && (
                  <button
                    onClick={() => {
                      const etapas = ['basico', 'conteudo', 'recursos', 'revisao'];
                      const index = etapas.indexOf(etapa);
                      setEtapa(etapas[index - 1] as any);
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Voltar
                  </button>
                )}
                
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  
                  {etapa !== 'revisao' ? (
                    <button
                      onClick={() => {
                        const etapas = ['basico', 'conteudo', 'recursos', 'revisao'];
                        const index = etapas.indexOf(etapa);
                        setEtapa(etapas[index + 1] as any);
                      }}
                      className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800"
                    >
                      Continuar
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
