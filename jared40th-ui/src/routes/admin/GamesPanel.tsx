import { useState } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import type { TournamentDoc, SideGameConfig } from "../../types";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Plus, Trash2, Save, X, Pencil } from "lucide-react";

type Props = { tournament: TournamentDoc };

type GameForm = {
  name: string;
  type: "skins" | "cumulative";
  scoreType: "gross" | "net";
  pot: string;
  perRound: boolean;
};

const emptyForm: GameForm = {
  name: "",
  type: "skins",
  scoreType: "net",
  pot: "0",
  perRound: false,
};

export default function GamesPanel({ tournament }: Props) {
  const games = tournament.sideGames ?? [];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GameForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // All player IDs from all teams
  const allPlayers = tournament.teams.flatMap((t, ti) =>
    t.playerIds.map((pid) => ({ pid, teamIndex: ti, teamName: t.name, teamColor: t.color }))
  );
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  const saveGames = async (next: SideGameConfig[]) => {
    await updateDoc(doc(db, "tournaments", tournament.id), {
      sideGames: next,
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    const entry: SideGameConfig = {
      id: editingId ?? crypto.randomUUID(),
      name: form.name.trim(),
      type: form.type,
      scoreType: form.scoreType,
      pot: Number(form.pot) || 0,
      perRound: form.perRound,
      playerIds: selectedPlayerIds,
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
    setSaving(false);
  };

  const handleEdit = (game: SideGameConfig) => {
    setForm({
      name: game.name,
      type: game.type,
      scoreType: game.scoreType,
      pot: game.pot.toString(),
      perRound: game.perRound,
    });
    setSelectedPlayerIds(game.playerIds ?? []);
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
                onChange={(e) => setForm({ ...form, type: e.target.value as "skins" | "cumulative" })}
              >
                <option value="skins">Skins</option>
                <option value="cumulative">Cumulative</option>
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
            <div>
              <label className="text-xs font-semibold text-slate-500">Pot ($)</label>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.pot}
                onChange={(e) => setForm({ ...form, pot: e.target.value })}
              />
            </div>
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

          {/* Player selection */}
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

          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} size="sm">
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
                {game.type === "skins" ? "Skins" : "Cumulative"} / {game.scoreType} / ${game.pot}
                {game.perRound ? " per round" : ""}
              </div>
              <div className="text-xs text-slate-400">
                {game.playerIds?.length ?? 0} players
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
        </Card>
      ))}
    </div>
  );
}
