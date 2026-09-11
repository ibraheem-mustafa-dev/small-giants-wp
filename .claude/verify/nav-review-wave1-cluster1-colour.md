
# Wave 1, Cluster 1 (colour/background/separator defaults) — diagnostic findings

**Scope:** Groups A, B, C, D1, D2, I only, per dispatch brief. Diagnostic-only — no fixes
proposed or written.

**Method note (important, affects confidence on some items):** The shared scratch pages
(3487/3488/3494) proved unreliable mid-investigation — page content and rendered nav-menu
uids changed between successive loads of the SAME URL within the same few minutes (fixture
counts went from 25 nav-menu instances down to 4, then back up), and one interaction
triggered an unexplained client-side navigation to a `?sgs_preview_drawer=...` URL. This is
consistent with the register's own framing that other agents are working the same shared
canary in parallel on different groups concurrently, and possibly a live LiteSpeed cache
inconsistency layered on top. To get a stable, reproducible ground truth I built a NEW,
isolated fixture page — `https://sandybrown-nightingale-600381.hostingersite.com/colour-wave1-cluster1-fixtures/`
(page ID **3497**), reusing the SAME `ref` menu IDs (98 = flat menu, 112 = menu with a
submenu) the existing QC fixtures already use — and did all colour/background/separator
verification against that page's own CSS emission and live computed styles instead. Where a
finding rests on the ORIGINAL page-3488 fixture (uid `sgs-nav-menu-86c20a68`, confirmed live
to be "G13 scenario 4 radius positive (bg set)"), that is noted explicitly.

---

## A1 — Hover: illegible text/bg pairing under Highlight treatment

**CONFIRMED root cause, via live CSS on both the cited fixture and a fresh repro.**

The cited fixture (uid `sgs-nav-menu-86c20a68`, attrs `{"itemBg":"primary"}` only — no hover
attrs at all) shows **zero** hover CSS for item text or background: no `:hover` rule and no
`:focus-visible` rule exists anywhere in its emitted stylesheet for `.sgs-nav-menu__link` or
its `::before`. Traced to `nav-menu-css.php::sgs_nav_menu_item_state_css` — with
`itemColourHover` and `itemBgHover` both unset, `$item_bg_hover_hex` resolves to `''`, so
`$smart_fg('', $item_colour_hover)` returns the input unchanged (still `''`), and no hover
rule is ever emitted (line ~255: `elseif ( 'none' !== $t_text && '' !== $item_colour_hover )`
never fires). So on this EXACT fixture, hovering produces **no visible change of any kind** —
not "text switches to dark primary while bg stays pink", but literally nothing happens. This
is a narrower symptom than Bean described, but it is the same underlying complaint (illegible
/ non-existent hover feedback) and is fully explained by code.

I then reproduced the specific "Highlight" scenario Bean is more likely describing — the
sibling fixture on the same page, "G13 scenario 1 highlight solid"
(`itemBgHoverTreatment:"highlight", itemBgHover:"primary"`), rebuilt on my own fixture page
(uid `sgs-nav-menu-1971bca6`). Live CSS shows:

```
.sgs-nav-menu__link:hover { color: rgb(0, 0, 0); }
.sgs-nav-menu__link:focus-visible { color: rgb(0, 0, 0); }
.sgs-nav-menu__indicator { background-color: var(--wp--preset--color--primary); }
```

There is **no** `.sgs-nav-menu__link::before` hover-background rule at all under Highlight —
confirmed in code at `nav-menu-css.php` lines 295–300:

```php
$item_bg_hover_decl = ( 'highlight' === $t_bg || 'none' === $t_bg ) ? '' : sgs_background_paint_decl(...);
```

Under `'highlight'`, the per-item hover fill is **unconditionally suppressed**. The ONLY
background-change mechanism under Highlight is the separate `.sgs-nav-menu__indicator`
element (the "shared sliding pill", FR-41-25), which is styled with a **static, unconditional**
`background-color: var(--wp--preset--color--primary)` rule — not obviously reading
`itemBgHover`'s resolved value dynamically per my test (it happened to equal `primary` in this
fixture because I set `itemBgHover:"primary"`, so I cannot rule in or out whether the
indicator's colour is correctly wired to the operator's chosen `itemBgHover`, or coincidentally
matches; this needs the indicator's own emitter located and read, which was out of the time
budget for this pass — flagging as **unconfirmed sub-detail**, not the headline finding).

