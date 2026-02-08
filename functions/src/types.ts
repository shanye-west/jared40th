/**
 * Shared types for Nines Tournament Cloud Functions
 */

// ============================================================================
// COURSE TYPES
// ============================================================================

export type HoleInfo = {
  number: number;
  par: number;
  hcpIndex: number; // Handicap Index (1-18)
  yards?: number;
};

export type CourseDoc = {
  id: string;
  name: string;
  tees?: string;
  par?: number;
  rating?: number;
  slope?: number;
  holes: HoleInfo[];
};

// ============================================================================
// PLAYER TYPES
// ============================================================================

export type PlayerDoc = {
  id: string;
  displayName?: string;
  handicapIndex?: number;
};

// ============================================================================
// TOURNAMENT TYPES (4 teams of 4)
// ============================================================================

export type TeamDef = {
  id: string;            // e.g., "team1", "team2", "team3", "team4"
  name: string;          // e.g., "Blue", "Red", "Green", "Gold"
  color: string;         // CSS hex color
  logo?: string;
  playerIds: string[];   // Exactly 4 player IDs
};

export type Scoreboard = {
  teamTotals: [number, number, number, number];
  holesCompleted: number;
  totalHoles: number;    // groups * 18
  lastUpdated: any;      // FieldValue.serverTimestamp()
};

export type TournamentDoc = {
  id: string;
  name: string;
  year: number;
  active: boolean;
  courseId?: string;
  roundIds?: string[];
  tournamentLogo?: string;
  teams: [TeamDef, TeamDef, TeamDef, TeamDef];
  scoreboard: Scoreboard;
};

// ============================================================================
// ROUND TYPES (multi-day support)
// ============================================================================

export type RoundDoc = {
  id: string;
  tournamentId: string;
  day?: number;
  courseId?: string;       // Override course per round if needed
  groupIds?: string[];
};

// ============================================================================
// GROUP TYPES (replaces matches - 4 players, one per team)
// ============================================================================

export type GroupPlayer = {
  playerId: string;
  teamIndex: number;         // 0-3, which team this player belongs to
  displayName: string;       // Denormalized for display
  handicapIndex: number;     // Raw handicap index
  courseHandicap: number;    // Computed course handicap
  strokesReceived: number[]; // 18-element array of 0 or 1
};

export type HoleScores = {
  gross: [number | null, number | null, number | null, number | null];
  net?: [number | null, number | null, number | null, number | null];
  points?: [number, number, number, number];
};

export type GroupComputed = {
  playerPoints: [number, number, number, number];
  holesCompleted: number;
  completed: boolean;
  lastUpdated?: any;     // FieldValue.serverTimestamp()
};

export type GroupDoc = {
  id: string;
  roundId: string;
  tournamentId: string;
  groupNumber: number;
  teeTime?: any;          // Firestore Timestamp
  players: [GroupPlayer, GroupPlayer, GroupPlayer, GroupPlayer];
  holes: Record<string, HoleScores>;
  computed: GroupComputed;
  _computeSig?: string;   // Loop prevention
};
