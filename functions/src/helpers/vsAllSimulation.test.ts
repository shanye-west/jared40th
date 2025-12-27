/**
 * Tests for vsAll simulation
 * Tests course handicap calculation, strokes spin-down, match winner determination,
 * and format-specific scoring (singles/bestBall use net, shamble/scramble use gross)
 */

import { describe, it, expect } from "vitest";
import {
  simulateHeadToHead,
  computeVsAllForRound,
  type PlayerFactForSim,
  type CourseHoleInfo,
} from "./vsAllSimulation.js";
import { calculateCourseHandicap, calculateStrokesReceived } from "../ghin.js";
import type { RoundFormat } from "../types.js";

// Test course data (realistic course setup)
const TEST_SLOPE_RATING = 130;
const TEST_COURSE_RATING = 72.5;
const TEST_COURSE_PAR = 72;

const TEST_COURSE_HOLES: CourseHoleInfo[] = [
  { number: 1, par: 4, hcpIndex: 5 },
  { number: 2, par: 3, hcpIndex: 17 },
  { number: 3, par: 5, hcpIndex: 3 },
  { number: 4, par: 4, hcpIndex: 11 },
  { number: 5, par: 4, hcpIndex: 7 },
  { number: 6, par: 4, hcpIndex: 9 },
  { number: 7, par: 3, hcpIndex: 15 },
  { number: 8, par: 5, hcpIndex: 1 },
  { number: 9, par: 4, hcpIndex: 13 },
  { number: 10, par: 4, hcpIndex: 6 },
  { number: 11, par: 3, hcpIndex: 18 },
  { number: 12, par: 5, hcpIndex: 2 },
  { number: 13, par: 4, hcpIndex: 10 },
  { number: 14, par: 4, hcpIndex: 8 },
  { number: 15, par: 3, hcpIndex: 16 },
  { number: 16, par: 4, hcpIndex: 12 },
  { number: 17, par: 5, hcpIndex: 4 },
  { number: 18, par: 4, hcpIndex: 14 },
];

describe("Course Handicap Calculation", () => {
  it("calculates course handicap using GHIN formula correctly", () => {
    // Formula: (handicapIndex × (slopeRating ÷ 113)) + (courseRating − par)
    // Example: HI=10.5, Slope=130, Rating=72.5, Par=72
    // Expected: (10.5 × (130 ÷ 113)) + (72.5 - 72) = (10.5 × 1.15044...) + 0.5 = 12.08 + 0.5 = 12.58 → rounds to 13

    const handicapIndex = 10.5;
    const result = calculateCourseHandicap(
      handicapIndex,
      TEST_SLOPE_RATING,
      TEST_COURSE_RATING,
      TEST_COURSE_PAR
    );

    // Manual calculation:
    // (10.5 * (130 / 113)) + (72.5 - 72) = 12.079... + 0.5 = 12.579 → rounds to 13
    expect(result).toBe(13);
  });

  it("handles zero handicap index", () => {
    const result = calculateCourseHandicap(0, TEST_SLOPE_RATING, TEST_COURSE_RATING, TEST_COURSE_PAR);
    // (0 × 1.15) + 0.5 = 0.5 → rounds to 1
    expect(result).toBe(1);
  });

  it("handles negative handicap index (plus handicapper)", () => {
    const result = calculateCourseHandicap(-2.0, TEST_SLOPE_RATING, TEST_COURSE_RATING, TEST_COURSE_PAR);
    // (-2 × 1.15) + 0.5 = -2.3 + 0.5 = -1.8 → rounds to -2
    expect(result).toBe(-2);
  });

  it("handles high handicap index", () => {
    const result = calculateCourseHandicap(25.0, TEST_SLOPE_RATING, TEST_COURSE_RATING, TEST_COURSE_PAR);
    // (25 × 1.15) + 0.5 = 28.75 + 0.5 = 29.25 → rounds to 29
    expect(result).toBe(29);
  });

  it("uses correct course rating in formula", () => {
    // Test that course rating affects the calculation
    const handicapIndex = 10.0;
    
    // With rating = 72.5, par = 72: adjustment = +0.5
    const result1 = calculateCourseHandicap(handicapIndex, 113, 72.5, 72);
    // (10 × 1) + 0.5 = 10.5 → rounds to 11
    expect(result1).toBe(11);

    // With rating = 71.0, par = 72: adjustment = -1.0
    const result2 = calculateCourseHandicap(handicapIndex, 113, 71.0, 72);
    // (10 × 1) - 1 = 9 → rounds to 9
    expect(result2).toBe(9);

    // With rating = 74.0, par = 72: adjustment = +2.0
    const result3 = calculateCourseHandicap(handicapIndex, 113, 74.0, 72);
    // (10 × 1) + 2 = 12 → rounds to 12
    expect(result3).toBe(12);
  });
});

