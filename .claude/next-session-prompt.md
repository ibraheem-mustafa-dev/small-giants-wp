Invoke `/autopilot` before doing anything else.

> **Co-active tracks share this worktree.** A Spec-35 track commits between handoffs. Files under
> `plugins/sgs-blocks/scripts/behavioural-analyser/*`, `db-consistency/*`, `.claude/mistakes.md` and
> `next-session-prompt-spec35*.md` may carry UNCOMMITTED changes that are **not yours**. Path-scope every
> commit, re-check `git branch --show-current` in the SAME command as the commit, never `git add -A`.

---

You are the orchestrator for the SGS header/footer/nav programme (Specs 36 + 37). **This session you do
NOT implement.** You audit, plan, dispatch, and QC. Opus inline = orchestration + QC only; the building is
done by sonnet/haiku agents and python scripts you dispatch.

## First action

**Smallest first step, under 5 minutes, zero dependencies:**
`cat .claude/reports/2026-07-22-spec36-completion-audit.md | head -60`

That is last session's verified Spec 36 completion map (per-FR status + cost-tier + dependencies +
suggested parallel batches). It is the raw material for this session's plan — read it before anything else.

## Mandatory READING — before anything else

1. **`.claude/LEDGER.md`** — the single living status (header/footer/nav thread CLOSED; what's next).
2. **`.claude/STOP-CATALOGUE.md`** — **63 STOP entries** + the pre-flight ritual. **Answer the ritual
   inline before your first Write/Edit or first agent dispatch.**
3. **`.claude/reports/2026-07-22-spec36-completion-audit.md`** — the verified Spec 36 completion map.
4. **`.claude/specs/36-SGS-NAVIGATION-SYSTEM.md`** + **`.claude/specs/37-HEADER-FOOTER-BUILDER.md`** —
   the two governing specs, IN FULL. ⛔ **Specs 17 and 34 are DELETED — never cite them.**
   Spec 31 remains the standing cloning spec (read in full only if the session touches the converter).

## Why this matters (motivation — Rule 7)

**Top USP:** a client edits their own header/footer in a findable admin screen and it appears on their
site. That now WORKS end-to-end on both sites — proven live last session, via the real operator path, with
the legacy nav fully retired. **The remaining work is breadth, not risk:** turning a proven mechanism into
a complete, conformant feature set. This session converts a verified map into a parallel execution plan —
the highest-leverage thing available, because everything after it can run cheaply and concurrently.

---

## Task 1 — Extend the conformance audit to Spec 37

**What:** produce the same per-FR verified completion map for Spec 37 that already exists for Spec 36.
**Why:** you cannot plan or parallelise what you haven't verified. Spec Status lines drift — last session
found Spec 37 §3.9a/FR-37-6 claiming a client-data leak that had already been fixed, and the Spec 36 audit
found `sgs_mega_menu` plumbing built but never actually rendered. Trust code, not Status lines.
**Estimated time:** 20–30 min.

**Orchestration:**
- Execution: **delegated**
- Model: `sonnet` via `/delegate` — mechanical verification against code/DB, no novel design
- Dispatch pattern: single-agent (read-only)
- Brief: audit every Spec 37 FR against live code + DB exactly as
  `.claude/reports/2026-07-22-spec36-completion-audit.md` did for Spec 36 — claimed status vs verified
  status (DONE / PARTIAL / NOT-BUILT / UNVERIFIABLE-NEEDS-LIVE-DOM), evidence `file:line`, gap, cost tier
  (PYTHON-SCRIPT / HAIKU / SONNET / OPUS), dependencies + parallel-safety. Write to
  `.claude/reports/<date>-spec37-completion-audit.md`.
- Context the subagent needs: FR-37-1/2/3/5/25/11 + §3.3a are BUILT + canary-verified; FR-37-6 is PARTIAL
  (file step done); FR-37-9/10 audits are done with FR-37-33/34/35 carried; **FR-37-21 is DONE**
  (adaptive-nav + mega-menu deleted, D362) — any FR referencing those blocks is now moot/historical.
- Depends on: none. **Parallel with:** re-reading the Spec 36 map.
- **/qc gate after:** yes — spot-check 3 of its verdicts against code yourself before trusting the map.

**Acceptance:** every Spec 37 FR has a verified status with `file:line` evidence; any claimed-DONE the code
doesn't support is flagged. A map you would stake a dispatch plan on.

## Task 2 — `/plan` the remaining Spec 36 + 37 work as parallel batches

**What:** turn both completion maps into an execution plan: per-FR cost tier, dependency graph, and
explicit PARALLEL vs SEQUENTIAL grouping.
**Why:** Bean's directive — classify each remaining task by whether a python script / haiku / sonnet agent
can do it in whole or part, then run the cheap independent work concurrently instead of serially.
**Estimated time:** 30–45 min.

**Orchestration:**
- Execution: **inline (Opus)** — this is the orchestration judgement that must not be delegated
- Use `/strategic-plan`; the Spec 36 audit already proposes a starting grouping:
  - **Batch A (parallel, SONNET, disjoint blocks):** FR-36-19 mini-cart · 36-20 search extend ·
    36-21 social one-source · 36-23 site-info SHOULDs
  - **Batch B (parallel, cheap):** FR-36-12 notices (HAIKU) · 36-24 lint gate (PYTHON-SCRIPT) ·
    36-9 drawer var binding (HAIKU)
  - **Chain C (sequential — the mega spine):** 36-3 → 36-4 → 36-5 → 36-10 → 36-8 → 36-17 → 36-9a
    (FR-36-6 "show header" toggle runs parallel to this chain)
  - **Gate-only, last:** FR-36-16 + 36-11 = live Playwright/axe + Bean's eye
- Fold Spec 37's remaining FRs into the same structure: FR-37-33/34/35 (§3 gaps), FR-37-14/15 (tri-state +
  scoped behaviour CSS), FR-37-7/8 (starter picker), FR-37-26..31 (Simple/Advanced surface + a11y).
