---
doc_type: report
block: sgs/option-picker
generated: 2026-06-03
verdict: PASS
first_paint_capture_passed: true
canary_page: /cart-increment-test/ (page 514, via content-collection)
---

# Visual diff — sgs/option-picker (WCAG selected-pill contrast fix)

## verdict: PASS
## first_paint_capture_passed: true
SSR-safe radio group; default pill checked on load; CSS `:checked` drives the selected state (no-JS safe).

## Evidence (live, canary)
- **Selected-pill contrast (WCAG §1.4.3):** computed selected-pill text on Mama's pink = `rgb(58,46,38)` on `rgb(230,138,149)` = **5.28:1 PASS** (was white 2.49:1 FAIL). The `--sgs-op-sel-text` default now resolves to `foreground` (framework teal default = 5.09:1 PASS); Mama's variation sets dark via the wp_global_styles post.
- **Resting pill:** dark border on light bg, clearly visible; 44px touch target; `flex-wrap` works at 375px.
- **Override mechanism:** pill colours are overridable vars (`--sgs-op-*`) set by the block's colour controls — raw hex accepted.

## Review
QC-council finding A1 fixed; framework-default + Mama's-override contrast both verified. block.json 0.1.4. No save() change.
