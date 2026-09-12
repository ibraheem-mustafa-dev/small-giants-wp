# Nav-menu Wave 2 solution design — Cluster 4: burger typography, drawer scroll-jank, burger↔close parity, icon order, morph animation

**Proposal only — no product code edited.** Covers J1-J3, K1, L1, G2, G4 from
`.claude/reports/2026-09-12-nav-menu-visual-review-register.md`. Root-cause evidence for
all six items already confirmed in Wave 1 (`.claude/verify/nav-review-wave1-cluster5-burger-scroll.md`,
`.claude/verify/nav-review-wave1-cluster6-border-fixtures.md`) — this document designs the
fix shape only, grounded in additional code reads done for this pass (block.json manifest
conventions, `helpers-typography.php::sgs_typography_css_rule()`, `edit.js`'s existing
`TypographyControls` `targets` array, `store.js`'s scroll-lock pair, the burger's Lucide SVG
markup).

---

## J1-J3 — burger label typography

### Root cause (confirmed, Wave 1)
`block.json`'s `burger` element declares only `width`/`height`/`color`/`color-gradient`/
`background-color`/`background-image` — no font attribute exists at all, and
`nav-menu-trigger-css.php::sgs_nav_menu_trigger_css()` never emits `font-size`/`font-family`/
`text-transform`. The browser's UA `<button>` default (`13.3333px`/`Arial`) wins uncontested.

### Fix shape
Reuse the block's own already-established pattern verbatim — the `item` and `submenu`
elements both wire typography as an explicit `text` cluster in `block.json`'s attrMap,
consumed by the shared `helpers-typography.php::sgs_typography_css_rule()` emitter, exposed
in the editor via `TypographyControls`'s `targets` array (`edit.js:564-594`, entries already
exist for `item`/`submenu`). Add a third target, `burger`, following the identical shape:

