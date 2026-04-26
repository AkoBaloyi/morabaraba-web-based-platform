// engine-server.js - Same logic as client's engine-bundle.js
const STANDARD_ADJACENCY = {
  0: [1, 3, 9],
  1: [0, 2, 4],
  2: [1, 5, 14],
  3: [0, 4, 6, 10],
  4: [1, 3, 5, 7],
  5: [2, 4, 8, 13],
  6: [3, 7, 11],
  7: [4, 6, 8],
  8: [5, 7, 12],
  9: [0, 10, 21],
  10: [3, 9, 11, 18],
  11: [6, 10, 15],
  12: [8, 13, 17],
  13: [5, 12, 14, 20],
  14: [2, 13, 23],
  15: [11, 16, 18],
  16: [15, 17, 19],
  17: [12, 16, 20],
  18: [10, 15, 19, 21],
  19: [16, 18, 20, 22],
  20: [13, 17, 19, 23],
  21: [9, 18, 22],
  22: [19, 21, 23],
  23: [14, 20, 22],
};

const STANDARD_MILLS = [
  [0, 1, 2],
  [0, 9, 21],
  [2, 14, 23],
  [21, 22, 23],
  [3, 4, 5],
  [3, 10, 18],
  [5, 13, 20],
  [18, 19, 20],
  [6, 7, 8],
  [6, 11, 15],
  [8, 12, 17],
  [15, 16, 17],
  [1, 4, 7],
  [9, 10, 11],
  [12, 13, 14],
  [16, 19, 22],
  [0, 3, 6],
  [2, 5, 8],
  [21, 18, 15],
  [23, 20, 17],
];

const BOARD_SIZE = 24;

function createGame(variantName = "12-cow") {
  // need to include phase, mills, variant to match the client engine state shape
  return {
    nodes: Array(BOARD_SIZE).fill(null),
    currentPlayer: "white",
    phase: { white: "placement", black: "placement" },
    cowsToPlace: { white: 12, black: 12 },
    cowsCaptured: { white: 0, black: 0 },
    capturePending: 0,
    mills: [],
    winner: null,
    winReason: null,
    variant: variantName,
  };
}

function getOpponent(player) {
  return player === "white" ? "black" : "white";
}

function countCowsOnBoard(state, player) {
  return state.nodes.filter((n) => n === player).length;
}

function getPhase(state, player) {
  if (state.cowsToPlace[player] > 0) return "placement";
  const onBoard = countCowsOnBoard(state, player);
  if (onBoard > 3) return "movement";
  return "flying";
}

function getAdjacent(nodeId) {
  return STANDARD_ADJACENCY[nodeId] || [];
}

function getMills(state) {
  const mills = [];
  for (const mill of STANDARD_MILLS) {
    const player = state.nodes[mill[0]];
    if (
      player &&
      state.nodes[mill[1]] === player &&
      state.nodes[mill[2]] === player
    ) {
      mills.push({ nodes: mill, player: player });
    }
  }
  return mills;
}

function isInMill(state, nodeId) {
  const player = state.nodes[nodeId];
  if (!player) return false;
  for (const mill of STANDARD_MILLS) {
    if (mill.includes(nodeId)) {
      if (
        state.nodes[mill[0]] === player &&
        state.nodes[mill[1]] === player &&
        state.nodes[mill[2]] === player
      ) {
        return true;
      }
    }
  }
  return false;
}

function getLegalCaptures(state) {
  if (state.capturePending <= 0) return [];
  const opponent = getOpponent(state.currentPlayer);
  const opponentNodes = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (state.nodes[i] === opponent) opponentNodes.push(i);
  }
  const notInMill = opponentNodes.filter((n) => !isInMill(state, n));
  return notInMill.length > 0 ? notInMill : opponentNodes;
}

// compares mills before and after a move to find only the NEW ones
function detectNewMills(oldState, newState, movedNode) {
  const player = newState.nodes[movedNode];
  if (!player) return [];

  // get mills that existed before the move
  const oldMillKeys = {};
  for (const mill of STANDARD_MILLS) {
    const p = oldState.nodes[mill[0]];
    if (p && oldState.nodes[mill[1]] === p && oldState.nodes[mill[2]] === p) {
      oldMillKeys[mill.join("-")] = true;
    }
  }

  // find mills at the moved node that didnt exist before
  const newMills = [];
  for (const mill of STANDARD_MILLS) {
    if (!mill.includes(movedNode)) continue;
    if (
      newState.nodes[mill[0]] === player &&
      newState.nodes[mill[1]] === player &&
      newState.nodes[mill[2]] === player
    ) {
      if (!oldMillKeys[mill.join("-")]) {
        newMills.push(mill);
      }
    }
  }
  return newMills;
}

function copyState(state) {
  return JSON.parse(JSON.stringify(state));
}

// checks if someone won - either opponent has < 3 cows or cant move
function checkWinCondition(state) {
  if (state.winner) return { winner: state.winner, reason: state.winReason };
  const cp = state.currentPlayer;
  const opp = getOpponent(cp);

  // check if current player has less than 3 cows (after both done placing)
  if (state.cowsToPlace[cp] === 0 && state.cowsToPlace[opp] === 0) {
    if (countCowsOnBoard(state, cp) < 3) {
      return { winner: opp, reason: "opponent_below_three" };
    }
  }

  // check if current player is stuck with no moves
  if (state.capturePending === 0) {
    const moves = getLegalMoves(state);
    if (moves.length === 0) {
      return { winner: opp, reason: "opponent_no_moves" };
    }
  }
  return null;
}

