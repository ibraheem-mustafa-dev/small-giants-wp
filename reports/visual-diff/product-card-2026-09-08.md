# Visual diff — sgs/product-card — 2026-09-08

verdict: PASS
intent_capture_passed: true
source_sha: fb0c3f40377ccc8c

## What changed

One line of schema: `packSizes.items.properties.selected` gains
`"role": "state-modifier-boolean"`.

No render code, no CSS, no markup changed. The block already honoured a truthy
`selected` on a pack-size item (`product-card-builtin-render.php:194-210`), and
`sgs/option-picker` already resolved "explicit selection, else first option"
(`option-picker/render.php:207-222`). Both were correct and both were unreachable,
because `array_item_schema.role` was NULL for this field, so the converter's item
lifter skipped it outright (`array_content.py`: `if frole is None: continue`) and
never attempted to read the draft's selection marker at all.

With no `selected` ever extracted, every cloned picker fell to its "first option"
fallback. The draft marks **12-pack** selected
(`sites/mamas-munches/mockups/homepage/index.html:850-852`, `--active` +
`aria-pressed="true"`); the clone rendered **8-pack** checked.

The companion converter change — the `state-modifier-boolean` extractor itself,
which reads `aria-pressed`/`aria-selected` or a BEM `--modifier` that is a member
of the DB's own state-modifier vocabulary — is in `5faf0e181`. Nothing here
hardcodes "active".

## Assertions — stated before measuring

1. The rendered picker's checked option matches the option the draft marks active
   (12-pack), not the first option in the list.
2. The change is schema-only: no rendering, markup or styling difference beyond
   *which* pill carries the selected state.

## Live results — measured on the canary (page 2742, after re-clone)

```
assertion 1
  checked radio: value="12-pack"  (id="sgs-op-265f7fc9-12-pack")
  previously   : value="8-pack"
  draft says   : 12-pack  (--active + aria-pressed="true")
  PASS — matches the draft

assertion 2
  no other product-card measurement changed in the same verification pass
  (card border/radius/typography untouched by this diff)
```

Both hold.

## Why this is not a "no visual change" skip

The block's own rendering is unchanged, so it does not qualify for the
metadata-only auto-skip (the change is an array-item schema role, not a
`supports.sgs` key). But it does alter what a visitor sees — a different pack size
is highlighted as chosen — so it is reported here rather than skipped.
