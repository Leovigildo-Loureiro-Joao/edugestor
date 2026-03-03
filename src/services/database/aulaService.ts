// services/database/aulaService
import { supabase } from '../database/db';
import db from './db';
import { Aula, AulaFormData } from '../../types/aula';
import { syncManager } from './syncManager';
import { Turma } from '../../types/turma';
import { frequenciaService, turmaService } from '.';
import { emitPendingSync } from '../../utils/emitPendingSync';
import { cacheManager } from './cacheManager';
import { getLastModifiedTimestamp } from '../../utils/getLastModifiedTimestamp';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';
import { generateUniqueId } from '../../utils/idGenarator';

const normalizeAulaField = (value?: string) => (value || '').trim().toLowerCase();
const normalizeAulaHora = (value?: string) => (value || '').trim().slice(0, 5);
const getAulaIdentityKey = (aulaData: AulaFormData, instituicaoId: string) =>
  [
    instituicaoId,
    aulaData.turma_id,
    (aulaData.data_aula || '').slice(0, 10),
    normalizeAulaHora(aulaData.hora_inicio),
    normalizeAulaHora(aulaData.hora_fim),
    normalizeAulaField(aulaData.disciplina)
  ].join('|');

const inFlightCriarAula = new Map<string, Promise<string>>();

