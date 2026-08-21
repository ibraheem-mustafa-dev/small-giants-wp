---
verdict: PASS
intent_capture_passed: true
date: 2026-08-21
scope: 49 blocks — inline sanitiser closures replaced with the shared helpers
---

# Shared-sanitiser adoption — equivalence proof in place of per-block captures

## What changed

`$sgs_css_length` / `$sgs_css_keyword` / `$sgs_box_shorthand` closures deleted from 49
`render.php` files; every call site rewritten to `sgs_css_length_sanitise()` /
`sgs_css_keyword_sanitise()` / `sgs_box_object_shorthand()` in `includes/helpers-box.php`.

## Why there is no before/after capture

The visual-diff gate correctly refused to auto-skip this: `check-markup-neutral.py` treats any
non-comment deletion as NOT-NEUTRAL, and it cannot know that the deleted closure and the
function replacing it are the same code.

A screenshot pair would be **weaker evidence than what is offered here**. A capture shows one
rendered state; it cannot show that two implementations agree across the input domain. So the
claim is proven by **execution** instead.

## The proof

Both implementations were run side by side over a corpus and compared byte-for-byte:

- **34 inputs**, including the cases where a naive sanitiser would plausibly diverge:
  `''`, `'0'`, `'10'` (bare number), `'-10px'` (sign), `'calc(100% - 20px)'`,
  `'clamp(1rem,2vw,3rem)'`, `'var(--x)'`, `'16px 12px'` (multi-value), `'  8px  '` (whitespace),
  `'12px;color:red'` and `'<script>'` (injection), plus `null`, `false` and integer `0`/`12`
  for type coercion.
- **7 box shapes**, including empty, partial, all-four, and mixed `null`/`false`/`0` sides.
- **Result: every input produced byte-identical output. Zero differences.**
- **Negative control:** comparing the length closure against the *keyword* helper DOES report a
  difference, proving the harness can fail rather than passing vacuously.

Source bodies were additionally verified byte-identical before the change: all 52 `css_length`
bodies are one string, all 38 `css_keyword` bodies are one string.

## What this does NOT cover

It does not migrate to the hardened `sgs_css_length_value()`. That function has four real
behaviour deltas (bare `10` becomes a spacing-preset var; `-10px` keeps its sign where the
current code silently strips it; `calc()` survives where it currently corrupts; `16px 12px`
keeps its space). That is a separate change needing its own visual evidence —
`helpers-css-safety.php`'s own header already calls it a separate task.

## Other verification

- `php -l` clean on all 49 files.
- Full ~55-gate `prebuild` chain green; `check-block-asset-targets` 0 missing.
- Carved out untouched: 8 files / 21 corner-keyed closures, incl. `before-after`'s untyped
  radius closure that is called with a raw `null`.
