# Container band layers: content width and padding on one layer

## Context

A container-type block (one whose content sits in an inner content band, `.sgs-container__inner`, inside an outer element) has two width settings and, today, up to two padding settings. The shared wrapper (`plugins/sgs-blocks/includes/class-sgs-container-wrapper.php`) emits outer `maxWidth` as `max-width` on the outer element and `contentWidth` as `max-width` (with auto margins) on the content band. The 24 blocks that declare `contentWidth` record it three ways in the framework DB (`max-width` with no element on 12, `width` on the band or the wrapper on 10, nothing on 2), so Fill (`scripts/computed-route/lib/resolve.mjs`, which ties a setting by its recorded property and slot) cannot map a draft's centred `max-width` to it. Padding is split three ways: 13 blocks paint `padding` on the outer element only, 5 have outer `padding` plus a separate `contentBandPadding` on the band (container, hero, site-header, site-footer, physics-canvas), 6 have none.

Found on the Indus header row (`.claude/plans/2026-10-21-handoff-readers.md`, Status, Open gaps): the draft's row wrapper declares `max-width: 1320px`, padding 20px / 32px / 40px and `box-sizing: border-box`, and neither value reached a setting. Root padding does not paint the same box (at 1440 the first child would sit at x 60, not the draft's 100).

## Bean's decisions (2026-10-22)

- Width: a draft's outer width or max-width maps to the block's outer `maxWidth`; the centred inner wrapper's `max-width` maps to `contentWidth`. Every container-type block records `contentWidth` as `max-width` on the content band, so this needs no equivalence rule.
- Padding (option A): padding is the relationship between the band and its contents, so `padding` on every container-type block paints the content band. `contentBandPadding` is folded into `padding` and removed. A gate rejects any block whose padding and content width sit on different layers.
- The draft's gutter tokens (`--gutter-*`) reach the theme snapshot through the readers plan's wave 3 tokens item.

## Steps (migration method, `.claude/skills/migration-method/SKILL.md`)

1. Detector and census: `plugins/sgs-blocks/scripts/check-container-band-layers.py` (`--survey`, `--survey --json`, `--fix`, `--fix --apply`, `--check`, `--self-test`) over every block with `contentWidth`: the manifest declares `contentWidth` as `css:max-width` on the content-band element; `padding` paints the content band in the wrapper and the manifest; no `contentBandPadding` remains in source, manifests, editor code, theme patterns or route data; blocks with no content band are listed as exempt with the reason. Census committed to `reports/migrations/container-band-layers-census.json`; gate registered in `gates.json` before any `--apply`.
2. One instance (Step 3 of the method): `sgs/site-header-row` with padding on its band, deployed to indus-test, the Indus header rerun (Fill reads the row wrapper's `max-width` into `contentWidth` and its padding into `padding`), cropped pairs at 375, 768 and 1440 for Bean's eye.
3. Bulk: the shared wrapper paints `padding` on the band for every container-type block and drops `contentBandPadding`; manifests and editors follow; saved posts migrate by a WP-CLI batch sweep (`contentBandPadding` folded into `padding`, FP-14: no legacy fallback in render); route data that names `contentBandPadding` follows.
4. Reseed from a clean `origin/main` worktree, diff `block_attributes` against a pre-reseed copy, recalibrate the affected blocks (cache backed up first), check-approved and the freeze unchanged except the predicted rows.
5. Live check on sandybrown and indus-test, one instance per detector category; the Indus header pairs signed by Bean (FP-13).

## Status

- Step 1 not started.
