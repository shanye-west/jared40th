import { memo } from "react";

export interface ScoreDisplayCellProps {
  value: number | null;
  par: number;
  hasStroke: boolean;
  teamColor: string;
}

export const ScoreDisplayCell = memo(function ScoreDisplayCell({
  value,
  par,
  hasStroke,
  teamColor,
}: ScoreDisplayCellProps) {
  const underPar = value != null && par ? par - value : 0;
  const circleCount = underPar > 0 ? underPar : 0;
  const overPar = value != null && par ? value - par : 0;
  const squareCount = overPar > 0 ? overPar : 0;

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="w-11 h-11 flex items-center justify-center text-center text-base font-semibold rounded-md border bg-white border-slate-200"
        style={value != null ? { borderLeftColor: teamColor, borderLeftWidth: "3px" } : undefined}
      >
        {value != null ? value : ""}
      </div>

      {/* Birdie/Eagle circles */}
      {circleCount > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {circleCount >= 2 && (
            <div className="absolute rounded-full" style={{ width: 32, height: 32, border: "1px solid #000" }} />
          )}
          {circleCount >= 3 && (
            <div className="absolute rounded-full" style={{ width: 24, height: 24, border: "1px solid #000" }} />
          )}
          <div className="absolute rounded-full" style={{ width: 28, height: 28, border: "1px solid #000" }} />
        </div>
      )}

      {/* Bogey/Double Bogey squares */}
      {squareCount > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {squareCount >= 2 && (
            <div className="absolute" style={{ width: 32, height: 32, border: "1px solid #000", borderRadius: 3 }} />
          )}
          {squareCount >= 3 && (
            <div className="absolute" style={{ width: 24, height: 24, border: "1px solid #000", borderRadius: 3 }} />
          )}
          <div className="absolute" style={{ width: 28, height: 28, border: "1px solid #000", borderRadius: 3 }} />
        </div>
      )}

      {hasStroke && <div className="absolute top-1 right-1 w-2 h-2 bg-sky-400 rounded-full" />}
    </div>
  );
});
