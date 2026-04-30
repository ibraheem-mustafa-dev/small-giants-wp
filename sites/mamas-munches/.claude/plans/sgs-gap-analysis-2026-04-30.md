# SGS Block Gap Analysis — Mama's Munches
**Date:** 2026-04-30
**Scope:** Homepage + Product Page mockups vs. existing 57 SGS blocks
**Method:** Each section read from mockup HTML, then verified against `sgs-db.py block <slug>` attributes.
**Hard rule:** Every visual property must be expressible via block attributes or style variation tokens. Zero inline hardcoding permitted.

---

## Style Variation Status

`theme/sgs-theme/styles/mamas-munches.json` exists with the full palette (14 tokens), Fraunces/Inter typography, and button-invert pattern. This is the foundation — all per-block colour attributes should reference palette slugs from this variation.

The variation is **not yet registered in the SGS DB** (`python sgs-db.py tokens mamas-munches` returns "Style variation not found") — this is a DB metadata gap, not a code gap. The file is valid and WordPress will read it directly.

---

## Homepage — Section-by-Section

### HP-1: Header (Sticky, Logo + Nav + Cart + Hamburger)

| Field | Detail |
|---|---|
| **Mockup elements** | Sticky header; horizontal logo (44px height); desktop nav (5 links, "Send to Ward" pill-highlighted in `--primary` with accent-yellow inset shadow on hover); cart icon with badge count; hamburger (mobile only, 44px touch target) |
| **Proposed SGS block(s)** | Theme header template part (`parts/header.html`) + `sgs/mega-menu` + `sgs/mobile-nav` |
| **Attributes available** | `sgs/mega-menu`: `highlight` (boolean), `badge`, `badgeColour`, `label`, `openOn`. `sgs/mobile-nav`: exists as built block. |
| **GAP** | The "Send to Ward" nav item needs a highlighted background pill — `sgs/mega-menu` supports `highlight: true` and `badgeColour`, but the mockup's exact pattern (full pill background in `--primary` with `inset 0 -2px 0 var(--accent)` bottom border on hover) requires either a custom CSS override on the highlighted item or an extended hover attribute. The accent inset-shadow hover is not currently expressible via inspector controls. |
| **Severity** | POLISH — the highlight shows; the inset-shadow hover refinement is cosmetic. |
| **Fix path** | Extend `sgs/mega-menu` with `highlightHoverBorderBottom` attribute, OR accept plain `highlight` for WP Studio import and refine post-launch. |

---

### HP-2: Hero (Two-column split, photo right, CTA pair)

| Field | Detail |
|---|---|
| **Mockup elements** | Mobile: stacked (portrait photo above copy, pink background, H1 + subhead + 2 CTAs). Tablet+: two-column grid 1fr/1fr, left = copy on pink surface, right = photo fills the column. 1440px: photo bleeds to the container edge but NOT to the viewport edge — it fills its column which ends at 1280px container boundary. Section-label eyebrow ("Handmade in Birmingham"). Button hover: background → `--text`, text → `--text-inverse`, border → `--text`. |
| **Proposed SGS block(s)** | `sgs/hero` — variant: `split`, with `splitImage` attribute |
| **Attributes available** | `variant: "split"` confirmed in block.json enum. `splitImage` (object) attribute exists. `ctaPrimaryText`, `ctaPrimaryUrl`, `ctaSecondaryText`, `ctaSecondaryUrl`. `ctaPrimaryBackground`, `ctaPrimaryColour`, `ctaSecondaryBackground`, `ctaSecondaryColour`. Background colour via `supports.color.background`. `headline`, `subHeadline`. |
| **GAP 1** | **Photo does NOT bleed to viewport edge** — confirmed from style.css: `.sgs-hero__media { max-width: 50%; }` and `.sgs-hero--split { padding: var(--wp--preset--spacing--60) var(--wp--preset--spacing--40) }`. The image column has internal padding and a border-radius on the image (`border-radius: var(--wp--custom--border-radius--large, 16px)`). The mockup has NO border-radius on the photo — it's a full-bleed flush image filling the right column. The brief also says "right photo bleeds to edge" at 1440px, meaning the photo should extend to the container boundary with no padding. |
| **GAP 2** | The button hover pattern in the mockup is: primary/secondary both flip to `--text` background + `--text-inverse` text on hover. The current hero CTA hover CSS flips `--accent` button to transparent/accent-text, and `--primary` button to a pre-set teal. The Mama's Munches invert-to-charcoal pattern is **not expressible** via existing `ctaPrimaryBackground` / `ctaPrimaryColour` attributes, which only set the default state — there are no `ctaPrimaryHoverBackground` / `ctaPrimaryHoverColour` hero-CTA hover attributes. |
| **GAP 3** | Section-label eyebrow (small uppercase caps above H1) — no dedicated attribute in `sgs/hero`. Currently eyebrow/badge slots exist as floating badge overlays, not as an above-headline inline text element. |
| **Severity** | GAP 1: **BLOCKER** — photo border-radius and padding would need a hardcoded CSS override if not fixed. GAP 2: **BLOCKER** — button hover colour is hardcoded in style.css and not overridable per-instance. GAP 3: POLISH — eyebrow can be a core/paragraph placed in an InnerBlocks area, or omitted at import and added after. |
| **Fix path** | GAP 1: Add `splitImageBleed` boolean attribute to `sgs/hero` — when true, removes border-radius and inner padding from the media column at split variant. GAP 2: Add `ctaPrimaryHoverBackground`, `ctaPrimaryHoverColour`, `ctaSecondaryHoverBackground`, `ctaSecondaryHoverColour` attributes to `sgs/hero`. GAP 3: Use as-is with core/paragraph above headline via InnerBlocks, or add `eyebrow` string attribute. |

