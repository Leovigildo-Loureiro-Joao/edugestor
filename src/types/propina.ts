export interface Propina {
  id: string;
  aluno_id: string;
  mes_referencia: 'Set' | 'Out' | 'Nov' | 'Dez' | 'Jan' | 'Fev' | 'Mar' | 'Abr' | 'Mai' | 'Jun' | 'Jul' | 'Ago';
  valor_previsto: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento?: string;
  estado: 'pendente' | 'pago' | 'atrasado';
  multa: number;
  recibo_numero?: string;
  transacao_id?: string;
  created_at: string;
  updated_at: string;
}