---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-22-wave-2-wiring-fix
generated: 2026-05-21
prior_session: small-giants-wp-2026-05-21-qc-trio-plus-wave-1-g2-shipped
primary_goal: "Land Wave 2 as ONE wiring fix — cv2 walker queries block_compositions + property_suffixes for visual slots + parent-child class graph drives nested-block emission. Plus the FR1 one-line consistency add. Acceptance: hero stage_3_slot_list failures drop 142 → <30, hero variation_css_rules rises 0 → ≥8, brand pixel-diff at 1440 drops 43.7% → <20%."
---

# Next session — Wave 2 wiring fix (G1+G3+G5 dissolve as one change)

Invoke `/autopilot` before doing anything else.

You are picking up where session 2026-05-21 left off. Wave 1 G2 Step 1+2 shipped (commit `affca3f1` on main) — enabling infrastructure. 5 sections doubled `variation_css_rules` but pixel-diff hasn't moved. The 2026-05-21 reality check found that G1 + G3 + G5 are all symptoms of one wiring gap: cv2 doesn't query `block_compositions` at all (it's write-only) and doesn't query `property_suffixes` for visual / structural slots. Wave 2 fixes the wiring; the three symptoms dissolve together.

## State recap (plain English, no assumed pretext)

The cloning pipeline takes a mockup HTML file and emits WordPress block markup. cv2 is the converter that walks the mockup DOM and decides which SGS block to emit per section. The SGS-framework SQLite database has tables that map CSS properties to block attributes (`property_suffixes`, 117 rows), canonical slots to block elements (`slot_synonyms`, 89 rows), and parent-child block relations (`block_compositions`, 37 rows). cv2 uses some of these tables but not all of them, and uses them inconsistently. The visible failures — hero CTAs not rendering, brand `<blockquote>` becoming `<section>`, testimonial-slider showing carousel instead of grid — are all consequences of cv2 not consulting the existing data when deciding how to emit nested blocks.

Wave 1 (the work just shipped) made the SCOPED CSS from `theme/sgs-theme/styles/<client>.css` visible to cv2. Wave 2 makes cv2 USE that CSS plus the block-composition data plus the property-suffix mapping to emit correctly-shaped nested block markup.

## Read first (mandatory before dispatching any subagent)

1. `.claude/handoff.md` — last session digest
2. `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §15 — the Wave 2 reshape (G1+G3+G5 as one wiring gap)
3. `.claude/parking.md` 2026-05-21 entries — `P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP`, `P-BLOCK-COMPOSITIONS-READ-PATH`, `P-FR1-VARIATION-BUF-CONSISTENCY`
4. `.claude/decisions.md` D21-D26 — session decisions
5. `.claude/cloning-pipeline-flow.md` 2026-05-21 section — pipeline state + doc-accuracy notes
6. `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` lines 3670-3690 — FR1 fast path + walker entry

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Designing the wiring fix shape before coding |
| `/gap-analysis` | Before shipping the wiring fix |
| `/lifecycle` | Any skill / agent / pipeline change |
| `/research` | Auto-routes to the right research tier (unlikely needed this session) |
| `/strategic-plan` | If the wiring fix splits into multiple phases |
| `/qc-council` | **BEFORE any subagent dispatch on multi-fix proposals** — empirical pre/post measurement gate (created 2026-05-21, binding rule blub.db 276) |
| `/qc-inline` | Single-block / single-section quick verification during the wiring fix |
| `/qc` | Multi-route durable QC after the wiring fix lands |
| `/sgs-wp-engine` | SGS block dev context |
| `/wp-blocks` | DB schema query (already confirmed 2026-05-21 — data is there) |
| `/wp-block-development` | Block.json schema work if any new attrs land |
| `/library-docs` | WP InnerBlocks / Block API reference |
| `/delegate` | Pick model per dispatched subagent |
| `/dispatching-parallel-agents` | Wave 2 fix likely has parallelisable sub-steps |
| `/capture-lesson` | If the wiring work surfaces a recurring failure mode |
| `/handoff` | At session close |

## Tools

| Tool | What to use it for |
|------|-------------------|
| `mcp__plugin_playwright_playwright__browser_*` | Eyes-on visual verification after wiring fix |
| `scripts/pixel-diff.py --selector .sgs-{section}` | Per-section cropped pixel-diff (binding rule blub.db 256) |
| `python ~/.claude/hooks/wp-blocks.py dump` | Schema enumeration (binding rule blub.db 272) |
| `pipeline-state/<run>/leftover-buckets.json` | Read BEFORE pixel-diff conjecture (binding rule blub.db 254) |
| `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --converter-v2 ...` | Production pipeline run (`--converter-v2` flag REQUIRED) |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Heavy WP block dev / cv2 walker work — delegate the wiring implementation |
| `/qc-council` (as protocol) | Validate any multi-fix proposal set before implementer dispatch |

---

## Task 1 — Design the wiring fix shape (inline, Opus)

**What:** Decide the exact shape of the cv2 walker wiring fix that makes block_compositions readable, queries property_suffixes for visual slots, and uses parent-child class relations to drive nested block emission.

**Why:** Spec 16 §15 names the wiring gap but not the exact code points to change. Without a design pass, the implementer subagent will guess.

**Estimated time:** 30 min

**Orchestration:**
- Execution: inline (main thread) — design work, not implementation
- Model: opus (main)
- Brief: invoke `/brainstorming` in design mode with Spec 16 §15 as the starting spec. Output a concrete list of file:line change points + their wiring behaviour. End with a Stage 5 baseline measurement plan per `/qc-council`.
- Depends on: none
- Parallel with: none
- /qc gate after: no — design output goes to Task 2's brief

**Acceptance:** A design doc at `.claude/plans/phase-wave-2-wiring-fix.md` with: (a) named file:line change points; (b) per-change wiring behaviour; (c) baseline measurement plan; (d) predicted post-fix values for hero `stage_3_slot_list` failures + hero `variation_css_rules` + brand 1440 pixel-diff.

---

## Task 2 — Validate the design via /qc-council (inline, Opus)

**What:** Route Task 1's design through `/qc-council` Stage 5 empirical-validation gate before any implementer dispatches.

**Why:** Binding rule blub.db 276. Council fix-shape proposals are hypotheses until measured. 2026-05-21 Wave 1 had 2/2 council fixes produce no-ops despite implementing the prescription exactly — qc-council is the gate that catches this.

**Estimated time:** 20 min

**Orchestration:**
- Execution: inline (main thread)
- Model: opus
- Brief: invoke `/qc-council` with Task 1's design as the proposal set. Stage 1 ground-truth load reads `pipeline-state/<latest>/leftover-buckets.json` + `extract.json` + `trace.jsonl`. Stage 5 runs the predicted baseline check WITHOUT the fix applied. If baseline already matches predicted post-fix → diagnosis wrong → return to Task 1 with disproof. If predicted delta is real → proceed to Task 3.
- Depends on: Task 1
- Parallel with: none
- /qc gate: this IS the gate

**Acceptance:** /qc-council Stage 8 report shows `validated-shipped` verdict (proposal validated empirically, baseline confirmed) OR `falsified` (returned to Task 1 with disproof).

---

## Task 3 — Implement the wiring fix (delegated, Sonnet subagent)

**What:** Apply the validated wiring changes to `convert.py` (FR1 variation_buf consistency + block_compositions read path + property_suffixes for visual slots) and `slot_list.py` (visual slot resolver).

**Why:** Task 2's validation confirms the design will move the metric; this is the implementation.

**Estimated time:** 60 min

**Orchestration:**
- Execution: delegated
- Model: sonnet via `/delegate`
- Dispatch pattern: single-agent (the changes are inter-dependent; not parallelisable)
- Brief: implement the Task 1 design exactly. Include the experiment-shape frame (baseline / fix / predicted / validation / commit gate) in the cold prompt. Implementer runs baseline measurement BEFORE writing code, applies the fix, runs post-fix measurement, commits ONLY if metric moves ≥ predicted delta. Safety clauses: no `git stash`, no `git reset --hard`, no `--no-verify`, no `Co-Authored-By`.
- Depends on: Task 2
- Parallel with: none
- /qc gate after: /qc-inline on the implementer's commit + pixel-diff measurement on the 3 named sections

**Acceptance:** Hero `stage_3_slot_list` failures drop 142 → <30, hero `variation_css_rules` rises 0 → ≥8, brand pixel-diff at 1440 drops 43.7% → <20%, AND every CSS declaration in the mockup either matches a theme.json token (correct elision) OR lands as a block attribute / inline style on emitted markup (coverage approaches 100%).

---

## Task 4 — F5 D1 media-field flow (deferred — only if Tasks 1-3 ship with time remaining)

**What:** D1 sidecar preserves `media` field but cv2's reader at `convert.py:_load_d1_assignments` doesn't route values to `*Mobile` / `*Tablet` / `*Desktop` block.json variant attrs.

**Why:** Hero 375 mobile +13.3pt regression vs post-C baseline traces to this. Distinct from Wave 2 wiring; runs after.

**Estimated time:** 60 min

**Orchestration:**
- Execution: delegated
- Model: sonnet via `/delegate`
- Brief: map media-condition strings to breakpoint slugs (mobile = 375 / tablet = 768 / desktop = 1440 per SGS convention). When D1 entry has `media: "@media (max-width: 767px)"`, route value to `<attr>Mobile` variant. Block.json schema check: if variant attr doesn't exist on this block, fallback to gap-candidate.
- Depends on: Task 3
- Parallel with: none

**Acceptance:** Hero 375 mobile drops back below post-C baseline (73.2%); social-proof 768 drops back below 74.6%.

---

## Dependency graph

```
Task 1 (inline, Opus — design)
  ↓
Task 2 (inline, Opus — /qc-council Stage 5 empirical validation)
  ↓ Stage 5 gate
Task 3 (delegated, Sonnet — implement + validate post-fix)
  ↓ /qc-inline + pixel-diff per section
Commit + merge-to-main (Gate 2)
  ↓ if time remaining
Task 4 (delegated, Sonnet — F5 D1 media-field flow)
```

## Methodology guardrails (do not skip)

- **`/qc-council` BEFORE any subagent dispatch on multi-fix proposals** — binding rule blub.db 276. Wave 1 had 2/2 council fixes produce no-ops despite being implemented exactly. The empirical pre/post gate catches it.
- **Multi-model `/qc` panel BEFORE every commit** touching converter / pipeline / SGS block logic — binding rule blub.db 255.
- **Per-section cropped pixel-diff** via `scripts/pixel-diff.py --selector .sgs-{section}`, NOT full-page — binding rule blub.db 256.
- **Read `pipeline-state/<run>/leftover-buckets.json` BEFORE conjecturing** about converter quality or pixel-diff causes — binding rule blub.db 254.
- **Schema enumeration BEFORE "missing X" claims** — `python ~/.claude/hooks/wp-blocks.py dump` — binding rule blub.db 272.
- **`--converter-v2` flag REQUIRED** on production orchestrator runs.
- **WP_DEBUG_DISPLAY must stay false** on staging — debug notices contaminate pixel-diff.
- **No git stash / reset --hard / restore / checkout-- / clean -f** in subagents.
- **No `Co-Authored-By:`** in commits.
- **Always merge to main** (squash + delete branch + checkout main + pull) at session close.
- **Verify-rendered-output**: after each commit, eyes-on Playwright screenshot of the live page before claiming a fix landed.
- **OUTCOME vs COMPLETION** — code shipped is not the same as outcome achieved. If the pixel-diff metric doesn't move, do NOT redefine "done"; re-plan or escalate.

## Acceptance criteria (whole session)

- Wave 2 wiring fix shipped + pushed to main
- Hero `stage_3_slot_list` failures dropped 142 → <30
- Hero `variation_css_rules` rose 0 → ≥8
- Brand pixel-diff at 1440 dropped 43.7% → <20%
- Coverage check: every mockup CSS declaration either matches a theme.json token OR lands as a block attribute / inline style on emitted markup
- `/qc-council` validation gate run BEFORE the implementer dispatch
- /handoff at close
