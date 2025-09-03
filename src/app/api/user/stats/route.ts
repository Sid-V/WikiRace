import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { prisma } from "~/lib/db";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const stats = await prisma.userStats.findUnique({ 
      where: { userId: session.user.id } 
    });

    if (!stats) {
      return NextResponse.json({
        gamesPlayed: 0,
        fastestDurationSeconds: null,
        averageDurationSeconds: null,
      });
    }

    return NextResponse.json({
      gamesPlayed: stats.gamesPlayed,
      fastestDurationSeconds: stats.fastestDurationSeconds,
      averageDurationSeconds: stats.gamesPlayed > 0 
        ? Math.round(Number(stats.totalDurationSeconds) / stats.gamesPlayed) 
        : null,
    });
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' }, 
      { status: 500 }
    );
  }
}
