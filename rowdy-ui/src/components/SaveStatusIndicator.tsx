import { memo } from "react";
import type { SaveStatus } from "../hooks/useDebouncedSave";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  /** Whether the device is currently online */
  isOnline?: boolean;
}

/**
 * Shows save status feedback for score entries.
 * 
 * When online: "Saving..." → "Saved ✓"
 * When offline: "Saving..." → "Saved locally" (yellow)
 */
export const SaveStatusIndicator = memo(function SaveStatusIndicator({ 
  status,
  isOnline = true,
}: SaveStatusIndicatorProps) {
  // Don't show anything when idle
  if (status === "idle") {
    return null;
  }
  
  const showSaving = status === "pending" || status === "saving";
  const showSaved = status === "saved";
  const showError = status === "error";
  
  // When offline and saved, show "Saved locally" instead of "Saved"
  const showOfflineSaved = showSaved && !isOnline;
  const showOnlineSaved = showSaved && isOnline;
  
  return (
    <div 
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
        transition-opacity duration-200
        ${showOnlineSaved ? "bg-green-100 text-green-700" : ""}
        ${showOfflineSaved ? "bg-yellow-100 text-yellow-700" : ""}
        ${showError ? "bg-red-100 text-red-700" : ""}
        ${showSaving ? "bg-slate-100 text-slate-500" : ""}
      `}
      role="status"
      aria-live="polite"
    >
      {showSaving && (
        <>
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" />
          <span>Saving...</span>
        </>
      )}
      {showOnlineSaved && (
        <>
          <span>Saved</span>
          <span className="text-green-600">✓</span>
        </>
      )}
      {showOfflineSaved && (
        <>
          <span>Saved locally</span>
          <span className="text-yellow-600">○</span>
        </>
      )}
      {showError && (
        <>
          <span>Save failed</span>
          <span className="text-red-600">✕</span>
        </>
      )}
    </div>
  );
});

export default SaveStatusIndicator;

