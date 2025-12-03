/**
 * usePlayerStats Hook
 * 
 * Fetches aggregated player stats by tournament series from Firestore.
 * 
 * Usage:
 *   const { stats, loading, error } = usePlayerStats(playerId, "rowdyCup");
 *   const { allSeriesStats, loading } = usePlayerStatsBySeries(playerId);
 */

import { useState, useEffect } from "react";
import { doc, collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../firebase";
import type { PlayerStatsBySeries, TournamentSeries } from "../types";

/**
 * Fetch stats for a single player in a specific series
 */
export function usePlayerStats(playerId: string | undefined, series: TournamentSeries) {
  const [stats, setStats] = useState<PlayerStatsBySeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!playerId || !series) {
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const docRef = doc(db, "playerStats", playerId, "bySeries", series);
    
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          setStats({ ...snap.data(), playerId, series } as PlayerStatsBySeries);
        } else {
          setStats(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching player stats:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [playerId, series]);

  return { stats, loading, error };
}

/**
 * Fetch stats for a single player across all series
 */
export function usePlayerStatsBySeries(playerId: string | undefined) {
  const [allSeriesStats, setAllSeriesStats] = useState<PlayerStatsBySeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!playerId) {
      setAllSeriesStats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const colRef = collection(db, "playerStats", playerId, "bySeries");
    
    const unsub = onSnapshot(
      query(colRef),
      (snap) => {
        const stats: PlayerStatsBySeries[] = [];
        snap.forEach((doc) => {
          stats.push({ ...doc.data(), playerId, series: doc.id } as PlayerStatsBySeries);
        });
        setAllSeriesStats(stats);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching player stats by series:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [playerId]);

  return { allSeriesStats, loading, error };
}

/**
 * Fetch stats for multiple players in a specific series (for leaderboards)
 */
export function useSeriesLeaderboard(series: TournamentSeries, playerIds: string[]) {
  const [leaderboard, setLeaderboard] = useState<PlayerStatsBySeries[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!series || playerIds.length === 0) {
      setLeaderboard([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribes: (() => void)[] = [];
    const statsMap = new Map<string, PlayerStatsBySeries>();

    playerIds.forEach((playerId) => {
      const docRef = doc(db, "playerStats", playerId, "bySeries", series);
      const unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          statsMap.set(playerId, { ...snap.data(), playerId, series } as PlayerStatsBySeries);
        } else {
          statsMap.delete(playerId);
        }
        // Update leaderboard with current stats, sorted by points desc
        const sorted = Array.from(statsMap.values()).sort((a, b) => b.points - a.points);
        setLeaderboard(sorted);
        setLoading(false);
      });
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [series, playerIds.join(",")]);

  return { leaderboard, loading };
}
