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
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import type {
  TournamentDoc,
  RoundDoc,
  GroupDoc,
  CourseDoc,
  PlayerDoc,
  GroupPlayer,
  HoleInfo,
  TeeSet,
} from "../../types";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Plus, Trash2, Save, X } from "lucide-react";

type Props = { tournament: TournamentDoc };

type GroupForm = {
  roundId: string;
  groupNumber: string;
  playerSelections: [string, string, string, string]; // playerId for each team slot
  teeSelections: [string, string, string, string]; // tee set name for each player
};

const emptyForm: GroupForm = {
  roundId: "",
  groupNumber: "1",
  playerSelections: ["", "", "", ""],
  teeSelections: ["", "", "", ""],
};

/** Get all tee set options for a course (combines legacy fields + teesets array) */
function getCourseTeeOptions(course: CourseDoc | null): TeeSet[] {
  if (!course) return [];
  const options: TeeSet[] = [];
  // Legacy top-level tee fields as a tee set option
  if (course.rating && course.slope) {
    options.push({
      name: course.tees || "Default",
      rating: course.rating,
      slope: course.slope,
    });
  }
  // Additional tee sets
  if (course.teesets) {
    for (const ts of course.teesets) {
      // Avoid duplicating if same name as legacy
      if (options.length > 0 && ts.name === options[0].name) continue;
      options.push(ts);
    }
  }
  return options;
}

/** Compute course handicap from index, slope, rating, par */
function computeCourseHandicap(
  handicapIndex: number,
  slope: number,
  rating: number,
  par: number
): number {
  const raw = Math.round(handicapIndex * (slope / 113) - (rating - par));
  return Math.min(Math.max(raw, 0), 18);
}

/** Build 18-element strokesReceived array from courseHandicap and hole HCP indices */
function buildStrokesReceived(courseHandicap: number, holes: HoleInfo[]): number[] {
  // Sort holes by hcpIndex (hardest first = lowest hcpIndex number)
  const sorted = holes.map((h, i) => ({ idx: i, hcpIndex: h.hcpIndex })).sort((a, b) => a.hcpIndex - b.hcpIndex);
  const strokes = new Array(18).fill(0);
  for (let i = 0; i < Math.min(courseHandicap, 18); i++) {
    strokes[sorted[i].idx] = 1;
  }
  return strokes;
}