describe("Strokes Received Calculation", () => {
  it("assigns strokes to holes by difficulty (hcpIndex)", () => {
    const courseHandicap = 5;
    const strokes = calculateStrokesReceived(courseHandicap, TEST_COURSE_HOLES);

    // Should get 5 strokes on the 5 hardest holes (hcpIndex 1-5)
    expect(strokes.length).toBe(18);
    expect(strokes.filter(s => s === 1).length).toBe(5);

    // Check specific holes receive strokes (hcpIndex 1-5)
    // Hole 8 (hcpIndex 1), Hole 12 (hcpIndex 2), Hole 3 (hcpIndex 3), 
    // Hole 17 (hcpIndex 4), Hole 1 (hcpIndex 5)
    expect(strokes[7]).toBe(1);  // Hole 8 (index 7)
    expect(strokes[11]).toBe(1); // Hole 12 (index 11)
    expect(strokes[2]).toBe(1);  // Hole 3 (index 2)
    expect(strokes[16]).toBe(1); // Hole 17 (index 16)
    expect(strokes[0]).toBe(1);  // Hole 1 (index 0)
  });

  it("caps strokes at 18 (one per hole maximum)", () => {
    const courseHandicap = 25; // More than 18
    const strokes = calculateStrokesReceived(courseHandicap, TEST_COURSE_HOLES);

    expect(strokes.length).toBe(18);
    expect(strokes.filter(s => s === 1).length).toBe(18); // All holes get 1 stroke
    expect(strokes.every(s => s === 1)).toBe(true);
  });

  it("handles zero course handicap", () => {
    const courseHandicap = 0;
    const strokes = calculateStrokesReceived(courseHandicap, TEST_COURSE_HOLES);

    expect(strokes.length).toBe(18);
    expect(strokes.every(s => s === 0)).toBe(true);
  });

  it("handles negative course handicap (no strokes)", () => {
    const courseHandicap = -3;
    const strokes = calculateStrokesReceived(courseHandicap, TEST_COURSE_HOLES);

    expect(strokes.length).toBe(18);
    expect(strokes.every(s => s === 0)).toBe(true);
  });
});

