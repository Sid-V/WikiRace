import { Suspense } from "react";
import Link from "next/link";

function AuthErrorContent() {
  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <div className="bg-red-50 border border-red-200 rounded-md p-6">
        <h1 className="text-2xl font-bold text-red-800 mb-4">Authentication Error</h1>
        <p className="text-red-700 mb-4">
          There was an error during authentication. This could be due to:
        </p>
        <ul className="list-disc list-inside text-red-700 mb-4 space-y-1">
          <li>Discord OAuth configuration issues</li>
          <li>Invalid or expired authentication tokens</li>
          <li>Network connectivity problems</li>
        </ul>
        <div className="flex gap-4">
          <Link 
            href="/api/auth/signin" 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Try Again
          </Link>
          <Link 
            href="/" 
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
