---
doc_type: handoff
session: goldens-A-styling-primitives
date: 2026-08-19
branch: feat/goldens-styling
worktree: C:\Users\Bean\Projects\sgs-goldens-styling
---

# Session A (goldens-styling) — handover to main session

**Status: feature-complete, NOT yet formally verified.** Per Bean's explicit instruction this
session, formal verification (`handoff-preflight.py --check`, a final combined self-test/build
pass, and the merge to `origin/main`) is being handed to the main session rather than run here.
Everything below is what to check before/while doing that.

## What this session was

Session A of a 3-way parallel split (`/`.claude/prompts/2026-08-19-goldens-A-styling-primitives.md`)
finalising the "golden controls" contract system — 7 styling-primitive control types
(gradient/typography/length-unit/box-4value/border/shadow/alignment) plus building the composer
that merges `golden-controls.json` with Sessions B/C's peer files. Sessions B
(`feat/goldens-input`) and C (`feat/goldens-behaviour`) are separate worktrees/branches, not yet
merged as of this handover.

## What shipped

### 1. The composer (built first, as planned — B/C depend on it)
- `plugins/sgs-blocks/scripts/inspector-scan/core/golden.js` — added `loadMergedSchema()`,
  additive only (`loadSchema()` untouched). Unions `golden-controls.json` +
  `goldens/{styling,input,behaviour}.json`, tolerating an absent peer file (ENOENT), throwing on a
  genuine parse error or two PEER files claiming the same key. **A peer OVERRIDING a base
  placeholder key is expected, not a collision** — this was a real bug caught and fixed mid-session
  (my first version wrongly threw on exactly the override case my own rows needed).
- `plugins/sgs-blocks/scripts/surveys/survey-golden-conformance.js` — now loads via
  `loadMergedSchema()` instead of raw `JSON.parse(GOLDEN_PATH)`. Also had a real engine bug found
  and fixed here (see §3).

### 2. `plugins/sgs-blocks/scripts/consistency/goldens/styling.json` (new file)
All 7 types written with real measured evidence (see the file's own `_note`/`measured2026_08_19`
fields throughout — don't re-derive, the commands are recorded inline). Headline decisions:

- **typography** — `TypographyControls` canonical, decided on capability (responsive tiers, theme
  tokens, hover rows) not adoption count. **Redesigned this session** (Bean-directed, compact
  layout): Preset+Size paired, new Font Family field, Weight/Style/Line-height/Letter-spacing
  collapsed behind a toggle. MISSING/CONFORMANT/NOT-APPLICABLE = 51/16/16.
- **gradient** — no standalone key (already lives in colour's row). `GradientCapableColourControl`
  named canonical for the per-state text-gradient slot despite 0 mounts (architecturally correct,
  not wired up yet) — recorded as a correction note in `_meta` since `golden-controls.json` itself
  is out of scope to edit.
- **box-4value** — **rebuilt this session**: new `SgsBoxControl.js` replaces core `BoxControl`
  inside `ResponsiveBoxControl.js` (affects 48+ blocks) to fix a real, confirmed alignment bug in
  WP core's own BoxControl internals (verified against the real npm package source, not a guess).
- **border** — width/radius cross-reference box-4value's row. **New `BorderStyleControl.js`**
  matches WP core's native 3-icon style picker exactly (pulled from real `@wordpress/components`
  source). Border colour now has a dual-entry design (compact panel swatch + `SgsColourPanel` row,
  both bound to the same attribute, both opening the same enhanced popover with style icons
  built into `DesignTokenPicker` via new opt-in `borderStyle`/`onBorderStyleChange` props). Wired
  into `sgs/heading` as the reference implementation; **12 other blocks still on the old 9-option
  dropdown, not migrated**. Also flags a real, unresolved finding: 52 blocks have
  `supports.__experimentalBorder` with sub-flags TRUE (not colour's required all-false shape) —
  core's native border UI is live in the editor alongside SGS's panel; out of this session's scope
  to fix (touches per-block `block.json`, wider blast radius).
- **shadow** — `ShadowControl` confirmed complete (checked against Bean's direct "is anything
  missing?" — no changes needed). 17 blocks paint `box-shadow` in CSS without mounting
  `ShadowControl` — the concrete MISSING list for a future census pass.
- **length-unit** — **new `SgsLengthControl.js`** built (Bean-directed — "build an SGS wrapper the
  way Session B did for its own type"), offering an opt-in theme-token preset dropdown
  (`spacing.spacingSizes`, 8 real tokens confirmed in `theme/sgs-theme/theme.json`) alongside the
  raw `UnitControl`. **Not yet wired into any block** — new infrastructure, not a migration.
- **alignment** — new key. Started as "textAlign = gap, contentAlign = canonical (multi-button)"
  but **Bean corrected this mid-session**: both facets are the same underlying mechanism
  (`ResponsiveOverride` + `SelectControl`, tier-object storage), just different option lists. One
  canonical pattern now covers both; neither facet's current implementations use the responsive
  wrapper yet (11+ textAlign, 10+ contentAlign instances are flat, non-responsive) — that's rollout
  work, not an open design question. Also fixed two inaccessible labels on the reference
  implementation (`multi-button/edit.js`): "Justify Content (main axis)" → "Button spacing",
  "Align Items (cross axis)" → "Button alignment".

### 3. Real engine bug found + fixed (delegated to a background Sonnet agent, not scoped to
typography alone)
`axisCanonical()` in `survey-golden-conformance.js` did a blanket canonical-reach check for EVERY
control type with zero `qualifiesWhen` gating — the exact O.16 "phantom backlog" trap, just at the
engine layer instead of a row's scope predicate. Fixed: `axisCanonical()` now calls
`qualifiesFor()` for every type except colour (colour is excluded deliberately — routing it through
the new branch was tested and found to MOVE colour's numbers, so it keeps its pre-existing
pre-gate path). `qualifiesFor()`'s own-paint check now reads a new schema field,
`qualifiesWhen.paintsOwnSurface.cssProperties` (a bare array of property-name strings), falling
back to colour's exact original hardcoded regex when a row doesn't declare it — so colour's
numbers cannot move even by accident. **Verified**: colour's canonical-axis distribution diffed
row-by-row across all 83 blocks before/after — 0 differences (63/2/6/12 both times).

## What's NOT done

- **Alignment facets have no real MISSING/NOT-APPLICABLE census run yet** — the canonical pattern
  is settled, but nobody's measured which blocks qualify against it. Future work.
- **12 blocks still on the old border-style dropdown**, **10+ on the old flat contentAlign panel**,
  **11+ on the old flat textAlign panel** — rollout lists exist in the JSON row `_note` fields, not
  migrated this session.
- **52 blocks' `supports.__experimentalBorder` sub-flags are TRUE, not all-false** — a real finding,
  flagged but not fixed (see border row above).
- **`golden-controls.json`'s own `_meta.notEncoded` field is stale** (claims `core/golden.js`
  "DOES NOT EXIST" — it does, this session extended it). Cannot fix directly (out of scope, owned
  by another session/file) — flagged in `styling.json`'s own `_meta.knownStaleClaims`.
- **A visual comparison artifact for box-4value/border was requested, then explicitly cancelled**
  ("Don't do the artifact") — Bean confirmed the box-4value/border designs via description +
  earlier live screenshots instead, not a rendered mockup.

## Verification run THIS session (not skipped, just not the FULL formal gate)

- `npx wp-scripts build --experimental-modules --webpack-copy-php` — clean, multiple times, after
  every component change. Last run: clean.
- `node run.js --self-test 31-golden-colour-control` (from `scripts/inspector-scan/`) — **409**
  findings (moved from a 408 baseline — root-caused, not just accepted: see the border row's
  `rule31CountMoved408to409_rootCaused` field. The +1 is the SAME pre-existing single-state warning
  on Heading's border colour, counted twice because a second real UI mount for the same
  under-specified attribute (no `borderColourHover` attr declared) now exists. Not a new defect
  class.).
- `node scripts/surveys/survey-golden-conformance.js --self-test` — PASSED, all fixtures green.
- `python -c "import json; json.load(open('scripts/consistency/goldens/styling.json'))"` — valid.

## What the main session should do

1. **Run `python .claude/hooks/handoff-preflight.py --check`** — not run this session.
2. **Consider whether the 409 (vs the documented-elsewhere 408 baseline) needs recording anywhere
   else** (e.g. if any other doc cites "408" as a fixed number) — this session's `styling.json`
   already documents the root cause inline.
3. **Merge `origin/main` into this branch, then merge/PR this branch to `origin/main`** — this
   session did NOT push or merge (explicitly deferred). Watch for conflicts with Sessions B/C if
   they've landed their own `goldens/{input,behaviour}.json` + composer-adjacent edits to
   `core/golden.js`/`survey-golden-conformance.js` in the meantime — the composer's collision guard
   (peer-vs-peer, not peer-vs-base) should make a genuine JSON-level conflict unlikely for
   `styling.json` itself, but the two shared JS files could still conflict textually.
4. **Decide whether to run the full predict-then-measure census** (`survey-golden-conformance.js
   --json`) as a closing step and record the real per-type MISSING/CONFORMANT/NOT-APPLICABLE
   numbers for box-4value/border/shadow/length-unit/alignment — only typography's numbers were
   captured this session (via the engine-fix verification pass); the other 5 types' rows have
   evidence for `qualifiesWhen` but not a final census run.
5. **The rollout lists** (12 border-style blocks, 10+/11+ alignment blocks) are real, scoped
   follow-up work — not blocking, but should land in `.claude/parking.md` if not picked up
   immediately, per this project's parking-entry convention.

## Files changed this session

```
M  plugins/sgs-blocks/scripts/inspector-scan/core/golden.js
M  plugins/sgs-blocks/scripts/surveys/survey-golden-conformance.js
M  plugins/sgs-blocks/src/blocks/heading/edit.js
M  plugins/sgs-blocks/src/blocks/multi-button/edit.js
M  plugins/sgs-blocks/src/components/DesignTokenPicker.js
M  plugins/sgs-blocks/src/components/ResponsiveBoxControl.js
M  plugins/sgs-blocks/src/components/SgsColourPanel.js
M  plugins/sgs-blocks/src/components/TypographyControls.js
M  plugins/sgs-blocks/src/components/index.js
?? plugins/sgs-blocks/scripts/consistency/goldens/styling.json   (new)
?? plugins/sgs-blocks/src/components/BorderStyleControl.js       (new)
?? plugins/sgs-blocks/src/components/SgsBoxControl.js             (new)
?? plugins/sgs-blocks/src/components/SgsLengthControl.js          (new)
```

None of the forbidden files were touched (`golden-controls.json`, `goldens/input.json`,
`goldens/behaviour.json`, `rules.json`, `package.json`) — confirmed via `git status` before writing
this handover.

## Report-back per the original brief's §8

- **Composer's absent-peer behaviour**: tolerates ENOENT, throws on genuine parse error or
  peer-vs-peer key collision (not peer-vs-base override, which is the expected finalisation path).
  Smoke-tested three ways: absent goldens/ dir, a fixture peer present, two peers claiming the same
  new key (throws as expected).
- **Per-type canonical shape + qualifiesWhen evidence + predicted-vs-measured counts**: all in
  `styling.json`, inline, per type — see above for headlines.
- **Gradient decision with evidence**: see §2 above and `styling.json`'s `_meta.gradientDecision`.
- **Anything that contradicted the brief**: (a) `core/golden.js` already existed, contrary to the
  brief's assumption — flagged and worked with, not around. (b) The composer's collision-guard
  design (as originally planned) was WRONG for this task and had to be corrected mid-session — see
  §1. (c) Scope grew substantially beyond "write contract rows" into real component builds
  (SgsBoxControl, BorderStyleControl, SgsLengthControl) and one shared-engine fix, all Bean-directed
  live during the session in response to live screenshots — not something the original brief
  anticipated, but each expansion was confirmed with Bean before building, per the project's
  design-gate rule for shared/high-blast-radius components.
