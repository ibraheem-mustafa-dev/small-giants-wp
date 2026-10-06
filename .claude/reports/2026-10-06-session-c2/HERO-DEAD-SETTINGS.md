# Why sgs/hero calibrates 34 of 47 settings DEAD (and sgs/media 0)

Read-only investigation, 2026-10-06. No host, browser, edit or reseed was used. Everything below comes from artefacts on disk plus one offline, pure-planning script (scratchpad `plan.mjs`, which imports `lib/calibrate.mjs::planInstances` against the read-only DB and prints the instances it WOULD build; it touches no host).

## 1. Definition of "dead"

`scripts/computed-route/lib/calibrate.mjs::slotFor` returns `{ dead: true }` when, across the three widths, no marked read differs from the default read on any of the setting's own CSS longhands (`if ( ! changes.length ) return { dead: true }`). `scripts/computed-route/calibrate.mjs::calibrateBlock` lists a setting in `dead` only if NO marker of it produced a live read (`deadNames = ... .filter( ( n ) => ! settings[ n ] )`).

So "dead" means only "on the instance the harness built, the marker changed no computed style". It does not distinguish "the block cannot paint this" from "the harness never put the block in a state where it can". Every cause below is one of those two.

## 2. Control: sgs/media

`cache/media.json`: 38 settings, 0 dead, 1 noMarker (objectPosition). Media is a leaf block with one render path: no variant attribute, no sub-element that exists only when something else is set, no shared-wrapper capabilities. `.sgs-media__img` and `.sgs-media__caption` are present on the default instance, so a marker can always reach its element. Hero differs on four counts (variant, partner elements, shared wrapper, child content), each mapping to a cause below.

## 3. What the hero calibration actually built

`calibration-fixtures.json["sgs/hero"]` is `{ bgKenBurns: true, bgVideo: <mp4> }` with inner `sgs/label` and `sgs/heading`. There is one fixture variant, so `variant` stays at its default, `standard`.

`cache/hero.tree.json` (last chunk, 140 instances) and the offline plan agree: none of the 34 dead settings has an instance with `variant:"split"`, a split media source, `bgSvgContent`, a resting overlay colour or gradient, `bgHoverZoom`, or two adjacent text children.

`lib/calibrate-instances.mjs::preconditionsFor` moves `variant` only for rows that ARE a `variant_slots.unique_slot` (DB: `splitMediaImageUrl`, `splitMediaImageUrlMobile`, `backgroundImage`). Every other split-only setting gets no variant precondition. `cache/hero.json::elements` has no `.sgs-hero__media`, `.sgs-hero__split-media` or `.sgs-hero__overlay`.

## 4. The 34, partitioned by mechanism

| Code | Mechanism | Count | Settings |
|---|---|---|---|
| A | Split-variant-gated: the element exists only when `variant=split` and a split media source is set; the instance is `standard` with no media | 23 | mediaBackground, mediaPadding, mediaBackgroundGradient, gridTemplateColumns, splitMediaObjectFit, splitMediaWidth, splitMediaHeight, splitMediaBorderRadius, splitMediaBorderRadiusTablet, splitMediaBorderRadiusMobile, splitMediaBorderStyle, splitMediaBorderWidth, splitMediaBorderColour, splitMediaBorderColourGradient, splitMediaPadding, splitMediaAspectRatio, splitMediaMinHeight, splitMediaMaxWidth, splitMediaMaxHeight, splitMediaBorderColourHover, splitMediaBorderColourHoverGradient, splitMediaOverlayColour, splitMediaOverlayGradient |
| G | Overlay partner missing: `.sgs-hero__overlay` exists only when a RESTING overlay colour or gradient is set; these three style it but the instance sets only `backgroundImage` | 3 | backgroundOverlayBlendMode, backgroundOverlayColourHover, overlayGradientHover |
| C | Tier background image, cause not determined | 2 | backgroundImageTablet, backgroundImageMobile |
| B | Marker outside the setting's real vocabulary | 1 | verticalAlignment |
| D | Fixture lacks the companion content | 1 | bgSvgOpacity (needs `bgSvgContent`) |
| H | Fixture lacks the companion content (child-gated) | 1 | textIndent (needs two adjacent text children) |
| I | Marker gap: missing flag and wrong state | 1 | bgHoverZoomScale |
| F | Fixture side effect (Ken Burns) | 1 | backgroundColourHoverGradient |
| E | Probable real block defect (CSS override) | 1 | maxWidth |

