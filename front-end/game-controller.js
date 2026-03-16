/*
 * game-controller.js
 * 
 * This is the bridge between the Canvas UI and the engine.
 * It handles:
 *   - Mapping pixel coordinates to engine node IDs (0-23)
 *   - Translating clicks into engine move objects
 *   - Drawing the board from engine state
 *   - Handling all game phases (placement, movement, flying, capture)
 *   - Running AI moves for Easy/Medium/Hard modes
 *   - Showing game info (current player, phase, cows left, game over)
 *
 * The game mode is set by the HTML page via a global variable:
 *   window.GAME_MODE = 'human' | 'easy' | 'medium' | 'hard'
 *
 * This file expects engine-bundle.js to be loaded first so that
 * window.MorabarabaEngine is available.
 */

// Grab the engine from the global
var Engine = window.MorabarabaEngine;

// ============================================================
// NODE MAP - Maps engine node IDs (0-23) to canvas pixel positions
// This is the critical bridge between the engine and the UI.
//
// The board is drawn on a 600x600 canvas with 3 concentric squares:
//   Outer square: starts at (100,100), size 400
//   Middle square: starts at (175,175), size 250
//   Inner square: starts at (250,250), size 100
//
// Node numbering matches the engine's constants.js diagram.
// ============================================================

var NODE_POSITIONS = [
  /* 0  */ { x: 100, y: 100 },
  /* 1  */ { x: 300, y: 100 },
  /* 2  */ { x: 500, y: 100 },
  /* 3  */ { x: 175, y: 175 },
  /* 4  */ { x: 300, y: 175 },
  /* 5  */ { x: 425, y: 175 },
  /* 6  */ { x: 250, y: 250 },
  /* 7  */ { x: 300, y: 250 },
  /* 8  */ { x: 350, y: 250 },
  /* 9  */ { x: 100, y: 300 },
  /* 10 */ { x: 175, y: 300 },
  /* 11 */ { x: 250, y: 300 },
  /* 12 */ { x: 350, y: 300 },
  /* 13 */ { x: 425, y: 300 },
  /* 14 */ { x: 500, y: 300 },
  /* 15 */ { x: 250, y: 350 },
  /* 16 */ { x: 300, y: 350 },
  /* 17 */ { x: 350, y: 350 },
  /* 18 */ { x: 175, y: 425 },
  /* 19 */ { x: 300, y: 425 },
  /* 20 */ { x: 425, y: 425 },
  /* 21 */ { x: 100, y: 500 },
  /* 22 */ { x: 300, y: 500 },
  /* 23 */ { x: 500, y: 500 }
];

// ============================================================
// GAME STATE - The engine state is the single source of truth
// ============================================================

var gameState = Engine.createGame('12-cow');

// selectedNode is used during movement/flying phase - the player
// clicks a cow first (selects it), then clicks where to move it
var selectedNode = null;

// hoveredNode tracks which node the mouse is near (for hover effect)
var hoveredNode = null;

// What mode are we playing? Set by the HTML page before this loads
var gameMode = window.GAME_MODE || 'human';

// Is the AI currently thinking? Used to block clicks during AI turn
var aiThinking = false;

// ============================================================
// CANVAS SETUP
// ============================================================

var canvas = document.getElementById('myCanvas');
var ctx = canvas.getContext('2d');

// UI elements - these exist in the HTML
var statusText = document.getElementById('statusText');
var phaseText = document.getElementById('phaseText');
var player1info = document.getElementById('player1info');
var player2info = document.getElementById('player2info');

// ============================================================
// COORDINATE MAPPING
// Given a mouse position on the canvas, find the closest node ID
// Returns the node ID (0-23) or -1 if nothing is close enough
// ============================================================

function findClosestNode(mouseX, mouseY) {
  var closest = -1;
  var minDist = 25; // snap distance in pixels
  for (var i = 0; i < NODE_POSITIONS.length; i++) {
    var dx = mouseX - NODE_POSITIONS[i].x;
    var dy = mouseY - NODE_POSITIONS[i].y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      closest = i;
    }
  }
  return closest;
}

// ============================================================
// DRAWING - Renders the entire board from engine state
// ============================================================

