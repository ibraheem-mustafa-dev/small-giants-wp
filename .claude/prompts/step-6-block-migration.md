# Step 6 — Per-block colour-row migration (PARAMETERISE: one agent per block set)

Repo: `c:\Users\Bean\Projects\small-giants-wp`. **You own ONLY the blocks named in your dispatch. Four agents run in parallel on disjoint sets.**

## Constraints

- **Run NO git command. Do NOT run `npm run build`.** Four agents share one `build/` directory;
  concurrent builds clobber each other, and a glob commit took `main` fatal on this repo before.
- **Touch ONLY your own blocks'** `edit.js` and `block.json`.
  ⛔ **NO shared components** — Step 5a/5b own those.
  ⛔ **NO other agent's blocks.** Check your list before every edit.

## Your worklist

Read `reports/qa-gate-b-worklist.json` (written by QA Gate B) and filter it to your own block list.
Do not work from a pasted list — the artefact is the reproducible source.

**Shadow rows listed in Step 5a's completion report are PRE-CLEARED — VERIFY ONLY, do not
re-touch.** Two agents "fixing" the same row differently is the failure this rule prevents.

## What "done" means — the ONLY checkable definition

**0 rule-31 findings for that row.** Nothing else.

A recipe also records `rowShape` and `livesAs`, but **no rule asserts those** — they are migration
guidance, not gates. Do not spend time trying to make them checkable.

## When "cannot fix" is acceptable — and when it is a defect

- **`missing-gradient`**: acceptable ONLY as a new `supports.sgs.colourExemptions` entry carrying a
  real, **block-specific**, non-boilerplate reason. A universal CSS fact repeated per block is
  boilerplate, and the contract's own rule calls a boilerplate reason a finding in itself.
- **Every other finding kind**: there is NO exemption mechanism in the schema. A "cannot fix" there
  is an **unfixed defect — escalate to the coordinator.** Never close it as a report.

## Reference blocks

| Recipe | Copy from |
|---|---|
| Fill / background | `sgs/container` (0 findings) |
| Text | `sgs/heading` text row, `edit.js:293-316` |
| Border | **`sgs/button`** — NOT `sgs/heading`, whose border rows are themselves findings |

## The trap

A new state writes to a sibling attribute. If the block's `block.json` does not declare it,
WordPress discards it silently — the client's setting vanishes on reload with no error. **Declare
before wiring.**

⛔ **Literal `states` array entries, never a computed `.map()`.** Rule 31 resolves state counts
statically; a computed array reads as "1 state" while rendering 2.

## Verify

- `node scripts/inspector-scan/run.js --check` filtered to your blocks — report before/after.
- Babel-parse every edited `.js`. ⚠ `node --check` is vacuous on files with a top-level `import`.
- Every edited `block.json` parses.

## Report

Per block: findings before → after. Every sibling attribute you declared. Any row you could not
close and WHY, classified by the rule above. Anything you could not do — named, never worked
around.
