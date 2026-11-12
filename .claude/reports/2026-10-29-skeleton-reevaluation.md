# Skeleton stage re-evaluation: what the draft declares, what the DB maps, what the route reads (2026-10-29)

Read-only evaluation. Repo `C:/Users/Bean/Projects/small-giants-wp` at `beb363b5d`. Framework DB `~/.claude/skills/sgs-wp-engine/sgs-framework.db`, opened `file:...?mode=ro`. Proposal data: `sites/<client>/build/intake/intake.json` `skeletons` (Eye Care inventories generated 2026-10-29T07:47Z). Raw per-record listing of section 6: `C:/Users/Bean/AppData/Local/Temp/claude/c--Users-Bean-Projects-small-giants-wp/5556aa5e-86e4-4189-943e-2ff1a0c7a6b5/scratchpad/surface-fate.txt`.

## 0. Headline facts (read these first)

1. **No current handoff instruction tells Claude Design to write SGS names.** `.claude/claude-design-handoff/PROMPT.txt` step 3 and `handoff-schema/README.template.md` say the opposite: "Don't map the design to WordPress or SGS blocks" / "the builders choose blocks from the code". The Claude Design `CLAUDE.md` has no naming rule. The SGS-BEM draft contract (`~/.agents/skills/ui-ux-pro-max/references/sgs-draft-authoring.md` §1–§3, `sgs-draft-vocabulary.md`, Spec 00 §3/§3.1) exists but is for Bean-authored HTML drafts through `/ui-ux-pro-max`; it is not in the handoff file map (`CLAUDE.md` "The finished handoff folder") and not uploaded with the handoff.
2. **Only Eye Care's draft carries SGS names, and only section roots.** Draft class attributes: Indus 0 (3 `.dc.html` files), Mama's 0 (14 files), Eye Care 43, of which 42 are `sgs-*` (command: `grep -o 'class="' <draft> | wc -l`). Zero BEM elements (`__`) and zero modifiers (`--`) in any draft. Eye Care's names plus its embedded `data-sgs-manifest` predate the handoff contract (Spec 48A §3 row "embedded data-sgs-manifest"; register `.claude/plans/2026-10-28-clone-spec-audit-register.md` S5: "present only in Eye Care's pre-contract draft").
3. **The skeleton stage reads no class name for block choice.** The only class reads in the skeleton libs are a logo-image text match (`lib/skeleton-classify.mjs::makeClassifier` `img` branch: `srcBasename + alt + class` against `decisions.logoImage`), an unused `match.classPattern` hook in `overrideFor` (0 of 1 `elements` decisions use it), and the identity fingerprint (`lib/identity.mjs::fingerprintOf`, `cls`). Two rules explicitly forbid names: Spec 48 FR-48-6 rule 1 marquee ("read from the motion inventory's loop record, never a name") and `lib/skeleton-footer-slots.mjs` header ("Never a surface name, a class, a client name or a pixel value").
4. **The DB's "naming" columns are synthesised, not observed.** `block_attributes.derived_selector` is `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py::derive_selector` = `.sgs-<slug>__<canonical_slot>`; `equivalent_implementations` is `plugins/sgs-blocks/scripts/uimax-tools/enrich-db.py` building `sgs-<block>__<kebab(attr)>` strings from the attribute name and type (506 of its 1,758 rows are `core/*` blocks yielding invalid classes such as `sgs-core/accordion__icon-position`). Only **1,027 of 2,670** `.sgs-*` derived selectors on `sgs/*` rows occur literally in that block's own source (`plugins/sgs-blocks/src/blocks/<slug>/**`). Neither column is referenced anywhere under `scripts/computed-route/` or `scripts/parity/` (`git grep -c "derived_selector\|equivalent_implementations\|block_selectors\|FROM slots\|markup_examples" -- scripts/computed-route scripts/parity` → no hits, rc 1).
5. **Eye Care measurement: 40 proposal rows carry a declared `sgs-*` root; 7 agree with what the name declares, 8 contradict a name that points at an existing SGS block, 9 name a live-data section the DB has no block name for (3 of them got a product collection inside), 16 are plain/page names where `sgs/container` is the documented outcome. None of the 7 agreements came from the name.**
6. **Declared surfaces are overridden by rules.** Of 171 `surfaces.json` records across the three clients, the declared floating WhatsApp button (Indus S-15, Eye Care S-07, kind `global`) is absorbed into the footer's bottom row as `sgs/button` in both clients that have one, although `sgs/whatsapp-cta` exists with default `variant` `"floating"`.

