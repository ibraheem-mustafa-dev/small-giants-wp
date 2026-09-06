---
doc_type: prompt
title: Typography full-replacement — deploy + Tasks 3-5
created: 2026-09-06
governs: plugins/sgs-blocks (typography controls)
retention: delete once consumed
---

# Typography full-replacement — deploy + Tasks 3-5

Invoke `/autopilot` first. Check `ListAgents` — this tree runs many concurrent sessions.

## Mandatory reading

Read `.claude/decisions.md` D971 (why this track exists), D972 (foundation), and D973 (Tasks 1+2,
shipped and merged same day) before touching anything. All three are short.

## First action

Deploy PRs #40 and #41 to the sandybrown canary and spot-check three sampled blocks live at
desktop/tablet/mobile. Nothing from this track has reached the canary yet — do this before any
other task below.

## What's already done — don't rebuild it

**Foundation (D972):** a real 84-block census; the detector
`plugins/sgs-blocks/scripts/inspector-scan/rules/45-typography-full-replacement.js`; a
multi-target switcher on `TypographyControls.js` (`targets=[]` prop).

**Tasks 1 and 2 (D973), merged to `main`:**

- PR #40 (`0e3a1447f`) — all 19 native-only blocks migrated onto the shared
  `TypographyControls`/`sgs_typography_css_rule()` mechanism, plus `sgs/button` tidied onto the
  same helper.
- PR #41 (`ddf04a5ea`) — `sgs/heading`, `sgs/label`, `sgs/text` migrated too, plus a real fix to
  the shared helper itself (see below).

rule 45's findings dropped from 29 to 6. The 6 remaining are exactly Task 3's four genuine
conflicts (`testimonial`, `card-grid`, `icon-list`, `collapsible-text`) plus two blocks
(`counter`, `quote`) that D972 already established need no fix — a false alarm, not open work.

**The stash is gone.** `git stash@{0}` (26 files) was checked file-by-file against `main` and
dropped — every change in it was superseded elsewhere. Don't look for it; there is no Task 6 any
more.

## Two learning points from this session — read before starting Task 3

**A codemod would have been the wrong call here, and the reasoning is worth repeating.** Partway
through Task 1, it looked repetitive enough to script. Investigation found the "one shape"
premise false: the target prefix isn't always the block root — `process-steps`, `post-grid`,
`pricing-table`, and `timeline` each target a named child element (`title`), detected only by
reading that block's own `selectors.typography`. Proof that this mattered: of the four Task 2
blocks, three (`heading`, `label`, `text`) independently stopped mid-migration on the same real
gap rather than force a swap — a codemod would have shipped that as a silent regression. When a
task in this track looks mechanical, verify the shape is actually uniform before scripting it;
don't assume from the first few instances.

**A stopped agent's "gap found" is often a shared-mechanism bug, not a per-block exception.** All
three Task 2 holdouts converged on one cause: `sgs/heading` and `sgs/text` let a client pick a
theme font-size PRESET (a slug like `"small"`, stored inside the tiered `fontSize` object's
`desktop` key — live-reachable through the editor, not theoretical), and the shared helper had no
path for that shape — it would have emitted the literal wrong CSS keyword `font-size:small` (the
~13px browser default) instead of the theme's actual token. The fix went into the shared helper
(`sgs_typography_css_rule()` in `helpers-typography.php`) via its existing `transform` extension
point, verified by 11 assertions **executed** against the real function, not inferred from
reading it. Full analysis: D973. If you hit a similar "the shared thing doesn't handle my case"
finding in Task 3, ask the same two questions before reaching for a per-block workaround: is the
general rule actually right, and if my case is genuinely different, is that difference specific
to this block or something the mechanism should just handle?

## Priority for one session

1. Deploy + spot-check (above) — do this first, it's quick and unblocks nothing else being risky.
2. Task 5 — deploy the table-of-contents fix (quick, isolated, already committed).
3. Task 4 — live-verify the switcher (quick, unblocks Task 3).
4. Task 3 — resolve the 4 double-writer conflicts (judgement-heavy; do last, or hand off rather
   than half-finish it).

## Task 3 — Resolve 4 double-writer conflicts

**Blocks:** `testimonial` (highest risk — 3 text elements; native and the shared component's
`quoteFontSize` target the same selector), `card-grid`, `icon-list` (each: one element clean, one
genuinely conflicting), `collapsible-text` (1 element, direct collision).

**Do:** read `render.php` for each block first. Find which mechanism currently wins — that's the
value live content depends on, not whichever mechanism is "correct" long-term. Migrate
`testimonial`'s `quote`/`summary` fields from their current flat-string values to the
tiered/responsive shape; use `card-grid`'s clean 2-target wiring (commit `90b50989a`) as the
reference.

**Do not** dispatch this in parallel with anything else touching the same four blocks — confirm
`git status` is clean of them first. Model: opus (judgement-heavy).

**Verify:** live check per block confirming the value clients currently see survives the
migration.

**Done when:** rule 45's mixed-mechanism finding drops to 0 for these 4.

## Task 4 — Live-verify the switcher

The switcher is built and wired on `card-grid` (commit `90b50989a`) but never live-checked.

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

## Guardrails

- **Read the relevant CLAUDE.md/spec section before building any general mechanism** that touches
  a shared component's placement or architecture. A documented rule is binding whether it's a day
  old or a year old — the failure that opened this whole track was skipping this step (D970).
- **Investigate before "fixing" a suspected bug.** Read the code and check live before writing a
  patch — this session's own D973 fix went into the shared helper only after 11 executed
  assertions proved the gap was real, not from a read-through alone.
- **A live shared DB is a write target too, not just the git tree.** Re-check row counts after any
  DB write; a concurrent session's write can silently erase a fresh insert with no error.
- **Deploy before you measure.** Any live-verified change needs a real deploy and cache purge
  first. A scoped `--payload` deploy is the sanctioned way through a dirty shared tree — never
  `--allow-dirty`, never stash another session's uncommitted files.
- **Path-scope every commit.** This tree runs 150+ concurrent sessions on `main`. Pass the exact
  staged file list after `--`, confirmed against `git diff --cached --name-only` first — a bare
  `git commit` is refused by this repo's path-scoped-commit gate for exactly this reason.
- Run `npm run gate:fast` after every change and read the full output. Use `SGS_F5_SKIP` (not
  `--no-verify`) for a gate finding that's genuinely pre-existing and unrelated, with a specific,
  checked reason — not a blanket excuse.
- The pre-commit visual-diff gate demands a report for any block touching non-`.php` files. A
  block whose CSS-output equivalence was verified at the source level (not a live capture) can use
  the scoped `SGS_VISUAL_GATE_SKIP=<blocks> SGS_VISUAL_GATE_REASON="..."` bypass — name the actual
  verification performed as the reason, per D973's examples.
- Never run `phpcbf` — realign phpcs warnings by hand.

## Skills

`/delegate` to pick a model per task. `/gap-analysis` before calling any task done.
`/systematic-debugging` for any new regression — root cause before fix, always.

## Agent

`wp-sgs-developer` for all block work.

## Tool bindings

| Tool | Use for |
|---|---|
| `node plugins/sgs-blocks/scripts/inspector-scan/run.js --json` | Rule 45's live count, before and after every change |
| `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only` | The one deploy path; add `--payload <path>` to scope around a dirty shared tree |
| Playwright (via the `wp-sgs-developer` agent) | Live render checks at desktop/tablet/mobile |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | DB-first lookups before any "missing X" claim |
