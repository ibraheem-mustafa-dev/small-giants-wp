---
doc_type: report
project: small-giants-wp
created: 2026-08-23
status: COMPLETE — 10 of 10 surfaces graded; register only, zero template edits
axis: Phase 3 design axis (Wave A closed the correctness axis; this is the second axis)
---

# Phase 3 — template design benchmark

**What this is, in one sentence.** Every page type the SGS theme ships was compared against
named, measured, top-tier examples of that same page type, and this file records where ours
falls short, how much it would cost to close, and — the field that matters most — **which
layer owns the fix**.

**What this is NOT.** It is not a set of edits. No template was changed. Two of the ten
surfaces are deliberately empty shells and have been kept that way; their findings are
pushed to the pattern, content and settings layers rather than invented into the template.

## How to read a finding

Every finding carries a **layer**, and the layer is the point:

| Layer | Meaning | Who acts |
|---|---|---|
| `TEMPLATE` | The `.html` template file is wrong or missing something | Theme edit |
| `PATTERN` | The template is right; there is no good pattern to drop into it | Build a pattern |
| `BLOCK CAPABILITY` | No SGS block can express this — a **block candidate**, never a silent drop | Plugin work |
| `CONTENT` | The design is fine; the canary's data is fixture data | Client/operator |
| `SETTINGS` | theme.json, the client palette, or a WP setting | Config |

**Effort** is S (under an hour) / M (half a day) / L (multi-day).
**Impact** is High / Med / Low against "would a designer call this top-tier".

## Evidence standard used

Everything numeric below was measured live on the canary with Playwright
(`getComputedStyle` / `getBoundingClientRect`) at 1440 and 390, or fetched with `curl`.
Screenshots were used for the aesthetic half, which is legitimate here — design quality is
a visual question. Payload figures are **gzipped**, because that is what a browser
receives. Where a probe was confounded or inconclusive I say so rather than asserting.

### Reference sets used

Both sets were built by research agents that verified every site live (HTTP status plus
computed-style reads) and **discarded sites they could not verify**. Two widely-repeated
claims were checked and found false, and are recorded here so nobody re-derives them:
GitHub's parallax-Octocat 404 no longer exists (`github.com/404` returns HTTP 200 with a
search box and three links, zero SVG), and GOV.UK search never returns zero results, so it
has no empty state to copy.

**Commerce:** END. Clothing, Gymshark, Uniqlo UK, IKEA, Rapha (archives); Nike, Gymshark,
Uniqlo UK, Rapha, Bang & Olufsen (PDPs). Backed by Baymard Institute's product-list and
product-page benchmarks.
**Editorial + utility:** Cloudflare Blog, A List Apart, NN/g, Smashing Magazine, The
Marginalian (index + article); GOV.UK, NN/g, Smashing, Cloudflare (search); GOV.UK, Slack,
Kualo, Vercel (404). Backed by NN/g's no-results SERP guidance and Bringhurst on measure.

---

# ⭐ THE HEADLINE — five cross-surface findings

These are not per-page. Each one is a single fix that lands on every surface at once, and
between them they account for most of the distance to top-tier.

## X-1 — CORRECTED · Headings inherit `primary`, so any mid-luminance brand colour becomes unreadable · Layer: `SETTINGS` (framework default) · Effort S · Impact Med

Measured on the 404 and on a post, and it is the same everywhere:

| Element | Colour | On | Ratio | Needs | Verdict |
|---|---|---|---|---|---|
| H1 "404" (50px, 700) | `#E68A95` | `#FBF3DC` | **2.25:1** | 3:1 | **FAIL** |
| H2 "Page not found" (36px, 700) | `#E68A95` | `#FBF3DC` | **2.25:1** | 3:1 | **FAIL** |
| H1 post title (50px, 700) | `#E68A95` | `#FBF3DC` | **2.25:1** | 3:1 | **FAIL** |
| H3 "Leave a Reply" (24px, 700) | `#E68A95` | `#FBF3DC` | **2.25:1** | 3:1 | **FAIL** |
| Body copy (16px) | `#6B5C50` | `#FBF3DC` | 5.79:1 | 4.5:1 | pass |
| Buttons / links | — | — | 5.28–8.77:1 | 4.5:1 | pass |

> ### ⚠ Originally overstated. Bean pushed back and was right.
>
> The first version said "every heading on the site fails WCAG AA" and used it to cap every
> grade below. **That was the wrong layer.** `#E68A95` is Mama's Munches' brand colour, set
> in that client's `theme-snapshot.json`; it differs per client and is changed the moment it
> does not fit. Grading the *framework* down for one client's colour choice is exactly the
> attribution error the layer field exists to prevent. Grades below are no longer capped.

**What is genuinely framework-level, and sat underneath it.** `theme.json` bound
`styles.elements.heading.color.text` to **`primary`** — so on every client, headings took the
brand colour chosen for buttons and accents. The framework's own `primary` is teal `#1F7A7A`
and passes comfortably; Mama's pink is mid-luminance and measures 2.25:1. **Most brand
colours are mid-luminance**, so this reproduced on the next client automatically and
silently: nobody chose for headings to be unreadable, they chose a brand colour.

The same pink works fine as a *ground* — dark text on it measures 5.28:1 on the "Back to
Homepage" button. Mid-luminance accents are grounds, not type.

**FIXED 2026-08-23 (Bean-chosen).** `styles.elements.heading.color.text` now resolves to
`var:preset|color|text`: headings inherit the body text colour, high-contrast by definition,
and a client wanting coloured headings sets it deliberately. Framework default is visually
near-identical (teal → near-black); Mama's goes 2.25:1 → 11.9:1.

**Still open, as a tooling candidate:** the default is now safe, but nothing *gates* a client
palette. A client who deliberately picks a heading colour still gets no warning. A contrast
gate over `theme-snapshot.json` would close that.

## X-2 — The simplest page on the site ships 89.7 KB of gzipped JavaScript, including jQuery · Layer: `BLOCK CAPABILITY` · Effort S–M · Impact **High**

Measured, gzipped, as the browser receives it:

| Surface | CSS (gz) | **JS (gz)** | JS files | Budget |
|---|---|---|---|---|
| front-page | 13.7 KB | **89.7 KB** | 22 | <50 KB |
| 404 | 15.1 KB | **89.7 KB** | 22 | <50 KB |
| archive | 14.7 KB | **89.7 KB** | 22 | <50 KB |
| search | 14.8 KB | **89.7 KB** | 22 | <50 KB |
| single | 14.6 KB | **91.1 KB** | 23 | <50 KB |
| page | 14.1 KB | **135.2 KB** | 26 | <50 KB |
| single-product | 15.8 KB | **135.1 KB** | 34 | <50 KB |
| archive-product | 15.0 KB | **175.1 KB** | 45 | <50 KB |

**CSS is comfortably inside budget on every surface.** JS is over on every surface — 1.8×
on the simplest pages, 3.5× on the shop.

The biggest items on the **404**, a page with no content and no interactivity beyond a
search box:

| Raw | Gzip | File |
|---|---|---|
| 87.6 KB | **30.2 KB** | `jquery.min.js` |
| 40.1 KB | 15.2 KB | WP Interactivity API runtime |
| 15.3 KB | 4.8 KB | WooCommerce `sourcebuster.min.js` |
| 13.6 KB | 4.9 KB | `jquery-migrate.min.js` |
| 9.6 KB | 3.5 KB | `jquery.blockUI.min.js` |
| 4.4 KB | 1.5 KB | WooCommerce `add-to-cart.min.js` |
| 4.3 KB | 1.6 KB | `woocommerce.min.js` |
| 2.4 KB | 1.2 KB | `order-attribution.min.js` |

