---
status: active
governs: .claude/specs/49-SGS-MEDIA-SYSTEM.md (Front P)
---

# Spec 49 Stage A hardening: the verified fix register

**Why:** a full second opinion (five independent reviewers, every finding fact-checked by a fresh verifier, 2026-11-10) found defects in Stage A that would break, regress or mislead once Stage B adopts blocks. This register lists only findings confirmed against the code and material to that goal, each with its proven cause, the check that fails today (baseline) and the check that proves it fixed. Evidence: `E:/sgs-tmp/media-qc/stageA/SecondOpinion/` (reviews `R1` to `R5`, verdicts `V1` to `V5`, goal `goal.md`). Bean dropped as out of scope: the panel menu button's size (WordPress's standard editor size), committed browser-proof runners, the PS-8 before capture and any load-speed check (page speed belongs to `plans/2026-11-03-page-weight-budget.md`).

Paths are under `plugins/sgs-blocks/` unless stated. Each group is one fix agent; groups own disjoint files.

## Group G: gates and generator

| # | Defect (proven cause) | Baseline (fails today) | Fixed when |
|---|---|---|---|
| G1 | `scripts/run-gates.py::run_one` runs `shlex.split(cmd)` with no shell, so `&&` is passed as an argument and only the first command of a gate runs: `check-gate-disposition`, `check-media-contract` and `diagram-geometry-twin` never ran their second half | `run-gates.py --only check-gate-disposition` prints PASS while `check-gate-disposition.py --check` exits 1 | the runner refuses a command containing `&&`, `\|\|` or `;`; each of the three gates is two records (self-test, check); the runner reports `check-gate-disposition` red until G2 |
| G2 | `scripts/data/gate-disposition.json` lacks entries for `scripts/migrate-media-system/mapping.py` and `tests/js/media-disclosure.test.js` | `check-gate-disposition.py --check` exits 1 naming both | exits 0 |
| G3 | `scripts/generate-media-attributes.mjs` passes a short `--block gallery` slug to `applyOverrideEntries`, which compares with `sgs/gallery`, so entries duplicate on every run; unknown flags are ignored | running `--block gallery` twice on a fixture copy doubles the entries | short and long slugs give identical output; an unknown flag exits 2 |
| G4 | every adopted settings row is `slots: 'all'` and the generator checks only that `kinds` exists, so a background slot gets caption, link, shape and border attributes and an image-only slot gets Playback and SVG ones (Appendix A lists about 14 for a background) | `--self-test` on a background fixture writes 48 attributes | the generator writes only the rows the slot's `context` and `kinds` allow (§9.3, Appendix C), fixture counts match Appendix A |
| G5 | `scripts/lib/media-block-json.mjs::generatedAttributes` skips a same-type clash silently and reports one type clash at a time | a fixture with two clashes reports one | every clash, same-type or not, is reported in one run with its block and attribute |
| G6 | `scripts/check-media-contract.py::contract_problems` (AC-2) only checks names starting with the slot prefix and a guessed stem list, so `photoTablet`, `badgeImageTablet`, `heightTablet`, `aspectRatioTablet`, `mediaTypeTablet`, `videoAutoplayTablet`, `thumbnailTablet`, `backgroundImageTablet` pass | `contract_problems` on those synthetic adopted blocks returns `[]` | each is reported; stems derive from the adopted settings rows, not a hand list |
| G7 | no Stage A guard stops a block declaring `context: background` with `kinds` before WP-8 builds the background renderer (the renderer has no background branch) | a fixture background entry with `kinds` passes every gate | a gate refuses `kinds` on a background entry until the renderer declares background support |
| G8 | `tests/js/media-atom-emitters.test.js` still expects `mask-size: 100% 100%` for hexagon after WP-6 made hexagon's default `keep` | 1 failed, 53 passed | passes |
| G9 | `schemas/media-slot.schema.json` (`scripts/data/media-slot-properties.json`) allows Focal 0 to 100 while FR-49-4, the renderer (`src/components/media/atoms/focal-point.js`) and the migration (`scripts/migrate-media-system/values.py::parse_position`) use 0 to 1 | the schema accepts `{x:30,y:70}` | the schema allows 0 to 1 only |

