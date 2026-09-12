# Re-investigation — M3 (dropdown panel anchors to chevron, not item)

**Task:** test the hypothesis that the 2026-07-31 `repositionPanel` fix (anchors on
the disclosure ROOT, not `[data-sgs-mega-trigger]`) only applies to MEGA-panel
dropdowns, not to PLAIN dropdown submenus — mirroring the confirmed
mega-trigger-only pattern found for M5 (chevron flip animation).

## Verdict: hypothesis REFUTED. M3 is genuinely already fixed, for BOTH mega and plain dropdowns, confirmed live on the actual production homepage header (not just a test page).

---

## 1. Code trace — `repositionPanel` is NOT gated on mega-vs-plain at all

`plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js::repositionPanel`
branches on `root.dataset.sgsNavDisclosure === 'dropdown'` (line 363) — a single
function, called from all five open paths (`open`, `toggle`, `enterBridge`'s
scheduled intent-open, `triggerKeydown`'s Enter/Space and ArrowDown branches),
for every disclosure regardless of mega/plain. There is no `[data-sgs-mega-trigger]`
selector anywhere inside `repositionPanel` — the function's own doc comment
(line 270) states this explicitly: *"TWO KINDS, ONE FUNCTION... The kind is read
from the disclosure root's `data-sgs-nav-disclosure` attribute rather than passed
in as an argument... reading it from the DOM makes the five call sites
byte-identical... and removes the divergence risk entirely."*

Crucially, the M5 pattern (mega-trigger-only) does NOT repeat here, because unlike
the flip-rotation CSS selector M5 found (`.sgs-nav-menu__mega-trigger[aria-expanded="true"]`
— genuinely scoped to one class), the JS anchor logic keys off the **disclosure
root**, which both mega and plain dropdown markup share identically:

`plugins/sgs-blocks/includes/nav-menu-markup.php` line 268 (plain dropdown,
has-URL branch — the common case):
```php
'<div class="sgs-nav-menu__submenu-root" data-sgs-nav-disclosure="dropdown" data-sgs-nav-submenu-align="%2$s" data-wp-interactive="sgs/mega" %3$s ...>'
```
line 129 (mega branch):
```php
'<div class="sgs-nav-menu__mega" data-wp-interactive="sgs/mega" %2$s ...>'
```
Both carry `data-wp-interactive="sgs/mega"` (the selector `rootFor()` uses,
`.closest('[data-wp-interactive="sgs/mega"]')`), and the plain-dropdown root
additionally carries `data-sgs-nav-disclosure="dropdown"`, which is exactly what
`repositionPanel` branches on. The anchor line (`const anchor = root.getBoundingClientRect();`)
reads the WHOLE root — link + toggle together — for the dropdown branch. There is
no code path where a plain dropdown's panel is anchored on `toggle`/`[data-sgs-mega-trigger]`
specifically.

## 2. Deployed JS matches source

Confirmed the production bundle isn't stale: `wp-content/plugins/sgs-blocks/build/blocks/nav-menu/view.js`
on the canary contains exactly one occurrence each of `sgsNavDisclosure` and
`dropdown` (grep count), consistent with the single-function, single-branch shape
in source — not an old pre-2026-07-31 build with a second/duplicate anchor path.

## 3. Live measurement on the ACTUAL production homepage header (not a test page)

Tested `https://sandybrown-nightingale-600381.hostingersite.com/` (homepage,
real header nav, "Our Story" item — a plain dropdown, has-URL branch, 2 sub-links:
Ingredients / Our Promise) at 1440px viewport:

| Element | `getBoundingClientRect().left` |
|---|---|
| `.sgs-nav-menu__link` ("Our Story" text) | 484.5625 |
| `.sgs-nav-menu__submenu-root` (the item, wraps both) | 484.5625 |
| `.sgs-nav-menu__subtoggle` (the chevron button) | 580.984375 |
| `.sgs-nav-menu__submenu-wrap` (the opened panel) | **484.5625** |

Panel's left edge exactly matches the item/link's left edge (`0.00px` difference)
and sits **96.4px left of the chevron's own edge**. `--sgs-mm-overflow-left` computed
to `0.00px` (align="start", so `desired = anchor.left` with no viewport-edge
clamping needed here) — i.e. the panel is genuinely anchored to the item, not to
the chevron, exactly as `repositionPanel`'s dropdown branch specifies.

`root.dataset.sgsNavSubmenuAlign === 'start'`, the default — confirming this is
the ordinary, most common case (not some edge-case alignment mode).

## 4. Ruled out: a CSS-only positioning flash before JS repositions

Checked whether the panel might render briefly at a chevron-anchored default
position before the JS `requestAnimationFrame` write lands (a "measurement vs eye"
possibility — a real but sub-measurement visual glitch). `nav-menu-submenu-css.php`
line 238: `.sgs-nav-menu__submenu-wrap{position:absolute;...;left:var(--sgs-mm-overflow-left, 0);...}`
— the CSS **fallback value is `0`**, and the panel's `position:absolute` containing
block is the submenu-root itself (the item, not the chevron). So even in the single
frame before JS writes the real `--sgs-mm-overflow-left` value, the fallback also
resolves flush with the item's left edge, not the chevron's. There is no
transition/animation/transform-origin on `.sgs-nav-menu__submenu-wrap` at all
(grep for `transition|animation|transform-origin` in `nav-menu-submenu-css.php`
returns zero hits on the panel) — display toggles instantly via a plain CSS
sibling-combinator visibility rule (`[data-sgs-mega-trigger][aria-expanded="true"] ~ .sgs-nav-menu__submenu-wrap{display:block;}`),
so there's no growth/fade animation that could visually appear to originate from
the chevron either.

## 5. Ruled out: a duplicate/legacy render path

`grep -rl sgs_nav_menu_render_items` across `plugins/sgs-blocks` returns exactly
two files: the function's own definition (`nav-menu-markup.php`) and its single
call site (`src/blocks/nav-menu/render.php`). There is no second/legacy nav-markup
generator that the homepage header could be using instead of the one just traced.

## What this leaves unexplained

Bean's report stands as a genuine, disputed observation (per `measurement-vs-eye.md`
this re-investigation does not get to just declare him wrong), but every mechanism
this session could find — the anchor logic, the CSS fallback, the deployed bundle,
the render call graph — converges on "already fixed, for both mega and plain,
confirmed on the live homepage header itself." Plausible explanations Wave 2/Bean
should check, none of which this session could test from here:

