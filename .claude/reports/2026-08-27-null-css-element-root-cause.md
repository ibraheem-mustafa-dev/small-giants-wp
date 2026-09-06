# NULL `css_element` root-cause investigation — 2026-08-27

**Scope:** the ~85 `block_attributes` rows with a non-empty `css_property` but NULL/empty
`css_element` (87 rows returned by the query in the brief; 2 header lines subtracted = 85 data
rows). Investigation only — no code, no DB, no schema changed.

## Q1 — is the seeding script itself at fault?

**Verdict: not a single script bug that mis-derives a value. It is a combination of THREE
distinct, separable causes** — two are real capability gaps in the derivation script
(`extract-signatures.py`), one is deliberate by-design non-coverage. None of the three
*mis-derives* a wrong value; all three honestly return "no evidence" where the script's current
signal set genuinely cannot see the answer (or, in one case, was told not to look).

| Cause | Class | What it is |
|---|---|---|
| **A — unregistered shared helper** | (a) script defect | `_HELPER_SUFFIX_PROPS` (Shape D, the mechanism that reads a helper call's selector argument) registers exactly TWO helpers: `sgs_button_element_style_css` and `sgs_typography_css_rule`. A third, equally common shared helper — `sgs_emit_state_colour_css( $selector, $decls_normal, $decls_hover )` (`includes/helpers-tokens.php:1275`) — is used by **21 files** across the plugin (`card-grid`, `cta-section`, `hero`, `post-grid`, `process-steps`, `product-card`, `team-member`, `testimonial`, `testimonial-slider`, `trust-bar`, `notice-banner`, `icon-list`, `buybox`, `container`, `site-footer` render.php files, plus the shared wrapper/token includes) and is **never checked at all**. When an attr's ONLY element evidence is the literal BEM selector passed as this helper's 1st argument, the classifier is structurally blind to it — the evidence exists in the source, but nothing reads it. |
| **B — cross-statement selector variables** | (a)/(b) hybrid, capability gap | Shape B/C traces a CSS **property** through a chain of PHP variables (`$v = $attributes['x']; ... 'prop:' . $v`) across statements. It does **not** do the mirror trace for a **selector** held in a variable assigned in an earlier statement and referenced by name in a later one (e.g. `sgs/hero`'s `$sgs_hero_split_media_fit_selector`, built at render.php:630, referenced at line 644 for the Tablet object-position rule). The selector literal (`.sgs-hero__split-media--image,...--video`) is present in the source and would resolve correctly if traced — the scanner just doesn't do that hop today. |
| **C — root-scoped declarations have no positive "wrapper" signal** | (a) capability gap, but different shape from A/B | A large slice of the 85 genuinely paint the block's **own root class** (`.sgs-nav-menu{color:...}`, `.uid.sgs-button:hover{transform:...}`, `.sgs-testimonial.sgs-has-hover:hover{box-shadow:var(--sgs-hover-shadow)}`) — there is no `sgs-{slug}__{element}` substring anywhere in the selector because there IS no sub-element; the target is the wrapper itself. `_derive_bem_element_from_selector` correctly finds nothing (there's nothing BEM to find), but the code has no rule that turns "root selector, zero BEM element tokens" into a positive `element='wrapper'` classification — the `is_root_element`/`'wrapper'` normalisation (extract-signatures.py:2482-2507) only fires *after* an element value has already been resolved from somewhere and happens to equal the block's declared root key. Absence of any element token never triggers it. |
| **fx:\* namespace (BY DESIGN, not a bug)** | genuinely non-covered, deliberate | Layer 2.5 (`_collect_fx_attr_namespace_overrides`, sgs-update-v2.py:1893) writes **only** `css_property` for `fx:*` pseudo-properties (`dragMomentum`→`fx:momentum`, `dragToScroll`→`fx:draggable`, `loopCarousel`→`fx:loop`, `fxStart`/`fxScrub`/`fxEnd`). It never writes `css_element`, and the docstring/layering comment does not claim it does. These are JS carousel-behaviour config, not CSS paint declarations — "which element" isn't the same question for them. ~18 of the 85 rows are this. **Not a defect; do not "fix" these — NULL is the honest, intended state.** |

No case in the sample was a script **mis-deriving** a wrong element (e.g. grabbing a sibling
selector) — every NULL traced back to the classifier simply never looking at the right piece of
source text, for one of the three reasons above.

## Q2 — five samples, different blocks

| # | Block.attr | Actually paints on | Why derivation missed it | Category |
|---|---|---|---|---|
| 1 | `sgs/card-grid.textColourHover` (`color`) | `.{uid} .sgs-card-grid__item` (a real BEM sub-element, `:hover`/`:focus-visible`) via `sgs_emit_state_colour_css( $root_sel . ' .sgs-card-grid__item', [], $card_grid_hover_decls )` (render.php:270-282) | **Cause A.** The helper isn't registered, so Shape D never inspects its 1st-arg selector — even though that selector is a plain literal concatenation containing `sgs-card-grid__item`, exactly the pattern Shape D already parses for the two registered helpers. | (a) |
| 2 | `sgs/hero.splitMediaObjectPositionTablet` (`object-position`) | `.{uid} .sgs-hero__split-media--image,.{uid} .sgs-hero__split-media--video` (the `split-media` element — confirmed by the block.json note on that element: "It OWNS the whole splitMedia\* control family… `object-fit`/`object-position` emit on the compound `.sgs-hero__split-media--image,--video` selector") | **Cause B.** The selector is built once into `$sgs_hero_split_media_fit_selector` (render.php:630) and consumed by *name* two statements later (line 644) where the `object-position:` property text lives. The base (non-Tablet) sibling `splitMediaObjectPosition` IS correctly resolved — but only because it has an explicit `attrMap` entry in block.json; the block.json's own comment says the Tablet/Mobile siblings were *deliberately* left off the attrMap and expected to "fall through to selector derivation" — which doesn't actually reach cross-statement selector variables. | (a)/(b) — a documented design intent (fallback should work) undermined by an actual gap in the fallback |
| 3 | `sgs/decorative-image.positionX` / `.positionY` (`left`/`top`) | `{$root_sel}` — the block's own root (`.{uid}.sgs-decorative-image`), `position:absolute;left:{x}%;top:{y}%;...` (render.php:154-167) | **Cause C, PLUS an explicit declaration-gap.** block.json's own note (line 43) says these are "deliberately left unmapped… css:top/css:bottom stay genuine gaps rather than being force-mapped to a different semantic" — a conscious author decision not to attrMap them (semantic argument: percentage anchor coordinates ≠ literal CSS offsets, even though the render literally does emit `left`/`top`). Even setting that aside, the selector (`$root_sel`, built at line 130, referenced at line 167) carries no BEM `__element` at all, so Cause C also applies. | (b) declared-gap + (a) capability gap, doubly explained |
| 4 | `sgs/nav-menu.navColour` (`color`) | `$uid_sel` — the block's own root, `{$uid_sel}{color:...}` (render.php:848-859) | **Cause C.** No BEM element in the selector; a genuinely root-scoped colour with no positive "wrapper" rule to catch it. | (a) |
| 5 | `sgs/testimonial.shadowHoverColour` (recorded as the synthetic property `box-shadow-color`) | `.sgs-testimonial.sgs-has-hover:hover` / `.sgs-testimonial.sgs-has-hover-scale:hover` — the block's own root plus state modifier classes, consuming `--sgs-hover-shadow` via `box-shadow:var(--sgs-hover-shadow,none)` (style.css:465-467); the custom property itself is composed from `shadowHover`+`shadowHoverColour` by `sgs_shadow_value_composed()` (render.php:509) | **Cause C** (root-scoped, no BEM element) layered under a genuine multi-hop custom-property chain (attr → composed helper → `--sgs-hover-shadow` var → consumed in a **different file**, style.css, on a selector built from modifier classes, not an element). | (a) |

Sampled across 5 different block families (card-grid, hero, decorative-image, nav-menu,
testimonial) — not siblings of one block, per the brief's warning.

## Q3 — is there a bulk pattern?

**Partial pattern, honestly split into three buckets — not one fix.** Based on the five samples
plus a scan of the query's other rows for shape (same file/helper checks, not exhaustively
re-derived per attr):

