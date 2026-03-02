/**
 * Games page - Shows optional side games: Gross/Net Skins and Gross/Net Cumulative.
 */

import { useState, useMemo, useEffect } from "react";
import { Trophy, DollarSign } from "lucide-react";
import { useTournamentContext } from "../contexts/TournamentContext";
import { useGroupListData } from "../hooks/useGroupListData";
import { useRounds } from "../hooks/useRounds";
import { RoundTabs } from "../components/RoundTabs";
import Layout from "../components/Layout";
import { Card, CardContent } from "../components/ui/card";
import { computeSkins, computeCumulative } from "../utils/sideGames";
import type { SideGameConfig } from "../types";

export default function Games() {
  const { tournament, loading, getCourse } = useTournamentContext();
  const { groups: allGroups, loading: groupsLoading } = useGroupListData(tournament?.id);
  const { rounds } = useRounds(tournament?.roundIds);

  // Build hole pars map: roundId → 18-element array of par values per hole
  const [holeParsByRound, setHoleParsByRound] = useState<Record<string, number[]>>({});

  useEffect(() => {
    if (!rounds.length) return;

    const fetchPars = async () => {
      const result: Record<string, number[]> = {};
      for (const round of rounds) {
        const courseId = round.courseId || tournament?.courseId;
        if (!courseId) continue;
        const course = await getCourse(courseId);
        if (course?.holes?.length === 18) {
          result[round.id] = course.holes.map((h) => h.par);
        }
      }
      setHoleParsByRound(result);
    };

    fetchPars();
  }, [rounds, tournament?.courseId, getCourse]);

  const sideGames = tournament?.sideGames ?? [];
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  // Default to first game
  const selectedGame = sideGames.find((g) => g.id === activeGameId) ?? sideGames[0] ?? null;

  if (loading || !tournament) {
    return (
      <Layout title="Games" showBack>
        <div className="flex items-center justify-center py-20 text-slate-400">Loading...</div>
      </Layout>
    );
  }

  if (sideGames.length === 0) {
    return (
      <Layout title="Games" showBack tournamentLogo={tournament.tournamentLogo}>
        <div className="flex items-center justify-center py-20 text-slate-400">No side games configured</div>
      </Layout>
    );
  }

  return (
    <Layout title="Games" showBack tournamentLogo={tournament.tournamentLogo}>
      {/* Game selector tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 mb-4 overflow-x-auto">
        {sideGames.map((game) => {
          const isActive = game.id === (selectedGame?.id ?? "");
          return (
            <button
              key={game.id}
              onClick={() => setActiveGameId(game.id)}
              className={`flex-1 min-w-0 rounded-md py-2 px-2 text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {game.name}
            </button>
          );
        })}
      </div>

      {/* Game content */}
      {selectedGame && !groupsLoading && (
        selectedGame.type === "skins" ? (
          <SkinsView
            game={selectedGame}
            allGroups={allGroups}
            rounds={rounds}
          />
        ) : (
          <CumulativeView
            game={selectedGame}
            allGroups={allGroups}
            holeParsByRound={holeParsByRound}
          />
        )
      )}

      {groupsLoading && (
        <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Loading scores...</div>
      )}
    </Layout>
  );
}

// ============================================================================
// SKINS VIEW
// ============================================================================

import type { GroupDoc, RoundDoc } from "../types";
import type { SkinsResult } from "../utils/sideGames";

