---
doc_type: prompt
title: Typography close-out (Tasks 3-5) + container padding-shape bug
created: 2026-09-06
governs: plugins/sgs-blocks (typography controls, cloning-pipeline converter)
retention: delete once consumed
---

# Typography close-out (Tasks 3-5) + container padding-shape bug

**PARTIAL UPDATE, 2026-09-07:** the "converter padding-shape bug" half of this prompt is
CONFIRMED FIXED — `python -m pytest scripts/converter/tests/test_outer_box.py -q` now passes
12/12 (was failing 2 when this prompt was written). Task 3's 4-block double-writer question
(`testimonial`/`card-grid`/`icon-list`/`collapsible-text`) was NOT re-verified this session —
a fresh scan found `sgs_typography_css_rule`/native-typography references still present in all
4 blocks' `render.php`, but that alone doesn't confirm the conflict is still live (could be one
mechanism cleanly co-existing with a dead reference). Re-verify Task 3 specifically before
trusting the rest of this prompt as current.

Invoke `/autopilot` first. Check `ListAgents` — this tree runs many concurrent sessions.

## Mandatory reading

Read `.claude/decisions.md` D971-D973 and PR #45 (merged tonight — deploy + gate fallout fixes)
before touching anything.

## Where this track stands

Deployed and live-verified tonight: PRs #40/#41 (typography full-replacement) plus PR #45 (gate
fallout: control-shape swaps, canvas-sync wiring, hardcoded-default cleanup). Confirmed via the
live detector, not memory: `node scripts/inspector-scan/run.js --only 45-typography-full-replacement`
reports exactly 6 findings — `counter` and `quote` are known false alarms (D972), leaving 4 real
blocks for Task 3.

Two bugs surfaced tonight and are **not yet fixed**:

1. **Task 3's 4 blocks** — a genuine double-writer conflict between old native typography and
   the new shared component (see below).
2. **Converter padding-shape bug** — unrelated to typography, found while investigating a
   deploy-gate failure. `sgs/container.padding` must convert to `{desktop:{top,right,bottom,left}}`
   per its own `block.json` schema (the tier-object migration, `9b2996a68`/`c829647c8`), but the
   converter's box-family routing still emits the old flat shape. Two tests in
   `scripts/converter/tests/test_outer_box.py` on `main` fail because of this right now.

## Priority and parallel plan

Six independent slices. Dispatch by file overlap, not by task number — nothing below shares a
file with anything else in the same wave, so run each wave as parallel agents via
`/dispatching-parallel-agents`.

**Wave A — dispatch all four together, right away:**

| Slice | Files touched | Model |
|---|---|---|
| Task 4 — live-verify the card-grid switcher | none (browser only) | haiku |
| Task 5 — confirm the TOC underline live | none (browser only) | haiku |
| Converter bug — root-cause the box-family routing | `scripts/converter/resolvers/outer_box.py`, `services/tier_suffix.py` (read only) | sonnet |
| Task 3 prep — read `render.php` for all 4 blocks, name the winning mechanism per block | `testimonial`, `card-grid`, `icon-list`, `collapsible-text` render.php (read only) | sonnet |

**Wave B — after Wave A reports back:**

- **Converter bug fix**, informed by Wave A's root-cause: correct the box-family merge so
  `sgs/container.padding` (and any other BOX-shaped attr the same routing touches) emits the
  tier-object envelope. Update `test_outer_box.py` to match. This is core cloning-pipeline logic
  — high blast radius, design-gate per CLAUDE.md rule 7. Read Spec 31 §3 (routing) in full before
  changing `dispatch_spine.py` or any resolver. One dispatch, sonnet or opus depending on how deep
  the routing bug goes.
- **Task 3, one dispatch per block** — `testimonial`, `card-grid`, `icon-list`,
  `collapsible-text`, using Wave A's per-block findings as the starting brief. Four parallel
  agents, each scoped to its own block's `block.json`/`edit.js`/`render.php` only — no shared
  files between them, so true parallel dispatch is safe. Model: opus for `testimonial` (3 text
  elements, highest risk); sonnet for the other three. Do NOT run any of these four at the same
  time as anything else touching the same block.

**Not a codemod, for either slice.** Task 1/2 already proved a typography codemod is wrong here —
the "one shape" premise fails per block (D973). The converter bug is a single logic fix in one
function, not a repeated pattern across files. Hand-fix both; use parallel dispatch for breadth,
not scripting for repetition.

## Task 3 — the double-writer conflict, per block

**Do:** read `render.php` first. Find which mechanism — native or shared — currently wins; that
value is what live content depends on, not whichever mechanism is "correct" long-term. Migrate
`testimonial`'s `quote`/`summary` fields from flat strings to the tiered/responsive shape. Use
`card-grid`'s clean 2-target wiring (`90b50989a`) as the reference for how a clean migration
looks.

**Verify:** a live check per block confirming the value clients currently see survives the
migration.

**Done when:** rule 45's mixed-mechanism finding drops to 0 for these 4 blocks.

## Task 4 — the card-grid switcher

**Do:** open the block editor, confirm the switcher renders, switching targets shows the right
values, an edited value survives switching away and back, and the "customised" indicator lights
up only for a target the operator actually changed.

**Done when:** all four checks pass live on the canary.

## Task 5 — the table-of-contents underline

**Do:** open a live page with a table of contents, scroll to a heading, confirm its TOC link
shows an underline — not just a colour change.

**Done when:** confirmed live. (The fix is already deployed; this is a verification-only step.)

## Converter padding-shape bug

**Do:** read Spec 31 §3 (content+CSS routing) before touching `outer_box.py` or
`dispatch_spine.py`. Find why `box_family='padding'` routes to a flat `{top,right,bottom,left}`
result instead of nesting it under `{desktop:{...}}`. Fix the routing, then update
`test_outer_box.py`'s two failing assertions to match the corrected (not the old, not a
guessed) output.

**Verify:** `python -m pytest scripts/converter/tests/` — full suite green, not just the two
known-failing tests.

**Done when:** `gate:full`'s `pytest-oracle-converter` passes clean on `main`.

## Guardrails (carried forward, still binding)

- Read the relevant CLAUDE.md/spec section before building any general mechanism touching a
  shared component's placement or architecture — a documented rule binds regardless of its age.
- Investigate before fixing a suspected bug. Read the code and check live before patching.
- The shared DB is a live write target other sessions use concurrently. Re-check row counts
  after any DB write — a concurrent write can erase a fresh insert with no error.
- Deploy before you measure. A scoped `--payload` deploy gets you through a dirty shared tree —
  never `--allow-dirty`, never stash another session's uncommitted files.
- Path-scope every commit: pass the exact staged file list after `--`, confirmed against
  `git diff --cached --name-only` first.
- Run `npm run gate:fast` after every change and read the full output. A pre-existing, unrelated
  finding gets a specific, checked reason in the commit message — never a blanket excuse.
- Commit straight to `main` when the change is ready — no PR step (Bean's standing instruction).
- Never run `phpcbf`.

## Tools

- `/dispatching-parallel-agents` for both waves.
- `/delegate` to confirm a model choice per slice.
- `node plugins/sgs-blocks/scripts/inspector-scan/run.js --only 45-typography-full-replacement`
  — rule 45's live count, before and after Task 3.
- `python -m pytest plugins/sgs-blocks/scripts/converter/tests/` — converter suite, before and
  after the padding-shape fix.
- `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only` — the
  one deploy path; add `--payload <path>` to scope around a dirty shared tree.
- Playwright (via the `wp-sgs-developer` agent) for every live check above.

## Agent

`wp-sgs-developer` for all block and converter work.
