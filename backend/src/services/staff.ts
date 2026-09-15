import { db } from '../db/index.js';
import { users } from '../db/schema.js';

export async function createStaff() {
  const [staff] = await db.insert(users).values({ role: 'staff' }).returning();
  return staff!;
}
