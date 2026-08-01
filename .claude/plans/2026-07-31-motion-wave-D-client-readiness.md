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
closed. What remains is 13 open steps, listed below in the order they should run.

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

### Step L — the fx inspector panel is linted by nothing (was P-FX-PANEL-UNGUARDED-BY-EVERY-CONTROL-GATE)
  **Model:** sonnet
  **Action:** `check-dead-controls.js:514`, `check-control-ux.js:455` and
  `audit-inspector-conformance.js:270` all either exclude `src/blocks/extensions/` or enumerate
  blocks by `block.slug`, so none of them ever reaches the fx panel. It has never been linted by any
  of them — which is why `fxTrigger` sat registered-and-rendered-by-nothing with no gate noticing.
  Spec 38 §7 claims the conformance gate "covers every new panel automatically". **For this panel
  that is false.**
  **Fix shape:** extend ONE guard to cover `src/blocks/extensions/*.js`, treating JS-filter-registered
  attributes as the declared set (they are invisible to a `block.json`-only audit). Ship it with a
  `--self-test` that injects a dead control and proves the guard FAILS on it.
  **⚠ Now more urgent than when parked:** the wave of 2026-08-01 added several new fx controls
  (morph shape picker, motion-path resting position + vh slider) — all shipped through this same
  unguarded surface.
  **Exec:** SEQUENTIAL · **Deps:** none · **Time:** 1.5 h
  **On-Fail:** a gate that cannot fail reads green forever — do not ship it without the self-test.

### Step E-residual — motion-path: the ~2,705px jump (skew half is CLOSED)
  **Model:** sonnet · **Time:** 1.5 h
  **Action:** The route SVG resolves against `.entry-content` and measures **1200 × 7471.66px** — a
  route box the height of the page — so the traveller's displacement is an order of magnitude bigger
  than its own box. **Causally proven to be ONE defect with the "ends under the header" symptom**, by
  intercepting the live response and forcing the route box to 600px: both the excursion's magnitude
  and where it resolved changed measurably.
  ⚠ **THREE approaches are already ruled out by measurement — read `assets/css/fx-motion-path.css`'s
  docblock IN FULL before proposing anything:** (a) capping height to
  `min(100%, 100vh − var(--sgs-header-height))` just relocates the defect earlier in the scroll;
  (b) `:has(> svg.sgs-fx-path-route){position:relative}` is a no-op because the SVG's parent already
  IS `.entry-content`; (c) nesting the SVG inside the traveller gives a local containing block but
  breaks `sgs/decorative-image`, an `<img>` void element that cannot take children — not universal (R-31-9).
  **Also unresolved:** the docblock records a genuine design tension — "the arc spans its section at
  the section's real width/height" and "the traveller is never skewed" cannot both hold for an
  auto-rotating traveller on a non-uniformly scaled path. The skew fix chose un-skewed. Restoring
  full-bleed needs a mechanism that scales the PATH without handing a non-uniform CTM to the
  traveller — **not** a re-added `preserveAspectRatio`.
  **On-Fail:** do not ship a CSS-only fix; the three above were measured failing.

### Step M — `sgs-healthcare` idle-dot contrast fails at 2.97:1
  **Model:** haiku · **Time:** 20 min
  **Action:** That client's own `text-muted` (`#7A9BA6`) is too light against its white surface, so the
  slider's idle dots miss the 3:1 WCAG UI-component floor even after the token fix. `sgs-mosque` passes
  but only just, at 3.09:1. **Check `sites/sgs-healthcare/CLAUDE.md` before changing anything** — if the
  value is a deliberate brand choice, record it as accepted rather than overwriting an owner's decision.

### Step N — image-sequence pin: verify the pin-ON path live
  **Model:** haiku · **Time:** 30 min
  **Action:** `data-sgs-fx-pin` exists in source and the scrub half is verified, but **no live instance
  had pin enabled**, so the ON path has never been observed. Build a fixture with pin ON and measure:
  it pins, scrubs its full range, releases, and — per §10 — does not become autonomous motion under
  reduced motion once released.

