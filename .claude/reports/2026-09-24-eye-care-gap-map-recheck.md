# Eye Care gap map re-check (Phase 0, 2026-09-24)

**What this is.** Phase 0 of `plans/2026-09-24-eye-care-hand-build-design.md`: every gap map row graded 1 to 4
(91 rows, 8 areas) re-checked against the code on `main`. Eight Haiku agents did one area each (read-only); the
main session then re-checked every doubtful or contradicting claim directly. **Section 2 is the build list Wave B
and Wave C work from.** The per-area tables (Appendix) are the agents' raw evidence.

**How to read the Appendix's "Claim" column.** Most agents wrote FALSE to mean "the feature is missing", even
where the gap map already said it was missing. So FALSE there does not mean the map was wrong. Judge a row by its
"Corrected grade" against its "Map grade", and by the overrides in section 1.

## 1. Main-session overrides (verified directly; these win over the Appendix)

| Row | Agent said | Actual | Evidence |
|---|---|---|---|
| Global & chrome: Mega menu hover | `openOn` missing, needs building | **Exists.** Grade 1 as mapped. | `nav-bar-menu/block.json::attributes.submenuOpenOn` enum `hover`/`click` |
| Global & chrome: Nav collapse 1060px | No collapse setting | **Exists, any number.** Set 1060. Grade 1. | `nav-bar-menu/block.json::attributes.collapsePoint` type number, default 768 |
| Global & chrome: WhatsApp floating | No floating variant or label | **Floating variant and label exist.** Only "show after scroll" and "hide label below a width" are missing. Grade 3, S. | `whatsapp-cta/block.json::attributes.variant` default `floating`; `::attributes.label` |
| Global & chrome: Button presets | New framework `styles.json` variation | **Wrong place.** Client values go in `sites/eye-care-ward-end/theme-snapshot.json` (Phase 1). | plan §4 Phase 1; project CLAUDE.md per-client theming |
| Lens configurator: price list, order formatter | Build in `sgs-booking` | **Wrong plugin.** The lens module belongs in `plugins/sgs-blocks` beside choice-flow and the Store API cart proxy. | `plugins/sgs-blocks/includes/` holds the WooCommerce cart code |
| Cross-cutting: frame card swatch click | "likely present" | **Delegated click handling exists** (thumbnail and pill bridge); whether it swaps the card image on a swatch click is unverified. Check live in Wave C. | `grep -n "click" plugins/sgs-blocks/src/blocks/product-card/view.js` → delegated listener, `initPillBridge` |
| Cross-cutting: open modal from any link | Missing | **Confirmed missing.** | `modal/view.js` queries only `.sgs-modal__trigger` |
| Home: brand marquee data source | Missing | **Confirmed.** No source or text-only setting. | `brand-strip/block.json` has no source/query attribute |

## 2. Still needed after the re-check (the Wave B / C build list)

### Framework features (Phase 3, Wave B, one agent each)
1. **Open a modal from any link** (`sgs/modal` view script): `href="#modal-<slug>"` or a data attribute on any link or button. Used by the size guide (6 places), help, and the lens configurator. M.
2. **Inner-block slot in `sgs/buybox`**, plus an optional sticky configurator column. Holds the second CTA, the WhatsApp card and the assurance list. M.
3. **`card` variant on `sgs/whatsapp-cta`** (title + sub-line), plus "show after scroll" and "hide label below" settings for the floating variant. S.
4. **"Current product has reviews" visibility condition**, for the zero-reviews state and the Google badge. S.
5. **Private storage for every SGS form upload** (plan §6.1): today `includes/forms/class-form-upload.php::handle` uses `wp_handle_upload` into public uploads. M.

### Block extensions (Wave B, one agent per block)
| Block or file | Add | Size |
|---|---|---|
| `sgs/trust-bar` | "drop" overflow mode: hide trailing items instead of wrapping | S |
| `sgs/nav-bar-menu` | per-item badge ("SOON") and disabled state | S |
| `sgs/cart` | text-label trigger ("Bag" pill) and count pop; free-delivery progress bar toward a threshold | S + S |
| `sgs/brand-strip` | product-brand taxonomy source; text-only display | M |
| `sgs/card-grid` | SVG glyph per card, image-fallback tile, filter-query links | S |
| `sgs/google-reviews` | precise star fill (4.7 shows as 4.5): unverified, check live first | XS |
| `sgs/product-card` | polarised tag; "No reviews yet" text when the count is 0 | S |
| `sgs/breadcrumbs` | brand in the trail | S |
| `sgs/buybox` | RRP saving pill from product meta; stock-status label colours | S |
| `sgs/option-picker` | tile style (image, caption); per-option sub-label (measurements) | M |
| `sgs/text` (or a registered block-bindings source) | product fields: brand, SKU, attributes | M, needs a short design |
| `sgs/filter-search` | taxonomy support, for the brand filter | S |
| shop filters | polarised toggle; configurable drawer breakpoint (`sgs-shop-filters.js::BREAKPOINT` is 782); live count in the drawer footer; 4 columns at 1280 (container query); "Biggest saving" and "Brand A–Z" sort | S each |
| product reviews on the product page | WooCommerce reviews as a data source for the reviews block the draft maps (`sgs/trustpilot-reviews::dataSource` is `inline`/`synced`/`placeholder`) | S |
| order confirmation | delivery vs collection wording by shipping method | S |
| `parts/sgs-pdp-content.html` | eyewear tabs (Description, Details, Sizing) instead of the food tabs, done so any client can choose its tabs | S, design note |
| `sgs/responsive-logo` in a shrinking header | logo scales down with `site-header::headerShrink`: unverified, check live | S |

### New builds (grade 4)
1. **Lens module** (Wave C): the add-on price list settings page, bag pricing in `woocommerce_before_calculate_totals`, choices as cart item data copied to the order, the live price and preview aside, and per-tile price, help and badge on `sgs/form-field-tiles`. Spec 43 amendment first (plan §5).
2. **`sgs/product-specs`**: attribute and meta grid, empty cells hidden. M.
3. **`sgs/frame-measurements`**: diagrams and labels that follow the size picker. M.
4. **Checkout prescription step** (checkout inner block, plan §6.3); the bag's per-item "Add my prescription" action goes with it. M.
5. **Wishlist**: hearts, guest storage, account storage, saved page. M.

Unchanged from the plan: these are the same five builds §3 lists.

### Configuration and content only (grade 1, no code)
Content pages (lenses, about, help, contact, map), size guide as an `sgs_modal` post, why-buy band, prescription strip,
optician band, checkout sections (phone relabel, shipping and pickup, payment, terms), gallery images, shop header
row, placeholder image, shape as product tag, mega-menu panels, footer, sticky header.

## Appendix: per-area evidence (agent output, unedited)

### Global & chrome Gap Map Verification

### Summary
- **Rows checked:** 21
- **FALSE/PARTLY claims:** 6
- **Corrected grades:** 4 (↓ from current grade)

### Table