describe("Strokes Spin-Down", () => {
  it("spins down strokes to lowest course handicap in singles match", () => {
    // Player A: HI = 10.5 → CH = 13
    // Player B: HI = 5.0 → CH = 6 (rounded from 6.26)
    // Spin down: A gets 13-6=7, B gets 0

    const playerA: PlayerFactForSim = {
      playerId: "playerA",
      playerName: "Player A",
      playerHandicap: 10.5,
      team: "teamA",
      holePerformance: Array.from({ length: 18 }, (_, i) => ({
        hole: i + 1,
        gross: 5,
        net: 5,
        par: 4,
      })),
    };

    const playerB: PlayerFactForSim = {
      playerId: "playerB",
      playerName: "Player B",
      playerHandicap: 5.0,
      team: "teamB",
      holePerformance: Array.from({ length: 18 }, (_, i) => ({
        hole: i + 1,
        gross: 5,
        net: 5,
        par: 4,
      })),
    };

    // Manually verify spin-down
    const chA = calculateCourseHandicap(10.5, TEST_SLOPE_RATING, TEST_COURSE_RATING, TEST_COURSE_PAR);
    const chB = calculateCourseHandicap(5.0, TEST_SLOPE_RATING, TEST_COURSE_RATING, TEST_COURSE_PAR);
    
    expect(chA).toBe(13);
    expect(chB).toBe(6);

    const lowestCH = Math.min(chA, chB);
    const adjustedA = chA - lowestCH; // 13 - 6 = 7
    const adjustedB = chB - lowestCH; // 6 - 6 = 0

    expect(adjustedA).toBe(7);
    expect(adjustedB).toBe(0);

    const strokesA = calculateStrokesReceived(adjustedA, TEST_COURSE_HOLES);
    const strokesB = calculateStrokesReceived(adjustedB, TEST_COURSE_HOLES);

    expect(strokesA.filter(s => s === 1).length).toBe(7);
    expect(strokesB.every(s => s === 0)).toBe(true);
  });

  it("results in zero strokes for both players if equal course handicaps", () => {
    const chA = calculateCourseHandicap(10.0, TEST_SLOPE_RATING, TEST_COURSE_RATING, TEST_COURSE_PAR);
    const chB = calculateCourseHandicap(10.0, TEST_SLOPE_RATING, TEST_COURSE_RATING, TEST_COURSE_PAR);

    const lowestCH = Math.min(chA, chB);
    const adjustedA = chA - lowestCH;
    const adjustedB = chB - lowestCH;

    expect(adjustedA).toBe(0);
    expect(adjustedB).toBe(0);

    const strokesA = calculateStrokesReceived(adjustedA, TEST_COURSE_HOLES);
    const strokesB = calculateStrokesReceived(adjustedB, TEST_COURSE_HOLES);

    expect(strokesA.every(s => s === 0)).toBe(true);
    expect(strokesB.every(s => s === 0)).toBe(true);
  });

  it("applies spin-down with plus handicapper (negative HI)", () => {
    // Player A: HI = 5.0 → CH = 6
    // Player B: HI = -2.0 → CH = -2
    // Spin down: A gets 6-(-2)=8, B gets 0

    const chA = calculateCourseHandicap(5.0, TEST_SLOPE_RATING, TEST_COURSE_RATING, TEST_COURSE_PAR);
    const chB = calculateCourseHandicap(-2.0, TEST_SLOPE_RATING, TEST_COURSE_RATING, TEST_COURSE_PAR);

    expect(chA).toBe(6);
    expect(chB).toBe(-2);

    const lowestCH = Math.min(chA, chB);
    expect(lowestCH).toBe(-2);

    const adjustedA = chA - lowestCH; // 6 - (-2) = 8
    const adjustedB = chB - lowestCH; // -2 - (-2) = 0

    expect(adjustedA).toBe(8);
    expect(adjustedB).toBe(0);

    const strokesA = calculateStrokesReceived(adjustedA, TEST_COURSE_HOLES);
    const strokesB = calculateStrokesReceived(adjustedB, TEST_COURSE_HOLES);

    expect(strokesA.filter(s => s === 1).length).toBe(8);
    expect(strokesB.every(s => s === 0)).toBe(true);
  });
});

