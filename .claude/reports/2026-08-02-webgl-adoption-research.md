# WebGL adoption research — cursor/fluid effects for the SGS motion doctrine

**Date:** 2026-08-02
**Method:** research-buddies (The Nerd + The Practical One), run inline after a background-agent handoff failed to resume automatically — see note at the bottom.
**Question:** A QC council found Bean's cursor-field effect (CSS custom properties → `background-image`/`mask-image`) cannot do velocity-driven pixel warping. Award-tier cursor/fluid effects need WebGL/GLSL shaders. What does adopting WebGL actually entail — for a non-coder running an AI-assisted, npm-bundled, no-CDN WordPress block framework?

**Bottom line up front:** Adopt WebGL as a **narrow, single-purpose exception** — not a new capability class. Use **OGL** (34 KB gzipped), not three.js (182 KB — already over your whole JS budget on its own). Treat it as an **extension of Tier G**, not a new tier, because GSAP already drives shader uniforms in the wild (Codrops has a whole tutorial on exactly this). It **cannot be cloned** from computed CSS — a shader has no computed-style representation — so it must become a new DB-declared block capability the draft signals explicitly (an SGS-BEM modifier class), not something the walker infers. First step to prove or kill it: **45 minutes**, no framework code touched (see §7).

---

## 1. What it unlocks (with links)

**Plain English:** normal websites paint shapes and colours according to fixed rules ("this box is blue," "this text is 16px"). WebGL lets you hand the graphics card a small program (a "shader") that decides, pixel by pixel, in real time, how to distort an image — so a cursor moving across a photo can visibly push, melt, or ripple the pixels underneath it. CSS cannot do this: CSS moves and recolours whole elements, it cannot warp the inside of one.

