import { motion } from "framer-motion";
import { useEffect, useState } from "react";
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
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useAlert } from "../ui/AlertBadge";
import PlaneamentoMensalComponent from "./PlaneamentoMensal";
import { PlaneamentoSemanal } from "./PlaneamentoSemanal";
import { RxTable, RxTarget } from "react-icons/rx";
import { FaPaperPlane, FaToiletPaper, FaTradeFederation } from "react-icons/fa";
import { logoBlack } from "../auth/Login";
import { ModalPlaneamento } from "./modals";
import type {
  PlaneamentoMensal as PlaneamentoMensalType,
  PlaneamentoSemanal as PlaneamentoSemanalType,
  PlaneamentoDiario as PlaneamentoDiarioType,
} from "../../types/planeamento";
import { es, se } from "date-fns/locale";
import { estrategiaPlaneamentoService } from "../../services/database/estrategia/planeamentoService";
import { generateUniqueId } from "../../utils/idGenarator";
import { PlaneamentoDiario } from "./PlaneamentoDiario";
import { SyncStatusBadge } from "../ui/SyncStatusBadge";

// PlaneamentoComponent.tsx
const PlaneamentoComponent = ({ metas, setMetas }: { 
  metas: Meta[], 
  setMetas: React.Dispatch<React.SetStateAction<Meta[]>> 
}) => {
  const { tipo } = useParams();
  const navigate = useNavigate();
  
  // ========== ESTADOS ==========
  const [viewMode, setViewMode] = useState<'diario' | 'semanal' | 'mensal'>(
    (tipo as 'diario' | 'semanal' | 'mensal') || 'diario'
  );
  const [planejamento, setPlanejamento] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);
  const [modo, setModo] = useState<'visualizacao' | 'criacao'>('criacao');
  const [isOpen, setOpen] = useState(false);
  const [dataAtual, setDataAtual] = useState(new Date());
  
  const { showAlert } = useAlert();

  // ========== EFFECT 1: SINCRONIZAR URL COM VIEWMODE ==========
  useEffect(() => {
    // Validar tipo da URL
    if (tipo === 'diario' || tipo === 'semanal' || tipo === 'mensal') {
      setViewMode(tipo);
    } else {
      // Redirecionar para diário se URL inválida
      navigate('/estrategia/planeamento/diario', { replace: true });
    }
  }, [tipo, navigate]);

  // ========== EFFECT 2: CARREGAR DADOS QUANDO MUDAR VIEWMODE OU DATA ==========
  useEffect(() => {
    carregarPlanejamento();
  }, [viewMode, dataAtual]); // ← ESSENCIAL!

  // ========== FUNÇÃO DE CARREGAMENTO ==========
  const carregarPlanejamento = async () => {
    try {
      setCarregando(true);
      
      let planejamento = null;
      const dataStr = dataAtual.toISOString().split('T')[0];
      
      switch(viewMode) {
        case 'diario':
          planejamento = await estrategiaPlaneamentoService.getPlanejamentoDiario(dataStr);
          break;
        case 'semanal':
          planejamento = await estrategiaPlaneamentoService.getPlanejamentoSemanal(dataStr);
          break;
        case 'mensal':
          planejamento = await estrategiaPlaneamentoService.getPlanejamentoMensal(dataStr);
          break;
      }
      
      if (planejamento) {
        setPlanejamento(planejamento);
        setModo('visualizacao');
      } else {
        setPlanejamento(null);
        setModo('criacao');
      }
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro ao carregar',
        message: `Não foi possível carregar o planejamento ${viewMode}.`,
        duration: 3000
      });
    } finally {
      setCarregando(false);
    }
  };

  // ========== BOTÕES DE NAVEGAÇÃO - SIMPLES E LIMPOS ==========
  const botoes = [
    { id: 'diario', label: 'Diário' },
    { id: 'semanal', label: 'Semanal' },
    { id: 'mensal', label: 'Mensal' }
  ];

  function onCloseModalEstrategia(): void {
    setOpen(false);

  }
