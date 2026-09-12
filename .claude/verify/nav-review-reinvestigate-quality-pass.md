# Nav-menu QC — Quality Re-pass on 4 Unconfirmed Wave-1/Cluster-1 Items

**Method:** all four items verified with genuine Playwright pointer interaction (real
`browser_click`, real hover states confirmed via `element.matches(':hover')` where CSS
`:hover` is load-bearing) against a purpose-built, isolated fixture page — **page ID 3508**
(`/nav-reinvestigate-fixtures/`) — plus direct raw-content reads of real, currently-live
site content via WP-CLI. No style overrides, no attribute injection, no forced `display`.

---

## Task 1 — Is the Highlight sliding-pill wired to `itemBgHover`? CONFIRMED

Built two real fixtures on page 3508:
- **Task1-A** (`sgs-nav-menu-66eb94c1`): `itemBgHoverTreatment:"highlight", itemBgHover:"accent"`
- **Task1-B** (`sgs-nav-menu-227056b1`): `itemBgHoverTreatment:"highlight", itemBgHover:"primary"`

Dispatched genuine `mouseenter`/`mouseover` on each fixture's first nav item, then read
`getComputedStyle` on `.sgs-nav-menu__indicator`:

| Fixture | `itemBgHover` | Live indicator `background-color` | Theme token hex |
|---|---|---|---|
| Task1-A | `accent` | `rgb(245, 208, 80)` | `#f5d050` (accent) — **exact match** |
| Task1-B | `primary` | `rgb(230, 138, 149)` | `#e68a95` (primary) — **exact match** |

**CONFIRMED, mechanism:** `render.php::724-744` sets `$indicator_colour = $attributes['itemBgHover']`
(same PHP variable, not a coincidental match), and `nav-menu-submenu-css.php:912-913` paints
`.sgs-nav-menu__indicator{ background-color: <resolved itemBgHover> }` directly from it. Two
fixtures with different `itemBgHover` values produced two different, exactly-matching live
indicator colours. The sliding pill is a direct pass-through of the operator's chosen
`itemBgHover` token, not a static/hardcoded colour and not a coincidence. The earlier pass's
"unconfirmed sub-detail" doubt is resolved: CONFIRMED wired correctly.

---

## Task 2 — Is there a real stored "tinted pink" submenu background anywhere live? Checked every real content source — NONE found

Read raw stored block-comment content directly via `wp post get <id> --field=content` (not
rendered output) on every real, currently-live piece of content that touches `sgs/nav-menu`:

