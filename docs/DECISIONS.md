# Design Decisions

## ADR-001: Immutable State Transitions
**Decision:** All engine functions return new state objects instead of mutating input.
**Reason:** The AI's minimax search explores thousands of hypothetical states. Mutation would corrupt the search tree. Also simplifies debugging since any state can be inspected without side effects.

## ADR-002: IIFE Bundle Instead of Build Tool
**Decision:** Manually bundle engine modules into a single IIFE for the browser instead of using webpack/rollup.
**Reason:** No team member had bundler experience. The IIFE approach works without any build step, is easy to understand, and is sufficient for a prototype. Trade-off: changes to engine require manually updating the bundle.

## ADR-003: Server-Authoritative Online Play
**Decision:** The server validates every move and broadcasts authoritative state. Clients render what the server tells them.
**Reason:** Prevents cheating and desynchronisation. If clients computed their own game logic, a modified client could make illegal moves.

## ADR-004: Graph-Based Board Representation
**Decision:** Board is a 24-element array with a separate adjacency map, not a 2D grid.
**Reason:** Morabaraba's topology (three concentric squares with diagonals) doesn't map to a grid. The adjacency map also makes variant support easy: different variants load different maps.

## ADR-005: Error Objects Instead of Exceptions
**Decision:** Invalid moves return `{error: true, code, message}` instead of throwing.
**Reason:** In the browser, an uncaught exception in a click handler silently breaks the game. Error objects can be checked with `if (result.error)` and the game continues.

## ADR-006: Single Engine Source (Consolidation)
**Decision:** Server imports engine modules from `src/engine/` directly instead of maintaining a separate copy.
**Reason:** A previous separate copy diverged silently, causing incorrect rule validation in online matches. Sharing the source eliminates this risk.

## ADR-007: Capture Rule — Standard Morabaraba
**Decision:** Cows in a mill cannot be captured unless all opponent cows are in mills.
**Reason:** This is the standard rule. A temporary deviation (allowing all captures) was tested and reverted after review.

## ADR-008: Elo Calculated Server-Side
**Decision:** Rating updates happen on the server after game completion, not on the client.
**Reason:** Prevents rating manipulation by modified clients. Only the server knows the true game outcome.
