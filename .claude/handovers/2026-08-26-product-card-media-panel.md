---
doc_type: handover
from: Mama's-clone / mobile + converter track
to: the media-panel standardisation track
date: 2026-08-26
subject: sgs/product-card typed mode has no replace control and no media panel
---

# Handover — `sgs/product-card` media, for the media-panel standardisation

**One ask: keep `sgs/product-card`'s TYPED mode in scope, and make *replace* reachable
without first removing.** Everything below is context for why.

## What we found

While cloning the Mama's Munches homepage we hit a gap in `sgs/product-card` that belongs in
your standardisation rather than as a one-off fix on our side.

In **typed mode** the block offers only a **"Remove image"** button. There is no replace
control and no inspector media panel. An operator whose image URL is broken — which is exactly
the state a freshly cloned card can land in — has to **destroy the value to get a picker back**.

Bean found it by opening the editor. Worth stating plainly because it cost us three wrong
answers: reading `edit.js` says the control exists, and it does. It simply is not reachable
without deleting first. Only opening the editor showed that.

## Why it is yours and not ours

It is a control-surface gap, not a cloning defect. Fixing it inside the converter would be a
per-block carve-out (R-31-9), and fixing it block-privately now would mean redoing it when your
standard panel lands. Bean's call was explicitly to fold it into your work.

## What "done" would look like from our side

Whatever shape the standard media panel takes:

1. `sgs/product-card` **typed** mode is in scope (not just bound / `wc-product` mode).
2. **Replace** is reachable without removing first — a Replace button beside Remove, an
   inspector media panel, or both. Bean did not pick a shape; that is yours to decide.
3. The usual per-block definition of done applies —
   `.claude/plans/block-migration-DONE-checklist.md`.

## Pointers

- Recorded as still open in `decisions.md` **D787** ("Still open, found by Bean in the editor").
- Block: `plugins/sgs-blocks/src/blocks/product-card/edit.js` — the typed-mode media area.
- `sgs/product-card` is **dual-mode**. Typed = built-in elements from block attributes;
  bound = live WooCommerce/CPT. This gap is in the **typed** path. The legacy InnerBlocks
  machinery was purged at D275, so `save.js` is `null` and there is no legacy editor path to
  keep working.
- ⚠ Related but SEPARATE, do not conflate: `sgs/hero`'s split media has the inverse problem —
  the `splitMedia*` control family (width / height / border-radius / padding / object-fit)
  emits only onto `.sgs-hero__split-image`, a class added only for the **image** type, so the
  **video and SVG** tiers have no controls at all (`hero/render.php:557-665` and `:1215`).
  If your standardisation covers per-type media controls, that gap is worth pulling in too —
  it currently blocks the approved deletion of `splitImageBleed`, whose CSS is the only thing
  giving those tiers width/height/border-radius today.

## Cross-track courtesy

`main` is shared with several live sessions. We are committing path-scoped only. Our track is
currently touching `plugins/sgs-blocks/scripts/converter/**`, `includes/helpers-typography.php`,
`includes/helpers-button-style.php`, and the `quote` / `product-card` **render.php + edit.js**
typography paths (G4: font-family moving onto the shared typography helper). If you start on
`product-card/edit.js` soon, ping us so we do not clobber each other — our edit there is scoped
to the typography panel, not the media area.