- Depends on: Task 1. **Parallel with:** none.
- **/qc gate after:** no — Task 3's dispatch is the test of the plan.

**Acceptance:** a written plan where every remaining FR carries a model tier, a dependency, and a
parallel-batch assignment; nothing is left unclassified; no FR is silently dropped (STOP-29 — map every
deferral to a named spec STAGE, never "out of scope").

## Task 3 — Dispatch the first parallel batch

**What:** spawn the Batch A + Batch B agents concurrently and QC their returns.
**Why:** proves the plan and banks real progress cheaply. These are disjoint blocks — genuinely safe to
run at once.
**Estimated time:** 45–60 min wall-clock for the batch.

**Orchestration:**
- Execution: **delegated**, via `/dispatching-parallel-agents`
- Model: per the plan's tier (mostly `sonnet`; haiku/python for Batch B)
- Dispatch pattern: parallel — one agent per FR, disjoint files only
- **Every implementer dispatch MUST carry:** *"EXECUTE YOURSELF with your OWN tools. Do NOT use the
  Agent/Task tool to delegate — you are the implementer. Report actual command outputs."*
  (STOP-A-DISPATCHED-AGENT-MUST-EXECUTE-NOT-DELEGATE — this bit twice last session.)
- Depends on: Task 2. **Parallel with:** n/a (this IS the parallel step).
- **/qc gate after:** yes — `/qc-council` before any commit touching SGS block logic (blub.db 255).

**Acceptance:** each dispatched FR returns with evidence you have independently verified against the repo;
build green; commits path-scoped. An agent's "done" is a CLAIM until you check it.

---

## Dependency graph

```
Task 1 — Spec 37 audit (sonnet, read-only)
   ↓
Task 2 — /plan (INLINE Opus — orchestration judgement)
   ↓
Task 3 — Batch A (4x sonnet, parallel) + Batch B (haiku + python, parallel)
   ↓  /qc-council gate
commit (path-scoped, branch re-checked in the SAME command)
   ↓
[later sessions] Chain C — the mega spine (sequential) → FR-36-16/11 live gates + Bean's eye
```

## Methodology guardrails (do not skip)

- **A dispatched agent must EXECUTE, not delegate** (NEW D362) — put the explicit "you are the
  implementer, do not use the Agent tool" line in every implementer dispatch. Two agents delegated
  instead of executing last session, burning a cycle and spawning nested agents that needed stopping.
- **Inspect the target before deleting on a live site** (NEW D362) — a delete instruction authorises the
  ACT, never skipping verification. Posts described as "scrap canary pages" were the LIVE Indus
  Retail/Wholesale sector pages. One `wp post get` per object prevented destroying client content.
- **Set option-driven state in the context that READS it** (D360) — never a raw `wp option update` from
  an arbitrary WP-CLI `--path`; use the admin action / a request against the live domain. A CLI/web store
  mismatch presented as a broken binding and nearly triggered a fix to correct code.
