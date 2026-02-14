// pages/MetaPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiSave,
  FiTarget,
  FiCalendar,
  FiUser,
  FiFlag,
  FiTrendingUp,
  FiDollarSign,
  FiBookOpen,
  FiSettings,
  FiTrendingDown,
  FiHome,
  FiAlertCircle,
  FiTrash2,
  FiCopy,
  FiPlus,
  FiCpu,
  FiPercent,
  FiCheckCircle,
  FiClock,
  FiBarChart2,
  FiX,
  FiDatabase,
  FiEdit
} from 'react-icons/fi';
import { IndicadorDesempenho, Meta } from '../../types/eventos';
import { estrategiaService } from '../../services/database/estrategiaService';
import db from '../../services/database/db';
import { SelectTyped } from '../students/StudentForm';
import { RxActivityLog, RxAllSides, RxCheckCircled, RxCommit, RxHobbyKnife } from 'react-icons/rx';
import { generateUniqueId } from '../../utils/idGenarator';
import { ModalSubmeta } from './SubMeta';
import { FREQUENCIAS, METRICAS_POR_MODULO, ModalKPI, MODULOS_DISPONIVEIS } from './KPIManager';
import { useAlert } from '../ui/AlertBadge';
import toast from 'react-hot-toast';
import { useConfirmModal } from '../ui/ComfirmModal';


const MetaPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdicao = !!id;
  const { confirm, ModalComponent } = useConfirmModal();
  const [loading, setLoading] = useState(true);
  const [showSubMeta, setShowSubMeta] = useState(false);
  const [showKPI, setShowKPI] = useState(false);
  const [editandoKpi, setEditandoKpi] = useState<string|null>(null);
  const [salvando, setSalvando] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [recursos, setRecursos] = useState<Array<{
  nome: string;
  tipo: string;
  quantidade?: number;
  custo?: number;
  prioridade: string;
  observacoes?: string;
}>>([]);

 const [subMetas, setSubMetas] = useState<Array<{
  titulo: string;
    descricao: string;
    data_inicio: string;
    data_fim: string;
    status: 'pendente' | 'em_andamento' | 'concluida' | 'atrasada';
    responsavel: string;
    custo_estimado?: number;
    custo_real?: number;
    kpis_afetados?: string[]; // IDs dos KPIs que esta sub-meta impacta
    notas?: string;
}>>([]);

const [novoRecurso, setNovoRecurso] = useState({
  nome: '',
  tipo: 'equipamento',
  quantidade: 1,
  custo: undefined as number | undefined,
  prioridade: 'media',
  observacoes: ''
});


const [novaSubMeta, setNovaSubMeta] = useState({
    titulo: "",
    descricao:  "",
    data_inicio:  "",
    data_fim:  "",
    status: "em_andamento" as 'pendente' | 'em_andamento' | 'concluida' | 'atrasada',
    responsavel: "",
    custo_estimado: 0,
    custo_real: 0,
    kpis_afetados:[] as string[], // IDs dos KPIs que esta sub-meta impacta
    notas: ""
});

// Funções para manipular recursos
const adicionarRecurso = () => {
  if (novoRecurso.nome.trim()) {
    setRecursos([...recursos, { ...novoRecurso }]);
    setNovoRecurso({
      nome: '',
      tipo: 'equipamento',
      quantidade: 1,
      custo: undefined,
      prioridade: 'media',
      observacoes: ''
    });
  }
};

const removerRecurso = (index: number) => {
  setRecursos(recursos.filter((_, i) => i !== index));
};

const adicionarSubMeta = () => {
  if (novaSubMeta.titulo.trim()) {
    setSubMetas([...subMetas, { ...novaSubMeta }]);
    setNovaSubMeta({
        titulo: "",
        descricao:  "",
        data_inicio:  "",
        data_fim:  "",
        status: "em_andamento" as 'pendente' | 'em_andamento' | 'concluida' | 'atrasada',
        responsavel: "",
        custo_estimado: 0,
        custo_real: 0,
        kpis_afetados:[] as string[], // IDs dos KPIs que esta sub-meta impacta
        notas: ""
    });
  }
};

