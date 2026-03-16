/*
 * engine-bundle.js
 * 
 * This file bundles all the engine modules into one browser-friendly script.
 * Since the engine uses CommonJS (require/module.exports) and we're loading
 * scripts in the browser with plain <script> tags, we need this wrapper.
 * 
 * Everything gets attached to window.MorabarabaEngine so the game controller
 * can access it.
 * 
 * NOTE: This is a manual bundle - if the engine files change, this needs
 * to be updated too. A real project would use a bundler like webpack,
 * but this works fine for our assignment.
 */

(function() {
  "use strict";

  // ============================================================
  // constants.js - Board layout and game variants
  // ============================================================

  /*
   * The Morabaraba board has 24 positions (nodes) arranged in 3 squares
   * connected by lines. Here's how the numbering works:
   *
   * 0-----------1-----------2
   * |           |           |
   * |   3-------4-------5   |
   * |   |       |       |   |
   * |   |   6---7---8   |   |
   * |   |   |       |   |   |
   * 9---10--11      12--13--14
   * |   |   |       |   |   |
   * |   |   15--16--17  |   |
   * |   |       |       |   |
   * |   18------19-----20   |
   * |           |           |
   * 21---------22----------23
   */

  const STANDARD_ADJACENCY = {
    "0": [1, 3, 9],
    "1": [0, 2, 4],
    "2": [1, 5, 14],
    "3": [0, 4, 6, 10],
    "4": [1, 3, 5, 7],
    "5": [2, 4, 8, 13],
    "6": [3, 7, 11],
    "7": [4, 6, 8],
    "8": [5, 7, 12],
    "9": [0, 10, 21],
    "10": [3, 9, 11, 18],
    "11": [6, 10, 15],
    "12": [8, 13, 17],
    "13": [5, 12, 14, 20],
    "14": [2, 13, 23],
    "15": [11, 16, 18],
    "16": [15, 17, 19],
    "17": [12, 16, 20],
    "18": [10, 15, 19, 21],
    "19": [16, 18, 20, 22],
    "20": [13, 17, 19, 23],
    "21": [9, 18, 22],
    "22": [19, 21, 23],
    "23": [14, 20, 22]
  };

  const STANDARD_MILLS = [
    [0, 1, 2], [0, 9, 21], [2, 14, 23], [21, 22, 23],
    [3, 4, 5], [3, 10, 18], [5, 13, 20], [18, 19, 20],
    [6, 7, 8], [6, 11, 15], [8, 12, 17], [15, 16, 17],
    [1, 4, 7], [9, 10, 11], [12, 13, 14], [16, 19, 22],
    [0, 3, 6], [2, 5, 8], [21, 18, 15], [23, 20, 17]
  ];

  const VARIANTS = {
    '12-cow': { name: '12-cow', startingCows: 12, adjacency: STANDARD_ADJACENCY, mills: STANDARD_MILLS },
    '9-cow':  { name: '9-cow',  startingCows: 9,  adjacency: STANDARD_ADJACENCY, mills: STANDARD_MILLS },
    '6-cow':  { name: '6-cow',  startingCows: 6,  adjacency: STANDARD_ADJACENCY, mills: STANDARD_MILLS }
  };

  const BOARD_SIZE = 24;

  // ============================================================
  // state.js - Game state creation and helpers
  // ============================================================

  function createGame(variantName) {
    const variant = VARIANTS[variantName];
    if (!variant) {
      throw new Error("Invalid variant: " + variantName);
    }
    const startingCows = variant.startingCows;
    return {
      nodes: Array(BOARD_SIZE).fill(null),
      currentPlayer: 'white',
      phase: { white: 'placement', black: 'placement' },
      cowsToPlace: { white: startingCows, black: startingCows },
      cowsCaptured: { white: 0, black: 0 },
      capturePending: 0,
      mills: [],
      winner: null,
      winReason: null,
      variant: variantName
    };
  }

  function countCowsOnBoard(state, player) {
    return state.nodes.filter(function(n) { return n === player; }).length;
  }

  function getPhase(state, player) {
    if (state.cowsToPlace[player] > 0) return 'placement';
    var onBoard = countCowsOnBoard(state, player);
    if (onBoard > 3) return 'movement';
    return 'flying';
  }

  function getOpponent(player) {
    return player === 'white' ? 'black' : 'white';
  }

  // ============================================================
  // mills.js - Mill detection
  // ============================================================

  function asNum(x) {
    var n = Number(x);
    return Number.isFinite(n) ? n : x;
  }

  function normalizeMill(nodes) {
    return nodes.slice().sort(function(a, b) { return a - b; }).join('-');
  }

  function getMills(state) {
    var mills = [];
    for (var i = 0; i < STANDARD_MILLS.length; i++) {
      var n1 = STANDARD_MILLS[i][0], n2 = STANDARD_MILLS[i][1], n3 = STANDARD_MILLS[i][2];
      var player = state.nodes[n1];
      if (player && state.nodes[n2] === player && state.nodes[n3] === player) {
        mills.push({ nodes: [n1, n2, n3], player: player });
      }
    }
    return mills;
  }

  function isInMill(state, nodeId) {
    var id = asNum(nodeId);
    var player = state.nodes[id];
    if (player === null) return false;
    for (var i = 0; i < STANDARD_MILLS.length; i++) {
      var n1 = STANDARD_MILLS[i][0], n2 = STANDARD_MILLS[i][1], n3 = STANDARD_MILLS[i][2];
      if (n1 !== id && n2 !== id && n3 !== id) continue;
      if (state.nodes[n1] === player && state.nodes[n2] === player && state.nodes[n3] === player) {
        return true;
      }
    }
    return false;
  }

  function getMillsContainingNode(state, nodeId) {
    var id = asNum(nodeId);
    var res = [];
    for (var i = 0; i < STANDARD_MILLS.length; i++) {
      var n1 = STANDARD_MILLS[i][0], n2 = STANDARD_MILLS[i][1], n3 = STANDARD_MILLS[i][2];
      if (n1 !== id && n2 !== id && n3 !== id) continue;
      var player = state.nodes[n1];
      if (player && state.nodes[n2] === player && state.nodes[n3] === player) {
        res.push({ nodes: [n1, n2, n3], player: player });
      }
    }
    return res;
  }

  function detectNewMills(prevState, newState, movedNode) {
    var id = asNum(movedNode);
    var prev = getMills(prevState);
    var prevSet = {};
    for (var i = 0; i < prev.length; i++) {
      prevSet[prev[i].player + ':' + normalizeMill(prev[i].nodes)] = true;
    }
    var nowAtNode = getMillsContainingNode(newState, id);
    return nowAtNode.filter(function(m) {
      return !prevSet[m.player + ':' + normalizeMill(m.nodes)];
    });
  }

  // ============================================================
  // moves.js - Legal move generation
  // ============================================================

  function getAdjacent(nodeId) {
    var id = Number(nodeId);
    return STANDARD_ADJACENCY[id] || STANDARD_ADJACENCY[String(id)] || [];
  }

  function getLegalPlacements(state) {
    if (state.winner !== null || state.capturePending > 0) return [];
    if (getPhase(state, state.currentPlayer) !== 'placement') return [];
    var empty = [];
    for (var i = 0; i < BOARD_SIZE; i++) {
      if (state.nodes[i] === null) empty.push(i);
    }
    return empty;
  }

  function getLegalSlides(state, fromNode) {
    var from = Number(fromNode);
    if (state.winner !== null || state.capturePending > 0) return [];
    if (getPhase(state, state.currentPlayer) !== 'movement') return [];
    if (state.nodes[from] !== state.currentPlayer) return [];
    return getAdjacent(from).filter(function(n) { return state.nodes[n] === null; });
  }

  function getAllLegalSlides(state) {
    if (state.winner !== null || state.capturePending > 0) return [];
    if (getPhase(state, state.currentPlayer) !== 'movement') return [];
    var all = [];
    for (var i = 0; i < BOARD_SIZE; i++) {
      if (state.nodes[i] === state.currentPlayer) {
        var dests = getLegalSlides(state, i);
        for (var j = 0; j < dests.length; j++) {
          all.push({ from: i, to: Number(dests[j]) });
        }
      }
    }
    return all;
  }

  function getLegalFlying(state, fromNode) {
    var from = Number(fromNode);
    if (state.winner !== null || state.capturePending > 0) return [];
    if (getPhase(state, state.currentPlayer) !== 'flying') return [];
    if (state.nodes[from] !== state.currentPlayer) return [];
    var empty = [];
    for (var i = 0; i < BOARD_SIZE; i++) {
      if (state.nodes[i] === null) empty.push(i);
    }
    return empty;
  }

  function getAllLegalFlying(state) {
    if (state.winner !== null || state.capturePending > 0) return [];
    if (getPhase(state, state.currentPlayer) !== 'flying') return [];
    var all = [];
    for (var i = 0; i < BOARD_SIZE; i++) {
      if (state.nodes[i] === state.currentPlayer) {
        var dests = getLegalFlying(state, i);
        for (var j = 0; j < dests.length; j++) {
          all.push({ from: i, to: dests[j] });
        }
      }
    }
    return all;
  }

  function getLegalCaptures(state) {
    if (state.winner !== null || state.capturePending <= 0) return [];
    var opponent = getOpponent(state.currentPlayer);
    var opCows = [];
    for (var i = 0; i < BOARD_SIZE; i++) {
      if (state.nodes[i] === opponent) opCows.push(i);
    }
    var notInMill = opCows.filter(function(n) { return !isInMill(state, n); });
    return notInMill.length > 0 ? notInMill : opCows;
  }

  function getLegalMoves(state) {
    if (state.winner !== null) return [];
    var cp = state.currentPlayer;
    if (state.capturePending > 0) {
      return getLegalCaptures(state).map(function(t) {
        return { type: 'capture', player: cp, target: t };
      });
    }
    var phase = getPhase(state, cp);
    if (phase === 'placement') {
      return getLegalPlacements(state).map(function(n) {
        return { type: 'placement', player: cp, node: n };
      });
    }
    if (phase === 'movement') {
      return getAllLegalSlides(state).map(function(s) {
        return { type: 'slide', player: cp, from: s.from, to: s.to };
      });
    }
    if (phase === 'flying') {
      return getAllLegalFlying(state).map(function(s) {
        return { type: 'slide', player: cp, from: s.from, to: s.to };
      });
    }
    return [];
  }

  // ============================================================
  // apply.js - Applying moves to the game state (immutable)
  // ============================================================

  function copyState(state) {
    return {
      nodes: state.nodes.slice(),
      currentPlayer: state.currentPlayer,
      phase: { white: state.phase.white, black: state.phase.black },
      cowsToPlace: { white: state.cowsToPlace.white, black: state.cowsToPlace.black },
      cowsCaptured: { white: state.cowsCaptured.white, black: state.cowsCaptured.black },
      capturePending: state.capturePending,
      mills: state.mills.map(function(m) { return { nodes: m.nodes.slice(), player: m.player }; }),
      winner: state.winner,
      winReason: state.winReason,
      variant: state.variant
    };
  }

  function createError(code, message) {
    return { error: true, code: code, message: message };
  }

  function applyPlacement(state, nodeId) {
    var cp = state.currentPlayer;
    if (state.winner !== null) return createError('GAME_OVER', 'Game is over');
    if (state.capturePending > 0) return createError('CAPTURE_REQUIRED', 'Must capture first');
    if (getPhase(state, cp) !== 'placement') return createError('NOT_YOUR_TURN', cp + ' not in placement');
    if (typeof nodeId !== 'number' || nodeId < 0 || nodeId > 23 || !Number.isInteger(nodeId))
      return createError('INVALID_PLACEMENT', 'Bad node ID: ' + nodeId);
    if (state.nodes[nodeId] !== null) return createError('INVALID_PLACEMENT', 'Node ' + nodeId + ' occupied');

    var ns = copyState(state);
    ns.nodes[nodeId] = cp;
    ns.cowsToPlace[cp]--;
    if (ns.cowsToPlace[cp] === 0) {
      ns.phase[cp] = countCowsOnBoard(ns, cp) <= 3 ? 'flying' : 'movement';
    }
    var newMills = detectNewMills(state, ns, nodeId);
    ns.mills = getMills(ns);
    if (newMills.length > 0) {
      ns.capturePending += newMills.length;
    } else {
      ns.currentPlayer = getOpponent(cp);
      var win = checkWinCondition(ns);
      if (win) { ns.winner = win.winner; ns.winReason = win.reason; }
    }
    return ns;
  }

  function applySlide(state, from, to) {
    var cp = state.currentPlayer;
    if (state.winner !== null) return createError('GAME_OVER', 'Game is over');
    if (state.capturePending > 0) return createError('CAPTURE_REQUIRED', 'Must capture first');
    var phase = getPhase(state, cp);
    if (phase !== 'movement' && phase !== 'flying') return createError('NOT_YOUR_TURN', cp + ' not in move/fly');
    if (typeof from !== 'number' || from < 0 || from > 23) return createError('INVALID_MOVE', 'Bad from');
    if (typeof to !== 'number' || to < 0 || to > 23) return createError('INVALID_MOVE', 'Bad to');
    if (state.nodes[from] !== cp) return createError('INVALID_MOVE', 'Not your cow');
    if (state.nodes[to] !== null) return createError('INVALID_MOVE', 'Destination occupied');
    if (phase === 'movement') {
      var adj = STANDARD_ADJACENCY[from] || STANDARD_ADJACENCY[String(from)] || [];
      if (adj.indexOf(to) === -1) return createError('INVALID_MOVE', 'Not adjacent');
    }

    var ns = copyState(state);
    ns.nodes[from] = null;
    ns.nodes[to] = cp;
    var newMills = detectNewMills(state, ns, to);
    ns.mills = getMills(ns);
    if (newMills.length > 0) {
      ns.capturePending += newMills.length;
    } else {
      ns.currentPlayer = getOpponent(cp);
      var win = checkWinCondition(ns);
      if (win) { ns.winner = win.winner; ns.winReason = win.reason; }
    }
    return ns;
  }

  function applyCapture(state, targetNode) {
    var cp = state.currentPlayer;
    var opp = getOpponent(cp);
    if (state.winner !== null) return createError('GAME_OVER', 'Game is over');
    if (state.capturePending <= 0) return createError('INVALID_CAPTURE', 'No capture pending');
    if (typeof targetNode !== 'number' || targetNode < 0 || targetNode > 23)
      return createError('INVALID_CAPTURE', 'Bad target');
    if (state.nodes[targetNode] !== opp) return createError('INVALID_CAPTURE', 'Not opponent cow');
    var legal = getLegalCaptures(state);
    if (legal.indexOf(targetNode) === -1) return createError('INVALID_CAPTURE', 'Cow in mill, others available');

    var ns = copyState(state);
    ns.nodes[targetNode] = null;
    ns.capturePending--;
    ns.cowsCaptured[cp]++;
    ns.mills = getMills(ns);
    var oppOnBoard = countCowsOnBoard(ns, opp);
    var oppToPlace = ns.cowsToPlace[opp];
    if (oppToPlace === 0 && oppOnBoard === 3) ns.phase[opp] = 'flying';
    if (oppToPlace === 0 && oppOnBoard < 3) {
      ns.winner = cp; ns.winReason = 'opponent_below_three'; return ns;
    }
    if (ns.capturePending === 0) {
      ns.currentPlayer = opp;
      var win = checkWinCondition(ns);
      if (win) { ns.winner = win.winner; ns.winReason = win.reason; }
    }
    return ns;
  }

  function applyMove(state, move) {
    if (!move || typeof move !== 'object') return createError('INVALID_MOVE', 'Move must be object');
    if (['placement','slide','capture'].indexOf(move.type) === -1)
      return createError('INVALID_MOVE', 'Bad move type: ' + move.type);
    if (move.player !== state.currentPlayer)
      return createError('NOT_YOUR_TURN', 'It is ' + state.currentPlayer + "'s turn");
    switch (move.type) {
      case 'placement': return applyPlacement(state, Number(move.node));
      case 'slide': return applySlide(state, Number(move.from), Number(move.to));
      case 'capture': return applyCapture(state, Number(move.target));
    }
  }

  // ============================================================
  // win.js - Win condition checking
  // ============================================================

  function isPlacementComplete(state, player) {
    return state.cowsToPlace[player] === 0;
  }

  function checkWinCondition(state) {
    if (state.winner !== null) return { winner: state.winner, reason: state.winReason };
    var cp = state.currentPlayer;
    var opp = getOpponent(cp);
    var cpOnBoard = countCowsOnBoard(state, cp);
    if (isPlacementComplete(state, cp) && isPlacementComplete(state, opp) && cpOnBoard < 3) {
      return { winner: opp, reason: 'opponent_below_three' };
    }
    if (state.capturePending === 0) {
      if (getLegalMoves(state).length === 0) {
        return { winner: opp, reason: 'opponent_no_moves' };
      }
    }
    return null;
  }

  // ============================================================
  // ai.js - Computer opponents (Easy, Medium, Hard)
  // ============================================================

  function selectMoveEasy(state) {
    var moves = getLegalMoves(state);
    if (moves.length === 0) return null;
    return moves[Math.floor(Math.random() * moves.length)];
  }

  function evaluateMoveMedium(state, move) {
    var score = 0;
    var ns = applyMove(state, move);
    if (ns.error) return -1000;
    var cp = state.currentPlayer;
    var opp = getOpponent(cp);
    if (move.type === 'placement') {
      if (detectNewMills(state, ns, move.node).length > 0) score += 10;
    } else if (move.type === 'slide') {
      if (detectNewMills(state, ns, move.to).length > 0) score += 10;
    }
    if (move.type === 'capture') score += 8;
    if (move.type === 'placement' || move.type === 'slide') {
      var target = move.type === 'placement' ? move.node : move.to;
      for (var i = 0; i < STANDARD_MILLS.length; i++) {
        var md = STANDARD_MILLS[i];
        if (md.indexOf(target) !== -1) {
          var oc = 0, ec = 0;
          for (var j = 0; j < 3; j++) {
            if (state.nodes[md[j]] === opp) oc++;
            else if (state.nodes[md[j]] === null) ec++;
          }
          if (oc === 2 && ec === 1) score += 5;
        }
      }
    }
    score += Math.random();
    return score;
  }

  function selectMoveMedium(state) {
    var moves = getLegalMoves(state);
    if (moves.length === 0) return null;
    var best = null, bestScore = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var s = evaluateMoveMedium(state, moves[i]);
      if (s > bestScore) { bestScore = s; best = moves[i]; }
    }
    return best;
  }

  function evaluateState(state, player) {
    var opp = getOpponent(player);
    if (state.winner === player) return 10000;
    if (state.winner === opp) return -10000;
    var score = 0;
    var pCows = countCowsOnBoard(state, player);
    var oCows = countCowsOnBoard(state, opp);
    score += (pCows + state.cowsToPlace[player] - oCows - state.cowsToPlace[opp]) * 100;
    var mills = getMills(state);
    var pm = 0, om = 0;
    for (var i = 0; i < mills.length; i++) {
      if (mills[i].player === player) pm++; else om++;
    }
    score += (pm - om) * 30;
    // potential mills
    for (var i = 0; i < STANDARD_MILLS.length; i++) {
      var md = STANDARD_MILLS[i], pc2 = 0, oc2 = 0, empty = 0;
      for (var j = 0; j < 3; j++) {
        if (state.nodes[md[j]] === player) pc2++;
        else if (state.nodes[md[j]] === opp) oc2++;
        else empty++;
      }
      if (pc2 === 2 && empty === 1) score += 15;
      if (oc2 === 2 && empty === 1) score -= 15;
    }
    return score;
  }

  function minimax(state, depth, alpha, beta, maximizing, aiPlayer, startTime, timeLimit) {
    if (Date.now() - startTime > timeLimit) return { score: evaluateState(state, aiPlayer), timedOut: true };
    if (depth === 0 || state.winner !== null) return { score: evaluateState(state, aiPlayer), timedOut: false };
    var moves = getLegalMoves(state);
    if (moves.length === 0) return { score: evaluateState(state, aiPlayer), timedOut: false };

    if (maximizing) {
      var maxS = -Infinity;
      for (var i = 0; i < moves.length; i++) {
        var ns = applyMove(state, moves[i]);
        if (ns.error) continue;
        var r = minimax(ns, depth - 1, alpha, beta, false, aiPlayer, startTime, timeLimit);
        if (r.timedOut) return { score: maxS === -Infinity ? r.score : maxS, timedOut: true };
        if (r.score > maxS) maxS = r.score;
        if (maxS > alpha) alpha = maxS;
        if (beta <= alpha) break;
      }
      return { score: maxS, timedOut: false };
    } else {
      var minS = Infinity;
      for (var i = 0; i < moves.length; i++) {
        var ns = applyMove(state, moves[i]);
        if (ns.error) continue;
        var r = minimax(ns, depth - 1, alpha, beta, true, aiPlayer, startTime, timeLimit);
        if (r.timedOut) return { score: minS === Infinity ? r.score : minS, timedOut: true };
        if (r.score < minS) minS = r.score;
        if (minS < beta) beta = minS;
        if (beta <= alpha) break;
      }
      return { score: minS, timedOut: false };
    }
  }

  function selectMoveHard(state) {
    var moves = getLegalMoves(state);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];
    var aiPlayer = state.currentPlayer;
    var startTime = Date.now(), timeLimit = 1800;
    var bestMove = moves[0], bestScore = -Infinity;
    for (var depth = 3; depth <= 5; depth++) {
      if (Date.now() - startTime > timeLimit * 0.7) break;
      var cbm = moves[0], cbs = -Infinity, timedOut = false;
      for (var i = 0; i < moves.length; i++) {
        var ns = applyMove(state, moves[i]);
        if (ns.error) continue;
        var isMax = ns.currentPlayer === aiPlayer;
        var r = minimax(ns, depth - 1, -Infinity, Infinity, isMax, aiPlayer, startTime, timeLimit);
        if (r.timedOut) { timedOut = true; break; }
        if (r.score > cbs) { cbs = r.score; cbm = moves[i]; }
      }
      if (!timedOut) { bestMove = cbm; bestScore = cbs; } else break;
    }
    return bestMove;
  }

  // ============================================================
  // Public API - expose everything the game controller needs
  // ============================================================

  window.MorabarabaEngine = {
    // state
    createGame: createGame,
    getPhase: getPhase,
    getOpponent: getOpponent,
    countCowsOnBoard: countCowsOnBoard,
    // moves
    getLegalMoves: getLegalMoves,
    getLegalCaptures: getLegalCaptures,
    getAdjacent: getAdjacent,
    // apply
    applyMove: applyMove,
    // mills
    getMills: getMills,
    isInMill: isInMill,
    // win
    checkWinCondition: checkWinCondition,
    // ai
    selectMoveEasy: selectMoveEasy,
    selectMoveMedium: selectMoveMedium,
    selectMoveHard: selectMoveHard,
    // constants (useful for the controller)
    STANDARD_ADJACENCY: STANDARD_ADJACENCY,
    BOARD_SIZE: BOARD_SIZE
  };

})();
