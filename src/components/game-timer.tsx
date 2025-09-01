"use client";

import { useState, useEffect } from "react";

interface TimerProps {
  startTime: number;
  isRunning: boolean;
  endTime?: number;
}

export const formatTime = (milliseconds: number) => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
};

export const GameTimer = ({ startTime, isRunning, endTime }: TimerProps) => {
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    if (endTime) {
      setElapsed(endTime - startTime);
      return;
    }

    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isRunning, endTime]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-lg font-mono">{formatTime(elapsed)}</span>
    </div>
  );
};
