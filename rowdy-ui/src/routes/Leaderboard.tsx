import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";

type Tournament = {
  id: string;
  name: string;
  teamA?: { name?: string; color?: string };
  teamB?: { name?: string; color?: string };
};

type Match = {
  id: string;
  tournamentId: string;
  roundId: string;
  pointsValue?: number;
  result?: { winner?: "teamA" | "teamB" | "AS"; holesWonA?: number; holesWonB?: number };
};

export default function Leaderboard() {
  const [loading, setLoading] = useState(true);
  const [t, setT] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // find active tournament
        const tSnap = await getDocs(query(collection(db, "tournaments"), where("active", "==", true), limit(1)));
        if (tSnap.empty) { setT(null); setMatches([]); setLoading(false); return; }
        const tDoc = { id: tSnap.docs[0].id, ...(tSnap.docs[0].data() as any) } as Tournament;
        setT(tDoc);

        // load matches that belong to this tournament
        // if you don't store tournamentId on matches, fetch rounds first and then matches by roundId
        const mSnap = await getDocs(query(collection(db, "matches"), where("tournamentId", "==", tDoc.id)));
        const ms = mSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Match));
        setMatches(ms);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { pointsA, pointsB, totals } = useMemo(() => {
    let a = 0, b = 0;
    const perRound: Record<string, { a: number; b: number }> = {};
    for (const m of matches) {
      const pv = m.pointsValue ?? 1;
      const w = m.result?.winner;
      const incA = w === "teamA" ? pv : w === "AS" ? pv / 2 : 0;
      const incB = w === "teamB" ? pv : w === "AS" ? pv / 2 : 0;
      a += incA; b += incB;

      if (m.roundId) {
        const r = perRound[m.roundId] || { a: 0, b: 0 };
        r.a += incA; r.b += incB;
        perRound[m.roundId] = r;
      }
    }
    return { pointsA: a, pointsB: b, totals: perRound };
  }, [matches]);

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!t) return <div style={{ padding: 16 }}>No active tournament found.</div>;

  return (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
        <h1 style={{ margin: 0 }}>{t.name} — Leaderboard</h1>
        <Link to="/">Home</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, color: t.teamA?.color || "#0f172a" }}>{t.teamA?.name || "Team A"}</div>
          <div style={{ fontSize: 28 }}>{pointsA}</div>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, color: t.teamB?.color || "#0f172a" }}>{t.teamB?.name || "Team B"}</div>
          <div style={{ fontSize: 28 }}>{pointsB}</div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #eee", paddingTop: 8 }}>
        <h3 style={{ margin: "8px 0" }}>By Round</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 6 }}>Round</th>
              <th style={{ textAlign: "right", padding: 6, color: t.teamA?.color || "#0f172a" }}>{t.teamA?.name || "Team A"}</th>
              <th style={{ textAlign: "right", padding: 6, color: t.teamB?.color || "#0f172a" }}>{t.teamB?.name || "Team B"}</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(totals).map(([roundId, v]) => (
              <tr key={roundId}>
                <td style={{ padding: 6 }}>{roundId}</td>
                <td style={{ padding: 6, textAlign: "right" }}>{v.a}</td>
                <td style={{ padding: 6, textAlign: "right" }}>{v.b}</td>
              </tr>
            ))}
            {Object.keys(totals).length === 0 && (
              <tr><td style={{ padding: 6 }} colSpan={3}>No results yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}