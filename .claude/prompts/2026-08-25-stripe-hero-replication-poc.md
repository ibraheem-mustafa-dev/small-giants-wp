# Session prompt — Stripe hero POC: what remains

Invoke `/autopilot` before anything else.

> **Rewritten 2026-08-25 after the POC session.** Tasks A, B and C from the original prompt are
> CLOSED — the rig is built, verified and QC'd, and the anatomy report answers six of its seven
> questions. Everything below is what is still open, plus what the work newly opened. The original
> task list is gone deliberately: re-running it would repeat a fortnight of finished work.

---

## 0. What is already done — do NOT redo any of this

The rig lives at `.claude/scratch/stripe-hero-poc/` (gitignored). The deliverable is
`.claude/reports/2026-08-25-stripe-hero-anatomy.md`.

- **All 6 GLSL modules recovered** from Stripe's bundle, count-verified against the module-wrapper
  count. three.js pinned to **r179** by hash-matching its shader preamble.
- **The rig renders Stripe's hero at 0.66% mean pixel difference**, bias/noise ratio 0.15, 95.2%
  of pixels within 8/255, against a live capture frozen at the same `u_time`.
- **All 26 mechanisms implemented, 0 gaps.** QC-inline 10/10.
- **Q1–Q5 and Q7 answered.** Q7's headline: **no artist-painted palette is needed** — four
  hue-ADJACENT stops render as premium; the constraint is hue adjacency, not colour count.
- **D783** records the bounded three.js scratch exception (deleted at Gate E).
- `wave-gradient.js`'s false "this is the stripe.com technique" lineage claim is removed.

⛔ **Do not delete `wave-gradient.js`.** Asked and answered: 12 files reference it, it is a live
registered fx effect with 6 client-facing attributes, and it is one of two entries in Spec 38's
CLOSED Tier W list. The LOOK was rejected, not the mechanism. It is the base for the rework.

---

## 1. Mandatory reading, in this order

1. `.claude/reports/2026-08-25-stripe-hero-anatomy.md` — **read the retraction and the two
   correction sections, not just the top.** The document argues with its own earlier conclusions
   twice, and the later sections win.
2. `.claude/scratch/stripe-hero-poc/shaders/MANIFEST.md` — which shader is which, and why the
   extraction count is the gate rather than the regex.
3. `.claude/specs/38-SGS-MOTION-SYSTEM.md` §1.2b (Tier W) + §3.3 FR-38-31.

