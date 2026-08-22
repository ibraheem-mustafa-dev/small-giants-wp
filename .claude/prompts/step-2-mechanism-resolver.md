# Step 2 — Teach rule 31 to resolve each colour row's PAINT MECHANISM

Repo: `c:\Users\Bean\Projects\small-giants-wp`.

## Constraints (violating these breaks other work)

- **Run NO git command.** Not status, add, commit, stash or checkout.
- **Do NOT run `npm run build`.** The coordinator builds once per wave.
- **Touch ONLY** `plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js`.

## Read first

1. That rule file's own header docblock — it documents **12 existing blind spots**. You are adding
   a capability on top of a rule that already under-resolves; know where before you start.
2. `plugins/sgs-blocks/scripts/consistency/golden-controls.json` → `controls.colour`.
3. Sibling rules 21, 28, 30, 33, 34 — they already declare `text:render.php`, so the plumbing you
   need exists. Copy their declaration shape.

## The job

Add `text:render.php` to rule 31's `needs`, then build a resolver that answers, per colour
attribute: **which PHP helper actually consumes this?**

The four paint helpers:
`sgs_background_paint_decl` · `sgs_text_colour_decl` · `sgs_border_gradient_css` · `sgs_overlay_decls`

⛔ **`sgs_colour_value()` is NOT a paint helper.** It is the slug→`var()` resolver and appears in
far more places, on values that are not a paint. Counting it answers a different question.

### The resolution algorithm — stated so two implementers converge

- Follow **at most ONE intermediate variable hop** from the `$attributes[...]` read to the helper
  call (e.g. `$attr → $var → helper($var)`).
- Anything longer, or a computed key, is **UNRESOLVED**. Never guess.
- Strip PHP comments before scanning. A helper name inside a comment is prose, not a call — this
  repo has been bitten by exactly that.

### The shared-owner case — do not skip it

A per-block scan is **not sufficient**. Measured by
`plugins/sgs-blocks/scripts/census-colour-paint-route.py` (run it): only **25** of 83 blocks call a
paint helper directly. **18** route through `SGS_Container_Wrapper::render()`, where the paint
happens in `includes/class-sgs-container-wrapper.php` — a shared file the per-block scan never
reads. **40** call neither.

So when a block routes through the wrapper, resolve from the wrapper, mirroring what
`reachedComponents()` already does for shared JSX on the JS side.

⚠ If the wrapper's own routing turns out to make per-attribute resolution ambiguous, **STOP and
report that** — it is a finding about the plan's foundation, not a problem to code around.

## Hard boundary for this step

**Change NO assertion.** This step only makes the mechanism VISIBLE. The total finding count must
be **unchanged** when you are done. If it moved, you altered an assertion — revert that part.

Report an explicit **UNRESOLVED count**. That number is the honest blind-spot figure and the next
step depends on it.

## Verify

- `node scripts/inspector-scan/run.js --check` exits 0 and the total is unchanged.
- `sgs/heading` resolves three different mechanisms: text → `sgs_text_colour_decl`, background →
  `sgs_background_paint_decl`, border → `sgs_border_gradient_css`. Confirm all three.
- A block with no render.php does not crash the rule.

## Report

The UNRESOLVED count and its composition. Whether the wrapper case resolved cleanly or is
ambiguous. Anything you could not do — named, never worked around silently.
