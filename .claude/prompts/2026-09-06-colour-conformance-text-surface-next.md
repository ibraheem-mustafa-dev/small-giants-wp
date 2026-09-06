---
doc_type: prompt
title: Colour conformance — TEXT surface (next-largest category after FILL)
created: 2026-09-06
governs: plugins/sgs-blocks/scripts/colour-codemod/
retention: delete once consumed
---

# Session start: colour conformance — TEXT surface

Read `plugins/sgs-blocks/CLAUDE.md` in full first — the 7 non-negotiable
rules, the colour-helper registry, and `.claude/THE-MIGRATION-METHOD.md`'s
3-block-threshold rule all apply here exactly as they did on FILL.

## Where this picks up

The FILL surface closed 2026-09-06 (commit `b30c6bfc4` on `main`) — 55 rows
audited, 8 real hover gaps built, 3 preset-to-gradient upgrades, the rest
excluded with a proven reason each. **TEXT is now the largest remaining
category** — re-run the census fresh before trusting any count below:

```
cd plugins/sgs-blocks/scripts/colour-codemod
node classify-end-shape.js
node classify-end-shape.js --list text-gradient
node classify-end-shape.js --list text-gradient-needs-bg-layer
node classify-end-shape.js --json
```

## Current non-conformant counts by paint surface (snapshot 2026-09-06 — re-run, don't trust this table cold)

| Surface | Shape-key(s) | Rows | Mechanism |
|---|---|---|---|
| **TEXT** | `text-gradient` + `text-gradient-needs-bg-layer` | **58** (33 + 25) | `sgs_resolve_text_colour_or_gradient()` → `sgs_text_colour_decl()` → `sgs_text_colour_gradient_fallback_rule()`, the second shape-key needs `sgs_block_background_layer_css()` FIRST |
| BORDER | `border-base-hover` | 15 | `sgs_border_states_css()` |
| FILL | `fill-custom-property-gradient` + `fill-base-hover-flat` | 22 (19 + 3) | closed except the documented exclusions — see `migrate-fill-custom-property-gradient.js`'s `KNOWN_DIFFERENT_SHAPE` |
| ICON/SVG | `svg-paint-gradient` | 1 | closed except one documented exclusion |

**TEXT is 58 rows — almost 4x BORDER, the next largest.** Do TEXT next.

## ⛔ Read this before touching a single row — the exact trap that cost real time on FILL

**Every classifier "gap" is a hypothesis, not a fact.** On the FILL surface,
roughly a THIRD of what looked like real gaps turned out to be classifier
false positives or structural impossibilities once actually read:
- `box-shadow` cannot hold a gradient — 10 rows disqualified on sight.
- Attributes whose own NAME already ends in `Hover` (`overlayColourHover`,
  `iconBackgroundHover`, `toggleLabelHoverColour`) were flagged as
  "needing their own hover" — they were already hover-only-by-design or a
  ternary-branch classifier artefact, not gaps at all.
- Several rows the census called "own-scoped-style-override" (Case C, needs
  adopting the shared helper) turned out to already be correctly wired —
  the census tag was just stale from an earlier session's fix.

**The TEXT list below has the SAME red flag already visible.** Several
`[gap: hover-state]` rows have `Hover` already in the attribute name:
`brand-strip.itemTextColourHover`, `card-grid.textColourHover`,
`post-grid.textColourHover`, `quote.textColourHover`. **Check these FIRST,
before anything else** — read the block's `edit.js` for a ternary branching
on a style/mode variable the same way `social-icons.iconBackgroundHover`
turned out to be, and check `block.json`'s `states.hover` for a
`noBaseByDesign` marker the same way `gallery.overlayColourHover` had. If
either pattern is confirmed, the fix is a `colourExemptions` entry in
`block.json` (`rule: "states"`), NOT a new hover control — see
`migrate-fill-custom-property-gradient.js`'s `KNOWN_DIFFERENT_SHAPE` map and
the block.json exemptions added to `gallery`, `social-icons`,
`pricing-table`, `cart`, `before-after`, `nav-menu`, `mega-panel`, `modal`,
`nav-drawer` this session for the exact convention to copy.

