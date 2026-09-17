import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, loginTokens, sessions } from '../db/schema.js';

export const SESSION_COOKIE_NAME = 'session';

const LOGIN_TOKEN_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

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

/** 未使用の旧トークンを無効化し、同じユーザーの新しいトークンを発行する。 */
export async function reissueLoginToken(token: string, role: 'user' | 'staff' | 'admin') {
  const oldTokenHash = hashToken(token);
  const newToken = generateToken();
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_TTL_MS);

  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({ userId: loginTokens.userId })
      .from(loginTokens)
      .innerJoin(users, eq(loginTokens.userId, users.id))
      .where(and(eq(loginTokens.tokenHash, oldTokenHash), isNull(loginTokens.usedAt), eq(users.role, role)))
      .limit(1);
    if (!target) return null;

    await tx.update(loginTokens).set({ usedAt: new Date() }).where(eq(loginTokens.tokenHash, oldTokenHash));
    await tx.insert(loginTokens).values({ userId: target.userId, tokenHash: hashToken(newToken), expiresAt });
    return { token: newToken, expiresAt };
  });
}


export async function consumeLoginToken(token: string) {
  const tokenHash = hashToken(token);

  const [row] = await db
    .update(loginTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(loginTokens.tokenHash, tokenHash), isNull(loginTokens.usedAt), gt(loginTokens.expiresAt, new Date())))
    .returning();

  if (!row) return null;
  return db.query.users.findFirst({ where: eq(users.id, row.userId) });
}

export async function createSession(userId: string) {
  const token = generateToken();

  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });

  return token;
}

export async function getSessionUser(token: string) {
  const tokenHash = hashToken(token);

  const row = await db.query.sessions.findFirst({
    where: and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())),
    with: { user: true },
  });

  return row?.user;
}
