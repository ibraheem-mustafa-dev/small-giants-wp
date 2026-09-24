---
doc_type: spec
spec_id: 41
spec_version: 0.5.0
status: active
owner: framework
last_verified: 2026-09-19
companions:
  - 36-SGS-NAVIGATION-SYSTEM.md (the governing nav spec — FR-36-4's "distinct hover+focus states" and FR-36-11's WCAG floor; FR-36-28 is the pointer back. Only the visual half of active-trail is satisfied here — see FR-41-20)
  - 35-BLOCK-INSPECTOR-UX-STANDARD.md (PART O control-type contract)
  - 35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md (Part L control completeness)
  - 32-COMPONENT-STYLING-TOKEN-CONTRACT.md (no inline `style=` property declarations; scoped `<style>` only)
---

⛔ **FR IDs and section numbers are stable citations.** Every `FR-41-N` ID and `§` number in this
document is cited elsewhere (converter, DB, other specs); none is ever renumbered. New requirements
take the next free number. Gaps in either sequence are intentional.

# Spec 41 — `sgs/nav-bar-menu` + `sgs/nav-drawer-menu` Colour, State + Control System

## Why this is its own numbered spec

`.claude/specs/README.md` is THE roster: one spec per file, each carrying `doc_type: spec`, a
numeric `spec_id`, and a `status` from its enum. Requirement IDs are `FR-{spec_id}-{N}`.

Spec 36 is 1,600 lines and carries a measured prohibition on renumbering (**1,530 `FR-36-*`
citations across 164 files**, Spec 36 §1b). Folding a full control-surface design into it would
push the single canonical nav doc past readability for a cleanly separable concern. **Spec 36
keeps the requirement; Spec 41 owns the mechanism.** Same split as the settled Spec 32 ↔ Spec 35
pairing recorded in `README.md`.

**Why 41 and not 39.** The number 39 is left unused: `decisions.md` carries many live references
to "Spec 39" meaning a different, cloning-pipeline concept, so reusing the number would make every
one of them ambiguous. 41 sits after the current ceiling (40), which is where a new spec belongs.

---

## 0. One-liner + plain English

`sgs/nav-bar-menu` and `sgs/nav-drawer-menu` carry a complete, client-editable control surface: **three colour states — Normal,
Hover, Current — on every colour that has states**, all of them side by side in ONE Colour panel
(border colour included), each Hover swatch paired with a **hover-treatment selector** that changes
*how* that one colour is applied rather than adding a second colour; a **3-state per-side item
border**; a **submenu split** (the floating panel and the links inside it are separately
controllable, in colour *and* in typography); **submenu open animation + top offset**; a **menu
button** that can be an icon, text, or both, with an operator-chosen icon and an optional magnetic
pull; and three correctness fixes that need no control at all. There is no hover "style" chooser —
every hover look is a direct control.

⛔ **THE COLOUR-REUSE RULE, stated once and binding on every row (owner-locked).**
**One colour picker per element property.** The hover-treatment selector NEVER introduces a second
colour value — it changes HOW the existing Hover swatch's value is applied. `Swap` applies it
instantly; `Sweep` travels it across the element; `Highlight` paints it into the shared sliding
pill. All three read the SAME swatch. A treatment that needed its own colour attribute would be a
second control for one property, which is the exact pattern FR-41-7 and FR-41-23 exist to prevent.

**Plain English.** A client can colour a nav link, colour it again for when the mouse is over it,
and colour *the page they are currently on*. They set the hover colours they want directly rather
than picking a hover "style" from a dropdown. They control the line between menu items, give
dropdown links their own type size, choose how the dropdown appears and how far below the bar it
sits, and turn the burger into a word instead of an icon. If they hover over an item's dropdown,
the parent item stays in its hover look while its own dropdown is open. All of it needs **no
change to any control on any other block in the framework**, because it needs no new shared
component.

---

## 0a. Build status

Requirement-level status is BUILT unless named below. **Do not cache a step count, a percentage
or a decision number here — those drift.** Live status is single-sourced to `.claude/LEDGER.md`.

### 0a.1 The block's CSS is emitted by a set of PHP files, not by `render.php` alone

Verify the roster live — `git ls-files plugins/sgs-blocks/includes | grep nav-menu` — never from a
list cached in prose. Both blocks `require_once` the same shared `includes/nav-menu-*.php` files
from their own `render.php`.