describe("Match Winner Determination - Singles Format", () => {
  it("determines winner based on NET scores with spun-down strokes", () => {
    // Player A: HI = 10.5 → CH = 13
    // Player B: HI = 5.0 → CH = 6
    // After spin-down: A gets 7 strokes, B gets 0

    const playerA: PlayerFactForSim = {
      playerId: "playerA",
      playerName: "Player A",
      playerHandicap: 10.5,
      team: "teamA",
      holePerformance: [
        { hole: 1, gross: 5, net: 4, par: 4 }, // A gets stroke on hole 1 (hcpIndex 5): net=4, B net=5 → A wins
        { hole: 2, gross: 4, net: 4, par: 3 }, // No strokes: both net=4 → AS
        { hole: 3, gross: 6, net: 5, par: 5 }, // A gets stroke: net=5, B net=5 → AS
      ],
    };

    const playerB: PlayerFactForSim = {
      playerId: "playerB",
      playerName: "Player B",
      playerHandicap: 5.0,
      team: "teamB",
      holePerformance: [
        { hole: 1, gross: 5, net: 5, par: 4 },
        { hole: 2, gross: 4, net: 4, par: 3 },
        { hole: 3, gross: 5, net: 5, par: 5 },
      ],
    };

    const result = simulateHeadToHead(
      playerA,
      playerB,
      TEST_COURSE_HOLES,
      "singles",
      TEST_SLOPE_RATING,
      TEST_COURSE_RATING,
      TEST_COURSE_PAR
    );

    expect(result.holesWonA).toBe(1);
    expect(result.holesWonB).toBe(0);
    expect(result.winner).toBe("A");
  });

  it("handles ties in singles format", () => {
    const playerA: PlayerFactForSim = {
      playerId: "playerA",
      playerName: "Player A",
      playerHandicap: 10.0,
      team: "teamA",
      holePerformance: [
        { hole: 1, gross: 5, net: 5, par: 4 },
        { hole: 2, gross: 4, net: 4, par: 3 },
      ],
    };

    const playerB: PlayerFactForSim = {
      playerId: "playerB",
      playerName: "Player B",
      playerHandicap: 10.0,
      team: "teamB",
      holePerformance: [
        { hole: 1, gross: 5, net: 5, par: 4 },
        { hole: 2, gross: 4, net: 4, par: 3 },
      ],
    };

    const result = simulateHeadToHead(
      playerA,
      playerB,
      TEST_COURSE_HOLES,
      "singles",
      TEST_SLOPE_RATING,
      TEST_COURSE_RATING,
      TEST_COURSE_PAR
    );

    expect(result.holesWonA).toBe(0);
    expect(result.holesWonB).toBe(0);
    expect(result.winner).toBe("tie");
  });

  it("stops calculating when match is mathematically decided", () => {
    // Player A wins 5 holes, B wins 0, with 3 holes remaining → match closed
    const playerA: PlayerFactForSim = {
      playerId: "playerA",
      playerName: "Player A",
      playerHandicap: 5.0,
      team: "teamA",
      holePerformance: Array.from({ length: 18 }, (_, i) => ({
        hole: i + 1,
        gross: 4,
        net: 4,
        par: 4,
      })),
    };

    const playerB: PlayerFactForSim = {
      playerId: "playerB",
      playerName: "Player B",
      playerHandicap: 5.0,
      team: "teamB",
      holePerformance: [
        ...Array.from({ length: 5 }, (_, i) => ({
          hole: i + 1,
          gross: 6,
          net: 6,
          par: 4,
        })),
        ...Array.from({ length: 13 }, (_, i) => ({
          hole: i + 6,
          gross: 4,
          net: 4,
          par: 4,
        })),
      ],
    };

    const result = simulateHeadToHead(
      playerA,
      playerB,
      TEST_COURSE_HOLES,
      "singles",
      TEST_SLOPE_RATING,
      TEST_COURSE_RATING,
      TEST_COURSE_PAR
    );

    // After 15 holes: A=5, B=0, margin=5, holes left=3 → match decided
    expect(result.holesWonA).toBe(5);
    expect(result.holesWonB).toBe(0);
    expect(result.winner).toBe("A");
  });
});

describe("Match Winner Determination - Best Ball Format", () => {
  it("uses NET scores with strokes for best ball format", () => {
    // Both players get strokes based on their individual handicaps (spun down)
    const playerA: PlayerFactForSim = {
      playerId: "playerA",
      playerName: "Player A",
      playerHandicap: 15.0,
      team: "teamA",
      holePerformance: [
        { hole: 1, gross: 5, net: 4, par: 4 }, // Hole 1 gets stroke: net=4
        { hole: 2, gross: 4, net: 4, par: 3 }, // No stroke: net=4
        { hole: 3, gross: 6, net: 5, par: 5 }, // Hole 3 gets stroke: net=5
      ],
    };

    const playerB: PlayerFactForSim = {
      playerId: "playerB",
      playerName: "Player B",
      playerHandicap: 8.0,
      team: "teamB",
      holePerformance: [
        { hole: 1, gross: 5, net: 5, par: 4 },
        { hole: 2, gross: 3, net: 3, par: 3 },
        { hole: 3, gross: 6, net: 6, par: 5 },
      ],
    };

    const result = simulateHeadToHead(
      playerA,
      playerB,
      TEST_COURSE_HOLES,
      "twoManBestBall",
      TEST_SLOPE_RATING,
      TEST_COURSE_RATING,
      TEST_COURSE_PAR
    );

    // Hole 1: A net=4, B net=5 → A wins
    // Hole 2: A net=4, B net=3 → B wins
    // Hole 3: A net=5, B net=6 → A wins
    expect(result.holesWonA).toBe(2);
    expect(result.holesWonB).toBe(1);
    expect(result.winner).toBe("A");
  });
});

