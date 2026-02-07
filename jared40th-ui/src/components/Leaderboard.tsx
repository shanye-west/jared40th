import type { TournamentDoc } from "../types";

type LeaderboardProps = {
  tournament: TournamentDoc;
};

export function Leaderboard({ tournament }: LeaderboardProps) {
  const { teams, scoreboard } = tournament;
  const totals = scoreboard?.teamTotals || [0, 0, 0, 0];
  const holesCompleted = scoreboard?.holesCompleted || 0;
  const totalHoles = scoreboard?.totalHoles || 72;

  // Sort teams by points (descending)
  const ranked = teams
    .map((team, i) => ({ team, points: totals[i], index: i }))
    .sort((a, b) => b.points - a.points);

  const maxPoints = ranked[0]?.points || 1;

  return (
    <div className="space-y-3">
      {/* Team Cards */}
      {ranked.map(({ team, points }, rank) => (
        <div
          key={team.id}
          className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          {/* Color accent bar */}
          <div
            className="absolute inset-y-0 left-0 w-1.5"
            style={{ backgroundColor: team.color }}
          />

          <div className="pl-5 pr-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Rank badge */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: team.color }}
              >
                {rank + 1}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">{team.name}</div>
                <div className="text-xs text-slate-400">{team.playerIds.length} players</div>
              </div>
            </div>

            {/* Points */}
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: team.color }}>
                {points % 1 === 0 ? points : points.toFixed(1)}
              </div>
              <div className="text-[0.6rem] uppercase tracking-wider text-slate-400">pts</div>
            </div>
          </div>

          {/* Points bar */}
          <div className="px-5 pb-2">
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: maxPoints > 0 ? `${(points / maxPoints) * 100}%` : "0%",
                  backgroundColor: team.color,
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
