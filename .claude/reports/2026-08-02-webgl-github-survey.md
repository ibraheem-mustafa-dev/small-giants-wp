# WebGL-for-marketing-sites: GitHub ground-truth survey

**Date:** 2026-08-02
**Method:** `gh` CLI against live GitHub API (repo metadata, releases, issues, code search) + Bundlephobia gzip measurements. No impressions — every number below is a live API read taken today.
**Scope:** the GitHub-evidence half of the WebGL-adoption decision. Community/blog research is a separate agent's job.

---

## 1. Comparison table (measured today, 2026-08-02)

| Library | Stars | Last push | Latest release | Open issues | Gzip (min) | Maintained? | Fits Bean's <50KB/page budget? |
|---|---|---|---|---|---|---|---|
| [three.js](https://github.com/mrdoob/three.js) | 114,170 | 2026-08-01 | r185 (2026-07-01) | 376 | **182 KB** | Yes — daily commits, monthly `rXXX` releases | **No** — alone blows the whole page budget |
| [ogl](https://github.com/oframe/ogl) | 4,592 | 2025-04-13 | none tagged | 24 | **34 KB** | Marginal — no commit in ~16 months, no formal releases (version pinned via npm only) | Yes, on its own — but leaves ~16KB for everything else including GSAP |
| [regl](https://github.com/regl-project/regl) | 5,560 | 2026-07-23 | none tagged | 126 | **38 KB** | Yes, pushed this month, but functional/declarative API is unfamiliar and its own issue count (126) is high relative to its size — mostly WebGL1-only, no WebGL2/instancing roadmap | Yes on size, but API paradigm mismatch for a small effects team |
| [pixi.js](https://github.com/pixijs/pixijs) | 47,929 | 2026-07-19 | v8.19.0 (2026-06-04) | 351 | **251 KB** | Yes, very active | **No** — 2D-renderer-scale bundle, wrong tool for a handful of bounded shader effects anyway |
| [curtains.js](https://github.com/martinlaxenaire/curtainsjs) | 1,825 | 2025-04-03 (repo activity 2026-07-21 is a housekeeping push, not a feature release) | none tagged | 12 | **23.5 KB** | **No — superseded.** Same author has moved on to [`gpu-curtains`](https://github.com/martinlaxenaire/gpu-curtains) (WebGPU, 183 stars, actively pushed 2026-03-24). curtains.js itself has had no feature commit in 16 months | Size fits, but adopting an abandoned library the author himself replaced is a trap |
| [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) | 31,602 | 2026-08-01 | v9.7.0 (2026-07-31) | 30 | 52 KB **+ three.js (182 KB) mandatory dependency = 234 KB** | Yes, very active | **No** — irrelevant anyway, SGS is not a React-rendered frontend; R3F only makes sense inside a React app |
| [lygia](https://github.com/patriciogonzalezvivo/lygia) | 3,398 | 2026-03-24 | 1.4.1 (2026-02-07) | 20 | N/A — it's a GLSL/HLSL/WGSL **shader-source snippet library**, not a JS runtime; you copy-paste the `.glsl` includes you need | Yes, actively released | Fits by construction — zero JS weight, it's source you inline into your own shader |
| [tsParticles](https://github.com/tsparticles/tsparticles) | 8,937 | 2026-07-28 | active | 21 | ~30-80 KB depending on bundle (`slim`/`basic`/`confetti` presets) — full bundle is far larger; bundlephobia rate-limited so figure not independently re-measured today, use with caution | Yes | Only with the `slim` preset; the "kitchen sink" default bundle is not lean |
| [gl-transitions](https://github.com/gl-transitions/gl-transitions) | 2,120 | 2026-06-22 | — | — | N/A (GLSL fragment shaders, same model as lygia) | Yes, still receives contributions | Fits — it's a curated collection of copy-paste crossfade/wipe shaders, useful for section transitions specifically |
| [GSAP](https://github.com/greensock/GSAP) *(already bundled per CLAUDE.md)* | — | — | — | — | **27 KB core** | Yes | Already inside budget; the question is whether it can drive shader uniforms without a second runtime (see §4) |

**Verdict on the table alone:** every general-purpose WebGL *engine* (three.js, pixi.js, R3F) is too heavy for a <50KB/page budget once you add anything else to the page. The only options that fit Bean's actual budget are the **minimal, low-level libraries (`ogl`, `regl`)** or **hand-rolled raw WebGL** using shader source from `lygia`/`gl-transitions` — not a full engine.

---

## 2. Canonical implementations for the three named effects

### Cursor-following fluid / smoke / liquid distortion
- **Canonical original:** [PavelDoGreat/WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) — 16,527 stars, MIT, zero dependencies, single-file raw WebGL (no three.js). **Last pushed 2024-11-12 — 21 months stale**, but it is the base every other fluid-cursor repo forks from. Confirmed forks found live today, all *much* smaller and newer:
  - [MLuchette/react-fluid](https://github.com/MLuchette/react-fluid) — explicit React port "Based on PavelDoGreat's fluid simulation"
  - [scxr-dev/fluid-cursor](https://github.com/scxr-dev/fluid-cursor) — "zero-dependency JavaScript plugin," pushed 2026-04-17
  - [Seniru-Binuwara/webgl-cursor-fluid-smoke](https://github.com/Seniru-Binuwara/webgl-cursor-fluid-smoke) — explicitly "reverse-engineered … for learning purposes," i.e. not production-hardened
  - [Marcel-G/webgl-fluid-displacement](https://github.com/Marcel-G/webgl-fluid-displacement) — "Fluid image distortion using simplex noise and Sobel edge detection shaders," pushed 2025-12-05
  - **Footprint:** raw WebGL1, no dependency — this is the one effect family where a hand-rolled ~5-15KB shader (based on Jos Stam's stable-fluids algorithm, same one PavelDoGreat implements) is realistic and stays inside budget. Do not adopt three.js just for this.

### Per-pixel image displacement on hover
- **Canonical original:** [robin-dela/hover-effect](https://github.com/robin-dela/hover-effect) (dogstudio's technique) — 1,877 stars, MIT. **Last pushed 2023-06-27 — over 3 years stale**, effectively abandoned but still the reference everyone forks/credits.
- **Alternative canonical:** [beto-group/DisplacementView](https://github.com/beto-group/DisplacementView) — actively pushed 2026-06-01, framed as a general "Dynamic Image & Video Displacement Shader Engine."
- **Footprint:** this effect needs almost nothing — two textures (source image + displacement map), a fragment shader doing `texture2D(uTexture, uv + displacement * uProgress)`, and raw `WebGLRenderingContext` calls. `ogl` (34KB) is a comfortable fit if you want a thin abstraction over raw GL; raw WebGL with no library is realistic too since this is a single quad + one shader.

### WebGL particle fields reacting to a pointer
- **Canonical general-purpose library:** [tsParticles](https://github.com/tsparticles/tsparticles) (8,937 stars, actively released) — but its full bundle is heavy; only the `slim`/`basic` presets are diet-sized, and even those need checking against the 50KB budget once GSAP is also on the page.
- **Bespoke/example-scale implementations** (smaller, closer to what a "handful of bounded effects" needs): `gh search` surfaced mostly one-off portfolio repos (e.g. `theconsigliere/48_webgl-particles-cursor`) rather than a maintained canonical micro-library — this space doesn't have an equivalent of PavelDoGreat's fluid sim as a single obvious fork target. **Practical read:** a particle field reacting to a pointer is simple enough (instanced points + a vertex shader reading a uniform cursor position) to hand-roll on top of `ogl` or `regl` rather than pull in tsParticles' full feature surface (shapes, links, click modes, presets you won't use).

---

## 3. WordPress + WebGL: what actually breaks

**Confirmed, closed defect — directly relevant to your Gutenberg block editor:**

[WordPress/gutenberg#47983](https://github.com/WordPress/gutenberg/issues/47983) — *"iframe editor seemingly breaks react components context for third party libraries"* (2023-03, contributor `antpb`, building a three.js block plugin at 3ov.xyz):
- Gutenberg 6.2 wrapped the block editor canvas in an `<iframe>`. This broke a live three.js plugin.
- Root cause (found by the same reporter, confirmed by a merged three.js PR): three.js's `isWebGL2` detection used `gl instanceof WebGL2RenderingContext`. **`instanceof` checks fail across iframe boundaries** because each iframe has its own global `WebGL2RenderingContext` constructor — the object is a WebGL2 context, but it fails the `instanceof` test against the *parent* frame's constructor. three.js silently fell back to WebGL1 behaviour inside the editor iframe, breinsg `MeshStandardMaterial` and other WebGL2-only features.
- **Fix:** [mrdoob/three.js#25733](https://github.com/mrdoob/three.js/pull/25733) — changed the check to `gl.constructor.name === 'WebGL2RenderingContext'` (string comparison survives the iframe boundary; `instanceof` does not). Merged into three.js core.
- **Gutenberg's own maintainers initially reverted the iframe change for 6.2** ([#48076](https://github.com/WordPress/gutenberg/issues/48076)) specifically because of this kind of third-party breakage, before the iframe wrapper eventually shipped for good.
- **What this means for Bean:** any raw-WebGL code that does `instanceof WebGL2RenderingContext` (or any other cross-realm `instanceof` check, including `instanceof Array`/`instanceof HTMLCanvasElement` patterns some libraries use for type-guarding) will silently misbehave inside the Gutenberg editor's iframed canvas, but work fine on the live frontend — a classic "works everywhere except the one place you're actually building it" bug. This is *editor-only*, not a frontend risk, but it will burn debugging time if a chosen library has this pattern anywhere in its context-detection code. Worth a one-line grep of any adopted library's source for `instanceof.*RenderingContext` before shipping.

**No evidence found of a maintained WordPress plugin/theme shipping WebGL properly as a *product feature*.** Every `wp_enqueue_script` + three.js hit found by code search hotlinks the CDN build directly:
```
wp_enqueue_script('ve-three', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', ...);
```
(seen in `whizkidefos/volkmann-express-custom-wptheme`, `ansonphong/360-VIEWER`, `iXce/wp-thingview`, `jhonbyronquirozperez/MercuryTheme`, and others). **Every single WP+three.js repo found today uses CDN hotlinking, zero use npm-bundling.** That's a direct violation of Bean's own "no CDN ever" rule — meaning if he adopts WebGL, he'd be building the npm-bundled, versioned, self-hosted integration nobody else in the WP ecosystem has bothered to build. No prior art to lean on; he'd be first.

**`ServerSideRender` / React-remount-loop risk (inferred from R3F issues, not WP-specific, but directly transferable):** the Gutenberg editor re-renders/remounts block previews on every attribute change (this is exactly what `ServerSideRender` triggers). React-three-fiber has multiple *closed-but-recurring* reports of the same failure class this would hit:
- [pmndrs/react-three-fiber#3093](https://github.com/pmndrs/react-three-fiber/issues/3093) — "Leaking WebGLRenderer and more when unmounting"
- [pmndrs/react-three-fiber#514](https://github.com/pmndrs/react-three-fiber/issues/514) — the same leak, reported 2 years earlier, i.e. this is a recurring pattern class not a one-off
- [pmndrs/react-three-fiber#2655](https://github.com/pmndrs/react-three-fiber/issues/2655) — "Dispose of `THREE.WebGLRenderer` when unmounting `<Canvas />`"
- [pmndrs/react-three-fiber#1270](https://github.com/pmndrs/react-three-fiber/issues/1270) — "React-router-dom component unmount causes react-three-fiber Context lose" — i.e. remounting inside a router (structurally identical to Gutenberg's editor iframe remounting a block preview) breaks context.

**Direct implication:** browsers cap the number of *simultaneously live* `WebGLRenderingContext`s per page (commonly 8-16 depending on browser/GPU). Every WebGL context created must be explicitly destroyed (`gl.getExtension('WEBGL_lose_context').loseContext()` or the library's `dispose()`) on block unmount/remount, or the editor will exhaust the context limit within a normal editing session (undo/redo, attribute changes, switching blocks) and start silently failing to render — a bug class that will not show up in a quick manual test, only after sustained editing.

---

## 4. GSAP × WebGL integration — verdict

**Established pattern found, and it is exactly what you'd want:** GSAP tweens a plain JS number (`material.uniforms.uProgress.value`), and your render loop reads that number every frame. GSAP has **zero awareness of WebGL** — it just tweens object properties, so any object with a `.value` property (which is literally the shape of a three.js/raw-WebGL uniform) is a valid GSAP tween target out of the box. Confirmed live in code search:

- [jessehhydee/threejs-globe](https://github.com/jessehhydee/threejs-globe) — `gsap.to(el.uniforms.u_maxExtrusion, {...})` — literal proof of the pattern
- [akella/ParticleRainEffect](https://github.com/akella/ParticleRainEffect) — `this.material.uniforms.size.value = this.settings.size;` alongside `gsap.to(".over", {...})` in the same module, and `gsap.killTweensOf(...)` used for cleanup
- Codrops, ["From Shader Uniforms to Clip-Path Wipes: How GSAP Drives My Portfolio"](https://tympanus.net/codrops/2026/05/06/from-shader-uniforms-to-clip-path-wipes-how-gsap-drives-my-portfolio/) (2026-05-06, cited inside another repo's own doc file, `AG9898/Glass-Atlas`) — a named, dated community reference specifically on this exact integration
- [seflless/slowmo](https://github.com/seflless/slowmo) README explicitly documents the caveat: *"WebGL shaders with custom time uniforms need manual integration"* — GSAP's global timeScale/pause controls don't automatically reach into a shader's own internal time uniform; you must wire that uniform's driver through GSAP's ticker yourself (`gsap.ticker.add(callback)` is the documented mechanism, confirmed in `zvoque/docs:gsap-playbook.md`: *"gsap.ticker.add(() => renderer.render(scene, camera)); // one RAF loop"*).

**Verdict:** yes, GSAP can be the single animation driver — no second runtime needed for timing/easing. The integration is: GSAP tweens plain numbers (uniform values, or driver objects), `gsap.ticker` owns the single requestAnimationFrame loop, your WebGL render call happens inside that same ticker callback. This is a well-established, low-risk pattern with multiple independent confirmations. The one thing to get right: don't create a second RAF loop for the WebGL render — hook it into `gsap.ticker.add()` so GSAP and the shader render share one clock (per the `zvoque` note above and ScrollTrigger's own recommended practice for canvas-driven animations).

---

## 5. The honest downsides — what people regret (GitHub evidence)

| Pain point | Evidence | Severity for Bean |
|---|---|---|
| **iOS Safari context loss** | Recurring, multi-year pattern across every library checked: [three.js#26829](https://github.com/mrdoob/three.js/issues/26829) *"iOS 17 safari on iPhone 15 pro: blank white canvas and context lost in console over and over"*; [pixi.js#9676](https://github.com/pixijs/pixijs/issues/9676) *"[iOS] Safari 17.0 - WebGL: context lost. Unable to auto-detect a suitable renderer"*; [r3f#3309](https://github.com/pmndrs/react-three-fiber/issues/3309) *"Texture causing loss of context in ipadOS (iOS), 17.5.1"* | **High** — Safari/iOS is not an edge case for a UK small-business marketing site, it's a large chunk of mobile traffic. This is the single most-repeated failure mode across every library surveyed. |
| **Memory leaks on remount/navigation** | [r3f#3093](https://github.com/pmndrs/react-three-fiber/issues/3093), [r3f#514](https://github.com/pmndrs/react-three-fiber/issues/514) (same bug, 2 years apart — never fully closed as a class), [r3f#2812](https://github.com/pmndrs/react-three-fiber/issues/2812) *"useLoader() does not dispose of loader instance"* | **Medium-high** for the Gutenberg editor specifically (constant remounts on attribute change) — see §3. Lower risk on the static frontend where the block mounts once. |
| **Mobile GPU crashes / device-specific bugs** | [three.js#30767](https://github.com/mrdoob/three.js/issues/30767) *"ThreeJS crashing on M3/M4 devices"*; a long tail of `Device Issue`-labelled bugs in three.js's tracker that are GPU/driver-specific and not fixable by the library author, only worked around per-device | **Medium** — expect at least one client report of "it's broken on my phone" that has no clean fix, only a workaround or a `prefers-reduced-motion`/capability-detection fallback. |
| **`prefers-reduced-motion` handling** | **No dedicated issue or built-in support found in three.js, pixi.js, or ogl's own trackers** — this is left entirely to the implementer. None of the surveyed libraries have first-class reduced-motion awareness; it must be hand-wired (check the media query, skip WebGL init entirely or freeze the render loop). | **Direct WCAG 2.1 AA conflict with Bean's own CLAUDE.md baseline** if not handled — this is a build requirement, not a nice-to-have, and no library does it for you. |
| **Battery drain / continuous RAF loops** | Not a single GitHub issue directly on this (it's a known-but-undocumented cost, not something people file bugs about) — but every fluid/particle canonical implementation runs an uncapped `requestAnimationFrame` loop indefinitely once started, with no built-in idle/visibility-pause. | **Medium** — must hand-wire `IntersectionObserver`-gated start/stop and `document.visibilitychange` pausing yourself; no library surveyed does this by default. |
| **Abandoned dependency risk** | curtains.js (23.5KB, fits budget) — no feature commit in 16 months, **author has publicly moved to a WebGPU successor** (`gpu-curtains`); hover-effect (the canonical displacement-hover repo) — no commit in 3+ years | **Confirmed real**, not hypothetical — exactly the scenario Bean flagged as unaffordable. Two of the smallest, best-fitting-by-size candidates are both effectively unmaintained. |

---

## 6. Plain-English summary: what you'd actually be signing up for

**Problem:** you want three specific hover/cursor effects on a marketing site framework that currently ships zero WebGL.

**Effect:** the GitHub evidence says no existing library gets you there inside your stated budget and constraints (<50KB/page, npm-bundled, no CDN, graceful JS-off degradation) without you writing real WebGL code yourself:

- **The two general-purpose engines with real prior art (three.js, pixi.js) are 3-5× your entire page budget on their own.** Not "tight" — categorically over.
- **The small libraries that fit the budget (`ogl` at 34KB, `curtains.js` at 23.5KB) are the ones with the weakest maintenance signal** — `ogl` hasn't been pushed in 16 months with no formal releases at all; `curtains.js`'s own author has abandoned it for a WebGPU rewrite.
- **The canonical "copy this" implementations for your three named effects (PavelDoGreat's fluid sim, dogstudio's hover-effect) are themselves 2-3 years stale** — genuinely the reference everyone forks, but you'd be forking a base, not adopting a maintained package.
- **No WordPress prior art exists to lean on.** Every WP+three.js repo found is a CDN hotlink, which is already against your own no-CDN rule — you'd be building the npm-bundled version from nothing.
- **The Gutenberg editor's iframed canvas has a confirmed, previously-shipped-then-reverted-then-fixed compatibility bug class** (iframe `instanceof` checks) — worth a one-line source grep on whatever you pick before committing.
- **GSAP as the single animation driver is the one genuinely good piece of news** — well-established, low-risk, no second runtime, confirmed by multiple independent repos and a dated Codrops reference.
- **`prefers-reduced-motion` is entirely on you** — nothing in this ecosystem gives it to you for free, and skipping it is a direct WCAG breach against your own baseline.

**What this actually means in practice:** if Bean adopts WebGL, the realistic build is **raw/minimal WebGL (or `ogl` as a thin wrapper) + shader source copied from `lygia`/`gl-transitions` + GSAP's ticker as the render-loop driver + hand-rolled context-loss/dispose/reduced-motion/visibility handling** — not "install three.js and go." That is a genuine engineering investment (shader-level WebGL competence, explicit resource lifecycle management, iOS testing), not a drop-in dependency. Given the "bounded handful of effects" framing, this is buildable — but it is bespoke work with no maintained package doing the heavy lifting, and the honest sizing is closer to "a new competency to own" than "a library to add."
