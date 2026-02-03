import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiArrowLeft, 
  FiSave, 
  FiCalendar, 
  FiUser, 
  FiFlag, 
  FiTag,
  FiFileText,
  FiCheckSquare,
  FiClock,
  FiAlertCircle,
  FiTrash2,
  FiCopy,
  FiBell,
  FiPaperclip,
  FiEye,
  FiEyeOff,
  FiStar,
  FiSend,
  FiTarget
} from 'react-icons/fi';
import { Tarefa } from '../../types/eventos';
import { estrategiaService } from '../../services/database/estrategiaService';
import db from '../../services/database/db';
import { useAlert } from '../../components/ui/AlertBadge';
import { useConfirmModal } from '../../components/ui/ComfirmModal';
import toast from 'react-hot-toast';
import { RxCalendar, RxLoop, RxStar, RxSwitch, RxUpdate } from 'react-icons/rx';
import { SelectTyped } from '../../components/students/StudentForm';
import { FaGolang } from 'react-icons/fa6';
import { Library, List } from 'lucide-react';
import { FaCheck } from 'react-icons/fa';



const TarefaPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdicao = !!id;
  const { showAlert } = useAlert(); 
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [tarefa, setTarefa] = useState<Tarefa | null>(null);
  const [metas, setMetas] = useState<Array<{ id: string; titulo: string }>>([]);
  const [checklistItems, setChecklistItems] = useState<Array<{ item: string; concluido: boolean }>>([]);
  const [novoChecklistItem, setNovoChecklistItem] = useState('');
  const [anexos, setAnexos] = useState<string[]>([]);
  const [novoAnexo, setNovoAnexo] = useState('');
  const [comentarios, setComentarios] = useState<Array<{
    autor: string;
    texto: string;
    data: string;
    tipo: 'comentario' | 'atualizacao';
  }>>([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
    const { confirm, ModalComponent } = useConfirmModal();

  // Form data
  const [formData, setFormData] = useState<Partial<Tarefa>>({
    titulo: '',
    descricao: '',
    tipo: 'operacional',
    categoria: 'rotina',
    prioridade: 'media',
    status: 'pendente',
    responsavel_id: 'admin',
    responsavel_nome: 'Administrador',
    data_limite: '',
    estimativa_horas: 1,
    percentual_conclusao: 0,
    data_criacao: new Date().toISOString().split('T')[0]
  });

  // Carregar dados iniciais
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        // Carregar metas para relacionamento
        const metasData = await estrategiaService.getMetas();
        setMetas(metasData.map((m:any) => ({ id: m.id, titulo: m.titulo })));
        
        // Se for edição, carregar a tarefa
        if (isEdicao && id) {
          const tarefaData = await db.tarefas.get(id);
          setTarefa(tarefaData);
          setFormData({
            ...tarefaData,
            data_limite: (tarefaData&&tarefaData.data_limite) || ''
          });
          
          // Carregar checklist
          if (tarefaData&&tarefaData.checklist) {
            try {
              const parsed = tarefaData.checklist;
              setChecklistItems(Array.isArray(parsed) ? parsed : []);
            } catch {
              setChecklistItems([]);
            }
          }
          
          // Carregar histórico (mock)
          setComentarios([
            {
              autor: 'Administrador',
              texto: 'Tarefa criada',
              data: new Date().toISOString(),
              tipo: 'atualizacao'
            }
          ]);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    
    carregarDados();
  }, [id, isEdicao]);

  // Configurações disponíveis
  const tiposTarefa = [
    { value: 'operacional', label: 'Operacional', icon: '🛠️', desc: 'Tarefas de operação do dia a dia' },
    { value: 'administrativa', label: 'Administrativa', icon: '📋', desc: 'Documentos, relatórios, burocracia' },
    { value: 'pedagogica', label: 'Pedagógica', icon: '📚', desc: 'Aulas, materiais, atividades educacionais' },
    { value: 'manutencao', label: 'Manutenção', icon: '🔧', desc: 'Reparos, limpeza, conservação' },
    { value: 'evento', label: 'Evento', icon: '🎉', desc: 'Concursos, reuniões, atividades especiais' }
  ];

  const categorias = [
    { value: 'importante', label: 'Importante', cor: 'bg-purple-100 text-purple-800', icon: <FiStar/> },
    { value: 'urgente', label: 'Urgente', cor: 'bg-red-100 text-red-800', icon: <FiAlertCircle/> },
    { value: 'evento', label: 'Evento', cor: 'bg-indigo-100 text-indigo-800', icon: <RxCalendar/> },
    { value: 'rotina', label: 'Rotina', cor: 'bg-green-100 text-green-800', icon: <RxLoop/> },
    { value: 'melhoria', label: 'Melhoria', cor: 'bg-teal-100 text-teal-800', icon: <RxUpdate/> }
  ];

  const prioridades = [
    { value: 'baixa', label: 'Baixa', icon: '🔵', cor: 'bg-blue-100 text-blue-800', desc: 'Pode ser feita quando houver tempo' },
    { value: 'media', label: 'Média', icon: '🟡', cor: 'bg-yellow-100 text-yellow-800', desc: 'Importante, mas não crítica' },
    { value: 'alta', label: 'Alta', icon: '🟠', cor: 'bg-orange-100 text-orange-800', desc: 'Deve ser feita em breve' },
    { value: 'critica', label: 'Crítica', icon: '🔴', cor: 'bg-red-100 text-red-800', desc: 'Urgente - máxima prioridade' }
  ];

  const statusOptions = [
    { value: 'pendente', label: 'Pendente', cor: 'bg-yellow-100 text-yellow-800' },
    { value: 'em_andamento', label: 'Em Andamento', cor: 'bg-blue-100 text-blue-800' },
    { value: 'concluida', label: 'Concluída', cor: 'bg-green-100 text-green-800' },
    { value: 'atrasada', label: 'Atrasada', cor: 'bg-red-100 text-red-800' },
    { value: 'cancelada', label: 'Cancelada', cor: 'bg-gray-100 text-gray-800' }
  ];

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo?.trim()) {
       showAlert({
          type: 'warning',
          title: 'Preencha todos campos obrigatórios',
          message: 'Título é obrigatório',
          duration: 3000
        });
      return;
    }

    setSalvando(true);
    try {
      const dadosCompletos: Partial<Tarefa> = {
        ...formData,
        checklist: checklistItems,
        anexos: anexos,
        updated_at: new Date().toISOString(),
        // Se for nova tarefa, adiciona created_at
        ...(!isEdicao && {
          created_at: new Date().toISOString()
        })
      };

      if (isEdicao && id) {
        await estrategiaService.updateTarefa(id, dadosCompletos);
      } else {
        await estrategiaService.saveTarefa(dadosCompletos);
      }
      
      // Adicionar ao histórico
      const novoHistorico: {
        autor: string;
        texto: string;
        data: string;
        tipo: 'atualizacao' | 'comentario';
      } = {
        autor: 'Administrador',
        texto: isEdicao ? 'Tarefa atualizada' : 'Tarefa criada',
        data: new Date().toISOString(),
        tipo: 'atualizacao'
      };
      setComentarios([novoHistorico, ...comentarios]);
      
      // Redirecionar para lista
      navigate('/tarefas');
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
        showAlert({
          type: 'error',
          title: 'Verifique suas permissões de utilizador',
          message: 'Erro ao salvar tarefa',
          duration: 5000
        });
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async () => {
    const confirmed = await confirm({
          type: 'delete',
          title: 'Excluir tarefa',
          message: `Tem certeza que deseja excluir esta tarefa?`,
          isDestructive: true,
          confirmText: 'Excluir',
          onConfirm: async () => {
            try {
               if (isEdicao && id) {
                await estrategiaService.deleteTarefa(id);
                toast.success('Tarefa excluída com sucesso!');
                showAlert({
                  type: 'success',
                  title: 'Tarefa excluída!',
                  message: `Tarefa foi removida do sistema.`,
                  duration: 3000
                });
                navigate('/tarefas');
              }
            
              
            } catch (error) {
              showAlert({
                type: 'error',
                title: 'Meta ao excluir',
                message: 'Não foi possível excluir a tarefa. Verifique sua conexão.',
                duration: 5000
              });
            }
          }
        });
   
  };

  const handleDuplicar = () => {
    const novaTarefa: Partial<Tarefa> = {
      ...formData,
      titulo: `${formData.titulo} (CÓPIA)`,
      status: 'pendente' as const,
      percentual_conclusao: 0,
      data_criacao: new Date().toISOString().split('T')[0]
    };
    
    setFormData(novaTarefa);
    // Limpar ID para que seja salva como nova
    setTarefa(null);
  };

  const adicionarChecklistItem = () => {
    if (novoChecklistItem.trim()) {
      const novoItem = { item: novoChecklistItem, concluido: false };
      setChecklistItems([...checklistItems, novoItem]);
      setNovoChecklistItem('');
    }
  };

  const removerChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const toggleChecklistItem = (index: number) => {
    const updated = [...checklistItems];
    updated[index].concluido = !updated[index].concluido;
    setChecklistItems(updated);
    
    // Atualizar percentual de conclusão baseado no checklist
    const concluidos = updated.filter(item => item.concluido).length;
    const percentual = updated.length > 0 ? Math.round((concluidos / updated.length) * 100) : 0;
    setFormData({...formData, percentual_conclusao: percentual});
  };

  const adicionarComentario = () => {
    if (novoComentario.trim()) {
      const novoComent: {
        autor: string;
        texto: string;
        data: string;
        tipo: 'comentario' | 'atualizacao';
      } = {
        autor: 'Administrador',
        texto: novoComentario,
        data: new Date().toISOString(),
        tipo: 'comentario'
      };
      setComentarios([novoComent, ...comentarios]);
      setNovoComentario('');
    }
  };

  const adicionarAnexo = () => {
    if (novoAnexo.trim()) {
      setAnexos([...anexos, novoAnexo]);
      setNovoAnexo('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r rounded-md from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/estrategia/tarefas')}
            className="flex font-semibold items-center text-blue-100 hover:text-white mb-6"
          >
            <FiArrowLeft className="mr-2" />
            Voltar para Tarefas
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold mb-2 flex gap-3">
                <FiCheckSquare/>
                {isEdicao ? 'Editar Tarefa' : 'Nova Tarefa'}
              </h1>
              <p className="text-blue-100">
                {isEdicao 
                  ? 'Atualize os detalhes da tarefa existente' 
                  : 'Preencha os detalhes para criar uma nova tarefa'}
              </p>
            </div>
            
            {isEdicao && (
              <div className="mt-4 md:mt-0 flex space-x-2">
                <button
                  onClick={handleDuplicar}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 flex items-center"
                >
                  <FiCopy className="mr-2" />
                  Duplicar
                </button>
                <button
                  onClick={handleExcluir}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center"
                >
                  <FiTrash2 className="mr-2" />
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Principal */}
      <div className="container mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Card Principal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Cabeçalho do Card */}
            <div className="border-b p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                    className="text-xl font-bold bg-transparent border-none w-full focus:outline-none focus:ring-0"
                    placeholder="Digite o título da tarefa..."
                    required
                  />
                </div>
                
                {/* Status */}
                <div>
                  <SelectTyped
                    value={formData.status}
                    icon={null}
                    onChange={(e) => setFormData({...formData, status: e as any})}
                    className="px-4 py-2 rounded-lg border font-medium"
                    vect={[...statusOptions]}
                  />
                  
                </div>
              </div>
            </div>

            {/* Conteúdo do Card */}
            <div className="p-6">
              {/* Descrição */}
              <div className="mb-8">
                <label className="block text-gray-700 font-semibold mb-3 flex items-center">
                  <FiFileText className="mr-2" />
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-40"
                  placeholder="Descreva em detalhes o que precisa ser feito..."
                />
              </div>

              {/* Grid de Configurações */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Tipo */}
                <div>
                  <label className="block text-gray-700 font-medium mb-2 flex items-center">
                    <FiTag className="mr-2" />
                    Tipo de Tarefa
                  </label>
                  <div className="space-y-2">
                    {tiposTarefa.map(tipo => (
                      <button
                        key={tipo.value}
                        type="button"
                        onClick={() => setFormData({...formData, tipo: tipo.value as any})}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          formData.tipo === tipo.value
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="text-xl mr-3">{tipo.icon}</span>
                          <div>
                            <div className="font-medium">{tipo.label}</div>
                            <div className="text-xs text-gray-500">{tipo.desc}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categoria e Prioridade */}
                <div className="space-y-6">
                  {/* Categoria */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      Categoria
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {categorias.map(cat => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setFormData({...formData, categoria: cat.value as any})}
                          className={`p-3 rounded-lg font-medium flex items-center justify-center transition-all ${
                            formData.categoria === cat.value
                              ? `${cat.cor} ring-2 ring-offset-1`
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <span className="mr-2">{cat.icon}</span>
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prioridade */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      Prioridade
                    </label>
                    <div className="space-y-2">
                      {prioridades.map(pri => (
                        <button
                          key={pri.value}
                          type="button"
                          onClick={() => setFormData({...formData, prioridade: pri.value as any})}
                          className={`w-full p-3 rounded-lg border text-left transition-all ${
                            formData.prioridade === pri.value
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center">
                            <span className="text-xl mr-3">{pri.icon}</span>
                            <div>
                              <div className="font-medium">{pri.label}</div>
                              <div className="text-xs text-gray-500">{pri.desc}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Datas e Progresso */}
                <div className="space-y-6">
                  {/* Data Limite */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2 flex items-center">
                      <FiCalendar className="mr-2" />
                      Prazo Limite
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formData.data_limite}
                        onChange={(e) => setFormData({...formData, data_limite: e.target.value})}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      {formData.data_limite && (
                        <div className="mt-2 text-sm text-gray-600">
                          Dias restantes: {
                            Math.ceil((new Date(formData.data_limite).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                          }
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Estimativa e Progresso */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-2 flex items-center">
                        <FiClock className="mr-2" />
                        Estimativa
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={formData.estimativa_horas}
                          onChange={(e) => setFormData({...formData, estimativa_horas: parseFloat(e.target.value)})}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          horas
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-2">
                        Progresso
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.percentual_conclusao}
                          onChange={(e) => setFormData({...formData, percentual_conclusao: parseInt(e.target.value)})}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          %
                        </div>
                      </div>
                      {formData.percentual_conclusao && formData.percentual_conclusao > 0 && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${formData.percentual_conclusao}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Meta Relacionada */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      Meta Relacionada
                    </label>
                    <SelectTyped
                      vect={["Selecione uma Meta",...(metas.map(m=>({'value':m.id,'label':m.titulo})))]}
                      onChange={(e) => setFormData({...formData, meta_id: e})}
                      value={formData.meta_id || ''}
                      icon={FiTarget}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Checklist */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="border-b p-6">
              <h2 className="text-xl font-bold flex items-center">
                <FiCheckSquare className="mr-2" />
                Checklist
              </h2>
              <p className="text-gray-600 mt-1">Adicione os passos necessários para concluir esta tarefa</p>
            </div>
            
            <div className="p-6">
              {/* Adicionar item */}
              <div className="mb-6">
                <div className="flex">
                  <input
                    type="text"
                    value={novoChecklistItem}
                    onChange={(e) => setNovoChecklistItem(e.target.value)}
                    placeholder="Digite um novo item..."
                    className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarChecklistItem())}
                  />
                  <button
                    type="button"
                    onClick={adicionarChecklistItem}
                    className="bg-blue-500 text-white px-6 rounded-r-lg hover:bg-blue-600"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Lista de itens */}
              <div className="space-y-3">
                {checklistItems.map((item, index) => (
                  <div key={index} className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={item.concluido}
                      onChange={() => toggleChecklistItem(index)}
                      className="h-5 w-5 text-blue-600 rounded"
                    />
                    <span className={`ml-3 flex-1 ${item.concluido ? 'line-through text-gray-500' : ''}`}>
                      {item.item}
                    </span>
                    <button
                      type="button"
                      onClick={() => removerChecklistItem(index)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
                
                {checklistItems.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <FiCheckSquare size={48} className="mx-auto mb-3 opacity-50" />
                    <p>Nenhum item no checklist</p>
                    <p className="text-sm">Adicione os passos necessários acima</p>
                  </div>
                )}
              </div>
              
              {/* Estatísticas do checklist */}
              {checklistItems.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-blue-600">Progresso do Checklist</div>
                      <div className="font-semibold">
                        {checklistItems.filter(i => i.concluido).length} de {checklistItems.length} itens concluídos
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round((checklistItems.filter(i => i.concluido).length / checklistItems.length) * 100)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>


          {/* Botões de Ação */}
          <div className="flex justify-between items-center pt-8 border-t">
            <div className="text-gray-600">
              <div className="flex items-center">
                <FiAlertCircle className="mr-2" />
                <span>Campos com * são obrigatórios</span>
              </div>
              {formData.prioridade === 'critica' && (
                <div className="mt-2 text-red-600 font-medium flex items-center">
                  <FiStar className="mr-2" />
                  ⚠️ Esta tarefa está marcada como CRÍTICA - Máxima prioridade
                </div>
              )}
            </div>
            
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate('/tarefas')}
                className="px-8 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                disabled={salvando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-800 flex items-center disabled:opacity-50"
              >
                {salvando ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <FiSave className="mr-2" />
                    {isEdicao ? 'Atualizar Tarefa' : 'Criar Tarefa'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
      <ModalComponent/>
    </div>
  );
};

export default TarefaPage;