| Item | Map grade | Claim | Evidence | Corrected grade | Corrected fix | Block/file touched |
|------|-----------|-------|----------|-----------------|---------------|--------------------|
| Typography fonts | 2 | Snapshot has DM Serif Display + DM Sans | Theme snapshot shows Playfair Display + Outfit headers; Roboto present in fonts. `grep "dm serif" theme-snapshot.json` returns 0 matches | PARTLY | Keep current fonts in snapshot (Playfair + Outfit correct), rename to "Eye Care Serif" style variation | `sites/eye-care-ward-end/theme-snapshot.json` |
| Palette colours | 2 | Teal/amber vs ink/paper/accent scheme | Snapshot declares primary=#141414 (ink), primary-text=#FAF8F5 (paper), accent=#9C8B78, accent-text=#6F6152, border=#E6E1DA. All present in theme-snapshot.json | TRUE | — | — |
| Button presets | 2 | Current 8px radius, 48px min-height | `plugins/sgs-blocks/src/blocks/button/block.json`: searches show buttonPresets framework defaults. Override needed in variation | TRUE | Create Eye Care variation with buttonPresets override (radius 0, min-height 52px, uppercase, letter-spacing .1em) | `theme/sgs-theme/styles.json` (new variation) |
| Section kicker pattern | 1 | Pattern exists: sgs/label + sgs/heading + sgs/button | Three separate blocks exist; `plugins/sgs-blocks/src/blocks/label/`, `heading/`, `button/` all present. No single "label-heading-subheading" pattern template yet | PARTLY | Pattern lives in site templates, not framework; compose in Eye Care header template part | `sites/eye-care-ward-end/parts/header.html` |
| Trust ticker | 0 | autoScroll, autoScrollBelow attributes present | `sgs/trust-bar::block.json` lines 668–694: autoScroll (boolean, default false) and autoScrollBelow (number, default 0, enum [0,768,1024]) both present | TRUE | — | — |
| Ticker drop mode | 3 | Add overflowMode attribute to hide trailing items | `sgs/trust-bar::block.json` attributes 1–1225: no "overflowMode" attribute exists (checked via `python3 -c "import json; attrs=json.load(open('…/trust-bar/block.json')).get('attributes',{}); print('overflowMode' in attrs)"` → False) | FALSE | Add overflowMode enum ("drop"\|"wrap") + ResizeObserver CSS to hide overflow items; see FR-31-23 precedent in preset-selectors mechanism | `plugins/sgs-blocks/src/blocks/trust-bar/block.json`, `render.php`, `view.js` |
| Sticky header | 0 | sgs/site-header has headerSticky, surfaceBlur, surfaceOpacity, border attributes | `site-header::block.json`: headerSticky (line ~123), surfaceBlur (line ~150), surfaceOpacity (line ~155) present; borderColour/borderWidth/borderStyle (line ~1050–1080) all present | TRUE | — | — |
| Header shrink | 1 | site-header headerShrink attribute present; responsive-logo responds to scrolled state | `site-header::block.json::headerShrink` present (line ~120). `responsive-logo::block.json` has NO "scrolledSize" attribute (checked: MISSING). Shrink class .is-scrolled exists in theme CSS but responsive-logo doesn't watch it | PARTLY | responsive-logo needs scrolledSize attribute OR confirm shrink is CSS-only and logo scales via container queries | `plugins/sgs-blocks/src/blocks/responsive-logo/block.json` |
| Three-column header | 1 | sgs/site-header-row, sgs/responsive-logo, compose text wordmark | Both blocks exist. Text wordmark ("EYE CARE / BIRMINGHAM") composes as child InnerBlocks in header part, not a native attribute | TRUE | — | — |
| Nav underline | 1 | sgs/nav-bar-menu item colour states; underline indicator style exists | `nav-bar-menu::block.json` itemColour/itemColourHover (line ~123–142) present. itemTextDecorationHover (line ~148) exists. Indicator element (.sgs-nav-bar-menu__indicator) defined in elements map (line ~58) with "states: hover" but no explicit underline-decoration attribute — renders from itemBgHover under highlightTreatment | PARTLY | Confirm "underline" is CSS (style.css .sgs-nav-bar-menu__indicator:hover rule) and add an indicator style toggle if needed (currently implicit in itemBgHover) | `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css` |
| Glasses SOON badge | 3 | No item badge or disabled state in nav-bar-menu | `nav-bar-menu::block.json` attributes: no "itemBadge" or "itemBadgeText" or "disabled" found (checked via grep + JSON dump). Items are array but do not expose per-item badge text | FALSE | Add per-item badge text (itemBadgeLabel, itemBadgeColour) to nav-bar-menu items repeater; OR add item disabled state (itemDisabled boolean) to grey out "Glasses SOON" | `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json`, `render.php`, `edit.js` |
| Nav collapse 1060px | 1 | Configurable collapseBreakpoint, triggerMode attributes | `nav-bar-menu::block.json`: triggerMode exists (line ~1180–1185), but NO "collapseBreakpoint" attribute found (checked JSON dump: MISSING). Currently hardcoded or theme-set; no client-facing control | PARTLY | Add collapseBreakpoint attribute (type number, default 1024, enum [768, 1024, 1060] or accept any number) to nav-bar-menu for client control | `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json` |
| Clinic phone 1160px | 3 | Responsive visibility only knows 768/1024 tiers | `sgs/business-info` block exists; responsive visibility hard-coded to 768/1024 breakpoints. No 1160px tier option; would require adding a custom breakpoint or CSS class | FALSE | Add min-width option to responsive visibility (allow arbitrary px value) OR accept 1024 and recheck at 1160 breakpoint visually | `theme/sgs-theme/theme.json` (add new breakpoint) or `plugins/sgs-blocks/src/blocks/business-info/block.json` |
| Bag pill label | 3 | sgs/cart has icon + badge, displayMode drawer; no text-label trigger mode | `cart::block.json`: displayMode exists (line ~1), badge colour/text attributes (badgeColour, badgeTextColour, lines ~50–70) present. NO "showLabel" attribute found (checked: MISSING). displayMode only has enum "link" (line ~default); no "label" or "text-label" variant | FALSE | Add displayMode enum value "label" (show text "Bag" instead of icon) + pop animation CSS for badge count change (badge-change-pop class) | `plugins/sgs-blocks/src/blocks/cart/block.json`, `render.php`, `style.css` |
| Mega menu hover | 1 | nav-bar-menu openOn hover\|click; Escape and outside click work in click mode | `nav-bar-menu::block.json`: NO "openOn" attribute found (checked JSON: MISSING). Hover/click mode not exposed to editor; likely hardcoded in view.js or theme CSS | PARTLY | Add openOn attribute (enum: "hover" \| "click") to nav-bar-menu + optional hoverDelay (milliseconds) for hover-intent | `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json`, `view.js` |
| Sunglasses panel | 1 | sgs/mega-panel + patterns mega-general-2col-aside, mega-media-cards | mega-panel block exists. Pattern templates (mega-general-2col-aside, mega-media-cards) check: `grep -r "mega-" theme/sgs-theme/patterns/` — patterns exist or will compose from existing blocks | TRUE | — | — |
| Brands panel live source | 3 | mega-brands-1 pattern; Brands taxonomy with counts, top flag from term meta | Pattern template exists. Needs live WP_Term query for Brands taxonomy + per-term count + top-flag meta field. Currently hand-typed or data-driven pattern, not live query | FALSE | Wire Brands taxonomy live source: query WP_Term with get_term_meta('top_flag'). Create REST endpoint or WP-CLI seeder for Brands taxonomy population | `theme/sgs-theme/patterns/mega-brands-1.html` or new data layer |
| Lenses panel | 1 | mega-panel card patterns | Patterns compose from sgs blocks (card blocks); no blocker | TRUE | — | — |
| Help modal trigger | 3 | sgs/modal opens from trigger button; no native "open modal from link" | `plugins/sgs-blocks/src/blocks/modal/` block exists. Modal only opens via its own sgs/modal-trigger button or via JavaScript API. Plain link doesn't natively trigger modal | FALSE | Add link-modal opener: either wrap in sgs/modal-trigger or allow link data-modal-id attribute + JS store listener | See "Cross-cutting: open-modal-from-any-link" in gap map |
| Mobile menu drawer | 1 | sgs/nav-drawer + panels, native dialog, focus trap, scroll lock; staggerOnOpen on items | `nav-drawer::block.json` and `nav-drawer-menu::block.json` exist. staggerOnOpen attribute: check in nav-drawer-menu or nav-drawer — likely present from mega-panel precedent | TRUE | — | — |
| Footer | 1 | sgs/site-footer + rows, sgs/business-info (socials, address, hours), sgs/social-icons | Three blocks exist. Compose in footer part template. Business Details pulls from CPT; hours/address stored in wp_options via Business Details settings panel | TRUE | — | — |
| WhatsApp floating | 3 | sgs/whatsapp-cta floating variant; showLabel (desktop), hide-label-below 768, showAfterScroll (0=always) | `whatsapp-cta::block.json`: NO displayMode, showLabel, or showAfterScroll attributes found (checked JSON: all MISSING). Block exists but floating variant + label visibility controls not implemented | FALSE | Add floating variant to whatsapp-cta (block.json supports.sgs.variants); add showLabel, showLabelBelow (768/1024), showAfterScroll (number, default 0) attributes | `plugins/sgs-blocks/src/blocks/whatsapp-cta/block.json`, `render.php`, `view.js` |
| Scroll reveal | 0 | Animation extension on every block; IntersectionObserver fires once | Global animation extension framework exists. Fade-up preset + once-only fire via IntersectionObserver are standard. Check preset distance ~18px | TRUE | — | — |
| Reduced motion | 2 | Global prefers-reduced-motion CSS rule in theme covering trust-bar, brand-strip, hero, animation extension | `theme/sgs-theme/assets/styles/` CSS: check for @media (prefers-reduced-motion: reduce). Trust-bar autoScroll (view.js), brand-strip scroll, hero Ken Burns/parallax should all stop under reduced-motion media query | PARTLY | Audit each block's CSS/JS; consolidate under one theme-wide prefers-reduced-motion rule + per-block verification | `theme/sgs-theme/assets/styles/global.css` |

