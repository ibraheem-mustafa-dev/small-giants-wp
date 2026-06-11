# SGS Blocks — Claude Code Instructions

## What This Is

A custom Gutenberg block library (WordPress plugin) that replaces Spectra Pro. Produces clean semantic markup that reads design tokens from the SGS Theme. See build status below for what's built vs. planned.

Full spec: `specs/02-SGS-BLOCKS.md` (blocks) + `specs/04-SGS-FORMS.md` (forms)

## Plugin Structure

```
sgs-blocks/
├── sgs-blocks.php               # Plugin bootstrap
├── package.json                  # @wordpress/scripts + dependencies
├── webpack.config.js             # Build config
├── src/
│   ├── blocks/                   # One folder per block (block.json, edit.js, save.js, style.css, view.js)
│   ├── components/               # Shared editor components (ResponsiveControl, DesignTokenPicker, etc.)
│   ├── extensions/               # Block extensions (animation, visibility, spacing)
│   └── utils/                    # Token reader, responsive helpers
├── build/                        # Compiled output (deploy this, not src/)
└── includes/
    ├── class-sgs-blocks.php      # Main plugin class
    ├── block-categories.php      # Register SGS block categories
    ├── device-visibility.php     # Server-side render_block filter for responsive visibility
    ├── heading-anchors.php       # Auto-generates heading IDs for Table of Contents
    ├── lucide-icons.php          # Auto-generated Lucide icon library (1963 lines, exempt from limit)
    ├── render-helpers.php        # Shared colour/font-size helper functions
    ├── review-schema.php         # Schema.org review/rating output
    └── forms/                    # Form processing engine (REST API, DB, submissions)
```

## Block Pattern (Every Block Follows This)

```
block-name/
├── block.json       # Metadata, attributes, supports, scripts, styles
├── edit.js          # Editor component
├── save.js          # Static save (or null for dynamic blocks)
├── render.php       # Server-side render (dynamic blocks only)
├── editor.css       # Editor-only styles
├── style.css        # Frontend + editor styles
├── view.js          # Frontend interactivity (viewScriptModule)
└── index.js         # Block registration
```

## Block Categories

- `sgs-layout` — Container, Hero
- `sgs-content` — Info Box, Counter, Trust Bar, Heritage Strip, Card Grid, Testimonial, etc.
- `sgs-interactive` — Accordion, Testimonial Slider, WhatsApp CTA, Option Picker
- `sgs-forms` — Form, Form Step, Form Fields, Form Review

## Build Commands

```bash
npm run build         # Production (includes --experimental-modules for viewScriptModule)
npm run start         # Dev with hot reload
npm run lint:js       # ESLint
npm run lint:css      # Stylelint
```

The `--experimental-modules` flag is required for `viewScriptModule` in block.json. Check if stabilised in the installed @wordpress/scripts version.

The `--webpack-copy-php` flag copies `render.php` to `build/` automatically — dynamic blocks won't render without this.

`prebuild`/`prestart` also run `node scripts/check-dead-controls.js --check` — the **dead-control guard** (HC2, D192). It FAILS the build if any block declares an editor control for an attribute that nothing renders (consumes in render.php/save.js/view.js/shared includes). Run standalone with `npm run check:dead-controls`. Accepted exceptions live in `scripts/dead-controls-baseline.json` (empty = zero tolerance). If it false-positives a legit consumption pattern, broaden `collectControlledAttrs`/`isConsumed` in the script — do NOT dump the finding into the baseline. See `.claude/reports/wave2/HC2-COMPLETION-2026-06-09.md`.

**PLANNED — conformance gate (D193, approved 2026-06-09, NOT yet wired).** Two more build-time gates are designed (`.claude/reports/wave2/STAGE0-FRS-AND-GATE.md`) and land WITH the Wave-2 clone-fix build — do not assume they run until their scripts exist + are wired: **Gate A** — a converter golden-fixture regression (`tests/test_converter_conformance.py` over `tests/fixtures/conformance/*.json`) that fails on emit↔spec drift (the D178 cure; seeded one fixture/section + a regression lock per VERIFIED clone issue). **Gate B** — `scripts/check-hardcoded-render-defaults.js`, a sibling of the dead-control guard, failing the build when a `render.php`/`style.css` hardcodes a layout/visual constant for a property the block declares an attr for (the F3 family defence).