## Group M: migration tool and cloner

| # | Defect | Baseline | Fixed when |
|---|---|---|---|
| M1 | `scripts/migrate-media-system/mapping.py` derives its rows at run time from live `block.json` entries and `includes/media-element-attributes.generated.php`, both of which Stage B rewrites or deletes, so after adoption `check` can pass by finding nothing and the tool crashes on the deleted mirror | rows come from live files | the 687 rows are committed data (with a `--regenerate` that refuses once a block declares `kinds`), and `check` reads the frozen rows |
| M2 | old attributes with no row and not in `STAYS` are left and unreported: `sgs/decorative-image` `opacity` (80 blocks in the build corpus), `width`, `height`, `borderRadius`, `borderWidth`, `borderStyle`, `borderColour`, `boxShadow*`, `backgroundColour`; `sgs/trust-bar` `badgeImageBorderRadius`, `badgeImageShadow*`; `sgs/buybox` `galleryThumbSize`, `galleryThumbBorderColourHover`, `galleryThumbBorderColourCurrent`; `sgs/post-grid` `showImage`; `sgs/choice-flow` `summaryShowImage`; `sgs/product-card` `brandLogoHeight`, `brandLogoWidth`, `brandLogoMaxHeight`, `brandLogoMaxWidth` | `blocks.migrate('sgs/decorative-image', {opacity:60, ...})` leaves them with no event | each has a row or a `STAYS` entry with a reason, and any old attribute with neither raises a reported event; a self-test enumerates every adopting block's legacy attributes |
| M3 | `drops imageAltTablet` when the tablet has no own file and `videoAlt` on an image kind, with a "converted" event | `blocks.migrate('sgs/media', ...)` drops both silently | dropped values are reported, never silent |
| M4 | the cloner writes Focal as 0 to 100 (`scripts/computed-route/lib/media/style-rows.mjs::focalOf`, repo root) | `focalOf('30% 70%')` returns `{x:30,y:70}` | it returns `{x:0.3,y:0.7}`; tests updated |

## Group R: front-end renderer

| # | Defect | Baseline | Fixed when |
|---|---|---|---|
| R1 | `includes/media/render-slot.php` reads `caption`, `linkUrl`, `linkOpensNewTab`, `linkRel` without the slot prefix and never `LinkUrlSource` or `CaptionTag`, so a prefixed slot loses its own caption and link and takes the block's | a prefixed slot with `itemCaption` renders no caption | the slot's own prefixed caption and link render; link source and caption tag honoured; PHPUnit case per prefix |
| R2 | `src/shared/media/device-video.js::settleVideo` calls `video.load()` on every breakpoint crossing even when the source is unchanged, so rotating a phone restarts the video | rotating with the same source reloads | `load()` only when the chosen source changes |
| R3 | `SGS_Breakpoints` integer edges leave 767.5px and 1023.5px matching no sibling-hide rule, so all siblings show at fractional widths (browser zoom) | at 767.5px both siblings are visible | the renderer's sibling rules use the fractional queries `src/utils/breakpoints.js` already has (PHP twin) and one sibling shows at every width |
| R4 | `assets/css/media-element.css` (50 KB, unconditional) styles the same `.sgs-media-el`/`.sgs-media-box` classes and beats `media-base.css`'s zero-specificity `:where()` rules on an adopted slot | an adopted slot's computed styles come from `media-element.css` | an adopted slot's markup carries a marker the legacy sheet does not match (or the legacy sheet is scoped to unadopted slots), proven by computed styles |
| R5 | the helper decision differs between PHP and JS: PHP's effect list has `surface`, JS `surface-treatment`; hover keys and `inherit` handled differently; no gate covers it | one slot with the surface effect prints the helper in one twin only | one shared list; the parity gate covers the helper decision |
| R6 | inline SVG goes through plain `wp_kses`, which drops `<style>` (class colours) and lets off-site `url()` and `<image href>` through, while uploaded SVG gets the stronger sanitiser | an inline SVG with a class style and an off-site image href | the inline path uses the same sanitiser as uploads (`includes/svg-upload.php` / `helpers-svg-document.php`) |
| R7 | the embed normaliser drops Vimeo's privacy hash (`h`), YouTube's start time (`t`) and returns empty for `youtube.com/live/...`, and autoplay ignores reduced motion | PHP probe: both Vimeo forms lose `h`, `t` dropped, `/live/` empty | all three kept or supported; reduced motion turns autoplay off |
| R8 | `Playback.pause` is read but no pause button renders | an autoplaying video with `pause:true` has no button | the button renders per §8 and Spec 38 §1's pause rules |
| R9 | `sizes` ignores Max width and percentage widths, so eager images print `100vw` | a slot with Max width 480px prints `100vw` | the derived `sizes` takes the smaller of Width and Max width (§7.6) |
| R10 | an image stored with an id but no width and height never takes the lead (the renderer does not look dimensions up from the attachment) | an id-only image above the fold gets no `fetchpriority` | dimensions come from the attachment metadata when missing |
| R11 | `SvgLayer` has no options in `src/components/media/panels/select-options.js` (it has the old `SvgPosition` ones), so the control renders nothing; the emitter honours `behind`/`front` | the Layer order control is null | options Behind content / In front of content with values `behind`/`front` |
| R12 | the shared renderer has no item-set support: `item_set.index` unused, one uid for every item, scalar `columns`, block-level rules re-emitted per item (§8.3, `{uid}-i{index}`) | rendering three items gives identical CSS and uid | per-item scope `{uid}-i{index}`, block-level rules once, `sizes` per device column count |

