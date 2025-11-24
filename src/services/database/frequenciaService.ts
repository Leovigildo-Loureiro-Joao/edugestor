import { Frequencia } from '../../types';
import { supabase } from '../supabase/config';

export const frequenciaService = {
  // ✅ Registrar frequência em lote (para turma inteira)
  async registrarFrequenciaLote(aulaId:string, registros:Frequencia[]) {
    const frequencias = registros.map(reg => ({
      aula_id: aulaId,
      aluno_id: reg.aluno_id,
      data_aula: new Date().toISOString().split('T')[0], // Data atual
      presente: reg.presente,
      justificativa: reg.justificativa
    }));

    const { data, error } = await supabase
      .from('frequencias')
      .insert(frequencias)
      .select();

    if (error) throw error;
    return data;
  },

  // ✅ Buscar frequência da aula
  async getFrequenciaPorAula(aulaId:string) {
    const { data, error } = await supabase
      .from('frequencias')
      .select(`
        *,
        alunos(nome_completo)
      `)
      .eq('aula_id', aulaId);

    if (error) throw error;
    return data;
  },
  async getByAluno(alunoId:string, dias:number) {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - dias);
    const dataLimiteStr = dataLimite.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('frequencias')
      .select('*')
      .eq('aluno_id', alunoId)
      .gte('data_aula', dataLimiteStr)
      .order('data_aula', { ascending: false }

      );
    if (error) throw error;
    return data as Frequencia[];
  },
  // ✅ Estatísticas simples de frequência
  async getEstatisticasFrequencia(turmaId:string, mes:string) {
    const { data, error } = await supabase
      .from('frequencias')
      .select('presente')
      .eq('turma_id', turmaId) // Assumindo que tem turma_id na frequencia
      .gte('data_aula', `${mes}-01`)
      .lte('data_aula', `${mes}-31`);

    if (error) throw error;

    const stats = {
      total: data.length,
      taxa_presenca:0,
      presentes: data.filter(f => f.presente).length,
      ausentes: data.filter(f => !f.presente).length
    };

    stats.taxa_presenca = stats.total > 0 
      ? (stats.presentes / stats.total) * 100 
      : 0;

    return stats;
  }
};