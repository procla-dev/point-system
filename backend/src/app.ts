import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { health } from './routes/health.js';
import { users } from './routes/users.js';
import { sessions } from './routes/sessions.js';

const base = new OpenAPIHono().basePath('/api');

base.use('*', logger());
base.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  }),
);

base.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ status: 'error' as const, message: err.message }, err.status);
  }
  console.error(err);
  return c.json({ status: 'error' as const, message: 'internal server error' }, 500);
});

const routes = base.route('/', health).route('/users', users).route('/sessions', sessions);

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
    { name: 'Users', description: 'ユーザーアカウント' },
    { name: 'Sessions', description: 'ログインセッション' },
  ],
});

routes.get('/docs', swaggerUI({ url: '/api/openapi.json' }));

export const app = routes;
