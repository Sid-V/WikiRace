import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { prisma, cleanupOldGames } from '~/lib/db';

interface FinishBody {
  gameId: string;
  startPage: string;
  endPage: string;
  clicks: number;
}

export const POST = async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = (await request.json()) as Partial<FinishBody>;
  if (!body.gameId || !body.startPage || !body.endPage || typeof body.clicks !== 'number') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const game = await tx.game.findUnique({ where: { id: body.gameId } });
      if (!game || game.endTime) {
        return { error: 'Game already finalized or not found' } as const;
      }
      
      const updatedGame = await tx.game.update({
        where: { id: game.id },
        data: {
          endTime: new Date(),
          endPage: body.endPage!,
          startPage: body.startPage!,
          clicks: body.clicks,
          status: 'COMPLETED'
        },
      });
      
      const durationSeconds = Math.max(1, Math.floor(((updatedGame.endTime as Date).getTime() - updatedGame.startTime.getTime()) / 1000));
      await tx.game.update({ where: { id: game.id }, data: { durationSeconds } });

      const existingStats = await tx.userStats.findUnique({ where: { userId: session.user.id } });
      if (!existingStats) {
        const stats = await tx.userStats.create({
          data: {
            userId: session.user.id,
            gamesPlayed: 1,
            totalDurationSeconds: BigInt(durationSeconds),
            fastestDurationSeconds: durationSeconds,
          },
        });
        const avg = Number(stats.totalDurationSeconds) / stats.gamesPlayed;
        return { durationSeconds, fastestDurationSeconds: stats.fastestDurationSeconds, averageDurationSeconds: Math.round(avg), gamesPlayed: stats.gamesPlayed } as const;
      } else {
        const stats = await tx.userStats.update({
          where: { userId: session.user.id },
          data: {
            gamesPlayed: { increment: 1 },
            totalDurationSeconds: { increment: BigInt(durationSeconds) },
            fastestDurationSeconds: existingStats.fastestDurationSeconds !== null && existingStats.fastestDurationSeconds <= durationSeconds ? existingStats.fastestDurationSeconds : durationSeconds,
          },
        });
        const avg = Number(stats.totalDurationSeconds) / stats.gamesPlayed;
        return { durationSeconds, fastestDurationSeconds: stats.fastestDurationSeconds, averageDurationSeconds: Math.round(avg), gamesPlayed: stats.gamesPlayed } as const;
      }
    });

    if ('error' in result) return NextResponse.json(result, { status: 409 });
    void cleanupOldGames();
    return NextResponse.json(result);
  } catch (e) {
    console.error('finish game error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
};
