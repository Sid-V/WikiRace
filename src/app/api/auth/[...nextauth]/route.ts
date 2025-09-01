import { handlers } from "~/server/auth";

// Ensure this route runs on the Node.js runtime (Prisma is not Edge-compatible)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const { GET, POST } = handlers;