Confirmed 2026 production examples (Codrops is the industry's working reference for this genre):

- **Scroll-revealed shader image galleries** — image reveal effects driven by shader uniforms + GSAP ScrollTrigger, published Feb 2026: https://tympanus.net/codrops/2026/02/02/building-a-scroll-revealed-webgl-gallery-with-gsap-three-js-astro-and-barba-js/
- **Video "melt" transitions on hover** driven by GSAP-controlled shader uniforms, published May 2026: https://tympanus.net/codrops/2026/05/06/from-shader-uniforms-to-clip-path-wipes-how-gsap-drives-my-portfolio/
- **Ripple / reveal / dynamic-blur shader effects animated by GSAP** — the direct proof that GSAP (a tool already in your stack) can drive this: https://tympanus.net/codrops/2025/10/08/how-to-animate-webgl-shaders-with-gsap-ripples-reveals-and-dynamic-blur-effects/
- **Classic image displacement/liquid distortion** (the "hover an image, it melts into the next one" effect — closest to what a QC council would call "award-tier cursor/fluid") — PixiJS + GSAP, still the reference implementation people fork: https://tympanus.net/codrops/2017/10/10/liquid-distortion-effects/ and its code: https://github.com/codrops/LiquidDistortion/
- **A real production WordPress site built with exactly this stack** — Analogue Production, built by Martin Laxenaire (the author of curtains.js) using curtains.js + GLSL + WordPress + custom AJAX navigation: reactive project slider with vertex displacement and chromatic-aberration shaders, plus WebGL animation on team photos: https://www.martin-laxenaire.fr/analogue-production — this is the single most relevant proof-of-existence: **one person built this on WordPress and shipped it.**
- **Text distortion**: https://tympanus.net/codrops/2025/03/24/animating-letters-with-shaders-interactive-text-effect-with-three-js-glsl/
- **Particle systems** (dissolve-on-scroll, generative particle fields): https://tympanus.net/codrops/2025/02/17/implementing-a-dissolve-effect-with-shaders-and-particles-in-three-js/ and https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/

**A useful reality check from a practitioner, not a vendor:** whether the full-screen "brand activation" version of this actually converts customers is genuinely disputed — *"WebGL on a smaller scale to enhance a site might have some value… the fully interactive ones are for 'brand activation' and PR"* — https://www.reddit.com/r/web_design/comments/1do2af0/do_highly_interactive_webgl_websites_actually/. This matters for scope: the commercially defensible version is **one bounded accent effect**, not a WebGL-everywhere redesign.

**AI design tools (v0, Framer, Spline, Rive) — gap flagged honestly:** I could not find a dated, sourced 2026 account of what these specifically export for canvas/WebGL. What is structurally true from how Spline and Rive distribute their work: both ship their **own proprietary runtime player** (a black-box JS blob you embed, not code you own or can shrink). That is a hard mismatch with "no CDN, ever" and your byte budget — you'd be importing someone else's engine, not authoring a shader. Framer's canvas exports are closer to standard DOM/CSS. Treat this whole paragraph as *reasoned inference from known distribution models*, not a verified 2026 fact — worth a 10-minute spot-check before it drives any decision.

---

## 2. Library decision

**Plain English on the trade-off:** every library is a pre-written toolbox that saves you from writing raw WebGL by hand. Bigger toolbox = more features but more bytes shipped to every visitor; smaller toolbox = you write more yourself but ship less.

| Library | Gzipped size | Maintenance | Verdict for Bean |
|---|---|---|---|
| **three.js** | **182 KB** (bundlephobia, r185, checked 2026-08-02) | Extremely active — 114,170 stars, pushed 2026-08-01 | **Rejected on budget alone.** Your whole JS budget is 50 KB/page. three.js is 3.6× that number before you've written a single effect. Right tool for full 3D scenes/product configurators, wrong tool for "a bounded cursor effect." |
| **pixi.js** | 251 KB | Active — 47,929 stars, pushed 2026-07-19 | Rejected, same reason, and it's bigger than three.js. |
| **regl** | 41.5 KB | **Functionally dormant** — no real commits since Nov 2024, only a June 2026 README edit and dependabot bumps: https://github.com/regl-project/regl/commits | Rejected — don't build on an unmaintained dependency for a solo AI-assisted shop; nobody is fixing bugs upstream. |
| **curtains.js** | 23.5 KB | **Legacy/maintenance mode.** Its own author has moved on to a WebGPU rewrite (`gpu-curtains`); curtains.js itself last pushed April 2025. | Purpose-built for exactly your use case (turns an `<img>` into a WebGL-distortable plane) and proven on a real WordPress site by its own author (§1). But it's the old codebase, not where the author is investing. |
| **OGL** | **34.2 KB** (npm's own page states the stripped core is closer to 8 KB gzipped if you don't need the maths helpers: https://www.npmjs.com/package/ogl) | Stable, low churn (last push April 2025) but this is normal for a finished minimal wrapper, not a red flag | **Recommended.** |
| Raw WebGL | 0 KB | N/A | Smallest possible, steepest learning curve, no safety net for AI-generated code (see §3d). Only worth it for a single trivial effect. |
| WebGPU (native) | 0 KB | Native API, not yet universal | Not ready as the *only* path — see §4. |

**Direct practitioner endorsement of this exact call**, from someone with your exact profile ("a handful of bounded effects, not a 3D scene"):

> *"I would suggest you look into 'ogl' js, which is another webgl wrapper but its much smaller (core lib is around 10kb…)"* — https://www.reddit.com/r/threejs/comments/1mnqdp1/is_threejs_overkill_for_my_project/

> *"I use three.js all the time, but only when the business goals allow for big bundle. I'd rarely use three.js for a marketing hero that needs to load instantly…"* — https://www.reddit.com/r/threejs/comments/1lyu4tx/whats_the_smallest_size_youve_got_basic_threejs/

**The Practical One's pushback:** OGL's low commit velocity means if you hit a genuine library bug, you are on your own — no maintainer fixing it for you next week. That's an acceptable trade for a 34 KB library doing one bounded job; it would not be acceptable for something load-bearing across every page. Keep OGL usage to the one effect, don't let it become a dependency you lean on everywhere.

**Recommendation: OGL.** It fits your budget with room to spare (34 KB out of a 50 KB JS budget — tight but survivable if this is genuinely the ONLY JS on that page, which conflicts with GSAP/Lenis already being Tier G/H residents — see §4 for how this actually nets out), it's the library practitioners in your exact situation independently recommend, and it shares three.js's mental model (so a future upgrade path exists) without three.js's weight.

---

## 3. How it works in WordPress specifically

**a) Editor canvas (iframed) vs frontend.** WordPress is actively migrating the block editor to a fully-iframed canvas, and this is directly relevant on WP 7.0.2 heading toward 7.1: https://gutenbergtimes.com/the-post-editor-is-going-full-iframe-what-block-developers-need-to-know-before-wordpress-7-1/ (core tracking issue: https://github.com/WordPress/gutenberg/issues/70743). The documented failure mode: a naively-written script assumes the *main window's* `document`/`window`, but the canvas element actually lives inside the *iframe's* document — the script initialises against the wrong window and silently does nothing: https://github.com/WordPress/gutenberg/issues/31022. **Effect:** any WebGL block must get its canvas element via the block's own React ref inside `edit()`, never a global `document.querySelector`. **Solution:** WordPress publishes an official migration guide for exactly this: https://developer.wordpress.org/block-editor/reference-guides/block-api/block-api-versions/block-migration-for-iframe-editor-compatibility/. This is a known, documented gotcha — not a hypothetical risk.

**b) ServerSideRender previews — genuine gap, flagged honestly.** No sourced practitioner account exists for "canvas inside SSR." Reasoned inference (not verified): SSR returns static HTML — a shader needs a running animation loop to paint anything, so the SSR preview would show an empty `<canvas>` until the block's own edit-side script boots it. Your own captured lesson (`feedback_ssr_fixes_hand_built_preview_drift.md`) says SSR fixes *drift* between preview and frontend for dynamic blocks generally — but that's about matching *markup*, and a shader effect isn't markup. **Practical implication:** don't rely on SSR alone for this block's editor preview; the editor experience will likely need to be "static placeholder + live effect only on the frontend," which is fine — clients editing content don't need to see the shader animate while they type.

