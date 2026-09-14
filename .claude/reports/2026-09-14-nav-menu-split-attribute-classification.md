---
doc_type: report
date: 2026-09-14
status: complete
governs: nav-menu split, plan Step 2 (scaffold nav-bar-menu + nav-drawer-menu)
---

# `sgs/nav-menu` split — attribute classification

**Which of `sgs/nav-menu`'s 153 own attributes belong to `sgs/nav-bar-menu`, which to
`sgs/nav-drawer-menu`, and which to both.** Decided by rendering the block, not by reading the code.

## Reproduce

```bash
python plugins/sgs-blocks/scripts/migrations/2026-09-14-nav-menu-split-classify.py --self-test
python plugins/sgs-blocks/scripts/migrations/2026-09-14-nav-menu-split-classify.py --run --out result.json
```

`--run` is read-only against the canary database: the test menu is a fake `wp_navigation` post held
only in the in-process object cache, and the harness refuses to run if that cache is persistent. Before
the run, the canary's nine nav PHP files were verified byte-identical to `main` (md5), and its
`block.json` semantically identical (all attributes and top-level keys equal).

## Result

| Verdict | Count | Meaning |
|---|---|---|
| **BAR** | 32 | only the bar fork is affected |
| **DRAWER** | 9 | only the drawer fork is affected |
| **BOTH** | 100 | both forks are affected |
| NO-EFFECT | 12 | no effect found under either configuration — see below |
| DEAD-CSS | 0 | emits CSS matching nothing in either fork |
| UNTESTED | 0 | the test value equalled the value already in force |

**133 further attributes are framework-injected** (`fx*` and `sgs*` extensions, plus core
`anchor`, `className`, `style`, `lock`, `metadata`) and are excluded: they are not declared in
nav-menu's `block.json`. ⚠ **Step 2 must confirm how that set is injected** — presumably from `supports`
(e.g. `supports.sgs.hideExtensions`) — so both new blocks receive the same set. This report did not
verify the mechanism.

### BAR (32)
`burgerBg`, `burgerBgGradient`, `burgerColour`, `burgerColourGradient`, `burgerColourHover`, `burgerColourHoverTreatment`, `burgerFontFamily`, `burgerFontSize`, `burgerFontWeight`, `burgerHoverColour`, `burgerLetterSpacing`, `burgerLetterSpacingUnit`, `burgerSize`, `burgerTextTransform`, `drawerRef`, `itemSeparatorColour`, `itemSeparatorColourHover`, `itemSeparatorHoverTreatment`, `itemSeparatorStyle`, `itemSeparatorSweepAngle`, `itemSeparatorWidth`, `submenuAlign`, `submenuAnimation`, `submenuCaret`, `submenuCloseGrace`, `submenuTopOffset`, `triggerIcon`, `triggerLabel`, `triggerMagnetEnabled`, `triggerMagnetRadius`, `triggerMagnetStrength`, `triggerMode`

### DRAWER (9)
`listColumns`, `megaDrawerFallbackIds`, `sublinkMarkerColour`, `sublinkMarkerColourCurrent`, `sublinkMarkerColourCurrentGradient`, `sublinkMarkerColourGradient`, `sublinkMarkerColourHover`, `sublinkMarkerColourHoverGradient`, `sublinkMarkerIcon`

### BOTH (100)
`collapsePoint`, `featuredBg`, `featuredBgGradient`, `featuredBgHover`, `featuredBgHoverGradient`, `featuredColour`, `featuredColourGradient`, `featuredColourHover`, `featuredFontWeight`, `featuredFontWeightHover`, `featuredItemIds`, `featuredRadius`, `featuredRadiusHover`, `gap`, `itemBg`, `itemBgCurrent`, `itemBgCurrentGradient`, `itemBgGradient`, `itemBgHover`, `itemBgHoverGradient`, `itemBgHoverTreatment`, `itemBorderColour`, `itemBorderColourCurrent`, `itemBorderColourHover`, `itemBorderHoverTreatment`, `itemBorderStyle`, `itemBorderWidth`, `itemColour`, `itemColourCurrent`, `itemColourGradient`, `itemColourHover`, `itemColourHoverGradient`, `itemColourHoverTreatment`, `itemFontFamily`, `itemFontSize`, `itemFontStyle`, `itemFontWeight`, `itemFontWeightCurrent`, `itemFontWeightHover`, `itemLetterSpacing`, `itemLineHeight`, `itemMagnetEnabled`, `itemTextAlign`, `itemTextColumns`, `itemTextDecoration`, `itemTextDecorationHover`, `itemTextTransform`, `itemTextTransformHover`, `itemTextWrap`, `itemWritingMode`, `margin`, `navBg`, `navBgGradient`, `navBgHover`, `navColour`, `navColourGradient`, `navColourHover`, `navLabel`, `padding`, `sgsCustomCss`, `submenuBg`, `submenuBgGradient`, `submenuBorderColour`, `submenuBorderColourGradient`, `submenuBorderRadius`, `submenuBorderStyle`, `submenuBorderWidth`, `submenuColour`, `submenuColourCurrent`, `submenuColourGradient`, `submenuColourHover`, `submenuColourHoverTreatment`, `submenuFontFamily`, `submenuFontSize`, `submenuFontStyle`, `submenuFontWeight`, `submenuFontWeightHover`, `submenuLetterSpacing`, `submenuLineHeight`, `submenuLinkBg`, `submenuLinkBgCurrent`, `submenuLinkBgGradient`, `submenuLinkBgHover`, `submenuLinkBgHoverTreatment`, `submenuLinkBorderColour`, `submenuLinkBorderColourHover`, `submenuLinkBorderStyle`, `submenuLinkBorderWidth`, `submenuMinWidth`, `submenuPadding`, `submenuShadow`, `submenuShadowColour`, `submenuTextAlign`, `submenuTextColumns`, `submenuTextDecoration`, `submenuTextDecorationHover`, `submenuTextTransform`, `submenuTextTransformHover`, `submenuTextWrap`, `submenuWritingMode`

