// HorarioCellMenu.tsx
import React, { useState, useEffect, useRef } from 'react';
import { FiEdit, FiTrash, FiMoreVertical, FiClock } from 'react-icons/fi';
import { HorarioAula } from '../../types/turma';

interface HorarioCellMenuProps {
  hora: HorarioAula | undefined;
  onEditar: (horario: HorarioAula) => void;
  onExcluir: (horarioId: string) => Promise<void>;
  confirm: any;
  showAlert: any;
  setHorarioEditando: (horario: HorarioAula) => void;
  setIsHorarioModalOpen: (isOpen: boolean) => void;
}

const HorarioCellMenu: React.FC<HorarioCellMenuProps> = ({
  hora,
  onEditar,
  onExcluir,
  confirm,
  showAlert,
  setHorarioEditando,
  setIsHorarioModalOpen
}) => {
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickFora = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuAberto(false);
      }
    };

    if (menuAberto) {
      document.addEventListener('mousedown', handleClickFora);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickFora);
    };
  }, [menuAberto]);

  const abrirMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    setMenuAberto(!menuAberto);
  };

  const handleEditar = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (hora) {
      setHorarioEditando(hora);
      setIsHorarioModalOpen(true);
    }
    setMenuAberto(false);
  };

  const handleExcluir = async (event: React.MouseEvent) => {
    event.stopPropagation();
    setMenuAberto(false);
    
    if (!hora) return;
    
    await confirm({
      type: 'delete',
      title: 'Excluir Horário',
      message: `Tem certeza que deseja excluir o horário de ${hora.disciplina}?`,
      isDestructive: true,
      confirmText: 'Excluir',
      onConfirm: async () => {
        try {
          await onExcluir(hora.id);
          showAlert({
            type: 'success',
            title: 'Horário excluído!',
            message: 'Horário excluído com sucesso.',
            duration: 3000
          });
        } catch (error) {
          showAlert({
            type: 'error',
            title: 'Erro ao excluir',
            message: 'Não foi possível excluir o horário.',
            duration: 5000
          });
          console.error('Erro ao excluir horário:', error);
        }
      }
    });
  };

  if (!hora) {
    return (
      <div className="p-3 text-center text-gray-400 dark:text-gray-500 text-sm">
        -
      </div>
    );
  }

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
      <div className="flex items-start gap-3">
        <FiClock className="text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {hora.disciplina}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
            {hora.sala}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {hora.professor_responsavel}
          </p>
        </div>
        <div className="relative">
          <button
            onClick={abrirMenu}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            title="Ações"
          >
            <FiMoreVertical className="text-gray-500 dark:text-gray-400" size={18} />
          </button>

          {/* Menu Dropdown */}
          {menuAberto && (
            <div
              ref={menuRef}
              className="absolute right-0 top-full mt-1  bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 flex py-1 z-50"
            >
              <button
                onClick={handleEditar}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FiEdit className="text-blue-600 dark:text-blue-400" size={16} />
              </button>
              <button
                onClick={handleExcluir}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <FiTrash size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HorarioCellMenu;