## Group E: editor

| # | Defect | Baseline | Fixed when |
|---|---|---|---|
| E1 | `src/components/media/panels/*` never wraps Repeat, Tile size, Padding, Corners, Colour, Alignment, Order, Overlay strength and Photo opacity in `ResponsiveOverride` (FR-49-20, AC-14), so they get no dots, no named Reset and no inherited placeholder | none of the nine imports or renders `ResponsiveOverride` | every per-device setting goes through it |
| E2 | a closed panel shows no dot when something inside holds its own device value (§9.2) | `MediaPanels.js` titles are plain strings | the title carries the dot with an accessible name |
| E3 | core's ratio `"1"` does not normalise to `1 / 1`, so "Square - 1:1" appears twice (`Slice/step4-panels.json`) | duplicate chip | one chip |
| E4 | `sizing-model.js::describeSizing` says "ratio 16:9" when Width and Height are both set and "cropped" when Width is auto with no Ratio, and ignores limits | the two cases print the wrong line | the line matches §7.2's table, limits included |
| E5 | the focal picker maps clicks to the whole area while the picture is letterboxed, so tall photos get wrong points; no value announced on focus; duplicate Reset; `Number('')` writes 0 | a click on a portrait photo's edge maps wrong | clicks map to the drawn picture; value announced; one Reset; empty stays empty |
| E6 | no missing-alt warning (§9.5 images, §9.3 embeds) | a non-decorative image with empty alt shows no warning | the inline warning shows |
| E7 | Reset on the Media panel clears Source, Alt and Decorative on every device | Reset on Desktop removes the photo | the Media panel's Reset leaves the file and its alt (Remove does that), resetting only the panel's settings |

## Owned by Stage B (recorded, not fixed here)

- The background renderer (`.sgs-bg-media`, `.sgs-bg-overlay`, Tile and Pinned as CSS backgrounds, Decorative default true): WP-8. G7 guards it meanwhile.
- The gallery's adoption (per-item fields inside each item, the editor adapter for item i): Wave 1, on R12's shared support.
- Saved content in the database (pages, templates, the custom post types): no tool rewrites or checks it; WP-14's Stage B run adds a mirror-database survey, fix and check through wp-cli before AC-25.
- The `build-deploy.py` refusal on an unmigrated target, the pre-commit freeze on Stage B block folders, and the adoption script (§14.1): a Stage B package must own them before the branch opens.
- AC-20, 26, 28 and 29 need adopted blocks: each runs in the Stage B wave that adopts its block.

## Progress

- Groups G, M, R, E: dispatched 2026-11-10.
