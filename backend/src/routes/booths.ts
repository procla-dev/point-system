import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { createSchemaFactory } from 'drizzle-zod';
import { booths as boothsTable } from '../db/schema.js';
import { BadRequestError, ConflictError, ErrorResponse, NotFoundError } from '../errors.js';
import { requireRole } from '../middleware/auth.js';
import { findAllBooths, findBoothById, createBooth, updateBooth, deleteBooth } from '../services/booths.js';
import { findLikeByBoothId, likeBooth } from '../services/likes.js';
import { findStaffByBoothId } from '../services/staff.js';
import { findTeamById } from '../services/teams.js';
import { recordOperationLog } from '../services/operation-logs.js';

const { createInsertSchema, createSelectSchema } = createSchemaFactory({ zodInstance: z });

const TeamIdField = z.uuid().nullable().optional();

const BoothInsertRequest = z.object({
  name: createInsertSchema(boothsTable).shape.name,
  kind: createInsertSchema(boothsTable).shape.kind,
  teamId: TeamIdField.openapi({ description: '所属させるチームのID。展示ブースのみ指定できる。省略時はチーム無し' }),
})
  .openapi({ description: 'ブースの名前を指定して作成する' });

const BoothUpdateRequest = z
  .object({
    name: BoothInsertRequest.shape.name,
    kind: BoothInsertRequest.shape.kind,
    teamId: TeamIdField.openapi({ description: '所属させるチームのID。省略時は変更せず、nullでチームから外す' }),
  })
  .openapi({ description: 'ブースの名前を指定して更新する' });

const BoothResponse = createSelectSchema(boothsTable).pick({
  id: true,
  name: true,
  kind: true,
  teamId: true,
});

const LikeBoothResponse = z.object({ boothName: BoothResponse.shape.name });

