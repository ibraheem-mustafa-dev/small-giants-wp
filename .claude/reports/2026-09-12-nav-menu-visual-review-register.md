# Nav-menu visual review register — Bean's live review, 2026-09-12

**Source:** Bean's direct review of the Spec 41 nav-menu rebuild (Steps 1-23 of
`.claude/plans/phase-nav-menu-colour-state.md`), against the deployed canary and the
Playwright verification scratch pages (3487, 3488, 3494). Restructured from Bean's own
brain-dump message — every point preserved, grouped by shared root cause where the
grouping is obvious from the description alone (not yet verified against code).

**Process (Bean-directed):**
1. Wave 1 — `/qc-council` root-cause investigation per group (this doc's groups below).
2. Group findings that share one real root cause (may differ from this doc's initial grouping
   once code is read).
3. Wave 2 — `/qc-council` solution-design pass per confirmed group, proposal written into
   this register.
4. `/qc-inline` self-check on the proposals.
5. Present the completed register to Bean before any implementation.

**⛔ Nothing in this register is implemented yet. This is the intake + investigation
register only.**

---

## Group A — Hover colour changes text but not background, illegible pairing

Recurs across at least 3 separate live locations Bean checked — same symptom shape each time.

- **A1 (item G13 scenario 4 fixture).** Base pairing: black text on pink fill. On hover,
  text switches to "dark primary" (a slightly darker pink than primary) while the
  background fill stays the same pink. Two near-identical pinks — illegible. Breaks Bean's
  own minimum standard (explicitly more lenient than WCAG AA, but this fails even that).
- **A2 (nav drawer item hover).** Same shape: hovering a drawer item does not change the
  background/fill colour at all, so the same black-text-to-dark-pink-on-pink problem
  recurs identically.
- **A3 (G14 "G14 negative submenuLinkBg blocks sweep" fixture).** Submenu item text colour
  is the exact same colour as its own background fill — invisible until hovered, at which
  point it turns yellow.

**Bean's standing rule these violate:** hover-state colour pairing must be at minimum
*discernible* (his own bar, looser than WCAG AA) — never two near-identical shades of the
same hue on both text and fill simultaneously.

---

## Group B — Burger menu colour: net regression, not improvement

- **B1 (G14 "Burger Neg" fixture, icon mode).** No colour issue has improved; multiple have
  gotten worse compared to before Step 1 of the 26-step plan started.
- **B2.** No example anywhere shows the burger button with a background/fill colour set —
  a real, testable configuration with zero coverage.

---

## Group C — Separators/dividers missing on vertical modes

- **C1.** Bean's original requirement: all vertical-mode menus get a visible separator,
  accent-coloured, by default on normal state. "Vertical modes" = the horizontal nav's own
  **submenus** (dropdown panels), plus **both** the menu and submenu levels of the **nav
  drawer**. Currently: completely invisible on normal state AND on hover, everywhere.

---

## Group D — Nav submenu items: zero visual response, wrong default colours

- **D1.** Submenu items were supposed to be wired to theme global colours by default, but
  they still show an unexplained "tinted pink" background — not a theme-token default.
- **D2.** The chevron/marker icon to the left of each submenu item's text should default to
  the SAME colour as that item's text — unless the shape has been swapped for a custom icon
  from the 4 supported icon libraries via the icon picker.
- **D3.** Submenu items show **zero** change on hover — no colour change, no movement,
  nothing at all. Bean asks directly: is this simply not wired up, or does it need
  rebuilding/migrating — possibly because the nav-drawer instance under test was built
  before the CPT (custom-post-type?) work landed.
- **D4 (drawer-specific caveat).** Bean flags that he's not sure the drawer submenu
  chevron's "defaults to submenu item colour" wiring even works, because none of the
  drawer submenu fixtures on the test page were given an explicit hover TEXT colour to
  confirm against.

---

## Group E — Parent-item hover state lost when pointer enters its own submenu (regression) + missing state-hierarchy propagation

- **E1. Regression, both bar and drawer forks.** Hovering a menu item's OWN submenu panel
  causes the parent item to visually revert to its unhovered state — exactly the defect
  this session's FR-41-13 rescue rule was supposed to have fixed (G7). Bean reports it is
  **not** fixed and behaves like a regression from before this rebuild started. This needs
  re-investigation against the live canary, not just the earlier scratch-page evidence.
- **E2. New requirement, not previously specified this precisely: state hierarchy and
  propagation.**
  - Hover is dynamic and always wins outright — the top of the hierarchy.
  - Current-page state sits below hover, and OVERRULES normal state.
  - **Current state must propagate UP the tree**: if the page currently open lives inside a
    submenu, the TOP-LEVEL parent item should visibly show a non-normal state too — so the
    visitor can see, at a glance and without hovering anything, which top-level item's
    submenu contains the page they're on.
  - More generally: **a submenu having any item in a non-normal state (current, or — per
    the hover rule above — actively hovered) should always be reflected visibly on that
    submenu's own parent item**, so it's clear which menu's submenu is open/relevant.

---

## Group F — No opening animation anywhere

- **F1.** None of the tested menus — horizontal bar dropdowns or the nav drawer's own
  submenus — show ANY animation when a submenu opens. Every transition observed was an
  instant, un-eased switch.
- **F2 (submenu-specific timing complaint, G14 "G14 negative submenuLinkBg" fixture).** The
  submenu's OPENING itself appears delayed until AFTER the underline hover-sweep effect on
  the trigger has finished animating in — reads as laggy, poor UX, whether or not it is
  literally sequenced that way in code.

---

## Group G — Missing test-fixture coverage (not necessarily bugs — gaps in what was tested)

None of these configurations were represented anywhere on the verification scratch pages,
so Bean could not review them and any defects in them are currently invisible to every gate
that ran:

- **G1.** Burger fully replaced by the literal text "MENU" (`triggerMode` text-only) — no
  example at all.
- **G2.** Icon-and-text burger — existing examples place them awkwardly side by side, icon
  on the LEFT of "Menu". Bean has never seen this pairing convention in the wild; if it's
  ever done, the icon belongs on the RIGHT (nearest the screen corner), not the left.
- **G3.** A custom icon (not the default hamburger glyph) replacing the burger symbol — no
  example.
- **G4.** The burger→X "morph" animation (lines sliding/rotating into an X) on open — no
  example anywhere; unclear if it exists at all currently.
- **G5.** A custom icon (not the default chevron) replacing the drawer submenu's sublink
  marker — no example, despite this being FR-41-30(b)'s whole feature.
- **G6.** A mega-menu dropdown, on EITHER the horizontal bar or the nav-drawer vertical
  form — zero examples of this interaction anywhere in the test set.

---

## Group H — Border-style double-line visual clash (G18 fixture)

- **H1.** The G18 "border-style dashed emit" fixture renders TWO overlapping bottom lines
  that visually fight on hover: a black dashed bottom border (the base border-style
  control) sits static, and the ordinary pink underline/divider hover-sweep effect animates
  in on top of it. Bean asks directly whether this combination was intended to look like
  this, or whether the two mechanisms should not be allowed to stack like this.

---

## Group I — Submenu panel background has a mismatched "lip"

- **I1.** The submenu panel's pink background has a visually distinct WHITE strip/lip along
  its top and bottom edges that doesn't match the pink used everywhere else in the panel —
  reads as an out-of-place seam, not a deliberate design choice.

---

## Group J — Burger button typography defaults are all wrong

- **J1.** Burger label text renders SMALLER than both the default nav item text size and
  ordinary paragraph body text, for no apparent reason.
- **J2.** Burger label font-family renders as Arial — completely disconnected from the
  canary's actual global type pair (Fraunces + Inter).
- **J3.** Burger label renders lowercase. Bean's expectation/precedent from prior sites: a
  burger's text label (when present) is conventionally ALL CAPS. Proposes defaulting to
  uppercase — and notes the letter-case OPTION itself may only need to surface in the
  Typography panel's target switcher once/if the burger's text mode is actually turned on
  or a label is filled in, rather than always being a visible control.

---

## Group K — Drawer close scrolls the page (severe UX regression)

- **K1.** Closing the nav drawer jumps the page to the very top, then auto-scrolls back down
  to wherever the visitor actually was. Described as "genuinely very janky" — makes the
  drawer feel broken and disorients the visitor mid-task. The page must never move at all
  as a side effect of opening or closing the drawer.

---

## Group L — Burger fixes must mirror onto the nav-drawer's own close button

- **L1. Cross-cutting instruction, not a separate defect:** whatever fixes land for ANY of
  the burger-menu issues above (colour, typography, animation, icon behaviour) must be
  mirrored onto the nav-drawer's own close (×) button, because — per Bean — that control's
  functionality was built immediately after the burger's, using essentially the same
  mechanism.

---

## Group M — Horizontal dropdown chevron: structurally disconnected from its menu item

A cluster of distinct symptoms Bean attributes to one likely shared root cause: the chevron
is not actually part of the parent menu item's own interactive/visual unit.

- **M1.** The chevron currently behaves as an entirely separate, second hover-trigger for
  showing/hiding its dropdown — completely disconnected visually and structurally from the
  menu item it's supposed to belong to.
- **M2.** Hovering the chevron opens the dropdown, but does NOT also trigger the parent menu
  item's own hover visual state (colour/etc.) — the two don't act as one unit.
- **M3.** Because the chevron is structurally separate, the dropdown PANEL itself is
  positioned/centred relative to the chevron element, not to the actual parent (the menu
  item) — a further symptom of the same disconnection.
- **M4.** The chevron should be painted using the item's TEXT colour attribute (same
  requirement applies identically to the nav-drawer's own version of this chevron).
- **M5.** The chevron should flip upside-down while its dropdown is open, and flip back once
  the hover state clears. Bean confirms this flip **already works correctly on the nav
  drawer version** — it's missing/broken on the horizontal bar version specifically. Both
  versions still need: (a) a subtle open animation on the dropdown/submenu itself (ties to
  Group F), and (b) the chevron's flip-animation DURATION wired to match the dropdown's own
  reveal-animation duration, rather than being an independent/arbitrary value.
- **M6.** The chevron currently renders oversized relative to the menu item's own text.
  Bean's proposed fix (pending investigation): once M1-M3 are resolved and the chevron is
  properly incorporated into the item, wire its size to the item's own font-size attribute —
  the same "inherit from the item" pattern proposed for colour (M4).
- **Research pointer (Bean's own instruction):** this is a basic, well-established UI
  pattern industry-wide — check `/library-docs` / `/research-check` for the standard
  dropdown-chevron setup before attempting to patch the current one property-by-property;
  it may be faster and more correct to rebuild to the standard shape directly.

---

## Open questions Bean asked directly (route to the council as forcing questions, not to be silently assumed)

1. Group D3 — is the submenu's total lack of hover response an unwired control, or does it
   need a structural rebuild/migration (possibly tied to work that predates the "CPT" pass)?
2. Group H1 — was the dual dashed-border + pink-underline-sweep stacking on `.sgs-nav-menu__link`
   actually intended, or should these two mechanisms be made mutually exclusive?
3. Group D4 / M5 — for both the drawer submenu chevron colour default and the horizontal
   chevron's flip animation, the test fixtures never actually exercised the relevant
   attribute (no hover text colour set on drawer submenu fixtures) — so an apparent PASS or
   FAIL from the existing scratch pages cannot be trusted without a fixture that actually
   sets the value.

---

## Wave 1 findings (2026-09-12) — root-cause investigation, no fixes built

Six parallel diagnostic agents investigated the groups above against real code + the live
canary. Full per-cluster evidence: `.claude/verify/nav-review-wave1-cluster{1-6}-*.md`.
Status per group below — **CONFIRMED** (real defect, root cause found), **REFUTED** (Bean's
observation traces to something other than a product bug), **NOT REPRODUCED** (couldn't
confirm on the config tested — doesn't mean it's wrong, means it needs a second look with
Bean), or **UNCONFIRMED** (genuinely couldn't test within budget).

### Group A — CONFIRMED (both mechanisms)
- A1/A2: `nav-menu-css.php::sgs_nav_menu_item_state_css()` unconditionally suppresses the
  per-item hover/current background fill whenever `itemBgHoverTreatment==="highlight"`,
  with no guard against the resting fill and the Highlight pill resolving to the identical
  colour. Same shared emitter on bar and drawer.
- A3: submenu resting text colour defaults to the `primary` (pink) palette token
  (`nav-menu-submenu-css.php` ~line 452, a deliberate earlier default), with no
  text-vs-background collision guard — reproduced live.

### Group B — REFUTED (test-fixture data bug, not a product regression)
- B1/B2: the QC fixtures used colour slug `"secondary"`, which **does not exist** in Mama's
  actual palette (`sites/mamas-munches/theme-snapshot.json`). `burgerBg:"secondary"` renders
  transparent by design (unresolvable token); `burgerBg:"accent"` (a real token) renders
  correctly. Bean's "genuinely worse than before Step 1" read is very likely explained by
  the verification fixtures themselves being built with an invalid colour, not by any code
  change this session made.

### Group C — NOT A BUG (documented gap, already disclosed in spec)
- C1: Spec 41 FR-41-36 explicitly locks the separator design intent but ALSO states it is
  "not yet built." Confirmed zero border CSS emits for any untouched instance, matching
  `block.json`'s empty defaults exactly — this is unbuilt scope, not broken code.

### Group D — split verdicts
- D1 (tinted-pink submenu bg): **UNCONFIRMED** — could not reproduce an actual
  background-color; likely the SAME mechanism as A3 (pink resting TEXT) being visually
  misread as a background tint, but not proven either way.
- D2 (marker colour default): **CONFIRMED working as designed, but drawer-only** —
  `render.php` scopes the marker mechanism to `.sgs-nav-drawer` and only wires it into
  `sgs_nav_menu_render_items_drawer()`. The horizontal bar has no marker mechanism at all
  (by original FR-41-30(b) scope — the drawer-only decision Bean confirmed earlier this
  session).
- D3 (submenu zero hover response): **REFUTED as "broken"** — an untouched instance
  genuinely has NO hover CSS emitted at all (`nav-menu-submenu-css.php::sgs_nav_menu_submenu_css`
  only emits `:hover` when `submenuColourHover`/`submenuLinkBgHover` are explicitly set).
  Proven the mechanism itself works correctly once configured (live-tested, colour changes
  on `:focus-visible`, which shares the rule with `:hover`). CPT-migration theory directly
  refuted: the live drawer's actual stored content is a plain zero-attribute
  `<!-- wp:sgs/nav-menu {"ref":0} -->`, rendering through the identical current code just
  verified working. **This is a "no default hover signal on an untouched instance" design
  question, not a broken/unmigrated mechanism.**
- D4 (drawer marker hover colour): **UNCONFIRMED** — the 3-state colour mechanism is fully
  built and the CSS-inheritance default is correct on paper, but the agent could not
  synthetically fire a real hover/focus on the marker inside the Interactivity-API-gated
  accordion in headless Playwright. Needs a real mouse/keyboard pass, not a synthetic one.

### Group E — genuine conflict with Bean's live observation, escalating rather than resolving
- E1 (parent-hover regression): **NOT REPRODUCED** for the bar fork under real mouse
  testing (only a brief 2-frame flicker during the literal pointer-gap crossing, not a
  persistent revert) — including the `highlight`/pill treatment case, which was
  specifically checked as a risk and found to hold correctly. Confirmed no stale deploy
  (md5-identical between repo and live). **The drawer fork remains genuinely untested — no
  working burger+drawer+configured-hover fixture exists anywhere**, which is the same gap
  the original G7 gate had. Alternative explanation flagged: if Bean tested via a real
  phone tap, there is no true `:hover` state on touch to begin with — a different,
  pre-existing UX question, not a regression of this session's fix. **This needs Bean's
  input before Wave 2** — see below.
- E2 (state-hierarchy propagation): scoped, not designed. Confirmed genuinely new scope
  (FR-41-1 addresses a narrower, different question). Confirmed real prior art to extend
  (FR-41-13's `:has(ul.sgs-nav-menu__submenu :focus-visible)` shape, swapping the trigger to
  `[aria-current="page"]`). Confirmed the precondition already holds with zero markup
  changes needed: `view.js::markCurrentPage` already stamps `aria-current="page"` on
  submenu sublinks. Five open design questions enumerated in the cluster file (selector
  shape, new visual language, hierarchy ordering, hovered-descendant variant, nesting depth)
  — none decided yet.

### Group F — mostly default-value questions, not broken mechanisms
- F1 (no opening animation): **REFUTED as "broken"** — `submenuAnimation` defaults to
  `'none'`; the fade/slide-down mechanism (with a correct reduced-motion companion) is fully
  built and previously gate-verified. No test fixture anywhere set this attribute.
- F2 (feels delayed behind the sweep): **CONFIRMED as coincidental, not sequenced** — two
  genuinely independent 300ms mechanisms (JS hover-intent debounce in `mega-disclosure.js`;
  CSS sweep transition in `nav-menu-treatments.php::sgs_nav_menu_text_sweep_css`) share the
  same duration and the same trigger event, so they resolve together and READ as sequenced,
  but there is no code dependency between them.

### Group G — 6 missing fixtures built + observed
- G1 (text-only "MENU"): renders correctly, no defect.
- G2 (icon-and-text order): **CONFIRMED structural** — icon always renders left of text; no
  code path exists to place it right (`nav-menu-markup.php::sgs_nav_menu_burger_toggle_markup()`,
  no CSS `order` override anywhere).
- G3 (custom trigger icon): renders correctly, no defect.
- G4 (burger→X morph): **CONFIRMED does not exist at all** — no JS class toggle, no CSS rule
  keyed on `aria-expanded` anywhere in the codebase.
- G5 (custom sublink marker icon): works correctly, but only after a real, separate gap was
  found: `sgs/nav-menu` must be nested as an InnerBlock INSIDE `sgs/nav-drawer` for the icon
  picker to apply via block Context — a shared `drawerRef` STRING between sibling blocks
  does NOT carry that relationship, only the open/close interactivity wiring. Two different
  "linking" mechanisms, same apparent purpose, one fails silently.
- G6 (mega-menu, both forms): bar form renders and opens correctly (live-verified). Drawer
  form is **genuinely unreachable to test** — `drawerRef` defaults to the unscoped literal
  `"sgs-nav-drawer"` in BOTH `nav-drawer/block.json` and `nav-menu/block.json`, so every
  drawer instance without an explicit unique ref collides with the site's real global
  header drawer. Confirmed live: the burger opens the WRONG drawer entirely. **This is a
  new, real, separate architectural finding**, discovered as a side effect of trying to
  test G6, not something Bean originally reported.

### Group H — CONFIRMED real defect
- H1: under `itemBorderHoverTreatment:'sweep'`, `itemBorderStyle` (dashed/dotted) has NO
  effect on the swept edge — the visible line always comes from the `::after` sweep band (a
  `linear-gradient` background, which can only ever render solid), never the real
  `border-bottom` (correctly hidden via `border-bottom-color:transparent`). Nothing gates
  `sweep` on `itemBorderStyle` at all — the clashing combination is fully reachable with no
  warning anywhere. Traced to `nav-menu-css.php::sgs_nav_menu_item_state_css()`.

### Group I — UNCONFIRMED
- I1: could not get the submenu panel to render open live within the investigation's
  budget. One partial lead surfaced (a real non-transparent 1px border token) but not
  proven as the white-lip cause. Needs a second pass.

### Group J — CONFIRMED, one root cause for all three symptoms
- J1/J2/J3: the burger label has **zero typography wiring anywhere**.
  `block.json`'s `burger` element only declares `css:width/height/color/color-gradient/`
  `background-color/background-image` — no font attribute of any kind exists, and
  `nav-menu-trigger-css.php::sgs_nav_menu_trigger_css` never emits font-size/font-family/
  text-transform. Live-measured: burger text renders at `13.3333px` / `Arial` /
  `text-transform:none` — this is literally Chrome's unstyled `<button>` default winning
  uncontested, not a misconfigured theme token.

### Group K — CONFIRMED, proven not inferred
- K1: `plugins/sgs-blocks/src/shared/nav-interactivity/store.js::unlockScroll` calls plain
  `window.scrollTo(0, y)` with no `behavior` override, while the site's global
  `core-blocks-critical.css` sets `html{scroll-behavior:smooth}`. Live frame-by-frame
  polling during a real close action shows a clean ~350ms eased climb from 0 back up to the
  pre-open scroll position, happening AFTER the drawer has already closed — exactly matching
  "jumps to top, then scrolls back down." This exact CSS-driven `scrollTo` hazard is already
  independently documented elsewhere in the codebase for other features, but this specific
  call site was never guarded against it.

### Group L — CONFIRMED partial, not full, sharing
- L1: icon-glyph resolution and colour mechanisms genuinely share the same helper functions
  between burger and close button (`sgs_nav_menu_icon_markup()`,
  `sgs_resolve_text_colour_or_gradient()`, `sgs_hover_state_rules()`). Sizing and typography
  are NOT shared — the close button already has its OWN separate hardcoded typography
  (`14px`/`600`/`uppercase`/`0.05em`, `nav-drawer/style.css:355-380`), completely distinct
  from the burger's total absence of typography styling. **A burger typography fix will
  need a deliberate, separate edit to the close button — it will not propagate
  automatically**, contrary to the assumption "fix one, both follow."

### Group M — split into two real, separate clusters (not one)
- **M1/M2/M4/M6 — one real shared root cause.** The link and caret are genuine DOM
  siblings (`nav-menu-markup.php::sgs_nav_menu_render_items`). The JS open/close action is
  ALREADY unified at the root (`data-wp-on--mouseenter` lives on
  `.sgs-nav-menu__submenu-root`) — M1's "separate trigger" framing is about VISUAL state,
  not the open/close mechanism, which already works. M2 (hover doesn't visually propagate)
  is architecturally expected to already work via the existing FR-41-13 rescue rule, but is
  **untestable as things stand** — zero fixtures anywhere set `itemColourHover` on a bar
  dropdown. M4 (chevron should use item text colour): CONFIRMED real gap — `itemColour`
  only ever emits onto `.sgs-nav-menu__link{color:...}`, which structurally cannot reach
  the sibling caret; they currently match only by coincidence. M6 (oversized chevron):
  CONFIRMED and quantified — 24×24px raw SVG vs 16px item text, a 1.5× ratio, no sizing
  relationship exists.
- **M3 — REFUTED.** The dropdown panel is NOT anchored to the caret. This was already fixed
  2026-07-31 (`mega-disclosure.js::repositionPanel`, anchors on the item root's own bounding
  rect) — live-measured on page 3487, the panel's left edge matches the item root, not the
  caret. Recommend re-confirming with Bean exactly which page/case produced this
  observation, since the code doesn't support it as currently deployed.
- **M5 — a separate, independent, real gap**, not the same cause as the above. The
  flip-on-open rotation rule is keyed to `.sgs-nav-menu__mega-trigger` (the MEGA-menu
  trigger class) — `.sgs-nav-menu__subtoggle` (the plain dropdown trigger) has ZERO
  matching selector anywhere in the codebase. Never built for this path; not a regression.
  The duration-sync half is additionally blocked on Group F (no open animation exists yet
  to sync against).

## Wave 1.5 — re-investigation after Bean's clarifications (2026-09-12)

Bean corrected Wave 1 on three points and directly challenged the depth of several
findings. Five targeted re-investigations ran (`/systematic-debugging` + real-interaction
discipline, no forced style overrides, no synthetic hover shortcuts). Full evidence:
`.claude/verify/nav-review-reinvestigate-*.md`.

### E1 (parent-hover regression) — REPRODUCED, real mechanism found, one open question left

Bean was right that it reproduces on his named fixtures. Root cause: six named fixtures
(`G14 Submenu Neg` on page 3488; `G19b`/`G19c`/`G19d`/`G20SET`/`G20UNSET` on page 3487)
never had `itemColourHover`/`itemBorderColourHover` EXPLICITLY set. Their only hover colour
comes from **WordPress core's own site-wide default** (`theme.json`'s link-hover style,
output as `:root :where(a:hover){color:var(--wp--preset--color--primary-dark)}`) — a rule
keyed on the literal `<a>` tag's own `:hover`, zero specificity by design. FR-41-13's rescue
rule only ever re-applies the block's OWN explicitly-configured colours; it has no
awareness of this ambient WP-core rule, so there's nothing rescuing it. The instant the
mouse leaves the `<a>` (even while still inside the dropdown wrapper), the ambient rule
correctly stops matching and the colour vanishes — that's the actual mechanism, not a
regression in the fix itself, but a real GAP in its scope (it never anticipated "the only
hover signal is the WP-core ambient default, not a block attribute").

**Open question for Bean:** the live "Primary" header menu (the real site nav) has an
EXPLICIT base colour rule that blocks the ambient WP default from ever applying, hover or
not — so the real header shows no hover colour change at all, before or after this bug.
Were you testing the scratch-page fixtures (where this exact bug fires) or the real live
header (where a different, separate, already-known gap — no hover signal at all — would be
what you saw)? This changes which fix Wave 2 needs to design.

**Drawer fork still untested — new blocker found, not the same one twice.** A real,
separate bug now blocks testing it: clicking the real header burger correctly flips the
Interactivity-API state (`aria-expanded="true"`), but the native `<dialog>` never actually
opens under Playwright automation (`dialog.open` stays `false`) even though calling
`showModal()` directly on the same element works fine. This is the THIRD different reason
the drawer fork has resisted automated testing across this session (Step 22/23's browser
contention, Wave 1's incomplete burger+drawer pairing, now this). Flagged, not root-caused —
needs either a real manual pass or a dedicated automation-compatibility investigation.

### M3 (dropdown panel anchors to chevron) — NOT A BUG, confirmed correct after a third look (correcting my own second wrong verdict)

This point has now been investigated three times with two different wrong verdicts along
the way — worth being precise about what actually happened, since I own both mistakes.

**Second verdict (wrong):** tested on Bean's named fixture ("G14 negative submenuLinkBg
blocks sweep", page 3488, uid `sgs-nav-menu-0f6116a0") and found `submenuAlign:"start"` vs
`submenuAlign:"center"` produced byte-identical panel positions. Concluded `submenuAlign`
was a completely dead control — grepped `includes/` (PHP) for a reader and found none, but
never checked the actual JS file that handles panel positioning.

**Third look (correct):** `mega-disclosure.js::repositionPanel` line 385 DOES read
`root.dataset.sgsNavSubmenuAlign` and branches into real start/center/end position
formulas — the grep that produced the "dead control" verdict simply missed this file. The
reason start/center looked identical on THAT specific fixture: the "Services" item sits at
the very left edge of the nav bar (x=0), so a collision-avoidance clamp in the same
function pulls any computed position back to the same edge-safe spot regardless of the
requested alignment — the difference is real but was invisible on an edge-pinned item.
Rebuilt the test with the same item positioned mid-bar (a dedicated menu with two items
before it, well clear of the edge) and got three genuinely different, correctly-computed
positions: `start` matches the link's own left edge, `center` matches the centre of the
whole item unit (link + caret combined), `end` matches the item unit's right edge. The
mechanism is coherent and works exactly as intended.

**Verdict: `submenuAlign` works correctly. Bean's original observation on this specific
point does not have a code-level cause** — three real possibilities remain, same as
before the two wrong verdicts: a stale browser cache, a different item/position than
tested here, or (most likely, given M6's separately-confirmed oversized chevron sitting
right next to a narrower link) a perception effect where the visibly large chevron reads
as "the dropdown is centred on this" even though it measurably isn't. No fix needed for
`submenuAlign` itself — closing this one.

### I1 (submenu white lip) — CONFIRMED and visually matched, on Bean's own named fixture

Bean's points 10A and 10B were the SAME fixture ("G14 negative submenuLinkBg blocks sweep")
— a connection lost when the register split his report into separate groups. Rebuilt the
exact config (`submenuLinkBg:"primary"`) and opened the panel via a real hover: the panel
ELEMENT's own background resolves to cream (`rgb(255,249,240)`, its own independent
fallback chain, unrelated to `submenuLinkBg`), while `submenuLinkBg` only fills the
INDIVIDUAL sublink rows (`rgb(230,138,149)`, pink) — not the panel's own padding box. The
panel has an 8px top/bottom padding, so that mismatched cream shows through as a band above
the first row and below the last, framing the pink rows exactly as Bean described.
Screenshot confirms an exact visual match to "pink background with a very noticeable white
lip at top and bottom." Root cause: two independently-resolved background colours (panel's
own default vs. the row-level `submenuLinkBg` override) with no mechanism keeping them in
sync, and the panel's own padding is what exposes the seam.

### B1/B2 (burger colours "worse") — confirmed no code regression; one real, separate defect surfaced

Traced one commit further back than Wave 1 reached (`f4e38d429^`, before the 4-way PHP
split). Diffed the original inline burger CSS property-by-property against current
`nav-menu-trigger-css.php` — identical resolution logic for the untouched-attributes case;
every addition since is opt-in and defaults to the old behaviour. Live-verified: today's
actual production homepage burger and a fresh untouched control both compute to the exact
same colour/size as the historical code would produce. **No regression found.**

Separately investigated whether "an invalid colour slug silently renders blank" is itself
a real defect Bean could hit for real: confirmed the actual colour-picker UI components
(`DesignTokenPicker.js`, `GradientCapableColourControl.js`) can only ever write a
currently-registered palette slug — `"secondary"` was hand-typed directly into the QC
fixture's block markup under a heading literally labelled "negative" probe, not something
reachable through normal editor use. **But this surfaced a genuinely new, separate, real
defect worth its own fix**: if a palette colour is ever renamed or deleted after a client
has already picked it for their burger, the stored (now-orphaned) slug would silently
render transparent with zero warning anywhere — `sgs_colour_value()` has no registered-slug
check at all. Not what Bean saw here, but real and worth flagging for its own fix.

### Quality-depth re-pass — 3 of 4 unconfirmed items closed with real answers

- **A1's indicator-pill wiring — CONFIRMED, not coincidence.** Two live fixtures with
  different `itemBgHover` values (`accent` vs `primary`) produced two exact, correctly
  matching indicator colours (`#f5d050` vs `#e68a95`) — a direct pass-through
  (`render.php::724-744` → `nav-menu-submenu-css.php:912-913`), not a lucky default match.
- **D1 (tinted-pink submenu bg) — no real stored value found anywhere live.** Checked raw
  stored content on the actual live header, both drawer CPT rows, and the seeding pattern —
  zero submenu-background attributes set anywhere. Corroborates: this is the deliberate
  pink RESTING TEXT default (see A3) being visually misread as a background tint, not a
  real stored colour.
- **D4 (drawer marker hover colour) — CONFIRMED, via a genuinely real interaction.** Real
  click opened the native `<dialog>`, real click expanded the native `<details>` accordion,
  a real (not synthetic) `:hover` state changed the marker from black to an exact match of
  the configured `error` token. Works correctly.
- **I1 (submenu white lip) — genuinely not reproduced, honestly reported as such rather
  than closed as "not a bug."** Two real dropdowns opened via real clicks (a forced
  high-contrast fixture and the live default header dropdown); no structural mechanism
  exists that COULD produce a top/bottom-only band (the one border rule present is
  identical on all four sides, proven by direct measurement) — so by construction it can't
  currently produce this artefact. Needs Bean to point at the exact instance/screenshot
  that showed this, since the current code has nothing in it that could cause it.

## Wave 2 implementation — DONE (2026-09-12, session end)

All well-scoped, no-decision-needed fixes are implemented, gate-verified, live-verified, and
committed to `main`:

| Commit | Covers |
|---|---|
| `fc98d531a` | A1/A2 highlight illegibility, E1 ambient hover default, M4/M2/M6 caret colour+size pairing |
| `44c661bfa` | I1 white lip fix, M5 plain-dropdown caret flip, C1 submenu-row divider (new `submenuLinkBorder*` attrs) |
| `10670bf82` | G2 icon-right ordering, G4 burger→X morph |
| `8f9b25c1d` | H1 sweep/dashed-border eligibility gate, J1-J3 burger typography wiring, D3/F1 sensible defaults, C1 item-border defaults |
| `154ef2f54` | Burger font-size/font-family inheritance companion fix (a gap `8f9b25c1d` disclosed rather than silently claimed fixed) |
| `e73c91dff` | K1 drawer-close scroll-jank fix |
| `74121a5f1` | G6 (drawerRef collision) — see below; note the commit MESSAGE covers a different, concurrently-landed feature (close-button typography/size controls) because both changes reached the same file (`nav-drawer/edit.js`) before either was committed on this shared worktree, and this code got swept in under that commit rather than its own. Content verified intact (`git show 74121a5f1 -- plugins/sgs-blocks/src/blocks/nav-drawer/edit.js`). |

**M3 — corrected to NOT A BUG** after three investigation passes (see above); no fix shipped, none needed.

**G6 (drawerRef collision) — SHIPPED (2026-09-12, commit `74121a5f1`, live-verified).** Per Bean's approval of "auto-rename silently on detected collision" (cluster5 architecture doc): `nav-drawer/edit.js` now runs a `useEffect`/`useSelect` on mount that detects (a) another `sgs/nav-drawer` block in the SAME post already resolving to this block's effective ref (renames only the later of the pair, so a header pattern's original zero-config drawer is never rewritten), and (b) this block's ref colliding with `window.sgsBlocksData.activeDrawer` (the site's real Active header drawer) when this post is NOT that drawer's own post. `block.json`'s shared default `'sgs-nav-drawer'` is untouched. Live-verified: created test page 3522 with two blank `sgs/nav-drawer` blocks, both auto-renamed to unique `sgs-nav-drawer-<clientId8>` values within one re-render (confirmed via `wp.data.select('core/block-editor')`), persisted correctly on save (`wp post get 3522` shows `drawerRef:"sgs-nav-drawer-e15946d1"` / `"sgs-nav-drawer-5ecef158"`), zero console errors. Regression check: the live homepage's real burger still opens `dialog#sgs-nav-drawer` (the unmodified default) correctly — the 9 shipped zero-config header patterns are unaffected.

**L1 — SHIPPED (2026-09-13, commits `6b50df583` + `6d9f78225`, live-verified).** Mirrored the burger typography onto the nav-drawer close button, PLUS closed a second, pre-existing editor-canvas gap found while doing it: `nav-drawer/edit.js`'s close-text span is hand-authored JSX (the block hosts editable InnerBlocks so cannot use `<ServerSideRender>` for its whole canvas, unlike `sgs/nav-menu`'s burger label, which needed no fix — its canvas is entirely SSR and already reflected PHP's CSS), so `closeFontSize`/`closeFontFamily`/`closeFontWeight`/`closeTextTransform`/`closeLetterSpacing` had real frontend behaviour via `sgs_typography_css_rule()` but zero editor-canvas effect. Added `typographyPreviewStyle()` (`plugins/sgs-blocks/src/utils/typography-preview.js`), a desktop/base-only JS mirror of the PHP helper, applied to both close-text render paths (text-swap and icon-and-text); `closeTextTransform`'s per-`closeStyle` default (uppercase for text-swap, none for icon-and-text) is resolved in JS the same way `render.php` resolves it, so an untouched instance's canvas now matches its frontend. First deploy surfaced a real bug in the mirror itself (`closeFontSize`'s block.json default is the STRING `"14"`, not a JS number — PHP's `is_numeric()` treats it as numeric via its modern flat-spec path, but the JS mirror's `typeof === 'number'` check missed the string shape and silently dropped the desktop font-size); fixed with an `isNumericLike()` helper and re-verified. Live-verified in the block editor (post 3500, `sgs/nav-drawer`, Show as = "Close" text): untouched instance now renders 14px/600/uppercase/0.05em (letter-spacing 0.7px at 14px) in-canvas, matching the frontend default exactly; changing Font size to 32 in the inspector updated the canvas computed style immediately (32px, letter-spacing recalculated to 1.6px) with no save/reload. Proposal reference: `.claude/reports/2026-09-12-nav-menu-wave2-cluster4-burger-solutions.md`.

**Orphaned palette slug — SHIPPED (2026-09-12, commit `7c0d11a50`, live-verified).** Per Bean's
sign-off on the `currentColor` fallback (cluster5 architecture doc): `sgs_colour_value()`
(`helpers-tokens.php`) and its JS mirror `colourVar()` (`src/utils/tokens.js`) now emit
`var(--wp--preset--color--{slug}, currentColor)` instead of an unresolved `var()` with no
fallback — kept in parity via the existing JS/PHP contract gate
(`check-colour-preview-resolver.js`, updated to the new expected output). Added
`wp sgs audit-colour-tokens` (`class-sgs-colour-audit-cli-commands.php`) as the discovery
half — walks every post's parsed blocks against a DB-generated snapshot of colour-typed
attributes (790 rows/66 blocks) and reports any stored slug no longer present in the live
palette. Live-verified: the `burgerBg:"secondary"` fixture (post 3488) now computes
`background-color` to the element's own resolved text colour instead of `rgba(0,0,0,0)`,
and `wp sgs audit-colour-tokens` lists that exact fixture (post 3488, `sgs/nav-menu`,
`burgerBg`, `secondary`) plus 11 other orphaned instances discovered live on the canary.
Known minor limitation: a gradient string (`linear-gradient(...)`) stored in a colour-typed
attribute is misclassified as an orphaned slug rather than excluded — cosmetic false
positive in the audit report only, does not affect the render-time fallback fix.

## E1 (drawer symptoms 2/3) + E2 — SHIPPED (2026-09-12, commit `daa87be8d`)

Following the `.claude/verify/nav-review-e1-drawer-submenu-investigation.md` root-cause pass
(three E1-drawer symptoms) and Bean's simplified E2 design (reuse the LITERAL existing
Current-page declarations on the ancestor, no new visual language):

- **E1 Symptom 1 (submenu hover has no default text-colour)** — investigated and NOT
  implemented as originally briefed. FR-41-36 (owner-ruled, locked 2026-09-11) explicitly
  states the desktop submenu's Hover state is bg-tint-only (`accent-light`), with text
  colour staying at its Normal default — confirmed independently by `block.json`'s own
  comment on `submenuLinkBgHover`. Mirroring the item family's `accent` hover-text default
  onto the submenu would have directly violated that locked decision. Flagged back to the
  coordinator rather than shipped; needs Bean's explicit call if the locked scheme itself is
  to change.
- **E1 Symptom 2 (current beats hover on submenu rows, backwards from the item family)** —
  FIXED. The `[aria-current="page"]` colour rule now emits before the Hover rule in
  `nav-menu-submenu-css.php`, matching `nav-menu-css.php`'s own documented tie-break order.
- **E1 Symptom 3 (drawer submenu colour defaults predate this session's decisions)** —
  PARTIALLY addressed. The panel's own background fallback now resolves to the FR-41-36
  `surface` token instead of an ad-hoc `color-mix` tint. The sublink text `color:inherit`
  override was investigated and deliberately KEPT (not changed): it already matches the
  bar's own item-text default (both currently rely on ambient inheritance, not an explicit
  token), and this file has no access to the drawer's own `drawerBg` attribute to safely
  resolve a literal token instead — implementing FR-41-36's full `primary` token everywhere
  is separate, larger, cross-file future work the spec itself marks "not yet built."
- **E2 (state-hierarchy propagation)** — SHIPPED, per Bean's simplified design (no new
  visual language). A parent nav item now shows the literal existing Current-page
  declarations (text colour / background / border-colour / font-weight) when its own
  submenu contains the current page, via a `:has()` selector extending the FR-41-13
  pattern, guarded with `:not(:hover):not(:focus-visible)` so a direct hover on the parent
  always wins (verified by specificity: the propagation selector out-specifies plain
  `:hover`, so the guard — not source order — is what makes hover win). The submenu
  current-colour fallback token was also softened from `primary-dark` to `primary` (not
  FR-41-36-locked) so propagation doesn't paint a heavier-than-normal colour in more places.

Not live-verified this pass: `run-gates.py --tier fast` was blocked by unrelated,
genuinely in-progress uncommitted work on `sgs/nav-drawer` (another session's WIP — see
`C:/Users/Bean/.claude/memory/learning/2026-09-12-payload-must-not-bundle-a-siblings-unsigned-off-work.md`
for the standing rule this follows). Source changes are `php -l` syntax-clean and committed
to `main`, but not yet built/deployed/screenshot-verified on the live canary.

**Left running in the background at session end, status unknown:** none — all 6 Wave 2 implementation agents either completed and committed, or (L1) were never dispatched. Nothing is mid-flight.

**Process note captured as a durable lesson:** two implementation agents each bundled a sibling agent's uncommitted work into their own deploy `--payload` rather than stopping and reporting back, twice in this session. See `C:/Users/Bean/.claude/memory/learning/2026-09-12-payload-must-not-bundle-a-siblings-unsigned-off-work.md`. No harm resulted (both sibling changes were correct and got committed properly once the coordinator intervened), but future multi-agent dispatches on this project must state the "stop and report, don't bundle" rule explicitly in each agent's brief.

## Investigation status

**Wave 1 + 1.5 + direct follow-up complete.** I1 is fully confirmed above, found on Bean's
own exact named fixture once tested there directly instead of a fresh/production-only
repro. M3 went through two wrong verdicts before landing on the correct one: it is NOT a
bug — `submenuAlign` works correctly, confirmed with a mid-bar test fixture after the
edge-pinned test fixture masked the real (working) behaviour. **No Wave 2 fix needed for
M3** — the Cluster 2 solution-design proposal covering M3 is superseded by this finding
and should not be built. Only one genuine open question remains for Bean, the rest is
ready for Wave 2 (solution design):

1. **E1** — which instance were you testing (scratch-page fixtures vs the real live
   header)? Determines whether Wave 2 designs a fix for "no explicit hover colour set,
   only the WP-core ambient default" or a different, already-known gap. (Note: given M3 and
   I1 both turned out to be real bugs on Bean's named fixtures once tested correctly, E1
   very likely reproduces on the scratch pages exactly as reported too — this is now a
   confidence check, not a live doubt.)

The confirmed real defects list is now materially larger and more precise than the
original Wave 1 pass. Two Wave 1.5 verdicts ("M3 refuted", "I1 not reproduced") were
themselves wrong — both traced to testing the wrong location, not to Bean's report being
mistaken. Lesson for this session: when a fixture is NAMED, test that exact fixture before
concluding anything, even under time pressure to reach a verdict quickly.