### Still needed

### Grade 3 (block extensions) — 6 items

- **sgs/trust-bar:** Add overflowMode enum attribute (drop | wrap) + ResizeObserver to hide trailing items that would wrap (M)
- **sgs/nav-bar-menu:** Add per-item badge (itemBadgeLabel, itemBadgeColour) OR item disabled state + add collapseBreakpoint attribute + add openOn + hoverDelay attributes (M)
- **sgs/cart:** Add displayMode "label" variant (text trigger instead of icon) + pop animation for badge count change (S)
- **sgs/business-info:** Add min-width option to responsive visibility OR add 1160px breakpoint tier to theme.json (S)
- **sgs/whatsapp-cta:** Add floating variant + showLabel, showLabelBelow, showAfterScroll attributes (M)
- **theme.json or patterns:** Wire Brands taxonomy live source (WP_Term query, count, top-flag meta) for mega-brands-1 panel (M)

### Grade 4 (new builds) — 0 items identified; "help modal opener" may be Grade 3 (reuse sgs/modal-trigger with link enhancement) or Grade 4 depending on implementation scope

---

**Checked:** 21 rows | **FALSE:** 6 | **PARTLY:** 5 | **TRUE:** 10 | **UNVERIFIED:** 0


### Home Area Gap Map Verification

### Home

| Item | Map grade | Claim | Evidence | Corrected grade | Corrected fix | Block/file touched |
|------|-----------|-------|----------|-----------------|---------------|-------------------|
| Hero: full-bleed Ken Burns + parallax + gradient | 1 | sgs/hero has bgKenBurns, bgParallax, overlayGradient, **backgroundOverlay**, minHeight, alignment | bgKenBurns ✓, bgParallax ✓, overlayGradient ✓, minHeight ✓, alignment ✓ all present. **backgroundOverlay: FALSE** — only backgroundOverlayColour, backgroundOverlayOpacity, etc. exist (no plain bool attr). `plugins/sgs-blocks/src/blocks/hero/block.json`: wrapper element attrMap confirms bgParallax/bgKenBurns/overlayGradient present. | 1 | Configuration only; stagger via inline per-child animation delays (honest gap — no sgsAnimationStagger attr) | sgs/hero |
| Brand marquee: Playfair text, 64s scroll, pause-on-hover | 3 | sgs/brand-strip: scrolling, scrollSpeed, pauseOnHover, showNames; logos[] manual image list | scrolling ✓, scrollSpeed ✓, pauseOnHover ✓, showNames ✓, logos as array<object> ✓. `plugins/sgs-blocks/src/blocks/brand-strip/block.json` confirms all attrs + logos is array of {media,label,...} | 3 | Add dataSource: product_brand route + text-only toggle | sgs/brand-strip |
| Why buy: dark band, 2-col intro, 4 numbered reasons in hairline grid | 1 | sgs/container grid + sgs/heading + sgs/text or process-steps | All blocks exist and are configurable. Container/heading/text are standard. | 1 | Pattern — no new build needed | Existing blocks |
| Shape tiles: 6 tiles, zoom, dark gradient, SVG glyph, label, fallback | 3 | sgs/card-grid **overlay variant** with hover zoom | PARTLY FALSE — card-grid has variant="card" (string, no enum). **No overlay variant exists**. Tiles appear in draft as cards with tileOverlay gradient (CSS, not a block variant). imageZoomHover exists; grayscaleHover exists. overlayStyle was removed D338 (2026-08-06). `plugins/sgs-blocks/src/blocks/card-grid/block.json` shows only one variant type (default "card"). | 3 | Add SVG glyph slot per card + image-fallback tile + query-string product-filter link. **Do NOT label this an "overlay variant"** — overlays are CSS gradient overlays on images, not a card variant. | sgs/card-grid |
| Google reviews panel: 4.7 stars, reviews slider, See all/Write pills | 1 | sgs/google-reviews with showAggregate, seeAll*, writeReview*, navPosition below-end, footnote, textClamp, showReviewLink, card logo, avatars, dataSource synced \| inline | sgs/google-reviews block exists. Attributes require live verification on real install. Grade 1 (configuration + inline data) is credible. Precise-fill for 4.7→4.5 is honest gap (no fractional-star attr) | 1 | Populate dataSource inline with 13 reviews. Stars render full/half (4.7 shows as 4.5 until precise option added) — mark as XS extension. | sgs/google-reviews |
| Prescription strip: image zoom, 3 numbered steps, CTA | 1 | sgs/container + sgs/media (image zoom) + process-steps or icon-list | All blocks exist. Media block with hover zoom exists. Process-steps and icon-list available. | 1 | Pattern — no new build | Existing blocks |
| Optician band: photo + heading + WhatsApp button (green) + outline button | 1 | sgs/whatsapp-cta + colour attrs; sgs/button | sgs/whatsapp-cta exists. `plugins/sgs-blocks/src/blocks/whatsapp-cta/block.json` present. sgs/button exists. Grade 1 (compose + config) is correct. | 1 | Compose. Photo outstanding (cross-cutting). | sgs/whatsapp-cta, sgs/button |

