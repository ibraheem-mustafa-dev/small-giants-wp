---
doc_type: prompt
title: Continue the Spec 32/35 gates track — rule-41 backlog + deploy queue
created: 2026-09-04
updated: 2026-09-05 (merged the original session-start prompt into this one — see History)
governs: .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md, .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md
retention: delete once consumed
---

# Continue the Spec 32/35 gates track

Invoke `/autopilot` first. Read `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` and
`.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` in full before touching code — both carry the
current true state as of this track's own closure work, not the state their older prose
sections describe. This track ran concurrently with the colour-conformance track on the same
`main` — different scope, same tree, coordinated live via cross-session messaging throughout.
`.claude/LEDGER.md`'s "SPEC 32/35 GATES TRACK" section has the compressed summary; this file is
the ground truth for what's left.

## History (why this is the only prompt for this track — do not recreate a second one)

A `/qc-council` audit on 2026-09-04 found Spec 32 and Spec 35 both still had gaps
framework-wide. The original session-start prompt (`2026-09-04-spec32-35-closure-prompt.md`,
now deleted — its 5 tasks are ALL done, superseded, or explicitly out of scope, see below) built
the Spec 32 CSS-injection gate, 3 new Spec 35 detector rules, closed a slice of the rule-41
backlog, fixed 2 live-breaking bugs found during post-deploy verification, and root-caused +
fixed 3 D812 control-shape findings — but ran out of session length before finishing the rule-41
backlog or deploying the last 3 fixes. This file replaced that one on 2026-09-05 so a future
session finds ONE current prompt, not two (a prompt is an instruction, not a record — the old
one is superseded, not kept as history; that lives in `decisions.md` D962 and git).

**The old prompt's Task 4 (colour-completeness rollout, rule 31) was never this track's job** —
it belongs entirely to the concurrent colour-conformance track (see its own plan docs and
`.claude/LEDGER.md`'s "COLOUR TRACK" section). Do not pick it up here even though it's related;
that track is separately, actively staffed.

## Task 1 — Deploy + live-verify the 3 pending D812 control-shape fixes (small, do first)

**What:** `hero.justifyItems`, `modal.triggerStyle`, `trustpilot-reviews.theme` were converted
from `SelectControl` to `ToggleGroupControl` (commits `ba5dc407f`/`fee0631b8`/`c7f25aa75`,
already on `main`), root-caused via 3 parallel investigation subagents and independently
fact-checked against source before applying. `check-enum-control-shape.py --check` confirmed
0 new violations, 36 baselined (down from 39) at the time these landed. **Still not deployed as
of 2026-09-05** — blocked repeatedly by other sessions' active WIP under `plugins/sgs-blocks/`
(the colour-conformance track is currently mid-flight on `tabs`/`mega-panel`/`google-reviews`/
`option-picker`/`post-grid`/`process-steps`/`star-rating` — check `git status` fresh, don't
assume last night's blockers are today's).

**Why:** low-risk (pure UI-widget swap, confirmed no stored-value change, no other file
touched), but still owed a live check before calling it closed.

**Steps:**
1. `git status` — confirm the tree is clean of files under `plugins/sgs-blocks/` and
   `theme/sgs-theme/` (the deploy gate's `DEPLOY_ROOTS`) before deploying. If dirty with
   someone else's WIP, message them via `ListAgents` rather than forcing `--allow-dirty`. If the
   whole tree is busy, use `--payload <path>` to scope the deploy to just your 3 files instead of
   waiting on a fully clean tree (`build-deploy.py --target sandybrown --blocks-only --payload <path>`).
2. `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only [--payload <path>]`
3. Open each of the 3 blocks in the sandybrown block editor, confirm the control now renders
   as a toggle-group (not a dropdown) with the correct options, set each value and confirm it
   persists on save/reload, confirm the frontend CSS still applies correctly for each value.

**Acceptance:** all 3 controls confirmed live-correct, deploy's own gates (payload verify +
motion QA) green.

## Task 2 — Continue the rule-41 element-grouping backlog (bounded batch, not full clearance)

**What:** `41-co2-element-grouping-order` is at **43 findings across 28 blocks** as of
2026-09-05 (re-run `node plugins/sgs-blocks/scripts/inspector-scan/run.js --json` for the
current count — don't trust this number, it moves as other sessions touch shared blocks).
Started at 61 on 2026-09-04, closed 19 across 15 blocks in two rounds that day, using a
confirmed shared-cause pattern: an element's colour row lives in a `<SgsColourPanel>` mount
separate from its non-colour controls' own panel; the fix moves the colour row into that
element's own panel (`DesignTokenPicker`/`GradientCapableColourControl` directly, matching what
`SgsColourPanel` renders internally).

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
1. Re-run the scan, get the current block list and per-block finding counts — several blocks in
   the 2026-09-04 remaining list (`tabs`, `post-grid`, `process-steps`, `star-rating`,
   `mega-panel`, `option-picker`, `google-reviews`) are under ACTIVE colour-track edit right now
   per `git status` — check before touching any of them, don't just trust the list below.
2. Prioritise by count (highest first) for efficiency.
3. Work through as many as reasonably fit — this is a continuing backlog, not a
   reach-zero task. Report an honest before/after count.
4. `sgs/product-card` and `sgs/quote` were explicitly skipped in both 2026-09-04 rounds — they
   had live uncommitted edits from the concurrent colour-track session throughout. Check
   whether that's still true before touching them; the same likely now applies to the additional
   blocks named in step 1.
5. Static gate verification only (`inspector-scan/run.js --json` + `npm run check:dead-controls`
   for 0 net-new) — live Playwright verification of NEW fixes is a separate follow-up pass, per
   this track's own precedent (build the fix, verify statically, batch the live check
   separately once a deploy is due anyway).

