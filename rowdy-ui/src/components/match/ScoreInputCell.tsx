import { memo, useRef, useCallback, useState, useEffect } from "react";

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

/** Trigger haptic feedback if available */
function haptic() {
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState<string>(value === "" ? "" : String(value));
  
  // Sync local value when prop changes (e.g., from Firestore update)
  useEffect(() => {
    setLocalValue(value === "" ? "" : String(value));
  }, [value]);
  
  // Use team-specific colors for low score highlighting
  const lowScoreBg = teamColor === 'A'
    ? (lowScoreStatus === 'solo' ? 'bg-blue-100' : lowScoreStatus === 'tied' ? 'bg-blue-50' : '')
    : (lowScoreStatus === 'solo' ? 'bg-red-100' : lowScoreStatus === 'tied' ? 'bg-red-50' : '');

  // Calculate how many under par (only for birdies or better)
  const underPar = typeof value === 'number' && par ? par - value : 0;
  // Number of circles: 1 for birdie (1 under), 2 for eagle (2 under), etc.
  const circleCount = underPar > 0 ? underPar : 0;
  
  // Handle focus - select all text so typing replaces the value
  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  }, []);
  
  // Handle input - auto-submit for 2-9, wait for second digit on 1
  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    
    // Only allow digits
    if (inputVal !== "" && !/^\d+$/.test(inputVal)) {
      return;
    }
    
    setLocalValue(inputVal);
    
    if (inputVal === "") {
      onChange(holeKey, null);
      haptic();
      return;
    }
    
    const num = Number(inputVal);
    
    // Validate range: 1-15 for golf scores
    if (num < 1 || num > 15) {
      // If > 15, cap at 15
      if (num > 15) {
        setLocalValue("15");
        onChange(holeKey, 15);
        haptic();
        inputRef.current?.blur();
      }
      return;
    }
    
    // Auto-submit for 2-9 (single digit scores that can't be part of 10-19)
    if (num >= 2 && num <= 9) {
      onChange(holeKey, num);
      haptic();
      inputRef.current?.blur();
      return;
    }
    
    // For "1", wait to see if user types second digit (10-15)
    // For "10"-"15", submit immediately
    if (num >= 10 && num <= 15) {
      onChange(holeKey, num);
      haptic();
      inputRef.current?.blur();
      return;
    }
    
    // num === 1: wait for possible second digit or blur
  }, [holeKey, onChange]);
  
  // Handle blur - submit "1" if that's what's left
  const handleBlur = useCallback(() => {
    if (localValue === "1") {
      onChange(holeKey, 1);
      haptic();
    }
  }, [localValue, holeKey, onChange]);
  
  // Handle keydown for Enter key (backup submit)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const num = Number(localValue);
      if (num >= 1 && num <= 15) {
        onChange(holeKey, num);
        haptic();
      }
      inputRef.current?.blur();
    }
  }, [localValue, holeKey, onChange]);

  return (
    <div className="relative flex flex-col items-center">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={`Score for hole ${holeNum}`}
        className={`
          w-11 h-11 text-center text-base font-semibold rounded-md border
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
          transition-colors duration-100
          ${locked 
            ? "bg-slate-50 text-slate-600 border-slate-200 cursor-default" 
            : lowScoreBg ? `${lowScoreBg} border-slate-200 hover:border-slate-300` : "bg-white border-slate-200 hover:border-slate-300"
          }
        `}
        value={localValue}
        disabled={locked}
        onFocus={handleFocus}
        onChange={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
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
