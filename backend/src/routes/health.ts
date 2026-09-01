import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { sql } from 'drizzle-orm'
import { db } from '../db/index.js'

const HealthResponse = z
  .object({
    status: z.literal('ok'),
  })
  .openapi('HealthResponse')

const DatabaseHealthResponse = z
  .object({
    status: z.literal('ok'),
    now: z.string().openapi({
      description: 'データベースサーバーの現在時刻',
      example: '2026-09-01 07:53:54.139936+00',
    }),
  })
  .openapi('DatabaseHealthResponse')

const ErrorResponse = z
  .object({
    status: z.literal('error'),
  })
  .openapi('ErrorResponse')

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  operationId: 'getHealth',
  tags: ['Health'],
  summary: 'サーバーの稼働確認',
  responses: {
    200: {
      description: 'サーバーは稼働している',
      content: { 'application/json': { schema: HealthResponse } },
    },
  },
})

const databaseHealthRoute = createRoute({
  method: 'get',
  path: '/health/db',
  operationId: 'getDatabaseHealth',
  tags: ['Health'],
  summary: 'データベース接続の確認',
  responses: {
    200: {
      description: 'データベースに接続できる',
      content: { 'application/json': { schema: DatabaseHealthResponse } },
    },
    503: {
      description: 'データベースに接続できない',
      content: { 'application/json': { schema: ErrorResponse } },
    },
  },
})

export const health = new OpenAPIHono()
  .openapi(healthRoute, (c) => c.json({ status: 'ok' } as const, 200))
  .openapi(databaseHealthRoute, async (c) => {
    try {
      const result = await db.execute<{ now: string }>(sql`select now()`)
      const now = result.rows[0]?.now
      if (!now) {
        throw new Error('unexpected empty result')
      }
      return c.json({ status: 'ok', now } as const, 200)
    } catch (error) {
      console.error('database health check failed', error)
      return c.json({ status: 'error' } as const, 503)
    }
  })
