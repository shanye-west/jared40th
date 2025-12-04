import { memo } from "react";
import type { SaveStatus } from "../hooks/useDebouncedSave";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
}

/**
 * Shows save status feedback for score entries.
 * Displays: nothing (idle), "Saving..." (pending/saving), "Saved ✓" (saved), "Error" (error)
 */
export const SaveStatusIndicator = memo(function SaveStatusIndicator({ 
  status 
}: SaveStatusIndicatorProps) {
  if (status === "idle") {
    return null;
  }
  
  return (
    <div 
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
        transition-opacity duration-200
        ${status === "saved" ? "bg-green-100 text-green-700" : ""}
        ${status === "error" ? "bg-red-100 text-red-700" : ""}
        ${status === "pending" || status === "saving" ? "bg-slate-100 text-slate-500" : ""}
      `}
      role="status"
      aria-live="polite"
    >
      {(status === "pending" || status === "saving") && (
        <>
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></span>
          <span>Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <span>Saved</span>
          <span className="text-green-600">✓</span>
        </>
      )}
      {status === "error" && (
        <>
          <span>Save failed</span>
          <span className="text-red-600">✕</span>
        </>
      )}
    </div>
  );
});

export default SaveStatusIndicator;
