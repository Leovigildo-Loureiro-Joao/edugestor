export interface EventFormData {
  id?: number;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  location: string;
  type: 'academic' | 'meeting' | 'holiday' | 'event' | 'other';
  description: string;
  participants: string[];
  duration: string;
  importance: 'low' | 'medium' | 'high';
  // Removidos: teacher, subject
}



export interface VisaoEstrategica {
  id: string;
  titulo: string;
  descricao: string;
  periodo: string; // "2025-2027"
  data_criacao: string;
  responsavel: string;
  status: 'ativa' | 'concluida' | 'arquivada';
}

// Nível 2: METAS (Médio Prazo - Trimestral/Anual)
export interface Meta {
  id: string;
  visao_id: string; // Relaciona com a Visão
  titulo: string;
  descricao: string;
  tipo: 'academica' | 'financeira' | 'operacional' | 'marketing' | 'infraestrutura' | 'qualidade';
  categoria: 'estrategica' | 'tatica' | 'operacional';
  
  // SMART Criteria
  especifico: string;
  mensuravel: string;
  atingivel: boolean;
  relevante: string;
  temporal: string;
  
  // Controle
  data_inicio: string;
  data_fim: string;
  data_limite_real?: string;
  progresso: number; // 0-100
  status: 'nao_iniciada' | 'em_andamento' | 'concluida' | 'atrasada' | 'suspensa';
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  
  // Responsabilidade
  responsavel_principal: string;
  responsaveis_secundarios?: string[];
  
  // Indicadores
  kpis: Array<{
    nome: string;
    valor_atual: number;
    valor_meta: number;
    unidade: string;
    frequencia: 'diaria' | 'semanal' | 'mensal' | 'trimestral';
  }>;
  
  // Recursos
  orcamento_previsto?: number;
  recursos_necessarios?: string[];
  
  // Dependências
  dependencias?: string[]; // IDs de outras metas
  tarefas_relacionadas?: string[]; // IDs de tarefas
  
  created_at: string;
  updated_at: string;
}

// Nível 3: PLANOS DE AÇÃO (Curto Prazo - Mensal/Semanal)
export interface PlanoAcao {
  id: string;
  meta_id: string; // Relaciona com a Meta
  titulo: string;
  descricao: string;
  tipo: 'calendario' | 'evento' | 'projeto' | 'rotina';
  
  // Temporalidade
  data_inicio: string;
  data_fim: string;
  recorrencia?: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
  dias_recorrencia?: number[]; // [1,3,5] para seg,qua,sex
  horario_inicio?: string;
  horario_fim?: string;
  duracao_minutos?: number;
  
  // Localização
  local?: string;
  sala?: string;
  
  // Participantes
  participantes: Array<{
    id: string;
    nome: string;
    tipo: 'professor' | 'aluno' | 'encarregado' | 'staff';
    confirmado: boolean;
  }>;
  
  // Status
  status: 'agendado' | 'em_andamento' | 'concluido' | 'cancelado' | 'adiado';
  visibilidade: 'publico' | 'privado' | 'restrito';
  
  // Recursos
  recursos_necessarios?: string[];
  orcamento?: number;
  
  // Resultados
  resultado_esperado?: string;
  resultado_obtido?: string;
  notas?: string;
  
  created_at: string;
  updated_at: string;
}

// Nível 4: TAREFAS (Execução - Diária)
export interface Tarefa {
  id: string;
  plano_id?: string; // Opcional - relaciona com Plano
  meta_id?: string; // Opcional - relaciona diretamente com Meta
  
  titulo: string;
  descricao?: string;
  
  // Classificação
  tipo: 'operacional' | 'administrativa' | 'pedagogica' | 'manutencao' | 'evento';
  categoria: 'importante' | 'urgente' | 'evento' | 'rotina' | 'melhoria';
  
  // Priorização
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  impacto: 'baixo' | 'medio' | 'alto' | 'critico';
  esforco: 'rapido' | 'moderado' | 'longo';
  
  // Temporalidade
  data_criacao: string;
  data_limite?: string;
  data_conclusao?: string;
  estimativa_horas?: number;
  tempo_real_horas?: number;
  
  // Status
  status: 'pendente' | 'em_andamento' | 'concluida' | 'atrasada' | 'cancelada';
  concluida: boolean;
  percentual_conclusao: number;
  
  // Responsabilidade
  responsavel_id: string;
  responsavel_nome: string;
  atribuida_por?: string;
  
  // Dependências
  dependencias?: string[]; // IDs de outras tarefas
  bloqueadores?: string[]; // IDs de tarefas que bloqueiam esta
  
  // Acompanhamento
  checklist?: Array<{
    item: string;
    concluido: boolean;
  }>;
  anexos?: string[]; // URLs ou paths
  comentarios?: Array<{
    autor: string;
    texto: string;
    data: string;
    tipo: 'comentario' | 'atualizacao' | 'problema';
  }>;
  
  // Métricas
  qualidade_execucao?: 1 | 2 | 3 | 4 | 5;
  satisfacao_responsavel?: 1 | 2 | 3 | 4 | 5;
  
  created_at: string;
  updated_at: string;
}

// Nível 5: ROTINAS (Processos Padronizados)
export interface Rotina {
  id: string;
  nome: string;
  descricao: string;
  tipo: 'diaria' | 'semanal' | 'mensal' | 'trimestral' | 'anual';
  fase: 'abertura' | 'operacao' | 'encerramento' | 'administrativa';
  
  // Execução
  passos: Array<{
    ordem: number;
    atividade: string;
    descricao?: string;
    responsavel: string;
    tempo_estimado_minutos: number;
    obrigatorio: boolean;
    checklist_item?: string;
  }>;
  
  // Horário
  horario_ideal?: string;
  tolerancia_minutos?: number;
  dias_semana?: number[]; // 0=Domingo, 1=Segunda...
  
  // Controle
  status: 'ativa' | 'inativa' | 'suspensa';
  versao: number;
  data_implementacao: string;
  data_revisao?: string;
  
  // Métricas
  tempo_medio_execucao_minutos?: number;
  taxa_conformidade?: number; // %
  incidentes?: Array<{
    data: string;
    descricao: string;
    resolvido: boolean;
  }>;
  
  // Relacionamentos
  tarefas_relacionadas?: string[];
  responsavel_criacao: string;
  
  created_at: string;
  updated_at: string;
}

// ==================== INTERFACES DE SUPORTE ====================

export interface IndicadorDesempenho {
  id: string;
  nome: string;
  descricao: string;
  tipo: 'quantitativo' | 'qualitativo';
  categoria: 'academico' | 'financeiro' | 'operacional' | 'satisfacao';
  
  // Valores
  valor_atual: number;
  valor_meta: number;
  valor_minimo: number;
  valor_maximo: number;
  unidade: string;
  

  frequencia_coleta: 'diaria' | 'semanal' | 'mensal' | 'trimestral';
  ultima_coleta: string;
  proxima_coleta: string;
  

  historico: Array<{
    data: string;
    valor: number;
    observacao?: string;
  }>;
  tendencia: 'melhorando' | 'estavel' | 'piorando' | 'variavel';
  

  responsavel_coleta: string;
  responsavel_analise: string;
}
