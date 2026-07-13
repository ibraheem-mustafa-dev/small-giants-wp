---
doc_type: architecture
scope: forever
title: SGS WordPress Framework — System Architecture
split_note: "2026-05-24 — split into 3 parts: architecture.md (this file, system design), .claude/dev-setup.md (build/deploy/SSH), .claude/plans/archive/2026-02-21-feature-audit.md (354-feature graded roadmap)"
---

> Last updated: 2026-07-13. Recent: Header + Footer + Navigation SYSTEM design-gate APPROVED (Bean sign-off 2026-07-13) — see "Header/Footer/Navigation system architecture" section below + `.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md` + Spec 17. New specialised container blocks `sgs/site-header` / `sgs/site-footer` / `sgs/adaptive-nav` PERMITTED inside the existing template-part architecture (rule evolution of `no-header-footer-block.py`); P0 (off-canvas drawer `inert`-freeze bug fix) SHIPPED + live-verified; P1-P5 (the new blocks) NOT started — design-approved, build-pending. Prior: D222 (2026-06-13) name-free align/grid LAYER-ROUTER SHIPPED — hardcoded `verticalAlign`/`alignItems` attr-name fork removed from `convert.py`; align resolves via `db.attr_for_layer_property(slug,"OUTER","align-items")` backed by a second `property_suffixes` row `align-items→AlignItems` added via dated migration `migrations/2026-06-13-property-suffixes-align-items.py` (the canonical way — NOT a module-load write side-effect). `iconCircleBackground` is the ONLY remaining named literal (trust-bar-specific, council-ruled legitimate). ALSO D222: notice-banner content-lift (IN-F) — nodes resolving to `has_inner_blocks` composites with direct rich-text + zero children now lift text into one `sgs/text` child, DB-gated, no per-slug branch. team-member D221 regression fixed — re-pinned `has_inner_blocks=0` via `HAS_INNER_BLOCKS_OVERRIDES` + `scalarContentLift` capability + `ATTR_CLASSIFICATION_OVERRIDES` (name/role→text-content, photo→image-object) in `sgs-update-v2.py`; reproducible via full `/sgs-update` reseed. **NEW OPEN DEBT (D222): ~13 per-block `if slug=="sgs/X"` literal carve-outs remain in `convert.py`** — de-literalisation programme scoped at `.claude/plans/archive/2026-06-13-converter-de-literalisation-audit.md`; universal DB-driven scalar-lift (`_lift_scalar_attrs_by_selector` via `block_attributes.derived_selector`) is the replacement mechanism. Prior: D209 — 70 SGS blocks (`/sgs-update` after announcement-bar RETIRED + merged); D206 testimonial rebuilt as 7-variant typed-attr block; D204 `sgs/product-card` built-in-element. Prior: 2026-06-07 last annotated. Prior: 2026-06-03 WS-1 A1+A2 SHIPPED D159 — `sgs/container` gained `contentWidth` attr; converter transfers section max-width → `widthMode`/`contentWidth` (D159; `widthMode`/`customWidth` subsequently RETIRED D230/D231 2026-06-18 → 3-layer `align`/`maxWidth`/`contentWidth`). Architecture programme CLOSED (2026-05-22, 31 decisions). **Cloning-pipeline canonical spec is Spec 31 (`31-UNIVERSAL-CLONING-PIPELINE.md`)** — Spec 22 was absorbed into Spec 31 §13 + archived (D253); every "Spec 22 / R-22-N / FR-22-N" citation in the Decisions section below is HISTORICAL and maps 1:1 to Spec 31 §13 / R-31-N / FR-31-N. **NOTE (post-D229): `convert.py` is FROZEN (D-MODULAR); the "~13 per-block carve-outs in convert.py" debt above lives in a file being REPLACED by the modular `converter/` engine, NOT active go-forward debt.** Live status (D-ceiling D258; array-item content lift COMPLETE + LANDED; new engine opt-in via SGS_NEW_ENGINE=1) is single-sourced to `state.md` + `decisions.md` head. See `.claude/handoff.md`.
>
> **2026-05-29 D99 DATA LAYER UPDATE (references corrected 2026-06-03):** `slot_synonyms` table retired D99 and replaced by `slots` table (composite PK on `slot_name + scope`; 92 element-scope + 4 section-scope rows post-D111). `slot_synonyms.role_classification` retired into `roles` table (21 rows — 20 base + `scalar-media` added D128). Component diagram, DB table list, and integration-surface references now use `slots` / `roles`. Walker functions like `_slot_synonyms()` retain their names but query the `slots` table internally. See Spec 22 §4 data layer for current table inventory.

# SGS WordPress Framework — System Architecture

## System Overview

SGS is a standalone WordPress block theme and Gutenberg blocks plugin built by Small Giants Studio. It competes directly with Kadence, Spectra, and GenerateBlocks — every block must be fully configurable by non-technical clients through the block editor alone. The framework is client-agnostic; Mama's Munches is the current pipeline canary, Indus Foods is the design-language proving ground, and every architectural decision must hold for any business type.

