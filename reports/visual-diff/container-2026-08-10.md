---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/container WidthPanel responsive-duplicate merge (editor-only)"
block: sgs/container
date: 2026-08-10
wave: "Spec 35 Track 1b Phase 1.4d — fold the two 'by viewport' duplicates into their originals"
verdict: PASS
first_paint_capture_passed: true
source_sha: 4652d23be690e69b
---

> **Covers THREE editor-only changes to `ContainerWrapperControls.js` on 2026-08-10**, in
> order: (1) the `WidthPanel` responsive-duplicate merge, (2) deletion of the
> unreachable min-height panel, and (3) deletion of `ResponsiveSpacingPanel`.
> `source_sha` tracks the latest staged content — the gate
> rejected this report while it still carried the first change's sha, which is the
> stale-report defence working exactly as intended.

# sgs/container — `WidthPanel` responsive-duplicate merge (editor-only change)

**Verdict: PASS.** This change is **editor-inspector only**. `render.php`, `style.css` and
`includes/class-sgs-container-wrapper.php` are byte-identical to HEAD, and the set of
attributes the panel writes is unchanged — so the published-page first paint cannot
differ (hence `first_paint_capture_passed: true`: the frontend render surface this gate
protects did not change).

⚠ This report is written under the standing rule that an editor-only change still needs an
HONEST report rather than `--no-verify` — `--no-verify` would also discard gitleaks,
cheat-gate, F5 and F6, which are unrelated and were passing.
(memory: `visual-diff-gate-editor-only-honest-report`.)

## What changed (editor code only)

`src/blocks/container/components/ContainerWrapperControls.js`, `WidthPanel` export.

Two property families each rendered **a standalone desktop control PLUS a "… by viewport"
`<ResponsiveControl>` whose desktop branch returned a `<p>` reading "set above"** — two
controls for one property, and a hole in the wrapper where a control belongs. Each family
is now ONE `<ResponsiveControl>` covering all three tiers, driven by the global device
toggle.

| Family | Before | After |
|---|---|---|
| Outer max-width | `UnitControl` (desktop) + `ResponsiveControl` with a hollow desktop branch | one `ResponsiveControl` → `UnitControl`, all three tiers |
| Content band width | `ToggleGroupControl` + conditional `UnitControl` (desktop) + `ResponsiveControl` with a hollow desktop branch | one `ResponsiveControl` → same `ToggleGroupControl` + conditional `UnitControl`, all three tiers |

## Why the frontend cannot change

- **No frontend file touched.** `git diff HEAD --name-only` over
  `src/blocks/container/render.php`, `src/blocks/container/style.css` and
  `includes/class-sgs-container-wrapper.php` returns EMPTY. The staged set is exactly one
  file, and it is an inspector component.
- **`ContainerWrapperControls.js` is not reachable from any frontend entry point.** Grepped
  across every `view.js` / `save.js` / `render.php`: the four hits are all COMMENT lines
  (`//` or ` * `) naming the component in prose — no import, no call. (Checked as a
  mechanism question, not a name question: this repo's `a-grep-for-a-class-name-is-not-a-usage-census`
  failure fired once already in this same session.)
- **The written attribute set is identical.** Desktop still writes the BASE attributes
  (`maxWidth`, `contentWidth`); tablet/mobile still write `maxWidthTablet`/`maxWidthMobile`
  and `contentWidthTablet`/`contentWidthMobile`. No attribute added, removed or renamed, so
  no stored content changes and no migration is required.
- **No write occurs on mount.** The merged controls write only from `onChange`/`onReset`.
  An inheriting tier now *displays* its resolved value, but displaying it does not persist
  it — a blank tier stays blank.

## Editor-surface behaviour change (the part that IS visual, disclosed)

1. **Two controls become one, per family.** The duplicate original and the "set above"
   help paragraph are gone. This is the intended change.
2. **An inheriting tier now shows the value it actually renders at.** Previously
   `contentWidthPreset('')` returned `'full'`, and `SGS_Container_Wrapper` treats `'full'`
   and `''` identically, so a blank tablet tier rendered as **"Full" selected** —
   indistinguishable from an explicit Full override. With desktop and the tiers now sharing
   one control, that pre-existing ambiguity would have become the only thing the client
   sees. The tier now shows the resolved preset plus `ResponsiveControl`'s
   "Inheriting from Desktop: …" hint and a ≥44px reset button.
