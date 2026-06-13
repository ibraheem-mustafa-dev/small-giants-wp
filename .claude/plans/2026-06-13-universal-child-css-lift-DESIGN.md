---
doc_type: phase-plan
project: small-giants-wp
thread: cloning-pipeline
title: "Universal child-element CSS lift — extend the selector-lift to typography/colour so ANY draft CSS at ANY depth transfers (fidelity fix = de-literalisation)"
created: 2026-06-13
status: DESIGN COMPLETE (mechanism + Track B inventory + Track C deterministic DB-fill integrated). NEXT = /adversarial-council (Rule 7) before any build.
parent: supersedes the de-lit Option-1 approach (NO-GO'd by council 2026-06-13 — it would have DROPPED child CSS). Bean reframe: the hand-reads are a SYMPTOM of a universal-mechanism gap; fix the gap, don't document the symptom.
template: align-router D222 + the EXISTING cross-node routers (_route_interior_css_to_parent_slot FR-22-5.3, _route_area_css_to_block_attrs GRID-PER-AREA).
---

# Universal child-element CSS lift — DESIGN

## Plain-English summary (for Bean)

**Your principle (the spec agrees — Rule 4 NO SKIPPING):** the script is a *cloner*. Any CSS on any draft element must land on the clone, even if it has to fold into the parent block's settings. Dropping a child element's font-size or background is a cloning bug, full stop.

**Why the hand-coded branches exist (the real diagnosis).** The converter already has a universal system that folds a child element's *spacing/size* CSS (padding, margins, widths, gaps) into the parent's settings — `_route_interior_css_to_parent_slot` + the grid-per-area router. But that system was only ever taught the *layout* properties. It was **never taught typography or colour** (font-size, font-weight, colour, background). So when a draft has a coloured testimonial quote or a trust-bar icon with a background circle, the universal system ignores it — and someone wrote a one-off `if this is the testimonial` branch to reach in by hand. The branches are a *symptom of the universal system's missing half*, exactly as you said.

**The fix.** Teach the universal system the other half: extend the one routine that already reaches into a block's named sub-pieces by name (`_lift_scalar_attrs_by_selector`) so it also lifts **typography and colour** CSS, not just text content. Then the testimonial/trust-bar hand-reads become genuinely redundant — and we can delete them with a *real* proof they produce identical output (because now they actually do). This simultaneously: (a) fixes cloning fidelity for every block with styled sub-pieces, (b) removes the per-block branches (the de-literalisation you wanted), (c) generalises to future blocks for free.

**The two things that must be right for it to work:**
1. The **mechanism** (extend the selector-lift to styling roles) — designed below, grounded in the actual code.
2. The **data** — every styled sub-piece needs the correct label in the database (which CSS property it owns, which sub-element it lives on). Right now several are mislabelled (the council found `nameFontWeight`/`ratingSize` tagged as "content"; `iconCircleBackground` tagged as nothing at all). Track C is auditing how to make `/sgs-update` fill these **correctly and deterministically** so we never hand-maintain them.

---

## Architecture ground-truth (verified this session)

### What already exists (the layout half)
| Mechanism | Reads from | Handles | Resolver |
|-----------|-----------|---------|----------|
| `_route_interior_css_to_parent_slot` (convert.py:2416, FR-22-5.3) | a non-content interior element (child of a class-section composite) | structural box CSS (padding/margin/gap/width/min-height) | `attr_for_layer_property(block, layer, css_prop)` |
| `_route_area_css_to_block_attrs` (2263, GRID-PER-AREA) | a dissolving named grid item | box CSS per grid AREA | `attr_for_area_property(block, area, css_prop)` |
| `_lift_scalar_attrs_by_selector` (3385) | ANY descendant matched by `derived_selector` (no recursion needed) | **content text + rating + image-object** | iterates `block_attrs(slug)`, gated `role in {text-content, content, rating, image-object}` |

### The resolver is ALREADY generic over CSS property
`attr_for_layer_property` (db_lookup.py:2400) resolves `(block, layer, css_property) → attr` purely by `property_suffixes` membership (name-free, DEC-1 — NOT via canonical_slot). `property_suffixes` ALREADY has rows: `FontSize→typography→font-size`, `FontWeight→typography→font-weight`, `FontStyle→select-from-enum→font-style`, `Colour/Color→color→color`, `Background/Bg→color→background-color`. **So the per-block attr resolution for typography/colour already works — the resolver is not the gap.**

### The two real gaps
1. **G3 content-blocks suppress child recursion** (walk.py G3 gate). So a block like `sgs/testimonial` (has_inner_blocks=0, renders `__text`/`__stars`/`__author` from its OWN attrs) never has its interior elements walked → `_route_interior_css_to_parent_slot` never sees them. The hand-read at 3111 compensates by `node.find(class_='sgs-testimonial__text')` itself.
2. **`_lift_scalar_attrs_by_selector` is hard-gated to content/rating/image roles** (3443-3452) — it explicitly skips `color`/`typography`. It is the ONE mechanism that reaches into a block's subtree BY SELECTOR (no recursion needed — perfect for G3 blocks), and it already runs on the G3 path (4207). It just doesn't do styling.

**Conclusion:** the cleanest, lowest-blast extension is to teach `_lift_scalar_attrs_by_selector` the styling-role class. It already fires for every G3 content-block, already reaches subtree elements by `derived_selector`, and the property resolution data already exists in `property_suffixes`.

---

## The mechanism (proposed)

Extend `_lift_scalar_attrs_by_selector` (or add a sibling `_lift_styling_attrs_by_selector` called beside it at 4207) with a THIRD attr class:

```
is_styling = role in {'color','typography','select-from-enum'(font-style)} AND derived_selector present
```

For each such attr:
1. Resolve the attr's CSS property from its suffix (reverse of `attr_for_layer_property`: the attr name's `property_suffixes` suffix → `css_property`). e.g. `quoteFontSize` → suffix `FontSize` → `font-size`; `iconCircleBackground` → suffix `Background` → `background-color`; `quoteColour` → `Colour` → `color`.
2. Find the child element via `derived_selector` (the EXISTING comma-separated multi-selector `node.find(class_=...)` path — handles the `__quote`/`__text` naming drift).
3. Read that CSS property's value from the element (`_collect_css_decls_for_element`), normalise per type:
   - colour → `_extract_token_or_hex` / `_colour_value_to_style` (token-or-hex, same as every other colour attr)
   - font-size/weight → unit-aware split (number+unit) or string per the attr's `attr_type`
   - font-style → enum value
