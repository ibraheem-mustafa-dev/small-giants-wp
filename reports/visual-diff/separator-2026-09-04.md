# Visual diff — sgs/separator — 2026-09-04

verdict: PASS (static gates); live-capture DEFERRED to this session's centralised deploy step
intent_capture_passed: true
source_sha: 2c98652e1f5aeafd

## What changed

Phase 3 golden-colour rollout, rule `31-golden-colour-control` "missing-gradient". One
attribute gains a gradient sibling: `contentColour` → `contentColourGradient` (element
`content`, selector `.sgs-separator__content`).

`block.json`: `contentColourGradient` string attr added; `attrMap` on the `content` element
gained `"css:background-image": "contentColourGradient"`.

`render.php`: gradient wiring is deliberately scoped to the `'text'` content-mode branch only
(`sgs_resolve_text_colour_or_gradient()` → `sgs_text_colour_decl()` →
`sgs_text_colour_gradient_fallback_rule()`, mirroring the exemplar). The `'icon'` branch is
LEFT UNCHANGED — it keeps painting `contentColour` as a flat `color:` declaration.

`edit.js`: the `contentColour` row (mounted via `SgsColourPanel`) gained `gradientCapable:
true` plus `gradientValue`/`onGradientChange` on its single state. The canvas preview for
`'text'` content mode now uses `resolveTextColourPreviewStyle()`; the `'icon'` mode preview is
unchanged (still a flat `colourVar(contentColour)`), matching render.php's split.

## Why the icon-mode split (flagging as a judgement call)

`contentColour` is a UNIFIED attribute — one foreground colour for either an icon glyph or a
text label, whichever `contentMode` is active (block.json's own note: "the slot renders an icon
OR text, never both, so one foreground colour serves both modes"). `background-clip:text` only
clips to real glyph OUTLINES of rendered text content. The `'text'` mode renders a genuine
`<span>` of escaped text — safe. The `'icon'` mode can render a Lucide icon or a WP icon as
inline SVG (`sgs_get_lucide_icon()` / `sgs_get_wp_icon()`) — applying `background-clip:text` +
`color:transparent` there would not clip to the SVG's paths (SVG isn't text content for this
purpose) and the icon would likely render fully transparent/invisible, since the emitted
declaration also sets `color: transparent` and most SVG icon markup inherits fill/stroke from
`currentColor`. Dashicon and emoji sub-modes ARE real glyph characters and would probably clip
correctly, but the element's colour attribute is mode-agnostic at the block.json level, so
narrowing further by icon-source would need per-source detection this attribute doesn't carry.

Chose the conservative reading: wire the gradient only where it is unambiguously safe (`'text'`
mode). The `contentColourGradient` attribute and its editor control still exist and are usable
regardless of mode — in `'icon'` mode, setting a gradient is a silent no-op (the flat
`contentColour` keeps painting), not a visual break. Documented directly in both block.json's
manifest note and the new attribute's description so this isn't a hidden gap.

## Verification so far

- `node scripts/colour-codemod/survey.js --json`: `contentColour` moved from
  `REFUSED:no-gradient-capable-paint-path-found` to `AUTOFIXABLE:wire-state-emitter`. Total row
  count held at 262.
- `php -l src/blocks/separator/render.php` — clean.
- `git diff --stat` scoped to exactly `block.json` / `edit.js` / `render.php` for this block.

## Why intent capture, not before/after

`contentColourGradient` is brand new (`default: ""`) — no existing content can have set it.

## Risk

Additive only for `'text'` mode. `'icon'` mode is functionally untouched (still flat-colour
only) — the new attribute is inert there by design, not by accident.

## Gates

`php -l` clean · `survey.js` census verdict moved as expected, total unchanged at 262 ·
build/deploy/live-probe deferred to the session's centralised Step 3.
