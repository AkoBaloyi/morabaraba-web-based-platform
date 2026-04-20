const roomCode = new URLSearchParams(window.location.search).get("room");
const playerUsername =
  sessionStorage.getItem("playerUsername") ||
  localStorage.getItem("username") ||
  "Guest";

if (!roomCode) {
  alert("No room code found!");
  window.location.href = "../index.html";
}

console.log("Online game - Room:", roomCode);
console.log("Player:", playerUsername);

// Socket connection
const socket = io("http://localhost:3000");

// Game state from server
let gameState = null;
let myPlayerNumber = null;
let selectedNode = null;
let mills = [];
let captureTargets = [];
let currentPlayer = null;
let hoveredNode = null;

// Node positions
const NODE_POSITIONS = [
  { x: 100, y: 100 },
  { x: 300, y: 100 },
  { x: 500, y: 100 },
  { x: 175, y: 175 },
  { x: 300, y: 175 },
  { x: 425, y: 175 },
  { x: 250, y: 250 },
  { x: 300, y: 250 },
  { x: 350, y: 250 },
  { x: 100, y: 300 },
  { x: 175, y: 300 },
  { x: 250, y: 300 },
  { x: 350, y: 300 },
  { x: 425, y: 300 },
  { x: 500, y: 300 },
  { x: 250, y: 350 },
  { x: 300, y: 350 },
  { x: 350, y: 350 },
  { x: 175, y: 425 },
  { x: 300, y: 425 },
  { x: 425, y: 425 },
  { x: 100, y: 500 },
  { x: 300, y: 500 },
  { x: 500, y: 500 },
];

// Canvas
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

// UI Elements
const player1text = document.getElementById("player1text");
const player2text = document.getElementById("player2text");
const player1counter = document.getElementById("player1counter");
const player2counter = document.getElementById("player2counter");
const player1ToPlace = document.getElementById("player1ToPlace");
const player2ToPlace = document.getElementById("player2ToPlace");
const statusText = document.getElementById("statusText");
const player1info = document.getElementById("player1info");
const player2info = document.getElementById("player2info");

// ==========================================
// DRAW BOARD
// ==========================================

