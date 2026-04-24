// re-exports from the real engine so tests can require from here
const state = require('../../src/engine/state');
const moves = require('../../src/engine/moves');
const apply = require('../../src/engine/apply');
const mills = require('../../src/engine/mills');
const win = require('../../src/engine/win');
const ai = require('../../src/engine/ai');
const constants = require('../../src/engine/constants');

module.exports = { ...state, ...moves, ...apply, ...mills, ...win, ...ai, ...constants };