**c) Conditional loading so an effect-free page ships zero bytes.** This is a solved, native WordPress pattern, not exotic:
- `has_block()` inside `wp_enqueue_scripts` — only load the heavy script if the block is actually on the page: https://wordpress.stackexchange.com/questions/328536/load-css-javascript-in-frontend-conditionally-if-block-is-used
- The native block-registration mechanism does this automatically per rendered block: `wp_enqueue_registered_block_scripts_and_styles()` — https://developer.wordpress.org/reference/functions/wp_enqueue_registered_block_scripts_and_styles/

This maps directly onto your existing rule (viewScriptModule / ES modules for interactive blocks) — nothing new to invent here.

**d) `prefers-reduced-motion` — genuine gap, but the pattern is standard.** No WebGL-specific practitioner writeup was found, but the general accessibility pattern is well established and directly portable: gate the `requestAnimationFrame` loop itself behind `matchMedia('(prefers-reduced-motion: reduce)')`, and either freeze the shader on its first painted frame or skip initialising it entirely, falling back to a static image. This is exactly the shape of a Tier V/G fallback you already build for CSS animations — same principle, just gating a JS loop instead of a CSS transition. Source for the general mechanism: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion

**e) Mobile battery/thermal/GPU — the surprising finding.** The intuitive assumption ("WebGL is heavy, it'll drain the battery") is not what practitioners report. A GPU shader running the whole effect in parallel on dedicated hardware can be *more* battery-efficient than the equivalent CPU/DOM animation: *"with WebGL the entire program can run in a shader, in parallel, in ways that sip battery compared to a CPU based approach"* — https://www.reddit.com/r/webdev/comments/1fdv843/battery_usage_dom_vs_canvas_vs_webgl/. The real risk practitioners flag is **oversized textures**, not the API itself — real iPhone WebGL performance advice centres on compressing/resizing images fed to the shader: https://www.reddit.com/r/threejs/comments/1k91ho7/poor_performance_webgl_on_iphone/. **Practical implication:** the discipline that matters is "keep the source image small," which is something your image-optimiser pipeline already does — this is not a new burden.

