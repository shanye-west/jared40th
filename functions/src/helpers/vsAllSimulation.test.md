# vsAll Simulation Tests - Documentation

## Test Coverage Summary

This test suite validates the "vs All" simulation logic used in Round Recap, covering:

### 1. Course Handicap Calculation (5 tests)
- **GHIN Formula Validation**: `(handicapIndex × (slopeRating ÷ 113)) + (courseRating − par)`
- Tests zero, negative (plus handicapper), and high handicap indexes
- Validates course rating correctly adjusts the calculation

### 2. Strokes Received Calculation (4 tests)
- Assigns strokes to holes by difficulty (hcpIndex 1-18)
- Caps strokes at 18 (max 1 per hole)
- Handles zero and negative course handicaps

### 3. Strokes Spin-Down (3 tests)
- **Critical**: Validates that strokes are spun down to the lowest course handicap in each match
- Example: CH=13 vs CH=6 → adjusted to 7 vs 0
- Tests equal handicaps (both get 0) and plus handicappers

### 4. Match Winner Determination (10 tests)
Validates correct winner determination for each format:

#### Singles Format (3 tests)
- Uses **NET** scores with spun-down strokesReceived
- Handles ties
- Stops calculating when match is mathematically decided

#### Best Ball Format (1 test)
- Uses **NET** scores with individual player strokesReceived (spun down)
- Best net score per team wins each hole

#### Shamble Format (2 tests)
- Uses **GROSS** scores only (no handicap)
- Validates that handicap differences are ignored

#### Scramble Format (1 test)
- Uses **GROSS** scores only (no handicap)
- Team score vs team score

### 5. computeVsAllForRound Integration (3 tests)

#### Singles Format (1 test)
- Each player simulated vs all other players
- Validates W-L-T records for multiple players

#### Team Formats (2 tests)
- Groups players by partnerIds into teams
- Simulates team vs team (not individual vs individual)
- All team members share same W-L-T record
- Tests 2-team and 3-team scenarios

### 6. Edge Cases & Validation (3 tests)
- Handles missing hole scores gracefully
- Handles all scores missing (returns tie)
- Validates extreme slope ratings (90, 155)

## Key Formulas Tested

### Course Handicap
```
courseHandicap = ROUND((handicapIndex × (slopeRating ÷ 113)) + (courseRating − par))
```

### Strokes Spin-Down
```
lowestCH = MIN(courseHandicapA, courseHandicapB)
adjustedA = courseHandicapA - lowestCH
adjustedB = courseHandicapB - lowestCH
```

### Strokes Assignment
- Strokes assigned to holes in order of difficulty (hcpIndex 1 = hardest)
- Maximum 1 stroke per hole

## Test Data
- **Slope Rating**: 130
- **Course Rating**: 72.5
- **Par**: 72
- **18 holes** with realistic hcpIndex distribution (1-18)

## Running Tests
```bash
cd functions
npm run test:run src/helpers/vsAllSimulation.test.ts
```

## Test Results
✅ **25 tests passing** (all test suites pass)
