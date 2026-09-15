import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

export async function createAdmin() {
  const [admin] = await db.insert(users).values({ role: 'admin' }).returning();
  return admin!;
}

export async function findAdminById(id: string) {
  return db.query.users.findFirst({ where: and(eq(users.id, id), eq(users.role, 'admin')) });
}
