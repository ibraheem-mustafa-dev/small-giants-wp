---
doc_type: prompt
title: Colour conformance — TEXT surface
created: 2026-09-07
governs: plugins/sgs-blocks/scripts/colour-codemod/
retention: delete once consumed
---

# Colour conformance — TEXT surface

Invoke `/autopilot` first. Read `plugins/sgs-blocks/CLAUDE.md` in full — the colour-helper
registry and the 7 non-negotiable rules bind here. Check `ListAgents` and `git status`; this tree
runs many concurrent sessions on `main`.

**This file replaces `2026-09-06-colour-conformance-text-surface-next.md`, deleted 2026-09-07.**
That version's counts had drifted, and it framed all of TEXT as one job. It is two jobs with
different shapes, split below.

## First action

```
cd plugins/sgs-blocks/scripts/colour-codemod
node classify-end-shape.js
node classify-end-shape.js --json > /tmp/endshape.json
```

Under two minutes. Every number here is a 2026-09-07 measurement; the census moves as other
sessions touch shared blocks. **Read `rows[]` from the JSON** — the summary line alone hides the
split that matters.

## Ground truth, measured 2026-09-07

99 non-conformant rows across all surfaces. TEXT is **68** (40 `text-gradient` + 28
`text-gradient-needs-bg-layer`) — up from the 58 the old prompt claimed.

**But 68 is not the workload.** Split by `currentComplete`:

| Bucket | Rows | Meaning |
|---|---|---|
| **Already correctly wired** | **39** | `currentComplete: true`, already calling the full helper trio. Flagged for ONE reason: `needsHover: true`, `needsGradient: false` |
| **Genuinely incomplete** | **29** | 21 `currentShape: unknown`, 8 `bare-custom-property-no-gradient` |

The two buckets need opposite work. Do not treat 68 as a migration backlog.

## Task 1 — add a hover state to 36 rows (Bean-ruled 2026-09-07)

**Bean's ruling: every text row gets a base + hover pair.** This was put to him with the
alternative — restrict hover to genuinely interactive elements — and he chose the uniform
contract. Do not re-litigate it. The rationale is consistency: `SgsColourPanel` already presents
Normal/Hover, and a uniform contract beats a per-element interactivity judgement that every
future block would have to re-make.

The 36 (the 39 above, minus the 3 in Task 2):

`accordion-item.textColour` · `before-after.labelColour` · `breadcrumbs.linkColour` ·
`breadcrumbs.separatorColour` · `breadcrumbs.currentColour` · `business-info.labelColour` ·
`cart.badgeTextColour` · `cart.panelTextColour` · `collapsible-text.textColour` ·
`countdown-timer.textColour` · `counter.numberColour` · `counter.labelColour` ·
`feature-grid.textColour` · `form.submitColour` · `form-field-tiles.textColour` ·
`form-step.textColour` · `gallery.captionColour` · `label.textColour` · `media.captionColour` ·
`mega-panel.iconColour` · `modal.triggerColour` · `nav-drawer.drawerTextColour` ·
`option-picker.labelColour` · `product-faq.textColour` · `product-faq-item.textColour` ·
`quote.attributionColour` · `separator.contentColour` · `site-footer-row.textColour` ·
`site-header-row.textColour` · `star-rating.textColour` · `tab.textColour` ·
`table-of-contents.titleColour` · `trust-bar.titleColour` · `trust-bar.labelColour` ·
`trustpilot-reviews.textColour` · `whatsapp-cta.labelColour`

Re-derive this list from a fresh `--json` before starting. These rows already have the correct
gradient shape, so the work is adding the hover state, not migrating the mechanism.

`.claude/THE-MIGRATION-METHOD.md` applies at this size — build or extend the codemod rather than
hand-editing 36 blocks, and confirm the shared-cause pattern genuinely holds by reading several
rows before batch-applying.

## Task 2 — 3 circular flags: exempt, do not "fix"

`brand-strip.itemTextColourHover`, `post-grid.textColourHover`, `quote.textColourHover` are
**hover rows being told they need a hover**. Verified 2026-09-07: none declares a base partner
(`itemTextColour`, `textColour`) and each already has its `*Gradient` sibling. They are
hover-only by design — the element has no resting colour override.

They need a `colourExemptions` entry in their own `block.json` with `rule: "states"`, matching
the pattern already used for `gallery.overlayColourHover` and `social-icons.iconBackgroundHover`
in `migrate-fill-custom-property-gradient.js`'s `KNOWN_DIFFERENT_SHAPE`. **Documentation, not
code.** Adding a hover to a hover row is incoherent.

Better still, fix `classify-end-shape.js` so an attribute with no base partner never gets
`needsHover: true`. That closes the class rather than three instances, and the next hover-only
row added to the library will not re-trip it.

