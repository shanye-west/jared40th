/**
 * Client-side nines scoring computation.
 * Mirrors the backend scoring engine for instant display before Cloud Function runs.
 */

const POINT_VALUES = [4, 3, 2, 1];

/**
 * Compute nines points for a single hole.
 * Returns [0,0,0,0] if not all 4 scores are present.
 */
export function computeNinesPoints(
  netScores: (number | null)[]
): [number, number, number, number] {
  if (netScores.length !== 4 || netScores.some((s) => s === null || s === undefined)) {
    return [0, 0, 0, 0];
  }

  const scores = netScores as number[];
  const indices = [0, 1, 2, 3];
  indices.sort((a, b) => scores[a] - scores[b]);

  const points: [number, number, number, number] = [0, 0, 0, 0];

  let position = 0;
  while (position < 4) {
    const tiedIndices = [indices[position]];
    let nextPos = position + 1;
    while (nextPos < 4 && scores[indices[nextPos]] === scores[indices[position]]) {
      tiedIndices.push(indices[nextPos]);
      nextPos++;
    }

    let pointSum = 0;
    for (let j = 0; j < tiedIndices.length; j++) {
      pointSum += POINT_VALUES[position + j];
    }

    const splitPoints = pointSum / tiedIndices.length;
    for (const playerIndex of tiedIndices) {
      points[playerIndex] = splitPoints;
    }

    position = nextPos;
  }

  return points;
}

/**
 * Compute net scores for a hole given gross scores and per-hole strokes.
 */
export function computeNetScores(
  grossScores: (number | null)[],
  strokesForHole: number[]
): [number | null, number | null, number | null, number | null] {
  return [
    grossScores[0] != null ? grossScores[0] - (strokesForHole[0] || 0) : null,
    grossScores[1] != null ? grossScores[1] - (strokesForHole[1] || 0) : null,
    grossScores[2] != null ? grossScores[2] - (strokesForHole[2] || 0) : null,
    grossScores[3] != null ? grossScores[3] - (strokesForHole[3] || 0) : null,
  ];
}

/**
 * Compute all nines data for a group (client-side, for instant display).
 * Returns per-hole net scores and points, plus running player totals.
 */
export function computeGroupScoring(
  holes: Record<string, { gross: (number | null)[] }>,
  players: { strokesReceived: number[] }[]
): {
  holeNet: Record<string, [number | null, number | null, number | null, number | null]>;
  holePoints: Record<string, [number, number, number, number]>;
  playerTotals: [number, number, number, number];
  holesCompleted: number;
} {
  const holeNet: Record<string, [number | null, number | null, number | null, number | null]> = {};
  const holePoints: Record<string, [number, number, number, number]> = {};
  const playerTotals: [number, number, number, number] = [0, 0, 0, 0];
  let holesCompleted = 0;

  for (let h = 1; h <= 18; h++) {
    const key = String(h);
    const holeData = holes[key];
    if (!holeData) {
      holeNet[key] = [null, null, null, null];
      holePoints[key] = [0, 0, 0, 0];
      continue;
    }

    const gross = holeData.gross || [null, null, null, null];
    const strokesForHole = players.map((p) => {
      const sr = p.strokesReceived;
      return sr && sr.length > h - 1 ? sr[h - 1] : 0;
    });

    const net = computeNetScores(gross, strokesForHole);
    holeNet[key] = net;

    const allScored = gross.every((g) => g != null);
    if (allScored) {
      holesCompleted++;
      const points = computeNinesPoints(net);
      holePoints[key] = points;
      for (let p = 0; p < 4; p++) {
        playerTotals[p] += points[p];
      }
    } else {
      holePoints[key] = [0, 0, 0, 0];
    }
  }

  return { holeNet, holePoints, playerTotals, holesCompleted };
}
