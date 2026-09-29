import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { StorageDriver, UploadFileInput, UploadResult } from './types';
import { generateStorageKey, isValidStorageKey, validateImageFile } from './validation';

export interface S3StorageDriverConfig {
  endpoint?: string;
  region?: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicBaseUrl?: string;
}

export class S3CompatibleStorageDriver implements StorageDriver {
  readonly name = 's3';
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl: string;

  constructor(config: S3StorageDriverConfig = {}) {
    const bucket = config.bucket || process.env.STORAGE_BUCKET;
    const accessKeyId = config.accessKeyId || process.env.STORAGE_ACCESS_KEY_ID;
    const secretAccessKey = config.secretAccessKey || process.env.STORAGE_SECRET_ACCESS_KEY;
    const endpoint = config.endpoint || process.env.STORAGE_ENDPOINT;
    const region = config.region || process.env.STORAGE_REGION || 'auto';
    const publicBaseUrl = (
      config.publicBaseUrl ||
      process.env.STORAGE_PUBLIC_BASE_URL ||
      ''
    ).replace(/\/+$/, '');

    // Strict configuration check: Do not allow partial/missing credentials
    const missing: string[] = [];
    if (!bucket) missing.push('STORAGE_BUCKET');
    if (!accessKeyId) missing.push('STORAGE_ACCESS_KEY_ID');
    if (!secretAccessKey) missing.push('STORAGE_SECRET_ACCESS_KEY');

    if (missing.length > 0) {
      const err: any = new Error(
        `S3 storage driver is configured (STORAGE_DRIVER=s3) but required configuration is missing: ${missing.join(', ')}. ` +
        `Configure these variables in your production environment.`
      );
      err.statusCode = 500;
      err.code = 'STORAGE_CONFIG_ERROR';
      throw err;
    }

    this.bucket = bucket!;
    this.publicBaseUrl = publicBaseUrl;

    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
      // Force path style for MinIO/custom S3-compatible endpoints if endpoint provided
      forcePathStyle: Boolean(endpoint && !endpoint.includes('amazonaws.com') && !endpoint.includes('cloudflarestorage.com')),
    });
  }

  async upload(file: UploadFileInput, customKey?: string): Promise<UploadResult> {
    const validation = validateImageFile(file.buffer, file.mimetype, file.filename);
    if (!validation.isValid) {
      const err: any = new Error(validation.error || 'Invalid file');
      err.statusCode = 400;
      throw err;
    }

    const key = customKey || generateStorageKey(validation.suggestedExtension || '.jpg');
    if (!isValidStorageKey(key)) {
      const err: any = new Error('Invalid storage key generated');
      err.statusCode = 400;
      throw err;
    }

    const detectedMime = validation.detectedMime || file.mimetype;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: detectedMime,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
    } catch (err: any) {
      const uploadErr: any = new Error(`Failed to upload media to S3-compatible storage: ${err.message}`);
      uploadErr.statusCode = 502;
      throw uploadErr;
    }

    // Determine public URL
    let publicUrl: string;
    if (this.publicBaseUrl) {
      publicUrl = `${this.publicBaseUrl}/${key}`;
    } else {
      const endpoint = process.env.STORAGE_ENDPOINT;
      if (endpoint) {
        publicUrl = `${endpoint.replace(/\/+$/, '')}/${this.bucket}/${key}`;
      } else {
        const region = process.env.STORAGE_REGION || 'us-east-1';
        publicUrl = `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
      }
    }

    return {
      url: publicUrl,
      key,
      filename: key.split('/').pop() || key,
      size: file.buffer.length,
      mimetype: detectedMime,
    };
  }

  async delete(key: string): Promise<void> {
    if (!isValidStorageKey(key)) {
      const err: any = new Error(`Invalid storage key format '${key}'`);
      err.statusCode = 400;
      throw err;
    }

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
    } catch (err: any) {
      // Idempotent: log or ignore non-critical delete errors
      console.warn(`[S3StorageDriver] Could not delete key '${key}':`, err.message);
    }
  }
}
