import type { DefaultSession, Account, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import DiscordProvider from "next-auth/providers/discord";
import { env } from "~/env";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
  }
}

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
    })
  ],
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async jwt({ token, account }: { token: JWT; account: Account | null }) {
      // Persist the OAuth account-id to the token right after signin
      if (account) {
        token.userId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // Send properties to the client
      if (token.userId && session.user) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
};
