// Elo rating calculation
// K = 32 is standard for most rating systems
// formula: newRating = oldRating + K * (actual - expected)
// where expected = 1 / (1 + 10^((opponentElo - playerElo) / 400))

const K = 32;

function calculateExpected(playerElo, opponentElo) {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

// returns { winnerNewElo, loserNewElo, winnerChange, loserChange }
function calculateNewRatings(winnerElo, loserElo) {
  var winnerExpected = calculateExpected(winnerElo, loserElo);
  var loserExpected = calculateExpected(loserElo, winnerElo);

  var winnerNew = Math.round(winnerElo + K * (1 - winnerExpected));
  var loserNew = Math.round(loserElo + K * (0 - loserExpected));

  // dont let elo go below 100
  if (loserNew < 100) loserNew = 100;

  return {
    winnerNewElo: winnerNew,
    loserNewElo: loserNew,
    winnerChange: winnerNew - winnerElo,
    loserChange: loserNew - loserElo
  };
}

// updates both players elo in the database after a game
// callback gets { winnerElo, loserElo, winnerChange, loserChange } or null if players arent registered
function updateEloAfterGame(db, winnerUsername, loserUsername, callback) {
  // look up both players
  db.get("SELECT id, elo FROM users WHERE username = ?", [winnerUsername], function(err, winner) {
    if (err || !winner) {
      console.log("Winner not found in db (probably a guest), skipping elo update");
      if (callback) callback(null);
      return;
    }

    db.get("SELECT id, elo FROM users WHERE username = ?", [loserUsername], function(err, loser) {
      if (err || !loser) {
        console.log("Loser not found in db (probably a guest), skipping elo update");
        if (callback) callback(null);
        return;
      }

      var result = calculateNewRatings(winner.elo, loser.elo);

      // update both
      db.run("UPDATE users SET elo = ? WHERE id = ?", [result.winnerNewElo, winner.id]);
      db.run("UPDATE users SET elo = ? WHERE id = ?", [result.loserNewElo, loser.id]);

      console.log("Elo updated: " + winnerUsername + " " + winner.elo + " -> " + result.winnerNewElo +
        ", " + loserUsername + " " + loser.elo + " -> " + result.loserNewElo);

      if (callback) callback({
        winnerElo: result.winnerNewElo,
        loserElo: result.loserNewElo,
        winnerChange: result.winnerChange,
        loserChange: result.loserChange
      });
    });
  });
}

module.exports = { calculateNewRatings, updateEloAfterGame };
