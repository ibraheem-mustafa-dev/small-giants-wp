---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-07
primary_goal: "This session shipped Task 2 (icon resolver), the Stage 9 deploy-blocker fix, the universal gap consolidation, the pre-existing heading #130 fix, and corrected the Task 3 scope — all council-gated + pushed. Next: (1) /sgs-update DB sync; (2) the converter Method-2 universal CSS-transfer (the real cloning-fidelity lever, corrected scope below); (3) the 11-block icon-migration to the shared picker; (4) gap-consolidation council follow-ups."
---

# Next session — /sgs-update, then converter Method-2 + icon-migration

> Invoke `/autopilot` first. Read this prompt + `.claude/handoff.md` IN FULL before acting.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every action — violation conditions shown)

1. **CONVERT, don't mirror** — output = native SGS blocks driven by their attributes; NOT a div-by-div copy of the draft's classes/DOM. *(Violation: any emitted block whose `className` carries a draft BEM element class like `sgs-x__y`.)*
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no shallow-test workaround. The trust-bar bound cheat is PURGED (D182). ONLY the live WC configurator `sourceMode='wc-product'/'sgs-cpt'` is legitimate. *(Violation: any new `sourceMode='bound'` emit.)*
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception without universal justification to change the condition itself.
4. **NO SKIPPING** — every draft class's content + CSS transfers to the clone, OR is reported as skipped-with-reason, per class. **parity2 (Stage 11.5) produces exactly this report — use it.**
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright live DOM + computed-style on page 8 vs the draft's real values. *(Violation: closing on assertion output, a test page, or the emit alone.)*
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS** — inline beats `@media` and kills responsiveness.
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English)
The cloning pipeline now: clones trust-bar badges to their CORRECT icons (icon resolver, Task 2 done); auto-reports per-section fidelity (parity2 Stage 11.5); and no longer rolls back every deploy (Stage 9 schema fix). The gap system is now UNIVERSAL — every composite/wrapper block uses ONE shared `sgs/container` gap control (raw-px), rendered through `sgs_container_gap_value()`; a pre-existing editor crash (numeric heading level → React #130) that broke info-box/hero/feature-grid is fixed. **The big remaining cloning-fidelity work is the converter Method-2 universal CSS-transfer** (Task 2 below): five homepage sections still route to a generic `sgs/container` whose draft CSS hasn't fully transferred onto its editable attributes. `sgs/container` is the CORRECT target — the work is completing the attribute-transfer, NOT forcing bespoke composites.

---

## Task 1 — Run /sgs-update (DB sync) [inline, ~10 min]
**What:** sync `sgs-framework.db` + regenerate `specs/02-SGS-BLOCKS-REFERENCE.md` to the gap block.json changes (`gapUnit` removed from feature-grid/multi-button; `blockGap` support removed from container; new `deprecated.js` on post-grid). Deferred at the tail of 2026-06-07.
**Orchestration:** Execution: inline. /qc gate after: none (mechanical rescan); spot-check the DB has no orphan `gapUnit` attr rows. Depends on: none.
**Acceptance:** `/sgs-update` completes clean; `block_attributes` no longer lists `gapUnit` for feature-grid/multi-button; 02-SGS-BLOCKS-REFERENCE regenerated; committed.

## Task 2 — Converter Method-2: complete the UNIVERSAL DB-driven CSS-transfer (Spec 22 §FR-22-21) [design-gate → SDD]
> ✅ **`sgs/container` is the LEGITIMATE, reusable, DB-driven conversion target — do NOT force bespoke composites** (Bean, 2026-06-07; blub.db 329). Block choice is already DB-driven (Stage 1 `blocks.tier` + Stage 2 `confidence-matrix.py`; the Stage-2 fallback to `sgs/container` per Decision 3 is BY DESIGN). The §FR-22-21 "universal wrapper-conversion procedure" that transfers a section's CSS onto the container's *editable attributes* IS the sanctioned conversion — NOT mirroring, NOT per-section, NOT hardcoded-to-match.

**What:** complete the universal CSS-transfer so every slug-None section routed to `sgs/container` reproduces its draft via the container's editable attributes (widthMode/customWidth/contentWidth/gap/gridTemplateColumns+responsive/gridItem*/background/padding) — DB-driven, ALL qualifying sections at once.
**Why:** the big remaining VISIBLE fidelity lever (parity2 shows brand layout ~48%). Makes most of the page genuinely converted.
**The real gaps (WS-2/WS-3, NOT a routing change):** D1 typed-attr sidecar written-but-not-consumed (`seed_d1_sidecar`, B1) → layout CSS strands in variation CSS; `gridItem*` never written (A6); `widthMode:"full"` band-aid at `db_lookup.py:2461` (C1). See `cloning-pipeline-flow.md` §cross-cutting + `plans/2026-06-04-method2-converter-lift-*.md`.
**Orchestration:**
- Execution: **design FIRST** — `/brainstorming` (design mode) to scope the WS-2/WS-3 gaps → `/adversarial-council` or `/qc-council` + Bean approval BEFORE code (Rule 7 — converter, high blast radius).
- Pattern: after the gate, `/subagent-driven-development` on the UNIVERSAL mechanism — not section-by-section.
- Context: parity2's per-class `layout_dropped`/`css_dropped` measures the gap; `/wp-blocks dump` for the container's real attr schema before any "missing X" claim. Memory `universal-lift-was-premature-not-falsified` (lands on attrs that exist post-WS-4).
- Depends on: Task 1 (clean DB). Parallel with: Task 3.
- /qc gate after: `/qc-council` (blub.db 255) + live page-8 verify + parity2 pre/post across ALL sections.
**Acceptance:** every qualifying slug-None section reproduces its draft via editable container attrs (live-DOM verified, no draft BEM element classes carrying CSS); parity2 layout%/css% rise across all; no regression.

## Task 3 — 11-block icon-migration to the shared rich picker [delegated, batched]
**What:** migrate the 10 MIGRATE blocks + mobile-nav-toggle (Bean: the burger needs custom options, not one symbol) from TextControl/SelectControl icon pickers to the shared searchable `IconPicker`. Full plan + per-block contract: `.claude/scratch/2026-06-07-icon-picker-migration-plan.md`. social-icons stays a platform list (brand SVGs).
**Why:** Bean wants a WhatsApp-style icon+emoji picker everywhere an icon is chosen, not preset dropdowns.
**Orchestration:**
- Execution: delegated, Sonnet via /delegate. Pattern: `/dispatching-parallel-agents` in batches of 2-3 (simple-single-icon → repeater → emoji-passthrough; mobile-nav-toggle adds open/close icons). Most are editor-only (render contract unchanged) → lighter.
- Context: reference impl `src/blocks/icon/edit.js`; shared `IconPicker` stores `{source,name}`; render resolves via `sgs_get_lucide_icon`/emoji branch. mobile-nav-toggle needs NEW `toggleOpenIcon`/`toggleCloseIcon` attrs + render.
- Depends on: none. Parallel with: Task 2.
- /qc gate after: `/qc-inline` + editor live-verify (insert each, 0 console errors) per batch.
**Acceptance:** each migrated block opens the rich searchable picker; selection renders correctly; 0 console errors; editor-verified.

## Task 4 — Gap-consolidation council follow-ups (P-GAP-CONSOLIDATION-FOLLOWUPS) [as capacity allows]
**What:** the non-blocking residuals the gap `/adversarial-council` flagged — layout/columns attr collision in the shared LayoutPanel (kind="layout" blocks); responsive gap half-wired on card-grid/gallery (missing gapTablet/gapMobile attrs); container blockGap value migration; add the 4 deprecating slugs to `tests/php/BlockDeprecationsTest.php` + a `sgs_container_gap_value()` sanitiser unit test; document/whitelist calc()/clamp() in the helper.
**Orchestration:** inline or delegated per item; /qc-inline after. Depends on: none.
**Acceptance:** parking entry items closed or re-scoped with reasons.

---

## Dependency graph
```
Task 1 (/sgs-update, inline)
   ↓
Task 2 (design-gate → SDD; converter Method-2)  ║  Task 3 (delegated icon-migration, parallel)
   ↓ /qc-council per converter commit               ↓ /qc-inline per batch
Task 4 (follow-ups, as capacity)
   ↓ commit by explicit path + push to main
```

## Methodology guardrails (do not skip)
- **A user invoking a rule ≠ confirmation of your fix (blub.db 329, NEW 2026-06-07).** "This breaks Rule X" confirms the BREACH — not your interpretation of the rule or your proposed fix. READ the canonical design doc (cloning-pipeline-flow/stages + Spec 22) + state the architectural primitive in plain English BEFORE recording/acting on any fix-shape. Never write un-grounded architectural conclusions into next-session-prompt/memory/decisions.
- **Heavy subagents tightly scoped (NEW 2026-06-07).** A fix subagent died at 118 tools ("prompt too long") + left wrong half-baked changes. Scope each subagent to specific files + exact fixes; revert half-failed context-tail work to a clean base (STOP #19), don't salvage.
- **Live verification catches what build/isValid can't (NEW 2026-06-07).** The editor live-check caught a `UNIFY_OPTIONS` dangling-const (build passed) AND the pre-existing heading #130; the council + frontend DOM caught back-compat gap breakage. Always editor + frontend live-verify shared-block changes, not just build + isValid.
- **Deploy before measure** — any change visible on page 8 needs `build-deploy.py --blocks-only` + OPcache reset BEFORE any Playwright/parity2 run, or you measure stale output.
- **Root cause before instance fix** — for a failing section ask "what's the CLASS of failure?" (converter/block-CSS/mockup-convention) before tuning one instance.
- **Outcome vs completion** — don't mark a task done unless the OUTCOME landed (live-verified), not just code shipped.
- **/qc-council BEFORE every commit** touching converter / pipeline / SGS-block logic (blub.db 255).
- **--converter-v2 required** on production orchestrator runs; **WP_DEBUG_DISPLAY false** on staging.
- **Verify on the REAL homepage (page 8)** with live DOM, never an assertion or test page (Rule 5).
- **Commit by explicit path** (`git commit -- <paths>`) — theme thread shares `main`. The visual-diff gate requires a passing `reports/visual-diff/<block>-<date>.md` per render-changed block (verdict: PASS + first_paint_capture_passed: true).

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | architectural/design decisions (Method-2 transfer shape) — ALWAYS for design |
| `/gap-analysis` | grade outputs before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` | auto-routes research tier |
| `/strategic-plan` | order the Method-2 work before coding |
| `/sgs-update` | Task 1 DB sync + after any block schema change |
| `/sgs-clone` | re-clone page 8 (`--deploy-target page:8 --converter-v2`) |
| `/adversarial-council` or `/qc-council` | Task 2 design-gate + per-converter-commit |
| `/dispatching-parallel-agents` · `/subagent-driven-development` | Task 2/3 dispatch |
| `/sgs-wp-engine` | SGS block/converter work |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright MCP | live page-8 + editor DOM verification (375/768/1440, cache-bust `?cb=N`; wp-admin login via `.claude/secrets/sandybrown.env`) |
| `/wp-blocks` + `/sgs-db` | schema before any "missing X" claim |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | heavy converter/block builds (Task 2/3) — if registered; else `general-purpose` (sonnet) |
| `design-reviewer` | visual verify of re-cloned page 8 |

## Deploy / verify quick ref
- Blocks: `python plugins/sgs-blocks/scripts/build-deploy.py --blocks-only --allow-dirty` (PowerShell; defaults to sandybrown canary) → OPcache reset (write `<?php opcache_reset();` to webroot, curl, rm).
- Re-clone: `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --client mamas-munches --page homepage --auto-section --converter-v2 --mode draft --deploy-target page:8` (PowerShell — Bash node wrapper broken).
- Editor verify: log in at `wp-login.php` (creds `.claude/secrets/sandybrown.env`), `post-new.php?post_type=page`, insert blocks via `wp.data.dispatch('core/block-editor').insertBlocks(...)`, check `getBlocks().isValid` + console errors.
- Canary homepage: https://sandybrown-nightingale-600381.hostingersite.com/ (page 8). Configurator: page 589.
