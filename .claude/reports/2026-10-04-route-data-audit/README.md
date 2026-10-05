# Route data audit (2026-10-04)

**Written for:** the sessions running `.claude/plans/2026-10-04-eye-care-sweep-audit-fix.md` (Sessions B and C).
Four read-only investigations, asked by Bean, into how the computed route (Spec 47) and the framework's attribute
detectors use the block source and the framework DB. Main-thread checks against the code are noted with ✔. Scripts
in each folder rerun the measurements; nothing here edited the repo, the DB or a site.

## 1. Wiring fingerprints (`fingerprint/`, rerun `bash fingerprint/run.sh`, ~60 s; it writes `fingerprint-report.json`, not committed)

**Every existing attribute gate proves an attribute is read, never that it paints.**
`check-dead-controls.js::isConsumed` passes a name read anywhere in render or shared PHP;
`check-editor-render-parity.js::checkEditorCanvasDesync` (CHECK A, advisory) flags container's grid-item settings and
then drops them through its `providesContextAttrs` exemption, which never checks that a child block reads the context
(✔ `providesContextAttrs` built from `meta.providesContext` alone). The only 6 orphan context keys in the framework are
container's `sgs/gridItem*`.

Ten valid wiring patterns, from 33 calibrated settings over 17 blocks (declared → control → editor emitter →
front-end emitter → CSS reader):

| # | Pattern | Editor | Front end | Example |
|---|---|---|---|---|
| F1 | Scoped declaration | preview style on `useBlockProps` | scoped `.uid{prop}` in render.php | `text` textColour |
| F2 | Prefix helper pair | `typographyPreviewStyle(attributes, prefix)` | `sgs_typography_css_rule($attributes, prefix, sel)` | `card-grid` titleFontSize |
| F3 | Shared wrapper | `contentBandPreview` (4 blocks call it) | `SGS_Container_Wrapper::render` | `container` padding |
| F4 | Custom property + style.css | same `--sgs-x`, or the real property | scoped `--sgs-x` (FR-32-4) | `icon` `--sgs-icon-size` |
| F5 | Class modifier | same class | class + style.css rule | `container` layout |
| F6 | Tier / box object | `resolveBoxTierPreview` | `sgs_serialise_box_sides` | `product-card` cardPadding |
| F7 | Hover state | usually none | `sgs_hover_state_rules` | `info-box` shadowHover |
| F8 | Extension | `editor.BlockListBlock` (hover-effects, image-controls have none) | `render_block` filter | `hover-effects.php::inject_hover_effects` |
| F9 | ServerSideRender | same PHP | render.php | `brand-strip` logoGap |
| F10 | Block context | child reads parent context in edit.js | child reads it in PHP | `accordion` → `accordion-item` |

