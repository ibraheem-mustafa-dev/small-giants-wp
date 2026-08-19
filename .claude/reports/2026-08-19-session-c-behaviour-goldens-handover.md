---
doc_type: report
project: small-giants-wp
session: C (behaviour goldens)
date: 2026-08-19
status: merged to main
---

# Session C handover — MEDIA / STATE / STRUCTURE control goldens

## What this session was

One of three parallel sessions finalising the SGS inspector-control goldens (the
canonical-shape contract for each of ~24 inspector control types). Session C owned 7
types: **media, state, responsive-wrapper, repeater, animation, angle-position, preset**.
Sessions A and B own the remaining ~17 (styling primitives, input controls) in their own
worktrees/branches — this doc does not speak for their work.

**Branch:** `feat/goldens-behaviour` — 5 commits, merged to `main` 2026-08-19 (verification
skipped for the merge itself, per Bean's explicit instruction; every individual commit on
the branch already passed the full commit-gate chain — gitleaks, cheat-gate, F5/F6,
dead-controls, visual-diff — before merge).

## Deliverable

`plugins/sgs-blocks/scripts/consistency/goldens/behaviour.json` — one row per type, same
shape as `golden-controls.json`'s `controls` object. **NOT merged into
`golden-controls.json` itself** — it is a sibling file, same pattern as Sessions A/B's
`goldens/styling.json` / `goldens/input.json`.

⚠ **Composer note for whoever builds/runs the merge:** 3 of behaviour.json's 7 keys
(`media`, `state`, `responsive-wrapper`) also exist in `golden-controls.json`'s `controls`
object as TEMP rows from an earlier same-day session. behaviour.json's versions are the
finalised replacements — the composer must prefer behaviour.json over golden-controls.json
for those 3 keys, not merge or keep both.

## What every canonical shape was decided on

Bean explicitly required every decision to be made from the **live block editor**, not a
description — every row below carries screenshots taken on the sandybrown canary before
Bean picked the shape. See `_meta.source` / `verifiedLive` flags in behaviour.json for
which figures are live-confirmed vs. code-derived.

| Type | Decision |
|---|---|
| **media** | One contract, two modes — `MediaPicker` (single) + `MediaGalleryPicker` (bulk). Their own source docblocks call each other siblings. |
| **state** | TWO mechanisms, not one — the pre-existing temp row covered colour-hover only (`SgsColourPanel`→`DesignTokenPicker`); `hover-effects.js`'s scale/shadow/zoom/grayscale/focus-ring/click-ripple extension is a second, separate universal mechanism. |
| **responsive-wrapper** | Carried forward from the existing temp row (already has a wired prebuild gate + binding pairing rule) — added the missing `qualifiesWhen`. |
| **repeater** | TWO separate types, not one: author-items (trust-bar's shape as target — no shared component built yet, drag-reorder explicitly deferred per Bean, "not worth the time, need to launch") vs. pick-from-existing (card-grid's search/pick panel). No native WP repeater-with-drag-reorder API exists. |
| **animation** | FOUR mechanisms confirmed live — scroll-trigger reveal (Tier V CSS), GSAP scroll-scrub effects (Tier G, `fx.js`), element parallax, and background motion. Two of the four share an identical dropdown UI while driving unrelated runtimes — do not collapse on UI-shape resemblance alone. |
| **angle-position** | NOT one type — angle has exactly one legitimate use (inside the gradient system, no wrapper needed); position now has a real SGS wrapper (`FocalPositionField`, built this session). |
| **preset** | `sgs/testimonial`'s thumbnail-grid picker is canonical — the only real visual preset picker in the library. `sgs/nav-drawer`'s 7-value `variantPreset` has **zero editor control anywhere**, confirmed live and independently reconfirmed by the pre-commit cloning-pipeline gate (6 of its 7 variants also collide on an empty discriminator signature — `[baselined] Check #3 — Variant Discriminator Collision`, still open, not fixed this session). |

## Bugs found, proven, and fixed this session (not just diagnosed)

1. **The universal `parallax.js` extension's "Background parallax" toggle was dead UI.**
   It mounted inside WordPress's native Colour panel (`InspectorControls group="color"`),
   gated on `getBlockSupport(name, ['color','background'])` — false on any block that has
   migrated off native colour supports (`sgs/hero` declares none at all; `sgs/container`
   sets `supports.color:false`). Proven by reading the code, not asserted.
   **Root-cause correction mid-fix:** the first diagnosis assumed 5 blocks (hero,
   container, cta-section, trust-bar, site-header) each hand-rolled their own
   Ken-burns/Parallax pair with zero shared component — that was wrong, inferred from
   seeing the same attribute names in each block's live editor rather than checked
   against source. `BackgroundPanel` (`container/components/BackgroundPanel.js`) is
   already ONE shared component, imported by 8 blocks, that already provides a working
   `bgKenBurns`/`bgParallax` pair. **Fix shipped: retirement, not relocation** — the
   background half of `parallax.js` is fully removed end-to-end (editor UI, PHP
   attribute-injection branch, CSS rules including the scroll-driven-animation variant,
   and the legacy-browser JS fallback branch). Element parallax is untouched and still
   works everywhere.