**Acceptance:** honest before/after finding count, path-scoped commits (one per shared-cause
batch, not one per block), 0 net-new dead-control regressions.

## Task 3 — Verify rule 43's pending recheck

**What:** rule `43-colour-only-state-indicator` closed 10 of 22 findings on 2026-09-04 across 3
UI-shape patterns (DISCLOSURE/PAGINATION-SELECTION/LINK-TAB-FILTER). Still at **12 findings
across 8 blocks** as of 2026-09-05 (unchanged since — re-run the scan to confirm before trusting
this), with one fix flagged in the implementing agent's own 2026-09-04 report as needing a
recheck (that report lived only in that session's transcript, not written to disk — re-derive
the specific item from a fresh scan diff if it isn't obvious which one).

**Steps:** re-run the scan, confirm the fix in question renders its non-colour differentiator
correctly on the live canary (not just statically), fix if it doesn't.

## Guardrails (carried forward, do not skip)

- **Shared tree, concurrent sessions are the norm on this project.** Re-check `git status` /
  `git branch --show-current` immediately before every commit. Path-scope every commit.
- **A peer's claim about who owns uncommitted files is a hypothesis, not ground truth** — verify
  via `git log`/`git diff` yourself before accepting or acting on it.
- **Never fabricate a live-verification PASS against a stale target.** If the canary hasn't been
  redeployed with the code you're checking, say so and deploy first — don't eyeball source and
  call it verified.
- **Root-cause before fixing, always** — both live bugs found during this track's 2026-09-04
  work (`post-grid`'s namespace fatal and REST crash) were reproduced in isolation (`php -r`
  repro scripts) before the fix was written, not guessed at from the stack trace alone.
- **Never write a parking.md entry without asking Bean first, every time, no exceptions** —
  planned/next-session work belongs in a prompt doc or the LEDGER's next-session section, never
  parking.md, even during doc-reconciliation handoff work where it feels natural to "just note
  it there too". Caught and reverted twice before (2026-08-01, 2026-08-20); recurred a third
  time on 2026-09-04 during this very track's own handoff.
- `npm run build` (the fast gate chain) after every batch — read the full output, not just the
  exit code; CHECK A (`editor-render-parity`) is advisory and noisy when the tree has other
  sessions' uncommitted WIP mixed in, don't chase it blind.

## Tools

| Tool | Use for |
|---|---|
| `node plugins/sgs-blocks/scripts/inspector-scan/run.js --json` | Current finding count/list for rules 41/43/44 before and after a fix batch |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..."` | Attribute-scoped census / DB ground-truth before any "missing X" claim |
| `python plugins/sgs-blocks/scripts/placement-reach.py --json` | Check element/attrMap ownership before/after a rule-41 fix |
| `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only [--payload <path>]` | The one deploy path — scope to what you actually changed when the tree is busy |

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

## Method

`.claude/THE-MIGRATION-METHOD.md` applies to anything touching more than 3 files by the same
mechanical pattern — confirm the shared-cause pattern still holds before batch-applying (it did,
twice, on 2026-09-04) rather than hand-editing each instance independently. Every new rule ships
advisory-mode first, self-tested with a positive and negative control.

## Hand back, don't improvise, if:

- A shared-tree conflict can't be resolved by messaging the other session within a reasonable
  wait.
- Any of Task 2/3's cited counts have moved by a lot since this prompt was written — re-verify
  before assuming drift means something broke.
