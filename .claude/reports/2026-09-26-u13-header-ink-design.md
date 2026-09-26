# U-13 design: header scroll intelligence (M-04 section-adaptive ink, M-03 direction-keyed restyle)

Wave 3C, lane B. Plan `.claude/plans/2026-09-21-wave-3c-implementation-plan.md` §4 row 13. Bean column: `design`.
Measurements: headless Playwright sweep 2026-09-26 (raw samples and scripts in the session scratchpad `m04/`;
values below are read from those samples and from `<ref>.json`).

## 1. Problem

A header's text, icons and logo keep one colour however the page moves under them. On a transparent or
see-through header that means white ink disappears over a light section and dark ink over a dark one. Five
references change the ink (and sometimes the fill) to suit the section behind. Nothing in SGS reads what
passes under the header (`families-master.json::M-04.note`).

M-03's one gap: `headerTransparentDirection` keys the scrolled paint on scroll POSITION; fantasy keys it on
scroll DIRECTION (fill fades going down, returns going up, at any offset past 100px).

## 2. What already exists (the design leans on it)

- **Ink cascades.** `nav-bar-menu` links and burger, `cart`, `product-search`, `wishlist-link`, `button`,
  `social-icons` all paint with `color: inherit` / `currentColor`. One `color` on the header root repaints
  every control. While ink is live it also overrides the bar's own `itemColour` on top-level links and the
  burger (hover, focus and dropdown panels keep theirs): all eight header patterns set `itemColour: text`, so
  a menu colour winning left the menu unreadable (live check 2026-09-26; Bean chose "ink wins while live").
- **Sections already know their tone.** `SGS_Container_Wrapper` stamps `sgs-on-dark` / `sgs-on-light` on every
  section-kind block (container, hero, cta-section, …) from its painted layers
  (`helpers-surface-tone.php::sgs_surface_tone_class`). Image layers are never sampled, so an image section
  with no decisive overlay gets NO class.
- **The logo has a dark variant.** `responsive-logo::darkLogoId` renders `.sgs-responsive-logo__dark` stacked
  on the light logo (shown today only in dark mode). Inline SVG logos already follow `currentColor`.
- **The scroll loop exists.** `src/header-behaviours/view.js::initScrollBehaviours` already runs a
  rAF-coalesced passive scroll listener and toggles `is-header-scrolling-down`.

## 3. Exit cells

| Ref | Surface | Tier | Column | Measured | Expressed by |
|---|---|---|---|---|---|
| wearecollins | header-shell | 375/768/1440 | ground | ink `#140700` on light `#f8f8f7`, ink `#f8f8f7` on dark `#140700` (18.7:1 both); fill follows the section in the scrolled state; fill `opacity 0.4s cubic-bezier(0.445,0.05,0.55,0.95)`, ink settles ~500ms | `sectionInk: adapt`, `inkOnLight #140700`, `inkOnDark #f8f8f7`, `fillOnLight #f8f8f7`, `fillOnDark #140700`, `inkDuration 400`, `inkEasing custom` + that curve |
| lusion | header-shell | 375/768/1440 | ground | `is-white-bg` → ink `rgb(0,0,0)` (live); `is-black-bg`/`is-blue-bg` → light ink (JSON only); no fill change; `color 0.5s ease` | `sectionInk: adapt`, `inkOnLight #000`, `inkOnDark #fff`, `inkDuration 500`, `inkEasing ease` |
| fantasy | header-shell | 375/768/1440 | ground | dark/video only observed live (full sweep, all tiers); source: `is-light` gives black text + white gradient | `sectionInk: adapt` (dark half measured; light half source-only, residue named) |
| studionamma | header-shell | 375/768/1440 | ground | `mix-blend-mode: difference` on the strip, fill transparent, instant | `sectionInk: blend` |
| dogstudio | header-shell | 375 | ground | fill transparent → `#0d0e12` once scrolled at 375 only; ink `#fff` | ALREADY reachable: `headerTransparent {mobile:on}` + `backgroundColourScrolled #0d0e12` (other tiers resolve off, so they stay unfilled). No new attribute |
| fantasy (M-03) | header-shell | 375/768/1440 | mechanics | gradient opacity 0.5 at rest → 0 after scrolling down past 100px; back to 0.5 the moment the direction is up | `scrolledTrigger: direction`, `scrolledOffset 100`, `headerTransparentDirection: solid-first` |

## 4. Design

### 4.1 Attributes on `sgs/site-header` (names checked free in the framework DB)

