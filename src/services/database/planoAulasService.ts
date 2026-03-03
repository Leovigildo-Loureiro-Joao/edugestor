// services/database/planoAulasService
import { BaseEntity } from '../../types/base';
import { aulaService } from './aulaService';
import db, { supabase } from './db';
import { syncManager } from './syncManager';
import { generateUniqueId } from '../../utils/idGenarator';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';
import { PlanoAula } from '../../types/aula';


type PlanoAulaCreateInput = Omit<PlanoAula, 'id' | 'created_at' | 'updated_at' | 'aulas_geradas' | 'sync_status' | 'deleted'>;

const mapDiaSemana = (date: Date): 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo' => {
  const dia = date.getDay();
  const dias: Array<'domingo' | 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado'> = [
    'domingo',
    'segunda',
    'terca',
    'quarta',
    'quinta',
    'sexta',
    'sabado'
  ];
  return dias[dia];
};

  const hasPlanoId = (value: unknown): value is { id: string } =>
  !!value &&
  typeof value === 'object' &&
  'id' in value &&
  typeof (value as { id?: unknown }).id === 'string';

const diaSemanaToNumber = (
  dia: 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo'
): number => {
  const dias: Record<'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo', number> = {
    domingo: 0,
    segunda: 1,
    terca: 2,
    quarta: 3,
    quinta: 4,
    sexta: 5,
    sabado: 6
  };

  return dias[dia];
};

