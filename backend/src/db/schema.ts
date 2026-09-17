import { relations, sql } from 'drizzle-orm';
import { check, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** ユーザーの役割 */
export const userRole = pgEnum('user_role', ['user', 'staff', 'admin']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: userRole('role').notNull(),
  /** ユーザーが初回ログイン時に自由入力する表示名。発行直後は null */
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AuthUser = typeof users.$inferSelect;

export const loginTokens = pgTable('login_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** ユーザーの現在のポイント残高 */
export const pointBalances = pgTable(
  'point_balances',
  {
    userId: uuid('user_id').primaryKey().references(() => users.id),
    balance: integer('balance').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('point_balances_balance_non_negative', sql`${table.balance} >= 0`)],
);

/** ポイントの付与・消費履歴 */
export const pointTransactionType = pgEnum('point_transaction_type', ['grant', 'spend']);

export const pointTransactions = pgTable(
  'point_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    amount: integer('amount').notNull(),
    type: pointTransactionType('type').notNull(),
    operatorUserId: uuid('operator_user_id').notNull().references(() => users.id),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('point_transactions_amount_positive', sql`${table.amount} > 0`)],
);

export const boothKind = pgEnum('booth_kind', ['entrance', 'exhibitor', 'exchanger']);

export const booths = pgTable('booths', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  kind: boothKind('kind').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Booth = typeof booths.$inferSelect;

export const staff = pgTable('staff', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  boothId: uuid('booth_id').references(() => booths.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  loginTokens: many(loginTokens),
  sessions: many(sessions),
  pointBalance: one(pointBalances, { fields: [users.id], references: [pointBalances.userId] }),
  pointTransactions: many(pointTransactions, { relationName: 'pointTransactionsUser' }),
  operatedPointTransactions: many(pointTransactions, { relationName: 'pointTransactionsOperator' }),
}));

export const loginTokensRelations = relations(loginTokens, ({ one }) => ({
  user: one(users, { fields: [loginTokens.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const pointBalancesRelations = relations(pointBalances, ({ one }) => ({
  user: one(users, { fields: [pointBalances.userId], references: [users.id] }),
}));

export const pointTransactionsRelations = relations(pointTransactions, ({ one }) => ({
  user: one(users, {
    fields: [pointTransactions.userId],
    references: [users.id],
    relationName: 'pointTransactionsUser',
  }),
  operator: one(users, {
    fields: [pointTransactions.operatorUserId],
    references: [users.id],
    relationName: 'pointTransactionsOperator',
  }),
}));

export const boothsRelations = relations(booths, ({ many }) => ({
  staff: many(staff),
}));

export const staffRelations = relations(staff, ({ one }) => ({
  user: one(users, { fields: [staff.userId], references: [users.id] }),
  booth: one(booths, { fields: [staff.boothId], references: [booths.id] }),
}));