Total 23+3+2+1+1+1+1+1+1 = 34.

## 5. Hypotheses and evidence

**H-A, split gating. Confirmed for 22; probable for gridTemplateColumns.**
- `hero/render.php::$media_html` is built only inside `if ( $is_split && ! empty( $split_tiers ) )`, and `.sgs-hero__media` / `.sgs-hero__split-media` come only from there. `$is_split = ( 'split' === $variant )`; block.json `variant` defaults to `standard`.
- The offline plan shows all 22 instances carry no `variant` or media attributes; `cache/hero.json::elements` has neither element. The only split instances in the tree are a content baseline (`cr-cal-hero-content-base-variant`) and the `variant` discover instance, and neither has a media source.
- gridTemplateColumns: `render.php` reads it into `$split_col_tiers` and emits `grid-template-columns` under `if ( $is_split )`. It is also dead on sgs/container, cta-section, card-grid and others, so whether the shared wrapper offers a separate live path is unproven (section 9).
- Falsifiable by E1 below.

**H-G, overlay partner. Confirmed by code.** `render.php::$overlay_decls = sgs_overlay_decls(...)`; the span and every overlay rule are emitted only when `'' !== $overlay_decls`, and `includes/helpers-tokens.php::sgs_overlay_decls` returns `''` unless a colour or gradient paint exists. Blend mode is an argument to that same call, and the hover colours are commented "gated on the span existing". `backgroundOverlayColour` and `overlayGradient` are LIVE on hero (slot `.sgs-hero__overlay`), proving the element appears once the resting paint is set. The same three names are dead on container, multi-button, site-footer, trust-bar and physics-canvas, so this is a harness-wide partner gap.

**H-B, verticalAlignment. Confirmed by code.** `render.php::$vertical_align_map` knows only `top`, `center`, `bottom`; anything else falls to `'center'`, which equals the default. The only marker built is `space-between` (derived from the CSS property `justify-content`). block.json declares `verticalAlignment` as a bare string with no `enum`, so the harness cannot learn the vocabulary. This is a marker gap and a declaration gap; the block behaves correctly.

**H-D, bgSvgOpacity. Confirmed.** The wrapper paints the SVG layer only when `$has_bg_svg = ! empty( $bg_svg_content )` (`includes/class-sgs-container-wrapper.php`). The sgs/container fixture sets `bgSvgContent` and `bgSvgOpacity` is LIVE there (`.sgs-container__svg-bg`). Hero's fixture sets none. Fixture gap.

**H-H, textIndent. Confirmed.** `render.php` passes `$root_sel . ' :is(p, .wp-block-sgs-text) + :is(p, .wp-block-sgs-text)'` to `includes/helpers-typography.php::sgs_typography_css_rule`, so `text-indent` paints only on the second adjacent paragraph. Hero's fixture children are a label and a heading. The sgs/container fixture has two `sgs/text` children and textIndent is LIVE there (`.sgs-container__inner > p:nth-of-type(2)`). This is the one genuine containerness effect: the setting paints on a child the fixture lacks.

**H-I, bgHoverZoomScale. Marker gap, partly proven.** The wrapper emits the zoom CSS only when `bgHoverZoom` is true, Ken Burns is off, a background image exists and no video is present (`class-sgs-container-wrapper.php::$bg_hover_zoom`, `includes/container-bg-hover-zoom.php::sgs_container_bg_hover_zoom_css`), and only under `:hover`. `calibrate-instances.mjs::gatingToggle` auto-sets only boolean gates named `show|enable|has|use*`, so `bgHoverZoom` is never set, and the row's `css_state` is null so it is read at rest. Dead on container, cta-section, multi-button, physics-canvas, site-footer and trust-bar for the same reason. On hero the Ken Burns fixture is a second, independent blocker.

