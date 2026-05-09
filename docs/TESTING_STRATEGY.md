# Testing Strategy

## Approach

Testing is focused on the game engine because rule correctness is the foundation everything else depends on. A bug in mill detection affects local play, AI play, and online play simultaneously. By testing the engine in isolation, we verify correctness before any integration.

## Test Framework

- **Framework:** Jest 30.2.0
- **Location:** `engine/tests/`
- **Run command:** `cd engine && npx jest`
- **Execution time:** Under 3 seconds for all 63 tests

## Test Coverage

| Module | Tests | What's Covered |
|--------|-------|----------------|
| state | 10 | Game creation, phase detection, cow counting, variant support |
| mills | 11 | Mill detection (all directions including diagonals), isInMill, new mill detection |
| placement | 11 | Valid placement, occupied node, wrong turn, out-of-range, immutability, mill trigger |
| capture | 8 | Capture after mill, own-cow rejection, empty node, no-pending, blocked placement |
| movement | 8 | Adjacent slide, non-adjacent rejection, occupied destination, flying |
| win | 4 | No winner at start, below-3-cows, no-legal-moves, placement doesn't trigger early |
| ai | 7 | All three levels return legal moves, null when game over, capture when pending |

## Test Design

Every test follows Arrange-Act-Assert:
1. Set up the game state (Arrange)
2. Perform one action (Act)
3. Check one specific result (Assert)

Categories:
- **Normal cases** — expected behaviour under valid input
- **Boundary cases** — values at the edge (exactly 3 cows, node 0, node 23)
- **Error cases** — invalid input that should be rejected
- **Special cases** — empty board, diagonal mills, state immutability

## What's Not Tested

- **Online play** — depends on network I/O and socket connections
- **Authentication** — depends on database state
- **AI strategic quality** — would need statistical analysis over many games
- **Frontend rendering** — canvas drawing is visual, not unit-testable

These gaps are covered by manual testing during development.

## How to Add Tests

1. Create or edit a file in `engine/tests/`
2. Import from `../src/index` (re-exports all engine modules)
3. Write tests using `test('description', () => { ... })`
4. Run `npx jest` to verify


## Integration and System Tests

In addition to the 95 automated unit tests, 15 manual test procedures were documented and executed covering integration (8 tests) and system-level (7 tests) scenarios. These are documented in `docs/INTEGRATION_AND_SYSTEM_TESTS.md`.

Integration tests verify component interactions (engine-to-frontend, engine-to-AI, server validation, socket sync, auth flow, Elo updates).

System tests verify complete end-to-end flows (full local game, full online game, resign, timer expiry, disconnect, password reset, draw detection).

## Test Summary

| Level | Automated | Manual | Total |
|-------|-----------|--------|-------|
| Unit | 95 | 0 | 95 |
| Integration | 0 | 8 | 8 |
| System | 0 | 7 | 7 |
| **Total** | **95** | **15** | **110** |
