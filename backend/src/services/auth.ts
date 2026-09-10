import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, loginTokens, sessions } from '../db/schema.js';

export const SESSION_COOKIE_NAME = 'session';

const LOGIN_TOKEN_TTL_MS = 5 * 60 * 1000;

const generateToken = (): string => randomBytes(32).toString('base64url');
const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export async function createLoginToken(userId: string) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_TTL_MS);

  await db.insert(loginTokens).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return { token, expiresAt };
}

export async function consumeLoginToken(token: string) {
  const tokenHash = hashToken(token);

  const row = await db.query.loginTokens.findFirst({
    where: and(eq(loginTokens.tokenHash, tokenHash), isNull(loginTokens.usedAt), gt(loginTokens.expiresAt, new Date())),
  });
  if (!row) return null;

  // 同時リクエストでの二重ログインを防ぐため、セッション作成より先に使用済みにする
  await db.update(loginTokens).set({ usedAt: new Date() }).where(eq(loginTokens.id, row.id));

  return db.query.users.findFirst({ where: eq(users.id, row.userId) });
}

export async function createSession(userId: string) {
  const token = generateToken();

  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
  });

  return token;
}

export async function getSessionUser(token: string) {
  const tokenHash = hashToken(token);

  const row = await db.query.sessions.findFirst({
    where: eq(sessions.tokenHash, tokenHash),
    with: { user: true },
  });

  return row?.user;
}
