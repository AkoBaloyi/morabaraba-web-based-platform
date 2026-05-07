// Tests for edge cases and tricky scenarios

const { createGame, applyMove, getLegalMoves, getLegalCaptures } = require('../src/index');
const { isInMill } = require('../../src/engine/mills');

test('double mill (two mills in one move) requires two captures', () => {
  // set up a state where one placement completes two mills at once
  const game = createGame('12-cow');
  // node 0 is in mills [0,1,2] and [0,3,6] and [0,9,21]
  // if we have white at 1,2 and 3,6 then placing at 0 forms two mills
  game.nodes[1] = 'white';
  game.nodes[2] = 'white';
  game.nodes[3] = 'white';
  game.nodes[6] = 'white';
  game.cowsToPlace.white = 8; // still placing
  game.nodes[9] = 'black';
  game.nodes[10] = 'black';
  game.nodes[11] = 'black';

  const result = applyMove(game, { type: 'placement', player: 'white', node: 0 });
  // should have 2 captures pending (two mills formed)
  expect(result.capturePending).toBe(2);
  expect(result.currentPlayer).toBe('white'); // still white's turn
});

test('cannot capture a cow in a mill when others are available', () => {
  const game = createGame('12-cow');
  // black has a mill at 21,22,23
  game.nodes[21] = 'black';
  game.nodes[22] = 'black';
  game.nodes[23] = 'black';
  // black also has a cow at 9 (not in a mill)
  game.nodes[9] = 'black';
  // white formed a mill, capture pending
  game.nodes[0] = 'white';
  game.nodes[1] = 'white';
  game.nodes[2] = 'white';
  game.capturePending = 1;
  game.currentPlayer = 'white';

  // should not be able to capture node 21 (in a mill)
  const result = applyMove(game, { type: 'capture', player: 'white', target: 21 });
  expect(result.error).toBe(true);

  // should be able to capture node 9 (not in a mill)
  const result2 = applyMove(game, { type: 'capture', player: 'white', target: 9 });
  expect(result2.error).toBeUndefined();
});

test('can capture a cow in a mill when ALL opponent cows are in mills', () => {
  const game = createGame('12-cow');
  // black only has cows in mills
  game.nodes[21] = 'black';
  game.nodes[22] = 'black';
  game.nodes[23] = 'black';
  // no other black cows
  game.nodes[0] = 'white';
  game.nodes[1] = 'white';
  game.nodes[2] = 'white';
  game.capturePending = 1;
  game.currentPlayer = 'white';
  game.cowsToPlace = { white: 9, black: 9 };

  // all black cows are in a mill, so we can capture any of them
  const targets = getLegalCaptures(game);
  expect(targets).toContain(21);
  expect(targets).toContain(22);
  expect(targets).toContain(23);
});

test('flying phase allows movement to any empty node', () => {
  const game = createGame('12-cow');
  game.cowsToPlace = { white: 0, black: 0 };
  game.phase = { white: 'flying', black: 'movement' };
  game.currentPlayer = 'white';
  game.nodes[0] = 'white';
  game.nodes[1] = 'white';
  game.nodes[2] = 'white';
  game.nodes[21] = 'black';
  game.nodes[22] = 'black';
  game.nodes[23] = 'black';
  game.nodes[20] = 'black';

  // node 0 to node 15 (not adjacent) should work in flying
  const result = applyMove(game, { type: 'slide', player: 'white', from: 0, to: 15 });
  expect(result.error).toBeUndefined();
  expect(result.nodes[0]).toBeNull();
  expect(result.nodes[15]).toBe('white');
});

test('game ends when opponent has fewer than 3 cows after placement', () => {
  const game = createGame('12-cow');
  game.cowsToPlace = { white: 0, black: 0 };
  game.phase = { white: 'movement', black: 'flying' };
  game.currentPlayer = 'white';
  game.capturePending = 1;
  // black has exactly 3 cows
  game.nodes[21] = 'black';
  game.nodes[22] = 'black';
  game.nodes[23] = 'black';
  // white has plenty
  game.nodes[0] = 'white';
  game.nodes[1] = 'white';
  game.nodes[2] = 'white';
  game.nodes[3] = 'white';

  // capture one of black's cows - should end the game
  const result = applyMove(game, { type: 'capture', player: 'white', target: 21 });
  expect(result.winner).toBe('white');
  expect(result.winReason).toBe('opponent_below_three');
});

test('applyMove rejects moves after game is over', () => {
  const game = createGame('12-cow');
  game.winner = 'white';
  game.winReason = 'opponent_below_three';

  const result = applyMove(game, { type: 'placement', player: 'white', node: 5 });
  expect(result.error).toBe(true);
});

test('applyMove rejects moves with wrong player', () => {
  const game = createGame('12-cow');
  // white goes first
  const result = applyMove(game, { type: 'placement', player: 'black', node: 5 });
  expect(result.error).toBe(true);
  expect(result.code).toBe('NOT_YOUR_TURN');
});

test('state is immutable - original not modified after applyMove', () => {
  const game = createGame('12-cow');
  const originalNodes = [...game.nodes];
  const originalCows = game.cowsToPlace.white;

  applyMove(game, { type: 'placement', player: 'white', node: 7 });

  expect(game.nodes).toEqual(originalNodes);
  expect(game.cowsToPlace.white).toBe(originalCows);
});
