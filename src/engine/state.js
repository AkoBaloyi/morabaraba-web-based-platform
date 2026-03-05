/*
 * state.js - Game state stuff
 *
 * This handles creating a new game and checking things about the state
 * like what phase a player is in, how many cows they have, etc.
 */

const { VARIANTS, BOARD_SIZE } = require('./constants');

// Makes a fresh game state for whatever variant you pick
// Throws an error if you give it a variant that doesn't exist
function createGame(variantName) {
  const variant = VARIANTS[variantName];
  
  if (!variant) {
    throw new Error(`Invalid variant: ${variantName}. Valid variants are: ${Object.keys(VARIANTS).join(', ')}`);
  }
  
  const startingCows = variant.startingCows;
  
  return {
    // 24 spots on the board - null means empty, otherwise 'white' or 'black'
    nodes: Array(BOARD_SIZE).fill(null),
    
    // white goes first
    currentPlayer: 'white',
    
    // everyone starts placing cows
    phase: {
      white: 'placement',
      black: 'placement'
    },
    
    // how many cows each player still needs to put down
    cowsToPlace: {
      white: startingCows,
      black: startingCows
    },
    
    // how many of the opponent's cows you've taken
    cowsCaptured: {
      white: 0,
      black: 0
    },
    
    // 0 = no capture needed, 1 or 2 = must capture that many
    capturePending: 0,
    
    // list of active mills on the board
    mills: [],
    
    // null until someone wins
    winner: null,
    winReason: null,
    
    // which variant we're playing
    variant: variantName
  };
}

// Counts how many cows a player has sitting on the board right now
function countCowsOnBoard(state, player) {
  return state.nodes.filter(node => node === player).length;
}

// Figures out what phase a player is in:
// - placement: still putting cows down
// - movement: sliding cows to adjacent spots
// - flying: only 3 cows left, can jump anywhere
function getPhase(state, player) {
  const cowsToPlace = state.cowsToPlace[player];
  
  if (cowsToPlace > 0) {
    return 'placement';
  }
  
  const cowsOnBoard = countCowsOnBoard(state, player);
  
  if (cowsOnBoard > 3) {
    return 'movement';
  }
  
  // 3 or fewer cows = flying (if less than 3 the game should be over though)
  return 'flying';
}

// Returns the other player's color
function getOpponent(player) {
  return player === 'white' ? 'black' : 'white';
}

// Turns the game state into a JSON string
function toJSON(state) {
  return JSON.stringify(state);
}

// Parses a JSON string back into a game state
// Also validates it so we don't get garbage data
function fromJSON(json) {
  let state;

  try {
    state = JSON.parse(json);
  } catch (e) {
    throw new Error('Invalid JSON: ' + e.message);
  }

  validateState(state);

  return state;
}

// Makes sure a state object actually looks like a valid game state
// Checks all the fields, types, and values
function validateState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('State must be an object');
  }

  // nodes should be an array of 24 elements
  if (!Array.isArray(state.nodes)) {
    throw new Error('State nodes must be an array');
  }
  if (state.nodes.length !== BOARD_SIZE) {
    throw new Error(`State nodes must have exactly ${BOARD_SIZE} elements, got ${state.nodes.length}`);
  }
  for (let i = 0; i < state.nodes.length; i++) {
    const node = state.nodes[i];
    if (node !== null && node !== 'white' && node !== 'black') {
      throw new Error(`Invalid node value at index ${i}: ${node}. Must be null, 'white', or 'black'`);
    }
  }

  // currentPlayer must be white or black
  if (state.currentPlayer !== 'white' && state.currentPlayer !== 'black') {
    throw new Error(`Invalid currentPlayer: ${state.currentPlayer}. Must be 'white' or 'black'`);
  }

  // phase object with valid phases for each player
  if (!state.phase || typeof state.phase !== 'object') {
    throw new Error('State phase must be an object');
  }
  const validPhases = ['placement', 'movement', 'flying'];
  if (!validPhases.includes(state.phase.white)) {
    throw new Error(`Invalid phase for white: ${state.phase.white}. Must be 'placement', 'movement', or 'flying'`);
  }
  if (!validPhases.includes(state.phase.black)) {
    throw new Error(`Invalid phase for black: ${state.phase.black}. Must be 'placement', 'movement', or 'flying'`);
  }

  // cowsToPlace should have numbers for both players
  if (!state.cowsToPlace || typeof state.cowsToPlace !== 'object') {
    throw new Error('State cowsToPlace must be an object');
  }
  if (typeof state.cowsToPlace.white !== 'number') {
    throw new Error('cowsToPlace.white must be a number');
  }
  if (typeof state.cowsToPlace.black !== 'number') {
    throw new Error('cowsToPlace.black must be a number');
  }

  // cowsCaptured same deal
  if (!state.cowsCaptured || typeof state.cowsCaptured !== 'object') {
    throw new Error('State cowsCaptured must be an object');
  }
  if (typeof state.cowsCaptured.white !== 'number') {
    throw new Error('cowsCaptured.white must be a number');
  }
  if (typeof state.cowsCaptured.black !== 'number') {
    throw new Error('cowsCaptured.black must be a number');
  }

  // capturePending can only be 0, 1, or 2
  if (state.capturePending !== 0 && state.capturePending !== 1 && state.capturePending !== 2) {
    throw new Error(`Invalid capturePending: ${state.capturePending}. Must be 0, 1, or 2`);
  }

  // variant must be one of the three options
  const validVariants = ['12-cow', '9-cow', '6-cow'];
  if (!validVariants.includes(state.variant)) {
    throw new Error(`Invalid variant: ${state.variant}. Must be '12-cow', '9-cow', or '6-cow'`);
  }
}



module.exports = {
  createGame,
  countCowsOnBoard,
  getPhase,
  getOpponent,
  toJSON,
  fromJSON,
  validateState
};
