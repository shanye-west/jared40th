import { memo } from "react";
import type { HoleData } from "./PlayerScoreRow";

/** Props for TeamScoreRow */
export interface TeamScoreRowProps {
  team: "A" | "B";
  teamName: string;
  teamColor: string;
  holes: HoleData[];
  getTeamLowScore: (hole: HoleData, team: "A" | "B") => number | null;
  outTotal: number | null;
  inTotal: number | null;
  totalScore: number | null;
  /** 0-indexed hole where match closed (null if went to 18) */
  closingHole?: number | null;
}

/**
 * Memoized team score row for Best Ball and Shamble formats
 * Shows the team's low net (Best Ball) or low gross (Shamble) score per hole
 */
export const TeamScoreRow = memo(function TeamScoreRow({
  team,
  teamName,
  teamColor,
  holes,
  getTeamLowScore,
  outTotal,
  inTotal,
  totalScore,
  closingHole,
}: TeamScoreRowProps) {
  return (
    <tr style={{ backgroundColor: teamColor }}>
      <td 
        className="sticky left-0 z-10 text-left px-3 py-1.5 text-white text-xs font-bold uppercase tracking-wide whitespace-nowrap overflow-hidden text-ellipsis" 
        style={{ backgroundColor: teamColor }}
      >
        {teamName}
      </td>
      {/* Front 9 low score */}
      {holes.slice(0, 9).map((h, i) => {
        const holeIdx = i;
        const isPostMatch = closingHole != null && holeIdx > closingHole;
        const lowScore = getTeamLowScore(h, team);
        return (
          <td 
            key={`team${team}-${h.k}`}
            className={`py-1 text-center font-bold text-sm ${isPostMatch ? 'text-white/50' : 'text-white'}`}
            style={{
              ...(isPostMatch ? { backgroundColor: "rgba(0,0,0,0.1)" } : {}),
            }}
          >
            {lowScore ?? ""}
          </td>
        );
      })}
      {/* OUT total */}
      <td 
        className="py-1 text-center text-white font-bold border-l-2 border-white/30" 
        style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
      >
        {outTotal ?? "–"}
      </td>
      {/* Back 9 low score - post-match cells have border and tint */}
      {holes.slice(9, 18).map((h, i) => {
        const holeIdx = 9 + i;
        const isPostMatch = closingHole != null && holeIdx > closingHole;
        const lowScore = getTeamLowScore(h, team);
        
        // Build class: first hole gets border, post-match gets muted text
        let cellClass = `py-1 text-center font-bold text-sm ${isPostMatch ? 'text-white/50' : 'text-white'}`;
        if (i === 0) cellClass += " border-l-2 border-white/30";
        
        return (
          <td 
            key={`team${team}-${h.k}`}
            className={cellClass}
            style={{
              ...(isPostMatch ? { backgroundColor: "rgba(0,0,0,0.1)" } : {}),
            }}
          >
            {lowScore ?? ""}
          </td>
        );
      })}
      {/* IN total */}
      <td 
        className="py-1 text-center text-white font-bold border-l-2 border-white/30" 
        style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
      >
        {inTotal ?? "–"}
      </td>
      {/* TOTAL */}
      <td 
        className="py-1 text-center text-white font-extrabold text-base" 
        style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
      >
        {totalScore ?? "–"}
      </td>
    </tr>
  );
});
