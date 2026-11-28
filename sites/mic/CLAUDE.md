# MIC: client context

**MIC**, rebuilt on SGS from a Claude Design draft that includes a shop. Framework rules are in the root `CLAUDE.md`.

- **Design brief for Claude Design:** `DESIGN-BRIEF.md` (purpose, audiences, pages, look, what to drop, what to ask MIC for).
- **The draft:** not exported yet. When it is, it goes unchanged into `handoff/` (Spec 48A; check it with `node scripts/computed-route/handoff-check.mjs sites/mic/handoff`).
- **Static preview live on the test site (Bean, 2026-11-28):** Bean's ready-built MIC redesign (a static site, kept unchanged in `static-preview/`; its `README.md` says what is placeholder and front-end only) is served at the root of `https://palegreen-goose-450620.hostingersite.com/`, uploaded file by file beside WordPress, which stays installed (wp-admin, REST, FluentSMTP). The block that makes it the front end (`static-preview/htaccess-block.txt`) sits at the top of the site's `.htaccess`; the file before it is `.htaccess.bak-2026-11-28-pre-mic-static`. Search engines are kept out by its `robots.txt` and `noindex` tags. Before the clone or any page build on `mic-test`, remove that block and the static files (the `.html` files, `robots.txt`, `dc/` and `assets/` at the web root), or the static home page shadows WordPress.
- **Test site:** deploy target `mic-test` (opt-in), logins in `.claude/secrets/mic-test.env`; local mirror `local-mic` (`http://localhost:8086`). URL and commands: `.claude/dev-setup.md` (deploy targets table, "Local WordPress mirrors").
- **Email:** sends through the Small Giants Studio mailbox with every email redirected to Bean, as every clone target does, until MIC has a mailbox of its own (`.claude/dev-setup.md`, "Site email").
