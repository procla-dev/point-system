import { count, eq } from 'drizzle-orm';
import { createLoginToken } from '../services/auth.js';
import { createAdmin } from '../services/admins.js';
import { db, pool } from '../db/index.js';
import { users } from '../db/schema.js';

try {
  const [result] = await db
    .select({ total: count() })
    .from(users)
    .where(eq(users.role, 'admin'));
  const total = result?.total ?? 0;

  if (total > 0) {
    throw new Error('admin account already exists; use POST /api/admins for additional accounts');
  }

  const admin = await createAdmin();
  const { token, expiresAt } = await createLoginToken(admin.id);

  console.log('Initial admin account created.');
  console.log(`Admin ID: ${admin.id}`);
  console.log(`Login token: ${token}`);
  console.log(`Expires at: ${expiresAt.toISOString()}`);
} finally {
  await pool.end();
}
