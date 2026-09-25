---
doc_type: spec
spec_id: 38
spec_version: 1.1
status: active
title: SGS Motion System — the four-tier motion doctrine (V/G/H/W) + the GSAP (Tier G) effects layer
created: 2026-07-29
last_verified: 2026-09-19
depends_on: [31, 32, 35, 37, "02 §Animation", "src/shared/effects/ house runtime"]
---

# Spec 38 — SGS Motion System: the four-tier motion doctrine (V/G/H/W) + the GSAP (Tier G) effects layer

> **Design-gate status: SIGNED OFF by Bean.** Each build task runs its own plan-mode + Bean
> R-31-13 close.

## 0. Plain English (what this is, why it exists)

SGS animates today with hand-written vanilla JavaScript and CSS — entrances, hovers, parallax,
marquees. That layer is fast and light, but a whole class of premium motion is genuinely beyond
it: sections that pin while a timeline plays as you scroll, headlines that reveal word-by-word,
grids that fluidly re-arrange when filtered, buttery smoothed scrolling, SVG logos that draw or
morph. Competitors reach these with GSAP — the industry-standard animation engine — which is
**100% free for commercial use (including every premium plugin)** since Webflow acquired it in
April 2025.

This spec adopts GSAP **without overthrowing the vanilla-first house rule**. It BOUNDS that rule
into a tier doctrine (§1): everything is vanilla by default (**Tier V**); GSAP (**Tier G**)
is reserved for what vanilla genuinely cannot do, loads only on pages that actually use it, and
follows the same house contracts (reduced-motion, init→cleanup, fail-open no-JS rendering) as
the existing `src/shared/effects/` runtime. A page using zero Tier G effects ships **zero GSAP
bytes** — the framework's performance posture is unchanged for every existing site.

Everything here is placed deliberately: each effect has a **recommended home** (the level and
control surface where it belongs) and a **technically permitted range** (so unusual uses are a
documented choice, not an impossibility) — Bean's containment principle: contained where they
apply, never completely walled off from areas of potential.

## 1. The motion-tier doctrine (constitutional) — V / G / H / W

> **This section is the written home of the SGS motion principle.** The one-line "vanilla JS
> only / no external libraries" statements in root `CLAUDE.md`, `theme/sgs-theme/CLAUDE.md`,
> Spec 01 and Spec 02 point here.

1. **Tier V (default) — vanilla/CSS.** Every effect is assigned to the **cheapest tier that can
   achieve it**. Entrances, stagger, hovers, parallax (CSS scroll-driven first), marquees,
   simple keyframe motion, menu/drawer reveals, single-property scroll fades — all remain
   Tier V, exactly as built today. **Nothing currently shipped migrates to GSAP.** The Spec 36
   nav follow-ons (`P-DRAWER-BURGER-MORPH-SYNC` — store state-wiring; `P-DRAWER-TRIGGER-ANCHOR-JS`
   — geometry) are Bean-ruled NOT motion-system scope and stay the house way, untouched.
2. **Tier G (capability) — GSAP.** Reserved for what Tier V genuinely cannot reach:
   scroll-scrubbed pinned timelines, SplitText, Flip layout transitions, Draggable/physics,
   DrawSVG scrubbing, MorphSVG. **Conditionally loaded** (§4.4): a page using
   zero Tier G effects ships zero GSAP bytes. GSAP + plugins are **npm-bundled, never CDN** —
   the rule the codebase already obeys (a CDN reference is
   banned).
2a. **Tier H (helper/utility) — a single-purpose library that is neither vanilla nor GSAP.**
   Bean-decided. Filing a non-GSAP library under "Tier G" would make that tier mean
   "any library", which is precisely the unbounded state §1 exists to prevent. A separate tier
   states the exception instead of blurring the second one.
 **Admission test — all four must hold, or it is not Tier H:** (i) the capability is real and
   Tier V genuinely cannot reach it; (ii) GSAP either cannot do it, or can only do it by a
   mechanism that damages a shipped SGS system — *the Lenis case: ScrollSmoother transforms a
   wrapper around page content, and a transformed ancestor silently stops `position: sticky`
   pinning, which is the shipped Spec 37 header*; (iii) it is single-purpose, npm-bundled, never
   CDN, and conditionally loaded on the same registry as Tier G, so a site not using it ships
   zero bytes of it; (iv) its admission is recorded as a D-numbered decision naming what it
   replaces. Tier H is a named list, not a category anyone may extend by analogy — **current
   membership: Lenis (site-level smooth scrolling) and nothing else.**
   Tier H carries the identical house contracts as Tier V and G (§1.6): live reduced-motion,
   `init → cleanup`, fail-open no-JS, bfcache teardown, Spec 32 no-inline styling.
