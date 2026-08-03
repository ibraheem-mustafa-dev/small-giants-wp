---
doc_type: report
title: Spec 35 inspector DONE-checklist — enforcer truth matrix
status: FINAL
created: 2026-08-03
governs: audit of the `**[enforced by]**` tags in `.claude/plans/spec-35-inspector-DONE-checklist.md`
method: read the enforcer source + run it + plant a negative control in an out-of-repo mirror
---

# Spec 35 inspector — enforcer truth matrix

**Method.** Every claim below rests on two independent sources: (a) the enforcer's own
source at a cited `file:line`, and (b) an actual run. Detection claims additionally rest
on a **planted negative control** executed in a scratch mirror at
`…/scratchpad/mirror/plugins/sgs-blocks` (a real copy of `src/` + `scripts/` + `package.json`,
with `node_modules` junctioned and `theme/sgs-theme` file-copied). **No file in the repo tree
was modified.** Every plant was confirmed to have landed (asserted in the planting script)
before the enforcer's red/green result was trusted.

**Wiring baseline** — `plugins/sgs-blocks/package.json:7` (`prebuild`) invokes, in order,
`consistency/run-consistency-gates.py`, `check-dead-controls.js --check`,
`check-control-ux.js --check`, `lint-responsive-controls.py --check`,
`check-box-family-guard.py --check`, `check-shared-css-state-rules.js --check`,
`audit-inspector-conformance.js --check`, `audit-feature-parity.py --check`.
`run-consistency-gates.py` propagates the exit code of only TWO gates
(`check-cluster-coverage.py`, `check-box-family-guard.py` —
`run-consistency-gates.py:118,125,163`); `check-box-flat.py`,
`check-element-manifest-conformance.js`, `report-colour-alpha.py` and
`check-reclassified-keys.py` run **INFORMATIONAL** (`run-consistency-gates.py:130+`) and
their exit codes are discarded.

**Reference baseline run** (real repo, 2026-08-03): `audit-inspector-conformance.js --check`
= PASS, 0 WARN, 20 INFO; `audit-feature-parity.py --check` = PASS, 0 unexplained;
`check-box-family-guard.py --check` = PASS; `check-control-ux.js --check` = PASS;
`lint-responsive-controls.py --check` = PASS; `check-dead-controls.js --check` = PASS.

---

## Truth matrix

