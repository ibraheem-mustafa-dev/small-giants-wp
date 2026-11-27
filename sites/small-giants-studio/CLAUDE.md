# Small Giants Studio: client context

**Small Giants Studio Ltd**, the studio's own website, rebuilt on SGS from a Claude Design draft. Framework rules are in the root `CLAUDE.md`.

- **The draft:** not exported yet. When it is, it goes unchanged into `handoff/` (Spec 48A; check it with `node scripts/computed-route/handoff-check.mjs sites/small-giants-studio/handoff`).
- **Test site:** deploy target `sgs-test` (opt-in), logins in `.claude/secrets/sgs-test.env`; local mirror `local-sgs` (`http://localhost:8085`). URL and commands: `.claude/dev-setup.md` (deploy targets table, "Local WordPress mirrors").
- **Email:** FluentSMTP over the studio's own mailbox, with every email redirected to Bean while it is a test site (`.claude/dev-setup.md`, "Site email").
- **Must keep at launch:** the printed QR paths `/hello` and `/mic` forward (302) as the current site does (`.claude/LEDGER.md`).
