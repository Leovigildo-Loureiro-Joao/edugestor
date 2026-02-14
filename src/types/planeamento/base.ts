import { BaseEntity } from "../base";

export interface PlaneamentoBase extends BaseEntity {
  id: string;
  user_id: string; // Quem criou
  responsavel: string; // Quem é responsável pela execução
  tipo: 'diario' | 'semanal' | 'mensal';
  titulo: string;
  descricao?: string;
  data_inicio: string;
  data_fim: string;
  status: 'rascunho' | 'ativo' | 'concluido';
  progresso: number; // 0-100
  created_at: string;
  updated_at: string;
}