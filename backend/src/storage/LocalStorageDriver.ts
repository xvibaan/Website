import fs from 'fs';
import path from 'path';
import { StorageDriver, UploadFileInput, UploadResult } from './types';
import { generateStorageKey, isValidStorageKey, validateImageFile } from './validation';

export interface LocalStorageDriverOptions {
  uploadsDir?: string;
  publicBaseUrl?: string;
}

export class LocalStorageDriver implements StorageDriver {
  readonly name = 'local';
  private uploadsDir: string;
  private publicBaseUrl: string;

  constructor(options: LocalStorageDriverOptions = {}) {
    this.uploadsDir = options.uploadsDir || path.resolve(process.cwd(), 'uploads');
    this.publicBaseUrl = (
      options.publicBaseUrl ||
      process.env.STORAGE_PUBLIC_BASE_URL ||
      process.env.BACKEND_PUBLIC_URL ||
      'http://localhost:4000'
    ).replace(/\/+$/, '');

    // Ensure uploads directory exists on initialization
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    const productsDir = path.join(this.uploadsDir, 'products');
    if (!fs.existsSync(productsDir)) {
      fs.mkdirSync(productsDir, { recursive: true });
    }
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

    const targetPath = path.resolve(this.uploadsDir, key);

    // Path traversal safety check: ensure targetPath is within uploadsDir
    if (!targetPath.startsWith(path.resolve(this.uploadsDir))) {
      const err: any = new Error('Path traversal attempt rejected');
      err.statusCode = 403;
      throw err;
    }

    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

    // Write file binary buffer
    await fs.promises.writeFile(targetPath, file.buffer);

    const publicUrl = `${this.publicBaseUrl}/uploads/${key}`;

    return {
      url: publicUrl,
      key,
      filename: path.basename(key),
      size: file.buffer.length,
      mimetype: validation.detectedMime || file.mimetype,
    };
  }

  async delete(key: string): Promise<void> {
    if (!isValidStorageKey(key)) {
      // Reject any non-standard key format to prevent arbitrary file deletion
      const err: any = new Error(`Invalid storage key format '${key}'`);
      err.statusCode = 400;
      throw err;
    }

    const targetPath = path.resolve(this.uploadsDir, key);

    // Path traversal safety check
    if (!targetPath.startsWith(path.resolve(this.uploadsDir))) {
      const err: any = new Error('Path traversal attempt rejected');
      err.statusCode = 403;
      throw err;
    }

    try {
      await fs.promises.unlink(targetPath);
    } catch (err: any) {
      // Idempotent: If file does not exist, ignore ENOENT
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }
}
