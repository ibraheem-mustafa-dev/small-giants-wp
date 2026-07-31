Invoke /autopilot before doing anything else.

> ⚠ THIS FILE IS A POINTER, NOT THE TRUTH. Live status = `.claude/LEDGER.md` — if it contradicts this plan, the LEDGER wins.
> ⚠ **GATE 1:** Spec 38 must read `status: active`. **GATE 2:** Waves A, B and C are CLOSED (D414–D417, D422, D424, D426, D427, D430). This wave consumes all three. If a gate fails, STOP.
> ⛔ **DEPLOY HAZARD, PROVEN TWICE.** The shared tree's compiled `build/` contains co-active tracks' uncommitted `render.php` edits, and `assets/` is a separate directory a partial worktree copy silently misses (that error shipped a 404 stylesheet on 2026-07-31 and rendered a hidden SVG as a 1200×1200 black shape). Use the isolated-worktree recipe in Tool bindings and copy **src + includes + scripts + assets + build**.
> ⛔ **NEVER add anything from this plan to `parking.md`.** Bean-ruled 2026-07-31: parking is strictly for BLOCKED or POSTPONED work, never a reminder list. This plan IS the register.
> **This session runs in PLAN MODE first** — investigate, present, get approval, then build.

# Phase — Motion Wave D: client-readiness

**USP:** Wave C proved the motion ENGINE works. Wave D is what turns it into something a tech-illiterate client can actually operate and a five-site delivery schedule can actually carry — which is the whole reason Spec 38 exists.

**Plan label:** `[PLAN: opus]` — three items are architectural (cloning lift, morph-on-any-block, physics design gate) and two are owner-signed design decisions.

**Docscore:** not run (see Honesty notes).

**Aggregate cost estimate:** ~9–11 h across 21 steps if all are taken; the wave is deliberately splittable at each QA gate.

## Where this came from (read this first — it is not a wish list)

On 2026-07-31 a six-persona adversarial council reviewed the whole motion surface, and Bean reviewed the live canary with his own eye and returned 11 findings. **Items 1–7 of that register were built and shipped the same session** (commits `6c8d78ca`, and `8da30b13`/`8172d8f4`/`02e87ee9`/`f7f61ebf` before it). This plan carries **everything that was NOT closed**, plus four new asks Bean added.

Council grades that motivate the ordering: shippability **B−**, accessibility **B−**, competitive defensibility **C+**, specification rigour **C+**, maintainability **C−**, **supportability D+**.

**Phase success criteria (done when):**
- [ ] Nothing in the fx picker is inert on the block it is offered on, and nothing needs a developer to tune it to look right
- [ ] A clean clone of the repo can run `npm run build` to completion
- [ ] Motion survives a draft→WordPress clone, or the success definition is amended to say it does not
- [ ] Every drag effect has a measured touch result, not a code-reading claim
- [ ] Bean has signed the physics-sandbox shape or ruled it out
- [ ] `sgs/image-sequence` is operable by someone who has never opened a terminal, or it is explicitly agency-only

**Entry context (read before starting):**
- `.claude/LEDGER.md` — live status; the Track 3 cell
- `.claude/decisions.md` — **D426, D427, D430** (Wave C: built → verified → council)
- `.claude/specs/38-SGS-MOTION-SYSTEM.md` — IN FULL, including §11.2's D427 amendment
- `reports/visual-diff/*-2026-07-31.md` — eight per-block reports; each states what it does NOT claim
- `plugins/sgs-blocks/scripts/motion-qa/probe-wave-c.mjs` + `probe-wave-c-editor.mjs` — the re-runnable harnesses, both self-verdicting

**References:**
- Council verdicts are summarised in D430; the raw persona reports were not persisted (see Honesty notes)
- `~/.claude/rules/prove-the-cause-before-fix.md` — binding on every step here
- Correction ledger: `a-probe-that-never-reaches-the-effect-is-measuring-the-probe` (captured this session)

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| skill | /delegate | every dispatched step |
| skill | /qc-council | Steps 4, 12 (fix-shape validation) |
| skill | /adversarial-council | Step 21 (re-review after the wave) |
| skill | /sgs-clone | Step 12 (cloning lift) |
| cli | build-deploy.py | every deploy |
| cli | probe-wave-c.mjs | Steps 2, 6, 9, 14 |
| external | Playwright | all live verification |

