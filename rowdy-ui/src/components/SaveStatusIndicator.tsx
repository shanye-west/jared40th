import { memo } from "react";
import type { SaveStatus } from "../hooks/useDebouncedSave";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  /** Whether the device is currently online */
  isOnline?: boolean;
  /** Whether there are pending writes waiting to sync to server */
  hasPendingWrites?: boolean;
}

/**
 * Shows save status feedback for score entries.
 * 
 * When online:
 * - "Saving..." → "Synced ✓"
 * 
 * When offline:
 * - "Saving..." → "Saved locally" (yellow, indicates needs sync)
 * 
 * When syncing pending writes:
 * - "Syncing..."
 */
export const SaveStatusIndicator = memo(function SaveStatusIndicator({ 
  status,
  isOnline = true,
  hasPendingWrites = false,
}: SaveStatusIndicatorProps) {
  // Don't show anything when idle and no pending writes
  if (status === "idle" && !hasPendingWrites) {
    return null;
  }
  
  // Determine display state
  const showSyncing = hasPendingWrites && isOnline && status === "idle";
  const showOfflineSaved = status === "saved" && !isOnline;
  const showSynced = status === "saved" && isOnline && !hasPendingWrites;
  const showSaving = status === "pending" || status === "saving";
  const showError = status === "error";
  
  return (
    <div 
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
        transition-opacity duration-200
        ${showSynced ? "bg-green-100 text-green-700" : ""}
        ${showOfflineSaved ? "bg-yellow-100 text-yellow-700" : ""}
        ${showError ? "bg-red-100 text-red-700" : ""}
        ${showSaving || showSyncing ? "bg-slate-100 text-slate-500" : ""}
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
      {showSyncing && (
        <>
          <span className="w-2 h-2 border border-slate-400 border-t-transparent rounded-full animate-spin" />
          <span>Syncing...</span>
        </>
      )}
      {showSynced && (
        <>
          <span>Synced</span>
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

