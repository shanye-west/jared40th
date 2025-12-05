import { memo } from "react";
import type { SyncStatus } from "../hooks/useNetworkStatus";

interface ConnectionBannerProps {
  syncStatus: SyncStatus;
  pendingCount?: number;
}

/**
 * Persistent banner showing connection and sync status.
 * Only shows when there's something the user needs to know about.
 */
export const ConnectionBanner = memo(function ConnectionBanner({
  syncStatus,
  pendingCount = 0,
}: ConnectionBannerProps) {
  // Don't show banner when everything is normal
  if (syncStatus === "online") {
    return null;
  }

  const config = getBannerConfig(syncStatus, pendingCount);

  return (
    <div
      className={`
        flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium
        ${config.className}
      `}
      role="status"
      aria-live="polite"
    >
      <span>{config.icon}</span>
      <span>{config.message}</span>
      {config.showSpinner && (
        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
});

function getBannerConfig(syncStatus: SyncStatus, pendingCount: number) {
  switch (syncStatus) {
    case "offline":
      return {
        icon: "📶",
        message: "You're offline — viewing cached data",
        className: "bg-slate-100 text-slate-600",
        showSpinner: false,
      };

    case "offline-pending":
      return {
        icon: "📶",
        message: `Offline — ${pendingCount || "scores"} waiting to sync`,
        className: "bg-yellow-100 text-yellow-800",
        showSpinner: false,
      };

    case "syncing":
      return {
        icon: "☁️",
        message: "Syncing...",
        className: "bg-blue-50 text-blue-700",
        showSpinner: true,
      };

    case "cached":
      return {
        icon: "💾",
        message: "Viewing cached data",
        className: "bg-slate-50 text-slate-500",
        showSpinner: false,
      };

    default:
      return {
        icon: "",
        message: "",
        className: "",
        showSpinner: false,
      };
  }
}

export default ConnectionBanner;
