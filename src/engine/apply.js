/*
 * apply.js - Applying moves to the game state
 *
 * All the functions here are immutable - they return a NEW state
 * instead of changing the old one. If a move is invalid it returns
 * an error object like { error: true, code: '...', message: '...' }
 */

const { getPhase, getOpponent, countCowsOnBoard } = require('./state');
const { detectNewMills, getMills } = require('./mills');
const { getLegalCaptures } = require('./moves');
const { STANDARD_ADJACENCY } = require('./constants');
const { checkWinCondition } = require('./win');

// Deep copies the game state so we don't mutate the original
function copyState(state) {
  return {
    nodes: [...state.nodes],
    currentPlayer: state.currentPlayer,
    phase: { ...state.phase },
    cowsToPlace: { ...state.cowsToPlace },
    cowsCaptured: { ...state.cowsCaptured },
    capturePending: state.capturePending,
    mills: state.mills.map(mill => ({
      nodes: [...mill.nodes],
      player: mill.player
    })),
    winner: state.winner,
    winReason: state.winReason,
    variant: state.variant
  };
}

// Makes an error result object
function createError(code, message) {
  return {
    error: true,
    code,
    message
  };
}

// Places a cow on the board
// Does a bunch of validation first, then checks for new mills
// If a mill is formed, the player gets to capture next
function applyPlacement(state, nodeId) {
  const currentPlayer = state.currentPlayer;
  
  // can't move if game's over
  if (state.winner !== null) {
    return createError('GAME_OVER', 'Cannot make moves after game has ended');
  }
  
  // gotta capture first if one is pending
  if (state.capturePending > 0) {
    return createError('CAPTURE_REQUIRED', 'Must capture an opponent cow before making other moves');
  }
  
  // must be in placement phase
  const phase = getPhase(state, currentPlayer);
  if (phase !== 'placement') {
    return createError('NOT_YOUR_TURN', `Player ${currentPlayer} is not in placement phase`);
  }
  
  // node ID must be 0-23
  if (typeof nodeId !== 'number' || nodeId < 0 || nodeId > 23 || !Number.isInteger(nodeId)) {
    return createError('INVALID_PLACEMENT', `Invalid node ID: ${nodeId}. Must be an integer from 0 to 23`);
  }
  
  // spot must be empty
  if (state.nodes[nodeId] !== null) {
    return createError('INVALID_PLACEMENT', `Node ${nodeId} is already occupied by ${state.nodes[nodeId]}`);
  }
  
  // all good, make the new state
  const newState = copyState(state);
  
  // put the cow down
  newState.nodes[nodeId] = currentPlayer;
  newState.cowsToPlace[currentPlayer]--;
  
  // if that was the last cow to place, move to the next phase
  if (newState.cowsToPlace[currentPlayer] === 0) {
    const cowsOnBoard = countCowsOnBoard(newState, currentPlayer);
    if (cowsOnBoard <= 3) {
      newState.phase[currentPlayer] = 'flying';
    } else {
      newState.phase[currentPlayer] = 'movement';
    }
  }
  
  // did we make a new mill?
  const newMills = detectNewMills(state, newState, nodeId);
  newState.mills = getMills(newState);
  
  if (newMills.length > 0) {
    // yes! player gets to capture
    newState.capturePending += newMills.length;
  } else {
    // no mill, switch turns
    newState.currentPlayer = getOpponent(currentPlayer);
    
    // check if the other player can even move
    const winResult = checkWinCondition(newState);
    if (winResult !== null) {
      newState.winner = winResult.winner;
      newState.winReason = winResult.reason;
    }
  }
  
  return newState;
}

// Moves a cow from one spot to another (slide or fly)
// In movement phase: can only go to adjacent empty spots
// In flying phase: can go to ANY empty spot
function applySlide(state, from, to) {
  const currentPlayer = state.currentPlayer;
  
  if (state.winner !== null) {
    return createError('GAME_OVER', 'Cannot make moves after game has ended');
  }
  
  if (state.capturePending > 0) {
    return createError('CAPTURE_REQUIRED', 'Must capture an opponent cow before making other moves');
  }
  
  const phase = getPhase(state, currentPlayer);
  if (phase !== 'movement' && phase !== 'flying') {
    return createError('NOT_YOUR_TURN', `Player ${currentPlayer} is not in movement or flying phase`);
  }
  
  // validate the from node
  if (typeof from !== 'number' || from < 0 || from > 23 || !Number.isInteger(from)) {
    return createError('INVALID_MOVE', `Invalid from node ID: ${from}. Must be an integer from 0 to 23`);
  }
  
  // validate the to node
  if (typeof to !== 'number' || to < 0 || to > 23 || !Number.isInteger(to)) {
    return createError('INVALID_MOVE', `Invalid to node ID: ${to}. Must be an integer from 0 to 23`);
  }
  
  // must be moving your own cow
  if (state.nodes[from] !== currentPlayer) {
    return createError('INVALID_MOVE', `Node ${from} does not contain ${currentPlayer}'s cow`);
  }
  
  // destination must be empty
  if (state.nodes[to] !== null) {
    return createError('INVALID_MOVE', `Node ${to} is already occupied by ${state.nodes[to]}`);
  }
  
  // in movement phase, must be adjacent
  if (phase === 'movement') {
    const adjacentNodes = STANDARD_ADJACENCY[from] ?? STANDARD_ADJACENCY[String(from)] ?? [];
    if (!adjacentNodes.includes(to)) {
      return createError('INVALID_MOVE', `Node ${to} is not adjacent to node ${from}`);
    }
  }
  // flying phase can go anywhere empty (already checked)
  
  const newState = copyState(state);
  
  // move the cow
  newState.nodes[from] = null;
  newState.nodes[to] = currentPlayer;
  
  // check for new mills
  const newMills = detectNewMills(state, newState, to);
  newState.mills = getMills(newState);
  
  if (newMills.length > 0) {
    newState.capturePending += newMills.length;
  } else {
    newState.currentPlayer = getOpponent(currentPlayer);
    
    const winResult = checkWinCondition(newState);
    if (winResult !== null) {
      newState.winner = winResult.winner;
      newState.winReason = winResult.reason;
    }
  }
  
  return newState;
}