## 1. Data source inventory

| Source | What it declares | Designed for (cite) | Read by the skeleton stage |
|---|---|---|---|
| Draft `class` on section roots (Eye Care only: 42 `sgs-*` roots) | what each section is (`sgs-hero`, `sgs-brand-marquee`, `sgs-google-reviews`…) | SGS-BEM contract `sgs-draft-authoring.md` §2 ("Use a real block slug … when the section IS that block"); Spec 00 §3.1 "BEM element → block recognition (canonical signal)"; Bean ruling 2026-10-29 (register row "Bean rulings 2026-10-29": draft SGS class names "are first-class recognition evidence") | **no** for block choice; only `skeleton-classify.mjs::makeClassifier` logo-image text test and `identity.mjs::fingerprintOf` |
| Draft BEM elements / modifiers (`__x`, `--y`) | role of each element, variant | `sgs-draft-authoring.md` §3, §5; Spec 00 §3.1, §3.4 | **no** (none exist in any of the three drafts) |
| Embedded `data-sgs-manifest` (Eye Care only): `pages` 11, `overlays` 6 (each with `class` and `kind`), `sectionsInPageOrder` (12 page keys listing every section class), `repeatedGroups` 19 (section class, source, count, `data`: "live product query", "live query: Brand taxonomy terms"…), `behaviouralRules` 18, `breakpoints`, `assets`, `openItems` 3 | page list, overlay kinds, section order per page, each section's data source | Spec 48 FR-48-30 / 48A FR-48A-9 (page map proposal) | **no**. Pages only via `lib/intake-routing.mjs::embeddedManifest` → `lib/intake-pagemap.mjs` (page map, not skeleton); rest is "review evidence" (Spec 48A §3 table; register S5 "the manifest stays review evidence") |
| `surfaces.json` `kind` | page, header, footer, menu, drawer, modal, form, form-step, accordion, panel, result, backdrop, global | `surfaces.schema.json` `$defs.surface.kind` | **yes**: `lib/intake-skeletons.mjs::surfaceRoots` (only `SURFACE_KINDS` = header, footer, drawer, menu, form, modal, global, page get a skeleton entry); `skeleton-rules.mjs` `surfaceRoot` (menu → `sgs/mega-panel`, drawer → `sgs/nav-drawer`, `namePattern: "."` so the name is ignored), modal/drawer opener rules via `lib/skeleton-record.mjs::recordView` `surfaces` |
| `surfaces.json` `name`, `notes`, `source` | what the surface is in words; the getter/ref that drives it | schema descriptions (`source`: "Function, getter or ref that drives the surface") | `name` passed as `surface.name` but every `surfaceRoot` entry matches `"."`; `notes`/`source`: **no** |
| `surfaces.json` `states`, `opened_by`, `closed_by`, `parent`, `template_tpl_id` | how to reach each state, what opens it, where it sits | METHOD.md §7 | **yes**: roots and ancestors (`surfaceRoots`), openers (`skeleton-record.mjs` "the opened_by words … by surface id"), state reach for inventories (`skeleton-context.mjs::statesOfRecord`), handler-opens rules (`skeleton-handler-opens.mjs`) |
| `surfaces.json` `blocks` (page block lists), `breakpoints`, `time_dependent` | page content blocks, breakpoints | schema | reach the fact record (`lib/read-surfaces.mjs`); Spec 48 FR-48-21 status: "no stage reads them yet" |
| `animations.json` | every animation (loops, transitions) | METHOD.md §4–§6 | cross-check only for the marquee loop (FR-48-6 rule 1: "Claude Design's `animations.json` loop record is a cross-check"); `lib/read-animations.mjs` joins it as `effects` and "no stage takes a … decision from `effects` yet" |
| `README.md` sections (Global layout, Pages, Overlays, Mama's "Block mapping (SGS)", Eye Care "Building it in SGS") | each global element and page section with its role in words, sometimes the intended block | `README.template.md`; FR-48A-8 | **no**. `lib/read-readme.mjs` builds `sections`, `blockHints` "kept as evidence only"; FR-48A-8: "Its sections are not enforced (cloning reads the code, Bean's decision of 2026-10-11). It never maps the design to SGS blocks; block choice is ours." Spec 48A §3: "no stage reads the record's `readme` yet" |
| `MANIFEST.json` | files, hashes, `entry_drafts` | manifest.schema.json | intake check and manifest build only; not the skeleton |
| Draft code: tags, layout, `sc-for` loops, logic statics, handlers, ARIA | structure and behaviour | FR-48A-8 "cloning reads the code" | **yes**: all of `skeleton-rules.mjs`, `skeleton-record.mjs`, `skeleton-loop-blocks.mjs`, `skeleton-commerce-region.mjs` |
| DB `html_tag_to_core_block` (18) | tag → block | atomic walker fallback | **yes** `skeleton-facts.mjs::loadFacts` `tagMap` |
| DB `block_composition` (219) | role, wraps, accepts, container_kind | D108 | **yes** `loadFacts` `composition` |
| DB `block_capabilities` (567) | tags/features a block lists | — | **yes** `capsOf`, `blocksWithCap` |
| DB `block_attributes` (attr_name, attr_type, default_value, enum_values, role, css_property; css_element for `modalFrame`) | enums, roles | — | **yes** `attr`, `attrsByRole`, `enumOf`, `blocksWithDisplayType`; `decisionsProblems` (css_element) |
| DB `blocks.slug`, `blocks.replaces` | ban-core rewrite | — | **yes** `replacedBy`, `decisionsProblems` |
| DB `array_item_schema` | item fields | — | yes (one query in the skeleton libs) |
| DB `blocks.tier`, `blocks.title`, `blocks.description`, `blocks.variant_attr` | section-root flag, human name | Spec 00 §3.1–3.2 | **no** |
| DB `slots` (106; aliases; 42 with `standalone_block`) | BEM element vocabulary → block | Spec 00 §3.1 "The element segment should use a canonical slot alias" | **no** |
| DB `block_selectors` (59 rows, 46 blocks; 45 `root`) | root class per block | — | **no** |
| DB `block_attributes.derived_selector` / `canonical_slot` / `equivalent_implementations` / `output_signature` / `canonical_slot_aliases` | per-setting BEM selector, slot, synthetic markup | `assign-canonical.py`, `enrich-db.py` | **no** (`canonical_slot` read by Fill: `lib/resolve.mjs`, `lib/fill-band.mjs`, `lib/fill-state-parts.mjs`; never by the skeleton) |
| DB `markup_examples` (411, 201 blocks) | block comment markup | — | **no**; 0 rows contain `sgs-` class markup |
| DB `variant_slots` (79), `motion_targets` (472), `patterns` (57), `theme_parts` (28), `components` (803), `modifier_suffixes` (19) | variant elements, part selectors, patterns | calibration, motion | **no** (variant_slots read by calibration `lib/db.mjs`) |

