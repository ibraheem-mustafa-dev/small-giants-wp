# W3-G report: R1 (canvasSettable respects the emission selector) and P3d (transientOf needs animation evidence)

Files touched: `scripts/computed-route/lib/triage.mjs`, `scripts/computed-route/tests/triage.test.mjs`.
`tests/solve.test.mjs` needed no change (see Concerns). Nothing committed, staged, deployed or reseeded.

## R1

### What changed (all in `lib/triage.mjs`)
- `emissionOf( cite, props, ctx )` (new, exported) returns the classes and pseudo-elements a control emits to, or null (unknown).
  Channel 1: `ctx.emissionFor( block, setting, property )` returning selector strings. Channel 2: the PHP index `ctx.helpers`
  (already built by `triage.mjs::runTriage`): every `sgs_*` function that emits the property AND sits in a file naming the
  setting (the controls' docblock) contributes the `.sgs-*` classes and `::` pseudos in its string literals. Functions that emit
  to the root (`$uid . '{'`) are skipped. No table, no DB column (the DB `css_element` is NULL for every `bgHoverZoom*` row).
- `reachesElement( cite, issue, ctx )` (new, exported): true when emission is unknown, or when the row element's classes
  (subject of `r.path`, subject of the owner path for the cited block, `.sgs-<slug>` for a root row) include an emitted
  class, or the row's pseudo is an emitted pseudo on the cited block itself.
- `canvasSettable` now only credits an attribute row that `reachesElement`; the search continues to other blocks otherwise.
- `resolveIssue` drops the ancestor hop's `cite` (and its `canvasSettable` flag) when `citeReaches` fails, so the hop
  channel is held to the same rule. The row then keeps the resolver's own gap (`no-setting` -> F).
- The mechanism is not scoped to transitions: any property, any control, decided by emission selector.

### How reachability is decided now
Property-name match first (unchanged), then emission: a control with a KNOWN emission is credited only if the row's element
can be matched by what it emits to. Unknown emission keeps the old credit (refusing unknowns would turn every such claim
into a false F; the 209 claims show most controls are root-level or computed).

### Negative controls (command: `node --test scripts/computed-route/tests/triage.test.mjs scripts/computed-route/tests/solve.test.mjs`)
Run by temporarily editing the code, then restoring from a backup (final file verified green).
- Red on revert: `reachesElement` forced to ignore emission -> 3 tests fail (form-input refusal for all three
  bgHoverZoom properties on the real PHP, the `emissionFor` refusal, the hop-cite refusal).
- Over-suppression half: `reachesElement` forced to refuse everything -> 6 tests fail, including the genuine
  `.sgs-container__image-bg` credit for Duration, Easing and Scale, and the pre-existing mega-panel canvas-settable tests.
- Unknown-emission credit is its own test (`helpers: helperIndex([])`).

### Real data (positive control)
Re-ran `triage.mjs --client eye-care-ward-end --surface <s> --out <scratch>` for all 17 surfaces (read-only, nothing in
`sites/` overwritten) and compared with the stored `qa/triage/*.json`:
- bgHoverZoomDuration/Easing/Scale claims classed `W/canvas-settable`: stored 13 + 5 + 2 = 20, now **0**.
  **The 3 bgHoverZoom families are no longer `W/canvas-settable`.**
- All canvas-settable claims 209 -> 199 (the other 10 of the 20 re-cite another control).
- Whole-sweep class counts: W 1296 -> 1294, T 378 -> 372, F 193 -> 201, U 30 -> 30. The stored triage files predate other
  commits and P3d, so not every delta is R1's; I did not apportion them.

## P3d

### What changed
`transientOf( rows, walk )` (signature gains `walk`; `triageIssue` passes `ctx.walk`). A start-value shape (opacity < 1,
a translate) is transient only when the SAME side's snapshot (`walk.runs[width/state].pairs[pair].draft|live`) shows an
animation in flight: its `running` list is non-empty, and when the side records `keyframes` they must animate the row's
property (`KEYFRAME_PROP`). New helpers: `animating`, `snapshotOf`. An animation on the other side, or on another
property, no longer excuses the row. No `running` data means not transient.

### Negative controls
- Red on revert (`animating` always true): 3 tests fail (resting 0.75 reported, other-side animation, other-property).
- Over-suppression half (`animating` always false, i.e. exemption deleted): 2 tests fail (genuine mid-animation opacity
  stays transient; transform keyframes keep a transform row transient).
- The old test `a mid-animation opacity row is W, transient` was rewritten to supply a `running` snapshot.

## Test output
`node --check lib/triage.mjs`: ok. Final run: pass 90, fail 0 (triage + solve tests).

## Concerns
- `scripts/computed-route/solve.mjs::writeRound` (not my file) sets `r.canvasSettable = !! hop.gap` from the same hop cite
  with no emission check, so Solve's own report still flags such gaps; triage no longer trusts it. A follow-up lane should
  apply `triage.mjs::reachesElement` there. `solve.test.mjs` therefore needed no change.
- Emission is read by string search of PHP literals; a control that emits through a class method (not an `sgs_*`
  function) reads as unknown and keeps its credit. Wiring the emission selector into the DB (`css_element`) would be the
  durable fix but touches block.json and the seeder, outside this lane.
