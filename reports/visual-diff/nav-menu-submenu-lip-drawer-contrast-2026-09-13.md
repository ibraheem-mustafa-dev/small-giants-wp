# nav-menu / nav-drawer — I1 panel-bg lip fix + FR-41-36 full drawer-text contrast (2026-09-13)

verdict: PASS
intent_capture_passed: true

**Change:** two fixes to `plugins/sgs-blocks/includes/nav-menu-submenu-css.php`, plus the
supporting Context-passing wiring in `nav-menu/render.php`, `nav-menu/block.json`, and
`nav-drawer/block.json`:

1. **I1** — the dropdown/mega submenu panel (`.sgs-nav-menu__submenu`) no longer reserves
   `padding:8px 0`, which only its own `background-color` could ever paint. The panel now
   uses `padding:0;overflow:hidden;`, clipping the first/last row's square corners to the
   panel's own `border-radius` — so a row's own Normal/Hover/Current state always covers
   the panel's full visible area, eliminating the mismatched "lip" band Bean identified.
2. **E1 Symptom 3 (FR-41-36 full fix)** — the drawer's nested submenu link colour no longer
   hardcodes `color:inherit`. It now resolves to the same `primary` token the bar uses,
   genuinely contrast-checked (via `sgs_wcag_preferred_text_colour_for_bg()`) against the
   drawer's own resolved `drawerBg`, reached through a new `sgs/navDrawerBg` block-context
   channel (mirroring the existing `sgs/navDrawerSubmenuModel` pair).

## Root cause (traced, not assumed)

I1: `.sgs-nav-menu__submenu{padding:8px 0}` created an 8px band above/below the row list
that no row's geometry reaches — only the panel's own `background-color` paints it. Every
row state (Normal, Hover via `submenuLinkBgHover`, Current) is independent of the panel's
fill, so any mismatch between them was permanently exposed in that band regardless of state.

E1-3: `nav-drawer`'s `drawerBg` attribute defaults to `'primary'` (`nav-drawer/render.php`).
The pre-fix `color:inherit` was a safe-but-lossy placeholder because
`nav-menu-submenu-css.php` had no way to read `drawerBg` at all — it lives on a sibling
block, not on `sgs/nav-menu` itself.

## Fix — structural, reuses existing precedent

I1: `padding:0` + `overflow:hidden` on the ul rule (`nav-menu-submenu-css.php`, the
`.sgs-nav-menu__submenu{...}` declaration). Kept the pre-existing 2026-09-12 Normal-state
`submenuBg`→`submenuLinkBg` coalesce as defence-in-depth for the sub-pixel corner residual
`overflow:hidden` leaves at the four rounded corners.

E1-3: extended `nav-drawer/block.json::providesContext` with `"sgs/navDrawerBg":
"drawerBg"` and `nav-menu/block.json::usesContext` with `"sgs/navDrawerBg"` — the identical
channel shape `sgs/navDrawerSubmenuModel` already proves works between this exact
parent/child pair. `nav-menu/render.php` resolves `$block->context['sgs/navDrawerBg']` and
passes it into `sgs_nav_menu_submenu_css()`'s new `$drawer_bg_slug` param, which resolves
both hexes via `sgs_resolve_palette_hex()` and calls
`sgs_wcag_preferred_text_colour_for_bg( $drawerBgHex, $primaryHex )` — the same helper
`nav-drawer`'s own `drawerFgHex` already uses for its foreground. Token wins when it passes
4.5:1; degrades to the binary `#000`/`#fff` pairing when it fails; falls back to
`color:inherit` only when context/hex resolution is unavailable (e.g. not nested in a real
nav-drawer).

## Live verification (sandybrown canary, full deploy + cache purge)

Read the actual deployed, lifted stylesheet
(`wp-content/uploads/sgs-css/sgs-3579-87f4d7966abeace82211daf1f67bde02.css`) via `fetch()`
in-page, not inferred from source:

