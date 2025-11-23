// src/routes/Match.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  onSnapshot,
  getDoc,
  updateDoc,
  getDocs,
  collection,
  where,
  query,
} from "firebase/firestore";
import type { TournamentDoc, PlayerDoc } from "../types";
import { db } from "../firebase";

type RoundFormat = "twoManBestBall" | "twoManShamble" | "twoManScramble" | "singles";

type MatchDoc = {
  id: string;
  roundId: string;
  tournamentId?: string;
  holes?: Record<string, any>;
  status?: {
    leader: "teamA" | "teamB" | null;
    margin: number;
    thru: number;
    dormie: boolean;
    closed: boolean;
  };
  teamAPlayers?: { playerId: string; strokesReceived: number[] }[];
  teamBPlayers?: { playerId: string; strokesReceived: number[] }[];
  pointsValue?: number;
};

type RoundDoc = {
  id: string;
  tournamentId: string;
  format: RoundFormat;
};

export default function Match() {
  const { matchId } = useParams();
  const [match, setMatch] = useState<MatchDoc | null>(null);
  const [round, setRound] = useState<RoundDoc | null>(null);
  const [tournament, setTournament] = useState<TournamentDoc | null>(null);
  const [players, setPlayers] = useState<Record<string, PlayerDoc>>({});
  const [loading, setLoading] = useState(true);

  // Live subscription to the match; fetch the round/tournament/players on updates
  useEffect(() => {
    if (!matchId) return;
    setLoading(true);

    const unsub = onSnapshot(doc(db, "matches", matchId), async (mSnap) => {
      if (!mSnap.exists()) {
        setMatch(null);
        setRound(null);
        setTournament(null);
        setPlayers({});
        setLoading(false);
        return;
      }

      const m = { id: mSnap.id, ...(mSnap.data() as any) } as MatchDoc;
      setMatch(m);

      // Round (for format + tournamentId)
      if (m.roundId) {
        const rSnap = await getDoc(doc(db, "rounds", m.roundId));
        if (rSnap.exists()) {
          const r = { id: rSnap.id, ...(rSnap.data() as any) } as RoundDoc;
          setRound(r);

          // Tournament (for team names/colors)
          const tId = r.tournamentId || m.tournamentId;
          if (tId) {
            const tSnap = await getDoc(doc(db, "tournaments", tId));
            if (tSnap.exists()) {
              const t = { id: tSnap.id, ...(tSnap.data() as any) } as TournamentDoc;
              setTournament(t);
            }
          }
        }
      }

      // Player docs for up to 4 participants in this match
      const ids = Array.from(
        new Set<string>([
          ...(m.teamAPlayers || []).map((p) => p.playerId).filter(Boolean),
          ...(m.teamBPlayers || []).map((p) => p.playerId).filter(Boolean),
        ])
      );
      if (ids.length) {
        const qPlayers = query(collection(db, "players"), where("__name__", "in", ids));
        const pSnap = await getDocs(qPlayers);
        const map: Record<string, PlayerDoc> = {};
        pSnap.forEach((d) => {
          map[d.id] = { id: d.id, ...(d.data() as any) };
        });
        setPlayers(map);
      } else {
        setPlayers({});
      }

      setLoading(false);
    });

    return () => unsub();
  }, [matchId]);

  const format: RoundFormat = (round?.format as RoundFormat) || "twoManBestBall";
  const isClosed = !!match?.status?.closed;

  const holes = useMemo(() => {
    const h = match?.holes || {};
    return Array.from({ length: 18 }, (_, i) => String(i + 1)).map((k) => ({
      k,
      input: h[k]?.input || {},
    }));
  }, [match]);

  function nameFor(id?: string) {
    if (!id) return "";
    const p = players[id];
    return (p?.displayName as string) || (p?.username as string) || id;
  }

  async function saveHole(k: string, nextInput: any) {
    if (!match?.id || isClosed) return;
    try {
      await updateDoc(doc(db, "matches", match.id), { [`holes.${k}.input`]: nextInput });
    } catch (e) {
      console.error("updateDoc failed", e);
      alert(`Failed to save: ${(e as any)?.code || e}`);
    }
  }

  function HoleRow({ k, input }: { k: string; input: any }) {
    if (format === "twoManScramble") {
      const a = input?.teamAGross ?? null;
      const b = input?.teamBGross ?? null;
      return (
        <div
          key={k}
          style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr", gap: 8, alignItems: "center" }}
        >
          <div>#{k}</div>
          <input
            type="number"
            inputMode="numeric"
            value={a ?? ""}
            disabled={isClosed}
            onChange={(e) =>
              saveHole(k, {
                teamAGross: e.target.value === "" ? null : Number(e.target.value),
                teamBGross: b,
              })
            }
          />
          <input
            type="number"
            inputMode="numeric"
            value={b ?? ""}
            disabled={isClosed}
            onChange={(e) =>
              saveHole(k, {
                teamAGross: a,
                teamBGross: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </div>
      );
    }

    if (format === "singles") {
      const a = input?.teamAPlayerGross ?? null;
      const b = input?.teamBPlayerGross ?? null;
      return (
        <div
          key={k}
          style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr", gap: 8, alignItems: "center" }}
        >
          <div>#{k}</div>
          <input
            type="number"
            inputMode="numeric"
            value={a ?? ""}
            disabled={isClosed}
            onChange={(e) =>
              saveHole(k, {
                teamAPlayerGross: e.target.value === "" ? null : Number(e.target.value),
                teamBPlayerGross: b,
              })
            }
          />
          <input
            type="number"
            inputMode="numeric"
            value={b ?? ""}
            disabled={isClosed}
            onChange={(e) =>
              saveHole(k, {
                teamAPlayerGross: a,
                teamBPlayerGross: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </div>
      );
    }

    // twoManBestBall / twoManShamble
    const aArr: (number | null)[] = Array.isArray(input?.teamAPlayersGross)
      ? input.teamAPlayersGross
      : [null, null];
    const bArr: (number | null)[] = Array.isArray(input?.teamBPlayersGross)
      ? input.teamBPlayersGross
      : [null, null];

    const setA = (idx: 0 | 1, val: number | null) => {
      const nextA = [...aArr];
      nextA[idx] = val;
      saveHole(k, { teamAPlayersGross: nextA, teamBPlayersGross: bArr });
    };
    const setB = (idx: 0 | 1, val: number | null) => {
      const nextB = [...bArr];
      nextB[idx] = val;
      saveHole(k, { teamAPlayersGross: aArr, teamBPlayersGross: nextB });
    };

    return (
      <div
        key={k}
        style={{ display: "grid", gridTemplateColumns: "40px repeat(4, 1fr)", gap: 8, alignItems: "center" }}
      >
        <div>#{k}</div>
        <input
          type="number"
          inputMode="numeric"
          value={aArr[0] ?? ""}
          disabled={isClosed}
          onChange={(e) => setA(0, e.target.value === "" ? null : Number(e.target.value))}
        />
        <input
          type="number"
          inputMode="numeric"
          value={aArr[1] ?? ""}
          disabled={isClosed}
          onChange={(e) => setA(1, e.target.value === "" ? null : Number(e.target.value))}
        />
        <input
          type="number"
          inputMode="numeric"
          value={bArr[0] ?? ""}
          disabled={isClosed}
          onChange={(e) => setB(0, e.target.value === "" ? null : Number(e.target.value))}
        />
        <input
          type="number"
          inputMode="numeric"
          value={bArr[1] ?? ""}
          disabled={isClosed}
          onChange={(e) => setB(1, e.target.value === "" ? null : Number(e.target.value))}
        />
      </div>
    );
  }

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!match) return <div style={{ padding: 16 }}>Match not found.</div>;

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      {/* Header with tournament + teams + player names */}
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
          <h2 style={{ margin: 0 }}>Match {match.id}</h2>
          <span style={{ opacity: 0.7 }}>{format}</span>
          {tournament && <span style={{ opacity: 0.7 }}>• {tournament.name}</span>}
        </div>

        <div style={{ display: "grid", gap: 4 }}>
          <div>
            <strong style={{ color: tournament?.teamA?.color || "#0f172a" }}>
              {tournament?.teamA?.name || "Team A"}
            </strong>
            {" — "}
            {(match.teamAPlayers || [])
              .map((p) => nameFor(p.playerId))
              .filter(Boolean)
              .join(", ")}
          </div>
          <div>
            <strong style={{ color: tournament?.teamB?.color || "#0f172a" }}>
              {tournament?.teamB?.name || "Team B"}
            </strong>
            {" — "}
            {(match.teamBPlayers || [])
              .map((p) => nameFor(p.playerId))
              .filter(Boolean)
              .join(", ")}
          </div>
        </div>
      </div>

      {/* Status */}
      <div>
        <strong>Status:</strong>{" "}
        {match.status
          ? `${match.status.leader ?? "AS"} ${match.status.margin ?? 0} • thru ${
              match.status.thru ?? 0
            } • ${match.status.closed ? "Final" : "Live"}`
          : "—"}
      </div>

      {/* Quick strokes sanity for hole 1 */}
      <div>
        <strong>Strokes (hole 1):</strong>{" "}
        A: {(match.teamAPlayers || []).map((p) => p.strokesReceived?.[0] ?? 0).join(", ")} •{" "}
        B: {(match.teamBPlayers || []).map((p) => p.strokesReceived?.[0] ?? 0).join(", ")}
      </div>

      {isClosed && <div style={{ color: "#b91c1c" }}>Final — edit a prior hole to reopen</div>}

      {/* Holes grid */}
      <div style={{ display: "grid", gap: 8 }}>
        {holes.map((h) => (
          <HoleRow key={h.k} k={h.k} input={h.input} />
        ))}
      </div>
    </div>
  );
}