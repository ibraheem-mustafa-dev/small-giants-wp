---
doc_type: prompt
title: Continue the Spec 32/35 gates track — rule-41 backlog + deploy queue
created: 2026-09-04
governs: .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md, .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md
retention: delete once consumed
---

# Continue the Spec 32/35 gates track

Invoke `/autopilot` first. This track ran concurrently with colour-conformance session 11 on
the same `main` — different scope, same tree, coordinated live via cross-session messaging
throughout. `.claude/LEDGER.md`'s "SPEC 32/35 GATES TRACK" section has the compressed summary;
this file is the ground truth for what's left.

## Why this track exists

A `/qc-council` audit earlier confirmed Spec 32 and Spec 35 still had open gaps framework-wide.
A closure session built the missing gates, found and fixed 2 live-breaking bugs during
post-deploy verification, and closed a meaningful slice of the rule-41 element-grouping backlog
— but ran out of session length before finishing it. This prompt picks up exactly where it
stopped.

## Task 1 — Deploy + live-verify the 3 pending D812 control-shape fixes (small, do first)

**What:** `hero.justifyItems`, `modal.triggerStyle`, `trustpilot-reviews.theme` were converted
from `SelectControl` to `ToggleGroupControl` (commits `ba5dc407f`/`fee0631b8`/`c7f25aa75`,
already on `main`), root-caused via 3 parallel investigation subagents and independently
fact-checked against source before applying. `check-enum-control-shape.py --check` confirms
0 new violations, 36 baselined (down from 39). **Not yet deployed** — blocked twice tonight by
other sessions' uncommitted WIP in `before-after`/`cart`/`gallery` (not this track's files).

**Why:** low-risk (pure UI-widget swap, confirmed no stored-value change, no other file
touched), but still owed a live check before calling it closed.

**Steps:**
1. `git status` — confirm the tree is clean of files under `plugins/sgs-blocks/` and
   `theme/sgs-theme/` (the deploy gate's `DEPLOY_ROOTS`) before deploying. If dirty with
   someone else's WIP, message them via `ListAgents` rather than forcing `--allow-dirty`.
2. `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only`
3. Open each of the 3 blocks in the sandybrown block editor, confirm the control now renders
   as a toggle-group (not a dropdown) with the correct options, set each value and confirm it
   persists on save/reload, confirm the frontend CSS still applies correctly for each value.

**Acceptance:** all 3 controls confirmed live-correct, deploy's own gates (payload verify +
motion QA) green.

## Task 2 — Continue the rule-41 element-grouping backlog (bounded batch, not full clearance)

**What:** `41-co2-element-grouping-order` is at 42 findings across ~27 blocks (re-run
`node plugins/sgs-blocks/scripts/inspector-scan/run.js --json` for the current count — don't
trust this number, it may have moved). Started at 61, closed 19 across 15 blocks in two rounds
this session, using a confirmed shared-cause pattern: an element's colour row lives in a
`<SgsColourPanel>` mount separate from its non-colour controls' own panel; the fix moves the
colour row into that element's own panel (`DesignTokenPicker`/`GradientCapableColourControl`
directly, matching what `SgsColourPanel` renders internally).

**Read `plugins/sgs-blocks/scripts/inspector-scan/rules/41-co2-element-grouping-order.js`'s own
header comment (lines 1-107) in full before touching anything** — it documents Bean's settled
2026-08-27 ruling (not open for re-litigation) and a real false-positive class it already guards
against (a `wrapper`-element TIER-2 property-family split must NOT be flagged — that's correct
design, not scatter).

**Known second-order effect to expect:** moving a colour row out of a shared panel can shift DOM
order relative to another element's panel, converting a `co2-scattered-element` finding into a
`dom-order-vs-declared-order` finding when the two panels sit in different InspectorControls
tab-groups. This happened 3 times in round 1 (business-info, nav-drawer, text) — an acceptable
trade (rule 41 is advisory, not gating), not a bug to chase.

