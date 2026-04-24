const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDB } = require("../database/db");

// use the same secret everywhere - loaded from .env in server.js
const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret";

async function registerUser(req, res) {
  const { username, email, password } = req.body;

  // basic validation so we dont get garbage in the db
  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: "Username must be 3-20 characters" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  // simple email check - not perfect but catches obvious mistakes
  if (!email.includes("@") || !email.includes(".")) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  const db = getDB();
  const hashed = bcrypt.hashSync(password, 10);

  db.run(
    "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
    [username.trim(), email.trim().toLowerCase(), hashed],
    function (err) {
      if (err) return res.status(400).json({ error: "Username or email already taken" });
      res.json({ message: "Registered successfully" });
    },
  );
}

async function loginUser(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const db = getDB();

  db.get("SELECT * FROM users WHERE username = ?", [username.trim()], (err, user) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "2h" });
    res.json({ message: "Login successful", token, username: user.username });
  });
}

// middleware to check if a request has a valid token
// use this on routes that need the user to be logged in
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // now req.user.id and req.user.username are available
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { registerUser, loginUser, verifyToken, JWT_SECRET };
