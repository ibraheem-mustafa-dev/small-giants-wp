# SGS WordPress Framework

SGS is a standalone WordPress block framework and AI website-builder: theme + blocks plugin (with forms) + booking, client-notes, accessibility and configurator plugins. It competes with Kadence / Spectra / GenerateBlocks and delivers client builds with Bean as QC only. Everything must work for ANY client ("a restaurant, a wedding planner AND a law firm"): client colours, copy, imagery and structure live in `sites/<client>/` only, never in the theme or plugins.

**Where things live:** see `.claude/CLAUDE.md` (status in `LEDGER.md`, specs roster in `specs/README.md`, plans, dev-setup). Client design context → `sites/<client>/CLAUDE.md`; each plugin and the theme has its own CLAUDE.md. Path-scoped rules in `.claude/rules/` load automatically when you touch their paths; `framework-principles.md` (the `FP-<n>` rules) always loads.

## How to work here

- **Read the governing spec that `LEDGER.md` names** before touching its surface.
- **Find the cause in the artefacts** (code, DB, logs, live DOM), and classify the layer: an implementation bug, or a gap in the spec or plan. Fix the right layer.
- **A control that "doesn't work" already works somewhere: find it and diff.** `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT block_slug, attr_name, css_property, css_element FROM block_attributes WHERE css_property='<prop>'"`, then compare that block's `render.php`/`style.css` with yours.
- **Verify the rendered page at 375/768/1440** (Playwright or Chrome: DOM and computed styles). A green gate or build proves only what it asserts.
- **Decide defaults on merit, not on what the canary renders.** The framework is pre-production: a changed default costs nothing and there is no content to protect.
- **Same change in more than 3 files: build the detector first** with the migration-method skill (`.claude/skills/migration-method/SKILL.md`) before the 4th edit.
- **DB first, no hardcoded lookup dicts.** Framework facts and counts live in `~/.claude/skills/sgs-wp-engine/sgs-framework.db` (`/sgs-db`, `/wp-blocks`); never cache a count in a doc. Open it read-only (`sqlite3.connect(f'file:{db}?mode=ro', uri=True)`); `sgs-update-v2.py` is the only writer (reference tables via `plugins/sgs-blocks/scripts/dbschema/seed_reference_data.py`).
- **Cite code by symbol, never by line** (`path/file.php::function_name`, `block.json::supports.sgs.mediaElements`); a verification claim carries the command that produced it. `lint-spec-drift.py` enforces this.
- **Docs state current truth only.** Replace stale text in place; why a decision was made goes in the doc it changes and the commit message.

## Non-negotiables

