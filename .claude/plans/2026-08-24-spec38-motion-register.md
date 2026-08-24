---
doc_type: register
project: small-giants-wp
spec_ref: 38
last_updated: 2026-08-24
---

# Spec 38 motion + effects — verified status register

---

## SESSION CLOSE — 2026-08-24. What this session closed, and what it opened.

Seven commits, all motion: `68a18639` `eb9ab0f9` `f71466ad` `a73970416` `c6a7370b3`
`9d6a4f1ed` `7c213a361`. Decisions **D766** and **D767**. Canary: **page 2721**
(`/gate-do-not-delete-cursor-field-five-looks-three-controls/`), which supersedes 2716 and
2717 — both deleted.

### CLOSED

| Item | Evidence |
|---|---|
| **FR-38-28 — all four signed looks** | `hue-shift` + `parallax-pattern` built; glow + spotlight-mask already shipped. Live on 2721 |
| **Aurora's three defects** | Invisible band (21% of a hue cycle per sweep → 76%); tile seam; then the CROSS Bean caught by eye. Seam detector + negative control: broken state steps 45, fixed steps 6 |
| **D767 — masked looks lit the wrong spot** | `spotlight-mask` shipped 2026-08-01 with the defect and was never observed. Offset +256 → **0** |
| **Dead "Field size" control on Drift** | Found by the council in code shipped hours earlier. Given a meaning rather than hidden — radius now drives dot spacing |
| **Step 20 — spec ↔ code reconciliation** | All five items. (e) was already closed by a deletion the register never recorded |
| **FR-38-20 + FR-38-21** | §9 gained three rows, §10 the `physics-canvas` row it recorded as OWED. Both now meet their own done-criteria |
| **Eleven stale doc claims** | Nine in the spec/LEDGER/parking/docblocks, plus two in the CSS header that this session's own bug disproved |
| **New capability beyond the gate** | Brickwork reveal (running bond, SVG mask), pointer trail (lerp), field shape (circle/wide/tall) |
| **Gate coverage** | New invariant **I8**; I6's self-test anchor made regex-based after breaking twice; the self-test case count now derived rather than hardcoded |
| **The missing-accent-token question** | Ruled NOT a gap by Bean. "Untested" is only a risk when the untested case can occur |

### OPENED — carried into the next session

1. **Bean's eye on the five looks.** Everything verified is mechanism. R-31-13 says numbers alone
   do not close a fidelity question, and this session was wrong twice about how something would
   look until it was rendered.
2. **The EDITOR surface has never been opened.** Only the frontend has been verified. §9's rows
   are honestly flagged *"reasoned, not observed"* and that flag is CORRECT. The client picks
   these looks in the editor; nobody has confirmed the picker lists all five, or that the canvas
   renders sanely. This is the `verify-both-surfaces` gap that has bitten this project before
   (0 of 6 product cards rendered in the editor while 5 of 5 rendered live).
3. **The research shortlist needs a decision.** Three agents surveyed award-tier cursor work.
   Findings are in the next-session prompt; nothing has been acted on.
4. **`floating-objects`** — the fifth field type. Unchanged: needs new JS and its own design gate
   deciding which children become objects.
5. **Canary 2721 is not gate-wired.** The four load-bearing fixtures remain 2103 / 2109 / 2113 /
   2603. 2721 is a judgement rig, and no probe depends on it.

### Method failures worth carrying, all self-inflicted

- **A commit body is not a living doc.** D767's bug was found and recorded ONLY in a commit
  message, while D766 congratulated itself for repairing nine stale claims elsewhere. Caught by
  the council's spec-lawyer seat, not by me.
- **An absence verdict is only as wide as its search.** Twice: FR-38-28 reported "never built"
  after searching for the FR number and the file Route B would have used; the hover suite
  reported "zero editor reach" after checking one of two mechanisms.
- **Three wrong "seamless by construction" claims in one session.** Each was reasoning about
  tiling; each was refuted by rendering it.
- **One CSS edit applied without an assert matched nothing and did nothing.** Every other edit
  that session asserted. The computed style caught it; the script did not.

---

**Re-verified 2026-08-24 by capability, not by name.** Every verdict below is from code read
this session. Where something is partial, it is stated as a fraction with its denominator.

---

## Read this first — two of my own findings were wrong, the same way twice

This register exists because the motion track's status is spread across the spec, two plan
registers, a design gate and `decisions.md`, which disagree. But my *first* pass at reconciling
them made the same error twice, and you caught it once:

