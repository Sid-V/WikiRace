import { getServerSession } from "next-auth/next";
import { authOptions } from "./config";

export async function auth() {
  return await getServerSession(authOptions);
}
