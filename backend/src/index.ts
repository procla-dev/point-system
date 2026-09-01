import { serve } from '@hono/node-server'
import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { db } from './db/index.js'

const app = new Hono()

app.use('*', logger())
app.use(
  '/api/*',
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  }),
)

app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.get('/api/health/db', async (c) => {
  try {
    const result = await db.execute<{ now: string }>(sql`select now()`)
    return c.json({ status: 'ok', now: result.rows[0]?.now })
  } catch (error) {
    console.error('database health check failed', error)
    return c.json({ status: 'error' }, 503)
  }
})

const port = Number(process.env.PORT ?? 8787)

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`backend listening on http://localhost:${info.port}`)
})

export default app
