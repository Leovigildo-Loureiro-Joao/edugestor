export interface Tarefa {
  id: string;
  titulo: string;
  categoria: 'importante' | 'urgente' | 'evento' | 'tarefa_geral';
  prioridade: 'baixa' | 'media' | 'alta';
  concluida: boolean;
  data_limite?: string;
  responsavel: string;
  created_at: string;
}

export interface RotinaDiaria {
  id: string;
  fase_dia: 'antes_abertura' | 'durante_aulas' | 'relacionamento_encarregados' | 'gestao_administrativa' | 'planeamento_pedagogico' | 'encerramento';
  atividade: string;
  ordem: number;
  obrigatoria: boolean;
}

export interface Meta {
  id: string;
  tipo: 'academica' | 'financeira' | 'operacional' | 'marketing' | 'aquisição' | 'reforma';
  descricao: string;
  prazo: string;
  responsavel: string;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'atrasada';
  indicadores_sucesso: string;
}

export interface PlanoAtividade {
  id: string;
  periodo: 'manhã' | 'tarde';
  horario: string;
  segunda_sexta: string;
  sexta_semanal: string;
  mensal: string;
}