## 2. Decision mechanics as they are

1. **Surface entries.** `lib/intake-skeletons.mjs::surfaceRoots` turns each `surfaces.json` record of a `SURFACE_KINDS` kind into a skeleton entry rooted at its `template_tpl_id` (page roots move to `<main>`, FR-48-6 first paragraph). accordion, form-step, panel, result and backdrop records get no entry ("states or parts of a parent", file header).
2. **Inventory.** `lib/skeleton-inventory.mjs` renders each surface and records per element `key`, `tag`, `attrs` (`href, aria-label, alt, role, type, title, target, aria-hidden, viewBox, class, style`), words, boxes; `lib/skeleton-record.mjs::recordView` joins the fact record (real tags, ARIA, loops, openers, surfaces).
3. **Facts.** `lib/skeleton-facts.mjs::loadFacts` loads `data/skeleton-decisions.json` (68 `rules` keys including `doc`/`decided`; 1 `elements` decision), the brand registry, the client placeholder map and the DB tables listed as "yes" above.
4. **Classify each element** (`lib/skeleton-classify.mjs::makeClassifier::classify`), in this precedence: (a) a client decision for the key; (b) a standing rule verdict `skeleton-rules.mjs::ruleFor` (hero, marquee, pillButton, footerSlots, headerSlots, surfaceRoot, commerceRegion, loopBlocks, choiceFlow, blockOwnedPart, …), which returns a block, `absorb`, `remove` or `unwrap` at confidence 1; (c) finaliser pick or standing element decision (`overrideFor`); (d) brief-only lines; (e) DB scoring with weights `W = { tag 0.5, composition 0.35, capability 0.25, structure 0.4, siteInfo 0.3, pattern 0.5, decision 1, logo 0.5, rule 1 }`: a depth-0 root scores section-root blocks whose capabilities list its tag; a child of a section root scores content blocks; an `img` scores logo blocks vs `sgs/media`; an element with block children scores row blocks (all children propose the same block) and wrapper shells (`sgs/container`); an icon link scores icon blocks; a text element scores Site Info kinds then `html_tag_to_core_block`. Confidence = `min(1, top) * top / (top + second)` (`finish`).
5. **SGS-only.** `sgsOnly` rewrites every `core/*` candidate through `blocks.replaces`.
6. **Shape and write.** `lib/skeleton-propose.mjs::proposeSkeleton` builds rows (block, rule, action, candidates, fingerprint), draws children for blocks that draw them (`drawsChildren`), applies header/footer slot plans (`skeleton-header-slots.mjs`, `skeleton-footer-slots.mjs::footerPlan`), then `skeleton-write-content.mjs` / `skeleton-write-slots.mjs` / `skeleton-write-units.mjs` write content and settings.