**The framework's own non-negotiable is "No jQuery — vanilla JS only frontend."** It is on
every page.

**Cause — proven, not inferred.** The script order on the live 404 is `jquery` →
`jquery-migrate` → `jquery.blockUI` → `add-to-cart` → `js.cookie` → `woocommerce.min`:
WooCommerce enqueues its jQuery frontend bundle sitewide. No SGS *frontend* code declares a
jQuery dependency — grepping the plugin and theme returns two hits, one an admin customiser
control and one the dequeue helper itself.

**The mechanism to fix this already exists in the codebase.**
`plugins/sgs-blocks/includes/configurator-asset-optimiser.php` dequeues exactly this stack —
`woocommerce`, `wc-add-to-cart`, `jquery-blockui`, `sourcebuster-js`,
`wc-order-attribution`, `js-cookie`, then jQuery itself — and it is already defensive
(`sgs_jquery_still_needed()` keeps jQuery if any other enqueued script declares it) and
fully filterable. It is simply **gated to fire only on pages containing a bound
configurator** (`sgs_page_has_bound_configurator()`).

**Fix:** widen that gate from "page has a bound configurator" to "page has no block that
needs the WooCommerce jQuery frontend", keeping the existing `sgs_jquery_still_needed()`
guard untouched. Estimated saving on the non-commerce surfaces is roughly 48 KB gz, which
takes them from ~90 KB to **~42 KB — inside the 50 KB budget.** Real WooCommerce pages keep
their scripts.

This is the highest impact-per-effort item in the whole register: the work is widening one
predicate on code that already exists and already has its safety rails.

## X-3 — The type scale has no display step, so no page can have display typography · Layer: `SETTINGS` · Effort S · Impact Med

The theme's font-size tokens top out at `hero: clamp(32px, …, 50px)`. There is nothing
above it. Every "big" thing on the site is therefore 50px: the 404 numerals, the post title,
the shop H1, the search H1 — all identical.

The reference 404s use **96–200px** display type, with the numerals themselves as the
artwork. The editorial references run H1 at 2.0–2.6× body; ours runs 50/16 = **3.13×**,
which is over the band, and yet still does not read as display type because 50px is a
heading size, not a display size.

**Fix:** add a `display` step above `hero` in `theme.json` (something like
`clamp(56px, 12vw, 160px)`). One token. It unlocks the 404, the archive header and any
future hero pattern at once, and costs zero bytes.

## X-4 — `.has-shadow-sm` is authored in the templates and defined nowhere · Layer: `TEMPLATE` + `BLOCK CAPABILITY` · Effort S · Impact Med

`archive.html:21` gives every post card `className:"has-shadow-sm"`. Searching **every
stylesheet loaded on the page** for `has-shadow` returns **0 rules**. The computed
`box-shadow` on the card is `none`.

The class is a dead hook. The card elevation it was meant to produce has never rendered.
This is the failure mode where a rule that is absent looks identical to a rule that is
present — nothing errors, the class is right there in the markup, and the design silently
does not happen.

