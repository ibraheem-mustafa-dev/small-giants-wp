# Visual Diff Report: business-info (2026-08-14)

## Change Category
T4 wave-1 colour-panel rollout (D609/D618 recipe applied to a second batch of
blocks). `block.json` `supports.color` sub-flags changed (`text`/`background`/
`gradients`/`link` true→false) + `edit.js` gains a NEW `SgsColourPanel` mount
(this block previously had NO colour controls in its inspector at all —
`iconColour`/`textColour`/`labelColour`/`linkHoverColour` were render.php-only
attrs with no editor UI). `render.php` untouched. Not auto-skippable
(`check-blockjson-metadata-only.py business-info` → exit 1). Real
before/after live capture below.

## Changes Reviewed
- `business-info/block.json`: `supports.color` sub-flags
  `{text:true,background:true,gradients:true,link:true,__experimentalSkipSerialization:true}`
  → `{text:false,background:false,gradients:false,link:false,__experimentalSkipSerialization:true}`.
- `business-info/edit.js`: new `SgsColourPanel` mount (4 rows) rendered first.
  `iconColour`/`textColour`/`labelColour` are single-state rows (no hover
  sibling in this block's schema). `linkHoverColour` has no "normal" sibling
  attribute in this block's schema — render.php's own comment documents that
  style.css's `#e7d768` credit-sweep colour is the implicit unset-fallback —
  so it renders as a single-state row labelled "Link hover colour" with one
  state keyed `hover`, not paired into a normal/hover tab toggle.

## Verification — real capture, not reasoning from memory
Deployed to the sandybrown canary alongside the other 3 wave-1 blocks
(`--payload plugins/sgs-blocks/src/blocks/business-info/`). Live test page
(post 2423, deleted after verification) included
`<!-- wp:sgs/business-info {"displayType":"attribution","iconColour":"#ff00aa","textColour":"#123456","labelColour":"#654321","linkHoverColour":"#abcdef"} /-->`
(`displayType:attribution` chosen deliberately — it is the ONE display type
that always renders regardless of Site Info data, per render.php's own
comment: "Never renders a placeholder: it has no empty state").

Server-side rendered markup (`wp eval-file`, bypassing HTTP/edge caching):

```
<div class="sgs-business-info-wrap sgs-business-info-wrap--attribution sgs-biz-6291c012 wp-block-sgs-business-info"><p class="sgs-business-info sgs-business-attribution"><a href="https://smallgiantsstudio.co.uk/" class="sgs-business-info__link" rel="noopener">Website by Small Giants Studio</a></p></div>
```

No `has-*-color` class, no inline `style="color:…"` from native
`supports.color` — the flag flip has no rendered effect (mechanism below,
same as breadcrumbs/D618).

This block's colour bridge (`--sgs-bi-icon-colour`/`--sgs-bi-text-colour`/
`--sgs-bi-label-colour`/`--sgs-bi-link-hover`) runs unconditionally whenever
`$html` is non-empty (render.php's colour-bridge block sits AFTER the
`switch($display_type)`, independent of which type rendered), so even though
`attribution` itself doesn't visually consume icon/text/label colour, the
scoped CSS still emits — confirming `render.php`'s attribute reads are
unaffected by the `edit.js` change. Fetched the live page's consolidated
scoped-CSS file (`wp-content/uploads/sgs-css/sgs-1686-*.css`, lifted by
`class-sgs-css-registry.php`):

```
.sgs-biz-6291c012{--sgs-bi-icon-colour:#ff00aa;--sgs-bi-text-colour:#123456;--sgs-bi-label-colour:#654321;--sgs-bi-link-hover:#abcdef;}
```

All 4 hex values present, correctly mapped.

**Mechanism proving the `supports.color` flag flip is inert on the frontend**
(D618 precedent): `__experimentalSkipSerialization: true` was ALREADY set on
this block's `color` support before this change, so native `supports.color`
output (className family + inline style) was already suppressed. The
sub-flags only control native editor UI generation.

first_paint_capture_passed: true

## Verdict
verdict: PASS

source_sha: d24c86e0c0fee0a8

## Notes
- Task: T4 wave-1. Same shared-checkout stash/restore discipline as the
  breadcrumbs report — see that report's Notes for the full explanation.
- Test page 2423 deleted after verification.
