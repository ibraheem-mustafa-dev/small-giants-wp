# Google reviews: Places attribution policy, Google colours, accessibility

Policy: https://developers.google.com/maps/documentation/places/web-service/policies (logo or text "Google Maps" 16-19dp with clear space; author avatar/name/profile link; each review reachable on Google Maps via `googleMapsUri`). Place Details (New) is a GET; `authorAttribution{displayName,uri,photoUri}` and each review's `googleMapsUri` arrive inside `reviews`; the place `googleMapsUri` needs its own FieldMask entry.

## Status
Built, tested and live on eye-care-test (deploy at `2f3280554`). **Open: sandybrown is not deployed.** `build-deploy.py --target sandybrown` aborts on the oldshape audit: 155 old-shape `sgs/cta-section` blocks on the Spec 47 calibration page (post 4750). Not caused by this work; migrate that page (`scripts/wp-migrate-oldshape-blocks.js`) or empty it, then deploy.
Not verifiable live: the author profile link and the per-review and place "View on Google Maps" links. eye-care-test has no Google API key, so its reviews are inline data with no links. The PHP render tests cover them.

## As built (all in `plugins/sgs-blocks`)
- **Logo:** Google's official Maps attribution files (`assets/google-maps-logo-dark.svg`, `-light.svg`; the zip has no licence text) on every variant at a fixed 98x18 box that cannot shrink; the light one shows on a dark ground. `logoSize`, `logoOpacity`, `showAvatar` and `showGoogleLogo` are removed.
- **Links:** author name to its Google profile; "View on Google Maps" per review and per block; https only; a missing field renders no link and logs once. `fetch_reviews` is now a GET with `googleMapsUri` in the field mask and a mask-versioned cache key.
- **Colours:** defaults are Google's (`style.css::.sgs-google-reviews` tokens: star yellow, Material greys, Google blue, dark-mode set), not the theme presets; inspector colours still win. Only the opt-in `star-primary` and `star-success` variants read the theme.
- **Hover:** arrows and "Write a review" take a blue tint and blue border (the label turns the darker blue, 4.9:1); "See all" takes the darker blue. With no author colour the stylesheet supplies them; once an author sets a resting colour (a draft's colours arrive this way) `render.php::$gr_btn_attrs` supplies the same values through the button helper, which paints on a layer that outranks the stylesheet. An inspector hover value replaces the default.
- **Accessibility:** buttons and arrows default to 44px; keyboard focus is a 2px Google-blue ring.

## Decisions for Bean
- The Eye Care clone's draft sets the arrows and both buttons to 40px (`arrowSize`, `seeAllMinHeight`, `writeReviewMinHeight` in `sites/eye-care-ward-end/build/home.tree.json`), below the 44px standard. An author value wins over the default.

## Tests
`tests/php/GoogleReviewsLogoAlwaysShownTest.php` (render and stylesheet assertions, each red on the old code), `tests/php/stubs/google-reviews-render-prepend.php`, `tests/js/google-reviews-panels.test.js`.
