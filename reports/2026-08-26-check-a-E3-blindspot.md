# CHECK A — the E3 (`usedOutsideControls`) blind spot

**Scope:** `plugins/sgs-blocks/scripts/check-editor-render-parity.js`, CHECK A ("editor-canvas
desync"), exemption signal E3. Read-only investigation; no source changed. All counts below are
either a literal `grep`/`node` enumeration over real files (labelled ENUMERATED) or a figure
derived from three parallel Explore agents that opened real `edit.js`/`render.php` pairs and
quoted file:line evidence, which I then independently re-verified against the source myself
(labelled SAMPLED — VERIFIED). Where I extrapolate beyond what was actually opened, it is marked
ESTIMATE.

---

## 1. What E3 (`usedOutsideControls`) actually counts as "used"

Built by `collectUsedIdentifiersOutsideExcluded()` (`check-editor-render-parity.js:2138-2179`),
fed by `collectExcludedRanges()` (`:2108-2120`).

**Plain English:** E3 walks the whole `edit.js` AST and records every bare identifier name that
appears *anywhere in the file*, in a position that looks like a read rather than a declaration —
**except** inside the JSX subtree of a literally-named `<InspectorControls>` or `<BlockControls>`
element. If the attribute's name shows up as an `Identifier` node ANYWHERE else — a `style={{ }}`
object value, a function-call argument, a hardcoded property key being written to, a `console.log`,
a comment-adjacent dead branch — it counts as "used outside controls" and the attribute is exempt
from CHECK A, full stop. **There is no dataflow tracing.** It never asks whether that reference
reaches a rendered DOM node, whether the call it's passed into returns something usable, or
whether the branch it sits in is ever true in the editor.

The only two boundaries this function draws are structural, not semantic:

- `collectExcludedRanges()` (`:2108-2120`): `EXCLUDED_JSX_CONTAINERS = new Set(['InspectorControls', 'BlockControls'])` (`:1950`) — matched by the **literal JSX tag name only**. Any JSX subtree opened by a tag with either of those two exact names is skipped entirely.
- `collectUsedIdentifiersOutsideExcluded()` (`:2138-2179`) then excludes only: the attribute NAME half of a JSX attribute (`value={x}`'s `value`), a JSX tag/closing name, a `Foo.Bar` JSXMemberExpression, import specifiers, and — critically — an `ObjectProperty` key that is either (a) the destructuring pattern itself or (b) a non-computed object-literal key (`setAttributes({ attr: val })`'s `attr`). Everything else that is an `Identifier` node counts as "used".

So E3's real question is **"does this name appear as a value-position identifier outside two
specific JSX tag names?"** — never "does this reference paint anything."

## 2. Failure modes E3 admits — confirmed against the real tree

The task brief suspected four shapes. All four are confirmed live in this codebase, plus one more
found independently while verifying the sample (§3/§5), and the coordinator's follow-up
identified two more structural mechanisms not on the original list. Consolidated:

**(a) Value passed to a helper that discards/mangles it.** Confirmed twice, independently of the
canonical `colourVar()` precedent (which is already patched — see §5):
- `resolveShadowPreviewComposed()` (`plugins/sgs-blocks/src/utils/tokens.js:135-144`) —
  ```js
  export function resolveShadowPreviewComposed( shape, colour ) {
      if ( ! shape ) return undefined;
      const isRawShape = /^inset|^-?\d/.test( shape );
      if ( ! isRawShape ) return `var(--wp--preset--shadow--${ shape })`;
      return `${ shape } ${ colour || 'rgba(0,0,0,0.1)' }`;
  }
  ```
  `colour` is concatenated **raw** — never passed through `colourVar()`. Its PHP sibling,
  `sgs_shadow_value_composed()` (`includes/helpers-tokens.php:703-723`), DOES resolve it —
  `$resolved_colour = sgs_colour_value( $colour ? $colour : '' );` (line 717) — before
  concatenating. So a client picking a **palette slug** (e.g. `primary`) for `cardShadowColour`
  produces `box-shadow: 0 4px 6px primary` client-side (invalid CSS → whole declaration dropped
  silently by the browser) while the server renders `0 4px 6px rgb(197,106,122)` correctly. This
  is exactly the D792 `colourVar()` shape, on a sibling helper D792's fix never touched. Confirmed
  live caller: `team-member/edit.js:189` passes `cardShadowColour` straight through with no
  resolver.
- `resolveTextColourPreviewStyle( flatValue, gradientValue, resolveSolid )` (`tokens.js:169-182`)
  returns `{ color: resolveSolid ? resolveSolid( flatValue ) : flatValue }` — if the caller omits
  `resolveSolid`, a slug passes through raw. Eight call sites pass `colourVar` correctly
  (`heading:143`, `label:159`, `counter/edit.js:82`, `pricing-table:571,594`, `product-card:759`,
  `team-member:209`, `text:170`) — but `testimonial/edit.js:267` calls it as
  `resolveTextColourPreviewStyle( quoteColour, quoteColourGradient )` with **no third argument at
  all**. `quoteColour` is a real client-pickable colour (control at `testimonial/edit.js:405-407`).
  A custom/slug pick on `quoteColour` therefore silently fails to paint in the canvas exactly like
  the pre-D792 `backgroundColour` bug — a sixth live instance of the same defect family, found
  independently of the sample and not covered by any of the four named root causes below.

**(b) Attr spread into an object never applied to a rendered element.** Confirmed as the dominant
shape in the sample (§3) — see root cause 1.

**(c) Attr used only inside a branch false in the editor.** Confirmed by the coordinator's B/C
findings as a *hover-state* variant: `sgs/heading.backgroundColourHover`,
`sgs/post-grid.backgroundColourHover`, `sgs/post-grid.borderColourHover` are documented
(`post-grid/edit.js:419-423,434-442`) to be emitted **only** by
`sgs_emit_state_colour_css()` server-side — there is no `:hover` simulation toggle in any of these
edit.js files, so the branch that would paint them is never reachable in the editor at all, not
just "false right now".

**(d) Attr applied to an element not rendered in canvas.** Not confirmed as literally-not-rendered
in the sample, but a close cousin was: `sgs/form-field-number.max` (`edit.js:155`,
`max={max}` on a real `<input type="number" ... disabled>`) — the reference IS a genuine, correct
JSX-attribute application to a genuinely-rendered element, but the element is `disabled`, so the
attribute has zero visible or interactive manifestation. E3 has no concept of "rendered but inert"
— this is a fifth failure shape, not on the original four-item list.

## 3. Stratified sample — 60 pairs across 20 blocks (SAMPLED — VERIFIED)

Sample drawn from `reports/2026-08-26-check-a-exemption-differential.json`'s `E3` array (561
pairs total, 69 distinct blocks — ENUMERATED via `node`). I took the first 3 attributes per block
for 20 blocks spanning small/large blocks and colour-heavy/non-colour blocks, dispatched three
parallel read-only agents (7/7/6 blocks each), then pulled their full per-pair evidence and
independently re-verified the four claimed root-cause mechanisms against the real source myself
(§4).

