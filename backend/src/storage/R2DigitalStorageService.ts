import { randomUUID } from 'node:crypto';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const MAX_DIGITAL_FILE_SIZE_BYTES = 100 * 1024 * 1024;
export const UPLOAD_URL_TTL_SECONDS = 60;
export const DOWNLOAD_URL_TTL_SECONDS = 90;

export const DIGITAL_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/epub+zip': '.epub',
  'application/zip': '.zip',
  'application/vnd.android.package-archive': '.apk',
} as const;

export type DigitalMimeType = keyof typeof DIGITAL_FILE_TYPES;

export class DigitalStorageError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'DIGITAL_STORAGE_ERROR') {
    super(message);
    this.name = 'DigitalStorageError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface ValidDigitalFileInput {
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ValidatedDigitalFileInput {
  originalFilename: string;
  mimeType: DigitalMimeType;
  sizeBytes: number;
  extension: string;
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const FINAL_KEY_RE = new RegExp(`^digital-files/${UUID}\\.(pdf|epub|zip|apk)$`, 'i');
const STAGING_KEY_RE = new RegExp(`^digital-staging/${UUID}\\.(pdf|epub|zip|apk)$`, 'i');

export function validateDigitalFileInput(
  input: ValidDigitalFileInput,
): ValidatedDigitalFileInput {
  if (!input || typeof input.filename !== 'string') {
    throw new DigitalStorageError('A filename is required.');
  }

  const originalFilename = input.filename
    .split(/[\\/]/)
    .pop()
    ?.replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();

  if (!originalFilename || originalFilename.length > 255) {
    throw new DigitalStorageError('Filename must be 1–255 characters.');
  }

  const mimeType = String(input.mimeType || '').trim().toLowerCase();

  if (!Object.prototype.hasOwnProperty.call(DIGITAL_FILE_TYPES, mimeType)) {
    throw new DigitalStorageError(
      'Unsupported digital file type. Allowed: PDF, EPUB, ZIP and APK.',
    );
  }

  const extension = DIGITAL_FILE_TYPES[mimeType as DigitalMimeType];
  const dot = originalFilename.lastIndexOf('.');
  const actualExtension = dot >= 0 ? originalFilename.slice(dot).toLowerCase() : '';

  if (actualExtension !== extension) {
    throw new DigitalStorageError('Filename extension does not match the MIME type.');
  }

  if (
    !Number.isSafeInteger(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > MAX_DIGITAL_FILE_SIZE_BYTES
  ) {
    throw new DigitalStorageError('File size must be between 1 byte and 100 MiB.');
  }

  return {
    originalFilename,
    mimeType: mimeType as DigitalMimeType,
    sizeBytes: input.sizeBytes,
    extension,
  };
}

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  const missing = [
    !accountId && 'R2_ACCOUNT_ID',
    !bucket && 'R2_BUCKET',
    !accessKeyId && 'R2_ACCESS_KEY_ID',
    !secretAccessKey && 'R2_SECRET_ACCESS_KEY',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new DigitalStorageError(
      `R2 configuration is missing: ${missing.join(', ')}`,
      500,
      'R2_CONFIG_ERROR',
    );
  }

  if (!/^[a-f0-9]{32}$/i.test(accountId!)) {
    throw new DigitalStorageError('R2_ACCOUNT_ID format is invalid.', 500, 'R2_CONFIG_ERROR');
  }

  return {
    bucket: bucket!,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
  };
}

let cachedClient: S3Client | undefined;
let cachedConfigFingerprint: string | undefined;

function getR2Client(): { client: S3Client; bucket: string } {
  const config = getR2Config();
  const fingerprint = [
    config.endpoint,
    config.bucket,
    config.accessKeyId,
    config.secretAccessKey,
  ].join('|');

  if (!cachedClient || cachedConfigFingerprint !== fingerprint) {
    cachedClient?.destroy();

    cachedClient = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    cachedConfigFingerprint = fingerprint;
  }

  return { client: cachedClient, bucket: config.bucket };
}

export function createDigitalStorageKey(mimeType: DigitalMimeType): string {
  return `digital-files/${randomUUID()}${DIGITAL_FILE_TYPES[mimeType]}`;
}

export function createDigitalStagingKey(finalKey: string): string {
  if (!FINAL_KEY_RE.test(finalKey)) {
    throw new DigitalStorageError('Invalid final digital storage key.', 500);
  }

  return finalKey.replace(/^digital-files\//, 'digital-staging/');
}

export function getFinalKeyFromStagingKey(stagingKey: string): string {
  if (!STAGING_KEY_RE.test(stagingKey)) {
    throw new DigitalStorageError('Invalid staging storage key.', 400);
  }

  return stagingKey.replace(/^digital-staging\//, 'digital-files/');
}

export async function createPresignedDigitalUpload(input: {
  storageKey: string;
  mimeType: DigitalMimeType;
}): Promise<{ uploadUrl: string; expiresInSeconds: number }> {
  if (!STAGING_KEY_RE.test(input.storageKey)) {
    throw new DigitalStorageError('Invalid generated staging key.', 500);
  }

  const { client, bucket } = getR2Client();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: input.storageKey,
    ContentType: input.mimeType,
    CacheControl: 'private, no-store',
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  });

  return { uploadUrl, expiresInSeconds: UPLOAD_URL_TTL_SECONDS };
}

async function readRange(body: any): Promise<Uint8Array> {
  if (!body) {
    throw new DigitalStorageError('Unable to read uploaded file signature.', 400);
  }

  if (typeof body.transformToByteArray === 'function') {
    return body.transformToByteArray();
  }

  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function hasValidContainerSignature(mimeType: DigitalMimeType, bytes: Uint8Array): boolean {
  if (mimeType === 'application/pdf') {
    return Buffer.from(bytes).subarray(0, 1024).toString('latin1').includes('%PDF-');
  }

  // Basic ZIP header check only, not archive integrity or malware scanning.
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (
      (bytes[2] === 0x03 && bytes[3] === 0x04) ||
      (bytes[2] === 0x05 && bytes[3] === 0x06) ||
      (bytes[2] === 0x07 && bytes[3] === 0x08)
    )
  );
}

export async function verifyUploadedDigitalObject(input: {
  storageKey: string;
  expectedMimeType: DigitalMimeType;
  expectedSizeBytes: number;
}): Promise<{ sizeBytes: number; etag: string | null }> {
  if (!STAGING_KEY_RE.test(input.storageKey)) {
    throw new DigitalStorageError('Invalid staging storage key.', 400);
  }

  const { client, bucket } = getR2Client();
  const head = await client.send(
    new HeadObjectCommand({ Bucket: bucket, Key: input.storageKey }),
  );

  const actualSize = head.ContentLength;
  const actualMime = head.ContentType?.split(';')[0].trim().toLowerCase();

  const validSize =
    Number.isSafeInteger(actualSize) &&
    actualSize! > 0 &&
    actualSize! <= MAX_DIGITAL_FILE_SIZE_BYTES &&
    actualSize === input.expectedSizeBytes;

  const validMime = actualMime === input.expectedMimeType;
  let validSignature = false;

  if (validSize && validMime) {
    const result = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: input.storageKey,
        Range: 'bytes=0-1023',
      }),
    );