3. **Help text preserved, not dropped.** The "Normal ≈ 1200px, Wide ≈ 1400px, Full = no cap"
   paragraph existed only on the desktop branch and is the only place a non-technical client
   is told what the tokens mean. It is kept and deliberately placed OUTSIDE the wrapper so it
   shows on every tier rather than one at a time. The desktop-specific max-width help
   (breakout via the toolbar) and the tier-specific help (blank inherits desktop) are both
   retained, selected per tier.

## Evidence

- `inspector-scan` rule 26 (`hollow-tier`): **8 → 6** findings; both sites at `:284` and
  `:351` resolved. Remaining 6 are unrelated and separately tracked.
- `inspector-scan` rule 21: **129 FLAGGED**, unchanged (counting `status:"FLAGGED"` only —
  the raw array reads 141 because it includes 12 baselined entries).
- `node scripts/inspector-scan/run.js --self-test`: PASS for all 12 rules **plus** the
  harness meta-check (the deliberately-broken meta-rule was correctly caught as FAILING, so
  the harness itself is proven able to fail).
- `npm run build`: exit **0**, all prebuild gates passing.
- `npx wp-scripts lint-js` on this file: rule-count profile **byte-identical** before vs
  after (`diff` returns nothing). Zero `no-undef`. This matters because `lint:js` is NOT in
  `prebuild`, so an undefined identifier would otherwise ship through every gate (D547).

## Limitation, stated

No frontend screenshot pair was captured, because there is no frontend delta to capture —
the render surface is untouched and the stored attribute set is unchanged. The claim being
made is the narrow one the gate protects (frontend first paint is unaffected), proven by
file-level and attribute-level evidence rather than by a pixel capture.

**Live editor verification of the merged panel — now DONE.** Appended below rather than
left as an open claim; the paragraph that stood here said it was still owed, which was true
at the time the report was written and is recorded rather than quietly overwritten.

## Live verification — canary, BOTH editors (2026-08-10, post-deploy)

A green build proves almost nothing about editor JS: an unprefixed `__experimental*` import
is `undefined` at runtime with a perfectly clean build (D547). So both surfaces were opened
and probed directly.

Every collapsed `PanelBody` was expanded before reading the DOM — a collapsed panel keeps
its children OUT of the DOM entirely, which produced false "the control is missing"
readings earlier in this programme.

**Post editor** (`post.php?post=2227`, an `sgs/container` on a real canary page):

| Check | Expected | Measured |
|---|---|---|
| "Outer max-width" controls | 1 (was 2) | **1** |
| "Content band width" controls | 1 (was 2) | **1** |
| "by viewport" label | 0 | **0** |
| "set above" help branch | 0 | **0** |
| "Normal ≈ 1200px" token help | present | **present** |

**Behaviour, not just presence** — an effect that renders is not an effect that works:

- Global toggle → Tablet: `core/editor.getDeviceType()` returns `Tablet`.
- With tablet blank, the sidebar shows **"Inheriting from Desktop"** — the new
  `isInherited`/`resolvedValue` API is live and firing, not merely wired.
- Writing at Tablet wrote `maxWidthTablet: "640px"` **and only that key**;
  `maxWidth` stayed `"900px"`. No tier bleed.
