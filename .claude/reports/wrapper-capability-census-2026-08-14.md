# Wrapper-capability census — Phase 0

**Date:** 2026-08-14
**Instrument:** `plugins/sgs-blocks/scripts/surveys/survey-wrapper-capability.js --survey`
**Status:** static census COMPLETE · live calibration NOT YET RUN
**Reproduce:** `node scripts/surveys/survey-wrapper-capability.js --survey`

---

## In one paragraph

The shared container wrapper is consumed by **25 blocks**, not the 37 / 31 / 30 / 16 that four
different sources claim — and most of that "disagreement" turns out not to be disagreement at all,
but four sources answering four different questions. Nothing the wrapper renders is dead: every
control that mounts is declared and can reach paint. The real cost sits in the opposite direction —
**61 attributes across 7 blocks that a block declares, pays for, and can paint, with no control
anywhere for a client to set them.** The single clearest structural fact for the decomposition is
that the editor and the renderer disagree about what a block *is* for 7 blocks.

---

## 1. The framing pass — which question each source answers

⭐ **This is the census's first deliverable, and it had to come before any count comparison.** Three
times in this workstream a "disagreement" turned out to be two axes answering different questions.

| Source | Count | The question it actually answers |
|---|---|---|
| DB `wraps_block='sgs/container'` | 37 | *Is this block container-BEARING* — does it wrap children via InnerBlocks or a layout attr? (`sync-container-wrapping-blocks.py` docstring) |
| DB `container_kind` | 36 (+1 NULL) | *Given its declared ATTRIBUTE SIGNATURE, which capability class is it?* Derived from background/overlay/shapeDivider attrs → section; grid/flex/columns → layout; InnerBlocks-only → content, plus operator override |
| `findMounts` (this census) | **25** | *Does this block MOUNT the shared editor component, and which panels does it get?* |
| `render.php` arg 4 | 27 calls | *Which wrapper LAYERS does this block paint?* |
| Spec 31 §13.6 prose | 31 | stale prose snapshot |
| Wrapper's own in-file comment | 16 | stale snapshot, and wrong — see §5 |

**Verdict: there is no four-way data defect.** There are four legitimate axes and two stale prose
copies. The honest consumer count for *"mounts the shared editor component"* is **25**.

### The one real residue

`sgs/physics-canvas` declares `supports.sgs.containerKind: "section"` in its `block.json` and carries
`wraps_block='sgs/container'`, but its `container_kind` DB cell is NULL — the declared operator
override never reached the DB. **This is the only genuine seeding defect found.** Reported, not
fixed: that column is read by the cloning converter (`scripts/converter/db/db_lookup.py`), so
changing it is a cross-track action needing its own design gate.

⛔ **Two things that look like defects and are not** — do not "fix" them:
- `sgs/modal` on the `container_kind` roster while never painting via the wrapper. **Correct by
  design** — Spec 31:97 states `containerMirror:false` blocks stay on the converter roster; the
  seeder documents modal's override at `:56` as belt-and-braces.
- `sgs/container` absent from the roster. **Correct by design** — a roster of blocks that mirror the
  container does not contain the container.

---

## 2. ⭐ The structural finding — `kind` is two channels that disagree for 7 blocks

| Channel | Where it lives | Reality |
|---|---|---|
| **Editor** | `kind` prop on `<ContainerWrapperControls>` | **never `section`** — 17 aggregator mounts: layout ×12, content ×5 |
| **Paint** | arg 4 of `SGS_Container_Wrapper::render()` | **`section` for 7 blocks** |

The 7: **container, cta-section, hero, physics-canvas, site-footer, site-header, trust-bar.**

Every one reaches the wrapper by mounting named panels *directly* rather than through the
aggregator, so it passes no editor kind at all — while its `render.php` paints the full section
surface. They then hand-roll their own panels, each recording why in a file-top comment (legacy flat
attrs; an incompatible `layout` enum WordPress silently coerces).

**That asymmetry is the decomposition's real subject.** These blocks already do by hand what opt-in
capabilities would give them properly.

---

## 3. The matrix

