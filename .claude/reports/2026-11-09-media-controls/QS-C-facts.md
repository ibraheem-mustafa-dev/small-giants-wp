# QS-C: contradictions and facts, Spec 49 v0.5

Scope: `.claude/specs/49-SGS-MEDIA-SYSTEM.md` read in full (829 lines), checked against `plugins/sgs-blocks/`, `theme/`, `scripts/`, the framework DB and the reports in this folder. Counts: 2 Critical, 14 Important, 12 Minor.

## Verified true (no action)

| Claim | Evidence |
|---|---|
| 15 atoms, 20 `mediaElements` blocks | `src/components/media/atoms/registry.js` (15 ids); `grep mediaElements src/blocks/*/block.json` (20 blocks with an entry); `AT-atom-block-matrix.md` |
| Hover 31 presets, Entrance 80 | `sgs-db.py sql "SELECT panel,kind,COUNT(*) FROM motion_presets GROUP BY 1,2"`: hover 10 preset + 21 intensity; entrance 19 + 51 + 10 keyframe |
| `property_equivalents` row turning an image height into max-height | DB: `height -> max-height, self, intrinsic-ratio` |
| Every kept file and symbol in §6.9 and §8.2 exists | `sgs_collect_css`, `sgs_instance_scope_hash`, `sgs_end_shape_url` (`helpers-end-shape.php`), `sgs_media_cover_crop_plan`, `sgs_hidden_render_*` (`helpers-media.php`), `sgs_svg_kses_allowed_tags`, `sgs_allowed_svg_tags` (`helpers-tier-media.php`), `ShadowControl`, `SgsBorderControl`, `SgsBoxControl`, `SgsLengthControl`, `MediaElementPanel` |
| The `qa-lottie` page 4087 is the only saved Lottie | `T2-blocks-rest.md` line 360 |
| `img[data-sgs-mc~="background-position"]` rule | `assets/css/motion.css` |
| Overscan formula: ratio 0.18 gives 9 percent of H at page top | `|r| x H / 2` = 0.09 H |

## Critical

**C-1. Stage A "new files only, adopted by nothing" is stale after the atom decision.** §6.8 and §14.1 ("Stage A1, dormant on main. New files only, adopted by nothing"; "at no point do two render paths serve one block"; A2 lists only three live changes) against §6.1, §6.2 and §14.4. WP-1, WP-2a, WP-2b, WP-4 and WP-5 are all Stage A and all edit live shared files: the atom registry, the PHP twins (`includes/media/atoms/*.php`), `SGS_Media_Element`, `MediaElementPanel`, the generator (which now writes `block.json`), and WP-2b folds `media-type` and `intrinsic` and splits `box-shape`. Those are used by the 20 declaring blocks today, so each edit is live the moment it merges. Also live and unlisted in A2: `theme.json settings.viewport` (WP-1). Fix: rewrite §6.8 and §14.1 so Stage A is split into "new files" and "edits to live atoms, each behind an unchanged-output check (the parity gates plus AC-3's fixture)"; add the atom edits and the `theme.json` change to A2; drop "no two render paths" or restate it as "one path, edited in place".

**C-2. The Slice gate needs packages that start after it.** §14.1: the gate is "after WP-1, 2, 4, 5" and needs "sgs/media image kind plus one container background, migrated on one mirror, one real clone built". WP-14 (the migration tool), WP-13 (cloner route) and WP-8 (container backgrounds, Stage B) are all "start only after it passes". Nothing can pass the gate as written. Fix: either add a named "slice" subset to WP-14 (detector for sgs/media only), WP-13 (old cloner is acceptable for the one clone) and WP-8 (container background only), or say the gate is judged with the old tooling and hand migration.

## Important

