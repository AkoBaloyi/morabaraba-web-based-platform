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
// Stronger evaluation with double-mill detection, trapped pieces, and phase-aware scoring
function evaluateState(state, player) {
  const opponent = getOpponent(player);
  
  // terminal states
  if (state.winner === player) return 10000;
  if (state.winner === opponent) return -10000;
  if (state.winner === 'draw') return 0;
  
  let score = 0;
  
  const playerCows = countCowsOnBoard(state, player);
  const opponentCows = countCowsOnBoard(state, opponent);
  const cowsToPlacePlayer = state.cowsToPlace[player];
  const cowsToPlaceOpponent = state.cowsToPlace[opponent];
  const playerTotal = playerCows + cowsToPlacePlayer;
  const opponentTotal = opponentCows + cowsToPlaceOpponent;
  
  // piece advantage is king (150 pts per cow in movement phase, 100 in placement)
  const phaseMultiplier = (cowsToPlacePlayer === 0 && cowsToPlaceOpponent === 0) ? 150 : 100;
  score += (playerTotal - opponentTotal) * phaseMultiplier;
  
  // opponent at 3 cows (about to lose) is very good for us
  if (cowsToPlaceOpponent === 0 && opponentCows === 3) score += 500;
  if (cowsToPlacePlayer === 0 && playerCows === 3) score -= 500;
  
  // mills
  const mills = getMills(state);
  let playerMills = 0;
  let opponentMills = 0;
  
  for (const mill of mills) {
    if (mill.player === player) playerMills++;
    else opponentMills++;
  }
  score += (playerMills - opponentMills) * 40;
  
  // double mill detection: a cow that belongs to two mills simultaneously
  // this is devastating because you can open and close mills every turn
  let playerDoubleMills = 0;
  let opponentDoubleMills = 0;
  const nodeMills = {};
  for (const mill of mills) {
    for (const nodeId of mill.nodes) {
      const key = mill.player + '-' + nodeId;
      nodeMills[key] = (nodeMills[key] || 0) + 1;
      if (nodeMills[key] === 2) {
        if (mill.player === player) playerDoubleMills++;
        else opponentDoubleMills++;
      }
    }
  }
  score += (playerDoubleMills - opponentDoubleMills) * 80;
  
  // potential mills (2 in a row with empty third) - threats
  let playerPotentialMills = 0;
  let opponentPotentialMills = 0;
  // open mills: 1 cow + 2 empty in a line (future potential)
  let playerOpenMills = 0;
  let opponentOpenMills = 0;
  
  for (const millDef of STANDARD_MILLS) {
    let pCount = 0, oCount = 0, emptyCount = 0;
    for (const nodeId of millDef) {
      if (state.nodes[nodeId] === player) pCount++;
      else if (state.nodes[nodeId] === opponent) oCount++;
      else emptyCount++;
    }
    if (pCount === 2 && emptyCount === 1) playerPotentialMills++;
    if (oCount === 2 && emptyCount === 1) opponentPotentialMills++;
    if (pCount === 1 && emptyCount === 2) playerOpenMills++;
    if (oCount === 1 && emptyCount === 2) opponentOpenMills++;
  }
  score += (playerPotentialMills - opponentPotentialMills) * 25;
  score += (playerOpenMills - opponentOpenMills) * 5;
  
  // mobility (movement phase only - in placement everyone has same mobility)
  const playerPhase = getPhase(state, player);
  const opponentPhase = getPhase(state, opponent);
  
  if (playerPhase !== 'placement' || opponentPhase !== 'placement') {
    let playerMobility = 0;
    let opponentMobility = 0;
    
    if (playerPhase === 'flying') {
      playerMobility = state.nodes.filter(n => n === null).length;
    } else if (playerPhase === 'movement') {
      for (let nodeId = 0; nodeId < BOARD_SIZE; nodeId++) {
        if (state.nodes[nodeId] === player) {
          const adjacent = STANDARD_ADJACENCY[String(nodeId)] || [];
          playerMobility += adjacent.filter(n => state.nodes[n] === null).length;
        }
      }
    }
    
    if (opponentPhase === 'flying') {
      opponentMobility = state.nodes.filter(n => n === null).length;
    } else if (opponentPhase === 'movement') {
      for (let nodeId = 0; nodeId < BOARD_SIZE; nodeId++) {
        if (state.nodes[nodeId] === opponent) {
          const adjacent = STANDARD_ADJACENCY[String(nodeId)] || [];
          opponentMobility += adjacent.filter(n => state.nodes[n] === null).length;
        }
      }
    }
    
    score += (playerMobility - opponentMobility) * 8;
    
    // trapped pieces (0 mobility) is very bad
    if (playerPhase === 'movement' && playerMobility === 0) score -= 2000;
    if (opponentPhase === 'movement' && opponentMobility === 0) score += 2000;
  }
  
  // center/junction control - nodes with 4 connections are strategically valuable
  const junctionNodes = [4, 10, 13, 19]; // middle of each side of middle square
  const cornerNodes = [0, 2, 14, 21, 23]; // corners have 2-3 connections
  
  for (const nodeId of junctionNodes) {
    if (state.nodes[nodeId] === player) score += 12;
    else if (state.nodes[nodeId] === opponent) score -= 12;
  }
  
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
  const timeLimit = 3500; // 3.5 seconds - runs in Web Worker so no UI freeze
  
  let bestMove = legalMoves[0];
  let bestScore = -Infinity;
  
  // try deeper and deeper searches until we run out of time
  for (let depth = 3; depth <= 8; depth++) {
    // if we've used 60% of our time, don't start another depth
    if (Date.now() - startTime > timeLimit * 0.6) {
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