Scan of 5,741 `sgs` attributes: 2,212 not paint; of 3,529 paint, **1,915 full, 1,613 partial**. Missing links:
editor canvas 1,330 over 67 blocks (447 prefix-helper, 345 block-own, 317 shared-wrapper, 221 hover), front-end channel
not found 389 (mostly scanner blind spots), control 120, editor sets a different variable 47, child-conditional reader 11
(exactly container's grid-item settings). Of 1,810 calibrated (proven to paint live) settings, 733 have no editor link.
Extensions: 27 paint, 24 with no editor mirror. All partials: `fingerprint/partials.csv`. Confidence medium (8 canvas
gaps hand-checked, all real; helper return values and media-atom controls not followed).

**Container grid-item settings (definitive):**
- Live: written only when the parent's layout is grid; the only reader is
  `style.css::":where(.sgs-container--grid > .sgs-container)"` (and the `__inner` depth), so only a cell that is itself
  an `sgs/container` paints (✔). Gradient and hover siblings are emitted for the direct-child depth only.
- Editor: `container/edit.js` sets only `--sgs-gi-bg` and `--sgs-gi-shadow` (✔); padding, radius, border and text
  colour never reach the canvas, and `container/editor.css::.sgs-container{border:1px dashed …}` beats the zero-
  specificity border default (✔).
- Calibration: the container fixture never tries `layout: grid` and its children are `sgs/text`, so "dead" there says
  nothing. `--sgs-gi-border` skips `sgs_colour_value()` (a slug colour would emit an invalid border; medium).

Detector design proposed: `check-wiring-fingerprint.py` (fast tier, ratchet baseline; editor-canvas link, channel
parity, child-conditional reader, `editor.css` specificity shadowing; fail on new partials among calibrated settings);
CHECK A's exemption requires a `usesContext` consumer; a cheap dynamic check rendering fixture markers through the
block-renderer REST route (the SSR path) and diffing the scoped CSS.

## 2. Seeder routing gaps (`seeder/`, rerun in order: helpers, census, final, hp, why, wrong2, tier, runcls, cmp, runpatched)

How routes are made: `extract-signatures.py::extract_css_property_and_layer` reads only each block's `render.php`,
`class-sgs-container-wrapper.php` when render calls it, the block's own `style.css`, and the block.json element
manifest; it knows 10 helpers (`_HELPER_SUFFIX_PROPS` and friends) of ~172 emitters in `includes/`. Stage 1C overlays
boxFamilies, fx, the extension roster and `attr-classification-overrides.json`. The committed classification matches a
fresh run (nothing stale).

**~628 working styling settings have no route** (invisible to Solve and to enum discovery, so reported as Missing):

| Class | Invisible | Example | Cause | Fix |
|---|---|---|---|---|
| A helper suffix missing from the map | 108 (+125 enum) | `quote::attributionFontFamily` | `_HELPER_SUFFIX_PROPS['sgs_typography_css_rule']` lists 13 suffixes; the helper reads 26 (✔: no FontFamily, TextAlign, TextWrap, TextColumns, TextIndent, WritingMode, Link*) | derive the maps from helper source |
| B sibling PHP file | 8 | `whatsapp-cta::cardTitleFontSize` (`variant-render.php`) | only `render.php` read | scan every `*.php` in the block folder |
| C1 second-level wrapper helpers | 149 (+43 mode) | `container::shapeDividerTopColour` | wrapper's callees not followed | follow the include graph |
| C2 other `includes/` emitters | 70 + 65 fixed prefix + 31 variable prefix | `account::menuFontSize`, `cart::panelTitleFontSize` | `includes/` not scanned | scan emitters; resolve the cart prefix map |
| D1 unrecognised value helper | 85 | `container::backgroundColourGradient` (`sgs_background_paint_decl`) | fixed helper list | detect emitter helpers |
| D2 colour/hover map in a variable | 42 | `feature-grid::backgroundColourHover` | only inline maps parsed | resolve `$map = array(...)` |
| D3 custom property read by another block | 6 | `multi-button::childBtnBorderColour` → `button/style.css` (✔) | own CSS only | read all block CSS |
| D4 forwarded to a nested renderer | 9 | `product-card::pickerLabelFontSize` | no tracer | override |
| D5 double-quoted / composite `transition` | 6 | `button::transitionDuration` | join shape only | seeder |
| G box-shaped tier without boxFamilies | 21 | `nav-drawer::closePadding` | boxFamilies only | block.json declarations |

~70 more have no proven cause; ~120 are class or `data-` modifiers (not single properties by design). Routed rows vs
calibration: `css_property` 1,405 of 1,418 exact (13 shorthand naming), `css_state` and `css_tier` 0 wrong.
`css_element` (unused by the route) differs on 316, mostly naming; `_split_php_statements` glues a `}` onto the next
statement so `_build_php_selector_var_map` misses selector variables after a brace (22 rows, including
`whatsapp-cta::label*` → "wrapper"). block.json vs DB: 0 missing, 0 orphan. 46 override entries point at rows that no
longer exist. sgs-ext: only roster entries get a route; 10 `sgsHover*` visual attributes and `sgsChildWidth`/
`sgsChildSizing` have none. `wishlist-panel` paints through core supports (no route possible under R-47-10).

## 3. Calibration outcomes (`calibration/all-entries-classified.csv`, every entry)

How each outcome is decided: noMarker = `lib/calibrate.mjs::markersFor` returns nothing (inputs: block.json type/enum,
`isColour`, `KEYWORDS`, a length-name regex, `tier_shape`, `box_family`); dead = `slotFor` sees no read property change
at any width; oneWidth = a per-device setting reached at fewer than 3 widths; untestedStates = no trigger, hidden hover
target, or no scrolled class; rejected = wp-build-page's dry run refused the marker; discovered = enum settings with no
`css_property` tried at rest.

Silent gap outside every total: `attrsFor`/`longhands()` drop 641 routed settings whose `css_property` the reader cannot
read (`color-gradient` 127, `border-color-gradient` 101, `box-shadow-color` 33, `stroke`, `height` 19,
`grid-template-rows`); 608 more were never attempted (caches predate extension seeding). Only 6 caches are current.

**Dead (711):** fixture lacks the element 321; 81-element read cap (`lib/calibrate.mjs` `.slice(0, 81)`, ✔) 62; surface
outside the instance or closed (cart `<dialog>` moved to body) 55; hover sent to the root, not the styled child 39;
background on a `::after` layer the reader never sees 33; stale border style without width 29; border needs its partner
22; needs a layout mode 21; needs a variant or toggle 19; marker wrong shape (`box_family` NULL, `{x,y}`) 16; accordion
item scope hash 13 (bug 1); overlay needs an image 13; pseudo-element or focus 12; state not rendered 8; stale radius or
floor 8; marker equals the rest value 7; not read by the block 4 (bug 2); DB routes the wrong property 3; marker outside
a render whitelist 1; hover with no `css_state` 2; **unexplained 23** (need a live check).

**noMarker (357):** gradients 194; keyword strings with no enum (options only in edit.js) 49; extension attributes not in
block.json (the DB row has type/enum) 41; media objects 26; transform family 19; length properties the regex misses 19;
colour routed to a non-colour property 4; grid ratio, array, `flat_sibling` radius (in Spec 47's marker table, not
implemented) 5.

**untestedStates (28):** 25 hover targets inside the closed drawer, 2 header scrolled (flaky), 1 `shrunk` (no trigger).
**oneWidth (22):** 10 non-length per-device values given px markers, 8 container-width tiers (false positives), 1
auto-fit floor, 1 hidden burger, 2 unexplained. **rejected (7):** button `customWidthUnit` is a per-device object (3),
`featuredFontWeight` number given a string (4). **discovered (442):** 199 recorded effects (good); of 243 empty, 72 paint
nothing and 50 are motion (expected), 45 need a property the reader skips (writing-mode, background-attachment), 19 need
a companion, 5 hover enums read at rest, 52 mixed.

**Genuine framework bugs:**
1. `accordion-item/render.php`: the scope `$uid` hashes the item's own attributes and anchor only (✔), not the 25
   settings it inherits from the accordion, so identical items in two accordions share one scope and leak styles.
2. `team-member/render.php`: root `fontSize`, `fontWeight`, `fontStyle`, `lineHeight` are declared and routed but never
   emitted (the helper runs for the name, role and bio prefixes only, ✔).
3. `class-sgs-container-wrapper.php::render`: grid-item hover, gradient and text-colour rules miss items under `__inner`
   (medium, code reading).
Defects that are not render bugs: DB routes `testimonial::ratingSize` (SVG width), `nav-bar-menu::collapsePoint` (a media
query) and `nav-drawer::modality` to the wrong property; `image-sequence::aspectRatio`'s allowed list is not a block.json
enum.

## 4. DB and block-file inventory (`inventory/t1.py`–`t8.py`)

The route queries 1 of 40 tables (`block_attributes`, via `lib/db.mjs` only) and 13 columns (`lib/db.mjs::COLS`; `role`
is not one of them).

**Worth using:** `role` + `roles.classification` (98% filled, gated) as the predicate for calibrating painting settings
with no route; `blocks.variant_attr` + `variant_slots` (fixture dependencies, e.g. hero split); `preset_implications`
(preset candidates, e.g. card-grid `effectHover=lift`); `excluded_properties` (position, inset, flex-grow, overflow have
no setting by design: passthrough, not Missing); `block_composition.composition_role`/`accepts_allowed_blocks` (fixtures;
never `wraps_block`, false on ~37%); `output_signature.conditional_gates` (dead-reason hints).
**Block files the route ignores:** `supports.sgs.elements[*].attrMap` (95 blocks, 1,976 entries, 46 `native:`
delegations: a Missing that is really native-only); block.json `example` (79 blocks; fixtures are hand-written);
`providesContext`/`usesContext`; helper prefix contracts in `includes/helpers-*.php`; sibling PHP files (15 blocks);
edit.js control props (925 literal min/max/step, unit lists; costly to parse, low value now); view.js state classes
(the untested states); style.css literal declarations (predict hardcodes before a write).
**Not useful (closed list):** `derived_selector` (values are not real classes), `equivalent_implementations`,
`block_composition.wraps_block`, `blocks.status`/`is_stale`, `block_selectors`, `block_supports` (read block.json),
`design_tokens` (the route reads `theme-snapshot.json`), `style_variations`, `markup_examples` (stale), `slots`,
`canonical_slot_aliases`, `block_capabilities`, motion tables (only for FR-47-7), tooling/docs tables, both empty
`variant_composition_*` tables, content-only `array_item_schema`/`emit_shape`/`alt_companion_attr`.

## 5. QC council on the fingerprint counts (`council/`)

Four Sonnet raters (precision by sampled code reading, recall census, scanner code-path trace with patched runs,
triangulation against calibration and CHECK A). Agreement was high; verdicts per link:

| Link | Prototype count | Measured precision | Likely true count | Main false-positive / false-negative mechanism |
|---|---|---|---|---|
| L3 editor canvas | 1,330 | 95% (60 sampled) | ~1,264, plus hidden gaps | panel props counted as canvas reads (≥111), conditional SSR credited (163), barrel re-exports and media-atom helper not followed; ~18 of sampled are hover or motion |
| L5 channel | 389 | 2.5% (40) | ~10 to 50 | 2-hop variable cap, helper return values, custom properties inside strings, class shapes with `__`, data attributes, forwarded values, context searched in the parent |
| L2 control | 120 | ~10% strict (40) | ~8 to 14 | computed `setAttributes` keys (shadow keys, media atoms, descriptor rows in non-panel files), extension and variation controls |
| L7 parity | 47 | 25.5% (census) | 12 | documented exemption not implemented; dynamic custom-property names; unrelated properties sharing a statement |
| C1 child-conditional | 11 | 100% (census) | 11 | — (container grid items) |
| L4 front-end read | 4 | 25% | 1 | editor-only attributes; hook-registered `includes/` emitters |
| L6 consumer | 1 | 0% | 0 | the check could almost never fail (`not decl` exemption); `.scss` `//` comments |

Population: the "not-paint" bucket held ~1,310 painting settings (Rater B census, `rater-b-notpaint-reclassified.csv`),
because paint came only from the DB `css_property` or the calibration cache; paint total ~4,750, not 3,529. False
passes: the attribute's own name counted as a declaration (60), an always-true helper branch (18), conditional SSR
(163). Engineering: the prototype read the gitignored calibration cache (gate results would differ in CI), used absolute
paths, wrote non-deterministic key order, and had no input freshness check. Bug classes it could not see: accordion-item's
scope hash without context, a root-prefix helper with no root control (team-member, google-reviews), the `__inner` depth.
Real defects confirmed in passing: team-member root typography; `nav-bar-menu::margin`, `nav-drawer-menu::margin`,
`choice-flow::backColourBorderHover` have no control; `wishlist-panel::columns` never reaches the canvas.
All 21 fixes are Task 2 of `.claude/plans/archive/2026-10-04-wiring-fingerprint-gate.md`.

## 6. The production gate (2026-10-04, `check-wiring-fingerprint.py`)

Built from the prototype with the council's 21 blind spots and two review rounds fixed (`plans/archive/2026-10-04-wiring-fingerprint-gate.md`).
On Rater A's labelled rows it has 100% precision on every link and 100% recall except L2 (44%: the misses are
`tagName`/`templateLock`-type settings outside the paint population by design); Rater B's population agreement is
≥95% both ways; no calibrated setting carries an L5 or L7 finding; it finds all three framework bugs. Counts at
8d81a084f: 5,804 attributes (prototype 5,741; extension attributes added), not paint 1,292, full 2,139, partial
1,737, advisory-only 636. Links: L3 1,591 (72 blocks), L3-state 640 (advisory), L3-tier 99, L2 26, L6-token 21
(advisory), L5 18, C1 15, B3 11, L6 10, B2 4, L7 3, S1 2, B1 1, L4 1. Blocking gaps are baselined (1,781); `--check`
fails only on a new one. Rerun: `python plugins/sgs-blocks/scripts/check-wiring-fingerprint.py --json <file>`.