**Framework stats (counts are DB-authoritative — query `/sgs-db` or `python sgs-db.py`; do not trust any hardcoded number here):** 74 SGS blocks (all dynamic; count verified 2026-06-13 DB) + 122 core/wp indexed = 196 total; 2,935 block_attributes (DB 2026-06-13); `sgs/trust-bar` is ACTIVE (`sourceMode='typed'` canonical — bound-mode purged D182 2026-06-06); `block_composition.container_kind` column BUILT + 28-block roster populated (D152 2026-06-02); `sgs/container` v0.2.0 — `contentWidth` attr + `__inner` guarded wrapper SHIPPED (WS-1 A1 D159 2026-06-03); converter width model: ~~`widthMode`/`customWidth` (D159)~~ → **3-layer `align`/`maxWidth`/`contentWidth` SHIPPED D230/D231 2026-06-18** (`widthMode`/`customWidth`/`customWidthUnit` RETIRED end-to-end; `align:"full"` for full-bleed; `maxWidth` = exact literal; `contentWidth` tokens `normal`/`wide`/`full`, default `full`; LANDED-verified canary). All blocks at `apiVersion: 3`. WP 7.0. (Token/pattern/hook/capability counts: see CLAUDE.md.)

**Feature audit (354 features, graded roadmap):** moved to `.claude/plans/archive/2026-02-21-feature-audit.md`.

**Dev setup, build commands, and deploy instructions:** see `.claude/dev-setup.md`.

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| CMS | WordPress 7.0 | Block theme, no classic editor. Sandybrown upgraded 2026-05-22. |
| Theme | `sgs-theme` (block theme) | theme.json v3, template parts. Style variations retired (Phase 5a). |
| Blocks plugin | `sgs-blocks` | 74 blocks (all dynamic; count verified 2026-06-13 DB — query `/sgs-db`). Extensions in `src/blocks/extensions/`. `Sgs_Ai_Connector` wraps WP 7.0 AI Connectors API. |
| Block build | `@wordpress/scripts` | `--experimental-modules` flag required for `viewScriptModule` |
| Frontend JS | Interactivity API + vanilla ES modules | Interactivity API for stateful blocks; vanilla `viewScriptModule` for AJAX (Post Grid) |
| Icons | Lucide (1900+ icons) | Pre-generated to `lucide-icons.php` via `scripts/generate-icons.js` |
| Fonts | Inter variable (default) | Self-hosted WOFF2, no CDN. Montserrat + Source Sans 3 for Indus Foods |
| Hosting | Hostinger (`ssh hd`) | Shared hosting, LiteSpeed cache (removed from dev sites 2026-05-05) |

---

## Directory Structure

```
small-giants-wp/
├── theme/sgs-theme/
│   ├── theme.json                  # Design tokens — all colour/spacing/typography vars
│   ├── style.css                   # Theme header ONLY (16 lines, no CSS rules)
│   ├── functions.php               # Enqueues, variation-specific CSS via wp_add_inline_style()
│   ├── styles/                     # EMPTIED — Phase 5a. Per-client snapshots at sites/<client>/theme-snapshot.json
│   ├── templates/                  # Full-page templates (index, page, single, etc.)
│   ├── parts/
│   │   ├── header.html             # Single canonical header (top bar, nav, mobile drawer, CTA buttons)
│   │   └── footer.html             # Footer with sgs/business-info blocks
│   └── patterns/                   # Reusable block patterns
│
├── plugins/sgs-blocks/
│   ├── sgs-blocks.php              # Plugin entry, block registration
│   ├── includes/                   # PHP helpers, form processing, REST endpoints
│   ├── src/blocks/                 # Block source files (one folder per block)
│   │   └── extensions/             # Universal extensions (animation, visibility, hover, spacing, CSS, defaults)
│   ├── build/                      # Compiled output — deployed to server
│   └── scripts/                    # Build helpers + sgs-update-v2.py + pipeline scripts
│
├── sites/
│   └── indus-foods/                # Client-specific content, mockups, research, notes
│       └── theme-snapshot.json     # Per-client theme.json snapshot (pushed via push-theme-snapshot.py)
│
├── .claude/                        # Dev context (architecture.md, specs, plans, reports)
├── CLAUDE.md                       # Root dev instructions (this file is law)
├── composer.json                   # Dev-only PHP stubs (wordpress-stubs v6.9.1, wp-cli-stubs v2.12.0)
└── vendor/                         # Composer install target — gitignored, not deployed
```

---

## Component Diagram

The SGS framework has four primary components: the block theme (`sgs-theme`), the blocks plugin (`sgs-blocks`), the knowledge database (`sgs-framework.db`), and the cloning pipeline (`/sgs-clone`). The theme and plugin are deployed to WordPress hosting; the DB and pipeline run locally on the dev machine. Per-client snapshots (`sites/<client>/theme-snapshot.json`) bridge the two environments.