## Deploy

Use the tar method from the framework CLAUDE.md — `scp -r` creates nested directories on Hostinger.

```bash
# Build first
npm run build

# Deploy via tar (from repo root — see framework CLAUDE.md for full sequence)
cd /path/to/small-giants-wp
tar -cf sgs-deploy.tar --exclude='node_modules' --exclude='.git' --exclude='src' plugins/sgs-blocks
scp -P 65002 sgs-deploy.tar u945238940@141.136.39.73:sgs-deploy.tar
ssh -p 65002 u945238940@141.136.39.73 "WP=domains/palestine-lives.org/public_html/wp-content && rm -rf \$WP/plugins/sgs-blocks && tar -xf sgs-deploy.tar && mv plugins/sgs-blocks \$WP/plugins/ && rm -rf plugins sgs-deploy.tar"
rm sgs-deploy.tar

# Then clear caches — see framework CLAUDE.md for OPcache + LiteSpeed commands
```

## Block Build Status

### Content/Layout Blocks (26 built)

| Block | Status |
|---|---|
| Container | Deployed (SVG background layer added 2026-05-28 D93 — `bgSvg*` attrs + SVG tab in Background panel) |
| Hero | Deployed |
| Info Box | Deployed |
| Counter | Deployed |
| Trust Bar | Deployed (merged certification-bar capability + auto-scroll 2026-05-29 D95 — badgeStyle variants: icon-circle (default), text-only, image-badge; auto-scroll marquee when items overflow columns. Renamed from Trust Badges 2026-05-31. Dual-mode shipped 2026-06-01 FR-24-10: sourceMode='typed' (curated repeater) or 'bound' (echoes $content from converter). version 1.0.0+) |
| Icon List | Deployed |
| Card Grid | Deployed |
| CTA Section | Deployed |
| Process Steps | Deployed |
| Testimonial | Deployed (D8 2026-06-11 — typed-attr **7-VARIANT** rebuild: classic-card / pull-quote-editorial / rating-led / avatar-spotlight / corporate-logo / case-study-media / minimal-quote; visual thumbnail picker; rich gated optional fields [quote / summary-phrase / name / role / org / avatar / logo / work-image+video / stars-OR-/10-scale / date / verified / source] + per-element typography + hover scale/shadow. save.js→null; deprecated.js v8 migrates legacy scalar+InnerBlocks shapes [page-8 3-testimonial round-trip live-verified]. version 0.3.0. ON feat/block-quality-mirror — NOT yet merged) |
| Testimonial Slider | Deployed |
| Heritage Strip | Deployed |
| Brand Strip | Deployed |
| Notice Banner | Deployed (FR-22-6 InnerBlocks migration 2026-06-02 — render.php echoes `$content` + `sgs/text` child; deprecated.js v3. **E9 2026-06-11:** variant bg/border/colour made operator-overridable (`:where()`); dead `dismissible` button (no control / no JS handler) removed. version 0.7.0. feat/block-quality-mirror, not merged) |
| Icon | Deployed (shape backgrounds 2026-06-02 — `backgroundShape`: none/circle/pill/square/outline; clickable via existing linkUrl/linkTarget; hover controls: hoverIconColour / hoverShapeColour / hoverScale; deprecated.js v1. version 0.2.0) |
| WhatsApp CTA | Deployed |
| Accordion + Accordion Item | Deployed |
| Table of Contents | Deployed (broken — needs debugging) |
| Google Reviews | Deployed |
| Trustpilot Reviews | Deployed (2026-05-11 — looping carousel, white pill header, theme-inherited typography, hover scale + theme-primary border, Schema.org JSON-LD). Sync infrastructure shipped 2026-05-11 commit `06df2807` — see Backend Integrations below. |
| Pricing Table | Built (L14, needs build + deploy) |
| Modal | Built (L14, needs build + deploy) |
| Media | Deployed (video support added 2026-05-29 D97 — mediaType toggle, YouTube/Vimeo/MP4 external embeds, WP-library internal video, poster, playback controls) |
| Decorative Image | Built (L14, needs build + deploy) |
| Mega Menu | Built (L3, needs build + deploy) |
| Content Collection | Deployed (NEW 2026-06-03 — own WP_Query, selection rules: newest/featured/most-expensive/cheapest/most-popular/handpicked/category; renders each result as a Bound sgs/product-card; designed empty state; Inspector controls only. Spec 24 FR-24-4/5/6. version 1.1.0. Deployed to sandybrown canary.) |
| Option Picker | Deployed (sgs-interactive — exclusive radio-group pill chooser; Spec 24 FR-24-15 / D144 Phase A; no-JS-safe SSR + bubbling `sgs:option-selected` event; WCAG contrast fix on selected pill + overridable `--sgs-option-picker-*` colour vars. **C7 2026-06-11:** group-label font-size + colour controls (legend inline style). version 0.1.7. feat/block-quality-mirror) |
| Product Card | Deployed (dual-mode: Typed = InnerBlocks; Bound = live WooCommerce/CPT. **Spec 27 Phase-1 CONFIGURATOR SHIPPED D164:** Bound variable products read WC's live 48-SKU manifest (`includes/class-product-manifest.php`) seeded into per-instance `data-wp-context`; Size+Flavour pickers swap price/sale/stock/image with 0 XHR; secure add-to-cart via `/sgs/v1/cart/add-item` proxy; cross-attribute availability grey-out + `GET /sgs/v1/cart/availability/{id}`; all 4 a11y gates pass. Colon-event bridge via `data-wp-init` (WP won't bind `data-wp-on--` colon events). overridable `--sgs-product-card-*` vars + cardMaxWidth. **Spec 28 P1 value-ladder SHIPPED 2026-06-05 (D-pending):** SSR comparative per-unit ladder (Bound-mode only, NOT seeded into the 24KB client context) — one row per pack size with per-unit price + Rule-of-100 saving + "Best value" badge; monotonicity guard suppresses worse-value rows; honest claim-suppression when no `_sgs_base_price_pence` single-item reference is set (`framingMode`/`decoyEnabled` attrs; `sgs_value_ladder()`/`sgs_saving_display()` helpers; live-verified contrast 15.71:1). D151/D164 / Spec 27 FR-27-A/B/C/G/H + Spec 28 FR-28-7/8/9/9a/16. **D204 (main):** FP-H built-in-element card (connect+override). **Block-quality 2026-06-11 (feat/block-quality-mirror, not merged):** B3 Advanced-SEO crash fixed (`__experimentalNumberControl`), B4 fresh-card defaults to built-in template (legacy detected by stored InnerBlocks), B5 duplicate bound-mode CTA text/url gated out, B6 trial border overridable (`:where()`); picker-label forwarding (built-in Size/Flavour labels customisable via `pickerLabelFontSize`/`pickerLabelColour`); `packSizes` control wired (typed mode). version 1.16.4) |
| Cart | Deployed (WooCommerce mini-cart count badge v1 — Store API hydrate, SSR 0 then client-hydrate, no jQuery, cart-fragments dequeued, editor static placeholder; badge-increment E2E verified 2026-06-03; drawer mode = Phase 2) |
| Heading | Deployed (redundant `hero` block-style removed 2026-06-03 Task D. version 0.5.1) |

