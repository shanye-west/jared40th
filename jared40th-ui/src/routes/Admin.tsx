import { useState, useLayoutEffect } from "react";
import { useLayout } from "../contexts/LayoutContext";
import { useTournamentContext } from "../contexts/TournamentContext";
import CoursesPanel from "./admin/CoursesPanel";
import RoundsPanel from "./admin/RoundsPanel";
import GroupsPanel from "./admin/GroupsPanel";
import GamesPanel from "./admin/GamesPanel";

const tabs = ["Courses", "Rounds", "Groups", "Games"] as const;
type Tab = (typeof tabs)[number];

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>("Courses");
  const { setConfig } = useLayout();
  const { tournament, loading } = useTournamentContext();

  useLayoutEffect(() => {
    setConfig({ title: "Admin Dashboard", showBack: true });
  }, [setConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner-lg" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {!tournament && activeTab !== "Courses" && (
        <div className="empty-state">
          <div className="empty-state-icon">--</div>
          <div className="empty-state-text">No active tournament found</div>
        </div>
      )}

      {/* Panel content */}
      {activeTab === "Courses" && <CoursesPanel />}
      {activeTab === "Rounds" && tournament && (
        <RoundsPanel tournament={tournament} />
      )}
      {activeTab === "Groups" && tournament && (
        <GroupsPanel tournament={tournament} />
      )}
      {activeTab === "Games" && tournament && (
        <GamesPanel tournament={tournament} />
      )}
    </div>
  );
}
