import NextAuth from "next-auth";
import { getServerSession } from "next-auth/next";
import { authConfig } from "./config";

const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };
export default handler;

// For server-side session access
export const auth = () => getServerSession(authConfig);