| Attribute | Type / default | Meaning |
|---|---|---|
| `sectionInk` | tier object `{}`; values `off` \| `adapt` \| `blend`; unset = `off` | `adapt`: ink (and optional fill) follow the section behind. `blend`: `mix-blend-mode: difference` on the header's rows (studionamma), no JS |
| `inkOnLight` | colour string, `''` → `var(--wp--preset--color--text)` | Ink over a light section |
| `inkOnDark` | colour string, `''` → `var(--wp--preset--color--text-inverse)` | Ink over a dark section |
| `fillOnLight` / `fillOnDark` (+ `…Gradient` pair) | colour strings, `''` = fill unchanged | Header fill over each tone. At a tier where Transparent is on it applies in the scrolled state only (wearecollins); elsewhere it applies at rest |
| `inkDuration` | integer ms, default `400` | Colour and fill transition; `0` = instant. Reduced motion → instant |
| `inkEasing` / `inkEasingCustom` | shared list `sgs_motion_easing_values()`, default `ease` | Same vocabulary as U-5 |

Enums are mirrored in a PHP allow-list in the same commit. All render through a new helper
`includes/sgs-header-ink-css.php` (render.php is already 742 lines, over the 300 limit; it only gains one call).

### 4.2 Runtime (view.js)

- Only when the header carries `data-sgs-header-ink` (emitted when any tier resolves `adapt`). The ink check
  gets its own listener start: `initScrollBehaviours` returns early unless `data-sgs-header-scroll-behaviours`
  is `1`, which is emitted only for transparent, shrink or hide-on-scroll, so a header using section ink alone
  would otherwise never update (council, census finding 5/6).
- Each scroll tick (rAF-coalesced, skipped when `scrollY` moved under 4px), on resize and once on load:
  `document.elementsFromPoint(headerCentreX, headerMidY)`, skipping anything inside the header itself, a
  `dialog` (the drawer), `.wp-block-sgs-mega-panel` (a plain `div`, not a popover) and the detached burger chip.
  Walk the stack top-down; the first element that decides wins:
  1. carries `sgs-on-dark` / `sgs-on-light` → that tone (server-judged, includes gradients and overlays);
  2. is an `img`, `video`, `canvas` or `iframe`, or has a computed `background-image` and no tone class →
     unknown, stop (never look through a picture);
  3. has a computed `background-color` with alpha ≥ 0.5 → judge it in JS with the same white-wins rule as
     `sgs_wcag_white_wins_for_luminance()`. This covers `core/group`, WooCommerce markup, template parts, a
     plain card with no tone class inside a dark section, and the page body itself.
  Toggle `is-header-on-dark` / `is-header-on-light` on the header; no class when unknown (the header keeps
  its own ink: an image hero with no stated tone behaves exactly as today).
- The switch point is the header's vertical midpoint, where its ink sits. The references switch at the section
  boundary; the midpoint is within half a header height of theirs.
- The CSS (`.uid.sgs-site-header.is-header-on-dark{color:… !important}` etc.) is emitted only inside the
  `@media` blocks of the tiers where `adapt` is on, the same per-tier gating every other header behaviour
  uses, so the script toggles unconditionally.
- **Ink adapts only where the header is see-through** (council, adversarial finding 1): an opaque header's
  ink must read against its own fill, not the section. Per tier, the server emits the ink rule when the
  header has no fill of its own, or where Transparent is on (then only in the see-through state:
  `:not(.is-header-scrolled)` for transparent-first, `.is-header-scrolled` for solid-first), or wherever a
  tone fill is set (the fill follows the section, so the ink pairs with it in every state). Elsewhere
  nothing is emitted and the editor says why.
- `textColour` / `textColourScrolled` are written without `!important` (style engine), so the ink rule's
  `!important` wins without a specificity race. The tone fill uses three classes
  (`.uid.is-header-on-dark.is-header-scrolled`), beating the two-class `!important` scrolled background.
- The `transition` is appended to the shared shorthand list on the header root, the same way
  `shadowScrolled`'s `$sh_shadow_tx_append` does, so Shrink and Hide-on-scroll do not overwrite it.
- Logo: the header only publishes its state (`is-header-on-dark` / `is-header-on-light`); it never styles the
  logo. The logo owns its response (§4.5).
- Named exception: the menu item badge (`.sgs-nav-bar-menu__badge`, "NEW"/"SOON") keeps its own accent chip
  colours; it is a filled chip, legible on any ground.

### 4.3 Image sections (Bean, 2026-09-26: auto-measure plus override)

A photo hero has no tone class today, because `sgs_surface_tone()` never samples an image.
- **Measured at upload.** A `wp_generate_attachment_metadata` filter measures the mean relative luminance of
  the image's top 20% (where a header sits) on a small downscaled copy (GD or Imagick, whichever the editor
  class provides) and stores `_sgs_top_tone` (`dark` / `light`) as attachment meta; `wp sgs media measure-tone`
  backfills existing images. `sgs_surface_tone()`'s image layer reads that meta instead of returning `''`, so
  the section gets `sgs-on-*` automatically, and the shadow-tone logic benefits too. An image with no meta
  (a failed read, an external URL) stays unknown, as today.
