"use client";

import React from 'react';
import Image from "next/image";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Play } from "lucide-react";
import { useUIState } from '~/contexts/game-context';

interface GameHomepageProps {
  onStartNewGame: () => void;
}

export function GameHomepage({ onStartNewGame }: GameHomepageProps) {
  const { error, isLoading } = useUIState();

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-16 bg-muted/60 dark:bg-muted/30">
      <Card className="w-full max-w-2xl shadow-xl border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <CardHeader className="text-center pb-4">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-28 h-28 sm:w-36 sm:h-36">
              <Image
                src="/Wiki_race.png"
                alt="Wiki Race Logo"
                fill
                sizes="(max-width: 640px) 112px, 144px"
                className="object-contain drop-shadow-lg"
                priority
              />
            </div>
            <CardTitle className="text-5xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-foreground to-foreground/70 text-transparent bg-clip-text">
              Wiki Race
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 text-center space-y-6">
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            Navigate from one Wikipedia page to another using only in-article links. Reach the target page with the fewest clicks and fastest time.
          </p>
          <div className="flex flex-col items-center gap-4">
            <Button
              onClick={onStartNewGame}
              disabled={isLoading}
              size="lg"
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  <span>Start New Game</span>
                </>
              )}
            </Button>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
