---
doc_type: prompt
title: Colour conformance — group by paint target, one POC per group
created: 2026-09-06
updated: 2026-09-06 (third session) — ICON/SVG surface CLOSED and pushed to
  main; a real 2-state hover-gradient helper gap found and fixed
  (sgs_custom_property_gradient_decls() now folds hover into one call); the
  FILL surface's real internal shape breakdown worked out (5 distinct
  cases, not the 2 the census's raw shape-keys suggest) and ready to
  execute next session. See "Session state" and "FILL surface — the real
  plan" below, which supersede the "Groups still open" §1/§2 entries and
  the old Correction 4 ICON scope note. Per D101, nothing below is deleted,
  only superseded — read "Session state" first, it tells you what's
  already done.
governs: plugins/sgs-blocks/scripts/colour-codemod/
supersedes: 2026-09-06-colour-conformance-end-shape-method.md (consumed the
  night this doc was first written — svg-paint-gradient CLOSED at the time,
  classifier hardened, deleted in the same commit as this file)
retention: delete once consumed
---

# Session start: colour conformance, paint-target grouping

Read `CLAUDE.md` in full, then this prompt in full, before touching any code.

## Session state as of 2026-09-06 (read this first)

**ICON/SVG surface is CLOSED and on `main`** (commits `548cdcc31` through
`5bcaef38e`, all pushed). Real bugs fixed: `notice-banner` (dashicon/emoji
gradient selector didn't branch on source — the actual live bug), `icon-list`
(per-item colour+gradient+hover added, since list items can each have a
different icon source), `trust-bar` (hover-gradient attribute never existed).
`button` migrated for consistency (also fixed a real touch-guard bug — its
hover rule bypassed `sgs_hover_state_rules()`). `cart`/`accordion-item`/
`before-after` swapped to the shared composer for consistency (no bug).
Deliberately NOT touched: `business-info` (already correct, ancestor+suffix
hover shape — migrating it would be pure regression risk for zero gain),
`google-reviews`/`star-rating` (fixed SVG shape-fill, no `iconSource`
concept — see FILL surface Case D below, these two also got miscategorised
into the FILL census). New shared helper: `sgs_icon_gradient_states_css()`
(`includes/helpers-svg-gradient.php`) — resolves BOTH states in one call,
supports both hover-trigger shapes (self-hover and ancestor+suffix).

**A second shared-helper gap was found and fixed the same way:**
`sgs_custom_property_gradient_decls()` (`includes/helpers-tokens.php`) only
ever took one state per call — callers needing hover had to call it twice
with a `-hover`-suffixed var name (proven pattern: `social-icons`,
`option-picker`). Unlike the icon helper, there was no structural reason for
this (no unique-id/defs-injection side effect) — extended with 2 optional
trailing params (`$hover_flat`, `$hover_gradient`), fully backward
compatible, verified via isolated harness. Pushed to `main` (`5bcaef38e`).
**This directly changes the FILL surface plan below — read it before
assuming the old Correction-era framing still applies.**

**Live-verification method proven this session, use it again:** a throwaway
worktree off `origin/main` (`git worktree add ../<name> origin/main`),
cherry-pick just the commits you need (skip anything superseded — check
`grep -c "function <name>"` on the target file first, several fixes were
independently duplicated by concurrent sessions this week), junction
`node_modules`, build manually (see "Manual build" below if `npm run build`
fails on someone else's unrelated debt), deploy with
`--skip-build --skip-gate-full`, create a probe page via
`wp post create <file> --post_type=page --post_status=publish --porcelain`
over SSH, verify live via Playwright (including actual `browser_hover()` on
the real element — computed-style-only checks miss selector-targeting bugs,
which is exactly how the notice-banner bug was caught), then delete the
probe page and the worktree. **Do not `cp` a whole file between checkouts
to make a one-line fix** — different branches can have diverged content
around your target line (this session accidentally reverted a concurrent
tier-object migration doing exactly that; caught by an unexpectedly large
`git diff --stat` before it was pushed, but it cost a hard reset + redo).
Always use Edit for a targeted single-line change, even under time pressure.

**Manual build (when `npm run build` fails on someone else's unrelated
debt):** run `prebuild`'s codegen steps by hand, skipping only the final
`run-gates.py --tier fast` call, then `npx wp-scripts build
--experimental-modules --webpack-copy-php` directly, then run `postbuild`'s
steps by hand. Confirmed safe/necessary twice this session — the shared
tree's fast-tier gate chain was red on unrelated blocks both times
(border-radius helper migration debt, then a `sgs/heading` stored-content
type-mismatch), never on the blocks actually being worked.

## Corrections (read first — these are standing rules now, not one-off notes)

1. **The four paint SURFACES are FILL / TEXT / BORDER / ICON.** Everything
   named below with a hyphenated key (`fill-custom-property-gradient`,
   `fill-base-hover-flat`, `text-gradient`, `text-gradient-needs-bg-layer`,
   `border-base-hover`, `svg-paint-gradient`, `per-item-loop`) is a
   `classify-end-shape.js` shape-key **inside** one of those four surfaces —
   a detection/mechanism label, not a peer surface. Do not present a
   shape-key as if it were a fifth or sixth surface alongside BORDER/ICON;
   group session scoping by the four real surfaces, sub-group by shape-key
   within one.

2. **A classifier "gap" is a hypothesis, not a fact — read the actual
   render.php before treating it as real work.** Worked example: this
   session's `svg-paint-gradient` census still shows 1 open row
   (`social-icons.iconGlyphColourHover`, gap: `hover-state`). Reading the
   actual code shows hover is fully wired — a flat custom-property route
   AND a `sgs_svg_stroke_gradient()` gradient route, both touch-guarded,
   untouched by any recent commit. The classifier can't detect hover
   coverage delivered via a separately-scoped rule rather than a same-call
   hover sibling. This is at least the second time this exact row has
   false-positived (the original version of this doc, below, already
   claimed it was fixed as a "state-counting false positive" — it wasn't;
   the census still shows it open). Don't spend a session "investigating a
   regression" here again — the row is not a functional bug, it never was.

3. **Any fix touching more than 3 blocks or call sites goes through
   `.claude/THE-MIGRATION-METHOD.md` — build the codemod, don't hand-edit
   render.php files one at a time.** Worked example, the same night this
   correction was written: the fix that migrated `cart`, `accordion-item`,
   and `before-after` onto `sgs_icon_gradient_css()` was a hand-edit that
   only touched each block's *hover* state — base state was left on the old
   `sgs_svg_stroke_gradient()` call in all three, undetected until the next
   session's fresh survey. A codemod run in one pass treats base+hover as
   one shape and cannot silently do half the job on 3 separate files. This
   mirrors D542 (`.claude/plans/phase-colour-conformance.md` S-5, S-8) —
   this doc's own methodology was inconsistent with that decision until now.

4. **ICON/SVG surface — corrected scope after ground-truth verification**
   (supersedes the "Not yet rolled out" list below): of the ~10 blocks
   named as pending `sgs_icon_gradient_css()` adoption, only **icon-list**
   and **notice-banner** have a real functional bug (all 4 `IconPicker`
   sources selectable including dashicon/emoji, and their render.php
   genuinely renders `<span>` markup that the old SVG-targeted call can't
   paint). The rest are either lucide/wp-icon-only in practice (no
   functional bug, a swap is pure convention) or have no selectable icon
   source at all:
   - **Real bug, fix first:** `icon-list`, `notice-banner`.
   - **Lucide-only, hover already migrated, base still stale (last night's
     hand-edit gap — see Correction 3):** `cart`, `accordion-item`,
     `before-after`.
   - **Lucide-only or fixed-glyph, no functional bug, convention swap
     only:** `social-icons` (both states still old — do this one per Bean's
     direction, to match the shared convention), `trust-bar`, `button`,
     `business-info`.
   - **No `iconSource` concept at all — correct mechanism already, do not
     touch:** `google-reviews`, `star-rating` (fixed inline SVG shape-fill,
     not an icon-source case).
   - **Known gap, not a fix target:** `social-icons`'s `custom` (uploaded
     image) icon platform renders as `<img>` — neither the old nor new
     mechanism can paint it, base or hover. Record, don't attempt.

## The method (original, still correct)

Group the remaining rows by what they paint — background, text, icon,
border — not by block. Each group already has a proven shared helper (or a
close variant of one). Fix one row per group by hand, confirm the pattern,
then either run a codemod (mandatory past 3 blocks/call-sites — Correction
3) or hand-fix the rest if the group is genuinely 1-3 rows. Do not build a
new mechanism before checking whether one already exists for that paint
target: `plugins/sgs-blocks/CLAUDE.md`'s "Colour EMISSION helpers" and
"Known precedent-function registry" sections list every one built so far.

## Trust the classifier now, but verify its output before acting on it

`classify-end-shape.js` had four real bugs fixed the night this doc was
first written — a bound-variable indirection miss (twice), a per-item-loop
check with no causal scoping, and a complete blind spot for cross-block
Block Context delegation. All four are fixed and pushed. The tool is
reliable for the first time — but "reliable" means "correctly reports what
the code does," not "immune to a fifth undiscovered bug." **See Correction
2**: the social-icons hover row is very likely exactly that fifth bug,
still unfixed as of this update. Read the actual render.php before trusting
any row's classification.

Re-run the census fresh — do not reuse any counts in this doc, which are a
snapshot the moment it was written:

```
cd plugins/sgs-blocks/scripts/colour-codemod
node classify-end-shape.js
node classify-end-shape.js --list <shape-key>
node classify-end-shape.js --json
```

## FILL surface — the real plan (worked out 2026-09-06, supersedes §1/§2 below)

⛔ **Do not run `migrate-fill-custom-property-gradient.js` blind, and do not
treat `fill-base-hover-flat` as one uniform shape.** Both census buckets
(36 + 21 = 57 rows total, re-run the census — these are a snapshot) contain
**5 genuinely different cases** — confirmed by reading the census's own
`current:` annotations plus direct reads of the two anomalous rows. Per-row
census output (re-run `--list fill-custom-property-gradient` /
`--list fill-base-hover-flat` for the live list):

- **Case A+B — bare-or-incomplete custom property, needs gradient and/or
  hover added (~26 rows, MERGED into one operation this session — see
  "Session state" above).** These rows currently show `(current: unknown,
  incomplete)` or `(current: bare-custom-property-no-gradient, incomplete)`
  with gap `gradient-trio` (needs gradient only) or `gradient-trio+hover-
  state` (needs gradient AND hover). Since
  `sgs_custom_property_gradient_decls()` now takes an optional hover pair in
  ONE call, this is a single mechanical transform regardless of which gap a
  row has — extend `migrate-fill-custom-property-gradient.js`'s
  `TARGET_ROWS` to cover them. ⚠ `business-info.linkHoverBackgroundImage`'s
  entry is STALE — renamed to `attributionHoverColour`/
  `attributionHoverColourFallback` on 2026-09-05 (D643) — fix or drop it
  before trusting the negative control it was meant to prove. Rows seen this
  session (re-verify, may have shifted): `accordion.headerBackground`,
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
  `iconCircleBackground`, `whatsapp-cta.backgroundColour`, plus most of
  `fill-base-hover-flat`'s rows tagged `(current: fill-custom-property-
  gradient)` in its own list (they already have gradient, just need hover
  added via the same call) — `before-after.dividerColour`/`handleColour`,
  `form.progressBarColour`, `gallery.overlayColourHover`,
  `modal.overlayColour`, `social-icons.iconBackgroundHover`,
  `tabs.panelBgColour`, `timeline.connectorColour`/`connectorFillColour`.

- **Case C — hand-rolled scoped CSS, needs migrating onto the shared helper
  (~9 rows, census-tagged `(current: own-scoped-style-override)`).**
  `before-after.labelBackgroundColour`, `cart.badgeColour`/`panelBg`,
  `form.submitBackground`, `label.backgroundColour`,
  `modal.triggerBackground`/`modalBackground`, `nav-menu.indicatorColour`,
  `pricing-table.toggleLabelHoverColour`. These already emit a WORKING
  scoped `<style>` rule directly, no custom-property mechanism involved —
  replacing it with `sgs_fill_states_css()` is a genuine helper-ADOPTION
  migration (delete hand-rolled CSS, replace with the shared call), a
  different transform shape from Case A+B. Hand-verify 2-3 first to confirm
  the exact selector/attribute names before deciding whether a codemod is
  worth building for the rest (per THE-MIGRATION-METHOD's 3-block
  threshold — these are 9 blocks, so a codemod is warranted, but the shape
  needs proving on a couple first since "own-scoped-style-override" is
  vague enough to hide real per-block variation).

- **Case D — MISCLASSIFIED, exclude from FILL entirely (2 rows):**
  `star-rating.starColour`/`emptyColour`. Verified live in code
  (`star-rating/render.php`) — these paint an inline SVG's `fill` via
  `sgs_colour_value()` with their own gradient-attribute siblings, exactly
  the same shape `google-reviews` already handles correctly via
  `sgs_svg_stroke_gradient(..., 'fill')`. This is an ICON/SVG-surface row,
  not a FILL(background) row — the census's shape-key bucketing is wrong
  for these two specifically. Route them to the icon-surface work instead
  (small, separate follow-up, mechanism already exists) — do NOT run the
  FILL codemod on them.

- **Case E — attribute gap on an already-correct helper (1 row):**
  `product-card.ctaColourBackground`. Verified in code — already calls
  `sgs_button_element_style_css()` (which genuinely supports fill gradient,
  per the precedent registry) at two call sites (render.php:591, :702). The
  census's "missing gradient" finding is almost certainly a missing
  `ctaColourBackgroundGradient` attribute DECLARATION in block.json, not a
  missing mechanism — check block.json first before assuming a fresh build
  is needed.

**Recommended order:** Case D (5 min, immediate close) → Case E (5 min,
check-then-maybe-one-line-fix) → Case A+B (the bulk, one codemod extension)
→ Case C last (hand-verify first, codemod only if the pattern holds across
2-3 real reads).

## Groups still open, ranked by expected ease (counts are a snapshot — re-run)

**3. TEXT surface — `text-gradient` (~33 rows).** Many already have the
full `sgs_resolve_text_colour_or_gradient()` trio and need only a hover
state (the `[gap: hover-state]` rows) — the exact shape already proven on
`accordion`/`cart`/`before-after`'s text rows, copy that pattern directly.
The rest genuinely need the trio built from scratch —
`breadcrumbs.currentColour` is a worked POC already on `main`.

**4. TEXT surface — `text-gradient-needs-bg-layer` (~25 rows) — the
precondition helper already exists, this is not a from-scratch design
problem.** `sgs_block_background_layer_css()` moves a background to its own
`::after` layer so `background-clip:text` doesn't also clip it. Confirm no
block already uses `::before`/`::after` for something else at the same
layer before applying it (`sgs_border_gradient_css()` claims `::before` on
many blocks — that's the one documented collision risk, and it's exactly
why the background-layer helper uses `::after` instead).

**5. BORDER surface — `border-base-hover` (15 rows) —
`sgs_border_states_css()`, watch for `::before` collisions.** A gradient
border uses a masked `::before` ring construct. Any block that already owns
`::before` for something else needs that checked first. Single mechanism,
fully self-contained — a good standalone session unit.

**6. ICON surface — CLOSED 2026-09-06, on `main`.** See "Session state" at
the top of this doc for exactly what shipped. Do not re-open this surface
without a fresh census showing new rows — it was fully worked through this
session, including the two shared-helper gaps that made the work possible
(`sgs_icon_gradient_states_css()`, and `sgs_custom_property_gradient_decls()`'s
new optional hover pair, which also unblocks the FILL surface — see that
section above).

**7. `per-item-loop` — check current count, was 2 rows
(`gallery.captionBgColour`, `trust-bar.badgeImageShadowColour`), may now be
0 — too small for a codemod either way, just fix by hand if any remain.

## Exceptions

A row that doesn't fit its group's shared helper cleanly gets its own
variant, found the same way `sgs_icon_gradient_css()` was found: read what
the row actually does, don't force it into the group's default shape.
Expect this for: an attribute with three real states instead of two (base +
hover + something else), an attribute whose gradient sibling maps to a
different mechanism than its own base attribute (check the DB `css_property`
of BOTH the base and the `Gradient` sibling, not just one), or a block whose
markup genuinely has no element for the mechanism to target. Confirm with a
direct DB query or a direct read of render.php before designing the
exception — never from the row's name alone, though a name mismatch (a
"fill" attribute needing a text mechanism, an "icon" attribute needing the
text-gradient trio) is a strong first signal something is wrong.

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
- **New (Correction 3): more than 3 blocks/call-sites in scope means build
  the codemod first, per `.claude/THE-MIGRATION-METHOD.md`. Do not dispatch
  per-block hand-edits or subagents to hand-edit render.php files past that
  threshold — that's exactly the failure mode that left 3 blocks half-fixed
  the first time this surface was touched.**

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | First — every session |
| `/dispatching-parallel-agents` | Once 2+ rows have confirmed, distinct, disjoint-file fixes ready **and the fix genuinely doesn't cross the 3-block codemod threshold** |
| `/adversarial-council` | Before widening any codemod's scope back toward a universal auto-fix classifier |
| `/handoff` | Session close |