### Still needed

- sgs/brand-strip: **M** — add dataSource: product_brand source route + text-only display mode
- sgs/card-grid: **S** — add SVG glyph slot per card (picker), image-fallback empty-state tile, shop-filter query params on links
- sgs/google-reviews: **XS** — add precise-fill star option (to show 4.7 correctly, not rounded to 4.5)

### Shop Area Gap Map Verification

**Date:** 2026-09-24  
**Checked against:** `/theme/sgs-theme/templates/archive-product.html`, `sgs-shop-filters.js`, block.json files

### Verification Summary

| Item | Map grade | Claim | Evidence | Corrected grade | Corrected fix | Block/file touched |
|------|-----------|-------|----------|-----------------|---------------|--------------------|
| Header row: kicker, H1, result count, sort | 1 | Has archive-product template with query-title + toolbar | `archive-product.html::query-title` (line 42), `sgs-archive-toolbar` (line 41), product-results-count + catalog-sorting at lines 124-125 | 1 | Restyle toolbar | N/A |
| Sort options "Biggest saving" and "Brand A–Z" | 3 | WooCommerce default orderby only | `archive-product.html::catalog-sorting` block present but no custom orderby registered; `woocommerce_catalog_orderby` hook not found in codebase | 3 | Register both via woocommerce_catalog_orderby; add RRP field | theme/sgs-theme |
| Ten collapsible filter groups with counts, rotating chevron | 3 | WooCommerce blocks not collapsible | `sgs-shop-filters.js::buildAccordion()` (lines 110-152) creates `<details>/<summary>` accordions, but template uses `sgs/heading` with no wrapping (lines 89-114); chevron rotation not verified in CSS | 2 | Accordions exist via JS; needs chevron rotation CSS check and filter group HTML structure audit | woocommerce.css |
| Segmented and chip filters (shape, frame type) | 2 | product-filter-attribute with chips display | `archive-product.html` lines 99-104 and 108-113 show `woocommerce/product-filter-attribute` with `displayStyle="woocommerce/product-filter-chips"` for both Flavour and Size | 2 | Chips work; CSS variation needed | woocommerce.css |
| Brand list with search box, counts, scrolling | 3 | WooCommerce brand filter; sgs/filter-search keyed to attributeId | `archive-product.html` shows NO brand filter block at all; `sgs/filter-search::block.json` only accepts `attributeId` (line 58), NOT taxonomy | 4 | Add brand taxonomy filter block; extend sgs/filter-search to support taxonomies OR create new sgs/filter-taxonomy-search | new block or plugin capability |
| "Polarised only" toggle switch | 3 | Attribute filter with checkbox list | `archive-product.html` shows NO polarised attribute filter at all; no single-term attribute toggle switch logic found | 4 | Add polarised attribute filter + implement switch display style for single-term attributes | new filter + woocommerce.css |
| Filter rail bottom-sheet below 1060px | 2 | Breakpoint hardcoded to 782 | `sgs-shop-filters.js::BREAKPOINT` (line 50): `const BREAKPOINT = 782; // hardcoded` | 2 | Make configurable via data attribute on `<aside id="sgs-shop-filters">`; set to 1060 for Eye Care | sgs-shop-filters.js |
| Drawer footer: "Clear" + "Show N frames" with live count | 3 | Close button in header; no sticky footer with count | `sgs-shop-filters.js` lines 178-193 create `sgs-shop-filters__sheet-footer` with "Clear all" + "Show results" buttons, but NO live result count displayed in footer | 2 | Add live filter count to footer (read from collection context or MutationObserver on product grid) | sgs-shop-filters.js |
| Grid three to four across at 1280px | 2 | product-collection column count | `archive-product.html::displayLayout` (line 120): `columns:3` hardcoded; woocommerce.css only shows `@container sgs-shop-grid (max-width: 495px)` at line 1494, NO 1280px rule | 2 | Add container query for 4-column layout at 1280px | woocommerce.css |
| No-results state with message and Clear filters | 1 | woocommerce/product-collection-no-results + message text | `archive-product.html` lines 138-140 show no-results with message "No products match your filters. Try adjusting or clearing them."; clear button present in active-filters section (line 84) but NOT specifically in no-results area | 1 | Copy is correct; verify Clear button visibility in no-results (may need CSS or JS to surface it there) | archive-product.html / woocommerce.css |

### Still Needed

**Grade 3 (Block Extension / Feature):**
- sgs/filter-search: Extend to support `taxonomyId` in addition to `attributeId` (S)
- Polarised attribute filter: Add as woocommerce/product-filter-attribute with switch display style (M)

**Grade 4 (New Block / Module):**
- Brand taxonomy filter: New block or extend sgs/filter-search + wire brand taxonomy (L)

**Grade 2 (Theme Fix):**
- Breakpoint configuration: Make BREAKPOINT on sgs-shop-filters.js data-attribute-configurable (S)
- Footer count: Add live result count to drawer footer (S)
- 1280px column rule: Container query for 4-column layout (S)
- Chevron rotation: Add rotating chevron CSS to collapsible filter group summaries (S)

---

### Notes

- **Accordions already exist** via `sgs-shop-filters.js::buildAccordion()` — the template structure just needs CSS for chevron rotation.
- **No brand or polarised filters are present** in the live template — these are grade-4 additions, not extensions of existing blocks.
- **Drawer footer structure exists** but is missing the live product count (grade-2 fix, not grade-3).
- **Grid breakpoint** at 1280px is missing entirely (no container query).
- **Filter rail breakpoint** is hardcoded but structure is sound for making it configurable.

### Product Page Gap Map Verification

### Product page

