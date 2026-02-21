// src/components/admin/AddUserModal.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FiX, 
  FiUserPlus, 
  FiMail, 
  FiUser, 
  FiShield,
  FiSave
} from 'react-icons/fi';
import { profileService } from '../../services/database/profileService';
import { toast } from 'react-hot-toast';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  adminId: string;
  instituicaoId: string;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  adminId,
  instituicaoId
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    nome: '',
    role: 'user' as 'manager' | 'teacher' | 'user',
    instituicao_id: instituicaoId
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminId) {
      toast.error('Admin não identificado');
      return;
    }

    if (!formData.email || !formData.nome) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      // Usar o service que você já tem
      const result = await profileService.addUserByAdmin({
        ...formData,
        instituicao_id: formData.instituicao_id
      }, adminId);

      if (result.success) {
        toast.success(result.message);
        
        // Resetar formulário
        setFormData({
          email: '',
          nome: '',
          role: 'user',
          instituicao_id: instituicaoId
        });
        
        // Chamar callback de sucesso
        onSuccess();
        
        // Fechar modal
        onClose();
      } else {
        toast.error('Erro ao adicionar usuário');
      }
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error(error.message || 'Erro ao adicionar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-none sm:max-w-lg h-[90vh] sm:h-auto sm:max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Cabeçalho */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FiUserPlus className="text-primary-600 dark:text-primary-400" />
                Adicionar Novo Usuário
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                O usuário receberá um convite por email
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiMail className="inline w-4 h-4 mr-2" />
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="usuario@escola.com"
                autoFocus
              />
            </div>

            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiUser className="inline w-4 h-4 mr-2" />
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Nome do usuário"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiShield className="inline w-4 h-4 mr-2" />
                Função *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="user">Usuário</option>
                <option value="teacher">Professor</option>
                <option value="manager">Gerente</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                * Apenas administradores podem adicionar usuários
              </p>
            </div>

            {/* Informação sobre sincronização */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
              <div className="flex items-start gap-2">
                <div className="mt-0.5">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">i</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Este usuário será adicionado localmente.</strong>
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Para enviar o convite por email, você precisará sincronizar manualmente quando tiver internet.
                  </p>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Adicionando...
                  </>
                ) : (
                  <>
                    <FiSave className="w-4 h-4" />
                    Adicionar Usuário
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};
