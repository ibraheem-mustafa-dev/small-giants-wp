---
title: "Eye Care Session C: close the 157 proven framework gaps"
project: small-giants-wp
created: 2026-10-05
status: awaiting Bean's Gate B go
governs: Session C of .claude/plans/2026-10-04-eye-care-sweep-audit-fix.md
references:
  - .claude/plans/2026-10-04-eye-care-sweep-audit-fix.md
  - .claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md
  - .claude/plans/2026-10-02-eye-care-fix-register.md
  - .claude/reports/2026-10-05-session-b/b3-catalogue.json
  - .claude/rules/block-authoring.md
---

# Eye Care Session C: close the 157 proven framework gaps

**Goal:** every framework gap Session B proved has a working control in the editor and on the front end, the
framework database and calibration know about it, and a fresh measure-only sweep shows those rows closed with no new
rows anywhere.

**Status: not started. Awaiting Bean's Gate B answer** (the brief is the Gate B artifact, 2026-10-05). The scope and
order below are written; nothing here is executed until Bean says go.

## What this session is, in one paragraph

Session B measured all 17 Eye Care surfaces, sorted the 2,373 open differences into classes, and proved which are
real framework gaps: **163 rows**, of which **3 belong to the parallel Google reviews track**, leaving **160 rows**, of which **3 are deferred to their own session** (the framework-wide spacing-priority
change, see Deferred below), leaving **157 rows in this session** over 25 blocks. Every one cites a database row or a `file::symbol` and names an existing precedent, so
no gap here needs a control designed from scratch. The work is copying eight established patterns onto the blocks
that lack them, after two fixes to the measuring route that change which rows are real.

## Scope boundary

**In scope:** 157 of the 163 confirmed F rows (`.claude/reports/2026-10-05-session-b/b2/*-verdicts.json`, `verdict: "F"`,
excluding `block: "sgs/google-reviews"`); the two route fixes R1 and R2; the serial tail that proves them.

**Not in scope, with where each lives instead:**

| Left out | Rows or items | Where it goes |
|---|---|---|
| `sgs/google-reviews` gaps and all its attribution work | 3 F rows + 8 deferred icon combos | the parallel Google reviews track |
| W rows: knock-on effects, used values, transients | 614 + 170 + 16 | close with their parent row, or are correct as measured |
| W rows in unmapped interaction states | 323 | Spec 47 FR-47-7, not started |
| T rows | 447 | Session D writes them on each surface's next run |
| U rows | 28 | Session D diagnoses |
| The 78 unmeasurable register items | 51 wait on route work | Appendix A of the sweep plan; Spec 47 §5 Residual |
| Presence, text and link writing | 8 register items | Spec 47 §3.2/§3.3, not built |

**Explicitly not done here:** no new control primitive is invented (none is needed); no client content or page-tree
values are written (that is Session D); the Spec 47 §3.2 text-read scope question stays a question for Bean.

**One in-scope exception to that last rule.** Three `sgs/social-icons` item-width rows (G6) are *not* code: the
setting already paints width and height on that element and a hardcoded `min-width: 44px` WCAG floor beats it, which
is a CLAUDE.md non-negotiable. Their fix is a `touch-target` entry in
`sites/eye-care-ward-end/build/qa/divergences.json`, precedent `D-17`…`D-30`. Writing a ledger entry is not writing a
tree value, and this session does it. Nothing else touches that file.

## Success criteria

