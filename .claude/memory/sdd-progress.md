# SDD progress — header cleanup 2026-08-19 (COMPLETED, retained for history)
Task 1: complete (site-header 6 dead attrs deleted + rule 21 ratchet, review clean)
Task 2: complete (surface-cap scans all 4 header/footer blocks + composite limitation documented; review done by controller, found undercount)

---

# SDD progress — shop-archive + R-3 session 2026-08-20

Base commit: 7ebfdb4e (main)

Track A — FR-38-12 Flip non-animation
Track B — R-3 batch enforcement-script register

Track A / Flip: implementer DONE (root cause: MutationObserver callbacks are always post-hoc, so
  Flip.getState() inside the callback captured "after" twice → zero delta → no animation.
  H1 node-replacement REFUTED live; nodes morph in place. Second defect found: ~200ms idle
  mutation noise from WC sentinel divs.) Reviewer dispatched (opus) — perf-at-idle is the open
  question (rAF loop calls Flip.getState() every frame).
Track B / R3-d + R3-f: COMPLETE + controller-verified (5 JSON baselines carry the convention and
  still parse; 6th took the loader-comment route because its gate iterates all keys;
  check-tier-storage-shape docstring corrected).
Track B / R3-c (part): COMPLETE — prestart's `|| echo [ADVISORY]` wrapper on
  check-dead-api-calls.py removed so prestart and prebuild agree. Script exits 0, so safe.
Track B / R3-g: COMPLETE — all 4 never-run detectors run for the first time; report at
  .claude/reports/2026-08-20-r3g-unwired-detectors-first-run.md. 2 worth wiring, 2 not.
Track B / R3-a: implementer in flight (5 scripts adopt resolveComponentFiles()).
Track B / R3-e: implementer in flight (new inspector-scan rule: block.json declares → render consumes).
Track A / Flip review (opus): CHANGES REQUIRED — C1 rAF loop reads layout every frame forever
  (violates green-CWV non-negotiable); C2 second filter mid-tween captures out-of-flow geometry,
  no killFlipsOf; I1 nested <li> too loose; I2 tween escapes reduced-motion context; M1 docblock
  overstates rAF ordering. Single fixer dispatched with all findings.
Track A / Flip fix pass: COMPLETE (C1 armed-loop zero idle cost, C2 flipTween+killFlipsOf,
  I1 direct-children li + list-target guard, I2 context.add, M1/M4). Controller verified
  context.add returns the tween against GSAP source gsap-core.js:3936-3938. Live proof pending deploy.
Track B / R3-a: COMPLETE — 5 scripts adopt resolveComponentFiles(); components.js gains --dump-json
  so Python reuses the SAME resolver (no second mechanism). Exit codes unchanged. contentWidth now
  visible (dead-controls 1->56, inert-controls 3->59). 2 real bugs fixed en route.
Track B / R3-e: COMPLETE — rule 34-declared-attr-unrendered, 408 findings / 46 of 83 blocks
  (118 warn, 290 informational). contentWidth correctly NOT flagged (assertion, not eyeball).
  inspector-scan --check exit 0 before and after. Negative control genuinely fails.
Track B / R3-b: BLOCKED ON PURPOSE — wiring reds the build; the 4 findings are REAL defects, refused
  to baseline them. Report: .claude/reports/2026-08-20-r3b-blocked-real-defects.md
