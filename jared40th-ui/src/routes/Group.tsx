/**
 * Group Scorecard Page - The main scoring interface for a 4-player group.
 * Displays a horizontal scrolling scorecard with score input for each player.
 */

import { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useGroupData } from "../hooks/useGroupData";
import { useDebouncedSave } from "../hooks/useDebouncedSave";
import { computeGroupScoring } from "../utils/ninesScoring";
import { ScorecardTableHeader } from "../components/group/ScorecardTableHeader";
import { GroupScoreRow } from "../components/group/GroupScoreRow";
import Layout from "../components/Layout";
import { SaveStatusIndicator } from "../components/SaveStatusIndicator";
import type { HoleScores } from "../types";

export default function Group() {
  const { groupId } = useParams<{ groupId: string }>();
  const { group, course, tournament, loading, error } = useGroupData(groupId);

  // Save function for debounced writes
  const saveFn = useCallback(
    async (_key: string, data: Record<string, HoleScores>) => {
      if (!groupId) return;
      await updateDoc(doc(db, "groups", groupId), data);
    },
    [groupId]
  );

  const { debouncedSave, saveStatus } = useDebouncedSave(saveFn);

  // Handle score change from a cell
  const handleScoreChange = useCallback(
    (holeKey: string, playerIndex: number, value: number | null) => {
      if (!group) return;

      // Build updated gross array
      const currentHole = group.holes[holeKey] || { gross: [null, null, null, null] };
      const newGross = [...currentHole.gross] as [number | null, number | null, number | null, number | null];
      newGross[playerIndex] = value;

      // Write just the gross scores (Cloud Function computes the rest)
      const update = { [`holes.${holeKey}.gross`]: newGross };
      debouncedSave(holeKey, update as any);
    },
    [group, debouncedSave]
  );

  // Compute nines scoring client-side for instant display
  const scoring = useMemo(() => {
    if (!group) return null;
    return computeGroupScoring(group.holes, group.players);
  }, [group]);

  // Build hole data array from course
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

  // Get team info from tournament
  const getTeamForPlayer = (teamIndex: number) => {
    if (!tournament?.teams) return { color: "#64748b", name: "Team" };
    const team = tournament.teams[teamIndex];
    return team ? { color: team.color, name: team.name } : { color: "#64748b", name: "Team" };
  };

  if (loading) {
    return (
      <Layout title="Loading..." showBack>
        <div className="flex items-center justify-center py-20 text-slate-400">Loading...</div>
      </Layout>
    );
  }

  if (error || !group) {
    return (
      <Layout title="Group" showBack>
        <div className="flex items-center justify-center py-20 text-red-500">{error || "Group not found"}</div>
      </Layout>
    );
  }

  const title = `Group ${group.groupNumber}`;

  return (
    <Layout title={title} showBack tournamentLogo={tournament?.tournamentLogo}>
      {/* Header with group info */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Group {group.groupNumber}</h2>
            <p className="text-xs text-slate-500">
              {course?.name || ""}
              {course?.tees ? ` - ${course.tees}` : ""}
            </p>
          </div>
          <div className="text-right">
            <SaveStatusIndicator status={saveStatus} />
          </div>
        </div>

        {/* Player summary cards */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          {group.players.map((p, i) => {
            const { color, name } = getTeamForPlayer(p.teamIndex);
            const pts = scoring?.playerTotals[i] ?? group.computed?.playerPoints[i] ?? 0;
            return (
              <div
                key={p.playerId}
                className="flex items-center gap-2 rounded-lg border px-3 py-2"
                style={{ borderColor: `color-mix(in srgb, ${color} 30%, transparent)` }}
              >
                <div className="w-2 h-8 rounded-full" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-700 truncate">{p.displayName}</div>
                  <div className="text-[0.6rem] text-slate-400">
                    {name}
                    {p.teeSetName ? ` · ${p.teeSetName}` : ""}
                    {` (${p.courseHandicap})`}
                  </div>
                </div>
                <div className="text-lg font-bold" style={{ color }}>
                  {pts % 1 === 0 ? pts : pts.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable Scorecard */}
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="border-collapse text-center text-sm" style={{ minWidth: "max-content" }}>
          <ScorecardTableHeader holes={holeData} totals={parTotals} courseTees={course?.tees} />
          <tbody>
            {group.players.map((player, i) => {
              const { color, name } = getTeamForPlayer(player.teamIndex);

              // Build per-hole data for this player
              const grossScores: Record<string, number | null> = {};
              const netScores: Record<string, number | null> = {};
              const ninesPoints: Record<string, number> = {};

              for (let h = 1; h <= 18; h++) {
                const key = String(h);
                const holeScores = group.holes[key];
                grossScores[key] = holeScores?.gross?.[i] ?? null;
                netScores[key] = scoring?.holeNet[key]?.[i] ?? holeScores?.net?.[i] ?? null;
                ninesPoints[key] = scoring?.holePoints[key]?.[i] ?? holeScores?.points?.[i] ?? 0;
              }

              const runningTotal = scoring?.playerTotals[i] ?? group.computed?.playerPoints[i] ?? 0;

              return (
                <GroupScoreRow
                  key={player.playerId}
                  player={player}
                  playerIndex={i}
                  holes={course?.holes || []}
                  grossScores={grossScores}
                  netScores={netScores}
                  ninesPoints={ninesPoints}
                  runningPointTotal={runningTotal}
                  teamColor={color}
                  teamName={name}
                  onChange={handleScoreChange}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
