import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
  FiAlertCircle, 
  FiTrash2, 
  FiLogOut,
  FiSave,
  FiUserPlus,
  FiArchive
} from "react-icons/fi";

export type ConfirmActionType = 
  | 'delete' 
  | 'logout' 
  | 'save' 
  | 'archive' 
  | 'publish' 
  | 'invite'
  | 'warning'
  | 'custom';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmActionType;
  isDestructive?: boolean;
  isLoading?: boolean;
  customIcon?: React.ReactNode;
}

const ACTION_ICONS: Record<ConfirmActionType, React.ReactNode> = {
  warning: <FiAlertCircle className="text-3xl text-yellow-600 dark:text-yellow-400" />,
  delete: <FiTrash2 className="text-3xl text-red-600 dark:text-red-400" />,
  logout: <FiLogOut className="text-3xl text-orange-600 dark:text-orange-400" />,
  save: <FiSave className="text-3xl text-blue-600 dark:text-blue-400" />,
  archive: <FiArchive className="text-3xl text-purple-600 dark:text-purple-400" />,
  publish: <FiSave className="text-3xl text-green-600 dark:text-green-400" />,
  invite: <FiUserPlus className="text-3xl text-indigo-600 dark:text-indigo-400" />,
  custom: <FiAlertCircle className="text-3xl text-gray-600 dark:text-gray-400" />
};

const ACTION_TITLES: Record<ConfirmActionType, string> = {
  delete: 'Confirmar Exclusão',
  warning: 'Aviso Importante',
  logout: 'Confirmar Saída',
  save: 'Confirmar Salvamento',
  archive: 'Confirmar Arquivamento',
  publish: 'Confirmar Publicação',
  invite: 'Confirmar Convite',
  custom: 'Confirmar Ação'
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = 'Cancelar',
  type = 'custom',
  isDestructive = false,
  isLoading = false,
  customIcon
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  const getButtonColors = () => {
    if (isDestructive) {
      return {
        confirm: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        confirmText: 'text-white'
      };
    }
    return {
      confirm: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
      confirmText: 'text-white'
    };
  };

  const buttonColors = getButtonColors();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-none sm:max-w-md h-[90vh] sm:h-auto sm:max-h-[90vh] shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Cabeçalho */}
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0">
                  {customIcon || ACTION_ICONS[type]}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {title || ACTION_TITLES[type]}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Esta ação não pode ser desfeita
                  </p>
                </div>
              </div>

              {/* Mensagem */}
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300">
                  {message}
                </p>
                {isDestructive && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-300">
                       Esta é uma ação destrutiva. Os dados serão permanentemente removidos.
                    </p>
                  </div>
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className={`flex-1 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${buttonColors.confirm} ${buttonColors.confirmText} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Processando...
                    </>
                  ) : (
                    confirmText || 'Confirmar'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Hook para usar o modal facilmente
export const useConfirmModal = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    props: {} as Omit<ConfirmModalProps, 'isOpen' | 'onClose'>
  });

  const confirm = (props: Omit<ConfirmModalProps, 'isOpen' | 'onClose'>): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        props: {
          ...props,
          onConfirm: () => {
            props.onConfirm();
            resolve(true);
            setModalState({ isOpen: false, props: {} });
          },
          onClose: () => {
            resolve(false);
            setModalState({ isOpen: false, props: {} });
          }
        }
      });
    });
  };

  const ModalComponent = () => (
    <ConfirmModal
      isOpen={modalState.isOpen}
      onClose={() => {
        modalState.props.onClose?.();
        setModalState({ isOpen: false, props: {} });
      }}
      {...modalState.props}
    />
  );

  return { confirm, ModalComponent };
};