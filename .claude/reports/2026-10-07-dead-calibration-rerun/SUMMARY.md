# Dead-calibration rerun, 2026-10-07

## Run order and commands

All run from `.claude/reports/2026-10-07-dead-calibration-rerun/` (scripts copied unchanged; absolute repo paths kept, no path edits were needed).

1. `node dump.mjs` : reads `scripts/computed-route/cache/*.json` (not `.tree.json`), `calibration-fixtures.json`, the two theme snapshots and the framework DB read-only (`lib/db.mjs::openDb` uses `readOnly: true`); writes `entries.json`. Printed: `{ discovered: 624, dead: 546, noMarker: 99, oneWidth: 23, untested: 58, rejected: 2 }`.
2. `python layer.py` : scans block PHP; writes `layer.json` (read by `classify_dead.py`).
3. `python run_classify.py` : NEW 20-line driver I added, because `classify_dead.py` only defines classifiers and has no main (it imports `elem.py`, which reads the caches). It calls `classify3` on every `dead` entry of `entries.json` and writes `dead-classified.csv`. `classify3` raises IndexError on an entry with no row carrying a `css_property`; the driver labels those `NO_CSS_PROPERTY_ROW` instead (5 entries).
4. `node miss.mjs` : optional side check (unread-property census); output not used below.
5. `python mk.py` : builds this file.

`codeidx.py` and `readpath.py` are not imported by anything in the chain (library helpers); not run. No hard limits were hit: no cache writes, DB read-only, no browser, no network.

## Totals

Dead settings today: **546** (2026-10-05 session-b report: 605; the 10-04 CSV: 711).

## Per-class counts

Columns: today (`classify3`); 2026-10-04 `classify3` split of RESIDUAL as quoted in the task (only those 7 classes were split; 152 RESIDUAL then); 2026-10-04 CSV `all-entries-classified.csv` dead rows (older `classify`/`classify2` labels, 1,567 rows total, dead sum below).

| Class | Today | 10-04 classify3 | 10-04 CSV (dead) |
|---|---|---|---|
| FIXTURE_LACKS_ELEMENT | 210 | - | 321 |
| UNEXPLAINED | 106 | 106 | 23 |
| PORTAL_OR_CLOSED_SURFACE | 55 | - | 55 |
| READ_CAP_81 | 53 | - | 62 |
| HOVER_POINTER_MISSES_ELEMENT | 38 | 21 | 39 |
| NEEDS_OVERLAY_COMPANION | 13 | - | 9 |
| DB_STATE_MISSING_HOVER | 12 | 11 | 2 |
| STATE_NOT_RENDERED_BY_FIXTURE | 11 | - | 8 |
| NEEDS_BORDER_COMPANION | 9 | - | 22 |
| NEEDS_LAYOUT_MODE | 9 | 1 | 21 |
| PSEUDO_ELEMENT | 8 | - | 10 |
| UID_COLLISION_CONTEXT | 7 | - | 13 |
| NO_CSS_PROPERTY_ROW | 5 | - | - |
| NEEDS_BG_IMAGE | 5 | 7 | 4 |
| NEEDS_VARIANT_OR_TOGGLE | 3 | 4 | 19 |
| STATE_FOCUS_UNROUTED | 2 | 2 | 2 |
| GENUINE_BUG_NOT_READ | 0 | - | 4 |
| STALE_RADIUS_SIDES | 0 | - | 7 |
| DB_ROUTING_WRONG | 0 | - | 3 |
| MARKER_OFF_RENDER_WHITELIST | 0 | - | 1 |
| STALE_BORDER_STYLE_NO_WIDTH | 0 | - | 29 |
| MARKER_EQUALS_REST | 0 | - | 7 |
| PSEUDO_BG_LAYER | 0 | - | 33 |
| MARKER_WRONG_SHAPE | 0 | - | 16 |
| STALE_FLOOR | 0 | - | 1 |
| **Total** | **546** | 152 RESIDUAL split | **711** |

Caveat: the 10-04 classify3 column covers only the RESIDUAL bucket (152 of 605 dead on the 10-05 recalibrated caches); the other classes were not split by classify3 then, so only the 7 split classes (and UNEXPLAINED) compare like-for-like with the other columns here.

