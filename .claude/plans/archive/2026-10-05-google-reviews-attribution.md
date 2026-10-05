# Google reviews: Places attribution policy, Google colours, accessibility

Policy: https://developers.google.com/maps/documentation/places/web-service/policies (logo or text "Google Maps" 16-19dp with clear space; author avatar/name/profile link; each review reachable on Google Maps via `googleMapsUri`). Place Details (New) is a GET; `authorAttribution{displayName,uri,photoUri}` and each review's `googleMapsUri` arrive inside `reviews`; the place `googleMapsUri` needs its own FieldMask entry.

## Status
Done. Built, tested, deployed and measured live on eye-care-test and sandybrown (deploys at `b70e3688d`).
Not verifiable live: the author profile link and the per-review and place "View on Google Maps" links. Neither test site has a Google API key, so its reviews are inline data with no links. The PHP render tests cover them.

## As built (all in `plugins/sgs-blocks`)
- **Logo:** Google's official Maps attribution files (`assets/google-maps-logo-dark.svg`, `-light.svg`; the zip has no licence text) on every variant at a fixed 98x18 box that cannot shrink; the light one shows on a dark ground. `logoSize`, `logoOpacity`, `showAvatar` and `showGoogleLogo` are removed.
- **Links:** author name to its Google profile; "View on Google Maps" per review and per block; https only; a missing field renders no link and logs once. `fetch_reviews` is a GET with `googleMapsUri` in the field mask and a mask-versioned cache key.
- **Colours:** defaults are Google's (`style.css::.sgs-google-reviews` tokens: star yellow, Material greys, Google blue, dark-mode set), not the theme presets; inspector colours still win. `starColour` defaults to empty, so the breakdown bars and active dot use Google's yellow too. Only the opt-in `star-primary` and `star-success` variants read the theme.
- **Buttons:** See all is white text on Google blue and darkens the blue on hover; Write a review is blue text on white with a grey border; on hover the border of Write a review and of the arrows turns blue and nothing else changes. The two pill text colours sit at two-class specificity because WordPress global styles give every link the theme's primary colour (`a:where(:not(.wp-element-button))`, later in the page), which beat a zero-specificity default on any theme whose primary is not Google blue (measured: pink text on sandybrown). With no author colour the stylesheet supplies the hover defaults; once an author sets a resting colour (a draft's colours arrive this way) `render.php::$gr_btn_attrs` supplies the same values through the button helper, which paints on a layer that outranks the stylesheet. An inspector hover value replaces the default.
- **Accessibility:** buttons and arrows default to 44px; keyboard focus is a 2px Google-blue ring; contrast of every default pair checked (Google blue on white is 4.51:1).
- **Fixtures:** sandybrown page 4940 (`/probe-google-reviews-buttons/`) renders a defaults-only slider with both buttons, for measuring the defaults on that site's pink-primary theme. Calibration page 4750 was emptied to clear the oldshape audit.

## Decision for Bean
The Eye Care clone's draft sets the arrows and both buttons to 40px (`arrowSize`, `seeAllMinHeight`, `writeReviewMinHeight` in `sites/eye-care-ward-end/build/home.tree.json`), below the 44px standard. An author value wins over the default, so the home page stays at 40px until the draft values change.

## Tests
`tests/php/GoogleReviewsLogoAlwaysShownTest.php` (render and stylesheet assertions, each red on the old code), `tests/php/stubs/google-reviews-render-prepend.php`, `tests/js/google-reviews-panels.test.js`.
