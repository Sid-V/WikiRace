"use client";

import React from 'react';
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Clock, Target, RotateCcw } from "lucide-react";
import { useGameSession, useGameActions, useUIState } from '~/contexts/game-context';

export function GameCompletionScreen() {
  const gameSession = useGameSession();
  const { resetGame } = useGameActions();
  const { isLoading } = useUIState();

  if (!gameSession?.completed || !gameSession.endTime) {
    return null;
  }

  const gameDuration = gameSession.endTime - gameSession.startTime;
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
              <Button onClick={resetGame} className="gap-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    <span>Play Again</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
