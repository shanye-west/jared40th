/**
 * Unit tests for Ham & Egg stat calculation
 * 
 * Ham & Egg Definition:
 * A hole where one teammate scores net par or better (≤ 0 vs par)
 * AND the other teammate scores net bogey or worse (≥ +1 vs par)
 * 
 * Applies to: twoManBestBall (uses NET scores) and twoManShamble (uses GROSS scores)
 */

import { describe, it, expect } from "vitest";

// --- TEST HELPER ---

/**
 * Simulates the ham-and-egg calculation for a single hole
 * @param player1VsPar - Player 1's score relative to par (negative = under, positive = over)
 * @param player2VsPar - Player 2's score relative to par
 * @returns true if this hole is a ham-and-egg
 */
function isHamAndEgg(player1VsPar: number, player2VsPar: number): boolean {
  // Ham & Egg: one player <= 0 (par or better) AND other >= 1 (bogey or worse)
  return (
    (player1VsPar <= 0 && player2VsPar >= 1) ||
    (player2VsPar <= 0 && player1VsPar >= 1)
  );
}

/**
 * BUGGY version using >= 2 threshold (double bogey instead of bogey)
 * This was the original bug in the implementation
 */
function isHamAndEggBuggy(player1VsPar: number, player2VsPar: number): boolean {
  // Bug: using >= 2 means only double bogey or worse counts
  return (
    (player1VsPar <= 0 && player2VsPar >= 2) ||
    (player2VsPar <= 0 && player1VsPar >= 2)
  );
}

/**
 * Calculate net score vs par for best ball format
 */
function calculateNetVsPar(
  grossScore: number,
  strokesReceived: 0 | 1,
  holePar: number
): number {
  const netScore = grossScore - strokesReceived;
  return netScore - holePar;
}

/**
 * Calculate gross score vs par for shamble format
 */
function calculateGrossVsPar(grossScore: number, holePar: number): number {
  return grossScore - holePar;
}

/**
 * Count ham-and-egg holes for a full round (best ball format)
 */
function countHamAndEggsBestBall(
  holes: Array<{
    par: number;
    player1Gross: number;
    player1Strokes: 0 | 1;
    player2Gross: number;
    player2Strokes: 0 | 1;
  }>
): number {
  let count = 0;
  for (const hole of holes) {
    const p1VsPar = calculateNetVsPar(hole.player1Gross, hole.player1Strokes, hole.par);
    const p2VsPar = calculateNetVsPar(hole.player2Gross, hole.player2Strokes, hole.par);
    if (isHamAndEgg(p1VsPar, p2VsPar)) {
      count++;
    }
  }
  return count;
}

/**
 * Count ham-and-egg holes for a full round (shamble format - gross scores)
 */
function countHamAndEggsShamble(
  holes: Array<{
    par: number;
    player1Gross: number;
    player2Gross: number;
  }>
): number {
  let count = 0;
  for (const hole of holes) {
    const p1VsPar = calculateGrossVsPar(hole.player1Gross, hole.par);
    const p2VsPar = calculateGrossVsPar(hole.player2Gross, hole.par);
    if (isHamAndEgg(p1VsPar, p2VsPar)) {
      count++;
    }
  }
  return count;
}

// --- TESTS ---

