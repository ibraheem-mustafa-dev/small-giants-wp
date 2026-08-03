# Turning a shader effect into a WordPress-block authoring surface

**Date:** 2026-08-02
**Question:** how do people expose a WebGL/shader effect as sliders + colour pickers for a
non-technical client, and can that be done inside the SGS block editor?

## 1. Uniform-driven shader systems — the pattern DOES exist, and it maps directly

The core building block Bean needs is: **a shader that declares its tunable knobs as typed,
ranged data rather than hardcoded GLSL constants.** This is a well-established convention, not
something to invent.

- **[gl-transitions/gl-transitions](https://github.com/gl-transitions/gl-transitions)** (2,100+
  stars, MIT). Every transition is a `.glsl` file with a header comment block declaring
  `uniform` params (float/int/bool/vec/mat) plus a **default value** per param
  ([README](https://github.com/gl-transitions/gl-transitions/blob/master/README.md)). The repo
  ships a companion `transitions.json` manifest
  ([gre/glsl-transitions transitions.json](https://github.com/gre/glsl-transitions/blob/master/transitions.json))
  listing each transition's name, GLSL source, and `defaultParams` object — i.e. exactly the
  "JSON of uniforms with types/ranges/defaults" shape you asked about, already battle-tested
  across dozens of consuming players (video editors, slideshow tools). Standard uniforms
  `progress` (0→1) and `ratio` are conventionally excluded from the user-facing param list since
  they're driven by the transition engine, not the author.
- **[szymonkaliski/glsl-auto-ui](https://github.com/szymonkaliski/glsl-auto-ui)** — parses a
  shader's uniform declarations and auto-generates a dat.GUI panel from them; proves the
  "shader source → GUI controls" step is mechanical once uniforms are declared with type +
  range comments.
- **[williammanco/uniforms-gui](https://github.com/williammanco/uniforms-gui)** — same idea for
  a Three.js `Material`: walks `material.uniforms`, infers control type (checkbox for bool,
  slider for float, colour-picker for vec3-as-colour) and builds the GUI.
- **[lil-gui](https://github.com/georgealways/lil-gui)** (dat.GUI's modern drop-in replacement,
  MIT, ~13KB) — the manual pattern these auto-tools wrap:
  `gui.add(uniforms.strength, 'value', 0, 1)`, `gui.addColor(...)`. This is the shape you'd
  reproduce as WP `RangeControl`/`ColorPicker` inspector controls.

**Verdict for Bean:** this is the right shape to copy, not to invent. A shader-effect block
should declare its uniforms as a manifest — `{name, type: float|color|vec2|bool, min, max, step,
default, label}` — stored as **block attributes** (per the project's existing
`block_attributes` DB-driven pattern), and the inspector panel is a thin generic renderer over
that manifest: `RangeControl` for float/int, `ColorPicker` for colour uniforms,
`ToggleControl` for bool, a 2-up `RangeControl` pair or a custom XY pad for vec2 (direction/
position). This is a **direct extension of the existing `block_attributes.css_property`-style
DB routing** already used in the framework — the uniform manifest is just another typed
attribute family, gated the same way `box_family` gates padding/margin. No new architectural
concept is required.

**Preset layer:** gl-transitions itself demonstrates presets-as-data (one shader, many named
variants purely from different `defaultParams`). This maps 1:1 onto SGS's existing
`variant_slots` / `blocks.variant_attr` mechanism — "ripple", "smoke", "brick reveal" become
named rows with a stored uniform-value blob, exactly like an SGS block variant is a named
discriminating-slot set today. **No new mechanism needed — reuse the variant system.**

## 2. No-code / CMS prior art — thin, and mostly single-shader plugins, not systems

- **[ZebraNorth/display-webgl-shader](https://github.com/ZebraNorth/display-webgl-shader)** — a
  small (1-star, last updated 2022, unlicensed on GitHub — check `readme.txt` for the actual WP
  licence before using any code) WordPress block plugin that renders a Shadertoy-compatible
  shader in a block. Useful as a *reference for the render.php + block.json shape of "one WebGL
  canvas block"*, but it does not solve the authoring-surface problem — it exposes raw GLSL
  paste-in, not sliders. This is evidence that **nobody has built the parameterised-uniform +
  inspector-control bridge for WordPress** — it's a gap, not a solved problem.
- **AnimateGL** (wordpress.org plugin) takes a different, non-shader-native approach: it
  rasterises the DOM element via `html2canvas.js` then runs a GLSL post-effect over the bitmap,
  with entrance-animation type/direction/distance/delay/duration/easing exposed as inspector
  controls. This is architecturally the closest thing to "non-technical client tunes a shader
  effect via block controls" that exists in the WordPress ecosystem today, but it's a
  DOM-to-texture animation trick, not a general shader-uniform system, and the html2canvas
  rasterise-then-shade approach is exactly the kind of hack this project's rules would reject
  (extra dependency, DOM screenshot round-trip, not the "native uniform → attribute → control"
  path).
- **Webflow/Framer WebGL integrations** (Shader Flow, Bitspace, Alma.sh — found via Framer's own
  marketplace) are Framer-plugin-scoped, closed-source, and not portable prior art for a
  self-hosted WP framework; they confirm demand for "shader effects, client-tunable" exists
  commercially but give no reusable code pattern.

**Conclusion for §2/§3: nothing good exists to adopt wholesale. Build the manifest→inspector
bridge yourself using the gl-transitions/lil-gui pattern as the reference shape** — this is a
genuine "build it, there's a real gap" finding, not a discouraging one: the pattern to copy
is proven, just not packaged for WordPress by anyone.

## 3. Rive/Spline as an alternative to authoring shaders at all

**Rive — assessed honestly, and it's a strong candidate for the "interaction" half of the
brief (not the "background shader" half).**

- **Licence:** Rive's runtimes are MIT-licensed, free for commercial use, attribution required
  (standard MIT notice-preservation, no royalty). ([rive.app/docs/runtimes/getting-started](https://rive.app/docs/runtimes/getting-started))
- **Bundle / npm:** ships as `@rive-app/canvas`, `@rive-app/webgl`, `@rive-app/webgl2`, and a
  `lite` variant per surface, explicitly so a consumer can pick the smallest runtime for their
  needs rather than pull the full WebGL2 renderer — this is npm-installable and tree-shakeable,
  **satisfies the "npm-bundled, never CDN" rule** directly. (Could not get a live gzip figure
  from Bundlephobia in this pass — verify with `npx bundlephobia @rive-app/canvas` before
  committing to a size budget line; historically the canvas-only build has been reported in the
  30-60KB gzipped range by third parties, but that number is NOT independently confirmed here —
  treat it as unverified until measured.)
- **Authoring model:** a designer builds the whole animation/interaction visually in the Rive
  editor (state machine, timelines, artboards) and exports a single `.riv` binary. The **client**
  then only touches **Inputs** — booleans, triggers, numbers — which are the documented, stable
  contract between designer and developer
  ([help.rive.app/editor/state-machine/inputs](https://help.rive.app/editor/state-machine/inputs),
  [help.rive.app/runtimes/state-machines](https://help.rive.app/runtimes/state-machines)). Those
  inputs are driven from React/JS code at runtime — i.e. from a WP block's inspector controls,
  exactly the shape Bean needs: "pick which state-machine input this slider/toggle drives."

**Where Rive is a genuine alternative, not a workaround:** for *interaction* design — hover
states, click-triggered transitions, looping idle/active animations, multi-state UI motion — Rive
is a better fit than hand-rolling a shader, because the *whole design* (not just uniform values)
is authored visually by Bean once, and the client's only exposed surface is a small, designer-
curated set of typed Inputs. That is a cleaner non-technical-client story than shader uniforms
ever will be, because Bean controls which inputs exist — the client cannot break the animation,
only retarget it (colour via Rive's runtime colour override APIs, or swap which `.riv` asset is
bound).

**Where Rive is NOT the answer:** for full-canvas generative/procedural background effects
(noise fields, fluid/particle sims, colour-field shaders reacting to scroll/cursor) — the
brief's "shader effect" framing — Rive is the wrong tool; it's a vector/skeletal animation
runtime, not a fragment-shader host. That work stays in the uniform-manifest + GLSL path from
§1.

**Spline** — could not find a usable npm runtime repo via `gh search repos` in this pass (empty
result); Spline's runtime is a hosted-first product (`@splinetool/runtime` on npm, closed-source
core, viewer-style embed). Treat as **unverified / lower priority** — it does not have the same
clear MIT-licensed, npm-native story Rive has, and the brief's no-CDN/bundle-size rule makes an
unverified closed-source runtime a harder sell. **Recommendation: do not adopt Spline without a
dedicated licence + bundle-size check; Rive already covers the "runtime player" use case with a
cleaner licence story.**

**Bottom line on runtime players:** Rive is a **genuine, complementary route** for interaction
design (motion state machines) — worth building a `sgs/rive-embed` block around, gated by Spec
38's Tier H (helper/utility, closed-list) admission test, since it is neither vanilla CSS nor
GSAP. It does **not** replace the shader-uniform system for generative background effects — the
two solve different problems and both are worth having.

## 4. Editor-canvas findings (keeping a WebGL canvas alive across React re-renders / the iframe move)

- WordPress 7.1 makes the post-editor canvas **always iframed**, on every theme, regardless of
  block `apiVersion`
  ([gutenbergtimes.com](https://gutenbergtimes.com/the-post-editor-is-going-full-iframe-what-block-developers-need-to-know-before-wordpress-7-1/),
  tracking issue [WordPress/gutenberg#70743](https://github.com/WordPress/gutenberg/issues/70743)).
  Project's own `CLAUDE.md` already notes both live sites are on WP 7.0.2, with 7.1 landing
  ~19 Aug 2026 — **this is imminent, not theoretical, and directly affects any WebGL block**.
  Practical implication: a block's `Edit` component and its rendered markup now live in
  **different JS realms** (editor chrome outside the iframe, block content inside it). A WebGL
  canvas mounted inside `Edit` must create its GL context *inside that iframe's document*, not
  the parent document — get this wrong and the canvas either never paints in the editor preview
  or leaks a GPU context in the parent frame that never gets torn down.
- No repo was found that documents a general-purpose "WebGL canvas survives Gutenberg
  iframe/remount" recipe — this is a real, currently-unsolved gap for the whole Gutenberg
  ecosystem, not something SGS-specific research missed. The safe, standard React pattern (not
  WP-specific, applies inside the iframe too) is: mount the `<canvas>` once via a stable `ref` +
  `useEffect` with an **empty dependency array**, create the WebGL context once, and update via
  **uniform pushes on prop change** rather than remounting the canvas — never key the canvas
  element on attribute values (that forces remount + full GL-context recreation on every slider
  tweak, which is slow and eventually leaks contexts if the browser's context limit is hit
  before old ones are garbage-collected). Explicitly call `gl.getExtension('WEBGL_lose_context').loseContext()`
  on unmount to force-release the context rather than relying on GC timing — a documented
  browser gotcha with GL contexts generally, not found in a specific citable repo but standard
  WebGL hygiene.
- `ServerSideRender` (already used elsewhere in this codebase per
  `feedback_ssr_fixes_hand_built_preview_drift.md`) is the wrong tool here — a shader canvas is
  inherently client-rendered; SSR would only be useful for a static poster-frame fallback while
  the canvas hydrates, which is worth doing anyway for the no-JS/reduced-motion case.

## 5. What Bean's authoring experience would actually look like

**Changing colours on a shader background block:**
1. Client opens the block, sees an inspector panel with named controls — "Wave colour", "Speed",
   "Ripple strength" — generated automatically from that block's uniform manifest (same as any
   other SGS inspector panel; no shader knowledge required, no code visible anywhere).
2. Each control writes straight to a block attribute (`waveColor`, `speed`, `rippleStrength`)
   exactly like today's colour/typography controls.
3. On attribute change, the mounted canvas pushes new values to the already-running shader via
   `gl.uniform*` calls — the canvas does not remount, so there's no flash/rebuild, it just
   updates live, matching what any other live-preview control in the editor already does.

**Swapping the interaction (e.g. "ripple" → "smoke"):**
1. This is a **variant pick**, not a shader edit — client uses the existing SGS variant selector
   UI (dropdown/swatch picker, same UX as any composite block's variant control today).
2. Picking a variant loads that variant's stored default uniform values into the block's
   attributes (same mechanism as loading a pattern's starting attrs) — client can then still
   nudge colour/speed within that variant afterwards.
3. If the "interaction" is actually a Rive-authored motion (hover/click state change, not a
   background shader), the client instead sees a small set of Rive Inputs surfaced as
   toggles/dropdowns — e.g. "Hover style: Bounce / Glow / None" — which Bean pre-designed the
   full motion for in the Rive editor; the client cannot invent a new motion, only pick among
   the ones Bean authored.

Both paths keep the client entirely inside familiar WordPress block-editor controls — sliders,
colour pickers, dropdowns — with zero GLSL or timeline editing exposed, which is the actual
requirement.

## Recommendation, ranked

1. **Build the uniform-manifest → inspector-control bridge yourself** (gl-transitions'
   `defaultParams` JSON shape + lil-gui's control-type mapping as the reference), stored via the
   existing `block_attributes` DB pattern, presets via existing `variant_slots`. This is the
   only route for true generative shader backgrounds; nothing off-the-shelf solves it for
   WordPress, but the pattern to follow is proven elsewhere.
2. **Add Rive (`@rive-app/canvas`, MIT, npm-installable) as a second, complementary block** for
   authored interaction/motion where Bean designs the whole animation once and exposes only
   Inputs — genuinely easier for clients than shader uniforms, and licence/bundle rules are
   satisfiable. Verify actual gzip size via `bundlephobia` before committing a byte budget.
3. **Do not adopt Spline** without a dedicated follow-up check — unverified licence/bundle
   story, no clear npm-native open runtime found in this pass.
4. **Plan for the WP 7.1 iframe-canvas change now** (imminent per the project's own version
   tracking) — mount the WebGL/Rive canvas inside the iframe's document, never remount on
   attribute change, explicitly release the GL context on unmount.

## Sources
- [gl-transitions/gl-transitions](https://github.com/gl-transitions/gl-transitions) — README, uniform/default-param convention
- [gre/glsl-transitions transitions.json](https://github.com/gre/glsl-transitions/blob/master/transitions.json)
- [szymonkaliski/glsl-auto-ui](https://github.com/szymonkaliski/glsl-auto-ui)
- [williammanco/uniforms-gui](https://github.com/williammanco/uniforms-gui)
- [georgealways/lil-gui](https://github.com/georgealways/lil-gui)
- [ZebraNorth/display-webgl-shader](https://github.com/ZebraNorth/display-webgl-shader)
- [AnimateGL — wordpress.org](https://wordpress.org/plugins/animategl/)
- [Rive runtimes getting started](https://rive.app/docs/runtimes/getting-started)
- [Rive state machines](https://help.rive.app/runtimes/state-machines)
- [Rive inputs](https://help.rive.app/editor/state-machine/inputs)
- [Gutenberg full-iframe editor change — Gutenberg Times](https://gutenbergtimes.com/the-post-editor-is-going-full-iframe-what-block-developers-need-to-know-before-wordpress-7-1/)
- [WordPress/gutenberg#70743 — iframe canvas migration tracking issue](https://github.com/WordPress/gutenberg/issues/70743)