**I-1. Uploaded masks: non-goal and Stage C item.** §2 non-goals: "uploaded mask shapes". §14.1 Stage C: "the native parallax driver ..., Pinned, and uploaded masks". Fix: delete "uploaded masks" from Stage C (or from the non-goals and add an FR and a test). Pinned and the native driver also have no FR; only the driver has a test (the §12 closing paragraph, unnumbered). Give Pinned an FR and AC or state it is untested.

**I-2. SVG loop: retired or kept.** §6.2 and §8 keep `SvgAnimation`, `SvgAnimationSpeed` on the `svg-presentation` atom ("Keeps animation, speed and text shadow"). §10.5 says "Float, SVG loop, draw ... retire the SVG presentation atom's copy"; §10.1 lists "SVG loop" under Effects for SVG. Fix: pick one. If Effects owns it, remove `SvgAnimation*` from §6.2, §8 and §9.4's SVG panel, and add `svganimation*` to §13.

**I-3. §6.1 overstates the atom evidence.** §6.1: "no atom fails on any block that declares it (AT-atom-block-matrix.md ... run in code and on live pages)". `AT-atom-block-matrix.md` §4 and §6: media-padding, link, opacity, svg-presentation, intrinsic, box-shape on media, and 14 blocks are "not run"; "Pairs that fail": object-fit on image-sequence, trust-bar, brand-strip, card-grid, gallery and team-member (control side), and overlay on hero (declared and rendered, no editor control). Fix: "the gates pass; of the 51 rows, N were run live and none failed; seven pairs have a control gap this spec closes (§6.2)". Count the run rows from AT §4 before quoting a number (not verified here).

**I-4. Several §8 settings have no owning atom.** §6.2 splits `box-shape` into `sizing` and `shape` only. `MEDIA_BASES.shape` today also owns `BorderRadius`, `BorderWidth`, `BorderStyle`, `BorderColour`, `BorderColourGradient` (`src/components/MediaElementControls.js::MEDIA_BASES`); `focal` owns `Position`, `Repeat`, `Attachment`. §8 adds `Radius`, `Background`, `Alignment`, `Order`, `MinWidth`, `Blend`, `Loading`, `Repeat`, `TileSize` with a paint node and emitter, but §6.2 names no atom for them, and §6.2's "New: filter" covers only Greyscale and Blur. Registry `bases` drives selective injection, so an unowned base is never injected. Fix: add rows to §6.2 giving each base an owning atom (for example a `border`/`radius` atom, `layout` for Alignment/Order, `blend`, `loading`, `tile` for Repeat/TileSize), or state which existing atom absorbs it.

**I-5. §13 has no row for several existing attributes, and the tool "refuses any attribute with no mapping".** From `MEDIA_BASES`: `SvgPosition`, `LottieId`, `LottieTrigger`, `LottieSpeed`, `VideoPlaysInline`, `VideoAlt`, `VideoMimeType`; renames `borderRadius`, `borderWidth`, `borderStyle`, `borderColour(Gradient)`, `boxShadow*`, `overlayBlendMode`, `maxWidth`, `maxHeight`, `width`, `height` to the §8 names. Also §8.2 does not remove the Lottie code in `source.control.js`, `video-behaviour.control.js` or the `lottie` entry in the registry `types`, although v0.3 dropped Lottie as a kind. Fix: add the rows and list the Lottie atom code in §8.2 (or keep it and say so in §2).

**I-6. Settings written by §13 or §11 that the slot's §10.4 settings list does not include.**

| §13 / §11 writes | §10.4 row for that block lists |
|---|---|
| Product card `imageFill` to Height Fill | Source, Fit, Focal, Ratio, Radius, Loading (no Height) |
| Card and post grid `imageHeight` to Height | Source, Fit, Focal, Ratio, Radius, Shape, Loading (no Height) |
| Timeline `mediaHeight`, `milestoneMediaWidth` to Height, Width | Source, Fit, Focal, Ratio, Radius (no Height or Width) |
| `tileShape`, `swatchShape` to Shape | option, tile, swatch: Source, Fit (+Focal) (no Shape) |
| `optionMediaSize` to the slot's Width | no Width |
| Buybox `mainPhoto*` to Radius, Border, Shadow | `image`, `thumb`: no Border or Shadow |
| `imagePadding`, `mediaBackground` to Padding, Background | only the hero split row ("all but Caption") covers these |