- **Override.** A section-level **"Surface tone: Automatic / Light / Dark"** (`surfaceTone`, default `auto`) on
  the shared wrapper writes the class directly, for a picture whose top strip misleads (a light sky over a
  dark subject).

The JS fallback in §4.2 step 3 already handles every plain-coloured area, so the gap is only pictures.

### 4.4 Editor

Two separate panels in the header inspector (they are independent features):
- **"Colour over sections"**: the per-tier `sectionInk` toggle group under the global device toggle; two
  `SgsColourPanel` rows (ink on light, ink on dark) and two fill rows, each with `linked` wired; duration and
  easing. Advisory notices (never gates): each ink below 4.5:1 against the palette's lightest or darkest
  colour; "While the header follows a section, its menu links take this colour"; and, at a tier where the header
  is opaque with no tone fill, "The header has its own fill here, so its colour stays as set".
- **"Scroll change"** (M-03): `scrolledTrigger` and `scrolledOffset`.
- On `sgs/container`-family blocks: the "Surface tone" control, with an advisory when a background image has
  no overlay and the tone is Automatic ("A header over this picture cannot tell whether it is light or dark").
- The transition midpoint is not a contrast state (WCAG judges the settled colour; reduced motion makes it
  instant), so no gate is added for it (council finding 2, declined).

### 4.5 The logo responds to its ground (`sgs/responsive-logo`, Bean 2026-09-26)

The logo block owns this, for every placement, not only the header:
- `darkLogoId` keeps its name (no rename blast radius); its panel becomes **"Logo for dark backgrounds"**: shown
  in site dark mode AND wherever the logo sits on a dark ground (inside `.sgs-on-dark`, or a header carrying
  `is-header-on-dark`); inside `.sgs-on-light` or `is-header-on-light` the normal logo shows, even in dark mode.
  The live header state outranks a static section class; a nearer light ground inside a dark one outranks it.
- `colourTreatment` gains `auto`: white only on a dark ground (same signals), as uploaded on light. A client
  with one full-colour logo needs no second file.
- All rules live in `responsive-logo/style.scss`; `render.php` and the enum's PHP allow-list change only for
  `auto`. Inline SVG logos already follow `currentColor`.

### 4.6 M-03 (built last)

- `scrolledTrigger`: `position` (today) \| `direction`. With `direction`, view.js adds `is-header-scrolled` only
  while past the offset AND the last movement was down, and removes it on an upward movement of 8px or
  more (a deadzone, so iOS rubber-banding and flick reversals do not flash it; council finding 4).
- `scrolledOffset`: integer px, default `50` (today's hard-coded threshold, now settable; fantasy uses 100).
- The fade: `background-image` cannot interpolate, so a gradient-to-transparent swap is instant today. At
  build, the header fill moves to a free pseudo-element (`::before` is the contrast scrim) and fades by
  opacity. If that proves invasive, the instant swap is recorded as a timing divergence instead.

## 5. Risks

1. `elementsFromPoint` ignores `pointer-events: none` elements. Sections never set it; the pass-through header
   does, which is what we want (it is skipped). Covered by a live check with `headerPassThrough` on.
2. The `!important` fill must beat the merge's `!important` background: it uses a higher-specificity
   selector (`#uid.is-header-on-dark.is-header-scrolled`). Proved live with a negative control.
3. A split section (light and dark columns side by side) resolves to whichever sits under the header centre.
   Accepted; no reference does this.

## 6. Verification

Fixture on `/qa-scrim/` via `qa-item-markup-fixture.php` (new case `section-ink`): a transparent sticky header
over light, dark and image-with-override sections. At 375/768/1440: read the header's computed `color` and a
pixel sample over each section; negative control, the colour must differ between the light and dark sections,
and with `sectionInk: off` it must not. `palette-contrast-sweep.mjs` proves 4.5:1 on every section. Reduced
motion: the transition is 0s with the emulation and 400ms without. Applied, measured and restored in one
trapped command, ending on `two-bar`.

## 7. Council (2026-09-26)

Code-path census (Sonnet) and adversarial reader (Haiku): both GO WITH FIXES. Applied: the ink's own listener
start; the real exclusion selectors (mega panel is a `div`); the JS background-colour fallback (covers
`core/group`, WooCommerce, template parts, untoned cards and the body); ink only where the header is
see-through; logo rule versus site dark mode; the badge exception; the 8px direction deadzone; two separate
editor panels plus the image advisory. Declined: a contrast gate on the transition midpoint (reason in §4.4).
Baseline (live, 2026-09-26): sandybrown's homepage carries 18 toned sections (2 dark, 16 light) and
`/qa-scrim/` 8; no header emits `data-sgs-header-ink`.

## 8. Residue named up front

fantasy's light half is source-only (never observed live); lusion's black and blue states and their section
colours are WebGL-painted and JSON-only. Both close as covered-by-mechanism with the measured half proved.
