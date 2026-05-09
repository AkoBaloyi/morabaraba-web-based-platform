# Integration and System Test Procedures

These tests were performed manually during development. They document the procedures used to verify cross-component behaviour that unit tests cannot cover.

## Integration Tests (Component Interactions)

### IT-01: Engine-to-Frontend Integration
**Procedure:** Open HumanVSHuman page, place cows alternating turns, form a mill, capture, continue to movement phase, win the game.
**Expected:** All phases work, mill triggers capture mode, win shows modal.
**Result:** PASS
**Date:** April 22, 2026

### IT-02: Engine-to-AI Integration
**Procedure:** Open Easy AI page, place a cow, wait for AI response.
**Expected:** AI places a cow on an empty node within 1 second.
**Result:** PASS
**Date:** April 22, 2026

### IT-03: Hard AI Web Worker
**Procedure:** Open Hard AI page, place a cow, observe UI responsiveness during AI thinking.
**Expected:** UI remains responsive (can hover), "AI is thinking..." shows, AI responds within 2 seconds.
**Result:** PASS
**Date:** May 6, 2026

### IT-04: Server Engine Validation
**Procedure:** In online play, attempt to place on an occupied node.
**Expected:** Server rejects the move, client shows error, game state unchanged.
**Result:** PASS
**Date:** April 23, 2026

### IT-05: Socket State Synchronisation
**Procedure:** Two browser tabs in same room. Player 1 places a cow.
**Expected:** Player 2's board updates within 1 second without refresh.
**Result:** PASS (after fix in Week 8)
**Date:** April 23, 2026

### IT-06: Authentication Flow
**Procedure:** Register new account, login, verify token stored, create online room.
**Expected:** Registration succeeds, login returns token, room creation works.
**Result:** PASS
**Date:** May 6, 2026

### IT-07: Elo Update After Game
**Procedure:** Two logged-in players complete an online game.
**Expected:** Winner's Elo increases, loser's Elo decreases, leaderboard reflects changes.
**Result:** PASS
**Date:** May 9, 2026

### IT-08: Variant Selector
**Procedure:** Select "9 Cow" from dropdown, start game.
**Expected:** Each player has 9 cows to place (not 12).
**Result:** PASS
**Date:** May 6, 2026

## System Tests (End-to-End Flows)

### ST-01: Full Local Game
**Steps:**
1. Open homepage → Local Play → Play Friend
2. Place 12 cows each (alternating)
3. Move cows to form mills
4. Capture opponent cows until one player has < 3
5. Verify win modal appears

**Expected:** Complete game playable from start to finish with correct rule enforcement.
**Result:** PASS
**Date:** May 6, 2026

### ST-02: Full Online Game
**Steps:**
1. Open homepage → Login (both players)
2. Player 1: Online Play → Create Room → note code
3. Player 2: Online Play → Join Room → enter code
4. Both players place cows, form mills, capture
5. One player wins
6. Verify game-over modal shows on both sides
7. Verify Elo updated for both players
8. Verify match appears in history

**Expected:** Complete online game with server validation, timer, and post-game updates.
**Result:** PASS
**Date:** May 9, 2026

### ST-03: Resign Flow
**Steps:**
1. Start online game (two players logged in)
2. Play a few moves
3. One player clicks Resign → confirms
4. Verify opponent sees "You Win" modal
5. Verify Elo updates correctly

**Expected:** Resign ends game properly with correct attribution.
**Result:** PASS
**Date:** May 9, 2026

### ST-04: Timer Expiry
**Steps:**
1. Start online game
2. One player does not move for 60 seconds
3. Verify game ends with timeout

**Expected:** Player who ran out of time loses, opponent wins.
**Result:** PASS
**Date:** May 9, 2026

### ST-05: Disconnect Recovery
**Steps:**
1. Start online game, play a few moves
2. One player closes tab
3. Wait 30 seconds
4. Verify remaining player wins

**Expected:** Disconnected player forfeits after timeout.
**Result:** PASS
**Date:** May 9, 2026

### ST-06: Password Reset
**Steps:**
1. Register account with known email
2. Use /reset-password endpoint with correct username + email + new password
3. Login with new password

**Expected:** Password changes, old password rejected, new password works.
**Result:** PASS
**Date:** May 9, 2026

### ST-07: Draw Detection
**Steps:**
1. Set up a local game in movement phase
2. Make 50 moves without any capture
3. Verify game ends as draw

**Expected:** "Draw" modal appears after 50 moves without capture.
**Result:** PASS (verified via unit test; manual test impractical due to move count)
**Date:** May 6, 2026

## Test Summary

| Level | Automated | Manual | Total |
|-------|-----------|--------|-------|
| Unit | 95 | 0 | 95 |
| Integration | 0 | 8 | 8 |
| System | 0 | 7 | 7 |
| **Total** | **95** | **15** | **110** |

## Known Gaps

- No automated integration or system tests (would require socket.io-client test harness)
- No load testing (concurrent games)
- No security penetration testing
- AI strategic quality not verified quantitatively
