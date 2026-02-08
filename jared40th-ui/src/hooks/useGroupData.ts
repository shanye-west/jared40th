/**
 * useGroupData - Real-time subscription to a single group document.
 * Also fetches the course for scorecard display.
 * Resolves course from round.courseId first, then falls back to tournament.courseId.
 */

import { useEffect, useState } from "react";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
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

  // Fetch course: check round.courseId first, then tournament.courseId
  useEffect(() => {
    if (!group) return;

    const resolveCourse = async () => {
      // Try to get course from the round
      if (group.roundId) {
        const roundSnap = await getDoc(doc(db, "rounds", group.roundId));
        const roundCourseId = roundSnap.data()?.courseId;
        if (roundCourseId) {
          const c = await getCourse(roundCourseId);
          if (c) {
            setCourse(c);
            return;
          }
        }
      }

      // Fall back to tournament courseId
      if (tournament?.courseId) {
        const c = await getCourse(tournament.courseId);
        if (c) setCourse(c);
      }
    };

    resolveCourse();
  }, [group?.roundId, tournament?.courseId, getCourse]);

  return { group, course, tournament, loading, error };
}
