// ==========================================
// ONLINE MORABARABA GAME
// ==========================================

// Get room info
const urlRoomCode = new URLSearchParams(window.location.search).get("room");
const sessionRoomCode = sessionStorage.getItem("gameRoomCode");
const roomCode = urlRoomCode || sessionRoomCode;
const playerUsername =
  sessionStorage.getItem("playerUsername") ||
  localStorage.getItem("username") ||
  "Player_" + Math.floor(Math.random() * 1000);

if (!roomCode) {
  alert("No room code found! Returning to menu.");
  window.location.href = "../HomePage/index.html";
}

console.log("=========================================");
console.log("ONLINE MORABARABA GAME");
console.log("Room:", roomCode);
console.log("Player:", playerUsername);
console.log("=========================================");

// ==========================================
// SOCKET CONNECTION
// ==========================================
const socket = io("http://localhost:3000", {
  transports: ["websocket", "polling"],
  auth: { token: localStorage.getItem("token") || null },
});

let myPlayerNumber = null; // 1 = Black, 2 = White
let gameReady = false;

// these get updated by the server's game-controller-state event
let serverGameState = null;
let captureTargets = [];
let capturePending = 0;
let selectedNode = null;
let lastMoveNode = null;      // highlights the last move
let prevCapturePending = 0;   // to detect when a mill is formed

// ==========================================
// BOARD SETUP
// ==========================================
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

const player1counter = document.getElementById("player1counter");
const player2counter = document.getElementById("player2counter");
const player1text = document.getElementById("player1text");
const player2text = document.getElementById("player2text");
const statusText = document.getElementById("statusText");

let hoveredPoint = null;
let occupiedPointsP1 = []; // Black pieces

// node positions - maps engine node IDs (0-23) to pixel coords on the canvas
// same mapping as game-controller.js
const NODE_POSITIONS = [
  {x:100,y:100},{x:300,y:100},{x:500,y:100},
  {x:175,y:175},{x:300,y:175},{x:425,y:175},
  {x:250,y:250},{x:300,y:250},{x:350,y:250},
  {x:100,y:300},{x:175,y:300},{x:250,y:300},
  {x:350,y:300},{x:425,y:300},{x:500,y:300},
  {x:250,y:350},{x:300,y:350},{x:350,y:350},
  {x:175,y:425},{x:300,y:425},{x:425,y:425},
  {x:100,y:500},{x:300,y:500},{x:500,y:500}
];

// find which node ID a click is closest to (returns -1 if too far)
function findClosestNodeId(mouseX, mouseY) {
  let closest = -1;
  let minDist = 25;
  for (let i = 0; i < NODE_POSITIONS.length; i++) {
    const dx = mouseX - NODE_POSITIONS[i].x;
    const dy = mouseY - NODE_POSITIONS[i].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) { minDist = dist; closest = i; }
  }
  return closest;
}
let occupiedPointsP2 = []; // White pieces
let currentPlayer = 1; // 1 = Black, 2 = White
let phase = "placement"; // placement, movement, capture

// Board geometry
let geometry = {
  squares: [
    { start: 250, size: 100 },
    { start: 175, size: 250 },
    { start: 100, size: 400 },
  ],
  intersections: [],
};

// Calculate intersection points
function intersectionCal() {
  const points = [];
  for (let square of geometry.squares) {
    let corners = [
      { x: square.start, y: square.start },
      { x: square.start + square.size, y: square.start },
      { x: square.start, y: square.start + square.size },
      { x: square.start + square.size, y: square.start + square.size },
    ];
    let midpoints = [
      { x: square.start + square.size / 2, y: square.start },
      { x: square.start, y: square.start + square.size / 2 },
      { x: square.start + square.size, y: square.start + square.size / 2 },
      { x: square.start + square.size / 2, y: square.start + square.size },
    ];
    for (let corner of corners) {
      points.push({ x: corner.x, y: corner.y, placed: false });
    }
    for (let midpoint of midpoints) {
      points.push({ x: midpoint.x, y: midpoint.y, placed: false });
    }
  }
  return points;
}

