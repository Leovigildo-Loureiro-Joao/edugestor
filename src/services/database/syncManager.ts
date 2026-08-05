
import { alunosService, aulaService, frequenciaService, turmaService } from ".";
import { SyncQueueItem } from "../../types/base";
import { avaliacaoService } from "./avaliacao";
import db, { supabase } from "./db";
import { emitDbChanged } from "../../utils/emitPendingSync";
import { instituicaoIdValue, isValidInstituicaoId } from "../../utils/getInsitituicaoID";
import { auditLogService } from "../audit/auditLogService";



interface SyncManager {
  uploadBatch(): Promise<void>;
  resetSyncQueue():Promise<void>;
  downloadBatch(): Promise<void>;
  groupByTable(items: SyncQueueItem[]): Record<string, SyncQueueItem[]>;
  processTableBatch(tableName: string, items: SyncQueueItem[]): Promise<void>;
  processInsertBatch(tableName: string, items: SyncQueueItem[]): Promise<void>;
  processSingleUpdate(tableName: string, item: SyncQueueItem): Promise<void>;
  processDeleteBatch(tableName: string, items: SyncQueueItem[]): Promise<void>;
  getRecordFromTable(tableName: string, recordId: string): Promise<any>;
  updateLocalId(tableName: string, oldId: string, newId: string): Promise<void>;
  enqueuePendingUpsertIfNeeded(tableName: string, recordId: string, instituicaoId: string, now: string): Promise<void>;
  updateLocalIdRelatedReferences(tableName: string, localId: string, supabaseId: string): Promise<void>;
  updatePlanoAulasLocalReferences(oldAulaId: string, newAulaId: string): Promise<void>;
  updateFrequenciasAulaReferences(oldAulaId: string, newAulaId: string): Promise<void>;
  markAsSynced(tableName: string, recordId: string): Promise<void>;
  deleteLocalRecord(tableName: string, recordId: string): Promise<void>;
  processarRegistrosUnicos(records: any[], tabela: string): any[];
  handleSyncError(item: SyncQueueItem, error: any): Promise<void>;
  downloadTableBatch(tableName: string, since: Date): Promise<void>;
  reconcileHardDeletes(tableName: string): Promise<void>;
  uploadTableBatch(tableName: string): Promise<void>;
  rentryErrorsTable(tableName: string): Promise<void>;
  processDownloadBatch(tableName: string, batch: any[]): Promise<void>;
  prepareInsertRecords(tableName: string, items: SyncQueueItem[]): Promise<{ records: any[]; itemsToProcess: SyncQueueItem[] }>;
  cleanRecordForSupabase(record: any): any;
  executeUpsertToSupabase(tableName: string, records: any[]): Promise<{ data: any[] | null; error: any | null }>;
  processSuccessResult(tableName: string, items: SyncQueueItem[], supabaseData: any[]): Promise<void>;
  handleInsertError(tableName: string, items: SyncQueueItem[], error: any): Promise<void>;
  markItemAsError(item: SyncQueueItem, error: Error): Promise<void>;
  checkExistingNotificacao(record: any): Promise<any>;
  handleDuplicateInsert(tableName: string, records: any[], items: SyncQueueItem[], authData: any): Promise<void>;
  checkExistingUniqueConstraint(tableName: string, record: any): Promise<any>;
  convertInsertToUpdate(tableName: string, item: SyncQueueItem, existingId: string): Promise<void>;
  removeBatchDuplicates(tableName:string,records:any[]):any;
  updateDependentRecords(tableName:string,supabaseId:string,record_id:string):any;
  verifyAndCleanSyncQueue():any;
  findOrphanedSyncQueueItems(options?: { statuses?: string[]; tableName?: string; includeAllInstituicoes?: boolean }): Promise<any>;
  cleanupOrphanedSyncQueue(options?: { statuses?: string[]; tableName?: string; dryRun?: boolean; includeAllInstituicoes?: boolean }): Promise<any>;
  debugSyncQueueIssue(tableName:string):any;
  cleanupOldItems(maxAgeHours:number):any;
  executeDeleteToSupabase(tableName: string, recordId: string): Promise<{ data: any | null; error: any | null }>;
  executeUpdateToSupabase(tableName: string, records: any[],record_id:string): Promise<{ data: any[] | null; error: any | null }>;
  checkIfRecordExists(tableName: string, recordId: string): Promise<boolean>;
  forceCleanSyncQueue(tableName?: string):any
  retryFailedItems(maxRetries: number):any
  getSyncStats():Promise<any>
  uploadFailedItems():Promise<any>
  verifyQueueIntegrity():Promise<any>
  processedRecords(records:any[],tableName:string):any[]
  cleanupLegacyLocalDuplicates(tables?: string[]): Promise<void>
  cleanupGhostData(options: GhostDataOptions):Promise<GhostDataCleanupResult>
  checkRemoteExistence(tableName: string, recordId: string): Promise<boolean>
  removeGhostRecords(tableName: string, recordIds: string[]): Promise<number>
  safeGhostDataCleanup(options: Omit<GhostDataOptions, 'dryRun' | 'force'>):any
  diagnoseGhostData(options: Omit<GhostDataOptions, 'dryRun'>):any
  verifyDataHealth(options: { tables?: string[]; sample?: number } ) :any


}


