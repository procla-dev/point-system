import { relations, sql } from 'drizzle-orm';
import { check, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

export const operationLogs = pgTable('operation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  targetUserId: uuid('target_user_id').references(() => users.id),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
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

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Team = typeof teams.$inferSelect;

export const boothKind = pgEnum('booth_kind', ['entrance', 'exhibitor', 'exchanger']);

export const booths = pgTable('booths', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  kind: boothKind('kind').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pointSettings = pgTable('point_settings', {
  id: integer('id').primaryKey().default(1),
  grantPoints: integer('grant_points').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [check('point_settings_grant_points_positive', sql`${table.grantPoints} > 0`)]);

export type Booth = typeof booths.$inferSelect;

export const staff = pgTable('staff', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  /** スタッフは常に1つのチームにだけ所属する。未所属は null */
  teamId: uuid('team_id').references(() => teams.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** スタッフの担当ブース。1人が複数ブースを担当でき、1つのブースを複数人で担当することもある */
export const staffBooths = pgTable(
  'staff_booths',
  {
    userId: uuid('user_id').notNull().references(() => staff.userId),
    boothId: uuid('booth_id').notNull().references(() => booths.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.boothId] })],
);

export const boothLikes = pgTable(
  'booth_likes',
  {
    userId: uuid('user_id').notNull().references(() => users.id),
    boothId: uuid('booth_id').notNull().references(() => booths.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.boothId] })],
);

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

export const teamsRelations = relations(teams, ({ many }) => ({
  staff: many(staff),
}));

export const boothsRelations = relations(booths, ({ many }) => ({
  staffBooths: many(staffBooths),
  likes: many(boothLikes),
}));

export const boothLikesRelations = relations(boothLikes, ({ one }) => ({
  user: one(users, { fields: [boothLikes.userId], references: [users.id] }),
  booth: one(booths, { fields: [boothLikes.boothId], references: [booths.id] }),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  user: one(users, { fields: [staff.userId], references: [users.id] }),
  team: one(teams, { fields: [staff.teamId], references: [teams.id] }),
  staffBooths: many(staffBooths),
}));

export const staffBoothsRelations = relations(staffBooths, ({ one }) => ({
  staff: one(staff, { fields: [staffBooths.userId], references: [staff.userId] }),
  booth: one(booths, { fields: [staffBooths.boothId], references: [booths.id] }),
}));
