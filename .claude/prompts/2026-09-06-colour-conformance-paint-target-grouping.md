---
doc_type: prompt
title: Colour conformance — group by paint target, one POC per group
created: 2026-09-06
governs: plugins/sgs-blocks/scripts/colour-codemod/
supersedes: 2026-09-06-colour-conformance-end-shape-method.md (consumed tonight — svg-paint-gradient CLOSED, classifier hardened, deleted in the same commit as this file)
retention: delete once consumed
---

# Session start: colour conformance, paint-target grouping

Read `CLAUDE.md` in full, then this prompt in full, before touching any code.

## The method

Group the remaining rows by what they paint — background, text, icon, border,
overlay — not by block. Each group already has a proven shared helper (or a
close variant of one). Fix one row per group by hand, confirm the pattern,
then either run a codemod or hand-fix the rest if the group is small. Do not
build a new mechanism before checking whether one already exists for that
paint target: `plugins/sgs-blocks/CLAUDE.md`'s "Colour EMISSION helpers" and
"Known precedent-function registry" sections list every one built so far.

## Trust the classifier now, but verify its output before acting on it

`classify-end-shape.js` had four real bugs tonight — a bound-variable
indirection miss (twice, once for text-gradient trio detection, once for the
SVG gradient sibling), a per-item-loop check with no causal scoping, and a
complete blind spot for cross-block Block Context delegation (a parent
declares `providesContext`, a child consumes it, and the classifier never
read the child's file). All four are fixed and pushed. The tool is reliable
for the first time — but "reliable" means "correctly reports what the code
does," not "immune to a fifth undiscovered bug." Read the actual render.php
before trusting any row's classification, the same way tonight's session
caught `accordion.iconColour`, `cart.iconColour`, and
`social-icons.iconGlyphColourHover` all reporting "unknown, incomplete" or
the wrong shape when all three already worked.

Re-run the census fresh — do not reuse the counts below, which are a
snapshot:

```
cd plugins/sgs-blocks/scripts/colour-codemod
node classify-end-shape.js
node classify-end-shape.js --list <shape-key>
node classify-end-shape.js --json
```

## What closed tonight

**`svg-paint-gradient`: 0 rows open.** `before-after.handleIconColour`,
`cart.iconColour`, `accordion.iconColour` all now have resting + hover
colour and gradient. `social-icons.iconGlyphColourHover` was already
conformant — a state-counting false positive, not a real gap.

**New shared helper:** `sgs_icon_gradient_css( $iconSource, $gradientCss,
$uniqueId, $selector )` in `includes/helpers-svg-gradient.php`. Built because
`sgs/icon`'s own gradient control — the block every other icon-hosting block
copied from — silently did nothing for 2 of its 4 icon sources (`dashicon`,
`emoji` render a `<span>`, never an `<svg>`, so injecting SVG `<defs>` into
them was a no-op). The helper picks the right mechanism per source: SVG
stroke-gradient for `lucide`/`wp-icon`, the standard text-gradient trio
(`background-clip:text`) for `dashicon`/`emoji`, since both genuinely paint
via `color:` like any other text node. `sgs/icon` itself was fixed as the
proof-of-concept. **Not yet rolled out:** `icon-list`, `notice-banner`,
`trust-bar`, `social-icons`, `button`, `cart`'s OTHER icon uses if any,
`google-reviews`, `accordion-item`, `business-info`, `star-rating` — every
other block still calling `sgs_svg_stroke_gradient()` unconditionally has the
same latent bug for `dashicon`/`emoji` sources, even if nobody has picked
those sources yet. Check each one's actual `IconPicker` `sources` prop before
assuming the bug applies — several restrict to `['lucide']` only (accordion,
before-after did before tonight) and don't need the composer's branching,
just the plain flat call.

## Groups still open, ranked by expected ease

**1. `fill-custom-property-gradient` (35 rows) — codemod already hardened,
ready to run at scope.** `migrate-fill-custom-property-gradient.js` had two
detector bugs fixed tonight (missing-fallback-default regex, a
`DesignTokenPicker` row-shape it couldn't see). Re-run `--survey` across the
full 35 first — expect more than the 2 rows fixed tonight to now pass. Read
every diff before trusting it. `business-info.linkHoverBackgroundImage`'s
shape (a composed-gradient colour-stop, not a plain consumer) must keep
refusing — it is the negative control proving the widened regex didn't
overreach.

**2. `fill-base-hover-flat` (~17 rows) — `sgs_fill_decls()`/
`sgs_fill_states_css()`, an established, uniform pattern.** Pick one row,
confirm the helper call matches its real selector and DOM, then batch the
rest. Watch for the SAME classifier traps as tonight: a bound-variable
gradient call, or an attribute delegated through Block Context.

**3. `text-gradient` (36 rows, split by tonight's fix) — most are smaller
than they look.** ~16 rows already have the full
`sgs_resolve_text_colour_or_gradient()` trio and need only a hover state
(the `[gap: hover-state]` rows) — the exact shape just proven on
`accordion`/`cart`/`before-after`, copy that pattern directly. ~20 rows
genuinely need the trio built from scratch — `breadcrumbs.currentColour`
was one of these and its POC (commit with `linkColour`'s three-line trio as
the template) is already on `main`; several of the other 20 likely have an
equally close in-file sibling to copy.

**4. `text-gradient-needs-bg-layer` (~25 rows) — the precondition helper
already exists, this is not a from-scratch design problem.**
`sgs_block_background_layer_css()` moves a background to its own `::after`
layer so `background-clip:text` doesn't also clip it. Confirm no block
already uses `::before`/`::after` for something else at the same layer
before applying it (check `sgs_border_gradient_css()` usage, which claims
`::before` on many blocks) — that collision is the real risk here, not the
mechanism itself.

**5. `border-base-hover` (15 rows) — `sgs_border_states_css()`, watch for
`::before` collisions.** A gradient border uses a masked `::before` ring
construct. Any block that already owns `::before` for something else (a
composed background gradient, a decorative shape) needs that checked before
wiring border-gradient, or one will silently overwrite the other.

**6. `per-item-loop` (2 rows) — too small for a codemod, just fix both by
hand:** `gallery.captionBgColour`, `trust-bar.badgeImageShadowColour`.

## Exceptions

A row that doesn't fit its group's shared helper cleanly gets its own
variant, found the same way tonight found `sgs_icon_gradient_css()`: read
what the row actually does, don't force it into the group's default shape.
Expect this for: an attribute with three real states instead of two (base +
hover + something else), an attribute whose gradient sibling maps to a
different mechanism than its own base attribute (the exact bug fixed
tonight — check the DB `css_property` of BOTH the base and the `Gradient`
sibling, not just one), or a block whose markup genuinely has no element for
the mechanism to target. Confirm with a direct DB query or a direct read of
render.php before designing the exception — never from the row's name alone,
though a name mismatch (a "fill" attribute needing a text mechanism, an
"icon" attribute needing the text-gradient trio) is a strong first signal
something is wrong.

## Standing rules (carried forward, still true)

- Path-scoped commits only; re-check `git branch --show-current` immediately
  before every commit.
- Push after every commit, not in a batch — this tree runs 150+ concurrent
  sessions. If the local checkout is dirty from another session's live edits,
  push via a throwaway `git worktree add ../<name> origin/main`, cherry-pick,
  resolve any real conflicts (a whitespace-only conflict from an unrelated
  alignment group is safe to take either side of), push, then
  `git worktree remove --force`. Junction the worktree's
  `plugins/sgs-blocks/node_modules` to the main checkout's before running any
  gate there (`New-Item -ItemType Junction`) — a fresh worktree has none, and
  the inspector-scan gate fails closed without it.
- A gate blocked by genuinely unrelated concurrent-session debt needs BOTH
  bypasses together: `[gates-ok:<reason>]` in the commit message AND
  `SGS_F5_SKIP=<script> SGS_F5_SKIP_REASON="..."` as an env var on the SAME
  commit invocation — one alone does not satisfy the other. Verify the
  finding truly doesn't mention your files (`grep` the `--report` output)
  before bypassing either.
- After any block.json change: `python scripts/sgs-update-v2.py --stage 1`
  then `python scripts/generate-attr-role-map.py`.
- Never force a row into a shape it doesn't cleanly match. Refuse with a
  named reason and go find the real model instead.

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | First — every session |
| `/dispatching-parallel-agents` | Once 2+ rows have confirmed, distinct, disjoint-file fixes ready |
| `/adversarial-council` | Before widening any codemod's scope back toward a universal auto-fix classifier |
| `/handoff` | Session close |
