import { db } from '../db/index.js';
import { operationLogs } from '../db/schema.js';

export async function recordOperationLog(input: {
  actorUserId: string;
  action: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(operationLogs).values({
    actorUserId: input.actorUserId,
    action: input.action,
    targetUserId: input.targetUserId,
    metadata: input.metadata,
  });
}
