"use client";

import React, { createContext, useContext, useReducer, useMemo } from "react";
import type { WikipediaPage } from "~/lib/wikipedia";

// Game session data structure
export interface GameSession {
  id: string;
  startPage: WikipediaPage;
  endPage: WikipediaPage;
  currentPage: WikipediaPage;
  path: WikipediaPage[];
  startTime: number;
  endTime?: number;
  completed: boolean;
  solutionPath?: string[];
  solutionDistance?: number;
}

// UI state separate from game logic
export interface UIState {
  isLoading: boolean;
  error: string | null;
  currentPageContent: string;
  loadingMsgIndex: number;
}

// Actions for game state
type GameAction =
  | { type: 'SET_GAME_SESSION'; payload: GameSession | null }
  | { type: 'NAVIGATE_TO_PAGE'; payload: WikipediaPage }
  | { type: 'GO_BACK' }
  | { type: 'COMPLETE_GAME'; payload: { endTime: number } }
  | { type: 'RESET_GAME' };

// UI state actions
type UIAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONTENT'; payload: string }
  | { type: 'SET_LOADING_MSG_INDEX'; payload: number }
  | { type: 'RESET_UI' };

// Game state management
const gameReducer = (state: GameSession | null, action: GameAction): GameSession | null => {
  switch (action.type) {
    case 'SET_GAME_SESSION':
      return action.payload;
    
    case 'NAVIGATE_TO_PAGE':
      if (!state || state.completed) return state;
      
      const newPage = action.payload;
      const isCompleted = newPage.title === state.endPage.title;
      
      return {
        ...state,
        currentPage: newPage,
        path: [...state.path, newPage],
        completed: isCompleted,
        endTime: isCompleted ? Date.now() : undefined,
      };
    
    case 'GO_BACK':
      if (!state || state.completed || state.path.length < 2) return state;
      
      const newPath = state.path.slice(0, -1);
      const newCurrent = newPath[newPath.length - 1];
      if (!newCurrent) return state;
      
      return {
        ...state,
        currentPage: newCurrent,
        path: newPath,
      };
    
    case 'COMPLETE_GAME':
      if (!state) return state;
      return {
        ...state,
        completed: true,
        endTime: action.payload.endTime,
      };
    
    case 'RESET_GAME':
      return null;
    
    default:
      return state;
  }
};

// UI state reducer
const uiReducer = (state: UIState, action: UIAction): UIState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_CONTENT':
      return { ...state, currentPageContent: action.payload };
    
    case 'SET_LOADING_MSG_INDEX':
      return { ...state, loadingMsgIndex: action.payload };
    
    case 'RESET_UI':
      return {
        isLoading: false,
        error: null,
        currentPageContent: "",
        loadingMsgIndex: 0,
      };
    
    default:
      return state;
  }
};

// Context interfaces
interface GameContextType {
  gameSession: GameSession | null;
  uiState: UIState;
  actions: {
    setGameSession: (session: GameSession | null) => void;
    navigateToPage: (page: WikipediaPage) => void;
    goBack: () => void;
    completeGame: (endTime: number) => void;
    resetGame: () => void;
    abandonGame: (gameId: string) => Promise<void>;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setContent: (content: string) => void;
    setLoadingMsgIndex: (index: number) => void;
    resetUI: () => void;
  };
  gameLogic?: {
    startNewGame: () => Promise<void>;
    navigateToPage: (page: WikipediaPage) => Promise<void>;
    goToPreviousPage: () => Promise<void>;
    loadPageContent: (title: string) => Promise<void>;
  };
}

const GameContext = createContext<GameContextType | null>(null);

// Initial UI state
const initialUIState: UIState = {
  isLoading: false,
  error: null,
  currentPageContent: "",
  loadingMsgIndex: 0,
};

// Provider component
export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameSession, dispatchGame] = useReducer(gameReducer, null);
  const [uiState, dispatchUI] = useReducer(uiReducer, initialUIState);

  // Memoized actions to prevent unnecessary re-renders
  const actions = useMemo(() => ({
    setGameSession: (session: GameSession | null) => 
      dispatchGame({ type: 'SET_GAME_SESSION', payload: session }),
    
    navigateToPage: (page: WikipediaPage) => {
      // Clear current content when navigating
      dispatchUI({ type: 'SET_CONTENT', payload: '' });
      dispatchGame({ type: 'NAVIGATE_TO_PAGE', payload: page });
    },
    
    goBack: () => {
      // Clear current content when going back to force reload
      dispatchUI({ type: 'SET_CONTENT', payload: '' });
      dispatchGame({ type: 'GO_BACK' });
    },
    
    completeGame: (endTime: number) => 
      dispatchGame({ type: 'COMPLETE_GAME', payload: { endTime } }),
    
    resetGame: () => dispatchGame({ type: 'RESET_GAME' }),
    
    // New abandon game action
    abandonGame: async (gameId: string) => {
      try {
        await fetch('/api/game/abandon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId })
        });
      } catch (error) {
        console.warn('Failed to mark game as abandoned:', error);
        // Continue with abandoning the game even if the API call fails
      }
      dispatchGame({ type: 'RESET_GAME' });
    },
    
    setLoading: (loading: boolean) => 
      dispatchUI({ type: 'SET_LOADING', payload: loading }),
    
    setError: (error: string | null) => 
      dispatchUI({ type: 'SET_ERROR', payload: error }),
    
    setContent: (content: string) => 
      dispatchUI({ type: 'SET_CONTENT', payload: content }),
    
    setLoadingMsgIndex: (index: number) => 
      dispatchUI({ type: 'SET_LOADING_MSG_INDEX', payload: index }),
    
    resetUI: () => dispatchUI({ type: 'RESET_UI' }),
  }), []);

  const contextValue = useMemo(() => ({
    gameSession,
    uiState,
    actions,
  }), [gameSession, uiState, actions]);

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}

// Hook to use game context
export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

// Derived selectors to prevent unnecessary re-renders
export function useGameSession() {
  const { gameSession } = useGame();
  return gameSession;
}

export function useUIState() {
  const { uiState } = useGame();
  return uiState;
}

export function useGameActions() {
  const { actions } = useGame();
  return actions;
}

// Specific selectors for common use cases
export function useGameProgress() {
  const gameSession = useGameSession();
  return useMemo(() => {
    if (!gameSession) return { clicks: 0, isRunning: false, canGoBack: false };
    
    return {
      clicks: gameSession.path.length - 1,
      isRunning: !gameSession.completed,
      canGoBack: gameSession.path.length > 1,
    };
  }, [gameSession]);
}

export function useGamePath() {
  const gameSession = useGameSession();
  return useMemo(() => gameSession?.path ?? [], [gameSession?.path]);
}
