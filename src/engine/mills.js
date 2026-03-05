/*
 * mills.js - Mill detection
 *
 * A mill is when you get 3 of your cows in a straight line.
 * This file handles finding mills, checking if a cow is in one,
 * and detecting when a new mill gets formed after a move.
 */

const { STANDARD_MILLS } = require('./constants');

// Helper to convert something to a number safely
// Sometimes node IDs come in as strings from JSON keys
function asNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : x;
}

// Sorts the 3 nodes and joins them with dashes so we can compare mills
// regardless of what order the nodes are listed in
function normalizeMill(nodes) {
  return [...nodes].sort((a, b) => a - b).join('-');
}

// Finds all the mills currently on the board
// Returns an array of { nodes: [n1, n2, n3], player: 'white'|'black' }
function getMills(state) {
  const mills = [];
  
  for (const [n1, n2, n3] of STANDARD_MILLS) {
    const player = state.nodes[n1];
    if (player && state.nodes[n2] === player && state.nodes[n3] === player) {
      mills.push({ nodes: [n1, n2, n3], player });
    }
  }
  
  return mills;
}

// Checks if the cow at a given node is part of any mill
function isInMill(state, nodeId) {
  const id = asNum(nodeId);
  const player = state.nodes[id];
  if (player === null) return false;

  for (const [n1, n2, n3] of STANDARD_MILLS) {
    if (n1 !== id && n2 !== id && n3 !== id) continue;
    if (state.nodes[n1] === player &&
        state.nodes[n2] === player &&
        state.nodes[n3] === player) {
      return true;
    }
  }
  return false;
}

// Gets all the mills that include a specific node
function getMillsContainingNode(state, nodeId) {
  const id = asNum(nodeId);
  const res = [];
  
  for (const [n1, n2, n3] of STANDARD_MILLS) {
    if (n1 !== id && n2 !== id && n3 !== id) continue;
    const player = state.nodes[n1];
    if (player && state.nodes[n2] === player && state.nodes[n3] === player) {
      res.push({ nodes: [n1, n2, n3], player });
    }
  }
  
  return res;
}

// Figures out which mills are NEW after a move
// Compares the mills before and after, and only returns the ones
// that didn't exist before (so we know when to trigger a capture)
function detectNewMills(prevState, newState, movedNode) {
  const id = asNum(movedNode);
  const prev = getMills(prevState);
  const prevSet = new Set(prev.map(m => `${m.player}:${normalizeMill(m.nodes)}`));
  
  const nowAtNode = getMillsContainingNode(newState, id);
  return nowAtNode.filter(m => !prevSet.has(`${m.player}:${normalizeMill(m.nodes)}`));
}

module.exports = {
  getMills,
  isInMill,
  getMillsContainingNode,
  detectNewMills,
  normalizeMill,
  asNum
};