**Known real bug class to watch for:** an element can have an IMPLICIT attribute claim with no
explicit `attrMap` entry in `block.json`, causing DB cluster-fallback misrouting once a sibling
element gets its own panel. Found once in `business-info` (missing `textColour` attrMap entry),
once in `post-grid` (a genuine duplicate-control bug — `shadowColour` wired both as a dedicated
panel row AND via `ShadowControl`'s own auto-bound colour). Check
`python plugins/sgs-blocks/scripts/placement-reach.py --json` before/after if a control goes
missing after a fix.

**Steps:**
1. Re-run the scan, get the current block list and per-block finding counts.
2. Prioritise by count (highest first) for efficiency — was `nav-menu`(3), `option-picker`(2),
   `trust-bar`(2), `brand-strip`(2), `form`(2), plus ~20 singles, as of this session's close.
3. Work through as many as reasonably fit — this is a continuing backlog, not a
   reach-zero task. Report an honest before/after count.
4. `sgs/product-card` and `sgs/quote` were explicitly skipped both rounds this session — they
   had live uncommitted edits from the concurrent colour-track session throughout. Check
   whether that's still true before touching them.
5. Static gate verification only (`inspector-scan/run.js --json` + `npm run check:dead-controls`
   for 0 net-new) — live Playwright verification of NEW fixes is a separate follow-up pass, per
   this session's own precedent (build the fix, verify statically, batch the live check
   separately once a deploy is due anyway).

**Acceptance:** honest before/after finding count, path-scoped commits (one per shared-cause
batch, not one per block), 0 net-new dead-control regressions.

## Task 3 — Verify rule 43's 1 pending recheck

**What:** rule `43-colour-only-state-indicator` closed 10 of 22 findings this session across 3
UI-shape patterns (DISCLOSURE/PAGINATION-SELECTION/LINK-TAB-FILTER), with one fix flagged in the
implementing agent's own report as needing a recheck (the report is available in that session's
transcript, not written to disk — re-derive the specific item from a fresh
`node plugins/sgs-blocks/scripts/inspector-scan/run.js --json` diff against the 12 remaining
findings if the flagged item isn't obvious).

**Steps:** re-run the scan, confirm the fix in question renders its non-colour differentiator
correctly on the live canary (not just statically), fix if it doesn't.

## Guardrails (carried forward, do not skip)

- **Shared tree, concurrent sessions are the norm on this project.** Re-check `git status` /
  `git branch --show-current` immediately before every commit. Path-scope every commit.
- **A peer's claim about who owns uncommitted files is a hypothesis, not ground truth** — verify
  via `git log`/`git diff` yourself before accepting or acting on it. This session did that
  correctly 3 times tonight (once catching a peer's own confident misattribution).
- **Never fabricate a live-verification PASS against a stale target.** If the canary hasn't been
  redeployed with the code you're checking, say so and deploy first — don't eyeball source and
  call it verified. A subagent in this session correctly refused to do this and reported the
  blocker instead of guessing.
- **Root-cause before fixing, always** — both live bugs found tonight (`post-grid`'s namespace
  fatal and REST crash) were reproduced in isolation (`php -r` repro scripts) before the fix was
  written, not guessed at from the stack trace alone.
- `npm run build` (the fast gate chain) after every batch — read the full output, not just the
  exit code; CHECK A (`editor-render-parity`) is advisory and noisy when the tree has other
  sessions' uncommitted WIP mixed in, don't chase it blind.

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | Always, first |
| `/systematic-debugging` | Any new regression found — root cause before fix, no exceptions |
| `/dispatching-parallel-agents` | If splitting the rule-41 backlog into disjoint-block batches |
| `/sgs-wp-engine` + `/wp-blocks` | Schema/DB ground-truth before any "missing X" claim |
| `/gap-analysis` | Before calling any batch "done" |

## Agents to delegate to

| Agent | When |
|---|---|
| `wp-sgs-developer` | All SGS block work — rule-41 fixes, live verification, deploy |

## Guardrails from THE-MIGRATION-METHOD

More than 3 files touched by the same mechanical pattern → confirm the shared-cause pattern
still holds before batch-applying (it did, twice, this session) rather than hand-editing each
instance independently.
