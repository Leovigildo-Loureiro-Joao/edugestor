import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiDollarSign, FiTag, FiCalendar, FiFileText, 
  FiX, FiCheck, FiTrendingUp, FiTrendingDown,
  FiCreditCard, FiBriefcase, FiShoppingBag, FiTruck,
  FiCoffee, FiHome, FiBarChart2
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { TransacaoFormData, Transacao } from '../../types/transacao';
import { transacaoService } from '../../services/database/transacaoService';

interface TransacaoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: 'entrada' | 'saida';
  onSuccess?: (transacao: Transacao) => void;
  transacaoEditando?: Transacao | null;
}

export const TransacaoFormModal: React.FC<TransacaoFormModalProps> = ({
  isOpen,
  onClose,
  tipo,
  onSuccess,
  transacaoEditando
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TransacaoFormData>({
    data: new Date().toISOString().split('T')[0],
    tipo: tipo,
    valor: 0,
    descricao: '',
    categoria: tipo === 'entrada' ? 'investimento' : 'material'
  });

  // Categorias por tipo
  const categoriasEntrada = [
    { value: 'investimento', label: 'Investimento', icon: FiBarChart2, color: 'green' },
    { value: 'mensalidade', label: 'Mensalidade', icon: FiDollarSign, color: 'blue' },
    { value: 'matricula', label: 'Matrícula', icon: FiBriefcase, color: 'purple' },
    { value: 'cartão', label: 'Pagamento Cartão', icon: FiCreditCard, color: 'orange' }
  ];

  const categoriasSaida = [
    { value: 'material', label: 'Material Escolar', icon: FiShoppingBag, color: 'red' },
    { value: 'alimentacao', label: 'Alimentação', icon: FiCoffee, color: 'yellow' },
    { value: 'transporte', label: 'Transporte', icon: FiTruck, color: 'purple' },
    { value: 'utilidades', label: 'Utilidades', icon: FiHome, color: 'green' },
    { value: 'salario', label: 'Salários', icon: FiDollarSign, color: 'blue' }
  ];

  const categoriasDisponiveis = tipo === 'entrada' ? categoriasEntrada : categoriasSaida;

  useEffect(() => {
    if (transacaoEditando) {
      setFormData({
        data: transacaoEditando.data.split('T')[0],
        tipo: transacaoEditando.tipo,
        valor: transacaoEditando.valor,
        descricao: transacaoEditando.descricao,
        categoria: transacaoEditando.categoria
      });
    } else {
      setFormData({
        data: new Date().toISOString().split('T')[0],
        tipo: tipo,
        valor: 0,
        descricao: '',
        categoria: tipo === 'entrada' ? 'investimento' : 'material'
      });
    }
  }, [transacaoEditando, tipo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.valor <= 0) {
      toast.error('O valor deve ser maior que zero');
      return;
    }

    if (!formData.descricao.trim()) {
      toast.error('A descrição é obrigatória');
      return;
    }

    try {
      setLoading(true);
      
      if (transacaoEditando) {
        // Atualizar transação existente
        await transacaoService.updateTransacao(transacaoEditando.id, formData);
        toast.success('Transação atualizada com sucesso!');
      } else {
        // Criar nova transação
        const transacaoId = await transacaoService.createTransacao(formData);
        const novaTransacao = await transacaoService.getAllTransactions().then(transacoes => 
          transacoes.find(t => t.id === transacaoId)
        );
        
        if (novaTransacao && onSuccess) {
          onSuccess(novaTransacao);
        }
        
        toast.success(
          tipo === 'entrada' 
            ? 'Investimento registrado com sucesso!' 
            : 'Despesa registrada com sucesso!'
        );
      }
      
      onClose();
      setFormData({
        data: new Date().toISOString().split('T')[0],
        tipo: tipo,
        valor: 0,
        descricao: '',
        categoria: tipo === 'entrada' ? 'investimento' : 'material'
      });
      
    } catch (error: any) {
      console.error('Erro ao salvar transação:', error);
      toast.error(error.message || 'Erro ao salvar transação');
    } finally {
      setLoading(false);
    }
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA'
    }).format(valor);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-none sm:max-w-2xl h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`p-6 ${tipo === 'entrada' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-pink-600'}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 dark:bg-white/10 rounded-lg">
                    {tipo === 'entrada' ? (
                      <FiTrendingUp className="text-white text-xl" />
                    ) : (
                      <FiTrendingDown className="text-white text-xl" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {transacaoEditando 
                        ? 'Editar Transação' 
                        : tipo === 'entrada' 
                          ? 'Novo Investimento' 
                          : 'Nova Despesa'
                      }
                    </h3>
                    <p className="text-white/80 text-sm">
                      {tipo === 'entrada' 
                        ? 'Registre um novo investimento' 
                        : 'Registre uma nova despesa'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 dark:bg-white/5"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
              {/* Data */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FiCalendar className="inline mr-2" />
                  Data
                </label>
                <input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FiDollarSign className="inline mr-2" />
                  Valor
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.valor || ''}
                    onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-12 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0,00"
                    required
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    AOA
                  </div>
                </div>
                {formData.valor > 0 && (
                  <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                    {formatarValor(formData.valor)}
                  </div>
                )}
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  <FiTag className="inline mr-2" />
                  Categoria
                </label>
              <motion.div 
                  className="grid grid-cols-3 gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {categoriasDisponiveis.map((categoria, index) => {
                    const Icon = categoria.icon;
                    const isSelected = formData.categoria === categoria.value;
                    
                    return (
                      <motion.button
                        key={categoria.value}
                        type="button"
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1, 
                          y: 0,
                          borderColor: isSelected ? `var(--color-${categoria.color}-500)` : undefined,
                          backgroundColor: isSelected ? `var(--color-${categoria.color}-50)` : undefined
                        }}
                        transition={{ 
                          duration: 0.3,
                          delay: index * 0.05,
                          type: "spring",
                          stiffness: 200,
                          damping: 15
                        }}
                        whileHover={{ 
                          scale: 1.02,
                          y: -2,
                          transition: { duration: 0.2 }
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setFormData({ ...formData, categoria: categoria.value as any })}
                        className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center gap-2 ${
                          isSelected
                            ? `border-${categoria.color}-500 bg-${categoria.color}-50 dark:bg-${categoria.color}-900/30 shadow-sm shadow-${categoria.color}-500/20`
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                        style={{
                          '--color-red-500': '#ef4444',
                          '--color-red-50': '#fef2f2',
                          '--color-blue-500': '#3b82f6',
                          '--color-blue-50': '#eff6ff',
                          '--color-green-500': '#10b981',
                          '--color-green-50': '#ecfdf5',
                          '--color-yellow-500': '#f59e0b',
                          '--color-yellow-50': '#fffbeb',
                          '--color-purple-500': '#8b5cf6',
                          '--color-purple-50': '#f5f3ff',
                          '--color-orange-500': '#f97316',
                          '--color-orange-50': '#fff7ed',
                        } as React.CSSProperties}
                      >
                        <motion.div
                          animate={{ 
                            scale: isSelected ? 1.1 : 1,
                            rotate: isSelected ? [0, -10, 10, 0] : 0
                          }}
                          transition={{ 
                            duration: 0.4,
                            rotate: { 
                              repeat: isSelected ? 0 : 0,
                              duration: 0.5 
                            }
                          }}
                        >
                          <Icon className={`text-${categoria.color}-600 dark:text-${categoria.color}-400 text-xl`} />
                        </motion.div>
                        <motion.span 
                          className="text-sm font-medium text-gray-900 dark:text-white text-center"
                          animate={{ 
                            fontWeight: isSelected ? "600" : "500",
                            color: isSelected ? `var(--color-${categoria.color}-700)` : undefined
                          }}
                        >
                          {categoria.label}
                        </motion.span>
                        
                        {/* Indicador de seleção */}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                            className="absolute top-2 right-2 w-2 h-2 rounded-full"
                            style={{ backgroundColor: `var(--color-${categoria.color}-500)` }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </motion.div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FiFileText className="inline mr-2" />
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder={
                    tipo === 'entrada' 
                      ? 'Descreva o investimento...' 
                      : 'Descreva a despesa...'
                  }
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Ações */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-all"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    tipo === 'entrada'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FiCheck className="h-5 w-5" />
                      {transacaoEditando ? 'Atualizar' : 'Salvar'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};