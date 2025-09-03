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

// Additional production sanity checks – a missing Discord credential often surfaces as a generic Configuration error
if (process.env.NODE_ENV === 'production') {
  const missing: string[] = [];
  if (!process.env.AUTH_DISCORD_ID) missing.push('AUTH_DISCORD_ID');
  if (!process.env.AUTH_DISCORD_SECRET) missing.push('AUTH_DISCORD_SECRET');
  if (missing.length) {
    throw new Error('Missing required Discord env vars: ' + missing.join(', '));
  }
}

// Guard against invalid NEXTAUTH_URL / AUTH_URL (e.g. set to "/auth") which causes "TypeError: Invalid URL"
(() => {
  const raw = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL;
  if (!raw) return; // NextAuth will fallback to inferred URL (host header)
  try {
    // Validate; throws if invalid / relative
    // eslint-disable-next-line no-new
    new URL(raw);
  } catch {
    const fallbackHost = process.env.VERCEL_URL; // e.g. my-app.vercel.app
    if (fallbackHost) {
      process.env.NEXTAUTH_URL = `https://${fallbackHost}`;
    } else {
      delete process.env.NEXTAUTH_URL; // let library compute locally
    }
  }
})();

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
  logger: {
    error(error) {
      console.error('[AUTH][error]', error);
    },
    warn(code) {
      console.warn('[AUTH][warn]', code);
    },
    debug(code) {
      if (process.env.NODE_ENV !== 'production') console.log('[AUTH][debug]', code);
    },
  },
  // Quiet in production; verbose in dev only
  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig;
