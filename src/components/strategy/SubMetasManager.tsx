// components/estrategia/SubMetasManager.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCheckSquare, FiCalendar, FiUsers, FiDollarSign, FiPlus, FiSave } from 'react-icons/fi';
import { Meta } from '../../types/eventos';
import { estrategiaService } from '../../services/database/estrategiaService';
import { toast } from 'react-hot-toast';

interface SubMetasManagerProps {
  meta: Meta;
  onUpdate: () => void;
}

export const SubMetasManager: React.FC<SubMetasManagerProps> = ({ meta, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [novaSubMeta, setNovaSubMeta] = useState({
    titulo: '',
    descricao: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    responsavel: '',
    custo_estimado: 0
  });

  const handleSaveSubMeta = async () => {
    try {
      await estrategiaService.addSubMeta(meta.id, novaSubMeta);
      setShowForm(false);
      setNovaSubMeta({
        titulo: '',
        descricao: '',
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        responsavel: '',
        custo_estimado: 0
      });
      onUpdate();
      toast.success('Sub-meta adicionada com sucesso!');
    } catch (error) {
      toast.error('Erro ao adicionar sub-meta');
    }
  };

  const handleUpdateStatus = async (subMetaId: string, status: any) => {
    try {
      await estrategiaService.updateSubMetaStatus(meta.id, subMetaId, status);
      onUpdate();
      toast.success('Status atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  return (
     <motion.div
              initial={{x:-20,opacity:0}}
              animate={{x:0,opacity:1}} className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Sub-metas / Ações
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <FiPlus className="h-4 w-4" />
          Nova Sub-meta
        </button>
      </div>

      {/* Formulário para nova sub-meta */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6"
        >
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Nova Sub-meta</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Título
              </label>
              <input
                type="text"
                value={novaSubMeta.titulo}
                onChange={(e) => setNovaSubMeta({...novaSubMeta, titulo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                placeholder="Ex: Contratar novo professor"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Responsável
              </label>
              <input
                type="text"
                value={novaSubMeta.responsavel}
                onChange={(e) => setNovaSubMeta({...novaSubMeta, responsavel: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                placeholder="Nome do responsável"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Data Início
              </label>
              <input
                type="date"
                value={novaSubMeta.data_inicio}
                onChange={(e) => setNovaSubMeta({...novaSubMeta, data_inicio: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Data Fim
              </label>
              <input
                type="date"
                value={novaSubMeta.data_fim}
                onChange={(e) => setNovaSubMeta({...novaSubMeta, data_fim: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Descrição
              </label>
              <textarea
                value={novaSubMeta.descricao}
                onChange={(e) => setNovaSubMeta({...novaSubMeta, descricao: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                placeholder="Descreva a sub-meta em detalhes..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Custo Estimado (AOA)
              </label>
              <input
                type="number"
                value={novaSubMeta.custo_estimado}
                onChange={(e) => setNovaSubMeta({...novaSubMeta, custo_estimado: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveSubMeta}
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

      {/* Lista de Sub-metas */}
      <div className="space-y-4">
        {meta.submetas && meta.submetas.length > 0 ? (
          meta.submetas.map((subMeta) => {
            const isAtrasada = new Date(subMeta.data_fim) < new Date() && subMeta.status !== 'concluida';
            
            return (
              <div
                key={subMeta.id}
                className={`bg-white dark:bg-gray-700/50 border rounded-lg p-4 ${
                  isAtrasada 
                    ? 'border-red-300 dark:border-red-700' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      subMeta.status === 'concluida' ? 'bg-green-100 dark:bg-green-800' :
                      subMeta.status === 'em_andamento' ? 'bg-blue-100 dark:bg-blue-800' :
                      subMeta.status === 'atrasada' ? 'bg-red-100 dark:bg-red-800' :
                      'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <FiCheckSquare className={`h-5 w-5 ${
                        subMeta.status === 'concluida' ? 'text-green-600 dark:text-green-400' :
                        subMeta.status === 'em_andamento' ? 'text-blue-600 dark:text-blue-400' :
                        subMeta.status === 'atrasada' ? 'text-red-600 dark:text-red-400' :
                        'text-gray-600 dark:text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">
                        {subMeta.titulo}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                        {subMeta.descricao}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-2">
                        <span className="flex items-center gap-1">
                          <FiCalendar className="h-3 w-3" />
                          {new Date(subMeta.data_fim).toLocaleDateString('pt-AO')}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <FiUsers className="h-3 w-3" />
                          {subMeta.responsavel}
                        </span>
                        {subMeta.custo_estimado && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <FiDollarSign className="h-3 w-3" />
                              {new Intl.NumberFormat('pt-AO', {
                                style: 'currency',
                                currency: 'AOA'
                              }).format(subMeta.custo_estimado)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        subMeta.status === 'concluida' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                        subMeta.status === 'em_andamento' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                        subMeta.status === 'atrasada' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                      }`}>
                        {subMeta.status === 'concluida' ? 'Concluída' :
                         subMeta.status === 'em_andamento' ? 'Em Andamento' :
                         subMeta.status === 'atrasada' ? 'Atrasada' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {['pendente', 'em_andamento', 'concluida', 'atrasada'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(subMeta.id, status)}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        subMeta.status === status
                          ? status === 'concluida' ? 'bg-green-600 text-white' :
                            status === 'em_andamento' ? 'bg-blue-600 text-white' :
                            status === 'atrasada' ? 'bg-red-600 text-white' :
                            'bg-gray-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {status === 'concluida' ? 'Concluir' :
                       status === 'em_andamento' ? 'Iniciar' :
                       status === 'atrasada' ? 'Atrasar' : 'Pendente'}
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
            <FiCheckSquare className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-300">
              Nenhuma sub-meta definida para esta meta
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};