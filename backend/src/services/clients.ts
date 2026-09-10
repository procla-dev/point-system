import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

export async function createClient() {
  const [client] = await db.insert(users).values({ role: 'client' }).returning();
  return client!;
}

export async function findClientById(id: string) {
  return db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.role, 'client')),
  });
}

export async function setClientDisplayName(id: string, displayName: string) {
  const [client] = await db
    .update(users)
    .set({ displayName })
    .where(and(eq(users.id, id), eq(users.role, 'client')))
    .returning();

  return client;
}
