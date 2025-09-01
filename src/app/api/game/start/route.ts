import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { prisma, cleanupOldGames } from '~/lib/db';

export const POST = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    void cleanupOldGames();

    const game = await prisma.game.create({
      data: { userId: session.user.id, startPage: 'UNKNOWN', endPage: 'UNKNOWN' },
      select: { id: true },
    });
    
    return NextResponse.json({ gameId: game.id }, { status: 201 });
  } catch (e: any) {
    console.error('Game start failed', e);
    const detail = process.env.NODE_ENV === 'development' ? { message: e?.message } : {};
    return NextResponse.json({ error: 'Failed to start game', ...detail }, { status: 500 });
  }
};
