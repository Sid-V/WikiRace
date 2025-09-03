import { getServerSession } from "next-auth/next";
import { authConfig } from "./config";

export async function auth() {
  return await getServerSession(authConfig);
}
