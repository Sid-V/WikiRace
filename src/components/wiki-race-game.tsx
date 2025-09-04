"use client";

import React, { useCallback, useEffect, lazy, Suspense } from "react";
import { GameProvider, useGameSession, useGameActions, useUIState } from "~/contexts/game-context";
import { getRandomPage, getPageContent, type WikipediaPage } from "~/lib/wikipedia";
import { chooseValidatedStartAndEndConcurrent } from "~/lib/six-degrees";
import type { GameSession } from "~/contexts/game-context";

const GameSidebar = lazy(() => import("./game-sidebar").then(m => ({ default: m.GameSidebar })));
const GameContent = lazy(() => import("./game-content").then(m => ({ default: m.GameContent })));
const GameHeader = lazy(() => import("./game-content").then(m => ({ default: m.GameHeader })));
const GameCompletionScreen = lazy(() => import("./game-completion").then(m => ({ default: m.GameCompletionScreen })));
const GameLoadingScreen = lazy(() => import("./game-loading").then(m => ({ default: m.GameLoadingScreen })));
const GameHomepage = lazy(() => import("./game-homepage").then(m => ({ default: m.GameHomepage })));

interface BackendGameStartResponse { gameId: string }

function useGameLogic() {
  const gameSession = useGameSession();
  const actions = useGameActions();

  const startNewGame = useCallback(async () => {
    actions.setLoading(true);
    actions.setError(null);
    actions.setContent("");
    actions.setGameSession(null);

    try {
      let backendGameId: string | undefined;
      try {
        const res = await fetch('/api/game/start', { method: 'POST' });
        if (res.ok) {
          const data = await res.json() as BackendGameStartResponse;
          backendGameId = data.gameId;
        }
      } catch {/* ignore start failure; can still play local */}

      const result = await chooseValidatedStartAndEndConcurrent<WikipediaPage>(
        () => getRandomPage(),
        () => getRandomPage(),
        (title) => getPageContent(title),
        { maxDegrees: 4, endAttemptsPerStart: 2 }
      );
      const { startPageData, endPage, path: solutionPath, degrees } = result;

      const newSession: GameSession = {
        id: backendGameId ?? Math.random().toString(36).substring(7),
        startPage: startPageData.page,
        endPage: endPage as WikipediaPage,
        currentPage: startPageData.page,
        path: [startPageData.page],
        startTime: Date.now(),
        completed: false,
        solutionPath,
        solutionDistance: degrees,
      };

      if (backendGameId) {
        try {
          await fetch('/api/game/update', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gameId: backendGameId,
              startPage: startPageData.page.title,
              endPage: endPage.title
            })
          });
        } catch (error) {
          console.error('Failed to update game with pages:', error);
        }
      }

      actions.setContent(startPageData.content);
      actions.setGameSession(newSession);

      if (process.env.NODE_ENV !== 'production') {
        console.info('[SixDegrees] Start:"' + newSession.startPage.title + '" End:"' + newSession.endPage.title + '" Degrees:', degrees, '(limit 6)\nPath:', solutionPath.join(' -> '));
      }
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : "Failed to start game");
    } finally {
      actions.setLoading(false);
    }
  }, [actions]);

  useEffect(() => {
    const sendFinish = async () => {
      if (!gameSession?.completed || !gameSession.endTime) return;
      try {
        const payload = {
          gameId: gameSession.id,
          startPage: gameSession.startPage.title,
          endPage: gameSession.endPage.title,
          clicks: gameSession.path.length - 1,
        };
        await fetch('/api/game/finish', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload) 
        });
      } catch {/* ignore */}
    };
    void sendFinish();
  }, [gameSession?.completed, gameSession?.endTime, gameSession?.id, gameSession?.startPage.title, gameSession?.endPage.title, gameSession?.path.length]);

  return { startNewGame };
}

function GameContainer() {
  const gameSession = useGameSession();
  const { isLoading } = useUIState();
  const { startNewGame } = useGameLogic();

  if (!gameSession) {
    if (isLoading) {
      return (
        <Suspense fallback={<div>Loading...</div>}>
          <GameLoadingScreen />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <GameHomepage onStartNewGame={startNewGame} />
      </Suspense>
    );
  }

  if (gameSession.completed) {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <GameCompletionScreen />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Suspense fallback={<div className="w-80 bg-card border-r border-border">Loading sidebar...</div>}>
        <GameSidebar />
      </Suspense>
      
      <div className="flex-1 flex flex-col">
        <Suspense fallback={<div className="h-16 bg-background border-b border-border">Loading header...</div>}>
          <GameHeader />
        </Suspense>

        <main className="flex-1 bg-background wiki-scroll-container">
          <div className="max-w-none px-8 py-8">
            <Suspense fallback={<div className="text-center py-8">Loading content...</div>}>
              <GameContent />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

export function WikiRaceGame() {
  return (
    <GameProvider>
      <GameContainer />
    </GameProvider>
  );
}