**H-F, backgroundColourHoverGradient. Code-derived, not measured.** The hover gradient paints `background-image` on the root `:hover` (`render.php::$hover_background_decl`), but `hero/style.css` contains `.sgs-hero--ken-burns { background-image: none !important; }` and `render.php` adds `sgs-hero--ken-burns` whenever `bgKenBurns` is true. The hero fixture sets `bgKenBurns: true` on every instance. The setting is LIVE on brand-strip, buybox and the container family, whose fixtures have no Ken Burns. Inferred cause; E2 falsifies it.

**H-E, maxWidth. Code-derived defect, not measured.** `hero/style.css` has `section.sgs-hero { width:auto; max-width:none; }` (specificity 0,1,1). The wrapper writes the tier value as `.{uid}{max-width:...}` (`class-sgs-container-wrapper.php`, `$obj_outer_sel = '.' . $uid`, specificity 0,1,0), which would lose. maxWidth is LIVE on container and almost every other block and dead only on hero and product-card. If true, hero's maxWidth inspector control does nothing: a real framework bug that calibration correctly reports. E3 decides.

**H-C, backgroundImageTablet/Mobile. Not determined.** The marker sets only the tier attribute with no base `backgroundImage`; the wrapper paints tier images on `.uid::before` inside `@media`. They are dead on container, cta-section, multi-button, physics-canvas, site-footer and trust-bar too, and live only on site-header (slot `@controls:2`), so the cause is shared and not hero-specific. Hero adds possible Ken Burns interference (`.sgs-hero--ken-burns.sgs-container--has-bg-image::before { background-image: inherit }` inheriting `none !important`). I did not prove which factor applies.

**Killed hypotheses**
- "Hero is a container, so its settings cannot paint": killed as a whole. Only H-H is a containerness effect.
- "Calibration read-path defect" (hover not triggered, reads missing): `untestedStates` is empty and `rejected` is 0; `backgroundColourHover`, `textColourHover` and `borderColourHover` are live on hero under the same hover trigger. No evidence of a read defect.
- "Declaration gap in general": not for the 23 split settings. block.json, the DB and render agree they are split-only and render is right. A declaration gap exists only for verticalAlignment (no enum).

## 6. Conclusion

Hero's 34 is overwhelmingly a harness and fixture gap, not a defect of hero. The calibration builds hero as a standard-variant, video-background, Ken Burns, label-plus-heading instance, and the harness has no mechanism to put variant-gated, partner-gated or child-gated settings into the state where they paint. 23 are the split variant never being built; 3 need a resting overlay; 4 need companion content or flags the fixture or marker rules omit; 2 are undetermined shared-wrapper cases. One (maxWidth) is probably a real hero bug that calibration correctly reports.

Confidence: A, G, B, D, H high (code plus a cross-block control). I medium-high. F and E medium (CSS-derived, unmeasured). C low.

## 7. Recommendation (no fix made)