R = rendered · D = declared · C = consumed (branch-aware, at this block's paint kind) · LIVE = all three

| block | route | editor | paint | R | D | C | LIVE | orphans |
|---|---|---|---|--:|--:|--:|--:|--:|
| sgs/accordion | aggregator | layout | layout | 14 | 14 | 14 | 14 | 0 |
| sgs/accordion-item | aggregator | content | content | 2 | 2 | 2 | 2 | 0 |
| sgs/card-grid | aggregator | layout | layout | 14 | 14 | 14 | 14 | 0 |
| **sgs/container** | direct | — | **section** | 45 | 45 | 45 | 45 | 0 |
| **sgs/cta-section** | direct | — | **section** | 45 | 45 | 45 | 45 | 0 |
| sgs/feature-grid | aggregator | layout | layout | 14 | 14 | 14 | 14 | 0 |
| sgs/form | aggregator | layout | layout | 14 | 14 | 14 | 14 | 0 |
| sgs/form-field-tiles | aggregator | layout | layout | 14 | 14 | 14 | 14 | 0 |
| sgs/form-step | aggregator | content | content | 2 | 2 | 2 | 2 | 0 |
| sgs/gallery | direct | — | layout | 10 | 10 | 10 | 10 | 3 |
| sgs/google-reviews | aggregator | layout | layout | 14 | 14 | 14 | 14 | 0 |
| **sgs/hero** | direct | — | **section** | 27 | 27 | 27 | 27 | **17** |
| sgs/multi-button | aggregator | content | content | 2 | 2 | 2 | 2 | **7** |
| **sgs/physics-canvas** | direct | — | **section** | 2 | 2 | 2 | 2 | 0 |
| sgs/post-grid | aggregator | layout | layout | 12 | 12 | 12 | 12 | 1 |
| sgs/pricing-table | aggregator | layout | layout | 14 | 14 | 14 | 14 | 0 |
| sgs/product-card | aggregator | content | content | 1 | 1 | 1 | 1 | 0 |
| **sgs/site-footer** | direct | — | **section** | 17 | 17 | 17 | 17 | **16** |
| sgs/site-footer-row | aggregator | layout | layout | 14 | 14 | 14 | 14 | 0 |
| **sgs/site-header** | direct | — | **section** | 17 | 17 | 17 | 17 | **16** |
| sgs/tab | aggregator | content | content | 2 | 2 | 2 | 2 | 0 |
| sgs/tabs | aggregator | layout | layout | 14 | 14 | 14 | 14 | 0 |
| sgs/testimonial-slider | aggregator | layout | layout | 12 | 12 | 12 | 12 | 1 |
| **sgs/trust-bar** | direct | — | **section** | 45 | 45 | 45 | 45 | 0 |
| sgs/trustpilot-reviews | aggregator | layout | layout | 14 | 14 | 14 | 14 | 0 |

**Panel budget per editor kind:** `section` 5 panels / 45 attrs · `layout` 2 panels / 14 attrs ·
`content` 1 panel / 2 attrs.

### Why the R/D/C columns are identical everywhere

`check-shared-panel-schema.js` is a **prebuild gate** that fails the build on exactly a
declared≠rendered mismatch. A zero here restates a passing gate — it is not a discovery, and it is
labelled as such in the tool output so no future reader mistakes it for evidence of health.

---

## 4. ⭐ Orphaned capability — the cost the decomposition is actually about

**61 attributes across 7 blocks: declared, paintable, and no control mounted anywhere.**

| block | n | attributes |
|---|--:|---|
| sgs/hero | 17 | alignContent, alignItems, columns, flexDirection, flexWrap, gap, gridAutoRows, gridItemBackground, gridItemBorder, gridItemBorderRadius, gridItemPadding, gridItemShadow, gridItemTextColour, gridTemplateRows, justifyContent, justifyItems, layout |
| sgs/site-footer | 16 | alignContent, alignItems, columns, flexDirection, flexWrap, justifyContent, + all 10 shapeDivider* |
| sgs/site-header | 16 | as site-footer |
| sgs/multi-button | 7 | alignContent, columns, gridAutoRows, gridTemplateColumns, gridTemplateRows, justifyItems, layout |
| sgs/gallery | 3 | contentWidth, layout, maxWidth |
| sgs/post-grid | 1 | layout |
| sgs/testimonial-slider | 1 | columns |

**This is a candidate list, not a defect list**, and it is already filtered once: a further **9**
attributes were excluded because the block writes them from its own inspector (e.g. `sgs/gallery`
declines the shared layout control because its `layout` enum is Grid/Masonry/Carousel against the
shared panel's Stack/Flex/Grid, which WordPress silently coerces).

Two spot-checks against source, both confirming genuine orphans:
- `sgs/hero` — no control for `layout`, `columns` or any `gridItem*`; the only matches in `edit.js`
  are prose comments and hero's own split-grid controls.
- `sgs/site-header` — declares 10 `shapeDivider*` attributes, has zero controls for them, and no
  theme pattern sets them. It paints `section`, so the renderer would emit them; a client has no way
  to ask for one.

---

## 5. Corrections to the record

| Claim | Source | Truth |
|---|---|---|
| "16 live mounts — layout ×10, content ×6" | wrapper's own comment | **17 — layout ×12, content ×5** |
| "4 variant-bearing consumers (hero, product-card, testimonial, trust-bar)" | plan §1.4 | **3** — `sgs/testimonial` dropped the wrapper under D294; `nav-drawer` never had it |
| "31-block roster" | Spec 31 §13.6, twice | prose snapshot; the mount count is 25 |
| "`container_kind` disagrees with paint on 3 of 8" | this workstream, mid-QC | **wrong** — 2 of 3 correct by design; only `physics-canvas` is real |

---

## 6. The instrument

- `scripts/surveys/survey-wrapper-capability.js` — census driver
- `scripts/surveys/lib/php-kind-consumption.js` — branch-aware PHP consumption analyser
- `scripts/surveys/lib/wrapper-capability-selftest.js` — 23 assertions, positive **and** negative
  control per rule
- One-line change to `check-shared-panel-schema.js`: a `require.main === module` guard so
  `findMounts` is importable. `--check` and `--self-test` behaviour unchanged (both still exit 0).

**Not a grep.** All mount detection delegates to `findMounts`, which blanks comments first. A grep
for the component name produced 8 false consumers during this very session — every one a comment —
which is the fourth instance of that error in this repo.

### Signatures encoded in the analyser

Each was a wrong answer the analyser actually produced, then fixed and locked with a fixture:

1. **Path-sensitivity** — unguarded plumbing lines re-widened the mask; `minHeight` read as all-kinds.
2. **Guard-carrying variables** — `$has_responsive_min_height = $is_section && …` gates a block with
   no `$is_*` in sight.
3. **Boolean-flag cut-off** — taint through a flag tracks *control* influence, not where a value
   paints.
4. **Flag-as-effect** — a boolean attribute's whole semantic *is* the flag (`bgKenBurns`).
5. **Ternary ≠ flag** — a ternary containing `||` yields a value, not a flag.
6. **Append is paint** — `$css .= '…' . $value` is where a value becomes output.

**Proven able to fail:** `--self-test-demonstrate-failure` registers an injected failure; and a real
break was injected into `class-sgs-container-wrapper.php:759` (removing the `$is_section` guard) —
the analyser flagged it, exit 1, and the revert was confirmed against `git status`.

### Known holes, named not hidden

- **2 unresolved computed-key reads** in the wrapper PHP (`:2228`, `:2230` — `$attributes[$sgs_attr]`).
  Reported by the tool, not silently counted as absent.
- **`src/blocks/extensions/*.js` is outside the consumption corpus.** If a wrapper attr's only
  consumer is an extension, static analysis reads it as unconsumed.
- **Selector existence is not checked** — an attribute can be read and emitted onto a selector the
  block's DOM never renders.
- **Negation never narrows** (`! $is_section` widens to all kinds). Deliberate: a wrong narrowing
  silently deletes a real consumer, so doubt widens.

---

## 7. What is NOT done

**The live calibration pass has not run.** Its purpose is not to verify the matrix cell-by-cell but
to hunt for cases the static rules got wrong, on an adversarial sample — one consumer per kind, the
3 variant-bearing consumers, and every uncertain cell, each opened **unset as well as set**. Every
disagreement found becomes a new signature plus a fixture, so no later phase repeats it.

**Per-variant resolution is not implemented.** The variant-bearing consumer set is confirmed as
hero / product-card / trust-bar, but controls are not yet resolved per variant value.

---

## 8. Recommendation

Phase 0's static half answers the question the decomposition needed: **capability is not dead, it is
unreachable.** The wrapper renders nothing wasted; 7 blocks paint a surface their editor never
offers, and 61 attributes sit declared-and-paintable with no control at all.

The groupings decision (Phase 1) can be made on this. My recommendation is to run the live
calibration pass **before** Phase 2 removes anything — its findings change which attributes are safe
to touch, not which groupings make sense.
