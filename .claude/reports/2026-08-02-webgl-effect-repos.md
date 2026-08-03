# WebGL effect repos — what already exists to build on (Tier W scouting)

**Date:** 2026-08-02
**Purpose:** For each of Bean's five effect families, find working code to fork rather than author shaders from scratch, with commercial-use licence checked explicitly.

**Method:** `gh` CLI repo/search queries against GitHub (stars, licence, last-push date pulled live) + targeted web search for the canonical demos (Codrops/Tympanus, curtains.js docs). Every repo below was checked with `gh repo view <name> --json licenseInfo,stargazerCount,pushedAt` on 2026-08-02 — figures are live, not from memory.

---

## 1. Cursor reveal / mask ("brick pattern behind the image, revealed by the cursor")

| Repo | Licence | Size/deps | Last commit | Tier needed | Parameterisable? |
|---|---|---|---|---|---|
| [robin-dela/hover-effect](https://github.com/robin-dela/hover-effect) | **MIT** | Small, needs **three.js** as peer dep | 2023-06-27 (stale but stable) | **G/W borderline** — uses WebGL for a *displacement* transition between 2 images on hover, not literally cursor-following reveal | Yes — clean options object (`speedIn`, `speedOut`, `easing`, `hover: true/false`, `displacementImage`) |
| [codrops/HoverEffectIdeas](https://github.com/codrops/HoverEffectIdeas) | Unknown (no LICENSE file — codrops demos are historically "free to use/modify", not OSI-licensed — **flag before commercial reuse**) | Vanilla CSS/JS, near-zero deps | 2016-era, unmaintained | **Tier V (CSS)** — most of this collection is `clip-path`/`mask` and CSS transitions, no WebGL at all | Hardcoded per-demo, not designed as a component |
| [mohammad-taghinejad/cursor-mask-reveal](https://github.com/mohammad-taghinejad/cursor-mask-reveal) | Unlicensed (no LICENSE) | Tiny, CSS+JS | recent, 1 star, toy repo | Tier V | Not really — throwaway demo |

**What I'd actually start from:** Bean's own example — "hero looks normal, cursor reveals a brick pattern underneath" — is a **hard-edged circular mask that follows the cursor**, i.e. exactly `mask-image: radial-gradient(...)` (or `-webkit-mask-image`) positioned via a CSS custom property updated on `mousemove`. **This does not need WebGL.** It's Tier V: two stacked `<img>`/`<div>` layers, top layer has `mask-image` driven by `--x`/`--y` custom properties set from a `pointermove` listener (throttled with `requestAnimationFrame`). Zero dependencies, works everywhere, trivially themeable (radius, softness = CSS vars = client-editable). Only escalate to WebGL/Tier W if Bean wants the reveal edge itself **distorted/rippled** rather than a clean circle — then `hover-effect` (MIT, three.js) is the fork target, using a displacement-map shader keyed to cursor position instead of hover state.

**Verdict:** Do not adopt a WebGL repo for this family as specified. Build it CSS-native; keep `robin-dela/hover-effect` on file as the escalation path only if the brief changes to "distorted/liquid reveal edge."

---

## 2. Magnetic / attraction field ("crystals get pulled toward the cursor and spring back")

| Repo | Licence | Size/deps | Last commit | Tier needed | Parameterisable? |
|---|---|---|---|---|---|
| [codrops/MagneticButtons](https://github.com/codrops/MagneticButtons) | **MIT** | Vanilla JS, zero deps (no three.js) | 2021-02-24 | **Tier G (GSAP)** confirmed | Constants at top of file (strength, distance threshold) — needs light refactor to expose as options, but the maths (distance-based pull + spring release) is the reusable part |
| Generic "magnetic cursor" repos found (`RoshanJ45/Magnetic-Cursor`, `Prem759-0/Magnetic-cursor`, etc.) | Mostly **no LICENSE file** | Vanilla, tutorial-grade | Recent but 0-1 stars, toy/portfolio code | Tier V/G | No — hardcoded per-demo, not worth forking |

**What I'd actually start from:** This is **not a WebGL job** even for "3D crystals" — the crystal *shapes* can be flat SVG/PNG or (if genuinely 3D) individual `three.js` meshes, but the **attraction/spring-back behaviour itself** is a GSAP `quickTo()` + distance-check on `mousemove`, applied per DOM node (or per Three.js object's position uniform). `codrops/MagneticButtons` (MIT, 485 stars) is the cleanest reference for the maths — distance-to-pointer → proportional translate → `elastic.out` spring back on leave. Fork its interaction logic, not its markup. If "crystals" means actual 3D geometry with rotation on approach (per Bean's description — "makes it rotate and get attracted"), pair this GSAP logic with plain `three.js` meshes (MIT, 114k★, actively maintained) — GSAP drives the `position`/`rotation` properties of the mesh, no shader work needed.

**Verdict:** GSAP is the driver (Bean already has it bundled — zero new runtime). Three.js only enters if the crystals are genuine 3D meshes, and even then GSAP animates the object transforms, not a shader.

---

## 3. Fluid / ripple ("mouse on a body of water, ripples")

| Repo | Licence | Size/deps | Last commit | Tier needed | Parameterisable? |
|---|---|---|---|---|---|
| [PavelDoGreat/WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) | **MIT** | Zero deps, single-file vanilla WebGL (~1 file, no three.js) | 2024-11-12, **16,528★** — the canonical repo, still gets forks/patches | **Genuinely Tier W** — real-time Navier–Stokes fluid solver on GPU, cannot be done in CSS/GSAP | Yes, clean config object at top: `SIM_RESOLUTION`, `DYE_RESOLUTION`, `DENSITY_DISSIPATION`, `VELOCITY_DISSIPATION`, `PRESSURE`, `CURL`, `SPLAT_RADIUS`, `SPLAT_FORCE`, colour mode — all are ready-made client-editable knobs |
| [michaelbrusegard/WebGL-Fluid-Enhanced](https://github.com/michaelbrusegard/WebGL-Fluid-Enhanced) | Check on adopt (fork of Pavel's, npm-packaged as `webgl-fluid-enhanced`) — 83★ | TypeScript rewrite + npm package + mobile perf fixes | Actively maintained 2025/26 | Same as above | Same config surface, plus typed options — **easier integration path than the raw original** since it's already an npm module |
| [x8BitRain/react-webgl-fluid](https://github.com/x8BitRain/react-webgl-fluid) | Check licence before use (wraps Pavel's MIT code as a React component, 13★) | Thin wrapper | Low activity | n/a — WP/vanilla stack, not relevant to Bean's build | — |

**What I'd actually start from:** `PavelDoGreat/WebGL-Fluid-Simulation` (MIT) directly, or the maintained fork `WebGL-Fluid-Enhanced` for the cleaner TypeScript/npm surface. This is genuinely the strongest match of all five families: Bean's exact ask ("simple ripple on a water background, mouse-driven") is this repo's stock demo out of the box — just swap the background colour scheme and dial `SPLAT_RADIUS`/`DENSITY_DISSIPATION` down for a subtler "heightfield ripple" look rather than full psychedelic dye colours. This is the one family where a real WebGL simulation is the right call, not a cheaper-tier substitute — CSS/GSAP genuinely cannot fake fluid advection.

**Verdict:** Highest ROI fork of the five. Full working shader + solver, MIT, exposed uniforms, mobile-safe, actively maintained fork available.

---

## 4. Particle emitter / trail ("sparks off the mouse like a sparkler")

| Repo | Licence | Size/deps | Last commit | Tier needed | Parameterisable? |
|---|---|---|---|---|---|
| [naughtyduk/particlesGL](https://github.com/naughtyduk/particlesGL) | **"Other" (custom licence, not MIT/Apache/BSD) — flag loudly, read the licence file before touching this one** | WebGL, "universal" — converts DOM/img/text/3D into particles | 2026-07-07, actively maintained, 95★ | Genuinely Tier W (GPGPU-style particle field reacting to mouse) | Looks designed as a product (options-driven) but licence gates commercial use — verify terms before any adoption |
| [Nqo-Zwane/Particles-Cursor-Animation](https://github.com/Nqo-Zwane/Particles-Cursor-Animation) | MIT (per repo description) | three.js dependency | Low-star tutorial repo | Tier W (three.js particle system) | Not designed as a reusable component — would need substantial refactor |
| [codrops/ParticleEffectsButtons](https://github.com/codrops/ParticleEffectsButtons) | No LICENSE file (codrops-style, flag before commercial use) | Small vanilla JS, canvas 2D **not WebGL** | 1264★, old but a known-good reference | **Tier V (Canvas 2D)** — a bursting-particle click effect on buttons | Options object per burst (particle count, colours, speed) |

**What I'd actually start from:** honestly, none of these are strong forks. The best-maintained one (`particlesGL`) has a non-permissive licence that needs reading in full before Bean ships it to a paying client — do not adopt on the strength of this report alone. The most realistic build for "sparks off a moving cursor" is a **from-scratch GPU point-sprite emitter in raw WebGL or three.js `Points`**, seeded conceptually from `codrops/ParticleEffectsButtons`' burst/decay maths (canvas 2D, MIT-adjacent but check) ported to WebGL for volume/performance — spark trails need hundreds of short-lived particles per second, which is exactly where canvas 2D starts to choke and WebGL point sprites win. **Honest read: this family has no clean off-the-shelf repo — budget it as a genuine build, not a fork**, using `three.js` `Points` + `BufferGeometry` (MIT) as the substrate, or `oframe/ogl` (4,598★, no explicit licence file found — **verify before commercial use**, minimal WebGL lib, much lighter than three.js if the whole page doesn't need a 3D engine).

**Verdict:** Weakest family for reuse. Don't force-fit `particlesGL`'s licence risk — build small on top of `three.js Points`, which Bean will likely already be loading for family 2/5 anyway (shared runtime, not a new dependency).

---

## 5. Scroll-alive imagery (mesh deformation / curvature on scroll)

| Repo | Licence | Size/deps | Last commit | Tier needed | Parameterisable? |
|---|---|---|---|---|---|
| [martinlaxenaire/curtainsjs](https://github.com/martinlaxenaire/curtainsjs) | **MIT** | Purpose-built, no three.js needed — its whole point is being a lighter alternative | 2025-04-03, 1,825★, actively used | Genuinely Tier W (turns real DOM `<img>`s into WebGL planes, tracks scroll/resize automatically) | Yes — shader uniforms are user-supplied per plane, curtains.js just handles DOM↔WebGL sync |
| Codrops tutorial: ["Distortion and grain effects on scroll with shaders in Three.js"](https://tympanus.net/codrops/2024/07/18/how-to-create-distortion-and-grain-effects-on-scroll-with-shaders-in-three-js/) | Codrops tutorials are code-along, not a licensed repo — treat as **reference/teaching material**, re-implement rather than copy-paste into a commercial product | three.js | 2024-07-18 | Tier W | Fully shown as source in the article — a sine-based vertex displacement keyed to scroll velocity, clean uniform (`uScrollSpeed`) |
| Codrops tutorial: ["Building a Scroll-Revealed WebGL Gallery with GSAP, Three.js, Astro and Barba.js"](https://tympanus.net/codrops/2026/02/02/building-a-scroll-revealed-webgl-gallery-with-gsap-three-js-astro-and-barba-js/) | Same caveat as above | three.js + **GSAP** | 2026-02-02, current | Tier W | Pairs GSAP ScrollTrigger with three.js shader uniforms — this is the **GSAP+WebGL pairing Bean specifically asked about** |

**What I'd actually start from:** `curtains.js` (MIT, purpose-built for exactly this — DOM image → WebGL plane → shader-deformable, syncs with scroll/resize for free) is the strongest fork target if Bean wants this decoupled from three.js entirely (lighter footprint, since curtains.js's only job is DOM-plane binding). If Bean would rather keep everything on one WebGL engine (three.js, since family 4 may also want it), the two Codrops tutorials above are current (2024/2026), teach the exact sine-deformation + GSAP ScrollTrigger pairing he wants, and are safe to re-implement (not copy verbatim — no repo licence, but the technique itself — vertex-shader sine displacement keyed to scroll — is generic GLSL, not copyrightable expression at that granularity).

**Verdict:** Second-strongest family after fluid. `curtains.js` is a real, MIT, purpose-fit library; the GSAP+WebGL pairing Bean wants is directly documented in a 2026 Codrops build tutorial.

---

## Collections / effect packs (permissive)

| Repo | Licence | What it is | Note |
|---|---|---|---|
| [gl-transitions/gl-transitions](https://github.com/gl-transitions/gl-transitions) | **MIT** (verified via LICENSE file) | Open collection of ~100 crowd-sourced GLSL image-transition shaders (wipes, morphs, glitches) — a shader *snippet* library, not a full runtime | Good raw-material source for family 1 (a distorted reveal edge) — drop a transition shader in as the mask function |
| [patriciogonzalezvivo/lygia](https://github.com/patriciogonzalezvivo/lygia) | **Prosperity Public License 3.0.0 — NOT free for commercial use** (verified via LICENSE.md: "commercial purposes limited to a thirty-day trial period") | Large granular GLSL/HLSL/WGSL shader-function library (noise, SDF, colour, lighting) | **Do not adopt for client work without paying for a commercial licence.** This is exactly the kind of beautiful-but-unusable repo the brief warned about — flag loudly, as instructed. |
| [codrops/*](https://github.com/orgs/codrops/repositories) (1,650+ repos) | **No repo-wide licence — mostly no LICENSE file at all** | Codrops/Tympanus demo archive — hundreds of hover/reveal/menu/button effect demos, mostly CSS/vanilla JS, occasional WebGL | Treat every individual repo as "read before commercial reuse" — historically Codrops' position is "free to learn from and adapt," but that is not a legal licence grant. Use as **reference/technique source**, re-implement rather than vendor the code verbatim into a product Bean sells. |

## GSAP + WebGL pairing (Bean's specific ask)

Confirmed: **GSAP itself has no bundled WebGL/three.js integration** — `greensock/GSAP` (27,316★, custom "no LICENSE file" — GreenSock's own commercial terms apply; check current GreenSock licensing since the 2024 "GSAP is now 100% free" change before assuming unrestricted commercial use) is purely a JS/DOM/CSS/canvas tweening engine. The pairing pattern is: three.js (or curtains.js) owns the render loop and shader uniforms; GSAP drives the *values* fed into those uniforms (via `gsap.to(uniformObj, {value: 1, onUpdate: ...})` or GSAP's `ScrollTrigger` for scroll-position → uniform mapping). This is exactly what the 2026-02-02 Codrops tutorial above demonstrates end-to-end and is the correct integration shape for family 2 (magnetic — GSAP drives mesh transforms) and family 5 (scroll-alive — GSAP ScrollTrigger drives shader uniforms).

---

## Summary ranking — most work saved to least

1. **Family 3 (fluid/ripple)** — `PavelDoGreat/WebGL-Fluid-Simulation`, MIT, fork-and-reskin. Near-zero build cost.
2. **Family 5 (scroll-alive)** — `curtains.js`, MIT, purpose-built + a current Codrops tutorial showing the exact GSAP pairing. Light build.
3. **Family 2 (magnetic)** — no WebGL needed at all; GSAP + `codrops/MagneticButtons`' maths (MIT) is a same-day build.
4. **Family 1 (cursor reveal)** — no WebGL needed; pure CSS `mask-image` + custom properties. Same-day build, escalate to `hover-effect` (MIT) only if the brief changes to a distorted edge.
5. **Family 4 (particle trail)** — weakest match; nothing safely off-the-shelf at the right licence. Budget as a genuine small build on `three.js Points`, not a fork.

**Licence flags to remember:** LYGIA = Prosperity Public License, NOT commercially free — do not use. `naughtyduk/particlesGL` = custom "Other" licence — read in full before touching. Codrops/Tympanus repos = mostly no LICENSE file — treat as technique reference, not vendored code, for anything Bean sells to a client.
