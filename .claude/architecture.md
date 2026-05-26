---
doc_type: architecture
scope: forever
title: SGS WordPress Framework — System Architecture
split_note: "2026-05-24 — split into 3 parts: architecture.md (this file, system design), .claude/dev-setup.md (build/deploy/SSH), .claude/plans/archive/2026-02-21-feature-audit.md (354-feature graded roadmap)"
---

> Last updated: 2026-05-26 (Spec 22 ratification + Spec 16 retirement). Architecture programme CLOSED (2026-05-22, 31 decisions). Cloning-pipeline canonical spec is now **Spec 22 (Universal Block-Equivalent Extraction)** — Spec 16 retired and archived. Phase 1 plan refactored to Spec 22's 5-commit walker rewrite + ≤5% acceptance gate (≤1% Phase 1.5 stretch). See `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` + `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md`.

# SGS WordPress Framework — System Architecture

## System Overview

SGS is a standalone WordPress block theme and Gutenberg blocks plugin built by Small Giants Studio. It competes directly with Kadence, Spectra, and GenerateBlocks — every block must be fully configurable by non-technical clients through the block editor alone. The framework is client-agnostic; Mama's Munches is the current pipeline canary, Indus Foods is the design-language proving ground, and every architectural decision must hold for any business type.

**Framework stats (2026-05-25):** 69 blocks (all dynamic; sgs/trust-bar retired D72), 2,246 block attributes, 184 design tokens, 35 patterns, 1,216 block supports, 89 slot synonyms, 117 property suffixes (incl. hover-state suffixes), 19 modifier_suffixes (variant/state/breakpoint/side/corner/unit kinds), 85 block_capabilities, 5,421 hooks, 18 SGS blocks declare `blocks.replaces` mapping to core. All blocks at `apiVersion: 3`. WP 7.0.

**Feature audit (354 features, graded roadmap):** moved to `.claude/plans/archive/2026-02-21-feature-audit.md`.

**Dev setup, build commands, and deploy instructions:** see `.claude/dev-setup.md`.

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| CMS | WordPress 7.0 | Block theme, no classic editor. Sandybrown upgraded 2026-05-22. |
| Theme | `sgs-theme` (block theme) | theme.json v3, template parts. Style variations retired (Phase 5a). |
| Blocks plugin | `sgs-blocks` | 69 blocks (Phase 6 audit + markup seeding 2026-05-22). Extensions in `src/blocks/extensions/`. `Sgs_Ai_Connector` wraps WP 7.0 AI Connectors API. |
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
│  │  (block theme)       │   │  (69 dynamic blocks)      │  │
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
│  │  slot_synonyms, property_suffixes, modifier_suffixes,  │ │
│  │  block_capabilities, variations, block_styles,        │ │
│  │  design_tokens, hooks, patterns                       │ │
│  └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

  /sgs-clone (cloning pipeline)
  ├── Stage 0: SGS-BEM HTML draft (mockup → structured HTML)
  ├── Stage 1: css_router.py (4-destination: D0 theme/D1 block-attr/D2 variation/D3 scaffold)
  ├── Stage 2: convert.py walker (Spec 22 universal walker — BEM → block slugs via slot_synonyms)
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
- `db_lookup.py` (read-only) exposes `slot_synonyms`, `block_attributes`, `property_suffixes`, `block_capabilities`, `modifier_suffixes` as Python-callable query helpers.
- `/sgs-update` (9-stage `sgs-update-v2.py`) rebuilds the DB from 10 canonical sources: block.json files, render.php parse, REST API enumeration (variations, styles), hooks scan, design token parse, and pattern parse.
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

15. **DB-driven atomic-tag map via `slot_synonyms.html_semantic_tag` + `blocks.replaces` (Spec 22 Appendix B, locked 2026-05-26)** — Bare HTML tags with no SGS classes route via DB-driven `db.atomic_tag_map()` (2-tier resolution): Tier 1 queries `slot_synonyms.html_semantic_tag → standalone_block`; Tier 2 falls through to `blocks.replaces` reverse-walk to find sgs-source blocks declaring `replaces` mapping for the core block equivalent. Examples: `<p>` → sgs/text; `<h1>`–`<h6>` → sgs/heading; `<img>` → sgs/media; `<blockquote>` → sgs/quote; `<a class*="sgs-button">` → sgs/button; `<ul>`/`<ol>` → sgs/icon-list. No hardcoded `ATOMIC_TAG_MAP` dict. Replacement of the legacy dict at convert.py:698 is Spec 22 Phase 1 Commit 1.2.

16. **Cascade-fold (per-property default + override, NOT binary uniformity gate; locked 2026-05-25 per blub.db row 287)** — For N sibling wrappers sharing a BEM-element class, the walker compares CSS values per-property across siblings: most-common value hoists to parent's "per-direct-child default" attr; divergent values stay as override attrs on the specific child that contradicts. Wrapper blocks always exist (preserve className for CSS targeting); their attrs carry only the divergence; parent carries the defaults. Content uniformity is irrelevant — each grid item / column carries unique content; folding happens at the styling layer only. The canonical precedent is `sgs/multi-button` (14 parent attrs set group defaults; inner `sgs/button` children render via `$content` and override per-instance).