    const bytes = await readRange(result.Body);
    validSignature = hasValidContainerSignature(input.expectedMimeType, bytes);
  }

  if (!validSize || !validMime || !validSignature) {
    try {
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: input.storageKey }),
      );
    } catch {
      throw new DigitalStorageError(
        'Upload verification failed and temporary-object cleanup also failed.',
        502,
        'DIGITAL_FILE_CLEANUP_FAILED',
      );
    }

    throw new DigitalStorageError(
      'Uploaded file failed size, MIME type, or basic file-signature verification.',
      400,
      'DIGITAL_FILE_VERIFICATION_FAILED',
    );
  }

  return {
    sizeBytes: actualSize!,
    etag: head.ETag?.replace(/^"|"$/g, '') || null,
  };
}

/** Copy a verified staging object into its private final key. */
export async function promoteStagedDigitalObject(input: {
  stagingKey: string;
  mimeType: DigitalMimeType;
  expectedETag: string;
}): Promise<string> {
  if (!STAGING_KEY_RE.test(input.stagingKey)) {
    throw new DigitalStorageError('Invalid staging storage key.', 400);
  }

  const expectedETag = input.expectedETag?.trim().replace(/^"|"$/g, '');
  if (!expectedETag) {
    throw new DigitalStorageError(
      'Verified ETag is required before promoting a staged upload.',
      409,
      'DIGITAL_FILE_ETAG_REQUIRED',
    );
  }

  const finalKey = getFinalKeyFromStagingKey(input.stagingKey);
  const { client, bucket } = getR2Client();
  const encodedCopySource =
    `/${bucket}/${input.stagingKey.split('/').map(encodeURIComponent).join('/')}`;

  try {
    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        Key: finalKey,
        CopySource: encodedCopySource,
        CopySourceIfMatch: `"${expectedETag}"`,
        MetadataDirective: 'REPLACE',
        ContentType: input.mimeType,
        CacheControl: 'private, no-store',
      }),
    );
  } catch (err: any) {
    const httpStatus = err?.$metadata?.httpStatusCode;
    const name = err?.name;
    if (httpStatus === 412 || name === 'PreconditionFailed') {
      throw new DigitalStorageError(
        'Staged file was modified or ETag mismatch during promotion.',
        412,
        'DIGITAL_FILE_ETAG_MISMATCH',
      );
    }
    throw err;
  }

  return finalKey;
}
export async function deleteStagedDigitalObject(stagingKey: string): Promise<void> {
  if (!STAGING_KEY_RE.test(stagingKey)) {
    throw new DigitalStorageError('Invalid staging storage key.', 400);
  }

  const { client, bucket } = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: stagingKey }));
}

export async function deleteDigitalObject(storageKey: string): Promise<void> {
  if (!FINAL_KEY_RE.test(storageKey)) {
    throw new DigitalStorageError('Invalid digital storage key.', 400);
  }

  const { client, bucket } = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }));
}

export async function createPresignedDigitalDownload(input: {
  storageKey: string;
  mimeType: DigitalMimeType;
  originalFilename: string;
}): Promise<{ downloadUrl: string; expiresInSeconds: number }> {
  if (!FINAL_KEY_RE.test(input.storageKey)) {
    throw new DigitalStorageError('Invalid final digital storage key.', 400);
  }

  const { client, bucket } = getR2Client();
  const safeFilename = input.originalFilename.replace(/["\\/\r\n]/g, '_');
  const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(safeFilename)}`;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: input.storageKey,
    ResponseContentType: input.mimeType,
    ResponseContentDisposition: disposition,
    ResponseCacheControl: 'private, no-store',
  });

  const downloadUrl = await getSignedUrl(client, command, {
    expiresIn: DOWNLOAD_URL_TTL_SECONDS,
  });

  return { downloadUrl, expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS };
}
