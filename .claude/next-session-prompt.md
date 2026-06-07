---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-07
primary_goal: "parity2 is now wired into /sgs-clone (Stage 11.5, DONE 2026-06-07, commit 553334f3 — every clone auto-reports content/layout/css/full per section). Next: build the icon-identity resolver (Task 2) and start the converter Method-2 CSS-lift for the 5 still-mirrored sections (Task 3), using parity2's per-section layout%/css_dropped as the spec + pre/post gate."
---

# Next session — wire parity2 into /sgs-clone, then icon resolver + Method-2 lift

> Invoke `/autopilot` first. Read this prompt + `.claude/handoff.md` IN FULL before acting.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every action — violation conditions shown)

1. **CONVERT, don't mirror** — output = native SGS blocks driven by their attributes; NOT a div-by-div copy of the draft's classes/DOM. *(Violation: any emitted block whose `className` carries a draft BEM element class like `sgs-x__y`.)*
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no shallow-test workaround. The trust-bar bound cheat is PURGED (D182). ONLY the live WC configurator `sourceMode='wc-product'/'sgs-cpt'` is legitimate. *(Violation: any new `sourceMode='bound'` emit.)*
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception without universal justification to change the condition itself.
4. **NO SKIPPING** — every draft class's content + CSS transfers to the clone, OR is reported as skipped-with-reason, per class. **parity2 now produces exactly this report — use it.**
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright live DOM + computed-style on page 8 vs the draft's real values. *(Violation: closing on assertion output, a test page, or the emit alone.)*
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS** — inline beats `@media` and kills responsiveness.
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English)
The bound-mode cheat is purged from the trust-bar — it now clones to a real native `sgs/trust-bar` (4 native badges, verified live on page 8; only the badge icons are placeholders pending the resolver). We also built **parity2**, a fidelity verifier that treats the draft as 100% and reports, per section, how much **content / layout / css** transferred to the clone — class-agnostic, so genuine conversion scores as success (validated: trust-bar content 100% / layout 95%). It currently runs as a standalone tool; it is NOT yet wired into `/sgs-clone`. Five of the nine homepage sections still "container-mirror" (the converter emits a generic `sgs/container` wearing the draft classes) — that's the converter Method-2 CSS-lift, the big remaining fidelity work, and parity2's layout% now measures it.

---

## Task 1 — Wire parity2 into /sgs-clone as the standing fidelity gate ✅ DONE 2026-06-07 (commit 553334f3)
Stage 11.5 in `sgs-clone-orchestrator.py` (after Stage 10 deploy): captures draft+clone via `clone-parity.js --dump-captures` (golden rebuilt fresh from the mockup), runs `parity2.py`, prints the per-section content/layout/css/full table (sorted worst-layout first) + writes `pipeline-state/<run>/parity2-report.json`. Soft-fail, opt out with `--no-parity2`. Verified live (numbers match standalone). **Next session: just confirm it still fires on the run; the real work is Task 2 + Task 3 below.**

<details><summary>(original Task 1 spec — for reference)</summary>

