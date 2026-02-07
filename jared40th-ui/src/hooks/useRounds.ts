/**
 * useRounds - Fetch round documents for a tournament's roundIds.
 * Returns rounds sorted by day ascending.
 */

import { useEffect, useState } from "react";
import { collection, query, where, documentId, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import type { RoundDoc } from "../types";

export function useRounds(roundIds: string[] | undefined) {
  const [rounds, setRounds] = useState<RoundDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roundIds || roundIds.length === 0) {
      setRounds([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "rounds"),
      where(documentId(), "in", roundIds)
    );

    getDocs(q)
      .then((snap) => {
        const docs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as RoundDoc))
          .sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
        setRounds(docs);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Rounds fetch error:", err);
        setRounds([]);
        setLoading(false);
      });
  }, [roundIds?.join(",")]);

  return { rounds, loading };
}
