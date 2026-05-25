---
doc_type: architecture
scope: forever
title: SGS WordPress Framework — System Architecture
split_note: "2026-05-24 — split into 3 parts: architecture.md (this file, system design), .claude/dev-setup.md (build/deploy/SSH), .claude/plans/archive/2026-02-21-feature-audit.md (354-feature graded roadmap)"
---

> Last updated: 2026-05-25 (qc-council session + Phase 1 universal-extraction plan locked). Architecture programme CLOSED (2026-05-22, 31 decisions). Cloning-pipeline universal-extraction Phase 1 NOT YET STARTED (Phase 1 plan + ~110-item canonical register shipped this session; F1 spike is HARD GATE before full dispatch). See `.claude/plans/2026-05-21-architecture-staging.md` for the architecture programme + `.claude/reports/2026-05-25-qc-council-issue-register.md` for the universal-extraction register.

## Overview

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

14. **Universal-nesting primitive (Spec 16 §15 line 990, locked 2026-05-25)** — Every composite block emits OPEN with InnerBlocks children mirroring the mockup's parent-child shape — NOT flat-attrs lifted from descendants. **Every BEM-class div in the mockup becomes its own emitted block, carrying its mockup className.** When the converter's `_lift_inner_blocks` (convert.py:1430) returns empty for a parent slug — because `blocks.parent_block` has no DB rows for it — the **F1 fallback** walks direct child div + semantic-tag descendants and calls back into the universal `walk()`, which routes each child via FR2 atomic-tag emission or class-based recognition. F1 is the canonical closure for G1 (self-closing composite blocks) + G3 (text-only slot resolver) + G5 (per-block DOM mismatches) — all three were council-reframed in 2026-05-21 as ONE wiring gap. Canonical worked example: brand `sgs/quote` (Section R5 of qc-council register).

15. **DB-driven ATOMIC_TAG_MAP via `blocks.replaces` (locked 2026-05-25 per D75)** — Bare HTML tags route to their SGS replacement, not core blocks. 18 SGS blocks declare `replaces` mapping: `<p>` → sgs/text (replaces core/paragraph); `<h1>`–`<h6>` → sgs/heading (replaces core/heading); `<img>` → sgs/media (replaces core/image); `<blockquote>` → sgs/quote; `<a class*="sgs-button">` → sgs/button; `<ul>`/`<ol>` → sgs/icon-list. Walker queries `SELECT slug FROM blocks WHERE replaces=? AND source='sgs'` at recognition time. No parallel hardcoded mapping. The current hardcoded `ATOMIC_TAG_MAP` at convert.py:698 is Cheat Q14 in the register's Section Q — slated for replacement in Phase 1B (Commit 9 of phase-1 plan).

16. **Cascade-fold (per-property default + override, NOT binary uniformity gate; locked 2026-05-25 per blub.db row 287)** — For N sibling wrappers sharing a BEM-element class, the walker compares CSS values per-property across siblings: most-common value hoists to parent's "per-direct-child default" attr; divergent values stay as override attrs on the specific child that contradicts. Wrapper blocks always exist (preserve className for CSS targeting); their attrs carry only the divergence; parent carries the defaults. Content uniformity is irrelevant — each grid item / column carries unique content; folding happens at the styling layer only. The canonical precedent is `sgs/multi-button` (14 parent attrs set group defaults; inner `sgs/button` children render via `$content` and override per-instance).

17. **Hero is NOT a clean architectural reference (corrected 2026-05-25)** — Hero's current ≤1% pixel-diff achievement is via hardcoded cheats in `convert.py` (per-slug `if block_slug == "sgs/hero":` guard at 3557 for split-image; hero-specific `VARIANT_MODIFIERS` dict at 3591-3608; `ARRAY_LIFT_PATTERNS` recipes at 1008-1030). The universal architecture is NOT yet proven by hero's current state. Each cheat in Section Q of the register is a roadmap item — what universal mechanism + DB data needs to exist for the cheat to be removed. Cheat removal sequence requires hero attribute-count parity gate (not just pixel-diff) — pixel-diff alone allows silent regression.

18. **Phases never ship as single commits (binding rule D73, blub.db row 288)** — Within any phase, every major task commits separately with: (a) `/qc-council` or `/qc-inline` pre-commit gate; (b) living-docs updates for the matched doc-type per trigger table; (c) `/sgs-clone --debug-trace` + Stage 11 measurement comparing pre/post values; (d) commit message citing predicted vs actual delta from the experiment frame. Per-task skill bindings: `/subagent-driven-development` for implementation (one implementer + 2 reviewers); `/delegate` for model routing; `/verify-loop` for 2-attestation. Anti-pattern of record: 2026-05-24 second-pass session (5 changes shipped as one wave, regressed pixel-diff 70.5% → 73.9%, regression unattributable).

19. **Per-section acceptance gate, NOT mean (locked 2026-05-25)** — Phase 1 closure = per-section ≤30% × 3 viewports for all 7 body sections (21 cells; each must hit ≤30% independently). Phase 1.5 closure = per-section ≤1% × 3 viewports. Mean averaging hides hidden failures (e.g. hero staying at 70% while 6 others drop to 22% averages to 28% — appears to pass; in reality hero is broken).

---

## 2026-05-25 cloning-pipeline session summary

The 2026-05-25 session ran a 4-rater `/qc-council` against the consolidated cloning-pipeline recovery plan and produced:

- **`.claude/reports/2026-05-25-qc-council-issue-register.md`** — canonical register, ~110 items across Sections A-R:
  - Section A (7 confirmed defects) — F1 universal-nesting + atomic_button missing CSS lift + brand empty body[] + D1 sidecar collisions
  - Section B (7 DB-first violations) — hardcoded dicts to migrate
  - Section P (27 binding design principles) — extracted from Bean's prior-session messages; THE rules every commit obeys
  - Section Q (20-cheat inventory) — file:line + replacement path for every hardcoded shortcut in `convert.py` + `css_router.py`
  - Section R (consolidated phase plan) + R1 (blocks.replaces audit) + R2 (allowed-nesting audit) + R5 (brand sgs/quote worked example end-to-end)

- **`.claude/plans/2026-05-25-phase-1-universal-extraction.md`** — 19-commit phase plan with model routing + skills + predicted deltas + risk per commit. F1 spike (Commit 7) is HARD GATE before full dispatch.

- **Decisions D70-D75 logged in `.claude/decisions.md`:**
  - D70 — Stage 10 inline-CSS deploy of `variation-d0-d2.css` (closes 4-section pixel-diff regression; mean 74.1% → 68.4%)
  - D71 — Step 1.7 G3 reframed (pixel-diff side closed by D70; failure-count side empirically misframed)
  - D72 — sgs/trust-bar block retired in favour of universal-nesting (mean 68.4% → 63.2%)
  - D73 — phases never ship as single commits (binding rule)
  - D74 — Phase 1 scope = full universal-extraction backbone (one consolidated plan, NOT a series of small phases)
  - D75 — qc-council verdict CONDITIONAL APPROVE pending F1 spike

**Current empirical baseline (2026-05-25 latest run, page 144 sandybrown):** mean pixel-diff 63.2% across 27 captures; hero 17% extracted with cheats inside; brand `sgs/quote` self-closing with empty `body[]`; F1 fallback proposed at `convert.py:1430`.

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
