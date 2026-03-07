import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase";
import type { PlayerDoc } from "../../types";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Pencil, Trash2, Plus, Save, X } from "lucide-react";

type PlayerForm = {
  displayName: string;
  handicapIndex: string;
};

const emptyForm: PlayerForm = { displayName: "", handicapIndex: "" };

export default function PlayersPanel() {
  const [players, setPlayers] = useState<PlayerDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PlayerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPlayers = async () => {
    const snap = await getDocs(collection(db, "players"));
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as PlayerDoc)
      .sort((a, b) => (a.displayName ?? "").localeCompare(b.displayName ?? ""));
    setPlayers(list);
    setLoading(false);
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleSave = async () => {
    if (!form.displayName.trim()) return;
    setSaving(true);

    const data: any = {
      displayName: form.displayName.trim(),
    };
    if (form.handicapIndex !== "") {
      data.handicapIndex = Number(form.handicapIndex);
    }

    if (editingId) {
      await updateDoc(doc(db, "players", editingId), data);
    } else {
      await addDoc(collection(db, "players"), data);
    }

    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    setSaving(false);
    await fetchPlayers();
  };

  const handleEdit = (player: PlayerDoc) => {
    setForm({
      displayName: player.displayName ?? "",
      handicapIndex: player.handicapIndex?.toString() ?? "",
    });
    setEditingId(player.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this player?")) return;
    await deleteDoc(doc(db, "players", id));
    await fetchPlayers();
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showForm ? (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-700">
            {editingId ? "Edit Player" : "New Player"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-500">Name</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="Player name"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Handicap Index</label>
              <input
                type="number"
                step="0.1"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.handicapIndex}
                onChange={(e) => setForm({ ...form, handicapIndex: e.target.value })}
                placeholder="e.g. 12.4"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} disabled={saving || !form.displayName.trim()} size="sm">
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
          Add Player
        </Button>
      )}

      {players.length === 0 && !showForm && (
        <div className="empty-state">
          <div className="empty-state-text">No players yet</div>
        </div>
      )}

      {players.map((player) => (
        <Card key={player.id} className="flex items-center justify-between p-4">
          <div>
            <div className="font-semibold text-slate-800">
              {player.displayName ?? player.id}
            </div>
            <div className="text-xs text-slate-500">
              HCP: {player.handicapIndex != null ? player.handicapIndex.toFixed(1) : "—"}
            </div>
            <div className="text-[0.65rem] text-slate-400 font-mono">{player.id}</div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(player)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(player.id)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