const useSyncAuthInManager = () => {
  const tryParseJSON = (value: string | null): any | null => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const extractTokenFromAnyShape = (raw: any): string | null => {
    if (!raw) return null;
    if (typeof raw === 'string' && raw.split('.').length === 3) return raw;
    if (Array.isArray(raw)) {
      for (const item of raw) {
        const token = extractTokenFromAnyShape(item);
        if (token) return token;
      }
      return null;
    }
    if (typeof raw === 'object') {
      if (typeof raw.access_token === 'string') return raw.access_token;
      if (raw.session) return extractTokenFromAnyShape(raw.session);
      if (raw.currentSession) return extractTokenFromAnyShape(raw.currentSession);
      if (raw.data) return extractTokenFromAnyShape(raw.data);
    }
    return null;
  };

  const getFallbackTokenFromStorage = (): string | null => {
    const sessionToken = extractTokenFromAnyShape(
      tryParseJSON(localStorage.getItem('supabase.auth.session'))
    );
    if (sessionToken) return sessionToken;

    const supabaseInternalKey = Object.keys(localStorage).find((key) =>
      key.startsWith('sb-') && key.endsWith('-auth-token')
    );
    if (supabaseInternalKey) {
      return extractTokenFromAnyShape(tryParseJSON(localStorage.getItem(supabaseInternalKey)));
    }

    return null;
  };

  
  const getAuthData = () => {
    

    const token = localStorage.getItem('jwt_token') || getFallbackTokenFromStorage();
    if (token && !localStorage.getItem('jwt_token')) {
      try {
        localStorage.setItem('jwt_token', token);
      } catch {
        
      }
    }
    const userRole = localStorage.getItem('user_role') || 'admin';
    const localProfile = localStorage.getItem('user_profile');
    let userId=localStorage.getItem("user_id") || null;
    if (localProfile) {
      const profile =JSON.parse(localProfile);
      userId= profile.id;
    }


    return {
      authToken: token,
      userRole,
      userId,
      isAuthenticated: !!token || !!localStorage.getItem('supabase.auth.session')
    };
  };

  const getAuthHeaders = () => {
    const token = getAuthData().authToken;
    if (!token) return {};

    return {
      'Authorization': `Bearer ${token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  };

  const hasPermission = (requiredRole: string): boolean => {
    const { userRole } = getAuthData();

    const roleHierarchy: Record<string, number> = {
      'user': 0,
      'teacher': 1,
      'manager': 2,
      'admin': 3
    };

    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  };

  return {
    getAuthData,
    getAuthHeaders,
    hasPermission
  };
};

const getSyncQueueInstitutionId = (): string => instituicaoIdValue();
const HARD_DELETE_RECONCILE_TABLES = new Set([
  'cursos',
  'turmas',
  'alunos',
  'alocacao',
  'transacoes',
  'aulas',
  'propina',
  'frequencias',
  'tarefas',
  'metas',
  'rotinas',
  'evento',
  'system_config',
  'notificacao',
  'avaliacoes',
  'turma_horarios',
  'planeamentos',
  'plano_aulas'
]);
const LEGACY_INSTITUICAO_IDS = new Set(['local_default_instituicao', '']);
const isLegacyInstituicaoId = (value?: string | null): boolean =>
  !isValidInstituicaoId(value) && LEGACY_INSTITUICAO_IDS.has(value || '');
const resolveValidInstituicaoId = (value?: string | null, allowNull = false): string | null => {
  if (isValidInstituicaoId(value)) return value;
  const active = getSyncQueueInstitutionId();
  if (isValidInstituicaoId(active)) return active;
  return allowNull ? null : '';
};
const isUuid = (value?: string | null): boolean =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const isSeedRecordId = (value?: string | null): boolean =>
  !!value && value.startsWith('seed_');
const normalizeCourseName = (value?: string | null): string =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
const isLocalId = (value?: string | null): boolean =>
  typeof value === 'string' && value.startsWith('local_');
const hasLocalIdInList = (values?: any): boolean =>
  Array.isArray(values) && values.some((val) => isLocalId(val));
const DESTINATARIOS_NOTIFICACAO_VALIDOS = new Set(['aluno', 'professor', 'admin', 'responsavel', 'todos']);
const normalizarDestinatarioNotificacao = (destinatario?: string): string | undefined => {
  if (!destinatario) return undefined;
  const valor = destinatario.toLowerCase();
  if (valor === 'teacher' || valor === 'professor') return 'professor';
  if (valor === 'manager' || valor === 'admin') return 'admin';
  if (valor === 'user' || valor === 'aluno') return 'aluno';
  if (valor === 'responsavel' || valor === 'todos') return valor;
  return DESTINATARIOS_NOTIFICACAO_VALIDOS.has(valor) ? valor : undefined;
};
const LOCAL_ID_MAP_KEY = 'sync_local_id_map';

const getLocalIdMapKey = () => {
  const instituicaoId = getSyncQueueInstitutionId();
  return instituicaoId ? `${LOCAL_ID_MAP_KEY}_${instituicaoId}` : LOCAL_ID_MAP_KEY;
};

const loadLocalIdMap = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(getLocalIdMapKey());
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const saveLocalIdMap = (map: Record<string, string>) => {
  try {
    localStorage.setItem(getLocalIdMapKey(), JSON.stringify(map));
  } catch {
    
  }
};

const registerLocalIdMapping = (localId: string, remoteId: string) => {
  if (!isLocalId(localId) || !remoteId) return;
  const map = loadLocalIdMap();
  map[localId] = remoteId;
  saveLocalIdMap(map);
};

const resolveLocalIdMapping = (value?: string | null): string | null => {
  if (!isLocalId(value)) return null;
  const map = loadLocalIdMap();
  return map[value||""] || null;
};

const cleanupLocalIdMap = async (tableName?: string) => {
  const map = loadLocalIdMap();
  const entries = Object.entries(map);
  if (entries.length === 0) return;

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
      
    }
  }

  let changed = false;
  for (const [localId, remoteId] of entries) {
    if (!existingIds.has(localId) && !existingIds.has(remoteId)) {
      delete map[localId];
      changed = true;
    }
  }

  if (changed) {
    saveLocalIdMap(map);
  }
};

const getLocalIdFields = (tableName: string): Array<string | { name: string; array: boolean }> => {
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
};

const applyLocalIdMappings = (tableName: string, record: any) => {
  const fields = getLocalIdFields(tableName);
  if (!record || fields.length === 0) return { record, changed: false };

  let changed = false;
  const updated: any = { ...record };

  for (const field of fields) {
    if (typeof field === 'string') {
      const mapped = resolveLocalIdMapping(record[field]);
      if (mapped) {
        updated[field] = mapped;
        changed = true;
      }
    } else if (field.array) {
      const values = Array.isArray(record[field.name]) ? record[field.name] : [];
      const nextValues = values.map((val: string) => resolveLocalIdMapping(val) || val);
      if (nextValues.some((val:any, idx:any) => val !== values[idx])) {
        updated[field.name] = nextValues;
        changed = true;
      }
    }
  }

  return { record: updated, changed };
};
const hasPendingParent = (tableName: string, record: any): boolean => {
  if (!record) return false;
  switch (tableName) {
    case 'turmas':
      return isLocalId(record.curso_id);
    case 'alunos':
      return isLocalId(record.turma_id);
    case 'aulas':
      return isLocalId(record.turma_id);
    case 'frequencias':
      return isLocalId(record.aluno_id) || isLocalId(record.aula_id);
    case 'avaliacoes':
      return isLocalId(record.aluno_id) || isLocalId(record.turma_id);
    case 'propina':
      return isLocalId(record.transacao_id) || isLocalId(record.aluno_id);
    case 'turma_horarios':
      return isLocalId(record.turma_id);
    case 'plano_aulas':
      return hasLocalIdInList(record.turma_ids) || hasLocalIdInList(record.aulas_geradas);
    default:

      return false;
  }
};

const DELETE_TABLE_ORDER = [
  'frequencias',
  'avaliacoes',
  'propina',
  'plano_aulas',
  'aulas',
  'turma_horarios',
  'alunos',
  'turmas',
  'cursos'
];

const UPSERT_TABLE_ORDER = [
  'cursos',
  'turmas',
  'alunos',
  'aulas',
  'frequencias',
  'avaliacoes',
  'propina',
  'turma_horarios',
  'plano_aulas'
];


interface GhostDataCleanupResult {
  totalScanned: number;
  ghostsFound: number;
  ghostsRemoved: number;
  byTable: Record<string, { found: number; removed: number }>;
  errors: Array<{ table: string; recordId: string; error: string }>;
  timestamp: string;
}

interface GhostDataOptions {
  tables?: string[];
  dryRun?: boolean;
  force?: boolean;
  batchSize?: number;
  excludeTables?: string[];
}

const getTableOrderIndex = (tableName: string, order: string[]) => {
  const idx = order.indexOf(tableName);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
};


export const syncManager: SyncManager = {
  
  async uploadBatch() {
    try {
      await cleanupLocalIdMap();
      await this.cleanupLegacyLocalDuplicates(['alunos', 'turmas', 'aulas', 'cursos']);
      const { getAuthData } = useSyncAuthInManager();

      const authData = getAuthData();
      if (!authData.isAuthenticated) {
        console.warn('⚠️ Sessão não encontrada no storage; tentando sincronizar mesmo assim.');
      }

      const instituicaoId = getSyncQueueInstitutionId();
      if (!instituicaoId) {
        console.warn('⚠️ Sem instituicao_id ativa para processar syncQueue.');
        return;
      }

      
      const pendingItems = await db.syncQueue
        .filter((item) =>
          item.status === 'pending' &&
          (item.instituicao_id === instituicaoId || isLegacyInstituicaoId(item.instituicao_id))
        )
        .toArray();

      if (pendingItems.length === 0) {
        return;
      }

      const deleteItems = pendingItems.filter((item) => item.operation === 'delete');
      const upsertItems = pendingItems.filter((item) => item.operation === 'upsert');

      const deleteByTable = this.groupByTable(deleteItems);
      const upsertByTable = this.groupByTable(upsertItems);

      
      const deleteTableEntries = Object.entries(deleteByTable).sort(
        ([tableA], [tableB]) =>
          getTableOrderIndex(tableA, DELETE_TABLE_ORDER) - getTableOrderIndex(tableB, DELETE_TABLE_ORDER)
      );

      for (const [tableName, items] of deleteTableEntries) {
        await this.processDeleteBatch(tableName, items);
      }

      
      const upsertTableEntries = Object.entries(upsertByTable).sort(
        ([tableA], [tableB]) =>
          getTableOrderIndex(tableA, UPSERT_TABLE_ORDER) - getTableOrderIndex(tableB, UPSERT_TABLE_ORDER)
      );

      for (const [tableName, items] of upsertTableEntries) {
        await this.processTableBatch(tableName, items);
      }

      } catch (error) {
      console.error('❌ Erro no upload batch:', error);
      throw error;
    }
  },

async cleanupGhostData(options: GhostDataOptions = {}): Promise<GhostDataCleanupResult> {
  const {
    tables = ['alunos', 'turmas', 'cursos', 'aulas', 'frequencias', 'avaliacoes', 'propina', 'transacoes'],
    dryRun = false,
    force = false,
    batchSize = 50,
    excludeTables = ['profiles', 'instituicao', 'system_config'] 
  } = options;

  
  if (!navigator.onLine && !force) {
    throw new Error('⛔ Limpeza de dados fantasmas requer conexão online para verificar existência remota');
  }

  const { getAuthData } = useSyncAuthInManager();
  const authData = getAuthData();

  if (!authData.isAuthenticated && !force) {
    throw new Error('⛔ Limpeza de dados fantasmas requer autenticação');
  }

  const instituicaoId = getSyncQueueInstitutionId();
  const startTime = Date.now();

  const result: GhostDataCleanupResult = {
    totalScanned: 0,
    ghostsFound: 0,
    ghostsRemoved: 0,
    byTable: {},
    errors: [],
    timestamp: new Date().toISOString()
  };

  
  const tablesToProcess = tables.filter(table => !excludeTables.includes(table));

  for (const tableName of tablesToProcess) {
    try {
      
      const tableExists = db.tables.some(t => t.name === tableName);
      if (!tableExists) continue;

      const table = db.table<any>(tableName);

      
      const localRecords = await table
        .filter(record =>
          record.sync_status === 'synced' &&
          !String(record.id || '').startsWith('local_') &&
          !record.deleted &&
          (tableName === 'profiles' || tableName === 'instituicao' || !instituicaoId || record.instituicao_id === instituicaoId)
        )
        .toArray();

      if (localRecords.length === 0) {
        result.byTable[tableName] = { found: 0, removed: 0 };
        continue;
      }

      result.totalScanned += localRecords.length;

      
      const ghostsInTable: string[] = [];

      for (let i = 0; i < localRecords.length; i += batchSize) {
        const batch = localRecords.slice(i, i + batchSize);

        
        const existenceChecks = await Promise.allSettled(
          batch.map(async (record) => {
            try {
              const exists = await this.checkRemoteExistence(tableName, record.id);
              return { recordId: record.id, exists };
            } catch (error) {
              return {
                recordId: record.id,
                exists: false,
                error: error instanceof Error ? error.message : String(error)
              };
            }
          })
        );

        
        for (const check of existenceChecks) {
          if (check.status === 'fulfilled') {
            if (!check.value.exists) {
              ghostsInTable.push(check.value.recordId);
            }
          } else {
            
            result.errors.push({
              table: tableName,
              recordId: 'unknown',
              error: check.reason?.message || 'Erro na verificação'
            });
          }
        }

        
        if (i + batchSize < localRecords.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      
      result.byTable[tableName] = {
        found: ghostsInTable.length,
        removed: 0
      };

      result.ghostsFound += ghostsInTable.length;

      
      if (!dryRun && ghostsInTable.length > 0) {
        const removedCount = await this.removeGhostRecords(tableName, ghostsInTable);
        result.byTable[tableName].removed = removedCount;
        result.ghostsRemoved += removedCount;
      }

    } catch (error) {
      console.error(`❌ Erro ao processar tabela ${tableName}:`, error);
      result.errors.push({
        table: tableName,
        recordId: 'batch_error',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  
  const executionTime = Date.now() - startTime;
  await auditLogService.log('GHOST_DATA_CLEANUP', {
    ...result,
    executionTimeMs: executionTime,
    dryRun,
    force,
    online: navigator.onLine
  });

  
  if (!dryRun && result.ghostsRemoved > 0) {
    const event = new CustomEvent('ghost-data-cleanup', {
      detail: {
        count: result.ghostsRemoved,
        tables: Object.entries(result.byTable)
          .filter(([_, stats]) => stats.removed > 0)
          .map(([table, stats]) => `${table}: ${stats.removed}`)
      }
    });
    window.dispatchEvent(event);
  }

  return result;
},
/**
 * Verifica se um registro existe remotamente no Supabase
 */
async checkRemoteExistence(tableName: string, recordId: string): Promise<boolean> {
  try {
    
    const { data, error, status } = await supabase
      .from(tableName)
      .select('id')
      .eq('id', recordId)
      .maybeSingle();

    if (error) {
      
      if (status === 404 || error.code === 'PGRST116') {
        return false;
      }
      
      if (error.code === '42501' || error.code === '403') {
        console.warn(`⚠️ Permissão negada ao verificar ${tableName}/${recordId}`);
        return true; 
      }
      throw error;
    }

    return !!data;

  } catch (error) {
    console.error(`❌ Erro ao verificar existência remota de ${tableName}/${recordId}:`, error);
    
    return true;
  }
},

/**
 * Remove registros fantasmas do banco local
 */
async removeGhostRecords(tableName: string, recordIds: string[]): Promise<number> {
  if (recordIds.length === 0) return 0;

  try {
    const table = db.table<any>(tableName);
    const instituicaoId = getSyncQueueInstitutionId();

    
    
    const recordsToDelete: string[] = [];

    for (const recordId of recordIds) {
      const record = await table.get(recordId);

      
      if (record &&
          record.sync_status === 'synced' &&
          !String(record.id).startsWith('local_') &&
          (!instituicaoId || record.instituicao_id === instituicaoId)) {

        
        const stillMissing = !(await this.checkRemoteExistence(tableName, recordId));

        if (stillMissing) {
          recordsToDelete.push(recordId);
        }
      }
    }

    if (recordsToDelete.length === 0) return 0;

    
    await db.transaction('rw', table, db.syncQueue, async () => {
      
      await table.bulkDelete(recordsToDelete);

      
      await db.syncQueue
        .where('table')
        .equals(tableName as any)
        .filter(item => recordsToDelete.includes(item.record_id))
        .delete();
    });

    console.log(`🧹 Removidos ${recordsToDelete.length} registros fantasmas de ${tableName}:`, recordsToDelete);

    return recordsToDelete.length;

  } catch (error) {
    console.error(`❌ Erro ao remover registros fantasmas de ${tableName}:`, error);

    
    let removedCount = 0;
    for (const recordId of recordIds) {
      try {
        await db.table(tableName).delete(recordId);
        removedCount++;
      } catch (singleError) {
        console.error(`❌ Falha ao deletar ${tableName}/${recordId}:`, singleError);
      }
    }

    return removedCount;
  }
},

/**
 * Versão segura da limpeza que pode ser chamada periodicamente
 */
async safeGhostDataCleanup(options: Omit<GhostDataOptions, 'dryRun' | 'force'> = {}) {
  
  if (!navigator.onLine) {
    console.log('📱 Offline: pulando limpeza de dados fantasmas');
    return { skipped: true, reason: 'offline' };
  }

  
  const lastCleanupKey = `ghost_cleanup_last_run`;
  const lastRun = localStorage.getItem(lastCleanupKey);
  const now = Date.now();

  
  if (lastRun && (now - parseInt(lastRun)) < 24 * 60 * 60 * 1000 ) {
    return { skipped: true, reason: 'throttled' };
  }

  try {
    
    const result = await this.cleanupGhostData({
      ...options,
      dryRun: false,
      force: false
    });

    
    localStorage.setItem(lastCleanupKey, now.toString());

    return result;

  } catch (error) {
    console.error('❌ Erro na limpeza segura de dados fantasmas:', error);
    return {
      error: error instanceof Error ? error.message : String(error),
      skipped: true
    };
  }
},

/**
 * Modo de diagnóstico: apenas identifica fantasmas sem remover
 */
async diagnoseGhostData(options: Omit<GhostDataOptions, 'dryRun'> = {}) {
  return this.cleanupGhostData({
    ...options,
    dryRun: true
  });
},



/**
 * Verifica a saúde dos dados locais comparando com o Supabase
 */
async verifyDataHealth(options: { tables?: string[]; sample?: number } = {}) {
  const {
    tables = ['alunos', 'turmas', 'cursos'],
    sample = 10 
  } = options;

  if (!navigator.onLine) {
    return { online: false, message: 'Offline: não é possível verificar saúde dos dados' };
  }

  const health: Record<string, { local: number; remote: number; mismatches: any[] }> = {};

  for (const tableName of tables) {
    try {
      
      const localSynced = await db.table(tableName)
        .filter(r => r.sync_status === 'synced' && !String(r.id).startsWith('local_'))
        .count();

      
      const instituicaoId = getSyncQueueInstitutionId();
      let query = supabase
        .from(tableName)
        .select('id', { count: 'exact', head: true });

      if (tableName !== 'profiles' && tableName !== 'instituicao' && instituicaoId) {
        query = query.eq('instituicao_id', instituicaoId);
      }

      const { count: remoteCount, error } = await query;

      if (error) throw error;

      health[tableName] = {
        local: localSynced,
        remote: remoteCount || 0,
        mismatches: []
      };

      
      if (Math.abs(localSynced - (remoteCount || 0)) > 10 && sample > 0) {
        const sampleSize = Math.min(sample, localSynced);
        const localSample = await db.table(tableName)
          .filter(r => r.sync_status === 'synced' && !String(r.id).startsWith('local_'))
          .limit(sampleSize)
          .toArray();

        
        for (const record of localSample) {
          const exists = await this.checkRemoteExistence(tableName, record.id);
          if (!exists) {
            health[tableName].mismatches.push({
              id: record.id,
              nome: record.nome_completo || record.nome_turma || record.nome || 'N/A'
            });
          }
        }
      }

    } catch (error) {
      health[tableName] = {
        local: 0,
        remote: 0,
        mismatches: [{ error: error instanceof Error ? error.message : String(error) }]
      };
    }
  }

  return health;
},
  async uploadTableBatch (tableName: string) {
    const instituicaoId = getSyncQueueInstitutionId();
    if (!instituicaoId) return;
    const pendingItems = await db.syncQueue
        .filter((item) =>
          item.status === 'pending' &&
          item.table === tableName &&
          (item.instituicao_id === instituicaoId || isLegacyInstituicaoId(item.instituicao_id))
        )
        .toArray();
    const deletes = pendingItems.filter((item) => item.operation === 'delete');
    const upserts = pendingItems.filter((item) => item.operation === 'upsert');

    if (deletes.length > 0) {
      await this.processDeleteBatch(tableName, deletes);
    }
    if (upserts.length > 0) {
      await this.processTableBatch(tableName, upserts);
    }

  },



 async uploadFailedItems() {
  try {
    const { getAuthData } = useSyncAuthInManager();
    const authData = getAuthData();

    if (!authData.isAuthenticated) {
      console.warn('⚠️ Sessão não encontrada no storage; tentando upload mesmo assim.');
    }

    const instituicaoId = getSyncQueueInstitutionId();
    if (!instituicaoId) {
      console.warn('⚠️ Sem instituicao_id ativa para processar itens com falha.');
      return { success: false, message: 'Sem instituição ativa' };
    }

    
    const failedItems = await db.syncQueue
      .filter((item) =>
        item.status === 'failed' &&
        (item.instituicao_id === instituicaoId || isLegacyInstituicaoId(item.instituicao_id))
      )
      .toArray();

    if (failedItems.length === 0) {
      return {
        success: true,
        message: 'Nenhum item com falha encontrado',
        total: 0
      };
    }

    
    const byTable = failedItems.reduce((acc: Record<string, number>, item) => {
      const table = item.table || 'unknown';
      acc[table] = (acc[table] || 0) + 1;
      return acc;
    }, {});

    
    const itemsByTable = this.groupByTable(failedItems);

    let totalProcessados = 0;
    let totalErros = 0;
    const resultados: Record<string, { success: number; failed: number }> = {};

    
    for (const [tableName, items] of Object.entries(itemsByTable)) {
      
      const ids = items.map(item => item.id!).filter(Boolean);
      await db.syncQueue
        .where('id')
        .anyOf(ids)
        .modify({
          status: 'pending',
          error: "",
          data: new Date().toISOString()
        });

      
      try {
        await this.processTableBatch(tableName, items);

        
        const aindaFalhos = await db.syncQueue
          .where('instituicao_id')
          .equals(instituicaoId)
          .and((item) => item.status === 'failed' && item.table === tableName)
          .toArray();

        const sucessos = items.length - aindaFalhos.length;
        const falhas = aindaFalhos.length;

        totalProcessados += sucessos;
        totalErros += falhas;

        resultados[tableName] = { success: sucessos, failed: falhas };

        } catch (error) {
        console.error(`❌ Erro ao processar tabela ${tableName}:`, error);

        
        await db.syncQueue
          .where('id')
          .anyOf(ids)
          .modify({
            status: 'failed',
            error: `Erro catastrófico: ${error instanceof Error ? error.message : String(error)}`,
            data: new Date().toISOString()
          });

        totalErros += items.length;
        resultados[tableName] = { success: 0, failed: items.length };
      }

      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    
    await auditLogService.log('SYNC_FAILED_ITEMS_UPLOAD', {
      total_processados: totalProcessados,
      total_erros: totalErros,
      resultados,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      total: failedItems.length,
      processados: totalProcessados,
      erros: totalErros,
      resultados
    };

  } catch (error) {
    console.error('❌ Erro ao processar upload de itens com falha:', error);

    await auditLogService.log('SYNC_FAILED_ITEMS_ERROR', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
},
  async rentryErrorsTable (tableName: string) {
    const instituicaoId = getSyncQueueInstitutionId();
    if (!instituicaoId) return;
    const pendingItems = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoId)
        .and(item => item.status === 'failed' && item.table === tableName )
        .toArray();
      await this.processTableBatch(tableName, pendingItems);

  },

  
  groupByTable(items: SyncQueueItem[]) {
    const groups: Record<string, SyncQueueItem[]> = {};

    items.forEach(item => {
      if (!groups[item.table]) {
        groups[item.table] = [];
      }
      groups[item.table].push(item);
    });

    return groups;
  },

  
  async processTableBatch(tableName: string, items: SyncQueueItem[]) {
    try {
      const { getAuthData } = useSyncAuthInManager();
      const authData = getAuthData();

      
      const seedItems = items.filter((item) => isSeedRecordId(item.record_id));
      if (seedItems.length > 0) {
        const queueIds = seedItems
          .map((item) => item.id)
          .filter((id): id is number => typeof id === 'number');

        if (queueIds.length > 0) {
          await db.syncQueue.bulkDelete(queueIds);
        }

        for (const item of seedItems) {
          try {
            await this.markAsSynced(tableName, item.record_id);
          } catch {
            
          }
        }
      }

      const validItems = items.filter((item) => !isSeedRecordId(item.record_id));
      if (validItems.length === 0) {
        return;
      }

      
      const inserts = validItems.filter(item => item.operation === 'upsert' && item.record_id.startsWith('local_'));
      const updates = validItems.filter(item => item.operation === 'upsert' && !item.record_id.startsWith('local_'));
      const deletes = validItems.filter(item => item.operation === 'delete');

      
      if (deletes.length > 0) {
        await this.processDeleteBatch(tableName, deletes);
      }

      
      for (const item of updates) {
        await this.processSingleUpdate(tableName, item);
      }

      
      if (inserts.length > 0) {
        await this.processInsertBatch(tableName, inserts);
      }



    } catch (error) {
      console.error(`❌ Erro processando batch de ${tableName}:`, error);
      throw error;
    }
  },

  
 processarRegistrosUnicos(records: any[], tabela: string): any[] {
  this.debugSyncQueueIssue(tabela)
  const registrosUnicos = new Map();

  records.forEach(record => {
    let chaveUnica;

    switch(tabela) {
      case 'alunos':
        
        chaveUnica = record.numero_estudante;
        break;

      case 'cursos': {
        const nomeKey = normalizeCourseName(record.nome);
        const instKey = record.instituicao_id || '';
        if (nomeKey) {
          chaveUnica = `curso_${nomeKey}_${instKey}`;
        }
        break;
      }

      case 'turmas':
        
        chaveUnica = `${record.nome_turma}_${record.ano_lectivo}`;
        break;

      case 'professores':
        
        chaveUnica = record.email || record.numero_bi;
        break;

      case 'aulas':
        
        chaveUnica = [
          record.turma_id || '',
          record.data_aula || '',
          record.hora_inicio || '',
          record.hora_fim || '',
          record.disciplina || '',
          record.tema_aula || ''
        ].join('|');
        break;

      default:
        
        chaveUnica = record.id || Math.random().toString();
    }

    
    if (!chaveUnica) {
      chaveUnica = `temp_${Math.random().toString(36).substr(2, 9)}`;
    }

    
    const existente = registrosUnicos.get(chaveUnica);
    if (existente) {
      
      const dataAtual = record.updated_at || record.created_at;
      const dataExistente = existente.updated_at || existente.created_at;

      if (dataAtual && dataExistente) {
        const isMaisRecente = new Date(dataAtual) > new Date(dataExistente);
        if (isMaisRecente) {
          registrosUnicos.set(chaveUnica, record);
        }
      } else if (dataAtual && !dataExistente) {
        
        registrosUnicos.set(chaveUnica, record);
      }
    } else {
      registrosUnicos.set(chaveUnica, record);
    }
  });

  return Array.from(registrosUnicos.values());
},


 async processInsertBatch(tableName: string, items: SyncQueueItem[]) {
    const { getAuthData } = useSyncAuthInManager();
    const authData = getAuthData();

    if (!authData.isAuthenticated) {
      console.warn(`⚠️ Sessão não encontrada no storage; tentando INSERTs em ${tableName} mesmo assim.`);
    }

    try {
      
      const { records, itemsToProcess } = await this.prepareInsertRecords(tableName, items);

      if (records.length === 0) {
        return;
      }

      
      
      let sucesso = 0;
      const concorrencia = tableName === 'frequencias' ? 8 : 1;
      let cursor = 0;

      const worker = async () => {
        while (true) {
          const index = cursor++;
          if (index >= itemsToProcess.length) return;

          const item = itemsToProcess[index];
          const record = records[index];

          try {
            const supabaseResult = await this.executeUpsertToSupabase(tableName, [record]);
            const supabaseRecord = supabaseResult.data?.[0];

            if (!supabaseRecord?.id) {
              throw new Error(`Nenhum ID retornado do Supabase para ${tableName}:${item.record_id}`);
            }

            await this.updateLocalId(tableName, item.record_id, supabaseRecord.id);

            if (tableName === 'turmas' || tableName === 'cursos') {
              await this.updateDependentRecords(tableName, supabaseRecord.id, item.record_id);
            }

            await db.syncQueue.delete(item.id!);
            sucesso++;
          } catch (error) {
            await this.handleSyncError(item, error);
          }
        }
      };

      const workers = Array.from(
        { length: Math.min(concorrencia, itemsToProcess.length) },
        () => worker()
      );
      await Promise.all(workers);

      } catch (error) {
      await this.handleInsertError(tableName, items, error);
    }
  }

  

  , async prepareInsertRecords(tableName: string, items: SyncQueueItem[]) {
    const records = [];
    const itemsToProcess = [];

    
    const orderedItems = [...items].sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      if (aTime !== bTime) return aTime - bTime;
      return (a.id || 0) - (b.id || 0);
    });
    const latestItemByRecordId = new Map<string, SyncQueueItem>();
    orderedItems.forEach((item) => {
      latestItemByRecordId.set(item.record_id, item);
    });

    const duplicatedQueueItems = orderedItems.filter((item) => {
      const latestItem = latestItemByRecordId.get(item.record_id);
      return latestItem && latestItem.id !== item.id;
    });

    if (duplicatedQueueItems.length > 0) {
      const duplicateIds = duplicatedQueueItems
        .map((item) => item.id)
        .filter((id): id is number => typeof id === 'number');
      if (duplicateIds.length > 0) {
        await db.syncQueue.bulkDelete(duplicateIds);
        console.warn(`⚠️ Removidos ${duplicateIds.length} itens duplicados da fila em ${tableName}`);
      }
    }

    const uniqueItems = Array.from(latestItemByRecordId.values());

    for (const item of uniqueItems) {
      try {
        
        let record = await this.getRecordFromTable(tableName, item.record_id);

        if (!record) {
          console.warn(`🗑️  Registro não encontrado, removendo: ${item.record_id}`);
          await db.syncQueue.delete(item.id!);
          continue;
        }

        const resolvedInsert = applyLocalIdMappings(tableName, record);
        if (resolvedInsert.changed) {
          try {
            const now = new Date().toISOString();
            await db.table(tableName).update(record.id, {
              ...resolvedInsert.record,
              updated_at: now,
              sync_status: 'pending'
            });
            record = resolvedInsert.record;
          } catch {
            
          }
        }

        if (hasPendingParent(tableName, record)) {
          continue;
        }

        if (tableName === 'cursos') {
          const instituicaoId = record.instituicao_id || getSyncQueueInstitutionId();
          const nomeKey = normalizeCourseName(record.nome);

          if (nomeKey && instituicaoId) {
            const localMatch = await db.cursos
              .filter(
                (r) =>
                  !r.deleted &&
                  normalizeCourseName(r.nome) === nomeKey &&
                  (r.instituicao_id || '') === instituicaoId
              )
              .first();

            if (
              localMatch &&
              localMatch.id &&
              localMatch.id !== record.id &&
              !String(localMatch.id).startsWith('local_')
            ) {
              await this.convertInsertToUpdate(tableName, item, localMatch.id);
              continue;
            }

            const remoteMatch = await this.checkExistingUniqueConstraint(tableName, {
              nome: record.nome,
              instituicao_id: instituicaoId
            });

            if (remoteMatch?.id && remoteMatch.id !== record.id) {
              await this.convertInsertToUpdate(tableName, item, remoteMatch.id);
              continue;
            }
          }
        }

        
        if (
          tableName === 'propina' &&
          typeof record.transacao_id === 'string' &&
          record.transacao_id.startsWith('local_')
        ){
          continue;
        }

        
        if (record.id && !record.id.toString().startsWith('local_')) {
          await db.syncQueue.delete(item.id!);
          continue;
        }

        
        const cleanRecord = this.cleanRecordForSupabase(record);

        records.push(cleanRecord);
        itemsToProcess.push(item);

      } catch (error:any) {
        console.error(`❌ Erro ao preparar item ${item.id}:`, error);
        await this.markItemAsError(item, error);
      }
    }

    return { records, itemsToProcess };
  }

  , cleanRecordForSupabase(record: any) {
    
    const { sync_status, deleted, ...cleanRecord } = record;
    const sanitizedInstituicaoId = resolveValidInstituicaoId(cleanRecord.instituicao_id, true);

    
    return {
      ...cleanRecord,
      ...(cleanRecord.instituicao_id !== undefined ? { instituicao_id: sanitizedInstituicaoId } : {}),
      created_at: record.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),

      
      ...(record.id && record.id.toString().startsWith('local_')
        ? { id: undefined }
        : {})
    };
  }

  , async executeUpsertToSupabase(tableName: string, records: any[]) {
    
    let onConflict = 'id';
     const processedRecords = this.processedRecords(records,tableName);

    
    const uniqueRecords = this.processarRegistrosUnicos(processedRecords, tableName);

    const { data, error } = await supabase
      .from(tableName)
      .upsert(uniqueRecords, { onConflict })
      .select();

    if (error) {
      console.error(`❌ Erro no upsert ${tableName}:`, error);

      
      if (error.code === '42501' || error.code === '23505') {
        const { data: retryData, error: retryError } = await supabase
          .from(tableName)
          .upsert(uniqueRecords)
          .select();

        if (retryError) throw retryError;
        return { data: retryData, error: null };
      }

      throw error;
    }

    return { data, error: null };
  },

  processedRecords(records:any[],tableName:string){
    switch (tableName) {
      case 'turmas':
        
        return records.map(record => {
          const { id,aulas, horarios, ...rest } = record;
          return rest;
        });

      case 'alunos':
        
        return records.map(record => {
          const { id, avaliacao, curso, observacoes_especificas, ...rest } = record;
          return rest;
        });
        

      case 'aulas':
        
        return records.map(record => {
          const {id, registro,turmas, ...rest } = record;
          return rest;
        });

      case 'frequencias':
        return records.map(record => {
          const { id, ...rest } = record;
          return {
            ...rest,
            instituicao_id: resolveValidInstituicaoId(rest.instituicao_id) || ''
          };
        });
     case 'avaliacoes':
        return records.map(record => {
          const { id, peso,...rest } = record;
          return {
            ...rest,
            instituicao_id: resolveValidInstituicaoId(rest.instituicao_id) || ''
          };
        });
      case 'cursos':
        
        return records.map(record => {
          const {id, alunos,has_active_turmas,turmas,turmas_count, ...rest } = record;
          return rest;
        });
      case 'notificacao':
        return records.map((record) => {
          const { id, ...rest } = record;
          const destinatario_tipo = normalizarDestinatarioNotificacao(rest.destinatario_tipo);
          return {
            ...rest,
            destinatario_tipo,
            instituicao_id: resolveValidInstituicaoId(rest.instituicao_id, true)
          };
        });
      case 'system_config':
        return records.map((record) => {
          const { id, updated_by, ...rest } = record;
          return {
            ...rest,
            instituicao_id: resolveValidInstituicaoId(rest.instituicao_id) || ''
          };
        });

      default:
        return records.map(record => {
          const {id, ...rest } = record;
          return rest;
        });
    }
  }

  , async executeUpdateToSupabase(tableName: string, records: any[],record_id:string) {

    const processedRecords = this.processedRecords(records,tableName);
    
    const uniqueRecords = this.processarRegistrosUnicos(processedRecords, tableName);

    const { data, error } = await supabase
      .from(tableName)
      .update(uniqueRecords)
      .eq('id', record_id)
      .select();

    if (error) {
      console.error(`❌ Erro no update ${tableName}:`, error);

      
      if (error.code === '42501' || error.code === '23505') {
        const { data: retryData, error: retryError } = await supabase
          .from(tableName)
          .upsert(uniqueRecords)
          .select();

        if (retryError) throw retryError;
        return { data: retryData, error: null };
      }

      throw error;
    }

    return { data, error: null };
  }

  , async executeDeleteToSupabase(tableName: string, recordId: string) {
    const { data, error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', recordId)
      .select();

    if (error) {
      console.error(`❌ Erro no delete ${tableName}:`, error);
      throw error;
    }

    return { data: data ?? null, error: null };
  }

  , removeBatchDuplicates(tableName: string, records: any[]) {
    const uniqueMap = new Map();
    const duplicates = [];

    records.forEach(record => {
      let key = record.id;

      if (tableName === 'alunos' && record.numero_estudante) {
        key = `aluno_${record.numero_estudante}`;
      } else if (tableName === 'turmas' && record.nome_turma && record.ano_lectivo) {
        key = `turma_${record.nome_turma}_${record.ano_lectivo}`;
      }

      if (key && uniqueMap.has(key)) {
        duplicates.push({ key, record });
      } else if (key) {
        uniqueMap.set(key, record);
      }
    });

    if (duplicates.length > 0) {
      console.warn(`⚠️ Removidas ${duplicates.length} duplicatas do batch ${tableName}`);
    }

    return Array.from(uniqueMap.values());
  }

  , async processSuccessResult(tableName: string, items: SyncQueueItem[], supabaseData: any[]) {
    const promises = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const supabaseRecord = supabaseData[i];

      if (!supabaseRecord || !supabaseRecord.id) {
        console.warn(`⚠️ Sem dados retornados para item ${item.record_id}`);
        continue;
      }

      
      promises.push(
        this.updateLocalId(tableName, item.record_id, supabaseRecord.id)
          .catch(err => console.error(`Erro ao atualizar ID:`, err))
      );

      
      if (tableName === 'turmas' || tableName === 'cursos') {
        promises.push(
          this.updateDependentRecords(tableName, supabaseRecord.id, item.record_id)
            .catch((err:any) => console.error(`Erro dependências:`, err))
        );
      }

      
      promises.push(
        db.syncQueue.delete(item.id!)
          .then(() => {
            })
          .catch(async (err) => {
            console.error(`❌ Erro ao remover ${item.id}:`, err);

            
            await db.syncQueue.update(item.id!, {
              status: 'synced',
              error: ""
            }).catch(() => {});
          })
      );
    }

    
    await Promise.allSettled(promises);

    }

  , async updateLocalId(tableName: string, localId: string, supabaseId: string) {
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
      registerLocalIdMapping(localId, supabaseId);
    } catch (error) {
      console.error(`❌ Falha ao atualizar ID local ${localId}:`, error);
    }
  }

  , async enqueuePendingUpsertIfNeeded(tableName: string, recordId: string, instituicaoId: string, now: string) {
    if (!recordId) return;

    const hasPendingDelete = await db.syncQueue
      .where('table')
      .equals(tableName)
      .filter(
        (item) =>
          item.instituicao_id === instituicaoId &&
          item.record_id === recordId &&
          item.operation === 'delete' &&
          item.status === 'pending'
      )
      .first();

    if (hasPendingDelete) return;

    const hasPendingUpsert = await db.syncQueue
      .where('table')
      .equals(tableName)
      .filter(
        (item) =>
          item.instituicao_id === instituicaoId &&
          item.record_id === recordId &&
          item.operation === 'upsert' &&
          item.status === 'pending'
      )
      .first();

    if (!hasPendingUpsert) {
      await db.syncQueue.add({
        instituicao_id: instituicaoId,
        table: tableName as  "turmas" | "alunos" | "aulas" | "cursos" | "propina" | "alocacao" | "transacoes" | "frequencias" | "tarefas" | "metas" | "rotinas" | "evento" | "profiles" | "system_config" | "instituicao" | "notificacao" | "avaliacoes" | "turma_horarios" | "planeamentos" | "plano_aulas",
        record_id: recordId,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });
    }
  }

  , async updateLocalIdRelatedReferences(tableName: string, localId: string, supabaseId: string) {
    try {
      const instituicaoId = getSyncQueueInstitutionId();
      const now = new Date().toISOString();

      if (!instituicaoId) return;
      if (!localId || !supabaseId || localId === supabaseId) return;

      if (tableName === 'aulas') {
        await this.updateFrequenciasAulaReferences(localId, supabaseId);
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
          await this.enqueuePendingUpsertIfNeeded('avaliacoes', av.id, instituicaoId, now);
        }
        for (const fr of frequencias) {
          await db.frequencias.update(fr.id, { aluno_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('frequencias', fr.id, instituicaoId, now);
        }
        for (const pp of propinas) {
          await db.propina.update(pp.id, { aluno_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('propina', pp.id, instituicaoId, now);
        }
        for (const nt of notificacoes) {
          await db.notificacao.update(nt.id, { aluno_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('notificacao', nt.id, instituicaoId, now);
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
          await this.enqueuePendingUpsertIfNeeded('propina', pp.id, instituicaoId, now);
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
          await this.enqueuePendingUpsertIfNeeded('alunos', al.id, instituicaoId, now);
        }
        for (const au of aulas) {
          await (db.aulas as any).update(au.id, { turma_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('aulas', au.id, instituicaoId, now);
        }
        for (const hr of horarios) {
          await db.turma_horarios.update(hr.id, { turma_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('turma_horarios', hr.id, instituicaoId, now);
        }
        for (const av of avaliacoes) {
          await db.avaliacoes.update(av.id, { turma_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('avaliacoes', av.id, instituicaoId, now);
        }
        for (const ev of eventos) {
          await db.evento.update(ev.id, { turma_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('evento', ev.id, instituicaoId, now);
        }
        for (const nt of notificacoes) {
          await db.notificacao.update(nt.id, { turma_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('notificacao', nt.id, instituicaoId, now);
        }
        for (const plano of planos) {
          const turmaIds = Array.from(
            new Set((plano.turma_ids || []).map((turmaId: string) => (turmaId === localId ? supabaseId : turmaId)))
          );
          await db.plano_aulas.update(plano.id, { turma_ids: turmaIds, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('plano_aulas', plano.id, instituicaoId, now);
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
          await this.enqueuePendingUpsertIfNeeded('turmas', turma.id, instituicaoId, now);
        }
      }
    } catch (error) {
      console.error(`❌ Erro ao atualizar referências locais para ${tableName}:`, error);
    }
  }

  , async updatePlanoAulasLocalReferences(oldAulaId: string, newAulaId: string) {
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
  }

  , async updateFrequenciasAulaReferences(oldAulaId: string, newAulaId: string) {
    try {
      const instituicaoId = getSyncQueueInstitutionId();
      const frequencias = await db.frequencias
        .where('aula_id')
        .equals(oldAulaId)
        .toArray();

      if (frequencias.length === 0) return;

      const now = new Date().toISOString();

      for (const frequencia of frequencias) {
        if (frequencia.deleted) continue;

        await db.frequencias.update(frequencia.id, {
          aula_id: newAulaId,
          updated_at: now,
          sync_status: 'pending'
        });

        const hasPendingDelete = await db.syncQueue
          .where('table')
          .equals('frequencias')
          .filter(
            (item) =>
              item.instituicao_id === instituicaoId &&
              item.record_id === frequencia.id &&
              item.operation === 'delete' &&
              item.status === 'pending'
          )
          .first();

        if (hasPendingDelete) {
          continue;
        }

        const hasPendingUpsert = await db.syncQueue
          .where('table')
          .equals('frequencias')
          .filter(
            (item) =>
              item.instituicao_id === instituicaoId &&
              item.record_id === frequencia.id &&
              item.operation === 'upsert' &&
              item.status === 'pending'
          )
          .first();

        if (!hasPendingUpsert) {
          await db.syncQueue.add({
            instituicao_id: instituicaoId,
            table: 'frequencias',
            record_id: frequencia.id,
            operation: 'upsert',
            status: 'pending',
            created_at: now
          });
        }
      }


    } catch (error) {
      console.error('❌ Erro ao atualizar aula_id em frequências:', error);
    }
  }

  , async handleInsertError(tableName: string, items: SyncQueueItem[], error: any) {
    console.error(`❌ Erro fatal em ${tableName}:`, error);

    
    for (const item of items) {
      try {
        await db.syncQueue.update(item.id!, {
          status: 'failed',
          error: error.message?.substring(0, 200) || 'Erro desconhecido',
          retry_count: (item.retry_count || 0) + 1,
          data: new Date().toISOString()
        });
      } catch (updateError) {
        console.error(`❌ Não consegui marcar erro no item ${item.id}:`, updateError);
      }
    }
  }

  , async markItemAsError(item: SyncQueueItem, error: Error) {
    try {
      await db.syncQueue.update(item.id!, {
        status: 'failed',
        error: error.message?.substring(0, 200) || 'Erro ao preparar',
        retry_count: (item.retry_count || 0) + 1,
        data: new Date().toISOString()
      });
    } catch (updateError) {
      console.error(`❌ Falha ao marcar erro no item ${item.id}:`, updateError);
    }
  },

  async checkExistingNotificacao(record: any): Promise<any> {
    try {
      
      
      if (record.titulo && record.data_envio && record.destinatario_tipo) {
        const { data, error } = await supabase
          .from('notificacao')
          .select('*')
          .eq('titulo', record.titulo)
          .eq('data_envio', record.data_envio)
          .eq('destinatario_tipo', record.destinatario_tipo)
          .maybeSingle();

        if (!error && data) return data;
      }

      
      if (record.referencia_id) {
        const { data, error } = await supabase
          .from('notificacao')
          .select('*')
          .eq('referencia_id', record.referencia_id)
          .maybeSingle();

        if (!error && data) return data;
      }

      return null;
    } catch (error) {
      console.error('Erro ao verificar notificacao:', error);
      return null;
    }
  },

  async handleDuplicateInsert(tableName: string, records: any[], items: SyncQueueItem[], authData: any) {
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const item = items[i];

      try {
        let result;

        
        if (tableName === 'system_config') {
          const { data, error } = await supabase
            .from(tableName)
            .upsert(record, {
              onConflict: 'id'
            })
            .select()
            .single();

          if (error) throw error;
          result = data;

        } else if (tableName === 'notificacao') {
          
          const { data, error } = await supabase
            .from(tableName)
            .upsert(record)
            .select()
            .single();

          if (error) throw error;
          result = data;

        } else {
          
          const { data, error } = await supabase
            .from(tableName)
            .upsert(record, {
              onConflict: 'id'
            })
            .select()
            .single();

          if (error) throw error;
          result = data;
        }

        if (result) {
          await this.updateLocalId(tableName, item.record_id, result.id);
          await db.syncQueue.delete(item.id!);
        }

      } catch (error) {
        console.error(`❌ Erro processando registro individual em ${tableName}:`, error);
        await this.handleSyncError(item, error);
      }
    }
  },


  

  async checkExistingUniqueConstraint(tableName: string, record: any): Promise<any> {
    try {
      
      if (tableName === 'system_config' && record.category && record.key_name && record.instituicao_id) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('category', record.category)
          .eq('key_name', record.key_name)
          .eq('instituicao_id', record.instituicao_id)
          .maybeSingle();

        if (!error && data) {
          return data;
        }
      }

      if (tableName === 'cursos' && record.nome && record.instituicao_id) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('nome', record.nome)
          .eq('instituicao_id', record.instituicao_id)
          .maybeSingle();

        if (!error && data) {
          return data;
        }
      }

      
      return null;
    } catch (error) {
      console.error('Erro ao verificar constraint única:', error);
      return null;
    }
  },

  async convertInsertToUpdate(tableName: string, item: SyncQueueItem, existingId: string) {
    try {
      
      await this.updateLocalId(tableName, item.record_id, existingId);

      
      await db.syncQueue.update(item.id!, {
        operation: 'upsert',
        record_id: existingId 
      });

      } catch (error) {
      console.error('Erro ao converter INSERT para UPDATE:', error);
    }
  },

  
  async processSingleUpdate(tableName: string, item: SyncQueueItem) {
    const { getAuthData } = useSyncAuthInManager();
    const authData = getAuthData();

    try {
      let record = await this.getRecordFromTable(tableName, item.record_id);
      if (!record) {
        await db.syncQueue.delete(item.id!);
        return;
      }

      const resolvedUpdate = applyLocalIdMappings(tableName, record);
      if (resolvedUpdate.changed) {
        try {
          const now = new Date().toISOString();
          await db.table(tableName).update(record.id, {
            ...resolvedUpdate.record,
            updated_at: now,
            sync_status: 'pending'
          });
          record = resolvedUpdate.record;
        } catch {
          
        }
      }

      if (hasPendingParent(tableName, record)) {
        return;
      }

      
      const { id, sync_status, deleted, createdAt, updated_at, ...cleanRecord } = record;

      

      const recordWithRLS = {
        ...cleanRecord,
        updated_at: new Date().toISOString(),
        created_at: createdAt || record.created_at || new Date().toISOString(),
        };
      const supabaseResult = await this.executeUpdateToSupabase(tableName, [recordWithRLS], item.record_id);

      if (supabaseResult.error) throw supabaseResult.error;

      
      await this.markAsSynced(tableName, item.record_id);
      await db.syncQueue.delete(item.id!);

      } catch (error) {
      console.error(`❌ Erro atualizando ${tableName} ${item.record_id}:`, error);
      await this.handleSyncError(item, error);
    }
  },

  
  async processDeleteBatch(tableName: string, items: SyncQueueItem[]) {
    
    if (tableName === 'profiles' || tableName === 'instituicao') {
      const { hasPermission } = useSyncAuthInManager();
      if (!hasPermission('admin')) {
        console.error(`❌ Permissão insuficiente para deletar ${tableName}`);
        await auditLogService.log('PERMISSION_DENIED_OPERATION', {
          area: 'syncManager',
          table: tableName,
          operation: 'delete_batch',
          message: 'Permissão insuficiente para deletar registros protegidos'
        });
        throw new Error(`Permissão insuficiente para deletar ${tableName}`);
      }
    }

    
    for (const item of items) {
      if (!item.record_id.startsWith('local_')) continue;
      await this.deleteLocalRecord(tableName, item.record_id);
      await db.syncQueue.delete(item.id!);
    }

    
    const remoteItems = items.filter((item) => !item.record_id.startsWith('local_'));
    for (const item of remoteItems) {
      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', item.record_id);

        if (error) throw error;

        await this.deleteLocalRecord(tableName, item.record_id);
        await db.syncQueue.delete(item.id!);
      } catch (error: any) {
        if (error?.code === '23503') {
          await db.syncQueue.update(item.id!, {
            status: 'failed',
            retry_count: (item.retry_count || 0) + 1,
            error: `FK_CONFLICT:${tableName}:${item.record_id}:${error.message || 'registro dependente encontrado'}`,
            data: new Date().toISOString()
          });
          continue;
        }

        await this.handleSyncError(item, error);
      }
    }

    },

  
  async getRecordFromTable(tableName: string, recordId: string) {
    const table = db.table(tableName);
    return await table.get(recordId);
  },

  async markAsSynced(tableName: string, recordId: string) {
    const table = db.table<any>(tableName);
    await table.update(recordId, {
      sync_status: 'synced',
      updated_at: new Date().toISOString()
    });
  },

  async deleteLocalRecord(tableName: string, recordId: string) {
    const table = db.table<any>(tableName);
    await table.delete(recordId);
  },

  async handleSyncError(item: SyncQueueItem, error: any) {
    const novasTentativas = (item.retry_count || 0) + 1;
    const errorCode = error?.code || error?.status || 'unknown';

    if (novasTentativas >= 3) {
      
      await db.syncQueue.update(item.id!, {
        status: 'failed',
        error: error.message,
        retry_count: novasTentativas,
        data: new Date().toISOString()
      });
      await auditLogService.log('SYNC_FAILED_PERMANENT', {
        table: item.table,
        record_id: item.record_id,
        retry_count: novasTentativas,
        error_code: errorCode,
        error_message: error?.message || String(error)
      });
    } else {
      
      await db.syncQueue.update(item.id!, {
        retry_count: novasTentativas,
        status: 'pending',
        data: new Date().toISOString()
      });
      if (errorCode === '42501' || errorCode === '403') {
        await auditLogService.log('SYNC_PERMISSION_DENIED', {
          table: item.table,
          record_id: item.record_id,
          retry_count: novasTentativas,
          error_code: errorCode,
          error_message: error?.message || String(error)
        });
      }
    }
  },

  async downloadBatch() {
    try {
      const { getAuthData } = useSyncAuthInManager();
      const authData = getAuthData();

      if (!authData.isAuthenticated) {
        console.warn('⚠️ Sessão não encontrada no storage; tentando download mesmo assim.');
      }

      
      const lastSync = localStorage.getItem(`last_sync_global`);
      const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);

      
      const { hasPermission } = useSyncAuthInManager();

      const tables = [
        'cursos', 'turmas', 'alunos', 'alocacao', 'transacoes', 'aulas',
        'propina', 'frequencias', 'tarefas', 'metas', 'rotinas',
        'evento', 'profiles', 'instituicao', 'notificacao','avaliacoes','turma_horarios',"planeamentos","plano_aulas"
      ];

      for (const tableName of tables) {
        
        if (tableName === 'profiles' || tableName === 'instituicao') {
          if (!hasPermission('admin')) {
            continue;
          }
        }

        const tableLastSync = localStorage.getItem(`last_sync_${tableName}`);
        const tableLastSyncDate = tableLastSync ? new Date(tableLastSync) : lastSyncDate;
        await this.downloadTableBatch(tableName, tableLastSyncDate);
        await new Promise(resolve => setTimeout(resolve, 300)); 
      }

      
      localStorage.setItem('last_sync_global', new Date().toISOString());

      } catch (error) {
      console.error('❌ Erro no download batch:', error);
    }
  },

  
  async downloadTableBatch(tableName: string, since: Date) {
    try {
      const localCount = await db.table(tableName).count();
      const shouldForceFullSync = localCount === 0;

      
      let query = supabase
        .from(tableName)
        .select('*')
        .order('updated_at', { ascending: true })
        .limit(500);

      if (!shouldForceFullSync && since && Number.isFinite(since.getTime()) && since.getTime() > 0) {
        query = query.gt('updated_at', since.toISOString());
      } else if (shouldForceFullSync) {
        }

      
      
      if (tableName !== 'profiles' && tableName !== 'instituicao') {
        const instituicaoId = getSyncQueueInstitutionId();
        if (instituicaoId) {
          query = query.eq('instituicao_id', instituicaoId);
        }
      }

      const { data: remoteData, error } = await query;

      if (error) {
        console.error(`❌ Erro buscando ${tableName}:`, error);
        return;
      }

      if (!remoteData || remoteData.length === 0) {
        if (HARD_DELETE_RECONCILE_TABLES.has(tableName)) {
          await this.reconcileHardDeletes(tableName);
          emitDbChanged(tableName, 'download');
        }
        localStorage.setItem(`last_sync_${tableName}`, new Date().toISOString());
        return;
      }

      
      const batchSize = 50;
      for (let i = 0; i < remoteData.length; i += batchSize) {
        const batch = remoteData.slice(i, i + batchSize);
        await this.processDownloadBatch(tableName, batch);
      }

      
      if (HARD_DELETE_RECONCILE_TABLES.has(tableName)) {
        await this.reconcileHardDeletes(tableName);
      }

      const latestUpdatedAt = remoteData.reduce((acc, record) => {
        const updatedAt = new Date(record.updated_at || record.created_at || 0);
        return updatedAt > acc ? updatedAt : acc;
      }, new Date(0));

      localStorage.setItem(
        `last_sync_${tableName}`,
        (latestUpdatedAt.getTime() > 0 ? latestUpdatedAt : new Date()).toISOString()
      );

      emitDbChanged(tableName, 'download');

    } catch (error) {
      console.error(`❌ Erro baixando ${tableName}:`, error);
    }
  },

  
  async processDownloadBatch(tableName: string, batch: any[]) {
    const table = db.table<any>(tableName);
    const pendingQueueRecordIds = new Set(
      (await db.syncQueue
        .where('table')
        .equals(tableName as any)
        .and((item) => item.status === 'pending' || item.status === 'failed' || item.status === 'conflict')
        .toArray())
        .map((item) => item.record_id)
    );

    
    await db.transaction('rw', table, async () => {
      for (const remoteRecord of batch) {
        try {
          
          const localRecord = await table.get(remoteRecord.id);

          if (!localRecord) {
            
            await table.put({
              ...remoteRecord,
              sync_status: 'synced',
              deleted: Boolean(remoteRecord.deleted)
            });
          } else {
            const localUpdated = new Date(localRecord.updated_at || localRecord.created_at || 0);
            const remoteUpdated = new Date(remoteRecord.updated_at || remoteRecord.created_at || 0);
            const hasQueueForRecord = pendingQueueRecordIds.has(localRecord.id);
            const localPendingWithoutQueue = localRecord.sync_status !== 'synced' && !hasQueueForRecord;
            const remoteIsNewer = remoteUpdated > localUpdated;
            const shouldApplyRemote =
              (localRecord.sync_status === 'synced' && remoteIsNewer) ||
              (localPendingWithoutQueue && (remoteIsNewer || Boolean(remoteRecord.deleted)));

            if (shouldApplyRemote) {
              await table.put({
                ...localRecord,
                ...remoteRecord,
                sync_status: 'synced'
              });
            }
          }

        } catch (recordError) {
          console.error(`❌ Erro processando registro ${remoteRecord.id}:`, recordError);
        }
      }
    });
  }

  , async reconcileHardDeletes(tableName: string) {
    try {
      const instituicaoId = getSyncQueueInstitutionId();

      let from = 0;
      const pageSize = 1000;
      const remoteIds = new Set<string>();

      while (true) {
        let query = supabase
          .from(tableName)
          .select('id')
          .order('id', { ascending: true })
          .range(from, from + pageSize - 1);

        if (tableName !== 'profiles' && tableName !== 'instituicao' && instituicaoId) {
          query = query.eq('instituicao_id', instituicaoId);
        }

        const { data, error } = await query;
        if (error) {
          console.error(`❌ Erro ao reconciliar deleções em ${tableName}:`, error);
          return;
        }

        const ids = (data || [])
          .map((row: any) => row?.id)
          .filter((id: any): id is string => typeof id === 'string');

        ids.forEach((id) => remoteIds.add(id));

        if (!data || data.length < pageSize) break;
        from += pageSize;
      }

      const localRecords = await db.table<any>(tableName).toArray();
      const staleLocalIds = localRecords
        .filter((record) => {
          if (!record || typeof record.id !== 'string') return false;
          if (record.id.startsWith('local_')) return false;
          if (record.sync_status !== 'synced') return false;
          if (record.deleted) return false;
          if (tableName !== 'profiles' && tableName !== 'instituicao' && instituicaoId && record.instituicao_id !== instituicaoId) {
            return false;
          }
          return !remoteIds.has(record.id);
        })
        .map((record) => record.id);

      if (staleLocalIds.length === 0) return;

      await db.transaction('rw', db.table(tableName), db.syncQueue, async () => {
        await db.table(tableName).bulkDelete(staleLocalIds);
        await db.syncQueue.where('table').equals(tableName as any).and((item) => staleLocalIds.includes(item.record_id)).delete();
      });
    } catch (error) {
      console.error(`❌ Erro ao reconciliar hard-deletes de ${tableName}:`, error);
    }
  }


  ,async updateDependentRecords(tableName: string, newId: string, oldId: string) {
    try {
      switch (tableName) {
        case 'cursos':
          
          const turmasDoCurso = await turmaService.getTurmasPorCurso(oldId);
          for (const turma of turmasDoCurso) {
            await turmaService.editTurma(turma.id, {
              ...turma,
              curso_id: newId
            });
          }
          break;

        case 'turmas':
          
          await Promise.all([
            
            alunosService.getAlunosPorTurma(oldId).then(alunos => {
              const promises = alunos.map(aluno =>
                alunosService.updateStudent(aluno.id, {
                  ...aluno,
                  turma_id: newId
                })
              );
              return Promise.allSettled(promises);
            }),

            
            aulaService.getAulasPorTurma(oldId).then(aulas => {
              const promises = aulas.map(aula =>
                aulaService.atualizarAula(aula.id, {
                  ...aula,
                  turma_id: newId
                })
              );
              return Promise.allSettled(promises);
            }),

            
            turmaService.getHorarios(oldId).then(horarios => {
              const promises = horarios.map(horario =>
                turmaService.updateHorario(horario.id, {
                  ...horario,
                  turma_id: newId
                })
              );
              return Promise.allSettled(promises);
            }),

            
            avaliacaoService.getAvaliacoesByTurma(oldId).then(avaliacoes => {
              const promises = avaliacoes.map(avaliacao =>
                avaliacaoService.atualizarAvaliacao(avaliacao.id, {
                  ...avaliacao,
                  turma_id: newId
                })
              );
              return Promise.allSettled(promises);
            }),

          ]);
          break;

        default:
          }
    } catch (error) {
      console.error(`❌ Erro ao atualizar dependências de ${tableName}:`, error);
    }
  },

  
  async verifyAndCleanSyncQueue() {
    try {
      const instituicaoId = getSyncQueueInstitutionId();
      if (!instituicaoId) return { total: 0, byStatus: {}, cleaned: 0 };

      
      const allItems = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoId)
        .toArray();

      const byStatus = allItems.reduce((acc: Record<string, number>, item) => {
        const status = item.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      
      const syncedItems = allItems.filter(item => item.status === 'synced');

      if (syncedItems.length > 0) {
        console.warn(`⚠️ Encontrados ${syncedItems.length} itens "synced" não removidos!`);

        
        const idsToDelete = syncedItems.map(item => item.id!).filter(Boolean);

        if (idsToDelete.length > 0) {
          await db.syncQueue.bulkDelete(idsToDelete);
          }
      }

      
      const failedItems = allItems.filter(item =>
        (item.retry_count || 0) > 5 &&
        item.status === 'failed'
      );

      if (failedItems.length > 0) {
        console.warn(`⚠️ ${failedItems.length} itens com +5 tentativas falhas`);
        
        const idsToClean = failedItems.map(item => item.id!).filter(Boolean);
        await db.syncQueue.bulkDelete(idsToClean);
        }

      
      const orphanCleanup = await this.cleanupOrphanedSyncQueue({
        statuses: ['failed'],
        dryRun: false
      });
      if (orphanCleanup.deletedCount > 0) {
        }

      return {
        total: allItems.length,
        byStatus,
        cleaned: syncedItems.length,
        cleanedFailedWithManyRetries: failedItems.length,
        cleanedOrphanFailed: orphanCleanup.deletedCount || 0
      };

    } catch (error:any) {
      console.error('❌ Erro ao verificar syncQueue:', error);
      return { error: error.message };
    }
  },

  async findOrphanedSyncQueueItems(options: {
    statuses?: string[];
    tableName?: string;
    includeAllInstituicoes?: boolean;
  } = {}) {
    const {
      statuses,
      tableName,
      includeAllInstituicoes = false
    } = options;
    const instituicaoId = getSyncQueueInstitutionId();

    let items = includeAllInstituicoes || !instituicaoId
      ? await db.syncQueue.toArray()
      : await db.syncQueue.where('instituicao_id').equals(instituicaoId).toArray();

    if (tableName) {
      items = items.filter((item) => item.table === tableName);
    }

    if (statuses && statuses.length > 0) {
      const statusSet = new Set(statuses);
      items = items.filter((item) => statusSet.has(item.status || 'unknown'));
    }

    const checks = await Promise.all(
      items.map(async (item) => {
        const tableExists = db.tables.some((t) => t.name === item.table);
        if (!tableExists) return { item, orphan: true, reason: `Tabela inexistente: ${item.table}` };

        const exists = await this.checkIfRecordExists(item.table, item.record_id);
        if (!exists) return { item, orphan: true, reason: `Registro ${item.record_id} não encontrado` };

        return { item, orphan: false, reason: '' };
      })
    );

    const orphanItems = checks.filter((c) => c.orphan);
    const byTable = orphanItems.reduce((acc: Record<string, number>, current) => {
      const key = current.item.table || 'sem_tabela';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const byStatus = orphanItems.reduce((acc: Record<string, number>, current) => {
      const key = current.item.status || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      totalScanned: items.length,
      orphanCount: orphanItems.length,
      byTable,
      byStatus,
      orphanItems
    };
  },

  async cleanupOrphanedSyncQueue(options: {
    statuses?: string[];
    tableName?: string;
    dryRun?: boolean;
    includeAllInstituicoes?: boolean;
  } = {}) {
    const { dryRun = false, ...findOptions } = options;
    const diagnosis = await this.findOrphanedSyncQueueItems(findOptions);

    if (dryRun) {
      return {
        ...diagnosis,
        deletedCount: 0,
        dryRun: true
      };
    }

    const idsToDelete = diagnosis.orphanItems
      .map((entry: any) => entry.item?.id)
      .filter((id: any) => typeof id === 'number');

    if (idsToDelete.length > 0) {
      await db.syncQueue.bulkDelete(idsToDelete);
    }

    return {
      ...diagnosis,
      deletedCount: idsToDelete.length,
      dryRun: false
    };
  },

  
  async debugSyncQueueIssue(tableName: string) {
    const instituicaoId = getSyncQueueInstitutionId();

    const items = await db.syncQueue
      .where('table').equals(tableName)
      .and((item) => !instituicaoId || item.instituicao_id === instituicaoId)
      .toArray();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      const exists = await this.checkIfRecordExists(tableName, item.record_id);
      if (!exists) {
        console.warn(`    ⚠️ Registro ${item.record_id} não existe mais!`);
        
        await db.syncQueue.delete(item.id!);
        }
    }
  },

  async checkIfRecordExists(tableName: string, recordId: string): Promise<boolean> {
    try {
      const table = db.table(tableName);
      const record = await table.get(recordId);
      return !!record;
    } catch {
      return false;
    }
  },

  
  async forceCleanSyncQueue(tableName?: string) {
    try {
      const instituicaoId = getSyncQueueInstitutionId();
      if (!instituicaoId) return;
      const items = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoId)
        .and((item) => !tableName || item.table === tableName)
        .toArray();
      
      const batchSize = 50;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const ids = batch.map(item => item.id!).filter(Boolean);

        if (ids.length > 0) {
          await db.syncQueue.bulkDelete(ids);
          }
      }

      } catch (error) {
      console.error('❌ Erro na limpeza forçada:', error);
    }
  },

  
  async retryFailedItems(maxRetries: number = 3) {
    try {
      const instituicaoId = getSyncQueueInstitutionId();
      if (!instituicaoId) return;
      const failedItems = await db.syncQueue
        .where('instituicao_id').equals(instituicaoId)
        .filter(item => item.status === 'failed' && (item.retry_count || 0) < maxRetries)
        .toArray();

      if (failedItems.length === 0) {
        return;
      }

      
      const itemsByTable = this.groupByTable(failedItems);

      for (const [tableName, items] of Object.entries(itemsByTable)) {
        
        const ids = items.map(item => item.id!).filter(Boolean);
        await db.syncQueue
          .where('id')
          .anyOf(ids)
          .modify({
            status: 'pending',
            data: "",
            error: ""
          });

        
        await this.processTableBatch(tableName, items);
      }

    } catch (error) {
      console.error('❌ Erro na retentativa:', error);
    }
  },

  
  async getSyncStats() {
    const instituicaoId = getSyncQueueInstitutionId();
    const allItems = instituicaoId
      ? await db.syncQueue.where('instituicao_id').equals(instituicaoId).toArray()
      : [];

    const stats = {
      total: allItems.length,
      byStatus: allItems.reduce((acc: Record<string, number>, item) => {
        const status = item.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),
      byTable: allItems.reduce((acc: Record<string, number>, item) => {
        const table = item.table;
        acc[table] = (acc[table] || 0) + 1;
        return acc;
      }, {}),
      pendingInserts: allItems.filter(item =>
        item.status === 'pending' &&
        item.operation === 'upsert' &&
        item.record_id.startsWith('local_')
      ).length,
      pendingUpdates: allItems.filter(item =>
        item.status === 'pending' &&
        item.operation === 'upsert' &&
        !item.record_id.startsWith('local_')
      ).length,
      pendingDeletes: allItems.filter(item =>
        item.status === 'pending' &&
        item.operation === 'delete'
      ).length,
    };

    return stats;
  },

  
  async cleanupOldItems(maxAgeHours: number = 24) {
    try {
      const instituicaoId = getSyncQueueInstitutionId();
      if (!instituicaoId) return;
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - maxAgeHours);

      const oldItems = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoId)
        .filter(item => {
          const itemDate = item.created_at ? new Date(item.created_at) : new Date(0);
          return itemDate < cutoffDate && item.status === 'synced';
        })
        .toArray();

      if (oldItems.length > 0) {
        const ids = oldItems.map(item => item.id!).filter(Boolean);
        await db.syncQueue.bulkDelete(ids);
      }
    } catch (error) {
      console.error('❌ Erro ao limpar itens antigos:', error);
    }
  },

  
  async verifyQueueIntegrity():Promise<any> {
    const issues = [];
    const instituicaoId = getSyncQueueInstitutionId();
    const allItems = instituicaoId
      ? await db.syncQueue.where('instituicao_id').equals(instituicaoId).toArray()
      : [];

    for (const item of allItems) {
      
      if (!item.id) {
        issues.push({ item, problem: 'Sem ID' });
        continue;
      }

      
      if (!item.table) {
        issues.push({ item, problem: 'Sem tabela' });
        continue;
      }

      
      if (!item.record_id) {
        issues.push({ item, problem: 'Sem record_id' });
        continue;
      }

      
      try {
        const tableExists = db.tables.some(t => t.name === item.table);
        if (!tableExists) {
          issues.push({ item, problem: `Tabela "${item.table}" não existe` });
        }
      } catch {
        issues.push({ item, problem: 'Erro ao verificar tabela' });
      }
    }

    if (issues.length > 0) {
      console.warn(`⚠️ Encontrados ${issues.length} problemas de integridade:`, issues);
      return { ok: false, issues };
    }

    return { ok: true, issues: [] };
  },

  
  async resetSyncQueue() {
    if (!confirm('⚠️ Tem certeza que deseja resetar completamente a fila de sincronização? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await db.syncQueue.clear();
      
      const tables = ['alunos', 'turmas', 'cursos', 'aulas', 'professores', 'transacoes'];
      for (const tableName of tables) {
        const table = db.table(tableName);
        const records = await table.toArray();

        const updates = records.map(record => ({
          ...record,
          sync_status: 'pending'
        }));

        await table.bulkPut(updates);
      }

      } catch (error) {
      console.error('❌ Erro ao resetar syncQueue:', error);
    }
  }
,
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
  }
};





const AUTO_SYNC_INTERVAL_MS = 30000;
const DASHBOARD_ROUTE_PREFIX = '/dashboard';

let autoSyncInitialized = false;
let autoSyncInFlight = false;
let autoSyncInterval: ReturnType<typeof setInterval> | null = null;
let cleanupInterval: ReturnType<typeof setInterval> | null = null;
let integrityInterval: ReturnType<typeof setInterval> | null = null;
let onlineSyncHandler: (() => Promise<void>) | null = null;
let quickSyncHandler: (() => void) | null = null;
let quickSyncTimeout: ReturnType<typeof setTimeout> | null = null;

const getCurrentPathname = () => {
  if (typeof window === 'undefined') return '';
  return window.location.pathname || '';
};

const getLastSyncDateForTable = (tableName: string): Date => {
  const saved = localStorage.getItem(`last_sync_${tableName}`);
  if (!saved) return new Date(0);
  const parsed = new Date(saved);
  return Number.isFinite(parsed.getTime()) ? parsed : new Date(0);
};

const getScopedTablesForRoute = (pathname: string): string[] | null => {
  const path = pathname.toLowerCase();

  if (path.startsWith(DASHBOARD_ROUTE_PREFIX)) return null;
  if (path.startsWith('/alunos')) return ['alunos'];
  if (path.startsWith('/turmas')) return ['turmas'];
  if (path.startsWith('/cursos')) return ['cursos'];
  if (path.startsWith('/aulas')) return ['aulas', 'plano_aulas'];
  if (path.startsWith('/notas')) return ['avaliacoes'];
  if (path.startsWith('/frequencia')) return ['frequencias'];
  if (path.startsWith('/financeiro')) return ['transacoes', 'propina', 'alocacao'];
  if (path.startsWith('/estrategia')) return ['metas', 'tarefas', 'rotinas', 'planeamentos'];

  return [];
};

const runScopedSyncForCurrentRoute = async () => {
  if (autoSyncInFlight || !navigator.onLine) return;

  autoSyncInFlight = true;
  try {
    const pathname = getCurrentPathname();
    const scopedTables = getScopedTablesForRoute(pathname);

    if (scopedTables === null) {
      await syncManager.uploadBatch();
      await syncManager.downloadBatch();
      return;
    }

    if (scopedTables.length === 0) return;

    for (const tableName of scopedTables) {
      await syncManager.uploadTableBatch(tableName);
      await syncManager.downloadTableBatch(tableName, getLastSyncDateForTable(tableName));
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  } catch (error) {
    console.error('❌ Erro na sincronização por rota:', error);
  } finally {
    autoSyncInFlight = false;
  }
};


export const setupAutoSync = () => {
  if (onlineSyncHandler) {
    window.removeEventListener('online', onlineSyncHandler);
  }

  const GHOST_CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000; 

  let ghostCleanupInterval: ReturnType<typeof setInterval> | null = null;

  if (ghostCleanupInterval) {
    clearInterval(ghostCleanupInterval);
  }

  ghostCleanupInterval = setInterval(async () => {
    if (navigator.onLine) {
      console.log('🧹 Executando limpeza programada de dados fantasmas...');
      await syncManager.safeGhostDataCleanup({
        tables: ['alunos', 'turmas', 'cursos', 'aulas', 'frequencias', 'avaliacoes']
      });
    }
  }, GHOST_CLEANUP_INTERVAL);

  
  const onlineHandler = async () => {
    await syncManager.safeGhostDataCleanup({
      tables: ['alunos', 'turmas', 'cursos']
    });
    await runScopedSyncForCurrentRoute();
  };


  onlineSyncHandler = async () => {
    await runScopedSyncForCurrentRoute();
  };
  window.addEventListener('online', onlineSyncHandler);

  if (quickSyncHandler) {
    window.removeEventListener('sync-queue-enqueued', quickSyncHandler);
  }
  quickSyncHandler = () => {
    if (quickSyncTimeout) {
      clearTimeout(quickSyncTimeout);
    }
    quickSyncTimeout = setTimeout(async () => {
      quickSyncTimeout = null;
      await runScopedSyncForCurrentRoute();
    }, 1200);
  };
  window.addEventListener('sync-queue-enqueued', quickSyncHandler);

  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
  }
  autoSyncInterval = setInterval(async () => {
    await runScopedSyncForCurrentRoute();
  }, AUTO_SYNC_INTERVAL_MS);

  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  cleanupInterval = setInterval(async () => {
    await syncManager.cleanupOldItems(24);
    await syncManager.verifyQueueIntegrity();
  }, 24 * 60 * 60 * 1000);

  if (integrityInterval) {
    clearInterval(integrityInterval);
  }
  integrityInterval = setInterval(async () => {
    await syncManager.verifyQueueIntegrity();
  }, 60 * 60 * 1000);

  return {
    stop: () => {
      if (autoSyncInterval) clearInterval(autoSyncInterval);
      if (cleanupInterval) clearInterval(cleanupInterval);
      if (integrityInterval) clearInterval(integrityInterval);
      if (onlineSyncHandler) window.removeEventListener('online', onlineSyncHandler);
      if (quickSyncHandler) window.removeEventListener('sync-queue-enqueued', quickSyncHandler);
      if (quickSyncTimeout) clearTimeout(quickSyncTimeout);
      if (ghostCleanupInterval) clearInterval(ghostCleanupInterval);
      autoSyncInterval = null;
      cleanupInterval = null;
      integrityInterval = null;
      onlineSyncHandler = null;
      quickSyncHandler = null;
      quickSyncTimeout = null;
      autoSyncInitialized = false;
      autoSyncInFlight = false;
    }
  };
};





export const createSyncMonitor = () => {
  let lastStats: any = null;

  return {
    async monitor() {
      const stats = await syncManager.getSyncStats();
      const changed = JSON.stringify(stats) !== JSON.stringify(lastStats);

      if (changed) {
        lastStats = stats;

        
        const event = new CustomEvent('sync-stats-update', { detail: stats });
        window.dispatchEvent(event);
      }

      return stats;
    },

    startMonitoring(intervalMs: number = 5000) {
      const interval = setInterval(() => this.monitor(), intervalMs);
      return () => clearInterval(interval);
    }
  };
};


export const initializeSyncSystem = async () => {
  try {
    if (autoSyncInitialized) {
      return;
    }

    setupAutoSync();
    autoSyncInitialized = true;

    if (navigator.onLine) {
      await runScopedSyncForCurrentRoute();
    }

    } catch (error) {

    console.error('❌ Erro ao inicializar sistema de sincronização:', error);
  }
}