### Step O — the drag text-selection symptom Bean saw is UNREPRODUCED
  **Model:** sonnet · **Time:** 45 min
  **Action:** Bean reported drag selecting page text ("it doesn't even look like it's registering as
  this drag interaction"). The scroll-behavior race and the missing dot listener are FIXED and verified,
  but the selection symptom **could not be reproduced** across Chromium, WebKit or Firefox with scripted
  drags. A cause-agnostic mitigation shipped (`user-select: none` held from pointerdown through release).
  **Per the measurement-vs-eye rule, Bean's report STANDS over the null measurement** — scripted drags
  are not human drags. Re-check with Bean on a real machine; if it persists, the measurement set is
  incomplete, not the bug absent.

### Step P — fold `sgs/content-collection` into `sgs/card-grid` (council-decided, Bean-approved)
  **Model:** sonnet · **Time:** 4 h
  **Action:** Four independent council seats voted 3–1 to retire it (capability dissented). Bean approved
  the fold. **The dissent is a CONDITION, not a veto, and must be honoured:** `content-collection` works
  WITHOUT WooCommerce (falls back to the `sgs_product` CPT) whereas `card-grid`'s product mode hard-gates
  on `wc_get_products` and returns empty without it. So the port must carry across: (1) the 7 meta-driven
  selection rules (newest/featured/most-expensive/cheapest/most-popular/handpicked/category), (2) rendering
  items through `sgs/product-card` in `sgs-cpt` mode — `card-grid`'s `query` mode currently emits its own
  generic card markup, (3) the N+1 `update_meta_cache()` guard.
  **Keep `sgs/post-grid` separate** — it is the editorial/blog block, has the only `view.js` of the three,
  and IS in live use at `theme/sgs-theme/parts/sidebar.html:4`.
  ⚠ **D163 does NOT pre-answer this.** It ruled on `content-collection`↔`post-grid` and
  `feature-grid`↔`card-grid`, never this pair, and its cited mechanism (`has_inner_blocks`) was DROPPED
  from the DB on 2026-07-05 for silently mis-routing.
  **Then:** add pagination to `card-grid` by extracting `post-grid`'s proven implementation into a shared
  helper — do it ONCE, after the fold, so a third copy is never created.

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

### Step S — remove the dead buybox fixtures from the roster canary (page 2086)
  **Model:** haiku · **Time:** 30 min
  **Action:** Two `sgs/buybox` instances sit on page 2086, a plain page where they can NEVER render:
  `wc_get_product(2086)` returns false and the core-WC fallback blocks need ambient product context.
  `sgs/buybox` is a **single-product PDP block** by its own block.json and by Spec 30 — this is correct
  behaviour, not a bug, and **the block must NOT be given a product-picker attribute**, which would widen
  it beyond its specified scope. Bean approved testing it on the product page instead (2026-08-01).
  The 2086 instances are noise that will keep generating false "empty block" findings for every future
  session — remove them. `wp post update` is hook-blocked, so this needs a page rebuild.

### Step V — buybox thumbnail strip has no drag handler (prerequisite now satisfied)
  **Model:** sonnet · **Time:** 1 h
  **Action:** VERIFIED LIVE 2026-08-01 on `/product/mamas-test-box-48-sku-fixture/`: the buybox renders
  correctly (gallery col 658.97px + configurator col 573.03px), the thumb strip genuinely overflows
  (`scrollWidth 712 > clientWidth 659`, max scroll 53px), and Size/Flavour pickers are present — **but a
  real Playwright mouse drag does NOT move the strip** (`scrollLeft` stayed 0; wheel deltaX also no-op;
  forcing `scrollLeft` via JS DOES work and clamps to 53, proving the container is scrollable with no
  user-input handler bound).
  **Not a regression.** `src/blocks/buybox/block.json` already documents this gap in a comment dated
  2026-07-31: buybox "does NOT yet have its own drag toggle either", with **"a product-page fixture"**
  named as the blocking prerequisite. **That prerequisite is now satisfied** — the product page above is
  the fixture. Wire the shared drag module (`shared/effects/gsap/fx-draggable.js`) to the strip, honouring
  the same `scroll-behavior`/snap suspension the roster fix added.
  ⚠ Note the held patch `reports/visual-diff/buybox-drag-toggle-2026-08-01.patch` — re-apply and finish it
  rather than rewriting from scratch, and commit it honestly this time or revert it; do NOT leave it dirty
  in the shared tree (it blocked another track's deploy once already).

### Step T — the deploy ⇄ commit gate deadlock (STRUCTURAL, found 2026-08-01)
  **Model:** sonnet · **Time:** 1 h
  **Action:** `build-deploy.py` refuses a dirty tree and says *"commit them"*; the pre-commit visual-diff
  gate refuses without a passing per-block report, which requires a live deploy. **Neither can go first.**
  Broken on 2026-08-01 only by using `--allow-dirty` on the canary with Bean's explicit one-off consent —
  a flag CLAUDE.md names as D336's trigger. This will trap every future wave identically.
  **Fix shape:** allow the visual-diff gate to accept a canary-deploy-then-verify order, or let the deploy
  gate distinguish "dirty with the payload being deployed" from "dirty with unrelated unfinished work".
  Ship with a `--self-test`.

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

### Step 6 — before/after video and SVG sources (Bean ask #2)
  **Model:** sonnet
  **Action:** `sgs/before-after` renders via `wp_get_attachment_image()` with a URL fallback — not
  the shared media helper — so no video, and SVG only as a flat image. Bean ruled this KEPT (the
  council's delivery lead wanted it cut; Bean overrode, and the competitor persona agreed with
  Bean: it is what every physio/beauty/renovation brief asks for). Adopt `sgs/media`'s proven
  `mediaType` fork rather than inventing a second media model.
  **Files:** `src/blocks/before-after/{block.json,edit.js,render.php,view.js,style.css}`
  **Inputs:** `sgs/media`'s mediaType implementation; `reports/visual-diff/before-after-2026-07-31.md`
  **Outcome:** before/after compares two videos, two images, or a mix, with synchronised playback for the video case.
  **Exec:** PARALLEL with Step 6b · **Deps:** none · **Time:** 1.5 h
  **Tooling:** /wp-block-development
  **On-Fail:** ship image+SVG only and record video as owed — do NOT ship a half-working video path.
  **Prompt:** *(generate at dispatch.)*
  **Test:**
  - Happy: two videos, both playing, divider splits them in sync
  - Edge: videos of different durations / one fails to load
  - Fail: JS blocked → both media still present, CSS-only split still correct (the existing fail-open contract)
  - Integration: reduced motion — autoplay must not fire; §10 SIMPLIFY for the drag

### Step 6b — before/after: all FOUR reveal directions (Bean ask #5)
  **Model:** sonnet
  **Action:** The block currently reveals AFTER on the LEFT (horizontal) — coherent, and Bean has
  ruled it stays the DEFAULT. Add the other three directions as options: horizontal reversed
  (after on the right, the more common convention), vertical after-on-top, and vertical
  after-on-bottom. `orientation: horizontal|vertical` ALREADY EXISTS as an attribute and the
  vertical `clip-path` already exists in `style.css:64-66`; what is missing is a REVERSE option per
  axis, and the matching label ordering.
  **Files:** `src/blocks/before-after/{block.json,edit.js,render.php,style.css}`,
  `reports/visual-diff/before-after-*.md`
  **Inputs:** `reports/visual-diff/before-after-labels-2026-07-31.md` — read it first. It records
  the defect fixed on 2026-07-31 (labels sat over the WRONG image because `__labels` is
  `justify-content: space-between`, render.php emits BEFORE first, and the clip puts AFTER on the
  left) and the CSS `order` fix. **Every new direction needs its own label-order rule or it
  reintroduces exactly that bug** — which no numeric probe caught, because they all asked whether
  the divider MOVED and none asked what was on each side of it.
  **Outcome:** four working reveal directions, each with labels sitting over the image they name.
  **Exec:** PARALLEL with Step 6 · **Deps:** none (but coordinate: same block as Step 6's video
  work — do them in one agent or sequence them) · **Time:** 45 min
  **Tooling:** Playwright (screenshot each direction — this is a LOOK-AT-IT defect class)
  **On-Fail:** the current default is correct and shipped; a failed variant is revertible alone.
  **Prompt:** *(generate at dispatch — it MUST require a screenshot per direction with the label
  side measured against the clipped image's src, not just "the divider moved".)*
  **Test:**
  - Happy: each of the 4 directions reveals the right image on the right side, labels matching
  - Edge: dragging to 0% and 100% in each direction — no flipped or stranded label
  - Fail: reduced motion + keyboard range input still operate every direction
  - Integration: the drag gesture and the native range input must agree in all four

### Step 23 — Replace the before/after test imagery
  **Model:** haiku
  **Action:** At ≤768px both `sgs/before-after` canary instances show a small black/white
  checkerboard mark in the top-left corner, overlapping the "After" label. PROVEN (not guessed) to
  be baked into the source test images: `frame_0001.webp` / `frame_0048.webp` carry the marker even
  when loaded with zero page styling. It is the frame-index stamp the motion-canary test-image
  generator puts on every frame. `object-fit: cover` crops it out above ~1024px and back into frame
  below it — which is why it reads as a responsive bug and is not one. Swap in real photography so
  the canary stops showing a defect that is not in the code.
  **Files:** canary media only — no source change
  **Outcome:** the before/after canary can be judged on its own merits without a false defect on it.
  **Exec:** PARALLEL with anything · **Deps:** none · **Time:** 15 min
  **On-Fail:** none — worst case the marker stays and is a known cosmetic artefact of test media.
  **Test:**
  - Happy: no marker at 375/768; labels sit over the image they name (do not regress the D431 fix)
  - Edge: check 1024 and 1440 too — the crop behaviour differs by width
  - Fail: if a marker persists with real imagery, it is NOT the source images and needs re-diagnosis
  *(Was briefly filed in parking.md; Bean moved it here 2026-07-31 for the same reason as Step 22.)*

---

### Step 8 — DESIGN GATE: physics sandbox (Bean ask #3) [HANDOFF]
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

### Step 10 — Preset + param normalisation OUTSIDE the editor
  **Model:** sonnet
  **Action:** Preset application and stale-param clearing live in the editor's control handlers, so content arriving from a pattern, a clone or the converter bypasses both. Measured this session: setting `fxPreset` via the data store wrote no params, and `fxSplit: "chars"` survived a switch to `scrub`. Move normalisation to a render-time or `register_block_type` filter so stored content is normalised regardless of origin.
  **Files:** `includes/fx-attributes.php`, `src/blocks/extensions/fx.js`
  **Inputs:** the `/qc-inline` partials recorded in D430
  **Outcome:** a cloned or pattern-authored block behaves identically to a hand-configured one.
  **Exec:** SEQUENTIAL · **Deps:** none (prerequisite pattern-presets work already closed) · **Time:** 45 min
  **On-Fail:** the editor path already works; a failed filter is revertible with no data loss.
  **Test:**
  - Happy: attributes set via the data store produce the same rendered result as via the UI
  - Edge: a preset name that no longer exists in `fx-presets.json`
  - Fail: params for a non-active effect are stripped, not silently rendered
  - Integration: must not fight `/sgs-update`'s attr extraction

## QA Gate C — client-operability
  **Model:** inline · **Exec:** SEQUENTIAL · **Deps:** Step 10
  **Check:** Insert a stock pattern on a clean page, publish, and load it. Motion is present, correctly ranged, and required zero inspector interaction.
  **Pass:** effects fire; `probe-wave-c.mjs`-style assertions hold on a pattern-authored page.
  **Fail:** the pattern-presets work already closed this wave — if this fails, that is a regression, not a fresh gap.
  **Marker:** QA

### Step 12 — The cloning lift: motion that survives a draft (§11.3, FR-38-22)
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

### Step 15 — Per-breakpoint motion disable
  **Model:** sonnet
  **Action:** §6 item 4 says per-tier fx values are a v2 candidate. But "turn animation off on mobile" is, per the competitor persona, the single most common post-launch agency request — and it needs only a BOOLEAN per tier, not per-tier values. Add `fxDisableTablet`/`fxDisableMobile` using the EXISTING breakpoint suffix vocabulary, gating both the registry's enqueue and the module's matchMedia.
  **Files:** `includes/fx-attributes.php`, `class-sgs-motion-registry.php`, `src/blocks/extensions/fx.js`, seeder
  **Outcome:** a client can switch an effect off per device tier.
  **Exec:** SEQUENTIAL · **Deps:** Step 10 · **Time:** 1 h
  **Test:**
  - Happy: disabled on mobile → zero GSAP bytes on a mobile viewport
  - Edge: disabled on ALL tiers → same as no effect
  - Fail: attr present but registry still enqueues → the byte claim breaks
  - Integration: FR-38-3's zero-bytes promise must still hold

### Step 18 — Support surface for Bean
  **Model:** sonnet
  **Action:** Skip-with-reason writes to `error_log` behind `WP_DEBUG` — on Hostinger, Bean will never see it. When a client says "the animation is broken" there is nothing to look at. Build an admin panel listing effects in use on a page, bytes shipped, and effects skipped with reason.
  **Files:** a new admin page under the SGS settings surface
  **Outcome:** Bean can diagnose a motion complaint without SSH.
  **Exec:** PARALLEL with Step 19 · **Deps:** none · **Time:** 1 h
  **Test:**
  - Happy: a page with 3 effects lists all 3 + byte total
  - Edge: a page with zero effects says so plainly
  - Fail: a skipped effect appears WITH its reason
  - Integration: must not run on the frontend

### Step 19 — Per-PAGE motion budget
  **Model:** haiku
  **Action:** `check-motion-bundle-budget.py` measures modules, not pages. Pin-scrub + split-reveal + draw + scramble + an image sequence is constructible in the editor and lands ~55 KB gz against Spec 02's <50 KB. Assert per-page in the canary probe and warn in the editor.
  **Files:** `scripts/check-motion-bundle-budget.py`, `probe-wave-c.mjs`
  **Outcome:** the budget claim is enforced where it is actually spent.
  **Exec:** PARALLEL with Step 18 · **Deps:** none · **Time:** 45 min
  **Test:**
  - Happy: a heavy page trips the warning
  - Edge: exactly at the threshold
  - Fail: §4.4 declares Tier G "OUTSIDE" the Spec 02 budget — decide whether that exemption stands and record it
  - Integration: must not fire on a zero-motion page

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

### Step 22 — Pin/panel keyboard contract: observe it, don't infer it
  **Model:** sonnet
  **Action:** The keyboard story for both pinning effects was measured and closed (Spec 38 §3.1) —
  but every canary fixture with an active pin contains NO focusable element inside the pin. So the
  one case accessibility review actually worried about (a Tab press landing on a control while the
  panel is pinned) has never been exercised. The recorded pass is by MECHANISM (the pin does not
  trap focus, reasoned from how it is built), not by OBSERVATION. Build a fixture with real
  interactive content inside a pinned section — links, a button, a form field — and re-run the
  probe against it.
  **Files:** a new canary fixture; `scripts/motion-qa/probe-step13-pin-focus.mjs` (extend)
  **Inputs:** Spec 38 §3.1's keyboard focus contract (added D434); `probe-step13-pin-focus.mjs`
  **Outcome:** the contract is observed, not inferred — or a real 2.4.11 defect surfaces.
  **Exec:** SEQUENTIAL · **Deps:** none · **Time:** 40 min
  **On-Fail:** if focus IS trapped or scrolled out of view, that is a genuine WCAG 2.4.11 failure
  and outranks the rest of the wave.
  **Test:**
  - Happy: Tab onto a button inside an active pin → focus visible, pin does not desync
  - Edge: Tab THROUGH the pinned content and out the far side
  - Fail: focused control scrolls out of view → 2.4.11 failure, must be fixed
  - Integration: reduced-motion arm must preserve the same focus order
  *(Was briefly filed in parking.md; Bean moved it here 2026-07-31 — parking is strictly BLOCKED or
  POSTPONED work, and this is planned work with a named next action.)*

---

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
