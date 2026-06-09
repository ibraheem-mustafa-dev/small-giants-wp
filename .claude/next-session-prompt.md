---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-09
primary_goal: "The 2026-06-09 session diagnosed all 7 wave-2 desktop issues (8 root-cause families), had two councils harden the plan, ratified 3 new FRs (FR-22-5.1/5.2/5.3), wrote STAGE1-DESIGN v2 (awaiting Bean's design-gate approval), and wrote the Stage-0 prerequisite prompts. Next: Bean design-gate decision → Stage 0 (canonical_slot backfill + Gate A/B) → parity2 containment fallback (so the gauge is honest) → Stage 1 converter (design-gated, own branch)."
---

# Next session — design-gate decision → Stage 0 prereqs → parity2 fix → Stage 1 converter

> Invoke `/autopilot` first. Read this prompt + `.claude/handoff.md` IN FULL before acting. Read the "How cloning fidelity works — DO NOT REDESIGN THIS" box at the top of `cloning-pipeline-flow.md` BEFORE touching the converter. **Then read `.claude/reports/wave2/STAGE1-DESIGN.md`** — it is the council-hardened build plan awaiting Bean's design-gate (Rule 7). Also read `.claude/reports/2026-06-07-converter-root-cause-and-primary-source-methodology.md` for why primary-source reading (scripts + DB + emit) beats parity2/pixel-diff as diagnosis tools.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every action — violation conditions shown)

1. **CONVERT, don't mirror** — output = native SGS blocks driven by their attributes; NOT a div-by-div copy of the draft's classes/DOM. *(Violation: any emitted block whose `className` carries a draft BEM element class like `sgs-x__y`.)*
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no shallow-test workaround. The trust-bar bound cheat is PURGED (D182). ONLY the live WC configurator `sourceMode='wc-product'/'sgs-cpt'` is legitimate. *(Violation: any new `sourceMode='bound'` emit.)*
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception without universal justification to change the condition itself.
4. **NO SKIPPING** — every draft class's content + CSS transfers to the clone, OR is reported as skipped-with-reason, per class. **parity2 (Stage 11.5) produces this — but its node-matcher has a known reliability gap (Task 1 fixes it); diff the EMIT vs the DRAFT directly when in doubt.**
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright live DOM + computed-style on page 8 vs the draft's real values. *(Violation: closing on assertion output, a test page, or the emit alone.)*
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS** — inline beats `@media` and kills responsiveness.
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English — 2026-06-09 session)

This was a **diagnosis and design session** — no converter code changed. The previous session (2026-06-07) fixed value-corruption (wrong CSS values emitted) + wired responsive padding/margin + de-hardcoded the typography map. This session traced all 7 homepage-section desktop issues back to their roots, found 8 root-cause families, and had two multi-persona councils harden the build plan into `STAGE1-DESIGN.md` v2. Three new FRs landed in Spec 22 (D193). The convergence point: the current converter has 4 parallel lift paths that only read each node's OWN CSS; the fix is a single DB-driven dispatch that, per CSS declaration, asks "which attribute owns this property for this (block, slot)?" — including inherited CSS and cross-node routing. Stage 0 (data prereqs + gate harness) must land before Stage 1 converter code. **Nothing changes in the converter until Bean approves the design.**

---

## Task 0 — Bean design-gate decision on STAGE1-DESIGN.md v2 [FIRST, blocking]

**What:** read `.claude/reports/wave2/STAGE1-DESIGN.md` (council-hardened v2 — already written, gate-pending your approval). It covers: the architectural primitive, current state (verified line numbers), all Stage-0 prerequisites (Commit 0a canonical_slot, 0b block_defaults killed, 0c Gate B), Stage-1 commit sequence (1a–4), the FATAL cross-node bug fix, and the verification matrix.
**Gate:** Rule 7 — no converter code until Bean approves. If re-scoping: record the change + rationale, carry the structural defences forward.

## Task 1 — parity2 containment fallback (so we can MEASURE) [inline, do AFTER Task 0]

