import { useState } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import type { TournamentDoc, SideGameConfig, SkinOverride } from "../../types";
import { useRounds } from "../../hooks/useRounds";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Plus, Trash2, Save, X, Pencil, ShieldX } from "lucide-react";

type Props = { tournament: TournamentDoc };

type GameForm = {
  name: string;
  type: "skins" | "cumulative" | "head-to-head";
  scoreType: "gross" | "net";
  pot: string;
  perRound: boolean;
  betFront: string;
  betBack: string;
  betTotal: string;
};

const emptyForm: GameForm = {
  name: "",
  type: "skins",
  scoreType: "net",
  pot: "0",
  perRound: false,
  betFront: "0",
  betBack: "0",
  betTotal: "0",
};

export default function GamesPanel({ tournament }: Props) {
  const games = tournament.sideGames ?? [];
  const { rounds } = useRounds(tournament.roundIds);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GameForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // All player IDs from all teams
  const allPlayers = tournament.teams.flatMap((t, ti) =>
    t.playerIds.map((pid) => ({ pid, teamIndex: ti, teamName: t.name, teamColor: t.color }))
  );
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [h2hPlayer1, setH2hPlayer1] = useState("");
  const [h2hPlayer2, setH2hPlayer2] = useState("");

  const saveGames = async (next: SideGameConfig[]) => {
    await updateDoc(doc(db, "tournaments", tournament.id), {
      sideGames: next,
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (form.type === "head-to-head" && (!h2hPlayer1 || !h2hPlayer2 || h2hPlayer1 === h2hPlayer2)) return;
    setSaving(true);

    const isH2H = form.type === "head-to-head";

    const entry: SideGameConfig = {
      id: editingId ?? crypto.randomUUID(),
      name: form.name.trim(),
      type: form.type,
      scoreType: form.scoreType,
      pot: isH2H ? 0 : Number(form.pot) || 0,
      perRound: form.perRound,
      playerIds: isH2H ? [h2hPlayer1, h2hPlayer2] : selectedPlayerIds,
      ...(isH2H && {
        betFront: Number(form.betFront) || 0,
        betBack: Number(form.betBack) || 0,
        betTotal: Number(form.betTotal) || 0,
      }),
    };

    let next: SideGameConfig[];
    if (editingId) {
      next = games.map((g) => (g.id === editingId ? entry : g));
    } else {
      next = [...games, entry];
    }

    await saveGames(next);
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    setSelectedPlayerIds([]);
    setH2hPlayer1("");
    setH2hPlayer2("");
    setSaving(false);
  };

  const handleEdit = (game: SideGameConfig) => {
    setForm({
      name: game.name,
      type: game.type,
      scoreType: game.scoreType,
      pot: game.pot.toString(),
      perRound: game.perRound,
      betFront: (game.betFront ?? 0).toString(),
      betBack: (game.betBack ?? 0).toString(),
      betTotal: (game.betTotal ?? 0).toString(),
    });
    if (game.type === "head-to-head") {
      setH2hPlayer1(game.playerIds?.[0] ?? "");
      setH2hPlayer2(game.playerIds?.[1] ?? "");
    } else {
      setSelectedPlayerIds(game.playerIds ?? []);
    }
    setEditingId(game.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this game?")) return;
    await saveGames(games.filter((g) => g.id !== id));
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    setSelectedPlayerIds([]);
    setH2hPlayer1("");
    setH2hPlayer2("");
  };

  const togglePlayer = (pid: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]
    );
  };

  const selectAll = () => {
    setSelectedPlayerIds(allPlayers.map((p) => p.pid));
  };

  return (
    <div className="space-y-3">
      {showForm ? (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-700">
            {editingId ? "Edit Game" : "New Game"}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-500">Name</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Skins (Net)"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Type</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as "skins" | "cumulative" | "head-to-head" })}
              >
                <option value="skins">Skins</option>
                <option value="cumulative">Cumulative</option>
                <option value="head-to-head">Head-to-Head</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Score Type</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.scoreType}
                onChange={(e) => setForm({ ...form, scoreType: e.target.value as "gross" | "net" })}
              >
                <option value="net">Net</option>
                <option value="gross">Gross</option>
              </select>
            </div>
            {form.type !== "head-to-head" && (
              <div>
                <label className="text-xs font-semibold text-slate-500">Pot ($)</label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.pot}
                  onChange={(e) => setForm({ ...form, pot: e.target.value })}
                />
              </div>
            )}
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.perRound}
                  onChange={(e) => setForm({ ...form, perRound: e.target.checked })}
                  className="rounded border-slate-300"
                />
                Per Round
              </label>
            </div>
          </div>

          {form.type === "head-to-head" ? (
            <>
              {/* Head-to-head: Player 1 & Player 2 dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Player 1</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={h2hPlayer1}
                    onChange={(e) => setH2hPlayer1(e.target.value)}
                  >
                    <option value="">Select...</option>
                    {allPlayers.filter((p) => p.pid !== h2hPlayer2).map(({ pid }) => (
                      <option key={pid} value={pid}>{pid}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Player 2</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={h2hPlayer2}
                    onChange={(e) => setH2hPlayer2(e.target.value)}
                  >
                    <option value="">Select...</option>
                    {allPlayers.filter((p) => p.pid !== h2hPlayer1).map(({ pid }) => (
                      <option key={pid} value={pid}>{pid}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bet amounts */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Front 9 ($)</label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={form.betFront}
                    onChange={(e) => setForm({ ...form, betFront: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Back 9 ($)</label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={form.betBack}
                    onChange={(e) => setForm({ ...form, betBack: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Total ($)</label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={form.betTotal}
                    onChange={(e) => setForm({ ...form, betTotal: e.target.value })}
                  />
                </div>
              </div>
            </>
          ) : (
            /* Player multi-select for skins/cumulative */
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-500">
                  Players ({selectedPlayerIds.length})
                </label>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Select All
                </button>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {allPlayers.map(({ pid, teamColor }) => (
                  <label
                    key={pid}
                    className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                      selectedPlayerIds.includes(pid)
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPlayerIds.includes(pid)}
                      onChange={() => togglePlayer(pid)}
                      className="rounded border-slate-300"
                    />
                    <span
                      className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: teamColor }}
                    />
                    <span className="truncate">{pid}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} disabled={saving || !form.name.trim() || (form.type === "head-to-head" && (!h2hPlayer1 || !h2hPlayer2 || h2hPlayer1 === h2hPlayer2))} size="sm">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="ghost" onClick={handleCancel} size="sm">
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setShowForm(true)} size="sm" className="w-full">
          <Plus className="h-4 w-4" />
          Add Game
        </Button>
      )}

      {games.length === 0 && !showForm && (
        <div className="empty-state">
          <div className="empty-state-text">No side games configured</div>
        </div>
      )}

      {games.map((game) => (
        <Card key={game.id} className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold text-slate-800">{game.name}</div>
              <div className="text-xs text-slate-500">
                {game.type === "skins" ? "Skins" : game.type === "cumulative" ? "Cumulative" : "Head-to-Head"} / {game.scoreType}
                {game.type === "head-to-head"
                  ? ` / $${game.betFront ?? 0}/$${game.betBack ?? 0}/$${game.betTotal ?? 0} (F/B/T)`
                  : ` / $${game.pot}`}
                {game.perRound ? " per round" : ""}
              </div>
              <div className="text-xs text-slate-400">
                {game.type === "head-to-head"
                  ? `${game.playerIds?.[0] ?? "?"} vs ${game.playerIds?.[1] ?? "?"}`
                  : `${game.playerIds?.length ?? 0} players`}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => handleEdit(game)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(game.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>

          {/* Skin overrides section for skins games */}
          {game.type === "skins" && (
            <SkinOverridesSection
              game={game}
              games={games}
              rounds={rounds}
              tournament={tournament}
              saveGames={saveGames}
            />
          )}
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// SKIN OVERRIDES (admin-only: invalidate individual scores for skins)
// ============================================================================

import type { RoundDoc } from "../../types";

function SkinOverridesSection({
  game,
  games,
  rounds,
  tournament,
  saveGames,
}: {
  game: SideGameConfig;
  games: SideGameConfig[];
  rounds: RoundDoc[];
  tournament: TournamentDoc;
  saveGames: (next: SideGameConfig[]) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [addRoundId, setAddRoundId] = useState("");
  const [addPlayerId, setAddPlayerId] = useState("");
  const [addHole, setAddHole] = useState("");
  const [saving, setSaving] = useState(false);

  const overrides = game.skinOverrides ?? [];

  const playerName = (pid: string): string => {
    for (const t of tournament.teams) {
      if (t.playerIds.includes(pid)) {
        return pid;
      }
    }
    return pid;
  };

  const roundLabel = (rid: string): string => {
    const round = rounds.find((r) => r.id === rid);
    return round ? `Day ${round.day ?? "?"}` : rid;
  };

  const handleAdd = async () => {
    if (!addRoundId || !addPlayerId || !addHole) return;
    const hole = Number(addHole);
    if (hole < 1 || hole > 18) return;

    // Check for duplicate
    const exists = overrides.some(
      (o) => o.roundId === addRoundId && o.playerId === addPlayerId && o.hole === hole
    );
    if (exists) return;

    setSaving(true);
    const newOverrides: SkinOverride[] = [...overrides, { roundId: addRoundId, playerId: addPlayerId, hole }];
    const updated: SideGameConfig = { ...game, skinOverrides: newOverrides };
    await saveGames(games.map((g) => (g.id === game.id ? updated : g)));
    setAddRoundId("");
    setAddPlayerId("");
    setAddHole("");
    setSaving(false);
  };

  const handleRemove = async (idx: number) => {
    setSaving(true);
    const newOverrides = overrides.filter((_, i) => i !== idx);
    const updated: SideGameConfig = { ...game, skinOverrides: newOverrides.length > 0 ? newOverrides : undefined };
    await saveGames(games.map((g) => (g.id === game.id ? updated : g)));
    setSaving(false);
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
      >
        <ShieldX className="h-3.5 w-3.5" />
        Skin Overrides ({overrides.length})
        <span className="text-[0.6rem]">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {/* Existing overrides */}
          {overrides.length > 0 && (
            <div className="space-y-1">
              {overrides.map((o, idx) => (
                <div
                  key={`${o.roundId}-${o.playerId}-${o.hole}`}
                  className="flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-3 py-1.5"
                >
                  <div className="text-xs text-red-700">
                    <span className="font-semibold">{playerName(o.playerId)}</span>
                    {" "}&middot; {roundLabel(o.roundId)} &middot; Hole {o.hole}
                  </div>
                  <button
                    onClick={() => handleRemove(idx)}
                    disabled={saving}
                    className="text-red-400 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new override */}
          <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-1.5 items-end">
            <div>
              <label className="text-[0.6rem] font-semibold text-slate-400 uppercase">Round</label>
              <select
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                value={addRoundId}
                onChange={(e) => setAddRoundId(e.target.value)}
              >
                <option value="">Round...</option>
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>Day {r.day ?? "?"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[0.6rem] font-semibold text-slate-400 uppercase">Player</label>
              <select
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                value={addPlayerId}
                onChange={(e) => setAddPlayerId(e.target.value)}
              >
                <option value="">Player...</option>
                {game.playerIds.map((pid) => (
                  <option key={pid} value={pid}>{pid}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[0.6rem] font-semibold text-slate-400 uppercase">Hole</label>
              <input
                type="number"
                min={1}
                max={18}
                className="w-14 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary"
                value={addHole}
                onChange={(e) => setAddHole(e.target.value)}
                placeholder="#"
              />
            </div>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={saving || !addRoundId || !addPlayerId || !addHole}
              className="h-[30px] px-2"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
