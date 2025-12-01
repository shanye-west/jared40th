import { describe, it, expect } from "vitest";

/**
 * Jekyll & Hyde Badge Test Suite
 * 
 * Definition: If a team's worst ball total - best ball total >= 24, they earn the badge.
 * 
 * For twoManBestBall: Uses NET scores (gross - strokes received)
 * For twoManShamble: Uses GROSS scores (no strokes in shamble)
 * 
 * Example: 
 * - Best ball total = 72 (one birdie, rest pars)
 * - Worst ball total = 96 (averaging +24 vs best ball = +1.33 per hole difference)
 * - Difference = 24 → Jekyll & Hyde = true
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

type HoleScore = {
  player0: number;  // Player 0's score (gross for shamble, or gross before stroke subtraction for bestBall)
  player1: number;  // Player 1's score
  stroke0?: 0 | 1;  // Player 0's stroke on this hole (bestBall only)
  stroke1?: 0 | 1;  // Player 1's stroke on this hole (bestBall only)
};

/**
 * Calculate Jekyll & Hyde for a round (NET scores for bestBall)
 */
function calculateJekyllAndHydeNet(holes: HoleScore[]): { bestBallTotal: number; worstBallTotal: number; isJekyllAndHyde: boolean } {
  let bestBallTotal = 0;
  let worstBallTotal = 0;
  
  for (const hole of holes) {
    const net0 = hole.player0 - (hole.stroke0 || 0);
    const net1 = hole.player1 - (hole.stroke1 || 0);
    bestBallTotal += Math.min(net0, net1);
    worstBallTotal += Math.max(net0, net1);
  }
  
  return {
    bestBallTotal,
    worstBallTotal,
    isJekyllAndHyde: (worstBallTotal - bestBallTotal) >= 24
  };
}

/**
 * Calculate Jekyll & Hyde for a round (GROSS scores for shamble)
 */
