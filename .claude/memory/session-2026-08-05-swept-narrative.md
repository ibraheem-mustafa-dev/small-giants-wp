# LEDGER narrative swept out 2026-08-05 (manual sweep, not ledger-rotate.py)

Swept during the D1-forward-tracking / authored-alt-text-split / svg-role documentation session
(D489-D49x — see `decisions.md` head) to keep `LEDGER.md` under its 24,576-byte cap. Both sections
below are UNCHANGED from the LEDGER at the point they were cut — verbatim, not summarised. Neither
was closed by this session; they remain live backlog. `LEDGER.md` now carries one-line pointers to
this file in their place.

---

## NEXT SESSION — Snooza pitch demo (revenue), or the motion gap register

**Read FIRST, in order:** this file → `STOP-CATALOGUE.md` → `decisions.md` **D479** →
**`plans/2026-08-03-motion-gap-register.md`** (THE consolidated register — 13 missing categories,
8 built-weaknesses, all licence reality) → `plans/2026-08-03-snooza-configurator-build-plan.md`
(⛔ read its SUPERSEDED banner first) → Spec 38 §1 (Tier W) + §3.3.

### Task 1 — Snooza PITCH DEMO [inline, Opus] — HIGHEST VALUE, revenue-bearing
**What:** one `.glb` + one `.usdz` in a standalone `model-viewer` page. No WordPress, no configurator.
**Why:** Bean's proposal ends *"I'll bring the Snooza Chair in 3D on my phone."* That demo needs a 3D
file and an HTML page — nothing else. It is a separate deliverable from the 6-week build, and it is
the one with a real deadline.
⚠ **Android AR uses the `.glb`; iOS AR Quick Look needs a `.usdz`.** model-viewer can auto-generate
one, but Google's own docs warn it "might not produce desired results" — for a live pitch on an
iPhone, ship an explicit `.usdz`. Assets: `sites/snooza-chair/assets/` (19 files + `3d-model/`).
⚠ Bean's ruling: **the model need NOT be dimensionally exact** — it must read convincingly on a phone.
**Time:** 2-3 days. **/qc gate:** Bean's eye on a real phone.
**Acceptance:** AR launches on iOS AND Android from one page.

### Task 2 — Tier W first effect: fluid cursor field [delegated, sonnet]
**What:** `sgs/cursor-field` gains a `webgl` mode using OGL, wrapped behind `init/setUniform/destroy`.
**Brief:** start from `PavelDoGreat/WebGL-Fluid-Simulation` (**MIT**, ★16.5k, clean config object for
radius/dissipation/force). Must honour all three Tier-W-only contracts (context-loss recovery,
explicit GPU disposal, pause off-screen) and fall back to the existing CSS glow.
**Depends on:** none. **Parallel with:** Tasks 3, 4. **/qc gate:** yes — `/qc-inline` + a live probe.
**Acceptance:** fluid visible on canary; a no-WebGL context still paints the Tier V glow; zero bytes
shipped on a page without it.

### Task 3 — Client-usability sweep [delegated, sonnet] — PRESETS BEFORE PARAMETERS
**What:** the register §3 item every audit independently landed on. Named presets a client picks
("Ripple", "Brick reveal"); raw numbers move behind an "Advanced" toggle. Plus: an audio
sensitivity/gain control (~15 min), and LABEL the three agency-only tools (image-sequence, fx-morph,
fx-scramble) in the editor so the capability roster stays honest.
**Parallel with:** Tasks 2, 4. **/qc gate:** yes. **Acceptance:** a preset dropdown ships on ≥1 effect.