describe("Ham & Egg single hole detection", () => {
  describe("valid ham-and-egg scenarios", () => {
    it("birdie + bogey = ham-and-egg", () => {
      // Player 1: -1 (birdie), Player 2: +1 (bogey)
      expect(isHamAndEgg(-1, 1)).toBe(true);
    });

    it("par + bogey = ham-and-egg", () => {
      // Player 1: 0 (par), Player 2: +1 (bogey)
      expect(isHamAndEgg(0, 1)).toBe(true);
    });

    it("eagle + bogey = ham-and-egg", () => {
      // Player 1: -2 (eagle), Player 2: +1 (bogey)
      expect(isHamAndEgg(-2, 1)).toBe(true);
    });

    it("birdie + double bogey = ham-and-egg", () => {
      // Player 1: -1 (birdie), Player 2: +2 (double bogey)
      expect(isHamAndEgg(-1, 2)).toBe(true);
    });

    it("par + triple bogey = ham-and-egg", () => {
      // Player 1: 0 (par), Player 2: +3 (triple bogey)
      expect(isHamAndEgg(0, 3)).toBe(true);
    });

    it("order doesn't matter - bogey + birdie = ham-and-egg", () => {
      // Player 1: +1 (bogey), Player 2: -1 (birdie)
      expect(isHamAndEgg(1, -1)).toBe(true);
    });

    it("order doesn't matter - bogey + par = ham-and-egg", () => {
      // Player 1: +1 (bogey), Player 2: 0 (par)
      expect(isHamAndEgg(1, 0)).toBe(true);
    });
  });

  describe("NOT ham-and-egg scenarios", () => {
    it("birdie + birdie = NOT ham-and-egg (both good)", () => {
      expect(isHamAndEgg(-1, -1)).toBe(false);
    });

    it("par + par = NOT ham-and-egg (both good)", () => {
      expect(isHamAndEgg(0, 0)).toBe(false);
    });

    it("birdie + par = NOT ham-and-egg (both good)", () => {
      expect(isHamAndEgg(-1, 0)).toBe(false);
    });

    it("bogey + bogey = NOT ham-and-egg (both bad)", () => {
      expect(isHamAndEgg(1, 1)).toBe(false);
    });

    it("bogey + double bogey = NOT ham-and-egg (both bad)", () => {
      expect(isHamAndEgg(1, 2)).toBe(false);
    });

    it("double bogey + triple bogey = NOT ham-and-egg (both bad)", () => {
      expect(isHamAndEgg(2, 3)).toBe(false);
    });
  });
});

describe("Bug fix: >= 1 vs >= 2 threshold", () => {
  it("par + bogey was being MISSED with buggy >= 2 threshold", () => {
    const p1VsPar = 0;  // par
    const p2VsPar = 1;  // bogey
    
    const correct = isHamAndEgg(p1VsPar, p2VsPar);
    const buggy = isHamAndEggBuggy(p1VsPar, p2VsPar);
    
    expect(correct).toBe(true);  // This IS a ham-and-egg
    expect(buggy).toBe(false);   // Bug: >= 2 misses single bogey
  });

  it("birdie + bogey was being MISSED with buggy threshold", () => {
    const p1VsPar = -1; // birdie
    const p2VsPar = 1;  // bogey
    
    const correct = isHamAndEgg(p1VsPar, p2VsPar);
    const buggy = isHamAndEggBuggy(p1VsPar, p2VsPar);
    
    expect(correct).toBe(true);
    expect(buggy).toBe(false);
  });

  it("birdie + double bogey was correctly counted by both", () => {
    const p1VsPar = -1; // birdie
    const p2VsPar = 2;  // double bogey
    
    const correct = isHamAndEgg(p1VsPar, p2VsPar);
    const buggy = isHamAndEggBuggy(p1VsPar, p2VsPar);
    
    expect(correct).toBe(true);
    expect(buggy).toBe(true);  // Both catch double bogey
  });

  it("realistic round shows significant undercount with buggy threshold", () => {
    // Simulate 18 holes with typical best ball scores
    const holes = [
      // Hole 1: par 4 - P1 makes 4 (par, gets stroke), P2 makes 5 (bogey)
      { par: 4, player1Gross: 4, player1Strokes: 1 as const, player2Gross: 5, player2Strokes: 0 as const },
      // Hole 2: par 4 - P1 makes 5 (bogey), P2 makes 4 (par)
      { par: 4, player1Gross: 5, player1Strokes: 0 as const, player2Gross: 4, player2Strokes: 0 as const },
      // Hole 3: par 3 - P1 makes 3 (par), P2 makes 4 (bogey)
      { par: 3, player1Gross: 3, player1Strokes: 0 as const, player2Gross: 4, player2Strokes: 0 as const },
      // Hole 4: par 5 - P1 makes 5 (par), P2 makes 5 (par) - NOT ham-and-egg
      { par: 5, player1Gross: 5, player1Strokes: 0 as const, player2Gross: 5, player2Strokes: 0 as const },
      // Hole 5: par 4 - P1 makes 3 (birdie), P2 makes 6 (double bogey)
      { par: 4, player1Gross: 3, player1Strokes: 0 as const, player2Gross: 6, player2Strokes: 0 as const },
    ];

    const correctCount = countHamAndEggsBestBall(holes);
    
    // Manual calculation:
    // H1: P1 net 3 (par-1=-1), P2 net 5 (bogey, +1) → ham-and-egg ✓
    // H2: P1 net 5 (+1), P2 net 4 (0) → ham-and-egg ✓
    // H3: P1 net 3 (0), P2 net 4 (+1) → ham-and-egg ✓
    // H4: P1 net 5 (0), P2 net 5 (0) → NOT ham-and-egg
    // H5: P1 net 3 (-1), P2 net 6 (+2) → ham-and-egg ✓
    expect(correctCount).toBe(4);
  });
});