> **sgs/svg-background retired 2026-05-28 (D93).** SVG background capability merged into `sgs/container` as `bgSvg*` attrs (7 attrs: `bgSvgContent`, `bgSvgPosition`, `bgSvgAnimation`, `bgSvgAnimationSpeed`, `bgSvgOpacity`, `bgSvgMinHeight`, `bgSvgTextShadow`). Existing posts auto-migrate via `deprecated.js` v2 entry in container.

### Form Blocks (12 built)

| Block | Status |
|---|---|
| Form | Deployed |
| Form Step | Deployed |
| Form Review | Deployed |
| Form Field: Text, Email, Phone, Textarea, Checkbox, Radio, Select, Tiles, File, Consent | Deployed |

### Extensions (4 built)

| Extension | Status |
|---|---|
| Animation (15 scroll animation types) | Deployed |
| Responsive Visibility (device show/hide) | Deployed |
| Hover State Controls (bg/text/border colour) | Deployed (4 blocks: Info Box, Card Grid, CTA Section, Hero) |
| Off-Canvas Mobile Nav (M17) | Deployed (full-fix 2026-06-01 D143, v3.0.3: full-screen overlay + core/page-list menu expansion + header-only inserter scope; menu now reads the WP default page-list nav, not just manual navigation-link items) |

