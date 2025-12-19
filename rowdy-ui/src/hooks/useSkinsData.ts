import { useState, useEffect, useMemo } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase";
import type { 
  RoundDoc, 
  TournamentDoc, 
  HoleSkinData, 
  PlayerSkinsTotal, 
  SkinsResultDoc 
} from "../types";
import { ensureTournamentTeamColors } from "../utils/teamColors";

export type SkinType = "gross" | "net";

// Re-export types for consumers (Skins.tsx, Match.tsx)
export type { HoleSkinData, PlayerSkinsTotal, PlayerHoleScore } from "../types";

export function useSkinsData(roundId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [round, setRound] = useState<RoundDoc | null>(null);
  const [tournament, setTournament] = useState<TournamentDoc | null>(null);
  const [skinsResult, setSkinsResult] = useState<SkinsResultDoc | null>(null);

  // Subscribe to round
  useEffect(() => {
    if (!roundId) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "rounds", roundId),
      (snap) => {
        if (snap.exists()) {
          setRound({ id: snap.id, ...snap.data() } as RoundDoc);
        } else {
          setRound(null);
          setError("Round not found");
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error loading round:", err);
        setError("Failed to load round");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [roundId]);

  // Subscribe to tournament (for team colors, names)
  useEffect(() => {
    if (!round?.tournamentId) return;

    const unsub = onSnapshot(
      doc(db, "tournaments", round.tournamentId),
      (snap) => {
        if (snap.exists()) {
          setTournament(ensureTournamentTeamColors({ id: snap.id, ...snap.data() } as TournamentDoc));
        }
      }
    );

    return () => unsub();
  }, [round?.tournamentId]);

  // Subscribe to pre-computed skins results
  useEffect(() => {
    if (!roundId) return;

    const unsub = onSnapshot(
      doc(db, "rounds", roundId, "skinsResults", "computed"),
      (snap) => {
        if (snap.exists()) {
          setSkinsResult(snap.data() as SkinsResultDoc);
        } else {
          setSkinsResult(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error loading skins results:", err);
        // Don't set error - skins may just not be configured yet
        setSkinsResult(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [roundId]);

  // Check if skins are enabled and format is valid
  const skinsEnabled = useMemo(() => {
    const hasGross = (round?.skinsGrossPot ?? 0) > 0;
    const hasNet = (round?.skinsNetPot ?? 0) > 0;
    const validFormat = round?.format === "singles" || round?.format === "twoManBestBall";
    return validFormat && (hasGross || hasNet);
  }, [round]);

  // Get hole-by-hole skins data from pre-computed results
  const holeSkinsData = useMemo((): HoleSkinData[] => {
    if (!skinsEnabled || !skinsResult) return [];
    return skinsResult.holeSkinsData || [];
  }, [skinsEnabled, skinsResult]);

  // Get player totals from pre-computed results
  const playerTotals = useMemo((): PlayerSkinsTotal[] => {
    if (!skinsEnabled || !skinsResult) return [];
    return skinsResult.playerTotals || [];
  }, [skinsEnabled, skinsResult]);

  return {
    loading,
    error,
    round,
    tournament,
    skinsEnabled,
    holeSkinsData,
    playerTotals,
  };
}
