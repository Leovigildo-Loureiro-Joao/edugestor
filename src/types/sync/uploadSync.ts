export interface UploadSync {
    uploadBatch(): Promise<void>;
    uploadFailedItems():Promise<any>
}