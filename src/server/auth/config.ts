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
      authorization: { params: { scope: 'identify email' } },
    }),
  ],
  session: { strategy: 'jwt' },
  secret: env.AUTH_SECRET, // next-auth v5 also auto-detects AUTH_SECRET, but we pass explicitly for clarity
  trustHost: true, // required on Vercel if using dynamic host headers
  callbacks: {
    // Runs on every JWT encode/update. account is defined only on initial OAuth callback.
  async jwt({ token, account, user }) {
      // On first sign-in, account + user are present
      if (account?.providerAccountId) token.sub = account.providerAccountId;
      if (!token.sub && (user as { id?: string } | undefined)?.id) token.sub = (user as { id?: string }).id;

      // Persist basic profile fields so the session callback can surface them
      if (user) {
        if (user.name) token.name = user.name;
        if (user.email) token.email = user.email;
        if (user.image) token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }: { session: NextAuthSession; token: { sub?: string } }) {
      if (!token.sub) return session; // unauthenticated
      const t = token as { name?: string; email?: string; picture?: string; image?: string };
      const name = t.name ?? session.user?.name;
      const email = t.email ?? session.user?.email;
  const image = (t.picture ?? t.image) ?? session.user?.image ?? undefined;
      session.user = {
        id: token.sub,
        name: name ?? undefined,
        email: email ?? undefined,
        image: image ?? undefined,
      } as typeof session.user & { id: string };
      return session;
    },
  },
  events: {
  async signIn({ account, user }) {
      try {
  const id = account?.providerAccountId ?? (user as { id?: string } | undefined)?.id;
        if (!id) return;
        await prisma.user.upsert({
          where: { id },
          update: {},
          create: { id },
        });
      } catch (e) {
        console.error('User upsert failed in signIn event', e);
      }
    },
  },
  // Quiet in production; verbose in dev only
  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig;