### Task 4 — Verify the two unproven fixes [delegated, haiku] — 20 min total
`fx-morph` live on canary (D452's fix is committed but was never verified) and D451's motion-path
repeat-trigger status. Register §1 items 4 and 5.

### Dependency graph
```
Task 1 (inline, Opus — revenue deadline, do first)
Task 2 + Task 3 + Task 4 (parallel, delegated)
        ↓ /qc-inline per branch
Commit by EXACT PATH → push main
```

### Methodology guardrails (do not skip)
**MOVED to `STOP-CATALOGUE.md` §E2** — 7 rules (stale-doc trap, never hand-author a guessed
attribute, probe-vs-effect, fix-the-instrument, verify licences via `gh api`, shared-worktree
commit discipline, deploy-before-measure). Read them there before this track.

---

### TRACK 1 (routing) — ordered follow-on from D480. Register: `.claude/reports/2026-08-02-pipeline-routing-review.md`

**Read FIRST:** that report (§THE FOUR DECISIONS, §7 the categorical target, §APPENDIX 18 corrections)
+ `.claude/reports/2026-08-03-handover-to-spec35-block-attribute-defects.md`.
**The design bar (Bean):** 100% routing accuracy, totally deterministic. Every branch must separate
its options by an INNATE CATEGORICAL DB FACT — never rowid, document order, catalogue order or a name
guess. "No match" is an intended outcome (class-section → `sgs/container`), never a fallback; a tie
is a LOUD failure. **Nine sites currently violate this — the report lists them.**

**R4 — Fix the trace — SHIPPED 2026-08-04.** It was **THREE defects, not one**, and "fix the trace"
mis-framed all three: the trace was never TRUNCATED, it was never INSTRUMENTED past stage 4 (9 emit
sites, all ≤ stage 4 → now 26). (a) instrumented 9 / 9b / anti-mirror gate / 4i / 4j / 4k / 10 /
11.6 / run-completion; (b) `errors.log`+`warnings.log` were written ONLY when non-empty, so absence
could not distinguish "clean" from "never ran" — now always written, count on line 1; (c) **the one
no register caught** — the log surfacer ran at `orchestrator:2774`, BEFORE stages 10/11.6/4k, so
`summary.log` could never describe them however well instrumented. Now re-surfaced in a `__main__`
finally-block covering every exit path (early return, stage-gate `sys.exit`, exception).
Negative control proven: a stage-4-only trace fails the assertion.

**R1 — Section-root capability gate — BUILT 2026-08-04, Bean-ruled DISSOLVE.**
NOT a design change: **FR-31-16 already mandates this exact gate** ("Recognition consults
`blocks.tier='class-section'` via `is_class_section_block()`; class-section blocks emit their
composite, ALL OTHERS fall to the FR-31-4 default"). The flag was only ever read by the Stage-1
voter and loop 2's content entry — neither decides the emitted block. Gate inserted in
`recognise_section`, gating the NAMED branch only (atomic/scalar resolve from no root class, so
FR-31-4's subject does not reach them). Demotion emits a `recognise_section_capability_gate` trace
event — **trace only, no gap row** (Bean: marking a new class-section block is a declaration
responsibility; container-as-default is the designed outcome, not a defect). `entry.py` binds
`recognition.set_trace_fn` or the event is a guaranteed no-op.
⛔ **MEASURED, and it corrected my own docstring:** the demoted node's identity **DISSOLVES, it does
not nest** — FR-31-4 recurses the section's BEM *element* children, so `sgs-quote` →
`sgs/container > sgs/text + sgs/text`, NOT `> sgs/quote`. Text survives; typed attrs + `<cite>`
semantics do not. On a childless-stub emitter the same dissolution **RECOVERS** dropped content:
`sgs/tabs` went from a self-closing stub with ZERO children (all tab content silently lost) to a
container carrying its buttons + info-box.
**BEAN'S RULING (2026-08-04) — dissolve is CORRECT, and this is the justification to keep:** a
class-section in a draft is *literally a container/wrapper around a group of blocks*, so the
container default is a **1:1 structural match** with what the draft actually is. The few
class-section blocks have a container layer built into them. A standalone non-class-section block
as a whole section is improbable — it would at minimum be paired with a heading, which is a group,
which is a container.
**Blast radius: exactly 7 tests, one root cause** (6 golden byte-compares + 1 tab dissolve test).
**Every real-draft golden (`mamas-munches-homepage__*`) passes** — inert on the real corpus.

**R2 — Stage 2 removal** [sonnet, ~90 min] — after R1. Re-source Stage 4's loop from `voter.json`;
re-key 4 bucket routers on `per_section_results`; **amend FR-31-12 in the same commit**. /qc-council.

**R3 — Loop 2 body → loop 3** [sonnet] — **BLOCKED on Spec 35 reclassifying `scalar-media`.**
⛔ Before cutting, measure `sgs/cta-section`'s real interior — loop 3 enforces `accepts_allowed_blocks`
and loop 2 never did, so a non-allowed child becomes a ContentGap (content loss).

```
R4 (haiku, first) · R1 (inline, Opus) → R2 (sonnet) · R3 blocked on Spec 35
```

### Routing guardrails (earned 2026-08-03)
**MOVED to `STOP-CATALOGUE.md` §E4** — 4 rules (static audit is a third of the truth, establish
the denominator, a fix is a hypothesis too, prove a path dead by reaching it — D474).