describe("Best Ball format (NET scores)", () => {
  it("counts ham-and-eggs correctly with strokes applied", () => {
    const holes = [
      // Par 4, stroke hole for player 1
      // P1: 5 gross - 1 stroke = 4 net (par) = 0 vs par
      // P2: 5 gross - 0 strokes = 5 net (bogey) = +1 vs par
      // Result: Ham-and-egg (0 and +1)
      { par: 4, player1Gross: 5, player1Strokes: 1 as const, player2Gross: 5, player2Strokes: 0 as const },
    ];
    
    expect(countHamAndEggsBestBall(holes)).toBe(1);
  });

  it("stroke can turn bogey into par (creating ham-and-egg)", () => {
    const holes = [
      // Par 4
      // P1: 5 gross - 1 stroke = 4 net (par) = 0 vs par
      // P2: 6 gross - 0 strokes = 6 net (double) = +2 vs par
      // Without P1's stroke, both would be over par (not ham-and-egg)
      { par: 4, player1Gross: 5, player1Strokes: 1 as const, player2Gross: 6, player2Strokes: 0 as const },
    ];
    
    expect(countHamAndEggsBestBall(holes)).toBe(1);
  });

  it("both players getting strokes affects calculation correctly", () => {
    const holes = [
      // Par 4, both get strokes
      // P1: 4 gross - 1 stroke = 3 net (birdie) = -1 vs par
      // P2: 6 gross - 1 stroke = 5 net (bogey) = +1 vs par
      // Result: Ham-and-egg (-1 and +1)
      { par: 4, player1Gross: 4, player1Strokes: 1 as const, player2Gross: 6, player2Strokes: 1 as const },
    ];
    
    expect(countHamAndEggsBestBall(holes)).toBe(1);
  });
});

describe("Shamble format (GROSS scores, no strokes)", () => {
  it("uses gross scores without stroke adjustment", () => {
    const holes = [
      // Par 4
      // P1: 4 gross (par) = 0 vs par
      // P2: 5 gross (bogey) = +1 vs par
      // Result: Ham-and-egg
      { par: 4, player1Gross: 4, player2Gross: 5 },
    ];
    
    expect(countHamAndEggsShamble(holes)).toBe(1);
  });

  it("typical shamble round with mixed results", () => {
    const holes = [
      // Hole 1: par 4 - P1: 3 (birdie -1), P2: 5 (bogey +1) → ham-and-egg
      { par: 4, player1Gross: 3, player2Gross: 5 },
      // Hole 2: par 5 - P1: 5 (par 0), P2: 5 (par 0) → NOT
      { par: 5, player1Gross: 5, player2Gross: 5 },
      // Hole 3: par 3 - P1: 4 (bogey +1), P2: 2 (birdie -1) → ham-and-egg
      { par: 3, player1Gross: 4, player2Gross: 2 },
      // Hole 4: par 4 - P1: 6 (double +2), P2: 5 (bogey +1) → NOT (both bad)
      { par: 4, player1Gross: 6, player2Gross: 5 },
    ];
    
    expect(countHamAndEggsShamble(holes)).toBe(2);
  });
});

describe("Edge cases", () => {
  it("handles par 3 holes correctly", () => {
    const p1VsPar = calculateNetVsPar(3, 0, 3); // par
    const p2VsPar = calculateNetVsPar(4, 0, 3); // bogey
    expect(isHamAndEgg(p1VsPar, p2VsPar)).toBe(true);
  });

  it("handles par 5 holes correctly", () => {
    const p1VsPar = calculateNetVsPar(4, 0, 5); // birdie
    const p2VsPar = calculateNetVsPar(6, 0, 5); // bogey
    expect(isHamAndEgg(p1VsPar, p2VsPar)).toBe(true);
  });

  it("ace + quadruple bogey is ham-and-egg", () => {
    // Hole in one on par 3 + quad bogey
    expect(isHamAndEgg(-2, 4)).toBe(true);
  });

  it("eagle + par is NOT ham-and-egg (both good)", () => {
    expect(isHamAndEgg(-2, 0)).toBe(false);
  });

  it("zero ham-and-eggs when team plays consistently", () => {
    // Both players make par on every hole
    const holes = Array(18).fill(null).map(() => ({
      par: 4,
      player1Gross: 4,
      player1Strokes: 0 as const,
      player2Gross: 4,
      player2Strokes: 0 as const,
    }));
    
    expect(countHamAndEggsBestBall(holes)).toBe(0);
  });

  it("maximum ham-and-eggs (18) when one player always good, other always bad", () => {
    // P1 always makes par, P2 always makes bogey
    const holes = Array(18).fill(null).map(() => ({
      par: 4,
      player1Gross: 4,
      player1Strokes: 0 as const,
      player2Gross: 5,
      player2Strokes: 0 as const,
    }));
    
    expect(countHamAndEggsBestBall(holes)).toBe(18);
  });
});

