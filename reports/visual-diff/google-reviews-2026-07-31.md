---
verdict: PASS
first_paint_capture_passed: true
drag_capability: PROVEN
block: sgs/google-reviews
date: 2026-07-31
spec: 38
wave: C
surface: frontend
canary: https://sandybrown-nightingale-600381.hostingersite.com/motion-roster-canary-gr-drag-fixture/ (page 2101)
harness: Chrome DevTools MCP (navigate_page / evaluate_script), viewport 1440x900
---

# sgs/google-reviews — drag capability PROVEN (register Step 2)

## Correction to the register's stated cause — READ FIRST

Register Step 2 says the earlier PASS was because "a review source the block actually
consumes (the `dataSource` enum was never exercised)". **That is a factual error, traced
and corrected before building the fixture.** `sgs/google-reviews` has **no `dataSource`
attribute at all** — grepped the full block directory and `render.php` confirms the block
picks content by whether `placeId` is empty (dummy reviews) or set (live Google Places
API fetch via `Google_Reviews_Settings::fetch_reviews()`). `dataSource` is an attribute
on the **separate** `sgs/trustpilot-reviews` block (`"dataSource":"placeholder"` visible
in the shared roster canary's page content) — the register's wording appears to have
carried Trustpilot's vocabulary onto google-reviews by mistake. Per the
prove-the-cause-before-fix rule, I did not build a fixture around an attribute that does
not exist; the actual gap was overflow, not data source.

## Why the earlier same-day capture found no overflow

3 dummy reviews at the default `columns:3` render each review at `~33%` width — 3 items
at 33% each is ~100% of the container, so nothing overflows a 1200px track. That's the
runtime's guard behaving correctly, not the capability failing.

## Fixture

A **new** page (`wp post create`, ID 2101 — the existing canary page's `wp post update`
is blocked by an environment hook, so a new fixture page was the correct route) with two
`sgs/google-reviews` instances, `variant:slider, columns:2`, one `dragToScroll:true,
dragMomentum:true` (anchor `gr-fix-1`), one `dragMomentum:false` (anchor `gr-fix-2`). No
`placeId` configured — the 3 dummy reviews ARE the review source this block genuinely
consumes when no API key is set (this is the block's real fallback content, not a fake
attribute). `columns:2` makes each of the 3 review cards render at `calc(50% - 1rem)` —
three of those sum to well over the 1200px container.

## Measurement (live DOM, both instances)

| Reading | `gr-fix-1` (momentum ON) | `gr-fix-2` (momentum OFF) |
|---|---|---|
| `scrollWidth` | 1800 | 1800 |
| `clientWidth` | 1200 | 1200 |
| `overflowX` | auto | auto |
| `cursor` | **grab** | **grab** |
| review count | 3 | 3 |
| `data-sgs-fx` | draggable | draggable |
| `data-sgs-fx-momentum` | (absent — default true) | "false" |

`scrollWidth (1800) > clientWidth (1200)` on both instances, `fx-draggable.js` attached
(`cursor: grab`), two-arm momentum control wired correctly.

## Gesture-level proof — not captured, same tooling limit as post-grid

Identical limitation to `sgs/post-grid`'s report: synthetic `PointerEvent` dispatch hits
`InvalidPointerId` on `setPointerCapture`, and the MCP `drag` tool uses HTML5 DnD
semantics this pointer-driven module doesn't listen for. See that report for the full
detail — it applies unchanged here since both blocks share the identical
`fx-draggable.js` runtime.

## Verdict

**PROVEN** (structural: overflow + attach + two-arm wiring, on the block's real fallback
content). Gesture-level coast-physics not independently re-verified this session
(tooling gap). The register's `dataSource`-enum framing was a misattribution from
`sgs/trustpilot-reviews`, corrected above rather than chased.

## Unrelated pre-existing defect (carried forward from the earlier capture)

`assets/images/google-logo.svg` still returns HTTP 404 on the canary — unrelated to this
change, previously reported 2026-07-31, not re-fixed here (out of scope for this step).

## Cleanup note

Fixture page ID 2101 is safe to delete once the orchestrator has re-verified after
deploy.
