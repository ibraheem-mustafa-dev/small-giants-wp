# Motion survey — adversarial gap-check

**Date:** 2026-08-03 · **Target:** `.claude/reports/2026-08-02-motion-ecosystem-survey.md` (+ its two companions
`2026-08-02-webgl-effect-repos.md`, `2026-08-02-shader-authoring-surface.md`)
**Method:** independent `gh api` licence re-verification on 45 repos, npm registry metadata, caniuse/MDN
support checks, and a primary-source sweep of 2026 Awwwards winners + Codrops output.
**Scope rule:** additive only — nothing the survey already covers well is repeated.

---

## Read this first — the one finding that changes a plan

**The survey's headline recommendation ("GSAP is now 100% free — a genuine tier unlock") is
incomplete in a way that touches exactly what Bean is planning to build.**

GSAP is **not** MIT and not OSI-licensed. Its own `package.json` records the licence as
*"Standard 'no charge' license: https://gsap.com/standard-license"*
(`gh api repos/greensock/GSAP/contents/package.json`, v3.15.0, fetched 2026-08-03 — `gh api
repos/greensock/GSAP --jq .license.spdx_id` returns **empty**, i.e. GitHub cannot classify it).

That licence carries a Prohibited Uses clause, quoted verbatim from
<https://gsap.com/community/standard-license/>:

> "Any implementation and/or use of GSAP Products in tools that allow users to build visual
> animations without code that encourages, induces, or materially assists in creating a solution
> that competes with Webflow's visual animation building capabilities."

The same page carries this FAQ, which names Bean's exact product shape:

> "What if a WordPress plugin or theme or other niche tool allows users to create GSAP-driven
> effects through a visual interface? Is that prohibited?"

GreenSock's answer is encouraging-but-conditional (build on GSAP, including visual tools, provided
they don't directly compete with Webflow; contact them if unsure). It is **not** a blanket grant.

**Why this matters here and nowhere else:** the third companion doc
(`2026-08-02-shader-authoring-surface.md` §1, §5) proposes building precisely a *visual,
no-code, inspector-slider surface for authoring motion effects*, distributed inside the
`sgs-blocks` plugin. That is the fact pattern the clause describes. The survey treats GSAP's
licence as a solved, closed question and recommends it as the #1 "fastest win".

**Problem → Effect → Solution**
- *Problem:* GSAP's free licence has a carve-out for visual animation builders; SGS is heading
  toward being one.
- *Effect:* If the carve-out bites, it bites after the block is built and shipped to paying
  clients — the most expensive moment to discover it.
- *Solution:* Three options, ranked.
  1. **Email GreenSock for written confirmation before building the motion-controls block.**
     Free, ~10 minutes, and their own FAQ invites it. This is the recommendation.
  2. **Architect the boundary:** keep GSAP-driven effects as *per-client-site* code
     (`sites/<client>/`), and keep the *distributed* `sgs-blocks` plugin's visual controls
     driving CSS/Motion/anime.js only. The clause is about the distributed tool, not the site.
  3. **Use an MIT engine for the client-facing builder** — see missing category 4 below;
     Motion and anime.js are both genuinely MIT and both now cover most of what Bean would ask
     GSAP for.

Secondary point on the same entry: the two docs disagree on the date. The survey says the change
went into effect **2026-04-30**; the WebGL companion says *"the 2024 'GSAP is now 100% free'
change"*. Both cannot be right. Pick one and cite it once.

---

## 1. Licence corrections (independently re-run today)

All figures from `gh api repos/OWNER/REPO --jq '[.license.spdx_id,.pushed_at,.stargazers_count,
.archived]|@tsv'`, run 2026-08-03. Where GitHub returns no SPDX I read `package.json` or the
`LICENSE` blob directly.

