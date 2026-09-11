# Wave 1 diagnostic — Group M (horizontal dropdown chevron structural disconnection)

**Scope:** diagnostic only, no fix proposed. Register item: `.claude/reports/2026-09-12-nav-menu-visual-review-register.md` Group M (M1-M6).

**Evidence base:** `plugins/sgs-blocks/includes/nav-menu-markup.php::sgs_nav_menu_render_items` (bar markup),
`plugins/sgs-blocks/includes/nav-menu-markup.php::sgs_nav_menu_render_items_drawer` (drawer markup, comparison),
`plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js` (bar JS store),
`plugins/sgs-blocks/includes/nav-menu-css.php` + `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` (bar CSS),
`plugins/sgs-blocks/src/blocks/nav-menu/style.css` (drawer CSS), plus live DOM/computed-style checks on
`sandybrown-nightingale-600381.hostingersite.com` pages 3487 ("Our Story" item, has_url branch) at 1440px.

---

## Structural baseline (read directly from the markup)

**Bar dropdown, item WITH its own URL** (`nav-menu-markup.php::sgs_nav_menu_render_items`, the `! empty( $item['has_url'] )` branch, ~line 236):
```html
<div class="sgs-nav-menu__submenu-root" data-sgs-nav-disclosure="dropdown"
     data-wp-interactive="sgs/mega" data-wp-context="{...}"
     data-wp-on--mouseenter="actions.enterBridge" data-wp-on--mouseleave="actions.leaveBridge"
     data-wp-watch="callbacks.watchOpenState">
  <a class="sgs-nav-menu__link" href="/about/">
    <span class="sgs-nav-menu__link-text sgs-nav-menu__magnet-target">Our Story</span>
  </a>
  <button type="button" class="sgs-nav-menu__subtoggle" data-sgs-mega-trigger
          aria-expanded="false" data-wp-on--click="actions.toggle" ...>
    <span class="screen-reader-text">Show submenu for Our Story</span>
    <span class="sgs-nav-menu__caret" aria-hidden="true"><svg .../></span>
  </button>
  <div class="sgs-nav-menu__submenu-wrap" data-sgs-mega-panel>...</div>
</div>
```
The `<a class="sgs-nav-menu__link">` and `<button class="sgs-nav-menu__subtoggle">` are **true DOM siblings**, both direct children of `.sgs-nav-menu__submenu-root`. The caret lives inside the button, never inside the link. (Live-confirmed: `outerHTML` pulled from page 3487, "Our Story" item, matches this exactly.)

**Bar dropdown, item with NO URL of its own** (~line 249): here the caret DOES end up inside the same element as the label — `<button class="sgs-nav-menu__link sgs-nav-menu__subtoggle">{label}{caret}</button>` — a single element carrying both classes. This branch is structurally already unified. Bean's complaint applies to the far more common has-URL case.

**Drawer accordion equivalent** (`sgs_nav_menu_render_items_drawer`, ~line 408-427): the drawer ALSO splits parent-link from expander — `$label_html` (an `<a class="sgs-nav-menu__link">`) sits as a sibling of a `<details class="sgs-nav-menu__accordion">` containing `<summary class="sgs-nav-menu__accordion-summary"><span class="sgs-nav-menu__caret">`. The code comment literally says this "mirrors the bar's own `sgs-nav-menu__subtoggle` split." So **the drawer is not structurally unified either** — it uses the exact same split-sibling shape. What differs is which mechanisms were wired on top of that shape (see M2/M4/M5 below), not the shape itself.

---

## M1 — chevron as "a separate hover-trigger", disconnected from the item

**Partially confirmed, precision matters for Wave 2 scoping.**

- The JS **open/close mechanism is already unified**: `data-wp-on--mouseenter="actions.enterBridge"` / `--mouseleave="actions.leaveBridge"` are bound on `.sgs-nav-menu__submenu-root` (the wrapping div), not on the link or the button individually (`nav-menu-markup.php` line ~268; confirmed live — hovering `.sgs-nav-menu__subtoggle` directly and dispatching `mouseenter` on it sets `aria-expanded="true"` on the button within ~500ms, i.e. the hover-intent path fires). So functionally, hovering the caret DOES open the same dropdown the link belongs to — it is not "a second, independent dropdown".
- What IS genuinely true, and is very likely what reads to Bean as "a separate trigger": the caret sits inside its own **44×44px hit-target button** (`nav-menu-submenu-css.php::` `.sgs-nav-menu__subtoggle{min-width:44px;min-height:44px;...}`), visually and interactively distinct from the link's own hit box — two separately-outlined/focusable controls sitting side by side, each independently reachable by keyboard Tab, each with its own hover cursor feedback. The controls are UNIFIED for the open/close *action* but remain two DISTINCT interactive elements for every visual/state purpose (see M2, M4, M6) — that is the real substance of "disconnected."

