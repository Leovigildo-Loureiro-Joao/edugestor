import { useState, useEffect, ReactNode } from 'react';
import { 
  FiDollarSign, 
  FiTrendingUp, 
  FiTrendingDown, 
  FiUsers, 
  FiCreditCard, 
  FiCalendar, 
  FiArrowLeft, 
  FiArrowRight, 
  FiBarChart2, 
  FiPieChart,
  FiTag, 
  FiShare2, 
  FiTarget, 
  FiList, 
  FiAlertCircle
} from 'react-icons/fi';
import { transacaoService } from '../../services/database/transacaoService.ts';
import { alunosService } from '../../services/database/alunosService.ts';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomPieChart } from '../../components/finance/PieChartDespesa.tsx';
import GraficoBarrasDuplas from '../../components/finance/BarraDupla.jsx';
import GraficoBarrasLucro from '../../components/finance/BarraMensal.jsx';
import { AlocacaoRecursosModal } from '../../components/finance/AlocacaoRecursosModal.tsx';
import { Meta } from '../../types/eventos.ts';
import db from '../../services/database/db.ts';
import { AlocacaoRecurso, AlocacaoRecursoFormData } from '../../types/transacao.ts';
import { motion } from 'framer-motion';
import { getPendingCount } from '../../utils/emitPendingSync.ts';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID.ts';

// Interfaces/Types
interface TabOption {
  value: string;
  label: string;
  icon: ReactNode;
  descricao: string;
  cor: string;
}

interface TabsNavigationProps {
  value: string;
  onChange: (value: string) => void;
}

interface DadosMensais {
  mes: string;
  receita: number;
  despesa: number;
  lucro: number;
}

interface CategoriaDespesa {
  name: string;
  value: number;
  porcentagem: number;
}

interface GraficosData {
  mensal: DadosMensais[];
  categoriasDespesas: CategoriaDespesa[];
}

interface MetricasData {
  totalRecebido: number;
  totalDespesas: number;
  lucro: number;
  taxaPagamento: number;
  alunosPagaram: number;
  totalAlunos: number;
  saldoAtual: number;
}

interface DadosFinanceiros {
  metricas: MetricasData;
  graficos: GraficosData;
  pagamentos: any[];
  despesas: any[];
  alunos: any[];
}

interface MetricCardProps {
  titulo: string;
  valor: number;
  icone: ReactNode;
  cor: 'green' | 'red' | 'blue' | 'purple';
  formato: 'currency' | 'percent';
  subtitulo?: string;
}

interface Desconto {
  id: string;
  [key: string]: any;
}

interface DivisaoLucro {
  id: string;
  data_divisao: string;
  [key: string]: any;
}

