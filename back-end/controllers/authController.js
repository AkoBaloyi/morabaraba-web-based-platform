const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDB } = require("../database/db");

const SECRET = "mysecretkey";

async function registerUser(req, res) {
  const { username, email, password } = req.body;
  const db = getDB();
  const hashed = bcrypt.hashSync(password, 10);

  db.run(
    "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
    [username, email, hashed],
    function (err) {
      if (err) return res.status(400).json({ error: "User already exists." });
      res.json({ message: "User registered successfully." });
    },
  );
}

async function loginUser(req, res) {
  const { username, password } = req.body;
  const db = getDB();

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "1h" });
    res.json({ message: "Login successful", token });
  });
}

module.exports = { registerUser, loginUser };
