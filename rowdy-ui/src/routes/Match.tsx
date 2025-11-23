// src/routes/Match.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

type RoundFormat = "twoManBestBall" | "twoManShamble" | "twoManScramble" | "singles";

type MatchDoc = {
  id: string;
  roundId: string;
  holes?: Record<string, any>;
  status?: any;
  teamAPlayers?: any[];
  teamBPlayers?: any[];
  pointsValue?: number;
};

type RoundDoc = {
  id: string;
  format: RoundFormat;
};

export default function Match() {
  const { matchId } = useParams();
  const [match, setMatch] = useState<MatchDoc | null>(null);
  const [round, setRound] = useState<RoundDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!matchId) { if (alive) setLoading(false); return; }
        setLoading(true);

        const mRef = doc(db, "matches", matchId);
        const mSnap = await getDoc(mRef);
        if (!mSnap.exists()) { if (alive) { setMatch(null); setLoading(false); } return; }
        const m = { id: mSnap.id, ...(mSnap.data() as any) } as MatchDoc;
        if (alive) setMatch(m);

        if (m.roundId) {
          const rSnap = await getDoc(doc(db, "rounds", m.roundId));
          if (rSnap.exists() && alive) {
            const r = { id: rSnap.id, ...(rSnap.data() as any) } as RoundDoc;
            setRound(r);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [matchId]);

  const format: RoundFormat = (round?.format as RoundFormat) || "twoManBestBall";
  const holes = useMemo(() => {
    const h = match?.holes || {};
    return Array.from({ length: 18 }, (_, i) => String(i + 1)).map(k => ({ k, input: h[k]?.input || {} }));
  }, [match]);

  async function saveHole(k: string, nextInput: any) {
    if (!match?.id) return;
    await updateDoc(doc(db, "matches", match.id), { [`holes.${k}.input`]: nextInput });
  }

  function HoleRow({ k, input }: { k: string; input: any }) {
    if (format === "twoManScramble") {
      const a = input?.teamAGross ?? null;
      const b = input?.teamBGross ?? null;
      return (
        <div key={k} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr", gap: 8 }}>
          <div>#{k}</div>
          <input type="number" value={a ?? ""} onChange={(e) => saveHole(k, { teamAGross: e.target.value === "" ? null : Number(e.target.value), teamBGross: b })} />
          <input type="number" value={b ?? ""} onChange={(e) => saveHole(k, { teamAGross: a, teamBGross: e.target.value === "" ? null : Number(e.target.value) })} />
        </div>
      );
    }
    if (format === "singles") {
      const a = input?.teamAPlayerGross ?? null;
      const b = input?.teamBPlayerGross ?? null;
      return (
        <div key={k} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr", gap: 8 }}>
          <div>#{k}</div>
          <input type="number" value={a ?? ""} onChange={(e) => saveHole(k, { teamAPlayerGross: e.target.value === "" ? null : Number(e.target.value), teamBPlayerGross: b })} />
          <input type="number" value={b ?? ""} onChange={(e) => saveHole(k, { teamAPlayerGross: a, teamBPlayerGross: e.target.value === "" ? null : Number(e.target.value) })} />
        </div>
      );
    }
    const aArr: (number | null)[] = Array.isArray(input?.teamAPlayersGross) ? input.teamAPlayersGross : [null, null];
    const bArr: (number | null)[] = Array.isArray(input?.teamBPlayersGross) ? input.teamBPlayersGross : [null, null];
    const setA = (idx: 0 | 1, val: number | null) => {
      const nextA = [...aArr]; nextA[idx] = val;
      saveHole(k, { teamAPlayersGross: nextA, teamBPlayersGross: bArr });
    };
    const setB = (idx: 0 | 1, val: number | null) => {
      const nextB = [...bArr]; nextB[idx] = val;
      saveHole(k, { teamAPlayersGross: aArr, teamBPlayersGross: nextB });
    };
    return (
      <div key={k} style={{ display: "grid", gridTemplateColumns: "40px repeat(4, 1fr)", gap: 8 }}>
        <div>#{k}</div>
        <input type="number" value={aArr[0] ?? ""} onChange={(e) => setA(0, e.target.value === "" ? null : Number(e.target.value))} />
        <input type="number" value={aArr[1] ?? ""} onChange={(e) => setA(1, e.target.value === "" ? null : Number(e.target.value))} />
        <input type="number" value={bArr[0] ?? ""} onChange={(e) => setB(0, e.target.value === "" ? null : Number(e.target.value))} />
        <input type="number" value={bArr[1] ?? ""} onChange={(e) => setB(1, e.target.value === "" ? null : Number(e.target.value))} />
      </div>
    );
  }

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!match) return <div style={{ padding: 16 }}>Match not found.</div>;

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h2>Match {match.id}</h2>
      <div><strong>Format:</strong> {format}</div>
      <div>
        <strong>Status:</strong>{" "}
        {match.status
          ? `${match.status.leader ?? "AS"} ${match.status.margin ?? 0} • thru ${match.status.thru ?? 0} • ${match.status.closed ? "Final" : "Live"}`
          : "—"}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {holes.map(h => <HoleRow key={h.k} k={h.k} input={h.input} />)}
      </div>
    </div>
  );
}