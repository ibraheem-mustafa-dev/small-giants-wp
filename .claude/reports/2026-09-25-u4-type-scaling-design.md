# U-4 design: type scaling (family M-45)

Wave 3C lane A. Plan `2026-09-21-wave-3c-implementation-plan.md` §4 row 10; family
`families-master.json::families[M-45]`; unit `units[U-4]`.

## 1. The problem

A menu's item text can only take three fixed sizes, one per device tier (desktop, tablet below 1024px, mobile below
768px). Five references scale their menu type in ways three numbers cannot hold: by the viewport's width between the
tiers, by its height, or by a root size that itself scales. Frozen to three numbers, their type drifts at every width
in between. The family also records that the two menu blocks' line height is a single number, not a per-tier value.

## 2. What the code does today (verified by reading)

| Piece | Today | Where |
|---|---|---|
| One emitter for all three surfaces | the bar and drawer items (`includes/nav-menu-css.php::sgs_nav_shared_css`), their submenu links (`includes/nav-menu-submenu-link-css.php`, prefix `submenu`) and business-info all call the shared typography rule | `includes/helpers-typography.php::sgs_typography_css_rule` |
| A second copy of the size transform | the bar's caret-sizing rule repeats the numeric-or-`sgs_font_size_value()` branch | `includes/nav-menu-css.php` (caret inherit rule) |
| One editor control | `TypographyControls` (94 blocks) renders core's `FontSizePicker` per tier | `src/components/TypographyControls.js::renderFontSizeRow` |
| Size tiers | `{prefix}FontSize` is a `{desktop, tablet, mobile}` object; one unit for all tiers (`{prefix}FontSizeUnit`) | same helper, `$size_is_tiered` branch |
| A tier holding a string | treated as a theme preset slug by `sgs_font_size_value()`, which passes `<number><unit>` (including `vw`/`vh`) and `clamp(…)` through, and turns anything else into `var(--wp--preset--font-size--<slug>)` | `includes/helpers-tokens.php::sgs_font_size_value` |
| So a `min()`, `max()` or `calc()` tier | becomes a broken preset reference (`var(--wp--preset--font-size--min60px667vh)`): an undefined property, so the size silently drops | same |
| Units offered in the editor | `px`, `em`, `rem` only | `TypographyControls.js::FONT_SIZE_UNIT_SLUGS` |
| Line height, business-info | already a tier object | `business-info/block.json::lineHeight` |
| Line height, both menu blocks | plain numbers (`itemLineHeight`, `submenuLineHeight`), one value for all tiers | `nav-bar-menu/block.json`, `nav-drawer-menu/block.json` |
| Tiered line height in the emitter | already supported: an object `{prefix}LineHeight` routes through the tiered branch | `sgs_typography_css_rule`, `$line_is_tiered` |

The shared single-value safety check `includes/helpers-css-safety.php::sgs_css_single_length_value` accepts one length
or one `calc()`/`min()`/`max()`/`clamp()` call (nested parens included) and rejects lists, bare keywords,
`!important` and declaration breakouts. Checked with `php -r`: every §3 formula passes unchanged; `20px !important`,
`16px 12px`, `inherit` and `20px;}body{x:1` return ''. (The wider `sgs_css_length_value` accepts all four, which is why
it is not used for font size.)

## 3. Exit cells, and how each is expressed

Tiers: desktop ≥1024px, tablet 768 to 1023px, mobile <768px. Source: `<ref>.json` rows `bar`/`drawer`/`footer`,
`cells.item_typography`.

| Reference, surface | Measured | Expressed as (per tier: desktop / tablet / mobile) | Residue |
|---|---|---|---|
| buck, bar and footer | 1.49vw from 1280px up (19.06px at 1280, 21.44px at 1440, 23.82px at 1600); 20px below | `max(1.4889vw, min(20px, (1280px - 100vw) * 1000))` / 20px / 20px | none at the captured widths |
| buck, drawer | 3.5vw from 1100px up; 52px at 1024 to 900; 39.8px at 768 to 640; 24px at 520 and below | `max(3.5vw, min(52px, (1100px - 100vw) * 1000))` / `clamp(39.8px, (100vw - 834px) * 1000, 52px)` / `clamp(24px, (100vw - 580px) * 1000, 39.8px)` | step widths inside uncaptured gaps (834 between 768 and 900; 580 between 520 and 640) |
| dogstudio, drawer | 60px at ≥1280 wide and 900 tall; 45px at 713 tall or 1100 to 520 wide; 40px at 414 and below | `min(clamp(45px, (100vh - 800px) * 1000, 60px), clamp(45px, (100vw - 1190px) * 1000, 60px))` / 45px / `clamp(40px, (100vw - 467px) * 1000, 45px)` | thresholds inside uncaptured gaps (800 tall between 713 and 900; 1190 wide between 1100 and 1280; 467 between 414 and 520) |
| fantasy, drawer | 10rem, 7rem, 5rem on a scaling root: 83.33px at 1440, 45.03px at 768, 43.60px at 375; line height equals size | `5.787vw` / `5.863vw` / `min(11.628vw, 45.03px)`; line height 1 | exact at the three captured widths; the mobile cap keeps 767px at 45.03px (a bare `11.628vw` would jump to 89px there) |
| lusion, drawer and bar | 26 / 26 / 19.5px (drawer), 14 / 14 / 10.5px (bar); line height equals size | numbers today; line height 1 | none |
| wearecollins, drawer | 72 / 58 / 48px, line height equals size | numbers today; line height 1 | none |

