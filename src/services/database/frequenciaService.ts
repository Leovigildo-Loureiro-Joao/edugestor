
import { supabase } from '../database/db';
import db from './db';
import { Frequencia, FrequenciaData, RegistroFrequenciaLote } from '../../types/frequencia';
import { syncManager } from './syncManager';
import { alunosService } from './alunosService';
import { configService } from './config';
import { aulaService } from './aulaService';
import { Aula } from '../../types/aula';
import { instituicaoIdValue } from '../../utils/getInstituicaoID';
import type { SyncQueueItem } from '../../types/base';
import { emitDbChanged } from '../../utils/emitPendingSync';
const generateUniqueId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const frequenciaService = {
  async ensureInstituicaoIdNasFrequencias() {
    const instituicao_id = instituicaoIdValue();
    if (!instituicao_id) return { atualizadas: 0 };

    const now = new Date().toISOString();
    const frequenciasSemInstituicao = await db.frequencias
      .filter((freq) => !freq.deleted && !freq.instituicao_id)
      .toArray();

    if (frequenciasSemInstituicao.length === 0) return { atualizadas: 0 };

    await db.transaction('rw', db.frequencias, db.syncQueue, async () => {
      for (const freq of frequenciasSemInstituicao) {
        await db.frequencias.update(freq.id, {
          instituicao_id,
          updated_at: now,
          sync_status: 'pending'
        });

        const hasPendingDelete = await db.syncQueue
          .where('table')
          .equals('frequencias')
          .filter(
            (item) =>
              item.record_id === freq.id &&
              item.operation === 'delete' &&
              item.status === 'pending' &&
              item.instituicao_id === instituicao_id
          )
          .first();

        if (hasPendingDelete) continue;

        const hasPendingUpsert = await db.syncQueue
          .where('table')
          .equals('frequencias')
          .filter(
            (item) =>
              item.record_id === freq.id &&
              item.operation === 'upsert' &&
              item.status === 'pending' &&
              item.instituicao_id === instituicao_id
          )
          .first();

        if (!hasPendingUpsert) {
          await db.syncQueue.add({
            table: 'frequencias',
            record_id: freq.id,
            instituicao_id,
            operation: 'upsert',
            status: 'pending',
            created_at: now
          });
        }
      }
    });

    return { atualizadas: frequenciasSemInstituicao.length };
  },

  
  async registrarFrequenciaLote(registro: RegistroFrequenciaLote): Promise<string[]> {
    try {
      const ids: string[] = [];
      const now = new Date().toISOString();
      const dataAula = registro.data_aula || new Date().toISOString().split('T')[0];

      const instituicao_id = instituicaoIdValue();
      if (!instituicao_id) {
        throw new Error('instituicao_id ausente ao registrar frequência.');
      }
      const frequenciasToSave: Frequencia[] = [];

      const queueToSave: SyncQueueItem[] = [];

      for (const registroAluno of registro.registros) {
        const id = generateUniqueId();
        ids.push(id);

        frequenciasToSave.push({
          id,
          instituicao_id,
          aula_id: registro.aula_id,
          aluno_id: registroAluno.aluno_id,
          data_aula: dataAula,
          presente: registroAluno.presente,
          atraso: registroAluno.atraso || false,
          justificativa: registroAluno.justificativa || '',
          created_at: now,
          updated_at: now,
          sync_status: 'pending',
          deleted: false,
        } as Frequencia);

        queueToSave.push({
          table: 'frequencias',
          record_id: id,
          instituicao_id,
          operation: 'upsert',
          status: 'pending',
          created_at: now
        } as SyncQueueItem);
      }

      await db.transaction('rw', db.frequencias, db.syncQueue, async () => {
        await db.frequencias.bulkPut(frequenciasToSave);
        await db.syncQueue.bulkAdd(queueToSave);
      });

      await this.updateEnrollmentStatusFromAttendance(
        registro.registros.map((item) => item.aluno_id)
      );

      return ids;
      
    } catch (error) {
      console.error('❌ Erro ao registrar frequências em lote:', error);
      throw error;
    }
  },

  async deleteFrequenciaByAluno(alunoId: string) {
    try {
      const frequencias = await this.getByAluno(alunoId);

      for (const freq of frequencias) {
        await db.frequencias.update(freq.id, {
          deleted: true,
          updated_at: new Date().toISOString(),
          sync_status: 'pending'
        });
        
        
        await this.markForSync(freq.id, 'delete');
      }
      
      } catch (error) {
      console.error('❌ Erro ao deletar frequências do aluno:', error);
      throw error;
    }
  },

  
  async getAllFrequencias(): Promise<Frequencia[]> {
    try {
      const todasFrequencias = await db.frequencias.toArray();
      const activeInstituicaoId = instituicaoIdValue() || '';
      
      
      const frequenciasAtivas = todasFrequencias.filter(freq => !freq.deleted&&freq.instituicao_id==activeInstituicaoId);
      
      
      frequenciasAtivas.sort((a, b) => 
        new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime()
      );
      
      return frequenciasAtivas;
    } catch (error) {
      console.error('❌ Erro ao buscar frequências:', error);
      return [];
    }
  },

    async syncFrequencias() {
      if(navigator.onLine) {
        await this.ensureInstituicaoIdNasFrequencias();
        return Promise.all([syncManager.uploadTableBatch('frequencias'),
          syncManager.downloadTableBatch('frequencias', new Date(0))
        ])
      }
      throw new Error("sem net")
      
    },
  
  
   async markForSync(recordId: string, operation: 'upsert' | 'delete') {
    await db.syncQueue.add({
      table: 'frequencias',
      record_id: recordId,
      instituicao_id:instituicaoIdValue(),
      operation,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  },

  
  async getFrequenciaPorAula(aulaId: string): Promise<Frequencia[]> {
    try {
      const frequencias = await db.frequencias
        .where('aula_id')
        .equals(aulaId)
        .and(freq => !freq.deleted)
        .toArray();
      
      return frequencias.sort((a, b) => 
        (a.aluno_id || '').localeCompare(b.aluno_id || '')
      );

    } catch (error) {
      console.error('❌ Erro ao buscar frequências da aula:', error);
      return [];
    }
  },

  
  async getByAluno(alunoId: string, dias?: number): Promise<Frequencia[]> {
    try {
      let frequencias = await db.frequencias
        .where('aluno_id')
        .equals(alunoId)
        .and(freq => !freq.deleted)
        .toArray();

      const aulasDisciplina:Aula[] = []
      for (const freque of frequencias) {
        const aula = await aulaService.getAulaById(freque.aula_id);
        if (aula) {
          aulasDisciplina.push(aula);
        }
      }
      
      if (dias) {
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - dias);
        
        frequencias = frequencias.filter(freq => 
          new Date(freq.data_aula) >= dataLimite
        );
      }
      
      
      
      return frequencias.map((p)=>{
        let aula:Aula|undefined= aulasDisciplina.find((aula)=>p.aula_id==aula.id)
        if(aula){
          const disciplina=aula.disciplina
          return {
            ...p,
            disciplina
          }  
        } else {
          throw new Error('Aula não encontrada para a frequência.');
        }
      }).sort((a, b) => 
        new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime()
      );

    } catch (error) {
      console.error('❌ Erro ao buscar frequências do aluno:', error);
      return [];
    }
  },

  
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

  
  async updateFrequencia(id: string, updates: Partial<Frequencia>) {
    try {
      const updated_at = new Date().toISOString();
      
      await db.frequencias.update(id, {
        ...updates,
        updated_at,
        sync_status: 'pending' as const
      });

      
      await db.syncQueue.add({
        table: 'frequencias',
        record_id: id,
        instituicao_id:instituicaoIdValue(),
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });

      const frequenciaAtualizada = await db.frequencias.get(id);
      if (frequenciaAtualizada?.aluno_id) {
        await this.updateEnrollmentStatusFromAttendance([frequenciaAtualizada.aluno_id]);
      }
      
      return frequenciaAtualizada;
      
    } catch (error) {
      console.error('Erro ao atualizar frequência:', error);
      throw error;
    }
  },

  
  async deleteFrequencia(id: string) {
    try {
      const frequencia = await db.frequencias.get(id);
      if (!frequencia) return;

      if (frequencia.sync_status === 'synced' && !frequencia.id.startsWith('local_')) {
        
        await db.frequencias.update(id, { 
          deleted: true, 
          sync_status: 'pending_delete' as const,
          updated_at: new Date().toISOString()
        });
        
        await db.syncQueue.add({
          table: 'frequencias',
          record_id: id,
          instituicao_id:instituicaoIdValue(),
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        } else {
        
        await db.frequencias.delete(id);
        
        
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();
          
        }
      
      if (frequencia.aluno_id) {
        await this.updateEnrollmentStatusFromAttendance([frequencia.aluno_id]);
      }
      
    } catch (error) {
      console.error('Erro ao deletar frequência:', error);
      throw error;
    }
  },

  
  async updateEnrollmentStatusFromAttendance(alunoIds: string[]) {
    const uniqueIds = Array.from(new Set(alunoIds.filter(Boolean)));
    if (uniqueIds.length === 0) return { updated: 0 };

    const instituicaoId = instituicaoIdValue() || '';
    const configAcademica = await configService.getAcademyConfig();
    const maxFaltas = Number(configAcademica?.maxFaltasPermitidas || 0);
    const now = new Date().toISOString();

    let updated = 0;

    await db.transaction('rw', db.alunos, db.frequencias, db.syncQueue, async () => {
      for (const alunoId of uniqueIds) {
        const aluno = await db.alunos.get(alunoId);
        if (!aluno || aluno.deleted) continue;
        if (instituicaoId && aluno.instituicao_id !== instituicaoId) continue;

        const frequencias = await db.frequencias
          .where('aluno_id')
          .equals(alunoId)
          .and((freq) => !freq.deleted)
          .toArray();

        const temPresenca = frequencias.some((freq) => freq.presente);
        const totalFaltas = frequencias.filter((freq) => !freq.presente).length;

        let novoEstado = aluno.estado;

        if (aluno.tipo_matricula === 'reforco_personalizado') {
          if (temPresenca && aluno.estado !== 'ativo' && aluno.estado !== 'transferido') {
            novoEstado = 'ativo';
          }
        } else if (aluno.tipo_matricula === 'regular') {
          if (
            maxFaltas > 0 &&
            totalFaltas >= maxFaltas &&
            !['desistente', 'transferido'].includes(aluno.estado)
          ) {
            novoEstado = 'desistente';
          }
        }

        if (novoEstado === aluno.estado) continue;

        await db.alunos.update(alunoId, {
          estado: novoEstado,
          updated_at: now,
          sync_status: 'pending'
        });

        await db.syncQueue.add({
          table: 'alunos',
          record_id: alunoId,
          instituicao_id: aluno.instituicao_id || instituicaoId,
          operation: 'upsert',
          status: 'pending',
          created_at: now
        });

        updated += 1;
      }
    });

    if (updated > 0) {
      emitDbChanged('alunos', 'attendance_status');
    }

    return { updated };
  },

  
  async deleteFrequenciasPorAula(aulaId: string) {
    try {
      const frequencias = await this.getFrequenciaPorAula(aulaId);
      
      for (const frequencia of frequencias) {
        await this.deleteFrequencia(frequencia.id);
      }
      
      return frequencias.length;
    } catch (error) {
      console.error('Erro ao deletar frequências da aula:', error);
      throw error;
    }
  },

  
  async getEstatisticasFrequencia(turmaId: string, mes?: string) {
    try {
      
      const todasFrequencias = await this.getAllFrequencias();
      
      
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
        historico: frequencias.slice(0, 10) 
      };

      stats.taxa_presenca = stats.total > 0 
        ? (stats.presentes / stats.total) * 100 
        : 0;

      
      const presencas = frequencias.filter(f => f.presente);
      if (presencas.length > 0) {
        
        presencas.sort((a, b) => new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime());
        stats.ultimaPresenca = presencas[0].data_aula;
      }

      
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

  
  async getFrequenciaPorTurma(turma_id: string, periodoDias?: number) {
    try {
      
      const alunos = await alunosService.getAlunosPorTurma(turma_id);
      
      
      const todasFrequencias = await this.getAllFrequencias();
      
      
      const frequenciasTurma: Frequencia[] = [];
      const alunosIds = alunos.map(a => a.id);
      
      for (const freq of todasFrequencias) {
        if (alunosIds.includes(freq.aluno_id)) {
          
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

      
      const stats = {
        total: frequenciasTurma.length,
        presentes: frequenciasTurma.filter(f => f.presente).length,
        ausentes: frequenciasTurma.filter(f => !f.presente).length,
        taxa_presenca: 0,
        
        totalAlunos: alunos.length,
        alunosComFrequencia: new Set(frequenciasTurma.map(f => f.aluno_id)).size,
        ultimaAtualizacao: '',
        mediaPresencaPorAluno: 0,
        alunosCriticos: 0,
        historicoTurma: frequenciasTurma.slice(0, 20) 
      };

      stats.taxa_presenca = stats.total > 0 
        ? (stats.presentes / stats.total) * 100 
        : 0;

      
      if (frequenciasTurma.length > 0) {
        frequenciasTurma.sort((a, b) => new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime());
        stats.ultimaAtualizacao = frequenciasTurma[0].data_aula;
      }

      
      if (stats.alunosComFrequencia > 0) {
        stats.mediaPresencaPorAluno = stats.presentes / stats.alunosComFrequencia;
      }

      
      
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

  
  async checkDatabaseHealth() {
    try {
      const frequenciaCount = await db.frequencias.count();
      const queueCount = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoIdValue())
        .and(item => item.table === 'frequencias' && item.status === 'pending')
        .count();
      
      const frequenciasAtivas = (await this.getAllFrequencias()).length;
      
      
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
        duplicatas: frequenciaCount - frequenciasAtivas 
      };
    } catch (error: any) {
      return {
        error: error.message,
        bancoAberto: false
      };
    }
  },

  
  async getEstatisticas() {
    try {
      const todasFrequencias = await this.getAllFrequencias();
      const todasAulas = await aulaService.getAllAulas();
      const todosAlunos = await alunosService.getAllStudents();
      const turmasAtivas = [...new Set(todosAlunos.map((a) => a.turma_nome))];

      const aulasPendentes = todasAulas.reduce((acc, aula) => {
        const semRegistro = !aula.registro || aula.registro.length === 0;
        return acc + (semRegistro ? 1 : 0);
      }, 0);
      const aulasRegistradas = todasAulas.length > 0 ? todasAulas.length - aulasPendentes : 0;

      const parseData = (dataAula: string) => {
        const base = dataAula.includes("T") ? dataAula.split("T")[0] : dataAula;
        const date = new Date(base);
        return Number.isNaN(date.getTime()) ? null : date;
      };
      const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
      const addMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 1);

      let totalPresencas = 0;
      let totalRegistros = 0;
      const evolucaoMap = new Map<string, { soma: number; ausentes: number; presente: number }>();
      const datasValidas: Date[] = [];

      for (const freq of todasFrequencias) {
        const data = parseData(freq.data_aula);
        if (!data) continue;
        datasValidas.push(data);

        const mes = monthKey(data);
        if (!evolucaoMap.has(mes)) {
          evolucaoMap.set(mes, { soma: 0, ausentes: 0, presente: 0 });
        }
        const evol = evolucaoMap.get(mes)!;
        evol.soma += 1;
        evol.presente += freq.presente ? 1 : 0;
        evol.ausentes += freq.presente ? 0 : 1;

        totalRegistros += 1;
        if (freq.presente) totalPresencas += 1;
      }

      let evolucao: Array<{ data: string; presenca: number; ausencias: number }> = [];
      if (datasValidas.length > 0) {
        const ordenadas = [...datasValidas].sort((a, b) => a.getTime() - b.getTime());
        const inicio = monthStart(ordenadas[0]);
        const fim = monthStart(ordenadas[ordenadas.length - 1]);

        const meses: string[] = [];
        let cursor = inicio;
        while (cursor <= fim) {
          meses.push(monthKey(cursor));
          cursor = addMonth(cursor);
        }

        evolucao = meses.map((mes) => {
          const dados = evolucaoMap.get(mes) || { soma: 0, ausentes: 0, presente: 0 };
          const presenca = dados.soma > 0 ? (dados.presente / dados.soma) * 100 : 0;
          const ausencias = dados.soma > 0 ? (dados.ausentes / dados.soma) * 100 : 0;

          return {
            data: mes,
            presenca: Number(presenca.toFixed(1)),
            ausencias: Number(ausencias.toFixed(1))
          };
        });
      }

      return {
        totalAulas: todasAulas.length,
        totalAlunos: todosAlunos.length,
        totalRegistros,
        totalPresencas,
        turmasAtivas: turmasAtivas ? turmasAtivas.length : 0,
        taxaPresencaGeral: totalRegistros > 0 ? (totalPresencas / totalRegistros) * 100 : 0,
        taxaRegistro: todasAulas.length > 0 ? (aulasRegistradas / todasAulas.length) * 100 : 0,
        porData: evolucao,
        datasComRegistro: evolucaoMap.size,
        ultimaAtualizacao: new Date().toISOString(),
        aulasRegistradas,
        aulasPendentes
      };
    } catch (error) {
      console.error('❌ Erro ao gerar estatísticas:', error);
      return {
        totalAulas: 0,
        totalAlunos: 0,
        totalRegistros: 0,
        totalPresencas: 0,
        turmasAtivas: 0,
        taxaPresencaGeral: 0,
        taxaRegistro: 0,
        porData: [],
        datasComRegistro: 0,
        ultimaAtualizacao: new Date().toISOString(),
        aulasRegistradas: 0,
        aulasPendentes: 0
      };
    }
  },

  
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
