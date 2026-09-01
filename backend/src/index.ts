import { serve } from '@hono/node-server'
import { apiDocsEnabled, app, SWAGGER_UI_PATH } from './app.js'

const port = Number(process.env.PORT ?? 8787)

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`backend listening on http://localhost:${info.port}`)
  if (apiDocsEnabled) {
    console.log(`api docs on http://localhost:${info.port}${SWAGGER_UI_PATH}`)
  }
})
