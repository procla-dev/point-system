import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { pointBalances, pointTransactions, users } from '../db/schema.js';

type GrantUserPointsInput = {
  userId: string;
  operatorUserId: string;
  points: number;
};

export async function getUserBalance(userId: string) {
  const [balance] = await db.select({ balance: pointBalances.balance }).from(pointBalances).where(eq(pointBalances.userId, userId)).limit(1);
  return balance?.balance ?? 0;
}

export async function grantUserPoints({ userId, operatorUserId, points }: GrantUserPointsInput) {
  return db.transaction(async (tx) => {
    const [targetUser] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.role, 'user')))
      .limit(1);

    if (!targetUser) return undefined;

    // 既存ユーザーはマイグレーションで初期化するが、欠落時にも付与処理を継続できるようにする。
    await tx.insert(pointBalances).values({ userId }).onConflictDoNothing({ target: pointBalances.userId });

    const [updatedBalance] = await tx
      .update(pointBalances)
      .set({
        balance: sql<number>`${pointBalances.balance} + ${points}`,
        updatedAt: new Date(),
      })
      .where(eq(pointBalances.userId, userId))
      .returning({ balance: pointBalances.balance });

    if (!updatedBalance) throw new Error('failed to update point balance');

    const [transaction] = await tx
      .insert(pointTransactions)
      .values({
        userId,
        amount: points,
        type: 'grant',
        operatorUserId,
      })
      .returning({ id: pointTransactions.id });

    if (!transaction) throw new Error('failed to record point transaction');

    return {
      transactionId: transaction.id,
      balance: updatedBalance.balance,
    };
  });
}