**What:** make every `/sgs-clone` run auto-produce parity2's content%/layout%/css%/full% per section + the per-class carried/not-carried ledger, saved to the run's `pipeline-state/<run>/`.
**Why:** Rule 4 (per-class transfer accounting) becomes automatic; trustworthy fidelity numbers + exact "what didn't carry over" on every clone instead of running it by hand. (Bean's explicit ask.)
**Estimated time:** ~20 min.
**Orchestration:**
- Execution: inline (main thread) — pipeline plumbing the orchestrator must understand.
- Steps: after Stage 10 deploy, capture draft+clone via `clone-parity.js --dump-captures <run>/parity2-captures.json` (reuse the existing flag), run `parity2.py --captures <that> --out <run>/parity2-report`, surface the per-section table + overall content/layout/css to the run summary + `summary.log`. Add a default-on `--parity2` switch.
- Depends on: none. Parallel with: none.
- /qc gate after: `/qc-inline` (confirm the wired run produces the report + numbers match a standalone parity2 run).
**Acceptance:** a fresh `/sgs-clone` run writes `pipeline-state/<run>/parity2-report.json` with content/layout/css/full per section, and the orchestrator prints the table — matching a manual parity2 run on the same captures.
</details>

## Task 2 — Icon-identity resolver (trust-bar placeholder ticks → real icons)
**What:** map a draft badge's SVG/emoji → the trust-bar icon enum across ALL icon + emoji libraries (NOT lucide-only): reverse path→name index + confidence threshold; on no match, emit the raw SVG (never a silent wrong/default icon).
**Why:** the only piece of full trust-bar visual fidelity the bound purge couldn't deliver (Bean-approved interim is placeholder ticks).
**Estimated time:** ~45 min.
**Orchestration:**
- Execution: delegated. Model: sonnet via /delegate. Pattern: single-agent (one coherent module) + main-thread integration into the converter's typed `items[].icon`.
- Brief: build a reverse index from the merged icon libraries + emoji set; fingerprint the draft inline `<svg>` path / emoji glyph; threshold; fallback = raw SVG lift into a new item field + a typed-render branch.
- Context the subagent needs: the typed handler is in `convert.py` `_atomic_attrs_for` (`sgs/trust-bar` branch, sets `icon:''` today); render.php icon-circle path maps `item['icon']` through a `$lucide_map`.
- Depends on: none. Parallel with: Task 1.
- /qc gate after: yes — `/qc-inline` + live-verify on page 8 (icons resolve, no silent default).
**Acceptance:** re-cloned page 8 trust-bar badges show the CORRECT icons (or a raw-SVG fallback), live-verified — not uniform ticks.

## Task 3 — Complete the UNIVERSAL DB-driven CSS-transfer (Spec 22 §FR-22-21) for sgs/container sections (CLARIFIED 2026-06-07, Bean)
> ✅ **`sgs/container` is a LEGITIMATE, reusable conversion target — do NOT force bespoke composites.** Bean clarified 2026-06-07: the block choice is already DB-driven (Stage 1 `blocks.tier` + Stage 2 `confidence-matrix.py`; the Stage-2 fallback to `sgs/container` per Decision 3 is BY DESIGN), and the "Universal wrapper-conversion procedure" that transfers a section's CSS onto the container's *editable block attributes* (Spec 22 §FR-22-21) IS the sanctioned conversion — NOT mirroring. We clone bespoke drafts into reusable blocks via conversion; we do NOT hardcode sections to exactly match.
>
> The ORIGINAL framing's faults were narrower than first thought: (a) **Rule 3 / R-22-9** — "the 5 sections, brand first" must be ONE universal mechanism, not per-section code; (b) **Rule 1** — the transfer must land on EDITABLE block ATTRIBUTES (reusable), never mirrored classes / inline CSS / a hardcoded one-section match. Routing TO `sgs/container` is fine.

**What:** complete the universal CSS-transfer so every slug-None section the DB/confidence engine routes to `sgs/container` faithfully reproduces the draft via the container's editable attributes (widthMode/customWidth/contentWidth/gap/gridTemplateColumns+responsive/gridItem*/background/padding) — DB-driven, applied to ALL qualifying sections at once. Let the data (`/wp-blocks` dump + `blocks.tier`/`block_composition`/`slots` + `confidence-matrix.py`) decide which block fits each section; where it legitimately matches a more-specific block, use that — but never force it.
**Why:** the big remaining VISIBLE fidelity lever (parity2 shows brand layout 48%, etc.). Makes most of the page genuinely converted (editable, reusable), not class-mirrored.
**The real gaps to close (from cloning-pipeline-flow.md §cross-cutting + stages.md Stage 4 — these are WS-2/WS-3, NOT a routing change):**
- D1 typed-attr sidecar written-but-not-consumed (`seed_d1_sidecar` stub, B1/WS-2) → layout CSS strands in variation CSS instead of landing on attrs.
- `gridItem*` defaults never written (A6/WS-1c); raw-px gap (A4 — editor side fixed by the wrapper WIP this session; verify converter side).
- `widthMode:"full"` band-aid at `db_lookup.py:2461` (slug-RESOLVED path, C1/WS-3).
**Rules binding the shape:** Universal (Rule 3) — one mechanism for all qualifying sections; Convert-not-mirror (Rule 1) — editable attributes only; DB-driven decision (no hardcoded section-matching).
**Estimated time:** design-phase first. Build deferred until the design-gate clears.
**Orchestration:**
- Execution: **design FIRST** — `/brainstorming` (design mode) to scope the WS-2/WS-3 transfer gaps, then `/adversarial-council` or `/qc-council` + Bean approval BEFORE any code (Rule 7 — converter, high blast radius).
- Pattern: after the gate, `/subagent-driven-development` on the UNIVERSAL mechanism — not section-by-section.
- Context: parity2's per-class `layout_dropped`/`css_dropped` measures the gap per section; the fix is completing the universal attribute-transfer. `/wp-blocks dump` for the container's real attr schema before any "missing X" claim.
- Depends on: Task 1 (parity2 pre/post). Parallel with: Task 2.
- /qc gate after: `/qc-council` (blub.db 255 — converter change) + live page-8 verify + parity2 pre/post across ALL sections.
**Acceptance:** every qualifying slug-None section reproduces its draft via editable container attributes (live-DOM verified, no draft BEM element classes carrying CSS per Rule 1); parity2 layout%/css% rise across all of them; no regression elsewhere.

## Task 4 — Finish or revert the wrapper WIP (old Tasks 5/6)
**What:** the 7 uncommitted files (gap single-source + contentWidth mobile) get finished + committed OR reverted — not left dangling.
**Why:** a half-built shared-wrapper change in the tree is a trap (it fails the clone's `no_canonical_block_mutation` check).
**Estimated time:** ~20 min to decide + act.
**Orchestration:** inline; Bean decides finish-vs-revert. /qc gate after: `/qc-inline` if finished.
**Acceptance:** tree clean of the wrapper WIP (committed + live-verified, or reverted).

---

## Dependency graph
```
Task 1 (inline, Opus)  ──┬──>  Task 3 (design-gate → SDD; depends on Task 1 for measurement)
                         └──>  Task 2 (delegated sonnet; parallel with Task 1/3)
Task 4 (inline, Bean decides) — independent
   ↓ /qc gate per task
Commit by explicit path + push to main (Gate 2)
```

## Methodology guardrails (do not skip)
- **Deploy before measure** — any change visible on page 8 needs `build-deploy.py --blocks-only` + OPcache reset BEFORE any Playwright/parity2 run, or you measure stale output.
- **Root cause before instance fix** — for a failing section ask "what's the CLASS of failure?" (converter/block-CSS/mockup-convention) before tuning one instance.
- **Outcome vs completion** — don't mark a task done unless the OUTCOME landed (live-verified), not just code shipped.
- **/qc-council BEFORE every commit** touching converter / pipeline / SGS-block logic (blub.db 255).
- **--converter-v2 required** on production orchestrator runs; **WP_DEBUG_DISPLAY false** on staging.
- **Verify on the REAL homepage (page 8)** with live DOM, never an assertion or test page (Rule 5).
- **Commit by explicit path** (`git commit -- <paths>`) — theme thread shares `main`.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | architectural/design decisions (Method-2 lift shape) |
| `/gap-analysis` | grade outputs before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` | auto-routes research tier (icon-library options) |
| `/strategic-plan` | order the Method-2 lift before coding |
| `/sgs-clone` | re-clone page 8 (`--deploy-target page:8 --converter-v2`) |
| `/adversarial-council` or `/qc-council` | Task 3 design-gate + per-converter-commit |
| `/dispatching-parallel-agents` · `/subagent-driven-development` | Task 2/3 dispatch |
| `/sgs-update` | after any block schema change |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright MCP | live page-8 DOM + computed-style verification (375/768/1440, cache-bust `?cb=N`) |
| `/wp-blocks` + `/sgs-db` | schema before any "missing X" claim |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | heavy converter/block builds (Task 2/3) |
| `design-reviewer` | visual verify of re-cloned page 8 |

## Deploy / verify quick ref
- Blocks/wrapper: `python plugins/sgs-blocks/scripts/build-deploy.py --blocks-only --allow-dirty` (defaults to sandybrown canary) → OPcache reset (write `<?php opcache_reset();` to webroot, curl, rm).
- Re-clone: `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --client mamas-munches --page homepage --auto-section --converter-v2 --mode draft --deploy-target page:8` (run via PowerShell — Bash node wrapper is broken).
- parity2: `node plugins/sgs-blocks/scripts/clone-parity.js --dump-captures .claude/reports/parity2-captures.json --viewports 1440` then `python plugins/sgs-blocks/scripts/parity2/parity2.py`.
- Canary homepage: https://sandybrown-nightingale-600381.hostingersite.com/ (page 8). Configurator: page 589. Creds: `.claude/secrets/sandybrown.env`.