geometry.intersections = intersectionCal();

// Update UI counters from server state
function updateCounters() {
  if (serverGameState) {
    // use the real numbers from the engine
    const wOnBoard = serverGameState.nodes.filter(n => n === "white").length;
    const bOnBoard = serverGameState.nodes.filter(n => n === "black").length;
    player1counter.textContent = wOnBoard;
    player2counter.textContent = bOnBoard;
    document.getElementById("player1ToPlace").textContent = serverGameState.cowsToPlace.white;
    document.getElementById("player2ToPlace").textContent = serverGameState.cowsToPlace.black;
  } else {
    // fallback before first state arrives
    player1counter.textContent = occupiedPointsP1.length;
    player2counter.textContent = occupiedPointsP2.length;
    document.getElementById("player1ToPlace").textContent = Math.max(0, 12 - occupiedPointsP1.length);
    document.getElementById("player2ToPlace").textContent = Math.max(0, 12 - occupiedPointsP2.length);
  }
}

// Draw board
function drawBoard() {
  // Background
  ctx.fillStyle = "#deb887";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw squares
  ctx.strokeStyle = "black";
  ctx.lineWidth = 3;
  for (let square of geometry.squares) {
    ctx.strokeRect(square.start, square.start, square.size, square.size);
  }

  // Vertical lines
  ctx.beginPath();
  ctx.moveTo(300, 100);
  ctx.lineTo(300, 250);
  ctx.moveTo(300, 350);
  ctx.lineTo(300, 500);
  ctx.stroke();

  // Horizontal lines
  ctx.beginPath();
  ctx.moveTo(100, 300);
  ctx.lineTo(250, 300);
  ctx.moveTo(350, 300);
  ctx.lineTo(500, 300);
  ctx.stroke();

  // Diagonal lines
  ctx.beginPath();
  ctx.moveTo(100, 100);
  ctx.lineTo(250, 250);
  ctx.moveTo(350, 350);
  ctx.lineTo(500, 500);
  ctx.moveTo(500, 100);
  ctx.lineTo(350, 250);
  ctx.moveTo(250, 350);
  ctx.lineTo(100, 500);
  ctx.stroke();

  // Draw intersection points
  for (let point of geometry.intersections) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "#8b4513";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Hover effect
  if (hoveredPoint) {
    ctx.beginPath();
    ctx.arc(hoveredPoint.x, hoveredPoint.y, 15, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Draw Player 1 pieces (Black)
  for (let point of occupiedPointsP1) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 15, 0, 2 * Math.PI);
    ctx.fillStyle = "black";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Mark intersection as placed
    for (let intersection of geometry.intersections) {
      if (point.x === intersection.x && point.y === intersection.y) {
        intersection.placed = true;
      }
    }
  }

  // Draw Player 2 pieces (White)
  for (let point of occupiedPointsP2) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 15, 0, 2 * Math.PI);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let intersection of geometry.intersections) {
      if (point.x === intersection.x && point.y === intersection.y) {
        intersection.placed = true;
      }
    }
  }

  // Turn indicator border
  if (currentPlayer === 1) {
    player1text.style.borderColor = "white";
    player1text.style.boxShadow = "0px 0px 10px white";
    player2text.style.borderColor = "gray";
    player2text.style.boxShadow = "0 0 10px gray";
  } else {
    player2text.style.borderColor = "white";
    player2text.style.boxShadow = "0px 0px 10px white";
    player1text.style.borderColor = "gray";
    player1text.style.boxShadow = "0 0 10px gray";
  }

  // show valid moves as small white dots
  if (serverGameState && !serverGameState.winner && myPlayerNumber) {
    var myColor = myPlayerNumber === 1 ? "white" : "black";
    var isMyTurn = serverGameState.currentPlayer === myColor;

    if (isMyTurn && capturePending === 0) {
      var cowsLeft = serverGameState.cowsToPlace[myColor];
      var onBoard = serverGameState.nodes.filter(function(n) { return n === myColor; }).length;
      var myPhase = cowsLeft > 0 ? "placement" : (onBoard > 3 ? "movement" : "flying");

      if (myPhase === "placement") {
        for (var i = 0; i < 24; i++) {
          if (serverGameState.nodes[i] === null) {
            var p = NODE_POSITIONS[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
            ctx.fill();
          }
        }
      } else if (selectedNode !== null) {
        if (myPhase === "flying") {
          for (var i = 0; i < 24; i++) {
            if (serverGameState.nodes[i] === null) {
              var p = NODE_POSITIONS[i];
              ctx.beginPath();
              ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
              ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
              ctx.fill();
            }
          }
        } else {
          // movement - show adjacent empty spots for the selected cow
          // use the adjacency map from the engine constants
          var adjMap = {
            0:[1,3,9],1:[0,2,4],2:[1,5,14],3:[0,4,6,10],4:[1,3,5,7],5:[2,4,8,13],
            6:[3,7,11],7:[4,6,8],8:[5,7,12],9:[0,10,21],10:[3,9,11,18],11:[6,10,15],
            12:[8,13,17],13:[5,12,14,20],14:[2,13,23],15:[11,16,18],16:[15,17,19],
            17:[12,16,20],18:[10,15,19,21],19:[16,18,20,22],20:[13,17,19,23],
            21:[9,18,22],22:[19,21,23],23:[14,20,22]
          };
          var neighbors = adjMap[selectedNode] || [];
          for (var a = 0; a < neighbors.length; a++) {
            if (serverGameState.nodes[neighbors[a]] === null) {
              var p = NODE_POSITIONS[neighbors[a]];
              ctx.beginPath();
              ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
              ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
              ctx.fill();
            }
          }
        }
      }
    }
  }

  // highlight capture targets in red so the player knows what to click
  if (captureTargets && captureTargets.length > 0) {
    for (const nodeId of captureTargets) {
      const pos = NODE_POSITIONS[nodeId];
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 18, 0, 2 * Math.PI);
      ctx.strokeStyle = "red";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  // highlight selected cow in green (for movement phase)
  if (selectedNode !== null) {
    const pos = NODE_POSITIONS[selectedNode];
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 18, 0, 2 * Math.PI);
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // highlight last move in yellow
  if (lastMoveNode !== null && lastMoveNode >= 0) {
    const pos = NODE_POSITIONS[lastMoveNode];
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 20, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255, 200, 0, 0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// Find closest intersection
function findClosestIntersection(mouseX, mouseY) {
  let closest = null;
  let minDistance = 22;
  for (let point of geometry.intersections) {
    const distance = Math.sqrt(
      Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2),
    );
    if (distance < minDistance) {
      closest = point;
      minDistance = distance;
    }
  }
  return closest;
}

// Mouse handlers
function handleMouseMove(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (event.clientX - rect.left) * scaleX;
  const mouseY = (event.clientY - rect.top) * scaleY;
  hoveredPoint = findClosestIntersection(mouseX, mouseY);
  drawBoard();
}

function handleMouseLeave() {
  hoveredPoint = null;
  drawBoard();
}

// handles all clicks - placement, capture, and movement
function placePiece(event) {
  if (!gameReady) return;
  if (!serverGameState) return;
  if (serverGameState.winner) return;

  // check if its our turn
  const myEnginePlayer = myPlayerNumber === 1 ? "white" : "black";
  if (serverGameState.currentPlayer !== myEnginePlayer) {
    updateStatus("Not your turn!", "#f44336");
    return;
  }

  // figure out which node was clicked
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (event.clientX - rect.left) * scaleX;
  const mouseY = (event.clientY - rect.top) * scaleY;
  const nodeId = findClosestNodeId(mouseX, mouseY);

  if (nodeId === -1) return;

  // CAPTURE - if we need to capture, clicking an opponent cow sends a capture move
  if (capturePending > 0) {
    if (captureTargets.includes(nodeId)) {
      console.log("Sending capture of node " + nodeId);
      socket.emit("game-move", {
        roomCode: roomCode,
        move: { capture: nodeId },
      });
      lastMoveNode = nodeId;
    } else {
      updateStatus("Click a red-highlighted cow to capture!", "#ff6666");
    }
    return;
  }

  // figure out what phase we're in
  const cowsToPlace = serverGameState.cowsToPlace[myEnginePlayer];
  const piecesOnBoard = serverGameState.nodes.filter(n => n === myEnginePlayer).length;
  const phase = cowsToPlace > 0 ? "placement" : (piecesOnBoard > 3 ? "movement" : "flying");

  // PLACEMENT - click an empty spot
  if (phase === "placement") {
    if (serverGameState.nodes[nodeId] !== null) {
      updateStatus("That spot is taken!", "#ff9800");
      return;
    }
    console.log("Sending placement at node " + nodeId);
    socket.emit("game-move", {
      roomCode: roomCode,
      move: { x: NODE_POSITIONS[nodeId].x, y: NODE_POSITIONS[nodeId].y },
    });
    lastMoveNode = nodeId;
    return;
  }

  // MOVEMENT / FLYING - two clicks: pick a cow, then pick where to move it
  if (phase === "movement" || phase === "flying") {
    if (selectedNode === null) {
      // first click - select one of our cows
      if (serverGameState.nodes[nodeId] === myEnginePlayer) {
        selectedNode = nodeId;
        drawBoard();
        updateStatus("Now click where to move it", "#4CAF50");
      }
    } else {
      // second click - try to move there
      if (nodeId === selectedNode) {
        // clicked same cow again, deselect
        selectedNode = null;
        drawBoard();
        return;
      }
      if (serverGameState.nodes[nodeId] === myEnginePlayer) {
        // clicked a different own cow, switch selection
        selectedNode = nodeId;
        drawBoard();
        return;
      }
      console.log("Sending slide from " + selectedNode + " to " + nodeId);
      socket.emit("game-move", {
        roomCode: roomCode,
        move: { from: selectedNode, to: nodeId },
      });
      lastMoveNode = nodeId;
      selectedNode = null;
    }
    return;
  }
}

// Reset game
window.resetGame = function () {
  if (!confirm("Reset the game?")) return;

  occupiedPointsP1 = [];
  occupiedPointsP2 = [];
  for (let intersection of geometry.intersections) {
    intersection.placed = false;
  }
  currentPlayer = 1;
  updateCounters();
  drawBoard();
  updateStatus("Game reset!", "#4CAF50");
};

function updateStatus(message, color) {
  if (statusText) {
    statusText.textContent = message;
    statusText.style.color = color || "white";
  }
  console.log("[STATUS]", message);
}

// ==========================================
// SOCKET EVENT HANDLERS
// ==========================================

socket.on("connect", () => {
  console.log("Connected to server");
  updateStatus("Connected! Joining game...", "#4CAF50");

  // always try to rejoin the room when we connect (or reconnect)
  socket.emit("reconnect-to-game", {
    roomCode: roomCode,
    username: playerUsername,
  });
});

// socket.io auto-reconnects by default, but we need to know when it happens
socket.io.on("reconnect", () => {
  console.log("Socket reconnected - rejoining room");
  socket.emit("reconnect-to-game", {
    roomCode: roomCode,
    username: playerUsername,
  });
});

socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
  updateStatus("Connection failed! Make sure server is running.", "#f44336");
});

