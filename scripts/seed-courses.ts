/**
 * Seed Courses Script
 * 
 * Creates course documents in Firestore with hole data, rating, and slope.
 * Run with: npx ts-node scripts/seed-courses.ts --input data/courses.json
 * Add --force to overwrite existing courses.
 * 
 * Input JSON format:
 * [
 *   {
 *     "name": "Old Del Golf Course",
 *     "tees": "Blue",
 *     "rating": 70.5,
 *     "slope": 121,
 *     "holes": [
 *       { "number": 1, "par": 4, "hcpIndex": 7, "yards": 380 },
 *       ...18 holes total
 *     ]
 *   }
 * ]
 * 
 * Output: Creates courses/{id} docs with all hole info and rating/slope for handicap calculations.
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

type HoleInput = {
  number: number;
  par: number;
  hcpIndex: number;
  yards?: number;
};

type CourseInput = {
  name: string;
  tees?: string;
  rating: number;
  slope: number;
  holes: HoleInput[];
};

type ValidationError = {
  course: string;
  errors: string[];
};

/**
 * Generate a slug ID from course name
 * "Old Del Golf Course" -> "oldDelGolfCourse"
 */
function generateCourseId(name: string): string {
  const words = name.trim().split(/\s+/);
  return words
    .map((word, index) => {
      const lower = word.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (index === 0) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

/**
 * Validate a single course
 */
function validateCourse(course: CourseInput, index: number): ValidationError | null {
  const errors: string[] = [];
  const label = course.name || `Course at index ${index}`;

  // Required fields
  if (!course.name || typeof course.name !== "string" || course.name.trim() === "") {
    errors.push("Missing or invalid 'name' (required string)");
  }

  if (typeof course.rating !== "number" || course.rating <= 0) {
    errors.push(`Invalid 'rating': ${course.rating} (must be positive number)`);
  }

  if (typeof course.slope !== "number" || course.slope <= 0) {
    errors.push(`Invalid 'slope': ${course.slope} (must be positive number)`);
  }

  // Validate holes array
  if (!Array.isArray(course.holes)) {
    errors.push("Missing 'holes' array");
  } else if (course.holes.length !== 18) {
    errors.push(`Expected 18 holes, got ${course.holes.length}`);
  } else {
    // Validate each hole
    const hcpIndexes = new Set<number>();
    const holeNumbers = new Set<number>();

    for (let i = 0; i < course.holes.length; i++) {
      const hole = course.holes[i];
      const holeLabel = `Hole ${i + 1}`;

      if (typeof hole.number !== "number" || hole.number < 1 || hole.number > 18) {
        errors.push(`${holeLabel}: Invalid 'number' (must be 1-18)`);
      } else {
        if (holeNumbers.has(hole.number)) {
          errors.push(`${holeLabel}: Duplicate hole number ${hole.number}`);
        }
        holeNumbers.add(hole.number);
      }

      if (typeof hole.par !== "number" || ![3, 4, 5].includes(hole.par)) {
        errors.push(`${holeLabel}: Invalid 'par' (must be 3, 4, or 5)`);
      }

      if (typeof hole.hcpIndex !== "number" || hole.hcpIndex < 1 || hole.hcpIndex > 18) {
        errors.push(`${holeLabel}: Invalid 'hcpIndex' (must be 1-18)`);
      } else {
        if (hcpIndexes.has(hole.hcpIndex)) {
          errors.push(`${holeLabel}: Duplicate hcpIndex ${hole.hcpIndex}`);
        }
        hcpIndexes.add(hole.hcpIndex);
      }
    }

    // Verify all hcpIndexes 1-18 are present
    if (hcpIndexes.size === 18) {
      for (let i = 1; i <= 18; i++) {
        if (!hcpIndexes.has(i)) {
          errors.push(`Missing hcpIndex ${i} (each hole needs unique hcpIndex 1-18)`);
        }
      }
    }
  }

  return errors.length > 0 ? { course: label, errors } : null;
}

async function seedCourses(inputFile: string, force: boolean) {
  // Read input file
  const inputPath = path.resolve(inputFile);
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }

  let courses: CourseInput[];
  try {
    courses = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  } catch (e) {
    console.error(`❌ Invalid JSON in ${inputPath}`);
    process.exit(1);
  }

  if (!Array.isArray(courses)) {
    console.error("❌ Input must be a JSON array of courses");
    process.exit(1);
  }

  console.log(`📋 Found ${courses.length} courses to seed`);

  // Validate ALL courses first
  const validationErrors: ValidationError[] = [];
  for (let i = 0; i < courses.length; i++) {
    const error = validateCourse(courses[i], i);
    if (error) validationErrors.push(error);
  }

  if (validationErrors.length > 0) {
    console.error("\n❌ Validation failed! No courses were created.\n");
    for (const err of validationErrors) {
      console.error(`  ${err.course}:`);
      for (const msg of err.errors) {
        console.error(`    - ${msg}`);
      }
    }
    process.exit(1);
  }

  console.log("✅ All courses validated successfully\n");

  // Track results
  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];

  // Create batch write
  const batch = db.batch();

  for (const course of courses) {
    const docId = generateCourseId(course.name);
    const docRef = db.collection("courses").doc(docId);

    // Check if exists
    const existingDoc = await docRef.get();
    if (existingDoc.exists && !force) {
      console.log(`⏭️  Skipping ${course.name} (already exists as ${docId})`);
      skipped.push(course.name);
      continue;
    }

    // Calculate total par from holes
    const totalPar = course.holes.reduce((sum, hole) => sum + hole.par, 0);

    // Sort holes by number for consistent storage
    const sortedHoles = [...course.holes].sort((a, b) => a.number - b.number);

    const courseDoc = {
      id: docId,
      name: course.name,
      tees: course.tees || "",
      rating: course.rating,
      slope: course.slope,
      par: totalPar,
      holes: sortedHoles,
    };

    batch.set(docRef, courseDoc);
    
    if (existingDoc.exists) {
      updated.push(course.name);
      console.log(`🔄 Updating ${course.name} (${docId})`);
    } else {
      created.push(course.name);
      console.log(`✅ Creating ${course.name} (${docId})`);
    }
  }

  // Commit batch
  if (created.length > 0 || updated.length > 0) {
    await batch.commit();
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("SUMMARY");
  console.log("=".repeat(50));
  if (created.length > 0) console.log(`✅ Created: ${created.length}`);
  if (updated.length > 0) console.log(`🔄 Updated: ${updated.length}`);
  if (skipped.length > 0) console.log(`⏭️  Skipped: ${skipped.length}`);

  // Output course IDs for reference
  console.log("\n" + "=".repeat(50));
  console.log("COURSE IDS (use in rounds.json)");
  console.log("=".repeat(50));
  for (const course of courses) {
    const docId = generateCourseId(course.name);
    console.log(`  ${course.name}: "${docId}"`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const inputIndex = args.indexOf("--input");
const force = args.includes("--force");

if (inputIndex === -1 || !args[inputIndex + 1]) {
  console.log("Usage: npx ts-node scripts/seed-courses.ts --input data/courses.json [--force]");
  console.log("\nOptions:");
  console.log("  --force    Overwrite existing courses");
  console.log("\nExample courses.json:");
  console.log('[');
  console.log('  {');
  console.log('    "name": "Old Del Golf Course",');
  console.log('    "tees": "Blue",');
  console.log('    "rating": 70.5,');
  console.log('    "slope": 121,');
  console.log('    "holes": [');
  console.log('      { "number": 1, "par": 4, "hcpIndex": 7, "yards": 380 },');
  console.log('      ... 18 holes total');
  console.log('    ]');
  console.log('  }');
  console.log(']');
  process.exit(1);
}

const inputFile = args[inputIndex + 1];

seedCourses(inputFile, force)
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