describe("Match Winner Determination - Shamble Format", () => {
  it("uses GROSS scores (no handicap) for shamble format", () => {
    // Shamble uses gross scoring only, no strokes
    const playerA: PlayerFactForSim = {
      playerId: "playerA",
      playerName: "Player A",
      playerHandicap: 15.0, // Handicap should NOT affect shamble scoring
      team: "teamA",
      holePerformance: [
        { hole: 1, gross: 4, par: 4 },
        { hole: 2, gross: 5, par: 3 },
        { hole: 3, gross: 5, par: 5 },
      ],
    };

    const playerB: PlayerFactForSim = {
      playerId: "playerB",
      playerName: "Player B",
      playerHandicap: 5.0, // Lower handicap but shouldn't matter
      team: "teamB",
      holePerformance: [
        { hole: 1, gross: 5, par: 4 },
        { hole: 2, gross: 4, par: 3 },
        { hole: 3, gross: 5, par: 5 },
      ],
    };

    const result = simulateHeadToHead(
      playerA,
      playerB,
      TEST_COURSE_HOLES,
      "twoManShamble",
      TEST_SLOPE_RATING,
      TEST_COURSE_RATING,
      TEST_COURSE_PAR
    );

    // Hole 1: A=4, B=5 → A wins
    // Hole 2: A=5, B=4 → B wins
    // Hole 3: A=5, B=5 → tie
    expect(result.holesWonA).toBe(1);
    expect(result.holesWonB).toBe(1);
    expect(result.winner).toBe("tie");
  });

  it("ignores handicap differences in shamble format", () => {
    // High handicapper should not get strokes in shamble
    const highHandicap: PlayerFactForSim = {
      playerId: "highHI",
      playerName: "High HI",
      playerHandicap: 25.0,
      team: "teamA",
      holePerformance: [
        { hole: 1, gross: 6, par: 4 },
      ],
    };

    const lowHandicap: PlayerFactForSim = {
      playerId: "lowHI",
      playerName: "Low HI",
      playerHandicap: 2.0,
      team: "teamB",
      holePerformance: [
        { hole: 1, gross: 5, par: 4 },
      ],
    };

    const result = simulateHeadToHead(
      highHandicap,
      lowHandicap,
      TEST_COURSE_HOLES,
      "twoManShamble",
      TEST_SLOPE_RATING,
      TEST_COURSE_RATING,
      TEST_COURSE_PAR
    );

    // Even with 23 stroke difference, low handicapper wins on gross
    expect(result.holesWonA).toBe(0);
    expect(result.holesWonB).toBe(1);
    expect(result.winner).toBe("B");
  });
});

describe("Match Winner Determination - Scramble Format", () => {
  it("uses GROSS scores (no handicap) for scramble format", () => {
    const playerA: PlayerFactForSim = {
      playerId: "playerA",
      playerName: "Player A",
      playerHandicap: 18.0,
      team: "teamA",
      holePerformance: [
        { hole: 1, gross: 4, par: 4 },
        { hole: 2, gross: 3, par: 3 },
        { hole: 3, gross: 6, par: 5 },
      ],
    };

    const playerB: PlayerFactForSim = {
      playerId: "playerB",
      playerName: "Player B",
      playerHandicap: 3.0,
      team: "teamB",
      holePerformance: [
        { hole: 1, gross: 5, par: 4 },
        { hole: 2, gross: 3, par: 3 },
        { hole: 3, gross: 5, par: 5 },
      ],
    };

    const result = simulateHeadToHead(
      playerA,
      playerB,
      TEST_COURSE_HOLES,
      "twoManScramble",
      TEST_SLOPE_RATING,
      TEST_COURSE_RATING,
      TEST_COURSE_PAR
    );

    // Hole 1: A=4, B=5 → A wins
    // Hole 2: A=3, B=3 → tie
    // Hole 3: A=6, B=5 → B wins
    expect(result.holesWonA).toBe(1);
    expect(result.holesWonB).toBe(1);
    expect(result.winner).toBe("tie");
  });
});

