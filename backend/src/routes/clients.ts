import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { createSchemaFactory } from 'drizzle-zod';
import { getCookie } from 'hono/cookie';
import { loginTokens, users } from '../db/schema.js';
import { createLoginToken, getSessionUser, SESSION_COOKIE_NAME } from '../services/auth.js';
import { createClient, findClientById, setClientDisplayName } from '../services/clients.js';

const { createSelectSchema } = createSchemaFactory({ zodInstance: z });

const ClientResponse = createSelectSchema(users).pick({
  id: true,
  displayName: true,
});

const LoginTokenResponse = createSelectSchema(loginTokens)
  .pick({ expiresAt: true })
  .extend({ token: z.string().openapi({ description: 'ログイン用QRコードに埋め込むワンタイムトークン' }) });

const updateMeRoute = createRoute({
  method: 'patch',
  path: '/me',
  operationId: 'updateMe',
  tags: ['Clients'],
  summary: '初回ログイン時に自分の表示名を設定する',
  request: {
    body: { content: { 'application/json': { schema: z.object({ displayName: z.string().min(1).max(50) }) } } },
  },
  responses: {
    200: { description: '更新成功', content: { 'application/json': { schema: ClientResponse } } },
    401: { description: '未ログイン' },
    403: { description: 'クライアントとしてログインしていない' },
    409: { description: '表示名は設定済み' },
  },
});

const createClientRoute = createRoute({
  method: 'post',
  path: '/',
  operationId: 'createClient',
  tags: ['Clients'],
  summary: 'クライアントアカウントを発行する',
  responses: {
    201: { description: '作成成功', content: { 'application/json': { schema: ClientResponse } } },
  },
});

const issueLoginTokenRoute = createRoute({
  method: 'post',
  path: '/{id}/login-tokens',
  operationId: 'issueClientLoginToken',
  tags: ['Clients'],
  summary: 'クライアントのログイン用トークンを発行する',
  request: { params: z.object({ id: z.uuid() }) },
  responses: {
    201: { description: '発行成功', content: { 'application/json': { schema: LoginTokenResponse } } },
    404: { description: 'クライアントが見つからない' },
  },
});

export const clients = new OpenAPIHono();

clients.openapi(updateMeRoute, async (c) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  const user = token ? await getSessionUser(token) : undefined;
  if (!user) return c.json('', 401);

  if (user.role !== 'client') return c.json('', 403);
  if (user.displayName !== null) return c.json('', 409);

  const { displayName } = c.req.valid('json');
  const client = await setClientDisplayName(user.id, displayName);

  return c.json({ id: client!.id, displayName: client!.displayName }, 200);
});

clients.openapi(createClientRoute, async (c) => {
  const { id, displayName } = await createClient();
  return c.json({ id, displayName }, 201);
});

clients.openapi(issueLoginTokenRoute, async (c) => {
  const { id } = c.req.valid('param');

  const client = await findClientById(id);
  if (!client) return c.json('', 404); // TODO: 共通のエラースキーマを記述し、正しいエラーレスポンスを返すようにする

  const { token, expiresAt } = await createLoginToken(client.id);
  return c.json({ token, expiresAt }, 201);
});
