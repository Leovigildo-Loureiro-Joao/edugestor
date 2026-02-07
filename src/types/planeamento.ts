// types/planejamento.ts
export interface PeriodoPlanejamento {
  id: string;
  tipo: 'diario' | 'semanal' | 'mensal' | 'trimestral' | 'anual';
  titulo: string;
  descricao?: string;
  data_inicio: string;
  data_fim: string;
  metas_ids: string[]; // Metas associadas a este período
  tarefas_ids: string[]; // Tarefas específicas do período
  focos_principais: string[]; // 3-5 focos principais
  status: 'planejado' | 'em_andamento' | 'concluido' | 'atrasado' | 'revisao';
  progresso: number;
  
  // Métricas
  kpis?: Array<{
    nome: string;
    valor_alvo: number;
    valor_atual: number;
    unidade: string;
  }>;
  
  // Blocos de tempo (para mensal/trimestral)
  blocos_tempo?: Array<{
    semana_mes?: number; // 1-4 para mensal
    mes_trimestre?: number; // 1-3 para trimestral
    foco: string;
    tarefas_prioritarias: string[];
    data_inicio: string;
    data_fim: string;
  }>;
  
  // Recursos
  orcamento_previsto?: number;
  recursos_alocados?: string[];
  responsavel: string;
  
  // Documentação
  notas?: string[];
  aprendizados?: string[];
  ajustes_proximo_periodo?: string[];
  
  created_at: string;
  updated_at: string;
}