- **A live read contradicting a CLI read (no object cache) = a store/prefix/webroot mismatch, not a bug.**
- **An agent's "done" is a claim** — verify against the real repo / live state before believing it.
- **Prove the cause before the fix** — `"not cause A"` is exculpatory for A, never inculpatory for B.
  Never commit a fix for an unproven cause, nor a 2nd fix overlapping a working one.
- **A block-attr filter gate must be proven to FIRE on a live page** (D359) — WP-resolved values are not
  in the parsed attrs; match the attr the markup ACTUALLY carries and verify on a real render (R-31-11).
- **Deploy before measure**, and **checksum every deploy** — `[DONE]` + `[verify] HTTP 200` passes on ANY
  working SGS page including old code; `md5sum` local↔server BEFORE measuring.
- **On a shared canary a PASS is perishable** — re-assert before quoting an earlier live result.
- **Negative control, or the test is vacuous** — "would this still pass if the feature were absent?"
- **Verify an inherited deferral/description before executing it** — it is a hypothesis about the world.
- **A spec describing a superseded model misdirects the build** (D358) — amend the governing spec in the
  SAME work as the decision that changes the model.
- **Every council needs a code-grounded seat** (D358).
- **Root cause before instance fix**; **outcome vs completion** (code shipped ≠ outcome achieved).
- **STOP-29 — never "out of scope" on a spec'd surface.** Map every unbuilt part to a named spec STAGE.
- **Deploy on a shared worktree via an ISOLATED worktree** — copy `build/` (never junction node_modules)
  + `--skip-build`; reset the worktree to committed HEAD rather than copying loose files in.
- **/qc multi-rater BEFORE every commit** touching converter / pipeline / SGS block logic (blub.db 255).
- **WP_DEBUG_DISPLAY must stay false** on staging — debug notices contaminate every pixel-diff.

## Design guardrails — TRIMMED (justified: Tasks 1–3 author no design draft)

The full design-programme guardrails (brand-accent-as-ground, contrast-as-pairing, transition-only-
transform/opacity, no-hover-only-switching, degrade-to-more-content, recognised-slot-tokens, real-`<img>`
slots, background-recomputes-contrast, `dialog.close()`-kills-exit-animation, scrollbar-test-INCONCLUSIVE)
live UNCUT in `STOP-CATALOGUE.md`. **They apply only when AUTHORING A DESIGN DRAFT.** If a task pivots to
authoring a draft, load `/frontend-design` FIRST and re-read that block. Two still apply to any nav work:
`dialog.close()` kills exit animations, and never bank a scrollbar-dependent test from the harness.

## Known-open, NOT blockers (do not re-litigate)