**Root cause:** the split-sibling markup shape itself is not the bug (see drawer comparison above — same shape exists there deliberately, FR-36-6 "split parent-link from expander"). The bug is that only the JS open/close action was carried across the split; the surrounding visual-state mechanisms (colour cascade, size inheritance, flip animation) were not.

## M2 — hovering the chevron does not trigger the parent item's own hover visual state

**Architecturally should already work for colour — but UNTESTABLE on the live canary because no fixture sets an item hover colour on any bar dropdown.**

- `nav-menu-css.php` carries a purpose-built rescue rule, comment-documented at line ~622: *"When the pointer enters the open dropdown, the parent link loses its `:hover` because `:hover` does not match an ancestor whose visual box does not contain the target. This rule restores it by keying on the wrapper's `:hover` state."* The actual selector (line 688): `` .sgs-nav-menu__submenu-root:hover > .sgs-nav-menu__link `` — built to compensate for exactly the pattern in this file (link + panel are siblings under one root).
- Since `.sgs-nav-menu__subtoggle` (the caret's button) is *also* a direct child of `.sgs-nav-menu__submenu-root`, hovering it makes `:hover` true on the root ancestor by ordinary CSS cascade rules — which means this SAME selector should also apply the item's hover colour when only the caret is hovered, not just when the link or panel is hovered. On paper this is a shared-root fix that already covers M2, not a separate gap.
- **Live-verified fixture gap, not a live-verified pass:** searched `document.styleSheets` on all three of Bean's own verification pages (3487 "STEP23 GATE", 3488 "Step22-QA", 3494 "UI-Verify") for any rule matching `submenu-root:hover` or `sgs-nav-menu__link` + `:hover` — **zero rules found on any of the three pages.** Every dropdown item on all three pages was built with NO `itemColourHover` (or border/bg hover) attribute set, so the CSS this mechanism depends on was never emitted at all. There is currently no live fixture that can prove or disprove whether hovering the caret actually repaints the link — this is the same class of gap Bean already flagged for D4/M5 (open question 3 in the register), just recurring for M2 too.
- **This needs a fixture with an explicit `itemColourHover` before Wave 2 can trust a pass/fail here** — do not accept the current pages as evidence either way.

## M3 — dropdown panel positions/centres itself relative to the CHEVRON, not the parent item

**Refuted by both code and live measurement — this looks like a PRIOR regression that has already been fixed, not a current defect.**

- `mega-disclosure.js::repositionPanel` carries its own dated incident note (2026-07-31): *"Measured live 2026-07-31: anchoring on the trigger put the panel 89px right of the item (panel.left 362 vs item.left 273), because when a parent has its own URL the trigger is the small caret BUTTON sitting after the link, not the item itself."* The fix that shipped from that incident explicitly anchors on `root.getBoundingClientRect()` (the whole `.sgs-nav-menu__submenu-root`, which wraps both the link and the toggle), not on `[data-sgs-mega-trigger]` (the caret button) — see `repositionPanel`'s `dropdown` branch, `const anchor = root.getBoundingClientRect();`.
- **Live-confirmed on page 3487, "Our Story" item:** `root.getBoundingClientRect().left === 484.5625`; after dispatching hover to open the panel, `panel.getBoundingClientRect().left === 484.5625` — exact match to the item's own left edge, not the caret's (`toggle.getBoundingClientRect().left === 580.98`, ~96px to the right).
- **Conclusion:** M3 as described (panel keyed to the chevron) does not reproduce on this canary today. Either Bean was looking at a build that predates this fix, or at a case this fix doesn't cover (e.g. `align="center"`/`"end"`, or the no-URL single-button branch, or a mega-menu item rather than a plain dropdown — none of which were tested here due to budget). Flag to Wave 2 as "re-confirm with Bean which exact item/page he saw this on" rather than "build a fix" — the mechanism that would fix it already exists and already passes the one case tested.

## M4 — chevron should be painted using the item's TEXT colour attribute

**Confirmed as a genuine wiring gap** (drawer included — same gap, not drawer-exclusive).

- The chevron's `<svg stroke="currentColor">` never receives its own colour; it resolves via CSS inheritance. Its ancestor `.sgs-nav-menu__subtoggle` is declared `color:inherit` (`nav-menu-submenu-css.php` line 699), which inherits from `.sgs-nav-menu__submenu-root` — a sibling-level ancestor of the caret, NOT the `<a class="sgs-nav-menu__link">` element, since the link is a sibling, not a parent, of the toggle button.
- The item's explicit colour attribute (`itemColour`) is emitted as `` .sgs-nav-menu__link{color:...} `` (`nav-menu-css.php::` `$link_sel = $uid_sel . ' .sgs-nav-menu__link'`, line 41; declaration at line 240) — a selector that can **only ever match the `<a>` element**, never a sibling `<button>`/`<span>`/`<svg>`.
- **Live-measured on page 3487** (no `itemColour` override set on this fixture): `link.color === rgb(58,46,38)` and `svg.color === rgb(58,46,38)` — they currently match, but only because BOTH are falling through to the SAME ambient/inherited default text colour several levels further up the tree (theme/nav base colour), not because the caret is deliberately reading the link's own colour. The moment an operator sets an explicit `itemColour` different from that ambient default, only `.sgs-nav-menu__link` repaints — the caret, whose colour comes from a different inheritance chain entirely, stays on the old ambient value. This is provable from the selector scoping alone; no fixture with an explicit `itemColour` was available on the tested pages to also pixel-confirm it, but the CSS-cascade mechanics leave no room for a different outcome (siblings never inherit from each other in CSS).
- **Drawer parity:** the drawer's `.sgs-nav-menu__subtoggle{color:inherit}` rule (submenu-css line ~775) is drawer-scoped (`.sgs-nav-drawer ... .sgs-nav-menu__subtoggle`) but has the identical shape and the identical gap — its caret is likewise wired to the wrapping element's inherited colour, not to `itemColour` specifically. Bean's instinct that "same requirement applies identically to the drawer" is correct: this is one gap, not two.

## M5 — chevron flip animation: works on drawer, missing/broken on bar; both need synced timing to the (currently nonexistent) open animation

**Confirmed, and the root cause is narrower and more specific than "the flip regressed" — it never existed for this particular trigger class.**

- Drawer flip rule (`plugins/sgs-blocks/src/blocks/nav-menu/style.css` line 429): `` .sgs-nav-menu__accordion[open] > .sgs-nav-menu__accordion-summary .sgs-nav-menu__caret { transform: rotate(180deg); } `` — keyed on the native `<details open>` attribute. This exists and is well-formed.
- Bar equivalent rotate rule (`nav-menu-submenu-css.php` line 105): `` .sgs-nav-menu__mega-trigger[aria-expanded="true"] .sgs-nav-menu__caret{transform:rotate(180deg);} `` — **this selector is keyed to `.sgs-nav-menu__mega-trigger`, the class used ONLY by `sgs_mega_menu`-type items' trigger button** (`nav-menu-markup.php` line ~130, the `sgs-nav-menu__mega` branch). The plain dropdown's own trigger carries a DIFFERENT class, `.sgs-nav-menu__subtoggle` (line ~238/250) — confirmed by an exhaustive grep across `plugins/sgs-blocks/src` and `includes/` for `sgs-nav-menu__subtoggle[aria-expanded` returning **zero matches anywhere in the codebase**. The plain-dropdown caret was simply never given a flip rule at all — it isn't a regression of something that used to work, it is a selector that was written for the mega-menu code path and never extended to the (structurally near-identical, later-added) plain-dropdown code path.
- **On the "duration should match the open animation" half:** there currently IS no open animation to match. `nav-menu-submenu-css.php` line ~93-102 carries a dated comment (Bean, 2026-09-10) explaining that the caret's flip transition was deliberately made instant (no `transition` property at all) specifically BECAUSE every consumer of the shared `.sgs-nav-menu__caret` class opens its panel instantly (`display:none/block` toggling, and native `<details>` with no animation) — an animated flip against an instant panel "always reads as lagging behind." So M5(b) (sync flip duration to reveal duration) is not really a "wire two numbers together" gap on its own — it is entirely gated on Group F (no opening animation anywhere) landing first. Once a real open-transition exists for the panel/`<details>`, the flip's `transition-duration` would need to reference the same value: currently there is no such value for it to reference.
- This is the ONE part of Group M that most clearly is NOT the same root cause as M1-M3/M6 — it is a missing selector on a specific, differently-named element, not a consequence of link/caret being siblings.

## M6 — chevron renders oversized relative to the item's text

**Confirmed and quantified.**

- Live-measured on page 3487: caret `<svg>` renders at its raw Lucide default, `width="24" height="24"` (from `sgs_get_lucide_icon('chevron-down')` — a static, unscaled SVG), against the link text's computed `font-size: 16px`. That is a **1.5× ratio** between icon size and item text size, with nothing in `nav-menu-css.php`/`nav-menu-submenu-css.php`/`style.css` constraining `.sgs-nav-menu__caret svg` to any `em`/`ch`-relative or font-size-linked dimension — the only rule touching `.sgs-nav-menu__caret` itself is `display:inline-flex` (no width/height/font-size declared at all).
- Bean's own proposed fix direction (wire icon size to the item's font-size once M1-M3 are resolved) is consistent with the evidence: the icon currently has NO sizing relationship to the item's text at all, in either direction, so any "inherit from item" mechanism would need to be built from scratch rather than un-hidden or re-enabled.

