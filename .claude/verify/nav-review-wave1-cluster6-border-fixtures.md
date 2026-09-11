# Nav-menu visual review — Wave 1, Cluster 6 — Group H (border double-line clash) + Group G (missing fixtures)

**Diagnostic only. No fixes proposed or implemented.**

**Scope:** Group H (H1) and Group G (G1–G6) from
`.claude/reports/2026-09-12-nav-menu-visual-review-register.md`.

**Fixtures built this session** (the original G18 fixture on page 3488 no longer exists —
page content has changed since the register was written; confirmed live, zero elements with
`border-*-style: dashed` found on pages 3487/3488/3494):

- Page 3500 "Spec41-Wave1-Group-G-Fixtures" — G1–G4 + H1, `sgs/nav-menu` + `sgs/nav-drawer` as
  **sibling** top-level blocks linked only by a matching `drawerRef` string.
- Page 3507 "Spec41-G5-Fixed-Nested" — G5, `sgs/nav-menu` correctly **nested as an InnerBlock**
  inside `sgs/nav-drawer` (see the G5 finding below for why this distinction matters).

---

## H1 — border-style dashed + sweep hover treatment: CONFIRMED real defect, not a stacking accident

**Root cause: under `itemBorderHoverTreatment:'sweep'`, `itemBorderStyle` has NO visual effect
on the swept edge at all — the operator's dashed/dotted choice is silently discarded and the
edge always renders as a plain solid line, both at rest and mid-hover.**

Mechanism, traced through `plugins/sgs-blocks/includes/nav-menu-css.php::sgs_nav_menu_item_state_css()`:

1. **Border shape** (lines 350–358): `itemBorderStyle` is emitted completely unconditionally,
   with no awareness of the resolved hover treatment — `{$link_sel}{border-style:dashed;}`
   applies to all four sides including bottom.
2. **Border colour** (line 386 → `helpers-colour-variants.php::sgs_border_states_css()` line
   462): the RESTING colour is emitted unconditionally as a shorthand —
   `{$link_sel}{border-color:#000000;}` (all four sides).
3. **Sweep suppression** (lines 388–434): when `$t_border === 'sweep'`, a THIRD rule is emitted
   *after* both of the above — `{$link_sel}{position:relative;border-bottom-color:transparent;}`
   (line 418). Same selector, same specificity, later in source order — this wins the cascade
   for `border-bottom-color` specifically, so the REAL CSS border on that edge is invisible at
   rest. This part of the mechanism works as intended; there is no double `border` line.
4. **The actual visible line comes from the `::after` sweep band** (lines 426–430), a
   `background-image: linear-gradient(to right, {hover} 50%, {normal} 50%)` on a 200%-wide,
   100%-position background. At **rest** the visible half of that gradient is the `{normal}`
   colour (`itemBorderColour`, black in the fixture) — a **hard-edged, always-SOLID** band.
   `background-image` gradients cannot render `border-style: dashed`; there is no code path
   that makes this band respect `itemBorderStyle` at all.

**Live verification** (page 3500, H1 fixture: `itemBorderStyle:"dashed"`,
`itemBorderWidth.bottom:"2px"`, `itemBorderColour:"#000000"`,
`itemBorderColourHover:"#e91e8c"`, `itemBorderHoverTreatment:"sweep"`), computed via
`getComputedStyle()` on the live `.sgs-nav-menu__link`:

```
borderBottomColor: rgba(0, 0, 0, 0)   ← real CSS border, correctly suppressed to transparent
borderBottomWidth: 2px
::after backgroundImage: linear-gradient(to right, rgb(233, 30, 140) 50%, rgb(0, 0, 0) 50%)
::after bottom: 0px   (band positioned to occupy the vacated 2px strip)
```

