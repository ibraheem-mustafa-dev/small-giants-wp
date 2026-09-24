# Design note: client-chosen PDP tabs

**Date:** 2026-09-24
**Problem:** `theme/sgs-theme/parts/sgs-pdp-content.html` hardcodes four food-business tabs
(Description / Ingredients / Nutritional information / Allergens) inside one `sgs/tabs` +
`sgs/tab` block markup. Eye Care Birmingham needs Description, Details, Sizing instead — and
the next client will need something else again. Editing the shared theme file per client
breaks the "one framework, no carve-outs" rule (root `CLAUDE.md` "SGS is a standalone
framework").

## 1. What exists today

`theme/sgs-theme/parts/sgs-pdp-content.html` is a template part included by
`theme/sgs-theme/templates/single-product.html::wp:template-part{"slug":"sgs-pdp-content"}`.
Its markup is fixed WordPress block comments (not PHP), so every product on every client site
that uses this theme gets the same four tabs:

- **Description** — `wp:post-content` (pulls the live WooCommerce product's own description
  field — the only tab with real per-product data today).
- **Ingredients** — `wp:sgs/text` with hardcoded placeholder copy ("Update this tab with the
  full ingredient list for this product").
- **Nutritional information** — `wp:sgs/text` placeholder, same pattern.
- **Allergens** — `wp:sgs/text` placeholder listing wheat/nuts/milk/eggs/soya, flagged in the
  file's own comment as a statutory slot the operator must edit per product.

So three of the four tabs are static text with no data source at all — an operator has to
open the Site Editor and hand-edit the template part's content per product, which doesn't
even work for multiple products (the template part is shared across every PDP).

The tabs run through `sgs/tabs` (`plugins/sgs-blocks/src/blocks/tabs/block.json`) and
`sgs/tab` (`plugins/sgs-blocks/src/blocks/tab/block.json`) — generic, industry-neutral
container/panel blocks with full colour/style controls and `label` as the only per-tab
content attribute. Each `sgs/tab` takes arbitrary InnerBlocks, so the blocks themselves
already support "any client, any tab content" — the industry-specific part is only the
sgs-pdp-content.html markup, not the tab machinery.

Precedent for per-client template-part swapping already exists:
`plugins/sgs-blocks/includes/class-sgs-template-part-seeder.php` seeds the **header** and
**footer** `wp_template_part` posts from a pattern slug named in the active style variation
(`Sgs_Template_Part_Seeder::maybe_seed()`), and after seeding an operator edits the result
freely in the Site Editor — WordPress never re-touches it. No such seeding exists yet for
`sgs-pdp-content`.

## 2. Options

**A. Ship `sgs-pdp-content` as a starting pattern, not a locked template part.**
Convert the hardcoded tabs into a registered block pattern (`theme/sgs-theme/patterns/`, one
PHP file, e.g. `pdp-tabs-default.php`) inserted into the template part once on first use
(mirroring the header/footer seeder). After that the client edits it like any other page
content in the Site Editor: adds/removes/relabels `sgs/tab` blocks, types or pastes content
into each panel. Existing clients (Mama's Munches) keep their current tabs untouched because
seeding never re-fires once content exists (same idempotency guard as the header/footer
seeder). *Client experience:* open the product page in the editor, click a tab's text and
type — same skill already required for every other block on the page, no new UI to learn.

**B. One pattern per industry, client picks at onboarding.**
Build a small library of PDP-tab patterns (food, eyewear/retail, services) and let the
operator insert the matching one via the pattern inserter, same mechanism as header/footer
pattern choice today. *Client experience:* same as A once a pattern is placed, but requires
someone (Bean, at onboarding) to pick the right starting pattern — more setup work, and the
library needs a new entry for every new industry shape rather than working out of the box.

**C. Data-driven tabs from product attributes/meta, with empty tabs auto-hidden.**
Give `sgs/tabs`/`sgs/tab` (or a new lightweight wrapper) a "source" attribute per tab that
pulls from a WooCommerce product attribute or a registered custom field, and hide any tab
whose source has no value for that product. *Client experience:* set up attributes once
(e.g. "Sizing" attribute per product) and every product's tab fills in automatically with no
per-product editing — the strongest fit for genuinely per-product data like Eye Care's
lens-width/bridge/temple specs table. But it needs new plumbing (attribute-to-tab mapping UI,
empty-state hiding logic) that doesn't exist on any SGS block today, is a bigger build, and
still needs a content editor for prose tabs like Description that aren't a clean key/value
attribute set.

## 3. Recommendation

**Option A now, with a path to C for the Details-style spec tables later.** A is the smallest
change that fully removes the food-business hardcoding: it reuses the exact mechanism already
proven for header/footer (pattern + one-time seed + free editing after), touches no shared
block code, and a tech-illiterate client edits it exactly the way they already edit every
other pattern-based part of the site. Ship the Eye Care tabs (below) as the new default
pattern's starting content — neutral in code (generic labels, no Eye Care wording baked into
PHP), but the pattern file itself can carry Eye Care's Description/Details/Sizing as its
example content since patterns are per-client choices, not framework defaults. C is worth
scoping separately once a second client needs structured per-product spec tables — it's a
genuine improvement for that shape but too much new machinery to gate this fix on.

## 4. The Eye Care tabs (from the draft)

Source: `sites/eye-care-ward-end/Ward End Eye Care - SGS Gap Handoff/Eye Care Birmingham.dc.html`,
`tabDefs` array (`[['desc','Description'],['details','Details'],['sizing','Sizing']]`) and the
three `sc-if` blocks that follow the `role="tablist"` markup.

- **Description** (`tabDesc`, default open) — a blurb paragraph (`cur.blurb`, per-product free
  text) plus a bullet list built from per-product fields: shape + material + colour name
  (`cur.shape`, `cur.mat`, `cur.colourName`), lens line + "100% UV400" (`cur.lensLine`), a
  fixed warranty/case sentence (static copy, not per-product), and a fixed prescription-lenses
  sentence (static copy). Data source: per-product fields on the PRODUCTS array + two lines of
  static marketing copy.
- **Details** (`tabDetails`) — a key/value grid built from the `specs` array (line 2410):
  Lens width (`curDims.eye` + "mm"), Bridge (`curDims.bridge` + "mm"), Temple length
  (`curDims.temple` + "mm"), Style (`cur.shape`), Frame type (`cur.ftype`), Material
  (`cur.mat`), Hinge (`cur.hinge`), Nose pads (`cur.nose`). Data source: entirely per-product
  numeric/text fields — this is the cleanest attribute-table candidate for Option C.
  Content is a repeatable label/value pair, not typed prose.
- **Sizing** (`tabSizing`) — "This pair, measured" heading plus a "Which size am I?" link that
  opens a separate size-guide flow, then an SVG diagram of the frame front with the same
  bridge/temple measurements annotated and explained (data source: `curDims.bridge`,
  `curDims.temple`, same per-product fields as Details, presented as an annotated diagram
  rather than a table). This tab is the most bespoke of the three — it is not just data, it
  pairs the data with an SVG illustration and an explanatory sentence per measurement, which
  no existing SGS block renders. Building it faithfully is separate scope from the tab-choice
  mechanism this note covers.
