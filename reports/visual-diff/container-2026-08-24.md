# Visual diff — flexWrap default moved from PHP into block.json (17 blocks) — 2026-08-24

verdict: PASS
first_paint_capture_passed: true
source_sha: dbe763b449dbb3bf

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