describe("computeVsAllForRound - Singles Format", () => {
  it("simulates all players vs all other players", () => {
    const players: PlayerFactForSim[] = [
      {
        playerId: "p1",
        playerName: "Player 1",
        playerHandicap: 10.0,
        team: "teamA",
        holePerformance: Array.from({ length: 18 }, (_, i) => ({
          hole: i + 1,
          gross: 4,
          net: 4,
          par: 4,
        })),
      },
      {
        playerId: "p2",
        playerName: "Player 2",
        playerHandicap: 15.0,
        team: "teamB",
        holePerformance: Array.from({ length: 18 }, (_, i) => ({
          hole: i + 1,
          gross: 5,
          net: 5,
          par: 4,
        })),
      },
      {
        playerId: "p3",
        playerName: "Player 3",
        playerHandicap: 8.0,
        team: "teamA",
        holePerformance: Array.from({ length: 18 }, (_, i) => ({
          hole: i + 1,
          gross: 4,
          net: 4,
          par: 4,
        })),
      },
    ];

    const results = computeVsAllForRound(
      players,
      TEST_COURSE_HOLES,
      "singles",
      TEST_SLOPE_RATING,
      TEST_COURSE_RATING,
      TEST_COURSE_PAR
    );

    // Should have 3 records (one per player)
    expect(results.length).toBe(3);

    // Each player plays 2 matches (vs the other 2 players)
    results.forEach(record => {
      const totalMatches = record.wins + record.losses + record.ties;
      expect(totalMatches).toBe(2);
    });

    // Player 1 (HI=10) and Player 3 (HI=8) both shoot 4s
    // P1 CH=12, P3 CH=10 (lowest), after spin-down: P1 gets 2 strokes, P3 gets 0
    // So P1 will actually win with net scores even though gross is same
    const p1Record = results.find(r => r.playerId === "p1");
    const p3Record = results.find(r => r.playerId === "p3");
    
    expect(p1Record).toBeDefined();
    expect(p3Record).toBeDefined();
    
    // P1 vs P2: P1 wins (4 vs 5 gross, plus P1 gets more strokes)
    // P1 vs P3: P1 wins (both 4 gross, but P1 gets 2 strokes vs P3's 0)
    expect(p1Record!.wins).toBe(2);
    expect(p1Record!.losses).toBe(0);
    expect(p1Record!.ties).toBe(0);

    // P2 should lose to both others
    const p2Record = results.find(r => r.playerId === "p2");
    expect(p2Record!.wins).toBe(0);
    expect(p2Record!.losses).toBe(2);
    expect(p2Record!.ties).toBe(0);
    
    // P3 should beat P2 but lose to P1
    expect(p3Record!.wins).toBe(1);
    expect(p3Record!.losses).toBe(1);
    expect(p3Record!.ties).toBe(0);
  });
});