---

## Step 1 — Touch measurement on every drag surface [SESSION-START]
  **Model:** inline
  **Action:** Run the frontend probe under a real coarse-pointer emulation (Playwright `hasTouch: true`, `isMobile: true`, 390×844) against `/motion-canary-wave-c/` and `/motion-roster-canary/`. Assert the native scroll path still works and that `fx-draggable.js` binds nothing.
  **Files:** `plugins/sgs-blocks/scripts/motion-qa/probe-wave-c.mjs`
  **Inputs:** the two canary pages; `fx-draggable.js`'s `(pointer: fine)` gate
  **Outcome:** a measured touch result replaces the current "by construction" claim in four visual-diff reports.
  **Exec:** SEQUENTIAL · **Deps:** none · **Marker:** SESSION-START · **Time:** 20 min
  **Tooling:** Playwright
  **On-Fail:** if drag DOES bind on touch, that is a real defect — stop and fix the gate before anything else.
  **Cold-Entry:** this plan + `fx-draggable.js` docblock + `reports/visual-diff/gallery-2026-07-31.md`
  **Test:**
  - Happy: coarse pointer → `cursor` stays `auto`, native scroll moves the track
  - Edge: a device with BOTH touch and a mouse (`hasTouch` + fine pointer) — which branch wins?
  - Fail: emulation not taking effect → both arms identical → report INCONCLUSIVE, never PASS
  - Integration: reduced-motion × touch together

## Step 2 — Prove drag on post-grid and google-reviews, or remove them
  **Model:** inline
  **Action:** Give each block a fixture that genuinely overflows at 1440px (post-grid: enough published posts; google-reviews: a review source the block actually consumes — the `dataSource` enum was never exercised). Re-run the roster capture. If a block still cannot be made to overflow, REMOVE its drag toggle rather than ship an unverified control.
  **Files:** `reports/visual-diff/post-grid-*.md`, `google-reviews-*.md`, both blocks' `block.json`/`edit.js`/`render.php`
  **Inputs:** `reports/visual-diff/post-grid-2026-07-31.md` (records `scrollWidth 1200 === clientWidth 1200`, module correctly declined)
  **Outcome:** both blocks show `cursor: grab` and a real overflow, or their controls are gone.
  **Exec:** PARALLEL with Step 3 · **Deps:** none · **Time:** 40 min
  **Tooling:** wp-cli, Playwright
  **On-Fail:** removal is the acceptable outcome — do not weaken the assertion to make it pass.
  **Test:**
  - Happy: `scrollWidth > clientWidth` and `cursor: grab`
  - Edge: exactly one item more than fits — does the guard still fire correctly?
  - Fail: fixture cannot overflow → remove the control, record why
  - Integration: momentum on/off two-arm control, as `sgs/gallery` uses

## Step 3 — buybox drag, with the product-page fixture it needs
  **Model:** sonnet
  **Action:** `sgs/buybox` requires a WooCommerce variable product IN CONTEXT, so it renders nothing on an ordinary page — its capture could not be taken on 2026-07-31 and its drag toggle was deliberately NOT shipped (only a metadata-only `providesNatively` suppression). Create a product-page fixture, then either ship the toggle with real evidence or record it as declined.
  **Files:** `src/blocks/buybox/{block.json,edit.js,gallery-col.php}`, `reports/visual-diff/buybox-*.md`
  **Inputs:** `buybox/block.json`'s `_comment_providesNatively` (states the prerequisite); product 1125 on the canary
  **Outcome:** buybox's thumbnail strip drags with evidence, or the capability is formally declined.
  **Exec:** PARALLEL with Step 2 · **Deps:** none · **Time:** 45 min
  **Tooling:** wp-cli, WooCommerce, Playwright
  **On-Fail:** declining is a legitimate outcome; an unverified PDP control on a real shop is not.
  **Prompt:** *(to be generated via /subagent-prompt at dispatch — it must embed the product-in-context prerequisite verbatim, or the agent will repeat the empty-render dead end.)*
  **Test:**
  - Happy: thumbs strip overflows and drags on a product page
  - Edge: simple (non-variable) product — the fallback path
  - Fail: no product context → block renders nothing → do not claim a capture
  - Integration: drag must not interfere with the variant picker's own pointer handling

