# SGS WordPress Framework — Architecture
> **Consolidated 2026-04-29** by `/project-consolidate`.
>
> Combines: root `ARCHITECTURE.md` + `docs/2026-02-21-master-feature-audit.md` (354-feature graded roadmap, completion-tracking authoritative) + `docs/DEVELOPER.md` (developer setup + workflow). Originals archived to `.claude/memory/consolidated-2026-04-29/`.

---

## Part A — Architecture overview

*Source: root `ARCHITECTURE.md` (2026-04-28).*

> Last updated: 2026-04-28 | Status: Active Development (Phase 3.2 complete, hover variant gaps closed, Floating UI architecture decided)

## Overview

SGS is a standalone WordPress block theme and Gutenberg blocks plugin built by Small Giants Studio. It competes directly with Kadence, Spectra, and GenerateBlocks — every block must be fully configurable by non-technical clients through the block editor alone. The framework is client-agnostic; Indus Foods is the first client and acts as the proving ground, but every architectural decision must hold for any business type.

**Draft naming convention (canonical):** All Bean-controlled drafts (mockups, sketches, hand-coded HTML produced in-house) MUST use SGS-prefixed BEM (`.sgs-<block>__<element>--<modifier>`). Canonical reference: **`.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md (§8.1; former Spec 13 absorbed 2026-05-12)`** (locked 2026-05-10). Live scrapes use lingua-franca-conversion at recognition time. The 9-stage `/sgs-clone` pipeline collapses from probabilistic to deterministic for Bean-authored drafts under this convention.

**Deterministic converter (slot-aware DOM walker, Spec 16 2026-05-14):** Spec 16 is the concrete implementation of Spec 15 §7 Stages 3-7. Phase 1 shipped 2026-05-14: prototype at `.claude/scratch/converter-prototype/` (1,136 lines across db_lookup + convert + convert_page) emits clean WP block markup with typed-attr lifts on the Mama's Munches homepage (10 SGS block types from 9 sections). Replaces ~1,942 lines of legacy `extract.py` + `extract_strategies.py` + `overrides/hero.py` at Phase 6 of the rollout. Phase 7 plan at `.claude/plans/phase-7-spec-16-converter-rollout.md`.

## Stack

| Layer | Technology | Notes |
|---|---|---|
| CMS | WordPress 6.9.1 | Block theme, no classic editor |
| Theme | `sgs-theme` (block theme) | theme.json v3, template parts, style variations per client |
| Blocks plugin | `sgs-blocks` | 67 blocks (60 dynamic + 7 static, per `02-SGS-BLOCKS-REFERENCE.md` 2026-05-11). Block extensions live in `src/blocks/extensions/`. Block Defaults system (Phase 3.2) lets clients save current attribute values as defaults for new instances site-wide. Backend integrations live alongside the blocks at `includes/`: Google Reviews (Places API + transient cache) and Trustpilot Sync (Browserless `/content` + JSON-LD parser + WP-cron). |
| Block build | `@wordpress/scripts` | `--experimental-modules` flag required for `viewScriptModule` |
| Frontend JS | Interactivity API + vanilla ES modules | Interactivity API for stateful blocks; vanilla `viewScriptModule` for AJAX (Post Grid) |
| Icons | Lucide (1900+ icons) | Pre-generated to `lucide-icons.php` via `scripts/generate-icons.js` |
| Fonts | Inter variable (default) | Self-hosted WOFF2, no CDN. Montserrat + Source Sans 3 for Indus Foods |
| Hosting | Hostinger (`ssh hd`) | Shared hosting, LiteSpeed cache |
| Dev site | palestine-lives.org | All deploys go here |
| Test/client site | lightsalmon-tarsier-683012.hostingersite.com | READ ONLY — never modify |
| Notifications | N8N (72.62.212.169) | Webhooks only, no `wp_mail()` |
| Payments | Stripe | Booking + forms (Phase 2+) |

## Directory Structure

```
small-giants-wp/
├── theme/sgs-theme/
│   ├── theme.json                  # Design tokens — all colour/spacing/typography vars
│   ├── style.css                   # Theme header ONLY (16 lines, no CSS rules)
│   ├── functions.php               # Enqueues, variation-specific CSS via wp_add_inline_style()
│   ├── styles/                       # 8 client style variations (eye-care-ward-end, helping-doctors,
│   │   ├── indus-foods.json          # indus-foods, mamas-munches, sgs-construction, sgs-healthcare,
│   │   └── mamas-munches.json        # sgs-mosque, sgs-professional). mamas-munches.json added 2026-04-30.
│   ├── templates/                  # Full-page templates (index, page, single, etc.)
│   ├── inc/
│   │   └── class-business-details.php  # Settings > Business Details (phone, email, address, hours, socials)
│   ├── parts/
│   │   ├── header.html             # Single canonical header (top bar, nav, mobile drawer, CTA buttons)
│   │   └── footer.html             # Footer with sgs/business-info blocks (auto-populates from settings)
│   ├── assets/
│   │   ├── css/core-blocks.css     # Overrides for core WordPress blocks (nav, columns, etc.)
│   │   ├── fonts/                  # Self-hosted WOFF2 font files
│   │   ├── svg/                    # SVG assets
│   │   └── decorative-foods/       # Indus Foods decorative ingredient PNGs (version-controlled)
│   └── patterns/                   # Reusable block patterns
│
├── plugins/sgs-blocks/
│   ├── sgs-blocks.php              # Plugin entry, block registration, category registration
│   ├── includes/
│   │   ├── heading-anchors.php     # Auto-generates heading IDs for Table of Contents
│   │   ├── lucide-icons.php        # Auto-generated — 1963 lines, exempt from 300-line limit
│   │   └── render-helpers.php      # TODO: extract shared colour/font-size helpers here
│   ├── src/blocks/                 # Block source files (one folder per block)
│   │   ├── [block-name]/
│   │   │   ├── block.json          # Attributes, supports, selectors, file refs
│   │   │   ├── edit.js             # Block editor UI + InspectorControls
│   │   │   ├── render.php          # Server-side render (dynamic blocks)
│   │   │   ├── style.css           # Frontend + editor styles
│   │   │   ├── editor.css          # Editor-only styles
│   │   │   ├── view.js             # Frontend Interactivity API module (interactive blocks)
│   │   │   └── save.js             # Returns null (dynamic) or InnerBlocks.Content
│   │   └── extensions/             # Block editor extensions (animation, visibility, hover, spacing, CSS, defaults)
│   ├── build/                      # Compiled output — deployed to server
│   ├── scripts/
│   │   ├── generate-icons.js          # Generates lucide-icons.php from lucide-react
│   │   └── audit-block-uniformity.py  # Pre-commit uniformity audit (added 2026-04-30):
│   │                                  # checks viewScript/source:html/typography duplication/missing supports.color
│   └── package.json                # Build scripts: `npm run build`, `npm run start`
│
├── sites/
│   └── indus-foods/                # Client-specific content, mockups, research, notes
│       ├── CLAUDE.md               # Indus Foods-specific dev instructions
│       ├── outstanding-issues.md   # Master issue tracker (48 issues, all sections)
│       ├── vscode-session-prompt.md # Ordered fix checklist for next session
│       ├── assets/                 # Client logos, decorative images (also in theme/assets)
│       ├── mockups/                # HTML mockups, screenshots, reference designs
│       ├── notes/                  # Research docs, website analysis
│       └── content/                # Page content drafts
│
├── .claude/
│   ├── architecture.md             # This file (was repo-root ARCHITECTURE.md until 2026-04-29)
│   ├── handoff.md                  # Session-to-session context (was CONVERSATION-HANDOFF.md)
│   ├── specs/                      # Framework spec documents (00–10) + design-brain rubrics
│   ├── plans/                      # Active plans + plans/strategy/ + plans/archive/
│   ├── memory/                     # Archived handoffs + consolidation receipts
│   └── reports/                    # Generated audit / QC / lifecycle reports
├── CLAUDE.md                       # Root dev instructions (this file is law)
├── composer.json                   # Dev-only PHP stubs for IDE Intelephense
├── composer.lock                   # Locks stub versions: wordpress-stubs v6.9.1, wp-cli-stubs v2.12.0
└── vendor/                         # Composer install target — gitignored, not deployed
```

## Key Architectural Decisions

1. **Dynamic blocks only (server-rendered via render.php)** — All complex blocks use `render` in block.json pointing to render.php. `save()` returns `null` or `<InnerBlocks.Content />`. This avoids deprecation headaches and lets PHP control output. Static blocks are used only for simple wrappers.

2. **All block properties are attributes, never hard-coded CSS** — Every visual property (colour, spacing, font size, hover effect, image) is a block attribute with an editor control. CSS provides only the structural defaults. Client-specific overrides go through `indus-foods.json` style variation or `wp_add_inline_style()` gated on the active variation.

3. **Colour system: DesignTokenPicker + `:not([style*="color"])` guard** — Colours are set via `DesignTokenPicker` (returns a slug or hex). In render.php, slugs become `var(--wp--preset--color--{slug})`, raw hex values pass through. CSS fallbacks use `:not([style*="color"])` so any inline style set by the attribute always wins over the CSS rule. This pattern must be used in every block.

4. **Variation-specific CSS goes in functions.php, gated** — All Indus Foods CSS that can't be expressed via theme.json tokens lives in `functions.php` via `wp_add_inline_style()` gated on `get_theme_mod('active_theme_style') === 'indus-foods'`. Never in `style.css`. Other clients are unaffected.

5. **Client-specific images are version-controlled in theme/assets, not uploads** — Decorative images used via CSS pseudo-elements go in `theme/sgs-theme/assets/{client}/`. URLs are generated via `get_theme_file_uri()`, never hardcoded as `/wp-content/...` paths.

6. **`sgs/container` is the universal layout primitive** — Used for all multi-column and section layouts. Supports `layout` (stack/grid/flex), `columns`, `columnsTablet`, `columnsMobile`, `gap`, `backgroundImage`, `minHeight`, `htmlTag`. Nesting containers inside containers is the correct pattern for complex layouts. Do NOT add bespoke layout attributes to content blocks.

