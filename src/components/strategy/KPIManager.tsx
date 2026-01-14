// components/estrategia/KPIManager.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiBarChart2, FiTrendingUp, FiTrendingDown, FiSave, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Meta } from '../../types/eventos';
import { estrategiaService } from '../../services/database/estrategiaService';
import { toast } from 'react-hot-toast';

interface KPIManagerProps {
  meta: Meta;
  onUpdate: () => void;
}

export const KPIManager: React.FC<KPIManagerProps> = ({ meta, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [novoKPI, setNovoKPI] = useState({
    nome: '',
    unidade: '',
    valor_atual: 0,
    valor_meta: 0,
    frequencia: 'mensal' as const,
    peso: 10
  });

  const handleSaveKPI = async () => {
    try {
      await estrategiaService.addKPI(meta.id, {
        ...novoKPI,
        descricao: ''
      });
      setShowForm(false);
      setNovoKPI({ nome: '', unidade: '', valor_atual: 0, valor_meta: 0, frequencia: 'mensal', peso: 10 });
      onUpdate();
      toast.success('KPI adicionado com sucesso!');
    } catch (error) {
      toast.error('Erro ao adicionar KPI');
    }
  };

  const calcularProgresso = (valorAtual: number, valorMeta: number) => {
    return valorMeta > 0 ? Math.min((valorAtual / valorMeta) * 100, 100) : 0;
  };

  return (
    <motion.div
      initial={{x:-20,opacity:0}}
      animate={{x:0,opacity:1}} className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Indicadores de Desempenho (KPIs)
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <FiPlus className="h-4 w-4" />
          Novo KPI
        </button>
      </div>

      {/* Formulário para novo KPI */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6"
        >
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Adicionar Novo KPI</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Nome do Indicador
              </label>
              <input
                type="text"
                value={novoKPI.nome}
                onChange={(e) => setNovoKPI({...novoKPI, nome: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                placeholder="Ex: Taxa de Aprovação"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Unidade
              </label>
              <input
                type="text"
                value={novoKPI.unidade}
                onChange={(e) => setNovoKPI({...novoKPI, unidade: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                placeholder="Ex: %, alunos, horas"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Valor Meta
              </label>
              <input
                type="number"
                value={novoKPI.valor_meta}
                onChange={(e) => setNovoKPI({...novoKPI, valor_meta: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Peso (1-100)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={novoKPI.peso}
                onChange={(e) => setNovoKPI({...novoKPI, peso: parseInt(e.target.value) || 10})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveKPI}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <FiSave className="h-4 w-4" />
              Salvar
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      )}

      {/* Lista de KPIs */}
      <div className="space-y-4">
        {meta.kpis && meta.kpis.length > 0 ? (
          meta.kpis.map((kpi) => {
            const progresso = calcularProgresso(kpi.valor_atual, kpi.valor_meta);
            
            return (
              <div key={kpi.id} className="bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                      <FiBarChart2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">{kpi.nome}</h4>
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <span>Unidade: {kpi.unidade}</span>
                        <span>•</span>
                        <span>Frequência: {kpi.frequencia}</span>
                        <span>•</span>
                        <span>Peso: {kpi.peso || 10}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {kpi.valor_atual} / {kpi.valor_meta} {kpi.unidade}
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
                </div>
                
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                    <span>Progresso</span>
                    <span>{progresso.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        progresso >= 100 ? 'bg-green-600' :
                        progresso >= 70 ? 'bg-blue-600' :
                        progresso >= 40 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${Math.min(progresso, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
            <FiBarChart2 className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-300">
              Nenhum indicador definido para esta meta
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};