import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { createSchemaFactory } from 'drizzle-zod';
import { loginTokens, users } from '../db/schema.js';
import { ErrorResponse, NotFoundError } from '../errors.js';
import { requireRole } from '../middleware/auth.js';
import { createAdmin, findAdminById } from '../services/admins.js';
import { createLoginToken } from '../services/auth.js';

const { createSelectSchema } = createSchemaFactory({ zodInstance: z });

const AdminWithLoginTokenResponse = createSelectSchema(users)
  .pick({ id: true })
  .extend({
    token: z.string().openapi({ description: '新しい管理者が初回ログインに使用するワンタイムトークン' }),
    expiresAt: createSelectSchema(loginTokens).shape.expiresAt,
  });

const createAdminRoute = createRoute({
  method: 'post',
  path: '/',
  operationId: 'createAdmin',
  tags: ['Admins'],
  summary: '管理者アカウントを発行する',
  description: 'ログイン済みの管理者が、追加の管理者アカウントと初回ログイン用トークンを発行する。',
  middleware: [requireRole('admin')] as const,
  responses: {
    201: {
      description: '作成成功',
      content: { 'application/json': { schema: AdminWithLoginTokenResponse } },
    },
    401: {
      description: '未ログイン',
      content: { 'application/json': { schema: ErrorResponse } },
    },
    403: {
      description: '管理者ではない',
      content: { 'application/json': { schema: ErrorResponse } },
    },
  },
});

const issueAdminLoginTokenRoute = createRoute({
  method: 'post',
  path: '/{id}/login-tokens',
  operationId: 'issueAdminLoginToken',
  tags: ['Admins'],
  summary: '指定した管理者のログイントークンを発行する',
  middleware: [requireRole('admin')] as const,
  request: { params: z.object({ id: z.uuid() }) },
  responses: {
    201: {
      description: '発行成功',
      content: { 'application/json': { schema: AdminWithLoginTokenResponse.omit({ id: true }) } },
    },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '管理者ではない', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: '管理者が見つからない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

export const admins = new OpenAPIHono();

admins.openapi(createAdminRoute, async (c) => {
  const admin = await createAdmin();
  const { token, expiresAt } = await createLoginToken(admin.id);

  return c.json({ id: admin.id, token, expiresAt }, 201);
});

admins.openapi(issueAdminLoginTokenRoute, async (c) => {
  const { id } = c.req.valid('param');
  const admin = await findAdminById(id);
  if (!admin) throw new NotFoundError('admin not found');

  const { token, expiresAt } = await createLoginToken(admin.id);
  return c.json({ token, expiresAt }, 201);
});
