// services/database/frequenciaService.ts
import { supabase } from '../database/db';
import db from './db';
import { Frequencia, FrequenciaData, RegistroFrequenciaLote } from '../../types/frequencia';
import { syncManager } from './syncManager';
import { alunosService } from './alunosService';

const generateUniqueId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const frequenciaService = {
  // ✅ Registrar frequência em lote (com suporte offline)
  async registrarFrequenciaLote(registro: RegistroFrequenciaLote): Promise<string[]> {
    try {
      const ids: string[] = [];
      const now = new Date().toISOString();
      const dataAula = registro.data_aula || new Date().toISOString().split('T')[0];
      
      for (const registroAluno of registro.registros) {
        const id = generateUniqueId();
        
        const frequencia = {
          id,
          aula_id: registro.aula_id,
          aluno_id: registroAluno.aluno_id,
          data_aula: dataAula,
          presente: registroAluno.presente,
          justificativa: registroAluno.justificativa || '',
          created_at: now,
          updated_at: now,
          sync_status: 'pending' as const,
          deleted: false,
        } as Frequencia;

        console.log(`📝 Registrando frequência para aluno ${registroAluno.aluno_id}: ${registroAluno.presente ? 'presente' : 'ausente'}`);
        
        await db.frequencias.put(frequencia);
        
        // Adicionar à fila de sincronização
        await db.syncQueue.add({
          table: 'frequencias',
          record_id: id,
          operation: 'upsert',
          status: 'pending',
          created_at: now
        });
        
        ids.push(id);
      }

      console.log(`✅ ${ids.length} frequências registradas localmente para aula ${registro.aula_id}`);
      return ids;
      
    } catch (error) {
      console.error('❌ Erro ao registrar frequências em lote:', error);
      throw error;
    }
  },

  // ✅ Buscar todas as frequências
  async getAllFrequencias(): Promise<Frequencia[]> {
    try {
      console.log('📋 Buscando frequências...');
      
      const todasFrequencias = await db.frequencias.toArray();
      
      // Filtrar as não deletadas
      const frequenciasAtivas = todasFrequencias.filter(freq => !freq.deleted);
      
      // Ordenar por data (mais recente primeiro)
      frequenciasAtivas.sort((a, b) => 
        new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime()
      );
      
      console.log(`✅ Encontradas ${frequenciasAtivas.length} frequências ativas`);
      return frequenciasAtivas;
    } catch (error) {
      console.error('❌ Erro ao buscar frequências:', error);
      return [];
    }
  },

    async syncFrequencias() {
      return syncManager.downloadTableBatch('frequencias', new Date(0));
    },
  
  // ✅ Função auxiliar para marcar como pendente
   async markForSync(recordId: string, operation: 'upsert' | 'delete') {
    await db.syncQueue.add({
      table: 'frequencias',
      record_id: recordId,
      operation,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  },

  // ✅ Buscar frequência por aula (com suporte offline)
  async getFrequenciaPorAula(aulaId: string): Promise<Frequencia[]> {
    try {
      const frequencias = await db.frequencias
        .where('aula_id')
        .equals(aulaId)
        .and(freq => !freq.deleted)
        .toArray();
      
      // Se tiver nomes de alunos já salvos, manter. Caso contrário, podemos buscar.
      // Para performance, considerar cachear nomes de alunos em outra tabela
      
      // Ordenar por aluno_id para consistência
      return frequencias.sort((a, b) => 
        (a.aluno_id || '').localeCompare(b.aluno_id || '')
      );

    } catch (error) {
      console.error('❌ Erro ao buscar frequências da aula:', error);
      return [];
    }
  },

  // ✅ Buscar frequências por aluno
  async getByAluno(alunoId: string, dias?: number): Promise<Frequencia[]> {
    try {
      let frequencias = await db.frequencias
        .where('aluno_id')
        .equals(alunoId)
        .and(freq => !freq.deleted)
        .toArray();
      
      // Filtrar por período se especificado
      if (dias) {
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - dias);
        
        frequencias = frequencias.filter(freq => 
          new Date(freq.data_aula) >= dataLimite
        );
      }
      
      // Ordenar por data (mais recente primeiro)
      return frequencias.sort((a, b) => 
        new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime()
      );

    } catch (error) {
      console.error('❌ Erro ao buscar frequências do aluno:', error);
      return [];
    }
  },

  // ✅ Buscar frequência específica por aluno e aula
  async getFrequenciaAlunoAula(alunoId: string, aulaId: string): Promise<Frequencia | null> {
    try {
      const frequencias = await db.frequencias
        .where('aluno_id')
        .equals(alunoId)
        .and(freq => !freq.deleted)
        .toArray();
      
      return frequencias.find(freq => freq.aula_id === aulaId) || null;

    } catch (error) {
      console.error('❌ Erro ao buscar frequência específica:', error);
      return null;
    }
  },

  // ✅ Atualizar frequência individual
  async updateFrequencia(id: string, updates: Partial<FrequenciaData>) {
    try {
      const updated_at = new Date().toISOString();
      
      await db.frequencias.update(id, {
        ...updates,
        updated_at,
        sync_status: 'pending' as const
      });

      // Adicionar/atualizar na fila
      await db.syncQueue.add({
        table: 'frequencias',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });
      
      console.log(`✏️ Frequência ${id} marcada para atualização`);
      
      return await db.frequencias.get(id);
      
    } catch (error) {
      console.error('Erro ao atualizar frequência:', error);
      throw error;
    }
  },

  // ✅ Deletar frequência (soft delete)
  async deleteFrequencia(id: string) {
    try {
      const frequencia = await db.frequencias.get(id);
      if (!frequencia) return;

      if (frequencia.sync_status === 'synced' && !frequencia.id.startsWith('local_')) {
        // Se já sincronizado, marcar para deleção remota
        await db.frequencias.update(id, { 
          deleted: true, 
          sync_status: 'pending_delete' as const,
          updated_at: new Date().toISOString()
        });
        
        await db.syncQueue.add({
          table: 'frequencias',
          record_id: id,
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        console.log(`🗑️ Frequência ${id} marcada para deleção remota`);
      } else {
        // Se nunca sincronizado, deletar completamente
        await db.frequencias.delete(id);
        
        // Remover da fila se existir
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();
          
        console.log(`🗑️ Frequência ${id} deletada localmente`);
      }
      
    } catch (error) {
      console.error('Erro ao deletar frequência:', error);
      throw error;
    }
  },

  // ✅ Deletar todas frequências de uma aula
  async deleteFrequenciasPorAula(aulaId: string) {
    try {
      const frequencias = await this.getFrequenciaPorAula(aulaId);
      
      for (const frequencia of frequencias) {
        await this.deleteFrequencia(frequencia.id);
      }
      
      console.log(`🗑️ ${frequencias.length} frequências da aula ${aulaId} marcadas para deleção`);
      return frequencias.length;
    } catch (error) {
      console.error('Erro ao deletar frequências da aula:', error);
      throw error;
    }
  },

  // ✅ Estatísticas de frequência (com suporte offline)
  async getEstatisticasFrequencia(turmaId: string, mes?: string) {
    try {
      // Primeiro precisamos buscar aulas da turma
      // Como não temos turma_id direto em frequencias, precisamos:
      // 1. Buscar aulas da turma
      // 2. Buscar frequências dessas aulas
      
      // Esta função é mais complexa offline. Por enquanto, vamos focar em estatísticas gerais.
      
      const todasFrequencias = await this.getAllFrequencias();
      
      // Filtrar por período se especificado
      let frequenciasFiltradas = todasFrequencias;
      
      if (mes) {
        const [ano, mesNum] = mes.split('-').map(Number);
        const inicioMes = new Date(ano, mesNum - 1, 1);
        const fimMes = new Date(ano, mesNum, 0);
        
        frequenciasFiltradas = frequenciasFiltradas.filter(freq => {
          const dataFreq = new Date(freq.data_aula);
          return dataFreq >= inicioMes && dataFreq <= fimMes;
        });
      }
      
      const stats = {
        total: frequenciasFiltradas.length,
        presentes: frequenciasFiltradas.filter(f => f.presente).length,
        ausentes: frequenciasFiltradas.filter(f => !f.presente).length,
        taxa_presenca: 0
      };

      stats.taxa_presenca = stats.total > 0 
        ? (stats.presentes / stats.total) * 100 
        : 0;

      return stats;

    } catch (error) {
      console.error('❌ Erro ao gerar estatísticas de frequência:', error);
      return {
        total: 0,
        presentes: 0,
        ausentes: 0,
        taxa_presenca: 0
      };
    }
  },

  async getFrequenciaAluno(alunoId: string, periodoDias?: number) {
    try {
      const frequencias = await this.getByAluno(alunoId, periodoDias);
      
      const stats = {
        total: frequencias.length,
        presentes: frequencias.filter(f => f.presente).length,
        ausentes: frequencias.filter(f => !f.presente).length,
        taxa_presenca: 0,
        diasConsecutivosAusentes: 0,
        ultimaPresenca: '',
        historico: frequencias.slice(0, 10) // Últimos 10 registros
      };

      stats.taxa_presenca = stats.total > 0 
        ? (stats.presentes / stats.total) * 100 
        : 0;

      // Encontrar última presença (mais recente)
      const presencas = frequencias.filter(f => f.presente);
      if (presencas.length > 0) {
        // Ordenar por data mais recente primeiro
        presencas.sort((a, b) => new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime());
        stats.ultimaPresenca = presencas[0].data_aula;
      }

      // Calcular dias consecutivos ausentes (SÓ PARA ALUNO)
      let diasAusentesConsecutivos = 0;
      const frequenciasOrdenadas = [...frequencias].sort((a, b) => 
        new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime()
      );
      
      for (let i = 0; i < frequenciasOrdenadas.length; i++) {
        if (frequenciasOrdenadas[i].presente) break;
        diasAusentesConsecutivos++;
      }
      
      stats.diasConsecutivosAusentes = diasAusentesConsecutivos;

      return stats;

    } catch (error) {
      console.error('❌ Erro ao calcular frequência do aluno:', error);
      return {
        total: 0,
        presentes: 0,
        ausentes: 0,
        taxa_presenca: 0,
        diasConsecutivosAusentes: 0,
        ultimaPresenca: '',
        historico: []
      };
    }
  },

  // ✅ Calcular frequência por turma (VERSÃO CORRIGIDA)
  async getFrequenciaPorTurma(turma_id: string, periodoDias?: number) {
    try {
      // 1. Buscar alunos da turma
      const alunos = await alunosService.getAlunosPorTurma(turma_id);
      
      // 2. Buscar todas as frequências de uma vez
      const todasFrequencias = await this.getAllFrequencias();
      
      // 3. Filtrar frequências dos alunos da turma
      const frequenciasTurma: Frequencia[] = [];
      const alunosIds = alunos.map(a => a.id);
      
      for (const freq of todasFrequencias) {
        if (alunosIds.includes(freq.aluno_id)) {
          // Se períodoDias foi especificado, filtrar por data
          if (periodoDias) {
            const dataFrequencia = new Date(freq.data_aula);
            const hoje = new Date();
            const limite = new Date(hoje);
            limite.setDate(limite.getDate() - periodoDias);
            
            if (dataFrequencia >= limite) {
              frequenciasTurma.push(freq);
            }
          } else {
            frequenciasTurma.push(freq);
          }
        }
      }

      // 4. Calcular estatísticas gerais da turma
      const stats = {
        total: frequenciasTurma.length,
        presentes: frequenciasTurma.filter(f => f.presente).length,
        ausentes: frequenciasTurma.filter(f => !f.presente).length,
        taxa_presenca: 0,
        // Estatísticas adicionais para turma:
        totalAlunos: alunos.length,
        alunosComFrequencia: new Set(frequenciasTurma.map(f => f.aluno_id)).size,
        ultimaAtualizacao: '',
        mediaPresencaPorAluno: 0,
        alunosCriticos: 0,
        historicoTurma: frequenciasTurma.slice(0, 20) // Últimos 20 registros
      };

      stats.taxa_presenca = stats.total > 0 
        ? (stats.presentes / stats.total) * 100 
        : 0;

      // Encontrar data da última frequência registrada na turma
      if (frequenciasTurma.length > 0) {
        frequenciasTurma.sort((a, b) => new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime());
        stats.ultimaAtualizacao = frequenciasTurma[0].data_aula;
      }

      // Calcular média de presença por aluno
      if (stats.alunosComFrequencia > 0) {
        stats.mediaPresencaPorAluno = stats.presentes / stats.alunosComFrequencia;
      }

      // Identificar alunos críticos (baixa frequência)
      // Para isso, precisamos calcular por aluno
      const estatisticasPorAluno = await Promise.all(
        alunos.map(async aluno => {
          const statsAluno = await this.getFrequenciaAluno(aluno.id, periodoDias);
          return { alunoId: aluno.id, taxa: statsAluno.taxa_presenca };
        })
      );
      
      stats.alunosCriticos = estatisticasPorAluno.filter(a => a.taxa < 70).length;

      return stats;

    } catch (error) {
      console.error('❌ Erro ao calcular frequência da turma:', error);
      return {
        total: 0,
        presentes: 0,
        ausentes: 0,
        taxa_presenca: 0,
        totalAlunos: 0,
        alunosComFrequencia: 0,
        ultimaAtualizacao: '',
        mediaPresencaPorAluno: 0,
        alunosCriticos: 0,
        historicoTurma: []
      };
    }
  },


  // ✅ Verificar se frequência já foi registrada para a aula
  async verificarFrequenciaRegistrada(aulaId: string): Promise<boolean> {
    try {
      const frequencias = await db.frequencias
        .where('aula_id')
        .equals(aulaId)
        .and(freq => !freq.deleted)
        .count();
      
      return frequencias > 0;

    } catch (error) {
      console.error('❌ Erro ao verificar frequência registrada:', error);
      return false;
    }
  },

  // ✅ Obter alunos sem frequência registrada para a aula
  async getAlunosSemFrequencia(aulaId: string, alunosTurma: string[]): Promise<string[]> {
    try {
      const frequencias = await this.getFrequenciaPorAula(aulaId);
      const alunosComFrequencia = new Set(frequencias.map(f => f.aluno_id));
      
      return alunosTurma.filter(alunoId => !alunosComFrequencia.has(alunoId));

    } catch (error) {
      console.error('❌ Erro ao buscar alunos sem frequência:', error);
      return [];
    }
  },

  // ✅ Verificar saúde do banco de frequências
  async checkDatabaseHealth() {
    try {
      const frequenciaCount = await db.frequencias.count();
      const queueCount = await db.syncQueue
        .where('table')
        .equals('frequencias')
        .and(item => item.status === 'pending')
        .count();
      
      const frequenciasAtivas = (await this.getAllFrequencias()).length;
      
      // Calcular taxa de presença geral
      const todasFrequencias = await this.getAllFrequencias();
      const presentes = todasFrequencias.filter(f => f.presente).length;
      const taxaPresenca = todasFrequencias.length > 0 
        ? (presentes / todasFrequencias.length) * 100 
        : 0;
      
      return {
        frequenciasTotal: frequenciaCount,
        frequenciasAtivas: frequenciasAtivas,
        pendentes: queueCount,
        taxaPresencaGeral: Math.round(taxaPresenca * 100) / 100,
        online: navigator.onLine,
        bancoAberto: db.isOpen(),
        duplicatas: frequenciaCount - frequenciasAtivas // Frequências deletadas
      };
    } catch (error: any) {
      return {
        error: error.message,
        bancoAberto: false
      };
    }
  },

  // ✅ Estatísticas de frequências
  async getEstatisticas() {
    try {
      const todasFrequencias = await this.getAllFrequencias();
      
      // Agrupar por data
      const porData: Record<string, { presentes: number; total: number }> = {};
      let totalPresencas = 0;
      let totalRegistros = 0;
      
      todasFrequencias.forEach(freq => {
        const data = freq.data_aula;
        if (!porData[data]) {
          porData[data] = { presentes: 0, total: 0 };
        }
        
        porData[data].total++;
        totalRegistros++;
        
        if (freq.presente) {
          porData[data].presentes++;
          totalPresencas++;
        }
      });
      
      // Calcular taxa por data
      const taxasPorData: Record<string, number> = {};
      Object.entries(porData).forEach(([data, stats]) => {
        taxasPorData[data] = stats.total > 0 
          ? (stats.presentes / stats.total) * 100 
          : 0;
      });
      
      return {
        totalRegistros,
        totalPresencas,
        taxaPresencaGeral: totalRegistros > 0 ? (totalPresencas / totalRegistros) * 100 : 0,
        porData: taxasPorData,
        datasComRegistro: Object.keys(porData).length,
        ultimaAtualizacao: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao gerar estatísticas:', error);
      return {
        totalRegistros: 0,
        totalPresencas: 0,
        taxaPresencaGeral: 0,
        porData: {},
        datasComRegistro: 0,
        ultimaAtualizacao: new Date().toISOString()
      };
    }
  },

  // ✅ Exportar dados de frequência
  async exportarDados(inicio: Date, fim: Date): Promise<any[]> {
    try {
      const todasFrequencias = await this.getAllFrequencias();
      
      return todasFrequencias.filter(freq => {
        const dataFreq = new Date(freq.data_aula);
        return dataFreq >= inicio && dataFreq <= fim;
      }).map(freq => ({
        id: freq.id,
        aula_id: freq.aula_id,
        aluno_id: freq.aluno_id,
        data_aula: freq.data_aula,
        presente: freq.presente,
        justificativa: freq.justificativa,
        created_at: freq.created_at,
        sync_status: freq.sync_status
      }));

    } catch (error) {
      console.error('❌ Erro ao exportar dados:', error);
      return [];
    }
  }
};