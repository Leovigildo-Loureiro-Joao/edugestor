import { BaseEntity } from "./base";

export interface Transacao extends BaseEntity{
  data: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao: string;
  categoria: 'mensalidade' | 'matricula' | 'salario' | 'cartão'  |'material' | 'alimentacao' | 'transporte' | 'utilidades' | 'investimento';
}

export type TransacaoFormData = Omit<Transacao, 
  'id' | 'created_at' | 'updated_at' | 'turmas'|'sync_status'
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