## QA Gate A — no inert controls remain
  **Model:** inline · **Exec:** SEQUENTIAL · **Deps:** Steps 1–3
  **Check:** For every block in `generated-fx-qualifying-blocks.json` with `draggable`, AND every block with its own `dragToScroll` attr, a `reports/visual-diff/<block>-<date>.md` exists showing `cursor: grab` and `scrollWidth > clientWidth`.
  **Pass:** every drag-capable block has that evidence, or has no control.
  **Fail:** remove the control; do not baseline the gap.
  **Marker:** QA

## Step 4 — Split the `svg` provision into `svg` and `svg-subtree` [SESSION-START]
  **Model:** sonnet
  **Action:** `fx_effects.requires = 'svg'` currently conflates "this block IS a shape" (the 4 element blocks — correct for `morph`) with "this block CONTAINS inline SVG" (container/hero/cta-section/trust-bar via `bgSvgContent` — correct for `draw`). Consequence today: those four are offered `morph`, which warns and skips on a `<div>`. Introduce `svg-subtree`, reseed, regenerate.
  **Files:** `scripts/seed-motion-fx-registry.py`, `scripts/generate-fx-qualifying-blocks.py`
  **Inputs:** stream B's flagged finding, recorded in D430
  **Outcome:** `morph` is offered only where an element genuinely has shape geometry.
  **Exec:** SEQUENTIAL · **Deps:** none · **Marker:** SESSION-START · **Time:** 45 min
  **Tooling:** /sgs-db, /qc-council (validate the token split before building)
  **On-Fail:** revert the reseed; the DB is idempotent.
  **Cold-Entry:** this plan + Spec 38 §2 DrawSVG/MorphSVG rows + `generate-fx-qualifying-blocks.py` docstring
  **Prompt:** *(generate at dispatch.)*
  **Test:**
  - Happy: container offers `draw` but not `morph`; icon offers both
  - Edge: a block with both `bgSvgContent` AND its own SVG render path
  - Fail: reseed leaves an effect with no qualifying block → roster empty → build gate catches it
  - Integration: `/sgs-update` rebuild reproduces the seed byte-identically

## Step 5 — Morph on any block (Bean ask #1)
  **Model:** inline
  **Action:** `fx-morph.js` rewrites `el`'s own `d`, so today the traveller must itself be a shape. Bean wants morph reachable from any block. Design and build the render-layer hop: a `-morph-source` selector, or the same descendant-attachment pattern `sgs_fx_data_attr_string()` already provides, so a block's CONTAINED SVG morphs. Then build the curated matched-topology pair library and the §7 asset gate.
  **Files:** `includes/fx-attributes.php`, a new pair-library data file, `src/blocks/extensions/fx.js`, `fx-morph.js` (read-only if possible)
  **Inputs:** D427's signed preset-first design; stream C's note that the plumbing is cheap and the PAIR LIBRARY is the real cost
  **Outcome:** a client picks a shape pair from thumbnails on any block, and it morphs.
  **Exec:** SEQUENTIAL · **Deps:** Step 4 · **Time:** 2.5 h
  **Tooling:** /brainstorming (pair library), /qc-council before build
  **On-Fail:** ship the control gated to shape-bearing blocks only; do not ship an unreachable control (`SHIPPED_EFFECTS` exists to prevent exactly that).
  **Test:**
  - Happy: a `sgs/icon` inside a `sgs/container` morphs between a preset pair
  - Edge: block contains MULTIPLE SVGs — which is chosen, and is that predictable?
  - Fail: mismatched topology → warn and skip, element stays at its rendered shape
  - Integration: reduced motion = SUPPRESS (final shape only), per §10

