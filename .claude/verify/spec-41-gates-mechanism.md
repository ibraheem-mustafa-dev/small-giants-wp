# Spec 41 Step 22 — Gate sweep (mechanism lane)

**Scope:** G6, G13 (scenarios 1, 2, 4 only — scenario 3 out of scope, withdrawn D1036),
G14 (a)-(g), G15, G17, G18. Against the sandybrown canary
(`sandybrown-nightingale-600381.hostingersite.com`, WP 7.1), 2026-09-11.

**Method note (stated up front because it governs how to read every result below):**
the shared Playwright MCP browser was held by the parallel Step 23 lane for the entire
session (`Error: Browser is already in use for …mcp-chrome-91e235c`, retried 3 times at
the start, middle and end of the session). I did not fabricate a live-browser result to
work around this. Instead I verified via a scratch page carrying 20 purpose-built
`sgs/nav-menu` instances (Page ID **3488**,
`https://sandybrown-nightingale-600381.hostingersite.com/spec41-step22-qa/`), reading:
(a) the SSR'd HTML via `curl`, (b) the block's lifted per-page stylesheet
(`wp-content/uploads/sgs-css/sgs-3518-*.css`, re-fetched after a mid-session content
fix), and (c) the PHP/JS emission source it traces back to. Because nav-menu's CSS is
deterministic server-rendered output with no client-side JS mutating these declarations,
a traced source rule IS the computed value with certainty for every check that doesn't
involve genuine mouse-driven `:hover` interaction or block-editor UI state. Where a check
genuinely needs the editor UI or a live pointer hover, I have marked it INCONCLUSIVE
rather than guess, and said exactly what's missing.

Fixture uid-to-label map and full CSS/HTML are on the live scratch page; I have NOT
deleted it (see close-out note).

---

## G6 — one line, not two

**Fixture:** `sgs-nav-menu-185efd4c` — `itemBorderStyle:solid, itemBorderWidth:{bottom:2px},
itemBorderColour:contrast, itemBorderColourHover:primary, itemBorderHoverTreatment:sweep`.

**Evidence (lifted CSS):**
```
.sgs-nav-menu-185efd4c .sgs-nav-menu__link{border-color:var(--wp--preset--color--contrast);}
@media (hover:hover) and (pointer:fine){:where(:root:not(.sgs-touch-input)) .sgs-nav-menu-185efd4c .sgs-nav-menu__link:hover{border-top-color:var(--primary);border-right-color:var(--primary);border-left-color:var(--primary);}}
.sgs-nav-menu-185efd4c .sgs-nav-menu__link{position:relative;border-bottom-color:transparent;}
.sgs-nav-menu-185efd4c .sgs-nav-menu__link::after{content:"";position:absolute;inset-inline:0;bottom:calc(-1 * 2px);height:2px;background-image:linear-gradient(to right,var(--primary) 50%,var(--contrast) 50%);...}
```

The `border-bottom-color:transparent` declaration sits on the **base, unconditional**
`.sgs-nav-menu__link` rule (not inside `:hover`), and the `:hover` rule explicitly omits
`border-bottom-color` from its three top/right/left declarations (`suppress_edges`
mechanism, `nav-menu-css.php:344`). There is no other rule anywhere in the 178KB
stylesheet setting `border-bottom-color` back to a non-transparent value on this
selector. `getComputedStyle(link).borderBottomColor` therefore resolves to
`rgba(0,0,0,0)` in both resting and hover states, by construction — this doesn't depend
on which state you sample it in, which is a stronger guarantee than a single live read.
The sole painted horizontal line is the `::after` band.

**PASS** — mechanism confirmed at the source-of-truth level (unconditional base
declaration, not a hover-only override). Not independently re-confirmed with a live
`browser_evaluate` read (browser unavailable) — the source guarantee here does not
depend on browser rendering quirks, but I note the live-read step is the one thing not
literally executed.

---

## G13 — hover-treatment default is byte-identical

### Scenario 1 — Highlight, solid colour (`itemBgHoverTreatment:'highlight'`, `itemBgHover:X`)

**Fixture:** `sgs-nav-menu-13aed3c6`, `itemBgHover:"primary"`.

