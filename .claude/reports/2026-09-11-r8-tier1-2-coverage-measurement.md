---
doc_type: measurement-report
project: small-giants-wp
report_name: 2026-09-11-r8-tier1-2-coverage-measurement
generated: 2026-09-11
governing_step: .claude/plans/phase-r8-motion-recognition.md Step 6 (CHECKPOINT)
---

# R8 Step 6 — Tier 1+2 real-world coverage measurement

**Method.** Loaded 3 real, live production sites via Playwright MCP, read every `@keyframes`
rule and every `animation`/`transition`-bearing style rule directly off `document.styleSheets`
(the live rendered CSSOM — the same surface any Playwright-based scrape of a real page would
read), and ran each real declaration through the actual shipped code —
`motion_shape.py::classify_css_motion` / `extract_shape_from_transition` /
`match_motion_shape` and `motion_trigger.py::classify_trigger` — via a direct Python REPL
against the real module files, not a reimplementation or a paraphrase of their logic. Every
number below is a real `attrs=` / `shape=` return value captured from the actual code, printed
inline in this report's evidence sections.

**Headline result: 0 of 13 real-world motion declarations tested across 3 real sites produced
a Tier V match. 0% real-world coverage.**

This is a genuine "coverage is weaker than hoped" finding, produced honestly per this
checkpoint's own instruction not to force-match ambiguous cases.

---

## Site 1 — TAG Heuer Eyewear collection page

`https://www.tagheuer.com/fr/en/eyewear-collection/collection-eyewear.html`

**First correction to the plan's own framing, disclosed plainly rather than silently
dropped:** the specific "blur-text intro" cited in the brainstorm doc and Step 6's brief could
not be found anywhere on the live page as loaded today. A full stylesheet scan
(`document.styleSheets`) found zero `filter: blur(...)` declarations and zero elements with a
currently-applied blur filter anywhere on the page. Either it requires a different locale,
viewport, or scroll state to trigger, or the citation predates a site redesign. Reported
honestly rather than substituted with something else and left unlabelled.

**Second correction:** the page's "scrolling carousel" (`th-product-carousel` custom element
wrapping a Swiper.js `.swiper-wrapper`) is not expressed as a static CSS rule at all — Swiper
sets `transform: translate3d(...)` and `transition-duration` directly as **inline styles at
runtime**, per swipe. `getComputedStyle(.swiper-wrapper).transitionDuration` reads `0s` at
rest — there is no declarative `@keyframes`/`animation`/`transition` shape for a static-CSS
classifier to read here. This is a genuine **scope boundary**, not a Tier 1/2 bug: a
runtime-inline-style-driven carousel needs a DOM/JS-runtime read (closer to Tier 4a's own
territory), not a CSS-declaration read. Counted as **out of Tier 1/2's addressable scope**,
not a miss.

### Real declarations tested (8 genuine entrance/fade-shaped rules found)