socket.on("player-assignment", (data) => {
  console.log(`Assigned as Player ${data.playerNumber}`);
  myPlayerNumber = data.playerNumber;
  gameReady = true;

  // Update UI labels
  if (myPlayerNumber === 1) {
    player1text.innerHTML = "YOU - Player 1 (Dark)";
    player2text.innerHTML = "Opponent - Player 2 (Light)";
  } else {
    player1text.innerHTML = "Opponent - Player 1 (Dark)";
    player2text.innerHTML = "YOU - Player 2 (Light)";
  }

  // dont set currentPlayer here - game-controller-state will handle it
  updateStatus("Game ready! Waiting for state...", "#4CAF50");
  drawBoard();
});

socket.on("opponent-move", (data) => {
  // play a sound when opponent moves
  try {
    var ac = new (window.AudioContext || window.webkitAudioContext)();
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.frequency.value = 500; g.gain.value = 0.08;
    o.start(); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
    o.stop(ac.currentTime + 0.08);
  } catch(e) {}
  console.log("Opponent move received (waiting for state update)");
});

socket.on("move-confirmed", (data) => {
  console.log("Move confirmed by server");
});

// this is the important one - server sends us the real game state after every move
// we rebuild our local board from it so everything stays in sync
socket.on("game-controller-state", (data) => {
  console.log("Got game state from server, current player:", data?.gameState?.currentPlayer, "capture:", data?.capturePending);

  if (!data || !data.gameState) return;

  const gs = data.gameState;

  // store the full state so the click handler can use it
  serverGameState = gs;
  captureTargets = data.captureTargets || [];
  prevCapturePending = capturePending;
  capturePending = data.capturePending || 0;
  selectedNode = null;

  // detect mill formed (capture went from 0 to >0)
  if (capturePending > 0 && prevCapturePending === 0) {
    updateStatus("⚡ MILL FORMED! ⚡", "#ffcc00");
    // flash it briefly then update to the real status
    setTimeout(function() {
      if (currentPlayer === myPlayerNumber) {
        updateStatus("Your turn - capture an opponent's cow!", "#ff6666");
      }
    }, 1200);
  }

  // update phase text
  var phaseText = document.getElementById("phaseText");
  if (phaseText && data.phaseLabel) {
    phaseText.textContent = "Phase: " + data.phaseLabel;
  }

  // rebuild piece arrays from the engine's nodes array
  occupiedPointsP1 = [];
  occupiedPointsP2 = [];

  for (let inter of geometry.intersections) {
    inter.placed = false;
  }

  for (let i = 0; i < 24; i++) {
    if (gs.nodes[i] === "white") {
      const pos = NODE_POSITIONS[i];
      occupiedPointsP1.push({ x: pos.x, y: pos.y, placed: true });
      for (let inter of geometry.intersections) {
        if (inter.x === pos.x && inter.y === pos.y) { inter.placed = true; break; }
      }
    } else if (gs.nodes[i] === "black") {
      const pos = NODE_POSITIONS[i];
      occupiedPointsP2.push({ x: pos.x, y: pos.y, placed: true });
      for (let inter of geometry.intersections) {
        if (inter.x === pos.x && inter.y === pos.y) { inter.placed = true; break; }
      }
    }
  }

  currentPlayer = gs.currentPlayer === "white" ? 1 : 2;

  // update status from server
  if (data.statusMessage) {
    updateStatus(data.statusMessage, data.statusColor);
  }

  // check if its my turn
  if (currentPlayer === myPlayerNumber && !gs.winner) {
    if (data.capturePending > 0) {
      updateStatus("Your turn - capture an opponent's cow!", "#ff6666");
    } else {
      updateStatus("Your turn!", "#4CAF50");
    }
  } else if (!gs.winner) {
    updateStatus("Waiting for opponent...", "#ff9800");
  }

  if (gs.winner) {
    const winnerNum = gs.winner === "white" ? 1 : 2;
    if (winnerNum === myPlayerNumber) {
      updateStatus("You win!", "#ffcc00");
    } else {
      updateStatus("You lost!", "#ff6666");
    }
    // show the game-over modal
    var endModal = document.getElementById("end-modal");
    if (endModal) {
      var endStat = document.getElementById("endStatText");
      if (endStat) {
        endStat.textContent = winnerNum === myPlayerNumber ? "You Win!" : "You Lost";
        endStat.style.color = winnerNum === myPlayerNumber ? "#ffcc00" : "#ff6666";
      }
      endModal.style.opacity = "1";
      endModal.style.zIndex = "1000";
    }
  }

  updateCounters();
  drawBoard();
});

