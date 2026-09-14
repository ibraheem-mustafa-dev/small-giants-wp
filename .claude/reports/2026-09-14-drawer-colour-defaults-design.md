---
doc_type: design
date: 2026-09-14
status: PROPOSED — awaiting owner sign-off (Rule 7 design gate)
governs: D1060 rulings 1–9; plan Step 2.5
---

# Drawer colour defaults, submenu panel and gradient — design

Implements the owner rulings recorded in **D1060**. Evidence for every "today" statement below:
`.claude/reports/2026-09-14-nav-menu-split-decisions-review.md`.

## The finding that reshapes the sequence

**The drawer's nested-row defaults are block attribute defaults, shared with the desktop dropdown.**
`nav-menu/block.json`: `submenuLinkBg: "surface"`, `submenuLinkBgHover: "primary"`,
`submenuLinkBgCurrent: "surface-alt"`, `submenuColourCurrent: "text"`. The desktop dropdown rows and
the drawer's nested rows read the same attributes. While `sgs/nav-menu` is one block, making the
drawer's rows transparent at rest would either change the desktop dropdown too, or need
fork-scoped CSS defaults — exactly the bar/drawer branching the split exists to delete.

So the rulings divide cleanly:
- **Part A — fork-independent. Do now, on the current block**, verifiable on the canary today.
- **Part B — fork-specific defaults. Do in Step 2**, where `sgs/nav-drawer-menu` gets its own
  `block.json` defaults and nothing has to branch.

This corrects the earlier recommendation to do all colour work on the current block first.

## Part A — now, on the current block

### A1. `drawerBg` defaults to `surface` (D1060 ruling 1)
- **Today:** `nav-drawer/block.json::attributes.drawerBg` default `"primary"`, against FR-41-36.
- **Change:** default → `"surface"`.
- **Knock-on:** `nav-drawer/render.php` computes the dialog's text colour with
  `sgs_wcag_text_colour_for_bg( $drawer_bg_hex )` each render, so text stays readable automatically.
  Drawer variants that set no `drawerBg` of their own (`anchored-card-stack`, `editorial-ghost-list`)
  change appearance — check both visually. The `solid-brand-light` variant keeps `drawerBg:'primary'`.
- **Separate block:** `sgs/nav-drawer` is not part of the nav-menu split, so this is independent of it.

### A2. Stop the drawer blocking `itemColour` (D1060 ruling 4)
- **Today:** `nav-menu-submenu-link-css.php` (the "M4/M2 drawer parity (2026-09-12)" rule) emits
  `.sgs-nav-drawer {uid} .sgs-nav-menu__subtoggle, … .sgs-nav-menu__link, … .sgs-nav-menu__caret svg
  {color:inherit}` at (0,3,0), beating `itemColour`'s own (0,2,0) rule.
- **Change:** wrap the whole selector list in `:where( … )` so it becomes a zero-specificity default.
  The rule's stated intent — the caret matches the link — is preserved: when `itemColour` is set, its
  own rule already targets `.sgs-nav-menu__caret svg`; when unset, the `:where()` `inherit` still applies.
- **Regression check (done):** `itemColour` has no PHP default when empty (`nav-menu-css.php` emits its
  rule only when non-empty), and static `nav-menu/style.css` sets `.sgs-nav-menu__link{color:inherit}`
  at (0,1,0). So with nothing set, drawer links still inherit the drawer's adaptive text colour.
- **⚠ Knock-on to approve:** today that (0,3,0) rule ties the item hover default
  (`:where(:root:not(.sgs-touch-input)) {uid} .sgs-nav-menu__link:hover`, also (0,3,0)), and source
  order decides. After A2 the hover default wins outright, so **drawer items will show the `accent`
  hover text colour** — the value PHP defaults `itemColourHover` to (Wave 2 E1). That is FR-41-36's
  hover colour and reads fine on a `surface` drawer; Part B revisits drawer hover.

### A3. `submenuBgGradient` renders by default (D1060 ruling 9)
Rule: a gradient is ignored **only** when auto contrast adaptation is on (off by default). Today the item
hover gradient already obeys this — ignored only when `itemSmartContrast` is on — and no other code in
the four nav colour emitters discards a gradient. Two causes violate it:
1. **The 2026-09-12 fallback.** `nav-menu-submenu-css.php` swaps the panel background source to
   `submenuLinkBg` when `submenuBg` is empty and `submenuLinkBg` is not — and `submenuLinkBg` defaults to
   `surface`, so an explicit `submenuBgGradient` is replaced with `submenuLinkBgGradient` (`''`).
   **Change:** also require `submenuBgGradient` to be empty before the fallback engages. The helper
   `sgs_custom_property_gradient_decls()` writes the flat colour and the gradient independently, so the
   gradient emits even when the flat colour is empty.
