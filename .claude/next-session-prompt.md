---
doc_type: next-session-prompt
project: small-giants-wp
thread: Track A DONE (inline-zero gate + core-block migration + page-13 21/21 + slider responsiveness, merged to main 17b65d34). Next = Task 3 — Spec 35 strategic plan.
generated: 2026-07-18 (very long session — Steps 6/core-rows completed + slider root-caused/fixed + merged to main)
---

Invoke `/autopilot` before doing anything else. This session is **plan-only** for Spec 35 —
read `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` **IN FULL** before planning, and do NOT write
any code until Bean signs off the plan (7-rules #7: design-gate shared-surface changes).

You are the SGS WordPress framework developer. The previous session (Track A) is COMPLETE and
**merged to `main` (`17b65d34`)**: the inline-zero anti-regression gate, the core→SGS migration
pairings (separator/row/stack + roster audit), `sgs/separator` opacity (core-parity), the live
21/21 page-13 migration, and the testimonial-slider mobile responsiveness fix. One task remains:
the **Spec 35 strategic plan**.

## State recap (plain English)

"Spec 35" is the standard for how every SGS block's editor sidebar is organised and which controls
it must expose (the brand-strip inspector rebuild was its pilot). This session writes the PLAN for
that work — no code — using `/strategic-plan`, and gets Bean's sign-off on the first slice before
anything is built. Three concrete requirements were surfaced last session and MUST be threaded into
the plan (they are captured — do not re-derive):
- **Feature-parity** — every SGS block must expose AT LEAST the functionality of the core block(s)
  it replaces (per `replaces` roster), unless a named exception. Memory: `sgs-block-feature-parity-with-replaced-core`.
- **Shrink-to-fit** — every block must be INTRINSICALLY responsive (min-content ≤ container at every
  breakpoint), not forced to fit by a container clamp. A block standard like no-inline / dynamic.
  Memory: `blocks-must-shrink-to-fit-container`. Includes landing the shared container/wrapper
  `min-width:0` (+`min-height:0`) grid/flex-item **safeguard** as the framework backstop.
- **sgs/media controls** — EVALUATE (don't assume) the optimal image AND video controls the framework
  is missing and add them to `sgs/media` (a holistic media-control review vs Kadence/Spectra/GenerateBlocks).
All three inputs are written up in `.claude/plans/2026-07-18-spec-35-captured-inputs.md` — read it first.

## Task 1 — Spec 35 strategic plan (PLAN ONLY, Bean sign-off before code)

**What:** produce a `/strategic-plan` phase plan for Spec 35 (Block Inspector UX + Control-Completeness
standard), threading the three captured requirements as design constraints (not last-phase checks).
**Why:** the planned next major framework workstream; a plan Bean signs off unblocks the build.
**Estimated time:** ~30 min for the plan.

**Orchestration:**
- Execution: inline (main thread, Opus) — architectural planning.
- Read `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` IN FULL + `.claude/plans/2026-07-18-spec-35-captured-inputs.md` FIRST.
- Invoke `/strategic-plan`; thread feature-parity + shrink-to-fit + media-controls as design constraints
  proven in the FIRST slice (memory `requirement-used-to-justify-is-not-requirement-made-a-design-constraint`).
- Do NOT code before the plan + Bean's sign-off.
- /qc gate after: `/gap-analysis` on the plan before presenting to Bean.
- **Depends on:** none. **Parallel with:** none.

**Acceptance:** a `/strategic-plan` phase plan for Spec 35 exists, grades ≥ A- on `/gap-analysis`,
and Bean approved the first slice. (No code this task without the plan.)

## Follow-up items to fold into the Spec 35 plan (not standalone tasks)
- **Container/wrapper `min-width:0` safeguard** — proven correct + low-risk last session (the canonical
  CSS-Grid `min-width:auto` blow-out guard) but NOT landed (the slider fix resolved the live symptom
  intrinsically). Land it as the framework backstop under the shrink-to-fit standard. Shared-container
  change → design-gate.
- **Shrink-to-fit audit** — a check that every block shrinks to fit its container at 360/768/1440.

## Dependency graph
```
Task 1 (Spec 35 /strategic-plan, inline Opus) → /gap-analysis → Bean sign-off → (build in a LATER session)
```

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | ALWAYS — design/architecture decisions in the plan |
| `/gap-analysis` | ALWAYS — grade the plan before presenting to Bean |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` | ALWAYS — auto-routes research tier (media-controls competitor scan) |
| `/strategic-plan` | ALWAYS — Task 1 is a strategic plan |
| `/sgs-wp-engine` · `/wp-blocks` · `/sgs-db` | block/attr ground truth for the control-completeness audit |

## MCP Servers & Tools
| Tool | For |
|---|---|
| Playwright | live-block inspector inspection / responsiveness spot-checks if the plan needs them |
| Hostinger `hosting_clearWebsiteCacheV1` | clear CDN before any live measure (palestine-lives / sandybrown) |

## Agents to Delegate To
| Agent | When |
|---|---|
| `wp-sgs-developer` | any block/inspector build once the plan is approved (NOT this session — plan only) |
| `design-reviewer` | inspector UX / responsive verification once building |

## Guardrails (carry-forward + this session's)
- **SHARED WORKTREE / co-active Track 2 (LOAD-BEARING):** Track 2 rebuilds header/footer/nav on the SAME
  branch `feat/brand-strip-inspector-rebuild` + working dir. Re-check `git branch --show-current` in the
  SAME guarded command as every commit; path-scope every commit (`git commit -- <paths>`); NEVER `git add -A`
  or `git checkout`/branch-switch. Merge to main ONLY via an isolated `git worktree add /c/tmp/<x> main`
  (proven last session — a real merge, NOT a fast-forward; main has Track 2's docs commits). Do NOT delete
  the shared branch. Do NOT rewrite `LEDGER.md`/`decisions.md` — Track 2 has uncommitted edits there.
- **PLAN-ONLY this session** — no code until Bean signs off the Spec 35 plan (7-rules #7 design-gate).
- **Prove the cause before the fix; verify on the REAL live page (live DOM), not source/a test page.**
  Root-cause with a subagent (`/systematic-debugging`) rather than a long inline investigation. Fact-check
  subagent output (invented paths/dates) against ground truth before acting.
- **THE GATE IS BEAN'S EYE (R-31-13):** never close a visual task on a number alone — screenshot at
  375/768/1440; clear the CDN before EVERY live measure.
- **No block version bumps / no `deprecated.js`** (D270). Complete code only — no stubs/TODOs. Editor content
  on page 13 via `wp.data.dispatch`, NEVER WP-CLI `str_replace` on post_content.
- **Inline-zero is now GATED** — `check-no-inline.py` runs in `prebuild`; any new block styling must render
  scoped (no inline `style="--"` / empty `style=""`), or the build fails. `--selftest` proves it.
- **STOP-29 / definition-of-done:** for Spec 35 (a spec'd subsystem), done = the spec's FULL scope; map every
  deferral to a named spec stage — never "out of scope".
