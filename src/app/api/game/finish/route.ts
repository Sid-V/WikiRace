import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '~/lib/auth-helpers';
import { prisma, cleanupOldGames } from '~/lib/db';

export const POST = async (request: Request) => {
  const userId = await getAuthenticatedUserId();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await request.json() as { 
    gameId?: string; 
    startPage?: string; 
    endPage?: string; 
    clicks?: number; 
  };
  
  if (!body.gameId || !body.startPage || !body.endPage || typeof body.clicks !== 'number') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const game = await tx.game.findFirst({ 
        where: { id: body.gameId, userId } 
      });
      
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
      
      const durationSeconds = Math.max(1, Math.floor((updatedGame.endTime!.getTime() - updatedGame.startTime.getTime()) / 1000));
      await tx.game.update({ where: { id: game.id }, data: { durationSeconds } });

      const existingStats = await tx.userStats.findUnique({ where: { userId } });
      if (!existingStats) {
        const stats = await tx.userStats.create({
          data: {
            userId,
            gamesPlayed: 1,
            totalDurationSeconds: BigInt(durationSeconds),
            fastestDurationSeconds: durationSeconds,
          },
        });
        const avg = Number(stats.totalDurationSeconds) / stats.gamesPlayed;
        console.log(`✅ Game finished for user ${userId}: ${body.gameId} (first game, ${durationSeconds}s)`);
        return { durationSeconds, fastestDurationSeconds: stats.fastestDurationSeconds, averageDurationSeconds: Math.round(avg), gamesPlayed: stats.gamesPlayed } as const;
      } else {
        const stats = await tx.userStats.update({
          where: { userId },
          data: {
            gamesPlayed: { increment: 1 },
            totalDurationSeconds: { increment: BigInt(durationSeconds) },
            fastestDurationSeconds: existingStats.fastestDurationSeconds !== null && existingStats.fastestDurationSeconds <= durationSeconds ? existingStats.fastestDurationSeconds : durationSeconds,
          },
        });
        const avg = Number(stats.totalDurationSeconds) / stats.gamesPlayed;
        console.log(`✅ Game finished for user ${userId}: ${body.gameId} (${stats.gamesPlayed} games, ${durationSeconds}s)`);
        return { durationSeconds, fastestDurationSeconds: stats.fastestDurationSeconds, averageDurationSeconds: Math.round(avg), gamesPlayed: stats.gamesPlayed } as const;
      }
    });

    if ('error' in result) return NextResponse.json(result, { status: 409 });
    void cleanupOldGames();
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('finish game error', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
};
