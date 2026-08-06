import { getSyncQueueInstitutionId, LOCAL_ID_MAP_KEY, normalizeCourseName } from "../../../utils/syncManagerUtils";
import db from "../db";
import { conflictResolver } from "./conflictResolver";

export const localIdMapper={
    async updateLocalIdRelatedReferences(tableName: string, localId: string, supabaseId: string) {
    try {
        const instituicaoId = getSyncQueueInstitutionId();
        const now = new Date().toISOString();

        if (!instituicaoId) return;
        if (!localId || !supabaseId || localId === supabaseId) return;

        if (tableName === 'aulas') {
        await conflictResolver.updateFrequenciasAulaReferences(localId, supabaseId);
        await this.updatePlanoAulasLocalReferences(localId, supabaseId);
        return;
        }

        if (tableName === 'alunos') {
        const [avaliacoes, frequencias, propinas, notificacoes] = await Promise.all([
            db.avaliacoes.where('aluno_id').equals(localId).and((r) => !r.deleted).toArray(),
            db.frequencias.where('aluno_id').equals(localId).and((r) => !r.deleted).toArray(),
            db.propina.where('aluno_id').equals(localId).and((r) => !r.deleted).toArray(),
            db.notificacao.where('aluno_id').equals(localId).and((r) => !r.deleted).toArray()
        ]);

        for (const av of avaliacoes) {
            await db.avaliacoes.update(av.id, { aluno_id: supabaseId, updated_at: now, sync_status: 'pending' });
            await conflictResolver.enqueuePendingUpsertIfNeeded('avaliacoes', av.id, instituicaoId, now);
        }
        for (const fr of frequencias) {
            await db.frequencias.update(fr.id, { aluno_id: supabaseId, updated_at: now, sync_status: 'pending' });
            await conflictResolver.enqueuePendingUpsertIfNeeded('frequencias', fr.id, instituicaoId, now);
        }
        for (const pp of propinas) {
            await db.propina.update(pp.id, { aluno_id: supabaseId, updated_at: now, sync_status: 'pending' });
            await conflictResolver.enqueuePendingUpsertIfNeeded('propina', pp.id, instituicaoId, now);
        }
        for (const nt of notificacoes) {
            await db.notificacao.update(nt.id, { aluno_id: supabaseId, updated_at: now, sync_status: 'pending' });
            await conflictResolver.enqueuePendingUpsertIfNeeded('notificacao', nt.id, instituicaoId, now);
        }
        return;
        }

        if (tableName === 'transacoes') {
        const propinas = await db.propina
            .filter((r) => !r.deleted && r.transacao_id === localId)
            .toArray();

        for (const pp of propinas) {
            await db.propina.update(pp.id, {
            transacao_id: supabaseId,
            updated_at: now,
            sync_status: 'pending'
            });
            await conflictResolver.enqueuePendingUpsertIfNeeded('propina', pp.id, instituicaoId, now);
        }
        return;
        }

        if (tableName === 'turmas') {
        const [alunos, aulas, horarios, avaliacoes, eventos, notificacoes, planos] = await Promise.all([
            db.alunos.where('turma_id').equals(localId).and((r) => !r.deleted).toArray(),
            db.aulas.where('turma_id').equals(localId).and((r) => !r.deleted).toArray(),
            db.turma_horarios.where('turma_id').equals(localId).and((r) => !r.deleted).toArray(),
            db.avaliacoes.where('turma_id').equals(localId).and((r) => !r.deleted).toArray(),
            db.evento.where('turma_id').equals(localId).and((r) => !r.deleted).toArray(),
            db.notificacao.where('turma_id').equals(localId).and((r) => !r.deleted).toArray(),
            db.plano_aulas
            .filter((plano) => !plano.deleted && Array.isArray(plano.turma_ids) && plano.turma_ids.includes(localId))
            .toArray()
        ]);

        for (const al of alunos) {
            await db.alunos.update(al.id, { turma_id: supabaseId, updated_at: now, sync_status: 'pending' });
            await conflictResolver.enqueuePendingUpsertIfNeeded('alunos', al.id, instituicaoId, now);
        }
        for (const au of aulas) {
            await (db.aulas as any).update(au.id, { turma_id: supabaseId, updated_at: now, sync_status: 'pending' });
            await conflictResolver.enqueuePendingUpsertIfNeeded('aulas', au.id, instituicaoId, now);
        }
        for (const hr of horarios) {
            await db.turma_horarios.update(hr.id, { turma_id: supabaseId, updated_at: now, sync_status: 'pending' });
            await conflictResolver.enqueuePendingUpsertIfNeeded('turma_horarios', hr.id, instituicaoId, now);
        }
        for (const av of avaliacoes) {
            await db.avaliacoes.update(av.id, { turma_id: supabaseId, updated_at: now, sync_status: 'pending' });
            await conflictResolver.enqueuePendingUpsertIfNeeded('avaliacoes', av.id, instituicaoId, now);
        }
        for (const ev of eventos) {
            await db.evento.update(ev.id, { turma_id: supabaseId, updated_at: now, sync_status: 'pending' });
            await conflictResolver.enqueuePendingUpsertIfNeeded('evento', ev.id, instituicaoId, now);
        }
        for (const nt of notificacoes) {
            await db.notificacao.update(nt.id, { turma_id: supabaseId, updated_at: now, sync_status: 'pending' });
            await conflictResolver.enqueuePendingUpsertIfNeeded('notificacao', nt.id, instituicaoId, now);
        }
        for (const plano of planos) {
            const turmaIds = Array.from(
            new Set((plano.turma_ids || []).map((turmaId: string) => (turmaId === localId ? supabaseId : turmaId)))
            );
            await db.plano_aulas.update(plano.id, { turma_ids: turmaIds, updated_at: now, sync_status: 'pending' });
            await conflictResolver.enqueuePendingUpsertIfNeeded('plano_aulas', plano.id, instituicaoId, now);
        }
        return;
        }

        if (tableName === 'cursos') {
        const turmas = await db.turmas
            .where('curso_id')
            .equals(localId)
            .and((r) => !r.deleted)
            .toArray();

        for (const turma of turmas) {
            await (db.turmas as any).update(turma.id, { curso_id: supabaseId, updated_at: now, sync_status: 'pending' });
            await conflictResolver.enqueuePendingUpsertIfNeeded('turmas', turma.id, instituicaoId, now);
        }
        }
    } catch (error) {
        console.error(`❌ Erro ao atualizar referências locais para ${tableName}:`, error);
    }
    },

    async updatePlanoAulasLocalReferences(oldAulaId: string, newAulaId: string) {
    try {
        const instituicaoId = getSyncQueueInstitutionId();
        const planos = await db.plano_aulas
        .filter((plano) =>
            !plano.deleted &&
            Array.isArray(plano.aulas_geradas) &&
            plano.aulas_geradas.includes(oldAulaId)
        )
        .toArray();

        if (planos.length === 0) return;

        const now = new Date().toISOString();

        for (const plano of planos) {
        const aulasAtualizadas = Array.from(
            new Set(
            (plano.aulas_geradas || []).map((aulaId) =>
                aulaId === oldAulaId ? newAulaId : aulaId
            )
            )
        );

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
                item.instituicao_id === instituicaoId &&
                item.record_id === plano.id &&
                item.operation === 'upsert' &&
                item.status === 'pending'
            )
            .first();

        if (!hasPendingUpsert) {
            await db.syncQueue.add({
            instituicao_id: instituicaoId,
            table: 'plano_aulas',
            record_id: plano.id,
            operation: 'upsert',
            status: 'pending',
            created_at: now
            });
        }
        }

    } catch (error) {
        console.error('❌ Erro ao atualizar referências de aulas em plano_aulas:', error);
    }
    },

    async updateLocalId(tableName: string, localId: string, supabaseId: string) {
        try {
            const instituicaoId = getSyncQueueInstitutionId();
            if (!localId || !supabaseId) return;
            if (localId === supabaseId) return;
    
            const table = db.table<any>(tableName);
            const localRecord = await table.get(localId);
            if (!localRecord) return;
    
            const existingRemoteRecord = await table.get(supabaseId);
            const now = new Date().toISOString();
    
            const mergedRecord = existingRemoteRecord
            ? {
                ...localRecord,
                ...existingRemoteRecord,
                id: supabaseId,
                sync_status: 'synced',
                deleted: false,
                updated_at: now
                }
            : {
                ...localRecord,
                id: supabaseId,
                sync_status: 'synced',
                deleted: false,
                updated_at: now
                };
    
            await db.transaction('rw', table, db.syncQueue, async () => {
            await table.put(mergedRecord);
            await table.delete(localId);
    
            const queueRefs = await db.syncQueue
                .where('record_id')
                .equals(localId)
                .and((item) => !instituicaoId || item.instituicao_id === instituicaoId)
                .toArray();
    
            for (const item of queueRefs) {
                await db.syncQueue.update(item.id!, { record_id: supabaseId });
            }
            });
    
    
            await this.updateLocalIdRelatedReferences(tableName, localId, supabaseId);
            await this.registerLocalIdMapping(tableName, localId, supabaseId);
        } catch (error) {
            console.error(`❌ Falha ao atualizar ID local ${localId}:`, error);
        }
    },

    async deleteLocalRecord(tableName: string, recordId: string) {
        const table = db.table<any>(tableName);
        await table.delete(recordId);
    },

    async cleanupLegacyLocalDuplicates(tables: string[] = ['alunos', 'turmas', 'aulas', 'cursos']) {
        const instituicaoId = getSyncQueueInstitutionId();
        const buildFingerprint = (tableName: string, record: any): string | null => {
        if (!record || record.deleted) return null;

        switch (tableName) {
            case 'alunos':
            if (!record.numero_estudante) return null;
            return `aluno:${record.numero_estudante}`;
            case 'turmas':
            if (!record.nome_turma || !record.ano_lectivo) return null;
            return `turma:${record.nome_turma}|${record.ano_lectivo}|${record.curso_id || ''}`;
            case 'aulas':
            return [
                'aula',
                record.turma_id || '',
                record.data_aula || '',
                record.hora_inicio || '',
                record.hora_fim || '',
                record.disciplina || '',
                record.tema_aula || ''
            ].join(':');
            case 'cursos': {
            const nomeKey = normalizeCourseName(record.nome);
            if (!nomeKey) return null;
            return `curso:${nomeKey}|${record.instituicao_id || ''}`;
            }
            default:
            return null;
        }
        };

        for (const tableName of tables) {
        try {
            const table = db.table<any>(tableName);
            const records = await table.toArray();
            if (!records.length) continue;

            const byFingerprint = new Map<string, any[]>();
            for (const record of records) {
            const fingerprint = buildFingerprint(tableName, record);
            if (!fingerprint) continue;
            if (!byFingerprint.has(fingerprint)) byFingerprint.set(fingerprint, []);
            byFingerprint.get(fingerprint)!.push(record);
            }

            const idsToDelete: string[] = [];

            for (const [, group] of byFingerprint.entries()) {
            if (group.length <= 1) continue;

            group.sort((a, b) => {
                const aLocal = String(a.id || '').startsWith('local_');
                const bLocal = String(b.id || '').startsWith('local_');
                if (aLocal !== bLocal) return aLocal ? 1 : -1; 

                const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
                const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
                return bTime - aTime; 
            });

            const kept = group[0];
            const duplicates = group.slice(1);

            for (const duplicate of duplicates) {
                if (duplicate.id === kept.id) continue;
                if (!String(duplicate.id || '').startsWith('local_')) continue;
                idsToDelete.push(duplicate.id);
            }
            }

            if (idsToDelete.length === 0) continue;

            const uniqueIds = Array.from(new Set(idsToDelete));
            await table.bulkDelete(uniqueIds);

            await db.syncQueue
            .where('table')
            .equals(tableName)
            .filter((item) => uniqueIds.includes(item.record_id) && (!instituicaoId || item.instituicao_id === instituicaoId))
            .delete();

            } catch (error) {
            console.error(`❌ Erro ao limpar duplicados legados em ${tableName}:`, error);
        }
        }
    },

    hasPendingParent (tableName: string, record: any): boolean  {
        if (!record) return false;
            switch (tableName) {
                case 'turmas':
                return localIdMapper.isLocalId(record.curso_id);
                case 'alunos':
                return localIdMapper.isLocalId(record.turma_id);
                case 'aulas':
                return localIdMapper.isLocalId(record.turma_id);
                case 'frequencias':
                return localIdMapper.isLocalId(record.aluno_id) || localIdMapper.isLocalId(record.aula_id);
                case 'avaliacoes':
                return localIdMapper.isLocalId(record.aluno_id) || localIdMapper.isLocalId(record.turma_id);
                case 'propina':
                return localIdMapper.isLocalId(record.transacao_id) || localIdMapper.isLocalId(record.aluno_id);
                case 'turma_horarios':
                return localIdMapper.isLocalId(record.turma_id);
                case 'plano_aulas':
                return localIdMapper.hasLocalIdInList(record.turma_ids) || localIdMapper.hasLocalIdInList(record.aulas_geradas);
                default:
            
                return false;
            }
    },
    
    hasLocalIdInList (values?: any): boolean {
        return Array.isArray(values) && values.some((val) => this.isLocalId(val));
    },
           
         
    async migrateLegacyLocalIdMap(): Promise<void> {
        try {
            const keys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(LOCAL_ID_MAP_KEY)) keys.push(key);
            }
            if (keys.length === 0) return;

            const mappings: Array<{ table: string; local_id: string; server_id: string }> = [];
            for (const key of keys) {
                try {
                    const raw = localStorage.getItem(key);
                    if (!raw) continue;
                    const map = JSON.parse(raw);
                    if (!map || typeof map !== 'object') continue;
                    for (const [localId, serverId] of Object.entries(map)) {
                        if (!this.isLocalId(localId) || !serverId) continue;
                        mappings.push({
                            table: '',
                            local_id: localId,
                            server_id: String(serverId)
                        });
                    }
                    localStorage.removeItem(key);
                } catch {
                    continue;
                }
            }

            if (mappings.length > 0) {
                await db.idMappings.bulkPut(mappings);
            }
        } catch (error) {
            console.error('❌ Erro ao migrar idMappings de localStorage:', error);
        }
    },

    async registerLocalIdMapping(tableName: string, localId: string, remoteId: string) {
        if (!this.isLocalId(localId) || !remoteId) return;
        try {
            await db.idMappings.put({ table: tableName, local_id: localId, server_id: remoteId });
        } catch (error) {
            console.error(`❌ Erro ao registar mapeamento ${localId}:`, error);
        }
    },

    async resolveLocalIdMapping(tableName: string, value?: string | null): Promise<string | null> {
        if (!this.isLocalId(value)) return null;
        try {
            const exact = await db.idMappings.get([tableName, value || '']);
            if (exact?.server_id) return exact.server_id;

            const legacy = await db.idMappings.where('local_id').equals(value || '').first();
            return legacy?.server_id || null;
        } catch {
            return null;
        }
    },

    async cleanupLocalIdMap(tableName?: string) {
        try {
            const mappings = tableName
                ? await db.idMappings.where('table').equals(tableName).toArray()
                : await db.idMappings.toArray();
            if (mappings.length === 0) return;

            const tablesToCheck = tableName ? [tableName] : [
                'alunos',
                'turmas',
                'cursos',
                'aulas',
                'frequencias',
                'avaliacoes',
                'propina',
                'transacoes',
                'turma_horarios',
                'plano_aulas',
                'metas',
                'tarefas',
                'rotinas',
                'planeamentos',
                'alocacao',
                'notificacao',
                'evento',
                'profiles',
                'instituicao'
            ];

            const existingIds = new Set<string>();
            for (const tName of tablesToCheck) {
                const tableExists = db.tables.some((t) => t.name === tName);
                if (!tableExists) continue;
                try {
                    const ids = await db.table<any>(tName).toCollection().primaryKeys();
                    ids.forEach((id: any) => existingIds.add(String(id)));
                } catch {
                    continue;
                }
            }

            const stale = mappings.filter(
                (m) => !existingIds.has(m.local_id) && !existingIds.has(m.server_id)
            );
            if (stale.length > 0) {
                await db.idMappings.bulkDelete(stale.map((m) => [m.table, m.local_id] as [string, string]));
            }
        } catch (error) {
            console.error('❌ Erro ao limpar idMappings:', error);
        }
    },

    async applyLocalIdMappings(tableName: string, record: any) {
        const fields = this.getLocalIdFields(tableName);
        if (!record || fields.length === 0) return { record, changed: false };

        let changed = false;
        const updated: any = { ...record };

        for (const field of fields) {
            if (typeof field === 'string') {
                const mapped = await this.resolveLocalIdMapping(tableName, record[field]);
                if (mapped) {
                    updated[field] = mapped;
                    changed = true;
                }
            } else if (field.array) {
                const values = Array.isArray(record[field.name]) ? record[field.name] : [];
                const nextValues: string[] = [];
                let fieldChanged = false;
                for (const val of values) {
                    const mapped = await this.resolveLocalIdMapping(tableName, val);
                    if (mapped) {
                        nextValues.push(mapped);
                        fieldChanged = true;
                    } else {
                        nextValues.push(val);
                    }
                }
                if (fieldChanged) {
                    updated[field.name] = nextValues;
                    changed = true;
                }
            }
        }

        return { record: updated, changed };
    },

    
    getLocalIdFields (tableName: string): Array<string | { name: string; array: boolean }>{
        switch (tableName) {
            case 'turmas':
            return ['curso_id'];
            case 'alunos':
            return ['turma_id'];
            case 'aulas':
            return ['turma_id'];
            case 'frequencias':
            return ['aluno_id', 'aula_id'];
            case 'avaliacoes':
            return ['aluno_id', 'turma_id'];
            case 'propina':
            return ['transacao_id', 'aluno_id'];
            case 'turma_horarios':
            return ['turma_id'];
            case 'plano_aulas':
            return [{ name: 'turma_ids', array: true }, { name: 'aulas_geradas', array: true }];
            default:
            return [];
        }
    },
    isLocalId (value?: string | null): boolean {
        return typeof value === 'string' && value.startsWith('local_');
    }
    

}