"use client";

import { useState } from "react";
import { WikiRaceGame } from "./wiki-race-game";

export function GameWrapper() {
  const [gameKey] = useState(0); // Key to force game component re-render (placeholder if future reset needed)

  return (
    <div className="min-h-screen bg-background relative">
  <WikiRaceGame key={gameKey} />
    </div>
  );
}
