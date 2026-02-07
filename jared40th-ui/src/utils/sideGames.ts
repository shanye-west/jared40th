/**
 * Side game computation utilities.
 * Derives skins and cumulative results from existing group score data.
 */

import type { GroupDoc } from "../types";

// ============================================================================
// SKINS
// ============================================================================

export type HoleSkinResult = {
  holeNumber: number;
  winnerId: string | null;
  winnerName: string | null;
  winnerScore: number | null;
  tiedCount: number;
  allCompleted: boolean;
};

export type PlayerSkinsResult = {
  playerId: string;
  displayName: string;
  skinsWon: number;
  holesWon: number[];
  earnings: number;
};

export type SkinsResult = {
  holes: HoleSkinResult[];
  players: PlayerSkinsResult[];
  totalSkinsAwarded: number;
  valuePerSkin: number;
};

/**
 * Compute skins for a set of groups (one round's worth).
 * For each hole, the single lowest score wins. Ties = no skin.
 */
export function computeSkins(
  groups: GroupDoc[],
  optedInPlayerIds: string[],
  scoreType: "gross" | "net",
  pot: number
): SkinsResult {
  const optedInSet = new Set(optedInPlayerIds);
  const holes: HoleSkinResult[] = [];
  const playerMap = new Map<string, PlayerSkinsResult>();

  // Initialize player map from group data
  for (const g of groups) {
    for (const p of g.players) {
      if (optedInSet.has(p.playerId) && !playerMap.has(p.playerId)) {
        playerMap.set(p.playerId, {
          playerId: p.playerId,
          displayName: p.displayName,
          skinsWon: 0,
          holesWon: [],
          earnings: 0,
        });
      }
    }
  }

  for (let h = 1; h <= 18; h++) {
    const key = String(h);
    const scores: { playerId: string; displayName: string; score: number }[] = [];
    let allCompleted = true;

    for (const g of groups) {
      for (let i = 0; i < g.players.length; i++) {
        const p = g.players[i];
        if (!optedInSet.has(p.playerId)) continue;

        const holeData = g.holes[key];
        if (!holeData) {
          allCompleted = false;
          continue;
        }

        const rawScore = scoreType === "gross"
          ? holeData.gross?.[i]
          : holeData.net?.[i] ?? null;

        if (rawScore == null) {
          allCompleted = false;
        } else {
          scores.push({ playerId: p.playerId, displayName: p.displayName, score: rawScore });
        }
      }
    }

    if (scores.length === 0) {
      holes.push({ holeNumber: h, winnerId: null, winnerName: null, winnerScore: null, tiedCount: 0, allCompleted: false });
      continue;
    }

    const minScore = Math.min(...scores.map((s) => s.score));
    const winners = scores.filter((s) => s.score === minScore);

    if (winners.length === 1 && allCompleted) {
      const winner = winners[0];
      holes.push({
        holeNumber: h,
        winnerId: winner.playerId,
        winnerName: winner.displayName,
        winnerScore: winner.score,
        tiedCount: 0,
        allCompleted,
      });
      const entry = playerMap.get(winner.playerId);
      if (entry) {
        entry.skinsWon++;
        entry.holesWon.push(h);
      }
    } else {
      holes.push({
        holeNumber: h,
        winnerId: null,
        winnerName: null,
        winnerScore: minScore,
        tiedCount: winners.length,
        allCompleted,
      });
    }
  }

  const totalSkinsAwarded = holes.filter((h) => h.winnerId !== null).length;
  const valuePerSkin = totalSkinsAwarded > 0 ? pot / totalSkinsAwarded : 0;

  // Calculate earnings
  for (const entry of playerMap.values()) {
    entry.earnings = entry.skinsWon * valuePerSkin;
  }

  const players = Array.from(playerMap.values()).sort((a, b) => b.skinsWon - a.skinsWon);

  return { holes, players, totalSkinsAwarded, valuePerSkin };
}

// ============================================================================
// CUMULATIVE
// ============================================================================

export type PlayerCumulativeResult = {
  playerId: string;
  displayName: string;
  totalScore: number;
  holesCompleted: number;
  toPar: number;
};

export type CumulativeResult = {
  players: PlayerCumulativeResult[];
  totalPar: number;
};

/**
 * Compute cumulative totals across all groups (all rounds).
 * Sums gross or net scores for each opted-in player across all 54 holes.
 */
export function computeCumulative(
  allGroups: GroupDoc[],
  optedInPlayerIds: string[],
  scoreType: "gross" | "net",
  coursePar: number
): CumulativeResult {
  const optedInSet = new Set(optedInPlayerIds);
  const playerMap = new Map<string, PlayerCumulativeResult>();

  for (const g of allGroups) {
    for (let i = 0; i < g.players.length; i++) {
      const p = g.players[i];
      if (!optedInSet.has(p.playerId)) continue;

      if (!playerMap.has(p.playerId)) {
        playerMap.set(p.playerId, {
          playerId: p.playerId,
          displayName: p.displayName,
          totalScore: 0,
          holesCompleted: 0,
          toPar: 0,
        });
      }

      const entry = playerMap.get(p.playerId)!;

      for (let h = 1; h <= 18; h++) {
        const key = String(h);
        const holeData = g.holes[key];
        if (!holeData) continue;

        const rawScore = scoreType === "gross"
          ? holeData.gross?.[i]
          : holeData.net?.[i] ?? null;

        if (rawScore != null) {
          entry.totalScore += rawScore;
          entry.holesCompleted++;
        }
      }
    }
  }

  // Count how many rounds of par to use based on groups
  const roundCount = new Set(allGroups.map((g) => g.roundId)).size;
  const totalPar = coursePar * roundCount;

  for (const entry of playerMap.values()) {
    // Calculate to-par based on holes actually completed
    const expectedPar = (entry.holesCompleted / 18) * coursePar;
    entry.toPar = entry.totalScore - Math.round(expectedPar);
  }

  const players = Array.from(playerMap.values()).sort((a, b) => {
    // Sort by total score ascending (lowest wins), then by holes completed descending
    if (a.totalScore !== b.totalScore) return a.totalScore - b.totalScore;
    return b.holesCompleted - a.holesCompleted;
  });

  return { players, totalPar };
}
