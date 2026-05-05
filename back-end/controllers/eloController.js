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
  if (winnerNew < 100) winnerNew = 100;

  return {
    winnerNewElo: winnerNew,
    loserNewElo: loserNew,
    winnerChange: winnerNew - winnerElo,
    loserChange: loserNew - loserElo,
  };
}

// updates both players elo in the database after a game
function updateEloAfterGame(
  db,
  winnerUsername,
  loserUsername,
  isDraw = false,
  callback,
) {
  console.log(
    `updateEloAfterGame called: winner=${winnerUsername}, loser=${loserUsername}, isDraw=${isDraw}`,
  );

  // look up winner
  db.get(
    "SELECT id, elo, wins, losses, draws, total_games FROM users WHERE username = ?",
    [winnerUsername],
    function (err, winner) {
      if (err || !winner) {
        console.log(
          "Winner not found in db (probably a guest), skipping elo update",
        );
        if (callback) callback(null);
        return;
      }

      // look up loser
      db.get(
        "SELECT id, elo, wins, losses, draws, total_games FROM users WHERE username = ?",
        [loserUsername],
        function (err, loser) {
          if (err || !loser) {
            console.log(
              "Loser not found in db (probably a guest), skipping elo update",
            );
            if (callback) callback(null);
            return;
          }

          console.log(
            `Winner current Elo: ${winner.elo}, Loser current Elo: ${loser.elo}`,
          );

          if (isDraw) {
            // Draw logic - Elo doesn't change much
            var winnerNewElo = winner.elo;
            var loserNewElo = loser.elo;
            var winnerChange = 0;
            var loserChange = 0;

            // Update stats for draw
            db.run(
              "UPDATE users SET draws = ?, total_games = total_games + 1 WHERE id = ?",
              [(winner.draws || 0) + 1, winner.id],
            );
            db.run(
              "UPDATE users SET draws = ?, total_games = total_games + 1 WHERE id = ?",
              [(loser.draws || 0) + 1, loser.id],
            );

            console.log(`Draw recorded: ${winnerUsername} vs ${loserUsername}`);
          } else {
            // Calculate new Elo ratings
            var result = calculateNewRatings(winner.elo, loser.elo);
            var winnerNewElo = result.winnerNewElo;
            var loserNewElo = result.loserNewElo;
            var winnerChange = result.winnerChange;
            var loserChange = result.loserChange;

            console.log(
              `New Elo: Winner ${winnerNewElo} (${winnerChange > 0 ? "+" : ""}${winnerChange}), Loser ${loserNewElo} (${loserChange > 0 ? "+" : ""}${loserChange})`,
            );

            // Update stats for win/loss
            db.run(
              "UPDATE users SET elo = ?, wins = ?, total_games = total_games + 1 WHERE id = ?",
              [winnerNewElo, (winner.wins || 0) + 1, winner.id],
            );
            db.run(
              "UPDATE users SET elo = ?, losses = ?, total_games = total_games + 1 WHERE id = ?",
              [loserNewElo, (loser.losses || 0) + 1, loser.id],
            );
          }

          console.log(
            `Stats updated for ${winnerUsername} and ${loserUsername}`,
          );

          if (callback) {
            callback({
              winnerElo: winnerNewElo,
              loserElo: loserNewElo,
              winnerChange: winnerChange,
              loserChange: loserChange,
              isDraw: isDraw,
            });
          }
        },
      );
    },
  );
}

module.exports = { calculateNewRatings, updateEloAfterGame };
