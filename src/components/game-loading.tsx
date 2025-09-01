"use client";

import React, { useRef, useEffect } from 'react';
import Image from "next/image";
import { useUIState, useGameActions } from '~/contexts/game-context';

export function GameLoadingScreen() {
  const { isLoading, loadingMsgIndex } = useUIState();
  const { setLoadingMsgIndex } = useGameActions();
  
  const loadingMessages = useRef<string[]>([
    "Setting up a new game...",
    "Making sure you can reach the end...",
    "The light at the end of the tunnel...",
    "Connecting the links...",
    "Herding random Wikipedia pages..."
  ]);

  useEffect(() => {
    if (isLoading) {
      const id = setInterval(() => {
        setLoadingMsgIndex((loadingMsgIndex + 1) % loadingMessages.current.length);
      }, 3000);
      return () => clearInterval(id);
    }
  }, [isLoading, loadingMsgIndex, setLoadingMsgIndex]);

  if (!isLoading) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-muted/60 dark:bg-muted/30">
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
        <div className="flex flex-col items-center gap-4">
          <div className="h-20 w-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin" aria-label="Loading" />
          <p className="text-lg font-medium text-muted-foreground text-center min-h-[1.5rem]">
            {loadingMessages.current[loadingMsgIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}
