# Google reviews: Places attribution policy fixes

Policy: https://developers.google.com/maps/documentation/places/web-service/policies (logo or text "Google Maps" 16-19dp with clear space; author avatar/name/profile link; each review reachable on Google Maps via `googleMapsUri`). Place Details (New) is a GET; `authorAttribution{displayName,uri,photoUri}` and review `googleMapsUri` arrive inside `reviews`; place `googleMapsUri` needs its own FieldMask entry.

Decision (Bean, 2026-10-05): bundle Google's official Maps logo (`Google_Maps_Attribution_Assets.zip`, no licence text inside; DarkGray and White variants, 98x18 SVG).

## Fixes (all in `plugins/sgs-blocks`)
| # | Fix | Files |
|---|---|---|
| 1 | Official Maps logo replaces the "G" (header and badge variants) | `assets/google-maps-logo-*.svg`, `src/blocks/google-reviews/render.php`, `style.css` |
| 2 | Attribution element renders for every variant, whatever `showAggregate`, rating or count | `render.php` |
| 3 | Fixed 18px height, clear space per policy; `logoSize` and `logoOpacity` removed | `block.json`, `render.php`, `style.css`, `components/HeaderPanel.js`, `edit.js` |
| 4 | `showAvatar` removed; initial avatar fallback for photo-less reviews | `block.json`, `edit.js`, `render.php`, panels |
| 5 | Author name links to `authorAttribution.uri`; "View on Google Maps" per block (place `googleMapsUri`) and per review (review `googleMapsUri`); FieldMask gains `googleMapsUri`, cache cleared; missing field renders no link and logs | `includes/google-reviews-settings.php`, `render.php`, `style.css`, `editor.css` |

## Tests (each red on current code first)
`tests/php/GoogleReviewsLogoAlwaysShownTest.php` (extend), `tests/php/stubs/google-reviews-render-prepend.php` (add `uri`, `googleMapsUri`), `tests/js/google-reviews-panels.test.js`.

## Ship
Build, gates, `/sgs-update`, deploy eye-care-test then sandybrown, rebuild eye-care-test single-product template, recalibrate google-reviews, live check at 375/768/1440.
