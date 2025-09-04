"use client";

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { AuthHeader } from "~/components/auth-header";
import { WikiRaceGame } from "~/components/wiki-race-game";
import { ModeToggle } from "~/components/mode-toggle";
import { Button } from "~/components/ui/button";
import Image from "next/image";
import { Card, CardContent } from "~/components/ui/card";

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-background dark:bg-background">
      <SignedIn>
        <div className="min-h-screen flex flex-col">
          <AuthHeader />
          <div className="flex-1">
            <WikiRaceGame />
          </div>
        </div>
      </SignedIn>

      <SignedOut>
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
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-muted-foreground">Sign in to start playing</p>
                  <SignInButton mode="modal">
                    <Button size="lg" className="gap-2">
                      Sign In
                    </Button>
                  </SignInButton>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
        <div className="fixed bottom-6 left-6">
          <ModeToggle />
        </div>
      </SignedOut>
    </div>
  );
}
