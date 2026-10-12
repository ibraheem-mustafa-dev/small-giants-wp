# Mama's Munches redesign: client context

The redesign of Mama's Munches (lactation cookies and gifts for breastfeeding mums, Birmingham), built fresh on its own test site from a Claude Design draft. Independent of `sites/mamas-munches/` (the canary's folder; business and brand facts live in its `CLAUDE.md`); nothing here changes the canary. Framework rules live in the root `CLAUDE.md`.

- **The draft:** `handoff/`, the Claude Design export kept unchanged (Spec 48A; check it with `node scripts/computed-route/handoff-check.mjs sites/mamas-munches-redesign/handoff`): one `.dc.html` per page linked by file name, entry `Home.dc.html`, basket state in `store.js`. Its `README.md` and `READING-DC-FILES.md` explain the design and the code. Until the re-export with the 2026-10-11 prompt lands, the export is at `.claude/design_handoff_mamas_munches/`.
- **Kept beside it:** `theme-snapshot.json` (tokens, pushed by `push-theme-snapshot.py`), `media/photography/wp-media-library/` (real product photos) and `media/brand/` (logo originals).
- **Test site:** `https://lightsalmon-tarsier-683012.hostingersite.com`, deploy target `mamas-test` (opt-in), logins in `.claude/secrets/mamas-test.env`. Push tokens with `python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client mamas-munches-redesign --target u945238940@141.136.39.73 --target-domain lightsalmon-tarsier-683012.hostingersite.com`.
