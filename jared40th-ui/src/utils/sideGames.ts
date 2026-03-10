/**
 * Side game computation utilities.
 * Derives skins and cumulative results from existing group score data.
 */

import type { GroupDoc, SkinOverride } from "../types";

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
  playersCompleted: number;
  totalPlayers: number;
  /** Name of the current leader when hole is still in progress */
  leadingName: string | null;
  /** Best score so far (set even when in progress) */
  leadingScore: number | null;
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
  pot: number,
  skinOverrides?: SkinOverride[]
): SkinsResult {
  const optedInSet = new Set(optedInPlayerIds);

  // Build a set of "roundId:playerId:hole" keys for quick override lookup
  const overrideSet = new Set(
    (skinOverrides ?? []).map((o) => `${o.roundId}:${o.playerId}:${o.hole}`)
  );
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

  const totalPlayers = optedInPlayerIds.length;

  for (let h = 1; h <= 18; h++) {
    const key = String(h);
    const scores: { playerId: string; displayName: string; score: number }[] = [];
    let allCompleted = true;

    for (const g of groups) {
      for (let i = 0; i < g.players.length; i++) {
        const p = g.players[i];
        if (!optedInSet.has(p.playerId)) continue;

        const holeData = g.holes?.[key];
        if (!holeData) {
          allCompleted = false;
          continue;
        }

        const rawScore = scoreType === "gross"
          ? holeData.gross?.[i]
          : holeData.net?.[i] ?? null;

        if (rawScore == null) {
          allCompleted = false;
        } else if (overrideSet.has(`${g.roundId}:${p.playerId}:${h}`)) {
          // Score is invalidated for skins — exclude from competition but player still counts as complete
        } else {
          scores.push({ playerId: p.playerId, displayName: p.displayName, score: rawScore });
        }
      }
    }

    const playersCompleted = scores.length;

    if (scores.length === 0) {
      holes.push({ holeNumber: h, winnerId: null, winnerName: null, winnerScore: null, tiedCount: 0, allCompleted: false, playersCompleted: 0, totalPlayers, leadingName: null, leadingScore: null });
      continue;
    }

    const minScore = Math.min(...scores.map((s) => s.score));
    const leaders = scores.filter((s) => s.score === minScore);

    if (leaders.length === 1) {
      const winner = leaders[0];
      // Only award skin when all players have completed the hole
      const skinWon = allCompleted;
      holes.push({
        holeNumber: h,
        winnerId: skinWon ? winner.playerId : null,
        winnerName: skinWon ? winner.displayName : null,
        winnerScore: winner.score,
        tiedCount: 0,
        allCompleted,
        playersCompleted,
        totalPlayers,
        leadingName: winner.displayName,
        leadingScore: winner.score,
      });
      if (skinWon) {
        const entry = playerMap.get(winner.playerId);
        if (entry) {
          entry.skinsWon++;
          entry.holesWon.push(h);
        }
      }
    } else {
      holes.push({
        holeNumber: h,
        winnerId: null,
        winnerName: null,
        winnerScore: minScore,
        tiedCount: leaders.length,
        allCompleted,
        playersCompleted,
        totalPlayers,
        leadingName: allCompleted ? null : leaders[0].displayName,
        leadingScore: minScore,
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
        const holeData = g.holes?.[key];
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

// ============================================================================
// HEAD-TO-HEAD
// ============================================================================

export type H2HSegmentResult = {
  segment: "front" | "back" | "total";
  label: string;
  bet: number;
  player1Score: number | null;
  player2Score: number | null;
  player1Completed: number;
  player2Completed: number;
  holesInSegment: number;
  winnerId: string | null;
  winnerName: string | null;
  tied: boolean;
  complete: boolean;
};

export type H2HPlayerSummary = {
  playerId: string;
  displayName: string;
  segmentsWon: number;
  segmentsLost: number;
  segmentsTied: number;
  totalEarnings: number;
};

export type HeadToHeadResult = {
  player1: H2HPlayerSummary;
  player2: H2HPlayerSummary;
  segments: H2HSegmentResult[];
};

/**
 * Compute head-to-head results for a 1v1 matchup.
 * Compares front 9, back 9, and total scores. Ties are a push.
 */
export function computeHeadToHead(
  allGroups: GroupDoc[],
  playerIds: [string, string],
  scoreType: "gross" | "net",
  betFront: number,
  betBack: number,
  betTotal: number
): HeadToHeadResult {
  // Accumulate scores per player: front (1-9), back (10-18)
  const acc = {
    [playerIds[0]]: { name: "", front: 0, back: 0, frontCount: 0, backCount: 0 },
    [playerIds[1]]: { name: "", front: 0, back: 0, frontCount: 0, backCount: 0 },
  };

  for (const g of allGroups) {
    for (let i = 0; i < g.players.length; i++) {
      const p = g.players[i];
      if (p.playerId !== playerIds[0] && p.playerId !== playerIds[1]) continue;

      const entry = acc[p.playerId];
      if (!entry.name) entry.name = p.displayName;

      for (let h = 1; h <= 18; h++) {
        const holeData = g.holes?.[String(h)];
        if (!holeData) continue;

        const rawScore = scoreType === "gross"
          ? holeData.gross?.[i]
          : holeData.net?.[i] ?? null;

        if (rawScore == null) continue;

        if (h <= 9) {
          entry.front += rawScore;
          entry.frontCount++;
        } else {
          entry.back += rawScore;
          entry.backCount++;
        }
      }
    }
  }

  const p1 = acc[playerIds[0]];
  const p2 = acc[playerIds[1]];

  function buildSegment(
    segment: "front" | "back" | "total",
    label: string,
    bet: number,
    s1: number,
    s2: number,
    c1: number,
    c2: number,
    holesInSegment: number
  ): H2HSegmentResult {
    const complete = c1 === holesInSegment && c2 === holesInSegment;
    const hasScores = c1 > 0 || c2 > 0;
    let winnerId: string | null = null;
    let winnerName: string | null = null;
    let tied = false;

    if (complete) {
      if (s1 < s2) {
        winnerId = playerIds[0];
        winnerName = p1.name;
      } else if (s2 < s1) {
        winnerId = playerIds[1];
        winnerName = p2.name;
      } else {
        tied = true;
      }
    }

    return {
      segment,
      label,
      bet,
      player1Score: hasScores || c1 > 0 ? s1 : null,
      player2Score: hasScores || c2 > 0 ? s2 : null,
      player1Completed: c1,
      player2Completed: c2,
      holesInSegment,
      winnerId,
      winnerName,
      tied,
      complete,
    };
  }

  const segments: H2HSegmentResult[] = [
    buildSegment("front", "Front 9", betFront, p1.front, p2.front, p1.frontCount, p2.frontCount, 9),
    buildSegment("back", "Back 9", betBack, p1.back, p2.back, p1.backCount, p2.backCount, 9),
    buildSegment("total", "Total", betTotal,
      p1.front + p1.back, p2.front + p2.back,
      p1.frontCount + p1.backCount, p2.frontCount + p2.backCount, 18),
  ];

  // Compute earnings
  let p1Earnings = 0;
  let p2Earnings = 0;
  let p1Won = 0, p1Lost = 0, p1Tied = 0;
  let p2Won = 0, p2Lost = 0, p2Tied = 0;

  for (const seg of segments) {
    if (seg.tied) {
      p1Tied++;
      p2Tied++;
    } else if (seg.winnerId === playerIds[0]) {
      p1Won++;
      p2Lost++;
      p1Earnings += seg.bet;
      p2Earnings -= seg.bet;
    } else if (seg.winnerId === playerIds[1]) {
      p2Won++;
      p1Lost++;
      p2Earnings += seg.bet;
      p1Earnings -= seg.bet;
    }
  }

  return {
    player1: {
      playerId: playerIds[0],
      displayName: p1.name || playerIds[0],
      segmentsWon: p1Won,
      segmentsLost: p1Lost,
      segmentsTied: p1Tied,
      totalEarnings: p1Earnings,
    },
    player2: {
      playerId: playerIds[1],
      displayName: p2.name || playerIds[1],
      segmentsWon: p2Won,
      segmentsLost: p2Lost,
      segmentsTied: p2Tied,
      totalEarnings: p2Earnings,
    },
    segments,
  };
}
