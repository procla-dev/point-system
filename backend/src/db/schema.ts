import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/** ユーザーの役割 */
export const userRole = pgEnum('user_role', ['client', 'staff', 'admin'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: userRole('role').notNull(),
  /** クライアントが初回ログイン時に自由入力する表示名。発行直後は null */
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
