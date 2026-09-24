---
doc_type: architecture
scope: forever
title: SGS WordPress Framework — System Architecture
---

# SGS WordPress Framework — System Architecture

## 1. System overview

SGS is an AI website-builder built by Small Giants Studio: a WordPress block theme
(`sgs-theme`) + a Gutenberg blocks plugin (`sgs-blocks`, including forms) + a booking plugin
(`sgs-booking`) + a client-notes plugin (`sgs-client-notes`), plus a **cloning pipeline**
(`/sgs-clone`) that converts an SGS-BEM-authored HTML draft into native, attribute-driven SGS
blocks on a real WordPress page. It competes with Kadence, Spectra and GenerateBlocks — every
block must be fully configurable by a non-technical client through the block editor alone (root
`CLAUDE.md` "Client experience is primary"). The framework is client-agnostic by design: no
client colour, copy, imagery or structure may be hard-coded into the base theme or blocks
plugin — see root `CLAUDE.md` "SGS is a standalone framework, not a client project".

**The 7 non-negotiable rules** (convert-don't-mirror, no cheats, universal-no-carve-outs,
no-skipping, verify-on-the-real-homepage, responsive-values-in-attributes-not-inline-CSS,
design-gate-sensitive-changes) are stated in full in root `CLAUDE.md` and gate every session —
not restated here to avoid a second copy that drifts.

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
| Motion | Four-tier doctrine (V/G/H/W) — see §6 | All npm-bundled, conditionally loaded, zero CDN |
| Data layer | `sgs-framework.db` (SQLite) | Source of truth for block schema, composition, slots, roles — see §5 |
| Hosting | Hostinger, three sites: the `sandybrown` canary (`sandybrown-nightingale-600381.hostingersite.com`), the `indus-test` Indus Foods test site (`lavender-dinosaur-183533.hostingersite.com`) and the `eye-care-test` Eye Care Birmingham test site (`darkcyan-grouse-898606.hostingersite.com`) | Deploy targets are the `TARGETS` dict in `plugins/sgs-blocks/scripts/build-deploy.py`. Each test site exists because the active header, footer, drawer and theme-snapshot pointers are single global options per WordPress site, so two clients cannot share one site |

## 3. Directory structure

```
small-giants-wp/
├── theme/sgs-theme/           # Block theme — theme.json, templates/, parts/, patterns/, styles/ (empty, see §7)
├── plugins/
│   ├── sgs-blocks/            # Gutenberg blocks + forms + the cloning-pipeline scripts (own CLAUDE.md)
│   ├── sgs-booking/           # Appointment + event booking (own CLAUDE.md; deferred, Spec 03)
│   ├── sgs-client-notes/      # Visual annotation system (own CLAUDE.md; deferred, Spec 05)
│   ├── sgs-accessibility/     # A11y helpers (masonry, min-height, ARIA roles, form errors) — no own CLAUDE.md yet
│   └── sgs-configurator-pro/  # Product-configurator plugin work (own CLAUDE.md)
├── sites/<client>/            # Per-client mockups, content, theme-snapshot.json (own CLAUDE.md per active client)
├── .claude/                   # Working area — specs/, decisions.md, LEDGER.md, plans/, reports/ (own CLAUDE.md)
└── CLAUDE.md                  # Root rules — the spine; read this first every session
```

`plugins/sgs-blocks/src/blocks/` holds one directory per block, each following the standard
5-file pattern (`block.json`, `edit.js`, `render.php`, `style.css`, optionally `view.js`/
`view-module.js`) — see `plugins/sgs-blocks/CLAUDE.md` "Block Pattern".
`plugins/sgs-blocks/scripts/converter/` is the cloning-pipeline engine (§4).

## 4. The cloning pipeline

