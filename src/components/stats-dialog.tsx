"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "~/components/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "~/components/ui/alert-dialog";

// Stats content component
const StatsContent: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ 
    gamesPlayed: number; 
    fastestDurationSeconds: number | null; 
    averageDurationSeconds: number | null 
  } | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const res = await fetch('/api/stats');
        if (!res.ok) throw new Error('Failed to load');
        const json: unknown = await res.json();
        if (active) {
          setData(json as { 
            gamesPlayed: number; 
            fastestDurationSeconds: number | null; 
            averageDurationSeconds: number | null 
          });
        }
      } catch {
        if (active) setError('Error loading stats');
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => { active = false; };
  }, []);

  if (loading) return <div className="text-sm">Loading...</div>;
  if (error) return <div className="text-sm text-red-500">{error}</div>;
  if (!data) return <div className="text-sm">No stats yet.</div>;

  const fmt = (s: number | null) => s == null ? '-' : `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div className="text-sm space-y-2">
      <div className="flex justify-between"><span>Games Played</span><span>{data.gamesPlayed}</span></div>
      <div className="flex justify-between"><span>Fastest</span><span>{fmt(data.fastestDurationSeconds)}</span></div>
      <div className="flex justify-between"><span>Average</span><span>{fmt(data.averageDurationSeconds)}</span></div>
    </div>
  );
};

// Main stats dialog component
export default function StatsDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" size="sm" className="flex-1">Stats</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Your Stats</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <StatsContent />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
