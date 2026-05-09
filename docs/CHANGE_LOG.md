# Change Log: SRS/Proposal → Final Delivery

This document tracks what changed from the original project plan and SRS (February 27, 2026) to the final delivered system (May 2026).

## Requirements Added (Not in Original SRS)

| Feature | Why Added | When |
|---------|-----------|------|
| 50-move draw rule | Playtesting showed games could last forever | Week 9 |
| Per-move timer (60s) | Prevents stalling in online play | Week 9 |
| Resign button | Players needed a way to forfeit | Week 9 |
| Move sounds | Gameplay felt lifeless without audio feedback | Week 9 |
| Last-move highlight | Players couldn't tell what the opponent just did | Week 9 |
| Mill flash notification | Players missed that they formed a mill | Week 9 |
| Undo (local play) | Misclicks were frustrating with no way to revert | Week 9 |
| Password reset | Users who forgot passwords had no recovery path | Week 9 |
| Move hints (white dots) | New players didn't know where they could place/move | Week 7 |
| Variant selector in UI | Engine supported variants but UI had no way to choose | Week 9 |

## Requirements Modified

| Original Requirement | What Changed | Reason |
|---------------------|--------------|--------|
| Capture rule: "cannot capture cows in mills unless all are in mills" | Temporarily changed to "capture any cow", then reverted to standard | Tested both during gameplay, standard rule was more strategic |
| Elo starting rating: not specified | Set to 1200 (industry standard) | Needed a concrete value |
| AI difficulty: "Hard: a search-based framework" | Implemented full minimax with alpha-beta, iterative deepening, 1.8s limit | Original plan was vague; we went further |
| Online play: "server-authoritative" | Added timer, resign, disconnect timeout, room cleanup | Original plan didn't specify these but they're needed for a real game |

## Requirements Deferred (In SRS But Not Fully Delivered)

| Requirement | Status | Why Deferred |
|-------------|--------|--------------|
| Rated/Casual toggle | Not implemented | All online games are rated. Toggle adds UI complexity for minimal value in prototype |
| Match replay | Not implemented | Game moves not stored in sequence (only outcomes) |
| 9-cow without diagonals | Engine uses same adjacency for all variants | Would need a separate adjacency map; low priority |
| 6-cow reduced board | Engine uses full 24-node board with fewer pieces | Correct per Six Men's Morris rules |

## Architecture Changes

| Original Plan | What Actually Happened | Why |
|---------------|----------------------|-----|
| Engine as npm package shared by client and server | Engine bundled as IIFE for browser, server imports directly | No bundler available; IIFE was simplest solution |
| Independent subsystem development with post-hoc integration | Required significant integration layer (game-controller.js) | Subsystems made different assumptions about state shape |
| Backend handles Elo updates | Engine developer implemented Elo | Backend developer's implementation was incomplete |
| Frontend handles all UI logic independently | Game controller replaced 4 separate frontend files | Frontend had duplicated incomplete game logic |

## Timeline Deviations

| Planned | Actual | Impact |
|---------|--------|--------|
| Weeks 7-8: Auth + Online | Weeks 7-9: Integration + fixes + online debugging | 3 weeks instead of 2; scope was larger than estimated |
| Weeks 9-10: AI + Variants | AI done in Week 4; variants done in Week 9 | AI was ahead of schedule; variants were a late addition |
| Weeks 11-12: Testing + Finalisation | Testing done in Weeks 8-9; deployment in Week 9 | Compressed but delivered |
| 80 hours per person | 175 hours (engine dev), unknown (others) | Integration work was not anticipated in estimates |
