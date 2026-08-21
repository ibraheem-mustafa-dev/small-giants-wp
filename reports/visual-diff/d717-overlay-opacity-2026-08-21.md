---
verdict: PASS
intent_capture_passed: true
source_sha: NOT-COMPUTABLE-SEE-BELOW
commit: 88d7cf14
date: 2026-08-21
blocks: container, cta-section, hero, multi-button, physics-canvas, site-footer, site-header, trust-bar
---

# D717 — overlay opacity restored, alpha retired

## ⚠ Read the `source_sha` field honestly

It is **not** a real hash and this report **will not and should not satisfy the visual-diff
gate**. `visual-report-sha.py` hashes the *staged* bytes of a block's `src/` directory; this
report was written after `88d7cf14` was committed, so there are no staged block files to hash
and no valid value exists. The commit went in under the scoped, logged bypass
(`reports/visual-diff/manual-skips.log`) because capture requires the deployed build and
`build-deploy.py` refuses a dirty tree (D336) — the code had to be committed before it could be
captured.

This file is therefore an **evidence record**, not a gate token. A future commit touching any of
these eight blocks must produce its own report; this one cannot wave it through, and it would be
wrong if it could.

## Why before/after doesn't apply

The opacity control did not exist before this change and the overlay had no opacity declaration
to diff against. The meaningful question is not "what moved" but "does the current rendered
output match what was intended" — plus one behavioural assertion (token survival) that a paint
diff cannot see at all.

## Assertions, stated before measuring

1. Picking a palette swatch on the overlay colour row stores the palette **slug**, not a hex.
2. The colour row offers **no alpha slider**.
3. An `Overlay opacity` control appears, 0–100, defaulting to 30.
4. Both values survive a save + reload.
5. The wrapper's `.sgs-container__overlay` paints the chosen opacity, with the colour resolved
   from the palette token.
6. `sgs/hero`'s own `.sgs-hero__overlay` — a **separate paint site**, since hero passes
   `no_overlay => true` — does the same.
7. Neither overlay carries an inline `style` property declaration (Spec 32).

## Live results — sandybrown canary, page 2596, cache-busted

**Negative control first, against pre-fix deployed code.** Inserted an `sgs/container`, opened
Styles → Background → overlay, clicked the client's own **Primary** swatch. Stored value:
`#e68a95` — a raw hex, alpha never touched. **The control was genuinely RED**, confirming the
unlink is unconditional rather than alpha-triggered as the brief described.

| # | Assertion | Measured | |
|---|---|---|---|
| 1 | Slug stored | same gesture, post-fix → `"primary"` | PASS |
| 2 | No alpha UI | no `.components-color-picker` / alpha input in the popover | PASS |
| 3 | Opacity control | `input[type=range]` "Overlay opacity", min 0 max 100, value 30 | PASS |
| 4 | Survives reload | set 45 → save → reload → `primary` / `45`, `isValid: true` | PASS |
| 5 | Container paints | `opacity: 0.45`, `background-color: rgb(230,138,149)` = `--wp--preset--color--primary` (`#e68a95`) | PASS |
| 6 | Hero paints | `accent` / 25 → `opacity: 0.25`, `rgb(245,208,80)` = `--wp--preset--color--accent` (`#f5d050`) | PASS |
| 7 | No inline style | `getAttribute('style')` → `null` on **both** overlay spans | PASS |

Zero console errors throughout.

## One reading correction worth recording

The first post-fix swatch click stored `""`, which looks like a failure. It is a **deselect**:
with `linked` now on, the stored value resolves to the palette entry, so `ColorPalette` showed
Primary as already-selected and clicking it toggled it off. Clicking again stored `"primary"`.
A pass/fail assertion read without checking the control's selected state would have called a
working fix broken.

## Not covered

Six of the eight blocks (cta-section, multi-button, physics-canvas, site-footer, site-header,
trust-bar) were **not** individually captured. They share the wrapper paint site verified at
row 5 and the panel mount verified at rows 1–4, and the attribute was confirmed present in all
eight `block.json`. That is an argument from shared mechanism, not a per-block measurement —
stated as such rather than implied.