**f) The genuinely new maintenance risk — GLSL and AI-generated shader code.** GLSL (the shader language) is a different language from JS/CSS, and it is the part of this that Claude Code is least battle-tested at. A direct practitioner account of exactly this failure mode: *"mismatched variable names across shader code"* when using Claude to generate GLSL — https://benfarrell.com/blog/2024-12-01-webgl-with-claudeai/. This is the single most important practical constraint in this whole brief: **a bug in a GLSL shader doesn't throw a JS error you can read — it either does nothing, or paints something visually wrong, with no stack trace.** For a non-coder QC'ing by eye, that means shader bugs are silent and only catchable by looking at the actual rendered output, every time, not by reading logs.

---

## 4. Where it sits in the doctrine — new Tier, or Tier G extension?

**The case for a new tier:** WebGL is a categorically different technology from CSS (Tier V) or JS-driven CSS/DOM manipulation (Tier G/GSAP) — it runs on the GPU via a different programming language (GLSL), with different failure modes (silent visual bugs, not JS exceptions), different debugging tools, and a genuinely different skill ceiling. Lumping it into "Tier G" hides that difference from anyone reading the doctrine later.

**The case for extending Tier G:** the actual *mechanism* by which the effect gets driven is already GSAP — Codrops' own Oct 2025 tutorial is literally titled "How to Animate WebGL Shaders with GSAP" (https://tympanus.net/codrops/2025/10/08/how-to-animate-webgl-shaders-with-gsap-ripples-reveals-and-dynamic-blur-effects/). GSAP doesn't care whether the property it's tweening is a CSS custom property or a shader uniform — from the animation-timing point of view it's the same job GSAP already does under your doctrine's Tier G bounded-exception test. The thing that's new isn't "how do we animate it," it's "what do we animate" — and your doctrine's tiers were named for *animation mechanism* (vanilla vs GSAP vs helper), not for *rendering technology*.

**Recommendation: extend Tier G, don't add a tier — but name the WebGL/OGL rendering layer explicitly inside it.** Your doctrine "deliberately resists adding tiers" and this genuinely clears the bar of "what vanilla/CSS cannot do" that Tier G exists for — velocity-driven pixel warping is *definitionally* impossible in CSS (§ the QC council already proved this). Adding a fourth tier for one narrow, bounded use case (one cursor effect, on pages that opt in) would be exactly the kind of tier-sprawl the doctrine exists to prevent. What genuinely deserves its own line in Spec 38 is a **sub-clause under Tier G**: "WebGL/OGL shader rendering, driven by GSAP-tweened uniforms, is permitted as a bounded Tier G exception — same admission bar as any Tier G effect (CSS categorically cannot do it), same closed-scope discipline as Tier H (one library, one job, no general-purpose 3D engine)." That's honest about what's new (a rendering technology) without inventing governance overhead for a single effect.

---

## 5. The cloning question

**Short answer: yes, WebGL is fundamentally unclonable by your current pipeline — and that's fine, because it was never going to be inferred, it has to be declared.**

Your pipeline works by reading a draft's **computed CSS** — the browser's resolved values for properties like `background-image`, `padding`, `grid-template-columns`. A shader has no computed-style equivalent: `getComputedStyle()` on a `<canvas>` element returns nothing about what's being drawn inside it, because the drawing isn't CSS — it's a program running on the GPU that Bean's walker has no way to introspect. There is no property to read, faithfully transfer, or diff. This isn't a gap in the current implementation to fix — it's a structural fact about how WebGL works, same category as "the walker can't read a client's business logic."

