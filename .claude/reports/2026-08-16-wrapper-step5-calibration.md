# Wrapper step 5 — live calibration pass

```
doc_type: report
date: 2026-08-16
feeds: ~/.claude/plans/go-track-1b-playful-hamster.md §1.4 step 5 (shared-wrapper decomposition)
governing_spec: .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md
```

## What this answers

D626 (2026-08-15) locked 6 extensions for the shared-wrapper split (`background`, `width`, `layout`,
`gridItems`, `shapeDividers`, `typography`) on the assumption — via the composite-mirror rule
(D152/D294) — that the 7 direct-panel blocks should uniformly enable all 6. A second grep-based lens in
the same decision flagged real per-block variance and named it a **fact question, not a design call**,
to be re-verified against source before locking each block's `enabledExtensions` migration list. This is
that verification.

## Method

Two independent checks, cross-verified:

1. **Source grep** — literal JSX panel-mount tags (`<WidthPanel`, `<LayoutPanel`, `<BackgroundPanel`,
   `<ShapeDividersPanel`, `<GridItemDefaultsPanel`, `<GridAreaPanel`) in each of the 7 blocks' `edit.js`.
2. **`survey-wrapper-capability.js --survey`** (already-built census, self-test 39/39, no changes made to
   it this pass) — per-block Declared/Rendered/Consumed/Live attribute counts, cross-checked against the
   panel-mount list above (each panel has a known attr count, so the totals must reconcile).

Both agree. `RENDERED BUT NOT LIVE: 0`, `ORPHANED CAPABILITY: 0` — no drift between what a block
declares, what mounts, and what paints, for any of the 25 wrapper consumers.

## Finding — panel mounts per block (verified, not assumed)

| Block | Width | Layout | Background | ShapeDividers | GridItemDefaults | GridArea | Attr count (census D=R=C=LIVE) |
|---|---|---|---|---|---|---|---|
| `container` | ✅ | ✅ | ✅ | ✅ | ✅ | ⛔ | 46 |
| `cta-section` | ✅ | ✅ | ✅ | ✅ | ✅ | ⛔ | 46 |
| `trust-bar` | ✅ | ✅ | ✅ | ✅ | ✅ | ⛔ | 46 |
| `hero` | ✅ | ⛔ | ✅ | ✅ | ⛔ | ⛔ | 28 |
| `site-footer` | ✅ | ⛔ | ✅ | ⛔ | ⛔ | ⛔ | 18 |
| `site-header` | ✅ | ⛔ | ✅ | ⛔ | ⛔ | ⛔ | 18 |
| `physics-canvas` | ✅ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | 2 |

**The council's "enable all 6 uniformly" assumption does NOT hold today.** Only 3 of 7 blocks
(`container`/`cta-section`/`trust-bar`) mount all 5 existing panels; `hero` mounts 3; `site-header`/
`site-footer` mount 2; `physics-canvas` mounts 1. Typography has no existing panel (new extension,
scope for step 6 is the root-default cascade, D625's mechanism — not a retrofit).

## A second finding, not part of the original fact question — GridAreaPanel is dead for all 7

`GridAreaPanel` (a per-grid-area sub-component, takes `areaName`/`label` props) is exported by
`ContainerWrapperControls.js` but its only JSX consumer is inside the same file, at the aggregator's own
`kind='section'` render branch (`:1621`). **None of the 25 wrapper consumers use `kind='section'`** — the
census's `CONSUMERS` table shows every aggregator consumer routes through `kind='layout'` or
`kind='content'`, and all 7 direct-panel blocks bypass the aggregator (`kind` prop is never passed —
`editor=none (direct panels)`). So `GridAreaPanel` currently has **zero live mounts anywhere in the
framework**, confirmed by grep across every `edit.js`/`components/*.js` in the plugin.

This matters for step 6: D626 named `GridAreaPanel` as `gridItems`' sub-capability, "gated on the block's
existing `supports.sgs.gridAreas` declaration". No block declares `supports.sgs.gridAreas` today (checked
all 7 `block.json` files — 0 hits; `hero`'s only `gridAreas` occurrence is an unrelated CSS Grid
`grid-template-areas` comment, not a `supports.sgs` flag). So the gate D626 assumed exists has to be
**built from scratch** in step 6/7, not wired to an existing flag.

## A third finding — `GridItemDefaultsPanel` mounts unconditionally, no precondition gate exists yet

`container`/`cta-section`/`trust-bar` mount `<GridItemDefaultsPanel>` with no surrounding condition — no
`layout === 'grid'` check, no `supports.sgs.gridAreas` check. D626's "`gridItems` requires `layout`" rule
is a **design decision to build**, not a currently-enforced precondition. Confirms the step 6 scope note
already in the plan doc ("a build-time or `/sgs-update`-seed validation gate rejecting the wrong
combination — not yet built").

## What this settles for step 6

- The per-block `enabledExtensions` migration list must be **built from the table above**, not assumed
  uniform. Whether to also **expand** each block's set toward full composite-mirror compliance (giving
  `hero`/`site-header`/`site-footer`/`physics-canvas` the extensions they currently lack) is a real design
  choice — not this report's call. See the design gate below.
- `shapeDividers` decoupling from `background` (D626, reversed from the council's first pass) is
  consistent with what's measured: `site-footer`/`site-header` mount `background` without
  `shapeDividers`, and no block mounts `shapeDividers` without `background` today — so the current data
  doesn't contradict either the old or the new coupling rule; it's underdetermined by observation alone,
  which is why D626 treated it as a ruling, not a measurement.
- `gridItems`'s two real preconditions (`requires layout`; `GridAreaPanel` gated on a flag that doesn't
  exist yet) both need new code in step 6/7, not just a data-driven relocation.

## Editor-vs-paint channel disagreement (carried from D624, re-confirmed unchanged)

All 7 direct-panel blocks: editor prop is `none` (they never pass `kind` to the aggregator — they mount
named panels directly), but the PHP paint call hardcodes `kind='section'` as a literal string in every
one of their `render.php` files (D626's "hard sequencing dependency" — the wrapper's PHP scope must
become a function of `enabledExtensions` in the same commit as any block's editor migration).

## Not yet resolved — do not start step 6 on this alone

This report answers the fact question. It does **not** decide whether under-mounting blocks should be
expanded to match the composite-mirror rule, nor does it design the `gridItems`/`shapeDividers`
precondition gates. Both go to Bean as the step 6 design gate.