- (Editor state only — never saved, so the canary page's stored content is unchanged.)

**Site editor** (`site-editor.php?canvas=edit`), the surface D547's failure hid in:

- `sgs/container` selected, inspector sidebar found, 3,746 chars of text — the non-zero
  counts are their own positive control, so the zeros below are not a blank-DOM artefact.
- "Outer max-width" = **1**; "by viewport" = **0**; "set above" = **0**.
- `core/editor.getDeviceType()` answers **"Desktop"** here too, re-confirming D546's
  measurement that this one store covers both surfaces.
- **0 console errors.**

The panel rendering at all is itself the mount proof: a component that failed to mount
(React #130) would leave the label absent, which is exactly the failure this check exists
to catch.

---

# Change 2 — deletion of the unreachable min-height panel (editor-only)

**Verdict: PASS**, same basis. `render.php`, `style.css` and
`includes/class-sgs-container-wrapper.php` remain byte-identical to HEAD, and no attribute
is added, removed or renamed — so stored content and frontend first paint cannot change.

## What was deleted, and why it is provably dead

The three flat min-height `SelectControl`s in `KIND_PANELS.section`. All 16 live
`<ContainerWrapperControls>` mounts pass `kind` explicitly — `'layout'` ×10, `'content'`
×6 — and **not one passes `'section'`**. The array is reached only through the
unknown-kind fallback (`KIND_PANELS[kind] ?? KIND_PANELS.section`), so no block ever
rendered these controls. **Nothing a client could see has changed**, which is why no
editor screenshot pair is offered for this half: there is no before state to photograph.

Kept: the `section` entry itself as the unknown-kind safety net, and the
`MIN_HEIGHT_OPTIONS` export — three blocks that DO show it import it
(`container/edit.js:19`, `physics-canvas/edit.js:20`, `trust-bar/edit.js:30`), and removing
the export would give all three `options={undefined}` and a crashed inspector panel with
**no build error**.

## ⚠ Rule 21 moves 129 → 135, and the new number is the honest one

The +6 are exactly `minHeightTablet` + `minHeightMobile` on `sgs/cta-section`,
`sgs/site-footer` and `sgs/site-header`. **Not a regression — an unmasking.** Rule 21
detects a control by whether the attribute NAME appears in the block's control corpus, and
`ContainerWrapperControls.js` is in that corpus; the unreachable panel's literal names made
the static scan read "controlled". Deleting the dead code removed the mask.

Corroboration that this reading is right, not a rationalisation: the three blocks that
surfaced are precisely those documented as NOT using the aggregator wholesale, and
`container` / `hero` / `trust-bar` did NOT surface — because each has its own real,
reachable min-height control. The split falls exactly where the mechanism predicts.

**So the 129 baseline was 6 too low.** A metric that counts name-presence rather than
reachability can be improved by keeping dead code — the wrong incentive, and worth naming.
The 6 represent a genuine capability gap in those three blocks; wiring it is separate work
and was deliberately not smuggled into this deletion.

## Evidence

- `inspector-scan` rule 26: **6 → 5**.
- `inspector-scan` rule 21: **129 → 135**, every one of the +6 accounted for above.
- `--self-test`: PASS, all 12 rules **plus** the harness meta-check.
- `npm run build`: exit **0**.

---

# Change 3 — `ResponsiveSpacingPanel` deleted (editor-only)

**Verdict: PASS**, same basis. `render.php`, `style.css` and
`includes/class-sgs-container-wrapper.php` are still byte-identical to HEAD; this change
removes an editor component and adds no attribute, so the frontend cannot differ.

The panel's LAST mount was `sgs/gallery`, migrated to `ResponsiveBoxControls` in the same
commit — see `gallery-2026-08-10.md`, which carries the frontend analysis and the
stored-content migration for that block.

## Why it was deleted rather than repaired

1. **It wrote attributes nothing declares.** 16 tablet/mobile padding + margin controls
   writing `paddingTopTablet` / `marginLeftMobile` / etc. No `block.json` anywhere declares
   them, and WordPress silently DISCARDS an undeclared attribute — a client could set
   tablet padding, save, and watch it vanish with no error and no failing gate.
2. **Its desktop tier was structurally hollow.** Both Padding and Margin returned a `<p>`
   reading "set in the Dimensions panel above" instead of a control, because desktop
   spacing came from WP-native `supports.spacing` while the tiers came from SGS attrs.
   These were the last two `hollow-tier` findings from `inspector-scan` rule 26.

Repairing it in place was not available: merging desktop into the wrapper would have meant
either duplicating a native-supports panel (CO-15) or stripping native spacing supports
(D542). The FR-37-16 object model resolves both by owning all three tiers itself, which is
why the replacement rather than the repair was the right shape.

## Evidence

- `inspector-scan` rule 26: **5 → 3**; both remaining `hollow-tier` findings resolved.
- `npm run build`: exit **0**, all gates green across all three concurrent streams.
- No attribute added, removed or renamed by THIS change, so no stored content moves.
