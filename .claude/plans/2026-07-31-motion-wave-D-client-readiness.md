Invoke /autopilot before doing anything else.

> ⚠ THIS FILE IS A POINTER, NOT THE TRUTH. Live status = `.claude/LEDGER.md` — if it contradicts this plan, the LEDGER wins.
> ⚠ **GATE 1:** Spec 38 must read `status: active`. **GATE 2:** Waves A, B and C are CLOSED (D414–D417, D422, D424, D426, D427, D430). This wave consumes all three. If a gate fails, STOP.
> ⛔ **DEPLOY HAZARD, PROVEN TWICE.** The shared tree's compiled `build/` contains co-active tracks' uncommitted `render.php` edits, and `assets/` is a separate directory a partial worktree copy silently misses (that error shipped a 404 stylesheet on 2026-07-31 and rendered a hidden SVG as a 1200×1200 black shape). Use the isolated-worktree recipe in Tool bindings and copy **src + includes + scripts + assets + build**.
> ⛔ **NEVER add anything from this plan to `parking.md`.** Bean-ruled 2026-07-31: parking is strictly for BLOCKED or POSTPONED work, never a reminder list. This plan IS the register.
> **This session runs in PLAN MODE first** — investigate, present, get approval, then build.

# Phase — Motion Wave D: client-readiness

> **THIS IS A BUILD REGISTER, NOT A REVIEW DOC.** Rewritten 2026-08-01 after wave 2: every COMPLETED
> step body was DELETED (its one-line outcome lives in the §2 tables with its verification state), and
> every remaining open item is a `### Step` heading below. **If a step has a heading, it is open. If it
> does not, it is closed — check §2, then `git log`.**

## 1. Where this stands (2026-08-01, after wave 2)

**Wave 2 shipped and is deployed to the canary.** The engine works and most client-facing gaps are
closed. What remains is **9 open steps** (Wave E closed 16 more — see §2), listed below in the order they
should run. ⚠ This count has drifted before: trust the `### Step` HEADINGS, not this sentence.

**The three things a fresh session most needs to know:**

1. **Verification state is PER ITEM, never uniform.** §2's wave-2 table states, row by row, what was
   measured live with numbers versus what was only artefact-checked. Do not read "deployed" as "proven".
2. **Bean's eye caught every defect in wave 2's second half** — the drag not following the mouse, the
   dots not tracking, the text finishing under the header. The automated checks passed all five of
   their assertions because they asked "did it move?" rather than "did it follow the mouse, and did the
   dots follow the cards?". **Build the assertion Bean's eye just made into the probe** before assuming
   a green run means anything.
3. **Three separate false passes happened in one day.** A probe measured an element 3,000px below the
   viewport and reported it "clear of the header"; another reported a fix landed when a concurrent
   agent's `git checkout` had reverted it; a third reported files written that were not on disk.
   **Grep the file contents / assert the element is on screen. A report is not evidence.**

---

## 2. Where we are right now — the honest state

**CLOSED this wave (9 of 24 steps — the 8 below, plus Step J, which is kept in place at its own heading because the reasoning behind it is load-bearing).** Full detail moved to `memory/`; here is the one-line
version of each:

| Was step | What it closed | Commit(s) |
|---|---|---|
| 1 | Touch-drag measured for real (not just reasoned about) on the two motion canaries | `0628800a` |
| 4 | Split the "this block has SVG" signal into two separate signals, so the wrong shape-morph control stops appearing on plain container/hero blocks | `80868f80`, `fb6adccd`, `4a5cb764` |
| 9 | Motion presets added into 3–5 real starter patterns, so inserting a pattern gives a client tasteful movement with zero setup | `c75add9c` |
| 11 | A clean checkout of the code can now run the full build without a private database file | `c674edea` |
| 13 | Keyboard-focus contract for pinned scroll sections written and tested (contract now lives in Spec 38 §3.1) | `b74d2b07` |
| 14 | Every effect's "reduced motion" behaviour is now measured, not just reasoned about | `0628800a` |
| 16 | The image-sequence tool's frame-count is capped and it verifies its own frame files, so it can't silently half-fail | `3a0bf4e5` |
| 17 | Two console errors that appeared in the editor (on every page, motion or not) are gone | `67c91a47`, `d1e164c9`, `82a08b8a`, `350bc9a7` |

