export interface UploadFileInput {
    buffer: Buffer;
    filename: string;
    mimetype: string;
}
export interface UploadResult {
    url: string;
    key: string;
    filename: string;
    size: number;
    mimetype: string;
}
export interface StorageDriver {
    readonly name: string;
    upload(file: UploadFileInput, customKey?: string): Promise<UploadResult>;
    delete(key: string): Promise<void>;
}
