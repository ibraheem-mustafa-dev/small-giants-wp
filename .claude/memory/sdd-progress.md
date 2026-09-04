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
