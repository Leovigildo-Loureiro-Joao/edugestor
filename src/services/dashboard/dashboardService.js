// services/dashboard/dashboardService.js
import { supabase } from '../supabase/config';

export const dashboardService = {
  async getDashboardStats() {
    try {
      console.log('🟡 Iniciando busca de estatísticas...');

      // ✅ CORREÇÃO: Usar COUNT em vez de DATA
      const [
        { count: totalAlunos, error: alunosError },
        { count: alunosAtivos, error: ativosError },
        { count: propinaPagas, error: pagasError },
        { count: propinaPendentes, error: pendentesError },
        { data: frequencias, error: frequenciasError }
      ] = await Promise.all([
        // Total de alunos - ✅ COUNT, não DATA
        supabase
          .from('alunos')
          .select('id', { count: 'exact', head: true }),
        
        // Alunos ativos - ✅ COUNT, não DATA
        supabase
          .from('alunos')
          .select('id', { count: 'exact', head: true })
          .eq('estado', 'ativo'),
        
        // propina pagas - ✅ COUNT, não DATA
        supabase
          .from('propina')
          .select('id', { count: 'exact', head: true })
          .eq('estado', 'pago'),
        
        // propina pendentes - ✅ COUNT, não DATA
        supabase
          .from('propina')
          .select('id', { count: 'exact', head: true })
          .eq('estado', 'pendente'),
        
        // Frequências - ✅ Aqui sim precisa de DATA
        supabase
          .from('frequencias')
          .select('presente')
      ]);

      // ✅ DEBUG: Ver o que está retornando
      console.log('🔍 Debug dos counts:', {
        totalAlunos,
        alunosAtivos,
        propinaPagas, 
        propinaPendentes,
        frequencias: frequencias?.length
      });

      // ✅ Verificar erros
      if (alunosError) {
        console.error('❌ Erro alunos:', alunosError);
        throw alunosError;
      }
      if (ativosError) {
        console.error('❌ Erro alunos ativos:', ativosError);
        throw ativosError;
      }
      if (pagasError) {
        console.error('❌ Erro propina pagas:', pagasError);
        throw pagasError;
      }
      if (pendentesError) {
        console.error('❌ Erro propina pendentes:', pendentesError);
        throw pendentesError;
      }
      if (frequenciasError) {
        console.error('❌ Erro frequências:', frequenciasError);
        throw frequenciasError;
      }

      // ✅ Calcular frequência média
      const totalFrequencias = frequencias?.length || 0;
      const totalPresentes = frequencias?.filter(f => f.presente).length || 0;
      const frequenciaMedia = totalFrequencias > 0 
        ? (totalPresentes / totalFrequencias) * 100 
        : 0;

      // ✅ Retornar no formato correto
      const stats = {
        totalAlunos: totalAlunos || 0,                     // ✅ Agora count
        alunosAtivos: alunosAtivos || 0,                   // ✅ Agora count  
        propinaPagas: propinaPagas || 0,                 // ✅ Agora count
        propinaPendentes: propinaPendentes || 0,         // ✅ Agora count
        frequenciaMedia: parseFloat(frequenciaMedia.toFixed(1))
      };

      console.log('📊 Estatísticas finais:', stats);
      return stats;

    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas do dashboard:', error);
      throw error;
    }
  }
};