const removerSubMetas = (index: number) => {
  setSubMetas(subMetas.filter((_, i) => i !== index));
};


  const getModuloLabel = (modulo: string) => {
    return MODULOS_DISPONIVEIS.find(m => m.value === modulo)?.label || modulo;
  };

  const getModuloIcon = (modulo: string) => {
    return MODULOS_DISPONIVEIS.find(m => m.value === modulo)?.icone || '📊';
  };

  const getMetricaLabel = (modulo: string, metrica: string) => {
    return METRICAS_POR_MODULO[modulo]?.find(m => m.value === metrica)?.label || metrica;
  };

// Calcular custo total
const custoTotal = recursos.reduce((total, recurso) => {
  return total + (recurso.custo || 0) * (recurso.quantidade || 1);
}, 0);

  const handleChangeSel = (field: string, value: any) => {

    setFormData((prev: Partial<Meta>) => ({ 
      ...prev, 
      [field]: value 
    }));
    console.log(formData)
  };

  // Form data
  const [formData, setFormData] = useState<Partial<Meta>>({
    titulo: '',
    descricao: '',
    tipo: 'academica',
    categoria: 'estrategica',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    progresso: 0,
    status: 'nao_iniciada',
    prioridade: 'media',
    responsavel_principal: 'Administrador',
    kpis: [],
    recursos:[]
  });

  const [kpis, setKpis] = useState<Array<IndicadorDesempenho>>([]);
  const [novoKpi, setNovoKpi] = useState<IndicadorDesempenho>({
    id:generateUniqueId(),
    nome: '',
    descricao: '',
    unidade: '%',
    valor_atual: 0,
    valor_meta: 100,
    frequencia: 'mensal' as const,
    peso: 10,
    fonte_dados: {
      tipo: 'automatico' as const,
      modulo: 'matriculas' as const,
      metrica: 'novas_matriculas',
      filtros: {},
      query_parametros: {}
    }
  });

  // Carregar dados se for edição
  useEffect(() => {
    const carregarMeta = async () => {
      setLoading(true);
      try {
        if (isEdicao && id) {
          const metaData = await db.metas.get(id);
          if (metaData) {
             setMeta(metaData);
          setFormData({
            ...metaData,
            data_inicio: metaData.data_inicio?.split('T')[0] || new Date().toISOString().split('T')[0],
            data_fim: metaData.data_fim?.split('T')[0] || ''
          });
          
          // Carregar KPIs
          if (metaData.kpis) {
            try {
              const parsed = metaData.kpis;
              setKpis(Array.isArray(parsed) ? parsed : []);
            } catch {
              setKpis([]);
            }
          }
          if (metaData.recursos) {
            try {
              const parsed = metaData.recursos;
              setRecursos(Array.isArray(parsed) ? parsed : []);
            } catch {
              setRecursos([]);
            }
          }
          }
         
        }
      } catch (error) {
        console.error('Erro ao carregar meta:', error);
      } finally {
        setLoading(false);
      }
    };
    
    carregarMeta();
  }, [id, isEdicao]);

  // Configurações
  const tiposMeta = [
    { value: 'academica', label: 'Acadêmica', icon: <FiBookOpen />, cor: 'bg-blue-100 text-blue-800', desc: 'Relacionada a ensino e aprendizagem' },
    { value: 'financeira', label: 'Financeira', icon: <FiDollarSign />, cor: 'bg-green-100 text-green-800', desc: 'Receitas, despesas, crescimento' },
    { value: 'operacional', label: 'Operacional', icon: <FiSettings />, cor: 'bg-purple-100 text-purple-800', desc: 'Processos, eficiência, organização' },
    { value: 'marketing', label: 'Marketing', icon: <FiTrendingUp />, cor: 'bg-orange-100 text-orange-800', desc: 'Visibilidade, captação, imagem' },
    { value: 'infraestrutura', label: 'Infraestrutura', icon: <FiHome />, cor: 'bg-teal-100 text-teal-800', desc: 'Espaço físico, equipamentos' },
    { value: 'qualidade', label: 'Qualidade', icon: <FiCheckCircle />, cor: 'bg-indigo-100 text-indigo-800', desc: 'Satisfação, excelência' }
  ];

  const categorias = [
    { value: 'estrategica', label: 'Estratégica', desc: 'Longo prazo (1-3 anos)' },
    { value: 'tatica', label: 'Tática', desc: 'Médio prazo (6-12 meses)' },
    { value: 'operacional', label: 'Operacional', desc: 'Curto prazo (1-6 meses)' }
  ];

  const prioridades = [
    { value: 'baixa', label: 'Baixa', cor: 'bg-blue-100 text-blue-800', icon: '🔵' },
    { value: 'media', label: 'Média', cor: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
    { value: 'alta', label: 'Alta', cor: 'bg-orange-100 text-orange-800', icon: '🟠' },
    { value: 'critica', label: 'Crítica', cor: 'bg-red-100 text-red-800', icon: '🔴' }
  ];

  const statusOptions = [
    { value: 'nao_iniciada', label: 'Não Iniciada', cor: 'bg-gray-100 text-gray-800', icon: '○' },
    { value: 'em_andamento', label: 'Em Andamento', cor: 'bg-blue-100 text-blue-800', icon: '↻' },
    { value: 'concluida', label: 'Concluída', cor: 'bg-green-100 text-green-800', icon: '✓' },
    { value: 'atrasada', label: 'Atrasada', cor: 'bg-red-100 text-red-800', icon: '⚠' },
    { value: 'suspensa', label: 'Suspensa', cor: 'bg-yellow-100 text-yellow-800', icon: '⏸️' }
  ];

  const unidadesKpi = ['%', 'alunos', 'AKZ', 'horas', 'dias', 'unidades', 'pontos', 'estrelas'];
  const frequenciasKpi = ['diaria', 'semanal', 'mensal', 'trimestral', 'semestral', 'anual'];
  const { showAlert } = useAlert(); 
    // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo?.trim()) {
        showAlert({
          type: 'warning',
          message:"Título é obrigatório",
          title: 'Preencha todos campos obrigatórios',
          duration: 3000
      });
      return;
    }

    if (!formData.data_fim) {
      showAlert({
          type: 'warning',
          message:"Data final é obrigatória",
          title: 'Preencha todos campos obrigatórios',
          duration: 3000
      });
      return;
    }

    setSalvando(true);
    try {
      const dadosCompletos: Partial<Meta> = {
        ...formData,
        kpis: kpis.map(kpi => ({
          ...kpi,
          frequencia: kpi.frequencia as 'diaria' | 'semanal' | 'mensal' | 'trimestral'
        })) || [],
        recursos: recursos.map(rec => ({...rec})) || [],
        submetas: subMetas.map(sub => ({
          id: generateUniqueId(), // Importe generateUniqueId ou use Date.now()
          ...sub,
          kpis_afetados: sub.kpis_afetados || []
        })) || [],
        progresso: calcularProgresso(), // Atualiza com base nos KPIs
        updated_at: new Date().toISOString(),
        ...(!isEdicao && {
          created_at: new Date().toISOString()
        })
      };

      if (isEdicao && id) {
        await estrategiaService.updateMeta(id, dadosCompletos);
      } else {
        await estrategiaService.saveMeta(dadosCompletos);
      }
      
      navigate('/estrategia');
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      showAlert({
          type: 'error',
          message:"Verifique suas permissões",
          title: 'Erro ao salvar meta',
          duration: 5000
      });
      toast.error('Erro ao salvar meta');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async () => {
     const confirmed = await confirm({
              type: 'delete',
              title: 'Excluir Meta',
              message: `'Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.'`,
              isDestructive: true,
              confirmText: 'Excluir',
              onConfirm: async () => {
                try {
                  if (isEdicao && id) {
                    await estrategiaService.deleteMeta(id);
                    toast.success('Meta excluída com sucesso!');
                    showAlert({
                      type: 'success',
                      title: 'Meta excluída!',
                      message: `Meta da ${m?.titulo} foi removida do sistema.`,
                      duration: 3000
                    });
                    navigate('/estrategia/metas');
                  }
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

  const handleDuplicar = () => {
    setFormData({
      ...formData,
      titulo: `${formData.titulo} (CÓPIA)`,
      status: 'nao_iniciada',
      progresso: 0
    });
    setMeta(null);
  };

  const adicionarKpi = () => {
    setShowKPI(false);
    if(editandoKpi){
        setKpis((kpis)=>{
          const kipis=[...(kpis.map((p)=> (p.id==editandoKpi?novoKpi:p)))]
          return [...kipis]
      });
      setEditandoKpi(null)
       setNovoKpi({
        id:generateUniqueId(),
        nome: '',
        descricao: '',
        unidade: '%',
        valor_atual: 0,
        valor_meta: 100,
        frequencia: 'mensal' as const,
        peso: 10,
        fonte_dados: {
          tipo: 'automatico' as const,
          modulo: 'matriculas' as const,
          metrica: 'novas_matriculas',
          filtros: {},
          query_parametros: {}
        }
      });
    }else if (novoKpi.nome.trim()) {
      setKpis([...kpis, { ...novoKpi }]);
      setNovoKpi({
        id:generateUniqueId(),
        nome: '',
        descricao: '',
        unidade: '%',
        valor_atual: 0,
        valor_meta: 100,
        frequencia: 'mensal' as const,
        peso: 10,
        fonte_dados: {
          tipo: 'automatico' as const,
          modulo: 'matriculas' as const,
          metrica: 'novas_matriculas',
          filtros: {},
          query_parametros: {}
        }
      });
    }
  };

  const atualizarKpiValor=(id:string,value:number)=>{
      setKpis((kpis)=>{
        const kipis=[...(kpis.map((p)=> (p.id==id?{
          ...p,
          valor_atual:value
        }:p)))]
        return [...kipis]
      });
  }

  const removerKpi = (index: number) => {
    setKpis(kpis.filter((_, i) => i !== index));
  };

  const calcularProgresso = () => {
    if (kpis.length === 0) return formData.progresso || 0;
    
    const progressoMedio = kpis.reduce((acc, kpi) => {
      const progressoKpi = (kpi.valor_atual / kpi.valor_meta) * 100;
      return acc + Math.min(progressoKpi, 100);
    }, 0) / kpis.length;
    
    return Math.round(progressoMedio);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/estrategia/metas')}
            className="flex items-center text-blue-100 font-semibold hover:text-white mb-6"
          >
            <FiArrowLeft className="mr-2" />
            Voltar para Estratégia
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold mb-2 flex items-center">
                <FiTarget className="mr-3" />
                {isEdicao ? ' Editar Meta' : ' Nova Meta'}
              </h1>
              <p className="text-blue-100">
                {isEdicao 
                  ? 'Atualize os detalhes da meta estratégica' 
                  : 'Defina uma nova meta para o centro educacional'}
              </p>
            </div>
            
            {isEdicao && (
              <div className="mt-4 md:mt-0 flex space-x-2">
                <button
                  onClick={handleDuplicar}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 flex items-center"
                >
                  <FiCopy className="mr-2" />
                  Duplicar
                </button>
                <button
                  onClick={handleExcluir}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center"
                >
                  <FiTrash2 className="mr-2" />
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Principal */}
      <div className="container mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Card Principal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Cabeçalho do Card */}
            <div className="border-b p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                    className="text-xl font-bold bg-transparent border-none w-full focus:outline-none focus:ring-0"
                    placeholder="Digite o título da meta..."
                    required
                  />
                </div>
                
                {/* Status e Progresso */}
                <div className="flex items-center space-x-4">
                  <div>
                   
                    <SelectTyped
                      icon={RxActivityLog}
                      vect={statusOptions}
                      value={formData.status}
                      onChange={(e:any) => setFormData({...formData, status: e})}
                   
                      className="px-4 py-2 rounded-lg border font-medium"
                   />
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {calcularProgresso()}%
                    </div>
                    <div className="text-xs text-gray-500">Progresso</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Conteúdo do Card */}
            <div className="p-6">
              {/* Descrição */}
              <div className="mb-8">
                <label className="block text-gray-700 font-semibold mb-3">
                  Descrição da Meta
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32"
                  placeholder="Descreva em detalhes o que esta meta pretende alcançar..."
                />
              </div>

              {/* Grid de Configurações */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Tipo */}
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Tipo de Meta
                  </label>
                  <div className="space-y-2">
                    {tiposMeta.map(tipo => (
                      <button
                        key={tipo.value}
                        type="button"
                        onClick={() => setFormData({...formData, tipo: tipo.value as any})}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          formData.tipo === tipo.value
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className={`p-2 rounded-lg mr-3 ${tipo.cor}`}>
                            {tipo.icon}
                          </span>
                          <div>
                            <div className="font-medium">{tipo.label}</div>
                            <div className="text-xs text-gray-500">{tipo.desc}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categoria e Prioridade */}
                <div className="space-y-6">
                  {/* Categoria */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      Categoria
                    </label>
                    <div className="space-y-2">
                      {categorias.map(cat => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setFormData({...formData, categoria: cat.value as any})}
                          className={`w-full p-3 rounded-lg border text-left transition-all ${
                            formData.categoria === cat.value
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div>
                            <div className="font-medium">{cat.label}</div>
                            <div className="text-xs text-gray-500">{cat.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prioridade */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      Prioridade
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {prioridades.map(pri => (
                        <button
                          key={pri.value}
                          type="button"
                          onClick={() => setFormData({...formData, prioridade: pri.value as any})}
                          className={`p-3 rounded-lg font-medium flex items-center justify-center transition-all ${
                            formData.prioridade === pri.value
                              ? `${pri.cor} ring-2 ring-offset-1`
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <span className="mr-2">{pri.icon}</span>
                          {pri.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Datas e Responsável */}
                <div className="space-y-6">
                  {/* Datas */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2 flex items-center">
                      <FiCalendar className="mr-2" />
                      Período
                    </label>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Data Início</div>
                        <input
                          type="date"
                          value={formData.data_inicio}
                          onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
                          className="w-full p-3 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Data Final *</div>
                        <input
                          type="date"
                          value={formData.data_fim}
                          onChange={(e) => setFormData({...formData, data_fim: e.target.value})}
                          min={formData.data_inicio}
                          className="w-full p-3 border border-gray-300 rounded-lg"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Responsável */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2 flex items-center">
                      <FiUser className="mr-2" />
                      Responsável
                    </label>
                    <input
                      type="text"
                      value={formData.responsavel_principal}
                      onChange={(e) => setFormData({...formData, responsavel_principal: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="Nome do responsável"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* KPIs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold flex items-center text-gray-900 dark:text-white">
                    <FiBarChart2 className="mr-2" />
                    Indicadores de Desempenho (KPIs)
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Indicadores conectados aos dados automáticos da escola
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKPI(true)}
                  className="px-4 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-lg font-medium hover:from-violet-600 hover:to-indigo-700 flex items-center transition-all"
                >
                  <FiBarChart2 className="mr-2" />
                  Adicionar KPI
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Lista de KPIs */}
              <div className="space-y-4">
                {kpis.map((kpi, index) => {
                  const progresso = (kpi.valor_atual / kpi.valor_meta) * 100;
                  const fonteAutomatica = kpi.fonte_dados?.tipo === 'automatico';
                  const modulo = kpi.fonte_dados?.modulo || 'manual';
                  const metrica = kpi.fonte_dados?.metrica || 'manual';
                  
                  return (
                    <motion.div 
                      key={index} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">{kpi.nome}</h4>
                            {fonteAutomatica && (
                              <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                                <FiCpu className="inline h-3 w-3 mr-1" />
                                Automático
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <FiBarChart2 className="h-3 w-3" />
                              {kpi.unidade}
                            </span>
                            <span>•</span>
                            <span>{kpi.frequencia}</span>
                            <span>•</span>
                            <span>Peso: {kpi.peso || 10}%</span>
                            
                            {fonteAutomatica && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                  <FiDatabase className="h-3 w-3" />
                                  {getModuloLabel(modulo)} → {getMetricaLabel(modulo, metrica)}
                                </span>
                              </>
                            )}
                          </div>
                          
                          {kpi.descricao && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                              {kpi.descricao}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          {/* Atualizar valor manual (se não for automático) */}
                          {!fonteAutomatica && (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={kpi.valor_atual}
                                onChange={(e) => atualizarKpiValor(kpi.id, parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm"
                                step="0.01"
                              />
                              <span className="text-sm text-gray-500 dark:text-gray-400">{kpi.unidade}</span>
                            </div>
                          )}
                           <button
                            type="button"
                            onClick={() =>{ 
                              setNovoKpi(kpi);
                              setEditandoKpi(kpi.id);
                              setShowKPI(true);
                            }}
                            className="p-1.5 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                            title="Editar KPI"
                          >
                            <FiEdit size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removerKpi(index)}
                            className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            title="Remover KPI"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Valores e progresso */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Valor Atual</div>
                          <div className="font-bold text-lg text-gray-900 dark:text-white">
                            {kpi.valor_atual.toLocaleString('pt-BR')} {kpi.unidade}
                          </div>
                          {fonteAutomatica && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              Última atualização: {kpi.ultima_atualizacao || 'N/A'}
                            </div>
                          )}
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Meta</div>
                          <div className="font-bold text-lg text-gray-900 dark:text-white">
                            {kpi.valor_meta.toLocaleString('pt-BR')} {kpi.unidade}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {kpi.frequencia === 'diaria' ? 'Meta diária' : 
                            kpi.frequencia === 'semanal' ? 'Meta semanal' : 
                            kpi.frequencia === 'mensal' ? 'Meta mensal' : 
                            kpi.frequencia === 'trimestral' ? 'Meta trimestral' : 'Meta anual'}
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-3 rounded-lg">
                          <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Progresso</div>
                          <div className="font-bold text-2xl text-blue-600 dark:text-blue-400">
                            {Math.round(progresso)}%
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {progresso >= 90 ? (
                              <FiTrendingUp className="h-4 w-4 text-green-500 dark:text-green-400" />
                            ) : progresso < 50 ? (
                              <FiTrendingDown className="h-4 w-4 text-red-500 dark:text-red-400" />
                            ) : null}
                            <span className="text-xs text-blue-600 dark:text-blue-400">
                              {progresso >= 100 ? 'Meta atingida!' : 
                              progresso >= 90 ? 'Excelente' : 
                              progresso >= 70 ? 'Bom' : 
                              progresso >= 50 ? 'Regular' : 'Atenção necessária'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Barra de progresso */}
                      <div className="mt-2">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                          <span>Progresso em relação à meta</span>
                          <span>{progresso.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full transition-all duration-300 ${
                              progresso >= 100 ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                              progresso >= 90 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                              progresso >= 70 ? 'bg-gradient-to-r from-blue-400 to-indigo-500' :
                              progresso >= 50 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                              'bg-gradient-to-r from-red-400 to-rose-500'
                            }`}
                            style={{ width: `${Math.min(progresso, 100)}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Informações da fonte de dados */}
                      {fonteAutomatica && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2 text-sm">
                            <FiDatabase className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                            <span className="text-gray-600 dark:text-gray-400">Fonte automática: </span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {getMetricaLabel(modulo, metrica)}
                            </span>
                            <span className="text-xs px-2 flex items-center py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                              {getModuloIcon(modulo)} {getModuloLabel(modulo)}
                            </span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                
                {kpis.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center gap-4 flex justify-center flex-col items-center py-12 text-gray-400 dark:text-gray-500"
                  >
                    <div className="relative">
                      <FiBarChart2 size={64} className="mx-auto mb-4 opacity-30" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FiDatabase size={32} className="text-blue-500 opacity-50" />
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nenhum indicador configurado
                      </p>
                      <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
                        Adicione KPIs para monitorar automaticamente o progresso usando dados reais da escola
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowKPI(true)}
                      className="px-6 py-3 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-lg font-medium hover:from-violet-600 hover:to-indigo-700 flex items-center transition-all shadow-lg hover:shadow-xl"
                    >
                      <FiBarChart2 className="mr-2" />
                      Adicionar o primeiro KPI
                    </button>
                    <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                      <p>Conecte-se a módulos como: Matrículas, Notas, Frequência, Financeiro</p>
                    </div>
                  </motion.div>
                )}
              </div>
              
              {/* Resumo dos KPIs */}
              {kpis.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                        Progresso Médio dos KPIs
                      </div>
                      <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                        {calcularProgresso()}%
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                        Baseado em {kpis.length} indicador{kpis.length > 1 ? 'es' : ''} 
                        {kpis.some(k => k.fonte_dados?.tipo === 'automatico') && (
                          <span className="ml-2">
                            • <FiCpu className="inline h-3 w-3" /> {kpis.filter(k => k.fonte_dados?.tipo === 'automatico').length} automático{kpis.filter(k => k.fonte_dados?.tipo === 'automatico').length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-600 dark:text-gray-400">KPIs por fonte</div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-sm">Automáticos: {kpis.filter(k => k.fonte_dados?.tipo === 'automatico').length}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-sm">Manuais: {kpis.filter(k => !k.fonte_dados || k.fonte_dados.tipo === 'manual').length}</span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setShowKPI(true)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 flex items-center text-sm"
                      >
                        <FiPlus className="mr-2" />
                        Novo KPI
                      </button>
                    </div>
                  </div>
                  
                  {/* Distribuição de pesos */}
                  {kpis.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-blue-100 dark:border-blue-900/30">
                      <div className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                        Distribuição de importância (pesos)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {kpis.map((kpi, index) => (
                          <div 
                            key={index}
                            className="px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-900/40 flex items-center gap-2"
                          >
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {kpi.nome.substring(0, 20)}{kpi.nome.length > 20 ? '...' : ''}
                            </div>
                            <div className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                              {kpi.peso || 10}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Recursos e Observações */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="border-b p-6">
              <h2 className="text-xl font-bold flex items-center">
                <FiSettings className="mr-2" />
                Recursos e Observações
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Orçamento */}
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Orçamento Previsto (AKZ)
                  </label>
                  <div className="relative">
                    <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={formData.orcamento_previsto || ''}
                      onChange={(e) => setFormData({...formData, orcamento_previsto: parseFloat(e.target.value)})}
                      className="w-full pl-10 p-3 border border-gray-300 rounded-lg"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                {/* Recursos Necessários */}
                <div>
  <label className="block text-gray-700 font-medium mb-2">
    Recursos Necessários
  </label>
  
  {/* Lista de recursos */}
  <div className="space-y-2 mb-3">
    {recursos.map((recurso, index) => (
      <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
        <div className="flex-1 flex items-center">
          <div className={`w-3 h-3 rounded-full mr-3 ${
            recurso.tipo === 'equipamento' ? 'bg-blue-500' :
            recurso.tipo === 'pessoa' ? 'bg-green-500' :
            recurso.tipo === 'material' ? 'bg-yellow-500' :
            'bg-purple-500'
          }`}></div>
          <div>
            <div className="font-medium">{recurso.nome}</div>
            <div className="text-sm text-gray-500 flex items-center">
              <span className="mr-3">{recurso.tipo}</span>
              {recurso.quantidade && (
                <span className="px-2 py-0.5 bg-gray-200 rounded text-xs">
                  Qtd: {recurso.quantidade}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => removerRecurso(index)}
          className="text-red-500 hover:text-red-700 ml-2"
        >
          ✕
        </button>
      </div>
    ))}
  </div>
  
  {/* Formulário para adicionar novo recurso */}
  <div className="border border-gray-300 rounded-lg p-4">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
      <div>
        <label className="block text-sm text-gray-600 mb-1">Nome do Recurso</label>
        <input
          type="text"
          value={novoRecurso.nome}
          onChange={(e) => setNovoRecurso({...novoRecurso, nome: e.target.value})}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="Ex: Impressora, Professor..."
        />
      </div>
      
      <div>
        <label className="block text-sm text-gray-600 mb-1">Tipo</label>
          <SelectTyped
            icon={null}
            vect={[{value:"equipamento",label:"Equipamento"},
              {value:"pessoa",label:"Pessoa"},
              {value:"material",label:"Material"},
              {value:"financeiro",label:"Financeiro"},
              {value:"espaco",label:"Espaço"}
            ]}
            value={novoRecurso.tipo}
            onChange={(e:any) => setNovoRecurso({...novoRecurso, tipo: e})}
            className="px-4 py-2 rounded-lg border font-medium"
          />
        
      </div>
      
      <div>
        <label className="block text-sm text-gray-600 mb-1">Quantidade</label>
        <input
          type="number"
          value={novoRecurso.quantidade}
          onChange={(e) => setNovoRecurso({...novoRecurso, quantidade: parseInt(e.target.value) || 1})}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="1"
          min="1"
        />
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
      <div>
        <label className="block text-sm text-gray-600 mb-1">Custo Estimado (AKZ)</label>
        <input
          type="number"
          value={novoRecurso.custo || ''}
          onChange={(e) => setNovoRecurso({...novoRecurso, custo: parseFloat(e.target.value)})}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="0.00"
          step="0.01"
        />
      </div>
      
      <div>
        <label className="block text-sm text-gray-600 mb-1">Prioridade</label>
         <SelectTyped
            icon={null}
            vect={[{value:"baixa",label:"Baixa"},
              {value:"media",label:"Média"},
              {value:"alta",label:"Material"},
              {value:"critica",label:"Alta"},
            ]}
            value={novoRecurso.prioridade}
            onChange={(e:any) => setNovoRecurso({...novoRecurso, prioridade: e})}
            className="px-4 py-2 rounded-lg border font-medium"
          />
       
      </div>
    </div>
    
    <div className="mb-3">
      <label className="block text-sm text-gray-600 mb-1">Observações</label>
      <input
        type="text"
        value={novoRecurso.observacoes || ''}
        onChange={(e) => setNovoRecurso({...novoRecurso, observacoes: e.target.value})}
        className="w-full p-2 border border-gray-300 rounded"
        placeholder="Detalhes adicionais..."
      />
    </div>
    
    <button
      type="button"
      onClick={adicionarRecurso}
      className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 flex items-center justify-center"
    >
      <span className="mr-2">+</span>
      Adicionar Recurso à Lista
    </button>
  </div>
  
  {/* Resumo */}
  {recursos.length > 0 && (
    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm text-blue-600">Resumo de Recursos</div>
          <div className="font-medium">
            {recursos.length} itens • {recursos.filter(r => r.tipo === 'equipamento').length} equipamentos
          </div>
        </div>
        {custoTotal > 0 && (
          <div className="text-lg font-bold text-blue-700">
            {custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'AKZ' })}
          </div>
        )}
      </div>
    </div>
  )}
</div>
              </div>
            </div>
          </motion.div>

          {/* Botões de Ação */}
          <div className="flex justify-between items-center pt-8 border-t">
            <div className="text-gray-600">
              <div className="flex items-center">
                <FiAlertCircle className="mr-2" />
                <span>Campos com * são obrigatórios</span>
              </div>
              {formData.prioridade === 'critica' && (
                <div className="mt-2 text-red-600 font-medium flex items-center">
                  <FiFlag className="mr-2" />
                  ⚠️ Esta meta está marcada como CRÍTICA - Máxima prioridade
                </div>
              )}
            </div>
            
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate('/estrategia/metas')}
                className="px-8 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                disabled={salvando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-800 flex items-center disabled:opacity-50"
              >
                {salvando ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <FiSave className="mr-2" />
                    {isEdicao ? 'Atualizar Meta' : 'Criar Meta'}
                  </>
                )}
              </button>
            </div>
          </div>
           
        </form>
        {/* Modal Quick Add */}
        <AnimatePresence>
            {showSubMeta && (
              <ModalSubmeta
              formData={formData}
              handleSaveSubMeta={adicionarSubMeta}
              kpis={kpis}
              novaSubMeta={novaSubMeta}
              setNovaSubMeta={setNovaSubMeta}
              setShowSubMeta={setShowSubMeta}
              />              
            )}
            {showKPI && (    
               <ModalKPI
                  novoKPI={novoKpi}
                  setNovoKPI={setNovoKpi}
                  handleSaveKPI={adicionarKpi}
                  setShowForm={() => {
                    setShowKPI(false);
                    setEditandoKpi(null)
                  }}
                  editando={editandoKpi!=null}
                  modulosDisponiveis={MODULOS_DISPONIVEIS}
                  metricasPorModulo={METRICAS_POR_MODULO}
                  frequencias={FREQUENCIAS}
                />      
            )}
          </AnimatePresence>
          <ModalComponent/>
      </div>
    </div>
  );
};

export default MetaPage;