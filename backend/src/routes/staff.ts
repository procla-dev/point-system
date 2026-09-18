import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { createSchemaFactory } from 'drizzle-zod';
import { loginTokens, booths as boothsTable } from '../db/schema.js';
import { ErrorResponse, NotFoundError } from '../errors.js';
import { requireRole } from '../middleware/auth.js';
import { createLoginToken } from '../services/auth.js';
import { findBoothsByIds } from '../services/booths.js';
import {
  createStaff,
  findAllStaffAssignments,
  findStaffAssignmentByUserId,
  findStaffBoothsByUserId,
  setStaffAssignment,
} from '../services/staff.js';
import { findTeamById } from '../services/teams.js';
import { recordOperationLog } from '../services/operation-logs.js';

const { createSelectSchema } = createSchemaFactory({ zodInstance: z });

const LoginTokenResponse = createSelectSchema(loginTokens)
  .pick({ expiresAt: true })
  .extend({ token: z.string().openapi({ description: 'ログイン用QRコードに埋め込むワンタイムトークン' }) });

const StaffWithLoginTokenResponse = z.object({
  token: LoginTokenResponse.shape.token,
  expiresAt: LoginTokenResponse.shape.expiresAt,
});

const UpdateStaffAssignmentRequest = z.object({
  teamId: z.uuid().nullable().openapi({ description: '所属させるチームのID。nullの場合はチームから外す' }),
  boothIds: z.array(z.uuid()).openapi({ description: '担当させるブースのID。今の担当ブースはすべてこの内容で置き換える' }),
});

const StaffAssignmentResponse = z.object({
  userId: z.uuid().openapi({ description: 'スタッフのユーザーID' }),
  displayName: z.string().nullable().openapi({ description: 'スタッフの表示名。未設定なら null' }),
  teamId: z.uuid().nullable().openapi({ description: '所属チームのID。未所属なら null' }),
  boothIds: z.array(z.uuid()).openapi({ description: '担当ブースのID' }),
});

const MyStaffBoothsResponse = z.array(createSelectSchema(boothsTable).pick({ name: true }));

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

const getMyStaffBoothsRoute = createRoute({
  method: 'get',
  path: '/me/booths',
  operationId: 'getMyStaffBooths',
  tags: ['Staff'],
  summary: '自分の担当ブースを取得する',
  middleware: [requireRole('staff')] as const,
  responses: {
    200: { description: '取得成功', content: { 'application/json': { schema: MyStaffBoothsResponse } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: 'スタッフではない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const getStaffListRoute = createRoute({
  method: 'get',
  path: '/',
  operationId: 'getStaffList',
  tags: ['Staff'],
  summary: 'スタッフ一覧を所属チーム・担当ブース付きで取得する',
  middleware: [requireRole('admin')] as const,
  responses: {
    200: { description: '取得成功', content: { 'application/json': { schema: z.array(StaffAssignmentResponse) } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '管理者ではない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const updateStaffAssignmentRoute = createRoute({
  method: 'put',
  path: '/{userId}/assignment',
  operationId: 'updateStaffAssignment',
  tags: ['Staff'],
  summary: 'スタッフの所属チームと担当ブースを更新する',
  middleware: [requireRole('admin')] as const,
  request: {
    params: z.object({ userId: z.uuid() }),
    body: { content: { 'application/json': { schema: UpdateStaffAssignmentRequest } } },
  },
  responses: {
    200: { description: '更新成功', content: { 'application/json': { schema: StaffAssignmentResponse } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '管理者ではない', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'スタッフ・チーム・ブースのいずれかが見つからない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

export const staff = new OpenAPIHono();

staff.openapi(createStaffRoute, async (c) => {
  const newStaff = await createStaff();
  const { token, expiresAt } = await createLoginToken(newStaff.id);
  await recordOperationLog({ actorUserId: c.get('user').id, action: 'staff.create', targetUserId: newStaff.id });

  return c.json({ token, expiresAt }, 201);
});

staff.openapi(getMyStaffBoothsRoute, async (c) => {
  const assignedBooths = await findStaffBoothsByUserId(c.get('user').id);
  return c.json(assignedBooths.map((booth) => ({ name: booth.name })), 200);
});

staff.openapi(getStaffListRoute, async (c) => {
  const allStaff = await findAllStaffAssignments();
  return c.json(allStaff, 200);
});

staff.openapi(updateStaffAssignmentRoute, async (c) => {
  const { userId } = c.req.valid('param');
  const { teamId } = c.req.valid('json');
  const boothIds = [...new Set(c.req.valid('json').boothIds)];

  if (teamId) {
    const team = await findTeamById(teamId);
    if (!team) throw new NotFoundError('team not found');
  }

  const foundBooths = await findBoothsByIds(boothIds);
  if (foundBooths.length !== boothIds.length) throw new NotFoundError('booth not found');

  const updated = await setStaffAssignment(userId, teamId, boothIds);
  if (!updated) throw new NotFoundError('staff not found');

  const assignment = await findStaffAssignmentByUserId(userId);
  return c.json(assignment!, 200);
});