function drawBoard() {
  if (!gameState) return;

  ctx.fillStyle = "#deb887";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "black";
  ctx.lineWidth = 3;
  ctx.strokeRect(100, 100, 400, 400);
  ctx.strokeRect(175, 175, 250, 250);
  ctx.strokeRect(250, 250, 100, 100);

  ctx.beginPath();
  ctx.moveTo(300, 100);
  ctx.lineTo(300, 250);
  ctx.moveTo(300, 350);
  ctx.lineTo(300, 500);
  ctx.moveTo(100, 300);
  ctx.lineTo(250, 300);
  ctx.moveTo(350, 300);
  ctx.lineTo(500, 300);
  ctx.stroke();

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

  for (let i = 0; i < NODE_POSITIONS.length; i++) {
    ctx.beginPath();
    ctx.arc(NODE_POSITIONS[i].x, NODE_POSITIONS[i].y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "#8b4513";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Highlight mills (green glow)
  if (mills && mills.length > 0) {
    for (const mill of mills) {
      for (const nodeId of mill.nodes) {
        const pos = NODE_POSITIONS[nodeId];
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 20, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
        ctx.fill();
      }
    }
  }

  // Draw pieces
  for (let i = 0; i < 24; i++) {
    const owner = gameState.nodes[i];
    if (owner === null) continue;

    const pos = NODE_POSITIONS[i];
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 15, 0, 2 * Math.PI);

    if (owner === "white") {
      ctx.fillStyle = "black";
      ctx.fill();
      ctx.strokeStyle = "white";
    } else {
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.strokeStyle = "black";
    }
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Highlight capture targets (red border)
  if (captureTargets && captureTargets.length > 0) {
    for (const targetId of captureTargets) {
      const pos = NODE_POSITIONS[targetId];
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 18, 0, 2 * Math.PI);
      ctx.strokeStyle = "red";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  // Highlight selected piece
  if (selectedNode !== null) {
    const pos = NODE_POSITIONS[selectedNode];
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 18, 0, 2 * Math.PI);
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Hover effect
  if (hoveredNode !== null && hoveredNode >= 0) {
    const pos = NODE_POSITIONS[hoveredNode];
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 15, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function updateUI() {
  if (!gameState) return;

  const whiteOnBoard = gameState.nodes.filter((n) => n === "white").length;
  const blackOnBoard = gameState.nodes.filter((n) => n === "black").length;

  player1counter.textContent = whiteOnBoard;
  player2counter.textContent = blackOnBoard;
  player1ToPlace.textContent = gameState.cowsToPlace.white;
  player2ToPlace.textContent = gameState.cowsToPlace.black;

  // Update player labels for online
  if (myPlayerNumber === 1) {
    player1text.innerHTML = "🟤 YOU - Player 1 (Dark)";
    player2text.innerHTML = "⚪ Opponent - Player 2 (Light)";
  } else if (myPlayerNumber === 2) {
    player1text.innerHTML = "🟤 Opponent - Player 1 (Dark)";
    player2text.innerHTML = "⚪ YOU - Player 2 (Light)";
  }

  // Highlight whose turn
  if (currentPlayer === "white") {
    player1info.style.border = "2px solid #00ff00";
    player1info.style.boxShadow = "0px 0px 10px #00ff00";
    player2info.style.border = "1px solid #666";
    player2info.style.boxShadow = "none";
  } else if (currentPlayer === "black") {
    player1info.style.border = "1px solid #666";
    player1info.style.boxShadow = "none";
    player2info.style.border = "2px solid #00ff00";
    player2info.style.boxShadow = "0px 0px 10px #00ff00";
  }
}

// ==========================================
// CLICK HANDLER
// ==========================================

function findClosestNode(mouseX, mouseY) {
  let closest = -1;
  let minDist = 25;
  for (let i = 0; i < NODE_POSITIONS.length; i++) {
    const dx = mouseX - NODE_POSITIONS[i].x;
    const dy = mouseY - NODE_POSITIONS[i].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      closest = i;
    }
  }
  return closest;
}

function handleCanvasClick(event) {
  if (!gameState) return;
  if (gameState.winner) return;

  const myEnginePlayer = myPlayerNumber === 1 ? "white" : "black";
  if (currentPlayer !== myEnginePlayer) {
    statusText.textContent = "Not your turn!";
    statusText.style.color = "#ff6666";
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (event.clientX - rect.left) * scaleX;
  const mouseY = (event.clientY - rect.top) * scaleY;
  const nodeId = findClosestNode(mouseX, mouseY);

  if (nodeId === -1) return;

  // Capture phase
  if (captureTargets && captureTargets.length > 0) {
    if (captureTargets.includes(nodeId)) {
      socket.emit("game-move", {
        roomCode: roomCode,
        move: { capture: nodeId },
      });
    }
    return;
  }

  // Determine phase
  const piecesOnBoard = gameState.nodes.filter(
    (n) => n === myEnginePlayer,
  ).length;
  const phase =
    gameState.cowsToPlace[myEnginePlayer] > 0
      ? "placement"
      : piecesOnBoard > 3
        ? "movement"
        : "flying";

  // Placement
  if (phase === "placement") {
    if (gameState.nodes[nodeId] === null) {
      socket.emit("game-move", {
        roomCode: roomCode,
        move: { x: NODE_POSITIONS[nodeId].x, y: NODE_POSITIONS[nodeId].y },
      });
    }
  }
  // Movement / Flying
  else if (phase === "movement" || phase === "flying") {
    if (selectedNode === null) {
      if (gameState.nodes[nodeId] === myEnginePlayer) {
        selectedNode = nodeId;
        drawBoard();
      }
    } else {
      socket.emit("game-move", {
        roomCode: roomCode,
        move: { from: selectedNode, to: nodeId },
      });
      selectedNode = null;
    }
  }
}

// ==========================================
// MOUSE HANDLERS
// ==========================================

function handleMouseMove(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (event.clientX - rect.left) * scaleX;
  const mouseY = (event.clientY - rect.top) * scaleY;
  hoveredNode = findClosestNode(mouseX, mouseY);
  drawBoard();
}

function handleMouseLeave() {
  hoveredNode = null;
  drawBoard();
}

// ==========================================
// RESET
// ==========================================

window.resetGame = function () {
  if (confirm("Reset the game?")) {
    location.reload();
  }
};

// ==========================================
// SOCKET EVENTS
// ==========================================

socket.on("connect", () => {
  console.log("Connected to server");
  socket.emit("join-room", { roomCode, username: playerUsername });
});

socket.on("player-assignment", (data) => {
  myPlayerNumber = data.playerNumber;
  console.log(`Assigned as Player ${myPlayerNumber}`);
});

socket.on("game-state-update", (data) => {
  console.log("Game state update received");
  gameState = data.gameState;
  mills = data.mills || [];
  captureTargets = data.captureTargets || [];
  currentPlayer = data.currentPlayer;

  if (data.statusMessage) {
    statusText.textContent = data.statusMessage;
    statusText.style.color = data.statusColor;
  }

  selectedNode = null;
  updateUI();
  drawBoard();
});

socket.on("move-confirmed", (data) => {
  console.log("Move confirmed");
  gameState = data.gameState;
  mills = data.mills || [];
  captureTargets = data.captureTargets || [];
  currentPlayer = data.currentPlayer;

  if (data.statusMessage) {
    statusText.textContent = data.statusMessage;
    statusText.style.color = data.statusColor;
  }

  selectedNode = null;
  updateUI();
  drawBoard();
});

socket.on("opponent-move", (data) => {
  console.log("Opponent moved");
  gameState = data.gameState;
  mills = data.mills || [];
  captureTargets = data.captureTargets || [];
  currentPlayer = data.currentPlayer;

  if (data.statusMessage) {
    statusText.textContent = data.statusMessage;
    statusText.style.color = data.statusColor;
  }

  selectedNode = null;
  updateUI();
  drawBoard();
});

socket.on("error", (message) => {
  alert(message);
});

socket.on("game-over", (data) => {
  alert(`${data.winner} wins!`);
  statusText.textContent = `${data.winner} wins!`;
  statusText.style.color = "#ffcc00";
});

// ==========================================
// INITIALIZE
// ==========================================

canvas.addEventListener("click", handleCanvasClick);
canvas.addEventListener("mousemove", handleMouseMove);
canvas.addEventListener("mouseleave", handleMouseLeave);

console.log("Online board ready - waiting for server...");
