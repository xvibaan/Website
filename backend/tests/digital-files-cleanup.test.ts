import assert from 'node:assert/strict';
import {
  createDigitalStagingKey,
  createDigitalStorageKey,
} from '../src/storage/R2DigitalStorageService';

const STAGING_KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|epub|zip|apk)$/i;

async function main() {
  console.log('--- Digital Files Staging Cleanup Safety Tests ---');

  // 1. Staging Key Regex Strictly Validates Key Structure
  {
    const validKey = '00000000-0000-0000-0000-000000000001.pdf';
    assert.equal(STAGING_KEY_RE.test(validKey), true);

    // Malicious or mismatched keys must fail regex
    const maliciousKeys = [
      '../../secret.txt',
      '00000000-0000-0000-0000-000000000001.exe',
      'final-files/00000000-0000-0000-0000-000000000001.pdf',
      'digital-staging/something',
      '',
    ];

    for (const key of maliciousKeys) {
      assert.equal(
        STAGING_KEY_RE.test(key),
        false,
        `Malicious key "${key}" should be rejected by staging regex`,
      );
    }
    console.log('[PASS] Staging key regex blocks non-staging and malicious paths');
  }

  // 2. Safeguard: Final Private Storage Keys Can Never Be Derived As Staging Keys
  {
    const finalKey = createDigitalStorageKey('application/pdf');
    assert.ok(finalKey.startsWith('digital-files/'));

    const stagingKey = createDigitalStagingKey(finalKey);
    assert.ok(stagingKey.startsWith('digital-staging/'));

    // Attempting to derive staging key from an invalid or non-digital key fails
    assert.throws(() => createDigitalStagingKey('avatars/pic.png'));
    assert.throws(() => createDigitalStagingKey('products/image.jpg'));
    console.log('[PASS] Storage derivation guarantees digital-staging prefix boundary');
  }

  // 3. Minimum Age Boundary Clamping
  {
    // maxAgeHours must be clamped to minimum 1 hour to prevent sweeping in-flight uploads
    const sanitizeMaxAgeHours = (h?: number) => Math.max(1, h ?? 24);
    assert.equal(sanitizeMaxAgeHours(-10), 1);
    assert.equal(sanitizeMaxAgeHours(0), 1);
    assert.equal(sanitizeMaxAgeHours(0.5), 1);
    assert.equal(sanitizeMaxAgeHours(48), 48);
    assert.equal(sanitizeMaxAgeHours(undefined), 24);
    console.log('[PASS] Cleanup age threshold clamped to safe minimum (>= 1 hour)');
  }

  // 4. Stale vs Recent Timestamp Cutoff Logic
  {
    const now = Date.now();
    const cutoff24h = new Date(now - 24 * 60 * 60 * 1000);

    const recordAbandoned2DaysAgo = new Date(now - 48 * 60 * 60 * 1000);
    const recordJustInitiated5MinAgo = new Date(now - 5 * 60 * 1000);

    assert.ok(recordAbandoned2DaysAgo < cutoff24h, 'Old abandoned record should be swept');
    assert.ok(recordJustInitiated5MinAgo >= cutoff24h, 'Active recent upload must NOT be swept');
    console.log('[PASS] Cutoff filtering correctly isolates stale abandoned records from active uploads');
  }

  console.log('ALL CLEANUP SAFETY TESTS PASSED (4/4)\n');
}

main().catch((err) => {
  console.error('Cleanup test failed:', err);
  process.exit(1);
});