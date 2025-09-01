import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Clean up old games
export const cleanupOldGames = async () => {
  try {
    const now = new Date();
    const abandonThreshold = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes
    const deleteThreshold = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours
    
    await Promise.all([
      prisma.game.updateMany({
        where: { status: 'IN_PROGRESS', startTime: { lt: abandonThreshold } },
        data: { status: 'ABANDONED' }
      }),
      prisma.game.deleteMany({ 
        where: { status: 'ABANDONED', startTime: { lt: deleteThreshold } } 
      })
    ]);
  } catch (e) {
    if (process.env.NODE_ENV === 'development') console.warn('Game cleanup failed', e);
  }
};
