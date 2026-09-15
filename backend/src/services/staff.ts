import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { staff as staffTable, users } from '../db/schema.js';

export async function createStaff() {
  return db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({ role: 'staff' }).returning();
    const [staffRow] = await tx.insert(staffTable).values({ userId: user!.id }).returning();
    return { id: user!.id, boothId: staffRow!.boothId };
  });
}

export async function findStaffById(id: string) {
  return db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.role, 'staff')),
  });
}
