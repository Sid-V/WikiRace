"use client";

import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import Image from "next/image";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Clock, Target, Play, RotateCcw, ExternalLink } from "lucide-react";
import { AuthButton } from "./auth-button";
import { ModeToggle } from "./mode-toggle";
import { GameTimer } from "./game-timer";
import { 
  getRandomPage, 
  getRandomPageWithContent,
  getPageContent, 
  type WikipediaPage,
  type GameSession 
} from "~/lib/wikipedia";

// No external props now; game lifecycle managed internally

// Memoized content component for optimal performance
const WikiContent = memo(({ content, onLinkClick }: { 
  content: string; 
  onLinkClick: (pageTitle: string) => void;
}) => {
  // Use event delegation for better performance - single click handler
  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'A' && target.hasAttribute('data-wiki-page')) {
      event.preventDefault();
      const pageTitle = target.getAttribute('data-wiki-page');
      if (pageTitle) {
        // Debounce rapid clicks
        onLinkClick(pageTitle);
      }
    }
  }, [onLinkClick]);

  return (
    <div 
      className="wikipedia-content max-w-none"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: content }}
      style={{
        minHeight: '200px',
        contain: 'layout style paint', // CSS containment for performance
        willChange: 'auto',
        transform: 'translateZ(0)' // Force GPU layer for smoother scrolling
      }}
    />
  );
});

WikiContent.displayName = 'WikiContent';

