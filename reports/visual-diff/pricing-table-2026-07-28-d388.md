# sgs/pricing-table — D388 editor-canvas verification (2026-07-28)

**Change under test:** per-plan CTA now uses `SgsLinkControl`; plans gained `ctaTarget`/`ctaRel`.
**Commit:** 64999cd2, deployed to sandybrown canary.
**Test page:** draft page 1849, "spec35-wave1-d388-2026-07-28".

## What was exercised

1. Inserted `sgs/pricing-table` — canvas rendered 3 default plans (Starter / Professional / Enterprise) with the "MOST POPULAR" ribbon on Professional. No crash placeholder.
2. Located plan 1's ("Starter") CTA link field ("CTA LINK") in-canvas, under the plan's feature list.
3. Set URL `https://example.com/pricing-plan1` via the combobox, pressed Enter — applied cleanly (`example.com/pricing-plan1` shown with link chip), 0 console errors.
4. Attempted the "toggle new-tab" check — **could not be exercised**: see the shared SgsLinkControl finding below (same root cause as sgs/icon).
5. Saved draft, reloaded the editor.
6. Re-selected the block, opened plan 1's CTA — the panel confirmed `example.com/pricing-plan1` still applied (verified both via the in-canvas repeater panel text and `doc.body.innerText.includes('pricing-plan1')` → true).

## Observed defect (pre-existing, unrelated to Spec 35): currency mojibake

All 3 default plans render `Â£9` / `Â£90` / `Â£29` / `Â£290` / `Â£99` / `Â£990` instead of `£9` / `£90` etc. — a UTF-8 double-encoding bug in the block's default price strings or renderer (`Â£` is the classic mis-decoded-UTF-8 pound sign). This is a real, currently-live visual bug but is unrelated to the Spec 35 wave-1 SgsLinkControl change under test today. Not fixed as part of this dispatch — flagging for a separate maintenance pass (likely `plugins/sgs-blocks/src/blocks/pricing-table/block.json` default strings or a PHP htmlentities double-encode in render.php).

## Console

- 0 errors caused by this block at insertion, CTA-link edit, save, or reload.
- 7 warnings on insertion — all pre-existing framework deprecation notices (`36px default size ... deprecated since 6.8`, `sgs-extensions-editor-css was added to the iframe incorrectly`) unrelated to this block's changes.

## Screenshots

- `reports/visual-diff/pricing-table-3plans-2026-07-28.png` — all 3 default plans rendered, confirms the currency mojibake.
- `reports/visual-diff/pricing-table-persisted-2026-07-28.png` — plan 1 CTA link persisted after reload.

## Verdict

verdict: PARTIAL

- 3 default plans render: PASS
- CTA link set + persisted: PASS
- No crash / no block-caused console errors: PASS
- New-tab toggle: FAIL (shared SgsLinkControl bug — control absent from UI, see sgs/icon report)
- Pre-existing currency-encoding defect observed (not in scope, not fixed)

first_paint_capture_passed: true (screenshot captured; PASS reserved for full-pass blocks, not asserted here since new-tab sub-check failed)
