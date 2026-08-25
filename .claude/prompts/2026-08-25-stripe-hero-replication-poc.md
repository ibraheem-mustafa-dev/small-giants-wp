# Session prompt — replicate stripe.com's hero animation EXACTLY, as a scratch POC

**Invoke `/autopilot` before anything else.**

---

## 0. What this session is, and what it is not

⭐ **THIS IS A SCRATCH / PROOF-OF-CONCEPT BUILD. Bean's explicit framing.** The goal is to
get stripe.com's actual hero animation running locally, exactly, so we can SEE the real
thing working and understand precisely what makes it look expensive. It is a study rig.

**Where it lives:** `.claude/scratch/stripe-hero-poc/` — a standalone folder with an
`index.html` you open directly. **Not** in `plugins/`, **not** in `theme/`, not registered as
a block, not enqueued by anything, not deployed to the canary.

⛔ **Nothing from this POC ships to a client site as-is.** Stripe's shader source and their
`palette.png` are Stripe's assets. In a local study rig that is reverse-engineering, which is
ordinary engineering practice. In a deployed client deliverable it would be commercial use of
their IP, and the liability would sit with Small Giants Studio. Those are different acts, and
this session only does the first. When the POC works, the FOLLOW-ON session reimplements the
technique with our own assets — that is a separate piece of work and is not in scope here.

**Done when:** a local page renders stripe's hero animation, visually indistinguishable from
theirs, and there is a written breakdown of exactly which parts produce the "expensive" look.

---

## 1. Mandatory reading, in this order

1. `.claude/plans/2026-08-24-spec38-motion-register.md` — session-close audit at the top.
2. `.claude/specs/38-SGS-MOTION-SYSTEM.md` **§1.2b (Tier W) and §3.3 FR-38-31 only.** You do
   NOT need the whole spec this session — the POC is outside the plugin and touches no spec
   surface. Read those two sections so you know what FR-38-31 already built and why its look
   was rejected.
3. `plugins/sgs-blocks/src/shared/effects/webgl/wave-gradient.js` — what we built. Read it so
   you can say precisely how stripe's differs, rather than guessing.

**Pre-conditions, in the same command as any commit:**
`git branch --show-current` (expect `main`) and
`grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`.
⚠ The D-ceiling moves constantly — four tracks share this worktree. Re-check immediately
before writing any D reference.

⛔ **The worktree is SHARED.** Commit by exact path, never `git add -A`. Expect `build/` to
vanish under you. A red gate is not necessarily yours — prove it before acting on it.

---

## 2. What we already know — do not re-derive this

Established 2026-08-25 by reading their live site, not by reading tutorials about it.

**The technique every tutorial documents is the WRONG ONE.** `minigl` + the noise-displaced
mesh is stripe.com's hero from roughly 2020-21. Every port, CodePen and blog post describes
that. **It is not what they run now.** We built it faithfully and Bean's verdict was
*"it also looks like B-movie 3D VFX from like the early 2000s"*, which was fair.

**What they actually run today:**

| Fact | Value |
|---|---|
| Canvas | `.hero-wave-animation__canvas`, context **WebGL2** |
| Parent | `.hero-wave-animation__contents.hero-wave-animation--drawn` |
| Size / position | ~1393 x 916 CSS px, offset to the RIGHT (`x ≈ 419`), not full-bleed |
| Fallback | `wave-fallback-desktop.png` — a static image, same fail-open pattern we use |
| Palette | `palette.png`, **480 x 480**, sampled as a TEXTURE |

**The palette is the finding.** It is a hand-painted airbrushed artwork — soft blobs of
peach, coral, magenta, cream and one bruise of periwinkle. Sampled values are almost all
above `0xf0`: `#fee4c4`, `#f6eae5`, `#fdafdc`, `#fca5e8`, `#feb169`. Adjacent warm hues, very
high lightness.

**Their shader samples an image. Ours interpolates four hex codes.** That is why theirs looks
designed and ours looks generated, and no tuning closes it.

**Three design decisions compound it:**
1. **Light ground.** Theirs is bright colour on white. Ours was a near-black navy base.
2. **A bounded shape, not a field.** Theirs is a swooping ribbon with real edges occupying
   part of the layout. Ours is a full-bleed wash with no form.
3. **Text never touches it.** Their headline sits on clean white beside the artwork. Ours put
   text on the gradient, which is also why the contrast was poor.

The fine striations — thin combed lines through the ribbon — also carry a lot of the quality,
and we have not yet established how they are produced. **That is one of this session's
questions, not an assumption.**

**Assets, for reference:**
- Palette: `https://images.stripeassets.com/fzn2n1nzq965/5DrmXrFYpKk43Kj0I1MXQr/287b3c2a13ae8d4d7d0bf8305037de4e/palette.png?fm=png&q=95`
- A local copy already exists at `c:/tmp/sgs/palette.png`.

