# Grid-item defaults panel — audit (D6b, first deliverable)

**Date:** 2026-08-22
**Scope:** enumeration only — no code edits made for this task.
**Governing decision:** D6b, `.claude/plans/2026-08-20-unified-colour-panel-DESIGN.md` — every block offering
a grid layout should mount the shared `GridItemDefaultsPanel` so grid items style identically everywhere.

## Method

"Grid-offering" was derived from the block's own declarations, not guessed:

1. `sgs-db.py sql "SELECT block_slug, container_kind, wraps_block FROM block_composition WHERE container_kind IN ('section','layout')"` — the composite-mirror roster (wraps `sgs/container`).
2. For each candidate, checked whether the block's `edit.js` actually renders a `Grid`-capable layout
   control — either the shared `<ContainerWrapperControls kind="layout">` mount (whose `KIND_PANELS.layout`
   array unconditionally renders `<LayoutPanel>`, which offers `Flex`/`Grid` as a `SelectControl` option), a
   direct `<LayoutPanel>` mount, or a block-private bespoke grid/flex control.
3. Counted `GridItemDefaultsPanel` mounts by **JSX usage** (`<GridItemDefaultsPanel`), not by import —
   `container/components/BackgroundPanel.js` imports the name only in a comment/docblock reference and does
   not mount it; counting that would have overstated the roster by one, exactly the mistake this decision's
   own doc warns against.

## Currently mounting `GridItemDefaultsPanel` — 3 blocks (confirmed by JSX mount, not import)

| Block | Mount site |
|---|---|
| `sgs/container` | `container/edit.js:539` (direct) |
| `sgs/cta-section` | `cta-section/edit.js:451` (direct) |
| `sgs/trust-bar` | `trust-bar/edit.js:674` (direct) |

All three also declare `gridItems` in `supports.sgs.enabledExtensions` in their own `block.json`. **That flag
is NOT used as the definition of "grid-offering" in this audit** — it is currently set on exactly these 3
blocks, i.e. exactly the ones that already have the panel, which would make it a self-fulfilling scope
predicate (the flag exists because the panel was added, not the reverse). Grid-offering below is derived
independently, from the actual rendered layout control each block exposes.

Note the routing mechanism: `ContainerWrapperControls.js`'s `KIND_PANELS.section` array is the ONLY registry
entry that includes `GridItemDefaultsPanel` (`( props ) => <GridItemDefaultsPanel { ...props } />`). Per that
file's own docblock, **all 16 live `<ContainerWrapperControls>` mounts across the plugin pass `kind="layout"`
(×10) or `kind="content"` (×6) — zero pass `kind="section"`.** So no block reaches `GridItemDefaultsPanel`
through the shared orchestrator at all; the 3 blocks above reach it only because they mount the panel
directly, bypassing the orchestrator's kind-gating.

## Grid-offering blocks NOT mounting it — 14 blocks (the gap)

Each genuinely exposes a `Flex`/`Grid` choice to the operator, confirmed by reading the actual control, not
by container_kind alone:

