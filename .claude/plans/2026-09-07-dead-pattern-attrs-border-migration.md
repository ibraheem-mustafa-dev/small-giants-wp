# Dead-pattern-attrs fix: border-mechanism migration for 15 theme patterns

## Context

`check-dead-pattern-attrs.py --check` flags 40 findings, all one root cause: 15 theme
pattern PHP files set a native WP `style.border` JSON object on `sgs/button`,
`sgs/container`, and `sgs/media` blocks. Per Spec 32 (block styling contract), those
three blocks deliberately do NOT declare `supports.style.border` — they implement
border via their own typed `borderWidth`/`borderColour`/`borderRadius`/`borderStyle`
attributes (the DB `box_family` mechanism). Every pattern instance authoring border
via `style.border` is silently dropped both in the editor and at render.

## Global Constraints

- Do not add `supports.style.border` to any of the 3 blocks — that would contradict
  Spec 32's no-inline-styling contract, which this framework enforces deliberately.
- The fix is a VALUE MIGRATION (move existing border intent from `style.border` to the
  block's own typed attrs), not new design work — the values in each pattern file
  should be preserved, just re-expressed.
- Before touching any pattern file, confirm each of the 3 target blocks has a complete
  2-state (resting + hover) x gradient-capable border colour control, matching this
  framework's established pattern (reference: `sgs/product-card` or `sgs/quote`,
  which recent decisions record as having a complete border-gradient rollout). If a
  block is missing part of that setup, build it first — Task 1 — before Task 2 touches
  any pattern file that depends on it.
- Shared worktree: path-scoped commits only (exact file paths, never `git add -A`/`.`),
  no `git stash`, no amend, no force-push, no co-author lines.
- Read `CLAUDE.md` and `plugins/sgs-blocks/CLAUDE.md` before starting.

## Task 1 — Verify/complete the border control on sgs/button, sgs/container, sgs/media

Read `src/components/SgsBorderControl.js` (or equivalent shared border component) and
its consumption pattern on a known-good reference block (`sgs/product-card` or
`sgs/quote`). For EACH of `sgs/button`, `sgs/container`, `sgs/media`:
1. Confirm `block.json` declares `borderWidth`, `borderStyle`, `borderColour`,
   `borderColourGradient`, `borderColourHover`, `borderColourHoverGradient`,
   `borderRadius` (tier-object shape) — same set as the reference block.
2. Confirm `edit.js` wires the shared border control with the same 2-state x
   gradient-capable colour picker as the reference block.
3. Confirm `render.php` emits the border CSS the same way the reference block does
   (likely via a shared helper in `includes/helpers-tokens.php` or similar).
4. If any of the 3 blocks is missing part of this (e.g. no hover variant declared, no
   gradient sibling, or the control isn't wired in edit.js), build the missing piece
   to match the reference block's pattern exactly — do not invent a new shape.

**Verification:** for each of the 3 blocks, the attribute set + control + render path
matches the reference block's shape. Full build compiles clean.

## Task 2 — Codemod the 15 pattern files

For each of the 15 files (`about-story.php`, `contact-form.php`, `contact-minimal.php`,
`cta-banner.php`, `cta-centred.php`, `footer-columns.php`, `footer-informational.php`,
`hero-video-background.php`, `pricing-columns.php`, `services-alternating.php`,
`services-grid.php`, `team-section.php`, `testimonials-cards.php`, plus 6 theme
templates — run `check-dead-pattern-attrs.py --check` yourself first to get the exact
current file list and line numbers, since the list above is from a prior investigation
pass and may need re-confirming), find every `style.border` JSON block on `sgs/button`,
`sgs/container`, or `sgs/media` and rewrite it as the equivalent typed attributes
(`borderWidth`, `borderStyle`, `borderColour`, `borderRadius`, etc. — completed by
Task 1) with the SAME visual values the pattern currently authors (width, colour,
style, radius) — this is a mechanical value-carry, not a redesign.

**Verification:**
```
cd plugins/sgs-blocks
python scripts/check-dead-pattern-attrs.py --check    # 0 of the 40 findings remain
npx wp-scripts build --experimental-modules --webpack-copy-php    # 0 errors
```