**What a draft would need to carry instead:** since it can't be inferred from computed style, it has to be an explicit **SGS-BEM signal**, the same mechanism you already use for anything the walker can't derive from raw CSS alone. Concretely: a draft author (or Bean, or a future client using the AI builder) marks the element with a modifier class the walker is taught to recognise as a *capability request*, not a style — e.g. `.sgs-hero__cursor-field--fluid-distortion`. The walker resolves that modifier to the `sgs/cursor-field` block's `effectMode` attribute (typed enum: `css` | `webgl-distortion`), the same way it already resolves BEM classes to block slugs via `slot_synonyms`/`slots`. **This is a new declared capability, not a converter workaround** — it slots into your existing DB-first, no-hardcoded-dicts architecture (R-31-1) rather than fighting it. What it explicitly cannot do is what your fidelity measurement does for everything else: verify the *degree* of fluidity/distortion by comparing computed values, because there are none. Fidelity for this one block becomes Bean's-eye-only (R-31-13's second half, without the first half's numbers to back it up) — worth stating plainly rather than pretending a score exists.

---

## 6. Adoption cost, honestly

**The Practical One's hard pushback, stated plainly:** this is not a "few hours" feature. The realistic first build of one bounded WebGL cursor-distortion effect, done properly (OGL setup, one fragment shader, iframe-safe editor handling, conditional loading, reduced-motion fallback, mobile texture sizing) is a **half-day to one-day** piece of focused work for Claude Code — small compared to how this sounds, but *not* a same-session add-on to an existing block. The part that will actually eat time isn't the JS/WordPress plumbing (all of that is solved, documented pattern — §3) — it's **shader debugging**, because GLSL bugs are silent and visual, and every iteration means Bean looking at the rendered output himself, not reading an error log. That maps directly onto his own "measurement vs eye" rule (`feedback_a_green_measurement_is_not_fidelity.md`) — there is no green tick for a shader, ever, only his eye.

**What this is NOT:** a WebGL-everywhere redesign, a three.js adoption, or a new general-purpose 3D capability. Scope creep here (someone getting excited and reaching for three.js "since we're doing WebGL anyway") is the single most likely way this goes over budget — both time budget and the literal byte budget.

---

## 7. Smallest possible first step (under an hour) to prove or kill it

**Goal:** answer "can Claude Code actually produce a working, iframe-safe, WordPress-embeddable OGL shader effect at all" — before touching Spec 38, before building a block, before any DB changes.

1. **(15 min)** In a throwaway local HTML file (not in the repo, not a block), get Claude Code to build the smallest possible OGL scene: a single `<canvas>`, one fragment shader that displaces a static test image based on mouse position (this is literally the Codrops "liquid distortion" pattern, minus PixiJS — OGL equivalent). No WordPress, no build step, just `npm install ogl` and a script tag.
2. **(15 min)** Open it in a browser yourself. Does it look like a real fluid-distortion effect, or does it look broken/flat? This is the actual bar-clearing test — a working demo either looks obviously right to your eye or obviously doesn't, no measurement needed.
3. **(15 min)** If it looks right: check the gzipped size of what actually shipped (`npm run build`, check the output file size) against the 34 KB OGL number this brief cites — confirm it's real, not a guess.
4. **Decision gate:** if it looks convincingly fluid AND ships under ~40 KB total → this is worth doing properly as a Tier G sub-clause + a real `sgs/cursor-field` `effectMode` attribute. If it looks flat/broken after one round of iteration → kill it now, before any WordPress integration work, and keep the current CSS-custom-property cursor field as the ceiling.

This costs under an hour, touches zero production code, and answers the one question that actually matters before any doctrine or block work: **can this pipeline (Claude Code + you looking at it) actually produce a convincing shader effect at all.**

---

## Sources (consolidated)

