// components/estrategia/KPIManager.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FiBarChart2, 
  FiTrendingUp, 
  FiTrendingDown, 
  FiSave, 
  FiPlus, 
  FiTrash2, 
  FiX,
  FiDatabase,
  FiCpu,
  FiEdit,
  FiDollarSign,
  FiBook,
  FiHome,
  FiEdit2,
  FiBox
} from 'react-icons/fi';
import { IndicadorDesempenho, Meta } from '../../types/eventos';
import { estrategiaService } from '../../services/database/estrategiaService';
import { toast } from 'react-hot-toast';
import { FaBusinessTime, FaFileWord, FaRegIdCard } from 'react-icons/fa';
import { RxCheckCircled, RxGroup, RxText } from 'react-icons/rx';
import { SelectTyped } from '../students/StudentForm';
import { FaTimeline } from 'react-icons/fa6';
import { generateUniqueId } from '../../utils/idGenarator';
import { useConfirmModal } from '../ui/ComfirmModal';
import { useAlert } from '../ui/AlertBadge';

interface KPIManagerProps {
  meta: Meta;
  onUpdate: () => void;
}

// Opções para fonte de dados
export const MODULOS_DISPONIVEIS = [
  { value: 'matriculas', label: 'Matrículas', icone: <FaRegIdCard className='text-gray-500 dark:text-gray-200'/>},
  { value: 'frequencia', label: 'Frequência', icone: <FiTrendingUp className='text-gray-500 dark:text-gray-200'/> },
  { value: 'notas', label: 'Notas', icone: <RxCheckCircled className='text-gray-500 dark:text-gray-200'/>},
  { value: 'financeiro', label: 'Financeiro', icone: <FiDollarSign className='text-gray-500 dark:text-gray-200'/> },
  { value: 'pessoal', label: 'Pessoal (RH)', icone: <RxGroup className='text-gray-500 dark:text-gray-200'/> },
  { value: 'biblioteca', label: 'Biblioteca', icone: <FiBook className='text-gray-500 dark:text-gray-200'/> },
  { value: 'infraestrutura', label: 'Infraestrutura', icone: <FiHome className='text-gray-500 dark:text-gray-200'/> },
  { value: 'manual', label: 'Manual', icone: <FiEdit2 className='text-gray-500 dark:text-gray-200'/> },
] as const;

// Métricas por módulo (exemplos)
export const METRICAS_POR_MODULO: Record<string, Array<{value: string, label: string}>> = {
  matriculas: [
    { value: 'novas_matriculas', label: 'Novas Matrículas' },
    { value: 'cancelamentos', label: 'Cancelamentos' },
    { value: 'evasao_mensal', label: 'Evasão Mensal' },
    { value: 'retencao', label: 'Taxa de Retenção' },
    { value: 'total_matriculados', label: 'Total Matriculados' },
  ],
  frequencia: [
    { value: 'presenca_media', label: 'Presença Média' },
    { value: 'ausencias_justificadas', label: 'Ausências Justificadas' },
    { value: 'atrasos', label: 'Atrasos' },
    { value: 'frequencia_diaria', label: 'Frequência Diária' },
  ],
  notas: [
    { value: 'media_geral', label: 'Média Geral' },
    { value: 'taxa_aprovacao', label: 'Taxa de Aprovação' },
    { value: 'recuperacao', label: 'Alunos em Recuperação' },
    { value: 'nota_minima', label: 'Nota Mínima' },
    { value: 'nota_maxima', label: 'Nota Máxima' },
  ],
  financeiro: [
    { value: 'inadimplencia', label: 'Taxa de Inadimplência' },
    { value: 'receita_mensal', label: 'Receita Mensal' },
    { value: 'despesas', label: 'Despesas' },
    { value: 'lucro_operacional', label: 'Lucro Operacional' },
  ],
  manual: [
    { value: 'manual', label: 'Entrada Manual' },
  ]
};

