import { relations, sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

/** ユーザーの役割 */
export const userRole = pgEnum('user_role', ['client', 'staff', 'admin'])

/** ブースの種別 */
export const boothKind = pgEnum('booth_kind', [
  /** 展示ブース。スタッフ端末から固定ポイントを付与する */
  'exhibit',
  /** カジノ系ブース。クライアント自身がポイントを消費する */
  'casino',
  /** 景品交換所。スタッフ端末からポイントを消費する */
  'prize_exchange',
])

export const booths = pgTable('booths', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  kind: boothKind('kind').notNull(),
  /** 展示ブースの付与ポイント数（固定値）。展示以外は null */
  awardPoints: integer('award_points'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    role: userRole('role').notNull(),
    /** クライアントが初回ログイン時に自由入力する表示名。発行直後は null */
    displayName: text('display_name'),
    /** スタッフの担当ブース。クライアントと管理者は null */
    boothId: uuid('booth_id').references(() => booths.id, { onDelete: 'restrict' }),
    /** 管理者のログインID。クライアントとスタッフは null */
    loginId: text('login_id').unique(),
    /** 管理者のパスワードハッシュ。クライアントとスタッフは null */
    passwordHash: text('password_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('users_booth_id_idx').on(table.boothId)],
)

export const pointTransactions = pgTable(
  'point_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** ポイントが変動する対象のクライアント */
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 付与元・消費先のブース */
    boothId: uuid('booth_id').references(() => booths.id, { onDelete: 'set null' }),
    /** 操作したスタッフ。クライアント自身の操作の場合は null */
    operatorId: uuid('operator_id').references(() => users.id, { onDelete: 'set null' }),
    /** 正の値は付与、負の値は消費 */
    amount: integer('amount').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('point_transactions_user_id_idx').on(table.userId),
    index('point_transactions_booth_id_idx').on(table.boothId),
    check('point_transactions_amount_not_zero', sql`${table.amount} <> 0`),
  ],
)

export const boothsRelations = relations(booths, ({ many }) => ({
  staff: many(users),
  pointTransactions: many(pointTransactions),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  booth: one(booths, { fields: [users.boothId], references: [booths.id] }),
  /** 自身のポイント変動履歴 */
  pointTransactions: many(pointTransactions, { relationName: 'subject' }),
  /** スタッフとして操作した履歴 */
  operatedTransactions: many(pointTransactions, { relationName: 'operator' }),
}))

export const pointTransactionsRelations = relations(pointTransactions, ({ one }) => ({
  user: one(users, {
    fields: [pointTransactions.userId],
    references: [users.id],
    relationName: 'subject',
  }),
  booth: one(booths, { fields: [pointTransactions.boothId], references: [booths.id] }),
  operator: one(users, {
    fields: [pointTransactions.operatorId],
    references: [users.id],
    relationName: 'operator',
  }),
}))

export type Booth = typeof booths.$inferSelect
export type NewBooth = typeof booths.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type PointTransaction = typeof pointTransactions.$inferSelect
export type NewPointTransaction = typeof pointTransactions.$inferInsert
