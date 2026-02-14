import { PlaneamentoBase } from "./base";

export interface Atividades {
    hora: string;
    titulo: string;
    tipo: 'reuniao' | 'aula' | 'planejamento' | 'administrativo' | 'outro';
    descricao?: string;
    
}

export interface DiaAtividades {
    dia: 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';
    data: string;
    atividades: Atividades[];
  };

export interface PlaneamentoSemanal extends PlaneamentoBase {
   tipo: 'semanal'; 
  dias: DiaAtividades[]; 
  objetivos_semanais: string[];
  metas_prioritarias: string[];
  tarefas_ids: string[];
  metas_ids?: string[];
}
  