2. **`trust-bar`'s "Pending (hidden on frontend)" per-badge control removed.** Ad hoc
   request while reviewing the repeater golden live. Removed the whole mechanism —
   attribute, editor styling/preview, and the `render.php` hidden-attribute gate — not
   just the toggle, since leaving the attribute with no control is exactly the
   dead-attribute class `check-dead-controls.js` exists to catch.
3. **`FocalPositionField` built** (`src/components/FocalPositionField.js`) — the first
   SGS wrapper around a raw native control, per Bean's ruling that any bare native
   primitive should get a small wrapper modelled on `LinkPopoverField`'s shape. The two
   pre-existing raw `FocalPointPicker` mounts (the universal `image-controls.js`
   extension, `sgs/hero`'s split-media object-position control) had two *different*
   storage shapes for the same concept (raw `{x,y}` floats vs. a CSS `object-position`
   string) — the wrapper owns the conversion via a `format` prop so neither consumer's
   PHP side had to change. Both mounts now route through it.

## What's still open (not built this session — named, not silently dropped)

- **Repeater's shared component doesn't exist yet.** behaviour.json names trust-bar's
  shape as the target; nobody has extracted it. `icon-list`, and `sgs/product-card`'s
  `packSizes` (a bare comma-separated `TextControl`, the weakest of the 4 shapes
  surveyed) still need migrating onto whatever gets built. Drag-reorder is explicitly
  out of scope per Bean.
- **`sgs/nav-drawer`'s missing preset control.** A declared, DB-backed 7-value
  `variantPreset` axis with no editor UI at all. Highest-value single finding in the
  whole preset type — not fixed this session (scope was the goldens file + the two ad
  hoc fixes above, not a general bug-fix pass).
- **`sgs/testimonial-slider` still declares a dead legacy `testimonials` array attribute**
  in block.json — its own code comments confirm the custom repeater was retired in
  favour of `sgs/testimonial` InnerBlocks children. An orphan attribute, named in
  behaviour.json's `repeater.bannedLookalikes`, not removed this session.
- **The angle-position row's `angle` sub-type has no SGS wrapper** — deliberately, since
  it has exactly one legitimate use today (inside the gradient-picker system). Build one
  only if a second use case appears.

## Also corrected mid-session (methodology, not scope)

`survey-control-reach.py` — the script every one of `golden-controls.json`'s other 13
rows cites for "REACH" adoption figures — does not exist anywhere in this repository's
git history. Confirmed via `git log --all` (zero commits ever touched that path) and
cross-checked against two other real, committed scripts whose own docblocks describe it
as their sibling. Per Bean: it was a genuine duplicate of the "C1" track's own reach
mechanism, deliberately deleted after C1 merged to main. This session's adoption figures
come from `survey-control-mounts.py` (real, committed) plus direct source reads plus
live-editor screenshots instead — every figure in behaviour.json is independently
reproducible by the command or the live-editor path cited beside it.

## Verification run this session

- `node scripts/surveys/survey-golden-conformance.js --self-test` — passed
- `node scripts/check-dead-controls.js --check` — 0 net-new dead controls
- `python .claude/hooks/handoff-preflight.py --check` — 8/9 passed; the 1 failure
  (`no-dangling-links` on `02-SGS-BLOCKS-REFERENCE.md`) is a pre-existing, documented
  fresh-worktree artefact (that file is gitignored/generated locally), not caused by
  this session
- Every commit passed the full pre-commit gate chain (gitleaks, cheat-gate 11/11
  baselined, F5 coverage-conservation, F6 variant-discriminator, dead-controls) with zero
  new findings

## Files touched, for reference

```
plugins/sgs-blocks/scripts/consistency/goldens/behaviour.json   (new — the deliverable)
plugins/sgs-blocks/src/components/FocalPositionField.js         (new)
plugins/sgs-blocks/src/components/index.js                      (export added)
plugins/sgs-blocks/src/blocks/trust-bar/{edit.js,render.php,block.json}
plugins/sgs-blocks/src/blocks/hero/edit.js
plugins/sgs-blocks/src/blocks/extensions/{image-controls.js,parallax.js}
plugins/sgs-blocks/includes/parallax.php
plugins/sgs-blocks/assets/{css/extensions.css,js/parallax.js}
reports/visual-diff/manual-skips.log                            (gate log, auto-updated)
```
