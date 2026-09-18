import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { boothLikes } from '../db/schema.js';

export async function findLikeByBoothId(boothId: string) {
  return db.query.boothLikes.findFirst({ where: eq(boothLikes.boothId, boothId) });
}
