import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { collection, doc, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { TournamentDoc, RoundDoc, MatchDoc, CourseDoc } from "../types";
import Layout from "../components/Layout";
import LastUpdated from "../components/LastUpdated";
import ScoreBlock from "../components/ScoreBlock";
import ScoreTrackerBar from "../components/ScoreTrackerBar";
import OfflineImage from "../components/OfflineImage";
import { formatRoundType } from "../utils";

/**
 * Tournament detail page for viewing historical (archived) tournaments.
 * This is a read-only view - no score editing allowed.
 */
export default function Tournament() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<TournamentDoc | null>(null);
  const [rounds, setRounds] = useState<RoundDoc[]>([]);
  const [matchesByRound, setMatchesByRound] = useState<Record<string, MatchDoc[]>>({});
  const [courses, setCourses] = useState<Record<string, CourseDoc>>({});

  // Track loading states
  const [tournamentLoaded, setTournamentLoaded] = useState(false);
  const [roundsLoaded, setRoundsLoaded] = useState(false);
  const [matchesLoaded, setMatchesLoaded] = useState(false);

  // 1) Subscribe to the specific tournament
  useEffect(() => {
    if (!tournamentId) {
      setTournamentLoaded(true);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "tournaments", tournamentId),
      (snap) => {
        if (snap.exists()) {
          setTournament({ id: snap.id, ...snap.data() } as TournamentDoc);
        } else {
          setTournament(null);
        }
        setTournamentLoaded(true);
      },
      (err) => {
        console.error("Tournament subscription error:", err);
        setTournamentLoaded(true);
      }
    );
    return () => unsub();
  }, [tournamentId]);

  // 2) Subscribe to rounds when tournament is available
  useEffect(() => {
    if (!tournamentId) {
      setRounds([]);
      setRoundsLoaded(tournamentLoaded);
      return;
    }

    const unsub = onSnapshot(
      query(collection(db, "rounds"), where("tournamentId", "==", tournamentId)),
      (snap) => {
        let rds = snap.docs.map(d => ({ id: d.id, ...d.data() } as RoundDoc));
        rds = rds.sort((a, b) => (a.day ?? 0) - (b.day ?? 0) || a.id.localeCompare(b.id));
        setRounds(rds);
        setRoundsLoaded(true);
      },
      (err) => {
        console.error("Rounds subscription error:", err);
        setRoundsLoaded(true);
      }
    );
    return () => unsub();
  }, [tournamentId, tournamentLoaded]);

  // 3) Subscribe to ALL matches for this tournament
  useEffect(() => {
    if (!tournamentId) {
      setMatchesByRound({});
      setMatchesLoaded(tournamentLoaded);
      return;
    }

    const unsub = onSnapshot(
      query(collection(db, "matches"), where("tournamentId", "==", tournamentId)),
      (snap) => {
        const bucket: Record<string, MatchDoc[]> = {};
        snap.docs.forEach(d => {
          const match = { id: d.id, ...d.data() } as MatchDoc;
          if (match.roundId) {
            if (!bucket[match.roundId]) bucket[match.roundId] = [];
            bucket[match.roundId].push(match);
          }
        });
        setMatchesByRound(bucket);
        setMatchesLoaded(true);
      },
      (err) => {
        console.error("Matches subscription error:", err);
        setMatchesLoaded(true);
      }
    );
    return () => unsub();
  }, [tournamentId, tournamentLoaded]);

  // 4) Subscribe to courses
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "courses"),
      (snap) => {
        const lookup: Record<string, CourseDoc> = {};
        snap.docs.forEach(d => {
          lookup[d.id] = { id: d.id, ...d.data() } as CourseDoc;
        });
        setCourses(lookup);
      },
      (err) => console.error("Courses subscription error:", err)
    );
    return () => unsub();
  }, []);

  // Compute loading state
  useEffect(() => {
    if (tournamentLoaded && (!tournament || (roundsLoaded && matchesLoaded))) {
      setLoading(false);
    }
  }, [tournamentLoaded, tournament, roundsLoaded, matchesLoaded]);

  // Build coursesByRound lookup
  const coursesByRound = useMemo(() => {
    const result: Record<string, CourseDoc | null> = {};
    rounds.forEach(r => {
      result[r.id] = r.courseId ? (courses[r.courseId] || null) : null;
    });
    return result;
  }, [rounds, courses]);

  // Stats Calculation
  const { stats, roundStats, totalPointsAvailable } = useMemo(() => {
    let fA = 0, fB = 0, pA = 0, pB = 0;
    let totalPts = 0;
    const rStats: Record<string, { fA: number; fB: number; pA: number; pB: number }> = {};

    const roundPvLookup: Record<string, number> = {};
    rounds.forEach(r => { 
      rStats[r.id] = { fA: 0, fB: 0, pA: 0, pB: 0 }; 
      roundPvLookup[r.id] = r.pointsValue ?? 1;
    });

    const allMatches = Object.values(matchesByRound).flat();

    for (const m of allMatches) {
      const pv = m.roundId ? (roundPvLookup[m.roundId] ?? 1) : 1;
      const w = m.result?.winner;
      
      const ptsA = w === "teamA" ? pv : w === "AS" ? pv / 2 : 0;
      const ptsB = w === "teamB" ? pv : w === "AS" ? pv / 2 : 0;

      const isClosed = m.status?.closed === true;
      const isStarted = (m.status?.thru ?? 0) > 0;

      if (isClosed) { fA += ptsA; fB += ptsB; }
      else if (isStarted) { pA += ptsA; pB += ptsB; }

      if (m.roundId && rStats[m.roundId]) {
        if (isClosed) {
          rStats[m.roundId].fA += ptsA;
          rStats[m.roundId].fB += ptsB;
        } else if (isStarted) {
          rStats[m.roundId].pA += ptsA;
          rStats[m.roundId].pB += ptsB;
        }
      }

      totalPts += pv;
    }

    const finalTotalPts = tournament?.totalPointsAvailable ?? totalPts;

    return { stats: { fA, fB, pA, pB }, roundStats: rStats, totalPointsAvailable: finalTotalPts };
  }, [matchesByRound, rounds, tournament?.totalPointsAvailable]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner-lg"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <Layout title="Tournament" showBack>
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-text">Tournament not found.</div>
          <Link to="/history" className="btn btn-primary mt-4">Back to History</Link>
        </div>
      </Layout>
    );
  }

  const tName = tournament.name || "Tournament";
  const tSeries = tournament.series;
  const tLogo = tournament.tournamentLogo;
  const pointsToWin = totalPointsAvailable ? (totalPointsAvailable / 2 + 0.5) : null;
  const pointsToWinDisplay = pointsToWin !== null ? (Number.isInteger(pointsToWin) ? String(pointsToWin) : pointsToWin.toFixed(1)) : "";

  return (
    <Layout title={tName} series={tSeries} showBack tournamentLogo={tLogo}>
      <div style={{ padding: 16, display: "grid", gap: 24 }}>
        
        {/* HERO SCOREBOARD */}
        <section className="card" style={{ textAlign: 'center', padding: 24 }}>
          <h2 style={{ 
            margin: "0 0 6px 0", 
            fontSize: "0.85rem", 
            color: "var(--text-secondary)", 
            textTransform: "uppercase", 
            letterSpacing: "0.1em" 
          }}>
            Final Score
          </h2>

          {/* Score Tracker Bar */}
          {totalPointsAvailable > 0 && (
            <div style={{ margin: "4px 0 16px 0" }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                {pointsToWinDisplay} points needed to win
              </div>
              <ScoreTrackerBar
                totalPoints={totalPointsAvailable}
                teamAConfirmed={stats.fA}
                teamBConfirmed={stats.fB}
                teamAPending={stats.pA}
                teamBPending={stats.pB}
                teamAColor={tournament.teamA?.color}
                teamBColor={tournament.teamB?.color}
              />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "center" }}>
            {/* Team A */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <OfflineImage 
                src={tournament.teamA?.logo} 
                alt={tournament.teamA?.name || "Team A"}
                fallbackIcon="🔵"
                style={{ width: 48, height: 48, objectFit: "contain", marginBottom: 8 }}
              />
              <div style={{ 
                fontWeight: 800, 
                color: tournament.teamA?.color || "var(--team-a-default)", 
                fontSize: "1.1rem", 
                marginBottom: 4 
              }}>
                {tournament.teamA?.name || "Team A"}
              </div>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, lineHeight: 1 }}>
                <span style={{ color: tournament.teamA?.color || "var(--team-a-default)" }}>{stats.fA}</span>
              </div>
            </div>

            {/* Center spacer */}
            <div style={{ height: 40, width: 2 }}></div>

            {/* Team B */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <OfflineImage 
                src={tournament.teamB?.logo} 
                alt={tournament.teamB?.name || "Team B"}
                fallbackIcon="🔴"
                style={{ width: 48, height: 48, objectFit: "contain", marginBottom: 8 }}
              />
              <div style={{ 
                fontWeight: 800, 
                color: tournament.teamB?.color || "var(--team-b-default)", 
                fontSize: "1.1rem", 
                marginBottom: 4 
              }}>
                {tournament.teamB?.name || "Team B"}
              </div>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, lineHeight: 1 }}>
                <span style={{ color: tournament.teamB?.color || "var(--team-b-default)" }}>{stats.fB}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ROUNDS LIST */}
        <section style={{ display: "grid", gap: 12 }}>
          <h3 style={{ 
            margin: "0 0 8px 0", 
            fontSize: "0.9rem", 
            textTransform: "uppercase", 
            color: "var(--text-secondary)",
            letterSpacing: "0.05em",
            paddingLeft: 4
          }}>
            Rounds
          </h3>
          
          {rounds.map((r, idx) => {
            const rs = roundStats[r.id];
            const course = coursesByRound[r.id];
            const courseName = course?.name || r.course?.name;
            
            return (
              <Link 
                key={r.id} 
                to={`/round/${r.id}`} 
                className="card card-hover"
                style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}
              >
                {/* Team A - Left */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <OfflineImage 
                    src={tournament.teamA?.logo} 
                    alt={tournament.teamA?.name || "Team A"}
                    fallbackIcon="🔵"
                    style={{ width: 28, height: 28, objectFit: "contain" }}
                  />
                  <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
                    <ScoreBlock
                      final={rs?.fA ?? 0}
                      proj={rs?.pA ?? 0}
                      color={tournament.teamA?.color}
                    />
                  </span>
                </div>

                {/* Round Info - Center */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 2 }}>Round {idx + 1}</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{formatRoundType(r.format)}</div>
                  {courseName && (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>{courseName}</div>
                  )}
                </div>

                {/* Team B - Right */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>  
                  <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
                    <ScoreBlock
                      final={rs?.fB ?? 0}
                      proj={rs?.pB ?? 0}
                      color={tournament.teamB?.color}
                      projLeft
                    />
                  </span>
                  <OfflineImage 
                    src={tournament.teamB?.logo} 
                    alt={tournament.teamB?.name || "Team B"}
                    fallbackIcon="🔴"
                    style={{ width: 28, height: 28, objectFit: "contain" }}
                  />
                </div>
              </Link>
            );
          })}
        </section>

        <LastUpdated />
      </div>
    </Layout>
  );
}
