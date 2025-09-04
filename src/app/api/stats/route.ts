import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '~/lib/auth-helpers';
import { prisma } from '~/lib/db';

export const GET = async () => {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const stats = await prisma.userStats.findUnique({ where: { userId } });
    
    if (!stats) {
      console.log(`📊 No stats found for user ${userId}, returning defaults`);
      return NextResponse.json({ 
        gamesPlayed: 0, 
        fastestDurationSeconds: null, 
        averageDurationSeconds: null 
      });
    }
    
    const averageDurationSeconds = stats.gamesPlayed > 0 
      ? Math.round(Number(stats.totalDurationSeconds) / stats.gamesPlayed) 
      : null;
      
    console.log(`📊 Stats retrieved for user ${userId}: ${stats.gamesPlayed} games`);
    return NextResponse.json({
      gamesPlayed: stats.gamesPlayed,
      fastestDurationSeconds: stats.fastestDurationSeconds,
      averageDurationSeconds,
    });
  } catch (error: unknown) {
    console.error('Stats fetch error', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
};
