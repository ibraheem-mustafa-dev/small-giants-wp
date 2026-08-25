# Visual diff — sgs/container — 2026-08-25

verdict: PASS
intent_capture_passed: true

Retires the scoped bypass used on commit `04f487c39`
(`SGS_VISUAL_GATE_SKIP=container`). The bypass was taken because the after-capture
requires a deploy and the deploy requires a committed tree.

## Change under test

`src/blocks/container/block.json` — the `layout` attribute gains an enum:

    "layout": { "type": "string", "enum": ["", "flex", "stack", "grid"], "default": "flex" }

No render path changed. No PHP, JS or CSS touched.

## Assertion

No existing container renders differently, because no stored or authored value
falls outside the new enum — so WordPress coerces nothing.

## Evidence gathered BEFORE the edit (the safe-narrowing test)

| Source | Values found |
|---|---|
| Stored canary `post_content` | 652 absent · 28 `flex` · 9 `grid` · 9 `stack` · **0 out-of-enum** |
| Theme templates + patterns | 18 `flex` · 21 `grid` · **0 invalid** |

`""` is included deliberately: it is the content-band/flow mode and gates the
`contentWidth` default path (`class-sgs-container-wrapper.php:3379`). Omitting it
would have coerced every flow-mode container to `flex`.

## Measured, live canary, post-deploy, 1440px

| Surface | Result |
|---|---|
| `/shop/` | h1 "Shop"; breadcrumb → h1 → search still `sameLeft` and strictly stacked; cards 5×313.3px; no horizontal overflow |
| `/blog/` | h1 "Blogs", 9 articles |
| `/` | homepage renders, 116KB |
| payload-verify | 83/83 deployed `block.json` checksums match the payload |

No layout, width or stacking change on any surface. Consistent with the
prediction, because nothing was coercible.

## What this does NOT claim

The enum is **silent, not loud**. An invalid value now coerces to `flex` (a row)
rather than emitting no `display` at all (block flow). That is more predictable
and removes the meaningless `sgs-container--<invalid>` class, but it is not an
error. Spec 36:820 prefers PHP validation precisely because an enum masks the bad
value; that trade-off was made knowingly for the zero-risk win, and a PHP warn can
be layered on later without undoing this.

⚠ Supersedes D774's blanket "do not add an enum to `layout`". D774 conflated a
shared PHP allowlist inside the wrapper (which WOULD break gallery, post-grid and
testimonial-slider) with a per-block enum on `sgs/container` (which cannot —
WordPress validates against each block type's own schema). Five of the nineteen
blocks sharing the attribute name already carry their own differing enums.
