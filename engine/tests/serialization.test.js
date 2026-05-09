// Tests for state serialization and validation

const { createGame, toJSON, fromJSON, validateState, applyMove } = require('../src/index');

test('toJSON produces valid JSON string', () => {
  const game = createGame('12-cow');
  const json = toJSON(game);
  expect(typeof json).toBe('string');
  expect(() => JSON.parse(json)).not.toThrow();
});

test('fromJSON restores the same state', () => {
  const game = createGame('12-cow');
  const json = toJSON(game);
  const restored = fromJSON(json);
  expect(restored.nodes).toEqual(game.nodes);
  expect(restored.currentPlayer).toBe(game.currentPlayer);
  expect(restored.cowsToPlace).toEqual(game.cowsToPlace);
});

test('fromJSON works after moves have been made', () => {
  let game = createGame('12-cow');
  game = applyMove(game, { type: 'placement', player: 'white', node: 5 });
  game = applyMove(game, { type: 'placement', player: 'black', node: 10 });

  const json = toJSON(game);
  const restored = fromJSON(json);
  expect(restored.nodes[5]).toBe('white');
  expect(restored.nodes[10]).toBe('black');
  expect(restored.currentPlayer).toBe('white');
  expect(restored.cowsToPlace.white).toBe(11);
});

test('fromJSON throws on invalid JSON', () => {
  expect(() => fromJSON('not json')).toThrow();
  expect(() => fromJSON('{broken')).toThrow();
});

test('validateState rejects missing nodes', () => {
  expect(() => validateState({})).toThrow();
  expect(() => validateState({ nodes: 'not array' })).toThrow();
});

test('validateState rejects wrong node count', () => {
  const bad = createGame('12-cow');
  bad.nodes = [null, null, null]; // only 3
  expect(() => validateState(bad)).toThrow();
});

test('validateState rejects invalid player values in nodes', () => {
  const bad = createGame('12-cow');
  bad.nodes[0] = 'red'; // invalid
  expect(() => validateState(bad)).toThrow();
});

test('validateState rejects invalid currentPlayer', () => {
  const bad = createGame('12-cow');
  bad.currentPlayer = 'green';
  expect(() => validateState(bad)).toThrow();
});

test('validateState rejects invalid phase', () => {
  const bad = createGame('12-cow');
  bad.phase.white = 'running';
  expect(() => validateState(bad)).toThrow();
});

test('validateState accepts a valid state', () => {
  const game = createGame('12-cow');
  expect(() => validateState(game)).not.toThrow();
});
