const roomCode = new URLSearchParams(window.location.search).get("room");

const socket = io("http://localhost:3000");

let isApplyingRemoteMove = false;

console.log("[Online] Client starting...");

// ========================================
// JOIN ROOM
// ========================================
socket.on("connect", () => {
  if (!roomCode) {
    console.error("No room code in URL");
    return;
  }

  socket.emit("join-room", {
    roomCode: roomCode,
    username: "player",
  });

  console.log("[Online] Joining room:", roomCode);
});

// ========================================
// READY
// ========================================
window.addEventListener("load", () => {
  console.log("[Online] Board loaded");
});

// ========================================
// SEND MOVE (THIS IS THE IMPORTANT PART)
// ========================================

// CALL THIS AFTER EVERY VALID MOVE FROM YOUR GAME LOGIC
window.sendMoveToServer = function () {
  //if (isApplyingRemoteMove) return;

  socket.emit("gameMove", {
    room: roomCode,
    move: {
      p1: window.occupiedPointsP1,
      p2: window.occupiedPointsP2,
      turn: window.Player,
    },
  });

  console.log("[Online] Move sent to server");
};

// ========================================
// RECEIVE MOVE FROM SERVER
// ========================================
socket.on("gameMove", ({ move }) => {
  if (!move) return;

  console.log("[Online] Move received");

  isApplyingRemoteMove = true;

  window.occupiedPointsP1 = move.p1;
  window.occupiedPointsP2 = move.p2;
  window.Player = move.turn;

  if (typeof drawBoard === "function") {
    drawBoard();
  }

  isApplyingRemoteMove = false;
});

// ========================================
// PLAYER JOIN INFO
// ========================================
socket.on("player-joined", (name) => {
  console.log("[Online] Player joined:", name);
});

socket.on("player-left", () => {
  console.log("[Online] Opponent left");
  alert("Opponent disconnected");
});