1. **fx:\* namespace — ~18 of 85 rows.** Not a bug. Recommend: **leave these NULL**; if anything,
   record that fact once (e.g. a comment in the layer-2.5 docstring already does) so nobody
   re-flags them as drift.
2. **Root-scoped, no BEM element (Cause C) — the majority of the remainder.** Every `*Hover`
   scale/shadow/colour attr that targets the block's OWN root class rather than a named
   sub-element falls here: `scaleHover` (button/card-grid/gallery/heading/icon/info-box/quote/
   team-member/testimonial/text — 10 rows), `bgKenBurns` (container/cta-section/hero/
   site-footer/site-header/trust-bar — 6 rows), `navColour`/`navBgHover` (nav-menu),
   `shadowHover`/`shadowHoverColour` (testimonial), `positionX`/`positionY`
   (decorative-image), `focusRingColour` (product-search), `textAlign`
   (container/icon), and several `brand-strip` sizing attrs (`columnsDesktop/Tablet/Mobile`,
   `fadeWidth`, `maxHeight`) that read as root-level sizing on inspection of their names/shapes
   (not individually re-verified in this pass — flagged as *likely* Cause C, not confirmed).
   Rough basis for the "likely" tag: every attr in this list either (i) was confirmed
   root-scoped in the 5 samples above, or (ii) shares the exact `*Hover` shadow/scale/colour
   naming+property shape as a confirmed sample, which in this codebase's established
   convention (per the CLAUDE.md D808 "universal hover panel" note quoted in the brief) is
   root-only by construction for these property types.
