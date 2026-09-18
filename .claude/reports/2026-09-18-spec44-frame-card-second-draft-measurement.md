# Classless recognition — Spec 44 item 3: Frame Card second-draft generalisation measurement

Spec 44 (`.claude/specs/44-CLASSLESS-REPEATER-RECOGNITION.md`), FR-44-1 + §7. This is Spec
44 completion register item 3 — proving the classless-recognition pipeline generalises
beyond the single draft (Eye Care Birmingham) every prior measurement (D1088, D1094, Front
C Task 3/4) has ever run against. Target: `sites/eye-care-ward-end/design_handoff_ward_end_
eye_care/Frame Card.dc.html`.

## Headline figures — directly comparable to D1094's Eye Care Birmingham baseline

| Draft | Total repeated groups (`<sc-for>`) | Auto-completed | Review queue | No match |
|---|---|---|---|---|
| Eye Care Birmingham (D1094 baseline) | 39 | 0 | 2 | 37 |
| Frame Card (this run) | **1** | **0** | **0** | **1** |

A single-group sample is the correct, honest outcome for this draft — it is not a sign
anything failed. The task brief anticipated exactly this ("a THIN sample, likely 1
repeater group... a small proof of generalisation is the correct, honest outcome here").

**Real `<sc-for>` count, stated not assumed:** `soup.find_all("sc-for")` found **1** real
element. A prior grep for the literal string `"sc-for"` found 2 hits — that count double-
counted the SAME group's opening (`<sc-for list=...>`) and closing (`</sc-for>`) tags, not
two separate groups. Verified directly: `grep -n "sc-for" "Frame Card.dc.html"` returns
exactly two lines, 58 and 60, bracketing one element. The element-count method (matching
D1088's own correction of the spec's "34"→"35" Birmingham figure) is the number to trust.

## The one group, in full

```html
<sc-for list="{{ p.colsShown }}" as="c" hint-placeholder-count="3">
  <button onClick="{{ c.pick }}" aria-label="{{ c.name }}" title="{{ c.name }}"
          style="width:17px;height:17px;border-radius:50%;padding:0;
                 background: {{ c.hex }};border:1px solid #D8D2C8;
                 box-shadow: {{ c.ring }};transition:transform .2s"
          style-hover="transform:scale(1.25)"></button>
</sc-for>
```

Real decision row (from the isolated test log, `frame-card-scfor-00`):

- **Outcome:** `no-match` (stage `none`, quality `none`)
- **Stage A:** ambiguous across `sgs/form`, `sgs/nav-bar-menu`, `sgs/nav-drawer-menu`
- **Stage B:** ambiguous across `sgs/brand-strip.logos`, `sgs/card-grid.items`,
  `sgs/choice-flow-question.options`, `sgs/form-field-tiles.tiles`, `sgs/gallery.mediaItems`,
  `sgs/icon-list.items`, `sgs/pricing-table.plans`, `sgs/process-steps.steps`,
  `sgs/product-card.colourSwatches`, `sgs/social-icons.icons`, `sgs/trust-bar.items`
- **Reason:** "leaf shape is indistinguishable across surviving candidates" — DB-fact
  elimination narrowed the field but never reached one candidate, and no field-level
  resolution ran (correctly — Stage B never auto-completes; see the module docstring).

The semantically correct answer is visible to a human at a glance —
`sgs/product-card.colourSwatches` sits right there in the Stage B ambiguity list, and the
markup (`c.hex`, `c.ring`, `c.pick`, circular swatch buttons) is a textbook colour-swatch
picker. The pipeline correctly declines to guess between it and ten structurally similar
repeater candidates rather than false-positive auto-completing on a lucky leaf-shape match
— exactly FR-44-1's designed behaviour when identity genuinely cannot be resolved from
structure alone, not a defect.

## Structural differences vs Eye Care Birmingham's 39 groups

Birmingham's repeaters (real examples: `ticker`, `megaStyles`, `megaShopBy`,
`megaTopBrands`, `megaAllBrands`, `megaLensItems`, `marquee`, `featured`, `reasons`,
`shapeTiles`) are overwhelmingly **top-level or one-level-deep content repeaters** —
navigation menu items, brand logo strips, product cards, icon+text reason tiles — whose
leaf content is composite (image + text spans, or link + label) and largely
non-interactive at the leaf.

Frame Card's single group exercises a shape none of Birmingham's 39 groups do:

1. **Nesting depth.** The group sits three levels inside a non-repeating parent card
   (price row → colour-swatch row → `sc-for`), not near the document's structural
   top level.
2. **Leaf is a single interactive control, not a composite.** The repeated element is one
   bare `<button>` — no nested `sc-if`/`sc-for`/text node children at all — carrying an
   event-handler binding (`onClick="{{ c.pick }}"`) and TWO separately computed inline
   style bindings (`background: {{ c.hex }}`, `box-shadow: {{ c.ring }}`), plus a
   `style-hover` pseudo-attribute for a hover-state transform. Birmingham's groups never
   bind an event handler or a computed `box-shadow` inside their repeated leaf.
3. **It sits inside a card, not IS the card.** Birmingham's `featured` group repeats
   whole product cards; Frame Card's group is a repeater INSIDE one already-singular card
   instance (the card itself is not repeated in this file — it's a standalone component
   mockup), so this run never exercises card-level repetition at all, only a sub-widget
   repeater nested inside one.

None of these differences broke the pipeline — Stage A/Stage B both ran to completion and
produced a real, correctly-conservative ambiguous result. They are useful evidence that
the pipeline's candidate-narrowing logic (DB-fact elimination, leaf-shape comparison) holds
up structurally on a shape it was never tuned against, even though this single thin sample
cannot by itself prove auto-completion works correctly on a SECOND draft (Birmingham is
still the only draft that has ever produced an auto-completed or review-queue outcome).

## Isolation verification

- Real audit log (`classless-recognition-log.jsonl`) BEFORE: mtime=1789671974.640543, 117 line(s)
- Real audit log AFTER: mtime=1789671974.640543, 117 line(s)
- **Untouched: True**
- This run's rows were written to the isolated test log instead: `C:\Users\Bean\Projects\small-giants-wp\.claude\reports\2026-09-18-spec44-frame-card-test-log.jsonl`
- Isolated client slug used: `eye-care-ward-end-frame-card-test` (never the real `eye-care-ward-end`)
