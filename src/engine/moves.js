/*
 * moves.js - Legal move generation
 *
 * This is where we figure out what moves a player can actually make.
 * Depends on what phase they're in (placing, sliding, or flying)
 * and whether they need to capture something first.
 */

const { getPhase, countCowsOnBoard } = require('./state');
const { BOARD_SIZE, STANDARD_ADJACENCY } = require('./constants');
const { isInMill } = require('./mills');

// Quick number conversion helper
function toNum(x) {
  return Number(x);
}

// Gets the neighbors of a node from the adjacency map
// Handles both number and string keys just in case
function getAdjacent(nodeId) {
  const id = toNum(nodeId);
  return STANDARD_ADJACENCY[id] ?? STANDARD_ADJACENCY[String(id)] ?? [];
}

// Returns all empty spots where the current player can place a cow
// Only works during placement phase, and not if they need to capture first
function getLegalPlacements(state) {
  if (state.winner !== null) {
    return [];
  }
  
  if (state.capturePending > 0) {
    return [];
  }
  
  const currentPlayer = state.currentPlayer;
  const phase = getPhase(state, currentPlayer);
  
  if (phase !== 'placement') {
    return [];
  }
  
  // just find all the empty nodes
  const emptyNodes = [];
  for (let nodeId = 0; nodeId < BOARD_SIZE; nodeId++) {
    if (state.nodes[nodeId] === null) {
      emptyNodes.push(nodeId);
    }
  }
  
  return emptyNodes;
}

// Gets where a specific cow can slide to (adjacent empty spots only)
// Only works in movement phase
function getLegalSlides(state, fromNode) {
  const from = toNum(fromNode);
  
  if (state.winner !== null) {
    return [];
  }
  
  if (state.capturePending > 0) {
    return [];
  }
  
  const currentPlayer = state.currentPlayer;
  const phase = getPhase(state, currentPlayer);
  
  if (phase !== 'movement') {
    return [];
  }
  
  // gotta be your own cow
  if (state.nodes[from] !== currentPlayer) {
    return [];
  }
  
  const adjacentNodes = getAdjacent(from);
  const legalDestinations = adjacentNodes.filter(nodeId => state.nodes[nodeId] === null);
  
  return legalDestinations;
}

// Gets ALL possible slides for the current player
// Returns {from, to} pairs for every cow that can move somewhere
function getAllLegalSlides(state) {
  if (state.winner !== null) {
    return [];
  }
  
  if (state.capturePending > 0) {
    return [];
  }
  
  const currentPlayer = state.currentPlayer;
  const phase = getPhase(state, currentPlayer);
  
  if (phase !== 'movement') {
    return [];
  }
  
  const allSlides = [];
  
  for (let nodeId = 0; nodeId < BOARD_SIZE; nodeId++) {
    if (state.nodes[nodeId] === currentPlayer) {
      const destinations = getLegalSlides(state, nodeId);
      
      for (const to of destinations) {
        allSlides.push({ from: nodeId, to: toNum(to) });
      }
    }
  }
  
  return allSlides;
}

// Gets where a cow can fly to (any empty spot on the board)
// Only works when you're down to 3 cows (flying phase)
function getLegalFlying(state, fromNode) {
  const from = toNum(fromNode);
  
  if (state.winner !== null) {
    return [];
  }
  
  if (state.capturePending > 0) {
    return [];
  }
  
  const currentPlayer = state.currentPlayer;
  const phase = getPhase(state, currentPlayer);
  
  if (phase !== 'flying') {
    return [];
  }
  
  if (state.nodes[from] !== currentPlayer) {
    return [];
  }
  
  // flying means you can go to ANY empty spot
  const emptyNodes = [];
  for (let nodeId = 0; nodeId < BOARD_SIZE; nodeId++) {
    if (state.nodes[nodeId] === null) {
      emptyNodes.push(nodeId);
    }
  }
  
  return emptyNodes;
}

// Gets ALL possible flying moves for the current player
function getAllLegalFlying(state) {
  if (state.winner !== null) {
    return [];
  }
  
  if (state.capturePending > 0) {
    return [];
  }
  
  const currentPlayer = state.currentPlayer;
  const phase = getPhase(state, currentPlayer);
  
  if (phase !== 'flying') {
    return [];
  }
  
  const allFlying = [];
  
  for (let nodeId = 0; nodeId < BOARD_SIZE; nodeId++) {
    if (state.nodes[nodeId] === currentPlayer) {
      const destinations = getLegalFlying(state, nodeId);
      
      for (const to of destinations) {
        allFlying.push({ from: nodeId, to });
      }
    }
  }
  
  return allFlying;
}

// Gets which opponent cows you can capture
// You can only capture cows that AREN'T in a mill...
// unless ALL of them are in mills, then you can take any
function getLegalCaptures(state) {
  if (state.winner !== null) {
    return [];
  }

  if (state.capturePending <= 0) {
    return [];
  }

  const currentPlayer = state.currentPlayer;
  const opponent = currentPlayer === 'white' ? 'black' : 'white';

  // find all the opponent's cows
  const opponentCows = [];
  for (let nodeId = 0; nodeId < BOARD_SIZE; nodeId++) {
    if (state.nodes[nodeId] === opponent) {
      opponentCows.push(nodeId);
    }
  }

  // prefer cows that aren't protected by a mill
  const cowsNotInMill = opponentCows.filter(nodeId => !isInMill(state, nodeId));

  if (cowsNotInMill.length > 0) {
    return cowsNotInMill;
  }

  // if everything's in a mill, you can take whatever you want
  return opponentCows;
}



// The main function - gets ALL legal moves as move objects
// Figures out what type of moves are available based on the game state:
// - capture pending? only capture moves
// - placement phase? placement moves
// - movement phase? slide moves
// - flying phase? also slide moves but to any empty spot
function getLegalMoves(state) {
  if (state.winner !== null) {
    return [];
  }
  
  const currentPlayer = state.currentPlayer;
  
  // if you need to capture, that's the only thing you can do
  if (state.capturePending > 0) {
    const captureTargets = getLegalCaptures(state);
    return captureTargets.map(target => ({
      type: 'capture',
      player: currentPlayer,
      target
    }));
  }
  
  const phase = getPhase(state, currentPlayer);
  
  if (phase === 'placement') {
    const placements = getLegalPlacements(state);
    return placements.map(node => ({
      type: 'placement',
      player: currentPlayer,
      node
    }));
  }
  
  if (phase === 'movement') {
    const slides = getAllLegalSlides(state);
    return slides.map(({ from, to }) => ({
      type: 'slide',
      player: currentPlayer,
      from,
      to
    }));
  }
  
  if (phase === 'flying') {
    // flying moves use 'slide' type too, just with non-adjacent destinations
    const flyingMoves = getAllLegalFlying(state);
    return flyingMoves.map(({ from, to }) => ({
      type: 'slide',
      player: currentPlayer,
      from,
      to
    }));
  }
  
  // shouldn't get here but just in case
  return [];
}

module.exports = {
  getLegalPlacements,
  getLegalSlides,
  getAllLegalSlides,
  getLegalFlying,
  getAllLegalFlying,
  getLegalCaptures,
  getLegalMoves,
  isInMill,
  toNum,
  getAdjacent
};
