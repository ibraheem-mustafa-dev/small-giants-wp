# MIC: client context

**MIC**, rebuilt on SGS from a Claude Design draft that includes a shop. Framework rules are in the root `CLAUDE.md`.

- **Design brief for Claude Design:** `DESIGN-BRIEF.md` (purpose, audiences, pages, look, what to drop, what to ask MIC for).
- **The draft:** not exported yet. When it is, it goes unchanged into `handoff/` (Spec 48A; check it with `node scripts/computed-route/handoff-check.mjs sites/mic/handoff`).
- **Test site:** deploy target `mic-test` (opt-in), logins in `.claude/secrets/mic-test.env`; local mirror `local-mic` (`http://localhost:8086`). URL and commands: `.claude/dev-setup.md` (deploy targets table, "Local WordPress mirrors").
- **Email:** sends through the Small Giants Studio mailbox with every email redirected to Bean, as every clone target does, until MIC has a mailbox of its own (`.claude/dev-setup.md`, "Site email").
