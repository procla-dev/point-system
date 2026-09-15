import { serve } from '@hono/node-server'
import { app } from './app.js'

const port = Number(process.env.PORT ?? 8787)

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`backend listening on http://localhost:${info.port}`)
  console.log(`api docs on http://localhost:${info.port}/api/docs`)
})
