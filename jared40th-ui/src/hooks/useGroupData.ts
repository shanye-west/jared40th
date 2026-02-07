/**
 * useGroupData - Real-time subscription to a single group document.
 * Also fetches the course for scorecard display.
 */

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useTournamentContext } from "../contexts/TournamentContext";
import type { GroupDoc, CourseDoc } from "../types";

export function useGroupData(groupId: string | undefined) {
  const { tournament, getCourse } = useTournamentContext();
  const [group, setGroup] = useState<GroupDoc | null>(null);
  const [course, setCourse] = useState<CourseDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to group document
  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      setError("No group ID");
      return;
    }

    setLoading(true);
    setError(null);

    const unsub = onSnapshot(
      doc(db, "groups", groupId),
      (snap) => {
        if (snap.exists()) {
          setGroup({ id: snap.id, ...snap.data() } as GroupDoc);
        } else {
          setGroup(null);
          setError("Group not found");
        }
        setLoading(false);
      },
      (err) => {
        console.error("Group subscription error:", err);
        setError("Unable to load group.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [groupId]);

  // Fetch course when tournament is available
  useEffect(() => {
    if (!tournament?.courseId) return;
    getCourse(tournament.courseId).then((c) => {
      if (c) setCourse(c);
    });
  }, [tournament?.courseId, getCourse]);

  return { group, course, tournament, loading, error };
}
