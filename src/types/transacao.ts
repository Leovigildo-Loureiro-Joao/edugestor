import { BaseEntity } from "./base";
import { Meta } from "./eventos";

export interface Transacao extends BaseEntity{
  instituicao_id: string;
  data: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao: string;
  categoria: 'mensalidade' | 'matricula' | 'salario' | 'cartão'  |'material' | 'alimentacao' | 'transporte' | 'utilidades' | 'investimento';
}

export type TransacaoFormData = Omit<Transacao, 
  'id' | 'created_at' | 'updated_at' | 'turmas'|'sync_status' | 'instituicao_id'
>;



export interface ProcessarPagamentoResponse {
  sucesso: boolean;
  mensagem: string;
  dados?: any;
}

export interface DadosPagamentoCash {
  valor: string;
  meses: number;
  valorTotal?: number;
  metodo: 'cash';
  tipo?: 'mensalidade';
  descricao?:string;
  mesReferencia?: string[];
}

export interface AlocacaoRecurso extends BaseEntity{
  meta_id: string;
  meta:Meta
  valor: number;
  percentual?: number;
  data_alocacao: string;
  motivo: string;
  tipo_alocacao: 'complementar' | 'completo' | 'parcial';
  orcamento_total:number
  orcamento_actual:number
}

export type AlocacaoRecursoFormData=Omit<AlocacaoRecurso,
'id' | 'created_at' | 'updated_at' |'sync_status'
>
  
