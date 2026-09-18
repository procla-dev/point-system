import { createMiddleware } from 'hono/factory';
import type { AuthUser, Booth } from '../db/schema.js';
import { ForbiddenError } from '../errors.js';
import { findStaffBoothsByUserId } from '../services/staff.js';

type BoothEnv = { Variables: { user: AuthUser } };

/** 担当ブースのどれか1つでも指定した種類なら許可する。admin は常に許可 */
export const requireBoothKind = (...kinds: Booth['kind'][]) =>
  createMiddleware<BoothEnv>(async (c, next) => {
    const user = c.get('user');
    if (user.role === 'admin') {
      await next();
      return;
    }

    const assignedBooths = await findStaffBoothsByUserId(user.id);
    if (!assignedBooths.some((booth) => kinds.includes(booth.kind))) {
      throw new ForbiddenError('not allowed for this booth');
    }

    await next();
  });