| My claim | Reality | Why I got it wrong |
|---|---|---|
| "FR-38-28 pointer-reactive backgrounds: signed, never built" | **Built** as FR-38-25's cursor field; 2 of 4 looks shipped | I searched for the FR number and for the file Route B would have used |
| "Hover suite: zero editor reach" | **10 of 83 blocks** have working hover-motion controls | I checked one mechanism (the universal extension panel) and treated it as the whole capability |

**The shared shape: an absence verdict is only as wide as its search.** Both times I searched
for the *implementation I expected* rather than the *capability*, found nothing, and reported
nothing exists. Everything below was re-run by capability — enumerating the true denominator
first (every consumer of a custom property, every mechanism that produces a hover transform,
the full `fx_effects` table) and only then asking what is missing.

---

## The one-line answer

**Waves A–C are genuinely built and the infrastructure is real.** What is left is not a
half-finished engine — it is: one large unbuilt bridge (motion does not survive cloning), a
rollout problem (effects exist that clients cannot reach or cannot turn off), and a list of
capabilities never started.

---

## Section 1 — What is CLOSED and verified

| Capability | Evidence |
|---|---|
| **Tier G engine + 12 effect modules** | `src/shared/effects/gsap/` — pin-scrub, scrub, horizontal-panel, split-reveal, scramble, flip, draggable, draw, morph, motion-path, image-sequence, provider |
| **Tier H — Lenis smooth scrolling (FR-38-18)** | Built + live-verified D424. Editor exclusion is deliberate and doubly enforced (`smooth-scroll.js:37` server-side, `:164-175` runtime iframe gate) |
| **Tier V — page transitions (FR-38-19)** | Built + live-verified D424; CSS-first, zero frontend JS |
| **Tier W — substrate + surface treatments (FR-38-29)** | D714–D716. `webgl/` = 4 files, zero dependency (raw WebGL2), 3 shaders, 15 image-bearing blocks offered |
| **FR-38-12 Flip** | Closed D741 after two real bugs; live-verified on the shop archive |
| **Morph + motion-path live** | D697 / D696 (2026-08-20) confirmed both fixes live |
| **Carousel looping (FR-38-26)** | 5 blocks, each probe-verified, dots key to real card count |
| **Cursor field (FR-38-25)** | 9 blocks; 3 controls (type/colour/size) all verified reachable end-to-end |
| **Animated counters** | `counter/view.js:1-90` — rAF ease-out-cubic, IntersectionObserver-gated, reduced-motion aware; `edit.js:161-176` exposes duration + separator. **Client-controllable.** The gap register listed this as missing; it is not |
| **Audio-reactive visualisers** | `audio/view.js:85-105` real `AnalyserNode` graph; 6 styles, 4 reactive; client-configurable via "Player style" (`edit.js:122-228`) |
| **`sgs/before-after`, `sgs/image-sequence` + its asset tooling, `sgs/physics-canvas`** | All built (spec still calls before-after "NET-NEW") |
| **Gate chain** | `check-fx-list-drift.py` (prebuild), `check-motion-bundle-budget.py` + `check-shader-sources.py` (postbuild). The drift gate's I6 invariant is `--self-test`-proven able to fail |
| **Step 20 (spec↔code reconciliation)** | **All 5 items now closed.** (e) resolved by deletion in `1ac16ec9`; (c) ruled at D723 |

---

## Section 2 — Rollout gaps: built, but the client cannot reach it

This is the largest category and the registers under-report it.

### 2.1 Hover motion — 10 of 83 blocks (~12%), and 10 blocks animate uncontrollably

Two independent mechanisms, which is why single-mechanism checks keep getting this wrong:

**Mechanism A — universal PHP injector** (`includes/hover-effects.php:47-105`). Adds
scale/shadow/zoom custom properties at `render_block`, consumed by
`assets/css/extensions.css:160-166`. Eligibility is a **hardcoded 10-block name list**
(`:49-69`) — an R-31-1 smell in itself. Its editor panel
(`extensions/hover-effects.js:327-415`) is gated behind
`supports.sgs.enabledExtensions:["hover"]`, and **no block declares it** — only 10 blocks
declare `enabledExtensions` at all, and the sole value used is `"blockLink"`.

