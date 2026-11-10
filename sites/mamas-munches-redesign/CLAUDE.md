# Mama's Munches redesign: client context

Redesign of Mama's Munches (lactation cookies and gifts for breastfeeding mums, Birmingham), built fresh on its own test site from a Claude Design draft. Business facts: `sites/mamas-munches/CLAUDE.md` (the canary's folder). Brand tokens: this folder's `theme-snapshot.json`, not the old file's approximate palette. Nothing here changes the canary. Framework rules are in the root `CLAUDE.md`.

- **The draft:** `handoff/`, the Claude Design export kept unchanged (Spec 48A; check it with `node scripts/computed-route/handoff-check.mjs sites/mamas-munches-redesign/handoff`): one `.dc.html` per page linked by file name, entry `Home.dc.html`, basket state in `store.js`. Its `README.md` and `READING-DC-FILES.md` explain the design and the code.
- **Kept beside it:** `theme-snapshot.json` (tokens, pushed by `push-theme-snapshot.py`), `media/photography/wp-media-library/` (real product photos) and `media/brand/` (logo originals).
- **Test site:** deploy target `mamas-test` (opt-in), logins in `.claude/secrets/mamas-test.env`. URL and the snapshot push command: `.claude/dev-setup.md` (deploy targets table and "Per-client theme snapshot deploy").
