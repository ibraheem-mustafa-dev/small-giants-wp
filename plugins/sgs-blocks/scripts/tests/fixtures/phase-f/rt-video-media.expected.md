# Expected render — rt-video-media.draft.html

## HIGH gap this fixture red-teams

**M2-G2 / M2-G13: `<video>` element in a `__media` grid-area column is swallowed.**

The current `_lift_scalar_media_from_img` function (convert.py) iterates child nodes of a section and calls `continue` when the element is not an `<img>`. A `<video>` node is silently skipped — no block is emitted, no `attribute_gap_candidates` row is written, the media column is absent from the clone. The grid layout CSS on `.__media` (width, height, object-fit, object-position) is also silently dropped.

## What the current converter does wrong

```python
# Current (approximate, from convert.py):
for child in section.children:
    if child.name != 'img':
        continue  # <-- silently drops <video>, <figure>, <picture>
    # ... lift img attrs
```

The `continue` statement causes any `<video>`, `<figure>`, or `<picture>` node to be entirely absent from the output. No UNACCOUNTED entry is written because the node is never submitted to the `declare_input` stream.

## Target correct behaviour (the oracle must enforce)

1. The scalar-media path MUST be refactored to handle `<img>`, `<video>`, `<picture>`, and `<figure>` as a family (`MEDIA_TAGS = {'img', 'video', 'picture', 'figure'}`). A `continue` that silently drops any of these is a **CHEAT by omission** (R-22-4 / no-skipping).
2. For a `<video>` node: emit `sgs/video` (or `sgs/media` if that block handles video). Attrs: `src` from `<source>`, `poster`, `autoplay`, `muted`, `loop`, `playsinline`.
3. The `object-fit: cover` and `object-position: center center` CSS on `.__video` MUST be lifted onto `objectFit` / `objectPosition` attrs (D1) OR written to `attribute_gap_candidates` with reason. NOT silently dropped.
4. If `sgs/video` does not exist in the DB: the node MUST still appear in `declare_input` + `attribute_gap_candidates` with `proposed_action='add block: sgs/video for <video> media element'`. NEVER silent-drop.

## Block emitted

- Top-level section → `sgs/hero` (Method-2 composite routing; `.sgs-hero` → `sgs/hero`).
- Content column → `sgs/heading` + `sgs/text` + `sgs/multi-button` / `sgs/button` InnerBlocks.
- Media column → **`sgs/video` or `sgs/media`** (currently: nothing — this is the gap).

## Required attrs (these must pass regardless of the video gap)

| CSS source | Attr | Value | Tier | Status |
|-----------|------|-------|------|--------|
| `.__inner { grid-template-columns: 1fr 1fr }` | `gridTemplateColumns` | `1fr 1fr` | Desktop | **COVERED** |
| `.__inner { grid-template-columns: 1fr }` (@media ≤767px) | `gridTemplateColumnsMobile` | `1fr` | Mobile | **COVERED** |
| `.__inner { gap: 0 }` | `gap` | `0` | Desktop | **COVERED** |
| `.__inner { max-width: 1200px; margin: 0 auto }` | `contentWidth` | `1200px` | Desktop | **COVERED** |
| `.__inner { align-items: center }` | `verticalAlign` | `center` | Desktop | **COVERED** (D172 lock: `align-items` → `verticalAlign`, not `alignItems`) |
| `sgs-hero--video { min-height: 560px }` | `minHeight` | `560px` | Desktop | **COVERED** |
| `.sgs-hero--video__video { object-fit: cover }` | `objectFit` | `cover` | Desktop | **GAP** — must appear in `attribute_gap_candidates`, not silently dropped |

## CHEAT-FORBIDDEN

- A `<video>` swallowed by `continue` with no `attribute_gap_candidates` row is a **CHEAT by omission** and a hard FAIL of the ledger.
- The media column MUST NOT be rendered as raw HTML passthrough or D2 scoped CSS. If no D1 destination exists, it logs as GAP. It does not silently vanish.