**Fix:** either define a shadow utility scale in the theme, or (better, and consistent with
Spec 32's no-inline contract) give `sgs/container` a real elevation control so the operator
picks it in the inspector instead of a template hardcoding a class name. The second option
is a **block candidate**.

## X-5 — Cards are the same colour as the page they sit on · Layer: `SETTINGS` + `TEMPLATE` · Effort S · Impact Med

`archive.html` authors the post card as `backgroundColour:"surface"`. Measured, the card
computes `rgb(251,243,220)` — and the page background is `rgb(251,243,220)`. They are the
same colour. The authored 8px radius is applied and invisible.

So the card has **no figure/ground separation at all**: no fill difference, no border, and
(per X-4) no shadow. Three separate mechanisms that could have separated it, and none of
them lands. Every commerce and editorial reference in both sets separates the card from the
page by at least one of fill, border or elevation.

**Fix:** the client palette needs a distinct `surface` vs page background (a SETTINGS fix),
or the card should use `surface-alt`. Note the framework question underneath: a token named
`surface` that equals the page background is a palette-authoring trap worth gating.

---

# THE SEVEN BENCHMARKED SURFACES

---

## 1. `archive-product.html` — shop / collection · Grade: **D+**

The most ambitious template in the theme and the one furthest from its benchmark, because
two structural things are broken rather than merely under-designed. Wave A confirmed this
file as the *correctness* reference; on the design axis it is the weakest surface.

**Benchmarked against:** END. Clothing, Gymshark, Uniqlo UK, IKEA, Rapha + Baymard.

### What is already good — do not touch

- **The mobile filter drawer is genuinely well engineered.** Measured: it opens as a true
  modal `<dialog>` (`:modal` = true), so focus is trapped by the platform rather than by
  hand-rolled JS; focus moves into the drawer on open; `aria-expanded` flips correctly; the
  close button and the Apply/Clear footer both display; the sticky filter trigger appears on
  scroll at 48px. The design-intelligence DB rates the mobile filter drawer the
  highest-risk component on an archive page (Focus Order 2.4.3 and No Keyboard Trap 2.1.2
  are both Critical) — and this one is built on the primitive that gets it right for free.
- **Sort is a native `<select>` at 44px on mobile.** That is exactly what the best-in-class
  do (SSENSE, END., Glossier, Rapha all back the mobile control with a native select). It
  gives the OS picker and accessibility at no cost. Mid-tier ships a 32px custom dropdown.
- **The result count is rendered as text** ("Showing all 5 results"), next to the controls,
  matching all five reference archives.
- Explicit pagination markup rather than infinite scroll.

### Findings

**S1-1 · The desktop filter rail does not exist — the two-column shop layout never applies · `TEMPLATE` · Effort M · Impact High**

`woocommerce.css` declares the intended layout:
`.sgs-shop-layout { display: grid; grid-template-columns: 260px 1fr; gap: 2rem; align-items: start; }`

Measured on the live page, that element computes **`display: flex`**, not grid. Its
`grid-template-columns` still reads `260px 1fr` — inert, because that property does nothing
on a flex container. Both children measure **1247px wide at the same x-position**: the
filters panel is a full-width block stacked *above* the product grid, not a 260px rail
beside it.

The cause is a specificity/order collision: `sgs/container` emits a per-instance rule
(`.sgs-container-4f4776b4 { display:flex }`) under Spec 32's no-inline contract, at the same
specificity as `.sgs-shop-layout` but later in source order, so it wins. The container is
authored with no `layout` key, so it falls through to its flex default.

Consequence against the benchmark: every reference archive puts filters in a rail beside the
grid at 1440 (or behind a disclosure), and holds the grid to a 1040–1180px content band. Ours
spends roughly 500px of vertical space on a filter panel before the visitor sees a single
product.

**S1-2 · The filters render no selectable options · `TEMPLATE` / needs root-cause · Effort M · Impact High**

Measured on desktop with the panel open, four independent lines of evidence:

1. The Flavour group renders **109px tall** while containing **63** chip elements; the Size
   group renders **61px** containing **23**.
2. Those groups' `textContent` is 1,448 and 473 characters — the option labels *are* in the
   markup — while their `innerText` is **empty**, meaning none of that text is painted.
3. The full-page screenshot shows the "Flavour", "Size" and "Rating" headings with blank
   space beneath each.
4. The "Rating" heading at y=847 has **no corresponding filter block in the DOM at all** — an
   orphaned heading.

So the shop ships a filter rail that a customer cannot use. Baymard's finding is that
mediocre product-list usability correlates with **67–90% abandonment versus 17–33%** on even
slightly optimised toolsets — this is the single largest number in either reference set.

I have deliberately *not* diagnosed the root cause here; this session produces a register.
It needs a `/systematic-debugging` pass of its own.

**S1-3 · Mobile is 1-up where the field is 2-up · `TEMPLATE` · Effort S · Impact High**

Measured at 390: **one card per row at 293px**, page height 3,279px for five products.
Seven of the eight measured reference archives are 2-up on mobile with cards at 167–195px;
only IKEA goes 1-up, and only because its cards carry a compare control and a two-line spec.
Going 1-up doubles the scroll depth to see the same catalogue.

**S1-4 · Product cards have no surface, and their heights are ragged · `TEMPLATE` · Effort S · Impact Med**

Measured at 1440: card background `rgba(0,0,0,0)`, border `0px`, radius `0px`, box-shadow
`none`, padding `0px`. At 390 the first four cards measure **466 / 407 / 425 / 398px** tall —
a 68px spread in the same grid.

The benchmark is unambiguous: every reference reserves an identical box height so there is
zero layout shift as images decode, and the DB rates "Content Jumping" High under Layout.
The image ratio measured 1.72 (landscape); references use a fixed 0.75–0.80 portrait for
apparel or a strict 1.000 square for flatlay/packaged goods — either is fine, but it must be
*fixed* and identical across the grid.

**S1-5 · Grid gutters are the stock-theme tell · `TEMPLATE` · Effort S · Impact Low**

Measured 20px gap, equal in both axes. Across the reference set, row gap is consistently
1.5–2× the column gap (END. 24/40, Uniqlo 0/24, Gymshark 4/24, SSENSE 10/20). An equal
square gutter was, in the research agent's words, "the tell of a stock theme, not a designed
grid" — it appeared only on the two Shopify-default sites.

**S1-6 · Grid images load eagerly · `TEMPLATE` / `BLOCK CAPABILITY` · Effort S · Impact Med**

Measured `loading="eager"` on grid product images. Rapha was the only reference shipping
`loading="lazy"` on grid images, so this is a place to *beat* most of the field cheaply.

**S1-7 · No card-level trust signal · `BLOCK CAPABILITY` · Effort M · Impact Med**

Reference cards carry a star rating with count (Gymshark 4.8, IKEA 4.3/551, Uniqlo 4.8/117)
— the densest trust signal per pixel available in an archive. Ours carry none, despite
`sgs/star-rating` existing as a block. Wiring it into `sgs/product-card` is a **block
candidate**.

**S1-8 · Applied filters have nowhere to read back · `TEMPLATE` · Effort S · Impact Med**

The active-filter chips block is present but computes `display:none` with nothing applied
(correct). Given S1-2, the readback path is untested. Baymard: **20% of sites** have no
applied-filters overview; the benchmark requires chips *above the grid*, not only ticked
boxes in the rail.

---

## 2. `single-product.html` + `parts/sgs-pdp-*` — PDP · Grade: **B**

The strongest surface in the theme by a distance, and in two specific respects it beats most
of the commercial field. Its shortfalls are typographic and hierarchical, not structural.

**Benchmarked against:** Nike, Gymshark, Uniqlo UK, Rapha, Bang & Olufsen + Baymard.

### What is already good — do not touch

- **Variant selection is best-in-class.** Measured: real `<input type="radio">` + `<label>`
  pairs, labels **186×44px** with visible text names, across both Size and Flavour. Native
  radio semantics means keyboard and screen-reader support for free. **Baymard finds 57% of
  sites get this wrong** by using a `<select>`, hiding the range and the out-of-stock states.
  Ours is on the right side of that number.
- **Price-per-unit is shown, with a full ladder.** The buybox renders "£0.83 per bar" plus
  12-pack £0.83 / 24-pack £0.79 / 48-pack £0.51 / 96-pack £0.62. **Baymard: 81% of sites
  don't show price per unit.** This is genuinely ahead of the field and should be protected.
- **Detail content uses real ARIA tabs** — 4 `role="tab"` panels, zero fake `<div>` tabs.
  The reference set uses `<details>` or real ARIA tabs universally; fake tabs are the
  failure mode that locks keyboard users out of the spec content entirely.
- **The gallery column is sticky** (`position:sticky; top:32px`), keeping imagery in view
  while the visitor configures. Hero is 657×657 at a strict 1.000 ratio — correct for
  packaged food, matching END.'s and IKEA's flatlay treatment.
- **Exactly one related-products rail**, single-titled ("You might also like"), below the
  fold — matching Rapha and Glossier, and avoiding the stack-of-four-carousels failure.
- **The primary CTA is full-width inside the buybox at 573×51px** — inside the 44–60px
  benchmark band (Nike 376×60, Gymshark 344×54, B&O 289×44) and full-width as required.

### Findings

**S2-1 · The price is the same size as body copy · `TEMPLATE` / `BLOCK CAPABILITY` · Effort S · Impact High**

Measured: price **16px, weight 400** — identical to the page's body text. The product title
is **50px, weight 700**.

The reference set is emphatic here. Uniqlo renders price at **32px against an 18px title**;
B&O at 24px against a deliberately tiny 14px eyebrow title. In both, the price is the loudest
thing in the buybox. The research agent named "a price at the same size as the body copy"
as *the* mid-tier tell — and ours is worse than the sites it named, because our title is
50px, so the hierarchy is actively inverted: the product name shouts, the price whispers.

This is the single cheapest high-impact change on the PDP.

**S2-2 · The buybox column is ~60% wider than the field · `TEMPLATE` · Effort S · Impact Med**

Measured: gallery column 659px, configurator column **573px**, inside a 1280px band.

The most consistent number in the entire commerce study was buybox width: **385–410px, or
27–28% of a 1440 viewport, on every single reference** (B&O 385, Nike 400, Glossier 400,
Gymshark 410). Ours is 573px — about 45% of the band. A wide buybox spreads the buy decision
horizontally and weakens the vertical stack of price → options → CTA that the references
rely on.

**S2-3 · No trust copy in the buybox · `TEMPLATE` · Effort S · Impact Med**

Measured: the configurator column contains no delivery, returns, warranty or guarantee text.
Free delivery + returns appear inside the buybox on Nike, Gymshark, Uniqlo, Rapha and
Glossier; B&O and Rapha add warranty. Baymard: **44% of sites don't surface the return
policy** on the product page, and **60% of users look for it there**.

`sgs/trust-bar` *is* on the page — but as a separate band further down, which is the footer
pattern the benchmark specifically rules out. This is a placement change, not new capability.

**S2-4 · Star rating renders as a bitmap image · `TEMPLATE` / `BLOCK CAPABILITY` · Effort S · Impact Low**

Measured: the rating is an `<img>` at 331×62 with alt text "4.3 out of 5 stars" — WooCommerce's
classic star sprite. `sgs/star-rating` exists as a block and is not used
(`sgs-star-rating` block present on page: false). Swapping to the SGS block gives a scalable,
themeable, zero-request rating.

**S2-5 · Total cost is not shown near the CTA · `BLOCK CAPABILITY` · Effort M · Impact Med**

Baymard: **67% of sites don't show total order cost near the buy button.** With a
pack-size configurator this matters more than usual — the visitor is picking a 96-pack and
the line price is the only number on screen. A **block candidate** for `sgs/buybox`.

**S2-6 · No size/fit or spec guide linked from the variation control · `CONTENT` · Effort S · Impact Low**

Nike, Gymshark and Uniqlo all link a guide from the variation control. For a food product
the equivalent is an allergen or portion note — and the Allergens tab already exists in
`sgs-pdp-content.html`, so this is a link, not a build.

---

## 3. `archive.html` — editorial index · Grade: **C−**

The structure is right and three separate visual mechanisms all fail to land, so the result
reads as an unstyled list rather than a card grid.

**Benchmarked against:** Cloudflare Blog, A List Apart, NN/g, Smashing, The Marginalian.

### What is already good

- 3-up at 1440 with 411px cards — correct column count for an editorial index (benchmark:
  3 columns at ≥1200px).
- The card is a real `<article>`, and the query has a `query-no-results` branch authored.
- Body/meta colour passes contrast (date 5.79:1).

### Findings

**S3-1 · The card has no surface, no shadow and no border · `TEMPLATE` + `SETTINGS` · Effort S · Impact High**

This is X-4 and X-5 landing on the same element. Measured on the authored
`<article class="sgs-container … has-shadow-sm">`: background `rgb(251,243,220)` — identical
to the page — `box-shadow: none` because `.has-shadow-sm` matches zero CSS rules anywhere,
and radius 8px which is invisible on a same-colour card. Three mechanisms, none lands.

**S3-2 · Card heights are ragged because excerpts are unclamped · `TEMPLATE` · Effort S · Impact High**

Measured across the nine cards: heights **238 × 8 and 337 × 1**, driven by excerpt heights of
126px vs 203px. `-webkit-line-clamp` computes `none`.

Every reference clamps the excerpt to 2–3 lines precisely so ragged content cannot break the
grid. This is a one-property fix with a visible payoff.

**S3-3 · No aspect-ratio box is reserved for the featured image · `TEMPLATE` · Effort S · Impact High**

Measured: none of the nine posts has a featured image, and the cards simply collapse to text
height. The benchmark is explicit — A List Apart proves an index can be first-rate with *no*
images, but the layout must not change shape depending on whether an image exists. Reserving
`aspect-ratio: 16/9` on the image slot makes the grid stable either way and takes CLS to zero.

This matters disproportionately for a client framework: many clients will have no featured
images, and the theme should look deliberate rather than broken when they don't.

**S3-4 · The card title is too small and the hierarchy too flat · `TEMPLATE` · Effort S · Impact High**

Measured: title 20px, excerpt 16px, date 14px. Title-to-meta ratio is **1.43:1**.

Cloudflare runs 32px title / 18px excerpt / 14px author / 12px date — four distinct tiers and
a **~2.5:1** title-to-meta ratio, so there is never ambiguity about what to read first. The
benchmark band for card titles at 1440 is **28–34px**. At 20px against 16px body, ours has
almost no hierarchy at all.

**S3-5 · Every card has two competing links · `TEMPLATE` · Effort S · Impact Med**

Measured: a title link (187×24) and a separate "Read more" link (82×26). The benchmark rule
is "the whole card is one link, or the title is the only link — never both plus a Read more".
Two links to the same destination also doubles the tab stops for keyboard users.

**S3-6 · Link targets are 24–26px tall · `TEMPLATE` · Effort S · Impact Med**

Both card links measure well under the 44px target the framework already claims to beat. The
DB rates touch targets High, directly under accessibility.

**S3-7 · The archive header carries no description and no count · `TEMPLATE` + `CONTENT` · Effort S · Impact Med**

Measured: `term-description` is absent from the rendered page and no result count appears.
The benchmark expects a 1–2 sentence explanation of the term plus the count. The template
*does* author `term-description`, so on a category with a description filled in this partly
resolves — the count does not.

**S3-8 · The date is sentence case, not a metadata label · `TEMPLATE` · Effort S · Impact Low**

Measured "July 31, 2026", `text-transform: none`. References render the date as an uppercase
small-caps-style label so it reads as metadata at a glance rather than as prose.

**S3-9 · SUSPECTED, NOT VERIFIED — the card's inner is a row, not a column · `TEMPLATE` · Effort S · Impact Med**

Measured fact: the card's `.sgs-container__inner` computes `display:flex; flex-direction:row`.
With zero featured images on the canary the consequence is invisible — and my attempt to
prove it by injecting a probe figure produced a **0×0 box**, so that test was vacuous and I
am not claiming a verdict from it.

**Reproduction step to settle it:** publish one post with a featured image and re-measure
whether the image stacks above the text or sits beside it. Recorded here so it is not lost;
not asserted as a defect.

---

## 4. `search.html` — search results · Grade: **C+**

Gets NN/g's two hardest rules right and then stops one step short of a real recovery page.

**Benchmarked against:** GOV.UK, NN/g's no-results guidance, Smashing (as a cautionary
reference), Cloudflare, A List Apart.

