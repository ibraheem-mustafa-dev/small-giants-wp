---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-07
primary_goal: "This session shipped + pushed: the icon resolver, the Stage 9 deploy-blocker fix, the universal gap consolidation, the 11-block icon-migration to the shared picker, the pre-existing heading #130 fix, /sgs-update, Spec 29, and a full legacy-doc purge. Next: the converter Method-2 universal CSS-transfer (the real cloning-fidelity lever — corrected scope below) + the gap-consolidation council follow-ups."
---

# Next session — converter Method-2 (the cloning-fidelity lever) + gap follow-ups

> Invoke `/autopilot` first. Read this prompt + `.claude/handoff.md` IN FULL before acting. Read the "How cloning fidelity works — DO NOT REDESIGN THIS" box at the top of `cloning-pipeline-flow.md` BEFORE touching the converter.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every action — violation conditions shown)

1. **CONVERT, don't mirror** — output = native SGS blocks driven by their attributes; NOT a div-by-div copy of the draft's classes/DOM. *(Violation: any emitted block whose `className` carries a draft BEM element class like `sgs-x__y`.)*
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no shallow-test workaround. The trust-bar bound cheat is PURGED (D182). ONLY the live WC configurator `sourceMode='wc-product'/'sgs-cpt'` is legitimate. *(Violation: any new `sourceMode='bound'` emit.)*
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception without universal justification to change the condition itself.
4. **NO SKIPPING** — every draft class's content + CSS transfers to the clone, OR is reported as skipped-with-reason, per class. **parity2 (Stage 11.5) produces exactly this report — use it.**
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright live DOM + computed-style on page 8 vs the draft's real values. *(Violation: closing on assertion output, a test page, or the emit alone.)*
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS** — inline beats `@media` and kills responsiveness.
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English)
Cloning now: clones trust-bar badges to correct icons; auto-reports per-section fidelity (parity2 Stage 11.5); promotes deploys (Stage 9 fixed). The block layer is clean: ONE shared `sgs/container` gap control across all composite/wrapper blocks; every icon-choosing block uses the shared searchable IconPicker; the pre-existing heading #130 crash is fixed; the DB is synced; Spec 29 documents the container-equivalent model; all truth docs are purged of legacy-spec archaeology. **The remaining cloning-fidelity work is the converter Method-2 universal CSS-transfer:** the converter routes slug-None sections to `sgs/container` (correct, by design) but the draft CSS isn't yet fully transferred onto the container's editable attributes. `sgs/container` is the RIGHT target — the work is completing the attribute-transfer, NOT forcing bespoke composites / hardcoding / mirroring.

---

## Task 1 — Converter Method-2: complete the UNIVERSAL DB-driven CSS-transfer (Spec 22 §FR-22-21) [design-gate → SDD]
> ✅ **`sgs/container` is the LEGITIMATE, DB-driven target** (Bean, blub.db 329). Stage 1 `blocks.tier` + Stage 2 `confidence-matrix.py` choose the block; the Stage-2 fallback to `sgs/container` is BY DESIGN. The §FR-22-21 procedure transfers a section's CSS onto the container's EDITABLE attributes — that IS the conversion. NOT a new composite per section, NOT hardcoding, NOT mirroring the draft DOM, NOT a "complete mirror" bypassing the converter/DB. (See the DO-NOT-REDESIGN box in cloning-pipeline-flow.md.)

**What:** complete the universal CSS-transfer so every slug-None section routed to `sgs/container` reproduces its draft via editable attributes (widthMode/customWidth/contentWidth/gap/gridTemplateColumns+responsive/gridItem*/background/padding) — DB-driven, ALL qualifying sections at once.
**Why:** the big remaining VISIBLE fidelity lever (parity2 shows brand layout ~48%).
**The real gaps (WS-2/WS-3):** D1 typed-attr sidecar written-but-not-consumed (`seed_d1_sidecar`, B1) → layout CSS strands in variation CSS; `gridItem*` never written (A6); `widthMode:"full"` band-aid at `db_lookup.py:2461` (C1). See `plans/2026-06-04-method2-converter-lift-*.md`.
**Orchestration:**
- **design FIRST** — `/brainstorming` to scope the WS-2/WS-3 gaps → `/adversarial-council` or `/qc-council` + Bean approval BEFORE code (Rule 7 — converter, high blast radius).
- Pattern: after the gate, `/subagent-driven-development` on the UNIVERSAL mechanism — not section-by-section.
- Context: parity2's per-class `layout_dropped`/`css_dropped` measures the gap; `/wp-blocks dump` for the container's real attr schema before any "missing X" claim.
- /qc gate after: `/qc-council` (blub.db 255) + live page-8 verify + parity2 pre/post across ALL sections.
**Acceptance:** every qualifying slug-None section reproduces its draft via editable container attrs (live-DOM verified, no draft BEM element classes carrying CSS); parity2 layout%/css% rise across all; no regression.

