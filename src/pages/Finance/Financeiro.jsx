import { useState, useEffect } from 'react';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiUsers, FiCreditCard, FiCalendar, FiArrowLeft, FiArrowRight, FiBarChart2, FiPieChart } from 'react-icons/fi';
import { transacaoService } from '../../services/database/transacaoService.ts';
import { alunosService } from '../../services/database/alunosService.ts';
import { useNavigate } from 'react-router-dom';
import { CustomPieChart } from '../../components/finance/PieChartDespesa.tsx';
import GraficoBarrasDuplas from '../../components/finance/BarraDupla.jsx';
import GraficoBarrasLucro from '../../components/finance/BarraMensal.jsx';


// Componente Selector Profissional
const SelectorVisualizacao = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const opcoes = [
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

  const opcaoAtual = opcoes.find(op => op.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-all shadow-sm w-full md:w-80"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className={`p-2 rounded-lg ${opcaoAtual.cor === 'blue' ? 'bg-blue-50' : opcaoAtual.cor === 'red' ? 'bg-red-50' : 'bg-green-50'}`}>
            {opcaoAtual.cor === 'blue' ? <FiBarChart2 className="text-blue-600" size={20} /> : 
             opcaoAtual.cor === 'red' ? <FiPieChart className="text-red-600" size={20} /> : 
             <FiTrendingUp className="text-green-600" size={20} />}
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-900">{opcaoAtual.label}</div>
            <div className="text-sm text-gray-500">{opcaoAtual.descricao}</div>
          </div>
        </div>
        <FiArrowRight 
          size={16} 
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          {opcoes.map((opcao) => (
            <button
              key={opcao.value}
              onClick={() => {
                onChange(opcao.value);
                setIsOpen(false);
              }}
              className={`flex items-center gap-3 w-full p-4 hover:bg-gray-50 transition-all ${
                value === opcao.value ? 'bg-blue-50 border-r-4 border-blue-500' : ''
              }`}
            >
              <div className={`p-2 rounded-lg ${opcao.cor === 'blue' ? 'bg-blue-50' : opcao.cor === 'red' ? 'bg-red-50' : 'bg-green-50'}`}>
                {opcao.cor === 'blue' ? <FiBarChart2 className="text-blue-600" size={20} /> : 
                 opcao.cor === 'red' ? <FiPieChart className="text-red-600" size={20} /> : 
                 <FiTrendingUp className="text-green-600" size={20} />}
              </div>
              <div className="text-left flex-1">
                <div className="font-semibold text-gray-900">{opcao.label}</div>
                <div className="text-sm text-gray-500">{opcao.descricao}</div>
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

export const FinanceiroPage = () => {
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [dadosFinanceiros, setDadosFinanceiros] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('dashboard');
  const [select, setSelect] = useState('VS'); 
  const nav = useNavigate();

  useEffect(() => {
    carregarDadosFinanceiros();
  }, [anoSelecionado]);

  const carregarDadosFinanceiros = async () => {
    try {
      setLoading(true);
      
      const pagamentos = await transacaoService.getPagamentosPorAno(anoSelecionado);
      const alunos = await alunosService.getAllStudents();
      const despesas = await transacaoService.getDespesasPorAno(anoSelecionado);

      const totalRecebido = pagamentos.reduce((sum, p) => sum + p.valor, 0);
      const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0);
      const lucro = totalRecebido - totalDespesas;
      
      const alunosPagaram = alunos.filter(a => a.pagamento_em_dia).length;
      const taxaPagamento = alunos.length > 0 ? (alunosPagaram / alunos.length) * 100 : 0;

      const dadosMensais = calcularDadosMensais(pagamentos, despesas);
      const dadosCategoriasDespesas = calcularCategoriasDespesas(despesas);

      setDadosFinanceiros({
        metricas: {
          totalRecebido,
          totalDespesas,
          lucro,
          taxaPagamento,
          alunosPagaram,
          totalAlunos: alunos.length,
          saldoAtual: totalRecebido - totalDespesas
        },
        graficos: {
          mensal: dadosMensais,
          categoriasDespesas: dadosCategoriasDespesas
        },
        pagamentos,
        despesas,
        alunos
      });

    } catch (error) {
      console.error('❌ Erro ao carregar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularDadosMensais = (pagamentos, despesas) => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    return meses.map((mes, index) => {
      const receitaMes = pagamentos
        .filter(p => new Date(p.data).getMonth() === index)
        .reduce((sum, p) => sum + p.valor, 0);
      
      const despesaMes = despesas
        .filter(d => new Date(d.data).getMonth() === index)
        .reduce((sum, d) => sum + d.valor, 0);

      return {
        mes,
        receita: receitaMes,
        despesa: despesaMes,
        lucro: receitaMes - despesaMes
      };
    });
  };

  const calcularCategoriasDespesas = (despesas) => {
    const categorias = {};
    
    despesas.forEach(despesa => {
      const categoria = despesa.categoria || 'outras';
      categorias[categoria] = (categorias[categoria] || 0) + despesa.valor;
    });

    const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0);

    return Object.entries(categorias).map(([categoria, valor]) => ({
      name: categoria.charAt(0).toUpperCase() + categoria.slice(1),
      value: valor,
      porcentagem: totalDespesas > 0 ? (valor / totalDespesas) * 100 : 0
    }));
  };

  const navegarAno = (direcao) => {
    setAnoSelecionado(prev => prev + direcao);
  };

  if (view === 'pagamentos') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <button 
            onClick={() => setView('dashboard')}
            className="flex items-center gap-2 mb-6 text-blue-600 hover:text-blue-800 font-medium"
          >
            <FiArrowLeft /> Voltar ao Dashboard
          </button>
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
            <FiCreditCard className="mx-auto h-16 w-16 text-blue-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamentos com Cartão</h2>
            <p className="text-gray-600 mb-6">Funcionalidade em desenvolvimento</p>
            <button 
              onClick={() => setView('dashboard')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <FiDollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard Financeiro</h1>
                <p className="text-gray-600">Visão geral das finanças da escola</p>
              </div>
            </div>

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
              onClick={() => setView('pagamentos')}
              className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-all">
                <FiCreditCard className="text-blue-600 text-xl" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">Pagamentos com Cartão</h3>
                <p className="text-sm text-gray-600">Processar pagamentos online</p>
              </div>
            </button>

            <button
              onClick={() => nav("/financeiro/pagamentos")}
              className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-green-500 hover:shadow-md transition-all group"
            >
              <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-all">
                <FiDollarSign className="text-green-600 text-xl" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">Gestão de Propinas</h3>
                <p className="text-sm text-gray-600">Gerir pagamentos de propinas</p>
              </div>
            </button>

            <div className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-gray-200">
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
            
            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                titulo="Total Recebido"
                valor={dadosFinanceiros.metricas.totalRecebido}
                icone={<FiTrendingUp className="text-green-600" />}
                cor="green"
                formato="currency"
              />
              
              <MetricCard
                titulo="Total Despesas"
                valor={dadosFinanceiros.metricas.totalDespesas}
                icone={<FiTrendingDown className="text-red-600" />}
                cor="red"
                formato="currency"
              />
              
              <MetricCard
                titulo="Lucro Líquido"
                valor={dadosFinanceiros.metricas.lucro}
                icone={<FiDollarSign className={dadosFinanceiros.metricas.lucro >= 0 ? "text-blue-600" : "text-red-600"} />}
                cor={dadosFinanceiros.metricas.lucro >= 0 ? "blue" : "red"}
                formato="currency"
              />
              
              <MetricCard
                titulo="Taxa de Pagamento"
                valor={dadosFinanceiros.metricas.taxaPagamento}
                icone={<FiUsers className="text-purple-600" />}
                cor="purple"
                formato="percent"
                subtitulo={`${dadosFinanceiros.metricas.alunosPagaram}/${dadosFinanceiros.metricas.totalAlunos} alunos`}
              />
            </div>

            {/* Seletor de Visualização */}
            <div className="flex justify-center">
              <SelectorVisualizacao value={select} onChange={setSelect} />
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
const MetricCard = ({ titulo, valor, icone, cor, formato, subtitulo }) => {
  const formatarValor = (valor, formato) => {
    if (formato === 'currency') {
      return new Intl.NumberFormat('pt-AO', { 
        style: 'currency', 
        currency: 'AOA' 
      }).format(valor);
    }
    if (formato === 'percent') {
      return `${valor.toFixed(1)}%`;
    }
    return valor;
  };

  const cores = {
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