### NO-EFFECT (12) — placement by family is INFERENCE, not measurement

No CSS or markup change was observed under either configuration. That is **not** proof a control is
dead: most need a paired value the enabler configuration did not set. The placement below follows each
attribute's family and is unverified.

**Updated 2026-09-14 (post Step-2.5 classifier fix).** Four attributes moved OUT of this bucket after
two real bugs were found and fixed, verified by re-running the harness live (not inferred): (1)
`itemTextColumns`/`submenuTextColumns` used a sentinel value of `default + 7`, but
`helpers-typography.php`'s `column-count` emitter clamps to 1-6 server-side — an out-of-range sentinel
was silently dropped before reaching CSS. (2) `submenuShadowColour`'s sentinel test never actually
exercised its composition path, because `submenuShadow`'s test value (`'0 4px 12px rgba(0,0,0,.3)'`)
failed `sgs_shadow_value_composed()`'s raw-shape regex (`/^(inset\s+)?-?[\d.]+px/i` — a bare `0` with no
unit doesn't match), so it silently fell through to the preset-slug branch instead. Fixed sentinel:
`'0px 4px 12px 0px rgba(0,0,0,.3)'` (4 lengths with units, matching `ShadowControl.js::buildShadow()`'s
real output shape). (3) `submenuBgGradient` moved out for a different reason — its NO-EFFECT verdict was
real at the time this report was first written, but D1060 Part A (commit `ed3b495de`) has since fixed
the underlying gradient-fallback bug it was reporting, live on `main`. All three sentinel-bug fixes are
in `scripts/migrations/2026-09-14-nav-menu-split-classify-sentinels.php` and
`...-classify-harness.php`; full detail in each file's own docblock. All four now score **BOTH**, moved
into that list above.

| Attribute | Inferred placement |
|---|---|
| `burgerBgHoverTreatment` | BAR (burger family) |
| `itemBorderRadius` | BOTH (item family) |
| `itemFontSizeUnit` | BOTH (pairs with itemFontSize) |
| `itemLetterSpacingUnit` | BOTH (pairs with itemLetterSpacing) |
| `itemLineHeightUnit` | BOTH (pairs with itemLineHeight) |
| `itemSmartContrast` | BOTH (item family; acts only when contrast fails) |
| `itemTextIndent` | BOTH (item typography) |
| `submenuFontSizeUnit` | BOTH (pairs with submenuFontSize) |
| `submenuLetterSpacingUnit` | BOTH (pairs with submenuLetterSpacing) |
| `submenuLineHeightUnit` | BOTH (pairs with submenuLineHeight) |
| `submenuTextIndent` | BOTH (submenu typography) |
| `sweepAngle` | BOTH (item hover family) |

⚠ `itemTextIndent` and `submenuTextIndent` received valid values and emitted **nothing** in either
configuration, with no obvious enabler. This matches D1060 ruling 8 (both text-indent controls are
already known-unwired — `sgs_typography_css_rule()` needs a fourth argument neither call site passes)
— consistent, not a new finding. They remain the strongest candidates for genuinely unwired controls
among the remaining 12. Check each one's emitter before migrating it, and do not delete any without
asking.

**Root custom properties and cascade-timing — investigated, not applicable here.** Step 2.5 also asked
whether the harness needs a cascade-aware, transition-safe computed-style check. Checked directly: this
classifier does pure server-side PHP rendering (`WP_Block::render()`) and diffs raw CSS rule text — it
never opens a browser, forces a pseudo-state, or reads `getComputedStyle()`, so the transition-timing
defect (real, and already fixed, in a DIFFERENT browser-based cascade-audit script from earlier this
session) cannot occur here. Separately checked whether a root-level custom-property SETTER rule (present
in every render) could mask a fork-specific CONSUMER rule being absent — spot-checked `featuredRadius`/
`featuredColour` (both custom-property-routed) and confirmed the harness's `matched` selector list
already distinguishes the root setter from the real descendant consumer rule. No evidence either concern
is currently producing a wrong verdict.

