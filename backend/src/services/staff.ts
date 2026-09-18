import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { staff as staffTable, staffBooths, users } from '../db/schema.js';

export async function createStaff() {
  return db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({ role: 'staff' }).returning();
    await tx.insert(staffTable).values({ userId: user!.id });
    return { id: user!.id };
  });
}

const assignmentRelations = {
  user: { columns: { displayName: true } },
  staffBooths: { columns: { boothId: true } },
} as const;

type StaffWithRelations = typeof staffTable.$inferSelect & {
  user: { displayName: string | null };
  staffBooths: { boothId: string }[];
};

function toAssignment(row: StaffWithRelations) {
  return {
    userId: row.userId,
    displayName: row.user.displayName,
    teamId: row.teamId,
    boothIds: row.staffBooths.map((staffBooth) => staffBooth.boothId),
  };
}

/** 全スタッフの表示名・所属チーム・担当ブースを作成順に取得する */
export async function findAllStaffAssignments() {
  const rows = await db.query.staff.findMany({
    with: assignmentRelations,
    orderBy: (staff, { asc }) => [asc(staff.createdAt)],
  });
  return rows.map(toAssignment);
}

/** スタッフの表示名・所属チーム・担当ブースを取得する。スタッフでなければ undefined */
export async function findStaffAssignmentByUserId(userId: string) {
  const row = await db.query.staff.findFirst({ where: eq(staffTable.userId, userId), with: assignmentRelations });
  return row ? toAssignment(row) : undefined;
}

/** スタッフの所属チームと担当ブースをまとめて置き換える。スタッフでなければ undefined */
export async function setStaffAssignment(userId: string, teamId: string | null, boothIds: string[]) {
  return db.transaction(async (tx) => {
    const [updated] = await tx.update(staffTable).set({ teamId }).where(eq(staffTable.userId, userId)).returning();
    if (!updated) return undefined;

    await tx.delete(staffBooths).where(eq(staffBooths.userId, userId));
    if (boothIds.length > 0) {
      await tx.insert(staffBooths).values(boothIds.map((boothId) => ({ userId, boothId })));
    }
    return updated;
  });
}

export async function findStaffBoothsByUserId(userId: string) {
  const rows = await db.query.staffBooths.findMany({ where: eq(staffBooths.userId, userId), with: { booth: true } });
  return rows.map((row) => row.booth);
}

export async function findStaffBoothByBoothId(boothId: string) {
  return db.query.staffBooths.findFirst({ where: eq(staffBooths.boothId, boothId) });
}

export async function findStaffByTeamId(teamId: string) {
  return db.query.staff.findFirst({ where: eq(staffTable.teamId, teamId) });
}
