import { createMiddleware } from 'hono/factory';
import type { AuthUser, Booth } from '../db/schema.js';
import { ForbiddenError } from '../errors.js';
import { findStaffBoothByUserId } from '../services/staff.js';

type BoothEnv = { Variables: { user: AuthUser; booth: Booth } };

export const requireBoothKind = (...kinds: Booth['kind'][]) =>
  createMiddleware<BoothEnv>(async (c, next) => {
    const user = c.get('user');
    if (user.role === 'admin') {
      await next();
      return;
    }

    const staffBooth = await findStaffBoothByUserId(user.id);
    const booth = staffBooth?.booth;

    if (!booth || !kinds.includes(booth.kind)) throw new ForbiddenError('not allowed for this booth');

    c.set('booth', booth);
    await next();
  });
