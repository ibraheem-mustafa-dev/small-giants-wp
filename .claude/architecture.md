---
doc_type: architecture
scope: forever
title: SGS WordPress Framework — System Architecture
split_note: "2026-05-24 — split into 3 parts: architecture.md (this file, system design), .claude/dev-setup.md (build/deploy/SSH), .claude/plans/archive/2026-02-21-feature-audit.md (354-feature graded roadmap)"
---

> Last updated: 2026-06-07 (gap consolidation — per-block gap controls on trust-bar/card-grid/feature-grid/gallery/multi-button/post-grid removed; gap is now ONE shared control via `sgs_container_gap_value()` + `ContainerWrapperControls`; `blockGap` WP-native support removed from sgs/container. heading/info-box #130 crash fixed (numeric level coercion). icon-identity resolver shipped. Stage 9 autonomy-gate rollback bug fixed. Stage 11.5 parity2 wired. Prior: 2026-06-03 WS-1 A1+A2 SHIPPED D159 — `sgs/container` gained `contentWidth` attr (string, default ""), render.php emits guarded `<div class="sgs-container__inner">` (max-width + margin-inline:auto) when set, edit.js "Content width" control, block.json version 0.1.0→0.2.0; converter (A2) transfers each section's own max-width → `widthMode` absent→full / present→custom + lifts folded `__inner` max-width → `contentWidth`. D160: triage #1–#8 grounded (heading/label lack `textAlign`; product-card caps at 380px; etc.). WS-1c/A3–A6, WS-2, WS-3, WS-4 composite mirror still pending. Prior: 2026-06-02 WS-1 SHIPPED: `block_composition.container_kind` column built + populated, 28-block container roster, 3-KIND model, composite-mirror rule locked — D152. Prior: theme-thread Wave 1: sgs/option-picker + sgs/cart added = 68 total SGS blocks; notice-banner FR-22-6 migrated; product-card Phase B; D148/D149. Prior: 2026-05-30 D107-D113 XS-batch. Prior: 2026-05-29 D93-D100 architectural cleanup batch SHIPPED). Architecture programme CLOSED (2026-05-22, 31 decisions). Cloning-pipeline canonical spec is **Spec 22 (Universal Block-Equivalent Extraction)** — Spec 16 retired and archived. See `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` + `.claude/handoff.md`.
>
> **2026-05-29 D99 DATA LAYER UPDATE (references corrected 2026-06-03):** `slot_synonyms` table retired D99 and replaced by `slots` table (composite PK on `slot_name + scope`; 92 element-scope + 4 section-scope rows post-D111). `slot_synonyms.role_classification` retired into `roles` table (21 rows — 20 base + `scalar-media` added D128). Component diagram, DB table list, and integration-surface references now use `slots` / `roles`. Walker functions like `_slot_synonyms()` retain their names but query the `slots` table internally. See Spec 22 §4 data layer for current table inventory.

# SGS WordPress Framework — System Architecture

## System Overview

SGS is a standalone WordPress block theme and Gutenberg blocks plugin built by Small Giants Studio. It competes directly with Kadence, Spectra, and GenerateBlocks — every block must be fully configurable by non-technical clients through the block editor alone. The framework is client-agnostic; Mama's Munches is the current pipeline canary, Indus Foods is the design-language proving ground, and every architectural decision must hold for any business type.

**Framework stats (headline verified 2026-06-03 — authoritative current counts live in [`../CLAUDE.md`](../CLAUDE.md) "Framework stats"; do not maintain a divergent copy here):** 68 SGS blocks (all dynamic) + 122 core/wp indexed = 190 total; 2,077 block_attributes; `sgs/trust-bar` is ACTIVE (dual-mode sourceMode typed|bound, FR-24-10 2026-06-01); `block_composition.container_kind` column BUILT + 28-block roster populated (D152 2026-06-02); `sgs/container` v0.2.0 — `contentWidth` attr + `__inner` guarded wrapper SHIPPED (WS-1 A1 D159 2026-06-03); converter WS-1 A2 transfers section max-width → `widthMode`/`contentWidth` (D159). All blocks at `apiVersion: 3`. WP 7.0. (Token/pattern/hook/capability counts: see CLAUDE.md.)

**Feature audit (354 features, graded roadmap):** moved to `.claude/plans/archive/2026-02-21-feature-audit.md`.

**Dev setup, build commands, and deploy instructions:** see `.claude/dev-setup.md`.

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| CMS | WordPress 7.0 | Block theme, no classic editor. Sandybrown upgraded 2026-05-22. |
| Theme | `sgs-theme` (block theme) | theme.json v3, template parts. Style variations retired (Phase 5a). |
| Blocks plugin | `sgs-blocks` | 68 blocks (all dynamic). Extensions in `src/blocks/extensions/`. `Sgs_Ai_Connector` wraps WP 7.0 AI Connectors API. |
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
│  │  (block theme)       │   │  (68 dynamic blocks)      │  │
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

11. **Style variation architecture retired (Phase 5a, 2026-05-21)** — `theme/sgs-theme/styles/` is now empty. Per-client snapshots at `sites/<client>/theme-snapshot.json`, deployed via `push-theme-snapshot.py`. See decision table below.

12. **DB-first architecture rule** — Converter / recogniser scripts read canonical vocabulary from `sgs-framework.db` via `db_lookup.py`. No hardcoded Python dicts duplicating DB data. `/sgs-update` keeps the DB in sync.

13. **Rosetta Stone discipline** — Every uimax row describing a design artefact MUST carry equivalent-name mappings across SGS blocks, vanilla HTML/CSS, Bootstrap, shadcn/Radix, Tailwind, React generic, and AI-builder outputs. Missing SGS equivalent = gap candidate, never silent drop.

14. **Universal block-equivalent extraction (Spec 22 FR-22-3, locked 2026-05-26)** — The cloning-pipeline walker is a single recursive function with exactly 3 permitted exceptions (atomic-tag swap, top-level chrome skip, top-level container wrap). Every BEM-classed DOM node resolves to a block slug via `slot_synonyms.standalone_block` lookup; per-block behaviour comes from DB rows, not code branches. Spec 16's layered FR1 fast path / FR4 normal route / lift_subtree / F1 fallback / 9-branch walk() architecture is **retired** (Spec 16 archived at `.claude/specs/archive/16-DETERMINISTIC-CONVERTER-V2-retired-by-spec-22.md` 2026-05-26). The "double-render" bug (sgs/product-card emitting 3.7× expected markup post-F1) is structurally eliminated because the same descendant cannot be consumed twice: Spec 22 FR-22-2's `equivalent_block_for()` check happens BEFORE attr lift; if the attr is block-equivalent, walker never lifts. See Spec 22 §1-§3 for the full architecture statement.

15. **DB-driven atomic-tag map (Spec 22 Appendix B; SHIPPED 2026-05-27 Phase 1.2/1.2a)** — Bare HTML tags with no SGS classes route via DB-driven `db.atomic_tag_map()`. **Final shipped algorithm** (post-/qc-council 2026-05-28 hardening): R-22-1-compliant — the runtime path queries the `html_tag_to_core_block` table (14 rows, idempotent migration at module load) + `blocks.replaces` reverse-walk. Examples: `<p>` → sgs/text; `<h1>`–`<h6>` → sgs/heading; `<img>` → sgs/media; `<blockquote>` → sgs/quote; `<a>` / `<button>` → sgs/button; `<ul>`/`<ol>` → sgs/icon-list. Zero hardcoded `_HTML_TAG_TO_CORE_SLUG` dict (the earlier seed-dict path was eliminated in commit `d4bfa41d`). The legacy hardcoded `ATOMIC_TAG_MAP` at the pre-Spec-22 `convert.py:698` was removed when convert.py was retired (`507d4f57`); the new walker (`da3de993`) consumes `atomic_tag_map()` exclusively. Slot-contextual `slot_synonyms.html_semantic_tag` is NOT consulted — that column is slot-contextual rendering data, not html-canonical routing.

16. **Cascade-fold (per-property default + override, NOT binary uniformity gate; locked 2026-05-25 per blub.db row 287)** — For N sibling wrappers sharing a BEM-element class, the walker compares CSS values per-property across siblings: most-common value hoists to parent's "per-direct-child default" attr; divergent values stay as override attrs on the specific child that contradicts. Wrapper blocks always exist (preserve className for CSS targeting); their attrs carry only the divergence; parent carries the defaults. Content uniformity is irrelevant — each grid item / column carries unique content; folding happens at the styling layer only. The canonical precedent is `sgs/multi-button` (14 parent attrs set group defaults; inner `sgs/button` children render via `$content` and override per-instance).

17. **Hero is NOT a clean architectural reference (corrected 2026-05-25; superseded by Spec 22 cold-replacement; Phase 1.4 walker SHIPPED 2026-05-27 commit `da3de993`)** — Hero's prior ≤1% pixel-diff under Spec 16 was achieved via hardcoded cheats in the retired `convert.py` (now at `_retired/convert_pre_spec22.py`). The Spec 22 cold-replacement walker has SHIPPED (Phase 1.4b commit `da3de993`); all per-slug guards are gone. Hero's "current ≤1%" status is therefore moot — Phase 1.5 measurement (pending next session) will report whether the new walker hits Spec 22's ≤5% Phase 1 gate on a clean substrate. See Spec 22 §1 + §7 Phase 1.4.

18. **Phases never ship as single commits (binding rule D73, blub.db row 288)** — Within any phase, every major task commits separately with: (a) `/qc-council` or `/qc-inline` pre-commit gate; (b) living-docs updates for the matched doc-type per trigger table; (c) `/sgs-clone --debug-trace` + Stage 11 measurement comparing pre/post values; (d) commit message citing predicted vs actual delta from the experiment frame. Per-task skill bindings: `/subagent-driven-development` for implementation (one implementer + 2 reviewers); `/delegate` for model routing; `/verify-loop` for 2-attestation. Anti-pattern of record: 2026-05-24 second-pass session (5 changes shipped as one wave, regressed pixel-diff 70.5% → 73.9%, regression unattributable).

19. **Per-section acceptance gate, NOT mean (Spec 22 FR-22-7, locked 2026-05-26)** — Phase 1 closure = per-section **≤5%** × 3 viewports for all 7 body sections (21 cells; each must hit ≤5% independently). Phase 1.5 stretch goal = per-section ≤1% × 3 viewports (bridges residual ~4pp via pixel-diff.py vertical-anchor fix + chrome cropping + font-load timing). Bean visual sign-off on cropped-pair artefacts is co-authoritative with script measurement (R-22-13). Mean averaging hides hidden failures and is retained as reporting metric only.

20. **Spec 22 universal block-equivalent extraction (locked 2026-05-26)** — Spec 22 replaces Spec 16 as the canonical cloning-pipeline architecture. Single universal walker path (FR-22-3); BEM is the only recognition signal (FR-22-1); block-equivalent attrs become child blocks via `equivalent_block_for()` (FR-22-2); render.php for hybrid blocks migrates to `echo $content` (FR-22-6); `wp-blocks.py` is the unified data CLI over sgs-framework.db + selected uimax tables (FR-22-8); cold replacement Phase 1 in 5 commits per R-22-5. Phase 1 acceptance ≤5%, Phase 1.5 stretch ≤1%. Council-validated 2026-05-26 via 4-rater /gap-analysis (Architectural Purist, Spec Checker, Pragmatic Engineer, Risk Auditor). Canonical reference: `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`.

21. **Section-root recognition via explicit operator flag, not algorithm (D107, 2026-05-30)** — Each block declares its tier via `supports.sgs.is_section_root` in `block.json` (per Bean D1=A: explicit > algorithmic). `/sgs-update` Stage 1 reads the flag and writes the new `blocks.tier` column (TEXT CHECK in `'block' | 'class-section' | 'pattern'`). XS-2 voter consults `blocks.tier` during recognition — section-root blocks bias toward section-scope matches. Replaces the proposed algorithmic detector that would have inferred tier from BEM patterns.

22. **`block_composition` table + `container_kind` column (D108 2026-05-30 + D152 2026-06-02)** — Data layer LIVE (189 rows — 188 seeded D108 + `sgs/option-picker` added D152); `container_kind` TEXT column added + populated D152 (commit `0d746073`). 28-block container roster now has `wraps_block` + `container_kind` (values `section|layout|content`) populated via the "wraps children" detection algorithm in `sync-container-wrapping-blocks.py` (rewritten D152 — validates from real InnerBlocks structure, not layout-attr heuristics). Walker consumption DEFERRED pending WS-3 converter work. `sgs/trust-bar` and `sgs/modal` block.json gained `supports.sgs.containerKind:"section"` to source the column.

23. **XS-3 walker code REVERTED post-regression (D109, 2026-05-30)** — The XS-3 walker condition (consult `blocks.tier` to gate section-root emission) was reverted after regression evidence on featured-product + social-proof sections. Regression artefacts preserved in pipeline-state for the refined-trigger session. The DB layer (D107 `blocks.tier`, D108 `block_composition`) remains LIVE — walker consumption is queued, not retired.

24. **XS-4 canonical_slot assignment ported to D99 schema (D110, 2026-05-30)** — `assign-canonical.py` ported to post-D99 `slots` + `roles` table architecture. Current canonical_slot coverage: 31.8% of attrs. Re-run after every slot-vocabulary addition (new rows in `slots` table) to refresh canonical bindings.

25. **Slot vocabulary hygiene — section-scope cleanup (D111, 2026-05-30)** — XS-5 retired 12 wrong / dead section-scope slot rows. Testimonial + testimonial-slider re-inserted at element scope (the correct scope for those slots; section-scope was the legacy miscategorisation). Schema gate: section-scope rows reserved for actual section-root semantics, never element-level slots.

26. **Universal wrapper/container resolution (FR-22-4.1, D118, 2026-05-31)** — The single canonical rule for every wrapper below a section: block-match wins; a DIRECT descendant of a container FOLDS its CSS into the container (1-child = inner-CSS; grid/flex = container absorbs the grid + each item's CSS folds as grid-item CSS); a direct descendant matching a block becomes that block (the grid item); a NON-direct-descendant wrapper becomes its own `sgs/container`, never dropped. Supersedes the patchwork (walk_passthrough drop-and-bubble, depth-2 gate, `_absorb_transparent_wrappers`). Canonical text: Spec 22 §FR-22-4.1. Implementation (walker rewrite) is the active next task; the depth-2 gate (D117 G2) is the working interim. Content + side-by-side layout render correctly today (G1+G2, live-DOM verified).

27. **Root-cause methodology is core + mandatory (D118, 2026-05-31)** — No assumptions / no probability / no trusting unverified claims or pixel-diff. Dig to the root cause from ALL logs+debug data; classify implementation-bug vs spec/plan-gap; verify every dependency (DB tables, block functionality, pipeline spec, truth-spec, pixel-diff-vs-live-DOM); attest with ≥2 evidence sources; roll back fast on regression. Full statement + tool list in root `CLAUDE.md` "Root-cause methodology". This is the working method for ALL future work on this project.

28. **Composite-mirror rule + container_kind column (D152, 2026-06-02)** — No composite block with a built-in wrapper (sgs/hero, sgs/cta-section, sgs/trust-bar, sgs/modal, etc.) may diverge from `sgs/container`'s wrapper capabilities (R-22-9 extension, locked Bean). Composite blocks declare `supports.sgs.containerKind` in block.json (`section|layout|content`); `/sgs-update` reads this and writes `block_composition.container_kind`. The converter (WS-3) will read the column and apply the 3-layer OUTER/CONTENT-WIDTH/PER-GRID-ITEM model from Spec 22 §FR-22-21 uniformly. Capability gaps found during WS-2 audit become block attrs to ADD to the composite, never converter workarounds. `sync-container-wrapping-blocks.py` rewritten to validated "wraps children" detection. 28-block container roster confirmed. Memory: `feedback_no_composite_evades_universal_rule`.

---

## 2026-05-25 cloning-pipeline session summary

The 2026-05-25 session ran a 4-rater `/qc-council` against the consolidated cloning-pipeline recovery plan and produced:

- **`.claude/reports/2026-05-25-qc-council-issue-register.md`** — canonical register, ~110 items across Sections A-R:
  - Section A (7 confirmed defects) — F1 universal-nesting + atomic_button missing CSS lift + brand empty body[] + D1 sidecar collisions
  - Section B (7 DB-first violations) — hardcoded dicts to migrate
  - Section P (27 binding design principles) — extracted from Bean's prior-session messages; THE rules every commit obeys
  - Section Q (20-cheat inventory) — file:line + replacement path for every hardcoded shortcut in `convert.py` + `css_router.py`
  - Section R (consolidated phase plan) + R1 (blocks.replaces audit) + R2 (allowed-nesting audit) + R5 (brand sgs/quote worked example end-to-end)

- **`.claude/plans/2026-05-26-phase-1-spec-22-implementation.md`** — phase plan. Phase 1.1-1.4b SHIPPED 2026-05-27 (8 task-commits: 507d4f57 / 0ba53c72 / d4bfa41d / 35fdab62 / 909c971a / cd3bef5e / b58e5ca3 / da3de993). Phase 1.5 (empirical pixel-diff measurement + halt/proceed) opens next session. (Superseded `2026-05-25-phase-1-universal-extraction.md` 2026-05-26; F1 spike commit `a757ff1c` IS the evidence that drove the Spec 22 architecture — see decisions.md D79.)

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
- **Spec 16 walker retired:** all F1 / lift_subtree / 9-branch walk() / per-slug cheats deleted via Phase 1.4b commit `da3de993`. Retired predecessor frozen at `_retired/convert_pre_spec22.py` (4803 LoC, rollback reference per F-RA-2).
- **NEW walker:** Spec 22 universal walker SHIPPED `da3de993` at `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` (1873 LoC, 61% reduction). EXACTLY 3 routing branches per R-22-3 (AST self-test self-runs in `__main__`). 145+/145+ tests PASS.
- **Phase 1.5 measurement pending:** deploy walker to sandybrown → run Stage 11 → compare per-cell pre/post pixel-diff → halt/proceed per R-22-13 (Bean visual sign-off co-authoritative).

---

## Variation-Concept Distinction (CRITICAL)

Three concepts share similar names but have different fates:

| Concept | What it is | Fate |
|---|---|---|
| WP style variations (`theme/sgs-theme/styles/<client>.json`) | Per-client colour/typography overlay | DELETED — Phase 5a (2026-05-21) |
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