// Captures an opponent's cow (after forming a mill)
// Can only capture cows not in a mill, unless they ALL are
function applyCapture(state, targetNode) {
  const currentPlayer = state.currentPlayer;
  const opponent = getOpponent(currentPlayer);
  
  if (state.winner !== null) {
    return createError('GAME_OVER', 'Cannot make moves after game has ended');
  }
  
  if (state.capturePending <= 0) {
    return createError('INVALID_CAPTURE', 'No capture is pending');
  }
  
  if (typeof targetNode !== 'number' || targetNode < 0 || targetNode > 23 || !Number.isInteger(targetNode)) {
    return createError('INVALID_CAPTURE', `Invalid target node ID: ${targetNode}. Must be an integer from 0 to 23`);
  }
  
  // must be capturing an opponent's cow
  if (state.nodes[targetNode] !== opponent) {
    if (state.nodes[targetNode] === null) {
      return createError('INVALID_CAPTURE', `Node ${targetNode} is empty`);
    }
    return createError('INVALID_CAPTURE', `Cannot capture your own cow at node ${targetNode}`);
  }
  
  // check if this is actually a legal capture target
  const legalCaptures = getLegalCaptures(state);
  if (!legalCaptures.includes(targetNode)) {
    return createError('INVALID_CAPTURE', `Cannot capture cow at node ${targetNode} - it is in a mill and other cows are available`);
  }
  
  const newState = copyState(state);
  
  // remove the cow
  newState.nodes[targetNode] = null;
  newState.capturePending--;
  newState.cowsCaptured[currentPlayer]++;
  
  // update mills since we might have broken one
  newState.mills = getMills(newState);
  
  // check if opponent drops to flying phase
  const opponentCowsOnBoard = countCowsOnBoard(newState, opponent);
  const opponentCowsToPlace = newState.cowsToPlace[opponent];
  
  if (opponentCowsToPlace === 0 && opponentCowsOnBoard === 3) {
    newState.phase[opponent] = 'flying';
  }
  
  // check if opponent is eliminated (less than 3 cows after placement)
  if (opponentCowsToPlace === 0 && opponentCowsOnBoard < 3) {
    newState.winner = currentPlayer;
    newState.winReason = 'opponent_below_three';
    return newState;
  }
  
  // if no more captures needed, switch turns
  if (newState.capturePending === 0) {
    newState.currentPlayer = opponent;
    
    const winResult = checkWinCondition(newState);
    if (winResult !== null) {
      newState.winner = winResult.winner;
      newState.winReason = winResult.reason;
    }
  }
  // if capturePending > 0 still, player keeps going (double mill)
  
  return newState;
}

// The main entry point for applying any move
// Takes a move object with a type field and dispatches to the right handler
function applyMove(state, move) {
  if (!move || typeof move !== 'object') {
    return createError('INVALID_MOVE', 'Move must be an object');
  }
  
  const validTypes = ['placement', 'slide', 'capture'];
  if (!validTypes.includes(move.type)) {
    return createError('INVALID_MOVE', `Invalid move type: ${move.type}. Must be one of: ${validTypes.join(', ')}`);
  }
  
  // make sure it's actually your turn
  if (move.player !== state.currentPlayer) {
    return createError('NOT_YOUR_TURN', `It is ${state.currentPlayer}'s turn, not ${move.player}'s`);
  }
  
  // dispatch based on move type
  switch (move.type) {
    case 'placement':
      if (move.node === undefined || move.node === null) {
        return createError('INVALID_MOVE', 'Placement move requires a node field');
      }
      return applyPlacement(state, Number(move.node));
      
    case 'slide':
      if (move.from === undefined || move.from === null) {
        return createError('INVALID_MOVE', 'Slide move requires a from field');
      }
      if (move.to === undefined || move.to === null) {
        return createError('INVALID_MOVE', 'Slide move requires a to field');
      }
      return applySlide(state, Number(move.from), Number(move.to));
      
    case 'capture':
      if (move.target === undefined || move.target === null) {
        return createError('INVALID_MOVE', 'Capture move requires a target field');
      }
      return applyCapture(state, Number(move.target));
      
    default:
      return createError('INVALID_MOVE', `Unknown move type: ${move.type}`);
  }
}

module.exports = {
  applyPlacement,
  applySlide,
  applyCapture,
  applyMove,
  copyState,
  createError
};