## UNEXPLAINED rows today (106)

| block | setting | css_property | css_element | css_state | measured | site |
|---|---|---|---|---|---|---|
| sgs/accordion | textIndent | text-indent | wrapper | - | 2026-10-05T04:19:04.059Z | local-eye-care |
| sgs/before-after | boxShadowColour | box-shadow-color | wrapper | - | 2026-10-05T04:19:47.864Z | local-sandybrown |
| sgs/brand-strip | tileShadowColour | box-shadow-color | tile | - | 2026-10-05T04:21:36.552Z | local-sandybrown |
| sgs/button | customWidth | width | wrapper | - | 2026-10-07T11:00:04.468Z | local-eye-care |
| sgs/button | transitionEasing | transition-timing-function | - | - | 2026-10-07T11:00:04.468Z | local-eye-care |
| sgs/buybox | stackBelow | min-width | - | - | 2026-10-05T04:24:49.693Z | local-eye-care |
| sgs/card-grid | cardShadow | box-shadow | item | - | 2026-10-05T04:25:56.862Z | local-eye-care |
| sgs/card-grid | cardShadowColour | box-shadow-color | item | - | 2026-10-05T04:25:56.862Z | local-eye-care |
| sgs/card-grid | gridTemplateColumns | grid-template-columns | wrapper | - | 2026-10-05T04:25:56.862Z | local-eye-care |
| sgs/container | backgroundImageMobile | background-image | - | - | 2026-10-07T11:14:47.831Z | local-eye-care |
| sgs/container | backgroundImageTablet | background-image | - | - | 2026-10-07T11:14:47.831Z | local-eye-care |
| sgs/container | gridTemplateColumns | grid-template-columns | inner | - | 2026-10-07T11:14:47.831Z | local-eye-care |
| sgs/container | scrollItemWidth | flex | - | - | 2026-10-07T11:14:47.831Z | local-eye-care |
| sgs/cta-section | backgroundImage | background-image | - | - | 2026-10-07T11:16:59.471Z | local-eye-care |
| sgs/cta-section | backgroundImageMobile | background-image | - | - | 2026-10-07T11:16:59.471Z | local-eye-care |
| sgs/cta-section | backgroundImageTablet | background-image | - | - | 2026-10-07T11:16:59.471Z | local-eye-care |
| sgs/cta-section | textColour | color | wrapper | - | 2026-10-07T11:16:59.471Z | local-eye-care |
| sgs/cta-section | textIndent | text-indent | - | - | 2026-10-07T11:16:59.471Z | local-eye-care |
| sgs/cta-section | transitionDuration | transition,transition-duration | - | - | 2026-10-07T11:16:59.471Z | local-eye-care |
| sgs/feature-grid | gridTemplateColumns | grid-template-columns | wrapper | - | 2026-10-05T04:24:31.450Z | local-sandybrown |
| sgs/form | gridTemplateColumns | grid-template-columns | inner | - | 2026-10-05T04:36:23.259Z | local-eye-care |
| sgs/form | textIndent | text-indent | - | - | 2026-10-05T04:36:23.259Z | local-eye-care |
| sgs/form-field-hidden | sgsHideOnDesktop | display | wrapper | - | 2026-10-05T04:25:45.452Z | local-sandybrown |
| sgs/form-field-hidden | sgsHideOnMobile | display | wrapper | - | 2026-10-05T04:25:45.452Z | local-sandybrown |
| sgs/form-field-hidden | sgsHideOnTablet | display | wrapper | - | 2026-10-05T04:25:45.452Z | local-sandybrown |
| sgs/gallery | gridTemplateColumns | grid-template-columns | wrapper | - | 2026-10-07T10:55:22.951Z | local-eye-care |
| sgs/heading | transitionDuration | transition-duration | wrapper | - | 2026-10-07T11:18:17.718Z | local-eye-care |
| sgs/heading | transitionEasing | transition-timing-function | wrapper | - | 2026-10-07T11:18:17.718Z | local-eye-care |
| sgs/hero | backgroundImageMobile | background-image | - | - | 2026-10-07T13:50:54.542Z | local-eye-care |
| sgs/hero | backgroundImageTablet | background-image | - | - | 2026-10-07T13:50:54.542Z | local-eye-care |
| sgs/hero | bgSvgOpacity | opacity | - | - | 2026-10-07T13:50:54.542Z | local-eye-care |
| sgs/hero | bgZoomStart | transform | - | - | 2026-10-07T13:50:54.542Z | local-eye-care |
| sgs/hero | gridTemplateColumns | grid-template-columns | wrapper | - | 2026-10-07T13:50:54.542Z | local-eye-care |
| sgs/hero | maxWidth | max-width | wrapper | - | 2026-10-07T13:50:54.542Z | local-eye-care |
| sgs/hero | textIndent | text-indent | - | - | 2026-10-07T13:50:54.542Z | local-eye-care |
| sgs/icon-list | iconBoxSize | height | icon | - | 2026-10-07T11:20:44.314Z | local-eye-care |
| sgs/info-box | textIndent | text-indent | - | - | 2026-10-05T04:29:10.931Z | local-sandybrown |
| sgs/mega-aside | asideBgGradient | background-image | wrapper | - | 2026-10-07T10:55:49.602Z | local-eye-care |
| sgs/mega-aside | asideBorderColourGradient | border-color-gradient | wrapper | - | 2026-10-07T10:55:49.602Z | local-eye-care |
| sgs/mega-panel | shadowColour | box-shadow-color | wrapper | - | 2026-10-05T04:41:57.464Z | local-eye-care |
| sgs/multi-button | backgroundImageMobile | background-image | - | - | 2026-10-07T11:21:18.703Z | local-eye-care |
| sgs/multi-button | backgroundImageTablet | background-image | - | - | 2026-10-07T11:21:18.703Z | local-eye-care |
| sgs/multi-button | bgSvgMinHeight | min-height | - | - | 2026-10-07T11:21:18.703Z | local-eye-care |
| sgs/nav-bar-menu | burgerBarGap | gap | burger-icon | - | 2026-10-07T19:04:02.353Z | local-eye-care |
| sgs/nav-bar-menu | burgerBgGradient | background-image | burger | - | 2026-10-07T19:04:02.353Z | local-eye-care |
| sgs/nav-bar-menu | burgerBorderRadius | border-radius | burger | - | 2026-10-07T19:04:02.353Z | local-eye-care |
| sgs/nav-bar-menu | itemBorderRadius | border-radius | item | - | 2026-10-07T19:04:02.353Z | local-eye-care |
| sgs/nav-bar-menu | itemMotionEasing | transition-timing-function | item | - | 2026-10-07T19:04:02.353Z | local-eye-care |
| sgs/nav-bar-menu | submenuAnimationDuration | animation,transition-duration | - | - | 2026-10-07T19:04:02.353Z | local-eye-care |
| sgs/nav-bar-menu | submenuCaretSize | height,width | - | - | 2026-10-07T19:04:02.353Z | local-eye-care |
| sgs/nav-bar-menu | submenuCaretTurnDuration | transition-duration | - | - | 2026-10-07T19:04:02.353Z | local-eye-care |
| sgs/nav-bar-menu | submenuCaretTurnEasingCustom | transition-timing-function | - | - | 2026-10-07T19:04:02.353Z | local-eye-care |
| sgs/nav-bar-menu | submenuItemStaggerDistance | translate | - | - | 2026-10-07T19:04:02.353Z | local-eye-care |
| sgs/nav-drawer | closeRadius | border-radius | close | - | 2026-10-07T14:18:33.939Z | local-eye-care |
| sgs/nav-drawer | entryEasing | animation,animation-timing-function | body | - | 2026-10-07T14:18:33.939Z | local-eye-care |
| sgs/nav-drawer | sgsHideOnDesktop | display | wrapper | - | 2026-10-07T14:18:33.939Z | local-eye-care |
| sgs/nav-drawer | sgsHideOnMobile | display | wrapper | - | 2026-10-07T14:18:33.939Z | local-eye-care |
| sgs/nav-drawer | sgsHideOnTablet | display | wrapper | - | 2026-10-07T14:18:33.939Z | local-eye-care |
| sgs/nav-drawer-menu | itemBorderRadius | border-radius | item | - | 2026-10-05T04:35:44.808Z | local-sandybrown |
| sgs/nav-drawer-menu | itemOrnamentGap | gap | ornament | - | 2026-10-05T04:35:44.808Z | local-sandybrown |
| sgs/nav-drawer-menu | itemTextDecoration | text-decoration | item | - | 2026-10-05T04:35:44.808Z | local-sandybrown |
| sgs/nav-drawer-menu | sublinkMarkerColour | fill | sublink | - | 2026-10-05T04:35:44.808Z | local-sandybrown |
| sgs/nav-drawer-menu | submenuCaretGap | gap | - | - | 2026-10-05T04:35:44.808Z | local-sandybrown |
| sgs/nav-drawer-menu | submenuItemStaggerDistance | translate | - | - | 2026-10-05T04:35:44.808Z | local-sandybrown |
| sgs/nav-drawer-menu | submenuLinkPadding | padding | sublink | - | 2026-10-05T04:35:44.808Z | local-sandybrown |
| sgs/nav-drawer-menu | submenuTextAlign | text-align | sublink | - | 2026-10-05T04:35:44.808Z | local-sandybrown |
| sgs/nav-drawer-menu | submenuTextDecoration | text-decoration | sublink | - | 2026-10-05T04:35:44.808Z | local-sandybrown |
| sgs/notice-banner | textIndent | text-indent | - | - | 2026-10-07T12:40:01.391Z | local-eye-care |
| sgs/notice-message | backgroundColour | background-color | wrapper | - | 2026-10-05T04:37:07.896Z | local-sandybrown |
| sgs/notice-message | backgroundColourGradient | background-image | wrapper | - | 2026-10-05T04:37:07.896Z | local-sandybrown |
| sgs/option-picker | tileGap | gap | pill | - | 2026-10-05T04:37:33.998Z | local-sandybrown |
| sgs/physics-canvas | backgroundImageMobile | background-image | - | - | 2026-10-05T04:38:15.871Z | local-sandybrown |
| sgs/physics-canvas | backgroundImageTablet | background-image | - | - | 2026-10-05T04:38:15.871Z | local-sandybrown |
| sgs/post-grid | alignItems | align-items | - | - | 2026-10-05T04:39:23.647Z | local-sandybrown |
| sgs/post-grid | gridTemplateColumns | grid-template-columns | wrapper | - | 2026-10-05T04:39:23.647Z | local-sandybrown |
| sgs/post-grid | shadowColour | box-shadow-color | card | - | 2026-10-05T04:39:23.647Z | local-sandybrown |
| sgs/product-card | descTextIndent | text-indent | description | - | 2026-10-05T04:52:59.624Z | local-eye-care |
| sgs/product-card | maxWidth | max-width | - | - | 2026-10-05T04:52:59.624Z | local-eye-care |
| sgs/product-card | pickerLabelColourGradient | color-gradient | - | - | 2026-10-05T04:52:59.624Z | local-eye-care |
| sgs/product-card | pickerLabelFontSize | font-size | - | - | 2026-10-05T04:52:59.624Z | local-eye-care |
| sgs/product-faq | textIndent | text-indent | - | - | 2026-10-05T04:42:40.514Z | local-sandybrown |
| sgs/quote | boxShadowColour | box-shadow-color | wrapper | - | 2026-10-05T04:43:35.633Z | local-sandybrown |
| sgs/separator | contentIconSize | height,width | icon | - | 2026-10-05T04:44:14.932Z | local-sandybrown |
| sgs/site-footer | backgroundAttachment | background-attachment | wrapper | - | 2026-10-05T04:54:06.032Z | local-eye-care |
| sgs/site-footer | backgroundImageMobile | background-image | - | - | 2026-10-05T04:54:06.032Z | local-eye-care |
| sgs/site-footer | backgroundImageTablet | background-image | - | - | 2026-10-05T04:54:06.032Z | local-eye-care |
| sgs/site-footer-row | gridTemplateColumns | grid-template-columns | wrapper | - | 2026-10-07T10:53:31.212Z | local-eye-care |
| sgs/site-footer-row | rowShrinkPadding | padding | - | - | 2026-10-07T10:53:31.212Z | local-eye-care |
| sgs/site-header-row | gridTemplateColumns | grid-template-columns | wrapper | - | 2026-10-07T10:52:57.057Z | local-eye-care |
| sgs/site-header-row | rowShrinkPadding | padding | - | - | 2026-10-07T10:52:57.057Z | local-eye-care |
| sgs/social-icons | iconBackgroundGradient | background-image | item | - | 2026-10-05T05:09:34.768Z | local-eye-care |
| sgs/tabs | gridTemplateColumns | grid-template-columns | inner | - | 2026-10-07T13:55:33.633Z | local-eye-care |
| sgs/tabs | transitionDuration | transition-duration | tab | - | 2026-10-07T13:55:33.633Z | local-eye-care |
| sgs/text | textIndent | text-indent | wrapper | - | 2026-10-07T14:06:46.416Z | local-eye-care |
| sgs/text | transitionDuration | transition-duration | wrapper | - | 2026-10-07T14:06:46.416Z | local-eye-care |
| sgs/text | transitionEasing | transition-timing-function | wrapper | - | 2026-10-07T14:06:46.416Z | local-eye-care |
| sgs/timeline | milestoneMinHeight | min-height | entry | - | 2026-10-05T04:49:56.659Z | local-sandybrown |
| sgs/trust-bar | backgroundAttachment | background-attachment | wrapper | - | 2026-10-07T14:14:27.560Z | local-eye-care |
| sgs/trust-bar | backgroundImageMobile | background-image | - | - | 2026-10-07T14:14:27.560Z | local-eye-care |
| sgs/trust-bar | backgroundImageTablet | background-image | - | - | 2026-10-07T14:14:27.560Z | local-eye-care |
| sgs/wishlist-link | iconColour | color | icon | - | 2026-10-05T04:51:06.198Z | local-sandybrown |
| sgs/wishlist-panel | barBackgroundColour | background-color | bar | - | 2026-10-05T04:51:22.802Z | local-sandybrown |
| sgs/wishlist-panel | buttonBackgroundColour | background-color | button | - | 2026-10-05T04:51:22.802Z | local-sandybrown |
| sgs/wishlist-panel | buttonTextColour | color | button | - | 2026-10-05T04:51:22.802Z | local-sandybrown |
| sgs/wishlist-panel | shareFieldBackgroundColour | background-color | shareField | - | 2026-10-05T04:51:22.802Z | local-sandybrown |
| sgs/wishlist-panel | shareFieldTextColour | color | shareField | - | 2026-10-05T04:51:22.802Z | local-sandybrown |