This confirms the mechanism exactly as read from source: at rest the visible bottom edge is a
**solid black band** (the sweep's own resting colour), not a dashed line — `itemBorderStyle`
is a no-op on this edge under `sweep`.

**Answering Bean's direct question** ("was this combination intended, or should the two
mechanisms be mutually exclusive?"): the two mechanisms are not literally two overlapping DOM
lines fighting (the real `border-bottom` is correctly hidden) — but they ARE **incompatible in
effect**: setting a border-style of dashed/dotted together with `sweep` produces output that
contradicts the operator's own explicit choice. Two ways this reads as the "double line clash"
Bean saw:

- The rest-state solid band looks exactly like "the border rendering, but not dashed" — a
  visibly wrong result for a dashed setting, easily perceived as a stray extra line sitting
  where a dashed line was expected.
- Mid-transition (the `background-position` slide from `100% 0` → `0 0` over 300ms), the
  hard-stop gradient shows part-black/part-pink simultaneously for the animation's duration —
  visually two differently-coloured segments of the same line moving, which reads as "two
  lines" during the sweep even though it is one element.

Nothing in `sgs_nav_menu_item_state_css()` or the eligibility layer
(`plugins/sgs-blocks/includes/nav-menu-treatments.php::sgs_nav_menu_sweep_eligible()`) gates
`sweep` on `itemBorderStyle` — `itemBorderHoverTreatment` is not part of the declared
`sweepEligibility` rows at all (confirmed: `sweepEligibility` only covers the *text* sweep
attributes; the docblock at `nav-menu-treatments.php` lines 80–83 explicitly says the border
Sweep's eligibility is ungated by design, "its Sweep is a `::after` band, not a
`background-clip:text` glyph sweep"). So the combination is fully reachable by an operator
today with no warning, and the border-style control silently does nothing on the affected edge.

---

## G1 — `triggerMode: 'text'`, `triggerLabel: 'MENU'`

Built on page 3500. Live screenshot confirms: burger fully replaced by the literal text
"MENU", no icon glyph present at all. Matches
`plugins/sgs-blocks/includes/nav-menu-markup.php::sgs_nav_menu_burger_toggle_markup()` line
492–493 (`'text' !== $trigger_mode && '' !== $burger_icon'` — icon markup is skipped entirely
under `text` mode) and `render.php` line 626–634 (`$burger_icon = 'text' === $trigger_mode ? '' : …`).

**Renders correctly, no defect found.**

---

## G2 — `triggerMode: 'icon-and-text'` — icon placement

Built on page 3500. Live screenshot confirms Bean's exact complaint: the hamburger-lines icon
renders on the LEFT, "Menu" text on the RIGHT.

**Root cause, confirmed by source, not just observation:**
`nav-menu-markup.php::sgs_nav_menu_burger_toggle_markup()` line 512, the format string
`'…%6$s%7$s</button>'` interpolates `$icon_html` (`%6$s`) unconditionally BEFORE `$text_html`
(`%7$s`) — the icon is emitted first in DOM source order for every non-`icon`-only mode, with
**no CSS `order` or `flex-direction` override anywhere** in
`plugins/sgs-blocks/src/blocks/nav-menu/style.css` or
`plugins/sgs-blocks/includes/nav-menu-trigger-css.php` (grepped both files for
`order:`/`flex-direction`/`burger--icon-and-text` — zero matches). So the icon-left placement
is not a CSS quirk on top of a flexible markup order — it is the ONLY order the markup ever
produces; there is no code path that would place the icon on the right.

**This is a genuine, structural finding** (not just "untested"): the current implementation
has no mechanism to place the icon on the right at all, under any attribute combination.

---

## G3 — custom `triggerIcon` (non-default glyph)

Built on page 3500 with `triggerIcon: {source:'lucide', name:'grid-3x3'}`. Live screenshot
confirms: the burger renders a grid glyph, not the default hamburger-lines icon.

**Renders correctly, no defect found.** Confirms `sgs_nav_menu_icon_markup()`'s four-source
resolver is correctly wired for the trigger icon.

---

## G4 — burger→X "morph" open animation

**Confirmed via static code search: this mechanism does not exist anywhere in the codebase.**

Two independent checks, both negative:

1. **JS side** — `plugins/sgs-blocks/src/shared/nav-interactivity/store.js`: the only reactive
   binding tied to `isOpen` that reaches the burger element is
   `data-wp-bind--aria-expanded="state.isOpen"` (markup at
   `nav-menu-markup.php::sgs_nav_menu_burger_toggle_markup()` line 514). There is no
   `data-wp-class--is-open` or any other class/attribute toggle on the burger button itself —
   `getContext().isOpen` (store.js line 854–855) is read only for `aria-expanded`.
2. **CSS side** — grepped `nav-menu-trigger-css.php` and `nav-menu/style.css` for
   `aria-expanded`: the ONLY match in either file is
   `style.css` line 274, scoped to `[data-sgs-mega-trigger][aria-expanded="true"]` — the
   horizontal-bar mega/dropdown CHEVRON (Group M's territory), not the burger.

No CSS rule, no JS class toggle, nothing keyed on the burger's own open/closed state exists to
drive a shape change. **This answers Bean's "unclear if it exists at all" directly: it does
not exist.** The burger icon is visually static regardless of drawer state.

---

## G5 — custom `sublinkMarkerIcon` on a drawer submenu

**First attempt (page 3500, sibling composition) showed the custom icon NOT applying — but
this was a fixture-construction error, not a product bug.** Root cause traced and a corrected
fixture (page 3507) proves the feature works.

**What went wrong in the first fixture:** `sgs/nav-menu` and `sgs/nav-drawer` were placed as
two independent top-level blocks, linked only by a matching `drawerRef` string attribute. But
`plugins/sgs-blocks/src/blocks/nav-menu/render.php` lines 440–454 make clear that the
drawer-specific submenu-marker resolution depends on Gutenberg **block CONTEXT**
(`sgs/navDrawerSubmenuModel`), declared as `providesContext` on
`nav-drawer/block.json::providesContext` and `usesContext` on `nav-menu/block.json`. Block
context in Gutenberg propagates ONLY from an ancestor block to a nested InnerBlock descendant
in the same block tree — never between sibling blocks that merely share an attribute value.
Confirmed live: rendered HTML for the sibling-composition fixture contained only
`lucide-chevron-right` (the hardcoded default fallback at `render.php` line 452), never
`lucide-arrow-right`.

**Corrected fixture (page 3507):** `sgs/nav-menu` nested as an InnerBlock child of
`sgs/nav-drawer` — matching the real production pattern found in the site's own header
template (post 2671, `wp:sgs/nav-drawer` wrapping `wp:sgs/nav-menu` at lines 25–29). With this
correct composition, the rendered HTML contains
`<span class="sgs-nav-menu__sublink-marker" …><svg class="lucide lucide-arrow-right" …>` —
**the custom icon renders correctly.**

**Renders correctly with the correct block composition — FR-41-30(b) is not broken.**

**Related but separate observation worth flagging (diagnostic, not a fix):** `drawerRef` reads
as "the thing that links a menu to its drawer", and it IS what wires the open/close
interactivity (`aria-controls`) — but it plays NO role in the content/context relationship
(submenu markers, accordion model) that a builder would reasonably assume it also controls.
Two different linking mechanisms (string-matched `drawerRef` for interactivity vs. InnerBlock
nesting for content context) exist side by side with the same apparent purpose. A builder who
sets `drawerRef` on two sibling blocks (exactly what the first fixture did) gets a drawer that
opens/closes correctly but silently loses drawer-specific submenu behaviour, with no error or
console warning anywhere.

---

## G6 — mega-menu dropdown, bar form AND drawer form

**Bar form: renders and opens correctly. No defect found.**

Found an existing live example: page 1842 "Gate3 Mega Nav", menu term 100 ("SPIKE Mega Test"),
item "Brands" bound to `sgs/mega-panel`. Live screenshot at 1440px confirms: clicking the
`Brands` trigger opens a 3-column mega panel (Our Ranges / Buying From Us / Featured card),
chevron flips to point up, panel is positioned correctly under the parent item.

**Drawer form: could not be verified — blocked by a genuine, separate structural defect
(duplicate/unscoped `drawerRef` id), not merely "no example exists".**

Traced via live DOM + code:

1. Both `nav-drawer/block.json::attributes.drawerRef` and
   `nav-menu/block.json::attributes.drawerRef` default to the literal, **unscoped** string
   `"sgs-nav-drawer"` (confirmed in both block.json files), matched by
   `nav-drawer/render.php` lines 73–79 (`$drawer_ref = '' !== $drawer_ref_raw ? … : 'sgs-nav-drawer';`).
   Any nav-drawer instance that doesn't set an explicit, unique `drawerRef` renders
   `id="sgs-nav-drawer"` — the SAME literal id as every other such instance on the SAME PAGE
   *and, because it's a page-independent literal, effectively across every page site-wide*.
2. Live confirmed on the homepage: the real global header's own nav-drawer renders
   `id="sgs-nav-drawer"` with class `sgs-nav-drawer-4d633166`.
3. Live confirmed on page 1842 (Gate3 Mega Nav, mobile viewport): the burger's own
   `aria-controls="sgs-nav-drawer"` attribute points at the SAME unscoped id. Clicking it opens
   a panel showing "Shop / Our Story / Send to Ward / Gift Ideas / FAQs" — the SITE'S REAL
   GLOBAL header menu content — not the Gate3 test menu's own items ("Home / Brands / Recipes /
   Contact / SelfLink") and containing no mega-panel trigger at all.
4. `document.querySelectorAll('.sgs-nav-drawer')` on page 1842 returned nodes carrying id
   `"sgs-nav-drawer"` and class `sgs-nav-drawer-4d633166` — the exact same uid as the real
   homepage header drawer — confirming this page's own "Brands" mega item has no drawer
   counterpart of its own; only the global header's drawer exists in scoped form on that page,
   and it is not the drawer this test's burger visually opens (or if it is the same node,
   there is no `sgs/mega-panel` bound anywhere inside it).

**Diagnostic conclusion:** the drawer-form mega-menu is not merely untested — it is currently
**unreachable to test** on any page whose nav-menu/nav-drawer pair doesn't set an explicit,
unique `drawerRef`, because the click resolves to whichever DOM node with the colliding id
comes first in the page's render order (in every case checked, that was the global header's
own drawer, which has no mega binding). No example exists anywhere on the canary of a mega
panel opening inside a drawer, and the current `drawerRef` default makes it structurally
unlikely one would work correctly without an explicit unique ref even if built.

---

## Tool-budget note

This dispatch used roughly 75 tool calls (code reads, live DOM verification via Playwright and
direct curl-from-server fetches, two purpose-built fixture pages). All 7 items (H1, G1–G6) have
a stated, evidenced conclusion — no items left mid-triage.