### What is already good — genuinely ahead of a design publication

Measured on `?s=zzqqxxnothing`:

- **The empty state is a first-class page, not an absent list.** "No results found" renders
  as a 36px H2 with explanatory copy beneath. NN/g's eyetracking found users' gaze had *zero
  fixations* on a small "no matches found" line — a bold, headline-sized statement is
  precisely their first guideline, and we meet it.
- **The query is repopulated into both search inputs** (`value="zzqqxxnothing"`). This is NN/g's
  second guideline — a search box with the original query still in it for easy editing —
  and **Smashing Magazine, a design publication, fails it**: its zero-hit page ships an empty
  input and replaces the query with an ellipsis. We beat them on the thing that matters most.
- The query is echoed in the `<title>` and in the H1.
- Search inputs measure 56px tall at 16px font, beating the 44px/16px floor (16px matters:
  below it, iOS zooms the page on focus).
- The copy does not mock the user — NN/g's third guideline.

### Findings

**S4-1 · The empty state offers exactly one route out · `TEMPLATE` · Effort S · Impact High**

Measured: **zero links** in `<main>` on the no-results page. The only recovery affordance is
the repopulated search box.

The benchmark expects **3–5 concrete routes**: the repopulated box (have it), a spelling or
"did you mean" suggestion, 5–8 popular/suggested query chips (Smashing ships 8), a
browse-by-category link, and a plain instruction to use fewer or different words. A visitor
who does not know what else to type currently has nowhere to go.

The cheapest strong version: a short row of popular-search chips plus a link to the shop and
the blog. Chips could be an operator-editable list, which makes this a small
**block candidate** (a "suggested searches" block) or simply a pattern dropped into the
`query-no-results` branch.

**S4-2 · No result count on the results page · `TEMPLATE` · Effort S · Impact Med**

Measured `resultCountShown: false`. GOV.UK renders "29 results" as a heading above the first
result; the benchmark is number-first, then noun. It also doubles as the feedback that the
search did something. `core/query-total` exists and is unmapped — a gap candidate rather than
a violation.

**S4-3 · The empty page does not fill the fold · `TEMPLATE` · Effort S · Impact Low**

Measured `<main>` height 482px in an 852px viewport. Not a defect, but a recovery page with
380px of dead space below it is a wasted opportunity to place exactly the routes S4-1 asks for.

**S4-4 · Results do not reuse the archive card, so search looks like a different site · `TEMPLATE` · Effort S · Impact Low**

