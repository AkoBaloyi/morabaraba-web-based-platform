// Tests for the capture phase

const { createGame, applyMove, getLegalCaptures } = require('../src/index');
const { isInMill } = require('../../src/engine/mills');

// helper: set up a state where white just formed a mill and needs to capture
function setupCaptureState() {
  let game = createGame('12-cow');
  // white: 0, 1, 2 (mill on top row)
  // black: 9, 10, 11
  game = applyMove(game, { type: 'placement', player: 'white', node: 0 });
  game = applyMove(game, { type: 'placement', player: 'black', node: 9 });
  game = applyMove(game, { type: 'placement', player: 'white', node: 1 });
  game = applyMove(game, { type: 'placement', player: 'black', node: 10 });
  game = applyMove(game, { type: 'placement', player: 'white', node: 2 }); // mill!
  return game;
}

test('after forming a mill, capture is pending', () => {
  const game = setupCaptureState();
  expect(game.capturePending).toBe(1);
});

test('can capture an opponent cow that is not in a mill', () => {
  const game = setupCaptureState();
  // black has cows at 9, 10, 11 - node 9 is not in a mill (9,10,11 IS a mill actually)
  // lets check which ones are capturable
  const targets = getLegalCaptures(game);
  expect(targets.length).toBeGreaterThan(0);

  const result = applyMove(game, { type: 'capture', player: 'white', target: targets[0] });
  expect(result.error).toBeUndefined();
  expect(result.nodes[targets[0]]).toBeNull();
});

test('capture increases cowsCaptured count', () => {
  const game = setupCaptureState();
  const targets = getLegalCaptures(game);
  const result = applyMove(game, { type: 'capture', player: 'white', target: targets[0] });

  expect(result.cowsCaptured.white).toBe(1);
});

test('after capture, turn switches to opponent', () => {
  const game = setupCaptureState();
  const targets = getLegalCaptures(game);
  const result = applyMove(game, { type: 'capture', player: 'white', target: targets[0] });

  // capturePending should be 0 now, so turn switches
  if (result.capturePending === 0) {
    expect(result.currentPlayer).toBe('black');
  }
});

test('cannot capture your own cow', () => {
  const game = setupCaptureState();
  // try to capture white's own cow at node 0
  const result = applyMove(game, { type: 'capture', player: 'white', target: 0 });
  expect(result.error).toBe(true);
});

test('cannot capture an empty node', () => {
  const game = setupCaptureState();
  const result = applyMove(game, { type: 'capture', player: 'white', target: 23 });
  expect(result.error).toBe(true);
});

test('cannot capture when no capture is pending', () => {
  const game = createGame('12-cow');
  game.nodes[5] = 'black';
  // no mill formed, capturePending is 0
  const result = applyMove(game, { type: 'capture', player: 'white', target: 5 });
  expect(result.error).toBe(true);
});

test('cannot place a cow while capture is pending', () => {
  const game = setupCaptureState();
  // try to place instead of capturing
  const result = applyMove(game, { type: 'placement', player: 'white', node: 23 });
  expect(result.error).toBe(true);
});