| File | Owns (cite by `path::symbol`) |
|---|---|
| `plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php` | entry + `SGS_Nav_Menu_Bar_Renderer` (constructor, `flatten()`, `from_link()`, `from_page_list()`), the treatment-resolution call, the indicator/magnet `data-` flags, `<style>` assembly, `sgs_nav_shared_typography_hover_rule()` (FR-41-21's block-private emitter — declared identically in this file AND `nav-drawer-menu/render.php`, called from `nav-menu-css.php` and `nav-menu-submenu-link-css.php`) |
| `plugins/sgs-blocks/src/blocks/nav-drawer-menu/render.php` | entry + `SGS_Nav_Drawer_Menu_Flattener` (the drawer's own independent copy of the flatten methods), the same typography helper, `<style>` assembly |
| `plugins/sgs-blocks/includes/class-sgs-nav-menu-source.php` | `SGS_Nav_Menu_Source` — resolves the site's menu (one source for both blocks) |
| `plugins/sgs-blocks/includes/nav-menu-markup.php` | `sgs_nav_bar_menu_render_items()`, `sgs_nav_drawer_menu_render_items()`, `sgs_nav_bar_menu_burger_toggle_markup()`, `sgs_nav_shared_badge_html()` |
| `plugins/sgs-blocks/includes/nav-menu-css.php` | `sgs_nav_shared_item_state_css()` — item typography, nav-container colour, the item text / background three-state emission with its paired treatments, the FR-41-13 hover-persistence rules |
| `plugins/sgs-blocks/includes/nav-menu-item-border-featured-css.php` | `sgs_nav_shared_item_border_css()` — the item border's three states, the directional border-sweep band, and the independent between-item separator (FR-41-37); `sgs_nav_shared_featured_css()` — the featured item |
| `plugins/sgs-blocks/includes/nav-menu-treatments.php` | `sgs_nav_shared_sweep_eligible()`, `sgs_nav_shared_resolved_treatments()` (the treatment resolution), `sgs_nav_shared_text_sweep_css()` (the shared glyph-sweep emitter), `sgs_nav_shared_icon_markup()` (IconPicker-object → SVG resolution) |
| `plugins/sgs-blocks/includes/nav-menu-trigger-css.php` | `sgs_nav_bar_menu_trigger_css()` — the Menu Button's icon/text colour + glyph sweep, its resting and hover background, and the size rule that stops being a fixed square once the button carries a word (bar-only — the trigger/burger has no drawer counterpart) |
| `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` | `sgs_nav_shared_submenu_css()` — collapse-point switch, dropdown/mega positioning + the FR-41-11 bridge, the submenu LINK's base typography/text-colour states, custom CSS |
| `plugins/sgs-blocks/includes/nav-menu-submenu-link-css.php` | `sgs_nav_shared_submenu_link_css()` — the submenu link's hoverable background/border/typography-hover, the drawer's overrides, `listColumns` in-drawer grid, the sliding indicator, the root box |
| `plugins/sgs-blocks/includes/sweep-css.php` | `sgs_directional_sweep_css()` — the angle-driven sweep primitive every Sweep rule uses (FR-41-38) |

⛔ **The `plugins/sgs-blocks/includes/nav-menu-*.php` files are `require_once`'d PER-INSTANCE from
`render.php`, not bootstrap-loaded** (the `sgs/product-card`
`plugins/sgs-blocks/includes/product-card-builtin-render.php` precedent). A future cross-block
caller must require the file itself; its functions are in scope only after one of these blocks has
rendered once on that page load.

⚠ **The inspector is split the same way.** Panels shared by both blocks live in
`plugins/sgs-blocks/src/shared/nav-menu-panels/` (`ItemsPanel.js`, `SubmenuItemsPanel.js`,
`TypographyPanel.js`, `DropdownStylePanel.js`, `ColourRowExtras.js`, `ColourTreatment.js`,
`EffectsPanel.js`, `FeaturedPanel.js`, `ListLayoutPanel.js`, `MegaDrawerPanel.js` …); bar-only
panels sit in `plugins/sgs-blocks/src/blocks/nav-bar-menu/` (`BurgerPanel.js`,
`ItemSeparatorPanel.js`, `BarColourRowExtras.js` …).
⛔ **`colourRows` deliberately STAYS in each block's `edit.js`** — `plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js`
resolves a row's state count only from a shape it can see in that file or in `plugins/sgs-blocks/src/components/`.

### 0a.2 BUILT

Every requirement in this spec except those in §0a.3. Pointers a reader may want:

- FR-41-8's additive `suppress_edges` is live at
  `plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_border_states_css`.
- `itemSmartContrast` is declared in both blocks and mounted in each block's own General-tab
  **Accessibility** panel
  (`plugins/sgs-blocks/src/blocks/nav-bar-menu/DropdownSettingsPanel.js`,
  `plugins/sgs-blocks/src/blocks/nav-drawer-menu/DropdownSettingsPanel.js`) — FR-41-5 / FR-41-27.
- FR-41-12 is built on BOTH sides — the Menu Button and the `sgs/nav-drawer` close mirror.
- FR-41-26's declarative source is
  `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::supports.sgs.sweepEligibility` and
  `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json::supports.sgs.sweepEligibility`, with
  their mechanical readers.
- FR-41-13 (the parent-stays-hovered fix) is four rules — mouse and keyboard halves, bar and drawer — in
  `plugins/sgs-blocks/includes/nav-menu-css.php::sgs_nav_shared_item_state_css`.
- FR-41-15's no-ungated-paint rule holds and FR-41-35's detector runs in hard-fail mode:
  `HARD_FAIL_BLOCKS` in `plugins/sgs-blocks/scripts/check-ungated-paint-rules.py` lists
  `["sgs/nav-bar-menu", "sgs/nav-drawer-menu"]` (proof:
  `git grep -n "HARD_FAIL_BLOCKS: list" -- plugins/sgs-blocks/scripts/check-ungated-paint-rules.py`).
- The **sublink marker colour row** (FR-41-30(b)) is built end to end and is DRAWER-only:
  `sublinkMarkerColour`, `sublinkMarkerColourHover`, `sublinkMarkerColourCurrent` and their
  `*Gradient` counterparts are declared in `block.json`, wired to `css:fill` / `css:fill-gradient`
  under the `sublinkMarkerIcon`-keyed conditional block, mapped in the colour-row config and read in
  `render.php` — proof:
  `git grep -n "sublinkMarkerColourHover\|sublinkMarkerColourCurrent" -- plugins/sgs-blocks/src/blocks/nav-drawer-menu/`
  returns hits in all three layers.

### 0a.3 NOT BUILT or PARTIAL — each with the command that proves it

| Status | Requirement | Proof |
|---|---|---|
| NOT BUILT | **FR-41-18** — auto-adjust for readability (explicitly non-blocking follow-up) | `git grep -n -i "auto-adjust\|autoAdjust" -- plugins/sgs-blocks/src/blocks/nav-bar-menu plugins/sgs-blocks/src/blocks/nav-drawer-menu` returns nothing |
| PARTIAL | **FR-41-20** — active-trail. The visual ancestor Current styling is built in CSS; the ARIA/semantic trail is not built (out of scope by design) | `git grep -n "data-sgs-nav-has-current" -- plugins/sgs-blocks/includes plugins/sgs-blocks/src` shows the CSS ancestor rule and its bar fallback; `git grep -n "aria-current" -- plugins/sgs-blocks/src/blocks/nav-bar-menu/view.js` shows only the exact-match stamp |
| PARTIAL | **FR-41-36** — the default colour scheme. The item-border, submenu-row, drawer-panel and Current-weight defaults are declared; the item Hover/Current background defaults are unset, and the item Hover text default-closes in PHP | `git grep -n -A2 -E '^\s+"(itemBorderColour\|submenuLinkBg\|submenuLinkBgHover\|itemFontWeightCurrent)": \{' -- plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json` returns the declared defaults FR-41-36's table lists |

---

## 1. Scope

### 1.1 In scope

The `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` inspectors, their `block.json` manifests, their rendered CSS, **three** additive
backwards-compatible shared-component/helper extensions — `SgsColourPanel` row sub-headings
(FR-41-16), `SgsBorderControl`'s `showColour` prop (FR-41-33), and an optional third state on
`sgs_emit_state_colour_css()` / `sgs_fill_decls()` / `sgs_text_decls()` (FR-41-3) — plus one CSS
rule and one trio of `data-` attributes reusing the framework's existing `fx-magnet` runtime, and a
**two-line, value-preserving addition to `plugins/sgs-blocks/assets/css/fx-magnet.css`** exposing
its own transition as `--sgs-magnet-transition` so the nav blocks read it rather than retyping it
(FR-41-31). One cross-block companion requirement lands on `sgs/nav-drawer` and is named as such
(FR-41-12).

⚠ **All THREE shared-component extensions AND the shared-stylesheet addition are design-gated
(project rule 7)** and each is the minimum shape that does the job: every existing caller renders
byte-identically by default (§11 G1).

### 1.2 Out of scope — named explicitly so nobody re-opens them

| Not in scope | Why |
|---|---|
| The **featured item-flag** mechanism (`featuredColour` / `featuredBg` / `featuredColourHover` / `featuredBgHover` and their gradient siblings) | A separate, working, per-item flag with its own WCAG-contrast resolution (Spec 36 FR-36-4). Nothing here changes it. The featured link's `::after` is not suppressed, so the item-border Sweep band (FR-41-8) renders on featured items too. |
| **Mega menu** | Owned by the separate mega-menu builder. Its panel, its colours, its controls are untouched. |
| **Sticky / scrolled** colour states | Astra Pro duplicates its whole colour set for the scrolled header. Owner-rejected for SGS: it doubles the control count for a state the header (Spec 37) already owns via its own `scrolled` state. |
| A **device-visibility** panel | The universal `blocks/extensions/responsive-visibility.js` and `conditional-visibility.js` extensions already attach to every `sgs/*` block, and neither `sgs/nav-bar-menu` nor `sgs/nav-drawer-menu` opts out — verified in `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::supports.sgs.hideExtensions` and `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json::supports.sgs.hideExtensions`, both of which list only `clickEffects`, `parallax`, `spacing`. Do not build a second visibility surface. |
| A **fourth colour state** | Exactly three, everywhere: Normal, Hover, Current. |
| **ARIA active-trail** (marking a parent as current for assistive technology because a *descendant* page is current) | Not built, and this spec does not build it. The visual ancestor Current styling is built — see FR-41-20. |
| **A hover trio on the CURRENT state** (`itemTextDecorationCurrent` and any `…TransformCurrent` / `…WeightCurrent` beyond `itemFontWeightCurrent`) | Not offered. `TypographyControls` models resting + hover only, so a Current trio has no shared control at all, and Current already carries its own non-colour signal (`itemFontWeightCurrent`, FR-41-6). |
| **`itemBorderColourGradient`** (a gradient ring on the ITEM border) | Cut on a pseudo-element budget, not on merit — `sgs_border_states_css()`'s ring path needs `::before`, and `::before` on the item link (`.sgs-nav-bar-menu__link` / `.sgs-nav-drawer-menu__link`) already renders the item background. See FR-41-7. The submenu PANEL border keeps its gradient (`submenuBorderColourGradient`) because nothing competes for the submenu panel's own `::before` (`.sgs-nav-bar-menu__submenu::before` / `.sgs-nav-drawer-menu__submenu::before`). |
| **Cursor-reactive field** (and the other eight `motionSurface` effects) | Structurally eligible, deliberately not offered — the only current mechanism would bundle eight unrelated effects onto a functional navigation element. Revisit after the design gate at `.claude/archive/parking.md` `P-FX-PER-EFFECT-BLOCK-COMPATIBILITY` lands. See FR-41-32. |

### 1.3 The three states — definition and vocabulary

| State | Means | Selector | Set by |
|---|---|---|---|
| **Normal** | Resting | the base selector | — |
| **Hover** | Pointer over it, or keyboard-focused | `:hover` (touch-guarded) + `:focus-visible` (never guarded) | pointer / keyboard |
| **Current** | *This is the page you are on* | `[aria-current="page"]` | `markCurrentPage` — an independent copy in each of `plugins/sgs-blocks/src/blocks/nav-bar-menu/view.js` and `plugins/sgs-blocks/src/blocks/nav-drawer-menu/view.js` |

⛔ **The third state is named `current`. It is the framework's OWN existing vocabulary, not a new
word.** `plugins/sgs-blocks/scripts/consistency/golden-controls.json::_meta.stateVocabulary.real`
declares exactly three real states — `hover`, `current`, `scrolled` — and its `current` entry reads
`cssRealisation: '[aria-selected="true"], [aria-current], .is-active'`, unifying the tabs case and
the nav case in one state. Every attribute, every row-descriptor state key, every PHP variable,
every `css_state` value and every sentence in this spec uses `current` — never `Active`, never
`selected`.

⛔ **REUSE the existing `aria-current` mechanism — do not re-derive it.**
`plugins/sgs-blocks/src/blocks/nav-bar-menu/view.js::markCurrentPage` and
`plugins/sgs-blocks/src/blocks/nav-drawer-menu/view.js::markCurrentPage` are two independent
functions, each wired only to its own block's root, each normalising `window.location.pathname`
and stamping `aria-current="page"` on both the item link and the sublink within it (bar:
`.sgs-nav-bar-menu__link[data-sgs-nav-path]` / `.sgs-nav-bar-menu__sublink[data-sgs-nav-path]`;
drawer: `.sgs-nav-drawer-menu__link[data-sgs-nav-path]` / `.sgs-nav-drawer-menu__sublink[data-sgs-nav-path]`),
and each re-running on bfcache `pageshow`.
It is deliberately **client-side**, because Spec 36 FR-36-11 records that LiteSpeed — this stack's
confirmed cache layer — would otherwise serve one page's answer on every page.

### 1.4 Relationship to the colour-architecture research

`~/.claude/memory/research/2026-09-10-nav-drawer-colour-architecture-industry-standard.md`
recommends an MD3-style **derived state layer** (hover = content colour at 8% opacity over the real
background). **This spec does not adopt it.** This design
gives the operator three explicit, authorable colours per row plus the existing warn-only contrast
check (FR-41-17) — the shadcn-style "paired tokens authored together" shape. The research file's
other findings (the `<details>` roving-nav gap; the 1.4.11 hover-background exemption not rescuing
text-colour failures) remain live reading.

---

## 2. The shared-mechanism strategy

### FR-41-1 — Every stateful control in this spec targets the LINK. Nothing targets the `<li>`.

**This is the single load-bearing architectural decision, and it removes three separate hazards at
once.**

`markCurrentPage` (a separate function in each of
`plugins/sgs-blocks/src/blocks/nav-bar-menu/view.js` and
`plugins/sgs-blocks/src/blocks/nav-drawer-menu/view.js`) stamps `aria-current="page"` on the
item link and the sublink — **the anchors** — in each fork's own BEM root. It never stamps the
`<li>` item, and it never stamps a drawer ancestor. A Current-state rule keyed on the `<li>` therefore
matches nothing and renders silently as no change at all.

**The rule: text colour, background, border and the hover animation all apply to the link
element.** The link is the padded, full-height, focusable target in both the flat bar and the
drawer's vertical list, so a border on it spans the visible row exactly as an operator expects.

Three consequences, all good:

1. **`:has()` is needed nowhere for the Current state.** No `.item:has(> .link[aria-current])`
   construction, no specificity recompute per property.
2. **`:focus-visible` binds correctly by construction.** The link is focusable; a `<li>` is not.
   No `:focus-within`-on-the-item workaround is needed anywhere in this spec.
3. **Specificity is uniform across all three states**, which makes the source-order rule below a
   single rule rather than a per-property judgement — see FR-41-3.

The one thing this shape cannot express is a border spanning the `<li>`'s own margin box beyond the
link. That is not wanted: the link fills the row, and a rule painting outside it would leak past
the visible target.

**The DOM shape this rule operates on — read it before writing any selector.** There are two
separate blocks, each calling its own markup emitter (in the shared
`plugins/sgs-blocks/includes/nav-menu-markup.php`) from its own `render.php`. No single
descendant selector covers both:

| Block | Emitted by | Called from | Structure |
|---|---|---|---|
| **`sgs/nav-bar-menu`** (dropdown) | `plugins/sgs-blocks/includes/nav-menu-markup.php::sgs_nav_bar_menu_render_items` | `plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php` | `li.sgs-nav-bar-menu__item--has-submenu` › `div.sgs-nav-bar-menu__submenu-root` › **`.sgs-nav-bar-menu__link`** (an `<a>` with a sibling `button.sgs-nav-bar-menu__subtoggle`, or a `<button>` carrying both classes) + `div.sgs-nav-bar-menu__submenu-wrap` › `ul.sgs-nav-bar-menu__submenu` › `li.sgs-nav-bar-menu__subitem` › `a.sgs-nav-bar-menu__sublink` |
| **`sgs/nav-drawer-menu`** (accordion / drill-down) | `plugins/sgs-blocks/includes/nav-menu-markup.php::sgs_nav_drawer_menu_render_items` | `plugins/sgs-blocks/src/blocks/nav-drawer-menu/render.php` | `li.sgs-nav-drawer-menu__item--has-submenu` › `div.sgs-nav-drawer-menu__accordion-row` › **`.sgs-nav-drawer-menu__link`** (an `<a>`, or a `<span class="…__link …__link--label">` when the parent has no URL) + `details.sgs-nav-drawer-menu__accordion` › `summary.sgs-nav-drawer-menu__accordion-summary` + `ul.sgs-nav-drawer-menu__submenu[data-sgs-drill-panel]` › `a.sgs-nav-drawer-menu__sublink` |

Three facts that follow, all load-bearing:

- **The link is never a direct child of the `<li>` on a submenu-bearing item.** It is a child of
  the fork's wrapper `<div>`. `li > .sgs-nav-bar-menu__link` / `li > .sgs-nav-drawer-menu__link`
  matches nothing there.
- **`.sgs-nav-bar-menu__submenu-wrap` is BAR-ONLY.** The drawer has no element with that class at all.
- **`ul.sgs-nav-bar-menu__submenu` (bar) / `ul.sgs-nav-drawer-menu__submenu` (drawer) is the ONE
  class present in both forks' own root**, which is why every rule that needs to say "inside the
  open panel" keys on it.

### FR-41-36 — Default colour scheme for item/submenu/drawer states

**Status: PARTIAL** (§0a.3). Researched and owner-approved. This is the "what are the
actual default token values" decision for FR-41-1/FR-41-3.

Uses the real `theme.json` palette tokens: `primary`, `primary-dark`, `accent`, `accent-light`,
`accent-text`, `surface` (page background), `surface-alt` (raised background), `text`,
`text-muted`, `border-light`.

**Terminology.** The shared bottom-edge attribute family (`itemBorderWidth` / `Colour` /
`ColourHover` / `ColourCurrent` and its submenu-row sibling `submenuLinkBorder*`) has two names by
context: **Underline** on the horizontal bar's own top-level items (a bottom-edge text-indicator
under one item's own label, not between two items); **Row separator** everywhere the identical
bottom edge sits between two adjacent rows (drawer top-level accordion rows, and the bar/drawer's
shared dropdown/submenu rows). FR-41-37 is a genuinely separate capability — a vertical divider
between top-level BAR items — and is NOT part of this shared family.

**The defaults, as declared** in both `block.json` files and the PHP default-closes:

| Context | Normal | Hover | Current |
|---|---|---|---|
| **Top bar item** (horizontal, desktop) | text and background unset (inherited); Underline colour `border-light`, drawn only once an `itemBorderWidth` is set | text default-closes in PHP to `primary` (skipped when the resolved text treatment is `none`); background unset; Underline `accent` | text and background unset; Underline `accent` (same colour as Hover — with no background fill on either, the Underline plus `itemFontWeightCurrent` `"600"` are what mark Current) |
| **Desktop submenu** (dropdown panel rows) | row background `surface` (the panel paints the row colour when neither `submenuBg` nor `submenuBgGradient` is set); row separator 1px solid `border-light` | row background `primary`; text default-closes in PHP to `text`; row separator `accent` | row background `surface-alt`; text `text` |
| **Drawer top-level** | item family as the top bar (own instance values); the panel background is `nav-drawer`'s `drawerBg`, default `surface` | as the top bar | as the top bar |
| **Drawer nested submenu** (accordion-expanded items) | the same `submenuLinkBg*` / `submenuColour*` family as the desktop submenu | as the desktop submenu | as the desktop submenu |

Sources: `itemBorderColour`, `itemBorderColourHover`, `itemBorderColourCurrent`,
`itemFontWeightCurrent`, `submenuLinkBg`, `submenuLinkBgHover`, `submenuLinkBgCurrent`,
`submenuColourCurrent`, `submenuLinkBorder*` in both blocks' `block.json`;
`plugins/sgs-blocks/src/blocks/nav-drawer/block.json` `drawerBg`;
`plugins/sgs-blocks/includes/nav-menu-css.php::sgs_nav_shared_item_state_css` (its
`$default_item_colour_hover` parameter — both callers pass `'primary'`) and
`plugins/sgs-blocks/includes/nav-menu-submenu-css.php::sgs_nav_shared_submenu_css` (the
`submenuColourHover` default-close to `'text'`).

**Why the submenu defaults are what they are.** Each carries its contrast justification in
`block.json`: `text` on `surface` measures 11.86:1, `text` on `primary` 5.28:1, `text` on
`surface-alt` 14.31:1. `accent-light` background with `accent` text measured only 1.35:1, which is
why the submenu Hover pair is `primary` + `text`. Giving the row an explicit opaque background means
the drawer's nested submenu never depends on a runtime contrast computation against the drawer's own
arbitrary `drawerBg`.

**Why the item Hover text default-closes to a token rather than staying unset.** Left unset, the
hover colour comes from WordPress core's ambient `:root :where(a:hover)` rule, which has zero
specificity and stops matching the instant the pointer leaves the literal `<a>` even while still
inside the item's own open dropdown — so FR-41-13's persistence rule would have nothing to hold
onto. Default-closing here makes every branch that gates on a non-empty hover colour (the Hover
emission and the FR-41-13 rules) fire for every untouched item. Both the bar and the drawer share
the same `primary` default; the parameter stays a parameter so a surface with a genuinely different
background can override it without a shared-function edit.

**Underline / Row-separator rule.** Every context that paints the family (top bar, desktop submenu,
drawer top-level, drawer nested submenu) uses one colour language: `border-light` at rest, `accent`
on Hover and Current. A subtle rest-state line reads more tasteful than an accent-coloured line on
every menu by default. **The item Underline paints nothing until the operator sets
`itemBorderWidth`** (the attribute defaults to `{}`, so an untouched menu shows no line at rest); the
submenu row separator is 1px by default.

⛔ **The drawer does NOT default to a brand/primary-colour-filled whole panel.** Kadence, Astra,
GeneratePress and Divi all default their drawer to a neutral background with brand colour reserved
for accents only; `drawerBg` defaults to the neutral `surface`.

**Not built.** The original scheme also called for an item Hover background tint (`accent-light`)
and a Current-row tint on the top bar and drawer top-level; those background defaults are unset, so
an untouched item paints no Hover or Current fill.

### FR-41-37 — An independent vertical divider between top-level BAR items

**A capability separate from the Underline/Row-separator family above.** An operator can draw a
vertical line between adjacent top-level bar items and colour it, and hover it, independently of the
bar's own Underline. FR-41-7 also lets an operator set `itemBorderWidth.right` for a vertical line,
but that shares `itemBorderColour` / `Hover` / `Current` with the SAME family's bottom-edge Underline
— one colour set, two edges — so it cannot be styled independently, which is what "independent"
requires.

**Attributes** (declared in `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json`):

| Attribute | Type | Default | Meaning |
|---|---|---|---|
| `itemSeparatorWidth` | string | `""` | Line width. Empty is the unset sentinel: the whole rule is emitted only when width AND colour are non-empty, so an untouched nav shows no divider. |
| `itemSeparatorStyle` | string | `"solid"` | solid / dashed / dotted / none. PHP-validated, no JSON enum. |
| `itemSeparatorColour` | string | `"text-muted"` | Resting colour. `border-light` measured ~1.12:1 against a real header background, so a divider in it read as "hover-only"; `text-muted` measures ~4.7:1, a genuine WCAG 1.4.11 UI-component pass (3:1). A between-item divider and an under-text underline read differently against the same background, so this default deliberately differs from the Underline family's `border-light`. |
| `itemSeparatorColourHover` | string | `"accent"` | Hover colour. |
| `itemSeparatorHoverTreatment` | string | `"swap"` | none / swap / sweep. Sweep is offered and emitted only when `supports.sgs.sweepEligibility.itemSeparatorHoverTreatment` passes. |
| `itemSeparatorSweepAngle` | number | `180` | Sweep angle in CSS gradient-angle degrees (same convention as `sweepAngle`); shown only when the treatment is `sweep`. |

There is no Current state (a between-item rule is not itself "the current page").

**Geometry.** The rule is an empty `::before` pseudo-element on every item EXCEPT THE FIRST
(`:not(:first-child)`), positioned at `left: calc(<gap> / -2)`. A flex `gap` is split evenly between
two adjacent siblings, so shifting a zero-width box half the gap to the left of an item's own left
edge lands it in the middle of the gap that precedes it — no JS measurement, no hardcoded pixel
value, tracking whatever `gap` the operator has set (an unset `gap` falls back to the block's own
`8px` default). Exactly one separator paints per gap (n-1 for n items), and neither outer edge of
the bar gets one. It uses `border-left-*`, not `background-color`, so `itemSeparatorStyle`'s
dashed/dotted options keep working.

**Hover reaches from both neighbours.** Because the line sits centred, it reads as shared by the
item before it and the item after it. Hover or focus on EITHER neighbour repaints it: the owning
item's own `:hover` / `:focus-within`, plus an adjacent-sibling rule (`:hover + .item::before` /
`:focus-within + .item::before`) from the preceding item. The reverse pair is built with the same
touch-safe primitives as every other hover rule (`sgs_hover_guarded_rule()` for the guarded `:hover`
half, an unguarded `:focus-within` rule alongside it); `sgs_hover_state_rules()` cannot express the
sibling form.

**Scope: bar-only by construction.** The attribute family and its emitter live only in
`sgs/nav-bar-menu`; `sgs/nav-drawer-menu` never declares `itemSeparator*` and never renders the
rule. The emitter also gates on the bar not carrying the `--drawer` modifier
(`.sgs-nav-bar-menu__bar:not(.sgs-nav-bar-menu__bar--drawer)`). A vertical list has no "next item to
the right" on that axis.

**Emitter:** `plugins/sgs-blocks/includes/nav-menu-item-border-featured-css.php::sgs_nav_shared_item_border_css`.
The `item-separator` element in `block.json`'s `supports.sgs.elements` plus the
`plugins/sgs-blocks/scripts/attr-classification-overrides.json` entries for the behaviour-role
treatment/angle attributes are DB-first (R-31-1), reseeded via `sgs-update-v2.py`.

### FR-41-38 — The hover Sweep is angle-driven

Every band Sweep in this component (the item border band and the separator band) uses one shared,
angle-driven primitive:
`plugins/sgs-blocks/includes/sweep-css.php::sgs_directional_sweep_css` — a
`linear-gradient(<angle>deg, <hover> 50%, <rest> 50%)` at `background-size:200% 200%`, with both
`background-position` endpoints computed from the sine and cosine of the angle, so any degree value
produces a correct two-stop travel. The attribute is `sweepAngle` (`number`, default `90`), edited
with an `AnglePickerControl` plus a preset dropdown; `90` sweeps left to right and `270` right to
left. `borderHoverAnimationDirection` is not a declared attribute and no control writes it; the
emitter reads it defensively off the raw `$attributes` only when `sweepAngle` is absent, so content
saved with that key still renders its chosen direction. (WordPress does not strip an undeclared key
from an already-parsed block's attrs before `render.php` runs; see the note on editor-invisible versus
render-invisible attributes in `plugins/sgs-blocks/CLAUDE.md`.) The text/glyph Sweep (FR-41-26) is a
fixed left-to-right gradient and does not use this primitive.

**The same mechanism drives FR-41-37's separator hover** through `itemSeparatorHoverTreatment` /
`itemSeparatorSweepAngle`. The separator's sweep band lives on the item's own `::before` (the same
pseudo as the resting line), which keeps the item link's own `::before` / `::after` free for the
item background and the border-bottom sweep.

### FR-41-2 — No new shared JS component is built. None is needed.

Two separate premises that would have required new components are both false:

**(a) No `fillRow3`/`textRow3` sibling is created. The existing helpers carry an optional third
state.**

`plugins/sgs-blocks/src/components/colour-variants/fillRow.js::fillRow` and
`…/textRow.js::textRow` accept an optional `current` / `currentGradient` key — the JS mirror of
FR-41-3's optional PHP `current` key, deliberately the same vocabulary. `colourRows` is a single
literal `ArrayExpression` whose entries are mostly `fillRow()` / `textRow()` CALLS. Adding a third
state to such a row is **one more string in that call's `attrs` object**, not a hand-written
`states` array.

⛔ **Two rows are hand-written literals, deliberately, and both reasons are load-bearing — do not
"finish the job" by converting them:**

| Row | Why it cannot use the helper |
|---|---|
| **Item background** (`item-bg`) | FR-41-14 requires the Current state to be omitted **per-STATE** while `Highlight` is active. A conditional attribute NAME passed to the helper (`current: cond ? 'x' : undefined`) is not a string literal, so `describeRow()` would resolve the row as 2 states while it renders 3 — the gate going blind while the code is correct. A spread-of-ternary inside a literal `states` array stays statically countable in BOTH branches. |
| **Item border colour** (`item-border`) | The item border declares **no** gradient attribute (FR-41-7 / §1.2), so the row cannot be `gradientCapable`. ⚠ **Consequence:** a non-`gradientCapable` row renders `DesignTokenPicker`, which carries no contrast check — so this row's `contrastAgainst` / `contrastLargeText` pair is DECLARED per §9.6 and is **currently INERT**. The submenu panel border row beside it IS gradient-capable and its check does run. |

⚠ **A `current` state is appended only when `hover` is also supplied** — both helpers throw a
developer warning on a Current-without-Hover row, because Current is the THIRD state (§1.3), never a
substitute for Hover. ⛔ `linked: true` is set by the helpers on every state they build; the two
hand-written rows set it inline, per row, per state.

**The detector is not blinded.** `31-golden-colour-control.js` resolves a `fillRow` / `textRow` CALL
natively via `describeRow()` — a different question from the literal-array corpus limit below,
which is why the CALL SITE must stay in `edit.js` even though the BUILDER lives in
`plugins/sgs-blocks/src/components/`.

**(b) `SgsBorderControl` needs no fork, and its N-state colour machinery is not used here at all.**

Border COLOUR lives in the global Colour panel as an ordinary 3-state row (FR-41-33), so these
blocks never pass `colourStates`. `SgsBorderControl` still owns width, style and radius, mounted
with the additive **`showColour={ false }`** prop (FR-41-33), which defaults to `true` so every
other caller is unchanged. The multi-state machinery below stays true of the control and of its
40-plus existing mounts — it is simply not the path these blocks take.

`plugins/sgs-blocks/src/components/SgsBorderControl.js::SgsBorderControl` accepts a
`colourStates` prop and forwards it verbatim as `states` to
`plugins/sgs-blocks/src/components/GradientCapableColourControl.js::GradientCapableColourControl`,
which maps over `resolvedStates` with no fixed length anywhere — even its screen-reader description
is parameterised (`'%1$d colour states available: %2$s'`, fed `resolvedStates.length`). A three-
element `colourStates` array renders three tabs. It also carries width (box object, base only),
border style inside the colour popover, and radius. **No fork and no new component is needed for a
3-state border anywhere in the framework** — a three-element array passed by the caller is enough.
⛔ Do not fork it. The single permitted modification in this spec is FR-41-33's additive
`showColour` prop.

⚠ **`borderStyle` rides the colour popover, so `showColour={ false }` must not take border style
with it.** `SgsBorderControl` forwards `styleValue`/`onStyleChange` INTO
`GradientCapableColourControl` as `borderStyle`/`onBorderStyleChange` — the native
`BorderBoxControl` opens both from one swatch. With the colour picker suppressed,
`SgsBorderControl` renders the framework's **existing shared `BorderStyleControl`** as its own
sibling in the same row, so no capability is lost, no attribute moves, and no new control is
hand-rolled (FR-41-33 item 2). ⛔ **Do NOT build a fresh `SelectControl` for border style** —
`plugins/sgs-blocks/src/components/BorderStyleControl.js::BorderStyleControl` is the control the
suppressed popover renders.

Real prop shape, read from the file: `label` · `widthValues` / `onWidthChange` / `widthPresets` ·
`styleValue` / `onStyleChange` · `colourStates` **(the multi-state form)** OR
`colourValue` / `onColourChange` / `colourGradientValue` / `onColourGradientChange` /
`colourLinked` (the single-state form) · `radiusValues` / `onRadiusChange` / `radiusLabel` /
`showRadiusResponsive` · `colourLabel` · `clearable` · `enableAlpha` · `contrastAgainst` /
`contrastLabel` / `contrastLargeText` (defaults `true` here, because a border is a WCAG 1.4.11
UI-component case at 3:1, never body text).

Each `colourStates` entry is `{ key, label, value, onChange, linked, gradientValue,
onGradientChange }` — the exact shape read from
`plugins/sgs-blocks/src/components/GradientCapableColourControl.js::GradientCapableColourControl`'s own `states` docblock. Live
multi-state mount to copy: `plugins/sgs-blocks/src/blocks/container/edit.js::Edit`'s
`<SgsBorderControl colourStates={…}>`.

**The static detector is not blinded by any of this.**
`plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js` resolves a row's
state count as `statesArray.elements.length` on a literal `ArrayExpression`, and enforces a
**minimum of 2** with no upper bound. A three-element literal array resolves to 3 and passes. The
one thing that would blind it is a computed states array — so:

⛔ **State entries are written as LITERAL array entries, never `.map()`/`.filter()`-generated.**
A computed array renders correctly while the detector reports the wrong count ("the code improved
and the gate went blind"). Conditionality happens at ARRAY level
(`showCurrent ? [ normal, hover, current ] : [ normal, hover ]`), which stays statically resolvable.

⛔ **`linked: true` on every state, unconditionally.** It makes `DesignTokenPicker` store the
palette **slug** rather than a baked hex, so a client's brand token survives a re-skin.

⛔ **State labels are translated at the row, as `__( 'Current', 'sgs-blocks' )`** — matching the
existing `Normal`/`Hover` entries in the same arrays. A hardcoded label is a gate-invisible i18n
regression.

### FR-41-3 — The PHP emitters take an optional third state. No `_3` family exists.

⛔ **There is no `sgs_fill_states_css_3`, no `sgs_text_states_css_3`, no
`sgs_border_states_css_3`, and no `sgs_emit_state_colour_css_3`.** A near-duplicate triplication
of four working functions is four more places for the fix that lands on one of them to be missed.
The third state arrives as **optional parameters on the existing functions**, defaulting to the
current behaviour so every existing caller is byte-identical.

**(a) `sgs_emit_state_colour_css()` takes an optional 4th parameter.** Signature
(`plugins/sgs-blocks/includes/helpers-tokens.php::sgs_emit_state_colour_css`):

```php
sgs_emit_state_colour_css(
    string $selector,
    array  $decls_normal,
    array  $decls_hover,
    array  $extra_states = []
): string
```

`$extra_states` is a map of `state_key => [ 'suffix' => string, 'decls' => string[], 'guarded' =>
bool ]`. Each entry emits `{$selector}{$suffix}{…$decls}`, guarded via
`sgs_hover_state_rules()` when `guarded` is true and emitted plainly when false. For the Current
state the caller passes `[ 'current' => [ 'suffix' => '[aria-current="page"]', 'decls' => […],
'guarded' => false ] ]`.

⛔ **`$extra_states` is emitted BEFORE `$decls_hover`, inside the function**, so ordering is a
property of the emitter rather than of every call site. See the source-order rule below.

⛔ **The default `[]` is not a convenience, it is the acceptance condition.** The function has
many call sites across the plugin (count them with
`git grep -c "sgs_emit_state_colour_css(" -- '*.php'`).
Every one of them must produce byte-identical CSS — §11 G1.

**(b) `sgs_fill_decls()` and `sgs_text_decls()` take an optional `current` key.** Both
return `array{normal: string[], hover: string[]}` and read `$map['base']` / `$map['hover']` /
`$map['gradient']` / `$map['hover_gradient']`, with only `base` required. Each also handles:

- a `current` key read from `$map['current']` (and, where the mechanism supports it,
  `$map['current_gradient']`);
- a third `current` key in the returned array, **populated only when the caller's `$map` carries a
  `current` key**.

A caller whose `$map` has no `current` key gets a returned array with an empty `current` bucket
and behaves as a two-state caller. Their `sgs_fill_states_css()` / `sgs_text_states_css()` wrappers
forward the bucket into `$extra_states` when it is non-empty, and pass `[]` when it is not.

**(c) `sgs_border_states_css()` — the third state is FLAT-PATH ONLY, and that is a mechanism
constraint, not a carve-out.** In
`plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_border_states_css` the function has
two paths, chosen by whether a gradient attribute is set anywhere in the map.

| Path | Condition | What it emits | Third state |
|---|---|---|---|
| **Flat** | no `gradient` and no `hover_gradient` set | `{sel}{border-color:X}` plus a `sgs_hover_state_rules()` pair for the hover colour | **Supported.** One more `{sel}[aria-current="page"]{border-color:Z}` rule, emitted before the hover pair. Trivially additive. |
| **Ring** | either gradient set | delegates to `sgs_border_gradient_css( $sel, $normal_paint, $hover_paint, $width )` — a masked `::before` ring that composes BOTH paints into one construction and sets `border-color:transparent` on the element | **Not supported. Current is gradient-exempt at the ring level.** The primitive takes exactly two paints; a border gradient has no single hex. |

⛔ **The ITEM border never reaches the ring path, because these blocks declare no item-border
gradient at all.** `itemBorderColourGradient` is out of scope (FR-41-7, §1.2) — the ring's masked
`::before` collides with the item background layer, which already owns the item link's own
`::before` (`.sgs-nav-bar-menu__link::before` / `.sgs-nav-drawer-menu__link::before`, FR-41-23).
The item border therefore always takes the **flat** path, and its three states —
including Current — all render. There is no gradient-versus-Current trade-off to explain to an
operator on this row, because there is no control to trade off.

⚠ **The submenu PANEL border DOES declare a gradient (`submenuBorderColourGradient`) and that is
not an inconsistency.** Nothing competes for the submenu panel's own `::before`
(`.sgs-nav-bar-menu__submenu::before` / `.sgs-nav-drawer-menu__submenu::before`), so the ring
construction is safe there; and the panel is Normal-only for every property anyway (FR-41-9), so
the ring's two-paint limit costs it nothing. The distinction is the pseudo-element budget on one
specific element, not a rule about border gradients.

**Three binding rules for the emitter:**

1. ⛔ **Every hover rule routes through a helper in
   `plugins/sgs-blocks/includes/helpers-hover-state.php`. Never a bare `{sel}:hover`.**
   Use `sgs_hover_state_rules( $selector, $decls, $focus, $suffix )` when you hold a BASE selector
   — it appends `:hover` (plus any pseudo-element `$suffix`) to each comma-separated part itself,
   and emits the focus rule separately and unguarded. Use `sgs_hover_guarded_rule( $hover_selector,
   $decls )` only when you already hold a fully-built `:hover` selector. On a touchscreen a tap
   engages `:hover` and it sticks until the user taps elsewhere; the client reports it as a broken
   control. The helper's two layers cover different devices — `SGS_HOVER_MEDIA`
   (`@media (hover:hover) and (pointer:fine)`) fixes phones and pure-touch tablets with no JS;
   `SGS_HOVER_NOT_TOUCH` (`:where(:root:not(.sgs-touch-input))`) fixes hybrids, which report
   hover-capable all session while being poked with a finger. Neither covers the other's devices.
2. ⚠ **`:focus-visible` stays OUTSIDE both guards.** A keyboard user on a touchscreen laptop still
   needs the focus state. `sgs_hover_state_rules()` already splits them correctly.
3. ⛔ **The Current rule is emitted BEFORE the Hover rule, and is never guarded.**

**The specificity rule, stated once — do not publish a per-property number table.**

> Because FR-41-1 puts all three states on the same element, **every state-pair shares one base
> selector and differs only by a single one-specificity suffix** — `[aria-current="page"]` (an
> attribute selector) versus `:hover` (a pseudo-class). Both weigh the same. **A state-pair
> therefore always ties, whatever the base selector is, and source order is the only tie-breaker.**

The base selector is `$link_sel` = `.{uid} .{bem_root}__link` — **TWO classes, (0,2,0)**
(`plugins/sgs-blocks/includes/nav-menu-css.php::sgs_nav_shared_item_state_css` sets
`$link_sel = $uid_sel . ' .' . $bem_root . '__link';`, `$bem_root` being `sgs-nav-bar-menu` or
`sgs-nav-drawer-menu` depending on which block called it).
So the text-colour pair is `(0,3,0)` versus `(0,3,0)`, and the background pair — which paints on
`::before` — is `(0,3,1)` versus `(0,3,1)`. Both tie. Both would still tie if the base selector
grew or shrank, which is the point: **write the rule, not the numbers.**

Emitting Current first means *hover wins when you point at the item for the page you are already
on*: a visitor cannot tell WHERE THEY ARE from WHAT THEY ARE POINTING AT — different questions,
different answers. Current is not pointer-dependent, so it takes no touch guard.

### FR-41-16 — `SgsColourPanel` takes optional row keys (additive, zero blast radius)

`plugins/sgs-blocks/src/components/SgsColourPanel.js::SgsColourPanel` renders ONE `PanelBody`
titled "Colour" in the `group="styles"` InspectorControls slot and maps `rows.filter(Boolean)` to
one control each. A row descriptor may carry three optional keys, all additive, all default-absent,
all zero-blast-radius:

| Row-descriptor key | Rendered | Exists for |
|---|---|---|
| `heading` (string) | a non-interactive `BaseControl.VisualLabel` immediately BEFORE the row's control | the §9.6 Menu / Submenu / Menu-button groupings inside one Colour panel, without splitting it into separate panels |
| `after` (React node) | immediately AFTER the row's control, inside the same row wrapper | FR-41-23/24's treatment selector and §9.6/§9.10's `ⓘ` notes. ⛔ **It is a SLOT, not a component** — the panel makes no assumption about what goes in it |
| `contrastLargeText` (boolean) | forwarded alongside `contrastAgainst`/`contrastLabel` on the gradient-capable branch | FR-41-17/FR-41-33's border rows. ⚠ Without it a border row would get the 4.5:1 TEXT threshold instead of WCAG 1.4.11's 3:1 UI-component one |

A row without a key renders byte-identically. `contrastLargeText` is spread only when the row
actually declares it, so "absent" and "explicitly `undefined`" stay distinguishable and G1(a)'s
proof does not have to argue the difference.

FR-41-24 requires the hover-treatment selector to be *"rendered inline directly beneath each row's
`states` array"*, and §9.6 requires two `ⓘ` cross-reference notes in the same position — which is
what `after` provides.

⛔ **`after` is the ONLY sanctioned mount point for the treatment selector — do NOT hand-roll a
second panel, a sibling `PanelBody`, or a control rendered outside the row wrapper.** The whole point
of FR-41-23 is that the operator meets the control and its consequence in ONE place; a selector
mounted anywhere else recreates the three-mechanisms-in-three-places problem it exists to remove.
Live mounts, by which block the row belongs to: the shared Item/Submenu rows' treatments
(`ItemTextTreatment`, `ItemBgTreatment`, `ItemBorderTreatment`, `SubmenuTextTreatment`,
`SubmenuLinkBgTreatment`) export from
`plugins/sgs-blocks/src/shared/nav-menu-panels/ColourRowExtras.js`; the bar-only Burger rows'
treatments (`BurgerIconTreatment`, `BurgerBgTreatment`) export from
`plugins/sgs-blocks/src/blocks/nav-bar-menu/BarColourRowExtras.js` — each passed as that row's
`after`.

⚠ **This is a shared-component change and therefore design-gated (project rule 7).** It is the
minimum shape that does the job: no new component, no prop-shape change, no behaviour change for
any row that omits the keys. **Acceptance:** every other block mounting `SgsColourPanel` renders
byte-identical inspector output (§11 G1).

---

## 3. Accessibility signals: smart contrast and the non-colour state signal

### FR-41-5 — Smart contrast: an opt-in toggle

`itemSmartContrast` is a WCAG safety-net TOGGLE, not a colour, so it sits beside the block's other
accessibility-facing controls — in the General tab **Accessibility** panel (FR-41-27, §9.5) — so an
operator scans one place for "does this menu behave safely" questions.

⛔ **The toggle must stay FINDABLE from the rows it governs.** The Item text and Item background
rows in §9.6 each carry a one-line cross-reference pointing at §9.5, mirroring the cross-reference
pattern §9.8 uses for the submenu's colour rows. Without it the toggle silently governs two
Design-tab rows from a panel on another tab, which reads to an operator as a dropped control.
**Acceptance: §11 G16** — the toggle must be proven to render, to be bound to `itemSmartContrast`,
and to actually change the rendered colour when switched off and on, on the live canary.

⚠ **Sweep defeats this toggle, so the two are never offered together** — see FR-41-26's Sweep
eligibility rule. `-webkit-text-fill-color: transparent` overrides whatever foreground the toggle
resolves, so a row offering both would let a client switch on a safety net that does nothing.

**`itemSmartContrast`, boolean, default `false`** (declared in both blocks' `block.json`). Control:
a native `ToggleControl` labelled "Keep text readable automatically", matching `submenuCaret` /
`itemMagnetEnabled` on the same block.

When on, and the operator has set a Hover or Current **background**,
`plugins/sgs-blocks/includes/nav-menu-css.php::sgs_nav_shared_item_state_css` resolves the matching
foreground through the **existing** helpers — the same ones the featured-item pill and
`sgs/nav-drawer` use. **Do not build a new contrast function.** Two cases:

- **Text colour empty** → `sgs_wcag_text_colour_for_bg( $bg_hex )` picks the guaranteed-safe
  binary foreground.
- **Text colour set** → `sgs_wcag_preferred_text_colour_for_bg( $bg_hex, $preferred )` keeps the
  operator's colour when it clears AA against the resolved fill, and falls back to the safe binary
  only when it does not.

⚠ **The second case means that, with the toggle on, an explicit colour does not always win** — the
operator's choice wins whenever it is readable. An operator who wants their unreadable colour
rendered as-is leaves the toggle off; that is what the toggle is for.

**Default OFF.** An explicit `itemColourHover` renders as-authored unless the operator opts in; a
silent colour swap otherwise reads as "my colour isn't applying". The readability CHECK stays
unconditional: the editor shows an always-on advisory `Notice` under the Item text colour row
whenever the current hover combination fails contrast, regardless of the toggle's position,
pointing to the toggle in the Accessibility panel. Only the automatic colour SWAP is gated on the
toggle.

Help text must be plain language, e.g. *"When you set a background, we can check your text colour
stays readable against it and swap in a readable one if it doesn't. Off by default, so your chosen
colour always renders exactly as picked."* No "WCAG", no "contrast ratio", no "AA" in a
client-visible string.

### FR-41-6 — The non-colour state signal (WCAG 1.4.1)

Hover and Current must never be colour-only signals — that fails SC 1.4.1 Use of Colour for any
visitor who cannot distinguish the two colours, and for an operator who picks a low-chroma palette.
**This FR is discharged entirely by the border row's own Hover treatment — no text-decoration
control is load-bearing for it.** ⚠ The `showHover` typography trio sits *beside* that guarantee,
never *inside* it: it defaults to unset, so it can never be what satisfies SC 1.4.1 here.

⛔ **THE PRIMARY NON-COLOUR SIGNAL IS THE BORDER ROW'S OWN HOVER TREATMENT. THE HOVER TYPOGRAPHY
TRIO IS AN OPTIONAL SECONDARY DECORATION AND IS NEVER "THE DIVIDER".** Both halves of that sentence
are binding, and neither may be restated as the other anywhere in this spec, in any help text, or
in any control label.

**Half one — the primary signal.** FR-41-23 pairs a None/Swap/Sweep selector beneath the item
border's Hover swatch. On `Swap` the border changes colour instantly; on `Sweep` it travels a band
along the bottom edge (FR-41-8). Either is a visible, non-colour-dependent change of state on hover
— a line that was one thing and is now another — and both arrive with the border width the operator
already set. **This is the WCAG 1.4.1 signal for the Hover state, and it is the only thing this spec
counts as one.**

**Half two — the optional secondary layer.** `TypographyControls`' `showHover` flag is switched on,
on both blocks, and all three of its controls ship: hover text-decoration, hover text-transform and
hover font-weight. An operator may additionally choose any of them. **None of them is required for
WCAG compliance, none of them is a substitute for the border treatment, and none of them is an
alternative implementation of the divider.** They are decoration an operator opts into, exactly as
they would opt into a hover colour.

**Why the underline does not compete with the border row.** `itemTextDecorationHover: "underline"`
emits a literal CSS `text-decoration: underline`. That decoration **hugs the text baseline and
spans only the glyphs**; it does not span the item's width. The border row's Hover treatment spans
the full item width on the border box. Two different visual registers:

| | `text-decoration: underline` | Border row's Hover treatment |
|---|---|---|
| Geometry | glyph width, baseline-hugging | full item width, on the border box |
| Competes with a bottom border? | **No** — different width, different vertical position | it IS the bottom-edge treatment |

Offering both is therefore not a "two stacked lines" problem — it is a small text-level decoration
sitting inside a full-width edge treatment, an ordinary compositional choice.

⛔ **There is no full-width animated `::after` underline bar.** `itemTextDecorationHover` is not a
route to one — `text-decoration` cannot span the link box. The item link's `::after` belongs to the
border Sweep band (FR-41-8).

**Consequences:**

1. ✅ **`itemTextDecorationHover`, `itemTextTransformHover` and `itemFontWeightHover` are declared,
   plus their three `submenu`-prefixed siblings** — six attributes, §8.4. They arrive as one set
   because `showHover` is all-or-nothing (it renders the three `SelectControl`s together).
2. ⛔ **`itemTextDecorationCurrent` is NOT declared.** `TypographyControls` models resting + hover
   only, so there is no shared control for a Current trio at all, and Current already carries its
   own signal — `itemFontWeightCurrent`, below. §1.2 names this out of scope.
3. ⚠ **A hover font-weight change reflows the whole bar.** A heavier face is wider, so every item to
   the right of the hovered one shifts. This is an honest operator-discretion caution and it belongs
   in the control's help text — it is **not** a reason to omit the control. ✅ The sentence is
   drafted: §9.10 carries the verbatim string.
4. ✅ **The base `itemTextDecoration` (Normal state only) is unaffected.** It renders through
   `sgs_typography_css_rule()`, and an operator who wants a permanently-underlined menu still has it.

⛔ **The distinction above is RENDERED in the inspector, not only stated here.** An operator
encounters the editor. Two reciprocal `ⓘ` notes discharge it — one under the item border row's
hover-treatment selector (§9.6), one under the hover trio row (§9.10) — each naming the other and
each stating plainly that they are not the same thing. **Both, or neither**: a one-way pointer
leaves the control being pointed at looking like the authoritative one. The verbatim strings for
both notes, and for the two trio help-texts, live in §9.10 — written out, because a binding wording
requirement with no wording is unbuildable. **Gated: §11 G19(e).**

**The default non-colour signal, one per state:**

| State | Signal | Attribute | Default | Why this one |
|---|---|---|---|---|
| **Hover** | the item border's own Hover treatment | `itemBorderColourHover` + `itemBorderHoverTreatment` | `"swap"` | Uses the border the operator already sized, needs no second control, and works identically in the bar and the drawer (FR-41-28). ⚠ It is only *visible* when a bottom (or other) border width is set — see the caveat below. |
| **Current** | `font-weight` | `itemFontWeightCurrent` | `"600"` | Weight is safe on Current because Current does not change on pointer movement — there is no reflow-on-hover to cause. |

⚠ **Caveat: `itemBorderWidth` defaults to `{}`, so an untouched block ships NO border and therefore
no default Hover signal.** It is accepted for one reason: an unrequested underline appearing on every
menu item of every install is itself a design imposition the owner rejected, and the operator has a
first-class control that makes the signal visible in one action. **§10's residual-risk entry
(FR-41-17a) carries this case**, and §11 G10 asserts the Hover signal renders once a border width IS
set — it does not assert a signal on a border-less menu, because there is none to assert.

⛔ **`itemFontWeightCurrent` is typed `"type": "string", "default": "600"`, not a number.** The
sibling it must match, `itemFontWeight`, is declared `{"type":"string","default":""}` in
`block.json`. A number-typed sibling would be a second vocabulary for one property.

⛔ **It renders as a `SelectControl` fed `SGS_FONT_WEIGHT_OPTIONS`** — the framework's shared
10-option string-valued weight list, exported from `TypographyControls.js` and re-exported from the
barrel `plugins/sgs-blocks/src/components/index.js` that each block's `edit.js` imports from. **Not
a number input, and not a locally hand-typed weight array.** The anti-pattern lives on the same
blocks: `featuredFontWeight` / `featuredFontWeightHover` are number-typed and driven by a hand-rolled
4-option array, ignoring the shared list. Do not reproduce it.

**The never-lighter rule.** An operator who bolds their whole menu (`itemFontWeight: "700"`) would
otherwise see the current page render *lighter* than every other item — a signal pointing the wrong
way. So:

> **The emitter writes the Current weight rule only when `(int) itemFontWeightCurrent` is strictly
> greater than `(int) itemFontWeight`.** An empty `itemFontWeight` (the default) casts to `0`, so
> the default `"600"` always emits. An empty `itemFontWeightCurrent` casts to `0` and never emits.

⚠ This is a **floor, not a preference**: an operator who deliberately wants a *lighter* current
page cannot express it here. Accepted — the signal exists to be more prominent, and a
lighter-than-resting "emphasis" is not a signal anyone reads as one.

⛔ **One DEFAULT signal per state, not two — this constrains what SHIPS, not what an operator may
add.** Current's default signal is weight; Hover's is the border treatment. Neither state gets a
second *default*, because two shipped signals per state is noise and makes Current harder to tell
from Hover. ⚠ **This is not a prohibition on the `showHover` trio.** Those three controls default
to unset and paint nothing until an operator chooses them; an operator who then adds a hover
underline on top of the border treatment has made a compositional choice in their own inspector.

An operator can switch either off — set `itemFontWeightCurrent` empty, or leave the border width at
`{}`. That is a deliberate, informed choice made in their own inspector. What this spec must not do
is make colour the ONLY expressible signal, and it does not. The residual risk when both are off is
named honestly in §10 (FR-41-17a).

**How the Current-state controls are rendered — do not build a bespoke control.**
`itemFontWeightCurrent` has **no shared 3-state typography mechanism** (`TypographyControls` models
resting + hover only, and FR-41-21 declines to extend it). It is a standalone `SelectControl` fed
`SGS_FONT_WEIGHT_OPTIONS`, mounted block-privately at the bottom of the Typography panel's Menu
target (FR-41-29, §9.10).

**`itemTextDecoration`'s `block.json` `enum` carries `overline` as a fifth value**
(`["", "none", "underline", "line-through", "overline"]`), matching `SGS_TEXT_DECORATION_OPTIONS`
and the PHP allowlist in `sgs_typography_css_rule()` exactly.

---

## 4. Border and sweep

### FR-41-7 — ONE item border control. There is no separate "Item Divider".

⛔ **There is no `itemDivider` toggle, no `itemBorderColour` as a standalone divider concept, and
no `itemBorderSweep`.** Two mechanisms answering one question is how a double-line bug arises.

**The item's border is a normal 3-state `SgsBorderControl` mount with per-side width.**
`SgsBorderControl` composes `ResponsiveBoxControl` in border-width mode, which is a linked/unlinked
`{top,right,bottom,left}` editor — so:

- an operator who wants a drawer-style horizontal separator between stacked rows sets a **bottom**
  border;
- an operator who wants a vertical separator between items in the flat bar sets a **right** (or
  left) border;
- an operator who wants a boxed item sets all four.

One control, one mental model, per-side by construction. (A vertical divider that is styled
independently of the item's own underline is a different capability — FR-41-37.)

⛔ **Width is BASE-ONLY, by the control's own design.** `SgsBorderControl` hardcodes
`showResponsive={ false }` on its width editor: per-device border width is not offered
framework-wide. Do not propose `itemBorderWidthTablet` / `…Mobile`.

**Attributes** (both blocks): `itemBorderWidth` (object, default `{}` — nothing is painted until the
operator sets a width) · `itemBorderStyle` (string, default `"solid"`) · `itemBorderColour` /
`itemBorderColourHover` / `itemBorderColourCurrent` (string, defaults `"border-light"` / `"accent"` /
`"accent"`) · `itemBorderRadius` (object, default `8px` on every corner). The emitter writes
`border-width` and `border-style` only when a width is set — a `border-style` with no width would
paint the UA-default `medium` border the operator never asked for.

⛔ **There is no `itemBorderColourGradient`. It is a named SCOPE CUT, not a silent drop.** The
reason is a pseudo-element budget, not a judgement about gradients: `sgs_border_states_css()`'s
gradient path is a masked `::before` ring (FR-41-3(c)), and the item link's own `::before`
(`.sgs-nav-bar-menu__link::before` / `.sgs-nav-drawer-menu__link::before`) is the item background
layer (FR-41-15, FR-41-23). Two features cannot both own one pseudo-element, and a control
FR-41-3(c) declares Current-exempt anyway is not worth moving the background for. The submenu PANEL
border keeps its gradient; nothing competes for its `::before`.

⛔ **The three border COLOUR attributes are NOT authored inside this control.** They render as an
ordinary 3-state row in the global Colour panel, alongside item fill and item text — FR-41-33.
`SgsBorderControl` is mounted here with `showColour={ false }` and owns width, style and radius
only. Building a second live control that writes the same attribute from two panels is banned
(`check-duplicate-controls.js`), so the split is exclusive: one authoring surface per attribute.

⛔ **Radius rides `SgsBorderControl`'s own `radiusValues` / `onRadiusChange` pair — there is no
competing flat radius control alongside the mount, and the FR-41-33 colour split does not touch
it.** Radius is not a colour; it stays with width and style where the control's own contract puts
it (*"the SGS-wrapped NATIVE border radius belongs with the border, not in a separate panel"*).
Mount it with `showRadiusResponsive={ false }`, matching the base-only width.

**Borders do NOT leak between the bar and the drawer.** The horizontal bar and the drawer's
vertical list are **two separate blocks** — `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` — each with
its own uid, its own scoped `<style>` and its own inspector.
`plugins/sgs-blocks/src/blocks/nav-drawer/edit.js::TEMPLATE` seeds `[ [ 'sgs/nav-drawer-menu', { gap: '4px' } ],
[ 'sgs/responsive-logo' ], [ 'sgs/button' ] ]`, entirely independent of the bar's
`sgs/nav-bar-menu` instance in the header. A bottom border set on the drawer's instance is invisible
to the bar's, and vice versa.

### FR-41-8 — The item border's hover treatment: None / Swap / Sweep

The choice lives on the universal **hover-treatment selector** (FR-41-23) that sits directly under
the item border row's Hover colour, alongside every other stateful colour row on the block. A
standalone "hover colour animation" control in the border panel would be a second, independent
mechanism competing with the plain Hover-colour swap on the SAME property — the "two controls for
one property" pattern this spec refuses. The direction of a `sweep` is `sweepAngle` (FR-41-38),
shown only when `sweep` is chosen. This FR owns the MECHANISM; FR-41-23 owns the CONTROL PLACEMENT.

**`itemBorderHoverTreatment`, string, default `"swap"`.** Values: `none` | `swap` | `sweep`.
The selector is a `ToggleGroupControl` + `ToggleGroupControlOption` from
`plugins/sgs-blocks/src/components/primitives` — three options sit inside the framework's
segmented-control threshold, which is **data-driven, not a judgement call**:
`plugins/sgs-blocks/src/components/TypographyControls.js::SGS_TYPOGRAPHY_SWITCHER_MAX_SEGMENTED`
is `3`.

**One control, not per-element.** It lives with the item border row. It is deliberately **not**
duplicated on the background or text rows for the border, and **not** given a submenu-panel twin —
a client choosing an animation three times for one visual effect is a worse inspector, not a richer
one, and the submenu panel is not a hoverable surface at all (FR-41-9).

⛔ **Declare it as a plain `"type": "string"` and validate it in PHP — never a JSON `enum`.** An
out-of-enum JSON value silently coerces the stored value back to the `block.json` default with no
error or warning, which bites hardest via a programmatic writer (the cloning pipeline, pattern
files) that sets the attribute directly rather than through this block's inspector control.

**It animates the BOTTOM edge only.** A directional sweep needs a horizontal line to travel along;
a vertical edge has nothing to sweep. Other edges swap colour instantly.

⛔ **When `itemBorderHoverTreatment === 'sweep'`, the Hover AND Current border-colour emissions are
OMITTED for the swept edge. The band owns every non-resting colour on it.** The mechanism below
makes the RESTING bottom border transparent so the band shows through, but nothing in
`sgs_border_states_css()` would know that on its own: it would still emit
`{link}:hover{border-bottom-color:X}` and `{link}[aria-current="page"]{border-bottom-color:Z}` from
`itemBorderColourHover` / `itemBorderColourCurrent`, repainting a real border on the border box
directly beneath the band on the padding box — **two visible horizontal lines on hover, one of them
un-asked-for.**

**The rule, stated as the emitter's own condition rather than a call-site convention.**
`plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_border_states_css` has the signature
`sgs_border_states_css( string $selector, array $attributes, array $map )` and resolves one
`$normal_paint` and one `$hover_paint`, emitting a single flat `border-color:` declaration for all
four sides. Per-edge suppression is therefore an ADDITIVE optional key, reusing the project's
existing box-object naming:

> **`$map` accepts an optional `suppress_edges` key**, shaped
> `array( 'top' => bool, 'right' => bool, 'bottom' => bool, 'left' => bool )` — the SAME
> `{top, right, bottom, left}` vocabulary the box object uses for `itemBorderWidth` (§8.4).
> An absent key, an empty array, or an absent edge inside it all mean *false*.
>
> When any edge is suppressed, the helper's **non-resting** rules (the hover pair, and the `current`
> state of FR-41-3) emit per-edge `border-<edge>-color` **longhands** for the unsuppressed
> edges only, in top/right/bottom/left order. When no edge is suppressed it emits the flat
> `border-color` **shorthand**. When every edge is suppressed it emits no non-resting rule at
> all — not an empty rule body.
>
> **The RESTING rule is unaffected.** The Normal-state bottom colour still resolves — it is what
> mechanism item 2 below overrides to `transparent`, and what the band's own gradient reads as its
> resting stop. Every unsuppressed edge keeps all three states.
>
> Each block calls the helper ONCE, normally, passing
> `'suppress_edges' => array( 'bottom' => true )` when the resolved `itemBorderHoverTreatment` is
> `'sweep'`, and passing **no `suppress_edges` key at all** otherwise. The call is in
> `plugins/sgs-blocks/includes/nav-menu-item-border-featured-css.php::sgs_nav_shared_item_border_css`.

⛔ **The gradient/ring path IGNORES `suppress_edges`, silently and by design.** When `gradient` or
`hover_gradient` is set the function delegates to `sgs_border_gradient_css()` — a masked `::before`
ring that takes exactly two paints and has no per-edge concept — so a per-edge request there is
*unexpressible*. This is the same exemption FR-41-3 records for the Current state at the ring level.
The helper's docblock says so in one sentence naming the reason.

⛔ **The absent-key default is the ACCEPTANCE CONDITION, not a convenience.** Every other caller of
`sgs_border_states_css()` passes no `suppress_edges` key, and every one must emit byte-identical
CSS — **including the flat `border-color` shorthand**. An implementation that always emits per-edge
longhands renders identically and is byte-different for every other caller, and has failed. §11
**G1(c)** is the proof, covering this parameter alongside FR-41-3's third state; **G6** is the live
end-to-end proof.

⚠ **Why the shared helper and not a block-private override rule.** The alternative — call the helper
normally, then emit one block-private rule resetting `border-bottom-color` under hover and current —
would be a SECOND mechanism painting border colour on one selector: two overlapping fixes, neither
falsifiable, neither ever safely deletable. Per-edge awareness is a real gap in the shared painter,
not a nav-menu peculiarity — border **width** has the box-object concept and border **colour** did
not. The project's precedent for this shape of finding is FR-41-2/FR-41-3: an additive optional
parameter on the existing shared function, never a new sibling. There is no `_3` family, and there
is no `sgs_border_states_css_per_edge()` either.

⚠ **The Hover and Current swatches stay VISIBLE and stay STORED.** They still govern the other
three edges, and the band reads the Hover value as its travelling colour (the colour-reuse rule —
Sweep does not introduce a second colour). Only the *emission on the swept edge* is dropped.
Switching the treatment back to `Swap` restores the plain pair with nothing lost.

**Mechanism — one painted line, not two.** When `sweep` is chosen, the emitter writes three things:

1. ⛔ **`{link}{position:relative;}`, UNCONDITIONALLY.** The band is `position:absolute` and needs a
   positioned ancestor. The item-background rule sets `position:relative` only when a fill is set,
   so it does **not** fire for an operator who sets a sweep and no background. Emit it from the
   sweep branch too. When both fire, the two rules sit on the same selector with compatible
   declarations; that is harmless duplication, not a conflict.
2. ⛔ **`{link}{border-bottom-color:transparent;}`.** `bottom:0` on an absolutely-positioned child
   resolves against the containing block's **padding** box, while a real `border-bottom` paints on
   the **border** box — so a band at `bottom:0` sits *above* the border rather than on it, and an
   operator who set both a bottom border colour and a sweep would see two horizontal lines.
   Suppressing the border's own colour and positioning the band to occupy exactly the border strip
   gives one painted line whose geometry is identical to where the border would have been.
3. **The band itself**, on the link's `::after`, sized to the operator's bottom border width and
   offset outward by that same width so it lands on the transparent strip:

```
{link}::after {
  content: ""; position: absolute; inset-inline: 0;
  bottom: calc(-1 * <itemBorderWidth.bottom>);
  height: <itemBorderWidth.bottom>;
  background-image: <gradient from sgs_directional_sweep_css( sweepAngle, NORMAL, HOVER )>;
  background-size: 200% 200%;
  background-position: <rest position>;
  background-repeat: no-repeat;
  transition: background-position 300ms ease;
  pointer-events: none;
}
/* guarded hover + unguarded focus-visible, via the 4-arg helper form */
{link}:hover::after { background-position: <hover position>; }
```

The gradient, size and the two positions come from `sgs_directional_sweep_css()` (FR-41-38); the
default `sweepAngle` of `90` travels left to right and `270` right to left.

**The other two treatments emit no band, no `border-bottom-color:transparent`, and no
`position:relative`** — and they differ from each other only in what `sgs_border_states_css()` is
handed, per FR-41-23's fixed three-option vocabulary:

| `itemBorderHoverTreatment` | What `sgs_border_states_css()` receives |
|---|---|
| `swap` *(default)* | The full `$map` — Normal, Hover and Current border colours all emit, on every edge. |
| `none` | `hover` unset on every edge. The border does not change on hover; Current still emits (Current is not a hover state — FR-41-23). The Hover swatch stays stored. |
| `sweep` | `hover` and `current` unset on the BOTTOM edge only, per the rule above; every other edge behaves as `swap`. |

⚠ **A sweep with no bottom border width set, or with no Hover colour set, emits nothing.** There is
no line to sweep, and no colour to travel to (Sweep reuses the row's own Hover swatch and invents no
colour of its own). Say so in the control's help text rather than letting an operator pick a
direction and see no change.

The gradient shape follows the proven precedent
`plugins/sgs-blocks/src/blocks/business-info/style.css::.sgs-business-attribution .sgs-business-info__link`
(a two-stop gradient, `background-repeat: no-repeat`, `transition: background-position 300ms ease`,
its `:hover, :focus-visible` rule moving `background-position`). The one thing this spec does **not**
copy is that rule's `background-clip: text` / `-webkit-text-fill-color: transparent` pair — that
precedent sweeps the GLYPHS; this sweeps a separate band element, so it needs no clip, no
`@supports` fallback, no `forced-colors` rescue and no `print` rescue.

⛔ **A `prefers-reduced-motion` companion rule is MANDATORY**, matching the precedent's own:

```
@media (prefers-reduced-motion: reduce) { {link}::after { transition: none; } }
```

Keep both end states, drop only the travel between them. The colour still changes on hover — it is
an affordance, not decoration — it just arrives whole instead of sweeping. Every animated hover
effect in this codebase pairs with one of these.

⚠ **Emit these rules from PHP through the hover helpers — NOT from `style.css`.** The sweep's two
colours are **operator attributes**, so the rule cannot be static CSS. (`background-position` is
classifiable, not a problem: it is a listed member of `MOTION_PROPERTIES` in
`plugins/sgs-blocks/scripts/hover-guard/classify.js`. The build gate would handle it fine — the
block simply cannot know the colours at build time.) Emitting from PHP routes the rule through
`sgs_hover_state_rules( $link_sel, 'background-position:…', ':focus-visible', '::after' )`, which
carries both touch layers and splits the focus rule out unguarded.

---

## 5. The submenu

### FR-41-9 — The submenu split: the PANEL and the LINKS are different things

**The PANEL** — `.sgs-nav-bar-menu__submenu` / `.sgs-nav-drawer-menu__submenu`, the floating
container. It is **Normal-only for every property that has states**: background, border colour and
shadow. A bare panel is never itself the hovered surface, and it is never "the current page" either.
The panel (`submenuBg`) is declared with no `Hover`/`Current` siblings anywhere in the attribute
list, the `block.json` manifest, or §9. The thing that IS hoverable, `submenuLinkBg` / `…Hover` /
`…Current`, is a distinct, correctly-3-state attribute family on the LINK: submenu items have their
own background colour; the whole panel does not get a hover state because its background is never
visible in a hoverable state on its own.

⛔ **This applies to the BORDER as much as the background — they are the same argument.** A panel
that cannot be hovered for one property cannot be hovered for another. There is no
`submenuBorderColourHover`, no `submenuBorderColourCurrent`, and no `submenuBorderHoverAnimation`.
The same reasoning applies to its shadow in §9.9 (*"a floating panel has no meaningful hover or
current shadow: it is either rendered (open) or absent (closed)"*).

⛔ **The panel shadow is a `filter:drop-shadow()`, not a `box-shadow`.** The panel wrapper
(`.{bem_root}__submenu-wrap`, `{bem_root}` being `sgs-nav-bar-menu` or `sgs-nav-drawer-menu`)
carries `overflow-y:auto` (`plugins/sgs-blocks/includes/nav-menu-submenu-css.php`), so a `box-shadow`
declared on it would be clipped invisible; a `filter` effect is not subject to `overflow` clipping.

⛔ **`supports.sgs.colourExemptions`'s `submenu-bg` entry is kept in both
`plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json` and
`plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json`.** Its `"rule": "states"` claim is TRUE
and the entry is what stops a conformance gate demanding a hover state that has no meaning. Its
wording names where the hoverable surface actually is — `submenuLinkBg*` — so a future reader is
not led to conclude the panel is a gap. The `indicator` entry is kept too (`pointer-events: none`,
structurally unhoverable), and a matching entry covers the panel's border under the same reasoning.

**The LINK** — `.sgs-nav-bar-menu__sublink` / `.sgs-nav-drawer-menu__sublink`. It carries a genuine
3-state background as attributes named distinctly from the panel's:

| Attribute | Type | Default |
|---|---|---|
| `submenuLinkBg` | string | `"surface"` |
| `submenuLinkBgHover` | string | `"primary"` |
| `submenuLinkBgCurrent` | string | `"surface-alt"` |
| `submenuLinkBgGradient` | string | `""` (Normal-state gradient sibling) |

(The defaults and their contrast justification are FR-41-36's.)

⛔ **Do NOT reuse `submenuBg*` names for the link.** Two elements sharing one attribute prefix is
exactly the element-conflation this split exists to prevent, and the block's own manifest warns
about it: the `sublink` element declares `"prefix": ""` precisely because *"a \"submenu\" prefix
would wrongly try to claim submenuAlign/Caret/CloseGrace/MinWidth/Radius/Padding, which belong to
the submenu PANEL rather than to this anchor"*.

The submenu link's **text** colour has its Current state on the existing naming line:
`submenuColourCurrent` (string, default `"text"`), sibling of `submenuColour` / `submenuColourHover`.

### FR-41-10 — Submenu open animation

**Bar-only** — the submenu-wrap element this section governs exists only on `sgs/nav-bar-menu` (the
drawer's accordion has no equivalent wrapper). The dropdown appears via a binary display toggle —
`plugins/sgs-blocks/includes/nav-menu-submenu-css.php` emits
`{uid} .sgs-nav-bar-menu__submenu-wrap{…display:none;}` and
`{uid} [data-sgs-mega-trigger][aria-expanded="true"] ~ .sgs-nav-bar-menu__submenu-wrap{display:block;}`
— and the open animation is layered on that toggle.

**`submenuAnimation`, string, default `"fade"`.** Values: `none` | `fade` | `slide-down`.
PHP-validated, no JSON enum, same reasoning as FR-41-8. `fade` is a pure-opacity transition with no
directional assumption, safe regardless of overflow-flip repositioning. Control:
`ToggleGroupControl` + `ToggleGroupControlOption` — three options, inside the framework's
data-driven segmented threshold.

⛔ **A `prefers-reduced-motion: reduce` companion is mandatory** for `fade` and `slide-down`: the
panel still opens, it just arrives whole. A panel that fails to open under reduced motion is a
broken menu, not a calmer one.

Placement: the **"Dropdown (only affects items with sub-items)"** `ToolsPanel` (§9.9), beside the
other panel-level behaviours.

**The chain.** `submenuAnimation` is BAR-ONLY: the attribute is declared only in
`nav-bar-menu`, and `nav-drawer-menu`'s native `<details>` accordion opens via a display toggle, not
an animated disclosure (see the docblock of
`plugins/sgs-blocks/src/shared/nav-menu-panels/DropdownStylePanel.js`). The Control row below is the
one shared file; the rest are bar-only.

| Link | Where |
|---|---|
| Control | `plugins/sgs-blocks/src/shared/nav-menu-panels/DropdownStylePanel.js` — a `ToolsPanelItem` wrapping a five-option `SelectControl` (`none`, `fade`, `fade-lift`, `slide-down`, `grow`), gated `showSizingControls` (bar `true` / drawer `false`); timing, easing and item stagger sit in `plugins/sgs-blocks/src/blocks/nav-bar-menu/PanelMotionPanel.js` |
| Storage | `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::attributes.submenuAnimation`, `"type":"string"`, default `"fade"`, **no JSON `enum`** (FR-41-8's reasoning) |
| Validation | `plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php` — the renderer's constructor reduces `$attributes['submenuAnimation']` to `$submenu['animation']` via `in_array( …, array( 'fade', 'fade-lift', 'slide-down', 'grow' ), true ) ? … : 'none'`, so an out-of-vocabulary stored value degrades to `none` rather than reaching the markup |
| Markup | `plugins/sgs-blocks/includes/nav-menu-markup.php::sgs_nav_bar_menu_render_items` — the dropdown wrap AND the mega panel wrap both carry `sgs-nav-bar-menu__panel-motion sgs-nav-bar-menu__panel-motion--{animation}` |
| Paint | `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css::.sgs-nav-bar-menu__panel-motion` — transitions on opacity, translate, scale, clip-path, visibility and `display` (`transition-behavior: allow-discrete`), entered from `@starting-style`; timing from `--sgs-nbm-panel-dur` / `--sgs-nbm-panel-exit-dur` / `--sgs-nbm-panel-ease` written by render.php |

The panel shows by the binary `display:none → block` toggle on the wrap. `@starting-style` gives the
newly displayed wrap a first frame to transition from, and `transition-behavior: allow-discrete` holds
`display` until the close transition ends, so the panel both arrives and leaves. While closing it takes
no pointer hits and its `visibility` goes hidden, so it leaves the Tab order and the accessibility tree.
A browser without the exit part closes instantly, never leaving a stuck or invisible panel. Spec 36
"Motion" (Wave 3C U-5) holds the full vocabulary.

⛔ **Reduced motion: every panel rule sits inside `prefers-reduced-motion: no-preference`.** Under
`reduce` none of the closed-state values (opacity 0, the -8px lift, the clip) apply, so the panel opens
and closes whole. It is never stranded at an invisible start state.

⚠ **Bar-only, correctly.** The panel wraps exist only on `sgs/nav-bar-menu`; the drawer's native
`<details>` accordion never renders them (FR-41-1), so it has no panel animation. The drawer's own
arrival and item stagger are `sgs/nav-drawer` attributes (Spec 36 "Motion").

### FR-41-11 — Submenu top offset, and the hover-bridge it requires

The gap between the bar and the dropdown is `top:100%` on `{uid} .sgs-nav-bar-menu__submenu-wrap`.

**`submenuTopOffset`, string, default `""`.** Control: `SgsLengthControl` with `presets={ false }`,
rendered as a `ToolsPanelItem` in the "Dropdown" `ToolsPanel` beside `submenuMinWidth` and the
border — byte-identical in shape to those two. Empty renders the plain `top:100%`. Emitted as
`top: calc(100% + <offset>)` so the `100%` anchor is preserved and only the gap is operator-owned.

⛔ **A non-zero offset creates a hover dead strip, and that reintroduces the exact bug FR-41-13
exists to fix. It MUST ship with the bridge below.** The gap between the bar and the panel belongs
to neither element, so as the pointer crosses it neither is hovered and the parent flickers back to
its resting paint mid-journey.

⛔ **`submenuCloseGrace` does NOT cover this — do not cite it as if it does.** In
`plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js::leaveBridge` it is a
`window.setTimeout` on the bridge element's `mouseleave` that defers setting `ctx.isOpen = false`.
It governs **openness** — whether `[aria-expanded="true"] ~ .submenu-wrap{display:block}` still
applies — and never touches CSS `:hover` at all. The panel correctly stays open across the gap; the
parent's paint would not.

**The fix — a CSS hover-bridge pseudo-element, emitted only when an offset is set:**

```
{uid} .sgs-nav-bar-menu__submenu-wrap::before {
  content: ""; position: absolute; left: 0; right: 0;
  bottom: 100%; height: <submenuTopOffset>;
  pointer-events: auto;
}
```

Four facts that make this safe:

1. **`.sgs-nav-bar-menu__submenu-wrap::before` is unused** by any other rule
   (`git grep -n "submenu-wrap::" -- plugins/sgs-blocks/src` shows only this bridge).
2. **The wrap is `position:absolute`**, so it is its own containing block and the bridge needs no
   extra positioning setup.
3. **A closed panel cannot intercept anything.** The wrap is `display:none` until
   `[aria-expanded="true"]`, and a `display:none` element has no pseudo-elements — so the bridge
   only exists while the panel is open, and never sits invisibly over the bar.
4. **Bar-only, correctly.** `submenuTopOffset` targets `.sgs-nav-bar-menu__submenu-wrap`, which the
   drawer block does not render at all (FR-41-1). The drawer's accordion has no offset and no gap,
   so it needs no bridge.

---

## 6. The menu trigger

### FR-41-12 — The burger has a mode + label. The close side is a `sgs/nav-drawer` companion.

⛔ **The panel is named "Menu Button".** "Burger" is jargon; "Menu Trigger" is a developer's word
for a thing a client thinks of as a button. It carries the same plain-English help text as its
opening line — *"Controls the button that opens the mobile menu (the 'burger')."* — so an operator
who DOES know the jargon still finds it. See §9.3.

⚠ **The panel heading is a LABEL only. No attribute carries the label's name.** `triggerMode`,
`triggerLabel`, `triggerIcon`, `triggerMagnet*` and the whole `burger*` family keep their names. A
rename's blast radius is the whole write path — the converter emits these names too — and a panel
heading buys the same clarity (§8.4's zero-renames rule).

**The OPEN side (`sgs/nav-bar-menu` — the Menu Button is bar-only; the drawer has no burger).** The
burger is a `<button class="sgs-nav-bar-menu__burger">` built by
`plugins/sgs-blocks/includes/nav-menu-markup.php::sgs_nav_bar_menu_burger_toggle_markup`.

| Attribute | Type | Default | Purpose | Control |
|---|---|---|---|---|
| `triggerMode` | string | `"icon"` | `icon` \| `text` \| `icon-and-text`. PHP-validated, no JSON enum. | `ToggleGroupControl` + `ToggleGroupControlOption` (three options) |
| `triggerLabel` | string | `"Menu"` | The visible word, used by `text` and `icon-and-text`. | native `TextControl` with `__nextHasNoMarginBottom __next40pxDefaultSize`, matching this block's existing `navLabel` / `drawerRef` text fields — **not** `SgsFreeTextField`, which has zero adopters on this block |
| `triggerIcon` | object | `{"source":"lucide","name":"menu"}` | The glyph (FR-41-30(a)). | the framework Icon Picker |

`icon` renders the icon alone. `text` replaces the SVG with
`<span class="sgs-nav-bar-menu__burger-text">`. `icon-and-text` renders both, the icon first, in the
flex button.

⚠ **The `aria-label` lives inside a format-string literal and is assembled conditionally.** The
button's attribute segment is a variable (`$aria_attr`); the function builds
`sprintf( ' aria-label="%s"', esc_attr__( 'Open menu', 'sgs-blocks' ) )` only when the mode is
`icon`, and interpolates that. Passing `''` into an `aria-label="%s"` literal would emit
`aria-label=""`, an *empty accessible name*, strictly worse than the mismatch it avoids.

Why it goes at all: under `text` and `icon-and-text` the visible word IS the accessible name, so an
`aria-label` saying something different breaks SC 2.5.3 Label in Name for voice control. Under
`icon` it stays.

⚠ **`aria-hidden="true"` on the icon under `icon-and-text`.** With a real visible word beside it the
SVG is decorative, and `nav-menu-markup.php` sets that convention on exactly this shape: the
sublink marker and the caret (`.sgs-nav-bar-menu__sublink-marker` /
`.sgs-nav-drawer-menu__sublink-marker` and `.sgs-nav-bar-menu__caret` /
`.sgs-nav-drawer-menu__caret`) both carry `aria-hidden="true"` on a decorative icon rendered next to
real text. Under `icon` mode the SVG is the only content and the button's own `aria-label` names
it, so it stays as-is.

⚠ **The button is not a fixed square in the non-icon modes.** `burgerSize` drives `width`, `height`,
`min-width` and `min-height` in one rule, and is declared twice in the `burger` element's `attrMap`
(`css:width` and `css:height` both → `burgerSize`). A word does not fit a 44px square. **Under
`text` and `icon-and-text`, the emitter writes `min-width: <burgerSize>` and `width: auto` in place
of the fixed `width`, and keeps `height` and `min-height`** so the 44px touch-target floor survives
(`plugins/sgs-blocks/includes/nav-menu-trigger-css.php::sgs_nav_bar_menu_trigger_css`). Under `icon`
the rule is the fixed square.

**The CLOSE side lives in `sgs/nav-drawer`'s own `block.json` and mirrors the open side** — same
shared helpers, same control shape. Without it the open side would have an editable label and an
icon picker and the close side would have neither, which reads to an operator as half-finished.

`sgs/nav-drawer` owns the close button and declares `closeStyle` (string, default `"separate-x"`, a
real JSON enum), rendered by its own `render.php`.

**What is not part of this FR.** The close button's 2-state colour pairing is separate and complete:
`toggleCloseColour` / `toggleCloseColourHover` / `toggleCloseColourGradient`, declared on
`supports.sgs.elements.close` with explicit base and `states.hover` `attrMap`s, emitted via
`sgs_text_colour_decl()` + `sgs_hover_state_rules()`. The close side needs the label and the glyph
choice, not colour control.

**The two close-side controls:**

1. **`closeLabel` (string, default `"Close"`)**, the mirror of `triggerLabel`, same `TextControl`
   mount. `text-swap` renders it as `<span class="sgs-nav-drawer__close-text">`. ⛔ When
   `closeLabel` resolves empty, the hardcoded `aria-label` `esc_attr__( 'Close menu', 'sgs-blocks' )`
   must SURVIVE — `aria-label=""` is an empty accessible name and strictly worse than the mismatch,
   the identical trap the open side avoids.
2. **`closeIcon` (object, default `{"source":"lucide","name":"x"}`)**, resolved through the SAME
   source-aware resolver `sgs/icon` uses (FR-41-30(a)'s mechanism), plus a fourth `closeStyle`
   value.

`closeStyle` looks like `triggerMode`'s twin and is not: `separate-x` and `text-swap` ARE the
icon/text display axis, but **`burger-morph` is a GLYPH choice, not a display mode** — a CSS-drawn
two-bar `<span class="sgs-nav-drawer__close-bars">` that reads as an X, with no icon and no text.
The attribute conflates two orthogonal axes, so a one-to-one mapping to `triggerMode`'s three values
would delete a look. It therefore keeps its name and its three original values and carries a FOURTH:
`icon-and-text`. Since Wave 3C U-11 (Spec 36 FR-36-6) `closeStyle` is a per-device tier object with a
fifth value, `trigger`, so it has no JSON `enum`; the allowed values live in
`plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$sgs_nd_allowed_close_styles` and the editor's option
list, and a standalone test (`plugins/sgs-blocks/tests/php/run-close-control-standalone.php`) asserts the two
agree, because a value accepted by one side and rejected by the other coerces silently to the default.

⛔ **The new option's LABEL is "Both", not "Icon and text".** It keeps to the same 12-character
`ToggleGroupControl` bound as the open side (Spec 35 Part O). **The STORED enum value is
`icon-and-text`; only the displayed label text is shortened.** ⛔ Never shorten the VALUE to match
the label — keeping `icon-and-text` is what gives the open and close sides one vocabulary. The other
three labels are `× icon` / `“Close” text` / `Morphed icon`.

⛔ **The magnetic-pull trio (FR-41-31) is NOT mirrored onto the close button.** A magnet on a close
control inside an open modal is a different design question, not a symmetry gap.

⚠ `closeIcon` and `closeLabel` route no CSS property, so — exactly as §8.6(e) rules for
`triggerMode`/`triggerLabel` on the open side — they get **no `supports.sgs.elements` members**.
Declaring them would create phantom routing slots.

⚠ `sgs/nav-drawer` is outside this spec's §11 gate set, which is scoped to `sgs/nav-bar-menu` and
`sgs/nav-drawer-menu`. The close button's acceptance conditions are: enum parity across both lists,
a non-empty accessible name when `closeLabel` is empty, and a `closeIcon`-unset byte-identity proof
(the same shape G15 applies on the open side).

Panel: the **"Menu Button"** panel carries `triggerIcon`, `triggerMode`, `triggerLabel`,
`burgerSize` and the FR-41-31 magnetic-pull trio. Its colours sit in the single Colour panel's
**Menu button** grouping (§9.6).

---

## 7. Three behaviours that are fixes, not controls

### FR-41-13 — A parent item stays in its Hover state while its own dropdown is hovered

**Problem.** The item's hover rule targets exactly two selectors — `{$link_sel}:hover` and
`{$link_sel}:focus-visible`. Nothing watches "is a descendant of my submenu currently hovered".
Without FR-41-13, the moment the pointer leaves the parent link and enters the dropdown it
just opened, the parent would snap back to its resting colour while its panel is still open.

**Effect.** An open panel with no visible parent reads as broken, and it breaks the "you are
inside this branch" affordance Spec 36 FR-36-4's "distinct hover+focus states" is asking for.

**Solution — FOUR rules: a mouse half and a keyboard half, PER FORK.** One rule cannot cover both
forks, because the wrapper element between the `<li>` and the link has a different class in each
(FR-41-1's DOM table). Read that table before touching any of these.

**The mouse half needs no `:has()` at all.** `:hover` matches every ANCESTOR **in the DOM tree** of
the element the pointer is over — including an ancestor whose box does not visually contain the
target, which is the case here since the panel is absolutely positioned. So hovering into the panel
keeps the fork wrapper's own `:hover` true for free:

```
/* BAR — sgs/nav-bar-menu, {bem_root} = sgs-nav-bar-menu */
{uid} .{bem_root}__submenu-root:hover > .{bem_root}__link

/* DRAWER — sgs/nav-drawer-menu, {bem_root} = sgs-nav-drawer-menu */
{uid} .{bem_root}__accordion-row:hover > .{bem_root}__link
```

⛔ **The `>` child combinator is what stops the rule repainting sublinks inside the open panel, and
it is load-bearing — do not relax it to a descendant space.** In both forks the trigger link is a
*direct child* of the wrapper, while every `.{bem_root}__sublink` sits two or more levels deeper
inside `ul.{bem_root}__submenu`. A descendant selector would also match nothing extra *today*
(sublinks carry a different class), but it would silently start matching the moment any nested
structure gains a `.{bem_root}__link` — and the whole point of the rule is that the PARENT keeps
its look, not that everything in the branch does.

⚠ **`.{bem_root}__submenu-root` is dropdown-only and needs no `--has-submenu` qualifier.** The
mega-menu variant emits `.{bem_root}__mega` instead, so the class already scopes itself.

**The keyboard half genuinely needs `:has()`**, because focus does not bubble the way hover does.
Both forks key on `ul.{bem_root}__submenu` — the one class present in each fork's own root:

```
/* BAR — sgs/nav-bar-menu, {bem_root} = sgs-nav-bar-menu */
{uid} .{bem_root}__submenu-root:has( .{bem_root}__submenu :focus-visible ) > .{bem_root}__link

/* DRAWER — sgs/nav-drawer-menu, {bem_root} = sgs-nav-drawer-menu */
{uid} .{bem_root}__accordion-row:has( .{bem_root}__submenu :focus-visible ) > .{bem_root}__link
```

⛔ **Never key the `:has()` on `.{bem_root}__submenu-wrap`.** That class exists on `sgs/nav-bar-menu`
only; a rule using it silently does nothing for `sgs/nav-drawer-menu`, and the drawer is where
keyboard navigation of a nested menu is most common.

**Four binding implementation notes:**

1. **"Panel is open" needs no extra condition.** In the bar a closed panel is `display:none`, so
   nothing inside it can be hovered or focused. In the drawer the `<ul>` lives inside a closed
   `<details>`, which the browser hides for the same effect. Openness is implied by construction in
   both forks.
2. **Route each `:hover` variant through `sgs_hover_guarded_rule()`, not `sgs_hover_state_rules()`.**
   The `:hover` is already inside the built selector, and `sgs_hover_state_rules()` would append a
   second one. Emit each `:focus-visible` variant separately and **unguarded**, per the helper
   file's own contract.
3. **All four rules out-rank the plain hover rule, and that is harmless because the declarations
   are identical.** The plain `{link}:hover` is `(0,3,0)`; each mouse rule is `(0,4,0)` (three
   classes plus `:hover`) and each keyboard rule is `(0,5,0)` (three classes plus `:has()`, which
   takes the specificity of its most specific argument — `.{bem_root}__submenu :focus-visible`
   = `(0,2,0)`). ⛔ **This must never be used to smuggle in different declarations** — the whole
   point is that the parent keeps the *same* hover look.
4. **The declarations are literally the Hover-state declarations, produced by the same emitter
   call** — not a hand-copied duplicate. A copy is how the two drift. They cover the plain text
   colour and the `swap` border colour, plus the item background on `::before`; a text Sweep and a
   border Sweep are deliberately excluded (a Sweep's hover is an animated band or gradient, not a
   plain colour swap, and copying `border-color` onto the parent would reintroduce a solid bottom
   border under the transparent-border Sweep band). On the bar, the mouse rule also covers the
   caret glyph.

⚠ **`:has()` browser floor, documented rather than silently omitted.** Safari 15.4 (March 2022),
Chrome/Edge 105 (August 2022), **Firefox 121 (December 2023)** — Baseline "widely available" from
2023-12-19. Firefox is the binding constraint. On an older Firefox the *keyboard* half silently
does not apply; the *mouse* half, which needs no `:has()`, works everywhere. That is a graceful,
bounded degradation of a progressive enhancement, and it is why the two halves are split rather
than written as one `:has()` rule covering both.

### FR-41-14 — The Highlight treatment suppresses per-item Hover/Current BACKGROUND

The item background row's `Highlight` treatment (FR-41-25) renders the shared indicator element
(`.sgs-nav-bar-menu__indicator` / `.sgs-nav-drawer-menu__indicator`) — one shared background shape
that slides between items — precisely so per-item backgrounds do **not** flash. Per-item
`itemBgHover` / `itemBgCurrent` would paint a second background behind the same item at the same
moment. Two mechanisms, one surface. There is no separate indicator attribute or panel: `Highlight`
IS the third option on the item Background row's own hover-treatment selector (FR-41-23), and the
pill reads the Item background row's OWN Hover swatch — `itemBgHover` / `itemBgHoverGradient` — the
same swatch `Swap` and `Sweep` read, per the colour-reuse rule in §0. See FR-41-25 for the fold and
§9.6 for the placement.

**A mechanical UI conditional, not a new toggle for the operator to reason about.**

When `itemBgHoverTreatment === 'highlight'`:

- The **Background** row in the Colour panel's Menu grouping renders with its **Current** state
  **OMITTED**. The row itself, its Normal state and its **Hover** state always render — the Hover
  swatch is what the pill is PAINTED IN (§0's colour-reuse rule), so omitting it would leave the
  operator no way to colour the thing they just switched on.
- The emitter (`plugins/sgs-blocks/includes/nav-menu-css.php::sgs_nav_shared_item_state_css`)
  **skips the per-ITEM hover and current background declarations** — the pill is the one background
  shape for both non-resting states. It reads `itemBgHover` / `itemBgHoverGradient` as its own fill
  instead.
- Text colours (all three states), the border (all three states), the radius and the menu button are
  **unaffected**.
- The stored `itemBgCurrent` value is **not cleared**. Switching the treatment back to `swap`
  restores it intact.

⛔ **Per-STATE, never per-ROW.** Dropping the whole row would also remove the Normal-state
background control (which the pill does not replace) and the Hover swatch (which the pill READS).
The array literal reads:

```js
states: [ normalBg, hoverBg, ...( 'highlight' !== itemBgHoverTreatment ? [ currentBg ] : [] ) ]
```

⛔ **OMIT, never disable.** `SgsColourPanel` runs `rows.filter(Boolean)` and the caller inlines the
condition directly in the array literal — reference implementation
`plugins/sgs-blocks/src/blocks/icon-list/edit.js::Edit`. A greyed-out control a client can find and
click to no effect is the failure this rule exists to prevent.

⚠ **The conditionality stays statically resolvable.** A spread of a conditional literal array is an
`ArrayExpression` whose elements the detector can count in both branches; a `.filter()` on a fixed
array is not (FR-41-2).

**Surfaced where the change happens.** The treatment control carries inline help text in plain
language — e.g. *"Highlight paints one shape that slides between items, using the Hover colour you
picked above. It replaces each item's own current-page background, so that swatch is hidden while
it's selected."* An unexplained disappearance reads as a bug; the control and the consequence are in
the same panel, so there is only one place to say it.

### FR-41-15 — No hardcoded, ungated state/paint rule stands beside an operator control

**The rule.** Every `background` or `border` declaration in these blocks' CSS is either (a) gated on
an operator attribute, (b) an attribute-driven `var()` whose writer exists, or (c) structurally
incapable of the defect below (a reset to `none`/`0`, a `forced-colors` accessibility rule, a
zero-specificity `:where()` default). A hardcoded rule that duplicates or overrides an operator
attribute is a silent override — the failure class `check-hardcoded-render-defaults.js` F3b exists
to catch — and F3b alone does not catch it when the competing rule sits on a selector with no
matching attribute.

⛔ **Why the `background` SHORTHAND is the defect.** The text Sweep (FR-41-26) paints its travelling
gradient into **`background-image`** on the link (or sublink) itself and makes the glyphs
transparent with `-webkit-text-fill-color: transparent`. An ungated `background:` shorthand on a
hover state resets every unset longhand it covers — `background-image` included — to `none`, and its
selector out-ranks the sweep's own base rule. On hover the gradient is erased, the transparent glyph
fill survives, and the only remaining paint is the shorthand's own tint: **legible text becomes
near-invisible on hover.** The failure is silent in both directions — nothing errors, and a
`getComputedStyle( el ).color` check still returns the operator's colour, because the glyph paint is
governed by `-webkit-text-fill-color`, not `color`. Use `background-color:` longhands, never the
shorthand, on any selector a Sweep can paint.

**Standing consequences, each still binding:**

- **The item border is the ONE separator mechanism (FR-41-7).** No second hardcoded item separator
  may sit beside it — on a different element it never competes by specificity, so both paint and
  the operator gets two horizontal lines. Neither the drawer's item-row `border-top` nor its static
  `style.css` twin exists.
- **The current-page state has no hardcoded tint or left rule.** Current colour, weight, background
  and border are the operator's `itemColourCurrent`, `itemFontWeightCurrent` (under FR-41-6's
  never-lighter guard), `itemBgCurrent` / `submenuLinkBgCurrent` and `itemBorderColourCurrent`, and
  the submenu link's Current colour reads `--sgs-nm-submenu-current-colour`, written from
  `submenuColourCurrent`. A custom property with a consumer and no writer is dead-but-firing — it can
  only ever render its own fallback.
- **The drawer's panel override zeroes the bar's panel border only while `submenuBorderWidth` is
  empty**, so an operator's drawer panel border is never silently suppressed
  (`plugins/sgs-blocks/includes/nav-menu-submenu-css.php`).
- **Featured sub-item paint is emitted only when the featured custom properties are actually
  written**, with no hardcoded `primary` fallback and `background-color:` in place of the
  shorthand; there is no featured sub-item hover rule with a hardcoded background.
- **Structural chrome is kept and named so it is not swept up:** the drawer's resting sub-item indent
  (`border-left`, measured against the marker icon's padding), and the drill-down Back row's
  `border-bottom` (`plugins/sgs-blocks/src/blocks/nav-drawer-menu/style.css::.sgs-nav-drawer-menu__drill-back-btn`,
  JS-injected chrome that is not a menu link, so the item border never paints on it). Each returns to
  the census the day the item-border mechanism is extended to that element.
- **Button resets are not paints** — `background:none;border:0` on the mega-trigger and sub-toggle
  buttons. They return to the census the moment a stateful colour row (FR-41-23) targets that
  element, because a `background:none` shorthand would then destroy a Sweep gradient exactly as the
  defect above does. The sub-toggle is the closer case: an icon-colour row with Sweep scoped to it
  puts its reset straight in the census.
- **Two accessibility rules must stay:** the `@supports not (background-color: color-mix(…))` burger
  hover rescue (a legacy-browser fallback, longhand, `(0,1,0)`, beaten by every uid-scoped operator
  rule — FR-41-17a(c)) and the `@media (forced-colors: active)` burger border.
- **The submenu panel's declarations are all attribute-driven, with token fallbacks.**
  `background-color` / `background-image` read `--sgs-nm-submenu-bg` / `--sgs-nm-submenu-bg-gradient`
  (written from `submenuBg` / `submenuBgGradient`, empty-guarded, with the chained
  `surface-alt → surface → #fff` token fallback); `min-width` reads `submenuMinWidth`;
  `border-radius` reads `--sgs-nm-submenu-radius`, written from `submenuBorderRadius` through
  `sgs_corner_object_shorthand()` (the flat corner-object helper, not the side-keyed
  `sgs_box_object_shorthand()`); border width and style read `--sgs-nm-submenu-border-width` /
  `--sgs-nm-submenu-border-style`, with the colour emitted by the shared `sgs_border_states_css()`
  appended after the rule (Normal-only, no `suppress_edges` — FR-41-9); the shadow is
  `filter:drop-shadow()` from `--sgs-nm-submenu-filter` (FR-41-9). The drill-down sub-panel's
  `background: var(--sgs-nm-submenu-bg, inherit)` is structurally load-bearing (it is
  `position:absolute; inset:0` over the top-level list and must be opaque); it is the `background`
  shorthand, so a panel `background-image` would be reset by it — a submenu-panel GRADIENT attribute
  on that selector puts it back in the census.

**Methodology — scoped by defect SHAPE, across BOTH CSS surfaces, statement-aware.** A rule enters
the census when it carries a `background` or `border` declaration that is **not gated on an operator
attribute**, whatever its state (resting, `:hover`, `[aria-current]`), whichever block, and whether it
is a literal concatenation or a helper call (`sgs_hover_guarded_rule()`, `sgs_hover_state_rules()`) —
because a scan that looks only inside literal strings, or only inside a line range, or only for one
line, cannot see a multi-line PHP concatenation whose `background:` sits on a different physical line
from its `$css .=`. The two surfaces are the PHP emitters (`render.php` plus the shared
`plugins/sgs-blocks/includes/nav-menu-*.php`) and each block's own `style.css`, which WordPress
enqueues as an ordinary stylesheet that PHP-side scans cannot reach. Run the scan against every
emitter file in `git ls-files plugins/sgs-blocks/includes | grep nav-menu` plus both blocks'
`render.php` and `style.css` — a scan of `render.php` alone sees almost nothing and reports a clean
tree.

Every hit is then read and classified into one of three buckets, and a dismissed hit is dismissed *in
writing*: **GATED** (wrapped in an `if` on an operator attribute, gate named); **DISMISSED** (ungated
but structurally incapable of the defect — each with the condition that would return it to the
census); **CENSUSED** (a real hardcoded/ungated paint, which is deleted or converted).

⚠ **The scan is statement-aware, not variable-aware.** A declaration built into an intermediate PHP
variable and appended to `$css` in a later, separate statement is outside what a single-statement
join can see. `$sgs_nm_featured_vars` is a live instance; it does not matter today only because its
declarations are custom-property assignments (`--sgs-nm-featured-bg:`), which do not match the
`background:`/`border:` pattern. The next rule built that way with a real property name inside it
would repeat the defect.

**Enforcement is a script, not prose.**
`plugins/sgs-blocks/scripts/check-ungated-paint-rules.py` (FR-41-35) walks both surfaces with a
character-boundary parser and prints this exact residual rather than implying completeness.
`HARD_FAIL_BLOCKS` in that file lists `["sgs/nav-bar-menu", "sgs/nav-drawer-menu"]`, so a new ungated
paint on either block fails the gate. ⛔ Do not read the existence of this FR as enforcement; the
script is the enforcement.

---

## 7a. The universal hover-treatment pairing

### FR-41-23 — Every stateful colour row gets ONE paired hover-treatment selector, not a separate mechanism

**Why one paired selector.** "What happens visually between Normal and Hover on this block" is one
question asked of every property: *"how should this property look when the item is hovered?"* Three
independent mechanisms answering it — the plain Hover-colour swap (every 3-state row), a border-only
animation control (FR-41-8) and a background-only indicator control with its own panel (FR-41-14) —
would make an operator learn three places to look. The hover-treatment selector sits directly under
the Hover swatch of each qualifying row, so the operator meets the control and its consequence in ONE
place.

**The fix — one small reusable pattern, not a new shared component (see FR-41-24 for the
component-vs-block-private call).** Directly beneath the **Hover** swatch of every qualifying
colour row, a `ToggleGroupControl` offers exactly three options:

| Option | Meaning | What renders |
|---|---|---|
| **None** | No visual change on hover for this property | The property does not change between Normal and Hover (the Hover swatch, if any, is ignored for CSS purposes but stays stored so switching treatment back restores it) |
| **Swap** *(default)* | A plain colour change | What a 3-state row renders without a treatment: `sgs_emit_state_colour_css()` / `sgs_border_states_css()` with the Hover colour |
| **Sweep** *(text, border)* / **Highlight** *(background only)* | An animated transition rather than an instant swap | The property-specific animated mechanism named below |

⛔ **`Swap` is the DEFAULT for every row.** An untouched block renders a plain Hover colour swap on
every row; the selector adds choices without changing the default behaviour.

**Which rows get the selector, and what the third option does on each — set by the real DOM/CSS
each mechanism touches, not assumed uniform:**

| Row | Attribute | Third-option name | Third-option mechanism |
|---|---|---|---|
| Item text | `itemColourHoverTreatment` | **Sweep** | The glyph colour-sweep — FR-41-26. ⚠ Offered only when the row passes FR-41-26's Sweep eligibility test |
| Item background | `itemBgHoverTreatment` | **Highlight** | The shared sliding pill across items (FR-41-14/25). Paints in the row's OWN Hover swatch (`itemBgHover`/`itemBgHoverGradient`); there is no separate indicator colour |
| Item border | `itemBorderHoverTreatment` | **Sweep** | The directional band sweep (FR-41-8). Under `sweep`, the Hover and Current border-colour emissions are omitted for the swept edge — the band owns them |
| Submenu link text | `submenuColourHoverTreatment` | **Sweep** | Same glyph sweep as item text, scoped to `.sgs-nav-bar-menu__sublink` / `.sgs-nav-drawer-menu__sublink`. ⚠ Eligibility-gated — the sublink paints its OWN background (`submenuLinkBg*`), so Sweep is omitted whenever ANY of its three state fills or its gradient is set |
| Submenu link background | `submenuLinkBgHoverTreatment` | **None only — no Highlight, no Sweep** | The shared sliding pill is an ITEM-row mechanism (the indicator element slides between top-level items, never between dropdown links); a per-link background sweep-band on a strictly vertical list has no precedent and is out of scope here. The selector still renders (for the row's OWN consistency and because `None`/`Swap` are both meaningful choices) but its enum is `none`/`swap` only — two options, plain `ToggleGroupControl`, no third segment |
| Menu button icon colour | `burgerColourHoverTreatment` | **Sweep** | Same glyph sweep, scoped to `.sgs-nav-bar-menu__burger` (bar-only). ⚠ Eligibility-gated on THREE conditions, all in FR-41-26: `triggerMode` must not be `icon` (a pure-icon SVG has no glyphs for `background-clip:text` to grip), `burgerBg`/`burgerBgGradient`/**`burgerHoverColour`** must be unset (the button paints its own background on the same element, in BOTH states), and `burgerColourGradient` must be unset |
| Menu button background | `burgerBgHoverTreatment` | **None only — no Highlight, no Sweep** | A single button, not a repeated item row — neither the shared pill (needs ≥2 siblings to slide between) nor a horizontal sweep-band (the button is square, not a text baseline) has a meaningful referent. Two options only, same reasoning as the submenu-link-background row above |

⛔ **`Highlight` is genuinely NOT offered outside the item Background row, and that is a real
boundary, not an oversight.** The sliding pill is defined by having more than one sibling row to
slide BETWEEN — nothing else on this block has that shape.

**Rows that get NO hover-treatment selector at all, and why each is a real boundary:**

| Row | Why no selector |
|---|---|
| Nav bar background / text (`navBg*`/`navColour*`) | The bar is one element, not a repeated interactive target — neither a directional sweep nor a between-siblings highlight has a referent on a single static wrapper. Stays a plain 2-state Swap-only row. ⚠ **It is a 2-state row with no `after` node** — see each block's `edit.js` `colourRows`. |
| Item / submenu-link Current-state swatches | Hover-treatment governs the Normal↔Hover TRANSITION specifically (something a pointer moves across). Current is not pointer-driven — FR-41-3's "Current is emitted first, is never guarded" rule already establishes it has no touch/hover lifecycle to animate. The Current swatch stays a plain third colour, unaffected by whichever treatment the Hover row picked. |
| Submenu panel background/border colour (Normal-only, FR-41-9) | No Hover state exists on these rows at all — nothing to pair a treatment control under. |
| Shadow colour only | Single-state row with no Hover swatch of its own (FR-41-9-style Normal-only surface). |

#### ⛔ THE ITEM BACKGROUND ROW PAINTS ALL THREE STATES ON `{link}::before`

**A normative requirement, load-bearing for a claim made elsewhere.**

> **The item Background row's **Normal, Hover AND Current** fills are ALL emitted onto
> `.{uid} .{bem_root}__link::before` — the same layer, the same `z-index: -1`, the same
> `border-radius: inherit`. ⛔ No state's fill is emitted onto `.{bem_root}__link` itself.**
> This holds for the `Swap` treatment (all three states) and for `Highlight` (which paints the
> shared pill and, per FR-41-14, skips the per-item hover/current emission entirely). The `None`
> treatment emits no hover fill at all, so it is trivially conformant.

**Why.** If the Hover fill painted `background-color:` directly on the link element, the item-text
row's "Condition 1 passes always" (FR-41-26) would become false the instant an operator set
`itemBgHover`, and the Sweep they had already chosen would clip their new hover fill to the shape of
the letters — the exact defect class FR-41-26's whole eligibility section exists to prevent. The
emission is in `plugins/sgs-blocks/includes/nav-menu-css.php::sgs_nav_shared_item_state_css`.

⚠ **`{link}::before` is not contested by anything.** It carries the background layer only; the
border-sweep band owns `::after` (FR-41-8), and the text sweep claims no pseudo-element at all
(FR-41-26). Three states on one `::before` is three declarations on three selectors (`::before`,
`:hover::before`, `[aria-current="page"]::before`), not three competing layers.

⚠ **`{link}{position:relative;isolation:isolate;}` is emitted whenever ANY of the three fills is
set, not only the resting one** (the condition is
`'' !== $item_bg_normal_decl || '' !== $item_bg_hover_decl || '' !== $item_bg_current_decl`). An
operator who sets a Hover fill and no Normal fill still gets a `::before` with a positioned
ancestor and a stacking context. This is the same shape as FR-41-8 mechanism item 1's
`position:relative` requirement, and the duplication when both fire is harmless (identical
declarations, same selector).

**Cited by:** FR-41-26's eligibility table, item-text row, condition 1.

⛔ **Do NOT smuggle in different declarations via the treatment selector — it must select AMONG
the same three fixed options everywhere it appears, never a bespoke per-row enum invented ad
hoc**, except for the two explicit 2-option rows named above (which drop the unavailable third
option outright rather than rendering it disabled — the "omit, don't disable" rule, same as
FR-41-14's own reasoning).

### FR-41-24 — Component shape: block-private, not a new shared component

**A search of the whole plugin tree finds no existing precedent for this exact pairing.**
`git grep -n -i "hover-treatment\|hoverTreatment" -- plugins/sgs-blocks/src` returns hits only for:
(a) these blocks' own attributes, (b) `business-info`'s one real sweep implementation (the precedent
FR-41-26 copies), and (c) unrelated GSAP motion-path/webgl "sweep" naming with no connection to
colour state. **No other block in the framework offers a "hover treatment" sub-control beneath a
colour row.**

**Decision: block-private, not a new export from `plugins/sgs-blocks/src/components/`.** Building a
generic `<HoverTreatmentControl>` shared component before a second adopter exists would be designing
an abstraction from a sample size of one — the same trap FR-41-2 avoids. The control is a plain
`ToggleGroupControl` + `ToggleGroupControlOption` pair (imported from `primitives` by each block's
`edit.js`), rendered directly beneath its own row's control.

**How it mounts.** `SgsColourPanel` needs a post-control slot to render a control "inline beneath
the `states` array"; FR-41-16's additive **`after` row-descriptor key** is that slot (see that FR for
the full contract). The selectors are small block-private components, split along the shared/bar
line of the attributes they drive: `ItemTextTreatment`, `ItemBgTreatment`, `ItemBorderTreatment`,
`SubmenuTextTreatment`, `SubmenuLinkBgTreatment` (both blocks) live at
`plugins/sgs-blocks/src/shared/nav-menu-panels/ColourRowExtras.js`; `BurgerIconTreatment`,
`BurgerBgTreatment` (bar-only — the burger does not exist in the drawer) live at
`plugins/sgs-blocks/src/blocks/nav-bar-menu/BarColourRowExtras.js`. Each is passed as its row's
`after` node from its own block's `edit.js` `colourRows` array, and each reads its own row's
attribute names directly rather than through an abstraction layer; ⛔ none of them is exported from
`plugins/sgs-blocks/src/components/`, and none may be until a SECOND block asks for the pairing
(§12).

**A real, deliberately-not-taken opportunity (§12):** if a SECOND block wants this exact pairing,
promoting it to a shared `plugins/sgs-blocks/src/components/primitives` export at that point is the
correct call — matching FR-41-21's "named as a real opportunity, deliberately not taken here". Do
not build the shared version speculatively.

**Storage.** One small enum attribute per applicable row (see the table in FR-41-23 for the full
name→enum list), each `"type": "string"`, PHP-validated with **no JSON `enum`** — the same reasoning
FR-41-8/FR-41-10 establish for every other small enum on these blocks (an out-of-enum stored value
silently coerces to the block.json default with no error, which bites hardest via a programmatic
writer). Default `"swap"` for every row, including the 2-option rows (`submenuLinkBgHoverTreatment`,
`burgerBgHoverTreatment`).

### FR-41-25 — The Highlight treatment IS the sliding pill

`Highlight` on the item Background row's treatment selector is the shared sliding pill; there is no
separate indicator attribute and no standalone Indicator panel. FR-41-14's suppression mechanism
(per-STATE omission on the item Background row while the shared pill is active; stored values
preserved, not cleared; the emitter skips the per-item hover/current fills) applies under it.

- **Trigger:** `'highlight' === itemBgHoverTreatment`.
- ⛔ **There is no `indicatorColour` / `indicatorColourGradient` attribute.** A separate pill colour
  pair would be the one row on these blocks that breaks the colour-reuse rule in §0: every other
  treatment reuses its row's existing Hover swatch. **Highlight paints in `itemBgHover` /
  `itemBgHoverGradient`** — the same swatch `Swap` reads and, on the text row, the same swatch
  `Sweep` reads. One picker, one property, three ways of applying it. An operator who wants the pill
  in a specific colour sets the Hover swatch to that colour.
- **Help text lives with the mechanism:** the item Background row's treatment control carries the
  plain-language explanation — *"Highlight paints one shape that slides between items, using the
  Hover colour you picked above. It replaces each item's own current-page background, so that swatch
  is hidden while it's selected."*

**Where the conditional-row pattern is needed, write it as a spread of a ternary — never a spread of
a boolean-`&&`.** ⛔ `...( cond && { key: 'x', … } )` is invalid JavaScript: when `cond` is falsy the
spread target is `false`, and spreading a primitive into an ARRAY literal throws (`false is not
iterable`). The correct form is the one FR-41-14 uses, and it is also the form the static detector can
resolve in both branches (FR-41-2):

```js
rows={ [
  normalRow,
  itemBgRow,
  ...( showMarkerColour ? [ markerColourRow ] : [] ),
] }
```

(A whole ROW may also be omitted with `cond && row`, because `SgsColourPanel` runs
`rows.filter(Boolean)`; the spread-of-ternary form is for omitting a STATE inside a row.)

### FR-41-26 — The Sweep treatment on TEXT: the shipped precedent, adopted directly

**The technique is a live, shipped one.** `sgs/business-info`'s attribution/credit-link hover effect
is exactly a glyph colour sweep — read in full from
`plugins/sgs-blocks/src/blocks/business-info/style.css::.sgs-business-attribution .sgs-business-info__link`
and the `--sgs-bi-link-hover-text` / `--sgs-bi-link-hover-bg` custom-property emission in
`plugins/sgs-blocks/src/blocks/business-info/render.php`. The rule carries the full
`background-clip: text` gradient sweep alongside an underline-growth accessory; this spec adopts the
sweep, not the accessory.

**The mechanism** (emitted by
`plugins/sgs-blocks/includes/nav-menu-treatments.php::sgs_nav_shared_text_sweep_css`):

```css
{link} {
  position: relative;
  color: <normal colour, or inherit>;
  background-image: linear-gradient( to right, <HOVER colour> 50%, <NORMAL colour, or currentColor> 50% );
  background-size: 200% 100%;
  background-position: 100% 0;
  background-repeat: no-repeat;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  transition: background-position 300ms ease;
}
{link}:hover, {link}:focus-visible { background-position: 0 0; }
@media (prefers-reduced-motion: reduce) { {link} { transition: none; } }
@media (forced-colors: active), print {
  {link} { background-image: none; -webkit-text-fill-color: currentColor; }
}
/* MANDATORY — see below. Emitted by sgs_text_colour_gradient_fallback_rule( $link_sel, $sweep ). */
@supports not ((background-clip: text) or (-webkit-background-clip: text)) {
  {link}        { background-image: none; -webkit-text-fill-color: currentColor; color: <NORMAL>; }
  {link}:hover,
  {link}:focus-visible                                                         { color: <HOVER>; }
}
```

⛔ **The fallback colour is the NORMAL (resting) colour, and the HOVER colour arrives via its own
separate rule inside the same `@supports` block. It is never "HOVER or NORMAL".** On a browser
without `background-clip: text` the base rule is what paints the element at rest, so seeding it with
the Hover value renders the menu **permanently hover-coloured** — a state the visitor can never
leave, on exactly the browsers least able to cope with it. Two rules, resting and hover, is the only
shape that degrades to the plain Swap behaviour rather than to a stuck state.

⚠ **The hover half of the fallback routes through `sgs_hover_state_rules()`**, per FR-41-3 rule 1 — a
bare `{link}:hover` here would be an unguarded hover rule, and `hover-guard/check.js` (§11 G2) scans
the PHP emitters as well as the stylesheets.

⛔ **The `@supports not ((background-clip:text))` fallback is MANDATORY and is not optional
belt-and-braces.** `plugins/sgs-blocks/CLAUDE.md`'s precedent registry marks it required for EVERY
`background-clip:text` paint in this codebase, for one reason: `-webkit-text-fill-color:transparent`
applies on a browser that does not support the clip, so the glyphs render transparent over nothing
and **the text is invisible** — a total content loss, not a degraded effect. Emit it by calling the
existing helper `plugins/sgs-blocks/includes/helpers-tokens.php::sgs_text_colour_gradient_fallback_rule`.
**Do not hand-roll the rule** — the helper is a no-op for a flat colour and emits the correct shape
for a gradient, which is exactly the branch this sweep needs. It sits alongside, not instead of, the
`forced-colors`/`print` rescues above: those cover a supporting browser in a special mode; this
covers a browser that never supported the mechanism at all.

**Why this is safe on the item link without the `textSharesElementWithBackground` workaround
recorded in `plugins/sgs-blocks/CLAUDE.md`'s precedent registry.** That precondition exists because
`background-clip: text` clips the element's WHOLE background-painting area to the glyph shapes — a
problem only when the SAME selector also paints a real background. The item link
(`.{bem_root}__link`) carries **no** background paint of its own: the item background paints on
`{link}::before` (FR-41-23), which frees `::after` for the border-sweep band. The text sweep is
therefore adoptable directly, with no conflict with the item Background row's own Swap/Highlight
treatment.

⛔ **Text-sweep uses ZERO pseudo-elements — it is colour-only, unlike the border-sweep's `::after`
band.** Business-info's underline-growth accessory (its `::after` scaleX rule) is NOT copied here: the
item border is the one underline/divider mechanism (FR-41-7), and duplicating an underline accessory
onto the text-sweep would recreate the "two mechanisms answering one question" problem. Text Sweep =
colour travel only. An operator wanting an animated line as well sets the Border row's own Sweep
treatment (FR-41-8/FR-41-23) — the two do not collide, because text-sweep claims no pseudo-element and
the border-sweep's band owns `::after` alone. (The text sweep's direction is fixed left to right; the
angle-driven primitive of FR-41-38 governs the border and separator bands.)

#### SWEEP ELIGIBILITY — one predicate, applied to every text/icon row

The mechanism above is safe on the item link because of a precondition that holds for that element
and does not hold for the others. Rather than one ad-hoc gate per row, this is ONE rule the row
builder evaluates per row:

> **`Sweep` is offered on a text/icon colour row only when ALL of the following are true:**
>
> 1. **The element paints no background of its own — from ANY source, attribute-driven OR
>    static/hardcoded CSS, in ANY state.** `background-clip: text` clips the element's WHOLE
>    background-painting area to the glyph shapes, so any real background on the same selector is
>    destroyed; and conversely a `background` SHORTHAND on that selector resets the sweep's own
>    `background-image` to `none`, leaving transparent glyphs over nothing. This is the
>    `textSharesElementWithBackground` precondition recorded in `plugins/sgs-blocks/CLAUDE.md`'s
>    precedent registry.
>
>    ⛔ **"Attribute-driven" is not the whole question.** The condition is about what the RENDERED
>    element paints, not about which attributes are set. A hardcoded rule counts, a rule emitted
>    through a helper counts, a rule emitted only inside the drawer counts, and a `:hover`-state rule
>    counts as much as a resting one (FR-41-15's ungated `background:` on the drawer link's `:hover`
>    is exactly that shape, and is why FR-41-15 forbids it).
>
>    ⛔ **"In ANY state" means the attribute list carries EVERY state's background.** Every state's
>    background — flat AND gradient — is a blocking input. A real hover-state background on the same
>    element is one: `burgerHoverColour` emits
>    `sgs_hover_state_rules( "{$uid_sel} .sgs-nav-bar-menu__burger", 'background-color:' … )`, a real
>    background on the SAME element the burger sweep would clip; and the submenu-link row is a
>    3-state fill family (FR-41-9), so `submenuLinkBgHover` and `submenuLinkBgCurrent` block the
>    sublink sweep exactly as `submenuLinkBg` does. ⚠ `burgerHoverColour` is the `background-color`
>    LONGHAND, so it does not reset the sweep's `background-image`; it fails condition 1 for the OTHER
>    half of the clip problem — `background-clip: text` clips the element's whole background-painting
>    area, so the operator's hover fill would render as coloured letter shapes instead of a filled
>    button. Both halves disqualify.
>
>    ⚠ **One narrow, named exception this condition does NOT cover.**
>    `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css` carries a static
>    `@supports not (background-color: color-mix(in srgb, currentColor 8%, transparent)) {
>    .sgs-nav-bar-menu__burger:hover, .sgs-nav-bar-menu__burger:focus-visible { background-color:
>    rgba(128,128,128,0.12); } }` fallback. That IS a background on the swept element in a hover
>    state, so on a browser supporting `background-clip: text` but NOT `color-mix` it would be
>    clipped to the glyph shapes. It is deliberately **not** added to the predicate: it is a longhand
>    (the sweep's `background-image` survives, so the failure is a cosmetic clip, not invisible text),
>    and **no attribute controls it**, so there is nothing for a per-row predicate to read — gating
>    on it would withdraw Sweep from the menu button on every browser, permanently, to serve a
>    shrinking intersection. ⛔ Do NOT "fix" it by deleting the fallback: it is the non-`color-mix`
>    rescue for the button's ordinary hover state and has nothing to do with Sweep. Carried as a
>    residual at **FR-41-17a(c)**.
> 2. **The row carries no Normal-state gradient.** Sweep and the row's own gradient both write
>    `background-image` on the identical selector. Whichever loses is invisible; and if the gradient
>    wins, the resting text renders with `-webkit-text-fill-color: transparent` over a background the
>    sweep never painted — **invisible resting text**.
> 3. **The element actually has glyphs.** `background-clip: text` needs text to grip.
>
> When any condition fails, the `Sweep` segment is **OMITTED** from that row's selector and the row
> renders as a two-option `None`/`Swap` control — "omit, don't disable", the same discipline as every
> other conditional on this panel. A greyed-out `Sweep` a client can find and click to no effect is
> the failure this rule exists to prevent.

**Applied, per row — this is the whole set for the text/icon rows, nothing is left implicit.**
Condition 1's attribute list covers EVERY state, not just resting.

| Row | Condition 1 — own background, **all states** | Condition 2 (own gradient) | Condition 3 (glyphs) | Net |
|---|---|---|---|---|
| **Item text** `.{bem_root}__link` | ✅ passes always — **all three** of the item background row's fills paint on `{link}::before`, never on the element itself (FR-41-23's three-state `::before` rule). ⚠ The `::before` guarantee is what this ✅ rests on — it is NOT a property of the element by nature, and if a change moves any state's fill back onto the link, this row loses its always-pass | gated on `itemColourGradient` being empty | ✅ always | Sweep offered unless `itemColourGradient` is set |
| **Submenu link text** `.{bem_root}__sublink` | gated on **`submenuLinkBg` AND `submenuLinkBgHover` AND `submenuLinkBgCurrent` AND `submenuLinkBgGradient`** all being empty — this element paints its background DIRECTLY, it has no `::before` indirection, and it is a 3-state fill family (FR-41-9), so a Hover or Current fill blocks the sweep exactly as the resting one does. ⚠ The predicate reads the registered defaults under the stored attributes, and `submenuLinkBg` / `submenuLinkBgHover` / `submenuLinkBgCurrent` default to tokens (FR-41-36), so Sweep is not offered here until an operator clears those fills | gated on `submenuColourGradient` being empty | ✅ always | Sweep offered only on a sublink with no background in ANY state and no text gradient |
| **Menu button icon** `.sgs-nav-bar-menu__burger` (bar-only) | gated on **`burgerBg` AND `burgerBgGradient` AND `burgerHoverColour`** all being empty — the button paints its own background, and `burgerHoverColour` is the HOVER background on that same element (§8.1's disambiguation table) | gated on `burgerColourGradient` being empty | gated on `triggerMode !== 'icon'` | Sweep offered only on a text-bearing button with no background in either state and no icon gradient |
| **Item border** (band on `::after`) | no background or gradient condition — the band is a separate element paint, not a `background-clip:text` sweep | — | `glyphGuard` on `itemBorderStyle`: Sweep not offered for `dashed` / `dotted` / `double` / `groove` / `ridge` / `inset` / `outset` (a gradient band can only paint solid) | Sweep offered for a solid border style |
| **Item separator** (bar-only, band on `::before`) | as the border row | — | `glyphGuard` on `itemSeparatorStyle`: Sweep not offered for `dashed` / `dotted` | Sweep offered for a solid separator style |

⚠ **The FEATURED sub-item is a fourth blocking background on the sublink row.**
`.{bem_root}__subitem--featured .{bem_root}__sublink` paints a background directly on
`.{bem_root}__sublink` — driven by `featuredBg` / `featuredBgGradient`, republished to the submenu as
`--sgs-nm-featured-bg`, and emitted only when that property is actually written (FR-41-15). A nav with
a featured pill configured therefore still paints a background on a swept element.

**Resolution — the narrow fix, not the blunt one.** The predicate is per-ROW, and a featured sub-item
is a per-ITEM distinction, so adding `featuredBg` to condition 1 would withdraw Sweep from **every**
sub-item whenever a featured pill exists anywhere — punishing the ordinary rows for the featured one.
The emitter instead **scopes the sublink sweep selector to exclude featured sub-items**
(`{uid} .{bem_root}__subitem:not(.{bem_root}__subitem--featured) .{bem_root}__sublink`), because the
featured item owns its own treatment. With that scoping in place `featuredBg` is **not** in the row's
condition-1 list. ⛔ If the emitter does NOT scope the selector, then `featuredBg` AND
`featuredBgGradient` MUST be added to condition 1 and Sweep removed from the whole row — those are
the only two compliant outcomes, and shipping neither means a featured sub-item renders transparent
glyphs over a clipped pill.

⚠ **`burgerColourHover` is NOT in that list and must not be added to it.** It is the icon/text COLOUR
on hover, not a background — the two names are anagram-close and §8.1 exists to keep them apart.
Adding it would withdraw Sweep from precisely the row it is designed for: a button whose hover colour
is the colour the sweep travels TO.

⛔ **Condition 1 is NOT satisfiable by moving those backgrounds onto `::before` too.** Moving a working
background layer to buy an optional hover effect is churn on a shipped mechanism, and the burger's
`::before` would collide with the FR-41-31 magnet's own transform surface. The answer is the gate.

#### THE PREDICATE IS EVALUATED TWICE — IN THE UI **AND** IN THE EMITTER

⛔ **The eligibility predicate above is not a UI rule. It is the EMISSION rule, and the inspector
merely reflects it.** The emitter evaluates the IDENTICAL predicate before honouring any stored
`'sweep'` value, and **when the predicate is false it falls back to `'swap'` regardless of what is in
the database.** Sweep CSS — the `background-image` gradient, `background-clip: text`,
`-webkit-text-fill-color: transparent`, the `@supports` fallback, the `forced-colors`/`print`
rescues — is **NEVER emitted while the predicate is false**, no matter what the attribute says.

**Why a UI-only gate is not a gate at all.** The predicate's inputs are OTHER attributes, and the
operator can change those AFTER choosing Sweep. Three reachable paths, all through legal single-step
edits, none of which touches the treatment attribute itself:

| Step 1 (legal at the time) | Step 2 | What a UI-only gate produces |
|---|---|---|
| `submenuColourHoverTreatment = 'sweep'` on an unstyled sublink | operator sets `submenuLinkBg` | The `Sweep` segment vanishes from the row, the stored `'sweep'` stays, and the emitter keeps emitting `background-clip: text` — **the operator's brand-new background is clipped down to the shape of the letters.** They set a background and got coloured lettering on nothing. |
| `burgerColourHoverTreatment = 'sweep'` in `icon-and-text` mode | operator sets `burgerBg` | Same clip, on the menu button. |
| `burgerColourHoverTreatment = 'sweep'` in `icon-and-text` mode | operator switches `triggerMode` back to `'icon'` | No glyphs left to grip, so `background-clip: text` clips to nothing and `-webkit-text-fill-color: transparent` still applies — **the icon button renders empty.** |

⚠ **This is the same class of failure as a stored value surviving a deleted attribute: storage
outlives the control that wrote it.** Clearing the stored value instead would be the wrong fix — it
silently discards an operator choice that becomes valid again the moment they clear the background,
which is the opposite of the "stored values are not cleared" discipline FR-41-14 and FR-41-23
establish for every other treatment. **The stored `'sweep'` is kept; the EMISSION is what is gated.**
Switching the blocking attribute back off restores the swept render with nothing lost, exactly as
switching a treatment back to `Swap` does.

#### ONE DECLARED SOURCE, TWO EVALUATORS — the predicate is DATA, not a function

The two evaluators are the emitter (PHP, server) and `edit.js` (React, browser) — **the inspector
cannot call a PHP function**, so "write the predicate once in PHP" has no compliant path and ends up
as a second copy in the place the rule was trying to prevent. The requirement holds only in this
shape:

> **ONE DECLARATIVE SOURCE, READ BY BOTH SURFACES. Neither surface re-derives the rule; each reads the
> same declared rows and applies them mechanically.**

**Where it lives: both blocks declare it independently, in their own `block.json`:
`plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::supports.sgs.sweepEligibility` and
`plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json::supports.sgs.sweepEligibility`.** This is
the framework's established shape for a fact both halves of a block need. PHP already reads
`supports.sgs.*` in this codebase
(`plugins/sgs-blocks/includes/helpers-container.php::sgs_block_wants_intrinsic_columns` reads
`$type->supports['sgs']['intrinsicColumns']`; `plugins/sgs-blocks/includes/hover-effects.php` reads
`$type->supports['sgs']`; `plugins/sgs-blocks/includes/image-controls.php` reads
`$supports['sgs']['imageControls']`), and each block's own JS half imports its own manifest
(`plugins/sgs-blocks/src/blocks/nav-bar-menu/index.js` and
`plugins/sgs-blocks/src/blocks/nav-drawer-menu/index.js` each `import metadata from './block.json'`, so
both are proven to bundle). The PHP reader,
`plugins/sgs-blocks/includes/nav-menu-treatments.php::sgs_nav_shared_resolved_treatments`, takes an
explicit `$block_name` parameter — each block's own `render.php` passes its own slug
(`sgs_nav_shared_resolved_treatments( $attributes, 'sgs/nav-bar-menu' )` /
`'sgs/nav-drawer-menu'`), so the one-declarative-source contract holds per block. ⛔ **Do NOT invent a
separate JSON file, a PHP constant, or a JS constant** — any of those is a second artefact to keep in
sync, which is the failure this section exists to end.

**The declared shape — three keys per row, and nothing else. Both surfaces read exactly these.** The
bar declares five rows (`itemColourHoverTreatment`, `submenuColourHoverTreatment`,
`burgerColourHoverTreatment`, `itemBorderHoverTreatment`, `itemSeparatorHoverTreatment`); the drawer
declares three (item text, submenu text, item border). The first three:

```json
"sweepEligibility": {
  "itemColourHoverTreatment": {
    "blockingBackgroundAttrs": [],
    "blockingGradientAttrs":  [ "itemColourGradient" ],
    "glyphGuard":             null
  },
  "submenuColourHoverTreatment": {
    "blockingBackgroundAttrs": [ "submenuLinkBg", "submenuLinkBgHover",
                                 "submenuLinkBgCurrent", "submenuLinkBgGradient" ],
    "blockingGradientAttrs":  [ "submenuColourGradient" ],
    "glyphGuard":             null
  },
  "burgerColourHoverTreatment": {
    "blockingBackgroundAttrs": [ "burgerBg", "burgerBgGradient", "burgerHoverColour" ],
    "blockingGradientAttrs":  [ "burgerColourGradient" ],
    "glyphGuard":             { "attr": "triggerMode", "disallowedValues": [ "icon" ] }
  }
}
```

| Key | Condition it encodes | How BOTH surfaces evaluate it |
|---|---|---|
| `blockingBackgroundAttrs` | Condition 1 | eligible only when **every** named attribute is empty |
| `blockingGradientAttrs` | Condition 2 | eligible only when **every** named attribute is empty |
| `glyphGuard` | Condition 3 | `null` = always passes. Otherwise ineligible when `attributes[attr]` is in `disallowedValues` |

⛔ **`itemColourHoverTreatment`'s empty `blockingBackgroundAttrs` array is a DECLARED FACT, not an
omission — and it is only true because of FR-41-23's three-state `::before` rule.** Write `[]`
explicitly; a missing key and an empty array must not be distinguishable by accident. ⚠ If any
item-background fill ever moves off `::before`, this array gains that attribute in the SAME change.

**What each surface does with it, stated so neither is left to interpret:**

- **`edit.js`** reads the row's entry from the imported manifest and OMITS the `Sweep` segment when the
  predicate is false ("omit, never disable"). It writes no logic of its own beyond the three
  mechanical checks in the table above.
- **The emitter** reads the same entry via
  `WP_Block_Type_Registry::get_instance()->get_registered( $block_name )->supports['sgs']['sweepEligibility']`
  (`$block_name` being `'sgs/nav-bar-menu'` or `'sgs/nav-drawer-menu'`, per the caller) and, when the
  predicate is false, resolves the treatment to `'swap'` **regardless of the stored value** —
  emitting no `background-image` sweep, no `background-clip`, no `-webkit-text-fill-color`, no
  `@supports` fallback and no `forced-colors`/`print` rescue. The stored `'sweep'` is NOT cleared. It
  merges the registered attribute defaults underneath the stored attributes before evaluating, so a
  blocking input absent from the stored set (a programmatic writer, a pattern) is read at its declared
  default — `triggerMode`'s default IS `'icon'`, the value its own `glyphGuard` disallows.

⛔ **Both surfaces read; neither re-derives.** A builder tempted to inline "and also check X" on one
side has recreated the two-copies problem in a form the gate below is specifically written to catch.
If a new blocking input is discovered, it is added to the DECLARED ROW — one edit, both surfaces,
automatically.

⚠ **The resolved treatment, not the stored one, is what every downstream rule keys on** — see the
sweep-plus-decoration rule below, which is the first consumer of that distinction.

**Acceptance: §11 G14 assertions (f) and (g).** (f) proves the emitter re-checks at all; **(g) is the
direct proof of THIS section** — it asserts the two surfaces AGREE on a stored value that straddles
the boundary, which is the only failure a single-surface check cannot see.

#### WHAT THE FALLBACK TO `'swap'` DOES WHEN THERE IS NO HOVER COLOUR TO SWAP TO

The fallback resolves the treatment to `'swap'`; `'swap'` emits the row's Hover swatch. If that swatch
is **empty** — entirely legal, and reachable in one step — there is nothing to emit.

> **Behaviour: nothing is emitted for that property's hover state, so the element keeps whatever
> Normal-state colour already applies. There is genuinely no visual change on hover for that
> property.** ⛔ The emitter does NOT substitute a colour of its own, does not fall back to a token
> default, and does not re-derive one from the background. An invented hover colour would be a
> hardcoded render default — the `check-hardcoded-render-defaults.js` F3b failure class — and it
> would be un-clearable by the operator, since clearing the swatch is exactly what produced it.

⚠ **This is an honest gap, and a REAL one:** an operator who picked Sweep (a treatment with no second
colour to set, §0's colour-reuse rule) and never filled the Hover swatch can lose hover feedback on
that property entirely the moment a blocking attribute is set. It is narrower than it sounds — the
item border's own Hover treatment is the block's primary non-colour signal (FR-41-6) and is
unaffected by this row's fallback — but on a border-less menu it can mean no hover feedback at all on
that element. **Recorded as an accepted residual at FR-41-17a(d)**: named, not papered over, and
closed by one swatch entry.

#### SWEEP + A HOVER TEXT-DECORATION: THE UNDERLINE MUST TRAVEL TOO

⚠ **`text-decoration-color` is NOT governed by `-webkit-text-fill-color`, so the two mechanisms
compose wrongly by default.** When an operator sets `itemTextDecorationHover` (or its `submenu`
sibling, FR-41-6 / FR-41-21) on a row whose treatment is `sweep`, the glyphs travel to the Hover
colour while the underline stays painted in the RESTING colour — the letters change and the line
under them does not, which reads as a rendering fault rather than a design.

⛔ **This rule keys on the RESOLVED treatment — the value AFTER the eligibility re-check — never on the
raw stored attribute.** The stored value can be `'sweep'` while the resolved value is `'swap'`, and on
a resolved `'swap'` the glyphs do NOT travel: they change colour instantly via the ordinary hover
rule, which `text-decoration-color` already follows for free through `currentColor`. Keying on the
stored value would fire this rule on a row that never swept, forcing a decoration colour nothing asked
for and overriding an inheritance that was already correct. **Read the resolved treatment into a
variable once, immediately after the eligibility evaluation, and have every downstream rule read THAT
variable** — the stored attribute is not consulted again after resolution.

> **When the RESOLVED `…HoverTreatment` is `'sweep'` AND that prefix's hover text-decoration resolves
> to a permitted, non-`none` value, the SAME block-private emitter (FR-41-21) also sets
> `text-decoration-color` to the HOVER colour** — the row's own Hover swatch, per §0's colour-reuse
> rule, never a second colour attribute. It is emitted in the same `sgs_hover_state_rules()` call as
> the decoration itself, so the line and the glyphs arrive together.

⚠ **No transition is added to `text-decoration-color`.** The sweep's travel is a `background-position`
transition on a gradient; a decoration colour cannot be swept the same way, so it swaps at the start of
the travel. That is the honest composition — a swept word with a solidly Hover-coloured line beneath
it — and it is still strictly better than a line stuck at the resting colour. Do not add a competing
`transition` on the decoration in an attempt to sync them; two transitions at different rates on one
element is the "looked broken" failure `sgs/business-info` hit and fixed.

⚠ **This composition only arises on the item-text and submenu-link-text rows.** The menu-button icon
row has no typography trio (`TypographyControls` is not mounted for the burger), and the border row
sweeps a band, not glyphs. **Gated: §11 G14 assertion (e).**

⚠ **Condition 2 also protects `itemSmartContrast` (FR-41-5).** Sweep sets
`-webkit-text-fill-color: transparent`, which overrides whatever foreground
`sgs_wcag_preferred_text_colour_for_bg()` resolves — so on a swept row the WCAG toggle silently does
nothing. Because Sweep is only reachable when the element paints no background of its own, and the
toggle only acts when a Hover or Current BACKGROUND is set, the two are mutually exclusive by
construction on the item text row. **State it in the toggle's help text anyway** — a client who sets an
item background and then finds Sweep gone from the text row deserves the one-line reason.

### FR-41-27 — `itemSmartContrast` sits in the General-tab Accessibility panel

The toggle, its default and its two-case contrast resolution are FR-41-5's. Its inspector home is
**§9.5 "Accessibility"**, alongside `navLabel` — both are "does the menu behave safely for every
visitor" controls, and grouping them is what General-tab Accessibility is for. See §9 for the layout.

### FR-41-28 — One border/divider mechanism for BOTH blocks

Every stateful control (border included) targets the item link (`.{bem_root}__link`, FR-41-1), and the
bar and the drawer are **two separate blocks** (`sgs/nav-bar-menu` and `sgs/nav-drawer-menu`), each
with its own uid and its own inspector, **rendering the identical
`itemBorderWidth`/`itemBorderColour*`/`itemBorderHoverTreatment` mechanism onto the same class
name**. There is no "bar-specific" or "drawer-specific" border code path — the single
`SgsBorderControl` mount and the single `sgs_border_states_css()` call apply uniformly to both, and an
operator styling the drawer's own menu instance gets the same border/hover-treatment controls as the
bar's.

### FR-41-29 — "Current-page weight" as a block-private field inside the Typography panel

`SGS_FONT_WEIGHT_OPTIONS`-fed `SelectControl` writing `itemFontWeightCurrent`, **not** built into the
shared `TypographyControls` helper (which has no Current branch at all — not a control, not an
attribute key, not a PHP read — and per FR-41-21's standing "do NOT extend the shared helper" ruling,
correctly so). ⚠ The Hover trio IS adopted from that component, which does not weaken this: the
component already RENDERS the hover controls and `typographyAttrKeys()` already names their keys, so
adopting them costs a block-private PHP emitter and nothing else. A Current trio has no control and no
key to adopt, so it would mean changing the shared component itself — a categorically bigger ask. The
field sits at the bottom of the Typography panel's **Menu** target (FR-41-22), directly under that
target's native controls.

⛔ **It is the ONLY Current-state typography field.** `itemTextDecorationCurrent` is not declared
(FR-41-6 consequence 2) — Current gets ONE signal, and that signal is weight. A single `SelectControl`,
not a pair. ⚠ It sits beneath the shared component's own HOVER trio row (§9.10) — that row is
`TypographyControls`' output for the hover state and has no Current member, which is why this field
stays block-private rather than being folded into it.

### FR-41-30 — Icon Picker drives two icons: the menu button and the sublink marker

`plugins/sgs-blocks/src/components/IconPicker/IconPicker.js`'s own docblock confirms four libraries
(Lucide · Emoji · WordPress · Dashicons), search, and category browsing;
`plugins/sgs-blocks/src/blocks/icon/edit.js` is the live adopter pairing it with a 2-state
gradient-capable colour row (`iconColour`/`iconColourHover` via `SgsColourPanel`) — the
`<IconPicker>` mount and the colour row there are the precedent both wirings below copy.

**(a) The burger trigger icon.** `triggerIcon` (object, default `{"source":"lucide","name":"menu"}`,
matching the `{source,name}` shape `sgs/icon` stores) — an `IconPicker` mount in the **"Menu Button"**
panel (§9.3), visible only when `triggerMode` includes an icon (`icon` or `icon-and-text`). The emitter
resolves the SVG through the SAME source-aware resolver `sgs/icon` calls
(`plugins/sgs-blocks/includes/nav-menu-treatments.php::sgs_nav_shared_icon_markup`), never a bespoke
lookup. Its colour is the existing `burgerColour`/`burgerColourHover` row; `Sweep` on that row is
gated by FR-41-26's three-condition eligibility rule.

**(b) The submenu marker (drawer-only).** The sublink marker
(`.sgs-nav-drawer-menu__sublink-marker`) is a glyph the operator chooses: `sublinkMarkerIcon`
(object, default `{"source":"lucide","name":"chevron-right"}`) via `IconPicker`, and the colour family
`sublinkMarkerColour` / `sublinkMarkerColourHover` / `sublinkMarkerColourCurrent` plus their
`*Gradient` counterparts (string, `""` each). The marker attributes are declared only in
`nav-drawer-menu`. It lives in the **Submenu — Items** panel (§9).

**The marker colour row is revealed conditionally.** By default the marker inherits the sublink text's
own colour and **no colour picker is shown**. The picker is revealed only when the operator picks a
DIFFERENT icon than the default chevron. ⛔ **The reveal condition is keyed on `sublinkMarkerIcon`'s
value being non-default — NOT on whether `sublinkMarkerColour` has been set** (an empty string is
indistinguishable from "never touched", but the icon choice is unambiguous). The row is omitted, not
disabled, when the icon is the default (`sublinkMarkerIconIsCustom && textRow( … )` in
`plugins/sgs-blocks/src/blocks/nav-drawer-menu/edit.js::Edit`). Once revealed, the row is a full
Normal/Hover/Current + gradient row matching `sgs/button`'s icon-colour control — an SVG-stroke
gradient for lucide/wp-icon sources and a text-gradient for dashicon/emoji sources, via the existing
`sgs_icon_gradient_css()` helper. The marker is `aria-hidden="true"` decoration beside the sublink's
own text, so an unset marker colour inherits `currentColor` and follows Hover and Current for free.
The conditional reveal needs no new `SgsColourPanel` row key: it is ordinary conditional inclusion of a
whole row (FR-41-16's `rows.filter(Boolean)`).

---

## 7b. Motion + placement

### FR-41-31 — The menu button has an optional magnetic pull

**Block-private, Tier V, reusing 100% of the framework's shared `fx-magnet` runtime** (Spec 38
FR-38-30) **at the CSS/JS layer only.** No new JS module, no new CSS module, no DB row, and no
fx-panel or roster registration. ⚠ **One two-line, value-preserving edit to the EXISTING shared
stylesheet is in scope and is design-gated** — `plugins/sgs-blocks/assets/css/fx-magnet.css` exposing its own
transition as `--sgs-magnet-transition` so this block reads the value rather than duplicating it
(below). That is an addition to a shared file, not a new module, and it changes no rendered value
for any existing adopter (§11 G1(e)).

⚠ **Two independent reasons the roster route is wrong here.**
(1) `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` are deliberately EXCLUDED from the fx-panel roster under the motion system's own
containment rule — a functional navigation element does not get an effects panel. (2) The button is
a DESCENDANT of the block root, and the generic fx injector only reaches the root, so it could not
attach there even if the block were on the roster. This is the same category as the block's
existing `loopCarousel` and timeline-connector precedents: shared runtime, block-private wiring.

**Attributes (§8.4):**

| Attribute | Type | Default | Control |
|---|---|---|---|
| `triggerMagnetEnabled` | boolean | `false` | `ToggleControl` |
| `triggerMagnetRadius` | number | `120` | `RangeControl`, **min 20 max 400** |
| `triggerMagnetStrength` | number | `24` | `RangeControl`, **min 2 max 80** |

⛔ **The RangeControl bounds match `fx-magnet.js`'s own clamp exactly.** A wider slider would have
dead ends — a client dragging past the clamp sees the number change and the button not move, which
reads as a broken control. Do not widen either range without changing the runtime's clamp first.

⛔ **No axis control.** A square button has no axis story; omitting the attribute correctly falls
back to the runtime's `'both'` default. Adding one would be a control with no meaningful wrong
answer, which is a control with no reason to exist.

**Panel:** "Menu Button" (§9.3), Design tab, after the size control. Help text: *"Makes the menu
button lean toward the visitor's cursor as they approach it. Off automatically on touch devices and
when reduced motion is requested."*

**Render wiring — on the `<button class="sgs-nav-bar-menu__burger">` element only (bar-only; the drawer has no burger).** When enabled, emit
`data-sgs-fx="magnet" data-sgs-fx-magnet-radius="{value}" data-sgs-fx-magnet-strength="{value}"`,
each value through `absint()` then `esc_attr()`. **When disabled, emit no attribute at all.**

⛔ **No `view.js` change and no enqueue code.** The motion registry's enqueue is **markup-sniffed**
— it regexes the rendered HTML for `data-sgs-fx="…"` — not roster-gated, so the shared `fx-magnet`
module and its stylesheet are picked up automatically the moment the attribute is emitted, and are
not loaded at all when it is not. Writing an enqueue here would be a second mechanism competing
with a working one.

⛔ **One companion CSS rule is REQUIRED, in `sgs/nav-bar-menu`'s own stylesheet, in the same change:**

```css
.sgs-nav-bar-menu__burger[data-sgs-fx="magnet"] {
  transition: background-color var(--wp--custom--transition--fast, 150ms ease),
              var(--sgs-magnet-transition, transform 180ms ease-out);
}
```

Without it the shared magnet effect's own transition and the burger's existing hover-background
transition are **equal specificity**, and whichever stylesheet loads last wins — silently killing
one of the two. Which one dies depends on enqueue order, so it is a bug that reproduces
intermittently and looks like a runtime fault. The attribute-scoped selector means the rule applies
only when the effect is on, so a magnet-less button is untouched.

⛔ **The magnet half of that declaration is READ from a shared custom property, never retyped as a
literal.** See `plugins/sgs-blocks/assets/css/fx-magnet.css` (note the path — the
stylesheet lives under `plugins/sgs-blocks/assets/css/`, registered by
`plugins/sgs-blocks/includes/class-sgs-motion-registry.php` as `'magnet' => 'assets/css/fx-magnet.css'`; there is no
`fx-magnet.css` beside the JS module): its `[data-sgs-fx="magnet"]` rule declares
`transition: transform 180ms ease-out`, and that file's own docblock explains WHY 180ms — *"the
transition is the release, not the pull … short enough that it never feels laggy while tracking."*
Copying the literal into nav-menu makes the number true in two places and correct in one the day it
is tuned.

**The shared file therefore exposes the value it already owns, and nav-menu consumes it:**

```css
/* assets/css/fx-magnet.css — the two-line addition */
[data-sgs-fx="magnet"] {
  --sgs-magnet-transition: transform 180ms ease-out;
  transition: var( --sgs-magnet-transition );
  /* …transform / will-change unchanged… */
}
```

⚠ **`--sgs-magnet-transition` is a CUSTOM PROPERTY, so it INHERITS to every descendant of the
element it is declared on.** Declared on `[data-sgs-fx="magnet"]`, its value is visible to
that element's whole subtree — on the burger, that is the SVG icon and any `__burger-text` span. It
is harmless here (nothing in the subtree reads it), but a future consumer of the shared
`fx-magnet.css` must not read it and conclude the element it read it ON is itself a magnet: an
inherited value is indistinguishable from a locally declared one at the point of use. **If a
descendant ever needs to know, key on the `[data-sgs-fx="magnet"]` ATTRIBUTE, which does not
inherit** — do not add `--sgs-magnet-transition: initial` resets down the tree, which would be a
second mechanism guarding a problem nothing currently has.

⚠ **This is a shared-file touch and is therefore DESIGN-GATED (project rule 7), small as it is.** It
is two lines, it changes no rendered value for any existing adopter (the property resolves to the
same declaration the file already emitted), and nav-menu's `var()` carries the identical literal as
its fallback so the rule is correct even if the property is never declared. **Acceptance: it rides
G1 as a fifth proof** — every existing `[data-sgs-fx="magnet"]` element renders a byte-identical
computed `transition` before and after.

⚠ **REDUCED MOTION: the companion rule OUT-RANKS the shared effect's own kill switch, and what
rescues it is a pre-existing `!important` rule written for other selectors.** Stated precisely,
because the specificity numbers are the whole argument:

| Rule | Selector | Specificity | Under `reduce` |
|---|---|---|---|
| Shared kill switch | `[data-sgs-fx="magnet"]` inside `@media (prefers-reduced-motion: reduce)` (`plugins/sgs-blocks/assets/css/fx-magnet.css`) | **(0,1,0)** | sets `transform:none; transition:none` |
| This companion rule | `.sgs-nav-bar-menu__burger[data-sgs-fx="magnet"]` | **(0,2,0)** | would re-assert a `transition` and **beat the kill switch** |
| The rescue | `.sgs-nav-bar-menu__burger` inside `@media (prefers-reduced-motion: reduce)` (burger is BAR-only, so this rule lives at `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css`, the four-selector list also naming `.sgs-nav-bar-menu__link`, `.sgs-nav-bar-menu__indicator` and `[data-magnet] .sgs-nav-bar-menu__magnet-target`; the drawer block's own `style.css` carries the same rescue for its own three selectors, minus the burger, which doesn't exist in that fork) | (0,1,0) **+ `!important`** | forces `transition-duration: 0.01ms`, which beats both |

**Net outcome: correct — the transition is killed and the `transform: none` half is never at risk**
(this companion rule declares no `transform`, so the shared kill switch's `transform: none` applies
unopposed). But it is correct *because of a rule written for other selectors*, which is a dependency
nobody would find by reading FR-41-31.

⛔ **Do NOT ALSO wrap the companion rule in `@media not (prefers-reduced-motion: reduce)`.** It was
considered and refused: the `!important` rescue cannot be removed (it governs three other elements),
so scoping would be a SECOND mechanism guaranteeing an outcome an unremovable existing rule already
guarantees — two overlapping fixes, neither falsifiable, neither ever safely deletable. The
dependency is named here and asserted at **§11 G9** instead. ⛔ And do **not** give the companion
rule `!important` to "make it win" — that would beat the rescue and reinstate the very transition
reduced motion is asking to remove.

**Acceptance: §11 G17.** With `triggerMagnetEnabled` false (its default), the rendered button
markup carries no magnet attribute, and **no magnet module or stylesheet is enqueued on
the page** — assert the absence of the asset, not just the absence of the attribute.

### FR-41-32 — Cursor-reactive field: eligible, deliberately NOT offered, revisit after the design gate

**Written in the same spirit as FR-41-20 ("active-trail is not implemented"): a capability someone
will reasonably expect, named as not-built with the reason, rather than left to be rediscovered.**

**(a) The block genuinely qualifies as an emitter.** `sgs/nav-bar-menu` declares
`containerKind: "layout"` (`plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json`), which satisfies
the effects system's own eligibility check. Nothing structural is in the way.

**(b) It is deliberately not offered, because the only current mechanism is all-or-nothing.** The
sole route to cursor-field is `supports.sgs.fx.motionSurface: true`, and switching that on opens a
panel carrying **nine effects at once** — cursor-field, generative-background, grid-dots, morph,
motion-path, particles, scrub, wave-gradient, plus magnet, which would then need explicit
subtraction via `providesNatively` to avoid colliding with FR-41-31. The framework's effects system
has no way to offer ONE effect without its whole `requires`-token sibling group, and the
framework's panel-bloat containment rule
(`plugins/sgs-blocks/scripts/generate-fx-qualifying-blocks.py`) exists to keep functional blocks —
navigation, site header, site footer — off the effects panel. Bundling eight unrelated decorative
effects onto a functional navigation element is exactly what that rule exists to prevent.

**(c) Revisit after the design gate lands.**
`.claude/archive/parking.md` `P-FX-PER-EFFECT-BLOCK-COMPATIBILITY` will build a proper
per-block/per-effect selection system. When it does, this decision should be re-taken on merit
rather than inherited.

⛔ **No controls, no attributes and no panel placement are designed for this.** It is out
of scope until that work lands (§1.2). Do not build a bespoke one-off cursor-field wiring here to
route around the containment rule — that is the rule's failure mode, not its exception.

### FR-41-33 — Border COLOUR joins the global Colour panel; width, style and radius stay with the element

**Owner-locked, decided on merits and knowingly diverging from a generic framework rule.**

**The split:**

| Property | Home | Control |
|---|---|---|
| Border **width**, **style**, **radius** | the element's own panel — "Menu item" (§9.7), "Submenu — Container" (§9.9) | `SgsBorderControl` with **`showColour={ false }`** |
| Border **colour**, all states | the global Colour panel (§9.6), as an ordinary row alongside fill and text | `SgsColourPanel` row — 3 states on the item, Normal-only on the panel |

**Why the exception is taken, in its own terms.** `SgsColourPanel.js`'s docblock names border
colour as one of exactly three documented exemptions (with overlay and shadow colour), on the sound
general reasoning that each pairs a colour with a non-colour sibling the panel has no slot for.
**This block's whole redesign is a side-by-side comparison of every element's colours across three
states.** Border colour is precisely the kind of colour that must coordinate with the fill and the
text beside it — an operator matching a Current-state border to a Current-state text colour should
not have to hold one value in their head while opening another panel. Width, style and radius need
no such comparison and stay put. **This is a considered, block-scoped exception, not an error or an
oversight of the general rule**; the general rule is unchanged for every other block, and no other
block's inspector moves.

**Feasibility — checked, not assumed.**

1. ⛔ **`SgsBorderControl`'s colour picker can be suppressed only through the additive `showColour`
   prop.** Its prop contract offers `colourStates` / `colourValue` / `onColourChange` /
   `colourGradientValue` / `onColourGradientChange` / `colourLinked` / `colourLabel`, and it renders
   `<GradientCapableColourControl>` inside its `.sgs-border-control__colour` `FlexItem`. Omitting the
   colour props does not omit the control — it would render an empty picker. **`showColour`
   (boolean, default `true`)** removes that `FlexItem` when `false`. Every other mount omits the prop
   and is byte-identical (§11 G1). ⚠ The mount roster is a live grep, never a cached count.

   ⛔ **`showColour={ false }` makes TEN existing props INERT, and that ignore-list is part of the
   prop's contract — it is documented on the component, not left to be discovered.**
   All ten reach `GradientCapableColourControl` and nothing else, per
   `SgsBorderControl.js`'s destructured prop list and its single `<GradientCapableColourControl>`
   mount:

   | Prop | Inert under `showColour={ false }` because |
   |---|---|
   | `colourStates` | the multi-state array is only ever forwarded as that control's `states` |
   | `colourValue` / `onColourChange` | single-state colour pair, forwarded to the same control |
   | `colourGradientValue` / `onColourGradientChange` | gradient pair, same destination |
   | `colourLinked` | token-slug storage flag, same destination |
   | `colourLabel` | labels the suppressed swatch |
   | `clearable` · `enableAlpha` | picker affordances on the suppressed swatch |
   | `contrastAgainst` / `contrastLabel` / `contrastLargeText` | ⚠ **the dangerous one** — a caller can wire a full WCAG contrast check that then silently never runs, because the control that performs it is not rendered. A contrast check that is present in the source and absent at runtime reads as covered when it is not |

   ⛔ **`borderStyle` is NOT on this list** and must not join it — it also travels through
   `GradientCapableColourControl`, which is precisely why item 2 below re-parents it rather
   than letting it die with the popover.

   ⚠ **`showColour={ false }` must not silently swallow these — the component's own docblock
   carries the ignore-list verbatim**, so a future caller reading the prop contract sees which of
   its props stop meaning anything. This is the exact shape recorded in this project's
   `not-declared-does-not-mean-does-nothing` lesson, inverted: here a prop stays *declared* and
   stops *doing* anything. ✅ `sgs/nav-bar-menu` and `sgs/nav-drawer-menu`'s own mounts pass none of the ten — the border
   colour rows carry `contrastAgainst` / `contrastLargeText: true` in the **Colour panel**
   (§9.6 / FR-41-17), where the control that reads them is actually rendered.
2. ⚠ **`borderStyle` rides INSIDE the colour popover** — `SgsBorderControl` forwards
   `styleValue`/`onStyleChange` into `GradientCapableColourControl` as
   `borderStyle`/`onBorderStyleChange`, because the native `BorderBoxControl` opens both from one
   swatch. **Suppressing the picker must not silently take border style with it.** Under
   `showColour={ false }`, `SgsBorderControl` renders **the existing shared
   `BorderStyleControl`** as its own sibling in the same row. No attribute moves, no capability is
   lost, and no new control is written — only the affordance changes, for the one mount that asks
   for it.

   ⛔ **REUSE `plugins/sgs-blocks/src/components/BorderStyleControl.js::BorderStyleControl` — do
   NOT hand-roll a `SelectControl`.** The component exists, is exported from
   the barrel (`plugins/sgs-blocks/src/components/index.js::BorderStyleControl`), and already has
   TWO live adopters — `GradientCapableColourControl.js` (which is the very control
   `showColour={ false }` suppresses, so this is literally the same control, re-parented) and `DesignTokenPicker.js`. It is a thin wrapper matching WP core's native
   `BorderControlStylePicker` exactly: a `ToggleGroupControl` with `isDeselectable` and three
   `ToggleGroupControlOptionIcon` entries (Solid / Dashed / Dotted), with "None" reached by
   deselecting the active option rather than a fourth segment. Its prop contract is
   `{ label?, value, onChange }`, and `onChange` receives `''` on deselect.

   ⚠ **Gate the sibling mount exactly the way `GradientCapableColourControl` already gates it** —
   in that file: `{ typeof onBorderStyleChange === 'function' && ( … ) }`. Under
   `showColour={ false }`, `SgsBorderControl` renders the sibling only when
   `typeof onStyleChange === 'function'`. A caller that never wired border style gets no orphan
   control appearing in place of the suppressed popover's control — which would be a NEW control on an
   existing mount, and G1(d)'s byte-identity proof is exactly what that would break.

   ⚠ **A hand-rolled `SelectControl` would also silently RE-WIDEN the vocabulary.** The component's
   three icons deliberately match WP core's native `BorderControlStylePicker` exactly (Solid /
   Dashed / Dotted) rather than a nine-option `SelectControl`
   (None/Solid/Dashed/Dotted/Double/Groove/Ridge/Inset/Outset). Writing a fresh `SelectControl` here
   would reintroduce that wider, non-native vocabulary.
3. ✅ **`ShadowControl` is a precedent, and honestly only a partial one.** It externalised its
   colour OWNERSHIP — the caller supplies `colour` / `onColourChange` and owns the sibling
   `{name}Colour` attribute — which proves that a composite not owning its own colour attribute is
   already an established, accepted pattern in this codebase. ⚠ It does **not** prove the second
   half: the control still RENDERS the picker itself, inside `ShadowStateBuilder`. `showColour` is
   behaviour the control did not already have, and is named as such.

⛔ **The split is exclusive: exactly ONE live control writes each attribute.** A duplicate writer
across two panels is banned by `check-duplicate-controls.js`, and a "convenience" second swatch
would be exactly that. **Acceptance: §11 G18.**

---

## 8. Attribute reconciliation — the full explicit list

Existing names WIN. New attributes extend the existing convention (`itemColourHover` exists → its
sibling is `itemColourCurrent`). The attributes live in two manifests —
`plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::attributes` and
`plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json::attributes` — with the BAR/DRAWER/BOTH
split recorded per attribute in
`.claude/reports/2026-09-14-nav-menu-split-attribute-classification.md`. Source of truth: both files.

### 8.1 Colour-row attributes — driven by a 3-state row

| Attribute | Role |
|---|---|
| `itemColour` / `itemColourHover` | Normal / Hover of the item text row |
| `itemColourGradient` | Item text Normal gradient (**Normal only** — see §8.5) |
| `itemBg` / `itemBgHover` | Normal / Hover of the item background row. `itemBgHover` is ALSO the Highlight pill's fill (FR-41-25) — one swatch, three treatments |
| `itemBgGradient` | Item background Normal gradient |
| `submenuColour` / `submenuColourHover` | Normal / Hover of the submenu link text row |
| `submenuColourGradient` | Submenu link text Normal gradient |
| `submenuBg` | Submenu **panel** background — Normal only (FR-41-9) |
| `navBg` / `navBgHover` / `navBgGradient` | 2-state — **the nav bar keeps two states**, not three (a bar is never "the current page") |
| `navColour` / `navColourHover` / `navColourGradient` | 2-state — same reason |
| `burgerColour` / `burgerColourGradient` / `burgerColourHover` / `burgerBg` / `burgerBgGradient` / `burgerHoverColour` / `burgerSize` | 2-state, in the **"Menu Button"** panel + the Colour panel's **Menu button** grouping. ⛔ The panel heading is a label, not an attribute rename (FR-41-12) |
| `itemTextDecoration` | Normal state. Its `enum` carries `overline` as a fifth value (FR-41-6) and it has an explicit `attrMap` entry (§8.6a). Hover sibling `itemTextDecorationHover` (§8.4 / FR-41-6 / FR-41-21). **No** Current sibling — FR-41-6 consequence 2 |

⛔ **`burgerColourHover` and `burgerHoverColour` are two different attributes governing two different
properties, and nothing but this table disambiguates them.** Both are declared
`{"type":"string","default":""}`, and their names are anagram-close — read the wrong one and you wire
a colour control to a background:

| Attribute | Governs | Emission |
|---|---|---|
| **`burgerColourHover`** | the **ICON/TEXT colour** on hover | the emitter writes `color:` on `.sgs-nav-bar-menu__burger` via `sgs_hover_state_rules()`. Manifest: `burger.states.hover.attrMap."css:color"`. It is the Hover half of the **Icon colour** row (§9.6) |
| **`burgerHoverColour`** | the **BUTTON BACKGROUND** on hover | the emitter writes `background-color:` on the same element via `sgs_hover_state_rules()`. Manifest: `burger.states.hover.attrMap."css:background-color"`. It is the Hover half of the **Button background** row (§9.6), whose Normal half is `burgerBg` |

⛔ **Neither is renamed** — §8.4's zero-renames rule binds here as much as anywhere, and the converter
emits both names. The disambiguation is this table, not a rename. ⚠ The two rows they belong to carry
DIFFERENT treatment attributes for the same reason — `burgerColourHoverTreatment` (3-option, Sweep
eligibility-gated) on the icon-colour row, `burgerBgHoverTreatment` (2-option) on the background row
(FR-41-23). Crossing the two attributes would also cross their treatments.

### 8.2 Other existing attributes — no control in this spec touches them

`padding` · `margin` · `ref` · `collapsePoint` · `drawerRef` · `featuredItemIds` · `navLabel` ·
`gap` · `listColumns` · every `itemFontSize`/`FontWeight`/`FontStyle`/`LineHeight`/`FontFamily`/
`TextTransform`/`LetterSpacing`/`TextAlign`/`TextWrap`/`TextColumns`/`TextIndent`/`WritingMode`
(+ their `*Unit` siblings) · every `featured*` · `itemMagnetEnabled` · `sgsCustomCss` ·
`submenuAlign` · `submenuCaret` · `submenuCloseGrace` · `submenuMinWidth` · `submenuPadding`.

⚠ The `itemMagnetEnabled` above is the item-level magnet in the Effects panel (§9.11). It is a
different attribute from FR-41-31's `triggerMagnetEnabled`, which scopes the same shared `fx-magnet`
runtime to the menu button. Neither reads the other's attributes.

### 8.4 Attributes declared by this spec

"Block" is where the attribute is declared: **Both** = `sgs/nav-bar-menu` and `sgs/nav-drawer-menu`;
**Bar** / **Drawer** = that block only.

| Attribute | Block | Type | Default | Purpose |
|---|---|---|---|---|
| `itemColourCurrent` | Both | string | `""` | Nav item text, current page |
| `itemBgCurrent` | Both | string | `""` | Nav item background, current page |
| `itemBgCurrentGradient` | Both | string | `""` | gradient sibling of `itemBgCurrent` |
| `itemBgHoverGradient` | Both | string | `""` | gradient sibling of `itemBgHover`. **Completes the row's three-state gradient set** (`itemBgGradient` Normal / this / `itemBgCurrentGradient` Current) and is what the Highlight pill paints with when the operator picks a gradient — FR-41-25. Without it Highlight could read the Hover swatch only in its flat form |
| `itemFontWeightCurrent` | Both | string | `"600"` | FR-41-6 non-colour Current signal. **String, not number** — matches `itemFontWeight` |
| `itemTextDecorationHover` | Both | string | `""` | `showHover` trio member, Menu target. Optional secondary decoration — ⛔ never the block's primary non-colour signal and never "the divider" (FR-41-6) |
| `itemTextTransformHover` | Both | string | `""` | `showHover` trio member, Menu target |
| `itemFontWeightHover` | Both | string | `""` | `showHover` trio member, Menu target. **String, not number** — matches `itemFontWeight` / `itemFontWeightCurrent`. ⚠ Help text must carry the reflow caution (FR-41-6 consequence 3) |
| `submenuTextDecorationHover` | Both | string | `""` | `showHover` trio member, Submenu target (FR-41-22) |
| `submenuTextTransformHover` | Both | string | `""` | `showHover` trio member, Submenu target |
| `submenuFontWeightHover` | Both | string | `""` | `showHover` trio member, Submenu target. **String, not number** |
| `itemSmartContrast` | Both | boolean | `false` | FR-41-5 auto-readable foreground; the readability CHECK is unconditional (advisory Notice), only the auto-SWAP is gated on this toggle |
| `itemBorderWidth` | Both | object | `{}` | box object, base-only, `SgsBorderControl` |
| `itemBorderStyle` | Both | string | `"solid"` | `SgsBorderControl`'s border-style control |
| `itemBorderRadius` | Both | object | `{"topLeft":"8px","topRight":"8px","bottomRight":"8px","bottomLeft":"8px"}` | corner object, `SgsBorderControl`'s radius half — see the ⛔ below |
| `itemBorderColour` / `…Hover` / `…Current` | Both | string | `"border-light"` / `"accent"` / `"accent"` | the 3-state border colour, authored as an ordinary row in the global Colour panel — FR-41-33. ⛔ No gradient sibling (FR-41-7) |
| `sweepAngle` | Both | number | `90` | FR-41-38 — the item border Sweep's angle, shown only when `itemBorderHoverTreatment==='sweep'` |
| `submenuBgGradient` | Both | string | `""` | the submenu PANEL background's Normal-state gradient sibling, required by the shared `sgs_custom_property_gradient_decls()` end shape. **Normal only** (FR-41-9) |
| `submenuColourCurrent` | Both | string | `"text"` | Submenu link text, current page |
| `submenuLinkBg` / `…Hover` / `…Current` | Both | string | `"surface"` / `"primary"` / `"surface-alt"` | Submenu **link** background, 3 states (FR-41-9) |
| `submenuLinkBgGradient` | Both | string | `""` | Normal-state gradient sibling |
| `submenuAnimation` | Bar | string | `"fade"` | FR-41-10 |
| `submenuTopOffset` | Bar | string | `""` | FR-41-11 |
| `submenuBorderWidth` | Both | object | `{}` | box object, base-only, `SgsBorderControl` |
| `submenuBorderStyle` | Both | string | `""` | `SgsBorderControl`'s border-style control |
| `submenuBorderRadius` | Bar | object | `{}` | corner object |
| `submenuBorderColour` | Both | string | `""` | Submenu **panel** border — **Normal only** (FR-41-9) |
| `submenuBorderColourGradient` | Both | string | `""` | Normal-state gradient sibling |
| `submenuShadow` | Bar | string | `""` | Shadow **shape** on the floating panel (§9.9) |
| `submenuShadowColour` | Bar | string | `""` | Its colour — the name is forced by `plugins/sgs-blocks/src/components/ShadowControl.js::shadowAttrKeys`'s rule `colour = <base>Colour` |
| `triggerMode` | Bar | string | `"icon"` | FR-41-12 |
| `triggerLabel` | Bar | string | `"Menu"` | FR-41-12 |
| `triggerMagnetEnabled` | Bar | boolean | `false` | FR-41-31 — menu-button magnetic pull, off by default |
| `triggerMagnetRadius` | Bar | number | `120` | FR-41-31 — `RangeControl` min 20 max 400, matching `fx-magnet.js`'s real clamp |
| `triggerMagnetStrength` | Bar | number | `24` | FR-41-31 — `RangeControl` min 2 max 80, same reasoning |
| `itemColourHoverTreatment` | Both | string | `"swap"` | FR-41-23/26 — none / swap / sweep (sweep eligibility-gated, FR-41-26) |
| `itemBgHoverTreatment` | Both | string | `"swap"` | FR-41-23/25 — none / swap / highlight (the pill paints in `itemBgHover`/`itemBgHoverGradient`) |
| `itemBorderHoverTreatment` | Both | string | `"swap"` | FR-41-23/8 — none / swap / sweep |
| `submenuColourHoverTreatment` | Both | string | `"swap"` | FR-41-23/26 — none / swap / sweep. Sweep OMITTED whenever `submenuLinkBg` / `submenuLinkBgHover` / `submenuLinkBgCurrent` / `submenuLinkBgGradient` / `submenuColourGradient` is set (FR-41-26 eligibility — a background in ANY state blocks the sweep, not just the resting one) |
| `submenuLinkBgHoverTreatment` | Both | string | `"swap"` | FR-41-23 — none / swap ONLY (no Highlight — two-option row) |
| `burgerColourHoverTreatment` | Bar | string | `"swap"` | FR-41-23/26 — none / swap / sweep. Sweep OMITTED under `triggerMode:'icon'`, or whenever `burgerBg` / `burgerBgGradient` / `burgerHoverColour` / `burgerColourGradient` is set (FR-41-26 eligibility; `burgerHoverColour` is the button's HOVER BACKGROUND, §8.1). ⛔ `burgerColourHover` is NOT a blocking input — it is the icon colour the sweep travels TO |
| `burgerBgHoverTreatment` | Bar | string | `"swap"` | FR-41-23 — none / swap ONLY (two-option row) |
| `triggerIcon` | Bar | object | `{"source":"lucide","name":"menu"}` | FR-41-30(a) — the menu-button glyph |
| `sublinkMarkerIcon` | Drawer | object | `{"source":"lucide","name":"chevron-right"}` | FR-41-30(b) — the sublink marker glyph |
| `sublinkMarkerColour` / `…Hover` / `…Current` (+ `*Gradient` siblings) | Drawer | string | `""` | FR-41-30(b) — the marker's colour family, revealed only when `sublinkMarkerIcon` is non-default; unset inherits `currentColor` from the sublink's own 3-state text colour |

⛔ **`itemBorderRadius`'s default is `8px` on all four corners, and the SHAPE is a FLAT corner
object, not a tier envelope.**

**Why 8px and not `{}`.** A background-filled menu item with hard square corners by default reads as
unfinished, and nothing is gained by dropping a visual behaviour the block already has. Decided on
merits, not on preserving what any test page currently renders.

**Why a FLAT corner object and not the `{"desktop":{}}` tier envelope — read the right precedent.**
Most blocks' root `borderRadius` attribute carries `{"desktop":{}}`, governed by
`plugins/sgs-blocks/includes/helpers-box.php::sgs_border_radius_tiers`. `itemBorderRadius` is a
**PER-ELEMENT** radius (the nav item's link, not the block root), and the per-element precedent is
`sgs/product-card`'s `ctaBorderRadius`:
`{"topLeft":"10px","topRight":"10px","bottomLeft":"10px","bottomRight":"10px"}` — a flat corner object
holding CSS length STRINGS, consumed by
`plugins/sgs-blocks/includes/helpers-box.php::sgs_corner_object_shorthand`, which reads exactly
`topLeft` / `topRight` / `bottomRight` / `bottomLeft` through `sgs_css_length_value()`. ⛔ Reaching for
the root-radius tier envelope here would author a shape `sgs_corner_object_shorthand()` cannot read —
it would find no corner keys and return `null`, so the radius would silently vanish rather than
error. ⚠ Values are STRINGS with units (`"8px"`), matching `ctaBorderRadius`; a bare number is not
the precedent.

⚠ **`submenuBorderRadius` keeps its `{}` default** — the panel renders its own radius from
`--sgs-nm-submenu-radius` with a token fallback (FR-41-15), so there is no existing behaviour to
preserve. Same flat corner shape, empty default. Do not read the item's default as a reason to give
the panel one.

**Full submenu typography family** — declared under FR-41-22, listed there rather than duplicated
here.

⛔ **Every `showHover` trio attribute defaults to `""` (unset) — all SIX of them, being the three trio
properties on each of the two targets. `itemTextDecorationHover` does NOT default to `"underline"`.**
Three independent reasons, each sufficient on its own:

1. **A non-empty default would make the underline the block's SHIPPED hover signal** — the exact
   framing FR-41-6 rules out. An optional secondary decoration that appears without being asked for
   is not optional.
2. **It would ship an underline to every menu item of every install** — the design imposition
   FR-41-17a(a) and §10's ⛔ both refuse in terms ("do not close case (a) by re-defaulting").
   `itemBorderWidth`'s empty default is accepted on precisely this reasoning; a defaulted underline
   would close that residual by imposition instead.
3. **It would break the additive-defaults contract (G13).** The other two trio members have never had
   a non-empty default; a block with untouched typography must render byte-identical CSS, and an
   emitted `text-decoration:underline` on hover is not that.

⚠ **All SIX trio attributes are plain `"type": "string"` with NO JSON `enum`, PHP-validated against
the allowlists in FR-41-21's table** — the same reasoning FR-41-8 / FR-41-10 / FR-41-24 establish for
every small enum on these blocks (an out-of-enum stored value silently coerces to the block.json
default with no error, which bites hardest via a programmatic writer). ⚠ This is a **disclosed
asymmetry** with the base sibling `itemTextDecoration`, which carries a real JSON `enum` and keeps it
— an existing attribute is not restructured here, and the zero-renames rule covers the shape as much
as the name.

⛔ **Zero renames in this spec.** Every entry above is additive; nothing is a rename. (A rename's
blast radius is the whole write path, not just the readers — the converter emits these names too.)

### 8.4a Responsive font-size tiers — no flat tier attributes

`itemFontSize` is a tier object, and both the editor and the emitter take the tiered path. **No
`itemFontSizeTablet` / `itemFontSizeMobile` attribute is declared, and nothing is inert.** What holds:

| Claim | Reading | Verdict |
|---|---|---|
| `itemFontSize` is a tier object | `block.json` declares `itemFontSize` as **`{"type":"object","default":{}}`** — a `{desktop,tablet,mobile}` TIER OBJECT | TRUE |
| The editor writes the whole tier object | `plugins/sgs-blocks/src/components/TypographyControls.js::TypographyControls` computes `fontSizeIsTiered = isTieredValue( fontSizeRaw )`; `isTieredValue` returns true for any non-null, non-array object, so `{}` qualifies. The tiered branch renders `<ResponsiveOverride>` and writes **`{ [ k.fontSize ]: obj }`** — one attribute | TRUE — the flat tier keys are never written on these blocks |
| The emitter reads the tier object | `sgs_typography_css_rule()` branches on `$size_is_tiered = is_array( $attributes[ $k_size ] )` and pushes a `$tiered_specs` entry emitting per-tier `@media` CSS via `sgs_emit_responsive_css()`. `FontSizeTablet` / `FontSizeMobile` are read **only** in the `else` (`$flat_specs`) branch | TRUE — the flat tier keys are never read on these blocks |
| Tablet and mobile font size persist and render | Both surfaces take the tiered path, and the mount passes no `showResponsive={ false }` (it defaults `true`) | TRUE — end to end |

⛔ **Declaring `itemFontSizeTablet` / `itemFontSizeMobile` would add two attributes with zero writers
and zero readers** — dead-attribute debt. **`typographyAttrKeys()` returning a key name is not
evidence that a block uses it**: the function names the keys for BOTH storage shapes, and these blocks
use the tier-object one. ⚠ `itemLetterSpacing` is `{"type":"object","default":{}}` too and is correct
for the identical reason — do not "complete the set" there either.

**REQUIREMENT.** The tiered behaviour is a stated, gated guarantee: §11 **G20** asserts that a tablet
and a mobile font-size value, set through the editor, actually PERSIST and actually RENDER.

⚠ **The one un-tiered member of this family is `itemLineHeight`, and it is not broken — it is
un-migrated.** Declared `{"type":"number"}` with no default, so `lineHeightIsTiered` is false and
`TypographyControls` renders a single plain `LineHeightControl` with **no responsive wrapper at all**,
writing only `itemLineHeight`. That is a MISSING CAPABILITY (no per-device line height is offered),
never a silent discard. ⛔ **Do not "fix" it by declaring `itemLineHeightTablet` / `…Mobile`.** The
framework's settled direction is the tier-object migration, and the fix is to migrate
`itemLineHeight` to a tier object via `plugins/sgs-blocks/scripts/migrate-tier-object.py --property lineHeight`
— which is that codemod's job across every block, not this spec's.

### 8.5 Three deliberate boundaries — do not "complete the set"

1. **The item TEXT row's gradient is Normal plus Hover, never Current.** `itemColourGradient` is the
   Normal gradient and `itemColourHoverGradient` is the Hover gradient (declared in both blocks, in
   `item.states.hover`); **there is no `itemColourCurrentGradient`.** A gradient has no single hex to
   contrast-test, so it cannot coexist with the smart-contrast auto-swap (FR-41-5): the Hover gradient
   is offered in the editor ONLY while `itemSmartContrast` is off (the default) and hidden the instant
   an operator switches it on, and the emitter ignores a stored hover gradient while the swap is
   active rather than letting it silently reappear. Current is not extended the same way.
   ⚠ **This is a TEXT-row boundary, not a general one — the item BACKGROUND row has a full
   three-state gradient set (`itemBgGradient` / `itemBgHoverGradient` / `itemBgCurrentGradient`).** A
   background gradient has nothing to contrast-test against; it IS the thing being contrasted against,
   and `sgs_wcag_text_colour_for_bg()` resolves the foreground from the fill either way. Reading these
   as one rule would wrongly delete `itemBgHoverGradient`, which FR-41-25's Highlight treatment reads.
2. **The submenu PANEL background has a Normal-state gradient and nothing else.**
   `submenuBgGradient` is declared identically in both blocks (string, `""`), because the panel's
   fill is written by the shared `sgs_custom_property_gradient_decls( 'sgs-nm-submenu-bg', … )` — the
   fill-custom-property-gradient end shape every other background/border custom-property row uses —
   and that helper emits a `--sgs-nm-submenu-bg-gradient` sibling as part of its contract. ⛔ There is
   no `submenuBgGradientHover` and no `…Current`, because FR-41-9's argument (a panel is never the
   hovered surface) is about STATES, not about gradients. See FR-41-15 for the emitted shape.
3. **No gradient on the ITEM border in any state (`itemBorderColourGradient` is out of scope,
   FR-41-7), while the submenu PANEL border keeps one (`submenuBorderColourGradient`).** The asymmetry
   is a pseudo-element budget on one element, spelled out at FR-41-3(c) — do not "complete the set" in
   either direction.

### 8.6 Required `block.json` manifest shape

**(a) The `item` element has hover and current states, with DISTINCT attribute names per state.**

`supports.sgs.elements.item` declares `clusters: ["text","fill","layout","border"]`, `prefix: "item"`
and `states` `hover` and `current`. Each member is named:

| Member | Detail |
|---|---|
| `"border"` in `item.clusters` | Without it the forward-resolution pass never visits `css:border-color` / `css:border-width` / `css:border-style` and the attrMap for them is never consulted. The same trap is recorded on the `indicator` element: *"clusters: [\"fill\"] is declared (not []) SPECIFICALLY so the forward-resolution pass actually visits css:background-color and consults this attrMap — an attrMap on an element with clusters: [] is never consulted"*. |
| `css:border-radius` | base → `itemBorderRadius`. There is no hover entry — radius has no hover state on the control. |
| Base border members | `"css:border-color": "itemBorderColour"`, `"css:border-width": "itemBorderWidth"`, `"css:border-style": "itemBorderStyle"` |
| Base `css:text-decoration` | → `itemTextDecoration`. Rendered by `sgs_typography_css_rule()`, which emits `text-decoration:` from `{prefix}TextDecoration`. It has a hover sibling (below) and no current sibling (FR-41-6); a base-plus-hover pair with no current entry is correct, not a finding. |
| Base `css:text-transform` | → `itemTextTransform`. Required for the same reason as the decoration entry: without an explicit base, `itemTextTransform` and `itemTextTransformHover` both derive to `(text-transform, item, state=NULL)` and collide on ONE routing slot. ⛔ Not belt-and-braces — it is the third instance of a collision this block's own manifest records twice (see the ⛔ below). |
| ✅ Base `css:font-weight` — **must SURVIVE** | `item.attrMap` declares `"css:font-weight": "itemFontWeight"`. It is listed so a builder does not read the hover + current `css:font-weight` entries below and conclude the base one is redundant. ⛔ **Do not remove it.** Dropping it leaves two state entries with no base, which is the STATE_WITHOUT_BASE shape the manifest gate flags (Spec 35 FR-35-5) — the defect that put `burgerBg` into the manifest in the first place. |
| `states.hover` members | `"css:color": "itemColourHover"`, `"css:color-gradient": "itemColourHoverGradient"`, `"css:background-color": "itemBgHover"`, `"css:background-image": "itemBgHoverGradient"`, `"css:border-color": "itemBorderColourHover"`, `"css:text-decoration": "itemTextDecorationHover"`, `"css:text-transform": "itemTextTransformHover"`, `"css:font-weight": "itemFontWeightHover"`. ⛔ All three trio entries are **explicit**, never left to the `{prefix}Suffix` convention: the base `itemTextDecoration` and the hover `itemTextDecorationHover` would otherwise both derive to `(text-decoration, item, state=NULL)` and collide on one routing slot — the identical collision this element's own `_note` records. |
| `states.current` members | `"css:color": "itemColourCurrent"`, `"css:background-color": "itemBgCurrent"`, `"css:background-image": "itemBgCurrentGradient"`, `"css:border-color": "itemBorderColourCurrent"`, and — **explicitly** — `"css:font-weight": "itemFontWeightCurrent"` |

⚠ **`css:background-image` is claimed at all three states by three DIFFERENT attributes**
(`itemBgGradient` base / `itemBgHoverGradient` hover / `itemBgCurrentGradient` current). That is the
safe shape — see the last-write-wins warning below — but it must be declared explicitly at each state,
never left to a `{prefix}Suffix` convention.

⚠ **`css:font-weight` is claimed at all three states too** — `itemFontWeight` base /
`itemFontWeightHover` hover / `itemFontWeightCurrent` current — and `css:text-decoration` at two
(`itemTextDecoration` base / `itemTextDecorationHover` hover). Same safe shape, same obligation: three
(or two) DIFFERENT attribute names, each declared explicitly at its own state. Do not read this as
"the base entry is redundant" — dropping it would leave a hover entry with no base, the
STATE_WITHOUT_BASE shape the manifest gate flags.

⛔ **The explicit current `css:font-weight` entry is not belt-and-braces — this block's own manifest
records the same collision on two other elements.** The `burger` element's `_note` records
`burgerColour` + `burgerColourHover` both deriving to `(color, burger, state=NULL)` and colliding on
one routing slot; the `sublink` element's `_note` records the identical thing for `submenuColour` +
`submenuColourHover`. Both are fixed by an explicit state entry. A `{prefix}Suffix` convention does not
separate a base attribute from its state sibling on its own.

⛔ **The `current` state maps DIFFERENT attribute names from `hover`, and that is what keeps the
classifier honest.** The classifier's `_record()` is **last-write-wins**: a `current` attrMap
byte-identical to `hover` would iterate second and silently overwrite the correct hover derivation,
tagging the attributes with the wrong `css_state` in the DB, a state they never render in. With
distinct names there is nothing to overwrite. Required verification, not optional: assert via
`/sgs-db` that `itemColourHover` and `itemBgHover` carry `css_state='hover'`, and that the Current
attrs carry `css_state='current'` — a negative control proving the collision has not recurred (§11
G4).

**(b) The `sublink` element has hover and current states, a `fill` and `border` cluster, and explicit
typography members.** Clusters `["text","fill","border"]`, `"prefix": ""`. `submenuColourCurrent` on
`states.current`; `submenuLinkBg` / `submenuLinkBgHover` / `submenuLinkBgCurrent` across base + both
states; `submenuLinkBgGradient` as `css:background-image` at base. `fill` is declared for the same
forward-resolution reason as (a). `states.hover` carries typography members —
`"css:text-decoration": "submenuTextDecorationHover"`, `"css:text-transform":
"submenuTextTransformHover"`, `"css:font-weight": "submenuFontWeightHover"` — each explicit for the
same collision reason as (a). On `nav-drawer-menu` the element also routes the marker colour family
(`css:fill` / `css:fill-gradient` → `sublinkMarkerColour*` at base, hover and current).

⛔ **Each of the three hover members needs its BASE counterpart declared in the SAME change.**
`sublink.attrMap` declares `"css:text-decoration": "submenuTextDecoration"`, `"css:text-transform":
"submenuTextTransform"` and `"css:font-weight": "submenuFontWeight"`; they are itemised in
**FR-41-22(c)**'s full base-member list and not restated as a second roster — but the PAIRING
obligation is stated here, because it is what makes the hover trio safe: a hover member whose base is
missing is a STATE_WITHOUT_BASE finding, and a hover member whose base is present but IMPLICIT would
collide on one routing slot. ⚠ This element carries `"prefix": ""`, so nothing on it resolves by the
`{prefix}Suffix` convention at all — every member here is explicit by necessity, which is why the
collision risk is lower here than on `item` and the omission risk is higher.

⚠ **`sublink` declares `"prefix": ""` deliberately, and that must NOT change.** Its `_note` states the
reason: a `submenu` prefix would wrongly claim `submenuAlign`/`Caret`/`CloseGrace`/`MinWidth`/
`Radius`/`Padding`, which belong to the PANEL. FR-41-22's genuinely `submenu`-prefixed typography
attributes DO belong to this anchor, which partially cuts against that reasoning — **resolve it with
an explicit `attrMap` entry per typography property**, never by giving the element a prefix (which
would immediately re-claim the six panel attributes the empty prefix exists to exclude). The full
member list is in FR-41-22.

**(c) A `submenu-panel` element claims the panel.** The `submenu-panel` element (`.{bem_root}__submenu`)
claims `submenuBg` / `submenuBgGradient` (base only, no states — FR-41-9),
`submenuBorderColour` / `submenuBorderColourGradient` / `submenuBorderWidth` / `submenuBorderStyle`,
and — on `nav-bar-menu` — `submenuBorderRadius` and the shadow attrs (`submenuShadow`,
`submenuShadowColour`). Clusters: `["fill","border","layout"]`. `"prefix": ""`, for the same reason
`sublink` carries it. ⛔ **No `states` key at all** — the panel has no hover and no current state for
any property.

**(d) The `item-separator` element (bar-only) claims the between-item divider.** Clusters
`["border"]`, `"prefix": "itemSeparator"`; base `css:border-right-color` / `-width` / `-style` →
`itemSeparatorColour` / `Width` / `Style`, and `states.hover` `css:border-right-color` →
`itemSeparatorColourHover` (FR-41-37). It is a GENUINELY SEPARATE element from `item`: it never
reads the item's own `itemBorderColour` / `itemBorderWidth` family.

**(e) The `burger` element carries nothing for `triggerMode` / `triggerLabel` / `triggerIcon` / the
three `triggerMagnet*` attributes.** None is a CSS property; they are content, structure or behaviour
attributes with no `attrMap` destination. Declaring them would create phantom routing slots. Its
`css:width`/`css:height` → `burgerSize` pair is unchanged by the non-icon modes — FR-41-12's
`width:auto` behaviour is a render-time branch on `triggerMode`, not a different attribute, and
FR-41-31's magnet emits `data-` attributes plus one static CSS rule, never a routed property.

**(f) No `underline` element exists.** The DB is derived from the manifest by `/sgs-update`; assert
via `/sgs-db` that **zero** rows carry `css_element='underline'` for `block_slug='sgs/nav-bar-menu'`
and `block_slug='sgs/nav-drawer-menu'` (§11 G11). An orphan `css_element` is exactly the drift the
manifest-conformance gate exists to catch, and it would route dead attribute names into the
classifier.

**(g) A `supports.sgs.sweepEligibility` key is declared per block — the shape in FR-41-26.** It is
the ONE declarative source both `edit.js` and the emitter read for the Sweep predicate; neither
surface re-derives the rule. Four notes:

1. ⛔ **It is NOT an `elements` entry and routes NOTHING.** It sits beside `colourExemptions` /
   `hideExtensions` / `boxFamilies` — the block's non-routing `supports.sgs` keys — and names no CSS
   property. Declaring it under `elements` would create phantom routing slots, the same failure
   §8.6(e) refuses for `triggerMode` / `triggerLabel`.
2. ✅ **Both read paths are proven.** PHP reads `supports.sgs.*`
   (`plugins/sgs-blocks/includes/helpers-container.php`, `plugins/sgs-blocks/includes/hover-effects.php`,
   `plugins/sgs-blocks/includes/image-controls.php`); JS imports the manifest — both blocks' `index.js`
   do this identically
   (`plugins/sgs-blocks/src/blocks/nav-bar-menu/index.js::metadata` and
   `plugins/sgs-blocks/src/blocks/nav-drawer-menu/index.js::metadata`).
3. ⚠ **Nothing in the tree constrains which keys `supports.sgs` may carry** (no key allowlist in the
   gate scripts). Adding a key is precedented and needs no schema change.
4. ⛔ **Every attribute NAMED in a row must exist in `attributes`, in that block's own `block.json`.**
   The `sweepEligibility` table is per block: the `burgerColourHoverTreatment` and
   `itemSeparatorHoverTreatment` rows exist only at
   `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::supports.sgs.sweepEligibility` (burger and
   separator are BAR-only), while `itemColourHoverTreatment` / `submenuColourHoverTreatment` /
   `itemBorderHoverTreatment` are declared identically in both blocks. A typo in a
   `blockingBackgroundAttrs` entry reads as permanently empty, so the predicate silently always passes
   and the eligibility rule quietly stops existing — a dead-detector shape with no error. Assert
   name-by-name against the declared attribute list (§11 G12).

---

## 9. The inspector — two tabs, exact layout

⛔ **This section is the control-by-control layout, and it is authoritative.** Every panel below is
the FULL set of controls this spec governs — nothing is summarised down to "unchanged" without also
stating what it contains. If an FR's prose and this section disagree, this section is what a builder
implements and the FR is the one to fix. Panels are named as they appear in the shipped inspector;
where a panel appears on one block only, that block is named.

Panel order within a tab is the order below. `SgsColourPanel` must be rendered **before** any other
same-group `<InspectorControls>` in `edit()`, because WordPress concatenates same-group Fills in
mount order (`SgsColourPanel.js`'s own docblock).

⛔ **Every control below names its actual component. There is no "dropdown" in this spec.** The
segmented-vs-select boundary is data-driven, not stylistic:
`plugins/sgs-blocks/src/components/TypographyControls.js::SGS_TYPOGRAPHY_SWITCHER_MAX_SEGMENTED` is
`3`, so 2–3 options is `ToggleGroupControl` and 4+ is `SelectControl`. `ToggleGroupControl` and
`ToggleGroupControlOption` are imported from `plugins/sgs-blocks/src/components/primitives`, which
each block's `edit.js` already imports from. The hover-treatment selector (FR-41-23) is the same
primitive at 2-3 options.

### TAB 1 — General

**9.1 Panel "Menu" (menu source)**

| Control | Component | Attribute | Default |
|---|---|---|---|
| Menu | `SelectControl` (WP menu picker) | `ref` | `0` |

**9.2 Panels "Burger Menu" (bar) and "List layout" (Design tab)**

| Control | Component | Attribute | Default |
|---|---|---|---|
| Show the burger on *(bar-only, "Burger Menu" panel)* | `ToggleGroupControl` — Always \| Tablet \| Mobile \| Custom; Custom reveals a `SgsLengthControl` "Switch to burger below" | `collapsePoint` | `768` |
| Item gap *("List layout" `ToolsPanel`)* | `SgsLengthControl` | `gap` | `"8px"` |
| Columns *("List layout", drawer only)* | `RangeControl` inside `ResponsiveControl` | `listColumns` | `{}` |
| Padding *("List layout")* | `ResponsiveBoxControl` | `padding` | `{}` |

**9.3 Panel "Menu Button"** *(bar-only; help text opens with the plain-English anchor — FR-41-12)*

> Help text, shown once at the top of the panel: *"Controls the button that opens the mobile menu
> (the 'burger')."*

| Control | Component | Attribute | Default |
|---|---|---|---|
| Icon *(shown when `triggerMode` is `icon` or `icon-and-text`)* | `IconPicker` (FR-41-30a) | `triggerIcon` | `{"source":"lucide","name":"menu"}` |
| Show as | `ToggleGroupControl` — **Icon \| Text \| Both** | `triggerMode` | `"icon"` |
| ↳ Label *(shown when not `icon`)* | `TextControl` (`__nextHasNoMarginBottom __next40pxDefaultSize`) | `triggerLabel` | `"Menu"` |
| Size | `SgsLengthControl` | `burgerSize` | `"44px"` |
| Magnetic pull | `ToggleControl` (FR-41-31) | `triggerMagnetEnabled` | `false` |
| ↳ Pull distance *(shown when on)* | `RangeControl` min 20 max 400 | `triggerMagnetRadius` | `120` |
| ↳ Pull strength *(shown when on)* | `RangeControl` min 2 max 80 | `triggerMagnetStrength` | `24` |

> Help text on the magnetic-pull toggle: *"Makes the menu button lean toward the visitor's cursor
> as they approach it. Off automatically on touch devices and when reduced motion is requested."*

⛔ **THE THIRD OPTION'S LABEL IS "Both", NOT "Icon and text" — and the STORED VALUE IS
`icon-and-text`.** "Icon and text" is 13 characters, over Spec 35 Part O's 12-character bound for a
2–4-option `ToggleGroupControl` (a bound derived from `burger-morph` on `sgs/nav-drawer`'s
`closeStyle`). Part O's remedy is to shorten the **LABEL**; ⛔ **never the VALUE**, which stays
`icon-and-text` so the open side and the close side share one vocabulary. See
`plugins/sgs-blocks/src/blocks/nav-bar-menu/BurgerPanel.js`
(`<ToggleGroupControlOption value="icon-and-text" label={ __( 'Both', 'sgs-blocks' ) } />`; the burger
is BAR-only) and, identically, `plugins/sgs-blocks/src/blocks/nav-drawer/edit.js`. ⚠ **Both blocks
carry the same shortening, on purpose.** If either label is re-lengthened, the control silently
truncates or wraps and the operator cannot read their own option.

**9.4 Submenu behaviour** *(bar-only; mounted in the bar's "Menu panel" panel)*

| Control | Component | Attribute | Default |
|---|---|---|---|
| Panel this burger opens | `SelectControl` | `drawerRef` | `0` |
| Open from | `SelectControl` — Start / Centre / End | `submenuAlign` | `"start"` |
| Show expand arrow | `ToggleControl` | `submenuCaret` | `true` |
| Close delay | `RangeControl` (ms) | `submenuCloseGrace` | `170` |

**9.5 Panel "Accessibility"** *(both blocks; carries `itemSmartContrast` — FR-41-27)*

| Control | Component | Attribute | Default |
|---|---|---|---|
| Navigation label | `TextControl` | `navLabel` | `""` |
| Keep text readable automatically | `ToggleControl` | `itemSmartContrast` | `false` |

Help text on the readability toggle: plain language, as FR-41-5 specifies — no "WCAG", no "contrast
ratio", no "AA".

**9.5a Device visibility** — present via the universal extension (§1.2). **Build nothing.**

### TAB 2 — Design

**9.6 Panel "Colour"** — ONE `SgsColourPanel`, sub-groupings via FR-41-16, every stateful row paired
with its hover-treatment selector (FR-41-23)

This is the framework's settled placement rule: every fill/text/link colour on a block lives in
`SgsColourPanel`. `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` each mount exactly one
(`plugins/sgs-blocks/src/blocks/nav-bar-menu/edit.js::Edit`'s `colourRows` and
`plugins/sgs-blocks/src/blocks/nav-drawer-menu/edit.js::Edit`'s own, trimmed `colourRows`). **Every
row with a Hover swatch renders its hover-treatment `ToggleGroupControl` directly beneath that
swatch** (FR-41-23).

| Grouping | Row | States | Attributes | Hover treatment (below the Hover swatch) |
|---|---|---|---|---|
| **Menu** | Nav background | Normal, Hover | `navBg` / `navBgHover` (+ `navBgGradient`) | *(none — single static wrapper, FR-41-23)* |
| | Nav text | Normal, Hover | `navColour` / `navColourHover` (+ `navColourGradient`) | *(none, same reason)* |
| | Item text | Normal, Hover, **Current** | `itemColour` / `itemColourHover` / `itemColourCurrent` (+ `itemColourGradient`; `itemColourHoverGradient` while `itemSmartContrast` is off) | None / Swap / **Sweep** — `itemColourHoverTreatment`. Sweep OMITTED when `itemColourGradient` is set (FR-41-26) |
| | Item background | Normal, Hover, **Current** *(Current omitted under Highlight — FR-41-14)* | `itemBg` / `itemBgHover` / `itemBgCurrent` (+ `itemBgGradient`, `itemBgHoverGradient`, `itemBgCurrentGradient`) | None / Swap / **Highlight** — `itemBgHoverTreatment`. Highlight paints in the row's OWN Hover swatch |
| | **Item border colour** (labelled "Item underline colour" on the bar) | Normal, Hover, **Current** | `itemBorderColour` / `…Hover` / `…Current` | None / Swap / **Sweep** — `itemBorderHoverTreatment` |
| | ↳ Sweep angle *(shown only when treatment = Sweep)* | — | `sweepAngle` (`AnglePickerControl` + preset dropdown) | — |
| | **Item separator colour** *(bar-only, FR-41-37)* | Normal, Hover | `itemSeparatorColour` / `itemSeparatorColourHover` | None / Swap / **Sweep** — `itemSeparatorHoverTreatment`; angle `itemSeparatorSweepAngle` shown under Sweep |
| **Submenu** | Panel background | Normal only | `submenuBg` (+ `submenuBgGradient`) | — (no Hover state to pair) |
| | **Panel border colour** | Normal only | `submenuBorderColour` (+ `submenuBorderColourGradient`) | — (Normal-only surface, FR-41-9) |
| | Link text | Normal, Hover, **Current** | `submenuColour` / `submenuColourHover` / `submenuColourCurrent` (+ `submenuColourGradient`) | None / Swap / **Sweep** — `submenuColourHoverTreatment`. Sweep OMITTED when the link paints its own background **in ANY of its three states** or carries its own text gradient (FR-41-26) |
| | Link background | Normal, Hover, **Current** | `submenuLinkBg` / `…Hover` / `…Current` (+ `submenuLinkBgGradient`) | None / **Swap only** — `submenuLinkBgHoverTreatment` (2-option row, FR-41-23) |
| | Link border colour | Normal, Hover | `submenuLinkBorderColour` / `submenuLinkBorderColourHover` | — |
| | Sublink marker colour *(drawer-only, FR-41-30b)* | Normal, Hover, **Current** *(revealed once `sublinkMarkerIcon` is non-default)* | `sublinkMarkerColour` / `…Hover` / `…Current` (+ 3 gradient counterparts) | — |
| **Menu button** *(bar-only)* | Icon colour | Normal, Hover | `burgerColour` / `burgerColourHover` (+ `burgerColourGradient`) | None / Swap / **Sweep** — `burgerColourHoverTreatment`. Sweep OMITTED under `triggerMode:'icon'`, or when the button paints its own background **in EITHER state — `burgerBg` resting or `burgerHoverColour` on hover** — or carries its own icon gradient (FR-41-26) |
| | Button background | Normal, Hover | `burgerBg` / `burgerHoverColour` (+ `burgerBgGradient`) | None / **Swap only** — `burgerBgHoverTreatment` (2-option row) |
| **Featured** | *(out of scope, §1.2)* | | | |

> ⓘ **Cross-reference note rendered beneath the Item text and Item background rows (FR-41-5 /
> FR-41-27):** *"Automatic readable-text checking for these colours is switched on under General →
> Accessibility."* Without it the toggle governs these two rows from another tab with nothing here
> pointing at it, which reads as the control having been dropped. **Gated: §11 G16.**

> ⓘ **Cross-reference note rendered beneath the Item border colour row's hover-treatment selector
> (FR-41-6):** *"This changes the line around the item. To underline the menu word itself instead,
> use Decoration (hover) under Typography — they're separate settings and don't do the same thing."*
>
> ⛔ **This note is RENDERED in the inspector, not merely stated in this spec.** FR-41-6 holds in bold
> that the border treatment and the hover typography trio must never be presented as the same control
> in different clothes — and an operator meets them in the editor, not in a document. A distinction
> that lives only in prose is left implicit at the exact place it matters. It is the twin of the §9.10
> note below; **neither ships without the other**, or one control points at a partner that never
> points back. **Gated: §11 G19(e).**

⛔ **There is no "Indicator" panel and no indicator-colour row (FR-41-25).** The Highlight treatment
paints in `itemBgHover` / `itemBgHoverGradient` — the same swatch Swap reads — per the colour-reuse
rule in §0.

✅ **Border colour is a row in this panel (FR-41-33).** Both border-colour rows above are ordinary
`SgsColourPanel` rows in the same row style as fill and text — not a duplicate control, because
`SgsBorderControl` is mounted with `showColour={ false }` in §9.7/§9.9 and offers no swatch. Each
carries `contrastAgainst` with `contrastLargeText: true` (WCAG 1.4.11 UI-component case at 3:1, never
body text).

⛔ **Mega Menu colours are NOT in this panel and are not touched by this spec.**

**9.7 Panel "Menu item"** *(border SHAPE lives here as a subsection; border COLOUR lives in the
Colour panel — FR-41-33)*

**Decision, stated once.** Width, style and radius sit here, as a labelled **Border** control inside
the "Menu item" panel, rendered by `SgsBorderControl` with `showColour={ false }`. **Colour (all three
states) lives in the global Colour panel** (§9.6), as an ordinary row in the same style as item fill
and item text — NOT inside the `SgsBorderControl` composite.

⚠ **This is a considered, block-scoped EXCEPTION to a real framework rule, not an oversight of it.**
`SgsColourPanel.js`'s own docblock names border colour as one of exactly three documented exemptions
(alongside overlay and shadow colour), and the reasoning behind that exemption is sound in general:
those three pair a colour with a genuinely non-colour sibling that `SgsColourPanel` has no slot for.
The exception is taken here on its own merits: **this block's entire design is built around comparing
every element's colours side by side across three states**, and border colour is exactly the kind of
colour that has to visually coordinate with the fill and the text beside it. An operator matching a
Current-state border to a Current-state text colour should not have to hold one value in their head
while opening a second panel. The width/style/radius siblings do not need that comparison and stay
where they are.

⛔ **The split is EXCLUSIVE — exactly one control writes each attribute.** `showColour={ false }`
suppresses `SgsBorderControl`'s own swatch entirely, so `check-duplicate-controls.js` sees one writer
per attribute. Do not render the swatch "for convenience"; a duplicate live control writing the same
attribute from two panels is banned.

| Subsection | Control | Component | Attribute | Default |
|---|---|---|---|---|
| **Border** | Border | `SgsBorderControl` with **`showColour={ false }`** — per-side width (base only) + style (the shared `BorderStyleControl`, mounted as its own sibling, FR-41-2b / FR-41-33 item 2) + radius via `radiusValues`/`onRadiusChange` with `showRadiusResponsive={ false }`. **No colour swatch.** | `itemBorderWidth` / `itemBorderStyle` / `itemBorderRadius` | `{}` / `"solid"` / 8px corner object |
| | *(colour)* | *(see §9.6 "Menu" grouping — Item border colour, 3 states, with its own hover-treatment selector and sweep angle beneath it)* | `itemBorderColour` + `…Hover` / `…Current` | `"border-light"` / `"accent"` / `"accent"` |

**The same border mechanism applies identically in the bar and the drawer (FR-41-28).** No
per-layout-mode branching exists.

**9.7a Panel "Item separator (bar)"** *(bar-only, FR-41-37)*

| Control | Component | Attribute | Default |
|---|---|---|---|
| Width | `TextControl` (a CSS length, e.g. `1px`; empty clears the separator) | `itemSeparatorWidth` | `""` |
| Style | `SelectControl` — Solid \| Dashed \| Dotted | `itemSeparatorStyle` | `"solid"` |

The separator's colours are the "Item separator colour" row in §9.6.

**9.8 Panel "Submenu — Items"** *(drawer-only)*

Everything specific to the LINKS inside the drawer's submenu, as distinct from the panel container
itself (§9.9). Colour rows live in §9.6's Colour panel per the framework's placement rule; this panel
cross-references them rather than duplicating controls, exactly as §9.7 does for border colour.

| Subsection | Control | Component | Attribute | Default |
|---|---|---|---|---|
| Colour | *(see §9.6 "Submenu" grouping — link text, link background, hover treatments, sublink marker colour, and the panel's own border colour)* | — | — | — |
| Marker icon | Icon | `IconPicker` (FR-41-30b) | `sublinkMarkerIcon` | `{"source":"lucide","name":"chevron-right"}` |
| Typography | *(see the Typography panel's "Submenu" target, §9.10 / FR-41-22)* | — | — | — |
| Spacing | *(no distinct submenu-LINK padding attribute exists — `submenuPadding` belongs to the PANEL, §9.9. Named as a gap, not fabricated: see §12.)* | — | — | — |

**9.9 Panel "Submenu — Container"** *(a `ToolsPanel`; both blocks, with the bar-only rows marked)*

Every row is a `ToolsPanelItem` with `hasValue` / `onDeselect`.

| Control | Component | Attribute | Default |
|---|---|---|---|
| Open animation *(bar-only)* | `ToggleGroupControl` — None \| Fade \| Slide | `submenuAnimation` | `"fade"` |
| Distance below the bar *(bar-only)* | `SgsLengthControl` with `presets={ false }` | `submenuTopOffset` | `""` |
| Minimum width *(bar-only)* | `SgsLengthControl` with `presets={ false }` | `submenuMinWidth` | `""` |
| Inner spacing | `ResponsiveBoxControl` | `submenuPadding` | `{}` |
| Border | `SgsBorderControl` with **`showColour={ false }`** — width + style (+ radius on the bar) only, matching §9.7. Its colour is a Normal-only row in §9.6's Submenu grouping (FR-41-33) | `submenuBorderWidth` / `submenuBorderStyle` / `submenuBorderRadius` (bar) | `{}` / `""` / `{}` |
| Link border | `SgsBorderControl` with **`showColour={ false }`** — the submenu ROW separator's width + style | `submenuLinkBorderWidth` / `submenuLinkBorderStyle` | `{"bottom":"1px"}` / `"solid"` |
| Box shadow *(bar-only)* | `ShadowControl` with `attrNames={ shadowAttrKeys( 'submenuShadow' ) }` | `submenuShadow` + `submenuShadowColour` | `""` |

Radius rides the border control's radius half; there is no flat `submenuRadius` control.

**The panel is single-state throughout, and the reasoning is one reasoning.** Background, border and
shadow all take Normal only — see FR-41-9. The point of a shadow is to make the floating dropdown look
*lifted*; a floating panel is either rendered (open) or absent (closed), with no meaningful hover or
current state. ⛔ Do not give the panel's border-colour row a Hover or Current state; a multi-state
picker on a surface that has one state is a control the client can reach and that does nothing.

⚠ **Shadow colour stays with `ShadowControl` and is NOT moved into `SgsColourPanel` by FR-41-33.** The
border exception is taken on the *comparison* argument (§9.7) — an operator matching a border colour
against the fill and text beside it. A floating panel's shadow colour has nothing to compare against
in that row set: it is a Normal-only property of a surface with no state, on an element whose other
colours are already Normal-only. Extending the exception to it would buy nothing and would break
`ShadowControl`'s own preset behaviour, where a chosen preset carries its own colour.

⚠ `ShadowControl` renders its colour picker itself, inside `ShadowStateBuilder`; only the ATTRIBUTE is
caller-owned. Externalised OWNERSHIP is proven; externalised RENDERING is not, so §9.9 keeps the picker
inside the control.

Reuse, do not rebuild: `plugins/sgs-blocks/src/components/ShadowControl.js::ShadowControl` for the
shape builder, and `plugins/sgs-blocks/includes/helpers-tokens.php::sgs_shadow_value_composed` for the
PHP shape+colour composition. `shadowAttrKeys( 'submenuShadow' )` with **no options** returns exactly
`{ base: 'submenuShadow', colour: 'submenuShadowColour' }` — the documented single-state form.
Reference mount for that shape: `plugins/sgs-blocks/src/blocks/info-box/edit.js::Edit`. The PHP twin
`plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_shadow_attr_map` (called as
`sgs_shadow_attr_map( 'submenuShadow' )`) takes the same no-options call — **both sides must carry the same opt-in**, or JS binds a key the block never
declares and the editor silently discards every write to it.

⛔ **Shadow is gradient-exempt by mechanism** — a shadow takes a colour; a gradient there is invalid
CSS the browser drops. `inspector-scan` rule 31 encodes that exemption centrally. Declare nothing
per-block.

**9.10 Panel "Typography"** *(sits directly under the Colour and List-layout panels in the Design tab)*

The Menu/Submenu `targets` switcher — see FR-41-22 for the full attribute family and the
`TypographyTargetSwitcher` mechanics. Control-by-control layout:

| Control | Component | Applies to |
|---|---|---|
| Target | `ToggleGroupControl` — Menu \| Submenu (2 targets, at the `SGS_TYPOGRAPHY_SWITCHER_MAX_SEGMENTED` threshold). On the bar a third **Menu button** target (font family, transform, letter spacing) appears when `triggerMode` is not `icon` | Selects which attribute family the controls below write |
| Font family | `TypographyControls`' font-family picker | `{prefix}FontFamily` |
| Font size (+ responsive tiers) | `ResponsiveControl` wrapping `UnitControl` | `{prefix}FontSize` (a tier object — §8.4a) |
| Weight / Style | native `SelectControl`s | `{prefix}FontWeight` / `{prefix}FontStyle` |
| Line height | `UnitControl` | `{prefix}LineHeight` |
| Decoration / Transform / Letter spacing / Text align / Text wrap / Text columns / Writing mode | native controls, per `TypographyControls`' standard field set — Normal state | `{prefix}TextDecoration` / `…Transform` / `…LetterSpacing` / `…TextAlign` / `…TextWrap` / `…TextColumns` / `…WritingMode` |
| **Decoration (hover) / Transform (hover) / Weight (hover)** | the three `SelectControl`s `TypographyControls` renders in ONE `<Flex>` row when `showHover: true` — fed `SGS_TEXT_DECORATION_OPTIONS` / `SGS_TEXT_TRANSFORM_OPTIONS` / `SGS_FONT_WEIGHT_OPTIONS`. ⛔ Not three hand-rolled controls — the flag renders them | `{prefix}TextDecorationHover` / `…TextTransformHover` / `…FontWeightHover`, all defaulting `""` |

(`showTextIndent` is `false` on both targets: text indent is never emitted for nav links.)

✅ **The hover trio row is present on BOTH targets — `showHover: true` on each `targets` entry
(FR-41-6 / FR-41-21 / FR-41-22).** Six attributes are declared (§8.4) and emitted block-privately
(FR-41-21).

⛔ **How this row must be described, in help text and in every future edit of this spec.** It is an
**optional secondary decoration**. It is **not** the block's non-colour hover signal — that is the
item border row's own treatment selector in the Colour panel (§9.6) — and it is **not** an
alternative way of authoring the divider. A hover underline here paints a baseline-hugging
glyph-width decoration; the divider is a full-width edge treatment. Never present them as the same
control in different clothes.

> ⓘ **Cross-reference note rendered beneath the hover trio row (FR-41-6) — the twin of the §9.6 note,
> and neither ships without the other:** *"These change how the menu word itself looks on hover. For a
> line across the whole item, use the item border's hover setting in the Colour panel instead."*

**The help-text strings are the BINDING wording, not a description of what the wording should
contain.** FR-41-6 requires that this distinction never be left implicit and that the reflow caution
be in plain language; a binding wording requirement with no wording is unbuildable. Adjust for
sentence rhythm if the surrounding UI copy demands it; do not adjust away the distinction either one
carries.

| Control | Help text (verbatim) |
|---|---|
| **Decoration (hover)** | *"Underlines the menu word itself on hover — not a full-width line. For a line under the whole item, use the border's hover setting in the Colour panel instead."* |
| **Weight (hover)** | *"Makes the word bolder when you point at it. Bolder text is a little wider, so the items to its right will shift across slightly as you move along the menu."* |

⛔ **Neither string may name WCAG, "contrast ratio", "AA", "signal" or "divider"** — the same
client-visible-string rule FR-41-5 applies to the readability toggle. ⛔ And the Decoration string
must not be softened into *"another way to underline"*: it says what the control does and where the
other thing lives, which is what stops the two reading as one control in two places.

⚠ **The Weight (hover) caution is operator guidance, not a blocker** — it states the trade-off and
leaves the choice, per FR-41-6 consequence 3. It does not disable the control, warn on selection, or
gate the value.

**Block-private field, Menu target ONLY, at the bottom of that target's control set** (FR-41-29 — NOT
part of the shared `TypographyControls` component, a plain block-owned `SelectControl`):

| Control | Component | Attribute | Default |
|---|---|---|---|
| Current-page weight | `SelectControl` fed `SGS_FONT_WEIGHT_OPTIONS` | `itemFontWeightCurrent` | `"600"` |

Help text on that row says, in plain language, that it is what keeps the menu usable for someone who
cannot tell two colours apart, and that its hover counterpart is the item border's own hover
treatment in the Colour panel.

Every control that governs an item's state signal has a named home: the hover decoration / transform /
weight fields in the `showHover` trio row above, the Current-page weight field below it, and
`itemSmartContrast` in §9.5. Only `itemTextDecorationCurrent` has no control — FR-41-6 consequence 2.

**9.11 Panel "Effects"** — `itemMagnetEnabled` ("Magnetic hover pull").

**9.12 Panel "Featured"** — out of scope (§1.2).

**9.13 Panel "Mega menu (drawer)"** *(drawer-only)* — out of scope (§1.2).

---

## 10. WCAG contrast, follow-ups + comment hygiene

### FR-41-17 — The warn-only contrast check applies to every row

`contrastAgainst` / `contrastLabel` feed
`plugins/sgs-blocks/src/components/GradientCapableColourControl.js`'s live luminance-ratio check.
Every 3-state row carries both props through with **identical behaviour**: it warns, it never blocks
a colour, it never alters a colour, and it is ignored on a row that is not `gradientCapable` (a plain
`DesignTokenPicker` has no contrast check).

The caller owns working out *which background is actually behind this text* — there is no general
answer a row builder can derive. For `sgs/nav-bar-menu` / `sgs/nav-drawer-menu`: item text contrasts
against `itemBg` (resting), `itemBgHover` (hover) and `itemBgCurrent` (current); submenu link text
contrasts against `submenuLinkBg` and, where that is unset, `submenuBg`.

⚠ **The two border-colour rows in the Colour panel carry `contrastLargeText: true`.**
`SgsBorderControl` defaults that flag to `true` for its own callers precisely because a border is a
WCAG 1.4.11 UI-component case at 3:1, never body text. Because the row lives in `SgsColourPanel`, not
in that control, the obligation to set the flag sits on the row descriptor — set it explicitly, per
row, and do not inherit `GradientCapableColourControl`'s own `false` default by omission.

⚠ **This does not overlap FR-41-5's smart contrast.** That one lives in the emitter and *changes the
rendered colour*; this one lives in the editor and only *warns*. They coexist.

⛔ **FR-41-17 checks a foreground against its BACKGROUND. It does not check two foreground states
against EACH OTHER, and nothing in this spec does.** See the residual risk below.

### FR-41-17a — Residual, accepted risk: colour-only state signals

**Four** distinct cases, all accepted, all named rather than papered over. (a) and (b) are the
colour-only-signal pair; (c) and (d) are Sweep-specific — they belong here because both end in the
same place: a state with no visible signal.

**(a) The default case — no border, no Hover signal.** `itemBorderWidth` defaults to `{}`, so an
untouched block ships no border and therefore no non-colour Hover signal at all (FR-41-6). Current
still ships its `"600"` weight. This is accepted because an unrequested underline on every menu item
of every install is a design imposition the owner rejected, and one border-width entry supplies the
signal. ⚠ **`itemTextDecorationHover` does NOT close this case and must not be recorded as closing
it.** It defaults to unset (§8.4), precisely so it does not impose an underline; an operator who sets
it has added a second signal by choice, which is not the same as one shipping.

**(b) The switched-off case.** An operator can set `itemColourHover` and `itemColourCurrent` to two
perceptually similar colours **and** leave the border width empty **and** clear
`itemFontWeightCurrent`. At that point Hover and Current are distinguished by colour alone, at a
difference the operator may not be able to see and a colour-blind visitor certainly cannot — an SC
1.4.1 failure the inspector never warns about.

**(c) The `color-mix`-less browser under Sweep on the menu button.**
`plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css`'s `@supports not (background-color: color-mix(…))`
fallback paints `background-color: rgba(128,128,128,0.12)` on `.sgs-nav-bar-menu__burger:hover` /
`:focus-visible`. On the narrow intersection of browsers that support `background-clip: text` but NOT
`color-mix`, that hover fill is clipped to the glyph shapes while the Sweep runs. **Not gated by
FR-41-26's condition 1**, and the reasons are stated there in full: it is a longhand (the sweep
survives, the failure is cosmetic), and no attribute controls it, so a per-row predicate has nothing
to read — gating on it would withdraw Sweep from the menu button on every browser, permanently. ⛔ Do
not close this by deleting the fallback; it is the non-`color-mix` rescue for the button's ordinary
hover state and serves a case that has nothing to do with Sweep.

**(d) The Sweep fallback with an empty Hover swatch.** When the eligibility predicate turns false at
render time, the treatment resolves to `'swap'` and emits the row's Hover swatch — and if that swatch
is empty, **nothing is emitted and the property has no visual hover change at all.** Reachable in one
legal step, described in full at FR-41-26. It is accepted because every alternative is worse:
substituting a colour would be a hardcoded render default the operator cannot clear
(`check-hardcoded-render-defaults.js` F3b), and refusing the fallback would leave the clip defect the
fallback exists to prevent. ⚠ **It is narrower than (a) and (b):** the item border's own Hover
treatment is unaffected and remains the block's primary non-colour signal (FR-41-6), so this bites
only on a border-less menu. Closed by one swatch entry, by the same operator, in the same panel.

**All four are accepted residual risks, not covered work.** FR-41-17 does not cover (a) or (b): it
measures each colour against the background behind it, which both of these may pass comfortably while
being indistinguishable from one another. No control in this spec warns at the point of switching a
signal off.

**The fix, if it is ever taken, is a distinct piece of work** — extend the warn-only contrast UI to
also flag *perceptual similarity between two state colours on the same element* when every non-colour
signal for those states is off. It is a new comparison (state-vs-state, not state-vs-background), a
new trigger condition, and a new string. It is not FR-41-17 with a wider input, and it must not be
described as such.

⛔ **Do not close this by removing the operator's ability to switch the signals off, and do not close
case (a) by re-defaulting `itemBorderWidth` to a non-empty value.** Shipping every install a border
nobody asked for is the same imposition, wearing different clothes. A client who leaves the border
empty or clears the Current weight has made a choice in their own inspector; documenting the risk is
the honest answer, not removing the choice.

### FR-41-18 — "Auto-adjust for readability" — a SEPARATE, EXPLICITLY NON-BLOCKING follow-up

**Status: NOT BUILT** (§0a.3). ⛔ This FR does NOT block any other requirement in this spec.
Everything else ships whether or not it exists.

**What it is.** An optional per-colour-row toggle. When on, the colour the operator picks is nudged
toward the nearest WCAG-AA-safe value against the resolved background. **Off by default** — a client's
picked colour is never silently changed unless they asked for it.

| Aspect | Decision |
|---|---|
| Attribute | `{attrName}AutoAdjust`, boolean, default `false`, one per row that offers it |
| Placement | Inside the row's own popover, beneath the states |
| Scope | Only rows that already supply `contrastAgainst` |
| Direction | Nudge toward AA; never past it into a colour the operator would not recognise |
| Storage | Store the **operator's original pick**; adjust at render. Overwriting the stored value would make the toggle irreversible. |

Help text plain language, e.g. *"Automatically brightens or darkens your chosen colour just enough to
stay easy to read against the background behind it. Your original colour is kept — switch this off to
go back to it."*

### FR-41-19 — Code comments state what the code does

The `supports.sgs.elements.item._note` and `…sublink._note` in
`plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json` and
`plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json` state the current-page mechanism and name
`itemColourCurrent` / `itemBgCurrent` / `itemFontWeightCurrent`. The `sublink._note` states that the
`"prefix": ""` stands and that `submenu`-prefixed typography attributes reach the element through
explicit `attrMap` entries (§8.6b / FR-41-22). The citation in these comments is `FR-35-5`, not
`FR-36-5` — read it in the file before editing.

⛔ **No retirement narration in active comments** (the `no-retirement-narration-in-active-comments`
anti-pattern). Each note states what the code does now.

### FR-41-20 — Ancestor Current styling is built in CSS; there is no ARIA active-trail

**What is built.** When a descendant submenu link is the current page, its ancestor top-level item
renders the item's own Current declarations — colour, background (on `::before`), border colour and
weight — by re-using the literal Current declarations, never a diluted third look. The selectors are
`.{bem_root}__submenu-root:is(:has(ul.{bem_root}__submenu a[aria-current="page"]), [data-sgs-nav-has-current]) > .{bem_root}__link:not(:hover):not(:focus-visible)`
on the bar and
`.{bem_root}__accordion-row:has(ul.{bem_root}__submenu a[aria-current="page"]) > .{bem_root}__link:not(:hover):not(:focus-visible)`
on the drawer, emitted by
`plugins/sgs-blocks/includes/nav-menu-css.php::sgs_nav_shared_item_state_css`. The trailing
`:not(:hover):not(:focus-visible)` is what guarantees hover always wins over a propagated-Current
ancestor — not specificity: the `:has()` selector's own specificity outranks the item's plain hover
rule. The bar-only `[data-sgs-nav-has-current]` fallback exists because
`plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js` moves the panel to `<body>` while
a page-embedded dropdown is open, which breaks the `:has()` descent; that script mirrors the fact onto
the never-moving `.submenu-root` for exactly the duration of the move. The drawer never reparents, so
it needs no equivalent.

**What is not built.** `plugins/sgs-blocks/src/blocks/nav-bar-menu/view.js::markCurrentPage` and
`plugins/sgs-blocks/src/blocks/nav-drawer-menu/view.js::markCurrentPage` normalise
`window.location.pathname` and mark a link only on **exact path equality**. A parent item whose
*child* page is current receives **no `aria-current` marking**, so assistive technology gets no
ancestor signal, and there is no ancestor-path data from which one could be derived without a second
mechanism. Spec 36 FR-36-4's clause names both the visual and the semantic trail; the visual half has
a mechanism here, the semantic half does not.

Building the semantic half would need an ancestor-path list emitted per item at render time (the menu
tree is known server-side, so this is cheap), plus a client-side prefix match in `markCurrentPage`
stamping a distinct signal — **not** `aria-current="page"`, which is single-valued per page and
belongs to the exact link. It is a coherent, self-contained piece of work and it is **not in this
spec's scope**.

---

## 10a. Typography

### FR-41-21 — The `showHover` trio has no shared PHP emitter, so these blocks emit it themselves

The `showHover` flag is switched on, on both targets of both blocks (FR-41-6), so the trio must be
emitted — and the shared helper cannot do it. **The block-private emit at the end of this FR is
BUILT.** The prohibition stands: do not extend `sgs_typography_css_rule()` as part of this spec.

Facts this rests on, each re-checkable:

- `plugins/sgs-blocks/src/components/TypographyControls.js::TypographyControls` accepts
  `showHover = false` and, when true, renders exactly three `SelectControl`s in one `<Flex>` row —
  "Decoration (hover)" (`SGS_TEXT_DECORATION_OPTIONS`), "Transform (hover)"
  (`SGS_TEXT_TRANSFORM_OPTIONS`) and "Weight (hover)" (`SGS_FONT_WEIGHT_OPTIONS`) — writing
  `k.textDecorationHover` / `k.textTransformHover` / `k.fontWeightHover`. Its own comment states the
  opt-in condition: *"only render for a block that DECLARES + renders the `{prop}Hover` companions,
  else the dead-control gate flags it."*
- **`sgs_typography_css_rule()` has no hover branch of any kind.** The only `:hover` emission in
  `plugins/sgs-blocks/includes/helpers-typography.php` belongs to `sgs_link_colour_css()`, a different
  function for link *colour* (`sgs_hover_state_rules( $link_selector, $hover_decl )`). Nothing in it
  reads `{prefix}TextDecorationHover`, `{prefix}TextTransformHover` or `{prefix}FontWeightHover`.
- **`showHover: true` is adopted only by these two blocks.**
  `git grep -n "showHover" -- plugins/sgs-blocks/src '*.js'` returns the component's own definition and
  the two blocks' `edit.js` files.

⚠ **`typographyAttrKeys( prefix )` returns all three hover key names** (`fontWeightHover` /
`textDecorationHover` / `textTransformHover`, with the file's own comment: *"Consumed only when
showHover is enabled AND the block declares + renders them"*), so the attribute NAMES are the shared
contract — these blocks invent none of them. Only the rendering half is block-private.

**The emitter cost is the single biggest hidden cost in adopting `showHover`, and these blocks pay
it.** Switching `showHover` on without emitting the attributes creates dead controls and fails
`check-dead-controls.js` — six of them, three per prefix. So the emit below is not optional polish; it
is what makes the six declared attributes legal. The flag is all-or-nothing (it renders three
controls together), so six attributes, six controls (three per target, from ONE flag per target), and
one block-private emitter is the shape.

**The block-private emit.** One `sgs_hover_state_rules()` call per prefix, composing whichever of the
three declarations are set:

```php
sgs_hover_state_rules( $link_sel,    '<font-weight/text-decoration/text-transform decls>', ':focus-visible' );
sgs_hover_state_rules( $sublink_sel, '<same, submenu prefix>',                              ':focus-visible' );
```

⛔ **Each value is validated against the SAME allowlist the base path applies, and the allowlists are
read from `sgs_typography_css_rule()` rather than invented.** They are inline arrays inside that
function — there is no exported constant to import, so the block-private emitter reproduces the three
checks literally:

| Property | Check the base path applies | Emitter applies |
|---|---|---|
| `text-decoration` | `in_array( $v, [ 'none', 'underline', 'line-through', 'overline' ], true )` | the same four |
| `text-transform` | `in_array( $v, [ 'none', 'uppercase', 'lowercase', 'capitalize' ], true )` | the same four |
| `font-weight` | `preg_replace( '/[^a-z0-9]/i', '', (string) $v )` | the same strip |

⚠ **Duplicating a three-line allowlist locally is the accepted cost of NOT extending the shared
helper** — it is three lines with zero blast radius, against a design-gated change to a helper with
callers across most of the block library. If the base path's allowlists change, this emitter changes
in the same commit; §12 keeps the shared-helper extension open as the better long-term fix.

⛔ **A hover value that is set but not permitted emits NOTHING — it never falls back to the base
value.** Falling back would repaint the resting declaration inside a `:hover` rule, which is invisible
when it agrees with the base and a silent override when it does not.

⚠ **Emit through `sgs_hover_state_rules()`, never a bare `{sel}:hover`** — the helper carries both
touch guards and splits `:focus-visible` out unguarded (FR-41-3 rule 1). A stuck hover weight on a
touchscreen reflows the bar and stays reflowed until the visitor taps elsewhere.

⛔ **Do NOT extend `sgs_typography_css_rule()` to carry the trio as part of this spec.** It is a shared
helper with callers across most of the block library; adding a hover branch to it is a design-gated
change with real blast radius, and it would make this spec's acceptance depend on re-verifying every
one of those callers. The block-private emit costs two lines and has zero blast radius. The shared
extension is a legitimate follow-up and is named in §12.

**Where it lives.** The helper is
`plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php::sgs_nav_shared_typography_hover_rule` and,
identically, `plugins/sgs-blocks/src/blocks/nav-drawer-menu/render.php::sgs_nav_shared_typography_hover_rule`
— each defined inside its own `function_exists()` guard (a top-level function declaration in a
per-instance include fatals on the second instance). Its signature is
`( array $attributes, string $prefix, string $selector, string $sweep_hover_colour = '' )`; the fourth
parameter is how FR-41-26's "the underline must travel too" rule reaches it. The "block-private, not a
shared helper" ruling holds — it is private to these two blocks. ⚠ **Its two CALLERS live in other
files** — `plugins/sgs-blocks/includes/nav-menu-css.php` (prefix `item`, on `$link_sel`) and
`plugins/sgs-blocks/includes/nav-menu-submenu-link-css.php` (prefix `submenu`, on `$sublink_sel`).
⚠ **That is safe only because those modules merely DEFINE functions at include time and call this one
at render time**, by which point `render.php`'s own top level has already declared it. ⛔ **Do not
relocate the definition into one of the two modules** — the other module does not `require_once` its
sibling, so it would be calling an undefined function on any page where the ordering differs.

### FR-41-22 — Submenu typography: the Items panel is a Menu / Submenu switcher

The sublink (`.{bem_root}__sublink`) has its own typography controls, so an operator can make dropdown
links a step smaller than the bar.

**The switcher itself is not new component work.** `TypographyControls`' `targets` prop already exists
and is adopted by other blocks — `card-grid`, `icon-list`, `option-picker`, `pricing-table`,
`product-card`, `team-member`, `testimonial`, `trust-bar`. Reference implementation to copy:
`plugins/sgs-blocks/src/blocks/card-grid/edit.js::Edit`'s Title/Subtitle two-target switcher. At two
targets it renders a `ToggleGroupControl` (the threshold is
`SGS_TYPOGRAPHY_SWITCHER_MAX_SEGMENTED = 3`).

⛔ **In `targets` mode, per-field flags MUST live on each target entry, not on the outer element.**
When `targets.length > 1`, `plugins/sgs-blocks/src/components/TypographyControls.js::TypographyControls`
renders `<TypographyTargetSwitcher attributes setAttributes targets />` and **discards `singleProps`
entirely**; `TypographyTargetSwitcher` then destructures `{ key, label, prefix, ...fieldProps }` from
the selected target and forwards only `fieldProps`. Leaving the `show*` flags on the outer element
would **silently delete the working controls**. Each target must also carry its own `prefix` — the
switcher reads `prefix` from the target, never from the outer props.

The mount:

```js
<TypographyControls
  attributes={ attributes }
  setAttributes={ setAttributes }
  targets={ [
    {
      key: 'item',
      label: __( 'Menu', 'sgs-blocks' ),
      prefix: 'item',
      fontSizePresets: true, showFontFamily: true, showDecoration: true,
      showTransform: true, showLetterSpacing: true, showTextAlign: true,
      showTextWrap: true, showTextColumns: true, showTextIndent: false,
      showWritingMode: true,
      showHover: true, // FR-41-6 / FR-41-21
    },
    {
      key: 'submenu',
      label: __( 'Submenu', 'sgs-blocks' ),
      prefix: 'submenu',
      fontSizePresets: true, showFontFamily: true, showDecoration: true,
      showTransform: true, showLetterSpacing: true, showTextAlign: true,
      showTextWrap: true, showTextColumns: true, showTextIndent: false,
      showWritingMode: true,
      showHover: true, // FR-41-6 / FR-41-21
    },
  ] }
/>
```

(`showTextIndent: false` because text indent is never emitted for nav links; the attribute is kept.
The bar adds a third **Menu button** target when `triggerMode` is not `icon`.)

⛔ **`showHover` goes on EACH TARGET ENTRY, never on the outer element** — the same rule as every other
`show*` flag, for the same reason: in `targets` mode `TypographyControls` discards `singleProps`
entirely. A `showHover` left on the outer element renders no trio on either target while every gate
stays green, because six declared-and-rendered attributes with no control is the INVERSE shape
`check-dead-controls.js` looks for.

**Three requirements:**

**(a) Declare the full `submenu*` typography family in `block.json`**, matching
`typographyAttrKeys( 'submenu' )`'s naming exactly — that function is the contract, and a key that
does not match it is a control writing to an attribute nothing reads:

`submenuFontFamily` · `submenuFontSize` · `submenuFontSizeUnit` · `submenuFontWeight` ·
`submenuFontStyle` · `submenuLineHeight` · `submenuLineHeightUnit` · `submenuTextDecoration` ·
`submenuTextTransform` · `submenuLetterSpacing` · `submenuLetterSpacingUnit` · `submenuTextAlign` ·
`submenuTextWrap` · `submenuTextColumns` · `submenuTextIndent` · `submenuWritingMode`.

⛔ **`submenuFontSize` and `submenuLetterSpacing` are declared `{"type":"object","default":{}}` — the
TIER OBJECT shape — and there are NO `submenuFontSizeTablet` / `submenuFontSizeMobile` siblings.**
§8.4a explains why. `TypographyControls` and `sgs_typography_css_rule()` each branch on whether the
stored value is an ARRAY/object, and the object branch keeps all three tiers inside the one attribute.
The item family is already in that shape (`itemFontSize` and `itemLetterSpacing` are both object-typed
with no tier siblings); a NEW family authored in the legacy flat shape would be born
pre-migration debt that `migrate-tier-object.py` would later have to undo. ⛔ **Mirror the item
family's shapes exactly** — the contract is the KEY NAME function, not a guarantee that every key it
can name is one this block uses.

⚠ **`submenuLineHeight` mirrors `itemLineHeight` as `{"type":"number"}`** — un-migrated on both
prefixes, deliberately kept symmetrical. ⛔ Do not give the submenu a tier-object line height the item
does not have: an asymmetry between the two targets of one switcher is a defect the operator sees
directly (per-device line height on Submenu, none on Menu, from the same panel). Both migrate
together, via the codemod, outside this spec.

✅ **PLUS the three `showHover` companions (FR-41-6 / FR-41-21):**
`submenuTextDecorationHover` · `submenuTextTransformHover` · `submenuFontWeightHover`, each
`"type": "string"`, default `""`. `typographyAttrKeys( 'submenu' )` already returns these three key
names, so they are part of the same contract as the family above.

⛔ **All three of "flag set", "attributes declared" and "render emit present" go together.** Declaring
the attributes without the flag is attributes no control writes; setting the flag without them is
controls nothing renders; doing both without (b) below is six dead controls. Never one or two of the
three.

**(b) The render calls.** The base call is
`plugins/sgs-blocks/includes/nav-menu-submenu-link-css.php`'s
`sgs_typography_css_rule( $attributes, 'submenu', $sublink_sel )`, beside the item call in
`plugins/sgs-blocks/includes/nav-menu-css.php` (`sgs_typography_css_rule( $attributes, 'item', $link_sel )`).
⛔ **Without them every one of the attributes is a dead control and the build fails
`check-dead-controls.js`.**

**Plus the companion HOVER emit — one more call per prefix**, because `sgs_typography_css_rule()`
covers the base state only and has no hover branch (FR-41-21):

```php
$css .= sgs_nav_shared_typography_hover_rule( $attributes, 'item',    $link_sel,    $item_sweep_hover );
$css .= sgs_nav_shared_typography_hover_rule( $attributes, 'submenu', $sublink_sel, $submenu_sweep_hover );
```

The selectors are built from `$bem_root`, which resolves to `sgs-nav-bar-menu` or
`sgs-nav-drawer-menu` depending on which block called. ⛔ **That helper is BLOCK-PRIVATE to
`sgs/nav-bar-menu` and `sgs/nav-drawer-menu` — NOT an addition to any shared helper file.** It
composes the permitted declarations (FR-41-21's allowlist table) and returns one
`sgs_hover_state_rules()` call's output, or `''` when nothing is set. Promoting it to a shared helper
is the §12 follow-up.

**(c) An explicit `attrMap` entry on `sublink` for each typography property.** The element declares
`"prefix": ""` and that stays (§8.6b), so the default `{prefix}Suffix` convention resolves nothing
here — `submenuFontSize` would not be claimed by an element whose prefix is empty. Members at base:
`css:font-family` → `submenuFontFamily`, `css:font-size` → `submenuFontSize`, `css:font-weight` →
`submenuFontWeight`, `css:font-style` → `submenuFontStyle`, `css:line-height` → `submenuLineHeight`,
`css:text-decoration` → `submenuTextDecoration`, `css:text-transform` → `submenuTextTransform`,
`css:letter-spacing` → `submenuLetterSpacing`, `css:text-align` → `submenuTextAlign`. ✅ **PLUS three
members on `states.hover`** — `css:text-decoration` → `submenuTextDecorationHover`,
`css:text-transform` → `submenuTextTransformHover`, `css:font-weight` → `submenuFontWeightHover`,
sitting alongside the colour/fill members already declared there (§8.6b). Each one explicit, for the
collision reason §8.6(a) records — with an empty prefix, nothing resolves by convention here anyway.

⛔ **Do not resolve this by giving `sublink` a `submenu` prefix.** That immediately re-claims
`submenuAlign` / `Caret` / `CloseGrace` / `MinWidth` / `Padding` and the whole border family, all of
which belong to the PANEL — the exact conflation the empty prefix exists to prevent, recorded in the
element's own `_note`.

---

## 10b. The ungated-paint detector

### FR-41-35 — The ungated-paint detector, built framework-wide

**Status: BUILT.** FR-41-15's census was found incomplete on three consecutive reviews, and a method
that lives in prose is not enforcement. This FR is the enforcement.

**Scope: FRAMEWORK-WIDE, not `sgs/nav-bar-menu` / `sgs/nav-drawer-menu`-only.** FR-41-15's methodology
contains **nothing nav-menu-specific**: it joins each `$css .=` / hover-helper statement to its
terminating `;` and tests the joined buffer for a `background`/`border` declaration, then reads the
block's `style.css` for the same shape. Both inputs are per-block paths; the classification input —
"is this gated on an operator attribute?" — comes from the block's own
`plugins/sgs-blocks/src/blocks/<slug>/block.json::attributes`, which every block has. A block-scoped
build would be the same script with one path hardcoded, which is how a gate becomes a lint. ⚠ **The
block-agnosticity risk is not the scanner, it is the exemption set** — see (d).

**(a) Name and location.** `plugins/sgs-blocks/scripts/check-ungated-paint-rules.py`.

- **`check-*`** because it is gate-first, per this project's settled convention (`check-*` gates,
  `survey-*` censuses, `migrate-*` codemods).
- **Python, not JS.** The load-bearing half is PHP *statement* structure — the exact thing
  line-anchored passes failed at — and every PHP-semantics-sensitive detector in this tree is Python
  (`check-dead-api-calls.py` is PHP-tokenizer-based; `check-render-undefined-vars.py`,
  `remove-vacuous-style-engine-guard.py`, `migrate-render-closures.py`). JS is the convention where the
  input is JSX AST or CSS. This input is both, and PHP dominates.
- ⛔ **It does NOT extend `check-hardcoded-render-defaults.js`,** and that is deliberate: that gate
  runs the INVERSE direction — *attribute exists → is its property also hardcoded?* — and its F3b check
  keys on a literal `block.json` `default` that flattens a theme.json `styles.elements` differentiated
  property, gated on the block declaring an enum of element keys. A rule with no matching attribute on
  its own selector passes it clean. This detector asks the opposite question — *declaration exists →
  does a governing attribute exist?* — and no other gate asks it.

**(b) `--survey`.** Emits the census, in FR-41-15's three-bucket form, for one block (`--block sgs/x`)
or every block. Per hit: source file, selector, the verbatim declaration, and its bucket —
**CENSUSED / GATED (with the `if` named) / DISMISSED (with the reason AND the condition that would
return it to the census)**. ⛔ **All three buckets are emitted, never just the findings** — an
omission is indistinguishable from an oversight.

**(c) `--check`.** Exits non-zero when a `background` or `border` declaration is **emitted or authored
ungated on a selector carrying no corresponding operator attribute** — both surfaces, the PHP emitter
and the static `style.css`, in one run. It fails closed for the blocks named in `HARD_FAIL_BLOCKS`
(`["sgs/nav-bar-menu", "sgs/nav-drawer-menu"]`); every other block's findings are printed and pass.

⛔ **The scan logic is FR-41-15's methodology, not a reinvention.** Statement-aware (a character-
boundary parser that joins to the terminating `;` before testing), both files, scoped by defect SHAPE
rather than by line range or literal string. A re-implementation that does not join statements
reproduces the line-anchored failure exactly.

⚠ **FR-41-15's residual is a named limit, not a silent one:** the scan is statement-aware, **not
variable-aware**. A declaration accumulated into an intermediate PHP variable and appended to `$css` in
a later separate statement is outside what it can see. The shared `$sgs_nm_featured_vars` assembly
(`plugins/sgs-blocks/includes/nav-menu-item-border-featured-css.php`, used by both blocks) is a live
instance. ⛔ The script PRINTS this limit in its `--survey` output rather than leaving a reader to
infer completeness — a census that overstates its own reach is the defect this detector exists to end.

**(d) Exemptions — the real portability hazard, and where a block-scoped lint would hide.** Each is a
GENERIC rule keyed on selector shape or on `supports.sgs`, never on a block name:

| Exemption | Rule |
|---|---|
| Resets | a declaration to `none` / `0` / `transparent` with no competing operator value |
| `:where()` defaults | zero-specificity fallbacks that any operator rule out-ranks by construction |
| Forced-colors / `@supports` a11y rules | not operator-facing paint |
| Wrapper-delegated blocks | the block declares a `supports.sgs` container kind and the paint belongs to `SGS_Container_Wrapper`, so no LOCAL attribute is expected |
| Attribute-driven `var()` with a live writer | the custom property has a real, empty-guarded writer — the `--sgs-x-*` bespoke pattern |

⛔ **The last one must verify the writer EXISTS, not merely that a `var()` is present.** A `var()` with
no writer anywhere in `src/` can only ever paint its own hardcoded fallback — a hardcode wearing a
costume, and an exemption that matched on syntax alone would clear it.

⚠ **Precedent warning:** widening `check-hardcoded-render-defaults.js` by string-coincidence matching
collided with real enums. ⛔ **If you find yourself writing `.sgs-nav-bar-menu__` or
`.sgs-nav-drawer-menu__` into an exemption, you have written a nav-menu lint, not a gate** — stop and
generalise the rule instead.

**(e) `--self-test`.** Negative controls are the fixtures under
`plugins/sgs-blocks/scripts/fixtures/ungated-paint/` — real, diagnosed instances of the defect
signature (unconditional, ungated, `background` SHORTHAND, `:hover`, emitted through
`sgs_hover_guarded_rule()`, `$uid_sel`-scoped). ⛔ **Each `*-dirty` fixture must FAIL the check**, and
the `*-clean` copy must report zero — a check with no positive control passes against a dead feature,
and a disabled rule returns 0 exactly like a clean tree. There is one `*-legit` and one `*-trap`
fixture per exemption in (d), proving each does not OVER-match.

**(f) Wiring — the gate must be REACHABLE, not merely written.** The entry is in
`plugins/sgs-blocks/scripts/gates.json` (the array of gate objects consumed by `run-gates.py`), id
`check-ungated-paint-rules`, plus the standalone `package.json` alias `check:ungated-paint-rules`.
⛔ **A `package.json` alias alone does NOT wire a gate.** The build chain lives in `gates.json`;
grepping `package.json` returns a FALSE POSITIVE in exactly the direction that matters. **Prove it with
`npm run gate:list`**, not with a grep.

**(g) Gate: §11 G20c.**

---

## 11. Acceptance

| Gate | Condition |
|---|---|
| **G1 — zero blast radius** | **Five** separate proofs, all required. (a) Every block mounting `SgsColourPanel` renders byte-identical inspector output despite the FR-41-16 row keys — diff at least three existing callers (roster live: `git grep -l "<SgsColourPanel" -- 'plugins/sgs-blocks/src/blocks/*/edit.js'`; never cache the count). (b) Every existing `sgs_emit_state_colour_css()` call site emits byte-identical CSS with the 4th parameter defaulted (count them live: `git grep -c "sgs_emit_state_colour_css(" -- '*.php'`). (c) `sgs_fill_states_css()` / `sgs_text_states_css()` / `sgs_border_states_css()` emit byte-identical CSS for every caller whose `$map` has **neither a `current` key nor a `suppress_edges` key** — covering FR-41-8's per-edge parameter alongside FR-41-3's third state, because both land on the same function. Re-derive the roster live (`git grep -n "sgs_border_states_css(" -- '*.php'`). ⛔ **Assert specifically that such a caller still receives the flat `border-color` SHORTHAND, not per-edge longhands** — an implementation that always emits longhands renders identically, is byte-different for every existing caller, and would pass a looser "does it still paint the right colour?" check. (d) Every existing `SgsBorderControl` mount renders byte-identical inspector output with the `showColour` prop defaulting `true` — diff at least three existing callers, roster live (`git grep -l "<SgsBorderControl" -- 'plugins/sgs-blocks/src/blocks/*/edit.js'`; ⚠ that grep under-counts by at least one, because `sgs/media` mounts it only through the media-atom chain). `GradientCapableColourControl` is NOT edited, so its adopters are untouched by construction — ⚠ **but `SgsBorderControl` mounts its `BorderStyleControl` child from a second place (FR-41-33 item 2), so assert that child's own adopters are unaffected too**: `DesignTokenPicker.js` and `GradientCapableColourControl.js` both render it and neither is edited. (e) Every element carrying `data-sgs-fx="magnet"` anywhere in the framework renders a byte-identical computed `transition` with `fx-magnet.css` exposing `--sgs-magnet-transition` — the property resolves to the same declaration the file always emitted, a named zero-delta expectation. ⛔ Assert the COMPUTED value on a live magnet element, not that the file's text still contains `180ms`: a mistyped custom-property name would leave the text intact and the `var()` unresolved, and `transition` would silently fall back to the nav rule's own literal on the burger while every OTHER magnet element lost its transition entirely. |
| **G2 — no bare `:hover`** | `plugins/sgs-blocks/scripts/hover-guard/check.js` passes. Every hover rule traces to `sgs_hover_state_rules()` or `sgs_hover_guarded_rule()`. |
| **G3 — no inline styling** | `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0 (Spec 32 / FR-36-13). |
| **G4 — DB state routing** | `/sgs-db` shows `itemColourHover`/`itemBgHover` at `css_state='hover'`, and every Current attribute at `css_state='current'`. This is §8.6(a)'s negative control — it must be RUN, not reasoned about. **The typography trio is IN this gate, and it is the case most likely to collide.** For each of the three properties on each of the two prefixes, assert the BASE and the HOVER attribute occupy SEPARATE routing slots: `itemTextDecoration` / `itemTextTransform` / `itemFontWeight` at `css_state IS NULL`, and `itemTextDecorationHover` / `itemTextTransformHover` / `itemFontWeightHover` at `css_state='hover'`; the same six for the `submenu` prefix. ⛔ **Twelve rows, twelve distinct `(css_property, css_element, css_state)` triples — assert the DISTINCTNESS, not merely that twelve rows exist.** The collision this catches does not delete a row; `_record()` is last-write-wins, so it silently retags one attribute with the other's state and both rows survive looking plausible. That shape is recorded twice in this block's own manifest `_note`s (`burgerColour`+`burgerColourHover`, `submenuColour`+`submenuColourHover`). ⚠ Assert `itemFontWeight`'s base row specifically — it is the base member a builder is most likely to drop while adding its two state siblings (§8.6a). |
| **G5 — no dead controls, and no readers of undeclared attributes** | `npm run check:dead-controls` and `npm run check:empty-inspector-containers` pass. Every declared attribute is both written by a control and read by the emitter — including the whole submenu typography family (FR-41-22) and the three `triggerMagnet*` attributes (FR-41-31). ⚠ **The six `showHover` attributes are IN this check, not exempt from it.** For each of `itemTextDecorationHover` / `itemTextTransformHover` / `itemFontWeightHover` / `submenuTextDecorationHover` / `submenuTextTransformHover` / `submenuFontWeightHover`, assert BOTH halves: the control renders (`showHover: true` on that target entry, FR-41-22) AND the emitter writes it (the block-private hover rule, FR-41-21). No code reads an attribute this spec does not declare: `git grep -nE "hoverStyle\|underlineColour\|underlineThickness\|underlineOffset\|itemRadius\|submenuRadius\|indicatorStyle\|indicatorColour\|borderHoverAnimation[^D]" -- plugins/sgs-blocks/src plugins/sgs-blocks/includes theme` returns only comment prose, never a code read. ⚠ The `[^D]` guard on the last term is deliberate: `borderHoverAnimationDirection` is read defensively by the emitter (FR-41-38) and an unanchored match would report it. Also run `python plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py`. |
| **G6 — one line, not two** | On the live canary, with a bottom border colour AND a Sweep both set, the item row renders **exactly one** painted horizontal line, and `getComputedStyle( link ).borderBottomColor` is `rgba(0, 0, 0, 0)` while the `::after` band paints (FR-41-8 mechanism items 2 + 3). Count the line in the live DOM and assert the transparent border-colour — the mechanism, not just the appearance. |
| **G7 — live verification (R-31-11 / R-31-13)** | Playwright on the real page, **both blocks**: hover a parent with a dropdown in the BAR, move into the dropdown, confirm via `getComputedStyle` that the parent's hover declarations are still applied; repeat inside the DRAWER's accordion. Tab into each panel and confirm the same via the `:has()` half. With a non-zero `submenuTopOffset`, move the pointer slowly across the gap and confirm the parent's paint never drops (FR-41-11's bridge). Confirm the Current state paints on the current page, and that the drawer's instance and the bar's instance carry independent borders. Plus Bean's eye — a number alone does not close this. |
| **G8 — touch** | On touch emulation, tapping a nav item does not leave it stuck in its hover colour, and the colour sweep does not strand half-finished. |
| **G9 — reduced motion** | Under `prefers-reduced-motion: reduce`, the colour sweep and the submenu open animation both land on their END state with no travel — and the submenu still opens. Assert both FIRE without the media query too; a check that only asserts 0 under reduced motion passes against a dead feature. **Assert the MAGNET's reduced-motion outcome AND the rule that produces it.** With `triggerMagnetEnabled` on and `reduce` emulated, assert on the live canary that (a) `getComputedStyle( burger ).transitionDuration` resolves to the killed value, not `180ms`, and (b) `getComputedStyle( burger ).transform` is `none`. ⛔ **Then assert the CAUSE, not just the outcome:** the winning `transition-duration` declaration must be the `!important` one from the `@media (prefers-reduced-motion: reduce)` rule in `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css` (burger, magnet and the bar's own item link/indicator are all BAR-only, so this rule has no drawer counterpart — the list names `.sgs-nav-bar-menu__burger`, `.sgs-nav-bar-menu__link`, `.sgs-nav-bar-menu__indicator` and `[data-magnet] .sgs-nav-bar-menu__magnet-target`). FR-41-31's companion rule sits at `(0,2,0)` and out-ranks `fx-magnet.css`'s own `(0,1,0)` kill switch, so that `!important` rule is the ONLY thing killing the transition — an assertion on the outcome alone would still pass if someone later narrowed that selector list, and would pass for the wrong reason. ⚠ Also assert the companion rule itself carries NO `!important`: giving it one would beat the rescue and reinstate the transition. |
| **G10 — non-colour signal RENDERS, not just computes** | Two assertions, matching FR-41-6's two signals. **(a) Hover:** with a bottom `itemBorderWidth` set and every COLOUR attribute unset except `itemBorderColourHover`, hovering an item visibly changes the border — assert the computed `border-bottom-color` differs between resting and hovered, on the live page. ⚠ **Do NOT assert a signal on a border-less menu** — `itemBorderWidth` defaults to `{}`, so an untouched block ships no Hover signal and the gate would be asserting a capability the spec deliberately does not claim (FR-41-17a case a). **(b) Current:** with every colour attribute unset, the current-page item renders at the declared weight. ⛔ **`getComputedStyle` alone does not close the weight half.** `theme/sgs-theme/theme.json` registers `display` with a **single 400 face** and `dm-sans` with `400 700` — on either family, `font-weight:600` computes as `600` while painting at 400 (or a browser-synthesised approximation) and the computed-style check passes against no visible difference. Assert BOTH: the computed value, and a rendered difference — a `getBoundingClientRect().width` delta on a fixed test string between a Normal and a Current item, or a `document.fonts.check( '600 16px <family>' )` probe confirming a real face exists. |
| **G11 — no `underline` element in the DB** | After `/sgs-update`, `/sgs-db` returns **zero** rows with `css_element='underline'` for `block_slug='sgs/nav-bar-menu'` and `block_slug='sgs/nav-drawer-menu'` (§8.6f). An orphan `css_element` survives a manifest edit until the reseed, and a raw row deletion does not survive one. |
| **G12 — manifest conformance** | `npm run audit:element-manifest` passes, and `python plugins/sgs-blocks/scripts/placement-reach.py --block sgs/nav-bar-menu` (and again with `--block sgs/nav-drawer-menu`) reports no new CONTESTED attributes — the border family is claimable by both `item` and `submenu-panel` by name, so each needs its explicit `attrMap` entry (§8.6a/c) rather than a guessed tie-break. ⚠ **Assert `supports.sgs.sweepEligibility` name-by-name.** Every attribute named in its rows' `blockingBackgroundAttrs` / `blockingGradientAttrs` / `glyphGuard.attr` must resolve to a real entry in `attributes` — checked per block, since the table is declared at `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::attributes` (all five rows) and `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json::attributes` (the three BOTH rows) — and every row KEY must be a declared `…HoverTreatment` attribute (§8.6g item 4). ⛔ A misspelt attribute name in that table reads as permanently empty, so the predicate always passes, the `Sweep` segment always offers and the emitter always emits — the eligibility rule silently ceases to exist with nothing failing. That is a dead-detector shape, and this is the only gate positioned to see it. |
| **G13 — hover-treatment defaults** | Every `{row}HoverTreatment` attribute defaults to `"swap"`; an untouched block renders a plain Hover colour swap on each row (FR-41-23). `itemBgHoverTreatment='highlight'` with `itemBgHover = X` renders the pill in X, and the gradient pair (`itemBgHoverGradient`) likewise (FR-41-25). **The radius default:** with an `itemBg` set and `itemBorderRadius` untouched, `getComputedStyle( link ).borderRadius` resolves to `8px` on all four corners (§8.4). ⛔ Assert the COMPUTED value, not the emitted declaration — the 8px flows from the `block.json` default through `sgs_corner_object_shorthand()`. ⚠ Also assert the negative: an item with NO background set renders no `border-radius` rule at all — the radius only applies inside the background branch, and the default must not leak a radius onto an unstyled item. |
| **G14 — text-sweep does not collide with background/border layers** | Live DOM, and note the combination is only REACHABLE on the item text row: with `itemColourHoverTreatment='sweep'` AND `itemBgHoverTreatment` set AND `itemBorderHoverTreatment='sweep'` simultaneously, the item renders three independent, non-fighting effects — text glyphs sweep colour (no pseudo-element), background paints on `::before`, border band sweeps on `::after`. Confirm via `getComputedStyle` that `::before` and `::after` each carry their own expected declarations, neither empty nor doubled (FR-41-26). **Plus a NEGATIVE control for the eligibility rule:** set `submenuLinkBg`, then assert the submenu link-text row offers exactly TWO segments and no `Sweep`; repeat with `burgerBg` on the menu-button icon row, with `triggerMode='icon'`, and with `itemColourGradient` on the item-text row. A gate that only proves the positive path passes against an eligibility rule that never fires. **This gate is the block's cross-mechanism-interaction gate** (it proves two mechanisms sharing an element do not fight), so cross-mechanism combinations belong here rather than on G19, which is single-mechanism by construction. **(e) Sweep × hover text-decoration compose correctly (FR-41-26):** set `itemColourHoverTreatment='sweep'` AND `itemTextDecorationHover='underline'` on the same row, hover the item on the live canary, and assert `getComputedStyle( link ).textDecorationColor` equals the resolved HOVER colour — **NOT** the resting colour. ⛔ Asserting `textDecorationLine === 'underline'` is not enough and is the trap: the line renders either way, it just renders in the wrong colour. Repeat once on a sublink with `submenuColourHoverTreatment='sweep'` + `submenuTextDecorationHover`. ⛔ **Plus the RESOLVED-value negative control:** on that same sublink, ALSO set `submenuLinkBgHover` so the eligibility predicate fails and the treatment resolves to `'swap'` while the STORED value stays `'sweep'`; assert the decoration-colour rule does **not** fire — `textDecorationColor` follows the element's own hover `color` (inherited via `currentColor`), not a forced value. This proves the rule keys on the RESOLVED treatment rather than the raw attribute. **(f) THE EMITTER RE-CHECKS THE PREDICATE — the load-bearing assertion of the whole eligibility rule (FR-41-26):** store `submenuColourHoverTreatment='sweep'` while `submenuLinkBg` is empty, THEN set `submenuLinkBg`, WITHOUT touching the treatment attribute; re-render and assert the emitted CSS for the sublink (`.{bem_root}__sublink`) contains **no `background-clip`, no `-webkit-background-clip` and no `-webkit-text-fill-color`**, and that the sublink's own background paints normally. ⚠ `submenuLinkBg` defaults to a token (FR-41-36), so to reach the "empty" precondition the fixture clears `submenuLinkBg`, `submenuLinkBgHover` and `submenuLinkBgCurrent` explicitly. Repeat the remaining paths: `burgerColourHoverTreatment='sweep'` then set `burgerBg`; `burgerColourHoverTreatment='sweep'` in `icon-and-text` mode then switch `triggerMode` back to `'icon'`; `submenuColourHoverTreatment='sweep'` then set **`submenuLinkBgHover`** (leaving `submenuLinkBg` empty — a resting-only check passes this one); and `burgerColourHoverTreatment='sweep'` then set **`burgerHoverColour`** (not `burgerBg`). ⛔ On the `burgerHoverColour` path assert specifically that the button's HOVER fill paints as a filled button and NOT as coloured letter shapes: it is a `background-color` longhand, so the sweep's `background-image` survives and the naive "no `background-image`" check passes while the clip still ruins the render. ⛔ **Assert the ABSENCE of the clip declarations in the rendered CSS, not the presence of a UI segment** — the defect class is that the control disappears while the emission continues, so a check performed in the editor cannot see it. ⚠ Also assert the stored value is still `'sweep'` after each: the fix gates the EMISSION, it does not clear the attribute. **(g) THE TWO SURFACES AGREE — the direct proof of FR-41-26's one-declared-source rule, and the only assertion here that a single-surface check cannot substitute for.** For each of the three text/icon rows, pick a stored value that STRADDLES the boundary — treatment stored as `'sweep'` with exactly one blocking attribute set — and assert, on the SAME post, in the SAME state: (i) the editor's row renders exactly TWO segments with no `Sweep` (UI says ineligible), AND (ii) the rendered front-end CSS for that selector carries no `background-clip` / `-webkit-background-clip` / `-webkit-text-fill-color` (PHP says ineligible). ⛔ **Both halves in one check, on one stored state — never the UI check on one fixture and the PHP check on another.** The defect this proves absent is *disagreement*, and two checks run on two different fixtures can both pass while the surfaces disagree on every real page. ⚠ Then assert the converse on an unblocked fixture: the `Sweep` segment IS offered AND the clip declarations ARE emitted — the positive control without which (g) is vacuous. Run at least one path per row, including the `submenuLinkBgHover` and `burgerHoverColour` straddles. |
| **G15 — icon pickers default to the standard glyphs** | With `triggerIcon` / `sublinkMarkerIcon` unset (their declared defaults), the rendered SVG markup is the Lucide `menu` / `chevron-right` glyph (FR-41-30). |
| **G16 — the readability toggle works** | Three assertions, all on the live canary, because a control on another tab with no gate is how a working control quietly stops working (FR-41-5/FR-41-27). (a) The toggle RENDERS in the General tab's Accessibility panel. (b) It is bound to `itemSmartContrast` — flipping it writes that attribute and no other. (c) Switching it OFF then ON actually changes the RENDERED text colour on an item with a Hover background set — assert the computed `color` differs between the two states. ⛔ Asserting the control exists is not asserting it acts; (c) is the load-bearing half. Also confirm the §9.6 cross-reference note renders beneath the Item text and Item background rows. |
| **G17 — magnet default costs zero bytes** | With `triggerMagnetEnabled` false (its default), the rendered `<button class="sgs-nav-bar-menu__burger">` markup carries no `data-sgs-fx` attribute of any kind — **and no magnet JS module or stylesheet is enqueued on the page**. Assert the ABSENCE of the asset in the page's script/style list, not merely the absence of the attribute: the enqueue is markup-sniffed, so proving the attribute is gone is not the same as proving the sniff found nothing (FR-41-31). Then switch it on and assert the inverse: attribute present, module enqueued, and the companion `transition` rule from `sgs/nav-bar-menu`'s own stylesheet is the winning declaration on the button. |
| **G18 — exactly one writer per border-colour attribute** | `node plugins/sgs-blocks/scripts/check-duplicate-controls.js` passes, AND — because that gate's CHECK 2 scans literal JSX control elements and is blind to a duplicate writer living inside a row OBJECT LITERAL passed as a config prop — verify by hand in the live editor that `SgsBorderControl` under `showColour={ false }` renders **no colour swatch** on either mount (§9.7, §9.9), that border STYLE is still reachable as its own control, and that the border-colour rows in the Colour panel are the only place the three `itemBorderColour*` attributes can be set (FR-41-33). ⛔ **"Reachable" is NOT the whole assertion — assert the WRITE and the EMIT halves too.** A style control re-parented out of a suppressed popover can render perfectly and be wired to nothing: `BorderStyleControl`'s `onChange` returns `''` on deselect, and a mount that forwards it to the wrong handler — or to none — looks identical on screen. Assert all three, in order: **(a) RENDERS** — the style control appears on both `showColour={ false }` mounts (§9.7 item, §9.9 submenu panel); **(b) WRITES** — picking Dashed on each mount stores `"dashed"` in `itemBorderStyle` and `submenuBorderStyle` respectively, and in NO other attribute; deselecting stores `""`; **(c) EMITS** — with a width also set, the live canary's rendered CSS carries `border-style:dashed` on the item link (`.{bem_root}__link`) (and on the submenu panel, `.{bem_root}__submenu`), and `getComputedStyle` agrees. ⚠ Run (b) and (c) as a matched pair on the SAME value: a write with no emit and an emit with no write are different bugs, and each passes the other's check. |
| **G19 — the hover typography trio renders, emits, and is NOT the default signal** | Five assertions, because the trio has one failure mode in each direction — plus the UX distinction FR-41-6 makes binding. ⚠ **Cross-mechanism combinations (trio × a hover treatment on the same row) are G14(e), not here.** This gate proves the trio works on its own terms. **(a) Renders:** all six controls appear — three under the Typography panel's Menu target, three under its Submenu target — and each writes only its own attribute. **(b) Emits:** with `itemTextDecorationHover: "underline"` set and every colour attribute unset, hovering an item produces `getComputedStyle( link ).textDecorationLine === 'underline'` on the live canary, and the resting value is not `underline`. Repeat once on a sublink with `submenuFontWeightHover`. **(c) Additive default:** with all six unset (their declared defaults), assert the ABSENCE of any hover `text-decoration` / `text-transform` / `font-weight` declaration in the rendered CSS, not merely that the page looks unchanged. **(d) NEGATIVE control on the allowlist:** set `itemTextTransformHover` to a value outside `none/uppercase/lowercase/capitalize` and assert the hover rule emits NOTHING for that property — not the base value, not the invalid value (FR-41-21). A check with no invalid input passes against an emitter that validates nothing. **(e) BOTH cross-reference notes RENDER, and each names the other.** In the live editor, assert the `ⓘ` note beneath the item border colour row's hover-treatment selector (§9.6) is present and points at Typography → Decoration (hover), AND that the note beneath the Typography panel's hover trio row (§9.10) is present and points at the item border's hover setting. ⛔ **Assert BOTH, in one check, not either** — FR-41-6 requires reciprocity, and a one-way pointer leaves the un-pointed control reading as the authoritative one. ⚠ Also assert neither string contains "WCAG", "contrast", "AA", "signal" or "divider" — the client-visible-string rule that binds FR-41-5's toggle binds these (§9.10). |
| **G20 — the responsive font-size tiers PERSIST and RENDER** | §8.4a's requirement. Three assertions, on the live canary, for **both** prefixes (`item` and `submenu`). **(a) PERSISTS:** switch the inspector's device toggle to Tablet, set a font size, reload the editor, and assert the value survives — then repeat for Mobile. ⛔ **Assert the value is stored INSIDE the tier object** (`itemFontSize.tablet`), and assert **no `itemFontSizeTablet` attribute exists on the post at all**. That second half is the load-bearing one: it proves the block is on the tiered path and would fail if someone added the flat keys §8.4a refuses. **(b) RENDERS:** assert the emitted CSS carries a `@media` rule setting `font-size` at the tablet and mobile breakpoints, and that `getComputedStyle( link ).fontSize` differs across the three widths. **(c) NEGATIVE CONTROL:** with all three tiers unset, assert NO `font-size` `@media` rule is emitted for that prefix — a check with no unset case passes against an emitter that always emits. ⚠ Run (a)–(c) on `submenu` too: a shape error in that family is invisible to any item-only check. |
| **G20c — the ungated-paint detector exists, is REACHABLE, and can still fail** | FR-41-35. **(a)** `python plugins/sgs-blocks/scripts/check-ungated-paint-rules.py --check` exits 0 on the current tree. **(b)** `--self-test` passes, and its negative controls are the `*-dirty` fixtures: assert each makes `--check` exit NON-ZERO, and that the `*-clean` copy exits 0. ⛔ **Both directions, or the self-test is vacuous** — a detector that stopped detecting returns 0 exactly like a clean tree, which is this project's recorded dead-detector shape. **(c) REACHABILITY:** `npm run gate:list` shows the gate with its tier and measured cost. ⛔ **Do not substitute a `package.json` grep** — the build chain lives in `gates.json`, and that grep returns a false positive in precisely this direction. **(d) FRAMEWORK-WIDE, proven not asserted:** run `--survey` with no `--block` filter and confirm it enumerates every block, then confirm the source contains **no `sgs-nav-bar-menu` or `sgs-nav-drawer-menu` string literal** outside test fixtures. That grep is the whole scope decision made checkable — if it fails, a gate was built as a nav-menu lint. **(e)** `--survey` output PRINTS its own variable-awareness limit (FR-41-35c), rather than presenting its census as complete. **(f) ENFORCEMENT SCOPE — and (d) and (f) are about two DIFFERENT things.** (d) governs the detector's *logic*, which stays generic and framework-wide. (f) governs its *hard-fail*, which lands on `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` alone (`HARD_FAIL_BLOCKS`); every other block's findings are PRINTED and exit 0. Assert the scoping in BOTH directions: a planted ungated rule in `sgs/nav-bar-menu` or `sgs/nav-drawer-menu` exits non-zero, and the same planted rule in any other block exits 0 with the finding printed. ⛔ A scope that silently hard-fails everything passes (a) and (b) and would turn the build red for every concurrent session on work nobody scoped — a standing-red gate. |

---

## 12. Open Questions

Recorded, not resolved — each needs an owner call if it matters.

1. **`sgs_typography_css_rule()` has no hover branch.** `sgs/nav-bar-menu` and `sgs/nav-drawer-menu`
   are the `showHover` flag's only adopters, paying that cost block-privately (FR-41-21). The helper
   reads the base properties only and its sole `:hover` emission belongs to `sgs_link_colour_css()`,
   so the shared component ships a control set no block can use without writing its own PHP emitter
   first — a real gap in the framework, not in this spec. FR-41-21 writes that emitter here rather
   than touching the shared helper (design-gated, callers across most of the block library). There is
   now a block-private emitter in the tree that duplicates three of the helper's own allowlists.
   Extending the helper to own the trio is the better long-term answer, and the day a SECOND block
   wants `showHover` is the day to take it rather than duplicate the emitter again.
2. **No submenu-LINK padding attribute exists.** §9.8's Submenu — Items panel has a named empty slot
   for it rather than a fabricated attribute — `submenuPadding` is the PANEL's own inner spacing
   (§9.9), not a per-link control. If an operator asks for per-link spacing independent of the
   panel's padding, that is new scope.
3. **The hover-treatment selector (FR-41-23/24) is deliberately block-private.** Promote it to a
   shared `plugins/sgs-blocks/src/components/primitives` export the day a SECOND block wants the same
   None/Swap/Sweep-or-Highlight pairing — not before. Building the generic version now would be
   designing an abstraction from a sample size of one, the trap FR-41-2 names.
4. **`SgsColourPanel.js`'s three documented exemptions have a named block-scoped exception.**
   FR-41-33 moves border colour into the panel for `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` only.
   The general rule is unchanged and no other block moves — but if a second block takes the same
   exception, the exemption list itself should be re-litigated rather than accumulating one-offs.
5. **The default non-colour Hover signal is conditional on the operator setting a border width.**
   FR-41-17a(a) records this as an accepted residual. If clients routinely ship border-less menus with
   two similar state colours, the honest fix is a warn-only inspector notice, not a re-defaulted
   border — an owner call, not a silent change.
6. **Active-trail semantics.** The visual ancestor Current styling is built; an ancestor-path list
   plus a client-side prefix match that stamps a distinct (non-`aria-current`) signal is not (FR-41-20).