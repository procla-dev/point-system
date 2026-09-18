import { count, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { boothLikes, staff, staffBooths, teams } from '../db/schema.js';

/** チーム一覧を、所属スタッフの担当ブースに付いたいいねの合計が多い順に返す */
export async function findAllTeamsWithLikeCount() {
  const likeCount = count(boothLikes.userId);
  // 同じチームの複数人が同じブースを担当していても二重に数えないよう、(チーム, ブース) の組を先に重複排除する
  const teamBooths = db
    .selectDistinct({ teamId: staff.teamId, boothId: staffBooths.boothId })
    .from(staff)
    .innerJoin(staffBooths, eq(staffBooths.userId, staff.userId))
    .as('team_booths');

  return db
    .select({ id: teams.id, name: teams.name, likeCount })
    .from(teams)
    .leftJoin(teamBooths, eq(teamBooths.teamId, teams.id))
    .leftJoin(boothLikes, eq(boothLikes.boothId, teamBooths.boothId))
    .groupBy(teams.id)
    .orderBy(desc(likeCount), teams.name);
}

export async function findTeamById(id: string) {
  return db.query.teams.findFirst({ where: eq(teams.id, id) });
}

export async function findTeamByName(name: string) {
  return db.query.teams.findFirst({ where: eq(teams.name, name) });
}

export async function createTeam(name: string) {
  const [newTeam] = await db.insert(teams).values({ name }).returning();
  return newTeam!;
}

export async function updateTeam(id: string, name: string) {
  const [updatedTeam] = await db.update(teams).set({ name }).where(eq(teams.id, id)).returning();
  return updatedTeam!;
}

export async function deleteTeam(id: string) {
  await db.delete(teams).where(eq(teams.id, id));
}
