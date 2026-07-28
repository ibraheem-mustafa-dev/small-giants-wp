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

## Re-verify after 7f4f399a (2026-07-28, same session, later pass)

Fix commit 7f4f399a deployed to sandybrown canary.

1. Hard-reloaded draft page 1849 — 0 console errors.
2. Located plan 1's CTA link ("Edit link" on the existing `example.com/pricing-plan1` chip), clicked it, expanded "Advanced" — **"Open in new tab" now renders** alongside nofollow/sponsored.
3. Toggled it ON via the checkbox — 0 console errors.
4. Clicked "Apply" — 0 console errors.
5. Read plan 1's attributes from the `core/block-editor` data store: `{ ctaTarget: "_blank", ctaRel: "noopener", ctaUrl: "https://example.com/pricing-plan1" }` — confirms `ctaRel` correctly gained `noopener`.
6. Saved draft, hard-reloaded the editor — 0 console errors.
7. Re-read the data store post-reload: **identical values persisted** — `ctaTarget: "_blank"`, `ctaRel: "noopener"`, `ctaUrl: "https://example.com/pricing-plan1"`.
8. Screenshot captured: `reports/visual-diff/pricing-table-reverify-newtab-2026-07-28.png`.

Console errors observed during re-verify: **none**.

Note: the pre-existing currency mojibake (`Â£9` etc.) remains unfixed — still out of scope for this re-verify, flagged separately above.

## Verdict

verdict: PASS

- 3 default plans render: PASS
- CTA link set + persisted: PASS
- No crash / no block-caused console errors: PASS
- New-tab toggle: PASS (control renders, toggles, persists with `ctaTarget=_blank` + `ctaRel=noopener`, re-verified after 7f4f399a)
- Pre-existing currency-encoding defect still present (out of scope, not fixed, not gating this verdict)

first_paint_capture_passed: true
