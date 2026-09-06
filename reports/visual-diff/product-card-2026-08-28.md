# Visual diff — sgs/product-card, SgsBorderControl composite (Task 0) — 2026-08-28

verdict: PASS
intent_capture_passed: true
source_sha: f1fee88134b562ff

## What changed

`edit.js`'s "Card border" panel replaced its previous three-part UI (a colour row inside
`SgsColourPanel`, plus a separate `ResponsiveBoxControl` for border width) with one
`<SgsBorderControl>` composite — matching WordPress core's native one-row Width/Style/Colour
layout, composed from three existing, unmodified components (`SgsBoxControl` in border-width
mode, `BorderStyleControl`, `GradientCapableColourControl`). No attribute rename, no
`render.php` change — `borderWidth`/`borderStyle`/`borderColour`/`borderColourGradient` are
unchanged; only the editor UI presenting them changed shape. Commit `fc2796340`.

## Why intent_capture_passed, not a before/after diff

The UI shape changed deliberately (that is the whole point of the composite); the assertion
under test is not "did the rendering change" but "does the new control still correctly write
and paint the same attributes the old UI did".

## Assertions (stated before measuring)

1. Setting Width/Style/Colour via the new composite updates the same attributes
   (`borderWidth`/`borderStyle`/`borderColour`) the old UI wrote.
2. The border renders on the card's own wrapper element, computed correctly in both the
   editor canvas and the live frontend.
3. Values persist across save + full editor reload (not just in-memory React state).

## Live result — page 589 (`SGS Configurator Test 540`) and a fresh test page 3046, sandybrown canary, 2026-08-28

Set via the new composite: Width preset `XS (0.5rem)`, Style `solid`, Colour `Accent` (a theme
palette swatch, not a raw hex — confirming the composite's `DesignTokenPicker`-style colour row
still resolves theme tokens correctly, not just literal hex values).

- **Editor canvas**, `.wp-block-sgs-product-card` (border-width mode's box control, linked):
  `border-color: rgb(...)` matching the Accent token, `border-width: 8px` (0.5rem @ 16px base),
  `border-style: solid`.
- **Persistence**: saved, fully reloaded the editor (`post.php?post=589&action=edit`), re-opened
  the "Card border" panel — Width/Style/Colour all still show the set values; the card's border
  still renders in the canvas ("Last edited a second ago" / revision count incremented,
  confirming a real save landed, not an unsaved draft state).
- **Frontend** (`/sgs-configurator-test-540/`): same computed border rendered on the live page,
  matching the editor exactly.
- **Console**: zero errors on selection, panel-open, value-change, save, or reload, across
  multiple repeated test cycles.

All three assertions hold. Also load-bearing: a suspected editor crash on this exact block was
investigated across three separate rounds this session and traced to a pre-existing
WordPress-core race condition in `useBlockProps()`'s native block-visibility check (correlated
with `<ServerSideRender>` bound-mode cards under heavy concurrent session load on this shared
canary) — NOT caused by this change. See `.claude/decisions.md` D875 for the full trace. Not
reproducible in a clean, uncontended session.
