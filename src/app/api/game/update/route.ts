import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '~/lib/auth-helpers';
import { prisma } from '~/lib/db';

export const PATCH = async (request: Request) => {
  const userId = await getAuthenticatedUserId();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as { gameId?: string; startPage?: string; endPage?: string };
    
    if (!body.gameId || !body.startPage || !body.endPage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const game = await prisma.game.updateMany({
      where: { id: body.gameId, userId, status: 'IN_PROGRESS' },
      data: { startPage: body.startPage, endPage: body.endPage }
    });

    if (game.count === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    console.log(`✅ Game updated for user ${userId}: ${body.gameId} (${body.startPage} -> ${body.endPage})`);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Update game error:', error);
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
  }
};
