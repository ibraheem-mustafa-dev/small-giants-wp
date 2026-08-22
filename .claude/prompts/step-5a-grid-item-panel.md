# Step 5a — Bring GridItemDefaultsPanel's colour rows to the recipe

Repo: `c:\Users\Bean\Projects\small-giants-wp`. **Highest-leverage step in the phase: 6 findings on one file, reached by 20 blocks.**

## Constraints

- **Run NO git command. Do NOT run `npm run build`.**
- **Touch ONLY:**
  - `plugins/sgs-blocks/src/blocks/container/components/GridItemDefaultsPanel.js`
    ⛔ **VERIFY THIS PATH FIRST with `find`.** It is NOT under `src/components/`.
    `resolveComponentFiles()` scans BOTH directories with **no de-duplication**, so creating a file
    at the wrong path silently FORKS a component reaching 20 blocks — one copy live, one stale.
    Two independent reviewers caught this exact error in the plan that produced this prompt.
  - The `block.json` files you enumerate — **REPORT THE LIST BEFORE EDITING ANY OF THEM.**

## The job

Bring the panel's colour rows to the recipe: `states[]` with normal + hover, each carrying
`gradientValue` + `onGradientChange`.

**Reference to copy from:** `sgs/button`'s border row in `src/blocks/button/edit.js` — verified
conformant (0 rule-31 findings, 2 states, gradient per state, renders via `sgs_border_gradient_css`
at `button/render.php:894`).

⛔ **Do NOT copy from `sgs/heading`'s border row.** It is itself two of rule 31's findings.

## The trap that makes this step non-trivial

Every mounting block must **already declare the sibling attribute** each new state writes to.
WordPress silently discards an attribute a `block.json` does not declare — no error, no warning,
no failing build. The client sets a colour, saves, reloads, and it is gone.

So: enumerate the mounting blocks, check each one's `block.json` for the sibling, and declare the
missing ones **before** wiring the control. Enumerate with a command; do not estimate.

⛔ **Build the `states` array as LITERAL entries, never a computed `.map()`/`.filter()`.** Rule 31
resolves state counts STATICALLY and cannot evaluate a runtime predicate. A fix in this same
programme used `.filter().map()`, rendered both states correctly, and made the rule report
"carries 1 state" — the code improved while the detector went blind. That is worse than the finding
it replaced.

## Verify (without `npm run build`)

- `node scripts/inspector-scan/run.js --check` — the 6 findings on this file clear, and the total
  drops by the amount you enumerated. Report both numbers.
- Babel-parse each edited `.js` (the repo has `@babel/core` + `@babel/plugin-syntax-jsx`).
  ⚠ `node --check` is VACUOUS on a file with a top-level `import` — it returns 0 on broken code.
- Each edited `block.json` still parses.

## Report

The enumerated mounting-block list and which needed a sibling declared. Before/after finding counts.
**A complete list of every block you touched** — the next step's agents need it, so they verify
rather than re-touch those rows. Anything you could not do, named.
