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
import { computeSkins, computeCumulative, computeHeadToHead } from "../utils/sideGames";
import { ScorecardTableHeader } from "../components/group/ScorecardTableHeader";
import { ScoreDisplayCell } from "../components/group/ScoreDisplayCell";
import { SCORECARD_CELL_WIDTH, SCORECARD_LABEL_WIDTH, SCORECARD_TOTAL_COL_WIDTH } from "../constants";
import type { SideGameConfig, CourseDoc } from "../types";

type MainTab = "skins" | "cum";

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

  const skinsGames = sideGames.filter((g) => g.type === "skins");
  const cumGames = sideGames.filter((g) => g.type === "cumulative");

  const hasSkins = skinsGames.length > 0;
  const hasCum = cumGames.length > 0;

  const [activeTab, setActiveTab] = useState<MainTab>("skins");
  const [activeSkinsScoreType, setActiveSkinsScoreType] = useState<"gross" | "net">("gross");
  const [activeCumScoreType, setActiveCumScoreType] = useState<"gross" | "net">("gross");
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const effectiveRoundId = activeRoundId ?? rounds[0]?.id ?? null;

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

  const mainTabs: { id: MainTab; label: string }[] = [
    ...(hasSkins ? [{ id: "skins" as MainTab, label: "Skins" }] : []),
    ...(hasCum ? [{ id: "cum" as MainTab, label: "Cum." }] : []),
  ];

  return (
    <Layout title="Games" showBack tournamentLogo={tournament.tournamentLogo}>
      {/* 2 top-level tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 mb-4">
        {mainTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md py-2 px-3 text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Gross/Net sub-tabs for Skins */}
      {activeTab === "skins" && skinsGames.length > 1 && (
        <div className="flex gap-1 rounded-lg bg-slate-50 border border-slate-200 p-1 mb-4">
          {(["gross", "net"] as const).map((st) => {
            const game = skinsGames.find((g) => g.scoreType === st);
            if (!game) return null;
            return (
              <button
                key={st}
                onClick={() => setActiveSkinsScoreType(st)}
                className={`flex-1 rounded-md py-1.5 px-3 text-xs font-semibold transition-all capitalize ${
                  activeSkinsScoreType === st
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
      )}

      {/* Gross/Net sub-tabs for Cumulative */}
      {activeTab === "cum" && cumGames.length > 1 && (
        <div className="flex gap-1 rounded-lg bg-slate-50 border border-slate-200 p-1 mb-4">
          {(["gross", "net"] as const).map((st) => {
            const game = cumGames.find((g) => g.scoreType === st);
            if (!game) return null;
            return (
              <button
                key={st}
                onClick={() => setActiveCumScoreType(st)}
                className={`flex-1 rounded-md py-1.5 px-3 text-xs font-semibold transition-all capitalize ${
                  activeCumScoreType === st
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
      )}

      {/* Round selector (skins only — cumulative manages its own day tabs) */}
      {activeTab === "skins" && rounds.length > 1 && (
        <div className="mb-4">
          <RoundTabs
            rounds={rounds}
            selectedRoundId={effectiveRoundId ?? ""}
            onSelect={setActiveRoundId}
          />
        </div>
      )}

      {groupsLoading && (
        <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Loading scores...</div>
      )}

      {!groupsLoading && activeTab === "skins" && (
        <SkinsTabView
          games={skinsGames}
          allGroups={allGroups}
          rounds={rounds}
          activeRoundId={effectiveRoundId}
          activeScoreType={activeSkinsScoreType}
        />
      )}

      {!groupsLoading && activeTab === "cum" && (
        <CumTabView
          games={cumGames}
          allGroups={allGroups}
          holeParsByRound={holeParsByRound}
          activeScoreType={activeCumScoreType}
          rounds={rounds}
        />
      )}
    </Layout>
  );
}

// ============================================================================
// TAB WRAPPERS
// ============================================================================

import type { GroupDoc, RoundDoc } from "../types";
import type { SkinsResult, HeadToHeadResult } from "../utils/sideGames";

/** Shows the selected skins game (gross or net) for the selected round */
function SkinsTabView({
  games,
  allGroups,
  rounds,
  activeRoundId,
  activeScoreType,
}: {
  games: SideGameConfig[];
  allGroups: GroupDoc[];
  rounds: RoundDoc[];
  activeRoundId: string | null;
  activeScoreType: "gross" | "net";
}) {
  if (games.length === 0) {
    return <div className="text-center py-10 text-slate-400 text-sm">No skins games configured</div>;
  }

  // If only one game, show it; otherwise pick by score type
  const game = games.length === 1
    ? games[0]
    : games.find((g) => g.scoreType === activeScoreType) ?? games[0];

  if (!game) {
    return <div className="text-center py-10 text-slate-400 text-sm">No skins games configured</div>;
  }

  return <SkinsView game={game} allGroups={allGroups} rounds={rounds} externalRoundId={activeRoundId} />;
}

/** Shows the selected cumulative game (gross or net) */
function CumTabView({
  games,
  allGroups,
  holeParsByRound,
  activeScoreType,
  rounds,
}: {
  games: SideGameConfig[];
  allGroups: GroupDoc[];
  holeParsByRound: Record<string, number[]>;
  activeScoreType: "gross" | "net";
  rounds: RoundDoc[];
}) {
  const [activeDayTab, setActiveDayTab] = useState<string>("total");

  // If only one game, show it; otherwise pick by score type
  const game = games.length === 1
    ? games[0]
    : games.find((g) => g.scoreType === activeScoreType) ?? games[0];

  const isGross = game?.scoreType === "gross";

  // For gross: filter groups by selected day/round; for net: always show all (total)
  const filteredGroups = useMemo(() => {
    if (!isGross || activeDayTab === "total") return allGroups;
    return allGroups.filter((g) => g.roundId === activeDayTab);
  }, [allGroups, activeDayTab, isGross]);

  const filteredHolePars = useMemo(() => {
    if (!isGross || activeDayTab === "total") return holeParsByRound;
    const roundPars = holeParsByRound[activeDayTab];
    return roundPars ? { [activeDayTab]: roundPars } : {};
  }, [holeParsByRound, activeDayTab, isGross]);

  if (!game) {
    return <div className="text-center py-10 text-slate-400 text-sm">No cumulative games configured</div>;
  }

  return (
    <div>
      {/* Day tabs for gross cumulative (net only shows total) */}
      {isGross && rounds.length > 1 && (
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 mb-4">
          {rounds.map((round) => (
            <button
              key={round.id}
              onClick={() => setActiveDayTab(round.id)}
              className={`flex-1 rounded-md py-2 px-3 text-sm font-semibold transition-all ${
                activeDayTab === round.id
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Day {round.day ?? "?"}
            </button>
          ))}
          <button
            onClick={() => setActiveDayTab("total")}
            className={`flex-1 rounded-md py-2 px-3 text-sm font-semibold transition-all ${
              activeDayTab === "total"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Total
          </button>
        </div>
      )}

      <CumulativeView game={game} allGroups={filteredGroups} holeParsByRound={filteredHolePars} />
    </div>
  );
}

// ============================================================================
// SKINS VIEW
// ============================================================================

function SkinsView({
  game,
  allGroups,
  rounds,
  externalRoundId,
}: {
  game: SideGameConfig;
  allGroups: GroupDoc[];
  rounds: RoundDoc[];
  externalRoundId?: string | null;
}) {
  const activeRoundId = externalRoundId ?? rounds[0]?.id;

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

// ============================================================================
// HEAD-TO-HEAD VIEW
// ============================================================================

export function HeadToHeadView({
  game,
  allGroups,
  rounds,
}: {
  game: SideGameConfig;
  allGroups: GroupDoc[];
  rounds: RoundDoc[];
}) {
  const { tournament, getCourse } = useTournamentContext();
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const activeRoundId = selectedRoundId ?? rounds[0]?.id;

  // If perRound, filter groups to selected round; otherwise use all
  const groups = useMemo(
    () => game.perRound
      ? allGroups.filter((g) => g.roundId === activeRoundId)
      : allGroups,
    [allGroups, activeRoundId, game.perRound]
  );

  const result: HeadToHeadResult = useMemo(
    () => computeHeadToHead(
      groups,
      game.playerIds as [string, string],
      game.scoreType,
      game.betFront ?? 0,
      game.betBack ?? 0,
      game.betTotal ?? 0
    ),
    [groups, game.playerIds, game.scoreType, game.betFront, game.betBack, game.betTotal]
  );

  const totalBet = (game.betFront ?? 0) + (game.betBack ?? 0) + (game.betTotal ?? 0);

  // Fetch course data for scorecard header
  const [course, setCourse] = useState<CourseDoc | null>(null);
  useEffect(() => {
    const activeRound = rounds.find((r) => r.id === activeRoundId);
    const courseId = activeRound?.courseId || tournament?.courseId;
    if (!courseId) return;
    getCourse(courseId).then(setCourse);
  }, [activeRoundId, rounds, tournament?.courseId, getCourse]);

  // Build hole data for scorecard header
  const holeData = useMemo(() => {
    if (!course?.holes) return [];
    return course.holes.map((h) => ({
      k: String(h.number),
      num: h.number,
      par: h.par,
      hcpIndex: h.hcpIndex,
      yards: h.yards,
    }));
  }, [course]);

  const parTotals = useMemo(() => {
    if (!holeData.length) return { parOut: 0, parIn: 0, parTotal: 0 };
    const parOut = holeData.slice(0, 9).reduce((s, h) => s + h.par, 0);
    const parIn = holeData.slice(9, 18).reduce((s, h) => s + h.par, 0);
    return { parOut, parIn, parTotal: parOut + parIn };
  }, [holeData]);

  // Extract per-hole scores for each player from group data
  const playerScoreData = useMemo(() => {
    const playerIds = game.playerIds as [string, string];
    const data: { playerId: string; displayName: string; grossScores: Record<string, number | null>; strokesReceived: number[]; courseHandicap: number; teeSetName?: string }[] = [];

    for (const pid of playerIds) {
      const scores: Record<string, number | null> = {};
      let name = pid;
      let strokes: number[] = [];
      let courseHcap = 0;
      let teeName: string | undefined;

      for (const g of groups) {
        for (let i = 0; i < g.players.length; i++) {
          const p = g.players[i];
          if (p.playerId !== pid) continue;
          name = p.displayName;
          strokes = p.strokesReceived || [];
          courseHcap = p.courseHandicap;
          teeName = p.teeSetName;

          for (let h = 1; h <= 18; h++) {
            const key = String(h);
            const holeData = g.holes?.[key];
            if (!holeData) continue;
            const rawScore = holeData.gross?.[i] ?? null;
            if (rawScore != null) scores[key] = rawScore;
          }
        }
      }

      data.push({ playerId: pid, displayName: name, grossScores: scores, strokesReceived: strokes, courseHandicap: courseHcap, teeSetName: teeName });
    }

    return data;
  }, [groups, game.playerIds]);

  // Get team info for coloring
  const getTeamColor = (playerId: string): string => {
    if (!tournament) return "#64748b";
    for (const g of groups) {
      for (const p of g.players) {
        if (p.playerId === playerId) {
          const team = tournament.teams[p.teamIndex];
          return team?.color || "#64748b";
        }
      }
    }
    return "#64748b";
  };

  const cellWidth = SCORECARD_CELL_WIDTH;
  const labelWidth = SCORECARD_LABEL_WIDTH;
  const totalColWidth = SCORECARD_TOTAL_COL_WIDTH;

  return (
    <div>
      {/* Round selector */}
      {game.perRound && rounds.length > 1 && (
        <div className="mb-4">
          <RoundTabs
            rounds={rounds}
            selectedRoundId={activeRoundId ?? ""}
            onSelect={setSelectedRoundId}
          />
        </div>
      )}

      {/* Matchup header */}
      <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <div>
            <div className="text-sm font-bold text-emerald-800">
              {result.player1.displayName} vs {result.player2.displayName}
            </div>
            <div className="text-xs text-emerald-600">
              {game.scoreType} / ${totalBet} total
            </div>
          </div>
        </div>
      </div>

      {/* Scorecard */}
      {holeData.length > 0 && (
        <div className="overflow-x-auto -mx-4 px-4 mb-6">
          <table className="border-collapse text-center text-sm" style={{ minWidth: "max-content" }}>
            <ScorecardTableHeader holes={holeData} totals={parTotals} />
            <tbody>
              {playerScoreData.map((pData) => {
                const teamColor = getTeamColor(pData.playerId);
                const firstName = pData.displayName.split(" ")[0];
                const holes = course?.holes || [];

                const front9 = holes.slice(0, 9).reduce((sum, h) => {
                  const v = pData.grossScores[String(h.number)];
                  return v != null ? sum + v : sum;
                }, 0);
                const back9 = holes.slice(9, 18).reduce((sum, h) => {
                  const v = pData.grossScores[String(h.number)];
                  return v != null ? sum + v : sum;
                }, 0);
                const total = front9 + back9;

                return (
                  <tr key={pData.playerId} className="border-b border-slate-200">
                    <td
                      className="sticky left-0 z-10 px-2 py-1.5"
                      style={{ width: labelWidth, minWidth: labelWidth, backgroundColor: "white" }}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: teamColor }} />
                        <div className="flex flex-col leading-tight">
                          <span className="text-xs font-semibold text-slate-800 truncate" style={{ maxWidth: labelWidth - 36 }}>
                            {firstName}
                          </span>
                          <span className="text-[0.6rem] text-slate-400">
                            ({pData.courseHandicap})
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Front 9 */}
                    {holes.slice(0, 9).map((h) => (
                      <td key={h.number} className="text-center" style={{ width: cellWidth, minWidth: cellWidth }}>
                        <ScoreDisplayCell
                          value={pData.grossScores[String(h.number)] ?? null}
                          par={h.par}
                          hasStroke={pData.strokesReceived?.[h.number - 1] === 1}
                          teamColor={teamColor}
                        />
                      </td>
                    ))}

                    <td
                      className="text-center text-xs font-bold text-slate-600 bg-slate-50 border-l-2 border-slate-200"
                      style={{ width: totalColWidth, minWidth: totalColWidth }}
                    >
                      {front9 || ""}
                    </td>

                    {/* Back 9 */}
                    {holes.slice(9, 18).map((h, i) => (
                      <td
                        key={h.number}
                        className={`text-center ${i === 0 ? "border-l-2 border-slate-200" : ""}`}
                        style={{ width: cellWidth, minWidth: cellWidth }}
                      >
                        <ScoreDisplayCell
                          value={pData.grossScores[String(h.number)] ?? null}
                          par={h.par}
                          hasStroke={pData.strokesReceived?.[h.number - 1] === 1}
                          teamColor={teamColor}
                        />
                      </td>
                    ))}

                    <td
                      className="text-center text-xs font-bold text-slate-600 bg-slate-50 border-l-2 border-slate-200"
                      style={{ width: totalColWidth, minWidth: totalColWidth }}
                    >
                      {back9 || ""}
                    </td>

                    <td
                      className="text-center text-xs font-bold text-slate-800 bg-slate-100"
                      style={{ width: totalColWidth, minWidth: totalColWidth }}
                    >
                      {total || ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Segment results */}
      <section className="space-y-2 mb-6">
        {result.segments.map((seg) => (
          <Card key={seg.segment}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {seg.label}
                </span>
                <span className="text-xs text-slate-400">${seg.bet} bet</span>
              </div>
              <div className="flex items-center justify-between">
                {/* Player 1 */}
                <div className="text-center flex-1">
                  <div className="text-xs text-slate-400 mb-0.5 truncate">{result.player1.displayName}</div>
                  <div className={`text-xl font-bold ${seg.complete && seg.winnerId === result.player1.playerId ? "text-emerald-600" : "text-slate-800"}`}>
                    {seg.player1Completed > 0 ? seg.player1Score : "\u2014"}
                  </div>
                  <div className="text-[0.65rem] text-slate-400">
                    {seg.player1Completed}/{seg.holesInSegment} holes
                  </div>
                </div>

                {/* Result */}
                <div className="text-center px-3">
                  {seg.complete ? (
                    seg.tied ? (
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 rounded-full px-2.5 py-1">PUSH</span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1">
                        {seg.winnerName?.split(" ")[0]} wins
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-slate-300">vs</span>
                  )}
                </div>

                {/* Player 2 */}
                <div className="text-center flex-1">
                  <div className="text-xs text-slate-400 mb-0.5 truncate">{result.player2.displayName}</div>
                  <div className={`text-xl font-bold ${seg.complete && seg.winnerId === result.player2.playerId ? "text-emerald-600" : "text-slate-800"}`}>
                    {seg.player2Completed > 0 ? seg.player2Score : "\u2014"}
                  </div>
                  <div className="text-[0.65rem] text-slate-400">
                    {seg.player2Completed}/{seg.holesInSegment} holes
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Settlement */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Settlement</h3>
        <Card>
          <CardContent className="py-3 px-4 space-y-1.5">
            {[result.player1, result.player2].map((p) => (
              <div key={p.playerId} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-800">{p.displayName}</span>
                  <span className="text-xs text-slate-400 ml-2">
                    {p.segmentsWon}W {p.segmentsLost}L {p.segmentsTied}T
                  </span>
                </div>
                <span className={`text-sm font-bold ${
                  p.totalEarnings > 0 ? "text-emerald-600" : p.totalEarnings < 0 ? "text-red-500" : "text-slate-400"
                }`}>
                  {p.totalEarnings > 0 ? `+$${p.totalEarnings}` : p.totalEarnings < 0 ? `-$${Math.abs(p.totalEarnings)}` : "$0"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