**Before any commit:** `git branch --show-current` (expect `main`) and re-derive the D-ceiling
with `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
(it was **D784** at the close of the POC session, and it moves constantly — four tracks share
this worktree). Commit by exact path; never `git add -A`.

---

## 2. Two things the POC session proved wrong — do not re-inherit them

**⛔ FR-38-31 does NOT band. The "add a dither" recommendation is WITHDRAWN.** Measured on the
shipped effect with its own default colours: mean run-length **1.19**, 1,034 distinct colours per
scanline. There is nothing for a dither to fix, and `mediump`→`highp` rests on the same dead
premise. Both were reasoned, never observed, and both were wrong.

**⛔ The palette does not need an artist.** Four hue-adjacent stops (307 unique colours, against
Stripe's 82,831) render as premium through the right machinery. Four *complementary* stops produce
a grey band because interpolating complements in RGB passes through grey — the same failure as the
rejected Aurora teal band.

**What is actually wrong with FR-38-31**, from looking at its render: a dark, saturated,
**repetitive full-bleed field of undulating ridges with specular-looking highlights** on near-black
navy. It reads as rendered 3D geometry. The defect is **form and ground**.

---

## 3. Still open — carried from the POC

### 3.1 ⭐ Q6 has no performance number at all
Never measured. Do not let any figure be quoted for it. Structurally it is 33,153 vertices, two
passes, 6 texture samples per pixel in the blur. `chrome-devtools` MCP has
`performance_start_trace` / `performance_stop_trace`; the rig is at
`.claude/scratch/stripe-hero-poc/index.html` and takes `?static&t=<abs>` for a deterministic frame.
This matters because the whole Tier W budget argument is unquantified without it.

### 3.2 The fidelity number is n=1 on every axis
One frame, one viewport (1440×900), one DPR (1), one browser (Chromium), one GPU, one theme.
0.66% is a single sample. Cheapest meaningful extension: **render at DPR 2** — the grain is a fixed
±4/255 in screen space and the glow uses screen-space derivatives, so both are resolution-dependent
and the match may not hold.

### 3.3 The colour fix was never validated on a held-out frame
`cs-sweep.mjs` selected the configuration by comparing against one live capture, and Gate B then
scored that same variant against that same capture. Circular. Capture a second live frame at a
different `u_time` and re-measure without changing anything.

### 3.4 The 5% ceiling is self-set and underived
It appears once, in a pass/fail table, with no derivation and no precedent anywhere in this
project. Either justify it or state plainly that it is a local convention for this study.

### 3.5 Per-tier presets for medium/small are unrecovered
They arrive as page data from outside the analysed chunk. A sibling chunk suggests
`{wide: gj, medium: P1, small: y7}` but the recovery labels it SUSPECTED for this page. The rig
uses the wide preset for all three tiers and says so in a comment. Do not invent values.

### 3.6 Never built: the raw-WebGL2 port
Its value dropped once the palette swap answered Q7 directly on the three.js rig — but it is the
only thing that would prove the mechanisms reproduce **without three.js**, which is the constraint
the follow-on actually operates under. Decide whether it is still worth it before building it.

---

## 4. Newly opened by this work

### 4.1 ⭐ The FR-38-31 rework, now precisely scoped
The POC replaced a vague "make it look better" with five named, ranked differences. In order of
value:

| # | Change | Nature |
|---|---|---|
| 1 | **Form** — a bounded shape that dissolves by depth, not a full-bleed repetitive wash | geometry + one `mix()` |
| 2 | **Ground** — bright colour on white, not saturated colour on near-black navy | attribute default |
| 3 | **Hue adjacency rule** — stops must not span complements, or the blend passes through grey | design rule, no code |
| 4 | **A fine detail field** — striations. Ours has none; theirs carries much of the quality | ~15 lines GLSL |
| 5 | **Colour source** — a sampled texture rather than four interpolated stops | structural, biggest |

⚠ Items 1–4 are changes to `wave-gradient.js` and its host attributes. Item 5 is a genuine
architecture decision. **Do not start at 5.**

### 4.2 A second pass needs an architecture decision, not an implementation
Stripe's grain and angular blur live in a **full-screen second pass over a framebuffer**. Spec 38
§1.2b names multi-pass/framebuffers as exactly the trigger to re-open D479 decision 2 (the OGL
question). Treat it as a design gate, not a 10-line add-on.

### 4.3 `wave-gradient.js` may be registered but unused
No evidence was found that the effect is authored on any live page. Confirm before treating it as
load-bearing — it changes how freely the rework can move.

### 4.4 Gate E has not run — Stripe's assets are still on disk
`.claude/scratch/stripe-hero-poc/` holds Stripe's shaders, three palettes and vendored three.js.
D783 says they are deleted at Gate E. **Either run Gate E or record a dated deletion deadline.**
The tree is exempt from the `scratch/` → `reports/` promotion rule and must stay so.

---

## 5. Method — the failures this session actually paid for

- **A declaration is not a behaviour.** Five dead declarations were found in Stripe's bundle
  (`tangent`, `v_tangent`, `u_lutTexture`, `u_blueNoiseTexture`, `u_mousePosition`). Four claims
  built from a `uniform` census were wrong. Grep for where a thing is READ, never where it is declared.
- **An inventory needs an independent count.** Two extractions reported "complete" while missing
  the entire post-processing pass — one matched only double-quoted exports, the next used one
  character class excluding both quote styles and found 1 of 6. Only counting the wrappers caught either.
- **Two overlapping fixes are unfalsifiable.** A colour-space "fix" was masking a missing blend
  operation; both-wrong scored better than either-one-right. Only the full 2×2 exposed it.
- **Measure the rendered output, never the drawing buffer.** A canvas probe reported "nothing
  rendered" for a rig that was rendering perfectly — without `preserveDrawingBuffer` the buffer is
  cleared after compositing.
- **Right look, wrong means is worse than a visible gap.** A fallback hidden with `display: none`
  looked correct; Stripe uses an opacity cross-fade. Check the mechanism, not just the picture.
- **Don't read an artefact while its producer is still running.** A file was judged incomplete at
  16:58; it finished at 17:00.
- ⛔ **Git Bash heredocs on this machine strip backslashes.** Four scripts were corrupted this way.
  Write scripts to a file and run them; never paste a regex through a heredoc.

---

## 6. Guardrails

⛔ Nothing in `.claude/scratch/` ever promotes to `reports/` — it holds Stripe's copyrighted
material. `reports/` is tracked forever.
⛔ Do not reproduce Stripe's GLSL or imagery in any tracked document. Describe it.
⛔ Do not deploy anything from this work to the canary.
⛔ Do not delete `wave-gradient.js` (see §0).
⛔ Spec 38 is not writable from a POC session — draft a proposal into `reports/` instead.

---

## 7. Suggested first action (<5 min)

Run the performance trace (§3.1). It is the only completely unanswered question, it needs no
decisions, the rig is already deterministic, and it is the number the whole Tier W budget argument
is missing.