**The step pattern.** `clamp(A, (100vw - W) * 1000, B)` is A below width W and B above it (the multiplier makes the
middle term jump past both bounds within a pixel); `vh` in place of `vw` steps on height, and `min()` of two steps
needs both. It is plain CSS, so any stepped ladder at any breakpoint is expressible in one tier value.

**Line height.** Every reference's item line height is a fixed ratio of its size (1 for fantasy, lusion and
wearecollins; 1.4 for fantasy's sub-links), so a single unitless value already expresses all five. Per-tier line height
is still worth doing for the reason in §4.3, not for these references.

## 4. The design (revised after the council, §9)

### 4.1 A size value can be a formula (server, one function)

The rule lives in one place, `includes/helpers-tokens.php::sgs_font_size_value`, so every caller comes right with no
edit of its own: the tiered transform in `sgs_typography_css_rule`, its copy in `nav-menu-css.php` and the testimonial
render. A new `sgs_font_size_is_formula()` decides:

- **Formula:** the value contains `(`, or matches `^-?\d*\.?\d+[a-z%]+$` (a number with any unit). It is validated with
  `sgs_css_single_length_value()` and emitted as-is; a rejected formula returns '' (nothing is emitted for that tier,
  which falls through to the tier above).
- **Preset slug:** everything else, handled exactly as today. A client-defined slug such as `lorem`, `item` or `2xl`
  never starts with a digit and has no `(`, so it cannot be misread.

The separate `clamp(` branch and its `safecss_filter_attr` check go: one grammar, one validator. Numeric values are
unaffected (`is_numeric` still runs first in every caller). Behaviour change, only for values that were already broken:
a junk string used to emit an undefined `var()` and fall to the inherited size; it now emits nothing and falls to the
tier above.

### 4.2 The editor: a Size type switch (shared control)

`TypographyControls` gains a **Size type** switch above the font-size row: **Fixed** (today's picker) or **Formula** (a
text field per tier inside the existing tier switcher). It gates all three places the row renders: the tiered
`ResponsiveOverride`, the legacy flat-tier `ResponsiveControl` and the single-value branch.

- The switch shows **Formula** when any stored tier is a formula (`isFormula()`); `renderFontSizeRow`'s `isSlug`
  becomes "a string that is not a formula", so a formula is never handed to the picker as a preset.
- **Fixed → Formula** turns each numeric tier into a `<number><unit>` string using the shared unit.
- **Formula → Fixed** parses `<number><unit>` strings back to numbers; a tier that cannot be parsed is cleared, and the
  panel says how many were cleared.
- The field validates in the browser (`validateFormula()`, a mirror of the server rule) and shows an inline error
  instead of saving an invalid value; the server stays the gate.
- Help text: "Grow with the screen: `clamp(20px, 1.5vw, 24px)`. Follow the screen height: `min(60px, 6.7vh)`."

`FONT_SIZE_UNIT_SLUGS` gains `vw` and `vh`; the comment that blocked them is stale (`sgs_responsive_sanitise_unit` keeps
them) and is replaced. `src/utils/typography-preview.js` passes a validated formula through, so the canvas shows it.

In passing (found by the census, fully understood): `src/blocks/heading/edit.js::buildPreviewFontSize` receives the
whole tier object and string-coerces it to `[object Object]`, so a custom heading size never previews in the editor
canvas today. It will read the desktop tier first, as `sgs/text`'s identical helper already does.

### 4.3 Per-tier line height on both menu blocks

`itemLineHeight` and `submenuLineHeight` become tier objects (`type: object`, `default: {}`) on `sgs/nav-bar-menu` and
`sgs/nav-drawer-menu`, matching business-info and the emitter's tiered branch. `TypographyControls` renders them per
tier with no new code (its `isTieredValue()` branch; confirmed by the census). A stored number would be dropped by
WordPress against the new type, so stored values are folded into `{ "desktop": n }` by the existing tools:
`scripts/migrate-stored-tier-scalars.py --survey`, then its fold on each site's database, and
`scripts/migrate-theme-tier-scalars.py` for theme patterns. The repo stores neither attribute today (grep of `sites/`,
`theme/`, `src/`), so the canary's database is the census.

