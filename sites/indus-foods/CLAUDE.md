# Indus Foods: client context

**Indus Foods Ltd**, a Birmingham ethnic food wholesaler (est. 1962, 5,000+ trade customers), rebuilt on SGS from a Claude Design draft. Framework rules are in the root `CLAUDE.md`.

- **The draft:** `handoff/`, the Claude Design export kept unchanged (Spec 48A; check it with `node scripts/computed-route/handoff-check.mjs sites/indus-foods/handoff`). Its `README.md` and `READING-DC-FILES.md` explain the design and the code.
- **Kept beside it:** `theme-snapshot.json` (tokens, pushed by `push-theme-snapshot.py`), `old-site-logos/` (real partner logos from the old site, local only), `assets/notes/` (client research), `assets/indus-logo*.svg` and `assets/logos/` (logo masters), `assets/decorative-foods/optimised/` (web-sized food images).
- **Test site:** deploy target `indus-test` (opt-in), logins in `.claude/secrets/indus-test.env`. URL and the snapshot push command: `.claude/dev-setup.md` (deploy targets table and "Per-client theme snapshot deploy").
- **Awaiting the client:** real testimonials; BRC, Halal, SALSA, Unitas and FWD certification logos; the Falak Rice logo; professional photography.
