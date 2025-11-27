/**
 * Seed Tournament Script
 * 
 * Creates a tournament document in Firestore with team rosters and player handicaps.
 * Run with: npx ts-node scripts/seed-tournament.ts --input data/tournament.json
 * Add --force to overwrite existing tournament.
 * 
 * Input JSON format:
 * {
 *   "id": "2025-rowdycup",
 *   "year": 2025,
 *   "name": "Rowdy Cup 2025",
 *   "series": "rowdyCup",
 *   "active": true,
 *   "teamA": {
 *     "id": "teamA",
 *     "name": "Rancheros",
 *     "rosterByTier": { "A": ["pPlayer1"], "B": ["pPlayer2"] },
 *     "handicapByPlayer": { "pPlayer1": 7.4, "pPlayer2": 12.2 }
 *   },
 *   "teamB": { ... }
 * }
 * 
 * handicapByPlayer stores the player's HANDICAP INDEX (not course handicap).
 * Course handicap is calculated at match creation time using course rating/slope.
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

type TierMap = {
  A?: string[];
  B?: string[];
  C?: string[];
  D?: string[];
};

type TeamInput = {
  id: string;
  name: string;
  logo?: string;
  color?: string;
  rosterByTier?: TierMap;
  handicapByPlayer?: Record<string, number>;
};

type TournamentInput = {
  id: string;
  year: number;
  name: string;
  series: string;
  active: boolean;
  tournamentLogo?: string;
  teamA: TeamInput;
  teamB: TeamInput;
};

type ValidationError = {
  field: string;
  message: string;
};

/**
 * Validate tournament input and check player IDs exist
 */
async function validateTournament(tournament: TournamentInput): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Required fields
  if (!tournament.id || typeof tournament.id !== "string") {
    errors.push({ field: "id", message: "Missing or invalid tournament ID" });
  }

  if (typeof tournament.year !== "number" || tournament.year < 2000) {
    errors.push({ field: "year", message: "Invalid year (must be number >= 2000)" });
  }

  if (!tournament.name || typeof tournament.name !== "string") {
    errors.push({ field: "name", message: "Missing or invalid tournament name" });
  }

  if (!tournament.series || typeof tournament.series !== "string") {
    errors.push({ field: "series", message: "Missing or invalid series (e.g., 'rowdyCup', 'christmasClassic')" });
  }

  if (typeof tournament.active !== "boolean") {
    errors.push({ field: "active", message: "Missing or invalid 'active' (must be boolean)" });
  }

  // Validate teams
  for (const teamKey of ["teamA", "teamB"] as const) {
    const team = tournament[teamKey];
    if (!team) {
      errors.push({ field: teamKey, message: `Missing ${teamKey}` });
      continue;
    }

    if (!team.id || typeof team.id !== "string") {
      errors.push({ field: `${teamKey}.id`, message: "Missing or invalid team ID" });
    }

    if (!team.name || typeof team.name !== "string") {
      errors.push({ field: `${teamKey}.name`, message: "Missing or invalid team name" });
    }

    // Collect all player IDs from roster
    const playerIds = new Set<string>();
    if (team.rosterByTier) {
      for (const tier of ["A", "B", "C", "D"] as const) {
        const players = team.rosterByTier[tier];
        if (players && Array.isArray(players)) {
          players.forEach((id) => playerIds.add(id));
        }
      }
    }

    // Validate all player IDs exist in Firestore
    for (const playerId of playerIds) {
      const playerDoc = await db.collection("players").doc(playerId).get();
      if (!playerDoc.exists) {
        errors.push({ 
          field: `${teamKey}.rosterByTier`, 
          message: `Player '${playerId}' not found in players collection` 
        });
      }
    }

    // Validate handicaps are numbers and reference valid players
    if (team.handicapByPlayer) {
      for (const [playerId, handicap] of Object.entries(team.handicapByPlayer)) {
        if (typeof handicap !== "number" || handicap < 0 || handicap > 54) {
          errors.push({ 
            field: `${teamKey}.handicapByPlayer.${playerId}`, 
            message: `Invalid handicap ${handicap} (must be number 0-54)` 
          });
        }
        
        // Check player is in roster
        if (!playerIds.has(playerId)) {
          errors.push({ 
            field: `${teamKey}.handicapByPlayer.${playerId}`, 
            message: `Player '${playerId}' has handicap but is not in roster` 
          });
        }
      }

      // Check all rostered players have handicaps
      for (const playerId of playerIds) {
        if (team.handicapByPlayer[playerId] === undefined) {
          errors.push({ 
            field: `${teamKey}.handicapByPlayer`, 
            message: `Player '${playerId}' is in roster but missing handicap` 
          });
        }
      }
    } else if (playerIds.size > 0) {
      errors.push({ 
        field: `${teamKey}.handicapByPlayer`, 
        message: "Roster has players but handicapByPlayer is missing" 
      });
    }
  }

  return errors;
}

