const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./database/db");
const { Server } = require("socket.io");
const http = require("http");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());

const JWT_SECRET = "supersecretkey";

/* ---------------- AUTH () ---------------- */

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const hashed = await bcrypt.hash(password, 10);

  const stmt = db.prepare(
    "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
  );

  stmt.run(username, email, hashed, function (err) {
    if (err) return res.status(400).json({ error: "User already exists" });

    const token = jwt.sign({ id: this.lastID }, JWT_SECRET);
    res.json({ token, username, email });
  });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (!user) return res.status(401).json({ message: "Invalid login" });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ message: "Invalid login" });

      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: "1h" },
      );

      res.json({ message: "Login successful", token });
    },
  );
});

/* ---------------- ROOM MATCHING ONLY ---------------- */

const rooms = {};

function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  /* CREATE ROOM */
  socket.on("create-room", () => {
    const code = generateRoomCode();

    console.log("Host created room:", code);

    rooms[code] = {
      players: [],
    };

    socket.join(code);
    rooms[code].players.push({ id: socket.id, username: "host" });
    socket.emit("room-created", code);
  });

  /* JOIN ROOM */
  socket.on("join-room", ({ roomCode, username }) => {
    const room = rooms[roomCode];

    if (!room) {
      console.log("Room not found");
      socket.emit("invalid-room", "Room does not exist");
      return;
    }

    if (room.players.length >= 2) {
      socket.emit("invalid-room", "Room full");
      return;
    }

    room.players.push({ id: socket.id, username });

    socket.join(roomCode);

    socket.emit("joined-room", roomCode);

    io.to(roomCode).emit("player-joined", username);

    /* START GAME (JUST REDIRECT SIGNAL) */
    if (room.players.length === 2) {
      console.log("Starting game for room:", room);
      io.to(roomCode).emit("start-game", roomCode);
    }
  });

  /* CLEANUP */
  socket.on("disconnect", () => {
    for (const code in rooms) {
      rooms[code].players = rooms[code].players.filter(
        (p) => p.id !== socket.id,
      );

      if (rooms[code].players.length === 0) {
        delete rooms[code];
      } else {
        io.to(code).emit("player-left");
      }
    }
  });

  // ===============================
  // REALTIME MOVE SYNC FROM THIS SERVER
  // ===============================

  socket.on("gameMove", (data) => {
    console.log("Move received", data);
    const { room, move } = data;

    // Send move to the OTHER player in the room
    socket.to(room).emit("gameMove", {
      move,
    });
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