// ========== FUNÇÃO DE SALVAR PLANEJAMENTO ==========
async function salvarPlaneamento(
  planejamento: Partial<PlaneamentoDiarioType | PlaneamentoSemanalType | PlaneamentoMensalType>
) {
  try {
    // Validar dados mínimos
    if (!planejamento || Object.keys(planejamento).length === 0) {
      toast.error('Dados do planejamento inválidos');
      return;
    }

    // Garantir que temos um ID
    const id = planejamento.id || generateUniqueId();
    const agora = new Date().toISOString();

    // Base do planejamento com campos comuns
    const basePlanejamento = {
      ...planejamento,
      id,
      tipo: viewMode, // Usar viewMode atual
      updated_at: agora,
      sync_status: 'pending' as const
    };

    // SE TEM ID → EDIÇÃO
    if (planejamento.id) {
      // Buscar dados existentes para preservar created_at
      const existente = await estrategiaPlaneamentoService.getPlanoById(planejamento.id);
      
      const planejamentoAtualizado = {
        ...basePlanejamento,
        tipo: viewMode, // Garantir que o tipo seja atualizado
        created_at: existente?.created_at || agora,
        status: planejamento.status || existente?.status || 'rascunho',
        progresso: planejamento.progresso ?? existente?.progresso ?? 0
      };

      const resultado = await estrategiaPlaneamentoService.updatePlano(
        planejamento.id,
        planejamentoAtualizado
      );

      if (resultado.success) {
        // Atualizar estado local
        setPlanejamento(planejamentoAtualizado as any);
        setModo('visualizacao');
        
        toast.success('Planejamento atualizado com sucesso!');
        showAlert({
          type: 'success',
          title: 'Sucesso!',
          message: 'Planejamento atualizado.',
          duration: 3000
        });
      }

    // SENÃO → CRIAÇÃO
    } else {
      const novoPlanejamento = {
        ...basePlanejamento,
        created_at: agora,
        status: 'rascunho' as const,
        progresso: 0,
        // Campos específicos por tipo (já devem vir do modal)
        ...(viewMode === 'diario' && {
          horarios: planejamento.horarios || [],
          focos: planejamento.focos || [],
          lembretes: planejamento.lembretes || []
        }),
        ...(viewMode === 'semanal' && {
          dias: planejamento.dias || [],
          objetivos_semanais: planejamento.objetivos_semanais || [],
          metas_prioritarias: planejamento.metas_prioritarias || []
        }),
        ...(viewMode === 'mensal' && {
          semanas: planejamento.semanas || [],
          metas_mensais: planejamento.metas_mensais || []
        })
      };

      const novoId = await estrategiaPlaneamentoService.savePlano(novoPlanejamento);
      
      if (novoId) {
        // Recarregar planejamento após criar
        await carregarPlanejamento();
        
        toast.success('Planejamento criado com sucesso!');
        showAlert({
          type: 'success',
          title: 'Sucesso!',
          message: 'Novo planejamento criado.',
          duration: 3000
        });
      }
    }

    // Fechar modal em ambos os casos
    setOpen(false);
    setTipoEstrategia(null);

  } catch (error) {
    console.error('❌ Erro ao salvar planejamento:', error);
    
    toast.error('Erro ao salvar planejamento');
    showAlert({
      type: 'error',
      title: 'Erro!',
      message: 'Não foi possível salvar o planejamento. Tente novamente.',
      duration: 5000
    });
  }
}

  return (
    <div className="p-6 dark:bg-gray-800">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between">
        <div>
          <div className="flex gap-3">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex gap-3 items-center">
              <FiBarChart2 />
              Planeamento Escolar
            
            </h2>
          <SyncStatusBadge tableName="planeamentos"/>
          </div>

          
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Gerencie e acompanhe o progresso dos planos da escola
          </p>
        </div>
        
        {/* ✅ BOTÕES SIMPLES - SÓ NAVEGAM! */}
        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {botoes.map((r) => (
              <button
                key={r.id}
                onClick={() => {navigate(`/estrategia/planeamento/${r.id}`);setPlanejamento(null);}}
                className={`px-4 py-2 rounded-lg transition-all ${
                  viewMode === r.id 
                    ? 'bg-white shadow font-medium' 
                    : 'hover:bg-gray-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Modal - sem mudanças */}
      {isOpen && (
        <ModalPlaneamento 
          isOpen={isOpen} 
          tipo={viewMode}
          onClose={onCloseModalEstrategia} 
          planeamentoExistente={planejamento} 
          onSave={(planeamento) => salvarPlaneamento(planeamento)}
          userNome={localStorage.getItem('usuario_nome') || 'Usuário'}
        />
      )}
      
      {/* Lista de Metas / Planejamento */}
      <div className="space-y-4 mt-6">
        {carregando ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {metas.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-700 rounded-xl">
                <FiTarget className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Nenhuma meta cadastrada
                </h3>
                <button 
                  onClick={() => navigate("/estrategia/metas/nova")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Criar Primeira Meta
                </button>
              </div>
            ) : (
              <>
                {viewMode === 'diario' && (
                  <PlaneamentoDiario 
                    carregando={carregando}
                    setCarregando={setCarregando}
                    criarPlaneamento={() => setOpen(true)}
                    planejamento={planejamento as PlaneamentoDiarioType}
                    setPlanejamento={setPlanejamento}
                    modo={modo}
                    setModo={setModo}
                    dataAtual={dataAtual}
                    setDataAtual={setDataAtual}
                  />
                )}
                {viewMode === 'semanal' && (
                  <PlaneamentoSemanal 
                    carregando={carregando}
                    setCarregando={setCarregando}
                    criarPlaneamento={() => setOpen(true)}
                    planejamento={planejamento as PlaneamentoSemanalType}
                    setPlanejamento={setPlanejamento}
                    modo={modo}
                    setModo={setModo}
                    dataAtual={dataAtual}
                    setDataAtual={setDataAtual}
                  />
                )}
                {viewMode === 'mensal' && (
                  <PlaneamentoMensalComponent 
                    carregando={carregando}
                    setCarregando={setCarregando}
                    criarPlaneamento={() => setOpen(true)}
                    planejamento={planejamento as PlaneamentoMensalType}
                    setPlanejamento={setPlanejamento}
                    modo={modo}
                    setModo={setModo}
                    dataAtual={dataAtual}
                    setDataAtual={setDataAtual}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PlaneamentoComponent;
