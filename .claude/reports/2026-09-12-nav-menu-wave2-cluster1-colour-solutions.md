# Nav-menu Wave 2 (Cluster 1 — colour) — solution design proposals

**Status: PROPOSAL ONLY. No product code touched.** Council discipline (qc-council Stage
5/6): each item below states the exact fix shape, answers the cross-cutting design question
against Bean's own stated bar, gives a falsifiable prediction, and names the exact
before/after verification command. Source register (confirmed root causes):
`.claude/reports/2026-09-12-nav-menu-visual-review-register.md`.

**Scope discipline (project rule 3, no carve-outs):** every fix below is a change to the
shared emitter or a shared DATA declaration (`block.json`), never a per-fixture or
per-instance patch — it applies to every `sgs/nav-menu` and `sgs/nav-drawer` instance on
every client site the moment it deploys.

---

## A1/A2 — Highlight treatment: hover fill suppressed, illegible when resting/pill fills match

**File:** `plugins/sgs-blocks/includes/nav-menu-css.php`
**Function:** `sgs_nav_menu_item_state_css()`
**Confirmed root cause (register):** lines ~295–300 —

```php
$item_bg_hover_decl = ( 'highlight' === $t_bg || 'none' === $t_bg )
    ? ''
    : sgs_background_paint_decl( $item_bg_hover_raw, $item_bg_hover_gradient );
```

Under `highlight`, the per-item hover fill is unconditionally suppressed — by design, because
the shared sliding `.sgs-nav-menu__indicator` pill is the ONE background shape for non-resting
states (FR-41-14/FR-41-25). That's correct when the pill's colour differs visibly from the
resting fill. It becomes illegible only in the specific case Bean hit: an operator sets
`itemBg` and `itemBgHover` to the SAME token (a natural authoring choice — "pink normal, pink
pill") — background never visibly moves, and the only signal left is the text-colour flip.

### Design-question answer: text-weight signal, not a colour-uniqueness guard

**Chosen: always force a visible SECOND signal (font-weight change) alongside the colour flip
under Highlight — not a runtime "never let the two colours match" guard.**

Justification against Bean's own bar (discernibility, not WCAG AA — Group A's stated rule:
"never two near-identical shades of the same hue on both text and fill simultaneously"):

1. **A colour-uniqueness guard is unfalsifiable in the general case.** "Resting fill == pill
   fill" is only ONE way to get illegible; a resting fill of `primary` (teal) and a pill of
   `primary-dark` also reads as "barely different" without being byte-identical. A guard keyed
   on exact string/hex equality would pass that case and still look broken. Chasing "how
   different is different enough" turns into a subjective contrast-distance calculation this
   framework has explicitly ruled isn't the bar here (Bean: "explicitly more lenient than WCAG
   AA" — but a NEW derived metric to enforce that leniency is more machinery than the problem
   needs).
