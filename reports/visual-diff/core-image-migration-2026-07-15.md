# Visual-diff report — core/image → sgs/media migration (Track C proving pairing), 2026-07-15

verdict: PASS
first_paint_capture_passed: true

## What changed
All 7 safe-zone `core/image` instances migrated to `sgs/media` via the new
per-pairing transformer (`scripts/migrate-core-blocks/driver.py` +
`pairings/image_pairing.py`): patterns/about-image-left.php,
about-story.php, services-alternating.php (×2), team-section.php (×3).
Theme `style.css` Version 1.5.25 → 1.5.26 (pattern-cache + CDN `?ver` bust).

Schema transformation, not a tag swap: figure inner HTML → typed attrs
(imageUrl/imageAlt/alignment/maxWidth/height), `style.border.radius` carried
1:1 (native skip-serialised border support). The driver's anti-silent-discard
gate validated every emitted attr against media/block.json and required an
accounting entry (mapped / dropped-with-reason / gap) for every source attr.
`sizeSlug` dropped with reason (rendition choice is authoring-time; explicit
imageUrl renders the identical `<img src>`) — logged as a register gap-note.

## Live evidence (before/after pages 1469/1470 on canary)
| Image (content-keyed) | core/image | sgs/media | verdict |
|---|---|---|---|
| About us | 500×600, r16px, centred | 500×600, r16px, centred | MATCH |
| Strategy and planning | 600×400, r12px, centred | 600×400, r12px, centred | MATCH |
| Alex Johnson (avatar) | 120×120, r100%, centred | 120×120, r100%, centred | MATCH |

objectFit fill→cover is the only computed diff — invisible per-pair (rendered
box == intrinsic dimensions). 375px overflow probe: 0 offenders (see
media-2026-07-15.md for the block bug this migration surfaced + fixed).
`check-dead-pattern-attrs.py`: zero new findings (only the 6 known hands-off
info-box entries).

## First-paint captures (this directory)
- core-image-migration-after-2026-07-15-{mobile,tablet,desktop}.png
- core-image-migration-before-2026-07-15-{mobile,tablet,desktop}.png
