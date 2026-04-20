// const express = require("express");
// const cors = require("cors");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const { Server } = require("socket.io");
// const http = require("http");

// const app = express();
// const server = http.createServer(app);

// app.use(cors());
// app.use(express.json());

// const io = new Server(server, {
//   cors: {
//     origin: "http://127.0.0.1:5500",
//     methods: ["GET", "POST"],
//   },
// });

// const JWT_SECRET = "supersecretkey";
// const rooms = new Map();

// // Auth endpoints
// //User Registration
// app.post("/register", async (req, res) => {
//   const { username, email, password } = req.body;
//   if (!username || !email || !password) {
//     return res.status(400).json({ error: "Missing fields" });
//   }
//   const token = jwt.sign({ id: Date.now(), username }, JWT_SECRET);
//   res.json({ token, username, email });
// });

// //Login
// app.post("/login", (req, res) => {
//   const { username, password } = req.body;
//   if (!username || !password) {
//     return res.status(400).json({ error: "Missing fields" });
//   }
//   const token = jwt.sign({ id: Date.now(), username }, JWT_SECRET);
//   res.json({ message: "Login successful", token });
// });

// function generateRoomCode() {
//   return Math.random().toString(36).substring(2, 6).toUpperCase();
// }

// // Debug function to log room state
// function logRoomState(roomCode) {
//   const room = rooms.get(roomCode);
//   if (room) {
//     console.log(`\nROOM STATE: ${roomCode}`);
//     console.log(`  Status: ${room.status}`);
//     console.log(`  Current Turn: Player ${room.currentTurn}`);
//     console.log(`  Players:`);
//     room.players.forEach((p) => {
//       console.log(
//         `    - ${p.username} (Player ${p.playerNumber}): ${p.connected ? " Connected" : "Disconnected"}`,
//       );
//     });
//     console.log(`  Total Players: ${room.players.length}`);
//     console.log(`  Game Starting: ${room.gameStarting || false}\n`);
//   }
// }

// io.on("connection", (socket) => {
//   console.log(`\nClient connected: ${socket.id}`);

//   let currentRoom = null;
//   let playerName = null;

//   // CREATE ROOM
//   socket.on("create-room", ({ username }) => {
//     const code = generateRoomCode();
//     playerName = username;
//     currentRoom = code;

//     rooms.set(code, {
//       code: code,
//       players: [
//         {
//           id: socket.id,
//           username: username,
//           socketId: socket.id,
//           connected: true,
//           playerNumber: 1,
//         },
//       ],
//       status: "waiting",
//       createdAt: Date.now(),
//       currentTurn: 1,
//     });

//     socket.join(code);
//     console.log(`Room created: ${code} by ${username} (Player 1)`);
//     logRoomState(code);
//     socket.emit("room-created", code);
//   });

//   // JOIN ROOM
//   socket.on("join-room", ({ roomCode, username }) => {
//     console.log(`\nJoin request: ${username} to room ${roomCode}`);
//     const room = rooms.get(roomCode);

//     if (!room) {
//       console.log(` Room ${roomCode} not found`);
//       socket.emit("error", "Room does not exist");
//       return;
//     }

//     if (room.players.length >= 2) {
//       console.log(` Room ${roomCode} is full`);
//       socket.emit("error", "Room is full");
//       return;
//     }

//     playerName = username;
//     currentRoom = roomCode;

//     room.players.push({
//       id: socket.id,
//       username: username,
//       socketId: socket.id,
//       connected: true,
//       playerNumber: 2,
//     });
//     socket.join(roomCode);

//     console.log(` ${username} joined room ${roomCode} as Player 2`);
//     logRoomState(roomCode);
//     socket.emit("join-success", roomCode);

//     // Notify host
//     socket.to(roomCode).emit("player-joined", username);

//     // START GAME when 2 players
//     if (room.players.length === 2) {
//       room.status = "playing";
//       console.log(`\n STARTING GAME in ${roomCode}!!!`);

//       // Assign player numbers and send to both players
//       room.players.forEach((player) => {
//         const playerNum = player.playerNumber;
//         const isCurrentTurn = room.currentTurn === playerNum;

//         console.log(
//           `  Sending assignment to ${player.username}: Player ${playerNum}, Current turn: ${isCurrentTurn}`,
//         );

//         io.to(player.socketId).emit("player-assignment", {
//           playerNumber: playerNum,
//           currentTurn: isCurrentTurn,
//         });
//       });

//       room.gameStarting = true;

//       // Send start signal
//       io.to(roomCode).emit("game-start", {
//         roomCode: roomCode,
//         players: room.players.map((p) => p.username),
//       });

//       logRoomState(roomCode);

//       setTimeout(() => {
//         if (room) room.gameStarting = false;
//       }, 10000);
//     }
//   });

//   // GAME MOVE
//   socket.on("game-move", ({ roomCode, move }) => {
//     console.log(`\nMOVE RECEIVED in ${roomCode}`);
//     console.log(`  Move: ${JSON.stringify(move)}`);
//     console.log(`  From socket: ${socket.id}`);