7. **Hover effects: universal extension + per-block variants** — The hover-effects extension at `src/blocks/extensions/hover-effects.js` registers 12 universal hover attributes available on every SGS block: 3 colour shifts (bg/text/border), 2 scale (preset + numeric), shadow elevation, image zoom, grayscale, **border-accent** (line slides in on hover, added 2026-04-28), **tilt-3d** (mouse-tracking 3D rotation, added 2026-04-28), transition duration, stagger delay, and 2 block-link attributes. These are universal — no per-block opt-in needed. Sensible defaults applied to all SGS blocks (scale 1.02, shadow medium, image zoom on, duration 250ms) with 26 blocks opted out (announcement-bar, breadcrumbs, all form-fields, container, mega-menu, etc). On top of universal hovers, named per-block variants exist for blocks that need bespoke behaviour: Info Box (lift/border-accent/glow), Card Grid (zoom/lift/**overlay-slide**), Gallery (zoom/lift/**overlay-slide**), SVG Background (pulse/float/wave), Brand Strip (greyscale). Total interactive options across the framework: **33/36 spec'd** (3 remaining gaps: parallax extension, scroll-progress already shipped, border-accent universal already shipped).

8. **WordPress Interactivity API for most frontend JS; Post Grid uses vanilla ES module** — No jQuery. Stateful interactive blocks (nav, slider, accordion, form steps) use `viewScriptModule` + `@wordpress/interactivity` store/state. Post Grid uses a vanilla ES module with `fetch()` for AJAX pagination — lighter weight, no state management needed. The `--experimental-modules` build flag is required for all `viewScriptModule` blocks.

9. **`sgs/container` responsive layout — three independent breakpoints** — `columns` (desktop), `columnsTablet` (768–1024px), `columnsMobile` (<768px) are independent. CSS media query classes (`.sgs-cols-tablet-{n}`) handle the breakpoint overrides. Clients set all three from the inspector panel.

10. **SGS competes with Kadence/Spectra — block editor controls are non-negotiable** — Every customisable property MUST be an inspector control. If a client needs to open code to change something, that feature is not done. WP-CLI is a developer tool only.

11. **Per-device visibility via block extension, not separate templates** — WordPress block themes have one template part per name; per-device template routing does not exist. The correct pattern (matching Kadence/GenerateBlocks) is a Visibility panel extension applied to ALL blocks via `editor.BlockEdit` + a PHP `render_block` filter to ensure classes survive on core dynamic blocks. Clients build three layout groups inside one `header.html`, hiding each non-applicable group per breakpoint. The extension lives in `plugins/sgs-blocks/src/blocks/extensions/responsive-visibility.js` — the existing `sgs/*` scope guard must be removed to cover core blocks.

12. **Animation extension uses WordPress filter API, not block styles** — Scroll animations are a block extension (`src/blocks/extensions/animation.js`) applied to all 59 SGS blocks + 4 core blocks (group, columns, cover, image) via `blocks.registerBlockType` + `editor.BlockEdit` HOC + `render_block` PHP filter. Four attributes per block: `sgsAnimation` (**16 types** as of 2026-04-28: fade-up/down/left/right/in, slide-up/down, zoom/scale-in/out, flip-left/right, rotate-in, blur-in, bounce-in, reveal-up), `sgsAnimationDelay`, `sgsAnimationDuration`, `sgsAnimationEasing` (6 curves). CSS initial states are gated behind `.sgs-js` class + `prefers-reduced-motion: no-preference`. The `render_block` PHP filter uses `WP_HTML_Tag_Processor` to inject `data-sgs-animation` on the root element. Frontend IntersectionObserver in `animation-observer.js` watches `[data-sgs-animation]` and adds `.sgs-animated`. Inner blocks (tab, accordion-item, form fields) are denylisted.

13. **Floating UI lives in the WordPress Customiser, not as blocks** — Back to Top, Reading Progress, and future floating chrome (cookie banner, chat widget) are configured at `Appearance → Customise → SGS Floating UI`. **Why Customiser, not a Settings admin page or blocks:** clients see changes (button position, colour, size, behaviour) update live in the preview as they drag sliders. A static admin page requires save-and-refresh. Blocks would render where placed in the post flow — wrong mental model for elements that float fixed-position regardless of placement. Settings stored as `theme_mod` (auto-scoped to active theme/style variation). Frontend output via `wp_footer` hook reading `get_theme_mod()`. Per-page override via post meta `_sgs_hide_floating_ui` (array of slugs to hide on a specific page). Existing `sgs/back-to-top` block is deprecated to a no-op (renders empty, editor shows deprecation notice pointing to Customiser) so legacy usage doesn't break.

14. **Block Defaults System (Phase 3.2) — Save current values as site-wide defaults** — The `Block_Defaults` class registers a REST endpoint at `/sgs-blocks/v1/defaults` (POST/DELETE) that lets users save the currently-configured attributes of any SGS block as the default for new instances. Storage: single `wp_options` row `sgs_block_defaults` (JSON keyed by block name). The `block-defaults.js` extension adds a "Save as Default" button to every SGS block's Advanced inspector panel. On editor boot, `Block_Defaults::inject_defaults_script()` outputs `window.sgsBlockDefaults` before the extensions bundle, and the JS extension's `blocks.registerBlockType` filter merges saved defaults into each block's attribute schema before any block is registered — so new insertions inherit them automatically without an extra REST roundtrip. Admin page at `Settings → SGS Block Defaults` lists all saved defaults with per-block "Reset" buttons. Permission: `edit_theme_options`. Mirrors Kadence's "Configurable Defaults" UX. Replaces the failed initial design that put block names in URL paths (WP REST routes can't contain forward slashes — block name now passes via request body).

15. **Palette tokens are mandatory for block colour defaults** — Every SGS block's default colour value must reference a palette token via either a slug (in block.json defaults) or `var(--wp--preset--color--X, #fallback)` pattern (in CSS/PHP). Bare hex defaults are forbidden because they don't switch when a client changes style variation. Brand colours (LinkedIn `#0A66C2`, Facebook, WhatsApp) are intentional exceptions documented as such. The palette includes `border-light` (`#E5E7EB`) and `error` (`#DC2626`) as canonical semantic slugs added 2026-04-28 to consolidate near-duplicate hex values previously used as bare fallbacks across form/google-reviews/whatsapp-cta CSS files.

13. **Logo switching uses `sgs/responsive-logo` block** — The core `site-logo` block only exposes one image. The correct approach is a custom `sgs/responsive-logo` block with two `MediaUpload` attributes (`desktopLogoId`, `mobileLogoId`). `render.php` uses `wp_get_attachment_image()` to output both images; CSS media queries show/hide the correct one per breakpoint. Stores attachment IDs (not URLs) so the block survives domain changes and CDN migrations.

16. **Block customisation standard (formalised 2026-04-30)** — Native `supports.color` for wrapper background + text colour. Native `supports.typography` with `selectors.typography` pointing to the primary text element (e.g. `.wp-block-sgs-hero .sgs-hero__headline`) for headline-level controls. Custom UK colour attrs (`headlineColour`, `iconColour`, `ctaColour`) ONLY for inner elements that need independent control from the wrapper. Three-attr responsive sets (`attrName` + `attrNameMobile` + `attrNameTablet`) where WP doesn't natively support responsive attrs. Selector naming: `.wp-block-sgs-{name}` for dynamic blocks (`selectors.root`), `.sgs-{name}` for static blocks. Enforced via `plugins/sgs-blocks/scripts/audit-block-uniformity.py` + git pre-commit hook (appends to existing gitleaks check; runs only when `block.json` files are staged).

17. **PHP IDE stubs via Composer (dev-only)** — Project uses `php-stubs/wordpress-stubs` v6.9.1 (matches palestine-lives.org's WP version) and `php-stubs/wp-cli-stubs` v2.12.0 to give Intelephense accurate symbol resolution for WP core functions like `get_block_wrapper_attributes()`, `wp_unique_id()`, `esc_attr()`, `wp_kses_post()`. Installed to `vendor/` (gitignored). VS Code points Intelephense at the Composer-installed stubs via `intelephense.environment.includePaths` — overrides the bundled stubs which lag behind WP core. `composer.json` + `composer.lock` are committed; `vendor/` is not.

18. **HTML mockup → SGS blocks compiler (researched 2026-04-30, in flight)** — Bean drafts pages in HTML/CSS in `sites/<client>/mockups/`. The compiler (forked from Verneaut's `html-to-gutenberg`) reads annotated HTML + a `block.config.json` sidecar and emits `block.json` + `render.php` + `edit.js` + `style.css` for SGS dynamic blocks. Annotation grammar: `data-sgs="name:type"` with 8 types (text/image/link/bool/array/innerblocks/business + colour-token via sidecar). AI annotator pre-step uses Anthropic structured output to add `data-sgs` attributes from plain HTML. Pattern mode (`--mode=pattern`) emits `register_block_pattern()` PHP. Ships as `/sgs-mockup-to-block` skill + slash command. Build estimate: 3.5–4 days. Research doc: `~/.openclaw/workspace/memory/research/2026-04-30-html-mockup-to-sgs-blocks.md`.

19. **SGS Button Architecture (decided 2026-05-03, build queued)** — Replace all uses of `core/button` inside SGS blocks with a custom `sgs/button` block (atomic) + `sgs/multi-button` (container, accepts 0..N sgs/button via InnerBlocks). Composite blocks (sgs/hero, sgs/cta-section, sgs/product-card, sgs/feature-grid) refactor from internal CTA-attribute rendering to InnerBlocks composition — they expose a slot whose default template is `sgs/multi-button` containing 2 `sgs/button` instances. The `inheritStyle` attribute on every `sgs/button` (`primary` / `secondary` / `outline` / `custom`) binds to global presets defined in `wp_options.sgs_button_presets` and mirrored to `theme.json` `settings.custom.buttonPresets`. Three editing paths (settings page primary, Site Editor block-style-variations, theme.json) write the same backing store. **This kills "Match Style" extension proposals** — the dropdown lives once on `sgs/button` itself and every instance inherits it via composition. Spec at `.claude/specs/11-SGS-BUTTON-ARCHITECTURE.md` (87 attributes after competitor-research-driven gap analysis vs Spectra/Kadence/Stackable/core).

20. **Recogniser v2 / `/sgs-clone` pipeline — schema-driven, all-CSS-harvest, forward-only (orchestrator shipped 2026-05-09, hero verified at 100% PoC parity, multi-section walker is M9)** — Replaces v1 recogniser at `tools/recogniser/`. Three structural defects in v1 corrected: (a) **fingerprints auto-derived from `block.json`** so attribute extraction can never silently skip declared attributes (v1 hand-written → 12% coverage on sgs/hero); (b) **all CSS rules harvested every run** (BS4 native selector engine + recursive @media block parsing + Playwright cascade resolution) and classified into block-attribute / universal-handled / one-time-custom buckets — zero silent loss; (c) **forward-only emission** (no reverse template, no round-trip "lossless" claim — three independent reviews converged on round-trip being a tautology that doesn't prove WP correctness). Pipeline emits `sgs/multi-button` + `sgs/button` markup for any CTA pattern detected (Decision 19 / spec 11 button architecture is shipped).

    **Foundation toolkit (status reconciled 2026-05-11 — spec 14 P1):** the 4-layer fingerprint catalogue is a spec 14 BUILD target (FR1-FR4 + FR26), not shipped infrastructure. Planned output path: `plugins/sgs-blocks/scripts/fingerprint-builder/output/`. Recogniser scripts: 4 shipped 2026-05-11 at `plugins/sgs-blocks/scripts/recogniser/` (`per-section-convention-voter.py`, `confidence-matrix.py`, `leftover-bucket-router.py`, `simple_html_review_report.py`). 4 additional scripts originally listed (heuristic-fallback-builder, computed-style-passport, recursion-guard, critical-fix-verification) decided per spec 14 FR18 (P1 KJC2, 2026-05-11; revised after Bean caught a fabrication on recursion-guard): heuristic-fallback-builder RETIRED (role absorbed by Layer 2 role-templates); computed-style-passport RETIRED (replaced by Playwright runtime probe in FR3); `recursion-guard.py` BUILT in P2 as a ~50-LOC standalone module (imported by `sgs-clone-orchestrator.py` and DOM-walking scripts); `critical-fix-verification.py` BUILT in P10 as a lightweight ~45-min acceptance harness (5 canonical-mutation-boundary checks). uimax `recognition_log` table + `uimax-write-validator.py` shipped 2026-05-08 enforcing no-licensing (blub.db row 211) + Rosetta Stone discipline (blub.db row 213) gates. The original "shipped 2026-05-08" claim here was incorrect; reconciled per spec 14 FR17. v1 fingerprints data at `tools/recogniser/data/fingerprints.json` `block_type` field also stale (testimonial + whatsapp-cta migrated to dynamic 2026-05-05 but FP not updated; tab + feature-grid + multi-button missing or wrong); treat v1 fingerprints as INITIAL DATA to verify, not source-of-truth.

    **Orchestrator (shipped 2026-05-09):** `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (~280 lines) wraps the canonical 9-stage pipeline + writes JSON artefacts at `pipeline-state/<run_id>/stage-N.json` + emits operator-review HTML. Hero smoke against Mama's mockup at 1440 desktop with Playwright matches the manual PoC at 100% parity (50/50 attrs byte-identical). Single-section per invocation today; multi-section walker is M9. Hero extractor at `tools/recogniser-v2/extract.py` (~600 LOC) is the per-section worker the orchestrator wraps.

    **Skill surface (shipped 2026-05-09):** `/sgs-clone` (orchestrator) + 5 siblings (`/uimax-scrape`, `/uimax-sgs-scrape-pattern`, `/uimax-mood-board`, `/uimax-scrape-animation`, `/uimax-classify-naming`) at `~/.claude/skills/`. All 6 graded >=B (skillscores 87-98%). Each carries rubric file at `<skill-dir>/references/end-goal-rubric.md` with `bean_signoff: confirmed_via_m7_brief_2026-05-08`. The deprecated `/animation-harvest` skill stays in repo as reference; replacement `/uimax-scrape-animation` enforces the SGS-block-attribute mapping the deprecated skill silently dropped.

    Spec at `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md (former Spec 12 absorbed 2026-05-12)`. Salvage matrix REVISIONS at `.claude/specs/cloning-skill-salvage-matrix-2026-05-05.md`. Pattern dedup mechanics REVISIONS at `.claude/specs/pattern-dedup-classify-mechanics-2026-05-05.md`.

21. **Universal CSS foundations applied to core-blocks-critical.css (2026-05-03)** — Three rules apply across ALL SGS-themed client sites: `* { box-sizing: border-box; }` (modern web standard, required for layout fidelity to mockups that measure dimensions inclusive of padding/border); `img { max-width: 100%; height: auto; display: block; }` (prevents image overflow inside containers); canonical `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; ... } }` (replaces 4 redundant per-block prefers-reduced-motion blocks across `core-blocks.css` and `back-to-top.css`). Removed at the same time. Per-site overrides (e.g. mockup-faithful 2px focus-visible with `border-radius: 4px` for Mama's) live in the variation JSON's `styles.css` field, NOT in framework CSS — variation can deliberately diverge from framework default.

## Block Inventory

### Layout blocks
| Block | Key capability |
|---|---|
| `sgs/container` | Universal layout wrapper — stack/grid/flex, 3-breakpoint responsive, nested containers |
| `sgs/hero` | Full-width hero with bg image, overlay, split image, badge array. **CTAs via InnerBlocks (sgs/multi-button + sgs/button)** since 2026-05-04. 5 per-breakpoint typography attrs (headlineFontSizeDesktop/Tablet/Mobile, subHeadlineMaxWidth, splitImageMobileHeight). |
| `sgs/feature-grid` | **NEW 2026-05-04.** Container restricted to `sgs/info-box` children. Two layout modes: `auto-flex` (CSS Grid auto-fill, naturally responsive) and `fixed-columns` (explicit per-breakpoint count). |
| `sgs/multi-button` | **NEW 2026-05-04.** Container restricted to `sgs/button` children. Per-breakpoint direction/gap/wrap/alignment. |

### Content blocks
| Block | Key capability |
|---|---|
| `sgs/info-box` | **REBUILT 2026-05-04.** 5 toggleable, reorderable elements: media (icon/emoji/image), title, subtitle, text, button (sgs/multi-button InnerBlocks). `elementOrder` array drives display order; each element has `show*` boolean. |
| `sgs/button` | **NEW 2026-05-04.** 87-attribute canonical button. `inheritStyle` (primary/secondary/outline/custom) binds to theme.json preset values via CSS custom properties. Lucide icon support, per-breakpoint typography/padding/margin, hover states. Replaces all uses of `core/button` inside SGS blocks. |
| `sgs/card-grid` | Image grid with overlay/card variants, hover effects, responsive columns |
| `sgs/cta-section` | Headline + body + **CTAs via InnerBlocks (sgs/multi-button + sgs/button) since 2026-05-04**, full layout/colour control. Old `buttons[]` array still in schema for legacy migration. |
| `sgs/testimonial-slider` | CSS scroll-snap carousel with autoplay, dots, arrows, star ratings. Split layout (60/40 grid with side image). |
| `sgs/testimonial` | Individual testimonial card (used inside testimonial-slider) |
| `sgs/brand-strip` | Infinite-scroll logo carousel, greyscale + hover reveal |
| `sgs/accordion` + `sgs/accordion-item` | FAQ accordion using native `<details>`, FAQ Schema, Interactivity API |
| `sgs/counter` | Animated number counter with IntersectionObserver |
| `sgs/trust-bar` | Trust badges strip |
| `sgs/certification-bar` | Certification logos strip |
| `sgs/icon-list` | Icon + text list items |
| `sgs/notice-banner` | Alert/notice bar |
| `sgs/process-steps` | Numbered process/steps block |
| `sgs/responsive-logo` | Two-image logo (desktop + mobile) with CSS media query switching |
| `sgs/table-of-contents` | Auto-generates ToC from headings, scroll spy (currently broken) |
| `sgs/whatsapp-cta` | Floating/inline WhatsApp CTA with Interactivity API |

### Utility blocks
| Block | Key capability |
|---|---|
| `sgs/business-info` | Dynamic block rendering business details from Settings > Business Details. 8 types: phone, email, address, hours, socials, copyright, description, map |

### Phase 2 (Complete — 2026-02-26)
| Block | Key capability |
|---|---|
| `sgs/post-grid` | Grid/list/masonry layouts, AJAX pagination + category filtering, vanilla ES module |
| `sgs/gallery` | Image gallery with grid/masonry layouts + Interactivity API lightbox |
| `sgs/tabs` | Horizontal/vertical tabs, InnerBlocks per tab, full ARIA (tablist/tab/tabpanel) |
| `sgs/countdown-timer` | Date-based + evergreen, flip/simple variants |
| `sgs/star-rating` | SVG stars, Schema.org/Rating |
| `sgs/team-member` | Photo/name/role/bio/socials, Schema.org/Person |

### Interactive blocks
| Block | Key capability |
|---|---|
| `sgs/mega-menu` | Desktop mega-menu with template part panels, Interactivity API triggers |
| `sgs/mobile-nav` | Popover API mobile drawer with accordion submenus, spring animation, swipe-to-close. Server-renders nav from header template part via `SGS_Mobile_Nav_Renderer`. 4 variants (overlay, slide-left, slide-right, bottom-sheet). |

### Form blocks (14 blocks)
| Block | Notes |
|---|---|
| `sgs/form` | Form container with multi-step support, REST API submission, DB storage |
| `sgs/form-step` | Individual form step |
| `sgs/form-field-*` | Text, email, phone, textarea, checkbox, radio, select, tiles, file, consent |
| `sgs/form-review` | Review step (show entered values before submit) |

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
        │
        ▼
Client interacts (slider, accordion, form, nav) → Interactivity API store manages state
```

For forms specifically:
```
Form submission (Interactivity API) → REST endpoint (sgs_submit_form)
        │
        ▼
Server validates + sanitises input → stores in custom DB table
        │
        ▼
N8N webhook triggered → notification sent (email/Slack/WhatsApp)
```

## Current Development Focus

**Phase 3 — Extensions + Polish (largely complete) → Phase 4 Indus Foods build (next)**

### 2026-04-28 session deliverables

1. **Phase 3.2 Global Defaults System** — `Block_Defaults` class + REST endpoint + admin page + editor injection. Live on production.
2. **Hover variant gap closure** — added universal `border-accent` (line slides in on hover), `tilt-3d` (mouse-tracking 3D rotation), `sgsScrollProgress` CSS variable, `overlay-slide` named variant on Card Grid + Gallery. Total interactive options: 33/36 spec'd.
3. **Animation extension** — `bounce-in` and `reveal-up` added (was 14, now **16 types** — exceeds spec target of 15).
4. **Palette additions** — new `border-light` (#E5E7EB) and `error` (#DC2626) slugs in theme.json + all 7 style variations to consolidate previously-duplicated bare hex values.
5. **Floating UI architecture** decided — Back to Top + Reading Progress will be Customiser-controlled (`Appearance → Customise → SGS Floating UI`), not blocks. Live-preview controls. Reading Progress block files repurposed; Back to Top block deprecated to no-op.
6. **8 quality fixes** — form input box-sizing overflow, floating-label/placeholder overlap, Footer social icons style variation (matches lightsalmon reference), Google Reviews dummy fallback, Icon Block content-width + visible bg, Breadcrumbs contrast, populated all empty test page blocks, Pricing Table `toggleStyle` attribute (text/button).
7. **Address lookup research** — `getAddress.io` selected for future `sgs/form-field-address` block (£20/yr 7,500 lookups, 20/day free, UK PAF data).

### Lessons captured to memory

- **Parallel agents on shared files cause race conditions** — both `border-accent` and `tilt-3d` branches edited `hover-effects.js` + `hover-effects.php`; resulting orphan `}` on line 238 took the live site down. Sequentialise any branches that touch the same file.
- **Gemini Flash on Windows can't run shell commands** — `npm run build`, `git status` etc all fail with "File not found". Don't include build steps in Gemini Flash prompts — run those manually.
- **WP REST routes can't contain forward slashes in route parameters** — e.g. `/defaults/sgs/counter` won't match `/defaults/(?P<block>[a-z0-9\-\/]+)`. Pass dynamic IDs via request body instead.
- **Hostinger error logs live at `~/.logs/error_log_<domain>`**, not `wp-content/debug.log` (often stale).
- **Block colour defaults must reference palette tokens**, never bare hex — clients switch style variations and blocks need to follow.

### Framework complete — 2026-04-29

Phase 0–5 shipped. Final extensions: animation, responsive-visibility, hover-effects, custom-spacing, custom-css, block-defaults, conditional-visibility, parallax (9 total). QC harness passed 10/12 deterministic checks (2 failures are test-page content gaps, not framework bugs — `data-sgs-animation` selector mismatch and no FAQPage block on test page). Zero PHP errors, zero JS runtime errors at 375/768/1440px. Completion plan archived to `docs/plans/archive/`.

The master feature audit (`docs/plans/2026-02-21-master-feature-audit.md`) tracks 354 features across the framework.

## Known Technical Debt

| Item | Severity | Notes |
|---|---|---|
| ~~Colour regex too narrow~~ | ~~High~~ | Fixed in Session 19 — colour var detection now handles `oklch`, `hsl`, and all CSS colour formats. |
| Colour/font-size helpers duplicated 4x | Medium | `info-box`, `hero`, `cta-section`, `testimonial-slider` all define the same closure. Extract to `includes/render-helpers.php`. |
| `navigation ref="4"` in header.html | High | DB post ID specific to dev site. Will render no nav on any other install. Remove `ref` attribute. |
| Table of Contents broken | Medium | Root cause unknown since session 12. Regex heading detection may miss nested blocks. |
| Accordion never browser-tested | Medium | Progressive enhancement also broken (`e.preventDefault()` at view.js:56 disables native `<details>`). |
| Forms never end-to-end tested | High | REST endpoints built, submission never verified. |
| ~~Testimonial slider ARIA incomplete~~ | ~~Medium~~ | Fixed in Session 10 — dots have `aria-controls`, slides have `role="group"` + `aria-roledescription="slide"`. |
| `lucide-react` unused devDependency | Low | Adds ~1MB to node_modules. Remove from package.json. |
| No `prestart` hook | Low | `npm start` on fresh clone won't have `lucide-icons.php`. |
| DesignTokenPicker hex vs slug | Medium | Untested — `ColorPalette` returns hex but `colourVar()` expects slug. May cause colour breakage. |
| Font preload duplication | Low | `functions.php` manually preloads Inter; WP 6.9 may also preload from theme.json `fontFace`. |
| `lucide-icons.php` no exemption comment | Low | 1,963 lines, exceeds 300-line limit. Add auto-generated exemption comment. |
| No `.gitattributes` file | Low | LF/CRLF warnings on every commit. Needs `* text=auto` and binary file rules. |

## External Dependencies

| Service | Purpose | Notes |
|---|---|---|
| Hostinger | Web hosting | Shared hosting, `ssh hd` alias configured |
| LiteSpeed Cache | Server-side caching | `rm -rf` cache directory after every deploy (WP-CLI command broken) |
| N8N (72.62.212.169) | Notifications | All form/booking notifications via webhook, not `wp_mail()` |
| Stripe | Payments | Booking + forms Phase 2+ |
| Google Calendar | Booking sync | Phase 5, not yet implemented |
| ACF Pro | Custom fields | Legacy — usage decreasing, no new usage |
| Rank Math Free | SEO | No plans to replace |
| Playwright v1.58.2 | Visual testing | Globally installed on dev machine, Chromium ready |

## Deployment

**Dev site (all changes go here):** `https://palestine-lives.org`
**Client test site (READ ONLY):** `https://lightsalmon-tarsier-683012.hostingersite.com`

```bash
# 1. Build blocks plugin
cd plugins/sgs-blocks && npm run build

# 2. Deploy via tar (scp -r creates nested dirs on Hostinger — always use tar)
cd /path/to/small-giants-wp
tar -cf sgs-deploy.tar --exclude='node_modules' --exclude='.git' --exclude='plugins/sgs-blocks/src' theme/sgs-theme plugins/sgs-blocks
scp -P 65002 sgs-deploy.tar u945238940@141.136.39.73:sgs-deploy.tar
ssh -p 65002 u945238940@141.136.39.73 'WP=domains/palestine-lives.org/public_html/wp-content && rm -rf $WP/themes/sgs-theme $WP/plugins/sgs-blocks && tar -xf sgs-deploy.tar && mv theme/sgs-theme $WP/themes/ && mv plugins/sgs-blocks $WP/plugins/ && rm -rf theme plugins sgs-deploy.tar'
rm sgs-deploy.tar

# 3. Reset OPcache + clear LiteSpeed (both page cache AND CSS optimiser)
ssh -p 65002 u945238940@141.136.39.73 "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php" && curl -s https://palestine-lives.org/op-reset-tmp.php && ssh -p 65002 u945238940@141.136.39.73 "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php && rm -rf ~/domains/palestine-lives.org/public_html/wp-content/litespeed/cache/* ~/domains/palestine-lives.org/public_html/wp-content/litespeed/css/*.css"
```

Run all commands from `C:\Users\Bean\Projects\small-giants-wp` (repo root).

**Environment:** Windows 11, Git Bash, Node.js v22.18.0, no Node.js on server. Build locally, deploy compiled `build/` output only.

## Framework Maturity

The master feature audit at `docs/plans/2026-02-21-master-feature-audit.md` tracks 354 features across 13 domains (core blocks, extensions, theme, typography, hover/interactions, scroll animations, accessibility, performance, SEO/schema, forms, patterns, dark mode, S-tier differentiators). The percentage scores in that document are a 2026-02-26 snapshot — directional, not current. Framework v1 shipped 2026-04-29 (Phases 0–5 complete). Refresh the audit before quoting any percentage.

---

## Part B — Master feature audit (354-feature graded roadmap)

*Source: `docs/2026-02-21-master-feature-audit.md`. Completion tracking is authoritative; new-feature additions may lag — refresh via `/sgs-update`.*

> **Date:** 2026-02-21
> **Last verified:** 2026-04-28 (full visual + harness + Gemini Pro audit pass)
> **Scope:** Every feature the SGS WordPress Framework could offer — theme, blocks, plugins, interactions, accessibility, performance.
> **Sources:** 6 parallel research agents auditing Webflow, Framer, Elementor, Kadence, Spectra, GenerateBlocks, Squarespace, Wix, Breakdance, Bricks, PostX, and cutting-edge CSS/JS specs.

## 2026-04-28 STATUS UPDATE — Library Aesthetic Grade: A- (Gemini Pro vision audit)

This session closed out the bulk of P0/P1 outstanding items, all 17 "Code Exists But Unverified" features, all 13 "Failed Verification" items, and all 9 "Additional Issues Found" items. Verified by:

- **Gemini Pro 2.5 vision audit** — A- overall library grade (was C+ at session start). Six previously-flagged blocks all now A or A-: Post Grid, Testimonial, Star Rating, Pricing Table, Certification Bar, Tabs (mobile).
- **Deterministic verification harness** — 12/12 pass on live site (zero JS console errors, all P0 bug fixes verified, all 5 schema types live, form input custom styling, designed empty states).
- **WP block validation** — 0 invalid blocks across 96 on test page (deprecations correctly migrating old content).
- **Hex tokenisation pass** — ~80 bare hex values → 6 acceptable exceptions (LinkedIn/Facebook/Google/Twitter brand colours + 2 regex matchers). theme.json locked palette-only.

Schema markup live on test page: Organization, LocalBusiness, BreadcrumbList, FAQPage (with Question/Answer entries), Review, Product, AggregateRating, Rating, Person.

**Verified count (2026-04-28):** ~85% code-confirmed for blocks/extensions/schema. Phase 0/1/2 complete. Phase 3 partial (3.2 Global Defaults outstanding). Phase 4 Indus Foods build pending.

See `docs/plans/2026-02-21-framework-completion-plan.md` for the up-to-date phase tracker.

---

## Grading System

| Grade | Impact (1-5) | Meaning |
|-------|-------------|---------|
| 5 | Critical | Every client needs it, competitors all have it |
| 4 | Important | Strong differentiator, most clients want it |
| 3 | Valuable | Enhances the experience noticeably |
| 2 | Niche | Some clients want it, not universal |
| 1 | Edge case | Experimental or very specialised |

| Grade | Difficulty (1-5) | Meaning |
|-------|------------------|---------|
| 1 | Trivial | CSS-only or simple attribute, < 1 hour |
| 2 | Easy | Simple JS or PHP, < 4 hours |
| 3 | Medium | Multiple files, 1-2 days |
| 4 | Hard | Complex architecture, 3-5 days |
| 5 | Very hard | Major feature, 1+ weeks |

| Priority | Phase | Meaning |
|----------|-------|---------|
| P0 | Done | Already built or in progress |
| P1 | Phase 2-3 | Must have for framework launch |
| P2 | Phase 4-5 | Should have before first client |
| P3 | Post-launch | Nice to have, builds competitive edge |
| P4 | Future | Watch list, experimental, or low ROI |

| Component | Abbreviation |
|-----------|-------------|
| SGS Theme | **Theme** |
| SGS Blocks Plugin | **Blocks** |
| Block Extension (all blocks) | **Ext** |
| Form Blocks | **Forms** |
| SGS Booking | **Booking** |
| SGS Popups (planned) | **Popups** |
| SGS Chatbot (planned) | **Chatbot** |
| SGS Client Notes (planned) | **Notes** |
| Cross-component | **Framework** |

---

## 1. LAYOUT & STRUCTURE

### 1.1 Grid / Column System

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 1 | Responsive columns per breakpoint (desktop/tablet/mobile) | 5 | 2 | P0 | Blocks | Done in Container, Card Grid, hero |
| 2 | Column gap per breakpoint | 5 | 2 | P1 | Blocks | Needs consistent implementation |
| 3 | Row gap per breakpoint | 5 | 2 | P1 | Blocks | Needs consistent implementation |
| 4 | Column ordering / reorder on mobile | 4 | 2 | P2 | Blocks | CSS `order` property per breakpoint |
| 5 | Column spanning (grid-column: span) | 3 | 2 | P2 | Blocks | For asymmetric layouts |
| 6 | Nested grids | 4 | 2 | P0 | Blocks | Container + InnerBlocks |
| 7 | Auto-fill / auto-fit grid | 3 | 1 | P2 | Blocks | CSS Grid `repeat(auto-fit, minmax())` |
| 8 | CSS Subgrid | 3 | 2 | P3 | Blocks | Cross-card alignment; 85% browser support |
| 9 | Asymmetric grid presets (2/3+1/3, etc.) | 4 | 2 | P1 | Blocks | Column layout picker in Container |
| 10 | Named grid areas | 2 | 3 | P4 | Blocks | Advanced; low demand |
| 11 | Bento grid layout | 3 | 3 | P3 | Blocks | Mixed cell sizes; trending |

### 1.2 Container / Section Features

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 12 | Max-width / boxed / full-width toggle | 5 | 1 | P0 | Theme | Done via theme.json layout |
| 13 | Inner content width control | 4 | 1 | P0 | Theme | contentSize / wideSize |
| 14 | Background colour | 5 | 1 | P0 | Blocks | Native supports.color |
| 15 | Background gradient (linear, radial) | 4 | 1 | P0 | Blocks | Native supports.color.gradients |
| 16 | Background image with position/size/repeat | 4 | 3 | P2 | Blocks | Custom attribute + controls |
| 17 | Background video (autoplay, loop, muted) | 3 | 3 | P3 | Blocks | HTML5 video; medium demand |
| 18 | Background overlay with opacity | 4 | 2 | P1 | Blocks | Pseudo-element + controls |
| 19 | Background overlay blend modes | 3 | 1 | P2 | Blocks | CSS mix-blend-mode |
| 20 | Shape dividers (top/bottom SVG) | 4 | 3 | P2 | Blocks | SVG library + controls; Elementor has 18 |
| 21 | Border per side | 4 | 1 | P0 | Blocks | Native __experimentalBorder |
| 22 | Border radius per corner | 4 | 1 | P0 | Blocks | Native __experimentalBorder |
| 23 | Box shadow | 4 | 1 | P0 | Theme | theme.json shadow presets |
| 24 | Min-height / custom height | 4 | 2 | P1 | Blocks | Per-breakpoint; Hero needs this |
| 25 | Vertical/horizontal alignment | 5 | 1 | P0 | Blocks | Flexbox alignment controls |
| 26 | Overflow control | 3 | 1 | P2 | Ext | Extension attribute |

### 1.3 Spacing System

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 27 | Margin per side | 5 | 1 | P0 | Blocks | Native supports.spacing.margin |
| 28 | Padding per side | 5 | 1 | P0 | Blocks | Native supports.spacing.padding |
| 29 | Responsive spacing per breakpoint | 5 | 3 | P1 | Blocks | Requires ResponsiveControl on all blocks |
| 30 | Negative margins | 3 | 1 | P3 | Blocks | CSS native; overlapping elements |
| 31 | Fluid spacing (clamp) | 4 | 1 | P0 | Theme | theme.json fluid spacing |
| 32 | Linked/unlinked spacing toggle | 4 | 2 | P1 | Blocks | UI component for all spacing controls |
| 33 | Block gap (CSS gap) | 5 | 1 | P0 | Theme | theme.json spacing.blockGap |
| 34 | Responsive gap per breakpoint | 4 | 2 | P1 | Blocks | Per-block attribute |

### 1.4 Responsive Features

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 35 | Device visibility (show/hide per breakpoint) | 5 | 2 | P0 | Ext | Done in Phase 1.1 |
| 36 | Fluid typography (clamp) | 5 | 1 | P0 | Theme | theme.json typography.fluid |
| 37 | Per-breakpoint font size | 5 | 2 | P1 | Blocks | ResponsiveControl needed |
| 38 | Responsive images (srcset/sizes) | 5 | 1 | P0 | Framework | WordPress core automatic |
| 39 | Container queries | 3 | 2 | P3 | Blocks | 93% support; blocks adapt to container |
| 40 | Custom breakpoints | 2 | 3 | P4 | Theme | Low demand; 3 breakpoints sufficient |
| 41 | Art direction (different crops per breakpoint) | 2 | 4 | P4 | Blocks | Requires `<picture>` element |

### 1.5 Positioning

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 42 | Sticky elements (position: sticky) | 4 | 2 | P2 | Ext | Extension for any block |
| 43 | Sticky header | 5 | 2 | P0 | Theme | CSS on header template part |
| 44 | Z-index control | 3 | 1 | P3 | Ext | Extension attribute |
| 45 | Absolute positioning within container | 3 | 3 | P3 | Blocks | Decorative overlapping elements |

### 1.6 Advanced Layouts

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 46 | Masonry grid | 4 | 2 | P1 | Blocks | ✓ Done — git: `feat(blocks+a11y): masonry, min-height...`. Gallery + Post Grid both support masonry layout. |
| 47 | Horizontal scroll sections | 3 | 4 | P3 | Blocks | GSAP ScrollTrigger or CSS scroll-snap |
| 48 | Full-screen sections (100vh) | 4 | 1 | P1 | Blocks | ✓ Done — git: `feat(blocks+a11y): masonry, min-height...`. Min-height control on Container/Hero blocks. |
| 49 | Infinite/marquee scroll | 3 | 2 | P2 | Blocks | CSS animation; for logo bars |
| 50 | Scroll-snap sections | 3 | 2 | P3 | Blocks | Full-page snap scrolling |

### 1.7 Backgrounds

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 51 | Conic gradient | 2 | 1 | P3 | Blocks | CSS native; niche |
| 52 | Background pattern/texture | 3 | 2 | P3 | Blocks | SVG patterns; decorative |
| 53 | Noise/grain texture | 2 | 2 | P4 | Blocks | SVG feTurbulence; trendy |
| 54 | Animated gradient backgrounds | 3 | 1 | P3 | Blocks | CSS keyframes; eye-catching |
| 55 | Multiple stacked backgrounds | 3 | 2 | P3 | Blocks | CSS native; image + gradient + pattern |
| 56 | Parallax background (CSS) | 3 | 1 | P2 | Blocks | background-attachment: fixed |
| 57 | True parallax (JS-driven) | 3 | 3 | P3 | Blocks | GSAP; risky on mobile |

### 1.8 Dividers / Separators

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 58 | Horizontal rule variants | 3 | 1 | P2 | Theme | Styled core separator |
| 59 | SVG shape dividers (waves, angles, curves) | 4 | 3 | P2 | Blocks | Library of 15-20 SVG shapes |
| 60 | Custom SVG divider upload | 2 | 2 | P3 | Blocks | File upload + position control |
| 61 | Flip/invert dividers | 3 | 1 | P2 | Blocks | CSS transform: scaleX(-1) |
| 62 | Top + bottom independent dividers | 3 | 2 | P2 | Blocks | Separate controls per edge |

---

## 2. BLOCKS — MISSING (Phase 2)

| # | Block | Impact | Diff | Priority | Status | Notes |
|---|-------|--------|------|----------|--------|-------|
| 63 | Post Grid / Query Loop | 5 | 5 | P1 | ✓ Done | Grid/list/masonry/carousel + AJAX pagination; REST endpoint; verified live |
| 64 | Image Gallery + Lightbox | 5 | 4 | P1 | ✓ Done | Grid/masonry/carousel + Interactivity API lightbox; verified live |
| 65 | Tabs | 5 | 3 | P1 | ✓ Done | Horizontal/vertical, InnerBlocks, ARIA; verified live |
| 66 | Countdown Timer | 4 | 3 | P1 | ✓ Done | Date-based + evergreen; flip/simple variants; verified live |
| 67 | Star Rating | 3 | 2 | P1 | ✓ Done | SVG stars; Schema.org/Rating; verified live |
| 68 | Team Member | 4 | 2 | P1 | ✓ Done | Photo/name/role/bio/socials; Schema.org/Person; verified live |
| 69 | Table of Contents | 4 | 3 | P2 | ✓ Done | Auto-scan headings, scroll spy, collapsible. `table-of-contents/block.json` confirmed. Code-confirmed 2026-04-18. |
| 70 | Pricing Table | 4 | 3 | P2 | ✓ Done | 2-4 tiers, monthly/yearly toggle. `pricing-table/block.json` confirmed. Code-confirmed 2026-04-18. |
| 71 | Before/After Image Slider | 4 | 3 | P2 | ○ Not started | Drag comparison; 137 Kadence votes unresolved. No code found. |
| 72 | Icon Block | 3 | 2 | P2 | ✓ Done | Single icon with link; Lucide library. `icon-block/block.json` confirmed. Code-confirmed 2026-04-18. |
| 73 | Progress Bar | 3 | 2 | P2 | ○ Not started | Horizontal/circular; animated on scroll. No code found. |
| 74 | Flip Box | 3 | 2 | P3 | ○ Not started | Front/back card flip on hover. No code found. |
| 75 | Timeline | 4 | 3 | P2 | ○ Not started | Vertical/horizontal; scroll reveal; 278 Kadence votes (their #1 request). No code found. |
| 76 | Video Popup/Lightbox | 3 | 3 | P3 | ○ Not started | Thumbnail + play button opens lightbox. No code found. |
| 77 | Logo Carousel / Marquee | 4 | 2 | P2 | ○ Not started | Infinite scroll; for trust bars. Note: `brand-strip` covers logo display but not infinite marquee carousel. |
| 78 | Map / Google Maps | 3 | 2 | P2 | ○ Not started | Styled embed with marker. No code found. Note: `google-reviews` block exists (different feature). |
| 79 | Social Icons | 3 | 1 | P2 | ✓ Done | Brand icons with links. `social-icons/block.json` confirmed. Code-confirmed 2026-04-18. |
| 80 | Breadcrumbs | 3 | 2 | P2 | ✓ Done | Schema.org/BreadcrumbList. `breadcrumbs/block.json` confirmed. Code-confirmed 2026-04-18. |
| 81 | Reading Progress Bar | 3 | 2 | P3 | ○ Not started | Scroll-driven; CSS-only possible. No code found. |
| 82 | Back to Top Button | 3 | 1 | P2 | ✓ Done | Scroll-triggered fade-in. `back-to-top/block.json` confirmed. Code-confirmed 2026-04-18. |
| 83 | Lottie Animation | 2 | 3 | P4 | ○ Not started | JSON animation player. No code found. |
| 84 | Data Table | 3 | 3 | P3 | ○ Not started | Responsive (scroll/stack); sortable. No code found. |

---

## 3. BLOCK EXTENSIONS (Apply to All Blocks)

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 85 | Device visibility toggles | 5 | 2 | P0 | Ext | ✓ Done — `responsive-visibility.js` universal extension confirmed. |
| 86 | Per-element hover controls (bg/text/border colour) | 5 | 2 | P0 | Ext | ✓ Done — `hover-effects.js` universal extension; was 4-block-only Feb 2026, now all blocks. |
| 87 | Hover scale transform | 4 | 1 | P1 | Ext | ✓ Done — `hover-effects.js`. git: `feat(extensions): hover effects, micro-interactions, and block link`. |
| 88 | Hover shadow change (elevation) | 4 | 1 | P1 | Ext | ✓ Done — `hover-effects.js` confirmed. |
| 89 | Hover border glow | 3 | 1 | P2 | Ext | ○ Not confirmed — no evidence in hover-effects.js. |
| 90 | Hover image zoom (inner) | 4 | 1 | P1 | Ext | ✓ Done — git: `feat(extensions): image zoom, grayscale, block link`. |
| 91 | Transition duration/easing control | 4 | 1 | P1 | Ext | ✓ Done — `hover-effects.js` and `custom-spacing.js` confirmed. |
| 92 | Scroll animation (fade in up/down/left/right) | 5 | 2 | P0 | Ext | ✓ Done — `animation.js`; 15 types on ALL blocks. git: `feat: animation extension on all blocks`. |
| 93 | Scroll animation stagger delay | 4 | 1 | P1 | Ext | ✓ Done — `animation.js` includes stagger. git: session 11-12 animation rebuild. |
| 94 | Custom CSS per block | 4 | 3 | P2 | Ext | ✓ Done — `custom-css.js` extension confirmed. |
| 95 | Custom HTML attributes (data-*, aria-*) | 3 | 2 | P3 | Ext | ○ Not confirmed — no evidence in extensions directory. |
| 96 | Block link (wrap entire block in link) | 4 | 2 | P1 | Ext | ✓ Done — git: `feat(extensions): image zoom, grayscale, block link`. |
| 97 | Copy/paste styles | 4 | 3 | P2 | Ext | ○ Not confirmed — no evidence. |
| 98 | Save as default | 4 | 3 | P2 | Ext | ✓ Done — `block-defaults.js` extension confirmed. |
| 99 | Block style variations (register_block_style) | 4 | 2 | P1 | Framework | ◐ Partial — framework supports it; no per-block style variations confirmed 2026-04-18. |
| 100 | Conditional display (user role/schedule/URL param) | 4 | 3 | P2 | Ext | ○ Not started — device visibility only; role/schedule not implemented. |

---

## 4. HOVER EFFECTS & MICRO-INTERACTIONS

### 4.1 Card/Block Hover Effects

| # | Feature | Impact | Diff | Priority | CSS-only? | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 101 | Scale transform | 4 | 1 | P1 | Yes | GPU-composited; safe |
| 102 | Shadow elevation shift | 4 | 1 | P1 | Yes | Paint-only; safe |
| 103 | Colour shift (background) | 4 | 1 | P0 | Yes | Done in Phase 1.3 |
| 104 | Image zoom (inner) | 4 | 1 | P1 | Yes | overflow:hidden + scale |
| 105 | Card flip (front/back) | 3 | 2 | P3 | Yes | 3D transform; Flip Box block |
| 106 | Reveal overlay (text over image) | 4 | 1 | P1 | Yes | opacity + transform; gallery |
| 107 | Slide-up content | 3 | 1 | P2 | Yes | translateY on child |
| 108 | Gradient shift | 2 | 1 | P3 | Yes | background-position animation |
| 109 | Card tilt (3D perspective) | 2 | 3 | P4 | No (JS) | mousemove tracking; niche |
| 110 | Magnetic cursor attraction | 2 | 3 | P4 | No (JS) | mousemove; creative sites only |
| 111 | Glassmorphism (backdrop-filter) | 3 | 1 | P3 | Yes | Frosted glass; 97% support |
| 112 | Border glow / neon | 3 | 1 | P2 | Yes | box-shadow with colour |
| 113 | Parallax depth on hover | 2 | 3 | P4 | No (JS) | Multi-layer; niche |
| 114 | Skeleton shimmer (loading) | 3 | 2 | P3 | Yes | For Post Grid loading state |

### 4.2 Text/Link Hover Effects

| # | Feature | Impact | Diff | Priority | CSS-only? | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 115 | Underline slide-in (left/centre) | 4 | 1 | P1 | Yes | ✓ Done — git: `feat(extensions): image zoom, grayscale, block link, button fill, underline slide`. |
| 116 | Underline colour change | 3 | 1 | P2 | Yes | text-decoration-color |
| 117 | Text shadow on hover | 2 | 1 | P3 | Yes | Subtle glow effect |
| 118 | Text gradient reveal | 2 | 1 | P3 | Yes | background-clip: text |
| 119 | Highlight/marker effect | 3 | 1 | P2 | Yes | Background on lower portion |
| 120 | Text colour sweep | 2 | 2 | P3 | Yes | Clip-path on duplicate text |
| 121 | Split text / stagger animation | 3 | 3 | P3 | No (JS) | GSAP SplitText; headings only |

### 4.3 Button/CTA Hover Effects

| # | Feature | Impact | Diff | Priority | CSS-only? | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 122 | Fill animation (left-to-right) | 4 | 1 | P1 | Yes | ✓ Done — git: `feat(extensions): image zoom, grayscale, block link, button fill, underline slide`. |
| 123 | Fill animation (bottom-to-top) | 3 | 1 | P2 | Yes | ::before scaleY |
| 124 | Ripple effect (Material) | 3 | 2 | P2 | CSS/JS | Centre: CSS; click-position: JS |
| 125 | Icon slide (arrow extends) | 4 | 1 | P1 | Yes | translateX on icon |
| 126 | Border draw-in animation | 2 | 2 | P3 | Yes | Pseudo-elements |
| 127 | Pulse glow | 2 | 1 | P3 | Yes | box-shadow keyframes |
| 128 | 3D press / depth button | 3 | 1 | P2 | Yes | :active translateY |

### 4.4 Image Hover Effects

| # | Feature | Impact | Diff | Priority | CSS-only? | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 129 | Ken Burns (slow zoom + pan) | 3 | 1 | P2 | Yes | keyframes; for hero |
| 130 | Colour-to-grayscale (or reverse) | 4 | 1 | P1 | Yes | ✓ Done — git: `feat(extensions): image zoom, grayscale, block link...`. |
| 131 | Blur-to-sharp | 2 | 1 | P3 | Yes | filter: blur() transition |
| 132 | Overlay with text | 4 | 1 | P1 | Yes | ✓ Done — git: `feat: gallery caption reveal on hover + tabs sliding indicator`. |
| 133 | Duotone / hue shift | 3 | 1 | P2 | Yes | CSS filters combo |
| 134 | Clip-path reveal | 2 | 1 | P3 | Yes | clip-path: circle() |

### 4.5 Scroll Animations

| # | Feature | Impact | Diff | Priority | CSS-only? | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 135 | Fade in (up/down/left/right) | 5 | 2 | P0 | CSS/JS | Done: 15 animation types |
| 136 | Parallax scrolling | 3 | 2 | P2 | CSS/JS | CSS basic; JS for advanced |
| 137 | Counter animation (number count-up) | 4 | 2 | P1 | CSS/JS | ✓ Done — Counter block with IntersectionObserver count-up. Block confirmed in codebase. |
| 138 | Scroll progress bar | 3 | 1 | P2 | Yes | ○ Not started — no reading-progress block in codebase. |
| 139 | Staggered grid entry | 4 | 1 | P1 | Yes | ✓ Done — `animation.js` extension includes stagger-delay per item. |
| 140 | Text reveal on scroll (word by word) | 3 | 3 | P3 | No (JS) | SplitText; headings only |
| 141 | Zoom on scroll | 2 | 1 | P3 | Yes | CSS scroll-driven |
| 142 | Horizontal scroll conversion | 2 | 4 | P4 | No (JS) | GSAP ScrollTrigger pin |

### 4.6 Loading & Transition Effects

| # | Feature | Impact | Diff | Priority | CSS-only? | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 143 | Skeleton screens | 3 | 2 | P2 | Yes | For Post Grid, dynamic content |
| 144 | Blur-up image loading (LQIP) | 3 | 3 | P3 | No (JS) | Tiny placeholder + fade |
| 145 | Page transitions (View Transitions API) | 3 | 3 | P3 | CSS/JS | 87% support; progressive |
| 146 | Staggered grid population | 4 | 1 | P1 | Yes | Same as #139 |

### 4.7 Micro-Interactions

| # | Feature | Impact | Diff | Priority | CSS-only? | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 147 | Toggle switch animation | 3 | 1 | P2 | Yes | Styled checkbox; for pricing |
| 148 | Form field focus effects (floating label) | 4 | 1 | P1 | Yes | ✓ Done — git: `feat(schema+typography): structured data, letter-spacing, text-transform, floating labels`. |
| 149 | Toast notifications | 4 | 2 | P2 | No (JS) | For form submissions |
| 150 | Accordion smooth expand/collapse | 4 | 2 | P0 | CSS/JS | Done: details/summary animation |
| 151 | Tab sliding indicator | 3 | 2 | P1 | CSS/JS | ✓ Done — git: `feat: gallery caption reveal on hover + tabs sliding indicator`. |
| 152 | Scroll-to-top button reveal | 3 | 1 | P2 | CSS/JS | IntersectionObserver or scroll-driven |
| 153 | Like/heart animation | 2 | 2 | P4 | CSS/JS | Scale + colour burst |
| 154 | Success confetti | 2 | 3 | P4 | No (JS) | After form submit; fun but niche |

---

## 5. TYPOGRAPHY & TEXT

### 5.1 Font Controls Per Element

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 155 | Font family (body + headings) | 5 | 1 | P0 | Theme | Done: theme.json fontFamilies |
| 156 | Font size (static) | 5 | 1 | P0 | Blocks | Native supports.typography |
| 157 | Font size responsive per breakpoint | 5 | 2 | P1 | Blocks | ◐ Partial — git: `feat: responsive controls for gap, font sizes across 7 blocks`. 7 blocks done, not universal. |
| 158 | Font weight | 5 | 1 | P0 | Blocks | Native supports.typography |
| 159 | Line height | 5 | 1 | P0 | Blocks | Native supports.typography |
| 160 | Letter spacing | 4 | 1 | P1 | Blocks | ✓ Done — git: `feat(schema+typography): structured data, letter-spacing, text-transform, floating labels`. |
| 161 | Text transform (uppercase/lowercase/capitalise) | 4 | 1 | P1 | Blocks | ✓ Done — git: `feat(schema+typography): structured data, letter-spacing, text-transform, floating labels`. |
| 162 | Text decoration (underline/strikethrough styles) | 3 | 1 | P2 | Blocks | CSS text-decoration shorthand |
| 163 | Text alignment per breakpoint | 5 | 2 | P1 | Blocks | ResponsiveControl + textAlign |
| 164 | Variable font axes (weight/width/slant continuous) | 2 | 2 | P4 | Theme | Inter variable already used; UI uncommon |
| 165 | Custom font upload (WOFF2) | 4 | 2 | P0 | Theme | Done: self-hosted Inter |

### 5.2 Text Effects

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 166 | Text gradient fill | 3 | 1 | P2 | Blocks | background-clip: text |
| 167 | Text stroke / outline | 3 | 1 | P2 | Blocks | -webkit-text-stroke |
| 168 | Text shadow (multiple layers) | 3 | 1 | P2 | Blocks | Custom text-shadow control |
| 169 | Knockout text (image fill) | 2 | 2 | P3 | Blocks | background-clip: text + image |
| 170 | Animated text (typing/rotating words) | 3 | 3 | P3 | Blocks | JS required; heading block enhancement |
| 171 | Dual-colour heading | 4 | 2 | P2 | Blocks | Span-based; colour picker per segment |
| 172 | Drop cap | 3 | 1 | P2 | Theme | CSS initial-letter; Chrome 110+ |
| 173 | Marquee / ticker text | 3 | 2 | P2 | Blocks | CSS animation translateX |
| 174 | Highlighted / marked text (marker effect) | 3 | 1 | P2 | Blocks | Background on inline span |
| 175 | Text wrap: balance (headings) | 4 | 1 | P1 | Theme | ✓ Done — git: `feat(css): P1 CSS-only enhancements - balance, contrast, validation, animations`. |
| 176 | Text wrap: pretty (body) | 3 | 1 | P2 | Theme | Chrome/Safari; progressive |

### 5.3 Heading Features

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 177 | Auto-generated anchor IDs | 4 | 2 | P0 | Blocks | Done: heading-anchors.php |
| 178 | Table of Contents (auto-scan headings) | 4 | 3 | P2 | Blocks | Block #69 above |
| 179 | Decorative heading separators (lines, dots, icons) | 3 | 2 | P2 | Blocks | ::before/::after + CSS |
| 180 | Numbered headings (CSS counters) | 2 | 1 | P3 | Theme | CSS counter-increment |
| 181 | Split-colour / dual-colour headings | 4 | 2 | P2 | Blocks | Same as #171 |

### 5.4 Rich Text & Content Features

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 182 | Inline code styling | 3 | 1 | P2 | Theme | CSS on `<code>` element |
| 183 | Blockquote variants (border, icon, pull quote) | 3 | 2 | P2 | Theme | Styled core Quote block |
| 184 | Footnotes | 3 | 1 | P0 | Framework | WordPress core (WP 6.3+) |
| 185 | Tooltips on hover | 3 | 2 | P2 | Blocks | CSS Anchor Positioning or JS |
| 186 | Reading time calculation | 3 | 1 | P2 | Blocks | PHP word count / 200 wpm |
| 187 | Text columns (CSS multi-column) | 2 | 1 | P3 | Blocks | column-count on Container |
| 188 | Custom text selection colour | 2 | 1 | P3 | Theme | CSS ::selection |

### 5.5 List Features

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 189 | Custom bullet icons (SVG/emoji) | 4 | 2 | P0 | Blocks | Done: Icon List block |
| 190 | Per-item custom icon + colour | 4 | 2 | P0 | Blocks | Done: Icon List block |
| 191 | Timeline list layout | 3 | 3 | P3 | Blocks | Block #75 above |
| 192 | Numbered list styling (circles, leading zeros) | 3 | 1 | P2 | Theme | CSS counter-style |

### 5.6 Link Features

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 193 | Link to anchor/element on page | 4 | 1 | P0 | Framework | HTML native |
| 194 | Link to phone/email/WhatsApp | 4 | 1 | P0 | Blocks | Done: WhatsApp CTA block |
| 195 | Link entire block (block link) | 4 | 2 | P1 | Ext | Same as #96 |
| 196 | Link opens in modal/lightbox | 3 | 3 | P2 | Blocks | JS; for Gallery lightbox |
| 197 | nofollow/sponsored/ugc rel attributes | 3 | 1 | P2 | Blocks | Link attribute in inspector |
| 198 | Link hover animation controls | 4 | 1 | P1 | Theme | Underline animation styles |

---

## 6. CONVERSION & MARKETING

### 6.1 CTA Features

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 199 | Button variants (solid/outline/ghost/gradient) | 5 | 2 | P1 | Blocks | ✓ Done — git: `feat(blocks+a11y): masonry, min-height, button variants, ARIA roles...`. |
| 200 | Button sizes (XS to XL) | 4 | 1 | P1 | Blocks | Size attribute or tokens |
| 201 | Button groups (primary + secondary side-by-side) | 4 | 2 | P1 | Blocks | Hero/CTA Section dual buttons |
| 202 | Floating/sticky CTA bar | 4 | 3 | P2 | Blocks | Fixed bottom bar; mobile |
| 203 | Animated CTA (pulse/shimmer) | 3 | 1 | P2 | Blocks | CSS keyframes |
| 204 | Icon + text buttons | 4 | 1 | P0 | Blocks | Done in CTA Section |

### 6.2 Popup / Modal Features

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 205 | Lightbox popup (centred overlay) | 4 | 3 | P2 | Popups | SGS Popups plugin spec |
| 206 | Slide-in scroll box | 3 | 3 | P2 | Popups | Corner/edge slide |
| 207 | Floating bar (header/footer sticky) | 4 | 2 | P2 | Popups | Announcement bar |
| 208 | Exit-intent trigger | 4 | 3 | P3 | Popups | Mouse toward close |
| 209 | Scroll depth trigger | 3 | 2 | P2 | Popups | Percentage-based |
| 210 | Timed delay trigger | 3 | 1 | P2 | Popups | setTimeout |
| 211 | Click trigger (element opens modal) | 4 | 2 | P2 | Popups | Button/link opens popup |
| 212 | Cookie consent bar | 4 | 3 | P2 | Popups | GDPR/CCPA; category toggles |
| 213 | Frequency capping | 3 | 2 | P2 | Popups | Cookie-based; once per session/X days |
| 214 | Toast notifications | 4 | 2 | P2 | Framework | Form success, cart updates |

### 6.3 Social Proof

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 215 | Testimonial cards | 5 | 2 | P0 | Blocks | Done: Testimonial block |
| 216 | Testimonial carousel/slider | 5 | 2 | P0 | Blocks | Done: Testimonial Slider |
| 217 | Review stars (aggregate) | 4 | 2 | P1 | Blocks | Block #67 (Star Rating) |
| 218 | Client logo bar | 5 | 2 | P0 | Blocks | Done: Trust Bar |
| 219 | Trust badges | 4 | 1 | P0 | Blocks | Done: Certification Bar |
| 220 | Before/after image slider | 3 | 3 | P2 | Blocks | Block #71 |
| 221 | Counter animation (stats) | 4 | 2 | P0 | Blocks | Done: Counter block |
| 222 | Social share buttons | 3 | 2 | P2 | Blocks | Per-platform icons |
| 223 | Author bio box | 3 | 2 | P2 | Blocks | For blog posts |

### 6.4 Lead Generation & Forms

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 224 | Contact form | 5 | 3 | P0 | Forms | Done: SGS Forms |
| 225 | Multi-step form with progress | 5 | 3 | P0 | Forms | Done: Form Steps |
| 226 | Conditional logic (show/hide fields) | 4 | 4 | P2 | Forms | Phase 2 of forms spec |
| 227 | File upload with drag-and-drop | 3 | 3 | P2 | Forms | Phase 2 |
| 228 | Payment integration (Stripe) | 4 | 4 | P2 | Forms | Phase 2 |
| 229 | Address autocomplete | 3 | 3 | P3 | Forms | Google Places API |
| 230 | Smart field validation (real-time) | 4 | 2 | P1 | Forms | :user-invalid CSS; JS feedback |
| 231 | Auto-save/resume partial forms | 2 | 3 | P3 | Forms | localStorage |
| 232 | Quiz/calculator funnel | 3 | 4 | P3 | Forms | Multi-step + scoring |
| 233 | WhatsApp chat button | 4 | 1 | P0 | Blocks | Done: WhatsApp CTA block |

### 6.5 Pricing & E-Commerce

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 234 | Pricing table (2-4 tiers) | 4 | 3 | P2 | Blocks | Block #70 |
| 235 | Monthly/yearly toggle | 4 | 2 | P2 | Blocks | Within pricing table |
| 236 | Feature comparison matrix | 3 | 3 | P3 | Blocks | Table variant |
| 237 | Highlighted/recommended tier | 4 | 1 | P2 | Blocks | CSS class for emphasis |

### 6.6 Content Marketing

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 238 | Blog post grid | 5 | 5 | P1 | Blocks | Block #63 (Post Grid) |
| 239 | Category/tag filtering (AJAX) | 4 | 3 | P1 | Blocks | Within Post Grid |
| 240 | Search functionality | 4 | 2 | P2 | Theme | Enhanced core search |
| 241 | Reading progress bar | 3 | 2 | P2 | Blocks | Block #81 |
| 242 | Estimated reading time | 3 | 1 | P2 | Blocks | Feature #186 |
| 243 | Breadcrumbs + schema | 3 | 2 | P2 | Blocks | Block #80 |
| 244 | Related posts | 4 | 2 | P2 | Blocks | Post Grid variant |
| 245 | Next/previous post navigation | 3 | 1 | P2 | Theme | Template-level |

---

## 7. SEO & SCHEMA

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 246 | Article / BlogPosting schema | 4 | 2 | P2 | Theme | JSON-LD in templates |
| 247 | Organisation schema | 4 | 2 | P2 | Theme | Site-wide |
| 248 | LocalBusiness schema | 4 | 2 | P2 | Theme | For service businesses |
| 249 | FAQPage schema | 4 | 1 | P1 | Blocks | ✓ Done — git: `feat(schema+typography): structured data...`. Accordion block outputs FAQPage JSON-LD. |
| 250 | Product schema (price, availability) | 3 | 2 | P3 | Blocks | ○ Not started — no evidence. |
| 251 | Review / Rating schema | 4 | 2 | P1 | Blocks | ✓ Done — Star Rating block has AggregateRating schema. Confirmed 2026-02-26. |
| 252 | Person schema | 3 | 2 | P1 | Blocks | ✓ Done — Team Member block has Person schema JSON-LD. Confirmed 2026-02-26 + plan `phase2-blocks-complete`. |
| 253 | Event schema | 3 | 2 | P3 | Booking | SGS Booking |
| 254 | BreadcrumbList schema | 3 | 1 | P2 | Blocks | ✓ Done — Breadcrumbs block confirmed (`breadcrumbs/block.json`). Code-confirmed 2026-04-18. |
| 255 | HowTo schema | 3 | 2 | P3 | Blocks | On Process Steps block |
| 256 | Open Graph tags | 4 | 2 | P2 | Theme | Per-page meta |
| 257 | Twitter Cards | 3 | 1 | P2 | Theme | Per-page meta |
| 258 | Automatic alt text infrastructure | 4 | 1 | P0 | Framework | WordPress core |

---

## 8. ACCESSIBILITY (NON-NEGOTIABLE BASELINE)

| # | Feature | Impact | Diff | Priority | WCAG | Notes |
|---|---------|--------|------|----------|------|-------|
| 259 | Colour contrast 4.5:1 (text) / 3:1 (large) | 5 | 1 | P0 | 1.4.3 | Every block |
| 260 | UI component contrast 3:1 | 5 | 1 | P0 | 1.4.11 | Borders, focus indicators |
| 261 | Focus indicators (2px, 3:1 contrast) | 5 | 1 | P0 | 2.4.7 | All interactive elements |
| 262 | Touch targets 44x44px minimum | 5 | 1 | P0 | 2.5.8 | All buttons, links, controls |
| 263 | Skip navigation link | 5 | 1 | P0 | 2.4.1 | First focusable element |
| 264 | Semantic landmarks (header/nav/main/footer) | 5 | 1 | P0 | 1.3.1 | Template structure |
| 265 | Heading hierarchy | 5 | 1 | P0 | 1.3.1 | H1 > H2 > H3 logical order |
| 266 | Alt text for images | 5 | 1 | P0 | 1.1.1 | Every img element |
| 267 | prefers-reduced-motion respect | 5 | 1 | P0 | 2.3.3 | All animations |
| 268 | Keyboard operability (Tab/Enter/Space/Escape/Arrows) | 5 | 2 | P0 | 2.1.1 | All interactive blocks |
| 269 | No keyboard traps | 5 | 1 | P0 | 2.1.2 | Modals, dropdowns |
| 270 | ARIA roles (tablist/tab/tabpanel/dialog/alert) | 5 | 2 | P1 | 4.1.2 | ✓ Done — git: `feat(a11y): ARIA roles, aria-live, scroll-padding, form error identification`. |
| 271 | aria-live regions for dynamic content | 4 | 2 | P1 | 4.1.3 | ✓ Done — git: `feat(a11y): ARIA roles, aria-live, scroll-padding...`. |
| 272 | Focus not obscured by sticky elements | 4 | 1 | P1 | 2.4.11 | ✓ Done — git: `feat(a11y): ...scroll-padding...`. scroll-padding-top applied to prevent sticky header overlap. |
| 273 | Dragging alternatives (single-pointer) | 3 | 2 | P2 | 2.5.7 | NEW in WCAG 2.2 |
| 274 | Content on hover: dismissable, hoverable, persistent | 4 | 2 | P1 | 1.4.13 | Tooltips, dropdowns |
| 275 | Form error identification + suggestions | 5 | 2 | P1 | 3.3.1/3.3.3 | ✓ Done — git: `feat(a11y): ARIA roles, aria-live, scroll-padding, form error identification`. |
| 276 | lang attribute on HTML | 5 | 1 | P0 | 3.1.1 | Template |
| 277 | Page titles (unique, descriptive) | 5 | 1 | P0 | 2.4.2 | WordPress core |
| 278 | No auto-playing content > 5 seconds without pause | 4 | 1 | P0 | 2.2.2 | Carousels, video |
| 279 | No flashing > 3 times/second | 5 | 1 | P0 | 2.3.1 | Animations |

---

## 9. PERFORMANCE

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 280 | Lazy loading images (loading="lazy") | 5 | 1 | P0 | Framework | WordPress core |
| 281 | fetchpriority="high" on LCP image | 4 | 1 | P1 | Blocks | Hero block render.php |
| 282 | Explicit image dimensions (CLS) | 5 | 1 | P0 | Framework | width + height attributes |
| 283 | font-display: swap | 5 | 1 | P0 | Theme | Done in @font-face |
| 284 | Self-hosted fonts (no CDN) | 5 | 1 | P0 | Theme | Done: Inter WOFF2 |
| 285 | Critical CSS inlining | 3 | 3 | P3 | Theme | Above-fold inline |
| 286 | content-visibility: auto on below-fold sections | 4 | 1 | P2 | Theme | 7x render improvement |
| 287 | CSS contain: layout paint on isolated blocks | 3 | 1 | P2 | Blocks | Optimise reflow |
| 288 | Conditional block CSS loading | 4 | 3 | P2 | Framework | Only load CSS for blocks on page |
| 289 | Image format: WebP/AVIF with fallback | 4 | 2 | P2 | Framework | WordPress 6.5+ AVIF support |
| 290 | Preconnect/preload critical resources | 4 | 1 | P0 | Theme | Done: font preload |
| 291 | No render-blocking JS | 5 | 1 | P0 | Blocks | viewScriptModule (deferred) |
| 292 | Performance budget (< 100KB CSS, < 50KB JS) | 5 | 2 | P0 | Framework | Non-negotiable |
| 293 | Core Web Vitals targets (LCP < 2.5s, INP < 200ms, CLS < 0.1) | 5 | 3 | P1 | Framework | Lighthouse audit |

---

## 10. CUTTING-EDGE CSS/JS TO ADOPT

| # | Feature | Support | Impact | Diff | Priority | WP Use Case |
|---|---------|---------|--------|------|----------|-------------|
| 294 | CSS Nesting | 87% | 4 | 1 | P1 | Cleaner block stylesheets |
| 295 | :has() selector | 82% | 4 | 1 | P1 | Parent-aware styling |
| 296 | color-mix() | 92% | 4 | 1 | P1 | Generate hover tints from single token |
| 297 | @layer (cascade layers) | 90% | 4 | 2 | P2 | Specificity management |
| 298 | @scope | 87% | 3 | 2 | P2 | Prevent style leaking into InnerBlocks |
| 299 | Popover API | 88% | 4 | 2 | P2 | JS-free tooltips and dropdowns |
| 300 | @starting-style | 86% | 4 | 1 | P1 | **S-TIER:** CSS-only entry/exit animations; Baseline; replaces JS timing hacks |
| 301 | @property (registered custom properties) | 88% | 3 | 2 | P2 | Animatable CSS variables |
| 302 | light-dark() | 85% | 4 | 1 | P2 | Single-line dark mode values; required for dark mode toggle |
| 303 | Scroll-driven animations | 95%+ | 5 | 2 | P1 | **S-TIER:** Replace AOS.js entirely; CSS-only; Baseline 2025; no WP plugin has native controls |
| 304 | View Transitions API | 87% | 4 | 1 | P2 | **S-TIER:** Single CSS rule for app-like page transitions; no WP theme offers this |
| 305 | Anchor Positioning | 80%+ | 4 | 2 | P2 | **S-TIER:** JS-free tooltip/popover positioning; Interop 2026 |
| 306 | :user-invalid / :user-valid | 85% | 4 | 1 | P1 | ✓ Done — git: `feat(css): P1 CSS-only enhancements - balance, contrast, validation, animations`. |
| 307 | :focus-visible | 96% | 5 | 1 | P0 | Done: keyboard-only focus rings |
| 308 | Container queries | 93% | 3 | 2 | P3 | Blocks adapt to container width |
| 309 | Subgrid | 85% | 3 | 2 | P3 | Cross-card alignment |
| 310 | CSS Custom Highlight API | 85% | 2 | 3 | P3 | Search highlighting; Client Notes |
| 311 | Speculation Rules API | Chromium | 3 | 2 | P4 | Instant page prerendering |
| 312 | CSS if() | Chromium | 2 | 2 | P4 | Conditional values inline |
| 313 | CSS Carousel primitives | Chromium | 3 | 2 | P4 | CSS-only carousels |
| 314 | contrast-color() | Safari+FF | 4 | 1 | P3 | **S-TIER:** Auto accessible text colour; progressive enhancement; Safari 26.2 + Firefox 147 |

---

## 11. SECURITY & STANDARDS

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 315 | WordPress nonces on all forms | 5 | 1 | P0 | Forms | Non-negotiable |
| 316 | Capability checks on all actions | 5 | 1 | P0 | Framework | Non-negotiable |
| 317 | Output escaping (esc_html, esc_attr, esc_url) | 5 | 1 | P0 | Framework | Non-negotiable |
| 318 | Prepared statements ($wpdb->prepare) | 5 | 1 | P0 | Framework | Non-negotiable |
| 319 | Input sanitisation at boundaries | 5 | 1 | P0 | Framework | Non-negotiable |
| 320 | No secrets in frontend | 5 | 1 | P0 | Framework | Non-negotiable |
| 321 | RTL layout support (CSS logical properties) | 3 | 3 | P3 | Theme | i18n readiness |
| 322 | Translation-ready strings (__(), _e()) | 4 | 1 | P0 | Framework | All user-facing text |
| 323 | Print stylesheet | 3 | 2 | P3 | Theme | Hide nav/footer, show URLs |

---

## 12. CONDITIONAL DISPLAY

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 324 | Show/hide by device | 5 | 2 | P0 | Ext | Done: Phase 1.1 |
| 325 | Show/hide by user role (logged in/out) | 4 | 2 | P2 | Ext | render_block filter |
| 326 | Show/hide by date/time schedule | 3 | 2 | P2 | Ext | Start/end date |
| 327 | Show/hide by URL parameter | 3 | 2 | P3 | Ext | Query string check |
| 328 | Show/hide by post type / taxonomy | 3 | 2 | P3 | Ext | Context-aware display |
| 329 | AND/OR condition logic | 3 | 3 | P3 | Ext | Multiple conditions combined |

---

## 13. BLOCK PATTERNS LIBRARY

| # | Category | Count | Impact | Diff | Priority | Notes |
|---|----------|-------|--------|------|----------|-------|
| 330 | Hero patterns | 5 | 4 | 2 | P2 | Full-width, split, video, centred, gradient |
| 331 | Feature patterns | 5 | 4 | 2 | P2 | Icon grid, alternating, steps, comparison, cards |
| 332 | Testimonial patterns | 3 | 3 | 2 | P2 | Single, slider, grid |
| 333 | CTA patterns | 3 | 4 | 2 | P2 | Banner, split, gradient+countdown |
| 334 | Content patterns | 5 | 3 | 2 | P2 | FAQ, team, pricing, timeline, stats |
| 335 | Footer patterns | 3 | 3 | 2 | P2 | 3-col, 4-col, centred |
| 336 | Header patterns | 4 | 3 | 2 | P2 | Standard (sticky/non-sticky), transparent overlay, centred logo |
| 337 | Blog patterns | 3 | 3 | 2 | P2 | Magazine, sidebar, full-width |

---

## 14. DARK MODE

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 338 | Dark mode toggle (user preference) | 4 | 2 | P2 | Theme | `prefers-color-scheme` media query + manual toggle button; stores preference in localStorage |
| 339 | Dark mode colour palette in theme.json | 4 | 2 | P2 | Theme | Separate dark palette mapped with `light-dark()` or CSS custom property swap on `[data-theme="dark"]` |
| 340 | Dark mode per-block preview in editor | 3 | 3 | P3 | Ext | Preview blocks in dark context while editing; toggle in editor toolbar |

---

## 15. S-TIER DIFFERENTIATORS (Nobody Else Has These)

> Features identified through competitive research (Feb 2026) that no WordPress plugin or theme currently offers. These are the features that push SGS from Grade B to Grade A.

### 15.1 CSS-Native Interactions (No JavaScript)

| # | Feature | Impact | Diff | Priority | Component | Browser Support | Notes |
|---|---------|--------|------|----------|-----------|----------------|-------|
| 341 | Scroll-driven animation controls in block inspector | 5 | 3 | P1 | Ext | 95%+ (Baseline) | Per-element scroll animation presets (fade-up, parallax, progress). Built on CSS `animation-timeline: view()`. No JS. First WP plugin to offer this natively. See also #303 |
| 342 | CSS-only entry/exit animations (@starting-style) | 4 | 1 | P1 | Ext | Baseline | Accordion, modal, popover blocks animate open/close with zero JS. Combined with `transition-behavior: allow-discrete`. See also #300 |
| 343 | Container scroll-state queries | 4 | 2 | P2 | Theme | Chrome 133+ | Sticky header changes appearance when stuck (shrink, shadow, bg change) — pure CSS, no JS scroll listeners |
| 344 | CSS Grid Lanes (native masonry) | 3 | 2 | P2 | Blocks | Safari TP + Chrome 140 | `display: grid-lanes` for zero-JS masonry. Ship with `column-count` fallback. First to market |

### 15.2 Accessibility Innovation

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 345 | `prefers-contrast` support | 4 | 1 | P1 | Theme | High-contrast alternative styles: thicker borders, solid backgrounds, no gradients. First WP theme to support this. 3 CSS lines per block |
| 346 | Native `<dialog>` for modals | 4 | 2 | P1 | Blocks | Built-in focus trapping, Escape to close, `::backdrop`. Replaces ARIA-heavy div modals. No competitor uses this |
| 347 | Native Popover API for tooltips/dropdowns | 4 | 2 | P2 | Blocks | `popover` attribute for JS-free show/hide with light-dismiss. 88% support. Combined with Anchor Positioning (#305) for zero-JS positioning |
| 348 | APCA contrast checking in editor | 3 | 3 | P3 | Ext | Advanced Perceptual Contrast Algorithm — next-gen contrast science (WCAG 3.0 candidate). Show alongside current WCAG 2.2 ratios |
| 349 | Accessibility statement generator | 3 | 3 | P3 | Theme | Auto-generated accessibility statement page based on which blocks/features the site uses. Required by European Accessibility Act (EAA) |

### 15.3 Visual Differentiators

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 350 | Bento Grid block | 4 | 3 | P2 | Blocks | Mixed-size card grid with per-tile sizing, exaggerated border-radius (12-24px), hover animations. Hottest layout trend 2025-2026. No native WP block |
| 351 | Kinetic Typography block | 3 | 4 | P3 | Blocks | Word-by-word reveal, letter stagger, variable font weight shift on scroll. Built on CSS scroll-driven animations. Webflow territory, but in WordPress |
| 352 | Cursor-reactive elements extension | 2 | 3 | P4 | Ext | Three presets: magnetic (pull toward cursor), tilt (3D perspective shift), glow (light follows cursor). JS required but minimal. Premium creative agency feel |

### 15.4 Developer & Client Experience

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 353 | In-editor performance dashboard | 4 | 4 | P3 | Framework | Sidebar panel showing estimated page weight (CSS, JS, images), animation count, CWV traffic light. Warn when over budget. No builder offers this |
| 354 | Style variation client onboarding system | 4 | 3 | P2 | Theme | Variations configure entire site personality: default hero layout, CTA style, nav pattern, footer structure, industry-specific block presets — not just colours and fonts |

---

## VERIFICATION AUDIT (2026-02-22, Session 24)

> **Purpose:** Every P0 item below was checked against the live site (palestine-lives.org) and codebase. Items are categorised by verification status, not by whether code exists.

### P0 Verification — Three Buckets

#### Verified Working (~35 items)

Confirmed by Playwright testing on live site, code review, or WordPress core guarantee:

| # | Feature | How verified |
|---|---------|-------------|
| 1 | Responsive columns per breakpoint | Live homepage — Card Grid renders 4 cols desktop, stacks mobile |
| 6 | Nested grids | Container + InnerBlocks confirmed in codebase |
| 12 | Max-width / boxed / full-width | theme.json layout.contentSize / wideSize confirmed |
| 13 | Inner content width control | theme.json confirmed |
| 14 | Background colour | Native supports.color in all block.json files |
| 15 | Background gradient | Native supports.color.gradients in all block.json files |
| 21 | Border per side | Native __experimentalBorder in block.json files |
| 22 | Border radius per corner | Native __experimentalBorder in block.json files |
| 23 | Box shadow presets | theme.json — 4 presets (sm, md, lg, glow) confirmed |
| 25 | Vertical/horizontal alignment | Flexbox controls in block.json files |
| 27 | Margin per side | Native supports.spacing.margin |
| 28 | Padding per side | Native supports.spacing.padding |
| 33 | Block gap (CSS gap) | theme.json spacing.blockGap confirmed |
| 36 | Fluid typography | theme.json typography.fluid with min/max on 5/6 sizes |
| 38 | Responsive images srcset/sizes | WordPress core automatic |
| 155 | Font family (body + headings) | theme.json fontFamilies — Inter, DM Serif, DM Sans confirmed |
| 156 | Font size (static) | Native supports.typography confirmed |
| 158 | Font weight | Native supports.typography confirmed |
| 159 | Line height | Native supports.typography confirmed |
| 165 | Custom font upload (WOFF2) | Self-hosted Inter variable confirmed on live site |
| 184 | Footnotes | WordPress core (WP 6.3+) |
| 193 | Link to anchor/element | HTML native |
| 204 | Icon + text buttons | CTA Section renders dual buttons on live homepage |
| 215 | Testimonial cards | Testimonial block in codebase |
| 216 | Testimonial carousel/slider | Live homepage — arrows + dots work, slides change |
| 218 | Client logo bar | Live homepage — brand strip marquee renders |
| 258 | Automatic alt text infrastructure | WordPress core |
| 266 | Alt text for images | WordPress core |
| 276 | lang attribute on HTML | WordPress core template |
| 277 | Page titles | WordPress core |
| 280 | Lazy loading images | WordPress core |
| 282 | Explicit image dimensions | WordPress core |
| 283 | font-display: swap | Confirmed in theme.json fontFace declarations |
| 284 | Self-hosted fonts | Confirmed — no CDN calls on live site |
| 290 | Preconnect/preload | Font preload exists in functions.php |
| 291 | No render-blocking JS | All 10 blocks use viewScriptModule (deferred) |
| 307 | :focus-visible | CSS rule confirmed in codebase |

#### Code Exists But Unverified (~17 items)

Block or extension code is written and deployed, but never placed on a live page or tested end-to-end:

| # | Feature | Issue |
|---|---------|-------|
| 35 | Device visibility toggles | Extension registered, never tested on live page |
| 86 | Per-element hover controls | Only on 4 blocks (Card Grid, CTA, Hero, Info Box) — not universal |
| 92 | Scroll animation (15 types) | Extension registered, never seen firing on live page |
| 103 | Colour shift (background) | Only on 4 blocks, never tested on live page |
| 135 | Fade in animations | Part of animation extension, never tested |
| 150 | Accordion smooth expand | Accordion block exists, not on any live page |
| 177 | Auto-generated anchor IDs | heading-anchors.php exists, untested on live page |
| 189 | Custom bullet icons | Icon List block exists, not on any live page |
| 190 | Per-item custom icon + colour | Icon List block exists, not on any live page |
| 194 | Link to phone/email/WhatsApp | WhatsApp CTA block exists, not on any live page |
| 219 | Trust badges | Certification Bar exists, not on any live page |
| 221 | Counter animation | Counter block exists, not on any live page |
| 224 | Contact form | Form blocks exist, never submitted, CRITICAL security issues |
| 225 | Multi-step form with progress | Form steps exist, never tested end-to-end |
| 233 | WhatsApp chat button | WhatsApp CTA exists, not on any live page |
| 279 | No flashing > 3 times/sec | No known violations, but never formally checked |
| 324 | Device visibility by device | Same as #35 |

#### Failed Verification (~13 items)

These were claimed P0 but failed when tested:

| # | Feature | Failure | Severity |
|---|---------|---------|----------|
| 31 | Fluid spacing (clamp) | spacingSizes uses static rem values, no `fluid: true` | Medium |
| 43 | Sticky header | `position: sticky` on inner div inside `<header>` — doesn't stick when scrolling | High |
| 292 | Performance budget | JS = 70KB (over 50KB budget) — wp-emoji-release.min.js adds 22.2KB dead weight | Medium |
| 315 | WordPress nonces on all forms | CRITICAL — Form submit + upload endpoints have NO nonce verification | Critical |
| 316 | Capability checks on all actions | Upload endpoint uses `__return_true` permission callback | Critical |
| 317 | Output escaping | form/render.php echoes $content without phpcs annotation | Medium |
| 319 | Input sanitisation at boundaries | REST `fields` param has no per-field sanitisation at schema level | Medium |
| 320 | No secrets in frontend | N8N webhook URL stored in block attributes (publicly readable via REST API) | Critical |
| 322 | Translation-ready strings | 9 user-facing strings missing __()/_e() in 2 files | Low |
| 259 | Colour contrast 4.5:1 | FIXED — Footer headings 1.52:1 → 10.98:1, header CTA 3.62:1 → 4.60:1 | High |
| 261 | Focus indicators (2px, 3:1) | FIXED — Yellow accent (1.68:1) replaced with primary-dark (5.54:1) across 7 CSS files | High |
| 262 | Touch targets 44x44px | FIXED — Hamburger 24→44px, social icons 16→44px. Footer links ~30px (meets WCAG 2.5.8) | Medium |
| 265 | Heading hierarchy | FIXED — Footer H6 → H2, full logical hierarchy restored | Medium |
| 278 | No auto-play > 5 seconds | FIXED — Pause/Play toggle button added to testimonial slider | Medium |
| 260 | UI component contrast 3:1 | PASS — no failing UI borders | — |
| 263 | Skip navigation link | PASS — first focusable element, proper pattern | — |
| 264 | Semantic landmarks | PASS — header/nav/main/footer all present | — |
| 267 | prefers-reduced-motion | PASS — all animations respect it | — |
| 268 | Keyboard operability | PASS — slider, nav keyboard-accessible | — |
| 269 | No keyboard traps | PASS — no traps found | — |

### Additional Issues Found (not in original P0 list)

| Finding | Severity | Detail |
|---------|----------|--------|
| IP spoofing defeats rate limiter | High | X-Forwarded-For header trusted without validation |
| SSRF via webhook URL | High | wp_remote_post() with unvalidated URL from block attributes |
| CSS injection via colour slug | Medium | sgs_colour_value() doesn't validate slug chars |
| No capability gate for submissions | High | No admin UI or access control for stored form data |
| Hero image missing fetchpriority | Medium | LCP image has no `fetchpriority="high"` |
| Emoji script dead weight | Medium | 22.2KB JS loaded on every page for nothing |
| Missing favicon | Low | 404 on every page load |
| Hover controls not universal | Architectural | Per-block, not an extension — needs refactoring |
| Blog/contact pages 404 | Content | Most nav links lead to non-existent pages |

### Honest P0 Count

| Category | Count |
|----------|-------|
| **Verified working** | ~35 |
| **Code exists, unverified** | ~17 |
| **Failed verification** | ~13 |
| **Original P0 claim** | ~65 |

> **The honest P0 "done" count drops from ~65 to ~35 verified.** The other 30 are either untested or broken. The security failures are the most urgent — 3 CRITICAL issues in the form system mean forms should not be used in production until fixed.

---

## SUMMARY SCORECARD

### Total Features Audited: 354

| Priority | Count | Description |
|----------|-------|-------------|
| **P0 (Verified done)** | ~35 | Theme tokens, native WP supports, 6 blocks on live page, core WP features |
| **P0 (Code exists, unverified)** | ~17 | Blocks and extensions deployed but never tested end-to-end |
| **P0 (Failed)** | ~13 | Security, performance, sticky header, fluid spacing, translation |
| **P1 (Must have)** | ~65 | Missing blocks, responsive controls, hover effects, modern CSS, S-tier CSS features |
| **P2 (Should have)** | ~120 | Advanced blocks, patterns, popups, SEO, performance, dark mode, bento grid, client onboarding |
| **P3 (Nice to have)** | ~65 | Creative effects, niche blocks, advanced interactions, APCA, kinetic typography |
| **P4 (Future/watch)** | ~39 | Experimental CSS, cursor effects, gamification |

### Framework Maturity Score (Verified — 2026-02-22)

| Domain | Claimed | Verified | Max | % Verified |
|--------|---------|----------|-----|------------|
| Core Blocks | 32 | 22 | 49 | 45% |
| Block Extensions | 3 | 1 | 14 | 7% |
| Theme Features | 18 | 14 | 33 | 42% |
| Typography | 8 | 6 | 20 | 30% |
| Hover/Interactions | 4 | 2 | 30 | 7% |
| Scroll Animations | 1 | 0 | 10 | 0% |
| Accessibility | 15 | 5 | 27 | 19% |
| Performance | 8 | 5 | 18 | 28% |
| SEO/Schema | 1 | 1 | 13 | 8% |
| Forms | 8 | 0 | 12 | 0% |
| Patterns Library | 0 | 0 | 27 | 0% |
| Dark Mode | 0 | 0 | 11 | 0% |
| S-Tier Differentiators | 0 | 0 | 30 | 0% |
| **TOTAL** | **98** | **56** | **294** | **19%** |

> **Reality check:** The claimed 33% maturity was inflated. Verified maturity is 19%. The gap is mostly in accessibility (never audited), forms (security broken), scroll animations (never tested), and block extensions (only 1 of 3 verified). The "code exists" items can be recovered by creating test content and fixing the ~13 failed items — but they aren't "done" until verified.

### Framework Maturity Score (Updated — 2026-02-26, after Phase 2)

Phase 2 complete: all 6 P1 blocks built and verified live (Post Grid, Gallery, Tabs, Countdown Timer, Star Rating, Team Member). Forms security fixed (CRITICAL/HIGH issues resolved in session 25). LiteSpeed CSS optimiser bug fixed (hamburger CSS). PR #1 merged to main.

| Domain | Verified | Max | % Verified | Change |
|--------|----------|-----|------------|--------|
| Core Blocks | 28 | 49 | 57% | +6 (Phase 2 blocks) |
| Block Extensions | 1 | 14 | 7% | — |
| Theme Features | 15 | 33 | 45% | +1 (hamburger fix) |
| Typography | 6 | 20 | 30% | — |
| Hover/Interactions | 2 | 30 | 7% | — |
| Scroll Animations | 0 | 10 | 0% | — |
| Accessibility | 5 | 27 | 19% | — |
| Performance | 5 | 18 | 28% | — |
| SEO/Schema | 1 | 13 | 8% | — |
| Forms | 5 | 12 | 42% | +5 (security fixes) |
| Patterns Library | 0 | 27 | 0% | — |
| Dark Mode | 0 | 11 | 0% | — |
| S-Tier Differentiators | 0 | 30 | 0% | — |
| **TOTAL** | **68** | **294** | **23%** | **+12** |

### Framework Maturity Score (Updated — 2026-04-18, reality-check pass)

Sessions 3–14 added: animation extension on all blocks, hover effects extension (universal), custom CSS/block-defaults/custom-spacing extensions, 6 more audit blocks (ToC, Pricing, Icon Block, Social Icons, Breadcrumbs, Back to Top), 12 new blocks not in the original audit (mega-menu, mobile-nav, announcement-bar, business-info, google-reviews, heritage-strip, modal, notice-banner, process-steps, svg-background, decorative-image, icon), 31 block patterns, responsive controls on 7 blocks, button variants, schema on Accordion/Team Member/Star Rating/Breadcrumbs, ARIA roles, aria-live, form errors, floating labels, tab indicator, grayscale, image zoom, block link, underline slide, button fill, masonry, min-height, letter-spacing, text-transform, text-wrap: balance, :user-invalid CSS, counter animation, staggered animation.

> **"Code-confirmed"** = file exists in codebase, confirmed 2026-04-18. Does NOT mean live-verified on palestine-lives.org unless stated.
> **Max expanded** from 294 → 310 to account for 12 new blocks not in the original feature list (+1 per new block, 4 already had higher max). Patterns max updated to 31 (SGS DB count).

| Domain | Feb 2026 | 2026-04-18 | Max (updated) | % | Change |
|--------|----------|------------|---------------|---|--------|
| Core Blocks | 28 | 39 | 61 | 64% | +11 (6 audit items + 12 new blocks) |
| Block Extensions | 1 | 10 | 14 | 71% | +9 (animation, hover, custom-css, block-defaults, custom-spacing, block-link + 3 existing confirmed) |
| Theme Features | 15 | 18 | 33 | 55% | +3 (balance, user-valid, responsive gap CSS) |
| Typography | 6 | 9 | 20 | 45% | +3 (letter-spacing, text-transform, responsive font-size partial) |
| Hover/Interactions | 2 | 12 | 30 | 40% | +10 (scale, shadow, zoom, grayscale, block-link, underline, button-fill, caption-reveal, floating-label, tab-indicator) |
| Scroll Animations | 0 | 5 | 10 | 50% | +5 (15 types universal, stagger, confirmed on all blocks) |
| Accessibility | 5 | 9 | 27 | 33% | +4 (ARIA roles, aria-live, scroll-padding, form error ID) |
| Performance | 5 | 7 | 18 | 39% | +2 (CSS split to 9.9KB critical, WebP/AVIF) |
| SEO/Schema | 1 | 5 | 13 | 38% | +4 (Person, Rating, FAQ, BreadcrumbList) |
| Forms | 5 | 8 | 12 | 67% | +3 (date, number, hidden, address field blocks confirmed) |
| Patterns Library | 0 | 15 | 31 | 48% | +15 (31 patterns in SGS DB; 15 credited as conservative verified estimate) |
| Dark Mode | 0 | 0 | 11 | 0% | — (not started) |
| S-Tier Differentiators | 0 | 2 | 30 | 7% | +2 (modal block may use `<dialog>`; animation.js covers scroll-driven partially) |
| **TOTAL** | **68** | **139** | **310** | **45%** | **+71** |

### What's Left for Phase 3 (P1 priority, not yet started)

| Feature | # | Priority | Notes |
|---------|---|----------|-------|
| Timeline block | 75 | P2 | 278 Kadence votes — highest demand missing block |
| Before/After slider | 71 | P2 | 137 Kadence votes |
| Progress Bar | 73 | P2 | Animated on scroll |
| Video Popup/Lightbox | 76 | P3 | Thumbnail + play → lightbox |
| Logo Carousel/Marquee | 77 | P2 | Infinite scroll trust bar |
| Map / Google Maps | 78 | P2 | Styled embed |
| Block style variations | 99 | P1 | `register_block_style` presets per block |
| Conditional display (role/schedule) | 100 | P2 | Beyond device visibility |
| Dark mode toggle + palette | 338-339 | P2 | `light-dark()` + localStorage |
| Scroll-driven animations (CSS) | 341 | P1 | Replace JS IntersectionObserver with CSS `animation-timeline: view()` |
| Native `<dialog>` modals | 346 | P1 | Focus trapping, ::backdrop — check if modal block already uses it |
| Per-block style variations | 99 | P1 | Multiple visual presets per block |
| Responsive controls (remaining blocks) | 157 | P1 | Font-size responsive on all blocks (7 done, ~50 remaining) |

### Target After Phase 2-3 Completion

| Domain | Current | After P2-3 | Max | % After |
|--------|---------|-----------|-----|---------|
| Core Blocks | 32 | 44 | 49 | 90% |
| Block Extensions | 3 | 10 | 14 | 71% |
| Theme Features | 18 | 26 | 33 | 79% |
| Typography | 8 | 14 | 20 | 70% |
| Hover/Interactions | 4 | 15 | 30 | 50% |
| Scroll Animations | 1 | 7 | 10 | 70% |
| Accessibility | 15 | 23 | 27 | 85% |
| Performance | 8 | 12 | 18 | 67% |
| SEO/Schema | 1 | 6 | 13 | 46% |
| Forms | 8 | 10 | 12 | 83% |
| Patterns Library | 0 | 20 | 27 | 74% |
| Dark Mode | 0 | 8 | 11 | 73% |
| S-Tier Differentiators | 0 | 18 | 30 | 60% |
| **TOTAL** | **98** | **213** | **294** | **72%** |

### Target After S-Tier Phase (Full Roadmap)

| Domain | After P2-3 | After S-Tier | Max | % After |
|--------|-----------|-------------|-----|---------|
| Core Blocks | 44 | 47 | 49 | 96% |
| Block Extensions | 10 | 13 | 14 | 93% |
| Theme Features | 26 | 31 | 33 | 94% |
| Typography | 14 | 17 | 20 | 85% |
| Hover/Interactions | 15 | 22 | 30 | 73% |
| Scroll Animations | 7 | 9 | 10 | 90% |
| Accessibility | 23 | 26 | 27 | 96% |
| Performance | 12 | 16 | 18 | 89% |
| SEO/Schema | 6 | 10 | 13 | 77% |
| Forms | 10 | 11 | 12 | 92% |
| Patterns Library | 20 | 25 | 27 | 93% |
| Dark Mode | 8 | 11 | 11 | 100% |
| S-Tier Differentiators | 18 | 28 | 30 | 93% |
| **TOTAL** | **213** | **266** | **294** | **90%** |

> **After full S-tier implementation: Grade A (90%).** This puts SGS ahead of every competitor except Kadence (85% on the original scale). With the expanded S-tier features that Kadence doesn't have (scroll-driven animations, View Transitions, contrast-color, prefers-contrast, native HTML elements), SGS would effectively be **the most technically advanced WordPress block framework in existence**.

---

## COMPETITIVE POSITION

### After Phase 2-3 (Grade B, 72%)

| Competitor | Free Blocks | Patterns | Responsive | Hover Controls | Accessibility | SGS Advantage |
|-----------|-------------|----------|------------|---------------|---------------|---------------|
| Kadence | 20 | 800+ | Full | Full | Best (100%) | Pattern count |
| Spectra | 42 | 150+ | Full | Partial | Poor (D) | Stability, a11y |
| GenerateBlocks | 6 | 200+ | Full | Full | Good (B) | Block count, forms |
| Elementor | 100+ | 1000+ | Full | Full | Poor (C) | Perf, a11y, lighter |
| Webflow | N/A | 1000+ | Full | Full | Good (B) | No lock-in, WP native |
| **SGS (after P2-3)** | **40** | **27+** | **Full** | **Full** | **Excellent (A)** | **Free depth, a11y, stability** |

### After S-Tier Phase (Grade A, 90%)

| Feature | Kadence | Elementor | Webflow | Bricks | **SGS** |
|---------|---------|-----------|---------|--------|---------|
| Scroll-driven animations (CSS-only) | No | No | JS-based | No | **Yes** |
| View Transitions API | No | No | No | No | **Yes** |
| `prefers-contrast` support | No | No | No | No | **Yes** |
| `contrast-color()` auto-text | No | No | No | No | **Yes** |
| Native `<dialog>` modals | No | No | No | No | **Yes** |
| Native Popover API | No | No | No | No | **Yes** |
| `@starting-style` animations | No | No | No | No | **Yes** |
| Dark mode toggle | Pro only | No | Yes | Yes | **Yes (free)** |
| Bento Grid block | No | No | Yes | No | **Yes** |
| Performance dashboard | No | No | No | No | **Yes** |
| WCAG 2.2 AA + prefers-contrast | 100% AA | Partial | Partial | Partial | **100% AA + contrast** |

**SGS differentiators (after full roadmap):**
1. More free blocks than Kadence (40+ vs 20)
2. Built-in forms (12 field types free — Kadence is Pro only)
3. WCAG 2.2 AA + `prefers-contrast` + `contrast-color()` = most accessible WP framework
4. No update breakage (dynamic blocks avoid save.js deprecation hell)
5. CSS-native scroll animations (zero JS — nobody in WP does this)
6. View Transitions for app-like page navigation (first WP theme ever)
7. Native HTML elements (`<dialog>`, Popover API) for lighter, more accessible interactive blocks
8. AJAX filtering + pagination together (Kadence's top feature request, 239 votes)
9. Dark mode with `light-dark()` and `prefers-color-scheme` (free, not Pro-only)
10. Zero licensing cost for the full feature set

---

## NEW BLOCKS SINCE FEB 2026 AUDIT

> These blocks exist in `plugins/sgs-blocks/src/blocks/` as of 2026-04-18 but were not in the original feature list. They expand the framework beyond the 354-item audit scope.

| Block | Type | What it does | Live-verified? |
|-------|------|-------------|---------------|
| `sgs/mega-menu` | Navigation | Full-width mega menu with panels, CTAs, 65+ attributes | ◐ Deployed — Indus Foods |
| `sgs/mobile-nav` | Navigation | Complete mobile navigation drawer, 65 attrs, patterns, animations | ◐ Deployed — Indus Foods |
| `sgs/announcement-bar` | Marketing | Top-of-page notification strip (dismissible) | ○ Code-confirmed only |
| `sgs/business-info` | Content | 8 display types: address, phone, email, hours, map, social, etc. Auto-populates from settings page | ○ Code-confirmed only |
| `sgs/google-reviews` | Social Proof | Dynamic Google Reviews integration | ◐ Deployed (palestine-lives + sandybrown) |
| `sgs/trustpilot-reviews` | Social Proof | Trustpilot review display: carousel/grid/list/badge variants; inline/synced/placeholder data sources; brand identity locked, typography theme-inherited; Schema.org JSON-LD. Sync infrastructure at `includes/trustpilot/` (Browserless `?token=` auth + JSON-LD parser + WP-cron `sgs_trustpilot_sync_event`). | ✅ Deployed + live-verified on sandybrown 2026-05-11 |
| `sgs/modal` | Interactive | Modal/dialogue overlay (check if uses native `<dialog>` — S-tier #346) | ○ Code-confirmed only |
| `sgs/notice-banner` | Content | Contextual notice/alert banner | ○ Code-confirmed only |
| `sgs/process-steps` | Content | Numbered step-by-step process block | ○ Code-confirmed only |
| `sgs/svg-background` | Layout | SVG shape background layer for sections | ○ Code-confirmed only |
| `sgs/decorative-image` | Layout | Decorative/non-semantic image placement | ○ Code-confirmed only |
| `sgs/icon` | Internal | Icon helper (internal component, not standalone block) | Internal |

> **Action required before Phase 3:** Verify each ○ block renders correctly on palestine-lives.org. These are code-confirmed but not live-verified — they count as "code exists" not "verified working".

---

## 2026-04-18 CHANGELOG

> Tracks every row that changed status in this audit pass. Previous value → new value.

### Section 2 — Missing Blocks

| # | Block | Old status | New status | Evidence |
|---|-------|-----------|-----------|---------|
| 69 | Table of Contents | Broken | ✓ Done | `table-of-contents/block.json` found in src/ |
| 70 | Pricing Table | Not started | ✓ Done | `pricing-table/block.json` found in src/ |
| 72 | Icon Block | Not started | ✓ Done | `icon-block/block.json` found in src/ |
| 79 | Social Icons | Not started | ✓ Done | `social-icons/block.json` found in src/ |
| 80 | Breadcrumbs | Not started | ✓ Done | `breadcrumbs/block.json` found in src/ |
| 82 | Back to Top | Not started | ✓ Done | `back-to-top/block.json` found in src/ |

### Section 3 — Block Extensions

| # | Feature | Old status | New status | Evidence |
|---|---------|-----------|-----------|---------|
| 86 | Per-element hover controls | Done (4 blocks) | ✓ Done (universal) | `hover-effects.js` is a global extension |
| 87 | Hover scale | P1 not started | ✓ Done | `hover-effects.js` + git feat commit |
| 88 | Hover shadow | P1 not started | ✓ Done | `hover-effects.js` confirmed |
| 90 | Hover image zoom | P1 not started | ✓ Done | git: `feat(extensions): image zoom, grayscale...` |
| 91 | Transition controls | P1 not started | ✓ Done | `hover-effects.js` + `custom-spacing.js` |
| 93 | Scroll stagger delay | P1 not started | ✓ Done | `animation.js` extension |
| 94 | Custom CSS | P2 not started | ✓ Done | `custom-css.js` extension confirmed |
| 96 | Block link | P1 not started | ✓ Done | git: `feat(extensions): image zoom, grayscale, block link...` |
| 98 | Save as default | P2 not started | ✓ Done | `block-defaults.js` extension confirmed |

### Other Sections

| # | Feature | Old status | New status | Evidence |
|---|---------|-----------|-----------|---------|
| 46 | Masonry grid | P1 not started | ✓ Done | git: `feat(blocks+a11y): masonry, min-height...` |
| 48 | Full-screen sections | P1 not started | ✓ Done | git: `feat(blocks+a11y): masonry, min-height...` |
| 115 | Underline slide hover | P1 not started | ✓ Done | git: `feat(extensions): ...underline slide` |
| 122 | Button fill animation | P1 not started | ✓ Done | git: `feat(extensions): ...button fill` |
| 130 | Colour-to-grayscale | P1 not started | ✓ Done | git: `feat(extensions): ...grayscale` |
| 132 | Overlay with text | P1 not started | ✓ Done | git: `feat: gallery caption reveal on hover` |
| 137 | Counter animation | P1 not started | ✓ Done | Counter block in codebase |
| 139 | Staggered grid entry | P1 not started | ✓ Done | `animation.js` stagger extension |
| 148 | Floating label | P1 not started | ✓ Done | git: `feat(schema+typography): ...floating labels` |
| 151 | Tab sliding indicator | P1 not started | ✓ Done | git: `feat: gallery caption reveal + tabs sliding indicator` |
| 157 | Responsive font-size | P1 not started | ◐ Partial | 7 blocks done, not universal |
| 160 | Letter-spacing | P1 not started | ✓ Done | git: `feat(schema+typography): ...letter-spacing` |
| 161 | Text-transform | P1 not started | ✓ Done | git: `feat(schema+typography): ...text-transform` |
| 175 | text-wrap: balance | P1 not started | ✓ Done | git: `feat(css): P1 CSS-only enhancements - balance...` |
| 199 | Button variants | P1 not started | ✓ Done | git: `feat(blocks+a11y): ...button variants` |
| 249 | FAQPage schema | P1 not started | ✓ Done | git: `feat(schema+typography): structured data...` |
| 252 | Person schema | P1 not started | ✓ Done | Phase 2 blocks complete plan |
| 254 | BreadcrumbList schema | P2 not started | ✓ Done | `breadcrumbs/block.json` confirmed |
| 270 | ARIA roles | P1 not started | ✓ Done | git: `feat(a11y): ARIA roles, aria-live...` |
| 271 | aria-live regions | P1 not started | ✓ Done | git: `feat(a11y): ARIA roles, aria-live...` |
| 272 | Focus not obscured | P1 not started | ✓ Done | git: `feat(a11y): ...scroll-padding` |
| 275 | Form error ID | P1 not started | ✓ Done | git: `feat(a11y): ...form error identification` |
| 306 | :user-invalid | P1 not started | ✓ Done | git: `feat(css): P1 CSS-only enhancements - ...validation` |

---

## Part C — Developer setup + workflow

*Source: `docs/DEVELOPER.md`.*

Technical reference for developers working on the SGS theme and blocks plugin.

---

## Contents

- [Project structure](#project-structure)
- [Build process](#build-process)
- [Creating a new block](#creating-a-new-block)
- [Adding a style variation](#adding-a-style-variation)
- [Shared components](#shared-components)
- [Render helpers](#render-helpers)
- [Extensions architecture](#extensions-architecture)
- [Deployment process](#deployment-process)
- [Environment and tools](#environment-and-tools)

---

## Project structure

```
small-giants-wp/
├── theme/sgs-theme/
│   ├── theme.json               # All design tokens: colours, fonts, spacing, shadows
│   ├── style.css                # Theme header only (no CSS rules)
│   ├── functions.php            # Enqueues, variation-specific CSS, filters
│   ├── styles/
│   │   └── indus-foods.json     # Client style variation overrides
│   ├── templates/               # Full-page block templates (index, page, single, etc.)
│   ├── parts/                   # Template parts (header variants, footer, mega menus)
│   ├── patterns/                # Reusable block patterns
│   └── assets/
│       ├── css/                 # core-blocks.css, dark-mode.css, utilities.css, etc.
│       ├── js/                  # sticky-header.js, dark-mode.js, mobile-nav-drawer.js, etc.
│       ├── fonts/               # Self-hosted WOFF2 files
│       └── decorative-foods/    # Indus Foods decorative PNG images
│
├── plugins/sgs-blocks/
│   ├── sgs-blocks.php           # Plugin entry point
│   ├── includes/                # PHP helpers, form processing, REST endpoints
│   │   ├── class-sgs-blocks.php # Auto-discovery and registration of all blocks
│   │   ├── forms/               # Form processor, REST API, admin, DB activation
│   │   ├── google-reviews-settings.php
│   │   ├── heading-anchors.php
│   │   ├── device-visibility.php
│   │   ├── hover-effects.php
│   │   └── review-schema.php
│   ├── src/
│   │   ├── blocks/              # One folder per block (see structure below)
│   │   │   └── extensions/      # Editor extensions (animation, visibility, hover, spacing)
│   │   ├── components/          # Reusable React components for use in edit.js files
│   │   └── utils/               # Shared JS utilities
│   ├── build/                   # Compiled output (committed, deployed to server)
│   ├── assets/
│   │   ├── css/extensions.css   # Frontend CSS for extensions (animation, visibility)
│   │   └── js/animation-observer.js
│   └── package.json
│
├── docs/                        # Documentation (QUICKSTART, DEVELOPER, plans)
├── sites/                       # Per-client content, mockups, research
├── specs/                       # Framework specification documents
└── ARCHITECTURE.md              # Architectural decisions and block inventory
```

### Per-block structure

Each block lives in `src/blocks/{block-name}/`:

```
{block-name}/
├── block.json     # Block metadata, attributes, supports, file references
├── edit.js        # Block editor UI (InspectorControls, BlockControls, preview)
├── index.js       # Block registration (imports edit.js, save.js, block.json)
├── save.js        # Returns null for dynamic blocks, or InnerBlocks.Content for wrappers
├── render.php     # Server-side render (called by WordPress for dynamic blocks)
├── style.css      # Frontend styles (also loaded in the editor)
├── editor.css     # Editor-only styles (not loaded on the frontend)
└── view.js        # Frontend interactive script (Interactivity API or vanilla ES module)
```

Dynamic blocks (the majority) use `render.php` and return `null` from `save.js`. This avoids deprecation issues and keeps PHP in control of output.

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

**Output:** `build/blocks/{block-name}/` contains the compiled files. All files in `build/` are version-controlled and deployed directly to the server — Node.js is not available on the Hostinger host.

---

## Creating a new block

### 1. Create the block directory

```powershell
cd plugins/sgs-blocks/src/blocks
mkdir my-block-name
```

### 2. Create block.json

Minimum required structure:

```json
{
    "$schema": "https://schemas.wp.org/trunk/block.json",
    "apiVersion": 3,
    "name": "sgs/my-block-name",
    "version": "0.1.0",
    "title": "SGS My Block",
    "category": "sgs-layout",
    "description": "One sentence description.",
    "keywords": ["my-block", "keyword2"],
    "textdomain": "sgs-blocks",
    "attributes": {
        "exampleAttr": {
            "type": "string",
            "default": ""
        }
    },
    "supports": {
        "anchor": true,
        "html": false,
        "spacing": { "padding": true, "margin": true }
    },
    "render": "file:./render.php",
    "editorScript": "file:./index.js",
    "editorStyle": "file:./index.css",
    "style": "file:./style-index.css"
}
```

**Categories available:**
- `sgs-layout` — structural/container blocks
- `sgs-content` — content blocks
- `sgs-forms` — form-related blocks
- `sgs-navigation` — nav/wayfinding blocks
- `sgs-commerce` — commerce-related blocks

### 3. Create index.js

```js
import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';

const save = () => null; // Dynamic block — rendered by PHP

registerBlockType( metadata.name, {
    edit: Edit,
    save,
} );
```

### 4. Create edit.js

Use WordPress components for the editor UI:

```js
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Edit( { attributes, setAttributes } ) {
    const { exampleAttr } = attributes;
    const blockProps = useBlockProps();

    return (
        <>
            <InspectorControls>
                <PanelBody title={ __( 'Settings', 'sgs-blocks' ) }>
                    <TextControl
                        label={ __( 'Example', 'sgs-blocks' ) }
                        value={ exampleAttr }
                        onChange={ ( val ) => setAttributes( { exampleAttr: val } ) }
                    />
                </PanelBody>
            </InspectorControls>
            <div { ...blockProps }>
                { /* Editor preview */ }
            </div>
        </>
    );
}
```

### 5. Create render.php

```php
<?php
/**
 * SGS My Block — server-side render.
 *
 * @var array $attributes Block attributes.
 * @var string $content   Inner blocks HTML (for blocks with InnerBlocks).
 * @var WP_Block $block   The current block instance.
 */

