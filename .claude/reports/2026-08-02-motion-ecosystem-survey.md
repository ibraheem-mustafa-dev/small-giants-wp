# Motion / Effects Ecosystem Survey — what exists, not just what Bean named

**Date:** 2026-08-02 · **Method:** `gh api` licence verification (SPDX, live-checked) + web survey of 2026 award-tier sites · **Doctrine:** every entry is tagged with the SGS tier it needs — CSS → GSAP → Lenis → WebGL (Spec 38 §1) — because the doctrine is a ratchet toward the cheapest tier that gets the effect.

**How to read the tables:** Licence is verified via `gh api repos/OWNER/REPO --jq .license.spdx_id` — not a README badge. ✅ = usable to ship to paying clients. 🚫 = flag, do not copy code (technique-reference only, or needs a legal check).

---

## 1. Scroll-driven / scroll-orchestration libraries

**What it's for:** anything that reveals, transforms, or scrubs content as the user scrolls — the single most common award-tier mechanic. This is infrastructure, not a visual effect on its own.

| Repo | Licence | Size | Deps | Maintained | Tier | Parameterisable |
|---|---|---|---|---|---|---|
| [darkroomengineering/lenis](https://github.com/darkroomengineering/lenis) | ✅ MIT | ~3-6KB gzip | 0 | Yes (pushed 2026-07-23, 15.2k★) | H (helper — already in Spec 38's closed list) | Yes — duration/easing/orientation are clean options |
| [GSAP + ScrollTrigger](https://github.com/greensock/GSAP) | ✅ **now free for commercial use** (Webflow acquired GSAP, went 100% free incl. all Club plugins on 2026-04-30 — verified via [Webflow's own announcement](https://webflow.com/blog/gsap-becomes-free) and [CSS-Tricks](https://css-tricks.com/gsap-is-now-completely-free-even-for-commercial-use/)) | ~30-70KB per plugin bundle | 0 core | Yes, 27.3k★ | G (bounded exception tier in Spec 38) | Yes — timelines/eases are first-class config |
| [mciastek/sal](https://github.com/mciastek/sal) | ✅ MIT | <2.8KB | 0 | Stale (last push 2023) | V (CSS/IntersectionObserver) | Yes — data-attributes are the API |
| [w3c/IntersectionObserver](https://github.com/w3c/IntersectionObserver) | native browser spec, not a library | 0 | 0 | — | V | N/A — this is the platform primitive everything above is built on; note it here so you know reveal-on-scroll needs **zero** library in the simplest case |

**What I'd start from:** Lenis (already adopted) + native `IntersectionObserver` for simple reveals; escalate to GSAP ScrollTrigger only for scrubbed/pinned sequences vanilla can't do. Skip `sal` — unmaintained since 2023, and IntersectionObserver alone replaces it.

---

## 2. Text-effect libraries (splitting, kinetic type, scramble)

**What it's for:** the single biggest 2026 award-tier vocabulary shift — see §7. These libraries just do the mechanical part (breaking text into animatable spans); the animation itself is CSS or GSAP on top.

| Repo | Licence | Size | Deps | Maintained | Tier | Parameterisable |
|---|---|---|---|---|---|---|
| [shshaw/Splitting](https://github.com/shshaw/Splitting) | ✅ MIT | small, no deps | 0 | Yes (pushed 2024-06, still the reference impl) | V — outputs CSS custom properties, animate with pure CSS | Yes — by design (CSS vars per char/word/line) |
| [lukePeavey/SplitType](https://github.com/lukePeavey/SplitType) | ISC (verified via search; `gh api` returned no licence file on this fork history — check before shipping) | tiny | 0 | Low activity (last release 2023) | V/G — feeds GSAP SplitText as a free alternative | Yes |
| GSAP SplitText (bundled) | ✅ free since the 2025 Webflow move (was previously Club-only) | part of GSAP bundle | GSAP core | Yes | G | Yes |
| Text-scramble effect | No single canonical repo — it's a ~40-line technique (swap chars to random glyphs then resolve), commonly hand-rolled from a CodePen/Coding Train tutorial | trivial | 0 | N/A | V — pure `setInterval`/rAF + CSS, no library needed | Fully — it's a parameter set (charset, speed, resolve order) |

**What I'd start from:** Splitting.js (MIT, zero deps, CSS-var output) for word/char/line splitting; hand-roll the scramble effect as a ~40-line vanilla utility rather than pulling a dependency — this is a case where the "library" is smaller than its own README, and Bean's doctrine (cheapest tier) says don't add a dependency for a technique this small.

---

## 3. Marquee / infinite-loop systems

**What it's for:** the "logo strip" / trust-bar style continuous scroll, and the bigger 2026 revival — full-width kinetic type marquees as a hero device (see §7).

| Repo | Licence | Size | Deps | Maintained | Tier | Parameterisable |
|---|---|---|---|---|---|---|
| [justin-chu/react-fast-marquee](https://github.com/justin-chu/react-fast-marquee) | Needs direct LICENSE-file check before use — not confirmed MIT via API in this pass; an Ember port of it is MIT, original unconfirmed | small | React | Active | V (pure CSS animation under the hood) | Yes |
| Hand-rolled CSS marquee (`@keyframes` + `transform: translateX`, duplicated content for seamlessness) | N/A — technique, not a repo | ~10 lines CSS | 0 | N/A | V | Fully |

**What I'd start from:** don't pull a component library for this — it's a CSS keyframe loop with duplicated DOM content. SGS's own `sgs/trust-bar` already has the infrastructure; a hand-rolled CSS marquee utility class is the cheapest-tier answer and avoids a licence question entirely. **This is a case where I would not adopt any library** — the mechanic is too simple to justify a dependency.

---

## 4. Physics / generative / particle systems

**What it's for:** interactive backgrounds, "physics playground" hero sections, particle fields — high visual impact, but the heaviest tier (often WebGL/canvas) and the easiest to overuse.

| Repo | Licence | Size | Deps | Maintained | Tier | Parameterisable |
|---|---|---|---|---|---|---|
| [liabru/matter-js](https://github.com/liabru/matter-js) | ✅ MIT | ~90KB | 0 | Yes (pushed 2024-08) | canvas, not WebGL — sits below Spec 38's WebGL tier | Yes — gravity/restitution/friction are engine params |
| [tsparticles/tsparticles](https://github.com/tsparticles/tsparticles) | ✅ MIT | modular — 5-40KB depending on bundle chosen | 0 core | Very active (pushed 2026-07-28) | canvas/WebGL modes both available, pick canvas mode to stay off the WebGL tier | Yes — extensive JSON config, genuinely client-editable as block settings |
| [VincentGarreau/particles.js](https://github.com/VincentGarreau/particles.js) | ✅ MIT | ~20KB | 0 | **Dead** — no meaningful commits in years; tsParticles is its maintained successor | canvas | Yes, but superseded |
| [pmndrs/cannon-es](https://github.com/pmndrs/cannon-es) | ✅ MIT | ~100KB | 0 | Yes | WebGL-adjacent (3D physics, pairs with three.js) | Yes |

**What I'd start from:** tsParticles in canvas mode for any "floating particles / connected dots" background — it's actively maintained, MIT, and its config is genuinely a clean JSON object that maps to block attributes (real client-facing settings, not hardcoded constants). Skip particles.js — it's dead, tsParticles replaced it. Matter.js only if a client build genuinely needs draggable/collidable physics objects (rare; flag this as "impressive but easy to overuse" — most "physics" award-tier sites are actually simple spring/tilt effects, not full rigid-body engines).

---

## 5. 3D / product-viewer / WebGL-tier

**What it's for:** product configurators, glTF model viewers, "3D card" scenes. This is the top of Bean's doctrine ratchet — only reach here when CSS/GSAP genuinely cannot do it.

| Repo | Licence | Size | Deps | Maintained | Tier | Parameterisable |
|---|---|---|---|---|---|---|
| [google/model-viewer](https://github.com/google/model-viewer) | ✅ Apache-2.0 | ~200KB (web component, lazy-loadable) | bundles three.js internally but ships as one custom element | Yes (pushed 2026-07-07, Google-maintained) | WebGL | Yes — `<model-viewer>` attributes are the whole API; genuinely drop-in as a block |
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | ✅ MIT | 150KB+ core, more with loaders | 0 | Extremely active (114k★, daily commits) | WebGL — the reference engine everything else wraps | Yes, but low-level — needs a wrapper to be client-facing |
| [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) | ✅ MIT | React-only | React + three.js | Very active | WebGL | Only useful if the framework is React; SGS is PHP/vanilla-JS, so this is reference-only, not directly adoptable |
| [pmndrs/detect-gpu](https://github.com/pmndrs/detect-gpu) | ✅ MIT | tiny (~10KB benchmark data) | 0 | Yes (pushed today) | Infrastructure — the GPU-tier gate that decides whether to even attempt WebGL | N/A — it's a detector, not an effect |

**What I'd start from:** `model-viewer` for any client who needs an actual rotatable 3D product (verified honest use of WebGL — a genuinely 3D need). For everything else marketed as "3D" on award sites, check first whether it's really a CSS 3D transform (`perspective` + `rotateY` on hover) — the vast majority of "tilt card" and "3D hover" effects on Awwwards are **not** WebGL at all (see §6). Pair any real WebGL adoption with `detect-gpu` so low-tier devices get a static fallback — this is the missing piece Bean hasn't asked for (see §8).

---

## 6. Tilt / parallax / cursor-follower (the CSS-tier effects marketed as "advanced")

**What it's for:** the hover-tilt card, magnetic buttons, custom cursor-follows-mouse effects seen everywhere on agency sites — almost always achievable in the cheapest tier.

| Repo | Licence | Size | Deps | Maintained | Tier | Parameterisable |
|---|---|---|---|---|---|---|
| [micku7zu/vanilla-tilt.js](https://github.com/micku7zu/vanilla-tilt.js) | ✅ MIT | ~4KB | 0 | Low activity (last push 2024-03) but stable/complete — this class of library doesn't need churn | V (CSS 3D transform + rAF, no WebGL) | Yes — max tilt angle, perspective, scale, glare are all options |
| [tholman/cursor-effects](https://github.com/tholman/cursor-effects) | Licence not returned by API (no `license` field set) — **flag as needs-check**, treat as technique reference only | small | 0 | Low activity | V | Yes per-effect |
| [IanLunn/Hover](https://github.com/IanLunn/Hover) | 🚫 **NOASSERTION** (no LICENSE file — all-rights-reserved by default, verified via `gh api`) | CSS-only | 0 | Stale | V | N/A — flag, technique-reference only, do not copy classes verbatim into a client build |

**What I'd start from:** vanilla-tilt.js is the honest pick — small, MIT, does exactly the tilt-card effect that most "3D hover" award-site claims turn out to be. For magnetic-button and cursor-follower effects, these are commonly ~20-30 lines of vanilla JS (mousemove + rAF + CSS transform) — same call as the marquee and scramble-text: **write it, don't dependency it**, per the doctrine's cheapest-tier-first rule.

---

## 7. Image sequences, FLIP, and "boring but critical" infrastructure

**What it's for:** the plumbing that makes the flashy stuff perform — Bean asked for this explicitly.

| Repo | Licence | Size | Deps | Maintained | Tier | Parameterisable |
|---|---|---|---|---|---|---|
| [aholachek/react-flip-toolkit](https://github.com/aholachek/react-flip-toolkit) | ✅ MIT | ~15KB | React | Maintained but React-only (reference for the FLIP technique, not directly adoptable in SGS's vanilla/PHP stack) | V/G | Yes |
| [pmndrs/detect-gpu](https://github.com/pmndrs/detect-gpu) | ✅ MIT | tiny | 0 | Active | Infrastructure | N/A |
| `prefers-reduced-motion` (native media query + `matchMedia`) | native platform API | 0 | 0 | N/A | V | N/A — this alone is 90% of what's needed; [magica11y/prefers-reduced-motion](https://github.com/magica11y/prefers-reduced-motion) exists as a tiny wrapper but the one-line `matchMedia` call is simpler than adding it |
| `IntersectionObserver` (native) | native | 0 | 0 | N/A | V | N/A — the lazy-load / scroll-orchestration primitive under Lenis, sal, and most reveal libraries |

**What I'd start from:** none of this needs a dependency. `window.matchMedia('(prefers-reduced-motion: reduce)')` + a change listener is the entire reduced-motion gate — recommend building this as a shared SGS utility (one file, used by every Tier-G/H effect) rather than adopting a library for it. FLIP technique itself is worth knowing conceptually (measure→invert→play) but `react-flip-toolkit` is React-only and not directly portable to SGS.

---

## 8. Things Bean has not asked for but probably wants

The highest-value discoveries from the 2026 award-tier sweep, ranked by how much they'd differentiate SGS builds from a template site — none of these were in his original five:

1. **GSAP is now 100% free, including every formerly-paid Club plugin (SplitText, MorphSVG, DrawSVG, etc.), since Webflow's acquisition went into effect 2026-04-30.** This is a genuine tier unlock — the framework doctrine currently treats GSAP as "bounded exception" partly on cost grounds; that constraint is gone. Worth revisiting Spec 38 §1 to check whether any plugin previously avoided for licensing reasons is now safe to use. [Webflow's announcement](https://webflow.com/blog/gsap-becomes-free), [CSS-Tricks confirmation](https://css-tricks.com/gsap-is-now-completely-free-even-for-commercial-use/).

2. **`detect-gpu` (MIT, pmndrs) — GPU-tier gating before any WebGL attempt.** Nothing in the current SGS motion doctrine gates WebGL by device capability. Any client-facing 3D feature (model-viewer, particle WebGL mode) should check `getGPUTier()` first and fall back to a static image on tier 0/1 devices — this is the difference between "impressive" and "the site is broken on a five-year-old laptop."

3. **Text-scramble and kinetic-type (variable-font weight/width mapped to scroll position) are the dominant 2026 Awwwards vocabulary right now** — more common than any single effect Bean named. Both are cheap-tier (CSS custom properties + `font-variation-settings`, or a ~40-line scramble utility) — high visual payoff for near-zero dependency cost, and a strong differentiator against £10k agency sites that are often just GSAP timelines with no genuinely novel technique.

4. **`model-viewer` (Apache-2.0, Google-maintained) as a genuinely turnkey `<model-viewer>` web component** for any client who sells a physical product — restaurants with signature dishes, product-based SMEs. This is the one WebGL-tier item that's honestly a drop-in block rather than a build project, and it's the kind of feature that justifies premium pricing over template competitors.

5. **shadcn-pattern component libraries (react-bits, Magic UI — both MIT) are not directly usable** (SGS is PHP/vanilla, not React) **but are the best available reference for "what does award-tier interaction vocabulary actually look like in code"** — worth a design-reference read-through even though nothing is copy-pasteable.

6. **Liquid-glass / refractive-blur surfaces are the single biggest 2026 aesthetic trend** (Apple's iOS 26 Liquid Glass triggered a wave of CSS+SVG-filter recreations). [nikdelvin/liquid-glass](https://github.com/nikdelvin/liquid-glass) is a CSS+SVG pixel-perfect recreation — **licence not yet verified, check before adopting**, but the technique (backdrop-filter + SVG `feDisplacementMap`) is pure CSS/SVG, meaning it belongs at Tier V (cheapest) despite looking like a WebGL effect. This is exactly the kind of "marketed as advanced, actually CSS" case the doctrine rewards.

---

## Summary table — fastest wins, ranked

| Pick | Why first |
|---|---|
| GSAP relicensing (free since Apr 2026) | Zero build cost, immediately expands what Tier-G work can legally ship |
| `detect-gpu` | One-time infrastructure add, protects every future WebGL feature |
| Hand-rolled scramble-text + `matchMedia` reduced-motion gate | Cheapest tier, highest differentiation, no dependency risk |
| Splitting.js (MIT) for kinetic type | Small, maintained-enough, unlocks the #1 2026 award-tier vocabulary |
| tsParticles (MIT, actively maintained) | Only particle library worth adopting — particles.js is dead |
| `model-viewer` (Apache-2.0) | The one honest WebGL-tier client feature worth building as a block |

**What I would not adopt:** react-fast-marquee (licence unconfirmed, mechanic too simple to need a dependency), IanLunn/Hover (NOASSERTION licence — genuinely unusable to copy from), particles.js (dead, superseded), any React-only library (react-three-fiber, react-flip-toolkit) as a direct dependency — reference-only given SGS's PHP/vanilla-JS stack.
