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
  status?: { closed?: boolean; thru?: number };
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

        // load matches
        const mSnap = await getDocs(query(collection(db, "matches"), where("tournamentId", "==", tDoc.id)));
        const ms = mSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Match));
        setMatches(ms);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    // Totals
    let fA = 0, fB = 0; // Finalized
    let pA = 0, pB = 0; // In-Progress (Projected)

    // Per Round
    const perRound: Record<string, { fA: number; fB: number; pA: number; pB: number }> = {};

    for (const m of matches) {
      const pv = m.pointsValue ?? 1;
      const w = m.result?.winner;
      
      // Calculate points based on current leader/winner
      const ptsA = w === "teamA" ? pv : w === "AS" ? pv / 2 : 0;
      const ptsB = w === "teamB" ? pv : w === "AS" ? pv / 2 : 0;

      const isClosed = m.status?.closed === true;
      const isInProgress = !isClosed && (m.status?.thru ?? 0) > 0;

      // Initialize bucket for round if missing
      if (m.roundId && !perRound[m.roundId]) {
        perRound[m.roundId] = { fA: 0, fB: 0, pA: 0, pB: 0 };
      }
      const r = m.roundId ? perRound[m.roundId] : null;

      if (isClosed) {
        fA += ptsA;
        fB += ptsB;
        if (r) { r.fA += ptsA; r.fB += ptsB; }
      } else if (isInProgress) {
        pA += ptsA;
        pB += ptsB;
        if (r) { r.pA += ptsA; r.pB += ptsB; }
      }
    }

    return { fA, fB, pA, pB, perRound };
  }, [matches]);

  function ScoreBlock({ final, proj, color }: { final: number; proj: number; color?: string }) {
    return (
      <span>
        <span style={{ color: color || "inherit" }}>{final}</span>
        {proj > 0 && (
          <span style={{ fontSize: "0.6em", color: "#999", marginLeft: 6, verticalAlign: "middle" }}>
            (+{proj})
          </span>
        )}
      </span>
    );
  }

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!t) return <div style={{ padding: 16 }}>No active tournament found.</div>;

  return (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
        <h1 style={{ margin: 0 }}>{t.name} — Leaderboard</h1>
        <Link to="/">Home</Link>
      </div>

      {/* Main Big Scoreboard */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Team A */}
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, color: t.teamA?.color || "#0f172a" }}>
            {t.teamA?.name || "Team A"}
          </div>
          <div style={{ fontSize: 28 }}>
            <ScoreBlock final={stats.fA} proj={stats.pA} color={t.teamA?.color} />
          </div>
        </div>

        {/* Team B */}
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, color: t.teamB?.color || "#0f172a" }}>
            {t.teamB?.name || "Team B"}
          </div>
          <div style={{ fontSize: 28 }}>
            <ScoreBlock final={stats.fB} proj={stats.pB} color={t.teamB?.color} />
          </div>
        </div>
      </div>

      {/* Breakdown Table */}
      <div style={{ borderTop: "1px solid #eee", paddingTop: 8 }}>
        <h3 style={{ margin: "8px 0" }}>By Round</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 6 }}>Round</th>
              <th style={{ textAlign: "right", padding: 6, color: t.teamA?.color || "#0f172a" }}>
                {t.teamA?.name || "Team A"}
              </th>
              <th style={{ textAlign: "right", padding: 6, color: t.teamB?.color || "#0f172a" }}>
                {t.teamB?.name || "Team B"}
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(stats.perRound).sort().map(([roundId, v]) => (
              <tr key={roundId} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td style={{ padding: 6 }}>{roundId}</td>
                <td style={{ padding: 6, textAlign: "right" }}>
                  <ScoreBlock final={v.fA} proj={v.pA} />
                </td>
                <td style={{ padding: 6, textAlign: "right" }}>
                  <ScoreBlock final={v.fB} proj={v.pB} />
                </td>
              </tr>
            ))}
            {Object.keys(stats.perRound).length === 0 && (
              <tr><td style={{ padding: 6 }} colSpan={3}>No results yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}