import { BaseEntity, SyncStatus } from "./base";

export interface VisaoEstrategica extends BaseEntity {
  id: string;
  titulo: string;
  descricao: string;
  periodo: string; // "2025-2027"
  data_criacao: string;
  responsavel: string;
  status: 'ativa' | 'concluida' | 'arquivada';
}

// Nível 3: PLANOS DE AÇÃO (Curto Prazo - Mensal/Semanal)
export interface PlanoAcao extends BaseEntity {
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
export interface Tarefa extends BaseEntity {
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
export interface Rotina extends BaseEntity {
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
  status: 'ativa' | 'inativa' | 'suspensa'|'concluida'|'em_andamento' ;
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

export interface EventFormData  {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  location: string;
  type: 'academic' | 'meeting' | 'holiday' | 'event' | 'other';
  description: string;
  participants: string[];
  duration: string;
  importance: 'low' | 'medium' | 'high';
  meta_id?: string; 
  meta_titulo?: string;
  objetivo_evento?: string;
  tarefas_relacionadas?: string[]; 
   sync_status?: SyncStatus;
    deleted?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface Meta extends BaseEntity {
  id: string;
  visao_id: string;
  titulo: string;
  descricao: string;
  tipo: 'academica' | 'financeira' | 'operacional' | 'marketing' | 'infraestrutura' | 'qualidade';
  categoria: 'estrategica' | 'tatica' | 'operacional';
  
  // SMART Criteria
  especifico: string;
  mensuravel: string;
  atingivel: boolean;
  relevante: string;

  
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
  
  // Indicadores (KPIs - MEDIDORES)
  kpis?: Array<IndicadorDesempenho>;


  recursos?: Array<{
    nome: string,
    tipo: string,
    quantidade: number,
    custo: number | undefined,
    prioridade: string,
    observacoes: string
  }>;
  
  // Sub-metas (MINI-METAS / AÇÕES)
  submetas?: Array<SubMeta>;
  
  // Recursos
  orcamento_previsto?: number;
  orcamento_alocado?: number; // Dinheiro já alocado

  // Dependências
  dependencias?: string[]; // IDs de outras metas
  tarefas_relacionadas?: string[]; // IDs de tarefas
  
  // Histórico de alocações
  alocacoes?: Array<Alocacao>;
  
  created_at: string;
  updated_at: string;
}



// ==================== INTERFACES DE SUPORTE ====================

export interface IndicadorDesempenho {
    id: string;
    nome: string;
    descricao?: string;
    valor_atual: number;
    valor_meta: number;
    unidade: string;
    frequencia: 'diaria' | 'semanal' | 'mensal' | 'trimestral' | 'anual';
    peso?: number;
    
    // FONTE DE DADOS AUTOMATIZADA (CRÍTICO)
    fonte_dados?: {
      tipo: 'automatico' | 'manual' | 'integracao';
      modulo?: 
        | 'matriculas'
        | 'frequencia' 
        | 'notas'
        | 'financeiro'
        | 'pessoal'
        | 'biblioteca'
        | 'infraestrutura'
        | 'avaliacoes';
      metrica: string; // Ex: "taxa_aprovacao", "evasao_mensal", "media_notas"
      filtros?: {
        turma_id?: string;
        disciplina_id?: string;
        periodo_id?: string;
        nivel_id?: string;
        // ... outros filtros contextuais
      };
      query_parametros?: Record<string, any>; // Parâmetros dinâmicos
    };
    
    ultima_atualizacao?: string;
    historico?: Array<{
      data: string;
      valor: number;
      fonte: string;
    }>;
}

export interface SubMeta{
    id: string;
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
}

export interface Alocacao{
    id: string;
    data: string;
    valor: number;
    motivo: string;
    tipo: 'complementar' | 'completo' | 'parcial';
    responsavel: string;
  }

  // Adicionar novos tipos
export interface PlanejamentoAnual {
  id: string;
  ano: number;
  titulo: string;
  descricao: string;
  objetivos: string[];
  metas_principais: string[];
  orcamento_previsto: number;
  responsavel: string;
  status: 'rascunho' | 'ativo' | 'concluido' | 'cancelado';
  progresso: number;
  created_at: string;
  updated_at: string;
}

export interface PlanejamentoSemanal {
  id: string;
  semana_numero: number;
  data_inicio: string;
  data_fim: string;
  objetivos: string[];
  prioridades: string[];
  compromissos: CompromissoDiario[];
  status: 'planejado' | 'em_andamento' | 'concluido';
  progresso: number;
}

export interface CompromissoDiario {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  titulo: string;
  descricao: string;
  tipo: 'reuniao' | 'aula' | 'planejamento' | 'outro';
  local: string;
  participantes: string[];
  concluido: boolean;
}

export interface TarefaDiaria {
  id: string;
  data: string;
  titulo: string;
  descricao: string;
  prioridade: 'alta' | 'media' | 'baixa';
  categoria: string;
  concluido: boolean;
  horario_previsto?: string;
  tempo_estimado_minutos: number;
}