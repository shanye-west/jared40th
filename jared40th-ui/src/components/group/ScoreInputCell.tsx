import { memo, useCallback, useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ScoreNumberPicker } from "./ScoreNumberPicker";

export interface ScoreInputCellProps {
  holeKey: string;
  holeNum: number;
  value: number | "";
  par: number;
  hasStroke: boolean;
  teamColor: string;
  onChange: (holeKey: string, value: number | null) => void;
}

export const ScoreInputCell = memo(function ScoreInputCell({
  holeKey,
  holeNum,
  value,
  par,
  hasStroke,
  teamColor,
  onChange,
}: ScoreInputCellProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ left: number; top: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const underPar = typeof value === "number" && par ? par - value : 0;
  const circleCount = underPar > 0 ? underPar : 0;
  const overPar = typeof value === "number" && par ? value - par : 0;
  const squareCount = overPar > 0 ? overPar : 0;

  const handleCellClick = useCallback(() => {
    setShowPicker(true);
  }, []);

  const handleSelect = useCallback(
    (num: number) => {
      onChange(holeKey, num);
      setShowPicker(false);
    },
    [holeKey, onChange]
  );

  const handleClear = useCallback(() => {
    onChange(holeKey, null);
    setShowPicker(false);
  }, [holeKey, onChange]);

  const handleClose = useCallback(() => {
    setShowPicker(false);
  }, []);

  useLayoutEffect(() => {
    if (showPicker && buttonRef.current) {
      const btnRect = buttonRef.current.getBoundingClientRect();
      setPickerPos({ left: window.innerWidth / 2, top: btnRect.bottom + 8 });
    } else {
      setPickerPos(null);
    }
  }, [showPicker]);

  return (
    <div className="relative flex flex-col items-center">
      <button
        type="button"
        aria-label={`Score for hole ${holeNum}${value ? `: ${value}` : ""}`}
        ref={buttonRef}
        className={`
          w-11 h-11 text-center text-base font-semibold rounded-md border
          transition-colors duration-100 select-none
          bg-white border-slate-200 hover:border-slate-300 active:bg-slate-100
          ${showPicker ? "ring-2 ring-blue-400 shadow-lg z-30 scale-[1.02]" : ""}
        `}
        onClick={handleCellClick}
        style={value !== "" ? { borderLeftColor: teamColor, borderLeftWidth: "3px" } : undefined}
      >
        {value !== "" ? value : ""}
      </button>

      {showPicker &&
        pickerPos &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: pickerPos.left,
              top: pickerPos.top,
              transform: "translateX(-50%)",
              zIndex: 9999,
            }}
          >
            <ScoreNumberPicker value={value} onSelect={handleSelect} onClear={handleClear} onClose={handleClose} />
          </div>,
          document.body
        )}

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
