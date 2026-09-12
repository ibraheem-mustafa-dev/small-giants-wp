# Nav-menu Wave 2 solution design — Cluster 3 (chevron/caret disconnection)

**Scope:** Group M (M1/M2/M4/M6 shared-inheritance cluster, M5 separate gap) from
`.claude/reports/2026-09-12-nav-menu-visual-review-register.md`, root-caused in
`.claude/verify/nav-review-wave1-cluster4-chevron.md`. **Proposal only — no product code
edited.** M3 is excluded (Wave 1.5 reclassified it as a `submenuAlign` dead-control bug,
unrelated to the chevron; not this cluster's scope).

---

## 1. M1 / M2 / M4 / M6 — shared-inheritance cluster (one fix shape, four symptoms)

### Root cause recap (from the diagnostic, not re-derived)

`.sgs-nav-menu__link` (the `<a>`) and `.sgs-nav-menu__subtoggle` (the `<button>`, containing
`.sgs-nav-menu__caret > svg`) are DOM siblings under one shared parent,
`.sgs-nav-menu__submenu-root` (`nav-menu-markup.php::sgs_nav_menu_render_items`). CSS cannot
select a sibling's sibling by value — only a common ancestor can broadcast a value to both.
Three of the four symptoms are exactly this:

- **M4 (colour):** `itemColour` emits only onto `$link_sel = $uid_sel . ' .sgs-nav-menu__link'`
  (`nav-menu-css.php` line 41 + line 240 via `sgs_typography_css_rule`/colour emission). The
  caret's `color:inherit` climbs to `.sgs-nav-menu__submenu-root`, never to the link.
- **M6 (size):** the caret SVG is the raw Lucide `chevron-down` at a static 24×24px; nothing
  ties its dimensions to `itemFontSize` (a `{desktop,tablet,mobile}` tier-object,
  `block.json::itemFontSize`) or to the link's own resolved `font-size`.
- **M2 (hover propagation):** the existing rescue rule
  `.sgs-nav-menu__submenu-root:hover > .sgs-nav-menu__link` (nav-menu-css.php ~line 688)
  ALREADY fires when the caret is hovered (same ancestor, ordinary CSS `:hover` cascade) —
  but it repaints `.sgs-nav-menu__link` only, not the caret. Once M4's fix exists, M2 is
  closed as a side effect of the same selector shape — no separate mechanism needed.

### Fix shape

**File:** `plugins/sgs-blocks/includes/nav-menu-css.php`
**Function:** `sgs_nav_menu_item_state_css()`

**A. Colour (M4 + M2).** Wherever `$link_sel` currently receives `itemColour` /
`itemColourHover` / `itemColourCurrent` declarations, emit the identical declaration a
second time onto a caret-scoped selector built from the SAME `$uid_sel` root, not from
`$link_sel`:

```php
$caret_svg_sel = $uid_sel . ' .sgs-nav-menu__caret svg';
```

Every place the function currently writes `color:{value}` (or the sweep/highlight/current
colour-value branches) onto `$link_sel`, append the same declaration onto `$caret_svg_sel`
in the same rule block (comma-joined selector list, not a duplicate rule — keeps output
byte-count minimal and keeps normal/hover/current in lockstep by construction, so a future
4th state can't drift between the two selectors):

```php
$css .= $link_sel . ',' . $caret_svg_sel . '{color:' . $colour_value . ';}';
```

This is a **selector-list change**, not new logic — same value, same emission branch,
reaches both elements because both selectors resolve against the same `$uid_sel` scope.
Applies identically to hover and current-state blocks (the hover-treatment `swap`/`sweep`/
`highlight` variants all currently key off `$link_sel`; each needs the same paired-selector
treatment). The rescue rule at line 688 needs the same list-widening:

```php
$css .= $uid_sel . ' .sgs-nav-menu__submenu-root:hover > .sgs-nav-menu__link,'
      . $uid_sel . ' .sgs-nav-menu__submenu-root:hover .sgs-nav-menu__caret svg{color:inherit;}';
```

(Only widen the SELECTOR, not the declared value — the rescue rule already reads
`color:inherit` up from a parent that itself got the real value from the paired-selector
fix above, so no second value-lookup is needed.)

**Drawer parity (Bean confirmed this is one gap, not two):** the identical paired-selector
change applies to `nav-menu-submenu-css.php`'s drawer-scoped `.sgs-nav-menu__subtoggle{
color:inherit}` rule (~line 775) — pair `.sgs-nav-menu__link` with
`.sgs-nav-menu__caret svg` there too, scoped under `.sgs-nav-drawer`.

**B. Size (M6).** Two candidate approaches; recommend (i).

- **(i) em-based sizing, no PHP read of the tier-object at all (Bean's own proposed
  direction, and the cheaper build).** Set `font-size` explicitly on `.sgs-nav-menu__link`
  already happens via `sgs_typography_css_rule( $attributes, 'item', $link_sel )` (line 52)
  — but that only reaches the `<a>`, not an ancestor the caret can inherit from. Emit the
  SAME resolved item font-size onto `$uid_sel . ' .sgs-nav-menu__submenu-root'` as well
  (one extra selector on the existing `sgs_typography_css_rule()` call, or a second call
  scoped to the root) — this makes `.sgs-nav-menu__submenu-root` carry the real font-size as
  an inherited CSS value all descendants (including the caret's button and svg) can read via
  `em`. Then in `nav-menu-submenu-css.php`, change:
  ```css
  .sgs-nav-menu__caret svg{width:1em;height:1em;}
  ```
  replacing the current unconstrained raw-SVG default. `1em` resolves against the caret's
  own computed font-size, which now correctly inherits from the root rather than the
  browser button-reset default. This needs zero attribute reads in PHP for the caret itself
  — it rides the cascade. Verify the button reset at line 91
  (`.sgs-nav-menu__mega-trigger{background:none;border:0;font:inherit;cursor:pointer;}`)
  already sets `font:inherit` on the trigger button — confirm the plain `.sgs-nav-menu__
  subtoggle` button carries the same `font:inherit` reset (if it currently doesn't, add it;
  otherwise the button's own UA default font-size — not the inherited one — is what `1em`
  would resolve against, silently reintroducing the bug one level down).
- **(ii) Read the tier-object in PHP and emit a literal px value onto the caret selector
  directly** (mirrors the colour fix's shape exactly) — rejected as the primary
  recommendation because `itemFontSize` is a 3-tier responsive object; (i) gets the
  responsive behaviour for free via inheritance at each breakpoint's own emitted rule for
  `.sgs-nav-menu__link`/`.sgs-nav-menu__submenu-root`, whereas (ii) would require
  duplicating three separate `@media` blocks onto a second selector. Only fall back to (ii)
  if (i)'s `font:inherit` precondition turns out to be unreachable for some other reason
  found during implementation.

### Why this is universal, not a carve-out

Both fixes touch the ONE existing emission function per side (bar: `nav-menu-css.php`
+ `nav-menu-submenu-css.php`'s rescue/rotate block; drawer: `nav-menu-submenu-css.php`'s
drawer-scoped rule) and widen an existing selector list rather than adding a new
conditional branch — satisfies R-31-9 (no per-block/per-state carve-out) applied to this
plugin's own universal-mechanism discipline. No new attribute, no new control surface for
the client — `itemColour`/`itemColourHover`/`itemFontSize` already exist and are already
exposed in the inspector; this only widens where their computed value reaches.

### Falsifiable predictions

1. Build a fixture with `itemColour:"error"` (a real Mama's palette token) on a bar dropdown
   parent with `has_url:true`. **Predicted after fix:** `getComputedStyle(document.
   querySelector('.sgs-nav-menu__caret svg')).color` equals `getComputedStyle(document.
   querySelector('.sgs-nav-menu__link')).color`, both resolving to the `error` token's RGB —
   currently (unfixed) the caret stays on the ambient/theme default regardless of
   `itemColour`.
2. Same fixture, add `itemColourHover:"accent"`. Dispatch a real `mouseenter` on the
   `.sgs-nav-menu__subtoggle` BUTTON specifically (not the link). **Predicted after fix:**
   both link and caret repaint to the `accent` token's RGB. Currently (unfixed) neither
   repaints via this path — the rescue rule only reaches the link, and the caret has no
   colour rule to key off in the first place.
3. Measure `getComputedStyle(document.querySelector('.sgs-nav-menu__caret svg')).fontSize`
   at desktop (≥1024px), tablet (768–1023px), mobile (<768px) against a fixture with
   `itemFontSize:{desktop:"18px",tablet:"16px",mobile:"14px"}`. **Predicted after fix:** the
   caret's own computed `font-size` matches the tier's value at each width (proving the `1em`
   sizing tracks the responsive tier, not just the desktop default), and
   `getBoundingClientRect()` on the `<svg>` returns width/height equal to that font-size (1em
   × 1 = the font-size in px, since `1em` on `width`/`height` resolves against the element's
   own font-size). Currently (unfixed) the SVG stays fixed at 24×24px at every width.

### Baseline + validation command

```bash
# Baseline (before fix) — run against the live canary fixture page
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://sandybrown-nightingale-600381.hostingersite.com/?p=3487');
  const link = await page.locator('.sgs-nav-menu__submenu-root .sgs-nav-menu__link').first();
  const caret = await page.locator('.sgs-nav-menu__submenu-root .sgs-nav-menu__caret svg').first();
  console.log('link color:', await link.evaluate(el => getComputedStyle(el).color));
  console.log('caret color:', await caret.evaluate(el => getComputedStyle(el).color));
  console.log('caret box:', await caret.evaluate(el => el.getBoundingClientRect()));
  await browser.close();
})();
"
```
Run once BEFORE the fix (record the mismatch/oversize as baseline), then again on a rebuilt
fixture with explicit `itemColour`/`itemColourHover`/`itemFontSize` attributes AFTER the fix
lands, comparing link vs. caret values per prediction 1–3 above. A real fixture with these
attributes explicitly set does not currently exist on any of Bean's three verification pages
(3487/3488/3494) — one must be built as part of validation, not reused from Wave 1.

---

## 2. M5 — plain-dropdown caret flip: missing selector + duration dependency

### Root cause recap

The flip-rotation rule (`nav-menu-submenu-css.php` line 105) is:
```css
.sgs-nav-menu__mega-trigger[aria-expanded="true"] .sgs-nav-menu__caret{transform:rotate(180deg);}
```
`.sgs-nav-menu__mega-trigger` is the class used only by `sgs_mega_menu`-type items'
trigger button (`nav-menu-markup.php` ~line 130). The plain dropdown's trigger carries
`.sgs-nav-menu__subtoggle` instead (~line 238/250) — confirmed zero matches for
`sgs-nav-menu__subtoggle[aria-expanded` anywhere in the codebase. This is a selector never
written for that second trigger class, not a regression.

### Fix shape

**File:** `plugins/sgs-blocks/includes/nav-menu-submenu-css.php`, immediately beside line 105.

Widen the existing rule to a selector list covering both trigger classes, rather than adding
a second near-duplicate rule (keeps the two triggers' flip behaviour permanently identical
by construction — one rule, one place to change duration/easing later):

```php
$css .= $uid_sel . ' .sgs-nav-menu__mega-trigger[aria-expanded="true"] .sgs-nav-menu__caret,'
      . $uid_sel . ' .sgs-nav-menu__subtoggle[aria-expanded="true"] .sgs-nav-menu__caret{transform:rotate(180deg);}';
```

No change needed to `mega-disclosure.js` — it already sets `aria-expanded="true"` on
whichever trigger button it's bound to (confirmed: the toggle action operates on the button
element generically, not by class name), so the attribute this selector keys on is already
present on the plain-dropdown trigger today; only the CSS rule matching it was missing.

**Drawer:** no change needed — the drawer's own flip rule (`nav-menu/style.css` line 429,
keyed on `.sgs-nav-menu__accordion[open]`) already works per Bean's own confirmation; this
fix is bar-only, which is correct since the gap is bar-only.

### Duration-sync half — explicitly NOT solved here, dependency named

Bean's second ask (flip duration should match the dropdown's own reveal-animation duration)
cannot be built yet: `nav-menu-submenu-css.php` lines 93–103 carry a dated 2026-09-10 comment
explaining the flip is deliberately INSTANT (no `transition` property at all) because every
consumer currently opens its panel instantly too (`display:none/block` toggle, native
`<details>` with no animation) — an animated flip against an instant panel reads as lagging.
`submenuAnimation` (`block.json` line 770) defaults to `'none'` and has no paired
`submenuAnimationDuration` attribute or CSS custom property anywhere in the codebase today
— confirmed by direct grep, zero hits. There is no duration value to reference yet.

**Sequencing note for whoever picks up Group F:** when Group F ships a real open-transition
for the panel, it will need to expose its own duration as an inspectable value (custom
property, e.g. `--sgs-nav-submenu-reveal-duration`, or a literal shared PHP constant both
the panel-open CSS and this flip rule read from) — at that point, add
`transition:transform var(--sgs-nav-submenu-reveal-duration) ease;` to the widened flip
selector above, reading the SAME custom property Group F defines, rather than a second
hand-picked duration value. This is a one-line follow-up once Group F lands; it is out of
scope to build now because the value it would reference does not exist.

### Falsifiable predictions

1. Build a plain-dropdown fixture (`has_url:true`, no mega-menu variant) on the bar. Dispatch
   a real click/hover to set `aria-expanded="true"` on `.sgs-nav-menu__subtoggle`.
   **Predicted after fix:** `getComputedStyle(caret).transform` changes from `matrix(1, 0, 0,
   1, 0, 0)` (identity) to a 180°-rotation matrix (`matrix(-1, 0, 0, -1, 0, 0)`, allowing for
   float precision). Currently (unfixed) it stays identity regardless of `aria-expanded`.
2. Same fixture, close the dropdown (`aria-expanded` reverts to `"false"`). **Predicted after
   fix:** the caret's transform reverts to identity — proving the rule isn't accidentally a
   one-way toggle.
3. Confirm no regression to the mega-trigger path: repeat prediction 1 against an existing
   mega-menu fixture (already confirmed working, per the register's G6 finding) — the
   widened selector-list must not change its behaviour.

### Baseline + validation command

```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://sandybrown-nightingale-600381.hostingersite.com/?p=3487');
  const toggle = page.locator('.sgs-nav-menu__subtoggle').first();
  const caret = page.locator('.sgs-nav-menu__subtoggle .sgs-nav-menu__caret').first();
  console.log('BEFORE transform:', await caret.evaluate(el => getComputedStyle(el).transform));
  await toggle.hover();
  await page.waitForTimeout(600); // clears the hover-intent debounce
  console.log('OPEN transform:', await caret.evaluate(el => getComputedStyle(el).transform));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(600);
  console.log('CLOSED transform:', await caret.evaluate(el => getComputedStyle(el).transform));
  await browser.close();
})();
"
```
Run before the fix (expect all three lines identical — identity matrix throughout) and after
(expect BEFORE=identity, OPEN=rotated, CLOSED=identity again).

---

## Summary for Bean

| Item | Fix shape | File(s) | Blocked on |
|---|---|---|---|
| M4 (caret colour) | Widen existing colour selectors to a paired list (link + caret svg) | `nav-menu-css.php`, `nav-menu-submenu-css.php` (drawer rule) | Nothing — ready |
| M2 (hover propagation) | Closes automatically once M4's paired selector exists | same as M4 | M4 |
| M6 (caret oversize) | Emit item font-size onto the shared root; caret svg sized in `1em` | `nav-menu-css.php` (font-size emission), `nav-menu-submenu-css.php` (`.sgs-nav-menu__caret svg`) | Nothing — ready, pending a `font:inherit` check on `.sgs-nav-menu__subtoggle` |
| M1 | Not a separate fix — resolved as the combined effect of M2+M4 (open/close JS already unified; only visual state was disconnected) | — | M2, M4 |
| M5 (bar flip missing) | Widen the existing rotate selector to include `.sgs-nav-menu__subtoggle` | `nav-menu-submenu-css.php` | Nothing — ready |
| M5 (duration sync) | Named dependency only, not designed here | — | Group F (no open-animation duration value exists yet) |

Five of six sub-items are ready to build with no blockers; the sixth (M5's duration-sync
half) is explicitly deferred pending Group F. Recommend building M4/M2/M6/M1 together (one
PHP edit session, `nav-menu-css.php` + `nav-menu-submenu-css.php`) since they share the exact
selector-widening pattern, then M5's selector fix as a second, unrelated one-line change in
the same file.