2. **A weight change is discernible unconditionally, regardless of what colour pair an
   operator picks.** It costs nothing when the colours already differ (bold-on-different-fill
   still looks fine — most nav hover states DO bold on hover already, e.g. FR-41-6's
   Current-state weight rule already sets this precedent for the identical "make the active
   state visually heavier" problem next door in the same file). It is the SAME technique this
   file already ships for Current vs Normal (`itemFontWeightCurrent`, "NEVER-LIGHTER" rule at
   line ~259) — extending an established, already-approved pattern rather than inventing a new
   mechanism class.
3. Matches the file's own existing philosophy: shape/motion changes gate on
   attribute-presence, not on computed-colour-distance maths anywhere else in this module
   (border-radius gates on "is there a visible fill", not "is the radius visually
   perceptible"). A weight bump is the same class of binary, attribute-free signal.

**Fix shape.** In the same `if ( 'highlight' === $t_bg )` branch, when the resolved hover
declaration is suppressed, emit an additional `font-weight` bump on hover UNCONDITIONALLY
(not gated on any colour comparison) — reusing the exact `itemFontWeightCurrent` "never
lighter" numeric pattern already in this file:

```php
// Immediately after the $item_bg_hover_decl assignment (~line 300):
if ( 'highlight' === $t_bg ) {
    // Highlight suppresses the per-item hover fill in favour of the shared
    // sliding pill (FR-41-14) — a real signal, but colour-only. When the
    // resting fill and the pill happen to render the same (or near-same)
    // colour, colour is not a discernible-enough signal alone (Bean, Group A).
    // A weight bump is unconditional and costs nothing when the colours DO
    // differ — same "never lighter" precedent as itemFontWeightCurrent above.
    $highlight_hover_weight = max( 700, (int) ( $attributes['itemFontWeight'] ?? 400 ) + 200 );
    $css .= sgs_hover_state_rules( $link_sel, 'font-weight:' . $highlight_hover_weight, ':focus-visible' );
}
```

(Exact numeric floor/delta is an implementation detail for the build session — the shape is
"always emit a weight delta under Highlight," not "emit it only when colours collide.")

### Falsifiable prediction

Before: `getComputedStyle(link, ':hover').fontWeight` under a Highlight fixture with
`itemBg === itemBgHover` (both `primary`) returns the SAME value as the resting `fontWeight`
(no signal beyond the colour flip). After: hover `fontWeight` differs from resting
`fontWeight` by ≥200 (e.g. 400 → 700) on that exact fixture, and the difference is visible in
a Playwright screenshot diff of the link before/after triggering `:hover`.

### Baseline / validation command

Reuse the existing repro fixture named in Wave 1 cluster 1 (`nav-review-wave1-cluster1-colour.md`
line 41-43): fixture "G13 scenario 1 highlight solid" on the agent's rebuilt page, uid
`sgs-nav-menu-1971bca6` (`itemBgHoverTreatment:"highlight", itemBgHover:"primary"`, resting
`itemBg:"primary"`). If that scratch page no longer exists (Wave 1.5 already found scratch
pages mutate), rebuild the identical attrs on a fresh fixture page and note the new uid.

```bash
# BEFORE (capture baseline resting + hover fontWeight + fill on the Highlight fixture)
node -e "
const {chromium} = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('https://sandybrown-nightingale-600381.hostingersite.com/<fixture-page>/');
  const link = await p.\$('.sgs-nav-menu-1971bca6 .sgs-nav-menu__link');
  const before = await link.evaluate(el => getComputedStyle(el).fontWeight);
  await link.hover();
  const hover = await link.evaluate(el => getComputedStyle(el, ':hover').fontWeight);
  console.log(JSON.stringify({before, hover}));
  await b.close();
})();
"
# AFTER — same script, same fixture. PASS = hover !== before AND (hover - before) >= 200 (numeric weights).
```

---

## A3/D1 — Submenu link resting text collides with `submenuLinkBg`

**File:** `plugins/sgs-blocks/includes/nav-menu-submenu-css.php`
**Function:** `sgs_nav_menu_submenu_css()` (the resting-text default at ~line 450-452)
**Confirmed root cause (register + Wave 1 cluster 1):** the resting sublink text colour has a
STATIC hardcoded default —

```php
$css .= $uid_sel . ' .sgs-nav-menu__sublink{...color:var(--wp--preset--color--primary, currentColor);}';
```

— which fires unconditionally regardless of what `submenuLinkBg` the operator picks, with zero
collision guard. Repro fixture: uid `sgs-nav-menu-27d0c485`, `submenuLinkBg:"primary"`,
`submenuColour` left unset — text and background both resolve to `primary`, 1:1 invisible.

### Design-question answer: extend FR-41-36 — this default is already superseded by a locked decision, don't invent a new one

**Read first, per the prompt's own instruction:** FR-41-36 (`.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md`
§"FR-41-36 — Locked default colour scheme", 2026-09-11, owner-ruled) already answers this
exact question for the desktop submenu panel: **"Desktop submenu (dropdown panel) | bg=`surface-alt`
… text=`primary`"** — i.e. the LOCKED default pairs submenu resting text=`primary` against a
submenu PANEL background of `surface-alt`, never against an arbitrary operator-chosen
`submenuLinkBg`. The current code's bug is not "the wrong default colour" — `primary` is
literally the ruled default — the bug is that the collision guard FR-41-36 implicitly assumes
(text default is only ever safe against the LOCKED bg default) doesn't exist against an
OPERATOR override of `submenuLinkBg`.

So this is **neither** of the two options the prompt poses as a binary. It's a third,
narrower fix that both prompt options were reaching for pieces of:

- Not a full `itemSmartContrast`-style auto-adjustment for the submenu row (that RE-RESOLVES
  the text colour with a WCAG-preferred alternative whenever the operator sets one — bigger
  surface, its own new attribute/toggle, and this file already has that exact machinery a few
  lines up for `itemBgHover`/`itemBgCurrent`, so it CAN be reused, but building it as new scope
  for the RESTING row is more than this defect needs).
- Not "change the plain default to `currentColor`" either — that would silently violate the
  FR-41-36 lock (which explicitly names `primary` as the resting submenu text token) the moment
  ANY submenu panel has no explicit background at all (the common case, per D1's finding that
  the live drawer/header stores zero submenu-background attributes anywhere) — regressing the
  ruled default for the 99% case to fix the collision case.

**Chosen fix: gate the SAME already-built smart-contrast machinery this file's sibling
(`itemBgHover`/`itemBgCurrent`, `nav-menu-css.php` lines ~197-214) already uses, but keyed on
`submenuLinkBg` (the RESTING background) against the RESTING text token — reuse
`sgs_wcag_preferred_text_colour_for_bg()`, not a new mechanism.** When `submenuLinkBg` is set
and `submenuColour` is NOT explicitly set by the operator, resolve the resting text colour via
the shared WCAG-preferred helper against `submenuLinkBg`'s hex, falling back to the locked
`primary` default only when no background is set at all (preserving FR-41-36's ruled default
for every untouched instance).

### Fix shape

```php
// nav-menu-submenu-css.php, replacing the static default at ~line 450-452:
$sublink_bg_raw = (string) ( $attributes['submenuLinkBg'] ?? '' );
$sublink_bg_hex = '' !== $sublink_bg_raw ? sgs_resolve_palette_hex( sanitize_html_class( $sublink_bg_raw ), '' ) : '';

$sublink_resting_colour_decl = 'var(--wp--preset--color--primary, currentColor)'; // FR-41-36 locked default, untouched fallback.
if ( '' === $submenu_colour && '' !== $sublink_bg_hex ) {
    // Operator set a resting BACKGROUND but no resting TEXT colour — the FR-41-36
    // locked `primary` text default was only ever safe against the LOCKED panel
    // bg (surface-alt), not an arbitrary operator override. Reuse the SAME
    // WCAG-preferred helper the hover/current fills already use two lines up
    // (never a new contrast function — CLAUDE.md "no new contrast function").
    $sublink_resting_colour_decl = sgs_wcag_preferred_text_colour_for_bg( $sublink_bg_hex, '#1F7A7A' /* primary hex */ );
}
$css .= $uid_sel . ' .sgs-nav-menu__sublink{display:flex;align-items:center;min-height:44px;padding:0 16px;'
    . 'text-decoration:none;white-space:nowrap;'
    . 'color:' . $sublink_resting_colour_decl . ';}';
```

⚠ The drawer's own override two rules below (`:where(.sgs-nav-menu__bar--drawer)
.sgs-nav-menu__sublink{color:inherit;}`) already wins in the drawer fork via source order —
untouched by this change, since it fires AFTER this rule regardless of what this rule computed.

### Falsifiable prediction

Before: on the `sgs-nav-menu-27d0c485`-shaped fixture (`submenuLinkBg:"primary"`,
`submenuColour` unset), `getComputedStyle(sublink).color` === `getComputedStyle(sublink).backgroundColor`
(both resolve to the `primary` hex) — 1:1 contrast, confirmed invisible. After: the two values
differ, and `sgs_wcag_preferred_text_colour_for_bg()`'s own contrast maths guarantee the pair
clears AA (≥4.5:1) — a strictly stronger bar than Bean's stated minimum. A second check: an
UNTOUCHED fixture (no `submenuLinkBg` set at all) renders byte-identical before/after — the
FR-41-36 locked `primary`-on-nothing default must not move.

### Baseline / validation command

Reuse `sgs-nav-menu-27d0c485` if it still resolves; Wave 1.5 already found scratch pages
mutate, so rebuild identical attrs on a fresh fixture page if needed and record the new uid.

```bash
node -e "
const {chromium} = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('https://sandybrown-nightingale-600381.hostingersite.com/<fixture-page>/');
  const sub = await p.\$('.sgs-nav-menu-27d0c485 .sgs-nav-menu__sublink');
  const result = await sub.evaluate(el => {
    const cs = getComputedStyle(el);
    return { color: cs.color, background: cs.backgroundColor };
  });
  console.log(JSON.stringify(result));
  await b.close();
})();
"
# PASS (after) = color !== background AND contrast(color, background) >= 4.5:1.
# ALSO run against an untouched (no submenuLinkBg) fixture and confirm color is
# byte-identical before/after — proves the FR-41-36 default for the common case
# didn't move.
```

---

## E1 — Parent-hover rescue is blind to WordPress core's ambient link-hover default

**File:** `plugins/sgs-blocks/includes/nav-menu-css.php`
**Function:** `sgs_nav_menu_item_state_css()`
**Confirmed root cause (Wave 1.5 re-investigation, `nav-review-reinvestigate-e1-hover.md`):**
FR-41-13's rescue block only ever re-emits the block's OWN explicitly-configured hover
declarations (`$item_hover_decls`, built from `$item_colour_hover` /
`$item_bg_hover_decl` / `itemBorderColourHover`). When NONE of those are set, `$item_colour_hover`
is `''`, `$item_hover_decls` stays empty, and the rescue block never fires at all for that
uid — the only paint source left is WordPress core's own `theme.json`-generated
`:root :where(a:hover){color:var(--wp--preset--color--primary-dark)}`, a **zero-specificity**
rule that correctly stops matching the instant the pointer leaves the literal `<a>`, even
while still inside the open dropdown panel.

### Design-question answer: give the item a real default hover signal by construction — not a patch teaching the rescue rule about the ambient rule

**Chosen: default `itemColourHover` (when unset) to the FR-41-36-locked token, not "detect and
re-emit the ambient WP-core rule."**

Justification:

1. **Teaching the rescue rule about the ambient rule is fragile and non-portable.** The ambient
   rule's exact token (`primary-dark`) is a THEME-level default this standalone framework
   cannot assume — a different theme.json (a different client, a non-SGS install per the
   framework's own "standalone" rule) generates a DIFFERENT ambient rule or none at all. A
   rescue rule hardcoded to re-emit `var(--wp--preset--color--primary-dark)` would be correct
   for Mama's canary and silently wrong (or silently inert) everywhere else — a literal, not a
   token-driven fix, and specifically the kind of environment-coupling this framework's own
   "standalone, not client-project" rule bans.
2. **This is NOT new scope — it is executing a decision Bean already locked.** FR-41-36
   (§"Top bar", Hover column) already names the exact default this gap needs: **text=`accent`**
   on hover, for the untouched top-bar item. The spec explicitly flags this table as "a locked
   design decision, not yet built" — E1 IS the first real trigger to build it, not a reason to
   invent a parallel, narrower default.
3. **Closing the gap by construction reuses 100% of ALREADY-WORKING, ALREADY-TESTED machinery.**
   The Wave 1.5 evidence proves the rescue mechanism works CORRECTLY the moment
   `itemColourHover` is non-empty (G7BAR/G10A both persist through the pointer-gap
   transition). The rescue block's gating condition (line ~641,
   `'' !== $item_colour_hover`) needs ZERO code change — it already does exactly the right
   thing once the input is non-empty. Giving the attribute a real default value, rather than
   patching the rescue block to special-case emptiness, means the fix is a single default-value
   change with no new selector shapes, no new specificity reasoning, and no risk of drifting
   from the tested mouse+keyboard/bar+drawer 4-rule set that already exists.
4. Per CLAUDE.md's explicit instruction: *"⛔ NEVER weigh 'this would change what the canary
   currently renders' … The framework is PRE-PRODUCTION — a default changing costs nothing."*
   This applies directly: adding a real default hover colour changes untouched-instance
   rendering (previously invisible/ambient-only hover → a real `accent` hover), but that is the
   locked, owner-approved target state, not an incidental side effect to avoid.

### Fix shape

```php
// nav-menu-css.php, ~line 194, where $item_colour_hover is first read from attributes:
$item_colour_hover   = isset( $attributes['itemColourHover'] ) ? (string) $attributes['itemColourHover'] : '';
$item_colour_current = isset( $attributes['itemColourCurrent'] ) ? (string) $attributes['itemColourCurrent'] : '';