describe("computeVsAllForRound - Team Formats", () => {
  it("groups players by team and simulates team vs team", () => {
    // Create 4 players forming 2 teams of 2
    const players: PlayerFactForSim[] = [
      {
        playerId: "p1",
        playerName: "Player 1",
        playerHandicap: 10.0,
        team: "teamA",
        partnerIds: ["p2"],
        holePerformance: Array.from({ length: 18 }, (_, i) => ({
          hole: i + 1,
          gross: 4,
          par: 4,
        })),
      },
      {
        playerId: "p2",
        playerName: "Player 2",
        playerHandicap: 12.0,
        team: "teamA",
        partnerIds: ["p1"],
        holePerformance: Array.from({ length: 18 }, (_, i) => ({
          hole: i + 1,
          gross: 4,
          par: 4,
        })),
      },
      {
        playerId: "p3",
        playerName: "Player 3",
        playerHandicap: 8.0,
        team: "teamB",
        partnerIds: ["p4"],
        holePerformance: Array.from({ length: 18 }, (_, i) => ({
          hole: i + 1,
          gross: 5,
          par: 4,
        })),
      },
      {
        playerId: "p4",
        playerName: "Player 4",
        playerHandicap: 15.0,
        team: "teamB",
        partnerIds: ["p3"],
        holePerformance: Array.from({ length: 18 }, (_, i) => ({
          hole: i + 1,
          gross: 5,
          par: 4,
        })),
      },
    ];

    const results = computeVsAllForRound(
      players,
      TEST_COURSE_HOLES,
      "twoManBestBall",
      TEST_SLOPE_RATING,
      TEST_COURSE_RATING,
      TEST_COURSE_PAR
    );

    // Should have 4 records (2 per team, sharing same W-L-T)
    expect(results.length).toBe(4);

    // Each team only plays 1 match (vs the other team)
    results.forEach(record => {
      const totalMatches = record.wins + record.losses + record.ties;
      expect(totalMatches).toBe(1);
    });

    // All members of same team should have same teamKey
    const p1Record = results.find(r => r.playerId === "p1");
    const p2Record = results.find(r => r.playerId === "p2");
    expect(p1Record!.teamKey).toBe(p2Record!.teamKey);

    const p3Record = results.find(r => r.playerId === "p3");
    const p4Record = results.find(r => r.playerId === "p4");
    expect(p3Record!.teamKey).toBe(p4Record!.teamKey);

    // Team 1 (p1+p2) shoots 4s, Team 2 (p3+p4) shoots 5s → Team 1 wins
    expect(p1Record!.wins).toBe(1);
    expect(p1Record!.losses).toBe(0);
    expect(p2Record!.wins).toBe(1);
    expect(p2Record!.losses).toBe(0);

    expect(p3Record!.wins).toBe(0);
    expect(p3Record!.losses).toBe(1);
    expect(p4Record!.wins).toBe(0);
    expect(p4Record!.losses).toBe(1);
  });

  it("simulates multiple teams correctly", () => {
    // 6 players = 3 teams of 2
    const players: PlayerFactForSim[] = [
      // Team 1: shoots 4s
      {
        playerId: "t1p1",
        playerName: "Team 1 Player 1",
        playerHandicap: 10.0,
        team: "teamA",
        partnerIds: ["t1p2"],
        holePerformance: Array.from({ length: 18 }, (_, i) => ({
          hole: i + 1,
          gross: 4,
          par: 4,
        })),
      },
      {
        playerId: "t1p2",
        playerName: "Team 1 Player 2",
        playerHandicap: 10.0,
        team: "teamA",
        partnerIds: ["t1p1"],
        holePerformance: Array.from({ length: 18 }, (_, i) => ({
          hole: i + 1,
          gross: 4,
          par: 4,
        })),
      },
      // Team 2: shoots 5s
      {
        playerId: "t2p1",
        playerName: "Team 2 Player 1",
        playerHandicap: 12.0,
        team: "teamB",
        partnerIds: ["t2p2"],
        holePerformance: Array.from({ length: 18 }, (_, i) => ({
          hole: i + 1,
          gross: 5,
          par: 4,
        })),
      },
      {
        playerId: "t2p2",
        playerName: "Team 2 Player 2",
        playerHandicap: 12.0,
        team: "teamB",
        partnerIds: ["t2p1"],
        holePerformance: Array.from({ length: 18 }, (_, i) => ({
          hole: i + 1,
          gross: 5,
          par: 4,
        })),
      },
      // Team 3: shoots 6s
      {
        playerId: "t3p1",
        playerName: "Team 3 Player 1",
        playerHandicap: 15.0,
        team: "teamA",
        partnerIds: ["t3p2"],
        holePerformance: Array.from({ length: 18 }, (_, i) => ({
          hole: i + 1,
          gross: 6,
          par: 4,
        })),
      },
      {
        playerId: "t3p2",
        playerName: "Team 3 Player 2",
        playerHandicap: 15.0,
        team: "teamA",
        partnerIds: ["t3p1"],
        holePerformance: Array.from({ length: 18 }, (_, i) => ({
          hole: i + 1,
          gross: 6,
          par: 4,
        })),
      },
    ];

    const results = computeVsAllForRound(
      players,
      TEST_COURSE_HOLES,
      "twoManShamble",
      TEST_SLOPE_RATING,
      TEST_COURSE_RATING,
      TEST_COURSE_PAR
    );

    // Should have 6 records
    expect(results.length).toBe(6);

    // Each team plays 2 matches (vs the other 2 teams)
    results.forEach(record => {
      const totalMatches = record.wins + record.losses + record.ties;
      expect(totalMatches).toBe(2);
    });

    // Team 1 (shoots 4s) should beat both other teams: 2-0-0
    const t1Records = results.filter(r => r.playerId.startsWith("t1"));
    expect(t1Records.length).toBe(2);
    t1Records.forEach(record => {
      expect(record.wins).toBe(2);
      expect(record.losses).toBe(0);
      expect(record.ties).toBe(0);
    });

    // Team 3 (shoots 6s) should lose to both other teams: 0-2-0
    const t3Records = results.filter(r => r.playerId.startsWith("t3"));
    expect(t3Records.length).toBe(2);
    t3Records.forEach(record => {
      expect(record.wins).toBe(0);
      expect(record.losses).toBe(2);
      expect(record.ties).toBe(0);
    });

    // Team 2 (shoots 5s) should win 1, lose 1: 1-1-0
    const t2Records = results.filter(r => r.playerId.startsWith("t2"));
    expect(t2Records.length).toBe(2);
    t2Records.forEach(record => {
      expect(record.wins).toBe(1);
      expect(record.losses).toBe(1);
      expect(record.ties).toBe(0);
    });
  });
});