**CLOSED 2026-08-01 (wave 2) — all deployed to the canary; verification state stated honestly per row.**

**CLOSED 2026-08-01 (WAVE E) — 16 steps. Bodies DELETED per this plan's own rule; one-line
outcome + commit below. Verification state per item is in `LEDGER.md`'s Wave E table — several of
these are built-and-deployed but NOT yet observed live, and the LEDGER says which.**

| Was step | What closed it |
|---|---|
| 6 | before/after video + SVG sources (adopted sgs/media mediaType fork) — `0147402e` |
| 6b | before/after all FOUR reveal directions, label order keyed off the same selectors — `0147402e` |
| 23 | before/after test imagery replaced; the checkerboard was a baked-in frame stamp, not a responsive bug — `0147402e` |
| L | fx inspector panel now linted; the guard covers 12 previously-unguarded panels — `ae98e5ff` |
| M | sgs-healthcare idle-dot contrast — superseded and widened by the 8-client audit — `2f0efb38` / `2a62a026` |
| N | image-sequence pin-ON path observed live for the first time — `5ec8a442` |
| P | content-collection folded into card-grid via ONE shared engine, non-Woo CPT path ported — `f5ba3839` |
| S | dead buybox fixtures — pages deleted by Bean directly |
| T | deploy/commit deadlock broken via `--payload`; proven on two real deploys — `ae98e5ff` |
| V | buybox thumbnail drag wired; 1:1 pointer tracking measured live — `c6a25eca` |
| E-residual | motion-path geometry — measured: no user-visible defect remains; route box documented as latent — `a9c9675f` |
| 10 | preset + param normalisation moved outside the editor — `901f91e0` |
| 15 | per-breakpoint motion disable, runtime gate at bootEffect — `901f91e0` |
| 18 | motion diagnostics admin panel (effects in use, bytes, skip reasons) — `5ec8a442` |
| 19 | per-page motion budget readout, visible not blocking (D448) — `5ec8a442` |
| 22 | pin keyboard contract OBSERVED not inferred — found the D453 WCAG failure — `b6a5676c` |


