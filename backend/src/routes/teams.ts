import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { createSchemaFactory } from 'drizzle-zod';
import { teams as teamsTable } from '../db/schema.js';
import { ConflictError, ErrorResponse, NotFoundError } from '../errors.js';
import { requireRole } from '../middleware/auth.js';
import { findBoothByTeamId } from '../services/booths.js';
import {
  createTeam,
  deleteTeam,
  findAllTeamsWithLikeCount,
  findTeamById,
  findTeamByName,
  updateTeam,
} from '../services/teams.js';

const { createInsertSchema, createSelectSchema } = createSchemaFactory({ zodInstance: z });

const TeamRequest = z
  .object({ name: createInsertSchema(teamsTable).shape.name })
  .openapi({ description: 'チームの名前を指定する' });

const TeamResponse = createSelectSchema(teamsTable).pick({ id: true, name: true });

const TeamWithLikeCountResponse = TeamResponse.extend({
  likeCount: z.number().int().nonnegative().openapi({ description: '所属ブースに付いたいいねの合計' }),
});

const getTeamsRoute = createRoute({
  method: 'get',
  path: '/',
  operationId: 'getTeams',
  tags: ['Teams'],
  summary: 'チーム一覧をいいねの多い順に取得する',
  middleware: [requireRole('admin')] as const,
  responses: {
    200: { description: '取得成功', content: { 'application/json': { schema: z.array(TeamWithLikeCountResponse) } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '管理者ではない', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const createTeamRoute = createRoute({
  method: 'post',
  path: '/',
  operationId: 'createTeam',
  tags: ['Teams'],
  summary: 'チームを作成する',
  middleware: [requireRole('admin')] as const,
  request: { body: { content: { 'application/json': { schema: TeamRequest } } } },
  responses: {
    201: { description: '作成成功', content: { 'application/json': { schema: TeamResponse } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '管理者ではない', content: { 'application/json': { schema: ErrorResponse } } },
    409: { description: '同じ名前のチームがある', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const updateTeamRoute = createRoute({
  method: 'put',
  path: '/{id}',
  operationId: 'updateTeam',
  tags: ['Teams'],
  summary: 'チームの名前を更新する',
  middleware: [requireRole('admin')] as const,
  request: {
    params: z.object({ id: z.uuid() }),
    body: { content: { 'application/json': { schema: TeamRequest } } },
  },
  responses: {
    200: { description: '更新成功', content: { 'application/json': { schema: TeamResponse } } },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '管理者ではない', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'チームが見つからない', content: { 'application/json': { schema: ErrorResponse } } },
    409: { description: '同じ名前のチームがある', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

const deleteTeamRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  operationId: 'deleteTeam',
  tags: ['Teams'],
  summary: 'チームを削除する',
  middleware: [requireRole('admin')] as const,
  request: {
    params: z.object({ id: z.uuid() }),
  },
  responses: {
    204: { description: '削除成功' },
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '管理者ではない', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'チームが見つからない', content: { 'application/json': { schema: ErrorResponse } } },
    409: { description: 'このチームに所属しているブースがある', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

export const teams = new OpenAPIHono();

teams.openapi(getTeamsRoute, async (c) => {
  const allTeams = await findAllTeamsWithLikeCount();
  return c.json(allTeams, 200);
});

teams.openapi(createTeamRoute, async (c) => {
  const { name } = c.req.valid('json');

  const sameName = await findTeamByName(name);
  if (sameName) throw new ConflictError('team name already exists');

  const newTeam = await createTeam(name);
  return c.json({ id: newTeam.id, name: newTeam.name }, 201);
});

teams.openapi(updateTeamRoute, async (c) => {
  const { id } = c.req.valid('param');
  const { name } = c.req.valid('json');

  const team = await findTeamById(id);
  if (!team) throw new NotFoundError('team not found');

  const sameName = await findTeamByName(name);
  if (sameName && sameName.id !== id) throw new ConflictError('team name already exists');

  const updatedTeam = await updateTeam(id, name);
  return c.json({ id: updatedTeam.id, name: updatedTeam.name }, 200);
});

teams.openapi(deleteTeamRoute, async (c) => {
  const { id } = c.req.valid('param');

  const team = await findTeamById(id);
  if (!team) throw new NotFoundError('team not found');

  const booth = await findBoothByTeamId(id);
  if (booth) throw new ConflictError('booths belong to this team');

  await deleteTeam(id);
  return c.body(null, 204);
});
