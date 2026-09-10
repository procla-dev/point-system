import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { clients } from './routes/clients.js'
import { health } from './routes/health.js'

const base = new OpenAPIHono().basePath('/api')

base.use('*', logger())
base.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  }),
)

const routes = base.route('/', health).route('/clients', clients)

routes.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'ポイントシステム API',
    version: '0.1.0',
    description: 'キャンパスフェスティバル向けポイントシステムのAPI',
  },
  servers: [{ url: '/', description: '同一オリジン' }],
  tags: [
    { name: 'Health', description: '稼働確認' },
    { name: 'Clients', description: 'クライアントアカウント' },
  ],
})

routes.get('/docs', swaggerUI({ url: '/api/openapi.json' }))

export const app = routes
