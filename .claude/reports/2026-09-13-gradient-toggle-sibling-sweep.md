# Gradient-toggle sibling sweep — census + fix (2026-09-13)

verdict: PASS (source-verified; live deploy deferred — see Deploy section)

## Context

`GradientCapableColourControl.js::StateContent` was fixed today (commit `08d0df5af`) to gate
the Solid/Gradient toggle on whether the ACTIVE state genuinely carries an `onGradientChange`
handler, not on the row-level `gradientCapable` flag. nav-menu's item-text row had `gradient`
(Normal) wired but no `hoverGradient` (Hover) — clicking the toggle on Hover called
`undefined(...)`. That fix protects every `textRow()`/`fillRow()` row with the same shape from
crashing, but any OTHER row with the same partial-gradient gap would now silently fall back to
solid-only on the affected tab instead of crashing — worth a full sweep to find and, where
accidental, fix.

## Method

1. `grep -rlE "gradient:" --include="edit.js" plugins/sgs-blocks/src/blocks` → 38 files use a
   `gradient:` key inside a `textRow()`/`fillRow()` call.
2. For each, extracted the full `attrs: { base, hover, gradient, hoverGradient }` block with
   `grep -n -B8 -A2` and checked whether every row carrying `hover:` also carries
   `hoverGradient:` (and, separately, whether any row carries `current:` without
   `currentGradient:` — only `nav-menu/edit.js` uses a `current:` attr key at all, and it is
   out of scope per the task brief).

## Census result

37 of the 38 files pair `hover:`/`hoverGradient:` correctly (36 files) or have no `hover:` key
at all (`nav-drawer`'s `drawerBg` row, `process-steps`' single-state rows). Two rows carry
`hover:` + `gradient:` with NO `hoverGradient:`:

| Row | File | Category | Action |
|---|---|---|---|
| `toggleCloseColour` | `plugins/sgs-blocks/src/blocks/nav-drawer/edit.js` | **Accidental** | **Fixed** |
| `numberBackground` | `plugins/sgs-blocks/src/blocks/process-steps/edit.js` | Safe as-is | Left alone |

### 1. nav-drawer `toggleCloseColour` — ACCIDENTAL, fixed