describe("Edge Cases and Validation", () => {
  it("handles missing hole scores gracefully", () => {
    const playerA: PlayerFactForSim = {
      playerId: "playerA",
      playerName: "Player A",
      playerHandicap: 10.0,
      team: "teamA",
      holePerformance: [
        { hole: 1, gross: 4, par: 4 },
        { hole: 2, gross: null, par: 3 }, // Missing score
        { hole: 3, gross: 5, par: 5 },
      ],
    };

    const playerB: PlayerFactForSim = {
      playerId: "playerB",
      playerName: "Player B",
      playerHandicap: 10.0,
      team: "teamB",
      holePerformance: [
        { hole: 1, gross: 5, par: 4 },
        { hole: 2, gross: 3, par: 3 },
        { hole: 3, gross: 5, par: 5 },
      ],
    };

    const result = simulateHeadToHead(
      playerA,
      playerB,
      TEST_COURSE_HOLES,
      "singles",
      TEST_SLOPE_RATING,
      TEST_COURSE_RATING,
      TEST_COURSE_PAR
    );

    // Hole 2 is skipped, only holes 1 and 3 count
    expect(result.holesWonA).toBe(1); // Hole 1: A=4, B=5
    expect(result.holesWonB).toBe(0);
    expect(result.winner).toBe("A");
  });

  it("handles all scores missing", () => {
    const playerA: PlayerFactForSim = {
      playerId: "playerA",
      playerName: "Player A",
      playerHandicap: 10.0,
      team: "teamA",
      holePerformance: [
        { hole: 1, gross: null, par: 4 },
        { hole: 2, gross: null, par: 3 },
      ],
    };

    const playerB: PlayerFactForSim = {
      playerId: "playerB",
      playerName: "Player B",
      playerHandicap: 10.0,
      team: "teamB",
      holePerformance: [
        { hole: 1, gross: null, par: 4 },
        { hole: 2, gross: null, par: 3 },
      ],
    };

    const result = simulateHeadToHead(
      playerA,
      playerB,
      TEST_COURSE_HOLES,
      "singles",
      TEST_SLOPE_RATING,
      TEST_COURSE_RATING,
      TEST_COURSE_PAR
    );

    expect(result.holesWonA).toBe(0);
    expect(result.holesWonB).toBe(0);
    expect(result.winner).toBe("tie");
  });

  it("validates course handicap calculation with extreme slope ratings", () => {
    // Test with very low slope
    const ch1 = calculateCourseHandicap(10.0, 90, 72.0, 72);
    // (10 × (90/113)) + 0 = 10 × 0.796... = 7.96 → rounds to 8
    expect(ch1).toBe(8);

    // Test with very high slope
    const ch2 = calculateCourseHandicap(10.0, 155, 72.0, 72);
    // (10 × (155/113)) + 0 = 10 × 1.372... = 13.72 → rounds to 14
    expect(ch2).toBe(14);
  });
});
