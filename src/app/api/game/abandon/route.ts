import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '~/lib/auth-helpers';
import { prisma } from '~/lib/db';

export const POST = async (request: Request) => {
  const userId = await getAuthenticatedUserId();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as { gameId?: string };
    const gameId = body.gameId;
    
    if (!gameId || typeof gameId !== 'string') {
      return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
    }

    const result = await prisma.game.updateMany({
      where: { id: gameId, userId, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED' }
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Game not found or already finished' }, { status: 404 });
    }

    console.log(`🔄 Game abandoned for user ${userId}: ${gameId}`);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Game abandon failed', error);
    return NextResponse.json({ error: 'Failed to abandon game' }, { status: 500 });
  }
};