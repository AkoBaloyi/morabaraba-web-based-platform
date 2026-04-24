// Tests for mill detection

const { createGame } = require('../src/index');
const { getMills, isInMill, detectNewMills } = require('../../src/engine/mills');

test('no mills on an empty board', () => {
  const game = createGame('12-cow');
  expect(getMills(game)).toHaveLength(0);
});

test('three white cows in a row counts as a mill', () => {
  const game = createGame('12-cow');
  // top row: nodes 0, 1, 2
  game.nodes[0] = 'white';
  game.nodes[1] = 'white';
  game.nodes[2] = 'white';

  const mills = getMills(game);
  expect(mills).toHaveLength(1);
  expect(mills[0].player).toBe('white');
});

test('two cows in a row is not a mill', () => {
  const game = createGame('12-cow');
  game.nodes[0] = 'white';
  game.nodes[1] = 'white';
  // node 2 is empty
  expect(getMills(game)).toHaveLength(0);
});

test('mixed colors in a line is not a mill', () => {
  const game = createGame('12-cow');
  game.nodes[0] = 'white';
  game.nodes[1] = 'black';
  game.nodes[2] = 'white';
  expect(getMills(game)).toHaveLength(0);
});

test('diagonal mill [0,3,6] is detected', () => {
  const game = createGame('12-cow');
  game.nodes[0] = 'black';
  game.nodes[3] = 'black';
  game.nodes[6] = 'black';

  const mills = getMills(game);
  const diag = mills.find(m => m.nodes.includes(0) && m.nodes.includes(3) && m.nodes.includes(6));
  expect(diag).toBeDefined();
  expect(diag.player).toBe('black');
});

test('diagonal mill [2,5,8] is detected', () => {
  const game = createGame('12-cow');
  game.nodes[2] = 'white';
  game.nodes[5] = 'white';
  game.nodes[8] = 'white';

  const mills = getMills(game);
  expect(mills.some(m => m.nodes.includes(2) && m.nodes.includes(5))).toBe(true);
});

test('isInMill returns true for a cow thats part of a mill', () => {
  const game = createGame('12-cow');
  game.nodes[0] = 'white';
  game.nodes[1] = 'white';
  game.nodes[2] = 'white';

  expect(isInMill(game, 0)).toBe(true);
  expect(isInMill(game, 1)).toBe(true);
  expect(isInMill(game, 2)).toBe(true);
});

test('isInMill returns false for a cow not in any mill', () => {
  const game = createGame('12-cow');
  game.nodes[0] = 'white';
  game.nodes[1] = 'white';
  // node 2 is empty so no mill
  game.nodes[5] = 'white';

  expect(isInMill(game, 0)).toBe(false);
  expect(isInMill(game, 5)).toBe(false);
});

test('isInMill returns false for an empty node', () => {
  const game = createGame('12-cow');
  expect(isInMill(game, 0)).toBe(false);
});

test('detectNewMills finds a mill that was just formed', () => {
  const before = createGame('12-cow');
  before.nodes[0] = 'white';
  before.nodes[1] = 'white';

  // after placing at node 2, the mill [0,1,2] should be new
  const after = createGame('12-cow');
  after.nodes[0] = 'white';
  after.nodes[1] = 'white';
  after.nodes[2] = 'white';

  const newMills = detectNewMills(before, after, 2);
  expect(newMills).toHaveLength(1);
});

test('detectNewMills does not count a mill that already existed', () => {
  // both before and after have the same mill
  const before = createGame('12-cow');
  before.nodes[0] = 'white';
  before.nodes[1] = 'white';
  before.nodes[2] = 'white';

  const after = createGame('12-cow');
  after.nodes[0] = 'white';
  after.nodes[1] = 'white';
  after.nodes[2] = 'white';
  after.nodes[5] = 'white'; // placed somewhere else

  const newMills = detectNewMills(before, after, 5);
  // node 5 doesnt complete any new mill by itself
  expect(newMills).toHaveLength(0);
});
