import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    return NextResponse.json({
      session,
      cookies: request.cookies.getAll(),
      headers: {
        'user-agent': request.headers.get('user-agent'),
        'host': request.headers.get('host'),
      },
      env: {
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        hasAuthSecret: !!process.env.AUTH_SECRET,
        hasDiscordId: !!process.env.AUTH_DISCORD_ID,
        hasDiscordSecret: !!process.env.AUTH_DISCORD_SECRET,
      }
    });
  } catch (error) {
    console.error('Session debug error:', error);
    return NextResponse.json({ 
      error: 'Failed to get session',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
