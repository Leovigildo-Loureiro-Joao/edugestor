// pages/MetaPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  FiPercent,
  FiCheckCircle,
  FiClock,
  FiBarChart2
} from 'react-icons/fi';
import { Meta } from '../../types/eventos';
import { estrategiaService } from '../../services/database/estrategiaService';
import db from '../../services/database/db';


const MetaPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdicao = !!id;
  
  const [loading, setLoading] = useState(true);
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

const [novoRecurso, setNovoRecurso] = useState({
  nome: '',
  tipo: 'equipamento',
  quantidade: 1,
  custo: undefined as number | undefined,
  prioridade: 'media',
  observacoes: ''
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

// Calcular custo total
const custoTotal = recursos.reduce((total, recurso) => {
  return total + (recurso.custo || 0) * (recurso.quantidade || 1);
}, 0);

  // Form data
  const [formData, setFormData] = useState<Partial<Meta>>({
    titulo: '',
    descricao: '',
    tipo: 'academica',
    categoria: 'estrategica',
    especifico: '',
    mensuravel: '',
    atingivel: true,
    relevante: '',
    temporal: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    progresso: 0,
    status: 'nao_iniciada',
    prioridade: 'media',
    responsavel_principal: 'Administrador',
    kpis: []
  });

  const [kpis, setKpis] = useState<Array<{
    nome: string;
    valor_atual: number;
    valor_meta: number;
    unidade: string;
    frequencia: string;
  }>>([]);
  const [novoKpi, setNovoKpi] = useState<{
    nome: string;
    valor_atual: number;
    valor_meta: number;
    unidade: string;
    frequencia: 'diaria' | 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual';
  }>({
    nome: '',
    valor_atual: 0,
    valor_meta: 100,
    unidade: '%',
    frequencia: 'mensal'
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

  const unidadesKpi = ['%', 'alunos', 'MZN', 'horas', 'dias', 'unidades', 'pontos', 'estrelas'];
  const frequenciasKpi = ['diaria', 'semanal', 'mensal', 'trimestral', 'semestral', 'anual'];

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo?.trim()) {
      alert('Título é obrigatório');
      return;
    }

    if (!formData.data_fim) {
      alert('Data final é obrigatória');
      return;
    }

    setSalvando(true);
    try {
      const dadosCompletos:Partial<Meta> = {
        ...formData,
        kpis: kpis.map(kpi => ({
          ...kpi,
          frequencia: kpi.frequencia as 'diaria' | 'semanal' | 'mensal' | 'trimestral'
        })) || [],
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
      alert('Erro ao salvar meta');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async () => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return;
    
    if (isEdicao && id) {
      await estrategiaService.deleteMeta(id);
      navigate('/estrategia/metas');
    }
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
    if (novoKpi.nome.trim()) {
      setKpis([...kpis, { ...novoKpi }]);
      setNovoKpi({
        nome: '',
        valor_atual: 0,
        valor_meta: 100,
        unidade: '%',
        frequencia: 'mensal'
      });
    }
  };

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
            onClick={() => navigate('/estrategia')}
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
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="px-4 py-2 rounded-lg border font-medium"
                    >
                      {statusOptions.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
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

              {/* SMART Criteria */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <FiTarget className="mr-2" />
                  Critérios SMART
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Específico (S)</label>
                    <input
                      type="text"
                      value={formData.especifico}
                      onChange={(e) => setFormData({...formData, especifico: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="O que exatamente será alcançado?"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Mensurável (M)</label>
                    <input
                      type="text"
                      value={formData.mensuravel}
                      onChange={(e) => setFormData({...formData, mensuravel: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="Como será medido o sucesso?"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Atingível (A)</label>
                    <div className="flex items-center space-x-4">
                      <select
                        value={formData.atingivel?.toString()}
                        onChange={(e) => setFormData({...formData, atingivel: e.target.value === 'true'})}
                        className="flex-1 p-3 border border-gray-300 rounded-lg"
                      >
                        <option value="true">Sim, é realizável</option>
                        <option value="false">Não, é muito ambicioso</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Relevante (R)</label>
                    <input
                      type="text"
                      value={formData.relevante}
                      onChange={(e) => setFormData({...formData, relevante: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="Por que esta meta é importante?"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 font-medium mb-2">Temporal (T)</label>
                    <input
                      type="text"
                      value={formData.temporal}
                      onChange={(e) => setFormData({...formData, temporal: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="Qual o prazo para conclusão?"
                    />
                  </div>
                </div>
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
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="border-b p-6">
              <h2 className="text-xl font-bold flex items-center">
                <FiBarChart2 className="mr-2" />
                Indicadores de Desempenho (KPIs)
              </h2>
              <p className="text-gray-600 mt-1">Defina como o progresso será medido</p>
            </div>
            
            <div className="p-6">
              {/* Formulário de novo KPI */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nome do KPI</label>
                  <input
                    type="text"
                    value={novoKpi.nome}
                    onChange={(e) => setNovoKpi({...novoKpi, nome: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="Ex: Taxa de aprovação"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Valor Atual</label>
                  <input
                    type="number"
                    value={novoKpi.valor_atual}
                    onChange={(e) => setNovoKpi({...novoKpi, valor_atual: parseFloat(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Valor Meta</label>
                  <input
                    type="number"
                    value={novoKpi.valor_meta}
                    onChange={(e) => setNovoKpi({...novoKpi, valor_meta: parseFloat(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Unidade</label>
                    <select
                      value={novoKpi.unidade}
                      onChange={(e) => setNovoKpi({...novoKpi, unidade: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      {unidadesKpi.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Frequência</label>
                    <select
                      value={novoKpi.frequencia}
                      onChange={(e) => setNovoKpi({...novoKpi, frequencia: e.target.value as 'diaria' | 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual'})}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      {frequenciasKpi.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="md:col-span-4">
                  <button
                    type="button"
                    onClick={adicionarKpi}
                    className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                  >
                    Adicionar KPI
                  </button>
                </div>
              </div>

              {/* Lista de KPIs */}
              <div className="space-y-4">
                {kpis.map((kpi, index) => {
                  const progresso = (kpi.valor_atual / kpi.valor_meta) * 100;
                  
                  return (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{kpi.nome}</h4>
                          <div className="text-sm text-gray-500">
                            {kpi.unidade} • {kpi.frequencia}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removerKpi(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <div className="text-sm text-gray-600">Valor Atual</div>
                          <div className="font-bold text-lg">{kpi.valor_atual}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Meta</div>
                          <div className="font-bold text-lg">{kpi.valor_meta}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Progresso</div>
                          <div className="font-bold text-lg">{Math.round(progresso)}%</div>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            progresso >= 90 ? 'bg-green-500' :
                            progresso >= 70 ? 'bg-blue-500' :
                            progresso >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(progresso, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
                
                {kpis.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <FiBarChart2 size={48} className="mx-auto mb-3 opacity-50" />
                    <p>Nenhum KPI definido</p>
                    <p className="text-sm">Adicione indicadores para medir o progresso desta meta</p>
                  </div>
                )}
              </div>
              
              {/* Resumo dos KPIs */}
              {kpis.length > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-blue-600">Progresso Médio dos KPIs</div>
                      <div className="font-semibold">
                        {calcularProgresso()}% de progresso
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {calcularProgresso()}%
                    </div>
                  </div>
                </div>
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
                    Orçamento Previsto (MZN)
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
        <select
          value={novoRecurso.tipo}
          onChange={(e) => setNovoRecurso({...novoRecurso, tipo: e.target.value})}
          className="w-full p-2 border border-gray-300 rounded"
        >
          <option value="equipamento">Equipamento</option>
          <option value="pessoa">Pessoa</option>
          <option value="material">Material</option>
          <option value="financeiro">Financeiro</option>
          <option value="espaco">Espaço</option>
        </select>
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
        <label className="block text-sm text-gray-600 mb-1">Custo Estimado (MZN)</label>
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
        <select
          value={novoRecurso.prioridade}
          onChange={(e) => setNovoRecurso({...novoRecurso, prioridade: e.target.value})}
          className="w-full p-2 border border-gray-300 rounded"
        >
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
          <option value="critica">Crítica</option>
        </select>
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
            {custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'MZN' })}
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
                onClick={() => navigate('/estrategia')}
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
      </div>
    </div>
  );
};

export default MetaPage;