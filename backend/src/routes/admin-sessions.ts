import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema.js';
import { db } from '../db/index.js';
import { ErrorResponse, NotFoundError, UnauthorizedError } from '../errors.js';
import { requireRole } from '../middleware/auth.js';
import { verifyIdentityCode } from '../services/identity.js';
import { revokeSessionsForUser } from '../services/auth.js';

const revokeSessionsRoute = createRoute({
  method: 'post',
  path: '/revoke',
  operationId: 'revokeAdminSessions',
  tags: ['Admins'],
  summary: '識別コードでstaff/adminのセッションを強制失効する',
  middleware: [requireRole('admin')] as const,
  request: { body: { content: { 'application/json': { schema: z.object({ code: z.string().min(1) }) } } } },
  responses: {
    200: { description: '失効成功', content: { 'application/json': { schema: z.object({ revokedCount: z.number().int().nonnegative() }) } } },
    401: { description: '未ログインまたは識別コードが無効', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '管理者ではない', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: '対象staff/adminが見つからない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

export const adminSessions = new OpenAPIHono();

adminSessions.openapi(revokeSessionsRoute, async (c) => {
  const { code } = c.req.valid('json');
  const userId = verifyIdentityCode(code);
  if (!userId) throw new UnauthorizedError('invalid identity code');

  const target = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { role: true } });
  if (!target || (target.role !== 'staff' && target.role !== 'admin')) throw new NotFoundError('staff or admin not found');

  return c.json({ revokedCount: await revokeSessionsForUser(userId) }, 200);
});