**Mechanism B — block-owned hover attrs** (`scaleHover`, `effectHover`, `imageZoomHover`,
`shadowHover`…), declared ad hoc per block. 14 blocks declare at least one; **10 have a
genuinely wired control**: button, icon, brand-strip, info-box, card-grid, post-grid,
process-steps, testimonial-slider, testimonial, gallery.

Four distinct defects fall out:

1. **~88% of blocks have no hover-motion control at all**, and *nothing anywhere* exposes
   duration, easing, stagger, tilt, grayscale or border-accent — those live only in Mechanism
   A's never-rendered panel.
2. ⚠ **The inverse problem, which no register mentions: 10 blocks animate on hover
   unconditionally and the client cannot see it or switch it off.** Motion they did not choose.
3. **6 dead attrs** — declared and rendered, zero editor wiring: `card-grid`'s
   `scaleHover`/`imageZoomHover`/`grayscaleHover`, `team-member`'s same three,
   `heading`/`text`'s `scaleHover` (both block.json files call it "an orphan… left unclaimed").
   `check-dead-controls.js` cannot catch these — it only detects control-without-renderer, the
   opposite direction.
4. **A dead default:** image-zoom is defaulted for 10 blocks but only `card-grid` and
   `team-member` have CSS consuming `.sgs-has-img-zoom`. On the other 8 it does nothing.

**Cheapest fix:** one block opts into `enabledExtensions:["hover"]` and the whole panel appears
— the mechanism is built and waiting.

### 2.2 Skeleton / loading choreography — real in 3 blocks, shared in none
Working shimmer implementations in `post-grid/view.js:39-57`, `product-search/view.js:176-193`,
`cart/panel-render.js:4` — each hand-rolling its own class names and keyframes. No shared
module, no editor control for count, timing or style. Form focus/validation transitions exist
too (`form/view.js:113-125`), also hardcoded.

### 2.3 Audio-reactive is trapped inside one block
The analyser graph lives entirely in `audio/view.js`; nothing is exported to `src/shared/`. Any
other block wanting audio-reactive visuals would need a duplicate implementation. Separately,
the four good visualisers are buried in a *style* dropdown, so nobody browsing "effects" finds
them — a discoverability gap, not a capability gap.

### 2.4 Motion QA — 3 of 16 probes are standing regression checks
`scripts/motion-qa/` holds 16 probes; `run-live-probes.mjs` registers three. This is honest, not
broken — its docblock (`:22-26`) says it registers only probes with negative controls and stable
fixtures, and names the promotion criteria. But 13 effects were verified once and have no
standing guard.

---

## Section 3 — The one large unbuilt thing: motion does not survive cloning (FR-38-22)

**Verdict: unbuilt at every stage, and it fails silently.**

| Stage | Status | Evidence |
|---|---|---|
| Draft grammar defined | ✅ | Spec 38 §11 |
| `block_attributes` rows seeded | **5 of ~20** | Only `fxStart`/`fxEnd`/`fxScrub`/`fxPin` (image-sequence) + `fxDraggable` (before-after) |
| Converter READ path | ❌ absent | `data-sgs-` appears in exactly one converter file repo-wide |
| Converter WRITE path | ❌ absent | `lift_behavioural_attrs` returns a plain dict, not the `ScalarLift` that `assembly.py:141` merges |
| Skip-with-reason (Rule 4) | ❌ absent | `content_gap_collector.py` only records content gaps + BEM traces; nothing constructs a record for an fx attr |
| Tests | ❌ none | No converter test references fx/motion lifting |

**If a client authored `data-sgs-fx="pin-scrub"` today and cloned it: nothing happens, with no
trace in the report or logs.** Not a reported skip — total silence, which Rule 4 forbids.

**⛔ Spec 38's D427 amendment contains a false claim, and I root-caused it rather than just
noting it.** The spec says `fxPath`, `fxPathAsset`, `fxPathRotate`, `fxPathRest`, `fxPathRestVh`,
`fxShape`, `fxShapeAssetFrom`, `fxShapeAssetTo` are *"all seeded in
`scripts/seed-motion-fx-registry.py`"*. The DB has none of them.

The cause is not a missed run. **The seeder cannot create these rows by construction** — its
`FX_ATTR_CSS_PROPERTY` map (`:816-930`) is applied by a **read-only reconciler**
(`:1120-1139`): it `SELECT`s existing rows, prints `[ok]`/`[MISMATCH]`, prints `[skip] … no
block_attributes row declares this attr yet` when there are none, and its own docstring states
*"this function no longer writes"*. Rows are created only by `/sgs-update` from `block.json`
declarations — and these fx attrs are registered through the `registerBlockType` filter in
`fx.js`, so they appear in **no** `block.json`. The seeder holds a complete map with nothing to
attach it to, and reports `[skip]` forever.

