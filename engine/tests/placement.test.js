// Tests for the placement phase

const { createGame, applyMove, getLegalMoves } = require('../src/index');

test('white can place a cow on an empty node', () => {
  const game = createGame('12-cow');
  const result = applyMove(game, { type: 'placement', player: 'white', node: 0 });

  expect(result.error).toBeUndefined();
  expect(result.nodes[0]).toBe('white');
});

test('placing a cow decreases cowsToPlace', () => {
  const game = createGame('12-cow');
  const result = applyMove(game, { type: 'placement', player: 'white', node: 0 });

  expect(result.cowsToPlace.white).toBe(11);
});

test('turn switches to black after white places', () => {
  const game = createGame('12-cow');
  const result = applyMove(game, { type: 'placement', player: 'white', node: 0 });

  // only switches if no mill was formed
  if (result.capturePending === 0) {
    expect(result.currentPlayer).toBe('black');
  }
});

test('cannot place on an occupied node', () => {
  const game = createGame('12-cow');
  game.nodes[5] = 'black';

  const result = applyMove(game, { type: 'placement', player: 'white', node: 5 });
  expect(result.error).toBe(true);
});

test('cannot place when its not your turn', () => {
  const game = createGame('12-cow');
  // white goes first, so black cant place yet
  const result = applyMove(game, { type: 'placement', player: 'black', node: 0 });
  expect(result.error).toBe(true);
});

test('cannot place on a node outside 0-23', () => {
  const game = createGame('12-cow');
  const result = applyMove(game, { type: 'placement', player: 'white', node: 25 });
  expect(result.error).toBe(true);
});

test('cannot place with a negative node id', () => {
  const game = createGame('12-cow');
  const result = applyMove(game, { type: 'placement', player: 'white', node: -1 });
  expect(result.error).toBe(true);
});

test('placing does not change the original state (immutability)', () => {
  const game = createGame('12-cow');
  const nodesBefore = [...game.nodes];

  applyMove(game, { type: 'placement', player: 'white', node: 0 });

  // original should be untouched
  expect(game.nodes).toEqual(nodesBefore);
  expect(game.cowsToPlace.white).toBe(12);
});

test('forming a mill during placement triggers capture', () => {
  let game = createGame('12-cow');

  // white places 0, black places 9, white places 1, black places 10, white places 2
  game = applyMove(game, { type: 'placement', player: 'white', node: 0 });
  game = applyMove(game, { type: 'placement', player: 'black', node: 9 });
  game = applyMove(game, { type: 'placement', player: 'white', node: 1 });
  game = applyMove(game, { type: 'placement', player: 'black', node: 10 });
  game = applyMove(game, { type: 'placement', player: 'white', node: 2 }); // mill!

  expect(game.capturePending).toBe(1);
  // white should still be the current player (gets to capture)
  expect(game.currentPlayer).toBe('white');
});

test('all legal moves during placement are placement type', () => {
  const game = createGame('12-cow');
  const moves = getLegalMoves(game);

  expect(moves.length).toBeGreaterThan(0);
  expect(moves.every(m => m.type === 'placement')).toBe(true);
});

test('legal placements are only on empty nodes', () => {
  const game = createGame('12-cow');
  game.nodes[0] = 'white';
  game.nodes[5] = 'black';

  const moves = getLegalMoves(game);
  const placedNodes = moves.map(m => m.node);

  expect(placedNodes).not.toContain(0);
  expect(placedNodes).not.toContain(5);
});
