import { type DefaultSession, type NextAuthConfig, type Session as NextAuthSession } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { env } from "~/env";

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

// Log essential env (masked) at load for production diagnostics
(() => {
  const mask = (v?: string) => !v ? '∅' : v.length <= 6 ? v[0] + '***' + v.slice(-1) : v.slice(0,2) + '***' + v.slice(-2);
  console.log('[AUTH][boot]', {
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    AUTH_DISCORD_ID_len: process.env.AUTH_DISCORD_ID?.length,
    AUTH_DISCORD_SECRET_mask: mask(process.env.AUTH_DISCORD_SECRET),
    AUTH_SECRET_len: process.env.AUTH_SECRET?.length,
  });
  // Validate NEXTAUTH_URL if present
  const raw = process.env.NEXTAUTH_URL;
  if (raw) {
    try { new URL(raw); } catch (e) { console.error('[AUTH][boot] Invalid NEXTAUTH_URL', raw, (e as Error).message); }
  }
})();

// Ultra-minimal config for isolating Configuration error.
export const authConfig = {
  providers: [
    DiscordProvider({
      clientId: env.AUTH_DISCORD_ID,
      clientSecret: env.AUTH_DISCORD_SECRET,
    })
  ],
  session: { strategy: 'jwt' },
  trustHost: true,
  secret: env.AUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      if (account?.providerAccountId) token.sub = account.providerAccountId;
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        (session.user as any).id = token.sub; // minimal augment
      }
      return session;
    }
  },
  debug: true, // force debug in prod temporarily
} satisfies NextAuthConfig;
