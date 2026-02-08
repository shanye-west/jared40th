import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  arrayRemove,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../../firebase";
import type { TournamentDoc, RoundDoc, CourseDoc } from "../../types";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Plus, Trash2, Save, X } from "lucide-react";

type Props = { tournament: TournamentDoc };

type RoundForm = {
  day: string;
  courseId: string;
};

const emptyForm: RoundForm = { day: "", courseId: "" };

export default function RoundsPanel({ tournament }: Props) {
  const [rounds, setRounds] = useState<RoundDoc[]>([]);
  const [courses, setCourses] = useState<CourseDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RoundForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchRounds = async () => {
    const snap = await getDocs(
      query(collection(db, "rounds"), where("tournamentId", "==", tournament.id))
    );
    const r = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as RoundDoc)
      .sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
    setRounds(r);
    setLoading(false);
  };

  const fetchCourses = async () => {
    const snap = await getDocs(collection(db, "courses"));
    setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CourseDoc));
  };

  useEffect(() => {
    fetchRounds();
    fetchCourses();
  }, [tournament.id]);

  const handleSave = async () => {
    setSaving(true);
    const data: any = {
      tournamentId: tournament.id,
    };
    if (form.day) data.day = Number(form.day);
    if (form.courseId) data.courseId = form.courseId;

    const ref = await addDoc(collection(db, "rounds"), data);

    // Add round ID to tournament's roundIds
    await updateDoc(doc(db, "tournaments", tournament.id), {
      roundIds: arrayUnion(ref.id),
    });

    setForm(emptyForm);
    setShowForm(false);
    setSaving(false);
    await fetchRounds();
  };

  const handleDelete = async (round: RoundDoc) => {
    if (!confirm(`Delete Round ${round.day ?? round.id}?`)) return;

    // Remove from tournament's roundIds
    await updateDoc(doc(db, "tournaments", tournament.id), {
      roundIds: arrayRemove(round.id),
    });

    await deleteDoc(doc(db, "rounds", round.id));
    await fetchRounds();
  };

  const courseName = (id?: string) => {
    if (!id) return "Default";
    return courses.find((c) => c.id === id)?.name ?? id;
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
          <h3 className="text-sm font-bold text-slate-700">New Round</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">Day #</label>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.day}
                onChange={(e) => setForm({ ...form, day: e.target.value })}
                placeholder="1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Course (optional)</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              >
                <option value="">Use tournament default</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} disabled={saving} size="sm">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setForm(emptyForm);
                setShowForm(false);
              }}
              size="sm"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setShowForm(true)} size="sm" className="w-full">
          <Plus className="h-4 w-4" />
          Add Round
        </Button>
      )}

      {rounds.length === 0 && !showForm && (
        <div className="empty-state">
          <div className="empty-state-text">No rounds yet</div>
        </div>
      )}

      {rounds.map((round) => (
        <Card key={round.id} className="flex items-center justify-between p-4">
          <div>
            <div className="font-semibold text-slate-800">
              Round {round.day ?? "—"}
            </div>
            <div className="text-xs text-slate-500">
              Course: {courseName(round.courseId)} / Groups: {round.groupIds?.length ?? 0}
            </div>
            <div className="text-[0.65rem] text-slate-400 font-mono">{round.id}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(round)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </Card>
      ))}
    </div>
  );
}
