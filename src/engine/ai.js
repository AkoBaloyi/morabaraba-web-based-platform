/*
 * ai.js - Computer opponents
 *
 * Three difficulty levels:
 * - Easy: just picks a random legal move
 * - Medium: uses some basic heuristics (prefers mills, blocks opponent)
 * - Hard: minimax with alpha-beta pruning (the smart one)
 *
 * The hard AI has a time limit of 1.8 seconds so it doesn't
 * take forever thinking. Uses iterative deepening to make sure
 * it always has a move ready even if it runs out of time.
 */

const { getLegalMoves } = require('./moves');
const { applyMove } = require('./apply');
const { detectNewMills, getMills } = require('./mills');
const { getOpponent, countCowsOnBoard, getPhase } = require('./state');
const { STANDARD_MILLS, STANDARD_ADJACENCY, BOARD_SIZE } = require('./constants');

// Easy AI - literally just picks a random move
function selectMoveEasy(state) {
  const legalMoves = getLegalMoves(state);
  
  if (legalMoves.length === 0) {
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * legalMoves.length);
  return legalMoves[randomIndex];
}

// Class wrapper for easy AI so it has the same interface as the others
class EasyAI {
  selectMove(state) {
    return selectMoveEasy(state);
  }
}

// Scores a move for the medium AI
// +10 for forming a mill, +5 for blocking opponent's mill
// plus a tiny random factor so it's not totally predictable
function evaluateMoveMedium(state, move) {
  let score = 0;
  
  const newState = applyMove(state, move);
  
  // if the move is somehow invalid, don't pick it
  if (newState.error) {
    return -1000;
  }
  
  const currentPlayer = state.currentPlayer;
  const opponent = getOpponent(currentPlayer);
  
  // check if this move makes a mill
  if (move.type === 'placement') {
    const newMills = detectNewMills(state, newState, move.node);
    if (newMills.length > 0) {
      score += 10 * newMills.length;
    }
  } else if (move.type === 'slide') {
    const newMills = detectNewMills(state, newState, move.to);
    if (newMills.length > 0) {
      score += 10 * newMills.length;
    }
  }
  // captures are always nice
  if (move.type === 'capture') {
    score += 8;
  }
  
  // check if we're blocking an opponent's almost-mill
  if (move.type === 'placement' || move.type === 'slide') {
    const targetNode = move.type === 'placement' ? move.node : move.to;
    
    for (const millDef of STANDARD_MILLS) {
      if (millDef.includes(targetNode)) {
        let opponentCount = 0;
        let emptyCount = 0;
        
        for (const nodeId of millDef) {
          if (state.nodes[nodeId] === opponent) {
            opponentCount++;
          } else if (state.nodes[nodeId] === null) {
            emptyCount++;
          }
        }
        
        // opponent had 2 in a row and we just took the last spot
        if (opponentCount === 2 && emptyCount === 1) {
          score += 5;
        }
      }
    }
  }
  
  // little bit of randomness
  score += Math.random();
  
  return score;
}

