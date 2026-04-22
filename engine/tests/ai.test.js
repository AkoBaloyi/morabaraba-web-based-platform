// Tests for AI move selection

const { createGame, applyMove, getLegalMoves } = require('../src/index');
const { selectMoveEasy, selectMoveMedium, selectMoveHard } = require('../../src/engine/ai');

test('easy AI returns a legal move', () => {
  const game = createGame('12-cow');
  const move = selectMoveEasy(game);

  expect(move).not.toBeNull();
  expect(move.type).toBe('placement');
  expect(move.player).toBe('white');
  // the move should actually be valid
  const result = applyMove(game, move);
  expect(result.error).toBeUndefined();
});

test('medium AI returns a legal move', () => {
  const game = createGame('12-cow');
  const move = selectMoveMedium(game);

  expect(move).not.toBeNull();
  const result = applyMove(game, move);
  expect(result.error).toBeUndefined();
});

test('hard AI returns a legal move', () => {
  const game = createGame('12-cow');
  const move = selectMoveHard(game);

  expect(move).not.toBeNull();
  const result = applyMove(game, move);
  expect(result.error).toBeUndefined();
});

test('easy AI returns null when there are no legal moves', () => {
  const game = createGame('12-cow');
  game.winner = 'white'; // game is over
  const move = selectMoveEasy(game);
  expect(move).toBeNull();
});

test('AI picks a capture move when capture is pending', () => {
  // set up a state where a mill was just formed
  let game = createGame('12-cow');
  game = applyMove(game, { type: 'placement', player: 'white', node: 0 });
  game = applyMove(game, { type: 'placement', player: 'black', node: 9 });
  game = applyMove(game, { type: 'placement', player: 'white', node: 1 });
  game = applyMove(game, { type: 'placement', player: 'black', node: 10 });
  game = applyMove(game, { type: 'placement', player: 'white', node: 2 }); // mill

  expect(game.capturePending).toBe(1);

  const move = selectMoveEasy(game);
  expect(move.type).toBe('capture');
});

test('AI can handle movement phase', () => {
  const game = createGame('12-cow');
  game.cowsToPlace.white = 0;
  game.cowsToPlace.black = 0;
  game.phase.white = 'movement';
  game.phase.black = 'movement';
  game.currentPlayer = 'white';

  game.nodes[0] = 'white';
  game.nodes[1] = 'white';
  game.nodes[3] = 'white';
  game.nodes[4] = 'white';
  game.nodes[21] = 'black';
  game.nodes[22] = 'black';
  game.nodes[23] = 'black';
  game.nodes[20] = 'black';

  const move = selectMoveEasy(game);
  expect(move).not.toBeNull();
  expect(move.type).toBe('slide');
});