socket.on("opponent-disconnected", (data) => {
  console.log("Opponent disconnected");
  updateStatus(data.message, "#f44336");
  gameReady = false;
});

// move timer countdown
var timerInterval = null;
socket.on("timer-start", (data) => {
  var seconds = data.seconds;
  var timerEl = document.getElementById("moveTimer");
  if (timerInterval) clearInterval(timerInterval);
  if (timerEl) timerEl.textContent = seconds;
  timerInterval = setInterval(function() {
    seconds--;
    if (timerEl) {
      timerEl.textContent = seconds;
      timerEl.style.color = seconds <= 10 ? "#ff4444" : "#ffffff";
    }
    if (seconds <= 0) {
      clearInterval(timerInterval);
      if (timerEl) timerEl.textContent = "0";
    }
  }, 1000);
});

socket.on("game-over", (data) => {
  console.log("Game over event:", data);
  if (timerInterval) clearInterval(timerInterval);

  var eloText = document.getElementById("eloChangeText");
  var endStat = document.getElementById("endStatText");

  // figure out the reason text
  var reasonText = "";
  if (data.reason === "opponent_resigned") reasonText = "Opponent resigned";
  else if (data.reason === "time_expired") reasonText = "Time expired";
  else if (data.reason === "opponent_disconnected") reasonText = "Opponent disconnected";
  else if (data.reason === "opponent_below_three") reasonText = "Opponent has fewer than 3 cows";
  else if (data.reason === "opponent_no_moves") reasonText = "Opponent has no legal moves";
  else if (data.reason === "fifty_move_rule") reasonText = "Draw - 50 moves without capture";

  var isWinner = data.winner === playerUsername;

  if (endStat) {
    endStat.textContent = isWinner ? "You Win!" : (data.reason === "fifty_move_rule" ? "Draw!" : "You Lost");
    endStat.style.color = isWinner ? "#ffcc00" : "#ff6666";
  }

  if (eloText && data.elo) {
    var change = isWinner ? data.elo.winnerChange : data.elo.loserChange;
    var newElo = isWinner ? data.elo.winnerElo : data.elo.loserElo;
    var sign = change >= 0 ? "+" : "";
    eloText.textContent = reasonText + " | Rating: " + newElo + " (" + sign + change + ")";
    eloText.style.color = change >= 0 ? "#4CAF50" : "#ff6666";
  } else if (eloText) {
    eloText.textContent = reasonText;
    eloText.style.color = "#aaa";
  }

  // show the modal
  var endModal = document.getElementById("end-modal");
  if (endModal) {
    endModal.style.opacity = "1";
    endModal.style.zIndex = "1000";
  }
});

