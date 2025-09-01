import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { prisma } from '~/lib/db';

export const GET = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const stats = await prisma.userStats.findUnique({ where: { userId: session.user.id } });
  if (!stats) {
    return NextResponse.json({ 
      gamesPlayed: 0, 
      fastestDurationSeconds: null, 
      averageDurationSeconds: null 
    });
  }
  
  const averageDurationSeconds = stats.gamesPlayed > 0 
    ? Math.round(Number(stats.totalDurationSeconds) / stats.gamesPlayed) 
    : null;
    
  return NextResponse.json({
    gamesPlayed: stats.gamesPlayed,
    fastestDurationSeconds: stats.fastestDurationSeconds,
    averageDurationSeconds,
  });
};
