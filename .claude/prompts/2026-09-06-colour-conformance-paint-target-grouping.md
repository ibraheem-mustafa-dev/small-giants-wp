---
doc_type: prompt
title: Colour conformance — FILL surface next
created: 2026-09-06
updated: 2026-09-06 (sixth pass) — CONSOLIDATED, not appended (same
  discipline as every prior pass: retire resolved content rather than
  accrete a "session state" section on top of it — this doc's frontmatter
  says `retention: delete once consumed`; git history is the record). **The
  FILL surface is now CLOSED except Case C** — every one of the 51 rows
  remaining after Case D/E landed has been read by hand and classified with
  a proven reason (4 were real gaps, now built and live-verified; the other
  47 are documented exclusions — classifier bugs, structural impossibilities,
  or genuinely non-interactive elements). Next session picks up Case C or
  moves to TEXT/BORDER.
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

## FILL surface — CLOSED except Case C (2026-09-06)

**Cases D and E are CLOSED, verified live, on `main` (`420057b68`).**

- **Case D** — `star-rating.starColour`/`emptyColour` excluded from the FILL
  codemod. These already paint an inline SVG `fill` via
  `sgs_svg_stroke_gradient(..., 'fill')` — the correct ICON/SVG shape, not
  FILL.
- **Case E** — `product-card.ctaColourBackground` was already painted by
  `sgs_button_element_style_css()`, which silently reads
  `ctaColourBackground(Hover)Gradient` — neither was ever DECLARED in
  block.json. Added both, wired edit.js. Live-verified: a real gradient
  renders on the CTA's `::after` layer on the canary.
- **Bonus find:** `product-card.pickerPillBgColour` forwards into a nested
  `sgs/option-picker`, which already carries a full `pillBgColourGradient`
  mechanism (since 2026-09-05) — product-card never declared/forwarded the
  sibling. Added + wired.

**Case A turned out to be EMPTY** — every "gradient-only, no hover" row was
either already fixed, or a classifier/structural exclusion (see the full
audit below).

### The full audit — every one of the other 51 FILL rows read by hand

Starting from the 55 rows left after Case D/E, `migrate-fill-custom-
property-gradient.js`'s `KNOWN_DIFFERENT_SHAPE` map now documents a proven
reason for all 51 non-Case-C rows (verify with `node -e` cross-check in
that script's own header comment, or just read the map — every entry names
the exact render.php line/mechanism read). Four buckets:

1. **Real gaps — BUILT this session, live-verified, on `main`:**
   - `audio.accentColour` — the play button (`.sgs-audio__play`) already had
     a `:hover` rule (`transform: scale`), no colour change. Added
     `accentColourHover`/`accentColourHoverGradient`, scoped ONLY to the
     play button (not the seek-thumb/progress-track/glow/outline, matching
     the resting gradient's own existing scoping discipline).
   - `whatsapp-cta.backgroundColour` — the CTA button's `:hover` rule only
     animated opacity/transform. Added the full gradient+hover quad. Also
     fixed a real DB/attrMap bug found while scoping this: `labelColourGradient`
     was wrongly keyed `css:background-image` (it's a TEXT gradient via
     `background-clip:text` on a CHILD span) instead of `css:color-gradient`
     — that wrong key is exactly what made the classifier think a
     background-fill gradient sibling already existed when it didn't.
   - `multi-button.childBtnBackground` — a GROUP DEFAULT that cascades into
     child `sgs/button` instances via `--sgs-mb-btn-bg-default`. `sgs/button`'s
     own `:hover`/`background-image` fallback chains had NO rung for a group
     default at all (not even for the resting gradient). Extended
     `button/style.css`'s chains with `--sgs-mb-btn-bg-image-default` /
     `--sgs-mb-btn-bg-hover-default` / `--sgs-mb-btn-bg-hover-image-default`,
     added the 3 new multi-button attrs that feed them.
   - `before-after.handleColour` — the draggable handle's SVG icon already
     had a `:hover` stroke override; its own background never did. Extended
     the existing `sgs_custom_property_gradient_decls()` call to 5 args
     (base/gradient/hover/hoverGradient — the exact "one call now takes an
     optional hover pair" shape this doc's earlier draft anticipated), added
     a matching `:hover`/`:focus-visible` CSS rule mirroring the icon's own.

2. **Classifier false positives (3 rows) — do NOT build fake UI for these:**
   - `gallery.overlayColourHover` — genuinely hover-ONLY by design
     (block.json's own `noBaseByDesign` marker, 2026-08-15/09-05); the
     overlay only exists on hover, there is no resting state to pair it
     with. `needsHover` doesn't know about `noBaseByDesign`.
   - `social-icons.iconBackgroundHover` — edit.js branches on `colourMode`
     via a ternary; one branch already has a real 2-state row, the OTHER
     branch's OWN deliberately-hover-only row (a different display mode
     where the resting bg comes from a CSS preset class) gets concatenated
     onto it by `resolveArrayLike()`'s `ConditionalExpression` handling, so
     a block that's already fully correct in its primary mode reads as
     having a 1-state gap.
   - `pricing-table.toggleLabelHoverColour` — same hover-only-by-design
     shape as gallery's, just undeclared via `noBaseByDesign`.
   - **`classify-end-shape.js`'s `needsHover: statesCount < 2` doesn't know
     about `noBaseByDesign` or ternary-mode branches — a real, scoped
     detector bug, not fixed this session (fix the detector, not these 3
     rows, if picked up next).**

3. **Structurally impossible / wrong mechanism (18 rows) — excluded,
   documented in `KNOWN_DIFFERENT_SHAPE`:**
   - **`*ShadowColour` family (10 rows)** — `box-shadow` cannot legally hold
     a CSS gradient. `before-after.boxShadowColour`, `brand-strip.
     tileShadowColour`, `button.boxShadowColour`, `card-grid.cardShadowColour`,
     `cta-section.shadowColour`, `media.boxShadowColour` (atom-layer owned
     too), `quote.boxShadowColour`, `team-member.cardShadowColour`,
     `trust-bar.iconCircleShadowColour`/`badgeImageShadowColour`.
   - **`*ShadowHoverColour` (2 rows)** — `info-box.shadowHoverColour`,
     `testimonial.shadowHoverColour` are ALREADY the hover value of a
     box-shadow (same box-shadow-can't-gradient reason, plus already-hover
     so no second hover needed).
   - **Slug-derivation (5 rows)** — resolves to a THEME PRESET SLUG
     (`var(--wp--preset--color--{slug})`) via `sanitize_html_class()`/
     `sgs_resolve_palette_hex()`, never reaches `sgs_colour_value()`:
     `accordion.headerBackground` (via `sgs/accordion-item`'s block-context
     relay), `cta-section.backgroundColour`, `nav-menu.featuredBg`,
     `mega-panel.accentBackgroundImage`, `nav-drawer.drawerBg`.
   - **Different surface/mechanism (3 rows)** — `timeline.dateColour` (TEXT
     mechanism, wrong surface entirely), `business-info.attributionHoverColour`
     (already its own complete two-attribute mechanism, D643),
     `audio.spectrumColour` (canvas `fillStyle`, no CSS at all).
   - **`product-search`'s 3 rows** — `listboxBackgroundColour`/
     `resultHoverBackgroundColour`/`matchHighlightColour` share a
     `foreach ( $map as $prop => $val )` emission — a real 4th shape,
     needs its own script if ever picked up.

4. **Decorative / non-interactive — hovering has no product meaning
   (17 rows), confirmed by reading each element's render.php + style.css for
   an existing `:hover` rule targeting that SAME element (none found):**
   `before-after.dividerColour` (the line, not the handle — handle is fixed
   above), `form.progressBarColour`, `modal.overlayColour` (full-screen
   backdrop), `tabs.panelBgColour` (content panel, not the tab button),
   `timeline.connectorColour`/`connectorFillColour`/`rowStripeColourA`/`B`,
   `trust-bar.iconCircleBackground`, `post-grid.categoryBadgeBgColour`,
   `product-card.tagBackgroundColour`, `nav-menu.submenuBg` (the dropdown
   panel, not its items), `mega-aside.asideBg` (no `<a>`/URL anywhere),
   `mega-panel.panelBg` (same non-hoverable-panel reasoning as submenuBg).
   `mega-panel.iconBackground` sits inside an ALREADY-hoverable
   `.sgs-mega-group` card — a genuine future-enhancement candidate, not
   built this session (ambiguous product call, not a clear gap like the 4
   rows that were built — ask Bean before touching it).

**`--check` passes clean; every FILL row not in Case C now has a named,
verified disposition — nothing left to re-derive from a fresh census read.**

### Case C — the one remaining real category (~9 rows, NOT started)

Hand-rolled scoped `<style>` CSS, no custom-property mechanism at all:
`before-after.labelBackgroundColour`, `cart.badgeColour`/`panelBg`,
`form.submitBackground`, `label.backgroundColour`, `modal.triggerBackground`/
`modalBackground`, `nav-menu.indicatorColour`, `gallery.captionBgColour`
(moved OFF the custom-property mechanism 2026-09-04, shares
`.sgs-gallery__caption` with a text gradient). Adopting `sgs_fill_states_css()`
here means DELETING working hand-rolled CSS and replacing it with the shared
helper call — a different transform shape from everything above, and each
row may have real per-block variation hiding behind "own-scoped-style-
override". **Hand-verify 2-3 first before deciding a codemod is worth
building for the rest**, per THE-MIGRATION-METHOD.

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