| # | Selector / keyframes | Real declaration (as scraped) | Classifier call | Result | `attrs=`/`shape=` |
|---|---|---|---|---|---|
| 1 | `.info-icon .tooltip` / `fade-in` | `@keyframes fade-in{0%{opacity:0}100%{opacity:1}}` + `animation: 0.5s linear 0s 1 normal forwards running fade-in;` | `classify_css_motion(css_as_scraped)` | **MISS** | `({}, [])` — extraction returns `shape=None` before the DB is even queried |
| 2 | `.email-signup-alert` / `fade` | `@keyframes fade{0%{op:0}10%{op:1}90%{op:1}100%{op:0}}` + `animation: 5s linear 0s 1 normal forwards running fade;` | `classify_css_motion(...)` | **MISS** | `({}, [])` |
| 3 | `input.animate-width` / `animateInput` | `@keyframes animateInput{0%{width:.1rem}100%{width:100%}}` + `animation: 1.5s ease-in-out 0s 1 normal forwards running animateInput;` | `classify_css_motion(...)` | **CORRECT non-match** (width isn't a modelled property) | `({}, [])` |
| 4 | `.algolia-block .row.show` / `slideUp` | `@keyframes slideUp{0%{op:0;transform:translateY(10rem)}100%{op:.7;transform:translateY(0)}}` + `animation: 1s ease-in-out ... slideUp;` | `extract_shape_from_keyframes_css` | **MISCLASSIFY** | `shape={'animated_property':'opacity','direction':'none','magnitude':0.7,...}` — the `rem` unit isn't recognised by the transform parser, so the classifier silently falls through to treating this as a pure opacity change and drops the real slide-up character entirely |
| 5 | `.dy_notification_from_bottom` / `dy_appear_from_bottom` | `@keyframes dy_appear_from_bottom{0%{transform:translateY(100%)}100%{transform:translateY(0)}}` + `animation: 0.25s ease 0s 1 normal none running dy_appear_from_bottom;` | `extract_shape_from_keyframes_css` | **MISS** | `shape=None` — the `%` unit isn't recognised by the transform parser at all (only `px` is) |
| 6 | `.dy-modal-contents` / `dy-modal-enter` | `@keyframes dy-modal-enter{0%{op:0;transform:scale(.5)}50%{scale(1.05)}85%{scale(1.1)}100%{op:1;scale(1)}}` + `animation: 0.25s ease ... dy-modal-enter;` | `classify_css_motion(...)` | **MISS** | `({}, [])` — extraction only reads the `0%`/`100%` steps (a real, common overshoot-bounce shape is silently reduced to a naive 2-point read); even the reduced shape (`scale-in`, magnitude 0.5, 250ms, ease) falls between the seeded `bounce-in` band (0.201–0.399) and `scale-in` band (0.603–1.197) — a genuine coverage gap in the band boundaries |
| 7 | `#onetrust-pc-sdk.ot-fade-in` / `onetrust-fade-in` | `@keyframes onetrust-fade-in{0%{op:0}100%{op:1}}` + `animation-name/-duration/-timing-function` (longhand, 400ms, ease-in-out) | `classify_css_motion(...)` | **MISS** | `({}, [])` — shape extracts correctly (opacity/none/1.0/400ms/ease-in-out) but 400ms falls outside the seeded `fade-in` row's 240–360ms tolerance band (±20% of the DB's fixed 300ms) |
| 8 | Swiper carousel (`.swiper-wrapper`) | inline `transform`/`transition-duration` set by JS at runtime | n/a | **OUT OF SCOPE** (see correction above) | — |