## The two TEXT shape-keys are genuinely different transforms

- **`text-gradient` (33 rows)** — the text element has no competing
  background on the same selector. Final shape: resolve
  `sgs_resolve_text_colour_or_gradient($flat, $gradient)`, emit
  `sgs_text_colour_decl($effective)`, and the MANDATORY
  `sgs_text_colour_gradient_fallback_rule($selector, $effective)` companion
  (a gradient reaches the browser as `background-clip:text`; without the
  fallback rule a non-supporting browser gets a bare `color:` holding a
  gradient string, which it silently drops).
- **`text-gradient-needs-bg-layer` (25 rows)** — the SAME element also
  paints a background (a card, a badge, a row) on the same selector, so a
  raw `background-clip:text` would clip that background to the glyph
  shapes. Precondition: call `sgs_block_background_layer_css()` FIRST to
  move the background paint onto a `::after` layer, THEN the text-gradient
  trio above on the root. Check for `::before` collisions before assuming
  `::after` is free — `sgs_border_gradient_css()` claims `::before` on many
  blocks, which is exactly why the background-layer helper defaults to
  `::after` instead.

**Do not conflate the two.** Running the wrong one on a row will either
silently do nothing (bg-layer precondition skipped, background clips the
text) or waste a `::after` layer nobody needed.

## Sub-bucket by gap type (re-derive from a fresh `--json` dump, this is descriptive not exhaustive)

- **`[gap: hover-state]`** (most of both lists) — the gradient trio is
  ALREADY wired and correct; only a hover pair is missing. **No fully-
  working TEXT+hover example currently exists anywhere in this tree to copy
  verbatim** — do not go looking for one, you will not find it (this
  session's carried-forward note claiming "already proven on
  accordion/cart/before-after" was stale; those rows are back in this same
  census list, still needing hover). Design it fresh from the STRUCTURAL
  analogy that IS proven — before-after's `handleColour` FILL-surface hover
  (this session, `sgs_custom_property_gradient_decls()` called once with a
  5th/4th hover pair) and the ICON surface's `sgs_icon_gradient_states_css()`
  (base+hover in one call). Since `sgs_resolve_text_colour_or_gradient()`
  has NO hover parameter (checked — it's a 2-arg flat/gradient resolver
  only, extending it is a legitimate option but not the only one), the
  simplest correct shape is likely: call the trio TWICE — once for resting
  on the base selector, once for the hover value wrapped in
  `sgs_hover_state_rules($selector, $decl)` (the touch-safe guard already
  used everywhere else this session) — but verify against 2-3 real rows
  before committing to this as THE shape; it may need adjusting per the
  `text-gradient` vs `text-gradient-needs-bg-layer` split above.
