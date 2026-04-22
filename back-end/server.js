const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const http = require("http");

// load .env BEFORE anything that reads process.env
require("dotenv").config();

const Engine = require("./engine-server");
const authRoutes = require("./routes/authRoutes");
const { JWT_SECRET } = require("./controllers/authController");
const { updateEloAfterGame } = require("./controllers/eloController");
const { getDB } = require("./database/db");

const app = express();
const server = http.createServer(app);

const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://127.0.0.1:5500";
const PORT = process.env.PORT || 3000;

// allow both localhost and 127.0.0.1 since browsers treat them differently
const allowedOrigins = [CORS_ORIGIN, "http://localhost:5500", "http://127.0.0.1:5500"];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
}));
app.use(express.json());

// use the proper auth routes that actually check the database
app.use(authRoutes);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();

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

function getNodeIdFromCoordinates(x, y) {
  for (let i = 0; i < NODE_POSITIONS.length; i++) {
    if (NODE_POSITIONS[i].x === x && NODE_POSITIONS[i].y === y) {
      return i;
    }
  }
  return -1;
}

function getGameControllerState(gameState) {
  const cp = gameState.currentPlayer;
  const phase = Engine.getPhase(gameState, cp);
  const mills = Engine.getMills(gameState);
  const captureTargets =
    gameState.capturePending > 0 ? Engine.getLegalCaptures(gameState) : [];
  const whiteOnBoard = Engine.countCowsOnBoard(gameState, "white");
  const blackOnBoard = Engine.countCowsOnBoard(gameState, "black");

  let phaseLabel = phase.charAt(0).toUpperCase() + phase.slice(1);
  if (phase === "movement") phaseLabel = "Movement (slide to adjacent)";
  if (phase === "flying") phaseLabel = "Flying (move anywhere)";
  if (gameState.capturePending > 0)
    phaseLabel = "Capture (" + gameState.capturePending + " remaining)";

  let statusMessage = "";
  let statusColor = "#ffffff";

  if (gameState.winner) {
    const winnerName =
      gameState.winner === "white" ? "Player 1 (Dark)" : "Player 2 (Light)";
    statusMessage = winnerName + " wins!";
    statusColor = "#ffcc00";
  } else if (gameState.capturePending > 0) {
    const currentName = cp === "white" ? "Player 1 (Dark)" : "Player 2 (Light)";
    statusMessage = currentName + " - Capture an opponent cow!";
    statusColor = "#ff6666";
  } else {
    const currentName = cp === "white" ? "Player 1 (Dark)" : "Player 2 (Light)";
    statusMessage = currentName + "'s turn";
    statusColor = cp === "white" ? "#4CAF50" : "#ff9800";
  }

  return {
    gameState: gameState,
    mills: mills,
    captureTargets: captureTargets,
    currentPlayer: cp,
    phaseLabel: phaseLabel,
    statusMessage: statusMessage,
    statusColor: statusColor,
    whiteOnBoard: whiteOnBoard,
    blackOnBoard: blackOnBoard,
    whiteToPlace: gameState.cowsToPlace.white,
    blackToPlace: gameState.cowsToPlace.black,
    whiteCaptured: gameState.cowsCaptured.white,
    blackCaptured: gameState.cowsCaptured.black,
    capturePending: gameState.capturePending,
  };
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

// socket auth middleware - tries to verify token if provided
// guests can still connect but wont have a verified username
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded; // { id, username }
      console.log(`Authenticated socket: ${decoded.username}`);
    } catch (err) {
      // bad token - let them connect as guest but log it
      console.log("Socket had invalid token, connecting as guest");
      socket.user = null;
    }
  } else {
    socket.user = null;
  }
  next();
});