Worked trace, Eye Care `<section class="sgs-google-reviews">` (`page-home`): no client decision; no rule fires; not depth 0; has block children → wrapper-shell scoring → `sgs/container` (candidates `['sgs/container']`, score from `block_composition: sgs/container is a wrapper-shell` + structure). The class `sgs-google-reviews`, which is exactly the slug of the existing block `sgs/google-reviews`, is in `fingerprint.cls` and never consulted. Children: 9 containers, 5 text, 2 buttons, 2 icons, label, heading, media.

## 3. Measurement: declared name vs chosen block

Method: every row of `intake.json` `skeletons[*].rows` whose `fingerprint.cls` holds an `sgs-*` token, joined with the inventory element (same `key`); "points at a block" judged by slug equality or the block whose slug/title shares the name's words (query: `SELECT slug FROM blocks WHERE slug LIKE 'sgs/%' AND (slug LIKE '%<word>%' OR title LIKE '%<word>%')`).

### Indus and Mama's

| Client | inventory elements | with any `class` | with `sgs-*` | declared roots |
|---|---|---|---|---|
| Indus | 4,224 (all `inventories/*.json`) | 561 (runtime `scp*`, `sc-host` only) | 0 | 0 |
| Mama's | 1,664 | 249 (runtime only) | 0 | 0 |

Nothing to measure: these drafts declare by surfaces.json and README only (section 6).

### Eye Care

Inventory: 2,530 elements, 467 with a class, **46 with an `sgs-*` class, 39 distinct roots, 0 elements, 0 modifiers**. Only 2 roots equal a block slug exactly (`sgs-hero`, `sgs-google-reviews`). 3 draft roots never reach an inventory (`sgs-toast`, `sgs-product-no-reviews`, `sgs-checkout-prescription`: state-hidden). Proposal rows carrying a root: **40**.

| Class | Rows | Declared → chosen |
|---|---|---|
| A. Agree (chosen = the block the name means) | 7 | `sgs-header` → `sgs/site-header` (scoring); `sgs-mega-menu` → `sgs/mega-panel` (rule surfaceRoot); `sgs-mobile-menu` → `sgs/nav-drawer` (surfaceRoot); `sgs-footer` → `sgs/site-footer` (scoring); `sgs-hero` → `sgs/hero` (rule hero); `sgs-bag-drawer` → `sgs/cart` (blockOwnedPart); `sgs-lens-configurator` → `sgs/choice-flow` (choiceFlow) |
| B. Name points at an existing SGS block; route chose another | 8 | `sgs-google-reviews` → `sgs/container` (exact slug `sgs/google-reviews` exists); `sgs-brand-marquee` → `sgs/container` holding one `sgs/brand-strip` (text mode, register S9); `sgs-trust-ticker` → `sgs/site-header-row` (headerSlots; row ruled right by Bean) holding `sgs/brand-strip`, not `sgs/trust-bar`; `sgs-whatsapp-fab` → `sgs/button` (pillButton) in the footer bottom row, `sgs/whatsapp-cta` default `variant` `"floating"`; `sgs-breadcrumb` → `sgs/container` with 3 `sgs/button` (`sgs/breadcrumbs` exists); `sgs-product-tabs` → `sgs/container` (`sgs/tabs` exists); `sgs-size-guide` (manifest overlay `kind: modal`, surfaces S-25 `modal`) → `sgs/container` (`sgs/modal` exists); `sgs-product-main` → `sgs/hero` (rule hero; 42 descendants absorbed by commerceRegion) |
| C. Name has no SGS block; the manifest declares a live data source | 9 | `sgs-best-sellers` ("live product query") → container with label + heading only, no collection row; `sgs-product-reviews` ("live product reviews") → container; `sgs-product-more-from-brand`, `sgs-product-similar`, `sgs-shop-layout` → container with a `woocommerce/product-collection` child (partly right); `sgs-checkout-express/-contact/-delivery/-payment` ("live cart and checkout session") → containers with `sgs/form-field-text` |
| D. Plain section or page wrapper; `sgs/container` is the contract's outcome (`sgs-draft-authoring.md` §2) | 16 | 11 `sgs-page-*` `<main>` roots, `sgs-page-signin` form root → `sgs/form` (formHost), `sgs-why-buy`, `sgs-shape-tiles`, `sgs-about-strip`, `sgs-optician` |
| **Total** | **40** | agreement 7 of 24 rows where the name implies a specific outcome (A+B+C) |

