# Visual-diff report — core/details → sgs/accordion + sgs/accordion-item, 2026-07-16

verdict: PASS
first_paint_capture_passed: true

## Bean's decision (2026-07-16): "retarget to accordion — do that"
The `block-replacements.json` map wrongly pointed `core/details` at
`sgs/collapsible-text` (a read-more TEXT-TRUNCATION block: no title, no child
slot). `core/details` is a disclosure widget — a question that expands to an
answer — which is exactly `sgs/accordion-item` (`title` + `isOpen` + an
InnerBlocks content slot). **Map corrected:** `sgs/collapsible-text` now replaces
nothing (it's an SGS-original), `sgs/accordion-item` gains `core/details`.

## What changed
`patterns/faq-section.php`: 5 sibling `core/details` collapsed into **1
`sgs/accordion` wrapping 5 `sgs/accordion-item`** — an N→1 reshape no generic
pairing handles, so a dedicated `migrate-details-to-accordion.py` executes it.
Safe zone: **185 → 180**.

Mapping:
- each `<summary>` text → the item `title` (HTML tags stripped — the accordion
  styles its own header, so the `<strong>` wrapper is redundant)
- the content after `</summary>` (already `sgs/text` from the paragraph sweep) →
  the accordion-item's InnerBlocks child
- core `open` → `isOpen` (none set here)
- **per-detail `style.border.bottom` + `style.spacing.padding` DROPPED with
  reason, not lost:** `sgs/accordion`'s default `style:"bordered"` provides the
  item dividers and each item its own padding — the block's native equivalent of
  what the core details hand-rolled. Re-emitting the core hack would fight the
  block's own chrome.

## Live proof (canary 1490, OPcache cleared, ?ver bumped)
End-to-end interaction test (`probe-accordion.js`):
- **all 5 questions present:** true
- **answer hidden before click:** true (not in the rendered DOM — correct
  collapsed state)
- **answer visible after clicking the question:** true
- **VERDICT: PASS** — a real, working FAQ accordion.

Structure verified: 1 `sgs/accordion`, 5 `sgs/accordion-item`, 5 `sgs/text`
answers preserved, 0 `core/details` remaining. `check-dead-pattern-attrs.py`
unchanged (6 known hands-off findings). No horizontal overflow at 375/768/1440.

Screenshots: `details-to-accordion-2026-07-16-{mobile,tablet,desktop}.png`.