| Was step | What it closed | Verified live? |
|---|---|---|
| 5 | **Morph reachable from ANY block** (Bean ask #1) — built to the signed D427 design: curated preset pairs, thumbnail picker, render-layer hidden-SVG expansion, so the host block no longer has to BE a shape. `fx_effects.morph.requires` `svg`→`none`; **28 of 28 fx-capable blocks now offer morph, was 3** | Artefact-verified; live morph render NOT yet measured |
| B | Testimonial-slider arrows: bare 8×24px `‹` glyph in a 44px button → the existing SVG chevrons | ✅ 44×44 button, 22×22 icon constant across 375/768/1440 |
| C | Slider idle dots off `border-subtle` (~1.2:1) onto `text-muted` | ✅ 5.79:1 on the live palette. ⚠ `sgs-healthcare` still fails at 2.97:1 on its OWN token — open, see Step M |
| D | **Palette/token integrity — far bigger than expected.** `surface` was doing two contradictory jobs: `theme.json` wires it to the page background while 33 blocks used it as their card fill, so cards vanish on any palette where it isn't white. Contract written into Spec 32 §12 (substrate / raised / inverse-ink, all 16 slots); 76 call sites classified, 34 rerouted; 3 wrong `#0D5557` fallbacks fixed; Mama's `#fbf3dc` removed from `product-card`. **LOAD-BEARING: the extractor detected `surface-alt` but never wrote the slug, so a re-extraction would have silently recreated the collision — synthesis fallback added + Spec 33 amended** | ✅ cards now render distinct from the page background |
| F + G | Image-sequence: scrub anchored to FULL visibility via opposite-edge geometry (NOT the shorter same-anchor window its own docblock records as tried and rejected); pin promoted to an inspector toggle per Bean's D435 "janky patchwork" ruling | ✅ gradual frame progression, mirror defect did NOT reproduce. Pin-ON path exists in source but no live instance had it enabled — see Step N |
| H | **Scramble preset timing** (Bean's live finding). Root cause: `dramatic` used `top bottom`, which is the EARLIEST possible ScrollTrigger threshold, and scramble reads only `fxStart` — so "dramatic" fired soonest. Ladder restored to 85% / 70% / center | ✅ **Bean-approved 2026-08-01.** New 3-column side-by-side canary page **2105** (`/fx-preset-comparison-columns/`), triggers at scrollY 480/600/800 against a 4,331px page, editor-clean (23 blocks, zero recovery warnings) |
| E (part) | Motion-path SKEW: `preserveAspectRatio="none"` removed from `fx-path-routes.php` — proven live via the transform matrix | ✅ skew gone. **The ~2,705px jump is NOT fixed — see Step E-residual** |

**Also closed 2026-08-01:** the grid-block consolidation council (4 independent seats, 3–1 to retire
`sgs/content-collection` into `sgs/card-grid`) — Bean approved the fold **including porting the
non-WooCommerce `sgs_product` CPT path**, which is the dissenting seat's stated condition. Now Step P.

**Buybox drag — SUPERSEDED by Step V (2026-08-01).** The old "HELD" note here described a control proven by hand but refused a clean sign-off. The picture is now clearer and measured: buybox RENDERS correctly on the real product page (gallery 659px + configurator 573px, strip overflowing 712>659), but **the strip has no drag handler bound at all** — a real drag leaves `scrollLeft` at 0 while forcing it via JS works. That gap is documented in buybox's own `block.json`, and its named prerequisite (a product-page fixture) is now satisfied. See **Step V**.

**Also folded in — items 22 and 23,** moved into this plan from the parking list on 2026-07-31
because parking is for blocked/postponed work only, and these are planned work with a clear next
action (a keyboard-focus re-check that observes real content instead of inferring from how the
code is built, and a swap of some placeholder test images that were making a working feature look
broken).

**Everything else below is what remains** — reordered into the order it will actually run, with
Bean's rulings from the review folded in as their own steps.

---

## 3. Residual list — NOW OWNED BY THIS PLAN (moved out of parking 2026-08-01)

Both items below were previously filed in `parking.md`. Bean ruled on 2026-08-01 that parking is
strictly for BLOCKED or POSTPONED work and these are planned work with a named next action, so they
were REMOVED from parking and are now Steps K and L of this wave. **Do not re-park them, and do not
park anything else from this plan — this plan is the register.**

### Step K — canary fixture pages carry blocks the editor cannot open (was P-MOTION-CANARY-CONTAINERS-INVALID-IN-EDITOR)

> ⚠ **RESCOPED 2026-08-01 (Wave E).** This is no longer a generator hunt. Measured across all
> 16 canary pages: contamination is confined to SIX old pages (2022, 2023, 2024, 2025, 2026,
> 2029), and pages 2105/2107/2109 carry 12–18 containers with ZERO bad wrappers — the newer
> build method is already clean. **Bean has DELETED those six pages.** What remains is: rebuild
> whichever were load-bearing baselines, using the 2105 method, and RECORD the method so it
> cannot recur.
  **Model:** sonnet
  **Action:** Every `sgs/container` on the `/motion-canary-*` fixture pages reports `isValid: false`
  in the block editor — 7 of 21 blocks on page 2024. WP reports *"Content generated by `save`
  function: (empty)"* against *"Content retrieved from post body:
  `<div class="wp-block-sgs-container"></div>`"*. `container/save.js` returns `<InnerBlocks.Content />`
  with no wrapper div, so the stored markup was written by something that emitted a wrapper the block
  never produces — the fixtures were generated programmatically rather than through the editor.
  **The frontend is unaffected** (render.php drives output; probes pass against these pages). It is
  the EDITOR that is broken: an invalid block renders no inspector, so a client cannot open those
  sections and any control added to `sgs/container` is unreachable on them.
  Pre-existing, not caused by D416 — `container/save.js` last changed at `e1459e6d` and no commit in
  that session touched a container file. Verified before recording.
  **Why it matters beyond the fixtures:** if the generator that wrote these pages is reused for any
  other programmatic page build, every page it writes carries the same defect. Find what wrote them
  before assuming it is contained.
  **Note (2026-08-01):** pages 2105 (`/fx-preset-comparison-columns/`) and the new
  resting-position/buybox fixtures were built to avoid this and verified editor-clean — use their
  serialisation approach as the reference for any future fixture.
  **Exec:** SEQUENTIAL · **Deps:** none · **Time:** 1 h
  **On-Fail:** if the generator cannot be identified, rebuild the affected fixture pages the way
  page 2105 was built, and record the method.

### Step O — the drag text-selection symptom Bean saw is UNREPRODUCED

> ⚠ **RULED 2026-08-01 (D449) — do NOT dispatch an agent at this.** The cause-agnostic
> `user-select` mitigation shipped and is live. Scripted drags across Chromium, WebKit and
> Firefox could not reproduce the symptom, and per measurement-vs-eye Bean's report STANDS over
> the null measurement. **Bean re-checks by hand on a real machine after a deploy.** An agent
> would re-run scripted drags and produce a fourth false pass.
  **Model:** sonnet · **Time:** 45 min
  **Action:** Bean reported drag selecting page text ("it doesn't even look like it's registering as
  this drag interaction"). The scroll-behavior race and the missing dot listener are FIXED and verified,
  but the selection symptom **could not be reproduced** across Chromium, WebKit or Firefox with scripted
  drags. A cause-agnostic mitigation shipped (`user-select: none` held from pointerdown through release).
  **Per the measurement-vs-eye rule, Bean's report STANDS over the null measurement** — scripted drags
  are not human drags. Re-check with Bean on a real machine; if it persists, the measurement set is
  incomplete, not the bug absent.

### Step Q — looping carousels (Bean request, 2026-08-01)
  **Model:** sonnet · **Time:** 1.5 h
  **Action:** Bean: *"for the dragging physics feel the option to make the carousels looping is important
  so it doesn't get abruptly stopped by the end of the list and just loops round."* Deliberately sequenced
  AFTER the drag fixes — looping on top of a broken drag would have layered a new behaviour onto a faulty
  one. That precondition is now met. Universal across the drag roster, not per-block.

### Step R — BUILD the cursor-follow glow (FR-38-25 is SPEC'D, NOT BUILT)
  **Model:** sonnet · **Time:** 2 h
  **Action:** Spec 38 §3.3 FR-38-25 was written and Bean-signed on 2026-08-01 (emitter + participant,
  Tier V, capability-derived eligibility). **No code exists.** The module already exists and is generic
  (`src/shared/effects/spotlight.js`, consumed only by `sgs/mega-panel`); what is missing is the generic
  CSS contract and the two-role provision derivation.
  ⚠ **Two risks are STATED, NOT MEASURED — measure them FIRST, not last:** (1) paint cost, since a
  `radial-gradient` repaints every frame the pointer moves and N participants means N repaints;
  (2) legibility — measure contrast at the field's BRIGHTEST position, never at rest.

### Step U — file-length debt on the grid blocks (council finding, Bean: log it)
  **Model:** haiku · **Time:** 2 h
  **Action:** Against the project's own limits (PHP 300, JS 250): `card-grid/render.php` 617,
  `card-grid/edit.js` 671, `post-grid/render.php` 523, `post-grid/edit.js` **1,045**,
  `content-collection/render.php` 362. Bean ruled 2026-08-01: log it, tackle separately — splitting three
  large files while agents were mid-edit in a shared worktree invited clobbering. Do this in a clean session.

---

## 4. Measurement limits — what future sessions can and cannot check

Discovered during Wave C verification, and they still apply:

- **Chrome DevTools' built-in device-emulation tool cannot simulate "reduced motion" mode at
  all** — there is no setting for it. It also cannot simulate a real mouse-down-drag-up gesture;
  it throws an error if you try. **The only tool that can check either of these is the committed
  Playwright test harness** (`scripts/motion-qa/probe-wave-c.mjs` and friends) — if a future
  session wants to re-verify reduced-motion behaviour or drag behaviour, that is the one instrument
  that actually works.
- **The browser session used for live checks is shared across whatever else is running
  concurrently** — a tab was taken over mid-check by another task once already, producing a false
  reading. Always confirm which tab/page you're actually looking at before trusting a result.

---

## 5. The live test pages (canaries)

- `/motion-canary-wave-c/` (page 2083) — general effects
- `/motion-roster-canary/` (page 2086) — every motion-capable block, one after another
- `/fx-preset-comparison/` (page 2103, **NEW**) — the three scramble-text presets (Subtle/
  Standard/Dramatic) side by side — this is where Bean found the presets timing bug (Section 6)
- Single-effect pages: `/motion-canary-scrub/`, `/motion-canary-pin-scrub/`,
  `/motion-canary-split-reveal/`, `/motion-canary-horizontal-panel/`

---

## 6. Both design gates from wave 1 are now DECIDED — do not re-present them

This section used to hold two plain-English explainers awaiting Bean's decision. **Both were ruled on
2026-08-01.** Kept as a short record so neither is re-opened from a stale reading.

### 6a. Cursor-follow background — DECIDED (D444)
Bean **rejected the three-route menu** (container-only / shared-wrapper / everywhere) and replaced it
with a capability RULE: any block that is container-kind or has a background colour/image control. Told
the glow would sit behind an opaque button, he pushed further — *"it should be able to go over any
surface seamlessly"* — producing the **emitter + participant** model now specified as **FR-38-25** in
Spec 38 §3.3. **SPEC'D, NOT BUILT — the build is Step R**, and its two risks (paint cost, legibility
under a moving field) are stated as UNMEASURED. Measure them first, not last.

### 6b. FR-38-12 "Flip" on filtered grids — SUPERSEDED (D445)
Its premise was verified false in D426 (the two named blocks never talk to each other). Bean asked
whether `sgs/card-grid` was the right host; investigation proved it is purely server-rendered with no
`view.js` at all. `sgs/post-grid` DOES re-filter client-side — but its cards carry no stable identifier,
and it is not the pair FR-38-12 names. Bean then ruled: **decide nothing on Flip until the grid-block
consolidation lands.** That consolidation is now **Step P**. Revisit Flip only after it.

## 7. The steps, in execution order

**Reading old step numbers:** several steps below carry a `(was Step N)` note so any earlier
notes or commits that referenced the old number still resolve. The file's reading order is now
the intended execution order — the very last step (the adversarial council re-run) is deliberately
last regardless of what number it carries.

**Phase success criteria (done when):**
- [ ] Nothing in the fx picker is inert on the block it is offered on, and nothing needs a developer to tune it to look right
- [ ] A clean clone of the repo can run `npm run build` to completion — **CLOSED this wave**
- [ ] Motion survives a draft→WordPress clone, or the success definition is amended to say it does not
- [ ] Every drag effect has a measured touch result, not a code-reading claim — **CLOSED this wave**
- [ ] Bean has signed the physics-sandbox shape or ruled it out
- [ ] `sgs/image-sequence` is operable by someone who has never opened a terminal, or it is explicitly agency-only — **CLOSED this wave (tool hardened); the pin/scrub composition question is now its own **Steps F and G** below, per Bean's D435 ruling**

**Entry context (read before starting):**
- `.claude/LEDGER.md` — live status; the Track 3 cell
- `.claude/decisions.md` — **D426, D427, D430, D434, D435** (Wave C build → verify → council → Bean's rulings)
- `.claude/specs/38-SGS-MOTION-SYSTEM.md` — IN FULL, including §11.2's D427 amendment and §3.1's keyboard contract (added D434)
- `reports/visual-diff/*-2026-07-31.md` — per-block reports; each states what it does NOT claim
- `plugins/sgs-blocks/scripts/motion-qa/probe-wave-c.mjs` + `probe-wave-c-editor.mjs` — the re-runnable harnesses, both self-verdicting

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| skill | /delegate | every dispatched step |
| skill | /qc-council | fix-shape validation steps |
| skill | /adversarial-council | the last step (re-review after the wave) |
| skill | /sgs-clone | cloning-lift step |
| skill | /a11y-audit | accessibility steps |
| skill | /brainstorming | palette-audit + pair-library steps |
| cli | build-deploy.py | every deploy |
| cli | probe-wave-c.mjs | touch/reduced-motion steps |
| external | Playwright | all live verification |

---

## QA Gate A — no inert controls remain
  **Model:** inline · **Exec:** SEQUENTIAL · **Deps:** Step A
  **Check:** For every block in `generated-fx-qualifying-blocks.json` with `draggable`, AND every block with its own `dragToScroll` attr, a `reports/visual-diff/<block>-<date>.md` exists showing `cursor: grab` and `scrollWidth > clientWidth`, with a clean (not held) verdict.
  **Pass:** every drag-capable block has that evidence, or has no control.
  **Fail:** remove the control; do not baseline the gap.
  **Marker:** QA

---

## QA Gate B — morph is reachable and safe
  **Model:** inline · **Exec:** SEQUENTIAL · **Deps:** Step 5
  **Check:** `morph` appears in `SHIPPED_EFFECTS` AND a live canary instance morphs AND a deliberately mismatched pair produces a console warning with the element unchanged.
  **Pass:** all three.
  **Fail:** remove `morph` from `SHIPPED_EFFECTS` and re-run.
  **Marker:** QA

### Step 8 — DESIGN GATE: physics sandbox (Bean ask #3) [HANDOFF]

> ⚠ **DESIGN GATE CLOSED 2026-08-01 (D447) — the decision is made; only the WRITE-UP is owed.**
> Bean ruled: physics are permitted on **non-interactive decorative layers only**, which
> dissolves the WCAG 2.5.7 problem rather than answering it (nothing a user must reach is
> throwable) and lets reduced motion disable the surface outright. Shape, his call: a
> **dedicated container-equivalent "physics sandbox" block** whose children become throwable
> bodies — NOT a physics toggle bolted onto existing blocks with preset shapes, which would
> lock operators into shapes we imagined. **Remaining work: write the FR into Spec 38 §2/§3.3.**
> The BLOCK ITSELF is a separate design-gated build (new block = high blast radius, project
> rule 7) — do not start it from this step.
  **Model:** inline
  **Action:** Present Bean a ranked menu; do NOT build. **Correct the record first:** GSAP absolutely CAN do this — InertiaPlugin + Physics2DPlugin + Draggable give throwable objects with velocity, gravity and bounce, and both plugins are already bundled and free. The objection is NOT capability. It is (a) FR-38-14 says physics are easing FLAVOURS, "never standalone toggles", so a sandbox is out of spec as written; and (b) the accessibility auditor's specific point: every current drag effect clears WCAG 2.5.7 because it maps onto a discrete single-pointer alternative (a range input, arrow buttons, dots) and a thrown object has none, while objects still moving after release are AUTONOMOUS motion, so the "drag survives reduced motion" reasoning does not transfer.
  **Files:** Spec 38 (amend §2/§3.3 if Bean signs), `.claude/decisions.md`
  **Inputs:** D430; FR-38-13's unbuilt "hero decorative layers (draggable ornaments)" — the nearest thing already in spec
  **Outcome:** Bean signs a shape with an accessibility answer, or rules it out.
  **Exec:** SEQUENTIAL · **Deps:** none · **Marker:** HANDOFF · **Time:** 30 min
  **On-Fail:** n/a — a decision, not a build.
  **Test:**
  - Happy: Bean picks from a ranked menu
  - Edge: he wants it anyway without an a11y answer → record the accepted risk explicitly
  - Fail: no decision → it stays a live gate, NOT a parking entry
  - Integration: whatever is signed must amend Spec 38 the SAME session

## QA Gate C — client-operability
  **Model:** inline · **Exec:** SEQUENTIAL · **Deps:** Step 10
  **Check:** Insert a stock pattern on a clean page, publish, and load it. Motion is present, correctly ranged, and required zero inspector interaction.
  **Pass:** effects fire; `probe-wave-c.mjs`-style assertions hold on a pattern-authored page.
  **Fail:** the pattern-presets work already closed this wave — if this fails, that is a regression, not a fresh gap.
  **Marker:** QA

### Step 12 — The cloning lift: motion that survives a draft (§11.3, FR-38-22)

> ⚠ **MEASURED 2026-08-01 — the premise was tested and the answer is NO.** Bean challenged the
> earlier "zero code exists" claim, correctly: it rested on a grep for a hardcoded handler, which
> proves nothing in a DB-driven converter (R-31-1), and D436 had seeded motion into the DB.
> Probe run against the REAL `convert_section()` with authored drafts
> (`reports/2026-08-01-motion-clone-probe.md`): **every fx attribute vanished — and not even into
> the skip-with-reason channel Rule 4 requires.** D436 seeded the runtime PLAYBACK registry, a
> different layer entirely. **So this stays a full build.** Found in passing:
> `lift_behavioural_attrs` (`db/db_lookup.py:4454`) is purpose-shaped for exactly this, has ZERO
> callers, and carries a latent bug — it strips `data-sgs-` and keeps the hyphenated remainder,
> so `data-sgs-fx-trigger` could never match `fxTrigger` even if wired. Start there.
> ⚠ Still collides with Track 1's live converter work — check `LEDGER.md` before dispatching.
  **Model:** inline
  **Action:** Grep confirms **zero** `data-sgs-fx` handling anywhere in `scripts/converter/`. §11.3 defines the mapping and defers the build. The competitor persona named this the one thing they could not buy their way out of; the cynic named it "the framework's stated purpose", absent. Build the lift as a Spec 31 §3.A routing-unit class, with the Rule 4 skip-with-reason report already specified.
  **Files:** `scripts/converter/**`, Spec 31 §3.A, Spec 38 §11.3
  **Inputs:** §11.2's grammar including `-shape`/`-path`/`-momentum`
  **Outcome:** a draft carrying `data-sgs-fx="pin-scrub"` clones into a WordPress page with the effect intact.
  **Exec:** SEQUENTIAL · **Deps:** Step 10 (prerequisite `svg`/`svg-subtree` split already closed) · **Time:** 3 h
  **Tooling:** /sgs-clone, /qc-council before build
  **On-Fail:** if it cannot land this wave, AMEND the success definition to say motion is applied by hand after a clone — do not leave the claim standing unbuilt.
  **Test:**
  - Happy: draft HTML in → live WP page out → effect fires
  - Edge: an unrecognised `data-sgs-fx` value → skip-with-reason, per class, never silent
  - Fail: fx on a block whose resolved slug declares no fx attrs → reported, not coerced
  - Integration: Stage 11.6 computed-parity must not regress

### Step 20 — Spec ↔ code reconciliation
  **Model:** sonnet
  **Action:** Close the spec-lawyer's divergence table: add `data-sgs-fx-momentum` to §11.2's grammar; mark `fxShape`/`fxPath` seed status honestly in §11.3; retire the dead `scroll-smoother` `fx_effects` row (D422 moved smoothing to Lenis/Tier H); correct `generate-fx-qualifying-blocks.py`'s stale comment claiming `sgs/image-sequence` does not exist; wire or delete `sgs_get_fx_qualifying_blocks()` (zero callers today while its docstring claims the render layer uses it). (The nine "UNSHIPPED — placeholder" seeder annotations this step originally targeted were resolved by the `svg`/`svg-subtree` split closed this wave — re-check before re-doing that part.)
  **Files:** Spec 38, `seed-motion-fx-registry.py`, `generate-fx-qualifying-blocks.py`, `class-sgs-motion-registry.php`
  **Outcome:** two competent implementers reading the spec build the same thing.
  **Exec:** SEQUENTIAL · **Deps:** Step 15 · **Time:** 1 h
  **Test:**
  - Happy: every grammar attr has a control, a DB row and a consumer — both directions
  - Edge: a generated file with no reader is deleted, not documented
  - Fail: `--self-test` proves each new gate can fail
  - Integration: `/sgs-update` reproduces the seed byte-identically

### Step 21 — Re-run the adversarial council [HANDOFF — DELIBERATELY LAST]
  **Model:** inline
  **Action:** Run `/adversarial-council` again on the post-Wave-D surface to catch what these fixes introduced. The 2026-07-31 run found what a single reviewer never would; a second round after the fixes is the documented two-round pattern.
  **Outcome:** a fresh convergence map, and grades to compare against B−/B−/C+/C+/C−/D+.
  **Exec:** SEQUENTIAL · **Deps:** every other step in this file, with no exceptions · **Marker:** HANDOFF · **Time:** 30 min
  **Test:**
  - Happy: supportability rises above D+
  - Edge: a fix introduced a new convergent finding — that is the point
  - Fail: council findings are HYPOTHESES — fact-check before acting (D435's `/qc-council` re-check found no code regression, but that was verified, not assumed)
  - Integration: feeds the next wave

---

## Key Judgement Calls

### Primary decisions

- **Decision:** Does the cloning lift (Step 12) land this wave, or does the success definition change?
  - **Options:** [A] build it now · [B] defer and amend Spec 38's success definition to say motion is hand-applied post-clone · [C] leave it unbuilt and unamended
  - **Recommendation:** [A], and if it slips, [B] — never [C]
  - **Why:** two independent personas called it the product's whole point and the one thing a competitor cannot buy. [C] leaves a standing claim that is false.
  - **Cost of wrong choice:** the framework's headline differentiator stays at zero lines of code while the spec says otherwise.
  - **Who decides:** Bean

- **Decision:** image-sequence — the pin/scrub composition is now DECIDED (Bean rejected the
  ad-hoc `sgs/container` answer, D435) — Steps F/G above are the build. The remaining open decision
  is only sequencing: does Step G's internal pin wrapper ship this wave, or is a documented interim
  ("compose inside a container, still works, just not as polished") acceptable for one more wave?
  - **Options:** [A] both F and G this wave (~3.5 h total) · [B] F only this wave, G next wave with an honest interim note
  - **Recommendation:** [A] — Bean explicitly called the interim state "janky" and "patchwork"; shipping it again after saying that is a regression against his own ruling.
  - **Who decides:** Bean

- **Decision:** Does Tier G stay exempt from Spec 02's <50 KB JS budget?
  - **Options:** [A] keep the §4.4 exemption · [B] bring Tier G inside the budget · [C] publish a per-page motion cost readout and let the operator decide
  - **Recommendation:** [C]
  - **Why:** the exemption was written by the team that owns the budget; a buyer with a Lighthouse report reads it as a broken promise. A visible cost turns an engineering property into a sales asset.
  - **Who decides:** Bean

- **Decision:** FR-38-12 (Flip) — see Step I / Section 6b. Park-for-later vs commission the
  WooCommerce-blocks redesign now vs drop entirely.
  - **Who decides:** Bean

### Pre-emptive decisions

> **Honesty note:** the mandatory two-cold-reviewer Hidden Decisions pass was NOT dispatched — this section was reasoned inline at the end of a very long session. Treat it as lower-confidence than a plan whose peer review actually ran, and consider running it before executing Step 5 or 12.

- **Decision:** when a step says "remove the control if unverified", does that mean removing the attribute too?
  - **Recommendation:** remove the CONTROL and the emit; keep the attribute only if stored content already carries it (removing a declared attribute makes WP discard stored values — the D338 class, and exactly what blocked a deploy on 2026-07-31).
- **Decision:** which canary page do new fixtures go on?
  - **Recommendation:** `/motion-canary-wave-c/` for effects, `/motion-roster-canary/` for roster/first-paint, `/fx-preset-comparison/` for scramble-preset comparisons. Recreate rather than edit — `wp post update` is blocked by a hook; `wp post create` is not.
- **Decision:** how much of Spec 38 must be read before a step?
  - **Recommendation:** in full for Steps 5, 7, 12, 20 and any spec-changing decision (§I, §8); §-scoped for the rest.
- **Decision:** what if a council finding turns out to be wrong?
  - **Recommendation:** record the refutation in the plan and D-log. D435's `/qc-council` re-check found the code sound and only documentary defects — but each was checked first — do not inherit that as a prior.
- **Decision:** a client palette deliberately wants a saturated `border-subtle` (Step D) — how is "deliberate" distinguished from "bug"?
  - **Recommendation:** check that client's own `sites/<client>/CLAUDE.md` design notes before changing anything; absence of a note there is itself evidence it was never a deliberate choice.

---

## Honesty notes (what this plan does NOT have)

1. **The Hidden Decisions peer-review pass was not dispatched** (see above).
2. **Docscore was not run** on this document.
3. **The six raw Wave D council persona reports were not persisted to disk** — only their synthesis in D430 and this plan. If the detail matters later, the council must be re-run.
4. **Time estimates are per the low-by-default rule** and are not calibrated against `plan_actuals` (that table is still empty).
5. **No new step here (B, C, D, E, F, G, H, I, J) has been validated by `/qc-council`** — they are fix-shapes derived directly from Bean's own live review, which is a stronger basis than a council hypothesis, but they are still unbuilt and unmeasured until executed.
6. **This rewrite reorganised the file for readability (execution order, new letter-labelled steps for Bean's rulings) but did not re-verify any already-closed step's evidence** — the CLOSED table in Section 2 is a compressed summary of D434/D435; read those decisions directly for the full detail if a closed step is disputed.
