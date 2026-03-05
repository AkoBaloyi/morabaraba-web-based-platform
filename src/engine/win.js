/*
 * win.js - Win condition checking
 *
 * Two ways to win:
 * 1. Get the opponent down to less than 3 cows (after placement is done)
 * 2. Block all the opponent's cows so they can't move
 */

const { countCowsOnBoard, getOpponent } = require('./state');
const { getLegalMoves } = require('./moves');

// Checks if a player has finished placing all their cows
function isPlacementComplete(state, player) {
  return state.cowsToPlace[player] === 0;
}

// Checks if BOTH players are done placing
function isBothPlayersPlacementComplete(state) {
  return isPlacementComplete(state, 'white') && isPlacementComplete(state, 'black');
}

// The main win condition checker
// Call this after every move to see if someone won
//
// Returns { winner, reason } or null if game is still going
// reason is either 'opponent_below_three' or 'opponent_no_moves'
function checkWinCondition(state) {
  // if there's already a winner, just return that
  if (state.winner !== null) {
    return {
      winner: state.winner,
      reason: state.winReason
    };
  }
  
  const currentPlayer = state.currentPlayer;
  const opponent = getOpponent(currentPlayer);
  
  // check if current player has less than 3 cows (meaning opponent wins)
  // only counts after both players finished placing
  const opponentCowsOnBoard = countCowsOnBoard(state, currentPlayer);
  const opponentPlacementComplete = isPlacementComplete(state, currentPlayer);
  const otherPlayerPlacementComplete = isPlacementComplete(state, opponent);
  
  if (opponentPlacementComplete && otherPlayerPlacementComplete && opponentCowsOnBoard < 3) {
    return {
      winner: opponent,
      reason: 'opponent_below_three'
    };
  }
  
  // check if current player has no legal moves (they're stuck)
  // only check when there's no capture pending
  if (state.capturePending === 0) {
    const legalMoves = getLegalMoves(state);
    
    if (legalMoves.length === 0) {
      // current player can't move, so the other player wins
      return {
        winner: opponent,
        reason: 'opponent_no_moves'
      };
    }
  }
  
  // nobody won yet
  return null;
}

module.exports = {
  checkWinCondition,
  isPlacementComplete,
  isBothPlayersPlacementComplete
};
