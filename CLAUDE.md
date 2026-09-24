# SGS WordPress Framework

SGS is a standalone WordPress block framework and AI website-builder: theme + blocks plugin (with forms) + booking, client-notes, accessibility and configurator plugins. It competes with Kadence / Spectra / GenerateBlocks and delivers client builds with Bean as QC only. Everything must work for ANY client ("a restaurant, a wedding planner AND a law firm"): client colours, copy, imagery and structure live in `sites/<client>/` only, never in the theme or plugins.

**Where things live:** current status, fronts and parked work → `.claude/LEDGER.md` · specs → `.claude/specs/README.md` (the one roster) · plans → `.claude/plans/` · build/deploy/SSH detail → `.claude/dev-setup.md` · architecture → `.claude/architecture.md` · client design context → `sites/<client>/CLAUDE.md` · each plugin/theme has its own CLAUDE.md. Cloning-pipeline and block-authoring rules load automatically from `.claude/rules/` when you touch those files.

## How to work here

- **Plan mode is the default** (`.claude/settings.json`); investigate and get a plan approved before editing. Read the governing spec that `LEDGER.md` names before touching its surface.
- **Find the root cause from evidence, never by guessing.** Read the actual artefacts (code, DB, logs, live DOM) before proposing a fix. Classify the layer: an implementation bug, or a gap in the spec/plan — fix the right layer. Verify every dependency your theory rests on (DB rows, the block's real attributes, the spec).
- **A control that "doesn't work" already works somewhere — find it and diff.** `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT block_slug, attr_name, css_property, css_element FROM block_attributes WHERE css_property='<prop>'"`, then compare that block's `render.php`/`style.css` with yours.
- **Verify the rendered output, not a metric.** Open the live page (Playwright/Chrome) and read the DOM and computed styles at 375/768/1440. A green gate or build proves only what it asserts.
- **Never reason from what the canary currently renders.** The framework is pre-production: a changed default costs nothing and there is no content to protect. Decide defaults on merit.
- **More than 3 files getting the same change? Build the detector first** — read `.claude/THE-MIGRATION-METHOD.md` before the 4th edit.
- **DB first, no hardcoded lookup dicts.** Framework facts and counts live in `~/.claude/skills/sgs-wp-engine/sgs-framework.db` (query via `/sgs-db` or `/wp-blocks`); never cache a count in a doc. Open it read-only (`sqlite3.connect(f'file:{db}?mode=ro', uri=True)`). Never import `scripts/converter/db/db_lookup.py` from a read-only script — it runs schema migrations on import.
- **Cite code by symbol, never by line:** `path/file.php::function_name`, `block.json::supports.sgs.imageControls`, `style.css::.sgs-hero__wrapper`. A claim that something was verified carries the command that produced it. `lint-spec-drift.py` enforces this.
- **Docs state current truth only.** Remove stale text and write the replacement in its place; no "retired/superseded" notes, no hanging references. Why a decision was made goes in the doc it changes and the commit message.

## Non-negotiables

- WCAG 2.1 AA (visible focus, 44px touch targets, 4.5:1 contrast), mobile-first. Move to 2.2 AA per public-sector/EU client.
- No jQuery; vanilla JS with `viewScriptModule`. Motion follows Spec 38 §1's tiers (vanilla by default, GSAP/Lenis/WebGL only when earned, all npm-bundled and conditionally loaded, no CDN).
- Every REST endpoint: nonce, capability check, sanitisation, `$wpdb->prepare()`.
- Budget: < 100 KB CSS and < 50 KB JS per page; green Core Web Vitals.
- **No SGS block renders an inline `style="…"` declaration** (Spec 32). `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` must exit 0.
- **Every customisable property has a block-editor inspector control** — clients never touch code or WP-CLI.
- No hard-coded environment paths: `get_theme_file_uri()`, `wp_upload_dir()`, CSS custom properties.
- Per-client tokens live in `sites/<client>/theme-snapshot.json` (Spec 33), deployed with `push-theme-snapshot.py`; `theme/sgs-theme/styles/` stays empty.
- Naming (full rules: Spec 00): `.sgs-` BEM (`.sgs-<block>__<element>--<modifier>`), block namespace `sgs/`, PHP namespaces `SGS\…`, hook prefix `sgs_`, options `sgs_*`. UK English everywhere.
- A change to the sgs-booking REST API also updates `.claude/specs/03-SGS-BOOKING.md` and `plugins/sgs-booking/CLAUDE.md`.

## Git

Follow `~/.claude/rules/git-hygiene.md`: commit straight to `main` with an explicit pathspec, never open a PR, never stash, integrate after every task. Run `git branch --show-current` in the same command as the commit. Never commit core framework changes to a client branch (`feat/<client>-*` only if a branch is ever unavoidable).

## Build and deploy

```bash
cd plugins/sgs-blocks && npm run build          # run from PowerShell (the nvm shim is broken in Git Bash)
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown   # THE one deploy path
python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client <slug> --target <ssh-host>
```

- `build-deploy.py` builds, gates, deploys with rollback, verifies, and purges OPcache, the LiteSpeed page cache and the theme pattern cache. Targets are `TARGETS` in that file: `sandybrown` (default canary), `indus-test`, `eye-care-test` (named explicitly only). Scope with `--blocks-only` / `--theme-only`.
- ⛔ Never hand-roll tar/scp/`rm -rf` on the server — that recipe can take client sites down. Never use `--allow-dirty` or `--skip-verify`.
- No Node on the server: build locally, deploy `build/`.

## Sites

- Canary `sandybrown-nightingale-600381.hostingersite.com` runs WP 7.1 (`wp core version` over SSH). Homepage = **page 2742** (`/`), posts page = **2741** (`/blog/`). Post 66 is raw HTML (a mirror, not a clone) — never reuse it. Verify a post ID exists before pointing anything at it.
- Clones go to PAGES (`page.html`), never posts (`single.html` caps `.entry-content` at 800px).
- Each client has its own test site because the active header/footer/drawer/snapshot pointers are single global options.
- SSH: `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73` (alias `ssh hd`); WP admin user `Claude`.
- Credentials (gitignored, always available — don't ask): `.claude/secrets/<site>.env` (`WP_USER_*`, `WP_PWD_*`, `WP_APP_PWD_*`, `WP_URL_*`).

## Delegation

| Work | Route to |
|---|---|
| Heavy WP build (pages, templates, blocks, migrations) | `wp-sgs-developer` agent |
| Lay out a page, header, footer, drawer or modal on a live site | `scripts/wp-build-page.js` from a JSON block tree (it builds through the editor and refuses unknown, wrong-typed, off-enum or wrongly shaped settings); keep the tree in `sites/<client>/build/` |
| SGS block / theme / client-site work | `/sgs-wp-engine` (+ `/wp-block-development` for core block-API questions) |
| Deploy | `build-deploy.py`, ceremony via `/wp-sgs-deploy` |
| Visual / a11y check of a built page | `/visual-qa`, `/a11y-audit`, Playwright |
| Cloning pipeline | `/sgs-clone`, then `/sgs-update` |
| DB / schema questions | `/sgs-db`, `python ~/.claude/hooks/wp-blocks.py dump` |
| Pages built with banned core blocks | `plugins/sgs-blocks/scripts/migrate-core-blocks/` (see its README) |
