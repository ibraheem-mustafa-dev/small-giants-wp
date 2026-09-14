---
doc_type: report
date: 2026-09-14
status: complete
governs: nav-menu split (plan Steps 2-3), D1059, D1060
---

# `sgs/nav-menu` split — verified review of the six investigations, and the decisions they produced

Six read-only subagents (A–F) investigated the open questions left by
`2026-09-14-nav-menu-split-attribute-classification.md`. Their raw reports lived in session
scratch and are **not** preserved, deliberately: two contained load-bearing errors a future
session could trust. This document keeps only what survived fact-checking against the code,
with the correction noted wherever an agent was wrong. Every ruling below names its evidence.

## How each investigation held up

| Agent | Question | Survived | Did not survive |
|---|---|---|---|
| A | Does each attribute's CSS actually WIN the cascade in each fork? | Two real defects (below). The `collapsePoint` positive control, reproduced at computed-style level with a bar-fork contrast. | **Roughly half its "verdicts should change" list is invalid.** (1) Its scripts read computed colours immediately after forcing `:hover` / `aria-current`, but `.sgs-nav-menu__link` carries `transition: background-color 150ms, color 150ms` (`nav-menu/style.css`) and the audit had no transition wait — so every hover/current colour read captured the pre-transition value. (2) Several test values equal the CSS initial value (`text-transform:none`, `writing-mode:horizontal-tb`; `text-decoration:none` is already set by the static `.sgs-nav-menu__link` rule), which can never show a change. Its claims that `itemColourHover`, `itemColourCurrent`, `itemTextTransform`, `itemTextDecoration`, `itemWritingMode` and the hover treatments "do nothing" are **not acted on**. |
| B | Should the drawer keep dropdown-panel `submenu*` settings? | `submenuShadow` has no consumer in the drawer (proven below). Full PANEL / LINK / TYPOGRAPHY sort of the family. Missing drawer-native sub-item indent. | Recommended KEEP for `submenuPadding` and `submenuBorderRadius` because they *target* the drawer's `<ul>` — but the drawer's own rule hardcodes both to 0 at higher specificity, so they do nothing there. Targeting is not effect. |
| C | Why did 16 attributes show no effect? | All 16 verdicts, each proven by a live canary render. | Its headline counts ("6 wired, 4 tool bugs") contradict its own table, which gives **10 wired, 3 tool bugs, 2 unwired, 1 broken**. The table is correct. |
| D | Step 2 scaffold specification | Extension attach via `supports.sgs.hideExtensions` (no slug-keyed logic); `headerEssential` is a runtime read, bar-only; `check-ungated-paint-rules.py::HARD_FAIL_BLOCKS = ["sgs/nav-menu"]` must list both new slugs or the gate silently drops to warn-only; `mega-panel/view.js` hardcodes `.sgs-nav-menu__mega-panel-wrap` / `__mega-trigger` and fails silently if missed. | Said `DropdownSettingsPanel` is bar-only and should move wholesale. It writes `navLabel` and `itemSmartContrast` (both blocks) as well as `drawerRef`, `submenuAlign`, `submenuCaret`, `submenuCloseGrace` (bar). Moving it would strip the menu's accessible-name control from the drawer. **It must be split.** |
| E | Do Claude Design drawer designs use min-width / radius / padding / shadow on nested lists? | Evidence below. | Cited line numbers a few rows off (e.g. 190 for what is line 200); the values and their location inside the mobile overlay are correct. |
| F | How are drawer item colours defaulted today? | Root cause below; FR-41-36's drawer top-level `surface-alt` row was never wired. | Nothing material. |

## A fifth defect in the attribute classifier

The classifier matched a changed CSS rule's selector against rendered markup. A rule that only
sets **custom properties on the block root** (`.sgs-nav-menu-UID{--sgs-nm-submenu-filter:…}`)
matches in every render, because every render has a root — so it scores "affected" regardless of
whether anything consumes the property. Seven attributes relied on this alone:
`submenuBg`, `submenuBorderRadius`, `submenuBorderStyle`, `submenuBorderWidth`,
`submenuColourCurrent`, `submenuMinWidth`, `submenuShadow`. Their real effect has to be judged at
the `var()` consumer. Together with the four defects already recorded in the classification
report, and the targeting-versus-cascade limit, this is scheduled for fixing before Step 3.

## Verified findings

**`collapsePoint` is bar-only in effect.** Its drawer rule `@media (max-width:767px){.sgs-nav-menu-UID
.sgs-nav-menu__bar{display:none}}` (0,2,0) loses to `nav-drawer/style.css`'s
`.sgs-nav-drawer .wp-block-sgs-nav-menu .sgs-nav-menu__bar{display:flex}` (0,3,0). No `@layer`,
no `!important`, present in the canary's built CSS. A real rendered `sgs/nav-drawer` dialog
carries the bare `sgs-nav-drawer` class. Not a live bug.

**`itemColour` has no effect in the drawer (live defect).** `nav-menu-submenu-link-css.php`
emits unconditionally `.sgs-nav-drawer {uid} .sgs-nav-menu__subtoggle, … .sgs-nav-menu__link,
… .sgs-nav-menu__caret svg {color:inherit}` at (0,3,0), beating `itemColour`'s (0,2,0). Its comment
("M4/M2 drawer parity (2026-09-12)") states the intent was making the caret match the link colour,
so disabling the client's item colour is an unintended side effect. `featuredColour` in the drawer
is probably the same mechanism — **not individually verified**.

