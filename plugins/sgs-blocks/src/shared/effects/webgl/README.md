# SGS Tier W — the WebGL rendering substrate

**Spec 38 §1.2b · D479 · Phase W (2026-08-21)**

This directory is the whole of Tier W. It is a **rendering substrate**, not a library
wrapper and not an effect. Effects live elsewhere (`../surface-treatments/`) and reach the
GPU only through `index.js`.

---

## The contract

```js
initSurface( el, {
  image,      // HTMLImageElement — MUST already be decoded by the caller
  fragment,   // GLSL ES 3.00 fragment shader source (string)
  uniforms,   // { name: value } initial uniform values
  onLost,     // optional () => void — see contract 2. Fired when the GPU
              // context is lost and NOT restored within the grace window,
              // after this module has removed its own canvas. The caller
              // MUST use it to restore whatever it hid.
} ) -> { setUniform( name, value ), redraw(), destroy() } | null
```

`el` is the element the canvas is inserted into. `image` is the source texture.

### `initSurface` returns `null`, never throws

It returns `null` when any of these hold:

- WebGL2 is unavailable
- the program fails to **LINK** (compiling is not linking — check `LINK_STATUS`)
- the image is cross-origin and would taint the canvas (`texImage2D` throws `SECURITY_ERR`)
- the element or image has zero size
- the fragment shader fails to compile

**A `null` return IS the fallback signal.** The caller does nothing further, and the
untouched `<img>` — which was never hidden — is already the finished state. There is no
separate fallback path to write, and none to keep in sync.

---

## SINGLE PASS ONLY — read this before adding an effect

One program. One fullscreen quad. One source texture. One draw.

**No framebuffers. No ping-pong. No render targets. No rAF loop.**

If an effect needs any of those, it is **not admissible through this interface**, and the
interface must be re-authored *before* that effect is dispatched.

> This paragraph exists because the first draft of Phase W failed exactly here: it authored
> this single-pass contract and then dispatched a parallel agent to build a multi-pass
> advected-dye fluid simulation against it. Each agent would have passed its own tests; the
> mismatch would have surfaced only at integration. An adversarial council caught it on
> paper. Do not remove this warning — it is the cheapest guard in the directory.

A future multi-pass effect is a **new phase with its own design gate**, and at that point
the pass/FBO machinery is precisely what OGL sells — reopen D479 decision 2 then. The gap
register's verdict on OGL is *"still the Tier W pick"*; this phase departs from it only
because a single-pass shader genuinely does not need 34KB of scene graph.

---

## The three contracts Tier W carries on top of Spec 38 §1.6

**1. Context-loss recovery.**
`webglcontextlost` → `preventDefault()` and stop. `webglcontextrestored` → rebuild the
program, texture and buffers, then redraw. iOS Safari discards the GPU context under memory
pressure; this is the single most-reported WebGL complaint on every major library's issue
tracker.

⚠ **A RESTORE MAY NEVER BE OFFERED, AND THAT IS THE COMMON CASE.** Corrected 2026-08-21
after a pre-merge QC council traced the gap: recovery must NOT depend on
`webglcontextrestored` firing at all, because on the very engine named above it frequently
never does. `onContextLost()` therefore starts a bounded grace timer
(`CONTEXT_RESTORE_GRACE_MS`, 3s); if no restore arrives, it removes the canvas **and calls
`onLost`**.

**Both halves are required.** This module can remove its own canvas, but only the CALLER
knows what it hid — the boot module sets `visibility: hidden` on the `<img>` once the first
draw succeeds. Canvas removal alone would therefore leave a blank slot rather than the
photograph. Never leave a dead rectangle, and never leave a hidden `<img>` under one.

⚠ An earlier draft of this file claimed the `<img>` was *"never hidden, only covered"*,
which would have made recovery free. That was false, and it is exactly the kind of
overstated safety claim that stops the next reader looking.

**2. Explicit GPU disposal.**
Textures, buffers, programs and shaders are **not** garbage-collected like DOM nodes; leaks
compound across navigations. `destroy()` deletes every one and keeps a module-local tally
the probe can assert.

> **Ordering is load-bearing.** Remove both context listeners and set the `destroyed` flag
> **before** calling `loseContext()`. `loseContext()` fires `webglcontextlost`, so without
> the flag `destroy()` races its own loss handler and may schedule a rebuild on a
> torn-down surface. Both handlers early-return on `destroyed`.

**3. Power and thermal awareness.**
Trivially satisfied by this effect family: it draws **once**. There is no loop to pause.
Redraw only on resize (debounced). If a future effect introduces a loop, it must pause
off-screen and on `visibilitychange`, and this section must be rewritten to say so.

---

## Spec 32 — no inline styling

This module writes custom-property **values** only. Not one CSS property declaration. The
canvas is positioned by a rule in `assets/css/fx-surface-treatment.css`. The prebuild gate
`audit-inline-styling.js --check` enforces this and must report zero violations.

---

## The ceiling (§1.2b, "Tier W must never become")

No scene graph. No 3D. No geometry beyond a fullscreen quad. No dependency.

**If `renderer.js` ever needs a matrix stack, it is the wrong file and the effect is the
wrong effect.** three.js is 182KB gzip — 3.6× the entire default page budget — and *"since
we're doing WebGL anyway"* is the single most likely way this budget dies.

---

## Swappability — what is true, and what is not

`renderer.js` is **the only file that may know how pixels reach the screen.** Nothing
outside this directory imports it; QA Gate A greps for exactly that and fails the build if
anything does. That grep is what makes "swappable in one file" a *checked invariant* rather
than a comforting sentence.

⚠ **Stated honestly, because the claim is routinely overstated:** this interface takes raw
GLSL, so it is swappable across WebGL2 libraries (OGL, twgl, regl, picogl) — none of which
we need. It is **not** swappable across a move to **WebGPU/WGSL**, which would rewrite every
shader in `../surface-treatments/`. Current shader count: 3. That is the accepted cost, and
it is recorded rather than discovered later.

---

## Files

| File | Role |
|---|---|
| `index.js` | The public surface. Exports **exactly** `initSurface`. |
| `renderer.js` | The one swappable file. Raw WebGL2. |
| `capability.js` | `probeSurface()` — context + **program link** check, then release. |

`probeSurface()` deliberately does more than "does a WebGL2 context exist". A context can be
created successfully on drivers where a program still fails to link. Checking creation alone
produces a canvas that exists and never paints — indistinguishable from success in every
gate except a pixel read.
