# Cloning recognition: a universal catalogue of what the framework offers, and the open register parts

**Why (Bean, 2026-10-29):** the cloning route recognises draft parts through three generic sources (the framework DB's tag map, `block_capabilities` word lists, display types) plus 65 hand-written rules in `scripts/computed-route/data/skeleton-decisions.json`, one per pattern someone met before. A block no rule names is invisible to it. Proven cases: Indus's floating WhatsApp button (`position: fixed`, `href="https://wa.me/…"`, bottom-right) is read as a strip beside the footer (`rules.footerSlots`, "a floating sibling goes in the bottom row") and becomes a plain `sgs/button` (`rules.pillButton`), although `sgs/whatsapp-cta` exists and its default variant is `floating`; Eye Care's shop filter drawer is not matched although WooCommerce's product filters (already placed for the desktop rail) draw their own narrow-width overlay. Bean: the tooling must know the full range of the framework and match every draft part to its equivalent in a uniform, universal way, fed from one place. Fix every known issue before the next re-clone; confirm a fix by the result matching its goal, never by before/after comparisons.

## Research (gold standard)

- Figma Code Connect: each code component has one declarative mapping; every variant value must be mapped (an unmapped value produces broken output); a design property with no code equivalent is omitted, never invented.
- Builder.io moved from hand-written mapper files to automatic indexing of the component library from the repository (one command, no maintained mapping files).

SGS takes both: each block declares its recognition signature in its own `block.json` (the single source, like Code Connect), and the seeder indexes every block, variant and fx effect into the framework DB automatically (like Builder's indexing), with a coverage gate that refuses a block or variant without a signature (Code Connect's exhaustive variant rule).

## Design: recognition signatures

1. **A closed feature vocabulary** (`scripts/computed-route/data/recognition-features.json`, schema-validated): the differentiating features a draft element can show, each computed the same way for every element from the inventory and the fact record:
   - placement: `position` (static, sticky, fixed, absolute), `viewportEdge` (top, bottom, left, right, corner), `inFlow`, `overlay` (covers the page with a backdrop), `shownWhen` (always, a state, a width range);
   - interaction: `linkKind` (whatsapp, tel, mailto, map, social, product, page, anchor, external), `opens` (modal, drawer, flow, menu, panel), `closes`, `toggles`, `scrollsTo`, `submits`;
   - content shape: `loopOf` (products, brands, reviews, posts, steps, slides, plain), `itemShows` (price, rating, quote, author, image, link), `formControls` (kind and count), `media` (one picture, picture set, video, map, svg), `textRole` (heading level, label, body, caption);
   - semantics: ARIA `role`, landmark (`nav`, `aside`, `header`, `footer`, `dialog`), `ariaLabelKind`;
   - motion: `loop` (marquee, float, pulse), `entrance`, `scrollLinked`, `slider` (autoplay, drag, arrows, dots).
2. **A signature per block and per variant**, declared in `block.json` as `supports.sgs.recognise`: the features that identify the block (required, preferred, excluded), per variant where the block has variants, and per part for composites (which draft parts become which parts). Example: `sgs/whatsapp-cta` variant `floating` requires `linkKind: whatsapp` and `position: fixed`; variant `inline` requires `linkKind: whatsapp` and `inFlow`. WooCommerce and core blocks the route places get their signatures in a data file (they have no SGS `block.json`).
3. **Indexing:** the seeder (`sgs-update-v2.py`, the only DB writer) reads every signature into a `block_signatures` table; fx effects (`fx_effects`) and theme features carry theirs the same way.
4. **One matcher:** the classifier (`lib/skeleton-classify.mjs`) scores every element against every signature in the table as one evidence source beside the tag map and capabilities, with the matched features as the evidence text; the surface-kind step (header, footer, drawer, modal, floating UI) uses the same features, so a fixed element at a viewport edge is a floating surface of its own, never a strip of the footer.
5. **Rules shrink to structure:** the hand rules that only identify a block (pillButton, solitaryIcon, backToTop, mapEmbed, openStatus, trustBar, marquee and the like) move into signatures; rules that decide structure (header and footer rows, wrappers, commerce regions) stay, each reading the same features.
6. **Gates:** a coverage gate (beside `capabilities.mjs --gate`) refuses a block, variant or fx effect without a signature and a signature naming a feature outside the vocabulary; a planted-draft test per signature proves an element with those features becomes that block and variant, with a negative control.

Built in at least three commits (FP-5): vocabulary and extractor; signatures and indexing with the gate; the matcher and the rule migration. An adversarial council reviews the design before the build (a new shared mechanism).

## The unread surfaces (root causes, 2026-10-29 intakes)

| Surface | What failed | Class |
|---|---|---|
| Mama's checkout `<header>` | the census holds a header in Checkout with no surfaces.json record | a page-local header the surface kinds do not recognise |
| Mama's basket-gift-note-upsell | the `sc-if` stays closed after `showUpsell: true` | opener: a state needing a precondition (basket contents) |
| Mama's cancel-subscription-confirm, address-form-add-edit | no opener (no settable state key, no named handler) | opener discovery |
| Mama's account-details-change-password; Eye Care addresses, account-details | still closed after the tab state is set | opener: nested state (a second key under the tab) |
| Eye Care storefront-shell | an `sc-helmet` (document head) listed as a surface | not a visual surface: document plumbing |
| Eye Care S-38 "WP Build Gap Map (report)" | a report page in the draft, no component | not a site surface: a draft report |
| Eye Care shop-filter-rail-drawer | no element carries the root marker at 375 | the narrow-width open state of the filter rail (WooCommerce's product filters overlay), not matched to it |

Fix by class: openers read preconditions and nested state keys from the logic (the state the handler reads before it renders the branch); surface kinds include page-local headers and floating UI; document plumbing and report pages are excluded by the handoff contract's surface kinds; a surface that is another surface's narrow-width open state is matched to that block's own overlay. Account sub-panels sit inside WooCommerce's account block: each is matched to that block's view, never left unread.

## Open register parts, built before the re-clone

From the register's "Fix pass status" table: the modal frame look (S8), the mega panel's columns as `mega-group`/`mega-aside`, Mama's hidden cookie-count and date fields, the `toForm` form-target opener, the brand logo pictures (the gallery's `mediaItems` gains `url`, `id`, `alt`, a plugin change and a reseed), PI-17 (static presence rows WooCommerce blocks replaced, held), the slider's testimonials filled from the absorbed cards, `textIndent` and `gridItem*` through the ancestor-hop route, a blur that differs by width. Each is confirmed by its result matching the goal on the real artefact.

## Order

1. Bean approves the recognition design (or changes it); the council reviews it.
2. Build in parallel tracks: recognition (the three commits), unread surfaces and openers, open register parts; the gift-card live test runs alongside (delegated 2026-10-29).
3. The full council over the whole fix pass.
4. Reseed, mirror clean-up (Eye Care template 178, Mama's post 159), fresh intakes, finaliser, Bean's review, then the third re-clone and its audits.

## Status (2026-10-29)

Bean's rulings replace the design above: recognition reads the block names and block attributes the framework DB already holds (no per-block signature data); the gaps were mapped first against Spec 48, 48A, the tooling and the DB (`.claude/reports/2026-10-29-recognition-gaps.md`); floating UI splits by mechanism (self-floating blocks in the footer post as on eye-care-test, Spec 18 Customiser options, missing-features rows); a sticky notice bar goes to the header's top row; store calls named in `how_to_reach` open surfaces. The unread surfaces' faults are fixed (`31c8f7d7e`) except Mama's store-driven four, which the recognition track builds. The gift-card test passed (`plans/2026-10-28-gift-cards.md`).
