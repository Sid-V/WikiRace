import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";

export async function GET(request: NextRequest) {
  try {
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_SECRET: mask(process.env.NEXTAUTH_SECRET),
      DISCORD_CLIENT_ID_present: !!process.env.DISCORD_CLIENT_ID,
      DISCORD_CLIENT_SECRET_present: !!process.env.DISCORD_CLIENT_SECRET,
      DATABASE_URL_present: !!process.env.DATABASE_URL,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
      VERCEL_URL: process.env.VERCEL_URL ?? null,
    };

    // Validate each candidate URL explicitly
    const urlDiagnostics = ['NEXTAUTH_URL','VERCEL_URL'].map(key => {
      const v = (process.env as Record<string,string|undefined>)[key];
      if (!v) return { key, value: v ?? null, valid: false, reason: 'unset' };
      try { new URL(v.startsWith('http') ? v : `https://${v}`); return { key, value: v, valid: true }; }
      catch (e) { return { key, value: v, valid: false, reason: (e as Error).message }; }
    });

    const session = await auth();

    const cookies = request.cookies.getAll();
  const authCookies = cookies.filter(c => /(next-auth|authjs)/i.test(c.name));

    return NextResponse.json({
      success: true,
      envCheck,
      urlDiagnostics,
      sessionSummary: {
        exists: !!session,
        user: session?.user ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        } : null,
      },
      cookies: {
        total: cookies.length,
        authCookieNames: authCookies.map(c => c.name),
      },
      request: {
        host: request.headers.get('host'),
        userAgent: request.headers.get('user-agent'),
        protocolHeader: request.headers.get('x-forwarded-proto'),
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

function mask(v?: string) {
  if (!v) return null;
  if (v.length <= 6) return '****';
  return v.slice(0,2) + '***' + v.slice(-2);
}
