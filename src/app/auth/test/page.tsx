'use client';

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default function AuthTest() {
  const { data: session, status } = useSession();

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Auth Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>Status:</strong> {status}
          </div>
          
          <div>
            <strong>Session Data:</strong>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded mt-2 text-sm overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>

          <div className="flex gap-4">
            {status === "authenticated" ? (
              <Button onClick={() => signOut()}>Sign Out</Button>
            ) : (
              <Button onClick={() => signIn("discord")}>Sign In with Discord</Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </div>

          <div>
            <strong>Debug Info:</strong>
            <ul className="mt-2 space-y-1">
              <li>• Current URL: {typeof window !== 'undefined' ? window.location.href : 'SSR'}</li>
              <li>• User Agent: {typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) + '...' : 'SSR'}</li>
              <li>• Cookies Available: {typeof document !== 'undefined' ? document.cookie.includes('next-auth') : 'Unknown'}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