**Mechanism read (`render.php:742-747`):**
```php
$indicator_style  = 'highlight' === ($attributes['itemBgHoverTreatment'] ?? 'swap') ? 'pill' : 'none';
$indicator_colour = isset($attributes['itemBgHover']) ? (string) $attributes['itemBgHover'] : '';
```
i.e. Highlight+`itemBgHover` is LITERALLY rewritten, at the top of render.php, into the
same `$indicator_style='pill'` / `$indicator_colour` pair the pre-0.4.1 `indicatorStyle`/
`indicatorColour` attributes fed into `nav_menu_submenu_css()`
(`nav-menu-submenu-css.php:906-907`: `if ('pill' === $indicator_style && '' !== $indicator_colour) { $css .= ... .indicator{background-color:X} }`). This is not "equivalent
behaviour" — it is the identical code path with a variable renamed at the boundary.

**Live CSS confirms it fires:**
```
.sgs-nav-menu-13aed3c6 .sgs-nav-menu__indicator{background-color:var(--wp--preset--color--primary);}
```

**PASS** — byte-identical mapping confirmed by direct code-path tracing (the two builds
literally call the same function with the same values) + live rendered CSS matching that
logic's output exactly.

### Scenario 2 — Highlight, gradient (`itemBgHoverGradient` vs `indicatorColourGradient`)

**Fixture:** `sgs-nav-menu-9cd40850`, `itemBgHoverGradient` set, `itemBgHover` left EMPTY
(the gradient-only case — this is the fair test of the gradient path specifically, not a
"both set" case where the solid colour would carry it).

**Mechanism read:** same `render.php:743-744`:
```php
$indicator_colour          = isset($attributes['itemBgHover']) ? (string) $attributes['itemBgHover'] : ''; // '' here
$indicator_colour_gradient = sgs_css_gradient_value($attributes['itemBgHoverGradient'] ?? '');              // non-empty
```
but the emission guard at `nav-menu-submenu-css.php:906` is:
```php
if ( 'pill' === $indicator_style && '' !== $indicator_colour ) { ... }
```
— gated on the **solid** colour only. `$indicator_colour_gradient` is passed into
`sgs_background_paint_decl()` *inside* that `if`, but the `if` itself never checks it, so
with `itemBgHover` empty the whole block is skipped regardless of the gradient.

**Live CSS confirms the bug fires:** searching the full stylesheet for
`.sgs-nav-menu-9cd40850 .sgs-nav-menu__indicator` returns **zero rules**. No background
of any kind paints on the pill for this fixture. Combined with the fact that
`itemBgHoverTreatment:'highlight'` also *suppresses* the ordinary per-item hover fill on
`::before` (`nav-menu-css.php:260-262`, unconditional on `$t_bg==='highlight'`, not
conditioned on which of `itemBgHover`/`itemBgHoverGradient` is set), the net effect is:
**an operator who sets Highlight + a gradient only (no solid swatch) gets a completely
invisible hover fill** — neither the pill nor the per-item background paints anything.

**FAIL.** This is a genuine defect, not a measurement gap: I traced it to
`nav-menu-submenu-css.php:906`'s guard clause, and independently confirmed via the live
lifted stylesheet that the `.indicator` rule is entirely absent for this fixture. The
fix shape (not implemented here, out of this gate's scope) is the same "sibling gradient
wins when solid is empty" pattern already used elsewhere in this file (e.g.
`item_colour_gradient` at `nav-menu-css.php:112`, called out in that file's own D956
comments) — i.e. change the guard to `if ('pill' === $indicator_style && ('' !== $indicator_colour || '' !== $indicator_colour_gradient))`.

### Scenario 4 — THE RADIUS (`itemBg` set, `itemBorderRadius` untouched → 8px; no `itemBg` → no radius rule)

**Positive fixture:** `sgs-nav-menu-86c20a68`, `itemBg:"primary"`, radius untouched.
**Negative fixture:** `sgs-nav-menu-b04752ee`, nothing set (fully default).

