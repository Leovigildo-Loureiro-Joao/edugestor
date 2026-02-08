import { motion } from "framer-motion";
import { useState } from "react";
import { 
  FiBookOpen, 
  FiCheckCircle, 
  FiChevronRight, 
  FiDollarSign, 
  FiPlus, 
  FiSettings, 
  FiTarget, 
  FiTrendingUp,
  FiBarChart2,
  FiCalendar,
  FiUsers,
  FiClock,
  FiAlertCircle
} from "react-icons/fi";
import { Meta } from "../../types/eventos";
import { useNavigate } from "react-router-dom";
import { useConfirmModal } from "../ui/ComfirmModal";
import { estrategiaService } from "../../services/database/estrategiaService";
import toast from "react-hot-toast";
import { useAlert } from "../ui/AlertBadge";
import PlanejamentoTrimestral from "./PlaneamentoTrimestral";
import { PlanejamentoDiario } from "./PlaneamentoDiario";
import { PlanejamentoAnual } from "./PlaneamentoAnual";
import PlanejamentoMensal from "./PlaneamentoMensal";
import { PlanejamentoSemanal } from "./PlaneamentoSemanal";
import { RxTable, RxTarget } from "react-icons/rx";
import { FaPaperPlane, FaToiletPaper, FaTradeFederation } from "react-icons/fa";
import { logoBlack } from "../auth/Login";

const PlaneamentoComponent = ({ metas, setMetas }: { 
  metas: Meta[], 
  setMetas: React.Dispatch<React.SetStateAction<Meta[]>> 
}) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'semanal' | 'anual' | 'mensal' | 'trimestral'|'diaria'>('diaria');
  const { showAlert } = useAlert(); 
  const { confirm, ModalComponent } = useConfirmModal();
  const [expandedMeta, setExpandedMeta] = useState<string | null>(null);

  const toggleMeta = (id: string) => {
    setExpandedMeta(expandedMeta === id ? null : id);
  };

  const getMetaIcon = (tipo: string) => {
    switch(tipo) {
      case 'academica': return <FiBookOpen className="text-blue-500" />;
      case 'financeira': return <FiDollarSign className="text-green-500" />;
      case 'operacional': return <FiSettings className="text-purple-500" />;
      case 'marketing': return <FiTrendingUp className="text-orange-500" />;
      case 'infraestrutura': return <FiSettings className="text-indigo-500" />;
      case 'qualidade': return <FiCheckCircle className="text-teal-500" />;
      default: return <FiTarget className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: Meta['status']) => {
    switch (status) {
      case 'concluida': return 'bg-green-100 text-green-800';
      case 'em_andamento': return 'bg-blue-100 text-blue-800';
      case 'atrasada': return 'bg-red-100 text-red-800';
      case 'suspensa': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPrioridadeColor = (prioridade: Meta['prioridade']) => {
    switch (prioridade) {
      case 'critica': return 'bg-red-500 text-white';
      case 'alta': return 'bg-orange-500 text-white';
      case 'media': return 'bg-yellow-500 text-black';
      case 'baixa': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: 'short'
    });
  };

  const calcularDiasRestantes = (dataFim: string) => {
    const hoje = new Date();
    const fim = new Date(dataFim);
    const diff = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleDelete = async (metaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
      const confirmed = await confirm({
          type: 'delete',
          title: 'Excluir Meta',
          message: `'Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.'`,
          isDestructive: true,
          confirmText: 'Excluir',
          onConfirm: async () => {
            try {
              await estrategiaService.deleteMeta(metaId);
              const m=metas.find(meta => meta.id == metaId);      
              setMetas(metas.filter(meta => meta.id !== metaId));      
              // Fechar se estiver expandida
              if (expandedMeta === metaId) {
                setExpandedMeta(null);
              }
              toast.success('Meta excluída com sucesso!');
              showAlert({
                type: 'success',
                title: 'Meta excluída!',
                message: `Meta da ${m?.titulo} foi removida do sistema.`,
                duration: 3000
              });
              
            } catch (error) {
              showAlert({
                type: 'error',
                title: 'Meta ao excluir',
                message: 'Não foi possível excluir a meta. Verifique sua conexão.',
                duration: 5000
              });
            }
          }
        });
  };

  return (
    <div className="p-6 dark:bg-gray-800">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
              <div>
                <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl  font-bold text-gray-800 dark:text-white flex gap-3 items-center">
            <FaPaperPlane/>
            Planeamento Escolar
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Gerencie e acompanhe o progresso dos planos da escola
          </p>
        </div>
        
      </div>
        </div>
            
            <div className="flex items-center space-x-3">
            {/* Modos de visualização */}
            <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                {
                id:"diaria",
                label:"Diária"},
                {
                id:"semanal",
                label:"Semanal"},
                {
                id:"mensal",
                label:"Mensal"},    
                {
                id:"trimestral",
                label:"Trimestral"},
                {id:"anual",
                label:"Anual"},
                ]
                .map((r)=>{
                return <button
                onClick={() => setViewMode(r.id)}
                className={`px-4 py-2 rounded-lg ${viewMode === r.id ? 'bg-white shadow' : ''}`}
                >
                {r.label}
                </button>
                
                })
                }
                
            </div>
            
        </div>
    </div>

      {/* Lista de Metas */}
      <div className="space-y-4">
        {metas.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
            <FiTarget className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nenhuma meta cadastrada
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Comece criando sua primeira meta estratégica
            </p>
            <button 
              onClick={() => navigate("/estrategia/metas/nova")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Criar Primeira Meta
            </button>
          </div>
        ) : (
          viewMode==="semanal"?(
            <PlanejamentoSemanal/>
          )
          :
        viewMode==="trimestral"?<PlanejamentoTrimestral 
              trimestre={Math.ceil((new Date().getMonth() + 1) / 3)}
              ano={new Date().getFullYear()}
              metas={metas}
              tarefas={[]}
              onTrimestreChange={(trimestre, ano) => console.log('Trimestre alterado:', trimestre, ano)}
            />
        :viewMode ==="diaria"?<PlanejamentoDiario/>
        :viewMode==="anual"?<PlanejamentoAnual ano={2025} metasAnuais={[]}/>
        :viewMode==="mensal"&&<PlanejamentoMensal mes={new Date(2025, 0, 1)} metas={metas} tarefas={[]}/>
        
        )}
      </div>
    </div>
  );
};

export default PlaneamentoComponent;