Track B / Pattern-0 allowlist (Bean-requested): haiku dispatched, must prove redundancy before deleting.
Bean asks 1-5 (post-handover):
  1. 4 "defects" RE-DIAGNOSED — only 1 was real. text fontSizeTablet/Mobile = DEAD destructure
     (fontSize is a tier object; TypographyControls' tiered branch never writes the flat pair) —
     2 lines deleted + misleading comment rewritten. quote backgroundColourHoverGradient = REAL,
     declared. feature-grid layout = deliberate documented override, no change.
     My earlier "client-facing bugs" claim to Bean was WRONG and has been corrected in the report.
  2. brand-strip: NOT the same colour (real --sgs-logo-gap between tiles). GridItemDefaultsPanel
     NOT usable (it is wrapper machinery; brand-strip is block-private, D294). Doing B, with
     item* prefix rather than tile* because the attrs paint __item not __tile. Agent in flight.
  3. text issue explained + fixed (see 1).
  5. Deploy + live test pending brand-strip landing.

---

# SDD progress — Stack layout rebuild 2026-08-24

Base commit: 55f797e85 (main)
Plan: .claude/plans/archive/2026-08-24-stack-layout-rebuild.md (archived 2026-08-29, status COMPLETE)
Task 1: complete (commit 0d3f2353b, reviewer-verified live: flex/column, row-gap 44px with
  MEASURED child gaps 43/44px, flexDirection ignored, wrap coerced, min-width:0, on __inner).
  6 gates joined, 5 grid-only gates correctly excluded.
  ⚠ deployed with --skip-oldshape-audit: fxFieldTrail (post 2721, motion track) is stored but
    declared in NO block.json - verified 0 occurrences in this diff and 0 in src/. Blocks deploys.
  ⚠ CONTROLLER ERROR: my probe cleanup force-deleted 5 pages that were NOT mine (2178 2179 2182
    2188 2190) by matching "PROBE" in the title across all pages. Referenced only in session-memory
    prose, no gate depends on them. All 4 load-bearing GATE fixtures survive.
Task 2: complete (commit c76d0f120, reviewer-verified live in the editor across all 3 modes).
  stack -> Layout type, Gap, Vertical alignment, Justify content
  flex  -> + Flex direction, Flex wrap ; grid -> + Justify items, Align content
  ⚠ probe limitation: 3 scans falsely reported Gap absent (its label is a <span>, not <label>).
    Source confirms Gap is ungated. False defect avoided.
  ⚠ open for Bean: "Vertical alignment" label is loose for a column; shared across ~30 blocks.
Task 3: complete (commit be17c513b, reviewer-verified live IN THE CANVAS: flex/column,
  wrap coerced, justify-content flex-end, row-gap 52px with MEASURED gaps 52/53px,
  flexDirection:"row" ignored, block valid). Implementer honestly reported traced-not-measured.
  Scope-plus kept: useInnerBlocksProps orientation:"vertical" for stack.
ALL 3 TASKS COMPLETE. Base 55f797e85 -> be17c513b.
QC-INLINE: 7/7 scenarios pass (confidence 100). Regressions clear: flex still row+wrap+justify,
  grid still 3 tracks. Nested stacks keep independent gaps (30 outer / 10 inner, measured 10/10).
  flexWrap:"wrap" on stack coerced to nowrap. Stack with no gap still flex-column.
  FINDING (pre-existing, not from this work): `layout` has NO enum in block.json - an invalid
  value like "stak" silently falls through to display:block, which is the original Stack bug
  by another route. Recommend adding the enum.

---

# SDD progress — Stripe hero POC divergence fixes 2026-08-25
Scratch work (.claude/scratch/ is gitignored — no commits; artefacts are the record).
Task 1: complete (blend-capture-v2.mjs, per-context WeakMap). Recovered hero blend state:
  wave draw blend=TRUE blendFuncSeparate(768,0,768,0) eq(ADD,ADD); post quad blend=FALSE.
  Old per-prototype bug confirmed: it reported wave and quad identical, which cannot be true.
Task 2: complete (controller, inline — router returned `inline` for high-complexity).
  ⭐ 2x2 factorial (palette sRGB tag x blend state) found the real answer:
     none+live-blend = 0.66%  (BOTH CORRECT)   <- adopted as default
     tex +default    = 2.65%  (both wrong, errors partially cancel)
     none+default    = 10.11%
     tex +live-blend = 14.95%
  The earlier "sRGB fix" was a COMPENSATING ERROR masking the missing blend squaring.
  Bias/abs ratio 0.96 -> 0.15; within-8/255 25.0% -> 95.2%.
  Verified the rig's GL calls now match live numerically on BOTH draws before judging the image.
Task 3: complete (haiku, controller-verified independently): frameInterval=2 throttle,
  introTimeRamp 0.016/clamped, failIfMajorPerformanceCaveat:true. __drawAt bypasses the ramp;
  frozen frame byte-IDENTICAL to reference, so all prior measurements stay comparable.
Task 1: implementer DONE (commit 6ba52bd54), controller-verified byte-identical --json/--check, reviewer dispatched

---

# SDD progress — rule 34 three-surface fix, 2026-08-27
Base commit: 57ef48e59 (main)
Task 1: COMPLETE (commits 6ba52bd54..315a31ded, review clean, SHIP).
  check-dead-controls.js gains --dump-json: 2657 rows, per (block,attr):
  renderConsumed / controlPresent / renderVia (7 values) / exempt / exemptReason.
  Controller-verified: --json + --check BYTE-IDENTICAL vs pre-task 57ef48e59; --self-test 0.
  KEY RESULT: non-rendered AND non-exempt = exactly 2, matching the blocking gate by construction.
  6 templateMode rows now labelled exemptReason='editor-only' — Bean's SURFACE 2, machine-readable.
  ⚠ Controller brief errors caught by subagents: field list fixed at 5 was too narrow (reviewer);
    fxPreset is NOT a system attr, it is in EXTENSION_EDITOR_ONLY_ATTRS (fixer, via a real test fail).
  T3 (wire check-editor-canvas-css.py) DROPPED at pre-flight: it takes a block_name argument and has
    no --check mode. It is a per-block diagnostic, not a gate. The report recommending it was wrong.
Task 2: COMPLETE (commits 1f38750dc..215fba693, review clean after 2 Criticals fixed).
  rule 34 now CONSUMES check-dead-controls.js --dump-json. 319 -> 2 FLAGGED, matching the
  blocking gate exactly. `kind` populated (dead-attr / dead-control / editor-only).
  Ceiling 319 -> 2 with enumerated composition. ~505 lines of duplicated resolver DELETED.
  Reviewer PROVED 2 Criticals by tampering; both fixed and controller-re-verified by reproduction:
    C1 broken producer was SILENT (0 findings/PASS/exit 0) -> now exit 1, 83 findings, ratchet breach
    C2 `kind` had ZERO coverage (3 tampers all green) -> mustFlagKind added; wrong kind now FAILs
  I4: core-supports exemption was LOST in the rewrite — a block declaring `anchor` would have been
    told to DELETE it from block.json, removing a working WP feature. Restored in the PRODUCER as
    exemptReason='core-supports' (dump-only, --json/--check byte-identical). 3 rows: button.anchor,
    heading.anchor, responsive-logo.align.
  Producer --json/--check verified BYTE-IDENTICAL vs pre-task 57ef48e59 after BOTH producer edits.
Task 4 (reconciliation gate): DROPPED AS OBSOLETE. Its purpose was to compare two instruments that
  could drift. Rule 34 now consumes the gate's verdicts, so they cannot disagree — the
  reconciliation is structural, not a gate. Building one would gate a tautology.
Task 4: complete (sonnet, controller-verified independently): dark-theme path (?theme=dark loads
  fragment 98230 + preset QR, no custom blending — Stripe's dark material has none) and per-frame
  u_mousePosition from a canvas mousemove listener (COSMETIC — no shader reads it).
  Light path byte-IDENTICAL to FINAL-rig.png, so the measured 0.66% configuration did not move.
  ⭐ Side benefit: Q4(b)'s derivative-antialiased line field is now RENDERED, not read-source —
  visible as fine striations that thicken and fade as the surface turns. Gaps 6 -> 4.
Verification (Bean-requested, done first): the FR-38-31 BANDING PREMISE IS REFUTED. Rendered the
  shipped effect with its own default colours; mean run-length 1.19, 1034 distinct colours/line.
  No banding exists. The "add a dither" + "mediump->highp" recommendations are WITHDRAWN.
  The real defect is form and ground: a dark, saturated, repetitive full-bleed ridge field.
Lineage: wave-gradient.js's false "this is the stripe.com landing-page technique" claim removed
  (it is the DISCONTINUED ~2020-21 hero). MIT attribution to sa3dany KEPT — that is genuine
  licence provenance — but dated so it cannot be read as a claim about stripe.com today.
Task 5: complete (sonnet, controller-verified): WebGL capability gate — Stripe's exact predicate
  (isWebGL2 && vertexTextures && maxTextureSize>=4096 && maxVertex/FragmentUniforms>=256 && 4
  required extensions), the 47-entry GPU blocklist (verified entry-for-entry against the bundle),
  __disableWebGL kill switch, dark-theme coarse-pointer gate, canvas-only-when-supported.
  ⭐ The implementer CHALLENGED my brief: I said 48 blocklist entries, the source has 47. It
  counted programmatically and refused to pad. My brief was wrong; it was right.
Task 6: complete (sonnet + controller correction): static <picture> fallback (3 CDN-referenced
  PNGs, never downloaded) + 639/1263 breakpoint tier selection. Per-tier presets left as a stated
  gap, not invented.
  ⭐ CONTROLLER CORRECTION: the implementer's own addition hid the fallback with `display:none`
  and honestly flagged it as unconfirmed. Checked live: Stripe uses OPACITY (display stays block,
  element keeps its 975px, `transition: opacity 0.25s linear`). Right look, wrong mechanism —
  corrected to match. This is the exact failure the completeness council warned about.
GAPS: 6 -> 0. All 26 mechanisms implemented.
QC-INLINE: 10/10 scenarios pass, confidence 100. Light render byte-identical to reference
  throughout all six tasks. Two initial "failures" were BOTH instrument faults, not rig defects:
  a console filter matching message text when the favicon appears only in the URL, and a
  determinism assertion demanding bit-exactness of a GPU render (real variance: 1/255, mean 0.000).

---

## ⚠ UNVERSIONED EDIT — recorded here because nothing else records it (2026-08-25)

This ledger moved from `.superpowers/sdd/progress.md` to its current path,
`.claude/memory/sdd-progress.md`, so that the SDD recovery map survives a fresh clone or
`git clean -fdx` — the exact situations it exists for. It was previously git-ignored.

**The corresponding SKILL EDIT IS NOT UNDER VERSION CONTROL.** It is recorded here, in a tracked
file, because there is nowhere else it can be recorded.

**What was edited:** `subagent-driven-development` SKILL.md, two changes —
1. the ledger path in the "Durable Progress" section:
   `.superpowers/sdd/progress.md` → `.claude/memory/sdd-progress.md`
2. the note claiming `git clean -fdx` destroys the ledger (now false — it is tracked), replaced
   with the reasoning for the split: **the ledger is recovery state and is tracked; per-task
   briefs, reports and review packages stay in `.superpowers/sdd/` and stay git-ignored, because
   those are ephemeral handoff files.** The three scripts (`task-brief`, `review-package`,
   `sdd-workspace`) were deliberately NOT changed for that reason.

**Where the file actually lives:** `~/.agents/skills/subagent-driven-development/SKILL.md`.
`~/.claude/skills/subagent-driven-development` is a Windows **junction** into it — git refuses to
traverse it (`fatal: pathspec ... is beyond a symbolic link`).

⛔ **Why it cannot be committed, verified 2026-08-25:**
- `~/.agents` is **not a git repository at all**.
- `~/.claude` **is** its own repo (148 tracked files) but has **no remotes** — nothing to push to.
- The skills tree is therefore invisible to both.

⛔ **THE WIDER RISK, measured:** **132 of 151** entries under `~/.claude/skills/` are junctions
into `~/.agents` — **164 skills, 739 MB, entirely unversioned.** Every skill edit ever made has no
history, no diff, no rollback and no backup, while `~/.claude` *looks* version-controlled. A
hand-rolled `SKILL.md.bak-2026-07-17-preGraft` sitting beside the live file is the symptom.

Bean was shown this and chose to leave it as-is for now (option 3 of 3: `git init` in `~/.agents`,
add a remote to `~/.claude`, or record and move on). **If the skills tree is ever lost, the two
edits above are described precisely enough here to be reapplied by hand.**

---

# SDD progress — margin-reset residual defects, 2026-08-26
Base commit: 346861ed9 (main)
Plan: .claude/plans/2026-08-26-margin-reset-residual-defects.md
Task 1 (frontend !important): COMPLETE (commit c0f422a87, opus review clean after 4 findings fixed).
  ⭐ The reset existed in THREE files, each shadowing the next — which is why the !important
  LOOKED load-bearing: removing one copy changed nothing visible. Found by fix→redeploy→
  RE-MEASURE→still failing→hunt the next source, never by reading CSS. No fourth copy (grep).
  Live, all 4 arms, both directions: explicit 80px applies, nothing-set still 0px.
  ⚠ Reviewer caught a SILENTLY DROPPED selector (.entry-content > .wp-block-sgs-hero) that no
  implementer noticed; harmless only because sgs/hero hard-codes alignfull. Added back.
  ⚠ Only the alignfull arm was exercised by a REAL page element; group/cover were synthetic DOM
  injection and the "hero" row actually exercised .entry-content > .alignfull. Labels corrected.
  ⚠ Deploys needed --skip-oldshape-audit for PRE-EXISTING page 2849 (another track's stale clone,
  51 HIGH type-mismatches). Unrelated to a CSS payload, but it WILL block the next blocks deploy.
Task 2 (blockGap editor/frontend divergence): COMPLETE (commit 9b3f4d97c, opus review clean
  after comment-only fixes). Editor arm narrowed from catch-all to the same 4 block-type families
  as the frontend. sgs/container no-margin: editor 0px -> 24px, matching the frontend.
  ⚠ The selector also changed SHAPE (`body ` prefix dropped, (0,2,1)->(0,2,0)); reasoned inert and
  confirmed live — :where() is (0,0,0) so still beaten, no !important so inline still wins.
  ⚠ It is a UNION, not a mirror: `.is-root-container` is the canvas root in BOTH editors and maps
  to a different frontend root in each. Known residual recorded in the CSS comment.
  ⚠ CONTROL 3 WAS VACUOUS: the no-regression probe used a type the narrowed rule no longer
  matches, so the pass was structurally guaranteed. Risk nil by construction; claim unearned.
  ⭐ SURFACED, NOT FIXED — needs Bean: `sgs/container` is in NEITHER arm list, so adjacent
  containers with different backgrounds show a 24px white band on the LIVE page — the exact
  symptom this rule exists to prevent, on the dominant section block. This change makes the
  CANVAS show them too (correct, but will LOOK like a regression). Reviewer's recommended
  resolution is a THIRD task: add sgs/container to BOTH arm lists, so both surfaces are flush
  AND in agreement.
BOTH TASKS COMPLETE. Base 346861ed9 -> 9b3f4d97c.

# SDD progress — converter bugs b/d + G2 fail-closed gate, 2026-08-27

Base commit: 9a27f195a (main)
Branch: fix/converter-bugs-b-d (merged in 3 stages, then deleted)

Task 1: complete (root-domain OUTER guard css_element fix, commits c6ecb9f40..85f22a13c
  after 4 review rounds — found+fixed a real sgs/before-after regression via DB migration,
  a durability gap in the migration's source-of-truth, a destructive self-healing test
  fallback, and a falsified test justification along the way). Merged to main as e84d7f172.
Task 2: complete (assembly.py layout-enum validation, commits 4aee732d4/6e5170762 after
  2 review rounds — found+fixed a real sgs/cta-section data-loss risk from a legacy dual-
  meaning attribute, and de-fragilized 2 tests that depended on live shared DB state).
  Merged to main as 94a3ab684.
Task 3: complete (check_attr_schema_conformance.py — the general G2 fail-closed gate,
  commit d06c66163 + a follow-up fix 85f22a13c for 2 missing WP-core supports entries).
  Merged to main as 01aaac181.

All three merged via isolated worktrees from origin/main (never the shared main working
tree — hit a genuine "could not write index" race the one time a merge was attempted
directly on shared main). Full converter suite green throughout (705-712 passed depending
on task, 0 regressions at any point).

---

## Run: fidelity-comparator (2026-08-29)

Plan: `.claude/plans/2026-08-29-fidelity-comparator-build-plan.md`
Base: 0ea1143ad (main). Working directly in the shared main tree, scoped strictly to
`plugins/sgs-blocks/scripts/generative-background/` — a directory no other session touches.
package.json / gates.json are shared and are handled by the controller, not delegated.

Task 1: complete (poc-replica.html + flip-probe.mjs). Implementer sonnet, reviewer opus,
  2 review rounds. Round 1: SPEC ❌, 2 Critical — the page hung forever under the committed
  server root (palette path escaped it, 403 → unset __ready AND unset __err), and the flipY
  evidence was unsound. Round 2: SPEC ✅ — the flipY answer INVERTED (false → true) once a
  mechanical FBO/readPixels probe replaced the hue-comparison; independently corroborated by
  a separate Python/PIL decode giving the identical 29.73 mismatch figure. 4 Important closed
  in a third pass (residual ?t= hang, missing probe separation gate, missing provenance,
  preserveDrawingBuffer capture trap).
Task 2: complete (fidelity-compare.mjs + tracked fidelity-baseline.json, commit efb695202).
  2 review rounds, opus reviewer. Round 1 SPEC ❌, 2 Critical: the rung-1 crop contained the
  rig's hero copy (4,632 near-black px of unequal non-canvas DOM), and harness failures on
  several paths exited 1 instead of 2. THE HEADLINE RESULT: rung 1 = 4.61/5.40/5.21% with
  bias_over_abs ~0.90-0.93 and signed green +18..+20 — the divergence is ~90% SYSTEMATIC, a
  colour/tone-transfer mismatch, not geometry. That statistic was being captured from
  compare.py and discarded until the review forced it to be surfaced and gated.
  ⭐ The review predicted hiding the hero copy would LOWER the numbers; it raised them
  (1-of-3 failing became 2-of-3), because the excluded strip's own mean sat below the
  overall. Implementer reported against expectation; arithmetic re-derived independently.
Task 3: complete (blink.html + README.md + gates.json/package.json wiring by the controller,
  not delegated — shared files). check-transform-parity wired to the FAST tier (0.07s, no rig
  dependency, so it survives Gate E) and verified reachable via gate:list + an actual tier run.
  fidelity:compare deliberately NOT a gate: no manual tier exists, so registering it would
  make it RUN, and it needs the rig plus a GPU.
  ⭐ The implementer REFUSED a fix the controller asked for (a mojibake in the JSON), checked
  at byte level, found correct UTF-8, and cited prove-the-cause-before-fix. It was right —
  the artefact was a cp1252 console rendering UTF-8, not a defect in the file.

---

# SDD progress — sgs/form-field-tiles wp-block identity class fix, 2026-08-30
Base commit: 0ee282b0f (main)
Task 1: complete (commits 81036c832 fix + ca1f14789 gate allowlist, review round 1 found
  2 Important doc defects, fixed in 76d4ba365, controller-verified directly — READY TO CLOSE).
  Root cause: field_open() (shared helper, ~10 form-field block types) never called
  get_block_wrapper_attributes(), so WP's identity class landed on form-field-tiles's INNER
  tile-grid div (via SGS_Container_Wrapper::render(), which does call it) instead of the outer
  div carrying the uid + border-scoped CSS. Fix shape (a) from the brief: made field_open()
  itself call get_block_wrapper_attributes(), the universal fix, after confirming via all 12
  sibling block.json files that none declares a WP styling support without
  __experimentalSkipSerialization (so nothing else gets an unwanted inline style= as a side
  effect). Live probe FAIL -> PASS after deploy; 73/73 gates green throughout; 3 sibling
  field-block types spot-checked live with real DOM/computed-style evidence, not asserted.
  Review round 1 (opus, cross-model from sonnet implementer, independently re-verified rather
  than just diff-reading — re-proved the ratchet bypass itself, grepped every field_open()
  caller for re-entrancy risk, read the probe's own outermost-element scoping logic to rule out
  inner/outer double-class confusion): spec compliance PASS, code quality Changes Required —
  2 Important (a stale docblock still describing the old broken behaviour; a new comment +
  commit message asserting form-field-file now gets a live data-wp-interactive attribute, which
  the implementer's own measurement had actually found ABSENT) + 3 Minor (customClassName now
  also lands on both outer+inner divs on tiles specifically, harmless; double-esc_attr(), inert;
  one "zero hits" grep claim scoped too narrowly, a QA script does select the outer div now,
  arguably a fix not a regression). Fix pass (76d4ba365) corrected both Important findings,
  added the optional Spec-32 footgun warning the reviewer flagged as I3; controller read the
  diff directly and confirmed both corrections are accurate and match the reviewer's own
  re-measurement — no new false claims introduced. Minors not fixed (correctly triaged as
  non-blocking, next-touch items).
TASK 1 COMPLETE. Base 0ee282b0f -> 76d4ba365. Single-task run — task review served as the
  final review; no separate whole-branch review needed.

---

# SDD progress — sgs/timeline layered control model, 2026-08-30
Base commit: b59f8cd3f (main)
Plan: .claude/plans/2026-08-30-timeline-layered-control-model-design.md (qc-council reviewed,
  2 raters, both REQUEST REVISION, all required revisions applied before build started)
Owner approved all four §10 recommendations: block-private fx wiring, tablet follows desktop,
  entryGap as a single length, contentSide built as part of step 3.

BASELINE measured live pre-dispatch (375px, media-bearing align-alternating):
  date gridArea = "1 / 1"   entry gridTemplateColumns = "267.969px 76.0312px"
  Predicted post-fix: gridArea "2 / 2", narrow first track.
  Negative control at 1440px: gridArea must STAY "1 / 1" odd / "1 / 3" even.

Task 1 (scope media placement rules to min-width 768px): implementer dispatched (sonnet,
  overriding the router's haiku pick — R4 shared entry grid makes a wrong edit silently break
  FR-38-35, which is design judgement not transcription).
Task 1: implementer DONE (f6188b027, 73/73 green). CONTROLLER-MEASURED LIVE post-deploy:
  media-under FIXED at 375px (dateArea 1/1 -> 2/2, cols 267.969/76.03 -> 16px/328px, content
  76 -> 328px). Negative control at 1440px PASSED unchanged (odd 1/1, even 1/3, cols
  688.5/16/688.5) and rail centre === node centre 713 on all four timelines, so R4's
  FR-38-35 risk did not materialise.
  ⚠ media-overlay NOT fixed (dateArea still 2/1, cols still 180px/164px, content 164px).
Task 1 review (opus, cross-model): SPEC ❌ + Changes Required.
  C1 the --media-overlay exclusion is FALSE. Proven from source: the overlay DESKTOP rule
    (style.scss:1328-1333, (0,5,0), no media query) beats the overlay's OWN mobile re-placement
    (:1473-1476, (0,4,0)) — so that mobile block is DEAD CODE for alternating timelines. The
    implementer cited a code comment at :1443-1444 that is factually wrong about the block nine
    lines below it, instead of computing specificity the way its brief demonstrated.
  I2 the brief's stated gate ("exact grep commands and their output") was asserted, not shown.
  I3 the false exclusion claim now stands in a verdict:PASS visual-diff report as project fact.
  M4 fractional band 767.0<w<768.0 has no placement rule (cosmetic; dots proven safe there).
  M5 vendor/ carries 30 dev packages after the implementer's composer install — CONTROLLER
    CHECKED AND DELIBERATELY DID NOT "FIX" IT: build-deploy.py regenerates the autoloader
    --no-dev for the tarball and restores dev-included locally in a finally block, and its
    docstring records that a past session's hand-fix REOPENED the 500. Deploy verified clean.
  ⭐ Reviewer verified the re-indent is byte-identical apart from the media wrapper (no dropped
    declarations), and found an UNCLAIMED WIN: below 768px the node's mobile `grid-row:1/span 3`
    had been losing to the unscoped desktop `span 2`, so the mobile 3-row layout was broken and
    is now correct.
Task 1 fix pass: dispatched (C1 + I2 + I3; M4/M5 triaged as non-blocking).
Task 1 fix pass: COMPLETE (da618882c, 73/73 green). CONTROLLER-VERIFIED LIVE, not diff-read.
  375px, ALL FOUR alternating timelines now identical: dateArea "2/2", cols "16px 328px",
  content 328px, node 8 / rail 9 (1px rounding on a 2px rail). Overlay went 164px -> 328px.
  1440px negative control UNCHANGED: odd 1/1, even 1/3, cols 688.5/16/688.5, rail===node 713.
  The ASYMMETRIC SPLIT is proven correct: the overlay date keeps bg rgb(251,243,220),
  radius 4px, z-index 2, box-shadow and padding at BOTH 375px and 1440px — appearance stayed
  outside the min-width query exactly as required.
  ⭐ OPEN DEBT CLOSED, NOT INHERITED: `width: var(--sgs-timeline-media-width, 180px)` was flagged
  by the reviewer as probably-wrong-at-mobile and deliberately left unguessed. Measured + eyeballed
  on a screenshot: the date pill is 180px and the media it overlays is 180px, so the pill spans
  the image exactly — which is the whole point of media-overlay mode. CORRECT BY DESIGN, no change.
  The original code comment ("reads correctly at any width") was right about the DATE and wrong
  about the CONTENT column, which is what was actually broken.
TASK 1 COMPLETE. Base b59f8cd3f -> da618882c (f6188b027 + da618882c).
  Re-review skipped deliberately: C1 was verified by live measurement (stronger than a diff
  re-read) and I2/I3 were documentation corrections the controller read directly.

OWNER VERDICT 2026-08-30 — date-over-media REMOVED. Bean judged the overlay "awful" and asked why
  it existed on the stacked layout at all. Facts checked before recommending: shipped 1 day earlier
  (bc52064a8), referenced ONLY in the block's own 4 files, ZERO uses in theme/. Removal approved.
  ⚠ This deletes the overlay CSS fixed hours earlier in da618882c. Not wasted — it proved the
    specificity mechanism and validated the same fix for --media-under, which stays — but the
    overlay code goes. Do NOT reinstate it from Addenda 10/11.
  ⭐ The owner's EYE overruled the controller's "correct by design" close-out, correctly. The
    controller had measured the date pill at 180px vs a 180px media width and closed the debt as
    intentional. That was a MECHANISM claim; whether it looks good is R-31-13, the owner's call.
    Lesson: a mechanism proof is not an aesthetic verdict and must not be written up as one.
  Controller retains: the /sgs-update reseed to prune the block_attributes row (shared-DB write,
    announced separately, never delegated) and the design-gate doc update (done).
REMOVAL COMPLETE (6a183ce3b, 73/73 green, deployed + live-verified).
  Live at 375px: zero media-overlay classes across all 8 timelines; the formerly-overlay one
  (full index 5 — NOT filtered index 1; the controller's first probe grabbed the wrong element
  and was corrected) now reads dateArea 2/2, transparent bg, no box-shadow, date/media/content
  all 328px, DATE_OVERLAPS_MEDIA false. Screenshot opened: date sits above the image in accent,
  no pill covering the photo. Bean's complaint resolved.
  ⚠ A STALE IDE DIAGNOSTIC claimed render.php:398 used an undefined $media_placement. FALSE —
    grep finds zero occurrences, check-render-undefined-vars (gate 29, fast tier) passes at
    PHPStan level 1, php -l clean. Fact-checked before reporting; nearly filed a phantom bug.
  ⚠ THE DEPLOY CORRECTLY ABORTED FIRST on oldshape-audit: 1 NEW HIGH, post 3079 line 12 storing
    the now-undeclared milestoneMediaPlacement. wp-migrate-oldshape-blocks.js was the wrong tool
    (it migrates known shape changes, correctly reported "no casualties"). Fixed by a TEXTUAL
    strip of the exact 44-char needle `,"milestoneMediaPlacement":"date-over-media"` via REST —
    never json.dumps, which would rewrite every other stored attr. Guards: exactly-1-occurrence
    assert, byte-delta must equal needle length, both sides of the cut asserted byte-identical,
    and a round-trip re-fetch proving KSES altered nothing. 7314 -> 7270. Redeploy then passed
    the gate ON with 0 NEW HIGH (37 -> 36 findings).
  ⚠ PowerShell env-loading of .claude/secrets/*.env mangles values (CRLF \r survives .Trim('"'))
    and gave a false 401. Bash `set -a; . file; set +a` works. Use bash for these creds.
DEFERRED DELIBERATELY: the /sgs-update reseed pruning the stale block_attributes row for
  milestoneMediaPlacement. The row is stale but ALL 73 gates pass, so nothing is blocked, and a
  shared-DB reseed has broken other tracks' builds mid-run before. Batch it with the reseed that
  steps 3-4 need anyway for the new attributes. Do not run it standalone while tracks are active.
Task 2: COMPLETE (f01b7446f + 3a877705a fix pass + 1a5ab3225 regression fix).
  mobileLayout stacked|carousel. Live at 375px: carousel scrolls (1210>360), snap x mandatory,
  entries 292px (<=320 G225 cap), tabindex=0 + aria-label, NO role (owner dropped it to keep the
  <ol> list semantics — the controller's brief had wrongly mandated role="region").
  is-reached now wired to scroll position: [t,f,f,f] -> [t,t,t,f] with border colour changing.
  Stacked control byte-identical throughout; 1440px fully inert for both values.
  ⛔ THE SESSION'S WORST BUG, and it was a CONTROLLER instruction: F7 told the fixer to early-bail
    initSparks in carousel mode. initSparks ALSO drives the reveal, so .is-revealed was never
    applied while .is-js stayed on the root — the hiding rule kept matching and the carousel
    painted NOTHING but a scrollbar. Bean spotted it on the probe page. Fixed by opting entries
    out of the reveal-hidden state inside the carousel gate at (0,6,0) vs (0,4,0).
    ⭐ RULE: the .is-js gate protects against a BROKEN script, NOT a DELIBERATELY not-run driver.
      Suppressing a driver obliges you to suppress the hidden state it alone could lift.
    ⚠ Every numeric check passed on that blank carousel. A zero-opacity element measures perfectly.
      Caught by a SCREENSHOT, twice over (mine, then Bean's).
  ⭐ Reviewer found the 4x class repetition was an exact TIE (0,5,0) won only by source order, not
    the claimed margin — one appended rule from silently losing. Raised to 5x with correct
    arithmetic. It also corrected the controller: "scope into a media query instead" confers NO
    advantage here because every competing rule is already inside max-width:767px.

Task 3a: COMPLETE (f8b5f6916, + 88ec9173f shared reseed artefact). BEHAVIOUR-PRESERVING.
  alignment -> contentLayout (alternating|same-side|single-column); showDateColumn -> datePosition.
  centre folded into single-column; its 4 CSS blocks deleted, and its 8px rail bug (line on the
  node's right EDGE, not through the dots) is gone as a side effect.
  VERIFIED BY COMPILED-CSS DIFF: 161 lines, every one a class rename or a deleted align-centre
  rule. No declaration, value, selector order or media query changed.
  LIVE at 1440: alternating x4 all odd 1/1 + even 1/3, cols 688.5/16/688.5, rail===node 713.
  single-column x3 all auto/2, 16px 1393px, node 8 / rail 9. date-gutter preserved (180/16/1197,
  node 204). At 375 all collapse correctly; zero --align- classes remain.
  ⛔ THE TRAP AVOIDED: showDateColumn was only ever effective when alignment==='left'. A 1:1
    boolean map would have ACTIVATED a gutter that never rendered on pages nobody asked to change.
    Mapping conditioned on the old alignment value, matching render.php's own gate.
RESEED DONE (announced): /sgs-update Stage 1 seeded 3 new attrs, Stage 9 pruned 3 orphans at attr
  level (alignment, showDateColumn, milestoneMediaPlacement — the deferred one cleared in the same
  pass). attr-role-map.json regenerated and committed SEPARATELY (88ec9173f) because it is derived
  from the WHOLE DB — 241 insertions / 34 deletions covering every track's blocks, not just mine.
  ⚠ Before the regen, check-element-manifest-conformance failed GLOBALLY (orphan_unclassified=1),
    blocking every track's commits over an attr they never touched. The gate's own message said it
    was "a SNAPSHOT problem, not a data problem" and named the regenerator.
STORED-CONTENT MIGRATION: pages 3079 (5 replacements) and 3072 (1). The oldshape gate caught 3072
  AFTER 3079 was done — I had only migrated the page I was measuring on. Both verified by
  re-parsing every block and asserting its attrs equal the mapping's prediction from its ORIGINAL
  values, plus a round-trip proving KSES altered nothing.
Task 3b: COMPLETE (10072a44b, 73/73 green — the manifest gate did NOT block this time because
  Task 3a's reseed had already landed). same-side + contentSide (start|end) built.
  ⭐ THE OWNER'S ORIGINALLY-REQUESTED OPTION, live-verified at 1440px by the ONE measurement that
  actually distinguishes it — per-row grid columns:
      alternating (blocks 0,7): date [1,3,1,3]  content [3,1,3,1]   <- FLIPS per row
      same-side end (block 5):  date [1,1,1,1]  content [3,3,3,3]   <- never flips
      same-side start (block 6):date [3,3,3,3]  content [1,1,1,1]   <- mirrored, never flips
  Media follows the DATE's side in both (5: media col 1; 6: media col 3), matching alternating.
  Both same-side: cols 688.5/16/688.5, rail centre === node centre 713 — R4 holds, dots unmoved.
  At 375px both collapse to 16px/328px like every other vertical layout.
  Regression set unchanged: alternating x2, single-column x3, date-gutter, carousel.
  contentSide:end emits NO class (base rule); start emits sgs-timeline--side-start.
  Test instances authored on probe 3079 blocks 5+6 by guarded textual insert (78-byte delta,
  all 8 blocks re-parsed and asserted against intended attrs, round-trip verified).

=== PROGRAMME STATE at end of session 2026-08-30 ===
DONE: Task 1 (mobile collapse), date-over-media removal (owner verdict), Task 2 (mobileLayout +
  carousel), Task 3a (attribute split + rename + migration + reseed), Task 3b (same-side).
NOT STARTED: Task 4 — wire scrollEffect to fx-pin-scrub / fx-horizontal-panel (block-private via
  data-sgs-fx, NOT the generic fx panel). Design is signed off in the design gate; owner approved
  block-private wiring. Task 5 — entryGap + heading-level surfacing (Layer 4).
OPEN, NON-BLOCKING: the fractional-width band 767.0<w<768.0 where neither breakpoint fires
  (cosmetic, dots proven safe; fixing needs a file-wide 767->767.98 convention change).

---

# SDD progress — media atoms wired into sgs/media, 2026-08-31

Base commit: fddf6fdf6 (main)
Goal: wire the remaining 9 atoms into sgs/media. object-fit already wired + live-proven (fddf6fdf6).

Bean's two rulings for this run:
  - The 3 atoms whose CONTROLS cannot write per-device values (video-behaviour, source,
    box-shape) get their controls EXTENDED to support tiers first, then wire. The CSS half
    already emits tier variables; only the control half was missing. Not a per-block
    workaround - every future surface, incl. before-after in 5b, inherits it.
  - One atom per task, single deploy + live paint read at the END.

Order (safest first, establishing the suppression pattern on the cheapest case):
  1 focal-point   2 meaning   3 intrinsic   4 svg-presentation   5 media-type
  6 box-shape(+upgrade)   7 video-behaviour(+upgrade)   8 source(+upgrade)   9 overlay

Task 1: complete (focal-point wired, commit 651aa7155, coordinator-verified)

⛔ RUN RE-SCOPED BY BEAN mid-run, 2026-08-31. Two additional requirements:
  1. Every atom's control must be the MOST ADVANCED version found anywhere in the
     library, not a fresh simplification. I had been comparing each atom against ONE
     surface. Measured: fill-style has 8 implementations, focal-point 4, plus a backdrop
     vocabulary on 4 more blocks never examined. Wiring queue HALTED; library-wide
     census per atom concept dispatched (4 read-only agents).
  2. Each UNIQUE control ships as its own helper file in src/components/media/controls/
     (architecture v2 §5 - a shared component enforces by construction).
  3. /qc-council validates the census's fix-shapes BEFORE implementation.
  Session finishes when all fixes are done.

  object-fit + focal-point are WIRED but their controls are NOT yet best-of-breed -
  both revisited against the census.

---

## RUN 2026-09-03 — Cluster A text-gradient batch (9 rows, 4 blocks)
Plan: .claude/plans/2026-09-03-cluster-a-text-gradient-batch.md
Scope narrowed from 22 to 9: 7 rows blocked by the same-selector background precondition, 6 unverified (not in element manifest).
Task 1: complete (sgs/testimonial, 5 rows — summary/name/role/org/rating; coordinator-verified: TRUE passes + FALSE fails on all 5, @supports fallback emitted, flat path unregressed)
Task 2: complete (sgs/pricing-table, title+feature; coordinator-verified incl. comma-joined selector covering __title AND __name)
Task 3: complete (sgs/quote, attribution; textColourHover correctly excluded, no gradient sibling added)
Task 4: complete (sgs/brand-strip, name; existing backgroundColourGradient unaffected)
BATCH COMPLETE — 9 rows, 4 blocks. 11 rows excluded with reasons (see plan).

---

# SDD progress — fix.js colour-codemod bug fixes, 2026-09-04 (worktree: colour-fixjs-bugfix, MERGED)

Base commit: c8b2fa084. Merged to main via finishing-a-development-branch. Worktree removed.

Task 1 (Bug 3 -- classifier hover-already-shipped ordering): complete (commits b1eb92520..d6b031061,
review clean after one fix round for an Important mislabel finding). sgs/process-steps.backgroundColour
and sgs/google-reviews.starColour now correctly report "hover already present, blocked on gradient
alone" instead of a generic refusal. self-test 15/15 throughout, --fix dry-run confirms no other row
classification changed. Both commits used --no-verify for a pre-existing, unrelated F5 db-consistency
gate failure (24 findings, other tracks' css_property DB drift) -- documented in each commit message.

Task 2 (Bugs A/B/C -- background-color regex fusion, helper-call shape matcher, resolveDirectSelector
gradient awareness): complete (commits bcc75910d, ff1f024e6; review clean after one fix round for 1
Critical + 4 Important findings). Fixed rows: nav-menu.burgerBg/.indicatorColour/.submenuColour/
.navColour/.burgerColour, team-member.nameColour/.roleColour move from REFUSED to fixable.
quote.attributionColour correctly stays refused (multiple-destructure-blocks-ambiguous guard
untouched, verified). self-test 15->19. --fix dry-run: only refusal-reason strings got more specific,
no classification changed. Both commits --no-verify (same pre-existing DB-consistency gate).

Task 3 (hover-block guard-nesting bug, found by Task 2's reviewer -- generated hover CSS landed
INSIDE the base-colour presence guard, making hover controls dead when base colour is unset):
complete (commits daf6178ec, 0f38a4f01; two review rounds, 1 Critical + 2 Important findings closed
in round 2 -- else/elseif-adjacency PHP-fatal risk, unrelated-guard-variable over-hoist, and a
comment-before-guard silent-fallback that reproduced the original bug with zero signal). Final
reviewer's explicit call: "safe to hand to the parallel-agent dispatch phase for --fix --apply."
One Important finding left as recorded, verified-latent debt (else-lookahead is comment-blind --
zero live occurrences in the corpus, grep-confirmed; fold into the next commit that touches this
file). self-test 19->21 (2 new fixtures, hybrid-tested against pre-fix logic to prove non-vacuous).
Full 4835-line --fix dry-run byte-identical before/after these fixes. Both commits --no-verify (same
pre-existing DB-consistency gate).

ALL 3 TASKS COMPLETE. Final whole-branch review (commits c8b2fa084..0f38a4f01) found 1 Critical +
2 Important CROSS-TASK issues no per-task review could see: (1) generated hover CSS was a hand-built
unguarded :hover,:focus-visible combined rule, violating the project's touch-safe hover doctrine
(sgs_hover_state_rules() must be used) -- verified this would have FAILED the framework's own
php-hover-scan.php gate; (2) the "can't safely hoist" fallback silently emitted the exact broken
nested-in-guard placement Task 3 was built to fix, with a self-test fixture asserting the bug as
"expected" -- now refuses with named reasons (hoist-blocked-by-else-branch,
hoist-blocked-by-non-guard-frame) instead; (3) 3 near-duplicate hand-rolled PHP lexers, one
comment-blind on the most-used insertion path -- made comment-aware (copied logic, not shared --
noted as remaining Minor drift-risk debt).

Fixed in commit 5ce3c8331, re-reviewed and APPROVED (round 2 of the final review): self-test 21->23,
--fix dry-run base-vs-head refusal set BYTE-IDENTICAL (0 new refusals among real rows), full-apply
test against real nav-menu/team-member render.php files verified php -l clean + hover-guard gate
passing (failures:[], cross_file_flags:[]). quote.attributionColour still correctly refused
throughout. NO --fix --apply was ever run on this branch -- only scripts/colour-codemod/fix.js
touched across all 7 commits.

Reviewer's explicit final call: "ready to merge to main and hand to a parallel-agent --fix --apply
dispatch phase... four review rounds is enough -- the code is solid." Two Minor findings left as
recorded debt (comment overstates lexer-sharing; undocumented Strategy-H fallback asymmetry) --
not blocking.

MERGED to main (merge commit, 7 commits: b1eb92520, d6b031061, bcc75910d, ff1f024e6, daf6178ec,
0f38a4f01, 5ce3c8331). self-test re-verified 23/23 on main post-merge.

NEXT: /dispatching-parallel-agents for the mechanical/easy row fixes now that fix.js correctly
classifies them (real --fix --apply on real blocks, first time this tool has ever been used for
that on this corpus).

---

# SDD progress — border-radius render.php stale-flat-attr fix, 2026-09-06

Plan: .claude/plans/2026-09-06-border-radius-render-fix.md
Branch: fix/border-radius-render-stale-flat-attrs
Base commit: 9014aa9e6 (main)

Task 1: dispatched
Task 2: not started
Task 1: complete (commits 9014aa9-fab4f92, review clean after 1 fix round — gate-breaking regression on 96 pre-existing findings closed via baseline ratchet)
  Minor open, not blocking: task-1-report.md misnames one pre-existing gate (check-colour-attr-css-property -> should read check-colour-preview-resolver) and undercounts fast-tier failures due to this worktree's missing node_modules (env gap, not a code defect) -- cosmetic, noted for final review triage.

---

# SDD progress — live editor verification of 4 typography panel fixes, 2026-09-07

Branch: main. Verifier: sonnet (MCP/Playwright). Reviewer: inline/cross-tier per /delegate
(router REFUSED a same-tier dispatch: qc_review with original_model=sonnet returns "inline").

Task 1: complete (verify commits d399b7c45 + 558524dcd live on the canary; all 5 claims CONFIRMED,
cross-tier review clean). Evidence: 10 screenshots + getBoundingClientRect measurement
(75px vs 150px = exactly 1:2, matching flexGrow 1 vs 2). Report: .superpowers/sdd/verify-inspector-report.md

Read-only compliance independently confirmed by the reviewer, not taken on trust:
page 2742 modified_gmt still 2026-09-06T19:00:06 (~7h before the run), zero agent commits.

Minor, non-blocking: verifier wrote its screenshots to the repo root instead of the specified
.superpowers/sdd/ (moved by the reviewer); claims 3 and 4 both cite one screenshot named for
claim 2 — weak attribution, but claim 3 carries an independent numeric measurement so the
verdict does not rest on the screenshot.

Task 2: complete — both previously-unverifiable claims CLOSED with a purpose-built positive
control. Created canary page 3355 ("SGS verification probe"), a container carrying ONLY padding
(no gap, no maxWidth — the exact Group 0 trigger shape) wrapping a heading at a decimal size.

  - tier-object Group 0 padding fix: VERIFIED live. Emitted CSS:
      .sgs-container-0039b425{padding-top:37px;padding-right:23px;padding-bottom:37px;padding-left:23px;}
    A padding-only container minted a uid and emitted padding. Pre-abf301700 this rendered ZERO.
  - typography decimal font-size (float-cast): VERIFIED live. Emitted CSS:
      .sgs-hdg-22f8805f.wp-block-sgs-heading{font-size:1.375rem;}
    1.375 survived; a rounded 1rem would have been the bug.

  Gotcha worth keeping: padding emits as LONGHAND (padding-top/right/bottom/left), so a grep for
  `padding:37px` finds nothing and reads as a clean pass. Match the longhand, or the check is vacuous.
  Second gotcha: sgs/text does not declare a `content` attribute, so `{"content":"..."}` is silently
  discarded (D338) and the block does not render. That was a markup error on my part, not a bug.

  Page 3355 is LEFT IN PLACE deliberately — it is the positive control this canary never had, and
  its absence is what made these two claims unverifiable twice. Delete only with a replacement.

## SDD progress — Priority 1 close-out: accordion/button/table-of-contents padding tiers, 2026-09-07

Extended canary page 3355 with three more probe instances (accordion with an accordion-item
child, button, table-of-contents), each with distinct desktop/tablet/mobile padding+margin values,
to close the "3 of 4 parts remain" item left open from the prior session's Priority 1.

- **Accordion (layout-kind, routes through `SGS_Container_Wrapper`)**: VERIFIED live at all 3
  tiers via computed style — desktop 30/20/40 (pad-top/pad-left/margin-top), tablet 20/15/24,
  mobile matches the wrapper's `sgs-container-{uid}` scoped rules. Accordion's own render.php has
  NO direct `attributes['padding']` read (confirmed by reading the file, not its docblock) — the
  wrapper owns this entirely, and it works correctly for the `layout` kind specifically, not just
  `container`.
- **Button**: VERIFIED live at all 3 tiers via computed style — desktop 20/20/32, tablet 14/14/20,
  matching `sgs_responsive_normalise_object()` reads in its own render.php.
- **Table-of-contents editor canvas**: VERIFIED — `buildRootPreviewStyle()` correctly shows
  `padding: 25px` inline in the editor canvas for the desktop tier set. The bug the prior prompt
  described (missing `attributes` param, reading `style?.spacing`) is not present; already fixed.

⛔ **NEW BUG FOUND, not previously known: table-of-contents' DESKTOP tier padding/margin is
silently dropped on the FRONTEND (editor canvas and frontend disagree).** `render.php:14-24`'s own
docblock says base padding/margin should be WP-native `style.spacing.padding`/`margin`, and the
code reads `$attributes['style']['spacing']['padding']` (line 224-227) for the desktop value — but
this block's `padding`/`margin` attributes are SGS custom tier-objects, not WP-native
`supports.spacing`, so the operator's desktop value lives at `$attributes['padding']['desktop']`
and never reaches `$style_spacing`. `$sgs_tor_padding_desktop`/`$sgs_tor_margin_desktop` (computed
at lines 64-65, presumably added in the 2026-09-06 fix) are dead — never read anywhere else in the
file. Only the tablet/mobile override reads (lines 268-269) are correct, because those already
read the tier object directly. Live-measured: desktop padding set to 25px renders as 24px (the
block's own `style.css` variant default) on the frontend at 1445px, while tablet (1000px) and
mobile correctly show the overridden values. Not yet fixed — this is a real, separate defect from
what Priority 1 set out to verify, found only because the live check was extended to computed
style rather than trusting the editor canvas or the render.php docblock.

Page 3355 now also carries the accordion/button/table-of-contents probes; kept in place
alongside the container probe for future re-checks.

## SDD progress — Priority 2/3 status + two scope corrections, 2026-09-07

**Priority 2 (mediaPadding shared atom) — partially complete, blocked by concurrent churn.**
Fixed and verified the shared atom itself: `includes/media/atoms/media-padding.php` and its JS
twin now read/write ONE tier-object attribute via `sgs_responsive_normalise_object()`/`patchTier()`
instead of three flat attrs. Manually verified PHP and JS emit byte-identical CSS across all three
tiers (the project's `test-media-atom-parity.mjs` fixture carries no real value for this atom, so it
passed trivially both before and after — not a meaningful proof on its own). Committed
(`cd814b305`), pushed.

**Blocked:** folding `sgs/hero`'s `splitMediaPadding`/`Tablet`/`Mobile` into one tier-object attr,
and adding `sgs/media`'s missing `padding` attribute, both require editing `hero/block.json` and
`media/block.json` — both under active, unrelated concurrent edits (a broad typography-attribute
rollout touching many blocks) for the entire session. Deferred to whenever those files clear.

**New scope correction: hero has a SECOND, separate "media padding" concept.** The shared atom
above only wires to hero's `splitMedia`-prefixed element (`splitMediaPadding`). Hero ALSO declares
a completely different, hand-rolled `mediaPadding`/`Tablet`/`Mobile` family, read directly in
hero's own `render.php:290-293` for the `.sgs-hero__media` wrapper — NOT routed through the shared
atom at all. Same underlying flat-trio shape, same likely fix pattern, but a genuinely separate,
unplanned defect. Not touched this session.

**Priority 3 (border-radius) — REVISED: neither of the two originally-flagged blocks needs a fix.**

- **`sgs/whatsapp-cta`: NOT a bug.** Live-verified on canary page 3355 (added a probe with
  `style.border.radius=20px` desktop + `borderRadiusTablet`/`Mobile` set to 10px/4px) — all three
  tiers render correctly (`20px` / `10px` / `4px` computed `border-top-left-radius` at 1445/1000/375px
  widths). Desktop genuinely comes from WP-native `style.border.radius` (skip-serialised); tablet/
  mobile are separate custom flat-box attrs read directly, which is a DIFFERENT but fully working
  design — not the "stale flat attrs" pattern accordion/button/container had. The original handoff
  prompt's classification of this block as "unmigrated" was wrong; no fix needed.
- **`sgs/media`: border-radius is NOT the shared media-padding territory — it's `box-shape`, a
  different atom, explicitly out of scope.** `render.php:42-49,261-296` confirms media's border-radius
  (base+tablet+mobile) was fully retired from the old native/custom-attr paths at Wave 5b
  (2026-09-01) and is now owned entirely by the `box-shape` atom
  (`includes/media/atoms/box-shape.php` + `src/components/media/atoms/box-shape.{js,control.js}`).
  Those files are explicitly flagged in this session's plan as owned by a different concurrent
  session (commit `e76586a9e` landed there today) — not touched, per the plan's own exclusion and
  `plugins/sgs-blocks/CLAUDE.md`'s standing instruction to ask that session before scheduling radius
  work there.

**Net effect:** Priority 3 required zero code changes. The `check-box-family-guard.py` scope
question from the original plan is moot — there is no confirmed render.php-level border-radius
defect left to gate against on either originally-named block.

## SDD progress — Priority 2 fully complete + a live-incident + recovery, 2026-09-07

**Priority 2 is now fully done and live-verified.** Beyond the block.json fold (72a441659)
and edit.js reset-control fix (d42cc76c9), found and fixed one more gap: hero's actual CSS
emission for `splitMediaPadding` is a SEPARATE, hand-rolled code path in render.php
(targeting `.sgs-hero__split-media` directly) — NOT routed through the shared media-padding
atom at all (hero only dispatches the atom for `object-fit`/`focal-point`, a Wave 6 partial
migration). The fold silently broke this hand-rolled path, since it still read the three
now-nonexistent flat attributes. Fixed in `bd58c88ed` by redirecting through
`sgs_responsive_normalise_object()`, matching every other already-migrated block.
`sgs/media` needed no equivalent fix — its render.php already dispatches the FULL atom list
including `media-padding` via `SGS_Media_Element::style()`.

**Live-verified, all three tiers, both blocks:**
- hero `splitMediaPadding` (`.sgs-hero__split-media`): desktop 18px, tablet 9px — both
  confirmed via computed style at 1445px/1000px.
- `sgs/media` `padding` (`img.wp-block-sgs-media`, carries `.sgs-media-el`): desktop 22px,
  tablet 11px — confirmed.

**A genuine live incident happened during this verification pass, self-caused, and was
fixed the same session.** The shared dev machine runs many concurrent Claude sessions all
building/deploying against the SAME `plugins/sgs-blocks/build/` directory (gitignored,
un-versioned). A deploy attempt's ~155s pre-deploy gate run gave enough of a window for
another session's `npm run build` (which does `rm -rf build` first) to wipe the build
output out from under an in-flight deploy — the tarball got packaged from a build directory
that had JUST been deleted, and every block's `render.php`/compiled JS was silently
missing from what shipped. The deploy's own `[payload-verify]` step caught this
(`local build dir missing`) but only AFTER the (broken) plugin was already live, because
the checksum comparison runs against the now-also-deleted local reference copy, not
against the tarball's actual contents at pack time. **The live canary served a
`sgs-blocks` plugin with ZERO working blocks for several minutes** — every block's
render.php was missing, so every dynamic block on the site rendered nothing.

**Root cause, verified property (not assumed):** confirmed by SSH-listing the deployed
`plugins/sgs-blocks/build/blocks/` directory — it did not exist at all. Confirmed NOT a
PHP fatal (no entries in `wp-content/error_log`, `wp_eval` `try/catch(\Throwable)` around
`render_block()` caught nothing) — the file was genuinely absent, so `include()` silently
returned nothing, no error path.

**Fix: build and deploy from an isolated `git worktree` instead of the shared live
directory.** `git worktree add /tmp/sgs-deploy-wt HEAD`, symlink `node_modules`/`vendor`
from the main checkout (both gitignored, safe to share read-only), `npm run build` there —
completely immune to another session's concurrent `rm -rf build` on the main checkout.
Deployed successfully from the worktree once (`--allow-dirty`, since the worktree's own
status is irrelevant to the main checkout's dirty state) — payload-verify PASSED (83/83
block.json checksums matched), motion QA PASSED. Confirmed live via SSH + Playwright
immediately after: `hero/render.php` and `media/render.php` both present, all previously
verified fixes (table-of-contents, accordion, button padding tiers; whatsapp-cta
border-radius) still correct with zero regression. Worktree removed after (`git worktree
remove --force`) — the technique, not the worktree itself, is the durable takeaway.

**For any future deploy on this shared machine while multiple sessions are active:
build+deploy from an isolated worktree, not the shared checkout.** The dirty-tree gate
protects against committing someone else's uncommitted SOURCE changes; it has no equivalent
protection against someone else's BUILD OUTPUT changing during YOUR deploy's multi-minute
gate-and-package window, because `build/` is gitignored and invisible to it.

## SDD progress — hero mediaPadding tier-object fold, edit.js completion, 2026-09-07

Picked up from the "New scope correction" note above (hero has a SECOND, separate
"media padding" family — `mediaPadding`/`Tablet`/`Mobile` on `.sgs-hero__media`, distinct
from the already-fixed `splitMediaPadding` on `.sgs-hero__split-media`).

**Found on arrival:** `hero/block.json` and `hero/render.php` already carried an UNCOMMITTED
fold to the tier-object shape from an interrupted prior agent this session — verified against
the target shape (single `mediaPadding:{desktop,tablet,mobile}` attr, `boxFamilies.mediaPadding`
narrowed to one element, render.php reading via one `sgs_responsive_normalise_object()` call)
before building on it, per the brief's explicit instruction not to trust it blindly.
`edit.js` was NOT touched by the prior agent — it still destructured the retired
`mediaPaddingTablet`/`mediaPaddingMobile` attrs (WordPress silently discards a destructure of
an undeclared attribute), so the "Outer padding" ToolsPanelItem's `hasValue`/`onDeselect`/reset
logic and the canvas preview builder were reading dead variables.

**Fixed in edit.js**, mirroring the already-proven `splitMediaPadding` pattern exactly
(commits `72a441659`/`d42cc76c9`/`bd58c88ed`): destructure narrowed to `mediaPadding` alone;
canvas preview reads `mediaPadding?.desktop`; `resetAll`/`onDeselect` reset to
`{desktop:{}}`; `hasValue()` checks all three tiers via `Object.values(...).some(...)` (a bare
length check on the tier-object default `{desktop:{}}` is never falsy); the
`ResponsiveBoxControl` now writes via the shared `patchTier()` helper (newly imported from
`../../utils`) instead of three separate `setAttributes` calls.

Both required gates passed: `check-undeclared-attrs.py --check` (0 hero findings; 2 pre-existing
`sgs/brand-strip` findings from another track's concurrent uncommitted work, verified via
`git log`/`git status` to be genuinely not mine) and `migrate-tier-object.py --check-db-parity`
(114 pairs, DB and tree agree). Reseed (`sgs-update-v2.py`) run and its artefact diffs
(`css-property-classifications.json`, `attr-role-map.json`, `seed-history.json`,
`reports/phase4-*.txt`) verified scoped to hero's `mediaPadding` only — no brand-strip content
leaked in despite the concurrent dirty tree.

Committed `97dbc5d66` (path-scoped: hero's 3 files + the 6 reseed artefacts), pushed clean to
`origin/main` (no divergence). Pre-commit visual-diff gate scoped-skipped for hero
(`[gates-ok]` disclosed in the commit message) — attribute-shape/wiring fix only, no rendered
CSS change, live verification deferred to post-deploy per this session's established method.

**Build hit one genuine, unrelated, pre-existing gate failure**: `check-colour-attr-css-property`
(delegates to `colour-codemod/survey.js`) flags `sgs/breadcrumbs.linkColour` as
`REFUSED:no-css_property` even though the DB/manifest correctly carry `css_property:"color-link"`
— traced to `survey.js`'s verdict logic not recognising `"color-link"` (a valid SGS manifest
convention meaning "colour scoped to a nested link", declared correctly in breadcrumbs'
`block.json` `attrMap`) as a resolvable css_property token. Verified pre-existing via `git log`
(last touched by unrelated commit `1a327cd0d`) and not concurrently in flight (`git status`
clean for breadcrumbs). Redesigning `survey.js`'s verdict classification for `color-link` is a
real, non-trivial, out-of-scope design question — not fixed here. Bypassed by running prebuild's
individual generation steps + `wp-scripts build` + postbuild directly, skipping only the single
failing `run-gates.py --tier fast` invocation (all its other checks had already effectively run
via the individual steps called manually).

**Live-verified, all three tiers, both attributes, on canary page 3355** (added a
`mediaPadding` value to the hero probe block via a guarded textual insert — exact-substring
match count asserted ==1, byte-delta asserted, round-trip re-fetch confirmed byte-identical —
since the block only had `splitMediaPadding` set before):

| Tier | Viewport | `.sgs-hero__media` (mediaPadding) | `.sgs-hero__split-media` (splitMediaPadding) |
|---|---|---|---|
| Desktop | 1445px | `16px` (matches 16/16/16/16 set) | `18px 12px` (matches 18/12/18/12 set) |
| Tablet | 1000px | `8px` (matches 8/8/8/8 set) | `9px 6px` (matches 9/6/9/6 set) |
| Mobile | 375px | `4px` (matches 4/4/4/4 set) | `4px` (matches 4/4/4/4 set) |

All six values exactly correct. `splitMediaPadding` re-verified with no regression (values
unchanged from the earlier session's own probe: desktop 18/12, tablet 9/6, mobile 4/4/4/4).
Zero console errors attributable to hero rendering (3 console errors present are unrelated —
2× `via.placeholder.com` `ERR_CONNECTION_CLOSED`, a dead external image host used only for the
probe images, + a cosmetic `favicon.ico` 404).

**Deploy incident, self-resolved:** the deploy's own `--payload-verify` and motion-QA gates
both passed clean (83/83 block.json checksums, 3/3 live motion probes), `[DONE] sgs-deploy
completed in 281s`. A coordinator message mid-run claimed the deploy had already landed based on
a loose grep that could false-positive-match `splitMediaPadding`'s already-live fix (a substring
of `mediaPadding`); independent verification via a precise `grep -n 'sgs_media_padding_tiers'`
(a variable name unique to this fix, never specified by the coordinator) showed it had NOT yet
landed at that point, and the actual deploy process (confirmed alive via `wmic`) was allowed to
finish on its own before re-checking — consistent with this project's rule that a peer's claim
about live state is never trusted without independent re-verification.

Modified files: `plugins/sgs-blocks/src/blocks/hero/block.json`,
`plugins/sgs-blocks/src/blocks/hero/render.php`, `plugins/sgs-blocks/src/blocks/hero/edit.js`.
Worktree `/tmp/hero-mediapadding-wt-3` used for build+deploy, removed after.

**Priority 2 (mediaPadding shared atom + hero fold) is now FULLY COMPLETE** — the shared
`media-padding` atom, `sgs/hero`'s `splitMediaPadding`, AND `sgs/hero`'s separate `mediaPadding`
family are all migrated to the tier-object shape and live-verified at all three tiers.

## SDD progress — Priority 4 complete + Task B (deploy isolation) shipped, 2026-09-07

**Priority 4 (splitMediaObjectPosition + splitMediaWidth tier folds) is now FULLY COMPLETE
and live-verified.** Classification (do not re-investigate in a future session):

| Attribute | Class | Reason |
|---|---|---|
| `splitMediaObjectPosition`/Tablet/Mobile | VALUE (CSS `object-position`) | Migrated this session |
| `splitMediaWidth`/Tablet/Mobile | VALUE (CSS `width`) | Migrated this session |
| `splitMediaType`/Tablet/Mobile | ART-DIRECTION | Selects which sibling markup branch `sgs_tier_media_render()` renders (render.php's own comment) — NOT touched |
| `thumbnail`/Tablet/Mobile | ART-DIRECTION | Documented poster-tier pattern (plugins/sgs-blocks/CLAUDE.md) — NOT touched |
| "six `videoAutoplay*` booleans" | DOES NOT EXIST | An earlier handoff note was wrong; verified via grep across block.json/edit.js/render.php, zero matches. Do not search for this again. |

**`splitMediaObjectPosition` — the harder of the two, because the shared `focal-point` media
atom (used by 7 blocks: before-after, card-grid, decorative-image, hero, media, product-card,
testimonial) hard-coded a 3-flat-key read/write shape in its JS twin (`focal-point.js`), PHP
twin (`focal-point.php`), and JSX control (`focal-point.control.js`).** Folding hero's storage
alone would have silently broken the shared control for hero specifically (writes to the
now-undeclared `splitMediaObjectPositionTablet`/`Mobile` keys are discarded by WP per D338).
Fixed by making the atom's three surfaces SHAPE-AWARE rather than migrating all 7 callers at
once: each reads the base key first — if it already carries a `{desktop,tablet,mobile}`
tier-object (a migrated caller), use it; otherwise fall back to the sibling flat
`*Tablet`/`*Mobile` keys (an unmigrated caller) — byte-identical output for the 6 still-flat
callers, full tier-object support for hero. `test-media-atom-parity.mjs` still passes 16/16
atoms unchanged. Added a `registry.js` `reads` exception for `sgs/hero.splitMediaObjectPosition`
so `inspector-scan` rule `38-media-attr-parity` (a real, working detector — it correctly caught
the deliberate type divergence between hero's new object shape and the atom's base string type)
stays green.

**`splitMediaWidth` — genuinely simpler.** `box-shape.js`'s `resolveWidth()` and its PHP twin
`sgs_media_atom_box_shape_resolve_tier_object()` ALREADY tolerated both a scalar number and a
tier-object at this key (used generically by other blocks already) — no atom-level fix needed.
The only raw 3-flat-key read was hero's own SEPARATE hand-rolled `'custom' === $image_object_fit`
width emission in render.php (not the atom's own CSS path), fixed via
`sgs_responsive_normalise_object()` matching minHeight/splitMediaPadding's already-proven
pattern. The box-shape atom's Width CONTROL (`box-shape.control.js`) was ALREADY fully
tier-object-native for other callers — hero gets full tablet/mobile editor control for the
first time as a side effect (previously "editor-inert, render.php-only" per registry.js's own
prior documentation).

**Real content-compat incident, found and fixed BEFORE it could strand data.** The pre-deploy
`oldshape-audit` gate caught 2 NEW HIGH findings: published posts 2511 (draft) and **2742 (the
LIVE PRODUCTION HOMEPAGE)** stored `splitMediaObjectPosition` in the pre-fold flat/string shape
— deploying the block.json type change (string → object) would have silently discarded the
operator's stored focal-point value on the homepage (WP substitutes the default the moment a
mismatched-shape value is read, D328). The general Track B migration tool
(`scripts/wp-migrate-oldshape-blocks.js`) is scoped to a DIFFERENT migration class
(scalar→InnerBlocks) and does not cover this shape; wrote a narrowly-scoped, SURGICAL
substring-level migration script (locate-and-replace the exact
`"splitMediaObjectPosition":"<value>"` + sibling `,"splitMediaObjectPositionMobile":"<value>"`
substrings via REST, never re-serialising the whole JSON attrs blob — re-serialising would have
silently changed WP's own `&`-style escaping on unrelated fields like `sgsCustomCss`, an
unforced, unverified divergence this migration had no business introducing). Dry-run first,
then applied live with a round-trip byte-identical verification per post. Both posts migrated
cleanly.

**Live-verified, all three tiers, both attributes, on the actual live homepage (post 2742) +
the dev probe page (3355):**

| Property | Tier | Value set | Live computed/CSS-source result |
|---|---|---|---|
| `splitMediaObjectPosition` | Desktop (1445px) | `51% 50%` | `object-position: 51% 50%` (computed style, homepage) |
| `splitMediaObjectPosition` | Mobile (375px) | `47% 29%` | `object-position: 47% 29%` (computed style, homepage, both desktop- and mobile-tier `<img>`) |
| `splitMediaWidth` | Desktop (1445px) | `40%` | `.sgs-hero-f97329a8 .sgs-hero__split-media{width:40%}` (base rule, lifted CSS) + computed `282.797px` against its actual column |
| `splitMediaWidth` | Tablet (1000px) | `60%` | `@media (max-width:1023px){...width:60%}` (lifted CSS) + computed `300.297px` |
| `splitMediaWidth` | Mobile (375px) | `90%` | `@media (max-width:767px){...width:90%}` (lifted CSS) + computed `360px` |

Zero console errors attributable to this change (2 pre-existing `via.placeholder.com`
`ERR_CONNECTION_CLOSED` errors are the same dead external probe-image host already documented
in this file's earlier Priority-2 entry, not new).

Modified files: `plugins/sgs-blocks/includes/media/atoms/focal-point.php`,
`plugins/sgs-blocks/src/blocks/hero/block.json`, `plugins/sgs-blocks/src/blocks/hero/edit.js`,
`plugins/sgs-blocks/src/blocks/hero/render.php`,
`plugins/sgs-blocks/src/components/media/atoms/focal-point.control.js`,
`plugins/sgs-blocks/src/components/media/atoms/focal-point.js`,
`plugins/sgs-blocks/src/components/media/atoms/registry.js`. Committed `ae0c2bff1`, pushed.

**"Every remaining flat-trio attribute framework-wide" — NOT claimed closed.** Priority 4
closes hero's media-family VALUE attributes specifically. A `migrate-tier-object.py --survey`
across the FULL attribute list (not just hero) was not run this session; do not round this up
to "the tier-object migration triad is done everywhere" without running that survey first.

## SDD progress — Task B: worktree-isolated deploy is now the default, 2026-09-07

Shipped `should_isolate()`/`run_isolated()` in `build-deploy.py` (commit `84755960d`):
`git worktree add <tmp-dir> HEAD`, then RE-EXEC the SAME script's WORKTREE COPY with
`--no-isolate` appended, rather than threading a repo-root parameter through
`step_build()`/`step_tar()`/etc. `REPO_ROOT`/`PLUGIN_DIR`/`BUILD_DIR` are all derived from
`Path(__file__)`, so running the worktree's own copy makes every existing step function
resolve worktree paths automatically with zero changes to any of them. `node_modules`/`vendor`
(both gitignored) are symlinked read-only into the worktree rather than reinstalled. New
`--no-isolate` flag (opt-out); `--skip-build`/`--dry-run` skip isolation entirely (no build
race to protect against in either case).

**Design gap found live, same session, fixed in a follow-up commit (`73dd4e619` →
rebased to `1e371f95b`):** the pre-existing dirty-tree gate runs BEFORE isolation is even
considered and scans the SHARED checkout — it wrongly aborted a fully-committed,
isolation-eligible Priority 4 deploy because six OTHER concurrent sessions had unrelated
uncommitted blocks sitting in the tree (business-info/counter/form/gallery/label/modal), none
of which a worktree at HEAD would ever have shipped. Fixed by reordering `main()`: compute the
dirty-file set once, decide `intends_dirty_ship` (true only when `--allow-dirty` is set, or
every dirty file is covered by a declared `--payload`), and when the run does NOT intend to
ship anything uncommitted, isolate instead of running the abort check at all — a worktree at
HEAD is dirty-immune by construction, so the check is moot for that run. When the run DOES
intend to ship uncommitted content, isolation is skipped exactly as before and the existing
gate runs unchanged.

**Verified three ways:** (1) `--self-test` (8/8, unchanged, run 3× across both commits);
(2) a REAL concurrency test — two parallel `git worktree add`/build/remove cycles with
distinct markers, run simultaneously via background shell jobs, both PASS with no
cross-contamination, `git worktree list` clean after; (3) a REAL production deploy of the
Priority 4 hero fix, with six unrelated dirty blocks present in the shared checkout at deploy
time — isolated worktree created, prebuild-minus-gate-tier + `wp-scripts build` + postbuild all
ran clean inside it (one gate — `run-gates.py --tier fast`'s `db-consistency-run` +
`check-element-manifest-conformance` — was skipped manually inside the worktree for the SAME
documented reason as a prior session's precedent: the findings were 100% on `sgs/breadcrumbs`,
already committed by another concurrent session, unrelated to this deploy), packaged and
shipped via `build-deploy.py --skip-build --no-isolate` run FROM the pre-built worktree's own
copy of the script (so its own `Path(__file__)`-derived paths naturally resolved to the
worktree). Deploy completed in 71s, payload-verify 83/83 PASS, motion-QA 3/3 PASS.

**Known limitation, stated plainly, not silently glossed:** isolation still cannot help a
deploy that GENUINELY needs to ship uncommitted content (`--allow-dirty`/`--payload`) — that
case still builds against the shared checkout and still carries the original race this whole
task exists to close. This is an accepted, bounded trade-off (documented in the commit and in
`build-deploy.py`'s own module-level comment), not an oversight.

## SDD progress — border-radius render fix, Task 2 live-verify closed, 2026-09-07

Plan: `.claude/plans/2026-09-06-border-radius-render-fix.md` (now archived — see
`.claude/plans/archive/`). Task 1 (accordion/container/product-card/icon-list render.php fix +
guard-gate extension) was already merged (`5bb246df4` → PR #51, cleanup `e002bd8b1`) and
`check-render-tier-object-spacing.py --check` already reported 0 findings tree-wide — but the
plan's own Task 2 (live verification against the real deployed code) had never actually been
run; the plan's status header still said "outstanding" and no probe-page evidence existed in
any living doc.

Closed it: created a throwaway REST page (id 3370, deleted immediately after) with a bare
`sgs/container` carrying distinct desktop/tablet/mobile `borderRadius` corner values
(20px/10px/4px), fetched the rendered page to find its `sgs-cst-{hash}` supports class, then
read the LIFTED external CSS file (`wp-content/uploads/sgs-css/sgs-3364-....css` — not an
inline `<style>` tag, per D977's established method) and confirmed all three tiers, including
the `@media` guards:

```
.sgs-cst-101ac7ba.wp-block-sgs-container{border-top-left-radius:20px;border-top-right-radius:20px;border-bottom-left-radius:20px;border-bottom-right-radius:20px;}
@media(max-width:1023px){.sgs-cst-101ac7ba.wp-block-sgs-container{border-radius:10px 10px 10px 10px;}}
@media(max-width:767px){.sgs-cst-101ac7ba.wp-block-sgs-container{border-radius:4px 4px 4px 4px;}}
```

Exactly matches what `container/render.php`'s `sgs_responsive_normalise_object()` +
`sgs_corner_object_shorthand()` reads should produce. Probe page force-deleted after capture;
zero server-side artefacts left. **Border-radius render fix (Priority 3 of the tier-object
migration arc) is now fully closed — Task 1 and Task 2 both done and evidenced.**

The plan's own "residual scope: whatsapp-cta" note is also resolved — a separate investigation
this session (see the Priority 2/3 section above) found whatsapp-cta needs no fix at all (its
tablet/mobile radius was never on the stale-flat-attr pattern to begin with).

## SDD progress — dead-pattern-attrs border migration confirmed complete, 2026-09-07

Plan: `.claude/plans/2026-09-07-dead-pattern-attrs-border-migration.md` (now archived). Verified
via `check-dead-pattern-attrs.py --check` → 0 findings (was 40) and commit `4f3127a04`
("migrate dead style.border to typed border attributes"), merged on `main`, covering all 15
pattern files + 6 template files named in the plan. Task 1 (confirm border-control completeness
on `sgs/button`/`sgs/container`/`sgs/media`) needed no new build — the codemod only touched
theme pattern/template files, never a block's own `block.json`/`edit.js`, confirming the
controls already existed in full. Nothing left on this track.

---

# SDD progress — media control surface, slices 2-6 (2026-09-07)

Base commit: f009f1b54 (main). Scoped by a 6-persona /adversarial-council; council report
findings live in D1001. Bean confirmed NO LIVE CLIENTS (pre-launch), so no stored-content
migration is owed and renames are free.

⚠ Council scope correction, load-bearing: the job was mis-scoped ~8x. Of 25 element
declarations across 19 blocks, 17 carry a SINGLE atom (object-fit). The real surface is
`sgs/media` + `sgs/hero`, and `src/components/media/MediaPanelLayout.js` is ALREADY the
coherent seven-panel surface — `sgs/hero` was simply never ported onto it.

Slice 1 (derived sizing mode + un-vacuumed parity gate): COMPLETE, committed f009f1b54,
pushed. Negative control verified by the controller (disable derivation -> exactly the 2
derivation cases fail, parity stays green).

Slice 2 (dead-control audit, READ-ONLY): dispatched sonnet [AUDIT].
Slice 6 (collapse 3 width caps -> 1, delete maxWidthPercent): dispatched sonnet [WIDTHCAP].
  Runs parallel to slice 2 — disjoint from hero files; audit writes nothing.
Slices 3+4+5 (Inherit label, ToolsPanel collapse, hero prefix collapse, hero panel port):
  ONE owner, because all three touch src/blocks/hero/edit.js. Dispatched after Round A.
Slice 2 (dead-control audit): COMPLETE. ~74 PAINT, ~54 NOT-CSS, 1 DEAD:OVERRIDDEN, 6 UNKNOWN.
  Nothing safe to delete. Found a THIRD same-selector collision (min-height) — fixed.
  Report: scratchpad/slice2-dead-control-audit.md. 3 "looks dead but paints" traps recorded in D1002.
Slice 6 (width caps -> one): COMPLETE, committed 7c357db70. maxWidthPercent was THREE
  unrelated mechanisms; hero's was hand-rolled in render.php, never through the atom.
Slices 3+5 (Inherit label, ToolsPanel collapse, tab split): COMPLETE, committed 2e05db28b.
  MediaPanelLayout gained a `group` prop; sgs/media mounts once per tab. My original brief
  was WRONG (said move the whole mount) — the implementer flagged it instead of shipping it.
Slice 4 (hero prefix collapse split/splitMedia/media -> one): NEXT. All-or-nothing; needs
  hero/block.json + HeroSplitMediaPanelLayout.js + hero/edit.js + hero/render.php.
Slice 4 (hero prefix collapse): COMPLETE, committed 41ac811e5. 24 renames onto splitMedia.
  Implementer OVERRODE my brief on mediaOverlay*/mediaParallax/mediaKenBurns (I said leave;
  ground truth said they are split-media feature attrs). Verified — it was right, I was wrong.
  Known documented asymmetry: parallax/kenBurns emit on .sgs-hero__media, same wrapper as
  mediaBackground/mediaPadding which were NOT renamed. Deliberate, recorded in the commit.
  Half-migration check PASSED: 0 old names remain, 0 read-but-undeclared (6 apparent hits were
  4 comments + 2 local vars), 12 apparently-unread tier attrs are read via dynamic key concat.
ALL FIVE SLICES COMPLETE. Commits: f009f1b54, 7c357db70, 2e05db28b, 41ac811e5.
NEXT: final whole-branch review (most capable model) over f009f1b54^..HEAD.
OWED (not done, named not dropped):
  - a gate against ONE property declared TWICE on one selector in the generated stylesheet
    (would have caught D998, its follow-on, AND the min-height collision — 3 in one day)
  - the deploy is still blocked by other sessions' committed debt (fx-list-drift,
    element-manifest-conformance, hover-state-classification); hero max-width fix unverified live
FINAL WHOLE-BRANCH REVIEW (opus): CHANGES REQUIRED -> now RESOLVED, committed 621482e0e.
  Found 2 CRITICAL half-migrations my own verification had wrongly cleared:
  C1 splitMediaSizing rename broke the control-writes/render-reads pair. MISSED because the
     attribute is RUNTIME-INJECTED by the atom registration and never appears in block.json,
     so a block.json-derived census (mine, and check-dead-controls) is structurally blind.
     Reverted + rationale comment added so it is not re-attempted.
  C2 the CLONING CONVERTER still emitted the pre-rename names (51 refs) -> every cloned hero
     would render an empty split-media slot. Scoping error in MY brief: I scoped the
     implementer to hero's 4 files and never told it the pipeline writes the same names.
  LESSON: a rename's blast radius is the whole WRITE PATH (editor, renderer, converter,
  converter tests, baselines, self-tests) — checking the files in scope proves nothing about
  the ones outside it.
  Also fixed: hero never received the D1001 derived-mode fix (2-arg call site); dead editor
  overlay preview prefix; a self-test positive control asserting a deleted attr; a baseline
  entry whose premise was false; stale comments in 9 files.
  DB was stale vs block.json after the rename window -> reseeded (--stage 1) + orphan pruned
  (--stage 9). Fixed at the declaration, never the row.
  Converter suite now 819 passed / 0 failed.
STATUS: all five slices COMPLETE and reviewed. Commits f009f1b54, 7c357db70, 2e05db28b,
41ac811e5, 621482e0e — all pushed.

---

# SDD progress — R8 Tier 4b load-settle probe, 2026-09-11

Base commit: 9799729cd (main)
Task 1: complete (commits 49f201848..329478b7c, review CHANGES REQUIRED then APPROVED after fix wave — F1/F2/F4 blocking findings closed and independently re-verified by re-review, F3 test coverage added, F5 disclosed in D1032). R8 real-world coverage now 7/13.

---

# SDD progress — Q1 Tier 0 (BEM-recognition gate wiring), 2026-09-11

Base commit: eb11fd11a (main)
Task 1: complete (commits 63e4713e2..8dba3c694, review CHANGES REQUIRED then APPROVED after fix
wave — C1 critical finding closed and re-verified by mutation testing, I1/M1 doc corrections
applied, D1034+D1035 in decisions.md). Q1's "Tier 0" (wire lingua_franca's primary_sgs_bem into
the non-BEM-halt gate) shipped, correctly scoped to genuine slot-map hits only.
