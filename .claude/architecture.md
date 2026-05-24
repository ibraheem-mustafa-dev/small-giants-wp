---
doc_type: architecture
scope: forever
title: SGS WordPress Framework — System Architecture
split_note: "2026-05-24 — split into 3 parts: architecture.md (this file, system design), .claude/dev-setup.md (build/deploy/SSH), .claude/plans/archive/2026-02-21-feature-audit.md (354-feature graded roadmap)"
---

> Last updated: 2026-05-24 (post doc-op split). Architecture programme CLOSED (2026-05-22). 31 decisions across 8 phases. See `.claude/plans/2026-05-21-architecture-staging.md` for the full decision record.

## Overview

SGS is a standalone WordPress block theme and Gutenberg blocks plugin built by Small Giants Studio. It competes directly with Kadence, Spectra, and GenerateBlocks — every block must be fully configurable by non-technical clients through the block editor alone. The framework is client-agnostic; Indus Foods is the first client and acts as the proving ground, but every architectural decision must hold for any business type.

**Framework stats (2026-05-22):** 69 blocks (all dynamic), 2,230 block attributes, 184 design tokens, 35 patterns, 1,223 block supports, 89 slot synonyms, 117 property suffixes, 5,234 hooks. All blocks at `apiVersion: 3`.

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