- **Both sites show GENERIC proof headers** (sandybrown CPTs #1570/#1571; palestine-lives #360). Real
  branded headers come via the Spec 33 Part 2 cloning pipeline. Restore normal via admin "Clear active".
- **`sgs/heritage-strip` baselined debt** on posts 67/68 + 52/65/66 (deleted-block migration, REGISTER.md
  P1/P2) — baselined, does NOT block deploys. Separate from the resolved oldshape debt.
- **`P-TRUSTBAR-TRUSTPILOT-ATTR-COLLISIONS`** — the F5/F6 gate blocks commits on `sgs/trust-bar` attrs.
  **Owned by the co-active Spec-35 track.** Bypass with `[gates-ok:]` + `--no-verify`. Do NOT baseline it.
- **`P-NAV-FEATURED-HOVER-DRAFT-PARITY`** — ⛔ Bean-locked DO-NOT-FIX: the planted TEST CASE for cloning.
- **`P-NAV-STYLES-TAB-BLANKS-UNREPRODUCED`** — not reproduced; needs Bean's console capture.
- **LEDGER/decisions size caps** (`P-DOC-SIZE`) — sweep to `memory/` when over.
- **FR-36-15 converter emit + FR-36-18 real branded cutover + FR-36-25** are Phase-3, gated on Spec 33
  Part 2. Not this session.

## Skills to Invoke

| Skill | When to use |
|---|---|
| `/brainstorming` | Any architectural or design decision before building |
| `/strategic-plan` | **Task 2 — the core of this session** |
| `/gap-analysis` | Grade the audit + plan outputs before acting on them |
| `/research` | Auto-routes to the right research tier |
| `/lifecycle` | Before ANY skill / agent / pipeline change |
| `/delegate` | Pick the model per dispatched task (Tasks 1 + 3) |
| `/dispatching-parallel-agents` | **Task 3 — the parallel batch** |
| `/qc-council` | Multi-rater before any SGS-block / converter commit |
| `/qc-inline` | Small acceptance gates |
| `/adversarial-council` | Pre-build stress-test — **include a code-grounded seat** |
| `/systematic-debugging` | Root cause before fix |
| `/sgs-wp-engine` | Any SGS block / theme / client work |
| `/wp-block-development` | Core WP block-API questions |
| `/frontend-design` | **Before authoring ANY draft** — forces an explicit aesthetic direction |
| `/wp-sgs-deploy` | Deploy ceremony + gates |
| `/handoff` | Session close |

## Tool bindings — MCP Servers & Tools

| Tool | What to use it for |
|---|---|
| `playwright` | Live DOM verification (R-31-11) — the canonical proof; drawer/axe/overflow gates |
| `chrome-devtools` | CDP matched-rule provenance if CSS provenance is disputed |
| `hostinger` | Cache purge / WP version checks |
| `sgs-db.py` | Block attributes, slots, table checks — the DB is authoritative, never a prose count |
| `lints/*.py` | `bem-lint` · `token-lint` · `draft-vocab-lint` |
| `nav-qa/*.mjs` | `axe-run` · `crawl-assert` · `palette-contrast-sweep` (warn-only) |

## Agents to Delegate To

| Agent | When |
|---|---|
| `general-purpose` | Task 1 — the read-only Spec 37 conformance audit |
| `wp-sgs-developer` | Task 3 — the Batch A/B implementer agents (add the EXECUTE-YOURSELF line) |
| `code-reviewer` | Pre-commit review of any binding / converter change |
| `test-and-explain` | Plain-English confirmation for Bean that a feature works |

## Pre-flight self-attestation ritual (answer inline before first Write/Edit or first dispatch)

1. Read the governing specs (36 + 37 in full) + the LEDGER + both completion audits?
2. Did the prior session's work actually LAND? (Read the LEDGER's live status; verify HEAD.)
3. Am I about to assert a cause I have NOT tested? (STOP-PROVE-CAUSE-BEFORE-FIX.)
4. Verifying colour/contrast on ALL client palettes, not one? (STOP-VERIFY-EVERY-CLIENT.)
5. Passing the declared SHAPE (object vs flat; support vs attr)? Shape freeze respected? (STOP-D328.)
6. Does an SGS block/helper already do this? Did I grep? Did a parallel track already do it?
7. Am I building ahead of reconciling with what already shipped? (rework trap.)
8. Canary before dev-site? Full cache clear incl. Hostinger CDN before measuring? Desktop browser for
   any scrollbar/geometry check? (STOP-SCROLLBAR-LOCK / STOP-HARNESS-CANNOT-SEE-A-CLASSIC-SCROLLBAR.)
9. D-ceiling (`grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`) + branch verified in
   the SAME command as the commit?
10. Am I touching another track's files/branches without checking their state first?
11. Would my acceptance test still pass if the feature were absent? (STOP-NEGATIVE-CONTROL.)
12. Is this inherited task's premise still true? (STOP-VERIFY-A-DEFERRAL-BEFORE-EXECUTING-IT.)
13. Am I authoring a design draft without having loaded `/frontend-design` first?
14. Does the governing spec still describe the model we are actually building? (D358.)
15. If I am running a review panel, does it have a seat that verifies claims against live source? (D358.)
16. Am I trusting a block-attr filter gate without proving it FIRES on a real page? (D359.)
17. **Am I about to DELETE anything on a live site without opening it first to confirm what it is?**
    (NEW D362 — STOP-INSPECT-THE-TARGET-BEFORE-DELETING-ON-A-LIVE-SITE. "Scrap" pages were live client
    pages. A delete instruction authorises the act, never skipping verification.)
18. **Does every implementer dispatch say "EXECUTE YOURSELF, do NOT delegate"?** (NEW D362 —
    STOP-A-DISPATCHED-AGENT-MUST-EXECUTE-NOT-DELEGATE.)
19. **Am I setting option-driven state in the same context that READS it** (admin action / live domain),
    not a raw `wp option update` from an arbitrary CLI path? (D360.)
20. **Have I verified this agent's "done" against the real repo / live state**, rather than believing the
    report? (Held all session; caught real gaps every time.)
