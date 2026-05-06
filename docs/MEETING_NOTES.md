# Meeting Notes

## Week 2 — Feb 10, 2026
**Attendees:** Ako, Boitumelo, Kopano
**Decisions:**
- Agreed on tech stack: vanilla JS + Canvas for frontend, Node.js + Socket.IO for backend, SQLite for storage
- Divided responsibilities: Ako = engine, Boitumelo = backend, Kopano = frontend
- Agreed to use GitHub with feature branches and Slack for communication
- Set MVP scope: local play + online play + accounts + Elo

## Week 4 — Feb 24, 2026
**Attendees:** Ako, Boitumelo, Kopano
**Decisions:**
- Engine core complete, moving to AI implementation
- Frontend has basic board rendering working
- Backend starting on auth endpoints
- Agreed on 12-cow as default variant, others as stretch goals

## Week 6 — Mar 12, 2026
**Attendees:** Ako, Boitumelo, Kopano
**Decisions:**
- Integration starting: engine needs to be bundled for browser
- Decided on IIFE approach (no webpack)
- Identified that frontend had duplicated game logic that needs replacing
- Backend has room creation working via Socket.IO

## Week 7 — Apr 17, 2026
**Attendees:** Ako, Boitumelo, Kopano
**Decisions:**
- Integration revealed server engine was divergent from client engine
- Security audit identified 5 vulnerabilities
- Agreed to fix critical issues before adding new features
- Ako taking on integration fixes due to cross-subsystem knowledge

## Week 9 — Apr 24, 2026
**Attendees:** Ako, Boitumelo, Kopano
**Decisions:**
- Elo system implemented and working
- Online play stable after state sync fix
- Agreed on final submission priorities: documentation, testing, polish
- Frontend adding game-over modal and tutorial videos
