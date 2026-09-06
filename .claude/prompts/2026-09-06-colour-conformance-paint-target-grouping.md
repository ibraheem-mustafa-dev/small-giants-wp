---
doc_type: prompt
title: Colour conformance — FILL surface next
created: 2026-09-06
updated: 2026-09-06 (fourth pass) — CONSOLIDATED, not appended. The
  previous three passes on this same file kept appending "Corrections" and
  "Session state" sections instead of retiring resolved content, which is
  this doc's own established convention (its frontmatter says `retention:
  delete once consumed`, and its own predecessor — end-shape-method.md —
  was genuinely deleted, not accreted, when superseded). That produced a
  broken numbered list, a dangling cross-reference, and three redundant
  descriptions of the same closed ICON work at different staleness levels.
  Root cause: I was applying this project's D101 rule ("never subtract from
  a handoff doc") to a doc type it doesn't govern — D101 protects
  STOP-CATALOGUE.md-style PERMANENT structural-defence documents, not an
  explicitly ephemeral session prompt. Fully-resolved content (the ICON
  surface's original plan, the classifier bug fixes, the taxonomy
  correction) is dropped here — it did its job and is in git history
  (`git log -- .claude/prompts/2026-09-06-colour-conformance-paint-target-grouping.md`)
  if anyone needs the reasoning trail. Only what's still LIVE is kept.
governs: plugins/sgs-blocks/scripts/colour-codemod/
retention: delete once consumed
---

# Session start: colour conformance — FILL surface

Read `plugins/sgs-blocks/CLAUDE.md` in full first — it carries the 7
non-negotiable rules, the current colour-helper registry, and
`THE-MIGRATION-METHOD.md`'s 3-block-threshold rule, all of which this
session depends on.

## What's already done (ICON/SVG surface — closed, on `main`)

Fixed and pushed (commits `548cdcc31` → `5bcaef38e`): `notice-banner`
(real bug — dashicon/emoji gradient selector didn't branch on icon source),
`icon-list` (per-item colour+gradient+hover added — list items can each
carry a different icon source), `trust-bar` (hover-gradient attribute never
existed). `button` migrated onto the shared composer (also fixed a real
touch-guard bug). `cart`/`accordion-item`/`before-after` swapped for
consistency (no bug there). Deliberately untouched: `business-info`
(already correct, different but valid hover shape), `google-reviews`/
`star-rating` (fixed SVG shape-fill, no `iconSource` concept — see Case D
below, these two also turned up miscategorised in the FILL census).

**Two shared-helper gaps found and fixed this way — reuse both, they're
now the standard:**
- `sgs_icon_gradient_states_css()` (`includes/helpers-svg-gradient.php`) —
  resolves an icon's base+hover gradient in ONE call; supports both
  hover-trigger shapes in use across the framework (self-hover, and
  ancestor+suffix for a block whose icon sits inside a distinct trigger
  like `sgs/button`'s whole button).
- `sgs_custom_property_gradient_decls()` (`includes/helpers-tokens.php`) —
  extended with 2 optional trailing params (`$hover_flat`,
  `$hover_gradient`) so ONE call now emits base+hover custom-property
  declarations, matching the naming convention `social-icons`/
  `option-picker` already established by calling it twice by hand. Fully
  backward compatible. **This is the helper the FILL surface plan below
  depends on.**

## Method (still correct, keep applying it)

Group remaining rows by what they paint — FILL / TEXT / BORDER (ICON is
done). Note: `classify-end-shape.js`'s shape-keys
(`fill-custom-property-gradient`, `text-gradient`, `border-base-hover`,
etc.) are sub-categories WITHIN a surface, not surfaces themselves — don't
present one as a peer of FILL/TEXT/BORDER. A classifier "gap" is a
hypothesis, not a fact — read the actual `render.php` before treating it as
real work (the classifier has had real bugs before; it's reliable now but
"reliable" doesn't mean immune to a fifth undiscovered one). Check
`plugins/sgs-blocks/CLAUDE.md`'s "Colour EMISSION helpers" and "Known
precedent-function registry" before building any new mechanism — one
almost always already exists.

**Re-run the census fresh — every count below is a snapshot:**

```
cd plugins/sgs-blocks/scripts/colour-codemod
node classify-end-shape.js
node classify-end-shape.js --list <shape-key>
node classify-end-shape.js --json
```

## FILL surface — the plan (worked out 2026-09-06)

⛔ **Do not run `migrate-fill-custom-property-gradient.js` blind, and do not
treat either census bucket as one uniform shape.** The two shape-keys
(`fill-custom-property-gradient` 36 rows + `fill-base-hover-flat` 21 rows,
57 total — re-run, this is a snapshot) actually contain **5 genuinely
different cases**, confirmed by reading the census's own `current:`
annotations plus direct code reads of the two anomalous rows:

- **Case A+B — bare-or-incomplete custom property, needs gradient and/or
  hover added (~26 rows).** Tagged `(current: unknown, incomplete)` or
  `(current: bare-custom-property-no-gradient, incomplete)`, gap
  `gradient-trio` (gradient only) or `gradient-trio+hover-state` (both).
  Since `sgs_custom_property_gradient_decls()` now takes an optional hover
  pair in ONE call, this is a single mechanical transform regardless of
  which gap a row has — extend `migrate-fill-custom-property-gradient.js`'s
  `TARGET_ROWS`. ⚠ Its existing `business-info.linkHoverBackgroundImage`
  entry is STALE (renamed to `attributionHoverColour`/
  `attributionHoverColourFallback` on 2026-09-05, D643) — fix or drop it
  before trusting the negative control it was meant to prove. Rows seen
  this session (re-verify): `accordion.headerBackground`,
  `audio.accentColour`/`spectrumColour`, `before-after.boxShadowColour`,
  `brand-strip.tileShadowColour`, `business-info.attributionHoverColour`,
  `button.boxShadowColour`, `card-grid.cardShadowColour`,
  `cta-section.backgroundColour`/`shadowColour`, `gallery.captionBgColour`,
  `info-box.shadowHoverColour`, `media.boxShadowColour`,
  `mega-aside.asideBg`, `mega-panel.panelBg`/`iconBackground`/
  `accentBackgroundImage`, `multi-button.childBtnBackground`,
  `nav-drawer.drawerBg`, `nav-menu.featuredBg`/`submenuBg`,
  `post-grid.categoryBadgeBgColour`, `product-card.tagBackgroundColour`/
  `pickerPillBgColour`, `product-search.listboxBackgroundColour`/
  `resultHoverBackgroundColour`/`matchHighlightColour`,
  `quote.boxShadowColour`, `team-member.cardShadowColour`,
  `testimonial.shadowHoverColour`, `timeline.rowStripeColourA`/`B`,
  `trust-bar.iconCircleShadowColour`/`badgeImageShadowColour`/
  `iconCircleBackground`, `whatsapp-cta.backgroundColour` — plus the
  `fill-base-hover-flat` rows tagged `(current: fill-custom-property-
  gradient)` (already have gradient, just need hover added via the same
  call): `before-after.dividerColour`/`handleColour`,
  `form.progressBarColour`, `gallery.overlayColourHover`,
  `modal.overlayColour`, `social-icons.iconBackgroundHover`,
  `tabs.panelBgColour`, `timeline.connectorColour`/`connectorFillColour`.

- **Case C — hand-rolled scoped CSS, needs migrating onto the shared helper
  (~9 rows, tagged `(current: own-scoped-style-override)`).**
  `before-after.labelBackgroundColour`, `cart.badgeColour`/`panelBg`,
  `form.submitBackground`, `label.backgroundColour`,
  `modal.triggerBackground`/`modalBackground`, `nav-menu.indicatorColour`,
  `pricing-table.toggleLabelHoverColour`. These already emit a WORKING
  scoped `<style>` rule directly — no custom-property mechanism involved.
  Replacing it with `sgs_fill_states_css()` is a helper-ADOPTION migration
  (delete hand-rolled CSS, call the shared helper instead), a different
  transform shape from Case A+B. Hand-verify 2-3 first — "own-scoped-style-
  override" is vague enough to hide real per-block variation — before
  deciding a codemod is worth building for the rest.

- **Case D — MISCLASSIFIED, exclude from FILL entirely (2 rows):**
  `star-rating.starColour`/`emptyColour`. Verified in code — these paint an
  inline SVG's `fill` via `sgs_colour_value()` with their own gradient
  siblings, the exact shape `google-reviews` already handles correctly via
  `sgs_svg_stroke_gradient(..., 'fill')`. This is an ICON/SVG row, not FILL
  — the census's bucketing is wrong for these two. Route to the icon-surface
  work (mechanism already exists), don't run the FILL codemod on them.

- **Case E — attribute gap on an already-correct helper (1 row):**
  `product-card.ctaColourBackground`. Already calls
  `sgs_button_element_style_css()` (genuinely supports fill gradient) at
  two call sites (`render.php:591`, `:702`). The "missing gradient" finding
  is almost certainly a missing `ctaColourBackgroundGradient` attribute
  DECLARATION in `block.json`, not a missing mechanism — check block.json
  first.

**Order:** Case D (5 min, immediate close) → Case E (5 min, check-then-
maybe-one-line-fix) → Case A+B (the bulk, one codemod extension) → Case C
last (hand-verify first, codemod only if the pattern holds across 2-3 real
reads).

## Also open (not started, lower priority than FILL)

- **TEXT — `text-gradient` (~33 rows).** Many already have the full
  `sgs_resolve_text_colour_or_gradient()` trio and need only a hover state
  — the exact shape already proven on `accordion`/`cart`/`before-after`'s
  text rows. The rest need the trio built from scratch —
  `breadcrumbs.currentColour` is a worked POC already on `main`.
- **TEXT — `text-gradient-needs-bg-layer` (~25 rows).** The precondition
  helper (`sgs_block_background_layer_css()`, moves a background to
  `::after` so `background-clip:text` doesn't clip it) already exists.
  Check for `::before`/`::after` collisions first — `sgs_border_gradient_css()`
  claims `::before` on many blocks, which is exactly why the background-
  layer helper uses `::after`.
- **BORDER — `border-base-hover` (15 rows).** `sgs_border_states_css()`,
  watch for `::before` collisions (a gradient border uses a masked
  `::before` ring). Single mechanism, fully self-contained — good
  standalone session unit.
- **`per-item-loop`** — check current count (was 2:
  `gallery.captionBgColour`, `trust-bar.badgeImageShadowColour`), may be 0
  now — too small for a codemod either way.

## Exceptions

A row that doesn't fit its group's shared helper cleanly gets its own
variant — read what it actually does, don't force the default shape.
Expect this for: an attribute with 3 real states instead of 2, a gradient
sibling mapping to a different mechanism than its own base attribute (check
the DB `css_property` of BOTH, not just one), or a block whose markup has
no element for the mechanism to target. Confirm via a direct DB query or
render.php read — never from the row's name alone, though a name mismatch
is a strong first signal something's wrong.

## Standing rules

- **More than 3 blocks/call-sites → build the codemod first**, per
  `.claude/THE-MIGRATION-METHOD.md`. Don't hand-edit render.php files past
  that threshold — a hand-edit touching cart/accordion-item/before-after
  earlier this week only fixed each block's hover state and silently left
  base state stale in all three, undetected until the next session's fresh
  survey. A codemod run in one pass can't do that.
- Path-scoped commits only; re-check `git branch --show-current`
  immediately before every commit.
- Push after every commit, not in a batch — this tree runs 150+ concurrent
  sessions. If the local checkout is dirty, push via a throwaway
  `git worktree add ../<name> origin/main`, cherry-pick (skip anything
  superseded — `grep -c "function <name>"` the target file first, several
  fixes get independently duplicated by concurrent sessions), junction
  `plugins/sgs-blocks/node_modules` (`New-Item -ItemType Junction`), deploy
  with `--skip-build --skip-gate-full` if needed, then
  `git worktree remove --force`.
- **Never `cp` a whole file between checkouts to make a one-line fix** —
  diverged branches can hold genuinely different content around your
  target line. Always use a targeted single-line edit, even under time
  pressure. (Cost a hard-reset-and-redo this week when skipped.)
- **Manual build when `npm run build` fails on someone else's unrelated
  debt:** run `prebuild`'s codegen steps by hand, skip only the final
  `run-gates.py --tier fast` call, run
  `npx wp-scripts build --experimental-modules --webpack-copy-php` directly,
  then run `postbuild`'s steps by hand.
- A gate blocked by genuinely unrelated concurrent-session debt needs BOTH
  bypasses together: `[gates-ok:<reason>]` in the commit message AND
  `SGS_F5_SKIP=<script> SGS_F5_SKIP_REASON="..."` as an env var on the SAME
  commit invocation. Verify the finding truly doesn't mention your files
  before bypassing either.
- **Live-verify with real interaction, not just computed-style checks** —
  use Playwright's `browser_hover()` on the actual element for any hover
  claim. A computed-style-only check misses selector-targeting bugs (this
  is exactly how the notice-banner icon-gradient bug was caught this week).
- After any block.json change: `python scripts/sgs-update-v2.py --stage 1`
  then `python scripts/generate-attr-role-map.py`.
- Never force a row into a shape it doesn't cleanly match. Refuse with a
  named reason and go find the real model instead.

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | First — every session |
| `/dispatching-parallel-agents` | Once 2+ rows have confirmed, distinct, disjoint-file fixes ready **and the fix genuinely doesn't cross the 3-block codemod threshold** |
| `/adversarial-council` | Before widening any codemod's scope back toward a universal auto-fix classifier |
| `/handoff` | Session close |
