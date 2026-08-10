---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/container WidthPanel responsive-duplicate merge (editor-only)"
block: sgs/container
date: 2026-08-10
wave: "Spec 35 Track 1b Phase 1.4d — fold the two 'by viewport' duplicates into their originals"
verdict: PASS
first_paint_capture_passed: true
source_sha: 862a23fb1440e109
---

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

**Live editor verification of the merged panel (post + site editor, canary) is a separate,
still-owed step** and is NOT claimed by this report. A green build proves almost nothing
about editor JS: an unprefixed `__experimental*` import is `undefined` at runtime with a
perfectly clean build (D547). This report asserts only that the FRONTEND cannot regress.
