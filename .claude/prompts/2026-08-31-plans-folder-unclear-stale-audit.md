# Next session — verify the 14 "stale"/"unclear" plans properly, not by trusting their own headers

Invoke `/autopilot` first.

## Context

A prior session audited all 36 files directly under `.claude/plans/` (not `archive/`, not
`strategy/`) and archived 7 with strong evidence (merge commits, `decisions.md` entries, explicit
self-declared supersession). 14 more were classified as "genuinely active, keep as-is" and left
alone — those are fine, no action needed on them.

The remaining **14** were split into two buckets whose classification method had a real flaw,
caught by Bean before acting on it:

- **5 "STALE / NOT STARTED"**
- **9 "UNCLEAR"**

## The methodology bug in the prior audit — read this before doing anything else

The prior audit classified several plans as "stale" or "not started" largely because **the
plan's own status header said so** (e.g. "Status: NOT STARTED — next session", "Build NOT
started"). **A plan's own header claiming no progress is not proof no progress happened.** This
project's entire day-to-day experience (recorded repeatedly in this same session's own work) is
that status headers drift: work can land via a commit, a different prompt file, or direct
execution that never loops back to update the plan doc that originally proposed it. Trusting
"the doc says X" as ground truth is the exact same failure this project's whole doc-staleness
discipline exists to catch — the prior audit applied that scepticism inconsistently, checking
harder for the "unclear" bucket than for the "stale" one.

**The corrected rule for this session: treat EVERY plan's own status claim — "done" or "not
started" — as a hypothesis to verify, never as evidence on its own.** For each of the 14 below,
verify independently regardless of what its header says:

1. `git log --oneline --all -- <relevant file paths the plan describes>` — did commits touching
   the described mechanism land, even if they don't reference this plan file by name?
2. Grep the actual codebase for the mechanism/files/attributes the plan describes building —
   does the thing it wanted to build now exist, work correctly, and match the plan's intent?
3. Check `.claude/decisions.md` for a D-numbered entry that might record completion (or
   abandonment) of this specific work — search by subject, not just by plan filename.
4. Check `.claude/LEDGER.md` for whether the relevant track mentions this work as done, active,
   or superseded.
5. Only after 1-4 come back genuinely empty/inconclusive should a plan be called "not started" —
   and even then, phrase it as "no evidence found this session, re-check before trusting" rather
   than a flat assertion.

A plan whose header says "DONE" also deserves the same scepticism in the other direction — verify
it, don't just take the word for it either. Symmetric doubt, not doubt in one direction only.

## The 14 files

**Previously classified STALE / NOT STARTED — re-verify properly, don't trust the "not started" claim:**
1. `.claude/plans/2026-07-30-drawer-architecture-design-gate-BRIEF.md`
2. `.claude/plans/2026-07-31-step7-cursor-follow-background-design-gate.md`
3. `.claude/plans/2026-08-03-snooza-configurator-build-plan.md`
4. `.claude/plans/2026-08-24-template-by-template-remediation.md`
5. `.claude/plans/2026-08-26-migrate-off-native-spacing.md`

**Previously classified UNCLEAR — needs the full 4-step check above:**
6. `.claude/plans/2026-07-09-box-object-interface-contract.md`
7. `.claude/plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`
8. `.claude/plans/2026-08-01-wrapper-recognition-cascade-rework.md`
9. `.claude/plans/2026-08-05-pipeline-rearchitecture-design.md`
10. `.claude/plans/2026-08-08-element-driven-inspector-design.md`
11. `.claude/plans/2026-08-17-spec-verification-programme.md`
12. `.claude/plans/2026-08-20-unified-colour-panel-DESIGN.md`
13. `.claude/plans/2026-08-26-margin-reset-residual-defects.md`
14. `.claude/plans/phase-colour-conformance.md`

Two of these (#9/`pipeline-rearchitecture-design.md`, #14/`phase-colour-conformance.md`) already
had a partial lead from the prior pass — read the prior audit's notes on them (this session's
transcript, or ask Bean to relay if unavailable) before re-deriving from scratch, but still
verify independently rather than trusting that lead either.

## What to produce

For each of the 14: a verdict (COMPLETE — ready to archive / IN PROGRESS — keep, with what's
still open named / GENUINELY NOT STARTED — confirmed by evidence, not just the header / SUPERSEDED
BY — name the file) with the specific evidence for each (commit hashes, grep results, D-numbers,
LEDGER quotes). Do not archive anything without Bean's sign-off first — present the findings as a
menu, same as the prior pass did, and let Bean decide.

## Standing hazards (this repo, shared `main`, many concurrent sessions)

- Read-only investigation only unless Bean explicitly asks for archival action in the same
  session. Don't move files speculatively.
- Commit any doc corrections you make with explicit file paths, never a bare or directory commit.
- Check `git status` before any git operation — other tracks' uncommitted work may be present.
