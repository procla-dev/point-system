import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { boothLikes } from '../db/schema.js';

export async function findLikeByBoothId(boothId: string) {
  return db.query.boothLikes.findFirst({ where: eq(boothLikes.boothId, boothId) });
}

export async function likeBooth(userId: string, boothId: string) {
  const [like] = await db.insert(boothLikes).values({ userId, boothId }).onConflictDoNothing().returning();
  return like;
}
