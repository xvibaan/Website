"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3CompatibleStorageDriver = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const validation_1 = require("./validation");
class S3CompatibleStorageDriver {
    name = 's3';
    client;
    bucket;
    publicBaseUrl;
    constructor(config = {}) {
        const bucket = config.bucket || process.env.STORAGE_BUCKET;
        const accessKeyId = config.accessKeyId || process.env.STORAGE_ACCESS_KEY_ID;
        const secretAccessKey = config.secretAccessKey || process.env.STORAGE_SECRET_ACCESS_KEY;
        const endpoint = config.endpoint || process.env.STORAGE_ENDPOINT;
        const region = config.region || process.env.STORAGE_REGION || 'auto';
        const publicBaseUrl = (config.publicBaseUrl ||
            process.env.STORAGE_PUBLIC_BASE_URL ||
            '').replace(/\/+$/, '');
        // Strict configuration check: Do not allow partial/missing credentials
        const missing = [];
        if (!bucket)
            missing.push('STORAGE_BUCKET');
        if (!accessKeyId)
            missing.push('STORAGE_ACCESS_KEY_ID');
        if (!secretAccessKey)
            missing.push('STORAGE_SECRET_ACCESS_KEY');
        if (missing.length > 0) {
            const err = new Error(`S3 storage driver is configured (STORAGE_DRIVER=s3) but required configuration is missing: ${missing.join(', ')}. ` +
                `Configure these variables in your production environment.`);
            err.statusCode = 500;
            err.code = 'STORAGE_CONFIG_ERROR';
            throw err;
        }
        this.bucket = bucket;
        this.publicBaseUrl = publicBaseUrl;
        this.client = new client_s3_1.S3Client({
            region,
            endpoint: endpoint || undefined,
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
            },
            // Force path style for MinIO/custom S3-compatible endpoints if endpoint provided
            forcePathStyle: Boolean(endpoint && !endpoint.includes('amazonaws.com') && !endpoint.includes('cloudflarestorage.com')),
        });
    }
    async upload(file, customKey) {
        const validation = (0, validation_1.validateImageFile)(file.buffer, file.mimetype, file.filename);
        if (!validation.isValid) {
            const err = new Error(validation.error || 'Invalid file');
            err.statusCode = 400;
            throw err;
        }
        const key = customKey || (0, validation_1.generateStorageKey)(validation.suggestedExtension || '.jpg');
        if (!(0, validation_1.isValidStorageKey)(key)) {
            const err = new Error('Invalid storage key generated');
            err.statusCode = 400;
            throw err;
        }
        const detectedMime = validation.detectedMime || file.mimetype;
        try {
            await this.client.send(new client_s3_1.PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: file.buffer,
                ContentType: detectedMime,
                CacheControl: 'public, max-age=31536000, immutable',
            }));
        }
        catch (err) {
            const uploadErr = new Error(`Failed to upload media to S3-compatible storage: ${err.message}`);
            uploadErr.statusCode = 502;
            throw uploadErr;
        }
        // Determine public URL
        let publicUrl;
        if (this.publicBaseUrl) {
            publicUrl = `${this.publicBaseUrl}/${key}`;
        }
        else {
            const endpoint = process.env.STORAGE_ENDPOINT;
            if (endpoint) {
                publicUrl = `${endpoint.replace(/\/+$/, '')}/${this.bucket}/${key}`;
            }
            else {
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
    async delete(key) {
        if (!(0, validation_1.isValidStorageKey)(key)) {
            const err = new Error(`Invalid storage key format '${key}'`);
            err.statusCode = 400;
            throw err;
        }
        try {
            await this.client.send(new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }));
        }
        catch (err) {
            // Idempotent: log or ignore non-critical delete errors
            console.warn(`[S3StorageDriver] Could not delete key '${key}':`, err.message);
        }
    }
}
exports.S3CompatibleStorageDriver = S3CompatibleStorageDriver;
