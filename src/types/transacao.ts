export interface Transacao {
  id: string;
  data: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao: string;
  categoria: 'mensalidade' | 'matricula' | 'salario' | 'cartão'  |'material' | 'alimentacao' | 'transporte' | 'utilidades' | 'investimento';
  created_at: string;
}

export interface TransacaoFormData {
  data: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao: string;
  categoria: 'mensalidade' | 'matricula' | 'salario'| 'cartão'  | 'material' | 'alimentacao' | 'transporte' | 'utilidades' | 'investimento';
}

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