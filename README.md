# Morabaraba Web Platform

A browser-based Morabaraba (Twelve Men's Morris) game with local play, AI opponents, online multiplayer, and an Elo rating system.

## Quick Start

**Local play (no server needed):**
Open `front-end/HomePage/index.html` in your browser. Click "Local Play" to play Human vs Human, or "Play AI" to pick a difficulty.

**Online play (needs the server):**
```
cd back-end
npm install
cp .env.example .env
node server.js
```
Then open the homepage through VS Code Live Server (right-click `front-end/HomePage/index.html` → Open with Live Server). The server runs on port 3000.

**Running tests:**
```
cd engine
npm install
npx jest
```
All 63 tests should pass in under 3 seconds.

## Project Structure

```
src/engine/          Game rules engine (7 modules)
front-end/           Browser UI (HTML/CSS/Canvas)
  engine-bundle.js   Engine bundled for browser (IIFE)
  game-controller.js Bridge between canvas and engine
  HomePage/          Main menu and navigation
  HumanVSHuman/      Local two-player mode
  Easy AI/           AI opponent (random moves)
  Medium AI/         AI opponent (heuristic)
  Hard AI/           AI opponent (minimax)
  OnlinePlay/        Online multiplayer board
back-end/            Node.js server
  server.js          Express + Socket.IO server
  engine-server.js   Server-side engine copy
  controllers/       Auth and Elo logic
  database/          SQLite setup
engine/              Test runner (Jest)
  tests/             63 unit tests
docs/                Architecture diagrams and docs
```

## How It Works

The game engine (`src/engine/`) is a pure state machine that enforces all Morabaraba rules. It has no UI or networking code. The browser loads a bundled version (`engine-bundle.js`) and the server loads its own copy (`engine-server.js`).

For local play, the game controller translates canvas clicks into engine moves and redraws the board from engine state after every valid move.

For online play, the server validates every move using its engine copy and broadcasts the authoritative state to both players via Socket.IO.

## Game Modes

- **Human vs Human** — Two players on one device, taking turns
- **Easy AI** — Random legal moves
- **Medium AI** — Heuristic scoring (prefers mills, blocks opponent)
- **Hard AI** — Minimax with alpha-beta pruning, 1.8s time limit
- **Online** — Two players on different devices via room code

## Tech Stack

- Frontend: HTML, CSS, JavaScript (Canvas API)
- Backend: Node.js, Express, Socket.IO
- Database: SQLite
- Testing: Jest
- Auth: bcrypt + JWT

## Team

- Ako Baloyi (2573196) — Engine, AI, integration, testing
- Boitumelo Olifant (2878260) — Backend, online infrastructure
- Kopano Kgosimotswedi (2717070) — Frontend, UI, canvas rendering
