# Small Giants Studio: client context

**Small Giants Studio Ltd**, the studio's own website, rebuilt on SGS from a Claude Design draft. Framework rules are in the root `CLAUDE.md`.

- **The draft:** not exported yet. When it is, it goes unchanged into `handoff/` (Spec 48A; check it with `node scripts/computed-route/handoff-check.mjs sites/small-giants-studio/handoff`).
- **Until the clone:** the draft is first ported into the current Next.js site on Vercel and replaces everything there except `/mic` (Bean, 2026-11-28; plan `.claude/plans/2026-11-28-sgs-redesign-swap.md`). The clone onto `sgs-test` follows later from the same `handoff/` folder.
- **Test site:** deploy target `sgs-test` (opt-in), logins in `.claude/secrets/sgs-test.env`; local mirror `local-sgs` (`http://localhost:8085`). URL and commands: `.claude/dev-setup.md` (deploy targets table, "Local WordPress mirrors").
- **Email:** FluentSMTP over the studio's own mailbox, with every email redirected to Bean while it is a test site (`.claude/dev-setup.md`, "Site email").
- **Must keep at launch:** the printed QR paths `/hello` and `/mic` forward (302) as the current site does (`.claude/LEDGER.md`).