`search.html` builds its own bordered row while `archive.html` builds a card. The benchmark
(and Cloudflare's implementation) reuses one component so search never reads as a foreign
page. Note this cuts both ways today: the archive card is the weaker of the two (S3-1..S3-6),
so unify *after* the archive card is fixed, not before.

**S4-5 · No matched-term highlighting and a fixed-length excerpt · `BLOCK CAPABILITY` · Effort M · Impact Med**

The benchmark expects the matched terms marked in title and excerpt, and the excerpt to be a
contextual snippet around the match rather than the post's fixed opening. `core/post-excerpt`
with `excerptLength:30` gives the opening 30 words regardless of where the match is. Both are
**block candidates**.

---

## 5. `index.html` — mandatory fallback · Grade: **C** (source-only)

**⚠ This surface could not be viewed live and I am not pretending otherwise.** The canary
runs `show_on_front=posts` with `page_for_posts=0`, so `front-page.html` intercepts and
`index.html` is genuinely unreachable. That is the *healthy* state for a fallback template,
not a defect. Everything below is read from the template source and graded against the same
editorial-index benchmark.

### Findings

**S5-1 · It is a bare list where `archive.html` is a card grid · `TEMPLATE` · Effort S · Impact Med**

`index.html` renders `post-title` / `post-date` / `post-excerpt` with no card wrapper, no
featured image, no grid layout and no styling — a plain stacked list. `archive.html`, which
shows the same content type, builds a 3-up card grid.

WordPress falls back to `index.html` whenever a more specific template is missing, so this is
the template a visitor sees in exactly the situations nobody planned for. The benchmark's
strongest lesson here is A List Apart's: a title-only index can be excellent — but it has to
be *designed* as one (large titles, generous rhythm), not left as browser defaults.

**S5-2 · It is the only one of the three listing templates that gets the heading level right — a note, not a finding**

`index.html` omits `post-title` `level`, so titles nest correctly. `archive.html:21` and
`search.html:16` both set `level:3` under an unset `query-title` (h1), producing an h1→h3
skip. That is already logged as correctness item **U-3** and is explicitly not mine to fix.

---

## 6. `single.html` — editorial article · Grade: **C**

The bones are right — an 800px prose band, a byline row, tags, prev/next, a full comment
thread — and the typography inside them is off in three ways that a reader feels immediately.

**Benchmarked against:** A List Apart (measured 18px/1.70/63ch), Cloudflare Blog (16px/1.75/71ch),
Butterick, The Marginalian, Every.

### What is already good

- A dedicated 800px prose band on `<main>`, so the article is not full-width. Measured
  `max-width: 800px`.
- Body colour `#3A2E26` on cream measures **11.86:1** — well past AA, with headroom.
- The byline row exists (date · author · category) and passes contrast at 5.79:1.
- Tags sit in their own bordered container after the body, which is the right shape.

### Findings

**S6-1 · ~~Paragraphs have zero spacing between them~~ — WITHDRAWN, the finding was false**

**This was the headline typographic finding and it was wrong, so here is exactly how.** I
measured `margin-bottom: 0px` on the article's body paragraph and reported that prose runs
together — "the most damaging single typographic defect in the register".

Re-checked against the live DOM: **the fixture post contains exactly ONE paragraph.** It is
therefore the first child, and core's rule
`:root :where(.is-layout-flow) > :first-child { margin-block-start: 0 }` makes that zero
correct and deliberate. Its sibling
`:root :where(.is-layout-flow) > * { margin-block-start: var(--wp--preset--spacing--40) }`
gives every *subsequent* paragraph 24px; `--wp--style--block-gap` resolves to `1.5rem` live,
and `.wp-block-post-content` carries `is-layout-flow` correctly.

**There is no defect.** I measured a property on content incapable of exhibiting it — one
paragraph cannot show inter-paragraph spacing — and reported the absence as a fault.

**S6-2 · The measure is 79 characters — over the band · `SETTINGS` (client snapshot, NOT the framework) · Effort S · Impact Med**

Measured with a live `1ch` probe: **79.3 characters** per line at 16px Inter in the 800px band.

Bringhurst's band is 45–75 with 66 optimal; both measured references sit inside it (ALA 63ch,
Cloudflare 71ch). At 79ch the eye has to travel too far to find the next line's start.

Two ways to land it, and they compose: raise body size to 18px (which also improves
readability outright and pulls the measure to ~70ch in the same band), or set the band in
`ch` rather than px — `max-width: 66ch` is self-correcting across every font size the client
might pick, which is the more framework-appropriate fix.

**S6-3 · Line-height at the bottom of the band · `SETTINGS` (client snapshot, NOT the framework) · Effort S · Impact Low**

Measured 25.6px / 16px = **1.60**. The band is 1.6–1.75, and the benchmark's own guidance is
that a serif at 18px tolerates the low end while a **sans at 16px wants the high end** —
Cloudflare runs exactly 16px at 1.75. Ours is the tightest combination in the band.

**S6-4 · H1 is 3.13× body, above the benchmark band · `TEMPLATE` · Effort S · Impact Med**

Measured H1 50px against 16px body. The band is 2.0–2.6× (ALA 2.0, Cloudflare 2.6). H1
line-height measures 60/50 = 1.20 where the references tighten display headings to 1.0–1.15
(Cloudflare runs 42px/42px = 1.0). Both resolve naturally if S6-2's 18px body lands.

**S6-5 · Prev/next show generic labels, not the actual post titles · `TEMPLATE` · Effort S · Impact Med**

Measured: "←Previous Post" at **26px tall**. The template hardcodes `label:"Previous Post"`.

The benchmark is explicit — prev/next must show the actual titles, in a two-up block, each
target ≥44px. A visitor cannot tell whether the next article interests them from the word
"Next".

**S6-6 · The next-post link renders as an empty zero-height element · `TEMPLATE` · Effort S · Impact Med**

Measured: the second `post-navigation-link` is **0px tall with no text**, because this is the
newest post and there is no next. A navigation affordance with no target should be suppressed
or the pair should be balanced — an empty element in the flow is the unhandled edge case.

**S6-7 · "Leave a Reply" is an H3 directly under the H1 · `TEMPLATE` · Effort S · Impact Low**

Measured H1 → H3 with no H2 between. Same defect class as the known `archive.html` /
`search.html` skip, on a different surface, and worth folding into that fix rather than
treating separately.

**S6-8 · The comment thread could not be judged · `CONTENT` · not a finding**

The canary has **zero approved comments**, so the 14 comment blocks render only the reply
form (measured 574px). Nesting depth, avatar treatment and thread rhythm are unassessed. The
benchmark asks for reply nesting capped at 2–3 levels and comments collapsed or lazily
revealed by default. **To judge this honestly, seed two or three comments including one
reply.** I have not seeded them — that is a content mutation on a client canary and outside a
register-only session.

**S6-9 · No reading time in the byline · `BLOCK CAPABILITY` · Effort S · Impact Low**

The benchmark byline is author (linked) + `<time datetime>` + reading time at 13–15px.
`core/post-time-to-read` exists and is unmapped — a gap candidate.

---

## 7. `404.html` — Grade: **C+**

Unusual in this register: it gets almost every *functional* rule right and has essentially
zero design ambition. It is a correct 404, not a memorable one — and per the brief, 404 is
the one page type where being memorable is a standing award category.

**Benchmarked against:** GOV.UK (the cheap-and-excellent benchmark), Slack, Kualo, Vercel.

### What is already good — most of the checklist

Measured live:

