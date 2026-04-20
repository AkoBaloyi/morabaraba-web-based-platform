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
  window.location.href = "http://127.0.0.1:5500/front-end/index.html";
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
});

let myPlayerNumber = null; // 1 = Black, 2 = White
let gameReady = false;
let isRemoteMove = false;

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

// Update UI counters
function updateCounters() {
  const p1Count = occupiedPointsP1.length;
  const p2Count = occupiedPointsP2.length;
  player1counter.textContent = p1Count;
  player2counter.textContent = p2Count;

  const p1ToPlace = Math.max(0, 12 - p1Count);
  const p2ToPlace = Math.max(0, 12 - p2Count);

  document.getElementById("player1ToPlace").textContent = p1ToPlace;
  document.getElementById("player2ToPlace").textContent = p2ToPlace;
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
  if (hoveredPoint && !hoveredPoint.placed) {
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

// Place piece
function placePiece() {
  if (!hoveredPoint) {
    console.log("No hover point");
    return;
  }

  if (isRemoteMove) {
    console.log("Remote move in progress");
    return;
  }

  if (!gameReady) {
    updateStatus("Game not ready yet!", "#ff9800");
    return;
  }

  // Check if it's this player's turn
  if (currentPlayer !== myPlayerNumber) {
    updateStatus(
      `Not your turn! (Player ${currentPlayer} is playing)`,
      "#f44336",
    );
    return;
  }

  const point = hoveredPoint;

  // Check if point is already occupied
  if (point.placed) {
    updateStatus("Position already occupied!", "#ff9800");
    return;
  }

  // Check piece limit
  const myPieces =
    myPlayerNumber === 1 ? occupiedPointsP1.length : occupiedPointsP2.length;
  if (myPieces >= 12) {
    updateStatus("You have placed all 12 pieces!", "#ff9800");
    return;
  }

  console.log(
    `Placing piece for Player ${myPlayerNumber} at (${point.x}, ${point.y})`,
  );

  // Place piece locally
  if (myPlayerNumber === 1) {
    occupiedPointsP1.push({ x: point.x, y: point.y, placed: true });
    point.placed = true;
    player1counter.textContent = occupiedPointsP1.length;
    currentPlayer = 2;
  } else {
    occupiedPointsP2.push({ x: point.x, y: point.y, placed: true });
    point.placed = true;
    player2counter.textContent = occupiedPointsP2.length;
    currentPlayer = 1;
  }

  updateCounters();
  drawBoard();

  // Send move to server
  socket.emit("game-move", {
    roomCode: roomCode,
    move: {
      x: point.x,
      y: point.y,
      player: myPlayerNumber,
    },
  });

  updateStatus("Move sent! Waiting for opponent...", "#ff9800");
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
  updateStatus("Connected! Waiting for game to start...", "#4CAF50");

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

  // Set current player based on who starts
  currentPlayer = data.currentTurn
    ? myPlayerNumber
    : myPlayerNumber === 1
      ? 2
      : 1;

  // Update UI labels
  if (myPlayerNumber === 1) {
    player1text.innerHTML = "YOU - Player 1 (Dark)";
    player2text.innerHTML = "Opponent - Player 2 (Light)";
  } else {
    player1text.innerHTML = "Opponent - Player 1 (Dark)";
    player2text.innerHTML = "YOU - Player 2 (Light)";
  }

  if (currentPlayer === myPlayerNumber) {
    updateStatus(
      `Your turn! Place a piece. You are Player ${myPlayerNumber}`,
      "#4CAF50",
    );
  } else {
    updateStatus(
      `Waiting for opponent's move. You are Player ${myPlayerNumber}`,
      "#ff9800",
    );
  }

  drawBoard();
});

socket.on("opponent-move", (data) => {
  console.log(
    `Opponent move received: Player ${data.player} placed at (${data.move.x}, ${data.move.y})`,
  );
  isRemoteMove = true;

  const point = { x: data.move.x, y: data.move.y, placed: true };

  // Mark intersection as placed
  for (let intersection of geometry.intersections) {
    if (intersection.x === data.move.x && intersection.y === data.move.y) {
      intersection.placed = true;
      break;
    }
  }

  // Add opponent's piece
  if (data.player === 1) {
    occupiedPointsP1.push(point);
    player1counter.textContent = occupiedPointsP1.length;
    currentPlayer = 2;
    console.log(
      `Opponent (Player 1) placed piece. Total: ${occupiedPointsP1.length}`,
    );
  } else {
    occupiedPointsP2.push(point);
    player2counter.textContent = occupiedPointsP2.length;
    currentPlayer = 1;
    console.log(
      `Opponent (Player 2) placed piece. Total: ${occupiedPointsP2.length}`,
    );
  }

  updateCounters();
  drawBoard();
  isRemoteMove = false;

  if (currentPlayer === myPlayerNumber) {
    updateStatus("Your turn!", "#4CAF50");
  } else {
    updateStatus("Waiting for opponent...", "#ff9800");
  }
});

socket.on("move-confirmed", (data) => {
  console.log("Move confirmed by server");
});

socket.on("opponent-disconnected", (data) => {
  console.log("Opponent disconnected");
  updateStatus(data.message, "#f44336");
  gameReady = false;
});

socket.on("error", (message) => {
  console.error("Server error:", message);
  updateStatus(message, "#f44336");
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
  updateStatus("Disconnected from server!", "#f44336");
  gameReady = false;
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

console.log("Online board ready!");
console.log("Waiting for player assignment...");
