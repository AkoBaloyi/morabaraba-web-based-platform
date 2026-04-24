// Tests for game state creation and helpers

const { createGame, countCowsOnBoard, getPhase, getOpponent } = require('../src/index');

// ---- createGame ----

test('new game starts with 24 empty nodes', () => {
  const game = createGame('12-cow');
  expect(game.nodes).toHaveLength(24);
  expect(game.nodes.every(n => n === null)).toBe(true);
});

test('new game starts with white to move', () => {
  const game = createGame('12-cow');
  expect(game.currentPlayer).toBe('white');
});

test('12-cow variant gives each player 12 cows', () => {
  const game = createGame('12-cow');
  expect(game.cowsToPlace.white).toBe(12);
  expect(game.cowsToPlace.black).toBe(12);
});

test('9-cow variant gives each player 9 cows', () => {
  const game = createGame('9-cow');
  expect(game.cowsToPlace.white).toBe(9);
  expect(game.cowsToPlace.black).toBe(9);
});

test('new game has no winner', () => {
  const game = createGame('12-cow');
  expect(game.winner).toBeNull();
});

test('new game has no captures pending', () => {
  const game = createGame('12-cow');
  expect(game.capturePending).toBe(0);
});

test('both players start in placement phase', () => {
  const game = createGame('12-cow');
  expect(game.phase.white).toBe('placement');
  expect(game.phase.black).toBe('placement');
});

test('invalid variant throws an error', () => {
  expect(() => createGame('99-cow')).toThrow();
});

// ---- countCowsOnBoard ----

test('empty board has 0 cows for both players', () => {
  const game = createGame('12-cow');
  expect(countCowsOnBoard(game, 'white')).toBe(0);
  expect(countCowsOnBoard(game, 'black')).toBe(0);
});

test('counts cows correctly after placing some', () => {
  const game = createGame('12-cow');
  game.nodes[0] = 'white';
  game.nodes[5] = 'white';
  game.nodes[10] = 'black';
  expect(countCowsOnBoard(game, 'white')).toBe(2);
  expect(countCowsOnBoard(game, 'black')).toBe(1);
});

// ---- getPhase ----

test('player with cows to place is in placement phase', () => {
  const game = createGame('12-cow');
  expect(getPhase(game, 'white')).toBe('placement');
});

test('player with 0 cows to place and >3 on board is in movement', () => {
  const game = createGame('12-cow');
  game.cowsToPlace.white = 0;
  // put 5 white cows on the board
  game.nodes[0] = 'white';
  game.nodes[1] = 'white';
  game.nodes[2] = 'white';
  game.nodes[3] = 'white';
  game.nodes[4] = 'white';
  expect(getPhase(game, 'white')).toBe('movement');
});

test('player with 0 cows to place and exactly 3 on board is flying', () => {
  const game = createGame('12-cow');
  game.cowsToPlace.white = 0;
  game.nodes[0] = 'white';
  game.nodes[1] = 'white';
  game.nodes[2] = 'white';
  expect(getPhase(game, 'white')).toBe('flying');
});

// ---- getOpponent ----

test('opponent of white is black', () => {
  expect(getOpponent('white')).toBe('black');
});

test('opponent of black is white', () => {
  expect(getOpponent('black')).toBe('white');
});
