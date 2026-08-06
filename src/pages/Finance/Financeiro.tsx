import { ReactNode, useState, useEffect } from 'react';
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
import { transacaoService } from '../../services/database/transacaoService';
import { alunosService } from '../../services/database/alunosService';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomPieChart } from '../../components/finance/PieChartDespesa';
import GraficoBarrasDuplas from '../../components/finance/BarraDupla.jsx';
import GraficoBarrasLucro from '../../components/finance/BarraMensal.jsx';
import { AlocacaoRecursosModal } from '../../components/finance/AlocacaoRecursosModal';
import { Meta } from '../../types/eventos';
import db from '../../services/database/db';
import { AlocacaoRecurso, AlocacaoRecursoFormData } from '../../types/transacao';
import { motion } from 'framer-motion';
import { getPendingCount } from '../../utils/emitPendingSync';
import { instituicaoIdValue } from '../../utils/getInstituicaoID';
import { PageLoader } from '../../components/ui/PageLoader';
import { IconType } from 'react-icons';
import { createThrottledCallback, shouldHandleDbChangedEvent } from '../../utils/dbChangedEvent';

const secoesFinanceiro = ['VS', 'despesas', 'lucro'] as const;
type SecaoFinanceiro = (typeof secoesFinanceiro)[number];

// Interfaces/Types
interface TabOption {
  value: SecaoFinanceiro;
  label: string;
  icon: IconType;
  descricao: string;
  cor: 'blue' | 'red' | 'green';
}

interface TabsNavigationProps {
  value: SecaoFinanceiro;
  onChange: (value: SecaoFinanceiro) => void;
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

const SelectorVisualizacao: React.FC<TabsNavigationProps>  = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const opcoes: TabOption[] = [
    { 
      value: 'VS', 
      label: 'Receitas vs Despesas', 
      icon: FiBarChart2,
      descricao: 'Comparação mensal detalhada',
      cor: 'blue'
    },
    { 
      value: 'despesas', 
      label: 'Categorias de Despesas', 
      icon: FiPieChart,
      descricao: 'Distribuição por categoria',
      cor: 'red'
    },
    { 
      value: 'lucro', 
      label: 'Evolução do Lucro', 
      icon: FiTrendingUp,
      descricao: 'Performance mensal do lucro',
      cor: 'green'
    }
  ];

  const opcaoAtual = opcoes.find(op => op.value === value) || opcoes[0];