---

### HP-3: Trust Bar (Icon-in-white-circle badges on pink surface, Halal placeholder)

| Field | Detail |
|---|---|
| **Mockup elements** | 4 visible badges in a row (2×2 on mobile, 4-col at 600px+). Each badge: SVG icon in 44px white circle with subtle shadow, beside text label. Pink (`--surface-pink`) background. Fifth badge (`Halal Certified`) has `data-pending="true"` and `hidden` attribute — invisible until cert lands, then unhidden with one CSS rule. Grid expands to 5 columns at 1024px when Halal slot is visible. |
| **Proposed SGS block(s)** | `sgs/certification-bar` (closest match) or `sgs/icon-list` |
| **Attributes available** | `sgs/certification-bar`: `items` (array), `badgeStyle` (string, default "text-only"), `badgeSize`, `labelColour`, `labelFontSize`. Background via `supports.color.background`. `sgs/icon-list`: `items` (array with per-item icon), `iconColour`, per-item text. |
| **GAP 1** | **White circle wrapper around icon** — neither `sgs/certification-bar` nor `sgs/icon-list` supports a per-item circular icon background (icon inside a white disc). `sgs/icon-block` has `shape` attribute (but no "circle-white" value with shadow). This is the specific trust-bar pattern from the mockup: 44px white circle, box-shadow, SVG inside. |
| **GAP 2** | **`data-pending` hide flag** — there is no attribute in any existing block that renders a slot with `data-pending="true" hidden` in the DOM, toggleable later by a CSS variable or single attribute flip. The Halal placeholder requires a per-item conditional visibility flag. |
| **GAP 3** | **Grid auto-expands to 5 columns** when Halal slot is visible — this responsive grid change based on a per-item flag is not expressible via current block attributes. |
| **Severity** | GAP 1: **BLOCKER** — cannot replicate white-circle icon badge without inline styles. GAP 2: **BLOCKER** — no pending/conditional slot mechanism. GAP 3: POLISH — start as 4-column, add fifth column manually when cert lands. |
| **Fix path** | GAP 1 + 2: Build new block `sgs/trust-badges`. Attributes: `items` (array: `{icon, label, pending: boolean}`), `iconBackground` (string, default: `--wp--preset--color--surface`), `iconCircleSize` (number, default: 44), `iconShadow` (boolean). Per-item `pending: true` hides that item. Background colour via supports. This is a ~2-hour build. GAP 3: use as-is — column count follows item count. |

---

### HP-4: Featured Product Block (Main card + dashed Trial Pack card, inline pill selectors)

