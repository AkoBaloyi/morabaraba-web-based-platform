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

// password reset (verify username + email, then set new password)
router.post("/reset-password", (req, res) => {
  const { username, email, newPassword } = req.body;
  if (!username || !email || !newPassword) {
    return res.status(400).json({ error: "All fields required" });
  }
  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }
  const db = getDB();
  const bcrypt = require("bcryptjs");
  db.get(
    "SELECT id FROM users WHERE username = ? AND email = ?",
    [username, email],
    (err, user) => {
      if (err || !user)
        return res
          .status(404)
          .json({ error: "No account found with that username and email" });
      const hashed = bcrypt.hashSync(newPassword, 10);
      db.run(
        "UPDATE users SET password = ? WHERE id = ?",
        [hashed, user.id],
        (err) => {
          if (err)
            return res.status(500).json({ error: "Failed to reset password" });
          res.json({
            message: "Password reset successful. You can now login.",
          });
        },
      );
    },
  );
});

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

// match history for a player
// router.get("/match-history/:username", (req, res) => {
//   const db = getDB();
//   const username = req.params.username;
//   db.all(
//     `SELECT g.room_code, g.ended_at, g.player1_name as player1, g.player2_name as player2, g.winner_name as winner
//     FROM games g
//     WHERE g.status = 'completed'
//       AND (g.player1_name = ? OR g.player2_name = ?)
//     ORDER BY g.ended_at DESC LIMIT 20`,
//     [username, username],
//     (err, rows) => {
//       if (err) return res.json({ success: false, data: [] });
//       const data = (rows || []).map((row) => ({
//         opponent: row.player1 === username ? row.player2 : row.player1,
//         result: row.winner === username ? "win" : "loss",
//         date: row.ended_at || "Unknown",
//       }));
//       res.json({ success: true, data: data });
//     }
//   );
// });

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
      if (err)
        return res
          .status(500)
          .json({ success: false, error: "Database error" });
      const data = (rows || []).map((row, i) => ({
        rank: i + 1,
        username: row.username,
        elo: row.elo,
        totalGames: row.totalGames || "-",
        wins: row.wins || "-",
        losses: row.losses || "-",
        draws: "-",
      }));
      res.json({ success: true, data: data });
    },
  );
});

module.exports = router;
