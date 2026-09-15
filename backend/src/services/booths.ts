import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { booths } from '../db/schema.js';

export async function findBoothById(id: string) {
  return db.query.booths.findFirst({ where: eq(booths.id, id) });
}
