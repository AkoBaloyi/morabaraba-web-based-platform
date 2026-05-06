const express = require("express");
const {
  registerUser,
  loginUser,
  verifyToken,
} = require("../controllers/authController");
const { getDB } = require("../database/db");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

// get your own profile (needs token)
router.get("/profile", verifyToken, (req, res) => {
  const db = getDB();
  db.get(
    "SELECT username, elo FROM users WHERE id = ?",
    [req.user.id],
    (err, user) => {
      if (err || !user)
        return res.status(404).json({ error: "User not found" });
      res.json({ username: user.username, elo: user.elo });
    },
  );
});

// leaderboard - top 20 players by elo
router.get("/leaderboard", (req, res) => {
  const db = getDB();
  // count wins and losses from the games table
  db.all(
    `SELECT u.username, u.elo,
      (SELECT COUNT(*) FROM games g WHERE g.winner_id = u.id AND g.status = 'completed') as wins,
      (SELECT COUNT(*) FROM games g WHERE (g.player1_id = u.id OR g.player2_id = u.id) AND g.winner_id != u.id AND g.status = 'completed') as losses,
      (SELECT COUNT(*) FROM games g WHERE (g.player1_id = u.id OR g.player2_id = u.id) AND g.status = 'completed') as totalGames
    FROM users u ORDER BY u.elo DESC LIMIT 20`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: "Database error" });
      const data = (rows || []).map((row, i) => ({
        rank: i + 1,
        username: row.username,
        elo: row.elo,
        totalGames: row.totalGames || "-",
        wins: row.wins || "-",
        losses: row.losses || "-",
        draws: "-"
      }));
      res.json({ success: true, data: data });
    },
  );
});

module.exports = router;
