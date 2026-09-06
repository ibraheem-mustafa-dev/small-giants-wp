---
doc_type: prompt
title: Spec 32/35 gates — residual rule-41/43 framework debt
created: 2026-09-04
updated: 2026-09-06 (core track closed; this file now covers the residual debt left behind — see History)
governs: .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md, .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md
retention: delete once consumed
---

# Spec 32/35 gates — residual rule-41/43 framework debt

Invoke `/autopilot` first. Read `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` and
`.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` in full before touching code. This tree runs
many concurrent sessions — check `ListAgents` and `git status` before touching any block.

## Mandatory READING

`.claude/decisions.md` D970 before touching any colour-adjacent rule-41 finding — it's the
incident this residual work grew out of, and it names the exact mistake not to repeat.

## First action

`node plugins/sgs-blocks/scripts/inspector-scan/run.js --json` — get the current live count for
rules 41 and 43. Every count in this file is a snapshot from 2026-09-06; the tree has moved
since. Under 2 minutes, no dependencies.

## History (why this is the only prompt for this track — do not recreate a second one)

The original Spec 32/35 gates track opened 2026-09-04, closed 2026-09-06: the Spec 32
CSS-injection gate, three Spec 35 detector rules, the 3 D812 control-shape fixes (now deployed
and live-verified), and two live `post-grid` bugs are all done. Full narrative:
`.claude/decisions.md` D970, `.claude/LEDGER.md`'s SPEC 32/35 GATES TRACK section.

**What's left is framework debt the closure surfaced but didn't clear** — real findings, not
housekeeping. This file now covers only that. Two things are worth knowing before you start:

1. **A colour-panel placement mistake happened and was reverted mid-track (D970).** A mechanical
   rule-41 batch built a colour-control mechanism that contradicted an already-documented rule
   in `plugins/sgs-blocks/CLAUDE.md`. Reverted; the detector itself was corrected instead of
   re-litigating each block. Read `plugins/sgs-blocks/CLAUDE.md`'s "Colour controls" section in
   full before touching any colour-adjacent finding below — the lesson was "read the doc before
   building a mechanism," not "colour findings are risky," so it applies to genuinely new
   mechanisms, not to using controls the doc already sanctions.
2. **Rule 41's detector now correctly exempts the legitimate shared-colour-panel pattern**
   (commit `c330f2a6b`) — a finding below is real scattering, not a false positive the fixed
   detector should have already caught.

## Task 1 — Rule 41: the 10 real scattering findings

**What:** as of 2026-09-06, `41-co2-element-grouping-order`'s `co2-scattered-element` kind has
10 real findings across: `card-grid`, `gallery`, `hero`, `nav-menu` (×2), `option-picker`,
`product-card` (×2), `tabs`, `trustpilot-reviews`. Re-run
`node plugins/sgs-blocks/scripts/inspector-scan/run.js --json` and filter by `kind ===
"co2-scattered-element"` for the current list — don't trust this one, it moves as other sessions
touch shared blocks.

**Read the rule's own header comment first**
(`plugins/sgs-blocks/scripts/inspector-scan/rules/41-co2-element-grouping-order.js`, lines
1-107) — Bean's settled 2026-08-27 ruling, not open for re-litigation, plus the exemption this
session added for the shared-colour-panel pattern.

**Fix shape:** each of these needs its own read — this is genuine 3+-location scattering, not
the mechanical "move a row" pattern used earlier in the track (that pattern is what caused
D970's mistake; don't reapply it blindly here). Confirm what "one panel" looks like for the
specific element before moving anything.

**Steps:**
1. Re-run the scan, confirm the current block list.
2. Fix as many as fit in the session — this is a bounded batch, not a reach-zero task.
3. Static verification only (`inspector-scan/run.js --json` + `npm run check:dead-controls`, 0
   net-new). Live Playwright verification is a separate follow-up batch once a deploy is due.

**Acceptance:** honest before/after count, path-scoped commits, 0 net-new dead-control
regressions, no reintroduction of the D970 mechanism.

## Task 2 — Rule 41: the 16 `dom-order-vs-declared-order` findings

**What:** pre-existing debt, unrelated to colour — a block's inspector panels mount in a DOM
order that doesn't match `block.json`'s declared `elements[*].order`. No shared mechanism fixes
these; each is a per-block judgement call: reorder the JSX, or correct the declared `order`
value if the current visual order is actually the intended one.

**Steps:** re-run the scan, filter by `kind === "dom-order-vs-declared-order"`, fix as many as
fit. Lower priority than Task 1 — pick this up once Task 1 is progressing or exhausted for the
session.

**Acceptance:** honest before/after count, path-scoped commits.

## Task 3 — Rule 43: investigate the 13 findings, including a new unexamined kind

