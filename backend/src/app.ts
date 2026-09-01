import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { health } from './routes/health.js'

export const OPENAPI_JSON_PATH = '/api/openapi.json'
export const SWAGGER_UI_PATH = '/api/docs'

export const app = new OpenAPIHono()

app.use('*', logger())
app.use(
  '/api/*',
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  }),
)

app.route('/api', health)

// APIドキュメントは本番では既定で公開しない。
// ENABLE_API_DOCS=true を明示した場合のみ有効になる。
export const apiDocsEnabled =
  process.env.ENABLE_API_DOCS === 'true' ||
  (process.env.NODE_ENV !== 'production' && process.env.ENABLE_API_DOCS !== 'false')

if (apiDocsEnabled) {
  app.doc(OPENAPI_JSON_PATH, {
    openapi: '3.1.0',
    info: {
      title: 'ポイントシステム API',
      version: '0.1.0',
      description: 'キャンパスフェスティバル向けポイントシステムのAPI',
    },
    servers: [{ url: '/', description: '同一オリジン' }],
    tags: [{ name: 'Health', description: '稼働確認' }],
  })

  app.get(SWAGGER_UI_PATH, swaggerUI({ url: OPENAPI_JSON_PATH }))
}

export type AppType = typeof app