- **`[gap: gradient-trio+hover-state]`** — genuinely nothing built yet:
  needs the full trio (or trio+bg-layer) AND hover, from scratch. The
  bigger, riskier bucket — many of these are also flagged
  `bare-custom-property-no-gradient`/`unknown` in their `current:` tag,
  meaning read the actual render.php before assuming the shape; a few (like
  `product-search`'s foreach-over-map rows excluded on FILL) may turn out
  to be a genuinely different mechanism here too.
- **`[gap: gradient-trio]` only** — 1 row (`product-card.pickerPillTextColour`
  at last count) — gradient only, no hover needed. Check it isn't also a
  forward-attribute shape like `product-card.pickerPillBgColour` was on
  FILL (it forwards into a nested `sgs/option-picker` — check whether
  `option-picker`'s OWN `pillTextColour` already has a gradient sibling
  before building one on product-card).

## Standing rules (unchanged from FILL, still apply exactly)

- **More than 3 blocks/call-sites → build the codemod first**, per
  `.claude/THE-MIGRATION-METHOD.md`. 58 rows is well past that threshold —
  this needs `migrate-text-gradient.js` and `migrate-text-gradient-bg-layer.js`
  (or one script with a `--shape` flag), not 58 hand-edits, even dispatched
  in parallel. Build the detector/fixer, survey, hand-verify the diff on a
  handful, then apply.
- **Dispatching parallel agents worked well on FILL — reuse the pattern.**
  Group by FILE (a block with multiple TEXT rows needs ONE agent, not one
  per row), give each agent a real worked example once you have one, and
  require them to read `THE-MIGRATION-METHOD.md` + this prompt first. Route
  simple single-shape rows to Haiku, mixed/judgment rows to Sonnet, and do
  the FIRST row yourself as the worked example before dispatching — that is
  what made the FILL dispatch prompts concrete instead of hypothetical.
- **Path-scoped commits only**; re-check `git branch --show-current`
  immediately before every commit.
- **Push after every commit, not in a batch** — this tree runs 150+
  concurrent sessions. If the local checkout is dirty, push via a throwaway
  `git worktree add ../<name> origin/main`, cherry-pick (skip anything
  superseded), and expect real merge conflicts on shared files (block.json/
  edit.js) if main has moved — resolve by understanding BOTH sides, never
  by blindly taking one (the FILL push hit exactly this: main's tier-object
  migration had already removed `paddingTablet`/`paddingMobile`/etc. that
  this branch still had — the resolution was "take main's newer structure,
  keep only the genuinely new colour attributes from this branch").
- **Never `cp` a whole file between checkouts to make a one-line fix.**
- **After any block.json change:** `python scripts/sgs-update-v2.py --stage 1`
  then `python scripts/generate-attr-role-map.py`. If the DB-consistency
  pre-commit gate (F5/F6) reports a NEW ambiguous-routing violation, that is
  usually a REAL bug your change introduced (two attrs now resolving to the
  same css_property/element/state slot) — fix it via
  `scripts/attr-classification-overrides.json` (a declarative, reseed-safe
  source), never a raw DB `UPDATE`. This happened twice on FILL
  (`nav-menu.featuredBg`/`featuredColour` missing an explicit resting
  attrMap entry; `timeline`'s new hover attrs needing `css_element` +
  `css_state:"hover"` disambiguation) — both real, both fixed this way.
- **A global DB-derived artefact regenerated after a scoped block.json
  change sweeps in every concurrent session's uncommitted drift** —
  `roster.json`, `attr-role-map.json`, `css-property-classifications.json`
  all scan all 83 blocks, not just the one you touched. Check the diff
  before staging; if it touches blocks you never edited, revert
  (`git checkout -- <file>`) and use the gate's own scoped bypass instead.
  Exception: inside a throwaway PUSH worktree that only contains committed
  main + your own cherry-pick (no foreign uncommitted drift possible),
  regenerating IS safe and sometimes required — the FILL push needed a
  fresh `extract-signatures.py` run there to stop 49 new DB attrs reading as
  "rogue seeds."
- **Live-verify with real interaction, not just computed-style checks.**
  For TEXT specifically: verify the `@supports not (background-clip:text)`
  fallback actually renders a plain colour (not a dropped gradient string)
  by checking computed style in an older-engine emulation, not just the
  modern-browser happy path — the fallback rule existing in the CSS source
  doesn't prove the browser picks it correctly.
- Never force a row into a shape it doesn't cleanly match. Refuse with a
  named reason and go find the real model instead.

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | First — every session |
| `/dispatching-parallel-agents` | Once the codemod is built and the worked example is real (proven this session on FILL — give agents a REAL example, not a hypothetical one) |
| `/adversarial-council` | Before widening any codemod's scope back toward a universal auto-fix classifier |
| `/handoff` | Session close |
