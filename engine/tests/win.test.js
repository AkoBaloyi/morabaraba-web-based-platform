// Tests for win conditions

const { createGame, applyMove } = require('../src/index');
const { checkWinCondition } = require('../../src/engine/win');

test('no winner at the start of the game', () => {
  const game = createGame('12-cow');
  const result = checkWinCondition(game);
  expect(result).toBeNull();
});

test('player wins when opponent drops below 3 cows', () => {
  // set up a state where black only has 2 cows and placement is done
  const game = createGame('12-cow');
  game.cowsToPlace.white = 0;
  game.cowsToPlace.black = 0;
  game.phase.white = 'movement';
  game.phase.black = 'flying';
  game.currentPlayer = 'black';

  // black has only 2 cows - should lose
  game.nodes[0] = 'black';
  game.nodes[1] = 'black';

  // white has 5 cows
  game.nodes[10] = 'white';
  game.nodes[11] = 'white';
  game.nodes[12] = 'white';
  game.nodes[13] = 'white';
  game.nodes[14] = 'white';

  const result = checkWinCondition(game);
  expect(result).not.toBeNull();
  expect(result.winner).toBe('white');
  expect(result.reason).toBe('opponent_below_three');
});

test('player wins when opponent has no legal moves', () => {
  // set up a state where black is completely blocked
  const game = createGame('12-cow');
  game.cowsToPlace.white = 0;
  game.cowsToPlace.black = 0;
  game.phase.white = 'movement';
  game.phase.black = 'movement';
  game.currentPlayer = 'black';

  // black cow at node 7, surrounded by white on all adjacent nodes (4, 6, 8)
  game.nodes[7] = 'black';
  game.nodes[4] = 'white';
  game.nodes[6] = 'white';
  game.nodes[8] = 'white';

  // give black more cows so its not below 3 (need 4 total to be in movement)
  game.nodes[16] = 'black';
  game.nodes[15] = 'white'; // block 16's neighbor
  game.nodes[17] = 'white'; // block 16's other neighbor
  game.nodes[19] = 'white'; // block 16's third neighbor

  game.nodes[11] = 'black';
  game.nodes[10] = 'white'; // block 11

  game.nodes[22] = 'black';
  game.nodes[21] = 'white';
  game.nodes[23] = 'white';

  // all of black's cows should be blocked
  const result = checkWinCondition(game);
  expect(result).not.toBeNull();
  expect(result.winner).toBe('white');
  expect(result.reason).toBe('opponent_no_moves');
});

test('below 3 cows does not trigger win during placement', () => {
  // during placement, having few cows on board is normal
  const game = createGame('12-cow');
  game.nodes[0] = 'white';
  // white has 1 cow on board but still has 11 to place - not a loss
  const result = checkWinCondition(game);
  expect(result).toBeNull();
});