| # | Item | Claimed enforcer | Real enforcer(s) found | Wired? | Negative control result | Baseline suppressions | Verdict | What would close it |
|---|---|---|---|---|---|---|---|---|
| 1 | Tab split via `group` | UNENFORCED (self-declared) | `check-simple-surface-cap.js:109+` reads `group=` (the only script in the tree that does) — but only to bucket Settings vs Styles for the two blocks in `DEFAULT_TARGETS` (`sgs/site-header`, `sgs/site-footer`); it never asserts routing and never looks for `group="advanced"` | No (absent from package.json; nothing invokes it) | Not run — nothing to plant against; no rule asserts group routing | none | **ABSENT** (claim CORRECT) | An AST rule asserting every `InspectorControls` carries an intentional `group`, keyed to a per-control behaviour/appearance classification |
| 2 | Element-first panels | UNENFORCED (`consistency-scanner` does not exist — correct, still absent) | `check-element-manifest-conformance.js` — cluster-coherence over `supports.sgs.elements` (79 of 84 block.json files now carry the manifest) | Yes, but INFORMATIONAL only (`run-consistency-gates.py:130+`; the script itself hard-sets `process.exitCode = 0` at `:648`, `:654`, `:738`) | Not needed — it is ALREADY reporting **2,905 `[GAP]` findings** on the live tree and still exits 0 | none (no baseline file; it simply cannot fail) | **VACUOUS** | Promote to `--check` with a baseline of the 2,905 current gaps, then fail on new ones |
| 3 | ToolsPanel on dense panels | `audit-inspector-conformance.js` (control-count vs ToolsPanel) | Same — rule 6 at `audit-inspector-conformance.js:453` | Yes (prebuild) | Fires live: 15 `dense-panel-candidate` findings today (hero ~20 controls, product-card ~11). But severity is `informational`, and the gate filter at `:598-600` counts **only** `'warn' === f.severity` — so it can never fail | none needed | **VACUOUS** (detects, cannot fail) | Raise the rule to `warn` and baseline the 15 current findings |
| 4 | Alpha + clearable colour | `audit-inspector-conformance.js`; exceptions → `inspector-conformance-baseline.json` | Rule 1 at `:297` (raw `ColorPalette`/`ColorGradientControl`/`GradientPicker`/`PanelColorGradientSettings` without `enableAlpha`). `consistency/report-colour-alpha.py` is a sibling REPORT (always exits 0) | Yes (prebuild) | **RED as designed** — planted `<ColorPalette value={null} onChange/>` → `colour-no-alpha` WARN, `--check` exit 1. **BUT** planted `<DesignTokenPicker enableAlpha={ false } />` → **0 findings** (`:83-88` exempts DesignTokenPicker wholesale). And `clearable` is checked by **no script in the tree** (grep hit only the reference dump `scripts/wp-components.js`) | 0 alpha entries in `inspector-conformance-baseline.json` | **PARTIAL** — misses `DesignTokenPicker enableAlpha={false}` and the whole `clearable` half | Drop the blanket DesignTokenPicker exemption (flag explicit `enableAlpha={false}`) + add a `clearable` rule |
| 5 | Real units / token scale | UNENFORCED (self-declared) | `check-control-ux.js` check (b) UNIT-VIA-SELECTCONTROL — the checklist does not know about it | Yes (prebuild, hard-fails) | **RED** — planted `<SelectControl … onChange → setAttributes({gapUnit})>` → `UNIT-VIA-SELECTCONTROL`, exit 1. **BUT** planted `<RangeControl label="Card padding (px)" min={0} max={120}>` on `sgs/planted-rawpx` → **0 findings from every gate** | `control-ux-baseline.json` = `{"accepted": []}` (empty) | **PARTIAL** — the checklist's UNENFORCED tag understates: the unit-select anti-pattern IS gated; the raw-px RangeControl (the actual item-5 wording) is not | A rule flagging a CSS-length `RangeControl` with no `UnitControl`/token-scale sibling |
| 6 | 4-value props are box-families | `check-box-family-guard.py` | **Claimed enforcer is the wrong file.** `check-box-family-guard.py:62-63,377-385` scans ONLY `scripts/converter/**/*.py` + `scripts/sgs-update-v2.py` — it never opens a `block.json` or `edit.js`. The real one is `consistency/check-box-flat.py` (flat box scalars in block.json) | `check-box-family-guard.py` yes (twice); `check-box-flat.py` yes but **INFORMATIONAL** | Both proven RED. Guard: planted `converter/planted_violation.py` using `re.match(r'.*(Top\|Right\|Bottom\|Left)$')` + `.endswith('TopLeft')` with no `box_family` → 2 NEW violations, exit 1. Box-flat: planted `plantedPaddingTop` → caught. **BUT** planted `plantedPaddingTopTablet` and `plantedBorderRadiusMobile` → **NOT caught** (`check-box-flat.py:106,110` matches suffix `Top…`/`padding\|borderWidth\|borderRadius` at end-of-name only) | `box-family-guard-baseline.json` = 0 keys; `box-flat-baseline.json` = **12 keys** (brand-strip ×2, icon, label, mega-panel, option-picker ×2, product-card ×3, trust-bar ×2) | **PARTIAL + mismatched claim.** Also: `check-box-flat.py` **exits 1 on the live tree right now** (`[NEW] mega-aside::asideBorderWidth`) and the build is still green, because the runner discards its exit code | Retag item 6 to `check-box-flat.py`; make it BLOCKING in `run-consistency-gates.py`; extend the suffix match through `Tablet`/`Mobile`/`Desktop` tiers |
| 7 | Real builders for compound values | `audit-inspector-conformance.js` (preset-only shadow flag) | Rule 4 at `:318` — `SelectControl` whose `label` matches `/shadow/i` | Yes (prebuild) | Planted `<SelectControl label="Box shadow">` → flagged, but severity `informational` → excluded from the `--check` filter at `:598-600`. Planted `<SelectControl label="Border" options=[None,Small]>` → **0 findings** — the border half of the item has no rule at all | none | **VACUOUS + PARTIAL** | Add a border-builder rule; promote both to `warn` |
| 8 | LinkControl for links | `audit-inspector-conformance.js` (raw URL TextControl flag) | Rule 2 at `:304-308` — `TextControl` with a literal `type="url"` | Yes (prebuild) | **RED as designed** — planted `<TextControl type="url">` → flagged, exit 1. **BUT** planted `<TextControl label="Link URL" value="" onChange>` with **no `type` attribute** → **0 findings**. The rule keys on `type="url"` alone | 3 `raw-url-link` exceptions (`sgs/google-reviews`, `sgs/trustpilot-reviews`, `sgs/media`) | **PARTIAL** — the commonest real shape (a URL TextControl with no `type`) is invisible | Also flag `TextControl` whose `label`/attr name matches `/url\|link\|href/i` |
| 9 | Full image controls | feature-parity audit (vs core/image) | `audit-feature-parity.py` — but `capabilities_from_db():59-73` compares **attribute NAMES only** | Yes (prebuild, hard-fails) | **RED on the live path** — planted a roster row `sgs/planted-fake` with `replaces: core/image` → 16 GAPs, exit 1 (incl. `focalPoint`, `aspectRatio`, `sizeSlug`, `scale`). But name-presence ≠ control presence: `FocalPointPicker` appears in **no** gate script (grep hit only `scripts/wp-components.js`) | 160 capability exceptions + 39 `_framework_universal` capabilities; only 23 of 83 roster blocks are in scope (have a `replaces` map) | **PARTIAL** — proves the ATTR exists, never that the CONTROL exists | Add an edit.js rule: a block declaring `focalPoint`/`sizeSlug` must render `FocalPointPicker`/a size `SelectControl` |
| 10 | Multi-item data is array-shaped | feature-parity audit | `audit-feature-parity.py` — reads `attr_name` only (`:63`), never `type` | Yes | Not applicable: no code path in any gate inspects an attribute's declared `type` for array-ness. A scalar attr with the right name satisfies feature-parity identically to an array one | as row 9 | **ABSENT** for the shape requirement | A block.json rule: an attr in a repeat/gallery role must be `"type": "array"` |
| 11 | 768/1024 device switcher | UNENFORCED (self-declared) | TWO wired hard gates the checklist does not know about: `check-control-ux.js` check (a) RESPONSIVE-FAMILY-WITHOUT-SWITCHER, and `lint-responsive-controls.py` (bespoke tier-switcher shape) | Yes — both in prebuild, both propagate exit 1 | **RED** — planted `sgs/planted-ux` (`gap`/`gapTablet`/`gapMobile` written via bare `setAttributes` + a desktop/tablet/mobile icon trio import + `useState('desktop')`): control-ux flagged 2 attrs, exit 1; lint-responsive flagged 2 shapes, exit 1. **BUT** neither script references `768` or `1024` anywhere (grep across `scripts/*.js` + `scripts/*.py`) | `control-ux-baseline.json` empty; lint-responsive has no baseline | **PARTIAL — the UNENFORCED tag is WRONG** | Add a breakpoint-value assertion to the two responsive primitives' own source, gated |
| 12 | StateToggleControl for states | UNENFORCED (self-declared) | `check-duplicate-controls.js` CHECK 1 (private `*Hover` attr vs the universal Hover Effects panel) | **No** — absent from package.json; nothing invokes it. Also `:825` "Always exit 0 — WARN-ONLY by design, no `--check` enforcement" | **RED** — planted `backgroundColourHover` (with its own `ColorPicker`) + `scaleHover` on a rostered block → `controlled` + `shadow` findings naming `sgsHoverBgColour`/`sgsHoverScale` as keeper. Exit 0 regardless | `duplicate-controls-baseline.json` = `{}` (empty) — irrelevant, it cannot fail | **UNWIRED** (and it checks universal-extension duplication, not `StateToggleControl` adoption) | Wire `check-duplicate-controls.js --check` into prebuild with a baseline of today's 88 findings |
| 13 | hideExtensions for irrelevant universals | `audit-inspector-conformance.js` (manual review flag — informational) | **The claim is false: `hideExtensions` appears nowhere in `audit-inspector-conformance.js`.** The real one is `check-universal-fit.js` (INAPPROPRIATE-FIT flags + no-opt-out finding) | No (`check-universal-fit.js` absent from package.json; always exits 0) | Ran live: reports the full 83-block × 9-extension matrix, 622 net-new raw flags, 0 inappropriate-fit flags, exit 0 | `universal-fit-baseline.json` = 3 bytes (`{}`) | **claimed enforcer ABSENT; real enforcer UNWIRED** | Retag item 13 to `check-universal-fit.js`; wire its inappropriate-fit arm with a `--check` |
| 14 | MediaUploadCheck on every MediaUpload | `audit-inspector-conformance.js` | Rule 3 at `:312-313, :432` | Yes (prebuild, WARN severity → gates) | **RED as designed** — planted a bare `<MediaUpload>` in a file with no `MediaUploadCheck` → flagged, exit 1. **BUT** the check is file-wide presence, not per-element: planted a wrapped `<MediaUploadCheck><MediaUpload/></MediaUploadCheck>` **plus** a second bare `<MediaUpload/>` in the same file → **0 findings** | none | **PARTIAL** (per-file, not per-element) | Assert each `MediaUpload` has a `MediaUploadCheck` ancestor in the JSX tree, not merely somewhere in the file |
| 15 | No duplicated native-supports panel | `audit-inspector-conformance.js` | **The claim is false — no such rule exists** (the script's 6 rules are colour-alpha, raw-url, media-upload-check, preset-shadow, reduced-motion, dense-panel; header `:11-45`). Partial cover from `check-duplicate-controls.js` (universal-extension + same-attr-two-controls + parent-child), which does NOT cover native `supports` | claimed: yes; real: no | **PROVABLY VACUOUS** — planted a block declaring `supports.color.text` **and** a bespoke `<ColorPicker>` writing `textColour` → `audit-inspector-conformance.js` returned **0 findings** and `--check` exit 0. `check-duplicate-controls.js` also missed it | none | **ABSENT** (claimed enforcer provably cannot detect the item) | A rule: a private attr whose semantic matches a declared native `supports` key, with its own control, is a duplicate |
| 16 | Native over hand-rolled | feature-parity audit + "Wave-3 native-migration audit" | feature-parity (name-based, `:63`). **The "Wave-3 native-migration audit" does not exist** — no file in `scripts/` matches | partial | Not testable as specified: feature-parity treats a hand-rolled `aspectRatio` attribute and a native `supports` entry as the same capability by construction (`capabilities_from_db` unions attrs and supports into one flat name set) | as row 9 | **ABSENT** | A rule flagging a block attr whose name collides with an available native support the block has not declared |
| 17 | Reduced-motion gate on all animation | `audit-inspector-conformance.js` (animation-without-gate flag) | Rule 5 at `:466-478` | Yes (prebuild, WARN severity) | **Detector works, but is inert on the live tree.** Two-way control: (a) with the theme gate present → 0 flags; (b) after planting a break in the copied `theme/sgs-theme/assets/css/core-blocks-critical.css` (replacing `prefers-reduced-motion`, plant asserted landed) → `framework_wide_reduced_motion_gate_detected` flipped `true`→`false` and `sgs/responsive-logo` surfaced. Because `hasFrameworkWideReducedMotionGate()` is `true` today, the condition at `:470` is **unreachable for all 18 animation-surface blocks** | 1 exception (`sgs/responsive-logo`) — dead weight while the framework gate stands | **VACUOUS in the current tree** | Split the rule: the universal CSS gate covers CSS animation only; JS/GSAP motion (`src/shared/effects/**`, which this block-directory-globbing rule structurally cannot see) needs its own `withMotionAllowed` assertion |
| 18 | Decorative-image + ARIA-label | UNENFORCED (self-declared) | none — no script checks a decorative-image toggle or an ARIA-label control | n/a | Not run — nothing exists to plant against | none | **ABSENT** (claim CORRECT) | A rule: a block rendering `<img>` must declare a decorative/alt-empty attr with a control |
| 19 | A11y pass | manual a11y pass (informational, never a gate) | none, by policy (`a11y-validation-feedback-informational-not-gate`) | n/a | n/a | n/a | **ABSENT by design** (claim CORRECT) | nothing — deliberate |
| 20 | Client patterns use templateLock | "pattern audit (Wave-1 item 4)" | **No pattern audit exists.** Repo-wide grep for `templateLock` in `scripts/` + `theme/` hits exactly one unrelated file: `scripts/migrate-core-blocks/pairings/cover_pairing.py` | No | Not run — no enforcer to test | none | **ABSENT** (claim FALSE) | A gate parsing `theme/sgs-theme/patterns/*.php` for `templateLock:"contentOnly"` on client-facing patterns |
| 21 | No Part-F anti-patterns | "the audits above collectively" | the union of rows 1–20 | partial | Inherits every gap above: raw-px spacing (row 5), no reset (row 3, INFO-only), bespoke duplicate panels (rows 12/15), colour-only focus + bespoke Custom-CSS field (no rule anywhere) | inherits | **PARTIAL** | Close rows 5, 7, 12, 15, 18 first; item 21 is a roll-up, not an independent gate |
| T1 | Feature-parity | `feature-parity-exceptions.json` + audit | `audit-feature-parity.py`, wired at `package.json:7` | Yes (hard-fails) | **RED on the live path** — planted roster row → 16 GAPs, exit 1. `--self-test` also passes all 4 cases (unexplained gap fails / clean tree passes / missing exceptions file fails / exception missing `wave` fails) | **160** capability exceptions across 20 blocks + **39** `_framework_universal` capabilities; scope = 23 of 83 blocks | **ENFORCED** (narrow scope, heavy suppression) | Widen the `replaces` map beyond 23 blocks; review the 160 exceptions' waves |
| T2 | Shrink-to-fit | (unattributed) | `audit-shrink-to-fit.js` — live-DOM, 375/768/1440 | **No** — absent from package.json; header `:17` "ALWAYS exits 0 … not wired into any CI failure path" | **RED and correct** — run against a synthetic local page forcing `.wp-block-sgs-container` to 1600px: reported `PAGE_HORIZONTAL_OVERFLOW` at both tiers + `FORCES_CONTAINER_WIDER` for `sgs/container`, 4 findings — **exit 0**. With no `--url` it also exits 0 (`:211`), so a naive wiring would pass vacuously | none | **UNWIRED** | Wire it to the canary URL in a post-deploy step with a `--check` that fails on findings and fails when `--url` is absent |
| T3 | Media-controls competitor comparison | (unattributed) | none — a competitor-comparison decision is not statically checkable and no artefact records it | n/a | Not run | n/a | **ABSENT** | Record the comparison as a committed artefact per media block and gate on its presence |

---

## Items covered by a script the checklist doesn't know about

Five checklist items carry an `UNENFORCED`/wrong tag while a real enforcer exists under a
different name. These are the primary finds:

1. **Item 11 (device switcher) — tagged UNENFORCED, actually gated twice.**
   `check-control-ux.js` check (a) and `lint-responsive-controls.py` are BOTH in `prebuild`
   and BOTH hard-fail; both flagged the planted bespoke tier switcher. Neither checks the
   768/1024 values, so the item is PARTIAL, not UNENFORCED.
2. **Item 5 (real units) — tagged UNENFORCED, half-gated.**
   `check-control-ux.js` check (b) hard-fails on a `SelectControl` writing a `*Unit` attr.
   The raw-px `RangeControl` half remains uncovered (proven by plant).
3. **Item 6 (box families) — tagged to the wrong script.**
   `check-box-family-guard.py` scans the converter tree only; `consistency/check-box-flat.py`
   is the block-level enforcer. It is INFORMATIONAL and is **already failing on the live tree**
   (`[NEW] mega-aside::asideBorderWidth`) with the build green.
4. **Item 2 (element-first panels) — tagged UNENFORCED, actually measured.**
   `check-element-manifest-conformance.js` computes cluster coherence over
   `supports.sgs.elements` for 79 blocks and currently reports **2,905 gaps** — all discarded,
   because the script hard-sets `process.exitCode = 0`.
5. **Item 12 (state controls) and item 13 (hideExtensions) — real enforcers exist, unwired.**
   `check-duplicate-controls.js` (88 live findings, always exit 0) and `check-universal-fit.js`
   (622 raw-matrix flags, always exit 0). Neither is referenced by `package.json`.

Other unlisted scripts, mapped:

| Script | Wired? | Which checklist item it actually covers |
|---|---|---|
| `check-duplicate-controls.js` | No | items 12, 15 (partial — universal-extension + same-attr duplication, not native supports) |
| `check-universal-fit.js` | No | item 13 |
| `check-element-manifest-conformance.js` | Yes, informational | item 2 |
| `check-simple-surface-cap.js` | No | items 1 + 3, but only for `sgs/site-header`/`sgs/site-footer` (`DEFAULT_TARGETS:109`); advisory unless `--strict` (`:704`) |
| `check-shared-css-state-rules.js` | Yes, gating | **none** — it guards state-only size literals in `assets/css/`, unrelated to Spec 35 |
| `audit-block-uniformity.py` | No | none of the 24 (block.json uniformity: `source:html`, `supports.color`); its own header flags a permanent name-keyed false-positive class |
| `audit-shrink-to-fit.js` | No | T2 |
| `audit-feature-parity.py` | Yes, gating | T1, items 9/10/16 (name-level only) |
| `consistency/check-box-flat.py` | Yes, informational | item 6 (the real one) |
| `consistency/check-cluster-coverage.py` | Yes, **blocking** | none directly — registry integrity (every `css:*`/`anim:*` row in exactly one cluster), the precondition for item 2's enforcer |
| `consistency/report-colour-alpha.py` | Yes, informational | item 4 (report only, always exits 0) |
| `consistency/check-reclassified-keys.py` | Yes, informational | none of the 24 (regeneration tripwire) |
| `lints/bem-lint.py`, `lints/token-lint.py`, `lints/draft-vocab-lint.py` | No (clone-orchestrator only) | none — draft/clone-side, not inspector |
| `lints/lint-spec-drift.py` | Yes (`postbuild`, `--ghost-only`) | none of the 24 |
| `lints/lint-theme-css-hardcodes.py` | No | none of the 24 |

### Two structural blind spots that affect every roster-keyed audit

- **`scripts/consistency/roster.json` holds 83 blocks; 84 block directories carry a
  `block.json`.** `sgs/physics-canvas` is on disk and absent from the roster, so it is
  invisible to `audit-inspector-conformance.js`, `audit-feature-parity.py` and
  `audit-shrink-to-fit.js`. `build-roster.py` is **not** in `package.json`, so roster
  staleness is unguarded. (Adding it to a mirror roster produced 0 findings, so there is no
  live defect hiding here today — but the next block will be invisible the same way.)
- **`audit-feature-parity.py:26-27` still carries `⚠ NOT YET WIRED INTO prebuild
  (package.json:7)`.** It IS wired (last entry of `prebuild`). A stale in-file warning of
  this kind is exactly what makes a wiring audit necessary.

---

## Claims I could not test, and why

1. **Item 1 (`group` prop), item 18 (decorative image/ARIA), item 19 (a11y), item 20
   (templateLock), item 16 ("Wave-3 native-migration audit"), T3 (competitor comparison).**
   No enforcer exists to plant against. Absence was established by repo-wide grep for the
   distinguishing token (`group=`, `templateLock`, `FocalPointPicker`, `clearable`) across
   `scripts/**/*.js` and `scripts/**/*.py`, excluding `node_modules`. A grep's negative result
   describes the grep, so each was corroborated by reading the claimed enforcer's own rule
   list (`audit-inspector-conformance.js:11-45` enumerates all six of its rules; none is
   `group`, `hideExtensions`, or a native-supports duplicate).
2. **Item 10 (array shape).** Not plantable as a red/green: no gate reads an attribute's
   declared `type` at all, so there is no code path a plant could reach. Established from
   `audit-feature-parity.py:59-73` (attr_name only) rather than from a run.
3. **T2 on real client pages.** `audit-shrink-to-fit.js` was proven to detect on a synthetic
   local page I authored (deliberate 1600px `.wp-block-sgs-container`). I did NOT run it
   against `palestine-lives.org` or the sandybrown canary — that would measure live client
   sites, which is outside a read-only audit's remit. Its detection is therefore proven for
   the mechanism, not for any live page's real state.
4. **`check-dead-controls.js` findings inside the mirror were discarded as measurement
   artefacts.** The mirror omits `plugins/sgs-blocks/includes/`, so the script's
   shared-includes consumption check false-positived on `sgs/nav-menu::maxWidth` and
   `sgs/product-card::overrideElements`/`packSizes`. Re-run in the real repo: exit 0. Those
   are NOT real findings and are not reported as such.
5. **Whether the theme's universal reduced-motion CSS rule actually satisfies WCAG 2.3.3 for
   GSAP/Tier-G motion.** The rule forces `animation-duration`/`transition-duration` and
   `scroll-behavior` — it cannot stop a JS timeline. Establishing that a specific block's
   GSAP motion does or does not respect `prefers-reduced-motion` needs a live browser probe,
   not a static audit; not attempted here. It is flagged in row 17 as a scope limit of the
   rule, not asserted as a live defect.
