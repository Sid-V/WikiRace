import { type DefaultSession, type NextAuthConfig, type Session as NextAuthSession } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { env } from "~/env";
import { prisma } from "~/lib/db";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      stats?: {
        gamesPlayed: number;
        fastestDurationSeconds: number | null;
        averageDurationSeconds: number | null;
      };
    } & DefaultSession["user"];
  }
}

export const authConfig = {
  providers: [
    DiscordProvider({
      clientId: env.AUTH_DISCORD_ID,
      clientSecret: env.AUTH_DISCORD_SECRET,
    }),
  ],
  callbacks: {
    jwt: async ({ token, account }) => {
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      }
      return token;
    },
    session: async ({ session, token }: { session: NextAuthSession; token: { sub?: string } }) => {
      const userId = token.sub;
      let stats: { gamesPlayed: number; fastestDurationSeconds: number | null; averageDurationSeconds: number | null } | undefined;
      
      if (userId) {
        try {
          const s = await prisma.userStats.findUnique({ where: { userId } });
          if (s) {
            stats = {
              gamesPlayed: s.gamesPlayed,
              fastestDurationSeconds: s.fastestDurationSeconds,
              averageDurationSeconds: s.gamesPlayed > 0 ? Math.round(Number(s.totalDurationSeconds) / s.gamesPlayed) : null,
            };
          }
        } catch {
          // Ignore stats loading errors
        }
      }
      
      return {
        ...session,
        user: {
          ...session.user,
          id: userId,
          stats,
        },
      };
    },
  },
  events: {
    signIn: async ({ account }) => {
      try {
        const providerAccountId = account?.providerAccountId;
        if (!providerAccountId) return;
        
        await prisma.user.upsert({ 
          where: { id: providerAccountId }, 
          update: {}, 
          create: { id: providerAccountId } 
        });
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.error('User creation failed', e);
        }
      }
    },
  },
} satisfies NextAuthConfig;
