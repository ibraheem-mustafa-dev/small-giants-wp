# U-17 design: the Lottie player (Wave 3C lane C)

Status: design, awaiting /qc-council and Bean's sign-off. Governing: `.claude/plans/2026-09-21-wave-3c-implementation-plan.md` §1h; research `.claude/reports/2026-09-21-lottie-player-research.md`; Spec 38 §1.2a.

## 1. Problem

A designer-supplied animation file (Bodymovin/Lottie JSON exported from After Effects) cannot play anywhere in SGS. buck's logo mark is one. The only moving-logo route today is `sgs/responsive-logo`'s `animationStyle` (stroke-draw of an uploaded `.svg`), which cannot draw fills, masks, mattes or morphs. Spec 38's motion register lists the capability as ABSENT.

## 2. Exit cells (family M-33, `families-master.json::families.M-33`)

| Reference | Surface | Cell | Expressed by |
|---|---|---|---|
| buck | bar, logo slot | the mark is a Lottie JSON played on load | `animationSubstrate: lottie`, `lottieSource: <attachment>`, `lottieTrigger: load` |
| lamalama | bar, logo slot | a live canvas mark | not built: recorded divergence (plan §1h, the mark stays a still) |

buck's file itself is copyrighted: the live check uses a licence-free test Lottie of similar size, and buck's own file is used only at its Wave 4 clone.

## 3. Design

### 3.1 Where Lottie is offered (revised 2026-09-26, Bean: logo, Media, hero split, shared background)

Lottie is a FOURTH media type in the shared media-type atom, next to image, video and SVG, not a separate extension. One mechanism reaches every surface, and sizing, shape, border, caption and link come from the existing media atoms. The mapping below is from a read of the atom system (Sonnet planning agent, verified against the code).

**Atom changes**
- `src/components/media/atoms/media-type.js::CANONICAL_ENUM` gains `'lottie'` (`TIER_ENUM` follows); `src/components/media/controls/MediaTypeControl.js` gains the option "Lottie animation"; `src/components/media/atoms/registry.js::MEDIA_ATOMS['media-type'].types` gains it.
- `src/components/MediaElementControls.js::MEDIA_BASES.source` gains `LottieId` (integer attachment id; URL resolved at render, like `VideoId`), also in `MEDIA_TIERED_BASES` and `MEDIA_ATTR_TYPES`; the source atom's picker (`src/components/media/atoms/source.control.js`) shows a MediaUpload restricted to `application/json` when the type is `lottie` (media library only, no URL, no paste).
- Playback reuses the `video-behaviour` atom (it already owns type-conditional playback controls): `VideoLoop` is shown for `lottie` too, and two new bases, `LottieTrigger` (enum `load` / `visible` / `hover` / `scroll`, default `visible`) and `LottieSpeed` (number 0.25 to 3, default 1), are shown only when the type is `lottie`. JS logic in `video-behaviour.js`, control in `video-behaviour.control.js`, PHP twin `includes/media/atoms/video-behaviour.php`.
- Poster: the source atom's existing `Thumbnail` / `ThumbnailId` pair (already the "poster for a replaced element"). A poster is REQUIRED for a useful result: under reduced motion the player never loads, so the editor shows a warning "Add a poster image: visitors who prefer reduced motion see it instead" when `lottie` has no thumbnail.
- `scripts/generate-media-attributes.mjs --write` regenerates `includes/media-element-attributes.generated.php` (its `--check` mode is the gate).

