import assert from 'node:assert/strict';
import {
  validateDigitalFileInput,
  createDigitalStorageKey,
  createDigitalStagingKey,
  getFinalKeyFromStagingKey,
  DigitalStorageError,
  MAX_DIGITAL_FILE_SIZE_BYTES,
  DIGITAL_FILE_TYPES,
} from '../src/storage/R2DigitalStorageService';

async function main() {
  console.log('--- Digital Storage Validation & Key Isolation Tests ---');

  // 1. Valid Input Acceptance
  {
    const valid = validateDigitalFileInput({
      filename: 'user-guide.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024 * 50,
    });
    assert.equal(valid.originalFilename, 'user-guide.pdf');
    assert.equal(valid.mimeType, 'application/pdf');
    assert.equal(valid.extension, '.pdf');
    assert.equal(valid.sizeBytes, 51200);
    console.log('[PASS] Valid PDF input accepted');
  }

  // 2. All Whitelisted MIME Types
  {
    for (const [mime, ext] of Object.entries(DIGITAL_FILE_TYPES)) {
      const valid = validateDigitalFileInput({
        filename: `product-asset${ext}`,
        mimeType: mime,
        sizeBytes: 100,
      });
      assert.equal(valid.extension, ext);
    }
    console.log('[PASS] All whitelisted MIME types verified (PDF, EPUB, ZIP, APK)');
  }

  // 3. Reject Unsupported MIME Types
  {
    assert.throws(
      () =>
        validateDigitalFileInput({
          filename: 'malicious.exe',
          mimeType: 'application/x-msdownload',
          sizeBytes: 100,
        }),
      (err: any) =>
        err instanceof DigitalStorageError &&
        err.message.includes('Unsupported digital file type'),
    );
    console.log('[PASS] Executable MIME type blocked');
  }

  // 4. Reject Mismatched Extension and MIME Type
  {
    assert.throws(
      () =>
        validateDigitalFileInput({
          filename: 'payload.exe',
          mimeType: 'application/pdf',
          sizeBytes: 100,
        }),
      (err: any) =>
        err instanceof DigitalStorageError &&
        err.message.includes('Filename extension does not match'),
    );
    console.log('[PASS] Mismatched extension blocked');
  }

  // 5. Filename Sanitization (Path Traversal and Control Chars)
  {
    const sanitized = validateDigitalFileInput({
      filename: '../../../../etc/passwd.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
    });
    assert.equal(sanitized.originalFilename, 'passwd.pdf');

    const sanitizedWindows = validateDigitalFileInput({
      filename: '..\\..\\Windows\\System32\\calc.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
    });
    assert.equal(sanitizedWindows.originalFilename, 'calc.pdf');
    console.log('[PASS] Directory traversal stripped from filename');
  }

  // 6. File Size Boundaries
  {
    // Zero bytes
    assert.throws(
      () =>
        validateDigitalFileInput({
          filename: 'empty.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 0,
        }),
      (err: any) =>
        err instanceof DigitalStorageError && err.message.includes('File size must be between'),
    );

    // Negative bytes
    assert.throws(
      () =>
        validateDigitalFileInput({
          filename: 'negative.pdf',
          mimeType: 'application/pdf',
          sizeBytes: -5,
        }),
      (err: any) =>
        err instanceof DigitalStorageError && err.message.includes('File size must be between'),
    );

    // Over 100 MiB limit
    assert.throws(
      () =>
        validateDigitalFileInput({
          filename: 'huge.pdf',
          mimeType: 'application/pdf',
          sizeBytes: MAX_DIGITAL_FILE_SIZE_BYTES + 1,
        }),
      (err: any) =>
        err instanceof DigitalStorageError && err.message.includes('File size must be between'),
    );
    console.log('[PASS] File size boundary guards enforced (0 to 100 MiB)');
  }

  // 7. Key Generation & Isolation
  {
    const finalKey = createDigitalStorageKey('application/pdf');
    assert.match(
      finalKey,
      /^digital-files\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/,
    );

    const stagingKey = createDigitalStagingKey(finalKey);
    assert.match(
      stagingKey,
      /^digital-staging\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/,
    );

    const derivedFinalKey = getFinalKeyFromStagingKey(stagingKey);
    assert.equal(derivedFinalKey, finalKey);

    // Staging derivation rejects malicious or malformed keys
    assert.throws(
      () => createDigitalStagingKey('public/images/logo.png'),
      (err: any) => err instanceof DigitalStorageError,
    );
    assert.throws(
      () => getFinalKeyFromStagingKey('other-bucket/file.pdf'),
      (err: any) => err instanceof DigitalStorageError,
    );
    console.log('[PASS] Staging and final storage key derivation strictly isolated');
  }

  console.log('ALL STORAGE VALIDATION TESTS PASSED (7/7)\n');
}

main().catch((err) => {
  console.error('Storage validation test failed:', err);
  process.exit(1);
});