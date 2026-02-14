import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiClock,
  FiCalendar,
  FiCheckCircle,
  FiPlus,
  FiBell,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiTrash2,
  FiTarget,
  FiList,
  FiX
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { estrategiaPlaneamentoService } from '../../services/database/estrategia/planeamentoService.ts';
import { PlaneamentoDiario, Horario } from '../../types/planeamento';
import { useAlert } from '../../components/ui/AlertBadge';
import { generateUniqueId } from '../../utils/idGenarator';
import { ModalPlaneamento as ModalPlaneamentoDiario, ModalSelecionarTarefas, ModalSelecionarMetas } from './modals';

interface PlaneamentoDiarioProps {
  criarPlaneamento?: () => void;
  planejamento?: PlaneamentoDiario;
  setPlanejamento: React.Dispatch<React.SetStateAction<PlaneamentoDiario|null>>;
  modo: 'visualizacao' | 'criacao'|'edição';
  carregando?: boolean;
  setCarregando?: React.Dispatch<React.SetStateAction<boolean>>;
  setModo: React.Dispatch<React.SetStateAction<'visualizacao' | 'criacao' | 'edição'|null>>
  dataAtual:string, 
  setDataAtual:React.Dispatch<React.SetStateAction<string>>;
}

export const PlaneamentoDiario: React.FC<PlaneamentoDiarioProps> = ({ 
  criarPlaneamento,
  planejamento,
  setPlanejamento,
  modo,
  setModo,
  carregando,
  dataAtual,
  setDataAtual,
  setCarregando
}) => {
  const [] = useState(new Date());
  
  const { showAlert } = useAlert();
  
  // Estados para modais
  const [modalPlaneamento, setModalPlaneamento] = useState(false);
  const [modalMeta, setModalMeta] = useState(false);
  const [modalTarefa, setModalTarefa] = useState(false);
  const [modalAgenda, setModalAgenda] = useState(false);
  const [agenda, setAgenda] = useState<Partial<Horario>>({});
  
  const hoje = new Date().toISOString().split('T')[0];
  const dataFormatada = dataAtual.toISOString().split('T')[0];

  // ========== NAVEGAÇÃO ENTRE DIAS ==========
  const avancarDia = () => {
    const novaData = new Date(dataAtual);
    novaData.setDate(novaData.getDate() + 1);
    setDataAtual(novaData);
  };

  const retrocederDia = () => {
    const novaData = new Date(dataAtual);
    novaData.setDate(novaData.getDate() - 1);
    setDataAtual(novaData);
  };

  const irParaHoje = () => {
    setDataAtual(new Date());
  };

  // ========== MARCAR HORÁRIO COMO CONCLUÍDO ==========
  const marcarComoConcluido = async (index: number) => {
    if (!planejamento || !setPlanejamento) return;

    const novosHorarios = [...planejamento.horarios];
    novosHorarios[index].concluido = !novosHorarios[index].concluido;
    
    try {
      const atualizado = await estrategiaPlaneamentoService.updatePlano(
        planejamento.id,
        {
          ...planejamento,
          horarios: novosHorarios,
          progresso: calcularProgressoCompleto(novosHorarios),
          status: calcularProgressoCompleto(novosHorarios) >= 100 ? 'concluido' : 'ativo'
        }
      );
      
      setPlanejamento(atualizado.data as PlaneamentoDiario);
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro ao atualizar',
        message: 'Não foi possível marcar como concluído.',
        duration: 3000
      });
    }
  };

  const conectarMetas = async (metasSelecionadas: string[]) => {
      if (!planejamento) return;
      
      try {
        const atualizado = await estrategiaPlaneamentoService.updatePlano(planejamento.id, {
          ...planejamento,
          metas_ids: metasSelecionadas
        });
        
        setPlanejamento(atualizado.data);
        setModalMeta(false);
        
        showAlert({
          type: 'success',
          title: 'Metas conectadas!',
          message: `${metasSelecionadas.length} meta(s) conectada(s) ao planejamento mensal.`,
          duration: 3000
        });
      } catch (error) {
        showAlert({
          type: 'error',
          title: 'Erro',
          message: 'Não foi possível conectar as metas.',
          duration: 3000
        });
      }
    };
    
    // ========== FUNÇÃO PARA CONECTAR TAREFAS ==========
    const conectarTarefas = async (tarefasSelecionadas: string[]) => {
      if (!planejamento) return;
      
      try {
        const atualizado = await estrategiaPlaneamentoService.updatePlano(planejamento.id, {
          ...planejamento,
          tarefas_ids: tarefasSelecionadas
        });
        
        setPlanejamento(atualizado.data);
        setModalTarefa(false);
        
        showAlert({
          type: 'success',
          title: 'Tarefas conectadas!',
          message: `${tarefasSelecionadas.length} tarefa(s) conectada(s) ao planejamento mensal.`,
          duration: 3000
        });
      } catch (error) {
        showAlert({
          type: 'error',
          title: 'Erro',
          message: 'Não foi possível conectar as tarefas.',
          duration: 3000
        });
      }
    };

  // ========== ADICIONAR AGENDA APÓS CRIAÇÃO ==========
  const adicionarAgenda = async () => {
    if (!planejamento || !agenda.atividade || !agenda.hora) return;

    const novoHorario: Horario = {
      hora: agenda.hora,
      atividade: agenda.atividade,
      descricao: agenda.descricao || '',
      local: agenda.local,
      participantes: agenda.participantes,
      concluido: false
    };

    const novosHorarios = [...planejamento.horarios, novoHorario];
    
    try {
      const atualizado = await estrategiaPlaneamentoService.updatePlano(
        planejamento.id,
        {
          ...planejamento,
          horarios: novosHorarios,
          progresso: calcularProgressoCompleto(novosHorarios)
        }
      );
      
      setPlanejamento(atualizado.data as PlaneamentoDiario);
      setModalAgenda(false);
      setAgenda({});
      toast.success('Atividade adicionada ao planejamento!');
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro ao adicionar',
        message: 'Não foi possível adicionar a atividade.',
        duration: 3000
      });
    }
  };

  // ========== DELETAR PLANEJAMENTO ==========
  const handleDeletarPlanejamento = async () => {
    if (!planejamento) return;

    if (!confirm('Tem certeza que deseja excluir este planejamento?')) return;

    try {
      await estrategiaPlaneamentoService.deletePlano(planejamento.id);
      setPlanejamento(null);
      setModo('criacao');
      toast.success('Planejamento excluído!');
      
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro ao excluir',
        message: 'Não foi possível excluir o planejamento.',
        duration: 3000
      });
    }
  };

  // ========== UTILITÁRIOS ==========
  const calcularProgressoCompleto = (horariosArray: Horario[]) => {
    const concluidas = horariosArray.filter(h => h.concluido).length;
    const total = horariosArray.filter(h => h.atividade.trim() !== '').length;
    return total > 0 ? Math.round((concluidas / total) * 100) : 0;
  };

  const eHoje = dataFormatada === hoje;
  const podeEditar = planejamento?.status !== 'concluido';

  // ========== LOADING ==========
  if (carregando && modo === 'visualizacao') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-0 min-h-screen">
      {/* ========== CABEÇALHO ========== */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <div>
              <h1 className="text-md lg:text-2md font-bold text-gray-800">
                Planeamento Diário
              </h1>
              <p className="text-gray-600">
                Organize suas atividades do dia e conecte com <span className='text-primary-700'>metas e tarefas</span>
              </p>
            </div>
          </div>

          {/* Navegação de datas */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-white rounded-lg shadow p-2">
              <button onClick={retrocederDia} className="p-2 hover:bg-gray-100 rounded-lg">
                <FiChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              
              <div className="px-4 py-2 text-center min-w-[180px]">
                <div className="text-lg font-bold text-gray-800">
                  {dataAtual.toLocaleDateString('pt-BR', { weekday: 'long' })}
                </div>
                <div className="text-sm text-gray-600">
                  {dataAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                {eHoje && (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Hoje</span>
                )}
              </div>
              
              <button onClick={avancarDia} className="p-2 hover:bg-gray-100 rounded-lg">
                <FiChevronRight className="h-5 w-5 text-gray-600" />
              </button>
              
              <button onClick={irParaHoje} className="ml-2 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                Hoje
              </button>
            </div>
          </div>
        </div>

        
      </div>

      <AnimatePresence mode="wait">
        {/* ========== MODO VISUALIZAÇÃO ========== */}
        {modo === 'visualizacao' && planejamento && (
          <motion.div
            key="visualizacao"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Coluna Principal - Agenda */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-800">{planejamento.titulo}</h2>
                    <div className='flex space-x-3'>
                      {modo === 'visualizacao' && planejamento && (
                        <button
                          onClick={() => criarPlaneamento?.()} 
                          className="flex items-center px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                        >
                          <FiEdit2 className="mr-2" /> Editar
                        </button>
                      )}
                      
                      {modo === 'visualizacao' && planejamento && (
                        <button
                          onClick={handleDeletarPlanejamento}
                          className="flex items-center px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        >
                          <FiTrash2 className="mr-2" /> Excluir
                        </button>
                      )}
                    </div>
                    
                  </div>
                  {planejamento.descricao && (
                    <p className="mt-2 text-gray-600">{planejamento.descricao}</p>
                  )}
                </div>
                
                <div className="p-6">
                  {/* Focos Principais - AGORA É planejamento.focos */}
                  {planejamento.focos && planejamento.focos.length > 0 && planejamento.focos.some(f => f.trim() !== '') && (
                    <div className="mb-8">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                        <FiTarget className="mr-2 text-blue-600" />
                        Focos Principais do Dia
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {planejamento.focos
                          .filter(foco => foco.trim() !== '')
                          .map((foco, index) => (
                            <div key={index} className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                              <div className="text-blue-800 font-medium">{foco}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Agenda do Dia */}
                  <div className='flex justify-between items-center mb-4'>
                    <h3 className="font-bold text-gray-800 flex items-center">
                      <FiClock className="mr-2 text-green-600" />
                      Agenda do Dia
                    </h3>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setModalMeta(true)}
                        className="flex items-center px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                      >
                        <FiTarget className="mr-1" /> Meta
                      </button>
                      
                      <button
                        onClick={() => setModalTarefa(true)}
                        className="flex items-center px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
                      >
                        <FiList className="mr-1" /> Tarefa
                      </button>
                      
                      <button
                        onClick={() => setModalAgenda(true)}
                        className="flex items-center px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                      >
                        <FiPlus className="mr-1" /> Horário
                      </button>
                    </div>
                  </div>
                  
                  {/* Lista de Horários */}
                  <div className="space-y-4">
                    {planejamento.horarios
                      .filter(h => h.atividade.trim() !== '')
                      .map((horario, index) => (
                        <div 
                          key={index} 
                          className={`flex items-start p-4 rounded-xl border-l-4 transition-all ${
                            horario.concluido 
                              ? 'bg-green-50 border-green-500' 
                              : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          <div className="w-24 flex-shrink-0">
                            <div className="font-bold text-gray-800">{horario.hora}</div>
                            {horario.concluido && (
                              <span className="text-xs text-green-600 mt-1 inline-flex items-center">
                                <FiCheckCircle className="mr-1" /> Concluído
                              </span>
                            )}
                          </div>
                          
                          <div className="flex-1 ml-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-800">{horario.atividade}</h4>
                                {horario.descricao && (
                                  <p className="text-gray-600 text-sm mt-1">{horario.descricao}</p>
                                )}
                                {horario.local && (
                                  <p className="text-gray-500 text-xs mt-1">📍 {horario.local}</p>
                                )}
                              </div>
                              {podeEditar && (
                                <button
                                  onClick={() => marcarComoConcluido(index)}
                                  className={`px-3 py-1 rounded-lg text-sm ${
                                    horario.concluido
                                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                  }`}
                                >
                                  {horario.concluido ? 'Desmarcar' : 'Concluir'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Metas e Tarefas Conectadas - AGORA É planejamento.metas_ids e tarefas_ids */}
                  {(planejamento.metas_ids && planejamento.metas_ids.length > 0 || planejamento.tarefas_ids && planejamento.tarefas_ids.length > 0) && (
                    <div className="mt-8 pt-6 border-t">
                      <h3 className="font-bold text-gray-800 mb-4">Itens Conectados</h3>
                      <div className="flex flex-wrap gap-3">
                        {planejamento.metas_ids?.map((metaId) => (
                          <span key={metaId} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                            <FiTarget className="inline mr-1" size={12} />
                            Meta #{metaId.substring(0, 6)}
                          </span>
                        ))}
                        {planejamento.tarefas_ids?.map((tarefaId) => (
                          <span key={tarefaId} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                            <FiList className="inline mr-1" size={12} />
                            Tarefa #{tarefaId.substring(0, 6)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna lateral - Informações */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="font-bold text-gray-800 mb-4">Progresso do Dia</h3>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {planejamento.progresso}%
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${planejamento.progresso}%` }}
                    />
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    {planejamento.horarios.filter(h => h.concluido).length} de {planejamento.horarios.filter(h => h.atividade.trim() !== '').length} atividades concluídas
                  </div>
                </div>
              </div>

              {planejamento.lembretes && planejamento.lembretes.length > 0 && planejamento.lembretes.some(l => l.trim() !== '') && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex items-center mb-4">
                    <FiBell className="text-yellow-500 mr-2" />
                    <h3 className="font-bold text-gray-800">Lembretes</h3>
                  </div>
                  <div className="space-y-3">
                    {planejamento.lembretes
                      .filter(l => l.trim() !== '')
                      .map((lembrete, index) => (
                        <div key={index} className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                          <div className="text-gray-800 text-sm">{lembrete}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="font-bold text-gray-800 mb-4">Resumo</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Data:</span>
                    <span className="font-medium">{new Date(planejamento.data_inicio).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Responsável:</span>
                    <span className="font-medium">{planejamento.responsavel || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Atividades:</span>
                    <span className="font-medium">
                      {planejamento.horarios.filter(h => h.atividade.trim() !== '').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========== MODO CRIAÇÃO - SEM PLANEJAMENTO ========== */}
        {!planejamento && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-blue-50 to-white border-2 border-dashed border-blue-200 rounded-2xl p-12 text-center"
          >
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
                <FiCalendar className="h-10 w-10 text-blue-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                Nenhum planejamento para hoje
              </h3>
              
              <p className="text-gray-600 mb-8">
                Crie um planejamento para organizar suas atividades e conectar com metas e tarefas.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => {
                    criarPlaneamento?.();
                    setModalPlaneamento(true);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium"
                >
                  <FiPlus className="inline mr-2" />
                  Criar Novo Planejamento
                </button>
                
                <button onClick={irParaHoje} className="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium">
                  Voltar para Hoje
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== MODAL ADICIONAR AGENDA ========== */}
      <AnimatePresence>
        {modalAgenda && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setModalAgenda(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <FiClock className="mr-2 text-blue-600" />
                  Adicionar Atividade
                </h3>
                <button onClick={() => setModalAgenda(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <FiX className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hora</label>
                  <input
                    type="time"
                    defaultValue="08:00"
                    onChange={(e) => setAgenda(prev => ({ ...prev, hora: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Atividade</label>
                  <input
                    type="text"
                    placeholder="Digite a atividade"
                    onChange={(e) => setAgenda(prev => ({ ...prev, atividade: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descrição</label>
                  <input
                    type="text"
                    placeholder="Descrição (opcional)"
                    onChange={(e) => setAgenda(prev => ({ ...prev, descricao: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => {
                    setModalAgenda(false);
                    setAgenda({});
                  }} 
                  className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button 
                  onClick={adicionarAgenda} 
                  disabled={!agenda.atividade || !agenda.hora}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Adicionar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Adicionar os MODAIS antes do fechamento do componente */}
      <ModalSelecionarMetas
        isOpen={modalMeta}
        onClose={() => setModalMeta(false)}
        onConfirm={conectarMetas}
        metasConectadas={planejamento?.metas_ids || []}
        tipoPlano="mensal"
      />

      <ModalSelecionarTarefas
        isOpen={modalTarefa}
        onClose={() => setModalTarefa(false)}
        onConfirm={conectarTarefas}
        tarefasConectadas={planejamento?.tarefas_ids || []}
        tipoPlano="mensal"
      />
            
    </div>
  );
};
