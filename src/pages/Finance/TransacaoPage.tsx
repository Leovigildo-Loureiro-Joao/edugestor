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
import { TransacaoFormModal } from '../../components/finance/TransacaoFormModal';
import { useNavigate } from 'react-router-dom';
import { tr } from 'date-fns/locale';
import { useAlert } from '../../components/ui/AlertBadge';
import { useConfirmModal } from '../../components/ui/ComfirmModal';
import { TransacoesTable } from '../../components/finance/TransacaoTable';
import { PageLoader } from '../../components/ui/PageLoader';
import { createThrottledCallback, shouldHandleDbChangedEvent } from '../../utils/dbChangedEvent';
import { SyncDataDetail } from '../../components/ui/SyncDataDetail';
import { getPendingCount } from '../../utils/emitPendingSync';
import { useSmartBack } from '../../hooks/useSmartBack';

export const TransacoesPage = () => {
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const { confirm, ModalComponent } = useConfirmModal();
  const { showAlert } = useAlert(); 
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
  const [transacaoSel,setTransacaoSel]=useState<Transacao|null>()
  const [comfirm, setComfirm] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [syncStats, setSyncStats] = useState(0);

  // Carregar transações
  const carregarTransacoes = async () => {
    try {
      setLoading(true);
      const todasTransacoes = await transacaoService.getAllTransactions();
      setTransacoes(todasTransacoes);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      showAlert({ type: 'error', title: 'Erro ao carregar transações' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarTransacoes();
  }, []);

  useEffect(() => {
        // Monitorar status online
        const handleOnline = () => setOnlineStatus(true);
        const handleOffline = () => setOnlineStatus(false);
        const throttledReload = createThrottledCallback(() => {
          carregarTransacoes();
        }, 2500);
        
        const handleDbChanged = (event: Event) => {
          if (shouldHandleDbChangedEvent(event, ['transacoes'])) {
            throttledReload();
          }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('db-changed', handleDbChanged);
  
  
        // Carregar estatísticas de sincronização
        const loadSyncStats = async () => {
          try {
            const pendentes = await getPendingCount("transacoes");
            setSyncStats(pendentes);
          } catch (error) {
            console.error('Erro ao carregar sync stats:', error);
          }
        };
        
        loadSyncStats();
        
        // Ouvir eventos de sincronização
        const handleSyncUpdate = () => {
          loadSyncStats();
        };
  
        const interval=setInterval(handleSyncUpdate,30000)    
        
        window.addEventListener('sync-pending', handleSyncUpdate);
        window.addEventListener('sync-complete', handleSyncUpdate);
        
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          window.removeEventListener('db-changed', handleDbChanged);
          window.removeEventListener('sync-pending', handleSyncUpdate);
          window.removeEventListener('sync-complete', handleSyncUpdate);
          throttledReload.cancel();
          clearInterval(interval)
        };
      }, []);
      
      
      const handleForceSync = async () => {
        try {
          await transacaoService.syncTransacoes();
          carregarTransacoes();
         
          showAlert({
            type: 'success',
            title: 'Sincronização concluída!',
            message: 'Os dados foram sincronizados com o servidor.',
            duration: 3000
          });
        
        } catch (error) {
          showAlert({
            type: 'error',
            title: 'Erro na sincronização',
            message: 'Não foi possível sincronizar com o servidor.',
            duration: 5000
          });
        };
      };
    

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
  const handleDeletarTransacao = async () => {
    if (!comfirm) {
      setComfirm(true)
    }else if(transacaoSel){
      setComfirm(false)
      try {
        await transacaoService.deleteTransacao(transacaoSel.id);
        showAlert({ type: 'success', title: 'Transação excluída com sucesso!' });
        carregarTransacoes();
      } catch (error) {
        console.error('Erro ao excluir transação:', error);
        showAlert({ type: 'error', title: 'Erro ao excluir transação' });
      }
      setTransacaoSel(null)
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
    
    showAlert({ type: 'success', title: 'CSV exportado com sucesso!' });
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
     
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="  p-6 px-0 mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-2">
             <motion.button
          whileHover={{ scale: 1.1, x: -3 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => goBack('/financeiro')}
          className="p-2.5 mb-4 max-w-min hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
          aria-label="Voltar"
        >
          <FiArrowLeft className="h-5 w-5" />
        </motion.button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                  Gestão de Transações
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
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

        {syncStats > 5 && (
          <SyncDataDetail
            syncStats={syncStats}
            onlineStatus={onlineStatus}
            handleForceSync={handleForceSync}
            table="transacoes"
            data={transacoes}
          />
        )}

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
      >
        {loading ? (
          <PageLoader
            title="Carregando transações"
            subtitle="Buscando movimentações financeiras..."
            fullScreen={false}
          />
        ) : (
          <>
            {/* Header com ações */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-4">
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

            {/* Componente da Tabela */}
            <TransacoesTable
              transacoes={transacoesFiltradas}
              onEditar={(transacao) => {
                setTipoTransacao(transacao.tipo);
                setTransacaoEditando(transacao);
                setShowFormModal(true);
              }}
              onExcluir={(transacao) => {
                setTransacaoSel(transacao);
                handleDeletarTransacao()
              }}
              mes={filtros.mes}
              ano={filtros.ano}
            />
          </>
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
