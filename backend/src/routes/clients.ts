import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { createSchemaFactory } from 'drizzle-zod';
import { loginTokens, users } from '../db/schema.js';
import { createLoginToken } from '../services/auth.js';
import { createClient, findClientById } from '../services/clients.js';

const { createSelectSchema } = createSchemaFactory({ zodInstance: z });

const ClientResponse = createSelectSchema(users).pick({
  id: true,
  displayName: true,
});

const LoginTokenResponse = createSelectSchema(loginTokens)
  .pick({ expiresAt: true })
  .extend({ token: z.string().openapi({ description: 'ログイン用QRコードに埋め込むワンタイムトークン' }) });

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