//     const room = rooms.get(roomCode);

//     if (!room) {
//       console.log(`Room ${roomCode} not found`);
//       socket.emit("error", "Game not in progress");
//       return;
//     }

//     if (room.status !== "playing") {
//       console.log(` Game not in playing state: ${room.status}`);
//       socket.emit("error", "Game not in progress");
//       return;
//     }

//     // Find the player
//     const player = room.players.find((p) => p.socketId === socket.id);
//     if (!player) {
//       console.log(`Player not found in room`);
//       socket.emit("error", "Player not found");
//       return;
//     }

//     console.log(`  Player: ${player.username} (Player ${player.playerNumber})`);
//     console.log(`  Current turn: Player ${room.currentTurn}`);

//     // Check turn
//     if (room.currentTurn !== player.playerNumber) {
//       console.log(
//         `Invalid turn! Expected Player ${room.currentTurn}, got Player ${player.playerNumber}`,
//       );
//       socket.emit("error", "Not your turn");
//       return;
//     }

//     console.log(`Valid move, broadcasting to opponent...`);

//     // Broadcast to opponent
//     socket.to(roomCode).emit("opponent-move", {
//       move: move,
//       player: player.playerNumber,
//     });

//     // Confirm to sender
//     socket.emit("move-confirmed", { success: true });

//     // Switch turn
//     const oldTurn = room.currentTurn;
//     room.currentTurn = room.currentTurn === 1 ? 2 : 1;
//     console.log(
//       `  Turn switched: Player ${oldTurn} → Player ${room.currentTurn}`,
//     );

//     logRoomState(roomCode);
//   });

//   // RECONNECT
//   socket.on("reconnect-to-game", ({ roomCode, username }) => {
//     console.log(`\n Reconnect attempt: ${username} to room ${roomCode}`);
//     const room = rooms.get(roomCode);

//     if (!room) {
//       console.log(` Room ${roomCode} not found`);
//       socket.emit("error", "Game room not found");
//       return;
//     }

//     const player = room.players.find((p) => p.username === username);

//     if (player) {
//       player.id = socket.id;
//       player.socketId = socket.id;
//       player.connected = true;
//       socket.join(roomCode);
//       currentRoom = roomCode;
//       playerName = username;

//       console.log(`${username} reconnected as Player ${player.playerNumber}`);

//       const isCurrentTurn = room.currentTurn === player.playerNumber;
//       socket.emit("reconnect-success", { roomCode, username });
//       socket.emit("player-assignment", {
//         playerNumber: player.playerNumber,
//         currentTurn: isCurrentTurn,
//       });

//       logRoomState(roomCode);

//       const allConnected = room.players.every((p) => p.connected === true);
//       if (allConnected && room.status === "playing") {
//         console.log(`Both players ready, resuming game`);
//         io.to(roomCode).emit("resume-game");
//       }
//     } else {
//       console.log(` Player ${username} not found in room`);
//       socket.emit("error", "Player not found");
//     }
//   });

//   // DISCONNECT
//   socket.on("disconnect", () => {
//     console.log(`\n Client disconnected: ${socket.id}`);

//     if (currentRoom) {
//       const room = rooms.get(currentRoom);
//       if (room) {
//         const player = room.players.find((p) => p.socketId === socket.id);
//         if (player) {
//           player.connected = false;
//           console.log(
//             `${player.username} (Player ${player.playerNumber}) disconnected from room ${currentRoom}`,
//           );
//           logRoomState(currentRoom);

//           // Notify other player
//           socket.to(currentRoom).emit("opponent-disconnected", {
//             message: `${player.username} disconnected. Waiting for reconnect...`,
//           });
//         }
//       }
//     }
//   });
// });

// server.listen(3000, "0.0.0.0", () => {
//   console.log("\n====================================");
//   console.log("DEBUG SERVER RUNNING ON PORT 3000");
//   console.log("====================================\n");
// });

//====Working is above
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const http = require("http");
const Engine = require("./engine-server");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "http://127.0.0.1:5500",
    methods: ["GET", "POST"],
  },
});

const JWT_SECRET = "supersecretkey";
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

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const token = jwt.sign({ id: Date.now(), username }, JWT_SECRET);
  res.json({ token, username, email });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const token = jwt.sign({ id: Date.now(), username }, JWT_SECRET);
  res.json({ message: "Login successful", token });
});

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

io.on("connection", (socket) => {
  console.log(`\nClient connected: ${socket.id}`);

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
      console.log(`  GAME OVER - Winner: ${winnerPlayer?.username}`);
      io.to(roomCode).emit("game-over", {
        winner: winnerPlayer?.username,
        reason: room.gameState.winReason,
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

server.listen(3000, "0.0.0.0", () => {
  console.log("\n====================================");
  console.log("SERVER RUNNING ON PORT 3000");
  console.log("====================================");
});
