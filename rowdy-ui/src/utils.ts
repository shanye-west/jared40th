import type { MatchDoc } from "./types";

export function formatMatchStatus(
  status?: MatchDoc["status"],
  teamAName: string = "Team A",
  teamBName: string = "Team B"
): string {
  if (!status) return "—";

  const { leader, margin, thru, closed } = status;
  const safeThru = thru ?? 0;
  const safeMargin = margin ?? 0;

  // Case 0: Not started
  if (safeThru === 0) return "Not started";

  // Case 1: All Square
  if (!leader) {
    if (closed) return "Halved"; // Final Tie
    return `All Square (${safeThru})`; // Live Tie
  }

  // Case 2: Someone is leading
  const winnerName = leader === "teamA" ? teamAName : teamBName;

  // Final / Closed
  if (closed) {
    // "4 & 3" logic: Match ended early
    if (safeThru < 18) {
      const holesLeft = 18 - safeThru;
      return `${winnerName} wins ${safeMargin} & ${holesLeft}`;
    }
    // "1 UP" or "2 UP" logic: Match went to 18
    return `${winnerName} wins ${safeMargin} UP`;
  }

  // Live / In Progress
  return `${winnerName} ${safeMargin} UP (${safeThru})`;
}

import type { PlayerMatchFact } from "./types";

/**
 * Extracts a normalized list of opponents from a match fact,
 * handling both single (legacy/1v1) and team formats.
 */
export function getOpponents(fact: PlayerMatchFact): { id: string; tier: string }[] {
  // 1. Try the new array fields first
  if (fact.opponentIds && fact.opponentIds.length > 0) {
    return fact.opponentIds.map((id, index) => ({
      id,
      // Safety check: ensure tier exists at same index, default to "Unknown"
      tier: fact.opponentTiers?.[index] || "Unknown",
    }));
  }

  // 2. Fallback to singular field (for old data or singles)
  if (fact.opponentId) {
    return [{ 
      id: fact.opponentId, 
      tier: fact.opponentTier || "Unknown" 
    }];
  }

  // 3. No opponents found (shouldn't happen in valid match)
  return [];
}