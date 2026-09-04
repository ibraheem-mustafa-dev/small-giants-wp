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

## Where the plan stands

Phases 0, 1, 2, 4, and 5 are all closed (the plan doc marks each explicitly). Phase 3 — the
text-colour gradient rollout — is the one still open, and it is not just the row backlog.
**Every item below is a real, specified gap this session found by re-reading the plan in
full, not a new idea.** Pick from this list; don't assume the row backlog is the whole job.

## Every open task, in priority order

1. **The row backlog** — 19 rows across 13 blocks are wired, live-verified, deployed. 6 more
   closed by sibling sessions the same day. 11 remain, classified below. **Re-run `survey.js`
   before trusting any count in this prompt** — the backlog moves under concurrent sessions.
   ```bash
   node plugins/sgs-blocks/scripts/colour-codemod/survey.js --json > /tmp/survey.json
   ```
2. **The `supports.sgs.colourGrant` migration stamp — specified in the plan, never built.**
   `grep -rl "colourGrant" plugins/sgs-blocks/src/blocks/*/block.json` returns **zero**
   blocks, despite 19+ genuinely migrated rows. The plan's own words: *"Nothing marks a
   migrated block today, so a `git revert` silently un-migrates blocks the progress table
   still lists as done."* Build the stamp (`supports.sgs.colourGrant: "<commit-sha>"`,
   written atomically with each block's change) plus a check reconciling the stamp set
   against a live `survey.js` run, then backfill it onto every block already migrated by this
   session and its siblings. Do this **before** wiring more rows — every new row you wire
   without the stamp is more backfill work later.
3. **The DB/manifest three-state resolution split — specified, never measured.** The plan's
   "Ruling: three-state, not two" section calls this out as needing measurement *before*
   Phase 3 continues at scale, because it sizes the real remaining work. Never done. Run it:
   for every unresolved-mechanism colour attr (`survey.js`'s own count), classify (a) DB
   `css_property` resolves — use it, (b) DB empty but the block's manifest `attrMap` has a
   matching `css:` entry — seed the DB from the manifest (proven method, see the plan), (c)
   neither — refuse and count. Report the split; it tells you whether the true remaining
   population is a known-method manifest-seeding pass or genuinely smaller than any headline
   count suggests.
4. **Two stale doc pointers** — `.claude/plans/archive/2026-08-23-colour-capability-grant-PLAN.md`'s
   frontmatter and `.claude/plans/archive/2026-09-02-findings-31-golden-colour-control.md:20`
   both still point at the design doc's pre-archive live path. Five-minute fix, named in the
   plan's Phase 0 section, never done.
5. **The detector residual — not a colour-wiring task, flag it to whoever owns rule 31.**
   14 of the non-conformant rows (`borderColourHover`, `shadowHoverColour`, and similar) have
   an attribute name that is ITSELF a hover attribute — rule 31 miscounts them as "missing a
   hover sibling" when they ARE the hover sibling, with no resting value to add one to. Not
   this rollout's fix; name it to the session that next touches
   `scripts/inspector-scan/rules/31-golden-colour-control.js`.
6. **Named, lower priority, no new information this session** — re-take U11 extension
   attribution's numbers (`fx.js` mount count, `states=` carriers), the no-paint-path rows
   beyond this session's Phase 3 batch (re-count fresh, the plan's old "104" predates this
   session's more precise classification), the 35 custom-property rows (blocked on
   `style.css`, no phase owns that file yet), shadow colour, repeater-item colours, media-atom
   colours. Full detail in the plan's "Deferred, named, not dropped" section.

## The row backlog, classified by real per-block investigation (not guessed)

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