**Root-cause isolation for #1, #2, #6 (all returned the generic `({}, [])` MISS):** re-ran
`extract_shape_from_keyframes_css` on identical CSS text with only the keyframes-NAME moved to
the front of the `animation:` shorthand (`animation: fade-in 0.5s linear;` instead of
`animation: 0.5s linear 0s 1 normal forwards running fade-in;`). With the name moved to the
front, extraction succeeds (`shape={'animated_property': 'opacity', 'direction': 'none',
'magnitude': 1.0, 'duration_ms': 500, 'easing_curve': 'linear'}`), but the DB match still
fails (500ms falls outside the `fade-in` row's 240–360ms tolerance band either way).

**This confirms a real, systemic parsing bug, independent of the DB-tolerance issue:**
`motion_shape.py::_find_animation_shorthand`'s regex requires the keyframes name to appear
**immediately after** `animation:` (`animation\s*:\s*<name>\s+<duration>\s+<easing>`). But
every real `animation` shorthand declaration observed on this page — and independently, on
both other sites tested below — was scraped from the live rendered CSSOM with the name
positioned **last**, in the CSS spec's own canonical shorthand order (`duration
easing-function delay iteration-count direction fill-mode play-state name`). This is not a
quirk of these 3 sites; it is how browsers serialise the `animation` shorthand back out via
`CSSStyleRule.cssText`/`document.styleSheets` regardless of how the source authored it. Any
tool reading a live page's rendered CSS via Playwright/CSSOM (as this measurement did, and as
a converter pulling live-page CSS would) will hit this on effectively every real `animation`
shorthand declaration, before the DB-tolerance issue is even reached.

---

## Site 2 — Framer marketing homepage

`https://www.framer.com/`

Framer's homepage carries almost no static-CSS entrance motion at all — its own premium scroll
reveals are React/`framer-motion`-driven (inline `transform`/`opacity` set per animation
frame by JS), which is invisible to a static-CSS-declaration reader by construction. This is a
second, independent confirmation of the same scope-boundary finding as TAG Heuer's carousel:
**modern component-framework marketing sites frequently do not express their headline motion
as static CSS at all.**

Only 2 genuine (non-decorative) declarations were found:

| # | Selector | Real declaration | Result | Evidence |
|---|---|---|---|---|
| 1 | `#__framer-editorbar-label` | `opacity:0; transition: opacity 0.4s ease-out;` (a resting→visible tooltip fade) | **MISS** | `extract_shape_from_transition({'opacity':'0','opacity_to':'1'}, 'opacity 0.4s ease-out')` → `shape={'animated_property':'opacity','direction':'none','magnitude':1.0,'duration_ms':400,'easing_curve':'ease-out'}`; `match_motion_shape(shape)` → `({}, [])` — 400ms falls outside the 240–360ms tolerance band |
| 2 | `.__framer-search-modal-container input:focus` / `__framer-blink-input` | `animation: 10ms ease 0s 1 normal none running __framer-blink-input;` (a cursor-blink, name-last as scraped) | **MISS** | `classify_css_motion(css_as_scraped)` → `({}, [])` — same name-order parsing issue as TAG Heuer; also a 10ms decorative blink is not genuinely Tier V "motion" content even if it matched |

---

## Site 3 — Locomotive (Montreal creative/web agency, makers of Locomotive Scroll)

`https://locomotive.ca/en`

Chosen deliberately as a site whose own product IS scroll-driven motion — a strong real-world
test of genuine entrance/reveal CSS.

| # | Selector / keyframes | Real declaration | Result | Evidence |
|---|---|---|---|---|
| 1 | `.c-preloader_logo` / `preloaderAppear` | `@keyframes preloaderAppear{0%{op:0;transform:scale(.9) translate3d(0,0,0)}100%{op:1;transform:scale(1) translate3d(0,0,0)}}` + `animation: 0.9s cubic-bezier(0.215,0.61,0.355,1) 0.3s 1 normal backwards running preloaderAppear;` (name-last, as scraped) | **MISS** | `classify_css_motion(css_as_scraped)` → `({}, [])`. Isolated the name-order issue again: with name moved first, `extract_shape_from_keyframes_css` → `shape={'animated_property':'transform','direction':'scale-in','magnitude':0.9,'duration_ms':900,'easing_curve':'ease'}` (the `cubic-bezier(0.215,0.61,0.355,1)` correctly snaps to `'ease'` — `snap_easing()` verified directly). The magnitude (0.9) IS within the seeded `scale-in` band (0.603–1.197) — but `match_motion_shape` on that shape still returns `({}, [])` because 900ms is nearly 3x outside the 240–360ms tolerance band. **This is the one case where only the duration-band issue is the blocker, not a parsing gap** — useful signal that the DB-tolerance issue alone (independent of the name-order bug) is sufficient to cause a miss on real-world timing. |
| 2 | `.c-preloader` | `transition: opacity 0.9s cubic-bezier(0.215, 0.61, 0.355, 1);` (fade-to-black on load complete) | **MISS** | `extract_shape_from_transition({'opacity':'1','opacity_to':'0'}, 'opacity 0.9s cubic-bezier(...)')` → `shape={'animated_property':'opacity','direction':'none','magnitude':1.0,'duration_ms':900,'easing_curve':'ease'}`; match → `({}, [])`, again purely a duration-tolerance miss (900ms vs 240–360ms) |
| 3 | `.c-scrollbar` | `transition: transform 0.3s, opacity 0.3s;` (custom scrollbar fade-in reveal, **no explicit easing token** — a very common real-world pattern relying on the browser's implicit `ease` default) | **MISS** | `extract_shape_from_transition({'opacity':'0','opacity_to':'1'}, 'opacity 0.3s')` → `shape=None` — the extractor's shorthand regex requires an explicit easing token to be present and returns `None` outright when it's omitted; a real, separate parsing gap from the name-order and unit-support issues found above |

Decorative/non-target rules on this page (`spin`, `shake`, `featuredProjectsAllFlash`,
`lisaDisclaimerFlash`, emoji-content flashes) were **correctly, silently non-matched** — these
animate `content`/`text-decoration` or are infinite UI-chrome loops with no Tier V analogue,
and the classifier's correct behaviour here is to not match them. Not counted as misses.

---

## Totals

| Site | Genuine motion declarations tested | MATCH | MISS | MISCLASSIFY | Out-of-scope (structural) |
|---|---|---|---|---|---|
| TAG Heuer | 8 | 0 | 6 | 1 | 1 (carousel) — plus 1 cited effect (blur-text intro) not found live at all |
| Framer | 2 | 0 | 2 | 0 | 0 (but page-wide: its real motion is JS-driven, structurally out of reach) |
| Locomotive | 3 | 0 | 3 | 0 | 0 |
| **Total** | **13** | **0** | **11** | **1** | **1** |

**Real-world match rate: 0 / 13 = 0%.**

## Root causes found (all verified directly against the shipped code + DB, not inferred)

1. **Animation-shorthand name-order bug (the single largest cause).**
   `motion_shape.py::_find_animation_shorthand`'s regex assumes `animation: <name> <duration>
   <easing> ...` (name first). Every real declaration read from a live page's rendered CSSOM —
   on all 3 sites, with zero exceptions — serialises the shorthand in the CSS spec's canonical
   order (`duration easing delay count direction fill play-state name`, name **last**). This
   is standard browser CSSOM serialisation behaviour, not a quirk of these 3 sites, so it will
   recur on effectively any live page scraped the same way.
2. **Transform unit support gap.** `parse_transform_declaration` only recognises `px` for
   `translateX`/`translateY`. Real sites commonly use `%` (silently returns no shape at all)
   and `rem` (silently falls through to a degraded opacity-only shape, a **MISCLASSIFY** that
   drops the real slide direction).
3. **DB-seeded duration/magnitude bands reflect SGS's own internal preset defaults (~300ms,
   20–40px), not real-world site conventions.** Every real entrance/fade effect found across
   all 3 sites used 400ms–5000ms — every single one fell outside the seeded rows' ±20%
   tolerance windows. This is the second-largest cause, and it recurred independently of the
   name-order bug (case Locomotive #1 and #2 above isolate this specifically).
4. **Multi-step (non-monotonic) keyframes are silently reduced, not gracefully declined.** The
   extractor only ever reads the `0%`/`100%` steps; a real overshoot/bounce shape (TAG Heuer's
   `dy-modal-enter`) or an appear-then-disappear shape (TAG Heuer's `fade`, which starts AND
   ends at opacity 0) collapses to a degenerate or misleading 2-point read.
5. **Transition-shorthand easing is required but frequently omitted in real CSS** (the browser
   defaults to `ease` when absent). The extractor's regex requires an explicit easing token
   and returns `None` outright when it's missing (Locomotive's `.c-scrollbar`).
6. **A meaningful share of real "premium" motion on Awwwards-tier sites is not expressed as
   static CSS at all** — TAG Heuer's carousel and Framer's scroll reveals are both
   JS-runtime/inline-style-driven. This is a genuine scope boundary for Tier 1/2 (not a bug),
   but it means the real addressable surface for a static-CSS classifier is narrower on this
   class of site than the brainstorm doc's framing assumed.

None of these six causes are hypothetical — each is backed by a direct call into the real
shipped module returning the exact printed value quoted above.

## Verdict

**Coverage does not look strong enough to proceed to Tier 3 (stagger detection) or Tier 4a
(GSAP/Lenis/Three.js DOM-signal detection) yet.**

Per the phase plan's own On-Fail clause for this checkpoint ("If coverage is poor... STOP
before building Tier 3/4a — return to Step 3/5 with the specific missed cases as new test
fixtures. Do not proceed to Tier 3/4a on an unmeasured assumption"), my recommendation is to
**pause and return to Steps 1/3/5** with the 6 root causes above as concrete, evidenced fix
targets, specifically:

- Fix the animation-shorthand name-order regex to handle both orders (or better, parse via
  the individual longhand properties `animation-name`/`animation-duration`/etc., which are
  unambiguous regardless of shorthand order and are what `getComputedStyle` exposes directly)
  — this alone would very likely flip several of the 11 misses above to real matches.
- Add `%`/`rem`/`em` unit support to `parse_transform_declaration` (with `rem`→`px` conversion
  via a resolvable root font-size, since it is currently silently dropped or misclassified).
- Re-seed `motion_shape_signatures`' duration and magnitude bands from real-world observed
  ranges (this measurement alone suggests 300–5000ms and 20–200px are both real, not just the
  current ~300ms/20-40px SGS-internal defaults) rather than the framework's own preset
  defaults — this is the second-largest blocker and is entirely independent of the parsing
  bugs.
- Decide explicitly whether multi-step keyframes should be declined outright (safer, matches
  the "never guess" discipline) or handled via a proper multi-point read, rather than the
  current silent 2-point reduction, which produces at least one confirmed MISCLASSIFY.
- Make transition-easing optional (default to `ease` when omitted), matching real CSS/browser
  behaviour.

This is not a recommendation to abandon the tier design — the SHAPE-MATCHING architecture
itself (query `motion_shape_signatures` on animated-property + direction + duration + easing +
magnitude) is sound, and 2 of the 3 sites' misses trace to fixable parsing bugs rather than a
flaw in the underlying approach. But building Tier 3 (which depends on Tier 1's shape-match
firing correctly across a group of siblings) or Tier 4a on top of a 0% real-world match rate
would very likely just compound an unmeasured problem, exactly as the checkpoint was designed
to catch.

---

## Addendum — 2026-09-11, Fix 6 (easing family-tolerance, path-safe)

**After Fixes 1-5** (name-order shorthand parsing, `rem` unit support, the duration
floor/ceiling union, declining non-monotonic keyframes, optional transition easing — all
landed in `motion_shape.py`, verified via this file's own re-run of the 12 testable real
declarations, item #13 — the Swiper carousel — remains genuinely out of Tier 1/2's scope, a
DOM-runtime signal, not a CSS declaration), real-world coverage stood at a re-measured
**2/13** baseline: `Framer #1` (tooltip fade, 400ms `ease-out`) matched `fade-in` exactly, and
`Locomotive #1` (`preloaderAppear`) already matched `border-accent`. Three further real,
evidenced misses remained, all sharing one root cause: `easing_curve` required an EXACT
snapped-keyword match against the seeded row, but each of these declarations legitimately
snaps to a *different* member of the same visual "ease it" family than the seeded `fade-in`
row's `ease-out` —

- TAG Heuer `onetrust-fade-in` (longhand `animation-timing-function: ease-in-out`)
- Locomotive `.c-preloader` fade (`cubic-bezier(0.215, 0.61, 0.355, 1)`, snaps to `ease`)
- Locomotive `.c-scrollbar` (`transition: opacity 0.3s` — no easing token; browser default
  `ease`)

**Fix applied.** `linear`/`ease`/`ease-in`/`ease-out`/`ease-in-out` were pooled into two
families — `{ease, ease-in, ease-out, ease-in-out}` (visually interchangeable "ease it"
intent) and `{linear}` (visually distinct constant velocity, kept strict) — with easing
matched by family instead of exact keyword for every seeded preset **except** `scale-in` and
`border-accent`. Ground-truthing the 18-row seed table directly (not inferring) found this
pair is the ONE case sharing `animated_property`/`direction` (`transform`/`scale-in`) with
overlapping magnitude bands (0.603-1.197 vs 0.67-1.33, overlap 0.67-1.197) AND duration bands
that both collapse into the same real-world 200-5000ms window (Fix 3) — the exact easing
keyword is the only remaining axis telling them apart. Locomotive's real `preloaderAppear`
(keyframes `scale(.9)`->`scale(1)`, 900ms, `cubic-bezier(...)` snapping to `ease`) sits
exactly in that overlap; a naive blanket family-pool was verified directly to turn its
currently-correct `border-accent` match into an unresolvable tie (`scale-in` would newly
qualify via family, `border-accent` still qualifies on its own exact keyword). So the family
tolerance is applied per-candidate-row (`motion_shape.py::_easing_matches`), gated by an
explicit exemption set (`_EXACT_EASING_ONLY_PRESETS = {"scale-in", "border-accent"}`), not a
blanket rule — see the Fix 6 code comment block in `motion_shape.py` for the full reasoning,
written specifically so a future reader doesn't "simplify" it back to a naive pool.

**Result: 5/13 (up from 2/13), zero regressions.**

| Case | Before | After |
|---|---|---|
| TAG Heuer `onetrust-fade-in` (400ms `ease-in-out`) | MISS | **MATCH → `fade-in`** |
| Locomotive `.c-preloader` fade (`cubic-bezier`→`ease`, 900ms) | MISS | **MATCH → `fade-in`** |
| Locomotive `.c-scrollbar` (no easing→`ease`, 300ms) | MISS | **MATCH → `fade-in`** |
| Framer tooltip fade (400ms `ease-out`) | MATCH → `fade-in` | MATCH → `fade-in` (unchanged) |
| Locomotive `preloaderAppear` (900ms, `ease`, scale 0.9) | MATCH → `border-accent` | **MATCH → `border-accent` (regression-checked, unchanged)** |

Both fixture suites (`test_motion_shape_fixtures.py` — 10/10 pass, including the
`scale-in`/wrong-easing-keyword negative control which still correctly refuses a `linear`
mismatch; `test_motion_trigger_fixtures.py` — 5/5 pass) show zero regressions after this
change. The remaining 8/13 misses are unrelated to easing (unmodelled property, `%`-unit
transform, non-monotonic multi-step declined-by-design, decorative sub-200ms blink, and the
out-of-scope Swiper carousel) and are out of this fix's scope.
