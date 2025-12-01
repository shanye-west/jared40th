/**
 * Unit tests for Ham & Egg stat calculation
 * 
 * Ham & Egg Definition:
 * A hole where one teammate scores NET par or better (≤ 0 vs par)
 * AND the other teammate scores NET double bogey or worse (≥ +2 vs par)
 * 
 * This is a high bar - truly rewarding the good player for carrying
 * when their partner really struggled on a hole.
 * 
 * Applies to: twoManBestBall (uses NET scores) and twoManShamble (uses GROSS, which equals NET since no strokes)
 */

import { describe, it, expect } from "vitest";

// --- TEST HELPERS ---

/**
 * Simulates the ham-and-egg calculation for a single hole
 * @param player1NetVsPar - Player 1's NET score relative to par
 * @param player2NetVsPar - Player 2's NET score relative to par
 * @returns true if this hole is a ham-and-egg
 */
function isHamAndEgg(player1NetVsPar: number, player2NetVsPar: number): boolean {
  // Ham & Egg: one player NET <= 0 (par or better) AND other NET >= 2 (double bogey or worse)
  return (
    (player1NetVsPar <= 0 && player2NetVsPar >= 2) ||
    (player2NetVsPar <= 0 && player1NetVsPar >= 2)
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
    const p1NetVsPar = calculateNetVsPar(hole.player1Gross, hole.player1Strokes, hole.par);
    const p2NetVsPar = calculateNetVsPar(hole.player2Gross, hole.player2Strokes, hole.par);
    if (isHamAndEgg(p1NetVsPar, p2NetVsPar)) {
      count++;
    }
  }
  return count;
}

