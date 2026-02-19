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
import type { CourseDoc, HoleInfo, TeeSet } from "../../types";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Pencil, Trash2, Plus, ChevronDown, ChevronUp, Save, X } from "lucide-react";

type CourseForm = {
  name: string;
};

const emptyCourseForm: CourseForm = { name: "" };

export default function CoursesPanel() {
  const [courses, setCourses] = useState<CourseDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CourseForm>(emptyCourseForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchCourses = async () => {
    const snap = await getDocs(collection(db, "courses"));
    setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CourseDoc));
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const data = { name: form.name.trim() };

    if (editingId) {
      await updateDoc(doc(db, "courses", editingId), data);
    } else {
      await addDoc(collection(db, "courses"), data);
    }
    setForm(emptyCourseForm);
    setShowForm(false);
    setEditingId(null);
    setSaving(false);
    await fetchCourses();
  };

  const handleEdit = (course: CourseDoc) => {
    setForm({ name: course.name });
    setEditingId(course.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    await deleteDoc(doc(db, "courses", id));
    await fetchCourses();
  };

  const handleCancel = () => {
    setForm(emptyCourseForm);
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
      {/* Add / Edit form */}
      {showForm ? (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-700">
            {editingId ? "Edit Course" : "New Course"}
          </h3>
          <div>
            <label className="text-xs font-semibold text-slate-500">Name</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Course name"
            />
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
          Add Course
        </Button>
      )}

      {/* Course list */}
      {courses.length === 0 && !showForm && (
        <div className="empty-state">
          <div className="empty-state-text">No courses yet</div>
        </div>
      )}

      {courses.map((course) => (
        <Card key={course.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">{course.name}</div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setExpandedId(expandedId === course.id ? null : course.id)}
              >
                {expandedId === course.id ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleEdit(course)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(course.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>

          {/* Tee sets summary */}
          {course.teesets && course.teesets.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {course.teesets.map((ts, i) => (
                <span key={i} className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] text-slate-600">
                  {ts.name} (Par {ts.par} / {ts.rating} / {ts.slope})
                </span>
              ))}
            </div>
          )}

          {/* Expanded editors */}
          {expandedId === course.id && (
            <>
              <TeeSetEditor course={course} onSave={fetchCourses} />
              <HoleEditor course={course} onSave={fetchCourses} />
            </>
          )}
        </Card>
      ))}
    </div>
  );
}

/** Inline editor for tee sets of a course */
function TeeSetEditor({ course, onSave }: { course: CourseDoc; onSave: () => Promise<void> }) {
  const [teesets, setTeesets] = useState<TeeSet[]>(course.teesets ?? []);
  const [saving, setSaving] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const addTeeSet = () => {
    setTeesets([...teesets, { name: "", par: 72, rating: 72, slope: 113, yards: new Array(18).fill(0) }]);
  };

  const removeTeeSet = (idx: number) => {
    setTeesets(teesets.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  const updateTeeSet = (idx: number, field: keyof TeeSet, value: string) => {
    const next = [...teesets];
    if (field === "name") {
      next[idx] = { ...next[idx], name: value };
    } else if (field === "par" || field === "rating" || field === "slope") {
      next[idx] = { ...next[idx], [field]: value === "" ? 0 : Number(value) };
    }
    setTeesets(next);
  };

  const updateYardage = (teeIdx: number, holeIdx: number, value: string) => {
    const next = [...teesets];
    const yards = [...(next[teeIdx].yards || new Array(18).fill(0))];
    yards[holeIdx] = value === "" ? 0 : Number(value);
    next[teeIdx] = { ...next[teeIdx], yards };
    setTeesets(next);
  };

  const save = async () => {
    setSaving(true);
    await updateDoc(doc(db, "courses", course.id), { teesets });
    setSaving(false);
    await onSave();
  };

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-slate-600">Tee Sets</h4>
        <Button onClick={addTeeSet} variant="ghost" size="sm" className="h-6 text-xs">
          <Plus className="h-3 w-3" />
          Add Tee Set
        </Button>
      </div>
      {teesets.length === 0 && (
        <p className="text-xs text-slate-400">No tee sets. Add one to enable per-player tee selection.</p>
      )}
      <div className="space-y-2">
        {teesets.map((ts, i) => (
          <div key={i} className="rounded-lg border border-slate-100 p-2">
            <div className="flex items-center gap-2">
              <input
                className="w-20 rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                value={ts.name}
                onChange={(e) => updateTeeSet(i, "name", e.target.value)}
                placeholder="Name"
              />
              <input
                type="number"
                className="w-12 rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                value={ts.par || ""}
                onChange={(e) => updateTeeSet(i, "par", e.target.value)}
                placeholder="Par"
              />
              <input
                type="number"
                step="0.1"
                className="w-16 rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                value={ts.rating || ""}
                onChange={(e) => updateTeeSet(i, "rating", e.target.value)}
                placeholder="Rating"
              />
              <input
                type="number"
                className="w-16 rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                value={ts.slope || ""}
                onChange={(e) => updateTeeSet(i, "slope", e.target.value)}
                placeholder="Slope"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              >
                {expandedIdx === i ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeTeeSet(i)}>
                <Trash2 className="h-3 w-3 text-red-500" />
              </Button>
            </div>

            {/* Per-hole yardages */}
            {expandedIdx === i && (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="px-1 py-1 text-left">Hole</th>
                      <th className="px-1 py-1">Yards</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 18 }, (_, h) => (
                      <tr key={h} className="border-t border-slate-50">
                        <td className="px-1 py-1 font-semibold text-slate-600">{h + 1}</td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            className="w-16 rounded border border-slate-200 px-1 py-0.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            value={ts.yards?.[h] || ""}
                            onChange={(e) => updateYardage(i, h, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
      {teesets.length > 0 && (
        <Button onClick={save} disabled={saving} size="sm" className="mt-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Tee Sets"}
        </Button>
      )}
    </div>
  );
}

/** Inline editor for the 18 holes of a course */
function HoleEditor({ course, onSave }: { course: CourseDoc; onSave: () => Promise<void> }) {
  const [holes, setHoles] = useState<HoleInfo[]>(() => {
    if (course.holes?.length === 18) return course.holes;
    return Array.from({ length: 18 }, (_, i) => ({
      number: i + 1,
      par: 4,
      hcpIndex: i + 1,
    }));
  });
  const [saving, setSaving] = useState(false);

  const update = (idx: number, field: keyof HoleInfo, value: string) => {
    const next = [...holes];
    (next[idx] as any)[field] = value === "" ? undefined : Number(value);
    setHoles(next);
  };

  const save = async () => {
    setSaving(true);
    await updateDoc(doc(db, "courses", course.id), { holes });
    setSaving(false);
    await onSave();
  };

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500">
              <th className="px-1 py-1 text-left">Hole</th>
              <th className="px-1 py-1">Par</th>
              <th className="px-1 py-1">HCP</th>
            </tr>
          </thead>
          <tbody>
            {holes.map((h, i) => (
              <tr key={i} className="border-t border-slate-50">
                <td className="px-1 py-1 font-semibold text-slate-600">{h.number}</td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    className="w-14 rounded border border-slate-200 px-1 py-0.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    value={h.par}
                    onChange={(e) => update(i, "par", e.target.value)}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    className="w-14 rounded border border-slate-200 px-1 py-0.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    value={h.hcpIndex}
                    onChange={(e) => update(i, "hcpIndex", e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button onClick={save} disabled={saving} size="sm" className="mt-2">
        <Save className="h-4 w-4" />
        {saving ? "Saving..." : "Save Holes"}
      </Button>
    </div>
  );
}