```
┌──────────────────────────────────────────────────────────┐
│  WordPress 7.0 (Hostinger — sandybrown / palestine-lives) │
│                                                            │
│  ┌─────────────────────┐   ┌──────────────────────────┐  │
│  │  sgs-theme           │   │  sgs-blocks plugin        │  │
│  │  (block theme)       │   │  (74 dynamic blocks)      │  │
│  │                      │   │                           │  │
│  │  theme.json          │◄──┤  render.php (per block)   │  │
│  │  templates/          │   │  block.json (attrs)       │  │
│  │  parts/              │   │  src/blocks/extensions/   │  │
│  │  patterns/           │   │  REST endpoints           │  │
│  │  (styles/ EMPTY)     │   │  Sgs_Ai_Connector         │  │
│  └─────────────────────┘   └──────────┬───────────────┘  │
│                                        │                   │
│  ┌─────────────────────────────────────▼────────────────┐ │
│  │  sgs-framework.db (SQLite — via db_lookup.py)         │ │
│  │  Tables: blocks, block_attributes, block_supports,    │ │
│  │  slots, roles, property_suffixes, modifier_suffixes,  │ │
│  │  block_capabilities, variations, block_styles,        │ │
│  │  design_tokens, hooks, patterns                       │ │
│  └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

  /sgs-clone (cloning pipeline)
  ├── Stage 0: SGS-BEM HTML draft (mockup → structured HTML)
  ├── Stage 1: css_router.py (4-destination: D0 theme/D1 block-attr/D2 variation/D3 scaffold)
  ├── Stage 2: convert.py walker (Spec 22 universal walker — BEM → block slugs via slots table)
  ├── Stage 3: token_resolver.py (exact-match CSS values → design token refs)
  ├── Stage 4: Playwright captures (375/768/1440px screenshots + Stage 11 pixel-diff)
  ├── Stage 9b: Scaffold quality scoring (5-file quality report)
  ├── Stage 10: REST deploy (sgs/v1/active-variation + page PATCH)
  └── Stage 11: pixel-diff.py (per-section cropped diff, acceptance ≤5% Phase 1 / ≤1% Phase 1.5)

  sites/<client>/
  └── theme-snapshot.json (per-client colours/typography deployed via push-theme-snapshot.py)
```

---

## Component styling architecture — no-inline styling contract (Spec 32, 2026-07-09)

Every SGS block's styling is designed to serialise as scoped CSS, never inline `style="…"`. WP-native styling `supports` (`color`/`spacing`/`__experimentalBorder`/`typography`/`shadow`) are KEPT — they still drive the block's editor controls — but their auto-inline output is suppressed per-property via `__experimentalSkipSerialization`; the resulting `style` object is instead serialised through the stable core `wp_style_engine_get_styles($style, ['selector' => "#{$uid}"])['css']` and appended to the block's own scoped `<style>` block (the mechanism SGS already emits for other rules; this is how WP core itself outputs `layout` support as `.wp-container-{id}` rather than inline). This lives in the SHARED HELPERS, not per-block: `SGS_Container_Wrapper`, `sgs_typography_css_rule()`, `sgs_button_element_style_css()`, and `sgs_responsive_css_rule()` carry the base-layer flip centrally; only block-private render.php `style="…"` sites (object-fit, overlays, per-item colour, attribution typography, caption) need individual conversion into the same scoped-`<style>` pattern.

Per-side and per-corner box properties (padding/margin/border-width/border-radius) merge into a single named **object attribute** — `{top,right,bottom,left}` for 4-side families, `{topLeft,topRight,bottomLeft,bottomRight}` for 4-corner (border-radius) families — driven by WP's native `BoxControl` (and its corner-mode equivalent) so the editor experience stays standard WP. Root padding/margin/border-radius route to the WP-native `style.spacing.*` / `style.border.radius` object (already object-shaped since Phase 0); per-area/per-element families (e.g. `contentBandPadding`, `imageBorderRadius`) are SGS custom object attrs using the same control. The collision guard is a DB column, not a name convention: `block_attributes.box_family` (+ `box_side`) is seeded ONLY for the 10 genuine box families via `ATTR_CLASSIFICATION_OVERRIDES` in `sgs-update-v2.py`; every scalar/single-side/shapeDivider family gets no `box_family` row and is excluded by construction. Because a DB column alone doesn't self-enforce, a structural AST gate (same shape as the existing cheat-gate scanner) fails the build if any per-side/per-corner grouping or migration operation runs without a `box_family` check in its call path — made structural, not convention.

Pilot scope (container + button) proves both distinct mechanisms — 4-side padding/margin/tier-base top-up, and 4-corner border-radius + `:hover`-scoped state + editor `BoxControl` parity — before universal rollout across the block roster. Canonical: `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md`, `.claude/plans/2026-07-09-no-inline-styling-design-gate.md` (Pilot Acceptance Test A1–A9), `.claude/plans/2026-07-09-box-object-interface-contract.md` (fixed cross-layer contract).

---

## Header/Footer/Navigation system architecture (Spec 17 + design-gate 2026-07-13)

**Architectural principle (Bean-directed rule evolution):** header and footer REMAIN WordPress template parts — `parts/header.html` / `parts/footer.html`, the `sgs_header`/`sgs_footer` CPT, the rules engine, and Site Info block-bindings (all Spec 17). A **specialised container block used INSIDE the template part** is permitted, exactly like `sgs/card-grid` or `sgs/feature-grid` are permitted inside a page — it is not a monolithic header/footer block that subsumes the template-part/CPT/rules system, which stays forbidden. `.claude/hooks/no-header-footer-block.py` and the `header-footer-are-template-parts-not-blocks` memory evolve accordingly: they now allow `src/blocks/{site-header,site-footer,adaptive-nav}/` while still blocking a bare monolithic header/footer/nav block.

**The blocks** (5-file pattern, auto-registered by the standard `build/blocks` scandir loop — no new registration wiring):

| Block | Role | KIND | Renders via |
|---|---|---|---|
| `sgs/site-header` | Header shell — 3 optional named rows (top utility / middle primary / bottom) of typed elements | section | `SGS_Container_Wrapper` |
| `sgs/site-footer` | Footer shell — named rows + up-to-N columns | section | `SGS_Container_Wrapper` |
| `sgs/adaptive-nav` | One menu source that collapses nav-bar → burger at a configurable breakpoint; opens the drawer | layout | `SGS_Container_Wrapper` + nav logic |
| `sgs/mobile-nav` (reused, reworked) | Off-canvas drawer — the accessible mobile panel | — | existing block, hardened |

