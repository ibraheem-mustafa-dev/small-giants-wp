---
doc_type: prompt
title: Colour conformance — FILL surface next
created: 2026-09-06
updated: 2026-09-06 (fifth pass) — CONSOLIDATED, not appended (same
  discipline as the fourth pass: retire resolved content rather than accrete
  a "session state" section on top of it — this doc's frontmatter says
  `retention: delete once consumed`; git history is the record). Cases D and
  E are now CLOSED and pushed to `main` (`420057b68`); Case A turned out to
  be EMPTY once two real classifier-gap families were found and excluded —
  both facts are folded into the plan below rather than left as a separate
  changelog.
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

## FILL surface — status (2026-09-06)

**Cases D and E are CLOSED, verified live, on `main` (`420057b68`).**

- **Case D** — `star-rating.starColour`/`emptyColour` excluded from the FILL
  codemod. Confirmed in code: these already paint an inline SVG `fill` via
  `sgs_svg_stroke_gradient(..., 'fill')` — the correct ICON/SVG shape, not
  FILL. The census's bucketing was wrong for these two; no code change
  needed, just the exclusion.
- **Case E** — `product-card.ctaColourBackground` was already painted by
  `sgs_button_element_style_css()`, which silently reads
  `ctaColourBackground(Hover)Gradient` — neither was ever DECLARED in
  block.json. Added both (`css:background-image`, confirmed against
  `sgs/button`'s own DB row + `sgs_background_paint_decl()`), wired the
  edit.js gradient fields. Live-verified: a real gradient now renders on the
  CTA's `::after` layer on the canary.
- **Bonus find, same session:** `product-card.pickerPillBgColour` forwards
  into a nested `sgs/option-picker`, which already carries a full
  `pillBgColourGradient` mechanism (since 2026-09-05) — product-card just
  never declared or forwarded the sibling. Added + wired (code-verified;
  render requires an actual option-picker instance with items to
  live-render, not done this session — low risk, pure array-key addition
  onto an already-shipped mechanism).

**Case A turned out to be EMPTY.** Extending
`migrate-fill-custom-property-gradient.js`'s `TARGET_ROWS` with every
"gradient-only, no hover needed" row and running `--survey`/`--check`
revealed two real classifier-gap families hiding in what looked like ~13
fixable rows — after excluding them, ZERO rows remained for this exact
mechanical shape:

- **The whole `*ShadowColour` family (9 rows) is a `classify-end-shape.js`
  misclassification.** `box-shadow` cannot legally hold a CSS gradient
  (`box-shadow: linear-gradient(...)` is invalid CSS) — confirmed against
  `survey.js`'s own independent gradient-extensibility trace, which agrees.
  Affected: `before-after.boxShadowColour`, `brand-strip.tileShadowColour`,
  `button.boxShadowColour`, `card-grid.cardShadowColour`,
  `cta-section.shadowColour`, `media.boxShadowColour` (also atom-layer
  owned), `quote.boxShadowColour`, `team-member.cardShadowColour`,
  `trust-bar.iconCircleShadowColour`/`badgeImageShadowColour`. **This is a
  real bug in `classify-end-shape.js` itself** (it doesn't check whether the
  underlying CSS property can mechanically hold a gradient before flagging
  `needsGradient`) — not fixed this session; flagged as a detector fix, not
  per-row work.
- `business-info.attributionHoverColour` and `timeline.dateColour` were
  also miscategorised (the former IS the gradient value itself, D643; the
  latter is TEXT mechanism, not FILL) — both documented in
  `KNOWN_DIFFERENT_SHAPE` rather than force-fixed.
- `cta-section.backgroundColour` is a slug-derivation shape
  (`sanitize_html_class()` before any colour resolution) — same family as
  the already-excluded `mega-panel.accentBackgroundImage`/
  `nav-menu.featuredBg`, not this script's shape.

`--check` now passes clean on this codemod's narrowed, honest scope.
**Next session: fix `classify-end-shape.js`'s box-shadow-gradient
false-positive** (a real, scoped detector bug) before trusting its FILL
counts again.

**Still open — Case B (needs BOTH gradient AND hover added, ~13 rows) and
the "already has gradient, just needs hover" sub-bucket (~9 rows).** Neither
was attempted this session. Both require a genuinely NEW codemod capability
this repo doesn't have yet: adding a *second UI state* to an existing
single-state `SgsColourPanel` row (new attrMap hover section, new edit.js
state-array entry, new render.php hover read + emit, new style.css hover
selector) — a materially bigger transform than "add a Gradient sibling to
an existing single-state row", which is all `migrate-fill-custom-property-
gradient.js` does today. **Re-run `classify-end-shape.js` fresh, hand-verify
2-3 real rows of each remaining sub-bucket before designing this shape** —
don't assume the "one call now takes an optional hover pair" framing from
this doc's earlier draft makes it mechanically equivalent to Case A; it
isn't, because the UI/attrMap/render wiring for a row that has never had a
hover state at all is a different shape from a row that already has one.

- **Case C — hand-rolled scoped CSS, needs migrating onto the shared helper
  (~9 rows, tagged `(current: own-scoped-style-override)`).**
  `before-after.labelBackgroundColour`, `cart.badgeColour`/`panelBg`,
  `form.submitBackground`, `label.backgroundColour`,
  `modal.triggerBackground`/`modalBackground`, `nav-menu.indicatorColour`,
  `pricing-table.toggleLabelHoverColour`. These already emit a WORKING
  scoped `<style>` rule directly — no custom-property mechanism involved.
  Replacing it with `sgs_fill_states_css()` is a helper-ADOPTION migration
  (delete hand-rolled CSS, call the shared helper instead), a different
  transform shape from Case A/B. Hand-verify 2-3 first — "own-scoped-style-
  override" is vague enough to hide real per-block variation — before
  deciding a codemod is worth building for the rest.

**Order for next session:** re-run the census fresh → fix
`classify-end-shape.js`'s box-shadow false-positive (quick, scoped) → hand-
verify 2-3 Case B rows and design the hover-injection shape → Case C last.

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
- **A global DB-derived artifact (`roster.json`, `attr-role-map.json`,
  `css-property-classifications.json`) regenerated after a scoped
  block.json change sweeps in EVERY concurrent session's uncommitted
  block.json drift, not just yours** — these scripts scan all 83 blocks on
  disk, not just the one you touched. Check the diff before staging one of
  these files; if it touches blocks you never edited, revert it
  (`git checkout -- <file>`, safe here because it's a pure regen from HEAD,
  not hand-authored content) and use the gate's own scoped bypass
  (`SGS_INSPECTOR_GATE_SKIP=1 SGS_INSPECTOR_GATE_REASON="..."`) instead of
  committing the sweep.

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | First — every session |
| `/dispatching-parallel-agents` | Once 2+ rows have confirmed, distinct, disjoint-file fixes ready **and the fix genuinely doesn't cross the 3-block codemod threshold** |
| `/adversarial-council` | Before widening any codemod's scope back toward a universal auto-fix classifier |
| `/handoff` | Session close |
