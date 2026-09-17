import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { createSchemaFactory } from 'drizzle-zod';
import { booths as boothsTable } from '../db/schema.js';
import { ConflictError, ErrorResponse, NotFoundError } from '../errors.js';
import { requireRole } from '../middleware/auth.js';
import { findAllBooths, findBoothById, createBooth, updateBooth, deleteBooth } from '../services/booths.js';
import { findStaffByBoothId } from '../services/staff.js';

const { createInsertSchema, createSelectSchema } = createSchemaFactory({ zodInstance: z });

const BoothInsertRequest = createInsertSchema(boothsTable)
  .pick({ name: true, kind: true })
  .openapi({ description: 'ブースの名前を指定して作成する' });

const BoothUpdateRequest = z
  .object({ name: BoothInsertRequest.shape.name, kind: BoothInsertRequest.shape.kind })
  .openapi({ description: 'ブースの名前を指定して更新する' });

const BoothResponse = createSelectSchema(boothsTable).pick({
  id: true,
  name: true,
  kind: true,
});

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
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '管理者ではない', content: { 'application/json': { schema: ErrorResponse } } },
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
    401: { description: '未ログイン', content: { 'application/json': { schema: ErrorResponse } } },
    403: { description: '管理者ではない', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'ブースが見つからない', content: { 'application/json': { schema: ErrorResponse } } },
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
    409: { description: 'このブースに紐付いているスタッフがいる', content: { 'application/json': { schema: ErrorResponse } } },
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
  const { name, kind } = c.req.valid('json');
  const newBooth = await createBooth(name, kind);
  return c.json({ id: newBooth.id, name: newBooth.name, kind: newBooth.kind }, 201);
});

booths.openapi(updateBoothRoute, async (c) => {
  const { id } = c.req.valid('param');
  const { name, kind } = c.req.valid('json');

  const booth = await findBoothById(id);
  if (!booth) throw new NotFoundError('booth not found');

  const updatedBooth = await updateBooth(id, name, kind);
  return c.json({ id: updatedBooth.id, name: updatedBooth.name, kind: updatedBooth.kind }, 200);
});

booths.openapi(deleteBoothRoute, async (c) => {
  const { id } = c.req.valid('param');
  const booth = await findBoothById(id);
  if (!booth) throw new NotFoundError('booth not found');

  const assignedStaff = await findStaffByBoothId(id);
  if (assignedStaff) throw new ConflictError('staff is assigned to this booth');

  await deleteBooth(id);
  return c.body(null, 204);
});
