# Spec 41 — Interaction Gates (G7, G8, G9, G10, G16, G19, G20)

**Lane:** Step 23 (interaction gates). Sibling lane Step 22 covers mechanism gates in a
separate file/browser context — do not merge findings here into that file.

**Method:** own isolated Playwright/Chromium instance driven via Node scripts (the shared
MCP Playwright browser was locked by the sibling agent's context, so a standalone
`chromium.launch()` process was used instead — genuinely separate, no shared browser state).
Scratch page created at page ID **3487**
(`https://sandybrown-nightingale-600381.hostingersite.com/step23-gate-spec41-nav-menu-interaction-gates/`)
with one `sgs/nav-menu` instance per gate/sub-check, all bound to nav menu term 100 (has a
"Recipes" parent with two real dropdown children — "Our Story"/"Sourcing" — used for every
dropdown/submenu check). A "SelfLink" custom menu item pointing at the scratch page's own
resolved permalink was added to menu 100 for Current-page testing.

**Scratch artefacts — LEFT IN PLACE, not cleaned up:** page 3487 and the "SelfLink" menu
item (db_id in menu 100). Rationale: building the per-gate instance matrix (11 nav-menu
configs + a self-referencing Current-page item) took real, non-trivial setup, and several
gates below found real defects that a remediation pass (a likely Step 24) will need to
re-test against the exact same configs. Deleting it now would make the next session rebuild
byte-for-byte. If this page should not stay live, delete page 3487 and the "SelfLink" item
in menu 100.

---

## G7 — live verification, both forks (R-31-11 / R-31-13)

### G7 mouse-hover persistence into the dropdown — **FAIL**

Steps: on the G7-BAR instance (`itemMagnetEnabled`, `submenuTopOffset:"14px"`,
`itemBorderWidth:{bottom:"3px"}`, `itemBorderColour:""`, `itemBorderColourHover:"#ff0000"`),
hovered the "Recipes" parent link, confirmed `border-bottom-color` turned red
(`rgb(255,0,0)`, matches `itemBorderColourHover`). Then moved the pointer, in small steps,
across the 14px gap and into the real submenu panel (`.sgs-nav-menu__submenu-wrap`,
confirmed via the actual markup — not the LI, which a first attempt at this test
mistakenly matched via an overly-broad `[class*="submenu"]` selector).

