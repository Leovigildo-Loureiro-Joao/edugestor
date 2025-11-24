export interface Propina {
  id: string;
  aluno_id: string;
  mes_referencia: 'Set' | 'Out' | 'Nov' | 'Dez' | 'Jan' | 'Fev' | 'Mar' | 'Abr' | 'Mai' | 'Jun' | 'Jul' | 'Ago';
  valor_falta: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento?: string;
  estado: 'pendente' | 'pago' | 'atrasado';
  multa: number;
  recibo_numero?: string;
  transacao_id: string;
  created_at: string;
  updated_at: string;
}

export interface PropinaFormData {
  mes_referencia: 'Set' | 'Out' | 'Nov' | 'Dez' | 'Jan' | 'Fev' | 'Mar' | 'Abr' | 'Mai' | 'Jun' | 'Jul' | 'Ago';
  valor_pago: number;
  valor_falta: number;
  recibo_numero?: string;
  aluno_id: string;
  transacao_id: string;
  estado: 'pago' | 'pendente' | 'atrasado';
  data_vencimento: string;
  data_pagamento?: string;
}