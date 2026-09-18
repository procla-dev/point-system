import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { createSchemaFactory } from 'drizzle-zod';
import { setCookie } from 'hono/cookie';
import { users } from '../db/schema.js';
import { ErrorResponse, ForbiddenError, UnauthorizedError } from '../errors.js';
import { consumeLoginToken, createSession, SESSION_COOKIE_NAME } from '../services/auth.js';
import { verifyTurnstileToken } from '../services/turnstile.js';

const { createSelectSchema } = createSchemaFactory({ zodInstance: z });

const CreateSessionRequest = z.object({
  token: z.string().openapi({ description: 'ログイン用QRコードから読み取ったトークン' }),
  turnstileToken: z.string().min(1).max(2048).openapi({ description: 'Turnstileのトークン' }),
});

const SessionResponse = createSelectSchema(users).pick({ role: true, displayName: true });

const createSessionRoute = createRoute({
  method: 'post',
  path: '/',
  operationId: 'createSession',
  tags: ['Sessions'],
  summary: 'ログイン用トークンでセッションを確立する',
  request: {
    body: { content: { 'application/json': { schema: CreateSessionRequest } } },
  },
  responses: {
    201: { description: 'ログイン成功', content: { 'application/json': { schema: SessionResponse } } },
    401: { description: 'トークンが無効または期限切れ', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: 'Turnstileの検証に失敗', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

export const sessions = new OpenAPIHono();

sessions.openapi(createSessionRoute, async (c) => {
  const { token, turnstileToken } = c.req.valid('json');

  const ip = c.req.header('CF-Connecting-IP');
  const turnstileOk = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstileOk) throw new ForbiddenError('turnstile verification failed');

  const user = await consumeLoginToken(token);
  if (!user) throw new UnauthorizedError('invalid or expired token');

  const sessionToken = await createSession(user.id);
  setCookie(c, SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24, // 開催期間(1日)に合わせた有効期限
  });

  return c.json({ role: user.role, displayName: user.displayName }, 201);
});