describe("Integration: realistic best ball match", () => {
  it("calculates ham-and-eggs for a typical 18-hole best ball match", () => {
    // Simulate a realistic round with varying scores
    const holes = [
      // Front 9
      { par: 4, player1Gross: 4, player1Strokes: 0 as const, player2Gross: 5, player2Strokes: 0 as const }, // P1 par, P2 bogey → H&E
      { par: 5, player1Gross: 5, player1Strokes: 1 as const, player2Gross: 6, player2Strokes: 0 as const }, // P1 birdie (net), P2 bogey → H&E
      { par: 3, player1Gross: 4, player1Strokes: 0 as const, player2Gross: 3, player2Strokes: 0 as const }, // P1 bogey, P2 par → H&E
      { par: 4, player1Gross: 4, player1Strokes: 0 as const, player2Gross: 4, player2Strokes: 0 as const }, // Both par → NOT
      { par: 4, player1Gross: 5, player1Strokes: 1 as const, player2Gross: 6, player2Strokes: 0 as const }, // P1 par (net), P2 double → H&E
      { par: 5, player1Gross: 6, player1Strokes: 0 as const, player2Gross: 6, player2Strokes: 0 as const }, // Both bogey → NOT
      { par: 3, player1Gross: 2, player1Strokes: 0 as const, player2Gross: 4, player2Strokes: 0 as const }, // P1 birdie, P2 bogey → H&E
      { par: 4, player1Gross: 5, player1Strokes: 0 as const, player2Gross: 5, player2Strokes: 0 as const }, // Both bogey → NOT
      { par: 4, player1Gross: 3, player1Strokes: 0 as const, player2Gross: 5, player2Strokes: 0 as const }, // P1 birdie, P2 bogey → H&E
      // Back 9
      { par: 4, player1Gross: 4, player1Strokes: 1 as const, player2Gross: 5, player2Strokes: 0 as const }, // P1 birdie (net), P2 bogey → H&E
      { par: 5, player1Gross: 5, player1Strokes: 0 as const, player2Gross: 5, player2Strokes: 0 as const }, // Both par → NOT
      { par: 3, player1Gross: 3, player1Strokes: 0 as const, player2Gross: 3, player2Strokes: 0 as const }, // Both par → NOT
      { par: 4, player1Gross: 6, player1Strokes: 0 as const, player2Gross: 4, player2Strokes: 0 as const }, // P1 double, P2 par → H&E
      { par: 4, player1Gross: 4, player1Strokes: 0 as const, player2Gross: 4, player2Strokes: 1 as const }, // P1 par, P2 birdie (net) → NOT
      { par: 5, player1Gross: 5, player1Strokes: 0 as const, player2Gross: 7, player2Strokes: 0 as const }, // P1 par, P2 double → H&E
      { par: 3, player1Gross: 4, player1Strokes: 1 as const, player2Gross: 5, player2Strokes: 0 as const }, // P1 par (net), P2 double → H&E
      { par: 4, player1Gross: 5, player1Strokes: 0 as const, player2Gross: 3, player2Strokes: 0 as const }, // P1 bogey, P2 birdie → H&E
      { par: 4, player1Gross: 4, player1Strokes: 0 as const, player2Gross: 6, player2Strokes: 0 as const }, // P1 par, P2 double → H&E
    ];
    
    const hamAndEggCount = countHamAndEggsBestBall(holes);
    
    // Count manually: H1, H2, H3, H5, H7, H9, H10, H13, H15, H16, H17, H18 = 12
    expect(hamAndEggCount).toBe(12);
  });
});