| Check | Result |
|---|---|
| `.sgs-nav-menu__submenu{...}` rule text | `padding:0;overflow:hidden;` — confirmed live |
| `.sgs-nav-menu__sublink:hover` rules | target the ROW only (`background-color`, `color`, `border-color` via `var(--wp--preset--color--accent...)`) — never the panel |
| Drawer sublink colour rule (bar instance, not in a drawer) | `:where(.sgs-nav-menu__bar--drawer) .sgs-nav-menu__sublink{color:inherit;}` — correct safe floor for the non-drawer instance |
| Drawer sublink colour rule (real drawer instance) | `:where(.sgs-nav-menu__bar--drawer) .sgs-nav-menu__sublink{color:#000;}` — genuinely computed, not a hardcoded literal |
| `--wp--preset--color--primary` (this client) | `#e68a95` |
| `drawerBg` default | `'primary'` → same `#e68a95` — confirms the contrast check is load-bearing on the framework DEFAULT, not an edge case |
| Contrast maths | `primary` (#e68a95) vs `drawerBg` (#e68a95) = 1:1, fails 4.5:1 → correctly degrades to `#000` (darker text reads better against this mid-light pink than white) |

Screenshots (Playwright, live canary):
- `reports/visual-diff/nav-menu-submenu-lip-2026-09-13-dropdown-open.png` (1440px) — "Our
  Story" dropdown open, "Ingredients"/"Our Promise" rows render flush to the panel's rounded
  corners with no visible seam or mismatched band top or bottom.
- `reports/visual-diff/nav-menu-submenu-lip-2026-09-13-drawer-submenu-open.png` (375px) —
  drawer open on pink `primary` `drawerBg`, "Our Story" expanded, "Ingredients"/"Our Promise"
  render in clearly legible dark/near-black text — not invisible pink-on-pink, not a stray
  `inherit` that happened to look right.

No genuine real-mouse `:hover` simulation was available in this session's Playwright MCP
toolset (no dedicated hover primitive; synthetic `dispatchEvent('mouseover')` does not
trigger CSS `:hover` matching in Chromium). Verified the hover mechanism instead by reading
the actual emitted rule text (table above) — the geometry guarantee (row fills 100% of the
panel's paintable area in every state) is deterministic CSS, not JS-dependent, so Normal-state
visual confirmation plus the hover-rule-targets-row-only proof together close this out.

## Files changed

- `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` — I1 panel padding/overflow fix;
  E1-3 drawer sublink colour full fix.
- `plugins/sgs-blocks/src/blocks/nav-menu/render.php` — reads `sgs/navDrawerBg` context,
  passes `$drawer_bg_slug` into `sgs_nav_menu_submenu_css()`.
- `plugins/sgs-blocks/src/blocks/nav-menu/block.json` — `usesContext` += `sgs/navDrawerBg`.
- `plugins/sgs-blocks/src/blocks/nav-drawer/block.json` — `providesContext` +=
  `sgs/navDrawerBg: drawerBg`.

## Out-of-scope observation (not fixed — genuinely pre-existing, disclosed at deploy time)

The pre-deploy `oldshape-audit` surfaced a NEW HIGH finding unrelated to this payload: post
`sandybrown/3500`, an `sgs/nav-drawer` block instance carries an undeclared
`sublinkMarkerIcon` attribute (that attribute is declared only on `sgs/nav-menu`'s own
`block.json`, never on `nav-drawer`'s). Confirmed via `git diff` that neither of this
payload's two edited `block.json` files touch the `attributes` block at all — only
`providesContext`/`usesContext`, which cannot cause an undeclared-attribute finding. Bypassed
with `--skip-oldshape-audit` and disclosed in the commit message
(`[gates-ok:oldshape-audit sublinkMarkerIcon-on-nav-drawer finding pre-existing, unrelated to
this payload, not touched by it]`). Needs its own investigation by whoever owns the
marker-icon feature — not fixed here.