| Source | Stored `sgs/nav-menu` attrs (raw) | `submenuLinkBg`/`submenuColour`/`submenuBg` present? |
|---|---|---|
| Live header template part, post **2671** | `{"gap":"28px","itemColour":"text"}` (desktop bar instance) | **No** — only `gap` and `itemColour` set |
| Live header's own nav-drawer, post **2671** (same content) | `<!-- wp:sgs/nav-menu /-->` (bare, zero attrs) | **No** |
| `sgs_drawer` CPT **2059** ("the" default drawer instance) | `<!-- wp:sgs/nav-menu /-->` (bare) | **No** |
| `sgs_drawer` CPT **2056** | `{"ref":0}` only | **No** |
| Pattern source `framework-drawer-default.php` (the CPT's own seed) | `{"ref":0}` only | **No** |
| `wp_navigation` post **1467** ("Primary Menu", the menu structure itself) | N/A — this post holds only `navigation-link`/`navigation-submenu` items, not `sgs/nav-menu` block attrs (colour lives on the block, not the menu-structure post) | N/A |

**Conclusion: genuinely blank/default everywhere I could check.** Every real, live
`sgs/nav-menu` instance on the canary — the desktop bar, the drawer's inner instance across
two separate CPT rows, and the pattern that seeds new ones — carries zero colour attributes
of any kind related to submenu background. This directly corroborates the earlier pass's
"most likely explanation" (D1 in the prior doc): what Bean saw is very likely the pink
**text** (the deliberate `nav-menu-submenu-css.php` ~line 452 default, `submenuColour`
unset → falls through to `var(--wp--preset--color--primary)`) being misread as a background
tint, not an actual stored `background-color`. I did not find any surviving pre-Spec-41
instance carrying a real pink background value — the two candidate storage locations (the
live header and both drawer CPT rows) are both clean.

---

## Task 3 — Drawer marker hover, through the real drawer UI (burger → accordion → hover): CONFIRMED

Fixture on page 3508 (**Task3 Trigger** `sgs-nav-menu-ffdf9ffa` paired via `drawerRef`/`id`
`task3-drawer` with a **Task3 nav-drawer** instance, `submenuModel:"accordion"`, inner
`sgs/nav-menu` with `ref:112` (a menu with children) and `sublinkMarkerColourHover:"error"`).

Real interaction path, each step verified live before proceeding to the next:

1. **Real click** on `.sgs-nav-menu-ffdf9ffa .sgs-nav-menu__burger` ("Open menu" button) →
   confirmed `document.getElementById('task3-drawer').open === true` (native `<dialog
   showModal>`, genuinely open, not forced).
2. **Real click** on `#task3-drawer summary.sgs-nav-menu__accordion-summary` (the native
   `<details>`/`<summary>` accordion toggle — no JS state machine needed for this model,
   confirmed correct by reading `nav-menu-markup.php::sgs_nav_menu_render_items_drawer` lines
   397-427, which renders a plain `<details>`) → confirmed `details.open === true` and the
   marker element genuinely laid out (`offsetWidth/Height > 0`), resting colour `rgb(0,0,0)`
   (inherited `currentColor`, matching the archived D2 finding).
3. **Real hover**, achieved via a genuine Playwright `browser_click` on the sublink itself
   (with a one-time `click` listener added first to `preventDefault()` so the real mouse
   move/press/release the click performs doesn't navigate away) → confirmed
   `link.matches(':hover') === true` (genuine browser-internal hover state, not a synthetic
   flag) → marker colour read as **`rgb(220, 38, 38)`**, exact match to the `error` token
   hex `#DC2626`.

**CONFIRMED, mechanism:** `render.php::506-513` — `sgs_hover_state_rules($sgs_nm_sublink_sel,
'color:' . sgs_colour_value($sgs_nm_marker_colour_hover), ':focus-visible', '
.sgs-nav-menu__sublink-marker')` emits a real `.sgs-nav-drawer … .sgs-nav-menu__sublink:hover
.sgs-nav-menu__sublink-marker{color:#DC2626}` rule (scoped selector chain:
`.sgs-nav-drawer .{uid} .sgs-nav-menu__sublink:hover .sgs-nav-menu__sublink-marker`), and it
fired under a real, JS-driven, fully-expanded accordion state exactly as designed.

---

## Task 4 — Submenu panel "white lip": genuinely opened via real click; NOT reproduced under either configuration tested

**Interaction confirmed real** on two separate live dropdowns (aria-expanded flipped to
`"true"` by the real click, non-zero `getBoundingClientRect()` in both cases):

1. **Task4 fixture** (`sgs-nav-menu-82f4fc3e`, `submenuBg:"error", submenuLinkBg:"error"` —
   both panel and row forced to the same strongly-visible red) — real click on
   `.sgs-nav-menu__subtoggle` ("Show submenu for Services") opened a 200×150px panel.
2. **The real, currently-live, completely default header dropdown** ("Our Story", zero
   colour attrs set) — real click opened a 200×106px panel, cream fill `rgb(255, 249, 240)`.

For both, I read `getComputedStyle` on the wrap, the panel, and both elements'
`::before`/`::after`, and screenshotted the open panel at device-pixel scale:

- `.sgs-nav-menu__submenu-wrap` (outer): **no background at all** (`rgba(0,0,0,0)`) — only
  `border-radius` + `box-shadow`, and (newly found this pass) `overflow-y:auto` +
  `max-height` (`nav-menu-submenu-css.php:238`) — a scroll container with **no
  scroll-mask/fade-gradient at all** when content overflows (there is none to trigger in
  either fixture; content fit, `scrollHeight === clientHeight` on both).
- `.sgs-nav-menu__submenu` (the actual painted `<ul>`): a **single uniform 1px solid border**
  on **all four sides** (`border-top-color === border-bottom-color === rgb(232, 213, 192)`
  in both fixtures — confirmed identical, not top/bottom-specific), `background-clip:
  border-box` (fill extends under the border), no pseudo-elements with content, no
  `mask-image`, no `box-shadow` on the panel itself (only on the wrap).
- Screenshots of both open panels (`task4-dropdown-panel.png` red fixture,
  `task4-default-panel.png` default cream fixture) show **no visible white/mismatched band**
  at either the top or bottom edge in either case — the border is present but uniform and,
  at 1px against either background, reads as a subtle full-perimeter outline, not a
  top/bottom-specific "lip".

**Not confirmed — honest account:** I got the dropdown genuinely open on two independent
real configurations (a forced-high-contrast one designed to make any lip obvious, and the
real live default one) and found no structural mechanism capable of producing a top/bottom-only
band: no second background layer, no pseudo-element, no mask, no inset shadow, and the one
border rule that exists (`nav-menu-submenu-css.php` ~lines 352-384) is demonstrably uniform
on every side, not top/bottom-only, so it cannot be the cause of an edge-specific artefact by
construction. I could not reproduce Bean's reported symptom under either tested
configuration. Two possibilities I could not rule out within this pass's scope: (a) the
artefact is specific to a browser/zoom/subpixel-rounding combination other than Chromium at
1x (I did not have budget to cross-test Firefox/Safari or non-integer zoom), or (b) it was
observed on a since-changed instance and no longer reproduces. I am not closing this as
"not a bug" — only as "not reproduced by two genuine real-interaction attempts, with the one
candidate mechanism (the border rule) ruled out by construction because it is provably
uniform on all sides."

---

## Fixtures created (for cleanup)

- **Page 3508** — `/nav-reinvestigate-fixtures/` ("NAV QC Reinvestigate Fixtures"), holding
  all 4 tasks' fixture blocks (Task1-A, Task1-B, Task4, Task3 trigger + drawer pair). Safe to
  delete once this report is reviewed.
- Two screenshot files written to the repo root during this pass (not fixtures, but worth
  noting for cleanup): `task4-dropdown-panel.png`, `task4-default-panel.png`.
- No other pages/posts were created or modified. Existing content (page 3497, the shared
  Wave-1/Cluster-1 fixture page) was not touched this pass.