| Benchmark rule | Ours | Verdict |
|---|---|---|
| Server returns a real 404 | HTTP **404** | pass |
| `<title>` says the page is missing | "Page not found – Mama's Munches" | pass |
| ≤50 words of body copy | **27 words** | pass |
| ≤3 recovery routes, one of them search | search + homepage = 2 | pass |
| Header/footer/search stay present | inherited | pass |
| Copy never blames the user | "doesn't exist or has been moved" | pass |
| No auto-redirect | none | pass |
| Search input ≥44px, ≥16px font | **56px / 16px** | pass |

That is a better functional score than most commercial 404s.

### Findings

**S7-1 · Both headings fail contrast · `SETTINGS` · Effort S · Impact High**

X-1 landing here: "404" and "Page not found" both measure **2.25:1** against a 3:1
requirement. On a page whose entire content is two headings, a search box and one link, the
two headings failing means most of the page fails.

**S7-2 · The H1 is "404" and the H2 is the actual page name · `TEMPLATE` · Effort S · Impact Med**

Measured: `h1` = "404" (50px), `h2` = "Page not found" (36px).

GOV.UK makes "Page not found" the H1 at 48px. A screen-reader user landing here hears the
page announced as "404", which is a status code, not a page name. This is simultaneously an
accessibility finding and a design one: the page has two competing headings and commits to
neither, because the decorative numeral is bigger than the actual message.

**S7-3 · Zero design ambition — no committed idea · `TEMPLATE` + `SETTINGS` · Effort S–M · Impact High (for this page type)**

Measured: `<main>` is **494px tall in an 852px viewport** — the page does not fill the fold —
and contains exactly **one SVG**, the search icon. There is no artwork, no display type, no
motion, nothing specific to this brand.

The research is precise about what separates the award tier: **one committed idea rather than
decoration**, **typographic scale used as the effect** (winners go to 96–200px display type,
usually setting the "404" numerals *as* the artwork), and **an interaction that rewards about
five seconds and then hands you the exit**. The failure mode of the award tier is spending the
moment and forgetting the exit — and we already have the exit, which is the harder half.

Crucially, all of this is affordable inside the framework's constraints. The research agent
costed the cheap versions, all Tier V (vanilla/CSS), no CDN, no GSAP, no WebGL:

1. **Fluid display numerals — 0 KB JS.** `font-size: clamp(6rem, 28vw, 20rem); line-height: 0.8;
   letter-spacing: -0.04em`. One `<h1>` doing all the visual work. This alone moves the page
   from competent to distinctive — and it is blocked today only by X-3, the missing display
   token.
2. **CSS-only gradient/mask on the numerals**, with a solid `color` fallback declared first
   (~6 lines). Note the framework's own captured caveat that gradient text needs the flat
   fallback underneath.
3. **Pointer-reactive parallax in ~10 lines of JS** — one `pointermove` listener writing two
   custom properties, layers reading them via `translate3d`; under 400 bytes, GPU-composited,
   and entirely removed by one `prefers-reduced-motion` block.
4. **Staggered entrance from an inline `--i` index** — pure CSS, no JS at all.
5. **A server-side randomised line of copy** chosen in PHP from a small array — different on
   every visit, zero JS, zero requests. This is the cheap substitute for Kualo's arcade game,
   which is the one reference idea that genuinely cannot be done inside budget (it needs a
   canvas game loop plus jQuery and Bootstrap from two CDNs — both banned here).

**S7-4 · The status code is not disclosed in the body · `TEMPLATE` · Effort S · Impact Low**

GOV.UK literally prints "Status code: 404". It is honest, and it helps anyone reporting a
broken link. A `<details>`-based disclosure would carry it plus a report-a-broken-link mailto
at zero JS cost.

---

# THE TWO SHELLS — reported as shells

Both templates below are **`<main>` + `post-content`**, and that is correct block-theme
practice: the design of a page lives in the patterns and content dropped into it, not in the
template. **No finding below proposes a template edit, and none should.**

## 8. `page.html` — Grade: **correct as a shell**

`<main contentWidth:full>` + a banded `post-title` container + `post-content`. 135 published
pages use it. The width model is stated explicitly and documented in the file.

**S8-1 · There is no strong hero pattern for a service or landing page · `PATTERN` · Effort M · Impact High**

The template is right and the cupboard is bare. A client building a service page starts from
`post-content` and an empty canvas. The framework has `sgs/hero`, `sgs/cta-section`,
`sgs/feature-grid`, `sgs/process-steps`, `sgs/pricing-table` and `sgs/trust-bar` as blocks —
what is missing is *assembled patterns* that put them together into a page shape a
non-designer can pick from the inserter.

This is where the "best version of itself" question actually gets answered for `page.html`:
not by designing the template, but by giving it good things to be filled with.

**S8-2 · The page title is not part of any designed header · `PATTERN` · Effort S · Impact Med**

`post-title` sits in a bare container. Every page therefore opens with an unadorned 50px pink
heading (failing X-1) on the page background. A page-header pattern — eyebrow, title,
standfirst, optional breadcrumb — would be the single most-used pattern in the framework.

## 9. `front-page.html` — Grade: **correct as a shell; the site is misconfigured**

**S9-1 · The homepage renders 104 characters and zero `<h1>` · `SETTINGS` · Effort S · Impact High**

Measured live at `/`: `<main>` is **26px tall in an 818px viewport**, contains one block
(`post-content`), renders the text *"Fixture post for drag-overflow verification (Spec 38
register Step 2, 2026-07-31). Safe to delete after."*, and has **zero `<h1>`**.

**The template is correct.** The mismatch is that the site is set to show latest posts
(`show_on_front=posts`) while `front-page.html` holds `post-content`. This is a
**Settings → Reading** fix, not a template one, and it is the clearest example in this
register of why the layer field matters: "fix" this in the template and you would design
default sections into a shell that is supposed to be empty — exactly the failure the brief
warned against.

**S9-2 · Zero `<h1>` on the homepage is also an SEO and a11y defect · `SETTINGS` · Effort S · Impact Med**

Follows from S9-1 and resolves with it.

---

# ⭐ RANKED — highest impact per effort first

The order to work in.

> **Corrections applied 2026-08-23 after Bean's review.** Three rows below changed layer or
> were withdrawn entirely, all for the same reason: they were **client configuration wearing
> framework clothing**. X-1's contrast number is one client's brand colour; S6-2/S6-3 are that
> client's snapshot hardcoding `16px`/`1.6` over the framework's own correct `18px`/`1.7`; and
> S6-1 was simply false — measured on a one-paragraph post, which cannot exhibit
> inter-paragraph spacing. The framework was already right in all three cases. Read the
> individual findings for the detail.

