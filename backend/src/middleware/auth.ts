import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import type { users } from '../db/schema.js';
import { ForbiddenError, UnauthorizedError } from '../errors.js';
import { getSessionUser, SESSION_COOKIE_NAME } from '../services/auth.js';

type AuthUser = typeof users.$inferSelect;
type AuthEnv = { Variables: { user: AuthUser } };

export const requireRole = (...roles: AuthUser['role'][]) =>
  createMiddleware<AuthEnv>(async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE_NAME);
    const user = token ? await getSessionUser(token) : undefined;

    if (!user) throw new UnauthorizedError('login required');
    if (!roles.includes(user.role)) throw new ForbiddenError('not allowed for this role');

    c.set('user', user);
    await next();
  });