2. **The drawer's `background:` shorthand.** The drawer accordion panel rule
   (`nav-menu-submenu-link-css.php`) and the drill-down panel rule (`nav-menu-submenu-css.php`) both use
   `background:var(--sgs-nm-submenu-bg, …)`. A shorthand resets `background-image` to `none`, cancelling
   the base rule's `background-image:var(--sgs-nm-submenu-bg-gradient,none)`.
   **Change:** `background-color:var(--sgs-nm-submenu-bg, …)` plus
   `background-image:var(--sgs-nm-submenu-bg-gradient, none)` in both rules, same fallback chains.

### A4. `submenuPadding` works in the drawer (D1060 ruling 7)
- **Today:** the drawer panel rule hardcodes `padding:0` at (0,3,0), beating `submenuPadding`'s (0,2,0).
- **Change:** move `padding:0` out of that rule into its own `:where( .sgs-nav-drawer {uid}
  .sgs-nav-menu__submenu ){padding:0}`. The other resets (`min-width:0`, `border-radius:0`,
  `box-shadow:none`) stay hardcoded: they belong to attributes the drawer block will not carry (ruling 6),
  and they go when the split removes those attributes from it.
- **Verify:** that `submenuPadding`'s responsive rule actually wins over the base panel rule in source
  order once the (0,3,0) reset is gone — measure it, do not assume.

### A5. Hide the text-indent control (D1060 ruling 8)
- **Today:** `nav-menu/edit.js` passes `showTextIndent: true` for both the item and submenu typography
  panels.
- **Change:** `false` in both places. The `itemTextIndent` / `submenuTextIndent` attributes stay declared.

## Part B — Step 2, in `sgs/nav-drawer-menu`'s own `block.json` and render

> **Corrected 2026-09-14.** An earlier draft of Part B proposed hover/current colours DERIVED from the
> drawer background (`color-mix` tints of `currentColor` or accent). That misread the owner's "match" as
> "adapt". Owner: *"I NEVER SAID I WANTED ADAPTATIONS/VARIATIONS OF THE BG COLOUR. I SAID THAT THE
> COLOURS SHOULD JUST MATCH WELL AND ITS EASIER TO DO THAT WITH SURFACE AS YOUR BASE FILL RATHER THAN
> PRIMARY WHICH IS USUALLY A STRONGER COLOUR! WE GO WITH GLOBAL TOKENS FOR THE DEFAULTS AND REMEMBER THAT
> NOTHING SHOULD BE HARD CODED!!!"* Derived-colour options are withdrawn. See D1060 ruling 4.

### The two rules Part B follows
1. **Defaults are global palette tokens** — `var(--wp--preset--color--<token>)` — chosen to harmonise
   with the `surface` base. No colour is derived, mixed or computed from the background.
2. **Nothing is hardcoded.** Every default is emitted inside `:where()` at zero specificity, so any
   colour a client sets wins regardless of source order; and no literal value stands in for a token.

### B1. Transparent at rest (D1060 rulings 2–3)
- Top-level items: **already transparent** — `itemBg`, `itemBgHover`, `itemBgCurrent` all default `""`
  and no background rule is emitted. No change needed.
- Nested rows: the drawer block declares `submenuLinkBg` with no background default, so rows blend with
  the drawer at rest. `sgs/nav-bar-menu` keeps `submenuLinkBg: "surface"` for its dropdown.
- The drawer accordion panel's own default fill becomes transparent for the same reason.

### B2. Token defaults for hover and current — proposal, confirm at Step 2
Two sources, shown separately so neither is mistaken for the other: **FR-41-36** is the owner's token
table (2026-09-11, spec §FR-41-36 rows "Drawer top-level" and "Drawer nested submenu"); **Code today** is
the current `nav-menu/block.json` default or PHP default. D1060 overrides both at rest (transparent).
Every value that ships will be a palette token emitted as a `:where()` default.

