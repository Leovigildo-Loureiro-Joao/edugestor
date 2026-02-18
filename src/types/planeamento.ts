import type { PlaneamentoBase as PlaneamentoBaseCore } from './planeamento/base';

export type {
  PlaneamentoBase,
  Horario,
  PlaneamentoDiario,
  Atividades,
  DiaAtividades,
  PlaneamentoSemanal as PlaneamentoSemanalType,
  Semanas,
  PlaneamentoMensal,
} from './planeamento';

export interface PlaneamentoAnual extends PlaneamentoBaseCore {
  tipo: 'anual';
  objetivos_anuais?: string[];
  metas_ids?: string[];
  tarefas_ids?: string[];
}

export interface PlaneamentoTrimestral extends PlaneamentoBaseCore {
  tipo: 'trimestral';
  objetivos_trimestrais?: string[];
  metas_ids?: string[];
  tarefas_ids?: string[];
}

