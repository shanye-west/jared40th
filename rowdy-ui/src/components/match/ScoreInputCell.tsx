import { memo, useCallback, useState } from "react";
import { ScoreNumberPicker } from "./ScoreNumberPicker";

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
  const [showPicker, setShowPicker] = useState(false);
  
  // Use team-specific colors for low score highlighting
  const lowScoreBg = teamColor === 'A'
    ? (lowScoreStatus === 'solo' ? 'bg-blue-100' : lowScoreStatus === 'tied' ? 'bg-blue-50' : '')
    : (lowScoreStatus === 'solo' ? 'bg-red-100' : lowScoreStatus === 'tied' ? 'bg-red-50' : '');

  // Calculate how many under par (only for birdies or better)
  const underPar = typeof value === 'number' && par ? par - value : 0;
  // Number of circles: 1 for birdie (1 under), 2 for eagle (2 under), etc.
  const circleCount = underPar > 0 ? underPar : 0;
  
  // Handle cell tap to open picker
  const handleCellClick = useCallback(() => {
    if (!locked) {
      setShowPicker(true);
    }
  }, [locked]);
  
  // Handle number selection from picker
  const handleSelect = useCallback((num: number) => {
    onChange(holeKey, num);
    setShowPicker(false);
  }, [holeKey, onChange]);
  
  // Handle clear from picker
  const handleClear = useCallback(() => {
    onChange(holeKey, null);
    setShowPicker(false);
  }, [holeKey, onChange]);
  
  // Handle picker close
  const handleClose = useCallback(() => {
    setShowPicker(false);
  }, []);

  return (
    <div className="relative flex flex-col items-center">
      {/* Score display cell - tap to open picker */}
      <button
        type="button"
        aria-label={`Score for hole ${holeNum}${value ? `: ${value}` : ''}`}
        className={`
          w-11 h-11 text-center text-base font-semibold rounded-md border
          transition-colors duration-100 select-none
          ${locked 
            ? "bg-slate-50 text-slate-600 border-slate-200 cursor-default" 
            : lowScoreBg 
              ? `${lowScoreBg} border-slate-200 hover:border-slate-300 active:bg-slate-100` 
              : "bg-white border-slate-200 hover:border-slate-300 active:bg-slate-100"
          }
        `}
        disabled={locked}
        onClick={handleCellClick}
      >
        {value !== "" ? value : ""}
      </button>
      
      {/* Number picker popover */}
      {showPicker && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50">
          <ScoreNumberPicker
            value={value}
            onSelect={handleSelect}
            onClear={handleClear}
            onClose={handleClose}
          />
        </div>
      )}
      {/* Birdie/Eagle circles - centered over input */}
      {circleCount > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Outer circles for eagle+ (2+ under par) */}
          {circleCount >= 2 && (
            <div 
              className="absolute rounded-full border border-black/70"
              style={{ width: '38px', height: '38px' }}
            />
          )}
          {circleCount >= 3 && (
            <div 
              className="absolute rounded-full border border-black/70"
              style={{ width: '42px', height: '42px' }}
            />
          )}
          {circleCount >= 4 && (
            <div 
              className="absolute rounded-full border border-black/70"
              style={{ width: '46px', height: '46px' }}
            />
          )}
          {/* Inner circle for birdie (always shown when under par) */}
          <div 
            className="absolute rounded-full border border-black/70"
            style={{ width: '34px', height: '34px' }}
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