## QA Gate B — morph is reachable and safe
  **Model:** inline · **Exec:** SEQUENTIAL · **Deps:** Steps 4–5
  **Check:** `morph` appears in `SHIPPED_EFFECTS` AND a live canary instance morphs AND a deliberately mismatched pair produces a console warning with the element unchanged.
  **Pass:** all three.
  **Fail:** remove `morph` from `SHIPPED_EFFECTS` and re-run.
  **Marker:** QA

## Step 6 — before/after video and SVG sources (Bean ask #2)
  **Model:** sonnet
  **Action:** `sgs/before-after` renders a plain `<img>` (`render.php:111`), not the shared media helper — so no video, and SVG only as a flat image. Bean ruled this KEPT (the council's delivery lead wanted it cut; Bean overrode, and the competitor persona agreed with Bean: it is what every physio/beauty/renovation brief asks for). Adopt `sgs/media`'s proven `mediaType` fork rather than inventing a second media model.
  **Files:** `src/blocks/before-after/{block.json,edit.js,render.php,view.js,style.css}`
  **Inputs:** `sgs/media`'s mediaType implementation; `reports/visual-diff/before-after-2026-07-31.md`
  **Outcome:** before/after compares two videos, two images, or a mix, with synchronised playback for the video case.
  **Exec:** PARALLEL with Step 7 · **Deps:** none · **Time:** 1.5 h
  **Tooling:** /wp-block-development
  **On-Fail:** ship image+SVG only and record video as owed — do NOT ship a half-working video path.
  **Prompt:** *(generate at dispatch.)*
  **Test:**
  - Happy: two videos, both playing, divider splits them in sync
  - Edge: videos of different durations / one fails to load
  - Fail: JS blocked → both media still present, CSS-only split still correct (the existing fail-open contract)
  - Integration: reduced motion — autoplay must not fire; §10 SIMPLIFY for the drag

## Step 6b — before/after: all FOUR reveal directions (Bean ask #5, added 2026-07-31)
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

## Step 7 — Background cursor-follow effects (Bean ask #4)
  **Model:** inline
  **Action:** Bean wants a background whose pattern/colour/effect follows the pointer and reacts to the area it hovers. Prior art exists in-house: `data-spotlight` in `nav-menu` and `mega-panel` is already vanilla cursor-follow. Generalise it into a container BACKGROUND capability. Write it as a new numbered FR in Spec 38 first — this is Tier V (pointer position → CSS custom properties), Tier G only if trailing physics is wanted.
  **Files:** Spec 38 (new FR), `class-sgs-container-wrapper.php`, a new Tier V effect module
  **Inputs:** `nav-menu/view.js` + `mega-panel/view.js` spotlight implementations
  **Outcome:** any container can carry a pointer-reactive background.
  **Exec:** PARALLEL with Step 6 · **Deps:** none · **Time:** 1.5 h
  **Tooling:** /ui-ux-pro-max (visual direction), /brainstorming
  **On-Fail:** ship the spec FR without the build if the design needs Bean's eye first.
  **Test:**
  - Happy: pointer moves → background gradient/pattern follows
  - Edge: touch device — must degrade to a static background, never a stuck hotspot
  - Fail: no pointer events → background renders its resting state
  - Integration: reduced motion = SUPPRESS (pointer-driven ambient motion is autonomous once it trails)

## Step 8 — DESIGN GATE: physics sandbox (Bean ask #3) [HANDOFF]
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

## Step 9 — Motion presets in real theme patterns [SESSION-START]
  **Model:** sonnet
  **Action:** Nothing in `theme/sgs-theme/patterns/*.php` uses a single fx attribute — motion exists only on canary pages. Two council personas independently called this fatal to "five client builds with Bean as QC only": motion that must be hand-applied per block, per page, does not survive a delivery schedule. Add motion to 3–5 real patterns using the new Subtle/Standard/Dramatic presets.
  **Files:** `theme/sgs-theme/patterns/*.php`
  **Inputs:** `src/blocks/extensions/fx-presets.json`
  **Outcome:** inserting a stock pattern gives a client tasteful motion with zero configuration.
  **Exec:** SEQUENTIAL · **Deps:** none · **Marker:** SESSION-START · **Time:** 45 min
  **Tooling:** /sgs-wp-engine
  **On-Fail:** revert the pattern files; they are self-contained.
  **Cold-Entry:** this plan + `fx-presets.json` + one existing pattern file
  **Prompt:** *(generate at dispatch.)*
  **Test:**
  - Happy: insert pattern → effects present and tasteful with no configuration
  - Edge: pattern inserted inside another container — does the scroll range still make sense?
  - Fail: `check-dead-pattern-attrs.py` must pass — WP silently discards undeclared attrs (D338)
  - Integration: the pattern's motion must survive a `/sgs-clone` round-trip once Step 12 lands

## Step 10 — Preset + param normalisation OUTSIDE the editor
  **Model:** sonnet
  **Action:** Preset application and stale-param clearing live in the editor's control handlers, so content arriving from a pattern, a clone or the converter bypasses both. Measured this session: setting `fxPreset` via the data store wrote no params, and `fxSplit: "chars"` survived a switch to `scrub`. Move normalisation to a render-time or `register_block_type` filter so stored content is normalised regardless of origin.
  **Files:** `includes/fx-attributes.php`, `src/blocks/extensions/fx.js`
  **Inputs:** the `/qc-inline` partials recorded in D430
  **Outcome:** a cloned or pattern-authored block behaves identically to a hand-configured one.
  **Exec:** SEQUENTIAL · **Deps:** Step 9 · **Time:** 45 min
  **On-Fail:** the editor path already works; a failed filter is revertible with no data loss.
  **Test:**
  - Happy: attributes set via the data store produce the same rendered result as via the UI
  - Edge: a preset name that no longer exists in `fx-presets.json`
  - Fail: params for a non-active effect are stripped, not silently rendered
  - Integration: must not fight `/sgs-update`'s attr extraction

## QA Gate C — client-operability
  **Model:** inline · **Exec:** SEQUENTIAL · **Deps:** Steps 9–10
  **Check:** Insert a stock pattern on a clean page, publish, and load it. Motion is present, correctly ranged, and required zero inspector interaction.
  **Pass:** effects fire; `probe-wave-c.mjs`-style assertions hold on a pattern-authored page.
  **Fail:** back to Step 9's preset values.
  **Marker:** QA

## Step 11 — A clean clone must build [SESSION-START]
  **Model:** sonnet
  **Action:** The motion generators now skip cleanly when the unversioned 13.9 MB `sgs-framework.db` is absent (shipped 2026-07-31), but **at least a dozen other prebuild scripts still hard-depend on it the same way** — `db-consistency/run.py`, `cheat-gate/run.py`, `excluded-gate/run.py`, `ledger/coverage_check.py`, `audit-feature-parity.py`, `converter/db/db_lookup.py`. A clean clone still cannot finish `npm run build`. Apply the same skip-cleanly-when-absent / fail-loudly-on-drift pattern across them. Also add the `--check` mode `generate-fx-qualifying-blocks.py` still owes.
  **Files:** the named scripts + `package.json`
  **Inputs:** stream D's report (it proved the remaining failure with a faked empty HOME)
  **Outcome:** `npm run build` completes on a machine with no local DB.
  **Exec:** SEQUENTIAL · **Deps:** none · **Marker:** SESSION-START · **Time:** 1.5 h
  **On-Fail:** each script is independent; revert individually.
  **Cold-Entry:** this plan + `.claude/dev-setup.md`'s "sgs-framework.db" section + `scripts/run-motion-fx-generators.js`
  **Prompt:** *(generate at dispatch — it MUST require the fake-HOME verification method, never renaming the real DB.)*
  **Test:**
  - Happy: fake empty HOME → build completes, generators skip with a named message
  - Edge: DB present but a table missing → fail loudly, naming the table
  - Fail: DB present and artefacts stale → build fails, naming both files
  - Integration: `build-deploy.py` inherits the fixed chain

## Step 12 — The cloning lift: motion that survives a draft (§11.3, FR-38-22)
  **Model:** inline
  **Action:** Grep confirms **zero** `data-sgs-fx` handling anywhere in `scripts/converter/`. §11.3 defines the mapping and defers the build. The competitor persona named this the one thing they could not buy their way out of; the cynic named it "the framework's stated purpose", absent. Build the lift as a Spec 31 §3.A routing-unit class, with the Rule 4 skip-with-reason report already specified.
  **Files:** `scripts/converter/**`, Spec 31 §3.A, Spec 38 §11.3
  **Inputs:** §11.2's grammar including `-shape`/`-path`/`-momentum`
  **Outcome:** a draft carrying `data-sgs-fx="pin-scrub"` clones into a WordPress page with the effect intact.
  **Exec:** SEQUENTIAL · **Deps:** Steps 4, 10 · **Time:** 3 h
  **Tooling:** /sgs-clone, /qc-council before build
  **On-Fail:** if it cannot land this wave, AMEND the success definition to say motion is applied by hand after a clone — do not leave the claim standing unbuilt.
  **Test:**
  - Happy: draft HTML in → live WP page out → effect fires
  - Edge: an unrecognised `data-sgs-fx` value → skip-with-reason, per class, never silent
  - Fail: fx on a block whose resolved slug declares no fx attrs → reported, not coerced
  - Integration: Stage 11.6 computed-parity must not regress

## Step 13 — Pin + horizontal-panel keyboard story (accessibility MUST-FIX)
  **Model:** sonnet
  **Action:** Neither `fx-pin-scrub.js` nor `fx-horizontal-panel.js` has any stated behaviour for a Tab press reaching content inside an active pin. §2 asserts "keyboard users get normal sequential focus" with no test anywhere. Establish empirically what happens, then either restrict content or fix focus handling.
  **Files:** `fx-pin-scrub.js`, `fx-horizontal-panel.js`, Spec 38 §3.1
  **Inputs:** the a11y auditor's MUST-FIX 1 (recorded in D430)
  **Outcome:** a documented, tested keyboard contract for both pinning effects.
  **Exec:** PARALLEL with Step 14 · **Deps:** none · **Time:** 1 h
  **Tooling:** Playwright (real Tab presses), /a11y-audit
  **On-Fail:** document a content restriction in the inspector rather than shipping an unknown.
  **Test:**
  - Happy: Tab into pinned content → focus visible, scrub not desynced
  - Edge: Tab THROUGH and out the far side of a horizontal panel
  - Fail: focus scrolls the element off-screen → that is a 2.4.11 failure, must be fixed
  - Integration: reduced motion (no pin) must keep the same focus order

## Step 14 — Two-arm reduced-motion proof for the reasoned-only effects
  **Model:** haiku
  **Action:** Only `image-sequence`, `gallery`, `draw` and `scramble` have measured two-arm reduced-motion proof. `pin-scrub`, `horizontal-panel`, `split-reveal`, `scrub`, `morph` and `motion-path` are "reasoned by construction" — which Spec 38 FR-38-20 itself says must be flagged as the lesser standard. Measure them.
  **Files:** `scripts/motion-qa/probe-wave-c.mjs` (extend)
  **Inputs:** §10's per-effect table
  **Outcome:** every §10 row is measured, or explicitly flagged unproven.
  **Exec:** PARALLEL with Step 13 · **Deps:** none · **Time:** 1 h
  **Prompt:** *(generate at dispatch.)*
  **Test:**
  - Happy: each effect's two arms differ
  - Edge: an effect whose reduce arm looks identical by design — say so rather than forcing a difference
  - Fail: arms identical AND not by design → real defect
  - Integration: one probe run covers all effects

## QA Gate D — accessibility + honesty
  **Model:** inline · **Exec:** SEQUENTIAL · **Deps:** Steps 13–14
  **Check:** Every §10 row is either measured or carries an explicit unproven flag; both pinning effects have a tested keyboard contract.
  **Pass:** no row silently claims equal confidence to a measured one.
  **Fail:** flag it honestly rather than measuring it badly.
  **Marker:** QA

## Step 15 — Per-breakpoint motion disable
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

## Step 16 — image-sequence: operable, or agency-only
  **Model:** inline
  **Action:** The frame tool is a Python CLI needing ffmpeg — aimed at a persona the project defines as never touching a terminal. This single item is why supportability graded **D+**. Choose: (a) an in-admin uploader that runs ffmpeg server-side, or (b) `supports.inserter: false` plus an explicit agency-only statement. Also: cap `desktopFrameCount` (uncapped today; a realistic three-tier setup is ~8 MB per instance on cheap shared hosting) and add a "Verify frames" HEAD-check button — the frames URL/count/pad/extension are four free-text fields with no validation and a silent poster-only failure.
  **Files:** `src/blocks/image-sequence/**`, `scripts/IMAGE-SEQUENCE-PREP-README.md`
  **Outcome:** the block is genuinely usable by its stated user, or honestly scoped away from them.
  **Exec:** SEQUENTIAL · **Deps:** none · **Time:** 2 h (a) / 20 min (b)
  **On-Fail:** (b) is always available and is honest.
  **Test:**
  - Happy: a client produces a working sequence without a terminal
  - Edge: 500 frames requested → capped with a visible warning
  - Fail: wrong frame count → "Verify frames" names the missing file
  - Integration: reduced motion still shows the poster

## Step 17 — Resolve the two editor console errors
  **Model:** sonnet
  **Action:** `Failed to resolve module specifier "@sgs/gsap-inertia"` / `"@sgs/gsap-draggable"` persist in the editor. They survive the boot guards added on 2026-07-31, so they are NOT thrown by our boot code. Trace the actual source: WP loads block view modules in the editor against an import map holding only `@sgs/gsap`. Either register the Tier G module IDs on the editor surface (map entries only, no enqueue) or stop the view modules naming those specifiers.
  **Files:** `class-sgs-motion-registry.php`, the two blocks' `view.js`
  **Outcome:** a clean editor console.
  **Exec:** PARALLEL with Step 15 · **Deps:** none · **Time:** 30 min
  **Test:**
  - Happy: zero page errors in the editor
  - Edge: a page with no motion blocks at all
  - Fail: fixing it must not make motion RUN in the editor (§9 forbids that)
  - Integration: `probe-wave-c-editor.mjs` asserts `pageErrors: []`

## Step 18 — Support surface for Bean
  **Model:** sonnet
  **Action:** Skip-with-reason writes to `error_log` behind `WP_DEBUG` — on Hostinger, Bean will never see it. When a client says "the animation is broken" there is nothing to look at. Build an admin panel listing effects in use on a page, bytes shipped, and effects skipped with reason.
  **Files:** a new admin page under the SGS settings surface
  **Outcome:** Bean can diagnose a motion complaint without SSH.
  **Exec:** SEQUENTIAL · **Deps:** none · **Time:** 1 h
  **Test:**
  - Happy: a page with 3 effects lists all 3 + byte total
  - Edge: a page with zero effects says so plainly
  - Fail: a skipped effect appears WITH its reason
  - Integration: must not run on the frontend

## Step 19 — Per-PAGE motion budget
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

## Step 20 — Spec ↔ code reconciliation
  **Model:** sonnet
  **Action:** Close the spec-lawyer's divergence table: add `data-sgs-fx-momentum` to §11.2's grammar; mark `fxShape`/`fxPath` seed status honestly in §11.3; retire the dead `scroll-smoother` `fx_effects` row (D422 moved smoothing to Lenis/Tier H); fix `seed-motion-fx-registry.py`'s nine "UNSHIPPED — placeholder" annotations on effects that all now exist; correct `generate-fx-qualifying-blocks.py`'s stale comment claiming `sgs/image-sequence` does not exist; wire or delete `sgs_get_fx_qualifying_blocks()` (zero callers today while its docstring claims the render layer uses it).
  **Files:** Spec 38, `seed-motion-fx-registry.py`, `generate-fx-qualifying-blocks.py`, `class-sgs-motion-registry.php`
  **Outcome:** two competent implementers reading the spec build the same thing.
  **Exec:** SEQUENTIAL · **Deps:** Steps 4, 15 · **Time:** 1 h
  **Test:**
  - Happy: every grammar attr has a control, a DB row and a consumer — both directions
  - Edge: a generated file with no reader is deleted, not documented
  - Fail: `--self-test` proves each new gate can fail
  - Integration: `/sgs-update` reproduces the seed byte-identically

## Step 21 — Re-run the adversarial council [HANDOFF]
  **Model:** inline
  **Action:** Run `/adversarial-council` again on the post-Wave-D surface to catch what these fixes introduced. The 2026-07-31 run found what a single reviewer never would; a second round after the fixes is the documented two-round pattern.
  **Outcome:** a fresh convergence map, and grades to compare against B−/B−/C+/C+/C−/D+.
  **Exec:** SEQUENTIAL · **Deps:** all · **Marker:** HANDOFF · **Time:** 30 min
  **Test:**
  - Happy: supportability rises above D+
  - Edge: a fix introduced a new convergent finding — that is the point
  - Fail: council findings are HYPOTHESES — fact-check before acting (this session found 3 of 3 confirmed, but that was verified, not assumed)
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

- **Decision:** image-sequence — build the server-side uploader, or mark it agency-only?
  - **Options:** [A] in-admin ffmpeg uploader (~2 h) · [B] `supports.inserter: false` + agency-only (~20 min)
  - **Recommendation:** [B] now, [A] when a client build actually needs it
  - **Why:** [B] removes the D+ supportability driver immediately and honestly; [A] is real work for a block no current client build uses.
  - **Cost of wrong choice:** [A] first spends 2 h on an unused block; leaving it as-is guarantees the top predicted support ticket.
  - **Who decides:** Bean

- **Decision:** Does Tier G stay exempt from Spec 02's <50 KB JS budget?
  - **Options:** [A] keep the §4.4 exemption · [B] bring Tier G inside the budget · [C] publish a per-page motion cost readout and let the operator decide
  - **Recommendation:** [C]
  - **Why:** the exemption was written by the team that owns the budget; a buyer with a Lighthouse report reads it as a broken promise. A visible cost turns an engineering property into a sales asset.
  - **Who decides:** Bean

### Pre-emptive decisions

> **Honesty note:** the mandatory two-cold-reviewer Hidden Decisions pass was NOT dispatched — this section was reasoned inline at the end of a very long session. Treat it as lower-confidence than a plan whose peer review actually ran, and consider running it before executing Step 5 or 12.

- **Decision:** when a step says "remove the control if unverified", does that mean removing the attribute too?
  - **Recommendation:** remove the CONTROL and the emit; keep the attribute only if stored content already carries it (removing a declared attribute makes WP discard stored values — the D338 class, and exactly what blocked a deploy on 2026-07-31).
- **Decision:** which canary page do new fixtures go on?
  - **Recommendation:** `/motion-canary-wave-c/` for effects, `/motion-roster-canary/` for roster/first-paint. Recreate rather than edit — `wp post update` is blocked by a hook; `wp post create` is not.
- **Decision:** how much of Spec 38 must be read before a step?
  - **Recommendation:** in full for Steps 4, 5, 7, 12, 20 (spec-changing); §-scoped for the rest.
- **Decision:** what if a council finding turns out to be wrong?
  - **Recommendation:** record the refutation in the plan and D-log. Three of three were confirmed on 2026-07-31, but each was checked first — do not inherit that as a prior.

---

## Honesty notes (what this plan does NOT have)

1. **The Hidden Decisions peer-review pass was not dispatched** (see above).
2. **Docscore was not run** on this document.
3. **The six raw council persona reports were not persisted to disk** — only their synthesis in D430 and this plan. If the detail matters later, the council must be re-run.
4. **Time estimates are per the low-by-default rule** and are not calibrated against `plan_actuals` (that table is still empty).
5. **No step here has been validated by `/qc-council`** — several are fix-shape proposals, which are hypotheses until measured. Steps 4, 5 and 12 explicitly route through it before building.
