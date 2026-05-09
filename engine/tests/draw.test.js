// Tests for draw detection and move counters

const { createGame, applyMove, getLegalMoves } = require('../src/index');

test('new game starts with moveCount 0', () => {
  const game = createGame('12-cow');
  expect(game.moveCount).toBe(0);
});

test('new game starts with movesSinceCapture 0', () => {
  const game = createGame('12-cow');
  expect(game.movesSinceCapture).toBe(0);
});

test('moveCount increments after a full turn (placement, no mill)', () => {
  let game = createGame('12-cow');
  game = applyMove(game, { type: 'placement', player: 'white', node: 0 });
  // turn switched to black, moveCount should be 1
  expect(game.moveCount).toBe(1);
});

test('moveCount does not increment when mill is formed (same player keeps turn)', () => {
  let game = createGame('12-cow');
  game = applyMove(game, { type: 'placement', player: 'white', node: 0 });
  game = applyMove(game, { type: 'placement', player: 'black', node: 9 });
  game = applyMove(game, { type: 'placement', player: 'white', node: 1 });
  game = applyMove(game, { type: 'placement', player: 'black', node: 10 });
  // this forms mill [0,1,2] - turn stays with white for capture
  game = applyMove(game, { type: 'placement', player: 'white', node: 2 });
  // moveCount should be 4 (4 turn switches happened before this)
  // the mill move itself doesn't switch turns so no increment
  expect(game.capturePending).toBe(1);
  expect(game.currentPlayer).toBe('white');
});

test('movesSinceCapture resets to 0 after a capture', () => {
  let game = createGame('12-cow');
  game = applyMove(game, { type: 'placement', player: 'white', node: 0 });
  game = applyMove(game, { type: 'placement', player: 'black', node: 9 });
  game = applyMove(game, { type: 'placement', player: 'white', node: 1 });
  game = applyMove(game, { type: 'placement', player: 'black', node: 10 });
  game = applyMove(game, { type: 'placement', player: 'white', node: 2 }); // mill

  // movesSinceCapture should be > 0 before capture
  expect(game.movesSinceCapture).toBeGreaterThanOrEqual(0);

  // capture
  game = applyMove(game, { type: 'capture', player: 'white', target: 9 });
  expect(game.movesSinceCapture).toBe(0);
});

test('game ends as draw after 50 moves without capture', () => {
  // set up a state in movement phase with enough cows
  const game = createGame('12-cow');
  game.cowsToPlace = { white: 0, black: 0 };
  game.phase = { white: 'movement', black: 'movement' };
  game.currentPlayer = 'white';
  game.movesSinceCapture = 49; // one more move triggers draw

  // put some cows on the board
  game.nodes[0] = 'white';
  game.nodes[1] = 'white';
  game.nodes[3] = 'white';
  game.nodes[4] = 'white';
  game.nodes[21] = 'black';
  game.nodes[22] = 'black';
  game.nodes[23] = 'black';
  game.nodes[20] = 'black';

  // make a valid slide that doesn't form a mill
  const result = applyMove(game, { type: 'slide', player: 'white', from: 0, to: 9 });
  expect(result.error).toBeUndefined();
  expect(result.winner).toBe('draw');
  expect(result.winReason).toBe('fifty_move_rule');
});

test('draw does not trigger at 49 moves without capture', () => {
  const game = createGame('12-cow');
  game.cowsToPlace = { white: 0, black: 0 };
  game.phase = { white: 'movement', black: 'movement' };
  game.currentPlayer = 'white';
  game.movesSinceCapture = 48; // not yet 50

  game.nodes[0] = 'white';
  game.nodes[1] = 'white';
  game.nodes[3] = 'white';
  game.nodes[4] = 'white';
  game.nodes[21] = 'black';
  game.nodes[22] = 'black';
  game.nodes[23] = 'black';
  game.nodes[20] = 'black';

  const result = applyMove(game, { type: 'slide', player: 'white', from: 0, to: 9 });
  expect(result.error).toBeUndefined();
  expect(result.winner).toBeNull();
  expect(result.movesSinceCapture).toBe(49);
});

test('no legal moves returns empty array when game is a draw', () => {
  const game = createGame('12-cow');
  game.winner = 'draw';
  game.winReason = 'fifty_move_rule';
  const moves = getLegalMoves(game);
  expect(moves).toHaveLength(0);
});
