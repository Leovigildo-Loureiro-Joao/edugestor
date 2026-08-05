import { BaseEntity, SyncStatus } from "./base";

export interface SystemConfig extends BaseEntity{
  id: string;
  category: string;
  key_name: string;
  value: any;
  data_type: string;
  description?: string;
  instituicao_id:string
  updated_by?: string;
}

export type SystemConfigFormData = Omit<SystemConfig
,"id"|"updated_at"|"sync_status"|"deleted"|"created_at">;


export interface PaymentConfig {
  valorPropina: number;
  diaVencimento: number;
  mesesPagamento:string[];
  permitePagamentoAntecipado:boolean;
  multaPagamento:boolean;
  multaAtraso:number;
  diasParaMulta:number;
  pagamentoPrepago:boolean;
}

export interface HorarioConfig {
  hora_inicial: string;
  hora_final: string;
}

export interface SistemaAvaliacao {
  min_approval: number;
  scale: number;
}

export interface TipoAvaliacao {
  id: number;
  nome: string;
  notaMax?: number;
  cor: string;
}

export interface AcademyConfig {
  tiposAvaliacao: TipoAvaliacao[];
  maxAlunosTurma: number;
  maxFaltasPermitidas: number;
  permitirMatriculas: boolean;
  horario: HorarioConfig;
  sistemaAvaliacao: SistemaAvaliacao;
  usarFrequenciaNaSituacaoNotas: boolean;
  frequenciaMinimaAprovacao: number;
}
