/**
 * Diagnostic script to check match status and stats
 * Run with: npx ts-node scripts/check-match-status.ts
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as serviceAccount from "../service-account.json";

// Initialize Firebase Admin with service account
initializeApp({
  credential: cert(serviceAccount as any),
});
const db = getFirestore();

async function checkMatchStatus() {
  console.log("🔍 Checking match status and stats...\n");

  // 1. Check all matches
  const matchesSnap = await db.collection("matches").get();
  console.log(`Total matches: ${matchesSnap.size}`);

  let closedCount = 0;
  let openCount = 0;
  const closedMatches: any[] = [];

  matchesSnap.docs.forEach(doc => {
    const data = doc.data();
    const isClosed = data.status?.closed === true;
    if (isClosed) {
      closedCount++;
      closedMatches.push({
        id: doc.id,
        tournamentId: data.tournamentId,
        thru: data.status?.thru,
        leader: data.status?.leader,
        margin: data.status?.margin,
      });
    } else {
      openCount++;
    }
  });

  console.log(`Closed matches: ${closedCount}`);
  console.log(`Open matches: ${openCount}\n`);

  if (closedMatches.length > 0) {
    console.log("Sample closed matches:");
    closedMatches.slice(0, 3).forEach(m => {
      console.log(`  - ${m.id}: thru=${m.thru}, leader=${m.leader}, margin=${m.margin}`);
    });
    console.log();
  }

  // 2. Check playerMatchFacts
  const factsSnap = await db.collection("playerMatchFacts").get();
  console.log(`Total playerMatchFacts: ${factsSnap.size}`);

  const factsByTournament: Record<string, number> = {};
  factsSnap.docs.forEach(doc => {
    const tournamentId = doc.data().tournamentId;
    if (tournamentId) {
      factsByTournament[tournamentId] = (factsByTournament[tournamentId] || 0) + 1;
    }
  });

  if (Object.keys(factsByTournament).length > 0) {
    console.log("\nFacts by tournament:");
    Object.entries(factsByTournament).forEach(([tid, count]) => {
      console.log(`  ${tid}: ${count} facts`);
    });
  }
  console.log();

  // 3. Check playerStats
  const statsSnap = await db.collectionGroup("bySeries").get();
  console.log(`Total playerStats (bySeries): ${statsSnap.size}`);

  const statsBySeries: Record<string, number> = {};
  statsSnap.docs.forEach(doc => {
    const series = doc.data().series;
    if (series) {
      statsBySeries[series] = (statsBySeries[series] || 0) + 1;
    }
  });

  if (Object.keys(statsBySeries).length > 0) {
    console.log("\nStats by series:");
    Object.entries(statsBySeries).forEach(([series, count]) => {
      console.log(`  ${series}: ${count} player stats`);
      
      // Show sample stats for this series
      const sampleStats = statsSnap.docs.filter(d => d.data().series === series).slice(0, 2);
      sampleStats.forEach(s => {
        const data = s.data();
        console.log(`    - Player ${data.playerId}: ${data.wins}-${data.losses}-${data.halves}`);
      });
    });
  }
  console.log();

  // 4. Check if any matches were recently touched
  const recentMatches = matchesSnap.docs.filter(doc => {
    const data = doc.data();
    return data._recalculatedAt != null;
  });

  console.log(`Matches with _recalculatedAt: ${recentMatches.length}`);
  if (recentMatches.length > 0) {
    const sample = recentMatches[0].data();
    console.log(`Sample timestamp: ${sample._recalculatedAt?.toDate?.()}`);
  }
  console.log();

  // 5. Summary
  console.log("=".repeat(50));
  console.log("SUMMARY:");
  console.log(`✓ Closed matches: ${closedCount}`);
  console.log(`✓ Facts generated: ${factsSnap.size}`);
  console.log(`✓ Player stats: ${statsSnap.size}`);
  
  if (closedCount > 0 && factsSnap.size === 0) {
    console.log("\n⚠️  WARNING: Closed matches exist but no facts generated!");
    console.log("   This suggests updateMatchFacts is not triggering.");
  } else if (factsSnap.size > 0 && statsSnap.size === 0) {
    console.log("\n⚠️  WARNING: Facts exist but no stats generated!");
    console.log("   This suggests aggregatePlayerStats is not triggering.");
  } else if (closedCount > 0 && factsSnap.size > 0 && statsSnap.size > 0) {
    console.log("\n✅ Everything looks good! Stats should be visible.");
  }
}

checkMatchStatus()
  .then(() => {
    console.log("\n✓ Check complete");
    process.exit(0);
  })
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
