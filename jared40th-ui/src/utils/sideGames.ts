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

    if (winners.length === 1) {
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
 * Sums gross or net scores for each opted-in player across all holes.
 *
 * @param holeParsByRound - Map of roundId → 18-element array of par values per hole.
 *   Used to compute accurate to-par based on actual hole pars.
 *   Falls back to par 4 per hole if a round's pars are not provided.
 */
export function computeCumulative(
  allGroups: GroupDoc[],
  optedInPlayerIds: string[],
  scoreType: "gross" | "net",
  holeParsByRound: Record<string, number[]>
): CumulativeResult {
  const optedInSet = new Set(optedInPlayerIds);
  const playerMap = new Map<string, PlayerCumulativeResult & { parSum: number }>();

  for (const g of allGroups) {
    const holePars = holeParsByRound[g.roundId];

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
          parSum: 0,
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
          // Use actual hole par, fallback to 4
          entry.parSum += holePars?.[h - 1] ?? 4;
        }
      }
    }
  }

  // Compute totalPar from all rounds
  let totalPar = 0;
  const roundIds = new Set(allGroups.map((g) => g.roundId));
  for (const rid of roundIds) {
    const pars = holeParsByRound[rid];
    totalPar += pars ? pars.reduce((a, b) => a + b, 0) : 72;
  }

  for (const entry of playerMap.values()) {
    entry.toPar = entry.totalScore - entry.parSum;
  }

  const players: PlayerCumulativeResult[] = Array.from(playerMap.values())
    .map(({ parSum: _, ...rest }) => rest)
    .sort((a, b) => {
      if (a.toPar !== b.toPar) return a.toPar - b.toPar;
      return b.holesCompleted - a.holesCompleted;
    });

  return { players, totalPar };
}
