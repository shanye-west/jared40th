/**
 * useGroupListData - Subscribe to all groups for a tournament.
 * Used by the home page and groups overview.
 */

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { GroupDoc } from "../types";

export function useGroupListData(tournamentId: string | undefined) {
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, "groups"),
      where("tournamentId", "==", tournamentId),
      orderBy("groupNumber", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupDoc));
        setGroups(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Group list subscription error:", err);
        setError("Unable to load groups.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [tournamentId]);

  return { groups, loading, error };
}