Both `sgs/site-header` and `sgs/site-footer` are section-KIND composites that delegate outer rendering to `SGS_Container_Wrapper` — they follow the composite-mirror rule (Key Decision 28) rather than diverging with per-block CSS, and `sgs/adaptive-nav` is layout-KIND. Each element in the header/footer typed palette (logo, adaptive-nav, search, cart, account, CTA, contact, social, HTML, widget-area) draws its defaults from two shared sources so the same data stays consistent across header AND footer with no re-entry per block: (1) global style tokens (`theme.json`/`wp_global_styles`, and for cloned sites the Spec 33 `theme-snapshot.json`), and (2) the SGS Site Info store (Spec 17 §S4 `sgs_site_info` via block-bindings) for logo/contact/social/copyright data.

**Off-canvas drawer bug fix (P0, shipped + live-verified 2026-07-13):** `view.js` set `inert` on `.wp-site-blocks` when the drawer opened, but `#sgs-mobile-nav` was a DOM **descendant** of `.wp-site-blocks` — the Popover top-layer painted it open while `inert` froze its own links (looked open, was unclickable). Fixed by re-parenting the drawer to be a direct child of `<body>` (sibling of `.wp-site-blocks`) before `showPopover()`. This is now the accessibility benchmark for the whole system — GOV.UK-grade focus trap, ESC-to-close, backdrop dismiss, body-scroll-lock, redundant state signalling (class + `aria-current` + no-CSS fallback), configurable screen-reader labels, and a published keyboard contract.

**Key system properties (full detail in the design-gate + Spec 17):**
- **Never-overflow layout** — Cluster (`flex-wrap` + `min-width:0` on children + `flex-shrink:0` on the logo) + fluid `clamp()` spacing, solving the sub-400px WCAG 1.4.10 header-overflow bug intrinsically rather than per-element.
- **Per-breakpoint override model** — new-blocks-only (no migration of existing blocks): each responsive property is `{desktop, tablet, mobile}` with `null` meaning inherit from the tier above; breakpoints are 768/1024 plus a custom-px 4th tier, from one shared source (R-31-1 — never a per-block hardcode); container queries on the block's own wrapper plus media-query fallback.
- **Per-device content adaptation** — per-tier visibility toggles, `showLabel`/`iconOnly` element behaviour, and a move-to-drawer drop-zone (no framework has a magic content-swap primitive; all use place-element + toggle-per-device).
- **Mega-menu** — nestable per-item content, drill-down + auto-back-link on mobile, AJAX lazy-load for heavy content; desktop overflow auto-collapses into a "more" menu.
- **Sticky/transparent/scroll** — per-row-combination sticky via the existing `class-sgs-header-behaviours.php` body-class layer + `--sgs-header-height` ResizeObserver + scroll-padding-top anchor fix (all preserved); transparent-at-rest → solid-on-scroll ships as a no-code toggle.
- **Cloning pipeline Part 2** (parked, `P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER`) — the walker will map a draft's header/footer rows onto the named slots by BEM role (R-31-2/R-31-8) once P1-P3 land.

Canonical spec: `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` (template-part + CPT + rules architecture, being extended with new FRs for the blocks above). Design-gate record + full rationale (5-system research basis: Bricks, Elementor, Blocksy, Material 3, GOV.UK, plus the Indus Foods live reference): `.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md`.

---

## Integration Surfaces

### theme → sgs-blocks plugin
- `theme.json` exports design tokens as CSS custom properties (`--wp--preset--color--*`, `--wp--preset--spacing--*`, `--wp--preset--font-size--*`). All block colour defaults reference these tokens via slug — never bare hex.
- `functions.php` enqueues block-specific stylesheets and emits per-client CSS custom properties via `wp_add_inline_style()`.
- Block Selectors API in `block.json` targets native typography controls to each block's primary text element.

### sgs-blocks plugin → sgs-framework.db
- `db_lookup.py` (read-only) exposes `slots`, `roles`, `block_attributes`, `property_suffixes`, `block_capabilities`, `modifier_suffixes` as Python-callable query helpers. (`slot_synonyms` retired D99; `slot_synonyms.role_classification` retired into `roles` table.)
- `/sgs-update` (10-stage v3 `sgs-update-v2.py`) rebuilds the DB from 10 canonical sources: block.json files, render.php parse, REST API enumeration (variations, styles), hooks scan, design token parse, and pattern parse.
- `wp-blocks.py` is the unified data CLI: `dump`, `block <slug>`, `capabilities`, `synonyms` — used by pipeline scripts and `/sgs-db` slash command.

### cloning pipeline → WordPress REST API
- Stage 10 deploy: `PATCH /wp/v2/pages/{id}` sets post content; `POST sgs/v1/active-variation` activates the client style variation site-wide via `theme_mod`. Read-back confirmation verifies the activation.
- Stage 4 Playwright: captures screenshots at 375/768/1440px against the live sandybrown staging site.
- Stage 11 pixel-diff: `pixel-diff.py --selector .sgs-{section}` produces per-section cropped diffs against mockup screenshots.

### sgs-blocks → N8N notification service
- All form submission and booking notifications route to N8N webhook (`http://72.62.212.169/webhook/…`) rather than `wp_mail()`. Configured via `sgs_n8n_webhook_url` option.

