// services/database/planoAulasService.ts
import { BaseEntity } from '../../types/base';
import { aulaService } from './aulaService';
import db, { supabase } from './db';
import { syncManager } from './syncManager';
import { generateUniqueId } from '../../utils/idGenarator';

export interface PlanoAula extends BaseEntity {
  id: string;
  titulo: string;
  descricao?: string;
  disciplina: string;
  tipo: 'unica' | 'serie' | 'modulo';
  objetivos_aprendizagem: string[];
  competencias_desenvolvidas: string[];
  recursos_necessarios: string[];
  metodologia_principal: string;
  avaliacao: string;
  duracao_total: number;
  aulas_planeadas: number;
  data_inicio?: string;
  data_fim?: string;
  frequencia?: 'diaria' | 'semanal' | 'quinzenal' | 'mensal';
  conteudos: Array<{
    ordem: number;
    titulo: string;
    descricao: string;
    duracao: number;
    metodologia: string;
    atividades: string[];
  }>;
  turma_ids: string[];
  status: 'rascunho' | 'ativo' | 'arquivado' | 'concluido';
  aulas_geradas: string[];
  instituicao_id: string;
  profile_id: string;
  created_at: string;
  updated_at: string;
}

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

export const planoAulaService = {
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
      instituicao_id: planoData.instituicao_id || instituicaoId,
      profile_id: planoData.profile_id || profileId,
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
      deleted: false
    };

    await db.plano_aulas.put(plano);

    await db.syncQueue.add({
      table: 'plano_aulas',
      record_id: id,
      operation: 'upsert',
      status: 'pending',
      created_at: now
    });

    return plano;
  },

  async atualizarPlano(id: string, updates: Partial<PlanoAula>): Promise<PlanoAula> {
    const planoAtual = await db.plano_aulas.get(id);
    if (!planoAtual || planoAtual.deleted) {
      throw new Error('Plano não encontrado');
    }

    const updatedAt = new Date().toISOString();

    await db.plano_aulas.update(id, {
      ...updates,
      updated_at: updatedAt,
      sync_status: 'pending'
    });

    await db.syncQueue.add({
      table: 'plano_aulas',
      record_id: id,
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
    return plano;
  },

  async getPlanos(filters?: {
    disciplina?: string;
    tipo?: string;
    status?: string;
    turma_id?: string;
  }): Promise<PlanoAula[]> {
    const planos = await db.plano_aulas.toArray();

    return planos
      .filter((plano) => {
        if (plano.deleted) return false;
        if (filters?.disciplina && plano.disciplina !== filters.disciplina) return false;
        if (filters?.tipo && plano.tipo !== filters.tipo) return false;
        if (filters?.status && plano.status !== filters.status) return false;
        if (filters?.turma_id && !plano.turma_ids.includes(filters.turma_id)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

  // ========== Métodos Específicos ==========
  async gerarAulasDoPlano(planoIdOrData: string | PlanoAulaCreateInput | Partial<PlanoAula>): Promise<string[]> {
    let plano: PlanoAula | null = null;

    if (typeof planoIdOrData === 'string') {
      plano = await this.getPlano(planoIdOrData);
    } else if (planoIdOrData.id) {
      plano = await this.getPlano(planoIdOrData.id);
    } else {
      plano = await this.criarPlano(planoIdOrData as PlanoAulaCreateInput);
    }

    if (!plano) throw new Error('Plano não encontrado');

    const aulasGeradas: string[] = [];
    const hoje = new Date();
    const dataInicio = plano.data_inicio ? new Date(plano.data_inicio) : hoje;

    for (let i = 0; i < plano.aulas_planeadas; i++) {
      const dataAula = new Date(dataInicio);

      // Calcular data baseado na frequência
      if (plano.frequencia === 'semanal') {
        dataAula.setDate(dataAula.getDate() + i * 7);
      } else if (plano.frequencia === 'quinzenal') {
        dataAula.setDate(dataAula.getDate() + i * 15);
      } else if (plano.frequencia === 'mensal') {
        dataAula.setMonth(dataAula.getMonth() + i);
      } else {
        dataAula.setDate(dataAula.getDate() + i);
      }

      // Para cada turma selecionada
      for (const turmaId of plano.turma_ids) {
        const conteudo = plano.conteudos[i] || plano.conteudos[0];

        const aulaData = {
          turma_id: turmaId,
          data_aula: dataAula.toISOString().split('T')[0],
          dia_semana: mapDiaSemana(dataAula),
          disciplina: plano.disciplina,
          hora_inicio: '08:00',
          hora_fim: this.calcularHoraFim('08:00', conteudo?.duracao || 45),
          tema_aula: `${plano.titulo} - Aula ${i + 1}`,
          conteudo_ministrado: conteudo?.descricao || plano.descricao,
          status: 'planeada' as const,
          objetivos_aprendizagem: plano.objetivos_aprendizagem
        };

        const aulaId = await aulaService.criarAula(aulaData);
        aulasGeradas.push(aulaId);
      }
    }

    // Atualizar plano com IDs das aulas geradas
    await this.atualizarPlano(plano.id, {
      aulas_geradas: aulasGeradas,
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
