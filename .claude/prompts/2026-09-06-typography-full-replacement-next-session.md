---
doc_type: prompt
title: Typography full-replacement — remaining migration work
created: 2026-09-06
governs: plugins/sgs-blocks (typography controls)
retention: delete once consumed
---

# Typography full-replacement — remaining work

Invoke `/autopilot` first. Check `ListAgents` — this tree runs many concurrent sessions.

## Mandatory READING

`.claude/decisions.md` D971 (why this track exists) and D972 (what's already shipped) before
touching any code. Both are short — reading them costs less than re-deriving what they settled.

## First action

Read `plugins/sgs-blocks/src/blocks/form/render.php` to find `form`'s real typography selector
(the one block Task 1's automated resolution couldn't settle) — under 5 minutes, no dependencies,
and it unblocks Task 1's first real edit.

## Context

Tonight's session opened this track at Bean's direction: replace WordPress's native typography
support with the framework's own shared `TypographyControls` component everywhere. Full
architecture rationale: `.claude/decisions.md` D971 (why) and D972 (what shipped). Read both
before starting — they hold the reasoning a fresh session needs, not repeated here.

**Shipped already, don't rebuild:**
- A real census of all 84 blocks (14 done, 19 native-only, 6 mixed with 4 real conflicts, 44
  with neither).
- A detector, `plugins/sgs-blocks/scripts/inspector-scan/rules/45-typography-full-replacement.js`
  (29 live findings: 25 native declarations, 4 partial adoption).
- A multi-target switcher on `TypographyControls.js` (`targets=[]` prop; 1 target renders
  unchanged, 2-3 get a button-group switcher, 4+ get a dropdown; wired live on `card-grid`).
- A ruled-out suspicion: the shared PHP helper does NOT have a responsive-value bug. Verified
  live at three screen widths. Don't re-investigate this.

**This session's job:** the actual migration, in the order below.

## Priority for one session

Sessions run out of time before they run out of tasks. If this session can't finish everything,
stop after Task 2 and hand off the rest — Tasks 1 and 2 are mechanical and safe to leave
mid-batch; Task 3 needs judgement and should not be started and abandoned half-done.

1. Task 1 — migrate the 19 native-only blocks (biggest win, fully mechanical)
2. Task 2 — tidy the 4 duplicate-logic blocks (small, safe)
3. Task 4 — live-verify the switcher (quick, unblocks Task 3's dependents)
4. Task 5 — deploy the table-of-contents fix (quick, isolated)
5. Task 3 — resolve the 4 double-writer conflicts (judgement-heavy, do last or hand off)
6. Task 6 — reconcile the orphaned stash (independent, fill spare time only)

## Task 1 — Migrate the 19 native-only blocks

**Blocks:** `accordion`, `breadcrumbs`, `business-info`, `container`, `countdown-timer`,
`cta-section`, `form`, `hero`, `info-box`, `notice-banner`, `post-grid`, `pricing-table`,
`process-steps`, `product-faq`, `social-icons`, `table-of-contents`, `team-member`,
`testimonial-slider`, `timeline`.

**Per block:** remove `supports.typography` from `block.json`; wire `TypographyControls` into
`edit.js` at native's current selector; swap `render.php`'s style-read for
`sgs_typography_css_rule()`. Change all three files together — every one of these 19 sets
`__experimentalSkipSerialization: true`, so a `block.json`-only edit silently breaks rendering.

**Find each block's selector:** rule `33-ineffective-typography-selector.js` already resolved 18
of the 19 (its live output shows 0 findings, meaning the selector is settled). Only `form` needs
a manual read of `form/render.php` to find its real target first.

**Do:** one block solo first, to prove the pattern. Then dispatch the rest in parallel — they're
disjoint files. Model: sonnet.

**Verify:** rule 45's count drops by exactly the blocks migrated; live render check at
desktop/tablet/mobile on at least 3 sampled blocks.

**Done when:** rule 45's native-declaration count reaches 6 (Task 3's 4 blocks) or 0 if Task 3
also finishes.

## Task 2 — Tidy 4 duplicate-logic blocks

**Blocks:** `button`, `heading`, `label`, `text`. Each already uses `TypographyControls`
correctly but hand-rolls its own render-side CSS instead of calling
`sgs_typography_css_rule()`. Confirmed working, not broken (D972) — this is a pure refactor with
no visible change.

**Do:** read each block's current output first. Swap the hand-rolled emission for the shared
helper call, same selector. Treat any output difference as a bug, not an acceptable change.

**Verify:** computed CSS unchanged at three breakpoints, before and after, on all 4 blocks.

**Done when:** rule 45 shows 0 findings for these 4.

## Task 3 — Resolve 4 double-writer conflicts

**Blocks:** `testimonial` (highest risk — 3 text elements; native and the shared component's
`quoteFontSize` target the same selector), `card-grid`, `icon-list` (each: one element clean,
one genuinely conflicting), `collapsible-text` (1 element, direct collision).

**Do:** read `render.php` for each block first. Find which mechanism currently wins — that's
the value live content depends on, not whichever mechanism is "correct" long-term. Migrate
`testimonial`'s `quote`/`summary` fields from their current flat-string values to the
tiered/responsive shape; use `card-grid`'s clean 2-target wiring (commit `90b50989a`) as the
reference.

**Do not** run this in parallel with Task 1 on the same blocks — `testimonial`, `card-grid`, and
`icon-list` overlap Task 1's file set if scoping drifts. Confirm no overlap before dispatching.
Model: opus (judgement-heavy).

**Verify:** live check per block confirming the value clients currently see survives the
migration.

**Done when:** rule 45's mixed-mechanism finding drops to 0 for these 4.

## Task 4 — Live-verify the switcher

The switcher is built and wired on `card-grid` (commit `90b50989a`) but never live-checked —
blocked all night by another session's unrelated dirty files in the shared deploy folder.

**Do:** deploy with a scoped `--payload` if the tree isn't clean (never `--allow-dirty`, never
stash someone else's files). Then confirm: the switcher renders; switching targets shows the
right values; editing a value, switching away, and switching back preserves it; the
modified-value indicator shows only on a customised target.

**Done when:** all four checks pass live on the canary. Task 3's blocks depend on this being
proven correct first.

## Task 5 — Deploy the table-of-contents fix

Commit `93dacf0d4` (the active-link underline fix) is committed, not deployed. Deploy it and
confirm live: the current page's link in the table of contents shows an underline, not just a
colour change.

## Task 6 — Reconcile the orphaned stash

`git stash@{0}` (26 files, base `7a2c68b05`) has sat unresolved for 3+ days, flagged at every
session start since. Full file list: `.claude/LEDGER.md`'s ROAD-TO-UNIFORM RECONCILIATION
section.

**Do:** `git stash show -p stash@{0} > backup.patch`, then apply file by file, checking each
against what's since landed on `main` — several blocks have moved on since the stash was made.

**Done when:** the stash is reconciled and dropped, or re-flagged with a named reason it can't
be yet. Never leave it silently unresolved for another session to rediscover.

## Guardrails

- **Read the relevant CLAUDE.md/spec section before building any general mechanism** that
  touches a shared component's placement or architecture. A documented rule is binding whether
  it's a day old or a year old — the failure that opened this exact track was skipping this
  step (D970).
- **Investigate before "fixing" a suspected bug.** Read the code and check live before writing a
  patch — a suspected helper bug this session turned out not to exist (D972).
- **A live shared DB is a write target too, not just the git tree.** Re-check row counts after
  any DB write; a concurrent session's write can silently erase a fresh insert with no error.
- **Deploy before you measure.** Any live-verified change needs a real deploy and cache purge
  first. A scoped `--payload` deploy is the sanctioned way through a dirty shared tree — never
  `--allow-dirty`, never stash another session's uncommitted files.
- **Path-scope every commit.** Re-check branch and `git status` immediately before committing.
- Run `npm run gate:fast` after every change and read the full output. Use `SGS_F5_SKIP` (not
  `--no-verify`) for a gate finding that's genuinely pre-existing and unrelated.
- Never run `phpcbf` — realign phpcs warnings by hand.

## Skills

`/dispatching-parallel-agents` for Task 1's fan-out. `/delegate` to pick a model per task.
`/gap-analysis` before calling any task done. `/systematic-debugging` for any new regression —
root cause before fix, always.

## Agent

`wp-sgs-developer` for all block work.

## Tool bindings

| Tool | Use for |
|---|---|
| `node plugins/sgs-blocks/scripts/inspector-scan/run.js --json` | Rule 45's live count, before and after every batch |
| `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only` | The one deploy path; add `--payload <path>` to scope around a dirty shared tree |
| Playwright (via the `wp-sgs-developer` agent) | Live render checks at desktop/tablet/mobile |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | DB-first lookups before any "missing X" claim |