## Two verdicts that are structurally true and semantically wrong

The method answers **"does this attribute's CSS target an element in that fork?"** It does not answer
**"does that CSS win the cascade?"** Two results turn on the difference.

1. **`collapsePoint` scores BOTH but is bar-only in effect.** Its rule
   `@media (max-width:767px) { .sgs-nav-menu-UID .sgs-nav-menu__bar { display:none } }` does target
   the drawer's list. But `nav-drawer/style.css` carries
   `.sgs-nav-drawer .wp-block-sgs-nav-menu .sgs-nav-menu__bar { display:flex }` at specificity (0,3,0),
   which beats the collapse rule's (0,2,0). A real rendered `sgs/nav-drawer` dialog carries the bare
   `sgs-nav-drawer` class, so the override applies and the collapse rule loses.
   **Not a live bug. Place `collapsePoint` on the bar block only.**
2. **`submenuMinWidth`, `submenuShadow`, `submenuBorderRadius` and `submenuPadding` score BOTH** because
   the drawer's accordion list reuses the dropdown panel's `.sgs-nav-menu__submenu` class, so these do
   style it. Whether an inline accordion should offer a shadow and a minimum width is a **design call**
   for the drawer block, not something rendering can settle.

## What static analysis would have got wrong (29 attributes)

`render.php` calls its CSS emitters for both forks, so each of these emits rules into the *other* fork
that match nothing. Asking "which branch reads the attribute?" would have scored every one BOTH:

`burgerBg`, `burgerBgGradient`, `burgerColour`, `burgerColourGradient`, `burgerColourHover`, `burgerColourHoverTreatment`, `burgerFontFamily`, `burgerFontSize`, `burgerFontWeight`, `burgerHoverColour`, `burgerLetterSpacing`, `burgerLetterSpacingUnit`, `burgerSize`, `burgerTextTransform`, `itemSeparatorColour`, `itemSeparatorColourHover`, `itemSeparatorHoverTreatment`, `itemSeparatorStyle`, `itemSeparatorSweepAngle`, `itemSeparatorWidth`, `listColumns`, `sublinkMarkerColour`, `sublinkMarkerColourCurrent`, `sublinkMarkerColourCurrentGradient`, `sublinkMarkerColourGradient`, `sublinkMarkerColourHover`, `sublinkMarkerColourHoverGradient`, `submenuTopOffset`, `triggerMode`

After the split these dead emissions disappear by construction — each block runs only its own emitters.

## Method and safeguards

- Each fork renders **inside its real ancestors**: bar = `sgs/site-header > sgs/site-header-row >
  sgs/nav-menu`; drawer = `sgs/nav-drawer > sgs/nav-menu`.
- **Two configurations, merged by union.** Config A is the plain baseline
  (151 bar / 74 drawer CSS rules).
  Config B switches enablers on (167 / 90): trigger text, magnets, the featured pill, hover
  colours, sweep treatments and a submenu shadow. The ownership question is "can this control ever
  affect this fork?", and an enabler reveals an effect without moving it between forks.
- The block's uid is an `md5` of its attributes, so it is normalised before comparing — otherwise every
  rule would differ on every change.
- Selectors are matched structurally: `:hover`, `::after` and runtime-only attributes (`aria-current`,
  `[open]`) are stripped first. Stripping only ever widens a selector.
- An unparseable selector is reported as UNCERTAIN, never counted as "matches nothing".
- **Negative controls:** each baseline is rendered twice and must be byte-identical (deterministic in
  both configurations); an always-matching matcher must flip the dead-CSS verdicts (self-test).
- **Positive controls, all passed:** `burgerSize` → BAR and `megaDrawerFallbackIds` → DRAWER, both
  derived from `render.php`'s structure; `listColumns` → DRAWER and `burgerFontSize` → BAR, each of
  which proves one of the defects below is fixed.

## Defects found in the tool before this result was trusted

The first run was not presented: fact-checking it against the raw data found four defects.

| Defect | Symptom | Fix |
|---|---|---|
| nav-menu rendered in isolation | 12 attributes scoped `.sgs-nav-drawer …` scored DEAD | render inside real ancestors |
| `/Style$/` matched before `/FontStyle$/` | `itemFontStyle` tested with `"dashed"` | specific names before generic suffixes |
| empty nested default perturbed to itself | `padding` tested with its own default | fall back to a name-based shape; add the UNTESTED verdict |
| enum-less `submenuText*` typography | tested with a nonsense string | real CSS values by name |

It also over-counted framework-injected attributes as 135 by including two `_note` prose entries; the
true figure is 133.