io.on("connection", (socket) => {
  const authInfo = socket.user ? socket.user.username : "guest";
  console.log(`\nClient connected: ${socket.id} (${authInfo})`);

  let currentRoom = null;
  let playerName = null;

  socket.on("create-room", ({ username }) => {
    const code = generateRoomCode();
    playerName = username;
    currentRoom = code;

    const gameState = Engine.createGame("12-cow");

    rooms.set(code, {
      code: code,
      players: [
        {
          id: socket.id,
          username: username,
          socketId: socket.id,
          connected: true,
          playerNumber: 1,
        },
      ],
      gameState: gameState,
      status: "waiting",
      createdAt: Date.now(),
    });

    socket.join(code);
    console.log(`Room created: ${code} by ${username} (Player 1)`);
    socket.emit("room-created", code);
  });

  socket.on("join-room", ({ roomCode, username }) => {
    console.log(`\nJoin request: ${username} to room ${roomCode}`);
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit("error", "Room does not exist");
      return;
    }

    if (room.players.length >= 2) {
      socket.emit("error", "Room is full");
      return;
    }

    playerName = username;
    currentRoom = roomCode;

    room.players.push({
      id: socket.id,
      username: username,
      socketId: socket.id,
      connected: true,
      playerNumber: 2,
    });
    socket.join(roomCode);

    console.log(`${username} joined room ${roomCode} as Player 2`);
    socket.emit("join-success", roomCode);
    socket.to(roomCode).emit("player-joined", username);

    if (room.players.length === 2) {
      room.status = "playing";
      console.log(`\nSTARTING GAME in ${roomCode}`);

      const controllerState = getGameControllerState(room.gameState);

      room.players.forEach((player) => {
        const playerNum = player.playerNumber;
        const enginePlayer = playerNum === 1 ? "white" : "black";
        const isCurrentTurn = room.gameState.currentPlayer === enginePlayer;

        io.to(player.socketId).emit("player-assignment", {
          playerNumber: playerNum,
          currentTurn: isCurrentTurn,
        });

        io.to(player.socketId).emit("game-controller-state", controllerState);
      });

      io.to(roomCode).emit("game-start", {
        roomCode: roomCode,
        players: room.players.map((p) => p.username),
      });
    }
  });

  socket.on("game-move", ({ roomCode, move }) => {
    console.log(`\nMOVE RECEIVED in ${roomCode}`);
    console.log(`  Move: ${JSON.stringify(move)}`);
    console.log(`  From socket: ${socket.id}`);

    const room = rooms.get(roomCode);

    if (!room || room.status !== "playing") {
      socket.emit("error", "Game not in progress");
      return;
    }

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) {
      socket.emit("error", "Player not found");
      return;
    }

    const enginePlayer = player.playerNumber === 1 ? "white" : "black";

    console.log(`  Player: ${player.username} (${enginePlayer})`);
    console.log(`  Current turn: ${room.gameState.currentPlayer}`);
    console.log(`  Capture pending: ${room.gameState.capturePending}`);

    // CRITICAL FIX: Check turn FIRST
    if (enginePlayer !== room.gameState.currentPlayer) {
      console.log(
        `  REJECTED: Not your turn! Expected ${room.gameState.currentPlayer}`,
      );
      socket.emit("error", "Not your turn");
      return;
    }

    // Convert move to engine format
    let engineMove = null;
    let result = null;

    // If capture is pending, ONLY capture moves are allowed
    if (room.gameState.capturePending > 0) {
      console.log(`  Capture required! Looking for capture move...`);

      // Check if this is a capture move
      const targetNode =
        move.capture !== undefined
          ? move.capture
          : move.target !== undefined
            ? move.target
            : move.node !== undefined
              ? move.node
              : -1;

      if (targetNode === -1) {
        console.log(
          `  REJECTED: Not a capture move! You must capture an opponent's piece.`,
        );
        socket.emit("error", "You must capture an opponent's piece!");
        return;
      }

      console.log(`  Attempting capture of node ${targetNode}`);
      engineMove = {
        type: "capture",
        target: targetNode,
        player: enginePlayer,
      };
      result = Engine.applyMove(room.gameState, engineMove);
    }
    // Placement move (only allowed when no capture pending)
    else if (move.x !== undefined && move.y !== undefined) {
      const nodeId = getNodeIdFromCoordinates(move.x, move.y);
      if (nodeId !== -1) {
        console.log(`  Attempting placement at node ${nodeId}`);
        engineMove = { type: "placement", node: nodeId, player: enginePlayer };
        result = Engine.applyMove(room.gameState, engineMove);
      }
    }
    // Slide move (only allowed when no capture pending)
    else if (move.from !== undefined && move.to !== undefined) {
      console.log(`  Attempting slide from ${move.from} to ${move.to}`);
      engineMove = {
        type: "slide",
        from: move.from,
        to: move.to,
        player: enginePlayer,
      };
      result = Engine.applyMove(room.gameState, engineMove);
    } else {
      socket.emit("error", "Invalid move format");
      return;
    }

    if (!result || result.error) {
      console.log(`  REJECTED: ${result?.message || "Invalid move"}`);
      socket.emit("error", result?.message || "Invalid move");
      return;
    }

    // Update game state
    room.gameState = result;
    console.log(`  ACCEPTED: Move applied successfully`);

    // Get full game controller state
    const controllerState = getGameControllerState(room.gameState);

    if (controllerState.mills.length > 0) {
      console.log(`  Mills formed!`);
    }
    if (controllerState.capturePending > 0) {
      console.log(
        `  Capture required! ${controllerState.capturePending} capture(s) pending`,
      );
      console.log(
        `  Capture targets: ${controllerState.captureTargets.join(", ")}`,
      );
      console.log(`  ${enginePlayer} gets an extra turn to capture`);
    } else {
      console.log(
        `  Turn switched to ${controllerState.currentPlayer === "white" ? "Player 1" : "Player 2"}`,
      );
    }

    // Broadcast to opponent (simple move for board update)
    socket.to(roomCode).emit("opponent-move", {
      move: move,
      player: player.playerNumber,
    });

    // Confirm to sender
    socket.emit("move-confirmed", { success: true });

    // Send full game controller state to BOTH players
    io.to(roomCode).emit("game-controller-state", controllerState);

    // Check winner
    if (room.gameState.winner) {
      const winnerPlayer = room.players.find(
        (p) =>
          (room.gameState.winner === "white" && p.playerNumber === 1) ||
          (room.gameState.winner === "black" && p.playerNumber === 2),
      );
      const loserPlayer = room.players.find(p => p !== winnerPlayer);
      console.log(`  GAME OVER - Winner: ${winnerPlayer?.username}`);

      // update elo ratings for logged-in players
      const db = getDB();
      updateEloAfterGame(db, winnerPlayer?.username, loserPlayer?.username, function(eloResult) {
        io.to(roomCode).emit("game-over", {
          winner: winnerPlayer?.username,
          reason: room.gameState.winReason,
          elo: eloResult // null if guests, otherwise has the rating changes
        });
      });
    }
  });

  socket.on("reconnect-to-game", ({ roomCode, username }) => {
    console.log(`\nReconnect attempt: ${username} to room ${roomCode}`);
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit("error", "Game room not found");
      return;
    }

    const player = room.players.find((p) => p.username === username);

    if (player) {
      player.id = socket.id;
      player.socketId = socket.id;
      player.connected = true;
      socket.join(roomCode);
      currentRoom = roomCode;
      playerName = username;

      console.log(`${username} reconnected as Player ${player.playerNumber}`);

      const enginePlayer = player.playerNumber === 1 ? "white" : "black";
      const isCurrentTurn = room.gameState.currentPlayer === enginePlayer;
      const controllerState = getGameControllerState(room.gameState);

      socket.emit("reconnect-success", { roomCode, username });
      socket.emit("player-assignment", {
        playerNumber: player.playerNumber,
        currentTurn: isCurrentTurn,
      });
      socket.emit("game-controller-state", controllerState);

      const allConnected = room.players.every((p) => p.connected === true);
      if (allConnected && room.status === "playing") {
        io.to(roomCode).emit("resume-game");
      }
    } else {
      socket.emit("error", "Player not found");
    }
  });

  socket.on("disconnect", () => {
    console.log(`\nClient disconnected: ${socket.id}`);

    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        const player = room.players.find((p) => p.socketId === socket.id);
        if (player) {
          player.connected = false;
          console.log(
            `${player.username} disconnected from room ${currentRoom}`,
          );
          socket.to(currentRoom).emit("opponent-disconnected", {
            message: `${player.username} disconnected. Waiting for reconnect...`,
          });
        }
      }
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("\n====================================");
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
  console.log("====================================");
});
