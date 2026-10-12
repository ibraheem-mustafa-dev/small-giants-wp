# Indus Foods: client context

**Indus Foods Ltd**, a Birmingham ethnic food wholesaler (est. 1962, 5,000+ trade customers), rebuilt on SGS from a Claude Design draft. Framework rules live in the root `CLAUDE.md`.

- **The draft:** `handoff/`, the Claude Design export kept unchanged (Spec 48A; check it with `node scripts/computed-route/handoff-check.mjs sites/indus-foods/handoff`). Its `README.md` and `READING-DC-FILES.md` explain the design and the code. Until the re-export with the 2026-10-11 prompt lands, the export is at `.claude/design_handoff_indus_foods/`.
- **Kept beside it:** `theme-snapshot.json` (tokens, pushed by `push-theme-snapshot.py`), `old-site-logos/` (real partner logos from the old site, local only), `assets/notes/` (client research), `assets/indus-logo*.svg` and `assets/logos/` (logo masters), `assets/decorative-foods/optimised/` (web-sized food images).
- **Test site:** `https://lavender-dinosaur-183533.hostingersite.com`, deploy target `indus-test` (opt-in), logins in `.claude/secrets/indus-test.env`. Push tokens with `python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client indus-foods --target u945238940@141.136.39.73 --target-domain lavender-dinosaur-183533.hostingersite.com`.
- **Awaiting the client:** real testimonials; BRC, Halal, SALSA, Unitas and FWD certification logos; the Falak Rice logo; professional photography.