### sgs-blocks → WordPress Customiser
- Floating UI (Back to Top, Reading Progress) settings stored as `theme_mod` values. Frontend output via `wp_footer` hook. Customiser preview uses `customize_preview_init` + postMessage transport for live preview.

### Per-client deployment
- `sites/<client>/theme-snapshot.json` pushed to staging via `push-theme-snapshot.py --client <slug> --target <ssh-host>`. This replaces the retired style-variation system (Phase 5a). Client-specific overrides live in `sites/<client>/theme-overrides.css` or inside the snapshot's `styles.css` block.

---

## Key Architectural Decisions

1. **Dynamic blocks only** — All complex blocks use `render` in block.json pointing to `render.php`. `save()` returns `null` or `<InnerBlocks.Content />`. Avoids deprecation headaches; PHP controls output.

2. **All block properties are attributes, never hard-coded CSS** — Every visual property (colour, spacing, font size, hover effect, image) is a block attribute with an editor control. CSS provides only structural defaults.

3. **Colour system: DesignTokenPicker + `:not([style*="color"])` guard** — Colours set via `DesignTokenPicker` (returns slug or hex). In render.php, slugs become `var(--wp--preset--color--{slug})`. CSS fallbacks use `:not([style*="color"])` so inline styles always win.

4. **`sgs/container` is the universal layout primitive** — Used for all multi-column and section layouts. Supports `layout` (stack/grid/flex), `columns`, `columnsTablet`, `columnsMobile`, `gap`, `backgroundImage`, `minHeight`, `htmlTag`. Nesting containers inside containers is the correct pattern.

5. **Hover effects: universal extension** — The hover-effects extension at `src/blocks/extensions/hover-effects.js` registers 12 universal hover attributes available on every SGS block: colour shifts (bg/text/border), scale, shadow elevation, image zoom, grayscale, border-accent, tilt-3d, transition duration, stagger delay, 2 block-link attributes.

6. **WordPress Interactivity API for most frontend JS; Post Grid uses vanilla ES module** — No jQuery. Stateful interactive blocks use `viewScriptModule` + `@wordpress/interactivity` store/state. The `--experimental-modules` build flag is required.

7. **Per-device visibility via block extension, not separate templates** — Visibility panel extension applied to ALL blocks via `editor.BlockEdit` + PHP `render_block` filter. Clients build three layout groups inside one template, hiding each non-applicable group per breakpoint.

8. **Animation extension uses WordPress filter API, not block styles** — Scroll animations applied to all 69 SGS blocks + 4 core blocks (group, columns, cover, image) via `blocks.registerBlockType` + `render_block` PHP filter. 16 animation types; CSS initial states gated behind `.sgs-js` class + `prefers-reduced-motion: no-preference`.

9. **Floating UI lives in the WordPress Customiser** — Back to Top, Reading Progress configured at `Appearance → Customise → SGS Floating UI`. Settings stored as `theme_mod`. Frontend output via `wp_footer` hook.

