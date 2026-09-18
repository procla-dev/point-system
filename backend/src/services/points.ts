import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { pointBalances, pointSettings, pointTransactions, users } from '../db/schema.js';

type GrantUserPointsInput = {
  userId: string;
  operatorUserId: string;
  points: number;
};

export async function getUserBalance(userId: string) {
  const [balance] = await db.select({ balance: pointBalances.balance }).from(pointBalances).where(eq(pointBalances.userId, userId)).limit(1);
  return balance?.balance ?? 0;
}

export async function getGrantPoints() {
  const [settings] = await db.select({ grantPoints: pointSettings.grantPoints }).from(pointSettings).where(eq(pointSettings.id, 1)).limit(1);
  if (settings) return settings.grantPoints;
  const [created] = await db.insert(pointSettings).values({ id: 1 }).returning({ grantPoints: pointSettings.grantPoints });
  return created!.grantPoints;
}

export async function updateGrantPoints(grantPoints: number) {
  const [settings] = await db.insert(pointSettings).values({ id: 1, grantPoints }).onConflictDoUpdate({ target: pointSettings.id, set: { grantPoints, updatedAt: new Date() } }).returning({ grantPoints: pointSettings.grantPoints });
  return settings!.grantPoints;
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

type SpendUserPointsInput = {
  userId: string;
  operatorUserId: string;
  points: number;
};

export async function spendUserPoints({ userId, operatorUserId, points }: SpendUserPointsInput) {
  return db.transaction(async (tx) => {
    const [targetUser] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.role, 'user')))
      .limit(1);

    if (!targetUser) return { status: 'not_found' as const };

    // 残高が不足している場合は更新されないため、残高がマイナスになることはない。
    await tx.insert(pointBalances).values({ userId }).onConflictDoNothing({ target: pointBalances.userId });

    const [updatedBalance] = await tx
      .update(pointBalances)
      .set({
        balance: sql<number>`${pointBalances.balance} - ${points}`,
        updatedAt: new Date(),
      })
      .where(and(eq(pointBalances.userId, userId), gte(pointBalances.balance, points)))
      .returning({ balance: pointBalances.balance });

    if (!updatedBalance) {
      const [currentBalance] = await tx
        .select({ balance: pointBalances.balance })
        .from(pointBalances)
        .where(eq(pointBalances.userId, userId))
        .limit(1);

      return { status: 'insufficient_balance' as const, balance: currentBalance?.balance ?? 0 };
    }

    const [transaction] = await tx
      .insert(pointTransactions)
      .values({
        userId,
        amount: points,
        type: 'spend',
        operatorUserId,
      })
      .returning({ id: pointTransactions.id });

    if (!transaction) throw new Error('failed to record point transaction');

    return {
      status: 'ok' as const,
      transactionId: transaction.id,
      balance: updatedBalance.balance,
    };
  });
}
