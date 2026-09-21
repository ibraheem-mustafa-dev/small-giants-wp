# Lottie player research for SGS (2026-09-21)

Question: which proven Lottie implementation should SGS model, and how should it be built so that a logo (buck.co's mark is a Lottie JSON) and any media slot can play a Lottie animation?

Method: `gh` CLI and npm registry for repo health and downloads; `npm pack` of each candidate then `gzip -9` and Node brotli on the real dist files (sizes below are measured, not quoted); the three WordPress plugins downloaded from downloads.wordpress.org and their PHP read; Spec 38 section 1.2a read in full; `responsive-logo/block.json` and `render.php` read.

## 1. Answer in one paragraph

Use **`lottie-web` 5.13.0, light build** (`lottie_light`, SVG renderer, no expression engine). It is 46.6 KB gzip (40.3 KB brotli) with no WASM, no CDN fetch and no `eval`, which makes it the only candidate whose total cost is compatible with the 50 KB JS rule. It passes admission tests (i) to (iii) of Spec 38 section 1.2a on evidence. Test (iv) is a D-numbered decision that only Bean can record. There is one rule question Bean must rule on: 46.6 KB is 93% of the per-page JS budget, so a Lottie page needs a named allowance (the Tier W precedent), otherwise it will breach the budget the moment any other view module loads. The upstream is stale (last release 2025-05-21), so put an SGS-side adapter interface in front of it so it can be swapped for ThorVG.

## 2. Candidates compared

### 2.1 Players (sizes measured 2026-09-21)

| | lottie-web light | dotlottie-web | @thorvg/lottie-player (sw-lite) | @lottiefiles/lottie-player |
|---|---|---|---|---|
| npm package and version | `lottie-web` 5.13.0 | `@lottiefiles/dotlottie-web` 0.80.0 | `@thorvg/lottie-player` 1.1.2 | `@lottiefiles/lottie-player` 2.0.12 |
| JS gzip | **46.6 KB** (UMD min file; 46.5 KB after SGS's own terser on the ESM file) | 32.8 KB | 16.2 KB | 97.6 KB |
| WASM gzip | none | **496 KB** (388 KB brotli) | 114 KB | none |
| Total gzip | **46.6 KB** | ~529 KB | ~130 KB | 97.6 KB |
| Renderer | SVG in the DOM | canvas, ThorVG via Rust/WASM | canvas, ThorVG WASM, lite preset | SVG, full lottie-web inside |
| Licence | MIT | MIT | MIT | MIT |
| Last npm release | 2025-05-21 (16 months); repo last push 2025-09-01 | 2026-08-28; repo push 2026-09-16 | 2026-09-19 (tag 2026-09-18) | 2026-08-04 |
| Popularity | 32,113 stars; 5.34M downloads a week | 880 stars; 1.12M a week | thorvg core 1,828 stars; thorvg.web 53 stars; 342 a week | 1,656 stars; 102k a week |
| Open issues | 857 | 19 | 30 (thorvg.web) | not checked |
| Formats | .json only | .json and .lottie (dotLottie zip) | .json | .json |
| Expressions | none in the light build (the full 76 KB build contains one `eval(`; light contains none, checked by grep) | partial (ThorVG; ~75% expression support, no `smooth()`, no `lookAt()`) | partial | full |
| Pattern worth copying | plain `loadAnimation` API: `goToAndStop`, `play`, `pause`, `destroy`, `animationData` injection; SVG output can carry an accessible wrapper | `setWasmUrl()` for self-hosting; `freezeOnOffscreen`; `autoResize`. README states the WASM is fetched from jsDelivr by default with an unpkg fallback, and that an explicit URL disables the fallback | smallest footprint of any ThorVG build; lite/standard presets | none; 2x the budget for no gain |

Verdict per candidate: lottie-web light is the recommendation. dotlottie-web is the right answer only if Bean needs `.lottie` files or expression-heavy files, and then it needs a named allowance of about 500 KB and a self-hosted WASM. `@thorvg/lottie-player` is the best swap-in later (130 KB total) but has 342 downloads a week, so it has no track record. `@lottiefiles/lottie-player` is rejected.

Trap found while measuring: the `esm/lottie_light.min.js` file in the lottie-web package is not minified (72 KB gzip if imported as-is). Import `lottie-web/build/player/lottie_light.min.js`, or let terser minify the ESM file, to get the 46 KB figure.

### 2.2 WordPress plugins (source read from the downloaded zips)

| | LottieFiles (`lottiefiles`) | AM LottiePlayer (`am-lottieplayer`) | Embed Lottie Player (`embed-lottie-player`) |
|---|---|---|---|
| Installs, version, updated | 7,000+; 3.1.0; about 8 months ago | 800+; 4.2.1; 2 days ago | 4,000+; 1.3.0; 3 weeks ago |
| Licence | GPLv2+ | GPLv3+ | GPLv3+ |
| Player | lottie-player bundle (342 KB raw) | own web component, 321 KB raw / 86 KB gzip | `@dotlottie/player-component`, 421 KB raw |
| Upload and MIME | `upload_mimes` adds `json`; the code assigns `application/json` then overwrites it with `text/plain`. No `wp_handle_upload_prefilter` and no content check found | Best of the three: `upload_mimes` + `wp_check_filetype_and_ext` (accepts real MIME variants) + `wp_handle_upload_prefilter` that decodes the JSON and checks the keys `v, fr, ip, op, w, h`; validates dotLottie zips too. Sanitation was added in 3.5.0 after a reported vulnerability | Uploads are Pro-only; the free version accepts a URL only |
| Lazy load, zero bytes when unused | None: enqueues on `wp_enqueue_scripts`, no `has_block()` anywhere in the plugin | Dynamic script loading only on pages using the player; IntersectionObserver play-on-visible; optional CDN | Good: the block is registered with `script`/`viewScript` and a PHP `render` file, so WordPress loads assets only when the block is on the page |
| Reduced motion | none (zero `prefers-reduced-motion` matches in its built JS) | yes, since 4.2.1 (string present in the player, and named in the changelog) | none documented; zero matches in its player |
| Poster or no-JS fallback | none seen | none seen | none seen |
| Triggers | autoplay, loop, hover, scroll via `lottie-interactivity` | autoplay, loop, click, mouseover, play-on-visible, animate-on-scroll | autoplay, loop; hover, scroll and cursor are Pro |
| Security history | CVE-2026-0717, an unauthenticated REST endpoint, fixed in 3.1.0 | upload vulnerability fixed in 3.5.0 | not found |

What to copy:
- From AM LottiePlayer: the three-filter upload pipeline, and its `wp_json_file_decode` step.
- From Embed Lottie Player: conditional loading through block registration plus a PHP render file. SGS does this through `viewScriptModule` and the Motion Registry.
- From LottieFiles: only a warning. Do not add a REST endpoint for this feature, and do not enqueue on every page.

Defect to avoid in AM LottiePlayer (read from `includes/utils.php`, `is_lottie_valid`): the check is `if ( $lottie && ( missing keys ) ) return false; return true;`. A `null` or empty decode skips the condition and returns valid. SGS must fail closed.

None of the three plugins ships a poster or a no-JS fallback. That is a gap SGS can fill, and it is also what makes zero-bytes-under-reduced-motion possible.

## 3. Recommendation and the Tier H admission test (Spec 38 section 1.2a)

Library: `lottie-web@5.13.0`, entry `lottie-web/build/player/lottie_light.min.js`, pinned exactly.

| Part | Test | Answer and evidence |
|---|---|---|
| (i) | Capability is real and Tier V cannot reach it | Passes. A Lottie file is Bodymovin JSON: keyframed shape, mask, matte and trim-path data exported from After Effects. CSS and SMIL cannot interpret it; the only Tier V route is to hand-redraw each mark as SVG plus CSS, which is not "play this designer's file". The repo has no Lottie support (`.claude/reports/2026-08-24-spec38-motion-register.md` line 348 lists it ABSENT; `grep -ril lottie` over src, includes, assets is empty). |
| (ii) | GSAP cannot do it, or only by damaging a shipped system | Passes. GSAP animates values; it does not parse or draw Bodymovin. GSAP's own documented Lottie recipe, the `LottieScrollTrigger` helper (gsap.com/docs/v3/HelperFunctions/helpers/LottieScrollTrigger), requires the lottie-web player and only drives its frame. The shipped Tier G `draw` effect (`fx-draw.js`) strokes existing SVG paths; it cannot reproduce fills, masks, mattes or morphs. |
| (iii) | Single-purpose, npm-bundled, never CDN, conditionally loaded on the Tier G registry | Passes, with one budget caveat. Single-purpose: it plays Lottie and nothing else. npm-bundled: yes, no CDN reference anywhere in the design (unlike dotlottie-web, which fetches WASM from jsDelivr unless `setWasmUrl` is called). Conditional: registered as a script module and enqueued by `SGS_Motion_Registry` only when rendered markup carries `data-sgs-lottie` (section 4.4 mechanism, same as `data-sgs-fx`). Caveat: 46.6 KB gzip is 93% of the 50 KB per-page rule, so Bean needs to rule on a named allowance for Lottie pages (as Tier W has 120 KB). Without it the 20% bundle-baseline gate and the page budget fight each other. |
| (iv) | Admission recorded as a D-numbered decision naming what it replaces | Not yet met, and I have not written it. It needs Bean's approval, then: a D-number in `decisions.md`, an amendment to the sentence in section 1.2a "current membership: Lenis ... and nothing else", and a new entry in `scripts/motion-bundle-baseline.json`. What it replaces: nothing shipped; it adds the "designer-supplied animation file" capability that the register lists as ABSENT. |

Bean decisions needed (menu, ranked):
1. Recommended: admit lottie-web light to Tier H with a named allowance of 50 KB gzip on Lottie pages only, and the adapter interface below so it can be swapped.
2. Admit `@thorvg/lottie-player` sw-lite instead (130 KB total, newer, thin track record). Smaller JS, more bytes overall, needs `wasm-unsafe-eval` in any CSP. Choose it only if expressions or `.lottie` files become a real need.
3. Do not admit any Lottie library; convert marks like buck.co's to animated SVG by hand and keep the existing `svgAnimationSource` route. Cheapest on bytes, but it is per-logo designer labour and the converter can never clone a Lottie source faithfully.

## 4. Integration design

### 4.1 Attributes

`sgs/responsive-logo` (existing `svgAnimationSource` number and `animationStyle` enum stay untouched):
- `animationSubstrate`: enum `svg-draw` (default, today's behaviour) | `lottie`. This is the substrate value: it decides which engine owns the animation, so there is still one control per capability.
- `lottieSource`: number, media-library attachment ID of a `.json` (same rule as `svgAnimationSource`: media library only, no paste, no URL field).
- `lottieTrigger`: enum `load` | `visible` | `hover` | `scroll`.
- `lottieLoop`: boolean, default false. `lottieSpeed`: number, default 1.
- No new poster attribute here. The block's existing desktop, tablet and mobile `<picture>` (logoId tiers) already is the static state and the per-device poster. That is the design reason to build on this block first.

Reusable media slot: a universal extension declared in `block.json` as `supports.sgs.lottie: true` (the `imageControls` precedent). It adds `sgsLottieId`, `sgsLottieTrigger`, `sgsLottieLoop`, `sgsLottiePosterId`. A single PHP helper `sgs_render_lottie()` produces the wrapper for both cases. A standalone `sgs/lottie` block is a thin wrapper over the same helper and is a later step, not the first one.

### 4.2 Markup and sizing

```
<span class="sgs-lottie" data-sgs-lottie data-src="{esc_url attachment URL}"
      data-trigger="visible" data-loop="0" role="img" aria-label="{alt}">
  <picture>...poster...</picture>
</span>
```
- Aspect ratio comes from the validated `w`/`h` stored at upload (section 4.5), emitted through the block's scoped `<style>` (Spec 32, no inline `style=`), so the box is reserved before JS and there is no layout shift.
- Empty alt means decorative: `aria-hidden="true"`, no `role="img"`. The injected `<svg>` is always `aria-hidden`.
- Decision to verify before building: whether `fx_effects` (section 6) takes a `tier H` row for the registry to map effect to module, or whether the registry needs a small extension. I did not read `class-sgs-motion-registry.php`.

### 4.3 Loading

- `view-lottie.js` is a `viewScriptModule`-style module registered with the Motion Registry. It enqueues only when the render-block sniff finds `data-sgs-lottie`. A page without the markup ships zero bytes.
- The player itself is a dynamic `import()` inside `init()`, after the IntersectionObserver fires (or on `pointerenter` for hover, or immediately for `load` after idle). The poster is therefore the LCP element and the 46 KB never delays it.
- `init()` returns a `cleanup()` (house contract, section 1.6): `anim.destroy()`, observers and listeners removed on `pagehide`, rebuilt on `pageshow` for bfcache.
- Same-origin `fetch(data-src)` then `lottie.loadAnimation({ container, renderer: 'svg', loop, autoplay: false, animationData })`. No CDN, no third-party origin, no `eval` (light build).
- Scroll trigger reuses the existing Tier G ScrollTrigger and drives `anim.goToAndStop(frame, true)` (the pattern GSAP documents). GSAP therefore loads only when a scroll-scrub Lottie is on the page; the other triggers use IntersectionObserver and cost no GSAP bytes.
- Adapter: the module talks to Lottie only through `init / play / pause / seek / destroy` in one file, so ThorVG or dotlottie-web can replace lottie-web in one file. Same rationale as the Tier W renderer decision in Spec 38.

### 4.4 Reduced motion, no-JS, print, controls

- Reduced motion (live and reactive, like FR-38-18): if `prefers-reduced-motion: reduce` matches, the library is never imported and the poster stays. Zero bytes for those visitors. A mid-session change to `reduce` pauses and returns to the poster; a change back re-arms the trigger without a reload. A visible play button is allowed under `reduce` because it is user-initiated.
- No JS: the server-rendered poster is the content. Nothing is hidden waiting for JS.
- Print: a `@media print` rule hides the injected `<svg>` and shows the poster, so a print never captures a mid-frame.
- Pause control (WCAG 2.2.2): a non-looping animation of 5 seconds or less is exempt. A loop, or a duration over 5 s (duration derived from `ip`, `op`, `fr` at upload), renders a 44 px `<button aria-pressed>` pause/play toggle. Also pause when off-screen and when `document.hidden`.
- Accessible name: `alt` control in the inspector, required unless marked decorative. Inside the logo link the existing `aria-label` on the `<a>` still applies.

### 4.5 Security handling of the JSON

Editor-only uploads through the standard media uploader, gated by core `upload_files`. **No inline paste, no URL field, no new REST endpoint** (LottieFiles' CVE-2026-0717 was an unauthenticated REST endpoint).

1. `upload_mimes` adds `json` and `wp_check_filetype_and_ext` accepts the real MIME variants (AM's pattern).
2. `wp_handle_upload_prefilter` is the single validation point, and every `.json` upload must pass it or is rejected, so this never widens WordPress into "any JSON upload".
3. The validator fails closed. Reject unless: decodes to a non-empty array; has `v, fr, ip, op, w, h` and a non-empty `layers` array; file size at most 512 KB (recommendation; tune against buck.co's real file); nesting depth capped; `w`, `h`, `fr` numeric and in sane ranges.
4. Reject external assets: any `assets[].u` that is a URL, and any embedded `p` that is not a `data:image/(png|jpeg|webp|gif)` URI. Reject `.lottie` zips in version 1 (zip-bomb surface, and the light build cannot play them).
5. On success store `_sgs_lottie_meta` (`w`, `h`, `fr`, `ip`, `op`, duration) on the attachment. `render.php` reads that meta only; it never re-reads or echoes the file.
6. The JSON is never inlined into HTML. It is fetched by URL from the uploads directory, so wp_kses (used for SVG in `responsive-logo/render.php`) is not the right tool here and validation at upload is.
7. The light build has no expression engine, so expression strings inside a file are inert.

### 4.6 Tests

1. PHPUnit, validator: valid file passes; null, `[]`, non-JSON, missing key, missing `layers`, oversize, deep nesting, external `assets[].u`, non-image data URI, spoofed extension, and a `.json` that is not Lottie all fail. The null and empty cases are the negative controls that AM LottiePlayer would fail.
2. PHPUnit, render: poster present with `data-sgs-lottie`; empty alt gives `aria-hidden`; no inline `style=`; attachment without meta renders poster only.
3. JS unit: reduced motion at load and mid-session (with the negative control that `no-preference` really plays), `cleanup()` idempotent, bfcache `pageshow` rebuild, adapter interface contract.
4. Playwright on the real canary page (rule 5, live DOM): with `no-preference` the SVG appears and `anim.currentFrame` advances; with `reduce` the network log shows no lottie chunk and the poster remains; JS disabled shows the poster; a page without the block loads zero lottie bytes; print emulation shows the poster; hover and scroll triggers fire; the axe scan is clean; a keyboard user can reach and operate the pause button.
5. Gates: add the bundle to `motion-bundle-baseline.json` with the allowance; `audit-inline-styling.js --check` exits 0; a grep gate that no `cdn.jsdelivr`, `unpkg` or `esm.sh` string appears in built output.
6. Editor: select a `.json`, confirm the preview and that a rejected upload shows the validator's message.

### 4.7 Estimate (low, per time-estimates.md)

About 2 hours for `responsive-logo` plus the shared helper, validator and module end to end. Rough split: validator and upload filters 10 min; render helper and attributes 25 min; view module 20 min; editor controls 20 min; tests 25 min; live canary check 15 min; spec amendment and D-number 5 min. Each further block adopting `supports.sgs.lottie` is about 15 min. Confidence: medium. The least certain part is the Motion Registry mapping (not read).

## 5. Risks

1. **Byte budget.** 46.6 KB is 93% of the per-page rule. Mitigation: named allowance (Bean decision), poster is LCP, library imports after interaction or idle.
2. **Stale upstream.** No release for 16 months, 857 open issues. Mitigation: exact pin, adapter interface, ThorVG sw-lite (130 KB) as the named replacement. The Lottie JSON format itself is stable and light is a mature build.
3. **Feature gaps in the light build.** No expressions, SVG only. A designer file that relies on expressions renders wrongly. Mitigation: the upload validator can warn on expression properties; the fallback is the ThorVG build.
4. **SVG cost on complex files.** Many nodes cost CPU. Mitigation: pause off-screen, size cap, and a later switch to `lottie_light_canvas` for heavy files.
5. **Poster quality.** The poster must look like frame 0. For a logo this is the existing logo image. For a generic slot the editor must supply one. A possible convenience (not tested): render frame 0 to canvas in the editor and upload it as the poster; I have not validated this and would treat it as a stretch item.
6. **WP core and host behaviour.** WP does not allow `.json` uploads by default and finfo can report `text/plain`; the filter above handles it, but needs one live upload test on Hostinger. Hostinger's CDN has served stale HTML after a deploy before (memory note), so verify on the canary after a cache purge.
7. **Cloning pipeline.** Making the converter emit `lottieSource` from a Lottie in a draft is a separate step under Spec 31 (DB-first, R-31-1) and is not covered here.
8. **Naming.** `animationSubstrate` is a proposed name. Check it against the naming conventions linter before building.

## 6. Reference implementations

Players and engines
- https://github.com/airbnb/lottie-web (the recommended engine; `build/player/lottie_light.min.js`)
- https://github.com/LottieFiles/dotlottie-web (best API design for self-hosted WASM, `freezeOnOffscreen`, `autoResize`)
- https://github.com/thorvg/thorvg.web (the ThorVG player and its lite presets)
- https://github.com/thorvg/thorvg (engine; Lottie support matrix in its wiki)
- https://github.com/LottieFiles/lottie-interactivity (hover, scroll and click trigger patterns)
- https://github.com/chrisgannon/ScrollLottie and https://gsap.com/docs/v3/HelperFunctions/helpers/LottieScrollTrigger/ (GSAP ScrollTrigger scrubbing a Lottie)

WordPress plugins
- https://wordpress.org/plugins/am-lottieplayer/ (source: https://github.com/johanaarstein/am-lottieplayer; read `includes/media.php` and `includes/utils.php`)
- https://wordpress.org/plugins/embed-lottie-player/ (block registration with `viewScript` and `render.php`)
- https://wordpress.org/plugins/lottiefiles/ (the cautionary example: unconditional enqueue, no content check, CVE-2026-0717)

Local files read
- `plugins/sgs-blocks/src/blocks/responsive-logo/block.json` and `render.php` (existing SVG animation path, `wp_kses` handling, `data-sgs-fx` sniffing)
- `.claude/specs/38-SGS-MOTION-SYSTEM.md` sections 1 (Tier H admission test), 4.4 (conditional loading), FR-38-18 (Lenis as the Tier H precedent)
- `.claude/reports/2026-08-24-spec38-motion-register.md` line 348 (Lottie ABSENT)