10. **Palette tokens are mandatory for block colour defaults** — Every block colour default references a palette token via slug or `var(--wp--preset--color--X, #fallback)`. Bare hex defaults are forbidden (they don't switch when style variation changes). Brand colours (LinkedIn, Facebook, WhatsApp) are documented exceptions.

11. **Per-client theming model** — `theme/sgs-theme/styles/` is empty. Per-client snapshots at `sites/<client>/theme-snapshot.json`, deployed via `push-theme-snapshot.py`.

12. **DB-first architecture rule** — Converter / recogniser scripts read canonical vocabulary from `sgs-framework.db` via `db_lookup.py`. No hardcoded Python dicts duplicating DB data. `/sgs-update` keeps the DB in sync.

13. **Rosetta Stone discipline** — Every uimax row describing a design artefact MUST carry equivalent-name mappings across SGS blocks, vanilla HTML/CSS, Bootstrap, shadcn/Radix, Tailwind, React generic, and AI-builder outputs. Missing SGS equivalent = gap candidate, never silent drop.

14. **Universal block-equivalent extraction (Spec 22 FR-31-3, locked 2026-05-26)** — The cloning-pipeline walker is a single recursive function with exactly 3 permitted exceptions (atomic-tag swap, top-level chrome skip, top-level container wrap). Every BEM-classed DOM node resolves to a block slug via the `slots` table lookup (via `db_lookup.py`; `slot_synonyms` retired D99); per-block behaviour comes from DB rows, not code branches. The "double-render" bug (sgs/product-card emitting 3.7× expected markup) is structurally eliminated because the same descendant cannot be consumed twice: Spec 22 FR-31-2's `equivalent_block_for()` check happens BEFORE attr lift; if the attr is block-equivalent, walker never lifts. See Spec 22 §1-§3 for the full architecture statement.

15. **DB-driven atomic-tag map (Spec 22 Appendix B; SHIPPED 2026-05-27 Phase 1.2/1.2a)** — Bare HTML tags with no SGS classes route via DB-driven `db.atomic_tag_map()`. **Final shipped algorithm** (post-/qc-council 2026-05-28 hardening): R-31-1-compliant — the runtime path queries the `html_tag_to_core_block` table (14 rows, idempotent migration at module load) + `blocks.replaces` reverse-walk. Examples: `<p>` → sgs/text; `<h1>`–`<h6>` → sgs/heading; `<img>` → sgs/media; `<blockquote>` → sgs/quote; `<a>` / `<button>` → sgs/button; `<ul>`/`<ol>` → sgs/icon-list. Zero hardcoded `_HTML_TAG_TO_CORE_SLUG` dict. The new walker (`da3de993`) consumes `atomic_tag_map()` exclusively. Slot-contextual `slot_synonyms.html_semantic_tag` is NOT consulted — that column is slot-contextual rendering data, not html-canonical routing.

16. **Cascade-fold (per-property default + override, NOT binary uniformity gate; locked 2026-05-25 per blub.db row 287)** — For N sibling wrappers sharing a BEM-element class, the walker compares CSS values per-property across siblings: most-common value hoists to parent's "per-direct-child default" attr; divergent values stay as override attrs on the specific child that contradicts. Wrapper blocks always exist (preserve className for CSS targeting); their attrs carry only the divergence; parent carries the defaults. Content uniformity is irrelevant — each grid item / column carries unique content; folding happens at the styling layer only. The canonical precedent is `sgs/multi-button` (14 parent attrs set group defaults; inner `sgs/button` children render via `$content` and override per-instance).

17. **Hero is NOT a clean architectural reference** — Hero's prior pixel-diff wins were achieved via hardcoded cheats now removed. The Spec 22 universal walker (commit `da3de993`) has no per-slug guards. Current per-section pixel-diff is the live measurement at `stage-11-pixel-diff.json`; do not use pre-walker figures as a baseline. See Spec 22 §1 + §7.

18. **Phases never ship as single commits (binding rule D73, blub.db row 288)** — Within any phase, every major task commits separately with: (a) `/qc-council` or `/qc-inline` pre-commit gate; (b) living-docs updates for the matched doc-type per trigger table; (c) `/sgs-clone --debug-trace` + Stage 11 measurement comparing pre/post values; (d) commit message citing predicted vs actual delta from the experiment frame. Per-task skill bindings: `/subagent-driven-development` for implementation (one implementer + 2 reviewers); `/delegate` for model routing; `/verify-loop` for 2-attestation. Anti-pattern of record: 2026-05-24 second-pass session (5 changes shipped as one wave, regressed pixel-diff 70.5% → 73.9%, regression unattributable).

19. **Per-section acceptance gate, NOT mean (Spec 22 FR-31-7, locked 2026-05-26)** — Phase 1 closure = per-section **≤5%** × 3 viewports for all 7 body sections (21 cells; each must hit ≤5% independently). Phase 1.5 stretch goal = per-section ≤1% × 3 viewports (bridges residual ~4pp via pixel-diff.py vertical-anchor fix + chrome cropping + font-load timing). Bean visual sign-off on cropped-pair artefacts is co-authoritative with script measurement (R-31-13). Mean averaging hides hidden failures and is retained as reporting metric only.

20. **Spec 22 universal block-equivalent extraction (locked 2026-05-26)** — Single universal walker path (FR-31-3); BEM is the only recognition signal (FR-31-1); block-equivalent attrs become child blocks via `equivalent_block_for()` (FR-31-2); render.php for hybrid blocks migrates to `echo $content` (FR-31-6); `wp-blocks.py` is the unified data CLI over sgs-framework.db + selected uimax tables (FR-31-8); cold replacement Phase 1 in 5 commits per R-31-5. Phase 1 acceptance ≤5%, Phase 1.5 stretch ≤1%. Council-validated 2026-05-26 via 4-rater /gap-analysis (Architectural Purist, Spec Checker, Pragmatic Engineer, Risk Auditor). Canonical reference: `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md`.

21. **Section-root recognition via explicit operator flag, not algorithm (D107, 2026-05-30)** — Each block declares its tier via `supports.sgs.is_section_root` in `block.json` (per Bean D1=A: explicit > algorithmic). `/sgs-update` Stage 1 reads the flag and writes the new `blocks.tier` column (TEXT CHECK in `'block' | 'class-section' | 'pattern'`). XS-2 voter consults `blocks.tier` during recognition — section-root blocks bias toward section-scope matches. Replaces the proposed algorithmic detector that would have inferred tier from BEM patterns.

22. **`block_composition` table + `container_kind` column (D108 2026-05-30 + D152 2026-06-02)** — Data layer LIVE (189 rows — 188 seeded D108 + `sgs/option-picker` added D152); `container_kind` TEXT column added + populated D152 (commit `0d746073`). 28-block container roster now has `wraps_block` + `container_kind` (values `section|layout|content`) populated via the "wraps children" detection algorithm in `sync-container-wrapping-blocks.py` (rewritten D152 — validates from real InnerBlocks structure, not layout-attr heuristics). Walker consumption DEFERRED pending WS-3 converter work. `sgs/trust-bar` and `sgs/modal` block.json gained `supports.sgs.containerKind:"section"` to source the column.

23. **XS-3 walker code REVERTED post-regression (D109, 2026-05-30)** — The XS-3 walker condition (consult `blocks.tier` to gate section-root emission) was reverted after regression evidence on featured-product + social-proof sections. Regression artefacts preserved in pipeline-state for the refined-trigger session. The DB layer (D107 `blocks.tier`, D108 `block_composition`) remains LIVE — walker consumption is queued, not retired.

24. **XS-4 canonical_slot assignment ported to D99 schema (D110, 2026-05-30)** — `assign-canonical.py` ported to post-D99 `slots` + `roles` table architecture. Current canonical_slot coverage: 31.8% of attrs. Re-run after every slot-vocabulary addition (new rows in `slots` table) to refresh canonical bindings.

    **`canonical_slot` is content-fork metadata, NOT the layout router (D194, 2026-06-09).** Its only behavioural job is the CONTENT fork — child-InnerBlock vs scalar (FR-31-2.1, read together with `role` + `attr_type`). Structural wrapper box CSS routes **name-free** via layer-detection (OUTER/CONTENT/GRID by CSS signature + position) + `property_suffixes`; fake wrapper divs fold structurally by signature (FR-31-4.1 slug-None direct descendant), never by name. The Wave-2 "canonical_slot backfill as routing gate" conception is retired. See `.claude/decisions.md` D194 + `.claude/reports/wave2/WRAPPER-CSS-ROUTING-DESIGN-GATE.md`.

25. **Slot vocabulary hygiene — section-scope cleanup (D111, 2026-05-30)** — XS-5 retired 12 wrong / dead section-scope slot rows. Testimonial + testimonial-slider re-inserted at element scope (the correct scope for those slots; section-scope was the legacy miscategorisation). Schema gate: section-scope rows reserved for actual section-root semantics, never element-level slots.

26. **Universal wrapper/container resolution (FR-31-4.1, D118, 2026-05-31)** — The single canonical rule for every wrapper below a section: block-match wins; a DIRECT descendant of a container FOLDS its CSS into the container (1-child = inner-CSS; grid/flex = container absorbs the grid + each item's CSS folds as grid-item CSS); a direct descendant matching a block becomes that block (the grid item); a NON-direct-descendant wrapper becomes its own `sgs/container`, never dropped. Supersedes the patchwork (walk_passthrough drop-and-bubble, depth-2 gate, `_absorb_transparent_wrappers`). Canonical text: Spec 22 §FR-31-4.1. Implementation (walker rewrite) is the active next task; the depth-2 gate (D117 G2) is the working interim. Content + side-by-side layout render correctly today (G1+G2, live-DOM verified).

27. **Root-cause methodology is core + mandatory (D118, 2026-05-31)** — No assumptions / no probability / no trusting unverified claims or pixel-diff. Dig to the root cause from ALL logs+debug data; classify implementation-bug vs spec/plan-gap; verify every dependency (DB tables, block functionality, pipeline spec, truth-spec, pixel-diff-vs-live-DOM); attest with ≥2 evidence sources; roll back fast on regression. Full statement + tool list in root `CLAUDE.md` "Root-cause methodology". This is the working method for ALL future work on this project.

28. **Composite-mirror rule + container_kind column (D152, 2026-06-02)** — No composite block with a built-in wrapper (sgs/hero, sgs/cta-section, sgs/trust-bar, sgs/modal, etc.) may diverge from `sgs/container`'s wrapper capabilities (R-31-9 extension, locked Bean). Composite blocks declare `supports.sgs.containerKind` in block.json (`section|layout|content`); `/sgs-update` reads this and writes `block_composition.container_kind`. The converter (WS-3) will read the column and apply the 3-layer OUTER/CONTENT-WIDTH/PER-GRID-ITEM model from Spec 22 §FR-31-21 uniformly. Capability gaps found during WS-2 audit become block attrs to ADD to the composite, never converter workarounds. `sync-container-wrapping-blocks.py` rewritten to validated "wraps children" detection. 28-block container roster confirmed. Memory: `feedback_no_composite_evades_universal_rule`.

29. **Header/footer/nav as specialised container blocks inside template parts, not a monolithic block (design-gate 2026-07-13, Bean sign-off)** — `no-header-footer-block.py` evolves from a blanket header/footer/nav ban to permitting `sgs/site-header`, `sgs/site-footer`, `sgs/adaptive-nav` specifically because they are composites used *inside* the existing template-part/CPT/rules architecture (Spec 17), the same relationship `sgs/card-grid` has to a page — never a replacement for that architecture. `sgs/site-header`/`sgs/site-footer` are section-KIND, `sgs/adaptive-nav` is layout-KIND; both header/footer follow the composite-mirror rule (Key Decision 28) via `SGS_Container_Wrapper`. A live P0 accessibility bug (the off-canvas drawer's `inert` attribute froze its own descendant nav because the drawer lived inside `.wp-site-blocks`) was fixed by re-parenting the drawer to `<body>` — fixed + verified live 2026-07-13. Full system: `.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md`; see "Header/Footer/Navigation system architecture" section above.

---

## 2026-05-25 cloning-pipeline session summary

The 2026-05-25 session ran a 4-rater `/qc-council` against the consolidated cloning-pipeline recovery plan and produced:

- **`.claude/reports/2026-05-25-qc-council-issue-register.md`** — canonical register, ~110 items across Sections A-R:
  - Section A (7 confirmed defects) — F1 universal-nesting + atomic_button missing CSS lift + brand empty body[] + D1 sidecar collisions
  - Section B (7 DB-first violations) — hardcoded dicts to migrate
  - Section P (27 binding design principles) — extracted from Bean's prior-session messages; THE rules every commit obeys
  - Section Q (20-cheat inventory) — file:line + replacement path for every hardcoded shortcut in `convert.py` + `css_router.py`
  - Section R (consolidated phase plan) + R1 (blocks.replaces audit) + R2 (allowed-nesting audit) + R5 (brand sgs/quote worked example end-to-end)

- **`.claude/plans/2026-05-26-phase-1-spec-22-implementation.md`** — phase plan. Phase 1.1-1.4b SHIPPED 2026-05-27 (8 task-commits: 507d4f57 / 0ba53c72 / d4bfa41d / 35fdab62 / 909c971a / cd3bef5e / b58e5ca3 / da3de993). Phase 1.5 (empirical pixel-diff measurement + halt/proceed) opens next session.

- **Decisions D70-D75 logged in `.claude/decisions.md`:**
  - D70 — Stage 10 inline-CSS deploy of `variation-d0-d2.css` (closes 4-section pixel-diff regression; mean 74.1% → 68.4%)
  - D71 — Step 1.7 G3 reframed (pixel-diff side closed by D70; failure-count side empirically misframed)
  - D72 — sgs/trust-bar block retired in favour of universal-nesting (mean 68.4% → 63.2%)
  - D73 — phases never ship as single commits (binding rule)
  - D74 — Phase 1 scope = full universal-extraction backbone (one consolidated plan, NOT a series of small phases)
  - D75 — qc-council verdict CONDITIONAL APPROVE pending F1 spike

**Empirical baseline state (pre-walker-rewrite, awaiting Phase 1.5 measurement against new walker):**

- **Pre-walker baseline (Wave B re-capture 2026-05-27 with new pixel-diff.py):** `mean_mismatch_percent: 63.61%` at `pipeline-state/mamas-munches-144-2026-05-26-122349/stage-11-pixel-diff.json` (27 captures attempted, 27 OK, 0 errors). Earlier "58.91%" claim was unverifiable drift, corrected 2026-05-27 post-handoff audit.
- **Earlier baseline (2026-05-26 partially stale):** mean 63.0% at `pipeline-state/mamas-munches-homepage-2026-05-26-012625/stage-11-pixel-diff.json`. Retained for historical reference per D88.
- **Walker:** Spec 22 universal walker at `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` (1873 LoC). EXACTLY 3 routing branches per R-31-3 (AST self-test self-runs in `__main__`). 145+/145+ tests PASS.
- **Phase 1.5 measurement pending:** deploy walker to sandybrown → run Stage 11 → compare per-cell pre/post pixel-diff → halt/proceed per R-31-13 (Bean visual sign-off co-authoritative).

---

## Variation-Concept Distinction (CRITICAL)

Three concepts share similar names but have different fates:

| Concept | What it is | Fate |
|---|---|---|
| WP style variations (`theme/sgs-theme/styles/<client>.json`) | Per-client colour/typography overlay | DELETED — do not add new files here; use `sites/<client>/theme-snapshot.json` |
| Header/footer template parts (`parts/header.html`, `parts/footer.html`) | Brand-agnostic alternative templates | 100% PRESERVED |
| Block-level variations (`register_block_variation()`) | Variants within ONE block (sgs/button primary/secondary/outline) | PRESERVED — DB-indexed in Phase 2 |

---

## Data Flow

The runtime data flow runs from client block-editor interaction through WordPress rendering to final HTML output served with Interactivity API hydration. The cloning pipeline runs in the reverse direction: mockup HTML → converter → block markup → REST deploy → pixel-diff measurement.

```
Client uses block editor
        │
        ▼
Block attributes saved in post content (HTML comment delimiters for dynamic blocks)
        │
        ▼
WordPress renders page → sgs-blocks render.php called per block
        │
        ▼
render.php extracts attributes → builds inline styles + BEM class names
        │
        ▼
get_block_wrapper_attributes() merges with native supports (colour, spacing, border)
        │
        ▼
HTML output served → block CSS (from style.css) applied
        │
        ▼
viewScriptModule loaded (Interactivity API) for interactive blocks
```

---

## Known Technical Debt

| Item | Severity | Notes |
|---|---|---|
| ~13 per-block `if slug=="sgs/X"` literal carve-outs in `convert.py` | High | D222 (2026-06-13): de-literalisation programme scoped at `.claude/plans/archive/2026-06-13-converter-de-literalisation-audit.md`. Replacement: universal `_lift_scalar_attrs_by_selector` via `block_attributes.derived_selector`. |
| Two separate converter conformance suites | Medium | D222 lesson: `converter_v2/tests/` ≠ `scripts/tests/test_converter_conformance.py` (Gate A, the pre-commit golden harness). A subagent "conformance passed" on the first can miss Gate A. Both must be green before any converter commit. |
| Colour/font-size helpers duplicated 4x | Medium | `info-box`, `hero`, `cta-section`, `testimonial-slider` all define the same closure. Extract to `includes/render-helpers.php`. |
| `navigation ref="4"` in header.html | High | DB post ID specific to dev site. Remove `ref` attribute. |
| Table of Contents broken | Medium | Root cause unknown since session 12. |
| Forms never end-to-end tested | High | REST endpoints built, submission never verified. |
| `lucide-react` unused devDependency | Low | Adds ~1MB to node_modules. Remove from package.json. |
| No `.gitattributes` file | Low | LF/CRLF warnings on every commit. |

---

## External Dependencies

| Service | Purpose | Notes |
|---|---|---|
| Hostinger | Web hosting | Shared hosting, `ssh hd` alias configured |
| N8N (72.62.212.169) | Notifications | All form/booking notifications via webhook, not `wp_mail()` |
| Stripe | Payments | Booking + forms Phase 2+ |
| Google Calendar | Booking sync | Phase 5, not yet implemented |
| ACF Pro | Custom fields | Legacy — usage decreasing, no new usage |
| Rank Math Free | SEO | No plans to replace |
| Playwright v1.58.2 | Visual testing | Globally installed on dev machine, Chromium ready |
