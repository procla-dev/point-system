import { createHmac, timingSafeEqual } from 'node:crypto';

function getSecret(): string {
  const secret = process.env.IDENTITY_CODE_SECRET;
  if (!secret) {
    throw new Error('IDENTITY_CODE_SECRET is not set');
  }
  return secret;
}

const secret = getSecret();
const ROTATION_INTERVAL_MS = 30 * 1000;

function sign(payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createIdentityCode(userId: string) {
  const bucket = Math.floor(Date.now() / ROTATION_INTERVAL_MS);
  const payload = `${userId}.${bucket}`;
  const code = `${payload}.${sign(payload)}`;
  const expiresAt = new Date((bucket + 1) * ROTATION_INTERVAL_MS);

  return { code, expiresAt };
}

export function verifyIdentityCode(code: string): string | null {
  const [userId, bucketStr, signature] = code.split('.');
  if (!userId || !bucketStr || !signature) return null;

  const bucket = Number(bucketStr);
  const currentBucket = Math.floor(Date.now() / ROTATION_INTERVAL_MS);
  if (!Number.isInteger(bucket) || bucket < currentBucket - 1 || bucket > currentBucket) return null;

  const expected = Buffer.from(sign(`${userId}.${bucket}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  return userId;
}