**Surfaces**
- `sgs/media`: `mediaType: 'lottie'`, `lottieId`, `videoLoop`, `lottieTrigger`, `lottieSpeed`, `thumbnailId` as poster. `src/blocks/media/render.php` type allow-list and auto-detect gain `lottie`; a new branch calls `sgs_render_lottie()`; `edit.js` gains `isLottie`.
- `sgs/hero` split media: `splitMediaType` / `Tablet` / `Mobile` gain `'lottie'`; `splitMediaLottieId` with Tablet and Mobile siblings; the split resolver in `src/blocks/hero/render.php` and `includes/helpers-tier-media.php::sgs_tier_media_render` gain a `lottie` branch calling `sgs_render_lottie()`.
- Shared wrapper background (`includes/class-sgs-container-wrapper.php::render`, used by every block declaring the background attributes): new attribute `bgLottie` (the `bgVideo` / `bgSvgContent` naming), declared where those siblings are declared. Precedence: when `bgLottie` is set it is the moving layer and `backgroundImage` is its poster (a Lottie background without an image shows nothing under reduced motion: allowed, decorative). With no `bgLottie`, the existing image / video / SVG chain is untouched (a byte-identical test proves it). Always `aria-hidden="true"`. The WCAG 2.2.2 pause button is a real element inside the wrapper, positioned at the block's bottom inline-end corner above the content layer by a scoped rule (a pseudo-element background cannot host a control).
- `sgs/responsive-logo`: keeps its own switch: `animationSubstrate` (`svg-draw` default / `lottie`) plus `lottieId`, `lottieTrigger`, `lottieLoop`, `lottieSpeed` declared on the block; its `<picture>` is the poster; the pause button sits after the home link, never inside it. `darkLogoId` as before.
- Excluded: `sgs/before-after` (its drag-driven slider needs a trigger this design does not build). Its own `render.php` type allow-list omits `lottie` and its `MediaTypeControl` instances pass options without it. Recorded in the lane C parking lot.

**Gates to update**: `scripts/inspector-scan/rules/39-media-control-coverage.js::MEDIA_TYPES` (hard-coded list, add `lottie`); `scripts/inspector-scan/rules/37-media-no-handroll.js` keyword list (add `lottie`); `scripts/tests/test-media-atom-parity.mjs` if its media-type fixture hard-codes three values. Cloning heuristics (`scripts/converter/...`) treat media kinds as name stems, not a closed enum: a Lottie-shaped draft attribute is not yet recognised (parking lot).

### 3.2 Markup (`includes/lottie-render.php::sgs_render_lottie( array $attributes, string $poster_html, string $alt ): string`)

