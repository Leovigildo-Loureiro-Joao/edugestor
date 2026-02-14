import { PlaneamentoBase } from "./base";

export  interface Semanas{
    numero: number;
  data_inicio: string;
  data_fim: string;
  objetivos: string[];
}

export interface PlaneamentoMensal extends PlaneamentoBase {
  semanas: Array<Semanas>;
  tipo: 'mensal';
    metas_ids: string[];
    tarefas_ids: string[];
    metas_mensais: string[];
    kpis: Array<{
      nome: string;
      valor_alvo: number;
      valor_atual: number;
    }>;
}

  
  
