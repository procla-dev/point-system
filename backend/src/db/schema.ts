import { relations } from 'drizzle-orm';
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** ユーザーの役割 */
export const userRole = pgEnum('user_role', ['user', 'staff', 'admin']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: userRole('role').notNull(),
  /** ユーザーが初回ログイン時に自由入力する表示名。発行直後は null */
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

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

export const booths = pgTable('booths', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const staff = pgTable('staff', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  boothId: uuid('booth_id').references(() => booths.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  loginTokens: many(loginTokens),
  sessions: many(sessions),
}));

export const loginTokensRelations = relations(loginTokens, ({ one }) => ({
  user: one(users, { fields: [loginTokens.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const boothsRelations = relations(booths, ({ many }) => ({
  staff: many(staff),
}));

export const staffRelations = relations(staff, ({ one }) => ({
  user: one(users, { fields: [staff.userId], references: [users.id] }),
  booth: one(booths, { fields: [staff.boothId], references: [booths.id] }),
}));