**Effects / examples:** https://tympanus.net/codrops/2026/02/02/building-a-scroll-revealed-webgl-gallery-with-gsap-three-js-astro-and-barba-js/ · https://tympanus.net/codrops/2026/05/06/from-shader-uniforms-to-clip-path-wipes-how-gsap-drives-my-portfolio/ · https://tympanus.net/codrops/2025/10/08/how-to-animate-webgl-shaders-with-gsap-ripples-reveals-and-dynamic-blur-effects/ · https://tympanus.net/codrops/2017/10/10/liquid-distortion-effects/ · https://github.com/codrops/LiquidDistortion/ · https://tympanus.net/codrops/2025/03/24/animating-letters-with-shaders-interactive-text-effect-with-three-js-glsl/ · https://tympanus.net/codrops/2025/02/17/implementing-a-dissolve-effect-with-shaders-and-particles-in-three-js/ · https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/ · https://www.martin-laxenaire.fr/analogue-production · https://www.reddit.com/r/web_design/comments/1do2af0/do_highly_interactive_webgl_websites_actually/

**Library sizes/maintenance:** https://bundlephobia.com/package/three · https://bundlephobia.com/package/pixi.js · https://bundlephobia.com/package/regl · https://bundlephobia.com/package/curtainsjs · https://bundlephobia.com/package/ogl · https://www.npmjs.com/package/ogl · https://github.com/regl-project/regl/commits · https://github.com/mrdoob/three.js · https://github.com/martinlaxenaire/curtainsjs · https://github.com/martinlaxenaire/gpu-curtains · https://www.reddit.com/r/threejs/comments/1mnqdp1/is_threejs_overkill_for_my_project/ · https://www.reddit.com/r/threejs/comments/1lyu4tx/whats_the_smallest_size_youve_got_basic_threejs/ · https://www.reddit.com/r/threejs/comments/1006ob1/webpack_bundle_over_1mb_how_should_i_reduce/

**WordPress mechanics:** https://gutenbergtimes.com/the-post-editor-is-going-full-iframe-what-block-developers-need-to-know-before-wordpress-7-1/ · https://github.com/WordPress/gutenberg/issues/70743 · https://github.com/WordPress/gutenberg/issues/31022 · https://developer.wordpress.org/block-editor/reference-guides/block-api/block-api-versions/block-migration-for-iframe-editor-compatibility/ · https://wordpress.stackexchange.com/questions/328536/load-css-javascript-in-frontend-conditionally-if-block-is-used · https://developer.wordpress.org/reference/functions/wp_enqueue_registered_block_scripts_and_styles/

**Mobile/battery/reduced-motion:** https://www.reddit.com/r/webdev/comments/1fdv843/battery_usage_dom_vs_canvas_vs_webgl/ · https://www.reddit.com/r/threejs/comments/1k91ho7/poor_performance_webgl_on_iphone/ · https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion

**AI-generated shader quality:** https://benfarrell.com/blog/2024-12-01-webgl-with-claudeai/

**WebGPU (context for §4):** https://caniuse.com/webgpu · https://web.dev/blog/webgpu-supported-major-browsers · https://webo360solutions.com/blog/webgpu-browser-support/

---

## Gaps flagged honestly (not filled with guesses)

- What v0/Framer/Spline/Rive concretely export for canvas/WebGL in 2026 — no dated sourced account found; the Spline/Rive "proprietary runtime" point is reasoned inference, not verified.
- ServerSideRender behaviour with a live canvas — no practitioner account found; §3b is reasoned inference from how SSR and shaders each work, flagged as needing your own verification before being relied on.
- `prefers-reduced-motion` specifically for WebGL loops (as opposed to CSS animations generally) — no WebGL-specific writeup found; the recommended pattern is the standard `matchMedia` gate applied to the render loop, not a WebGL-specific technique.

## Note on process

This brief was produced by one Nerd-role research pass (Sonnet, background — completed and its findings are folded in above) plus my own direct research filling the Practical One's role and the remaining gaps, run inline in this same turn after an earlier attempt wrongly implied background agents would resume automatically across turns. No discussion/convergence round or gap-analysis grading was run — flagging that omission rather than silently skipping it. If you want the full research-buddies discussion-round rigour (a second pass specifically stress-testing the recommendations above), say so and I'll run it as a follow-up.