**What it does.** Converts a draft HTML mockup authored in SGS-BEM (`.sgs-<block>__<element>--
<modifier>`, Spec 00 §3.1) into native SGS blocks driven by their own attributes — never a
div-by-div mirror of the draft's DOM/classes. Canonical spec: `.claude/specs/31-UNIVERSAL-
CLONING-PIPELINE.md` — read it in full at the start of any pipeline session (project rule).

**The walker.** ONE recursive function with exactly three permitted exceptions (R-31-3 /
FR-31-3): atomic-tag swap (a bare `<p>`/`<h1>`/`<img>` etc. with no SGS classes routes via a
DB-driven tag map), top-level chrome-skip (`header`/`footer`/`nav` — the only three permitted
hardcoded tag names, R-31-1), and top-level container wrap. Every other decision comes from DB
row data, never a 4th conditional or a slug literal. BEM is the *only* recognition signal
(R-31-2) — HTML tag is rendering shape only.

**The content fork.** Every content-bearing attribute has a universal functional *identity*
(`equivalent_block_for` — what kind of content: text/heading/media/button) which is separate
from its *emit shape* (`block_attributes.emit_shape`, `nested` vs `child` — does this block
render the value itself, or hand it to an InnerBlocks child). One universal per-attribute walk
(not a block-level `has_inner_blocks` dispatch) decides each attribute's shape, because a single
block can genuinely mix both shapes (Spec 31 §13.3, FR-31-2.6).

**CSS routing — three destinations (D0/D1/D2, Spec 31 §13.4 FR-31-5):**

| Destination | What |
|---|---|
| D0 | Global design tokens → `theme.json` |
| D1 | Typed-attr lift → a native block attribute (when a `property_suffixes` row matches) |
| D2 | Scoped variation CSS, inlined at deploy (`variation-d0-d2.css`) |

A property with none of the above is captured as a `ResidualBand` (an out-of-device-tier
breakpoint) and serialised into the block's own `sgsCustomCss` field — never silently dropped
(R-31-15 "no mirror emit"; a draft class silently absent from the clone is a rule violation, not
an acceptable gap).

**The 3-layer wrapper model** (OUTER / CONTENT-WIDTH / PER-GRID-ITEM) is how every composite
with a built-in wrapper mirrors `sgs/container`'s capabilities — see §5's composite-mirror rule.

**Fidelity measurement — computed-parity, Stage 11.6 (Spec 20).** `scripts/parity/
computed-parity.js` compares `getComputedStyle` on the rendered clone vs the draft, matched by
normalised TEXT CONTENT (not wrapper class, not source-declaration diff — both give
unreliable scores, `.claude/specs/20-CLONE-FIDELITY-MEASUREMENT.md`). Runs automatically post-deploy. **This is a per-commit
DIAGNOSTIC, never the closing gate (R-31-4)** — the pipeline never ships on a number alone.
Closure requires the live per-section visual check plus Bean's eye (R-31-13) — script and human
judgement are co-authoritative, neither closes alone.

**Stage map.** Do not cache stage numbers here. The pipeline is a
contiguous numbered sequence; read the stage index in `/sgs-update`'s own module docstring
(`plugins/sgs-blocks/scripts/sgs-update-v2.py`) or Spec 31 Appendix D.

## 5. The data layer — `sgs-framework.db`

**DB-first, no hardcoded dicts (R-31-1).** Every pipeline lookup — block→slot mapping, role
classification, CSS property routing, variant discrimination — reads from `sgs-framework.db`
via the accessor layer, never a hand-maintained Python dict. The only permitted hardcoded
constant is `SKIP_TOP_LEVEL_TAGS` (3 entries: header/footer/nav).

**Access pattern — read carefully.** There is no plain read-only
`db_lookup.py` at `plugins/sgs-blocks/scripts/`. The only module of that name is
`converter/db/db_lookup.py`, which runs schema-migration functions against the shared live DB
**as an import side effect** — do not import it from a read-only reporter. For a plain read,
open the DB directly read-only:
```python
sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
```
— the convention used by `audit-declared-vs-seeded-roles.py`, `generate-db-catalogue.py`, and
`audit-feature-parity.py`. For an ad-hoc query, use `python
~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT …"` (the `/sgs-db` skill).

