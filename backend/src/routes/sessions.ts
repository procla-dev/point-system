import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { createSchemaFactory } from 'drizzle-zod';
import { setCookie } from 'hono/cookie';
import { users } from '../db/schema.js';
import { consumeLoginToken, createSession, SESSION_COOKIE_NAME } from '../services/auth.js';

const { createSelectSchema } = createSchemaFactory({ zodInstance: z });

const CreateSessionRequest = z.object({
  token: z.string().openapi({ description: 'ログイン用QRコードから読み取ったトークン' }),
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
    401: { description: 'トークンが無効または期限切れ' },
  },
});

export const sessions = new OpenAPIHono();

sessions.openapi(createSessionRoute, async (c) => {
  const { token } = c.req.valid('json');

  const user = await consumeLoginToken(token);
  if (!user) return c.json('', 401);

  const sessionToken = await createSession(user.id);
  setCookie(c, SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  return c.json({ role: user.role, displayName: user.displayName }, 201);
});
