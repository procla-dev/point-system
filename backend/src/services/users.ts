import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

export async function createUser() {
  const [user] = await db.insert(users).values({ role: 'user' }).returning();
  return user!;
}

export async function findUserById(id: string) {
  return db.query.users.findFirst({ where: and(eq(users.id, id), eq(users.role, 'user')) });
}

export async function setUserDisplayName(id: string, displayName: string) {
  const [user] = await db
    .update(users)
    .set({ displayName })
    .where(and(eq(users.id, id), eq(users.role, 'user'), isNull(users.displayName)))
    .returning();

  return user;
}
