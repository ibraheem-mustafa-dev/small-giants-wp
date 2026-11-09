# QS-B: goal and rulings audit of Spec 49 v0.5 and P-proposal

Rater B. Read-only. Yardstick: `E:/sgs-tmp/media-qc/bean-prompt-1.md`. Paths under `plugins/sgs-blocks/` unless stated. "Not verified" marks anything I did not run or open.

## Verdict on rulings

| Ruling | Result |
|---|---|
| Media-first, no box in the editor | Honoured (§3, §6.3, glossary "Helper... never named in the editor") |
| Ratio, Width, Height, Min/Max separate, no modes | Honoured (FR-49-5, §6.4, §7.2) |
| Circle in the Shape grid | Honoured (FR-49-32, §7.5) |
| Duotone and Lottie as a kind left out | Honoured (§2 non-goals, §13) |
| Videos play on phones | Honoured (§8 defaults: background video on every device) |
| No CSS size target | Honoured (§3 line "not a target"); the sentence "CLAUDE.md's page budget still applies" sits beside it and reads as a target, reword |
| New code lands dormant, one scripted release | PARTLY CONTRADICTED, finding 8 |
| Per-device video, embed, SVG files stay | Honoured for same-kind files (FR-49-9, §7.1), but the neighbouring per-device kind capability is cut, finding 1 |
| Atoms judged per atom | Honoured (§6.2 table, AT matrix) |
| Hover and Entrance full libraries on media | Honoured for those two panels (§10.1); NOT for Effects, finding 3 |
| Mask shapes in the first release | Honoured for built-in shapes (WP-6, Stage A, switched on at Stage B). The proposal's "Cut: uploaded mask shapes" and §14.1 Stage C "uploaded masks" go further than Bean's words; Bean should confirm "mask shapes" never meant uploads. Not verified what Bean meant |
| Reference implementations modelled | Mostly, finding 7 |

## Findings, most serious first

### 1. A different media kind per device is cut, but it exists and works today on the hero split

Problem: FR-49-9 ("A slot holds one kind; each device can have its own file of that kind"), §2 non-goals and the proposal's cut list remove image on desktop with video (or the reverse) on mobile. The hero split block does this today. `src/blocks/hero/render.php` (comment above the split-media resolution): "each with a per-tier `splitMediaType*` saying which kind that tier uses"; `src/blocks/hero/block.json::attributes.splitMediaTypeTablet` and `splitMediaTypeMobile`. T1 §186 lists "split tiers" as per-device. The container background carries image tiers and video tiers together (`includes/class-sgs-container-wrapper.php`, `$bg_image_mobile`, `$bg_video_mobile`). Video on desktop with a still image on mobile is the most common hero pattern clients ask for. The cut rests on a census of saved content (T-merge row "Different media kind per device": "T8 none; saved per-device use is same-kind only"), and T8 itself warns that three drafts from one tool "cannot stand for what clients ask for" (T8 line 185). The proposal mentions the cut in one phrase and does not say the hero split does it today. This is the same class of mistake as the per-device video case Bean already caught.

Evidence: above; §8 already stores `kind` inside each device's `Source` value, so the data model supports it and only FR-49-9 forbids it.

Change: delete the "one kind per slot" limit from FR-49-9. Render rule: if every device resolves to an image, print `<picture>`; otherwise print one sibling per device (the sibling mechanism §7.1 already has for video, embed and SVG), `preload="none"`, lazy. Drop the AC-4 line that removes the mixed-kind case and restore it. Keep cost low: no new component, because `MediaSlotField` already shows kind tabs per device. Tell Bean this was nearly cut.

### 2. Cuts and removals not told to Bean, one of which narrows a working client capability

Problem: the proposal's "Cut for simplicity" list omits things the spec removes. Working today and removed or downgraded without being told:

