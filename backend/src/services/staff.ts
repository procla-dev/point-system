import { db } from '../db/index.js';
import { users } from '../db/schema.js';

export async function createStaff(boothId: string) {
  const [staff] = await db.insert(users).values({ role: 'staff', boothId }).returning();
  return staff!;
}