// gets all legal moves for the current player
function getLegalMoves(state) {
  if (state.winner) return [];
  const cp = state.currentPlayer;

  if (state.capturePending > 0) {
    return getLegalCaptures(state).map((t) => ({
      type: "capture", player: cp, target: t,
    }));
  }

  const phase = getPhase(state, cp);

  if (phase === "placement") {
    const moves = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (state.nodes[i] === null) moves.push({ type: "placement", player: cp, node: i });
    }
    return moves;
  }

  if (phase === "movement") {
    const moves = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (state.nodes[i] !== cp) continue;
      for (const adj of getAdjacent(i)) {
        if (state.nodes[adj] === null) moves.push({ type: "slide", player: cp, from: i, to: adj });
      }
    }
    return moves;
  }

  if (phase === "flying") {
    const moves = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (state.nodes[i] !== cp) continue;
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (state.nodes[j] === null) moves.push({ type: "slide", player: cp, from: i, to: j });
      }
    }
    return moves;
  }

  return [];
}

function applyPlacement(state, nodeId) {
  const cp = state.currentPlayer;
  if (state.winner) return { error: true, message: "Game is over" };
  if (state.capturePending > 0)
    return { error: true, message: "Must capture first" };
  if (getPhase(state, cp) !== "placement")
    return { error: true, message: "Not in placement phase" };
  if (nodeId < 0 || nodeId > 23)
    return { error: true, message: "Invalid node" };
  if (state.nodes[nodeId] !== null)
    return { error: true, message: "Position occupied" };

  const ns = copyState(state);
  ns.nodes[nodeId] = cp;
  ns.cowsToPlace[cp]--;

  // update phase if done placing
  if (ns.cowsToPlace[cp] === 0) {
    ns.phase[cp] = countCowsOnBoard(ns, cp) <= 3 ? "flying" : "movement";
  }

  const newMills = detectNewMills(state, ns, nodeId);
  ns.mills = getMills(ns);

  if (newMills.length > 0) {
    ns.capturePending += newMills.length;
  } else {
    ns.currentPlayer = getOpponent(cp);
    const win = checkWinCondition(ns);
    if (win) { ns.winner = win.winner; ns.winReason = win.reason; }
  }
  return ns;
}

function applySlide(state, from, to) {
  const cp = state.currentPlayer;
  if (state.winner) return { error: true, message: "Game is over" };
  if (state.capturePending > 0)
    return { error: true, message: "Must capture first" };
  const phase = getPhase(state, cp);
  if (phase !== "movement" && phase !== "flying")
    return { error: true, message: "Not in movement/flying phase" };
  if (state.nodes[from] !== cp) return { error: true, message: "Not your cow" };
  if (state.nodes[to] !== null)
    return { error: true, message: "Destination occupied" };
  if (phase === "movement") {
    const adj = getAdjacent(from);
    if (!adj.includes(to)) return { error: true, message: "Not adjacent" };
  }

  const ns = copyState(state);
  ns.nodes[from] = null;
  ns.nodes[to] = cp;

  const newMills = detectNewMills(state, ns, to);
  ns.mills = getMills(ns);

  if (newMills.length > 0) {
    ns.capturePending += newMills.length;
  } else {
    ns.currentPlayer = getOpponent(cp);
    const win = checkWinCondition(ns);
    if (win) { ns.winner = win.winner; ns.winReason = win.reason; }
  }
  return ns;
}

function applyCapture(state, targetNode) {
  const cp = state.currentPlayer;
  const opp = getOpponent(cp);
  if (state.winner) return { error: true, message: "Game is over" };
  if (state.capturePending <= 0)
    return { error: true, message: "No capture pending" };
  if (state.nodes[targetNode] !== opp)
    return { error: true, message: "Not opponent cow" };

  const legalCaptures = getLegalCaptures(state);
  if (!legalCaptures.includes(targetNode))
    return { error: true, message: "Cannot capture this cow (in mill)" };

  const ns = copyState(state);
  ns.nodes[targetNode] = null;
  ns.capturePending--;
  ns.cowsCaptured[cp]++;
  ns.mills = getMills(ns);

  const oppOnBoard = countCowsOnBoard(ns, opp);
  const oppToPlace = ns.cowsToPlace[opp];

  // check if opponent drops to flying
  if (oppToPlace === 0 && oppOnBoard === 3) {
    ns.phase[opp] = "flying";
  }

  // opponent eliminated
  if (oppToPlace === 0 && oppOnBoard < 3) {
    ns.winner = cp;
    ns.winReason = "opponent_below_three";
    return ns;
  }

  // if done capturing, switch turns and check if opponent can move
  if (ns.capturePending === 0) {
    ns.currentPlayer = opp;
    const win = checkWinCondition(ns);
    if (win) { ns.winner = win.winner; ns.winReason = win.reason; }
  }
  return ns;
}

function applyMove(state, move) {
  if (move.type === "placement") {
    return applyPlacement(state, move.node);
  } else if (move.type === "slide") {
    return applySlide(state, move.from, move.to);
  } else if (move.type === "capture") {
    return applyCapture(state, move.target);
  }
  return { error: true, message: "Unknown move type" };
}

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
