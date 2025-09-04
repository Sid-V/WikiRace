import { auth } from "@clerk/nextjs/server";
import { prisma } from "./db";

export async function getOrCreateAuthenticatedUser() {
  const { userId } = await auth();
  
  if (!userId) {
    return null;
  }

  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, createdAt: new Date() }
  });

  return userId;
}

export async function getAuthenticatedUserId() {
  const { userId } = await auth();
  return userId;
}