export default function GroupsPanel({ tournament }: Props) {
  const [rounds, setRounds] = useState<RoundDoc[]>([]);
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [players, setPlayers] = useState<PlayerDoc[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GroupForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [roundCourse, setRoundCourse] = useState<CourseDoc | null>(null);

  const fetchRounds = async () => {
    const snap = await getDocs(
      query(collection(db, "rounds"), where("tournamentId", "==", tournament.id))
    );
    const r = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as RoundDoc)
      .sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
    setRounds(r);
    if (r.length > 0 && !selectedRoundId) {
      setSelectedRoundId(r[0].id);
    }
    setLoading(false);
  };

  const fetchGroups = async () => {
    if (!selectedRoundId) {
      setGroups([]);
      return;
    }
    const snap = await getDocs(
      query(collection(db, "groups"), where("roundId", "==", selectedRoundId))
    );
    setGroups(
      snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as GroupDoc)
        .sort((a, b) => a.groupNumber - b.groupNumber)
    );
  };

  const fetchPlayers = async () => {
    const snap = await getDocs(collection(db, "players"));
    setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PlayerDoc));
  };

  useEffect(() => {
    fetchRounds();
    fetchPlayers();
  }, [tournament.id]);

  useEffect(() => {
    if (selectedRoundId) fetchGroups();
  }, [selectedRoundId]);

  // Fetch course for the selected round (to get tee sets)
  useEffect(() => {
    const fetchCourse = async () => {
      const round = rounds.find((r) => r.id === selectedRoundId);
      const courseId = round?.courseId || tournament.courseId;
      if (!courseId) {
        setRoundCourse(null);
        return;
      }
      const snap = await getDoc(doc(db, "courses", courseId));
      if (snap.exists()) {
        setRoundCourse({ id: snap.id, ...snap.data() } as CourseDoc);
      } else {
        setRoundCourse(null);
      }
    };
    if (selectedRoundId) fetchCourse();
  }, [selectedRoundId, rounds, tournament.courseId]);

  const handleSave = async () => {
    if (!form.roundId) return;
    setSaving(true);

    // Get course data for handicap calc
    const round = rounds.find((r) => r.id === form.roundId);
    const courseId = round?.courseId || tournament.courseId;
    let course: CourseDoc | null = null;
    if (courseId) {
      const snap = await getDoc(doc(db, "courses", courseId));
      if (snap.exists()) course = { id: snap.id, ...snap.data() } as CourseDoc;
    }

    const teeOptions = getCourseTeeOptions(course);

    const groupPlayers: GroupPlayer[] = form.playerSelections.map((playerId, teamIndex) => {
      const player = players.find((p) => p.id === playerId);
      const hcpIndex = player?.handicapIndex ?? 0;

      // Find the selected tee set for this player
      const selectedTeeName = form.teeSelections[teamIndex];
      const selectedTee = teeOptions.find((t) => t.name === selectedTeeName);

      // Use selected tee's rating/slope, or fall back to course-level values
      const slope = selectedTee?.slope ?? course?.slope ?? 113;
      const rating = selectedTee?.rating ?? course?.rating ?? 72;
      const par = course?.par ?? 72;

      const courseHcp = course
        ? computeCourseHandicap(hcpIndex, slope, rating, par)
        : Math.min(Math.max(Math.round(hcpIndex), 0), 18);
      const strokes = course?.holes?.length === 18
        ? buildStrokesReceived(courseHcp, course.holes)
        : new Array(18).fill(0);

      return {
        playerId: playerId || `team${teamIndex}-unknown`,
        teamIndex,
        displayName: player?.displayName ?? `Player ${teamIndex + 1}`,
        handicapIndex: hcpIndex,
        courseHandicap: courseHcp,
        strokesReceived: strokes,
        teeSetName: selectedTee?.name,
      };
    });

    await addDoc(collection(db, "groups"), {
      roundId: form.roundId,
      tournamentId: tournament.id,
      groupNumber: Number(form.groupNumber),
      players: groupPlayers,
    });

    setForm(emptyForm);
    setShowForm(false);
    setSaving(false);
    await fetchGroups();
  };

  const handleDelete = async (group: GroupDoc) => {
    if (!confirm(`Delete Group ${group.groupNumber}?`)) return;

    // Remove from round's groupIds
    await updateDoc(doc(db, "rounds", group.roundId), {
      groupIds: arrayRemove(group.id),
    });

    await deleteDoc(doc(db, "groups", group.id));
    await fetchGroups();
  };

  // Get players for a specific team index
  const teamPlayers = (teamIndex: number): PlayerDoc[] => {
    const team = tournament.teams[teamIndex];
    if (!team) return [];
    return team.playerIds
      .map((pid) => players.find((p) => p.id === pid))
      .filter((p): p is PlayerDoc => !!p);
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
      {/* Round selector */}
      <div>
        <label className="text-xs font-semibold text-slate-500">Select Round</label>
        <select
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={selectedRoundId}
          onChange={(e) => setSelectedRoundId(e.target.value)}
        >
          <option value="">-- Select --</option>
          {rounds.map((r) => (
            <option key={r.id} value={r.id}>
              Round {r.day ?? "?"} ({r.id.slice(0, 6)})
            </option>
          ))}
        </select>
      </div>

      {/* Add form */}
      {showForm ? (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-700">New Group</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">Round</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.roundId}
                onChange={(e) => setForm({ ...form, roundId: e.target.value })}
              >
                <option value="">-- Select --</option>
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    Round {r.day ?? "?"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Group #</label>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.groupNumber}
                onChange={(e) => setForm({ ...form, groupNumber: e.target.value })}
              />
            </div>
          </div>

          {/* Player selectors — one per team */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500">Players (one per team)</label>
            {tournament.teams.map((team, ti) => {
              const teeOptions = getCourseTeeOptions(roundCourse);
              return (
                <div key={ti} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="text-xs font-semibold text-slate-600 w-16 truncate">
                    {team.name}
                  </span>
                  <select
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={form.playerSelections[ti]}
                    onChange={(e) => {
                      const next: [string, string, string, string] = [...form.playerSelections];
                      next[ti] = e.target.value;
                      setForm({ ...form, playerSelections: next });
                    }}
                  >
                    <option value="">-- Select --</option>
                    {teamPlayers(ti).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.displayName ?? p.id} (HCP {p.handicapIndex ?? 0})
                      </option>
                    ))}
                  </select>
                  {teeOptions.length > 0 && (
                    <select
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={form.teeSelections[ti]}
                      onChange={(e) => {
                        const next: [string, string, string, string] = [...form.teeSelections];
                        next[ti] = e.target.value;
                        setForm({ ...form, teeSelections: next });
                      }}
                    >
                      <option value="">Tees</option>
                      {teeOptions.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSave}
              disabled={saving || !form.roundId}
              size="sm"
            >
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
        selectedRoundId && (
          <Button
            onClick={() => {
              setForm({ ...emptyForm, roundId: selectedRoundId });
              setShowForm(true);
            }}
            size="sm"
            className="w-full"
          >
            <Plus className="h-4 w-4" />
            Add Group
          </Button>
        )
      )}

      {/* Group list */}
      {groups.length === 0 && selectedRoundId && !showForm && (
        <div className="empty-state">
          <div className="empty-state-text">No groups for this round</div>
        </div>
      )}

      {groups.map((group) => (
        <Card key={group.id} className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold text-slate-800">Group {group.groupNumber}</div>
              <div className="mt-1 space-y-0.5">
                {group.players?.map((p, i) => {
                  const team = tournament.teams[p.teamIndex];
                  return (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: team?.color ?? "#999" }}
                      />
                      {p.displayName} (HCP {p.courseHandicap})
                      {p.teeSetName && (
                        <span className="text-[0.6rem] text-slate-400">- {p.teeSetName}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 text-[0.65rem] text-slate-400">
                Holes completed: {group.computed?.holesCompleted ?? 0}/18
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(group)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
