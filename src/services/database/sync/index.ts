import { SyncManager } from "../../../types/sync/syncManager";
import { conflictResolver } from "./conflictResolver";
import { downloadService } from "./downloadService";
import { ghostCleanUpService } from "./ghostCleanupService";
import { localIdMapper } from "./localIdMapper";
import { uploadService } from "./uploadService";

export const syncManagerService = {
   ...uploadService,
   ...ghostCleanUpService,
   ...downloadService,
   ...localIdMapper,
   ...conflictResolver
}