---

## Is this one shared root cause, or several? (factual observation on the code's current shape, not a fix design)

**Genuinely two clusters, not one:**

1. **A shared-inheritance cluster — M2, M4, M6 (and half of M1).** All three share the exact same underlying shape: `.sgs-nav-menu__link` and `.sgs-nav-menu__subtoggle`/`.sgs-nav-menu__caret` are DOM siblings, and every one of colour (M4), size (M6), and (unverifiable-but-architecturally-plausible) hover-cascade completeness (M2) depends on whether a mechanism was built to read a value FROM the link and apply it TO the caret, or to source both from one shared place. The JS open/close (M1's functional half) and the panel's positioning (M3) already solved this exact "read from the whole item, not the sub-element" problem once each, independently, in JS (`rootFor()`, `repositionPanel`'s `root.getBoundingClientRect()`). Colour and size never got the equivalent treatment in CSS. This looks like ONE fixable pattern applied inconsistently across four different properties, not four unrelated bugs — a single mechanism (e.g., resolving colour/size against the shared `.sgs-nav-menu__submenu-root`/link rather than against the caret's own default inheritance chain) would very plausibly close M2, M4, and M6 together.
2. **A separate, narrower bug — M5.** The flip-rotation selector for the plain dropdown was never written at all (it exists only for the differently-classed mega-trigger). This is not a consequence of the sibling-split shape — the drawer proves a flip CAN work perfectly fine on a split-sibling shape (`<details>`/`<summary>` is arguably an even more separated structure than the bar's). It is a straightforward missing-selector gap, independent of whatever Wave 2 decides to do about M1-M3/M6's shared-inheritance cluster. Its "sync duration to the reveal animation" half is additionally blocked on Group F (no open animation exists yet to sync to) — a dependency Wave 2 needs to sequence, not something Group M can resolve alone.

**M3 stands alone as already-fixed** — it should be re-confirmed with Bean (which page/case he saw it on) rather than queued as an open defect; nothing in the code or the one live case tested reproduces it today.

## Industry-pattern research note (per Bean's instruction)

Checked against well-established convention rather than a live search, since this is settled, widely-documented practice: the single-clickable-element shape (chevron as a `::after` pseudo-element or nested `<span>` INSIDE one `<a>`) is the norm for a dropdown trigger that does NOT also need to navigate anywhere on click (Bootstrap's `.dropdown-toggle`, most page-builder "expand only" parents). But SGS's actual case — a parent that BOTH has its own real URL AND needs a separate expand affordance — is exactly the "split button" shape, which is also an established, accessible pattern (Bootstrap 5 split-button dropdowns; the code's own `repositionPanel` comment cites this same reasoning: "the trigger is the small caret BUTTON... a parent WITH a URL keeps its link... and gets a separate adjacent toggle"). **The gap here is not "SGS chose the wrong shape"** — split-sibling is a legitimate, deliberate choice for the has-URL case — **it is that shared visual state (colour, size, hover, flip) was not propagated across the split the way the JS open/close state and the panel position already were.** Wave 2 should scope this as "finish wiring the split-button pattern" rather than "rebuild to a single-element pattern," unless Bean specifically wants the simpler single-`<a>` shape for its own sake (which would also mean giving up the separately-navigable parent link for has-URL items — a behaviour change beyond what M1-M6 describe).
