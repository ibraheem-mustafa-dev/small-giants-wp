# No-inline rollout — TRACK D report (composites + child items + forms + F3-drain)

**Branch:** `feat/no-inline-track-D` (off `main` @ e54eb2ac) · **Date:** 2026-07-10 · **Status:** EDIT COMPLETE — files only, ready for the INTEGRATION session. NOT deployed, NOT landed, NOT committed to `main`.

**Roster (11):** accordion, accordion-item, tabs, tab, testimonial-slider, content-collection, trust-bar, pricing-table, form, form-step, form-field-tiles.

**Local verification (STOP-16, run by the orchestrator — NOT the migrators):**
- `php -l` clean on all 11 render.php.
- `npm run build` GREEN (node_modules junctioned from main). All prebuild gates pass: `check-dead-controls` 0 net-new (74 blocks); `check-hardcoded-render-defaults` 0 net-new F3 (9 known-debt rows untouched in baseline — Track-D's 3 stay for the integrator to remove, see F3 section); `check-control-ux` 0 net-new (a trust-bar `minHeightTablet/Mobile` RESPONSIVE-FAMILY-WITHOUT-SWITCHER violation was introduced by the edit.js rebuild and FIXED by the orchestrator — wrapped in `<ResponsiveControl>` per the container idiom); webpack compiled + postbuild OK.
- Zero residual inline property declarations across all 11 render.php (only allowed `style="--var:…"` CSS-var writes remain: `--sgs-slides-visible`, `--sgs-progress-colour`, `--sgs-trust-badge-icon-fill`, `--sgs-pt-ribbon-bg`, `--sgs-scroll-distance`). Zero `.style.<property>=` writes in any view.js (only `.setProperty('--x',…)`).

**Pattern for all 11: KEEP-WRAPPER.** Every block delegates its outer box to `SGS_Container_Wrapper::render()` and is a genuine composite/child — none is a single-semantic-element block. The wrapper is fully no-inline (D292/D294/D296), so keeping it is contract-compliant. The wrapper emits the section box (base+tier spacing / border-radius / max-width / contentWidth / band / grid) scoped; each block re-emits its OWN `color` + `typography` supports scoped via `wp_style_engine_get_styles` (hero pattern) + re-adds `has-*-color` preset classes (skip-serialisation suppresses WP's auto-add), plus its per-element extras.

---

## Per-block

| Block | supports skip-serialised | inline→scoped fixes | view.js fix | box-object attrs added |
|---|---|---|---|---|
| accordion | color, typography, spacing, border | none | `.style.height/overflow/transition` → `--sgs-accordion-height` var + `.is-open`/`.is-animating` classes | paddingTablet, paddingMobile, marginTablet, marginMobile |
| accordion-item | color, border | header colour + icon colour → scoped `.uid .el{…}` | — | none |
| tabs | color, spacing, border | none | already clean (`.setProperty('--var')`) | none |
| tab | color, border | none (class uid protects ARIA panel `id`) | — | none |
| testimonial-slider | color, typography, spacing, border | none (only `--sgs-slides-visible` var) | `.style.transform/transition` → `--sgs-slider-offset` var + `.no-transition`/`.is-dragging` | none |
| content-collection | color, spacing(margin), border | none | — | none |
| trust-bar | color, spacing, border | title colour + label colour (2 sites) → scoped | `.style.animationPlayState` → `.is-paused` class | paddingTablet, paddingMobile, marginTablet, marginMobile, contentBandPadding, contentBandPaddingTablet, contentBandPaddingMobile |
| pricing-table | color, typography, spacing, border | 6 per-element colours: badge/price/feature/CTA/title → block-level scoped rules; ribbon → per-plan `--sgs-pt-ribbon-bg` var value | clean | none |
| form | color, typography, spacing, border | submit-button colour → scoped rule; honeypot `position:absolute…` → existing `.sgs-form__honeypot` class | clean | paddingTablet, paddingMobile, marginTablet, marginMobile |
| form-step | color, spacing, border | none | — | none |
| form-field-tiles | color, border | none | — | none |

### New box-object attrs for CENTRAL DB seeding (integrator adds to `sgs-update-v2.py`, `box_family` column)
All `{top,right,bottom,left}` object shape (`{"type":"object","default":{}}`):

```
(sgs/accordion,   paddingTablet,             padding)
(sgs/accordion,   paddingMobile,             padding)
(sgs/accordion,   marginTablet,              margin)
(sgs/accordion,   marginMobile,              margin)
(sgs/form,        paddingTablet,             padding)
(sgs/form,        paddingMobile,             padding)
(sgs/form,        marginTablet,              margin)
(sgs/form,        marginMobile,              margin)
(sgs/trust-bar,   paddingTablet,             padding)
(sgs/trust-bar,   paddingMobile,             padding)
(sgs/trust-bar,   marginTablet,              margin)
(sgs/trust-bar,   marginMobile,              margin)
(sgs/trust-bar,   contentBandPadding,        content-band-padding)
(sgs/trust-bar,   contentBandPaddingTablet,  content-band-padding)
(sgs/trust-bar,   contentBandPaddingMobile,  content-band-padding)
```

### Flat attrs REMOVED (trust-bar only — 24 total)
`paddingTopTablet…paddingLeftMobile` (8), `marginTopTablet…marginLeftMobile` (8), `contentBandPadding{Top,Right,Bottom,Left}` base (4) + 3 inconsistent legacy flat leftovers (`contentBandPaddingTopMobile/RightTablet/TopTablet`). No `*Unit` companions existed for these families. trust-bar's edit.js was rebuilt from the default `<ContainerWrapperControls>` aggregator (which still writes the deleted flats) to individual panels + `ResponsiveBoxControl` mirroring `container/edit.js` — every remaining attr has a bound control, every removed attr had its control removed (0 dead controls).

---

## F3 disposition — ALL THREE Track-D rows are MIS-TAGGED (report for `P-F3-NAV-MISTAG-GATE`, do NOT force-wire)

The baseline (`hardcoded-render-defaults-baseline.json`) matches on file+property+value with no line number, so it caught structural CSS, not dead-control overrides. Each was traced against the live render path, not inferred:

| Row | Verdict | Trace |
|---|---|---|
| `sgs/form` `gap:0.5rem` (style.css 227/236/269) | **MIS-TAGGED** | Lives on DESCENDANTS (`.sgs-form-field__options`/`__option`/`.sgs-form-tile`), NOT the form root the `gap` attr controls (root gap flows through the wrapper). No control overrides these descendant gaps. |
| `sgs/content-collection` `grid-template-columns:1fr` (style.css:22) | **MIS-TAGGED** | Base/mobile default on `.sgs-content-collection__grid`. render.php reads only `columns` → desktop `--columns` var. `columnsMobile/columnsTablet/gridTemplateColumns*` are inherited boilerplate NEVER read by this block's render; the wrapper only reads them when `layout='grid'` (never set) and would target its own outer div, not `__grid`. edit.js documents "Mobile always shows 1 column" — a deliberate structural default with zero overriding path. |
| `sgs/pricing-table` `grid-template-columns:1fr` (style.css:30) | **MIS-TAGGED** | Base default on `.sgs-pricing-table__grid`. `columns` drives the `--columns-N` modifier class at `@media ≥768px` — the only live control. `columnsMobile/columnsTablet/gridTemplateColumns*` never read in render; wrapper grid targets its own `.uid`, never `__grid`. No control reaches the base `1fr` at any tier. |

**Integrator action:** the `P-F3-NAV-MISTAG-GATE` fix should improve attr↔property precision (the gate must not flag a structural/descendant/no-control literal), then these 3 baseline rows can be re-evaluated/removed. Track D did NOT edit `hardcoded-render-defaults-baseline.json`.

---

## Notes / flags for the integrator
- **Central seeding required** before LAND: add the 15 box-object `box_family` seeds above to `sgs-update-v2.py` (one edit).
- **Pre-existing HERO debt (out of Track-D scope, surfaced by the trust-bar agent):** hero's block.json still declares OLD flat `paddingTopTablet…` (no `paddingTablet` object) and hero's edit.js still mounts the legacy `<ResponsiveSpacingPanel>` writing those now-orphaned flats, while the shared wrapper reads only the object shape — so hero's tablet/mobile padding/margin override UI is currently a dead path. Recommend the hero/reconcile owner fixes this.
- **form-field-tiles bonus fix:** its declared color/border supports were previously DEAD (rendered nowhere — `field_open()` bypasses `get_block_wrapper_attributes()`); now wired via a uid class through `field_open()`'s existing `$extra_class` param (no shared-file edit).
- LANDED verification (asymmetric instances at 375/768/1440, zero-inline + computed box) is the INTEGRATION session's serial job after merge + one deploy. Emit ≠ LANDED.
