import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { staff as staffTable, users } from '../db/schema.js';

export async function createStaff() {
  return db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({ role: 'staff' }).returning();
    const [staffRow] = await tx.insert(staffTable).values({ userId: user!.id }).returning();
    return { id: user!.id, boothId: staffRow!.boothId };
  });
}

export async function setStaffBooth(userId: string, boothId: string | null) {
  const [updated] = await db.update(staffTable).set({ boothId }).where(eq(staffTable.userId, userId)).returning();
  return updated;
}

export async function findStaffByBoothId(boothId: string) {
  return db.query.staff.findFirst({ where: eq(staffTable.boothId, boothId) });
}