| Field | Detail |
|---|---|
| **Mockup elements** | Section heading + intro text. Two-column grid (5fr/3fr on tablet+, stacked mobile). Left card: product image (220px height), H3, description, pill-group (pack size selector, interactive), price row (Fraunces serif price + note text), primary CTA button. Right card (Trial Pack): same structure but with `border: 2px dashed var(--accent)` and a linear-gradient background, plus a yellow tag badge ("New? Start here"). |
| **Proposed SGS block(s)** | `sgs/card-grid` for the grid layout. Individual cards would be WooCommerce product blocks or a custom `sgs/product-card` (pending ecom plugin). Pill selectors are interactive JS — not part of any current SGS block. |
| **Attributes available** | `sgs/card-grid`: `columns`, `columnsMobile`, `columnsTablet`, `gap`, `hoverEffect`, `items` (array). `__experimentalBorder` support (radius, width, color, style). `hoverBorderColour`, `hoverBackgroundColour`. |
| **GAP 1** | **Dashed border on Trial Pack card** — `sgs/card-grid` items use the border Supports API, which applies uniformly to all cards. There is no per-item `borderStyle: "dashed"` attribute in the `items` array. Setting one card to dashed-accent while the other has solid-border would require per-item border control, which does not exist. |
| **GAP 2** | **Trial Pack gradient background** — `linear-gradient(135deg, rgba(245,208,80,0.08) 0%, rgba(230,138,149,0.06) 100%)` is a subtle warm gradient. `sgs/card-grid` supports `gradients: false` in its color supports — only background-color, not gradient per card. |
| **GAP 3** | **Pill-group pack-size selector with JS price update** — `sgs/card-grid` has no interactive variant selector sub-component. This is a product-page interaction, not a card grid behaviour. On the homepage, this is a simplified preview (no real price update in the mockup — it's static HTML with JS). This entire interactive section belongs in the SGS Ecom Plugin (Phase 1), not the card grid. |
| **GAP 4** | **Asymmetric column ratio (5fr/3fr)** — `sgs/card-grid` uses equal columns (`columns: number`). The 5:3 asymmetric layout is not achievable via the `columns` attribute alone. |
| **Severity** | GAP 1: **BLOCKER** — dashed Trial Pack card forces inline style if not fixed. GAP 2: **BLOCKER** — card gradient not expressible. GAP 3: BLOCKER in the sense that pill selectors need the ecom plugin (known dependency). GAP 4: **BLOCKER** — asymmetric columns force hardcoded CSS. |
| **Fix path** | GAP 1 + 2: The featured product section is NOT a generic card grid — it is a product showcase. Use `core/columns` (two columns, set widths 62.5% / 37.5%) + `sgs/info-box` per card, with `__experimentalBorder` for the Trial Pack card. Trial Pack gradient: apply via inline background via `supports.color.gradients` if the block supports gradients, or accept flat pink surface. GAP 3: Pill selectors — build as part of SGS Ecom Plugin; use static pack-size display for WP Studio import. GAP 4: `core/columns` with percentage-width columns solves 5fr/3fr. |

---

### HP-5: Brand Story (Text left + photo right, blockquote, ghost CTA)

| Field | Detail |
|---|---|
| **Mockup elements** | `--surface-alt` background. Desktop: flex row — text left (flex 1), photo right (40%, max-height 440px, border-radius 16px). Mobile: photo above text (order -1). H2 + blockquote paragraphs + attribution footer (`-- Zainab, Founder`) + ghost CTA button ("Read the full story →"). |
| **Proposed SGS block(s)** | `sgs/heritage-strip` — designed for exactly this text+photo split story pattern |
| **Attributes available** | `headline`, `body`, `badge`, `imageLeft`, `imageRight`, `backgroundColour`, `bodyColour`, `headlineColour`, `layout: "image-text-image"`. Background via supports. Border via `__experimentalBorder`. |
| **GAP 1** | **Blockquote formatting** — `sgs/heritage-strip` has a `body` string attribute but no `blockquote` semantic wrapper or `attribution` sub-field. The mockup renders a styled `<blockquote>` with multiple `<p>` children and a `<footer>` attribution. The `body` attribute would be plain text/HTML, losing the semantic blockquote structure. |
| **GAP 2** | **Ghost CTA button** — `sgs/heritage-strip` has no CTA button attribute. The mockup has a `btn-ghost` link below the blockquote. |
| **Severity** | GAP 1: POLISH — can use `core/quote` block inside a `core/columns` layout as an alternative composition. GAP 2: POLISH — add `core/button` after the heritage strip, or use `core/columns` + `core/quote` + `core/button` composition. |
| **Fix path** | Use `core/columns` (2 columns: 60% text / 40% photo) + `core/quote` + `core/button` for full semantic fidelity. Alternatively: extend `sgs/heritage-strip` with `ctaText` + `ctaUrl` + `ctaStyle` attributes. The core/columns composition requires no new block builds and is acceptable for WP Studio import. |

---

### HP-6: Ingredient Education (4-column icon grid + disclaimer box)

| Field | Detail |
|---|---|
| **Mockup elements** | Section label + H2 + intro text. 4 cards in a grid (2×2 mobile, 4-col at 600px+). Each card: emoji icon (32px, `aria-hidden`), H4 (Fraunces), body text. White card with border-subtle border, border-radius 12px. Disclaimer box below: italic text, white background, border-subtle border, border-radius 10px. |
| **Proposed SGS block(s)** | `sgs/icon-block` (for individual cards) composed in `core/columns` or `sgs/container`. Or: `sgs/info-box` with `mediaType: "icon"`. |
| **Attributes available** | `sgs/info-box`: `heading`, `description`, `icon`, `iconColour`, `iconBackgroundColour`, `iconSize`, `iconPosition: "top"`, `cardStyle: "elevated"`, `__experimentalBorder`. `mediaType: "icon"`. `sgs/icon-block`: `icon`, `iconColour`, `iconSize`, `shape`, `backgroundColour`. |
| **GAP 1** | **Emoji icons** — the mockup uses Unicode emoji (🌾 🍺 🌿 🌱) rather than Lucide SVG icons. `sgs/info-box` and `sgs/icon-block` both use the Lucide icon library. There is no emoji icon type. The design intent (the actual emoji character) cannot be expressed via `icon` attribute. |
| **GAP 2** | **Disclaimer box at the bottom** — a standalone styled text box below the grid. No dedicated block exists; would need `core/paragraph` with background colour and border via the editor's own color/border controls. This is achievable without a new block. |
| **Severity** | GAP 1: **BLOCKER** — emoji icons cannot be expressed via any existing block attribute; either replace with Lucide icons (design decision required) or add emoji support. GAP 2: use as-is with `core/paragraph`. |
| **Fix path** | GAP 1: Two options — (a) replace emoji with semantically equivalent Lucide icons (e.g. wheat/droplets/leaf/seedling — these exist in Lucide) and set per-card icon via `sgs/info-box` inspector. This is the SGS-compliant path requiring no new code. (b) Add `emojiIcon` string attribute to `sgs/info-box` as an alternative to Lucide icon. Option (a) is recommended — no code needed. |

---

### HP-7: Gift Section (2 gift cards + Send-to-Ward bar)

| Field | Detail |
|---|---|
| **Mockup elements** | `--surface-pink` background. Section label + H2 + section subtitle. 2 gift cards (1-col mobile, 2-col at 640px+): each with a category tag badge (pink background, primary-dark text, uppercase), H3, description, Fraunces price, primary CTA. Below cards: "Send to Ward" bar — white card, `border: 1px solid var(--primary)`, flex row, copy + link, border-radius 10px. |
| **Proposed SGS block(s)** | `sgs/info-box` × 2 inside `core/columns` for gift cards. Send-to-Ward bar: `sgs/cta-section` or `core/group` with border. |
| **Attributes available** | `sgs/info-box`: `heading`, `description`, `icon`, `iconBackgroundColour`, `cardStyle`, `__experimentalBorder`. No dedicated "price display" attribute. No "tag badge" attribute. `sgs/cta-section`: `headline`, `body`, `buttons`, `layout`, border via supports. |
| **GAP 1** | **Category tag badge on gift cards** — a coloured pill/badge above the H3 (e.g. "Gift idea", "Most thoughtful"). `sgs/info-box` has no `tag` or `badge` string attribute at the card level (there is a `badge` attribute in `sgs/heritage-strip` but not `info-box`). |
| **GAP 2** | **Fraunces price display** — the price ("£15", "£42") is rendered in Fraunces serif at 30px bold. `sgs/info-box` has no `price` attribute. This would need to be embedded in the `description` HTML, which is non-ideal and fragile. |
| **GAP 3** | **Send-to-Ward bar** — white bar with `border: 1px solid var(--primary)` (not primary-dark, not surface-alt). `sgs/cta-section` has `layout` but its default style is centred/full-width. The mockup's bar is inline-flex with left-aligned copy and right-aligned link — a compact horizontal row, not a hero-style CTA. |
| **Severity** | GAP 1: POLISH — tag can be placed as a core/paragraph above the heading in a `core/group`. GAP 2: POLISH — can embed price in description field with basic HTML. GAP 3: POLISH — `core/group` with `__experimentalBorder` support and flex layout can achieve the bar; no new block needed. |
| **Fix path** | Gift cards: `sgs/info-box` × 2 in `core/columns`. Add price as last line of description or as a separate `core/paragraph` below. Tag: `core/paragraph` with custom colour above `sgs/info-box`. Send-to-Ward: `core/group` with border color set to `--wp--preset--color--primary`, flex layout, containing `core/paragraph` + `core/button`. All achievable without new blocks. |

---

### HP-8: Social Proof (Trustpilot bar + 3 testimonials)

| Field | Detail |
|---|---|
| **Mockup elements** | `--surface-alt` background. H2 + subtitle. Trustpilot bar: white card, border-subtle border, flex row, Trustpilot logo + 5 stars + invite text. 3 testimonial cards in grid (1-col mobile, 3-col at 640px+): yellow stars, italic quote, author name. |
| **Proposed SGS block(s)** | `sgs/testimonial-slider` or 3× `sgs/testimonial` in `core/columns`. Trustpilot bar: `core/group` with border + `core/paragraph`. |
| **Attributes available** | `sgs/testimonial-slider`: `testimonials` (array), `cardStyle`, `ratingColour`, `layout`, `slidesVisible`. `sgs/testimonial`: `quote`, `name`, `rating`, `ratingColour`, `reviewDate`, `avatar`. |
| **GAP** | The mockup shows a static 3-column grid (not a slider). `sgs/testimonial-slider` is a carousel — it can show 3 visible with `slidesVisible: 3` and `showArrows: false` and `showDots: false`, which renders as a 3-up layout on desktop. This is acceptable. Trustpilot bar: no dedicated block — `core/group` works. |
| **Severity** | None — use as-is. |
| **Fix path** | `sgs/testimonial-slider` with `slidesVisible: 3`, `autoplay: false`, `showArrows: false`, `showDots: false` on desktop. Or 3× `sgs/testimonial` in `core/columns` for simpler static layout. |

---

### HP-9: Footer (3 columns, brand block + SVG social icons)

| Field | Detail |
|---|---|
| **Mockup elements** | Dark background (`--text` colour = `#3A2E26`). Grid 3 columns (1-col mobile, 2fr/1fr/1fr at 768px+). Column 1: logo (filter: brightness(0) invert(1)), tagline, Birmingham location text, email link, social icon links (Instagram + WhatsApp inline SVG with text label, pill-style, dark frosted glass `rgba(255,250,245,0.08)` background). Columns 2-3: nav link lists with uppercase heading labels. Footer bottom: copyright + tagline, 1px divider. |
| **Proposed SGS block(s)** | Theme footer template part (`parts/footer.html`) + `core/navigation` + `sgs/social-icons` |
| **Attributes available** | `sgs/social-icons`: `icons` (array), `iconColour`, `hoverColour`, `iconSize`, `gap`, `style`. |
| **GAP 1** | **Social icons with text label** — the mockup shows "Instagram" and "WhatsApp" as text-labelled pill buttons (icon + text in a pill). `sgs/social-icons` renders icon-only by default with hover colour change. There is no `showLabel` or `labelText` attribute per icon, and no pill-background style. The `style` attribute default is "plain" — other values unknown from DB. |
| **GAP 2** | **Logo invert filter** — the logo is displayed with `filter: brightness(0) invert(1)` to make it white on dark background. The theme header block renders the WP site logo — no SVG filter attribute is exposed for the logo block. This would need a CSS rule in the footer template part or functions.php. |
| **Severity** | GAP 1: POLISH — social icons without text labels are acceptable for launch; pill-label style can be added to `sgs/social-icons` in a follow-up. GAP 2: POLISH — add CSS rule to the footer template part CSS. |
| **Fix path** | GAP 1: Accept icon-only social icons for WP Studio import. After: extend `sgs/social-icons` with `showLabel: boolean` and `style: "pill"` option. GAP 2: Add `filter: brightness(0) invert(1)` to the logo `<img>` in `parts/footer.html` — this is CSS on a theme file (not a block attribute), which is acceptable for a structural template rule. |

---

## Product Page — Section-by-Section

### PP-1: Breadcrumb

| Field | Detail |
|---|---|
| **Mockup elements** | `Home > Shop > Zookies` — standard breadcrumb nav. |
| **Proposed SGS block(s)** | `sgs/breadcrumbs` |
| **Attributes available** | `homeLabel`, `separator`, `showHome` |
| **GAP** | None — use as-is. |
| **Severity** | — |
| **Fix path** | use as-is |

---

### PP-2: Product Gallery (Main image + 4 thumbnails, click-to-swap)

| Field | Detail |
|---|---|
| **Mockup elements** | Main image (border-radius 16px, 1px border-subtle border, white background). 4 thumbnail buttons (border-radius 8px, 2px active border in `--primary`, hover `border-color: var(--border)`). Click thumbnail → swap main image via JS. On desktop: gallery fills left column of 2-col layout. |
| **Proposed SGS block(s)** | `sgs/gallery` — with `layout: "grid"`, `columns: 4`, `enableLightbox: false` for thumbs. |
| **Attributes available** | `sgs/gallery`: `images` (array), `layout`, `columns`, `enableLightbox`, `hoverImageZoom`, `gap`. Border via `__experimentalBorder`. |
| **GAP 1** | **Click-to-swap main+thumbnail pattern** — `sgs/gallery` is a standalone grid/carousel/lightbox. It does NOT have a "main image + thumbnail row" layout where clicking a thumb swaps a large featured image. The closest is a carousel or lightbox. The specific product gallery UX (one large featured image, 4 thumbs below, click syncs main) does not exist in `sgs/gallery`. |
| **GAP 2** | **WooCommerce product gallery** — this is a WooCommerce product page. The canonical WP/WC solution is the WooCommerce product gallery block or WC product image block. SGS does not have a WooCommerce-integrated product gallery block (ecom plugin not yet built). |
| **Severity** | GAP 1+2: **BLOCKER** — the product gallery pattern (main+thumbs) does not exist in SGS blocks. This entire product page requires the SGS Ecom Plugin Phase 1 to be complete before it can be built in WP Studio. |
| **Fix path** | Build `sgs/product-gallery` block as part of SGS Ecom Plugin Phase 1. Attributes: `images` (array), `activeIndex` (number). View script handles thumb-click→main-swap. Alternatively use WooCommerce's own product gallery block post-ecom-plugin install. |

---

### PP-3: Product Info Panel (H1, star rating, description, variant selectors, price block, CTA, micro-trust)

| Field | Detail |
|---|---|
| **Mockup elements** | H1 (Fraunces 26px 600). Star rating (5 stars in `--accent` + Trustpilot review-link text). Short description paragraph (border-bottom divider). Variant groups (4 groups: Pack size, Flavour, Topping, Dietary) — each with label row showing selected value, pill-group buttons. Pack pills have embedded discount badges (green "Best value" badge, yellow discount-% badge). Flavour has "coming-soon" pill (dashed border, italic, disabled). Dietary → Vegan disables "White Choc" topping (cross-pill JS). Price block: cream surface box with Fraunces price + per-unit line + green delivery note with truck SVG. CTA button. Trial-pack note (link). Micro-trust row: 4 inline emoji+text items. |
| **Proposed SGS block(s)** | This entire panel is the SGS Ecom Plugin's product-info block. No equivalent exists in SGS yet. |
| **Attributes available** | `sgs/star-rating`: `rating`, `starColour`, `displayMode`, `schemaEnabled` — covers the star display. No WC integration. |
| **GAP** | **No product-info block exists in SGS.** The entire variant selector + price + add-to-cart panel is the core of the ecom plugin (Phase 1). This includes: (a) pill-style variant selectors with active/disabled/coming-soon states, (b) cross-variant conditional disabling (Vegan disables White Choc), (c) live price update on pack selection, (d) add-to-cart with WC integration. None of these exist in any current SGS block. |
| **Severity** | **BLOCKER** — entire product info panel requires ecom plugin. |
| **Fix path** | Build `sgs/product-info` block in SGS Ecom Plugin Phase 1. Attributes: `productId` (links to WC product), `variantGroupOrder` (array). Internal logic: Interactivity API store for variant state, WC REST API for live pricing, `wp_interactivity_config` for product data. The cross-variant disable (Vegan → disable White Choc) needs Interactivity API conditional directive: `data-wp-bind--disabled`. |

---

### PP-4: Variant Selector Pills Detail

| Field | Detail |
|---|---|
| **Mockup elements** | `.pill` — 44px min-height, 8px/14px padding, `border: 2px solid var(--border)` default, `border-color: var(--primary)` active, `background: rgba(230,138,149,0.08)` active, `opacity: 0.38; cursor: not-allowed; text-decoration: line-through` for `[disabled]`. Coming-soon: `opacity: 0.5; font-style: italic; border-style: dashed`. Inline badge children: green "Best value" pill, yellow discount "−36%" pill. |
| **Proposed SGS block(s)** | None — part of `sgs/product-info` (ecom plugin). |
| **GAP** | No `sgs/variant-pills` block exists. This is a new build. |
| **Severity** | **BLOCKER** — part of ecom plugin blocker. |
| **Fix path** | Build as sub-component of `sgs/product-info`. Not a standalone block — internal to the product panel. |

---

### PP-5: Vegan → Disables White Choc Cross-Variant Conditional

| Field | Detail |
|---|---|
| **Mockup elements** | Selecting "Vegan" in Dietary group → adds `[disabled]` to "White Choc" pill in Topping group. A note appears: "Vegan: no eggs, no dairy. White Choc topping unavailable." |
| **Proposed SGS block(s)** | Interactivity API store logic inside `sgs/product-info`. |
| **GAP** | No existing SGS block supports cross-group conditional disabling. The Interactivity API can handle this — `data-wp-bind--disabled` directive bound to store-derived boolean. The SGS framework already uses the Interactivity API (gallery block). |
| **Severity** | **BLOCKER** — part of ecom plugin, but the Interactivity API capability is confirmed available in the framework. |
| **Fix path** | Implement in `sgs/product-info` view script using Interactivity API store. Pattern: `store('sgs/product-info', { state: { isVegan: false, toppingOptions: [...] }, ... })`. Standard Interactivity API pattern. |

---

### PP-6: Ingredient Education (Inline 4-col, same as HP-6)

| Field | Detail |
|---|---|
| **Mockup elements** | Same 4-card ingredient grid as homepage (HP-6), slightly smaller icon (28px emoji vs 32px) and card padding 18px vs 22px. |
| **Proposed SGS block(s)** | `sgs/info-box` × 4 in `core/columns` |
| **GAP** | Same as HP-6 GAP 1 — emoji icons not expressible. |
| **Severity** | BLOCKER (same root cause as HP-6) — but if HP-6 is fixed with Lucide icon approach, this is resolved at the same time. |
| **Fix path** | Same as HP-6: use Lucide icon equivalents. |

---

### PP-7: Allergen Block (FSA-compliant, coral border, vegan variant section)

| Field | Detail |
|---|---|
| **Mockup elements** | Container with `background: #FFF5F6; border: 2px solid var(--primary); border-radius: 12px; padding: 22px 24px`. Callout label (uppercase, coral, with warning emoji). H3 "Allergen Information". Body text with bold allergens (using `<strong>`). Italic advisory note. Divider + vegan variant section (separate sub-section with `border-top: 1px solid var(--primary)`, "Vegan variant:" in green bold). |
| **Proposed SGS block(s)** | `sgs/notice-banner` (nearest match) |
| **Attributes available** | `sgs/notice-banner`: `text` (string), `icon`, `variant`, `textColour`, `dismissible`. `__experimentalBorder` support: radius, width, color, style. `color.background: false` — **background colour is NOT supported by sgs/notice-banner**. |
| **GAP 1** | **Background colour not supported** — `sgs/notice-banner` has `"color": {"background": false, "text": false}` in its supports. The mockup's `background: #FFF5F6` (light pink-white) cannot be set via any attribute. |
| **GAP 2** | **Bold inline allergens + vegan sub-section** — `sgs/notice-banner` has a single `text` string attribute. The mockup has semantic structure: `<p>` with `<strong>` allergens + `<p>` italic note + `<div>` vegan sub-section with coloured sub-heading. A single flat `text` string cannot hold this structure without hardcoded HTML. |
| **GAP 3** | **2px primary-colour border** — `__experimentalBorder` supports `color`, so the border colour CAN be set to `var(--wp--preset--color--primary)`. This part works. |
| **Severity** | GAP 1: **BLOCKER** — background colour locked out of inspector. GAP 2: **BLOCKER** — rich allergen structure with vegan sub-section not achievable in one `text` field. |
| **Fix path** | Build new block `sgs/allergen-notice`. Attributes: `regularAllergens` (array of string — each rendered in `<strong>`), `advisoryNote` (string), `showVeganVariant` (boolean), `veganText` (string), `borderColour` (string, default `primary`), `backgroundColour` (string, default `surface-alt`). OR: use `core/group` with `__experimentalBorder` + background colour support + `core/paragraph` blocks inside (rich InnerBlocks). The InnerBlocks composition approach requires no new block build and is editor-friendly. |

---

### PP-8: Product Reviews (3-up cards)

| Field | Detail |
|---|---|
| **Mockup elements** | `--surface-alt` background. H2. 3 review cards: star rating in `--accent`, italic quote, author + date. Same as HP-8 testimonials but with date shown. |
| **Proposed SGS block(s)** | `sgs/testimonial-slider` with `slidesVisible: 3` or 3× `sgs/testimonial` in `core/columns` |
| **Attributes available** | `sgs/testimonial`: `quote`, `name`, `reviewDate`, `rating`, `ratingColour`. |
| **GAP** | None — `reviewDate` attribute exists on `sgs/testimonial`. Use as-is. |
| **Severity** | — |
| **Fix path** | use as-is |

---

### PP-9: Product Page Footer (Mini footer — logo + 6 links + copyright)

| Field | Detail |
|---|---|
| **Mockup elements** | Dark background. Flex row: inverted logo, 6 quick links, copyright. Simplified vs homepage footer. |
| **Proposed SGS block(s)** | Separate footer template part (`parts/footer-minimal.html`) |
| **GAP** | None if a minimal footer template part is available. Theme has `parts/` directory. |
| **Severity** | — |
| **Fix path** | Create `parts/footer-mamas.html` with logo + nav + copyright. Theme template part, not a block gap. |

---

## Specific Scrutiny Items (as requested)

### 1. Trust bar icon-in-white-circle pattern

**Verdict: BLOCKER.** No existing block (certification-bar, icon-list, icon-block) supports the "icon inside a white disc with box-shadow on a coloured row" pattern via inspector attributes. The `shape` attribute on `sgs/icon-block` exists but does not produce a white background circle. The `data-pending` hide flag for the Halal slot requires a new per-item `pending: boolean` attribute. Requires `sgs/trust-badges` new block.

### 2. Hero with two-column split + photo-bleed to edge at 1440px

**Verdict: BLOCKER.** The current `sgs/hero` split variant constrains the media column with `max-width: 50%` and applies internal padding `var(--wp--preset--spacing--60) var(--wp--preset--spacing--40)` to the whole block. The image also gets `border-radius: 16px`. The mockup requires: no border-radius on the photo, and the photo filling the column flush to the container edge. Requires a `splitImageBleed: boolean` attribute + conditional CSS that strips padding on the media column and removes the border-radius.

### 3. Featured product grid with dashed-yellow Trial Pack card

**Verdict: BLOCKER.** `sgs/card-grid` applies border settings uniformly across all items — no per-item border-style (dashed vs solid). The Trial Pack also needs a gradient background per-card, which card-grid items don't support. The asymmetric 5fr/3fr column ratio is also not achievable via the `columns: number` attribute. **Fix: use `core/columns` with two percentage-width columns containing `sgs/info-box` blocks.** This resolves all three sub-gaps without a new block.

### 4. Pill-style variant selectors with active state, Best-Value badge, disabled state, cross-variant Vegan conditional

**Verdict: BLOCKER (known ecom dependency).** No `sgs/variant-pills` block exists. This is the SGS Ecom Plugin Phase 1 core deliverable. The Vegan-disables-WhiteChoc behaviour needs the Interactivity API — the framework can handle it (gallery block uses it already), but the logic doesn't exist yet. This gap is expected and gated on the ecom plugin, which is a known Phase 1 dependency documented in the master plan.

### 5. FSA-compliant allergen block (coral border + bold inline allergens + vegan sub-section)

**Verdict: BLOCKER.** `sgs/notice-banner` has `color.background: false` — cannot set the light pink background via any inspector control. The bold-allergen + vegan-sub-section structure is also too rich for a single `text` string field. **Fix: `core/group` with InnerBlocks approach (zero new block code needed) OR build `sgs/allergen-notice`.** Recommended path for WP Studio import: `core/group` with border + background set via core color supports + `core/paragraph` children. This is fully expressible today.

### 6. Skip link + focus-visible + reduced-motion

**Verdict: No gap.** These are handled at the theme level. The mockup includes a `.skip-link:focus { left: 0 }` pattern and `*:focus-visible` outline + `@media (prefers-reduced-motion: reduce)` — all three are present in `functions.php` or `style.css` as theme-level defaults. The mamas-munches style variation will inherit them. No per-block attributes needed.

### 7. Send-to-Ward call-out bar

**Verdict: POLISH / no new block needed.** The bar is white surface, `border: 1px solid var(--primary)`, flex row, copy + link. `core/group` with `__experimentalBorder` colour set to primary + background white + flex layout (via layout supports) handles this. `sgs/cta-section` is overkill — it's designed for full-width hero-style CTAs. Use `core/group` composition.

### 8. Footer social icons with text labels

**Verdict: POLISH.** `sgs/social-icons` renders icons without text labels. The mockup's "Instagram / WhatsApp" pill buttons are visually distinct. Accept icon-only for WP Studio import; add `showLabel: boolean` + `style: "pill"` to `sgs/social-icons` in a follow-up session.

---

## Accessibility — Theme-Level Coverage

| A11y requirement | Status |
|---|---|
| Skip link | Handled by theme header template |
| `*:focus-visible` outline | Handled in `style.css` / `utilities.css` |
| `prefers-reduced-motion` | Handled in `style.css` and block view scripts |
| 44px touch targets | All SGS block CTAs already comply |
| WCAG AA contrast | Palette validated in brief §2 — `#3A2E26` on `#FBF3DC` = 10.1:1. Coral on cream fails at normal size — brief correctly restricts to 24px+ bold use only. |

No per-block accessibility attributes are required — theme-level handles the spec.

---

## Summary Count

| Category | Count |
|---|---|
| Homepage sections | 9 (header + 8) |
| Product page sections | 9 |
| **Total sections analysed** | **18** |
| Total BLOCKER gaps | **9** |
| Total POLISH gaps | **8** |
| Sections with zero gaps | 5 |

---

## BLOCKER Summary (priority order)

| # | Blocker | Root cause | Effort to fix |
|---|---|---|---|
| **B1** | Ecom Plugin — entire product info panel (variant selectors, price, add-to-cart, Vegan conditional) | No `sgs/product-info` block exists | HIGH — this is the entire ecom Phase 1 (4-8 sessions per master plan) |
| **B2** | Ecom Plugin — product gallery (main+thumbnails click-swap) | No `sgs/product-gallery` block | MEDIUM — sub-task of ecom Phase 1 |
| **B3** | Trust bar icon-in-white-circle + Halal pending slot | No block supports circular icon wrapper + per-item pending flag | LOW — ~2 hours. New `sgs/trust-badges` block |
| **B4** | Hero split: photo bleed (no border-radius, flush to column edge) | `sgs/hero` applies border-radius and padding to split image unconditionally | LOW — ~1 hour. Add `splitImageBleed: boolean` attribute |
| **B5** | Hero split: button hover colour (invert to charcoal) | No `ctaPrimaryHoverBackground` / `ctaPrimaryHoverColour` attributes | LOW — ~1 hour. Extend hero CTA hover attributes |
| **B6** | Trial Pack card: dashed border + gradient background + asymmetric columns | `sgs/card-grid` applies border/background uniformly, no asymmetric columns | NONE if switching to `core/columns` — zero code needed |
| **B7** | Allergen block: background colour + rich semantic structure | `sgs/notice-banner` has `color.background: false`; single `text` field too flat | NONE if using `core/group` InnerBlocks — zero code needed |
| **B8** | Emoji icons in ingredient grid | No emoji icon type in `sgs/info-box` or `sgs/icon-block` | NONE if switching to Lucide icon equivalents — zero code needed |
| **B9** | Hero section label / eyebrow text (above H1) | No eyebrow attribute in `sgs/hero` | NONE if using `core/paragraph` above headline — zero code needed |

---

## Recommended Build Order

### Before WP Studio import (blockers that need code)

1. **B4 + B5 — Hero extensions** (~2 hrs combined): Add `splitImageBleed: boolean` + `ctaPrimaryHoverBackground`, `ctaPrimaryHoverColour`, `ctaSecondaryHoverBackground`, `ctaSecondaryHoverColour` to `sgs/hero`. These affect every future hero section — high reuse value.

2. **B3 — `sgs/trust-badges` block** (~2 hrs): Standalone new block. High brand-impact at scroll position 2. Required for Halal cert future-proofing.

### Before WP Studio import (blockers with zero code needed — use composition)

3. **B6 — Trial Pack card**: Use `core/columns` (62.5% / 37.5%) + `sgs/info-box` per card + `__experimentalBorder`. Dashed border set per-card via block editor border controls. No build required.

4. **B7 — Allergen block**: Use `core/group` with background + border-colour + InnerBlocks (`core/paragraph` with bold allergens). No build required.

5. **B8 — Emoji icons**: Replace with Lucide equivalents (🌾 → `wheat`, 🍺 → `flask-conical`, 🌿 → `leaf`, 🌱 → `seedling`). No build required — design decision only.

6. **B9 — Eyebrow text**: `core/paragraph` above `sgs/hero` headline, or accepted as POLISH post-launch.

### After WP Studio import (known dependency)

7. **B1 + B2 — SGS Ecom Plugin Phase 1**: Product info panel + product gallery + variant selectors + WC cart integration. This gates the product page entirely. The homepage can import without this; the product page needs it before it can be built in WP Studio.

---

## Estimated Effort per Code-Requiring Blocker

| Blocker | Est. effort |
|---|---|
| B3 — `sgs/trust-badges` | ~2 hrs |
| B4 — Hero `splitImageBleed` | ~45 min |
| B5 — Hero CTA hover attributes | ~45 min |
| B1+B2 — Ecom Plugin Phase 1 | 4-8 sessions (separate project) |

B6, B7, B8, B9 require zero build time — composition or design decision only.

---

## Verdict

**GO WITH CAVEATS for homepage WP Studio import.**

Fix B4 + B5 (hero attributes, ~1.5 hrs combined) and B3 (`sgs/trust-badges`, ~2 hrs) before import. Use composition (core blocks) for B6, B7, B8 — zero build time.

**HOLD on product page** until SGS Ecom Plugin Phase 1 ships. The product page cannot be assembled without `sgs/product-info` (variant selectors + cart) and `sgs/product-gallery`. These are not gaps to patch — they are the ecom plugin's core deliverables.

The homepage (8 sections) can be fully imported and built in WP Studio within one session once the 3 code-requiring blockers are fixed first.
