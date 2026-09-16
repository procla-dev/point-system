import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { booths } from '../db/schema.js';

export async function findAllBooths() {
  return db.query.booths.findMany();
}

export async function findBoothById(id: string) {
  return db.query.booths.findFirst({ where: eq(booths.id, id) });
}

export async function createBooth(name: string) {
  const [newBooth] = await db.insert(booths).values({ name }).returning();
  return newBooth!;
}

export async function updateBooth(id: string, name: string) {
  const [updatedBooth] = await db.update(booths).set({ name }).where(eq(booths.id, id)).returning();
  return updatedBooth!;
}

export async function deleteBooth(id: string) {
  await db.delete(booths).where(eq(booths.id, id));
}