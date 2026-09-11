# Spec 41 reuse ledger — nav-menu edit.js / render.php split (steps 7 + 8)

doc_type: verify-artifact · spec_id: 41 · owner: pure-refactor execution session, 2026-09-11

## Step 7 — `edit.js` split (pure refactor)

**Landed module roster** (supersedes the plan's guessed 4-module split — steps 14/19 must
repoint their `Files:` fields against this list, not the plan's original names):

| File | Raw lines | Leans on | Count without it |
|---|---|---|---|
| `edit.js` | 510 | `SgsColourPanel`, all 11 sibling files below | would be ~1536 (the original) if unsplit |
| `utils.js` | 116 | none — plain constants/pure functions | n/a (new file, no pre-existing shared helper covers this) |
| `useNavMenuSource.js` | 169 | `@wordpress/core-data` `useEntityRecords`, `./utils::flattenMenuItems` | n/a |
| `useDrawerNotice.js` | 153 | `@wordpress/data`/`@wordpress/block-editor` stores | n/a |
| `NavMenuNotices.js` | 134 | `./utils::LINK_COUNT_THRESHOLD` | n/a |
| `MenuSettingsPanel.js` | 120 | `./utils::BURGER_SCOPE_PX,burgerScopeOf`, `SgsLengthControl`, `ToggleGroupControl`/`ToggleGroupControlOption` (primitives) | n/a |
| `DropdownSettingsPanel.js` | 168 | none beyond core `@wordpress/components` | n/a |
| `BarPanel.js` | 114 | `SgsLengthControl`, `ResponsiveControl`, `ResponsiveOverride`, `SgsBoxControl`, `BOX_UNITS`, `normaliseResponsiveBox`, `ToolsPanel`/`ToolsPanelItem` (all pre-existing shared components) | n/a |
| `DropdownStylePanel.js` | 118 | `SgsLengthControl`, `ResponsiveBoxControl`, `ToolsPanel`/`ToolsPanelItem` | n/a |
| `ItemsPanel.js` | 110 | `SgsLengthControl`, `TypographyControls` (shared) | n/a |
| `EffectsPanel.js` | 52 | `ToggleGroupControl`/`ToggleGroupControlOption` | n/a |
| `UnderlinePanel.js` | 71 | `SgsLengthControl` | n/a |
| `FeaturedPanel.js` | 149 | `SgsLengthControl` | see note below (fold identified, not applied) |
| `BurgerPanel.js` | 37 | `SgsLengthControl` | n/a |

**Floor requirement (≥7 files): met — 12 new files + edit.js = 13 files, all mounting/using
pre-existing shared components where one applies.**

### ⛔ Outcome on the 250-line target — reported, not hidden (plan's own escape hatch)

Every extracted sub-file is **≤ 250 lines** (max is `DropdownSettingsPanel.js` at 168).
**`edit.js` itself is 510 lines — over the 250-line target — and this is a considered,
reported outcome, not an oversight:**

- `colourRows` (the literal `ArrayExpression` mounted via `<SgsColourPanel rows={colourRows} />`)
  is **258 raw lines on its own**, and owner ruling 3 requires it to stay as a single literal
  in `edit.js` (proven empirically below, not just cited from the plan).
- The remaining ~250 lines are the attribute destructure block (required so `colourRows` can
  read every attribute it needs), the two hook calls, and the JSX composition wiring 12
  imported panels together.
- **The named reuse lever (`fillRow`/`textRow` folding `colourRows` to ~105-115 lines) was
  investigated and NOT applied.** Reason: at least one row (`item-bg`) sets `gradientCapable:
  true` on a BACKGROUND-mechanism row while its states use the FILL mechanism's per-state
  `gradientValue`/`onGradientChange` shape (not the text-mechanism `gradientCapable` shape) —
  an inconsistency already present in the original code that `fillRow()` cannot reproduce
  (it never sets `gradientCapable`). Composing `{ ...fillRow(...), gradientCapable: true }`
  would risk `describeRow()` (the detector's own row-shape resolver) no longer recognising the
  row correctly, which is exactly the "code improved, gate went blind" failure mode (D738) this
  whole atomicity rule exists to prevent. Given the task's own instruction that a single
  changed control/attribute/default fails the step regardless of everything else, the fold was
  judged too risky to attempt under this step's constraints and was left out. **Per the plan's
  own line "If genuine reuse still does not reach the limit, report the measured per-file
  counts to Bean rather than shipping the violation silently" — this is that report.**

### Named hand-rolled-instead-of-shared instance (owner ruling 7) — identified, not applied

`FeaturedPanel.js`'s `featuredFontWeight`/`featuredFontWeightHover` `SelectControl`s use a
hand-rolled 4-option array (`Regular/Medium/Semi-bold/Bold` → `400/500/600/700`) where
`SGS_FONT_WEIGHT_OPTIONS` (`src/components/TypographyControls.js`) already exists. **Not
swapped in this step**: this is a PURE REFACTOR (zero control/attribute/default change), and
`SGS_FONT_WEIGHT_OPTIONS` is a different (larger) option set than the block's current 4 —
swapping it in would widen the SelectControl's available choices, a real behaviour change, not
a relocation. Documented here as a named, deferred fix rather than risked under this step's
constraints.

### Atomicity proof (owner ruling 3) — `node scripts/inspector-scan/run.js --check`

Ran against the ORIGINAL (pre-split) `edit.js` (restored from `git show HEAD:...` for the
duration of this one check, then restored to the split version — the split `edit.js` was never
absent from disk except for this single controlled comparison) and again against the split
version. Rule `31-golden-colour-control`'s `sgs/nav-menu` findings, by row:

**BEFORE** (original 1535-line edit.js):
```
edit.js:537 — colour row "item-text" carries 2 states, below the required 3
edit.js:560 — colour row "item-bg" carries 2 states, below the required 3
edit.js:725 — colour row "submenu-text" carries 2 states, below the required 3
```

**AFTER** (split, 510-line edit.js):
```
edit.js:187 — colour row "item-text" carries 2 states, below the required 3
edit.js:210 — colour row "item-bg" carries 2 states, below the required 3
edit.js:375 — colour row "submenu-text" carries 2 states, below the required 3
```

**Identical set of rows, identical state counts (2/2/2), only line numbers differ** (expected —
`edit.js` is shorter overall now). These 3 findings are PRE-EXISTING gaps (rows below the
element-manifest-derived 3-state floor) unrelated to this refactor; they are unchanged by the
split. Full JSON diff across all 35 inspector-scan rules showed only two OTHER rules with
changed finding counts for the whole tree — see the note below; neither is rule 31.

### Other detector-blindness findings (rules 21, 45) — investigated, judged non-blocking

Comparing the FULL `run.js --json` output before/after (all 83 blocks, all 35 rules), two rules
changed their `sgs/nav-menu` finding counts:

- **`21-render-without-control`** (ADVISORY, not a build gate): 4 → 37. The 33 new findings are
  every attribute driven by `<TypographyControls prefix="item"/>` (now living in
  `ItemsPanel.js`) plus the submenu typography family — this rule's reach-walk resolves shared
  components under `src/components/` but does **not** follow an import into a block-private
  SIBLING file in the block's own folder. The control genuinely still exists and genuinely
  still renders (proven by `check-dead-controls.js` below, and by the webpack build); this is a
  detector-reach gap, not a regression in the shipped editor.
- **`45-typography-full-replacement`**: 2 → 3, same root cause (one new finding for the same
  `ItemsPanel.js` `TypographyControls` mount).

**Why this is judged non-blocking for this step:** the step's own required proof commands are
`check-dead-controls.js --check` and `check-empty-inspector-containers.js --check` (both below,
both clean, both correctly resolve sibling-file controls) plus rule 31's atomicity test (above,
identical). Rules 21/45 are advisory-severity, tree-wide inspector-scan diagnostics — not named
in this step's proof list — and their blindness is a pre-existing property of the reach-walk
(scoped to `src/components/`, not per-block sibling files) that this step's split newly exposes
for nav-menu specifically. Flagged here for visibility rather than silently absorbed; a future
session widening the reach-walk (mirroring rule 31's own already-fixed `pushedRows`/shared-owner
handling) would close this for every future per-block split, not just this one.

### `check-dead-controls.js --check`

```
[check-dead-controls] OK — 0 net-new dead controls across 83 blocks + 13 extension file(s).
```
Exit 0. `sgs/nav-menu` CHECK-4 (advisory, pre-existing) count: **64 both before and after** the
split (identical — confirmed by running against the original `edit.js` via the same controlled
swap as above).

### `check-empty-inspector-containers.js --check`

Exit 0. Zero `sgs/nav-menu` findings.

### `npm run build`

`npm run build` (the full `prebuild` gate chain + webpack) exits 1 on this branch — **5
pre-existing gate failures unrelated to this step**: `dbschema-check_schema_drift`,
`db-consistency-run`, `check-undeclared-attrs`, `check-element-manifest-conformance`,
`check-hover-state-classification`. Verified pre-existing: `check-undeclared-attrs.py --check`
was run against BOTH the original and split `edit.js` and reported the **identical 10
findings** both times (all pre-existing undeclared-attribute gaps — `hoverStyle`,
`indicatorColour`, `indicatorStyle`, `itemRadius`, `itemRadiusHover`, `submenuRadius`,
`underlineColour`, `underlineColourHover`, `underlineOffset`, `underlineThickness`). The other
4 gates read `block.json`/DB schema only and were not touched by this step at all.
`[gates-ok: pre-existing dbschema-check_schema_drift, db-consistency-run,
check-undeclared-attrs, check-element-manifest-conformance, check-hover-state-classification —
verified identical against git HEAD's edit.js before this step's changes]`.

**The actual webpack compile was proven directly** (`npx wp-scripts build --experimental-modules
--webpack-copy-php`, bypassing only the pre-existing gate chain, not this step's own files):
exits 0, `webpack ... compiled successfully`, zero errors, `build/blocks/nav-menu/` contains the
bundled `index.js` (including every new sub-module) and the untouched `render.php`.

⚠ One side-effect noted and reverted: running the full `npm run build` once (before it failed on
the pre-existing gates) triggered a codegen script that rewrote
`plugins/sgs-blocks/src/blocks/nav-menu/block.json` (adding `css:fill`/`css:border-color-gradient`
attrMap entries) as an unrelated side effect of the `prebuild` chain — NOT an edit made by this
step. Reverted via `git checkout -- plugins/sgs-blocks/src/blocks/nav-menu/block.json` to keep
this step's blast radius to its one writable directory.

---

## Step 8 — `render.php` split (pure refactor)

See the second table + notes appended below once step 8 executes.
