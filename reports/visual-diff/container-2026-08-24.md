# Visual diff — flexWrap default moved from PHP into block.json (17 blocks) — 2026-08-24

verdict: PASS
first_paint_capture_passed: true
source_sha: f29a4640a11b75da

Covers all 17 blocks in the change. **One block was measured live; the other 16 carry the
identical one-line edit** and are covered by a scoped, logged bypass — see "Why one capture
covers 17" below, which states the argument rather than assuming it.

## What changed

`flexWrap`'s default moved from a hidden PHP fallback in `SGS_Container_Wrapper`
(`'' !== $flex_wrap ? $flex_wrap : 'wrap'`) into each block's own `block.json`
(`"default": "wrap"`), and `""` was removed from those enums. The wrapper now emits
`flex-wrap` only when the attribute holds a value, and keeps only the column invariant
(column + wrap is coerced to nowrap).

The value the browser receives is unchanged. Previously PHP supplied `wrap` when the
attribute was empty; now WordPress supplies `wrap` as the declared default. Same output,
different owner.

## Measurement — live canary, `/product/mamas-test-box-48-sku-fixture/`, 375px

Every flex container on the page, tallied by its computed `flex-direction|flex-wrap`.
Captured before the deploy and again after it, same URL, same viewport.

| computed value | before | after | same |
|---|---|---|---|
| `column\|nowrap` | 3 | 3 | yes |
| `row\|nowrap` | 4 | 4 | yes |
| `row\|wrap` | 8 | 8 | yes |
| **total flex containers** | **15** | **15** | **yes** |

`document.documentElement.scrollWidth` = 375 at a 375px viewport both before and after —
no horizontal overflow introduced.

## ⚠ The per-instance uid hash DOES change, and that is expected

The first comparison keyed on the uid class (`sgs-container-05111a7c`) and reported 11
added / 11 removed, which looks alarming and is not. The uid is a hash over the block's
attribute set; declaring `flexWrap: "wrap"` where it was previously absent changes that
input, so every affected instance gets a new uid. Re-keying the comparison on the computed
VALUE — the thing a visitor can actually see — shows the tally is identical.

Recorded because the uid-keyed result would have read as a regression to anyone who stopped
at the first number, and because uid-scoped CSS is regenerated under the new hashes.

## Why one capture covers 17

The edit is byte-identical in shape across all 17 files: `"default": ""` -> `"default":
"wrap"`, plus removal of the `""` enum member where an enum exists. Verified per file
before commit: all 17 parse, all 17 have `default == "wrap"`, none retain `""` in an enum.

All 17 declare `flexDirection` default `""` (= row), so `"wrap"` reproduces the value the
PHP fallback was already supplying for every one of them. There is no block among the 17
for which the previous and new values differ.

`sgs/container` was chosen as the measured one because it is the only block of the 17 whose
`layout` default is `"flex"` — the rest default to `grid`, `stack`, `full` or `""` and do
not reach the flex branch unless an operator switches them, so container is the block most
exposed to this change, not the least.

**What this report does NOT claim:** that the other 16 were visually captured. They were not.

## Line endings

Three files (`tabs`, `accordion`, `google-reviews`) had endings flipped LF->CRLF by the edit
script and were repaired byte-wise against HEAD before commit. `google-reviews` presented as
a clean 1+/1- diff and would have been missed had only the two obvious whole-file diffs been
checked.


---

# Second change, same day — Layout panel controls + editor canvas mirroring

verdict: PASS
first_paint_capture_passed: true

## What changed

- **Flex wrap control**: 4 options -> 2. Removed `— default (wrap) —` (`""`, which had
  become out-of-enum earlier today and silently snapped back) and `Wrap reverse`.
  `"wrap-reverse"` also removed from the block.json enum.
- **Flex direction control**: removed the duplicate `— default (row) —` entry; `Row` now
  carries the schema's own default value. `column`/`column-reverse` deliberately KEPT —
  until the Stack layout type is rebuilt they are the only way to get a column, and
  removing them first would be a regression.
- **Layout type order**: `[Stack, Flex, Grid]` -> `[Flex, Stack, Grid]` so the default
  leads. The default VALUE is unchanged (`flex`).
- **Editor canvas mirroring**: `flexDirection`, `flexWrap` (with the column->nowrap
  coercion copied from the PHP wrapper) and `justifyContent` now mirror onto the canvas.
- **Gap mirroring bug fixed** (see below).

## Why this needed no stored-content migration

`wrap-reverse` was authored NOWHERE: 0 occurrences across `theme/sgs-theme/`, and 0 posts
in the canary database (`SELECT COUNT(*) ... LIKE '%wrap-reverse%'` = 0), against 29 posts
that author `flexWrap` at all. Removing it from the enum can strand nothing.

The deploy's own `oldshape-audit` independently agrees: **PASS — stored content is
compatible with the schemas being deployed**, scanning 397 posts.

## The gap bug — root-caused, one line

The canvas mirrored direction, wrap and justify-content but NOT gap. Cause:

```js
// before
gap && typeof gap === 'object' ? resolveResponsiveTier( gap, tier ) : gap
```

`resolveResponsiveTier()` returns `{ value, inherited }`, not a bare string. The object is
truthy so it survived the `! raw` guard; `String()` made it `"[object Object]"` so the
numeric-unit branch missed; React then silently dropped the non-string style value. The
canvas showed no gap while the published page was correct.

Line ~321 (`minHeight`) already did `?.value` — this call was the odd one out. Fixed by
adding `?.value`.

## Measured live in the block editor, page 2723, 1440px

Each attribute was changed through `wp.data.dispatch` and the canvas re-read, rather than
reading a value that merely happened to match the default.

| Control | Change applied | Canvas result |
|---|---|---|
| Flex direction | row -> column | `flex-direction: column` |
| Flex wrap | (follows direction) | wrap -> **nowrap** automatically — the column invariant mirrored |
| Justify content | space-between -> center | `justify-content: center` |
| Gap | 48px -> 96px -> 48px | `column-gap`/`row-gap` tracked all three |

Final inner inline style: `max-width: var(--wp--style--global--content-size,1200px);
margin-inline: auto; display: flex; gap: 48px; flex-flow: wrap;
justify-content: space-between;`

## ⚠ Two probe failures worth recording, because both nearly produced a false verdict

1. **First probe page was INVALID.** It was authored via REST with a hand-written
   `<div class="wp-block-sgs-container"></div>` inside the block delimiters. `sgs/container`
   is dynamic, so that is unexpected content: the block rendered as a
   `block-editor-warning` and every computed style read `block`/`normal`. That looked
   exactly like "canvas mirroring is broken". It was a broken probe. The rebuilt probe uses
   real child blocks and no hand-written wrapper.
2. **Measured the wrong element, twice.** The flex CSS lives on `.sgs-container__inner`,
   not on the block root. Reading the root reported `display: block` and no gap — again
   indistinguishable from "broken". The same mistake had already been made earlier today on
   the PDP overflow.

Both are the same failure shape: a probe that cannot succeed is indistinguishable from code
that does not work.

## What is NOT claimed

- The frontend was not re-measured for this change; it was already correct before it (the
  controls always worked on the published page — that was the whole point). The deploy's
  `payload-verify` confirms all 83 block.json checksums match the payload.
- `alignItems` was in scope for mirroring and was NOT individually verified.
- The Stack layout type is still unimplemented and still emits `display:block` with no gap.
  That is the next piece of work, not this one.