| Drawer surface · state | FR-41-36 | Code today | Proposed |
|---|---|---|---|
| Top-level item bg · rest | `surface-alt` | none | **transparent** (D1060) |
| Top-level item bg · hover | `accent-light` tint | none | `accent-light` |
| Top-level item bg · current | `accent-light` tint | none | `accent-light` |
| Top-level item text · rest | `primary` | inherited computed colour | `primary` |
| Top-level item text · hover | not specified | `accent` (PHP default) | *to confirm* |
| Top-level row separator · rest | `accent` | `border-light` | *to confirm* |
| Top-level row separator · hover / current | not specified | `accent` | *to confirm* |
| Nested row bg · rest | `surface` | `surface` | **transparent** (D1060) |
| Nested row bg · hover / current | not specified | `primary` / `surface-alt` | *to confirm* |
| Nested row text · rest | `primary` | `text` via PHP / inherited | `primary` |
| Nested row separator · rest | `accent` | `border-light` | *to confirm* |

Today's nested-row defaults (`submenuLinkBgHover: "primary"`, a solid brand fill; `submenuLinkBgCurrent:
"surface-alt"`; `submenuColourCurrent: "text"`) were set for the desktop dropdown and are shared with the
drawer only because it is one block. The drawer block sets its own at Step 2.

**Check when choosing the tokens:** project memory `brand-accent-is-a-ground-never-an-indicator` records
four contrast failures where a mid-luminance accent was used as a thin indicator (border, underline, rail)
rather than a large field. Measure the chosen separator and hover-text tokens against `surface` before
signing them off.

### B3. Hardcoded values in today's drawer CSS that must become tokens
Found while designing; each violates "nothing hardcoded":
- Drawer accordion panel fallback `color-mix(in srgb, currentColor 6%, transparent)`
  (`nav-menu-submenu-link-css.php`) — removed by B1 (transparent at rest).
- Drawer nested link indent rule `border-left:2px solid color-mix(in srgb, currentColor 25%, transparent)`
  (same file) — its colour becomes a token (e.g. `border-light`).
- Drawer `color:inherit` — made overridable by A2, but `inherit` is still not a token.
- **The drawer dialog's text colour is COMPUTED**, not a token: `nav-drawer/render.php` sets
  `color:` from `sgs_wcag_text_colour_for_bg( $drawer_bg_hex )`. Under rule 1 it should be a token
  default (e.g. `text`). With `drawerBg: surface` the visual result is the same. **Owner to confirm** —
  it changes `sgs/nav-drawer`, which is outside the nav-menu split.

### B4. Contrast
No contrast check enforces anything by default. `itemSmartContrast` stays opt-in and is the only thing
that may discard a client's colour or gradient.

## Verification

Closes on the live canary page, not assertions (R-31-11 / R-31-13):
1. Deploy with `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown`; never hand-roll.
2. **Computed-style checks with transitions disabled first** (`*{transition:none!important}` injected
   for measurement) — see memory `computed-style-after-forced-state-reads-the-transition-start`.
3. Per change, before and after:
   - A1: drawer panel background resolves to `surface`; drawer text meets 4.5:1; the two variants
     without their own `drawerBg` checked by eye.
   - A2: set `itemColour` → drawer link and caret take it; unset → both inherit the drawer text colour;
     drawer hover shows `accent`.
   - A3: `submenuBgGradient` alone (no `submenuBg`) renders on the bar dropdown AND in the drawer
     accordion; with `itemSmartContrast` on, item hover gradient still ignored.
   - A4: `submenuPadding: 0 0 16px` renders in the drawer; unset, drawer nested list padding stays 0.
   - A5: the text-indent control is absent from both typography panels.
4. **Negative controls:** revert each change locally and confirm its check fails (A2: `itemColour` no
   longer applies in the drawer; A3: gradient absent) — a check that cannot fail proves nothing.
5. Gates: `npm run gate:list`, then the prebuild chain; `node scripts/audit-inline-styling.js --check`
   exits 0; `check-ungated-paint-rules.py` (hard-fail for `sgs/nav-menu`) passes.
6. Owner's eye on the drawer before closing.

## Follow-ups (not in this change)
- Amend Spec 41 FR-41-36 to record D1060 rulings 1–3.
- `featuredColour` in the drawer is probably blocked by the same `color:inherit` rule; A2 should fix it
  too — confirm during verification rather than assume.
- Sub-item indent is a missing drawer-native control (D1060 ruling 7) — new scope, owner to approve.
