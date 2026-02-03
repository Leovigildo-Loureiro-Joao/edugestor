// components/estrategia/SubMetasManager.tsx
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiCheckSquare, FiCalendar, FiUsers, FiDollarSign, FiPlus, FiSave, FiEdit, FiTrash2 } from 'react-icons/fi';
import { Meta, SubMeta } from '../../types/eventos';
import { estrategiaService } from '../../services/database/estrategiaService';
import { toast } from 'react-hot-toast';
import { ModalSubmeta } from './SubMeta';
import { KPIManager } from './KPIManager';
import { generateUniqueId } from '../../utils/idGenarator';

interface SubMetasManagerProps {
  meta: Meta;
  onUpdate: () => void;
}

export const SubMetasManager: React.FC<SubMetasManagerProps> = ({ meta, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(false);
  const [novaSubMeta, setNovaSubMeta] = useState<SubMeta>({
    id:generateUniqueId(),
    titulo: '',
    descricao: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    responsavel: '',
    status:"pendente",
    custo_estimado: 0
  });

  const handleSaveSubMeta = async () => {
    try {
      if (editando) {
        await estrategiaService.updateSubMeta(meta.id, novaSubMeta);  
      }else
      await estrategiaService.addSubMeta(meta.id, novaSubMeta);
      setShowForm(false);
      setNovaSubMeta({
        id:generateUniqueId(),
        status:"em_andamento",
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

  const handleEditSubMeta = async (submeta:SubMeta) => {
    setEditando(true)
    setNovaSubMeta(submeta)
    setShowForm(true)
  };

   const handleDelete = async (submeta:SubMeta) => {
      await estrategiaService.removeSubMeta(meta.id, submeta);
      onUpdate();
      toast.success('Sub-meta removida com sucesso!');
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
              animate={{x:0,opacity:1}} className=" ">
      <div className="flex justify-between items-center pb-4">
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
                 <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() =>handleEditSubMeta(subMeta)}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Editar SubMeta"
                  >
                    <FiEdit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(subMeta)}
                    className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Excluir SubMeta"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
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

      {/* Formulário para nova sub-meta */}
       <AnimatePresence>
          {showForm && (
          <ModalSubmeta
            handleSaveSubMeta={handleSaveSubMeta}
            novaSubMeta={novaSubMeta}
            setNovaSubMeta={setNovaSubMeta}
            setShowSubMeta={setShowForm}
            kpis={meta.kpis}
            formData={novaSubMeta}
          />
        )}

       </AnimatePresence>
    </motion.div>
  );
};