That is the same extension-registered-attrs blind spot Spec 38 names elsewhere, arriving by a
new route — and it means Step 12 is bigger than "wire up one function": the DB half has no
writer either.

**The named function's bug is confirmed and is a local oversight, not a missing capability.**
`db_lookup.py:5088-5091` strips `data-sgs-` and uses the lower-cased hyphenated remainder as a
camelCase key, so `data-sgs-fx-trigger` → `"fx-trigger"` never matches `fxTrigger`. Two siblings
in the same codebase already solve exactly this: `db_lookup.py:5716` and
`array_content.py:160-163` (`_kebab_to_camel`).

---

## Section 4 — The signed design gate: all four looks shipped; two needed a coordinate fix (2026-08-24)

⚠ **This section read "✅ ALL FOUR LOOKS SHIPPED" unqualified for several hours after a defect in two
of them had already been found.** Corrected per D767. `spotlight-mask` and `hue-shift` lit the wrong
spot (mask resolves against the element box, layer against the viewport); fixed, measured +256 → 0,
and masked types are now emitter-only.

FR-38-28 shipped as FR-38-25's cursor field. Verified by enumerating **every consumer of
`--sgs-cursor-x`/`--sgs-cursor-y` repo-wide** — exactly two files, two paint rules. That closed
set is what makes the absence verdicts below trustworthy.

| Look as signed | Status |
|---|---|
| Soft radial glow | ✅ `fx-cursor-field.css:73-79` |
| Spotlight revealing a pattern | ✅ `:91-103` |
| **Gradient that shifts hue with pointer** | ✅ **BUILT 2026-08-24** — `hue-shift`; multi-hue band at half pointer speed under a pointer-centred mask, client colour dominant at 65% via `color-mix(in oklch, …)` |
| **Pattern that parallaxes** | ✅ **BUILT 2026-08-24** — `parallax-pattern`; repeating dots at 8% of pointer distance, deliberately unmasked |
| *Floating objects* (a third, from FR-38-25) | ❌ zero opt-in marker, zero transform code |

**Cost, verified against the code — the spec's "a CSS rule plus a descriptor" understates it by
two files.** A new look must join three lists or the drift gate fails the build: the CSS rule,
`SGS_FX_CURSOR_FIELD_TYPES` (`fx-cursor-field.php:62`), and `FX_FIELD_TYPE_OPTIONS`
(`fx.js:350-356`).

**The two remaining looks are not equal cost:**
- **Hue-shift genuinely is CSS-only** — the emitter already publishes raw pixel values, so a
  `calc()`/`hsl()` expression can consume `--sgs-cursor-x` directly. No new JS.
- **Floating objects needs new JS**, and the architecture is against it: `cursor-field.js:20-30`
  documents that the whole design is shared-background-layer painting *specifically because*
  element-relative transforms don't line up across separately-painted boxes.

---

## Section 5 — Never started

| Category | Status | Note |
|---|---|---|
| **Image transitions** (displacement melt, curtain wipe) | ABSENT | `before-after` is a clip-path comparison slider, not a transition |
| **Generative backgrounds** (noise/flow fields) | ABSENT | Tier W is **single-pass, no loop by explicit design** (`webgl/README.md`). An architectural boundary, not an oversight — extending it is a new Tier W phase with its own gate |
| **Lottie** | ABSENT | Zero dependency, zero code. Would need a Tier H admission test + D-number |
| **3D / product configurators** | ABSENT | No three.js / model-viewer / OGL; no glb/gltf/usdz handling. ⭐ Commercially the strongest gap |
| **Scrollytelling** | PARTIAL | `pin-scrub` + `horizontal-panel` give the pin-and-choreograph primitive. Missing: a step index, per-step active state, and a block pairing a step list with a pinned visual |
| **Timeline progressive fill** | ABSENT | `timeline/view.js` is a stagger fade reveal, no scroll-driven fill. `sgs/timeline` is also a genuine horizontal scroller with no `fx`/`loop` declaration |
| WebGPU / TSL | — | Watch, don't adopt (~70% real coverage) |

