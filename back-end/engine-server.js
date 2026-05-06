// engine-server.js
// Instead of maintaining a separate copy of the engine,
// we import directly from the shared source modules.
// This ensures client and server always use the same rules.

const { createGame, countCowsOnBoard, getPhase, getOpponent } = require('../src/engine/state');
const { getLegalMoves, getLegalCaptures, getAdjacent } = require('../src/engine/moves');
const { applyMove } = require('../src/engine/apply');
const { getMills, isInMill } = require('../src/engine/mills');
const { checkWinCondition } = require('../src/engine/win');
const { BOARD_SIZE } = require('../src/engine/constants');

module.exports = {
  createGame,
  applyMove,
  getPhase,
  getOpponent,
  countCowsOnBoard,
  getLegalCaptures,
  getLegalMoves,
  checkWinCondition,
  getAdjacent,
  getMills,
  isInMill,
  BOARD_SIZE,
};