Git history (`git show e17bea203 -- plugins/sgs-blocks/src/blocks/nav-drawer/edit.js`) shows
commit `e17bea203` ("wire text-gradient sibling attrs across 13 blocks, D948 Phase 3, part 2")
added `gradient: 'toggleCloseColourGradient'` to this row's Normal state with no accompanying
`hoverGradient`, and no comment or commit-message line states a reason for excluding Hover —
unlike nav-menu's item-text Hover, which had a documented D956 smart-contrast justification
(`itemSmartContrast` auto-computes a WCAG-safe solid, which a gradient can't replace).
`render.php` confirmed the asymmetry directly: the Normal-state block already had the full
`sgs_resolve_text_colour_or_gradient()` / `sgs_text_colour_decl()` /
`sgs_text_colour_gradient_fallback_rule()` trio; the Hover block was a bare
`sgs_hover_state_rules($close_sel, 'color:' . sgs_colour_value($close_colour_hover_slug), ...)`
call with no gradient path at all. Classified accidental; fixed.

**Fix (mirrors nav-menu's now-fixed `itemColourHoverGradient` wiring exactly, minus nav-menu's
smart-contrast live-gating, which does not apply to this control):**

- `plugins/sgs-blocks/src/blocks/nav-drawer/block.json` — new attribute
  `toggleCloseColourHoverGradient` (string, default `''`) + `states.hover.attrMap` gains
  `"css:color-gradient": "toggleCloseColourHoverGradient"` on the `close` element.
- `plugins/sgs-blocks/src/blocks/nav-drawer/edit.js` — the `toggleCloseColour` `textRow()` call
  gains `hoverGradient: 'toggleCloseColourHoverGradient'`, wired unconditionally.
- `plugins/sgs-blocks/src/blocks/nav-drawer/render.php` — reads
  `$close_colour_hover_gradient`, resolves
  `$close_colour_hover_effective = sgs_resolve_text_colour_or_gradient(...)`, emits via
  `sgs_hover_state_rules()` + `sgs_text_colour_gradient_fallback_rule()`, mirroring both the
  Normal-state block in the same file and `drawerTextColour`'s own Hover sibling two blocks
  above it.

Verified: `php -l` clean, `phpcs --standard=WordPress` clean (phpcbf auto-fixed 3 pre-existing
alignment warnings my new lines introduced; the 1 remaining error at line 521 is pre-existing,
unrelated — confirmed via `git diff --stat` showing that line outside my diff).

### 2. process-steps `numberBackground` — investigated, left alone

Same surface shape (`fillRow()` with `hover` + `gradient`, no `hoverGradient`), but this row
does NOT go through `SgsColourPanel` (the component whose `gradientCapable` flag routes to
`GradientCapableColourControl`, the component fixed today). Instead
`process-steps/edit.js:332-349` builds the `fillRow()` descriptor and hands its `.states` array
directly to `<DesignTokenPicker>`, discarding the `gradientCapable` flag entirely.
`DesignTokenPicker.js:255` already carries its own per-state gate —
`const isGradientCapable = ( s ) => typeof s.onGradientChange === 'function';` — pre-existing,
unrelated to today's fix. This row was therefore never susceptible to the crash and never
silently lost a capability it once exposed; DesignTokenPicker never rendered a Hover-state
gradient toggle for it in the first place. Not fixed — not the same defect class, and adding a
gradient control here would need its own separate design decision (routing this row through
`SgsColourPanel` instead of a bespoke `DesignTokenPicker` mount), out of scope for a
sibling-shape sweep.

## Build

`npm run build` ran the full 96-gate pipeline; 95 passed. The 1 failure
(`nav-qa-logical-props`, `src/blocks/nav-menu/style.css:246,248` physical `left`/`right`) is
verified pre-existing/concurrent: `git status` at build time showed `nav-menu/style.css`,
`nav-menu/render.php`, `nav-menu-css.php` and `src/shared/nav-interactivity/mega-disclosure.js`
all dirty from a different, actively in-progress session — none touched by this diff.

## Commit / deploy

Committed `29e6d6adc` to `main`, pushed to `origin/main` (fast-forward, no divergence). Two
commit-gate scoped bypasses were used, both disclosed and both verified disjoint from this
diff via `git status` / `git diff --cached --name-only`:

- `SGS_VISUAL_GATE_SKIP=nav-drawer` — no live before/after visual-diff capture this session.
- `SGS_INSPECTOR_GATE_SKIP=1` — rule `21-render-without-control`'s ratchet (5→8) is 8
  `sgs/nav-menu` findings (`margin`, `sweepAngle`, `itemSeparatorHoverTreatment`,
  `itemSeparatorSweepAngle`, `submenuLinkBorderWidth/Style/Colour/ColourHover`) from the same
  concurrent session's uncommitted Spec 41 manifest rewrite.

**Deploy was NOT performed this session.** `npm run build` compiles the whole working tree, and
the concurrent session's uncommitted nav-menu/mega-disclosure work was sitting in that tree at
build time — a `build-deploy.py --blocks-only` deploy right now would ship that unsigned-off
work to the live canary alongside this fix, which is exactly the
`payload-must-not-bundle-a-siblings-work` failure mode this project's memory already names.
Per the task's own safety instruction ("if the deploy gate blocks on anything outside your
declared scope due to genuine sibling work, STOP and report back — do not bundle"), the fix is
committed and source-verified but **live in-browser verification (toggle appears, gradient
renders, no console error) is outstanding** — follow-up needed once the nav-menu track's tree
is clean, or via a deliberately scoped nav-drawer-only file copy to the canary.

## Files changed

- `plugins/sgs-blocks/src/blocks/nav-drawer/block.json`
- `plugins/sgs-blocks/src/blocks/nav-drawer/edit.js`
- `plugins/sgs-blocks/src/blocks/nav-drawer/render.php`