export const aulaService = {
  async removerAulaDosPlanos(aulaId: string) {
    try {
      const planos = await db.plano_aulas
        .filter((plano) =>
          !plano.deleted &&
          Array.isArray(plano.aulas_geradas) &&
          plano.aulas_geradas.includes(aulaId)
        )
        .toArray();

      if (planos.length === 0) return;

      const now = new Date().toISOString();

      for (const plano of planos) {
        const aulasAtualizadas = (plano.aulas_geradas || []).filter((id) => id !== aulaId);

        await db.plano_aulas.update(plano.id, {
          aulas_geradas: aulasAtualizadas,
          updated_at: now,
          sync_status: 'pending'
        });

        const hasPendingUpsert = await db.syncQueue
          .where('table')
          .equals('plano_aulas')
          .filter(
            (item) =>
              item.instituicao_id === instituicaoIdValue() &&
              item.record_id === plano.id &&
              item.operation === 'upsert' &&
              item.status === 'pending'
          )
          .first();

        if (!hasPendingUpsert) {
          await db.syncQueue.add({
            table: 'plano_aulas',
            record_id: plano.id,
            instituicao_id:instituicaoIdValue(),
            operation: 'upsert',
            status: 'pending',
            created_at: now
          });
        }
      }

    } catch (error) {
      console.error('Erro ao remover aula dos planos:', error);
    }
  },

  // ✅ Criar aula localmente
  async criarAula(aulaData: AulaFormData): Promise<string> {
    const instituicao_id = instituicaoIdValue() || '';
    const identityKey = getAulaIdentityKey(aulaData, instituicao_id);

    const pending = inFlightCriarAula.get(identityKey);
    if (pending) return pending;

    const createPromise = (async () => {
      try {
        const existente = await db.aulas
          .where('turma_id')
          .equals(aulaData.turma_id)
          .and(
            (aula) =>
              !aula.deleted &&
              aula.instituicao_id === instituicao_id &&
              (aula.data_aula || '').slice(0, 10) === (aulaData.data_aula || '').slice(0, 10) &&
              normalizeAulaHora(aula.hora_inicio) === normalizeAulaHora(aulaData.hora_inicio) &&
              normalizeAulaHora(aula.hora_fim) === normalizeAulaHora(aulaData.hora_fim) &&
              normalizeAulaField(aula.disciplina) === normalizeAulaField(aulaData.disciplina)
          )
          .first();

        if (existente?.id) {
          console.warn('⚠️ Aula duplicada detectada, reutilizando registro existente:', existente.id);
          return existente.id;
        }

        const id = generateUniqueId();
        const now = new Date().toISOString();

        const aula = {
          ...aulaData,
          id,
          instituicao_id,
          created_at: now,
          updated_at: now,
          sync_status: 'pending',
          deleted: false,
        } as Aula;

        await db.aulas.put(aula);

        // Adicionar à fila de sincronização
        await db.syncQueue.add({
          table: 'aulas',
          record_id: id,
          instituicao_id: instituicaoIdValue(),
          operation: 'upsert',
          status: 'pending',
          created_at: now
        });

        return id;
      } catch (error) {
        console.error('❌ Erro ao salvar aula:', error);
        throw error;
      } finally {
        inFlightCriarAula.delete(identityKey);
      }
    })();

    inFlightCriarAula.set(identityKey, createPromise);
    return createPromise;
  },

  // ✅ Buscar todas as aulas
  async getAllAulas(): Promise<Aula[]> {
    try {
      const activeInstituicaoId = instituicaoIdValue() || '';
      const cacheScope = activeInstituicaoId || 'global';
      const CACHE_KEY = `aulas_all_${cacheScope}`;
            
      // 1. Criar versão de cache baseada em múltiplos fatores
      const [cursoCount, turmaCount, aulasCount, lastModified] = await Promise.all([
        db.cursos.count(),
        db.turmas.count(),
        db.aulas.count(),
        getLastModifiedTimestamp()
      ]);
      
      // 2. Criar chave de cache com versão
      const cacheVersion = `v${cursoCount}_${turmaCount}_${aulasCount}_${activeInstituicaoId}_${lastModified}`;
      const cacheKeyWithVersion = `${CACHE_KEY}_${cacheVersion}`;
      
      // 3. Tentar cache primeiro
      const cached = cacheManager.get(cacheKeyWithVersion);
      if (cached) {
        return cached;
      }
      
      const [todasAulas, todasTurmas, frequencia] = await Promise.all([
        db.aulas.toArray(),
        db.turmas.toArray(),
        frequenciaService.getAllFrequencias()
      ]);

      // Filtrar as não deletadas
      const turmaMap = new Map(todasTurmas.filter(turma => !turma.deleted).map(t => [t.id, t]));

      const aulasAtivas =todasAulas.filter(aula =>
        !aula.deleted &&
        (!activeInstituicaoId || aula.instituicao_id === activeInstituicaoId)
      )
      .sort((a, b) => 
        new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime()
      )
      .map((aulas)=>{
        const turma=turmaMap.get(aulas.turma_id)
        return {
          ...aulas,
          turmas:turma,
          registro:frequencia.filter((f)=>f.aula_id==aulas.id)
        }
      });
      const pendentesCount = aulasAtivas.filter(aula => 
        aula.sync_status === 'pending' || aula.sync_status === 'pending_delete'
      ).length;
      
      if (pendentesCount > 0) {
        emitPendingSync('aulas', pendentesCount);
      }
      cacheManager.set(cacheKeyWithVersion, aulasAtivas, {
        ttl: 5 * 60 * 1000,
        version: cacheVersion
      });
      return aulasAtivas
    } catch (error) {
      console.error('❌ Erro ao buscar aulas:', error);
      const activeInstituicaoId = instituicaoIdValue() || '';
      const cacheScope = activeInstituicaoId || 'global';
      const fallback = cacheManager.getLatest(`aulas_all_${cacheScope}`);
      if (fallback) {
        return fallback;
      }
      return [];
    }
  },

    async syncAulas() {
      if(navigator.onLine)
        return Promise.all([syncManager.uploadTableBatch('aulas'),
          syncManager.downloadTableBatch('aulas', new Date(0))
        ])
      throw new Error("sem net")
    },
  
  // ✅ Função auxiliar para marcar como pendente
   async markForSync(recordId: string, operation: 'upsert' | 'delete') {
    await db.syncQueue.add({
      table: 'aulas',
      instituicao_id:instituicaoIdValue(),
      record_id: recordId,
      operation,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  },

  // ✅ Buscar aulas recentes (com suporte offline)
  async getAulasRecentes(limite = 50): Promise<Aula[]> {
    try {
      const todasAulas = await this.getAllAulas();
      
      // Ordenar por data (mais recente primeiro) e limitar
      return todasAulas
        .sort((a, b) => new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime())
        .slice(0, limite);

    } catch (error) {
      console.error('❌ Erro ao buscar aulas recentes:', error);
      return [];
    }
  },

  // ✅ Atualizar aula localmente e marcar para sincronização
  async atualizarAula(id: string, updates: Partial<AulaFormData>):Promise<Aula> {
    try {
      const updated_at = new Date().toISOString();
      
      await (db.aulas as any).update(id, {
        ...updates ,
        sync_status: 'pending',
        instituicao_id:instituicaoIdValue(),
      });

      // Adicionar/atualizar na fila
      await db.syncQueue.add({
        table: 'aulas',
        record_id: id,
        instituicao_id:instituicaoIdValue(),
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });
      
      // Retornar a aula atualizada
      const aula = await db.aulas.get(id);
      if (!aula) {
        // caso não exista, joga erro para o chamador
        throw new Error(`Aula ${id} não encontrada`);
      }

      const turmas = await turmaService.getTurmaById(aula.turma_id);
      const registro = await frequenciaService.getFrequenciaPorAula(id);
      // após a checagem, `aula` não é mais undefined
      return { ...aula, turmas, registro } as Aula;
      
    } catch (error) {
      console.error('Erro ao atualizar aula:', error);
      throw error;
    }
  },

  async deletarAula(id: string) {
    try {
      const aula = await db.aulas.get(id);
      if (!aula) return;
      await this.removerAulaDosPlanos(id);

      if (aula.sync_status === 'synced' && !aula.id.startsWith('local_')) {
        await (db.aulas as any).update(id, { 
          deleted: true, 
          sync_status: 'pending_delete' as const,
          updated_at: new Date().toISOString()
        });
        
        await db.syncQueue.add({
          table: 'aulas',
          record_id: id,instituicao_id:instituicaoIdValue(),
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        } else {
        await db.aulas.delete(id);
        
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();
          
        }
      
    } catch (error) {
      console.error('Erro ao deletar aula:', error);
      throw error;
    }
  },

async getAulasPorTurma(turmaId: string): Promise<Aula[]> {
  try {
    const aulas = await db.aulas
      .where('turma_id')
      .equals(turmaId)
      .and(aula => !aula.deleted)
      .toArray();
    
    if (aulas.length === 0) return [];

    const turma = await turmaService.getTurmaById(turmaId);
    
    const todasFrequencias = await frequenciaService.getAllFrequencias();
    const aulasCompletas = aulas.map((aula): Aula => {
      const frequenciasAula = todasFrequencias.filter(freq => freq.aula_id === aula.id);
            return {
        ...aula,
        turmas: turma, 
        registro: frequenciasAula,
      };
    });

    return aulasCompletas.sort((a, b) => 
      new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime()
    );

  } catch (error) {
    console.error('❌ Erro ao buscar aulas por turma:', error);
    return [];
  }
},

  // ✅ Buscar aula por ID
  async getAulaById(id: string): Promise<Aula | undefined> {
    try {
      const aula = await db.aulas.get(id);
      return aula && !aula.deleted ? aula : undefined;
    } catch (error) {
      console.error('Erro ao buscar aula por ID:', error);
      return undefined;
    }
  },

  // ✅ Buscar aulas por período
  async getAulasPorPeriodo(inicio: Date, fim: Date): Promise<Aula[]> {
    try {
      const todasAulas = await this.getAllAulas();
      
      return todasAulas.filter(aula => {
        const dataAula = new Date(aula.data_aula);
        return dataAula >= inicio && dataAula <= fim;
      }).sort((a, b) => 
        new Date(a.data_aula).getTime() - new Date(b.data_aula).getTime()
      );

    } catch (error) {
      console.error('❌ Erro ao buscar aulas por período:', error);
      return [];
    }
  },

  // ✅ Buscar aulas do dia
  async getAulasDoDia(data: Date = new Date()): Promise<Aula[]> {
    try {
      const inicioDia = new Date(data.setHours(0, 0, 0, 0));
      const fimDia = new Date(data.setHours(23, 59, 59, 999));
      
      return this.getAulasPorPeriodo(inicioDia, fimDia);

    } catch (error) {
      console.error('❌ Erro ao buscar aulas do dia:', error);
      return [];
    }
  },

  // ✅ Buscar aulas da semana
  async getAulasDaSemana(data: Date = new Date()): Promise<Aula[]> {
    try {
      const dia = data.getDay();
      const inicioSemana = new Date(data);
      inicioSemana.setDate(data.getDate() - dia);
      inicioSemana.setHours(0, 0, 0, 0);
      
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 6);
      fimSemana.setHours(23, 59, 59, 999);
      
      return this.getAulasPorPeriodo(inicioSemana, fimSemana);

    } catch (error) {
      console.error('❌ Erro ao buscar aulas da semana:', error);
      return [];
    }
  },

  // ✅ Verificar se já existe aula no mesmo horário
  async verificarConflitoHorario(
    turmaId: string, 
    dataAula: Date, 
    horaInicio: string, 
    horaFim: string, 
    excluirId?: string
  ): Promise<boolean> {
    try {
      const aulasTurma = await this.getAulasPorTurma(turmaId);
      
      return aulasTurma.some(aula => {
        // Pular a própria aula se estiver atualizando
        if (excluirId && aula.id === excluirId) return false;
        
        // Verificar se é no mesmo dia
        const dataAulaExistente = new Date(aula.data_aula);
        const dataNovaAula = new Date(dataAula);
        
        if (dataAulaExistente.toDateString() !== dataNovaAula.toDateString()) {
          return false;
        }
        
        // Verificar conflito de horário
        const inicioExistente = aula.hora_inicio;
        const fimExistente = aula.hora_fim;
        
        // Converte horários para minutos do dia
        const toMinutes = (time: string) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };
        
        const inicioNovo = toMinutes(horaInicio);
        const fimNovo = toMinutes(horaFim);
        const inicioExistenteMin = toMinutes(inicioExistente);
        const fimExistenteMin = toMinutes(fimExistente);
        
        // Verifica sobreposição
        return (
          (inicioNovo >= inicioExistenteMin && inicioNovo < fimExistenteMin) ||
          (fimNovo > inicioExistenteMin && fimNovo <= fimExistenteMin) ||
          (inicioNovo <= inicioExistenteMin && fimNovo >= fimExistenteMin)
        );
      });

    } catch (error) {
      console.error('❌ Erro ao verificar conflito de horário:', error);
      return false;
    }
  },

  // ✅ Verificar saúde do banco de aulas
  async checkDatabaseHealth() {
    try {
      const aulaCount = await db.aulas.count();
      const queueCount = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoIdValue())
        .and(item => item.table === 'aulas' && item.status === 'pending')
        .count();
      
      const aulasAtivas = (await this.getAllAulas()).length;
      
      return {
        aulasTotal: aulaCount,
        aulasAtivas: aulasAtivas,
        pendentes: queueCount,
        online: navigator.onLine,
        bancoAberto: db.isOpen(),
        conflitos: aulaCount - aulasAtivas // Aulas deletadas (soft delete)
      };
    } catch (error: any) {
      return {
        error: error.message,
        bancoAberto: false
      };
    }
  },

  // ✅ Estatísticas de aulas
  async getEstatisticas() {
    try {
      const todasAulas = await this.getAllAulas();
      
      // Agrupar por turma
      const porTurma: Record<string, number> = {};
      const porMes: Record<string, number> = {};
      const statusV=['planeada', 'ministrada' , 'cancelada' , 'adiada']
      const porStatus: Record<string, number> = {}
      statusV.forEach(v=> {
        porStatus[v]=0;
      })
      const topTurmas: Turma[] = [];
      let turmas= await turmaService.getTurmas()
      todasAulas.forEach(aula => {
        // Por turma
        const turmaKey = aula.turma_id || 'sem_turma';
        porTurma[turmaKey] = (porTurma[turmaKey] || 0) + 1;

        const statusKey = aula.status || 'sem_status'
        porStatus[statusKey] = (porStatus[statusKey] || 0) + 1;
        
        // Por mês
        const data = new Date(aula.data_aula);
        const mesKey = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
        porMes[mesKey] = (porMes[mesKey] || 0) + 1;
      });
      turmas= turmas.sort((a,b)=> ((a.aulas??[]).length)-((b.aulas??[]).length));
      return {
        total: todasAulas.length,
        porTurma,
        porMes,
        porStatus,
        topTurmas:turmas,
        ultimaAtualizacao: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao gerar estatísticas:', error);
      return {
        total: 0,
        porTurma: {},
        porMes: {},
        porStatus:{},
        topTurmas:[],
        ultimaAtualizacao: new Date().toISOString()
      };
    }
  }
};
