import { StorageDriver, UploadFileInput, UploadResult } from './types';
export interface S3StorageDriverConfig {
    endpoint?: string;
    region?: string;
    bucket?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    publicBaseUrl?: string;
}
export declare class S3CompatibleStorageDriver implements StorageDriver {
    readonly name = "s3";
    private client;
    private bucket;
    private publicBaseUrl;
    constructor(config?: S3StorageDriverConfig);
    upload(file: UploadFileInput, customKey?: string): Promise<UploadResult>;
    delete(key: string): Promise<void>;
}