// Componente Tabs_Navigation com tipagem
const Tabs_Navigation: React.FC<TabsNavigationProps> = ({ value, onChange }) => {
  const opcoes: TabOption[] = [
    { 
      value: 'VS', 
      label: 'Receitas vs Despesas', 
      icon: <FiBarChart2/>,
      descricao: 'Comparação mensal detalhada',
      cor: 'blue'
    },
    { 
      value: 'despesas', 
      label: 'Categorias de Despesas', 
      icon: <FiPieChart/>,
      descricao: 'Distribuição por categoria',
      cor: 'red'
    },
    { 
      value: 'lucro', 
      label: 'Evolução do Lucro', 
      icon: <FiTrendingUp/>,
      descricao: 'Performance mensal do lucro',
      cor: 'green'
    }
  ];

  const opcaoAtual = opcoes.find(op => op.value === value) || opcoes[0];

  return (
    <div className="mb-6 w-full">
      <div className="flex space-x-1 key={tab.id} bg-white dark:bg-gray-700 rounded-xl shadow-md p-1">
        {opcoes.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${
              opcaoAtual.value === tab.value
                ? 'bg-blue-500 text-white shadow-lg'
                : 'text-gray-600 dark:text-white dark:hover:text-gray-500 hover:bg-gray-100'
            }`}
          >
            {tab.icon}
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Componente principal
export const FinanceiroPage: React.FC = () => {
  const { seccao } = useParams<{ seccao?: string }>();
  const [anoSelecionado, setAnoSelecionado] = useState<number>(new Date().getFullYear());
  const [dadosFinanceiros, setDadosFinanceiros] = useState<DadosFinanceiros | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const secoesFinanceiro = ['VS', 'despesas', 'lucro'] as const;
  type SecaoFinanceiro = (typeof secoesFinanceiro)[number];
  const [select, setSelect] = useState<SecaoFinanceiro>('VS'); 
  const navigate = useNavigate();
  const [propinaPending,setPropinaPending]=useState<number>(0)
  const [transacaoPending,setTransacaoPending]=useState<number>(0)
  const [showDescontosModal, setShowDescontosModal] = useState<boolean>(false);
  const [showDivisaoLucrosModal, setShowDivisaoLucrosModal] = useState<boolean>(false);
  const [alocacao, setAlocacao] = useState<AlocacaoRecurso[]>([]);
  const [metas,setMetas]=useState<Meta[]>([])


  const handleAlocacao = async (divisao: {
     metas: AlocacaoRecurso[],
      totalAlocado:number,
      mes: string,
      ano: string,
      descricao: string
  }) => {
    // Salvar divisão no banco de dados
    for (const element of divisao.metas) {
       await transacaoService.createAlocacao(element)
    }
   
    const instituicaoId = instituicaoIdValue();
    setAlocacao(
      await db.alocacao
        .filter((a) => !a.deleted && (!instituicaoId || a.instituicao_id === instituicaoId))
        .toArray()
    );
    setShowDivisaoLucrosModal(false);
  };

  useEffect(() => {
    carregarDadosFinanceiros();
  }, [anoSelecionado]);

  useEffect(() => {
    const secaoParam = seccao as SecaoFinanceiro | undefined;
    if (secaoParam && secoesFinanceiro.includes(secaoParam)) {
      setSelect(secaoParam);
      return;
    }
    setSelect('VS');
  }, [seccao]);

  const handleSecaoChange = (tab: string) => {
    const selectedTab = tab as SecaoFinanceiro;
    if (!secoesFinanceiro.includes(selectedTab)) return;
    setSelect(selectedTab);
    navigate(`/financeiro/${selectedTab}`);
  };

  useEffect(() => {
    const handleDbChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail?.table) {
        carregarDadosFinanceiros();
        return;
      }

      if (['transacoes', 'propina', 'alunos', 'metas', 'alocacao'].includes(detail.table)) {
        carregarDadosFinanceiros();
      }
    };

    window.addEventListener('db-changed', handleDbChanged);
    return () => {
      window.removeEventListener('db-changed', handleDbChanged);
    };
  }, [anoSelecionado]);

  const carregarDadosFinanceiros = async (): Promise<void> => {
    try {
      setLoading(true);
      setPropinaPending(await getPendingCount("propina"))
      setTransacaoPending(await getPendingCount("transacoes"))
      const [pagamentos,alunos,despesas]=await Promise.all([
        await transacaoService.getPagamentosPorAno(anoSelecionado),
        await alunosService.getAllStudents(),
        await transacaoService.getDespesasPorAno(anoSelecionado)
      ])

      const totalRecebido = pagamentos.reduce((sum: number, p: any) => sum + p.valor, 0);
      const totalDespesas = despesas.reduce((sum: number, d: any) => sum + d.valor, 0);
      const lucro = totalRecebido - totalDespesas;
      
      
      const alunosPagaram = alunos.filter((a: any) => a.pagamento_em_dia).length;
      const taxaPagamento = alunos.length > 0 ? (alunosPagaram / alunos.length) * 100 : 0;

      const dadosMensais = calcularDadosMensais(pagamentos, despesas);
      const dadosCategoriasDespesas = calcularCategoriasDespesas(despesas);
      const transacoes=await transacaoService.getAllTransactions();
    const totalEntradas = transacoes
      .filter(t => t.tipo === 'entrada')
      .reduce((sum, t) => sum + t.valor, 0);
    
    const totalSaidas = transacoes
      .filter(t => t.tipo === 'saida')
      .reduce((sum, t) => sum + t.valor, 0);
    
    const saldo = totalEntradas - totalSaidas;
    
      setDadosFinanceiros({
        metricas: {
          totalRecebido,
          totalDespesas,
          lucro,
          taxaPagamento,
          alunosPagaram,
          totalAlunos: alunos.length,
          saldoAtual: saldo
        },
        graficos: {
          mensal: dadosMensais,
          categoriasDespesas: dadosCategoriasDespesas
        },
        pagamentos,
        despesas,
        alunos
      });
      const instituicaoId = instituicaoIdValue();
      setMetas(
        await db.metas
          .filter((a) => a.tipo === "infraestrutura" || a.tipo === 'financeira' || a.tipo === 'marketing')
          .and((a) => !a.deleted && a.progresso < 100 && (!instituicaoId || a.instituicao_id === instituicaoId))
          .toArray()
      )
    } catch (error) {
      console.error('❌ Erro ao carregar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularDadosMensais = (pagamentos: any[], despesas: any[]): DadosMensais[] => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    return meses.map((mes, index) => {
      const receitaMes = pagamentos
        .filter(p => new Date(p.data).getMonth() === index)
        .reduce((sum: number, p: any) => sum + p.valor, 0);
      
      const despesaMes = despesas
        .filter(d => new Date(d.data).getMonth() === index)
        .reduce((sum: number, d: any) => sum + d.valor, 0);

      return {
        mes,
        receita: receitaMes,
        despesa: despesaMes,
        lucro: receitaMes - despesaMes
      };
    });
  };

  const  getPending=async (table:string)=>{
    return await getPendingCount(table)
  }

  const calcularCategoriasDespesas = (despesas: any[]): CategoriaDespesa[] => {
    const categorias: Record<string, number> = {};
    
    despesas.forEach(despesa => {
      const categoria = despesa.categoria || 'outras';
      categorias[categoria] = (categorias[categoria] || 0) + despesa.valor;
    });

    const totalDespesas = despesas.reduce((sum: number, d: any) => sum + d.valor, 0);

    return Object.entries(categorias).map(([categoria, valor]) => ({
      name: categoria.charAt(0).toUpperCase() + categoria.slice(1),
      value: valor,
      porcentagem: totalDespesas > 0 ? (valor / totalDespesas) * 100 : 0
    }));
  };

  const navegarAno = (direcao: number): void => {
    setAnoSelecionado(prev => prev + direcao);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
             <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <FiDollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard Financeiro</h1>
                <p className="text-gray-600">Visão geral das finanças da escola</p>
              </div>
            </motion.div>
     

            {/* Seletor de Ano */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navegarAno(-1)}
                className="p-3 hover:bg-white rounded-lg border border-gray-200 transition-all"
              >
                <FiArrowLeft className="text-gray-600" />
              </button>
              
              <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-sm">
                <FiCalendar className="text-gray-400" />
                <span className="font-semibold text-gray-900 text-lg">{anoSelecionado}</span>
              </div>
              
              <button
                onClick={() => navegarAno(1)}
                className="p-3 hover:bg-white rounded-lg border border-gray-200 transition-all"
              >
                <FiArrowRight className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Navegação Rápida */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

            <button
              onClick={() => navigate('/financeiro/transacoes')}
              className="flex items-center justify-between gap-3 p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className='flex gap-3'>
                {
                  transacaoPending>0?<div className='bg-orange-100 gap-2   text-orange-400 px-4  w-18 flex items-center justify-center rounded-md'>
                <FiAlertCircle className='text-xl'/>
              </div>
              :<div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-all">

                <FiList className="text-blue-600 text-xl" />
              </div>
                }
                
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">Gestão de Transações</h3>
                <p className="text-sm text-gray-600">Investimentos e despesas</p>
               
              </div>
              </div>
              
            </button>

              {/* Novo Botão para Divisão de Lucros */}
              <button
                onClick={() => setShowDivisaoLucrosModal(true)}
                className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-purple-500 hover:shadow-md transition-all group"
              >
                <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-all">
                  <FiShare2 className="text-purple-600 text-xl" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Divisão de Lucros</h3>
                  <p className="text-sm text-gray-600">Distribuir lucro entre as metas e planos</p>
                </div>
              </button>
                
              <button
                onClick={() => navigate("/financeiro/pagamentos")}
                className="flex justify-between items-center gap-3 p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-green-500 hover:shadow-md transition-all group"
              >
              <div className='flex gap-3'>
                {
                  propinaPending>0?<div className='bg-orange-100 gap-2   text-orange-400 px-4  w-18 flex items-center justify-center rounded-md'>
                <FiAlertCircle className='text-xl'/>
              </div>
              :<div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-all">
                      <FiDollarSign className="text-green-600 text-xl" />
                    </div>
                }
                
              <div className="text-left">
                
                      <h3 className="font-semibold text-gray-900">Gestão de Propinas</h3>
                      <p className="text-sm text-gray-600">Gerir pagamentos de propinas</p>

                
              </div>
              </div>
                
                
              </button>
              
              <div className="hidden items-center gap-3 p-4 bg-white rounded-lg border-2 border-gray-200">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FiTrendingUp className="text-purple-600 text-xl" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Relatórios</h3>
                  <p className="text-sm text-gray-600">Relatórios detalhados</p>
                </div>
              </div>
            </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : dadosFinanceiros ? (
          <div className="space-y-6">
            

            <AlocacaoRecursosModal
              isOpen={showDivisaoLucrosModal}
              onClose={() => setShowDivisaoLucrosModal(false)}
              fundosDisponiveis={dadosFinanceiros?.metricas?.saldoAtual || 0}
              metas={metas}
              onAlocacaoSalva={handleAlocacao}
              historicoAlocacoes={[]}
            />
            
            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{delay:0.3}}
                >
                   <MetricCard
                    titulo="Total Recebido"
                    valor={dadosFinanceiros.metricas.totalRecebido}
                    icone={<FiTrendingUp className="text-green-600" />}
                    cor="green"
                    formato="currency"
                    subtitulo={`${dadosFinanceiros.metricas.totalRecebido<dadosFinanceiros.metricas.totalDespesas?"Elimine suas dividas":"Estavél"}`}
                  />
              </motion.div>


               <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{delay:0.2}}
                >
                    <MetricCard
                      titulo="Total Despesas"
                      valor={dadosFinanceiros.metricas.totalDespesas}
                      icone={<FiTrendingDown className="text-red-600" />}
                      cor="red"
                      formato="currency"
                      subtitulo={`${dadosFinanceiros.metricas.totalRecebido<dadosFinanceiros.metricas.totalDespesas?"Instavel evite gastos":"Estavél"}`}

                    />
              </motion.div>


               <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{delay:0.1}}
                >    
                  <MetricCard
                    titulo="Lucro Líquido"
                    valor={dadosFinanceiros.metricas.lucro}
                    icone={<FiDollarSign className={dadosFinanceiros.metricas.lucro >= 0 ? "text-blue-600" : "text-red-600"} />}
                    cor={dadosFinanceiros.metricas.lucro >= 0 ? "blue" : "red"}
                    formato="currency"
                    subtitulo={`${dadosFinanceiros.metricas.totalRecebido<dadosFinanceiros.metricas.totalDespesas?"Pessimo":"Estavél"}`}
                  />
              </motion.div>


               <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className='h-full'
                >
                   <MetricCard
                    titulo="Taxa de Pagamento"
                    valor={dadosFinanceiros.metricas.taxaPagamento}
                    icone={<FiUsers className="text-purple-600" />}
                    cor="purple"
                    formato="percent"
                    subtitulo={`${dadosFinanceiros.metricas.alunosPagaram}/${dadosFinanceiros.metricas.totalAlunos} alunos`}
                  />
              </motion.div>
            </div>

            {/* Seletor de Visualização */}
            <div className="flex justify-center">
              <Tabs_Navigation value={select} onChange={handleSecaoChange} />
            </div>

            {/* Gráficos */}
            <div className="flex flex-col gap-6">
              {select === "VS" ? (
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Receitas vs Despesas ({anoSelecionado})
                  </h3>
                  <GraficoBarrasDuplas dados={dadosFinanceiros.graficos.mensal} />
                </div>
              ) : select === "despesas" ? (
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Categorias de Despesas ({anoSelecionado})
                  </h3>
                  <CustomPieChart 
                    dados={dadosFinanceiros.graficos.categoriasDespesas} 
                    tipo="despesas" 
                  />
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Evolução do Lucro ({anoSelecionado})
                  </h3>
                  <GraficoBarrasLucro dados={dadosFinanceiros.graficos.mensal} />
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
            <FiDollarSign className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Nenhum dado financeiro encontrado
            </h3>
            <p className="text-gray-500">
              Não há dados financeiros para o ano de {anoSelecionado}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente Card de Métrica
const MetricCard: React.FC<MetricCardProps> = ({ 
  titulo, 
  valor, 
  icone, 
  cor, 
  formato, 
  subtitulo 
}) => {
  const formatarValor = (valor: number, formato: 'currency' | 'percent'): string => {
    if (formato === 'currency') {
      return new Intl.NumberFormat('pt-AO', { 
        style: 'currency', 
        currency: 'AOA' 
      }).format(valor);
    }
    if (formato === 'percent') {
      return `${valor.toFixed(1)}%`;
    }
    return valor.toString();
  };

  const cores: Record<string, string> = {
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200'
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${cores[cor]} shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{titulo}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatarValor(valor, formato)}
          </p>
          {subtitulo && (
            <p className="text-sm text-gray-500 mt-1">{subtitulo}</p>
          )}
        </div>
        <div className="p-3 bg-white rounded-full shadow-sm">
          {icone}
        </div>
      </div>
    </div>
  );
};
