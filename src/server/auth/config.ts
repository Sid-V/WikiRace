import { type DefaultSession, type NextAuthConfig, type Session as NextAuthSession } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { env } from "~/env";
// Temporarily remove prisma import to isolate session issues
// import { prisma } from "~/lib/db";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // Stats are loaded separately via API, not in session
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
  session: {
    strategy: "jwt",
  },
  // Explicitly set base URL for production
  basePath: "/api/auth",
  callbacks: {
    jwt: async ({ token, account }) => {
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      }
      return token;
    },
    session: async ({ session, token }: { session: NextAuthSession; token: { sub?: string } }) => {
      const userId = token.sub;
      
      if (!userId) {
        console.error('No userId found in token during session callback');
        return session;
      }
      
      // Don't load stats in session callback - causes production failures
      // Stats should be loaded separately via API when needed
      return {
        ...session,
        user: {
          ...session.user,
          id: userId,
        },
      };
    },
  },
  events: {
    signIn: async ({ account }) => {
      // Temporarily disable database operations during signIn to isolate session issues
      const providerAccountId = account?.providerAccountId;
      if (!providerAccountId) {
        console.error('No providerAccountId found during signIn event');
        return;
      }
      
      console.log(`SignIn event for user: ${providerAccountId}`);
      
      // TODO: Re-enable database user creation after session issue is resolved
      /*
      try {
        await prisma.user.upsert({ 
          where: { id: providerAccountId }, 
          update: {}, 
          create: { id: providerAccountId } 
        });
        console.log(`Successfully processed user: ${providerAccountId}`);
      } catch (e) {
        console.error('User creation failed during signIn event:', e);
      }
      */
    },
  },
} satisfies NextAuthConfig;