The **fluid cursor field** remains admissible but is blocked on the same single-pass boundary:
a real fluid sim is multi-pass over ping-pong framebuffers. `webgl/README.md:53-58` records that
an agent was nearly dispatched to build it against a contract that could not detect the
mismatch.

---

## Section 6 — Documentation that misled the next reader — ✅ ALL NINE FIXED (2026-08-24)

1. **The LEDGER says this track is CLOSED** and points at a `## ▶ TIER W (MOTION) TRACK` section
   that no longer exists in the file. Both halves are wrong.
2. **Spec §1.2b names OGL as the Tier W library** — D715 shipped raw WebGL2, zero dependency.
   *D715 amends one of your decisions and is flagged for ratification; reversible in one file.*
3. **Spec §6 prints SQL to delete the `scroll-smoother` row** that D723 ruled must stay.
   ✅ That row's stale `tier`/`plugin_set` columns are **already fixed** (now `tier='H'`,
   `plugin_set=[]`) — D723's "action owed" is done.
4. **Spec §11.2's morph caveat** still says morph is "fixed-on-paper only" — D697 confirmed it
   live.
5. **Spec §11.3/D427 claims 8 fx attrs are seeded** — see Section 3; they cannot be, by
   construction.
6. **§9 is missing 3 rows** (cursor-field, carousel-loop, physics-canvas) and **§10 is missing 1**
   (physics-canvas) — FR-38-21 and FR-38-20 are incomplete by their own done-criteria. The spec
   flags the §10 one itself at `:609`.
7. **Spec still calls `sgs/before-after` "NET-NEW"**; `seed-motion-fx-registry.py:569-570` still
   says `sgs/image-sequence` doesn't exist. Both do.
8. **`parking.md:100-104` points at Steps K and L** in the Wave D register; neither exists (K
   pruned as closed at `ea12f5e7`, L deleted at `0cb69514`).
9. **Three docblocks still list the deleted `generated-fx-qualifying-blocks.php`** as an output
   (`run-motion-fx-generators.js:22-23`, `sgs-update-v2.py:42`, `:5603`).

---

## Section 7 — Not defects, recorded so they are not "fixed"

- **Lenis has no editor preview** — deliberate, enforced twice (`smooth-scroll.js:37,164-175`);
  smoothing the canvas would fight the editor's own scrolling.
- **`physics-canvas` has no focus management** — only `aria-hidden` (`render.php:135`), no
  `tabindex`/`inert`. Confirmed open, but you ruled this surface waives a11y knowingly, so it is
  offered, not owed. ⛔ `inert` is the wrong primitive — it would disable the block.
- **No contrast warning on the cursor field** — confirmed absent (the only "contrast" text in the
  effects tree is a developer note at `spotlight.js:44-45`). But you turned contrast from a gate
  into a control on 2026-08-07, and type/colour/size controls all exist.
- **Agency-only, should be LABELLED not fixed:** `image-sequence` (needs ffmpeg + a prep script),
  `fx-morph` (needs matched-topology SVG pairs), `fx-scramble` (dev-only).
- **`decorative-image` in "naked mode" no-ops the surface treatment** — 13 of 15 offered blocks
  nest their `<img>` and work; fixing it is a re-parent with real blast radius.

---

## What I did not check

- Nothing here is a live-DOM claim; I opened no browser.
- I did not assess whether `IMAGE-SEQUENCE-PREP-README.md` meets the "a client can produce usable
  frames" bar — existence confirmed, quality not.
- Carried from the registers without re-verification: the WCAG findings on marquee /
  tsParticles, and Step 21's council grades.
- One agent flagged UNCLEAR on whether `animation_tokens` (8 rows) or `preset_implications`
  (23 rows) encode anything relevant to the Section 5 categories.

## Ranked, if you want a next step

1. **Hover rollout (2.1)** — highest client impact, lowest risk. One `enabledExtensions` opt-in
   makes a built panel appear; separately, 10 blocks currently animate uncontrollably.
2. **Documentation sweep (Section 6)** — nine items, no build, no deploy, no DB write. Removes
   the traps before anyone acts on them.
3. **The hue-shift look (Section 4)** — genuinely a CSS rule plus two list entries, on a proven
   mechanism. The cheapest *visible* new capability on the register.
4. **Step 12, the cloning lift (Section 3)** — the largest real build, and now known to be
   larger than the register says because the DB half has no writer either.