export const FREQUENCIAS = [
  { value: 'diaria', label: 'Diária' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'anual', label: 'Anual' },
];

export const KPIManager: React.FC<KPIManagerProps> = ({ meta, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const {showAlert} = useAlert();
    const { confirm, ModalComponent } = useConfirmModal();
  const [novoKPI, setNovoKPI] = useState<IndicadorDesempenho>({
    id:generateUniqueId(),
    nome: '',
    descricao: '',
    unidade: '%',
    valor_atual: 0,
    valor_meta: 100,
    frequencia: 'mensal' as const,
    peso: 10,
    fonte_dados: {
      tipo: 'automatico' as const,
      modulo: 'matriculas' as const,
      metrica: 'novas_matriculas',
      filtros: {},
      query_parametros: {}
    }
  });

  const [editandoKPI, setEditandoKPI] = useState<string | null>(null);

  const handleSaveKPI = async () => {
    try {
      if (editandoKPI) {
        // Atualizar KPI existente
        await estrategiaService.updateKPI(meta.id, editandoKPI, {
          ...novoKPI,
          id: editandoKPI
        });
         showAlert({
          type: 'success',
          title: 'Operação concluida',
          message: 'KPI atualizado com sucesso!',
          duration: 3000
        });
        setEditandoKPI(null);
      } else {
        // Criar novo KPI
        await estrategiaService.addKPI(meta.id, {
          ...novoKPI,
          id: generateUniqueId(), // ID temporário
        });
          showAlert({
          type: 'success',
          title: 'Operação concluida',
          message: 'KPI adicionado com sucesso!',
          duration: 3000
        });
        toast.success('KPI adicionado com sucesso!');
      }
      
      setShowForm(false);
      setNovoKPI({
        id:generateUniqueId(),
        nome: '',
        descricao: '',
        unidade: '%',
        valor_atual: 0,
        valor_meta: 100,
        frequencia: 'mensal',
        peso: 10,
        fonte_dados: {
          tipo: 'automatico',
          modulo: 'matriculas',
          metrica: 'novas_matriculas',
          filtros: {},
          query_parametros: {}
        }
      });
      onUpdate();
    } catch (error) {
      showAlert({
          type: 'error',
          title: 'Erro!!!',
          message: editandoKPI ? 'Erro ao atualizar KPI' : 'Erro ao adicionar KPI',
          duration: 5000
        });
      toast.error(editandoKPI ? 'Erro ao atualizar KPI' : 'Erro ao adicionar KPI');
    }
  };

  const handleDeleteKPI = async (kpiId: string) => {
      const confirmed = await confirm({
          type: 'delete',
          title: 'Excluir KPI',
          message: `'Tem certeza que deseja excluir este KPI?'`,
          isDestructive: true,
          confirmText: 'Excluir',
          onConfirm: async () => {
            try {
             await estrategiaService.removeKPI(meta.id, kpiId);
              showAlert({
                  type: 'success',
                  title: 'Operação concluida',
                  message: 'KPI excluído com sucesso!',
                  duration: 3000
                });
                onUpdate();
              toast.success('KPI excluído com sucesso!');
            } catch (error) {
              console.error('Erro ao excluir KPI:', error);
              toast.error('Erro ao excluir KPI');
              showAlert({
                type: 'error',
                title: 'Erro ao excluir KPI',
                message: 'Não foi possivel efectuar a operação',
                duration: 5000
              });
            }
          }
        });
   
  };

  const handleEditKPI = (kpi: any) => {
    
    setEditandoKPI(kpi.id||generateUniqueId());
    setNovoKPI({
      id:generateUniqueId(),
      nome: kpi.nome,
      descricao: kpi.descricao || '',
      unidade: kpi.unidade,
      valor_atual: kpi.valor_atual,
      valor_meta: kpi.valor_meta,
      frequencia: kpi.frequencia,
      peso: kpi.peso || 10,
      fonte_dados: kpi.fonte_dados || {
        tipo: 'manual',
        modulo: 'manual',
        metrica: 'manual',
        filtros: {},
        query_parametros: {}
      }
    });
    setShowForm(true);
  };

  const calcularProgresso = (valorAtual: number, valorMeta: number) => {
    return valorMeta > 0 ? Math.min((valorAtual / valorMeta) * 100, 100) : 0;
  };

  const getModuloLabel = (modulo: string) => {
    return MODULOS_DISPONIVEIS.find(m => m.value === modulo)?.label || modulo;
  };

  const getModuloIcon = (modulo: string) => {
    return MODULOS_DISPONIVEIS.find(m => m.value === modulo)?.icone || '📊';
  };

  const getMetricaLabel = (modulo: string, metrica: string) => {
    return METRICAS_POR_MODULO[modulo]?.find(m => m.value === metrica)?.label || metrica;
  };

  const atualizarValorManual = async (kpi: IndicadorDesempenho, novoValor: number) => {
    try {
      await estrategiaService.updateKPI(meta.id, kpi.id, {...kpi,valor_atual:novoValor});
        showAlert({
          type: 'success',
          title: 'Operação concluida',
          message: 'Valor atualizado com sucesso!',
          duration: 3000
        });
      onUpdate();
      toast.success('Valor atualizado!');
    } catch (error) {
       showAlert({
          type: 'error',
          title: 'Erro ao atualizar',
          message: 'Erro ao atualizar o valor!',
          duration: 5000
        });
    }
  };

  return (
    <motion.div
      initial={{x:-20,opacity:0}}
      animate={{x:0,opacity:1}} 
      className=" gap-6 flex flex-col "
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Indicadores de Desempenho (KPIs)
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Indicadores automáticos conectados aos dados da escola
          </p>
        </div>
        <button
          onClick={() => {
            setEditandoKPI(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <FiPlus className="h-4 w-4" />
          Novo KPI
        </button>
      </div>

      {/* Lista de KPIs */}
      <div className="space-y-4">
        {meta.kpis && meta.kpis.length > 0 ? (
          meta.kpis.map((kpi) => {
            const progresso = calcularProgresso(kpi.valor_atual, kpi.valor_meta);
            const fonteAutomatica = kpi.fonte_dados?.tipo === 'automatico';
            
            return (
              <motion.div
                key={kpi.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${fonteAutomatica ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
                      {fonteAutomatica ? (
                        <FiCpu className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <FiDatabase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900 dark:text-white">{kpi.nome}</h4>
                        <span className="text-xs flex gap-2 items-center px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {getModuloIcon(kpi.fonte_dados?.modulo || 'manual')} {getModuloLabel(kpi.fonte_dados?.modulo || 'manual')}
                        </span>
                        {fonteAutomatica && (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                            Automático
                          </span>
                        )}
                      </div>
                      
                      {kpi.descricao && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{kpi.descricao}</p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-1">
                          <FiBarChart2 className="h-3 w-3" />
                          <span>Meta: {kpi.valor_meta} {kpi.unidade}</span>
                        </div>
                        <span>•</span>
                        <span>Frequência: {kpi.frequencia}</span>
                        <span>•</span>
                        <span>Peso: {kpi.peso || 10}%</span>
                        {kpi.fonte_dados?.metrica && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600 dark:text-blue-400">
                              {getMetricaLabel(kpi.fonte_dados.modulo||"pessoal", kpi.fonte_dados.metrica)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditKPI(kpi)}
                      className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Editar KPI"
                    >
                      <FiEdit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteKPI(kpi.id)}
                      className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Excluir KPI"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Atualização manual de valor (se não for automático) */}
                {!fonteAutomatica && (
                  <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Valor Atual:
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={kpi.valor_atual}
                          onChange={(e) => atualizarValorManual(kpi, parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-right"
                          step="0.01"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{kpi.unidade}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Progresso e valores */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {kpi.valor_atual.toLocaleString('pt-BR')} / {kpi.valor_meta.toLocaleString('pt-BR')} {kpi.unidade}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {progresso.toFixed(1)}% do objetivo
                    </div>
                  </div>
                  
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    progresso >= 100 ? 'bg-green-100 dark:bg-green-900' :
                    progresso >= 70 ? 'bg-blue-100 dark:bg-blue-900' :
                    progresso >= 40 ? 'bg-yellow-100 dark:bg-yellow-900' :
                    'bg-red-100 dark:bg-red-900'
                  }`}>
                    <span className={`font-bold ${
                      progresso >= 100 ? 'text-green-600 dark:text-green-400' :
                      progresso >= 70 ? 'text-blue-600 dark:text-blue-400' :
                      progresso >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {progresso.toFixed(0)}%
                    </span>
                  </div>
                </div>
                
                {/* Barra de progresso */}
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                    <span>Progresso</span>
                    <div className="flex items-center gap-2">
                      <span>{progresso.toFixed(1)}%</span>
                      {progresso >= 100 ? (
                        <FiTrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : progresso < 40 ? (
                        <FiTrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                      ) : null}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        progresso >= 100 ? 'bg-green-600' :
                        progresso >= 70 ? 'bg-blue-600' :
                        progresso >= 40 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${Math.min(progresso, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Informações da fonte de dados */}
                {fonteAutomatica && kpi.fonte_dados && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <FiDatabase className="h-3 w-3" />
                      <span>Fonte automática: </span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {getMetricaLabel(kpi.fonte_dados.modulo||"pessoal", kpi.fonte_dados.metrica)}
                      </span>
                      {kpi.fonte_dados.filtros && Object.keys(kpi.fonte_dados.filtros).length > 0 && (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                          {Object.keys(kpi.fonte_dados.filtros).length} filtro(s)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
            <FiBarChart2 className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nenhum indicador definido
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
              Adicione KPIs para monitorar automaticamente o progresso desta meta usando dados reais da escola.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
            >
              <FiPlus className="h-4 w-4" />
              Criar Primeiro KPI
            </button>
          </div>
        )}
      </div>
 {/* Modal de formulário */}
      {showForm && (
        <ModalKPI
          novoKPI={novoKPI}
          setNovoKPI={setNovoKPI}
          handleSaveKPI={handleSaveKPI}
          setShowForm={() => {
            setShowForm(false);
            setEditandoKPI(null);
          }}
          editando={editandoKPI!=null}
          modulosDisponiveis={MODULOS_DISPONIVEIS}
          metricasPorModulo={METRICAS_POR_MODULO}
          frequencias={FREQUENCIAS}
        />
      )}
      <ModalComponent/>
    </motion.div>
  );
};

interface ModalKPIProps {
  novoKPI: any;
  setNovoKPI: (kpi: any) => void;
  handleSaveKPI: () => void;
  setShowForm: (show: boolean) => void;
  editando: boolean;
  modulosDisponiveis: typeof MODULOS_DISPONIVEIS;
  metricasPorModulo: typeof METRICAS_POR_MODULO;
  frequencias: typeof FREQUENCIAS;
}

export const ModalKPI: React.FC<ModalKPIProps> = ({
  novoKPI,
  setNovoKPI,
  handleSaveKPI,
  setShowForm,
  editando,
  modulosDisponiveis,
  metricasPorModulo,
  frequencias
}) => {
  const metricaAtual = metricasPorModulo[novoKPI.fonte_dados.modulo] || [];
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={() => setShowForm(false)}
    >
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl "
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 ">
          <div className='flex justify-between items-center mb-4'>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editando ? 'Editar KPI' : 'Adicionar Novo KPI'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Configure indicadores automáticos conectados aos dados da escola
              </p>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6 overflow-y-auto p-2 max-h-[80vh] w-full">
            {/* Informações básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Indicador *
                </label>
                <input
                  type="text"
                  value={novoKPI.nome}
                  onChange={(e) => setNovoKPI({...novoKPI, nome: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Taxa de Aprovação"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição
                </label>
                <input
                  type="text"
                  value={novoKPI.descricao}
                  onChange={(e) => setNovoKPI({...novoKPI, descricao: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  placeholder="Descreva o que este KPI mede"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unidade de Medida *
                </label>
                <input
                  type="text"
                  value={novoKPI.unidade}
                  onChange={(e) => setNovoKPI({...novoKPI, unidade: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  placeholder="%, alunos, horas, R$"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valor Meta *
                </label>
                <input
                  type="number"
                  value={novoKPI.valor_meta}
                  onChange={(e) => setNovoKPI({...novoKPI, valor_meta: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Configurações de Fonte de Dados */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FiDatabase className="h-4 w-4" />
                Fonte de Dados
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de Coleta
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNovoKPI({
                        ...novoKPI,
                        fonte_dados: { ...novoKPI.fonte_dados, tipo: 'automatico' }
                      })}
                      className={`flex-1 px-3 py-2 rounded-lg border ${
                        novoKPI.fonte_dados.tipo === 'automatico'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <FiCpu className="h-4 w-4" />
                        Automática
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNovoKPI({
                        ...novoKPI,
                        fonte_dados: { ...novoKPI.fonte_dados, tipo: 'manual' }
                      })}
                      className={`flex-1 px-3 py-2 rounded-lg border ${
                        novoKPI.fonte_dados.tipo === 'manual'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <FiEdit className="h-4 w-4" />
                        Manual
                      </div>
                    </button>
                  </div>
                </div>

                {novoKPI.fonte_dados.tipo === 'automatico' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Módulo de Dados
                      </label>
                      <SelectTyped
                        multiIcon={true}
                        value={novoKPI.fonte_dados.modulo}
                        vect={[...(modulosDisponiveis.filter(m => m.value !== 'manual'))]
                        }
                        onChange={(e) => setNovoKPI({
                          ...novoKPI,
                          fonte_dados: { 
                            ...novoKPI.fonte_dados, 
                            modulo: e,
                            metrica: METRICAS_POR_MODULO[e]?.[0]?.value || 'manual'
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                      />
                      
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Métrica
                      </label>
                      <SelectTyped
                        icon={FiBox}
                        vect={[...metricaAtual]}
                        value={novoKPI.fonte_dados.metrica}
                        onChange={(e) => setNovoKPI({
                          ...novoKPI,
                          fonte_dados: { ...novoKPI.fonte_dados, metrica: e }
                        })}
                      />
                     
                    </div>
                  </>
                )}
              </div>

              {novoKPI.fonte_dados.tipo === 'automatico' && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                  <div className="flex items-start gap-2">
                    <FiCpu className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Este KPI será atualizado automaticamente usando dados do módulo{' '}
                        <strong>{getModuloLabel(novoKPI.fonte_dados.modulo)}</strong>.
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        A cada atualização, o sistema buscará a métrica selecionada.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Configurações adicionais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Frequência de Atualização
                </label>
                 <SelectTyped
                  vect={[...frequencias]}
                  icon={FaTimeline}
                  value={novoKPI.frequencia}
                  onChange={(e) => setNovoKPI({...novoKPI, frequencia: e as any})}
                 />
                
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Peso na Meta (1-100%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={novoKPI.peso}
                    onChange={(e) => setNovoKPI({...novoKPI, peso: parseInt(e.target.value)})}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-medium">{novoKPI.peso}%</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Define a importância deste KPI no cálculo do progresso total
                </p>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveKPI}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                disabled={!novoKPI.nome || !novoKPI.unidade}
              >
                <FiSave className="h-4 w-4" />
                {editando ? 'Atualizar KPI' : 'Criar KPI'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
     
    </motion.div>
  );
};

// Funções auxiliares (fora do componente)
const getModuloLabel = (modulo: string) => {
  return MODULOS_DISPONIVEIS.find(m => m.value === modulo)?.label || modulo;
};