1. Add a split fixture variant for hero (`{ variant:"split", splitMediaImageUrl:<image> }`), which should clear 22 and possibly gridTemplateColumns. The general fix: make `preconditionsFor` derive the variant from a row's `css_element` (`split-media`, `media`, `media-overlay`) through `variant_slots`, so the next variant-gated block needs no hand fixture.
2. Add the overlay partner rule: an overlay-qualified hover or blend setting gets a resting `backgroundOverlayColour` precondition (clears 3 here and the same names on 6 other blocks).
3. Declare an `enum` (top, center, bottom) on hero `verticalAlignment` and have `markersFor` read it, so the harness learns the real vocabulary.
4. Remove `bgKenBurns` from the hero default fixture or give it its own variant; add two adjacent `sgs/text` children and `bgSvgContent` to the default (sgs/container's fixture is the template).
5. Treat `maxWidth` as a hero bug only after E3 confirms it.
6. In any ledger or score that quotes the 34, read it as "settings the harness could not reach", not "settings the block cannot paint".

## 8. Live experiments left for the main thread (not run: the host is in use)

**E1 (proves A, D, H).** Add a hero fixture variant `{ "variant":"split", "splitMediaImageUrl":"<image url>", "bgSvgContent":"<svg ...>" }` and two adjacent `sgs/text` inner blocks, then run
`node scripts/computed-route/calibrate.mjs --site eye-care-test --client eye-care-ward-end --blocks sgs/hero --recalibrate`.
Predicted: the 22 split settings, bgSvgOpacity and textIndent leave `dead`. Any of the 22 that stays dead is a genuine split-render or declaration gap.

**E2 (proves or kills F, I, C).** Same command with `bgKenBurns` removed from the fixture. Predicted: backgroundColourHoverGradient turns live; bgHoverZoomScale stays dead until `bgHoverZoom:true` is set (proves the marker gap); backgroundImageTablet/Mobile stay dead if the cause is the shared wrapper and turn live if Ken Burns was the blocker.

**E3 (proves or kills E).** On the canary, render one hero with `maxWidth:{desktop:"37px"}` and read `getComputedStyle(root).maxWidth` at 1440 for `tagName:"section"` and for `tagName:"div"`. If H-E is right: `none` for section, `37px` for div. A `37px` result for section kills H-E.

**E4 (gridTemplateColumns).** After E1, if it is still dead under `variant:"split"`, the wrapper-path question is open and needs a read of `SGS_Container_Wrapper` at layout=grid on a standard hero.

## 9. Could not determine

- Why backgroundImageTablet/Mobile are dead (shared wrapper versus Ken Burns).
- Whether maxWidth is overridden by `section.sgs-hero` (specificity inferred, not measured).
- Whether gridTemplateColumns has any live path on a standard hero.
- `cache/hero.tree.json` holds only the last chunk (140 instances), so the per-instance attributes above come from the offline plan, which reuses the same planner but is not the exact chunk the host built.

---

## Main-thread QC of this report (2026-10-06)

Three load-bearing claims were re-checked against the code. **Two confirmed, one disproven.**

**CONFIRMED — the definition of "dead".** `scripts/computed-route/lib/calibrate.mjs` returns
`{ dead: true }` from the slot resolver when no marker moved a computed style on the instance the harness
built. So "dead" is a statement about the fixture, not a verdict on the block, and the report's framing is
right.

**CONFIRMED, and stronger than the report says — the tier background images are a SYSTEMIC pattern, not an
undetermined loose end.** `backgroundImageTablet` and `backgroundImageMobile` are dead on **exactly 7
blocks, both settings on every one**: `container` (14 dead), `cta-section` (15), `hero` (34),
`multi-button` (8), `physics-canvas` (7), `site-footer` (9), `trust-bar` (20). Every one is wrapper-based.
That is 14 dead entries from one mechanism across 7 blocks, which puts it over
`.claude/THE-MIGRATION-METHOD.md`'s "more than 3 files getting the same change — build the detector first"
threshold. **It should be the first of the four experiments run, not the last**, because it is the only one
whose answer generalises beyond hero.

**DISPROVEN — `maxWidth` is not defeated by `section.sgs-hero`.** The report has it that
`section.sgs-hero { max-width: none }` outranks "the wrapper's `.uid{max-width}`". The arithmetic does not
support that:

- `hero/render.php` sets `$root_sel = '.' . $uid . '.wp-block-sgs-hero'` — **two classes**, specificity
  (0,2,0).
- `hero/style.css`'s `section.sgs-hero` is one element plus one class, specificity (0,1,1).

Two classes beat one class plus an element, so the emitted `maxWidth` rule **wins** and the stylesheet does
not defeat it. The hypothesis assumed a single-class `.uid` selector that hero does not use.

Also worth recording against that claim: `section.sgs-hero { width: auto; max-width: none }` is
**deliberate and documented**, not sloppiness. Its own comment cites a 2026-09-08 qc-council that proved
live that negating a padding nothing ever applied shifted the section 24px off-screen
(`document.documentElement.scrollWidth > clientWidth`), and ties it to D725's width model: a top-level
section paints edge-to-edge by NOT being capped. Treating it as a bug to remove would re-break that.

**So `maxWidth`'s deadness is UNEXPLAINED, not probably-a-bug.** It returns to the undetermined list and
needs its live experiment. The honest count is therefore **29 high-confidence, 4 medium, 3 undetermined**
(the two tier images plus `maxWidth`), rather than one probable block bug.

**Not re-checked here:** the 23 split-variant-gated settings and the overlay/Ken Burns partitions. The
split-variant mechanism matches the main thread's own prior before dispatch (hero's variant-gated families
only paint in a variant the fixture never builds), and the report's per-setting evidence is cited; they were
taken as read rather than independently re-derived.
