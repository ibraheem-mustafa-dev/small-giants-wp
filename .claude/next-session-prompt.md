---
doc_type: next-session-prompt
project: small-giants-wp
thread: Inline-zero rollout DONE (D345/D346, on main). Next = Step 6 gate → core/rows→sgs/container migration + replaces-table audit → begin Spec 35.
generated: 2026-07-18 (very long session — framework-wide inline-zero rollout completed end-to-end + merged to main)
---

Invoke `/autopilot` before doing anything else. Read the governing specs
`specs/31-UNIVERSAL-CLONING-PIPELINE.md` + `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md`
IN FULL before touching the converter / walker / pipeline / block-styling surface.

You are the SGS WordPress framework developer. Last session **completed the
framework-wide inline-zero rollout** (D345/D346): both live sites (palestine-lives Indus
+ sandybrown Mama's) now render every `sgs/*` block with ZERO inline `style` attributes —
the shared `SGS_Container_Wrapper` Facet A+B change + all block conversions, merged to
`main` at `3c070139`. Three tasks remain, in order.

## State recap (plain English)

"Inline styling" = CSS written onto an element's `style="…"` attribute instead of a
stylesheet; it breaks responsive `@media` + `:hover` and bloats markup. That whole drive
is now DONE and on `main`. This session: (1) build the gate that stops it regressing,
(2) fix a gap in the core-block-replacement work — the Indus homepage still contains
`core/row` blocks that were never given a converter migration to `sgs/container`, and
(3) begin the Spec 35 Block-Inspector-UX work planned two sessions ago.

**⚠ Shared worktree / co-active track (LOAD-BEARING):** a second session (Track 2) is
rebuilding header/footer/nav on the SAME branch + working directory
(`feat/brand-strip-inspector-rebuild`). Before EVERY commit, run `git branch --show-current`
in the same guarded command, and path-scope every commit (`git commit -- <paths>`) — never
`git add -A`. NEVER `git checkout`/branch-switch in the shared worktree (it changes their
working dir out from under them). To merge to `main`, use an isolated
`git worktree add /c/tmp/<x> main` (last session's proven method) — never a local checkout.
Their WIP (specs/34, header-footer plans, lucide-icons.php, LEDGER.md, decisions.md D344)
is theirs — do not stage or overwrite it.

---

## Task 1 — Step 6: structural anti-regression prebuild gate

**What:** a build-time gate that FAILS the build if any `sgs/*` element would render an
inline `style="--…"` or empty `style=""`. Locks in the inline-zero win permanently.
**Why:** without it, a future block edit silently re-introduces inline styling and the
whole rollout erodes. Bean deferred this from last session specifically to this one.
**Estimated time:** ~30 min.

**Orchestration:**
- Execution: inline (main thread) — a focused gate script + wiring.
- Build `plugins/sgs-blocks/scripts/no-inline/check-no-inline.py`: scan a fixture render
  of each block (or the two canary pages) for `sgs/*` elements carrying `style="--` or
  `style=""`; exit 1 with the offending block named. Wire into `package.json` `prebuild`
  (alongside `check-dead-controls.js` / `check-hardcoded-render-defaults.js`).
- Reuse last session's detector `plugins/sgs-blocks/scripts/no-inline/detect.py`
  (live-render-driven; `--live-default` scans palestine-lives). The gate is its enforcing sibling.
- The ONE allowed exception is the documented `sgsCustomCss` residual — match it narrowly, never blanket-allow.
- /qc gate after: `/qc-inline` — prove it by injecting `style="--x:1"` into one block fixture (must FAIL) and removing it (must PASS).

**Acceptance:** `npm run build` passes on the current tree; injecting an inline `--var`
into any block fixture fails the build with that block named; the `sgsCustomCss` residual
does not false-positive.

## Task 2 — core/rows → sgs/container migration (a gap in the core-replacement work)

**What:** the core-block-replacement system converts banned `core/*` blocks to SGS
equivalents, driven by a DB `replaces` mapping + per-block migration scripts. `core/row`
(row/columns layout) has **no migration script to `sgs/container`**, so the Indus homepage
still ships live `core/row` blocks. Create that migration + register it in the `replaces`
table, then AUDIT every `replaces` row to confirm each has a migration script (this gap
suggests others may be missing).
**Why:** `core/*` blocks on a live client homepage violate the "native SGS blocks only"
contract and won't respond to container controls/cloning. The Indus build is live.
**Estimated time:** ~45 min (migration + audit + live apply).

**Orchestration:**
- Ground truth FIRST: `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` — inspect the
  `blocks.replaces` mapping + `block-replacements.json`; find where existing `core/*→sgs/*`
  migrations live: `plugins/sgs-blocks/scripts/migrate-core-blocks/` (`lint-page.py`,
  `driver.py`, `APPLY.md`, `block-replacements.json`). Read `APPLY.md` for the editor-apply flow.
- Write the `core/row → sgs/container` migration (row/columns layout → container
  `layoutType:flex|grid` + gap/align; a row's inner columns → the container's grid items).
  Register it in `block-replacements.json` + the DB `replaces` table via `/sgs-update`.
- **Audit:** enumerate EVERY `replaces` row; confirm a migration script exists for each;
  report the missing ones (like `core/row` was). Fix or park each with a reason.
- Apply on the live Indus homepage (page 13, palestine-lives) via editor-apply
  (`wp.data.dispatch` through Playwright, login user `Claude`) — NEVER WP-CLI `str_replace` on post_content.
- Delegate the migration transform to `wp-sgs-developer`; keep the audit + registration inline.
- /qc gate after: verify live — 0 `core/row` (+ 0 other banned `core/*`) on the Indus homepage; `sgs/container` renders the same layout (design-reviewer cropped before/after).

**Acceptance:** the prebuild `check-no-core-blocks.py` gate passes on the Indus homepage;
every `replaces` row has a registered migration script (audit report produced); homepage
layout visually unchanged after `core/row→sgs/container`.

## Task 3 — begin Spec 35 (SGS Block Inspector UX + Control-Completeness standard)

**What:** start building against `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` (the 6-stream
research committed `6ee48656` — the standard for how every SGS block's editor sidebar is
organised + which controls it must expose). The brand-strip inspector rebuild was its pilot.
**Why:** the planned next major workstream.
**Estimated time:** scope in-session — read Spec 35 IN FULL, then plan.

**Orchestration:**
- Execution: `/strategic-plan` inline FIRST (architectural — read Spec 35 in full, then plan the phase).
- Do NOT code before the plan + Bean's sign-off (7-rules #7: design-gate sensitive/shared-surface changes).
- /qc gate after: per the plan.

**Acceptance:** a `/strategic-plan` phase plan for Spec 35 exists + Bean approved the first
slice. (No code this task without the plan.)

## Dependency graph

```
Task 1 (inline) ──/qc-inline──┐   (Task 1 + Task 2 independent — either order / parallel)
Task 2 (inline + wp-sgs-developer delegate) ─┤
                                             ↓
Task 3 (/strategic-plan → Bean sign-off BEFORE any build)
  ↓ path-scoped commits + isolated-worktree merge to main (see Guardrails)
```

## Skills to Invoke

| Skill | When |
|---|---|
| `/autopilot` | FIRST (auto-injected by SessionStart) |
| `/brainstorming` | ALWAYS — design/architecture (Task 3) |
| `/gap-analysis` | ALWAYS — grade outputs before delivery |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` | ALWAYS — auto-routes research tier |
| `/strategic-plan` | ALWAYS — Task 3 phase plan before code |
| `/systematic-debugging` | root-cause any regression (Task 2 edge cases) |
| `/qc-inline` | Task 1 gate proof + Task 2 live verify |
| `/sgs-wp-engine` · `/wp-blocks` · `/sgs-db` · `/sgs-clone` | block/attr/replaces ground truth |
| `/dispatching-parallel-agents` | if Task 2 migration fans out |

## MCP Servers & Tools

| Tool | For |
|---|---|
| Playwright | live-page verify (Task 1 gate, Task 2 core/row removal); page-13 editor-apply via `wp.data.dispatch` (login `Claude`) |
| Hostinger `hosting_clearWebsiteCacheV1` | clear CDN before EVERY live measure (user `u945238940`; palestine-lives.org / sandybrown-nightingale-600381.hostingersite.com) |

## Agents to Delegate To

| Agent | When |
|---|---|
| `wp-sgs-developer` | block/migration edits + build/deploy (Task 2 core/row migration) |
| `design-reviewer` | Task 2 — confirm the Indus layout is unchanged after core/row→container |

## Guardrails (carry-forward + this session's)

- **Shared-worktree discipline (LOAD-BEARING):** re-check `git branch --show-current` in the SAME guarded command as every commit; path-scope every commit; NEVER `git checkout`/branch-switch or `git add -A` in the shared worktree; merge to main only via an isolated `git worktree add`. A merge commit of already-gated commits may use `--no-verify` + a `[batch-ok:…]` token (the per-block visual-diff gate re-fires on merge = a false trigger there); a NORMAL commit must NOT skip hooks.
- **THE GATE IS BEAN'S EYE (R-31-13):** never close a visual task on a number alone — screenshot at 375/768/1440 + full desktop width; cropped before/after; clear the CDN before EVERY measure.
- **Deploy blocks-only, never full-theme:** `powershell.exe … python plugins/sgs-blocks/scripts/build-deploy.py --blocks-only --allow-dirty --target palestine-lives` (or `--target sandybrown`); after build `git checkout HEAD -- plugins/sgs-blocks/includes/lucide-icons.php`.
- **Prove the cause before the fix; verify on the REAL live page (live DOM), not source/a test page.** Fact-check subagent output (invented file paths/dates/versions) against ground truth before acting on it.
- **No block version bumps / no `deprecated.js`** (D270). Complete code only — no stubs/TODOs. Editor content on page 13 via `wp.data.dispatch`, NEVER WP-CLI `str_replace` on post_content.
- **GOTCHA F (this session):** moving an inline `--var` to a scoped rule silently breaks any `[style*="--var"]` presence-selector — if any task touches a block's styling, grep its style.css for `[style*=` and rewrite to `var(--x, <resting>)` inert fallbacks.
- **STOP-29 / definition-of-done:** for a spec'd subsystem (Spec 35, the `replaces` roster), done = the spec's FULL scope; map every deferral to a named spec stage — never "out of scope".