## UNEXPLAINED grouped by css_property

| css_property | count |
|---|---|
| background-image | 19 |
| grid-template-columns | 10 |
| text-indent | 9 |
| box-shadow-color | 6 |
| display | 6 |
| transition-timing-function | 5 |
| color | 4 |
| transition-duration | 4 |
| border-radius | 4 |
| gap | 4 |
| background-color | 4 |
| padding | 3 |
| max-width | 2 |
| min-height | 2 |
| translate | 2 |
| height,width | 2 |
| text-decoration | 2 |
| background-attachment | 2 |
| width | 1 |
| min-width | 1 |
| box-shadow | 1 |
| flex | 1 |
| transition,transition-duration | 1 |
| opacity | 1 |
| transform | 1 |
| height | 1 |
| border-color-gradient | 1 |
| animation,transition-duration | 1 |
| text-align | 1 |
| fill | 1 |
| animation,animation-timing-function | 1 |
| align-items | 1 |
| font-size | 1 |
| color-gradient | 1 |

## UNEXPLAINED grouped by block

| block | count |
|---|---|
| sgs/nav-bar-menu | 10 |
| sgs/nav-drawer-menu | 9 |
| sgs/hero | 7 |
| sgs/cta-section | 6 |
| sgs/nav-drawer | 5 |
| sgs/wishlist-panel | 5 |
| sgs/container | 4 |
| sgs/product-card | 4 |
| sgs/card-grid | 3 |
| sgs/form-field-hidden | 3 |
| sgs/multi-button | 3 |
| sgs/post-grid | 3 |
| sgs/site-footer | 3 |
| sgs/text | 3 |
| sgs/trust-bar | 3 |
| sgs/button | 2 |
| sgs/form | 2 |
| sgs/heading | 2 |
| sgs/mega-aside | 2 |
| sgs/notice-message | 2 |
| sgs/physics-canvas | 2 |
| sgs/site-footer-row | 2 |
| sgs/site-header-row | 2 |
| sgs/tabs | 2 |
| sgs/accordion | 1 |
| sgs/before-after | 1 |
| sgs/brand-strip | 1 |
| sgs/buybox | 1 |
| sgs/feature-grid | 1 |
| sgs/gallery | 1 |
| sgs/icon-list | 1 |
| sgs/info-box | 1 |
| sgs/mega-panel | 1 |
| sgs/notice-banner | 1 |
| sgs/option-picker | 1 |
| sgs/product-faq | 1 |
| sgs/quote | 1 |
| sgs/separator | 1 |
| sgs/social-icons | 1 |
| sgs/timeline | 1 |
| sgs/wishlist-link | 1 |

