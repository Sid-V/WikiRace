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

// Ensure secret present in production so JWT/session cookies can be decrypted across requests
if (process.env.NODE_ENV === 'production' && !env.AUTH_SECRET) {
  // Throwing here surfaces the issue during build/runtime instead of failing silently on Vercel
  throw new Error('AUTH_SECRET is missing in production. Set it (or rename to NEXTAUTH_SECRET and update config).');
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
  // Provide secret (required in production) & trust host headers when deployed (Vercel et al.)
  secret: env.AUTH_SECRET,
  trustHost: true,
  // basePath left default (/api/auth)
  callbacks: {
    jwt: async ({ token, account, user }) => {
      // On initial sign-in, account is defined. Use providerAccountId as stable user id (no DB user table yet)
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      }
      // Fallback: ensure sub exists (some providers may not populate providerAccountId expectedly)
      if (!token.sub && user?.id) token.sub = user.id;
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
  // Enable verbose logging locally for easier diagnosis
  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig;
