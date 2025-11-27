/**
 * Seed Matches Script
 * 
 * Creates match documents with pre-calculated course handicaps and strokesReceived arrays.
 * Run with: npx ts-node scripts/seed-matches.ts --input data/matches.json
 * Add --force to overwrite existing matches.
 * 
 * Input JSON format:
 * [
 *   {
 *     "id": "2025-rowdycup-day1-match1",
 *     "roundId": "2025-rowdycup-day1",
 *     "teamAPlayerIds": ["pPlayer1", "pPlayer2"],
 *     "teamBPlayerIds": ["pPlayer3", "pPlayer4"]
 *   }
 * ]
 * 
 * The script will:
 * 1. Fetch round -> tournament -> handicap indexes for each player
 * 2. Fetch round -> course -> rating/slope/hcpIndex array
 * 3. Calculate course handicap for each player: index × (slope ÷ 113) + (rating - par)
 * 4. Find lowest course handicap in the match, roll all players down to that
 * 5. Distribute strokes to holes based on course hcpIndex (1 = hardest hole)
 * 6. Store courseHandicaps array and strokesReceived arrays as STATIC data
 * 
 * Requirements:
 * - Round must exist in Firestore
 * - Round must have tournamentId and courseId
 * - All player IDs must be in tournament roster with handicaps
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, "../service-account.json");

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  admin.initializeApp();
}

const db = admin.firestore();

type MatchInput = {
  id: string;
  roundId: string;
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
};

type HoleInfo = {
  number: number;
  par: number;
  hcpIndex: number;
};

type CourseData = {
  rating: number;
  slope: number;
  par: number;
  holes: HoleInfo[];
};

type TournamentData = {
  id: string;
  teamAHandicaps: Record<string, number>;
  teamBHandicaps: Record<string, number>;
  teamARoster: string[];
  teamBRoster: string[];
};

type RoundData = {
  id: string;
  tournamentId: string;
  courseId: string;
  format: string | null;
};

type ValidationError = {
  match: string;
  errors: string[];
};

/**
 * Calculate course handicap from handicap index
 * Formula: index × (slope ÷ 113) + (rating - par)
 * Rounded to nearest integer
 */
function calculateCourseHandicap(handicapIndex: number, slope: number, rating: number, par: number): number {
  const courseHcp = handicapIndex * (slope / 113) + (rating - par);
  return Math.round(courseHcp);
}

/**
 * Calculate strokesReceived array (18 elements of 0 or 1)
 * Player receives strokes on holes with lowest hcpIndex values
 */
function calculateStrokesReceived(strokes: number, holes: HoleInfo[]): number[] {
  // Create array of 18 zeros
  const strokesReceived = new Array(18).fill(0);

  if (strokes <= 0) return strokesReceived;

  // Sort holes by hcpIndex (1 = hardest, receives stroke first)
  const holesByDifficulty = [...holes].sort((a, b) => a.hcpIndex - b.hcpIndex);

  // Assign strokes to hardest holes first
  const strokesToAssign = Math.min(strokes, 18); // Cap at 18
  for (let i = 0; i < strokesToAssign; i++) {
    const holeNumber = holesByDifficulty[i].number;
    strokesReceived[holeNumber - 1] = 1; // Array is 0-indexed, holes are 1-indexed
  }

  return strokesReceived;
}

/**
 * Validate a single match and gather required data
 */
