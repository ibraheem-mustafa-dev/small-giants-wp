# Calibration outcomes by cause (P0-11)

Rerun: `python .claude/reports/2026-10-05-session-b/classify-outcomes.py` (read-only; writes the JSON beside it). Data: `calibration-outcomes.json`.

**Method.** Dead entries use `classify()` from `classify_dead.py` unchanged (imported, not copied). Its inputs come from the existing `dump.mjs` (which writes `entries.json`) and `layer.py` (which writes `layer.json`); `layer.json` did not exist in the calibration folder, so the driver regenerates both in a temp directory. oneWidth and untestedStates labels are **mine** (`causeSource: "mine"`), derived from `reachedAt` and the cache's own reason text.

## Totals check

Summing rule: `len(dead)`, `len(oneWidth)`, `len(untestedStates)` summed over the 94 `scripts/computed-route/cache/<block>.json` files (not `.tree.json`). Result: **dead 605, oneWidth 40, untestedStates 55**, exactly the expected figures. All 605 dead entries have a `css_property` row, so none were dropped by `classify()`. No discrepancy.

## STALE_* finding

**All three STALE_* buckets are empty (0, 0, 0).** Every one of the 94 cache files was measured between 2026-10-05T04:18Z and 15:00Z; none predates 2026-10-05. This confirms the audit report's claim that all 94 were recalibrated, and means the rerun cleared the stale-measurement causes: what remains is structural. No block has an unrefreshed cache.

## 1. By cause

Dead (605):

| Cause (classify_dead.py) | Count | Cheap or expensive |
|---|---|---|
| FIXTURE_LACKS_ELEMENT | 221 | Cheap. The marked element is not in the rendered fixture tree; edit `calibration-fixtures.json` (add the content/variant that renders it). No block code. |
| RESIDUAL | 152 | Unknown. The script's catch-all. Its newer `classify3` (same file, not used for the figures above) splits it: UNEXPLAINED 106, HOVER_POINTER_MISSES_ELEMENT 21, DB_STATE_MISSING_HOVER 11, NEEDS_BG_IMAGE 7, NEEDS_VARIANT_OR_TOGGLE 4, STATE_FOCUS_UNROUTED 2, NEEDS_LAYOUT_MODE 1. 106 still need a per-setting diagnosis before any cost can be claimed. |
| PORTAL_OR_CLOSED_SURFACE | 94 | Cheap. Element lives in a closed panel or portal (82 are cart); the harness must open the surface first. Harness change. |
| READ_CAP_81 | 60 | Cheap. Block has 77+ elements and the harness read cap hides the target (46 in nav-bar-menu). Raise or scope the cap in the harness. |
| HOVER_POINTER_MISSES_CHILD | 28 | Cheap. Element exists but the hover lands on a different node; harness trigger targeting. |
| NEEDS_OVERLAY_COMPANION | 12 | Cheap. Fixture must also set the overlay/scrim companion attribute so the paint changes. |
| NEEDS_BORDER_COMPANION | 12 | Cheap. Fixture must set border style/width alongside the colour. |
| STATE_NOT_RENDERED_BY_FIXTURE | 11 | Cheap. current/open/scrolled state is not produced by the fixture; fixture or trigger change. |
| PSEUDO_ELEMENT | 8 | Cheap but harness work. The target is `::first-letter`/`::backdrop`/placeholder/focus-ring; the harness must read pseudo-element computed style. Not block code. |
| NEEDS_LAYOUT_MODE | 7 | Cheap. Fixture must select the layout mode in which the property applies. |
| STALE_FLOOR / STALE_BORDER_STYLE_NO_WIDTH / STALE_RADIUS_SIDES | 0 | Empty. |
| PSEUDO_BG_LAYER | 0 | Not fired. |
| MARKER_EQUALS_REST | 0 | Not fired. |

Honest reading: every labelled dead cause is a fixture or harness change (453 of 605 are labelled; 152 are RESIDUAL). None of the labels asserts a block-code gap. The labels are inferred from element presence and attribute names, not proved by a render, so a "cheap" label is a strong lead, not a proof; the real framework gaps (if any) sit inside the 106 UNEXPLAINED.

