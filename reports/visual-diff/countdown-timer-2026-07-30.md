---
doc_type: reference
title: "Visual-diff report — sgs/countdown-timer number/label colour no-inline migration"
block: sgs/countdown-timer
date: 2026-07-30
wave: "FR-32-4 (D345) no-inline rollout — remaining sites batch"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/countdown-timer — `--sgs-countdown-number-colour` / `--sgs-countdown-label-colour` moved from inline to scoped rule

**Verdict: PASS.** Live capture confirms the block root carries NO `style` attribute, and
both custom properties resolve correctly via the block's own scoped `<style>` rule.

## What changed
`plugins/sgs-blocks/src/blocks/countdown-timer/render.php`:
- Line 222: `$scoped_css[] = "{$root_sel}{--sgs-countdown-number-colour:" . sgs_colour_value( $number_colour ) . ';--sgs-countdown-label-colour:' . sgs_colour_value( $label_colour ) . ';}';`
  — both custom-property VALUES now land in the block's scoped `<style>` tag (same
  mechanism as every other §B-contract property on this block: padding, margin, border).
- The old `'style' => '--sgs-countdown-number-colour:' . esc_attr( sgs_colour_value( $number_colour ) ) . ';--sgs-countdown-label-colour:' . esc_attr( sgs_colour_value( $label_colour ) ) . ';'`
  entry inside `$root_attr_args` (fed to `get_block_wrapper_attributes()`) is deleted —
  no `style` key is passed to the wrapper-attributes call at all.

### Before (pre-fix, retired code)
```php
$root_attr_args = array(
    'class' => implode( ' ', $classes ),
    'style' => '--sgs-countdown-number-colour:' . esc_attr( sgs_colour_value( $number_colour ) ) . ';--sgs-countdown-label-colour:' . esc_attr( sgs_colour_value( $label_colour ) ) . ';',
);
```

### After (current worktree code)
```php
$scoped_css[] = "{$root_sel}{--sgs-countdown-number-colour:" . sgs_colour_value( $number_colour ) . ';--sgs-countdown-label-colour:' . sgs_colour_value( $label_colour ) . ';}';
...
$root_attr_args = array(
    'class' => implode( ' ', $classes ),
);
```

## Live evidence
- **URL:** `https://sandybrown-nightingale-600381.hostingersite.com/sgs-gate-canary/`
  (no dedicated f3-oracle canary exists for this block — confirmed 404 at
  `/f3-oracle-sgs-countdown-timer/` — the block instance on the gate-canary page was used
  instead; it carries non-default number/label colours, which exercises the exact code
  path that changed).
- **Method:** Playwright, `getAttribute('style')` + `getComputedStyle(el)` on
  `.wp-block-sgs-countdown-timer`, at 1440px and 375px viewports.
- **Result (both viewports, identical):**
  root element `class="sgs-countdown sgs-cd-aff15c7c sgs-countdown--elevated sgs-countdown--digit-simple wp-block-sgs-countdown-timer"`,
  `styleAttr: null`. Computed `--sgs-countdown-number-colour: #cc0066`,
  `--sgs-countdown-label-colour: #006644` — non-default values, proving the scoped rule
  (not a CSS default) is what's supplying them.

## Limitation
None. Single block instance on the canary was sufficient — the change is a root-level
singleton property (not per-item), so one clean sample at both viewports fully exercises it.
