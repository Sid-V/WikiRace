"use client";

import { lazy, Suspense } from 'react';
import { Button } from "~/components/ui/button";

// Lazy load the stats dialog to reduce initial bundle
const StatsDialog = lazy(() => import('./stats-dialog'));

export default function LazyStatsDialog() {
  return (
    <Suspense fallback={
      <Button variant="secondary" size="sm" disabled className="flex-1">
        Loading...
      </Button>
    }>
      <StatsDialog />
    </Suspense>
  );
}