const getBoothsRoute = createRoute({
  method: 'get',
  path: '/',
  operationId: 'getBooths',
  tags: ['Booths'],
  summary: 'ブース一覧を取得する',
  middleware: [requireRole('admin')] as const,
  responses: {
    200: { description: '取得成功', content: { 'application/json': { schema: z.array(BoothResponse) } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '管理者ではない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const getBoothByIdRoute = createRoute({
  method: 'get',
  path: '/{id}',
  operationId: 'getBoothById',
  tags: ['Booths'],
  summary: 'IDを指定してブースを取得する',
  middleware: [requireRole('admin')] as const,
  request: {
    params: z.object({ id: z.uuid() }),
  },
  responses: {
    200: { description: '取得成功', content: { 'application/json': { schema: BoothResponse } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '管理者ではない', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'ブースが見つからない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const createBoothRoute = createRoute({
  method: 'post',
  path: '/',
  operationId: 'createBooth',
  tags: ['Booths'],
  summary: 'ブースを作成する',
  middleware: [requireRole('admin')] as const,
  request: { body: { content: { 'application/json': { schema: BoothInsertRequest } } } },
  responses: {
    201: { description: '作成成功', content: { 'application/json': { schema: BoothResponse } } },
    400: { description: '展示ブース以外にチームを指定した', content: { 'application/json': { schema: ErrorResponse } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '管理者ではない', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'チームが見つからない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const updateBoothRoute = createRoute({
  method: 'put',
  path: '/{id}',
  operationId: 'updateBooth',
  tags: ['Booths'],
  summary: 'ブースの名前を更新する',
  middleware: [requireRole('admin')] as const,
  request: {
    params: z.object({ id: z.uuid() }),
    body: { content: { 'application/json': { schema: BoothUpdateRequest } } },
  },
  responses: {
    200: { description: '更新成功', content: { 'application/json': { schema: BoothResponse } } },
    400: { description: 'チームが付いたまま展示ブース以外にしようとした', content: { 'application/json': { schema: ErrorResponse } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '管理者ではない', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'ブースまたはチームが見つからない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const deleteBoothRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  operationId: 'deleteBooth',
  tags: ['Booths'],
  summary: 'ブースを削除する',
  middleware: [requireRole('admin')] as const,
  request: {
    params: z.object({ id: z.uuid() }),
  },
  responses: {
    204: { description: '削除成功' },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '管理者ではない', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'ブースが見つからない', content: { 'application/json': { schema: ErrorResponse } } },
    409: { description: 'このブースに紐付いているスタッフまたはいいねがある', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const likeBoothRoute = createRoute({
  method: 'post',
  path: '/{id}/likes',
  operationId: 'likeBooth',
  tags: ['Booths'],
  summary: 'ブースにいいねする',
  description: 'ブースに置かれたQRコードから読み取ったIDでいいねする。1人1ブースにつき1回まで',
  middleware: [requireRole('user')] as const,
  request: {
    params: z.object({ id: z.uuid() }),
  },
  responses: {
    201: { description: 'いいね成功', content: { 'application/json': { schema: LikeBoothResponse } } },
    400: { description: '展示ブースではない', content: { 'application/json': { schema: ErrorResponse } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '来場者ではない', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'ブースが見つからない', content: { 'application/json': { schema: ErrorResponse } } },
    409: { description: 'すでにいいね済み', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

export const booths = new OpenAPIHono();

booths.openapi(getBoothsRoute, async (c) => {
  const allBooths = await findAllBooths();
  return c.json(allBooths, 200);
});

booths.openapi(getBoothByIdRoute, async (c) => {
  const { id } = c.req.valid('param');
  const booth = await findBoothById(id);
  if (!booth) throw new NotFoundError('booth not found');

  return c.json(booth, 200);
});

booths.openapi(createBoothRoute, async (c) => {
  const { name, kind, teamId = null } = c.req.valid('json');

  if (teamId) {
    if (kind !== 'exhibitor') throw new BadRequestError('only exhibitor booths can belong to a team');
    const team = await findTeamById(teamId);
    if (!team) throw new NotFoundError('team not found');
  }

  const newBooth = await createBooth(name, kind, teamId);
  return c.json({ id: newBooth.id, name: newBooth.name, kind: newBooth.kind, teamId: newBooth.teamId }, 201);
});

booths.openapi(updateBoothRoute, async (c) => {
  const { id } = c.req.valid('param');
  const { name, kind, teamId } = c.req.valid('json');

  const booth = await findBoothById(id);
  if (!booth) throw new NotFoundError('booth not found');

  const nextTeamId = teamId === undefined ? booth.teamId : teamId; // 省略時は今のチームのまま
  if (nextTeamId) {
    if (kind !== 'exhibitor') throw new BadRequestError('only exhibitor booths can belong to a team');
    const team = await findTeamById(nextTeamId);
    if (!team) throw new NotFoundError('team not found');
  }

  const updatedBooth = await updateBooth(id, name, kind, nextTeamId);
  return c.json(
    { id: updatedBooth.id, name: updatedBooth.name, kind: updatedBooth.kind, teamId: updatedBooth.teamId },
    200,
  );
});

booths.openapi(likeBoothRoute, async (c) => {
  const { id } = c.req.valid('param');
  const user = c.get('user');

  const booth = await findBoothById(id);
  if (!booth) throw new NotFoundError('booth not found');
  if (booth.kind !== 'exhibitor') throw new BadRequestError('this booth cannot be liked');

  const like = await likeBooth(user.id, booth.id);
  if (!like) throw new ConflictError('already liked this booth');

  await recordOperationLog({
    actorUserId: user.id,
    action: 'booth.like',
    metadata: { boothId: booth.id, boothName: booth.name },
  });

  return c.json({ boothName: booth.name }, 201);
});

booths.openapi(deleteBoothRoute, async (c) => {
  const { id } = c.req.valid('param');
  const booth = await findBoothById(id);
  if (!booth) throw new NotFoundError('booth not found');

  const assignedStaff = await findStaffByBoothId(id);
  if (assignedStaff) throw new ConflictError('staff is assigned to this booth');

  const like = await findLikeByBoothId(id);
  if (like) throw new ConflictError('this booth has likes');

  await deleteBooth(id);
  return c.body(null, 204);
});