---

## 3. The work

### Task A — Recover their implementation

`stripe.com/gb` serves **75 script files**; none has an obvious `hero`/`wave` name, so the
animation is inside a bundle. Find it.

Approaches, cheapest first:
1. In Playwright, hook `WebGLRenderingContext.prototype.shaderSource` and
   `WebGL2RenderingContext.prototype.shaderSource` **before** the page runs, and log every
   shader source string. This gives you the vertex and fragment shaders verbatim without
   reading a single line of minified bundle. **Do this first — it is by far the highest
   yield.**
2. Hook `texImage2D` to confirm the palette is uploaded as a texture, and capture its
   parameters (wrap mode, filtering, whether mipmaps are generated). Those parameters matter
   as much as the image.
3. Log the uniform names via `getUniformLocation` / `uniform*` calls to learn what drives it
   (time, resolution, pointer, scroll, seed).
4. Only then, if needed, pull the bundle and search for the shader strings to recover the
   surrounding JS (geometry, draw loop, resize handling).

⚠ **Record what you could NOT recover.** A partial recovery honestly stated is worth more
than a confident guess. If the striations turn out to come from something you cannot see,
say so.

### Task B — Build the POC

`.claude/scratch/stripe-hero-poc/index.html` — a single self-contained page:
- their shaders,
- their palette texture (local copy),
- their geometry and draw loop,
- their layout context: **white page, ribbon offset right, sample headline text on the left**
  — because the surrounding design is part of why it reads as premium, and a ribbon floating
  on grey proves nothing.

**Verify by looking, not by reasoning.** Screenshot it beside a live screenshot of
stripe.com/gb at the same viewport. They should be near-indistinguishable. If they are not,
you have not finished — find the difference and name it.

### Task C — The breakdown (this is the actual deliverable)

Write `.claude/reports/2026-08-25-stripe-hero-anatomy.md` answering:
1. What geometry? Plane, quad, ribbon mesh, something else? How many vertices?
2. How is the ribbon SHAPE produced — geometry, or an alpha mask in the fragment shader?
3. How is the palette sampled? What are the texture coordinates a function of?
4. **What produces the fine striations?** Named specifically.
5. What is animated, and how fast? Which uniforms change per frame?
6. What is the actual per-frame cost — how many pixels, what does the profiler say?
7. ⭐ **Which of these could we reproduce with OUR OWN assets, and which genuinely need an
   artist?** This is the question the follow-on session depends on. Be honest: if the answer
   is "the palette has to be painted", say that plainly.

---

## 4. Method — earned the hard way this week

- **Verify the reference, not just the implementation.** Three Aurora attempts were built
  against a technique documented everywhere as "the Stripe gradient" without anyone opening
  stripe.com to check it was still there. It was not. Screenshot the real thing first.
- **Render it before claiming it.** Every visual claim this week that was reasoned rather
  than rendered turned out wrong — three "seamless by construction" tiling claims, and a
  mesh whose scale was wrong by 4x.
- **An estimate is not an enumeration.** Count things by listing them.
- **Ask the browser, do not reason about specificity.** A CSS bug this week was diagnosed in
  one step by enumerating which rules actually matched; two rounds of reasoning had blamed
  the wrong file.
- **A green gate proves nothing until you have seen it fail.**

---

## 5. Guardrails

⛔ Do NOT add anything to `plugins/` or `theme/` this session. The POC is standalone.
⛔ Do NOT deploy. Nothing here goes near the canary.
⛔ Do NOT modify FR-38-31. The shipped flowing gradient stays exactly as it is until we know
what we are replacing it with.
⛔ Do NOT commit Stripe's assets into `plugins/` or `theme/`. Inside `.claude/scratch/` they
are study material; anywhere else they are a shipped dependency. If in doubt, leave them
untracked and note the download URL in the report.

---

## 6. Tooling

| Use | For |
|---|---|
| `/playwright` | shader interception, live capture, side-by-side comparison |
| `/delegate` | route any dispatch before spawning |
| `/gh-research` | if the bundle proves impenetrable, someone may have documented it |
| `/qc-inline` | before writing the anatomy report, check its claims against what you actually observed |

---

## 7. Definition of done

1. The POC renders, and a side-by-side screenshot against stripe.com is near-indistinguishable.
2. `2026-08-25-stripe-hero-anatomy.md` answers all seven questions in Task C, with ⚠ on
   anything unrecovered.
3. Question 7 has a clear answer, because the follow-on session is scoped from it.
4. Nothing outside `.claude/scratch/` and `.claude/reports/` changed.
