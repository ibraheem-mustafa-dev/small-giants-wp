---
doc_type: prompt
title: Dispatch prompt — golden-colour Phase 3 continuation
created: 2026-09-04
governs: .claude/plans/2026-09-03-golden-colour-staged-rollout.md
retention: delete once consumed
---

# Session start: golden-colour Phase 3 continuation

Read `CLAUDE.md` in full, then `.claude/plans/2026-09-03-golden-colour-staged-rollout.md` in
full. The plan carries this session's full history in its Phase 3 log — read that log before
picking a row, not just the table below.

## Where Phase 3 stands

19 rows across 13 blocks are wired, live-verified, and deployed. Three more sibling sessions
closed 6 further rows on the same tree the same day. **Re-run `survey.js` before trusting any
count in this prompt** — the backlog moves under concurrent sessions.

```bash
node plugins/sgs-blocks/scripts/colour-codemod/survey.js --json > /tmp/survey.json
```

## What's left, classified by real per-block investigation (not guessed)

**Two EASY rows — do these first.** `google-reviews.arrowColourText` and
`.writeReviewColourText`. The shared helper `sgs_button_element_style_css()`
(`includes/helpers-button-style.php`) already has a `$bg_layer` parameter that calls
`sgs_block_background_layer_css()` — built, wired, unused for these two rows. Flip the
parameter on, then apply the usual four-file gradient pattern (see below).

**Five MODERATE rows — normal batch, same shape as most of today's work, but each needs
care, not a copy-paste.** `mega-panel.iconColour` (background is a `color-mix()`-derived
value repeated across three selectors), `multi-button.textColour` and
`testimonial-slider.textColour` (background already isolated in `sgs_fill_states_css()`,
but text colour runs through a separate `wp_style_engine_get_styles()` call on the same
selector — split them apart before wiring), `process-steps.numberColour` (background hover
triggers on the parent `.step`, not the badge itself), `process-steps.textColour` (text and
background share one style-engine call and one combined hover-decl array).

**Four HARD rows — each is its own small investigation, not a gradient task.**

- `accordion.headerColour` — not a gradient problem. Neither `headerColour` nor
  `headerBackground` is emitted anywhere in `render.php`. Find or rebuild the render path
  first; gradient wiring is irrelevant until then.
- `post-grid.categoryBadgeColour` — the code's own comment explains the exclusion:
  `categoryBadgeColour`/`categoryBadgeBgColour` route through a CSS custom-property map
  (`--sgs-pg-badge-bg`), and a `var()` fed into a fixed `color:` declaration cannot switch
  to `background-image` for a gradient. Needs a refactor across
  `class-post-grid-rest.php` + `render.php` + `style.css`, not a drop-in.
- `site-header.textColour` — background is a genuine multi-part system: sticky/transparent
  tri-state merge, a separate scrolled-state background with hand-built `!important`
  declarations, shrink/hide-on-scroll, a scrim overlay, all per breakpoint.
- `tabs.tabTextColour` — background, text, hover, and active state all flow through inline
  custom properties consumed by *static* `style.css` rules. Moving this to the `::after`
  layer means editing the shared stylesheet too, not just `render.php`.

**One small, well-scoped addition, not part of the row list above.** `sgs/quote`'s
`attributionColour`/`attributionColourGradient` already work (flat and gradient both).
Only the hover variant is missing — add `attributionColourHover` and
`attributionColourHoverGradient`, following the same pattern already used for the
attribution's flat/gradient pair and for the block's own root-level hover. (Root's
`textColourHover` targeting the root, not the body, is correct — the body renders through
InnerBlocks children, which the parent has no business styling. Attribution is the one
piece of visible root-adjacent text that never got its own hover control.)

## The four-file gradient pattern (unchanged, proven 19 times today)

| File | Change |
|---|---|
| `block.json` | add `{attr}Gradient` (string, default `""`); add `"css:background-image": "{attr}Gradient"` to the owning element's `attrMap` |
| `render.php` | read the gradient attr; `sgs_resolve_text_colour_or_gradient( $flat, $grad )` → `sgs_text_colour_decl()` → `sgs_text_colour_gradient_fallback_rule()` (call this **unconditionally** — it self-no-ops on a flat colour) |
| `edit.js` | destructure the gradient attr; row gains `gradientCapable: true` plus `gradientValue`/`onGradientChange`; preview swaps to `resolveTextColourPreviewStyle( flat, gradient, colourVar )` |
| `reports/visual-diff/<block>-<date>.md` | required — the gate checks for exactly this filename, keyed to a `source_sha` from `scripts/visual-report-sha.py <block>` against STAGED bytes. Trust its output over your own guess. |

Exemplar: read `sgs/counter`'s **current** `numberColour`/`labelColour` wiring, not any
historical commit diff — the helper signature has changed once already.

## Live-verify before calling a row done — this caught a real bug today

Static gates (`php -l`, `survey.js`, `check-dead-controls`, `check-element-manifest-conformance`)
all passed on `whatsapp-cta`'s first wiring attempt. The gradient still made the label text
invisible on the live canary, because the CSS landed on the wrapper instead of the child span
that actually holds the text — `color` inherits from parent to child, `background-image` does
not. Only a live probe caught it.

```bash
node plugins/sgs-blocks/scripts/qa/check-colour-gradient-roundtrip.js --pairs <block>,<block> --check
```

This script already exists (built today, 15/15 self-test, 5/5 live PASS). It authors a
positive/negative-control pair on a disposable page and measures resolved
`background-image`, `-webkit-background-clip`, and `color` directly. **Add a `FIXTURES`
entry for each new block you probe** rather than hand-rolling a new script — most blocks
need `extraAttrs` to render their target element at all (see the file's own comments for
two real examples: `whatsapp-cta` needs `phoneNumber` set or it renders nothing;
`quote` needs `attribution` set for the same reason).

## Coordination — multiple sessions share this tree right now

At least two other Claude sessions worked this exact backlog today (`small-giants-wp-05`,
`small-giants-wp-5e`), landing commits `16a7a7e0d`, `0e3ef60e0`, `10e08548a` on `main`
alongside this session's `976c9d961`, `e17bea203`, `a64f01b13`, `43c2c3d4b`, `22b4d21bb`.
Expect the same again.

- **Always commit with an explicit pathspec** (`git commit -- <paths>`), never a bare
  `git commit`. A bare commit takes the whole shared index, not just your files.
- **Check `git status` before touching a file.** If it's already dirty and you didn't
  write the diff, it's someone else's work — read the diff before deciding whether to
  wait, message them, or work around it. `ListAgents` finds other sessions on this
  machine; `SendMessage` reaches them directly.
- **Before deploying, check the tree is clean of files outside your own payload.** Deploy
  is a shared, one-canary resource. If it's dirty with someone else's verified work,
  coordinate a combined deploy rather than forcing yours through alone.

## Hand back, don't improvise, if:

- `survey.js`'s count moves between your dry run and your apply — another session touched
  your targets.
- `git status` shows uncommitted work in your target paths you didn't write.
- A fix-shape hasn't been measured against the real tree — run `/qc-council` first.
- You're about to touch `SGS_Container_Wrapper` or any shared helper spanning many
  blocks — Rule 7 design gate, Bean's approval first.
