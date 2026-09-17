import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { pointBalances, users } from '../db/schema.js';

export async function createUser() {
  return db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({ role: 'user' }).returning();
    if (!user) throw new Error('failed to create user');

    await tx.insert(pointBalances).values({ userId: user.id });
    return user;
  });
}

export async function setUserDisplayName(id: string, displayName: string) {
  const [user] = await db
    .update(users)
    .set({ displayName })
    .where(and(eq(users.id, id), isNull(users.displayName)))
    .returning();

  return user;
}
