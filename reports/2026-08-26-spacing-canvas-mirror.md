# Spacing canvas-preview mirror — 2026-08-26

## What was extracted

`sgs/container`'s local, unexported `boxShorthand()` and `resolveBoxTierPreview()`
(previously `src/blocks/container/edit.js` lines ~117-155) were moved verbatim
(same implementation + docblocks) into a new shared module:

- `plugins/sgs-blocks/src/utils/spacing-preview.js` — exports `boxShorthand`,
  `resolveBoxTierPreview`, and a new convenience wrapper `spacingPreview()`
  that resolves BOTH padding and margin for the active preview tier and
  returns only the keys that have something to paint (`{}` omits a key
  entirely when unset, matching `boxShorthand()`'s own contract).
- Re-exported through the existing barrel `src/utils/index.js`
  (`export * from './spacing-preview';`), alongside the `background-preview`
  export added earlier in the same session.

`sgs/container`'s `edit.js` now imports `boxShorthand`/`resolveBoxTierPreview`
from `../../utils` instead of defining them locally — the two local function
bodies were deleted; the call sites at the padding/margin preview lines are
unchanged (same function names, same call shape).

## `spacingPreview()` contract

```
spacingPreview(
  { basePadding, paddingTablet, paddingMobile, baseMargin, marginTablet, marginMobile },
  tier
) -> { padding?: string, margin?: string }
```

The BASE box is taken as an explicit argument rather than hard-coded, because
the base tier's source differs per calling block (see below).

## Base-tier resolution per block

| Block | Base padding/margin source | Tablet/mobile override attrs |
|---|---|---|
| `sgs/container` | `attributes.padding` / `attributes.margin` (block-owned, pre-Spec-35 shape) | `attributes.paddingTablet/Mobile`, `attributes.marginTablet/Mobile` |
| `sgs/multi-button` | `attributes.style?.spacing?.padding` / `…margin` (WP-native) | Padding: `paddingTablet`/`paddingMobile` declared. **Margin: NO tier attrs declared in block.json** — `supports.spacing.margin` is native-only with no `marginTablet`/`marginMobile` custom attributes, so `spacingPreview()` is called with those two arguments `undefined` and only the base/native margin previews (correct — there is nothing else to mirror). |
| `sgs/physics-canvas` | `attributes.style?.spacing?.padding` / `…margin` (WP-native) | Full set: `paddingTablet/Mobile`, `marginTablet/Mobile` — all declared, verified in block.json |
| `sgs/site-footer` | `attributes.style?.spacing?.padding` / `…margin` (WP-native) | Full set, all declared |
| `sgs/site-header` | `attributes.style?.spacing?.padding` / `…margin` (WP-native) | Full set, all declared |
| `sgs/trust-bar` | `attributes.style?.spacing?.padding` / `…margin` (WP-native) | Full set, all declared |

## Active-tier ("previewTier") mechanism per block

None of the five blocks had an existing device-tier read for their canvas
preview (their background/other previews are tier-agnostic). Each was wired
with the SAME `useSelect` read `sgs/container` uses (`core/editor`
`getDeviceType()`, mapped `Tablet`→`tablet`/`Mobile`→`mobile`/else `desktop`),
per the task's instruction to follow container's mechanism exactly when a
block has none of its own. `useSelect` was already imported in
`site-footer/edit.js` and `site-header/edit.js`; a fresh import of
`useSelect` from `@wordpress/data` was added to `multi-button/edit.js`,
`physics-canvas/edit.js`, and `trust-bar/edit.js`.

## Files changed

- `plugins/sgs-blocks/src/utils/spacing-preview.js` — **new**
- `plugins/sgs-blocks/src/utils/index.js` — added barrel export
- `plugins/sgs-blocks/src/blocks/container/edit.js` — adopts the shared module, local copies removed
- `plugins/sgs-blocks/src/blocks/multi-button/edit.js` — wired (padding only tiered; margin base-only)
- `plugins/sgs-blocks/src/blocks/physics-canvas/edit.js` — wired (full padding+margin tiers)
- `plugins/sgs-blocks/src/blocks/site-footer/edit.js` — wired (full padding+margin tiers)
- `plugins/sgs-blocks/src/blocks/site-header/edit.js` — wired (full padding+margin tiers)
- `plugins/sgs-blocks/src/blocks/trust-bar/edit.js` — wired (full padding+margin tiers)

## Verification

### 1. Parse-check (`@babel/parser`, `sourceType:'module'`, `plugins:['jsx']`)

Run from inside `plugins/sgs-blocks` (module resolution requirement). The
checker was proven first against a deliberately broken copy of
`container/edit.js` (an unclosed brace appended) — it correctly reported
`FAIL` with a parse error, then all 8 real files parsed clean:

```
FAIL <broken-test.js>   Unexpected token (757:0)
OK   src/blocks/container/edit.js
OK   src/blocks/multi-button/edit.js
OK   src/blocks/physics-canvas/edit.js
OK   src/blocks/site-footer/edit.js
OK   src/blocks/site-header/edit.js
OK   src/blocks/trust-bar/edit.js
OK   src/utils/spacing-preview.js
OK   src/utils/index.js
```

### 2. Container regression — `check-editor-render-parity.js --json`

`editorCanvasDesync.netNew` only (never `accepted`):

| | before | after |
|---|---|---|
| Total netNew (all blocks) | 238 | 238 |
| `sgs/container` netNew | 22 | 22 |
| `sgs/multi-button` netNew | 14 | 14 |
| `sgs/physics-canvas` netNew | 7 | 7 |
| `sgs/site-footer` netNew | 19 | 19 |
| `sgs/site-header` netNew | 22 | 22 |
| `sgs/trust-bar` netNew | 30 | 30 |

Container's finding set did not grow (nor did any of the five wired blocks').
Note: the "before" run was taken after the container extraction (pure
copy-relocate, no logic change) but before the five-block wiring, so it is a
valid pre/post baseline for the wiring step specifically.

