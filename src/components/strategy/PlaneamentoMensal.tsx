// components/strategy/PlaneamentoMensal.tsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiCalendar, 
  FiChevronLeft, 
  FiChevronRight,
  FiTarget,
  FiCheckCircle,
  FiClock,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiList,
  FiX,
  FiBarChart2
} from 'react-icons/fi';
import { estrategiaPlaneamentoService } from '../../services/database/estrategia/planeamentoService';
import { useAlert } from '../ui/AlertBadge';
import { generateUniqueId } from '../../utils/idGenarator';
import { ModalPlaneamento } from './modals';
import { PlaneamentoMensal as PlaneamentoMensalType } from '../../types/planeamento';
import { ModalSelecionarTarefas } from './modals/ModalSelecionarTarefas';
import { ModalSelecionarMetas } from './modals/ModalSelecionarMetas';


interface PlaneamentoMensalProps {
  criarPlaneamento?: () => void;
  planejamento?: PlaneamentoMensalType;
  setPlanejamento: React.Dispatch<React.SetStateAction<PlaneamentoMensalType | null>>;
  modo: 'visualizacao' | 'criacao'|'edição';
  setModo: React.Dispatch<React.SetStateAction<'visualizacao' | 'criacao' | 'edição'|null>>;
  carregando?: boolean;
  setCarregando?: React.Dispatch<React.SetStateAction<boolean>>;
    dataAtual:string, 
    setDataAtual:React.Dispatch<React.SetStateAction<string>>;
}

