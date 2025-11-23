export type RoundFormat = "twoManBestBall" | "twoManShamble" | "twoManScramble" | "singles";

export type TournamentDoc = {
  id: string;
  name: string;
  active?: boolean;
  roundIds?: string[];
};

export type RoundDoc = {
  id: string;
  tournamentId: string;
  day?: number;
  format: RoundFormat;
};

export type MatchDoc = {
  id: string;
  roundId: string;
  status?: {
    leader: "teamA" | "teamB" | null;
    margin: number;
    thru: number;
    dormie: boolean;
    closed: boolean;
  };
};