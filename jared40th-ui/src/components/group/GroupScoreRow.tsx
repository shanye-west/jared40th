import { memo } from "react";
import { ScoreInputCell } from "./ScoreInputCell";
import { SCORECARD_CELL_WIDTH, SCORECARD_LABEL_WIDTH, SCORECARD_TOTAL_COL_WIDTH } from "../../constants";
import type { GroupPlayer, HoleInfo } from "../../types";

type GroupScoreRowProps = {
  player: GroupPlayer;
  playerIndex: number;
  holes: HoleInfo[];
  grossScores: Record<string, number | null>;
  netScores: Record<string, number | null>;
  ninesPoints: Record<string, number>;
  runningPointTotal: number;
  teamColor: string;
  teamName: string;
  onChange: (holeKey: string, playerIndex: number, value: number | null) => void;
};

export const GroupScoreRow = memo(function GroupScoreRow({
  player,
  playerIndex,
  holes,
  grossScores,
  netScores,
  ninesPoints,
  runningPointTotal,
  teamColor,
  teamName,
  onChange,
}: GroupScoreRowProps) {
  const cellWidth = SCORECARD_CELL_WIDTH;
  const labelWidth = SCORECARD_LABEL_WIDTH;
  const totalColWidth = SCORECARD_TOTAL_COL_WIDTH;

  // Compute front/back/total gross
  const front9Gross = holes.slice(0, 9).reduce((sum, h) => {
    const v = grossScores[String(h.number)];
    return v != null ? sum + v : sum;
  }, 0);
  const back9Gross = holes.slice(9, 18).reduce((sum, h) => {
    const v = grossScores[String(h.number)];
    return v != null ? sum + v : sum;
  }, 0);
  const totalGross = front9Gross + back9Gross;

  const handleChange = (holeKey: string, value: number | null) => {
    onChange(holeKey, playerIndex, value);
  };

  // Get first name for compact display
  const firstName = player.displayName.split(" ")[0];

  return (
    <>
      {/* Gross Score Row */}
      <tr className="border-b border-slate-100">
        <td
          className="sticky left-0 z-10 px-2 py-1.5"
          style={{
            width: labelWidth,
            minWidth: labelWidth,
            backgroundColor: "white",
          }}
        >
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: teamColor }}
            />
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold text-slate-800 truncate" style={{ maxWidth: labelWidth - 36 }}>
                {firstName}
              </span>
              <span className="text-[0.6rem] text-slate-400">
                {teamName} ({player.courseHandicap})
              </span>
            </div>
          </div>
        </td>

        {/* Front 9 */}
        {holes.slice(0, 9).map((h) => (
          <td key={h.number} className="text-center" style={{ width: cellWidth, minWidth: cellWidth }}>
            <ScoreInputCell
              holeKey={String(h.number)}
              holeNum={h.number}
              value={grossScores[String(h.number)] ?? ""}
              par={h.par}
              hasStroke={player.strokesReceived?.[h.number - 1] === 1}
              teamColor={teamColor}
              onChange={handleChange}
            />
          </td>
        ))}

        {/* OUT total */}
        <td
          className="text-center text-xs font-bold text-slate-600 bg-slate-50 border-l-2 border-slate-200"
          style={{ width: totalColWidth, minWidth: totalColWidth }}
        >
          {front9Gross || ""}
        </td>

        {/* Back 9 */}
        {holes.slice(9, 18).map((h, i) => (
          <td
            key={h.number}
            className={`text-center ${i === 0 ? "border-l-2 border-slate-200" : ""}`}
            style={{ width: cellWidth, minWidth: cellWidth }}
          >
            <ScoreInputCell
              holeKey={String(h.number)}
              holeNum={h.number}
              value={grossScores[String(h.number)] ?? ""}
              par={h.par}
              hasStroke={player.strokesReceived?.[h.number - 1] === 1}
              teamColor={teamColor}
              onChange={handleChange}
            />
          </td>
        ))}

        {/* IN total */}
        <td
          className="text-center text-xs font-bold text-slate-600 bg-slate-50 border-l-2 border-slate-200"
          style={{ width: totalColWidth, minWidth: totalColWidth }}
        >
          {back9Gross || ""}
        </td>

        {/* TOT */}
        <td
          className="text-center text-xs font-bold text-slate-800 bg-slate-100"
          style={{ width: totalColWidth, minWidth: totalColWidth }}
        >
          {totalGross || ""}
        </td>
      </tr>

      {/* Net Score + Points Row */}
      <tr className="border-b border-slate-200" style={{ backgroundColor: `color-mix(in srgb, ${teamColor} 4%, white)` }}>
        <td
          className="sticky left-0 z-10 px-2 py-1"
          style={{
            width: labelWidth,
            minWidth: labelWidth,
            backgroundColor: `color-mix(in srgb, ${teamColor} 4%, white)`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[0.6rem] uppercase tracking-wider text-slate-400 font-semibold">Net / Pts</span>
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `color-mix(in srgb, ${teamColor} 15%, white)`,
                color: teamColor,
              }}
            >
              {runningPointTotal % 1 === 0 ? runningPointTotal : runningPointTotal.toFixed(1)}
            </span>
          </div>
        </td>

        {/* Front 9 net/points */}
        {holes.slice(0, 9).map((h) => {
          const net = netScores[String(h.number)];
          const pts = ninesPoints[String(h.number)];
          return (
            <td key={h.number} className="text-center" style={{ width: cellWidth, minWidth: cellWidth }}>
              <div className="flex flex-col items-center leading-tight py-0.5">
                <span className="text-[0.6rem] text-slate-400">{net != null ? net : ""}</span>
                <span
                  className="text-[0.65rem] font-bold"
                  style={{ color: pts != null && pts > 0 ? teamColor : "#94a3b8" }}
                >
                  {pts != null && pts > 0 ? (pts % 1 === 0 ? pts : pts.toFixed(1)) : ""}
                </span>
              </div>
            </td>
          );
        })}

        {/* OUT summary */}
        <td
          className="text-center text-[0.6rem] bg-slate-50 border-l-2 border-slate-200"
          style={{ width: totalColWidth, minWidth: totalColWidth }}
        />

        {/* Back 9 net/points */}
        {holes.slice(9, 18).map((h, i) => {
          const net = netScores[String(h.number)];
          const pts = ninesPoints[String(h.number)];
          return (
            <td
              key={h.number}
              className={`text-center ${i === 0 ? "border-l-2 border-slate-200" : ""}`}
              style={{ width: cellWidth, minWidth: cellWidth }}
            >
              <div className="flex flex-col items-center leading-tight py-0.5">
                <span className="text-[0.6rem] text-slate-400">{net != null ? net : ""}</span>
                <span
                  className="text-[0.65rem] font-bold"
                  style={{ color: pts != null && pts > 0 ? teamColor : "#94a3b8" }}
                >
                  {pts != null && pts > 0 ? (pts % 1 === 0 ? pts : pts.toFixed(1)) : ""}
                </span>
              </div>
            </td>
          );
        })}

        {/* IN summary */}
        <td
          className="text-center text-[0.6rem] bg-slate-50 border-l-2 border-slate-200"
          style={{ width: totalColWidth, minWidth: totalColWidth }}
        />

        {/* TOT - running point total */}
        <td
          className="text-center text-xs font-bold bg-slate-100"
          style={{ width: totalColWidth, minWidth: totalColWidth, color: teamColor }}
        >
          {runningPointTotal % 1 === 0 ? runningPointTotal : runningPointTotal.toFixed(1)}
        </td>
      </tr>
    </>
  );
});
