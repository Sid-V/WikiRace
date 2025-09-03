import NextAuth from "next-auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./config";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
export default handler;

// For server-side session access
export const auth = () => getServerSession(authOptions);
