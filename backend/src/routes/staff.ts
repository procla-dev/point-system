import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { createSchemaFactory } from 'drizzle-zod';
import { users, loginTokens } from '../db/schema.js';
import { ErrorResponse } from '../errors.js';
import { requireRole } from '../middleware/auth.js';
import { createLoginToken } from '../services/auth.js';
import { createStaff } from '../services/staff.js';

const { createSelectSchema } = createSchemaFactory({ zodInstance: z });

const StaffResponse = createSelectSchema(users).pick({
  id: true,
  boothId: true,
});

const LoginTokenResponse = createSelectSchema(loginTokens)
  .pick({ expiresAt: true })
  .extend({ token: z.string().openapi({ description: 'ログイン用QRコードに埋め込むワンタイムトークン' }) });

const StaffWithLoginTokenResponse = StaffResponse.extend({
  token: LoginTokenResponse.shape.token,
  expiresAt: LoginTokenResponse.shape.expiresAt,
});

const createStaffRoute = createRoute({
  method: 'post',
  path: '/',
  operationId: 'createStaff',
  tags: ['Staff'],
  summary: 'スタッフアカウントとログイントークンを発行する',
  middleware: [requireRole('admin')] as const,
  responses: {
    201: { description: '作成成功', content: { 'application/json': { schema: StaffWithLoginTokenResponse } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '管理者ではない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

export const staff = new OpenAPIHono();

staff.openapi(createStaffRoute, async (c) => {
  const newStaff = await createStaff();
  const { token, expiresAt } = await createLoginToken(newStaff.id);

  return c.json({ id: newStaff.id, boothId: newStaff.boothId, token, expiresAt }, 201);
});