  return (
    <div className="relative w-full md:w-auto">
      <button

        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-600 transition-all shadow-sm w-full md:w-80"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className={`p-2 rounded-lg ${opcaoAtual.cor === 'blue' ? 'bg-blue-50' : opcaoAtual.cor === 'red' ? 'bg-red-50' : 'bg-green-50'}`}>
            {opcaoAtual.cor === 'blue' ? <FiBarChart2 className="text-blue-600" size={20} /> : 
             opcaoAtual.cor === 'red' ? <FiPieChart className="text-red-600" size={20} /> : 
             <FiTrendingUp className="text-green-600" size={20} />}
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-900 dark:text-white">{opcaoAtual.label}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{opcaoAtual.descricao}</div>
          </div>
        </div>
        <FiArrowRight 
          size={16} 
          className={`text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
          {opcoes.map((opcao) => (
            <button
              key={opcao.value}
              onClick={() => {
                onChange(opcao.value);
                setIsOpen(false);
              }}
              className={`flex items-center gap-3 w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-all ${
                value === opcao.value ? 'bg-blue-50 dark:bg-blue-900/30 border-r-4 border-blue-500' : ''
              }`}
            >
              <div className={`p-2 rounded-lg ${opcao.cor === 'blue' ? 'bg-blue-50' : opcao.cor === 'red' ? 'bg-red-50' : 'bg-green-50'}`}>
                {opcao.cor === 'blue' ? <FiBarChart2 className="text-blue-600" size={20} /> : 
                 opcao.cor === 'red' ? <FiPieChart className="text-red-600" size={20} /> : 
                 <FiTrendingUp className="text-green-600" size={20} />}
              </div>
              <div className="text-left flex-1">
                <div className="font-semibold text-gray-900 dark:text-white">{opcao.label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{opcao.descricao}</div>
              </div>
              {value === opcao.value && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};


// Componente Tabs_Navigation com tipagem
const Tabs_Navigation: React.FC<TabsNavigationProps> = ({ value, onChange }) => {
  const opcoes: TabOption[] = [
    { 
      value: 'VS', 
      label: 'Receitas vs Despesas', 
      icon: FiBarChart2,
      descricao: 'Comparação mensal detalhada',
      cor: 'blue'
    },
    { 
      value: 'despesas', 
      label: 'Categorias de Despesas', 
      icon: FiPieChart,
      descricao: 'Distribuição por categoria',
      cor: 'red'
    },
    { 
      value: 'lucro', 
      label: 'Evolução do Lucro', 
      icon: FiTrendingUp,
      descricao: 'Performance mensal do lucro',
      cor: 'green'
    }
  ];

  const opcaoAtual = opcoes.find(op => op.value === value) || opcoes[0];

  return (
    <div className="mb-6 w-full">
      <div className="flex space-x-1 key={tab.id} bg-white dark:bg-gray-800 rounded-xl shadow-md p-1 border border-gray-200 dark:border-gray-700">
        {opcoes.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-lg transition-all duration-200 ${
              opcaoAtual.value === tab.value
                ? 'bg-blue-500 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-200 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline font-medium">{tab.label}</span>
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
  const [select, setSelect] = useState<SecaoFinanceiro>('VS'); 
  const navigate = useNavigate();
  const [propinaPending,setPropinaPending]=useState<number>(0)
  const [transacaoPending,setTransacaoPending]=useState<number>(0)
  const [showDescontosModal, setShowDescontosModal] = useState<boolean>(false);
  const [showDivisaoLucrosModal, setShowDivisaoLucrosModal] = useState<boolean>(false);
  const [alocacao, setAlocacao] = useState<AlocacaoRecurso[]>([]);
  const [metas,setMetas]=useState<Meta[]>([])
  const [isMobile, setIsMobile] = useState(false);
    
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);


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
    const throttledReload = createThrottledCallback(() => {
      carregarDadosFinanceiros();
    }, 2500);

    const handleDbChanged = (event: Event) => {
      if (shouldHandleDbChangedEvent(event, ['transacoes', 'propina', 'alunos', 'metas', 'alocacao'])) {
        throttledReload();
      }
    };

    window.addEventListener('db-changed', handleDbChanged);
    return () => {
      window.removeEventListener('db-changed', handleDbChanged);
      throttledReload.cancel();
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
    <div className="min-h-screen p-4 sm:p-6 bg-gray-50 dark:bg-gray-900">
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
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">Dashboard Financeiro</h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Visão geral das finanças da escola</p>
              </div>
            </motion.div>
     

            {/* Seletor de Ano */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navegarAno(-1)}
                className="p-3 hover:bg-white dark:hover:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-all"
              >
                <FiArrowLeft className="text-gray-600 dark:text-gray-300" />
              </button>
              
              <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <FiCalendar className="text-gray-400 dark:text-gray-500" />
                <span className="font-semibold text-gray-900 dark:text-white text-lg">{anoSelecionado}</span>
              </div>
              
              <button
                onClick={() => navegarAno(1)}
                className="p-3 hover:bg-white dark:hover:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-all"
              >
                <FiArrowRight className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>

          {/* Navegação Rápida */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

            <button
              onClick={() => navigate('/financeiro/transacoes')}
              className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className='flex gap-3'>
                {
                  transacaoPending>0?<div className='bg-orange-100 dark:bg-orange-900/40 gap-2 text-orange-400 dark:text-orange-300 px-4 w-18 flex items-center justify-center rounded-md'>
                <FiAlertCircle className='text-xl'/>
              </div>
              :<div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-all">

                <FiList className="text-blue-600 text-xl" />
              </div>
                }
                
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white">Gestão de Transações</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Investimentos e despesas</p>
               
              </div>
              </div>
              
            </button>

              {/* Novo Botão para Divisão de Lucros */}
              <button
                onClick={() => setShowDivisaoLucrosModal(true)}
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-md transition-all group"
              >
                <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-all">
                  <FiShare2 className="text-purple-600 text-xl" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Divisão de Lucros</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Distribuir lucro entre as metas e planos</p>
                </div>
              </button>
                
              <button
                onClick={() => navigate("/financeiro/pagamentos")}
                className="flex justify-between items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 hover:shadow-md transition-all group"
              >
              <div className='flex gap-3'>
                {
                  propinaPending>0?<div className='bg-orange-100 dark:bg-orange-900/40 gap-2 text-orange-400 dark:text-orange-300 px-4 w-18 flex items-center justify-center rounded-md'>
                <FiAlertCircle className='text-xl'/>
              </div>
              :<div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-all">
                      <FiDollarSign className="text-green-600 text-xl" />
                    </div>
                }
                
              <div className="text-left">
                
                      <h3 className="font-semibold text-gray-900 dark:text-white">Gestão de Propinas</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Gerir pagamentos de propinas</p>

                
              </div>
              </div>
                
                
              </button>
              
              <div className="hidden items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FiTrendingUp className="text-purple-600 text-xl" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Relatórios</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Relatórios detalhados</p>
                </div>
              </div>
            </div>
        </div>

        {loading ? (
          <PageLoader
            title="Carregando financeiro"
            subtitle="Consolidando receitas, despesas e saldo..."
            fullScreen={false}
          />
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
               {isMobile ? (
                <SelectorVisualizacao value={select} onChange={setSelect} />
               ) : (
                <Tabs_Navigation value={select} onChange={handleSecaoChange} />
               )}
            </div>

            {/* Gráficos */}
            <div className="flex flex-col gap-6">
              {select === "VS" ? (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Receitas vs Despesas ({anoSelecionado})
                  </h3>
                  <GraficoBarrasDuplas dados={dadosFinanceiros.graficos.mensal} />
                </div>
              ) : select === "despesas" ? (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Categorias de Despesas ({anoSelecionado})
                  </h3>
                  <CustomPieChart 
                    dados={dadosFinanceiros.graficos.categoriasDespesas} 
                    tipo="despesas" 
                  />
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Evolução do Lucro ({anoSelecionado})
                  </h3>
                  <GraficoBarrasLucro dados={dadosFinanceiros.graficos.mensal} />
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <FiDollarSign className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              Nenhum dado financeiro encontrado
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
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
    green: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/60',
    red: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/60',
    blue: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/60',
    purple: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800/60'
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${cores[cor]} shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{titulo}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {formatarValor(valor, formato)}
          </p>
          {subtitulo && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitulo}</p>
          )}
        </div>
        <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm">
          {icone}
        </div>
      </div>
    </div>
  );
};