### Backend Integrations

| Integration | Settings page | Option key (read by) | Auto-sync | Status |
|---|---|---|---|---|
| Google Reviews | Settings > SGS Google Reviews | `sgs_google_reviews_settings` (sgs/google-reviews block) | Cache TTL (1-168h transient) | Deployed |
| Trustpilot Sync | Settings > SGS Trustpilot Sync | `sgs_trustpilot_data` (sgs/trustpilot-reviews block, `dataSource: synced`) | WP-cron `sgs_trustpilot_sync_event` weekly/daily | Deployed (2026-05-11, commit `06df2807`) |
| Font Library Collection | Site Editor > Styles > Typography > Manage fonts | n/a — `wp_register_font_collection( 'sgs-google-fonts' )` on init | Manifest fetched on modal open only | Deployed (2026-05-12, commit `55a6d73e`) |

**Font Library Collection notes:**
- PHP class at `includes/class-font-collection.php` (`SGS\Blocks\Font_Collection`) — registers the collection with `wp_register_font_collection()` on `init`, guarded by `function_exists()` for WP <6.5 (silent no-op on older WP).
- Manifest at `assets/font-collections/google-fonts.json` (~2.5 MB, 1,923 fonts, 5 categories) — pre-built from uimax `google_fonts` table by `scripts/build-font-collection.py` (idempotent; re-run when uimax google_fonts is refreshed). Gzip + 30-day immutable cache via `assets/font-collections/.htaccess` (Apache + LiteSpeed directives).
- **ZERO frontend cost**: WP's editor fetches the manifest only when the "Manage fonts" modal opens. No `@font-face` is enqueued until an operator explicitly installs and activates a typeface (writes to `wp_global_styles`, then enqueued per page).
- **Critical constraint**: do NOT add fonts from the collection to `theme.json` `settings.typography.fontFamilies` to make them "available" — WP enqueues every entry in fontFamilies on every page (WP Core issue #39332). The collection IS the available-fonts catalogue; theme.json is the active-fonts list.
- Re-build the manifest: `python plugins/sgs-blocks/scripts/build-font-collection.py` (writes back to `assets/font-collections/google-fonts.json` idempotently; `--self-test` validates).

**Trustpilot Sync notes:**
- Backend at `includes/trustpilot/` — 4 classes (Trustpilot_Sync, Trustpilot_REST, Trustpilot_Cron, Trustpilot_Settings)
- Admin JS at `assets/admin/trustpilot-sync.js` (Sync-now button via wp.apiFetch + X-WP-Nonce)
- REST endpoint `POST /wp-json/sgs/v1/trustpilot-sync` (manage_options gated)
- Browserless `/content` REST endpoint — `?token=<key>` auth (NOT `Authorization: Bearer` — that returns HTTP 500 on this endpoint). Key encrypted AES-256-CBC at rest, keyed off `wp_salt('auth')`.
- JSON-LD parser harvests standalone `Review` entities from `@graph` (Trustpilot's reference pattern — `LocalBusiness.review[]` holds `@id` pointers, not inline entities)
- Activity log (last 5 attempts) + `last_sync_status` badge on settings page = operator failure surface. No Telegram/n8n side channel.
- Lesson: `~/.openclaw/workspace/memory/learning/2026-05-11-sgs-trustpilot-sync-via-browserless-working-setup.md` and blub.db row 238

### Phase 2 — Not Started (P1 priority)

| Block | Notes |
|---|---|
| Post Grid / Query Loop | Grid/list/masonry/carousel + AJAX pagination + category filtering |
| Image Gallery + Lightbox | Grid/masonry/carousel + Interactivity API lightbox |
| Tabs | Built — not yet deployed |
| Countdown Timer | Date-based + evergreen; flip/simple variants |
| Star Rating | SVG stars; Schema.org/Rating |
| Team Member | Photo/name/role/bio/socials; Schema.org/Person |

### Phase 2 — Extensions Not Started (P1 priority)

| Extension | Notes |
|---|---|
| Hover scale transform | `transform: scale()` on hover (GPU-composited) |
| Hover shadow elevation | Box-shadow transition on hover |
| Hover image zoom (inner) | `overflow:hidden` + scale on `<img>` |
| Transition duration/easing control | CSS transition shorthand per block |
| Block link (wrap entire block in link) | URL + target in inspector |

See `docs/plans/2026-02-21-master-feature-audit.md` for the full 354-feature graded roadmap.

Update this table as blocks are committed/deployed.

## Block Customisation Standard (MANDATORY)

Every block MUST provide per-element customisation matching Kadence/Spectra depth:

1. Native WordPress `supports` for wrapper-level controls (colour, typography, spacing, border)
2. Custom attributes + controls for each inner text element (colour, font size)
3. Custom attributes + controls for interactive elements like CTAs (text colour, background colour)
4. CSS fallback colours use `:not([style*="color"])` so custom values always win
5. Use Block Selectors API in `block.json` to target native typography to primary text element
6. **Variant-bearing blocks MUST declare `supports.sgs.variants`** in `block.json` — a map of `variant_value → [attr/slot names that variant uses]` — so the cloning converter can detect the correct variant from what the draft extracted, without per-block code. The variant-selector attr name (e.g. `variant`, `variantStyle`, `layout`) MUST also be registerable to the `blocks.variant_attr` DB column via `/sgs-update`. (FR-22-20, DESIGN/build-pending — see Spec 22 §FR-22-20 + D133. Build = next session opening task.)

### Hover Controls Spec (Phase 2)

Blocks with interactive hover states MUST expose these controls in the editor inspector:
- **Per-element colour shifts** — background, text, border colour on hover (DONE in Phase 1.3 for 4 blocks)
- **Scale transform** — `transform: scale()` on hover (GPU-composited, safe)
- **Shadow elevation** — box-shadow transition on hover
- **Image zoom (inner)** — `overflow:hidden` + scale on `<img>` on hover
- **Transition duration** — CSS transition-duration control (default 300ms)
- **Transition easing** — CSS transition-timing-function (ease, ease-in-out, etc.)

These are not just colour shifts. Kadence and Spectra offer transform and shadow controls — SGS must match or exceed.

## Utility Functions

Import from `../../utils`:

```js
import { colourVar, fontSizeVar, spacingVar, shadowVar, borderRadiusVar, transitionVar } from '../../utils';
```

| Function | Returns |
|---|---|
| `colourVar('primary')` | `var(--wp--preset--color--primary)` |
| `fontSizeVar('large')` | `var(--wp--preset--font-size--large)` |
| `spacingVar('40')` | `var(--wp--preset--spacing--40)` |
| `shadowVar('medium')` | `var(--wp--preset--shadow--medium)` |
| `borderRadiusVar('medium')` | `var(--wp--custom--border-radius--medium)` |
| `transitionVar('fast')` | `var(--wp--custom--transition--fast)` |

Use `DesignTokenPicker` component for colour selection from theme.json palette in the editor sidebar.

## Gotchas

- **Deprecations required** — when changing a static block's `save.js` output, you MUST add a deprecation. Otherwise existing posts show "This block contains unexpected content" errors.
- **Empty innerHTML → null-save deprecation** — blocks inserted via WP-CLI often have empty `innerHTML` (no serialised HTML). If `save.js` later returns actual HTML, you get "unexpected content" validation errors. Fix: add `deprecated.js` v1 with `save: () => null`. If attribute field names also changed (e.g. `heading` → `title`, `certifications[]` strings → `items[]` objects), add a `migrate()` that transforms them. See `src/blocks/process-steps/deprecated.js` for the full pattern.
- **Core block attribute mismatches** — when `core/heading`, `core/button`, etc. show "unexpected content", the cause is a JSON attribute that doesn't match stored HTML. Fix via the Site Editor: open the template/page, click "Attempt Block Recovery" on each invalid block, then save. NEVER fix via WP-CLI `str_replace` on `post_content` — this breaks block validation and creates cascading failures.
- **Never use `source: html` on dynamic blocks** — if a block's `save()` returns `null` (dynamic render via render.php), attributes with `"source": "html"` can never be read from storage because there is no inner HTML. Use plain `"type": "string", "default": ""` instead. This caused the hero headline bug on 2026-03-22.
- **Dynamic blocks with InnerBlocks slots MUST `save: () => <InnerBlocks.Content />`** — `save: () => null` causes WordPress to drop InnerBlocks from `post_content` during save. Editor shows the right structure in memory, save round-trip emits only the parent. Render.php still drives 100% of frontend output; save's only job is to emit the InnerBlocks marker. Pattern: `import { InnerBlocks } from '@wordpress/block-editor'; export default function Save() { return <InnerBlocks.Content />; }`. Caught 2026-05-04 in product-card / cta-section / info-box. Hero already had it. Full detail in `.claude/specs/common-wp-styling-errors.md` row B4.
- **Never modify `post_content` via WP-CLI or PHP scripts** — use the Site Editor or `wp.data.dispatch('core/block-editor')` via Playwright. A PreToolUse hook (`wp-content-guard.py`) enforces this.
- **`style.css` vs `editor.css` are independent** — `style.css` compiles to the frontend-only `style-index.css`. `editor.css` compiles to the editor-only `index.css`. A layout fix in one does not affect the other. When fixing a visual issue in `style.css`, add matching rules to `editor.css` separately if the editor preview should match.
- **`viewScriptModule` vs `viewScript`** — use `viewScriptModule` (ES modules, deferred). Don't use `viewScript` (classic scripts).
- **CSS `color` fallback pattern** — use `:not([style*="color"])` selectors so inline styles from the editor always win over CSS defaults.
- **`useInnerBlocksProps`** — always use this (not `InnerBlocks` component directly) for proper block editor integration.
- **CPT `custom-fields` support required for meta REST exposure** — a custom post type must declare `'supports' => [ ..., 'custom-fields' ]` in `register_post_type()` for any `register_meta()` call with `'show_in_rest' => true` to expose the `meta` field in REST responses. Without it, meta round-trips silently return nothing. Caught 2026-06-02 during product-card variation-sets panel work.
- **Theme CSS cache-busts off the theme `style.css` Version header, not `block.json`** — SGS theme enqueues `style.css` with `?ver=` derived from the `Version:` field in `theme/sgs-theme/style.css`. Any theme-CSS change (including token updates) requires bumping that Version header (e.g. 1.3.5 → 1.3.6) to bust the browser cache. Bumping `block.json` or plugin version has no effect on theme CSS.
- **No dead controls — parent owns LAYOUT, child owns TYPOGRAPHY (HC2, D192).** When a composite renders its text via child InnerBlocks (`sgs/heading`/`sgs/text`/`sgs/label`), all typography/colour/font-size (every breakpoint) belongs on the CHILD, NOT the parent. A parent control duplicating a child capability is BOTH a forbidden duplicate AND usually **dead by CSS specificity** — a parent scoped rule `.{uid} .sgs-x__y{color}` (0,2,0) cannot beat the child's inline style (1,0,0,0), so it renders nothing. The `check-dead-controls.js` prebuild guard fails the build on any editor-controlled attr that nothing renders. **This scopes the "Block Customisation Standard" §2 ("custom controls per inner text element"): that applies ONLY to blocks that render their own text element — NOT to FR-22-6 InnerBlocks composites, whose text is child-owned.** Verify a control renders via the live DOM (computed style on the actual painted element), not just "the attr appears in render.php".

## Adding a deprecation when a block's save output changes

Whenever you change a static block's `save.js` output OR a block.json attribute schema that affects what gets stored in `post_content`, existing posts will fail validation with "This block contains unexpected content". The fix is a `deprecated.js` entry covering the previous shape.

**Procedure:**

1. Capture the previous save output and the previous attribute schema verbatim (use `git show <prev-sha>:path/to/block/save.js`).
2. Create or edit `src/blocks/<block>/deprecated.js`. Each version object has `{ attributes, save, migrate? }`.
3. For static→null conversions (block became dynamic via render.php), the new entry's `save` reproduces the old static HTML.
4. For attribute renames or shape changes, add a `migrate(attributes)` that returns the new-shape attributes.
5. Wire the array into `index.js`:
   ```js
   import deprecated from './deprecated';
   registerBlockType( metadata.name, { edit: Edit, save: Save, deprecated } );
   ```
6. Order matters — newest version first: `export default [ v3, v2, v1 ];`.
7. Run `npm run build`. Open an affected post in the editor and confirm zero "Invalid block" warnings.
8. Add the block slug to `AFFECTED_BLOCKS` in `tests/php/BlockDeprecationsTest.php` and run `vendor/bin/phpunit tests/php/BlockDeprecationsTest.php`.

**Canonical examples:** `src/blocks/process-steps/deprecated.js` (empty-innerHTML → null-save), `src/blocks/testimonial/deprecated.js` (static→null, multiple historical shapes), `src/blocks/notice-banner/deprecated.js` (emoji→SVG icon change with default-attribute backfill).

## Retired blocks — back-to-top + reading-progress (2026-05-18, Spec 17 Wave 2 Polish 1b)

The `sgs/back-to-top` and `sgs/reading-progress` blocks were fully removed (`src/` + `build/` directories deleted, no `deprecated.js` shim). Floating UI for both behaviours migrates to the Customiser at *Appearance → Customise → SGS Floating UI* (separate spec; ship date TBD). Existing post content carrying `wp:sgs/back-to-top` or `wp:sgs/reading-progress` markers will render WordPress's generic "block has been deleted" placeholder until operators remove the blocks and reconfigure via the Customiser. A one-shot dismissible admin notice (`Sgs_Site_Info_Admin_Notices::maybe_show_deprecated_blocks_notice`) surfaces the migration path on next admin load for `edit_theme_options` users.

## Forms (Built Into This Plugin)

Forms are NOT a separate plugin. The form blocks (`sgs/form`, `sgs/form-step`, `sgs/form-field-*`, `sgs/form-review`) and the form processing engine all live here.

- Core form blocks needed for Indus Foods: Phase 1b
- Advanced form features (conditional logic, address lookup, payment, GDPR hooks): Phase 2

Database table: `{prefix}sgs_form_submissions`
REST namespace: `sgs-forms/v1`
Notifications: N8N webhooks (not wp_mail)

## Key Rules

- Every block reads colours/fonts from theme.json tokens — never hardcode
- Frontend JS: vanilla only, no jQuery, no external libraries
- Use `viewScriptModule` (ES modules) for frontend interactivity
- CSS scroll-snap for carousels, Intersection Observer for animations
- Progressive enhancement: blocks must render meaningful content without JS
- All inner blocks use `useInnerBlocksProps` correctly
- All REST endpoints: nonces, capability checks, sanitised input, prepared statements
- Responsive: every layout block has mobile/tablet/desktop controls

## Build Phase

Phase 1 (core blocks + extensions) is **complete**. Phase 2 is now active — building the highest-impact missing blocks (Post Grid, Gallery, Tabs) and extending hover controls across all blocks. See the Block Build Status tables above for what's done and what's next.

## Deployment

Build locally (`npm run build`), deploy the `build/` directory + PHP files via SCP. No Node.js on the server.
