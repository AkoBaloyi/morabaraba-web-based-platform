# Contributions

## Team Members and Responsibilities

| Member | Student No | Primary Role | Key Deliverables |
|--------|-----------|--------------|------------------|
| Ako Baloyi | 2573196 | Engine & Integration | Game engine (7 modules), AI (3 levels), engine-bundle, game-controller, 63 unit tests, backend fixes, security hardening, Elo system, online play debugging |
| Boitumelo Olifant | 2878260 | Backend & Online | Node.js server, Socket.IO multiplayer, room management, authentication system, database schema, real-time state sync |
| Kopano Kgosimotswedi | 2717070 | Frontend & UI | Homepage, game board canvas, CSS styling, modal system, mobile-responsive layout, tutorial videos, game-over screen |

## Pull Requests

- PR #8: Engine integration, security fixes, Elo system, cleanup
- PR #10: Revert capture rule to standard (protect cows in mills)
- PR #11: Fix online play script conflict, game-over modal, remove dead routes

## Branch Strategy

- `main` — stable, merged via PRs
- `engine-core` — engine development and integration work
- `front-end` — UI development
- `back-end` — server and database work

## Code Style

- JavaScript (CommonJS for Node, IIFE bundle for browser)
- No build tools (intentional for prototype simplicity)
- Tests in Jest with Arrange-Act-Assert pattern
- Commits should be descriptive, not "fix stuff"

## How to Contribute

1. Pull latest from `main`
2. Create a feature branch
3. Make changes, run tests (`cd engine && npx jest`)
4. Push and create a PR
5. Get it reviewed before merging