Note on what this detector actually measures: it flags an attribute that is
*destructured from `attributes` and written by a control but never read back
anywhere else in the file* — a static dead-preview heuristic. It is NOT a
padding/margin-specific check, and the padding/margin bug this task fixes was
never something it could have flagged (the base box was always read via
`attributes.style?.spacing?.padding` inside the existing `ResponsiveBoxControl`
panel — "read", just not applied to the canvas style). So an unchanged
netNew count is the expected, correct regression result here — it proves no
NEW desync was introduced, not that the fix landed (see item 3 below for
that).

### 3. Static coverage vs one item a reviewer should double-check

All five blocks were verified **statically** (parse-check + manual line
tracing of: `useSelect` import path, `attributes.style?.spacing?.padding/margin`
as the base source, `paddingTablet/paddingMobile/marginTablet/marginMobile`
attribute declarations cross-checked against each block's `block.json`, and
the spread of `spacePreview` into each block's `useBlockProps(...).style`).
None could be verified live in an actual editor canvas in this session (no
browser/build step was run, per the task's constraints — no `npm run build`,
no deploy). **A reviewer should open the editor for at least
`sgs/multi-button` (the one block with a base-only margin — no tier attrs)
and `sgs/trust-bar` (the block with the most surrounding style-object
composition, gap/grid/shadow all sharing the same `style` object) and set a
padding + margin value on desktop, then flip the device-type toggle to tablet
and mobile, confirming the canvas box visibly changes at each tier before
this is considered closed.**

---

## POST-DEPLOY LIVE VERIFICATION (main session, 2026-08-26) — READ THIS

The static verification above is confirmed for PADDING and **refuted for MARGIN**.
Measured on the canary after deploy, on probe pages built for the purpose.

### Padding — FIXED, and tier-aware

| block | canvas before | canvas @Desktop | canvas @Tablet |
|---|---|---|---|
| `sgs/trust-bar` (has `paddingTablet:40px`) | 0px | **120px** | **40px** |
| `sgs/multi-button` (no tablet tier) | 0px | **120px** | **120px** |

The two blocks DIVERGING at Tablet is what proves tier-awareness: trust-bar drops to
its own tablet tier while multi-button correctly inherits the base. A desktop-only
preview would have shown both at 120px and passed falsely.

### Margin — NOT previewable, and it is NOT our bug

Our code does write it: the element carries inline `margin: 80px 0px`, and
`el.style.marginTop` is `'80px'`, so the declaration parses. But the computed value is
`0px`.

**The control experiment settles the cause.** `sgs/container` — the reference block this
module was extracted FROM, which has always previewed spacing correctly — shows exactly
the same thing: inline `margin: 80px 0px`, computed `marginTop: 0px`, with its padding
previewing fine at 30px. True for both a first-child and a non-first-child container.

So the editor canvas zeroes block margins for EVERY block, including the one that was
already "correct". This fix therefore reaches exact parity with container; margin was
never previewable and this change did not regress it.

Forcing `margin-top: 80px !important` via CSSOM DOES take effect, so it is technically
overridable — but that means fighting WordPress's own editor layout model, which is a
design decision, not a bug fix. **Open for Bean.**

⚠ Honest limit: no author-stylesheet rule matching the element was found across 263
readable sheets, and there are no adopted stylesheets. The exact overriding mechanism
is therefore NOT identified — only its effect, and the fact that it applies equally to
container. Do not repeat the guess that it is `.is-layout-flow > :first-child`; the
non-first-child container behaves identically, which refutes that.