| # | Finding | Surface(s) | Layer | Effort | Impact |
|---|---|---|---|---|---|
| 1 | ~~**X-1** Heading colour~~ **DONE** — headings now default to `text`, not `primary` | **all** | `SETTINGS` | S | Med |
| 2 | ✅ **X-2 DONE** — asset-optimiser gate widened; measured **62–90 KB gz** off per surface, not the ~48 KB predicted | **all non-commerce** | `BLOCK CAPABILITY` | S–M | High |
| 3 | **S9-1** Homepage shows a fixture post — Settings → Reading | front-page | `SETTINGS` | S | High |
| — | ~~**S6-1** Article paragraphs have zero spacing~~ **WITHDRAWN — the finding was false** | single | — | — | — |
| 5 | **S2-1** PDP price is the same size as body copy | single-product | `TEMPLATE` | S | High |
| 6 | **S1-2** Shop filters render no selectable options | archive-product | needs root-cause | M | High |
| 7 | **S1-1** Desktop filter rail never applies (flex beats grid) | archive-product | `TEMPLATE` | M | High |
| 8 | **S3-2** Card excerpts unclamped → ragged grid | archive | `TEMPLATE` | S | High |
| 9 | **S3-3** No aspect-ratio box reserved for featured images | archive | `TEMPLATE` | S | High |
| 10 | **S6-2** Article measure is 79ch — the CLIENT snapshot hardcodes 16px over the framework's 18px | single | `SETTINGS` | S | Med |
| 11 | **S3-4** Card titles 20px, hierarchy nearly flat | archive | `TEMPLATE` | S | High |
| 12 | **S4-1** Search empty state offers one route out | search | `TEMPLATE` | S | High |
| 13 | **X-3** Add a `display` type step above `hero` | all | `SETTINGS` | S | Med |
| 14 | **X-4/X-5/S3-1** Dead `.has-shadow-sm`; card = page colour | archive | `TEMPLATE`+`SETTINGS` | S | Med |
| 15 | **S1-3** Shop is 1-up on mobile where the field is 2-up | archive-product | `TEMPLATE` | S | High |
| 16 | **S7-3** 404 has no committed idea (needs #13 first) | 404 | `TEMPLATE` | S–M | High |
| 17 | **S2-2** Buybox 573px vs the field's 385–410px | single-product | `TEMPLATE` | S | Med |
| 18 | **S2-3** No trust copy inside the buybox | single-product | `TEMPLATE` | S | Med |
| 19 | **S1-4** Product cards have no surface; ragged heights | archive-product | `TEMPLATE` | S | Med |
| 20 | **S8-1/S8-2** No hero or page-header pattern to fill `page.html` | page | `PATTERN` | M | High |
| 21 | **S6-5/S6-6** Prev/next show labels not titles; empty next link | single | `TEMPLATE` | S | Med |
| 22 | **S7-2** 404's H1 is "404", H2 is the real page name | 404 | `TEMPLATE` | S | Med |
| 23 | **S3-5/S3-6** Two links per card; 24px targets | archive | `TEMPLATE` | S | Med |
| 24 | **S4-2** No result count on search | search | `TEMPLATE` | S | Med |
| 25 | **S1-7** No rating on product cards (`sgs/star-rating` exists) | archive-product | `BLOCK CAPABILITY` | M | Med |
| 26 | **S5-1** `index.html` is a bare list, not a designed index | index | `TEMPLATE` | S | Med |
| 27 | **S1-6** Grid images load eagerly | archive-product | `TEMPLATE` | S | Med |
| 28 | **S6-3** Line-height 1.60 — same client-snapshot override as S6-2, resolves with it | single | `SETTINGS` | S | Low |
| 29 | **S2-5** No total cost near the CTA (Baymard: 67% fail) | single-product | `BLOCK CAPABILITY` | M | Med |
| 30 | **S4-5** No matched-term highlighting; fixed-length excerpt | search | `BLOCK CAPABILITY` | M | Med |

Everything below rank 30 (S1-5, S1-8, S2-4, S2-6, S3-7, S3-8, S4-3, S4-4, S6-4, S6-7, S6-9,
S7-4) is Low impact or cosmetic and is fully specified in its section above.

## Block candidates raised (no SGS equivalent — never a silent drop)

Per the Rosetta Stone rule, every gap with no SGS equivalent is recorded rather than dropped:

1. **Elevation control on `sgs/container`** — replaces the dead `.has-shadow-sm` class with a
   real inspector control (X-4).
2. **Suggested/popular searches block** — for the search empty state (S4-1).
3. **Rating on `sgs/product-card`** — `sgs/star-rating` exists but is not wired in (S1-7, S2-4).
4. **Total-order-cost display in `sgs/buybox`** (S2-5).
5. **Matched-term highlighting + contextual excerpt** for search results (S4-5).
6. **Reading time in the byline** — `core/post-time-to-read` is unmapped (S6-9).
7. **Result count** — `core/query-total` is unmapped (S4-2, S3-7).
8. **A contrast gate over `theme-snapshot.json`** — tooling, not a block, but the framework
   currently lets a client ship a palette that fails AA with no warning (X-1).

## Deliberately not in scope

- The three known correctness items (`main` missing from the editor tag dropdown, the
  h1→h3 skip on `archive.html:21` / `search.html:16`, the redundant nested `contentWidth` in
  five files) are Wave C's, not this axis's. S6-7 is noted only because it is the same defect
  class on a third surface.
- **S1-2's root cause.** The filters not rendering needs a `/systematic-debugging` pass; this
  register records the four lines of evidence, not a diagnosis.
- **S3-9** is recorded as suspected-unverified with its reproduction step, because the probe
  that would have settled it produced a 0×0 box and proved nothing.

## Content constraints that limited this benchmark — stated, not hidden

- **`index.html` is genuinely unreachable** on the canary and was graded from source only.
- **Zero approved comments**, so `single.html`'s comment thread design is unassessed (S6-8).
- **No post has a featured image**, so the archive card's image treatment is unassessed and
  S3-9 could not be settled.
- **Products are fixtures** ("R4 apply target", "SGS Single-Variant Fixture"), two of five
  with placeholder images. Card *content* quality is not the template's fault and has not
  been graded as such; card *structure* has.

---

# ✅ IMPLEMENTATION + LIVE VERIFICATION (2026-08-23, after the register)

Deployed theme-only from an isolated worktree (so the colour-golden track's
uncommitted plugin files could not ride along) and measured on the live canary.
**Everything below is a measured value, not a claim from a diff.**

## Verified fixed

| Finding | Before | After |
|---|---|---|
| X-1 heading colour | 2.25:1 | **11.86:1**, all headings, every surface |
| X-3 display type | scale stopped at 50px | `display` token, 404 numerals at **120px** |
| X-4 dead `.has-shadow-sm` | 0 CSS rules, never rendered | renders |
| X-5 / S3-1 card surface | card = page colour | card `#FFF9F0` vs page `#FBF3DC` |
| S1-1 shop filter rail | `display:flex`, both children 1247px, stacked | **`display:grid`, `260px 955px`**, rail beside grid |
| S1-3 mobile grid | 1-up, page 3,279px | **intrinsic** — see the correction below |
| S1-4 card heights | 68px spread | **0px spread within every row** |
| S1-5 gutters | 20/20 equal | **24 column / 40 row** |
| S3-2 excerpt | unclamped, 99px height spread | clamped to 3 lines |
| S3-4 card title | 20px | 24px (`x-large`) |
| S3-5 duplicate link | 2 links per card | 1 |
| S3-6 tap target | 24px | **49px** |
| S3-7 / S4-2 result count | absent | "9 results" / "4 results" |
| S3-8 date | sentence case | uppercase tracked label |
| S6-5 prev/next | "←Previous Post" | "←Motion Fixture Post 7" |
| S6-9 reading time | absent | "1–2 minutes" |
| S7-2 404 semantics | h1 = "404" | h1 = "Page not found" |
| S7-3 404 presence | 494px in 852px viewport, 1 SVG | **672px, numerals as artwork** |
| S7-4 status code | absent | "Status code: 404" |

## Three fixes were INERT — the markup was right and the page did not change

Only measuring found these. Each had shipped looking correct.

1. **S6-6** — setting `showTitle` was assumed to suppress an absent next-post
   link. Measured: the element is genuinely `:empty` and **still occupied 26px**.
   Fixed with `:empty` (exact; no `:has()`, so safe on the Safari 15 floor).
2. **S6-7** — `comments-title` was set to level 2 to close the h1→h3 skip.
   Measured: WordPress **omits that block entirely** with zero approved comments,
   and "Leave a Reply" is a hardcoded `h3` in core's `comment_form()`. The fix
   could never have worked here. Replaced with a heading that always renders.
   Outline is now **H1 → H2 → H3**.
3. **Byline separators** — three literal `·` blocks. `core/post-author` renders
   **no element at all** on these posts, so two separators became adjacent:
   "July 31, 2026 · · Uncategorized". Moved onto the following sibling via
   `::before`, so a field that renders nothing takes its separator with it.

## One regression I introduced, caught by verifying

**Widening the shop gutter silently cost the grid a column.** Setting
`column-gap: 24px` without re-deriving the card width left the cards at the
width WooCommerce had computed from *its own* narrower gap. Measured:
`3 × 305 + 2 × 24 = 963px` in a 955px row — over by 8px, so the third card
wrapped. A `columns-3` grid rendered **2-up with ~320px of dead space**, and
nothing errored. Now both read one custom property (`--sgs-shop-col-gap`) so
they cannot drift: measured after, `302.5 × 3 + 24 × 2 = 955.5` in a 955.5px
row, **zero dead space**.

**The gutter and the card width are one decision.** Never change one alone.

## Still open, and why

- **Block-capability gaps** (need plugin work, refused rather than faked):
  buybox price typography (hardcoded in its `style.css`, no attribute) — the
  PDP title:price ratio improved 3.13 → **2.25** by lowering the title, but the
  price is still 16px body-size; buybox column ratio (**558px**, vs the
  reference field's uniform 385–410px); `sgs/star-rating` has no live-data
  binding; product-card image `loading="eager"` hardcoded at `render.php:1018`.
- **S1-2 shop filters render no options** — untouched, still needs its own
  root-cause pass.
- **Search empty state has 1 recovery route**, not the benchmark's 3–5. `/blog/`
  and `/shop/` were removed because the first **returned HTTP 404** and the
  second does not exist on a client without WooCommerce. Closing this properly
  needs the suggested-searches block candidate.
- ~~X-2 jQuery gate is committed but NOT deployed~~ **✅ SHIPPED AND MEASURED
  2026-08-23.** Gzipped JS per surface, before → after: **404 89.7 → 27.3 KB**, front
  89.7 → 27.3, single post 91.1 → 28.7, page 135.2 → 45.4, archive 89.7 → 27.3, search
  89.7 → 27.3. Six of eight surfaces now inside the 50 KB budget; all eight were over it.
  Shop and product correctly keep the stack and still dropped ~42 KB each.
  **Actual saving 62–90 KB, against a predicted ~48 KB.**
  ⚠ It shipped BROKEN first and the failure is worth keeping: an over-broad `! $post`
  early return meant the gate only fired on singular views, so the **404 — the page this
  register used as its headline example — was excluded by my own fail-safe**, whose
  comment literally named "404s with no object" as a keep-case. Caught only by measuring
  the live pages; I had verified the code was deployed, not that the scripts were gone.
  Fixed at `c0b73a7d`.
- ~~Mobile product cards are 138px wide~~ — **corrected, see below.**
- **The PDP trust copy renders its operator placeholders literally** on the live
  canary ("Delivery: replace with this client's delivery terms"). Deliberate —
  the alternative was shipping "Free delivery" as a framework default, which is
  a commercial claim that would be false for most clients.

## ⚠ SECOND correction, same class as X-1: I matched an observation, not the rule

Bean: *"On mobile stacking should be automatic. Why are the product cards squashed
to 2 on one row?"*

I had forced 2-up below 768px because **7 of 8 benchmarked reference archives are
2-up on mobile**. That is the observation. **The rule is that those references land
their cards at 167–195px wide** — 2-up is merely what that width produces on their
layouts. Ours has a narrower content band and a card carrying image + title +
description + price ladder + CTA, so forcing 2-up produced:

| Measured at 390px, forced 2-up | |
|---|---|
| Card width | **138px** (band is 167–195px) |
| Text column | **65px** |
| Product title | **6 lines** |
| Description | **9 lines** |
| Card height | **792px** in an 844px viewport |

**My own verification passed this.** I measured the FIT — 2-up achieved, exact fit,
zero dead space, 254px less scroll — and never measured whether the card was
legible. An incomplete measurement set reported success on a layout Bean could see
was broken at a glance. The scroll saving was also marginal, bought at the cost of a
six-line product title.

**Fix: no column count anywhere.** Cards declare a minimum readable width
(`flex: 1 1 var(--sgs-shop-card-min)`, 240px) and the row fits as many as it can.
Stacking is automatic and driven by the CONTAINER, not a viewport breakpoint or
WooCommerce's `columns-N` class.

Verified live at three widths:

| Viewport | Per row | Card | Text column | Title lines |
|---|---|---|---|---|
| 390 | **1** | 293px | 219px | 2 |
| 768 | **2** | 310px | 236px | 2 |
| 1440 | **3** | 302px | 229px | 2 |

Card width holds a 293–310px band across every viewport with zero dead space at
desktop and no horizontal overflow anywhere. Only the gutter sits in a media query.

**Two lessons, both already proven twice in this session:**
1. **A benchmark figure is a consequence, not a rule.** Find the constraint that
   produced it (readable card width) before copying the number (2-up).
2. **Measuring fit is not measuring design.** "Exact fit, zero dead space" was true
   and irrelevant. When a layout figure looks good, measure what the content inside
   it is doing.

## ⚠ THIRD correction: "give the card a surface" quietly killed the full-bleed image

Bean, by eye: *"Why do the product cards not have the image fill the top? it's
supposed to be full bleed."*

The S1-4 card-surface rule set background + radius + **`padding: 1rem`** on
`.product-card`. Measured: the image sat inset **16.9px on every side** — a framed
thumbnail, not a bleed. Full bleed is what every benchmarked reference uses (END.,
Gymshark, Uniqlo, IKEA, Rapha) and what `sgs/product-card` is built for.

The padding was **also pure duplication**: measuring the card's real children showed
`.product-card-body` already carries its own 20px, which is the correct place for it
— the text needs the inset, the image does not. So the fix was to REMOVE, not add:
card padding to 0 (image bleeds), body keeps its 20px, plus `overflow: hidden` so the
card's 8px radius clips the now-bleeding image.

Verified: card padding `0px`, image spans the full card width, body still inset 20px.
The residual 0.9px is the card's own hairline border, outside the padding box.

**The trap, worth stating plainly:** "give an element a surface" reads as *background
+ radius + padding*, and the padding is the one that silently changes an image
treatment. Before adding padding to a card, check whether an inner body already
carries it — and whether anything in the card is meant to bleed.

---

# Pattern across all three corrections in this session

Bean caught every one by eye; none was caught by a gate or by my own measurements.

| # | What I did | The actual rule |
|---|---|---|
| X-1 | Graded the framework down for one client's brand colour | The value is per-client; the framework fault was binding headings to `primary` |
| S1-3 | Copied "2-up on mobile" from the references | The rule was a 167–195px card; 2-up was its consequence |
| S1-4 | Added padding as part of "a card surface" | The body already padded itself; the card must not, or the image stops bleeding |

**The common shape: I implemented the SURFACE FORM of a benchmark rather than the
constraint that produced it.** Each was measurable and each of my verification passes
reported success, because I measured the thing I had changed rather than the thing
the change was supposed to achieve. A fit measurement is not a legibility measurement;
a "card has a surface" check is not an "image still bleeds" check.