$example_attr = esc_html( $attributes['exampleAttr'] ?? '' );
$wrapper_attrs = get_block_wrapper_attributes( [
    'class' => 'sgs-my-block',
] );
?>
<div <?php echo $wrapper_attrs; ?>>
    <?php echo $example_attr; ?>
</div>
```

`get_block_wrapper_attributes()` merges in any colour, spacing, or typography attributes set via the block supports system. Always use it for the root element.

### 6. Create style.css and editor.css

Scope all CSS under the block class:

```css
/* style.css */
.sgs-my-block {
    /* styles here */
}
```

### 7. Build and test

```powershell
cd plugins/sgs-blocks ; npm run build
```

Auto-discovery is handled by `class-sgs-blocks.php`. Any folder in `build/blocks/` that contains a `block.json` is registered automatically — no manual registration needed.

---

## Adding a style variation

Style variations let the same theme serve different clients. They live in `theme/sgs-theme/styles/` as JSON files.

### 1. Create the variation file

```powershell
cd theme/sgs-theme/styles
# Create: my-client.json
```

The JSON structure mirrors `theme.json` but only needs to include the values you want to override:

```json
{
    "$schema": "https://schemas.wp.org/trunk/theme.json",
    "version": 3,
    "title": "My Client",
    "settings": {
        "color": {
            "palette": [
                {
                    "slug": "primary",
                    "color": "#123456",
                    "name": "Primary"
                }
            ]
        }
    },
    "styles": {
        "typography": {
            "fontFamily": "var:preset|font-family|heading"
        }
    }
}
```

WordPress merges this with `theme.json` at runtime — you only need to specify what changes.

### 2. Add variation-specific CSS (if needed)

If the variation needs CSS that cannot be expressed via tokens (e.g. decorative images, complex hover states), add it in `functions.php` gated on the active variation:

```php
function enqueue_style_variation_extras(): void {
    $variation = get_theme_mod( 'active_theme_style', '' );

    if ( 'my-client' === $variation ) {
        $css = "
            /* My Client specific overrides */
            .sgs-hero { border-radius: 0; }
        ";
        wp_add_inline_style( 'sgs-utilities', $css );
    }
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_style_variation_extras' );
```

Do not add client-specific CSS to `style.css` or any unconditional stylesheet — it would load on every site using the theme.

### 3. Font preloading

If the variation uses different fonts, add preload logic in `functions.php`:

```php
function preload_fonts(): void {
    $variation = get_theme_mod( 'active_theme_style', '' );

    if ( 'my-client' === $variation ) {
        $fonts = [ 'my-font-variable.woff2' ];
    } else {
        $fonts = [ 'inter-variable-latin.woff2' ];
    }

    foreach ( $fonts as $font ) {
        printf(
            '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n",
            esc_url( get_theme_file_uri( 'assets/fonts/' . $font ) )
        );
    }
}
```

Place font WOFF2 files in `theme/sgs-theme/assets/fonts/`.

---

## Shared components

Reusable React components live in `src/components/`. Import them in any block's `edit.js`.

```js
import { DesignTokenPicker, AnimationControl, ResponsiveControl, SpacingControl } from '../../components';
```

### DesignTokenPicker

A colour picker that returns theme colour slugs rather than raw hex values. Use this instead of `ColorPalette` for colour attributes so colours track theme token changes.

```js
import { DesignTokenPicker } from '../../components';

<DesignTokenPicker
    label={ __( 'Background Colour', 'sgs-blocks' ) }
    value={ backgroundColour }
    onChange={ ( val ) => setAttributes( { backgroundColour: val } ) }
/>
```

In `render.php`, convert a slug to a CSS variable:

```php
function sgs_colour_var( string $value ): string {
    if ( str_starts_with( $value, '#' ) ) {
        return $value; // Raw hex — pass through.
    }
    return 'var(--wp--preset--color--' . sanitize_html_class( $value ) . ')';
}
```

Always add a `:not([style*="color"])` guard in CSS so inline styles set by the attributes always win.

### AnimationControl

Renders the scroll animation inspector panel. Used directly by the extensions system, but can also be embedded in a block's own inspector:

```js
import { AnimationControl } from '../../components';

<AnimationControl
    attributes={ attributes }
    setAttributes={ setAttributes }
/>
```

### ResponsiveControl

Wraps any control in a desktop/tablet/mobile tab switcher for setting per-breakpoint values:

```js
import { ResponsiveControl } from '../../components';

<ResponsiveControl>
    { ( device ) => (
        <RangeControl
            label={ `Columns (${ device })` }
            value={ attributes[ `columns${ device }` ] }
            onChange={ ( val ) => setAttributes( { [ `columns${ device }` ]: val } ) }
        />
    ) }
</ResponsiveControl>
```

### SpacingControl

Custom padding/margin control with per-side and per-breakpoint inputs:

```js
import { SpacingControl } from '../../components';

<SpacingControl
    label={ __( 'Padding', 'sgs-blocks' ) }
    value={ padding }
    onChange={ ( val ) => setAttributes( { padding: val } ) }
/>
```

---

## Render helpers

### sgs_responsive_image

Located in `includes/render-helpers.php`. Outputs a fully optimised `<img>` with:

- `srcset` and `sizes` attributes for responsive images.
- `loading="lazy"` for below-fold images.
- `fetchpriority="high"` for LCP images (hero, above-fold).
- `decoding="async"`.
- Proper `alt` text from the attachment metadata.

```php
echo sgs_responsive_image(
    $attachment_id,       // int — attachment post ID
    'large',              // string — WordPress image size
    [
        'class'           => 'sgs-hero__image',
        'fetchpriority'   => 'high',  // omit for lazy-loaded images
    ]
);
```

For the hero block's background image, a `<link rel="preload">` tag is injected into `<head>` by `functions.php` to eliminate LCP delay.

---

## Extensions architecture

Extensions add capabilities to all blocks via the WordPress `editor.BlockEdit` filter. They live in `src/blocks/extensions/`.

```
extensions/
├── animation.js              # Scroll-triggered animation controls
├── responsive-visibility.js  # Per-device show/hide controls
├── hover-effects.js          # Hover state colour controls
├── custom-spacing.js         # Enhanced per-breakpoint spacing
└── index.js                  # Imports all four extensions
```

### How extensions work

1. `index.js` is compiled to `build/extensions/index.js`.
2. `class-sgs-blocks.php` enqueues this bundle via `enqueue_block_editor_assets` so it loads once in the editor.
3. Each extension file calls `addFilter( 'editor.BlockEdit', 'sgs/...', withMyPanel )` to inject an extra InspectorControls panel into every block's settings panel.
4. For the **Responsive Visibility** and **Hover Effects** extensions, a corresponding PHP `render_block` filter in `includes/device-visibility.php` and `includes/hover-effects.php` applies the class or inline style server-side so the output is correct on the frontend too.

### Adding a new extension

1. Create `src/blocks/extensions/my-extension.js` following the same pattern as `animation.js`.
2. Import it in `extensions/index.js`.
3. If the extension needs server-side output (e.g. injecting a CSS class), add a `render_block` filter in a new PHP file in `includes/` and require it from `sgs-blocks.php`.
4. Build: `npm run build`.

---

## Deployment process

The dev site is `palestine-lives.org`. All changes are deployed here first.

**Full deployment (theme + plugin):**

```powershell
cd plugins/sgs-blocks ; npm run build

scp -r plugins/sgs-blocks/sgs-blocks.php plugins/sgs-blocks/includes plugins/sgs-blocks/build plugins/sgs-blocks/assets hd:~/domains/palestine-lives.org/public_html/wp-content/plugins/sgs-blocks/ ;

scp -r theme/sgs-theme hd:~/domains/palestine-lives.org/public_html/wp-content/themes/
```

**Plugin only:**

```powershell
cd plugins/sgs-blocks ; npm run build ;

scp -r plugins/sgs-blocks/sgs-blocks.php plugins/sgs-blocks/includes plugins/sgs-blocks/build plugins/sgs-blocks/assets hd:~/domains/palestine-lives.org/public_html/wp-content/plugins/sgs-blocks/
```

**Theme only:**

```powershell
scp -r theme/sgs-theme hd:~/domains/palestine-lives.org/public_html/wp-content/themes/
```

**After every deployment — clear caches:**

```powershell
# Clear LiteSpeed page cache
ssh hd "rm -rf ~/domains/palestine-lives.org/public_html/wp-content/litespeed/cache/*" ;

# Reset PHP OPcache (CLI and web are separate pools)
ssh hd "echo '<?php opcache_reset(); echo ""ok"";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php" ;
curl -s https://palestine-lives.org/op-reset-tmp.php ;
ssh hd "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php"
```

**Run all commands from the project root:** `C:\Users\Bean\Projects\small-giants-wp`

### SSH host alias

The `hd` SSH alias points to the Hostinger shared hosting server. It is configured in `~/.ssh/config`. See `TOOLS.md` in the workspace for the connection details.

### What NOT to deploy

- `node_modules/` — not needed on the server
- `src/` — compiled output from `build/` is what WordPress uses
- `.gitignore`, `package.json`, `package-lock.json` — server does not need these

---

## Environment and tools

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | v22.18.0 | Build tooling only — not on the server |
| @wordpress/scripts | 30.x | Handles webpack, eslint, format |
| WordPress | 6.7+ | Block theme, no classic editor |
| PHP | 8.0+ | |
| Shell | PowerShell | Use `;` not `&&` to chain commands |

### Linting and formatting

```powershell
cd plugins/sgs-blocks

# Lint JavaScript
npm run lint:js

# Lint CSS
npm run lint:css

# Auto-format
npm run format
```

### Git workflow

All development is on the `feature/indus-foods-homepage` branch. Commit regularly with descriptive messages. Use the repo root as the working directory for all git commands:

```powershell
cd C:\Users\Bean\Projects\small-giants-wp

git add .
git commit -m "feat: add my-block block"
git push
```

No CI/CD pipeline — deployment is manual via `scp` as described above.
