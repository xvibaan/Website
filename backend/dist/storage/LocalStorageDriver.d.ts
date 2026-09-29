import { StorageDriver, UploadFileInput, UploadResult } from './types';
export interface LocalStorageDriverOptions {
    uploadsDir?: string;
    publicBaseUrl?: string;
}
export declare class LocalStorageDriver implements StorageDriver {
    readonly name = "local";
    private uploadsDir;
    private publicBaseUrl;
    constructor(options?: LocalStorageDriverOptions);
    upload(file: UploadFileInput, customKey?: string): Promise<UploadResult>;
    delete(key: string): Promise<void>;
}