```
<span class="sgs-lottie" data-sgs-fx="lottie" data-src="{esc_url(wp_get_attachment_url)}"
      data-trigger="visible" data-loop="0" data-speed="1" [role="img" aria-label="{alt}" | aria-hidden="true"]>
  {poster_html}
  [<button type="button" class="sgs-lottie__pause" aria-pressed="false" aria-label="Pause animation">…</button>]
</span>
```
- Aspect ratio comes from `_sgs_lottie_meta` (`w`, `h`) through the block's scoped `<style>` (Spec 32), so the box is reserved before JS: no layout shift.
- Empty alt or `logoDecorative` → `aria-hidden="true"`, no role. The injected `<svg>` is always `aria-hidden`.
- The pause button renders only when `lottieLoop` is on or the meta duration is over 5 s (WCAG 2.2.2); 44px target. `sgs_render_lottie()` returns the wrapper and the pause control separately, so a block whose poster sits inside a link (the logo's home `<a>`) prints the button as a sibling after the `</a>`, never inside it (council fix 4: interactive content inside `<a>` is invalid HTML). Inside a labelled link the lottie span is always `aria-hidden="true"` so the name is not announced twice.
- An attachment without valid meta renders the poster only (fail closed).

### 3.3 Loading (Motion Registry, no new mechanism)

- `fx_effects` row `lottie`: tier `H`, `plugin_set: []`, `reduced_motion: suppress`, `editor_story: no-preview`, `scope: element`, `requires: none`, `pins: 0`, `triggers: load,visible,hover,scroll`, `creates_panel: 0`, `in_picker: 0`. Added to `scripts/seed-motion-fx-registry.py::FX_EFFECTS`; `includes/generated-fx-effects.php` regenerated with `scripts/generate-fx-effects-php.py`.
- `SGS_Motion_Registry::sniff_block` already catches `data-sgs-fx="lottie"`; `::enqueue_effect` enqueues `@sgs/fx-lottie` when it is in `SGS_Motion_Registry::MODULES`.
- `MODULES` gains `@sgs/lottie-web` (`build/vendor-modules/lottie-light.js`, no deps) and `@sgs/fx-lottie` (`build/shared/effects/fx-lottie.js`, deps: `array( array( 'id' => '@sgs/lottie-web', 'import' => 'dynamic' ) )`). Dynamic deps enter the import map but are not fetched until `import()` runs. No GSAP dependency at all (council fix 3): the scroll trigger is vanilla (below), so the Lottie page budget counts the player alone.
- `src/vendor-modules/lottie-light.js` re-exports `lottie-web/build/player/lottie_light.min.js` (the research's trap: the package's ESM file is unminified, 72 KB); vendor shims are exempt from externalising (`webpack.config.js` header), so the player is bundled into that one file. `webpack.config.js::GSAP_MODULE_IDS` gains the self-mapping `'@sgs/lottie-web': '@sgs/lottie-web'` (the `@sgs/motion-provider` precedent), so `fx-lottie.js`'s `import( '@sgs/lottie-web' )` stays a real external import (council fix 5); a manual entry adds `shared/effects/fx-lottie`.
- `fx-lottie.js` (`init → cleanup`, §1.6): under `prefers-reduced-motion: reduce` it never imports the player and the poster stays; a live change to `reduce` destroys the animation and shows the poster; a change back re-arms the trigger. Triggers: `load` after `requestIdleCallback`, `visible` via IntersectionObserver, `hover` on `pointerenter` and `focusin`, `scroll`: vanilla, no GSAP: while the element is in view (IntersectionObserver) a passive, rAF-throttled scroll listener maps the element's progress through the viewport (0 to 1) to `goToAndStop(progress × totalFrames, true)`. Pauses off-screen and on `document.hidden`. `pagehide` → `destroy()`; `pageshow` (persisted) → rebuild. Same-origin `fetch(data-src)`, then `loadAnimation({ renderer: 'svg', loop, autoplay: false, animationData })`; on any fetch or parse error the poster stays.
- `src/shared/effects/lottie-adapter.js`: the only file that touches lottie-web (`init`, `play`, `pause`, `seek`, `destroy`), so ThorVG can replace it in one file.
- Print: `@media print` hides the injected SVG and shows the poster.

### 3.4 Upload security (`includes/lottie-upload.php`)

- `upload_mimes` adds `json => application/json` ONLY for users with `upload_files`; `wp_check_filetype_and_ext` accepts the `text/plain` and `application/json` finfo variants for a `.json` name.
- `wp_handle_upload_prefilter` AND `wp_handle_sideload_prefilter` (council fix 1: sideloads fire the second hook, not the first) run the same validator on every `.json` file and rejects anything that is not a Lottie file, so this never widens WordPress to "any JSON". Fail closed: reject unless the file is at most 512 KB, decodes with `json_decode( …, true, 64 )` to a non-empty array, has `v`, `fr`, `ip`, `op`, `w`, `h` (numeric, `w` and `h` 1 to 8000, `fr` 1 to 120, `op` > `ip`) and a non-empty `layers` array; every `assets[].u` is empty or not a URL; every `assets[].p` is either a `data:image/(png|jpeg|webp|gif);base64,` URI or matches `^[A-Za-z0-9._-]+\.(png|jpe?g|webp|gif)$` (no `/`, no `:`, no leading `..`; council fix 2) with an empty `u`. `.lottie` zips are rejected. A null or empty decode is rejected (AM LottiePlayer's `is_lottie_valid` accepts it: the defect to avoid).
- `add_attachment` stores `_sgs_lottie_meta` = { w, h, fr, ip, op, duration }. `render.php` reads only the meta and the URL; it never reads or echoes the file.
- No REST endpoint, no inline paste, no URL field (LottieFiles' CVE-2026-0717 was an unauthenticated REST endpoint).

### 3.5 Budget

`scripts/motion-bundle-baseline.json::page_budgets` gains `tier_h_lottie: 61440` (60 KB, Bean-granted part (iv)) and module entries for `vendor-modules/lottie-light.js` and `shared/effects/fx-lottie.js`; `scripts/check-motion-bundle-budget.py::_TIER_ENTRY_MODULES` gains `tier_h_lottie → @sgs/fx-lottie`. A gate grep: no `cdn.jsdelivr`, `unpkg.com` or `esm.sh` in `build/`.

### 3.6 Spec 38 §1.2a amendment (its own commit, before code)

"current membership: Lenis (site-level smooth scrolling) and the Lottie player (`lottie-web` 5.13.0 light build, SVG renderer, playing designer-supplied animation files; D1151), and nothing else." Plus: "Byte allowance: a NAMED 60 KB JS allowance for pages that render a Lottie animation, for the player alone; pages without one ship nothing extra." D1151 lives in Spec 38 and the commit message (no live decisions log exists). What it replaces: nothing shipped; it adds the capability the motion register lists as ABSENT.

## 4. Risks

1. Budget: 46.6 KB is 93% of the default page rule; covered by the named allowance and by the player loading only after the trigger.
2. Stale upstream (no release since 2025-05): exact pin, the adapter, ThorVG sw-lite named as the replacement.
3. Files that rely on expressions render wrongly in the light build: accepted; the validator does not try to detect them.
4. Hostinger finfo reports `text/plain`: handled by the filetype filter; proved by one live upload.
5. `import: dynamic` deps: need WP 6.5+ (sandybrown runs 7.1).

## 5. Council payload

- (a) Problem: §1.
- (b) Files: `includes/lottie-upload.php`, `includes/lottie-render.php`, `src/shared/effects/{lottie-adapter,fx-lottie}.js`, `src/vendor-modules/lottie-light.js`, `src/blocks/extensions/lottie.js`, `src/blocks/responsive-logo/{block.json,render.php,edit.js,style.css}`, `includes/class-sgs-motion-registry.php::MODULES`, `webpack.config.js`, `scripts/seed-motion-fx-registry.py`, `scripts/motion-bundle-baseline.json`, `scripts/check-motion-bundle-budget.py`, the plugin loader.
- (c) Baseline: `grep -ril lottie plugins/sgs-blocks/src plugins/sgs-blocks/includes` returns nothing; `sgs-db.py sql "SELECT effect FROM fx_effects WHERE tier='H'"` returns `scroll-smoother` only; a `.json` upload is refused by core.
- (d) Hypothesis: with the change, a page rendering a Lottie logo loads `@sgs/fx-lottie` plus the player (under 61,440 gzip bytes together), plays the file, and shows the poster under reduced motion with zero player bytes; a page without it loads nothing new; a non-Lottie or hostile `.json` upload is refused.
- (e) Proof: `php plugins/sgs-blocks/tests/php/run-lottie-standalone.php`; `python plugins/sgs-blocks/scripts/check-motion-bundle-budget.py --page-budget tier_h_lottie`; the live network log on `/qa-lottie/` with and without reduced-motion emulation; a hostile upload through the real media uploader.

## 6. Council verdict (2026-09-26)

Members: Haiku code-path census, Sonnet adversarial reader (/delegate). Baseline measured before the council: `grep -ril lottie plugins/sgs-blocks/src plugins/sgs-blocks/includes` = 0 files; `fx_effects` tier H = `scroll-smoother` only; `package.json` has no lottie-web.

- Census: every registration point CONFIRMED (`SGS_Motion_Registry::extract_effects` matches `data-sgs-fx="lottie"`; `::enqueue_effect` enqueues `@sgs/fx-<effect>` only when in `MODULES`; `::register_modules` passes deps straight through; no code branches on tier; the seeder row schema matches; no existing upload filters to conflict with). It found `check-motion-bundle-budget.py` counts dynamic deps.
- Adversarial: GO WITH FIXES. Five must-fixes, all applied above: (1) sideload prefilter; (2) a strict `assets[].p` pattern; (3) dynamic GSAP deps would be counted in the Lottie budget, so the scroll trigger is now vanilla and the only dep is the player; (4) the pause button moves outside the logo link; (5) the webpack mapping is the self-mapped id, since vendor shims are exempt from externalising (confirmed in the `webpack.config.js` header). Should-fixes accepted: the accessible name is not doubled inside a link; `hover` also listens for `focusin`, and `visible`/`load` are the touch-friendly defaults; an attachment without meta renders the poster only. Recorded, not built: replacing an attachment's file in place does not refresh its meta (WordPress has no core replace-file path).
- Verdict: GO WITH FIXES, fixes applied. Bean approved on 2026-09-26 with the scope widened to the logo, the Media block, the hero split media and the shared wrapper background (§3.1 revised to the media-type atom; the player, validator, registry wiring and budget are unchanged from what the council reviewed).