**What:** in `plugins/sgs-blocks/scripts/parity2/transfer_checker.py`, add a containment fallback to `_build_anchors`/`_fallback_match`: when a draft leaf's normalised `ownText` isn't an exact clone `ownText` match (converter restructured the section — testimonials→slider, brand), match it to the smallest clone node whose `text` CONTAINS the draft ownText, scoped to the same section, BEFORE the structural fallback that picks a wrong node (footer).
**Why:** the gauge is still the blocker — real converter gains are invisible while the matcher mis-pairs nodes. `css_dropped` lists can't be trusted for fix decisions until this lands.
**Verify:** re-score the existing captures (no re-clone): `python plugins/sgs-blocks/scripts/parity2/parity2.py --captures <run>/parity2-captures.json --viewport 1440`. Confirm brand/testimonial-slider stop scoring 0% spuriously.

## Task 2 — Stage 0 prerequisites [after Task 0 design-gate; mostly parallel]

Three Stage-0 items that must land before their corresponding Stage-1 commits:

**Commit 0a — canonical_slot backfill** (blocks Commit 2; fresh-session prompt ready at `.claude/reports/wave2/CANONICAL-SLOT-BACKFILL-PROMPT.md`). ~41 rows: `contentWidth` (28 blocks) + `sgs/hero.contentPadding*`. Slot-vocabulary decision required first (no `content` slot exists — must decide what `__content`/`__inner` resolve to, mirroring the `__media`→`media`→`mediaPadding*` round-trip). DB-only, both DBs via `seed-canonical-slots.py`; not `/sgs-update`.

**Commit 0b — Gate A conformance harness** (gates the first Stage-1 commit). Block-keyed, cross-client, collision checks. Mirrors `check-dead-controls.js` pattern; wired into prebuild + pre-commit.

**Commit 0c — Gate B `check-hardcoded-render-defaults.js`** (blocks the FIRST F3 fix — build BEFORE any F3, not alongside). Promoted to Stage 0 (qc-council: shipping F3 before the guard re-creates the D178 rot).

## Task 3 — Converter Method-2 Stage 1 [design-gated; own branch; AFTER Tasks 0 + 1]

After Bean approves STAGE1-DESIGN.md v2 and Stage-0 prerequisites land:
**What:** universal DB-driven per-slot CSS dispatch replacing the 4-lift-path + 2-carve-out architecture. STAGE1-DESIGN.md has the full commit sequence (1a–4), the FATAL cross-node bug fix, the verification matrix, and the per-composite sign-off gate.
**Orchestration:** `/subagent-driven-development` on the universal mechanism. `/qc-council` (blub.db 255) + live page-8 verify + parity2 (now trustworthy, per Task 1) pre/post per commit.
**Key:** read `extract.json` (the emit) + trace `lift_gap_candidate` events before asserting any gap. `/wp-blocks dump` for real attr schema.

## Task 4 — DB-usage conformance Tier-1 [parallel with Task 3]

From `.claude/reports/2026-06-07-db-conformance-audit-factcheck.md` §4: **I1** unify `.agents` vs `.claude` DB path to one canonical / documented symlink; **V1** `_sgs_bem_regex()` hardcoded despite "DB-driven" docstring — fix or delete the docstring; **V2** converter's `write_attribute_gap_candidate()` writes to sgs DB — re-ground on FR-22-8.1; **V3** enforce `modal`/`mobile-nav` exclusion in `_is_container_mirror_block()`. NOTE: I2 (assign-canonical.py) was OVERTURNED — the script exists at `behavioural-analyser/`; only a dev-setup.md path typo remains (Tier-3).

## Task 5 — Doc-drift refresh [mechanical, as capacity]

Refresh stale counts from the conformance audit: Spec 21 heat-map (block_attributes 2826, slots 101, block_capabilities 76), dev-setup.md counts + the assign-canonical path typo, Spec 29 roster, pipeline-stages.md DB labels (Stage 0.7/9b/9/+REGISTER). Consider auto-generating Spec 21 heat-map + Spec 29 roster from DB (like Spec 02).

---

## Dependency graph
```
Task 0 (Bean design-gate — blocks everything)
   ↓
Task 1 (parity2 containment fallback)  ║  Task 2 (Stage-0 prereqs: 0a/0b/0c)
   ↓                                        ↓
Task 3 (Stage-1 converter, design-gated, own branch)  ║  Task 4 (conformance Tier-1, parallel)  ║  Task 5 (doc refresh)
   ↓ /qc-council per commit + parity2 (now honest) verify
commit by explicit path + push to main
```

## Methodology guardrails (do not skip)