async function validateMatch(
  match: MatchInput,
  index: number,
  roundCache: Map<string, RoundData | null>,
  tournamentCache: Map<string, TournamentData | null>,
  courseCache: Map<string, CourseData | null>
): Promise<{ error: ValidationError | null; round?: RoundData; tournament?: TournamentData; course?: CourseData }> {
  const errors: string[] = [];
  const label = match.id || `Match at index ${index}`;

  // Required fields
  if (!match.id || typeof match.id !== "string") {
    errors.push("Missing or invalid 'id'");
  }

  if (!match.roundId || typeof match.roundId !== "string") {
    errors.push("Missing or invalid 'roundId'");
  }

  if (!Array.isArray(match.teamAPlayerIds) || match.teamAPlayerIds.length === 0) {
    errors.push("Missing or empty 'teamAPlayerIds'");
  }

  if (!Array.isArray(match.teamBPlayerIds) || match.teamBPlayerIds.length === 0) {
    errors.push("Missing or empty 'teamBPlayerIds'");
  }

  // If basic validation fails, return early
  if (errors.length > 0) {
    return { error: { match: label, errors } };
  }

  // Fetch round data (with caching)
  if (!roundCache.has(match.roundId)) {
    const roundDoc = await db.collection("rounds").doc(match.roundId).get();
    if (roundDoc.exists) {
      const data = roundDoc.data()!;
      roundCache.set(match.roundId, {
        id: match.roundId,
        tournamentId: data.tournamentId,
        courseId: data.courseId,
        format: data.format,
      });
    } else {
      roundCache.set(match.roundId, null);
    }
  }

  const round = roundCache.get(match.roundId);
  if (!round) {
    errors.push(`Round '${match.roundId}' not found`);
    return { error: { match: label, errors } };
  }

  if (!round.tournamentId) {
    errors.push(`Round '${match.roundId}' is missing tournamentId`);
  }

  if (!round.courseId) {
    errors.push(`Round '${match.roundId}' is missing courseId`);
  }

  if (errors.length > 0) {
    return { error: { match: label, errors } };
  }

  // Fetch tournament data (with caching)
  if (!tournamentCache.has(round.tournamentId)) {
    const tournamentDoc = await db.collection("tournaments").doc(round.tournamentId).get();
    if (tournamentDoc.exists) {
      const data = tournamentDoc.data()!;
      
      // Flatten roster
      const teamARoster: string[] = [];
      const teamBRoster: string[] = [];
      
      if (data.teamA?.rosterByTier) {
        for (const tier of ["A", "B", "C", "D"]) {
          teamARoster.push(...(data.teamA.rosterByTier[tier] || []));
        }
      }
      if (data.teamB?.rosterByTier) {
        for (const tier of ["A", "B", "C", "D"]) {
          teamBRoster.push(...(data.teamB.rosterByTier[tier] || []));
        }
      }

      tournamentCache.set(round.tournamentId, {
        id: round.tournamentId,
        teamAHandicaps: data.teamA?.handicapByPlayer || {},
        teamBHandicaps: data.teamB?.handicapByPlayer || {},
        teamARoster,
        teamBRoster,
      });
    } else {
      tournamentCache.set(round.tournamentId, null);
    }
  }

  const tournament = tournamentCache.get(round.tournamentId);
  if (!tournament) {
    errors.push(`Tournament '${round.tournamentId}' not found`);
    return { error: { match: label, errors } };
  }

  // Fetch course data (with caching)
  if (!courseCache.has(round.courseId)) {
    const courseDoc = await db.collection("courses").doc(round.courseId).get();
    if (courseDoc.exists) {
      const data = courseDoc.data()!;
      courseCache.set(round.courseId, {
        rating: data.rating,
        slope: data.slope,
        par: data.par,
        holes: data.holes,
      });
    } else {
      courseCache.set(round.courseId, null);
    }
  }

  const course = courseCache.get(round.courseId);
  if (!course) {
    errors.push(`Course '${round.courseId}' not found`);
    return { error: { match: label, errors } };
  }

  if (!course.rating || !course.slope) {
    errors.push(`Course '${round.courseId}' is missing rating or slope`);
  }

  if (!course.holes || course.holes.length !== 18) {
    errors.push(`Course '${round.courseId}' does not have 18 holes`);
  }

  // Validate player IDs are in tournament roster and have handicaps
  for (const playerId of match.teamAPlayerIds) {
    if (!tournament.teamARoster.includes(playerId)) {
      errors.push(`Player '${playerId}' is not in Team A roster for tournament '${round.tournamentId}'`);
    } else if (tournament.teamAHandicaps[playerId] === undefined) {
      errors.push(`Player '${playerId}' is missing handicap in tournament '${round.tournamentId}'`);
    }
  }

  for (const playerId of match.teamBPlayerIds) {
    if (!tournament.teamBRoster.includes(playerId)) {
      errors.push(`Player '${playerId}' is not in Team B roster for tournament '${round.tournamentId}'`);
    } else if (tournament.teamBHandicaps[playerId] === undefined) {
      errors.push(`Player '${playerId}' is missing handicap in tournament '${round.tournamentId}'`);
    }
  }

  // Validate player counts match format expectations
  const format = round.format;
  if (format === "singles") {
    if (match.teamAPlayerIds.length !== 1 || match.teamBPlayerIds.length !== 1) {
      errors.push(`Singles format requires exactly 1 player per team (got ${match.teamAPlayerIds.length} vs ${match.teamBPlayerIds.length})`);
    }
  } else if (format && ["twoManBestBall", "twoManShamble", "twoManScramble"].includes(format)) {
    if (match.teamAPlayerIds.length !== 2 || match.teamBPlayerIds.length !== 2) {
      errors.push(`${format} requires exactly 2 players per team (got ${match.teamAPlayerIds.length} vs ${match.teamBPlayerIds.length})`);
    }
  }

  if (errors.length > 0) {
    return { error: { match: label, errors } };
  }

  return { error: null, round, tournament, course };
}

