# Architecture

## Overview

The system has four layers. Each layer only talks to the one below it.

```
┌─────────────────────────────────────────────┐
│  Presentation Layer                         │
│  (HTML/CSS/Canvas, game-controller.js)      │
├─────────────────────────────────────────────┤
│  Application Layer                          │
│  (Match orchestration, AI, Elo)             │
├─────────────────────────────────────────────┤
│  Domain Layer (Game Engine)                 │
│  (state, moves, mills, apply, win, ai)      │
├─────────────────────────────────────────────┤
│  Networking Layer                           │
│  (Node.js, Express, Socket.IO)              │
└─────────────────────────────────────────────┘
```

## Domain Layer (Engine)

The engine is a pure state machine. It takes a game state and a move, validates the move, and returns a new state. It has no knowledge of the UI, the network, or the database.

Seven modules, each with one job:

- `constants.js` — Board topology (24 nodes, adjacency map, 20 mill lines), variant configs
- `state.js` — Creates game state, detects phases, counts cows
- `mills.js` — Detects mills, checks if a cow is protected, finds newly formed mills
- `moves.js` — Generates all legal moves for the current player
- `apply.js` — Applies a move to produce a new state (immutable)
- `win.js` — Checks if someone won (below 3 cows or no legal moves)
- `ai.js` — Three AI levels: random, heuristic, minimax

## Data Flow: Local Play

1. Player clicks canvas
2. `game-controller.js` resolves click to node ID (0-23)
3. Controller builds a move object: `{type, player, node/from/to/target}`
4. Controller calls `Engine.applyMove(state, move)`
5. Engine validates → returns new state or error
6. Controller replaces state, redraws board

## Data Flow: Online Play

1. Player clicks canvas
2. `online-board.js` resolves click to node ID
3. Client sends move to server via Socket.IO
4. Server validates move using `engine-server.js`
5. Server updates authoritative state
6. Server broadcasts `game-controller-state` to both players
7. Both clients rebuild their boards from the server's state

The server is the referee. Clients never compute game logic for online play.

## Board Representation

The board is a 24-element array. Each element is `null`, `'white'`, or `'black'`. Positions are numbered 0-23 matching this layout:

```
 0-----------1-----------2
 |\          |          /|
 | \  3------4------5  / |
 |  \ |      |      | /  |
 |   \|  6---7---8  |/   |
 9---10--11      12--13--14
 |   /|  15--16--17 |\   |
 |  / |      |      | \  |
 | /  18-----19----20  \ |
 |/          |          \|
 21---------22----------23
```

An adjacency map defines which nodes are connected. Mill definitions list all 20 valid three-in-a-row combinations.

## State Shape

```javascript
{
  nodes: [null x 24],        // board positions
  currentPlayer: 'white',    // whose turn
  phase: { white: 'placement', black: 'placement' },
  cowsToPlace: { white: 12, black: 12 },
  cowsCaptured: { white: 0, black: 0 },
  capturePending: 0,         // 0, 1, or 2
  mills: [],                 // active mills on board
  winner: null,
  winReason: null,
  variant: '12-cow'
}
```

## Authentication

- Registration: bcrypt-hashed passwords stored in SQLite
- Login: returns a JWT token (2h expiry)
- Socket connections: token sent in handshake, verified by middleware
- Guests can play locally but not in ranked online matches

## Elo Rating

- Standard formula, K=32
- Calculated server-side after online games end
- Only logged-in users get rated
- Floor at 100 to prevent negative ratings
