---
block: sgs/option-picker
date: 2026-06-04
unit: Spec 27 Phase 2 — B2 swatches + I2 auto-contrast (theme thread)
verdict: PASS
first_paint_capture_passed: true
canary: https://sandybrown-nightingale-600381.hostingersite.com/sgs-configurator-test-540/ (fixture 540)
note: built ON TOP of the cloning thread's WS-4 wrapper-mirror (commit 0ad389b0) — SGS_Container_Wrapper::render() preserved; additive only.
---

# option-picker B2 swatches + I2 auto-contrast — visual-diff PASS

## What changed
- `render-helpers.php`: `sgs_wcag_relative_luminance()` + `sgs_wcag_text_colour_for_bg()` (build-time WCAG luminance → #000/#fff auto-contrast).
- `option-picker/render.php`: additive swatch rendering — colour chip / image swatch / plain-text (unchanged) per option, gated on `_sgs_swatch_color` / `_sgs_swatch_image_id` term_meta. WS-4 `SGS_Container_Wrapper::render()` wrapper preserved (line 383).
- `option-picker/style.css`: new `.sgs-option-picker__swatch*` selectors (additive); version 0.1.5→0.1.6.
- `configurator-term-fields.php` (new): swatch authoring fields on WC attribute term screens (manage_woocommerce cap + nonce + sanitize_hex_color/absint).

## Live verification (canary 589, fixture 540)
- **12 colour chips** on the flavour picker; each pill = chip + label text (colour never sole indicator, WCAG 1.4.1).
- **Auto-contrast correct**: vanilla `#f3e5ab`→`#000`, chocolate `#5c4033`→`#fff`, strawberry `#fc5a8d`→`#000` (per-pill `--sgs-op-swatch-text`).
- **axe-core: 0 violations** (wcag2a/2aa/21a/21aa/22aa) on `.product-card--bound`.
- **44px**: 0 of 16 pills under 44×44px.
- **Radiogroup intact**: 16 radio inputs; legend preserved.
- **Availability interaction holds**: default 12-pack → 12-pack+coffee OOS combo greys correctly alongside swatches.
- **Console**: only a pre-existing favicon 404 (not a regression).

## Additive-safety (page-144 Typed clones)
Typed pickers use a `typeKey` with no matching `pa_*` taxonomy → `$swatch_taxonomy=''` → swatch map never built → plain-text pills byte-identical. Pixel-diff baseline preserved.

## Evidence
- `b2-swatches-pickers-2026-06-04.png` (12 chips + auto-contrast + OOS grey-out).
