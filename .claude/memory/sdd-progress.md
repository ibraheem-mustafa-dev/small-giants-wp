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
Plan: .claude/plans/2026-08-24-stack-layout-rebuild.md
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
