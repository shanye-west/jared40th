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
import type { CourseDoc, HoleInfo } from "../../types";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Pencil, Trash2, Plus, ChevronDown, ChevronUp, Save, X } from "lucide-react";

type CourseForm = {
  name: string;
  tees: string;
  par: string;
  rating: string;
  slope: string;
};

const emptyCourseForm: CourseForm = { name: "", tees: "", par: "72", rating: "", slope: "" };

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
    const data: any = {
      name: form.name.trim(),
      tees: form.tees.trim() || undefined,
      par: form.par ? Number(form.par) : undefined,
      rating: form.rating ? Number(form.rating) : undefined,
      slope: form.slope ? Number(form.slope) : undefined,
    };
    // Clean undefined values
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

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
    setForm({
      name: course.name,
      tees: course.tees || "",
      par: course.par?.toString() || "",
      rating: course.rating?.toString() || "",
      slope: course.slope?.toString() || "",
    });
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
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-500">Name</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Course name"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Tees</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.tees}
                onChange={(e) => setForm({ ...form, tees: e.target.value })}
                placeholder="e.g. Blue"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Par</label>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.par}
                onChange={(e) => setForm({ ...form, par: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Rating</label>
              <input
                type="number"
                step="0.1"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Slope</label>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.slope}
                onChange={(e) => setForm({ ...form, slope: e.target.value })}
              />
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
              <div className="text-xs text-slate-500">
                {[
                  course.tees && `Tees: ${course.tees}`,
                  course.par && `Par ${course.par}`,
                  course.rating && `Rating ${course.rating}`,
                  course.slope && `Slope ${course.slope}`,
                ]
                  .filter(Boolean)
                  .join(" / ")}
              </div>
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

          {/* Expanded hole editor */}
          {expandedId === course.id && (
            <HoleEditor course={course} onSave={fetchCourses} />
          )}
        </Card>
      ))}
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
              <th className="px-1 py-1">Yards</th>
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
                <td className="px-1 py-1">
                  <input
                    type="number"
                    className="w-16 rounded border border-slate-200 px-1 py-0.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    value={h.yards ?? ""}
                    onChange={(e) => update(i, "yards", e.target.value)}
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