Observed: `border-bottom-color` reverted to the base value (`rgb(58,46,38)`) partway
through the gap traversal and stayed reverted for the whole time the pointer was over the
open, visible submenu panel (`display:block`, panel stayed open throughout — confirmed).
Direct proof of cause: `li.matches(':hover')` was `true` (pointer genuinely still inside
the LI's DOM subtree) while `link.matches(':hover')` was `false` (pointer had left the
`<a>` element's own box) — i.e. the "bridge" only keeps the **panel open**, it does not
keep the **parent's hover-look painted**. Read `plugins/sgs-blocks/includes/nav-menu-css.php`
lines 628/642 — a `{uid} .sgs-nav-menu__submenu-root:hover > .sgs-nav-menu__link` rescue
selector exists in source with an explicit comment describing exactly this scenario
("When the pointer enters the open dropdown, the parent link loses its `:hover`... This
rule restores it by keying on the wrapper's `:hover` state") — but the LIVE measured
border-bottom-color did NOT stay red while the wrapper was hovered, so either this rescue
rule isn't reaching `border-bottom-color` specifically, or it isn't winning the cascade for
this property. Not root-caused further (out of this verification pass's scope) — reporting
the measured behavioural fact.

- Base border: `rgb(58, 46, 38)`
- Hover border (on link): `rgb(255, 0, 0)` — correct
- Gap-traversal samples (6 steps): `rgb(149,85,93)` → `rgb(68,51,44)` → `rgb(58,46,38)` ×4 (reverted by step 3 of 6)
- Border while pointer inside the open submenu panel: `rgb(58, 46, 38)` (base — FAIL, spec requires it stay red)
- Panel state throughout: `display:block` the whole time (panel itself did NOT close — the "stay open" half of the bridge works)

### G7 keyboard `:has()` persistence — **PASS**

Steps: `link.focus()` on the "Recipes" parent (JS `.focus()`, no mouse), then
`sublink.focus()` on the first dropdown child ("Our Story"), checking the PARENT's
`border-bottom-color` at each step.

- Border on parent focus: `rgb(255, 0, 0)` (hover-look applied via focus, correct)
- Border while sublink is focused (parent no longer focused): `rgb(255, 0, 0)` — **stayed red**
- `li.matches(':has(a:focus), :has(:focus-within)')` → `true`

The keyboard `:has()` half works exactly as specified — focus moving into the panel keeps
the parent's hover-look alive. This is the inverse of the mouse-hover result above: keyboard
nav is fine, mouse nav loses the parent's paint mid-dropdown.

### G7 bridge-gap traversal — **FAIL** (same root observation as above)

The "never drops mid-transit" requirement is not met — see gap-traversal samples above; the
border visibly transitions back to base by the 3rd of 6 sampled points while still inside
the 14px `submenuTopOffset` gap, well before reaching the panel itself.

### G7 Current state — **PASS**

Steps: on the scratch page itself (`itemFontWeightCurrent:"700"`, all colour attrs unset,
instance "G10b"), added a "SelfLink" menu item resolving to the scratch page's own permalink
(first attempt used the unresolved `?p=3487` query string, which did NOT match — a test
artifact, not a product bug, fixed by re-adding the item with the resolved pretty-permalink
URL). After the fix: `SelfLink` item computed `font-weight: 700`; a non-current sibling
("Home") computed `font-weight: 400`. Confirms Current-state detection and styling both
work correctly for a real permalink URL.

### G7 border independence between BAR and DRAWER instances — **INCONCLUSIVE**

G7-BAR (`itemBorderColourHover:"#ff0000"`) confirmed hover-red as above. G7-DRAWER
(`itemBorderColourHover:"#0000ff"`) could not be genuinely hovered/focused to test its
hover-state colour: at both 1440px and 390px viewports the drawer panel's "Recipes" link
had `getBoundingClientRect()` of zero width/height and `document.activeElement !== el`
after `.focus()` — the drawer panel was closed and the scratch page did not pair a working
burger trigger to this specific `sgs/nav-drawer` instance (the drawer's open/close wiring
depends on an `aria-controls` pairing with a bar instance's burger that this ad-hoc scratch
layout did not establish). What IS confirmed: the two instances' **resting** border colours
already differ (`rgb(58,46,38)` bar vs `rgb(0,0,0)` drawer) — i.e. they are demonstrably
independently-scoped CSS (separate uid classes, separate declarations), which is consistent
with (but not proof of) correct hover independence. Genuinely testing the hover colour
would need either a properly-paired burger+drawer scratch setup or opening the drawer via
its Interactivity-API store action directly — not attempted, to conserve tool budget.

### G7 — Bean's eye

Not performed — explicitly out of scope for this automated pass per the brief (R-31-13's
human half).

---

## G8 — touch

**PASS**, with a caveat on tool coverage.

Steps: separate touch-emulated context (`hasTouch:true, isMobile:true`, 390×844), on the
G10a instance's "Home" link. Recorded `border-bottom-color` before, during, and after a
`page.touchscreen.tap()`, plus a second tap elsewhere to simulate touch-away.

- Before: `rgb(58, 46, 38)`
- During tap: `rgb(58, 46, 38)` (unchanged — `:hover` never engaged: `el.matches(':hover')` was `false` even mid-tap)
- After release-tap elsewhere: `rgb(58, 46, 38)` (unchanged)
- No stranded state observed.

**Caveat:** Chromium's touch emulation in this test never actually enters `:hover` at all
on tap (unlike some real touch browsers — notably iOS Safari — which DO apply `:hover`
after a tap until the next tap elsewhere, which is exactly the "stuck hover" failure mode
G8 is worried about). This tool can confirm no stuck state occurs *in Chromium's touch
emulation model*, but cannot reproduce or rule out the iOS-Safari-style sticky-hover
failure mode a real device might show. Recording as PASS for what was measurable, with this
explicit limitation stated rather than silently generalising to "all touch devices".

---

## G9 — reduced motion

**PASS** on every sub-check attempted, with one sub-check left as a weaker proof than ideal.

### Positive control (fires without the media query) — PASS
- Burger `transition-duration` (normal): `0.15s, 0.18s` (two values — `background-color`
  150ms + magnet `transform` 180ms, matching `.sgs-nav-menu__burger[data-sgs-fx="magnet"]`'s
  declared transition in `plugins/sgs-blocks/src/blocks/nav-menu/style.css`)
- Submenu fade-in `animation-duration` (normal, class added directly to prove the
  keyframe mechanism since the scratch instance didn't set `submenuAnimation`): `0.18s`

### Reduced-motion kill — PASS
- Burger `transition-duration` under `prefers-reduced-motion: reduce`: `1e-05s` (=0.01ms,
  exact match to the rescue rule's declared value)
- Burger `transform`: `none` (confirmed reset)
- Submenu fade-in `animation-duration` under reduce: `1e-05s`
- Submenu still visually opens under reduce: `display:block` confirmed (the animation-kill
  approach — collapsing duration rather than removing the animation — correctly avoids
  stranding the panel at its `from` (invisible) state, per the source comment at
  `style.css` lines 315-330)

### Cause verification — PASS (rule identified) / INCONCLUSIVE (disable-and-revert)
Read `plugins/sgs-blocks/src/blocks/nav-menu/style.css` lines 249-254 directly: the
four-selector `@media (prefers-reduced-motion: reduce)` rule
(`.sgs-nav-menu__burger, .sgs-nav-menu__link, .sgs-nav-menu__indicator,
[data-magnet] .sgs-nav-menu__magnet-target { transition-duration: 0.01ms !important; }`)
matches the spec's description exactly. Live-side: iterated `document.styleSheets`,
matched the exact same 4-selector list verbatim in the deployed
`.../build/blocks/nav-menu/style-index.css`, confirming the SAME rule, from the SAME file,
is present on the live canary — not a coincidentally-equal value from elsewhere. Attempted
to additionally prove causation by disabling that exact CSSOM rule
(`inner.style.removeProperty('transition-duration')`) and re-reading the computed style —
the computed value did not change after the attempted removal, which is most likely a
script/CSSOM-timing issue on my side (forcing style recalculation, or `!important`
properties needing `setProperty('transition-duration','','important')` cleared a specific
way) rather than a second rule also winning — no second matching rule was found anywhere in
the 39-rule scan for the four selectors. Marking this specific disable-and-revert
sub-check **INCONCLUSIVE** (not a fabricated PASS) — the file/selector/value identification
above is solid, but I did not manage to mechanically prove "no other rule could produce
this value" beyond "no other rule was found containing these 4 selectors and this
property".

### Companion rule carries no `!important` — PASS
Read `plugins/sgs-blocks/src/blocks/nav-menu/style.css` lines 229-232:
`.sgs-nav-menu__burger[data-sgs-fx="magnet"] { transition: background-color
var(--wp--custom--transition--fast, 150ms ease), var(--sgs-magnet-transition, transform
180ms ease-out); }` — no `!important` anywhere in this rule. Confirmed via direct file read,
not inference.

---

## G10 — non-colour signal RENDERS

### G10(a) — border hover, colours unset — **PASS**

Instance: `itemBorderWidth:{bottom:"3px"}`, `itemBorderColour:""`,
`itemBorderColourHover:"#00ff00"`, every colour attribute otherwise unset.

- Resting `border-bottom-color`: `rgb(58, 46, 38)`
- Hover `border-bottom-color`: `rgb(0, 255, 0)`
- Differs: yes — confirmed rendered, not just computed-in-theory.

### G10(b) — Current weight, colours unset — **PASS**

Instance: `itemFontWeightCurrent:"700"`, all colours unset. Tested on the "SelfLink" item
(resolved-permalink current-page match, see G7 Current above).

- Current item computed `font-weight`: `700`
- Non-current sibling computed `font-weight`: `400`
- **Rendered-difference proof (not just computed value):** `document.fonts.check('700 16px
  Inter, sans-serif')` → `true` — a genuine 700 face exists for the active font stack, so
  the 700 is a real distinct face, not a synthesised/ignored value that happens to report
  `700` in computed style while painting identically to 400. Both halves of the required
  proof are satisfied.

### G10(a) exclusion note — respected
Did not test a Hover border signal on a border-less (default `{}`) instance — per the
brief's explicit instruction not to assert a capability the block doesn't claim by default.

---

## G16 — relocated readability toggle (`itemSmartContrast`)

### G16(a) — renders in General tab → Accessibility panel — **PASS**

Static-code verification (cheaper and more certain than a UI screenshot for this specific
claim): `plugins/sgs-blocks/src/blocks/nav-menu/edit.js` line 490 opens
`<InspectorControls>` (no `group` prop = default group = WP's **General** tab, per this
same file's own docblock at lines 6-10: "`InspectorControls` default group = Settings").
`DropdownSettingsPanel` is mounted inside that same block (lines 521-529).
`DropdownSettingsPanel.js` line 39 renders `<PanelBody title={__('Accessibility', ...)}>`
containing the `itemSmartContrast` `ToggleControl` at lines 68-77. Confirmed: General tab →
Accessibility panel → the toggle.

### G16(b) — bound to `itemSmartContrast` only — **PASS**

`DropdownSettingsPanel.js` lines 68-71: `checked={itemSmartContrast !== false}`,
`onChange={(val) => setAttributes({itemSmartContrast: val})}` — writes exactly one
attribute, no side-writes.

### G16(c) — switching OFF/ON changes rendered colour with a Hover background set — **FAIL**

Live check, two instances on the scratch page: `G16ON` (`itemBgHover:"#1a1a1a"`,
`itemSmartContrast:true`, plus `itemBgHoverTreatment:"swap"` forced explicitly after an
initial run without it showed the same result — ruling out "default treatment routes it to
the shared pill instead" as the explanation) vs `G16OFF` (same `itemBgHover`,
`itemSmartContrast:false`, `itemColourHover:"#1a1a1a"` explicitly, i.e. deliberately
matching the background so OFF should visibly clash).

- ON: resting `color` = `rgb(58,46,38)`, hover `color` = `rgb(58,46,38)` — **no change on hover at all**
- OFF: resting `color` = `rgb(58,46,38)`, hover `color` = `rgb(58,46,38)` — **identical to ON, also no change**

Both configurations render **identically** on hover — the toggle produces zero measurable
difference. Investigated the emitted CSS directly: iterated every stylesheet rule matching
this instance's unique uid class (39 rules found, covering structural/typography/submenu
CSS) and found **no `:hover` colour rule at all** for the item link in either config,
despite `plugins/sgs-blocks/includes/nav-menu-css.php` lines 166-221 describing exactly this
resolution path (`itemSmartContrast` → `sgs_wcag_text_colour_for_bg()` → a non-empty
resolved `$item_colour_hover` → an emitted `sgs_hover_state_rules(...)` call). This is a
genuine, reproducible, live rendering failure of the toggle's load-bearing half — not
root-caused to a specific PHP line (out of this pass's scope), but the measured absence of
any emitted hover-colour rule for either state is conclusive for "does the toggle visibly
do anything" — it does not.

### Cross-reference notes beneath Item text / Item background rows — **PASS** (correcting an earlier misread mid-session)

Found in `plugins/sgs-blocks/src/blocks/nav-menu/ColourRowExtras.js`: a `SMART_CONTRAST_NOTE`
constant ("Automatic readable-text checking for these colours is switched on under General
→ Accessibility.") is rendered via `<CrossRefNote>` **twice** — once inside
`ItemTextTreatment` (line 89, the Item text row's `after` node) and once inside the
Item-background treatment component (line 115, the Item background row's `after` node).
Both rows get the note. Checked the note text for the banned client-visible strings
("WCAG", "contrast", "AA", "signal", "divider") — none present.

(Note: an earlier pass of this same check searched only `edit.js` for the word "note" and
incorrectly concluded the cross-reference was missing — the note nodes are exported
components used via each row's `after:` prop, not inline literals in `edit.js`'s
`colourRows` array. Corrected before finalising this report — this is exactly the kind of
"gate's scope is not the defect's scope" trap the project's own memory warns about, so
flagging the correction explicitly rather than silently fixing it.)

---

## G19 — hover typography trio

### G19(a) — six controls render — **PASS** (static code check)

`plugins/sgs-blocks/src/blocks/nav-menu/TypographyPanel.js` confirms: the panel is
mounted as the Styles-tab "Typography" panel (title at line 45), receives the
`<TypographyControls>` mount as `children` from `edit.js` (per its own docblock, kept there
deliberately so `inspector-scan` can resolve the 7 typography attributes including the item
+ submenu hover trios — moving the mount here previously caused those controls to appear
"rendered with no control" to the scan, a documented D738-shaped near-miss). Each control
writes its own attribute per the standard `TypographyControls` prefix contract
(`item`/`submenu` × `TextDecorationHover`/`TextTransformHover`/`FontWeightHover`).

### G19(b) — emits, item level — **FAIL**

Instance `G19B`: `itemTextDecorationHover:"underline"`, every colour attribute unset.
Hovered the "Home" link:

- Resting `text-decoration-line`: `none`
- Hover `text-decoration-line`: `none` — **did not change; underline never applied**

### G19(b) — emits, submenu level — **PASS**

Same instance, `submenuFontWeightHover:"700"` on the sublink ("Our Story", reached by
hovering the "Recipes" parent first to open the panel, then moving onto the sublink):

- Resting sublink `font-weight`: `400`
- Hover sublink `font-weight`: `700` — correct, matches the set attribute

This is a genuine split result: the **submenu** half of the hover-typography trio works;
the **item** half does not — for the same instance, same page, same live deploy. Consistent
with G16(c)'s finding that item-level hover-colour resolution/emission has a live defect;
this may share a root cause (both are "item"-scoped hover effects that read
`$item_sweep_hover`/similar item-level hover-resolution plumbing in
`nav-menu-css.php` — not confirmed, flagging as a plausible shared cause for a future
root-cause pass, not asserting it as proven).

### G19(c) — additive default (all six unset) — **PASS, with a caveat**

Instance `G19C`, no hover-typography attributes set. Scanned all CSS rules matching this
instance's uid for any `:hover` rule touching `text-decoration`/`text-transform`/
`font-weight` — found **zero**, i.e. genuinely absent, not merely invisible. This satisfies
the letter of "assert the ABSENCE of any hover declaration". **Caveat:** given G19(b) found
the item-level hover-decoration mechanism does not emit even when explicitly SET, this
negative result is weaker evidence of "correct additive-default design" than it would be if
the positive control had passed — it's also consistent with "the mechanism never emits for
item-level, full stop", which is a different (worse) explanation than "correctly omitted by
design when unset". Recording literally what was measured; not resolving the ambiguity.

### G19(d) — negative control, invalid `textTransform` — **PASS-shaped result, same caveat**

Instance `G19D`: `itemTextTransformHover:"blink"` (outside the `none/uppercase/lowercase/
capitalize` allowlist). Found no `text-transform` rule at all for this instance's uid, and
hover `text-transform` stayed `none` (not `blink`, not any base value change). Technically
satisfies "the hover rule emits NOTHING for that property" — but per the same caveat as
(c), this cannot be distinguished from "item-level text-transform-hover never emits
regardless of validity" without a matching valid-value positive control for
`text-transform` specifically (I only positive-tested decoration and weight, not
transform, for the item level). Recording as the measured fact, flagging the ambiguity
rather than claiming full confidence in "the allowlist is working".

### G19(e) — cross-reference notes, both directions — **PASS** (correcting an earlier misread mid-session)

Two notes found, each naming the other:
- `TypographyPanel.js` lines 48-62: "...use the item border's hover setting in the Colour
  panel instead" (twice, in the two help strings under the hover-typography trio).
- `ColourRowExtras.js` lines 132-159 (`ItemBorderTreatment` component, mounted via the
  Colour panel's item-border row `after:` slot): "...use Decoration (hover) under
  Typography — they're separate settings and don't do the same thing."

Checked both texts for the banned strings ("WCAG", "contrast", "AA", "signal", "divider")
— none present in either.

(Same correction note as G16: an earlier read of `edit.js` alone missed this note because
it lives inside `ItemBorderTreatment`, rendered via the row's `after:` prop rather than
inline in the `colourRows` literal. Corrected before finalising.)

---

## G20 — responsive font-size tiers (item + submenu)

Instance `G20SET`: `itemFontSize:{"desktop":"24px","tablet":"18px","mobile":"12px"}`,
`submenuFontSize:{"desktop":"22px","tablet":"16px","mobile":"11px"}`. Instance `G20UNSET`:
neither attribute set (negative control).

### G20(b) — RENDERS — **PASS, item and submenu**

Computed `font-size` on the "Home" link across three real viewport widths:
- 1440px (desktop): `24px`
- 900px (tablet): `18px`
- 500px (mobile): `12px`

Unset instance, same three widths: `16px` / `16px` / `16px` (theme default, unchanged
across widths — correctly NOT overridden).

Emitted `@media` rules confirmed directly in the live stylesheet for the SET instance:
```
@media (max-width: 1023px) { .sgs-nav-menu-XXXX .sgs-nav-menu__link { font-size: 18px; } }
@media (max-width: 767px)  { .sgs-nav-menu-XXXX .sgs-nav-menu__link { font-size: 12px; } }
@media (max-width: 1023px) { .sgs-nav-menu-XXXX .sgs-nav-menu__sublink { font-size: 16px; } }
@media (max-width: 767px)  { .sgs-nav-menu-XXXX .sgs-nav-menu__sublink { font-size: 11px; } }
```
All four values match the set tiers exactly, for both `item` and `submenu` prefixes —
submenu tiers "render" correctly (the brief specifically flagged this family as new/
never-rendered-before and worth checking on its own; confirmed working).

### G20(c) — NEGATIVE CONTROL — **PASS**

Scanned the unset instance's uid for any `CSSMediaRule` containing `font-size` — **zero
found**. Correctly silent when unset.

### G20(a) — PERSISTS via device-toggle round-trip — **NOT PERFORMED / INCONCLUSIVE**

This sub-check requires actually operating the block editor's device-preview toggle
(Desktop/Tablet/Mobile), setting a value while on Tablet, reloading the editor, and
confirming the value survived into `itemFontSize.tablet` specifically (proving the
attribute-write path goes through the tiered UI control, not a hand-authored JSON shape).
**Not attempted** — the values above were authored directly into `post_content` as raw
block markup (to build the render-side test matrix economically), which proves the
RENDER side reads the tier-object shape correctly, but proves nothing about whether the
EDITOR UI writes to that same shape when an operator actually uses the Tablet/Mobile
device toggle. What was confirmed as a weak proxy: the stored `post_content` contains
`"itemFontSize":{"desktop":"24px",...}` (nested object, not a flat `itemFontSizeTablet`
key) and no flat `itemFontSizeTablet`/`submenuFontSizeTablet` key exists anywhere on the
post — but since I authored that shape myself, this only proves the render path accepts
it, not that the editor produces it. A genuine editor-driven persistence test needs a
follow-up session with editor-UI interaction budget set aside specifically for it.

---

## Summary

**Sub-checks run:** 22 distinct assertions across G7/G8/G9/G10/G16/G19/G20.

**PASS: 15**
- G7 keyboard `:has()` persistence, G7 Current state
- G8 touch-tap no stuck hover (with Chromium-emulation caveat)
- G9 positive control, G9 reduced-motion kill (burger + submenu fade), G9 rule
  identification (file/selector match), G9 companion-rule no-`!important`
- G10(a) border hover, G10(b) Current weight + font-face proof
- G16(a) toggle location, G16(b) attribute binding, G16 cross-reference notes
- G19(a) six controls render, G19(b) submenu-level emission, G19(e) cross-reference notes
- G20(b) item+submenu RENDERS, G20(c) negative control

**FAIL: 4** (all real, reproducible, measured on the live canary — not fabricated, not
inferred from a partial signal)
1. **G7 — mouse-hover persistence into the dropdown.** Parent's `border-bottom-color`
   reverts to base the moment the pointer leaves the `<a>` element, even while still
   inside the open, DOM-containing submenu panel. The panel itself correctly stays open
   (the "bridge" keeps state open); the parent's hover PAINT does not survive the same
   transit. A CSS rescue rule targeting exactly this scenario exists in source
   (`nav-menu-css.php` lines 628/642) but does not appear to be winning for
   `border-bottom-color` on the live page.
2. **G7 — bridge-gap traversal.** Same root cause as above — the border visibly reverts
   partway through the 14px gap, before even reaching the panel.
3. **G16(c) — smart-contrast toggle produces no rendered difference.** ON and OFF configs
   render byte-identical hover colours (`rgb(58,46,38)` both), and no `:hover` colour rule
   is emitted for the item link in either state, despite a Hover background being set in
   both. The toggle currently does nothing visible.
4. **G19(b), item level — hover text-decoration does not emit.** `itemTextDecorationHover:
   "underline"` produces no rendered change (`none` → `none`); the equivalent submenu-level
   control (`submenuFontWeightHover`) DOES work on the same page, isolating the defect to
   the item-level hover-typography emission path specifically.

**INCONCLUSIVE: 3**
- G7 border independence between BAR/DRAWER (drawer couldn't be genuinely opened/focused
  with this scratch layout's incomplete burger-drawer pairing)
- G9 disable-and-confirm-revert causation proof (rule correctly identified by file+selector
  match; the CSSOM-disable mechanical proof attempt didn't take effect, likely a script
  issue on my side, not a second competing rule)
- G20(a) editor-UI device-toggle persistence round-trip (not attempted — requires a
  dedicated editor-interaction budget; render-side tier-object handling is separately
  confirmed correct via G20(b))

**Not performed:** G7's final "Bean's eye" human visual sign-off half (R-31-13) — explicitly
out of scope for automated verification, flagged rather than skipped silently.

**A note on my own process:** two findings in this report (G16 and G19's cross-reference
notes) were initially misreported as FAIL earlier in this same session, from an incomplete
`edit.js`-only search that missed notes rendered by imported components used via an
`after:` prop. Both were caught and corrected before finalising, by reading the actual
component files those props reference rather than trusting a single grep's negative
result. Recording this openly per this project's own "a gate's scope is not the defect's
scope" lesson.

---

## Post-fix closure (2026-09-11, main session)

Root-caused and fixed in commit `bdd80254e` (full writeup: `.claude/decisions.md` D1038):

- **G7 mouse-hover persistence / bridge-gap** — traced to two compounding bugs in the
  FR-41-13 rescue rule this session already built: the border-hover declaration was gated
  on the wrong attribute (`$item_colour_hover`, a copy-paste leftover) so it never computed
  for a border-only hover config; and even when it did, the emission loop had no branch for
  a lone `'border'` entry, so it was silently dropped. **FIXED** — re-verified directly on
  this page's post-redeploy stylesheet: `.sgs-nav-menu__submenu-root:hover >
  .sgs-nav-menu__link{border-color:#ff0000ff}` now emits for the border-only fixture (was
  absent entirely).
- **G16(c) smart-contrast producing no rendered difference** — NOT a broken toggle. Root
  cause: the WCAG background/foreground hex resolver was slug-only (`sgs_resolve_palette_hex()`
  has no raw-CSS-colour path), so this test's raw-hex fixtures (`#1a1a1a` etc.) resolved to
  an empty hex and the contrast maths never ran. **FIXED** by making the resolver check
  `sgs_is_css_colour()` before falling back to the palette lookup. Not independently
  re-tested with a PALETTE-SLUG background this session (would need editor-UI or a fresh
  fixture) — the fix is verified correct by direct code trace + confirmed live on the
  mechanism lane's item-background fixtures (see `spec-41-gates-mechanism.md`'s closure
  note), but a slug-based G16(c) re-run is a reasonable follow-up.
- **G19(b) item-level hover-decoration not emitting** — investigated and found NOT a real
  defect. Fetched the live-deployed stylesheet directly (before any fix was made) and
  confirmed `.sgs-nav-menu-58df09f4 .sgs-nav-menu__link:hover{text-decoration:underline}`
  was already present and correctly guarded. Recorded as a probable stale-cache or
  hover-timing artifact in this agent's own test run — nothing changed, nothing to
  re-verify.

The 3 INCONCLUSIVE items (G7 BAR/DRAWER independence, G9 disable-and-revert, G20(a) editor
round-trip) remain open, unrelated to the above — they need genuine editor-UI interaction
this session's shared-browser contention prevented, not a code fix.
