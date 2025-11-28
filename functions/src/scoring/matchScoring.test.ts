/**
 * Unit tests for matchScoring.ts
 */

import { describe, it, expect } from "vitest";
import { holesRange, decideHole, summarize, buildStatusAndResult } from "./matchScoring.js";
import type { MatchData, PlayerInMatch } from "../types.js";

// --- HELPERS ---

/** Creates a basic match with empty holes */
function createMatch(overrides: Partial<MatchData> = {}): MatchData {
  return {
    teamAPlayers: [{ playerId: "a1", strokesReceived: Array(18).fill(0) }],
    teamBPlayers: [{ playerId: "b1", strokesReceived: Array(18).fill(0) }],
    holes: {},
    ...overrides,
  };
}

/** Creates team players for best ball / shamble formats */
function createTwoPlayerTeam(strokesA: number[], strokesB: number[]): PlayerInMatch[] {
  return [
    { playerId: "p1", strokesReceived: strokesA },
    { playerId: "p2", strokesReceived: strokesB },
  ];
}

// --- holesRange tests ---

describe("holesRange", () => {
  it("returns sorted hole numbers from 1-18", () => {
    const holes = { "1": {}, "3": {}, "2": {}, "10": {}, "18": {} };
    expect(holesRange(holes)).toEqual([1, 2, 3, 10, 18]);
  });

  it("ignores non-hole keys", () => {
    const holes = { "1": {}, "input": {}, "status": {}, "19": {}, "0": {} };
    expect(holesRange(holes)).toEqual([1]);
  });

  it("returns empty array for empty object", () => {
    expect(holesRange({})).toEqual([]);
  });

  it("handles all 18 holes", () => {
    const holes: Record<string, object> = {};
    for (let i = 1; i <= 18; i++) holes[String(i)] = {};
    expect(holesRange(holes)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
  });
});

// --- decideHole tests ---

describe("decideHole", () => {
  describe("twoManScramble format", () => {
    it("returns teamA when team A has lower gross", () => {
      const match = createMatch({
        holes: { "1": { input: { teamAGross: 4, teamBGross: 5 } } },
      });
      expect(decideHole("twoManScramble", 1, match)).toBe("teamA");
    });

    it("returns teamB when team B has lower gross", () => {
      const match = createMatch({
        holes: { "1": { input: { teamAGross: 5, teamBGross: 4 } } },
      });
      expect(decideHole("twoManScramble", 1, match)).toBe("teamB");
    });

    it("returns AS when scores are equal", () => {
      const match = createMatch({
        holes: { "1": { input: { teamAGross: 4, teamBGross: 4 } } },
      });
      expect(decideHole("twoManScramble", 1, match)).toBe("AS");
    });

    it("returns null when score is missing", () => {
      const match = createMatch({
        holes: { "1": { input: { teamAGross: 4 } } },
      });
      expect(decideHole("twoManScramble", 1, match)).toBeNull();
    });
  });

  describe("singles format", () => {
    it("returns teamA when team A player has lower net", () => {
      const match = createMatch({
        holes: { "1": { input: { teamAPlayerGross: 4, teamBPlayerGross: 5 } } },
      });
      expect(decideHole("singles", 1, match)).toBe("teamA");
    });

    it("returns teamB when team B player has lower net", () => {
      const match = createMatch({
        holes: { "1": { input: { teamAPlayerGross: 5, teamBPlayerGross: 4 } } },
      });
      expect(decideHole("singles", 1, match)).toBe("teamB");
    });

    it("applies handicap strokes correctly", () => {
      // Team B gets a stroke on hole 1, so gross 5 becomes net 4
      const match = createMatch({
        teamAPlayers: [{ playerId: "a1", strokesReceived: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
        teamBPlayers: [{ playerId: "b1", strokesReceived: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
        holes: { "1": { input: { teamAPlayerGross: 4, teamBPlayerGross: 5 } } },
      });
      expect(decideHole("singles", 1, match)).toBe("AS"); // 4 vs (5-1=4)
    });

    it("teamA wins when they have stroke and equal gross", () => {
      const match = createMatch({
        teamAPlayers: [{ playerId: "a1", strokesReceived: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
        teamBPlayers: [{ playerId: "b1", strokesReceived: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
        holes: { "1": { input: { teamAPlayerGross: 5, teamBPlayerGross: 5 } } },
      });
      expect(decideHole("singles", 1, match)).toBe("teamA"); // (5-1=4) vs 5
    });

    it("returns null when score is missing", () => {
      const match = createMatch({
        holes: { "1": { input: { teamAPlayerGross: 4 } } },
      });
      expect(decideHole("singles", 1, match)).toBeNull();
    });
  });

  describe("twoManShamble format", () => {
    it("uses best GROSS (no handicap) for each team", () => {
      const match = createMatch({
        teamAPlayers: createTwoPlayerTeam(Array(18).fill(1), Array(18).fill(1)), // strokes ignored
        teamBPlayers: createTwoPlayerTeam(Array(18).fill(0), Array(18).fill(0)),
        holes: { "1": { input: { teamAPlayersGross: [4, 5], teamBPlayersGross: [5, 6] } } },
      });
      // Team A best gross = 4, Team B best gross = 5
      expect(decideHole("twoManShamble", 1, match)).toBe("teamA");
    });

    it("returns AS when best gross scores are equal", () => {
      const match = createMatch({
        teamAPlayers: createTwoPlayerTeam(Array(18).fill(0), Array(18).fill(0)),
        teamBPlayers: createTwoPlayerTeam(Array(18).fill(0), Array(18).fill(0)),
        holes: { "1": { input: { teamAPlayersGross: [4, 5], teamBPlayersGross: [4, 6] } } },
      });
      expect(decideHole("twoManShamble", 1, match)).toBe("AS"); // 4 vs 4
    });

    it("returns null when any player score is missing", () => {
      const match = createMatch({
        teamAPlayers: createTwoPlayerTeam(Array(18).fill(0), Array(18).fill(0)),
        teamBPlayers: createTwoPlayerTeam(Array(18).fill(0), Array(18).fill(0)),
        holes: { "1": { input: { teamAPlayersGross: [4, null], teamBPlayersGross: [5, 6] } } },
      });
      expect(decideHole("twoManShamble", 1, match)).toBeNull();
    });
  });

  describe("twoManBestBall format", () => {
    it("uses best NET for each team", () => {
      // Player A1 gets stroke on hole 1, Player A2 does not
      // A1: gross 5 - 1 = net 4, A2: gross 4 - 0 = net 4 → best = 4
      // B1: gross 4 - 0 = net 4, B2: gross 5 - 0 = net 5 → best = 4
      const match = createMatch({
        teamAPlayers: createTwoPlayerTeam(
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ),
        teamBPlayers: createTwoPlayerTeam(
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ),
        holes: { "1": { input: { teamAPlayersGross: [5, 4], teamBPlayersGross: [4, 5] } } },
      });
      expect(decideHole("twoManBestBall", 1, match)).toBe("AS"); // Both best net = 4
    });

    it("teamA wins when their best NET is lower", () => {
      const match = createMatch({
        teamAPlayers: createTwoPlayerTeam(
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // gets stroke
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ),
        teamBPlayers: createTwoPlayerTeam(
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ),
        // A1: 4-1=3, A2: 5-0=5 → best 3
        // B1: 4-0=4, B2: 5-0=5 → best 4
        holes: { "1": { input: { teamAPlayersGross: [4, 5], teamBPlayersGross: [4, 5] } } },
      });
      expect(decideHole("twoManBestBall", 1, match)).toBe("teamA");
    });

    it("returns null when any player score is missing", () => {
      const match = createMatch({
        teamAPlayers: createTwoPlayerTeam(Array(18).fill(0), Array(18).fill(0)),
        teamBPlayers: createTwoPlayerTeam(Array(18).fill(0), Array(18).fill(0)),
        holes: { "1": { input: { teamAPlayersGross: [4, 5], teamBPlayersGross: [null, 5] } } },
      });
      expect(decideHole("twoManBestBall", 1, match)).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("handles missing holes object", () => {
      const match = createMatch({ holes: undefined });
      expect(decideHole("singles", 1, match)).toBeNull();
    });

    it("handles missing hole entry", () => {
      const match = createMatch({ holes: {} });
      expect(decideHole("singles", 1, match)).toBeNull();
    });

    it("handles missing input object", () => {
      const match = createMatch({ holes: { "1": {} as any } });
      expect(decideHole("singles", 1, match)).toBeNull();
    });
  });
});

// --- summarize tests ---

describe("summarize", () => {
  describe("basic scoring", () => {
    it("returns initial state for empty match", () => {
      const match = createMatch();
      const result = summarize("singles", match);
      
      expect(result.holesWonA).toBe(0);
      expect(result.holesWonB).toBe(0);
      expect(result.thru).toBe(0);
      expect(result.leader).toBeNull();
      expect(result.margin).toBe(0);
      expect(result.closed).toBe(false);
      expect(result.dormie).toBe(false);
      expect(result.winner).toBe("AS");
    });

    it("tracks holes won correctly", () => {
      const match = createMatch({
        holes: {
          "1": { input: { teamAPlayerGross: 4, teamBPlayerGross: 5 } }, // A wins
          "2": { input: { teamAPlayerGross: 5, teamBPlayerGross: 4 } }, // B wins
          "3": { input: { teamAPlayerGross: 4, teamBPlayerGross: 4 } }, // AS
        },
      });
      const result = summarize("singles", match);
      
      expect(result.holesWonA).toBe(1);
      expect(result.holesWonB).toBe(1);
      expect(result.thru).toBe(3);
      expect(result.leader).toBeNull();
      expect(result.margin).toBe(0);
    });

    it("identifies leader correctly", () => {
      const match = createMatch({
        holes: {
          "1": { input: { teamAPlayerGross: 4, teamBPlayerGross: 5 } }, // A wins
          "2": { input: { teamAPlayerGross: 4, teamBPlayerGross: 5 } }, // A wins
          "3": { input: { teamAPlayerGross: 5, teamBPlayerGross: 4 } }, // B wins
        },
      });
      const result = summarize("singles", match);
      
      expect(result.leader).toBe("teamA");
      expect(result.margin).toBe(1); // 2-1 = 1 up
    });
  });

  describe("match closing conditions", () => {
    it("closes match when lead exceeds remaining holes", () => {
      // Team A wins holes 1-10 (10 up with 8 to play)
      const holes: Record<string, { input: { teamAPlayerGross: number; teamBPlayerGross: number } }> = {};
      for (let i = 1; i <= 10; i++) {
        holes[String(i)] = { input: { teamAPlayerGross: 4, teamBPlayerGross: 5 } };
      }
      const match = createMatch({ holes });
      const result = summarize("singles", match);
      
      expect(result.closed).toBe(true);
      expect(result.winner).toBe("teamA");
      expect(result.margin).toBe(10);
      expect(result.thru).toBe(10);
    });

    it("closes match when all 18 holes are complete", () => {
      const holes: Record<string, { input: { teamAPlayerGross: number; teamBPlayerGross: number } }> = {};
      for (let i = 1; i <= 18; i++) {
        holes[String(i)] = { input: { teamAPlayerGross: 4, teamBPlayerGross: 4 } }; // All tied
      }
      const match = createMatch({ holes });
      const result = summarize("singles", match);
      
      expect(result.closed).toBe(true);
      expect(result.winner).toBe("AS");
      expect(result.thru).toBe(18);
    });

    it("returns correct winner at 18 holes with leader", () => {
      const holes: Record<string, { input: { teamAPlayerGross: number; teamBPlayerGross: number } }> = {};
      for (let i = 1; i <= 17; i++) {
        holes[String(i)] = { input: { teamAPlayerGross: 4, teamBPlayerGross: 4 } }; // All tied
      }
      holes["18"] = { input: { teamAPlayerGross: 4, teamBPlayerGross: 5 } }; // A wins last
      
      const match = createMatch({ holes });
      const result = summarize("singles", match);
      
      expect(result.closed).toBe(true);
      expect(result.winner).toBe("teamA");
      expect(result.margin).toBe(1);
    });
  });

  describe("dormie detection", () => {
    it("detects dormie state", () => {
      // Team A 2 up with 2 to play (holes 1-16 complete)
      const holes: Record<string, { input: { teamAPlayerGross: number; teamBPlayerGross: number } }> = {};
      for (let i = 1; i <= 16; i++) {
        if (i <= 2) {
          holes[String(i)] = { input: { teamAPlayerGross: 4, teamBPlayerGross: 5 } }; // A wins
        } else {
          holes[String(i)] = { input: { teamAPlayerGross: 4, teamBPlayerGross: 4 } }; // Halved
        }
      }
      const match = createMatch({ holes });
      const result = summarize("singles", match);
      
      expect(result.dormie).toBe(true);
      expect(result.closed).toBe(false);
      expect(result.margin).toBe(2);
      expect(result.thru).toBe(16);
    });

    it("not dormie when match is closed", () => {
      // All 18 holes complete
      const holes: Record<string, { input: { teamAPlayerGross: number; teamBPlayerGross: number } }> = {};
      for (let i = 1; i <= 18; i++) {
        if (i <= 2) {
          holes[String(i)] = { input: { teamAPlayerGross: 4, teamBPlayerGross: 5 } };
        } else {
          holes[String(i)] = { input: { teamAPlayerGross: 4, teamBPlayerGross: 4 } };
        }
      }
      const match = createMatch({ holes });
      const result = summarize("singles", match);
      
      expect(result.dormie).toBe(false);
      expect(result.closed).toBe(true);
    });
  });

  describe("momentum tracking", () => {
    it("tracks wasTeamADown3PlusBack9", () => {
      // Team B wins first 10 holes (Team A is 10 down after hole 10)
      const holes: Record<string, { input: { teamAPlayerGross: number; teamBPlayerGross: number } }> = {};
      for (let i = 1; i <= 10; i++) {
        holes[String(i)] = { input: { teamAPlayerGross: 5, teamBPlayerGross: 4 } }; // B wins
      }
      const match = createMatch({ holes });
      const result = summarize("singles", match);
      
      expect(result.wasTeamADown3PlusBack9).toBe(true);
      expect(result.wasTeamAUp3PlusBack9).toBe(false);
    });

    it("tracks wasTeamAUp3PlusBack9", () => {
      // Team A wins first 12 holes
      const holes: Record<string, { input: { teamAPlayerGross: number; teamBPlayerGross: number } }> = {};
      for (let i = 1; i <= 12; i++) {
        holes[String(i)] = { input: { teamAPlayerGross: 4, teamBPlayerGross: 5 } }; // A wins
      }
      const match = createMatch({ holes });
      const result = summarize("singles", match);
      
      expect(result.wasTeamAUp3PlusBack9).toBe(true);
      expect(result.wasTeamADown3PlusBack9).toBe(false);
    });

    it("does not trigger momentum flags on front 9 only", () => {
      // Team A 5 up through 9 (all on front 9)
      const holes: Record<string, { input: { teamAPlayerGross: number; teamBPlayerGross: number } }> = {};
      for (let i = 1; i <= 9; i++) {
        if (i <= 5) {
          holes[String(i)] = { input: { teamAPlayerGross: 4, teamBPlayerGross: 5 } }; // A wins
        } else {
          holes[String(i)] = { input: { teamAPlayerGross: 4, teamBPlayerGross: 4 } }; // Halved
        }
      }
      const match = createMatch({ holes });
      const result = summarize("singles", match);
      
      expect(result.wasTeamAUp3PlusBack9).toBe(false);
      expect(result.wasTeamADown3PlusBack9).toBe(false);
    });
  });

  describe("marginHistory tracking", () => {
    it("tracks margin after each hole", () => {
      const match = createMatch({
        holes: {
          "1": { input: { teamAPlayerGross: 4, teamBPlayerGross: 5 } }, // A wins: +1
          "2": { input: { teamAPlayerGross: 4, teamBPlayerGross: 4 } }, // AS: +1
          "3": { input: { teamAPlayerGross: 5, teamBPlayerGross: 4 } }, // B wins: 0
          "4": { input: { teamAPlayerGross: 5, teamBPlayerGross: 4 } }, // B wins: -1
        },
      });
      const result = summarize("singles", match);
      
      expect(result.marginHistory).toEqual([1, 1, 0, -1]);
    });
  });
});

// --- buildStatusAndResult tests ---

describe("buildStatusAndResult", () => {
  it("builds correct status object", () => {
    const summary = {
      holesWonA: 5,
      holesWonB: 3,
      thru: 10,
      leader: "teamA" as const,
      margin: 2,
      dormie: false,
      closed: false,
      winner: "teamA" as const,
      wasTeamADown3PlusBack9: false,
      wasTeamAUp3PlusBack9: false,
      marginHistory: [1, 1, 2, 2, 1, 1, 1, 2, 2, 2],
    };
    
    const { status, result } = buildStatusAndResult(summary);
    
    expect(status).toEqual({
      leader: "teamA",
      margin: 2,
      thru: 10,
      dormie: false,
      closed: false,
      wasTeamADown3PlusBack9: false,
      wasTeamAUp3PlusBack9: false,
      marginHistory: [1, 1, 2, 2, 1, 1, 1, 2, 2, 2],
    });
    
    expect(result).toEqual({
      winner: "teamA",
      holesWonA: 5,
      holesWonB: 3,
    });
  });

  it("handles AS winner", () => {
    const summary = {
      holesWonA: 9,
      holesWonB: 9,
      thru: 18,
      leader: null,
      margin: 0,
      dormie: false,
      closed: true,
      winner: "AS" as const,
      wasTeamADown3PlusBack9: false,
      wasTeamAUp3PlusBack9: false,
      marginHistory: Array(18).fill(0),
    };
    
    const { status, result } = buildStatusAndResult(summary);
    
    expect(status.leader).toBeNull();
    expect(status.closed).toBe(true);
    expect(result.winner).toBe("AS");
  });
});

// --- Integration tests ---

describe("integration: full match flow", () => {
  it("calculates correct status for 2&1 victory", () => {
    // Team A wins holes 1, 2, 3 (3 up after 3)
    // Holes 4-17 halved (3 up after 17 = 3 up with 1 to play = closed)
    const holes: Record<string, { input: { teamAPlayerGross: number; teamBPlayerGross: number } }> = {};
    for (let i = 1; i <= 17; i++) {
      if (i <= 3) {
        holes[String(i)] = { input: { teamAPlayerGross: 4, teamBPlayerGross: 5 } };
      } else {
        holes[String(i)] = { input: { teamAPlayerGross: 4, teamBPlayerGross: 4 } };
      }
    }
    
    const match = createMatch({ holes });
    const summary = summarize("singles", match);
    const { status, result } = buildStatusAndResult(summary);
    
    expect(status.closed).toBe(true);
    expect(status.leader).toBe("teamA");
    expect(status.margin).toBe(3);
    expect(status.thru).toBe(17);
    expect(result.winner).toBe("teamA");
    expect(result.holesWonA).toBe(3);
    expect(result.holesWonB).toBe(0);
  });

  it("calculates correct status for scramble format", () => {
    const match = createMatch({
      holes: {
        "1": { input: { teamAGross: 4, teamBGross: 5 } },
        "2": { input: { teamAGross: 5, teamBGross: 4 } },
        "3": { input: { teamAGross: 3, teamBGross: 3 } },
      },
    });
    
    const summary = summarize("twoManScramble", match);
    
    expect(summary.holesWonA).toBe(1);
    expect(summary.holesWonB).toBe(1);
    expect(summary.thru).toBe(3);
    expect(summary.leader).toBeNull();
  });
});