socket.on("error", (message) => {
  console.error("Server error:", message);
  updateStatus(message, "#f44336");
});

socket.on("disconnect", () => {
  console.log("Disconnected from server - will try to reconnect");
  updateStatus("Connection lost, reconnecting...", "#ff9800");
  // dont set gameReady = false here, socket.io will auto-reconnect
  // and the reconnect handler will restore the state
});

// ==========================================
// EVENT LISTENERS
// ==========================================
canvas.addEventListener("mousemove", handleMouseMove);
canvas.addEventListener("click", placePiece);
canvas.addEventListener("mouseleave", handleMouseLeave);

// Initialize
updateCounters();
drawBoard();
updateStatus("Connecting to game server...", "#ff9800");

// show the room code
var roomCodeEl = document.getElementById("roomCodeDisplay");
if (roomCodeEl) roomCodeEl.textContent = roomCode;

// resign button
var resignBtn = document.getElementById("resignBtn");
if (resignBtn) {
  resignBtn.addEventListener("click", function() {
    if (confirm("Are you sure you want to resign? Your opponent will win.")) {
      socket.emit("resign", { roomCode: roomCode });
    }
  });
}

// rematch button - goes back to menu to create a new room
var rematchBtn = document.getElementById("rematchBtn");
if (rematchBtn) {
  rematchBtn.addEventListener("click", function() {
    window.location.href = "../HomePage/index.html";
  });
}

console.log("Online board ready!");
