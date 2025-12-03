/**
 * Shared types for Cloud Functions
 */

export type RoundFormat = "twoManBestBall" | "twoManShamble" | "twoManScramble" | "singles";

export interface MatchStatus {
  leader: "teamA" | "teamB" | null;
  margin: number;
  thru: number;
  dormie: boolean;
  closed: boolean;
  wasTeamADown3PlusBack9?: boolean;
  wasTeamAUp3PlusBack9?: boolean;
  marginHistory?: number[];
}

export interface MatchResult {
  winner: "teamA" | "teamB" | "AS";
  holesWonA: number;
  holesWonB: number;
}

export interface PlayerInMatch {
  playerId: string;
  strokesReceived: number[];
}

// =============================================================================
// PLAYER STATS BY SERIES
// Aggregated stats per player per tournament series (rowdyCup, christmasClassic)
// =============================================================================

export type TournamentSeries = "rowdyCup" | "christmasClassic";

export interface PlayerStatsBySeries {
  playerId: string;
  series: TournamentSeries;
  
  // Core record
  wins: number;
  losses: number;
  halves: number;
  points: number;
  matchesPlayed: number;
  
  // Format breakdown
  formatBreakdown?: {
    singles?: { wins: number; losses: number; halves: number; matches: number };
    twoManBestBall?: { wins: number; losses: number; halves: number; matches: number };
    twoManShamble?: { wins: number; losses: number; halves: number; matches: number };
    twoManScramble?: { wins: number; losses: number; halves: number; matches: number };
  };
  
  // Scoring stats (individual formats only: singles, bestBall)
  totalGross?: number;        // Cumulative gross strokes
  totalNet?: number;          // Cumulative net strokes
  holesPlayed?: number;       // For calculating averages
  strokesVsParGross?: number; // Cumulative strokes vs par (gross)
  strokesVsParNet?: number;   // Cumulative strokes vs par (net)
  
  // Counting stats
  birdies?: number;
  eagles?: number;
  holesWon?: number;
  holesLost?: number;
  holesHalved?: number;
  
  // Badge counters
  comebackWins: number;
  blownLeads: number;
  neverBehindWins: number;   // Won without ever trailing
  jekyllAndHydes: number;    // Worst ball - best ball >= 24
  clutchWins: number;        // Match decided on 18th hole AND player's team won
  
  // Team format stats
  drivesUsed?: number;
  ballsUsed?: number;
  ballsUsedSolo?: number;
  hamAndEggs?: number;
  
  // Captain stats
  captainWins?: number;
  captainLosses?: number;
  captainHalves?: number;
  captainVsCaptainWins?: number;
  captainVsCaptainLosses?: number;
  captainVsCaptainHalves?: number;
  
  lastUpdated: any; // FieldValue.serverTimestamp()
}

export interface HoleInput {
  // Scramble format
  teamAGross?: number | null;
  teamBGross?: number | null;
  teamADrive?: number | null;
  teamBDrive?: number | null;
  // Singles format
  teamAPlayerGross?: number | null;
  teamBPlayerGross?: number | null;
  // Best Ball & Shamble format
  teamAPlayersGross?: (number | null)[];
  teamBPlayersGross?: (number | null)[];
}

export interface MatchData {
  tournamentId?: string;
  roundId?: string;
  teamAPlayers?: PlayerInMatch[];
  teamBPlayers?: PlayerInMatch[];
  holes?: Record<string, { input: HoleInput }>;
  status?: MatchStatus;
  result?: MatchResult;
}
