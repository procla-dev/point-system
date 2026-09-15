import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

export async function createStaff(boothId: string) {
  const [staff] = await db.insert(users).values({ role: 'staff', boothId }).returning();
  return staff!;
}

export async function findStaffById(id: string) {
  return db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.role, 'staff')),
  });
}