**Aggregate result (60 pairs):**

| Classification | Count | % |
|---|---:|---:|
| REAL-MISS | 17 | 28.3% |
| CORRECT-EXEMPTION | 42 | 70.0% |
| UNCERTAIN | 1 | 1.7% |

By group: A (container/hero/testimonial/trust-bar/option-picker/pricing-table/process-steps) —
7/14/0 of 21; B (quote/button/heading/mega-panel/post-grid/site-footer-row/site-header-row) —
4/17/0 of 21; C (icon-list/countdown-timer/form-field-number/nav-drawer/tabs/team-member) —
6/11/1 of 18.

The one UNCERTAIN pair (in group C) was not chased further for this report — the group's own
finding was that it needs a live browser check the static read couldn't resolve; it is not part of
any of the four root causes below.

## 4. Four root causes behind the 17 REAL-MISS pairs

I re-opened and independently verified each of the following against the real source (not just
trusting the sampling agents' prose) before writing this section.

### Root cause 1 — shared control components are invisible to `collectExcludedRanges()` (dominant — 14 of 17)

**Verified.** `SgsColourPanel` (`plugins/sgs-blocks/src/components/SgsColourPanel.js:103,115-137`)
renders its OWN `<InspectorControls group="styles">` internally:
```js
import { InspectorControls } from '@wordpress/block-editor';
...
return (
    <InspectorControls group="styles">
        ...
    </InspectorControls>
);
```
But a consuming block's `edit.js` mounts it as `<SgsColourPanel rows={[...]}>` — a JSX tag literally
named `SgsColourPanel`, not `InspectorControls`. `collectExcludedRanges()` only matches
`EXCLUDED_JSX_CONTAINERS = {'InspectorControls', 'BlockControls'}` by **exact tag name** in the
CALLING file's own AST — it has no knowledge that `SgsColourPanel` is itself a wrapper. So every
identifier referenced only inside a `rows={[...]}` prop object (e.g. `value: backgroundColour`,
`onChange: (val) => setAttributes({ backgroundColour: val ?? '' })`,
`gradientValue: borderColourGradient`) sits OUTSIDE any excluded range and satisfies
`usedOutsideControls`, even though that reference only ever reaches the control itself, never
anything painted.

**Confirmed instances (14/17):** testimonial.borderColourHoverGradient, trust-bar.backgroundColour,
trust-bar.backgroundColourGradient, option-picker.borderColourGradient,
process-steps.backgroundColour, process-steps.borderColourGradient (group A, 6 of its 7);
heading.backgroundColourGradient, heading.backgroundColourHover, post-grid.backgroundColourHover,
post-grid.borderColourHover (group B, all 4); icon-list.borderColourGradient,
tabs.panelBorderColourGradient, countdown-timer.labelColour, countdown-timer.numberColour (group
C, 4 of its 6). Each was checked to have no OTHER real-sink reference anywhere else in its
edit.js — i.e. this is genuinely the sole reason E3 exempted it, not a coincidence alongside a
real (broken) sink.

**Blind-spot size (ENUMERATED):** `grep -rl "<SgsColourPanel" plugins/sgs-blocks/src/blocks --include=edit.js` returns **65 of 84 blocks** (77%) mounting this component. Cross-referencing the
full 561-pair E3 list against "attribute name matches `/colour|color/i` AND its block mounts
`SgsColourPanel`" gives **193 of 561 (34.4%)** candidate-exposed pairs — an upper bound on this
one mechanism's reach, since not every one of the 193 is necessarily exclusively referenced inside
the panel (some will be correctly-exempt, as seen in the sample).

### Root cause 2 — gradient sibling dropped from the preview-style builder (5 of 17, all subsumed under cause 1)

**Verified as real, and verified as NOT a separate E3-detection mechanism — it's the underlying
*block* defect that cause 1 is hiding, not a second way E3 gets fooled.** The pattern:
`testimonial.borderColourHoverGradient`, `option-picker.borderColourGradient`,
`process-steps.borderColourGradient`, `icon-list.borderColourGradient`,
`tabs.panelBorderColourGradient` — in each case the FLAT colour sibling (`borderColour` etc.) IS
correctly consumed by a real preview-style-building function and DOES paint in canvas, but the
`*Gradient` sibling is simply absent from that same function's destructuring/consumption. E.g.
`option-picker/edit.js`'s `buildRootPreviewStyle()` (`:93-158`) reads `borderColour` (`:124-128`,
applied) but never `borderColourGradient` — the gradient branch doesn't exist in that function at
all. Each of these 5 pairs' `usedOutsideControls`-satisfying reference is still the SgsColourPanel
`rows` prop (root cause 1's carrier), so fixing root cause 1 alone will correctly re-flag all 5 —
but the underlying fix these 5 actually need is a BLOCK code change (add the gradient branch to
each preview-style builder), not a checker change.

### Root cause 3 — `resolveShadowPreviewComposed()` reintroduces the pre-D792 raw-concatenation bug (1 of 17 sampled, confirmed wider)

**Verified as a genuine live bug, distinct from root cause 1** — see §2(a) above for the full
mechanism and the PHP-vs-JS diff. Sample instance: `team-member.cardShadowColour`
(`team-member/edit.js:189`, inside `buildWrapperStyle()`) — this reference is a REAL, correctly-
reached paint sink (a CSS custom property that does get applied), not a SgsColourPanel-prop
artefact, so root cause 1's fix would NOT catch this one: the attribute genuinely reaches
something rendered, and E3 has no way to know the thing it reaches is semantically broken for a
subset of inputs.

**Every other helper in `utils/tokens.js` with the same shape (ENUMERATED — read the whole file,
10 exported functions):** `colourVar`, `spacingVar`, `shadowVar`, `fontSizeVar`,
`borderRadiusVar`, `transitionVar` all wrap their argument unconditionally in a `var(--...)`
string — they don't do a raw-value passthrough at all, so they can't hit this exact bug shape
(they have their OWN, opposite bug — the pre-D792 `colourVar()` shape — which `colourVar` alone
was patched for, per its docstring at `tokens.js:17-39`, dated D792/2026-08-28). `resolveShadowPreview`
(`:115-121`) uses a regex (`/^var\(|^inset|^rgb|^0 |^\d/`) to decide raw-vs-slug and is therefore
safe for the shadow-shape case it targets. `resolveBackgroundPaintPreviewStyle` (`:206-221`)
correctly calls `colourVar( flatValue )` before use. **`resolveShadowPreviewComposed` (`:135-144`)
is the only exported helper in this file that concatenates a second, colour-typed argument
directly into a template literal with no resolver call at all.** Its three other call sites
(`button/edit.js:313`, `cta-section/edit.js:125`, `trust-bar/edit.js:313,1019`) were checked:
`button` pre-resolves via `resolveColourToken( boxShadowColour, palette )` before calling it (safe);
`cta-section` and `trust-bar` pass `attributes.shadowColour` / `iconCircleShadowColour` /
`badgeImageShadowColour` straight through, unresolved — the same live bug as `team-member`, just
outside the 60-pair sample.

### Root cause 4 — coincidental property-name / attribute-name collision (1 of 17)

**Verified.** `hero/edit.js:313`:
```js
if ( ! isSplit && backgroundImage?.url ) {
    wrapperStyle.backgroundImage = `url(${ backgroundImage.url })`;
    wrapperStyle.backgroundSize = 'cover';
    wrapperStyle.backgroundPosition = 'center';
}
```
`wrapperStyle.backgroundPosition = 'center'` is a **hardcoded literal** — this line never reads
`attributes.backgroundPosition` or the destructured `backgroundPosition` binding anywhere. The
real control for the `backgroundPosition` attribute lives inside `<BackgroundPanel>`
(`hero/edit.js:1606`), correctly mounted inside `<InspectorControls group="styles">`
(`:857`-onward) — that part is fine. The bug is purely in `collectUsedIdentifiersOutsideExcluded()`:
a non-computed `MemberExpression` property (`wrapperStyle.backgroundPosition`) is visited as an
`Identifier` node with no exclusion rule distinguishing "this is a WRITE of an unrelated literal
into a same-named property key" from "this is a genuine read of the attribute's value." Any block
that happens to hardcode a CSS-property-shaped literal whose name collides with one of its own
attribute names will trip this, independent of root cause 1 entirely — this pair's `wrapperStyle`
build isn't inside a `SgsColourPanel` prop at all, it's a plain object mutation before the JSX
return.

## 5. Context: the archetype miss (`colourVar()`) is already fixed on disk

The task brief's "miss 3" (`colourVar()` dropping every custom colour, D792/D605-era) is **already
patched** in the current tree: `utils/tokens.js:44-64` now checks `CSS.supports('color', value)`
and passes real CSS colours through untouched, falling back to the `var(--wp--preset--color--…)`
wrap only for genuine slugs. `.claude/decisions.md:522-598` (D792) documents the discovery and
states the wider 120-call-site fix (`colourValue()`) was pending Bean's approval as a SEPARATE
function — the code on disk now shows `colourVar()` itself carries the fix directly (dated
2026-08-28 in its own docstring), which is AHEAD of what `decisions.md` currently records; I could
not reconcile this discrepancy from documentation alone (no matching later D-entry exists) and am
flagging it rather than asserting a cause. What matters for this report: the ARCHETYPE bug is
gone from `colourVar()` itself, but §2(a)/§4 root cause 3 show the exact same failure shape is
still live in `resolveShadowPreviewComposed()` and in the one `resolveTextColourPreviewStyle()`
call site missing its `resolveSolid` argument — the class of bug was patched once, not
systemically, and E3 could not have told the difference either time.

## 6. Extrapolated REAL-MISS rate across all 561 hidden E3 pairs — ESTIMATE, not enumeration

Two extrapolations, both marked ESTIMATE:

**Naive (flat sample rate):** 17/60 = 28.3% → 0.283 × 561 ≈ **159 pairs**.

**Stratified by mechanism (more grounded — root cause 1 dominates and is size-able):** Split the
60-pair sample into "candidate" (colour-ish attribute name AND block mounts `SgsColourPanel` —
26 of 60 pairs) vs "other" (34 of 60). Within candidate, 15/26 REAL-MISS (14 root-cause-1 + 1
root-cause-3, both colour-ish/SgsColourPanel-block) = 57.7%. Within other, 2/34 REAL-MISS
(hero.backgroundPosition, form-field-number.max) = 5.9%. Applying these rates to the full
population split (193 candidate / 368 other, ENUMERATED from the 561-pair list): 0.577 × 193 ≈
111 + 0.059 × 368 ≈ 22 = **≈133 pairs**.

**Stated estimate: roughly 130-160 of the 561 hidden E3 pairs (23-28%) are REAL-MISS**, i.e.
attributes E3 currently exempts that the editor canvas genuinely does not reflect.

**Confidence: MODERATE.** Reasons for moderate rather than high: (a) the sample is 60/561 (10.7%)
across 20/69 blocks (29%) — a meaningful fraction but not close to full coverage; (b) the three
independently-dispatched groups landed at noticeably different raw rates (33%, 19%, 33%) before
stratification narrows that gap, meaning block-to-block variance is real and my 20-block sample
may not represent the other 49 blocks' mix of colour-panel-heavy vs plain-text/layout attributes;
(c) the stratified estimate leans on a mechanical name-pattern proxy (`/colour|color/i` + "block
mounts SgsColourPanel") as a stand-in for "this pair's sole reference sits inside the panel prop"
— that proxy is not the same claim I verified file-by-file, only a scalable approximation of it.
Reasons it isn't LOW confidence: root cause 1 is a single, mechanically-checkable code shape
(component wraps `InspectorControls` internally, consumed under its own tag name) that recurred
identically in 14 of 17 real misses across three independently-sampled block groups with no
overlap in blocks — that's a strong, convergent structural signal, not a coincidence of the
sample.

## 7. Proposed narrowest fixes per root cause (NOT implemented)

### For root cause 1 (dominant, 14/17 sampled, ~193/561 candidate exposure)

**Proposal:** Before calling `collectExcludedRanges()`, statically resolve every capitalised JSX
tag name mounted in `edit.js` (the file already builds this exact tag→file resolution for the
R3-a "shared component destructures/writes the attribute" case at `:2374-2400`, via
`COMPONENT_FILE_MAP`). For each resolved component file, parse it and check whether its `return`
statement's outermost JSX element is `<InspectorControls ...>` or `<BlockControls ...>` (i.e. the
component's entire rendered output IS a controls wrapper, nothing else). If so, union that
component's own tag name into `EXCLUDED_JSX_CONTAINERS` for this file's analysis pass, so
`<SgsColourPanel rows={[...]}>` becomes an excluded range exactly like a literal
`<InspectorControls>` would be.

**What it newly flags:** the 14 confirmed pairs (and, by the same mechanical shape, most of the
~193 candidate pairs across the 65 `SgsColourPanel`-mounting blocks) — any attribute whose ONLY
edit.js reference sits inside a resolved wrapper-only component's props.

**What it would still miss:** (i) root cause 3 — the reference reaches a genuine sink, so it's
correctly left exempt, but the sink itself silently drops the value; a range fix cannot see
inside a function's return value. (ii) root cause 4 — unrelated to component boundaries at all.
(iii) the disabled-element case (§2d) — a genuine, correctly-wired reference to a rendered-but-
inert element. (iv) any FUTURE shared component with a similar wrapper shape that also renders
something outside the controls (e.g. a live preview swatch alongside its `InspectorControls`) —
the "entire return is a controls wrapper" check would correctly decline to exempt it, which is
safe (a false negative stays a false negative, not a new false exemption) but such a component
would need its OWN bespoke handling to be usefully exempted.

### For root cause 2 (not a checker fix — a block-code gap)

No E3 change is needed or sufficient; fixing root cause 1 will correctly re-flag all 5 sampled
instances. The actual remediation is per-block: add the missing `*Gradient` branch to each
block's preview-style-building function (`buildRootPreviewStyle()`,
`wrapperPreviewStyle`, etc.) so the gradient sibling paints in canvas like its flat counterpart
already does.

### For root cause 3 (helper-level semantic bug — narrow allow-list signal)

**Proposal:** Add a new, deliberately small SIGNAL to CHECK A (not an exemption — a
**downgrade-to-manual-review** flag) that fires when an attribute's `usedOutsideControls`-
satisfying reference is an argument to a CallExpression whose callee is NOT on a maintained
allow-list of "proven-safe preview resolvers" (`colourVar`, `spacingVar`, `shadowVar`,
`fontSizeVar`, `borderRadiusVar`, `transitionVar`, `resolveShadowPreview`,
`resolveBackgroundPaintPreviewStyle`, and `resolveTextColourPreviewStyle` ONLY when called with
all three arguments). Any OTHER wrapping call — including `resolveShadowPreviewComposed`, or
`resolveTextColourPreviewStyle` called with two arguments — would surface as a distinct
"unverified-resolver" finding rather than being silently folded into the existing exemption.

**What it newly flags:** `team-member.cardShadowColour` plus the wider live instances found
outside the sample (`cta-section.shadowColour`, `trust-bar.iconCircleShadowColour`,
`trust-bar.badgeImageShadowColour`, `testimonial.quoteColour`).

**What it would still miss:** any bug inside an ALLOW-LISTED helper (the allow-list is trust-once,
not re-verified per call); any helper that isn't a *named, statically-resolvable* function (e.g.
an inline arrow function built per-block that has the same raw-concatenation shape); allow-list
staleness if a "safe" helper is later edited to reintroduce the bug with no process forcing the
allow-list to be re-examined.

### For root cause 4 (coincidental name collision — narrow syntactic exclusion)

**Proposal:** In `collectUsedIdentifiersOutsideExcluded()`, add one more exclusion: an `Identifier`
whose parent is a non-computed `MemberExpression.property`, where that `MemberExpression` is the
`left` of an `AssignmentExpression` whose `right` is a Literal (string/number/boolean) or a
template literal containing no reference to the SAME identifier name — i.e. "writing a hardcoded
value into a property that happens to share the attribute's name" stops counting as a "use".

**What it newly flags:** `hero.backgroundPosition` (and any other block with the same hardcoded-
literal-into-a-same-named-property shape — not separately enumerated here, out of scope for this
report).

**What it would still miss:** scope-shadowing variants (a LOCAL variable, not a MemberExpression,
declared with the same name and assigned a literal, then used elsewhere) — E3's matching is
name-based across the whole file with no scope awareness, and this narrow fix only targets the
MemberExpression-write shape actually observed; a computed-property write
(`wrapperStyle[computedKeyThatEvaluatesToBackgroundPosition] = 'center'`) would also still slip
through.
