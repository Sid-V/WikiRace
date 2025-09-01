"use client";

import React, { memo, useCallback, useRef, useEffect } from 'react';
import { useGameSession, useGameActions, useUIState } from '~/contexts/game-context';
import { getPageContentProgressive, type WikipediaPage } from "~/lib/wikipedia";

interface WikiContentProps {
  content: string;
  onLinkClick: (pageTitle: string) => void;
}

// Optimized wiki content renderer
const WikiContent = memo(({ content, onLinkClick }: WikiContentProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle wiki link clicks with event delegation
  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'A' && target.hasAttribute('data-wiki-page')) {
      event.preventDefault();
      const pageTitle = target.getAttribute('data-wiki-page');
      if (pageTitle) {
        onLinkClick(pageTitle);
      }
    }
  }, [onLinkClick]);

  // Optimize scroll performance with viewport-based content visibility
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use passive scroll listeners for better performance
    const handleScroll = () => {
      // Update content visibility for sections based on viewport
      requestIdleCallback(() => {
        const elements = container.querySelectorAll('[data-section]');
        elements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const isVisible = rect.bottom >= 0 && rect.top <= window.innerHeight;
          
          if (isVisible) {
            (el as HTMLElement).style.contentVisibility = 'visible';
          } else {
            (el as HTMLElement).style.contentVisibility = 'auto';
          }
        });
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [content]);

  return (
    <div 
      ref={containerRef}
      className="wikipedia-content max-w-none"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: content }}
      style={{
        minHeight: '200px',
        contain: 'layout style paint',
        contentVisibility: 'auto',
        containIntrinsicSize: '1000px',
        willChange: 'auto',
        transform: 'translateZ(0)'
      }}
    />
  );
});

WikiContent.displayName = 'WikiContent';

// Main game content component
export function GameContent() {
  const gameSession = useGameSession();
  const { navigateToPage, setLoading, setError, setContent } = useGameActions();
  const { currentPageContent, isLoading, error } = useUIState();
  
  const contentCacheRef = useRef<Map<string, string>>(new Map());
  const fetchAbortRef = useRef<AbortController | null>(null);
  const currentPageRef = useRef<string>("");

  // Load and cache Wikipedia page content
  const loadPageContent = useCallback(async (pageTitle: string) => {
    if (currentPageRef.current === pageTitle || isLoading) {
      return;
    }
    
    currentPageRef.current = pageTitle;
    setLoading(true);
    setError(null);
    
    try {
      if (fetchAbortRef.current) {
        fetchAbortRef.current.abort();
      }
      const controller = new AbortController();
      fetchAbortRef.current = controller;
      
      const content = await getPageContentProgressive(pageTitle, (enhanced) => {
        if (currentPageRef.current === pageTitle) {
          setContent(enhanced);
        }
      });
      
      if (currentPageRef.current === pageTitle) {
        setContent(content);
        if (contentCacheRef.current.has(pageTitle)) {
          contentCacheRef.current.delete(pageTitle);
        }
        contentCacheRef.current.set(pageTitle, content);
        if (contentCacheRef.current.size > 20) {
          const oldestIter = contentCacheRef.current.keys().next();
          if (!oldestIter.done) {
            contentCacheRef.current.delete(oldestIter.value);
          }
        }
      }
    } catch (err) {
      if (currentPageRef.current === pageTitle) {
        setError(err instanceof Error ? err.message : "Failed to load page");
        setContent("");
        currentPageRef.current = "";
      }
    } finally {
      if (currentPageRef.current === pageTitle) {
        setLoading(false);
      }
    }
  }, [isLoading, setLoading, setError, setContent]);

  // Handle navigation when user clicks wiki links
  const handleLinkClick = useCallback(async (pageTitle: string) => {
    if (!gameSession || gameSession.completed || isLoading) return;

    const newPage: WikipediaPage = {
      pageid: 0,
      title: pageTitle,
      extract: "",
      fullurl: `https://en.wikipedia.org/wiki/${pageTitle.replace(/ /g, "_")}`,
    };

    const isCompleted = pageTitle === gameSession.endPage.title;
    navigateToPage(newPage);

    if (!isCompleted) {
      const cached = contentCacheRef.current.get(pageTitle);
      if (cached) {
        setContent(cached);
      } else {
        setContent('<p class="text-sm text-muted-foreground">Loading content...</p>');
      }
      await loadPageContent(pageTitle);
    }
  }, [gameSession, isLoading, navigateToPage, setContent, loadPageContent]);

  // Load content when game starts or page changes
  useEffect(() => {
    if (gameSession?.currentPage.title && !currentPageContent) {
      const cached = contentCacheRef.current.get(gameSession.currentPage.title);
      if (cached) {
        setContent(cached);
      } else {
        void loadPageContent(gameSession.currentPage.title);
      }
    }
  }, [gameSession, currentPageContent, setContent, loadPageContent]);

  // Handle navigation events (forward/back)
  useEffect(() => {
    if (gameSession?.currentPage.title && currentPageRef.current !== gameSession.currentPage.title) {
      const cached = contentCacheRef.current.get(gameSession.currentPage.title);
      if (cached) {
        setContent(cached);
        currentPageRef.current = gameSession.currentPage.title;
      } else {
        void loadPageContent(gameSession.currentPage.title);
      }
    }
  }, [gameSession?.currentPage.title, setContent, loadPageContent]);

  if (!gameSession) return null;

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
      </div>
    );
  }

  if (isLoading && !currentPageContent) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <WikiContent 
      content={currentPageContent}
      onLinkClick={handleLinkClick}
    />
  );
}

// Game header with current page title
export const GameHeader = memo(() => {
  const gameSession = useGameSession();
  
  if (!gameSession) return null;

  return (
    <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border z-40">
      <div className="px-6 py-3">
        <div className="mb-4">
          <h1 
            className="text-3xl font-normal pb-1 mb-2" 
            style={{ 
              fontFamily: 'Linux Libertine, Georgia, Times, serif',
              borderBottom: '3px solid #a2a9b1'
            }}
          >
            {gameSession.currentPage.title}
          </h1>
        </div>
      </div>
    </header>
  );
});

GameHeader.displayName = 'GameHeader';
