/**
 * Frontend types for the Nines Tournament PWA
 */

// ============================================================================
// COURSE TYPES
// ============================================================================

export type HoleInfo = {
  number: number;
  par: number;
  hcpIndex: number;
  yards?: number;
};

export type TeeSet = {
  name: string;       // e.g., "Blue", "White", "Red"
  rating: number;     // USGA course rating
  slope: number;      // USGA slope rating
  par: number;        // Total par for this tee set (usually 72)
  yards?: number[];   // 18-element array of per-hole yardages
};

export type CourseDoc = {
  id: string;
  name: string;
  holes: HoleInfo[];
  teesets?: TeeSet[];
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
  id: string;
  name: string;
  color: string;
  logo?: string;
  playerIds: string[];
};

export type Scoreboard = {
  teamTotals: [number, number, number, number];
  holesCompleted: number;
  totalHoles: number;
  lastUpdated: any;
};

export type SkinOverride = {
  playerId: string;
  hole: number;
  roundId: string;
};

export type SideGameConfig = {
  id: string;
  name: string;
  type: "skins" | "cumulative" | "head-to-head";
  scoreType: "gross" | "net";
  pot: number;
  perRound: boolean;
  playerIds: string[];
  // Head-to-head specific (only present when type === "head-to-head")
  betFront?: number;
  betBack?: number;
  betTotal?: number;
  // Skins overrides: scores to exclude from skins calculation (admin only)
  skinOverrides?: SkinOverride[];
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
  sideGames?: SideGameConfig[];
};

// ============================================================================
// ROUND TYPES
// ============================================================================

export type RoundDoc = {
  id: string;
  tournamentId: string;
  day?: number;
  courseId?: string;
  groupIds?: string[];
};

// ============================================================================
// GROUP TYPES (replaces matches)
// ============================================================================

export type GroupPlayer = {
  playerId: string;
  teamIndex: number;
  displayName: string;
  handicapIndex: number;
  courseHandicap: number;
  strokesReceived: number[];          // Full course handicap strokes (for side games)
  teamStrokesReceived?: number[];     // Spun-off strokes (for nines team game)
  playingHandicap?: number;           // Course handicap minus lowest in group
  teeSetName?: string;
};

export type HoleScores = {
  gross: [number | null, number | null, number | null, number | null];
  net?: [number | null, number | null, number | null, number | null];
  teamNet?: [number | null, number | null, number | null, number | null];
  points?: [number, number, number, number];
};

export type GroupComputed = {
  playerPoints: [number, number, number, number];
  holesCompleted: number;
  completed: boolean;
  lastUpdated?: any;
};

export type GroupDoc = {
  id: string;
  roundId: string;
  tournamentId: string;
  groupNumber: number;
  teeTime?: any;
  players: [GroupPlayer, GroupPlayer, GroupPlayer, GroupPlayer];
  holes: Record<string, HoleScores>;
  computed: GroupComputed;
  _computeSig?: string;
};
