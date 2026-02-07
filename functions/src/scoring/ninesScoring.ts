/**
 * Nines scoring engine.
 *
 * Distributes 10 points per hole among 4 players based on net score.
 * Lowest net gets 4, next 3, next 2, highest 1.
 * Ties split points for tied positions.
 */

const POINT_VALUES = [4, 3, 2, 1];

/**
 * Compute nines points for a single hole.
 *
 * @param netScores - Array of 4 net scores. All must be non-null for points to be awarded.
 * @returns Array of 4 point values (may be fractional for ties), or [0,0,0,0] if incomplete.
 */
export function computeNinesPoints(
  netScores: (number | null)[]
): [number, number, number, number] {
  // All 4 scores must be present
  if (netScores.length !== 4 || netScores.some((s) => s === null || s === undefined)) {
    return [0, 0, 0, 0];
  }

  const scores = netScores as number[];

  // Create indices sorted by net score (ascending = best first)
  const indices = [0, 1, 2, 3];
  indices.sort((a, b) => scores[a] - scores[b]);

  const points: [number, number, number, number] = [0, 0, 0, 0];

  let position = 0;
  while (position < 4) {
    // Find all players tied at this position
    const tiedIndices = [indices[position]];
    let nextPos = position + 1;
    while (nextPos < 4 && scores[indices[nextPos]] === scores[indices[position]]) {
      tiedIndices.push(indices[nextPos]);
      nextPos++;
    }

    // Sum the point values for positions covered by this tie group
    let pointSum = 0;
    for (let j = 0; j < tiedIndices.length; j++) {
      pointSum += POINT_VALUES[position + j];
    }

    // Each tied player gets the average
    const splitPoints = pointSum / tiedIndices.length;
    for (const playerIndex of tiedIndices) {
      points[playerIndex] = splitPoints;
    }

    position = nextPos;
  }

  return points;
}

/**
 * Compute net scores for a hole given gross scores and strokes received.
 *
 * @param grossScores - Array of 4 gross scores (may contain nulls)
 * @param strokesReceived - Array of 4 stroke values (0 or 1) for this hole
 * @returns Array of 4 net scores (null if gross is null)
 */
export function computeNetScores(
  grossScores: (number | null)[],
  strokesReceived: number[]
): [number | null, number | null, number | null, number | null] {
  return [
    grossScores[0] !== null && grossScores[0] !== undefined
      ? grossScores[0] - (strokesReceived[0] || 0)
      : null,
    grossScores[1] !== null && grossScores[1] !== undefined
      ? grossScores[1] - (strokesReceived[1] || 0)
      : null,
    grossScores[2] !== null && grossScores[2] !== undefined
      ? grossScores[2] - (strokesReceived[2] || 0)
      : null,
    grossScores[3] !== null && grossScores[3] !== undefined
      ? grossScores[3] - (strokesReceived[3] || 0)
      : null,
  ];
}
