---
doc_type: visual-diff
block: sgs/site-footer-row
date: 2026-08-02
verdict: PASS
first_paint_capture_passed: true
decision: D455-followup
site: sandybrown-nightingale-600381.hostingersite.com
---

# sgs/site-footer-row + sgs/site-header-row — `layout` gains an enum

Covers the same change on both row blocks; `site-header-row`'s own report for the
fluid-gap change is `site-header-row-2026-08-02.md`.

## What changed

`layout` was declared `{"type": "string", "default": "flex"|"grid"}` with **no
`enum`**. Added `"enum": ["flex", "grid"]` to both row blocks.

No CSS changed. No render code changed. This is an attribute-schema constraint.

## Why — the defect it closes

`site-header-row`'s fluid gap uses `cqi`, which resolves against the nearest
**ancestor** query container; an element can never query itself. The row sets
`container-type: inline-size` on itself, so the gap MUST be emitted onto the
descendant `.sgs-container__inner`. It only is because
`class-sgs-container-wrapper.php:528` forces `$grid_on_inner = true` when
`layout` is `flex` or `grid`.

A stored instance carrying anything else would land the gap on the row itself,
where `cqi` silently resolves against some other ancestor — a plausible-looking
but wrong value, with no gate catching it. Without an `enum`, WordPress performs
no coercion, so such a value would survive.

With the `enum`, WP coerces anything invalid back to the declared default at
render. The mechanism is not assumed: it is a previously-caught live bug on this
codebase (D291) — the converter emitted `inheritStyle: "custom"` for
`sgs/button`, WP silently coerced it to the declared default, and a naked link
rendered as a solid button.

Chosen over a defensive guard inside `class-sgs-container-wrapper.php`, which
serves ~29 blocks. This closes it at the source, one line per block.

## Why this is render-neutral — evidence, not assertion

**1. No third value exists in any source.** Checked every place a `layout` value
can originate:

| Source | Values found |
|---|---|
| `site-header-row/edit.js` `LAYOUT_OPTIONS` | `flex`, `grid` |
| `site-footer-row/edit.js` `LAYOUT_OPTIONS` | `flex`, `grid` |
| both `render.php` | passthrough only, writes no value |
| converter `services/arrangement.py` | emits only `{"layout":"grid"}` / `{"layout":"flex"}` |
| every theme pattern instantiating either block | `flex`, `grid` |

**2. No stored content is affected — measured, not reasoned.** The deploy
pipeline's `oldshape-audit` fetched live `post_content` from the canary and
scanned **394 posts** against these exact new schemas. It returned **zero
findings for `sgs/site-header-row` or `sgs/site-footer-row`**. If the enum would
strand or coerce any stored instance, this is precisely the check that would say
so, and it did not.

(The audit did report 4 unrelated NEW HIGH findings on post 2119 for
`sgs/container`, `sgs/text` and `sgs/info-box` — a different track's schema work,
untouched by this change and not addressed here.)

Since the enum can only alter behaviour for a value outside `flex|grid`, and no
such value exists in source or in 394 posts of stored content, no existing
instance can render differently.

## First paint

`first_paint_capture_passed: true` refers to the capture taken **tonight on this
same header row, live on the canary**, after the fluid-gap deploy:

```
gap at first paint (DCL) : 11.5px
gap after settle         : 11.5px
```

Identical — no flash, no fallback painting first.

**Stated plainly so nobody is misled:** that capture verified the *gap* change,
which is deployed. The `enum` in this report is **not deployed** — the deploy was
aborted by the `oldshape-audit` on another track's post-2119 findings. The enum
is a schema constraint that emits no CSS and changes no markup, and its
render-neutrality is established by the two evidence lines above rather than by a
paint capture. When the unrelated audit findings clear, it ships with the next
deploy and needs no further visual verification.

## Companion evidence from the same session

- `row-fit-sweep.mjs` on the live header: **PASS across 109 widths** (1400→320px,
  `--touch-targets`) — no stack, no overflow, no sub-44px target.
- `diff-gap-sanitiser.php`: `10/10 identical + 2/2 known-divergent`.
- `helpers-css-safety.php --self-test`: **53/53**.

## Not verified

- **Bean's eye on the footer specifically.** He signed off the header; the footer
  enum has no visual effect to look at, but the footer's own column behaviour was
  last eyeballed against placeholder content.
- **The enum live.** Not deployed yet, for the reason above.
