import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { createSchemaFactory } from 'drizzle-zod';
import { loginTokens, users as usersTable } from '../db/schema.js';
import { ErrorResponse, ConflictError, NotFoundError, UnauthorizedError } from '../errors.js';
import { requireBoothKind } from '../middleware/booth.js';
import { requireRole } from '../middleware/auth.js';
import { createLoginToken, reissueLoginToken } from '../services/auth.js';
import { getUserBalance, grantUserPoints } from '../services/points.js';
import { createIdentityCode, verifyIdentityCode } from '../services/identity.js';
import { createUser, setUserDisplayName } from '../services/users.js';

const { createSelectSchema } = createSchemaFactory({ zodInstance: z });

const UserResponse = createSelectSchema(usersTable).pick({
  displayName: true,
});
const MeResponse = UserResponse.extend({ role: z.enum(['user', 'staff', 'admin']) });

const LoginTokenResponse = createSelectSchema(loginTokens)
  .pick({ expiresAt: true })
  .extend({ token: z.string().openapi({ description: 'ログイン用QRコードに埋め込むワンタイムトークン' }) });

const PointGrantResponse = z.object({
  grantedPoints: z.number().int().positive(),
  balance: z.number().int().nonnegative(),
  transactionId: z.uuid(),
});

const UserWithLoginTokenResponse = UserResponse.extend({
  token: LoginTokenResponse.shape.token,
  expiresAt: LoginTokenResponse.shape.expiresAt,
});
const IdentityCodeResponse = z.object({
  code: z.string().openapi({ description: '識別用の動的QRコードに埋め込むコード' }),
  expiresAt: z.date().openapi({ description: 'このコードが失効する時刻' }),
});

const createUserRoute = createRoute({
  method: 'post',
  path: '/',
  operationId: 'createUser',
  tags: ['Users'],
  summary: 'ユーザーアカウントとログイントークンを発行する',
  middleware: [requireRole('staff', 'admin'), requireBoothKind('entrance')] as const,
  responses: {
    201: { description: '作成成功', content: { 'application/json': { schema: UserWithLoginTokenResponse } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: 'スタッフではない、またはentranceブース担当ではない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const reissueUserLoginTokenRoute = createRoute({
  method: 'post',
  path: '/login-tokens/reissue',
  operationId: 'reissueUserLoginToken',
  tags: ['Users'],
  summary: '未使用トークンからユーザーのトークンを再発行する',
  middleware: [requireRole('staff', 'admin')] as const,
  request: { body: { content: { 'application/json': { schema: z.object({ token: z.string().min(1) }) } } } },
  responses: {
    201: { description: '再発行成功', content: { 'application/json': { schema: LoginTokenResponse } } },
    401: { description: 'トークンが無効または使用済み', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: 'スタッフではない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const updateMeRoute = createRoute({
  method: 'patch',
  path: '/me',
  operationId: 'updateMe',
  tags: ['Users'],
  summary: '初回ログイン時に自分の表示名を設定する',
  middleware: [requireRole('user', 'staff', 'admin')] as const,
  request: {
    body: { content: { 'application/json': { schema: z.object({ displayName: z.string().min(1).max(50) }) } } },
  },
  responses: {
    200: { description: '更新成功', content: { 'application/json': { schema: UserResponse } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '表示名を設定できないロール', content: { 'application/json': { schema: ErrorResponse } } },
    409: { description: '表示名は設定済み', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const getMeRoute = createRoute({
  method: 'get',
  path: '/me',
  operationId: 'getMe',
  tags: ['Users'],
  summary: 'ログイン中のユーザー情報を取得する',
  middleware: [requireRole('user', 'staff', 'admin')] as const,
  responses: {
    200: { description: '取得成功', content: { 'application/json': { schema: MeResponse } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const getMyIdentityCodeRoute = createRoute({
  method: 'get',
  path: '/me/identity-code',
  operationId: 'getMyIdentityCode',
  tags: ['Users'],
  summary: '自分の識別用動的QRコードを取得する',
  middleware: [requireRole('user', 'staff', 'admin')] as const,
  responses: {
    200: { description: '取得成功', content: { 'application/json': { schema: IdentityCodeResponse } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: 'ログイン権限がない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const getMyPointsRoute = createRoute({
  method: 'get', path: '/me/points', operationId: 'getMyPoints', tags: ['Users'], summary: '自分のポイント残高を取得する',
  middleware: [requireRole('user', 'staff', 'admin')] as const,
  responses: { 200: { description: '取得成功', content: { 'application/json': { schema: z.object({ balance: z.number().int().nonnegative() }) } } }, 401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } } },
});

const grantUserPointsRoute = createRoute({
  method: 'post',
  path: '/points',
  operationId: 'grantUserPoints',
  tags: ['Users'],
  summary: 'ユーザーにポイントを付与する',
  middleware: [requireRole('staff', 'admin'), requireBoothKind('exhibitor')] as const,
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({ code: z.string().min(1), points: z.number().int().positive() }),
        },
      },
    },
  },
  responses: {
    201: { description: '付与成功', content: { 'application/json': { schema: PointGrantResponse } } },
    400: { description: 'ポイント数が正の整数ではない', content: { 'application/json': { schema: ErrorResponse } } },
    401: { description: '未ログインまたは識別コードが無効', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: 'スタッフではない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

export const users = new OpenAPIHono();

users.openapi(getMeRoute, async (c) => {
  const user = c.get('user');
  return c.json({ role: user.role, displayName: user.displayName }, 200);
});

users.openapi(updateMeRoute, async (c) => {
  const authUser = c.get('user');
  const { displayName } = c.req.valid('json');

  const user = await setUserDisplayName(authUser.id, displayName);
  if (!user) throw new ConflictError('display name is already set');

  return c.json({ id: user.id, displayName: user.displayName }, 200);
});

users.openapi(createUserRoute, async (c) => {
  const { id, displayName } = await createUser();
  const { token, expiresAt } = await createLoginToken(id);

  return c.json({ displayName, token, expiresAt }, 201);
});

users.openapi(reissueUserLoginTokenRoute, async (c) => {
  const { token } = c.req.valid('json');
  const issued = await reissueLoginToken(token, 'user');
  if (!issued) throw new UnauthorizedError('invalid or already used token');
  return c.json(issued, 201);
});


users.openapi(grantUserPointsRoute, async (c) => {
  const { code, points } = c.req.valid('json');
  const operator = c.get('user');
  const userId = verifyIdentityCode(code);
  if (!userId) throw new UnauthorizedError('invalid identity code');

  const result = await grantUserPoints({
    userId,
    operatorUserId: operator.id,
    points,
  });

  if (!result) throw new NotFoundError('user not found');

  return c.json(
    {
      grantedPoints: points,
      balance: result.balance,
      transactionId: result.transactionId,
    },
    201,
  );
});

users.openapi(getMyIdentityCodeRoute, async (c) => {
  const authUser = c.get('user');

  const { code, expiresAt } = createIdentityCode(authUser.id);
  return c.json({ code, expiresAt }, 200);
});

users.openapi(getMyPointsRoute, async (c) => c.json({ balance: await getUserBalance(c.get('user').id) }, 200));