1. For each of the 157 rows, the setting exists, appears in the block inspector, and paints on the front end.
2. `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0 (Spec 32).
3. `python plugins/sgs-blocks/scripts/run-gates.py --tier full` passes; `python plugins/sgs-blocks/scripts/check-wiring-fingerprint.py --check` passes with no new blocking gaps against its 201 baseline.
4. `python scripts/check-no-client-names.py --check` passes.
5. A reseed from clean HEAD reports the new rows, and each new setting has a non-NULL `css_property` and `css_element` **that matches the property its `render.php` or stylesheet actually emits** (not merely non-NULL).
6. A measure-only sweep shows those rows closed, with **at most 1 new row per 10 closed and every new row classed
   with its proof**, and the surfaces measured stated beside the result (see Gate C3 for why this is a cap and not a
   zero).
7. Every touched block recalibrates with no new `dead` or `noMarker` outcome for the settings added.

## Why the parallel axis is the block, not the mechanism group

The sweep plan's Session C outline says "one group per agent, in parallel". **Measured, that would collide.** Every
one of the eight groups shares at least one block with another, and two blocks are hubs:

| Block | Groups touching it | F rows |
|---|---|---|
| `sgs/social-icons` | G1, G2, G3, G4, G5, G6 | 38 |
| `sgs/buybox` | G1, G2, G3, G5, G7, G8 | 20 |
| `sgs/choice-flow-question` | G1, G2, G3 | 20 |
| `sgs/choice-flow` | G1, G2, G5 | 14 |
| `sgs/accordion-item` | G1, G2, G6 | 10 |
| the four `sgs/form-field-*` blocks | G2, G3 (both editing `form/style.css`) | 8 |

Eight group-agents would put six concurrent editors on `social-icons`'s `block.json`, `render.php` and `style.css` in
six isolated worktrees, then ask for a hand-merge of six versions of each file. The effort estimate reached the same
conclusion independently.

**So: one owner per block, applying every group's fix to that block.** The mechanism groups stay the unit of
*review* (each has one precedent and one expected shape), not the unit of dispatch.

## The eight fix groups

Rows, blocks, precedents and sample fix shapes: `.claude/reports/2026-10-05-session-b/b3-catalogue.json`; per-combo
proof in the B2 verdict files.

| Group | Rows | Blocks | The pattern it copies |
|---|---|---|---|
| **G1** spacing on an inner element | 72 | 10 | `supports.sgs.boxFamilies` + the shared box control; precedents `sgs/mega-panel::drawerCardPadding`, `sgs/google-reviews::headerGap`, `sgs/form::submitPadding`, `includes/helpers-box.php::sgs_label_box_css` |
| **G2** the layout alignment cluster | 25 | 14 | `alignItems`/`justifyContent`/`flexDirection`/`flexWrap`, complete on 10+ blocks via `includes/class-sgs-container-wrapper.php::SGS_Container_Wrapper` |
| **G3** motion written as literals | 23 | 11 | tokenise to the client snapshot's `duration.*`/`easing.*`; precedent `sgs/container::bgHoverZoomDuration`. Plus repairing `button`, `heading` and `quote` `render.php`, which each write their own `transition: all <n>ms` defaulting to 300 |
| **G4** a hardcode beating a real setting | 15 | 3 | gate `sgs/social-icons` brand mode per property (it writes `--sgs-social-border` on the item, beating `iconBorderColour` at the root); plus one spacing-rule priority fix |
| **G5** decoration and border partners | 13 | 3 | `includes/helpers-shadow-hover.php::sgs_shadow_hover_rules`, `includes/helpers-border-style.php::sgs_border_box_decls`, `includes/image-controls.php` |
| **G6** height and width | 8 | 4 | `sgs/button::minHeight`, `sgs/nav-drawer::chromeRowHeight`; WooCommerce rows go in theme CSS; three `social-icons` rows are ledger entries (above) |
| **G7** hover underline and one line height | 5 | 3 | `sgs/nav-bar-menu::itemTextDecorationHover`, the framework's only hover-decoration control (4 rows exist) |
| **G8** a missing background colour | 2 | 2 | `sgs/card-grid::imageFallbackColour`; forward `sgs/option-picker::pillBgColour*` onto buybox's embedded picker |

**Two warnings about these labels.** A group's *name* describes its mechanism site-wide, not what it means on a
given block: Q1's G3 rows are six hardcoded `scale(1.1)` hover rows (the shared `scaleHover` enum), not timing
tokens, and `social-icons`'s three timing rows are class W, not F. Read each queue's own rows, never the group name.

**One adjacent defect to fix in passing (G5):** `sgs/social-icons` has `iconBorderColour` and
`iconBorderColourHover` on its item with no item border-width or border-style — a colour control that can never
paint. Fix both in the same pass. **Decide the width default deliberately**: defaulting it to `1px` changes every
existing outlined icon on every client. Pre-production makes that acceptable (the framework has no content to
protect and a changed default costs nothing), so choose on merit and record the choice in the commit.

**One cheap win just outside the groups:** `theme/sgs-theme/assets/css/core-blocks-critical.css` declares
`h1, h2, h3, h4, h5, h6, .wp-block-heading { text-wrap: balance }` with no `:where()`, framework-wide for every
client. The comment directly above it records that a framework-wide heading `letter-spacing: -0.01em` default was
removed for exactly this reason ("tightened EVERY client's headings and made clones drift from their reference
sites"). Removing it, or wrapping it in `:where()`, is one line, and one row (`core/query-title` text-wrap) depends
on it.

## Two route fixes, first

Not block work, and they change which rows are real, so they run before any group.

**R1 — route the settings whose database row carries no CSS property, although the setting works.**

⚠️ **R1 was mis-scoped when this plan was first drafted, and the pre-mortem corrected it. Read this before
touching anything.** The original framing — "seed the column and 181 rows resolve" — was wrong in three ways, each
verified against the code and the database on 2026-10-05:

1. **`resolve.mjs` never reads `css_element`.** `grep -c css_element scripts/computed-route/lib/resolve.mjs` returns
   **0**; `lib/db.mjs::candidates` filters on `css_property` and `css_state` only. The column is read by
   `lib/calibrate-instances.mjs` (where to put a state marker) and by triage's evidence print. **So seeding
   `css_element` resolves nothing until the affected block is recalibrated**, and "recalibrate the blocks it
   touched" misses them, because R1 changes no code.
2. **Seeding `css_property` onto an enum row destroys a working path.** `lib/db.mjs::enumSettings` selects
   `css_property IS NULL AND enum_values IS NOT NULL`; that pool (**633 rows**, verified) feeds
   `calibration.discovered`, which feeds `resolve.mjs::resolveDiscovered`. `sgsChildSizing` **is** an enum
   (`["fit","fill","fixed"]`), so the original flagship example would have been made **worse**: the discovery path
   that works today would be deleted and replaced by a length write the enum cannot hold
   (`blockjson-enum-coerces-invalid-to-default`).
3. **The animation half is resolver work, not seeding.** The 9 already-routed `sgsAnimationDuration` rows carry
   `css_property = 'anim:duration'` — a namespaced pseudo-property, not a CSS property — so
   `candidates(db, block, 'animation-duration')` can never match it. Copying that pattern onto the other 64 closes
   **0 rows**.

**Also:** these are **derived columns**. `/sgs-update` resets `css_property`, `css_element`, `css_state`, `css_tier`
and `css_layer` to NULL and rebuilds them from two durable channels
(`behavioural-analyser/css-property-classifications.json`, then `ATTR_CLASSIFICATION_OVERRIDES` in
`sgs-update-v2.py`), plus `extension-roster.json` for `source='sgs-ext'` rows. A bare `UPDATE` is wiped by the next
reseed and fails `db-consistency/check_css_property_reseed.py` invariant B. **Routing means declaring in a channel,
never an UPDATE.**

**The corrected split of the 188 NULL rows:**

| Family | Rows | Verdict |
|---|---|---|
| `sgsChildSizing` 10, `sgsHoverEasing` 9, `sgsHoverDuration` 9 | **28** | **Do not seed.** All enums; they work through discovery today |
| `sgsAnimationDuration` 64, `sgsAnimationEasing` 64 | **128** | **Not R1.** Split out as **R1b**: teach `candidates`/`splitProperty` the `anim:` and `fx:` namespaces. Resolver work, sequenced with R2 |
| `sgsChildWidth` 10, `sgsHoverDurationMs` 9, `sgsHoverZoomDuration` 9, `transitionEasing` 3, `panelSize` 1 | **32** | **R1's real scope**, and only after the checks below |

`sgsHoverDuration` (an enum of tokens) and `sgsHoverDurationMs` (a number) are the same setting in two units on the
same 9 blocks. **Seed one, never both**, or
`(block, css_property, css_layer, css_element, css_state, css_tier)` resolves to two attributes and invariant C
fails with `AmbiguousLayerAttrError`.

**Per-row rules for R1, all mandatory:**
- Never route a row whose `enum_values` is non-NULL.
- Never infer `css_element` from the attribute's name. Derive it from the BEM element the block's `render.php` or
  `style.css` actually declares the property on, cited `file::selector`.
- Declare in a durable channel, then reseed, then `python plugins/sgs-blocks/scripts/db-consistency/run.py --check`.
- Then recalibrate the affected blocks and assert that `settings[<attr>].slots` contains the cited selector. A wrong
  `css_element` is **worse than NULL**: it sends calibration's marker to the wrong element, so Solve writes a real
  value onto the wrong element — one row closes, another opens, and the database now asserts a falsehood every
  future session inherits.
- **Measure the closure on the small subset before extending.** The "181 rows" figure was premised on
  `css_element` driving resolution; it does not, so treat 181 as **unproven** and replan from what the subset
  actually closes.

The `sgs/mega-group::sgsChildSizing` case is still real — set to `fit` it emits exactly the draft's `flex: 0 1 auto`
(`includes/child-sizing.php::child_sizing_declarations`) and the `mega-panel/style.css` default it loses to carries a
comment saying a group's own Child sizing setting overrides it — but its fix is **calibration discovery**, not
routing. It belongs with R2's work, not R1's.

**R2 — make the resolver reach a parent's setting that arrives by block context.**
`accordion-item/render.php` reads `$block->context['sgs/accordionHeaderPadding']` and emits
`--sgs-accordion-header-pad`; `sgs/container` carries 13 typography attributes on its wrapper that inherit into every
descendant declaring none. The resolver searches only the block the walker attributed the element to, so it declares
a gap while the control sits one level up, working. Two independent B2 agents found this.

**Also in W0:** two walker guards B2 surfaced — a **tag-mismatch guard** (4 combos compared a draft `<div>` to a
live `<img>`, or a `<span>` to an `<h1>`) and **dropping style rows from refs the pairing left unmatched**
(`qa/pairs/*.json::left`), which would have removed 24 of one agent's 58 rows before triage saw them.

## The waves

```
W0  R1 seed the NULL rows ─┐
    R2 context resolver    │
    the 2 walker guards    ├─→ W0b re-sweep (measure only) ─→ W1 the 4 shared files ─→ W2 per-block queues ─→ W3 tail
    the browser read (3 F) ─┘        recount F before            (main thread,            (parallel,
                                     writing 38 controls          one at a time)           isolated worktrees)
```

**W0a — the cheapest item in the session: extend eight ledger entries, close 14 rows, write no code.**
Of the 17 D rows, 14 are `sgs/business-info`'s link padding and margin on the **footer** (`cr-ref-footer-24`, all
eight properties) and the **header** (`cr-ref-header-11`, six of them). `divergences.json::D-17`–`D-24` already
decide those exact properties on that exact element with `expected: { rule: 'touch-target' }`, but they are pinned to
`cr-ref-contact-9` alone, so the same decided mechanism re-reports as 14 fresh candidates on the other two surfaces.
Add the entries for those two nodes (a house rule, so they cite no register item —
`lint.mjs::HOUSE_RULES` exempts `touch-target` and `accessibility`). The measured negative margin equals the
padding, so the text paints where the draft's does.

Also D, and needing one new entry each: `cr-ref-product-4`'s option `transform` (draft a 2px lift, live 3px — S1's
decision that every button lifts 3px) citing `S1`. The two `sgs/google-reviews` timing rows are the parallel track's.

Do W0a before anything else: it is a ledger edit, needing no host and no build. It closes **14 of the 17 D rows**,
which sit outside the 157 F rows, so the F count does not change — what it removes is 14 rows that would otherwise
re-report as fresh candidates on the footer and header every time those surfaces are measured.

**W0 — route fixes and the one browser read.** No block files. Touches `scripts/computed-route/` and the seeder under
`plugins/sgs-blocks/scripts/`. Each fix needs a MUST-FAIL test shown red before it and a negative control after.
**The browser read moves here from W1**: the three medium-confidence rows it settles sit on `sgs/site-footer` and
`sgs/container`, both in Q5, so it is a W2 dependency and must be answered before dispatch. It is one headed Chrome
job at 1440 and 1920, about five minutes, and runs as one host job at a time.

**W0b — one measure-only sweep after W0, before W2.** R1 and R2 change which rows resolve. Re-run the sweep and
re-count F *before* writing 38 controls on `social-icons`, or some of that work is aimed at rows that are no longer
gaps. This is the cheapest insurance in the plan.

**W1 — the four shared files,** main thread, one at a time, each with a cross-client check:

| Shared file | Rows | Blocks affected |
|---|---|---|
| `plugins/sgs-blocks/src/blocks/form/style.css::.sgs-form-field__input` | 9 | all five `form-field-*` blocks; both G2 and G3 edit it |
| `theme/sgs-theme/assets/css/woocommerce.css` | 3 | `woocommerce/catalog-sorting`, `woocommerce/product-template` (Spec 47 §2: they hold no SGS setting, so this is the only channel) |
| `plugins/sgs-blocks/includes/image-controls.php` | 2 | `sgs/buybox` gallery filter (tunable brightness/saturate/contrast keys) |
| `plugins/sgs-blocks/assets/css/media-element.css::.sgs-media-el` | 1 | every image in the framework carries this class |

**`choice-flow/style.css` also declares `.sgs-form-field__input`.** Q2 owns that file while W1 owns the rule in
`form/style.css`. Read both together and confirm the cascade before either lands, or the W1 default will be
overridden on the choice-flow surfaces without anyone noticing.

**W2 — one `wp-sgs-developer` agent per queue,** `isolation: "worktree"`, phase 1 read-only diagnosis, main-thread
check, phase 2 implementation. No build, commit, deploy **or reseed** inside an agent — W3 owns the reseed, and a
reseed while other sessions are deploying breaks them.

**A queue owns every block its fixes edit, not only the block the row is filed under.** The block a row is
attributed to is frequently not the block that gets edited, because the parent emits a custom property the child
consumes. Measured from the fix shapes:

| Rows filed under | The fix actually edits | Why |
|---|---|---|
| `sgs/accordion-item` gap, justify-content | **`sgs/accordion`** | `headerGap` goes on the parent, emitted as `--sgs-accordion-header-gap` beside the existing header-padding tiers |
| `sgs/buybox` border, margin, layout on the picker | **`sgs/option-picker`** | the pill is option-picker's own element; buybox only embeds it (`buybox/block.json::supports.sgs.elements.wrapper._note`) |
| `sgs/mega-group` padding, transition | **`sgs/mega-panel`** | `mega-group/block.json` states it carries no styling attributes by design (parent-paints-child); the duration pair sits beside `mega-panel::panelCardLift` |
| `sgs/form-field-textarea` label gap | **`sgs/form`** | `fieldLabelGap` belongs to the Field style group on the parent |

| Queue | Blocks (★ = edit target the rows are not filed under) | Block-local F rows | Groups |
|---|---|---|---|
| Q1 | `sgs/social-icons` | 35 (+3 ledger entries) | G1, G2, G3, G4, G5, G6 |
| Q2 | `sgs/choice-flow-question`, `sgs/choice-flow`, `sgs/choice-flow-result` | 35 | G1, G2, G3, G5 |
| Q3 | `sgs/mega-group`, ★`sgs/mega-panel`, `sgs/card-grid`, `sgs/media` | 24 | G1, G3, G8 |
| Q4 | `sgs/buybox`, ★`sgs/option-picker`, `sgs/product-card`, `sgs/tabs` | 22 | G1, G2, G3, G5, G7, G8 |
| Q5 | `sgs/accordion-item`, ★`sgs/accordion`, `sgs/business-info`, `sgs/process-steps`, `sgs/brand-strip`, `sgs/trust-bar`, `sgs/button`, `sgs/container`, `sgs/site-footer` | 25 | G1, G2, G4, G6 |
| Q6 | the five `sgs/form-field-*` blocks, ★`sgs/form` | 1 | G1 |

**Q6 is deliberately almost empty**: 9 of its 10 rows are the shared `form/style.css` rule (W1), leaving only the
textarea's `fieldLabelGap` on `sgs/form`. **Fold Q6 into W1's form-file work** rather than dispatching an agent for
one attribute. Likewise `sgs/media`'s single motion row and `sgs/buybox`'s filter rows are W1, not their queue's —
the queue totals above are block-local only. They sum to 142, less the 3 deferred G4 rows = 139, plus the 15 W1 rows plus the 3 ledger entries = 157.

**Before dispatching W2, run the collision check:**
`node .claude/reports/2026-10-05-session-b/check-queue-collisions.mjs` (exits 1 on a collision or an unowned edit
target). Re-run it whenever an agent changes its chosen fix shape, because several shapes offer a choice of target
block ("a padding box family on `sgs/mega-group` **or** a `groupPadding` control on `sgs/mega-panel`") and the choice
decides the collision set.

**Tie-break when a fix shape offers a choice:** take the shape that keeps the edit inside the queue's own blocks; if
both do, take the one whose precedent block is closest in kind to the block being fixed; if still tied, take the
shape that adds the control to the block a client would look on. Record the choice in the phase-1 deliverable.

**W3 — the serial tail, main thread.** Merge each queue and read every diff; one `npm run build` from PowerShell;
`run-gates.py --tier full`; the inline-styling and client-name checks; one reseed from clean HEAD; one deploy with
`build-deploy.py --target eye-care-test`, then `sandybrown`; recalibrate only the touched blocks on the local WSL
mirrors (with `--max-old-space-size=8192` and `SGS_CAL_CHUNK=50` where a block needs it, P0-10); one measure-only
sweep.

## What each W2 agent must deliver in phase 1, before writing anything

The main-thread check needs something to check. Phase 1 returns, per row it will fix:

1. The **attribute name**, and its **type** (`string` for a single CSS length, `object` for a box or a per-device
   tier set — the precedents differ: `mega-panel::drawerCardPadding` is a string, `google-reviews::headerGap` an
   object, `icon-list::itemPaddingBlock` a string, so the type must be chosen and stated, never assumed).
2. Whether it is **responsive** (a per-device tier object plus `ResponsiveOverride`, or a flat value).
3. Its **default**, and what that default changes for existing instances on other clients.
4. **Where the declaration goes**: `block.json` `attributes`, a `supports.sgs.boxFamilies` entry, or
   `supports.sgs.elements.<el>.attrMap` — and the `css_element` it routes to.
5. The **editor side**: which control component (`SgsBoxControl`, `SgsLengthControl`, `ResponsiveOverride`), the
   translated label (`__()` with the `sgs-blocks` text domain), and the editor preview path if the block has one
   (`social-icons/edit.js` already imports `tierBoxShorthand` and `usePreviewTier`, so its canvas preview is a
   separate code path that must be updated too, or the control works on the front end and not in the editor).
6. Whether `plugins/sgs-blocks/scripts/add-control.js` scaffolds this shape (it covers shadow and typography, not
   box) or it is hand-written across `block.json`, `edit.js` and `render.php` — the three hand-kept copies that
   script exists to stop drifting.
7. The **chosen fix shape** where the verdict offered a choice, with the tie-break reason.

**File-size rule.** `social-icons/edit.js` is 786 lines and `render.php` 673, already over the 400 and 500 line
guidelines. Six groups of controls will push both further. Q1 extracts its new inspector panels into a sibling
module and its new CSS emission into a helper under `includes/` rather than growing either file; the rule is one
responsibility per file, and line count is the signal it has been broken.

**No deprecations.** `.claude/rules/block-authoring.md` is explicit: no `deprecated.js`, no `deprecated` wired into
`registerBlockType`, no version bumps pre-production — when saved output or a stored-attribute schema changes, just
rebuild. Several queue blocks (`accordion-item`, `tabs`, `buybox`, `mega-group`, `choice-flow`) have a `save.js`
returning `InnerBlocks.Content`, so adding attributes does not change saved markup at all and only `render.php`
changes. Adding an attribute is safe; do not write a deprecation for it.

## Effort

Headline figures are the optimistic ones, per `~/.claude/rules/time-estimates.md`. Every group is first-attempt with
no historical calibration; each basis is its file count plus the named precedent.

| Unit | Rows | Headline | PERT | Band |
|---|---|---|---|---|
| R1 route the NULL rows | unblocks an unproven share of 181 W | 5 min | 12 | Quick |
| R2 context resolver | unblocks 11+ | 10 min | 22 | Block |
| W0 browser read (3 medium rows) | 3 | 5 min | — | Micro |
| W0b re-sweep | — | 20 min | — | Block |
| W1 the four shared files + Q6's one attribute | 16 | 12 min | — | Quick |
| G1 inner-element spacing | 72 | 25 min | 49 | Block to Session |
| G2 alignment cluster | 25 | 15 min | 33 | Block |
| G3 motion literals | 23 | 15 min | 33 | Block |
| G4 hardcode beats setting | 15 | 8 min | 17 | Quick |
| G5 decoration and borders | 13 | 10 min | 22 | Block |
| G6 height and width | 8 | 5 min | 11 | Quick |
| G7 hover underline, line height | 5 | 5 min | 9 | Quick |
| G8 background colour | 2 | 3 min | 7 | Micro |
| **W3 serial tail** | all | **60 min** | 75 | Session |

**W3 is revised up from 25 to 60 minutes** on the skeptic review's challenge, and the challenge is fair: the tail is
four separate long steps, not one. `build-deploy.py` builds, gates, deploys with rollback, verifies and purges three
cache layers; a measure-only sweep of 17 surfaces was 3 h 15 in Session A and is 20 to 40 minutes even scoped to the
affected surfaces; recalibrating 25 blocks is a quarter of the framework. 60 minutes is the optimistic figure for
those four steps run back to back, and the pessimistic figure is 90.

**Serial total about 3 h; with W2 parallel by block, about 1 h 45.** The critical path is Q1 (`social-icons`, 35
block-local rows across six groups) plus the tail. R1, R2 and the browser read are never on the path.

**Value order,** closed rows per optimistic minute: G1 2.9, G4 1.9, G2 1.7, G6 1.6, G3 1.5, G5 1.3, G7 1.0, G8 0.7.
So: R1 and R2, then G1 and G4, then G2 and G6, then G3, G5, G7 and G8. G8 is poor value but costs 3 minutes, so it
batches with G7.

## The ten verdicts that are not high confidence

120 of the 130 confirmed F combos are high confidence. These ten are not, and each cheap check comes **before** its
fix:

| Combo | Confidence | What settles it |
|---|---|---|
| `sgs/site-footer` `margin-top`; `sgs/container` `.sgs-container__inner` `margin-left`/`-right` (3 rows) | medium | **One browser read at 1440 and 1920** of the matched rules on the footer and on `.cr-ref-home-15 > .sgs-container__inner`. The setting writes and the tier rules paint while the base rule loses; the losing declaration is named but the winning one is not. May turn three fixes into one shared priority repair. **Runs in W0.** |
| `sgs/choice-flow` `border-radius` | medium | read the live node `cr-ref-lens-0` path `""` resolves to: `.sgs-choice-flow`, or a focused inner control with its own 4px radius |
| `sgs/buybox` option `margin-bottom` | medium | a live computed-style read with the winning rule's origin on the product page |
| `sgs/choice-flow-question` option-button `align-items` | medium | re-measure at the exact path; the 0-row DB query carries the verdict alone |
| `sgs/brand-strip` `__track > __set` `align-items` | medium | the open diff sits at the parent path; confirm it is its own combo, not a knock-on |
| `sgs/choice-flow` `__summary-summary` `justify-content` | **low** | no open diff at that exact path in the walk; re-measure before touching it |
| `woocommerce/product-template` `max-width` ×2 | medium | confirm the theme-CSS rule is the right channel and scope |

## Gates

```
GATE C0: route fixes land
AFTER: R1, R2, the two walker guards, the browser read
PASS: each fix has a MUST-FAIL test shown red then green, with its fixture named (R2's is the accordion-item
      header-padding node, the real draft node, never a synthetic one);
      node --test "scripts/computed-route/tests/*.test.mjs" passes;
      node scripts/computed-route/lint.mjs --surfaces sites/eye-care-ward-end/build/surfaces.json passes;
      for EVERY row R1 seeded, the seeded css_property matches the property that attribute's render.php or
      stylesheet actually emits, checked against the source, not merely non-NULL
FAIL: R1 seeds a row whose property is wrong. The route would then write a wrong value, which is worse than not
      writing at all. Revert that row and leave it NULL.
TYPE: auto-gate
```

```
GATE C1: the shared files are safe for other clients
AFTER: W1
PASS: for each of the four shared files, sandybrown's motion-QA fixture pages (2103, 2109, 2113, 2603, 2740, 3037)
      show no computed-style change at 375/768/1440 against a before-capture, or the rule is scoped so it cannot
      reach a non-Eye-Care client; run-gates.py --tier full passes;
      the form/style.css and choice-flow/style.css cascade on .sgs-form-field__input is read together and stated
FAIL: a change alters a non-Eye-Care client's paint → scope it per block instead
TYPE: review-gate (Bean sees the before and after)
```

```
GATE C2: every block's controls work on both surfaces
AFTER: W2, before the deploy
PASS: each new setting appears in the block inspector AND paints on the front end, checked separately on the real
      editor and the real front end (a green build proves neither);
      node plugins/sgs-blocks/scripts/check-editor-render-parity.js passes;
      node plugins/sgs-blocks/scripts/check-dead-controls.js passes;
      node plugins/sgs-blocks/scripts/check-element-manifest-conformance.js passes;
      python plugins/sgs-blocks/scripts/check-box-family-guard.py passes;
      audit-inline-styling.js --check exits 0; check-no-client-names.py --check passes;
      every diff read in the main thread
FAIL: a control exists but does not paint, or paints only in the editor preview, or only on the front end
TYPE: review-gate
```

```
GATE C3: the rows actually closed
AFTER: W3
PASS: a measure-only sweep shows the rows in scope closed, run with the SAME command, flags and surface
      list as the 2026-10-05 baseline, from a clean HEAD, with the surfaces measured stated beside the result;
      new rows are capped, not forbidden: at most 1 new row per 10 closed, EVERY new row classed with its proof in
      the same commit, and no new row left unexplained;
      no `divergences.json` entry was added during the session (the ledger is Solve's write target after B4, so an
      entry added to close a row freezes a wrong value permanently and turns no check red) — the three
      `social-icons` touch-target entries are the single declared exception, written with their register citation;
      every touched block recalibrates with no new dead or noMarker outcome for the settings added;
      each of the 157 closed because its new attribute is present and painting, NOT because R1 or R2 reclassified
      the row (check the 10 non-high-confidence rows individually)
SCOPE, stated honestly: this gate measures Eye Care's 17 surfaces only. Other clients are covered by C1's
      before-and-after on sandybrown's fixture pages and by run-gates.py, not by a re-sweep. A shared-file
      regression on a third client would not be caught here; W1 is the only wave that can cause one, which is why
      C1 gates it separately.
FAIL: revert the failing QUEUE's merge (the revert unit is the queue, not the group — groups are interleaved inside
      one queue's commits) and re-sweep. Never start Session D with new rows.
TYPE: auto-gate
```

**Why "0 new rows" became a cap rather than a zero.** The sweep plan's original condition was both unreachable and
gameable. Unreachable because R2's context hop and G1's empty-tier fall-through can genuinely open one row while
closing another: a write to an inherited value changes every descendant that inherits it. Gameable three ways —
register the new row as a divergence, leave the fix uncalibrated so the resolver reports `uncalibrated` instead of
writing, or narrow the sweep's surface list. The cap, plus "every new row classed with proof in the same commit",
plus the no-new-ledger-entries rule, plus the stated-scope rule, closes all four holes. The sweep plan's Session C
done-condition should be read as amended by this gate.

**Also amended: what "the blocks it touched" means.** The sweep plan says to recalibrate the blocks touched. Define
it as **any block whose code changed or whose `block_attributes` routing columns changed** — otherwise R1, which
changes no code, recalibrates nothing and stays inert.

**Partial failure.** If one queue fails C2, the others merge and deploy without it; its rows stay open on the
register with the queue named. W3 does not wait for all six. The exception is W1: a shared file failing C1 blocks
every queue whose rows depend on that file.

## Risks

From the Phase 3 pre-mortem and the two cold reviews. Mitigations marked **before**, **during** or **gate**.

| Risk | Impact | Likelihood | Mitigation | When |
|---|---|---|---|---|
| **R1 routes an enum row and deletes a working discovery path** (633 rows depend on `css_property` staying NULL) | **High** | **High** | never route a row with non-NULL `enum_values`; add a detector listing `enum_values NOT NULL AND css_property NOT NULL`, and diff `calibration.discovered` counts per block before and after | **before** + gate |
| **R1 is inert without recalibration** (`resolve.mjs` never reads `css_element`) | **High** | **High** | define "touched" as any block whose code **or** routing columns changed; recalibrate those, then re-triage and measure actual closure before extending | **before** |
| R1's animation half can never match (`anim:duration` is not a CSS property) | Medium | High | split it out as R1b, a resolver change teaching `candidates`/`splitProperty` the `anim:`/`fx:` namespaces | before |
| Routing written as a bare `UPDATE` is wiped by the next reseed and fails invariant B | High | Medium | declare in a durable channel only, then reseed, then `db-consistency/run.py --check` | during |
| `sgsHoverDuration` and `sgsHoverDurationMs` both routed → `AmbiguousLayerAttrError` (invariant C) | High | High | route one unit of each pair, never both | during |
| A wrong `css_element` sends calibration's marker to the wrong element, so Solve writes onto the wrong element | **High** | Medium | derive it from a cited `file::selector`, and assert post-recalibration that `settings[attr].slots` contains it | gate (C0) |
| **R2 writes a parent's inherited value and changes every other descendant** (`sgs/container`'s 13 typography attributes inherit everywhere) | **High** | **High** | the context hop may **explain** a row (so it classes as resolved) but must refuse to **write** a parent attribute whose paint reaches more than one measured descendant; the write belongs on the child | during |
| R2 widens the candidate set, so rows that resolve today become `ambiguous` | High | Medium | order the new hop strictly after direct and `reaches` ties; record the ambiguous count before and after, and treat a rise as a fail | during + gate |
| R2 changes the shared resolver, invalidating Session B's whole classification | High | Medium | R2 lands as its own commit, then re-run `triage.mjs` on all 17 surfaces and require the 2,373 = 2,373 identity to hold before any group merges | gate |
| A group adds a control with no stylesheet consumer: it exists, paints nothing, and `check-dead-controls.js` goes red | Medium | High | pair every new family with its `style.css`/`render.php` reader in the same commit | during |
| G1's empty-tier fall-through: an empty `{}` mobile tier inherits the nearest wider tier, so one desktop write silently changes 375px | Medium | High | test the empty `{}` default per family; sweep at all three widths, never 1440 alone | gate |
| A new hover attribute has no calibration trigger, so it stays `uncalibrated` and closes nothing | Medium | High | add the attribute **and** confirm `calibrate.mjs` plans a hover instance for it | during |
| A W1 shared-file change alters a client that is not Eye Care | High | Medium | one file at a time, main thread, before-and-after computed styles on sandybrown's fixture pages; scope the rule rather than widening a default | gate (C1) |
| Two queues edit the same block because a chosen fix shape pulls in an unowned block | High | Medium | `check-queue-collisions.mjs` before dispatch and after any shape change; the four ★ edit targets are already assigned | before |
| Work aimed at rows R1/R2 already closed | Medium | High | W0b: re-sweep and re-count F before W2 dispatch | before |
| A control paints on the front end but not in the editor (or the reverse) | Medium | High | the phase-1 deliverable names the editor control and the preview path; Gate C2 checks the real editor and the real front end separately, plus `check-editor-render-parity.js` | gate (C2) |
| `social-icons` files grow past the size guidelines under six groups of controls | Medium | High | Q1 extracts new panels to a sibling module and new emission to an `includes/` helper | during |
| The three medium-confidence spacing rows are repaired three ways when one priority fix would do | Medium | Medium | the browser read in W0, before Q5 is dispatched | before |
| The low-confidence `choice-flow` `justify-content` row has no open diff at its path and is fixed anyway | Low | Medium | re-measure before touching; drop it if it does not reproduce | before |
| A reseed during W2 breaks another session's deploy | High | Low | W3 owns the reseed; queue agents are told not to run one; message peers before reseeding | during |
| The tail overruns badly (deploy, sweep and recalibration are four long steps) | Medium | High | W3 estimated at 60 min, not 25; recalibrate only touched blocks, on the WSL mirrors; sweep scoped to affected surfaces with the scope stated | during |
| Hostinger's edge challenges the automated browser after bursts | Medium | Medium | `SGS_HEADED=1`, one host job at a time, WSL mirrors as the fallback | during |
| A queue agent hits a pre-existing gate failure it cannot bypass from a worktree | Low | Medium | agents do not run gates or commit; the main thread runs gates in W3 and uses a disclosed `[gates-ok:<reason>]` only for genuinely pre-existing violations | during |

**Not a risk worth mitigating:** changed defaults on other clients. The framework is pre-production with no content
to protect, so a default is chosen on merit and recorded, not patched around.

**Block validation is not a risk here, verified.** Every block in G1–G8 returns `null` or `<InnerBlocks.Content />`
from `save.js`, so adding an attribute cannot invalidate stored content; only `render.php` changes. The exposure is
`build-deploy.py`'s oldshape audit, which fails on new findings against the **deploy target's** stored content, so
`eye-care-test` can pass while `sandybrown` fails. Run it on both and never pass `--skip-oldshape-audit`. This holds
only while Session C **adds** attributes: a rename or removal triggers the whole write-path blast radius
(`a-renames-blast-radius-is-the-whole-write-path`, `strip-deploy-rebuild-on-attribute-removal`).

## Deferred out of Session C

Each of these was in scope when the plan was drafted and was removed on evidence. None is dropped: each names where
it goes.

| Deferred | Why | Where it goes |
|---|---|---|
| **G4's three `!important` spacing rows** (`sgs/container::margin-left`/`-right`, `sgs/site-footer::margin-top`) | Medium-confidence verdicts proposing a specificity change across every `SGS_Container_Wrapper` block and every client. `sgs/container` occurs 5,022 times in Eye Care's trees alone and is live on other clients. The cause is **not proven** — the winning rule may be core's constrained-layout `margin-left:auto !important`, in which case the fix is to stop that class reaching the SGS band, a scoped change rather than an escalation. An Eye-Care-scoped sweep cannot measure the damage | its own session, after the one live read below, with a multi-client visual baseline. 3 rows is not worth coupling to this session's gate |
| **R1's animation half** (128 rows) | `anim:duration` is a namespaced pseudo-property the resolver cannot match; this is resolver work, not routing | **R1b**, sequenced with R2 |
| **The enum families** (28 rows: `sgsChildSizing`, `sgsHoverEasing`, `sgsHoverDuration`) | They work through calibration discovery today; routing them would delete that path | calibration discovery work with R2, not routing |
| **The full 67-block recalibration** | 67 live browser-driven calibrations on a host that challenges automated browsers under load, racing peer sessions on a shared cache | scope to the blocks the catalogue cites; extend only after the subset's closure is measured |
| **Any `derived_selector` correction** (422 corrupt rows: 309 of shape `.sgs-<block>__<attr_name>`, 113 containing a slash) | Nothing reads the column (`lib/db.mjs::COLS` omits it), so it cannot mis-resolve today | a separate database-hygiene task |
| **The 2 `sgs/google-reviews` timing rows** | They are **D**, not F: the decided site-wide timing under S1/N16a | a `divergences.json` entry on the parallel track |

## Five checks before Session C opens

Cheap, and each retires a decision the session would otherwise guess at.

1. **One live read on a non-Eye-Care client** of `.sgs-container__inner` `margin-left`/`-right` at 768 and 1440,
   with the winning rule's origin. Settles the highest-blast-radius decision in the plan, and may turn three fixes
   into one scoped change or none. ~5 min, one host job.
2. **One read-only resolver probe** on an `animation-duration` row against a block whose `sgsAnimationDuration` is
   already routed (`sgs/card-grid`). Settles whether R1b is seeding or resolver work. ~5 min, no host.
3. **Build the two walker guards** (tag-mismatch, and dropping style rows from refs in `qa/pairs/*.json::left`).
   They would have removed 24 of 58 rows in one B2 batch before triage saw them, and they directly retire G6's two
   medium `woocommerce/product-template` rows. ~15 min, no host.
4. **Write the R1-versus-G3 ownership table** per row from `b2c-verdicts.json`, so no row gets two overlapping
   fixes. Two overlapping fixes are unfalsifiable and neither can ever be safely removed
   (`rules/prove-the-cause-before-fix.md`). ~10 min.
5. **Add the standing rule to every agent brief:** never route `css_property` onto a row with `enum_values`, and
   never add a `divergences.json` entry as a way of closing a row. The ledger is now Solve's write target after B4,
   so a wrongly-added entry freezes a wrong value permanently and turns no check red. ~2 min.

## How this plan was reviewed

Written through `/strategic-plan`'s stages with its Phase 3 hard gate run as specified: a risk pre-mortem (Opus) and
an effort estimate (Sonnet) in parallel, then two cold reviewers (Sonnet as a cold executor, Haiku as a skeptic) on
the drafted plan. Every load-bearing claim each of them made was re-checked in the main thread against the code and
the database before it was accepted, and the checks are the reason this plan differs materially from its first draft:

- **R1 was mis-scoped and is now corrected** (the resolver never reads `css_element`; routing an enum row deletes a
  working discovery path; the animation half is a resolver change). Verified by `grep -c css_element resolve.mjs`
  → 0, `lib/db.mjs::enumSettings`' own `WHERE`, `sgsChildSizing`'s `enum_values`, and the `anim:duration` rows.
- **The parallel axis changed from the mechanism group to the block**, because every group shares a block with
  another and two blocks appear in six groups each.
- **Four edit-target blocks had no owner** (`sgs/accordion`, `sgs/option-picker`, `sgs/mega-panel`, `sgs/form`),
  which would have put two queues in one file.
- **Three rows were deferred** rather than fixed on an unproven cause.
- **The "0 new rows" condition became a capped, classed condition**, because it was unreachable and gameable.
- **W3's estimate went from 25 to 60 minutes** on a challenge that the tail is four long steps, not one.
- One reviewer claim was itself wrong and rejected: the shared-row count is 15, not 16 — the tenth form-field row
  (`fieldLabelGap`) goes on `sgs/form`'s `block.json`, not the shared stylesheet.

`/gap-analysis` was not run. Three independent reviews plus main-thread verification of every claim is more scrutiny
than a grade would add, and Bean asked for this session to stay lean. Recorded here rather than skipped silently.

## First action (under 5 minutes, no dependencies)

Run the framework-database query R1 depends on and write out the rows to seed:

```
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT block_slug, attr_name, attr_type, enum_values, source FROM block_attributes WHERE css_property IS NULL AND source IN ('sgs','sgs-ext') AND attr_name IN ('sgsChildSizing','sgsChildWidth','sgsHoverDuration','sgsHoverDurationMs','sgsHoverEasing','sgsHoverZoomDuration','sgsAnimationDuration','sgsAnimationEasing','panelSize','transitionEasing') ORDER BY attr_name, block_slug"
```

Verified 2026-10-05: returns 188 rows. That is R1's input and needs nothing else to exist first.

## Handoff per wave

```
[W0 route fixes — handoff]
  Trigger: /phase-planner with phase scope = "W0 route fixes"
  Entry context: .claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md §3.1 and §3.3; scripts/computed-route/README.md;
                 scripts/computed-route/lib/{resolve,triage,db}.mjs; Appendix B of the sweep plan
  Plan-Level Label hint: PLAN: opus
```

```
[W1 shared files — handoff]
  Trigger: /phase-planner with phase scope = "W1 shared files" (includes Q6's one sgs/form attribute)
  Entry context: the four files named above; the B2 verdicts whose fixShape names them; choice-flow/style.css for
                 the .sgs-form-field__input cascade; CLAUDE.md non-negotiables
  Plan-Level Label hint: PLAN: opus (cross-client blast radius)
```

```
[W2 per-block queues — handoff]
  Trigger: one wp-sgs-developer agent per queue, isolation: "worktree", after check-queue-collisions.mjs passes
  Entry context: .claude/reports/2026-10-05-session-b/b3-catalogue.json; the queue's rows filtered from the B2
                 verdict files; the precedent block named for each group; .claude/rules/block-authoring.md;
                 the phase-1 deliverable contract above
  Plan-Level Label hint: PLAN: sonnet per queue, opus for Q1 and Q4 (six groups each)
```

```
[W3 serial tail — handoff]
  Trigger: main thread only, /wp-sgs-deploy for the deploy ceremony
  Entry context: .claude/dev-setup.md (build, deploy, SSH); CLAUDE.md build and deploy rules; P0-10 calibration memory
  Plan-Level Label hint: PLAN: opus
```
