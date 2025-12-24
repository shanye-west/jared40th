/**
 * Check active tournament details
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as serviceAccount from "../service-account.json";

initializeApp({
  credential: cert(serviceAccount as any),
});
const db = getFirestore();

async function checkActiveTournament() {
  console.log("🔍 Checking active tournament...\n");

  const tournamentsSnap = await db.collection("tournaments")
    .where("active", "==", true)
    .get();

  if (tournamentsSnap.empty) {
    console.log("❌ No active tournament found!");
    return;
  }

  const tournament = tournamentsSnap.docs[0];
  const data = tournament.data();

  console.log(`Active Tournament: ${tournament.id}`);
  console.log(`Name: ${data.name}`);
  console.log(`Year: ${data.year}`);
  console.log(`Series: ${data.series}`);
  console.log(`Team A: ${data.teamA?.name}`);
  console.log(`Team B: ${data.teamB?.name}`);
  console.log();

  // Check if playerStats exist for this series
  const statsSnap = await db.collectionGroup("bySeries")
    .where("series", "==", data.series)
    .get();

  console.log(`Player stats for series "${data.series}": ${statsSnap.size}`);
  
  if (statsSnap.size > 0) {
    console.log("\nSample stats:");
    statsSnap.docs.slice(0, 5).forEach(doc => {
      const s = doc.data();
      console.log(`  ${s.playerId}: ${s.wins}-${s.losses}-${s.halves}`);
    });
  }

  // Get roster player IDs
  const teamARoster = Object.values(data.teamA?.rosterByTier || {}).flat() as string[];
  const teamBRoster = Object.values(data.teamB?.rosterByTier || {}).flat() as string[];
  const allRosterIds = [...teamARoster, ...teamBRoster];

  console.log(`\nRostered players: ${allRosterIds.length}`);

  // Check which rostered players have stats
  const playersWithStats = statsSnap.docs.map(d => d.data().playerId);
  const rosteredWithStats = allRosterIds.filter(id => playersWithStats.includes(id));

  console.log(`Rostered players WITH stats: ${rosteredWithStats.length}`);
  console.log(`Rostered players WITHOUT stats: ${allRosterIds.length - rosteredWithStats.length}`);

  if (rosteredWithStats.length !== allRosterIds.length) {
    console.log("\n⚠️  Some rostered players don't have stats!");
    const missing = allRosterIds.filter(id => !playersWithStats.includes(id));
    console.log("Missing stats for:", missing.slice(0, 5));
  }
}

checkActiveTournament()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