const normalizeTurno = (turno?: string): string =>
  String(turno || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const planoAulaService = {
  normalizarIdsAulas(aulasGeradas: string[] = []): string[] {
    return Array.from(
      new Set(
        aulasGeradas
          .filter((id) => typeof id === 'string')
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      )
    );
  },

  async sanitizeAulasGeradasIds(aulasGeradas: string[] = []): Promise<string[]> {
    const idsNormalizados = this.normalizarIdsAulas(aulasGeradas);
    if (idsNormalizados.length === 0) return [];

    const aulas = await db.aulas
      .where('id')
      .anyOf(idsNormalizados)
      .filter((aula) => !aula.deleted)
      .toArray();

    const idsValidos = new Set(aulas.map((aula) => aula.id));
    return idsNormalizados.filter((id) => idsValidos.has(id));
  },

  areIdsIguais(idsA: string[] = [], idsB: string[] = []): boolean {
    if (idsA.length !== idsB.length) return false;
    return idsA.every((id, index) => id === idsB[index]);
  },

  async garantirPlanoNaSyncQueue(planoId: string, createdAt?: string) {
    const instituicaoId = instituicaoIdValue();
    const hasPendingUpsert = await db.syncQueue
      .where('table')
      .equals('plano_aulas')
      .filter(
        (item) =>
          item.instituicao_id === instituicaoId &&
          item.record_id === planoId &&
          item.operation === 'upsert' &&
          item.status === 'pending'
      )
      .first();

    if (hasPendingUpsert) return;

    await db.syncQueue.add({
      instituicao_id: instituicaoId,
      table: 'plano_aulas',
      record_id: planoId,
      operation: 'upsert',
      status: 'pending',
      created_at: createdAt || new Date().toISOString()
    });
  },

  async limparIdsFantasmasDoPlano(plano: PlanoAula, persist = true): Promise<PlanoAula> {
    const idsOriginais = this.normalizarIdsAulas(plano.aulas_geradas || []);
    const idsSanitizados = await this.sanitizeAulasGeradasIds(idsOriginais);

    if (this.areIdsIguais(idsOriginais, idsSanitizados)) {
      return {
        ...plano,
        aulas_geradas: idsOriginais
      };
    }

    const now = new Date().toISOString();
    const planoLimpo: PlanoAula = {
      ...plano,
      aulas_geradas: idsSanitizados,
      updated_at: now,
      sync_status: plano.sync_status === 'pending_delete' ? plano.sync_status : 'pending'
    };

    if (persist && !plano.deleted) {
      await db.plano_aulas.update(plano.id, {
        aulas_geradas: idsSanitizados,
        updated_at: now,
        sync_status: plano.sync_status === 'pending_delete' ? plano.sync_status : 'pending'
      });

      if (plano.sync_status !== 'pending_delete') {
        await this.garantirPlanoNaSyncQueue(plano.id, now);
      }
    }

    return planoLimpo;
  },

  // ========== CRUD (Offline First) ==========
  async criarPlano(planoData: PlanoAulaCreateInput): Promise<PlanoAula> {
    const id = generateUniqueId();
    const now = new Date().toISOString();

    const [instituicaoId, profileId] = await Promise.all([
      this.getEscolaId(),
      this.getUsuarioId()
    ]);

    const plano: PlanoAula = {
      ...planoData,
      id,
      aulas_geradas: [],
      instituicao_id:  instituicaoId,
      profile_id:  profileId,
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
      deleted: false
    };

    await db.plano_aulas.put(plano);

    await db.syncQueue.add({
      table: 'plano_aulas',
      record_id: id,
      instituicao_id:instituicaoIdValue(),
      operation: 'upsert',
      status: 'pending',
      created_at: now
    });

    return plano;
  },

  async deletarPlanoAula(id: string) {
    try {
      const aula = await db.plano_aulas.get(id);
      if (!aula) return;

      if (aula.sync_status === 'synced' && !aula.id.startsWith('local_')) {
        await db.plano_aulas.update(id, { 
          deleted: true, 
          sync_status: 'pending_delete' as const,
          updated_at: new Date().toISOString()
        });
        
        await db.syncQueue.add({
          table: 'plano_aulas',
          record_id: id,
          instituicao_id:instituicaoIdValue(),
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        } else {
        await db.plano_aulas.delete(id);
        
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();
          
        }
      
    } catch (error) {
      console.error('Erro ao deletar Plano de Aula:', error);
      throw error;
    }
  },

  async atualizarPlano(id: string, updates: Partial<PlanoAula>): Promise<PlanoAula> {
    const planoAtual = await db.plano_aulas.get(id);
    if (!planoAtual || planoAtual.deleted) {
      throw new Error('Plano não encontrado');
    }
    const [instituicaoId, profileId] = await Promise.all([
      this.getEscolaId(),
      this.getUsuarioId()
    ]);

    const updatedAt = new Date().toISOString();
    const idsBase = updates.aulas_geradas ?? planoAtual.aulas_geradas ?? [];
    const aulasGeradasSanitizadas = await this.sanitizeAulasGeradasIds(idsBase);

    await db.plano_aulas.update(id, {
      ...updates,
      aulas_geradas: aulasGeradasSanitizadas,
      instituicao_id: instituicaoId,
      profile_id: profileId,
      updated_at: updatedAt,
      sync_status: 'pending'
    });

    await db.syncQueue.add({
      table: 'plano_aulas',
      record_id: id,
      instituicao_id:instituicaoIdValue(),
      operation: 'upsert',
      status: 'pending',
      created_at: updatedAt
    });

    const planoAtualizado = await db.plano_aulas.get(id);
    if (!planoAtualizado) {
      throw new Error('Erro ao atualizar plano');
    }

    return planoAtualizado;
  },

  async getPlano(id: string): Promise<PlanoAula | null> {
    const plano = await db.plano_aulas.get(id);
    if (!plano || plano.deleted) return null;
    return this.limparIdsFantasmasDoPlano(plano, true);
  },

  async getPlanos(filters?: {
    disciplina?: string;
    tipo?: string;
    status?: string;
    turma_id?: string;
  }): Promise<PlanoAula[]> {
    const planos = await db.plano_aulas.toArray();
    const planosFiltrados = planos
      .filter((plano) => {
        if (plano.deleted) return false;
        if (filters?.disciplina && plano.disciplina !== filters.disciplina) return false;
        if (filters?.tipo && plano.tipo !== filters.tipo) return false;
        if (filters?.status && plano.status !== filters.status) return false;
        if (filters?.turma_id && !plano.turma_ids.includes(filters.turma_id)) return false;
        return true;
      });

    const planosSemFantasmas = await Promise.all(
      planosFiltrados.map((plano) => this.limparIdsFantasmasDoPlano(plano, true))
    );

    const semDuplicadosMap = new Map<string, PlanoAula>();
    const idsDuplicadosLocais: string[] = [];

    const criarFingerprint = (plano: PlanoAula) =>
      JSON.stringify({
        titulo: plano.titulo,
        disciplina: plano.disciplina,
        tipo: plano.tipo,
        created_at: plano.created_at,
        data_inicio: plano.data_inicio || null,
        data_fim: plano.data_fim || null
      });

    for (const plano of planosSemFantasmas) {
      const key = criarFingerprint(plano);
      const existente = semDuplicadosMap.get(key);

      if (!existente) {
        semDuplicadosMap.set(key, plano);
        continue;
      }

      const existenteEhLocal = existente.id.startsWith('local_');
      const atualEhLocal = plano.id.startsWith('local_');

      if (existenteEhLocal && !atualEhLocal) {
        idsDuplicadosLocais.push(existente.id);
        semDuplicadosMap.set(key, plano);
        continue;
      }

      if (!existenteEhLocal && atualEhLocal) {
        idsDuplicadosLocais.push(plano.id);
        continue;
      }

      const dataAtual = new Date(plano.updated_at || plano.created_at || 0).getTime();
      const dataExistente = new Date(existente.updated_at || existente.created_at || 0).getTime();

      if (dataAtual > dataExistente) {
        idsDuplicadosLocais.push(existente.id);
        semDuplicadosMap.set(key, plano);
      } else {
        idsDuplicadosLocais.push(plano.id);
      }
    }

    if (idsDuplicadosLocais.length > 0) {
      const unicos = Array.from(new Set(idsDuplicadosLocais)).filter((id) => id.startsWith('local_'));
      if (unicos.length > 0) {
        await db.plano_aulas.bulkDelete(unicos);
        await db.syncQueue
          .where('table')
          .equals('plano_aulas')
          .filter((item) => item.instituicao_id === instituicaoIdValue() && unicos.includes(item.record_id))
          .delete();
      }
    }

    return Array.from(semDuplicadosMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async syncPlanos() {
    if (!navigator.onLine) {
      throw new Error('Sem conexão com internet');
    }

    return Promise.all([
      syncManager.uploadTableBatch('plano_aulas'),
      syncManager.downloadTableBatch('plano_aulas', new Date(0))
    ]);
  },

async gerarAulasDoPlano(planoIdOrData: string | PlanoAulaCreateInput | Partial<PlanoAula>): Promise<string[]> {
  let plano: PlanoAula | null = null;

  if (typeof planoIdOrData === 'string') {
    plano = await this.getPlano(planoIdOrData);
  } else if (hasPlanoId(planoIdOrData)) {
    plano = await this.getPlano(planoIdOrData.id);
  } else {
    plano = await this.criarPlano(planoIdOrData as PlanoAulaCreateInput);
  }


    if (!plano) throw new Error('Plano não encontrado');

    const aulasGeradas: string[] = [];
    const aulasJaAssociadas = Array.isArray(plano.aulas_geradas) ? [...plano.aulas_geradas] : [];
    const hoje = new Date();
    const dataInicio = plano.data_inicio ? new Date(plano.data_inicio) : hoje;

    for (const turmaId of plano.turma_ids) {
      const turma = await db.turmas.get(turmaId);
      const horariosTurma = await this.getHorariosDaTurmaParaDisciplina(turmaId, plano.disciplina);

      for (let i = 0; i < plano.aulas_planeadas; i++) {

        const conteudo = plano.conteudos[i] || plano.conteudos[0];
        const dataBase = this.calcularDataPorFrequencia(dataInicio, i, plano.frequencia);
        const horarioSelecionado = horariosTurma.length > 0 ? horariosTurma[i % horariosTurma.length] : null;
        const horarioPadraoTurno = this.getHorarioPadraoPorTurno(turma?.turno);
        const dataAula = horarioSelecionado
          ? this.ajustarDataParaDiaSemana(dataBase, horarioSelecionado.dia_semana)
          : dataBase;
        const horaInicio = horarioSelecionado?.hora_inicio || horarioPadraoTurno.hora_inicio;
        const horaFim =
          horarioSelecionado?.hora_fim ||
          horarioPadraoTurno.hora_fim ||
          this.calcularHoraFim(horaInicio, conteudo?.duracao || 45);

        const aulaData = {
          turma_id: turmaId,
          data_aula: dataAula.toISOString().split('T')[0],
          dia_semana: horarioSelecionado?.dia_semana || mapDiaSemana(dataAula),
          disciplina: plano.disciplina,
          hora_inicio: horaInicio,
          hora_fim: horaFim,
          tema_aula: `${plano.titulo} - Aula ${i + 1}: ${conteudo.titulo||""}`,
          conteudo_ministrado: conteudo?.descricao || plano.descricao,
          status: 'planeada' as const,
          objetivos_aprendizagem: plano.objetivos_aprendizagem
        };

        const aulaExistente = await this.buscarAulaDuplicada(aulaData);
        if (aulaExistente) {
          aulasJaAssociadas.push(aulaExistente.id);
          continue;
        }

        const aulaId = await aulaService.criarAula(aulaData);
        aulasGeradas.push(aulaId);
        aulasJaAssociadas.push(aulaId);
      }
    }

    // Atualizar plano com IDs das aulas geradas
    const aulasAssociadas = Array.from(new Set(aulasJaAssociadas));
    await this.atualizarPlano(plano.id, {
      aulas_geradas: aulasAssociadas,
      status: 'ativo'
    });

    return aulasGeradas;
  },

  async usarComoTemplate(planoId: string): Promise<Partial<PlanoAula>> {
    const plano = await this.getPlano(planoId);
    if (!plano) throw new Error('Plano não encontrado');

    // Remover campos que não devem ser copiados
    const { id, created_at, updated_at, aulas_geradas, sync_status, deleted, ...template } = plano;
    return template;
  },

  async arquivarPlano(id: string): Promise<PlanoAula> {
    return this.atualizarPlano(id, { status: 'arquivado' });
  },

  async reativarPlano(id: string): Promise<PlanoAula> {
    return this.atualizarPlano(id, { status: 'ativo' });
  },

  // ========== Estatísticas ==========
  async getEstatisticas() {
    const planos = await this.getPlanos();

    return {
      total_planos: planos.length,
      planos_ativos: planos.filter((p) => p.status === 'ativo').length,
      planos_concluidos: planos.filter((p) => p.status === 'concluido').length,
      disciplinas_cobertas: [...new Set(planos.map((p) => p.disciplina))]
    };
  },

  // ========== Helpers ==========
  calcularHoraFim(horaInicio: string, duracaoMinutos: number): string {
    const [horas, minutos] = horaInicio.split(':').map(Number);
    const totalMinutos = horas * 60 + minutos + duracaoMinutos;
    const novaHora = Math.floor(totalMinutos / 60);
    const novoMinuto = totalMinutos % 60;
    return `${novaHora.toString().padStart(2, '0')}:${novoMinuto.toString().padStart(2, '0')}`;
  },

  getHorarioPadraoPorTurno(turno?: string): { hora_inicio: string; hora_fim: string } {
    const turnoNormalizado = normalizeTurno(turno);

    if (turnoNormalizado === 'tarde') {
      return { hora_inicio: '13:00', hora_fim: '14:00' };
    }

    if (turnoNormalizado === 'noite') {
      return { hora_inicio: '17:00', hora_fim: '18:00' };
    }

    // Padrão para manhã (ou turno não informado)
    return { hora_inicio: '08:00', hora_fim: '09:00' };
  },

  calcularDataPorFrequencia(
    dataInicio: Date,
    indiceAula: number,
    frequencia?: 'diaria' | 'semanal' | 'quinzenal' | 'mensal'
  ): Date {
    const dataAula = new Date(dataInicio);

    if (frequencia === 'semanal') {
      dataAula.setDate(dataAula.getDate() + indiceAula * 7);
    } else if (frequencia === 'quinzenal') {
      dataAula.setDate(dataAula.getDate() + indiceAula * 15);
    } else if (frequencia === 'mensal') {
      dataAula.setMonth(dataAula.getMonth() + indiceAula);
    } else {
      dataAula.setDate(dataAula.getDate() + indiceAula);
    }

    return dataAula;
  },

  ajustarDataParaDiaSemana(
    dataBase: Date,
    diaSemana: 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado'
  ): Date {
    const dataAjustada = new Date(dataBase);
    const diaAtual = dataAjustada.getDay();
    const diaDesejado = diaSemanaToNumber(diaSemana);
    const diferenca = (diaDesejado - diaAtual + 7) % 7;
    dataAjustada.setDate(dataAjustada.getDate() + diferenca);
    return dataAjustada;
  },

  async getHorariosDaTurmaParaDisciplina(turmaId: string, disciplina: string) {
    const horarios = await db.turma_horarios
      .where('turma_id')
      .equals(turmaId)
      .filter((horario) => !horario.deleted)
      .toArray();

    const horariosDaDisciplina = horarios.filter((horario) => horario.disciplina === disciplina);
    const horariosSelecionados = horariosDaDisciplina.length > 0 ? horariosDaDisciplina : horarios;

    return horariosSelecionados.sort((a, b) => {
      const diaA = diaSemanaToNumber(a.dia_semana);
      const diaB = diaSemanaToNumber(b.dia_semana);
      if (diaA !== diaB) return diaA - diaB;
      return a.hora_inicio.localeCompare(b.hora_inicio);
    });
  },

  async buscarAulaDuplicada(aulaData: {
    turma_id: string;
    data_aula: string;
    disciplina: string;
    hora_inicio: string;
    hora_fim: string;
    tema_aula: string;
  }) {
    const aulasDaTurma = await db.aulas
      .where('turma_id')
      .equals(aulaData.turma_id)
      .filter((aula) => !aula.deleted)
      .toArray();

    return aulasDaTurma.find((aula) => {
      const mesmoSlot =
        aula.data_aula === aulaData.data_aula &&
        aula.hora_inicio === aulaData.hora_inicio &&
        aula.hora_fim === aulaData.hora_fim &&
        aula.disciplina === aulaData.disciplina;

      const mesmaAulaPlano =
        aula.tema_aula === aulaData.tema_aula &&
        aula.disciplina === aulaData.disciplina;

      return mesmoSlot || mesmaAulaPlano;
    });
  },

  async getEscolaId(): Promise<string> {
    const activeInstituicao = localStorage.getItem('active_instituicao_id');
    if (activeInstituicao) return activeInstituicao;

    try {
      const user = await supabase.auth.getUser();
      return user.data.user?.user_metadata?.instituicao_id || user.data.user?.id || '';
    } catch {
      return '';
    }
  },

  async getUsuarioId(): Promise<string> {
    const localProfile = localStorage.getItem('user_profile');
    if (localProfile) {
      try {
        const profile = JSON.parse(localProfile);
        if (profile?.id) return profile.id;
      } catch {
        // fallback para auth
      }
    }

    const user = await supabase.auth.getUser();
    return user.data.user?.id || '';
  }
};