17. **Hero is NOT a clean architectural reference (corrected 2026-05-25; superseded by Spec 22 cold-replacement 2026-05-26)** — Hero's prior ≤1% pixel-diff under Spec 16 was achieved via hardcoded cheats in `convert.py`. Spec 22 cold-replaces the entire walker (Phase 1 Commit 1.4), deleting all per-slug guards. The hero's "current ≤1%" status is therefore moot — the new walker either achieves Spec 22's ≤5% Phase 1 gate or it doesn't, irrespective of what the legacy cheat-driven path produced. Cheat removal happens automatically as a byproduct of the walker rewrite. See Spec 22 §1 + §7 Phase 1.4.

18. **Phases never ship as single commits (binding rule D73, blub.db row 288)** — Within any phase, every major task commits separately with: (a) `/qc-council` or `/qc-inline` pre-commit gate; (b) living-docs updates for the matched doc-type per trigger table; (c) `/sgs-clone --debug-trace` + Stage 11 measurement comparing pre/post values; (d) commit message citing predicted vs actual delta from the experiment frame. Per-task skill bindings: `/subagent-driven-development` for implementation (one implementer + 2 reviewers); `/delegate` for model routing; `/verify-loop` for 2-attestation. Anti-pattern of record: 2026-05-24 second-pass session (5 changes shipped as one wave, regressed pixel-diff 70.5% → 73.9%, regression unattributable).

19. **Per-section acceptance gate, NOT mean (Spec 22 FR-22-7, locked 2026-05-26)** — Phase 1 closure = per-section **≤5%** × 3 viewports for all 7 body sections (21 cells; each must hit ≤5% independently). Phase 1.5 stretch goal = per-section ≤1% × 3 viewports (bridges residual ~4pp via pixel-diff.py vertical-anchor fix + chrome cropping + font-load timing). Bean visual sign-off on cropped-pair artefacts is co-authoritative with script measurement (R-22-13). Mean averaging hides hidden failures and is retained as reporting metric only.

20. **Spec 22 universal block-equivalent extraction (locked 2026-05-26)** — Spec 22 replaces Spec 16 as the canonical cloning-pipeline architecture. Single universal walker path (FR-22-3); BEM is the only recognition signal (FR-22-1); block-equivalent attrs become child blocks via `equivalent_block_for()` (FR-22-2); render.php for hybrid blocks migrates to `echo $content` (FR-22-6); `wp-blocks.py` is the unified data CLI over sgs-framework.db + selected uimax tables (FR-22-8); cold replacement Phase 1 in 5 commits per R-22-5. Phase 1 acceptance ≤5%, Phase 1.5 stretch ≤1%. Council-validated 2026-05-26 via 4-rater /gap-analysis (Architectural Purist, Spec Checker, Pragmatic Engineer, Risk Auditor). Canonical reference: `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`.

---

## 2026-05-25 cloning-pipeline session summary

The 2026-05-25 session ran a 4-rater `/qc-council` against the consolidated cloning-pipeline recovery plan and produced:

- **`.claude/reports/2026-05-25-qc-council-issue-register.md`** — canonical register, ~110 items across Sections A-R:
  - Section A (7 confirmed defects) — F1 universal-nesting + atomic_button missing CSS lift + brand empty body[] + D1 sidecar collisions
  - Section B (7 DB-first violations) — hardcoded dicts to migrate
  - Section P (27 binding design principles) — extracted from Bean's prior-session messages; THE rules every commit obeys
  - Section Q (20-cheat inventory) — file:line + replacement path for every hardcoded shortcut in `convert.py` + `css_router.py`
  - Section R (consolidated phase plan) + R1 (blocks.replaces audit) + R2 (allowed-nesting audit) + R5 (brand sgs/quote worked example end-to-end)

- **`.claude/plans/2026-05-26-phase-1-spec-22-implementation.md`** — 5-commit walker rewrite phase plan with model routing + skills + predicted deltas + risk per commit. Pre-rewrite snapshot (Commit 1.1) is HARD GATE before walker rewrite. (Superseded `2026-05-25-phase-1-universal-extraction.md` 2026-05-26; the F1 spike commit `a757ff1c` IS the evidence that drove the Spec 22 architecture — see decisions.md D79.)

- **Decisions D70-D75 logged in `.claude/decisions.md`:**
  - D70 — Stage 10 inline-CSS deploy of `variation-d0-d2.css` (closes 4-section pixel-diff regression; mean 74.1% → 68.4%)
  - D71 — Step 1.7 G3 reframed (pixel-diff side closed by D70; failure-count side empirically misframed)
  - D72 — sgs/trust-bar block retired in favour of universal-nesting (mean 68.4% → 63.2%)
  - D73 — phases never ship as single commits (binding rule)
  - D74 — Phase 1 scope = full universal-extraction backbone (one consolidated plan, NOT a series of small phases)
  - D75 — qc-council verdict CONDITIONAL APPROVE pending F1 spike

**Empirical baseline (2026-05-26 post-Spec-22-ratification — Spec 22 §3 acceptance gate referenced):** mean pixel-diff 63.0% across 27 captures (run `mamas-munches-homepage-2026-05-26-012625/stage-11-pixel-diff.json`); brand 53.2/50.9/46.0% (post-F1 + Option-A customWidth fix + Option-C sgs_attr_has_value helper); hero unchanged via Spec 16 cheats (cheats removed automatically by Spec 22 cold-replacement walker rewrite — see Phase 1 plan Commit 1.4). F1 helper SHIPPED at `convert.py:3916` (`_f1_universal_walk_direct_children`) wired at 3 callsites in `walk()` lines 4051/4125/4182 — F1 is retired into the Spec 22 universal walker at Phase 1 Commit 1.4.

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
