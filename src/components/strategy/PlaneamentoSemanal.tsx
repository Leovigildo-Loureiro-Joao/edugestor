import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiCalendar, 
  FiClock,
  FiCheckCircle,
  FiPlus,
  FiChevronLeft,
  FiChevronRight,
  FiTrash2,
  FiEdit2,
  FiTarget,
  FiList,
  FiX
} from 'react-icons/fi';
import { estrategiaPlaneamentoService } from '../../services/database/estrategia/planeamentoService';
import { PlaneamentoSemanalType } from '../../types/planeamento';
import { useAlert } from '../ui/AlertBadge';
import { ModalSelecionarMetas } from './modals/ModalSelecionarMetas';
import { ModalSelecionarTarefas } from './modals/ModalSelecionarTarefas';

interface AtividadeDetalheSelecionada {
  diaIndex: number;
  atividadeIndex: number;
}

interface AtividadeEdicaoSelecionada {
  diaIndex: number;
  atividadeIndex: number;
}

export const PlaneamentoSemanal = ({dataAtual,setDataAtual,criarPlaneamento,planejamento,setPlanejamento,modo,setModo,carregando,setCarregando}:{criarPlaneamento:any,planejamento:PlaneamentoSemanalType | null,setPlanejamento:(p:PlaneamentoSemanalType | null) => void,modo:'visualizacao' | 'criacao'|'edição',setModo:React.Dispatch<React.SetStateAction<'visualizacao' | 'criacao'>>,dataAtual:Date,setDataAtual?:React.Dispatch<React.SetStateAction<Date>>,carregando?:boolean,setCarregando?:React.Dispatch<React.SetStateAction<boolean>>}) => {
  // Estados para modais
  const [modalMeta, setModalMeta] = useState(false);
  const [modalTarefa, setModalTarefa] = useState(false);
  const [modalAtividade, setModalAtividade] = useState(false);
  const [modalPlaneamento, setModalPlaneamento] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<any>(null);
  const [atividadeSelecionada, setAtividadeSelecionada] = useState<any>(null);
  const [atividadeDetalheSelecionada, setAtividadeDetalheSelecionada] = useState<AtividadeDetalheSelecionada | null>(null);
  const [atividadeEdicaoSelecionada, setAtividadeEdicaoSelecionada] = useState<AtividadeEdicaoSelecionada | null>(null);
  
  const { showAlert } = useAlert();
  
  const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const getDiaCurto = (data: Date) => diasDaSemana[data.getDay()];
  const toIsoDate = (data: Date) => data.toISOString().split('T')[0];

  const dias = Array.from({ length: 7 }, (_, i) => {
    const data = new Date(dataAtual);
    data.setDate(data.getDate() - data.getDay() + i);
    return data;
  });

  useEffect(() => {
    if (!planejamento || !atividadeDetalheSelecionada) return;

    const dia = planejamento.dias?.[atividadeDetalheSelecionada.diaIndex];
    const atividade = dia?.atividades?.[atividadeDetalheSelecionada.atividadeIndex];
    if (!atividade) {
      setAtividadeDetalheSelecionada(null);
    }
  }, [planejamento, atividadeDetalheSelecionada]);
  
  // ========== ADICIONAR ATIVIDADE RÁPIDA ==========
  const adicionarAtividade = async () => {
    if (!planejamento || !diaSelecionado || !atividadeSelecionada?.titulo) return;

    try {
      const novosDias = [...planejamento.dias];
      const diaIndex = novosDias.findIndex(d => d.data === diaSelecionado.data);
      
      if (diaIndex !== -1) {
        const atividadePayload = {
          hora: atividadeSelecionada.hora || '08:00',
          titulo: atividadeSelecionada.titulo,
          tipo: atividadeSelecionada.tipo || 'aula',
          descricao: atividadeSelecionada.descricao
        };

        if (
          atividadeEdicaoSelecionada &&
          atividadeEdicaoSelecionada.diaIndex === diaIndex &&
          novosDias[diaIndex].atividades[atividadeEdicaoSelecionada.atividadeIndex]
        ) {
          novosDias[diaIndex].atividades[atividadeEdicaoSelecionada.atividadeIndex] = atividadePayload;
        } else {
          novosDias[diaIndex].atividades.push(atividadePayload);
        }

        const atualizado = await estrategiaPlaneamentoService.updatePlano(planejamento.id, {
          ...planejamento,
          dias: novosDias
        });

        setPlanejamento(atualizado.data);
        setModalAtividade(false);
        setDiaSelecionado(null);
        setAtividadeSelecionada(null);
        setAtividadeEdicaoSelecionada(null);
        
        showAlert({
          type: 'success',
          title: atividadeEdicaoSelecionada ? 'Atividade atualizada!' : 'Atividade adicionada!',
          message: atividadeEdicaoSelecionada
            ? 'Atividade atualizada no planejamento.'
            : 'Atividade adicionada ao planejamento.',
          duration: 2000
        });
      }
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro',
        message: 'Não foi possível adicionar a atividade.',
        duration: 3000
      });
    }
  };

  // ========== MARCAR ATIVIDADE COMO CONCLUÍDA ==========
  const marcarConcluida = async (diaIndex: number, atvIndex: number) => {
    if (!planejamento) return;

    try {
      const novosDias = [...planejamento.dias];
      // Aqui você pode adicionar um campo 'concluido' nas atividades se quiser
      // Por enquanto, vamos apenas remover ou marcar visualmente
      
      const atualizado = await estrategiaPlaneamentoService.updatePlano(planejamento.id, {
        ...planejamento,
        dias: novosDias
      });

      setPlanejamento(atualizado.data);
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro',
        message: 'Não foi possível atualizar a atividade.',
        duration: 3000
      });
    }
  };

  // ========== DELETAR ATIVIDADE ==========
  const deletarAtividade = async (diaIndex: number, atvIndex: number) => {
    if (!planejamento) return;

    try {
      const novosDias = [...planejamento.dias];
      novosDias[diaIndex].atividades.splice(atvIndex, 1);

      const atualizado = await estrategiaPlaneamentoService.updatePlano(planejamento.id, {
        ...planejamento,
        dias: novosDias
      });

      setPlanejamento(atualizado.data);
      setAtividadeDetalheSelecionada((current) => {
        if (!current) return current;
        if (current.diaIndex !== diaIndex) return current;
        if (current.atividadeIndex === atvIndex) return null;
        if (current.atividadeIndex > atvIndex) {
          return { ...current, atividadeIndex: current.atividadeIndex - 1 };
        }
        return current;
      });
      
      showAlert({
        type: 'success',
        title: 'Atividade removida',
        message: 'Atividade excluída com sucesso.',
        duration: 2000
      });
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro',
        message: 'Não foi possível remover a atividade.',
        duration: 3000
      });
    }
  };

  // ========== DELETAR PLANEJAMENTO ==========
  const handleDeletarPlanejamento = async () => {
    if (!planejamento) return;

    if (!confirm('Tem certeza que deseja excluir este planejamento semanal?')) return;

    try {
      await estrategiaPlaneamentoService.deletePlano(planejamento.id);
      setPlanejamento(null);
      setModo('criacao');
      
      showAlert({
        type: 'success',
        title: 'Planejamento excluído!',
        message: 'O planejamento foi removido com sucesso.',
        duration: 3000
      });
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro ao excluir',
        message: 'Não foi possível excluir o planejamento.',
        duration: 3000
      });
    }
  };

  if (carregando && modo === 'visualizacao') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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

  return (
    <div className="p-6 pt-0 min-h-screen">
      {/* ========== CABEÇALHO ========== */}
      <div className="flex items-center mb-6">
        <div className="flex items-center space-x-4 justify-between w-full">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
                Planeamento Semanal
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Organize suas atividades e conecte com <span className='text-primary-700'>metas e tarefas</span>
              </p>
            </div>
          </div>
          
          <div className='flex items-center gap-3'>
            {/* Navegação de semanas */}
            <button
              onClick={() => {
                const novaData = new Date(dataAtual);
                novaData.setDate(novaData.getDate() - 7);
                if(setDataAtual)
                setDataAtual(novaData);
              }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <FiChevronLeft className="h-6 w-6" />
            </button>
            
            <h2 className="text-xl sm:text-2xl font-bold">
              {dias[0].getDate()}/{dias[0].getMonth() + 1} - {dias[6].getDate()}/{dias[6].getMonth() + 1}
            </h2>
            
            <button
              onClick={() => {
                const novaData = new Date(dataAtual);
                novaData.setDate(novaData.getDate() + 7);
                if(setDataAtual)
                setDataAtual(novaData);
              }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <FiChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* ========== MODO VISUALIZAÇÃO ========== */}
      {planejamento && modo === "visualizacao" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div>
            <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">{planejamento.titulo}</h2>
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
                <p className="mt-2 text-gray-600 dark:text-gray-400">{planejamento.descricao}</p>
              )}
              </div>
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => setModalMeta(true)}
                  className="flex items-center px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                >
                  <FiTarget className="mr-1" /> Conectar Metas
                </button>
                <button
                  onClick={() => setModalTarefa(true)}
                  className="flex items-center px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
                >
                  <FiList className="mr-1" /> Conectar Tarefas
                </button>
              </div>
    
          </div>
          {/* Objetivos da Semana */}
          {planejamento.objetivos_semanais?.filter(o => o.trim()).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                <FiTarget className="mr-2 text-blue-600" />
                Objetivos da Semana
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {planejamento.objetivos_semanais
                  .filter(o => o.trim() !== '')
                  .map((objetivo, index) => (
                    <div key={index} className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <div className="text-blue-800 font-medium">{objetivo}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Calendário Semanal */}
          <div className="grid grid-cols-7 gap-3">
            {dias.map((dia, index) => {
              const diaSemana = getDiaCurto(dia);
              const dataDiaIso = toIsoDate(dia);
              const diaPlanejamento = planejamento.dias?.find(
                d => d.data === dataDiaIso
              );
              const tarefas = diaPlanejamento?.atividades || [];
              
              return (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                  <div className={`text-center font-semibold ${
                    index === 0 || index === 6 ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'
                  }`}>
                    {diaSemana}
                  </div>
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {dia.getDate()}
                  </div>
                  
                  <div className="space-y-2 min-h-[120px]">
                    {tarefas.slice(0, 3).map((tarefa, tIndex) => (
                      <div 
                        key={tIndex}
                        onClick={() =>
                          setAtividadeDetalheSelecionada({
                            diaIndex: index,
                            atividadeIndex: tIndex
                          })
                        }
                        className={`p-2 rounded-lg text-xs ${
                          tarefa.tipo === 'reuniao' ? 'bg-purple-100 text-purple-800' :
                          tarefa.tipo === 'aula' ? 'bg-green-100 text-green-800' :
                          tarefa.tipo === 'planejamento' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800 dark:text-gray-100'
                        } cursor-pointer transition-all ${
                          atividadeDetalheSelecionada?.diaIndex === index &&
                          atividadeDetalheSelecionada?.atividadeIndex === tIndex
                            ? 'ring-2 ring-blue-400'
                            : ''
                        }`}
                      >
                        <div className="font-medium truncate">{tarefa.titulo}</div>
                        <div className="flex items-center mt-1 text-xs opacity-75">
                          <FiClock className="h-3 w-3 mr-1" />
                          {tarefa.hora}
                        </div>
                      </div>
                    ))}
                    
                    {tarefas.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        +{tarefas.length - 3} atividades
                      </div>
                    )}
                    
                    <button
                      onClick={() => {
                        setDiaSelecionado(diaPlanejamento || {
                          dia: diaSemana.toLowerCase(),
                          data: dataDiaIso,
                          atividades: []
                        });
                        setAtividadeEdicaoSelecionada(null);
                        setAtividadeSelecionada({
                          hora: '08:00',
                          tipo: 'aula',
                          titulo: '',
                          descricao: ''
                        });
                        setModalAtividade(true);
                      }}
                      className="w-full p-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-colors"
                    >
                      <FiPlus className="mx-auto" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {atividadeDetalheSelecionada && (() => {
            const dia = planejamento.dias?.[atividadeDetalheSelecionada.diaIndex];
            const atividade = dia?.atividades?.[atividadeDetalheSelecionada.atividadeIndex];
            if (!dia || !atividade) return null;

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">
                      Detalhes da Atividade
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getDiaCurto(new Date(dia.data))} - {new Date(dia.data).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <button
                    onClick={() => setAtividadeDetalheSelecionada(null)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <FiX className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Título</p>
                    <p className="font-medium text-gray-900 dark:text-white">{atividade.titulo}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Hora</p>
                    <p className="font-medium text-gray-900 dark:text-white">{atividade.hora || '--:--'}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Tipo</p>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">{atividade.tipo || 'atividade'}</p>
                  </div>
                </div>

                {atividade.descricao && (
                  <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Descrição</p>
                    <p className="font-medium text-gray-900 dark:text-white">{atividade.descricao}</p>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => {
                      setDiaSelecionado({
                        dia: dia.dia,
                        data: dia.data,
                        atividades: dia.atividades
                      });
                      setAtividadeSelecionada({
                        hora: atividade.hora || '08:00',
                        titulo: atividade.titulo || '',
                        tipo: atividade.tipo || 'aula',
                        descricao: atividade.descricao || ''
                      });
                      setAtividadeEdicaoSelecionada({
                        diaIndex: atividadeDetalheSelecionada.diaIndex,
                        atividadeIndex: atividadeDetalheSelecionada.atividadeIndex
                      });
                      setModalAtividade(true);
                    }}
                    className="flex items-center px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                  >
                    <FiEdit2 className="mr-2" /> Editar atividade
                  </button>
                  <button
                    onClick={() =>
                      deletarAtividade(
                        atividadeDetalheSelecionada.diaIndex,
                        atividadeDetalheSelecionada.atividadeIndex
                      )
                    }
                    className="flex items-center px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                  >
                    <FiTrash2 className="mr-2" /> Remover atividade
                  </button>
                </div>
              </motion.div>
            );
          })()}

          {/* Metas e Tarefas Conectadas */}
          {((planejamento.metas_ids?.length??0) > 0 || planejamento.tarefas_ids?.length > 0) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">Itens Conectados</h3>
              <div className="flex flex-wrap gap-3">
                {planejamento.metas_ids?.map((metaId) => (
                  <span key={metaId} className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm">
                    <FiTarget className="inline mr-1" /> Meta #{metaId.substring(0, 6)}
                  </span>
                ))}
                {planejamento.tarefas_ids?.map((tarefaId) => (
                  <span key={tarefaId} className="px-3 py-1.5 bg-orange-100 text-orange-800 rounded-full text-sm">
                    <FiList className="inline mr-1" /> Tarefa #{tarefaId.substring(0, 6)}
                  </span>
                ))}
              </div>
            </div>
          )}
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
            
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
              Nenhum planejamento para esta semana
            </h3>
            
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Crie um planejamento semanal para organizar suas atividades e conectar com metas e tarefas.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  criarPlaneamento();
                  setModalPlaneamento(true);
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium"
              >
                <FiPlus className="inline mr-2" />
                Criar Planejamento Semanal
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========== MODAL ADICIONAR ATIVIDADE ========== */}
      <AnimatePresence>
        {modalAtividade && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
            onClick={() => setModalAtividade(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-none sm:max-w-md h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <FiCalendar className="mr-2 text-blue-600" />
                  {atividadeEdicaoSelecionada ? 'Editar Atividade' : 'Adicionar Atividade'}
                </h3>
                <button
                  onClick={() => setModalAtividade(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <FiX className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {diaSelecionado && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Dia:</span> {getDiaCurto(new Date(diaSelecionado.data))} - {new Date(diaSelecionado.data).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={atividadeSelecionada?.hora || '08:00'}
                    onChange={(e) => setAtividadeSelecionada({
                      ...atividadeSelecionada,
                      hora: e.target.value
                    })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de Atividade
                  </label>
                  <select
                    value={atividadeSelecionada?.tipo || 'aula'}
                    onChange={(e) => setAtividadeSelecionada({
                      ...atividadeSelecionada,
                      tipo: e.target.value
                    })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="aula">Aula</option>
                    <option value="reuniao">Reunião</option>
                    <option value="planejamento">Planejamento</option>
                    <option value="administrativo">Administrativo</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Título da Atividade
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Aula de Matemática"
                    value={atividadeSelecionada?.titulo || ''}
                    onChange={(e) => setAtividadeSelecionada({
                      ...atividadeSelecionada,
                      titulo: e.target.value
                    })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descrição (opcional)
                  </label>
                  <textarea
                    placeholder="Detalhes da atividade..."
                    value={atividadeSelecionada?.descricao || ''}
                    onChange={(e) => setAtividadeSelecionada({
                      ...atividadeSelecionada,
                      descricao: e.target.value
                    })}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setModalAtividade(false);
                      setDiaSelecionado(null);
                      setAtividadeSelecionada(null);
                      setAtividadeEdicaoSelecionada(null);
                    }}
                    className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={adicionarAtividade}
                    disabled={!atividadeSelecionada?.titulo}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {atividadeEdicaoSelecionada ? 'Salvar alterações' : 'Adicionar'}
                  </button>
                </div>
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