Fix: add the settings to the rows, or change §13 to "deleted, reported". The generator refuses undeclared names, so the migration would fail.

**I-7. `kind` per device against "a slot holds one kind".** §8: `Source` is a responsive object `{kind,id,url,...}`, so `kind` is stored per device, and §4 defines "Resolved kind: the one at a device after inheritance". FR-49-9 and §2 non-goals ("a different kind of media per device") say one kind per slot. Fix: say `kind` is validated equal across devices (except `none`), or hoist it out of the tier object; the glossary's "resolved kind" then means "kind or none".

**I-8. Opacity on backgrounds has no control.** §13 `bgSvgOpacity` to `Opacity`; `Opacity` is `I V S` in §9.3; but §10.4's background rows and §9.4's Background panel list no Opacity, and §9.3's "Backgrounds show ..." list omits it. Fix: add Opacity to the background settings (or map `bgSvgOpacity` to deleted).

**I-9. Fate of the per-atom stylesheets is unstated.** `assets/css/media-atoms/*.css` (16 partials) and `scripts/generate-media-stylesheet.mjs` paint the custom-property values the twins emit today (`AT` §2: "16 partial(s) in sync"). §6.1 says twins now print real properties "instead of custom-property values painted by a shared stylesheet", and §6.7 says "one small static file". §8.2 does not delete the partials or the generator; no package owns them. Fix: add them to §8.2 or to WP-2a, and name the replacement file (`media-base.css`).

**I-10. FR-49-15 removal has no owner and no grep.** "The theme's own preload emitters in `functions.php` and `inc/font-preloading.php` MUST be removed" (`preload_hero_image` exists in both, `theme/sgs-theme/functions.php` and `theme/sgs-theme/inc/font-preloading.php`). Not in §8.2 (so AC-5 does not grep it), not in any package (WP-3 owns only `class-sgs-media-priority.php`). Fix: add `preload_hero_image` to §8.2 and to WP-3.

**I-11. §8.2 names a stub that does not exist.** "the stub in `scripts/qa/lib/wp-stubs.php`". `grep -n "sgs_render_media\|sgs_tier_media\|sgs_responsive_image" scripts/qa/lib/wp-stubs.php` finds only a comment (line 285) saying those helpers are "never stubbed here". Fix: delete the item (or name the real thing).

**I-12. Undefined class name for Fill.** §7.2: `.sgs-container__inner:has(> .sgs-media-fill)`. No other section defines `.sgs-media-fill`. Today's class is `sgs-media-box--fill` (`class-sgs-media-element.php::CLASS_BOX_FILL`) and §7.3 says the helper is `.sgs-media-box`. Fix: use `.sgs-media-box--fill` or define the new name in §7.1.

**I-13. Registry contract C1 does not match the registry or §6.1.** §6.1: entries are per atom (`id, bases, types, scope, attaches-to, requires, reads, disclosure, css`), gaining `responsive, paintNode, emitter, control, effects, since`. C1 shows a per-base entry (`base`, `enum`, `enumByContext`, `css.paint_node`, `control`, `slots`), no `effects` field, and `paint_node` not `paintNode`. Actual registry (`registry.js::MEDIA_ATOMS`) is per atom with `bases` as an array of names. Fix: state that each atom gains a `settings` array of C1 entries, or restate C1 as the per-atom shape; use one spelling.