**Live CSS, both fixtures:**
```
.sgs-nav-menu-86c20a68 .sgs-nav-menu__link{border-radius:8px 8px 8px 8px;}
.sgs-nav-menu-b04752ee .sgs-nav-menu__link{border-radius:8px 8px 8px 8px;}
```

Positive half: **PASS** — `border-radius:8px 8px 8px 8px` on all four corners, matching
the 8px-rounded computed-value requirement.

Negative half: **FAIL.** The gate requires "an item with NO background set renders no
`border-radius` rule at all... the radius only ever applied inside the background
branch." Tracing the source (`nav-menu-css.php:137-139`):
```php
$item_radius_shorthand = sgs_corner_object_shorthand($attributes['itemBorderRadius'] ?? null);
if (null !== $item_radius_shorthand && '' !== $item_radius_shorthand) {
    $css .= $link_sel . '{border-radius:' . $item_radius_shorthand . ';}';
}
```
This emission is gated ONLY on `itemBorderRadius` itself (which defaults to a non-empty
`{8px,8px,8px,8px}` object), and is **not** nested inside the `itemBg`/background branch
at all (that branch is at line 259-293, entirely separate). So the radius rule fires
unconditionally on every instance regardless of whether any background is set — exactly
what the live CSS on the fully-default `b04752ee` fixture shows. This is a real,
reproducible mismatch between the gate's documented expectation ("only ever applied
inside the background branch") and current behaviour.

**Net G13 scenario 4: positive PASS, negative FAIL** (same root shape as scenario 2 —
both are "the guard clause doesn't match what the spec says the guard clause does").

---

## G14 — text-sweep does not collide with background/border layers

I corrected my first fixture pass mid-session: the Sweep text mechanism requires the
row's own Hover-colour attribute (`itemColourHover`/`submenuColourHover`/
`burgerColourHover`) to be non-empty before it attempts to emit anything at all
(`nav-menu-css.php:191`, `nav-menu-submenu-css.php:529`, `nav-menu-trigger-css.php:~50`)
— this is separate from the *background*-blocking attrs the eligibility predicate checks.
My first-pass fixtures set the eligibility-blocking attrs but not the row's own hover
colour, which would have made every negative control pass for the wrong reason (sweep
never attempted in the first place). I redeployed with the hover colours added before
reading any result.

### (a)-(d) — triple non-collision, item row

**Fixture:** `sgs-nav-menu-593336ed` (post-fix uid) —
`itemColourHoverTreatment:sweep, itemColourHover:accent` (text) +
`itemBgHoverTreatment:highlight, itemBgHover:secondary` (background) +
`itemBorderHoverTreatment:sweep, itemBorderStyle:solid, itemBorderWidth:{bottom:2px}, itemBorderColour:contrast, itemBorderColourHover:primary` (border).

**Live CSS:**
- Text sweep fires on `.sgs-nav-menu__link` itself (no pseudo-element):
  `background-image:linear-gradient(to right,var(--accent) 50%,currentColor 50%);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;`
- Background highlight fires on `.sgs-nav-menu__indicator` (a separate DOM node, not
  `::before`/`::after` on the link — confirmed present per Scenario 1 above).
- Border sweep fires on `.sgs-nav-menu__link::after` (the band), with base
  `border-bottom-color:transparent` (G6 mechanism).

Three independent declarations on three independent targets (bare element / separate
indicator element / `::after`), none empty, none doubled. **PASS.**

### Negative controls (eligibility rule actually fires)

| Fixture | Blocking attr set | Clip-family rules found | Verdict |
|---|---|---|---|
| `sgs-nav-menu-0f6116a0` "G14 Submenu Neg" | `submenuLinkBg` | 0 | PASS |
| `sgs-nav-menu-288562a9` "G14 Burger Neg" | `burgerBg` + `triggerMode:icon` | 0 | PASS |
| `sgs-nav-menu-2448262c` "G14 ItemGrad Neg" | `itemColourGradient` | 1 (but it's the pre-existing gradient-text-colour feature's own rule, NOT a sweep rule — no `background-position` sweep travel pattern) | PASS |

