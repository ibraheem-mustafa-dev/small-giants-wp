# Visual diff — sgs/hero — per-tier alt text (item 3.16) — 2026-09-08

verdict: PASS (live-verified, fix deployed 2026-09-08)
first_paint_capture_passed: true
source_sha: 27d7845b5bec9e1f

Covers the clone-fidelity programme's item 3.16: the mobile hero image carried the DESKTOP
image's alt text instead of its own, because `sgs/hero`'s split-media source is genuinely two
different photos (a close-up product shot on desktop, a lifestyle background shot on mobile),
not one subject at two crops — the assumption Spec 35 D5's "alt is NOT tiered" rule was built
on. WCAG 1.1.1 requires each to describe what it actually shows.

## Root cause (re-verified against current code before fixing, not inherited from the
programme doc)

- `plugins/sgs-blocks/src/blocks/hero/block.json:345-356` already declares
  `splitMediaImageAlt`/`Tablet`/`Mobile` as three separate string attributes.
- `plugins/sgs-blocks/src/blocks/hero/render.php`'s `$sgs_hero_resolve_split_image()` closure
  (line ~144-154) already resolves each tier's OWN alt into `$split_image['alt']` /
  `$split_image_tablet['alt']` / `$split_image_mobile['alt']` — the STORED data was already
  correct.
- The bug was purely at the point these were collapsed into ONE render-time variable: the old
  `$sgs_hero_split_alt = (string) ( $split_image['alt'] ?? '' );` (line ~1465) read the
  DESKTOP tier only and discarded the tablet/mobile values entirely, before handing that one
  string to the shared `sgs_tier_media_render()` helper (`includes/helpers-tier-media.php`),
  which applied it verbatim to every rendered `<img>` regardless of tier.
- `sgs_tier_media_render()` is shared with `sgs/timeline`'s milestone media (a genuinely
  different call site, confirmed at `timeline/render.php:892-902`), so the fix had to be a
  general mechanism, not a hero-private patch — per this project's R-31-9 rule and the
  session's explicit shared-mechanism exception process.

## What changed

1. **`plugins/sgs-blocks/includes/helpers-tier-media.php`** — `sgs_tier_media_render()`'s
   `$alt` parameter widened from `string` to `string|array`. A plain string (every existing
   caller before this change) is applied to every tier unchanged — byte-identical behaviour.
   An array (`['desktop'=>..,'tablet'=>..,'mobile'=>..]`) opts into a per-tier resolution with
   a fallback-UP cascade (a tier left empty inherits the next WIDEST tier's alt), mirroring the
   existing fall-back-UP rule already used for the media source itself (Spec 35 D3/D5).
2. **`plugins/sgs-blocks/src/blocks/hero/render.php`** — `$sgs_hero_split_alt` now built as
   the per-tier array from the already-resolved `$split_image`/`$split_image_tablet`/
   `$split_image_mobile['alt']` values, instead of collapsing to desktop alone. The decorative
   toggle now blanks all three tiers, not just one.
3. **`plugins/sgs-blocks/src/components/media/HeroSplitMediaPanelLayout.js`** — added a
   tier-aware "Alt text" `TextControl` (wrapped in `ResponsiveControl`, mirroring
   `source.control.js`'s own tier pattern) to `HeroSplitMediaSourceSection`, gated to the image
   media type only. This closes a genuine editor-control gap: the tiered attributes existed
   in block.json and were auto-filled from the picked attachment's own alt text on upload, but
   the client had no way to manually type or override a tier's alt. The shared `meaning` atom
   (`components/media/atoms/meaning.control.js`) was NOT reused — it is not tier-aware (writes
   only the base/desktop attribute) and its sole other adopter, `sgs/media`, has no tiered alt
   attributes to write to; widening it would have been a larger, separate change affecting a
   different block for no benefit to this fix.

`sgs/timeline`'s own call to `sgs_tier_media_render()` still passes a plain string — unaffected
by the array branch, confirmed by reading its call site after the change.

## Live verification — sandybrown-nightingale-600381.hostingersite.com, page 2742 (`/`)

### 375px (mobile)

```json
[
  {
    "className": "... sgs-hero__split-media--desktop ...",
    "alt": "Close-up of Mama's Munches Zookies — real ingredients, baked fresh",
    "visible": false
  },
  {
    "className": "... sgs-hero__split-media--mobile ...",
    "alt": "Freshly baked Mama's Munches lactation cookies on a warm background",
    "visible": true
  }
]
```

The VISIBLE mobile `<img>` (`display:block`, `offsetParent !== null`) now carries its own
correct alt text. The desktop `<img>` stays hidden (`display:none`) and unchanged.

### 1440px (desktop)

```json
[
  {
    "className": "... sgs-hero__split-media--desktop ...",
    "alt": "Close-up of Mama's Munches Zookies — real ingredients, baked fresh",
    "visible": true
  },
  {
    "className": "... sgs-hero__split-media--mobile ...",
    "alt": "Freshly baked Mama's Munches lactation cookies on a warm background",
    "visible": false
  }
]
```

Desktop tier unaffected — no regression.

### Console

Zero errors, zero warnings on both viewports.

## Assertions — stated before measuring

1. The visible mobile `<img>`'s `alt` attribute reads the mobile-specific text.
2. The desktop `<img>`'s `alt` attribute is unchanged.
3. No `sgs/timeline` regression (call site still passes a plain string).
4. No console errors.

## Results

| # | Assertion | Result |
|---|---|---|
| 1 | Mobile `<img>` alt is mobile-specific | **PASS** |
| 2 | Desktop `<img>` alt unchanged | **PASS** |
| 3 | `sgs/timeline` unaffected | **PASS** (code-reviewed; no timeline instance on this page to render-check) |
| 4 | No console errors | **PASS** |

## Gates run before deploy

- `phpcs --standard=WordPress` on both changed PHP files — 0 new violations (4 pre-existing,
  unrelated findings confirmed via `git diff` to fall outside the edited lines).
- `npx wp-scripts build --experimental-modules --webpack-copy-php` — clean.
- `node scripts/check-dead-controls.js --check` — 0 net-new dead controls.
- Full deploy gate chain (`pytest-oracle-converter`, `inspector-scan-run`,
  `audit-block-file-consistency`) — all PASS.
- Post-deploy payload-checksum verify — PASS (83/83 block.json match).
- Post-deploy live motion QA (3 probes) — all PASS.

Deployed via `build-deploy.py --blocks-only --skip-build --payload
plugins/sgs-blocks/includes/helpers-tier-media.php --payload
plugins/sgs-blocks/src/blocks/hero/render.php --payload
plugins/sgs-blocks/src/components/media/HeroSplitMediaPanelLayout.js` (multiple `--payload`
flags — the arg is `action="append"`, a comma-separated single value does not work).