1. **New attributes** on `nav-menu/block.json` (flat strings, no responsive tiers — the
   burger label is a single short word, not body copy; mirrors `submenuFontFamily`/
   `submenuFontWeight`/`submenuTextTransform`'s flat shape, not `itemFontSize`'s tiered-object
   shape):
   - `burgerFontSize` (string, default `''`)
   - `burgerFontFamily` (string, default `''`)
   - `burgerFontWeight` (string, default `'600'`)
   - `burgerTextTransform` (string, enum `['', 'none', 'uppercase', 'lowercase', 'capitalize']`, default `'uppercase'`)
   - `burgerLetterSpacing` (object `{value, unit}` or flat per `sgs_typography_attr()`'s
     existing convention — match whichever shape `submenuLetterSpacing` already uses since
     it's the nearest sibling; default resolves to `0.05em`)

2. **`block.json` `burger` element's attrMap** gets a `text` cluster added, explicit entries
   exactly like `item`'s (`block.json:116-121`):
   ```json
   "text": {
       "css:font-size": "burgerFontSize",
       "css:font-family": "burgerFontFamily",
       "css:font-weight": "burgerFontWeight",
       "css:text-transform": "burgerTextTransform",
       "css:letter-spacing": "burgerLetterSpacing"
   }
   ```

3. **CSS emission** — one new line in `sgs_nav_menu_trigger_css()`, calling the existing
   shared helper against the TEXT SPAN specifically (`.sgs-nav-menu__burger-text`), not the
   button (`$burger_sel`) — so `icon-and-text` mode never accidentally resizes the icon SVG:
   ```php
   $burger_text_sel = $uid_sel . ' .sgs-nav-menu__burger-text';
   $css .= sgs_typography_css_rule( $attributes, 'burger', $burger_text_sel, '', true );
   ```
   The trailing `true` is `$inherit_font_family_when_blank` — **this is the existing,
   already-shipped parameter** (`helpers-typography.php:130`, doc'd as the deliberate opt-in
   for "a blank value must inherit the BODY font even though the element renders as a real
   heading/UI tag", already used by `product-card`'s `titleFontFamily`). Passing `true` here
   makes an unset `burgerFontFamily` emit `font-family:inherit;` on the scoped selector,
   contesting the UA default with the theme's real body font (Inter, or whatever a given
   client's `theme-snapshot.json` sets) — **framework-portable, not a hardcoded "Inter"
   literal**, so it works identically for every client site, not just Mama's.

4. **One small, precedented extension to the shared helper** for font-size: today
   `sgs_typography_css_rule()` only has an inherit-when-blank escape hatch for font-family
   (param 5). Font-size has no equivalent, so an unset `burgerFontSize` would emit nothing —
   leaving the UA default in place, which is the exact J1 bug. Add a 6th optional param,
   `$inherit_font_size_when_blank = false`, mirroring the font-family param's shape exactly
   (same doc-comment style, same additive/backward-compatible signature — every existing
   caller keeps its current behaviour since the default is `false`). Call site passes `true`:
   ```php
   $css .= sgs_typography_css_rule( $attributes, 'burger', $burger_text_sel, '', true, true );
   ```
   This emits `font-size:inherit;` when `burgerFontSize` is unset. `inherit` resolves through
   the DOM to the burger's nearest ancestor with an explicit font-size — on every real page
   that ancestor's font-size is the theme's global body-copy rule (16px on Mama's, or
   whatever a client's theme sets) — so the burger's font-size can **never again render
   smaller than body/item text**, by construction, not by picking a specific px literal that
   could drift from the theme default on a different client. This is why `inherit` is
   preferred here over a hardcoded `'16px'` default: it is the ONLY shape that stays correct
   across every SGS client site (CLAUDE.md: "SGS is a standalone framework, not a client
   project").

   *Why extend the shared helper rather than write a private `font-size:inherit;` line
   directly in `nav-menu-trigger-css.php`:* the private-line version would work identically
   for THIS one call site, but the helper extension makes the exact same escape hatch
   available to any future caller with the same "flat scalar renders as a UI/button element,
   needs to actively contest the UA default" shape (the close button, Section L below, needs
   precisely this) — one shared mechanism, two consumers, matching the project's own
   documented precedent for the font-family param one line above it.

5. **Editor control** — add a third `targets` entry in `edit.js` alongside `item`/`submenu`
   (`edit.js:564-594`):
   ```js
   {
       key: 'burger',
       label: __( 'Menu button', 'sgs-blocks' ),
       prefix: 'burger',
       showFontFamily: true,
       showTransform: true,
       showLetterSpacing: true,
   }
   ```
   (Omit `fontSizePresets`/`showDecoration`/`showTextAlign`/`showTextWrap`/`showTextColumns`/
   `showTextIndent`/`showWritingMode`/`showHover` — none of those apply to a single-word
   button label; matches the "only declare the flags this element actually uses" discipline
   already visible in the `item`/`submenu` entries' differing flag sets.)

### J3's UX proposal — endorsed, with the exact implementation site named

Bean's proposal: only show the burger's typography target (specifically the letter-case
control) once the burger's text mode is actually active, not always.

**Endorsed.** Two independent reasons:

1. **This exact pattern already exists in the same file for the same reason.** `edit.js:405`
   already conditionally omits an entire control row — `sublinkMarkerIconIsCustom &&
   textRow(...)` — specifically so an irrelevant control never appears until its precondition
   is true (FR-41-30(b)'s own resolved design decision, "OMITTED not disabled"). Burger
   typography controls are irrelevant in `triggerMode:'icon'` (no text renders at all), so
   the identical omission shape applies with zero new precedent needed.
2. **It is one line, not a redesign.** `targets` is a plain JS array (`edit.js:564`); Bean's
   ask is answered by making the `burger` target entry conditional on `triggerMode`:
   ```js
   ...( triggerMode !== 'icon' ? [ {
       key: 'burger',
       label: __( 'Menu button', 'sgs-blocks' ),
       prefix: 'burger',
       showFontFamily: true,
       showTransform: true,
       showLetterSpacing: true,
   } ] : [] ),
   ```

**One refinement to Bean's framing, not a counter-proposal:** hide the WHOLE burger
typography target (not just the letter-case sub-control) when `triggerMode==='icon'` — font
size/family/letter-spacing are equally meaningless with no text rendered, so partially hiding
only the transform control would leave 3 dead controls visible for no reason. The
`uppercase` default still applies even while hidden, so a client who later switches to
`text`/`icon-and-text` mode sees a correctly-cased label immediately, with no extra step.

### Falsifiable prediction
Before: `getComputedStyle(document.querySelector('.sgs-nav-menu__burger-text')).fontSize`
returns `13.3333px`, `.fontFamily` returns `Arial`, `.textTransform` returns `none`. After:
with `burgerFontSize`/`burgerFontFamily`/`burgerTextTransform` all left unset (default
fixture), the same query returns the theme's body font-size (16px on Mama's), the theme's
body font-family (`Inter, sans-serif` on Mama's, resolved via `inherit`), and
`uppercase`. Setting `triggerMode:'icon'` and reopening the block's Styles tab shows no
"Menu button" typography target in the list; setting `triggerMode:'text'` or
`'icon-and-text'` shows it.

### Validation command
```bash
# live computed-style check (after deploy)
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('https://sandybrown-nightingale-600381.hostingersite.com/');
  const r = await p.evaluate(() => {
    const el = document.querySelector('.sgs-nav-menu__burger-text');
    const s = getComputedStyle(el);
    return { fontSize: s.fontSize, fontFamily: s.fontFamily, textTransform: s.textTransform };
  });
  console.log(r); await b.close();
})();
"
```

---

## K1 — drawer close scrolls the page

### Root cause (confirmed, Wave 1)
`store.js::unlockScroll()` calls plain `window.scrollTo(0, y)`. The site's global
`core-blocks-critical.css::80-84` sets `html{scroll-behavior:smooth}`, unguarded at this
call site, turning the restore into a ~350ms eased climb visible after the drawer has closed.

### Fix shape
Temporarily force `scroll-behavior:auto` on `<html>` for the duration of this one
programmatic scroll, then restore whatever was there before — the exact, already-established
idiom used elsewhere in this same codebase for the identical hazard
(`plugins/sgs-blocks/scripts/motion-qa/probe-horizontal-panel-focus.mjs:375` /
`probe-step13-pin-focus.mjs`), scoped down from "disable smooth-scroll for the whole page
session" (correct for a test probe) to "disable it only for this one call" (correct for
production, where genuine user-initiated smooth-scrolling — e.g. an anchor link — must keep
working immediately after the drawer closes):

```js
function unlockScroll() {
    const stored = document.body.getAttribute( SCROLL_LOCK_ATTR );
    document.body.removeAttribute( SCROLL_LOCK_ATTR );
    document.documentElement.style.overflowY = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    if ( stored !== null ) {
        const root = document.documentElement;
        const previousScrollBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        window.scrollTo( 0, parseInt( stored, 10 ) || 0 );
        root.style.scrollBehavior = previousScrollBehavior;
    }
}
```

This is a **cause-agnostic-safe, minimal-diff fix**: `scrollTo()` with `behavior:'auto'`
(forced via the inline override, which wins over the CSS class rule by specificity) resolves
synchronously within the current task, so restoring `previousScrollBehavior` on the very next
line — not deferred to a frame — is safe; nothing else can scroll in between. This also
repairs the existing docblock's own stated invariant ("runs in the SAME synchronous task") by
making it true again, rather than replacing the invariant with a different one.

**No JS class toggle, no new dependency, no behaviour change to any other scroll on the
site** — `previousScrollBehavior` is almost always `''` (nothing else sets an inline
override), so this restores to the CSS-declared `smooth` immediately after, for every other
scroll interaction on the page.

### Falsifiable prediction
Before: polling `window.scrollY` on every `requestAnimationFrame` during a real drawer-close
shows a ~330-400ms climb from 0 to the pre-open position (reproduced exactly in Wave 1). After:
the same poll shows `window.scrollY` reaching the pre-open position within 1-2 frames
(a single synchronous jump, not an eased climb).

### Validation command
```bash
# Re-run the exact live frame-by-frame measurement Wave 1 used
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('https://sandybrown-nightingale-600381.hostingersite.com/');
  await p.evaluate(() => window.scrollTo(0, 726));
  await p.click('.sgs-nav-menu__burger');
  await p.waitForTimeout(300);
  await p.click('.sgs-nav-drawer__close');
  const frames = [];
  for (let i = 0; i < 40; i++) {
    frames.push(await p.evaluate(() => window.scrollY));
    await p.waitForTimeout(16);
  }
  console.log(frames);
  await b.close();
})();
"
# PASS = scrollY reaches ~726 within the first 1-2 samples, not a multi-frame climb.
```

---

## L1 — burger fixes must mirror onto the close button

### Root cause (confirmed, Wave 1)
Icon-glyph resolution and colour ARE genuinely shared (same helper functions, two call
sites). Sizing and typography are **not** — the close button already carries its own
separate, static, hardcoded rule (`nav-drawer/style.css:355-380`,
`14px`/`600`/`uppercase`/`0.05em`), completely independent of the burger's total absence of
typography. **A burger typography fix will not propagate automatically.**

### Recommendation: extract the shared mechanism (not duplicate values) — with reasoning tied to what's already shared

Bean's two options, evaluated against Wave 1's finding of exactly what's already shared:

- **Duplicate hardcoded values onto the close button** — fast, but produces a THIRD
  independently-hardcoded typography rule (the close button already has one; this would swap
  it for a different literal set, still hardcoded, still with no inspector control, still able
  to drift the next time either surface changes).
- **Extract a shared mechanism** — recommended.

**Why the shared-mechanism option is not actually the higher-cost path here**, despite
looking that way in the abstract: the J1-J3 fix above is *already building* the shared
mechanism — `sgs_typography_css_rule()` is a generic, block-agnostic helper already consumed
by 8+ blocks (`accordion`, `button`, `heading`, `container`, `cta-section`, etc., confirmed by
grep). Wiring it a second time, from `nav-drawer`'s own CSS builder, for a second set of
attributes (`closeFontSize`/`closeFontFamily`/`closeFontWeight`/`closeTextTransform`/
`closeLetterSpacing`, on `nav-drawer/block.json`, matching precedent already found for colour
at L1 Wave 1 — "same helper, same call shape, inlined at two different call sites") costs
one more `block.json` attrMap block, one more `sgs_typography_css_rule()` call, and one more
`TypographyControls` target entry on `nav-drawer/edit.js` — the SAME three mechanical steps
already being built for the burger, just on the sibling block. This is **structurally
identical work**, not "more architecture" — the shared low-level primitive already exists and
already works; this only calls it from a second place, exactly matching the colour
mechanism's already-approved shape.

Two additional reasons this is the right call, not just the cheaper one:
1. **It closes an existing, separate gap for free.** The close button currently has NO
   inspector control for its typography at all (`14px`/`600`/`uppercase`/`0.05em` is a static
   CSS rule a client can never touch). CLAUDE.md's "Block customisation standard" requires
   every customisable property to be exposed as an inspector control — the close button is
   currently in violation of that standard independently of this bug. Building the shared
   attributes fixes both problems in one pass.
2. **Default-value drift is closed at the SOURCE, not by convention.** Set
   `closeFontWeight` default `'600'`, `closeTextTransform` default `'uppercase'`,
   `closeLetterSpacing` default `0.05em` — **literally copied from the close button's
   existing shipped values** (not invented), so the close button's rendered output is
   byte-identical before/after this change. The burger's NEW defaults (Section J above) are
   deliberately set to match these same three values (`600`/`uppercase`/`0.05em`), so the two
   buttons converge on identical typography by construction, from day one, without either
   file needing to reference the other's literal.

**What this recommendation is NOT proposing:** a new shared PHP wrapper function, a
cross-block attribute (WordPress blocks each own their own attribute schema; there is no
mechanism for `sgs/nav-drawer` to read `sgs/nav-menu`'s stored attribute value, nor should
there be — they are independent block instances that could theoretically be configured
differently by an advanced client). The sharing is at the **helper-function + matching
literal-default** level, exactly matching the icon-resolution and colour precedent Wave 1
already confirmed is the block's existing architecture.

### Falsifiable prediction
Before: `.sgs-nav-drawer__close`'s text renders `14px`/`600`/`uppercase`/`0.05em` from a
static CSS rule with no attribute backing it (confirmed live, Wave 1). After: the same
computed values render identically (default parity, zero visual regression), but are now
each backed by a `close*` attribute visible and editable in the block's Styles tab, and the
Wave-1-documented drift risk ("two independently hardcoded states") no longer exists — both
close and burger typography default to the same three literal values, sourced once each,
cross-referenced by comment in both `block.json` files.

### Validation command
```bash
# confirm the close button attribute now exists and controls the rendered CSS
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT block_slug, attr_name, css_property FROM block_attributes WHERE block_slug='sgs/nav-drawer' AND attr_name LIKE 'close%Font%' OR attr_name LIKE 'close%Transform%' OR attr_name LIKE 'close%Letter%'"
# expect 5 rows after /sgs-update reseed, zero before
```

---

## G2 — icon-and-text burger: icon on the left, should be on the right

### Root cause (confirmed, Wave 1)
`nav-menu-markup.php::sgs_nav_menu_burger_toggle_markup()` line 512 interpolates
`$icon_html` before `$text_html` unconditionally. `.sgs-nav-menu__burger` is already
`display:flex; align-items:center; justify-content:center;` (`style.css:183-198`) with **no**
`flex-direction` or `order` override anywhere — confirmed by grep. Flexbox is already the
layout mechanism; DOM order alone currently decides visual order.

### Fix shape
A CSS `order` swap is confirmed as the correct minimal-diff shape (flexbox already governs
this element — no markup change needed). Scope it to the mode class the markup already emits
(`sgs-nav-menu__burger--icon-and-text`, from `nav-menu-markup.php:510`):

```css
.sgs-nav-menu__burger--icon-and-text .sgs-nav-menu__burger-icon {
    order: 2;
}
.sgs-nav-menu__burger--icon-and-text .sgs-nav-menu__burger-text {
    order: 1;
}
```

Added to `plugins/sgs-blocks/src/blocks/nav-menu/style.css` (structural CSS, not attribute-
driven — same file that already owns `.sgs-nav-menu__burger`'s shape). No JS change, no
markup change, no new attribute.

### Answering "no operator choice, or exposed as a control?"
**No operator choice — hardcode icon-right as the only behaviour.** Bean's own phrasing
("the icon belongs on the right… I have never seen this pairing convention in the wild… if
it's ever done") states a design RULE, not a preference between two valid options — there is
no second convention to preserve for anyone who might want the old order. Building a toggle
for a choice nobody would rationally pick the other way on is exactly the "propose the full
option space" trap in reverse: adding a control here adds inspector surface, a stored
attribute, and a migration question for zero real optionality. `order` applied unconditionally
to the mode class also means the fix is universal by construction — it can never regress via
a client accidentally leaving a toggle in the wrong position.

### Falsifiable prediction
Before: on a `triggerMode:'icon-and-text'` fixture, `document.querySelector('.sgs-nav-menu__burger-icon').getBoundingClientRect().x` is LESS than `.sgs-nav-menu__burger-text`'s `x` (icon left). After: icon's `x` is GREATER than text's `x` (icon right), with DOM order unchanged (confirmable via `compareDocumentPosition`) — proving this is a visual-only CSS reorder, not a markup rewrite, so screen readers (which read DOM order, and the icon is `aria-hidden`) are unaffected.

### Validation command
```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('https://sandybrown-nightingale-600381.hostingersite.com/spec41-wave1-group-g-fixtures/'); // G2 fixture page
  const r = await p.evaluate(() => {
    const icon = document.querySelector('.sgs-nav-menu__burger--icon-and-text .sgs-nav-menu__burger-icon');
    const text = document.querySelector('.sgs-nav-menu__burger--icon-and-text .sgs-nav-menu__burger-text');
    return { iconX: icon.getBoundingClientRect().x, textX: text.getBoundingClientRect().x };
  });
  console.log(r); // PASS = iconX > textX
  await b.close();
})();
"
```

---

## G4 — burger→X morph animation (new feature, does not exist)

### Root cause (confirmed, Wave 1)
No JS class/attribute toggle keyed on the burger's open state exists beyond
`data-wp-bind--aria-expanded` (already present, reactive). No CSS rule anywhere is keyed on
the burger's `aria-expanded`. The default icon glyph is confirmed (this pass) to be **a
single `<svg>` containing three `<path>` elements** (Lucide's `menu` icon: `M4 5h16`,
`M4 12h16`, `M4 19h16`) — not three independently-transformable structural elements. A custom
`triggerIcon` (G3, any of 4 supported icon-source libraries) can be an arbitrary glyph shape
with no guaranteed 3-line structure at all.

### Fix shape — CSS-only (Tier V), restructured to 3 real bar elements, gated to the default icon only

Because the morph is only geometrically well-defined for the canonical 3-parallel-line
hamburger shape, and a custom icon (G3) could be any glyph, **do not attempt to animate the
resolved SVG's `<path>` elements** — that would work only for the one glyph it happens to
match today and silently do nothing (or something visually wrong) the moment an operator
picks a different `triggerIcon`, a regression-in-waiting with no warning.

Instead, replace the *default, unmodified* menu glyph with three purpose-built `<span>` bar
elements — the standard, industry-common CSS-only hamburger pattern — used ONLY when no
custom `triggerIcon` is set and `triggerMode !== 'text'`:

**Markup** (`nav-menu-markup.php::sgs_nav_menu_burger_toggle_markup()`), replacing the
resolved SVG only in the default-icon branch:
```php
$icon_html = ( '' === $custom_trigger_icon )
    ? '<span class="sgs-nav-menu__burger-icon" aria-hidden="true">'
        . '<span class="sgs-nav-menu__burger-bar"></span>'
        . '<span class="sgs-nav-menu__burger-bar"></span>'
        . '<span class="sgs-nav-menu__burger-bar"></span>'
      . '</span>'
    : '<span class="sgs-nav-menu__burger-icon" aria-hidden="true">' . $resolved_icon_svg . '</span>';
```
(`$custom_trigger_icon` = whatever variable already gates G3's custom-icon resolution — the
existing `triggerIcon` attribute check already present in this function.)

**CSS** (`plugins/sgs-blocks/src/blocks/nav-menu/style.css`, structural — unconditional, no
attribute needed, `currentColor` inherits the existing `burgerColour` mechanism for free):
```css
.sgs-nav-menu__burger-icon:has(.sgs-nav-menu__burger-bar) {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 24px;
    height: 18px;
}
.sgs-nav-menu__burger-bar {
    display: block;
    width: 100%;
    height: 2px;
    background: currentColor;
    border-radius: 1px;
    transition: transform 200ms ease, opacity 200ms ease;
}
.sgs-nav-menu__burger[aria-expanded="true"] .sgs-nav-menu__burger-bar:nth-child(1) {
    transform: translateY(8px) rotate(45deg);
}
.sgs-nav-menu__burger[aria-expanded="true"] .sgs-nav-menu__burger-bar:nth-child(2) {
    opacity: 0;
}
.sgs-nav-menu__burger[aria-expanded="true"] .sgs-nav-menu__burger-bar:nth-child(3) {
    transform: translateY(-8px) rotate(-45deg);
}
@media (prefers-reduced-motion: reduce) {
    .sgs-nav-menu__burger-bar {
        transition-duration: 0.01ms;
    }
}
```

**Why this is Tier V-compliant and needs no new JS:** `[aria-expanded="true"]` already
updates reactively via the EXISTING `data-wp-bind--aria-expanded="state.isOpen"` binding
(`nav-menu-markup.php:514`, confirmed present) — the morph is driven entirely by a CSS
attribute selector reacting to an attribute the Interactivity store already writes. Zero new
JS, matching the four-tier motion doctrine's default (Tier V vanilla/CSS) and the "vanilla
genuinely can do this" bar for not escalating to Tier G.

**Scope boundary, stated explicitly (not silently dropped):** `triggerMode:'text'` (G1, no
icon at all) and any operator-chosen custom `triggerIcon` (G3) get **no morph** — this is an
honest gap, not a broken feature, because a morph has no well-defined shape for "MENU" text
or an arbitrary glyph. If Bean later wants a morph for custom icons too, that is new,
separate scope requiring per-icon-library authored transform rules — flag as a future ask,
not build speculatively now.

### Falsifiable prediction
Before: clicking the burger toggles `aria-expanded` but the icon is visually static
(confirmed, Wave 1 — zero matching CSS/JS). After: on the default (no custom `triggerIcon`)
icon/icon-and-text fixture, clicking the burger visually morphs the three bars into an X
shape within 200ms, and reverts on close; a fixture with a custom `triggerIcon` set shows
zero visual change on click (unchanged from before — the resolved custom glyph, unaffected).

### Validation command
```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('https://sandybrown-nightingale-600381.hostingersite.com/');
  const before = await p.evaluate(() => {
    const bar1 = document.querySelector('.sgs-nav-menu__burger-bar:nth-child(1)');
    return bar1 ? getComputedStyle(bar1).transform : 'NO_BAR_ELEMENT';
  });
  await p.click('.sgs-nav-menu__burger');
  await p.waitForTimeout(250);
  const after = await p.evaluate(() => {
    const bar1 = document.querySelector('.sgs-nav-menu__burger-bar:nth-child(1)');
    return bar1 ? getComputedStyle(bar1).transform : 'NO_BAR_ELEMENT';
  });
  console.log({ before, after }); // PASS = before is 'none'/identity matrix, after is a rotate+translate matrix
  await b.close();
})();
"
```

---

## Summary — build order recommendation

1. **K1 first** — single-file, single-function change, zero design ambiguity, fixes the
   "severe UX regression" Bean flagged in the strongest terms.
2. **J1-J3 + L1 together** — they share the same shared-helper mechanism and the same set of
   literal defaults; building them in the same pass avoids a burger-only interim state where
   parity is briefly broken in a new way.
3. **G2** — trivial, independent, no dependency on the above.
4. **G4** — the only genuinely new-feature item; build last since it touches markup
   structure (the icon-vs-bars branch) and benefits from J1-J3's typography work already
   having settled the burger's final DOM shape.

No implementation has occurred. Present this design to Bean for approval before touching
`nav-menu-trigger-css.php`, `block.json`, `edit.js`, `store.js`, `nav-menu-markup.php`,
`nav-drawer/block.json`, `nav-drawer/style.css`, or `nav-menu/style.css`.
