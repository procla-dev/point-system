import { count, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { boothLikes, booths, teams } from '../db/schema.js';

/** チーム一覧を、所属ブースに付いたいいねの合計が多い順に返す */
export async function findAllTeamsWithLikeCount() {
  const likeCount = count(boothLikes.userId);

  return db
    .select({ id: teams.id, name: teams.name, likeCount })
    .from(teams)
    .leftJoin(booths, eq(booths.teamId, teams.id))
    .leftJoin(boothLikes, eq(boothLikes.boothId, booths.id))
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
