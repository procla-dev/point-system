import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db, pool } from './db/index.js'

await migrate(db, { migrationsFolder: './drizzle' })
console.log('migration completed')
await pool.end()
