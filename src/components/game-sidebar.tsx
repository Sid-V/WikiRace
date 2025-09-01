"use client";

import React, { memo, Suspense, useCallback } from 'react';
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Clock, Target, RotateCcw, ArrowLeft, Home, ExternalLink } from "lucide-react";
import { GameTimer } from "./game-timer";
import { ModeToggle } from "./mode-toggle";
import { AuthButton } from "./auth-button";
import { useGameSession, useGameProgress, useGamePath, useGameActions } from '~/contexts/game-context';

import LazyStatsDialog from './lazy-stats-dialog';

// Shows navigation path through Wikipedia pages
const PathTracker = memo(() => {
  const path = useGamePath();
  
  return (
    <div className="flex-1 overflow-y-auto pr-2 pb-4">
      <div className="space-y-2">
        {path.map((page, index) => (
          <div
            key={`${page.title}-${index}`}
            className={`p-3 rounded-lg border text-sm transition-colors ${
              index === 0
                ? 'bg-green-50 border-green-200 text-green-800'
                : index === path.length - 1
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-gray-50 border-gray-200 text-gray-700'
            } hover:shadow-sm`}
          >
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-background border border-current flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                {index + 1}
              </span>
              <span className="line-clamp-2 break-words">{page.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

PathTracker.displayName = 'PathTracker';

// Game progress and target display
const GameProgressCard = memo(() => {
  const gameSession = useGameSession();
  const { clicks, isRunning } = useGameProgress();

  if (!gameSession) return null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" />
          Game Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">Clicks</div>
          <div className="text-2xl font-bold text-blue-700">{clicks}</div>
        </div>
        
        <div className="bg-orange-50 p-3 rounded-lg">
          <div className="text-sm text-orange-600 font-medium flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Time
          </div>
          <div className="text-2xl font-bold text-orange-700">
            <GameTimer 
              startTime={gameSession.startTime} 
              isRunning={isRunning} 
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="text-sm font-medium">Start:</div>
          <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
            {gameSession.startPage.title}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="text-sm font-medium">Target:</div>
          <a
            href={gameSession.endPage.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(gameSession.endPage.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group text-sm text-red-700 bg-red-50 p-2 rounded flex items-start gap-2 hover:bg-red-100 transition-colors"
            title="Open target page on Wikipedia in a new tab"
          >
            <span className="flex-1 break-words text-left">{gameSession.endPage.title}</span>
            <ExternalLink className="h-4 w-4 opacity-70 group-hover:opacity-100 flex-shrink-0" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
});

GameProgressCard.displayName = 'GameProgressCard';

// Back button navigation
const NavigationControls = memo(() => {
  const { isRunning, canGoBack } = useGameProgress();
  const { goBack } = useGameActions();

  const handleGoBack = useCallback(() => {
    if (canGoBack && isRunning) {
      goBack();
    }
  }, [goBack, canGoBack, isRunning]);

  return (
    <div className="px-6 pt-4 pb-2 border-b border-border flex-shrink-0">
      <Button 
        onClick={handleGoBack}
        variant="secondary"
        size="sm"
        disabled={!canGoBack || !isRunning}
        className="gap-2 w-full justify-start"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm font-medium">Previous Wiki page</span>
      </Button>
    </div>
  );
});

NavigationControls.displayName = 'NavigationControls';

// Bottom controls component
const BottomControls = memo(() => {
  const gameSession = useGameSession();
  const { isRunning } = useGameProgress();
  const { resetGame, abandonGame } = useGameActions();

  const handleNewGame = useCallback(async () => {
    if (gameSession && isRunning) {
      await abandonGame(gameSession.id);
    } else {
      resetGame();
    }
  }, [gameSession, isRunning, abandonGame, resetGame]);

  const handleLeaveGame = useCallback(async () => {
    if (gameSession && isRunning) {
      await abandonGame(gameSession.id);
    } else {
      resetGame();
    }
  }, [gameSession, isRunning, abandonGame, resetGame]);

  return (
    <div className="p-4 border-t border-border flex flex-col gap-3 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Button 
          onClick={handleNewGame} 
          variant="outline" 
          size="sm" 
          className="gap-2 flex-1 justify-start px-3"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="text-sm font-medium">New Game</span>
        </Button>
        {isRunning && (
          <Button 
            onClick={handleLeaveGame} 
            variant="destructive" 
            size="sm" 
            className="gap-2 flex-1 justify-start px-3"
          >
            <Home className="h-4 w-4" />
            <span className="text-sm font-medium">Leave Game</span>
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <ModeToggle />
        <Suspense fallback={<Button variant="secondary" size="sm" disabled>Loading...</Button>}>
          <LazyStatsDialog />
        </Suspense>
        <div className="scale-110">
          <AuthButton />
        </div>
      </div>
    </div>
  );
});

BottomControls.displayName = 'BottomControls';

// Main sidebar component
export const GameSidebar = memo(() => {
  const gameSession = useGameSession();

  if (!gameSession) return null;

  return (
    <div className="w-80 bg-card border-r border-border sticky top-0 h-screen flex flex-col">
      <div className="p-6 border-b border-border">
        <GameProgressCard />
      </div>
      
      <div className="flex-1 flex flex-col min-h-0">
        <NavigationControls />
        
        <div className="flex-1 flex flex-col min-h-0 px-6">
          <div className="pt-4 pb-2 flex-shrink-0">
            <h3 className="text-lg font-semibold">Path Tracker</h3>
          </div>
          <PathTracker />
        </div>
      </div>

      <BottomControls />
    </div>
  );
});

GameSidebar.displayName = 'GameSidebar';
