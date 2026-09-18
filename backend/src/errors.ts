import { z } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';

export const ErrorResponse = z.object({
  status: z.literal('error'),
  message: z.string(),
});

export class BadRequestError extends HTTPException {
  constructor(message: string) {
    super(400, { message });
  }
}

export class UnauthorizedError extends HTTPException {
  constructor(message: string) {
    super(401, { message });
  }
}

export class ForbiddenError extends HTTPException {
  constructor(message: string) {
    super(403, { message });
  }
}

export class NotFoundError extends HTTPException {
  constructor(message: string) {
    super(404, { message });
  }
}

export class ConflictError extends HTTPException {
  constructor(message: string) {
    super(409, { message });
  }
}

export class TooManyRequestsError extends HTTPException {
  constructor(message: string) {
    super(429, { message });
  }
}
