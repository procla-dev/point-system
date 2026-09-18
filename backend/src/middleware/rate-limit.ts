import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { TooManyRequestsError } from '../errors.js';
import { getSessionUser, SESSION_COOKIE_NAME } from '../services/auth.js';

const AUTHENTICATED_WINDOW_MS = 10_000;

type Bucket = { count: number; resetAt: number };

const createStore = (windowMs: number, max: number) => {
  let current = new Map<string, Bucket>();
  let previous = new Map<string, Bucket>();

  setInterval(() => {
    previous = current;
    current = new Map();
  }, windowMs).unref();

  const getClient = (key: string): Bucket => {
    const now = Date.now();
    const existing = current.get(key) ?? previous.get(key);

    const isValid = existing && existing.resetAt > now;
    const bucket = isValid ? existing : { count: 0, resetAt: now + windowMs };

    current.set(key, bucket);
    previous.delete(key);
    return bucket;
  };

  return {
    isOverLimit: (key: string) => getClient(key).count >= max,
    increment: (key: string) => (getClient(key).count += 1),
  };
};

const authenticatedStore = createStore(AUTHENTICATED_WINDOW_MS, 30);

export const rateLimit = () =>
  createMiddleware(async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE_NAME);
    const user = token ? await getSessionUser(token) : undefined;

    if (!user || user.role === 'admin') return next();
    if (authenticatedStore.isOverLimit(user.id)) throw new TooManyRequestsError('too many requests');

    await next();
    authenticatedStore.increment(user.id);
  });
