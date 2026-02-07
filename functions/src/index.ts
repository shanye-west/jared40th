/**
 * Firebase Cloud Functions for Nines Tournament PWA
 *
 * Structure:
 * - scoring/ninesScoring.ts - Nines point calculations
 * - types.ts - Shared TypeScript types
 * - ghin.ts - Handicap calculations
 * - constants.ts - Shared constants
 */

import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { computeNinesPoints, computeNetScores } from "./scoring/ninesScoring.js";
import type { HoleScores } from "./types.js";

initializeApp();
const db = getFirestore();

// ============================================================================
// SEED TRIGGERS
// ============================================================================

/**
 * Initialize a new group document with empty holes structure.
 * Fires when a group document is created.
 */
export const seedGroupBoilerplate = onDocumentCreated("groups/{groupId}", async (event) => {
  const ref = event.data?.ref;
  const data = event.data?.data();
  if (!ref || !data) return;

  // Only seed if holes are not already present
  if (data.holes && Object.keys(data.holes).length === 18) return;

  const holes: Record<string, HoleScores> = {};
  for (let i = 1; i <= 18; i++) {
    holes[String(i)] = {
      gross: [null, null, null, null],
    };
  }

  const computed = {
    playerPoints: [0, 0, 0, 0],
    holesCompleted: 0,
    completed: false,
  };

  await ref.set({
    holes,
    computed,
    _seededAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  // Link group to round
  const roundId = data.roundId;
  if (roundId) {
    const roundRef = db.collection("rounds").doc(roundId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(roundRef);
      if (!snap.exists) return;
      const existing = snap.data()?.groupIds || [];
      if (!existing.includes(ref.id)) {
        tx.update(roundRef, { groupIds: [...existing, ref.id] });
      }
    });
  }
});

/**
 * Initialize default fields on a new course document.
 */
export const seedCourseDefaults = onDocumentCreated("courses/{courseId}", async (event) => {
  const ref = event.data?.ref;
  const data = event.data?.data();
  if (!ref || !data) return;

  if (!data.holes || data.holes.length === 0) {
    const holes = [];
    for (let i = 1; i <= 18; i++) {
      holes.push({ number: i, par: 4, hcpIndex: i });
    }
    await ref.set({ holes }, { merge: true });
  }
});

// ============================================================================
// SCORING ENGINE
// ============================================================================

/**
 * Compute nines points whenever a group document is written.
 * Calculates net scores and nines points for each hole, then updates
 * the tournament scoreboard with aggregated team totals.
 */
export const computeGroupOnWrite = onDocumentWritten("groups/{groupId}", async (event) => {
  const after = event.data?.after?.data();
  if (!after) return; // Document deleted

  const holes = after.holes || {};
  const players = after.players;
  if (!players || players.length !== 4) return;

  // Loop prevention: check if holes data actually changed
  const grossSig = buildGrossSig(holes);
  if (after._computeSig === grossSig) return;

  // Compute net scores and nines points for each hole
  let holesCompleted = 0;
  const playerPointTotals: [number, number, number, number] = [0, 0, 0, 0];
  const updatedHoles: Record<string, HoleScores> = {};

  for (let h = 1; h <= 18; h++) {
    const key = String(h);
    const holeData = holes[key];
    if (!holeData) {
      updatedHoles[key] = { gross: [null, null, null, null] };
      continue;
    }

    const gross = holeData.gross || [null, null, null, null];

    // Get strokes received for this hole from each player
    const strokesForHole = players.map((p: any) => {
      const sr = p.strokesReceived;
      return sr && sr.length > h - 1 ? sr[h - 1] : 0;
    });

    // Compute net scores
    const net = computeNetScores(gross, strokesForHole);

    // Compute nines points (only if all 4 scores present)
    const allScored = gross.every((g: number | null) => g !== null && g !== undefined);
    let points: [number, number, number, number] = [0, 0, 0, 0];

    if (allScored) {
      holesCompleted++;
      points = computeNinesPoints(net);
      for (let p = 0; p < 4; p++) {
        playerPointTotals[p] += points[p];
      }
    }

    updatedHoles[key] = {
      gross,
      net,
      points,
    };
  }

  const computed = {
    playerPoints: playerPointTotals,
    holesCompleted,
    completed: holesCompleted === 18,
    lastUpdated: FieldValue.serverTimestamp(),
  };

  // Write computed data back to group doc
  await event.data!.after!.ref.set({
    holes: updatedHoles,
    computed,
    _computeSig: grossSig,
  }, { merge: true });

  // Update tournament scoreboard
  const tournamentId = after.tournamentId;
  if (tournamentId) {
    await updateScoreboard(tournamentId);
  }
});

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build a signature string from the gross scores to detect changes.
 * Only includes gross values so computed field writes don't re-trigger.
 */
function buildGrossSig(holes: Record<string, any>): string {
  const parts: string[] = [];
  for (let h = 1; h <= 18; h++) {
    const hd = holes[String(h)];
    if (hd?.gross) {
      parts.push(hd.gross.join(","));
    } else {
      parts.push(",,,,");
    }
  }
  return parts.join("|");
}

/**
 * Aggregate all groups' team points into the tournament scoreboard.
 * Reads all groups for the tournament and sums team points.
 */
async function updateScoreboard(tournamentId: string): Promise<void> {
  const groupsSnap = await db.collection("groups")
    .where("tournamentId", "==", tournamentId)
    .get();

  const teamTotals: [number, number, number, number] = [0, 0, 0, 0];
  let totalCompleted = 0;
  const totalHoles = groupsSnap.size * 18;

  for (const doc of groupsSnap.docs) {
    const data = doc.data();
    const players = data.players || [];
    const playerPts = data.computed?.playerPoints || [0, 0, 0, 0];

    // Map player points to team totals via teamIndex
    for (let i = 0; i < players.length; i++) {
      const teamIdx = players[i]?.teamIndex;
      if (teamIdx !== undefined && teamIdx >= 0 && teamIdx < 4) {
        teamTotals[teamIdx] += playerPts[i] || 0;
      }
    }

    totalCompleted += data.computed?.holesCompleted || 0;
  }

  await db.collection("tournaments").doc(tournamentId).set({
    scoreboard: {
      teamTotals,
      holesCompleted: totalCompleted,
      totalHoles,
      lastUpdated: FieldValue.serverTimestamp(),
    },
  }, { merge: true });
}