function drawBoard() {
  // clear canvas
  ctx.fillStyle = '#deb887';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'black';
  ctx.lineWidth = 3;

  // draw the three concentric squares
  ctx.strokeRect(100, 100, 400, 400); // outer
  ctx.strokeRect(175, 175, 250, 250); // middle
  ctx.strokeRect(250, 250, 100, 100); // inner

  // vertical connecting lines
  ctx.beginPath();
  ctx.moveTo(300, 100); ctx.lineTo(300, 250);
  ctx.moveTo(300, 350); ctx.lineTo(300, 500);
  ctx.stroke();

  // horizontal connecting lines
  ctx.beginPath();
  ctx.moveTo(100, 300); ctx.lineTo(250, 300);
  ctx.moveTo(350, 300); ctx.lineTo(500, 300);
  ctx.stroke();

  // diagonal lines
  ctx.beginPath();
  ctx.moveTo(100, 100); ctx.lineTo(250, 250);
  ctx.moveTo(350, 350); ctx.lineTo(500, 500);
  ctx.moveTo(500, 100); ctx.lineTo(350, 250);
  ctx.moveTo(250, 350); ctx.lineTo(100, 500);
  ctx.stroke();

  // draw all 24 intersection dots
  for (var i = 0; i < NODE_POSITIONS.length; i++) {
    ctx.beginPath();
    ctx.arc(NODE_POSITIONS[i].x, NODE_POSITIONS[i].y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#8b4513';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // highlight mills - draw a subtle glow around nodes that are in a mill
  var currentMills = Engine.getMills(gameState);
  for (var m = 0; m < currentMills.length; m++) {
    var mill = currentMills[m];
    var millColor = mill.player === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
    for (var n = 0; n < mill.nodes.length; n++) {
      var pos = NODE_POSITIONS[mill.nodes[n]];
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 20, 0, 2 * Math.PI);
      ctx.fillStyle = millColor;
      ctx.fill();
    }
  }

  // draw cows on the board based on engine state
  for (var i = 0; i < Engine.BOARD_SIZE; i++) {
    var owner = gameState.nodes[i];
    if (owner === null) continue;
    var pos = NODE_POSITIONS[i];

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 15, 0, 2 * Math.PI);

    if (owner === 'white') {
      // Player 1 = dark pieces (matches original frontend style)
      ctx.fillStyle = 'black';
      ctx.fill();
      ctx.strokeStyle = 'white';
    } else {
      // Player 2 / AI = light pieces
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.strokeStyle = 'black';
    }
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // highlight selected cow (for movement/flying phase)
  if (selectedNode !== null) {
    var selPos = NODE_POSITIONS[selectedNode];
    ctx.beginPath();
    ctx.arc(selPos.x, selPos.y, 18, 0, 2 * Math.PI);
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // hover effect - show where the mouse is pointing
  if (hoveredNode !== null && hoveredNode >= 0) {
    var hPos = NODE_POSITIONS[hoveredNode];
    ctx.beginPath();
    ctx.arc(hPos.x, hPos.y, 15, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // if capture is pending, highlight capturable opponent cows in red
  if (gameState.capturePending > 0) {
    var targets = Engine.getLegalCaptures(gameState);
    for (var t = 0; t < targets.length; t++) {
      var tPos = NODE_POSITIONS[targets[t]];
      ctx.beginPath();
      ctx.arc(tPos.x, tPos.y, 18, 0, 2 * Math.PI);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}

// ============================================================
// UI INFO UPDATE - Shows current player, phase, cow counts, etc.
// ============================================================

function updateInfo() {
  var cp = gameState.currentPlayer;
  var phase = Engine.getPhase(gameState, cp);

  // figure out display names
  var p1Name = 'Player 1 (Dark)';
  var p2Name = gameMode === 'human' ? 'Player 2 (Light)' : 'AI (Light)';
  var currentName = cp === 'white' ? p1Name : p2Name;

  // status message
  if (gameState.winner) {
    var winnerName = gameState.winner === 'white' ? p1Name : p2Name;
    var reason = gameState.winReason === 'opponent_below_three'
      ? 'Opponent has fewer than 3 cows' : 'Opponent has no legal moves';
    statusText.textContent = winnerName + ' wins! (' + reason + ')';
    statusText.style.color = '#ffcc00';
  } else if (gameState.capturePending > 0) {
    statusText.textContent = currentName + ' - Capture an opponent cow! (click a red-highlighted cow)';
    statusText.style.color = '#ff6666';
  } else if (aiThinking) {
    statusText.textContent = 'AI is thinking...';
    statusText.style.color = '#aaaaff';
  } else {
    statusText.textContent = currentName + "'s turn";
    statusText.style.color = '#ffffff';
  }

  // phase display
  if (!gameState.winner) {
    var phaseLabel = phase.charAt(0).toUpperCase() + phase.slice(1);
    if (phase === 'movement') phaseLabel = 'Movement (slide to adjacent)';
    if (phase === 'flying') phaseLabel = 'Flying (move anywhere)';
    if (gameState.capturePending > 0) phaseLabel = 'Capture (' + gameState.capturePending + ' remaining)';
    phaseText.textContent = 'Phase: ' + phaseLabel;
  } else {
    phaseText.textContent = 'Game Over';
  }

  // player info panels
  var w_onBoard = Engine.countCowsOnBoard(gameState, 'white');
  var b_onBoard = Engine.countCowsOnBoard(gameState, 'black');

  player1info.textContent = p1Name + ': ' + w_onBoard + ' on board, '
    + gameState.cowsToPlace.white + ' to place, captured ' + gameState.cowsCaptured.white;
  player2info.textContent = p2Name + ': ' + b_onBoard + ' on board, '
    + gameState.cowsToPlace.black + ' to place, captured ' + gameState.cowsCaptured.black;

  // highlight whose turn it is
  player1info.style.borderColor = cp === 'white' ? '#00ff00' : '#666';
  player2info.style.borderColor = cp === 'black' ? '#00ff00' : '#666';
}

// ============================================================
// CLICK HANDLER - Translates canvas clicks into engine moves
// This is the main game loop logic for human players
// ============================================================

function handleClick(event) {
  // don't allow clicks if game is over or AI is thinking
  if (gameState.winner) return;
  if (aiThinking) return;

  // in AI modes, only allow clicks when it's the human's turn (white)
  if (gameMode !== 'human' && gameState.currentPlayer !== 'white') return;

  // figure out which node was clicked
  var rect = canvas.getBoundingClientRect();
  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;
  var mouseX = (event.clientX - rect.left) * scaleX;
  var mouseY = (event.clientY - rect.top) * scaleY;
  var nodeId = findClosestNode(mouseX, mouseY);

  // didn't click near any node
  if (nodeId === -1) return;

  var cp = gameState.currentPlayer;
  var phase = Engine.getPhase(gameState, cp);
  var result;

  // CAPTURE MODE - player must capture an opponent's cow
  if (gameState.capturePending > 0) {
    result = Engine.applyMove(gameState, {
      type: 'capture',
      player: cp,
      target: nodeId
    });
    if (!result.error) {
      gameState = result;
      selectedNode = null;
      afterHumanMove();
    }
    // if it was an error (clicked wrong cow), just ignore - the red highlights show valid targets
    drawBoard();
    updateInfo();
    return;
  }

  // PLACEMENT PHASE - click an empty node to place a cow
  if (phase === 'placement') {
    result = Engine.applyMove(gameState, {
      type: 'placement',
      player: cp,
      node: nodeId
    });
    if (!result.error) {
      gameState = result;
      afterHumanMove();
    }
    drawBoard();
    updateInfo();
    return;
  }

  // MOVEMENT / FLYING PHASE - two-click: select cow, then select destination
  if (phase === 'movement' || phase === 'flying') {
    // if no cow selected yet, try to select one
    if (selectedNode === null) {
      // must click on your own cow
      if (gameState.nodes[nodeId] === cp) {
        selectedNode = nodeId;
      }
    } else {
      // clicking the same cow again deselects it
      if (nodeId === selectedNode) {
        selectedNode = null;
      }
      // clicking a different own cow switches selection
      else if (gameState.nodes[nodeId] === cp) {
        selectedNode = nodeId;
      }
      // clicking an empty node tries to move there
      else {
        result = Engine.applyMove(gameState, {
          type: 'slide',
          player: cp,
          from: selectedNode,
          to: nodeId
        });
        if (!result.error) {
          gameState = result;
          selectedNode = null;
          afterHumanMove();
        }
        // if invalid move (not adjacent, etc), just ignore
      }
    }
    drawBoard();
    updateInfo();
    return;
  }
}

// ============================================================
// AI TURN - After the human moves, check if AI should go next
// ============================================================

function afterHumanMove() {
  // if game is over, nothing to do
  if (gameState.winner) return;

  // in human vs human mode, no AI needed
  if (gameMode === 'human') return;

  // if it's still the human's turn (e.g. capture pending after mill), wait
  if (gameState.currentPlayer === 'white') return;

  // it's the AI's turn - use setTimeout so the UI updates first
  aiThinking = true;
  drawBoard();
  updateInfo();

  setTimeout(function() {
    doAiTurn();
  }, 300); // small delay so the player can see what happened
}

function doAiTurn() {
  // keep making moves until it's the human's turn again or game ends
  // (the AI might need to make multiple moves if it forms a mill and captures)
  while (gameState.currentPlayer === 'black' && !gameState.winner) {
    var aiMove = null;

    // pick the right AI based on game mode
    if (gameMode === 'easy') {
      aiMove = Engine.selectMoveEasy(gameState);
    } else if (gameMode === 'medium') {
      aiMove = Engine.selectMoveMedium(gameState);
    } else if (gameMode === 'hard') {
      aiMove = Engine.selectMoveHard(gameState);
    }

    // if AI has no moves, game should be over
    if (!aiMove) break;

    var result = Engine.applyMove(gameState, aiMove);
    if (result.error) {
      // this shouldn't happen if the engine is correct, but just in case
      console.error('AI made invalid move:', aiMove, result.message);
      break;
    }
    gameState = result;
  }

  aiThinking = false;
  drawBoard();
  updateInfo();
}

// ============================================================
// MOUSE MOVE - Hover effect
// ============================================================

function handleMouseMove(event) {
  var rect = canvas.getBoundingClientRect();
  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;
  var mouseX = (event.clientX - rect.left) * scaleX;
  var mouseY = (event.clientY - rect.top) * scaleY;
  hoveredNode = findClosestNode(mouseX, mouseY);
  drawBoard();
}

function handleMouseLeave() {
  hoveredNode = null;
  drawBoard();
}

// ============================================================
// RESET - Start a new game
// ============================================================

function resetGame() {
  gameState = Engine.createGame('12-cow');
  selectedNode = null;
  hoveredNode = null;
  aiThinking = false;
  drawBoard();
  updateInfo();
}

// ============================================================
// SETUP - Wire up event listeners and do initial draw
// ============================================================

canvas.addEventListener('click', handleClick);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseleave', handleMouseLeave);

// initial draw
drawBoard();
updateInfo();