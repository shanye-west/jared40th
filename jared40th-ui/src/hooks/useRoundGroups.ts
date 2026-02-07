/**
 * useRoundGroups - Subscribe to groups for a specific round.
 * Used by the home page to show groups filtered by the selected round tab.
 */

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { GroupDoc } from "../types";

export function useRoundGroups(roundId: string | undefined) {
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roundId) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, "groups"),
      where("roundId", "==", roundId),
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
        console.error("Round groups subscription error:", err);
        setError("Unable to load groups.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [roundId]);

  return { groups, loading, error };
}
