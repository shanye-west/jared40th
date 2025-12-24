/**
 * Check playerStats structure
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as serviceAccount from "../service-account.json";

initializeApp({
  credential: cert(serviceAccount as any),
});
const db = getFirestore();

async function checkStatsStructure() {
  console.log("🔍 Checking playerStats structure...\n");

  // Get a few playerStats documents
  const playersSnap = await db.collection("playerStats").limit(5).get();

  console.log(`Total playerStats parent docs: ${playersSnap.size}\n`);

  for (const playerDoc of playersSnap.docs) {
    console.log(`Player: ${playerDoc.id}`);
    
    // Check the bySeries subcollection
    const bySeriesSnap = await db.collection("playerStats")
      .doc(playerDoc.id)
      .collection("bySeries")
      .get();

    console.log(`  bySeries docs: ${bySeriesSnap.size}`);

    bySeriesSnap.docs.forEach(seriesDoc => {
      const data = seriesDoc.data();
      console.log(`    Series: ${seriesDoc.id}`);
      console.log(`      playerId: ${data.playerId}`);
      console.log(`      series: ${data.series}`);
      console.log(`      wins: ${data.wins}, losses: ${data.losses}, halves: ${data.halves}`);
      console.log(`      matchesPlayed: ${data.matchesPlayed}`);
    });
    console.log();
  }
}

checkStatsStructure()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
