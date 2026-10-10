---
doc_type: dev-setup
project: small-giants-wp
title: SGS WordPress Framework — Developer Setup & Operations
---

# SGS WordPress Framework — Dev Setup

⛔ **More than 3 blocks/files/call sites? The first deliverable is the
DETECTOR, not the edit — `.claude/skills/migration-method/SKILL.md`.** Measured: a census-driven pass moves the corrections out of the tree and into the detector, where one commit fixes hundreds of sites. Figures + derivation live in ONE place — do not copy them here.

## Contents

- [Project structure](#project-structure)
- [Build process](#build-process)
- [sgs-framework.db — the unversioned local dev DB](#sgs-frameworkdb--the-unversioned-local-dev-db)
- [Creating a new block, shared components and extensions](#creating-a-new-block-shared-components-and-extensions)
- [Adding per-client theming](#adding-per-client-theming)
- [Render helpers](#render-helpers)
- [Deployment process](#deployment-process)
- [Local WordPress mirrors (WSL)](#local-wordpress-mirrors-wsl)
- [WP-CLI](#wp-cli)
- [Environment and tools](#environment-and-tools)
- [Generated catalogues](#generated-catalogues)
- [Known Gotchas](#known-gotchas)

---

## Project structure

```
small-giants-wp/
├── theme/sgs-theme/
│   ├── theme.json       # design tokens (framework default)
│   ├── style.css        # theme header only
│   ├── functions.php, inc/   # enqueues, preload hooks, helpers
│   ├── styles/          # stays empty: client snapshots live at sites/<client>/theme-snapshot.json (known exception: mamas-munches.css)
│   ├── templates/, parts/, patterns/
│   └── assets/          # css/, js/, fonts/
├── plugins/sgs-blocks/
│   ├── sgs-blocks.php   # entry point
│   ├── includes/        # class-sgs-blocks.php (block auto-discovery), CLI commands, forms/, migrations/, helpers-*.php, hover-effects/
│   ├── src/             # blocks/ (+ extensions/), components/, header-behaviours/, shared/, utils/
│   ├── build/           # compiled output (gitignored; build-deploy.py ships it)
│   ├── assets/          # frontend CSS/JS for extensions, media atoms, effects
│   └── scripts/         # block build, deploy, gate and database tooling (build-deploy.py, run-gates.py, gates.json, sgs-update-v2.py, inspector-scan/)
├── plugins/             # also sgs-booking, client-notes, accessibility, configurator
├── scripts/             # cloning and live-site tooling: computed-route/ (Spec 47), parity/, wp-build-page.js, local-wp/, repo-wide lints
├── sites/               # per-client content, mockups, theme-snapshot.json
└── .claude/             # specs, ledger, plans, reports, catalogues; hooks/ holds the Claude-session and commit guards wired in settings.json
```

**Which `scripts/` folder?** Three places hold scripts, each for one job. `plugins/sgs-blocks/scripts/` builds, gates and deploys the blocks plugin and seeds the framework database. Root `scripts/` clones a client draft into a site and checks it against the live page (`computed-route/` imports nothing from the plugin's scripts, rule R-47-1), plus lints that span the whole repo. `.claude/hooks/` holds only the guards the Claude harness and git run automatically. A new script goes where its job sits; the dated report scripts under `.claude/reports/` are records, not tools.

Each block lives in `src/blocks/{block-name}/` (file layout: `plugins/sgs-blocks/CLAUDE.md` "Block Pattern"). Dynamic blocks (the majority) use `render.php` and return `null` from `save.js`.

---

## Build process

All block JavaScript and CSS is compiled using `@wordpress/scripts`. Build from the `sgs-blocks` directory.

```powershell
cd plugins/sgs-blocks

# Install dependencies (first time only)
npm install

# Production build (required before deployment)
npm run build

# Development watch (rebuilds on file change)
npm run start
```

The build uses `--experimental-modules` to support `viewScriptModule` (the Interactivity API) and `--webpack-copy-php` to copy PHP render files into the `build/` directory.

A `prebuild` / `prestart` hook runs `scripts/generate-icons.js` automatically. This generates `includes/lucide-icons.php` from the `lucide-static` package — a flat PHP array of 1,900+ SVG icons. Do not edit `lucide-icons.php` directly.

`prebuild` runs the generators (roster, icons, extension attributes, SVG allowlist, media attributes and stylesheet, motion-fx generators) as a fail-fast chain, then `python scripts/run-gates.py --tier fast`. The runner executes every fast-tier gate, collects every failure, and prints one consolidated report, so one build shows every defect. The gate roster is `plugins/sgs-blocks/scripts/gates.json` (one record per gate: `id`, `cmd`, `tier`, `budget_ms`, `order`). Heavyweight gates sit in the `full` tier, which `build-deploy.py` runs before it ships (`npm run gate:full`; `--skip-gate-full` disables that tier for a deploy). The commit-time chain is small: the per-machine `.git/hooks/pre-commit` runs gitleaks, then `.githooks/sgs-gates.sh` (an empty slot), then `.githooks/pre-commit` (the extension-attribute drift check only). No visual-diff gate runs at commit, so a clean commit is never gate evidence; the gates run at build.

Gate commands (from `plugins/sgs-blocks`): `npm run gate:list` (the roster), `gate:fast`, `gate:full`, `gate:all`, `gate:wired` (asserts the deploy script runs the full tier), `gate:selftest`.

Two of the gates, as examples of what the roster covers: `check-empty-inspector-containers.js` (an inspector container rendered with no children — a client-visible dead control that `check-dead-controls.js`, which checks the opposite direction, cannot see) and `check-wrapper-capability-preconditions.js` (`gridItems` requires `layout`; a `supports.sgs.gridAreas` declaration must have a live reader). Per-gate rationale and `--self-test` shapes are in each script's own header; the tooling catalogue below lists them. **Never trust a doc's claim that a gate runs — read `scripts/gates.json`, or run `npm run gate:wired`.**

**Dated migration pattern (mandatory):** any new `property_suffixes` row or other DB seed data MUST live in a dated `migrations/YYYY-MM-DD-<descriptor>.py` under `plugins/sgs-blocks/scripts/migrations/` beside the existing siblings — never a module-load side-effect. Reference tables (`roles`, `slots`, `property_suffixes`, `modifier_suffixes`, `html_tag_to_core_block`) are seeded by `plugins/sgs-blocks/scripts/dbschema/seed_reference_data.py`. Example: `plugins/sgs-blocks/scripts/migrations/2026-06-26-testimonial-media-role-selector.py`.

**Output:** `build/blocks/{block-name}/` contains the compiled files. `build/` is gitignored: `npm run build` produces it locally and `build-deploy.py` ships it — Node.js is not available on the Hostinger host.

---

## sgs-framework.db — the unversioned local dev DB

**Path:** `~/.agents/skills/sgs-wp-engine/sgs-framework.db` (hard-linked to `~/.claude/skills/sgs-wp-engine/sgs-framework.db`: one physical file). **Deliberately NOT committed to git**: it is a local SQLite knowledge base (block schema, `fx_effects`, `block_attributes`, `slots`, `roles` and so on; root `CLAUDE.md` "DB first"), too large and fast-moving to version. Counts: query with `/sgs-db`.

**A clean clone still builds.** The Spec 38 motion-fx generators (`seed-motion-fx-registry.py`, `generate-fx-effects-php.py`, `generate-fx-qualifying-blocks.py`) produce four committed build inputs. `run-motion-fx-generators.js` (wired into `prebuild`/`prestart`) skips the chain cleanly when the DB is absent, and when it is present regenerates in memory and fails the build, naming the stale file, on any drift from the committed files. Both generators fail loudly if a query returns zero rows: an empty `fx_effects` table is a misconfiguration, never "nothing to generate". Never create a `sgs-framework.db` at `scripts/sgs-framework.db` or `scripts/data/sgs-framework.db`, and never point `DB_PATH` at a copy inside the repo.

**Restoring/regenerating the DB (owner only):** the DB is not published or backed up anywhere else in this repo — if it is ever lost, it has to be rebuilt from the `/sgs-update` pipeline against the live block roster (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats` confirms whether it's present and healthy). This is a last-resort, hours-not-minutes recovery path — treat the DB as irreplaceable in day-to-day work (back it up before any destructive experiment).


### What each column means

Row counts and value vocabularies change on every reseed, so they are not written here: query them with `/sgs-db` (or `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`). What a column MEANS cannot be derived from the data, so it is written below. A column absent from this list has no verified meaning yet.

Fossil columns (written, read by nothing operational; do not classify on them): `block_attributes.equivalent_implementations`; `fx_effects.reduced_motion`, `editor_story`, `created_at`; `design_tokens.css_var`, `description`; `animation_tokens.keyframes`, `duration`, `easing`, `description`, `category`, `created_at`. Surrogate `id` columns are never read.

Three 0-byte `sgs-framework.db` stubs exist on disk (repo root, `plugins/sgs-blocks/scripts/`, `~/.claude/`). Opening one returns zero rows, which looks like a clean answer; use the path at the top of this section.

**`block_attributes`**

- `role`: What KIND of thing the attribute is — the single best attribute classifier here. A gate (db-consistency/check_orphan_roles.py) fails the build if a value has no `roles` row, so it cannot rot quietly.
- `css_property`: The CSS longhand(s) this attribute writes. WARNING: a NULL means TWO different things — for a painting role it is a real gap; for `text-content`/`content`/`boolean-visibility` it is correct by design (100% NULL, they do not paint). Condition on `role` before reading a NULL as a defect.
- `css_element`: Which sub-element inside the block it paints. Must be paired with `css_layer` — matching on element alone mis-routes.
- `css_state`: Pseudo-state the value applies to. Exact where present; the only state marker.
- `css_layer`: Which layer of the 3-layer wrapper model (OUTER / CONTENT / GRID / GRID_AREA) the attribute belongs to.
- `css_tier`: Responsive tier. Deliberately SPARSE — responsive siblings intentionally carry NULL and only anomalies keep a value. Do NOT treat these NULLs as gaps; 'fixing' them breaks the base-row lookups that treat NULL as the base tier.
- `box_family`: Merged box-object family. Narrow but authoritative — the DB-first replacement for name-regex box detection. No box_family means provably not a box attribute.
- `inspector_control_type`: The editor control the client actually sees. Cross-tab against `attr_type` to find controls whose shape cannot hold their setting.
- `emit_shape` and `emit_shape_proof`: how a content attribute is carried, and which test proved it. Shapes: `nested` (the block itself carries it as an element: its own render, a helper it calls with `$attributes`, a template it owns, or its saved markup); `repeater` (an array the block's own render reads, one item per element; the proof ends `:items=object|string|untyped`; declared item fields are in `array_item_schema`); `child` (the content lives in a child block the block declares in its inner-blocks template or `allowedBlocks`; the attribute only names that child's slot); `parent-rendered` (a declared parent block reads it off this block); `context` (handed to child blocks through `providesContext`); `script-rendered` (the block's front-end script prints it); `output-only` (a shared include emits it outside the block's markup, such as a canonical URL); `editor-only` (`block.json` says it is never rendered); `unresolved` (NO test found a reader: a leftover attribute or an unwired control, so it needs repair). NULL = not a content attribute. `+child-candidate` in a proof means the name is also a child slot, so both readings hold. Derived by `lib/emit_shape.py` (the tests, their order and what each proves are in its docstring), cleared and reseeded on every `sgs-update` run; read the proof beside the shape.
- `derived_selector`: A NAMED TRAP. Reads like a CSS emit target; is a synthetic per-attribute identifier. colour-codemod/survey.js measured 58% autofixable off it and the figure was wrong — ZERO of its values exist as classes in the tree. Never classify on it.

**`roles`**

- `classification`: Collapses the role vocabulary into a content-vs-styling fork — the cheapest reliable predicate for 'does this carry text the client edits, or does it paint'.

**`blocks`**

- `status`: Constant — every row is `built`. Filtered on as a gate predicate, so it filters nothing today.
- `variant_attr`: Names the attribute that selects the block's variant (FR-31-20). Pairs with the variant_slots table.
- `tier`: Recognition tier — how the walker identifies this thing in a draft.

**`block_capabilities`**

- `kind`: THE LOAD-BEARING SPLIT. `functional` = real block behaviour; `discovery` = search keywords from the block title. Without it the table looks like hundreds of behavioural facts when only a few dozen are.

**`block_composition`**

- `container_kind`: The D294 pattern selector, read by the db-consistency tier-composition checks. NULL means never-written, NOT not-container-bearing — the writer (sync-container-wrapping-blocks.py::main) only ever SETS and has no statement clearing back to NULL, so a block that stops qualifying keeps its old value permanently. An earlier version of this cell claimed it disagrees with render.php in 14 of 58 blocks — that used the predicate content-kind-must-not-call-the-wrapper, but D294 says content-kind MAY render block-private. A permission read as an obligation; the figure was wrong.
- `composition_role`: The block's structural shape. See the container_kind warning — the two columns disagree.
- `wraps_block`: NOT A MEASUREMENT. The value sgs/container is a hardcoded string literal inside the writer SQL (sync-container-wrapping-blocks.py::main), asserted for every roster member regardless of truth — 14 of the 38 make no real SGS_Container_Wrapper call, so the column is false for ~37% of its rows. Any query that counts or ranks `wraps_block` values asks a self-fulfilling question about a constant. Same trap shape as blocks.status and derived_selector. Verified 2026-08-24 (D762).

**`property_suffixes`**

- `kind_override`: Parse-type escape hatch (D99). Seeded by `dbschema/seed_reference_data.py`.

**`slots`**

- `standalone_block`: The block a recognised BEM slot resolves to. Its NULLs are a KNOWN GAP, not a fossil — those slots exist as recognition vocabulary with no block to resolve to yet.

**`fx_effects`**

- `tier`: The Spec 38 four-tier motion doctrine: V vanilla / G GSAP / H helper / W WebGL substrate.
- `owns_scroll_transform`: Marks effects that claim the scroll transform — the mutual-exclusion axis for combining effects on one element.
- `requires`: What an effect needs from a block (text/svg/svg-subtree/section/item-set/track/surface/image/none). LIVE — generate-fx-qualifying-blocks.py matches it against each block's provision. The value none is real, meaning any block qualifies — NOT a null-substitute. The svg vs svg-subtree split exists because under-specifying here once offered MorphSVG on blocks carrying only a background SVG.
- `scope`: Gates which effects are considered at all — generate-fx-qualifying-blocks.py filters scope IN (block, element). A live reader, not a label.
- `in_picker`: Whether the effect appears in the generic FX picker. Two-way gated against fx.js SHIPPED_EFFECTS by check-fx-list-drift.py, so it cannot rot quietly.
- `triggers`: Comma-joined string split at read time (generate-fx-effects-php.py), not a join table — one stray comma silently changes behaviour.
- `effect`: Primary key and the effect's public identity — the value that appears in `data-sgs-fx`. Closed vocabulary chosen by hand to match Spec 38 §11.2; every consumer keys off it (generate-fx-effects-php.py, generate-fx-qualifying-blocks.py).

**`variant_slots`**

- `unique_slot`: The slot ONLY this variant has — the discriminator, computed by set-difference against the block's other variants.

**`array_item_schema`**

- `role`: A SEPARATE 3-VALUE VOCABULARY — icon-slug / text-content / url-href, plus NULL. NEVER join it to block_attributes.role (34 values); they are unrelated despite the shared column name. DECLARED from block.json items.properties.<field>.role, never name-parsed (FR-31-2.1a). NULL means no role was declared, and a consumer must not infer one from the field name.
- `field_order`: STRUCTURAL and implicit — it is the block.json key order of items.properties, captured by enumerate() at sgs-update-v2.py, not anything an author declares. Any tool that sorts or reformats block.json keys would silently change this order with no error.

**`design_tokens`**

- `token_type`: Chosen by the WRITER code branch, never read from the source JSON. Both writers (sgs-update-v2.py and uimax-tools/enrich-db.py) must write shadows as `shadow`; the CHECK constraint has that member. Note shadow-sm/md/lg are dead slugs absent from theme.json, while shadow-glow is live and was merely mistyped.
- `slug`: Primary key. DECLARED from theme.json for framework tokens; for shadows and font sizes it is the source slug PLUS a hand-added type prefix (enrich-db.py). That prefix is load-bearing — outer_box.py matches on `slug LIKE 'shadow-%'`, so the naming convention IS part of the read contract.

**`block_selectors`**

- `selector`: A PASSIVE MIRROR of each block.json own selectors key. WordPress reads block.json directly at register_block_type and never consults this table, so editing a row changes nothing at runtime. Its single reader is generate-block-reference.py, a docs generator. Its only writer is sgs-update-v2.py.

**`animation_tokens`**

- `name`: FOSSIL relative to the shipped runtime. The live animation system (src/blocks/extensions/animation.js) hardcodes its own 17-entry vocabulary and shares only part of this table 8; zero of these token names appear as @keyframes in any CSS under src/ or the theme. Only the sgs-db.py lookup CLI reads it.
- `used_by`: Name overstates it — means blocks whose sgsAnimation attribute DEFAULTS to this value (seed-motion-fx-registry.py). An operator who picks the animation by hand is invisible here.

---

## Creating a new block, shared components and extensions

See `plugins/sgs-blocks/CLAUDE.md` (Creating a New Block; Shared Components and Extensions).

---

## Adding per-client theming

Per-client colour/typography snapshots live at `sites/<client>/theme-snapshot.json` and are deployed via `plugins/sgs-blocks/scripts/push-theme-snapshot.py`. Do NOT add per-client `.json` files to `theme/sgs-theme/styles/` — it stays empty (known exception: `mamas-munches.css`).

If the client needs CSS that cannot be expressed via tokens, add it to the client's `theme-snapshot.json` under `styles.css` OR to `sites/<client>/theme-overrides.css`. Never add client-specific CSS to `style.css`.

---

## Render helpers

### sgs_responsive_image

Located in `includes/helpers-media.php`. Outputs a fully optimised `<img>` with:

- `srcset` and `sizes` attributes (through `wp_get_attachment_image()` when the attachment ID is known).
- `loading="lazy"` and `decoding="async"` by default.
- Explicit `width`/`height` resolved from the attachment metadata, so the browser reserves the space.
- The supplied alt text.

```php
echo sgs_responsive_image(
    $attachment_id,       // int — attachment post ID (0 when only a URL is known)
    $url,                 // string — image URL, used when there is no attachment ID
    $alt,                 // string — alt text
    'large',              // string — WordPress image size
    [
        'class'         => 'sgs-hero__image',
        'fetchpriority' => 'high',  // omit for lazy-loaded images
        'loading'       => 'eager',
    ]
);
```

For an above-the-fold hero image, the theme injects a `<link rel="preload" as="image">` tag into `<head>` (`functions.php`, `inc/font-preloading.php`) to shorten LCP.

---

## Deployment process

**Deploy targets** (the `TARGETS` dict in `plugins/sgs-blocks/scripts/build-deploy.py`):

| Target | Site | Purpose |
|---|---|---|
| `sandybrown` (default) | `https://sandybrown-nightingale-600381.hostingersite.com` | The canary — pipeline canary (Mama's Munches) and framework verification. WP 7.1 |
| `indus-test` | `https://lavender-dinosaur-183533.hostingersite.com` | Dedicated Indus Foods test site (client `indus-foods`), a fresh WordPress since 2026-10-10. Opt-in: deploys only when named with `--target indus-test` |
| `eye-care-test` | `https://darkcyan-grouse-898606.hostingersite.com` | Dedicated Eye Care Birmingham test site (client `eye-care-ward-end`). Opt-in: `--target eye-care-test` |
| `mamas-test` | `https://lightsalmon-tarsier-683012.hostingersite.com` | Dedicated Mama's Munches redesign test site (client `mamas-munches-redesign`), a fresh WordPress since 2026-10-10, independent of the canary. Opt-in: `--target mamas-test` |

**Why each client has its own site.** The active header, footer, drawer and theme-snapshot pointers are
single global options per WordPress site (`sgs_active_header_cpt_id`,
`sgs_active_footer_cpt_id`, `sgs_active_drawer_cpt_id`, and the theme snapshot). Two clients
cannot hold different active layouts on one site: activating an Indus header on the canary would
replace the Mama's Munches header sitewide. Indus Foods therefore builds on its own site. Another
client target is one `TARGETS` entry with `explicit_opt_in_required: True` (enforced in code).

**Client drafts (the reference a build is compared with):** each Claude Design draft is a folder of `.dc.html` pages
served locally by `scripts/computed-route/lib/draft.mjs::serveDraft`. `node scripts/computed-route/fill.mjs --serve
<folder> --draft-index <entry>` serves it until Ctrl-C on a new port each run, and a surface on another page of the draft
is `<served url>/<Page>.dc.html`. Fill takes the folder as `--draft-dir <folder> --draft-index <entry>` (or the served
page as `--draft-url`); `skeleton.mjs inventory` and `check-refs.mjs` read `surfaces.json[surface].draftUrl`, and the
walker reads `SGS_DRAFT_URL`, so point both at the served page. A Claude Design draft loads React and Babel from
unpkg.com (`support.js`), so Fill needs `--allow-external` or it renders nothing.

| Client | Draft folder | Entry |
|---|---|---|
| Indus Foods | `sites/indus-foods/` | `Indus Foods Website v2.dc.html` |
| Mama's Munches redesign | `sites/mamas-munches-redesign/` | `Home.dc.html` (one file per surface; list in its `CLAUDE.md`) |
| Eye Care Birmingham | `sites/eye-care-ward-end/Ward End Eye Care - SGS Gap Handoff/` | `Eye Care Birmingham.dc.html`; also hosted at `https://mintcream-lyrebird-224487.hostingersite.com`, which now serves a newer single-file bundle (footer links 44px) than the local folder |

`sites/mamas-munches/` is the canary's folder (its live catalogue and trees); the redesign lives only in
`sites/mamas-munches-redesign/`.

**SSH** (all targets share the one Hostinger account): `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73` (alias: `ssh hd`)

### Project credentials (discoverable — every session can use these directly, without asking Bean)

Gitignored; never committed.

| Path | What | Keys / loader |
|---|---|---|
| `.claude/secrets/sandybrown.env` | Canary (sandybrown-nightingale-600381.hostingersite.com) logins — ALWAYS available | `WP_USER_SANDYBROWN` + `WP_PWD_SANDYBROWN` (browser/admin login); `WP_APP_PWD_SANDYBROWN` (REST + WC Store-API Basic auth); `WP_URL_SANDYBROWN`. Use for Playwright editor login + REST verification: `grep KEY .claude/secrets/sandybrown.env` |
| `.claude/secrets/indus-test.env` | Indus test site (lavender-dinosaur-183533.hostingersite.com) logins | `WP_USER_INDUSTEST` + `WP_PWD_INDUSTEST` (browser/admin login); `WP_APP_PWD_INDUSTEST` (REST Basic auth); `WP_URL_INDUSTEST` |
| `.claude/secrets/mamas-test.env` | Mama's Munches redesign test site (lightsalmon-tarsier-683012.hostingersite.com) logins | `WP_USER_MAMASTEST` + `WP_PWD_MAMASTEST` (browser/admin login); `WP_APP_PWD_MAMASTEST` (REST Basic auth); `WP_URL_MAMASTEST` |
| `.claude/secrets/eye-care-test.env` | Eye Care test site (darkcyan-grouse-898606.hostingersite.com) logins | `WP_USER_EYECARETEST` + `WP_PWD_EYECARETEST` (browser/admin login); `WP_APP_PWD_EYECARETEST` (REST Basic auth); `WP_URL_EYECARETEST`; `WP_PAGE_ID_EYECARETEST`; `HOSTINGER_USERNAME` |
| `.claude/secrets/local-eye-care.env` | Local WSL mirror of Eye Care (`localhost:8081`) | `WP_URL_LOCALEYECARE`, `WP_USER_LOCALEYECARE`, `WP_PWD_LOCALEYECARE` |
| `.claude/secrets/local-sandybrown.env` | Local WSL mirror of the canary (`localhost:8082`) | `WP_URL_LOCALSANDYBROWN`, `WP_USER_LOCALSANDYBROWN`, `WP_PWD_LOCALSANDYBROWN` |

> **LiteSpeed:** LiteSpeed Cache is active on sandybrown (check any other target with `wp plugin list --status=active | grep -i litespeed`). `build-deploy.py` purges three cache layers after a deploy — OPcache (compiled PHP) through an HTTPS probe, because the CLI pool has its own OPcache, the LiteSpeed page cache (rendered HTML) through wp-cli, and the theme pattern cache (a pattern file added by a deploy registers only after it clears); clearing one does nothing for the others. For a manual purge after a CSS/render change run `wp litespeed-purge all`, reset OPcache (snippet below), and clear the Hostinger CDN (`hosting_clearWebsiteCacheV1`). sandybrown's bot challenge answers the deploy's HTTPS probes with a 403 "Just a moment" page, so the OPcache purge and the post-deploy GET report ERROR while the files are live: verify by checksum over SSH and run `wp litespeed-purge all` by hand; a CSS-only change needs no OPcache reset. The same edge (response header `Server: hcdn`) answers headless browsers and curl with that 403 for 45+ minutes after a burst of traffic, on every site of the account; a headed browser passes. Run the route's host tools with `SGS_HEADED=1` then (Solve, `scripts/computed-route/pairs.mjs`, `calibrate.mjs`, `scripts/wp-build-page.js`, `sites/eye-care-ward-end/build/qa/independent-check.mjs`); they hide scrollbars, as the walker does, so the layout width matches the viewport.

### Adding a block attribute? Reseed FIRST, then commit the classifier, then deploy

**Order matters, and getting it wrong costs a full build-and-deploy cycle**.

1. **Reseed before building.** `check-wiring-fingerprint` fails the build when an
   attribute is declared in a committed `block.json` but absent from the framework DB.
   Run `/sgs-update` first; the gate's own message says so.
2. **Commit the regenerated `css-property-classifications.json` before deploying.** The
   reseed regenerates it, and `build-deploy.py` builds from an isolated worktree **at
   HEAD** — so an uncommitted classifier means the deploy's build sees each new attribute
   carrying a `css_property` in the DB with nothing declaring it in the derived layer. The
   F6 check #8 Reseed-Survival gate (`db-consistency/run.py`, the `css_property_reseed` check; #9 is the `fx_effects`
   twin, which the same sequence applies to) then fails them as rogue seeds that would
   vanish on the next reseed, and the suite has **no baseline by design**. A local `npm run build` passes at this
   point while the deploy's build fails, because only the deploy builds at HEAD.
3. **Then deploy.**

Both gates are correct; the sequence is the thing to remember. The same at-HEAD isolation
is why an uncommitted fix cannot ship even though the deploy prints `[DONE]` with every
gate green.

### Removing or renaming a block attribute? Stage 1 does not delete

Stage 1 of `sgs-update-v2.py` inserts the new rows and leaves the old ones in the DB, so
`check-wiring-fingerprint` then flags each old name (L2, L3, L4) as a declared attribute no control
writes. Run **`--stage 9`** (prune orphans) from the same clean detached worktree at `origin/main`
after the stage-1 reseed; it deletes exactly the attribute rows no `block.json` declares . A name the same block's media element
injects (`mediaElements` prefix plus `Size`, `Fit` and the like) must not be reused with another
type: inspector-scan rule 38 fails it. A rename also trips the deploy's `oldshape-audit` while any
stored post still carries the old name, and the live site's current schema rejects the new name, so
the template cannot be rebuilt first: deploy with `--skip-oldshape-audit` (a test site only, naming
the reason), then rebuild the tree at once.

**Prove a deploy by the host's marker, never by an exit code.** `ssh … cat
~/.sgs-deploy-marker-<target>.json` must name your commit. A deploy piped through `tail` reports
`tail`'s exit code, and one run ended with exit 0 after only packaging; the marker was unchanged.
Run it with output to a log file and read `[DONE]` and the `[payload-verify]` line.

### Full deployment (ALL targets) — always via `build-deploy.py`

> **⛔ Use the script. Never hand-roll a tar/scp deploy.**
> A raw deploy has no dirty-file gate, no post-deploy check, and no rollback copy: an
> unfinished uncommitted edit reaches the live site and the deploy still reports success.
> `build-deploy.py` carries three defences: a scoped dirty gate, a fail-closed post-deploy
> smoke test, and a `.bak` rotation for one-command rollback.

> **Take turns on a DB reseed, and on deploys to the same target.** Each deploy run uploads and
> unpacks under its own name in the shared SSH home (`sgs-deploy-<pid>-<time>.tar` and folder), so
> deploys to different targets can run at once. Two deploys to the SAME target still race on that
> site's live-folder swap and `.bak` rotation. The build gates read the shared framework DB, so a
> deploy during another session's stage-1 reseed fails its DB gates. Message the other active
> sessions before a reseed or a same-target deploy; nothing is replaced when either abort happens.

```bash
# Canary (default — sandybrown)
python plugins/sgs-blocks/scripts/build-deploy.py

# Indus Foods test site
python plugins/sgs-blocks/scripts/build-deploy.py --target indus-test
```

The script runs the pre-deploy `gate:full` tier, builds (from an isolated `git worktree` of
`HEAD` by default, so a concurrent session's build or uncommitted files cannot collide with the
deploy; `--no-isolate` opts out), tars, scps, extracts, rotates the previous copy to `<dir>.bak`,
cleans up, purges all three cache layers, runs any pending SGS framework migrations (`wp sgs migrations run` as the site's first administrator; reported, never fatal), then **GETs the site and fails the run if it is broken**.
Deploy a framework change to the canary first.

**A theme deploy ships the target's client `theme.json`.** Each `TARGETS` entry names its `client`
(`sites/<client>/`, or `None` for the framework default). A theme deploy uploads that client's
`theme-snapshot.json` as `themes/sgs-theme/theme.json`, using the same bytes
`push-theme-snapshot.py` writes (`push-theme-snapshot.py::deploy_theme_json_bytes`). The disk layer lives inside the theme directory, and the deploy
swaps that whole directory. It aborts with `[ABORTED] client-theme-json-unavailable` when the client's snapshot is missing or invalid (never falling back to the framework file), and with `[ABORTED] theme-json-guard` when the live `theme.json` is an uncommitted snapshot someone pushed (commit it, or pass `--takeover` to replace it deliberately). The snapshot is swapped into the staging copy before any live directory moves, and afterwards the live `theme.json` md5 must equal the payload or you get `[DEPLOYED-BUT-THEME-SETTINGS-LOST]` (`--skip-verify` does not skip this).

The deploy never touches `wp_global_styles` (the database user layer). `--self-test` cases 8-16 prove
all of this against a temp repo and server, including a negative control that reproduces the old loss.

**The flags exist — know what you're giving up before using them:**

| Flag | What you lose |
|---|---|
| `--allow-dirty` | The dirty-file gate. Only use when you have READ the listed paths and know each one is safe. |
| `--skip-verify` | The only check that catches a deploy which breaks the site. |
| `--skip-gate-full` | The heavyweight pre-deploy gate tier. |
| `--skip-oldshape-audit` | The only check that catches a deploy whose schemas strand or delete stored content. |
| `--skip-purge` | Cache purge — the deploy lands, but warm caches keep serving the previous version. |

**Other flags (safe, not loss-of-safety):** `--payload <path>` (repeatable) deploys named uncommitted files without the blanket `--allow-dirty`; `--verify-url`, `--audit-scoped-page`, `--self-test`, `--theme-only`, `--blocks-only`, `--skip-build` exist for narrower workflows — read the script's `--help` for current usage.

**`--dry-run`** prints the commands each step would run and executes none of them: every deploy step passes `args.dry_run` to `run()`, which returns without executing. It also skips the dirty-tree gate, so a dry run cannot warn you about uncommitted files the next real deploy would carry.

**Ownership check (load-bearing, not optional):** a target is a shared checkout. `build-deploy.py` checks whether the deploy would overwrite live work not in your HEAD's ancestry and **refuses if so** — this is correct behaviour, not a bug. `--takeover` overrides it; only use when you've confirmed with whoever else is working on the target that it's safe to overwrite their state.

**Rollback (if a deploy breaks the site):**

```bash
# <host> is the target's host from TARGETS (e.g. sandybrown-nightingale-600381.hostingersite.com)
ssh hd 'WP=domains/<host>/public_html/wp-content && \
  mv $WP/plugins/sgs-blocks $WP/plugins/sgs-blocks.broken && \
  mv $WP/plugins/sgs-blocks.bak $WP/plugins/sgs-blocks'
# then reset OPcache (below) — the .bak is the copy from the PREVIOUS deploy
```

OPcache reset (CLI and web are separate pools):

```bash
ssh -p 65002 u945238940@141.136.39.73 "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/<host>/public_html/op-reset-tmp.php" && \
  curl -s https://<host>/op-reset-tmp.php && \
  ssh -p 65002 u945238940@141.136.39.73 "rm ~/domains/<host>/public_html/op-reset-tmp.php"
```

### Single-file patch: do not

A bare `scp` of one file reaches a live site with no dirty check, no smoke test and no `.bak`. Use `build-deploy.py` (`--blocks-only` / `--theme-only` to narrow scope). Hand-placing a file is for emergency rollback only: back it up first (`ssh hd 'cp $WP/path/file $WP/path/file.bak'`), then confirm the site returns 200.

### Per-client theme snapshot deploy

`push-theme-snapshot.py` defaults `--target-domain` to the sandybrown canary, so **name the domain explicitly for any other site**:

```bash
# Canary (default domain)
python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client mamas-munches --target u945238940@141.136.39.73

# Indus test site
python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client indus-foods --target u945238940@141.136.39.73 \
  --target-domain lavender-dinosaur-183533.hostingersite.com

# Eye Care test site
python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client eye-care-ward-end --target u945238940@141.136.39.73 \
  --target-domain darkcyan-grouse-898606.hostingersite.com

# --no-push (alias --dry-run) prints the diff without pushing
```

**Commit the snapshot you push.** The next theme deploy re-ships the target's **committed**
snapshot. If you push an uncommitted one, that deploy aborts (`theme-json-guard`) rather than
silently reverting it.

### Container roster — container-wrapping blocks

`plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py` detects which blocks wrap children via InnerBlocks (the "wraps children" model, a validated structural signal) and, with `--apply`, writes `wraps_block` + `container_kind` into `block_composition`. A dry run prints the roster and `[VALIDATION PASS]`/`[VALIDATION FAIL]`.

```bash
python plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py
# --apply to write detected wraps_block + container_kind values into block_composition
```

**Roster size is DB-authoritative — query `/sgs-db`, do not cache a count.** Re-run via `/sgs-update` Stage (auto) or manually whenever block.json `supports.sgs.containerKind` changes.

### Running the deploy from PowerShell

`build-deploy.py` is cross-platform and builds, gates, verifies and purges itself; run it from the project root. Node/npm must run via PowerShell on this machine (the nvm shim is broken in Git Bash): `cd plugins/sgs-blocks ; npm run build`.

### What NOT to deploy

`node_modules/`, `src/`, `package*.json` and `.gitignore` are not needed on the server; `theme/sgs-theme/styles/*.json` stays empty (client snapshots live at `sites/<client>/theme-snapshot.json`).

---

## Local WordPress mirrors (WSL)

`http://localhost:8081` (Eye Care) and `http://localhost:8082` (Sandybrown) are WSL copies of the two Hostinger test
sites (database and `wp-content`, WordPress 7.1.2), for browser-heavy runs Hostinger's edge would challenge.
Calibration targets them as `local-eye-care` / `local-sandybrown`; one run opens one browser and logs in once
(`scripts/lib/wp-session.js`). Start, sync and safety details: `scripts/local-wp/README.md`.
Before measuring, refresh a mirror from its test site (`bash scripts/local-wp/refresh-from-remote.sh local-eye-care eye-care-test`, from Git Bash) and sync the build. Solve runs on a mirror with `solve.mjs --site local-eye-care` (about 40 seconds a walk, no edge challenge); run page surfaces one at a time, because parallel block-editor builds on the mirror time out.

⚠️ **`curl http://localhost:8081/` times out even when the site is fine.** The WSL port proxy binds 8081 and
8082 on **IPv6 loopback only** (`netstat -ano` shows `[::1]:8081`), and curl resolves `localhost` to IPv4
first. `curl -6 localhost:8081` returns 200, and Chrome and Playwright try IPv6 anyway, so browser-driven
runs are unaffected. SearXNG's `:8888` is bound on IPv4, which is why that one answers plain curl — same
machine, same proxy, different address family. **Check reachability with `curl -6` or a real browser.**

⚠️ **Do not run `wsl --shutdown` to "fix" the mirrors, and do not assume they are stopped.** SearXNG runs in
that same WSL instance on port 8888 and `search.py` and the `/search` skill depend on it. Before believing
they are down, check `systemctl is-active apache2 mariadb` and `ss -ltnp` inside WSL: the services
can be running and listening while plain curl reports the ports unreachable, so the "start
after a reboot" command would report success and change nothing.

---

## WP-CLI

The `wp sgs` namespace is the developer and pipeline command surface for SGS sites: Site Info,
template-part seeding and reset, conditional header/footer rules, migrations, the CPT-backed
header / footer / drawer lifecycle (`wp sgs header|footer|drawer set-active | clear-active | list
| seed-starter`), `wp sgs audit-colour-tokens` and `wp sgs media measure-tone` (photo brightness for section tone). It runs on the server over SSH (`ssh hd`),
and write commands need `--user=<id>`. Full reference: `.claude/wp-sgs-cli.md`.

---

## Environment and tools

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | v24.16.0 | Build tooling only — not on the server |
| @wordpress/scripts | 30.x | Handles webpack, eslint, format |
| WordPress | 7.1 | Block theme, no classic editor |
| PHP | 8.0+ | |
| Shell | PowerShell (dev) / Bash (SSH) | Use `;` not `&&` to chain PowerShell commands |
| Playwright | v1.58.2 | Globally installed on dev machine, Chromium ready |

### Linting and formatting

```powershell
cd plugins/sgs-blocks

# Lint JavaScript
npm run lint:js

# Lint CSS
npm run lint:css

# Auto-format
npm run format

# PHP lint (WordPress Coding Standards, through the repo ruleset phpcs.xml that the editor and the
# post-edit lint hook also use)
phpcs --standard=phpcs.xml plugins/sgs-blocks/includes/

# Naming conventions
python scripts/lint-naming-conventions.py
```

### PHP IDE stubs

Project uses `php-stubs/wordpress-stubs` v7.1.0 and `php-stubs/woocommerce-stubs` v11.1.2 (versions in `composer.lock`) for Intelephense IDE support. Installed to `vendor/` (gitignored). `composer.json` + `composer.lock` are committed.

```powershell
composer install  # installs stubs to vendor/ (dev-only, never deploy vendor/)
```

### Git workflow

See root `CLAUDE.md` "Git". Deployment is `python plugins/sgs-blocks/scripts/build-deploy.py` (see Deployment process); it is the only sanctioned path for every target.

### Site email: FluentSMTP over the client's own mailbox

Every email a site sends goes through `wp_mail()`, and FluentSMTP (free) routes `wp_mail()` over the client's mailbox by SMTP. Set a site up, or re-check it, with:

```bash
python plugins/sgs-blocks/scripts/provision-site-mail.py --target <target> --smtp-user <mailbox> --secret-key <KEY> \
    [--from-email <address>] [--from-name <name>] [--alert-email <address>] [--test-to <address>]
python plugins/sgs-blocks/scripts/provision-site-mail.py --target <target> --check   # exit 1 when unconfigured
```

It installs FluentSMTP, writes `FLUENTMAIL_SMTP_USERNAME` / `FLUENTMAIL_SMTP_PASSWORD` into `wp-config.php` (the password goes over SSH stdin; the connection's `key_store` is `wp_config`, so the database holds no password), saves the connection through FluentSMTP's own `Settings::store()` (`smtp.hostinger.com:465`, `ssl`, forced From), turns email logging on, and turns on FluentSMTP's daily sending digest (sent and failed counts; its only email alert). The From address, name and digest recipient default to the Site Info email and the site title; override all three on a test site that holds a real client's details. A mailbox alias cannot sign in: log in as the mailbox and send From the alias. The secrets file defaults to `.claude/secrets/ai-agent-credentials-and-info/email.env`; when a key is defined twice, the last definition wins.

sandybrown: From `admin@smallgiantsstudio.co.uk` (alias), login `ibraheem@smallgiantsstudio.co.uk`, key `SMTP_PASS_SGS`, digest to Bean. Sent mail is listed in WP Admin > Settings > FluentSMTP > Email Logs (table `{prefix}fsmpt_email_logs`).

### N8N: optional automation events, never the email path

Emails go through `wp_mail()` and FluentSMTP (§Site email above). A site that sets `sgs_n8n_webhook_url` also POSTs events there for automations (CRM rows, Slack): form submissions (`Form_Processor::send_webhook`), `sgs_wishlist_alert` and `sgs_back_in_stock` (`Sgs_Webhook::send`). The URL's path is a secret; read it with `wp option get sgs_n8n_webhook_url`, never commit it.

The workflow "SGS site events" (id `AJzRBARFn8AqQlkg`, `https://n8n.smallgiantsstudio.cloud`) is an **inactive backup**, because the shop alerts go out as WooCommerce emails and none must go out twice. It emails the two shop events over the `Hostinger SMTP - admin@ibraheemmustafa.com` credential for sites listed in `SITES` in `plugins/sgs-blocks/scripts/n8n/site-events-build-emails.js`. To use it again, activate it (`POST /api/v1/workflows/AJzRBARFn8AqQlkg/activate`) and switch the matching WooCommerce emails off so shoppers are not emailed twice. The repo code stays pushable:

```bash
python plugins/sgs-blocks/scripts/n8n/push-site-events.py           # push the repo code to the live node
python plugins/sgs-blocks/scripts/n8n/push-site-events.py --check   # exit 1 if the live code has drifted
```

The API key is `N8N_API_KEY` in `.claude/secrets/ai-agent-credentials-and-info/api-keys.env`. Check what the engine really holds (`GET /api/v1/workflows`, `/executions?workflowId=…`) rather than trusting this section.

### SGS DB queries (quick reference)

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats          # Framework health
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block sgs/hero  # Block details
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py match "pricing" # Find best block
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py context indus-foods # Load client
```

### DB schema notes

Row counts drift — query `/sgs-db` (or the column meanings above) rather than trusting a number in prose.

- **`blocks.tier`** — TEXT column, CHECK constraint `IN ('block', 'class-section', 'pattern')`. Populated by `/sgs-update` Stage 1 from each block's `supports.sgs.is_section_root` flag in `block.json`. Operator-set per block, not algorithmically inferred.
- **`block_composition`** — the container roster has `wraps_block` + `container_kind` populated (values `section|layout|content`).
- **`slots`** — composite PK on `(slot_name, scope)`; element-scope and section-scope rows. Role is derived from `property_suffixes`, not stored on the slot row.
- **`roles`** — base roles plus `scalar-media`. `INSERT OR REPLACE` from `_ROLE_CLASSIFICATION_MAP`.
- **`html_tag_to_core_block`** — seeded by `dbschema/seed_reference_data.py` from `plugins/sgs-blocks/scripts/data/atomic-tag-map.json`; the source of the atomic-tag map (no hardcoded dict).

### canonical_slot assignment

`plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` reads the `slots` + `roles` schema and backfills `canonical_slot`, `role` and `derived_selector`. Re-run it after every slot-vocabulary addition **through Stage 1**, from a clean detached-HEAD worktree, never on its own:

```bash
python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1
```

Stage 1 runs it as a tail step and then applies `scripts/attr-classification-overrides.json` (sub-step C) as the final writer. Run alone after a reseed, it overwrites those corrections. A timeout (900s cap) or a non-zero exit stops the reseed with exit 1 (`sgs-update-v2.py::_run_canonical_assignment`): it seeds `boolean-visibility`, so a run that skips it would leave boolean attrs on fallback roles while looking successful.

- **It writes the one physical `sgs-framework.db`.** uimax holds neither `block_attributes` nor `slots`; the `.claude` and `.agents` DB paths are the *same file* via an NTFS junction (not two copies) — so a single write reaches every path.
- **It is the deterministic mechanism for content-area `canonical_slot` tagging.** `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` runs automatically as `/sgs-update` Stage 1; with the `content` element-slot row and the `Width`/`Padding`→`layout` `property_suffixes` rows in place, it tags the content-area attrs (`contentWidth`/`contentPadding*`/`contentMaxWidth*`) `content`/`layout` deterministically — no manual seed step.

---

## Generated catalogues

Generated files live in `.claude/catalogues/`; grep them BEFORE building or hand-doing anything.

- `.claude/catalogues/tooling.md`: every gate, audit and codemod, and the script directories (`generate-tooling-catalogue.py`).
- `.claude/catalogues/helpers.md`: PHP helper functions and JS editor components/atoms (`generate-helper-catalogue.py`).
- Database counts: query live with `/sgs-db`; the column meanings are under "sgs-framework.db" above.

---

## Known Gotchas

| Gotcha | Detail |
|--------|--------|
| **SCP `-r` creates nested directories** | `scp -r theme/sgs-theme remote:path/sgs-theme` creates `sgs-theme/sgs-theme/`. One of several reasons never to hand-roll a deploy — use `build-deploy.py`. |
| **Hostinger caches CSS aggressively** | Bump version in `style.css` after CSS changes to bust cache. Theme version is the query string for all enqueued styles. |
| **`--webpack-copy-php` flag** | Build script copies `render.php` to `build/` automatically. Dynamic blocks won't render without this. |
| **`--experimental-modules` flag** | Required in build/start scripts for `viewScriptModule` in block.json. |
| **Deprecations NOT used** | The plugin carries no `deprecated.js` and block version bumps are forbidden pre-production. On a schema change, rebuild / re-clone the content, or use the Site Editor's "Attempt Block Recovery". Do NOT author a deprecation. |
| **SSH remote variable expansion** | Use single quotes for outer string when running `ssh hd '...'` so `$WP` expands on server. Double quotes expand locally. |
| **Never delete the live directory before the new copy is in place** | `rm -rf $WP/plugins/sgs-blocks` before the extract succeeds leaves the site with no plugin if anything fails in between. `build-deploy.py` rotates the previous copy to `<dir>.bak` and moves the new one in. Never hand-roll this. |
| **Tar `--exclude='src'` breaks vendor** | Too broad — strips `vendor/*/src/` subdirectories. `build-deploy.py` already carries the correct excludes. |
| **WP-CLI inline PHP escaping** | `wp eval '...'` breaks on shell special chars. Reliable fallback: write to `/tmp/script.php` with `cat << 'PHPEOF'`, scp to server, `wp eval-file ~/script.php`, then `rm`. |
| **`parse_blocks()` is shallow** | Only returns top-level blocks. Finding nested blocks requires a recursive function walking `$b['innerBlocks']`. |
| **Hostinger error logs** | Live at `~/.logs/error_log_<domain>`, not `wp-content/debug.log` (often stale). |
| **WP_DEBUG_DISPLAY contamination** | `WP_DEBUG_DISPLAY=true` injects PHP Notice banners that shift every section vertically, inflating pixel-diff 15-40pts. Set false on staging. |
