const { getDB } = require("../database/db");

function generateRoomCode(length = 4) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < length; i++)
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function createRoom(req, res) {
  const db = getDB();
  let code = generateRoomCode();

  db.run("INSERT INTO rooms (code) VALUES (?)", [code], function (err) {
    if (err) return res.status(500).json({ error: "Failed to create room" });
    res.json({ message: "Room created", code });
  });
}

module.exports = { createRoom };