| Repo | Survey said | Verified today | Verdict |
|---|---|---|---|
| `greensock/GSAP` | "✅ now free for commercial use" | **no SPDX**; `package.json` licence = *"Standard 'no charge' license"* | **Correction — see box above.** Not OSI, has a carve-out |
| `oframe/ogl` | "no explicit licence file found — verify before commercial use" | `package.json` → **Unlicense** (public domain), v1.0.11 | **Correction, in Bean's favour.** Maximally permissive — the survey under-sold it |
| `tholman/cursor-effects` | "licence not returned by API — flag as needs-check, technique reference only" | `package.json` → **MIT**, v1.0.18, pushed 2026-02-26, 4,028★ | **Correction.** Safe to use, and it's actively pushed, not "low activity" |
| `lukePeavey/SplitType` | "ISC (verified via search; `gh api` returned no licence file)" | `package.json` → **ISC**, v0.3.4 confirmed | Confirmed — the guess was right |
| `justin-chu/react-fast-marquee` | "needs direct LICENSE-file check — not confirmed MIT" | **MIT** (SPDX), pushed 2024-07-01, 1,513★ | **Correction.** Licence is fine; the "don't adopt" call still stands, but on *simplicity* grounds only |
| `nikdelvin/liquid-glass` | "licence not yet verified, check before adopting" | **MIT** (SPDX), pushed 2025-12-24, 80★ | **Correction.** MIT confirmed. Note the low star count and no 2026 commits |
| `michaelbrusegard/WebGL-Fluid-Enhanced` | "Check on adopt" | **MIT** (SPDX), pushed 2025-06-14 | Confirmed MIT |
| `gl-transitions/gl-transitions` | "**MIT** (verified via LICENSE file)" — in *both* companions | SPDX = **NOASSERTION**. The LICENSE blob *is* MIT text, but ends: *"Individual transitions in the transitions/ directory may have their own license specified in their file header comments."* I read all 125 shader headers: **124 MIT, 1 BSD-3-Clause (`InvertedPageCurl.glsl`)** | **Nuance the survey flattened.** Practically safe, but it is a per-file licence, not a repo licence. Do not vendor the whole `transitions/` directory as "MIT" |
| `patriciogonzalezvivo/lygia` | Prosperity, not commercially free | SPDX = NOASSERTION, consistent | Confirmed — correctly flagged |
| `naughtyduk/particlesGL` | "Other / custom — flag loudly" | SPDX = **NOASSERTION**, pushed 2026-07-07 | Confirmed — correctly flagged |
| `IanLunn/Hover` | NOASSERTION | Confirmed NOASSERTION, 29,401★ | Confirmed |
| `VincentGarreau/particles.js` | "**Dead** — no meaningful commits in years" | MIT, pushed **2024-03-28**, 30,226★ | **Overstated.** ~2¼ years stale, not "years of nothing". The conclusion (superseded by tsParticles) still holds |
| `studio-freight/react-lenis` | not mentioned | **`archived: true`**, no licence field | **New flag.** If anyone reaches for the React Lenis wrapper, it is an archived repo. Use `lenis` (MIT, v1.3.25) directly |

**Net:** no false "MIT" on a repo the survey told Bean to *adopt* — the one materially wrong
licence call (GSAP) is wrong in the other direction: it is described as freer than it is.

---

## 2. Missing categories, ranked by value to Bean

I checked each candidate against the survey's eight sections before listing it. Everything below
is genuinely absent from all three documents.

### #1 — Page transitions (View Transitions API + Swup). **Absent entirely.**

This is the largest gap. Every £10k agency site has smooth page-to-page transitions; the survey
has no category for it at all.