// FR-41-36 locked default (Top bar | Hover | text=accent) — an operator who never
// touches itemColourHover previously relied on WordPress core's ambient
// `:root :where(a:hover)` rule, which has ZERO specificity and does not persist
// while the pointer is inside the item's own open dropdown (FR-41-13's rescue
// rule has nothing to re-apply when this is empty). Defaulting closes the gap
// by construction: the SAME already-tested rescue mechanism that correctly
// holds for G7BAR/G10A now fires for every untouched item too.
if ( '' === $item_colour_hover && 'none' !== $t_text ) {
    $item_colour_hover = 'accent';
}
```

No other line in the function changes — the existing Hover-emission branch (line ~255-257)
and the FR-41-13 rescue block (line ~641-643) both already gate on `'' !== $item_colour_hover`
and will now fire automatically with the new default.

⚠ **Scope boundary, explicit:** this fixes the BAR fork (verified reproducible). The DRAWER
fork remains genuinely untested (Playwright cannot open the native `<dialog>` under automation
— a separate, already-flagged bug). The same default value change applies to the drawer's own
`sgs/nav-menu` instance automatically (shared code path, per A2's confirmed finding that bar
and drawer are not forked), but the fix's drawer-side effect needs a REAL manual verification
pass once the automation blocker is separately resolved — do not close the drawer half of E1 on
code-reading alone.

### Falsifiable prediction

Before: on an untouched fixture (no `itemColourHover` set — e.g. G19b, uid `58df09f4`),
stepping the pointer from the link into the open dropdown panel shows `color` REVERT from
`rgb(106,67,67)` to the base `rgb(58,46,38)` (Wave 1.5's measured values) partway through the
gap-transit. After: the settled in-panel colour equals the resolved `accent` token's hex
(compute via `sgs_colour_value('accent')` — read from the live site's own CSS custom property,
not a literal), matching the on-link hover colour throughout the transit with no revert at any
of the 12 sampled steps.

### Baseline / validation command

Reuse the exact Wave 1.5 reproduction script and fixtures (six named uids, both scratch pages)
— this is the canonical repro for this defect, don't build a new one:

```bash
# BEFORE — the Wave 1.5 script, unmodified, against the same six fixtures:
# G14 Submenu Neg (0f6116a0, page 3488/step22), G19b (58df09f4), G19c (e0535ce7),
# G19d (69563c99), G20SET (6d577126), G20UNSET (354d064c) — all on page 3487/step23.
node <wave1.5-repro-script>.js
# Expect: all 6 report REVERTS (settled in-panel colour === base rgb(58,46,38)).