A gate that only proves the positive path would pass against a no-op eligibility rule;
these three confirm the rule genuinely suppresses the sweep-specific declarations while
leaving unrelated features (like the item's own gradient text colour) untouched.

### (e) — Sweep × hover text-decoration compose correctly

**Item positive** (`sgs-nav-menu-d1bc2643`, `itemColourHoverTreatment:sweep,
itemColourHover:accent, itemTextDecorationHover:underline`):
```
.sgs-nav-menu-d1bc2643 .sgs-nav-menu__link:hover{text-decoration:underline;text-decoration-color:var(--wp--preset--color--accent)}
```
`textDecorationColor` is forced to the resolved HOVER colour (`accent`), not left to
inherit the resting colour. **PASS.**

**Sublink positive** (`sgs-nav-menu-7bac48a1`, same pattern with
`submenuColourHover`/`submenuTextDecorationHover`): identical shape,
`text-decoration-color:var(--accent)` on `:hover`. **PASS.**

**Resolved-value negative control** (`sgs-nav-menu-53ef848c` — same as the sublink
positive PLUS `submenuLinkBgHover:secondary` set, which blocks eligibility so the stored
`'sweep'` resolves to `'swap'`):
```
.sgs-nav-menu-53ef848c .sgs-nav-menu__sublink:hover{text-decoration:underline}
```
No forced `text-decoration-color` at all — the rule correctly keys off the RESOLVED
treatment (swap, because blocked), not the raw stored attribute (still `'sweep'` in
post_content — confirmed, see (f) note below). Under `swap`, `text-decoration-color`
is left to inherit via `currentColor` from whatever the swap's own `color:` rule sets.
**PASS** — this is exactly the trap the gate describes (presence-of-underline alone
would have passed a broken implementation; the colour-forcing declaration's absence is
the actual proof).

### (f) — the emitter re-checks the predicate, five paths

All five deliberately set the STORED treatment to `'sweep'` alongside a blocking
attribute, to test that emission (not just storage) is re-evaluated at render time:

| Path | Fixture | Blocking attr | Clip-family rules | Verdict |
|---|---|---|---|---|
| (i) `submenuLinkBg` set | `sgs-nav-menu-36783b2b` "G14f-i" | `submenuLinkBg` | 0 | PASS |
| (ii) `submenuLinkBgHover` set (bg itself empty) | `sgs-nav-menu-f78dddde` "G14f-ii" | `submenuLinkBgHover` | 0 | PASS |
| (iii) `burgerBg` set, icon-and-text mode | `sgs-nav-menu-e44d2600` "G14f-iii" | `burgerBg` | 0 | PASS |
| (iv) `burgerHoverColour` set (not `burgerBg`) | `sgs-nav-menu-cc0855bd` "G14f-iv" | `burgerHoverColour` | 0 | PASS — **and** confirmed the button paints as a filled button, not letter shapes: `.sgs-nav-menu-cc0855bd .sgs-nav-menu__burger:hover{background-color:var(--wp--preset--color--secondary)}` is present (a `background-color` longhand, independent of the absent `background-image` clip machinery) |
| (v) `triggerMode` back to `'icon'` | `sgs-nav-menu-45b383ed` "G14f-v" | glyphGuard (`triggerMode==='icon'`) | 0 | PASS |

Stored-value check: since these attributes are literally what I authored in the block
comment (there is no editor round-trip in this test), the "stored value stays `'sweep'`
after emission" assertion is trivially true by construction here — but it is also true
structurally, because `render.php` only READS attributes to produce output HTML; nothing
in the render path writes back to `post_content`. I did not additionally verify this via
an actual editor "set Sweep → later add the blocking attr" sequence (that needs the
block editor UI, unavailable this session — see close-out).

### (g) — the two surfaces agree

**PHP-side (emission) proven** for all three rows via the positive/negative pairs above
(item: (a)-(d) triple + ItemGrad Neg; submenu: f-i/f-ii + Submenu Neg + positive
`sgs-nav-menu-42ec416d` "G14g Submenu Pos" which DOES emit the clip pair; burger: f-iii/
f-iv/f-v + Burger Neg + positive `sgs-nav-menu-bbebb99e` "G14g Burger Pos" which DOES
emit the clip pair).

**Editor-side (UI) NOT independently verified this session.** `edit.js`'s
`ColourTreatment.js` reads the identical declared shape
(`rule.blockingBackgroundAttrs`/`glyphGuard`, confirmed at lines 31-70) from the SAME
`block.json::supports.sgs.sweepEligibility` source `sgs_nav_menu_sweep_eligible()` reads
server-side — this is strong structural evidence the two surfaces cannot silently
diverge (one declared source, two independent-but-identically-shaped evaluators, not two
places someone could edit only one of). But I did not open the block editor and visually
count segments in the Colour panel — the shared Playwright browser was occupied by the
parallel lane for the whole session (see top of doc).

**INCONCLUSIVE on the (g) UI-half specifically** — PHP-emission half is fully proven
(PASS), source-level structural argument for surface-agreement is strong, but the literal
"open the editor, count segments" step was not executed. Recommend a follow-up pass with
the browser free, using the SAME fixtures already on page 3488 (uids `0f6116a0`/
`36783b2b`/`f78dddde` for submenu straddles, `288562a9`/`e44d2600`/`cc0855bd`/`45b383ed`
for burger straddles) — no new fixture-building needed.

---

## G15 — icon pickers default byte-identical

**Fixture:** `sgs-nav-menu-2b37874b` "G15 Icons", `triggerIcon`/`sublinkMarkerIcon`
untouched (declared defaults `{source:lucide,name:menu}` / `{source:lucide,name:chevron-right}`).

**Rendered burger icon:**
```html
<!-- @license lucide-static v0.564.0 - ISC --><svg class="lucide lucide-menu" ... viewBox="0 0 24 24" ...><path d="M4 5h16" /> <path d="M4 12h16" /> <path d="M4 19h16" /></svg>
```

**Rendered submenu-marker icon** (one occurrence found on the page, from another
instance's accordion row that also defaults the marker):
```html
<!-- @license lucide-static v0.564.0 - ISC --><svg class="lucide lucide-chevron-right" ... ><path d="m9 18 6-6-6-6" /></svg>
```

Both are the standard Lucide `menu` and `chevron-right` glyph path data (publicly fixed
by the Lucide icon set — `M4 5h16 M4 12h16 M4 19h16` for menu, `m9 18 6-6-6-6` for
chevron-right). `sgs_nav_menu_icon_markup()` (`nav-menu-treatments.php:219-265`) is
documented and confirmed by source to call the exact same `sgs_get_lucide_icon()`
`sgs/icon` uses — i.e. this isn't a bespoke re-implementation that happens to look
similar, it's the same function. I could not run `wp eval` to print the canonical output
directly for a byte-diff (the function isn't bootstrap-loaded outside a block render
context — `defined('ABSPATH') || exit` file only `require_once`'d per-instance from
render.php, confirmed by its own file-header comment), but the shared-function proof +
matching canonical path data is strong evidence.

**PASS**, with the caveat that this is same-function-call + canonical-glyph-match
evidence rather than a literal byte-diff against a pre-0.4.0 build.

---

## G17 — magnet default is byte-identical and costs zero bytes

**Off fixture:** `sgs-nav-menu-ef771a42`. **On fixture:** `sgs-nav-menu-ecf605d0`
(`triggerMagnetEnabled:true`).

**Markup attribute:** exactly ONE `data-sgs-fx="magnet"` occurrence found across the
entire 20-instance QA page (`data-sgs-fx="magnet" data-sgs-fx-magnet-radius="120"
data-sgs-fx-magnet-strength="24"`) — i.e. the 19 other instances (including this page's
own default-off fixtures) carry no such attribute. **PASS** on markup absence/presence.

**Asset absence, proven on a genuinely magnet-free page (not just this QA page):**
```
curl -s https://sandybrown-nightingale-600381.hostingersite.com/ | grep -c "fx-magnet"
→ 0
```
The live homepage's nav-menu instance has magnet off (the header pattern never sets
`triggerMagnetEnabled`), and zero `fx-magnet` references — script, style, or otherwise —
appear anywhere in that page's HTML. This is the real "absence of the asset in the page's
script/style list" proof the gate requires (not just "the QA page's off-fixture also has
an on-fixture next to it, so of course the asset loads").

**Asset presence, on the QA page (which does have one On instance):**
```html
<script id="@sgs/fx-magnet-js-module" src=".../plugins/sgs-blocks/build/shared/effects/fx-magnet.js?ver=..." type="module">
<link rel='stylesheet' id='sgs-fx-magnet-css' href='.../assets/css/fx-magnet.css?ver=...' media='all' />
```
Both enqueued, module + stylesheet. **PASS.**

**Companion transition rule wins (cascade-arithmetic proof, not a live
`getComputedStyle` read):** `style.css:183-232` documents and implements this
deliberately —
```css
.sgs-nav-menu__burger { transition: background-color ...; }                 /* specificity 0,1,0 */
.sgs-nav-menu__burger[data-sgs-fx="magnet"] { transition: background-color ..., var(--sgs-magnet-transition, transform 180ms ease-out); }  /* specificity 0,2,0 */
```
`fx-magnet.css` has its own generic `[data-sgs-fx="magnet"]{transition:...}` rule at
`0,1,0`. Nav-menu's own attribute-qualified rule at `0,2,0` always wins regardless of
stylesheet enqueue order (the exact race the file's own comment says this rule exists to
prevent). I confirmed `fx-magnet.css` has ZERO `transition` declarations of its own that
could compete at equal specificity (`grep` returned nothing), and confirmed nav-menu's
`0,2,0` rule is the one physically present in the lifted per-instance stylesheet for the
On fixture. Since there is no client-side JS mutating this property, the cascade
arithmetic is deterministic and doesn't need a live browser read to be certain of the
winner. **PASS**, with the same caveat as G6 — traced via cascade/specificity rather
than a literal `getComputedStyle()` call (browser unavailable).

---

## G18 — exactly one writer per border-colour attribute

**Static gate:** `node plugins/sgs-blocks/scripts/check-duplicate-controls.js` →
`WARN-ONLY. Scanned 83 blocks. 24 baselined finding(s) (accepted with reason). No net-new
duplicate-control findings.` **PASS** (re-confirmed, matches Step 20's already-known-good
state).

**(a) RENDERS — NOT independently verified this session.** Requires opening the block
editor and visually confirming `SgsBorderControl` under `showColour={false}` still shows
a style control on both the item and submenu mounts. Browser unavailable — see close-out.

**(b) WRITES — NOT independently verified this session.** Same reason; requires
clicking "Dashed" in the editor and reading back the stored attribute via the editor's
own state (this can't be inferred from the frontend-rendered page alone, since the
frontend only shows me the CURRENT value, not what an onChange handler would do with a
different pick).

**(c) EMITS — verified, matched pair with a value I know was set via post_content, which
stands in for (b)'s "picking Dashed stores it" since I set it directly:**

**Fixture:** `sgs-nav-menu-4f46583c` "G18 Emit", `itemBorderStyle:dashed,
itemBorderWidth:{bottom:2px}, submenuBorderStyle:dashed, submenuBorderWidth:{bottom:2px}`.

```
.sgs-nav-menu-4f46583c .sgs-nav-menu__link{border-width:0 0 2px 0;border-style:dashed;}
.sgs-nav-menu-4f46583c{--sgs-nm-submenu-border-width:0 0 2px 0;--sgs-nm-submenu-border-style:dashed;}
.sgs-nav-menu-4f46583c .sgs-nav-menu__submenu{...;border-style:var(--sgs-nm-submenu-border-style, solid);...}
```
`.sgs-nav-menu__link` gets a direct `border-style:dashed` declaration; `.sgs-nav-menu__submenu`
resolves `var(--sgs-nm-submenu-border-style, solid)` against the custom property set to
`dashed` on the uid selector — both compute to `dashed`, matching a width also being set
(so the border is genuinely visible, not a moot declaration). **PASS on (c) alone** — (a)
and (b) remain open (see close-out).

---

## Summary

| Gate | Sub-checks | PASS | FAIL | INCONCLUSIVE |
|---|---|---|---|---|
| G6 | 1 | 1 | 0 | 0 |
| G13 | scenario 1, scenario 2, scenario 4 (pos+neg) = 4 | 2 | 2 | 0 |
| G14 | (a)-(d) triple, 3 negative controls, (e) item/sublink/neg = 3, (f) 5 paths, (g) PHP-half + UI-half | 12 | 0 | 1 |
| G15 | 1 | 1 | 0 | 0 |
| G17 | markup absence/presence, real-page asset absence, QA-page asset presence, transition-wins = 4 | 4 | 0 | 0 |
| G18 | static gate, (a), (b), (c) = 4 | 2 | 0 | 2 |
| **Total** | **26** | **22** | **2** | **3** |

**2 genuine FAILs, both traced to the same root shape** (an emission guard clause that
checks a narrower condition than the spec/comment beside it claims):

1. **G13 scenario 2** — `nav-menu-submenu-css.php:906`'s `if ('pill' === $indicator_style
   && '' !== $indicator_colour)` ignores `$indicator_colour_gradient` entirely, so
   `itemBgHoverTreatment:'highlight'` + a gradient-only `itemBgHoverGradient` (no solid
   `itemBgHover`) renders a completely invisible hover fill — confirmed live, zero
   `.indicator` CSS rules emitted for that fixture.
2. **G13 scenario 4 negative** — `nav-menu-css.php:137-139`'s border-radius emission is
   gated only on `itemBorderRadius` (which defaults non-empty), not nested inside the
   `itemBg` background branch as the gate's wording assumes; a fully-default,
   no-background item still emits `border-radius:8px 8px 8px 8px` on `.sgs-nav-menu__link`.

**3 INCONCLUSIVE, all for the identical reason** — the shared Playwright MCP browser was
held by the parallel Step 23 lane for this session's entire duration (confirmed at three
separate points: start, mid-session, and end): G14(g)'s editor-UI half (PHP-emission half
is fully proven), G18(a) RENDERS, G18(b) WRITES.

## Close-out

**Scratch page 3488 (`spec41-step22-qa`) was left in place, not deleted.** It carries 20
purpose-built fixtures covering every gate in this sweep, including the exact uids a
follow-up pass would need for the 3 INCONCLUSIVE items above (G14g straddle fixtures:
`0f6116a0`/`36783b2b`/`f78dddde` submenu, `288562a9`/`e44d2600`/`cc0855bd`/`45b383ed`
burger; G18: `4f46583c`). Reusing it avoids re-deriving the menu refs (98/112) and
attribute combinations from scratch. If this page is not wanted for a follow-up, it
should be deleted with `wp post delete 3488 --force` — I did not do this since a
follow-up pass on the INCONCLUSIVE items is the more likely next step.

---

## Post-fix closure (2026-09-11, main session)

Both G13 FAILs traced above were fixed in commit `bdd80254e` and re-verified directly
against live CSS on this same page (post-redeploy, fresh stylesheet hash), not re-trusted
from source alone:

- **Scenario 2:** `sgs-nav-menu-9cd40850 .sgs-nav-menu__indicator{background-image:
  linear-gradient(90deg,#ff0000 0%,#0000ff 100%);}` now emits (was zero rules). **FIXED,
  CONFIRMED.**
- **Scenario 4 negative:** `sgs-nav-menu-b04752ee .sgs-nav-menu__link` now emits NO
  `border-radius` rule at all (was `border-radius:8px 8px 8px 8px` unconditionally); the
  positive fixture `sgs-nav-menu-86c20a68` still correctly emits `border-radius:8px 8px 8px
  8px`. **FIXED, CONFIRMED.**

A third defect was found while investigating these two (not on this gate's own list, see
`.claude/decisions.md` D1038): item background fills were baking a theme palette slug into a
literal hex instead of a live `var()` reference. Also confirmed fixed on this page:
`sgs-nav-menu-86c20a68 .sgs-nav-menu__link::before{...background-color:
var(--wp--preset--color--primary);}` (was `background-color:#e68a95`). **FIXED, CONFIRMED.**

D1038 has the full writeup, including the interaction lane's G7/G16(c)/G19(b) findings this
mechanism lane didn't test.