**I-14. Package gates and files disagree.** §14.2: "PS-2 and PS-7 gate WP-2 and WP-4"; §14.4: WP-4 needs only WP-1 (WP-2a needs PS-2, WP-2b needs PS-7). §7.2 says one static rule in `media-base.css` handles the Fill content band (WP-2a's file) but §14.4 gives "the Fill content-band rule" to WP-8. Fix: align both.

## Minor

- **M-1.** §7.1 and §7.4 list the layout box's settings as Width, Max width, Alignment, Order; §8 puts `MinWidth` on the layout node and §7.2 sets `min-width:0` there. Add Min width to §7.1 and §7.4.
- **M-2.** Two controls both labelled "Blend" in "Overlay and filters" (§9.4): `OverlayBlend` and media `Blend`. §9.1 says labels print once. Rename (for example "Overlay blend" and "Photo blend").
- **M-3.** §7.9 says embed Alt is `title`, "required"; §9.3 says embeds "warn when empty"; FR-49-25 allows a missing-alt warning only. Pick "warns".
- **M-4.** §7.5: "one closed path each, keeping today's `d` key", but circle, ellipse and pill are `paint: radius` and need no path. Make `d` optional for radius entries. Existing `icon-shapes.json` holds five shapes (hexagon, diamond, octagon, star, blob); "three blobs" and the rest are additions.
- **M-5.** AC numbering skips AC-30; PS numbering skips PS-3, 4, 6; WP numbering skips WP-7, 11, 12 (leftovers). AC-28 and AC-29 are cited by FR-49-18 but §16's FR-to-AC map lists only AC-12 for FR-18. Add them to §16.
- **M-6.** §11 has no row for a decorative `layer` slot (absolute-positioned decoration with offsets); "Other margin or offsets: Not written" contradicts the layer's Position, rotation and anchor controls in §10.4. Add a row.
- **M-7.** FR-49-17 moves the `sgs/business-info` map's width and height attributes to CSS; no package or wave owns it. Add to Wave 4.
- **M-8.** §9.6 and C6 present the `inspector-focus` store as if it existed; `grep -rn inspector-focus plugins/sgs-blocks/src` finds nothing. It is new (WP-10a); say so.
- **M-9.** §9.2 puts components in `src/components/media/`, but `MediaPicker.js`, `FocalPositionField.js`, `MediaSizingPanel.js`, `MediaElementPanel.js` and `ResponsiveOverride` are in `src/components/`, and §8.2 lists them by bare name. Give full paths.
- **M-10.** "135 importers beyond media" for `ResponsiveOverride`: `grep -rn "import.*ResponsiveOverride" src` gives 72 single-line imports (69 outside media paths); 136 files mention it. Say "about 70 files import it" or recount.
- **M-11.** §0 still says "Nothing here is patched. This spec replaces the system"; §6.1 now extends it. Reword to "replaces the system's data model, renderer and controls; the atoms are extended".
- **M-12.** Glossary kinds omit `featured` (§8, §10.4); the Source row adds it. Add it to the glossary. `SGS_Media_Element::render()` (C2) is new; today the class has `style`, `scope_class`, `requires_box`, `element_classes`, `box_classes`, `fills_box`; §8.2 and §10.4 ("their `SGS_Media_Element::style` calls become ...") do not say whether `style` stays. Say it is removed in Stage B.

## v0.3 and v0.4 changes (sizing §7.2, shapes §7.5, per-kind §7.9)

Consistent with each other and with §8, §9.2, §9.3 and §13 on: independent sizing settings with no mode attribute; Ratio unavailable while Height is Fill; the "Not used while Width and Height are both set" note; Circle writing Ratio 1:1; mask shapes omitting Corners and Border; per-kind Fit, Focal and Alt (§7.9 against §8's Fit enum and §9.3's kind columns). Defects found are I-6, M-1, M-3, M-4 and I-12 above. Not verified: the browser measurements quoted in §7.2 (Chrome, Firefox, WebKit figures) and WP's `wp_min_priority_img_pixels` default of 50,000; both come from `Q1-sizing-browsers.md` and WordPress core, which I did not re-run.
