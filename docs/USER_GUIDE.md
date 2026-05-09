# User Guide — Morabaraba

## How to Play

Morabaraba is a two-player strategy board game. The goal is to reduce your opponent to fewer than 3 cows, or block all their moves.

### The Board
The board has 24 intersection points arranged in three concentric squares connected by lines (including diagonals). Pieces ("cows") are placed and moved along these lines.

### Game Phases

**Phase 1: Placement**
- Each player takes turns placing one cow at a time on any empty intersection
- Standard game: 12 cows each
- Try to form "mills" (three cows in a straight line)

**Phase 2: Movement**
- Once all cows are placed, players take turns sliding one cow along a line to an adjacent empty point
- Continue trying to form mills

**Phase 3: Flying**
- When a player is reduced to exactly 3 cows, they can "fly" — move a cow to ANY empty point, not just adjacent ones

### Mills and Capturing
- When you form a mill (3 in a row along any line), you immediately capture one of your opponent's cows
- You cannot capture a cow that is part of a mill, UNLESS all opponent cows are in mills
- The same mill can be broken and re-formed to capture again

### Winning
- Reduce your opponent to 2 cows (they can no longer form mills)
- Block all your opponent's moves (they have no legal move available)
- If 50 moves pass without any capture, the game is a draw

## Game Modes

### Local Play (Human vs Human)
- Open the homepage and click "Local Play" → "Play Friend"
- Two players share one device, taking turns clicking the board
- Use the "Undo" button to take back the last move

### AI Play
- Click "Local Play" → "Play AI" → choose difficulty
- **Easy**: makes random moves (good for learning)
- **Medium**: tries to form mills and block yours
- **Hard**: thinks deeply using game tree search (may take 1-2 seconds per move)

### Online Play
- Click "Online Play" → "Create Room" to get a room code
- Share the code with your opponent
- They click "Online Play" → "Join Room" → enter the code
- 60 seconds per move — if time runs out, you lose
- Click "Resign" to forfeit the game

### Variant Selection
- Use the dropdown below the board to switch between:
  - **12 Cow** (Standard Morabaraba)
  - **9 Cow** (Nine Men's Morris)
  - **6 Cow** (Six Men's Morris)

## Visual Indicators

| Indicator | Meaning |
|-----------|---------|
| White dots | Valid places you can move/place |
| Red rings | Opponent cows you can capture |
| Green ring | Your selected cow (during movement) |
| Yellow ring | The last move that was made |
| ⚡ MILL! | You just formed a mill — capture a cow! |

## Accounts and Ratings

- Click "Log-in" on the homepage to create an account or sign in
- Online games update your Elo rating (starting at 1200)
- Check the Leaderboard to see top players
- Your rating shows next to your name after logging in

## Remote Testing

To play online from different locations:
1. One person runs the server with ngrok (see README for setup)
2. Edit `front-end/config.js` and change `SERVER_URL` to the ngrok URL
3. Both players open the homepage through their browser
4. Create/join rooms as normal