# AFTER — identical script, same 6 fixtures, same URLs.
# PASS = all 6 report PERSISTS, settled in-panel colour === on-link hover colour
# (both equal to the resolved `accent` custom property's live hex), matching the
# already-passing pattern G7BAR/G10A show today.
```

---

## H1 — `itemBorderStyle` (dashed/dotted) has no effect under the Sweep hover treatment

**File:** `plugins/sgs-blocks/includes/nav-menu-css.php` (emission) +
`plugins/sgs-blocks/src/blocks/nav-menu/block.json` (eligibility DATA)
**Function:** `sgs_nav_menu_item_state_css()` (emission), consuming
`sgs_nav_menu_resolved_treatments()` / `sgs_nav_menu_sweep_eligible()` in
`plugins/sgs-blocks/includes/nav-menu-treatments.php` (the ALREADY-BUILT, ALREADY-GENERIC
eligibility gate).
**Confirmed root cause (Wave 1 cluster 6):** the Sweep band is a `linear-gradient`
`background-image` on `::after` — it can only ever render solid, never `dashed`/`dotted`.
`itemBorderStyle` is emitted completely unconditionally (lines ~350-358) with no awareness of
the resolved border-hover treatment, and `itemBorderHoverTreatment` is — per the file's own
docblock — deliberately absent from the declared `sweepEligibility` rows, because its
mechanism (a `::after` band) isn't a glyph-clip sweep and none of the three declared
eligibility conditions (`blockingBackgroundAttrs`/`blockingGradientAttrs`/`glyphGuard`) was
ever built with THIS clash in mind.

### Design-question answer: gate the combination — mutually exclusive, not a co-existing "intended" pairing

Bean asked directly whether this was intended. It is not: `itemBorderStyle`'s whole purpose is
operator choice of line style, and Sweep silently discarding that choice with zero warning
anywhere (editor or render) is a real defect, not a stacking accident to leave alone. The fix
makes them mutually exclusive at resolution time — Sweep is withdrawn (falls back to `swap`,
exactly like every other eligibility failure in this file already does) whenever
`itemBorderStyle` is anything other than solid/unset.

**Why this is additive DATA, not a new mechanism:** `sgs_nav_menu_sweep_eligible()` already
takes a generic `glyphGuard: {attr, disallowedValues}` shape and is ALREADY applied generically
to any key present in `sweepEligibility` — the resolution loop
(`sgs_nav_menu_resolved_treatments()`, lines 126-138) keys off `$eligibility[$key]` for
whichever `$key` is being resolved, with `itemBorderHoverTreatment` being just another entry
in that same `$resolved` array. Nothing in the PHP loop needs to change — `itemBorderHoverTreatment`
is simply MISSING an entry in `block.json`'s declared `sweepEligibility` object today. Adding
one is the entire fix (project rule 1 — `block_supports`/DB-declared data, not a new code
branch).

### Fix shape

```json
// plugins/sgs-blocks/src/blocks/nav-menu/block.json, inside supports.sgs.sweepEligibility,
// adding a sibling entry to the existing itemColourHoverTreatment/submenuColourHoverTreatment/
// burgerColourHoverTreatment rows:
"itemBorderHoverTreatment": {
    "blockingBackgroundAttrs": [],
    "blockingGradientAttrs": [],
    "glyphGuard": {
        "attr": "itemBorderStyle",
        "disallowedValues": ["dashed", "dotted", "double", "groove", "ridge", "inset", "outset"]
    }
}
```

No PHP change is required — `sgs_nav_menu_resolved_treatments()`'s existing loop already reads
`$eligibility['itemBorderHoverTreatment']` the moment it exists and calls the existing generic
`sgs_nav_menu_sweep_eligible()` against it, falling the resolved value back to `'swap'` exactly
like every other ineligible row already does. `edit.js`'s Sweep segment for the border-treatment
control picks this up automatically too (same declared-data contract the docblock states both
surfaces read).

⚠ **One doc correction needed alongside the code change:** `nav-menu-treatments.php`'s own
docblock (lines 80-83) currently states *"`itemBorderHoverTreatment` is deliberately absent
from that declaration"* — that comment becomes stale the moment this ships and must be updated
in the same commit (not left describing the pre-fix state).

### Falsifiable prediction

Before: on the H1 fixture (page 3500, `itemBorderStyle:"dashed"`, `itemBorderHoverTreatment:"sweep"`),
`sgs_nav_menu_resolved_treatments()` resolves `itemBorderHoverTreatment` to `'sweep'` (the
raw stored value passes through unmodified), and the emitted CSS contains the `::after`
gradient band. After: the SAME stored attributes resolve `itemBorderHoverTreatment` to
`'swap'` (ineligible, fallback), the `::after` gradient band CSS is no longer emitted at all,
and the real `border-bottom` (with `border-style:dashed`) paints normally in both states —
`getComputedStyle(link).borderBottomStyle === 'dashed'` at rest AND on hover (previously
`'solid'`-appearing via the band, with the underlying real border correctly present but
invisible).

### Baseline / validation command

Reuse the H1 fixture on page 3500 (`Spec41-Wave1-Group-G-Fixtures`), the exact config
`itemBorderStyle:"dashed"`, `itemBorderWidth.bottom:"2px"`, `itemBorderColour:"#000000"`,
`itemBorderColourHover:"#e91e8c"`, `itemBorderHoverTreatment:"sweep"` cited in
`nav-review-wave1-cluster6-border-fixtures.md`.

```bash
# BEFORE
node -e "
const {chromium} = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('https://sandybrown-nightingale-600381.hostingersite.com/spec41-wave1-group-g-fixtures/');
  const link = await p.\$('text=H1'); // or the exact fixture selector used in cluster6's own script
  const before = await link.evaluate(el => {
    const cs = getComputedStyle(el);
    const after = getComputedStyle(el, '::after');
    return { borderBottomStyle: cs.borderBottomStyle, borderBottomColor: cs.borderBottomColor, afterBgImage: after.backgroundImage };
  });
  console.log(JSON.stringify(before));
  await b.close();
})();
"
# Expect (before): borderBottomColor rgba(0,0,0,0) (real border hidden), afterBgImage is a
# linear-gradient (the always-solid band is present and visible).