- **Same-document View Transitions**: Chrome/Edge 111+, Safari 18+, **Firefox 144+** — 88.46%
  global (<https://caniuse.com/view-transitions>, fetched 2026-08-03). 2026 is the first year
  this is cross-engine.
- **Cross-document (`@view-transition`)**: Chrome/Edge 126+, Safari 18.2+, **no Firefox** —
  82.01% (<https://caniuse.com/mdn-css_at-rules_view-transition>).
- **`swup/swup`** — MIT, pushed 2026-06-30, 5,210★, v4.9.2. The maintained JS route for
  browsers without cross-document VT.
- **`barbajs/barba`** — MIT, 12,965★, but pushed **2024-12-02**. Better known, less alive.
  Prefer Swup.

**Why it fits Bean specifically:** cross-document View Transitions are declarative CSS. With JS
off, or in Firefox, the page simply navigates normally — perfect graceful degradation, which is a
hard constraint the survey never tests any of its picks against. Zero KB. And it is the mechanism
behind the fashionable **dark-mode circular-reveal toggle**, which is another absent sub-topic.

### #2 — Native CSS scroll-driven animations. **Absent from a survey whose §1 is "scroll-driven".**

`animation-timeline: scroll()` / `view()`: Chrome/Edge 115+, **Safari 26+, Firefox 156+**, 83.66%
global (<https://caniuse.com/mdn-css_properties_animation-timeline>). MDN still labels it
*"Limited availability" — not yet Baseline*
(<https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline>), so the honest statement
is "now in all three engines, not yet Baseline".

The survey's §1 recommends `IntersectionObserver` as the zero-library route. That is now the
*second*-cheapest option. `animation-timeline` is cheaper still: no JS at all, runs off the
compositor, and is automatically suppressed by a `prefers-reduced-motion` media query wrapping
the `@keyframes` — reveal-on-scroll and scroll-progress bars become pure CSS. For a block
framework where every effect must survive JS-off, this is the single biggest Tier V unlock of
2026 and it is missing.

### #3 — Modern CSS entry/exit and size animation. **Absent.**

The unglamorous motion a block framework actually needs every day — accordions, menus, modals,
tooltips:

| Feature | Support (fetched 2026-08-03) |
|---|---|
| `@starting-style` | **Baseline "newly available" since Aug 2024** — safe now (<https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style>) |
| `transition-behavior: allow-discrete` | 88.88% global (<https://caniuse.com/mdn-css_properties_transition-behavior>) |
| Popover API | 89.75% global (<https://caniuse.com/mdn-api_htmlelement_popover>) |
| CSS Anchor Positioning | Chrome 125+, Safari 26+, **Firefox 147+** — 81.67%, cross-engine during 2026 (<https://caniuse.com/css-anchor-positioning>) |
| `interpolate-size` / `calc-size()` | **Chromium-only** (Chrome 129+, no Firefox ≤156, no Safari ≤27) — 69.05% (<https://caniuse.com/mdn-css_properties_interpolate-size>) |

Together the first four mean fade-in-on-open, animated `display:none`, and anchored dropdowns are
now pure CSS with no JS measurement hacks. `calc-size()` is the "animate height to auto" holy
grail but is Chromium-only — progressive enhancement only, never load-bearing.

### #4 — General-purpose MIT animation engines that are not GSAP. **Absent.**

The survey presents a binary: hand-rolled vanilla, or GSAP. Two genuinely MIT engines sit between
them, and after the licence finding above they matter twice over.

| Library | Licence (verified) | Activity | Size |
|---|---|---|---|
| **`motiondivision/motion`** (motion.dev) | **MIT** | pushed 2026-07-28, **33,055★**, npm v12.43.0 | motion.dev documents *"a mini HTML/SVG version of the `animate()` function that's just 2.3kb"* (<https://motion.dev/docs/quick-start>). Hybrid engine — hands off to the browser's native WAAPI, so animations run off-main-thread |
| **`juliangarnier/anime`** | **MIT** | pushed 2026-06-22, **71,718★**, npm v4.5.0 | Unpacked 2.13MB (modular; gzip per-import not measured) |

Two specifics the survey should have caught:

- **anime.js v4.4.0 (29 Apr 2026) ships `scrambleText()` built in.** The survey's §2 tells Bean to
  hand-roll scramble as a "~40-line vanilla utility". That advice may still be right on
  dependency grounds, but the survey presented "no canonical repo exists" as fact, and that is no
  longer true.
- **anime.js v4.5.0 (22 Jun 2026) added a Three.js adapter** (Object3D, materials, lights,
  cameras). That is directly the "GSAP drives shader uniforms" pairing the WebGL companion says
  only GSAP does — with an MIT licence.

Also absent: the **Web Animations API** itself (`element.animate()`) — the native primitive Motion
delegates to. For one-shot transforms it is zero KB.

### #5 — Vector-animation runtimes: Lottie. **Absent from all three docs.**

Rive gets a full section in the shader-authoring companion; Lottie is never mentioned. For Bean's
non-technical clients Lottie is arguably the stronger story, for one reason the survey never
weighs: **there is a large free/cheap marketplace of ready-made Lottie files**, so "client picks
an animation" needs no authoring from Bean at all.

- `LottieFiles/dotlottie-web` — **MIT**, pushed 2026-08-01, v0.78.2 released 22 Jul 2026, 838★.
  The modern compressed `.lottie` runtime.
- `airbnb/lottie-web` — **MIT**, 32,033★, pushed 2025-09-01. The original; larger, slower-moving.
- Caveat to carry: dotlottie-web is WASM-backed — unpacked npm size **8.76MB**, so the shipped
  runtime cost needs measuring before it goes anywhere near the 50KB budget. Not measured here.

### #6 — Scrollytelling. **Absent.**

`russellsamora/scrollama` — **MIT**, 5,989★, pushed 2025-11-13, v3.2.0. IntersectionObserver-based
step triggering. Directly relevant to charity and case-study client pages ("scroll through the
story"), which is a normal SME/charity brief and a category the survey has no answer for.

### #7 — Counting numbers and data-viz motion. **Absent.**

The most-requested SME motion effect of all — animated statistics — has no entry.

- `inorganik/countUp.js` — **MIT**, 8,157★, pushed 2026-07-02, v2.10.1. Actively maintained.
- `chartjs/Chart.js` — **MIT**, 67,618★, pushed 2026-05-27.
- `d3/d3` — **ISC**, 113,318★, pushed 2026-05-28.

SGS already has `sgs/counter` (per the project CLAUDE.md). The gap is that nothing in the survey
tells Bean whether to build on countUp.js or keep hand-rolling.

### #8 — Sound design. **Absent — and this one is evidenced at award tier.**

Codrops' own architecture write-up of TRIONN (an Awwwards SOTD, 27 Jul 2026) is titled
*"Coordinating GSAP, Three.js, Lenis, and Web Audio"* (Codrops, 15 Jul 2026). Web Audio is part
of the current award stack and the survey has no category for it.

- `goldfire/howler.js` — **MIT**, 25,327★, pushed 2025-11-23.
- Hard constraint to note: audio cannot autoplay; it needs a user gesture, and WCAG 2.1 requires
  a mechanism to stop it. Treat as opt-in, never default.

### #9 — Scroll-scrubbed image sequences and video. **Named but empty — see §3.**

### #10 — WebGPU / TSL. **Absent, and it bears directly on the Tier W decision.**

- WebGPU: Chrome/Edge 113+, **Safari 26+ (partial)**, **no Firefox through v156** — 83.63%
  (<https://caniuse.com/webgpu>).
- three.js is at **r185 (1 Jul 2026)**. r183 introduced a formal **TSL (Three Shading Language)
  specification**; r184 brought TSL compiler performance work and non-blocking `compileAsync()`
  (<https://github.com/mrdoob/three.js/releases>). `WebGPURenderer` auto-falls-back to WebGL2
  (<https://threejs.org/manual/en/webgpurenderer.html>).

**Why Bean should care:** TSL lets one shader source compile to *both* WGSL and GLSL. If Tier W
is going to be built at all, authoring in TSL rather than raw GLSL is the decision to take at the
start, not to retrofit. The shader-authoring companion assumes raw GLSL throughout.

### #11 — Haptics. **Absent. Verdict: skip, but say so.**

Vibration API: 79.21% global, and **no Safari or iOS Safari support at any version**
(<https://caniuse.com/vibration>). Half of UK mobile traffic gets nothing. Not worth a line of
code — but the survey should record the negative so it is not re-researched.

### #12 — Maps and geo. **Absent. Low value, note only.**

`Leaflet/Leaflet` — **BSD-2-Clause**, 45,440★, pushed 2026-07-27.
`maplibre/maplibre-gl-js` — SPDX **NOASSERTION**, 11,242★, pushed 2026-08-01 (a BSD-3 variant with
extra notices; needs a read before shipping). Relevant only for "find us" blocks.

### #13 — Motion accessibility beyond `prefers-reduced-motion`. **A gap inside the survey's own recommendations.**

The survey treats `matchMedia('(prefers-reduced-motion: reduce)')` as "90% of what's needed". It
is not, for two of the survey's own picks:

- **WCAG 2.1 SC 2.2.2 (Pause, Stop, Hide)** applies to any automatic motion lasting more than five
  seconds. The survey's recommended **CSS marquee** (§3) and **tsParticles background** (§4) both
  qualify and both need an operable pause control — not just a reduced-motion branch.
- **SC 2.3.1 (Three Flashes)** applies to the fluid/particle effects in the WebGL companion.

Bean's stated baseline is WCAG 2.1 AA. Two recommended effects do not meet it as described.

---

## 3. Under-detailed entries — what to go and find out

Each of these names a thing without giving Bean enough to decide.

1. **No gzip size appears anywhere in any of the three documents.** Every "Size" cell is a range
   or a guess ("~3-6KB", "5-40KB depending on bundle", "small, no deps", "tiny"). With a hard
   <50KB/page budget, that column is the whole decision and it is unmeasured. *Fix:* run
   `npx bundlephobia <pkg>` or a real Rollup build for the shortlist before any adoption. For
   reference I pulled npm **unpacked** sizes today (not gzip, not tree-shaken): `motion` 683KB,
   `lenis` 451KB, `scrollama` 370KB, `swup` 695KB, `howler` 318KB, `three` 23.2MB,
   `@lottiefiles/dotlottie-web` 8.76MB. These are tarball sizes, not shipped bytes — they only
   tell you which ones need real measurement most urgently.

2. **`model-viewer` at "~200KB" is 4× the entire page budget** and the survey recommends it as a
   drop-in block without saying so. Apache-2.0 is fine (it carries a patent grant, arguably
   better than MIT for a commercial shop). But it needs an explicit Tier W + lazy-load + poster-
   image treatment, not "genuinely drop-in as a block".

3. **`detect-gpu` is recommended twice as core infrastructure** but the survey does not check how
   it obtains its benchmark data. It ships a benchmark dataset that, by default, can be fetched at
   runtime rather than bundled. Against Bean's absolute "npm-bundled, never CDN" rule that is a
   blocking question, not a detail. *Verify before adopting.*

4. **`tsparticles` "5-40KB depending on bundle chosen"** — no per-bundle figure, and no note that
   it needs a WCAG 2.2.2 pause control (see #13 above). It is otherwise the survey's best-argued
   pick: MIT, pushed 2026-07-28, 8,937★ (all confirmed).

5. **`Splitting.js` described as "maintained-enough"** — last push **2024-06-19**, 1,755★. Two
   years. With GSAP SplitText now free and anime.js v4 shipping text utilities, this is a weaker
   pick than presented.

6. **§7 is titled "Image sequences, FLIP, and boring-but-critical infrastructure" and contains
   nothing about image sequences.** Scroll-scrubbed canvas frame sequences — the AirPods-page
   effect — is one of the most-copied agency mechanics and it is a title with no body. It also has
   no library: it is canvas + a preloaded frame array + `requestVideoFrameCallback` for the video
   variant. That verdict is worth writing down.

7. **FLIP is dismissed as React-only.** `react-flip-toolkit` is indeed React (MIT, 4,186★, pushed
   2024-09-28) — but **GSAP's Flip plugin is vanilla and now free**, and Codrops shipped a 2026
   tutorial using it (*"Building an Infinite GSAP Scroll Gallery with Parallax and Flip
   Transitions"*, 30 Jul 2026). The survey's own headline finding (GSAP plugins are free)
   invalidates its own FLIP conclusion two sections later.

8. **No entry states whether the effect degrades with JS off**, despite that being a stated hard
   constraint. Nor does any entry in §1–§7 say whether it is exposable as inspector controls —
   only the shader companion applies that test. Both columns should exist in every table.

---

## 4. Would not adopt (additive to the survey's own list)

| Item | Why not |
|---|---|
| **GSAP inside the *distributed* `sgs-blocks` plugin as a visual motion builder** | Prohibited-Uses clause, see the box at the top. Adopt it for per-client site code; get written consent before it powers client-facing animation-authoring UI |
| **`theatre-js/theatre`** | Apache-2.0, 12,572★ — but last push **2024-08-14** and no 2026 releases found. Attractive as a visual timeline editor; effectively dormant. Do not build on it |
| **`barbajs/barba`** | MIT but pushed 2024-12-02. Swup (2026-06-30) does the same job and is alive |
| **`studio-freight/react-lenis`** | **Archived repo**, no licence field. Use `lenis` directly |
| **`lil-gui`** | The shader companion cites it as the control-mapping reference — correct, and it should stay a *reference*. It is a developer debug GUI; shipping it to a client page duplicates what WP inspector controls already do |
| **Vibration API / haptics** | No Safari or iOS support at any version. Zero return on UK mobile traffic |
| **`liabru/matter-js`** | Agreeing with the survey and adding a fact: pushed 2024-08-17. 90KB for a rigid-body engine is ~2× the whole page budget for an effect most sites fake with springs |
| **`nikdelvin/liquid-glass`** | Now confirmed MIT, so licence is no longer the objection — but 80★ and no commits since 2025-12-24. Read the technique, do not depend on the repo |
| **`interpolate-size` / `calc-size()` as load-bearing** | Chromium-only, 69% global. Enhancement only |

---

## 5. 2026 award-tier addendum — what is actually winning now

**Assessment of the survey's sweep: it leaned evergreen.** Its §7/§8 name liquid glass, kinetic
type and text-scramble as "the dominant 2026 Awwwards vocabulary". I could not verify that claim
from any primary source. Every "2026 web design trends" result I found was SEO-farm content with
no sourcing. Here is what primary sources actually show.

**Awwwards Site of the Month, 2026** (<https://www.awwwards.com/websites/sites_of_the_month/>,
fetched 2026-08-03): Jan — *Bruno's Portfolio* (Bruno Simon); Feb — *The Renaissance Edition*
(Shopify Design); Mar — *GQ & AP The Extraordinary Lab* (Immersive Garden); Apr — *Oryzo AI*
(Lusion); May — *Floema* (Bürocratik); Jun — *Son Daven* (The First The Last).

**Site of the Day, late Jul–Aug 2026** (<https://www.awwwards.com/websites/sites_of_the_day/>):
Hearst Exhibit / OSMOS (2 Aug), Noomo Showcase (1 Aug), 2xA Studio (31 Jul), **"Made With Gsap"**
(29 Jul), Obys® Experiment Space (28 Jul), TRIONN (27 Jul), Spotify Wrapped Party / Active Theory
(24 Jul).

**What those sites are built from**, per Codrops' own architecture write-ups of the winners:
- TRIONN — *"Coordinating GSAP, Three.js, Lenis, and Web Audio"* (Codrops, 15 Jul 2026)
- Arnaud Rocca — *"from a GSAP-powered motion system to fluid WebGL"* (31 Mar 2026)
- The Sleepers — *"atmospheric WebGL with lightweight techniques"* (10 Jul 2026)
- Ridgeline — *"real-time 3D in Webflow"* (22 Jul 2026)

**Codrops' 2026 technique vocabulary** (<https://tympanus.net/codrops/2026/>), the most reliable
read on what the field is doing: Infinite GSAP Scroll Gallery with Parallax and Flip Transitions
(30 Jul); Scroll-Driven 3D Gallery Using a Blender Camera Path with Three.js and GSAP (7 Jul);
Interactive Wave Propagation Cube Grid with Three.js (9 Jul); Dual-Scene Fluid X-Ray Reveal in
Three.js (23 Mar); SVG Mask Transitions on Scroll with GSAP and ScrollTrigger (11 Mar);
WebGL for Designers (4 Mar). Plus: **the first-ever Three.js Conference is happening in 2026**
(Codrops, 16 Jul 2026).

### The strategic read Bean actually needs

**The CSS platform caught up hard in 2026 — and award-winning sites are ignoring it.**
Scroll-driven animations reached all three engines, same-document View Transitions went
cross-browser with Firefox 144, anchor positioning went cross-engine. Yet **zero** Codrops 2026
articles in the months I sampled cover View Transitions or `animation-timeline`, and every 2026
winner with a documented build is GSAP + Three.js + Lenis + custom WebGL.

Two consequences, and they pull in opposite directions:

1. **Bean cannot reach the award *look* on Tier V.** The thing agencies charge £10k for is
   custom WebGL shader work — fluid reveals, 3D galleries, scroll-driven Blender camera paths.
   The survey's cheapest-tier-first ratchet is correct engineering and will not produce that
   result. If competing on *look* is the goal, Tier W is not optional and the WebGL companion's
   fluid-simulation fork is the highest-ROI entry point.
2. **But Bean can win on ground the award sites have abandoned.** Those sites are heavy,
   JS-dependent, and frequently inaccessible. A site that gets 80% of the motion sophistication
   from `animation-timeline` + View Transitions + `@starting-style` — at zero JS, full JS-off
   degradation, and clean WCAG compliance — is a *different and defensible* pitch to a UK SME or
   charity than "we clone Awwwards". The survey never frames this choice, and it is the
   commercially important one.

**Three current-2026 items the survey should have surfaced and did not:** the free GSAP
Flip plugin (its own headline finding invalidating its own FLIP verdict); anime.js v4.5's
Three.js adapter as an MIT route to the GSAP+WebGL pairing; and TSL reaching a formal
specification in three.js r183, which is the shader-authoring decision to take *before* building
Tier W, not after.

---

## Sources

Licence and activity data: `gh api repos/OWNER/REPO`, `gh api repos/OWNER/REPO/contents/...`,
`npm view <pkg>` — all run 2026-08-03. Browser support: caniuse.com and developer.mozilla.org,
fetched 2026-08-03 (caniuse usage data dated June 2026). GSAP licence text:
<https://gsap.com/community/standard-license/> and <https://gsap.com/standard-license>.
Award data: awwwards.com SOTM/SOTD galleries and tympanus.net/codrops/2026/, fetched 2026-08-03.
Motion size figure: <https://motion.dev/docs/quick-start>. three.js releases:
<https://github.com/mrdoob/three.js/releases>. anime.js releases:
<https://github.com/juliangarnier/anime/releases>.

**Explicitly unverified in this pass:** gzip/tree-shaken sizes for every library named; whether
`detect-gpu` bundles or fetches its benchmark data; Rive runtime gzip size (still unmeasured, as
the original companion also noted); Theatre.js 2026 release status (no releases returned — dormant
but not confirmed dead); GSAP and Motion exact release dates (the GitHub releases API returned
empty for both).
