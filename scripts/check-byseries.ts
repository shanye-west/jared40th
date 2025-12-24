/**
 * Check if bySeries documents exist even though parent doesn't
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as serviceAccount from "../service-account.json";

initializeApp({
  credential: cert(serviceAccount as any),
});
const db = getFirestore();

async function checkBySeriesDocs() {
  console.log("🔍 Checking bySeries subcollection access...\n");

  // Try to get a known player's bySeries directly
  // First get a playerMatchFact to find a playerId
  const factSnap = await db.collection("playerMatchFacts").limit(1).get();
  
  if (factSnap.empty) {
    console.log("No playerMatchFacts found!");
    return;
  }

  const playerId = factSnap.docs[0].data().playerId;
  const series = factSnap.docs[0].data().tournamentSeries;
  
  console.log(`Sample player: ${playerId}`);
  console.log(`Series: ${series}\n`);

  // Try to read that player's stats directly
  const statsDoc = await db.collection("playerStats")
    .doc(playerId)
    .collection("bySeries")
    .doc(series)
    .get();

  if (statsDoc.exists) {
    console.log("✅ Stats doc exists!");
    const data = statsDoc.data();
    console.log(`  playerId: ${data?.playerId}`);
    console.log(`  series: ${data?.series}`);
    console.log(`  wins: ${data?.wins}, losses: ${data?.losses}, halves: ${data?.halves}`);
  } else {
    console.log("❌ Stats doc does NOT exist");
  }

  // Now try a collectionGroup query
  console.log("\n📊 Trying collectionGroup query...");
  try {
    const groupSnap = await db.collectionGroup("bySeries")
      .where("series", "==", series)
      .limit(5)
      .get();

    console.log(`Found ${groupSnap.size} docs via collectionGroup`);
    
    groupSnap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  ${data.playerId}: ${data.wins}-${data.losses}-${data.halves}`);
    });
  } catch (error: any) {
    console.error("CollectionGroup query failed:", error.message);
    if (error.details) console.error("Details:", error.details);
    if (error.stack) console.error("Stack:", error.stack);
  }
}

checkBySeriesDocs()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