function calculateJekyllAndHydeGross(holes: { player0: number; player1: number }[]): { bestBallTotal: number; worstBallTotal: number; isJekyllAndHyde: boolean } {
  let bestBallTotal = 0;
  let worstBallTotal = 0;
  
  for (const hole of holes) {
    bestBallTotal += Math.min(hole.player0, hole.player1);
    worstBallTotal += Math.max(hole.player0, hole.player1);
  }
  
  return {
    bestBallTotal,
    worstBallTotal,
    isJekyllAndHyde: (worstBallTotal - bestBallTotal) >= 24
  };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Jekyll & Hyde badge calculation", () => {
  
  describe("threshold edge cases", () => {
    it("difference of 24 = Jekyll & Hyde (exactly at threshold)", () => {
      // 18 holes where difference is exactly 24 (avg 1.33 per hole)
      // One player always makes 4, other makes 4+1.33 on average
      // Let's make 6 holes with 2-stroke diff, 12 holes with 1-stroke diff = 6*2 + 12*1 = 24
      const holes: HoleScore[] = [];
      for (let i = 0; i < 6; i++) {
        holes.push({ player0: 4, player1: 6 }); // 2-stroke diff
      }
      for (let i = 0; i < 12; i++) {
        holes.push({ player0: 4, player1: 5 }); // 1-stroke diff
      }
      
      const result = calculateJekyllAndHydeNet(holes);
      expect(result.bestBallTotal).toBe(4 * 18); // 72
      expect(result.worstBallTotal).toBe(72 + 24); // 96
      expect(result.isJekyllAndHyde).toBe(true);
    });
    
    it("difference of 23 = NOT Jekyll & Hyde (just under threshold)", () => {
      // 5 holes with 2-stroke diff, 13 holes with 1-stroke diff = 5*2 + 13*1 = 23
      const holes: HoleScore[] = [];
      for (let i = 0; i < 5; i++) {
        holes.push({ player0: 4, player1: 6 }); // 2-stroke diff
      }
      for (let i = 0; i < 13; i++) {
        holes.push({ player0: 4, player1: 5 }); // 1-stroke diff
      }
      
      const result = calculateJekyllAndHydeNet(holes);
      expect(result.worstBallTotal - result.bestBallTotal).toBe(23);
      expect(result.isJekyllAndHyde).toBe(false);
    });
    
    it("difference of 25 = Jekyll & Hyde (above threshold)", () => {
      // 7 holes with 2-stroke diff, 11 holes with 1-stroke diff = 7*2 + 11*1 = 25
      const holes: HoleScore[] = [];
      for (let i = 0; i < 7; i++) {
        holes.push({ player0: 4, player1: 6 }); // 2-stroke diff
      }
      for (let i = 0; i < 11; i++) {
        holes.push({ player0: 4, player1: 5 }); // 1-stroke diff
      }
      
      const result = calculateJekyllAndHydeNet(holes);
      expect(result.worstBallTotal - result.bestBallTotal).toBe(25);
      expect(result.isJekyllAndHyde).toBe(true);
    });
  });
  
  describe("twoManBestBall (NET scores)", () => {
    it("strokes can reduce the gap and prevent Jekyll & Hyde", () => {
      // Player 0: always makes 4
      // Player 1: always makes 6 gross, but gets a stroke on every hole
      // Net difference per hole: 4 vs (6-1)=5 → diff of 1 per hole = 18 total
      const holes: HoleScore[] = [];
      for (let i = 0; i < 18; i++) {
        holes.push({ player0: 4, player1: 6, stroke0: 0, stroke1: 1 });
      }
      
      const result = calculateJekyllAndHydeNet(holes);
      expect(result.bestBallTotal).toBe(72); // 4 * 18
      expect(result.worstBallTotal).toBe(90); // 5 * 18
      expect(result.worstBallTotal - result.bestBallTotal).toBe(18);
      expect(result.isJekyllAndHyde).toBe(false);
    });
    
    it("strokes don't always go to the bad player", () => {
      // Player 0: makes 4, gets a stroke → net 3
      // Player 1: makes 7, no stroke → net 7
      // Diff per hole: 4 (net 3 vs net 7)
      const holes: HoleScore[] = [];
      for (let i = 0; i < 6; i++) {
        holes.push({ player0: 4, player1: 7, stroke0: 1, stroke1: 0 }); // 4-stroke diff
      }
      for (let i = 0; i < 12; i++) {
        holes.push({ player0: 4, player1: 4 }); // 0-stroke diff (both par)
      }
      
      const result = calculateJekyllAndHydeNet(holes);
      // Best: 6*(3) + 12*(4) = 18 + 48 = 66
      // Worst: 6*(7) + 12*(4) = 42 + 48 = 90
      expect(result.bestBallTotal).toBe(66);
      expect(result.worstBallTotal).toBe(90);
      expect(result.worstBallTotal - result.bestBallTotal).toBe(24);
      expect(result.isJekyllAndHyde).toBe(true);
    });
    
    it("realistic scenario: one player struggles on 6 holes with big numbers", () => {
      // Player 0: solid player, makes par (4) on every hole
      // Player 1: struggles badly on 6 holes (makes 8), pars the rest
      const holes: HoleScore[] = [];
      for (let i = 0; i < 6; i++) {
        holes.push({ player0: 4, player1: 8 }); // Quadruple bogey holes
      }
      for (let i = 0; i < 12; i++) {
        holes.push({ player0: 4, player1: 4 }); // Both par
      }
      
      const result = calculateJekyllAndHydeNet(holes);
      // Best: all 4s = 72
      // Worst: 6*(8) + 12*(4) = 48 + 48 = 96
      expect(result.bestBallTotal).toBe(72);
      expect(result.worstBallTotal).toBe(96);
      expect(result.isJekyllAndHyde).toBe(true);
    });
  });
  
  describe("twoManShamble (GROSS scores)", () => {
    it("calculates using gross scores without strokes", () => {
      // In shamble, we just compare gross scores directly
      const holes = [];
      for (let i = 0; i < 18; i++) {
        holes.push({ player0: 4, player1: 6 }); // 2-stroke diff per hole
      }
      
      const result = calculateJekyllAndHydeGross(holes);
      expect(result.bestBallTotal).toBe(72); // 4 * 18
      expect(result.worstBallTotal).toBe(108); // 6 * 18
      expect(result.worstBallTotal - result.bestBallTotal).toBe(36);
      expect(result.isJekyllAndHyde).toBe(true);
    });
    
    it("close match between partners = NOT Jekyll & Hyde", () => {
      // Both players making similar scores
      const holes = [];
      for (let i = 0; i < 18; i++) {
        // Alternating who's better by 1 stroke
        if (i % 2 === 0) {
          holes.push({ player0: 4, player1: 5 });
        } else {
          holes.push({ player0: 5, player1: 4 });
        }
      }
      
      const result = calculateJekyllAndHydeGross(holes);
      // Best: all 4s = 72
      // Worst: all 5s = 90
      expect(result.worstBallTotal - result.bestBallTotal).toBe(18);
      expect(result.isJekyllAndHyde).toBe(false);
    });
  });
  
  describe("realistic round scenarios", () => {
    it("typical Jekyll & Hyde round: one player has a rough day", () => {
      // Player 0: scratch-like round (all pars)
      // Player 1: high handicapper having a bad day (triple average)
      const holes: HoleScore[] = [
        { player0: 4, player1: 7 }, // Triple
        { player0: 4, player1: 5 }, // Bogey
        { player0: 3, player1: 6 }, // Triple
        { player0: 4, player1: 8 }, // Quad
        { player0: 5, player1: 5 }, // Both par
        { player0: 4, player1: 7 }, // Triple
        { player0: 4, player1: 6 }, // Double
        { player0: 3, player1: 5 }, // Double
        { player0: 5, player1: 6 }, // Bogey
        { player0: 4, player1: 8 }, // Quad
        { player0: 4, player1: 5 }, // Bogey
        { player0: 4, player1: 7 }, // Triple
        { player0: 5, player1: 6 }, // Bogey
        { player0: 3, player1: 6 }, // Triple
        { player0: 4, player1: 5 }, // Bogey
        { player0: 4, player1: 7 }, // Triple
        { player0: 4, player1: 6 }, // Double
        { player0: 5, player1: 8 }, // Triple
      ];
      
      const result = calculateJekyllAndHydeNet(holes);
      // Player 0 total: 72 (par)
      // Player 1 total: 113 (rough day)
      // Best ball: 72, Worst ball: 113
      expect(result.isJekyllAndHyde).toBe(true);
    });
    
    it("solid partnership: no Jekyll & Hyde", () => {
      // Both players playing consistent, similar golf
      const holes: HoleScore[] = [
        { player0: 4, player1: 5 }, { player0: 5, player1: 4 },
        { player0: 4, player1: 4 }, { player0: 3, player1: 4 },
        { player0: 5, player1: 5 }, { player0: 4, player1: 5 },
        { player0: 4, player1: 4 }, { player0: 4, player1: 3 },
        { player0: 5, player1: 6 }, { player0: 4, player1: 4 },
        { player0: 4, player1: 5 }, { player0: 5, player1: 4 },
        { player0: 4, player1: 4 }, { player0: 3, player1: 4 },
        { player0: 5, player1: 5 }, { player0: 4, player1: 5 },
        { player0: 4, player1: 4 }, { player0: 4, player1: 4 },
      ];
      
      const result = calculateJekyllAndHydeNet(holes);
      // Close partnership - difference should be small
      expect(result.isJekyllAndHyde).toBe(false);
    });
    
    it("no difference when both players score identically every hole", () => {
      const holes: HoleScore[] = [];
      for (let i = 0; i < 18; i++) {
        holes.push({ player0: 4, player1: 4 });
      }
      
      const result = calculateJekyllAndHydeNet(holes);
      expect(result.bestBallTotal).toBe(72);
      expect(result.worstBallTotal).toBe(72);
      expect(result.worstBallTotal - result.bestBallTotal).toBe(0);
      expect(result.isJekyllAndHyde).toBe(false);
    });
  });
  
  describe("extreme cases", () => {
    it("maximum possible gap: one player aces, other quadruples every hole", () => {
      // Extreme (unrealistic) scenario
      const holes: HoleScore[] = [];
      for (let i = 0; i < 18; i++) {
        holes.push({ player0: 1, player1: 8 }); // Ace vs quad bogey
      }
      
      const result = calculateJekyllAndHydeNet(holes);
      expect(result.bestBallTotal).toBe(18); // All aces
      expect(result.worstBallTotal).toBe(144); // All 8s
      expect(result.worstBallTotal - result.bestBallTotal).toBe(126);
      expect(result.isJekyllAndHyde).toBe(true);
    });
  });
});