- Accessibility per the global baseline, with one SGS exception: a cloned draft's control size overrules the 44px target, and a control's tap area fits its own shape.
- No jQuery; vanilla JS with `viewScriptModule`. Motion follows Spec 38 §1's tiers (vanilla by default, GSAP/Lenis/WebGL only when earned, npm-bundled, conditionally loaded, no CDN).
- Every email a site sends goes through `wp_mail()` over the client's own SMTP mailbox (FluentSMTP, set up by `provision-site-mail.py`, `.claude/dev-setup.md` §Site email); SGS code sends through `SGS\Blocks\Mail\Sgs_Mailer`. The N8N webhook (`sgs_n8n_webhook_url`) is an optional automation hook, never the email path.
- Budget: < 100 KB CSS and < 50 KB JS per page; green Core Web Vitals.
- **No SGS block renders an inline `style="…"` declaration** (Spec 32): `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0.
- **Every customisable property has a block-editor inspector control**: clients never touch code or WP-CLI.
- No hard-coded environment paths: `get_theme_file_uri()`, `wp_upload_dir()`, CSS custom properties.
- Per-client tokens live in `sites/<client>/theme-snapshot.json` (Spec 32 Part C), deployed with `push-theme-snapshot.py`; `theme/sgs-theme/styles/` stays empty.
- No client or reference-site name in code or file names outside `sites/<client>/` and `reference/` (docs, tests, fixtures and dated reports may carry them): `python scripts/check-no-client-names.py --check`.
- Naming (Spec 00): `.sgs-` BEM (`.sgs-<block>__<element>--<modifier>`), block namespace `sgs/`, PHP namespaces `SGS\…`, hook prefix `sgs_`, options `sgs_*`.
- Markdown is never hard-wrapped (the pre-commit hook refuses it; `python scripts/check-md-wrap.py --write <file>` fixes it).
- A change to the sgs-booking REST API also updates `.claude/specs/03-SGS-BOOKING.md`.
- Core framework changes never go on a client branch.

## Build and deploy

```bash
cd plugins/sgs-blocks && npm run build          # from PowerShell (the nvm shim is broken in Git Bash)
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown   # THE one deploy path
python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client <slug> --target <ssh-host>
```

- `build-deploy.py` builds, gates, deploys with rollback, verifies and purges every cache. Targets are `TARGETS` in `deploy_common.py`: `sandybrown` (default canary), `indus-test`, `eye-care-clone-test`, `mamas-test` (named explicitly only). Scope with `--blocks-only` / `--theme-only`; several sites with `--target a,b` or `--target all`. Live motion QA is opt-in: run `--motion-qa-tier full` before any release that touches motion, shared effects or theme tokens. The live page-weight gate (`scripts/check-page-weight.mjs`: transferred CSS and JS per page, baseline only shrinks) runs with `--page-weight` and on every `--motion-qa-tier full` run. `--gate-only` runs and records a commit's full gate tier so its deploy skips it; `--editor-check local-<mirror>` opens that mirror's content in the block editor before upload. Stages, gates, tiers, the deploy cache and timings: `.claude/deploy-architecture.md`.
- ⛔ Never hand-roll tar/scp/`rm -rf` on the server (that recipe has taken client sites down), and never use `--allow-dirty` or `--skip-verify`.
- The one sanctioned copy of a local mirror onto a server is `bash scripts/local-wp/push-to-remote.sh <local-site> <target> [--dry-run]`, test sites only (`scripts/local-wp/README.md`).
- No Node on the server: build locally, deploy `build/`.

## Sites

- Canary `sandybrown-nightingale-600381.hostingersite.com` (WP 7.1). Homepage = **page 2742**, posts page = **2741**. Post 66 is a raw-HTML mirror: never reuse it. Verify a post ID exists before pointing anything at it.
- Canary pages 2103, 2109, 2113, 2603, 2740, 3037, 5223, 5226, 5229, 5395 are motion-QA fixtures: never delete or repurpose them (`.claude/rules/motion-qa.md`).
- Clones go to PAGES (`page.html`), never posts (`single.html` caps `.entry-content` at 800px).
- Each client has its own test site, because the active header/footer/drawer/snapshot pointers are single global options; the clone owns every site-wide setting there (built on the local mirror, copied with `push-to-remote.sh`, checked with `scripts/computed-route/site-check.mjs`). A client draft comes from Claude Design's handoff skill run by `.claude/claude-design-handoff/PROMPT.txt` and lives unchanged in `sites/<client>/handoff/` (`.claude/dev-setup.md` "Client drafts").
- `eye-care-test` (darkcyan-grouse-898606) is Eye Care's hand-built site and the one Bean presents: its own finishing stream (LEDGER Front F) edits it directly, and no clone, push or calibration ever writes to it. Eye Care clones go to `eye-care-clone-test`.
- SSH: `ssh hd` (`-i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73`); WP admin user `Claude`. Credentials are always in `.claude/secrets/<site>.env` (gitignored).

## Tools for this repo

| Work | Use |
|---|---|
| Lay out a page, header, footer, drawer or modal on a live site | `scripts/wp-build-page.js` from a JSON block tree in `sites/<client>/build/` (it refuses unknown or wrongly typed settings) |
| Block, theme and client-site work | `/sgs-wp-engine` (+ `/wp-block-development` for core block-API questions) |
| Deploy ceremony | `/wp-sgs-deploy` |
| Cloning (Spec 48) | the computed route in `scripts/computed-route` (LEDGER Front H); `/sgs-update` after framework changes |
| DB and schema questions | `/sgs-db`, `python ~/.claude/hooks/wp-blocks.py dump` |
| Pages built with banned core blocks | `plugins/sgs-blocks/scripts/migrate-core-blocks/` (see its README) |