| Removed | What works today | Spec text | Proposal says |
|---|---|---|---|
| `sgsColourTreatment` ("white" filter, colour logo turned white on a dark footer) | `src/blocks/extensions/image-controls.js` (control and `attrs.sgsColourTreatment === 'white'` branch), declared via `imageControls` on card-grid, gallery and team-member | §13: "Brand strip `imageEffect`, `sgsColourTreatment` -> Hover filter where it is grey to colour; otherwise Custom CSS, reported". The new filter atom has only Greyscale and Blur (§8) | Silent |
| `backgroundAttachment: fixed` ("Fixed (parallax)" in the Background panel) | `src/blocks/container/components/BackgroundPanel.js`, `includes/class-sgs-container-wrapper.php`; T10 line 129 lists it as an unrun fixture | FR-49-29: "`backgroundAttachment` MUST be removed"; §10.3 Pinned deferred to Stage C; §10.5 calls Pinned "Missing" | Lists only "Pinned" under "After cutover" |
| `logoSwitchCustomPx` (a logo's own switch width) | `responsive-logo` | §10.4: "removed", §13 "Deleted; nearest device, reported" | Silent |
| `imageSize` dropdown on product card, gallery, post grid | Client picks the WordPress size | §2 non-goals, §13 "Deleted; sizes are derived" | Silent |
| Per-device `hideOnTablet`/`hideOnMobile` on decorative image | Works | §13 maps to universal `sgsHideOn*` | Fine, but not mentioned |

Q3 §6 confirms these particular items have little saved use; the point is that Bean was not told, and the brief says "tell Bean what you cut". A white-logo-on-dark-footer control is a first-order client need (headers, footers), and Custom CSS is not an inspector control (CLAUDE.md: "Every customisable property has an inspector control").

Change: (a) replace the new Greyscale and Blur `filter` atom (no draft and no saved block uses a static media blur or greyscale: Q3 §6, T8 line 183) with one "Colour" chip control: Natural, Black and white, White. That keeps the working capability, covers the cloner's `filter: grayscale()` and `brightness(0) invert(1)` rows, and removes Blur as a media setting nobody asked for. (b) Say in §10.3 that the Fixed attachment control exists today, and either keep it on the background element for Stage B (Gutenberg Cover does it: `background-attachment: fixed`, reset to scroll on iOS and under reduced motion, A1/A2) or list its removal in the cut table with the interval. (c) Add rows for the three silent items to the proposal's cut list.

### 3. Effects: the spec builds a short per-kind list where Bean directed the existing libraries, and misses a built effect

Problem: Bean: "media should get [the large preset library], not a short list" and the registry should decide. §10.1 says "no media-only list is kept" and then prints exactly a media-only list per kind (Effects, image: parallax, Ken Burns, float, scrub; embed: float). The registry (`sgs-framework.db`, `fx_effects`) holds element-scope effects with `requires = none` that a bare media element can take: `follow-pointer`, `glare`, `ripple`, `sheen`, `curtain`, `scroll-progress`, `magnet`, `morph`, `motion-path`, `ambient-float`, `parallax`, `lottie`. The spec offers morph and motion path on SVG only and excludes sheen, glare, ripple because "a bare `<img>`... cannot hold" a pseudo-element, yet §7.3 already prints the helper for hover scale, parallax and overlay, so the same trigger could cover them. Also: `surface-treatment` (`fx_effects`, `requires = image`, `tier = W`, WebGL shader on the first `<img>` of the block) is built on 16 image blocks and not on `sgs/media` (T9 line 55). grep of the spec for `surface-treatment` returns nothing. It is the one "impressive" image effect SGS already has, and `sgs/media` is where clients would look for it. T9 also marks it "not verified"; T10 line 102 "not run: no fixture".

Evidence: DB query above; T9 line 55 and line 87; spec §7.3, §10.1.

Change: make §10.1 a filter, not a list: a part offers every `fx_effects` row whose `scope`, `requires` and kind tests pass, with the helper printed when the effect needs a layer (add sheen, glare, ripple, curtain to the §7.3 triggers). State the unsupported ones by reason, not by omission. Add `surface-treatment` to image media in the proposal, with a fixture and one run before promising it, and mark it "unproven" if it fails. Also fix the proposal line "The framework's 60 effects... none broken" against 30 not run: say plainly that half were never run, so "offered" means "registered", not "proven".

### 4. Over-building: three pieces of new machinery where a simpler existing route exists

| New machinery | Where | Simpler | Why |
|---|---|---|---|
| A five-rule loading resolver, a pre-pass over the parsed block tree of template, parts and content, per-request claims, `SGS_Media_Priority`, PS-5 | §7.7, C5, WP-3 | Pass `wp_get_attachment_image` the slot's Load priority, and let core's `wp_get_loading_optimization_attributes` and `wp_maybe_add_fetchpriority_high_attr` decide the rest, keeping only the three Load priority values and the "hidden surface is lazy" rule | A1 area 6 names the WordPress function as the model; the spec already copies its 50,000 px rule. Not verified: whether core's counter sees blocks rendered inside template parts as well as post content; if it does not, a small header-slot flag is enough, not a tree pre-pass |
| A JSON grammar `css-value-grammar.json` with a type-keyed validator in PHP generated into JS and a gate over every emitter output | FR-49-12 | Existing `sgs_css_gradient_value`, `sgs_background_paint_decl` and the token helpers (H1 already done in `24095ea4f`), plus one gate that fuzzes the emitters | Q3 §1 shows existing helpers already cover colour, gradient and border; a grammar engine is a second source of truth. Not verified: coverage of lengths |
| Fill built from `height:auto; min-height:100%; flex:1 1 auto; align-self:stretch`, a `::before` of 12rem, a `:has(> .sgs-media-fill)` rule on `.sgs-container__inner`, a mandatory grid or flex-column content band, 13 layouts proved in three browsers | §7.2, PS-2, FR-49-38, AC-27 | Cover's pattern: the container owns a min-height, the media is absolute at `inset:0`. A1 area 3: "Spec 49's `::before` 12rem is the same idea as Cover's `min-height`" | The extra rules exist to make "Match its space" work inside a stretched row. T8 shows drafts use `height:100%` of a definite parent; keep Fill for that case only and refuse the rest with the editor message already specified. Cuts a rule that targets another block's inner class from a media stylesheet |

Also heavy but justified by the goal, do not cut: the atom reuse, the generator (Gutenberg and Stackable both generate attributes from one declaration, A3 area 1), the slice gate. Questionable: 32 acceptance tests and 13 work packages for a goal that says "not absurdly fancy". Proposal should show Bean the count honestly (T-merge reduced the matrix 30 to 12; it did not reduce ACs below 31).

### 5. Existing working parts replaced or rebuilt where reuse would do

Checked against code. Each below works today and the spec rebuilds it:

| Part | Today | Spec | Reuse instead |
|---|---|---|---|
| `src/utils/background-preview.js` | Shared by `border-preview.js`, `button/focus-style.js`, `icon/icon-state.js`, `social-icons/group-shadow.js`, `decorative-image/layer-preview.js`, `section-preview.js`, `svg-gradient-preview.js` (Q3 §1) | §6.2 says it "is split so `borderPaintPreview` survives" | Fine, but §8.2 text and WP-15b must name the seven importers; the proposal's "Delete" row does not. Listed in the spec only as a split, so low risk |
| Editor previews for Fit, Focal, Ratio, Height, mask, filter, opacity, overlay | `src/components/media/canvasStyle.js` (deleted in §8.2) | §6.2 claims the editor reuses `border-preview.js`, `radius-preview.js`, `spacing-preview.js` | Q3 §1: those cover border, corners, padding only. The rest is new work, so "Extend" understates it. Say so, or reuse the PHP emitter's output in the editor (FR-49-24 already wants identical CSS) |
| `sgs_responsive_image`, `sgs_render_media`, `sgs_tier_media_render` | Work; used by gallery, card-grid, post-grid | Replace with the renderer | Acceptable (the owner asked for one renderer), but per-device video, embed and SVG sibling switching in `sgs_tier_media_render` must be ported with its tests, not rewritten from §7.1 |
| `includes/image-controls.php` and `extensions/image-controls.js` | Universal Fit, Focal, Height, Max width, Colour treatment on 14 declaring blocks; T3: "13 of 15 were dead" | Delete | Right to delete; but see finding 2 for the one live control |
| The three private hover-zoom copies and core-blocks hover rule in `theme/sgs-theme/functions.php::enqueue_global_layout_fixes` | Work | One route | Agreed (§10.5) |
| `sgs_hidden_render_*`, `sgs_allowed_svg_tags` | Work | Moved first | Agreed (§8.2) |

Net: the owner found per-device files and the atoms; I found no further atom or helper wrongly deleted, apart from the two capabilities in findings 1 and 2.

### 6. Cloner and client needs: two mappings downgrade to Custom CSS that a client sees

Problem: §11 sends `object-position` not expressible as `{x,y}`, `background-attachment: fixed`, other filters, and polygon `clip-path` beyond 1% of a registry shape to "Custom CSS, reported". Custom CSS is not an inspector control and T8 line 185 warns the census is narrow ("controls should be built from the CSS property space and from client briefs, not trimmed to this census"). `background-attachment: fixed` ties to finding 2. `object-position` keywords with an offset (for example `left 20% top`) are common in drafts; §13 handles keywords but §11's row reports the offset form. Evidence: §11 rows 7, 16, 29, 14; T8 line 185. Change: parse `object-position` offsets (`left|center|right` plus length or percent, and `top|center|bottom`) into `{x,y}` percentages in the cloner (a pure function, tested); keep the polygon fallback, which is rare and honest.

### 7. Reference-model claims in the proposal overstate A1 to A4

Problem: the proposal's control table says Per-device "Modelled on Elementor, Stackable, improved". A3 area 2: "Display of inheritance in the inspector: not verified in any of the three"; Stackable stores flat sibling attributes while SGS stores a nested object (a documented SGS decision, Spec 35 D5, not modelled on Stackable). The proposal's "no proven model" list also omits original parts that A1 itself flags: the Fill `::before` floor (A1 area 3: "No proven way to avoid a floor was found"), the helper's file-ratio rule, the default-width resolution rule in §7.2 (`auto` when Ratio and Height are both set), the lead-image pre-pass, the three-row overscan table (A2: "Q2's `ratio x max(0, scrollY - blockTop)` has no Motion equivalent") and the Stage A/B cutover (A3 area 7: "nothing better to copy"). The caption rule is described as "Gutenberg's own pattern" but Gutenberg applies `display:table` only to `.aligncenter` and floats (A1 area 4). Change: correct the proposal's "Modelled on" cell for per-device; add the unmodelled items to "No proven model found" with the proof that backs each (PS-2, PS-7, Q2); reword the caption line to "adapted from Gutenberg's centred-image rule, proved in three browsers by PS-2".

### 8. "Dormant on main" is not true of Stage A2

Problem: Bean: "New code lands dormant on main; one scripted release switches all blocks." §14.1 Stage A2 lands live shared changes before the cutover: the `ResponsiveOverride` display change (135 importers beyond media, §9.2), `icon-shapes.json` additions, WP-0b's wrapper split of `includes/class-sgs-container-wrapper.php`, plus WP-H, the header fix, ahead of Stage A. Q3 §2 also shows the `icon-shapes.json` additions break `IconOutlineShapesTest` and `tests/js/icon-shapes-parity.test.js` on the first added slug, so A2 is not inert. Also Bean's step 5 runs WP-6, 10a, 13, 14 in parallel with WP-2 to 5; §14.1 holds them behind a Slice gate and the proposal never tells Bean the order changed. Evidence: §14.1, §9.2, Q3 §2, bean-prompt-1 step 5. Change: either state in the proposal that A2 is three small live changes with their own checks and ask Bean to accept that, or defer the `ResponsiveOverride` display change into the cutover (it is only useful once media uses it) and keep `icon-shapes.json` additions in a file the icon readers skip (`surfaces` filter, already in §7.5). Say in the proposal that the Slice gate reorders Bean's step 5.

### 9. Smaller inconsistencies

| Where | Problem | Change |
|---|---|---|
| FR-49-25 vs §9.5 and AC-17 | FR lists "oversized" states; §9.5 and AC-17 have none, and the proposal says the upload-size warning is cut | Remove "oversized" from FR-49-25 |
| §10.5 "Pinned: Missing" | Contradicted by the existing Fixed attachment (finding 2) | Reword: "Fixed attachment built; Pinned (iOS-safe) rebuilds it" |
| §10.1 "Hover ... whole library (31 presets today)" | The 31 include `sheen-*` (3), which §10.1 later excludes from media | Say "all except sheen" or include them via helper (finding 3) |
| §3 "CLAUDE.md's page budget still applies" | Sits beside "not a target" | Delete the clause or say "unchanged, not gated here" |
| P-proposal "Audit... 28 work, 3 partly... 30 could not be run" | Reads as a clean bill | Add "so 30 effects are registered but unproven" |
| `sgs_shadow_lift_enabled` default | Defaults lift ON when attr absent (Q3 §1); §8 row says generator writes lift off | Keep, but make the generator default a gate check, not prose |
| Q3 §7 undisposed attributes (`brand-strip` `logoFit` etc., `iconSvg`, per-slot `*Decorative`) | v0.5 §13 adds some rows; I did not re-diff every one | Not verified whether all Q3 §7 rows now exist; re-run Q3's method against v0.5 |

## What is simplest and should stay

The atom extension (not a rebuild), generator writing `block.json`, `<picture>` plus sibling split, helper only when needed, one shape registry extended in place, parallax driver kept with the native path as Stage C, and `ResponsiveOverride` reworked rather than replaced.
