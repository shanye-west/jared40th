/**
 * Unit tests for utils.ts
 */

import { describe, it, expect } from "vitest";
import { formatRoundType, formatMatchStatus } from "./utils";

// --- formatRoundType tests ---

describe("formatRoundType", () => {
  it("returns display name for twoManBestBall", () => {
    expect(formatRoundType("twoManBestBall")).toBe("2-Man Best Ball");
  });

  it("returns display name for twoManShamble", () => {
    expect(formatRoundType("twoManShamble")).toBe("2-Man Shamble");
  });

  it("returns display name for twoManScramble", () => {
    expect(formatRoundType("twoManScramble")).toBe("2-Man Scramble");
  });

  it("returns display name for singles", () => {
    expect(formatRoundType("singles")).toBe("Singles");
  });

  it("returns 'Format TBD' for null", () => {
    expect(formatRoundType(null)).toBe("Format TBD");
  });

  it("returns 'Format TBD' for undefined", () => {
    expect(formatRoundType(undefined)).toBe("Format TBD");
  });

  it("returns 'Format TBD' for empty string", () => {
    expect(formatRoundType("")).toBe("Format TBD");
  });

  it("returns input for unknown format", () => {
    expect(formatRoundType("unknownFormat")).toBe("unknownFormat");
  });
});

// --- formatMatchStatus tests ---

describe("formatMatchStatus", () => {
  describe("handles missing/invalid status", () => {
    it("returns '—' for undefined status", () => {
      expect(formatMatchStatus(undefined)).toBe("—");
    });

    it("returns '—' for null status", () => {
      expect(formatMatchStatus(null as any)).toBe("—");
    });
  });

  describe("not started state", () => {
    it("returns 'Not started' when thru is 0", () => {
      expect(formatMatchStatus({ leader: null, margin: 0, thru: 0, dormie: false, closed: false })).toBe("Not started");
    });

    it("returns 'Not started' when thru is undefined", () => {
      expect(formatMatchStatus({ leader: null, margin: 0, dormie: false, closed: false } as any)).toBe("Not started");
    });
  });

  describe("all square states", () => {
    it("returns 'All Square (N)' when tied in progress", () => {
      expect(formatMatchStatus({ leader: null, margin: 0, thru: 9, dormie: false, closed: false })).toBe("All Square (9)");
    });

    it("returns 'Halved' when tied and closed", () => {
      expect(formatMatchStatus({ leader: null, margin: 0, thru: 18, dormie: false, closed: true })).toBe("Halved");
    });
  });

  describe("team leading in progress", () => {
    it("shows 'Team A N UP (thru)' when teamA leading", () => {
      expect(formatMatchStatus({ leader: "teamA", margin: 2, thru: 12, dormie: false, closed: false })).toBe("Team A 2 UP (12)");
    });

    it("shows 'Team B N UP (thru)' when teamB leading", () => {
      expect(formatMatchStatus({ leader: "teamB", margin: 3, thru: 15, dormie: false, closed: false })).toBe("Team B 3 UP (15)");
    });

    it("uses custom team names", () => {
      expect(formatMatchStatus({ leader: "teamA", margin: 1, thru: 6, dormie: false, closed: false }, "Rowdies", "Rebels")).toBe("Rowdies 1 UP (6)");
    });
  });

  describe("match finished early (X & Y format)", () => {
    it("shows '4 & 3' format for early finish", () => {
      expect(formatMatchStatus({ leader: "teamA", margin: 4, thru: 15, dormie: false, closed: true })).toBe("Team A wins 4 & 3");
    });

    it("shows '3 & 2' format", () => {
      expect(formatMatchStatus({ leader: "teamB", margin: 3, thru: 16, dormie: false, closed: true })).toBe("Team B wins 3 & 2");
    });

    it("shows '2 & 1' format", () => {
      expect(formatMatchStatus({ leader: "teamA", margin: 2, thru: 17, dormie: false, closed: true })).toBe("Team A wins 2 & 1");
    });

    it("uses custom team names for wins", () => {
      expect(formatMatchStatus({ leader: "teamB", margin: 5, thru: 13, dormie: false, closed: true }, "Rowdies", "Rebels")).toBe("Rebels wins 5 & 5");
    });
  });

  describe("match finished at 18 (N UP format)", () => {
    it("shows 'wins 1 UP' for 1-up at 18", () => {
      expect(formatMatchStatus({ leader: "teamA", margin: 1, thru: 18, dormie: false, closed: true })).toBe("Team A wins 1 UP");
    });

    it("shows 'wins 2 UP' for 2-up at 18", () => {
      expect(formatMatchStatus({ leader: "teamB", margin: 2, thru: 18, dormie: false, closed: true })).toBe("Team B wins 2 UP");
    });

    it("uses custom team names", () => {
      expect(formatMatchStatus({ leader: "teamA", margin: 3, thru: 18, dormie: false, closed: true }, "Rowdies", "Rebels")).toBe("Rowdies wins 3 UP");
    });
  });

  describe("edge cases", () => {
    it("handles missing margin (defaults to 0)", () => {
      expect(formatMatchStatus({ leader: null, thru: 9, dormie: false, closed: false } as any)).toBe("All Square (9)");
    });

    it("handles dormie state in progress", () => {
      // Dormie doesn't change display format - still shows leader and margin
      expect(formatMatchStatus({ leader: "teamA", margin: 2, thru: 16, dormie: true, closed: false })).toBe("Team A 2 UP (16)");
    });
  });
});