async function seedTournament(inputFile: string, force: boolean) {
  // Read input file
  const inputPath = path.resolve(inputFile);
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }

  let tournament: TournamentInput;
  try {
    tournament = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  } catch (e) {
    console.error(`❌ Invalid JSON in ${inputPath}`);
    process.exit(1);
  }

  if (Array.isArray(tournament)) {
    console.error("❌ Input must be a single tournament object, not an array");
    process.exit(1);
  }

  console.log(`📋 Processing tournament: ${tournament.name || tournament.id}`);

  // Validate tournament
  console.log("🔍 Validating tournament data...");
  const errors = await validateTournament(tournament);

  if (errors.length > 0) {
    console.error("\n❌ Validation failed! Tournament was not created.\n");
    for (const err of errors) {
      console.error(`  ${err.field}: ${err.message}`);
    }
    process.exit(1);
  }

  console.log("✅ Tournament validated successfully\n");

  // Check if exists
  const docRef = db.collection("tournaments").doc(tournament.id);
  const existingDoc = await docRef.get();

  if (existingDoc.exists && !force) {
    console.log(`⏭️  Tournament '${tournament.id}' already exists. Use --force to overwrite.`);
    process.exit(0);
  }

  // If setting active=true, check for other active tournaments
  if (tournament.active) {
    const activeTournaments = await db
      .collection("tournaments")
      .where("active", "==", true)
      .get();

    const otherActive = activeTournaments.docs.filter(doc => doc.id !== tournament.id);
    if (otherActive.length > 0) {
      console.log(`⚠️  Warning: Setting ${tournament.id} as active. Other active tournaments found:`);
      otherActive.forEach(doc => console.log(`    - ${doc.id}`));
      console.log("   Consider setting those to active: false\n");
    }
  }

  // Build tournament doc
  const tournamentDoc = {
    id: tournament.id,
    year: tournament.year,
    name: tournament.name,
    series: tournament.series,
    active: tournament.active,
    tournamentLogo: tournament.tournamentLogo || "",
    roundIds: existingDoc.exists ? (existingDoc.data()?.roundIds || []) : [],
    teamA: {
      id: tournament.teamA.id,
      name: tournament.teamA.name,
      logo: tournament.teamA.logo || "",
      color: tournament.teamA.color || "",
      rosterByTier: tournament.teamA.rosterByTier || { A: [], B: [], C: [], D: [] },
      handicapByPlayer: tournament.teamA.handicapByPlayer || {},
    },
    teamB: {
      id: tournament.teamB.id,
      name: tournament.teamB.name,
      logo: tournament.teamB.logo || "",
      color: tournament.teamB.color || "",
      rosterByTier: tournament.teamB.rosterByTier || { A: [], B: [], C: [], D: [] },
      handicapByPlayer: tournament.teamB.handicapByPlayer || {},
    },
  };

  // Write to Firestore
  await docRef.set(tournamentDoc);

  const action = existingDoc.exists ? "Updated" : "Created";
  console.log(`✅ ${action} tournament: ${tournament.id}`);

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("TOURNAMENT SUMMARY");
  console.log("=".repeat(50));
  console.log(`  ID: ${tournament.id}`);
  console.log(`  Name: ${tournament.name}`);
  console.log(`  Year: ${tournament.year}`);
  console.log(`  Series: ${tournament.series}`);
  console.log(`  Active: ${tournament.active}`);
  console.log("");

  // Team rosters
  for (const teamKey of ["teamA", "teamB"] as const) {
    const team = tournament[teamKey];
    console.log(`  ${team.name} (${team.id}):`);
    
    const allPlayers: string[] = [];
    if (team.rosterByTier) {
      for (const tier of ["A", "B", "C", "D"] as const) {
        const players = team.rosterByTier[tier] || [];
        if (players.length > 0) {
          console.log(`    Tier ${tier}: ${players.join(", ")}`);
          allPlayers.push(...players);
        }
      }
    }
    
    if (team.handicapByPlayer) {
      console.log(`    Handicaps:`);
      for (const playerId of allPlayers) {
        const hcp = team.handicapByPlayer[playerId];
        console.log(`      ${playerId}: ${hcp}`);
      }
    }
    console.log("");
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const inputIndex = args.indexOf("--input");
const force = args.includes("--force");

if (inputIndex === -1 || !args[inputIndex + 1]) {
  console.log("Usage: npx ts-node scripts/seed-tournament.ts --input data/tournament.json [--force]");
  console.log("\nOptions:");
  console.log("  --force    Overwrite existing tournament");
  console.log("\nNote: All player IDs in rosterByTier must exist in the players collection.");
  console.log("Run seed-players.ts first to create player documents.");
  process.exit(1);
}

const inputFile = args[inputIndex + 1];

seedTournament(inputFile, force)
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