// Memoized sidebar component
const GameSidebar = memo(({ gameSession, startTime, isRunning, onNewGame, showNewGame }: { 
  gameSession: GameSession;
  startTime: number;
  isRunning: boolean;
  onNewGame: () => void;
  showNewGame: boolean;
}) => (
  <div className="w-80 bg-card border-r border-border sticky top-0 h-screen overflow-hidden flex flex-col">
    <div className="p-6 border-b border-border">
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
            <div className="text-2xl font-bold text-blue-700">{gameSession.path.length - 1}</div>
          </div>
          
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="text-sm text-orange-600 font-medium flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Time
            </div>
            <div className="text-2xl font-bold text-orange-700">
              <GameTimer 
                startTime={startTime} 
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
    </div>
    
    <div className="flex-1 overflow-hidden">
      <Card className="h-full rounded-none border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Path Tracker</CardTitle>
        </CardHeader>
        <CardContent className="h-full pb-0">
          <div className="sidebar-scroll h-full overflow-y-auto pr-2">
            <div className="space-y-2">
              {gameSession.path.map((page, index) => (
                <div
                  key={`${page.title}-${index}`}
                  className={`p-3 rounded-lg border text-sm transition-colors ${
                    index === 0
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : index === gameSession.path.length - 1
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
        </CardContent>
      </Card>
    </div>

    {/* Bottom controls */}
    <div className="p-4 border-t border-border flex flex-col gap-3">
      {showNewGame && (
        <Button 
          onClick={onNewGame} 
          variant="outline" 
          size="sm" 
          className="gap-2 w-full max-w-[160px] justify-start px-3"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="text-sm font-medium">New Game</span>
        </Button>
      )}
      <div className="flex items-center gap-3">
        <ModeToggle />
        {/* Enlarged avatar button */}
        <div className="scale-110">
          <AuthButton />
        </div>
      </div>
    </div>
  </div>
));

GameSidebar.displayName = 'GameSidebar';

export function WikiRaceGame() {
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [currentPageContent, setCurrentPageContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const currentPageRef = useRef<string>("");
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load page content
  const loadPageContent = useCallback(async (pageTitle: string) => {
    if (currentPageRef.current === pageTitle || isLoading) {
      return;
    }
    
    currentPageRef.current = pageTitle;
    setIsLoading(true);
    setError(null);
    
    try {
      const content = await getPageContent(pageTitle);
      // Only update if this is still the current page
      if (currentPageRef.current === pageTitle) {
        setCurrentPageContent(content);
      }
    } catch (err) {
      if (currentPageRef.current === pageTitle) {
        setError(err instanceof Error ? err.message : "Failed to load page");
        setCurrentPageContent("");
        currentPageRef.current = "";
      }
    } finally {
      if (currentPageRef.current === pageTitle) {
        setIsLoading(false);
      }
    }
  }, [isLoading]);

  // Start new game
  const startNewGame = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCurrentPageContent("");
    currentPageRef.current = "";
    
    try {
      const [startPageData, endPage] = await Promise.all([
        getRandomPageWithContent(),
        getRandomPage()
      ]);

      if (startPageData.page.title === endPage.title) {
        return startNewGame();
      }

      const newSession: GameSession = {
        id: Math.random().toString(36).substring(7),
        startPage: startPageData.page,
        endPage,
        currentPage: startPageData.page,
        path: [startPageData.page],
        startTime: Date.now(),
        completed: false,
      };

      currentPageRef.current = startPageData.page.title;
      setCurrentPageContent(startPageData.content);
  setGameSession(newSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start game");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Navigate to a new page
  const navigateToPage = useCallback(async (pageTitle: string) => {
    if (!gameSession || gameSession.completed || isLoading) return;

    // Clear any pending navigation
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // Debounce rapid clicks
    navigationTimeoutRef.current = setTimeout(() => {
      const run = async () => {
        try {
          const newPage: WikipediaPage = {
            pageid: 0,
            title: pageTitle,
            extract: "",
            fullurl: `https://en.wikipedia.org/wiki/${pageTitle.replace(/ /g, "_")}`,
          };

          const isCompleted = pageTitle === gameSession.endPage.title;

            setGameSession(prevSession => {
            if (!prevSession) return null;
            return {
              ...prevSession,
              currentPage: newPage,
              path: [...prevSession.path, newPage],
              completed: isCompleted,
              endTime: isCompleted ? Date.now() : undefined,
            };
          });

          if (!isCompleted) {
            await loadPageContent(pageTitle);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to navigate");
        }
      };
      void run();
    }, 150); // 150ms debounce
  }, [gameSession, isLoading, loadPageContent]);

  // Game completion handler
  // Effect placeholder for future side-effects when game completes
  useEffect(() => { /* no-op: previously notified parent */ }, [gameSession?.completed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  if (!gameSession) {
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
                onClick={startNewGame}
                disabled={isLoading}
                size="lg"
                className="gap-2"
              >
                <Play className="h-5 w-5" />
                {isLoading ? "Setting up game..." : "Start New Game"}
              </Button>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameSession.completed) {
    const gameDuration = gameSession.endTime! - gameSession.startTime;
    const formatTime = (milliseconds: number) => {
      const seconds = Math.floor(milliseconds / 1000);
      const minutes = Math.floor(seconds / 60);
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    };
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-4xl mx-auto p-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-green-600">
                Congratulations! 🎉
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-xl mb-4">
                  You successfully navigated from <strong>{gameSession.startPage.title}</strong> to{" "}
                  <strong>{gameSession.endPage.title}</strong>!
                </p>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold">{formatTime(gameDuration)}</p>
                      <p className="text-sm text-muted-foreground">Time</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Target className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="text-2xl font-bold">{gameSession.path.length - 1}</p>
                      <p className="text-sm text-muted-foreground">Clicks</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
              <div className="text-center">
                <Button onClick={startNewGame} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Play Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <GameSidebar 
        gameSession={gameSession} 
        startTime={gameSession.startTime}
        isRunning={!gameSession.completed}
        onNewGame={startNewGame}
        showNewGame={!gameSession.completed}
      />
      
      <div className="flex-1 flex flex-col">
        {/* Wikipedia-style header */}
        <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border z-40">
          <div className="px-6 py-3">
            {/* Wikipedia title area */}
            <div className="mb-4">
              <h1 className="text-3xl font-normal pb-1 mb-2" style={{ 
                fontFamily: 'Linux Libertine, Georgia, Times, serif',
                borderBottom: '3px solid #a2a9b1'
              }}>
                {gameSession.currentPage.title}
              </h1>
            </div>
          </div>
        </header>

        {/* Main Wikipedia content area */}
        <main className="flex-1 bg-background">
          <div className="max-w-none px-8 py-8">
            {error ? (
              <div className="text-center py-8">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={() => loadPageContent(gameSession.currentPage.title)}>
                  Retry
                </Button>
              </div>
            ) : isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : (
              <WikiContent 
                content={currentPageContent}
                onLinkClick={navigateToPage}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
