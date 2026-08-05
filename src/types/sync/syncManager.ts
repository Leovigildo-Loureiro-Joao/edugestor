import { SyncQueueItem } from "../base";
import { UploadSync } from "./uploadSync";

export interface SyncManager extends UploadSync {
  
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


export interface GhostDataCleanupResult {
  totalScanned: number;
  ghostsFound: number;
  ghostsRemoved: number;
  byTable: Record<string, { found: number; removed: number }>;
  errors: Array<{ table: string; recordId: string; error: string }>;
  timestamp: string;
}

export interface GhostDataOptions {
  tables?: string[];
  dryRun?: boolean;
  force?: boolean;
  batchSize?: number;
  excludeTables?: string[];
}