## 7. Session 0 results (2026-10-05)

Plan: `.claude/plans/2026-10-04-eye-care-sweep-audit-fix.md` (Session 0 status). Block code at `4726700c1` is deployed to
eye-care-test (checksums verified) and, as the identical block build `7f770ebb5`, to sandybrown.

- **Wiring gate (section 6):** blocking gaps 1,781 to 201 (`3fee871a2`; the baseline keeps one accepted entry,
  `google-reviews::scrollbarStyle::L5`, a tracer blind spot where a value passes through a normalising variable and
  then a ternary). Link counts are not recorded here: rerun `python plugins/sgs-blocks/scripts/check-wiring-fingerprint.py --json <file>` for the current split.
  Fast gates 139 of 139 and full tier 6 of 6 pass; the framework DB is reseeded from HEAD with F6 at 0 violations.
- **Seeder routing (section 2):** unrouted core styling 628 to 368 (`74771c855`); agreement with the 2026-10-04
  classification stays 1,405 of 1,418 and `css_state` or tier wrong is 0. The 368 remaining: 81 refused as ambiguous
  (shape-divider top and bottom element derivation drops `--top` and `--bottom`; wrapper fills against overlays), about
  30 gradient siblings that need `attrMap` `css:color-gradient` or `css:border-color-gradient` in `block.json`, and the
  rest with no evidence. The roster's `sgsHover*` and `sgsChildWidth` rows stay NULL (one-slot collisions).
- **Calibration (section 3), code changes (`c0d6c1d0d`, `0b0630d6e`):** no element cap; pseudo-element layers; closed
  panels read through `aria-controls`; hover and focus on the styled element; shrunk and scroll triggers;
  preconditions from variants, toggles, border partners, the overlay image and layout modes; markers for every
  previously markerless class; `longhands()` maps colour and border gradients and shadow colour; container-query tiers
  are `containerTier`. Each class has a test (`calibrate-classes`, `calibrate-read`).
- **Calibration rerun counts:** recorded here after the recalibration queue finishes and `calibration/classify_dead.py`
  is rerun, beside the 2026-10-04 counts in section 3.
