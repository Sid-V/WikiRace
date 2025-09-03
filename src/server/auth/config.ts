import { type DefaultSession, type NextAuthConfig, type Session as NextAuthSession } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { env } from "~/env";
import { prisma } from "~/lib/db";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // Stats are loaded separately via API, not in session
    } & DefaultSession["user"];
  }
}

// Hard fail early in production if secret missing (required for stable JWT/session encryption)
if (process.env.NODE_ENV === 'production' && !env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET missing. Set it in Vercel project env before deploying.');
}

// Minimal, production-safe NextAuth configuration.
// Strategy: JWT only, Discord provider, create User row on first sign-in so FK constraints for Game/UserStats succeed.
export const authConfig = {
  providers: [
    DiscordProvider({
      clientId: env.AUTH_DISCORD_ID,
      clientSecret: env.AUTH_DISCORD_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
  secret: env.AUTH_SECRET, // next-auth v5 also auto-detects AUTH_SECRET, but we pass explicitly for clarity
  trustHost: true, // required on Vercel if using dynamic host headers
  callbacks: {
    // Runs on every JWT encode/update. account is defined only on initial OAuth callback.
  async jwt({ token, account, profile }) {
      // Establish stable subject using provider account id (Discord user id)
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      } else if (!token.sub && profile?.id) {
        token.sub = profile.id; // fallback
      }

      // Ensure a User DB row exists exactly once (first sign-in) so downstream FK inserts succeed.
      if (account && token.sub) {
        try {
          await prisma.user.upsert({
            where: { id: token.sub },
            update: {},
            create: { id: token.sub },
          });
        } catch (e) {
          // Surface but don't break auth flow – failing here would block login entirely.
          console.error('User upsert failed during jwt callback', e);
        }
      }
      return token;
    },
    async session({ session, token }: { session: NextAuthSession; token: { sub?: string } }) {
      if (session.user && token.sub) {
        // Type augmentation done via module declaration above
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
  // Quiet in production; verbose in dev only
  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig;