1. **Stale browser cache on Bean's own device** — the fix shipped 2026-07-31; if
   Bean's browser served a cached `view.js` from before that date (or before this
   session's most recent deploy) when he tested, he'd see the pre-fix behaviour
   even though the server has the fixed file. Worth a hard-refresh / private-window
   re-test.
2. **A different item/page than "Our Story"** — this session tested one plain
   dropdown with `align="start"` and no viewport-edge clamping in effect. An item
   nearer the right edge (clamped) or with `align="center"`/`"end"` explicitly set
   was not tested here (none exist on the current homepage menu) — Wave 2 should
   ask Bean which specific item/page he saw this on, per the original M3 finding's
   same recommendation.
3. **A visual impression from the chevron's own oversized hit target** — M6
   (confirmed, quantified separately) means the 44×44px `.sgs-nav-menu__subtoggle`
   button is considerably larger than the item's text and sits immediately right
   of it; a wide dropdown panel opening flush under a narrow link, beside an
   oversized adjacent button, could plausibly *read* as "centred on the button
   cluster" even though the measured anchor point is the link. This is a
   perception-of-M6 hypothesis, not a positioning bug — flagged for Bean to confirm
   or rule out, not asserted as the answer.

## Files cited
- `plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js::repositionPanel`
- `plugins/sgs-blocks/includes/nav-menu-markup.php` (lines ~129, ~235-268)
- `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` (lines ~238, ~306)
- `plugins/sgs-blocks/src/blocks/nav-menu/render.php`
