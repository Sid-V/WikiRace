import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";

export async function GET(request: NextRequest) {
  try {
    console.log('=== AUTH DEBUG START ===');
    
    // Check environment variables
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasDiscordId: !!process.env.AUTH_DISCORD_ID,
      hasDiscordSecret: !!process.env.AUTH_DISCORD_SECRET,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
    };
    
    console.log('Environment check:', envCheck);
    
    // Try to get session
    const session = await auth();
    console.log('Session result:', {
      exists: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userName: session?.user?.name,
    });
    
    // Check cookies
    const cookies = request.cookies.getAll();
    const authCookies = cookies.filter(cookie => 
      cookie.name.includes('next-auth') || cookie.name.includes('__Secure-next-auth')
    );
    
    console.log('Auth cookies found:', authCookies.length);
    console.log('Auth cookie names:', authCookies.map(c => c.name));
    
    console.log('=== AUTH DEBUG END ===');
    
    return NextResponse.json({
      success: true,
      environment: envCheck,
      session: {
        exists: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        userName: session?.user?.name,
      },
      cookies: {
        total: cookies.length,
        authCookies: authCookies.length,
        authCookieNames: authCookies.map(c => c.name),
      },
      headers: {
        host: request.headers.get('host'),
        userAgent: request.headers.get('user-agent'),
        forwarded: request.headers.get('x-forwarded-for'),
      }
    });
  } catch (error) {
    console.error('Auth debug error:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
