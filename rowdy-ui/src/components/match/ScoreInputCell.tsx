import { memo } from "react";

/** Props for ScoreInputCell */
export interface ScoreInputCellProps {
  holeKey: string;
  holeNum: number;
  value: number | "";
  par: number;
  locked: boolean;
  hasStroke: boolean;
  hasDrive: boolean;
  lowScoreStatus: 'solo' | 'tied' | null;
  teamColor: 'A' | 'B';
  onChange: (holeKey: string, value: number | null) => void;
}

/** Memoized score input cell - prevents re-render unless props change */
export const ScoreInputCell = memo(function ScoreInputCell({
  holeKey,
  holeNum,
  value,
  par,
  locked,
  hasStroke,
  hasDrive,
  lowScoreStatus,
  teamColor,
  onChange,
}: ScoreInputCellProps) {
  // Use team-specific colors for low score highlighting
  const lowScoreBg = teamColor === 'A'
    ? (lowScoreStatus === 'solo' ? 'bg-blue-100' : lowScoreStatus === 'tied' ? 'bg-blue-50' : '')
    : (lowScoreStatus === 'solo' ? 'bg-red-100' : lowScoreStatus === 'tied' ? 'bg-red-50' : '');

  // Calculate how many under par (only for birdies or better)
  const underPar = typeof value === 'number' && par ? par - value : 0;
  // Number of circles: 1 for birdie (1 under), 2 for eagle (2 under), etc.
  const circleCount = underPar > 0 ? underPar : 0;

  return (
    <div className="relative flex flex-col items-center">
      <input
        type="number"
        inputMode="numeric"
        aria-label={`Score for hole ${holeNum}`}
        className={`
          w-10 h-10 text-center text-base font-semibold rounded-md border
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
          transition-colors duration-100
          ${locked 
            ? "bg-slate-50 text-slate-600 border-slate-200 cursor-default" 
            : lowScoreBg ? `${lowScoreBg} border-slate-200 hover:border-slate-300` : "bg-white border-slate-200 hover:border-slate-300"
          }
        `}
        value={value}
        disabled={locked}
        onChange={(e) => {
          const val = e.target.value === "" ? null : Number(e.target.value);
          onChange(holeKey, val);
        }}
      />
      {/* Birdie/Eagle circles - centered over input */}
      {circleCount > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Outer circles for eagle+ (2+ under par) */}
          {circleCount >= 2 && (
            <div 
              className="absolute rounded-full border border-black/70"
              style={{ width: '34px', height: '34px' }}
            />
          )}
          {circleCount >= 3 && (
            <div 
              className="absolute rounded-full border border-black/70"
              style={{ width: '38px', height: '38px' }}
            />
          )}
          {circleCount >= 4 && (
            <div 
              className="absolute rounded-full border border-black/70"
              style={{ width: '42px', height: '42px' }}
            />
          )}
          {/* Inner circle for birdie (always shown when under par) */}
          <div 
            className="absolute rounded-full border border-black/70"
            style={{ width: '30px', height: '30px' }}
          />
        </div>
      )}
      {hasStroke && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-sky-400 rounded-full"></div>
      )}
      {hasDrive && (
        <div className="absolute bottom-0.5 left-0.5 text-[8px] font-bold text-green-600">D</div>
      )}
    </div>
  );
});
