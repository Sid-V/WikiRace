import { NextResponse } from 'next/server';
import { getOrCreateAuthenticatedUser } from '~/lib/auth-helpers';
import { prisma, cleanupOldGames } from '~/lib/db';

export const POST = async () => {
  const userId = await getOrCreateAuthenticatedUser();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await cleanupOldGames();

    const existingGame = await prisma.game.findFirst({
      where: { userId, status: 'IN_PROGRESS' }
    });

    if (existingGame) {
      return NextResponse.json({ 
        error: 'You already have a game in progress',
        gameId: existingGame.id 
      }, { status: 409 });
    }

    const game = await prisma.game.create({
      data: {
        userId,
        startPage: 'PENDING',
        endPage: 'PENDING',
        startTime: new Date(),
        status: 'IN_PROGRESS'
      }
    });

    console.log(`✅ Game started for user ${userId}: ${game.id}`);
    return NextResponse.json({ gameId: game.id, startTime: game.startTime });
  } catch (error: unknown) {
    console.error('Start game error:', error);
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
};
