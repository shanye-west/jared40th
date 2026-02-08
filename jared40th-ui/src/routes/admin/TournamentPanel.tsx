import { useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import type { TournamentDoc } from "../../types";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Plus, RotateCcw, Save, X } from "lucide-react";

const RESET_PASSCODE = "2026";

type Props = { tournament: TournamentDoc | null };

type TournamentForm = {
  name: string;
  year: string;
  teams: { name: string; color: string }[];
};

const defaultTeams = [
  { name: "Team 1", color: "#132448" },
  { name: "Team 2", color: "#bf203c" },
  { name: "Team 3", color: "#0f766e" },
  { name: "Team 4", color: "#ca8a04" },
];

const emptyForm: TournamentForm = {
  name: "",
  year: new Date().getFullYear().toString(),
  teams: defaultTeams.map((t) => ({ ...t })),
};

export default function TournamentPanel({ tournament }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<TournamentForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState(false);

  const handleReset = async () => {
    if (passcode !== RESET_PASSCODE) {
      setPasscodeError(true);
      return;
    }
    if (!tournament) return;

    setResetting(true);

    // Delete all groups for this tournament
    const groupsSnap = await getDocs(
      query(collection(db, "groups"), where("tournamentId", "==", tournament.id))
    );
    const groupDeletes = groupsSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(groupDeletes);

    // Delete all rounds for this tournament
    const roundsSnap = await getDocs(
      query(collection(db, "rounds"), where("tournamentId", "==", tournament.id))
    );
    const roundDeletes = roundsSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(roundDeletes);

    // Deactivate the tournament
    await updateDoc(doc(db, "tournaments", tournament.id), { active: false });

    setResetting(false);
    setShowPasscode(false);
    setPasscode("");
    setPasscodeError(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    const teams = form.teams.map((t, i) => ({
      id: `team${i + 1}`,
      name: t.name.trim() || `Team ${i + 1}`,
      color: t.color,
      playerIds: [],
    }));

    await addDoc(collection(db, "tournaments"), {
      name: form.name.trim(),
      year: Number(form.year) || new Date().getFullYear(),
      active: true,
      teams,
      roundIds: [],
      scoreboard: {
        teamTotals: [0, 0, 0, 0],
        holesCompleted: 0,
        totalHoles: 0,
        lastUpdated: null,
      },
    });

    setForm(emptyForm);
    setShowCreate(false);
    setSaving(false);
  };

  const updateTeam = (index: number, field: "name" | "color", value: string) => {
    const next = form.teams.map((t, i) => (i === index ? { ...t, [field]: value } : t));
    setForm({ ...form, teams: next });
  };

  // No active tournament — show create form
  if (!tournament) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          No active tournament. Create one to get started.
        </div>

        {showCreate ? (
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-700">New Tournament</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-500">Name</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Jared's 40th Birthday"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Year</label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                />
              </div>
            </div>

            {/* Team config */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">Teams</label>
              {form.teams.map((team, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={team.color}
                    onChange={(e) => updateTeam(i, "color", e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-slate-200 p-0.5"
                  />
                  <input
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={team.name}
                    onChange={(e) => updateTeam(i, "name", e.target.value)}
                    placeholder={`Team ${i + 1}`}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={handleCreate} disabled={saving || !form.name.trim()} size="sm">
                <Save className="h-4 w-4" />
                {saving ? "Creating..." : "Create Tournament"}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)} size="sm">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </Card>
        ) : (
          <Button onClick={() => setShowCreate(true)} size="sm" className="w-full">
            <Plus className="h-4 w-4" />
            Create Tournament
          </Button>
        )}
      </div>
    );
  }

  // Active tournament — show info + reset
  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">{tournament.name}</h3>
            <span className="badge-success">Active</span>
          </div>
          <div className="text-xs text-slate-500">Year: {tournament.year}</div>
          <div className="text-[0.65rem] text-slate-400 font-mono">ID: {tournament.id}</div>

          {/* Teams summary */}
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-500">Teams</div>
            {tournament.teams.map((team, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <span className="font-medium">{team.name}</span>
                <span className="text-slate-400">
                  ({team.playerIds.length} players)
                </span>
              </div>
            ))}
          </div>

          {/* Scoreboard summary */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-500">Scoreboard</div>
            <div className="text-xs text-slate-600">
              Holes: {tournament.scoreboard.holesCompleted} / {tournament.scoreboard.totalHoles}
            </div>
            <div className="flex gap-3 mt-1">
              {tournament.teams.map((team, i) => (
                <div key={i} className="text-xs">
                  <span
                    className="inline-block h-2 w-2 rounded-full mr-1"
                    style={{ backgroundColor: team.color }}
                  />
                  {tournament.scoreboard.teamTotals[i]}
                </div>
              ))}
            </div>
          </div>

          {/* Rounds / Games count */}
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            Rounds: {tournament.roundIds?.length ?? 0} / Side Games: {tournament.sideGames?.length ?? 0}
          </div>
        </div>
      </Card>

      {/* Reset section */}
      {showPasscode ? (
        <Card className="border-red-200 bg-red-50 p-4 space-y-3">
          <div className="text-sm font-semibold text-red-800">Reset Tournament</div>
          <p className="text-xs text-red-600">
            This will deactivate the tournament and delete all its rounds and groups. This cannot be undone.
          </p>
          <div>
            <label className="text-xs font-semibold text-red-700">Enter passcode to confirm</label>
            <input
              type="text"
              inputMode="numeric"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                passcodeError
                  ? "border-red-400 bg-red-100 focus:ring-red-400"
                  : "border-red-200 bg-white focus:ring-red-400"
              }`}
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setPasscodeError(false);
              }}
              placeholder="Passcode"
            />
            {passcodeError && (
              <p className="mt-1 text-xs text-red-600 font-medium">Incorrect passcode</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleReset}
              disabled={resetting || !passcode}
              size="sm"
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <RotateCcw className="h-4 w-4" />
              {resetting ? "Resetting..." : "Confirm Reset"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowPasscode(false);
                setPasscode("");
                setPasscodeError(false);
              }}
              size="sm"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowPasscode(true)}
          size="sm"
          className="w-full border-red-200 text-red-600 hover:bg-red-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Tournament
        </Button>
      )}
    </div>
  );
}
