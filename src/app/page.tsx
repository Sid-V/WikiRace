"use client";

import { AuthButton } from "~/components/auth-button";
import { GameWrapper } from "~/components/game-wrapper";
import { ModeToggle } from "~/components/mode-toggle";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

export default function HomePage() {
  const { status } = useSession();
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="w-full flex items-center justify-between px-4 py-2 border-b">
          <h1 className="text-xl font-semibold">Wiki Race</h1>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            Sign Out
          </Button>
        </header>
        <div className="flex-1">
          <GameWrapper />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background dark:bg-background">
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <Card className="w-full max-w-2xl shadow-xl border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <CardContent className="p-10 flex flex-col items-center text-center">
            <div className="mb-8 flex flex-col items-center gap-4">
              <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                <Image
                  src="/Wiki_race.png"
                  alt="Wiki Race Logo"
                  fill
                  priority
                  sizes="(max-width: 768px) 128px, 160px"
                  className="object-contain drop-shadow-lg"
                />
              </div>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-none bg-gradient-to-b from-foreground to-foreground/70 text-transparent bg-clip-text">
                Wiki Race
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-md">
                Race through Wikipedia by navigating only with in-article links. Reach the target page in the fewest clicks and the fastest time.
              </p>
            </div>
            <div className="flex flex-col items-center gap-4 w-full">
              <Button
                onClick={() => {/* intentionally empty - sign in below */}}
                disabled
                className="hidden"
              >Hidden</Button>
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground">Sign in to start playing</p>
                <AuthButton />
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <div className="fixed bottom-6 left-6 flex flex-col items-start gap-3">
        <ModeToggle />
        <AuthButton />
      </div>
    </div>
  );
}
