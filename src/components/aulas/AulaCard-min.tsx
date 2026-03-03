import { motion } from 'framer-motion';
import { 
  FiCalendar, 
  FiClock, 
  FiBook, 
  FiEdit2, 
  FiTrash2,
  FiCheckCircle,
  FiAlertCircle,
  FiTarget,
  FiUser,
  FiTrendingUp,
  FiEye
} from 'react-icons/fi';
import { FaChalkboardTeacher } from 'react-icons/fa';
import { Aula } from '../../types/aula';
import { aulaService } from '../../services/database';

export type AulaStatus = 'planeada' | 'ministrada' | 'cancelada' | 'adiada';

interface AulaCardTurmaProps {
  aula: Aula;
  onEditar: () => void;
  onDeletar: () => void;
  onActualizar:(status:AulaStatus)=>void;
  index: number;
  onExpandir: () => void;
  showExpandButton?: boolean; // Nova prop para controlar se mostra o botão de expandir
}

export const AulaCardTurma: React.FC<AulaCardTurmaProps> = ({ 
  aula, 
  onEditar, 
  onActualizar,
  onDeletar, 
  index, 
  onExpandir,
  showExpandButton = true 
}) => {
  // Remova o estado expanded
  
  const formatarData = (dataString: string): string => {
    const data = new Date(dataString);
    const hoje = new Date();
    
    if (data.toDateString() === hoje.toDateString()) {
      return 'Hoje';
    }
    
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    if (data.toDateString() === amanha.toDateString()) {
      return 'Amanhã';
    }
    
    return data.toLocaleDateString('pt-AO', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  };

  const formatarHora = (horaString?: string): string => {
    return horaString?.slice(0, 5) || '';
  };

  const calcularDuracao = (): string => {
    if (!aula.hora_inicio || !aula.hora_fim) return '';
    const inicio = new Date(`2000-01-01T${aula.hora_inicio}`);
    const fim = new Date(`2000-01-01T${aula.hora_fim}`);
    const minutos = (fim.getTime() - inicio.getTime()) / (1000 * 60);
    return `${Math.floor(minutos / 60)}h ${minutos % 60}min`;
  };

  const getStatusColor = (status: AulaStatus): string => {
    switch (status) {
      case 'planeada': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ministrada': return 'bg-green-50 text-green-700 border-green-200';
      case 'cancelada': return 'bg-red-50 text-red-700 border-red-200';
      case 'adiada': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: AulaStatus): React.ComponentType<React.SVGProps<SVGSVGElement>> => {
    switch (status) {
      case 'planeada': return FiCalendar;
      case 'ministrada': return FiCheckCircle;
      case 'cancelada': return FiAlertCircle;
      case 'adiada': return FiClock;
      default: return FiCalendar;
    }
  };

  const getStatusText = (status: AulaStatus): string => {
    switch (status) {
      case 'planeada': return 'Planeada';
      case 'ministrada': return 'Ministrada';
      case 'cancelada': return 'Cancelada';
      case 'adiada': return 'Adiada';
      default: return status;
    }
  };

  const StatusIcon = getStatusIcon(aula.status);


  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-300 hover:shadow-sm transition-all w-full duration-300 h-full"
    >
      {/* Header Compacto */}
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-start justify-between">
          {/* Lado Esquerdo - Informações Principais */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Ícone de Status */}
            <div className={`p-2 rounded-lg ${getStatusColor(aula.status)} border flex-shrink-0 mt-0.5`}>
              <StatusIcon className="h-4 w-4" />
            </div>
            
            {/* Conteúdo Principal */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                  {aula.disciplina || 'Sem disciplina'}
                </h4>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(aula.status)}`}>
                  {getStatusText(aula.status)}
                </span>
              </div>
              
              {/* Informações de Data/Horário */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <FiCalendar className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="font-medium">{formatarData(aula.data_aula)}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <FiClock className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    {formatarHora(aula.hora_inicio)} - {formatarHora(aula.hora_fim)}
                    {calcularDuracao() && (
                      <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">
                        ({calcularDuracao()})
                      </span>
                    )}
                  </span>
                </div>
              </div>
              
              {/* Professor */}
              {aula.turmas?.professor && (
                <div className="flex items-center gap-1 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <FaChalkboardTeacher className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{aula.turmas?.professor}</span>
                </div>
              )}
              
              {/* Tema da Aula (se existir) */}
              {aula.tema_aula && (
                <div className="mt-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <FiTarget className="h-3 w-3" />
                    <span>Tema</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                    {aula.tema_aula}
                  </p>
                </div>
              )}
              
              {/* Prévia de Conteúdo */}
              {aula.conteudo_ministrado && (
                <div className="mt-2">
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <FiBook className="h-3 w-3" />
                    <span>Conteúdo</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 italic">
                    {aula.conteudo_ministrado.substring(0, 50)}...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ações no rodapé */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {aula.created_at && (
              <>
                Criada: {new Date(aula.created_at).toLocaleDateString('pt-AO', {
                  day: '2-digit',
                  month: 'short'
                })}
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {showExpandButton && (
              <button
                onClick={onExpandir}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Ver detalhes"
              >
                <FiEye className="h-4 w-4" />
              </button>
            )}
            
            <button
              onClick={onEditar}
              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              title="Editar aula"
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
            
            <button
              onClick={onDeletar}
              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
              title="Excluir aula"
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Badge de ações rápidas */}
        {aula.status === 'planeada' && new Date(aula.data_aula)<=new Date()&&(
          <div className="mt-3 flex gap-5">
            <button
              onClick={()=>onActualizar("ministrada")}
              className="w-full text-center py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
            >
              Concluir Aula
            </button>
            <button
              onClick={()=>onActualizar("adiada")}
              className="w-full text-center py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
            >
              Adiar Aula
            </button>
          </div>
        )}
        {aula.status === 'ministrada' && (aula?.registro && aula?.registro.length == 0) && (
          <div className="mt-3 flex gap-5">
            <button
              onClick={()=>onActualizar("ministrada")}
              className="w-full text-center py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
            >
              Registrar Frequencia
            </button>
           
          </div>
        )}
      </div>
    </motion.div>
  );
};