**The headline finding that IS confirmed:** when an operator sets a resting `itemBg` (e.g.
`"primary"`) AND uses Highlight with `itemBgHover` resolving to the SAME colour (a very
natural authoring choice — "make it pink, make the hover a pink pill too"), the background
literally does not change between states (same colour, same element region), and the ONLY
signal left is the text colour flip to solid black — which, against a background that never
moves, reads as a much weaker/less legible state change than a normal two-tone hover would.
This is a real, reproducible interaction between (a) Highlight's per-item-fill suppression and
(b) an operator picking equal resting/hover fill colours, with no code-side guard against that
combination. Whether the text itself is "black" or "dark primary" depends on
`itemColourHover`/`itemSmartContrast` inputs the exact live fixture Bean saw may have set
differently from my repro — I could not get an exact byte-for-byte match of his wording, but
the underlying mechanism (Highlight suppresses per-item hover fill; static resting fill can
equal the indicator's fill; no illegibility guard) is confirmed in code and reproduced live.

## A2 — Drawer item hover: no background/fill change at all

**Same root cause as A1, confirmed by shared code path.** `nav-menu-css.php`'s item
text/background/hover emission is NOT forked between bar and drawer — both forks render the
same `.sgs-nav-menu__link` class and read the exact same `$link_sel` selector
(`$uid_sel . ' .sgs-nav-menu__link'`), because (per `nav-drawer/edit.js`'s own documented
comment, cited in Spec 41 §4/FR-41-7) the drawer holds a **separate `sgs/nav-menu` block
instance**, not a CSS-only reskin. So whatever attribute values that drawer instance's OWN
copy of `itemBg`/`itemBgHover`/`itemBgHoverTreatment` holds determines whether its hover
background changes — governed by the identical suppression-under-Highlight and
unset-hover-attrs-emit-nothing logic as A1. This is not a drawer-specific bug; it is the same
shared mechanism firing on a second, independently-configured block instance. No drawer-only
code path was found that would explain a DIFFERENT (worse) behaviour specific to the drawer.

## A3 — Submenu link text invisible against its own background until hover

**CONFIRMED and fully reproduced.** Repro fixture (uid `sgs-nav-menu-27d0c485`,
`submenuLinkBg:"primary", submenuColourHoverTreatment:"sweep", submenuColourHover:"accent"`,
`submenuColour` deliberately left UNSET) live CSS:

```
.sgs-nav-menu__sublink { background-color: var(--wp--preset--color--primary); }
.sgs-nav-menu__sublink:hover, :focus-visible { color: var(--wp--preset--color--accent); }
```

— and, critically, **no resting text-colour rule for this uid at all**, because
`submenuColour` was unset. The resting text colour therefore falls through to the STATIC
default declared once in `nav-menu-submenu-css.php` (~line 452):

```php
$css .= $uid_sel . ' .sgs-nav-menu__sublink{...color:var(--wp--preset--color--primary, currentColor);}';
```

— which is a **deliberate, Bean-ruled default** (the file's own comment at that line records
the 2026-07-31 ruling: submenu text defaults to the palette's LINK token, i.e. `primary`,
"aesthetically intended", AA not enforced by design). The bug is the **collision**: this
default text colour and the operator's `submenuLinkBg` choice both resolve to the identical
palette token name whenever the operator picks `submenuLinkBg: "primary"` (a natural,
in-brand choice) — text-on-background at 1:1 contrast, invisible, exactly matching Bean's
report ("text colour is the exact same colour as its own background fill — invisible until
hovered, at which point it turns [accent]"). I confirmed no smart-contrast / WCAG-adjustment
mechanism exists for the submenu link's RESTING text row at all (the item row's `itemColour`
has no such guard either against `itemBg`, but that row at least CAN be steered by
`itemSmartContrast`; the submenu link row has no equivalent toggle for its resting state —
only Hover/Current get any contrast handling, and only when the operator sets a hover/current
colour, not automatically).

**Also confirmed as CORRECT, not a bug, in the same fixture:** the eligibility gate DID
correctly downgrade `submenuColourHoverTreatment:"sweep"` to a plain `swap` because
`submenuLinkBg` is a declared `blockingBackgroundAttrs` member for that row (Spec 41 line
2407–2408) — the emitted hover rule is a plain `color:` swap, not a `background-clip:text`
sweep, so there is no double-defect of a clipped-to-glyph-shapes background here. That part of
the mechanism works exactly as designed.

## B1 — Burger colours "worse, not better" (G14 "Burger Neg" fixture)

**Root cause found, but it is a TEST-FIXTURE data bug, not a regression in the burger colour
mechanism itself.** The "G14 negative burgerBg blocks sweep" fixture and its sibling
"G14 Triple" fixture both set colour attributes to the literal slug `"secondary"`
(`burgerBg:"secondary"` and `itemBgHover:"secondary"` respectively). **`secondary` is not a
colour in Mama's actual palette** — confirmed by reading `sites/mamas-munches/theme-snapshot.json`'s
full settings.color.palette slug list (29 slugs: accent, border-subtle, primary,
primary-dark, success, surface, surface-alt, surface-pink, text, text-inverse, text-muted,
accent-dark, border, cookie-brown, primary-text, success-light, accent-text, footer-bg,
surface-peach, surface-cream-warm, border-warm, cookie-brown-warm, client-surface-pink,
client-text, info, info-light, error-light, accent-light, error, whatsapp, border-light —
no `secondary`).

Live-tested this directly: I built a fixture with `burgerBg:"secondary"` (matching the QC
fixture) and it renders `background-color: rgba(0,0,0,0)` — fully transparent, exactly as
Bean describes ("no colour issue has improved"). I then built an otherwise-identical fixture
with `burgerBg:"accent"` (a real token) and it renders `background-color: rgb(245, 208, 80)`
correctly. This proves `sgs_nav_menu_trigger_css.php::sgs_nav_menu_trigger_css`'s burgerBg
wiring (`sgs_background_paint_decl( $burger_bg, $burger_bg_gradient )`) works correctly when
given a real token — the CSS custom-property reference `var(--wp--preset--color--secondary)`
simply never resolves to anything (matches the codebase's own documented pattern,
`safecss-strips-inline-functional-colours` sibling note "wp-style-engine emits an unresolved
token slug as invalid CSS verbatim; the browser drops it, the colour silently does nothing").

Since the SAME invalid `secondary` slug appears in at least two of the framework's own QC
fixtures (`burgerBg` and `itemBgHover`), any scenario built against those fixtures — including
whatever Bean was actually looking at under "Burger Neg" — would show colours failing to
apply, which reads exactly like "nothing has improved". I could not confirm or rule out a
SEPARATE, code-level regression underneath this (git history shows `nav-menu-trigger-css.php`
was born whole at commit `070fbc9a8`, "Spec 41 step 15 — the three-state CSS-emission
rewrite" — there is no earlier version of this specific file to diff against; the burger's
CSS lived somewhere else, pre-split, and I did not have budget to excavate that far back), but
the invalid-slug explanation alone fully accounts for the observed "nothing works" symptom on
the cited fixture.

## B2 — No test coverage for burgerBg + confirmed the control itself

**Confirmed gap, and confirmed the control DOES work when tested properly (see B1 above).**
Bean's observation that no test fixture anywhere exercises `burgerBg` with a VALID colour is
accurate — searching the page-3488 raw content, the only `burgerBg` reference is the
`"secondary"`-valued negative-control fixture, which (per B1) renders no visible colour at
all and so was never actually exercised as a positive case. My direct test with
`burgerBg:"accent"` confirms the mechanism is sound; this is a coverage gap in the QC fixture
set, not a code defect.

## C1 — No visible separators/dividers on any vertical mode, normal or hover

**CONFIRMED as expected/unbuilt, not a bug.** Live CSS for an untouched default fixture (uid
`sgs-nav-menu-08bfc9b7`, no attrs beyond `ref`) contains **zero** border/divider declarations
of any kind for `.sgs-nav-menu__link` or `.sgs-nav-menu__sublink` — no `border-color`,
`border-width`, or `border-style` rule appears anywhere in its emitted stylesheet. This is
fully consistent with `block.json`'s declared defaults: `itemBorderWidth: {}`,
`itemBorderColour: ""`, `itemBorderStyle: ""`, `submenuBorderColour: ""` — all empty by
default — and with `nav-menu-css.php`'s own emission logic (`sgs_border_states_css()` and the
raw width/style block both gate entirely on the attribute being non-empty; an unset border
attribute writes nothing).

This matches **Spec 41 FR-41-36's own explicit disclaimer**, read in full:

> ⚠ This is a locked design decision, not yet built. No attribute defaults, `block.json`
> values or `render.php` fallbacks have been changed to match this table — that is separate
> future implementation work.

FR-41-36 (owner-ruled 2026-09-11) specifies the exact "universal divider rule" Bean is now
asking about (every context gets an always-visible item divider, `border-light` at rest,
`accent` on hover/current) — the design decision exists and is locked, but literally no code
implements it yet. C1 is therefore not a regression or a hidden bug to trace further; it is
the accurate, expected state of a design decision that has been approved but not yet wired
into `block.json` defaults or `render.php`/`nav-menu-css.php` emission.

## D1 — Submenu items show unexplained "tinted pink" background instead of theme default

**Could NOT reproduce a literal pink BACKGROUND on an untouched submenu item.** Live CSS for
the untouched default fixture's `.sgs-nav-menu__submenu` panel confirms the background
correctly resolves through the documented fallback chain
(`var(--sgs-nm-submenu-bg, var(--wp--preset--color--surface-alt, var(--wp--preset--color--surface, #fff)))`)
with `--sgs-nm-submenu-bg` unset — live computed value on my fixture: `rgb(255, 249, 240)`, a
cream/surface tone, not pink. The individual `.sgs-nav-menu__sublink` row has **no**
`background-color` declaration at all when `submenuLinkBg` is unset — confirmed absent from
the live ruleset.

What I DID confirm, and consider the most likely explanation for what Bean is seeing: the
sublink's resting **text** colour defaults to the palette's pink LINK token
(`var(--wp--preset--color--primary, currentColor)` — see A3 above for the exact rule and its
Bean-ruled history). A 44px-min-height flex row of pink TEXT against a cream panel, especially
glanced at small size or in a screenshot thumbnail, is plausible to misread as a pink-tinted
row background rather than pink text on a neutral row. I cannot confirm this is what Bean saw
without seeing his exact screenshot/element, so I am not closing this with certainty — but I
can rule OUT an actual `background-color` on the row or panel resolving to pink under any
default (unset) configuration I could construct. The other live possibility I could not rule
out within budget: Bean's reviewed instance may not be a genuinely blank/never-configured
block — if it is an existing page whose block attributes were set during an earlier build
phase (pre-Spec-41 rebuild) and never explicitly cleared, a real `submenuLinkBg` value could
still be stored even though the instance "looks default" to a reviewer who didn't open its
inspector. I did not have access to inspect Bean's exact page/instance to check its stored
attributes directly.

## D2 — Submenu marker/chevron colour should default to the item's own text colour

**Confirmed correct BY DESIGN for the only context it applies to.** Reading
`render.php` lines 483–513 (`nav-menu/render.php`), the marker/chevron colour CSS is scoped
with a hard `.sgs-nav-drawer` ancestor prefix:

```php
$sgs_nm_marker_sel = '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__sublink-marker';
```

and the marker markup itself (`$sgs_nm_sublink_marker`) is only ever passed into
`sgs_nav_menu_render_items_drawer()` (render.php line 568) — the drawer-only accordion item
renderer. **The horizontal bar's own dropdown submenu items never render a marker/chevron
icon at all** — there is no equivalent markup path for `.submenu-root`/`.submenu-wrap`. So
"the chevron/marker icon left of each submenu item's text" as a general expectation across
both bar and drawer does not apply to the bar; it is a drawer-only feature by construction,
which matches FR-41-30(b)'s own scope.

For the drawer (the only place it exists): when `sublinkMarkerColour` is unset, `render.php`
emits NO explicit `color:` rule for the marker at all (line 499's `if ('' !== ...)` guard).
The marker therefore inherits `currentColor` up the DOM, which for a drawer sublink resolves
to `color:inherit` (per `nav-menu-submenu-css.php` line 496,
`:where(.sgs-nav-menu__bar--drawer) .sgs-nav-menu__sublink{color:inherit;}`) — i.e. it
correctly inherits the SAME colour as the item's own text by default, exactly as Spec 41's own
"RESOLVED" note for FR-41-30(b) states (line ~2593: "unset `sublinkMarkerColour` inherits
`currentColor` from that…"). This is working as designed; I found no defect here for the
default/unset case.

## I1 — Submenu panel has a mismatched white "lip" along top/bottom edges

**Not conclusively confirmed — I could not get the dropdown panel to render open live for a
pixel-level check within budget, and the CSS-level analysis does not show an obvious
mechanism for a top/bottom-only white strip.** What I confirmed from computed styles
(forcing the wrap's `display` open via inline style, though the resulting bounding rect read
back as 0×0 — likely because forcing `display` alone does not satisfy some other layout
precondition, e.g. the panel needing real content sizing from a parent flex/position context
I did not fully reconstruct):

- `.sgs-nav-menu__submenu-wrap` (outer, positioned container): **no `background-color` at
  all** — fully transparent — only `border-radius` (8px) and a `box-shadow`
  (`rgba(0,0,0,.1) 0 4px 12px 0`).
- `.sgs-nav-menu__submenu` (the `<ul>` inside it, the actual painted panel): resolves a REAL
  `background-color: rgb(255, 249, 240)` (cream), a REAL 1px SOLID border in
  `rgb(232, 213, 192)` (a visible tan/beige — `--wp--preset--color--border` is NOT transparent
  on this palette, unlike the code comment's "transparent" fallback assumption for a theme
  with no border token defined), and the SAME 8px `border-radius`, with `padding: 8px 0`.

Because `background-color` on a bordered/rounded box paints to the border-box by default (CSS
default `background-clip: border-box`), the padding area is included in the panel's own fill,
so an 8px padding value alone should not create a colour discontinuity. The one live,
confirmed fact that COULD explain a "lip": **the panel has a real, visible 1px border in a
tan colour, not transparent as the code comment assumes** — `sgs_border_states_css()` is
Normal-only for this row (FR-41-9) and the STATIC fallback border-colour
(`var(--wp--preset--color--border, transparent)`) resolves to a genuine tan on this theme
rather than the invisible fallback the code's own comment describes ("EVERY default here is a
THEME TOKEN, never a literal... the short literal after each token is a last-resort safety net
for a theme that defines no palette at all, NOT a design value" — this theme DOES define a
`border` token, so the "safety net" is live, not dormant). A visible border does not by itself
explain a WHITE strip specifically (a tan border would read as tan, not white), so this is
disclosed as a partial, unconfirmed lead rather than a closed root cause. I recommend a
follow-up pass with the panel genuinely forced open (real click-through via the drawer/mega
trigger's own interactivity-API state, not a raw style override) and a screenshot compared
pixel-by-pixel against `getComputedStyle` at the exact edge, which I could not complete this
pass without burning materially more of the shared tool budget on an unstable page.

---

## Shared-root-cause summary

- **A1 and A2 share one root cause**: `nav-menu-css.php`'s item hover-fill suppression under
  `itemBgHoverTreatment:"highlight"` (no per-item hover/current fill emitted at all), combined
  with no guard against an operator setting the resting fill and the Highlight pill to the
  same colour. This fires identically on the bar and the drawer because both forks render
  through the same shared `.sgs-nav-menu__link` selector and the same PHP emitter — the
  drawer is a second, independently-configured instance of the identical mechanism, not a
  separate code path.
- **A3 and D1 plausibly share a root cause**: both trace to the submenu link's resting text
  colour defaulting to the pink `primary`/LINK palette token (a deliberate, Bean-ruled
  default, `nav-menu-submenu-css.php` ~line 452) with no contrast/collision guard against
  whatever background the operator (A3) or the panel default (D1, if it's a text-read-as-tint
  misperception rather than a real stored value) presents alongside it. A3 is fully confirmed;
  D1's connection to the same mechanism is plausible but not proven.
- **B1 and B2 share one root cause**: the QC fixture set's use of the non-existent colour
  slug `"secondary"` on at least two nav-menu attributes (`burgerBg`, `itemBgHover`). This is
  a test-data bug in the fixtures themselves, not a defect in the burger or item colour
  mechanisms, both of which I confirmed work correctly when given a real palette token.
- **C1 is not a bug at all** — it is a locked, owner-approved design decision (FR-41-36) that
  is explicitly documented in the spec as not yet implemented in any attribute default or CSS
  emission.
- **D2 is not a bug for the context it actually applies to** (drawer-only; the bar has no
  marker/chevron mechanism to have a bug in).
- **I1 remains genuinely open** — plausible lead (a real, non-transparent 1px border token)
  but not confirmed as the specific cause of a white top/bottom strip; needs a proper
  interactive re-test with the panel actually opened via its real trigger.