## sgs/hero dead settings today (15)

| setting | class | css_property | css_element | css_state | measured | site |
|---|---|---|---|---|---|---|
| backgroundColourHoverGradient | HOVER_POINTER_MISSES_ELEMENT | background-image | - | hover | 2026-10-07T13:50:54.542Z | local-eye-care |
| backgroundImageMobile | UNEXPLAINED | background-image | - | - | 2026-10-07T13:50:54.542Z | local-eye-care |
| backgroundImageTablet | UNEXPLAINED | background-image | - | - | 2026-10-07T13:50:54.542Z | local-eye-care |
| backgroundOverlayBlendMode | NEEDS_OVERLAY_COMPANION | mix-blend-mode | - | - | 2026-10-07T13:50:54.542Z | local-eye-care |
| backgroundOverlayColourHover | FIXTURE_LACKS_ELEMENT | background-color | overlay | hover | 2026-10-07T13:50:54.542Z | local-eye-care |
| bgSvgOpacity | UNEXPLAINED | opacity | - | - | 2026-10-07T13:50:54.542Z | local-eye-care |
| bgZoomStart | UNEXPLAINED | transform | - | - | 2026-10-07T13:50:54.542Z | local-eye-care |
| gridTemplateColumns | UNEXPLAINED | grid-template-columns | wrapper | - | 2026-10-07T13:50:54.542Z | local-eye-care |
| maxWidth | UNEXPLAINED | max-width | wrapper | - | 2026-10-07T13:50:54.542Z | local-eye-care |
| mediaBackground | FIXTURE_LACKS_ELEMENT | background-color | media | - | 2026-10-07T13:50:54.542Z | local-eye-care |
| mediaBackgroundGradient | FIXTURE_LACKS_ELEMENT | background-image | media | - | 2026-10-07T13:50:54.542Z | local-eye-care |
| mediaPadding | FIXTURE_LACKS_ELEMENT | padding | media | - | 2026-10-07T13:50:54.542Z | local-eye-care |
| overlayGradientHover | FIXTURE_LACKS_ELEMENT | background-image | overlay | hover | 2026-10-07T13:50:54.542Z | local-eye-care |
| textIndent | UNEXPLAINED | text-indent | - | - | 2026-10-07T13:50:54.542Z | local-eye-care |
| verticalAlignment | NEEDS_LAYOUT_MODE | justify-content | - | - | 2026-10-07T13:50:54.542Z | local-eye-care |

## NO_CSS_PROPERTY_ROW entries

- sgs/container::bgHoverZoomScale
- sgs/cta-section::bgHoverZoomScale
- sgs/multi-button::bgHoverZoomScale
- sgs/physics-canvas::bgHoverZoomScale
- sgs/site-footer::bgHoverZoomScale

## Measured range

2026-10-05T04:18:44.354Z to 2026-10-07T19:04:02.353Z