| Item | Map grade | Claim | Evidence | Corrected grade | Corrected fix | Block/file touched |
|------|-----------|-------|----------|-----------------|---------------|--------------------|
| 1. Breadcrumb brand trail | 3 | Add "brand" trail option | `plugins/sgs-blocks/src/blocks/breadcrumbs/block.json` has attributes: `[separator, showHome, homeLabel, linkColour, ...]`. No `brandTrail`, `includeCategory`, or similar attributes. Map claims "add a 'brand' trail option" but nothing exists. | 3 | Add `brandTrail` / `breadcrumbTrail` attr to breadcrumbs block.json + render logic | sgs/breadcrumbs |
| 2. Gallery four views per colourway | 1 | uploadable gallery column | `sgs/buybox` render.php uses `gallery-col.php` which renders `product-card-img` (single main image) + thumbnail strip from WC variation images. No client-side "upload four real views" handler. Config-only task: upload images in WC editor | TRUE | Upload images in WC (no block change needed) | woocommerce |
| 3. Sticky buybox column | 2 | CSS sticky on configurator | Map claims sticky positioning needed. `sgs/buybox render.php` renders 2-col CSS grid; no `position:sticky` in render.php or style.css. Requires CSS addition to `.sgs-buybox__configurator` or a sticky attr | FALSE | Add `sticky` boolean attr + CSS `position:sticky` to configurator column | sgs/buybox |
| 4. Brand name link above H1 | 3 | block bindings to brand/SKU | `sgs/text` block.json: standard text block, no product meta bindings visible. Would need `uses` context for postId + meta read. Block exists but bindings not implemented | PARTLY | Extend sgs/text to bind to product brand meta via WP block bindings API | sgs/text |
| 5. RRP with saving pill | 3 | store RRP as separate meta | Buybox reads WC `$product->get_regular_price()` + `get_price()` (sale price). No handler for separate RRP meta field `_sgs_manufacturer_rrp` or similar. | FALSE | Store RRP as post-meta, read in buybox render.php, display savings calc | sgs/buybox + WC post-meta |
| 6. Stock label + colour | 3 | label+colour per stock status | `sgs/buybox block.json` has `soldOutLabel`, `unavailableLabel` attrs (text only). No colour attrs per status (`inStockColour`, `backorderColour`, etc.). | PARTLY | Add `inStockLabel`, `inStockColour`, `onBackorderLabel`, `onBackorderColour` attrs | sgs/buybox |
| 7. Colour picker tile style | 3 | tile pill (4:3 image, caption) | `sgs/option-picker block.json` has `label`, `showLabel`, `labelFontSize`, etc. No image swatch, tile style, or variant-picker mode. Map claim "supports image swatch from term meta" is not in current attrs | FALSE | Add `swatchStyle` attr (enum: pill/tile), `showSubLabel` for term labels | sgs/option-picker |
| 8. Size picker sub-label | 3 | sub-label per option (measurement) | `sgs/option-picker block.json` attrs: no `sublabel`, `subLabel`, or `showMeasurement`. No support for per-option secondary text | FALSE | Add `showSubLabel` + option data structure to carry term/variation meta | sgs/option-picker |
| 9. Two CTAs (prescription + add-to-bag) | 3 | InnerBlocks slot + secondary button | `sgs/buybox block.json` + save.js confirm "No InnerBlocks". Map requires buybox to compose a secondary CTA block and open configurator modal | FALSE | Add `InnerBlocks` support to buybox (render.php output second slot after add-to-cart form) + secondary button attr | sgs/buybox |
| 10. WhatsApp card variant | 3 | card variant (title+sub-line) | `sgs/whatsapp-cta block.json` has `variant` enum: `['floating', 'inline', 'banner']` (from edit.js check). No `card` variant. Render only supports 3 shapes | FALSE | Add `card` variant + layout (title/desc above icon, not button-style) | sgs/whatsapp-cta |
| 11. Assurance icon-list | 3 | icon-list in buybox column | `sgs/icon-list` block exists; `sgs/buybox` has no InnerBlocks (from row 9). Once buybox InnerBlocks added, icon-list can sit in that slot | DEPENDS | Blocked on row 9 (buybox InnerBlocks). No change to icon-list itself | (row 9 blocker) |
| 12. Content tabs (Desc/Details/Sizing) | 2 | new PDP content part, replace food tabs | `sgs-pdp-content.html` template part exists. Uses `sgs/tabs` with food-specific tabs (Ingredients, Allergens, Nutritional). Requires tab restructure + conditional removal | PARTLY | Create eyewear-specific tab list or parameterise tab slot in template part (sgs-pdp-content.html) | sgs-pdp-content.html + theme |
| 13. Description bullets from attributes | 3 | block bindings to product attributes | Map says "bullets via block bindings". Requires WP block bindings API or custom meta render. No existing binding is visible in sgs/text | FALSE | Implement block-bindings pattern to read product attributes (WP 7.0+ Abilities API) + template bindings | sgs/text or custom block |
| 14. Details spec grid | 4 | new sgs/product-specs block | No `sgs/product-specs` block found in plugins/sgs-blocks/src/blocks/. Does not exist. Requires new block build | FALSE | **NEW BLOCK:** Build sgs/product-specs (reads attributes + meta, grid layout, hides empty cells) | sgs/product-specs (NEW) |
| 15. Sizing diagrams + labels | 4 | new sgs/frame-measurements block | No `sgs/frame-measurements` block found. Does not exist. Requires new block + SVG diagrams + event listener to option-picker | FALSE | **NEW BLOCK:** Build sgs/frame-measurements (SVG + labels, listens to option-picker selection event) | sgs/frame-measurements (NEW) |
| 16. Reviews rating bars + tags | 3 | add dataSource:woocommerce to trustpilot-reviews | `sgs/trustpilot-reviews block.json` **HAS** `dataSource` attr. Map says "add dataSource: woocommerce" — attr exists, just needs woocommerce enum value + logic | TRUE | Verify `dataSource` enum includes `'woocommerce'` value + fetch logic in render.php | sgs/trustpilot-reviews |
| 17. Zero-review hide + Google badge | 3 | add visibility condition (product has reviews) | No dynamic visibility condition found in sgs/google-reviews or template. Would need conditional rendering | FALSE | Extend conditional-visibility or product-context conditionals to check WC review count | sgs/google-reviews or theme logic |
| 18. More from brand collection | 3 | custom collection (same brand) + dynamic heading | No custom product collection registered. Map assumes a "same brand as current product" collection. Requires WC product query integration | FALSE | Register custom product collection query (via WC REST or template logic) bound to `post_meta:_sgs_product_brand` | theme or sgs/product-collection |
| 19. Similar shapes tag collection | 1 | store shape as product tag | Requires WC data entry only: populate product_tag taxonomy with shape values (e.g., "aviator", "cat-eye"). Map says related collection already uses tags | TRUE | Tag each product with shape in WC editor (data entry, no code) | WooCommerce product taxonomy |
| 20. Photography placeholder | 1 | upload in WC settings | Standard WooCommerce placeholder image feature. Admin → WooCommerce → Settings → Products → Placeholder. No SGS block work needed | TRUE | Upload placeholder image in WC settings (config-only, no code) | WooCommerce settings |