async function seedMatches(inputFile: string, force: boolean) {
  // Read input file
  const inputPath = path.resolve(inputFile);
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }

  let matches: MatchInput[];
  try {
    matches = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  } catch (e) {
    console.error(`❌ Invalid JSON in ${inputPath}`);
    process.exit(1);
  }

  if (!Array.isArray(matches)) {
    console.error("❌ Input must be a JSON array of matches");
    process.exit(1);
  }

  console.log(`📋 Found ${matches.length} matches to seed`);

  // Caches for lookups
  const roundCache = new Map<string, RoundData | null>();
  const tournamentCache = new Map<string, TournamentData | null>();
  const courseCache = new Map<string, CourseData | null>();

  // Validate ALL matches first and collect data
  console.log("🔍 Validating matches...");
  const validationErrors: ValidationError[] = [];
  const matchData: { match: MatchInput; round: RoundData; tournament: TournamentData; course: CourseData }[] = [];

  for (let i = 0; i < matches.length; i++) {
    const result = await validateMatch(matches[i], i, roundCache, tournamentCache, courseCache);
    if (result.error) {
      validationErrors.push(result.error);
    } else {
      matchData.push({
        match: matches[i],
        round: result.round!,
        tournament: result.tournament!,
        course: result.course!,
      });
    }
  }

  if (validationErrors.length > 0) {
    console.error("\n❌ Validation failed! No matches were created.\n");
    for (const err of validationErrors) {
      console.error(`  ${err.match}:`);
      for (const msg of err.errors) {
        console.error(`    - ${msg}`);
      }
    }
    process.exit(1);
  }

  console.log("✅ All matches validated successfully\n");

  // Track results
  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];

  // Process each match
  const batch = db.batch();

  for (const { match, round, tournament, course } of matchData) {
    const docRef = db.collection("matches").doc(match.id);

    // Check if exists
    const existingDoc = await docRef.get();
    if (existingDoc.exists && !force) {
      console.log(`⏭️  Skipping ${match.id} (already exists)`);
      skipped.push(match.id);
      continue;
    }

    // Calculate course handicaps for all players
    const allPlayerIds = [...match.teamAPlayerIds, ...match.teamBPlayerIds];
    const courseHandicaps: number[] = [];

    for (const playerId of match.teamAPlayerIds) {
      const handicapIndex = tournament.teamAHandicaps[playerId];
      const courseHcp = calculateCourseHandicap(handicapIndex, course.slope, course.rating, course.par);
      courseHandicaps.push(courseHcp);
    }

    for (const playerId of match.teamBPlayerIds) {
      const handicapIndex = tournament.teamBHandicaps[playerId];
      const courseHcp = calculateCourseHandicap(handicapIndex, course.slope, course.rating, course.par);
      courseHandicaps.push(courseHcp);
    }

    // Find lowest course handicap and roll everyone down
    const lowestCourseHcp = Math.min(...courseHandicaps);
    const strokesForEachPlayer = courseHandicaps.map(hcp => hcp - lowestCourseHcp);

    // Build teamAPlayers and teamBPlayers with strokesReceived
    const teamAPlayers = match.teamAPlayerIds.map((playerId, idx) => ({
      playerId,
      strokesReceived: calculateStrokesReceived(strokesForEachPlayer[idx], course.holes),
    }));

    const teamBPlayers = match.teamBPlayerIds.map((playerId, idx) => ({
      playerId,
      strokesReceived: calculateStrokesReceived(strokesForEachPlayer[match.teamAPlayerIds.length + idx], course.holes),
    }));

    // Build match document
    const matchDoc: Record<string, any> = {
      id: match.id,
      roundId: match.roundId,
      tournamentId: round.tournamentId,
      teamAPlayers,
      teamBPlayers,
      courseHandicaps, // [teamA player 1, teamA player 2, teamB player 1, teamB player 2]
      status: {
        leader: null,
        margin: 0,
        thru: 0,
        dormie: false,
        closed: false,
      },
      result: {},
      holes: {}, // Cloud Function will initialize structure
    };

    batch.set(docRef, matchDoc);

    if (existingDoc.exists) {
      updated.push(match.id);
    } else {
      created.push(match.id);
    }

    // Log details
    console.log(`\n${existingDoc.exists ? "🔄" : "✅"} ${match.id}`);
    console.log(`   Round: ${round.id} | Format: ${round.format || "TBD"}`);
    console.log(`   Course handicaps: [${courseHandicaps.join(", ")}] (lowest: ${lowestCourseHcp})`);
    console.log(`   Strokes received: [${strokesForEachPlayer.join(", ")}]`);
    
    // Show player breakdown
    const playerBreakdown: string[] = [];
    for (let i = 0; i < match.teamAPlayerIds.length; i++) {
      const playerId = match.teamAPlayerIds[i];
      const hcpIdx = tournament.teamAHandicaps[playerId];
      const courseHcp = courseHandicaps[i];
      const strokes = strokesForEachPlayer[i];
      playerBreakdown.push(`${playerId.slice(1)} (idx:${hcpIdx} → ch:${courseHcp} → ${strokes})`);
    }
    for (let i = 0; i < match.teamBPlayerIds.length; i++) {
      const playerId = match.teamBPlayerIds[i];
      const hcpIdx = tournament.teamBHandicaps[playerId];
      const courseHcp = courseHandicaps[match.teamAPlayerIds.length + i];
      const strokes = strokesForEachPlayer[match.teamAPlayerIds.length + i];
      playerBreakdown.push(`${playerId.slice(1)} (idx:${hcpIdx} → ch:${courseHcp} → ${strokes})`);
    }
    console.log(`   Players: ${playerBreakdown.join(" vs ")}`);
  }

  // Commit batch
  if (created.length > 0 || updated.length > 0) {
    await batch.commit();
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  if (created.length > 0) console.log(`✅ Created: ${created.length}`);
  if (updated.length > 0) console.log(`🔄 Updated: ${updated.length}`);
  if (skipped.length > 0) console.log(`⏭️  Skipped: ${skipped.length}`);

  console.log("\n⚡ Note: seedMatchBoilerplate Cloud Function will initialize hole structures.");
}

// Parse command line arguments
const args = process.argv.slice(2);
const inputIndex = args.indexOf("--input");
const force = args.includes("--force");

if (inputIndex === -1 || !args[inputIndex + 1]) {
  console.log("Usage: npx ts-node scripts/seed-matches.ts --input data/matches.json [--force]");
  console.log("\nOptions:");
  console.log("  --force    Overwrite existing matches");
  console.log("\nRequirements:");
  console.log("  - Round must exist (run seed-rounds.ts first)");
  console.log("  - Round must have tournamentId and courseId");
  console.log("  - All players must be in tournament roster with handicaps");
  console.log("\nThe script automatically:");
  console.log("  - Calculates course handicaps from player index + course rating/slope");
  console.log("  - Rolls all players down to lowest handicap in match");
  console.log("  - Distributes strokes to holes based on course hcpIndex");
  process.exit(1);
}

const inputFile = args[inputIndex + 1];

seedMatches(inputFile, force)
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
