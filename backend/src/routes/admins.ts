import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { createSchemaFactory } from 'drizzle-zod';
import { loginTokens, users } from '../db/schema.js';
import { ErrorResponse, NotFoundError, UnauthorizedError } from '../errors.js';
import { requireRole } from '../middleware/auth.js';
import { createAdmin } from '../services/admins.js';
import { createLoginToken, revokeSessionsForUser } from '../services/auth.js';
import { recordOperationLog } from '../services/operation-logs.js';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { verifyIdentityCode } from '../services/identity.js';
import { getGrantPoints, updateGrantPoints } from '../services/points.js';

const { createSelectSchema } = createSchemaFactory({ zodInstance: z });

const AdminWithLoginTokenResponse = z.object({
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

export const admins = new OpenAPIHono();

admins.openapi(createAdminRoute, async (c) => {
  const admin = await createAdmin();
  const { token, expiresAt } = await createLoginToken(admin.id);
  await recordOperationLog({ actorUserId: c.get('user').id, action: 'admin.create', targetUserId: admin.id });

  return c.json({ token, expiresAt }, 201);
});

const revokeSessionsRoute = createRoute({
  method: 'post',
  path: '/revoke',
  operationId: 'revokeAdminSessions',
  tags: ['Admins'],
  summary: '識別コードでstaff/adminのセッションを強制失効する',
  middleware: [requireRole('admin')] as const,
  request: { body: { content: { 'application/json': { schema: z.object({ code: z.string().min(1) }) } } } },
  responses: {
    200: {
      description: '失効成功',
      content: { 'application/json': { schema: z.object({ revokedCount: z.number().int().nonnegative() }) } },
    },
    401: {
      description: '未ログインまたは識別コードが無効',
      content: { 'application/json': { schema: ErrorResponse } },
    },
    403: {
      description: '管理者ではない',
      content: { 'application/json': { schema: ErrorResponse } },
    },
    404: {
      description: '対象staff/adminが見つからない',
      content: { 'application/json': { schema: ErrorResponse } },
    },
  },
});

export const adminSessions = new OpenAPIHono();
adminSessions.openapi(revokeSessionsRoute, async (c) => {
  const userId = verifyIdentityCode(c.req.valid('json').code);
  if (!userId) throw new UnauthorizedError('invalid identity code');
  const target = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { role: true } });
  if (!target || (target.role !== 'staff' && target.role !== 'admin')) throw new NotFoundError('staff or admin not found');
  const revokedCount = await revokeSessionsForUser(userId);
  await recordOperationLog({ actorUserId: c.get('user').id, action: 'session.revoke', targetUserId: userId, metadata: { revokedCount } });
  return c.json({ revokedCount }, 200);
});

const PointSettingsResponse = z.object({ grantPoints: z.number().int().positive() });
const getPointSettingsRoute = createRoute({
  method: 'get',
  path: '/',
  operationId: 'getPointSettings',
  tags: ['Admins'],
  summary: '共通の付与ポイント数を取得する',
  middleware: [requireRole('admin')] as const,
  responses: {
    200: {
      description: '取得成功',
      content: { 'application/json': { schema: PointSettingsResponse } },
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
const updatePointSettingsRoute = createRoute({
  method: 'put',
  path: '/',
  operationId: 'updatePointSettings',
  tags: ['Admins'],
  summary: '共通の付与ポイント数を変更する',
  middleware: [requireRole('admin')] as const,
  request: { body: { content: { 'application/json': { schema: PointSettingsResponse } } } },
  responses: {
    200: {
      description: '更新成功',
      content: { 'application/json': { schema: PointSettingsResponse } },
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

export const adminPointSettings = new OpenAPIHono();
adminPointSettings.openapi(getPointSettingsRoute, async (c) => c.json({ grantPoints: await getGrantPoints() }, 200));
adminPointSettings.openapi(updatePointSettingsRoute, async (c) => {
  const { grantPoints } = c.req.valid('json');
  const updated = await updateGrantPoints(grantPoints);
  await recordOperationLog({ actorUserId: c.get('user').id, action: 'point-settings.update', metadata: { grantPoints } });
  return c.json({ grantPoints: updated }, 200);
});