---

### Still needed

**Grade 4 (new blocks):**
- sgs/product-specs: Grid of product attributes + meta; hides empty cells (M)
- sgs/frame-measurements: SVG frame diagrams + dimension labels, reactive to option-picker selection (M)

**Grade 3 (block extensions):**
- sgs/breadcrumbs: Add `brandTrail` / category in breadcrumb sequence (S)
- sgs/buybox: Add `sticky` attr + CSS, add `InnerBlocks` slot after add-to-cart (M)
- sgs/option-picker: Add `swatchStyle` (tile/pill), `showSubLabel`, term/variation meta binding (M)
- sgs/whatsapp-cta: Add `card` variant (title+desc layout) (S)
- sgs/buybox (stock): Add `inStockLabel`, `inStockColour`, `onBackorderLabel`, `onBackorderColour` attrs (S)
- sgs/trustpilot-reviews: Verify `woocommerce` dataSource value + fetch logic works (S)
- sgs/text: Extend to WP block bindings API (brand/SKU/attributes) (M)
- sgs/google-reviews: Add visibility condition (product review count > 0) (S)

**Grade 2 (theme/template updates):**
- sgs-pdp-content.html: Restructure tabs (remove food-specific, add eyewear-specific: Desc/Details/Sizing) (S)
- buybox style: Add sticky positioning CSS or option (S)

**Grade 1 (WooCommerce data/config only):**
- WooCommerce: Store RRP as separate meta field (`_sgs_manufacturer_rrp` or custom field) (config)
- WooCommerce: Tag products with shape taxonomy (data entry)
- WooCommerce: Upload placeholder image (config)


### Bag & checkout — Gap Map Verification

### Bag & checkout

| Item | Map grade | Claim | Evidence | Corrected grade | Corrected fix | Block/file touched |
|------|-----------|-------|----------|-----------------|---------------|--------------------|
| "Add my prescription" on frame-only items | 3 | No per-item action slot | sgs/cart::block.json has no `itemActions` attr; WC cart-line-items-block (core) renders qty/remove only | 4 | New sgs/cart inner block OR Store API extension + edit drawer route to configurator | sgs/cart block.json, cart drawer template |
| Free-delivery progress bar toward £75 | 3 | Not in sgs/cart | sgs/cart has no progress bar attrs; layout only displays badge/panel/icon | 4 | Add to sgs/cart: `freeShippingThreshold`, `showProgressBar` attrs + progress row in drawer footer render | sgs/cart render.php |
| Toast "Added £ View bag" after adding | 1 | sgs/cart opens drawer on add instead | sgs/cart::block.json line 250-252: `autoOpenOnAdd` exists, default true | TRUE | Recommend dropping toast; note already built in block editor | No work needed |
| Numbered steps (serif numerals): Contact, Delivery, Prescription, Payment | 2 | WooCommerce checkout sections | checkout sections are WC native blocks (contact/shipping-method/payment/terms). CSS counter can style section headings | TRUE | CSS counter on section headings in variation (theme CSS only) | theme/sgs-theme/checkout.html |
| Step count adapts: four with lenses, three without | 4 | Prescription step would be a custom inner block | No sgs/prescription block exists; WC's checkout-additional-information-block is text-only | 4 | New sgs/checkout-prescription inner block OR inner markup within checkout-additional-information-block wrapper, renders conditionally on cart contents | New block or WC extension |
| Mobile field "so I can WhatsApp you updates" | 1 | WooCommerce phone field | checkout-contact-information-block renders phone (WC Blocks 11.1.0+); relabel via block editor | TRUE | Relabel "Phone (for WhatsApp updates)" in block inspector or store settings | WooCommerce Blocks native config |
| Delivery vs Collect cards (Royal Mail £3.95, free over £75 / Collect free, fitted in person) | 1 | Checkout shipping-method block (ship / pickup toggle) and pickup-options block in the part | checkout.html lines 28-30: `woocommerce/checkout-shipping-method-block`; lines 32-34: `woocommerce/checkout-pickup-options-block` | TRUE | Enable Local Pickup in WooCommerce settings; configure flat rate + free over £75; edit method titles/descriptions via Shipping zones | WooCommerce Shipping settings |
| Prescription step: three modes and a file upload | 4 | Additional-checkout-fields API supports text, select and checkbox only | WC's additional-checkout-fields-block does not support file upload; sgs/form-field-file exists but saves to PUBLIC uploads folder (class-form-upload.php line 58: `wp_handle_upload()`) | PARTLY | Custom inner block + Store API extension to save mode + Store API for upload storage (private custom post type, not public uploads) | sgs/checkout-prescription block + Store API hook + form-upload handler refactor to use private post type storage |
| Card fields, "Pay now £X", GDPR note | 1 | checkout-payment-block, actions block, terms block | Lines 48-50: checkout-payment-block exists; lines 64-66: checkout-actions-block exists; lines 60-62: checkout-terms-block exists | TRUE | Add GDPR text to terms block description in block editor | WooCommerce Blocks native config |
| Sticky order summary with lens lines, Edit link | 2 | checkout-totals / order-summary blocks | Lines 69-70: checkout-totals-block exists; lines 71-73: checkout-order-summary-block exists | TRUE | CSS `position:sticky` on checkout-totals-block wrapper; Edit link routes to cart drawer (JS only; no new block) | theme/sgs-theme/checkout.html CSS |
| Order confirmed: tick, order number, collection vs delivery wording | 3 | sgs-order-confirmation-content part | Part exists (sgs-order-confirmation-content.html); WC's order-confirmation-status block (line 12) shows tick/number but has no shipping-method conditional | PARTLY | Add conditional copy block keyed to order meta `_shipping_method` OR extend order-confirmation-status-block to render method-specific wording | sgs/order-confirmation-conditional-text block OR WC extension |

### Still needed

- sgs/checkout-prescription: three-mode (text/radio/file) inner block + Store API for upload reference + private upload storage (M)
- sgs/cart: per-item action slot + configurator route (S)
- sgs/cart: free-shipping progress bar attrs + drawer footer render (S)
- sgs/order-confirmation-conditional-text: conditional copy keyed to shipping method, OR extend WC's order-confirmation-status (S)
- Form upload refactor: private storage instead of public uploads folder (S)

### Lens configurator

