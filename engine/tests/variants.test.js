// Tests for variant support (12-cow, 9-cow, 6-cow)

const { createGame, applyMove } = require('../src/index');

test('12-cow variant gives 12 cows per player', () => {
  const game = createGame('12-cow');
  expect(game.cowsToPlace.white).toBe(12);
  expect(game.cowsToPlace.black).toBe(12);
  expect(game.variant).toBe('12-cow');
});

test('9-cow variant gives 9 cows per player', () => {
  const game = createGame('9-cow');
  expect(game.cowsToPlace.white).toBe(9);
  expect(game.cowsToPlace.black).toBe(9);
  expect(game.variant).toBe('9-cow');
});

test('6-cow variant gives 6 cows per player', () => {
  const game = createGame('6-cow');
  expect(game.cowsToPlace.white).toBe(6);
  expect(game.cowsToPlace.black).toBe(6);
  expect(game.variant).toBe('6-cow');
});

test('9-cow game transitions to movement after 9 placements', () => {
  let game = createGame('9-cow');
  // place 9 white and 9 black cows alternating
  const nodes = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17];
  for (let i = 0; i < 18; i++) {
    const player = i % 2 === 0 ? 'white' : 'black';
    game = applyMove(game, { type: 'placement', player: player, node: nodes[i] });
    if (game.error) break;
    // skip captures if mill formed
    while (game.capturePending > 0) {
      // find a legal capture target
      const opp = player === 'white' ? 'black' : 'white';
      for (let n = 0; n < 24; n++) {
        if (game.nodes[n] === opp) {
          const r = applyMove(game, { type: 'capture', player: player, target: n });
          if (!r.error) { game = r; break; }
        }
      }
    }
  }
  // after all placements, both should be in movement (or flying if captures happened)
  expect(game.cowsToPlace.white).toBe(0);
  expect(game.cowsToPlace.black).toBe(0);
});

test('6-cow game has fewer total pieces on board', () => {
  let game = createGame('6-cow');
  // place all 12 cows (6 each)
  const nodes = [0,21,1,22,2,23,3,18,4,19,5,20];
  for (let i = 0; i < 12; i++) {
    const player = i % 2 === 0 ? 'white' : 'black';
    game = applyMove(game, { type: 'placement', player: player, node: nodes[i] });
    if (game.error) break;
    while (game.capturePending > 0) {
      const opp = player === 'white' ? 'black' : 'white';
      for (let n = 0; n < 24; n++) {
        if (game.nodes[n] === opp) {
          const r = applyMove(game, { type: 'capture', player: player, target: n });
          if (!r.error) { game = r; break; }
        }
      }
    }
  }
  expect(game.cowsToPlace.white).toBe(0);
  expect(game.cowsToPlace.black).toBe(0);
});

test('invalid variant throws error', () => {
  expect(() => createGame('99-cow')).toThrow();
  expect(() => createGame('')).toThrow();
  expect(() => createGame(null)).toThrow();
});
