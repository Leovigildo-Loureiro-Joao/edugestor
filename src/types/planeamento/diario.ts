// types/planeamento/base
// types/planeamento/diario
import { PlaneamentoBase } from './base';

export interface Horario {
  hora: string;
  atividade: string;
  descricao?: string;
  local?: string;
  participantes?: string[];
  concluido: boolean;
}

export interface PlaneamentoDiario extends PlaneamentoBase {
  tipo: 'diario'; 
  horarios: Horario[];
  lembretes?: string[];
  
  focos: string[];
  tarefas_ids: string[];
  metas_ids?: string[];
}