Every agreement came from a rule or DB scoring; no row's evidence cites its class.

## 4. Top cause classes of wrong or missed choices (Eye Care rows, plus surface records)

1. **Wrapper-shell default wins over a declared composite (5 rows):** google-reviews, breadcrumb, product-tabs, size-guide, product-reviews. The element has block children and no rule fires, so `classify` falls to `facts.wrapperShells` → `sgs/container`. The DB has the block (`sgs/google-reviews`, `sgs/breadcrumbs`, `sgs/tabs`, `sgs/modal`).
2. **A content rule overrides the declared section (4 rows):** `pillButton` (whatsapp-fab), `hero` (product-main), `headerSlots` + `marquee` text branch (trust-ticker → row + `sgs/brand-strip`), marquee → container + text-mode brand-strip (brand-marquee). Rules sit above scoring at confidence 1 (`skeleton-rules.mjs` precedence comment), and FR-48-6 rule 1 forbids reading the name.
3. **Live-data sections not recognised (6 rows, 3 partial):** best-sellers, product-reviews, 4 checkout sections. Register B4 owns the loop-based fix; the manifest's `repeatedGroups[].data` names the source for all of them and is ruled review evidence (S5).
4. **Declared surface absorbed (2 records):** WhatsApp button (Indus S-15, Eye Care S-07) → footer bottom row by `rules.footerSlots` ("a floating element … goes in the bottom row … and its surface is absorbed into the footer") then `pillButton` → `sgs/button`.
5. **Declared menu panel root not the menu block (Eye Care S-04 split into 4 inventories):** roots `sgs/mega-panel` (sunglasses), `sgs/card-grid` (brands, help), `woocommerce/product-collection` (lenses); Indus `sectors-mega-menu` root `sgs/container`.
6. **Form steps treated as hero inner (Mama's S-27–S-30):** the four checkout `form-step` records are `unwrap`ped by rule `heroInner` in `page-checkout-dc-html`. Mama's contact form S-34 root is `sgs/heading`.

## 5. Surface records, README items and the section listing (coordinator request)

### surfaces.json records (171 total)

Outcome per record: own skeleton with rows; own skeleton entry with no rows (a gap, or rows held in a shared entry, `rowsIn`); a row inside another surface (kept as a block or absorbed); no proposal row names the record's root element (`draftId` = `<dc>:<last template_tpl_id>`).

| Outcome | Indus (61) | Mama's (58) | Eye Care (52) |
|---|---|---|---|
| Own skeleton, rows | 26 | 25 | 20 |
| Own entry, no rows | 15 (13 pages + Trade menu + catalogue form; pages share rows `rowsIn` other pages) | 5 (sc-if not rendered) | 4 (storefront shell helmet, filter rail drawer, Addresses, Account details) |
| Row in another surface, kept as a block | 1 (S-01 top bar → `sgs/site-header-row`, clientBuiltSurface) | 3 (S-09 → product-collection, S-10 → testimonial-slider, S-21 → container) | 4 (S-02 ticker → header row, S-21 tabs → container, S-35, S-45 → container) |
| Absorbed / unwrapped by a rule | 1 (S-15 WhatsApp → footer, `sgs/button`) | 5 (S-06 card → commerceRegion; S-27–30 form steps unwrapped by heroInner) | 3 (S-07 WhatsApp → footer, `sgs/button`; S-28 lens step → choiceFlow; S-37 Frame Card → loopBlocks) |
| No row for the root | 18 (6 accordion, 5 form-step, 4 result, 2 panel, 1 backdrop) | 20 | 21 (incl. S-38 removed `WP Build Gap Map`) |

The "no row" set is by design for state kinds (`SURFACE_KINDS` excludes them); whether their content reaches the build through the parent's rows was not measured here.

**Rule overrides of a declared surface's kind:** WhatsApp ×2 (global → footer bottom-row button), Mama's checkout form-steps ×4 (form-step → unwrapped as hero inner), Eye Care size guide (modal → container), Eye Care product tabs (panel → container), Eye Care S-04 menu (menu → card-grid ×2, product-collection ×1), Indus sectors menu (menu → container). Absorptions consistent with the declaration: S-06/S-37 product cards (into the collection), S-28 lens step (into choice-flow).

### README layout items

| Client | Items | Kept as declared | Moved by a Bean-ruled rule | Overridden |
|---|---|---|---|---|
| Indus "Global layout" (7) | top bar, progress bar, header, mega menu, drawer, footer (three rows), WhatsApp | 5 (progress bar becomes the Floating UI setting, rule readingProgress) | 1 (top bar → header top row) | 1 (WhatsApp item 7: "fixed bottom-right … Link wa.me, new tab" → footer `sgs/button`) |
| Eye Care "Layout and chrome" (6) + "Overlays" (4) | ticker, header, mega menu, mobile menu, footer, WhatsApp; bag drawer, lens configurator, size guide, toast | 6 (header, mobile menu, footer, bag drawer, lens configurator, mega menu partly: 1 of 4 panel roots) | 1 (ticker → header row, but inner block brand-strip not trust-bar) | 3 (WhatsApp → button; size guide → container; toast → no row) |
| Mama's "Global elements" (header 5 bullets + drawers, footer 5 rows, product card) | announcement strip, bars, drawers, footer rows | header, both drawers, footer, product card kept | — | not row-matched in this pass; README "Block mapping (SGS)" names `sgs/notice-banner`, `trust-bar`, `whatsapp-cta` etc. and is unread by design (FR-48A-8) |

### Section listing (Eye Care `sectionsInPageOrder`)

33 listed section classes across 12 keys (chrome 5, home 8, shop 1, product 7, checkout 5, seven pages 1 each). 31 reach a proposal row; `sgs-product-no-reviews` and `sgs-checkout-prescription` are state-hidden and never inventoried. Their outcomes are the 40-row table in section 3. The route reads none of the listing; the page-map reader reads only `pages`.

## 6. What a name-first approach could use from data that already exists

- **Eye Care draft roots:** 42 `class` attributes, 39 inventoried roots; 2 exact slugs, about 12 more whose words match exactly one block family (`breadcrumb`→`breadcrumbs`, `whatsapp-fab`→`whatsapp-cta`, `brand-marquee`→`brand-strip`, `trust-ticker`→`trust-bar`, `mega-menu`→`mega-panel`, `product-tabs`→`tabs`, `header`/`footer`→`site-header`/`site-footer`, `bag-drawer`→`cart`); about 16 plain names map to `sgs/container` by contract.
- **Eye Care manifest:** `overlays[].kind` (modal, drawer, header panel, overlay, transient status) for 6 classes; `repeatedGroups[].data` (fixed list vs live query: product, brand, reviews, cart) for 19 groups; `sectionsInPageOrder` for every page.
- **surfaces.json** (all three clients): `kind` for 171 records (already read), `name` (read but matched with `"."`), `notes`/`source` (unread).
- **DB, usable as observed fact:** `blocks.slug` (97 `sgs/*`), `blocks.title`/`description` (e.g. `sgs/whatsapp-cta`: "floating button, inline CTA, or banner variants"), `blocks.tier='class-section'` (3: hero, notice-banner, trust-bar), `block_selectors` root classes (45 roots), `slots.aliases` with `standalone_block` (42 of 106) for BEM elements.
- **DB, not usable as observed fact without checking:** `derived_selector` (38% of `.sgs-*` values occur in source), `equivalent_implementations` (template strings from attribute names, 29% on `core/*` blocks), `markup_examples` (no SGS class markup).
- **Indus and Mama's:** no names in the drafts; a name-first stage has only `surfaces.json` and the README for them, unless the handoff prompt is changed to ask for names (today it forbids block mapping in the README and is silent on classes).