**What:** `43-colour-only-state-indicator` sits at 13 findings across 9 blocks (`accordion`,
`buybox`, `form`, `modal`, `product-card`, `product-faq`, `product-search`,
`table-of-contents`, `tabs`) — up from the 12 recorded at the last full close-out. Two kinds:
`colour-only-state-indicator` (5, the known shape — a state shown by colour alone) and
`ambiguous-state-property` (8, NEW, never investigated).

**Steps:**
1. Re-run the scan, read a sample of the `ambiguous-state-property` findings' actual output —
   determine whether this is a real accessibility gap, a genuine ambiguity the detector correctly
   flags for a human decision, or a false-positive class needing a detector fix. Don't assume;
   read the code the finding points at.
2. For the 5 known-shape findings, fix as fits: the fix pattern from the prior close-out
   (DISCLOSURE / PAGINATION-SELECTION / LINK-TAB-FILTER — add a non-colour differentiator
   alongside the colour change) still applies.
3. Live-verify any fix on the canary — a real bug from this exact rule (`93dacf0d4`, a
   table-of-contents underline losing to a hover animation) was found and fixed 2026-09-06
   specifically because a fix was checked live, not just statically. Don't skip the live check.

**Acceptance:** the `ambiguous-state-property` kind is classified (real / ambiguous-needs-Bean /
false-positive), not just counted; known-shape findings fixed and live-verified.

## Lower priority — not a task, worth knowing

23 of 45 baseline/exemption files across the whole `inspector-scan` gate corpus carry real debt
(~555 entries total). Not this file's job to clear — noted here so whoever picks a next gate to
work knows it exists.

## Guardrails (carried forward, do not skip)

- **Read the relevant CLAUDE.md/spec section before building any general mechanism** that
  touches a shared component's placement or architecture. A documented rule is binding whether
  it's a day old or a year old — this is what D970's mistake actually was (see History above).
- **Shared tree, concurrent sessions are the norm on this project.** Re-check `git status` /
  `git branch --show-current` immediately before every commit. Path-scope every commit.
- **A peer's claim about who owns uncommitted files is a hypothesis, not ground truth** — verify
  via `git log`/`git diff` yourself before accepting or acting on it.
- **Never fabricate a live-verification PASS against a stale target.** If the canary hasn't been
  redeployed with the code you're checking, say so and deploy first.
- **Root-cause before fixing, always.**
- **Never write a parking.md entry without asking Bean first, every time, no exceptions.**
- `npm run build` (the fast gate chain) after every batch — read the full output, not just the
  exit code.
- **State a timing or precision claim you've actually measured, not one that sounds right** — an
  earlier write-up in this track's own history stated "6 minutes" for a gap that was really ~6
  days; an independent check caught it before it shipped. Verify, don't estimate, when a figure
  becomes part of a permanent record.

## Tools

| Tool | Use for |
|---|---|
| `node plugins/sgs-blocks/scripts/inspector-scan/run.js --json` | Current finding count/list for rules 41/43, filterable by `kind` |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..."` | Attribute-scoped census / DB ground-truth before any "missing X" claim |
| `python plugins/sgs-blocks/scripts/placement-reach.py --json` | Check element/attrMap ownership before/after a rule-41 fix |
| `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only [--payload <path>]` | The one deploy path — scope to what you actually changed when the tree is busy |

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | Always, first |
| `/systematic-debugging` | Any new regression found — root cause before fix, no exceptions |
| `/dispatching-parallel-agents` | If splitting Task 1/2's backlog into disjoint-block batches |
| `/sgs-wp-engine` + `/wp-blocks` | Schema/DB ground-truth before any "missing X" claim |
| `/gap-analysis` | Before calling any batch "done" |

## Agents to delegate to

| Agent | When |
|---|---|
| `wp-sgs-developer` | All SGS block work — rule-41/43 fixes, live verification, deploy |

## Tool bindings

| Tool | Use for |
|---|---|
| `node plugins/sgs-blocks/scripts/inspector-scan/run.js --json` | Current finding count/list, filterable by `kind` |
| `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only` | The one deploy path |

## Method

`.claude/THE-MIGRATION-METHOD.md` applies to anything touching more than 3 files by the same
mechanical pattern — confirm a shared-cause pattern genuinely holds (read the specific finding,
don't assume it matches an earlier one) before batch-applying. Every new rule ships
advisory-mode first, self-tested with a positive and negative control.

## Hand back, don't improvise, if:

- A shared-tree conflict can't be resolved by messaging the other session within a reasonable
  wait.
- Any of the cited counts have moved by a lot since this prompt was written — re-verify before
  assuming drift means something broke.
- The `ambiguous-state-property` investigation surfaces a design question (not just a bug) —
  that's Bean's call, not a mechanical fix.