export const PlaneamentoMensalComponent: React.FC<PlaneamentoMensalProps> = ({ 
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
  // Estados para modais
  const [modalPlaneamento, setModalPlaneamento] = useState(false);
  const [modalMeta, setModalMeta] = useState(false);
  const [modalTarefa, setModalTarefa] = useState(false);
  const [modalSemana, setModalSemana] = useState(false);
  const [semanaSelecionada, setSemanaSelecionada] = useState<any>(null);
  const [objetivoSemana, setObjetivoSemana] = useState('');
  
  const { showAlert } = useAlert();
  
  // ========== NAVEGAÇÃO ==========
  const irParaMesAnterior = () => {
    const novoMes = new Date(dataAtual);
    novoMes.setMonth(novoMes.getMonth() - 1);
    setDataAtual(novoMes);
  };
  
  const irParaMesSeguinte = () => {
    const novoMes = new Date(dataAtual);
    novoMes.setMonth(novoMes.getMonth() + 1);
    setDataAtual(novoMes);
  };
  
  const irParaMesAtual = () => {
    setDataAtual(new Date());
  };

  // ========== ADICIONAR OBJETIVO SEMANAL ==========
  const adicionarObjetivoSemanal = async () => {
    if (!planejamento || !semanaSelecionada || !objetivoSemana.trim()) return;

    try {
      const novasSemanas = [...(planejamento.semanas || [])];
      const semanaIndex = novasSemanas.findIndex(
        s => s.numero === semanaSelecionada.numero
      );
      
      if (semanaIndex !== -1) {
        if (!novasSemanas[semanaIndex].objetivos) {
          novasSemanas[semanaIndex].objetivos = [];
        }
        novasSemanas[semanaIndex].objetivos.push(objetivoSemana);
      }

      const atualizado = await estrategiaPlaneamentoService.updatePlano(planejamento.id, {
        ...planejamento,
        semanas: novasSemanas
      });

      setPlanejamento(atualizado.data);
      setModalSemana(false);
      setSemanaSelecionada(null);
      setObjetivoSemana('');
      
      showAlert({
        type: 'success',
        title: 'Objetivo adicionado!',
        message: 'Objetivo semanal adicionado com sucesso.',
        duration: 2000
      });
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro',
        message: 'Não foi possível adicionar o objetivo.',
        duration: 3000
      });
    }
  };

  // ========== DELETAR PLANEJAMENTO ==========
  const handleDeletarPlanejamento = async () => {
    if (!planejamento) return;
    if (!confirm('Tem certeza que deseja excluir este planejamento mensal?')) return;

    try {
      await estrategiaPlaneamentoService.deletarPlanejamento(planejamento.id);
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

  // ========== CALCULAR SEMANAS DO MÊS ==========
  const calcularSemanas = () => {
    const primeiroDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
    const ultimoDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0);
    
    const semanas = [];
    let dataInicio = new Date(primeiroDia);
    
    // Ajustar para começar na segunda-feira
    const diaSemana = dataInicio.getDay();
    if (diaSemana !== 1) {
      const diff = diaSemana === 0 ? 6 : diaSemana - 1;
      dataInicio.setDate(dataInicio.getDate() - diff);
    }
    
    let semanaNum = 1;
    while (dataInicio <= ultimoDia || semanas.length < 5) {
      const dataFim = new Date(dataInicio);
      dataFim.setDate(dataInicio.getDate() + 6);
      
      semanas.push({
        numero: semanaNum,
        data_inicio: dataInicio.toISOString().split('T')[0],
        data_fim: (dataFim > ultimoDia ? ultimoDia : dataFim).toISOString().split('T')[0],
        objetivos: planejamento?.semanas?.find(s => s.numero === semanaNum)?.objetivos || []
      });
      
      semanaNum++;
      dataInicio.setDate(dataInicio.getDate() + 7);
    }
    
    return semanas;
  };

  const semanas = calcularSemanas();
  const metasMensais = planejamento?.metas_mensais || ['', '', '', ''];
  const nomeMes = dataAtual.toLocaleDateString('pt-BR', { 
    month: 'long',
    year: 'numeric'
  }).toUpperCase();

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
        <div className="flex items-center space-x-4 mb-4 lg:mb-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
              Planejamento Mensal
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Organize as metas e objetivos do <span className="text-primary-700">mês</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          
          {/* Navegação de meses */}
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none border border-gray-200 dark:border-gray-700 p-1">
            <button
              onClick={irParaMesAnterior}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <FiChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="px-4 text-center">
              <div className="font-bold text-gray-800 dark:text-gray-100">
                {nomeMes}
              </div>
              <button
                onClick={irParaMesAtual}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Hoje
              </button>
            </div>
            
            <button
              onClick={irParaMesSeguinte}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <FiChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========== ESTATÍSTICAS RÁPIDAS ========== */}
      {planejamento && (
        <>
          <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">{planejamento.titulo}</h2>
              {/* Botões de ação */}
          <div className="flex gap-3">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <FiTarget className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {metasMensais.filter(m => m.trim() !== '').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Metas do Mês</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <FiCheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {planejamento.progresso || 0}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Progresso</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <FiCalendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{semanas.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Semanas</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg mr-3">
                <FiBarChart2 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {semanas.filter(s => s.objetivos.length > 0).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Semanas Planejadas</div>
              </div>
            </div>
          </div>
        </div>
        </>
        
      )}

      {/* ========== MODO VISUALIZAÇÃO ========== */}
      {planejamento && modo === 'visualizacao' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{delay:.2}}
          className="space-y-6"
        >
          {/* Metas do Mês */}
          {metasMensais.filter(m => m.trim() !== '').length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center">
                  <FiTarget className="mr-2 text-blue-600" />
                  Metas do Mês
                </h3>
                <button
                  onClick={() => setModalMeta(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <FiPlus className="mr-1" /> Conectar Meta
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metasMensais
                  .filter(m => m.trim() !== '')
                  .map((meta, index) => (
                    <div key={index} className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <div className="flex items-start">
                        <div className="flex-1">
                          <div className="text-blue-800 font-medium">{meta}</div>
                          <div className="text-xs text-blue-600 mt-1">
                            Em andamento
                          </div>
                        </div>
                        <div className="w-16 bg-blue-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.floor(Math.random() * 60 + 20)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Planejamento Semanal */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 pt-0">
            
            {/* Botões para conectar metas e tarefas */}
          <div className="flex items-center gap-2 mb-4">
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

            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {semanas.map((semana, index) => (
                <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">
                      Semana {semana.numero}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(semana.data_inicio).getDate()}/{new Date(semana.data_inicio).getMonth() + 1}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    {new Date(semana.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {new Date(semana.data_fim).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </div>
                  
                  <div className="space-y-2 min-h-[80px]">
                    {semana.objetivos?.map((obj, i) => (
                      <div key={i} className="text-xs bg-gray-100 p-2 rounded">
                        {obj}
                      </div>
                    ))}
                    
                    <button
                      onClick={() => {
                        setSemanaSelecionada(semana);
                        setModalSemana(true);
                      }}
                      className="w-full p-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-colors text-xs"
                    >
                      <FiPlus className="mx-auto" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Itens Conectados */}
          {(planejamento.metas_ids?.length > 0 || planejamento.tarefas_ids?.length > 0) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">Itens Conectados</h3>
              <div className="flex flex-wrap gap-3">
                {planejamento.metas_ids?.map((metaId: string) => (
                  <span key={metaId} className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm">
                    <FiTarget className="inline mr-1" /> Meta #{metaId.substring(0, 6)}
                  </span>
                ))}
                {planejamento.tarefas_ids?.map((tarefaId: string) => (
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
              Nenhum planejamento para este mês
            </h3>
            
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Crie um planejamento mensal para organizar suas metas e objetivos.
            </p>
            
            <button
              onClick={() => {
                criarPlaneamento?.();
                setModalPlaneamento(true);
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium"
            >
              <FiPlus className="inline mr-2" />
              Criar Planejamento Mensal
            </button>
          </div>
        </motion.div>
      )}

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
          

      
      {/* ========== MODAL OBJETIVO SEMANAL ========== */}
      <AnimatePresence>
        {modalSemana && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
            onClick={() => setModalSemana(false)}
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
                  Objetivo da Semana {semanaSelecionada?.numero}
                </h3>
                <button
                  onClick={() => setModalSemana(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <FiX className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {semanaSelecionada && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Período:</span> {new Date(semanaSelecionada.data_inicio).toLocaleDateString('pt-BR')} - {new Date(semanaSelecionada.data_fim).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Objetivo da Semana
                  </label>
                  <textarea
                    placeholder="Digite o objetivo principal desta semana..."
                    value={objetivoSemana}
                    onChange={(e) => setObjetivoSemana(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setModalSemana(false);
                      setSemanaSelecionada(null);
                      setObjetivoSemana('');
                    }}
                    className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={adicionarObjetivoSemanal}
                    disabled={!objetivoSemana.trim()}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      
    </div>
  );
};

export default PlaneamentoMensalComponent;