### 4.4 Height as a tier (not built)

dogstudio's height step is expressed by a `vh` formula (§3). A height-keyed tier would add a second axis to every tier
object for one reference; it is not built.

## 5. Tests (each with a negative control pinned to the parent commit)

- One shared fixture list, `tests/fixtures/font-size-formula-cases.json`, read by a PHP and a JS test so the two
  validators cannot drift: `lorem`, `system`, `2xl`, `20`, `20px`, `.5em`, `var(--x)`, `CLAMP(1px, 2vw, 3px)`,
  `20px !important`, `16px 12px`, `inherit`, `calc(&)`, `attr(x)`, `20px;}body{x:1` and the six §3 formulas, each with
  its expected class (number, slug, formula, rejected).
- `tests/php/run-type-formula-standalone.php`: every case through `sgs_font_size_value()`; each §3 formula emitted
  verbatim in the right media query by `sgs_typography_css_rule`; numeric and slug output byte-identical to the parent
  commit. Negative control: the parent-commit function turns `min(60px, 6.67vh)` into the broken preset reference.
- Line height: object `itemLineHeight` and `submenuLineHeight` emit per-tier `line-height` on both blocks.
- JS: `isFormula()`/`validateFormula()` against the same fixture; the Fixed ↔ Formula transitions.

## 6. Verification (live, one chrome-devtools window)

On sandybrown `/qa-scrim/`, the fixture sets the drawer menu to buck's three drawer formulas and the bar to buck's bar
formula. The check hides the page scrollbar so `100vw`, the media queries and `window.innerWidth` agree, and reads each
width from `window.innerWidth` (the window zooms 1.1x). Read the computed `font-size` at 1600, 1440, 1280, 1100, 1024,
900, 768, 640, 520 and 375 against §3; then dogstudio's formula at 1440 x 713, 1440 x 900 and 1100 x 900. Editor: set a
formula through the new field, save, reload and confirm it survives and previews in the canvas.

## 7. Risks

- **Shared control, 94 blocks.** Fixed stays the default; the switch appears only where the font-size row already
  does. The inspector-scan gate and a panel smoke of three other blocks guard it.
- **Formula strings reach other readers.** The census found none that break: the clone converter already stores a
  non-numeric tier verbatim (`scripts/converter/resolvers/typography.py::_tier_object_writes`); `wp-build-page.js`
  checks only the outer object type; the role map records roles, not shapes.
- **Migration.** A missed stored number loses its line height; the survey prints every hit before folding, and
  `wp-build-page.js` refuses a flat number against the new object type in new trees.
- **The `FontSizePicker` slider** tops out at 10 for non-px units; typing a larger `vw` value still works.
- **Recorded divergences:** only the chosen step thresholds inside uncaptured gaps (§3); every captured width is
  exact.

**Done when** the §3 formulas render their measured sizes live at the captured widths, a formula survives an editor
save and previews in the canvas, both menu blocks take per-tier item and submenu line height, and every existing
numeric and preset size renders byte-identically.

## 8. Options for Bean

- **A. As designed (recommended):** formula sizes in the shared control, `vw`/`vh` units, the one-function server rule,
  per-tier item and submenu line height with the survey-then-fold migration, and the heading preview fix.
- **B. A plus a "grow between two sizes" builder:** two size fields and a screen-width range that call WordPress core's
  own fluid-type function (`getComputedFluidTypographyValue` in the editor; `wp_get_computed_fluid_typography_value` on
  the server) and store the resulting `clamp()` in the tier. The way a non-technical client authors a scaling size.
  About 15 minutes more.
- **C. Formula only:** skip per-tier line height (no reference needs it; unitless already expresses all five). Saves
  the migration, leaves the menu blocks unlike business-info.

## 9. Council record (2026-09-25)

Sonnet census of every reader of font-size tiers and `itemLineHeight`, and a Fable adversarial review. Verdict GO WITH
FIXES; all five must-fixes are folded in above: the formula-vs-slug rule is a numeric-prefix test inside
`sgs_font_size_value()` (an "ends in a unit" rule would misread client slugs such as `lorem` or `item`); validation goes
through `sgs_css_single_length_value()` (the wider validator accepts lists, keywords and `!important`); defined
Fixed/Formula transitions gate all three render branches; `submenuLineHeight` migrates with `itemLineHeight` using the
existing survey and theme-pattern tools; fantasy's mobile tier is capped so 767px does not jump to 89px. Should-fixes
taken: the shared PHP/JS fixture, scrollbar-free widths in §6, canvas preview of formulas, the behaviour-change note,
core's fluid function for option B. Census claims checked before acceptance: the heading preview bug is real (fixed in
4.2); its claim that product-card's `ctaFontSize` is a tier object fed to `absint()` is wrong
(`product-card/block.json` declares it `type: number`).