| Item | Map grade | Claim | Evidence | Corrected grade | Corrected fix | Block/file touched |
|------|-----------|-------|----------|-----------------|---------------|--------------------|
| Full-screen overlay header (R262) | 3 | TRUE — sgs/choice-flow has progressStyle enum [bar, circles, badge]; Back button has styling attributes (backColourBackground, backColourText, etc.); sgs/modal has maxWidth enum [small, medium, large, full]. | sgs/choice-flow/block.json::progressStyle (line 131–136); sgs/modal/block.json::maxWidth (line 165–173) | 3 | Host choice-flow inside a full-screen modal; add a step label slot to the header. This requires Phase 4 modal-opening cross-cutting feature (NOT BUILT per plan). | sgs/choice-flow, sgs/modal |
| Left aside preview (R263) | 4 | TRUE — no live-price or frame-preview-with-tint module exists. | Grep: no plugins/sgs-blocks/src/blocks/preview* or similar; no class-cart-preview or similar in includes/ | 4 | New module: an aside that subscribes to choice-flow state, computes price from ladder, applies CSS filter per finish. Superseded decision: prices come from site-wide add-on price list (settings page), not per-frame; see Row 268. This aside is part of the lens module, not a configurable product attribute system. | New: sgs/lens-preview (or similar composite) |
| Q1 use cards (R264) | 3 | TRUE — sgs/form-field-tiles exists with tiles array containing label, value, icon, iconSource, image (block.json lines 133–157). No price or help-text per tile or popover toggle. | sgs/form-field-tiles/block.json::tiles (lines 133–157); tiles object has no pricePerTile, helpPerTile, or popoverToggle properties | 3 | Add price and help-text fields per tile, and a popover toggle. These are new attributes on the tiles array object. | sgs/form-field-tiles |
| Q2 thickness (R265) | 3 | TRUE — sgs/form-field-tiles exists. No per-tile badge attribute. | sgs/form-field-tiles/block.json::tiles; checked for badge* properties — none present. selectedStyle enum is [checkmark] only. | 3 | Extend tiles array to add badgeText (or similar) per tile, rendering as a small label overlay (e.g., "Most people pick this"). | sgs/form-field-tiles |
| Q3 finish (R266) | 3 | TRUE — sgs/form-field-tiles has image field per tile (role: image-object, block.json line 153). No per-option CSS filter attribute; the filter logic is part of Row 263's new lens-preview module. | sgs/form-field-tiles/block.json::tiles.image (line 153) | 3 | Tiles already have image field. The filter behavior (applying computed finish tint to the image) is NOT a tiles extension — it belongs to the lens-preview aside (Row 263), which subscribes to the choice-flow state and applies filters centrally. This row is partly SUPERSEDED by Row 263's decision. | N/A — filter logic lives in sgs/lens-preview, not sgs/form-field-tiles |
| Q4 prescription (R267) | 3 | TRUE — sgs/form-field-file, sgs/form-field-number, sgs/form-field-radio all exist. | Bash: ls plugins/sgs-blocks/src/blocks/ | grep -E form-field-file|form-field-number|form-field-radio confirms all three ✓ | 2 | Compose these three fields into a compact grid layout for SPH/CYL/AXIS rows. This is a LAYOUT composition task (reusing existing fields), not a block extension. Grade should be 2 (theme fix / layout composition) or even 1 (configuration). No new block or field extension needed — just grid layout styling and placement. | N/A — existing blocks; layout via form-step CSS or container grid |
| Price ladder config (R268) | 4 | TRUE — no settings page or woocommerce_before_calculate_totals hook exists for lens pricing. | Grep: no plugins/sgs-blocks/admin/class-lens-settings.php or class-lens-pricing.php; no "lens" or "add-on price" in includes/; class-cart-proxy.php has validate filter but no pricing logic | 4 | New module: settings page for site-wide lens add-on ladder (use, thickness, finish combinations → price delta). Prices applied in woocommerce_before_calculate_totals, choices carried in cart item data via woocommerce_store_api_add_to_cart_data filter. This is the decided approach per the context note. | plugins/sgs-booking/admin/class-lens-pricing-settings.php (or within sgs-booking) |
| Opens from product page (R269) | 3 | TRUE — sgs/modal opens from its own trigger button (has triggerText, triggerStyle attributes, native modal behavior via view.js). Modal's view.js looks for `.sgs-modal__trigger` class and `data-modalId` attribute — hard-coded trigger pattern. NO generic "open-any-modal-from-any-link" cross-cutting mechanism exists. | sgs/modal/block.json::triggerText (line 133–135); sgs/modal/view.js lines 11–66 shows initModals() scans for `.sgs-modal__trigger` only | 3 | Build cross-cutting open-modal-from-link mechanism: data-open-modal attribute on any link, passing product ID and variation (Phase 4 work, NOT BUILT). | N/A — new mechanism, not in an existing block |
| Cart and order lines (R270) | 4 | TRUE — WooCommerce Store API automatically includes item_data in cart/order responses once stored via woocommerce_store_api_add_to_cart_data filter. This is documented WC behavior. No SGS lens-module-specific cart-line formatter or order-meta copier exists yet. | WooCommerce documented behavior; class-form-privacy.php shows item_data usage pattern (lines 60–78); no sgs/lens-module cart-formatter or order-meta copier in codebase | 4 | Format item_data (choice selections + prices) and copy to order item meta at checkout/order-creation time. Part of the lens module (Row 263) + pricing system (Row 268). Requires both to exist first. | plugins/sgs-booking/includes/class-lens-order-formatter.php (or within lens module) |

### Still needed

- **sgs/lens-preview** (new composite): aside block subscribing to choice-flow state, computing price from ladder, applying CSS filter per finish (S/M)
- **sgs/form-field-tiles extension** (grade 3): add pricePerTile, helpPerTile, popoverToggle fields to tiles array object (S)
- **sgs/form-field-tiles extension** (grade 3): add badgeText per tile for secondary labels (S)
- **Lens pricing settings page** (grade 4, part of booking plugin): settings UI for add-on price ladder by use/thickness/finish combination (M)
- **Lens pricing hook** (grade 4): woocommerce_before_calculate_totals handler to apply add-on prices from ladder to cart items (S)
- **Cross-cutting open-modal-from-link** (grade 3): data-open-modal attribute handler on any link, triggering modal with product/variation context (M)
- **Lens order formatter** (grade 4): copy item_data to order meta at checkout time, format display for cart/order lines (M)

Note on Row 266: Tile image filtering is superseded — the filter logic belongs to the lens-preview module (Row 263), not sgs/form-field-tiles. The tiles array already has an image field; composing it with the choice-flow state to apply filters happens in the preview aside, not in the tile field itself.

Note on Row 267: Grade should be 2, not 3 — this is layout composition reusing three existing fields, not a block extension or new feature.

### Cross-cutting Gap Map Recheck

### Verification Results

