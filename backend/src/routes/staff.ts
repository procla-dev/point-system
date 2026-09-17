import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { createSchemaFactory } from 'drizzle-zod';
import { loginTokens, booths as boothsTable } from '../db/schema.js';
import { ErrorResponse, NotFoundError, UnauthorizedError } from '../errors.js';
import { requireRole } from '../middleware/auth.js';
import { createLoginToken } from '../services/auth.js';
import { findBoothById } from '../services/booths.js';
import { verifyIdentityCode } from '../services/identity.js';
import { createStaff, findStaffBoothByUserId, setStaffBooth } from '../services/staff.js';
import { recordOperationLog } from '../services/operation-logs.js';

const { createSelectSchema } = createSchemaFactory({ zodInstance: z });

const LoginTokenResponse = createSelectSchema(loginTokens)
  .pick({ expiresAt: true })
  .extend({ token: z.string().openapi({ description: 'ログイン用QRコードに埋め込むワンタイムトークン' }) });

const StaffWithLoginTokenResponse = z.object({
  token: LoginTokenResponse.shape.token,
  expiresAt: LoginTokenResponse.shape.expiresAt,
});

const UpdateStaffBoothRequest = z.object({
  code: z.string().min(1).openapi({ description: '対象スタッフの識別用動的QRコードから読み取ったコード' }),
  boothId: z.uuid().nullable().openapi({ description: '担当させるブースのID。nullの場合は担当ブースを解除する' }),
});

const StaffBoothResponse = createSelectSchema(boothsTable).pick({ name: true }).nullable();

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

const getMyStaffBoothRoute = createRoute({
  method: 'get',
  path: '/me/booth',
  operationId: 'getMyStaffBooth',
  tags: ['Staff'],
  summary: '自分の担当ブースを取得する',
  middleware: [requireRole('staff')] as const,
  responses: {
    200: { description: '取得成功', content: { 'application/json': { schema: StaffBoothResponse } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: 'スタッフではない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const updateStaffBoothRoute = createRoute({
  method: 'patch',
  path: '/booth',
  operationId: 'updateStaffBooth',
  tags: ['Staff'],
  summary: '識別コードで指定したスタッフの担当ブースを更新する',
  middleware: [requireRole('admin')] as const,
  request: { body: { content: { 'application/json': { schema: UpdateStaffBoothRequest } } } },
  responses: {
    200: { description: '更新成功', content: { 'application/json': { schema: StaffBoothResponse } } },
    401: { description: '未ログインまたは識別コードが無効', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '管理者ではない', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'ブースが見つからない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

export const staff = new OpenAPIHono();

staff.openapi(createStaffRoute, async (c) => {
  const newStaff = await createStaff();
  const { token, expiresAt } = await createLoginToken(newStaff.id);
  await recordOperationLog({ actorUserId: c.get('user').id, action: 'staff.create', targetUserId: newStaff.id });

  return c.json({ token, expiresAt }, 201);
});

staff.openapi(getMyStaffBoothRoute, async (c) => {
  const authUser = c.get('user');
  const result = await findStaffBoothByUserId(authUser.id);
  const booth = result?.booth;

  return c.json(booth ? { name: booth.name } : null, 200);
});

staff.openapi(updateStaffBoothRoute, async (c) => {
  const { code, boothId } = c.req.valid('json');

  const userId = verifyIdentityCode(code);
  if (!userId) throw new UnauthorizedError('invalid identity code');

  let booth: { name: string } | null = null;
  if (boothId) {
    const found = await findBoothById(boothId);
    if (!found) throw new NotFoundError('booth not found');
    booth = { name: found.name };
  }

  const updated = await setStaffBooth(userId, boothId);
  if (!updated) throw new NotFoundError('staff not found');

  return c.json(booth, 200);
});
