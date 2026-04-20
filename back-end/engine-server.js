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
  return {
    nodes: Array(BOARD_SIZE).fill(null),
    currentPlayer: "white",
    cowsToPlace: { white: 12, black: 12 },
    cowsCaptured: { white: 0, black: 0 },
    capturePending: 0,
    winner: null,
    winReason: null,
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

function detectNewMills(state, movedNode) {
  const player = state.nodes[movedNode];
  if (!player) return [];
  const newMills = [];
  for (const mill of STANDARD_MILLS) {
    if (mill.includes(movedNode)) {
      if (
        state.nodes[mill[0]] === player &&
        state.nodes[mill[1]] === player &&
        state.nodes[mill[2]] === player
      ) {
        newMills.push(mill);
      }
    }
  }
  return newMills;
}

function copyState(state) {
  return JSON.parse(JSON.stringify(state));
}

function applyPlacement(state, nodeId) {
  const cp = state.currentPlayer;
  if (state.winner) return { error: true, message: "Game is over" };
  if (state.capturePending > 0)
    return { error: true, message: "Must capture first" };
  if (getPhase(state, cp) !== "placement")
    return { error: true, message: "Not in placement phase" };
  if (state.nodes[nodeId] !== null)
    return { error: true, message: "Position occupied" };

  const ns = copyState(state);
  ns.nodes[nodeId] = cp;
  ns.cowsToPlace[cp]--;

  const newMills = detectNewMills(ns, nodeId);
  if (newMills.length > 0) {
    ns.capturePending += newMills.length;
  } else {
    ns.currentPlayer = getOpponent(cp);
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

  const newMills = detectNewMills(ns, to);
  if (newMills.length > 0) {
    ns.capturePending += newMills.length;
  } else {
    ns.currentPlayer = getOpponent(cp);
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

  const oppOnBoard = countCowsOnBoard(ns, opp);
  if (oppOnBoard < 3) {
    ns.winner = cp;
    ns.winReason = "opponent_below_three";
    return ns;
  }

  if (ns.capturePending === 0) {
    ns.currentPlayer = opp;
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
  getAdjacent,
  getMills,
  isInMill,
  BOARD_SIZE,
};
