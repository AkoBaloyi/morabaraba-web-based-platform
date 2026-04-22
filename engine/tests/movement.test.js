// Tests for movement and flying phases

const { createGame, applyMove, getLegalMoves } = require('../src/index');
const { getAdjacent } = require('../../src/engine/moves');

// helper: creates a state where white is in movement phase
// puts 4 white cows and 4 black cows on the board, no cows left to place
function setupMovementState() {
  const game = createGame('12-cow');
  // manually set up the state - easier than playing 24 placements
  game.cowsToPlace.white = 0;
  game.cowsToPlace.black = 0;
  game.phase.white = 'movement';
  game.phase.black = 'movement';
  game.currentPlayer = 'white';

  // white cows at 0, 1, 3, 4
  game.nodes[0] = 'white';
  game.nodes[1] = 'white';
  game.nodes[3] = 'white';
  game.nodes[4] = 'white';

  // black cows at 21, 22, 23, 20
  game.nodes[21] = 'black';
  game.nodes[22] = 'black';
  game.nodes[23] = 'black';
  game.nodes[20] = 'black';

  return game;
}

test('can slide a cow to an adjacent empty node', () => {
  const game = setupMovementState();
  // node 0 is adjacent to 1, 3, 9 - node 9 is empty
  const result = applyMove(game, { type: 'slide', player: 'white', from: 0, to: 9 });

  expect(result.error).toBeUndefined();
  expect(result.nodes[0]).toBeNull();
  expect(result.nodes[9]).toBe('white');
});

test('cannot slide to a non-adjacent node in movement phase', () => {
  const game = setupMovementState();
  // node 0 is NOT adjacent to node 23
  const result = applyMove(game, { type: 'slide', player: 'white', from: 0, to: 23 });
  expect(result.error).toBe(true);
});

test('cannot slide to an occupied node', () => {
  const game = setupMovementState();
  // node 0 adjacent to node 1, but node 1 has white's own cow
  const result = applyMove(game, { type: 'slide', player: 'white', from: 0, to: 1 });
  expect(result.error).toBe(true);
});

test('cannot slide opponents cow', () => {
  const game = setupMovementState();
  const result = applyMove(game, { type: 'slide', player: 'white', from: 21, to: 9 });
  expect(result.error).toBe(true);
});

test('legal moves in movement phase are all slide type', () => {
  const game = setupMovementState();
  const moves = getLegalMoves(game);

  expect(moves.length).toBeGreaterThan(0);
  expect(moves.every(m => m.type === 'slide')).toBe(true);
});

test('slide moves are only to adjacent nodes', () => {
  const game = setupMovementState();
  const moves = getLegalMoves(game);

  for (const move of moves) {
    const neighbors = getAdjacent(move.from);
    expect(neighbors).toContain(move.to);
  }
});

// ---- Flying phase ----

// helper: state where white has exactly 3 cows (flying)
function setupFlyingState() {
  const game = createGame('12-cow');
  game.cowsToPlace.white = 0;
  game.cowsToPlace.black = 0;
  game.phase.white = 'flying';
  game.phase.black = 'movement';
  game.currentPlayer = 'white';

  // white has only 3 cows
  game.nodes[0] = 'white';
  game.nodes[1] = 'white';
  game.nodes[2] = 'white';

  // black has 4 cows
  game.nodes[21] = 'black';
  game.nodes[22] = 'black';
  game.nodes[23] = 'black';
  game.nodes[20] = 'black';

  return game;
}

test('flying player can move to any empty node', () => {
  const game = setupFlyingState();
  // node 0 to node 15 - not adjacent but should work in flying
  const result = applyMove(game, { type: 'slide', player: 'white', from: 0, to: 15 });

  expect(result.error).toBeUndefined();
  expect(result.nodes[0]).toBeNull();
  expect(result.nodes[15]).toBe('white');
});

test('flying player still cannot move to an occupied node', () => {
  const game = setupFlyingState();
  const result = applyMove(game, { type: 'slide', player: 'white', from: 0, to: 21 });
  expect(result.error).toBe(true);
});
