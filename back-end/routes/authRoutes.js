const express = require("express");
const { registerUser, loginUser, verifyToken } = require("../controllers/authController");
const { getDB } = require("../database/db");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

// get your own profile (needs token)
router.get("/profile", verifyToken, (req, res) => {
  const db = getDB();
  db.get("SELECT username, elo FROM users WHERE id = ?", [req.user.id], (err, user) => {
    if (err || !user) return res.status(404).json({ error: "User not found" });
    res.json({ username: user.username, elo: user.elo });
  });
});

// leaderboard - top 20 players by elo
router.get("/leaderboard", (req, res) => {
  const db = getDB();
  db.all("SELECT username, elo FROM users ORDER BY elo DESC LIMIT 20", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows || []);
  });
});

module.exports = router;