- **PRIMARY-SOURCE FIRST.** Diagnose the pipeline by reading SCRIPTS (`convert.py`/`db_lookup.py`) + DB tables, then diff the EMITTED output (`extract.json`) against the DRAFT directly. Treat parity2 / pixel-diff / council verdicts as HYPOTHESES — verify against the raw emit before building. See `2026-06-07-converter-root-cause-and-primary-source-methodology.md`.
- **Fidelity verifier: SOURCE is the 100% denominator** (blub.db 2026-06-07). Match by content/nesting/role (class-agnostic), NEVER by class/DOM-path. parity2's model.
- **De-weighting a metric category can hide the real issue** — surface content/layout/css SEPARATELY; weight the load-bearing one into the verdict. Don't blend away the real failure.
- **Subagent registers are HYPOTHESES — fact-check load-bearing claims.** Always check the path/value the CODE actually uses, in the main thread, before acting. (`feedback_read_ground_truth_before_concluding`.)
- **A user invoking a rule ≠ confirmation of your fix (blub.db 329).** "This breaks Rule X" confirms the BREACH — not your interpretation or proposed fix. READ the canonical design doc + state the architectural primitive in plain English BEFORE recording/acting on any fix-shape.
- **DO NOT REDESIGN the cloning converter.** The fix is ALWAYS completing the DB-driven attribute-transfer onto `sgs/container`. Read the guardrail box in cloning-pipeline-flow.md first.
- **Heavy subagents tightly scoped.** They die at ~100+ tools and leave wrong half-baked changes. Scope each to specific files + exact fixes; revert context-tail failures to a clean base (STOP #19).
- **Live verification must SELECT blocks**, not just insert — editor inspector bugs only surface on selection; editor `isValid` ≠ frontend-correct.
- **Deploy before measure** — any change visible on page 8 needs `build-deploy.py --blocks-only` + OPcache reset BEFORE any Playwright/parity2 run.
- **Root cause before instance fix** — ask "what's the CLASS of failure?" before tuning one instance.
- **Outcome vs completion** — don't mark a task done unless the OUTCOME landed (live-verified / verified from the emit), not just code shipped.
- **/qc-council BEFORE every commit** touching converter / pipeline / SGS-block logic (blub.db 255).
- **`--converter-v2` required** on production orchestrator runs; **WP_DEBUG_DISPLAY false** on staging. **`--mode draft` now auto-skips the autonomy gate.**
- **Commit by explicit path** (`git commit -- <paths>`) — theme thread shares `main`.
- **No legacy-spec archaeology in truth docs** — point forward to current replacement or remove.

## Skills to Invoke
| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Stage-1 design scoping — ALWAYS for design |
| `/gap-analysis` | grade outputs before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/adversarial-council` or `/qc-council` | Task 0 re-scope + per-converter-commit |
| `/subagent-driven-development` · `/dispatching-parallel-agents` | Task 3/4 dispatch |
| `/sgs-clone` | re-clone page 8 (`--deploy-target page:8 --converter-v2 --mode draft`) |
| `/sgs-update` | after any block schema / DB change |
| `/verify-loop` | 2-attestation (emit + trace) per load-bearing claim |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright MCP | live page-8 + editor DOM verification (375/768/1440, cache-bust `?cb=N`; wp-admin login via `.claude/secrets/sandybrown.env`) |
| `/wp-blocks` + `/sgs-db` | schema before any "missing X" claim |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` (if registered; else `general-purpose` sonnet) | heavy converter/block builds (Task 3/4) |
| `design-reviewer` | visual verify of re-cloned page 8 |

## Deploy / verify quick ref
- Blocks: `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only --skip-build --allow-dirty` (PowerShell) → OPcache reset (write `<?php opcache_reset();` to webroot, curl, rm).
- Re-clone: `python plugins\sgs-blocks\scripts\sgs-clone-orchestrator.py --mockup sites\mamas-munches\mockups\homepage\index.html --client mamas-munches --page homepage --auto-section --converter-v2 --mode draft --deploy-target page:8`
- Re-score parity2 on existing captures (fast, no re-clone): `python plugins/sgs-blocks/scripts/parity2/parity2.py --captures <run>/parity2-captures.json --viewport 1440`.
- Canary homepage: https://sandybrown-nightingale-600381.hostingersite.com/ (page 8). Diff the EMIT directly: `<run>/extract.json` vs mockup CSS.