oneWidth (40), all mine. These are tier settings whose marker resolved at fewer than three widths. The cause of each is not proved; the likeliest, given the memory note that tiers follow container width, is a harness or fixture artefact (tier boundary versus container width), so treat as **cheap-unverified**:

| Cause (mine) | Count | Notes |
|---|---|---|
| ONEWIDTH_MISSING_768 | 21 | 375 and 1440 resolved, tablet did not (gallery, site-header-row, site-footer-row, mega-aside, notice-banner, wishlist-panel) |
| ONEWIDTH_MISSING_768_1440 | 5 | only 375 (multi-button alignItems) |
| ONEWIDTH_MISSING_375 | 5 | only 768 and 1440 resolved |
| ONEWIDTH_MISSING_1440 | 4 | |
| ONEWIDTH_NONE_REACHED | 2 | no width (brand-strip columns, decorative-image width) |
| ONEWIDTH_MISSING_375_768 | 2 | only 1440 (google-reviews star sizes) |
| ONEWIDTH_MISSING_375_1440 | 1 | |

untestedStates (55), all mine and both **cheap (harness)**:

| Cause (mine) | Count | Notes |
|---|---|---|
| UNTESTED_HOVER_ELEMENT_HIDDEN_BY_OPEN_PANEL | 51 | The cache says the element stays hidden with its panel opened; the harness must hover it in a state where it is visible (nav-drawer-menu, nav-bar-menu, nav-drawer, modal, product-search, store-selector). |
| UNTESTED_SCROLLED_CLASS_NEVER_APPLIED | 4 | site-header never took `is-header-scrolled`; harness must scroll or force the class. |

## 2. By block

Dead, top 6 (83 / 58 / 51 / 39 / 35 / 29 = 295 of 605) then: trust-bar 20, cta-section 15, container 14, gallery 12, wishlist-panel 12, card-grid 11, form 11, post-grid 11, icon-list 10, nav-drawer 10, accordion 9, before-after 9, site-footer 9, then 58 further blocks with 8 or fewer (full list in the JSON `summary.byBlock`).

oneWidth: multi-button 8, site-footer-row 7, site-header-row 7, gallery 4, notice-banner 4, wishlist-panel 3, google-reviews 2, nav-bar-menu 2, brand-strip 1, decorative-image 1, mega-aside 1.

untestedStates: nav-drawer-menu 25, nav-bar-menu 11, nav-drawer 8, modal 4, site-header 4, product-search 2, store-selector 1.

## 3. Cause by block, six largest dead

| Block | Dead | Breakdown |
|---|---|---|
| cart | 83 | PORTAL_OR_CLOSED_SURFACE 82, HOVER_POINTER_MISSES_CHILD 1 |
| nav-bar-menu | 58 | READ_CAP_81 46, RESIDUAL 7, STATE_NOT_RENDERED_BY_FIXTURE 2, PORTAL_OR_CLOSED_SURFACE 2, NEEDS_BORDER_COMPANION 1 |
| product-card | 51 | FIXTURE_LACKS_ELEMENT 47, RESIDUAL 4 |
| nav-drawer-menu | 39 | FIXTURE_LACKS_ELEMENT 24, RESIDUAL 9, STATE_NOT_RENDERED_BY_FIXTURE 5, NEEDS_BORDER_COMPANION 1 |
| hero | 35 | FIXTURE_LACKS_ELEMENT 24, RESIDUAL 10, NEEDS_OVERLAY_COMPANION 1 |
| mega-panel | 29 | FIXTURE_LACKS_ELEMENT 28, RESIDUAL 1 |

Reading: cart, nav-bar-menu, product-card and mega-panel are almost entirely one harness or fixture fix each (open the cart surface; lift the 81-element read cap; add product-card and mega-panel fixture content). That clears 82 + 46 + 47 + 28 = 203 dead settings with no block code.

## Contradictions with the audit report

None found. Totals match exactly, and every cache is dated 2026-10-05. One caveat for the next session: `layer.json` is absent from the calibration folder, so `classify_dead.py` cannot be imported as-is without running `layer.py` first (the driver does this in a temp directory).
