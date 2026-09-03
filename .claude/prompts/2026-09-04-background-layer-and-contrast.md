# Next session — the `::after` background layer, then the contrast guard

**Written 2026-09-03.** Supersedes `2026-09-03-mechanical-repair-scripting.md`, deleted in the
same commit. Invoke `/autopilot` first.

## First action

Invoke `/autopilot`, then read the Mandatory Reading below. The first BUILD action is one hand-done
`::after` migration on a single element — not a batch. Do that one, record the recipe, and only
then decide whether to script the rest.

## Mandatory reading

1. `.claude/decisions.md` D934, D935, D936 (top of file) — they carry today's three load-bearing
   rules and are shorter than the LEDGER.
2. `.claude/plans/2026-09-03-cluster-a-text-gradient-batch.md` — the batch that shipped, and BOTH
   exclusion lists with reasons.
3. `.claude/reports/2026-09-03-A0-unverified-rows.md` — why four rows are blocked, with quoted
   evidence. Read this before assuming any row is a simple case.
4. `plugins/sgs-blocks/CLAUDE.md` § "Colour EMISSION helpers" and § "Touch-safe HOVER helpers".

## The one thing to understand before touching anything

A text gradient paints the gradient as the element's BACKGROUND and clips it to the glyph shapes
(`background-clip:text`). That clip applies to the element's ENTIRE background painting area. So an
element that also paints its own background renders **invisible text and no fill** — silently, while
still passing a naive `color` assertion.

That is the whole reason 11 rows are excluded. It is not a scoping preference.

## Task 1 — the `::after` background layer (the real body of work)

`sgs_block_background_layer_css( $selector, $paint_decl, $hover_paint_decl )` in
`includes/helpers-tokens.php` moves an element's background paint onto an `::after` pseudo-element,
freeing the element itself for `background-clip:text`. It uses `::after` specifically because
`sgs_border_gradient_css()` already owns `::before` on every block this applies to.

**It has never been used more than once.** Treat it as unproven at scale.

The 11 blocked rows, each needing this first:

| Row | Why blocked |
|---|---|
| `modal.closeColourText` | element declares colour + background on the same manifest entry |
| `nav-menu.itemColour` | same |
| `nav-menu.navColour` | same |
| `pricing-table.ctaColour` | same |
| `pricing-table.popularBadgeColour` | same |
| `product-card.ctaColourText` | same |
| `quote.textColourHover` | same (`box` element) |
| `form.submitColour` | default `submitStyle='primary'` class paints a background on the same button |
| `modal.triggerColour` | default `triggerStyle='primary'` class, same shape |
| `nav-menu.burgerColour` | sibling attribute `burgerBg` lands on the identical selector |
| `product-card.tagTextColour` | `style.css` gives the trial tag a solid accent background with ZERO operator input |

⛔ **Do the FIRST one by hand, then stop and record the recipe** (`.claude/THE-MIGRATION-METHOD.md`).
Start with `quote.textColourHover` or `pricing-table.popularBadgeColour` — both are manifest-declared,
so the interaction is visible in one file. Do NOT start with the three variant-class cases
(form/modal/nav-menu): a default style variant painting the background is a different and harder
shape, and it is where a premature script will silently mis-fire.

Verification is not optional and not by eye. `scripts/qa/assert-css-effect.js` runs a block's real
`render.php` standalone and asserts emitted CSS. Every row needs a TRUE claim that PASSES and a
deliberately FALSE claim that FAILS — a harness passing both proves nothing. Also assert the
BACKGROUND still paints (on `::after`) after the move; that is the regression this task can cause.

## Task 1b — the hover guard's third surface (measured 2026-09-03, NOT closed)

The touch-hover guard shipped this session covers TWO surfaces: static per-block `style.css` (via
the build transform) and the PHP emission helpers under `includes/` (via `check.js`'s PHP scan).

⛔ **It does NOT cover the blocks' own `render.php`, which is the largest surface.** Measured:
**30 of the 31 block `render.php` files that construct a `:hover` rule call no guard helper at
all.** `check.js`'s PHP target list is `includes/` only (`defaultPhpTargets()`).

One instance was found and fixed by accident this session — `sgs/post-grid`'s hover-text rule was
hand-rolled while every other hover row in that same file already used `sgs_hover_state_rules()`.
Nothing would have caught it; a task happened to touch that line.

⚠ **30 is an upper bound on FILES, not a defect count.** A raw `:hover` in a render.php may be
colour-only (deliberately out of scope — the colour helpers own those), focus-paired, or carry no
motion property at all. The work is to CLASSIFY them, not to wrap them:
1. Point `check.js`'s PHP scan at `src/blocks/*/render.php` as well and see what it reports. The
   classifier already distinguishes motion / colour / text-decoration-only and refuses to guess.
2. Expect a large first number and do NOT batch-fix it. Confirm the classifier's verdicts on a
   handful by hand first — a per-file scan cannot see a hover rule assembled across a call, which
   is the whole reason the one-hop registry exists.
3. Anything it cannot classify must FAIL the build rather than be guessed at, exactly as the CSS
   side already behaves.

This is arguably higher value than Task 2: a stuck hover is visible to every mobile visitor on
every affected block, and the mechanism to fix it is already built and proven.

## Task 2 — contrast guard (Bean-ruled: WARN, NEVER BLOCK)

⛔ **Bean's explicit ruling, 2026-09-03: the contrast guard must only ever WARN. It must never
prevent an operator from saving.** This matches the existing project rule that operator
accessibility failures are informational notices, not gates.

No contrast guard exists anywhere in the colour components today. A client can pick a pale gradient
on white and get unreadable text with no warning, against the framework's own WCAG 2.1 AA baseline.
Design it as an inspector notice. Note that a GRADIENT has no single contrast value — decide, and
record, how it is measured (both stops? worst stop? sampled?) before building.

## Standing rules (carried forward, still binding)

- `CLAUDE.md`'s 7 rules. `THE-MIGRATION-METHOD.md`: more than 3 blocks means build the detector first.
- Path-scoped commits only; re-check the branch in the same command. **A second session has been
  concurrently active on this tree all day** — re-verify file ownership before every commit, and
  never `git stash`/`git checkout --` on shared files.
- `~/.claude/rules/prove-the-cause-before-fix.md`. Today gave three fresh examples: a recognised
  shape is not a proven cause; a raw DB `UPDATE` is not a durable fix (D935); and a detector that
  answers one question ("is the paint direct?") does not answer the one that matters
  ("is this element eligible?").
- Fix the DECLARATION a derived value comes from, never the derived row (D935).

## Skills

| Skill | When |
|---|---|
| `/autopilot` | First, before any response |
| `/sgs-wp-engine` | Block/theme work |
| `/systematic-debugging` | Before any fix whose cause is not proven |
| `/qc-council` | Before scripting the `::after` migration across the remaining rows |
| `/subagent-driven-development` | The batch, once the recipe is recorded and verified |
| `/handoff` | Session close |