function SkinsView({
  game,
  allGroups,
  rounds,
}: {
  game: SideGameConfig;
  allGroups: GroupDoc[];
  rounds: RoundDoc[];
}) {
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const activeRoundId = selectedRoundId ?? rounds[0]?.id;

  // Filter groups for selected round
  const roundGroups = useMemo(
    () => allGroups.filter((g) => g.roundId === activeRoundId),
    [allGroups, activeRoundId]
  );

  const result: SkinsResult = useMemo(
    () => computeSkins(roundGroups, game.playerIds, game.scoreType, game.pot),
    [roundGroups, game.playerIds, game.scoreType, game.pot]
  );

  return (
    <div>
      {/* Round selector */}
      {rounds.length > 1 && (
        <div className="mb-4">
          <RoundTabs
            rounds={rounds}
            selectedRoundId={activeRoundId ?? ""}
            onSelect={setSelectedRoundId}
          />
        </div>
      )}

      {/* Pot info header */}
      <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <div>
            <div className="text-sm font-bold text-emerald-800">
              ${game.pot} Pot
            </div>
            <div className="text-xs text-emerald-600">
              {result.totalSkinsAwarded} skin{result.totalSkinsAwarded !== 1 ? "s" : ""} awarded
              {result.totalSkinsAwarded > 0 && ` \u00B7 $${result.valuePerSkin.toFixed(2)}/skin`}
            </div>
          </div>
        </div>
        <div className="text-xs text-emerald-500">{game.playerIds.length} players</div>
      </div>

      {/* Player leaderboard */}
      <section className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Leaderboard</h3>
        <div className="space-y-1.5">
          {result.players.filter((p) => p.skinsWon > 0).map((p, rank) => (
            <Card key={p.playerId}>
              <CardContent className="py-2.5 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                      {rank + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{p.displayName}</div>
                      <div className="text-xs text-slate-400">
                        {p.skinsWon} skin{p.skinsWon !== 1 ? "s" : ""}
                        {p.holesWon.length > 0 && (
                          <span> &middot; Hole{p.holesWon.length > 1 ? "s" : ""} {p.holesWon.join(", ")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-600">
                      {p.earnings > 0 ? `$${p.earnings.toFixed(2)}` : "\u2014"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {result.players.every((p) => p.skinsWon === 0) && (
            <div className="text-center py-6 text-slate-400 text-sm">No skins won yet</div>
          )}
        </div>
      </section>

      {/* Hole-by-hole results */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Hole by Hole</h3>
        <div className="space-y-1">
          {result.holes.map((h) => (
            <div
              key={h.holeNumber}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                  {h.holeNumber}
                </div>
                <div>
                  {h.winnerId ? (
                    <div className="text-sm font-semibold text-slate-800">
                      <Trophy className="inline h-3.5 w-3.5 text-amber-500 mr-1" />
                      {h.winnerName}
                    </div>
                  ) : h.allCompleted && h.tiedCount > 1 ? (
                    <div className="text-sm text-slate-600">
                      {h.tiedCount} tied &mdash; no skin
                    </div>
                  ) : h.playersCompleted > 0 ? (
                    <div className="text-sm text-slate-600">
                      {h.tiedCount > 1
                        ? `${h.tiedCount} tied`
                        : h.leadingName ? `${h.leadingName} leads` : "In progress"}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-300">Waiting for scores</div>
                  )}
                  {h.playersCompleted > 0 && (
                    <div className="text-xs text-slate-400">
                      {h.allCompleted
                        ? "All players complete"
                        : `${h.playersCompleted} of ${h.totalPlayers} complete`}
                    </div>
                  )}
                </div>
              </div>
              {h.leadingScore != null && h.playersCompleted > 0 && (
                <div className="text-xs font-semibold text-slate-500">
                  {h.leadingScore}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// CUMULATIVE VIEW
// ============================================================================

function CumulativeView({
  game,
  allGroups,
  holeParsByRound,
}: {
  game: SideGameConfig;
  allGroups: GroupDoc[];
  holeParsByRound: Record<string, number[]>;
}) {
  const result = useMemo(
    () => computeCumulative(allGroups, game.playerIds, game.scoreType, holeParsByRound),
    [allGroups, game.playerIds, game.scoreType, holeParsByRound]
  );

  return (
    <div>
      {/* Pot info */}
      <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <div>
            <div className="text-sm font-bold text-emerald-800">
              ${game.pot} Pot
            </div>
            <div className="text-xs text-emerald-600">Lowest {game.scoreType} total wins</div>
          </div>
        </div>
        <div className="text-xs text-emerald-500">{game.playerIds.length} players</div>
      </div>

      {/* Player standings */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Standings</h3>
        <div className="space-y-1.5">
          {result.players.map((p, rank) => {
            const toParStr = p.toPar === 0 ? "E" : p.toPar > 0 ? `+${p.toPar}` : String(p.toPar);
            return (
              <Card key={p.playerId}>
                <CardContent className="py-2.5 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                        {rank + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{p.displayName}</div>
                        <div className="text-xs text-slate-400">
                          Thru {p.holesCompleted} holes
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-800">{p.totalScore}</div>
                      <div className={`text-xs font-semibold ${
                        p.toPar < 0 ? "text-red-500" : p.toPar > 0 ? "text-slate-500" : "text-emerald-500"
                      }`}>
                        {toParStr}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {result.players.length === 0 && (
            <div className="text-center py-6 text-slate-400 text-sm">No players in this game</div>
          )}
        </div>
      </section>
    </div>
  );
}