3. **Sub-element hover via `sgs_emit_state_colour_css` (Cause A) — a smaller, harder-to-eyeball
   subset.** Confirmed for `sgs/card-grid.textColourHover`. The SAME helper is also called with
   a bare `$root_sel` (no element) elsewhere in the SAME blocks (e.g. testimonial's
   `quoteColourHover`/border call at render.php:524 uses `$root_sel` directly, not a sub-element)
   — so **the helper's use does not predict Cause A vs Cause C**; each call site must be read
   individually. `borderColourHover`/`backgroundColourHover`/`textColourHover` on `card-grid`
   and `post-grid` are plausible Cause-A candidates (both blocks scope their hover state to a
   `__item`/`__card` sub-element per this project's card-grid pattern), but this needs the same
   per-call read as sample #1, not a name-based guess.

**Honest coverage estimate: the fx:\* bucket (~18, do-not-fix) plus the root-scoped bucket
(plausibly 35-45 of the remaining ~67, but only 6 individually confirmed) plausibly explain the
large majority of the 85. The Cause-A helper-registration bucket is real but smaller and CANNOT
be identified by name pattern alone — every `sgs_emit_state_colour_css()` call site needs a
one-line read to tell root-scoped (Cause C) from sub-element-scoped (Cause A) before it is
touched.** No single regex or dict addition covers all 85; three different pieces of derivation
logic are involved, and the split between Cause A and Cause C requires per-attribute reading
even where the helper is the same.

## Q4 — what would a fix look like, and is it safe?

**Two fix shapes, with different safety profiles.**

**1. Hand-declared `attrMap` entries, per block — same mechanism already used for the two
   solved cases (post-grid.aspectRatio, media.objectPosition) in the brief.** This is the
   SAFEST route: a human reads the render.php/style.css (exactly as done for the 5 samples
   above), confirms the real target element (including `'wrapper'` for the root-scoped bucket —
   `sgs/container`'s own `bgKenBurns`/`textAlign` rows could declare `"css:animation":
   "bgKenBurns"` etc. on the block's declared root/wrapper element), and writes it into
   block.json's `supports.sgs.elements.<el>.attrMap`. **Cannot be scripted safely for the whole
   85 at once** — it is authoritative human declaration by design (same standing the classifier
   already gives it — "wins over everything"), and a script guessing 85 of these would just be
   re-implementing the very heuristics that already produced NULL, with no new evidence.
   Realistic scope: do it block-by-block, prioritising blocks with the most affected attrs
   (`card-grid` 5, `testimonial` 7, `hero` 4, `brand-strip` 5).

**2. A genuine script enhancement to `extract-signatures.py`** — buildable, but NOT safe to
   apply blind, for the reason the brief flags: **a wrong element is worse than NULL**, because
   NULL is visibly "unknown" while a wrong value looks authoritative and would silently misroute
   cloned CSS. Two sub-pieces, both new capability (not a config/dict change):
   - Register `sgs_emit_state_colour_css` (and audit for other unregistered shared helpers) in
     a Shape-D-style scanner — but its signature (`selector, decls_normal[], decls_hover[]`) is
     NOT the `(attrs, prefix, selector)` suffix-map shape the existing two helpers use, so this
     needs new parsing logic, not a dict entry.
   - Add a POSITIVE "root, zero BEM element tokens found → wrapper" rule — safe only if gated
     tightly: it must fire on **evidence that the selector reduces to the block's own bare root
     class** (e.g. the selector argument textually IS `$root_sel`/`$uid_sel`, a name known to be
     bound to the root at its point of assignment), never on "the scanner simply found nothing"
     as a blanket default — the latter would silently convert every OTHER kind of undiscovered
     gap (dead code, an unreadable expression, a genuine bug) into a confident wrong "wrapper"
     claim.
   Any such change should ship with a `--self-test` re-run against the current ~85-row list
   confirming it **only fills currently-NULL rows** and changes zero already-populated
   `css_element` values, before being trusted to touch the converter's routing.

## Recommendation

Do not bulk-fix. Treat the 85 as three buckets:
- **~18 fx:\* rows — close as "working as intended", no action.**
- **Root-scoped bucket (Cause C) — the single highest-value fix**, because it is the largest
  bucket AND the safest to fix by hand (attrMap entries pointing at `'wrapper'`/the block's own
  root element, one line per attr, verified against render.php the way the 5 samples were here).
- **Helper-registration bucket (Cause A) — smaller, needs individual verification per call
  site** (same helper, different scope per call), then either an attrMap entry (safe, immediate)
  or, if Bean wants the underlying capability gap closed once for future attrs, the scripted
  Shape-D extension described above (larger, higher-risk, should get its own design-gate per
  this project's CLAUDE.md Rule 7 before building, since it touches the shared derivation
  pipeline that also feeds the cloning converter).
