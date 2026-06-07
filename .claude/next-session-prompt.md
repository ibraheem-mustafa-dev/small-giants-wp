---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-07
primary_goal: "Wire the new draft-centric fidelity verifier (parity2) into /sgs-clone so every clone auto-reports content%/layout%/css%/full% + a per-class carried/not-carried report; then build the icon-identity resolver and start the converter Method-2 CSS-lift for the 5 still-mirrored sections."
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

## Task 1 — Wire parity2 into /sgs-clone as the standing fidelity gate
**What:** make every `/sgs-clone` run auto-produce parity2's content%/layout%/css%/full% per section + the per-class carried/not-carried ledger, saved to the run's `pipeline-state/<run>/`.
**Why:** Rule 4 (per-class transfer accounting) becomes automatic; trustworthy fidelity numbers + exact "what didn't carry over" on every clone instead of running it by hand. (Bean's explicit ask.)
**Estimated time:** ~20 min.
**Orchestration:**
- Execution: inline (main thread) — pipeline plumbing the orchestrator must understand.
- Steps: after Stage 10 deploy, capture draft+clone via `clone-parity.js --dump-captures <run>/parity2-captures.json` (reuse the existing flag), run `parity2.py --captures <that> --out <run>/parity2-report`, surface the per-section table + overall content/layout/css to the run summary + `summary.log`. Add a default-on `--parity2` switch.
- Depends on: none. Parallel with: none.
- /qc gate after: `/qc-inline` (confirm the wired run produces the report + numbers match a standalone parity2 run).
**Acceptance:** a fresh `/sgs-clone` run writes `pipeline-state/<run>/parity2-report.json` with content/layout/css/full per section, and the orchestrator prints the table — matching a manual parity2 run on the same captures.

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

## Task 3 — Converter Method-2 CSS-lift for the 5 container-mirrored sections
**What:** for featured-product/brand/ingredients/gift/social-proof (route to `sgs/container` @conf 0.0), transfer the draft's CSS onto the container's block attributes (the 3-layer wrapper model) so they're faithful + editable, not class-mirrored.
**Why:** the big remaining VISIBLE fidelity lever (parity2 shows brand layout 48%, etc.). Makes most of the page genuinely converted.
**Estimated time:** start with ONE section (brand) ~30 min; design-gate the shared mechanism first.
**Orchestration:**
- Execution: design-gate THEN delegated. **Rule 7 applies — touches the converter/wrapper: `/adversarial-council` or `/qc-council` + Bean approval BEFORE code.**
- Pattern: after the gate, `/subagent-driven-development` per section (implementer + spec + quality reviewers).
- Context: parity2's per-class `css_dropped`/`layout_dropped` for each section IS the spec of what to lift. Memory `universal-lift-was-premature-not-falsified` — it lands on wrapper attrs that exist post-WS-4.
- Depends on: Task 1 (use parity2 to measure pre/post). Parallel with: Task 2.
- /qc gate after: `/qc-council` (blub.db 255 — converter change) + live page-8 verify + parity2 pre/post.
**Acceptance:** the target section's parity2 layout% + css% rise measurably pre→post on page 8, live-DOM verified, no regression elsewhere.

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
