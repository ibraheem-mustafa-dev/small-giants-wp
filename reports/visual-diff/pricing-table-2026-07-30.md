---
doc_type: reference
title: "Visual-diff report — sgs/pricing-table per-plan ribbon-colour no-inline migration"
block: sgs/pricing-table
date: 2026-07-30
wave: "FR-32-4 (D345) no-inline rollout — remaining sites batch"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/pricing-table — `--sgs-pt-ribbon-bg` — VERIFIED LIVE ON A NEW CANARY INSTANCE

**Verdict: PASS.** A new canary page (`sgs-gate-canary-2`, page ID 2071) was built with a
`sgs/pricing-table` instance carrying 3 plans, the first non-highlighted and carrying
`ribbonText:"Limited offer"` + `ribbonColour:"success"`, so `.sgs-pricing-table__ribbon`
renders on that plan. Captured live via Playwright at 1440px and 375px: no `style` attribute,
correct computed value.

## What changed
`plugins/sgs-blocks/src/blocks/pricing-table/render.php` (inside the plan loop, now keyed by
`$plan_index`):
```php
// Before
$ribbon_style = $plan_ribbon_colour
    ? ' style="--sgs-pt-ribbon-bg:' . $colour_val( $plan_ribbon_colour ) . '"'
    : '';
$ribbon_html  = sprintf(
    '<div class="sgs-pricing-table__ribbon"%s>%s</div>',
    $ribbon_style,
    esc_html( $plan_ribbon_text )
);

// After
if ( $plan_ribbon_colour ) {
    $responsive_css .= $root_sel . ' .sgs-pricing-table__grid .sgs-pricing-table__plan:nth-child(' . ( (int) $plan_index + 1 ) . ') .sgs-pricing-table__ribbon{--sgs-pt-ribbon-bg:' . $colour_val( $plan_ribbon_colour ) . ';}';
}
$ribbon_html = sprintf(
    '<div class="sgs-pricing-table__ribbon">%s</div>',
    esc_html( $plan_ribbon_text )
);
```
`ribbonColour` varies per plan (plan-array data), so it's routed to a `:nth-child(N)` scoped
rule keyed by the plan's 1-based position among ALL plan cards — every plan renders its
`.sgs-pricing-table__plan` wrapper unconditionally, so the position is stable regardless of
which specific plans show a ribbon.

## Canary instance
`https://sandybrown-nightingale-600381.hostingersite.com/sgs-gate-canary-2/` (page ID 2071),
block markup:
```
<!-- wp:sgs/pricing-table {"plans":[{"name":"Basic","price":"£9/mo","ribbonText":"Limited offer","ribbonColour":"success"},{"name":"Pro","price":"£19/mo"},{"name":"Enterprise","price":"£49/mo"}],…} /-->
```

## Evidence
- **Element found live:** `.sgs-pricing-table__ribbon` renders on plan 1 ("Basic") with text
  "Limited offer".
- **No-inline contract holds:** `element.getAttribute('style')` === `null` at both 1440px and
  375px.
- **Computed value correct:** `getComputedStyle(el).getPropertyValue('--sgs-pt-ribbon-bg')` ===
  `"#2e7d4f"` at both viewports (the theme's resolved `success` token — the CSS rule stores
  `var(--wp--preset--color--success)`, which the browser resolves on read).
- **CSS lands in the LIFTED stylesheet, not inline `<style>` on the page** — fetched
  `wp-content/uploads/sgs-css/sgs-1003-175717f0a7396f78658cc3d7873ff1fd.css` and confirmed:
  ```css
  .sgs-pricing-220973d1.wp-block-sgs-pricing-table .sgs-pricing-table__grid .sgs-pricing-table__plan:nth-child(1) .sgs-pricing-table__ribbon{--sgs-pt-ribbon-bg:var(--wp--preset--color--success);}
  ```
- **Method + tooling:** `plugins/sgs-blocks/scripts/gate-canary-2-capture.mjs` (Playwright,
  run via `node`, chromium headless).

```json
{
  "block": "pricing-table",
  "selector": ".sgs-pricing-table__ribbon",
  "prop": "--sgs-pt-ribbon-bg",
  "viewport": "1440",
  "found": true,
  "styleAttr": null,
  "computedValue": "#2e7d4f"
}
```
(identical result at `"viewport": "375"`.)

## Side finding — NOT part of this fix, flagging for a separate ticket
While building the canary markup, a `plans[].highlighted` boolean value (matching the block's
OWN default plans array, which uses `"highlighted": false`/`true`) silently dropped the ENTIRE
`plans` attribute back to the block.json default ("Starter"/"Professional"/"Enterprise") when
saved via `wp post create`. Root cause: `block.json`'s `attributes.plans.items.properties`
declares `"highlighted": { "type": "string" }` — a type MISMATCH against the boolean values
used in the same file's own `default` plans array and consumed by `render.php`. WordPress's
attribute-schema validation (`WP_Block_Type::prepare_attributes_for_render` →
`rest_validate_value_from_schema`) rejects the whole `plans` array on a type mismatch and
falls back to the schema default, silently. Worked around here by omitting `highlighted` from
every plan object in the canary (falls through render.php's own `?? false`). Not fixed as part
of this no-inline migration — it's an unrelated schema-declaration bug, out of scope for
FR-32-4. Recommend a follow-up: correct `plans.items.properties.highlighted` to
`"type": "boolean"` in `plugins/sgs-blocks/src/blocks/pricing-table/block.json`.
