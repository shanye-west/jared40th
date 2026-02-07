import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { ArrowRight, RefreshCw, X } from "lucide-react";
import { useTournamentContext } from "./contexts/TournamentContext";
import { useGroupListData } from "./hooks/useGroupListData";
import Layout from "./components/Layout";
import { Leaderboard } from "./components/Leaderboard";
import { ViewTransitionLink } from "./components/ViewTransitionLink";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";

export default function App() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  // PWA update handler
  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      setShowUpdatePrompt(true);
    },
    onRegisteredSW(_swUrl: string, r: ServiceWorkerRegistration | undefined) {
      if (r) {
        setInterval(() => {
          r.update();
        }, 60000);
      }
    },
  });

  const { tournament, loading, error } = useTournamentContext();
  const { groups, loading: groupsLoading } = useGroupListData(tournament?.id);

  if (loading) {
    return (
      <Layout title="Loading...">
        <div className="flex items-center justify-center py-20 text-slate-400">Loading tournament...</div>
      </Layout>
    );
  }

  if (error || !tournament) {
    return (
      <Layout title="Nines Tournament">
        <div className="flex items-center justify-center py-20 text-slate-400">
          {error || "No active tournament found."}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={tournament.name} tournamentLogo={tournament.tournamentLogo}>
      {/* PWA Update Banner */}
      {showUpdatePrompt && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <RefreshCw className="h-4 w-4" />
            <span>New version available</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => updateServiceWorker(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Reload
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowUpdatePrompt(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <section className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Leaderboard</h2>
        <Leaderboard tournament={tournament} />
      </section>

      {/* Groups List */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Groups</h2>
          {!groupsLoading && (
            <span className="text-xs text-slate-400">{groups.length} groups</span>
          )}
        </div>

        {groupsLoading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">No groups yet</div>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => {
              const completed = g.computed?.holesCompleted ?? 0;
              return (
                <ViewTransitionLink key={g.id} to={`/group/${g.id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-800">Group {g.groupNumber}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {completed}/18 holes
                          </div>
                        </div>

                        {/* Mini player list with team colors */}
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-0.5">
                            {g.players.map((p, i) => {
                              const team = tournament.teams[p.teamIndex];
                              const pts = g.computed?.playerPoints?.[i] ?? 0;
                              return (
                                <div key={p.playerId} className="flex items-center gap-1.5 text-xs">
                                  <div
                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: team?.color || "#94a3b8" }}
                                  />
                                  <span className="text-slate-600 truncate" style={{ maxWidth: 80 }}>
                                    {p.displayName.split(" ")[0]}
                                  </span>
                                  <span className="font-semibold" style={{ color: team?.color || "#64748b" }}>
                                    {pts % 1 === 0 ? pts : pts.toFixed(1)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-300" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ViewTransitionLink>
              );
            })}
          </div>
        )}
      </section>
    </Layout>
  );
}
