import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiTarget, FiDollarSign, FiPercent, FiCalendar, 
  FiCheck, FiX, FiInfo, FiPieChart, FiTrendingUp,
  FiSave, FiEdit2, FiTrash2, FiPlus, FiAlertCircle,
  FiBarChart2, FiCreditCard, FiBriefcase, FiHome,
  FiBook, FiTrendingDown, FiCheckCircle, FiClock,
  FiUser, FiUsers
} from 'react-icons/fi';
import { Meta } from '../../types/eventos';
import { AlocacaoRecurso } from '../../types/transacao';
import { useAlert } from '../ui/AlertBadge';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';
import { generateUniqueId } from '../../utils/idGenarator';


interface AlocacaoRecursosModalProps {
  isOpen: boolean;
  onClose: () => void;
  fundosDisponiveis: number;
  metas: Meta[];
  onAlocacaoSalva: (alocacao: {
     metas: AlocacaoRecurso[],
      totalAlocado:number,
      mes: string,
      ano: string,
      descricao: string
  }) => void;
  historicoAlocacoes?: Array<{
    id: string;
    mes: number;
    ano: number;
    alocacoes: AlocacaoRecurso[];
    total_alocado: number;
    data_registro: string;
    descricao: string;
  }>;
}

export const AlocacaoRecursosModal: React.FC<AlocacaoRecursosModalProps> = ({
  isOpen,
  onClose,
  fundosDisponiveis,
  metas,
  onAlocacaoSalva,
  historicoAlocacoes = []
}) => {
  const { showAlert } = useAlert();
  const [metasSelecionadas, setMetasSelecionadas] = useState<Array<AlocacaoRecurso>>([]);
  const [mobileMetasOpen, setMobileMetasOpen] = useState(false);

  const [modoDistribuicao, setModoDistribuicao] = useState<'valor' | 'percentual'>('valor');
  const [valorDistribuir, setValorDistribuir] = useState(0);
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [descricaoAlocacao, setDescricaoAlocacao] = useState('');
  const [metasFiltradas, setMetasFiltradas] = useState<Meta[]>([]);

  
  const getIconByTipo = (tipo: Meta['tipo']) => {
    switch (tipo) {
      case 'academica': return FiBook;
      case 'financeira': return FiDollarSign;
      case 'operacional': return FiBriefcase;
      case 'marketing': return FiBarChart2;
      case 'infraestrutura': return FiHome;
      case 'qualidade': return FiCheckCircle;
      default: return FiTarget;
    }
  };

  
  const getColorByPrioridade = (prioridade: Meta['prioridade']) => {
    switch (prioridade) {
      case 'critica': return 'bg-red-500 text-white';
      case 'alta': return 'bg-orange-500 text-white';
      case 'media': return 'bg-yellow-500 text-black';
      case 'baixa': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  
  const getColorByStatus = (status: Meta['status']) => {
    switch (status) {
      case 'concluida': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'em_andamento': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'atrasada': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'suspensa': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'nao_iniciada': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  
  useEffect(() => {
    const ativas = metas.filter(meta => 
      meta.status !== 'concluida' && 
      meta.status !== 'suspensa' && 
      (!meta.orcamento_previsto || meta.orcamento_previsto > 0) 
    );
    setMetasFiltradas(ativas);
  }, [metas]);

  
  useEffect(() => {
    if (metasFiltradas.length > 0 && metasSelecionadas.length === 0) {
      
      const ordenadasPorPrioridade = [...metasFiltradas].sort((a, b) => {
        const ordemPrioridade = { critica: 4, alta: 3, media: 2, baixa: 1 };
        return (ordemPrioridade[b.prioridade] || 0) - (ordemPrioridade[a.prioridade] || 0);
      });

      const selecionadas = ordenadasPorPrioridade.slice(0, 3).map(meta => {
        const orcamentoAtual = meta.progresso * (meta.orcamento_previsto || 0) / 100;
        const orcamentoRestante = (meta.orcamento_previsto || 0) - orcamentoAtual;
        const valorSugerido = Math.min(orcamentoRestante, fundosDisponiveis * 0.3); 
        
        return {
          meta,
          meta_id: meta.id,
          orcamento_actual: orcamentoAtual,
          orcamento_total: orcamentoAtual + valorSugerido,
          data_alocacao: new Date().toISOString(),
          instituicao_id: instituicaoIdValue(),
          sync_status: "pending" as const,
          id: generateUniqueId(),
          valor: valorSugerido,
          percentual: 0,
          motivo: `Alocação para meta: ${meta.titulo}`,
          tipo_alocacao: valorSugerido >= orcamentoRestante * 0.95 ? 'completo' as const : 'parcial' as const
        };
      });
      setMetasSelecionadas(selecionadas);
    }
  }, [metasFiltradas, fundosDisponiveis]);

  useEffect(() => {
    if (!isOpen) {
      setMobileMetasOpen(false);
    }
  }, [isOpen]);

  
  const totalAlocado = metasSelecionadas.reduce((sum, item) => sum + item.valor, 0);
  const saldoRestante = fundosDisponiveis - totalAlocado;
  const percentualTotal = metasSelecionadas.reduce((sum, item) => sum + (metas.find(meta=> meta.id==item.meta_id)?.progresso ?? 0), 0);

  
  const adicionarMeta = (meta: Meta) => {
    if (metasSelecionadas.find(item => item.meta_id === meta.id)) {
      showAlert({ type: 'error', title: 'Esta meta já foi adicionada' });
      return;
    }

    
    const orcamentoAtual = meta.progresso * (meta.orcamento_previsto || 0) / 100;
    const orcamentoRestante = (meta.orcamento_previsto || 0) - orcamentoAtual;
    const valorSugerido = Math.min(orcamentoRestante, fundosDisponiveis * 0.2); 

    setMetasSelecionadas([
      ...metasSelecionadas,
      {
        meta_id:meta.id,
        meta:meta,
        orcamento_actual:orcamentoAtual,
        orcamento_total:orcamentoAtual+valorSugerido,
        data_alocacao:new Date().toISOString(),
        instituicao_id:instituicaoIdValue(),
        sync_status:"pending",
        id:generateUniqueId(),
        valor: valorSugerido,
        percentual: (valorSugerido / fundosDisponiveis) * 100,
        motivo: `Alocação para meta: ${meta.titulo}`,
        tipo_alocacao: orcamentoRestante <= valorSugerido ? 'completo' : 'parcial'
      }
    ]);
  };

  const removerMeta = (metaId: string) => {
    setMetasSelecionadas(metasSelecionadas.filter(item => item.meta_id !== metaId));
  };

  const atualizarValor = (metaId: string, valor: number) => {
    setMetasSelecionadas(metasSelecionadas.map(item => {
      const meta=metas.find(met=> met.id==metaId)
      if (meta) {
        
        const orcamentoAtual = meta.progresso * (meta.orcamento_previsto || 0) / 100;
        const orcamentoRestante = (meta.orcamento_previsto || 0) - orcamentoAtual;
        
        
        const valorMaximo = Math.min(orcamentoRestante, fundosDisponiveis);
        const novoValor = Math.max(0, Math.min(valor, valorMaximo));
        const percentual = fundosDisponiveis > 0 ? (novoValor / fundosDisponiveis) * 100 : 0;
        
        
        let tipo_alocacao: 'complementar' | 'completo' | 'parcial' = 'parcial';
        if (novoValor >= orcamentoRestante * 0.95) {
          tipo_alocacao = 'completo';
        } else if (novoValor > 0 && novoValor < orcamentoRestante * 0.5) {
          tipo_alocacao = 'complementar';
        }
        
        return {
          ...item,
          valor: novoValor,
          percentual,
          tipo_alocacao
        };
      }
      return item;
    }));
  };

  const atualizarPercentual = (metaId: string, percentual: number) => {
    setMetasSelecionadas(metasSelecionadas.map(item => {
      const meta=metas.find(met=> met.id==metaId)
      if (meta) {
        const novoPercentual = Math.max(0, Math.min(percentual, 100));
        const valor = (fundosDisponiveis * novoPercentual) / 100;
        
        const orcamentoAtual = meta.progresso * (meta.orcamento_previsto || 0) / 100;
        const orcamentoRestante = (meta.orcamento_previsto || 0) - orcamentoAtual;
        
        
        const valorMaximo = Math.min(orcamentoRestante, fundosDisponiveis);
        const valorFinal = Math.min(valor, valorMaximo);
        const percentualFinal = (valorFinal / fundosDisponiveis) * 100;
        
        
        let tipo_alocacao: 'complementar' | 'completo' | 'parcial' = 'parcial';
        if (valorFinal >= orcamentoRestante * 0.95) {
          tipo_alocacao = 'completo';
        } else if (valorFinal > 0 && valorFinal < orcamentoRestante * 0.5) {
          tipo_alocacao = 'complementar';
        }
        
        return {
          ...item,
          valor: valorFinal,
          percentual: percentualFinal,
          tipo_alocacao
        };
      }
      return item;
    }));
  };

  const atualizarMotivo = (metaId: string, motivo: string) => {
    setMetasSelecionadas(metasSelecionadas.map(item => 
      item.meta_id === metaId ? { ...item, motivo } : item
    ));
  };

  const atualizarTipoAlocacao = (metaId: string, tipo: 'complementar' | 'completo' | 'parcial') => {
    setMetasSelecionadas(metasSelecionadas.map(item => {
      const meta=metas.find(met=> met.id==metaId)
      if (meta) {
        const orcamentoAtual = meta.progresso * (meta.orcamento_previsto || 0) / 100;
        const orcamentoRestante = (meta.orcamento_previsto || 0) - orcamentoAtual;
        
        let novoValor = item.valor;
        
        
        if (tipo === 'completo') {
          novoValor = Math.min(orcamentoRestante, fundosDisponiveis);
        } else if (tipo === 'complementar') {
          novoValor = orcamentoRestante * 0.3; 
        } else if (tipo === 'parcial' && item.valor > orcamentoRestante * 0.5) {
          novoValor = orcamentoRestante * 0.5; 
        }
        
        return {
          ...item,
          valor: novoValor,
          percentual: (novoValor / fundosDisponiveis) * 100,
          tipo_alocacao: tipo
        };
      }
      return item;
    }));
  };

  
  const distribuirIgualmente = () => {
    if (metasSelecionadas.length === 0) {
      showAlert({ type: 'error', title: 'Adicione pelo menos uma meta' });
      return;
    }

    const valorPorMeta = valorDistribuir / metasSelecionadas.length;
    setMetasSelecionadas(metasSelecionadas.map(item => {
      const orcamentoAtual = item.meta.progresso * (item.meta.orcamento_previsto || 0) / 100;
      const orcamentoRestante = (item.meta.orcamento_previsto || 0) - orcamentoAtual;
      const valorFinal = Math.min(valorPorMeta, orcamentoRestante);
      
      return {
        ...item,
        valor: valorFinal,
        percentual: (valorFinal / fundosDisponiveis) * 100,
        tipo_alocacao: valorFinal >= orcamentoRestante * 0.95 ? 'completo' : 'parcial'
      };
    }));
  };

  
  
  const distribuirPorPrioridade = () => {
    if (metasSelecionadas.length === 0) {
      showAlert({ type: 'error', title: 'Adicione pelo menos uma meta' });
      return;
    }

    const pesosPrioridade = { critica: 4, alta: 3, media: 2, baixa: 1 };
    const totalPeso = metasSelecionadas.reduce((sum, item) => 
      sum + (pesosPrioridade[item.meta.prioridade] || 1), 0);

    setMetasSelecionadas(metasSelecionadas.map(item => {
      const peso = pesosPrioridade[item.meta.prioridade] || 1;
      const proporcao = peso / totalPeso;
      const valor = valorDistribuir * proporcao;
      
      const orcamentoAtual = item.meta.progresso * (item.meta.orcamento_previsto || 0) / 100;
      const orcamentoRestante = (item.meta.orcamento_previsto || 0) - orcamentoAtual;
      const valorFinal = Math.min(valor, orcamentoRestante);
      
      return {
        ...item,
        valor: valorFinal,
        percentual: (valorFinal / fundosDisponiveis) * 100,
        tipo_alocacao: valorFinal >= orcamentoRestante * 0.95 ? 'completo' : 'parcial'
      };
    }));
  };

  
  const distribuirPorNecessidade = () => {
    if (metasSelecionadas.length === 0) {
      showAlert({ type: 'error', title: 'Adicione pelo menos uma meta' });
      return;
    }

    const totalNecessidade = metasSelecionadas.reduce((sum, item) => {
      const orcamentoAtual = item.meta.progresso * (item.meta.orcamento_previsto || 0) / 100;
      const necessidade = (item.meta.orcamento_previsto || 0) - orcamentoAtual;
      return sum + Math.max(0, necessidade);
    }, 0);

    if (totalNecessidade === 0) {
      showAlert({ type: 'error', title: 'Todas as metas já têm orçamento completo' });
      return;
    }

    setMetasSelecionadas(metasSelecionadas.map(item => {
      const orcamentoAtual = item.meta.progresso * (item.meta.orcamento_previsto || 0) / 100;
      const necessidade = (item.meta.orcamento_previsto || 0) - orcamentoAtual;
      const proporcao = necessidade / totalNecessidade;
      const valor = valorDistribuir * proporcao;
      const valorFinal = Math.min(valor, necessidade);
      
      return {
        ...item,
        valor: valorFinal,
        percentual: (valorFinal / fundosDisponiveis) * 100,
        tipo_alocacao: valorFinal >= necessidade * 0.95 ? 'completo' : 'parcial'
      };
    }));
  };

  
  const salvarAlocacao = () => {
    if (metasSelecionadas.length === 0) {
      showAlert({ type: 'error', title: 'Adicione pelo menos uma meta' });
      return;
    }

    if (totalAlocado > fundosDisponiveis) {
      showAlert({ type: 'error', title: `O valor alocado (${formatarMoeda(totalAlocado)}) excede os fundos disponíveis (${formatarMoeda(fundosDisponiveis)})` });
      return;
    }

    if (!descricaoAlocacao.trim()) {
      showAlert({ type: 'error', title: 'Forneça uma descrição para esta alocação' });
      return;
    }

    const alocacoes = metasSelecionadas.map(item => {
      const orcamentoAtual = item.meta.progresso * (item.meta.orcamento_previsto || 0) / 100;
      
      return {
        meta_id: item.meta_id,
        meta: item.meta,
        meta_titulo: item.meta.titulo,
        valor: item.valor,
        percentual: (item.valor / fundosDisponiveis) * 100,
        motivo: item.motivo,
        tipo_alocacao: item.tipo_alocacao,
        orcamento_atual: orcamentoAtual,
        orcamento_actual: orcamentoAtual,
        orcamento_total: item.meta.orcamento_previsto || 0,
        data_alocacao: new Date().toISOString(),
        id: item.id,
        sync_status: item.sync_status
      };
    });

    onAlocacaoSalva({
      metas: alocacoes,
      totalAlocado,
      mes: meses[mesSelecionado],
      ano: anoSelecionado.toString(),
      descricao: descricaoAlocacao
    });

    showAlert({ type: 'success', title: 'Recursos alocados com sucesso!' });
  };

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA'
    }).format(valor);
  };

  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const headingH1 =
    'font-bold text-gray-900 dark:text-white';
  const headingH2 =
    'font-semibold text-gray-900 dark:text-white';
  const headingH3 =
    'font-medium text-gray-900 dark:text-white';

  const renderMetasSidebar = () => (
    <>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className={headingH2}>
            Metas Disponíveis ({metasFiltradas.length})
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Clique para adicionar/remover
          </div>
        </div>
        
        <div className="space-y-4">
          {metasFiltradas.map((meta) => {
            const Icon = getIconByTipo(meta.tipo);
            const orcamentoAtual = meta.progresso * (meta.orcamento_previsto || 0) / 100;
            const orcamentoRestante = (meta.orcamento_previsto || 0) - orcamentoAtual;
            const isSelecionada = metasSelecionadas.find(item => item.meta_id === meta.id);
            
            return (
              <div
                key={meta.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelecionada
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
                onClick={() => {
                  if (isSelecionada) {
                    removerMeta(meta.id);
                  } else {
                    adicionarMeta(meta);
                  }
                  setMobileMetasOpen(false);
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Icon className="text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="max-w-[200px]">
                      <h3 className={`${headingH3} truncate`}>
                        {meta.titulo}
                      </h3>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                        {meta.tipo}
                      </div>
                    </div>
                  </div>
                  
                  {isSelecionada ? (
                    <div className="p-1 bg-blue-100 dark:bg-blue-800 rounded-full">
                      <FiCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  ) : (
                    <div className="p-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                      <FiPlus className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Progresso e Orçamento */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        Progresso: {meta.progresso}%
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getColorByStatus(meta.status)}`}>
                        {meta.status === 'em_andamento' ? 'Em andamento' :
                          meta.status === 'concluida' ? 'Concluída' :
                          meta.status === 'atrasada' ? 'Atrasada' :
                          meta.status === 'suspensa' ? 'Suspensa' : 'Não iniciada'}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 h-5 rounded-full text-xs ${getColorByPrioridade(meta.prioridade)}`}>
                      {meta.prioridade}
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(meta.progresso, 100)}%` }}
                    />
                  </div>
                  
                  {meta.orcamento_previsto && (
                    <div className="text-sm">
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Orçamento:</span>
                        <div className="text-right">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {formatarMoeda(orcamentoAtual)} / {formatarMoeda(meta.orcamento_previsto)}
                          </div>
                          <div className="text-xs">
                            Restante: {formatarMoeda(orcamentoRestante)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Responsável e Datas */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <FiUser className="h-3 w-3" />
                    <span className="truncate max-w-[100px]">{meta.responsavel_principal}</span>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <FiCalendar className="h-3 w-3" />
                      <span>Até {formatarData(meta.data_fim)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico de Alocações */}
      {historicoAlocacoes.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h2 className={`${headingH2} mb-4`}>
            Histórico de Alocações
          </h2>
          <div className="space-y-3">
            {historicoAlocacoes.slice(0, 3).map((hist) => (
              <div
                key={hist.id}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {meses[hist.mes - 1]} {hist.ano}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatarData(hist.data_registro)}
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                  {hist.descricao}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {hist.alocacoes.length} meta(s)
                </div>
                <div className="mt-2 text-right font-medium text-green-600 dark:text-green-400">
                  {formatarMoeda(hist.total_alocado)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end min-[936px]:items-center justify-center p-0 min-[936px]:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-gray-800 rounded-none min-[936px]:rounded-lg w-full max-w-none min-[936px]:max-w-6xl h-screen min-[936px]:h-auto min-[936px]:max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 min-[936px]:p-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <FiTarget className="text-blue-600 dark:text-blue-400 text-xl" />
                  </div>
                  <div>
                    <h1 className={headingH1}>
                      Alocação de Recursos para Metas
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Distribua recursos entre as metas estratégicas da escola
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMobileMetasOpen(true)}
                    className="min-[936px]:hidden px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700"
                  >
                    Metas ({metasSelecionadas.length})
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            <div className="relative flex h-[calc(100vh-88px)] min-[936px]:h-[calc(90vh-80px)]">
              {/* Drawer Mobile de Metas */}
              <AnimatePresence>
                {mobileMetasOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/40 z-20 min-[936px]:hidden"
                      onClick={() => setMobileMetasOpen(false)}
                    />
                    <motion.aside
                      initial={{ x: '-100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '-100%' }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="absolute inset-y-0 left-0 z-30 min-[936px]:hidden w-[88%] max-w-[360px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-2xl p-4 overflow-y-auto"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h2 className={headingH2}>Metas</h2>
                        <button
                          onClick={() => setMobileMetasOpen(false)}
                          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <FiX className="h-5 w-5" />
                        </button>
                      </div>
                      {renderMetasSidebar()}
                    </motion.aside>
                  </>
                )}
              </AnimatePresence>

              {/* Lista de Metas Disponíveis */}
              <div className="hidden min-[936px]:block w-1/3 border-r border-gray-200 dark:border-gray-700 p-6 overflow-y-auto">
                {renderMetasSidebar()}
              </div>

              {/* Configuração da Alocação */}
              <div className="w-full min-[936px]:w-2/3 p-4 min-[936px]:p-6 overflow-y-auto">
                {/* Fundos Disponíveis */}
                <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg p-6 mb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={headingH2}>
                        Fundos Disponíveis para Alocação
                      </h2>
                      <p className="text-gray-600 dark:text-gray-300">
                        {meses[mesSelecionado - 1]} de {anoSelecionado}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {formatarMoeda(fundosDisponiveis)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Total disponível
                      </div>
                    </div>
                  </div>
                </div>

                {/* Período e Descrição */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mês da Alocação
                    </label>
                    <select
                      value={mesSelecionado}
                      onChange={(e) => setMesSelecionado(parseInt(e.target.value))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {meses.map((mes, index) => (
                        <option key={index} value={index + 1}>
                          {mes}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Ano
                    </label>
                    <input
                      type="number"
                      value={anoSelecionado}
                      onChange={(e) => setAnoSelecionado(parseInt(e.target.value))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Descrição da Alocação */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descrição da Alocação
                  </label>
                  <textarea
                    value={descricaoAlocacao}
                    onChange={(e) => setDescricaoAlocacao(e.target.value)}
                    placeholder="Descreva o propósito desta alocação de recursos..."
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Ferramentas de Distribuição */}
                <div className="mb-8">
                  <h2 className={`${headingH2} mb-4`}>
                    Ferramentas de Distribuição
                  </h2>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                          Valor Total a Distribuir
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max={fundosDisponiveis}
                            value={valorDistribuir}
                            onChange={(e) => setValorDistribuir(parseFloat(e.target.value) || 0)}
                            className="w-full pl-12 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                            placeholder="0,00"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            AOA
                          </div>
                        </div>
                        {valorDistribuir > 0 && (
                          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {formatarMoeda(valorDistribuir)}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                          Modo
                        </label>
                        <select
                          value={modoDistribuicao}
                          onChange={(e) => setModoDistribuicao(e.target.value as 'valor' | 'percentual')}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                        >
                          <option value="valor">Valor (AOA)</option>
                          <option value="percentual">Percentual (%)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={distribuirIgualmente}
                        disabled={valorDistribuir <= 0 || metasSelecionadas.length === 0}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          valorDistribuir <= 0 || metasSelecionadas.length === 0
                            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        Distribuir Igualmente
                      </button>
                      <button
                        onClick={distribuirPorPrioridade}
                        disabled={valorDistribuir <= 0 || metasSelecionadas.length === 0}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          valorDistribuir <= 0 || metasSelecionadas.length === 0
                            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            : 'bg-orange-600 hover:bg-orange-700 text-white'
                        }`}
                      >
                        Por Prioridade
                      </button>
                      <button
                        onClick={distribuirPorNecessidade}
                        disabled={valorDistribuir <= 0 || metasSelecionadas.length === 0}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          valorDistribuir <= 0 || metasSelecionadas.length === 0
                            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        Por Necessidade
                      </button>
                      <button
                        onClick={() => setValorDistribuir(fundosDisponiveis)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                      >
                        Usar Todos
                      </button>
                    </div>
                  </div>
                </div>

                {/* Metas Selecionadas */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className={headingH2}>
                      Metas Selecionadas ({metasSelecionadas.length})
                    </h2>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {metasSelecionadas.length === 0 ? 'Nenhuma meta selecionada' : 'Clique no ✕ para remover'}
                    </div>
                  </div>

                  {metasSelecionadas.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                      <FiAlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-gray-600 dark:text-gray-300">
                        Selecione metas da lista ao lado para alocar recursos
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {metasSelecionadas.map((item) => {
                        const Icon = getIconByTipo(item.meta.tipo);
                        const orcamentoAtual = item.meta.progresso * (item.meta.orcamento_previsto || 0) / 100;
                        const orcamentoRestante = (item.meta.orcamento_previsto || 0) - orcamentoAtual;
                        const porcentagemCobertura = orcamentoRestante > 0 ? (item.valor / orcamentoRestante) * 100 : 0;
                        
                        return (
                          <div
                            key={item.meta_id}
                            className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                                  <Icon className="text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-start gap-5 justify-between">
                                    <div>
                                      <h3 className={headingH3}>
                                        {item.meta.titulo}
                                      </h3>
                                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                                        {item.meta.descricao}
                                      </p>
                                    </div>
                                    <div className="text-right mr-2">
                                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                        {formatarMoeda(item.valor)}
                                      </div>
                                      <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {(item.percentual??0).toFixed(1)}% dos fundos
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => removerMeta(item.meta_id)}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg ml-2"
                              >
                                <FiX className="h-5 w-5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                                  Valor (AOA)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max={Math.min(orcamentoRestante, fundosDisponiveis)}
                                  step="0.01"
                                  value={item.valor || ''}
                                  onChange={(e) => atualizarValor(item.meta_id, parseFloat(e.target.value) || 0)}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                                />
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Máx: {formatarMoeda(Math.min(orcamentoRestante, fundosDisponiveis))}
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                                  Tipo de Alocação
                                </label>
                                <select
                                  value={item.tipo_alocacao}
                                  onChange={(e) => atualizarTipoAlocacao(item.meta_id, e.target.value as any)}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                                >
                                  <option value="parcial">Parcial</option>
                                  <option value="complementar">Complementar</option>
                                  <option value="completo">Completa</option>
                                </select>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {item.tipo_alocacao === 'completo' ? 'Cobre 95%+' : 
                                   item.tipo_alocacao === 'complementar' ? 'Cobre até 50%' : 
                                   'Cobre 50-95%'}
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                                  % Restante Coberto
                                </label>
                                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                                  <div className="font-bold text-gray-900 dark:text-white">
                                    {porcentagemCobertura.toFixed(1)}%
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                                  da necessidade
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                                  Orçamento Restante
                                </label>
                                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                                  <div className="font-bold text-gray-900 dark:text-white">
                                    {formatarMoeda(orcamentoRestante)}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                                  total necessário
                                </div>
                              </div>
                            </div>

                            <div className="mb-3">
                              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                                Motivo da Alocação
                              </label>
                              <input
                                type="text"
                                value={item.motivo}
                                onChange={(e) => atualizarMotivo(item.meta_id, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                                placeholder="Descreva o motivo específico desta alocação..."
                              />
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-gray-600 dark:text-gray-400">Cobertura da necessidade:</span>
                                  <span className="font-medium text-gray-900 dark:text-white">{porcentagemCobertura.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                  <div 
                                    className="bg-green-600 h-2.5 rounded-full" 
                                    style={{ width: `${Math.min(porcentagemCobertura, 100)}%` }}
                                  />
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  item.tipo_alocacao === 'completo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                  item.tipo_alocacao === 'complementar' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                }`}>
                                  {item.tipo_alocacao === 'completo' ? 'Cobertura Completa' :
                                   item.tipo_alocacao === 'complementar' ? 'Complementar' : 'Parcial'}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Resumo da Alocação */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6 mb-8">
                  <h2 className={`${headingH2} mb-4`}>
                    Resumo da Alocação
                  </h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatarMoeda(fundosDisponiveis)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Fundos Disponíveis</div>
                    </div>
                    
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${
                        totalAlocado <= fundosDisponiveis
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatarMoeda(totalAlocado)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Alocado</div>
                    </div>
                    
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${
                        saldoRestante >= 0
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatarMoeda(saldoRestante)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Saldo Restante</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {metasSelecionadas.length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Metas</div>
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={salvarAlocacao}
                    disabled={totalAlocado === 0 || totalAlocado > fundosDisponiveis || !descricaoAlocacao.trim()}
                    className={`flex-1 px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                      totalAlocado === 0 || totalAlocado > fundosDisponiveis || !descricaoAlocacao.trim()
                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    <FiSave className="h-5 w-5" />
                    Salvar Alocação
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