/**
 * Count ham-and-egg holes for shamble format (gross scores only, which = net since no strokes)
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
    const p1VsPar = hole.player1Gross - hole.par;
    const p2VsPar = hole.player2Gross - hole.par;
    if (isHamAndEgg(p1VsPar, p2VsPar)) {
      count++;
    }
  }
  return count;
}

// --- TESTS ---

describe("Ham & Egg single hole detection (NET par + NET double bogey)", () => {
  describe("valid ham-and-egg scenarios", () => {
    it("birdie + double bogey = ham-and-egg", () => {
      expect(isHamAndEgg(-1, 2)).toBe(true);
    });

    it("par + double bogey = ham-and-egg", () => {
      expect(isHamAndEgg(0, 2)).toBe(true);
    });

    it("eagle + double bogey = ham-and-egg", () => {
      expect(isHamAndEgg(-2, 2)).toBe(true);
    });

    it("birdie + triple bogey = ham-and-egg", () => {
      expect(isHamAndEgg(-1, 3)).toBe(true);
    });

    it("par + quad bogey = ham-and-egg", () => {
      expect(isHamAndEgg(0, 4)).toBe(true);
    });

    it("order doesn't matter - double bogey + birdie = ham-and-egg", () => {
      expect(isHamAndEgg(2, -1)).toBe(true);
    });

    it("order doesn't matter - double bogey + par = ham-and-egg", () => {
      expect(isHamAndEgg(2, 0)).toBe(true);
    });
  });

  describe("NOT ham-and-egg: bogey is not enough", () => {
    it("par + bogey = NOT ham-and-egg (bogey is only +1)", () => {
      expect(isHamAndEgg(0, 1)).toBe(false);
    });

    it("birdie + bogey = NOT ham-and-egg", () => {
      expect(isHamAndEgg(-1, 1)).toBe(false);
    });

    it("eagle + bogey = NOT ham-and-egg", () => {
      expect(isHamAndEgg(-2, 1)).toBe(false);
    });
  });

  describe("NOT ham-and-egg: both good or both bad", () => {
    it("birdie + birdie = NOT ham-and-egg", () => {
      expect(isHamAndEgg(-1, -1)).toBe(false);
    });

    it("par + par = NOT ham-and-egg", () => {
      expect(isHamAndEgg(0, 0)).toBe(false);
    });

    it("birdie + par = NOT ham-and-egg", () => {
      expect(isHamAndEgg(-1, 0)).toBe(false);
    });

    it("bogey + bogey = NOT ham-and-egg", () => {
      expect(isHamAndEgg(1, 1)).toBe(false);
    });

    it("bogey + double bogey = NOT ham-and-egg (neither is par or better)", () => {
      expect(isHamAndEgg(1, 2)).toBe(false);
    });

    it("double bogey + triple bogey = NOT ham-and-egg", () => {
      expect(isHamAndEgg(2, 3)).toBe(false);
    });
  });
});

describe("Best Ball format with strokes", () => {
  it("stroke creates net par, partner makes net double bogey = ham-and-egg", () => {
    // P1: gross 5 (bogey) with stroke = net 4 (par) on par 4
    // P2: gross 6 (double) no stroke = net 6 (double) on par 4
    const p1 = calculateNetVsPar(5, 1, 4); // net = 0
    const p2 = calculateNetVsPar(6, 0, 4); // net = +2
    expect(isHamAndEgg(p1, p2)).toBe(true);
  });

  it("stroke creates net par, partner makes net bogey = NOT ham-and-egg", () => {
    // P1: gross 5 (bogey) with stroke = net 4 (par) on par 4
    // P2: gross 5 (bogey) no stroke = net 5 (bogey) on par 4
    const p1 = calculateNetVsPar(5, 1, 4); // net = 0
    const p2 = calculateNetVsPar(5, 0, 4); // net = +1 (only bogey)
    expect(isHamAndEgg(p1, p2)).toBe(false);
  });

  it("stroke on bad player reduces double to bogey = NOT ham-and-egg", () => {
    // P1: gross 4 (par) = net 4 (par) on par 4
    // P2: gross 6 (double) with stroke = net 5 (bogey) on par 4
    const p1 = calculateNetVsPar(4, 0, 4); // net = 0
    const p2 = calculateNetVsPar(6, 1, 4); // net = +1 (stroke saves them!)
    expect(isHamAndEgg(p1, p2)).toBe(false);
  });

  it("stroke on bad player: triple becomes double = ham-and-egg", () => {
    // P1: gross 4 (par) = net 4 (par) on par 4
    // P2: gross 7 (triple) with stroke = net 6 (double) on par 4
    const p1 = calculateNetVsPar(4, 0, 4); // net = 0
    const p2 = calculateNetVsPar(7, 1, 4); // net = +2 (still double)
    expect(isHamAndEgg(p1, p2)).toBe(true);
  });

  it("both have strokes, one makes net birdie, other net double = ham-and-egg", () => {
    // P1: gross 4 (par) with stroke = net 3 (birdie) on par 4
    // P2: gross 7 (triple) with stroke = net 6 (double) on par 4
    const p1 = calculateNetVsPar(4, 1, 4); // net = -1
    const p2 = calculateNetVsPar(7, 1, 4); // net = +2
    expect(isHamAndEgg(p1, p2)).toBe(true);
  });
});

describe("Shamble format (GROSS scores = NET since no strokes)", () => {
  it("gross par + gross double bogey = ham-and-egg", () => {
    expect(isHamAndEgg(0, 2)).toBe(true);
  });

  it("gross birdie + gross double bogey = ham-and-egg", () => {
    expect(isHamAndEgg(-1, 2)).toBe(true);
  });

  it("gross par + gross bogey = NOT ham-and-egg", () => {
    expect(isHamAndEgg(0, 1)).toBe(false);
  });

  it("gross bogey + gross double = NOT ham-and-egg (neither par or better)", () => {
    expect(isHamAndEgg(1, 2)).toBe(false);
  });

  it("typical shamble round with mixed results", () => {
    const holes = [
      { par: 4, player1Gross: 3, player2Gross: 6 }, // birdie + double → H&E
      { par: 5, player1Gross: 5, player2Gross: 6 }, // par + bogey → NOT
      { par: 3, player1Gross: 5, player2Gross: 2 }, // double + birdie → H&E
      { par: 4, player1Gross: 6, player2Gross: 5 }, // double + bogey → NOT (both bad)
      { par: 4, player1Gross: 4, player2Gross: 7 }, // par + triple → H&E
    ];
    
    expect(countHamAndEggsShamble(holes)).toBe(3);
  });
});

describe("Full round counting (Best Ball)", () => {
  it("counts correctly for a round with mixed scenarios", () => {
    const holes = [
      // H1: P1 birdie, P2 double → ham-and-egg
      { par: 4, player1Gross: 3, player1Strokes: 0 as const, player2Gross: 6, player2Strokes: 0 as const },
      // H2: P1 par (via stroke), P2 bogey → NOT (bogey is only +1)
      { par: 4, player1Gross: 5, player1Strokes: 1 as const, player2Gross: 5, player2Strokes: 0 as const },
      // H3: P1 par, P2 par → NOT
      { par: 4, player1Gross: 4, player1Strokes: 0 as const, player2Gross: 4, player2Strokes: 0 as const },
      // H4: P1 par, P2 double → ham-and-egg
      { par: 4, player1Gross: 4, player1Strokes: 0 as const, player2Gross: 6, player2Strokes: 0 as const },
      // H5: P1 bogey, P2 triple → NOT (P1 is not par or better)
      { par: 4, player1Gross: 5, player1Strokes: 0 as const, player2Gross: 7, player2Strokes: 0 as const },
    ];
    
    // H1: ✓, H2: ✗, H3: ✗, H4: ✓, H5: ✗
    expect(countHamAndEggsBestBall(holes)).toBe(2);
  });

  it("typical 18-hole round", () => {
    const holes = [
      // Front 9
      { par: 4, player1Gross: 4, player1Strokes: 0 as const, player2Gross: 6, player2Strokes: 0 as const }, // par + double → H&E
      { par: 5, player1Gross: 5, player1Strokes: 1 as const, player2Gross: 8, player2Strokes: 0 as const }, // net birdie + triple → H&E
      { par: 3, player1Gross: 5, player1Strokes: 0 as const, player2Gross: 3, player2Strokes: 0 as const }, // double + par → H&E
      { par: 4, player1Gross: 4, player1Strokes: 0 as const, player2Gross: 4, player2Strokes: 0 as const }, // par + par → NOT
      { par: 4, player1Gross: 5, player1Strokes: 1 as const, player2Gross: 7, player2Strokes: 0 as const }, // net par + triple → H&E
      { par: 5, player1Gross: 6, player1Strokes: 0 as const, player2Gross: 6, player2Strokes: 0 as const }, // bogey + bogey → NOT
      { par: 3, player1Gross: 2, player1Strokes: 0 as const, player2Gross: 5, player2Strokes: 0 as const }, // birdie + double → H&E
      { par: 4, player1Gross: 5, player1Strokes: 0 as const, player2Gross: 5, player2Strokes: 0 as const }, // bogey + bogey → NOT
      { par: 4, player1Gross: 3, player1Strokes: 0 as const, player2Gross: 6, player2Strokes: 0 as const }, // birdie + double → H&E
      // Back 9
      { par: 4, player1Gross: 5, player1Strokes: 1 as const, player2Gross: 6, player2Strokes: 0 as const }, // net par + double → H&E
      { par: 5, player1Gross: 5, player1Strokes: 0 as const, player2Gross: 5, player2Strokes: 0 as const }, // par + par → NOT
      { par: 3, player1Gross: 3, player1Strokes: 0 as const, player2Gross: 3, player2Strokes: 0 as const }, // par + par → NOT
      { par: 4, player1Gross: 6, player1Strokes: 0 as const, player2Gross: 4, player2Strokes: 0 as const }, // double + par → H&E
      { par: 4, player1Gross: 4, player1Strokes: 0 as const, player2Gross: 5, player2Strokes: 0 as const }, // par + bogey → NOT
      { par: 5, player1Gross: 5, player1Strokes: 0 as const, player2Gross: 8, player2Strokes: 0 as const }, // par + triple → H&E
      { par: 3, player1Gross: 4, player1Strokes: 1 as const, player2Gross: 6, player2Strokes: 0 as const }, // net par + triple → H&E
      { par: 4, player1Gross: 6, player1Strokes: 0 as const, player2Gross: 3, player2Strokes: 0 as const }, // double + birdie → H&E
      { par: 4, player1Gross: 4, player1Strokes: 0 as const, player2Gross: 7, player2Strokes: 0 as const }, // par + triple → H&E
    ];
    
    // Count: H1, H2, H3, H5, H7, H9, H10, H13, H15, H16, H17, H18 = 12
    expect(countHamAndEggsBestBall(holes)).toBe(12);
  });
});

describe("Edge cases", () => {
  it("par 3 hole works correctly", () => {
    const p1 = calculateNetVsPar(3, 0, 3); // par = 0
    const p2 = calculateNetVsPar(5, 0, 3); // double = +2
    expect(isHamAndEgg(p1, p2)).toBe(true);
  });

  it("par 5 hole works correctly", () => {
    const p1 = calculateNetVsPar(4, 0, 5); // birdie = -1
    const p2 = calculateNetVsPar(7, 0, 5); // double = +2
    expect(isHamAndEgg(p1, p2)).toBe(true);
  });

  it("ace on par 3 + quad bogey = ham-and-egg", () => {
    const p1 = calculateNetVsPar(1, 0, 3); // ace = -2
    const p2 = calculateNetVsPar(7, 0, 3); // quad = +4
    expect(isHamAndEgg(p1, p2)).toBe(true);
  });

  it("zero ham-and-eggs when both players always make par", () => {
    const holes = Array(18).fill(null).map(() => ({
      par: 4,
      player1Gross: 4,
      player1Strokes: 0 as const,
      player2Gross: 4,
      player2Strokes: 0 as const,
    }));
    expect(countHamAndEggsBestBall(holes)).toBe(0);
  });

  it("zero ham-and-eggs when partner only makes bogeys (not double)", () => {
    const holes = Array(18).fill(null).map(() => ({
      par: 4,
      player1Gross: 4,
      player1Strokes: 0 as const,
      player2Gross: 5, // Only bogey, not double
      player2Strokes: 0 as const,
    }));
    expect(countHamAndEggsBestBall(holes)).toBe(0);
  });

  it("18 ham-and-eggs when P1 always pars, P2 always doubles", () => {
    const holes = Array(18).fill(null).map(() => ({
      par: 4,
      player1Gross: 4,
      player1Strokes: 0 as const,
      player2Gross: 6, // Double bogey
      player2Strokes: 0 as const,
    }));
    expect(countHamAndEggsBestBall(holes)).toBe(18);
  });
});
