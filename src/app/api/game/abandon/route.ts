import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { prisma } from '~/lib/db';

export const POST = async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    const gameId = body && typeof body === 'object' && 'gameId' in body ? body.gameId : null;
    if (!gameId || typeof gameId !== 'string') {
      return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
    }

    await prisma.game.updateMany({
      where: { 
        id: gameId, 
        userId: session.user.id, 
        status: 'IN_PROGRESS' 
      },
      data: { status: 'ABANDONED' }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Game abandon failed', error);
    const detail = process.env.NODE_ENV === 'development' && error instanceof Error 
      ? { message: error.message } 
      : {};
    return NextResponse.json({ error: 'Failed to abandon game', ...detail }, { status: 500 });
  }
};