| Block | How it offers grid | GridItemDefaultsPanel? |
|---|---|---|
| `sgs/accordion` | `<ContainerWrapperControls kind="layout">` → `LayoutPanel` (Grid/Flex `SelectControl`) | Not mounted |
| `sgs/card-grid` | same | Not mounted |
| `sgs/feature-grid` | same | Not mounted |
| `sgs/form` | same | Not mounted |
| `sgs/form-field-tiles` | same | Not mounted |
| `sgs/gallery` | same (own `layout` attr additionally enums `grid`/`masonry`/`carousel`) | Not mounted |
| `sgs/google-reviews` | same | Not mounted |
| `sgs/post-grid` | same (own `layout` attr additionally enums `grid`/`list`/`masonry`/`carousel`) | Not mounted |
| `sgs/pricing-table` | same | Not mounted |
| `sgs/site-footer-row` | same (`kind="layout"` mount at `site-footer-row/edit.js`) | Not mounted |
| `sgs/tabs` | same | Not mounted |
| `sgs/testimonial-slider` | same (own `layout` attr enums `full`/`split` — separate axis from the wrapper's flex/grid) | Not mounted |
| `sgs/trustpilot-reviews` | same | Not mounted |
| `sgs/site-header-row` | **bespoke** "Row layout" `SelectControl` (`site-header-row/edit.js:380-383`, `value={ layout \|\| 'flex' }`, `isGrid = 'grid' === layout` at line 212) — does NOT import `ContainerWrapperControls` at all (the one earlier grep hit on that file was a comment referencing `ALIGN_OPTIONS`, not a real import) | Not mounted |

## The named exception — `sgs/hero`

`sgs/hero` is `container_kind='section'` in the DB and its `split` variant IS rendered with `display:grid` /
`grid-template-columns` (`hero/style.css:71`, confirmed). **It is excluded from the gap list**, per D6b's own
reasoning: the grid is a fixed, NAMED two-column layout (content column + media column), not a repeatable set
of interchangeable grid items — there is no "grid item" for `GridItemDefaultsPanel` to apply defaults to.
This is corroborated independently: `hero/edit.js` mounts **no** `LayoutPanel` and no Grid/Flex selector at
all (its own docblock explains it dropped the generic `<ContainerWrapperControls>` aggregator and composes
individual panels by hand) — so hero was never a candidate for the shared Grid/Flex control in the first
place, which is consistent with the split grid being structural rather than operator-configurable.

## Confirmed NOT grid-offering — excluded correctly

- **`content`-kind mounts (no `LayoutPanel`, `WidthPanel` only):** `sgs/accordion-item`, `sgs/form-step`,
  `sgs/multi-button` (confirmed separately in Task 3 of this session — always flex, `kind='content'` literal
  hardcoded at render), `sgs/product-card`, `sgs/tab`.
- **`section`-kind wrappers with no layout control of any kind:** `sgs/modal` (no `layout` attr, no
  `LayoutPanel`, no `enabledExtensions`), `sgs/site-footer` (no `layout` attr; `enabledExtensions:
  ['background']` only), `sgs/site-header` (no `layout` attr; `enabledExtensions: ['width','background']`
  only) — these are the outer landmark wrappers; their CHILD row blocks (`site-footer-row`,
  `site-header-row`) are the ones that actually offer grid, and both are already listed in the gap table
  above.
- Grepped every excluded block's `edit.js` for a bespoke `value: 'grid'` / `value="grid"` control (the
  pattern that surfaced `site-header-row`'s bespoke control) — zero hits across all nine.

## DB hygiene finding (not part of the gap — flagging, not fixing)

`block_composition` still carries rows for **`sgs/adaptive-nav`** and **`sgs/content-collection`**
(`container_kind='layout'`, `wraps_block='sgs/container'`) with no corresponding block folder or `block.json`
under `plugins/sgs-blocks/src/blocks/`. `sgs/content-collection` is confirmed retired — a migration script
(`scripts/migrate-content-collection-to-card-grid.php`) exists to move its content onto `sgs/card-grid`, and
test fixtures reference it as a golden/legacy case only. `sgs/adaptive-nav` has no folder, no block.json, and
no `"name": "sgs/adaptive-nav"` string anywhere under `src/blocks/`. Both are excluded from this audit as
non-live. These are stale DB rows (ghost rows describing a block that no longer exists), not real
grid-offering candidates — flagged for a separate DB-cleanup pass, not fixed here (out of scope for an
enumeration-only task).

## Totals

- **Grid-offering blocks (live, real evidence):** 17
- **Already mounting `GridItemDefaultsPanel`:** 3
- **Gap (grid-offering, panel not mounted):** 14
- **Principled exclusion:** 1 (`sgs/hero`, named two-column layout, not interchangeable grid items)
- **DB hygiene finding (stale rows, not live blocks):** 2 (`sgs/adaptive-nav`, `sgs/content-collection`)

No code edits were made for this task, per instruction. The mounting work for the 14-block gap is a separate
wave.
