---
block: product-card
date: 2026-07-11
verdict: PASS
first_paint_capture_passed: true
method: live computed-style + matched-rule enumeration on sandybrown page 8 (cache-cleared)
---

# Visual-diff — product-card CTA (Fix 2, page-8 programme) — 2026-07-11

**Block:** `sgs/product-card` (typed clone CTA)
**Change:** converter style-preset mirror + composite-mirror colour + editor merge (D310)
**Canary:** sandybrown page 8 (Mama's Munches homepage). Draft = `sites/mamas-munches/mockups/homepage/index.html`.
**Method:** live computed-style (cache-cleared) vs the draft's `.sgs-button--{primary,secondary}` rules. NOT the computed-parity % (STOP-PARITY-NOT-A-MEASURE).

## Before (baseline, live-measured pre-fix)
| CTA | class | text colour | bg | WCAG | defect |
|---|---|---|---|---|---|
| Featured | `sgs-button--primary` | rgb(255,250,245) near-white | #E68A95 pink | **~2.1 FAIL** | white text on pink |
| Trial | `sgs-button--primary` (WRONG) | near-white | pink | FAIL | should be `--secondary` |

Root cause (proven live): converter never emitted `ctaStyle` (grep=0) → both defaulted to `--primary`; the per-instance `.{uid} .sgs-product-card__cta--primary{color:text-inverse}` rule (from the `ctaColourText` default) clobbered the correct dark `--sgs-btn-color`. Editing `style.css` L246 (the register's target) would NOT have landed — that rule loses by source order.

## After (LANDED, live computed-style, cache-cleared)
| CTA | class | text colour | own bg | border | WCAG |
|---|---|---|---|---|---|
| Featured | `sgs-button--primary` | rgb(58,46,38) dark | rgb(230,138,149) solid pink | pink | **5.28 PASS** |
| Trial | **`sgs-button--secondary`** | rgb(58,46,38) dark | **rgba(0,0,0,0) transparent** | rgb(197,106,122) pink | **11.86 PASS** |

## Draft parity
- Draft `.sgs-button--primary` = `background:var(--primary); color:var(--text); border-color:var(--primary)` → solid pink / dark / pink. **Featured matches.**
- Draft `.sgs-button--secondary` = `background:transparent; color:var(--text); border-color:var(--primary)` → transparent / dark / pink. **Trial matches.**

## What changed
- **Converter (`walk.py` + `db_lookup` + `assembly` refactor):** the nested CTA's BEM `--modifier` lifts onto the composite's `ctaStyle` — the SAME `preset_style_for_element` mechanism a standalone `sgs/button` uses for `inheritStyle` (Spec 31 §13.5; R-31-9 universal; new `style_preset_attrs_for_identity` surfaces the behaviour-role style attr `content_attrs_for_identity` excludes). Regression test added.
- **Colour (block.json):** all 6 `ctaColour*` preset defaults emptied → a preset CTA injects no explicit colour and inherits the shared `sgs-button--{style}` class channel per variant (composite-mirror; STOP-D228 injected-default removal). WCAG-correct per client.
- **Editor (edit.js + render.php):** `ctaPreset` attr + the duplicate "Apply preset" control removed; one `ctaStyle` picker (seeds colours on change) + a "Reset colours to preset" button; dead `data-cta-preset` emits dropped.

## Gates
- Converter suite 448 pass / 1 skip (+ new `test_real_draft_cta_style_preset_mirrors_the_nested_button_modifier`).
- Build green (dead-control 0 net-new, hardcoded-render 0 net-new, webpack OK).
- Reclone: anti-mirror cheat gate PASS, pipeline-stage-gate PASS, wp-blocks valid.
- Bean's eye: pending sign-off.