2b. **Tier W (rendering substrate) — WebGL.** Bean-approved on all four
   open decisions. **Tier W is NOT "another library" — it is a different RENDERING SUBSTRATE**: the
   GPU instead of the DOM. That is why it cannot be filed under Tier H, and the distinction is not
   cosmetic — **OGL fails Tier H's own admission test at part (iii), which requires SINGLE-PURPOSE.**
   Lenis does one thing; a WebGL wrapper is a general-purpose rendering engine. Filing it under H
   would make "single-purpose" meaningless, which is the exact unbounded state §1 exists to prevent.
 **Admission test — all five must hold, or it is not Tier W:** (i) Tier V genuinely cannot reach it
   — CSS moves and recolours whole elements, it cannot warp the inside of one; (ii) **GSAP cannot
   reach it either** — GSAP animates VALUES, it does not rasterise pixels, so if GSAP can drive it,
   it is Tier G; (iii) the effect is bounded to ONE surface (a hero, a gallery, a configurator), never
   page-wide chrome; (iv) it degrades to something meaningful with no WebGL, no JS, or reduced
   motion; (v) its admission is a D-numbered decision naming the effect it enables.
 **Bean's four decisions, do not re-litigate:**
   - **Byte allowance:** a NAMED **120KB JS allowance for Tier W pages only**. The 50KB/page rule is
     untouched everywhere else. A budget quietly breached is a budget abandoned, so this is explicit.
   - **Library: none — raw WebGL2**, behind an SGS-side `init / setUniform / destroy` interface
     so the renderer is REPLACEABLE. The tier is one program, one fullscreen quad, one draw (~150
     lines); OGL's ~34KB buys a scene graph and a camera, both of which this tier is forbidden
     from growing. Measured: 4,325 bytes gzip for the whole effect vs 34KB for the library alone.
     Reversible in one file (`webgl/renderer.js`; Gate A greps that nothing outside `webgl/`
     imports it) and **flagged for Bean's ratification**. Reopen with OGL if a future effect needs
     multi-pass/framebuffers. OGL is **Unlicense (public domain)** — stronger than MIT — but it is
     quiet upstream (last release 2025-01) and curtains.js's author has already moved to a WebGPU
     successor. Assume any such dependency gets swapped; do not weld effects to a library.
   - **Fallback:** a visitor without WebGL (~2-3%, plus low-power modes) gets **the Tier V version of
     the same block** — never a blank canvas, never a hidden section.
   - **Scope: a CLOSED LIST of effects**, exactly as Tier H is a closed list of libraries. "We have
     WebGL now" is precisely how a byte budget dies.
     **CURRENT MEMBERSHIP — THREE ENTRIES: `surface-treatment` (FR-38-29), `flowing-gradient`
     (FR-38-31) and `generative-background` (`src/shared/effects/fx-generative-background.js`,
     `fxGen*` attributes).**
     The fluid cursor field is NOT a member: (i) a genuine fluid simulation is MULTI-PASS
     (advection → divergence → Jacobi pressure → gradient subtract, over ping-pong framebuffers)
     and the single-pass Tier W interface structurally cannot express it; (ii) `fx-cursor-field.css`
     removes the cursor field entirely on a coarse pointer, so on the majority of SME/charity
     traffic the fluid effect would be nothing at all; (iii) a dissipating dye field keeps moving
     after the pointer stops and so owes an **SC 2.2.2** Pause/Stop/Hide answer that
     `prefers-reduced-motion` does not supply. **The fluid field remains admissible later**, but it
     must first answer the multi-pass interface question — and at that point OGL's pass/FBO
     machinery is exactly what it sells, so the library decision reopens with it (see
     `src/shared/effects/webgl/README.md`).

     ⛔ **A GENERATIVE ENTRY WIDENS THE TIER'S FOUNDING INVARIANT — RECORD THIS PLAINLY, DO NOT
     SOFTEN IT.** Tier W's founding premise (§1.2b Cloning note, and the fallback decision above)
     is that a `null`/failed-init return IS the fallback — the untouched `<img>` is already the
     finished state, so there is no second rendering path to keep in sync. That premise holds ONLY
     because a Tier W effect wraps an existing source image, which `surface-treatment` does.
     **`flowing-gradient` is GENERATIVE — there is no untouched anything for a failed WebGL init
     to fall back to** — so it ships a real, hand-authored CSS fallback
     (`assets/css/fx-wave-gradient.css`) that must be kept in sync with the shader FOREVER. That
     ongoing maintenance burden is the exact cost the `null`-return fallback contract was designed
     to avoid. Tier W is still a CLOSED list of effects; its entries carry two different fallback
     shapes. A further generative entry should re-examine whether "closed list, D-numbered
     admission" is still sufficient containment for a shape that structurally cannot use the cheap
     fallback contract.
 **Three house contracts Tier W carries ON TOP of §1.6** (which binds it identically otherwise):
 **context-loss recovery** (the single most-reported WebGL complaint across every major library's
   issue tracker — iOS Safari discards the GPU context under memory pressure; never leave a dead
   black rectangle), **explicit GPU disposal** (textures and buffers are not garbage-collected like
   DOM nodes; leaks compound across navigations), and **power/thermal awareness** (pause off-screen
   and when the tab is hidden).
 **Cloning: permanently unclonable, stated plainly.** The pipeline reads computed CSS; a shader has
   none — `getComputedStyle()` on a `<canvas>` says nothing about what the GPU drew. It is DECLARED
   via a BEM signal resolved to a block attribute, never inferred, and its fidelity is Bean's eye
   alone with no numeric score behind it (R-31-13's second half without the first).
 **Tier W must never become:** a 3D engine (three.js is 182KB gzip — 3.6× the whole page budget —
   and "since we're doing WebGL anyway" is the single most likely way this goes over), or the default
   for anything merely difficult. The doctrine is a ratchet TOWARD cheap: a Tier W effect whose CSS
   equivalent later becomes viable gets DEMOTED, exactly as Tier G does.
3. **The tier assignment is an engineering judgment recorded in the §2 taxonomy** — every G
   assignment carries a "why the lower tier can't do it" justification, and a G capability whose
   V equivalent later becomes universally supported in CSS is a candidate to DEMOTE to V (the
   doctrine is a ratchet toward cheap, not toward GSAP).
4. **Answers to the three failure modes this doctrine kills:** "GSAP isn't in the stack" is
   false — it is in the stack, bounded to Tier G. "Everything should use GSAP" is also false —
   Tier V is the default and nothing shipped migrates. **"Tier H means we can add libraries
   freely" is false** — Tier H is a closed list with a four-part admission test (§1.2a) and a
   D-numbered decision per member. Any track claiming any of the three is misquoting this
   section.
5. **Naming.** The tiers are deliberately **V/G/H/W**, not 1/2/3 — "Tier 1/Tier 2" already mean the
   `blocks.replaces` reverse-walk in Spec 31 Appendix B, and "tier" alone also means the
   Mobile/Tablet/Desktop device system. In prose always write "Tier V" / "Tier G" / "Tier H" / "Tier W". W is for **WebGL** — a rendering SUBSTRATE, not a library.
   H is for **helper** (Bean's framing): a single-purpose utility admitted for one
   capability, not a general-purpose engine like GSAP.
6. **House contracts bind Tier G identically** (§5 FR-38-2): live-checked reduced motion,
   `init(el) → cleanup()`, one shared frame budget, fail-open no-JS rendering (SSR markup is the
   finished state; JS applies hidden/offset initial states only after it is confirmed running —
   the `sgs-js` gate), bfcache teardown/re-init, Spec 32 no-inline styling.

## 2. Placement taxonomy — the spine of this spec

Axes: **Tier** (V/G + why the lower tier can't) · **Level** (site / template / region /
container / block / element) · **Exposure surface** (theme settings vs inspector panel vs block
variation) · **Conditions + conflicts** · **Default** · **Recommended vs technically permitted
placement**. Nothing from the roster is dropped; §3 carries the per-capability detail.

| Effect | Tier — why not lower | Level | Exposure surface | Conditions + conflicts | Default | Recommended → permitted |
|---|---|---|---|---|---|---|
| Pin + scrub section timeline | **G** — CSS cannot pin; a sticky-based pin substitute is exactly the short-parent trap Spec 37 FR-37-40 rejected; multi-tween sequencing needs a timeline | container/section | Inspector panel on `sgs/container` + section-KIND composites | Excludes Tier V entrance on same block (§4.3); needs ScrollTrigger; editor = static end-state (§9) | off | Section-level containers → any container-equivalent (documented choice) |
| Scroll-scrubbed element timeline (multi-keyframe/staggered) | **G** — cross-browser scrub consistency; **FIREFOX** stable lacks CSS scroll-driven animations entirely (see §3.1) | block/element | Inspector panel (fx ToolsPanel) | §4.3 exclusivity; single-property scrub stays Tier V (parallax/`--sgs-scroll-progress` pattern) | off | Any block → any element with the fx panel exposed |
| Horizontal scroll panel | **G** — needs pinning + vertical→horizontal progress mapping; no CSS mechanism | section | Block variation of `sgs/container` (+ inspector tuning) | Pins (ScrollTrigger); keyboard/a11y scroll fallback mandatory; mobile falls back to native horizontal scroll-snap | off | Top-level section → nested container (permitted, documented) |
| Scroll-scrubbed image sequence | **G** — canvas frame scrubbing; CSS cannot drive canvas | block (dedicated) | New block `sgs/image-sequence` inspector | Asset-pipeline sub-scope (frame export/compression tooling — §3.1); heavy-asset warning in UI; editor = poster frame | n/a (new block) | Hero/feature sections → anywhere the block is inserted |
| SplitText reveal (char/word/line, masked) | **G** — DOM splitting with the 2025 a11y rewrite (aria-preserving); hand-rolled splitting breaks screen readers/kerning | block (text-bearing) | Inspector panel on heading/text/quote (+ hero headline) | a11y baked in (plugin rewrite); §4.3 exclusivity vs entrance; reduced-motion = plain fade or nothing (§10) | off | Headings first → any text-bearing block |
| ScrambleText | **G** — vanilla-plausible but not worth a bespoke maintained implementation for a default-OFF niche toy | block (headings) | Inspector (fx ToolsPanel, behind "+") | Default OFF, shipped for the niche; reduced-motion = suppress (§10) | off | Headings → labels/countdown digits (permitted) |
| Flip on filtered grids | **G** — same-document View Transitions snapshot the whole page (UI freeze on rapid re-filter) and give no per-item stagger/interrupt; Flip does | WooCommerce Product Collection wrapper | Site-level toggle on the SGS → Motion settings surface (`animate_product_filtering`; §3.3) | VT crossfade is the no-GSAP fallback; Flip loads only when the toggle is ON; scope is Product Collection only | off | Product Collection → any future filterable block whose re-filter mutates the DOM |
| Draggable + Inertia | **G** — pointer physics + momentum; CSS scroll-snap remains the Tier V default for carousels | block (curated roster) | Inspector toggle on roster blocks (§3.3 opt-in mechanism) | Roster-gated (`supports.sgs.fx.draggable`); touch-action discipline; keyboard alternative mandatory | off | gallery/testimonial-slider/before-after/hero decorations → any block that declares the support |
| Physics2D / PhysicsProps / CustomBounce / CustomWiggle | **G** — no CSS equivalent for physics easings | N/A (flavour — inherits its host effect's level) | N/A (flavour — appears as easing/motion options inside other G effects' controls, never its own surface) | Never a standalone toggle; bundled into the consuming effect's chunk | n/a | Easing dropdown of G effects only |
| Physics canvas (throwable decorative bodies) | **G** — pointer physics + post-release momentum; no CSS equivalent (FR-38-27) | container (dedicated block) | `sgs/physics-canvas` inspector | **NICHE ARTISTIC CANVAS (Bean) — deliberately NOT built for accessibility, structure, or cloning.** Operator-discretion surface; the ONE named exception to FR-38-14's never-a-standalone-toggle rule; reduced motion disables the physics while children still render static; inherits the composite-mirror rule at render time | off | Hero/section decorative layers → any container-equivalent placement |
| DrawSVG | **G** (scrubbed) — scroll-scrubbed draw needs ScrollTrigger; **load-triggered simple draw stays covered by Tier V `data-sgs-path-draw`** | element (SVG-bearing) | Inspector on `sgs/responsive-logo`, `sgs/icon`, `sgs/separator` — each verified to render inline SVG shape geometry (`sgs/separator` conditionally, via the same `sgs_get_wp_icon()`/`sgs_get_lucide_icon()` helpers `sgs/icon` uses, when `contentMode === 'icon'`). `sgs/decorative-image` is excluded: it renders a raster `<img>`/video only, so no drawable geometry exists. An `<img src="*.svg">` is not drawable or morphable either — the file is an opaque image resource with no DOM access to its paths, which is precisely why `sgs/responsive-logo` inlines via `wp_kses` instead. | Trigger = load OR scroll-scrub (§3.4) | off | Logo/icons/dividers → any SVG-bearing block (`decorative-image` excluded — raster/video only) |
| MorphSVG | **G** — CSS `d:path()` needs identical point counts; point-matching IS the plugin | element | Inspector, ASSET-GATED (§3.4) | Requires prepared matched path pairs + authoring guidance | off | Icons/logos → decorative SVG anywhere (asset-gated) |
| MotionPath | **V default / G when scrubbed** — CSS `offset-path` handles autonomous path-follow cross-browser; the plugin is needed only for scroll-scrubbed path progress | element | Inspector on `sgs/decorative-image` | V variant ships without GSAP; G variant needs ScrollTrigger + MotionPathPlugin | off | decorative-image → other media blocks (permitted) |
| Smooth scrolling (**Lenis**) | **H** — no CSS mechanism for smoothed/lagged scroll, and the Tier G option (ScrollSmoother) can only achieve it by transforming a wrapper around page content, which silently breaks the shipped Spec 37 sticky header (§4.2) | **SITE** | SGS → Motion settings page | Default OFF; disabled in editor + wp-admin; disabled under reduced-motion (live + reactive); touch left native; **no wrapper, no template change** (§4.2) | OFF | Site setting only (never per-block) |
| Page transitions | **V** — cross-document View Transitions API is CSS-first, no GSAP, no router | SITE + per-template | Theme settings + per-template override | Progressive enhancement; unsupported browsers = normal navigation (defined fallback §3.5); reduced-motion = suppress | OFF | Site-wide → per-template variants |
| Surface treatment (grain / halftone / duotone) — FR-38-29 | **W** — CSS moves and recolours a whole element, it cannot rewrite the pixels INSIDE one; GSAP animates VALUES and does not rasterise, so it cannot reach this either (§1.2b tests i + ii). Bounded to the image a block already renders (test iii); degrades to that untouched image (test iv); admitted under Tier W's five-part test (test v) | block (image-bearing) | fx panel — treatment picker (thumbnails) + duotone `DesignTokenPicker` colours; intensity behind "+" | Needs a raster `<img>` in the block's subtree — a block rendering its `<img>` as the block ROOT (e.g. `sgs/decorative-image`) is offered it but no-ops, see FR-38-29; no conflict with any Tier V/G effect (it repaints a texture, it does not own transform/opacity) | off | Image-bearing blocks → any block whose subtree contains a raster image |
| Cursor-reactive field (FR-38-25) + its four looks (FR-38-28) | **V** — the shipped mega-panel spotlight already does pointer-follow in vanilla with an rAF-throttled custom-property write and a live reduced-motion gate; GSAP adds nothing §1.3's ratchet would accept. Measured 982 bytes gzip, no GSAP dependency | block (emitter) + runtime-detected participants | fx panel — field type / colour (`DesignTokenPicker`) / size | `creates_panel = 0` (measured: letting it create panels put a new fx panel on blocks such as `nav-bar-menu`, `site-header`, `form` and `modal` that would also inherit `motion-path` + `scrub`); fine-pointer only; participants carry no control | off | Container-kind + background-image blocks → any block with a paintable background |
| Magnetic pull (FR-38-30) | **V** — the shipped `magnet.js` (`sgs/nav-bar-menu`) already does proximity-based pull in vanilla; the motion-ecosystem survey concluded a magnetic button is "~20-30 lines of vanilla JS — write it, don't dependency it"; GSAP adds nothing §1.3's ratchet would accept | block | fx panel — Pull distance + Reach (shown by default), Direction (behind "+") | `requires='none'` (PERMISSIVE — offered wherever a panel already exists, never creates one); fine-pointer only via `hover`; measured 1054 bytes gzip; distance measured to the element's BOX, not its centre | off | Any fx-panel block (incl. `sgs/button`, `sgs/multi-button`, `sgs/icon`) → any block with the fx panel exposed |
| Flowing gradient (FR-38-31, SECOND Tier W entry) | **W** — a noise-driven generative gradient computed per pixel on the GPU, which CSS cannot generate and GSAP cannot rasterise (§1.2b tests i + ii); GENERATIVE rather than image-wrapping, which widens Tier W's founding fallback premise (see §1.2b) | block (surface) | fx panel-equivalent surface control — 4 client colours (`DesignTokenPicker`) + a mandatory keyboard-reachable Pause control (SC 2.2.2, autonomous motion) | `requires='surface'`; AUTONOMOUS (`triggers='load'`), not cursor-driven — engages SC 2.2.2 so ships a real Pause control, `hidden` until JS confirms it is running; DPR capped at 1.5; IntersectionObserver + `visibilitychange` + context-loss give-up; real CSS fallback required (ships alongside, kept in sync forever — the tier-widening cost) | off | Section/hero surfaces → any block declaring the `surface` capability |
| Particle trail (FR-38-32) | **V** — a canvas 2D pool of short-lived sprites; vanilla reaches it with no library, so §1.3's ratchet refuses anything dearer. ⛔ NOT Tier W: it needs no GPU shader and that list stays closed | block | fx panel — Style (sparks/gravity-dots/ripple) shown by default, Density + Size behind "+" | `requires='none'` (PERMISSIVE — offered wherever a panel already exists, never creates one); fine-pointer only; cap 150/emitter (MEASURED: clamps at exactly 150 under saturation, but ordinary pointer input peaks at 106 — LIFETIME binds first, not the cap), DPR<=1.5; self-terminating loop (MEASURED: 0 frames drawn across 2500ms at rest; positive control confirms the counter rises on movement) | off | Any fx-panel block → any block with the fx panel exposed |
| Progress connector on `sgs/timeline` (FR-38-35) | **V** — a SINGLE-property scrub (one number, 0→1), which FR-38-7 already places in V; multi-keyframe/staggered is the G boundary and the themed variants must be re-tiered against it | block (`sgs/timeline` only) | Block-private inspector — `ToggleControl` in the Connector PanelBody + an `SgsColourPanel` row. **NOT the fx panel** (FR-38-26 precedent: fx injectors stamp the block ROOT, the connector is a descendant), so zero `check-fx-list-drift.py` registrations | Two drivers writing one `@property`-registered custom property; the JS driver MUST feature-detect `animation-timeline` and exit, or both run and the rAF loop burns frames for nothing. Firefox has NO native support, so the JS path is primary | off | `sgs/timeline` → nothing else (the geometry is this block's own connector) |
| *Existing Tier V inventory* (entrance ×16, hover suite, parallax 3-tier, path-draw, scroll-progress, marquee, float utilities) | **V** — shipped, proven, cheap | block/element | Existing inspector panels (unchanged) | §4.3 exclusivity when a G scrub is present on the same block | as today | Unchanged |

## 3. The capability roster (nothing cut; curated defaults)

### 3.1 Scroll core

- **FR-38-6 Pin + scrub section timelines.** A section-level container (or section-KIND
  composite) pins for N × viewport-height while its children's tweens play mapped to scroll
  progress. Controls: pin length, scrub smoothing, per-child timeline position (simple
  from/to presets — full timeline authoring is NOT exposed to clients; curated presets only).
- **FR-38-7 Scroll-scrubbed element timelines.** Opacity/transform keyframes along the
  element's own viewport progress. **Boundary with Tier V:** a SINGLE-property fade/translate
  scrub remains Tier V (the existing CSS scroll-driven parallax pattern + `--sgs-scroll-progress`);
  Tier G owns multi-keyframe, staggered, or sequenced scrubs.

 ⛔ **Browser support — never recalled from memory.** Build any
  scroll-driven fallback from this table, not from a remembered engine name.

  | Engine | `animation-timeline` | Status |
  |---|---|---|
  | Chrome / Edge | 115+ | ✅ since 2023 |
  | **Safari** | **26.0+** | ✅ since **Sept 2025** |
  | **Firefox** | not yet | ❌ not shipped in stable |

  Global support **85.43%**. MDN: *"This feature is not Baseline because it does not work in some
  of the most widely-used browsers."* **The blocker is FIREFOX, not Safari.** The V/G boundary
  itself is unmoved — cross-browser-critical multi-keyframe scrubs are still G — but the reason is
  Firefox, and a JS driver written for this gap is the PRIMARY path for Firefox users, not a
  fallback for a rare browser. (`@property`, by contrast, is safe
  at **94.21%** — Chrome/Edge 85+, Firefox 128+, Safari 16.4+.)
- **FR-38-8 Horizontal scroll panel.** A `sgs/container` **block variation** ("Horizontal scroll
  section"): vertical scroll maps to horizontal travel of a pinned row. Mobile (<768) falls back
  to native horizontal scroll-snap (the Tier V carousel pattern); keyboard users get normal
  sequential focus (no scroll-jacking of focus order).

> **Keyboard focus contract (FR-38-6, FR-38-8) — LIVE-VERIFIED.** §2's "keyboard users get
> normal sequential focus" is measured, and it holds.
>
> Neither pinning effect intercepts `tabindex`, DOM order, or focus events; both rely entirely on
> the browser's native "scroll the newly-focused element into view". When Tab reaches a focusable
> element positioned after an active pin, that native focus-scroll carries the viewport past the
> pinned section — which correctly un-pins as it goes — and settles with the focused element
> visible. **Measurement caveat:** the site sets `scroll-behavior: smooth`, so this settle takes
> several hundred milliseconds. A probe sampling at a fixed short delay reads the element as
> off-viewport mid-flight and reports a spurious WCAG 2.4.11 failure. Poll `scrollY` until it
> stops changing before measuring. This is not scroll-jacking; it is the standard browser
> affordance working as intended.
>
> **Reduced motion:** `pin-scrub` creates no pin at all — no timeline, no `ScrollTrigger` — so
> sequential focus is simply normal document flow. `horizontal-panel` falls back to native
> `overflow-x: auto; scroll-snap-type: x mandatory`, and the panel `<section>` elements are
> themselves valid Tab stops for keyboard-driven scrolling.
>
> **Content restriction:** a control inside a `pin-scrub`/`scrub`/`split-reveal` section is
> focusable while at `opacity:0` (WCAG 2.4.11), because `fromTo` immediate-renders the hidden FROM
> state before any scroll. `fx-pin-scrub.js`/`fx-scrub.js` hold the reveal on `gsap.ticker` while
> focus is inside; `fx-split-reveal.js` uses a one-shot. The horizontal panel is the only one where
> native reachability suffices, and only by accident.
>
> **Fixture.** `probe-step13-pin-focus.mjs` runs against canary page **2893** (`[GATE - DO NOT
> DELETE] Pin keyboard focus FR-38-6`), which carries a link, a text field and buttons inside a
> genuine `data-sgs-fx="pin-scrub"` pin: 4 real focusables inside a pin report `engaged=True`, the
> Tab walk covers all of them, and ZERO focus issues are raised — no out-of-viewport focus, no
> invisible-while-focused control. The `reduce` arm reports the pin as never engaging at all, which
> is the §10 SIMPLIFY contract observed rather than reasoned.
>
> ⛔ **Do NOT restore an older fixture.** Pages 2023 and 2114 (trashed) carry PRE-migration
> authoring: `minHeight` is a TIER OBJECT, so their flat string coerces to `{}` and every spacer
> collapses — giving a page that still LOOKS like a fixture while the pin never pins. **The markup
> is COMMITTED** at `plugins/sgs-blocks/scripts/motion-qa/fixtures/pin-keyboard-focus-fr-38-6.html`;
> re-create from that file, so the source never lives only on the server.

- **FR-38-35 Scroll-driven progress connector on `sgs/timeline` — Tier V, BLOCK-PRIVATE.**
  The timeline's connecting line fills progressively 0→1 as the block
  scrolls through the viewport, so a journey visibly builds as the reader descends. Requested by
  MIC for their journey page; this FR is the contract only, and four themed variants
  (pulse / vine / tree / falling bricks) are NOT BUILT.

 **Tier V, and the boundary is the one FR-38-7 above already draws:** this is a SINGLE-property
  scrub (`--sgs-timeline-fill-progress`, one number), not a multi-keyframe or staggered timeline.
  ⚠ The themed variants' staggered bricks and multi-keyframe vine/tree read as **Tier G** under
  that same boundary — settle their tier before building; Tier V does not carry over by
  inheritance.

 **BLOCK-PRIVATE, not an fx-panel effect — the FR-38-26 precedent, for the identical reason.**
  Both `fx.js`'s save filter and `fx-attributes.php`'s injector only ever stamp the block ROOT,
  and the connector is a DESCENDANT (an SVG child). That
  is exactly why `loopCarousel` went per-block with `fx_effects.creates_panel = 0`. Consequence:
  **zero `check-fx-list-drift.py` registrations are owed** — this effect joins none of the four
  hand-maintained fx lists, because it is not an fx effect. It also answers §3.3's standing note
  that *"`sgs/timeline` is a genuine horizontal scroller with no fx declaration — an unclaimed
  candidate needing a new control surface"*: this is that surface.

 **The contract — ONE number, TWO drivers, and the drivers must exclude each other.**
  `--sgs-timeline-fill-progress` is `@property`-registered (`syntax: '<number>'`, `inherits: true`,
  `initial-value: 0`) and consumed once, as
  `stroke-dashoffset: calc(1 - var(--sgs-timeline-fill-progress))` on an `aria-hidden` SVG `<path>`
  carrying `pathLength="1"` (which normalises any geometry to unit length, so the dash maths is an
  authored constant and no one reaches for the JS-only `getTotalLength()`).

  - **Native driver** — `@supports (animation-timeline: scroll())` binds a `@keyframes` to the
    scroll timeline. Serves Chrome/Edge 115+ and Safari 26+.
  - **JS driver** — an rAF loop in the block's `view.js` writing the same property. **This is the
    PRIMARY path for every Firefox user, not a fallback** (see the support table above).
  - ⛔ **The JS driver MUST feature-detect and return before attaching anything**
    (`CSS.supports('animation-timeline','scroll()')`). A CSS animation outranks a JS inline write
    in the cascade, so without this gate the loop runs on ~85% of traffic producing nothing
    visible — correct output masking wasted work, the hardest defect class to notice.

 ⛔ **THREE SILENT-FAILURE MODES, each of which renders plausible-looking output while being
  wrong. All three are load-bearing; none is polish.**
  1. **An unregistered custom property cannot be animated.** Its computed type is "token stream",
     which has no midpoint, so CSS legally swaps it discretely at 50%. The fill would not be
     progressive, the property would still resolve, and every gate would pass. `@property` is what
     makes it a real number. (Same reasoning as `assets/css/fx-motion-path.css`.)
  2. **`stroke-dasharray` MUST be set.** It defaults to `none`, and `stroke-dashoffset` has NO
     effect on a line with no dash pattern — the connector renders permanently 100% filled while
     the property animates perfectly. With `pathLength="1"`, `stroke-dasharray: 1` makes one dash
     span the path: offset 1 = empty, offset 0 = full.
  3. **The old `::before` must be suppressed on the CLASS, never on `@supports`.** An
     `@supports`-keyed hide leaves a DOUBLED line for every visitor on the JS driver — all
     of Firefox.

 **Client controls (block-private, beside the existing connector controls):**
  `connectorProgressFill` (boolean, default off) as a `ToggleControl` in the Connector `PanelBody`;
  `connectorFillColour` (string, default `accent`) as an `SgsColourPanel` row with `linked: true`,
  so it stores a palette SLUG and re-themes with the site rather than freezing a hex.
  Seeded to `block_attributes`: `connectorFillColour` carries `css_property = stroke` on the
  EXISTING `connector` element — a different property from `connectorColour`'s `background-color`
  claim, so there is no routing-determinism collision and no new element was needed.

 **Accessibility.** The SVG is `aria-hidden="true" focusable="false"` — decorative, adding no
  content. **SC 2.2.2 does NOT engage:** the motion is scroll-linked and user-driven with no
  autonomous component, so no Pause control is owed — unlike FR-38-31, which genuinely owed one.

- **FR-38-9 Scroll-scrubbed image sequence — dedicated block `sgs/image-sequence`.**
  Canvas-drawn frame sequence scrubbed by scroll. **Explicit sub-scope with its own tooling
  task:** the asset pipeline (frame export from video, compression, resolution ladder, lazy
  chunked fetch) is a named work item — the block is NOT done when the canvas draws; it is done
  when a client can produce usable frames with the documented tooling. Editor shows the poster
  frame only. The block exists (`src/blocks/image-sequence/`, agency-only, hidden
  from the inserter), matching `generate-fx-qualifying-blocks.py`'s `EXACT_MATCH_BLOCKS` roster
  `{"sgs/image-sequence"}`. **Tooling:** `scripts/image-sequence-prep.py` +
  `scripts/IMAGE-SEQUENCE-PREP-README.md` document the frame-export/compression pipeline.

### 3.2 Text

- **FR-38-10 SplitText reveals.** Char/word/line reveals incl. masked lines, on text-bearing
  blocks (`sgs/heading`, `sgs/text`, `sgs/quote`, hero headline). The 2025 SplitText rewrite's
  accessibility mode (screen-reader-preserving `aria-label` on the split parent) is REQUIRED —
  a split that breaks the accessibility tree is a defect, not a setting.
- **FR-38-11 ScrambleText.** Headings only by default, default OFF, shipped for the niche
  use-case (tech/creative clients). Reduced motion: suppressed entirely (text renders plain).

### 3.3 Layout + interaction

- **FR-38-12 Flip on filtered grids.** **BUILT + LIVE-VERIFIED** against WooCommerce's
  **Product Collection** block. A `MutationObserver` on the block's public wrapper
  (`.wp-block-woocommerce-product-collection`) — NOT WC's Interactivity API router, whose internal
  markup WC documents as private/unstable — captures Flip state and animates on mutation; opt-in
  via a site-level toggle (same surface as FR-38-18/19; `animate_product_filtering`), injected by
  a `render_block_woocommerce/product-collection` PHP filter following the codebase's existing
  injector pattern. Scope is Product Collection only, no core Query Loop. No-GSAP/reduced-motion
  fallback: instant re-layout; a same-document View Transitions crossfade MAY be offered as a
  Tier V "lite" option where supported. Design:
  `.claude/plans/archive/2026-08-20-flip-woocommerce-product-collection-design-gate.md`.

  ⚠ **The `sgs/filter-search` ↔ `sgs/card-grid` pairing is NOT buildable — do not build it.**
  `sgs/filter-search`'s `view.js` only toggles the `hidden` attribute on filter chip options — it
  never touches a product/card and emits no event. `sgs/card-grid` has no `view.js` at all
  (filtering is server-side PHP), so there is no client-side re-layout for `Flip.from()` to
  animate. Real client-side re-filtering belongs with WooCommerce's own Product Filter/Collection
  blocks.

  ⚠ **Gotcha:** `fx-flip.js`'s `settle()` must call `context.add( conditions, func )` on a
  `MatchMedia` instance — a bare-function `context.add( fn )` silently registers `Flip.from()`
  against a never-matching query, so it is never invoked while every upstream check looks healthy.
  Also, `sgs/container` as the shop archive's Product Collection toolbar wrapper must not trip
  WooCommerce's client-nav kill-switch.
- **FR-38-13 Draggable + Inertia — curated roster + opt-in mechanism.** Roster:
  `sgs/gallery` (drag-to-scroll carousel upgrade), `sgs/testimonial-slider` (same),
 **`sgs/before-after`** (**BUILT**: `block.json`/`edit.js`/`save.js`/`render.php`/`view.js`), `sgs/hero` decorative
  layers (draggable ornaments, desktop fine-pointer only). **Opt-in mechanism:** a block joins
  the roster by declaring `supports.sgs.fx.draggable` in its block.json — `/sgs-update` seeds it
  to `block_capabilities` (§6); the runtime + registry read the DB, never a hardcoded roster
  (R-31-1). CSS scroll-snap remains the default; Draggable is the upgrade. Touch: native scroll
  is never hijacked (`touch-action` discipline); keyboard: arrow-key equivalents mandatory.
- **FR-38-26 Looping carousels — an INDEPENDENT control, Tier V.**
  Bean's ask: *"for the dragging physics feel the option to make the carousels looping is
  important so it doesn't get abruptly stopped by the end of the list and just loops round."*
  A native horizontal scroller with looping ON clones leading/trailing items and re-seats
  `scrollLeft` at the boundary within one frame, so the track never dead-stops at the last card.

 **NOT a drag setting, and this is the load-bearing part of the requirement.** Bean's ruling:
  *"looping should not be tied to the drag effect — they should be independent controls"*, and
  *"we're not setting the default behaviour in all carousels, just making the functionality
  available to those who want it."* So looping has its **own grammar** (`data-sgs-loop="1"`),
  never a `data-sgs-fx` value, and an element may carry BOTH `data-sgs-fx="draggable"` and
  `data-sgs-loop="1"` at once — a single-valued `fx` slot could not express that pair.
 **Default OFF, opt-in per instance.**

 **Why a separate module rather than an addition to `fx-draggable.js`.** That file's own docblock
  records a prior decision rejecting exactly it — *"re-deriving such a block's own wrap-around
  maths inside a block-agnostic module is exactly the per-block hyperfocus R-31-9 forbids"* —
  alongside a contract that it never creates a wrapper, never transforms, and never reorders DOM,
  all three of which looping a native scroller requires. `src/shared/effects/fx-carousel-loop.js`
  owns the DOM work as its explicit job; **`fx-draggable.js` is not modified at all**, so that
  contract is honoured rather than overturned.

 **Eligibility** is the same STRUCTURAL question the drag module already answers — a genuine
  native horizontal scroller (`isNativeHorizontalScroller`, extracted to `motion-utils.js` as a
  deliberate documented duplicate, because sharing it would have required adding an `export` to
  the frozen file, itself a modification). Never a block name (R-31-9).

 **Accessibility is part of the requirement, not a follow-up.** A loop has no last item, so
  "next" never disables and the dot count has no natural end. Clones are `inert` + `aria-hidden`
  with focusables neutralised and are excluded from the block's item selection, so **the dot count
  keys to the REAL card count** and the active dot tracks modulo position. Verified live: 6 real
  cards, 18 with clones, **6 dots**.

 **Control home is PER-BLOCK, not the shared fx panel** — the same constraint that already forced
  `draggable` block-private: the scroller is a DESCENDANT, and both `fx.js`'s save filter (static
  blocks only) and `fx-attributes.php`'s injector only ever stamp the block ROOT.
  `fx_effects.creates_panel = 0` records that decision rather than driving it.

 **ROLLOUT.** Five blocks carry `loopCarousel`, each proven live
  by `scripts/motion-qa/probe-carousel-loop.mjs` against its own fixture with drag AND loop both on:
  `sgs/gallery` (exemplar, 9/9), `sgs/post-grid` (9/9), `sgs/trustpilot-reviews` (9/9),
  `sgs/google-reviews` (9/9), `sgs/buybox` (8/8 + 1 not-exercised). Per-block evidence in
  `reports/visual-diff/<block>-2026-08-02.md`. The load-bearing dots assertion was genuinely
  exercised on four of the five — 9 real cards / 27 with clones / **9 dots** on post-grid, and the
  same shape on the rest.

 **Roster predicate: "owns a native horizontal scroller"** — what `isNativeHorizontalScroller()`
  gates on at runtime. Measured: `buybox`, `gallery`, `google-reviews`, `post-grid`,
  `trustpilot-reviews`.

  Deliberately EXCLUDED, so neither is re-proposed cold:
  - `sgs/before-after` — `fx.draggable` drives a divider handle, not a scroller; no `overflow-x`,
    looping would no-op.
  - `sgs/testimonial-slider` — track is `overflow:hidden` + transform-driven, not a native
    scroller; adding looping means converting the track and moving arrows/dots/autoplay onto
    scrollLeft` — a behavioural change, not a rollout step. Bean ruled it out of scope.

  `sgs/timeline` is a genuine horizontal scroller with no fx declaration — an unclaimed candidate
  needing a new control surface, not a rollout.

 **`sgs/buybox` is the non-mechanical case** (thumbnail strip + the product-card Interactivity
  store) and drives a UNIVERSAL `neutraliseClone()` in `fx-carousel-loop.js`: clones have
  `data-wp-*` directives plus `data-index`/`aria-current` stripped, on the clone root and every
  descendant. `inert` + `aria-hidden` stop a human reaching a clone; they do NOT stop a framework
  hydrating it. Proven live: **0 live attributes across 20 clone subtrees**, with a negative control
  confirming the assertion fails when one is re-planted.
- **Reduced motion for the loop** is identical under reduce — the correction is an
  instantaneous `scrollLeft` write, never a tween, so there is nothing for
  `prefers-reduced-motion` to gate in this module. Full detail: §10's `Carousel loop (FR-38-26)`
  row.
- **Keyboard arrow-wrap** is verified live on the arrow-bearing carousel-loop blocks
  (`probe-carousel-loop.mjs` Arm 2). `nextSlide()` and `prevSlide()` must treat "no real item
  that way" as the WRAP POINT instead of clamping to a card already on screen or dead-ending in
  clone territory (the arrow would never disable, but the user could not actually progress — a
  WCAG 2.5.7 defect). Both directions must be read as a pair. Verified on the live canary with
  the committed probe: **google-reviews 17/17, trustpilot-reviews 17/17, post-grid 17/17**, the
  decisive assertion being "keyboard-driven wrap lands back at the SAME index within 5
  activations — start index=0 → back to 0 after 3 presses". ⚠ A block can pass the looping
  rollout's "dots == real cards" check while its keyboard path is broken. A dot that moves is not
  a dot that WORKS. **Satisfying a rule's wording while defeating its purpose is the failure
  shape worth remembering.**

- **FR-38-14 Physics easings as flavours.** Physics2D / PhysicsProps / CustomBounce /
  CustomWiggle appear ONLY as easing/motion-flavour options inside other G effects' controls
  (e.g. a "spring (physics)" easing choice on a scrub or draggable release). Never standalone
  toggles; each bundles into the chunk of the effect that offers it.
- **FR-38-25 Cursor-reactive FIELD — Tier V, EMITTER + PARTICIPANT, PLUGGABLE FIELD TYPES.**
  Bean's ruling on the field-type system: *"we're building this to be able to compete with and replicate
  those comp websites and clone incredible designs from Claude Design where usually the effect isn't
  limited to a glow/colour, it could be a pattern, move floating objects etc."*

  A block's background carries a field that follows the pointer. **Tier V, not G:** the shipped
  mega-panel implementation (`src/shared/effects/spotlight.js`, consumed by `sgs/mega-panel`) already
  does this in vanilla with an rAF-throttled custom-property write and a live reduced-motion gate —
  GSAP adds nothing the doctrine's §1.3 ratchet would accept. **Measured at build: 982 bytes gzip,
  no GSAP dependency**, so a page using this effect and no Tier G effect ships zero GSAP bytes.

 **THE PAINTER IS SWAPPABLE; THE MECHANISM IS NOT.** Everything below about coordinates and
  `background-attachment` is load-bearing. The thing painted at the published position is
  selected rather than hard-coded. A field type sets ONE
  custom property on the emitter — `--sgs-cursor-field-layer` (the image), optionally
  `--sgs-cursor-field-mask` — and every downstream rule (the emitter's `::before`, every
  participant) reads those two and **never names a type**. A new type is therefore a CSS rule plus a
  descriptor: no new selector, no new JS, no new wiring.

  | Type | Paints via | Status |
  |---|---|---|
  | `glow` | `radial-gradient` — a soft pool of light at the pointer | SHIPPED (FR-38-25; the default, so instances saved before types existed are unchanged) |
  | `spotlight-mask` | the same gradient as a `mask-image`, revealing a pattern beneath rather than adding light | SHIPPED — deliberately paints by a DIFFERENT CSS property, so the extensibility seam is demonstrated rather than asserted |
  | `hue-shift` (Aurora) | a multi-hue band travelling at HALF pointer speed beneath a pointer-centred mask, so the hue arriving at a given point changes as the pointer moves | **SHIPPED (FR-38-28 look 2).** Hues are ROTATED in OKLCH (`oklch(from … calc(h ± spread))`), not mixed, because mixing cyan into yellow produces muddy green at any ratio. See FR-38-28. |
  | `parallax-pattern` | a repeating dot pattern travelling at 8% of pointer distance, deliberately UNMASKED | **SHIPPED (FR-38-28 look 3).** The difference from `spotlight-mask` is load-bearing: there a static pattern sits under a moving hole and only the REVEAL moves; here the pattern itself moves. Masking it would collapse it back into a slightly different torch |
  | `brick-reveal` | a running-bond brick tile as an SVG **mask**, intersected with the pointer pool; the colour is painted underneath as a flat layer | **SHIPPED.** Torch's sibling — same reveal, brickwork instead of a dot screen. An SVG tile owns the brick offset because a 90deg gradient has no vertical variation and gradients produce a stacked GRID. The SVG carries NO colour deliberately — a data-URI cannot read a custom property, so colouring it would freeze the palette token |

 **Eligibility is DERIVED FROM CAPABILITY, never hand-listed** (R-31-1/R-31-9). Two roles:
  - **EMITTER** — publishes the pointer coordinates and paints the base field. Eligible: any
    block with `supports.sgs.containerKind` set, or declaring a background-image attribute.
  - **PARTICIPANT** — paints its own share of the SAME field so the glow reads as continuous
    across an opaque child. Eligible: any block with a background-colour capability.

 **Why two roles rather than one.** Bean's ruling, verbatim: *"it'd look a bit janky for the
  effect to either be covered behind a button or just completely turn off when I hover on a
  button so it should be able to go over any surface seamlessly."* Tracking does not stop when the
  pointer enters a child — `mousemove` bubbles from descendants, and `mouseleave`
  does not fire on entering a child (the logic lives in `cursor-field.js`; `spotlight.js` is a
  thin wrapper). **The occlusion does occur**: the field paints on a `::before` while every direct
  child is forced to `z-index: 1` (`mega-panel/style.css`, the direct-child z-index rule), so an
  opaque child occludes its slice. A participant role fixes the occlusion without a blend layer
  over the client's own colours.

 **Mechanism — viewport-space coordinates + `background-attachment: fixed`.** The emitter
  publishes the pointer position in VIEWPORT pixels; custom properties inherit, so every
  descendant reads the same pair with no ancestry wiring. Each participant paints the identical
  gradient with `background-attachment: fixed`, which resolves a background against the viewport
  rather than the element — so the field aligns across separately-painted boxes with **zero
  per-element geometry maths**. This is why the emitter must publish viewport-space values and
  NOT the element-relative percentages the mega-panel uses: `initSpotlight` therefore gains an
  optional coordinate-space option rather than a second module (its export contract stays
  backwards-compatible for the existing consumer).

 **Gated to fine pointers** — `@media (hover: hover) and (pointer: fine)`. A cursor effect has
  no meaning on touch, and this also sidesteps `background-attachment: fixed` being ignored on
  iOS Safari.

 **⚠ TWO RISKS TO MEASURE, NOT REASON ABOUT:**
  1. **Paint cost.** A `radial-gradient` background repaints every frame the pointer moves, and
     N participants means N repaints. The house rule ("transition only `transform`/`opacity`")
     does not name `background-image`, but the cost class is the same. Measure frame cost on a
     canary with a realistic participant count. ⚠ **Not a closure:** the
     mechanism as shipped has no JS painter seam at all — a participant paints via a
     `[data-sgs-cursor-field="X"]` CSS rule reading an inherited custom property, not a
     JS-driven per-frame `radial-gradient` redraw. That is architecturally different from the
     risk this paragraph describes, which may be why it reads as moot — but no explicit frame-cost
     measurement confirms that, so this is a plausible explanation, not a closed item.
  2. **Legibility.** A moving field under text changes contrast continuously. Measure at the
     field's BRIGHTEST position, never at rest — an effect recomputes every contrast above it.
     Bean's own standing finding applies: a mid-luminance brand accent fails as an indicator
     against both grounds.

 **Unlike the mega-panel's version this is NOT always-on** — that one has no control at all
  (`mega-panel/view.js` applies `data-spotlight` unconditionally). This ships with an inspector
  control, per the framework rule that a capability without an editor control is not done.
  Three controls on the EMITTER: field style, field colour (`DesignTokenPicker`, storing a palette
  SLUG so re-theming re-colours the field), field size. **Participants carry NO control** — an
  opaque child paints its own share automatically, and a per-child opt-out would add a setting to
  ~51 blocks that almost nobody would open.

 **`fx_effects.creates_panel` — a THIRD class of effect.** The
  qualifying-blocks generator has `requires='none'` (permissive — offered wherever
  a panel already exists, never creates one, which is what stops every block acquiring a panel
  from `scrub` alone) and `requires=<specific>` (creates the panel on any block providing that
  token). `cursor-field` fits neither: it is genuinely inert on a block with no paintable
  background, so it cannot be `none`.

 **This was MEASURED, and the measurement is why the column exists.**
  Letting `cursor-field` create panels puts a brand-new fx panel on blocks such as
  `nav-bar-menu`, `site-header`, `site-header-row`, `site-footer`, `site-footer-row`, `form`,
  `modal`, `nav-drawer`, `mega-panel`, `feature-grid`, `testimonial-slider` — and because
  `offered = specific + permissive`, every one of those would ALSO silently inherit
  `motion-path` and `scrub`. That is the "panels where none makes sense" containment failure.
  With `creates_panel=0`, `cursor-field` is offered only on the blocks with a paintable
  background. The column defaults to 1, so effects that do not set it are behaviourally
  unchanged.

  The emitter's `requires` token is **`surface`**, derived in
  `scripts/generate-fx-qualifying-blocks.py` as `containerKind` being set (ANY value — layout and
  content containers paint backgrounds too) OR a `backgroundImage*` attribute being declared.
  Deliberately NOT the existing `section` token, which is `containerKind == 'section'` only and
  would miss `sgs/info-box`, `sgs/testimonial` and friends. The PARTICIPANT half needs no token:
  participants are detected at RUNTIME from computed background — the fact that actually decides
  occlusion — never from a declared capability.

 **KNOWN RESIDUALS.** Item 2 is a genuine open design note; item 1 is gated and item 3 is handled.

  1. **THE MULTI-LIST DRIFT** — GATED by `check-fx-list-drift.py` (wired into
     `prebuild`). An fx effect must join THREE hand-maintained lists (`SHIPPED_EFFECTS`,
     `FX_ATTR_MAP`, `sgs_fx_effect_param_scope()`), plus a fourth triad governing field types; the
     gate cross-checks all of them, `--self-test`-proven by deleting
     `cursor-field` from each list in turn and confirming the build fails.

     ⛔ **The invariant count is DERIVED — never spell it out in this doc.** Read
     `_INVARIANTS`'s length at the time of asking. Every invariant the gate runs must be wired
     into `_INVARIANTS`, because `--check` iterates that list to build its own summary line: an
     invariant that runs but is absent from the list can fail silently outside anything the
     summary counts, and **a gate that reports a wrong total confidently is worse than no gate**.
     Hand-maintained lists diverging silently is a failure this codebase has met before
     (`TRANSITION_STYLES`, `class-sgs-motion-registry.php`), which is why the gate reads no
     database and cross-checks committed source only.
  2. **A participant carrying its own `background-image` is deliberately not marked**, because our
     layer would replace it; that child keeps a visible seam. Clobbering a client's chosen image is
     plainly worse. A `::before` fallback for that narrow case is possible if the seam is reported.
  3. **Late-added participants are handled.** `cursor-field.js` runs a
     bounded `MutationObserver` on the emitter (`childList` + `subtree` +
     `attributeFilter: ['style', 'class']`) that re-runs the SAME `isParticipant()` test against
     added nodes and mutated existing nodes, debounced to one pass per animation frame regardless
     of mutation-burst size, so a large subtree churn cannot fire a computed-style read once per
     mutation record. Bounded to the emitter's own subtree only — created and disconnected inside
     the same `init`/`cleanup` pair as everything else in this module, no page-wide observer.

- **FR-38-28 The four signed LOOKS of the cursor field — COMPLETE.** Bean-signed at a
  design gate. The capability ships under FR-38-25's field-type system.

 **What Bean signed:** Route B (a first-class background mode in `SGS_Container_Wrapper`,
  inherited by every wrapper-bearing composite), **four client-selectable looks**, with effect
  type, colours and intensity all client-configurable.

 ⭐ **Bean OVERRULED the contrast risk, and that changes what the build optimises for.** The gate
  recommended the narrower Route A specifically to contain contrast exposure. His ruling, verbatim:
  *"The contrast thing is a complete non-issue… the effect doesn't need to have enough contrast
  with text because the default is that the effect isn't on it and if it's hard to read, just move
  the mouse. Also, people should be able to change the effect and its colours so they can decide on
  what fits."* The argument holds on its own terms — the effect is DECORATIVE and TRANSIENT, the
  resting state is the unaffected background, and the pointer is under the visitor's control.
  **So contrast is a CONTROL, not a gate** — the operator must be able to change type, colour and
  size, which is a build requirement rather than a nicety. All three controls ship.

 **The shared-wrapper background mode (Route B) is not the shape.** The capability is an
  fx-panel effect with `fx_effects.creates_panel = 0`, not a background mode in the shared
  wrapper. Letting it create panels was measured and rejected: it puts a brand-new fx panel on
  blocks such as `nav-bar-menu`, `site-header`, `form`, `modal`, each of which would then ALSO
  silently inherit `motion-path` and `scrub` — the "panels where none makes sense" containment
  failure `creates_panel` exists to prevent. **The reach Route B promised is delivered (emitter
  blocks incl. `sgs/container`, plus runtime-detected participants); the containment Route A
  worried about is delivered too.** Do not re-propose the wrapper route without meeting that
  measurement.

 **The four looks:**

  | Signed as | Field type | Mechanism |
  |---|---|---|
  | Soft radial glow | `glow` | pointer-centred `radial-gradient` |
  | Spotlight revealing a second background | `spotlight-mask` | static pattern under a pointer-centred `mask-image` |
  | Gradient that shifts hue with pointer position | `hue-shift` (Aurora) | multi-hue band travelling at HALF pointer speed beneath a pointer-centred mask; hues ROTATED in OKLCH (`oklch(from … calc(h ± spread))`), not mixed |
  | Subtle pattern that parallaxes | `parallax-pattern` | repeating dots travelling at 8% of pointer distance, deliberately UNMASKED |

 **Why the last two need a shared property.** `glow` and `spotlight-mask` move the
  pointer-centred STOP inside a gradient, leaving the layer stationary — so the colour arriving at
  any given point never changes. A hue that genuinely shifts WITH position, and a pattern that
  genuinely parallaxes, both require the LAYER to travel. `--sgs-cursor-field-position` (optional,
  default `0% 0%`) sits on the two type-agnostic paint rules alongside
  `--sgs-cursor-field-pattern-size`, so **the two original types render identically with or
  without it** and neither paint rule names a type. Both values are a length multiplied by a
  plain number — no unit division, so support is universal.

 ⛔ **`hue-shift` (Aurora) ROTATES hues in OKLCH; it does not mix.** Mixing cyan into yellow is
  muddy green at any mix ratio, which is the mechanism behind Bean's observation that *"the teal
  was very faint"* — a mix-based approach cannot produce a visibly saturated second hue next to a
  saturated first one; it only ever produces intermediate, desaturated tones. `oklch(from <base>
  calc(h ± spread) c l)` rotates the HUE ANGLE of the client's own colour rather than blending
  two colours together, so both derived hues stay as saturated as the source. A client-facing
  **"Colour blend" control** gives the operator the spread rather than a hardcoded ratio, and
  re-theming still re-colours the field.

 ⚠ **TRAP:** in CSS relative colour syntax, `h` inside an `oklch(from …)` expression resolves to
  a PLAIN NUMBER, not a `<angle>`. `calc(h + 90deg)` mixes a number with an angle unit and is a
  **type error** — an INVALID `calc()`, not a clamped or rounded value. One invalid custom
  property computes the whole `background-image` to `none`, and the section renders completely
  EMPTY rather than failing loudly. Use `calc(h + 90)` (no unit) or an explicit
  `calc(h * 1deg + 90deg)` cast. The derived hues DEFAULT to the base
  colour, so a browser without relative colour syntax paints a valid single-hue gradient that
  still shifts position — degraded, never broken, and never an invalid custom property (which
  would take the whole layer down with it).

 **`parallax-pattern` is deliberately UNMASKED**, and that is the whole difference from
  `spotlight-mask`: there a static pattern sits under a moving hole and only the REVEAL moves; here
  the pattern itself moves. Masking it would collapse it into a slightly different torch.

 **Reduced motion + coarse pointer are inherited, not re-implemented.** Both new types use the same
  `::before`/participant selectors and the same `@media not all and (hover: hover) and (pointer:
  fine)` gate, and under `reduce` the emitter publishes a resting position so a static field paints
  (§10: SIMPLIFY, never suppress). No new code path, so nothing new can drift.

 **Registration is gated.** A field type must join THREE lists — the CSS paint rule,
  `SGS_FX_CURSOR_FIELD_TYPES` (`includes/fx-cursor-field.php`) and `FX_FIELD_TYPE_OPTIONS`
  (`src/blocks/extensions/fx.js`). `check-fx-list-drift.py` invariant I6 fails the build if they
  disagree. ⚠ **I6's own negative control is anchored on the literal allowlist line, so adding a
  type BREAKS the self-test until that anchor is updated** — `--self-test` catches it (`--check`
  alone reports green). Update the anchor in `_CASES` in the same commit, or I6 reads green
  forever.

 ⚠ **One honest limit:** touch degradation is a CODE READING, not a
  measurement. The coarse-pointer gate is belt-and-braces (CSS + JS) but has not been observed on a
  real device.

 ⛔ **MASKED TYPES ARE EMITTER-ONLY.** A `mask-image` resolves against the
  ELEMENT's box while `background-attachment: fixed` resolves the layer against the VIEWPORT, so the
  same published coordinates mean two different screen points. The emitter therefore publishes
  `--sgs-cursor-local-x/y` (element-relative) alongside the viewport pair and masked types read it.
  Participants do NOT paint a masked type: each would resolve the mask against its own box and cut the
  reveal elsewhere (measured 155px apart). `glow` and `parallax-pattern` are unmasked and keep full
  participant coverage. ⚠ **`mask-attachment` exists in CSS Masking L1 but no engine implements it —
  there is no CSS-only fix. Do not re-propose one.**

 **Masked types use `--sgs-cursor-field-attachment: scroll`, not `fixed`.** Once masked types
  resolve against the element's own box via `--sgs-cursor-local-x/y` rather than the viewport pair,
  `background-attachment: fixed` buys them nothing — there is no cross-box alignment left to
  protect, because emitter-only masked types never span multiple boxes. `scroll` is the correct
  attachment for a single-box-relative layer.

 ⛔ **`--sgs-cursor-field-pattern-size` MUST set BOTH axes (`22px 22px`), never a single value.**
  A single value (e.g. `22px`) leaves the background `background-size` height as `auto`, and
  `auto` under `background-attachment: fixed` resolves against the VIEWPORT rather than the
  element — the same viewport-vs-element mismatch as position, arriving via a different CSS
  property. Both dimensions must be stated explicitly on every field type that sets this
  property, or the mismatch reappears through the back door.

 ⚠ **Scope of the "no new JS" statement above.** Adding a field type is
  a CSS rule plus two list registrations ONLY while it paints by a background property. A type that
  masks needs the local coordinate pair, which is JS — already published, so no FURTHER JS is
  needed for another masked type.

  **THREE FURTHER CONTROLS/TYPES.** Each changes the shared mechanism, not just one look:

  - **`brick-reveal`** — the fifth field type (see the table above).
  - **TRAIL (`fxFieldTrail`, 0-100) — CLIENT-FACING LABEL "Drag weight"; the stored attribute
    NAME diverges from the label, deliberately.** It is the standard lerp follower: each frame the
    published position moves a fraction of the remaining distance toward the pointer, with NO
    fading tail — so "Trail" was the wrong word for what it does, and the control reads
    **"Drag weight"** in the panel. The stored attribute stays `fxFieldTrail`: blocks already
    author it with real values, and WP deletes an undeclared attribute the next time an editor
    saves that block, so renaming the stored attr would silently zero live instances on their
    next save. The control is the INVERSE of the maths (higher = more lag);
    0 maps to a factor of 1.0 and publishes directly, so it is byte-identical to the behaviour
    before trail existed. Measured live: trail 90 walks 60-241-394-524-633-726-804-871, a factor
    of 0.155 — inside the 0.1-0.2 band that recurs across implementations of this pattern.
    Reduced motion needs no branch: `init` returns before any listener is attached, so the loop
    can never start. **Note the REAL fading trail a "Trail" control implies is not this
    effect at all** — it is the particle engine's `sparks` preset (FR-38-32; see `particles.js`
    `PRESETS.sparks`); do not conflate the two when a client asks for "a trail".
  - **SHAPE (`fxFieldShape`)** — circle / wide ellipse / tall ellipse, via a single
    `--sgs-cursor-field-geometry` property. Empty is the circle default.

 **Editor surface.** All five looks are present in the picker (`glow`,
  `spotlight-mask`, `hue-shift`, `parallax-pattern`, `brick-reveal`); every control is reachable
  (field type, colour, size, Pull/Drag-weight, Shape — nothing hidden behind a broken toggle);
  36 blocks, 0 attribute-validation invalidations; 0 console errors. §9's cursor-field row
  records the canvas behaviour: the canvas shows nothing, because `sgs/container` renders via
  `edit.js` not `render.php`.

- **FR-38-27 Physics canvas — a container-equivalent block whose children are throwable
  DECORATIVE bodies. Tier G.** BUILT.

  ⛔ **SCOPE RULING — Bean, do not re-litigate.** This block is a **NICHE ARTISTIC
  CANVAS**. It is **deliberately NOT built for accessibility, NOT built for structure, and NOT
  expected to be clonable.** It is an operator-discretion surface for decorative flourish, and it is
  the one place in the framework where those guarantees are knowingly waived.

 **WCAG 2.5.7 is NOT dissolved by this block.** A thrown object has no discrete single-pointer
  alternative. `allowedBlocks` filters by block NAME, not by CAPABILITY: `sgs/media` carries
  `linkUrl` and `videoControls` (default `true`, giving a focusable native `<video controls>`),
  `sgs/icon` carries `linkUrl`, and `core/image` carries WP's own `linkTo`. An operator can place
  operable content inside with no code. The `aria-hidden="true"` on the arena does not compensate —
  it removes content from the accessibility tree while leaving it in the tab order.
 "Decorative" is a property of a block's CONFIGURATION, not of a block TYPE. The scope ruling
  above accepts the consequence for this surface rather than requiring the guarantee. **Do NOT
  cite this FR as evidence that any other SGS surface clears 2.5.7** — every other drag effect
  earns that separately via a genuine discrete alternative (range input, arrows, dots).
  Residual, unbuilt, offered not owed: `tabindex="-1"` on focusable descendants would keep children
  throwable by pointer while removing the keyboard trap. ⛔ `inert` is the WRONG primitive — it
  blocks pointer interaction on the whole subtree and would disable the block.

 **This is the ONE named exception to FR-38-14**, which says physics are easing FLAVOURS and
  *never standalone toggles*. FR-38-14 continues to govern every other use; this canvas is the single
  surface where physics is the point rather than the easing. Do not read this as reopening
  FR-38-14 generally.

 **Capability was never the objection** — Physics2DPlugin and InertiaPlugin are already bundled
  and free.

 **Autonomous motion.** An object still moving *after release* is autonomous, so the
  "drag survives reduced motion" reasoning behind `fx-draggable`'s SIMPLIFY contract does not
  carry here. Reduced motion disables the physics outright — see the contract below.

 **KNOWN CEILING — it is a throwable layer, not a physics engine.**
  Physics2DPlugin has no collision detection; bodies bounce off the arena's edges only and pass
  straight through each other. There is also no rotation (`type: 'x,y'`) and no resize handling
  (bodies take fixed pixel `left/top/width/height` at init). Award-tier "physics playground" sections
  use Matter.js/Rapier for pile-up and stacking. Accepted for a decorative canvas; do NOT describe
  this block as a physics engine to a client.

 **Shape (Bean's call): a dedicated container-equivalent block
  whose children become bodies — NOT a physics toggle bolted onto existing blocks with preset
  shapes.** A preset-shape toggle locks operators into whatever shapes we happened to imagine; a
  container-kind block gives them anything they can put in a container. It therefore inherits the
 **composite-mirror rule** (`.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` §13.6) and MUST mirror `sgs/container`'s wrapper
  capabilities rather than diverging — its `container_kind` follows from that, and any missing
  capability is a gap to add to the block, never a converter workaround.

 **Reduced-motion contract — degrade to MORE content, never less.** Under
  `prefers-reduced-motion: reduce` the physics are disabled and **the children still render, static,
  in their authored positions**. The surface does not vanish. "Disables the surface outright"
  means *disables the motion*, not *removes the content*: hiding decorative children would be
  the `degrade-to-more-content-never-less` failure, and a client who placed an ornament deliberately
  should still see it. ⚠ **Flagged for Bean's confirmation:** the recorded ruling is one phrase
  that admits both readings, and this FR picks the one consistent with the captured rule. It is
  the cheaper error to correct in either direction. The §10 row carries this contract.

- **FR-38-29 Surface treatments — the first Tier W effect. BUILT + LIVE-VERIFIED.**
  Evidence `reports/visual-diff/tier-w-surface-2026-08-21.md`; canary
  `/tier-w-surface-canary/` (page 2591).

  A GPU shader repaints the raster image a block already renders. Three presets, chosen by
  NAME with a thumbnail — never a raw uniform at the default level (gap register §3.1,
  *"presets before parameters"*): **Grain** (film grain + contrast lift), **Halftone**
  (luminance-driven dot screen), **Duotone** (Rec. 709 luminance mapped across two palette
  colours). Duotone colours use `DesignTokenPicker` and store palette SLUGS, so re-theming
  a site re-colours every treated image.

 **Why Tier W and not V or G.** CSS moves and recolours a whole element; it cannot rewrite
  the pixels inside one. GSAP animates VALUES and never rasterises. Both §1.2b admission
  tests (i) and (ii) therefore hold. It is bounded to one surface (iii), degrades to the
  untouched image (iv), and is admitted under Tier W's five-part test (v).

 **SCROLL-RESOLVE — the treatment DEVELOPS IN as the element enters the viewport.** A static
  image filter in a spec whose entire subject is motion contributes no motion. A shared
  `uResolve` uniform (1 = untouched source, 0 = treatment at full chosen
  strength) is driven 1 → 0 by scroll progress. Client control: **"Reveal on scroll"**,
  default ON, storing `fxTreatmentReveal='off'` to disable.

 **The direction is deliberate.** The reverse — the photograph
  resolving OUT of a treated state into a clean one — would make the RESTING
  appearance of every treated image the untreated photograph, so the treatment would be visible
  only mid-scroll and vanish once the visitor stops. Running it this way leaves the settled
  appearance identical to a static treatment, so the motion is strictly additive.

 **SC 2.2.2 is not engaged, and that is the point of using scroll as the driver.**
  2.2.2 governs motion that STARTS AUTOMATICALLY and runs beyond five seconds. This advances
  only as the visitor scrolls and stops the instant they do — user-driven, exactly like the
  shipped Tier V parallax. So the accessibility position that made this the right first Tier W
  effect survives the motion. Cost is bounded three ways: an `IntersectionObserver`
  (an off-screen image runs nothing), an rAF-coalesced scroll handler (one redraw per frame at
  most), and a settled-state short-circuit (a fully-developed element stops redrawing).

 **No pointer gate**, so unlike FR-38-25's cursor field it renders on phones — which is where
  most SME and charity traffic is.

 **FAIL-OPEN BY CONSTRUCTION, NOT BY A FALLBACK BRANCH.** SSR renders the ordinary `<img>`.
  JS hides it **only after a successful first draw**, setting `data-sgs-webgl-active="1"` at
  the same moment. No WebGL2, a program that fails to LINK, a cross-origin (tainting)
  texture, a shader that fails to compile, or JS never running all end with the untreated
  photograph visible. There is no second code path to keep in sync, and a silently-dead
  shader is DETECTABLE (the flag is absent) rather than indistinguishable from success.

 **EVERY TREATMENT CARRIES A CLIENT COLOUR, DEFAULTED TO THE SITE PALETTE.** No ink or tint is
  hard-coded; every colour is a palette-slug default the client can change with the
  universalised colour controls.

  | Treatment | Uniform | Control | Custom property |
  |---|---|---|---|
  | grain | `uTint` | "Grain tint" | `--sgs-fx-tint` |
  | halftone | `uInk` | "Ink colour" | `--sgs-fx-ink` |
  | duotone | `uShadow` / `uHighlight` | "Shadow colour" / "Highlight colour" | `--sgs-fx-shadow` / `--sgs-fx-highlight` |

  All four store palette SLUGS, so re-theming re-colours every treated image. Resolution
  order at runtime: the client's explicit pick → the site palette (via each uniform's
  declared `paletteFallback` slug, transformed by `paletteTransform`) → the literal preset
  default, which only applies to a site defining no palette at all. **The render layer
  publishes a colour ONLY when the client set one** — emitting a default there would freeze
  it against future re-theming.

 **The palette value is DERIVED, never used raw.** A brand
  palette supplies one MID-tone hue; a duotone needs tonal distance between its ends and a
  halftone needs an ink dark enough to print. Using the primary raw makes the duotone look
  untouched (trading *"looks black and white"* for *"looks like nothing"*), and a fully
  deepened primary makes the halftone ink resolve to ~`rgb(60,33,51)` — still reading as
  BLACK at dot size, i.e. a colour control that visibly changes nothing. Hence three
  transforms: `deepen` (duotone shadow, grain tint), `ink` (halftone, chroma-retaining), and
  `lighten` (duotone highlight).

 ⚠ **Deliberately NOT `SgsColourPanel`**, despite it being the canonical colour control on
  many blocks. Its own docblock records that every call site mounts it exactly once per block;
  `fx.js` is a `registerBlockType` EXTENSION spanning many block types that already mount
  their own, so a second would stack a second panel titled "Colour" in the Styles tab — the
  scattered/duplicated-colour confusion the colour-control standard exists to remove, merely
  relocated. The four rows reuse the `DesignTokenPicker` + `ToolsPanelItem` shape this same
  file already uses for `fxFieldColour`.

 **Size:** the recorded baseline is 5,674 bytes gzip (4.6% of Tier W's 120KB page allowance;
  4,325 for the treatments, +1,349 for the scroll reveal), held in
  `scripts/motion-bundle-baseline.json`. Run `check-motion-bundle-budget.py` for the current
  figure — do not cite this line as today's size. It is offered on the image-bearing
  blocks. `creates_panel=1` is rejected: it would give a scroll-scrub panel to form fields
  (`form-field-tiles`, `option-picker`, `social-icons`, `star-rating`, `card-grid`) — the
  containment failure the fx roster gating exists to prevent.

 **Eligibility is STRUCTURAL, not declared.** The `image` provision token
  (`generate-fx-qualifying-blocks.py`) is the UNION of `supports.sgs.imageControls === true`
  and the block genuinely rendering an `<img>`. `sgs/media` and `sgs/decorative-image` both
  render one and **neither declares the flag**, so a declaration-only predicate would exclude
  the framework's two most obvious image blocks. The `svg` → `svg-subtree` split makes the same
  correction.

  A block that renders its `<img>` as the block ROOT (`sgs/decorative-image` in "naked mode")
  gets a gated `<span>` wrapper rather than a re-parent, so the compound selectors on the
  `<img>` itself are left alone (the boot module looks for a nested `img`). `fx` is NOT
  declared in `sgs/decorative-image`'s `block.json` — it is extension-owned and baselined in
  `scripts/block-file-consistency-baseline.json`. `sgs/media` is separately not offered at all
  (it hosts no fx panel and `creates_panel=0` correctly will not create one — the documented
  escape hatch is `supports.sgs.fx.motionSurface: true` on that block).

- **FR-38-30 Magnetic pull — Tier V, ONE core, TWO consumers. BUILT + LIVE-VERIFIED.**
  Canary page 2737 (`/gate-do-not-delete-magnetic-pull-fr-38-30/`). An element leans toward the
  pointer while the pointer is still OUTSIDE it — a proximity radius is the whole difference
  between a magnetic button and a hover state.

 **Not a new mechanism — a generalisation of a shipped one.** `src/shared/effects/magnet.js`
  drives `sgs/nav-bar-menu`'s label nudge (±8px, X-axis, only
  while the pointer is over the label itself; the burger/magnet mechanism is bar-only). The
  `createMagnet( el, opts )` core generalises that file: its no-options behaviour is
  byte-identical, so `sgs/nav-bar-menu` is unaffected.

 **Why a shared document listener, not a per-element one.** `createMagnet()` attaches NO listeners
  of its own, because an element-scoped `mousemove` structurally cannot see a pointer that is
  outside the element — which is exactly the moment a magnet must engage. `fx-magnet.js` owns ONE
  document-level listener and drives every magnet instance on the page from it.

 **Distance is measured to the element's BOX, not its centre.** A 300px-wide button's far edge is
  150px from its own centre before the pointer is anywhere near it — measuring from the centre
  would silently shrink the effective reach on large elements. Pull falls off linearly to zero at
  the radius edge.

 **Tier V, not G** — the motion-ecosystem survey concluded magnetic
  buttons are *"~20-30 lines of vanilla JS — write it, don't dependency it"*; GSAP adds nothing
  §1.3's ratchet would accept.

 **DB row:** `fx_effects` tier `V`, scope `block`, `requires='none'` (PERMISSIVE — offered
  wherever a panel already exists, never creates one), `creates_panel=0`, `in_picker=1`,
  `triggers='hover'`, `reduced_motion='suppress'`, `owns_scroll_transform=0`. It is offered on
  every fx-panel block, including `sgs/button`, `sgs/multi-button`, `sgs/icon`.

 **Controls:** Pull distance + Reach (`RangeControl`, `isShownByDefault`), Direction
  (`SelectControl`, behind "+"). Editor Notice: previews live-site only (the parallax-Notice
  precedent — a pointer-tracking effect cannot preview in a static canvas, §9).

 **Reduced motion: SUPPRESS — deliberately differing from cursor-field's SIMPLIFY.** A resting
  cursor-field is a legitimate finished PAINT (nothing moves, nothing is missing); a magnet's
  displaced element has no equivalent resting paint — its finished position IS wherever the layout
  put it, i.e. undisplaced. Under `reduce` no listener attaches at all, which is also the no-JS
  state, so there is exactly one code path rather than two that could drift apart.

 **Grammar:** `data-sgs-fx="magnet"` + `data-sgs-fx-magnet-axis` / `-radius` / `-strength` (§11.2).
  Block attrs: `fxMagnetAxis` / `fxMagnetRadius` / `fxMagnetStrength` (§11.3).

 **Size + live verification:** 1054 bytes gzip. LIVE-VERIFIED on canary page 2737: measurable pull
  at 240px outside the button, peaking at ~80px displacement, zero displacement beyond the 260px
  reach. Axis lock proven with a genuine negative control: a locked instance held `y=0.00` while an
  unlocked neighbour moved `y=-19.25` under identical pointer input.

- **FR-38-31 Flowing gradient — the SECOND Tier W entry. BUILT + LIVE.**
  ⭐ **SIX STYLES.** One `fxWaveVariant` attribute:
  `pastel | horizon | ribbon | veil` paint in pure CSS and boot no canvas at all;
  `aurora | ink` run the WebGL shader (`src/shared/effects/webgl/aurora.js`) and are the
  SAME shader — it measures the base colour's luminance and crossfades compositing, so a
  dark ground gives emissive curtains and a light one gives drifting pigment.
  Curated per-style colours are declared in `:where()` at ZERO specificity so a client's
  own pick always beats them. The variant rides this effect (no separate `fx_effects` rows).
  ⛔ **CSS cannot render an aurora** — filaments need per-pixel noise and domain warping,
  which CSS has no primitive for.

  ⛔ **SCOPE: FR-38-31 is a FINISHED, SELF-CONTAINED effect.** The configurable **generative
  background engine** — one engine remappable for colours, shapes, sizes and positions — is a
  SEPARATE effect (`generative-background`, `src/shared/effects/fx-generative-background.js`)
  with its own technique report
  (`.claude/reports/2026-08-25-generative-background-engine-technique-spec.md`). **Do not read
  the rejected-look analysis below as an open build item on FR-38-31, and do not do engine work
  under this FR.** The aurora look was never this effect's target — it was modelled on
  stripe.com's hero. Aurora belongs to the engine track.

  ⚠ **TECHNIQUE.** This is NOT a vertex-displaced mesh. It is a **fullscreen triangle generated
  from `gl_VertexID`** (no vertex or index buffers) with colour computed **PER PIXEL** from three
  independent drifting noise fields, composited with standard alpha-OVER `mix()`.
  ⛔ Additive/screen blending is not used: it needs headroom below white, and this effect's
  ground is deliberately light, so it clips to solid white on one palette and reads as static on
  the other. Do not introduce it.
  ⚠ **This is NOT stripe.com's current technique.** It is their **~2020-21** hero, the one every
  public tutorial documents. Their current hero was
  recovered from their shipped bundle and is materially different: one vertex shader over a
  CPU-folded 33,153-vertex plane, colour SAMPLED FROM A TEXTURE rather than interpolated, a fine
  striation field, and a second full-screen pass applying angular blur plus grain.

  Files: `src/shared/effects/webgl/wave-gradient.js` (renderer + shaders),
  `src/shared/effects/fx-wave-gradient.js` (lifecycle), `assets/css/fx-wave-gradient.css`
  (the FALLBACK CONTRACT — see the widening note below), `includes/fx-wave-gradient.php`
  (colours + the Pause control).

 **Built as a SIBLING of `webgl/renderer.js`, not an extension of it — and that duplication is a
  named cost, not an oversight.** The three Tier W house contracts (context-loss recovery,
  explicit GPU disposal, power/thermal awareness — §1.2b) are IMPLEMENTED TWICE, once per
  renderer, and any fix to one of them must be applied to both.

 ⛔ **THIS WIDENS TIER W RATHER THAN EXTENDING IT — see §1.2b for the full
  argument.** In summary: Tier W's `null`-return-is-the-fallback premise holds only because
  `surface-treatment` wraps an existing source image. `flowing-gradient` is GENERATIVE — there is
  no untouched anything for a failed init to fall back to — so it ships a real, hand-authored CSS
  fallback that must be kept in sync with the shader forever, which is the exact ongoing cost
  Tier W's `null`-return contract exists to avoid. Tier W is still a CLOSED list, with entries of
  two different fallback shapes.

 **AUTONOMOUS, not cursor-driven — Bean's ruling, and it changes what SC applies.** stripe.com's
  hero animates on its own; Bean's reasoning for following that shape rather than a cursor-driven
  one: it fixes the mobile problem — a cursor effect renders nothing on a phone, which is most
  client traffic. Autonomous, load-triggered motion engages **SC 2.2.2** (Pause, Stop, Hide), so
  the effect ships a real, keyboard-reachable Pause control (44px touch target, visible focus,
  `aria-pressed`), emitted `hidden` by SSR and unhidden by JS only once the effect is confirmed
  running — so it is never a dead control sitting in the tab order for a visitor whose init failed.
  **`prefers-reduced-motion` does NOT discharge 2.2.2 on its own** — record that plainly, it is a
  common conflation and this FR does not make it.

 **Three further stops, for POWER rather than compliance:** `IntersectionObserver` (an off-screen
  gradient runs nothing), `visibilitychange` (a hidden tab runs nothing), and a give-up on
  context-loss (never leave a dead black rectangle — the same house contract §1.2b already names).
  On context loss, `fx-wave-gradient.js`'s `onLost` handler removes `data-sgs-wave-active`, so
  `fx-wave-gradient.css` stops hiding the fallback and the CSS layer paints again.
  `wave-gradient.js` probes capability via `plugins/sgs-blocks/src/shared/effects/webgl/capability.js::probeSurface` and opens its context
  with `powerPreference: 'low-power'` and `failIfMajorPerformanceCaveat: true`.
  **DPR capped at 1.5** — the effect is fillrate-bound, and an uncapped 3× phone display would do
  9× the pixel work of a 1× display for the same visual result.

 **Reduced motion: SIMPLIFY.** The renderer draws exactly ONE frame and stops, so the section is
  never blanked and the gradient still reads as a finished, intentional visual — it simply does
  not move.

 **Four client colours** (a base plus three wave layers) via `DesignTokenPicker`, resolved through
  `sgs_colour_value()` so a palette slug becomes the `var()` form before reaching the shader — a
  raw slug fed to the WP style engine emits `background-color:primary` verbatim, which the browser
  drops; the same resolution discipline `surface-treatment` already uses for its duotone
  colours.

 **DB row:** `fx_effects` tier `W`, scope `block`, `requires='surface'`, `creates_panel=0`,
  `in_picker=1`, `triggers='load'`, `reduced_motion='simplify'`.

 **Size:** 3648 bytes gzip = 3% of Tier W's NAMED 120KB page allowance.

 **Licence provenance — recorded because most shader lineage in this space is NOT clean.**
  Technique modelled on `sa3dany/wave-gradient` (MIT), whose shader header states it is "based on
  the original vertex shader used by stripe for their gradient"; noise is Ashima/Gustavson simplex
  noise (MIT). ⛔ **nimitz's Shadertoy "Auroras" is CC BY-NC-SA (NON-COMMERCIAL) and is NOT used**
  — recorded explicitly because most aurora/flow-field shaders found in the wild descend from it,
  and this is the check that keeps this codebase off that lineage.

 ⚠ **STATUS — BUILT AND LIVE, BUT ITS LOOK IS REJECTED by Bean.** Verbatim:
  *"it also looks like B-movie 3D VFX from like the early 2000s."* This is NOT a tuning problem —
  the mechanism, not just the verdict:
  - (a) the `minigl` mesh technique every public tutorial documents is stripe.com's OLD hero
    (~2020-21). Their CURRENT hero is a different implementation
    (`hero-wave-animation__canvas`, WebGL2, with a `wave-fallback-desktop.png` fallback) —
    a BOUNDED RIBBON on a LIGHT ground with text beside it on clean white, plus fine striations,
    not a full-bleed dark mesh.
  - (b) their colour comes from a hand-painted 480×480 `palette.png` TEXTURE the shader samples,
    not from interpolating a handful of CSS-style stops. Sampled values run nearly all above
    `0xf0` — peach/coral/pink/cream/lilac, ADJACENT warm hues. This build uses a near-black navy
    base with widely-spaced saturated hues.

    ⛔ **Four colour stops are NOT the ceiling.** Rendering four HUE-ADJACENT stops through
    Stripe's own machinery produced a premium result
    from a palette carrying **307** unique colours, against Stripe's **82,831**. What fails is
    *complementary* stops — interpolating blue→orange in RGB passes through grey and produces the
    muddy band, the same failure as the rejected Aurora teal band. **The constraint is hue
    ADJACENCY, not colour count: no artist-painted palette and no palette-texture capability is
    required.** Evidence: `.claude/reports/2026-08-25-stripe-hero-anatomy.md` §Q7.
  - (c) A scratch replication rig reproduces the live
    hero at **0.66%** mean pixel difference against a live capture frozen at the same `u_time`,
    with all 26 recovered mechanisms implemented. What makes theirs look expensive, in
    priority order: **form** (a bounded shape dissolving by depth, not a full-bleed repetitive
    wash), **ground** (bright colour on white, not saturated colour on near-black navy), **hue
    adjacency**, and **a fine detail field** (striations — ours has none). FR-38-31 **does not
    band** (mean scanline run-length 1.19), so "add a dither" and `mediump`→`highp` are not
    needed. Report: `.claude/reports/2026-08-25-stripe-hero-anatomy.md`.
  - (d) **GPU cost:** 0.373ms/frame on an RTX 2060 at 1393×761, blocklist not bypassed. ⭐ **The
    post-process pass is 0.261ms of that — 70% of the frame, 2.3× the render it post-processes.**
    §1.2b names multi-pass as the trigger to reopen Tier W's library decision; **a framebuffer
    pass is a design gate, not an increment.** Fidelity held across three measurements: 0.66% →
    0.67% on a held-out frame → 0.69% at DPR 2.
  - (e) ⛔ **The technique spec is not a build spec — do not build shader work from it.**
    `.claude/reports/2026-08-25-generative-background-engine-technique-spec.md` never specifies
    the animation, gives no camera or projection, states no acceptance criterion, and its §2
    canvas-gradient mechanism contradicts its own §5 OKLab remedy. Its §5 (hue adjacency) and §6
    (ground) are sound and are the only parts in scope.
    ⭐ The look reads as rendered 3D, and the spec's top-ranked mechanism builds a *sculpted 3D
    ribbon* while deferring §7, the blur-and-grain that flattens it photographically. Building
    §1 first bets against the diagnosis. The rejected look is **four CSS values**:
    `fxWaveBase`/`fxWave1..3` all default to `''` (the attribute defaults in
    `src/blocks/extensions/fx.js`), the effect defaults to `off`, and only canary page **2740**
    uses it.

- **FR-38-32 Particle trail — Tier V, ONE engine, THREE presets. BUILT.**
  Canary page 2744. A pool of short-lived sprites trails the pointer across an emitter and fades out.
  ⭐ **This is the real fading trail the owner asked for.** The cursor-field control labelled
  "Drag weight" (`fxFieldTrail`) is a lerp follower with NO fade and must never be reported as
  satisfying that ask (FR-38-25 records the same warning).

 **Why its own fx effect and NOT a sixth cursor-field type.**
  (i) There is no JS painter seam to attach to: `cursor-field.js`'s docblock names a `cursor-fields/`
  module directory that **does not exist**, and every shipped field type is painted solely by a
  `[data-sgs-cursor-field="X"]` CSS rule. A canvas cannot be expressed that way — the same
  structural break holds for the grid-dot field (FR-38-33), also a canvas.
  (ii) Field types are MUTUALLY EXCLUSIVE (one `data-sgs-cursor-field` value per emitter), so as a type
  "Sparks" would REPLACE the client's glow instead of layering over it. As its own effect it composes.
  Follows the `magnet` precedent (FR-38-30) exactly — a shipped shape, not new infrastructure.

 **Files:** `src/shared/effects/particles.js` (the WP-agnostic engine — canvas, pool, integrator),
  `src/shared/effects/fx-particles.js` (boot module; ONE document listener, rAF-throttled once, driving
  every instance — an element-scoped listener cannot see a pointer that has not arrived yet),
  `assets/css/fx-particles.css` (Spec 32: CSS owns positioning, JS sets only the canvas width/height
  ATTRIBUTES, which are buffer size and not styling).

 **The three limits, owner-approved at the design gate and enforced in code:**
  - **Cap** — `MAX_PARTICLES = 150` per emitter, a pool allocated ONCE and written as a ring buffer
    (`pool[cursor]`, cursor advanced modulo); never `push`/`splice`, so its length cannot grow. One
    canvas per emitter, DPR clamped to 1.5 (the FR-38-31 precedent). Fine-pointer only.
  - **Stop-on-idle** — self-terminating with NO timer: `step()` returns `liveCount > 0`
    (`particles.js`) and `tick()` re-schedules only on `true`, so the loop exits the frame the pool
    empties and `push()` restarts it on the next movement. Plus `IntersectionObserver` (off-screen
    runs nothing) and `visibilitychange`.
  - **Flash ceiling (SC 2.3.1)** — answered STRUCTURALLY, not by a rate limit: alpha is `1 - age/maxAge`
    and nothing can make it rise, so there is no flash to cap. Particle radius is clamped to a
    coverage-derived ceiling `r <= sqrt( 0.10 * A / ( pi * CAP ) )`, bounding painted coverage to ~10%
    of the emitter box against the 25% threshold. `ripple` is additionally gated to 2 rings/second.
    The RING branch is deliberately not clamped to `maxRadius`: a ring is STROKED, not filled, so it
    is not bounded by the filled-disc ceiling `maxRadius` encodes — its painted area is
    circumference x lineWidth (a 2px-stroked ring at ~3x a ~21px radius, max 2 alive, measures
    ~0.075% of the box). A guard that clamps nothing is worse than no guard: it invites reliance.

⭐ **Colour control.** `fxParticleColour` offers a `DesignTokenPicker`, defaulting to the emitter's
  inherited TEXT colour. An inherited text colour can fall to 1.44:1 against an emitter's own
  near-black background, at which point the effect fires perfectly (~7,400 lit canvas pixels) and
  is invisible. A lit-pixel count cannot tell "painting correctly" from "painting invisibly".
  ⛔ The JS reads the CANVAS's computed `color`, not the emitter's, because a custom property read
  via `getPropertyValue()` returns the `var(...)` text UNRESOLVED and a canvas cannot paint with a
  string.

 **Requested variations — NOT BUILT, post-launch.** Two further looks the owner asked for after
  seeing the trail working live:
  1. **Sparkler** — sparks throwing off a burning point rather than trailing behind the pointer.
     Distinct from `sparks`: emission is radial/scattered, not path-following.
  2. **Continuous connected trail** — a snail-like ribbon that still FADES like the current trail
     but stays visually CONNECTED to the pointer at all times, rather than resolving into discrete
     dying particles. This is a different primitive from the existing pool: a continuous stroke,
     not a sprite pool, so it likely cannot be a fourth preset of the current engine.
  ⛔ **Timing is explicit: feature extension AFTER the theme launches.**

 **Reduced motion: SUPPRESS** (§10 row). **SC 2.2.2 does NOT engage** — pointer-initiated, and every
  preset life (0.55s / 1.3s / 0.85s) is far under the five-second threshold, so no Pause control is owed.

 **DB row:** `fx_effects` tier `V`, scope `block`, `requires='none'`, `creates_panel=0`, `in_picker=1`,
  `triggers='hover'`, `reduced_motion='suppress'`, `owns_scroll_transform=0`.

 ⛔ **REGISTRATION IS MANY POINTS AND SOME ARE GATED BY NOTHING.** The drift gate
  (`scripts/check-fx-list-drift.py`) covers `SHIPPED_EFFECTS`, `FX_OPTION_LABELS`, `FX_ATTR_MAP`
  and `sgs_fx_effect_param_scope()`; the seed row is a fifth point, and the build's own generators
  fail closed on `generated-fx-effects.php` and `generated-fx-qualifying-blocks.json`. Confirm
  whether the motion-registry **script-module map**, its **per-effect CSS map**, and the **webpack
  entry** are gated before assuming them covered. Miss one and the effect registers, the panel
  appears, the client configures it, and nothing happens — the "configured and invisible" failure.

 **Child-lift.** `sgs/container`'s child-lift rule (`container/style.css`) is a zero-specificity
  `:where()` selector, so a decorative non-flow layer that declares its own `position`
  (`.sgs-particles__canvas`) is immune with no registration required. Check which rules actually
  matched by enumeration, never by reasoning about specificity.

 **Live-verified on 2744:** attrs survive WP, canvas present in the effect and ZERO in an adjacent
  negative-control container, 4249 lit pixels peak during a pointer sweep, 0 console errors, deployed
  CSS md5-identical to local. The editor surface is described in the §9 row.

 **Measured live on canary 2744** — both claims, each with a control,
  through the permanent read-only `stats()` probe on `createParticles()` plus the
  `window.sgsFxParticles` handle in `fx-particles.js`. The probe instruments the MODULE.
  - **The cap CLAMPS at exactly 150.** 600 `push()` calls inside ONE frame (nothing can age or
    die between them) drove `live` from 3 to **150**, and it held 150 across all 11 subsequent
    trace points — never 151. The ring buffer is 150 slots allocated once and `spawnOne()`
    increments `liveCount` only when overwriting a slot that was not alive, so the ceiling is
    structural — and this exercises the real shipped path rather than asserting it.
  - ⚠ **But the cap is NOT the binding constraint at shipped density — particle LIFETIME is.**
    A continuous fast real-mouse sweep peaked at **106 of 150** over 362 frames sampled every
    frame, and 107 over 90 samples on an independent instrument. Zero samples above 150, but
    also zero AT 150. Under ordinary pointer input the pool never fills, and a future density
    rise has real headroom before the cap starts doing any work at all.
  - **The loop STOPS.** Pointer parked off the emitter: `ticks` was **131 at t0 and 131 at
    t+2500ms** — 0 frames drawn — with `live` 0, measured past the longest preset life (1.3s).
    POSITIVE CONTROL: moving the pointer again raised `ticks` 131 → 169, so the sampler can
    report rising and a frozen counter is a real stop rather than a dead probe.
  - **NEGATIVE CONTROL:** 16 `.sgs-container` elements on the page, exactly **1** carrying
    `data-sgs-fx="particles"`, and the module's instance list holds exactly **1** emitter — a
    container without the effect constructs no instance at all, which is a stronger statement
    than "its canvas looks empty". 0 console errors.

 ⚠ **Three traps when re-measuring:** instrument the MODULE, not the
  page (a global rAF counter catches every other effect and proves nothing); sample DURING the
  sweep, not after (sampling once afterwards reads 0 lit pixels and files working code as
  dead); and note the listener is **`mousemove`**, NOT
  `pointermove` — a synthetic-`PointerEvent` probe returns 0 across 240 frames against
  perfectly healthy code, because nothing is listening for the event it sends.

- **FR-38-33 Cursor grid-dot field — Tier V, canvas. BUILT AND LIVE-VERIFIED.**
  A background **grid**; a visual item (a dot) sits in each cell.
  Cells within a set radius of the pointer lean their dot toward it; **each dot is locked inside
  its own cell and cannot leave it**; when the pointer moves out of range every dot eases back to
  its cell centre.

 **Preset B, chosen by the owner from a live prototype:** cell 40, dot radius 2, interaction
  radius 150, max lean 12, ease-back 260ms, proximity fade ON. **Measured live:** 752 dots,
  `leanCeiling` 12, dots move toward the pointer (71px changed near the pointer / 0 far from it),
  ease back to rest, no leak into non-fx containers.

 **Clamp:** `CELL_LOCK = 0.42` × cell, applied regardless of the configured lean.

 **SC 2.3.1 answered structurally, the FR-38-32 pattern:** dots never spawn/die/pulse, so
  coverage is constant — measured under 1% of the emitter box against the 25% threshold.

 **Reduced motion: SUPPRESS** — no instance, no canvas, no listener created at all.

 Per-object drift on marked decorative children is NOT part of this effect — FR-38-30 (magnet)
  covers that behaviour.

 **Why its own effect and NOT a sixth cursor-field type — the FR-38-32 ruling, applied unchanged.**
  A dot's offset depends on its own distance to the pointer, and its travel is clamped to its own
  cell. CSS cannot compute per-cell distance, so this cannot be a `[data-sgs-cursor-field="X"]`
  paint rule — the exact structural break FR-38-32 cites. Field types are also MUTUALLY EXCLUSIVE
  (one `data-sgs-cursor-field` per emitter), so as a type it would REPLACE a client's chosen glow
  instead of composing with it.

 **Tier V, canvas 2D.** Same substrate as FR-38-32's particle engine — a grid of dots with an
  ease-back integrator needs no GPU shader, so §1.3's ratchet refuses anything dearer. ⛔ **NOT
  Tier W**; that list stays closed.

 **Six client controls:** dot colour, spacing, dot size, reach,
  lean, settle. Plus a **static lattice preview in the editor canvas** (CSS radial-gradient, no
  canvas/JS) — see the §9 row. **Colour default is `primary`, NOT `accent`** — `accent` measured
  1.35:1 on the client's cream background and was barely visible.

 **Registration touches many points.**
  `includes/extension-attributes.generated.php`, gated by its own pre-commit gate, is one
  beyond the list FR-38-32 enumerates. Verify the current set against
  `class-sgs-motion-registry.php` and the generators before registering a further effect — do not
  carry a count forward without re-checking.

 **Child-lift.** `sgs/container`'s child-lift rule (`container/style.css`) is a zero-specificity
  `:where()` selector, so a layer declaring its own `position` is immune with no registration
  required; this grid-dot canvas needs no addition to any exclusion list.

- **FR-38-34 Repulsion particle field — Tier V, canvas. NOT BUILT.**
  Particles that float freely across a surface and **move AWAY from the pointer** as it approaches,
  settling again once it leaves. Distinct from FR-38-32 in both respects: that engine's particles
  are **pointer-SPAWNED and short-lived** (a trail that dies), these are **persistent and
  pointer-AVOIDANT**.

 **Relationship to FR-38-32 — likely shares the engine, and that is a design-gate question.**
  `particles.js` owns a pooled canvas, a ring buffer and a self-terminating
  rAF loop, all reusable. But its pool is built around particles that AGE AND DIE
  (`alpha = 1 - age/maxAge`, the whole SC 2.3.1 flash answer), and these do neither. Whether that
  is a new preset or a sibling module must be settled at the gate, with the pool's lifetime model
  measured rather than assumed.

 ⛔ **OWED BEFORE BUILD:** the same list as FR-38-33 — owner-approved reference, design gate,
  §6/§9/§10 rows at build, and the registration-point check.


### 3.4 SVG

- **FR-38-15 DrawSVG.** Element-level stroke-draw on SVG-bearing
  blocks (`sgs/responsive-logo`, `sgs/icon`, `sgs/separator`);
  load-triggered OR scroll-scrubbed. `sgs/responsive-logo`'s `animationStyle`
  (`draw-on-load | hover-redraw | scroll-trigger`) runs on DrawSVG; there is no `deprecated.js`
  (no version bumps, no deprecations before production). The reduced-motion arm is the house
  live-check (§10). "No external libraries" was always an approximation of the real rule —
  "bundle it, no CDN". **The Tier V `data-sgs-path-draw` IIFE stays** — simple load-draw on
  arbitrary SVG paths stays vanilla; DrawSVG owns the scrubbed + block-integrated cases.
- **FR-38-16 MorphSVG — ASSET-GATED.** Element-level morph between prepared path pairs. The
  control does not appear until the block instance carries BOTH assets, and the inspector links
  authoring guidance (how to produce matched-topology path pairs; what fails). Ships with that
  guidance, not a bare toggle.
- **FR-38-17 MotionPath.** Decorative-image float/travel along a path. **Tier V by default**:
  CSS `offset-path`/`offset-distance` (well-supported) drives autonomous looping travel with no
  GSAP. **Tier G only when scroll-scrubbed** (path progress mapped to scroll → MotionPathPlugin
  + ScrollTrigger). The inspector exposes one control surface; the tier fork is an
  implementation detail invisible to the client.
 **Resting position.** The traveller must settle at a designed payoff position that is never
  under the sticky header. The client-facing
 **"Resting position" control** has four named presets (`below-header` / `middle` / `lower-third`
  / `custom`, DEFAULT `middle` — industry convention for "settle and read": viewport centre,
  never `top top`, which is for pinning mechanics) plus a 5vh-stepped fine-tune slider for
  `custom`. Values resolve **declaratively in CSS** via `calc()`/`max()` against the existing
  published `--sgs-header-height` custom property (`assets/css/fx-motion-path.css`); the
  `max()` floor (`header-height + 16px`) guarantees the traveller can never rest under the
  header regardless of preset or unusually tall/wrapped content. The runtime
  (`fx-motion-path.js`) does not compute or measure this position itself — `ScrollTrigger`'s
  own `onLeave`/`onEnterBack` callbacks (fire once per boundary crossing, never per-frame) hand
  off between the GSAP-driven transform (mid-scrub) and a plain CSS `position: sticky` rule
  (once settled), clearing the transform on handoff so the CSS rule is never fighting a stale
  `translate`. Reduced motion (§10) reads the identical `--sgs-fx-motion-path-rest-y` custom
  property unconditionally, so the resting position holds even when no tween is ever created —
  one CSS source of truth for both branches, not two code paths that could drift apart.
  The layering is deliberate: `scroll-padding-top`/`scroll-margin-top` cannot fix this (neither
  ever fires for a GSAP transform, only a real scroll operation), and a runtime
  `getBoundingClientRect()` clamp would be the wrong layer (ad hoc pixel maths against a value
  the CSS layer can resolve declaratively, per-frame layout reads for a static value, and a
  second reduced-motion code path).
  Universal per R-31-9: the mechanism works whether the traveller is an `<img>`
  (`sgs/decorative-image`) or any other element, because it never needs to nest anything inside
  the traveller (a void element — see `fx-motion-path.css`'s docblock).

### 3.5 Site level

- **FR-38-18 Site-level smooth scrolling — Tier H, Lenis.**
  **BUILT + LIVE-VERIFIED.** Evidence:
  `reports/2026-07-30-motion-waveB-commit1-live-verification.md`. Owner-tuned to strength 3.
 **Verified:**
  · **Long-distance anchor.** Proven over **2,211px**, not the skip link's 24px: the
  journey eased (269 → 1295 → 2009 → 2190, not a teleport), was **not** clamped at the document
  end, and the target landed **0.21px clear** of the sticky header — the same offset the 24px
  test produced, so distance does not degrade it.
  · **Reduced motion.** Chrome's own media matching was emulated (not stubbed) and the browser's
  verdict read directly from `pagereveal`'s `viewTransition`. This carried a **negative
  control**: under `no-preference` a transition genuinely RAN, so the suppression under
  `reduce` is a real result rather than a test that could never fire either way.
  SITE setting on the **SGS → Motion** page, default OFF. Lenis eases the REAL document scroll
  rather than transforming a wrapper, so there is no `#smooth-wrapper`/`#smooth-content` markup,
  no template change, and no interaction with the Spec 37 header (§4.2).
 **Mandatory conditions:** (a) disabled in the editor and all of wp-admin — server-side by the
  enqueue (`is_admin()`), plus a runtime gate for the editor's iframed canvas; (b) disabled under
  `prefers-reduced-motion`, checked LIVE and **reactively** — a mid-session OS change tears the
  instance down and a change back rebuilds it, without a reload; (c) anchor links + `:target` +
  "skip to content" resolve to correct positions, honouring the published `--sgs-header-height`
  scroll-padding (Spec 37) — Lenis's own `anchors` option stays OFF so there is exactly one
  driver on an anchor click; (d) **touch scrolling stays native by DEFAULT** (`syncTouch: false`) — phone
  momentum is what a visitor's muscle memory expects, and this must be set EXPLICITLY, never left
  to the vendor default. An operator-facing opt-in with its own strength exists but is
  **default OFF and documented as not recommended**:
 **tested on a real phone at the lightest setting (touch strength 1) and rejected by the owner as
  "abrupt and janky" — worse than off, not better.** That is a measured device result, not a
  preference; do not re-propose touch smoothing as an improvement without new evidence from a
  real device; (e) keyboard/programmatic scrolling (find-in-page, focus scrolling)
  remains functional — smoothing never intercepts input-driven scroll correctness, only
  presentation; (f) the companion stylesheet ships on the SAME conditional terms as the script —
  without its `.lenis.lenis-smooth iframe { pointer-events: none }` rule, wheel events over a
  cross-origin iframe are swallowed and the page stops scrolling wherever the pointer sits over
  an `sgs/media` or `sgs/business-info` embed.

  > The competing `scroll-behavior:smooth` CSS driver (`core-blocks-critical.css`) was measured
  > live with Lenis running and does not conflict: long smooth scrolls ease cleanly, anchor
  > clicks land clear of the sticky header. Re-open only with a reproduction.
- **FR-38-19 Page transitions — Tier V, cross-document View Transitions API.**
  **BUILT + LIVE-VERIFIED.** Evidence:
  `reports/2026-07-30-motion-waveB-page-transitions-verification.md`.
  SITE setting + per-template overrides on the **SGS → Motion** page, default OFF, sharing the
  existing `sgs_motion_settings` option. CSS-first (`@view-transition`), progressive enhancement,
 **no GSAP, no router, and zero frontend JS** (the feature ships one stylesheet and
  nothing else). **Fallback where unsupported:** navigation behaves exactly as today — the
  feature is presentation-only, so absence of support IS the fallback, with nothing to build.
  Named transition styles (fade / slide / none), site-wide and per template.
 **Mandatory conditions, all live-verified:**
  (a) OFF ships zero bytes, and this holds **per template** — a template set to `none` enqueues
  no stylesheet and no rule, not a stylesheet that animates nothing;
  (b) reduced motion SUPPRESSES by gating the **opt-in itself** inside
  `@media (prefers-reduced-motion: no-preference)`, never by cancelling the animation afterwards
  — so the browser never does the snapshot work for those visitors. This also fails in the safe
  direction: a UA that cannot evaluate the media feature gets no transition;
  (c) never active in the editor or wp-admin (`wp_enqueue_scripts` + `is_admin()`);
  (d) the per-template list is enumerated from the theme via `get_block_templates()`, never a
  hardcoded roster — it includes WooCommerce's templates, which the theme directory does not
  contain.

  > **Two implementation rules:**
  >
  > · **The transition targets the `root` snapshot pair, not per-element
  > `view-transition-name`s.** Per-element `view-transition-name` conventions are a *different
  > capability* — element continuity across a
  > navigation (a thumbnail growing into a hero). FR-38-19's scope is whole-page
  > navigation styling, and `root` is the correct minimal mechanism for it. Per-element
  > continuity is not built and is not claimed; it would be a new FR.
  >
  > · **`mix-blend-mode: normal` is set explicitly** on the old/new root snapshots. The UA
  > animates them with a second, blend-mode animation (`plus-lighter`), which the `animation`
  > shorthand happens to drop. `plus-lighter` sums colours additively and only looks right while
  > the snapshots overlap exactly — which the slide style deliberately breaks, producing visible
  > banding. Stating the value explicitly means restoring the "platform default" later cannot
  > silently reintroduce the artefact.

**Independent corroboration of the reduced-motion shape:** WordPress core ships the same
construction in its own admin CSS (`wp-view-transitions-admin-inline-css`:
`@media (prefers-reduced-motion:no-preference){@view-transition{navigation:auto}…}`). The
pattern is core's, not an invention of this spec.

## 4. Named conflict resolutions (all seven; none deferred)

### 4.1 Conflict 0 — house vanilla-first principle × GSAP adoption

**Written homes of the vanilla-first principle** (there is NO literal "no GSAP" rule):
root `CLAUDE.md` Non-negotiables ("No jQuery — vanilla JS only frontend");
`theme/sgs-theme/CLAUDE.md` Performance Budget ("No jQuery, no external CDN");
Spec 01 ("no heavy animation libraries"); Spec 02 ("No external JS libraries — vanilla JS for
frontend interactivity").

**Resolution:** each home carries a one-line pointer to §1 (the doctrine), keeping its
performance intent ("no jQuery, no CDN" stay absolute). No track can truthfully say "GSAP isn't
in the stack" (it is — Tier G) or "everything should use GSAP" (it must not — Tier V is the
default and nothing shipped migrates). **In-flight track work is UNAFFECTED:** Spec 36's
burger-morph state wiring and trigger-anchor geometry are logic/geometry, not motion-system
scope, and stay the house way.

### 4.2 Smooth scrolling × Spec 37 header sticky

There is no conflict. Lenis (Tier H) eases the real document scroll and creates no wrapper and
no transform, so there is nothing for the header to sit outside of: the header's ancestor chain
reports `transform:none` and the header pins correctly, including mid-flight. The existing
warn-only `findStickyBreakingAncestor()` guard is unchanged. Spec 37 FR-37-40 is untouched, and
its verification is a regression check (§8), not an engineering task.

A wrapper-based smoother is unsuitable because it wraps and transforms page content, and a
transformed ancestor silently stops `position:sticky` from pinning — the exact mechanism the
shipped header sticky/collapse system depends on.

### 4.3 Entrance (Tier V `sgsAnimation`) × scroll-scrub on the same block

**Resolution — mutual exclusivity; scrub wins; enforced at RENDER time.** A scrub timeline owns
the element's transform/opacity for its whole scroll range; an IntersectionObserver entrance
fighting it produces double-animation and broken initial states — precedence ordering cannot
fix a shared-property conflict, only hide it. Rule: when a `data-sgs-fx` scrub effect is
present on a block, the render layer suppresses the `data-sgs-animation*` attributes for that
block — **two code paths, because the entrance attrs reach the frontend two ways**: for
DYNAMIC blocks the `animation-attributes.php` render_block injection simply **omits** them; for
STATIC blocks they are already BAKED into stored `post_content` at save time (`animation.js`,
the `blocks.getSaveContent.extraProps` filter), so the render layer must actively **STRIP** them
via `WP_HTML_Tag_Processor` (`plugins/sgs-blocks/includes/animation-attributes.php::sgs_strip_animation_attributes`, which
uses the same leading-`<style>`-skip technique as `inject_animation_attributes`).
Deterministic, content-independent.
Enforcement is render-time because stored attributes bypass the editor constantly (converter
clones, patterns, direct inserts) — WP silently keeps whatever attrs are stored, so an
editor-only guard is a suggestion, not a gate.
The editor mirrors it as UX: the Animation panel renders `Disabled` with a Notice ("A scroll
effect controls this block's motion — entrance animation is off") when an fx scrub attr is set
— consistent with Spec 35 Part A and the existing parallax live-site-only Notice. Non-scrub fx
(e.g. DrawSVG on load, ScrambleText) do NOT exclude entrances — only effects that own
transform/opacity across a scroll range do; the exclusion list is part of each effect's
registry row (§6), not a hardcoded pair.

### 4.4 Conditional-loading contract

**Resolution — a page-level motion registry at `render_block` priority 99 enqueuing WP script
modules; per-plugin webpack chunks with `gsap`/`gsap/*` as shared externals.**

- **Why this mechanism:** Tier G effects arrive TWO ways — dedicated blocks (which could
  self-serve via `viewScriptModule`) and **extension attributes on any block** (which have no
  per-block view module, so `viewScriptModule`-per-block cannot see them). `has_block()` has
  the known template-part blind spot. The `render_block` p99 chokepoint is the proven house
  pattern (`class-sgs-css-registry.php`; reuse its editor-parity predicate
  `sgs_is_frontend_render()`, which covers `is_admin()` + `wp_is_serving_rest_request()` +
  the `REST_REQUEST` fallback). Mid-render `wp_enqueue_script_module()` is proven live by the
  buybox proxy-enqueue (`buybox/render.php` — the `wp_enqueue_script_module()` loop over the
  product-card's `view_script_module_ids`).
- **Mechanism:** `SGS_Motion_Registry` inspects each rendered block (attrs + `data-sgs-fx`
  presence in markup), maps effect → plugin set (from the DB effect registry, §6), and calls
  `wp_enqueue_script_module()` for exactly the needed bundles (the buybox
  `view_script_module_ids` proxy precedent). Site-level settings (Lenis) enqueue from
  the settings check, same registry. WP's module registry dedups — ten blocks needing
  ScrollTrigger cost one enqueue.
- **Bundling:** GSAP core + each plugin is a separately REGISTERED script module built from npm
  (no CDN). `webpack.config.js` (`GSAP_MODULE_IDS`) builds each GSAP piece ONCE as a standalone
  module (`@sgs/gsap`, `@sgs/gsap-scrolltrigger`, …) and marks the bare `gsap` / `gsap/*`
  specifiers as **externals** (`externalsType: 'module'`) everywhere else, resolving to those
  module IDs via the script-modules import map, so no block or effect module ever bundles its
  own copy. A canary page proves `gsap` resolves via the browser's native import map and
  appears in NO consuming chunk's bundle.
- **Size budget (min+gzip, ESTIMATES from GSAP 3.12/3.13 except Lenis, which is measured; the
  recorded actuals live in `scripts/motion-bundle-baseline.json`; the build fails if a bundle
  exceeds its budget by >20%):**

| Module | Est. gz | Loads when |
|---|---|---|
| gsap core | ~26 KB | any Tier G effect on the page |
| ScrollTrigger | ~14 KB | any scroll-driven G effect |
| **Lenis** (Tier H) | 5,777 bytes gzip (~5.6 KiB) — MEASURED, not an estimate (`shared/effects/smooth-scroll.js`, includes the bundled library; the figure is the budget baseline in `scripts/motion-bundle-baseline.json`) | site setting ON |
| SplitText | ~9 KB | text reveals present |
| Flip | ~7 KB | filtered-grid pairing ON |
| Draggable + Inertia | ~15 + 6 KB | drag roster block opted in |
| DrawSVG | ~3 KB | draw effect present |
| MorphSVG | ~11 KB | morph present (asset-gated) |
| MotionPath | ~6 KB | scrubbed path present |
| ScrambleText | ~3 KB | scramble present |
| Physics/Custom easings | ~2–3 KB each | bundled inside the offering effect's chunk |

  Worst realistic page ≈ core + ScrollTrigger + SplitText ≈ **49 KB gz**; typical scroll-only
  page ≈ **40 KB gz**; page with zero Tier G ≈ **0 KB**. (These sit OUTSIDE the Tier V <10KB
  CSS + <4KB JS extension budget in Spec 02, which is unchanged.)
- **The existing anti-pattern is named:** today's Tier V motion assets enqueue unconditionally
  on every page (6 assets, runtime self-gating — `class-sgs-blocks.php`
  `enqueue_frontend_assets()`). Tier G MUST NOT repeat this; migrating Tier V assets onto the
  same registry is a stretch item (FR-38-24), not a precondition.

### 4.5 Reduced motion (per effect — §10 table)

Every effect defines **suppress vs simplify** individually, consistent with the house pattern:
the canonical check is `prefersReducedMotion()` (LIVE per call — `motion-utils.js`), plus
`gsap.matchMedia('(prefers-reduced-motion: no-preference)')` as the Tier G registration gate so
a mid-session OS change reverts/kills active tweens. CSS-side kill switches follow the existing
`@media (prefers-reduced-motion: reduce)` blocks. Spec 35 Part C/E5 and Spec 35A Part L: gated from day one,
never bolted on; the FAIL-CLOSED prebuild inspector-conformance gate applies to every new fx
control surface.

### 4.6 Editor canvas story (per effect — §9 table)

Scroll effects cannot preview in a static canvas (Spec 37 precedent; the parallax Notice
precedent). §9 defines per effect: static end-state, a preview toggle, or a labelled
no-preview. No effect ships without its editor story implemented — a canvas that silently
shows nothing is a defect (Spec 35 Part A1: the client must be able to function).

### 4.7 Cloning contract (§11)

Every effect maps to the **`data-sgs-fx-*`** draft grammar (first claimed by this spec).
`data-sgs-scroll-*` is deliberately left UNCLAIMED (§11.1). Unrecognised fx values →
**skip-with-reason** per class (Rule 4) — never silent, never a guess. The converter lift is
DEFINED but NOT BUILT; the grammar is stable so drafts authored today clone when it ships.

## 5. Functional requirements (with done-criteria)

The ROSTER FRs are defined in §3, not here — FR-38-6 … FR-38-19, plus
FR-38-25 (cursor field, §3.3), FR-38-26 (looping carousels, §3.3), FR-38-27 (physics canvas,
§3.3), FR-38-28 (the cursor field's four signed looks, §3.3) and FR-38-29 (surface treatments,
§3.3). Each carries its own done-criteria inline. **A new capability FR belongs in §3 + the §2
taxonomy table, not in this list** — this section is infrastructure only:

- **FR-38-1 — the motion-tier doctrine is written, homed, and cross-linked.**
  *Done when:* §1 exists; all five written homes carry the one-line amendment; Spec 36
  unaffected-statement present.
- **FR-38-2 — Tier G runtime provider conforms to the house contract.**
  `src/shared/effects/gsap/provider.js`: registers plugins, sets `gsap.defaults`, wires the
  global `matchMedia` reduced-motion gate + bfcache `pageshow`(`persisted`) teardown; every
  effect module exports `initX( el, opts ) → cleanup()` (cleanup kills its tweens/triggers);
  fail-open no-JS (SSR markup = finished state; initial hidden/offset states applied only by
  JS behind the `sgs-js` gate); JS writes custom-property VALUES or gsap-managed inline
  transforms only — never inline `style` in SSR markup (Spec 32).
  *Done when:* provider + ≥1 effect module pass a no-JS render check (content fully visible
  with JS blocked), a reduced-motion live-toggle check, and a bfcache back-nav check.
- **FR-38-3 — the conditional-loading registry (§4.4).**
  *Done when:* a page with zero Tier G effects serves zero gsap bytes (network-verified); a
  page with one scrub serves exactly core+ScrollTrigger; ten same-effect blocks produce one
  enqueue; the editor-parity predicate keeps ServerSideRender previews unaffected.
- **FR-38-4 — the `data-sgs-fx-*` grammar (§11).**
  *Done when:* the grammar table exists; no collision with the in-use namespaces
  (`data-sgs-animation*`, `data-sgs-path-draw*`, `data-sgs-parallax`, `data-magnet`,
  `data-spotlight`, `data-stagger`, `data-animation`); attrs are attr-per-property (suffix
  grammar); the DB rows (§6) exist.
- **FR-38-5 — entrance × scrub exclusivity (§4.3).**
  *Done when:* render-time suppression verified on **both paths** — one DYNAMIC-block instance
  (omit path) AND one STATIC-block instance with the attrs baked into stored markup (strip
  path) — each carrying both attr families; editor Disabled+Notice mirror present; exclusion
  driven by the registry flag, not a hardcoded effect list.
- **FR-38-20 — per-effect reduced-motion contract (§10).**
  *Done when:* every roster effect has a row; each is live-verified with OS emulation where
  the harness allows, and reasoned-by-construction rows are explicitly flagged.
- **FR-38-21 — per-effect editor-canvas story (§9).**
  *Done when:* every roster effect has a row and its implemented story matches it.
- **FR-38-22 — cloning contract defined (§11).**
  *Done when:* grammar + skip-with-reason rule are in-spec; converter work is explicitly
  MAPPED to a later stage (Spec 31 attr-routing extension), not silently dropped.
- **FR-38-23 — DB seeding (§6).**
  *Done when:* the seeder + reseed-guard exist and a full `/sgs-update` rebuild reproduces the
  seed byte-identically.
- **FR-38-24 — verification canaries + budget gates.**
  Tier G adds gate canary pages exercising each effect family (the
  P-NO-INLINE-GATE-COVERAGE-GAPS obligation: today's canaries never exercise
  animation-attributed instances); bundle-size budget check wired to prebuild; stretch:
  migrate Tier V motion assets onto the conditional registry.
  *Done when:* each shipped effect family has a canary URL the gates exercise; prebuild
  fails on budget breach — breach = **>20% over the recorded actuals**
  (`scripts/motion-bundle-baseline.json`); the §4.4 module figures are estimates, and the gate
  compares against the recorded actuals, not the estimates.

## 6. DB seeding plan (R-31-8 — real tables)

**Existing:** `animation_tokens` (an unwired registry to EXTEND, not duplicate — `used_by` is
mostly NULL); `roles` already has `motion`; many `block_attributes` rows carry `role='motion'`;
`css_property` already uses the `anim:*` pseudo-namespace
(`anim:duration|easing|preset|parallax|stagger|trigger`); `preset_implications`
(`effectHover`, 6 values + implied properties) is the registry-shape precedent. **Genuine
gaps:** no motion capability in `block_capabilities`; no motion `modifier_suffixes`;
`design_tokens.token_type` CHECK (`colour|font|spacing|size|shadow`) blocks motion tokens
without a migration. **Out of scope:** the uimax `animations` table lives in a DIFFERENT DB
(not `sgs-framework.db`) — never cited as seedable here (P-CP-3 caveat). Schema check:
`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`.

Seeding (all via an idempotent editorial seeder `scripts/seed-motion-fx-registry.py`, modelled
on `seed-composition-roles.py` — [ok]/[skip]/[set] passes, docstring changelog, plus a
`db-consistency/check_motion_fx_reseed.py` guard so the seed survives `/sgs-update` rebuilds):

1. **Effect registry** — new table `fx_effects` (`effect` PK e.g. `pin-scrub`, `tier` V|G,
   `plugin_set` JSON, `owns_scroll_transform` 0|1 → drives §4.3 exclusion, `reduced_motion`
   suppress|simplify, `editor_story` end-state|toggle|no-preview). Proposed NEW table —
   justified because no existing table keys by effect; `animation_tokens` keys by keyframe
   preset and stays the Tier V preset store.

   > The table also carries an `effect='scroll-smoother'`, `tier='H'`, `scope='site'`,
   > `plugin_set=[]` row (check:
   > `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT effect,tier,scope,plugin_set FROM fx_effects WHERE effect='scroll-smoother'"`).
   > ⛔ **Never delete it** (`DELETE FROM fx_effects WHERE effect = 'scroll-smoother';`). Its
   > `scope='site'` is a load-bearing NEGATIVE PROOF: it demonstrates by construction that a
   > site-scoped effect is structurally excluded from every block panel, which is the row's own
   > acceptance test. A row whose job is to be excluded looks exactly like a dead row to anything
   > that only counts consumers. Lenis is a SITE setting, never reached via the `data-sgs-fx`
   > grammar, so it has no per-element `fx_effects` row of its own. No live consumer
   > (`generate-fx-qualifying-blocks.py`'s structural roster, `fx.js`'s `SHIPPED_EFFECTS`,
   > `fx-attributes.php`'s `FX_ATTR_MAP`) references this row.
2. **`block_attributes`** — fx param attrs seeded with `css_property` under a new **`fx:*`**
   pseudo-namespace (sibling of `anim:*`; aligns with the approved-unbuilt FR-35-6 `anim:*`
   settings-cluster — the `fx` cluster registers alongside it, never replacing it).
3. **`block_capabilities`** — new capability values `fx-scrub`, `fx-draggable`, `fx-flip`,
   `fx-svg` seeded from `supports.sgs.fx.*` declarations by `/sgs-update` (source-derived, so
   this part lives in the update populator, not the editorial seeder).
4. **`modifier_suffixes`** — no new rows in v1 (fx params are base-tier; a per-tier fx value is
   a v2 candidate and would use the EXISTING breakpoint suffixes — never a new vocabulary).
5. **`animation_tokens`** — reconcile the store: add the missing `fade-up` row (used as a
   default by 10 blocks but absent), wire `used_by`, and record that Tier G does NOT read this
   table (it is the Tier V preset store).
6. **`design_tokens.token_type` migration** — widen the CHECK to admit `motion`
   (duration/easing tokens) via `migrations/YYYY-MM-DD-motion-token-type.py`; deferred until a
   seeded motion token is first needed (theme.json `--wp--custom--duration/easing--*` already
   serve).

> **The fx-qualifying roster is JS-only.** `src/blocks/extensions/generated-fx-qualifying-blocks.json`
> gates which effects appear in a given block's editor picker (§7) — `fx.js` imports it. There is
> no PHP twin: `class-sgs-motion-registry.php` (the FR-38-3 conditional-loading registry, §4.4)
> detects effects by regex-scanning rendered markup for `data-sgs-fx="…"`
> (`/data-sgs-fx="([a-z0-9-]+)"/i`), never by consulting a per-block structural-qualification map.
> The generator (`generate-fx-qualifying-blocks.py`) outputs the JSON artefact only, and
> `check_fx_qualifying_blocks_stale.py` verifies it.

## 7. Inspector surface (Spec 35-compliant sketches)

Binding: ToolsPanel once ~6+ controls (Part A5); never duplicate a native supports panel (A6);
`hideExtensions` opt-out honoured (A7); 768/1024 tiers only where responsive (D2);
reduced-motion gate day-one (E5/Part C, and Spec 35A Part L); the FAIL-CLOSED gate
`plugins/sgs-blocks/scripts/inspector-scan/rules/17-reduced-motion-gate.js` covers every new
panel automatically.

- **Block-level fx panel ("Scroll & effects")** — ONE collapsed panel in the Styles tab,
  ToolsPanel-based: effect picker (`ToggleGroupControl`/`ComboboxControl` per §35A Part H),
  then per-effect params as `ToolsPanelItem`s (1–3 `isShownByDefault`, rest behind "+"),
  each with reset. Scrub params: start/end (`UnitControl` viewport %), scrub smoothing
  (`RangeControl` with input+reset), stagger (`UnitControl` ms). The §4.3 Notice renders here.
- **SplitText** — on text-bearing blocks inside the same fx panel: split-by
  (`ToggleGroupControl` char/word/line), mask toggle, stagger, delay.
- **Draggable** — roster blocks only (capability-gated): enable toggle, inertia toggle, axis
  (`ToggleGroupControl` x/y/both), bounds preset.
- **Flip pairing** — surfaced on BOTH paired blocks as one toggle each ("Animate re-filtering")
  + duration/easing on the grid side; a Notice names the paired partner when only one side is
  present.
- **Site level (smooth scrolling + page transitions)** — SGS settings surface (theme settings
  page / Site Editor panel), NOT block inspectors: smooth scrolling on/off + strength
  (`RangeControl`), transitions on/off + style per template. Both carry inline help naming
  their §4 conditions (sticky, reduced-motion, editor-off).
- **MorphSVG** — asset-gated: the panel renders `Disabled` with guidance-linked help text
  until both path assets are present.

## 8. Blast radius + regression gates

- **Shared infrastructure + scroll core + SplitText** — the registry/loader (FR-38-3), gsap
  module registration + webpack externals, the `src/shared/effects/gsap/` provider (FR-38-2),
  the `data-sgs-fx` grammar + DB seeding (FR-38-4/23), the entrance-exclusivity rule (FR-38-5),
  pin+scrub (FR-38-6), element timelines (FR-38-7), horizontal panel (FR-38-8), SplitText
  (FR-38-10), and canaries (FR-38-24). **Blast radius: ADDITIVE ONLY** — no existing Tier V
  system, shipped block, or template is modified; the only shared-file touches are the new
  registry include + webpack externals.
- **Site level: smooth scrolling (Tier H) + page transitions** — FR-38-18 (Lenis), FR-38-19
  (cross-document View Transitions). **Blast radius: additive** — one script module + one
  stylesheet + one settings page, plus template-level `@view-transition` CSS for FR-38-19; it
  touches neither the Spec 37 header system nor any theme template.
- **Interaction + SVG + toys** — Draggable roster (FR-38-13) incl. `sgs/before-after`, Flip
  pairing (FR-38-12), DrawSVG (FR-38-15), MorphSVG (FR-38-16), MotionPath
  (FR-38-17), ScrambleText (FR-38-11), `sgs/image-sequence` + asset-pipeline tooling (FR-38-9,
  `scripts/image-sequence-prep.py`). Stretch: Tier V asset migration onto the registry
  (FR-38-24). **Blast radius: per-block.** The two shipped-block touches (pairing contract;
  responsive-logo runtime swap) each get a before/after live check; everything else is new
  blocks/modules.

**The FR-37-40 regression gate for smooth scrolling.** Smoothing changes scroll TIMING, and
shrink / hide-on-scroll / row-collapse / the transparent flip are all driven by scroll
listeners, so they must be observed with the setting OFF **and** ON — pinned-gate, shrink,
hide-on-scroll, transparent, **row collapse** (it rides the same `isHeaderPinned()` gate),
scroll-padding, plus two named sub-cases: sticky+transparent same-tier coexistence and the
nav-drawer `<dialog>`-in-header offset. Also required: iframe interactivity at rest and
mid-scroll on a page carrying an `sgs/media` embed (§3.5 condition f), and touch scrolling
verified native on a real narrow viewport (condition d). **Do not drop this gate on the grounds
that "nothing touches the header now" — that is the argument, not the evidence.**

- **Sticky + transparent on the same tier.** With smoothing ON the header holds `top: 0` and
  `position: sticky` — including mid-flight — while the transparent row's background ramps
  and returns cleanly to transparent at the top; `--sgs-header-height` stays steady.
  Non-vacuous only while `lenis-smooth` is confirmed active throughout.
- **Nav-drawer `<dialog>` × transformed ancestor.** The drawer's parent chain is `BODY → HTML`
  — it is **not a header descendant at all**, so a header transform can never reach it, and a
  test using one is vacuous by construction. Against a genuine ancestor (`body`) with a
  negative control, an ordinary `position: fixed` probe moves −80px while the open `<dialog>`
  moves 0: top-layer resolution against the viewport is confirmed empirically. If a future
  build nests the drawer inside the header, the ancestry premise changes and this must be
  re-read.

## 9. Editor canvas story (per effect)

| Effect | Canvas shows |
|---|---|
| Pin+scrub, element scrub, horizontal panel | **Static end-state** (timeline at progress=1) + panel Notice "Scroll effects preview on the live site" (parallax-Notice precedent) |
| Image sequence | Poster frame + Notice |
| SplitText / ScrambleText | Plain (unsplit) text; optional **preview toggle** replays the reveal once in-canvas (no scroll needed — time-based preview) |
| Flip | Labelled no-preview (filter interaction doesn't exist in-canvas); Notice names the pairing |
| Draggable | Static; Notice "Drag interactions are live-site only" |
| DrawSVG / MorphSVG / MotionPath | End-state (fully drawn / final shape / resting position); optional replay toggle for load-triggered draw |
| Physics/Custom easings | No standalone canvas story — a flavour; inherits its host effect's row |
| Surface treatment (FR-38-29, Tier W) | **The untreated image**, plus a panel Notice: *"Surface treatments preview on the live site. Visitors without WebGL see the original image."* The render layer's editor-parity guard deliberately does not stamp during a ServerSideRender/REST render (there is no `wp_footer` and no module graph in that context to boot a canvas against), so the editor canvas shows exactly what a no-WebGL visitor sees — which is the honest preview, not a blank. ⚠ The client therefore picks a treatment they cannot see applied until they publish; the thumbnails in the picker exist to carry that choice. |
| Smooth scrolling (Lenis) / page transitions | **Never active in editor or wp-admin** (FR-38-18/19 condition) — settings-surface help text states it |
| Cursor-reactive field (FR-38-25) | **Nothing.** The editor canvas iframe carries no `data-sgs-cursor-field` attributes and none of the fx stylesheets: `sgs/container` renders through `edit.js` in the editor, not `render.php`, so the render-layer stamp never runs and there is no SSR markup in the canvas to carry the resting field. A client picks a look from the dropdown and sees no change, so an info Notice ships in the fx panel naming the limit and pointing at View Page (parallax + surface-treatment precedent). |
| Carousel loop (FR-38-26) | **The un-looped track.** Cloning of leading/trailing items happens in the block's frontend `view.js`; the canvas shows the real items only, which is also exactly what a no-JS visitor sees. ⚠ *Reasoned, not observed.* |
| Physics canvas (FR-38-27) | **Children static in their authored positions** — the same state reduced motion produces (§10). Draggable/Inertia/Physics2D are frontend-only. ⚠ *Reasoned, not observed.* |
| Magnetic pull (FR-38-30) | **Static — no displacement.** The element renders undisplaced, exactly the no-JS/reduce state; a document-level listener drives the effect, and the editor canvas is an iframe the `sgs/nav-bar-menu` `magnet.js` precedent already never runs pointer tracking inside. Notice: "Magnetic pull previews on the live site." ⚠ *Reasoned by mechanism, not observed in-editor.* |
| Flowing gradient (FR-38-31, Tier W) | **The CSS fallback layer**, exactly what a no-WebGL visitor sees on the frontend — the render layer's editor-parity guard does not boot a canvas WebGL context in a ServerSideRender/REST render (same reasoning as the surface-treatment row above), so the canvas shows the honest degraded state rather than a blank. A panel Notice names this: *"The flowing gradient previews on the live site. Visitors without WebGL, and the editor canvas, see the static fallback."* |
| Progress connector (FR-38-35) | **The connector at rest — drawn, but not filling.** The canvas shows the SVG in place with progress at its `initial-value: 0`; neither driver runs in-canvas (the native one needs a real scroll timeline the editor iframe does not provide, and `view.js` is frontend-only — the magnet/trail precedent). The `ToggleControl`'s own help text names the limit: *“Previews on the live site only.”* ⚠ *Reasoned by mechanism; the editor has been observed for CONTROL PRESENCE only — the resting-state appearance in-canvas has not had Bean's eye (R-31-13).* |
| Cursor grid-dot field (FR-38-33) | **A static resting lattice** — the CSS radial-gradient preview shows the dots at rest in their grid, not a live effect. **NOT a live preview:** the render filter that produces the live tracking canvas never runs in the editor (the magnet/trail precedent), so the pointer-lean/ease-back behaviour is invisible in-canvas; only the resting grid is honest to show. |
| Particle trail (FR-38-32) | **Nothing — an empty canvas.** The trail only exists while a pointer moves, and the editor canvas is an iframe the document-level listener does not drive (the magnet precedent). A panel Notice names it: *"The trail previews on the live site only — the editor canvas cannot follow a pointer. Use View Page to feel it."* Editor controls: the effect picker lists **Particle trail**; **Style** shows all three presets in plain English ("Sparks — a fading trail", "Gravity dots — drift down and settle", "Ripple — expanding rings"); **Density** and **Size** sit behind the ToolsPanel menu alongside Reset all; a bundle notice reads "about 8 KB of scroll-effect code (budget: 50 KB)". The panel is a ToolsPanel in the **Styles** tab, so a `PanelBody`-only selector reports it ABSENT. ⛔ **Verification covers the EDITOR SURFACE only** — the picker, presets and Notice render without error. The frontend trail's visual quality and legibility has not had Bean's eye per R-31-13; that remains an OPEN verification item. |

## 10. Reduced-motion contract (per effect)

Canonical check: `prefersReducedMotion()` LIVE per call + `gsap.matchMedia` registration gate
(mid-session change kills/reverts tweens). CSS kill-switches per the existing house pattern.

| Effect | Behaviour under reduce |
|---|---|
| Pin+scrub section timeline | **Simplify:** no pin, no scrub; content renders at end-state in normal flow |
| Element scrub timelines | **Simplify:** end-state, static |
| Horizontal scroll panel | **Simplify:** falls back to native horizontal scroll-snap (content reachable, nothing moves by itself) |
| Image sequence | **Simplify:** poster/final frame only |
| SplitText | **Simplify:** no split/mask; whole-element plain fade at most, else static |
| ScrambleText | **Suppress:** plain text, no scramble ever |
| Flip | **Suppress:** instant re-layout (today's behaviour) |
| Draggable/Inertia | **Simplify:** drag still works (it is user-driven input, not autonomous motion) but momentum/physics release is off; snap is instant |
| Physics easings | Follow their host effect's row |
| DrawSVG | **Simplify:** rendered fully drawn (no animated stroke) |
| MorphSVG | **Suppress:** final shape only |
| MotionPath | **Suppress:** rests at the client-chosen resting position (CSS applies `--sgs-fx-motion-path-rest-y` unconditionally under `prefers-reduced-motion: reduce`, the same custom property the normal-motion handoff uses) |
| Smooth scrolling (Lenis, Tier H) | **Suppress:** native scroll. Live AND reactive — the instance is destroyed on a mid-session change to `reduce`, and rebuilt on a change back (FR-38-18 condition b) |
| Page transitions | **Suppress:** instant navigation |
| Cursor-reactive field (FR-38-25) | **Simplify:** the emitted field itself has no per-frame animated motion to gate — it is an rAF-throttled custom-property WRITE tracking the pointer, not a tween — so the participant CSS renders identically; the only thing genuinely gated is whatever CSS transition a field TYPE's own implementation attaches, unchanged by this FR |
| Surface treatment (FR-38-29, Tier W) | **SIMPLIFY — settle immediately at the treated state, never suppress the treatment.** Under `reduce` the scroll-resolve driver is not created at all (no `IntersectionObserver`, no scroll listener, no per-frame work): `uResolve` is set to 0 once and the image renders at the treatment's full chosen strength. ⛔ **Note the direction — the reduced-motion state is the TREATED image, not the plain photograph.** Falling back to the untreated photo would strip content the client deliberately configured (`degrade-to-more-content-never-less`); the thing being removed under `reduce` is the *developing*, not the *treatment*. There is deliberately no `@media (prefers-reduced-motion: reduce)` rule in `fx-surface-treatment.css` — the gate is in JS, where the driver lives. |
| Physics canvas (FR-38-27) | **SIMPLIFY — disable the physics, never the content.** Under `reduce` no Draggable/Inertia/Physics2D is created and **the children still render, static, in their authored positions**. "Disables the surface outright" means *disables the motion*, not *removes the content*: hiding decorative children a client placed deliberately would be the `degrade-to-more-content-never-less` failure. ⚠ This reading is flagged for Bean's confirmation. |
| Carousel loop (FR-38-26) | **Suppress-equivalent:** the correction is an instantaneous `scrollLeft` write, never a tween, so there is nothing for `prefers-reduced-motion` to gate directly. The one remaining hardcoded `'smooth'` case (google-reviews autoplay) is correctly gated by an early return. |
| Magnetic pull (FR-38-30) | **SUPPRESS — no listener attaches at all.** Under `reduce`, `fx-magnet.js` never attaches its document-level listener, so the element simply never displaces — this is also the exact no-JS state, so there is one code path, not two that could drift apart. Deliberately differs from cursor-field's SIMPLIFY (§3.3 FR-38-30 body has the full reasoning): a resting cursor-field is a legitimate finished PAINT, but a magnet's "resting" position is just the undisplaced layout position, which is what suppression already produces — there is no separate "simplified but still present" state to build. |
| Flowing gradient (FR-38-31, Tier W) | **SIMPLIFY — draw exactly one frame and stop, never suppress to a blank or to the CSS fallback.** Under `reduce` the renderer initialises, draws a single frame at the current uniform values, and creates no rAF loop — so the section is never blanked and the gradient still reads as a finished, deliberate visual. This is distinct from the SC 2.2.2 Pause control (FR-38-31 body): `prefers-reduced-motion` and the Pause control are two independent answers to two independent requirements, and neither discharges the other. |
| Progress connector (FR-38-35) | **SIMPLIFY — the line renders FULLY FILLED, never empty.** Under `reduce` the block's stylesheet forces `--sgs-timeline-fill-progress: 1` plus `animation: none` (required — an animation outranks a plain declaration in the cascade), and `view.js` returns before attaching a listener. Stated ONCE in the stylesheet rather than in either driver, so it holds identically on both and there is no second code path to drift. ⛔ **Note the direction:** an EMPTY line would misrepresent a journey as not yet begun, and the block's own existing convention is “show the end state, skip the animation” (`view.js` reveals all entries under reduce). This is `degrade-to-more-content-never-less` applied to a progress indicator. Deliberately unlike FR-38-32/33's SUPPRESS: a connector has a legitimate finished state to rest AS, whereas a pointer trail does not. |
| Cursor grid-dot field (FR-38-33) | **SUPPRESS — no instance, no canvas, no listener.** No JS is created under `reduce`; dots resting at cell centres is the same no-JS/reduce state, one code path (the FR-38-32 pattern, measured). |
| Particle trail (FR-38-32) | **SUPPRESS — no listener, no canvas, no pool.** `fx-particles.js::boot` (the `if ( prefersReducedMotion() ) { return; }` gate) returns before anything is created, so the reduced-motion state and the no-JS state are the SAME state and there is one code path, not two that can drift. Deliberately unlike cursor-field's SIMPLIFY: a resting cursor-field is a legitimate finished PAINT, whereas a trail with no pointer has nothing to rest AS. `fx-particles.css` carries a belt-and-braces `display:none` under `reduce` that never fires in normal operation. ⛔ **SC 2.2.2 does NOT engage** — the motion is pointer-initiated and every particle dies within its preset life (0.55s / 1.3s / 0.85s, all far under the five-second threshold), so no Pause control is owed, unlike FR-38-31 which genuinely owed one. |

## 11. Cloning contract — the `data-sgs-fx-*` draft grammar (first home)

### 11.1 Namespace claim

This spec claims **`data-sgs-fx-*`** and
deliberately leaves **`data-sgs-scroll-*` unclaimed**: scroll params are just fx params, and a
second namespace would invent a V-vs-G boundary in markup that does not exist in the model.
In-use namespaces this must not collide with:
`data-sgs-animation*`, `data-sgs-path-draw*`, `data-sgs-parallax`, `data-magnet`,
`data-spotlight`, `data-stagger`, `data-animation` (responsive-logo), and the global CSS
custom property `--sgs-scroll-progress` (set by `assets/js/scroll-progress.js` — there is no
`sgsScrollProgress` block attribute).

### 11.2 Grammar (attr-per-property — converter-suffix-compatible)

```
data-sgs-fx="<effect>"            e.g. pin-scrub | scrub | horizontal-panel | split-reveal |
                                       scramble | flip | draggable | draw | morph | motion-path |
                                       image-sequence | magnet (FR-38-30) |
                                       particles (FR-38-32) |
                                       cursor-grid (FR-38-33) |
                                       particle-repel (FR-38-34 — NOT BUILT)
                                  ⚠ `particle-repel` is a RESERVED NAME, not a shipped effect.
                                    It is listed here because this project's practice is to claim
                                    the grammar slot when the effect is specified, so a draft
                                    author cannot pick a colliding name. No emit path exists.
data-sgs-fx-trigger="<value>"     load | scroll | hover (per-effect enum)
data-sgs-fx-start / -end          scroll range (viewport-relative, e.g. "top 80%")
data-sgs-fx-hold="<value>"        none | short | standard | long — PINNING effects only:
                                  how much of the pin is spent holding the finished
                                  state before releasing (fraction of the pin, not px)
data-sgs-fx-scrub                 true | <smoothing number>
data-sgs-fx-stagger               ms | s
data-sgs-fx-duration / -ease      token or literal (easing may name a physics flavour)
data-sgs-fx-momentum="false"      DRAGGABLE only — opt-out of Inertia's release-momentum
                                  coast (`dragMomentum` block attr → `fx:momentum`, seeded
                                  in `block_attributes`; live on buybox/gallery/
                                  google-reviews/post-grid/trustpilot-reviews render.php,
                                  read by `fx-draggable.js`'s `momentumRequested()`).
                                  Attribute PRESENT AT ALL is the "off" signal — no
                                  attribute (the default) means momentum is ON; this is
                                  the inverse of every other boolean fx flag in this
                                  grammar, and is unusual enough to flag explicitly for
                                  a future converter mapping.
data-sgs-fx-shape="<preset|custom>"     MORPH only — which shape pair to morph between
data-sgs-fx-path="<preset|custom>"      MOTION-PATH only — which route to travel along
data-sgs-fx-motion-path-rest="<preset>"     MOTION-PATH only — below-header | middle |
                                             lower-third | custom (unset = middle)
data-sgs-fx-motion-path-rest-vh="<0-100>"   MOTION-PATH only — 5vh-stepped fine-tune, CUSTOM
                                             preset only
data-sgs-fx-morph-target="<selector>"       resolved TARGET element (render-layer output)
data-sgs-fx-motion-path-target="<selector>" resolved TARGET element (render-layer output)
data-sgs-fx-pin="true"            IMAGE-SEQUENCE only — holds the block in place for the
                                   whole scrub instead of letting it scroll normally
data-sgs-fx-particle-preset="<sparks|gravity-dots|ripple>"
                                         PARTICLES only (FR-38-32) — which trail preset paints;
                                         block attr `fxParticlePreset`
data-sgs-fx-particle-density="<0.25-3>"  PARTICLES only — spawn multiplier; the 150/emitter pool
                                         cap binds regardless; block attr `fxParticleDensity`
data-sgs-fx-particle-size="<0.25-3>"     PARTICLES only — radius multiplier, itself clamped to the
                                         coverage-derived ceiling; block attr `fxParticleSize`
data-sgs-fx-magnet-axis="<x|y|both>"     MAGNET only (FR-38-30) — which axis the pull moves
                                          along; block attr `fxMagnetAxis`
data-sgs-fx-magnet-radius="<px>"         MAGNET only — the proximity radius the pull engages
                                          within, measured to the element's BOX not its
                                          centre; block attr `fxMagnetRadius`
data-sgs-fx-magnet-strength="<0-100>"    MAGNET only — peak displacement at the radius edge,
                                          falling off linearly to zero; block attr
                                          `fxMagnetStrength`
data-sgs-fx-disable-tablet="true" / data-sgs-fx-disable-mobile="true"
                                   ANY fx effect — per-breakpoint kill switch, named with the
                                   existing device-tier suffix vocabulary. Boolean-shaped:
                                   presence means disabled, so `fx-attributes.php` and `fx.js`
                                   both special-case these two outside the generic
                                   value-or-absent FX_ATTR_MAP loop. Block attrs:
                                   `fxDisableTablet` / `fxDisableMobile`.
```

> **`flowing-gradient` (FR-38-31) is deliberately ABSENT from the `data-sgs-fx="<effect>"` enum
> above.** This is consistent with §1.2b's Tier W cloning statement, not an oversight: a Tier W
> effect is "permanently unclonable" from computed CSS and is DECLARED via a BEM signal resolved
> to a block attribute rather than authored through the `data-sgs-fx*` draft grammar — the same
> status `surface-treatment` (FR-38-29) already has, and it is likewise absent from this enum.
> ⚠ The exact BEM signal / block attribute name for `flowing-gradient` is not yet confirmed
> against source; record it here once confirmed rather than guessing a name.

> **`fxPreset` is deliberately NOT part of this grammar.** It is a real, seeded `block_attributes`
> row (`fx:preset`) and a real client-facing control (the §7 intensity-preset layer) — but a
> preset only WRITES the params above into the block's stored attributes at authoring time; no
> runtime ever reads a `data-sgs-fx-preset` markup attribute, so emitting one would put an inert
> attribute in the DOM. Its absence from the grammar table above is not a gap.

**`sgs/image-sequence` scrub window and pin.**

1. **Scrub only while the canvas is fully on screen, by default.** `fx-image-sequence.js`
   anchors `start`/`end` to live-measured element-edge-vs-viewport-edge positions (block bottom
   vs viewport bottom; block top vs the header-cleared viewport top) rather than any fixed
   percentage or distance — see `computeVisibilityWindow()` in that file for the derivation,
   including the taller-than-viewport fallback (the window during which the viewport is fully
   contained in the block, since true full-visibility is geometrically impossible there).
   `data-sgs-fx-start`/`-end` override this per instance.
2. **Pinning is a first-class inspector toggle**, not a composition workaround. `fxPin` (block
   attribute, boolean, default `false`) emits `data-sgs-fx-pin="true"` on the canvas;
   `fx-image-sequence.js` reads it and pins its own trigger element (no extra wrapper markup) for
   the resolved scroll distance. Pin OFF leaves no pin-spacer or repositioning behind
   (`ScrollTrigger.kill(true, false)` on cleanup/teardown).

`fxPin` is seeded in `block_attributes` under `fx:*` alongside the other `fx*` attrs (§11.3).

**The morph / motion-path control surface — presets first, custom asset behind "Advanced".**

`fx-morph.js` and `fx-motion-path.js` each resolve a CSS SELECTOR (`data-sgs-fx-morph-target` /
`-motion-path-target`) to an element and read its geometry. A CSS-selector textbox is unusable by
a tech-illiterate client, which is why §7 requires an ASSET-GATED picker with authoring guidance
rather than a bare toggle. The shape is:

- `data-sgs-fx-shape` / `data-sgs-fx-path` name a CURATED PRESET (morph pairs:
  circle↔square, plus↔cross, play↔pause, logo↔icon; paths: arc, S-curve, orbit, figure-8).
  The client picks a THUMBNAIL. Zero asset preparation.
- The value `custom` switches the control to a media-library SVG picker (the
  `sgs/responsive-logo` `svgAnimationSource` precedent — media library only, never inline
  SVG paste, which is an XSS vector).
- The panel stays DISABLED with guidance-linked help text until a preset or asset is
  chosen — §7's asset gate.

Both modules accept "an element in the DOM whose geometry is the target". The preset layer
therefore sits ABOVE that contract: the RENDER LAYER expands a preset key (or an uploaded asset)
into a hidden `<svg>` carrying the path, and emits the existing `-target` selector pointing at
it. `fx-morph.js` and `fx-motion-path.js` need no preset awareness. The two `-target` attributes
are **render-layer OUTPUT, not an authoring surface** — a draft never hand-writes them, and the
cloning contract (§11.3) maps `-shape`/`-path`, never the resolved selector. The
`data-sgs-fx="morph"` marker sits on the inner `<path>`, not the `<svg>` wrapper, because
MorphSVGPlugin refuses an `<svg>` container outright.

Both layers are needed: a media-library picker ALONE works only for someone who already has
matched-topology SVGs; presets ALONE put a fixed ceiling on a framework meant to clone arbitrary
drafts; a CSS-selector textbox fails §7.

**Status: BUILT.** The preset data files (`includes/fx-path-routes.json`,
`includes/fx-shape-routes.json`), the render-layer expansion (`includes/fx-path-routes.php`,
`includes/fx-shape-routes.php`), the `block_attributes` rows under `fx:*` (`fxPath`,
`fxPathAsset`, `fxPathRotate`, `fxPathRest`, `fxPathRestVh`, `fxShape`, `fxShapeAssetFrom`,
`fxShapeAssetTo`), the thumbnail pickers in the fx panel (`fx.js` — `ToolsPanelItem` +
`ToggleGroupControl` + `RouteOption` thumbnails for both routes and shape pairs, asset-gated
media-library pickers for `custom`), and both `motion-path` and `morph` present in
`SHIPPED_EFFECTS`. These attrs are registered via the block-editor `registerBlockType` filter in
`src/blocks/extensions/fx.js`, not declared per block in any `block.json`.

One effect per element in v1 (a draft needing two composes wrapper elements). Attr-per-property
(NOT a JSON blob) because: the Spec 31 suffix grammar clones it (base attr + suffix — the same
`{base}{Param}` shape as tiers/states, §3.A steps 4/4a); the registry's render-time sniff is a
cheap prefix scan; pattern authors can hand-write it.

### 11.3 Converter mapping (defined; the lift is NOT BUILT)

Each `data-sgs-fx*` attr maps 1:1 to a block fx attr (`fx`, `fxTrigger`, `fxStart`, `fxEnd`,
`fxHold`, `fxScrub`, `fxStagger`, `fxDuration`, `fxEase`, `fxPin`, `fxShape`, `fxPath`,
`fxParticlePreset`, `fxParticleDensity`, `fxParticleSize`,
`fxMagnetAxis`, `fxMagnetRadius`, `fxMagnetStrength` — seeded in `block_attributes` under `fx:*`,
§6.2). `fxPin` is IMAGE-SEQUENCE-only. `fxMagnetAxis`/`fxMagnetRadius`/
`fxMagnetStrength` are MAGNET-only (FR-38-30).

These attrs are seeded in `block_attributes` under `fx:*` — verify with
`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT DISTINCT attr_name FROM block_attributes WHERE attr_name LIKE 'fx%'"`.
They are registered through the `registerBlockType` filter in `src/blocks/extensions/fx.js`, not
declared per block in any `block.json`, so a `grep` for `fxShape` / `fxPath` across `block.json`
files finds nothing and looks like an absence; the `block_attributes` query is the authority.

`fxHold` / `data-sgs-fx-hold` is the dwell on PINNING effects. GSAP provides no dwell — a pin
lasts exactly as long as `end` and `scrub` stretches the timeline across all of it — so a hold
exists only where the timeline deliberately leaves room. It is implemented as trailing dead time
on the timeline rather than a longer `end`, because lengthening the pin would also slow every
child's entrance, changing the choreography's feel in order to fix its ending. Default
`standard` = 33% of the pin. It applies to PINNING effects only (`fx_effects.pins = 1`); a
non-pinning effect has no "afterwards" to hold.

The converter lift is an extension of the Spec 31 §3.A dispatch (a routing-unit class alongside
CSS decls + content), mapped to a named later stage — NOT BUILT. **Skip-with-reason (Rule 4):**
an unrecognised `data-sgs-fx` value, an fx on an element whose resolved block declares no fx
attrs, or a param outside its enum is reported per class in the conversion report
(`skipped: fx <value> — <reason>`) — never silent, never coerced.

### 11.4 Draft-authoring note

`/uimax` draft vocabulary gains the fx grammar so Bean-controlled drafts can declare motion
intent from day one; live-scrape ingestion NEVER emits fx attrs (motion intent cannot be
reliably inferred from scraped JS — an inferred effect is a guess, and guesses are banned).

## 12. Dependencies + related docs

- **Shared speed-curve list:** `plugins/sgs-blocks/includes/helpers-motion-easing.php::sgs_motion_easing_css`
  (editor `plugins/sgs-blocks/src/components/MotionEasingControl.js`) is the one named-easing vocabulary
  for block-owned transitions and keyframes (the burger morph, the drawer and the menu panels, Spec 36
  "Motion"). A new block-owned motion control reads it rather than defining its own curve list.
- **Runtime dependency:** `src/shared/effects/` house contracts (motion-utils LIVE
  reduced-motion check, shared rAF budget, init→cleanup, fail-open). The mega-panel effects are
  live-proven. Row-collapse reduced motion is measured by the repeatable probe
  `scripts/motion-qa/probe-row-collapse-reduced-motion.mjs`:

  | arm | `transitionDuration` | collapsed | inline `block-size` during | after restore |
  |---|---|---|---|---|
  | no-preference | `0.2s` ×5 | yes | `0px` | **`(none)`** |
  | `reduce` | **`1e-05s`** | yes | `0px` | **`(none)`** |

  The chain is: the reduced-motion CSS strips the transition, so `transitionMs()` returns ~0, so
  the cleanup timer fires early, so the transient inline height is CLEARED instead of awaiting a
  `transitionend` that never fires.
  ⭐ **The `reduce` arm still collapses, and that is the pass condition, not a defect** — reduced
  motion removes the ANIMATION, never the BEHAVIOUR. A run where `reduce` failed to collapse would
  be the regression.

  ⛔ **A header probe must target the pattern, not the stored template part:** `parts/header.html`
  is a one-line `wp:pattern` reference, so the rendered header comes from
  `theme/sgs-theme/patterns/framework-header-default.php`. Editing the stored template part does
  not change what renders.
- **Spec 31** — cloning contract extension point (§11.3); "Tier 1/2" naming collision avoided
  (§1.5). **Spec 32** — no-inline contract binds all fx CSS output. **Spec 35** — inspector
  standard (§7); `fx` settings-cluster registers alongside the approved-unbuilt FR-35-6
  `anim:*` cluster. **Spec 37** — this spec proposes no change to the header system; Spec 37
  FR-37-40 is untouched, and its live verification is a regression check against changed scroll
  timing.
- **npm dependencies introduced by this spec:** `gsap` (Tier G) and `lenis` (Tier H).
  Both npm-bundled, never CDN, both conditionally loaded so a page using neither ships zero
  bytes of either.
 **Spec 02 §Animation** — the Tier V baseline this spec bounds (its performance budget
  unchanged; parallax shipped).
- **Parking:** P-TIMELINE-ADVANCED-VISUAL-EFFECTS (first
  ScrollTrigger-scrub client use-case — the `sgs/timeline` progressive fill lands as an
  FR-38-7 consumer), P-NO-INLINE-GATE-COVERAGE-GAPS (FR-38-24 canary obligation),
  P-DRAWER-BURGER-MORPH-SYNC + P-DRAWER-TRIGGER-ANCHOR-JS (out of scope, Tier V).
- **Policy:** no block version bumps and no `deprecated.js` before production.
