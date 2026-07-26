# Visual-diff report — row-behaviour guardrails + editor preview (Spec 37 P2 follow-ups)

**Date:** 2026-07-26
**Covers:** the five follow-up items recorded as NOT done when per-row shrink was fixed.

## Honest status

`render.php` is **untouched** in this change set. Front-end rendered output is therefore
byte-identical. What DOES change visually is the **block editor preview**: a header/footer
row now shows its own padding in the editor canvas, where previously the preview ignored
padding entirely. No rendered visual diff was executed; this report says so plainly.

## Item-by-item

### 1. Gate on `assets/css/` — BUILT
New `scripts/check-shared-css-state-rules.js`, wired to the END of the `prebuild` chain.
It flags a **size property set to a fixed literal on a state-only selector when nothing in
the same file sets that property's resting value on the base selector** — a rule that
cannot know what it is changing FROM. That is precisely the defect that shipped: an
absolute shrunk `padding-block` in a shared stylesheet overriding every row's own resting
padding.

The rule deliberately does NOT fire on the legitimate both-ends pattern
(`body.sgs-header-behaviour-shrink` sets resting AND shrunk), and comment bodies are
stripped before parsing so the bad rule quoted as a warning inside a doc-comment is not
flagged.

**Verified by regression injection, independently re-run:** clean tree → `0 findings`,
exit 0. Bad rule re-inserted → caught at the correct line, exit 1. Restored →
`git diff --stat` empty (byte-identical), `0 findings`, exit 0.
Baseline file starts EMPTY and requires a `reason` per entry.
No true positives found in `contrast.css` or `extensions.css`.

### 2. 44px touch-target floor — NOT NEEDED, measured not assumed
The council's concern was that halving a row's padding could push an interactive child
under the 44px WCAG target. **Measured live on the canary** with the row at 48px → 24px:
all 5 interactive children were byte-identical in size before and after
(`anyTargetChanged: false`); nav items held 44px throughout.

The reason is structural: a row's padding sits **outside** its children, so reducing it
moves children closer to the row's edge but cannot change their height. Children carry
their own minimums (`nav-menu/style.css:43,83`; `site-header-row/style.css:36`).
**No floor built** — it would have been code defending against an impossible failure.

### 3. Footer parity — VERIFIED LIVE
Previously claimed only by code-path similarity. Now measured on the real active footer
(CPT 1654; note the obvious-looking "Proof Footer" 1571 is NOT the active one —
`sgs_active_footer_cpt_id` = 1654): top row **60px → 30px** on scroll, left/right held at
20px, and the sibling `columns` and `bottom` rows completely unaffected.

### 4. Non-sticky header warning — BUILT
A row inside a header that is not pinned now shows a warning when a scroll effect (shrink
or hide-on-scroll) is switched on: the effect fires just as the row leaves the screen, and
its only lasting result is nudging the page content.

Reads `headerSticky` from the `sgs/site-header` ancestor via
`getBlockParentsByBlockName`. Tri-state on purpose: `true` → no warning, `false` → warn,
`null` (no header ancestor, i.e. a FOOTER row) → no warning, because the question does not
apply there.

### 5. Editor preview — BUILT (scoped)
Two changes, both editor-only:
- The row preview now reflects the row's own desktop-tier padding. Previously it showed
  none, so an operator could see neither their spacing nor what shrink would do to it.
- A **"Show me the shrunk size"** toggle (shown only when shrink is on AND the row has
  padding) previews the row at its scrolled size in place, using the same 0.5 ratio
  render.php emits. Local React state — never persisted, never sent to the front end.

This is deliberately NOT the full "preview scroll behaviour" feature (side-track B2, which
opens the live front end pre-scrolled). It is the cheap in-place answer to "the client sees
literally nothing"; B2 remains the richer, separate win.

## Verified

`npx wp-scripts build` green; `check-dead-controls.js` 0 net-new across 81 blocks;
`check-shared-css-state-rules.js` 0 findings.

## Still outstanding

- The editor Notices and the preview toggle have **not yet been observed in a live editor**
  at the time of writing — build-green only. (Live editor confirmation follows the deploy;
  if it is not recorded in the LEDGER/plan, treat it as unverified.)
- Footer rows get no "non-sticky" warning by design. A footer row is reached by scrolling,
  so a scroll-linked shrink there is near-permanently in its shrunk state — arguably its
  own usability question, not covered here.