// Medium AI - picks the move with the highest heuristic score
function selectMoveMedium(state) {
  const legalMoves = getLegalMoves(state);
  
  if (legalMoves.length === 0) {
    return null;
  }
  
  let bestMove = null;
  let bestScore = -Infinity;
  
  for (const move of legalMoves) {
    const score = evaluateMoveMedium(state, move);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  
  return bestMove;
}

// Class wrapper for medium AI
class MediumAI {
  selectMove(state) {
    return selectMoveMedium(state);
  }
}

// Evaluates how good a game state is for a given player
// Looks at piece count, mills, mobility, potential mills, and center control
function evaluateState(state, player) {
  const opponent = getOpponent(player);
  
  // if someone already won, that's pretty clear cut
  if (state.winner === player) {
    return 10000;
  }
  if (state.winner === opponent) {
    return -10000;
  }
  
  let score = 0;
  
  // piece count is the most important thing (100 pts per cow difference)
  const playerCows = countCowsOnBoard(state, player);
  const opponentCows = countCowsOnBoard(state, opponent);
  const cowsToPlacePlayer = state.cowsToPlace[player];
  const cowsToPlaceOpponent = state.cowsToPlace[opponent];
  
  const playerTotal = playerCows + cowsToPlacePlayer;
  const opponentTotal = opponentCows + cowsToPlaceOpponent;
  
  score += (playerTotal - opponentTotal) * 100;
  
  // mills are worth 30 pts each
  const mills = getMills(state);
  let playerMills = 0;
  let opponentMills = 0;
  
  for (const mill of mills) {
    if (mill.player === player) {
      playerMills++;
    } else {
      opponentMills++;
    }
  }
  
  score += (playerMills - opponentMills) * 30;
  
  // mobility - how many places can your cows go? (2 pts per option)
  const playerPhase = getPhase(state, player);
  const opponentPhase = getPhase(state, opponent);
  
  let playerMobility = 0;
  let opponentMobility = 0;
  
  if (playerPhase === 'placement') {
    playerMobility = state.nodes.filter(n => n === null).length;
  } else if (playerPhase === 'flying') {
    playerMobility = playerCows * state.nodes.filter(n => n === null).length;
  } else {
    for (let nodeId = 0; nodeId < BOARD_SIZE; nodeId++) {
      if (state.nodes[nodeId] === player) {
        const adjacent = STANDARD_ADJACENCY[String(nodeId)] || [];
        playerMobility += adjacent.filter(n => state.nodes[n] === null).length;
      }
    }
  }
  
  if (opponentPhase === 'placement') {
    opponentMobility = state.nodes.filter(n => n === null).length;
  } else if (opponentPhase === 'flying') {
    opponentMobility = opponentCows * state.nodes.filter(n => n === null).length;
  } else {
    for (let nodeId = 0; nodeId < BOARD_SIZE; nodeId++) {
      if (state.nodes[nodeId] === opponent) {
        const adjacent = STANDARD_ADJACENCY[String(nodeId)] || [];
        opponentMobility += adjacent.filter(n => state.nodes[n] === null).length;
      }
    }
  }
  
  score += (playerMobility - opponentMobility) * 2;
  
  // potential mills - 2 cows in a line with the third spot empty (15 pts)
  let playerPotentialMills = 0;
  let opponentPotentialMills = 0;
  
  for (const millDef of STANDARD_MILLS) {
    let playerCount = 0;
    let opponentCount = 0;
    let emptyCount = 0;
    
    for (const nodeId of millDef) {
      if (state.nodes[nodeId] === player) {
        playerCount++;
      } else if (state.nodes[nodeId] === opponent) {
        opponentCount++;
      } else {
        emptyCount++;
      }
    }
    
    if (playerCount === 2 && emptyCount === 1) {
      playerPotentialMills++;
    }
    if (opponentCount === 2 && emptyCount === 1) {
      opponentPotentialMills++;
    }
  }
  
  score += (playerPotentialMills - opponentPotentialMills) * 15;
  
  // center control bonus - nodes 4, 10, 13, 19 have 4 connections each
  // so they're strategically more valuable (10 pts)
  const centerNodes = [4, 10, 13, 19];
  let playerCenterControl = 0;
  let opponentCenterControl = 0;
  
  for (const nodeId of centerNodes) {
    if (state.nodes[nodeId] === player) {
      playerCenterControl++;
    } else if (state.nodes[nodeId] === opponent) {
      opponentCenterControl++;
    }
  }
  
  score += (playerCenterControl - opponentCenterControl) * 10;
  
  return score;
}

// Minimax with alpha-beta pruning
// The classic game tree search algorithm
// Has a time limit so it doesn't think forever
function minimax(state, depth, alpha, beta, maximizingPlayer, aiPlayer, startTime, timeLimit) {
  // ran out of time?
  if (Date.now() - startTime > timeLimit) {
    return { score: evaluateState(state, aiPlayer), timedOut: true };
  }
  
  // reached the bottom of the search or game is over
  if (depth === 0 || state.winner !== null) {
    return { score: evaluateState(state, aiPlayer), timedOut: false };
  }
  
  const legalMoves = getLegalMoves(state);
  
  if (legalMoves.length === 0) {
    return { score: evaluateState(state, aiPlayer), timedOut: false };
  }
  
  if (maximizingPlayer) {
    let maxScore = -Infinity;
    
    for (const move of legalMoves) {
      const newState = applyMove(state, move);
      
      if (newState.error) {
        continue;
      }
      
      const result = minimax(newState, depth - 1, alpha, beta, false, aiPlayer, startTime, timeLimit);
      
      if (result.timedOut) {
        return { score: maxScore === -Infinity ? result.score : maxScore, timedOut: true };
      }
      
      maxScore = Math.max(maxScore, result.score);
      alpha = Math.max(alpha, result.score);
      
      if (beta <= alpha) {
        break; // prune
      }
    }
    
    return { score: maxScore, timedOut: false };
  } else {
    let minScore = Infinity;
    
    for (const move of legalMoves) {
      const newState = applyMove(state, move);
      
      if (newState.error) {
        continue;
      }
      
      const result = minimax(newState, depth - 1, alpha, beta, true, aiPlayer, startTime, timeLimit);
      
      if (result.timedOut) {
        return { score: minScore === Infinity ? result.score : minScore, timedOut: true };
      }
      
      minScore = Math.min(minScore, result.score);
      beta = Math.min(beta, result.score);
      
      if (beta <= alpha) {
        break; // prune
      }
    }
    
    return { score: minScore, timedOut: false };
  }
}

// Hard AI - the big brain one
// Uses iterative deepening so it always has a move ready
// Starts at depth 3 and goes deeper if there's time
// Time limit is 1.8s to stay under the 2s requirement
function selectMoveHard(state) {
  const legalMoves = getLegalMoves(state);
  
  if (legalMoves.length === 0) {
    return null;
  }
  
  // only one option? just go with it
  if (legalMoves.length === 1) {
    return legalMoves[0];
  }
  
  const aiPlayer = state.currentPlayer;
  const startTime = Date.now();
  const timeLimit = 1800; // 1.8 seconds, leaves 200ms buffer
  
  let bestMove = legalMoves[0];
  let bestScore = -Infinity;
  
  // try deeper and deeper searches until we run out of time
  for (let depth = 3; depth <= 5; depth++) {
    // if we've used 70% of our time, don't start another depth
    if (Date.now() - startTime > timeLimit * 0.7) {
      break;
    }
    
    let currentBestMove = legalMoves[0];
    let currentBestScore = -Infinity;
    let timedOut = false;
    
    for (const move of legalMoves) {
      const newState = applyMove(state, move);
      
      if (newState.error) {
        continue;
      }
      
      // if it's still our turn after the move (capture pending), maximize
      // otherwise the opponent goes next so we minimize
      const isMaximizing = newState.currentPlayer === aiPlayer;
      
      const result = minimax(
        newState,
        depth - 1,
        -Infinity,
        Infinity,
        isMaximizing,
        aiPlayer,
        startTime,
        timeLimit
      );
      
      if (result.timedOut) {
        timedOut = true;
        break;
      }
      
      if (result.score > currentBestScore) {
        currentBestScore = result.score;
        currentBestMove = move;
      }
    }
    
    // only use this depth's result if we finished it completely
    if (!timedOut) {
      bestMove = currentBestMove;
      bestScore = currentBestScore;
    } else {
      break;
    }
  }
  
  return bestMove;
}

// Class wrapper for hard AI
class HardAI {
  selectMove(state) {
    return selectMoveHard(state);
  }
}

module.exports = {
  selectMoveEasy,
  EasyAI,
  selectMoveMedium,
  evaluateMoveMedium,
  MediumAI,
  evaluateState,
  minimax,
  selectMoveHard,
  HardAI
};