**The drawer deliberately flattens its accordion panel.** `nav-menu-submenu-link-css.php` emits
`.sgs-nav-drawer {uid} .sgs-nav-menu__submenu{box-shadow:none;min-width:0;[border:0];background:…;
border-radius:0;padding:0;margin:0}` at (0,3,0). So `submenuMinWidth`, `submenuBorderRadius` and
`submenuPadding` do nothing in the drawer today. `border:0` is omitted when `submenuBorderWidth` is
set (`$sgs_nm_submenu_border_box`), so **border width is the switch that turns a drawer border on** —
a deliberate gate, not the asymmetry A reported.

**`submenuShadow` has no consumer in the drawer.** Its only consumer is
`.sgs-nav-menu__submenu-wrap{filter:var(--sgs-nm-submenu-filter,none)}`
(`nav-menu-submenu-css.php`); `sgs_nav_menu_render_items_drawer()` never emits `__submenu-wrap`,
while `sgs_nav_menu_render_items()` does.

**Root cause of the drawer-colour workarounds.** `nav-drawer/block.json::drawerBg` defaults to
`primary`. FR-41-36 (spec line ~451): *"⛔ The drawer explicitly does NOT default to a
brand/primary-colour-filled whole panel."* The 2026-09-14 redesign comment in
`nav-menu-submenu-css.php` records that nested submenu rows were given a fixed cream surface
because "the row's real backdrop was whatever colour `drawerBg` happened to be (default
'primary')". Item text colour already adapts, by inheriting from the dialog root, which computes
`sgs_wcag_text_colour_for_bg( $drawer_bg_hex )` (`nav-drawer/render.php`). Every compensating rule
traces back to the non-compliant default.

**`submenuBgGradient` is ignored in the default state (live defect).** The 2026-09-12 fallback in
`nav-menu-submenu-css.php` replaces the panel background source with `submenuLinkBg` whenever
`submenuBg` is empty and `submenuLinkBg` is not — and `submenuLinkBg` defaults to `surface`, so in
the default state an explicitly set `submenuBgGradient` is overwritten with `submenuLinkBgGradient`
(default `''`). `sgs_custom_property_gradient_decls()` emits flat and gradient independently, so
the fix works for the bar. **A second block exists in the drawer:** its accordion and drill-down
panel rules use the `background:` shorthand, which resets `background-image` to `none` and cancels
the base rule's `background-image:var(--sgs-nm-submenu-bg-gradient,none)`.

**`itemTextIndent` / `submenuTextIndent` are unwired.** `helpers-typography.php::sgs_typography_css_rule()`
emits `text-indent` only when a fourth `$indent_sibling_selector` argument is supplied; both call
sites (`nav-menu-css.php` for `item`, `nav-menu-submenu-link-css.php` for `submenu`) pass three.

**Classifier tool bugs among the 16 NO-EFFECT:** `itemTextColumns` / `submenuTextColumns` were
tested with 7, outside the emitter's `>= 1 && <= 6` clamp; `submenuShadowColour`'s enabler used a raw
shadow string the shared composer reads as a preset slug. The other 10 are wired and need a paired
value (unit attributes need their tier object or number; `itemBorderRadius` needs an item
background; `sweepAngle` needs `itemBorderHoverTreatment:'sweep'`; `itemSmartContrast` needs a
genuinely failing pair).

## Claude Design drawer evidence

Five Claude Design exports exist (`.dc.html`); `sites/Indus Foods Mega Menu Design/Mega Menu.dc.html`
and `sites/Mega-menu design/Mega Menu.dc.html` are byte-identical (md5 `dbbaf8664508`).

| Draft | Drawer panel background | Nested drawer items? | Nested list: min-width / radius / padding / shadow |
|---|---|---|---|
| Eye Care Birmingham | `#FAF8F5` — same as the page body | No (flat) | no evidence |
| Indus Foods Mega Menu | `#0A7EA8` brand blue, full-screen overlay, white text | Yes | none / none on the list / `0 0 16px`, `0 0 16px`, `0 0 18px` / none |
| Mega Menu (generic) | `var(--bg)` — page background | Yes | none / none / `0 6px 16px` / none |

Nested drawer items show hierarchy through accordion disclosure, row dividers and smaller type,
with a background on **hover only** — no tint at rest. Shadows in these drafts belong to the desktop
dropdown panel, a separate DOM branch, and are not drawer evidence. The sample is two nested drawers:
a real but small signal.

The framework already ships a brand-fill drawer: the `sgs/nav-drawer` variant `solid-brand-light`
sets `drawerBg: 'primary'`. `floating-capped-card` and `two-column-editorial` use `surface`;
`centred-statement` and `split-zone-serif` use `footer-bg`.

## Decisions (owner-ruled 2026-09-14)

Recorded as **D1059** (split architecture) and **D1060** (drawer colour defaults and submenu panel
settings) in `.claude/decisions.md`.
