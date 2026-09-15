import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { createSchemaFactory } from 'drizzle-zod';
import { users, loginTokens } from '../db/schema.js';
import { ErrorResponse, NotFoundError } from '../errors.js';
import { requireRole } from '../middleware/auth.js';
import { createLoginToken } from '../services/auth.js';
import { findBoothById } from '../services/booths.js';
import { createStaff, findStaffById } from '../services/staff.js';

const { createSelectSchema } = createSchemaFactory({ zodInstance: z });

const StaffResponse = createSelectSchema(users).pick({
  id: true,
  boothId: true,
});

const LoginTokenResponse = createSelectSchema(loginTokens)
  .pick({ expiresAt: true })
  .extend({ token: z.string().openapi({ description: 'ログイン用QRコードに埋め込むワンタイムトークン' }) });

const createStaffRoute = createRoute({
  method: 'post',
  path: '/',
  operationId: 'createStaff',
  tags: ['Staff'],
  summary: 'スタッフアカウントを発行する',
  middleware: [requireRole('admin')] as const,
  request: { body: { content: { 'application/json': { schema: z.object({ boothId: z.uuid() }) } } } },
  responses: {
    201: { description: '作成成功', content: { 'application/json': { schema: StaffResponse } } },
    404: { description: 'ブースが見つからない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const issueStaffLoginTokenRoute = createRoute({
  method: 'post',
  path: '/{id}/login-tokens',
  operationId: 'issueStaffLoginToken',
  tags: ['Staff'],
  summary: 'スタッフのログイン用トークンを発行する',
  middleware: [requireRole('admin')] as const,
  request: { params: z.object({ id: z.uuid() }) },
  responses: {
    201: { description: '発行成功', content: { 'application/json': { schema: LoginTokenResponse } } },
    404: { description: 'スタッフが見つからない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

export const staff = new OpenAPIHono();

staff.openapi(createStaffRoute, async (c) => {
  const { boothId } = c.req.valid('json');

  const booth = await findBoothById(boothId);
  if (!booth) throw new NotFoundError('booth not found');

  const newStaff = await createStaff(boothId);
  return c.json({ id: newStaff.id, boothId: newStaff.boothId }, 201);
});

staff.openapi(issueStaffLoginTokenRoute, async (c) => {
  const { id } = c.req.valid('param');

  const targetStaff = await findStaffById(id);
  if (!targetStaff) throw new NotFoundError('staff not found');

  const { token, expiresAt } = await createLoginToken(targetStaff.id);
  return c.json({ token, expiresAt }, 201);
});
