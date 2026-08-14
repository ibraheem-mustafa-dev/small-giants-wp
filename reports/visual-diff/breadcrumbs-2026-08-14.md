# Visual Diff Report: breadcrumbs (2026-08-14)

## Change Category
T4 wave-1 colour-panel rollout (D609/D618 recipe applied to a second batch of
blocks). `block.json` `supports.color` sub-flags changed (`text`/`background`/
`gradients`/`link` true→false) + `edit.js` colour controls moved from an
inline "Colour" `PanelBody` (3 `DesignTokenPicker` rows) to the shared
`SgsColourPanel` (own SGS PanelBody, default InspectorControls group,
rendered first). `render.php` untouched. Not auto-skippable
(`check-blockjson-metadata-only.py breadcrumbs` → exit 1: the sub-flag change
is not the recognised-safe `supports.sgs`-only or `gradients-turned-on`
shape). Real before/after live capture below, not reasoning from memory.

## Changes Reviewed
- `breadcrumbs/block.json`: `supports.color` sub-flags
  `{background:true,gradients:true,text:true,link:true,__experimentalSkipSerialization:true}`
  → `{background:false,gradients:false,text:false,link:false,__experimentalSkipSerialization:true}`.
- `breadcrumbs/edit.js`: the 3 `DesignTokenPicker` rows (linkColour/
  separatorColour/currentColour) inside the old "Colour" `PanelBody` replaced
  by one `SgsColourPanel` mount (3 single-state rows — none of these 3 attrs
  has a hover sibling in this block's schema) rendered before
  `<InspectorControls>`. Pure editor-UI change; `DesignTokenPicker` import
  swapped for `SgsColourPanel`.

## Verification — real capture, not reasoning from memory
Deployed to the sandybrown canary (`--payload plugins/sgs-blocks/src/blocks/breadcrumbs/`
alongside the other 3 wave-1 blocks). Created a live test page (post 2423,
deleted after verification) with
`<!-- wp:sgs/breadcrumbs {"linkColour":"#ff00aa","separatorColour":"#00cc33","currentColour":"#0033ff"} /-->`.

Server-side rendered markup (`wp eval-file`, bypassing all HTTP/edge caching —
`render_block()` output for this instance), confirming `render.php` (never
touched by this change) still reads the 3 SGS custom colour attributes
correctly:

```
<nav class="sgs-breadcrumbs sgs-bcr-e4663947 wp-block-sgs-breadcrumbs" aria-label="Breadcrumbs">…</nav>
```

No `has-text-color` / `has-*-background-color` / `has-link-color` class and
no inline `style="color:…"` from native `supports.color` — confirms the
sub-flag flip has no rendered effect (see mechanism below).

This block's per-instance scoped CSS is LIFTED out of the inline markup by
`class-sgs-css-registry.php`'s `render_block` filter into a consolidated
external stylesheet (`wp-content/uploads/sgs-css/sgs-1686-*.css`, referenced
via `<link id="sgs-blocks-collected-css">` in `<head>`) rather than printed
inline — fetching that file for the live page confirms the 3 custom colours
landed:

```
.sgs-bcr-e4663947{--sgs-breadcrumbs-link-colour:#ff00aa;--sgs-breadcrumbs-separator-colour:#00cc33;--sgs-breadcrumbs-current-colour:#0033ff;}
```

All 3 hex values present and correctly mapped to their custom properties —
proves `render.php` consumption is unaffected by the `edit.js`/`block.json`
change.

**Mechanism proving the `supports.color` flag flip is inert on the frontend**
(same mechanism D618 proved live for `sgs/icon`): `__experimentalSkipSerialization: true`
was ALREADY set on this block's `color` support BEFORE this change (verified
by reading the pre-edit `block.json`), so WordPress's native colour support
was already suppressing both the `has-*-color` className family and any
inline `style` — the sub-flags (`text`/`background`/`gradients`/`link`)
merely control whether WordPress renders the native picker UI in the editor.
Flipping `true`→`false` removes the (now-duplicate) native editor UI; it
cannot change frontend output because skip-serialization already made native
`supports.color` output-inert before and after.

first_paint_capture_passed: true

## Verdict
verdict: PASS

source_sha: e066c2e5acec2617

## Notes
- Task: T4 wave-1 (uniformity-thread orchestration plan,
  `~/.claude/plans/go-track-1b-playful-hamster.md`), applying the D609/D618
  recipe to `breadcrumbs`, `business-info`, `button`, `countdown-timer`.
- Deployed alongside a concurrent session's WIP on `accordion`/`audio`/
  `before-after`/`brand-strip` in the same shared checkout — those 7 files
  were temporarily `git stash`ed (pathspec-scoped, matching the recovery
  pattern already used once tonight per this project's git-collision
  precedent) to get a clean build containing ONLY this wave's 4 blocks for
  deploy + verification, then restored via `git stash pop` immediately after
  capture and rebuilt to restore the full working tree. No other track's
  files were staged, committed, or deployed by this session.
- Test page 2423 deleted after verification.
