import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { createSchemaFactory } from 'drizzle-zod';
import { loginTokens, users as usersTable } from '../db/schema.js';
import { ErrorResponse, ConflictError, NotFoundError } from '../errors.js';
import { requireRole } from '../middleware/auth.js';
import { createLoginToken } from '../services/auth.js';
import { grantUserPoints } from '../services/points.js';
import { createUser, findUserById, setUserDisplayName } from '../services/users.js';

const { createSelectSchema } = createSchemaFactory({ zodInstance: z });

const UserResponse = createSelectSchema(usersTable).pick({
  id: true,
  displayName: true,
});

const LoginTokenResponse = createSelectSchema(loginTokens)
  .pick({ expiresAt: true })
  .extend({ token: z.string().openapi({ description: 'ログイン用QRコードに埋め込むワンタイムトークン' }) });

const PointGrantResponse = z.object({
  userId: z.uuid(),
  grantedPoints: z.number().int().positive(),
  balance: z.number().int().nonnegative(),
  transactionId: z.uuid(),
});

const updateMeRoute = createRoute({
  method: 'patch',
  path: '/me',
  operationId: 'updateMe',
  tags: ['Users'],
  summary: '初回ログイン時に自分の表示名を設定する',
  middleware: [requireRole('user')] as const,
  request: {
    body: { content: { 'application/json': { schema: z.object({ displayName: z.string().min(1).max(50) }) } } },
  },
  responses: {
    200: { description: '更新成功', content: { 'application/json': { schema: UserResponse } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: 'ユーザーではない', content: { 'application/json': { schema: ErrorResponse } } },
    409: { description: '表示名は設定済み', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const createUserRoute = createRoute({
  method: 'post',
  path: '/',
  operationId: 'createUser',
  tags: ['Users'],
  summary: 'ユーザーアカウントを発行する',
  middleware: [requireRole('staff')] as const,
  responses: {
    201: { description: '作成成功', content: { 'application/json': { schema: UserResponse } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: 'スタッフではない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const issueLoginTokenRoute = createRoute({
  method: 'post',
  path: '/{id}/login-tokens',
  operationId: 'issueUserLoginToken',
  tags: ['Users'],
  summary: 'ユーザーのログイン用トークンを発行する',
  middleware: [requireRole('staff')] as const,
  request: { params: z.object({ id: z.uuid() }) },
  responses: {
    201: { description: '発行成功', content: { 'application/json': { schema: LoginTokenResponse } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: 'スタッフではない', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'ユーザーが見つからない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const grantUserPointsRoute = createRoute({
  method: 'post',
  path: '/{id}/points',
  operationId: 'grantUserPoints',
  tags: ['Users'],
  summary: 'ユーザーにポイントを付与する',
  middleware: [requireRole('staff')] as const,
  request: {
    params: z.object({ id: z.uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({ points: z.number().int().positive() }),
        },
      },
    },
  },
  responses: {
    201: { description: '付与成功', content: { 'application/json': { schema: PointGrantResponse } } },
    400: { description: 'ポイント数が正の整数ではない', content: { 'application/json': { schema: ErrorResponse } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: 'スタッフではない', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'ユーザーが見つからない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

export const users = new OpenAPIHono();

users.openapi(updateMeRoute, async (c) => {
  const authUser = c.get('user');
  const { displayName } = c.req.valid('json');

  const user = await setUserDisplayName(authUser.id, displayName);
  if (!user) throw new ConflictError('display name is already set');

  return c.json({ id: user.id, displayName: user.displayName }, 200);
});

users.openapi(createUserRoute, async (c) => {
  const { id, displayName } = await createUser();
  return c.json({ id, displayName }, 201);
});

users.openapi(issueLoginTokenRoute, async (c) => {
  const { id } = c.req.valid('param');

  const user = await findUserById(id);
  if (!user) throw new NotFoundError('user not found');

  const { token, expiresAt } = await createLoginToken(user.id);
  return c.json({ token, expiresAt }, 201);
});

users.openapi(grantUserPointsRoute, async (c) => {
  const { id } = c.req.valid('param');
  const { points } = c.req.valid('json');
  const operator = c.get('user');

  const result = await grantUserPoints({
    userId: id,
    operatorUserId: operator.id,
    points,
  });

  if (!result) throw new NotFoundError('user not found');

  return c.json(
    {
      userId: id,
      grantedPoints: points,
      balance: result.balance,
      transactionId: result.transactionId,
    },
    201,
  );
});
