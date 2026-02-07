/**
 * Teams page - Shows all 4 teams with their players and individual nines point contributions.
 */

import { useTournamentContext } from "../contexts/TournamentContext";
import { useGroupListData } from "../hooks/useGroupListData";
import Layout from "../components/Layout";

export default function Teams() {
  const { tournament, loading } = useTournamentContext();
  const { groups } = useGroupListData(tournament?.id);

  if (loading || !tournament) {
    return (
      <Layout title="Teams" showBack>
        <div className="flex items-center justify-center py-20 text-slate-400">Loading...</div>
      </Layout>
    );
  }

  // Build player points map from groups (accumulate across all rounds)
  const playerPointsMap: Record<string, number> = {};
  for (const g of groups) {
    for (let i = 0; i < g.players.length; i++) {
      const p = g.players[i];
      playerPointsMap[p.playerId] = (playerPointsMap[p.playerId] ?? 0) + (g.computed?.playerPoints?.[i] ?? 0);
    }
  }

  const totals = tournament.scoreboard?.teamTotals || [0, 0, 0, 0];

  // Sort teams by points (descending)
  const rankedTeams = tournament.teams
    .map((team, i) => ({ team, points: totals[i], index: i }))
    .sort((a, b) => b.points - a.points);

  return (
    <Layout title="Teams" showBack tournamentLogo={tournament.tournamentLogo}>
      <div className="space-y-6">
        {rankedTeams.map(({ team, points }, rank) => {
          // Find players for this team from groups (deduplicate across rounds)
          const teamIdx = tournament.teams.indexOf(team);
          const playerAccum: Record<string, { playerId: string; displayName: string; points: number; courseHandicap: number }> = {};
          for (const g of groups) {
            for (let i = 0; i < g.players.length; i++) {
              const p = g.players[i];
              if (p.teamIndex === teamIdx) {
                if (!playerAccum[p.playerId]) {
                  playerAccum[p.playerId] = {
                    playerId: p.playerId,
                    displayName: p.displayName,
                    points: 0,
                    courseHandicap: p.courseHandicap,
                  };
                }
                playerAccum[p.playerId].points += g.computed?.playerPoints?.[i] ?? 0;
              }
            }
          }
          const teamPlayers = Object.values(playerAccum).sort((a, b) => b.points - a.points);

          return (
            <div key={team.id} className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
              {/* Team Header */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: `color-mix(in srgb, ${team.color} 10%, white)` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: team.color }}
                  >
                    {rank + 1}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{team.name}</div>
                    <div className="text-xs text-slate-500">{teamPlayers.length} players</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{ color: team.color }}>
                    {points % 1 === 0 ? points : points.toFixed(1)}
                  </div>
                  <div className="text-[0.6rem] uppercase tracking-wider text-slate-400">total pts</div>
                </div>
              </div>

              {/* Player Rows */}
              <div className="divide-y divide-slate-100">
                {teamPlayers.map((p) => (
                  <div key={p.playerId} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-700">{p.displayName}</div>
                      <div className="text-xs text-slate-400">
                        Hcp {p.courseHandicap}
                      </div>
                    </div>
                    <div
                      className="text-lg font-bold"
                      style={{ color: team.color }}
                    >
                      {p.points % 1 === 0 ? p.points : p.points.toFixed(1)}
                    </div>
                  </div>
                ))}
                {teamPlayers.length === 0 && (
                  <div className="px-4 py-3 text-sm text-slate-400">No players assigned yet</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
