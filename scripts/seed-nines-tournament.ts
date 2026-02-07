/**
 * Seed Nines Tournament
 *
 * Seeds a complete 4-team Nines tournament with dummy data:
 *   - 1 course (Journey at Pechanga)
 *   - 16 players (4 per team)
 *   - 1 tournament
 *   - 1 round
 *   - 4 groups (1 player from each team per group)
 *
 * Run:  npx ts-node seed-nines-tournament.ts [--force]
 *
 * --force  Overwrites existing documents
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// ---------- Firebase init ----------
const serviceAccountPath = path.join(__dirname, "../service-account.json");

if (fs.existsSync(serviceAccountPath)) {
  const sa = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  admin.initializeApp({ credential: admin.credential.cert(sa) });
} else {
  admin.initializeApp();
}

const db = admin.firestore();

// ---------- Handicap helpers (mirror functions/src/ghin.ts) ----------

function calculateCourseHandicap(
  handicapIndex: number,
  slopeRating: number,
  courseRating: number,
  par: number
): number {
  const raw = handicapIndex * (slopeRating / 113) + (courseRating - par);
  const rounded = Math.round(raw);
  return Number.isNaN(rounded) ? 0 : Math.min(Math.max(0, rounded), 18);
}

function calculateStrokesReceived(
  courseHandicap: number,
  holes: { number: number; hcpIndex: number }[]
): number[] {
  const strokes = Array(18).fill(0);
  const sorted = [...holes].sort((a, b) => a.hcpIndex - b.hcpIndex);
  const count = Math.min(Math.max(0, Math.round(courseHandicap)), 18);
  for (let i = 0; i < count; i++) {
    strokes[sorted[i].number - 1] = 1;
  }
  return strokes;
}

// ---------- Dummy data ----------

const COURSE = {
  id: "journeyAtPechanga",
  name: "Journey at Pechanga",
  tees: "White",
  rating: 70.8,
  slope: 128,
  par: 72,
  holes: [
    { number: 1, par: 4, hcpIndex: 7, yards: 378 },
    { number: 2, par: 4, hcpIndex: 11, yards: 355 },
    { number: 3, par: 3, hcpIndex: 15, yards: 165 },
    { number: 4, par: 5, hcpIndex: 1, yards: 518 },
    { number: 5, par: 4, hcpIndex: 9, yards: 390 },
    { number: 6, par: 4, hcpIndex: 3, yards: 410 },
    { number: 7, par: 3, hcpIndex: 17, yards: 148 },
    { number: 8, par: 5, hcpIndex: 5, yards: 505 },
    { number: 9, par: 4, hcpIndex: 13, yards: 365 },
    { number: 10, par: 4, hcpIndex: 8, yards: 395 },
    { number: 11, par: 3, hcpIndex: 16, yards: 170 },
    { number: 12, par: 4, hcpIndex: 2, yards: 425 },
    { number: 13, par: 5, hcpIndex: 10, yards: 510 },
    { number: 14, par: 4, hcpIndex: 4, yards: 400 },
    { number: 15, par: 4, hcpIndex: 12, yards: 370 },
    { number: 16, par: 3, hcpIndex: 18, yards: 155 },
    { number: 17, par: 4, hcpIndex: 6, yards: 415 },
    { number: 18, par: 5, hcpIndex: 14, yards: 530 },
  ],
};

// 16 players drawn from the real player list, with dummy handicap indexes
const PLAYERS = [
  // Team 1 – Blue
  { id: "pJaredLardeur", displayName: "Jared Lardeur", handicapIndex: 12.4 },
  { id: "pShanePeterson", displayName: "Shane Peterson", handicapIndex: 8.1 },
  { id: "pRyanBenko", displayName: "Ryan Benko", handicapIndex: 15.6 },
  { id: "pJPSaar", displayName: "JP Saar", handicapIndex: 5.3 },

  // Team 2 – Red
  { id: "pPJConnell", displayName: "PJ Connell", handicapIndex: 10.2 },
  { id: "pDanCassady", displayName: "Dan Cassady", handicapIndex: 7.8 },
  { id: "pDavidBodendorf", displayName: "David Bodendorf", handicapIndex: 14.0 },
  { id: "pDennisFurden", displayName: "Dennis Furden", handicapIndex: 3.9 },

  // Team 3 – Green
  { id: "pToddEuckert", displayName: "Todd Euckert", handicapIndex: 11.5 },
  { id: "pJasonDugan", displayName: "Jason Dugan", handicapIndex: 6.7 },
  { id: "pLouMazzarese", displayName: "Lou Mazzarese", handicapIndex: 16.8 },
  { id: "pDaveMulcahey", displayName: "Dave Mulcahey", handicapIndex: 4.2 },

  // Team 4 – Gold
  { id: "pRyanHerndon", displayName: "Ryan Herndon", handicapIndex: 9.5 },
  { id: "pPhilSalazar", displayName: "Phil Salazar", handicapIndex: 13.1 },
  { id: "pJustinCarter", displayName: "Justin Carter", handicapIndex: 2.0 },
  { id: "pHarrisonBodendorf", displayName: "Harrison Bodendorf", handicapIndex: 17.3 },
];

const TEAMS = [
  {
    id: "team1",
    name: "Blue",
    color: "#1e3a5f",
    playerIds: PLAYERS.slice(0, 4).map((p) => p.id),
  },
  {
    id: "team2",
    name: "Red",
    color: "#8b0000",
    playerIds: PLAYERS.slice(4, 8).map((p) => p.id),
  },
  {
    id: "team3",
    name: "Green",
    color: "#2d5016",
    playerIds: PLAYERS.slice(8, 12).map((p) => p.id),
  },
  {
    id: "team4",
    name: "Gold",
    color: "#b8860b",
    playerIds: PLAYERS.slice(12, 16).map((p) => p.id),
  },
];

const TOURNAMENT_ID = "2026-jared40th";
const ROUND_ID = `${TOURNAMENT_ID}-day1`;

// Groups: each group takes one player from each team (indices into PLAYERS)
// Group 1: players[0], players[4], players[8],  players[12]
// Group 2: players[1], players[5], players[9],  players[13]
// Group 3: players[2], players[6], players[10], players[14]
// Group 4: players[3], players[7], players[11], players[15]
const GROUP_ASSIGNMENTS = [
  [0, 4, 8, 12],
  [1, 5, 9, 13],
  [2, 6, 10, 14],
  [3, 7, 11, 15],
];

// Tee times starting at 8:00 AM, 10 minutes apart
const BASE_TEE_TIME = new Date("2026-03-14T08:00:00-07:00"); // PST

// ---------- Build group players ----------

function buildGroupPlayer(
  playerIndex: number,
  teamIndex: number
): {
  playerId: string;
  teamIndex: number;
  displayName: string;
  handicapIndex: number;
  courseHandicap: number;
  strokesReceived: number[];
} {
  const p = PLAYERS[playerIndex];
  const courseHandicap = calculateCourseHandicap(
    p.handicapIndex,
    COURSE.slope,
    COURSE.rating,
    COURSE.par
  );
  const strokesReceived = calculateStrokesReceived(courseHandicap, COURSE.holes);

  return {
    playerId: p.id,
    teamIndex,
    displayName: p.displayName,
    handicapIndex: p.handicapIndex,
    courseHandicap,
    strokesReceived,
  };
}

// ---------- Main ----------

async function main() {
  const force = process.argv.includes("--force");
  console.log(`\nSeeding Nines tournament${force ? " (--force)" : ""}...\n`);

  // 1. Course
  const courseRef = db.collection("courses").doc(COURSE.id);
  const courseSnap = await courseRef.get();
  if (courseSnap.exists && !force) {
    console.log(`  Course '${COURSE.id}' exists, skipping.`);
  } else {
    await courseRef.set(COURSE);
    console.log(`  ${courseSnap.exists ? "Updated" : "Created"} course: ${COURSE.name}`);
  }

  // 2. Players (batch)
  const playerBatch = db.batch();
  let playerCount = 0;
  for (const p of PLAYERS) {
    const ref = db.collection("players").doc(p.id);
    const snap = await ref.get();
    if (snap.exists && !force) continue;
    playerBatch.set(ref, {
      id: p.id,
      displayName: p.displayName,
      handicapIndex: p.handicapIndex,
    });
    playerCount++;
  }
  await playerBatch.commit();
  console.log(`  Created ${playerCount} player docs (${PLAYERS.length - playerCount} already existed).`);

  // 3. Tournament
  const tournRef = db.collection("tournaments").doc(TOURNAMENT_ID);
  const tournSnap = await tournRef.get();
  if (tournSnap.exists && !force) {
    console.log(`  Tournament '${TOURNAMENT_ID}' exists, skipping.`);
  } else {
    await tournRef.set({
      id: TOURNAMENT_ID,
      name: "2026 Jared 40th Birthday",
      year: 2026,
      active: true,
      courseId: COURSE.id,
      roundIds: [ROUND_ID],
      tournamentLogo: "",
      teams: TEAMS,
      scoreboard: {
        teamTotals: [0, 0, 0, 0],
        holesCompleted: 0,
        totalHoles: GROUP_ASSIGNMENTS.length * 18,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
    });
    console.log(`  ${tournSnap.exists ? "Updated" : "Created"} tournament: ${TOURNAMENT_ID}`);
  }

  // 4. Round
  const roundRef = db.collection("rounds").doc(ROUND_ID);
  const roundSnap = await roundRef.get();
  if (roundSnap.exists && !force) {
    console.log(`  Round '${ROUND_ID}' exists, skipping.`);
  } else {
    const groupIds = GROUP_ASSIGNMENTS.map(
      (_, i) => `${ROUND_ID}-group${i + 1}`
    );
    await roundRef.set({
      id: ROUND_ID,
      tournamentId: TOURNAMENT_ID,
      day: 1,
      courseId: COURSE.id,
      groupIds,
    });
    console.log(`  ${roundSnap.exists ? "Updated" : "Created"} round: ${ROUND_ID}`);
  }

  // 5. Groups
  for (let g = 0; g < GROUP_ASSIGNMENTS.length; g++) {
    const groupId = `${ROUND_ID}-group${g + 1}`;
    const groupRef = db.collection("groups").doc(groupId);
    const groupSnap = await groupRef.get();

    if (groupSnap.exists && !force) {
      console.log(`  Group '${groupId}' exists, skipping.`);
      continue;
    }

    const players = GROUP_ASSIGNMENTS[g].map((playerIdx, teamIdx) =>
      buildGroupPlayer(playerIdx, teamIdx)
    );

    // Build empty holes structure
    const holes: Record<string, any> = {};
    for (let h = 1; h <= 18; h++) {
      holes[String(h)] = {
        gross: [null, null, null, null],
      };
    }

    const teeTime = new Date(BASE_TEE_TIME.getTime() + g * 10 * 60 * 1000);

    await groupRef.set({
      id: groupId,
      roundId: ROUND_ID,
      tournamentId: TOURNAMENT_ID,
      groupNumber: g + 1,
      teeTime: admin.firestore.Timestamp.fromDate(teeTime),
      players,
      holes,
      computed: {
        playerPoints: [0, 0, 0, 0],
        holesCompleted: 0,
        completed: false,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
    });

    const names = players.map((p) => p.displayName).join(", ");
    console.log(
      `  ${groupSnap.exists ? "Updated" : "Created"} group ${g + 1}: ${names}`
    );
    console.log(
      `    Tee time: ${teeTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
    );
    console.log(
      `    Course HCPs: ${players.map((p) => p.courseHandicap).join(", ")}`
    );
  }

  console.log("\nDone! Tournament seeded successfully.\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