## Task 2 — Gap-consolidation council follow-ups (P-GAP-CONSOLIDATION-FOLLOWUPS) [as capacity]
**What:** layout/columns attr collision in the shared LayoutPanel (kind="layout" blocks); responsive gap half-wired on card-grid/gallery (missing gapTablet/gapMobile attrs); container blockGap value migration; add the deprecating slugs to `tests/php/BlockDeprecationsTest.php` + a `sgs_container_gap_value()` sanitiser unit test; document/whitelist calc()/clamp() in the helper.
**Orchestration:** inline or delegated per item; /qc-inline after. Depends on: none. Parallel with: Task 1.
**Acceptance:** parking items closed or re-scoped with reasons.

## Task 3 — Re-clone page 8 + parity2 verify [after Task 1 lands] [inline]
**What:** `/sgs-clone` page 8 with `--converter-v2` to confirm the Method-2 transfer + the already-shipped icon resolver land together; read parity2 Stage 11.5 pre/post per section.
**Orchestration:** inline; live-DOM verify (Rule 5). Depends on: Task 1.
**Acceptance:** parity2 layout%/css% measurably up on the slug-None sections; trust-bar icons correct; no regression.

---

## Dependency graph
```
Task 1 (design-gate → SDD; converter Method-2)  ║  Task 2 (gap follow-ups, parallel)
   ↓ /qc-council per converter commit
Task 3 (re-clone page 8 + parity2 verify)
   ↓ commit by explicit path + push to main
```

## Methodology guardrails (do not skip)
- **A user invoking a rule ≠ confirmation of your fix (blub.db 329).** "This breaks Rule X" confirms the BREACH — not your interpretation or your proposed fix. READ the canonical design doc (cloning-pipeline-flow/stages + Spec 22) + state the architectural primitive in plain English BEFORE recording/acting on any fix-shape. Never write un-grounded architectural conclusions into next-session-prompt/memory/decisions.
- **DO NOT REDESIGN the cloning converter.** Fresh sessions keep trying to force bespoke composites / hardcode / "complete mirror" the draft. The fix is ALWAYS completing the DB-driven attribute-transfer onto `sgs/container`. Read the guardrail box in cloning-pipeline-flow.md first.
- **Heavy subagents tightly scoped.** They die at ~100+ tools ("prompt too long") + leave wrong half-baked changes. Scope each to specific files + exact fixes; revert context-tail failures to a clean base (STOP #19).
- **Live verification must SELECT blocks**, not just insert — editor inspector bugs (e.g. the IconPicker null-crash) only surface on selection. And editor `isValid` ≠ frontend-correct — frontend-verify render changes too.
- **Deploy before measure** — any change visible on page 8 needs `build-deploy.py --blocks-only` + OPcache reset BEFORE any Playwright/parity2 run.
- **Root cause before instance fix** — ask "what's the CLASS of failure?" before tuning one instance.
- **Outcome vs completion** — don't mark a task done unless the OUTCOME landed (live-verified), not just code shipped.
- **/qc-council BEFORE every commit** touching converter / pipeline / SGS-block logic (blub.db 255).
- **--converter-v2 required** on production orchestrator runs; **WP_DEBUG_DISPLAY false** on staging.
- **Commit by explicit path** (`git commit -- <paths>`) — theme thread shares `main`. The visual-diff gate needs a passing `reports/visual-diff/<block>-<date>.md` per changed block — OR `git commit --no-verify` for editor-only/non-visual changes (Bean-approved 2026-06-07; cite the reason).
- **No legacy-spec archaeology in truth docs** (Bean 2026-06-07) — point forward to the current replacement or remove; never make a session check a dead doc.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | Method-2 design scoping — ALWAYS for design |
| `/gap-analysis` | grade outputs before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` | auto-routes research tier |
| `/strategic-plan` | order the Method-2 work before coding |
| `/sgs-clone` | re-clone page 8 (`--deploy-target page:8 --converter-v2`) |
| `/adversarial-council` or `/qc-council` | Task 1 design-gate + per-converter-commit |
| `/subagent-driven-development` · `/dispatching-parallel-agents` | Task 1/2 dispatch |
| `/sgs-update` | after any block schema change |
| `/sgs-wp-engine` | SGS converter/block work |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright MCP | live page-8 + editor DOM verification (375/768/1440, cache-bust `?cb=N`; wp-admin login via `.claude/secrets/sandybrown.env`) |
| `/wp-blocks` + `/sgs-db` | schema before any "missing X" claim |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` (if registered; else `general-purpose` sonnet) | heavy converter/block builds (Task 1/2) |
| `design-reviewer` | visual verify of re-cloned page 8 |

## Deploy / verify quick ref
- Blocks: `python plugins/sgs-blocks/scripts/build-deploy.py --blocks-only --allow-dirty` (PowerShell; sandybrown canary) → OPcache reset (write `<?php opcache_reset();` to webroot, curl, rm).
- Re-clone: `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --client mamas-munches --page homepage --auto-section --converter-v2 --mode draft --deploy-target page:8` (PowerShell).
- Editor verify: log in (`.claude/secrets/sandybrown.env`), `post-new.php?post_type=page`, `wp.data.dispatch('core/block-editor').insertBlocks(...)` THEN `selectBlock` each, check `isValid` + console errors.
- Canary homepage: https://sandybrown-nightingale-600381.hostingersite.com/ (page 8). Configurator: page 589.