**Key tables** (names only — row counts drift daily, query them, don't cache them here):

| Table | What it's for |
|---|---|
| `blocks` | Block roster; `tier` (block / class-section / pattern), `variant_attr` (names the variant-selector attr) |
| `block_attributes` | Per-attribute routing: `role`, `emit_shape`, `box_family`/`box_side`, `css_property`/`css_element`/`css_state`/`css_tier`, `canonical_slot` |
| `block_composition` | `container_kind` (section / layout / content), `wraps_block` — the composite-mirror roster |
| `block_supports` / `block_capabilities` | Native WP `supports` + SGS capability flags per block |
| `slots` / `roles` | Element- and section-scope BEM vocabulary + role classification |
| `property_suffixes` | CSS property → device-tier attribute-name mapping (the D0/D1/D2 router's core lookup) |
| `variant_slots` / `variant_composition_slots` | Per-variant discriminating attribute slots / discriminating child-block sets (for variants that share every attribute value) |
| `preset_implications` | Auto-derived implied-CSS map for preset-selector attrs (e.g. `cardStyle`, `effectHover`), parsed from each block's own `style.css` |
| `array_item_schema` | Per-field role declarations for repeater/array attributes |

`/sgs-update` (`sgs-update-v2.py`) rebuilds the DB from block.json files, render.php parsing,
REST enumeration, and pattern parsing. Its own module docstring is the authoritative stage
index — do not cache a stage count here.

## 6. Component architecture

### 6.1 No-inline styling contract (Spec 32)

**No SGS block may render an inline `style="…"` property declaration.** Native WP `supports`
(colour, spacing, border, typography) stay *declared* — they still drive the block's editor
controls — but their auto-inline output is suppressed per-property
(`__experimentalSkipSerialization`) and re-routed through `wp_style_engine_get_styles()` into
the block's own scoped `<style>` block at class-level specificity (`.{uid}.{block-root-class}`,
never `#{uid}` — the class-level scoping is load-bearing: it's what lets a `sgsCustomCss`
residual override it by equal specificity + source order, matching the WP-core Additional-CSS
idiom).

Per-side/per-corner box properties (padding, margin, border-width, border-radius) merge into a
single named object attribute — `{top,right,bottom,left}` for 4-side families,
`{topLeft,topRight,bottomLeft,bottomRight}` for 4-corner — driven by WP's native `BoxControl`.
The `block_attributes.box_family` DB column (seeded declaratively from each block's
`block.json supports.sgs.boxFamilies`, never a name-regex) is the collision guard, and a
structural AST gate fails the build if any box-property grouping runs without checking it.

Verify current compliance: `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check`.
Canonical spec: `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md`.

### 6.2 `SGS_Container_Wrapper` and the composite-mirror rule

`sgs/container` is the canonical wrapper block (background image/video/parallax, shape
dividers, width/content-width capping, grid/flex layout, responsive gap, grid-item defaults,
shadow). Every composite block with a built-in outer wrapper (hero, cta-section, trust-bar,
card-grid, …) must mirror its capabilities rather than diverge with per-block CSS hacks — this
is a composite-mirror obligation (Spec 31 §13.6 FR-31-21.1), gated on the DB's
`block_composition.container_kind` column (`section` / `layout` / `content`), propagated by
`block.json supports.sgs.containerKind` → `/sgs-update`.

**"Mirror capabilities" does not mean "must call `SGS_Container_Wrapper::render()`"** — this is
a settled clarification, not an open design question. A **content-KIND composite that uses only
box + width** (quote, info-box, testimonial, team-member) may render **block-private** — its own
scoped `<style>`, no wrapper call — because the converter routes CSS by `block_attributes` keyed
on `block_slug`, never by `wraps_block`/`container_kind`, so dropping the wrapper has zero walker
impact. **Section/layout-KIND composites** (hero, cta-section, card-grid, feature-grid) **keep
the wrapper** because they use its genuine grid/section machinery. This is the pattern selector;
do not re-litigate it per block.

A composite is never a separate system — its wrapper, when used, is the same shared helper
(`plugins/sgs-blocks/includes/class-sgs-container-wrapper.php`) as every other section-KIND
block. A capability gap discovered on one composite is a design gap to *add to the composite*,
never a converter workaround.

### 6.3 Block customisation standard

Every block: (1) native `supports` for wrapper-level editor controls; (2) custom attrs +
controls for each inner text element, colour via `SgsColourPanel` (the standard shared
component); (3) custom attrs + controls for every CTA; (4) Block Selectors API in `block.json`
targets native typography to the block's primary text element. Border controls standardise on
`SgsBorderControl` (one shape for width + colour + style across the framework). Full detail +
the colour/border helper registries: `plugins/sgs-blocks/CLAUDE.md` "Block Customisation
Standard".

## 7. Per-client theming

`theme/sgs-theme/styles/` is deliberately empty — the framework does not use WordPress style variations.
Per-client colour/typography tokens live at `sites/<client>/theme-snapshot.json` (Spec 33 —
extracted from the draft's own rendered computed styles, the opening step of the cloning
pipeline, before any block conversion runs) and deploy via
`plugins/sgs-blocks/scripts/push-theme-snapshot.py --client <slug> --target <ssh-host>`, which
writes `wp_global_styles`. Client-specific CSS overrides go into the snapshot's `styles.css` or
`sites/<client>/theme-overrides.css` — never into the framework's own `style.css`.

## 8. Motion architecture (Spec 38)

**Four-tier doctrine (constitutional):**

| Tier | What | Rule |
|---|---|---|
| **V** — vanilla/CSS | The default for every effect | Used unless vanilla genuinely cannot do it |
| **G** — GSAP | The bounded exception | Admitted only for what Tier V cannot do (pin+scrub, SplitText, Flip, Draggable, ScrollSmoother, DrawSVG, MorphSVG, image-sequence) |
| **H** — helper/utility | A single-purpose library that is neither vanilla nor GSAP | A CLOSED list — currently Lenis alone, admitted per a documented four-part test |
| **W** — rendering substrate | WebGL — a different rendering substrate, not "another library" | Admitted only on its own five-part test; carries a NAMED 120KB JS allowance for Tier-W pages alone |

All tiers are npm-bundled and conditionally loaded — a page using none of them ships zero bytes
of any. No CDN, ever. The cloning pipeline's `data-sgs-fx-*` grammar (Spec 38 §11) is the first
home for how a draft declares which motion effect a section wants. Canonical spec:
`.claude/specs/38-SGS-MOTION-SYSTEM.md` — its own §1 is the constitutional statement; §3 is the
curated capability roster.

## 9. Integration surfaces

| Surface | Mechanism |
|---|---|
| Theme → blocks plugin | `theme.json` design tokens as CSS custom properties (`--wp--preset--*`); Block Selectors API targets native typography per block |
| Blocks plugin → DB | Read-only queries against `sgs-framework.db` (§5's access pattern); `/sgs-update` writes it |
| Cloning pipeline → WordPress REST | Deploy stage `PATCH /wp/v2/pages/{id}`; Playwright captures at 375/768/1440px against the live canary for verification |
| Cloning pipeline → fidelity measurement | Stage 11.6 `computed-parity.js` (Spec 20), diagnostic only, never the gate |
| Blocks plugin → notifications | Form/booking submissions route to an N8N webhook, never `wp_mail()` |
| Blocks plugin → Customiser | Floating UI (Back to Top, Reading Progress) settings stored as `theme_mod`, output via `wp_footer` |
| Per-client deployment | `sites/<client>/theme-snapshot.json` → `push-theme-snapshot.py` → `wp_global_styles` (§7) |
| Deploy | `plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` — the ONE path; never hand-rolled tar/scp. `--target indus-test` and `--target eye-care-test` deploy to those test sites. It builds and deploys from an isolated `git worktree add HEAD` by default, so a concurrent session's build or uncommitted dirty files cannot collide with the deploy |

## 10. Architectural principles

For what is built today or the current front, read `.claude/LEDGER.md` — the single live-status
source. The decision log is `.claude/archive/decisions.md`.

1. **Dynamic blocks only.** Every non-trivial block uses `render` in `block.json` pointing to
   `render.php`; `save()` returns `null` or `<InnerBlocks.Content />`. PHP controls output.
2. **Every visual property is a block attribute with an editor control** — never hard-coded CSS.
   CSS supplies structural defaults only.
3. **`sgs/container` is the universal layout primitive** for every multi-column/section layout.
   Nesting containers inside containers is the correct pattern for complex layouts.
4. **No inline styling, framework-wide.** Zero `sgs/*` blocks emit an inline `style` property
   declaration (§6.1); `audit-inline-styling.js --check` proves it.
5. **Composite-mirror rule.** No composite with a built-in wrapper may diverge from
   `sgs/container`'s capabilities; the `container_kind` column gates which 3-layer panels a block
   exposes (§6.2).
6. **Content-KIND composites may render block-private** — section/layout-KIND composites keep the
   shared wrapper (§6.2).
7. **One canonical cloning-pipeline spec** — Spec 31. Older `R-22-N`/`FR-22-N` citations map 1:1
   to `R-31-N`/`FR-31-N`.
8. **One converter** — the modular `converter/` engine, no flag, no fallback (§4).
9. **Root-cause methodology is mandatory.** No fix without a proven cause; verify every dependency
   a theory rests on; attest with at least two independent evidence sources. Full statement: root
   `CLAUDE.md` "Root-cause methodology".
10. **Git hygiene: commit straight to `main`, never open a PR, never `git stash`.** The shared
    worktree carries many concurrent sessions; a stash or a glob-pathspec commit sweeps other
    sessions' uncommitted work. Full rules: root `CLAUDE.md` "Git workflow" +
    `~/.claude/rules/git-hygiene.md`.
11. **Motion follows the four-tier doctrine** — see §8.
12. **Scalar-media routing covers all three device tiers and all three media types**, so a
    draft's mobile/tablet art-directed image, video or SVG has a routing path.
13. **Composition-based variant tiebreaker.** `variant_composition_slots` resolves variants that
    share every attribute value with a sibling by discriminating child-block-name set; it only
    fires when the attribute-value pass ties.
14. **Deploy isolates via `git worktree add HEAD` by default**, so a shared `build/` directory
    cannot be clobbered by a concurrent session's `npm run build`.

## 11. Known technical debt

Real, current items only. `.claude/LEDGER.md` carries the live status of each.

| Item | Notes |
|---|---|
| Colour conformance, FILL surface | The TEXT surface is closed; FILL rows remain as a separate track — the count is a live census, don't cache it here |
| Tier-object migration, remaining flat-trio attributes | Closed for hero's media family + accordion/button/table-of-contents/whatsapp-cta; a framework-wide survey has not been run |
| Inspector gates, rule 41/43 residuals | `co2-scattered-element` + `dom-order-vs-declared-order` findings open; `.claude/LEDGER.md` has the current count |
| `push-theme-snapshot.py` | Refuses to write `wp_global_styles` without a verified backup; run it with `--no-push` against a target to see whether it aborts |
| Blocks with `:hover` rules but no `:focus-visible` counterpart | Re-derive the roster before acting: `git grep -l ':hover' -- plugins/sgs-blocks/src/blocks/*/style.css`, then check each file for a `:focus-visible` rule |
| `box-shape`/`overlay` `:hover` rules unguarded against touch-hover-stuck | The hover-guard tooling only scans `build/blocks/*/style.css` and PHP render surfaces, never `assets/css/media-atoms/*.css` — a real gap shared by the whole media-atom family |
| `sgs-accessibility` plugin has no `CLAUDE.md` yet | Exists in the tree with real commits; undocumented at the plugin level |

## 12. External dependencies

| Service | Purpose |
|---|---|
| Hostinger | Web hosting for the canary and the Indus test site (`ssh hd` alias) |
| N8N | Form/booking notification webhook (used instead of `wp_mail()`) |
| Playwright | Visual/live-DOM verification, MCP + CLI |
| Lucide | ~1900 icons, pre-generated to `lucide-icons.php` |
| Inter (variable), Montserrat, Source Sans 3 | Self-hosted WOFF2 fonts, no CDN |

## 13. Where the rest of the truth lives

This file is deliberately altitude-limited. For anything below "system architecture", follow
the pointer — do not duplicate the content here:

| For | Read |
|---|---|
| Hard rules, deploy commands, the 7 non-negotiable rules | root `CLAUDE.md` |
| Spec roster + the DEAD-never-cite list | `.claude/specs/README.md` |
| Current live status, open tracks, what shipped today | `.claude/LEDGER.md` |
| Structural defences / lessons | Claude Code auto memory (not a repo path) |
| D-numbered decision log | `.claude/archive/decisions.md` (frozen) |
| Open deferred work | relevant plan/spec + `.claude/LEDGER.md` |
| Cloning pipeline full detail | `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` |
| Styling/token contract full detail | `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Inspector-UX standard | `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Motion system full detail | `.claude/specs/38-SGS-MOTION-SYSTEM.md` |
| Block-level architecture, colour/border helper registries | `plugins/sgs-blocks/CLAUDE.md` |
| Build / deploy / SSH / credentials | `.claude/dev-setup.md` |
