import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiDollarSign, FiTrendingUp, FiTrendingDown, FiFilter, 
  FiCalendar, FiSearch, FiEdit2, FiTrash2, FiPlus,
  FiRefreshCw, FiDownload, FiPieChart, FiBarChart2,
  FiCreditCard, FiBriefcase, FiShoppingBag, FiTruck,
  FiCoffee, FiHome, FiBarChart,
  FiShield,
  FiCheckCircle,
  FiArrowLeft
} from 'react-icons/fi';
import { transacaoService } from '../../services/database/transacaoService';
import { Transacao } from '../../types/transacao';
import { toast } from 'react-hot-toast';
import { TransacaoFormModal } from '../../components/finance/TransacaoFormModal';
import { useNavigate } from 'react-router-dom';
import { tr } from 'date-fns/locale';

export const TransacoesPage = () => {
  const navigate = useNavigate();
  
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    tipo: 'todos' as 'todos' | 'entrada' | 'saida',
    categoria: 'todos',
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    busca: ''
  });

  const [showFormModal, setShowFormModal] = useState(false);
  const [tipoTransacao, setTipoTransacao] = useState<'entrada' | 'saida'>('entrada');
  const [transacaoEditando, setTransacaoEditando] = useState<Transacao | null>(null);
  const [mostrarFiltrosAvancados, setMostrarFiltrosAvancados] = useState(false);

  // Carregar transações
  const carregarTransacoes = async () => {
    try {
      setLoading(true);
      const todasTransacoes = await transacaoService.getAllTransactions();
      setTransacoes(todasTransacoes);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      toast.error('Erro ao carregar transações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarTransacoes();
  }, []);

  // Filtrar transações
  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter(transacao => {
      // Filtro por tipo
      if (filtros.tipo !== 'todos' && transacao.tipo !== filtros.tipo) {
        return false;
      }

      // Filtro por categoria
      if (filtros.categoria !== 'todos' && transacao.categoria !== filtros.categoria) {
        return false;
      }

      // Filtro por mês/ano
      const dataTransacao = new Date(transacao.data);
      if (dataTransacao.getMonth() + 1 !== filtros.mes || dataTransacao.getFullYear() !== filtros.ano) {
        return false;
      }

      // Filtro por busca
      if (filtros.busca && !transacao.descricao.toLowerCase().includes(filtros.busca.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [transacoes, filtros]);

  // Estatísticas
  const estatisticas = useMemo(() => {
    const saldoAtual = transacoes.reduce((sum, t) => {
      if (t.tipo === 'entrada') {
        return sum + t.valor;
      } else {
        return sum - t.valor;
      }
    }, 0);
    const transacoesMes = transacoesFiltradas;
    
    const totalEntradas = transacoesMes
      .filter(t => t.tipo === 'entrada')
      .reduce((sum, t) => sum + t.valor, 0);
    
    const totalSaidas = transacoesMes
      .filter(t => t.tipo === 'saida')
      .reduce((sum, t) => sum + t.valor, 0);
    
    const saldo = totalEntradas - totalSaidas;
    
    // Distribuição por categoria
    const categorias = transacoesMes.reduce((acc, t) => {
      acc[t.categoria] = (acc[t.categoria] || 0) + t.valor;
      return acc;
    }, {} as Record<string, number>);

    return {
      saldoAtual,
      totalEntradas,
      totalSaidas,
      saldo,
      categorias,
      totalTransacoes: transacoesMes.length
    };
  }, [transacoesFiltradas]);

  // Handler para deletar transação
  const handleDeletarTransacao = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta transação?')) {
      return;
    }

    try {
      await transacaoService.deleteTransacao(id);
      toast.success('Transação excluída com sucesso!');
      carregarTransacoes();
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      toast.error('Erro ao excluir transação');
    }
  };

  // Exportar para CSV
  const exportarCSV = () => {
    const headers = ['Data', 'Tipo', 'Categoria', 'Valor (AOA)', 'Descrição'];
    const rows = transacoesFiltradas.map(t => [
      new Date(t.data).toLocaleDateString('pt-AO'),
      t.tipo === 'entrada' ? 'Entrada' : 'Saída',
      t.categoria,
      t.valor.toFixed(2),
      t.descricao
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transacoes_${filtros.mes}_${filtros.ano}.csv`;
    link.click();
    
    toast.success('CSV exportado com sucesso!');
  };

  // Categorias disponíveis
  const categorias = [
    { value: 'todos', label: 'Todas Categorias' },
    { value: 'investimento', label: 'Investimento', icon: FiBarChart, cor: 'green' },
    { value: 'mensalidade', label: 'Mensalidade', icon: FiDollarSign, cor: 'blue' },
    { value: 'matricula', label: 'Matrícula', icon: FiBriefcase, cor: 'purple' },
    { value: 'cartão', label: 'Cartão', icon: FiCreditCard, cor: 'orange' },
    { value: 'material', label: 'Material', icon: FiShoppingBag, cor: 'red' },
    { value: 'alimentacao', label: 'Alimentação', icon: FiCoffee, cor: 'yellow' },
    { value: 'transporte', label: 'Transporte', icon: FiTruck, cor: 'indigo' },
    { value: 'utilidades', label: 'Utilidades', icon: FiHome, cor: 'gray' },
    { value: 'salario', label: 'Salários', icon: FiDollarSign, cor: 'pink' }
  ];

  // Meses do ano
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
       <button
          onClick={() => navigate("/financeiro")}
          className="flex items-center gap-2 mb-4 text-blue-600 hover:text-blue-800"
        >
          <FiArrowLeft /> Voltar ao Dashboard
        </button>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
            
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Gestão de Transações
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Gerencie investimentos e despesas da escola
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setTipoTransacao('entrada');
                  setTransacaoEditando(null);
                  setShowFormModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-medium shadow-sm"
              >
                <FiPlus className="h-5 w-5" />
                Novo Investimento
              </button>
              
              <button
                onClick={() => {
                  setTipoTransacao('saida');
                  setTransacaoEditando(null);
                  setShowFormModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium shadow-sm"
              >
                <FiPlus className="h-5 w-5" />
                Nova Despesa
              </button>
              
              <button
                onClick={carregarTransacoes}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium"
              >
                <FiRefreshCw className="h-5 w-5" />
                Atualizar
              </button>
            </div>
          </div>
        </motion.div>

        {/* Cards de Estatísticas */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {/* Card 1: Saldo Disponível (NOVO) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">Saldo Disponível</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {new Intl.NumberFormat('pt-AO', {
                    style: 'currency',
                    currency: 'AOA'
                  }).format(estatisticas.saldoAtual || 0)}
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                <FiDollarSign className="text-emerald-600 dark:text-emerald-400 text-2xl" />
              </div>
            </div>
           
          </motion.div>

          {/* Card 2: Saldo do Mês */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`p-6 rounded-2xl border ${
              estatisticas.saldo >= 0
                ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800'
                : 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  estatisticas.saldo >= 0 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-orange-600 dark:text-orange-400'
                }`}>
                  Saldo do Mês
                </p>
                <p className={`text-2xl font-bold mt-1 ${
                  estatisticas.saldo >= 0 
                    ? 'text-gray-900 dark:text-white' 
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {new Intl.NumberFormat('pt-AO', {
                    style: 'currency',
                    currency: 'AOA'
                  }).format(estatisticas.saldo)}
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                <FiBarChart2 className={`text-2xl ${
                  estatisticas.saldo >= 0 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-orange-600 dark:text-orange-400'
                }`} />
              </div>
            </div>
            <div className={`mt-2 text-sm ${
              estatisticas.saldo >= 0 
                ? 'text-blue-700 dark:text-blue-300' 
                : 'text-orange-700 dark:text-orange-300'
            }`}>
              {estatisticas.saldo >= 0 ? ' Positivo' : ' Negativo'} este mês
            </div>
          </motion.div>

          {/* Card 3: Total Investimentos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-2xl border border-green-200 dark:border-green-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 dark:text-green-400 text-sm font-medium">Total Investimentos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {new Intl.NumberFormat('pt-AO', {
                    style: 'currency',
                    currency: 'AOA'
                  }).format(estatisticas.totalEntradas)}
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                <FiTrendingUp className="text-green-600 dark:text-green-400 text-2xl" />
              </div>
            </div>
            <div className="mt-2 text-sm text-green-700 dark:text-green-300">
              {transacoesFiltradas.filter(t => t.tipo === 'entrada').length} transações
            </div>
          </motion.div>

          {/* Card 4: Total Despesas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-6 rounded-2xl border border-red-200 dark:border-red-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 dark:text-red-400 text-sm font-medium">Total Despesas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {new Intl.NumberFormat('pt-AO', {
                    style: 'currency',
                    currency: 'AOA'
                  }).format(estatisticas.totalSaidas)}
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                <FiTrendingDown className="text-red-600 dark:text-red-400 text-2xl" />
              </div>
            </div>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              {transacoesFiltradas.filter(t => t.tipo === 'saida').length} transações
            </div>
          </motion.div>
        </div>
     

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900 rounded-lg">
                <FiFilter className="text-blue-600 dark:text-blue-400 text-lg" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Filtros</h3>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  Filtre as transações conforme necessário
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setMostrarFiltrosAvancados(!mostrarFiltrosAvancados)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-2"
            >
              <FiFilter size={14} />
              {mostrarFiltrosAvancados ? 'Filtros Simples' : 'Filtros Avançados'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Tipo */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo
              </label>
              <select
                value={filtros.tipo}
                onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value as any })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="todos">Todos os Tipos</option>
                <option value="entrada">Investimentos</option>
                <option value="saida">Despesas</option>
              </select>
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Categoria
              </label>
              <select
                value={filtros.categoria}
                onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {categorias.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Mês */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <FiCalendar className="inline mr-2" />
                Mês
              </label>
              <select
                value={filtros.mes}
                onChange={(e) => setFiltros({ ...filtros, mes: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {meses.map((mes, index) => (
                  <option key={index} value={index + 1}>
                    {mes}
                  </option>
                ))}
              </select>
            </div>

            {/* Ano */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ano
              </label>
              <input
                type="number"
                value={filtros.ano}
                onChange={(e) => setFiltros({ ...filtros, ano: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Busca */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={filtros.busca}
              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filtros Avançados */}
          <AnimatePresence>
            {mostrarFiltrosAvancados && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Categorias Específicas
                </h4>
                <div className="flex flex-wrap gap-2">
                  {categorias.filter(c => c.value !== 'todos').map(categoria => {
                    const Icon = categoria.icon;
                    const isSelected = filtros.categoria === categoria.value;
                    
                    return (
                      <button
                        key={categoria.value}
                        onClick={() => setFiltros({ ...filtros, categoria: categoria.value })}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                          isSelected
                            ? `bg-${categoria.cor}-100 dark:bg-${categoria.cor}-900 text-${categoria.cor}-700 dark:text-${categoria.cor}-300 border border-${categoria.cor}-300`
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {Icon && <Icon className="h-4 w-4" />}
                        <span className="text-sm">{categoria.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Lista de Transações */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden"
        >
          {/* Header da Tabela */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Transações ({transacoesFiltradas.length})
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {meses[filtros.mes - 1]} de {filtros.ano}
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={exportarCSV}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                >
                  <FiDownload className="h-4 w-4" />
                  Exportar CSV
                </button>
                
                <button
                  onClick={() => navigate('/financeiro')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <FiBarChart2 className="h-4 w-4" />
                  Ver Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Tabela */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : transacoesFiltradas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transacoesFiltradas.map((transacao) => {
                    const data = new Date(transacao.data);
                    const categoria = categorias.find(c => c.value === transacao.categoria);
                    
                    return (
                      <motion.tr
                        key={transacao.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {data.toLocaleDateString('pt-AO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {data.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            transacao.tipo === 'entrada'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {transacao.tipo === 'entrada' ? (
                              <>
                                <FiTrendingUp className="h-3 w-3" />
                                Investimento
                              </>
                            ) : (
                              <>
                                <FiTrendingDown className="h-3 w-3" />
                                Despesa
                              </>
                            )}
                          </span>
                        </td>
                        
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {categoria?.icon && (
                              <categoria.icon className={`h-4 w-4 ${
                                transacao.tipo === 'entrada' 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-red-600 dark:text-red-400'
                              }`} />
                            )}
                            <span className="text-sm text-gray-900 dark:text-white">
                              {categoria?.label || transacao.categoria}
                            </span>
                          </div>
                        </td>
                        
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900 dark:text-white max-w-md truncate">
                            {transacao.descricao}
                          </div>
                        </td>
                        
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className={`text-sm font-semibold ${
                            transacao.tipo === 'entrada'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {transacao.tipo === 'entrada' ? '+' : '-'}
                            {new Intl.NumberFormat('pt-AO', {
                              style: 'currency',
                              currency: 'AOA'
                            }).format(transacao.valor)}
                          </div>
                        </td>
                        
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setTipoTransacao(transacao.tipo);
                                setTransacaoEditando(transacao);
                                setShowFormModal(true);
                              }}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => handleDeletarTransacao(transacao.id)}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FiDollarSign className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                Nenhuma transação encontrada
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
                {filtros.tipo !== 'todos' || filtros.categoria !== 'todos'
                  ? 'Tente ajustar os filtros para encontrar mais resultados'
                  : 'Comece registrando seu primeiro investimento ou despesa'
                }
              </p>
              <div className="mt-4 flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setTipoTransacao('entrada');
                    setShowFormModal(true);
                  }}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Novo Investimento
                </button>
                <button
                  onClick={() => {
                    setTipoTransacao('saida');
                    setShowFormModal(true);
                  }}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Nova Despesa
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Modal de Formulário */}
        <TransacaoFormModal
          isOpen={showFormModal}
          onClose={() => {
            setShowFormModal(false);
            setTransacaoEditando(null);
          }}
          tipo={tipoTransacao}
          onSuccess={(transacao) => {
            carregarTransacoes();
          }}
          transacaoEditando={transacaoEditando}
        />
      </div>
    </div>
  );
};