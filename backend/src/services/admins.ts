import { db } from '../db/index.js';
import { users } from '../db/schema.js';

export async function createAdmin() {
  const [admin] = await db.insert(users).values({ role: 'admin' }).returning();
  return admin!;
}
