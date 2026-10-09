---
doc_type: architecture
scope: forever
title: SGS WordPress Framework — System Architecture
---

# SGS WordPress Framework — System Architecture

## 1. System overview

SGS is an AI website-builder built by Small Giants Studio: a WordPress block theme
(`sgs-theme`) + a Gutenberg blocks plugin (`sgs-blocks`, including forms) + a booking plugin
(`sgs-booking`) + a client-notes plugin (`sgs-client-notes`), plus a draft-to-page route (§4): the
computed route (Spec 47). It competes with Kadence, Spectra
and GenerateBlocks, so every block must be fully configurable by a non-technical client through the
block editor alone (root `CLAUDE.md` "Non-negotiables"). The framework is client-agnostic: no client
colour, copy, imagery or structure is hard-coded into the base theme or blocks plugin (root
`CLAUDE.md` intro and "Non-negotiables"). The working rules that gate every session are in root
`CLAUDE.md` "How to work here", not restated here.

**Counts, rosters, D-ceilings are DB- or repo-authoritative — never hard-coded in this file.**
Query them live:
- Block / attribute / table counts: `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`
  or `python ~/.claude/hooks/wp-blocks.py dump`
- D-ceiling: `grep -oE '^## D[0-9]+' .claude/archive/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- Current live status / which tracks are open: `.claude/LEDGER.md`

## 2. Stack

| Layer | Technology | Notes |
|---|---|---|
| CMS | WordPress 7.1 (re-verify with `wp core version` over SSH) | Block theme, no classic editor |
| Theme | `sgs-theme` | `theme.json` v3, template parts. Per-client colour/typography lives outside the theme — see §7 |
| Blocks plugin | `sgs-blocks` | Dynamic (render.php-driven) blocks; extensions in `src/blocks/extensions/` |
| Block build | `@wordpress/scripts` | `--experimental-modules --webpack-copy-php` (PHP `render.php` copied to `build/`) |
| Frontend JS | Vanilla ES modules + WordPress Interactivity API | No jQuery anywhere. `viewScriptModule` for interactive blocks |
| Motion | Four-tier doctrine (V/G/H/W), see §8 | All npm-bundled, conditionally loaded, zero CDN |
| Data layer | `sgs-framework.db` (SQLite) | Source of truth for block schema, composition, slots, roles — see §5 |
| Hosting | Hostinger, three sites: the `sandybrown` canary (`sandybrown-nightingale-600381.hostingersite.com`), `indus-test` (Indus Foods, `lavender-dinosaur-183533.hostingersite.com`) and `eye-care-test` (Eye Care Birmingham, `darkcyan-grouse-898606.hostingersite.com`) | Deploy targets are `TARGETS` in `plugins/sgs-blocks/scripts/build-deploy.py`. One test site per client because the active header, footer, drawer and snapshot pointers are single global options |

## 3. Directory structure

```
small-giants-wp/
├── theme/sgs-theme/           # Block theme — theme.json, templates/, parts/, patterns/, styles/ (empty, see §7)
├── plugins/
│   ├── sgs-blocks/            # Gutenberg blocks + forms + the converter scripts (own CLAUDE.md)
│   ├── sgs-booking/           # Appointment + event booking (own CLAUDE.md; deferred, Spec 03)
│   ├── sgs-client-notes/      # Visual annotation system (own CLAUDE.md; deferred, Spec 05)
│   ├── sgs-accessibility/     # A11y helpers (masonry, min-height, ARIA roles, form errors) — no own CLAUDE.md yet
│   └── sgs-configurator-pro/  # Product-configurator plugin work (own CLAUDE.md)
├── scripts/computed-route/    # Spec 47 computed route (README.md indexes its modules); scripts/parity/ holds the walker
├── sites/<client>/            # Per-client mockups, content, theme-snapshot.json, build/ trees (own CLAUDE.md per active client)
├── .claude/                   # Working area: specs/, archive/decisions.md, LEDGER.md, plans/, reports/ (own CLAUDE.md)
└── CLAUDE.md                  # Root rules — the spine; read this first every session
```

`plugins/sgs-blocks/src/blocks/` holds one directory per block, each following the standard
5-file pattern (`block.json`, `edit.js`, `render.php`, `style.css`, optionally `view.js`/
`view-module.js`) — see `plugins/sgs-blocks/CLAUDE.md` "Block Pattern".
`scripts/computed-route/` is the Spec 47 route (§4).

## 4. Draft → page routes

A design draft reaches a WordPress page by the computed route (Spec 47): script-rendered and static classless drafts alike. It shares the framework DB (§5), the parity walker and the page builder with nothing else.

### 4.1 Computed route (Spec 47)

**What it does.** Measures the rendered draft and writes block settings through the framework DB, never
copying the draft's DOM or classes. Spec: `.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md`.

- **Code:** `scripts/computed-route/` (its `README.md` is the module index, enforced by `lint.mjs`).
  Commands: `calibrate.mjs` (measures what each block setting paints), `fill.mjs` (skeleton plus
  measured draft to a tree), `solve.mjs` (compare, write, rebuild, at most three rounds), `sweep.mjs`
  and `triage.mjs` (classify what survives), `confirm-canvas.mjs`; shared code in `lib/`.
- **Data:** layout trees in `sites/<client>/build/*.tree.json`; surfaces in
  `sites/<client>/build/surfaces.json`.
- **Build and measure:** trees are built through `scripts/wp-build-page.js`; the parity walker
  `scripts/parity/draft-live-walk.mjs` compares draft and live.
- **Accepted differences:** the divergence ledger `sites/<client>/build/qa/divergences.json`, linted
  against the client's fix register.

## 5. The data layer — `sgs-framework.db`

**DB-first, no hardcoded dicts (R-31-1).** Every converter lookup (block to slot, role classification, CSS
property routing, variant discrimination) reads `sgs-framework.db` through the accessor layer. The only
permitted hardcoded constant is `SKIP_TOP_LEVEL_TAGS` (header/footer/nav).

**Access pattern.** `converter/db/db_lookup.py` runs schema migrations against the shared live DB as an
import side effect, so a read-only reporter must not import it. Open the DB directly read-only:
`sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)` (as `audit-declared-vs-seeded-roles.py`
and `audit-feature-parity.py` do). For an ad-hoc query use
`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT …"` (the `/sgs-db` skill).

**Key tables** (names only; query counts, never cache them): `blocks` (roster, `tier`, `variant_attr`),
`block_attributes` (per-attribute `role`, `emit_shape`, `box_family`/`box_side`, `css_property`/
`css_element`/`css_state`/`css_tier`, `canonical_slot`), `block_composition` (`container_kind`,
`wraps_block`), `block_supports` / `block_capabilities`, `slots` / `roles` (BEM vocabulary and role
classification), `property_suffixes` (CSS property to device-tier attribute name, the D0/D1/D2 router's
core lookup), `variant_slots` / `variant_composition_slots` (discriminating slots and child-block sets),
`preset_implications` (implied CSS for preset-selector attrs, parsed from each block's `style.css`) and
`array_item_schema` (per-field roles for repeater attributes).

`/sgs-update` (`sgs-update-v2.py`) rebuilds the DB from block.json files, render.php parsing,
REST enumeration, and pattern parsing. Its own module docstring is the authoritative stage
index — do not cache a stage count here.

## 6. Component architecture

### 6.1 No-inline styling contract (Spec 32)

**No SGS block may render an inline `style="…"` property declaration.** Native WP `supports` stay
declared (they drive the editor controls), but their auto-inline output is suppressed per-property
(`__experimentalSkipSerialization`) and re-routed through `wp_style_engine_get_styles()` into the block's
own scoped `<style>` at class-level specificity (`.{uid}.{block-root-class}`, never `#{uid}`), so a
`sgsCustomCss` residual overrides it by equal specificity and source order.

Per-side/per-corner box properties (padding, margin, border-width, border-radius) merge into one named
object attribute (`{top,right,bottom,left}` or `{topLeft,topRight,bottomLeft,bottomRight}`) driven by WP's
`BoxControl`. The `block_attributes.box_family` column (seeded from `block.json supports.sgs.boxFamilies`,
never a name-regex) is the collision guard; a structural AST gate fails the build if a box-property
grouping runs without checking it.

Verify current compliance: `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check`.
Canonical spec: `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md`.

### 6.2 `SGS_Container_Wrapper` and the composite wrapper rule

`sgs/container` is the canonical wrapper block (background media, shape dividers, width capping, grid/flex
layout, responsive gap, shadow). Every composite with a built-in outer wrapper (hero, cta-section, trust-bar,
card-grid, …) offers the container panels it needs, opt-in per block, and must not diverge from the
wrapper's computed behaviour with per-block CSS hacks (Spec 02 "Composite wrapper rule", R-31-9). `block_composition.container_kind`
(`section` / `layout` / `content`) is read from `block.json supports.sgs.containerKind` by `/sgs-update`.

**A composite need not call `SGS_Container_Wrapper::render()`.** A content-KIND composite using only
box + width (quote, info-box, testimonial, team-member) may render block-private, because the
converter routes CSS by `block_attributes` keyed on `block_slug`, never by `wraps_block`. Section/layout-KIND
composites (hero, cta-section, card-grid, feature-grid) keep the wrapper for its grid/section
machinery. A capability gap on a composite is added to the composite, never worked around in the
converter. The shared helper is `plugins/sgs-blocks/includes/class-sgs-container-wrapper.php`.

### 6.3 Block customisation standard

Every block: (1) native `supports` for wrapper-level controls; (2) custom attrs and controls for each
inner text element, colour via `SgsColourPanel`; (3) the same for every CTA; (4) the Block Selectors API
targets native typography to the primary text element. Borders use `SgsBorderControl`. Detail:
`plugins/sgs-blocks/CLAUDE.md` "Block Customisation Standard"; helper registries:
`.claude/rules/colour-emission.md`, `.claude/rules/block-editor-controls.md`.

### 6.4 Page-level singletons and shared frontend stores

A behaviour that belongs to the PAGE rather than to one block (the add-to-bag toast,
`includes/class-sgs-toast.php`) is a server-rendered singleton emitted on `wp_footer`: Interactivity
directives on nodes injected later never hydrate, so the region must exist in the HTML. A rendering
block opts in through the class's own request method, so a page with no participating block pays
nothing (precedents: `class-sgs-floating-ui-renderer.php`, `class-product-item-list.php`).

Shared frontend behaviour lives in `src/shared/<name>/store.js` registering one Interactivity
namespace, imported by relative path from each consuming `viewScriptModule`; no `webpack.config.js`
entry or `wp_register_script_module()` call is needed (`src/shared/nav-interactivity/store.js`'s
docblock is the reference). ALL state must live in the store's `state`: module-scope variables are
per-bundle and would desynchronise.

## 7. Per-client theming

`theme/sgs-theme/styles/` is deliberately empty: the framework uses no WordPress style variations.
Per-client tokens live at `sites/<client>/theme-snapshot.json` (Spec 32 Parts C and D, extracted from the draft's rendered
computed styles before any block conversion) and deploy via
`plugins/sgs-blocks/scripts/push-theme-snapshot.py --client <slug> --target <ssh-host>`, which writes
`wp_global_styles`. Client CSS overrides go into the snapshot's `styles.css` or
`sites/<client>/theme-overrides.css`, never the framework's own `style.css`.

## 8. Motion architecture (Spec 38)

**Four-tier doctrine (constitutional):** V (vanilla/CSS) is the default for every effect; G (GSAP) is
admitted only for what V cannot do (pin+scrub, SplitText, Flip, Draggable, ScrollSmoother, DrawSVG,
MorphSVG, image-sequence); H (a single-purpose helper) is a closed list, currently Lenis alone; W (WebGL)
is a different rendering substrate with its own five-part test and a named 120KB JS allowance for
Tier-W pages alone. All tiers are npm-bundled and conditionally loaded, with no CDN. The converter's
`data-sgs-fx-*` grammar (Spec 38 §11) is how a draft declares a section's motion. Canonical spec:
`.claude/specs/38-SGS-MOTION-SYSTEM.md` (§1 is the constitutional statement, §3 the capability roster).

## 9. Integration surfaces

| Surface | Mechanism |
|---|---|
| Theme → blocks plugin | `theme.json` design tokens as CSS custom properties (`--wp--preset--*`); Block Selectors API targets native typography per block |
| Blocks plugin → DB | Read-only queries against `sgs-framework.db` (§5's access pattern); `/sgs-update` writes it |
| Computed route → WordPress | `scripts/wp-build-page.js` builds trees through the editor; `scripts/parity/draft-live-walk.mjs` measures draft against live; both read the framework DB read-only (§4.1) |
| Blocks plugin → email | Every email goes through `wp_mail()` (SGS code via `Sgs_Mailer`, shop alerts as `WC_Email` subclasses) over the site's SMTP mailbox via FluentSMTP; N8N receives optional automation events only |
| Blocks plugin → WooCommerce cart lines | One server-built line summary feeds the bag drawer, cart, checkout, emails and order screens. No spec governs it; the code and docblocks in `plugins/sgs-blocks/includes/cart-line-summary/` are the reference, and the Store API `extensions` stdClass trap is in auto memory |
| Blocks plugin → Customiser | Floating UI (Back to Top, Reading Progress) settings stored as `theme_mod`, output via `wp_footer` |
| Per-client deployment | `sites/<client>/theme-snapshot.json` → `push-theme-snapshot.py` → `wp_global_styles` (§7) |
| Deploy | `plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` is the ONE path (never hand-rolled tar/scp); `--target indus-test` and `--target eye-care-test` deploy to those test sites. It deploys from an isolated `git worktree add HEAD` |

## 10. Architectural principles

For what is built today or the current front, read `.claude/LEDGER.md` — the single live-status
source. The decision log is `.claude/archive/decisions.md`.

1. **Dynamic blocks only.** Every non-trivial block uses `render` in `block.json` pointing to
   `render.php`; `save()` returns `null` or `<InnerBlocks.Content />`. PHP controls output.
2. **Every visual property is a block attribute with an editor control** — never hard-coded CSS.
   CSS supplies structural defaults only.
3. **`sgs/container` is the universal layout primitive** for every multi-column/section layout.
   Nesting containers inside containers is the correct pattern for complex layouts.
4. **No inline styling, framework-wide** (§6.1); `audit-inline-styling.js --check` proves it.
5. **Composite wrapper rule.** No composite with a built-in wrapper diverges from the wrapper's
   computed behaviour; `container_kind` gates which 3-layer panels a block exposes (§6.2).
6. **Content-KIND composites may render block-private**; section/layout-KIND composites keep the
   shared wrapper (§6.2).
7. **One cloning route**: Spec 47. The binding rules `R-31-N` (also cited as `R-22-N`) live in `.claude/rules/framework-principles.md`.
8. **No fallback route.** Every draft takes the computed route (§4); there is no second route to fall back to.
9. **Root-cause methodology is mandatory.** No fix without a proven cause; verify every dependency
   a theory rests on. Full statement: root `CLAUDE.md` "How to work here".
10. **Git hygiene: commit straight to `main`, never open a PR, never `git stash`.** A stash or a
    glob-pathspec commit sweeps other sessions' uncommitted work. Rules: root `CLAUDE.md` "Git" and
    `~/.claude/rules/git-hygiene.md`.
11. **Motion follows the four-tier doctrine** (§8).
12. **Scalar-media routing covers all three device tiers and all three media types**, so a draft's
    art-directed image, video or SVG has a routing path.
13. **Composition-based variant tiebreaker.** `variant_composition_slots` resolves variants that share
    every attribute value with a sibling by their child-block-name set; it fires only when the
    attribute-value pass ties.
14. **Deploy isolates via `git worktree add HEAD` by default**, so a concurrent build cannot clobber `build/`.

## 11. Known technical debt

Real, current items only. `.claude/LEDGER.md` carries the live status of each.

| Item | Notes |
|---|---|
| Colour conformance, FILL surface | The TEXT surface is closed; FILL rows remain as a separate track — the count is a live census, don't cache it here |
| Tier-object migration, remaining flat-trio attributes | Closed for hero's media family + accordion/button/table-of-contents/whatsapp-cta; a framework-wide survey has not been run |
| Inspector gates, rule 41/43 residuals | `co2-scattered-element` + `dom-order-vs-declared-order` findings open; count them with `node plugins/sgs-blocks/scripts/inspector-scan/run.js --json` (rules `41-co2-element-grouping-order.js`, `43-colour-only-state-indicator.js`) |
| `push-theme-snapshot.py` | Refuses to write `wp_global_styles` without a verified backup; run it with `--no-push` against a target to see whether it aborts |
| Blocks with `:hover` rules but no `:focus-visible` counterpart | Re-derive the roster before acting: `git grep -l ':hover' -- plugins/sgs-blocks/src/blocks/*/style.css`, then check each file for a `:focus-visible` rule |
| `box-shape`/`overlay` `:hover` rules unguarded against touch-hover-stuck | The hover-guard tooling never scans `assets/css/media-atoms/*.css` |
| `sgs-accessibility` plugin has no `CLAUDE.md` yet | Undocumented at the plugin level |

## 12. External dependencies

| Service | Purpose |
|---|---|
| Hostinger | Web hosting for the canary and the Indus and Eye Care test sites (`ssh hd` alias) |
| FluentSMTP | Per-site SMTP for `wp_mail()`, with email logs (`provision-site-mail.py`) |
| N8N | Optional automation events (`sgs_n8n_webhook_url`); never the email path |
| Playwright | Visual/live-DOM verification, MCP + CLI |
| Lucide | Icon set, pre-generated to `lucide-icons.php` |
| Inter (variable), Montserrat, Source Sans 3 | Self-hosted WOFF2 fonts, no CDN |

## 13. Where the rest of the truth lives

This file stays at system altitude. Follow the pointer for anything lower:

| For | Read |
|---|---|
| Hard rules, deploy commands, non-negotiables | root `CLAUDE.md` |
| Spec roster + the DEAD-never-cite list | `.claude/specs/README.md` |
| Current live status, open tracks, what shipped today | `.claude/LEDGER.md` |
| Structural defences / lessons | Claude Code auto memory (not a repo path) |
| D-numbered decision log | `.claude/archive/decisions.md` (frozen) |
| Open deferred work | relevant plan/spec + `.claude/LEDGER.md` |
| Computed route full detail | `.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md`, `scripts/computed-route/README.md` |
| Styling/token contract full detail | `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Inspector-UX standard | `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Motion system full detail | `.claude/specs/38-SGS-MOTION-SYSTEM.md` |
| Block-level architecture | `plugins/sgs-blocks/CLAUDE.md` |
| Colour/border helper registries | `.claude/rules/colour-emission.md`, `.claude/rules/block-editor-controls.md` |
| Build / deploy / SSH / credentials | `.claude/dev-setup.md` |