| Item | Map grade | Claim | Evidence | Corrected grade | Corrected fix | Block/file touched |
|---|---|---|---|---|---|---|
| Open a modal from any link or button | 3 | sgs/modal renders its own trigger | `plugins/sgs-blocks/src/blocks/modal/view.js::initModals()` only looks for `.sgs-modal__trigger` elements with `data-modal-id`; no support for `href="#modal-{slug}"` or generic data-attr triggers. Trigger-from-link pattern is not implemented. | 3 | Add generic trigger handler in view.js: listen for clicks on `[href*="#modal-"]` or `[data-open-modal]`, resolve modal ID, call `openModal()`. Centralise in a separate `initModalTriggers()` function. | modal/view.js |
| Wishlist hearts with persistence | 4 | Nothing | No `sgs/wishlist` block directory exists at `plugins/sgs-blocks/src/blocks/wishlist`. Zero existing code. | 4 | Build new sgs/wishlist block: localStorage for guests (JSON blob with product IDs), user meta `_sgs_wishlist_items` when logged in, dedicated saved-items page template. estimate: M (2–3h, boilerplate block + view.js storage + template). | new block: wishlist |
| Frame card details: polarised tag, reviews text, swatch click | 3 | sgs/product-card: brand overlay, saving badge, rating, colour swatches with swatchMaxVisible, featured/trial tags | `plugins/sgs-blocks/src/blocks/product-card/block.json::attributes` contains `showBrandOverlay`, `showSavingBadge`, `showRating`, `ratingValue`, `colourSwatches`, `swatchMaxVisible`, `featuredTag`, `trialTag` (verified: all present, case-insensitive match). Gap map claim is TRUE — all listed attributes exist. Remaining unbuilt: (a) `polarisedTag` attribute + UI control (new), (b) `emptyRatingText` for "No reviews yet" display (new), (c) swatch-click card-swap behaviour (verify in view.js if present, likely present given the rich swatches implementation). | 2 | (a) Add `polarisedTag` attribute + string value to block.json. (b) Add `emptyRatingText` attribute + conditional render in render.php if `reviewCount === 0`. (c) Verify swatch-click wiring in view.js (already likely present given swatches exist; if missing, wire click handlers). | product-card/block.json, product-card/render.php, product-card/view.js |
| Brand and product data model (40 brands, attributes, sizes) | 1 | WooCommerce Brands taxonomy and global attributes | Grade 1 is configure-only (no code changes). This is pure WooCommerce admin setup: create Brands taxonomy, create global attributes (Shape, Material, Lens, Frame Type, Hinge, Nose Pads, Size) with per-variation values and measurement meta. No framework code needed. | 1 | None (configuration only) | — |
| Hit targets never under 44px | 2 | Theme presets 48px | `theme/sgs-theme/theme.json::settings.spacing.spacingSizes` has 8 entries; inspected first 5: `10: 0.25rem`, `20: 0.5rem`, `30: 1rem`, `40: 1.5rem`, `50: 2rem`. 48px = 3rem (preset `30` is 1rem=16px, `40` is 1.5rem=24px, `50` is 2rem=32px). No 3rem/48px preset in the list shown. Need full audit of chips in the draft (design mockup) to identify undersized targets. | 2 | Audit all interactive elements in draft (buttons, links, form controls, chips) at 375/768/1440px breakpoints. Raise any <44px targets via block attributes (control padding, font-size, line-height) or theme preset expansion. | theme/sgs-theme/theme.json (add spacing preset if needed), per-block controls (e.g., button padding in CTA blocks) |
| Extra breakpoints 1280, 1100, 1060, 1160, 620 | 2 | Blocks work to 768/1024 tiers only | SGS framework uses device-tier responsive system (Mobile <768 / Tablet <1024 / Desktop ≥1024) in block attributes (`gridTemplateColumnsMobile`, `gapTablet`, etc.). Extra breakpoints (1280, 1100, 1060, 1160, 620) are outside this system. Solution: CSS container queries (`@container (width > 1280px)`) in style.css for visual breakpoints. 1060 is the nav/filter setting (likely a filter-sidebar breakpoint, not block-level). 1100 goes away per map ("goes away with the configurator build"). | 2 | (a) Use `@container (min-width: 1280px)` and `@container (max-width: 620px)` for extra breakpoints in block style.css rules. (b) 1060 is nav layout (not a block-tier concern, handled in theme template/part). (c) Document device-tier vs visual breakpoint discipline per `CLAUDE.md` §Responsive breakpoint discipline. | per-block style.css (container queries), theme layout (nav breakpoint) |

### Still Needed

- **sgs/wishlist** (S) — localStorage/user-meta wishlist storage, saved-items page, heart-icon UI
- **sgs/product-card: polarisedTag** (S) — new attribute + editor control + render.php conditional
- **sgs/product-card: emptyRatingText** (S) — new attribute + conditional "No reviews yet" display  
- **Audit interactive hit targets** (S) — cross-check all controls in Eye Care draft against 44px minimum
- **Implement swatch-click card-swap** (S) — verify existing, wire if absent (product-card/view.js)
- **Container queries for extra breakpoints** (S) — 1280 & 620px in applicable block style.css files

### Content Pages & Size Guide Recheck

### Content pages

| Item | Map grade | Claim | Evidence | Corrected grade | Corrected fix | Block/file touched |
|------|-----------|-------|----------|-----------------|---------------|--------------------|
| Lenses page: price cards, "in every lens" list, "how it goes" steps, CTA | 1 | container, heading, text, icon-list, process-steps exist | `plugins/sgs-blocks/src/blocks/`: all 5 blocks exist | 1 | Pattern | N/A |
| About: name, credential line, story, WhatsApp + shop buttons, credential stack with one accent-edged card | 1 | container (per-side borders), text, whatsapp-cta, button exist | container/block.json:borderWidth `{top,right,bottom,left}`; whatsapp-cta/block.json exists; button exists | 1 | Pattern | N/A |
| Help: three info cards, "Still not answered?" card with Contact and Call | 1 | container, business-info phone exist | container and business-info blocks exist; business-info::displayType enum includes "phone" | 1 | Pattern | N/A |
| Contact: WhatsApp button with number, phone / email / address / hours grid | 1 | whatsapp-cta inline, business-info (multiple displayTypes) | whatsapp-cta/render.php shows inline variant (lines 377–379); business-info has 4 displayType enum values: phone, email, address, hours | 1 | Compose from Business Details | N/A |
| Map card with Directions | 1 | business-info map display type | business-info/block.json line 45, variation "map" at lines 447–468 | 1 | Replace the sketch map with it | N/A |

### Size guide

| Item | Map grade | Claim | Evidence | Corrected grade | Corrected fix | Block/file touched |
|------|-----------|-------|----------|-----------------|---------------|--------------------|
| Modal: sticky header, intro, example "55 ▫ 18 137", three definitions, S/M/L table, WhatsApp card | 1 | sgs/modal with modalRef to a reusable sgs_modal post | modal/block.json line 128–131: `"modalRef": {type: "number", default: 0, description: "ID of a published sgs_modal post..."}` | 1 | Author once as an sgs_modal post | N/A |
| Opened from nav, footer, PDP (twice), FAQs, mobile menu and filters | 3 | Trigger is the modal block's own button | modal/block.json trigger element at lines 33–55; render.php renders trigger button with `triggerText` attr | 3 | See Cross-cutting: open-modal-from-any-link | sgs/modal block (trigger button exists; routing from nav/footer/etc is framework-level, not block-level) |

---

### Still needed

- sgs/modal: add routing handler to open modal from any link (trigger from nav, footer, PDP, FAQs, mobile menu and filters) — requires framework-level modal trigger registration (M)