## Task 3 — triage the 29 incomplete rows, then migrate (Bean-ruled)

**Triage before migrating.** On the FILL surface roughly a third of apparent gaps turned out to
be classifier artefacts or structural impossibilities once read — `box-shadow` cannot hold a
gradient, disqualifying 10 rows on sight. Expect the same here.

- **21 rows, `currentShape: unknown`** — the classifier could not determine the current shape.
  Read each block's `render.php` before assuming it needs the trio.
- **8 rows, `bare-custom-property-no-gradient`** — a known uniform shape. Safe to batch once
  triaged.

**One real gap already identified:** `card-grid.textColourHover` is hover-only (no base partner)
AND has no `*Gradient` sibling — the only Hover-named row that is a genuine gap rather than a
classifier artefact. Give it a gradient sibling on its existing single hover state; do not add a
base it was never designed to have.

**Also flagged:** `business-info.attributionHoverColourFallback`, `currentShape:
bare-custom-property-no-gradient`.

## The mechanism

| Shape-key | Chain |
|---|---|
| `text-gradient` | `sgs_resolve_text_colour_or_gradient()` → `sgs_text_colour_decl()` → `sgs_text_colour_gradient_fallback_rule()` |
| `text-gradient-needs-bg-layer` | `sgs_block_background_layer_css()` **first** (moves the background to `::after`), then the trio above |

The second key exists because the element also declares a `css:background*` member, and
`background-clip: text` would clip the background too. All four helpers verified present in
`includes/helpers-tokens.php` 2026-09-07.

## Corrections to the old prompt

- TEXT was 58, is **68**. More importantly, 39 of those are already correctly wired.
- It presented FILL as "closed except documented exclusions". **15 rows remain** (10
  `fill-custom-property-gradient`, 5 `fill-base-hover-flat`). Most are documented exclusions —
  `KNOWN_DIFFERENT_SHAPE` holds 56 entries, each with a stated reason — but "closed" overstates it.
- Its FILL closure figures do not reconcile. The prompt says "55 rows audited, 8 hover gaps";
  commit `b30c6bfc4`'s own subject says "51 rows… 8 gaps"; its body lists 18 attributes fixed.
- ICON/SVG is still 1 row, but a **different** row than the one recorded closed —
  `social-icons.iconGlyphColourHover`, not `before-after.handleIconColour`. A new gap appeared.
- `phase-colour-conformance.md` is **stale**: it names
  `2026-09-06-colour-conformance-paint-target-grouping.md` as the current worklist pointer, and
  that file no longer exists.

## Guardrails

- **Every classifier "gap" is a hypothesis.** Read the block before building. This prompt exists
  because 39 of 68 flagged rows turned out to be already correct.
- **A detector that flags correct framework usage is a detector bug.** Rule 43 hit this exact
  class on 2026-09-07 and was fixed at `eebb06187` — the fix taught the rule the real mechanism
  rather than exempting instances. Prefer that shape here (see Task 2).
- **Colour lives as ONE ROW inside the shared `SgsColourPanel`**, rendered first
  (D609/D618/D622). Never a bespoke per-element colour mount — that was incident D970.
- **Codemods in list/json/dry mode until you have read their argparse.** These scripts modify files.
- **D983 (2026-09-07): no PRs, no stashes, integrate after every task.** Commit to `main`,
  path-scoped.
- **Never `git stash`. Never `git checkout --` a file.**
- **Path-scope every commit.** No globs.
- **Never add a parking.md entry without asking Bean first.**
- Spec 32: no block renders an inline `style=` property declaration.
- No version bumps, no deprecations — pre-production (D293).

## Tools

| Tool | Use |
|---|---|
| `classify-end-shape.js --json` | The census. Read `rows[]`, split on `currentComplete` |
| `classify-end-shape.js --list <shape-key>` | Rows for one shape |
| `migrate-fill-custom-property-gradient.js` | `KNOWN_DIFFERENT_SHAPE` — 56 documented exclusions, the exemption precedent for Task 2 |
| `inspector-scan/run.js --json` | Baseline before and after; 0 net-new |
| `sgs-db.py sql "..."` | DB ground truth before any "missing X" claim |

## Skills and agents

| Route to | When |
|---|---|
| `/autopilot` | First, always |
| `wp-sgs-developer` | All block work |
| `/dispatching-parallel-agents` | Task 1's batch, split by disjoint blocks |
| `/systematic-debugging` | Any regression — cause before fix |
| `/sgs-db` + `/wp-blocks` | Schema ground truth |

## Hand back if

- Triage shows most of the 29 are classifier artefacts — that changes the track's size and is
  worth telling Bean before grinding through them.
- A row needs a design judgement rather than a mechanical migration.
- The census has moved sharply. Re-verify before assuming a regression.
