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
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());

const JWT_SECRET = "supersecretkey"; // Change for production

//auth routes
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: "Missing fields" });

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

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Please provide username and password" });
  }

  // Find user in database by username
  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (err)
        return res.status(500).json({ message: "Database error", error: err });
      if (!user)
        return res
          .status(401)
          .json({ message: "Invalid username or password" });

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res
          .status(401)
          .json({ message: "Invalid username or password" });

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username },
        "your_secret_key",
        { expiresIn: "1h" },
      );
      res.json({ message: "Login successful", token });
    },
  );
});

//Room routes
function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++)
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

app.post("/create-room", (req, res) => {
  let code = generateRoomCode();
  db.run("INSERT INTO rooms (code) VALUES (?)", [code], function (err) {
    if (err) return res.status(500).json({ error: "Could not create room" });
    res.json({ roomCode: code });
  });
});

//Socket.io
io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  socket.on("join-room", (roomCode) => {
    socket.join(roomCode);
    console.log(`${socket.id} joined room ${roomCode}`);
    io.to(roomCode).emit("message", `${socket.id} joined the room`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });
});

// Starting server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
