/**
 * Seed Rounds Script
 * 
 * Creates round documents in Firestore linked to tournaments and courses.
 * Run with: npx ts-node scripts/seed-rounds.ts --input data/rounds.json
 * Add --force to overwrite existing rounds.
 * 
 * Input JSON format:
 * [
 *   {
 *     "id": "2025-rowdycup-day1",
 *     "tournamentId": "2025-rowdycup",
 *     "day": 1,
 *     "format": "twoManBestBall",
 *     "courseId": "oldDelGolfCourse",
 *     "pointsValue": 1,
 *     "trackDrives": false
 *   }
 * ]
 * 
 * Requirements:
 * - Tournament must exist in Firestore
 * - Course must exist in Firestore
 * - Format must be valid or null
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

const VALID_FORMATS = ["twoManBestBall", "twoManShamble", "twoManScramble", "singles"];

type RoundInput = {
  id: string;
  tournamentId: string;
  day?: number;
  format?: string | null;
  courseId?: string;
  pointsValue?: number;
  trackDrives?: boolean;
  locked?: boolean;
};

type ValidationError = {
  round: string;
  errors: string[];
};

/**
 * Validate a single round
 */
async function validateRound(
  round: RoundInput, 
  index: number,
  tournamentCache: Map<string, boolean>,
  courseCache: Map<string, boolean>
): Promise<ValidationError | null> {
  const errors: string[] = [];
  const label = round.id || `Round at index ${index}`;

  // Required fields
  if (!round.id || typeof round.id !== "string") {
    errors.push("Missing or invalid 'id'");
  }

  if (!round.tournamentId || typeof round.tournamentId !== "string") {
    errors.push("Missing or invalid 'tournamentId'");
  } else {
    // Check tournament exists (with caching)
    if (!tournamentCache.has(round.tournamentId)) {
      const tournamentDoc = await db.collection("tournaments").doc(round.tournamentId).get();
      tournamentCache.set(round.tournamentId, tournamentDoc.exists);
    }
    if (!tournamentCache.get(round.tournamentId)) {
      errors.push(`Tournament '${round.tournamentId}' not found`);
    }
  }

  // Validate format (can be null/undefined, but if set must be valid)
  if (round.format !== null && round.format !== undefined) {
    if (!VALID_FORMATS.includes(round.format)) {
      errors.push(`Invalid format '${round.format}'. Valid: ${VALID_FORMATS.join(", ")} or null`);
    }
  }

  // Validate courseId exists if provided
  if (round.courseId) {
    if (!courseCache.has(round.courseId)) {
      const courseDoc = await db.collection("courses").doc(round.courseId).get();
      courseCache.set(round.courseId, courseDoc.exists);
    }
    if (!courseCache.get(round.courseId)) {
      errors.push(`Course '${round.courseId}' not found`);
    }
  }

  // Validate optional fields
  if (round.day !== undefined && (typeof round.day !== "number" || round.day < 1)) {
    errors.push("Invalid 'day' (must be positive number)");
  }

  if (round.pointsValue !== undefined && (typeof round.pointsValue !== "number" || round.pointsValue < 0)) {
    errors.push("Invalid 'pointsValue' (must be non-negative number)");
  }

  if (round.trackDrives !== undefined && typeof round.trackDrives !== "boolean") {
    errors.push("Invalid 'trackDrives' (must be boolean)");
  }

  if (round.locked !== undefined && typeof round.locked !== "boolean") {
    errors.push("Invalid 'locked' (must be boolean)");
  }

  return errors.length > 0 ? { round: label, errors } : null;
}

async function seedRounds(inputFile: string, force: boolean) {
  // Read input file
  const inputPath = path.resolve(inputFile);
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }

  let rounds: RoundInput[];
  try {
    rounds = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  } catch (e) {
    console.error(`❌ Invalid JSON in ${inputPath}`);
    process.exit(1);
  }

  if (!Array.isArray(rounds)) {
    console.error("❌ Input must be a JSON array of rounds");
    process.exit(1);
  }

  console.log(`📋 Found ${rounds.length} rounds to seed`);

  // Caches for tournament/course lookups
  const tournamentCache = new Map<string, boolean>();
  const courseCache = new Map<string, boolean>();

  // Validate ALL rounds first
  console.log("🔍 Validating rounds...");
  const validationErrors: ValidationError[] = [];
  for (let i = 0; i < rounds.length; i++) {
    const error = await validateRound(rounds[i], i, tournamentCache, courseCache);
    if (error) validationErrors.push(error);
  }

  if (validationErrors.length > 0) {
    console.error("\n❌ Validation failed! No rounds were created.\n");
    for (const err of validationErrors) {
      console.error(`  ${err.round}:`);
      for (const msg of err.errors) {
        console.error(`    - ${msg}`);
      }
    }
    process.exit(1);
  }

  console.log("✅ All rounds validated successfully\n");

  // Track results
  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];

  // Create batch write
  const batch = db.batch();

  for (const round of rounds) {
    const docRef = db.collection("rounds").doc(round.id);

    // Check if exists
    const existingDoc = await docRef.get();
    if (existingDoc.exists && !force) {
      console.log(`⏭️  Skipping ${round.id} (already exists)`);
      skipped.push(round.id);
      continue;
    }

    // Build round doc
    const roundDoc: Record<string, any> = {
      id: round.id,
      tournamentId: round.tournamentId,
      format: round.format ?? null,
      day: round.day ?? 0,
      pointsValue: round.pointsValue ?? 1,
      trackDrives: round.trackDrives ?? false,
      locked: round.locked ?? false,
      matchIds: existingDoc.exists ? (existingDoc.data()?.matchIds || []) : [],
    };

    if (round.courseId) {
      roundDoc.courseId = round.courseId;
    }

    batch.set(docRef, roundDoc);

    if (existingDoc.exists) {
      updated.push(round.id);
      console.log(`🔄 Updating ${round.id}`);
    } else {
      created.push(round.id);
      console.log(`✅ Creating ${round.id}`);
    }
  }

  // Commit batch
  if (created.length > 0 || updated.length > 0) {
    await batch.commit();
  }

  // Note about Cloud Function
  if (created.length > 0) {
    console.log("\n⚡ Note: linkRoundToTournament Cloud Function will auto-add roundIds to tournament docs.");
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("SUMMARY");
  console.log("=".repeat(50));
  if (created.length > 0) console.log(`✅ Created: ${created.length}`);
  if (updated.length > 0) console.log(`🔄 Updated: ${updated.length}`);
  if (skipped.length > 0) console.log(`⏭️  Skipped: ${skipped.length}`);

  // Output round IDs for reference
  console.log("\n" + "=".repeat(50));
  console.log("ROUND IDS (use in matches.json)");
  console.log("=".repeat(50));
  for (const round of rounds) {
    console.log(`  Day ${round.day || "?"}: "${round.id}" (${round.format || "format TBD"})`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const inputIndex = args.indexOf("--input");
const force = args.includes("--force");

if (inputIndex === -1 || !args[inputIndex + 1]) {
  console.log("Usage: npx ts-node scripts/seed-rounds.ts --input data/rounds.json [--force]");
  console.log("\nOptions:");
  console.log("  --force    Overwrite existing rounds");
  console.log("\nRequirements:");
  console.log("  - Tournament must exist (run seed-tournament.ts first)");
  console.log("  - Course must exist if courseId is provided (run seed-courses.ts first)");
  console.log("\nValid formats: twoManBestBall, twoManShamble, twoManScramble, singles, or null");
  process.exit(1);
}

const inputFile = args[inputIndex + 1];

seedRounds(inputFile, force)
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