4. Lift into the attr. **No match / no such CSS = no key emitted** (the natural no-op filter).

**Over-fire control (principled, per Bean's cloning principle):** the `derived_selector`-match IS the filter — an attr only receives a value if its declared sub-element actually exists in the draft carrying that CSS property. That is *correct cloning*, not over-fire. The council's "8 sibling colour attrs" concern (cta-section.buttonBackground, hero.contentBackground…) RESOLVES under this: if `.sgs-cta-section__button` has a background in the draft, the clone SHOULD carry it on `buttonBackground` — that's faithful. The remaining safety requirement is the [[converter-attr-must-match-the-attr-render-reads]] check: every lifted styling attr MUST be (a) correctly mapped to its element via `derived_selector`, and (b) consumed by render.php. Track B verifies render-consumption per attr; Track C makes the mapping deterministic.

**Optional belt-and-braces:** keep the lift behind a per-block opt-in capability (like `scalar-content-lift`) IF the council wants a hard gate during rollout, declared on the blocks we migrate first (testimonial, trust-bar) then widened. Decision deferred to the council.

---

## Why this is the align-router pattern, not a from-scratch build
- It extends an EXISTING routine (`_lift_scalar_attrs_by_selector`) that already runs on the G3 path.
- It reuses the EXISTING property resolution data (`property_suffixes` suffix↔css_property) and the EXISTING colour/size normalisers.
- The DB-fill (correct roles + granular `derived_selector`s) follows the EXISTING canonical path (Track C decides: `property_suffixes` rows / `ATTR_CLASSIFICATION_OVERRIDES` / block-supports selectors), reproduced by a full `/sgs-update` reseed — never manual edits ([[db-changes-reproducible-via-migration-not-manual-or-moduleload]]).
- Once it lifts the same values the hand-reads do, the hand-reads (3111 testimonial, 3335 iconCircleBackground, and the styling parts of trust-bar) become genuinely redundant → removable with a REAL byte-identical proof (emitted-attrs JSON diff + live computed-style probe, not the BEM-blind roster-parity).

## Core-block handlers = UNREACHABLE DEAD CODE (Bean's catch, proven 2026-06-13)

Bean asked why the `core/*` handlers are involved when every core block has a richer sgs replacement. Answer: **they aren't reachable.** `atomic_tag_map()` (db_lookup.py:2815) resolves every HTML tag via `html_tag_to_core_block` → reverse-walk `blocks.replaces`. Running it returns ZERO core slugs — every tag maps to an sgs block (a→sgs/button, h1-6→sgs/heading, p→sgs/text, img→sgs/media, blockquote→sgs/quote, hr→sgs/divider, ul/ol→sgs/icon-list, video/iframe→sgs/media). `blocks.replaces` covers core/button, core/separator, core/heading, core/image, core/quote, core/paragraph. No tag resolves to a bare `core/*`, and no other path in convert.py assigns a core slug to `_atomic_attrs_for`.

**→ The 6 core handlers (core/heading 2940, core/paragraph 2949, core/image 2987, core/button 3005, core/quote 3015, core/list 3355) are vestigial dead code** (predate the 2026-05-28 DB-driven atomic_tag_map hardening). **Removable with a reachability proof** — no DB work, no mechanism change, zero behaviour change. This is the cleanest literal reduction: 6 of 17 gone for free. Verification gate: atomic_tag_map yields no core (shown) + a page-8 re-clone emits zero `core/` blocks + both conformance suites green.

## Revised literal tally (17 total)
- **6 core/\*** → DEAD CODE, remove (reachability-proof gated).
- **1 sgs/text** → redundant with the graceful fallback, remove (Track B proved tag-gate-removal SAFE).
- **2 child-styling** (testimonial typo 3111, trust-bar iconCircleBackground 3335) → ABSORBED by the universal styling-lift (this design's core).
- **1 notice-banner** (3158) → ROOT-read bg, covered by `_lift_root_supports_to_style`; verify-then-remove.
- **7 genuine keepers** (documented, guard-protected): sgs/heading (level=tag transform), sgs/button (url+security), sgs/quote (array-wrap), sgs/media img+video (media extraction), sgs/icon-list (li array), sgs/option-picker (pill array), sgs/icon (emoji detect), trust-bar badge-array, hr (empty), fallback.

**Net:** ~10 of 17 literals removed or absorbed; the rest are genuine (transforms/arrays/security/media) + the Track-A guard blocks new ones. Real FR-22-3 compliance + a cloning-fidelity gain (the styling-lift), not symptom-patching.

## Track B + C findings (integrated 2026-06-13)

### Track B — confirmed target set (which branches read child CSS)
- **CHILD-READ styling branches (the universal-lift targets):** `sgs/testimonial` (3111 — typography from `.sgs-testimonial__text`/`__stars`/`__author`) + `sgs/trust-bar` (3335 — `__icon` background). These are exactly what the styling-lift absorbs.
- **CHILD-READ content-array branches (genuine exceptions, NOT styling):** `sgs/icon-list` (li array) + `sgs/option-picker` (pill array). Keep — array shape, not CSS.
- **ROOT-READ branches:** everything else (heading/text/button/quote/media/icon/notice-banner/core/*). notice-banner (3158) reads the ROOT background → covered by `_lift_root_supports_to_style` (notice-banner declares `color.background` support); verify-then-remove still applies.
- **`sgs/text` tag-gate removal = PROVEN SAFE:** no draft node reaches the `sgs/text` branch with a tag outside p/span/div; even if it did, the graceful fallback handles it. Wave (sgs/text) is clean + independent.
- **All 17 branch attrs are render-consumed** (verified) — lifted attrs have a paint path. Council Q4 (double-application) narrows to: confirm the attr is the SOLE paint path per block.

### Track C — the DETERMINISTIC /sgs-update DB-fill (no perpetual overrides — Bean's ask)
The mislabelled data is DERIVATION bugs in `assign-canonical.py`, fixable at the source:
1. **Gap-path role write (THE key universal fix, deterministic):** when an attr's stem has no slot match (→ gap path) but its property-suffix DID resolve a role, `assign-canonical` currently does NOT write the role. Fix: write the suffix-derived role even on the gap path. → `iconCircleBackground` (suffix `Background`→`color`) gets `role=color` automatically, NO canonical_slot (respects FR-22-2.4), for ANY unslotted styling attr. Universal.
2. **`iconCircle` slot alias (dated migration):** add `iconCircle`/`icon-circle` as an alias of the `icon` slot → `iconCircleBackground` fully resolves: `role=color` + `canonical_slot=icon` + `derived_selector=.sgs-trust-bar__icon`.
3. **`Style` suffix data fix (dated migration):** `property_suffixes.Style` currently `→role=behaviour` (wrong); should be `select-from-enum` like `FontStyle`. Fixes `quoteStyle`.
4. **Stale-row clear (one-time migration):** `nameFontWeight`/`ratingSize` carry STALE `role=content, canonical_slot=quote` from a prior manual write; the `canonical_slot IS NULL` guard blocks re-derivation. Fix: NULL the three fields where `role IN (content,text-content)` AND the suffix resolves to a CSS-styling role, then re-run `/sgs-update` Stage 1 → re-derives correctly (`FontWeight`→typography, `Size`→select-from-enum). Converts the override-maintenance into clean derivation.

All four are dated migrations / derivation fixes reproduced by a full `/sgs-update` reseed — NOT `ATTR_CLASSIFICATION_OVERRIDES`. This is the deterministic fill Bean asked for.

**FR-22-2.4-at-scale finding (for the council):** Track C found **832 attrs** have a styling role AND a non-NULL `canonical_slot`. Most are CORRECT (e.g. `quoteColour` + `canonical_slot=quote` = colour routing scoped to the quote element). So FR-22-2.4's "styling attrs are correctly NULL" is NOT literally true at scale — the real invariant is "a styling attr's ROLE must not be `content`/`text-content`" (the stale-row bug), not "canonical_slot must be NULL". The council should ratify this reading before the styling-lift relies on it.

## /adversarial-council VERDICT #2 — NO-GO as written, GO on a hard-trimmed shape (2026-06-13, 6 personas)

**Mechanism validated** (all 6): diagnosis correct, extend-the-selector-lift is the right shape, dead-core removal is a clean free win. But convergent must-fixes reshape the build:

1. **Opt-in capability is MANDATORY, not optional (4 personas).** `_lift_scalar_attrs_by_selector` ALREADY hard-gates `if "scalar-content-lift" not in capabilities_for(slug): return {}` (3426) — the design wrongly called it "optional/deferred". The styling-lift inherits/needs a per-block capability; enable testimonial+trust-bar first. This gate IS the over-fire control.
2. **The "8 sibling colour blocks" are UNREACHABLE** (regression, decisive): hero/cta-section/accordion are `has_inner_blocks=1` → the G3-only lift NEVER fires on them. The design justified the mechanism with blocks it can't touch. Real reachable set under the gate = testimonial + team-member only. Re-derive the true blast set.
3. **Exclude enum + hover + css_property=NULL** (regression + spec-lawyer): restrict styling class to `role in {color, typography}` + font-style ONLY where `css_property IS NOT NULL`, with skip-with-trace. 209 enum attrs (most css_property=NULL) + 66 `__hover` attrs would mis-lift/no-op silently.
4. **Route through the EXISTING `attr_for_property` arbiter** (cynic, sharp): there's a FOURTH mechanism (`db_lookup.attr_for_property`, D194) built to arbitrate which attr owns a css_property. The design's "reverse the suffix yourself" stands up a 5th competing opinion. Resolve the dest attr through the arbiter; honour its answer. Open architectural fork: fold typography/colour into the EXISTING interior-router `_route_interior_css_to_parent_slot` (CSS-fold belongs with CSS-fold) vs bolt onto the content-lift — council leans router, but the G3-recursion gap is why the selector-lift was chosen; decide explicitly + assert mutual-exclusivity (tripwire on double-write).
5. **FR-22-2.4 re-reading is WRONG + load-bearing (spec-lawyer ×2):** FR-22-2.4 is about TRIPLE-NULL attrs, NOT "all styling attrs have NULL canonical_slot". The real safety guarantee is FR-22-2.2 (role-exclusion), which is INTACT. DELETE the re-reading; reframe "FR-22-2.2-safe by construction". No amendment needed.
6. **iconCircleBackground = R-22-7 violation (spec-lawyer ×2):** decisions.md D216 council ruled "stays typed". DROP it from scope (keep hand-read, not urgent) OR formally re-open with new evidence before a council. → Track C Fix 2 (iconCircle alias) becomes moot.
7. **Track C blast bigger than stated (DB-realist):** Fix 1 gap-path role write = 437 attrs (needs dry-run + role breakdown; keep role≠lift-eligibility). Fix 3 (Style→enum) = reclassifies 28 live `behaviour` attrs (BREAKING) AND likely UNNECESSARY (`FontStyle` beats `Style` in longest-match — VERIFY `peel_property_suffix('quoteStyle')` first). Fix 4 (stale-clear) = 2 rows; ordering vs Fix 2 explicit; `Size`/enum has css_property=NULL → ratingSize unreachable by lift (needs css_property).
8. **Verification language wrong (live-verify, decisive):** testimonial render element is `.sgs-testimonial__quote` NOT `__text` (the hand-read's `__text` selector is ALREADY dead → current hand-read emits nothing for quote attrs → "before/after identical" is invalid; before=empty). iconCircleBackground paints via a CSS custom property on the wrapper (probe both layers). notice-banner probe absent. font-weight needs keyword→numeric. Probe a classic-card variant (variant CSS overrides font-style).
9. **THE ROI BOMBSHELL (ship-PM, decisive — I owe you this honestly):** the styling-lift fixes **ZERO currently-OPEN ledger rows.** The rows it would fix (SP-E quote, SP-D.1 stars, TB-A/B icon) are ALREADY CLOSED by the hand-reads it proposes to delete. The 4 remaining OPEN fidelity rows are DIFFERENT mechanisms (content-band max-width, inherited centring, full-width CTA). So the lift's real value = **regression-insurance-on-delete + future-block coverage**, NOT a live-broken-clone fix today.

**Grades:** regression D · DB-realist C+ · spec-lawyer B-/NO-GO · live-verify C+ · cynic C- · ship-PM B- (GO-BUT-TRIM).

**Synthesis — GO on the smallest valuable slice:** mechanism is GO pending the design corrections; build TESTIMONIAL-ONLY (DB-fill→capability-gated lift→`attr_for_property`-routed→live-verify byte-identical to the corrected hand-read), then STOP. LEAVE the hand-reads in as dead-but-safe. DEFER all branch/core/sgs-text REMOVALS (pure hygiene, no fidelity) behind the ~14 OPEN ledger rows. Ship the dead-core removal separately whenever (free). DROP iconCircleBackground (R-22-7). DELETE the FR-22-2.4 reframe.

**STATUS: NO-GO as written. Build shape re-decision required (see handoff to Bean).**

## Build sequence (post-council — SUPERSEDED by the trimmed shape above; retained for reference)
1. **DB-fill first (Track C output)** — correct the styling attrs' roles + granular `derived_selector`s deterministically via `/sgs-update`; full reseed; verify the target attrs resolve correctly. (No converter change yet.)
2. **Extend the selector-lift** to styling roles. Unit tests on the new branch (colour, font-size, font-weight, font-style; no-op on absent element; no-op on grid block).
3. **Live-verify the lift PRODUCES the same values** the hand-reads produce — computed-style probe on page-8 testimonial (`__text` font-size/colour, `__stars` size, `__author` weight) + trust-bar `__icon` background, BEFORE removing anything.
4. **Remove the now-redundant hand-reads** (3111, 3335, styling parts of trust-bar) — each with: emitted-attrs JSON diff == {} (the real byte-identical gate) + BOTH conformance suites + live computed-style unchanged. The `check-atomic-slug-literals` guard (Track A) shrinks its allow-list as each goes.
5. **sgs/text clean removal** (Track B confirms the tag-gate is safe) — separate, independent of the styling work.

## Acceptance criteria (per the council's must-fixes, baked in)
- **Not roster-parity for styling** — use a direct emitted-attrs JSON diff on the affected page-8 nodes (clone-parity is BEM-blind for native output, [[parity-bem-class-blind-spot-for-converted-output]]).
- **Computed-style probe per styling wave** (R-22-11): before/after `getComputedStyle` on the actual painted child element (`.sgs-testimonial__text` font-size/color/font-style; `__stars` font-size; `__author` font-weight; `.sgs-trust-bar__icon` background-color) at 1440/768/375.
- **BOTH conformance suites** (Gate A golden harness `scripts/tests/test_converter_conformance.py` + `converter_v2/tests/`).
- **DB changes reproducible via full `/sgs-update` reseed** — no manual edits, no module-load side-effects.
- **Blast-radius corpus** — roster check must run over a corpus exercising the sibling colour/typography attr blocks (hero, cta-section, pricing-table, accordion, process-steps), not just page-8, to prove the styling lift is faithful (not silently changing) on them.

## Open questions for the /adversarial-council (Rule 7 gate)
1. Extend `_lift_scalar_attrs_by_selector` in place, or add a sibling `_lift_styling_attrs_by_selector`? (Same file, same call site — separation-of-concerns vs one routine.)
2. Is the `derived_selector`-match the sufficient over-fire gate, or is a per-block opt-in capability required during rollout?
3. font-style role is `select-from-enum` in `property_suffixes`, and `quoteStyle` currently has role `behaviour` — does the styling-class membership test key on role, on the attr's suffix→css_property, or both? (Track C's deterministic-fill answer feeds this.)
4. Does lifting a child's colour/background risk a render.php double-application (the element's CSS + the attr-driven inline style both painting)? Per-attr render-consumption check (Track B) must confirm the attr is the SOLE paint path.
5. Sequencing: must ALL of Track C's DB-fill land before ANY lift extension, or can it be per-block (testimonial first, prove it, then trust-bar)?