# AFTER — identical script, same fixture, same URL.
# PASS = afterBgImage === 'none' (band no longer emitted), borderBottomStyle === 'dashed',
# borderBottomColor is the REAL colour (#000000 at rest, transitioning to #e91e8c on :hover
# via the ordinary swap mechanism — not the band).
```

---

## Summary — what ships, what doesn't, and open scope

| Item | Fix location | New attribute/control? | Reuses existing mechanism |
|---|---|---|---|
| A1/A2 | `nav-menu-css.php` (emission) | No | Extends the `itemFontWeightCurrent` "never lighter" weight-bump pattern |
| A3/D1 | `nav-menu-submenu-css.php` (emission) | No | Reuses `sgs_wcag_preferred_text_colour_for_bg()`, the same helper `itemBgHover`/`itemBgCurrent` already call |
| E1 | `nav-menu-css.php` (default value) | No — sets a default on an EXISTING attribute | Reuses the FR-41-13 rescue block and Hover-emission branch completely unchanged |
| H1 | `block.json` (DATA only) | No | Reuses the existing generic `sweepEligibility`/`glyphGuard` mechanism verbatim |

**None of these four fixes add a new attribute, a new control, or a new selector-shape class.**
Each is either a default-value change or a data-declaration addition inside a mechanism this
session already built and already tests correctly for its existing cases (FR-41-13's rescue,
FR-41-26's eligibility gate, the WCAG-preferred-contrast helper). This keeps the blast radius
to exactly the four confirmed defects — no speculative generalisation, no new code paths that
would need their own separate QC pass.

**Explicitly NOT addressed here (out of Cluster 1's scope, per the dispatch brief):** Groups
B/C/F/G/I/J/K/L/M and E2 (state-hierarchy propagation) — those are separate Wave 2 clusters
with their own confirmed root causes in the source register and are not solution-designed in
this file.
