---
doc_type: spec
spec_id: 41
spec_version: 0.4.8
status: draft
owner: framework
date: 2026-09-11
companions:
  - 36-SGS-NAVIGATION-SYSTEM.md (the governing nav spec — FR-36-4's "distinct hover+focus states" and FR-36-11's WCAG floor; FR-36-28 is the pointer back. Active-trail is NOT satisfied here — see FR-41-20)
  - 35-BLOCK-INSPECTOR-UX-STANDARD.md (Part L control completeness; PART O control-type contract)
  - 32-COMPONENT-STYLING-TOKEN-CONTRACT.md (no inline `style=` property declarations; scoped `<style>` only)
derived_from:
  - The 2026-09-10 owner design conversation + the two adversarial-council rounds that followed it
  - C:/Users/Bean/.claude/memory/research/2026-09-10-nav-drawer-colour-architecture-industry-standard.md
    (background only — its MD3 state-layer recommendation is NOT adopted here; see §1.4)
  - The 2026-09-10 owner /brain-dump rejecting the v0.3.0 artifact as "horrendous" — 13 numbered
    points, all resolved in 0.4.0 (§13, §9 rewrite, revision history)
  - The 2026-09-10 round-3 adversarial council (10 confirmed Tier 1/Tier 2 defects), the owner's
    universal colour-reuse rule, his /research-check on underline-vs-border, and his border-colour
    placement ruling — all folded into 0.4.1 as ONE harmonised design, not a stack of patches
  - .claude/plans/2026-09-10-fx-selective-effect-offering-design-gate.md (the future work
    FR-41-32 defers to)
  - The 2026-09-10 owner correction to 0.4.1 — "keep all, just don't make underline this
    central control that you initially were doing and treating it as the divider" — folded in
    as 0.4.2 (the `showHover` trio is restored on both targets; the underline is reframed as an
    optional secondary decoration, never the block's primary WCAG signal)
  - The 2026-09-11 focused adversarial council on 0.4.2 (14 findings — 2 fatal, 2 real,
    8 should-fix, 2 missing gates), all folded in as 0.4.3. Every claim it made about
    existing code was re-verified against the real files before the fix was written; two
    of its premises were partly wrong and are corrected in place (see the 0.4.3 revision
    entry)
  - The 2026-09-11 technical-correctness review of 0.4.3 against the real codebase (6 must-fix,
    5 should-fix, 3 missing items), all folded in as 0.4.4. Every finding was re-verified
    against `render.php` / `style.css` / `block.json` / `SgsBorderControl.js` /
    `plugins/sgs-blocks/assets/css/fx-magnet.css` before its fix was written; ONE of its premises turned out
    false on the code and is corrected in place rather than implemented (see the 0.4.4
    revision entry, "the one premise that did not survive verification")
  - The 2026-09-11 technical re-review of 0.4.4 by a reviewer who read `render.php` and
    `style.css` directly (2 further uncensused rules, a census SCOPE gap covering a whole
    second file, a markdown table break, and an apparent accounting gap on the bar's panel
    rule), all folded in as 0.4.5. FR-41-15's census was re-derived from scratch with a
    STATEMENT-AWARE scan over both files rather than patched with the named rows — see the
    0.4.5 revision entry for the exact method and why the line-anchored grep the spec itself
    published could never have found them
  - The 2026-09-11 owner decisions on the four remaining §12 open items, folded in as 0.4.6:
    backfill the responsive font-size tiers (§8.4a — the RULING'S INTENT is adopted, its stated
    PREMISE was checked against the live files and disproved, so no attribute is declared and the
    deliverable is the gate); keep the 8px item radius (§8.4); BUILD the migration-notice
    mechanism (FR-41-34); BUILD the ungated-paint detector, framework-wide (FR-41-35). Plus two
    stale-doc items removed from §12 because they were corrected at source the same day
---

⛔ **Renumbering discipline (read before editing this file further).** Every existing `FR-41-N`
ID in this document is a live citation elsewhere (converter, DB, other specs) — per this
project's own captured lesson (`renumbering-breaks-every-pointer-that-lives-elsewhere`), NONE of
them are renumbered in this revision. New requirements from the 0.4.0 pass are appended as
**FR-41-23** onward; 0.4.1's are **FR-41-31 … FR-41-33**; 0.4.6's are **FR-41-34 … FR-41-35**
(the first new IDs since 0.4.1 — 0.4.2 through 0.4.5 added none). Where a decision changes or folds an
EARLIER FR's behaviour, that earlier FR is annotated in place (`⚑ SUPERSEDED IN PART BY FR-41-2x`)
rather than rewritten — its original text stays, for anyone who already cites it, with the new
ruling layered on top.

⚠ **0.4.1 is a HARMONISATION pass, not another amendment layer.** Where 0.4.0 left two sections
disagreeing, 0.4.1 resolves the disagreement at BOTH ends rather than annotating one of them. Read
any FR together with the §8 attribute tables and §9 inspector layout: those three surfaces are now
mutually consistent, and a future edit that changes one must change all three.

⚠ **0.4.2 is a SCOPED CORRECTION to one 0.4.1 decision — it introduces no new FR IDs.** It restores
the six `showHover` attributes 0.4.1 withdrew and restores FR-41-21's block-private PHP emitter, and
it reframes what the hover underline MEANS (an optional secondary decoration, never the block's
primary non-colour signal and never an alternative implementation of the divider). Nothing else from
0.4.1 is revisited: the colour-reuse rule, the border split (FR-41-33), the burger magnet
(FR-41-31), the cursor-field non-offer (FR-41-32), the Menu Button rename and the round-3 council
fixes all stand exactly as written.

⚠ **0.4.3 is a DEFECT-CLOSURE pass — it introduces no new FR IDs and reverses no 0.4.2 decision.**
It closes two fatal gaps (a Sweep predicate that existed only in the UI and never in the emitter;
a live hardcoded drawer hover-background rule that was absent from FR-41-15's census and would have
destroyed the Sweep gradient), corrects two manifest/UX gaps, and adds the emitter-side, gate-side
and help-text detail eight smaller findings were missing. Every design decision from 0.4.0–0.4.2
stands.

⚠ **0.4.4 is a SECOND DEFECT-CLOSURE pass, on the mechanisms 0.4.3 itself introduced — no new FR
IDs, no reversed decision.** 0.4.3 closed two fatal gaps and, in closing them, created four more:
a "write the predicate once in PHP" rule that the React inspector cannot obey (FR-41-26 now names a
DECLARATIVE single source both surfaces read); a Sweep condition-1 attribute list that says "in ANY
state" while listing only RESTING backgrounds (now covers every state, including the two live
hover-state backgrounds it missed); a census re-derived with a LINE-RANGE grep, which let a fifth
unconditional hover-background rule through on the sublink (now found, and the methodology is
re-scoped to the defect SHAPE across the whole file); and a Sweep-eligibility "always passes" claim
resting on a requirement that does not cover the Hover and Current fills (now a normative rule of
its own). Plus the pill-colour migration's unset-source case, which shipped an invisible Highlight
to the commonest real client state. Every design decision from 0.4.0–0.4.3 stands.

⚠ **0.4.5 is a THIRD DEFECT-CLOSURE pass, and it is entirely FR-41-15's census — no new FR IDs, no
reversed decision.** That census has now been found incomplete on three consecutive reviews (0.4.3
added three rules, 0.4.4 added a fourth, 0.4.5 adds four more and a whole second file), so 0.4.5
does not patch in the named rows. **It re-derives the census from zero with a different, stronger
method** — a statement-aware scan that joins multi-line PHP concatenations before testing them, run
over `render.php` AND `style.css` — and publishes that script's output as the census. The reason the
previous passes kept missing rules is now nameable and is fixed at the tool, not at the table: the
grep the spec itself published is **line-anchored**, and the two featured-sub-item rules 0.4.4
missed are **multi-line concatenations whose `background:` declaration sits on a different physical
line from its `$css .=`**, so that grep could never have matched them no matter how many times it
was re-run. Every design decision from 0.4.0–0.4.4 stands.

⚠ **0.4.6 is a DECISION-CLOSURE pass, not a defect-closure one — the first revision since 0.4.1 to
add FR IDs.** The owner ruled on the four remaining §12 open items and all four are folded in as
settled requirements: the responsive font-size tiers (§8.4a), the `itemBorderRadius` default
(§8.4), the migration-notice mechanism (**FR-41-34**) and the ungated-paint detector
(**FR-41-35**, framework-wide). Two further §12 items were stale-doc errors, corrected at source
the same day and removed from the list. §12 is down from 13 items to 7. Every design decision from
0.4.0–0.4.5 stands; nothing is renumbered.

⛔ **One ruling's PREMISE did not survive verification, and the body records the correction rather
than the narrative (§8.4a).** The font-size ruling rested on `itemFontSizeTablet` / `…Mobile` being
"silently inert". Read against `block.json`, `TypographyControls.js` and `helpers-typography.php`,
`itemFontSize` is an object-typed TIER attribute — both the control and the emitter take the tiered
branch, the flat keys are neither written nor read, and the tiers already work end to end.
Declaring them would have added two dead attributes. **The ruling's INTENT — that the tiers must
provably persist and render — is adopted in full as gate G20, which is the thing that genuinely did
not exist.** This follows the same discipline as 0.4.4's refused flip: verify the premise, keep the
intent, correct the mechanism, say so.

⛔ **Correction-note bloat lives in the Revision history section and nowhere else.** The body
states what the design IS. It does not narrate what an earlier revision got wrong.

# Spec 41 — `sgs/nav-menu` Colour, State + Control System

## Why this is its own numbered spec

`.claude/specs/README.md` is THE roster: one spec per file, each carrying `doc_type: spec`, a
numeric `spec_id`, and a `status` from its enum. Requirement IDs are `FR-{spec_id}-{N}`.

Spec 36 is 1,600 lines and carries a measured prohibition on renumbering (**1,530 `FR-36-*`
citations across 164 files**, Spec 36 §1b). Folding a full control-surface design into it would
push the single canonical nav doc past readability for a cleanly separable concern. **Spec 36
keeps the requirement; Spec 41 owns the mechanism.** Same split as the settled Spec 32 ↔ Spec 35
pairing recorded in `README.md`.

**Why 41 and not 39.** 39 is unclaimed on paper — D1008 retired "Spec 39" as a concept — but
`decisions.md` carries many live references to "Spec 39" meaning that retired cloning-pipeline
concept, so reusing the number would make every one of them ambiguous. 41 sits after the current
ceiling (40), which is where a new spec belongs.

---

## 0. One-liner + plain English

`sgs/nav-menu` gains a complete, client-editable control surface: **three colour states — Normal,
Hover, Current — on every colour that has states**, all of them side by side in ONE Colour panel
(border colour included), each Hover swatch paired with a **hover-treatment selector** that changes
*how* that one colour is applied rather than adding a second colour; a **3-state per-side item
border**; a **submenu split** (the floating panel and the links inside it are separately
controllable, in colour *and* in typography); **submenu open animation + top offset**; a **menu
button** that can be an icon, text, or both, with an operator-chosen icon and an optional magnetic
pull; and three correctness fixes that need no control at all. The `hoverStyle` pill/text/underline
chooser is **retired** — everything it did is now a direct control.

⛔ **THE COLOUR-REUSE RULE, stated once and binding on every row (owner-locked, 0.4.1).**
**One colour picker per element property.** The hover-treatment selector NEVER introduces a second
colour value — it changes HOW the existing Hover swatch's value is applied. `Swap` applies it
instantly; `Sweep` travels it across the element; `Highlight` paints it into the shared sliding
pill. All three read the SAME swatch. A treatment that needed its own colour attribute would be a
second control for one property, which is the exact pattern FR-41-7 and FR-41-23 exist to remove.

**Plain English.** Today a client can colour a nav link, and colour it again for when the mouse is
over it. They cannot colour *the page they are currently on* — that look is hard-coded. They pick
a hover "style" from a three-way dropdown instead of just setting the colours they want. They
cannot control the line between menu items, cannot give dropdown links their own type size,
cannot choose how the dropdown appears or how far below the bar it sits, cannot turn the burger
into a word instead of an icon, and if they hover over an item's dropdown the parent item goes
back to looking un-hovered while its own dropdown is still open, which looks broken. This spec
fixes all of it — and does so **without changing a single control on any other block in the
framework**, because it needs no new shared component at all.

---

## 0a. Build status — what is ACTUALLY BUILT vs what is still planned

⚠ **This is a MID-BUILD spec. Read this section before reading any FR as a description of shipped
code.** Most of the build has landed; a named minority is written and unbuilt. ⛔ **Do not cache a
step count, a percentage or a D-number here — that drifts.** Step-level live status is
single-sourced to **`.claude/plans/phase-nav-menu-colour-state.md`**; project-wide status to
`.claude/LEDGER.md`.

### 0a.1 ⛔ `render.php` is NO LONGER the block's single emitter — it is SIX PHP files

**This invalidates the *file* half of every "verified in `render.php`" citation written before
2026-09-11; it does not invalidate the *findings*, which were re-verified in their new homes.** The
plan's step 8 named a four-file split; the executed split (steps 8 + 15) is **six**. Verify the
roster live — `ls plugins/sgs-blocks/includes/nav-menu-*.php` — never from a list cached in prose:

| File | Owns (cite by `path::symbol`) |
|---|---|
| `plugins/sgs-blocks/src/blocks/nav-menu/render.php` | entry + `SGS_Nav_Menu_Bar_Renderer` (constructor, `flatten()`, `from_link()`, `from_page_list()`), menu resolution, the treatment resolution call, the indicator/magnet `data-` flags, `<style>` assembly |
| `plugins/sgs-blocks/includes/nav-menu-markup.php` | `sgs_nav_menu_render_items()`, `sgs_nav_menu_render_items_drawer()`, `sgs_nav_menu_burger_toggle_markup()` |
| `plugins/sgs-blocks/includes/nav-menu-css.php` | `sgs_nav_menu_item_state_css()` — item typography, nav-container colour, the item text / background / border three-state emission with its paired treatments, the border-sweep band, the featured BAR item |
| `plugins/sgs-blocks/includes/nav-menu-treatments.php` | `sgs_nav_menu_sweep_eligible()`, the treatment resolution, the shared glyph-sweep emitter, `sgs_nav_menu_typography_hover_rule()` (FR-41-21's block-private emitter), IconPicker-object → SVG resolution |
| `plugins/sgs-blocks/includes/nav-menu-trigger-css.php` | `sgs_nav_menu_trigger_css()` — the Menu Button's icon/text colour + glyph sweep, its resting and hover background, and the size rule that stops being a fixed square once the button carries a word |
| `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` | `sgs_nav_menu_submenu_css()` — collapse-point switch, dropdown/mega positioning + the FR-41-11 bridge, the submenu LINK's three-state family and its typography, the drawer fork's overrides, the sliding indicator, the root box, custom CSS |

⛔ **All five `plugins/sgs-blocks/includes/nav-menu-*.php` files are `require_once`'d PER-INSTANCE from `render.php`,
not bootstrap-loaded** (the `sgs/product-card` `plugins/sgs-blocks/includes/product-card-builtin-render.php`
precedent). A future cross-block caller must require the file itself; its functions are in scope
only after nav-menu has rendered once on that page load.

⚠ **`edit.js` is split the same way** into the sibling `.js` files in the block folder
(`ItemsPanel.js`, `BurgerPanel.js`, `DropdownStylePanel.js`, `DropdownSettingsPanel.js`,
`TypographyPanel.js`, `SubmenuItemsPanel.js`, `ColourRowExtras.js`, `NavMenuNotices.js` …).
⛔ **`colourRows` deliberately STAYS in `edit.js`** — `plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js`
resolves a row's state count only from a shape it can see in that file or in `plugins/sgs-blocks/src/components/`.

### 0a.2 Built and verified in the tree

FR-41-2 · FR-41-3 (including FR-41-8's additive `suppress_edges`, live at
`plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_border_states_css`) · FR-41-4 · FR-41-5 / FR-41-27
(`plugins/sgs-blocks/src/blocks/nav-menu/DropdownSettingsPanel.js`, General-tab **Accessibility** panel) · FR-41-6 ·
FR-41-7 · FR-41-8 · FR-41-9 · FR-41-10 · FR-41-11 · FR-41-12 (BOTH sides — the Menu Button and the
`sgs/nav-drawer` close mirror) · **FR-41-15 (census FULLY EXECUTED — see its STATUS note)** ·
FR-41-16 · FR-41-21 · FR-41-22 · FR-41-23 · FR-41-24 · FR-41-25 · FR-41-26 (including
`plugins/sgs-blocks/src/blocks/nav-menu/block.json::supports.sgs.sweepEligibility` and its two mechanical readers) · FR-41-28 · FR-41-29 ·
FR-41-30 · FR-41-31 · FR-41-33 · FR-41-35
(`plugins/sgs-blocks/scripts/check-ungated-paint-rules.py`).

### 0a.3 Written but NOT built — each with the command that proves it

| Not built | Proof |
|---|---|
| **FR-41-13** — the four "parent stays in its Hover state while its own dropdown is hovered" rules (mouse + keyboard, per fork) | `grep -rn "submenu-root:hover\|accordion-row:hover\|submenu-root:has\|accordion-row:has" plugins/sgs-blocks/includes/nav-menu-*.php plugins/sgs-blocks/src/blocks/nav-menu/` returns nothing |
| **FR-41-34** — the migration notice (`_sgs_nav_menu_migration_notice` post meta + the dismissible `Notice`) | `grep -rn "_sgs_nav_menu_migration_notice" plugins/sgs-blocks/` returns nothing |
| **G5a's stored-content migration**, and every live-canary gate (G6–G10, G13–G20c) | post-deploy work; nothing is deployed to the canary from this phase yet |
| **FR-41-35's WARN → HARD flip (G20c(f))** | the detector ships WARN-ONLY until the flip step runs |
| **FR-41-18** | explicitly non-blocking follow-up — unchanged, still not built |
| **FR-41-20** (active-trail) | out of scope by design — unchanged, still not built |
| **FR-41-36** — the locked default colour scheme (item/submenu/drawer states) | design decision only, ruled 2026-09-11; `grep -rn "accent-light" plugins/sgs-blocks/src/blocks/nav-menu/block.json` returns nothing yet |

✅ **One design question inside a BUILT FR was OPEN and is now RESOLVED (2026-09-11, same day):**
the **sublink marker colour row** (FR-41-30(b) / §9.8). It is still BUILT Normal-only in the tree —
the owner's newer direction (reveal keyed on the icon choice, not the colour value; full
Hover/Current + gradient once revealed) is ruled and recorded, but **not yet built**. See
FR-41-30(b)'s ✅ RESOLVED block (beneath its ⚠ OPEN note, kept as history) and §12 item 8.

### 0a.4 Adversarial council review (2026-09-11) — verdict: GO, conditional

**Five personas** (design-systems architect, accessibility, Gutenberg internals, maintainability /
blast-radius, CSS-pattern cynic) reviewed the spec as built. Per-persona grades: design-systems
architect **B+**, accessibility **C-**, Gutenberg internals **B+**, maintainability/blast-radius
**A-**, CSS-pattern cynic **B-**.

**Verdict: GO, conditional on two fixes landing before anything ships to a real client site** — not
before Wave C work starts (`.claude/plans/phase-nav-menu-colour-state.md`'s Wave C, steps 18-27, may
proceed unblocked):

**(a) The submenu panel's `box-shadow` is clipped invisible.** Census #9
(§8's fate table, `{uid} .sgs-nav-menu__submenu{…box-shadow…}`) emits a real, attribute-driven
shadow — but the panel selector it paints (`.sgs-nav-menu__submenu`) sits *inside*
`.sgs-nav-menu__submenu-wrap` (FR-41-1's DOM table), and that wrapper carries `overflow-y:auto`, which
clips any shadow the inner element casts. **Needs the shadow moved to the non-clipping wrapper
element, or an inner-scroller/outer-shadow-box split, before deploy.** Not yet fixed — a Wave C /
pre-deploy item, not a design question.

**(b) CONFIRMED CORRECT, no action needed — recorded so it is not re-litigated:** the previously
suspected parallel `fillRow3`/`textRow3`/`borderRow3` builder approach was checked directly against
the real files by two independent council reviewers. **FR-41-2(a) already ships the additive
`current`/`currentGradient` extension on the existing `fillRow`/`textRow`, exactly as the spec
states — no parallel builder family exists.**

**Also confirmed by the council, no fixes needed:**
- All three `colourExemptions` entries in `block.json` are currently accurate.
- The `hideExtensions` claim (§1.2) is confirmed accurate.
- The §12 "border-row-helper" tension is resolved: no `borderRow.js` exists, and per this project's
  own CLAUDE.md rule, none should be built.
- **FR-41-13** (the parent-stays-hovered fix) is **reconfirmed genuinely unbuilt** by live grep — it
  is already correctly scheduled as a Wave C item (§0a.3). No plan change needed; this is the council
  independently re-verifying the same finding, not a new one.

---

## 1. Scope

### 1.1 In scope

The `sgs/nav-menu` inspector, its `block.json` manifest, its rendered CSS, **three** additive
backwards-compatible shared-component/helper extensions — `SgsColourPanel` row sub-headings
(FR-41-16), `SgsBorderControl`'s `showColour` prop (FR-41-33), and an optional third state on
`sgs_emit_state_colour_css()` / `sgs_fill_decls()` / `sgs_text_decls()` (FR-41-3) — plus one CSS
rule and one trio of `data-` attributes reusing the framework's existing `fx-magnet` runtime, and a
**two-line, value-preserving addition to `plugins/sgs-blocks/assets/css/fx-magnet.css`** exposing
its own transition as `--sgs-magnet-transition` so nav-menu reads it rather than retyping it
(FR-41-31). One cross-block companion requirement lands on `sgs/nav-drawer` and is named as such
(FR-41-12).

⚠ **All THREE shared-component extensions AND the shared-stylesheet addition are design-gated
(project rule 7)** and each is the minimum shape that does the job: every existing caller renders
byte-identically by default (§11 G1).

### 1.2 Out of scope — named explicitly so nobody re-opens them

| Not in scope | Why |
|---|---|
| The **featured item-flag** mechanism (`featuredColour` / `featuredBg` / `featuredColourHover` / `featuredBgHover` and their gradient siblings) | A separate, working, per-item flag with its own WCAG-contrast resolution (Spec 36 FR-36-4, D351). Nothing here changes it, with ONE named exception: the `::after` suppression rule in FR-41-4 item 7. |
| **Mega menu** | Owned by the separate mega-menu builder. Its panel, its colours, its controls are untouched. |
| **Sticky / scrolled** colour states | Astra Pro duplicates its whole colour set for the scrolled header. Owner-rejected for SGS: it doubles the control count for a state the header (Spec 37) already owns via its own `scrolled` state. |
| A **device-visibility** panel | The universal `blocks/extensions/responsive-visibility.js` and `conditional-visibility.js` extensions already attach to every `sgs/*` block, and `sgs/nav-menu` does **not** opt out — verified in `plugins/sgs-blocks/src/blocks/nav-menu/block.json::supports.sgs.hideExtensions`, which lists only `clickEffects`, `parallax`, `spacing`. Do not build a second visibility surface. |
| A **fourth colour state** | Exactly three, everywhere: Normal, Hover, Current. |
| **Active-trail** (a parent lighting up because a *descendant* page is current) | Not built, and this spec does not build it. See FR-41-20. |
| **A hover trio on TYPOGRAPHY** — ⚑ **NO LONGER OUT OF SCOPE (0.4.2).** `TypographyControls`' `showHover` flag IS adopted on both targets, and all six attributes are declared. See FR-41-6 and FR-41-21. | *(row kept as a tombstone so a 0.4.1 reader does not conclude the capability is still refused)* |
| **A hover trio on the CURRENT state** (`itemTextDecorationCurrent` and any `…TransformCurrent` / `…WeightCurrent` beyond `itemFontWeightCurrent`) | Not offered. `TypographyControls` models resting + hover only, so a Current trio has no shared control at all, and Current already carries its own non-colour signal (`itemFontWeightCurrent`, FR-41-6). |
| **`itemBorderColourGradient`** (a gradient ring on the ITEM border) | Cut on a pseudo-element budget, not on merit — `sgs_border_states_css()`'s ring path needs `::before`, and `::before` on `.sgs-nav-menu__link` already renders the item background. See FR-41-7. The submenu PANEL border keeps its gradient (`submenuBorderColourGradient`) because nothing competes for `.sgs-nav-menu__submenu::before`. |
| **Cursor-reactive field** (and the other eight `motionSurface` effects) | Structurally eligible, deliberately not offered — the only current mechanism would bundle eight unrelated effects onto a functional navigation element. Revisit after the design gate at `.claude/plans/2026-09-10-fx-selective-effect-offering-design-gate.md` lands. See FR-41-32. |

### 1.3 The three states — definition and vocabulary

| State | Means | Selector | Set by |
|---|---|---|---|
| **Normal** | Resting | the base selector | — |
| **Hover** | Pointer over it, or keyboard-focused | `:hover` (touch-guarded) + `:focus-visible` (never guarded) | pointer / keyboard |
| **Current** | *This is the page you are on* | `[aria-current="page"]` | `plugins/sgs-blocks/src/blocks/nav-menu/view.js::markCurrentPage` |

⛔ **The third state is named `current`. It is the framework's OWN existing vocabulary, not a new
word.** `plugins/sgs-blocks/scripts/consistency/golden-controls.json::_meta.stateVocabulary.real`
declares exactly three real states — `hover`, `current`, `scrolled` — and its `current` entry reads
`cssRealisation: '[aria-selected="true"], [aria-current], .is-active'` with the note *"Unifies the
tabs case AND the nav case in one state. RENAMED from `selected` 2026-08-19 (D676 ruled it, D678
landed it)"*. That rename cost a 9-step derived-column migration ending in a shared-DB reseed.
Every attribute, every row-descriptor state key, every PHP variable, every `css_state` value and
every sentence in this spec uses `current` — never `Active`, never `selected`.

⛔ **REUSE the existing `aria-current` mechanism — do not re-derive it.**
`plugins/sgs-blocks/src/blocks/nav-menu/view.js::markCurrentPage` normalises `window.location.pathname` and stamps `aria-current="page"`
on both `.sgs-nav-menu__link[data-sgs-nav-path]` and `.sgs-nav-menu__sublink[data-sgs-nav-path]`,
runs per nav root (so the bar and the drawer's own instance are both covered), and re-runs on
bfcache `pageshow`. It is deliberately **client-side**, because Spec 36 FR-36-11 records that
LiteSpeed — this stack's confirmed cache layer — would otherwise serve one page's answer on every
page. Nothing about that changes here.

### 1.4 Relationship to the 2026-09-10 colour-architecture research

`~/.claude/memory/research/2026-09-10-nav-drawer-colour-architecture-industry-standard.md`
recommends an MD3-style **derived state layer** (hover = content colour at 8% opacity over the real
background). **That recommendation is SUPERSEDED for this spec and is not adopted.** This design
gives the operator three explicit, authorable colours per row plus the existing warn-only contrast
check (FR-41-17) — the shadcn-style "paired tokens authored together" shape. The research file's
other findings (the `<details>` roving-nav gap; the 1.4.11 hover-background exemption not rescuing
text-colour failures) remain live reading.

---

## 2. The shared-mechanism strategy

### FR-41-1 — Every stateful control in this spec targets the LINK. Nothing targets the `<li>`.

**This is the single load-bearing architectural decision, and it removes three separate hazards at
once.**

`plugins/sgs-blocks/src/blocks/nav-menu/view.js::markCurrentPage` stamps `aria-current="page"` on `.sgs-nav-menu__link` and
`.sgs-nav-menu__sublink` — **the anchors**. It never stamps the `<li>` item, and it never stamps a
drawer ancestor. A Current-state rule keyed on the `<li>` therefore matches nothing and renders
silently as no change at all.

**The rule: text colour, background, border and the hover animation all apply to the link
element.** The link is the padded, full-height, focusable target in both the flat bar and the
drawer's vertical list, so a border on it spans the visible row exactly as an operator expects.

Three consequences, all good:

1. **`:has()` is needed nowhere for the Current state.** No `.item:has(> .link[aria-current])`
   construction, no specificity recompute per property.
2. **`:focus-visible` binds correctly by construction.** The link is focusable; a `<li>` is not.
   No `:focus-within`-on-the-item workaround is needed anywhere in this spec.
3. **Specificity is uniform across all three states**, which makes the source-order rule below a
   single rule rather than a per-property judgement — see FR-41-3.

The one thing this shape cannot express is a border spanning the `<li>`'s own margin box beyond the
link. That is not wanted: the link fills the row, and a rule painting outside it would leak past
the visible target.

**The DOM shape this rule operates on — read it before writing any selector.** Verified in
`plugins/sgs-blocks/src/blocks/nav-menu/render.php`; the two forks are structurally different and
no single descendant selector covers both:

| Fork | Emitted by | Structure |
|---|---|---|
| **Bar** (dropdown) | `plugins/sgs-blocks/includes/nav-menu-markup.php::sgs_nav_menu_render_items` | `li.sgs-nav-menu__item--has-submenu` › `div.sgs-nav-menu__submenu-root` › **`.sgs-nav-menu__link`** (an `<a>` with a sibling `button.sgs-nav-menu__subtoggle`, or a `<button>` carrying both classes) + `div.sgs-nav-menu__submenu-wrap` › `ul.sgs-nav-menu__submenu` › `li.sgs-nav-menu__subitem` › `a.sgs-nav-menu__sublink` |
| **Drawer** (accordion / drill-down) | `plugins/sgs-blocks/includes/nav-menu-markup.php::sgs_nav_menu_render_items_drawer` | `li.sgs-nav-menu__item--has-submenu` › `div.sgs-nav-menu__accordion-row` › **`.sgs-nav-menu__link`** (an `<a>`, or a `<span class="…__link …__link--label">` when the parent has no URL) + `details.sgs-nav-menu__accordion` › `summary.sgs-nav-menu__accordion-summary` + `ul.sgs-nav-menu__submenu[data-sgs-drill-panel]` › `a.sgs-nav-menu__sublink` |

Three facts that follow, all load-bearing:

- **The link is never a direct child of the `<li>` on a submenu-bearing item.** It is a child of
  the fork's wrapper `<div>`. `li > .sgs-nav-menu__link` matches nothing there.
- **`.sgs-nav-menu__submenu-wrap` is BAR-ONLY.** The drawer has no element with that class at all.
- **`ul.sgs-nav-menu__submenu` is the ONE class present in both forks**, which is why every rule
  that needs to say "inside the open panel" keys on it.

### FR-41-36 — Locked default colour scheme for item/submenu/drawer states (2026-09-11, owner-ruled)

**Design-council-researched, evidence-based, owner-approved 2026-09-11.** This is the "what are the
actual default token values" decision for FR-41-1/FR-41-3 — it was not fully pinned down before this
ruling; this FR is genuinely new content, not a restatement.

Uses the real `theme.json` palette tokens: `primary` (#1F7A7A), `primary-dark`, `accent` (#F59E0B),
`accent-light`, `accent-text`, `surface` (#FAF9F6, page bg), `surface-alt` (#F1F0EC, raised bg),
`text`, `border-light`.

| Context | Normal | Hover | Current |
|---|---|---|---|
| **Top bar** (horizontal, desktop) | text=`primary`, bg=none, item-divider (FR-41-8)=`border-light` | text=`accent`, bg=`accent-light` (soft tint, **not** a solid fill — research found no mainstream WP theme defaults hover to a bold solid-colour fill), item-divider=`accent` | text=`accent`, bg=none (restrained — matches Astra's real shipped default of text-colour-only for active state, verified against Astra's own customiser docs), item-divider=`accent` (same colour as Hover; the **absence** of a bg fill is what visually distinguishes Current from Hover) |
| **Desktop submenu** (dropdown panel) | bg=`surface-alt` (a raised/distinct neutral, not matching the top bar), text=`primary` | hover row=`accent-light` tint, submenu-item divider=`accent` | *(inherits the row treatment above; no separate Current row colour specified beyond the shared item-divider language)* |
| **Drawer top-level** (burger/off-canvas menu) | bg=`surface-alt`, text=`primary`, item divider=`accent` | hover row=`accent-light` tint | active row=`accent-light` tint |
| **Drawer nested submenu** (accordion-expanded items) | bg=`surface`, text=`primary`, item divider=`accent` | — | — |

⛔ **The drawer explicitly does NOT default to a brand/primary-colour-filled whole panel.** Research
confirmed none of Kadence/Astra/GeneratePress/Divi default their drawer to a brand-coloured fill; all
four default to a neutral background (white or near-black) with brand colour reserved for accents
only. **This corrects an earlier working assumption** ("drawers usually use the brand colour as the
fill") that was checked and found not to match real shipped defaults.

**Drawer nested submenu is deliberately a lighter/more neutral shade than the drawer's own top-level
rows** (`surface` vs `surface-alt`) — real precedent exists in Foundation's accordion menu framework
(separate top-level vs nested-item background variables) and NN/g's mobile subnavigation research
(visual differentiation between hierarchy levels is a recommended pattern, not decoration).

**Governing principle — a structural pairing, preserve it if either scheme is revisited later:** the
**top bar** and the **drawer's nested submenu** share the same "plain" tier (bg=`surface`/none,
text=`primary`) — they are a matched PAIR. The **desktop submenu panel** and the **drawer's
top-level menu** share the same "distinct" tier (bg=`surface-alt`) — they are the OTHER matched pair.
This pairing is deliberate. Don't let one pair drift independently of the other.

**Universal divider rule:** every context (top bar, desktop submenu, drawer top-level, drawer nested
submenu) gets an always-visible item divider whose COLOUR changes consistently with state
(`border-light` at rest, `accent` on hover/current) — the single consistent visual language across
the whole component that tells a user which state an item is in, independent of which context they
are looking at.

⚠ **This is a locked design decision, not yet built.** No attribute defaults, `block.json` values or
`render.php` fallbacks have been changed to match this table — that is separate future implementation
work.

### FR-41-2 — No new shared JS component is built. None is needed.

**Verified against the real code, not assumed.** Two separate premises that would have required
new components are both false:

**(a) No `fillRow3`/`textRow3` sibling is created. The existing helpers gain an optional third
state.**

⚑ **AS BUILT (2026-09-11) — the premise below was true when written and is now superseded by
something BETTER, not by something worse; the conclusion is unchanged.** When this FR was written,
`sgs/nav-menu` used no row helper at all: its rows were **inline literal row-descriptor objects** in
`plugins/sgs-blocks/src/blocks/nav-menu/edit.js::Edit`'s `colourRows` array. That is no longer the
shipped shape, and a builder reading the original paragraph would rebuild the wrong thing.

**The real adopted mechanism.** `plugins/sgs-blocks/src/components/colour-variants/fillRow.js::fillRow`
and `…/textRow.js::textRow` were **additively extended with an optional `current` / `currentGradient`
key** — the JS mirror of FR-41-3's optional PHP `current` key, deliberately the same vocabulary
rather than a second one. `colourRows` is now a single literal `ArrayExpression` whose entries are
mostly `fillRow()` / `textRow()` CALLS. Adding a third state to such a row is **one more string in
that call's `attrs` object**, not a hand-written `states` array.

⛔ **Two rows are STILL hand-written literals, deliberately, and both reasons are load-bearing —
do not "finish the job" by converting them:**

| Row | Why it cannot use the helper |
|---|---|
| **Item background** (`item-bg`) | FR-41-14 requires the Current state to be omitted **per-STATE** while `Highlight` is active. A conditional attribute NAME passed to the helper (`current: cond ? 'x' : undefined`) is not a string literal, so `describeRow()` would resolve the row as 2 states while it renders 3 — the gate going blind while the code is correct (D738). A spread-of-ternary inside a literal `states` array stays statically countable in BOTH branches. |
| **Item border colour** (`item-border`) | The item border declares **no** gradient attribute (FR-41-7 / §1.2), so the row cannot be `gradientCapable`. ⚠ **Consequence, shipped and disclosed rather than hidden:** a non-`gradientCapable` row renders `DesignTokenPicker`, which carries no contrast check — so this row's `contrastAgainst` / `contrastLargeText` pair is DECLARED per §9.6 and is **currently INERT**. The submenu panel border row beside it IS gradient-capable and its check does run. |

⚠ **A `current` state is appended only when `hover` is also supplied** — both helpers throw a
developer warning on a Current-without-Hover row, because Current is the THIRD state (§1.3), never a
substitute for Hover. ⛔ `linked: true` is set by the helpers on every state they build; the two
hand-written rows set it inline, per row, per state.

**The detector is not blinded by the change.** `31-golden-colour-control.js` resolves a `fillRow` /
`textRow` CALL natively via `describeRow()` — a different question from the literal-array corpus
limit below, which is why the CALL SITE must stay in `edit.js` even though the BUILDER lives in
`plugins/sgs-blocks/src/components/`.

**(b) `SgsBorderControl` needs no fork, and its N-state colour machinery is not used here at all.**

⚑ **RESOLVED BY FR-41-33 (0.4.1).** Border COLOUR moves out of `SgsBorderControl` and into the
global Colour panel as an ordinary 3-state row, so this block never passes `colourStates` at all.
`SgsBorderControl` still owns width, style and radius, mounted with the new **`showColour={ false }`**
prop. That prop does not exist today — verified by reading the file's whole prop contract, which
offers `colourStates` / `colourValue` / `colourGradientValue` / `colourLinked` / `colourLabel` and
no way to suppress the picker; `GradientCapableColourControl` is rendered unconditionally. **A
small, additive, default-`true` prop addition is therefore required** (FR-41-33), not assumed. The
paragraph below records what the multi-state machinery DOES, because it stays true of the control
and of its 40-plus existing mounts — it is simply not the path this block takes.

Verified in
`plugins/sgs-blocks/src/components/SgsBorderControl.js::SgsBorderControl`: it accepts a
`colourStates` prop and forwards it verbatim as `states` to
`plugins/sgs-blocks/src/components/GradientCapableColourControl.js::GradientCapableColourControl`,
which maps over `resolvedStates` with no fixed length anywhere — even its screen-reader description
is parameterised (`'%1$d colour states available: %2$s'`, fed `resolvedStates.length`). A three-
element `colourStates` array renders three tabs today. It also already carries width (box object,
base only), border style inside the colour popover, and radius. **No fork and no new component is
needed for a 3-state border anywhere in the framework** — a three-element array passed by the
caller is enough. ⛔ Do not fork it. The single permitted modification in this spec is FR-41-33's
additive `showColour` prop.

⚠ **`borderStyle` rides the colour popover, so `showColour={ false }` must not take border style
with it.** `SgsBorderControl` forwards `styleValue`/`onStyleChange` INTO
`GradientCapableColourControl` as `borderStyle`/`onBorderStyleChange` — the native
`BorderBoxControl` opens both from one swatch. FR-41-33 names the resolution: with the colour
picker suppressed, `SgsBorderControl` renders the framework's **existing shared
`BorderStyleControl`** as its own sibling in the same row, so no capability is lost, no attribute
moves, and no new control is hand-rolled. ⛔ **Do NOT build a fresh `SelectControl` for border
style** — `plugins/sgs-blocks/src/components/BorderStyleControl.js::BorderStyleControl` already
exists and is already the control the suppressed popover was rendering (see FR-41-33 item 2).

Real prop shape, read from the file: `label` · `widthValues` / `onWidthChange` / `widthPresets` ·
`styleValue` / `onStyleChange` · `colourStates` **(the multi-state form used here)** OR
`colourValue` / `onColourChange` / `colourGradientValue` / `onColourGradientChange` /
`colourLinked` (the single-state form) · `radiusValues` / `onRadiusChange` / `radiusLabel` /
`showRadiusResponsive` · `colourLabel` · `clearable` · `enableAlpha` · `contrastAgainst` /
`contrastLabel` / `contrastLargeText` (defaults `true` here, because a border is a WCAG 1.4.11
UI-component case at 3:1, never body text).

Each `colourStates` entry is `{ key, label, value, onChange, linked, gradientValue,
onGradientChange }` — the exact shape read from
`plugins/sgs-blocks/src/components/GradientCapableColourControl.js::GradientCapableColourControl`'s own `states` docblock. Live
multi-state mount to copy: `plugins/sgs-blocks/src/blocks/container/edit.js::Edit`'s
`<SgsBorderControl colourStates={…}>`.

**The static detector is not blinded by any of this.**
`plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js` resolves a row's
state count as `statesArray.elements.length` on a literal `ArrayExpression`, and enforces a
**minimum of 2** with no upper bound. A three-element literal array resolves to 3 and passes. The
one thing that would blind it is a computed states array — so:

⛔ **State entries are written as LITERAL array entries, never `.map()`/`.filter()`-generated.**
A computed array renders correctly while the detector reports the wrong count (D738: "the code
improved and the gate went blind"). Conditionality happens at ARRAY level
(`showCurrent ? [ normal, hover, current ] : [ normal, hover ]`), which stays statically resolvable.

⛔ **`linked: true` on every state, unconditionally.** It makes `DesignTokenPicker` store the
palette **slug** rather than a baked hex, so a client's brand token survives a re-skin (D717/D740).
Both hand migrations and a codemod dropped it once and 14 assertions missed it (D881).

⛔ **State labels are translated at the row, as `__( 'Current', 'sgs-blocks' )`** — matching the
existing `Normal`/`Hover` entries in the same arrays. Hardcoding a label was a real, gate-invisible
i18n regression once already.

### FR-41-3 — The PHP emitters gain an optional third state. No `_3` family is created.

⛔ **There is no `sgs_fill_states_css_3`, no `sgs_text_states_css_3`, no
`sgs_border_states_css_3`, and no `sgs_emit_state_colour_css_3`.** A near-duplicate triplication
of four working functions is four more places for the fix that lands on one of them to be missed.
The third state arrives as **optional parameters on the existing functions**, defaulting to the
current behaviour so every existing caller is byte-identical.

**(a) `sgs_emit_state_colour_css()` gains a 4th parameter.** Verified current signature in
`plugins/sgs-blocks/includes/helpers-tokens.php::sgs_emit_state_colour_css`:

```php
sgs_emit_state_colour_css( string $selector, array $decls_normal, array $decls_hover ): string
```

New signature:

```php
sgs_emit_state_colour_css(
    string $selector,
    array  $decls_normal,
    array  $decls_hover,
    array  $extra_states = []
): string
```

`$extra_states` is a map of `state_key => [ 'suffix' => string, 'decls' => string[], 'guarded' =>
bool ]`. Each entry emits `{$selector}{$suffix}{…$decls}`, guarded via
`sgs_hover_state_rules()` when `guarded` is true and emitted plainly when false. For the Current
state the caller passes `[ 'current' => [ 'suffix' => '[aria-current="page"]', 'decls' => […],
'guarded' => false ] ]`.

⛔ **`$extra_states` is emitted BEFORE `$decls_hover`, inside the function**, so ordering is a
property of the emitter rather than of every call site. See the source-order rule below.

⛔ **The default `[]` is not a convenience, it is the acceptance condition.** The function has
**122 call sites** across the plugin (verified: `grep -rn "sgs_emit_state_colour_css(" --include=*.php`).
Every one of them must produce byte-identical CSS after the change — §11 G1.

**(b) `sgs_fill_decls()` and `sgs_text_decls()` gain an optional `current` key.** Both currently
return `array{normal: string[], hover: string[]}` and read `$map['base']` / `$map['hover']` /
`$map['gradient']` / `$map['hover_gradient']`, with only `base` required. Each gains:

- a `current` key read from `$map['current']` (and, where the mechanism supports it,
  `$map['current_gradient']`);
- a third `current` key in the returned array, **populated only when the caller's `$map` carries a
  `current` key**.

A caller whose `$map` has no `current` key gets a returned array with an empty `current` bucket
and behaves exactly as today. Their `sgs_fill_states_css()` / `sgs_text_states_css()` wrappers
forward the bucket into `$extra_states` when it is non-empty, and pass `[]` when it is not.

**(c) `sgs_border_states_css()` — the third state is FLAT-PATH ONLY, and that is a mechanism
constraint, not a carve-out.** Verified in
`plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_border_states_css`: the function has
two paths, chosen by whether a gradient attribute is set anywhere in the map.

| Path | Condition | What it emits | Third state |
|---|---|---|---|
| **Flat** | no `gradient` and no `hover_gradient` set | `{sel}{border-color:X}` plus a `sgs_hover_state_rules()` pair for the hover colour | **Supported.** One more `{sel}[aria-current="page"]{border-color:Z}` rule, emitted before the hover pair. Trivially additive. |
| **Ring** | either gradient set | delegates to `sgs_border_gradient_css( $sel, $normal_paint, $hover_paint, $width )` — a masked `::before` ring that composes BOTH paints into one construction and sets `border-color:transparent` on the element | **Not supported. Current is gradient-exempt at the ring level.** The primitive takes exactly two paints; a border gradient has no single hex. |

⛔ **The ITEM border never reaches the ring path, because this block declares no item-border
gradient at all.** `itemBorderColourGradient` is out of scope (FR-41-7, §1.2) — the ring's masked
`::before` collides with the item background layer, which already owns `.sgs-nav-menu__link::before`
(FR-41-4 item 6). The item border therefore always takes the **flat** path, and its three states —
including Current — all render. There is no gradient-versus-Current trade-off to explain to an
operator on this row, because there is no control to trade off.

⚠ **The submenu PANEL border DOES declare a gradient (`submenuBorderColourGradient`) and that is
not an inconsistency.** Nothing competes for `.sgs-nav-menu__submenu::before`, so the ring
construction is safe there; and the panel is Normal-only for every property anyway (FR-41-9), so
the ring's two-paint limit costs it nothing. The distinction is the pseudo-element budget on one
specific element, not a rule about border gradients.

**Three binding rules for the emitter:**

1. ⛔ **Every hover rule routes through a helper in
   `plugins/sgs-blocks/includes/helpers-hover-state.php`. Never a bare `{sel}:hover`.**
   Use `sgs_hover_state_rules( $selector, $decls, $focus, $suffix )` when you hold a BASE selector
   — it appends `:hover` (plus any pseudo-element `$suffix`) to each comma-separated part itself,
   and emits the focus rule separately and unguarded. Use `sgs_hover_guarded_rule( $hover_selector,
   $decls )` only when you already hold a fully-built `:hover` selector. On a touchscreen a tap
   engages `:hover` and it sticks until the user taps elsewhere; the client reports it as a broken
   control. The helper's two layers cover different devices — `SGS_HOVER_MEDIA`
   (`@media (hover:hover) and (pointer:fine)`) fixes phones and pure-touch tablets with no JS;
   `SGS_HOVER_NOT_TOUCH` (`:where(:root:not(.sgs-touch-input))`) fixes hybrids, which report
   hover-capable all session while being poked with a finger. Neither covers the other's devices.
2. ⚠ **`:focus-visible` stays OUTSIDE both guards.** A keyboard user on a touchscreen laptop still
   needs the focus state. `sgs_hover_state_rules()` already splits them correctly.
3. ⛔ **The Current rule is emitted BEFORE the Hover rule, and is never guarded.**

**The specificity rule, stated once — do not publish a per-property number table.**

> Because FR-41-1 puts all three states on the same element, **every state-pair shares one base
> selector and differs only by a single one-specificity suffix** — `[aria-current="page"]` (an
> attribute selector) versus `:hover` (a pseudo-class). Both weigh the same. **A state-pair
> therefore always ties, whatever the base selector is, and source order is the only tie-breaker.**

The base selector is `$link_sel` = `.{uid} .sgs-nav-menu__link` — **TWO classes, (0,2,0)** (verified:
`render.php` sets `$uid_sel = '.' . $uid;` then `$link_sel = $uid_sel . ' .sgs-nav-menu__link';`).
So the text-colour pair is `(0,3,0)` versus `(0,3,0)`, and the background pair — which paints on
`::before` — is `(0,3,1)` versus `(0,3,1)`. Both tie. Both would still tie if the base selector
grew or shrank, which is the point: **write the rule, not the numbers.**

Emitting Current first means *hover wins when you point at the item for the page you are already
on*, which is the behaviour already locked (`render.php`'s `$hover_targets` comment, 2026-07-31:
"a visitor cannot tell WHERE THEY ARE from WHAT THEY ARE POINTING AT. Different questions,
different answers."). Current is not pointer-dependent, so it takes no touch guard.

### FR-41-16 — `SgsColourPanel` gains optional row sub-headings (additive, zero blast radius)

`plugins/sgs-blocks/src/components/SgsColourPanel.js::SgsColourPanel` renders ONE `PanelBody`
titled "Colour" in the `group="styles"` InspectorControls slot and maps `rows.filter(Boolean)` to
one control each. It has no grouping mechanism at all today.

**Add one optional key.** A row descriptor may carry `heading: string`; when present, the panel
renders a non-interactive sub-heading immediately before that row's control. A row without it
renders byte-identically to today. This is what lets nav-menu's single Colour panel carry the
Menu / Submenu / Menu-button groupings of §9.6 without splitting into separate panels.

⚑ **AS BUILT (2026-09-11) — `heading` alone was NOT enough, and this was a genuine PLAN GAP found
mid-build, not a scope creep.** FR-41-24 requires the hover-treatment selector to be *"rendered
inline directly beneath each row's `states` array"*, and §9.6 requires two `ⓘ` cross-reference notes
in the same position. **`SgsColourPanel` had no slot for anything after a row's control**, so the
requirement was unbuildable as written. It was closed the same way `heading` was — as an approved,
additive, default-absent row-descriptor key. **THREE optional keys now exist, all additive, all
zero-blast-radius**, verified in
`plugins/sgs-blocks/src/components/SgsColourPanel.js::SgsColourPanel`:

| Row-descriptor key | Rendered | Exists for |
|---|---|---|
| `heading` (string) | a `BaseControl.VisualLabel` immediately BEFORE the row's control | the §9.6 Menu / Submenu / Menu-button groupings (this FR) |
| `after` (React node) | immediately AFTER the row's control, inside the same row wrapper | FR-41-23/24's treatment selector and §9.6/§9.10's `ⓘ` notes. ⛔ **It is a SLOT, not a component** — the panel makes no assumption about what goes in it |
| `contrastLargeText` (boolean) | forwarded alongside `contrastAgainst`/`contrastLabel` on the gradient-capable branch | FR-41-17/FR-41-33's moved border rows. ⚠ Without it the flag was **DROPPED**: a border row would silently get the 4.5:1 TEXT threshold instead of WCAG 1.4.11's 3:1 UI-component one |

⛔ **`after` is the ONLY sanctioned mount point for the treatment selector — do NOT hand-roll a
second panel, a sibling `PanelBody`, or a control rendered outside the row wrapper.** The whole point
of FR-41-23 is that the operator meets the control and its consequence in ONE place; a selector
mounted anywhere else recreates the three-mechanisms-in-three-places problem it exists to remove.
Live mounts: `plugins/sgs-blocks/src/blocks/nav-menu/ColourRowExtras.js` exports one small component
per row (`ItemTextTreatment`, `ItemBgTreatment`, `ItemBorderTreatment`, `SubmenuTextTreatment`,
`SubmenuLinkBgTreatment`, `BurgerIconTreatment`, `BurgerBgTreatment`), each passed as that row's
`after`.

⚠ **`contrastLargeText` is spread only when the row actually declares it**, so a row that omits it is
byte-identical to before rather than merely behaviourally equivalent — "absent" and "explicitly
`undefined`" are distinguishable, and G1(a)'s proof should not have to argue the difference.

⚠ **This is a shared-component change and therefore design-gated (project rule 7).** It is the
minimum shape that does the job: no new component, no prop-shape change, no behaviour change for
any row that omits the key. **Acceptance:** every other block mounting `SgsColourPanel` renders
byte-identical inspector output before and after (§11 G1).

---

## 3. Retiring `hoverStyle`

### FR-41-4 — `hoverStyle` and the entire underline mechanism are DELETED

**What the three branches actually do — verified in
`plugins/sgs-blocks/src/blocks/nav-menu/render.php`, at the `$allowed_hover_styles` /
`$hover_style` block:**

| Branch | What it does | Covered by |
|---|---|---|
| `'pill'` | Paints `itemBgHover`, resolves a WCAG-safe hover foreground via `sgs_wcag_preferred_text_colour_for_bg()` / `sgs_wcag_text_colour_for_bg()`, applies `itemRadius`/`itemRadiusHover` | The 3-state background + text + radius controls, **except** the auto-contrast pick → FR-41-5 |
| `'text'` | `$css .= $hover_sel . '{color:' . sgs_colour_value( $item_fg_hover ) . ';…}'` — literally nothing but the hover text colour | Setting a Hover text colour and leaving the background empty. Identical output, zero mechanism. |
| `else` (underline) | An animated `::after` bar — `transform:scaleX(0)` → `scaleX(1)`, `transform-origin:left center`, plus its own `@media (prefers-reduced-motion:reduce)` companion | A bottom border (FR-41-7) combined with the hover colour animation (FR-41-8) |

**Seven required changes, all in the same build:**

1. **Delete the `hoverStyle` attribute** from `plugins/sgs-blocks/src/blocks/nav-menu/block.json::attributes` and all three branches from
   `render.php`. No deprecation (project policy D270 — the framework is pre-production and carries
   no block deprecations).
2. **Delete the underline attributes**: `underlineColour`, `underlineColourHover`,
   `underlineColourGradient`, `underlineThickness`, `underlineOffset`. They are superseded, not
   kept alongside.
3. **Delete the underline CSS.** Named explicitly so none is missed — all inside the `else` branch
   of `render.php`:
   - `{link_sel}{position:relative;}`
   - `{link_sel}::after{content:"";position:absolute;left:0;right:0;bottom:-…px;height:…px;<paint>;transform:scaleX(0);transform-origin:left center;transition:transform …,background-color …;pointer-events:none;}`
   - the `sgs_hover_state_rules( $link_sel, 'transform:scaleX(1);background-color:…', ':focus-visible', '::after' )` pair
   - `@media (prefers-reduced-motion:reduce){ {link_sel}::after{transition:none;} }`
   - the `$hover_after_sel` construction that builds the per-selector `::after` list
4. **Delete the `underline` element from `plugins/sgs-blocks/src/blocks/nav-menu/block.json::supports.sgs.elements`** entirely. Not a note
   correction — the whole entry. Its mechanism no longer exists, so an element declaring
   `css:background-color`→`underlineColour`, `css:height`→`underlineThickness` and
   `css:bottom`→`underlineOffset` would route four dead attributes into the DB classifier.
   **This deletion carries a mandatory reseed step — §8.6(f).**
5. **Delete the "Underline" `PanelBody`** from `edit.js` and the `hoverStyle` dropdown from the
   "Effects" panel.
6. `{link}::after` is thereby **freed for non-featured items**, and FR-41-8's colour-sweep band
   claims it. `{link}::before` stays owned by the item background layer (`render.php`'s D942 recipe
   item 1 comment records why the background moved to `::before`: `::after` was taken by the
   underline. It no longer is, but the background stays where it is — moving it would be churn with
   no benefit). ⚑ **This item covers the RESTING fill ONLY. The Hover and Current fills are governed
   by FR-41-23's three-state `::before` rule (0.4.4) — do not cite this item for them**, and do not
   let the deletion of the `'pill'` branch above leave its hover fill painting on the link element.
7. **Delete `{featured_sel}::after{content:none;}`.** Verified: `render.php` emits this
   unconditionally, **outside the `hoverStyle` branch entirely**, in the featured-item styling block
   directly after the featured hover-weight rule. `$featured_sel` is
   `.{uid} .sgs-nav-menu__item--featured .sgs-nav-menu__link`, so the rule weighs `(0,3,1)` against
   FR-41-8's band at `(0,2,1)` — **it wins, and the sweep silently does not render on a featured
   item.** Its own comment says it exists to stop the retired underline bar doubling up with the
   featured treatment; that bar no longer exists, so the rule has nothing left to suppress.
   Deleting it makes the sweep apply to featured items too, which is the universal answer (rule 3,
   no carve-outs). ⛔ Do NOT keep it "just in case" — a kept suppression rule is exactly the silent
   override `check-hardcoded-render-defaults.js` F3b exists to catch.

### FR-41-5 — Smart contrast: the pill's one genuinely unique behaviour, preserved as a toggle

⚑ **PLACEMENT SUPERSEDED BY FR-41-27 (0.4.0).** Owner point 11: `itemSmartContrast` is a WCAG
safety-net TOGGLE, not a colour, and it does not belong physically inside a colour panel — it
belongs beside the block's other accessibility-facing controls, in the General tab, so an
operator scans one place for "does this menu behave safely" questions. The MECHANISM below
(what the toggle does, its default, its two contrast cases) is **unchanged**. Its **inspector
placement moves from the Design-tab colour area to the General-tab Accessibility panel** — see
FR-41-27 and §9.5.

⛔ **A relocated control must stay FINDABLE from the rows it governs.** The Item text and Item
background rows in §9.6 each carry a one-line cross-reference pointing at §9.5, mirroring the
cross-reference pattern §9.8 already uses for the submenu's colour rows. Without it the toggle
silently governs two Design-tab rows from a panel on another tab, which reads to an operator as the
control having been dropped. **Acceptance: §11 G16** — the toggle must be proven to render, to be
bound to `itemSmartContrast`, and to actually change the rendered colour when switched off and on,
on the live canary. A relocation with no gate is how a working control quietly stops working.

⚠ **Sweep defeats this toggle, so the two are never offered together** — see FR-41-26's Sweep
eligibility rule. `-webkit-text-fill-color: transparent` overrides whatever foreground the toggle
resolves, so a row offering both would let a client switch on a safety net that does nothing.

**`itemSmartContrast`, boolean, default `true`.** Control: a native `ToggleControl`, matching
`submenuCaret` / `itemMagnetEnabled` on this same block.

When on, and the operator has set a Hover or Current **background**, `render.php` resolves the
matching foreground through the **existing** helpers — the same ones the pill branch calls today,
and the same ones the featured-item pill and `sgs/nav-drawer` already use. **Do not build a new
contrast function.** Two cases, both preserved verbatim from the current pill branch:

- **Text colour empty** → `sgs_wcag_text_colour_for_bg( $bg_hex )` picks the guaranteed-safe
  binary foreground.
- **Text colour set** → `sgs_wcag_preferred_text_colour_for_bg( $bg_hex, $preferred )` keeps the
  operator's colour when it clears AA against the resolved fill, and falls back to the safe binary
  only when it does not.

⚠ **The second case means an explicit colour does not always win, and that is the shipped
behaviour being preserved, not a new rule.** `render.php`'s own comment at the pill branch states
it: *"the operator's choice wins whenever it is readable."* An operator who wants their unreadable
colour rendered as-is switches the toggle off; that is what the toggle is for.

**Default ON, and this is the conservative choice, not the aggressive one.** Today the pill branch
auto-contrasts *unconditionally* whenever `itemBgHover` is set. Defaulting the toggle off would
silently remove an existing WCAG safety net from every install. Defaulting it on preserves current
behaviour exactly.

Help text must be plain language, e.g. *"When you set a background, we check your text colour stays
readable against it and swap in a readable one if it doesn't. Switch this off to always use exactly
the colour you picked."* No "WCAG", no "contrast ratio", no "AA" in a client-visible string.

### FR-41-6 — The non-colour state signal (WCAG 1.4.1) survives the retirement

The retired underline branch carried an explicit guarantee, recorded in its own comment: *"the
fallback for every other case so there is never zero visible feedback (WCAG 1.4.1 / 2.4.7)"*.
Retiring it must not leave Hover and Current as colour-only signals — that fails SC 1.4.1 Use of
Colour for any visitor who cannot distinguish the two colours, and it fails an operator who picks
a low-chroma palette. **This FR is the replacement guarantee, and it is discharged entirely by the
border row's own Hover treatment — no text-decoration control is load-bearing for it.** ⚠ The
`showHover` trio restored in 0.4.2 sits *beside* that guarantee, never *inside* it: it defaults to
unset, so it can never be what satisfies SC 1.4.1 here.

⛔ **THE PRIMARY NON-COLOUR SIGNAL IS THE BORDER ROW'S OWN HOVER TREATMENT. THE HOVER TYPOGRAPHY
TRIO IS AN OPTIONAL SECONDARY DECORATION AND IS NEVER "THE DIVIDER".** Both halves of that sentence
are binding, and neither may be restated as the other anywhere in this spec, in any help text, or
in any control label.

**Half one — the primary signal.** FR-41-23 pairs a None/Swap/Sweep selector beneath the item
border's Hover swatch. On `Swap` the border changes colour instantly; on `Sweep` it travels a band
along the bottom edge (FR-41-8). Either is a visible, non-colour-dependent change of state on hover
— a line that was one thing and is now another — and both arrive with the border width the operator
already set. That is the same job the retired `::after` bar did, using the mechanism this spec built
anyway. **This is the WCAG 1.4.1 signal for the Hover state, and it is the only thing this spec
counts as one.**

**Half two — the optional secondary layer (0.4.2).** `TypographyControls`' `showHover` flag IS
switched on, on both targets, and all three of its controls ship: hover text-decoration, hover
text-transform and hover font-weight. An operator may additionally choose any of them. **None of
them is required for WCAG compliance, none of them is a substitute for the border treatment, and
none of them is an alternative implementation of the divider.** They are decoration an operator
opts into, exactly as they would opt into a hover colour.

**Why the underline does NOT compete with the border row, stated precisely — this is the
distinction 0.4.1 got wrong.** `itemTextDecorationHover: "underline"` emits a literal CSS
`text-decoration: underline`. That decoration **hugs the text baseline and spans only the glyphs**;
it does not span the item's width. The retired mechanism was something else entirely: a positioned
`::after` bar that, in `render.php`'s own words, "spans the link box consistently" — and that
comment exists precisely because the bar was chosen *over* plain `text-decoration: underline` for
that reason. Two different visual registers:

| | Retired `::after` bar | `text-decoration: underline` | Border row's Hover treatment |
|---|---|---|---|
| Geometry | full item width, positioned | glyph width, baseline-hugging | full item width, on the border box |
| Competes with a bottom border? | **Yes** — two full-width horizontal lines | **No** — different width, different vertical position | it IS the bottom-edge treatment |

The `/research-check` finding that an underline and a border-bottom are used as ALTERNATIVES,
never stacked, was reported against the OLD full-width bar and holds for it. It does **not**
transfer to plain `text-decoration`, whose geometry is not the border's geometry. So offering both
is not the redundant "two stacked lines" problem — it is a small text-level decoration sitting
inside a full-width edge treatment, which is an ordinary compositional choice.

⛔ **What is still refused, and why:** the FULL-WIDTH ANIMATED BAR. FR-41-4 deletes it and nothing
in 0.4.2 brings it back. `itemTextDecorationHover` is not a re-entry route for it — it cannot be,
because `text-decoration` cannot span the link box.

**Consequences — stated plainly rather than left implicit:**

1. ✅ **`itemTextDecorationHover`, `itemTextTransformHover` and `itemFontWeightHover` ARE declared,
   plus their three `submenu`-prefixed siblings** — six attributes, §8.4. They arrive as one set
   because `showHover` is all-or-nothing (it renders the three `SelectControl`s together), and the
   owner's ruling is to keep all three rather than lose two as collateral of refusing the framing of
   the third.
2. ⛔ **`itemTextDecorationCurrent` is still NOT declared.** `TypographyControls` models resting +
   hover only, so there is no shared control for a Current trio at all, and Current already carries
   its own signal — `itemFontWeightCurrent`, below. §1.2 names this out of scope.
3. ⚠ **A hover font-weight change reflows the whole bar.** A heavier face is wider, so every item to
   the right of the hovered one shifts. This is an honest operator-discretion caution and it belongs
   in the control's help text — it is **not** a reason to omit the control, which the owner has
   decided to keep available regardless. ✅ **The sentence is DRAFTED, not merely required —
   §9.10 carries the verbatim string (0.4.3).**

⛔ **The distinction in the ⛔ above is RENDERED in the inspector, not only stated here (0.4.3).**
"Never left implicit" is a claim about what an operator encounters, and an operator encounters the
editor. Two reciprocal `ⓘ` notes discharge it — one under the item border row's hover-treatment
selector (§9.6), one under the hover trio row (§9.10) — each naming the other and each stating
plainly that they are not the same thing. **Both, or neither**: a one-way pointer leaves the control
being pointed at looking like the authoritative one. The verbatim strings for both notes, and for
the two trio help-texts, live in §9.10 — written out, because a binding wording requirement with no
wording is unbuildable. **Gated: §11 G19(e).**
4. ✅ **The base `itemTextDecoration` (Normal state only) is UNTOUCHED.** It is an existing
   attribute, it renders through `sgs_typography_css_rule()` today, and an operator who wants a
   permanently-underlined menu still has it.

**What still ships as a default non-colour signal, one per state:**

| State | Signal | Attribute | Default | Why this one |
|---|---|---|---|---|
| **Hover** | the item border's own Hover treatment | `itemBorderColourHover` + `itemBorderHoverTreatment` | `"swap"` | Uses the border the operator already sized, needs no second control, and works identically in the bar and the drawer (FR-41-28). ⚠ It is only *visible* when a bottom (or other) border width is set — see the honest caveat below. |
| **Current** | `font-weight` | `itemFontWeightCurrent` | `"600"` | It is exactly what the current-page rule already renders (FR-41-15), so nothing shifts; converting the hardcode to an attribute makes it reachable instead of removing it. Weight is safe on Current because Current does not change on pointer movement — there is no reflow-on-hover to cause. |

⚠ **The honest caveat: `itemBorderWidth` defaults to `{}`, so an untouched block ships NO border
and therefore no default Hover signal.** The retired underline defaulted to visible. This is a
real reduction in the shipped-default guarantee and it is named, not hidden. It is accepted for
one reason: an unrequested underline appearing on every menu item of every install is itself a
design imposition the owner rejected, and the operator now has a first-class control that makes
the signal visible in one action. **§10's residual-risk entry (FR-41-17a) carries this case**, and
§11 G10 asserts the Hover signal renders once a border width IS set — it does not assert a signal
on a border-less menu, because there is none to assert.

⛔ **`itemFontWeightCurrent` is typed `"type": "string", "default": "600"`, not a number.**
Verified: the sibling it must match, `itemFontWeight`, is declared
`{"type":"string","default":""}` in `block.json`. A number-typed sibling would be a second
vocabulary for one property.

⛔ **It renders as a `SelectControl` fed `SGS_FONT_WEIGHT_OPTIONS`** — the framework's shared
10-option string-valued weight list, exported from `TypographyControls.js` and already re-exported
from the barrel `plugins/sgs-blocks/src/components/index.js` that this `edit.js` already imports
from. **Not a number input, and not a locally hand-typed weight array.** The anti-pattern is on
this same block: `featuredFontWeight` / `featuredFontWeightHover` are number-typed and driven by a
hand-rolled 4-option array, ignoring the shared list that was already one import away. Do not
reproduce it.

**The never-lighter rule.** An operator who bolds their whole menu (`itemFontWeight: "700"`) would
otherwise see the current page render *lighter* than every other item — a signal pointing the wrong
way. So:

> **`render.php` emits the Current weight rule only when `(int) itemFontWeightCurrent` is strictly
> greater than `(int) itemFontWeight`.** An empty `itemFontWeight` (the shipped default) casts to
> `0`, so the default `"600"` always emits and today's output is preserved byte-for-byte. An empty
> `itemFontWeightCurrent` casts to `0` and never emits.

⚠ This is a **floor, not a preference**: an operator who deliberately wants a *lighter* current
page cannot express it here. Accepted — the signal exists to be more prominent, and a
lighter-than-resting "emphasis" is not a signal anyone reads as one.

⛔ **One DEFAULT signal per state, not two — this constrains what SHIPS, not what an operator may
add.** Current's default signal is weight; Hover's is the border treatment. Neither state gets a
second *default*, because two shipped signals per state is noise and makes Current harder to tell
from Hover, not easier. ⚠ **This is not a prohibition on the `showHover` trio (0.4.2).** Those three
controls default to unset and paint nothing until an operator chooses them; an operator who then
adds a hover underline on top of the border treatment has made a compositional choice in their own
inspector, which is not this rule's business.

An operator can switch either off — set `itemFontWeightCurrent` empty, or leave the border width at
`{}`. That is a deliberate, informed choice made in their own inspector. What this spec must not do
is make colour the ONLY expressible signal, and it does not. The residual risk when both are off is
named honestly in §10 (FR-41-17a).

**How the Current-state controls are rendered — do not build a bespoke control.**
`itemFontWeightCurrent` has **no shared 3-state typography mechanism** (`TypographyControls` models
resting + hover only, and FR-41-21 refuses to extend it). It is a standalone `SelectControl` fed
`SGS_FONT_WEIGHT_OPTIONS`, already re-exported from the barrel this `edit.js` imports from, mounted
block-privately at the bottom of the Typography panel's Menu target (FR-41-29, §9.10).

**`itemTextDecoration`'s existing `block.json` `enum` gains `overline` as a fifth value**, matching
`SGS_TEXT_DECORATION_OPTIONS` and the PHP allowlist in `sgs_typography_css_rule()` exactly — a
one-line `enum` correction on an existing, still-live attribute, resolved here rather than carried
as an open question. It is unrelated to the state-sibling deletions above and survives them.

---

## 4. Border, sweep and the retired divider concept

### FR-41-7 — ONE item border control. There is no separate "Item Divider".

⛔ **There is no `itemDivider` toggle, no `itemBorderColour` as a standalone divider concept, and
no `itemBorderSweep`.** Owner decision, confirmed twice. Two mechanisms answering one question is
how the pre-existing double-line bug happened.

**Instead: the item's border is a normal 3-state `SgsBorderControl` mount with per-side width.**
`SgsBorderControl` composes `ResponsiveBoxControl` in border-width mode, which is a linked/unlinked
`{top,right,bottom,left}` editor — so:

- an operator who wants a drawer-style horizontal separator between stacked rows sets a **bottom**
  border;
- an operator who wants a vertical separator between items in the flat bar sets a **right** (or
  left) border;
- an operator who wants a boxed item sets all four.

One control, one mental model, per-side by construction.

⛔ **Width is BASE-ONLY, by the control's own design.** `SgsBorderControl` hardcodes
`showResponsive={ false }` on its width editor, with the reason in the file: per-device border
width was **cancelled framework-wide** (Bean, 2026-08-29), not deferred. Do not propose
`itemBorderWidthTablet` / `…Mobile`.

**Attributes:** `itemBorderWidth` (object, `{}`) · `itemBorderStyle` (string, `""`) ·
`itemBorderColour` / `itemBorderColourHover` / `itemBorderColourCurrent` (string, `""` each) ·
`itemBorderRadius` (object, `{}`).

⛔ **There is no `itemBorderColourGradient`. It is a named SCOPE CUT, not a silent drop.** The
reason is a pseudo-element budget, not a judgement about gradients: `sgs_border_states_css()`'s
gradient path is a masked `::before` ring (FR-41-3(c)), and `.sgs-nav-menu__link::before` is
already the item background layer (FR-41-4 item 6). Two features cannot both own one
pseudo-element, and the alternative — moving the background a second time — would be churn on a
mechanism that works, to buy a control FR-41-3(c) had already declared Current-exempt anyway. The
submenu PANEL border keeps its gradient; nothing competes for its `::before`.

⛔ **The three border COLOUR attributes are NOT authored inside this control.** They render as an
ordinary 3-state row in the global Colour panel, alongside item fill and item text — FR-41-33.
`SgsBorderControl` is mounted here with `showColour={ false }` and owns width, style and radius
only. Building a second live control that writes the same attribute from two panels is banned
(`check-duplicate-controls.js`), so the split is exclusive: one authoring surface per attribute.

⛔ **Radius rides `SgsBorderControl`'s own `radiusValues` / `onRadiusChange` pair — there is no
competing flat radius control alongside the new mount, and the FR-41-33 colour split does not touch
it.** Radius is not a colour; it stays with width and style where the control's own contract puts it. That is the control's documented contract
(*"the SGS-wrapped NATIVE border radius belongs with the border, not in a separate panel"*), and it
is why `itemRadius` / `itemRadiusHover` are deleted (§8.3) rather than kept beside it. Mount it
with `showRadiusResponsive={ false }`, matching the base-only width and the non-responsive scalars
it replaces.

**Verified fact an operator will ask about: borders do NOT leak between the bar and the drawer.**
The horizontal bar and the drawer's vertical list are **two separate `sgs/nav-menu` block
instances**, each with its own uid, its own scoped `<style>` and its own inspector.
`plugins/sgs-blocks/src/blocks/nav-drawer/edit.js::TEMPLATE` is `[ [ 'sgs/nav-menu', { gap: '4px' } ],
[ 'sgs/responsive-logo' ], [ 'sgs/button' ] ]`, and the comment directly above it states it
outright: *"The nav-menu seeded here is a SEPARATE block instance from the one in the header — its
own uid, its own scoped styles, its own inspector — so a client can style the drawer's menu
completely independently of the bar."* A bottom border set on the drawer's instance is invisible to
the bar's, and vice versa. Nothing needs building for this; it is already true.

### FR-41-8 — "Hover colour animation" — ONE control, in the border panel only

⚑ **SUPERSEDED IN PART BY FR-41-23 (0.4.0).** Owner point 2: a standalone "hover colour
animation" control living only in the border panel is a second, independent mechanism
competing with the plain Hover-colour swap on the SAME property (border colour) — exactly the
"two controls for one property" pattern this spec elsewhere refuses (FR-41-7's own reasoning
about the retired Item Divider). **`borderHoverAnimation` as a standalone attribute/control is
RETIRED.** What it does — the mechanism, the CSS, the `::after` band, the geometry fix, the
`prefers-reduced-motion` companion — is **unchanged and still built exactly as specified below**.
What changes is *where the choice lives*: it is now one of the three options on the universal
**hover-treatment selector** (FR-41-23) that sits directly under the item border row's Hover
colour, alongside every other stateful colour row on this block. The attribute is renamed
`itemBorderHoverTreatment` (enum `none`/`swap`/`sweep`, replacing `none`/`left-to-right`/
`right-to-left` — direction becomes a secondary control, shown only when `sweep` is chosen; see
FR-41-23). Read this FR for the MECHANISM (still authoritative); read FR-41-23 for the CONTROL
PLACEMENT (superseding).

**`borderHoverAnimation`, string, default `"none"`.** Values: `none` | `left-to-right` |
`right-to-left`. Control: `ToggleGroupControl` + `ToggleGroupControlOption` from
`plugins/sgs-blocks/src/components/primitives` — three options sits inside the framework's
segmented-control threshold, which is **data-driven, not a judgement call**:
`plugins/sgs-blocks/src/components/TypographyControls.js::SGS_TYPOGRAPHY_SWITCHER_MAX_SEGMENTED` is `3`, and this same `edit.js`
already imports both primitives for its burger-scope and indicator controls.

**One control, not per-element.** It lives in the item border panel. It is deliberately **not**
duplicated on the background or text rows, and **not** given a submenu-panel twin — a client
choosing an animation direction three times for one visual effect is a worse inspector, not a
richer one, and the submenu panel is not a hoverable surface at all (FR-41-9).

⛔ **Declare it as a plain `"type": "string"` and validate it in PHP — never a JSON `enum`.**
`render.php` records the reason at the `$allowed_hover_styles` block and it applies identically:
*"an out-of-enum JSON enum silently coerces the stored value back to the block.json default with no
error/warning, which bites hardest via a programmatic writer (the cloning pipeline, pattern files)
that sets the attribute directly rather than through this block's inspector control."*

**It animates the BOTTOM edge only.** A directional sweep needs a horizontal line to travel along;
a vertical edge has nothing to sweep. Other edges swap colour instantly. Top-to-bottom and
bottom-to-top are not offered for the same reason.

⛔ **When `itemBorderHoverTreatment === 'sweep'`, the Hover AND Current border-colour emissions are
OMITTED for the swept edge. The band owns every non-resting colour on it.** This is the fourth
silent killer of the band, and it is the exact bug class this whole redesign exists to prevent —
the original scaleX duplicate-line incident. Mechanism item 2 below makes the RESTING bottom border
transparent so the band shows through, but nothing in `sgs_border_states_css()` knows that: it would
still emit `{link}:hover{border-bottom-color:X}` and `{link}[aria-current="page"]{border-bottom-color:Z}`
from `itemBorderColourHover` / `itemBorderColourCurrent`, repainting a real border on the border box
directly beneath the band on the padding box — **two visible horizontal lines on hover, one of them
un-asked-for.**

**The rule, stated as the emitter's own condition rather than a call-site convention — REWRITTEN IN
0.4.7 to describe the API that actually exists.**

⛔ **0.4.6 and earlier stated this as: "`sgs_border_states_css()` receives a `$map` whose `hover`
(and `current`) keys are UNSET for the `bottom` edge." That instruction could not be executed and is
RETIRED.** Verified against the real file
(`grep -n "function sgs_border_states_css" -A 60 plugins/sgs-blocks/includes/helpers-colour-variants.php`):
the signature is `sgs_border_states_css( string $selector, array $attributes, array $map )`, and
there is **no edge parameter and no per-edge branch anywhere in the function**. It resolves one
`$normal_paint` and one `$hover_paint` and emits a single flat `border-color:` declaration painting
all four sides identically. "Unset hover and current for the bottom edge only, keep them on the other
three" is not expressible through that call — the helper was edge-blind by construction. An executor
reaching this rule stopped dead, or invented something. ⛔ Do not reinstate the old wording.

**The real mechanism (owner-ruled 2026-09-11). The shared helper gains an ADDITIVE optional
per-edge suppression, reusing the project's existing box-object naming:**

> **`sgs_border_states_css()`'s `$map` accepts an optional `suppress_edges` key**, shaped
> `array( 'top' => bool, 'right' => bool, 'bottom' => bool, 'left' => bool )` — the SAME
> `{top, right, bottom, left}` vocabulary the box object already uses for `itemBorderWidth` (§8.4).
> An absent key, an empty array, or an absent edge inside it all mean *false*.
>
> When any edge is suppressed, the helper's **non-resting** rules (the hover pair, and the `current`
> state added by FR-41-3) emit per-edge `border-<edge>-color` **longhands** for the unsuppressed
> edges only, in top/right/bottom/left order. When no edge is suppressed it emits the flat
> `border-color` **shorthand**, exactly as it does today. When every edge is suppressed it emits no
> non-resting rule at all — not an empty rule body.
>
> **The RESTING rule is unchanged.** The Normal-state bottom colour still resolves — it is what
> mechanism item 2 below then overrides to `transparent`, and what the band's own gradient reads as
> its resting stop. Every unsuppressed edge keeps all three states.
>
> `sgs/nav-menu` therefore calls the helper ONCE, normally, passing
> `'suppress_edges' => array( 'bottom' => true )` when the resolved `itemBorderHoverTreatment` is
> `'sweep'`, and passing **no `suppress_edges` key at all** otherwise.

⛔ **The gradient/ring path IGNORES `suppress_edges`, silently and by design.** When `gradient` or
`hover_gradient` is set the function delegates to `sgs_border_gradient_css()` — a masked `::before`
ring that takes exactly two paints and has no per-edge concept — so a per-edge request there is
*unexpressible*, not merely unimplemented. This is the same exemption FR-41-3 already records for the
Current state at the ring level. The helper's docblock must say so in one sentence naming the reason.

⛔ **The absent-key default is the ACCEPTANCE CONDITION, not a convenience.** Every existing caller
of `sgs_border_states_css()` passes no `suppress_edges` key, and every one must emit byte-identical
CSS — **including the flat `border-color` shorthand**. An implementation that always emits per-edge
longhands renders identically and is byte-different for 100% of existing callers, and has failed.
§11 **G1(c)** is the proof, extended in 0.4.7 to cover this parameter alongside FR-41-3's third
state; **G6** is the live end-to-end proof.

⚠ **Why the shared helper and not a block-private override rule.** The alternative — call the helper
normally, then emit one block-private rule resetting `border-bottom-color` under hover and current —
was considered and rejected by the owner. It would be a SECOND mechanism painting border colour on
one selector: two overlapping fixes, neither falsifiable, neither ever safely deletable. Per-edge
awareness is a real gap in the shared painter, not a nav-menu peculiarity — border **width** has had
the box-object concept for some time and border **colour** never got it. And the project's precedent
for exactly this shape of finding is already in this spec: FR-41-2/FR-41-3 resolved the identical
PHP-duplication question with an additive optional parameter on the existing shared function, never a
new sibling. There is no `_3` family, and there is no `sgs_border_states_css_per_edge()` either.

⚠ **The Hover and Current swatches themselves stay VISIBLE and stay STORED.** They still govern the
other three edges, and the band reads the Hover value as its travelling colour (the colour-reuse
rule — Sweep does not introduce a second colour). Only the *emission on the swept edge* is dropped.
Switching the treatment back to `Swap` restores the plain pair with nothing lost.

**Mechanism — one painted line, not two.** When a direction is set, `render.php` emits three
things:

1. ⛔ **`{link}{position:relative;}`, UNCONDITIONALLY.** The band is `position:absolute` and needs a
   positioned ancestor. The only rules that give the link `position:relative` today are (a) the
   underline branch, which FR-41-4 deletes, and (b) the `itemBg` branch — verified conditional on
   `'' !== $item_bg_hex || '' !== $item_bg_gradient`, so it does **not** fire for an operator who
   sets a sweep and no background. Emit it from the sweep branch too. When both fire, the two rules
   sit on the same selector with compatible declarations (the `itemBg` one adds
   `isolation:isolate` and a radius); that is harmless duplication, not a conflict.
2. ⛔ **`{link}{border-bottom-color:transparent;}`.** This is what makes G6 true rather than hoped
   for. `bottom:0` on an absolutely-positioned child resolves against the containing block's
   **padding** box, while a real `border-bottom` paints on the **border** box — so a band at
   `bottom:0` sits *above* the border rather than on it, and an operator who set both a bottom
   border colour and a sweep would see two horizontal lines. Suppressing the border's own colour
   and positioning the band to occupy exactly the border strip gives one painted line whose
   geometry is provably identical to where the border would have been.
3. **The band itself**, on the link's freed `::after` (FR-41-4 items 6 + 7), sized to the
   operator's bottom border width and offset outward by that same width so it lands on the
   transparent strip:

```
{link}::after {
  content: ""; position: absolute; inset-inline: 0;
  bottom: calc(-1 * <itemBorderWidth.bottom>);
  height: <itemBorderWidth.bottom>;
  background-image: linear-gradient( to right, <HOVER> 50%, <NORMAL> 50% );
  background-size: 200% 100%;
  background-position: 100% 0;
  background-repeat: no-repeat;
  transition: background-position 300ms ease;
  pointer-events: none;
}
/* guarded hover + unguarded focus-visible, via the 4-arg helper form */
{link}:hover::after { background-position: 0 0; }
```

`right-to-left` mirrors it: gradient stops swapped and the resting/hover `background-position`
values exchanged.

**The other two treatments emit no band, no `border-bottom-color:transparent`, and no
`position:relative`** — and they differ from each other only in what `sgs_border_states_css()` is
handed, per FR-41-23's fixed three-option vocabulary:

| `itemBorderHoverTreatment` | What `sgs_border_states_css()` receives |
|---|---|
| `swap` *(default)* | The full `$map` — Normal, Hover and Current border colours all emit, on every edge. Byte-identical to a pre-0.4.0 build. |
| `none` | `hover` unset on every edge. The border does not change on hover; Current still emits (Current is not a hover state — FR-41-23). The Hover swatch stays stored. |
| `sweep` | `hover` and `current` unset on the BOTTOM edge only, per the rule above; every other edge behaves as `swap`. |

⚠ **A sweep with no bottom border width set emits nothing.** There is no line to sweep. Say so in
the control's help text rather than letting an operator pick a direction and see no change.

These are the **actual** values in the proven precedent, not a simplification —
`plugins/sgs-blocks/src/blocks/business-info/style.css::.sgs-business-attribution .sgs-business-info__link`
declares `linear-gradient( to right, var(--sgs-bi-link-hover-text, #d4a73c) 50%, currentColor 50% )`,
`background-size: 200% 100%`, `background-position: 100% 0`, `background-repeat: no-repeat`,
`transition: background-position 300ms ease`, and its `:hover, :focus-visible` rule sets
`background-position: 0 0`. The one thing this spec does **not** copy is that rule's
`background-clip: text` / `-webkit-text-fill-color: transparent` pair — that precedent sweeps the
GLYPHS; this sweeps a separate band element, so it needs no clip, no `@supports` fallback, no
`forced-colors` rescue and no `print` rescue.

⛔ **A `prefers-reduced-motion` companion rule is MANDATORY**, matching the precedent's own:

```
@media (prefers-reduced-motion: reduce) { {link}::after { transition: none; } }
```

Keep both end states, drop only the travel between them. The colour still changes on hover — it is
an affordance, not decoration — it just arrives whole instead of sweeping. Every animated hover
effect in this codebase pairs with one of these; the retired underline branch carried one too, and
that pairing carries forward even though its own rule does not.

⚠ **Emit these rules from `render.php` through the hover helpers — NOT from `style.css`.** The
reason is that the sweep's two colours are **operator attributes**, so the rule cannot be static
CSS at all. (`background-position` is classifiable, not a problem: it is a listed member of
`MOTION_PROPERTIES` in `plugins/sgs-blocks/scripts/hover-guard/classify.js`, added specifically for
this same `business-info` sweep. The build gate would handle it fine — the block simply cannot know
the colours at build time.) Emitting from PHP routes the rule through
`sgs_hover_state_rules( $link_sel, 'background-position:0 0', ':focus-visible', '::after' )`, which
carries both touch layers and splits the focus rule out unguarded.

---

## 5. The submenu

### FR-41-9 — The submenu split: the PANEL and the LINKS are different things

✅ **Re-checked against owner point 1 (0.4.0) — confirmed already correct, nothing to remove.**
The owner's exact question: *"Is there any point having a colour control for the submenu PANEL
background if it's never visible?"* Read against this FR and §8.4/§8.6(c) below: the panel
(`submenuBg`) is declared **Normal-only, with no `Hover`/`Current` siblings anywhere in the
attribute list, the `block.json` manifest, or §9** — there never was a dead "submenu panel
background *hover*" control to remove. The thing that IS hoverable, `submenuLinkBg` /
`…Hover` / `…Current`, is a distinct, correctly-3-state attribute family on the LINK, exactly
as the owner's own framing requires ("submenu items should obviously have their own bg colour").
No spec change needed here; stated for the record because the artifact never said so plainly.

Confirmed by the owner in plain terms: *"submenu items should obviously have their own bg colour,
just the whole submenu [panel] can't [get one] because the bg is never visible [in a hoverable
state alone]."*

**The PANEL** — `.sgs-nav-menu__submenu`, the floating container. It is **Normal-only for every
property that has states**: background, border colour and shadow. A bare panel is never itself the
hovered surface, and it is never "the current page" either.

⛔ **This applies to the BORDER as much as the background — they are the same argument.** A panel
that cannot be hovered for one property cannot be hovered for another. There is no
`submenuBorderColourHover`, no `submenuBorderColourCurrent`, and no `submenuBorderHoverAnimation`.
This matches the panel's own established reasoning and the identical reasoning already applied to
its shadow in §9.9 (*"a floating panel has no meaningful hover or current shadow: it is either
rendered (open) or absent (closed)"*).

⛔ **`plugins/sgs-blocks/src/blocks/nav-menu/block.json::supports.sgs.colourExemptions`'s `submenu-bg` entry is KEPT, with its reason sharpened.**
Its `"rule": "states"` claim is still TRUE and the entry is what stops a conformance gate demanding
a hover state that has no meaning. Its current wording justifies the absence of a hover state
correctly; extend it to also name where the hoverable surface actually is, so a future reader is
pointed at `submenuLinkBg*` rather than concluding the panel is a gap. **Keep the `indicator` entry
too** (`pointer-events: none`, structurally unhoverable — still true). Add a matching entry for
the panel's border under the same reasoning.

**The LINK** — `.sgs-nav-menu__sublink`. Gains a genuine 3-state background as **NEW** attributes
with names distinct from the panel's:

| Attribute | Type | Default |
|---|---|---|
| `submenuLinkBg` | string | `""` |
| `submenuLinkBgHover` | string | `""` |
| `submenuLinkBgCurrent` | string | `""` |
| `submenuLinkBgGradient` | string | `""` (Normal-state gradient sibling) |

⛔ **Do NOT reuse `submenuBg*` names for the link.** Two elements sharing one attribute prefix is
exactly the element-conflation this split exists to end, and the block's own manifest already warns
about it: the `sublink` element declares `"prefix": ""` precisely because *"a \"submenu\" prefix
would wrongly try to claim submenuAlign/Caret/CloseGrace/MinWidth/Radius/Padding, which belong to
the submenu PANEL rather than to this anchor"*.

The submenu link's **text** colour gains its Current state on the existing naming line:
`submenuColourCurrent` (string, `""`), sibling of `submenuColour`/`submenuColourHover`.

### FR-41-10 — Submenu open animation

**Verified gap:** the dropdown appears via a binary display toggle and nothing else —
`render.php` emits `{uid} .sgs-nav-menu__submenu-wrap{…display:none;}` and
`{uid} [data-sgs-mega-trigger][aria-expanded="true"] ~ .sgs-nav-menu__submenu-wrap{display:block;}`.
There is no fade, no slide, and no control over either.

**`submenuAnimation`, string, default `"none"`.** Values: `none` (matches today exactly) | `fade` |
`slide-down`. PHP-validated, no JSON enum, same reasoning as FR-41-8. Control:
`ToggleGroupControl` + `ToggleGroupControlOption` — three options, inside the framework's
data-driven segmented threshold.

⛔ **A `prefers-reduced-motion: reduce` companion is mandatory** for `fade` and `slide-down`: the
panel still opens, it just arrives whole. A panel that fails to open under reduced motion is a
broken menu, not a calmer one.

Placement: the existing **"Dropdown (only affects items with sub-items)"** `ToolsPanel` (§9.9),
beside the other panel-level behaviours.

> ✅ **STATUS: BUILT AND FULLY WIRED END TO END (2026-09-11).** ⛔ An earlier build state had the
> control and the CSS but **no render consumer** — a stored value changed nothing. That gap is
> closed; the chain below is the mechanism, and every link in it is verified:
>
> | Link | Where |
> |---|---|
> | Control | `plugins/sgs-blocks/src/blocks/nav-menu/DropdownStylePanel.js` — a `ToolsPanelItem` wrapping the three-option `ToggleGroupControl`, `hasValue`/`onDeselect` both keyed on `'none'` |
> | Storage | `plugins/sgs-blocks/src/blocks/nav-menu/block.json::attributes.submenuAnimation`, `"type":"string"`, default `"none"`, **no JSON `enum`** (FR-41-8's reasoning) |
> | Validation | `plugins/sgs-blocks/src/blocks/nav-menu/render.php` — the renderer's constructor reduces `$attributes['submenuAnimation']` to `$submenu['animation']` via `in_array( …, array( 'fade', 'slide-down' ), true ) ? … : 'none'`, so an out-of-vocabulary stored value degrades to `none` rather than reaching the markup |
> | Markup | `plugins/sgs-blocks/includes/nav-menu-markup.php` — the wrap's class is `'sgs-nav-menu__submenu-wrap'` plus `' sgs-nav-menu__submenu-wrap--' . $submenu['animation']` **only when it is not `none`**, so the default emits byte-identical markup |
> | Paint | `plugins/sgs-blocks/src/blocks/nav-menu/style.css::.sgs-nav-menu__submenu-wrap--fade` / `::.sgs-nav-menu__submenu-wrap--slide-down` → `@keyframes sgs-nav-menu-submenu-fade-in` / `sgs-nav-menu-submenu-slide-down-in` |
>
> ⛔ **It is a CSS `animation`, not a `transition`, and that choice is load-bearing — do not
> "simplify" it.** The trigger is still the pre-existing binary `display:none → block` toggle on the
> wrap, which a `transition` cannot animate at all; toggling an element's own `display` **restarts**
> any `animation` declared on it, so a modifier class that is merely PRESENT makes every open
> animate with **no JS replay logic**.
>
> ⛔ **The mandatory reduced-motion companion collapses `animation-duration` to `0.01ms !important`
> — it does NOT remove the animation.** Removing it would strand the wrap at its `from` keyframe
> (`opacity: 0`) — invisible, not calmer, i.e. the broken menu this FR's own ⛔ refuses. Collapsing
> the duration lands it on the `to` end state instantly, so the panel still opens.
>
> ⚠ **Bar-only, correctly.** `.sgs-nav-menu__submenu-wrap` is a bar-fork class; the drawer's native
> `<details>` accordion never renders it (FR-41-1), so it has no open animation and needs none.

### FR-41-11 — Submenu top offset, and the hover-bridge it requires

**Verified gap:** the gap between the bar and the dropdown is `top:100%` on
`{uid} .sgs-nav-menu__submenu-wrap` — a hardcoded value with no attribute behind it.

**`submenuTopOffset`, string, default `""`.** Control: `SgsLengthControl` with `presets={ false }`,
rendered as a `ToolsPanelItem` in the existing "Dropdown" `ToolsPanel` beside `submenuMinWidth` and
the border — byte-identical in shape to those two. Empty renders today's output exactly. Emitted as
`top: calc(100% + <offset>)` so the `100%` anchor is preserved and only the gap is operator-owned.

⛔ **A non-zero offset creates a hover dead strip, and that reintroduces the exact bug FR-41-13
exists to fix. It MUST ship with the bridge below, in the same build.** The gap between the bar
and the panel belongs to neither element, so as the pointer crosses it neither is hovered and the
parent flickers back to its resting paint mid-journey.

⛔ **`submenuCloseGrace` does NOT cover this — do not cite it as if it does.** Verified in
`plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js::leaveBridge`: it is a
`window.setTimeout` on the bridge element's `mouseleave` that defers setting `ctx.isOpen = false`.
It governs **openness** — whether `[aria-expanded="true"] ~ .submenu-wrap{display:block}` still
applies — and never touches CSS `:hover` at all. The panel correctly stays open across the gap
today; the parent's paint does not.

**The fix — a CSS hover-bridge pseudo-element, emitted only when an offset is set:**

```
{uid} .sgs-nav-menu__submenu-wrap::before {
  content: ""; position: absolute; left: 0; right: 0;
  bottom: 100%; height: <submenuTopOffset>;
  pointer-events: auto;
}
```

Four facts that make this safe, each verified:

1. **`.sgs-nav-menu__submenu-wrap::before` is unused.** `grep -rn "submenu-wrap::" plugins/sgs-blocks/src/`
   returns nothing; no rule in `render.php` or `style.css` claims it.
2. **The wrap is already `position:absolute`**, so it is its own containing block and the bridge
   needs no extra positioning setup.
3. **A closed panel cannot intercept anything.** The wrap is `display:none` until
   `[aria-expanded="true"]`, and a `display:none` element has no pseudo-elements — so the bridge
   only exists while the panel is open, and never sits invisibly over the bar.
4. **Bar-only, correctly.** `submenuTopOffset` targets `.sgs-nav-menu__submenu-wrap`, which the
   drawer fork does not render at all (FR-41-1). The drawer's accordion has no offset and no gap,
   so it needs no bridge.

---

## 6. The menu trigger

### FR-41-12 — The burger gains a mode + label. The close side is a `sgs/nav-drawer` companion.

⛔ **The panel is named "Menu Button" (owner-locked, 0.4.1).** "Burger" is jargon; "Menu Trigger"
is a developer's word for a thing a client thinks of as a button. It carries the same plain-English
help text as its opening line — *"Controls the button that opens the mobile menu (the 'burger')."*
— so an operator who DOES know the jargon still finds it. See §9.3.

⚠ **This is a LABEL change only. No attribute is renamed.** `triggerMode`, `triggerLabel`,
`triggerIcon`, `triggerMagnet*` and the whole `burger*` family keep their existing names. A rename's
blast radius is the whole write path — the converter emits these names too — and there is nothing
to buy here that a panel heading does not already buy (§8.4's zero-renames rule).



**Verified gap on the OPEN side (`sgs/nav-menu`).** The burger renders as a hardcoded Lucide
`menu` icon inside a `<button class="sgs-nav-menu__burger">` with an `aria-label` — verified at
`render.php`'s `$burger_icon = sgs_get_lucide_icon( 'menu' );` and the `sprintf()` that emits the
button. Its only controls are `burgerColour` / `burgerColourGradient` / `burgerBg` /
`burgerBgGradient` / `burgerHoverColour` / `burgerColourHover` / `burgerSize`. There is no
icon-vs-text choice and no shape choice of any kind.

**New on `sgs/nav-menu`:**

| Attribute | Type | Default | Purpose | Control |
|---|---|---|---|---|
| `triggerMode` | string | `"icon"` | `icon` \| `text` \| `icon-and-text`. PHP-validated, no JSON enum. | `ToggleGroupControl` + `ToggleGroupControlOption` (three options) |
| `triggerLabel` | string | `"Menu"` | The visible word, used by `text` and `icon-and-text`. | native `TextControl` with `__nextHasNoMarginBottom __next40pxDefaultSize`, matching this block's existing `navLabel` / `drawerRef` text fields — **not** `SgsFreeTextField`, which has zero adopters on this block |

`icon` renders exactly today's output, byte-identical. `text` replaces the SVG with
`<span class="sgs-nav-menu__burger-text">`. `icon-and-text` renders both, the icon first, in the
existing flex button.

⚠ **The `aria-label` cannot simply be "dropped" — it lives inside a format-string literal.**
Verified: `render.php` builds the button with a single `sprintf()` whose format string contains
`aria-label="%s"` verbatim, fed `esc_attr__( 'Open menu', 'sgs-blocks' )`. There is no variable
holding the attribute that could be set empty; passing `''` emits `aria-label=""`, which is an
*empty accessible name*, strictly worse than the mismatch it was meant to fix. **The format string
itself must be assembled conditionally** — build the button's attribute segment as a variable
(`$aria_attr = 'icon' === $trigger_mode ? sprintf( ' aria-label="%s"', esc_attr__( 'Open menu',
'sgs-blocks' ) ) : '';`) and interpolate that.

Why it must go at all: under `text` and `icon-and-text` the visible word IS the accessible name, so
an `aria-label` saying something different breaks SC 2.5.3 Label in Name for voice control. Under
`icon` it stays.

⚠ **`aria-hidden="true"` on the icon under `icon-and-text`.** With a real visible word beside it
the SVG is decorative, and this file already sets that convention on exactly this shape:
`.sgs-nav-menu__sublink-marker` and `.sgs-nav-menu__caret` both carry `aria-hidden="true"` on a
decorative icon rendered next to real text. Under `icon` mode the SVG is the only content and the
button's own `aria-label` names it, so it stays as-is.

⚠ **The button cannot stay a fixed square in the non-icon modes.** Verified: `burgerSize` drives
`width`, `height`, `min-width` and `min-height` in one `render.php` rule, and is declared twice in
the `burger` element's `attrMap` (`css:width` and `css:height` both → `burgerSize`). A word does not
fit a 44px square. **Under `text` and `icon-and-text`, emit `min-width: <burgerSize>` and
`width: auto` in place of the fixed `width`; keep `height` and `min-height` as they are** so the
44px touch-target floor survives. Under `icon` the rule is unchanged.

**The CLOSE side lives in `sgs/nav-drawer`'s own `block.json` — and as of 0.4.7 it is IN SCOPE for
THIS phase, owner-ruled 2026-09-11.** ⚑ **This reverses 0.4.1–0.4.6, which recorded the close-side
gaps as a cross-block companion for "that block's own track". They are now built here**, as a step
that runs immediately after the Menu Button work and mirrors it directly — same shared helpers, same
control shape, copied rather than redesigned. The reason for the reversal is the cost the old wording
itself named: until it lands, the open side has an editable label and an icon picker and the close
side has neither, which reads to an operator as half-finished. Building it beside the pattern it
copies is cheaper than building it cold later.

Verified: `sgs/nav-drawer` owns the close button and already declares `closeStyle` (string, default
`"separate-x"`, a real JSON enum `["separate-x","text-swap","burger-morph"]`), rendered by its own
`render.php`.

**What already exists and must NOT be rebuilt.** The close button's 2-state colour pairing is done:
`toggleCloseColour` / `toggleCloseColourHover` / `toggleCloseColourGradient`, declared on
`supports.sgs.elements.close` with explicit base and `states.hover` `attrMap`s, emitted via
`sgs_text_colour_decl()` + `sgs_hover_state_rules()`. The close side is not missing colour control;
it is missing the label and the glyph choice.

**The two real gaps, both now built:**

1. **No editable label.** `text-swap` hardcodes the string — verified:
   `'<span class="sgs-nav-drawer__close-text">' . esc_html__( 'Close', 'sgs-blocks' ) . '</span>'`.
   → **new `closeLabel` (string, default `"Close"`)**, the mirror of `triggerLabel`, same
   `TextControl` mount. ⛔ When `closeLabel` resolves empty, the hardcoded
   `aria-label="Close menu"` must SURVIVE — `aria-label=""` is an empty accessible name and strictly
   worse than the mismatch, the identical trap this FR records on the open side.
2. **No icon choice and no icon-and-text form.** The glyph is a hardcoded
   `sgs_get_lucide_icon( 'x' )`. → **new `closeIcon` (object, default
   `{"source":"lucide","name":"x"}`)**, resolved through the SAME source-aware resolver `sgs/icon`
   uses (FR-41-30(a)'s mechanism), plus a fourth `closeStyle` value.

⛔ **0.4.6 and earlier asserted "its mode choice is adequately covered and needs no new enum." That
is WITHDRAWN, and the reason is the thing worth recording.** `closeStyle` looks like `triggerMode`'s
twin and is not: `separate-x` and `text-swap` ARE the icon/text display axis, but **`burger-morph` is
a GLYPH choice, not a display mode** — a CSS-drawn two-bar `<span class="sgs-nav-drawer__close-bars">`
that reads as an X, with no icon and no text. The attribute conflates two orthogonal axes, so a
one-to-one rename to `triggerMode`'s three values would silently delete a shipped look.

**Resolution — additive, no rename, no deletion.** `closeStyle` keeps its name, its default and its
three existing values, and gains a FOURTH: `icon-and-text`. ⚠ It carries a real JSON `enum` today (a
pre-existing declaration, unlike this spec's new small string attributes, which are PHP-validated
with no enum), so the new value must be added to **`plugins/sgs-blocks/src/blocks/nav-drawer/block.json::attributes.closeStyle.enum` AND
`plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$sgs_nd_allowed_close_styles`, in the same commit** — an enum value accepted by one side
and rejected by the other coerces silently to the default with no error on either.

> ✅ **STATUS: BUILT (2026-09-11).** All three parts landed on `sgs/nav-drawer`, verified:
> `plugins/sgs-blocks/src/blocks/nav-drawer/block.json::attributes.closeStyle.enum` and
> `plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$sgs_nd_allowed_close_styles` **both**
> carry all four values (the same-commit parity this FR demands); `closeLabel` and `closeIcon` are
> declared and mounted in `plugins/sgs-blocks/src/blocks/nav-drawer/edit.js`; and the empty-label trap is closed —
> `render.php` falls back to the hardcoded `esc_attr__( 'Close menu', 'sgs-blocks' )` whenever the
> operator's label trims to empty, so `aria-label=""` is never emitted.
>
> ⛔ **ONE THING DRIFTED FROM THIS SPEC'S OWN WORDING, AND THE SHIPPED CODE IS RIGHT: the new
> option's LABEL is "Both", not "Icon and text".** Same 12-character `ToggleGroupControl` bound as
> the open side (Spec 35 Part O / D812 — a bound this very attribute produced, via `burger-morph`).
> **The STORED enum value is unchanged at `icon-and-text`; only the displayed label text was
> shortened.** ⛔ Never shorten the VALUE to match the label — keeping `icon-and-text` is precisely
> what gives the open and close sides one vocabulary. The other three labels are pre-existing:
> `× icon` / `“Close” text` / `Morphed icon`.

⛔ **The magnetic-pull trio (FR-41-31) is NOT mirrored onto the close button.** The gaps named here
are label and icon-and-text. A magnet on a close control inside an open modal is a different design
question, not a symmetry gap, and is not in scope.

⚠ `closeIcon` and `closeLabel` route no CSS property, so — exactly as §8.6(e) rules for
`triggerMode`/`triggerLabel` on the open side — they get **no `supports.sgs.elements` members**.
Declaring them would create phantom routing slots.

⚠ `sgs/nav-drawer` is outside this spec's §11 gate set, which is scoped to `sgs/nav-menu`. The close
button's acceptance conditions therefore live in the build plan's own step, not as a new G-number:
enum parity across both lists, a non-empty accessible name when `closeLabel` is empty, and a
`closeIcon`-unset byte-identity proof (the same shape G15 applies on the open side).

Panel: the existing "Burger" panel is renamed **"Menu Button"** and carries `triggerIcon`,
`triggerMode`, `triggerLabel`, `burgerSize` and the FR-41-31 magnetic-pull trio. Its colours stay
in the single Colour panel's **Menu button** grouping (§9.6).

---

## 7. Three behaviours that are fixes, not controls

### FR-41-13 — A parent item stays in its Hover state while its own dropdown is hovered

**Problem (verified in code).** `render.php`'s `$hover_targets` is exactly two selectors —
`{$link_sel}:hover` and `{$link_sel}:focus-visible`. Nothing watches "is a descendant of my submenu
currently hovered". So the moment the pointer leaves the parent link and enters the dropdown it
just opened, the parent snaps back to its resting colour while its panel is still open.

**Effect.** An open panel with no visible parent — it reads as broken, and it breaks the "you are
inside this branch" affordance Spec 36 FR-36-4's "distinct hover+focus states" is asking for.

**Solution — FOUR rules: a mouse half and a keyboard half, PER FORK.** One rule cannot cover both
forks, because the wrapper element between the `<li>` and the link has a different class in each
(FR-41-1's DOM table). Read that table before touching any of these.

**The mouse half needs no `:has()` at all.** `:hover` matches every ANCESTOR **in the DOM tree** of
the element the pointer is over — including an ancestor whose box does not visually contain the
target, which is the case here since the panel is absolutely positioned. So hovering into the panel
keeps the fork wrapper's own `:hover` true for free:

```
/* BAR */
{uid} .sgs-nav-menu__submenu-root:hover > .sgs-nav-menu__link

/* DRAWER */
{uid} .sgs-nav-menu__accordion-row:hover > .sgs-nav-menu__link
```

⛔ **The `>` child combinator is what stops the rule repainting sublinks inside the open panel, and
it is load-bearing — do not relax it to a descendant space.** In both forks the trigger link is a
*direct child* of the wrapper, while every `.sgs-nav-menu__sublink` sits two or more levels deeper
inside `ul.sgs-nav-menu__submenu`. A descendant selector would also match nothing extra *today*
(sublinks carry a different class), but it would silently start matching the moment any nested
structure gains a `.sgs-nav-menu__link` — and the whole point of the rule is that the PARENT keeps
its look, not that everything in the branch does.

⚠ **`.sgs-nav-menu__submenu-root` is dropdown-only and needs no `--has-submenu` qualifier.** The
mega-menu fork emits `.sgs-nav-menu__mega` instead, so the class already scopes itself.

**The keyboard half genuinely needs `:has()`**, because focus does not bubble the way hover does.
Both forks key on `ul.sgs-nav-menu__submenu` — the one class present in both:

```
/* BAR */
{uid} .sgs-nav-menu__submenu-root:has( .sgs-nav-menu__submenu :focus-visible ) > .sgs-nav-menu__link

/* DRAWER */
{uid} .sgs-nav-menu__accordion-row:has( .sgs-nav-menu__submenu :focus-visible ) > .sgs-nav-menu__link
```

⛔ **Never key the `:has()` on `.sgs-nav-menu__submenu-wrap`.** That class exists in the bar fork
only; a rule using it silently does nothing for every drawer instance, and a drawer is where
keyboard navigation of a nested menu is most common.

**Four binding implementation notes:**

1. **"Panel is open" needs no extra condition.** In the bar a closed panel is `display:none`, so
   nothing inside it can be hovered or focused. In the drawer the `<ul>` lives inside a closed
   `<details>`, which the browser hides for the same effect. Openness is implied by construction in
   both forks.
2. **Route each `:hover` variant through `sgs_hover_guarded_rule()`, not `sgs_hover_state_rules()`.**
   The `:hover` is already inside the built selector, and `sgs_hover_state_rules()` would append a
   second one. Emit each `:focus-visible` variant separately and **unguarded**, per the helper
   file's own contract.
3. **All four rules out-rank the plain hover rule, and that is harmless because the declarations
   are identical.** The plain `{link}:hover` is `(0,3,0)`; each mouse rule is `(0,4,0)` (three
   classes plus `:hover`) and each keyboard rule is `(0,5,0)` (three classes plus `:has()`, which
   takes the specificity of its most specific argument — `.sgs-nav-menu__submenu :focus-visible`
   = `(0,2,0)`). ⛔ **This must never be used to smuggle in different declarations** — the whole
   point is that the parent keeps the *same* hover look.
4. **The declarations are literally the Hover-state declarations, produced by the same emitter
   call** — not a hand-copied duplicate. A copy is how the two drift.

⚠ **`:has()` browser floor, documented rather than silently omitted.** Safari 15.4 (March 2022),
Chrome/Edge 105 (August 2022), **Firefox 121 (December 2023)** — Baseline "widely available" from
2023-12-19. Firefox is the binding constraint. On an older Firefox the *keyboard* half silently
does not apply; the *mouse* half, which needs no `:has()`, works everywhere. That is a graceful,
bounded degradation of a progressive enhancement, and it is why the two halves are split rather
than written as one `:has()` rule covering both.

### FR-41-14 — `indicatorStyle: 'pill'` suppresses per-item Hover/Current BACKGROUND

⚑ **SUPERSEDED IN PART BY FR-41-25 (0.4.0).** Owner point 10: *"We have no need for an
indicator panel."* A standalone top-level "Indicator" panel (§9.10 in v0.3.0) holding one
`ToggleGroupControl` (None/Pill) is a second, independent switch for the SAME visual outcome
this FR already suppresses per-item background states for — the panel and the suppression rule
were already two halves of one idea, just split across two places in the inspector. **The
`indicatorStyle` attribute and the standalone Indicator panel are RETIRED.** `pill` becomes the
third option (`'highlight'`) on the item Background row's own hover-treatment selector
(FR-41-23) — selecting it IS what used to be `indicatorStyle: 'pill'`, and the suppression logic
below (per-STATE omission, not per-ROW; stored values not cleared; `render.php` skip) is
**unchanged and still authoritative** under the new trigger condition
`'highlight' === itemBgHoverTreatment`. ⛔ **`indicatorColour` / `indicatorColourGradient` are
DELETED (0.4.1).** The pill still needs a colour; it reads the Item background row's OWN Hover
swatch — `itemBgHover` / `itemBgHoverGradient` — the same swatch `Swap` and `Sweep` read, per the
colour-reuse rule in §0. See FR-41-25 for the full fold and §9.6 for the placement.

⛔ **THIS FR'S SUPPRESSION IS WORK THIS SPEC BUILDS — IT IS NOT A DESCRIPTION OF SHIPPED BEHAVIOUR
(clarified 0.4.4, and G5a's migration precedence turns on it).** Verified in `render.php`: today,
`indicatorStyle` gates exactly two things — the `data-sgs-nav-indicator` attribute on the bar, and
the indicator's own fill rule (`if ( 'pill' === $indicator_style && '' !== $indicator_colour )`).
**There is no per-item background suppression anywhere in the file.** The `hoverStyle === 'pill'`
branch paints `background-color` on the link on hover regardless of `indicatorStyle`, so on a
pre-migration page with both set, `indicatorColour` and `itemBgHover` were **both painted and both
visible** — the pill behind, the item's own fill on the item. ⚠ **Read the "would paint a second
background" sentence below as the future-conditional it is.** A reader who takes this FR as
describing current behaviour will conclude the stored `itemBgHover` was invisible pre-migration and
flip G5a's precedence on a false premise; it was not invisible, and G5a's rule is correct as
written.

**Problem.** `indicatorStyle: 'pill'` (existing, default `"none"`) renders
`.sgs-nav-menu__indicator` — one shared background shape that slides between items — precisely so
per-item backgrounds do **not** flash. Per-item `itemBgHover` / `itemBgCurrent` would paint a
second background behind the same item at the same moment. Two mechanisms, one surface.

**Solution — a mechanical UI conditional, not a new toggle for the operator to reason about.**

When `itemBgHoverTreatment === 'highlight'`:

- The **Background** row in the Colour panel's Menu grouping renders with its **Current** state
  **OMITTED**. The row itself, its Normal state and its **Hover** state always render — the Hover
  swatch is what the pill is PAINTED IN (§0's colour-reuse rule), so omitting it would leave the
  operator no way to colour the thing they just switched on.
- `render.php` **skips emitting the per-ITEM hover and current background declarations** — the pill
  is the one background shape for both non-resting states. It reads `itemBgHover` /
  `itemBgHoverGradient` as its own fill instead.
- Text colours (all three states), the border (all three states), the radius and the menu button are
  **unaffected**.
- The stored `itemBgCurrent` value is **not cleared**. Switching the treatment back to `swap`
  restores it intact.

⛔ **Per-STATE, never per-ROW.** Dropping the whole row would also remove the Normal-state
background control (which the pill does not replace) and the Hover swatch (which the pill READS).
The array literal reads:

```js
states: [ normalBg, hoverBg, ...( 'highlight' !== itemBgHoverTreatment ? [ currentBg ] : [] ) ]
```

⛔ **OMIT, never disable.** `SgsColourPanel` runs `rows.filter(Boolean)` and the caller inlines the
condition directly in the array literal — D609 field 9c, reference implementation
`plugins/sgs-blocks/src/blocks/icon-list/edit.js::Edit`. A greyed-out control a client can find and
click to no effect is the failure this rule exists to prevent.

⚠ **The conditionality stays statically resolvable.** A spread of a conditional literal array is an
`ArrayExpression` whose elements the detector can count in both branches; a `.filter()` on a fixed
array is not (FR-41-2).

**Surfaced where the change happens.** The treatment control carries inline help text in plain
language — e.g. *"Highlight paints one shape that slides between items, using the Hover colour you
picked above. It replaces each item's own current-page background, so that swatch is hidden while
it's selected."* An unexplained disappearance reads as a bug; with the control and the consequence
now in the same panel (0.4.1), there is only one place to say it.

### FR-41-15 — Every existing hardcoded state/paint rule is DELETED or CONVERTED. None is left standing.

> ✅ **STATUS: EXECUTED 2026-09-11.** All eleven dispositions — **6 DELETE (#3, #4, #5, #6, #8,
> #10) · 3 CONVERT (#1, #7, #9) · 2 KEEP (#2, #11)** — have been applied to the real code, along
> with the two `[aria-current="page"]` CONVERTs that sit in the fate table without being in the
> census. ⛔ **The requirement text below is NOT replaced by this note** — it stays as the standing
> rule that binds every future edit, and its methodology is now enforced mechanically by
> **FR-41-35** (`plugins/sgs-blocks/scripts/check-ungated-paint-rules.py`, built; WARN-ONLY until
> the G20c(f) flip step runs).
>
> ⛔ **Where the surviving rules now live — READ THIS BEFORE RE-RUNNING THE CENSUS.** The census was
> written against a 2,031-line monolithic `render.php`. That file no longer holds most of them: it
> was split into **SIX** PHP files (§0a.1 — `render.php` + FIVE `plugins/sgs-blocks/includes/nav-menu-*.php`), not the
> originally-planned four. **A re-run scanning `render.php` alone now sees almost nothing and would
> report a clean tree** — which is this FR's own recorded failure mode (a search bounded one notch
> narrower than the defect) in its fourth costume. Scan the roster from `ls`, never from prose.
>
> | # | Fate | Where it is NOW |
> |---|---|---|
> | 1 | CONVERT | `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` — the drawer's panel override; the `border:0` half is now gated on `submenuBorderWidth` being empty |
> | 2 | KEEP | `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` — the drawer's structural sub-item indent, unchanged |
> | 3 | DELETE | gone (`grep -rn "currentColor 15%"` hits only census #11 in `style.css`) |
> | 4 | DELETE | gone (`grep -rn "currentColor 12%"` returns nothing) |
> | 5 | DELETE | gone (`grep -rn "currentColor 8%"` hits only the `@supports` a11y rescue at `style.css`, which is DISMISSED, not censused) |
> | 6 | DELETE | gone (`grep -rn "preset--color--surface, rgba"` returns nothing) |
> | 7 | CONVERT | `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` — now gated on `featuredBg`/`featuredBgGradient`/`featuredColour` actually being set, the hardcoded `primary` fallback dropped, and `background:` → `background-color:` |
> | 8 | DELETE | gone; a ⛔ comment stands in its place at `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` recording why, so it is not re-added |
> | 9 | CONVERT | `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` — see the corrected per-declaration table below |
> | 10 | DELETE | gone from `plugins/sgs-blocks/src/blocks/nav-menu/style.css` |
> | 11 | KEEP | `plugins/sgs-blocks/src/blocks/nav-menu/style.css::.sgs-nav-menu__drill-back-btn`, unchanged |
> | *(bar current-page colour)* | CONVERT | `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` — `--sgs-nm-submenu-current-colour` now has a real writer, from `submenuColourCurrent` |
> | *(bar current-page weight)* | CONVERT | `plugins/sgs-blocks/includes/nav-menu-css.php` + `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` — reads `itemFontWeightCurrent` under FR-41-6's never-lighter guard |

⛔ **THE CENSUS IS SCOPED BY DEFECT SHAPE, ACROSS BOTH OF THE BLOCK'S CSS SURFACES, WITH A
STATEMENT-AWARE SCAN (corrected 0.4.5 — third correction, and the first that fixes the TOOL).**

The history matters because it is the same failure three times, each time with the search bounded
one notch narrower than the defect:

| Pass | Bound that hid the rules | What it missed |
|---|---|---|
| 0.4.2 | literal-string scan — didn't look inside helper arguments | census #4 (emitted via `sgs_hover_guarded_rule()`) |
| 0.4.3 | `awk 'NR>=1700 && NR<=1800'` — a LINE RANGE around the drawer block | census #6, 100 lines earlier, on the bar |
| 0.4.4 | a LINE-ANCHORED grep, and only `render.php` | census #7, #8 (multi-line concatenations), #9, and **every rule in `style.css`** (#10, #11) |

⛔ **0.4.4's own published grep could not have found census #7 or #8 no matter how many times it
was re-run, and that is the whole lesson.** It pipes `grep -nE '\$css \.=' … | grep -E
'background|border'` — both halves match **one physical line**. Census #7 and #8 are multi-line PHP
concatenations whose `background:` declaration sits on a *different line* from its `$css .=`, with a
`//` comment between them in #7's case. The net had a hole shaped exactly like the two rules it
missed. A census is only as complete as the command that produced it, and a command that cannot
span a statement cannot census a language that spans statements.

**The corrected methodology — STATEMENT-aware, both files, defect-shape-scoped.** A rule enters the
census when it carries a `background` or `border` declaration that is **not gated on an operator
attribute**. Bar-scoped and drawer-scoped alike; resting, `:hover` and `[aria-current]` alike;
literal-concat and helper-call alike; PHP-emitted and statically authored alike.

```python
# .claude/specs/41 FR-41-15 census — run against BOTH files, per revision.
# Joins each `$css .=` / helper statement to its terminating `;` BEFORE testing,
# so a declaration on a continuation line is still seen. This is the half the
# 0.4.3 and 0.4.4 greps did not have.
import re
decl     = re.compile(r'(background|border)(-[a-z]+)*\s*:')
start_re = re.compile(r'\$css\s*\.=|sgs_hover_guarded_rule|sgs_hover_state_rules')
lines = open(PATH, encoding='utf-8').read().split('\n')
i = 0
while i < len(lines):
    if start_re.search(lines[i]) and not lines[i].strip().startswith(('*', '//', '/*')):
        buf, j = lines[i], i
        while not buf.rstrip().endswith(';') and j + 1 < len(lines):
            j += 1
            buf += ' ' + lines[j].strip()
        if decl.search(buf):
            print(i + 1, ' '.join(buf.split()))
        i = j
    i += 1
```

For `style.css` (no PHP statements to join) the equivalent net is the whole-file declaration grep,
then read each hit in its rule context:

```
grep -nE 'background|border' plugins/sgs-blocks/src/blocks/nav-menu/style.css
```

⚠ **This scan is statement-aware, not variable-aware — name the remaining bound rather than implying
none.** A declaration built into an intermediate PHP variable and appended to `$css` in a later,
separate statement (e.g. `$sgs_nm_featured_vars .= '...'` followed by a later
`$css .= $uid_sel . '{' . $sgs_nm_featured_vars . '}';`) is still outside what `start_re`/`decl` can
see, for the same reason census #7/#8 were invisible before this pass — the net only follows one
statement to its terminating `;`, not a value across two. This block's own `$sgs_nm_featured_vars`
assembly is a live instance of that exact shape; it happens not to matter today only because its
declarations are custom-property assignments (`--sgs-nm-featured-bg:`), which don't match the
`background:`/`border:` regex. The next rule built the same way, with a real property name inside
it, would repeat this whole history a fourth time. ⚑ **This is the concrete case the detector exists
to close, and the detector is no longer a proposal — DECIDED 0.4.6, specified at FR-41-35
(`check-ungated-paint-rules.py`, framework-wide, gated at G20c), with census #4/#6/#8 as its
negative controls.** Prose describing the bound does not close it, a script does — and FR-41-35
requires the script to PRINT this exact residual rather than imply completeness.

⚠ **The scan is the net, not the judgement.** Every hit is then read and classified into one of
three buckets, and **all three are published below** — a hit that is dismissed is dismissed *in
writing*, because an omission is indistinguishable from an oversight and that ambiguity is what let
the last three passes close early:

1. **GATED** — wrapped in an `if` on an operator attribute. Not a defect; listed in the dismissal
   table with its gate named, so the next reader can check the gate rather than re-deriving it.
2. **DISMISSED** — ungated but structurally incapable of the defect (a reset to `none`/`0`, a
   forced-colors a11y rule, an attribute-driven `var()` whose writer exists). Listed with the
   reason AND with the condition that would put it back in the census.
3. **CENSUSED** — a real hardcoded/ungated paint. The numbered table below.

**As of 0.4.5 the scan returns 18 `background`/`border`-carrying statements in `render.php`, and 12
`background`/`border` declarations across 7 rules in `style.css`. Eleven rules are CENSUSED; the
remainder are GATED (7) or DISMISSED (7), every one named below.** ⚠ `style.css`'s raw grep returns
20 lines — the other 8 are comment prose, `box-sizing: border-box`, `transition` strings naming
`background-color`, and an `@supports` condition. None is a paint declaration; they are excluded at
read time, not by the net.
⚠ Census numbers #1–#6 are **not renumbered** — they are cited by number elsewhere in this spec
(FR-41-26's condition 1 cites census #4 by name). #7–#11 are appended.

| # | Source | Selector | Declaration (verbatim) |
|---|---|---|---|
| 1 | `render.php` | `.sgs-nav-drawer {uid} .sgs-nav-menu__submenu` | `box-shadow:none;border:0;min-width:0;background:var(--sgs-nm-submenu-bg, color-mix(in srgb, currentColor 6%, transparent));border-radius:0;padding:0;margin:0` ⚠ **`min-width:0` corrected in 0.4.4** — 0.4.3's row paraphrased the declaration and dropped it. A census table whose quoted CSS does not match the file cannot be falsified against a grep, which is the only thing it is for |
| 2 | `render.php` | `.sgs-nav-drawer {uid} .sgs-nav-menu__sublink` | `padding:0 16px 0 12px;gap:8px;border-left:2px solid color-mix(in srgb, currentColor 25%, transparent)` |
| 3 | `render.php` | `.sgs-nav-drawer {uid} .sgs-nav-menu__item + .sgs-nav-menu__item, .sgs-nav-drawer {uid} .sgs-nav-menu__subitem` | `border-top:1px solid color-mix(in srgb, currentColor 15%, transparent)` |
| 4 | `render.php` | `.sgs-nav-drawer {uid} .sgs-nav-menu__link:hover, .sgs-nav-drawer {uid} .sgs-nav-menu__sublink:hover` (via `sgs_hover_guarded_rule()`) | `background:color-mix(in srgb, currentColor 12%, transparent)` |
| 5 | `render.php` | `.sgs-nav-drawer {uid} .sgs-nav-menu__link[aria-current="page"], .sgs-nav-drawer {uid} .sgs-nav-menu__sublink[aria-current="page"]` | `border-left:3px solid currentColor;background:color-mix(in srgb, currentColor 8%, transparent)` |
| **6** | `render.php` | **`{uid} .sgs-nav-menu__sublink:hover`** (via `sgs_hover_guarded_rule()`) — ⚠ **BAR-SCOPED, i.e. `$uid_sel`, so it fires in BOTH forks: on the bar's dropdown AND inside the drawer** | `background:var(--wp--preset--color--surface, rgba(0,0,0,.04))` — **ADDED 0.4.4** |
| **7** | `render.php` | **`{uid} .sgs-nav-menu__subitem--featured .sgs-nav-menu__sublink`** — the FEATURED sub-item's resting paint. `$uid_sel`-scoped, so both forks | `color:var(--sgs-nm-featured-colour, var(--wp--preset--color--text-inverse, currentColor));background:var(--sgs-nm-featured-bg, var(--wp--preset--color--primary, transparent));font-weight:var(--sgs-nm-featured-weight, 600);border-radius:var(--sgs-nm-featured-radius, 4px);margin:4px 8px` — **ADDED 0.4.5** |
| **8** | `render.php` | **`{uid} .sgs-nav-menu__subitem--featured .sgs-nav-menu__sublink:hover`** (via `sgs_hover_guarded_rule()`) — ⚠ **the EXACT defect signature of #4 and #6**: unconditional, ungated, `background` SHORTHAND, hover state, emitted through the helper, `$uid_sel`-scoped so it fires in BOTH forks | `color:var(--sgs-nm-featured-colour-hover, var(--sgs-nm-featured-colour, var(--wp--preset--color--text-inverse, currentColor)));background:var(--sgs-nm-featured-bg-hover, var(--wp--preset--color--primary-dark, transparent))` — **ADDED 0.4.5** |
| **9** | `render.php` | **`{uid} .sgs-nav-menu__submenu`** — the BAR's own submenu panel. Was previously carried ONLY in the narrower two-row "panel hardcodes" table below, which is what made it read as an accounting gap | `list-style:none;margin:0;padding:8px 0;min-width:var(--sgs-nm-submenu-min-width, 200px);background:var(--sgs-nm-submenu-bg, var(--wp--preset--color--surface-alt, var(--wp--preset--color--surface, #fff)));border:1px solid var(--wp--preset--color--border, transparent);border-radius:var(--sgs-nm-submenu-radius, var(--wp--custom--border-radius--medium, 8px));box-shadow:var(--wp--preset--shadow--raised, 0 4px 12px rgba(0,0,0,.1))` — **PROMOTED INTO THE NUMBERED CENSUS 0.4.5** |
| **10** | `style.css` | **`.sgs-nav-menu__item--drawer + .sgs-nav-menu__item--drawer`** — ⚠ **the static twin of census #3**, same bug class, different file | `border-top: 1px solid color-mix(in srgb, currentColor 15%, transparent)` — **ADDED 0.4.5** |
| **11** | `style.css` | **`.sgs-nav-menu__drill-back-btn`** — the JS-injected drill-down Back row | `background: none;border: 0;border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent)` — **ADDED 0.4.5** |

#### GATED and DISMISSED — published, not omitted (0.4.5)

⛔ **A hit that is not in the census above is in one of these two tables. There is no third,
unwritten category.** The previous three passes each left their dismissals implicit, which is why
"is this rule missing or deliberately excluded?" could not be answered without re-reading the file —
and why the same file was re-read three times.

**GATED — wrapped in an `if` on an operator attribute, therefore not a defect.** Verified per row;
the gate is named so it is checkable.

⚠ **Both tables below describe the PRE-EXECUTION tree (a single 2,031-line `render.php`), which is
why their rules are named by PHP variable rather than by a `path::symbol` citation.** Two of those
variables no longer exist at all — `$hover_sel` went with the `hoverStyle` pill branch FR-41-4
deletes — and the surviving emitters moved into the five `includes/nav-menu-*.php` modules (§0a.1).
⛔ **Do not "repair" these rows into live citations**: they are the record of what the census found,
not pointers to current code. The live locations are in FR-41-15's STATUS table.

| Rule (by symbol) | Gate |
|---|---|
| `render.php` — `$link_sel` base + `$link_sel::before` item-background layer | `if ( '' !== $item_bg_hex \|\| '' !== $item_bg_gradient )` — this IS FR-41-23's `::before` fill layer |
| `render.php` — `$hover_sel` pill hover fill | `if ( 'pill' === $hover_style && '' !== $item_bg_hover_hex )` |
| `render.php` — `$link_sel::after` underline bar + its hover `background-color` | inside the `hoverStyle === 'underline'` branch — **and FR-41-4 DELETES the whole mechanism**, so it leaves the tree by that FR, not this one |
| `render.php` — `$featured_sel` resting pill | `if ( $featured_bg_active )` |
| `render.php` — `$featured_sel` hover radius | `if ( $featured_radius_hover !== $featured_radius )` |
| `render.php` burger resting fill | `if ( '' !== $burger_bg )` |
| `render.php` burger hover fill | `if ( '' !== $burger_hover_slug )` |

**DISMISSED — ungated, but structurally incapable of this defect.** Each row states the reason AND
the condition that would return it to the census, so the dismissal is falsifiable rather than a
judgement call the next reader has to re-make:

| Rule (by symbol) | Why it cannot collide with an operator colour | What would put it back |
|---|---|---|
| `render.php` — `.sgs-nav-menu__mega-trigger` — `background:none;border:0;font:inherit;cursor:pointer` | It **removes** paint rather than adding any. The F3b silent-override class requires a competing *value*; `none`/`0` is the absence of one. Deleting it would restore the UA's default button chrome on an element that must read as a nav item — a regression with no control to replace it | A stateful colour row (FR-41-23) ever targeting `.sgs-nav-menu__mega-trigger`. Its `background:none` IS the shorthand, so the moment a Sweep gradient paints on this element the reset destroys it exactly as census #4 does. Today no row targets it |
| `render.php` — `.sgs-nav-menu__subtoggle` — `…background:none;border:0;padding:0;cursor:pointer;color:inherit` | Identical reasoning: a `<button>` reset, not a paint. It is chrome (the dropdown expander), not a text/icon colour row in FR-41-23's roster, so nothing paints a `background-image` here for the shorthand to reset | Same condition. ⚠ **This one is closer than the mega-trigger**: FR-41-30 gives the sublink marker an Icon Picker, and if an icon-colour row with Sweep is ever scoped to the subtoggle, this reset enters the census that same day |
| `plugins/sgs-blocks/src/blocks/nav-menu/style.css::.sgs-nav-menu__indicator` — `background-color: var(--wp--preset--color--accent, currentColor)` | **Attribute-driven with a token default**, and the writer exists: `render.php` emits `{uid} .sgs-nav-menu__indicator{…}` from `indicatorColour` at (0,2,0), beating this (0,1,0) rule. It is also the `background-color` LONGHAND, so it cannot reset a sweep's `background-image`; and the element only exists at all under `indicatorStyle: 'pill'` — the markup is its gate | The scoped writer being removed, or FR-41-25's Highlight fold leaving the indicator element rendered with no attribute-driven fill |
| `plugins/sgs-blocks/src/blocks/nav-menu/style.css::.sgs-nav-menu__burger` — `background: none; border: none; border-radius: var(--wp--custom--border-radius--medium, 8px)` | Button reset again for the first two. The `border-radius` is a token-defaulted SHAPE, not a state paint, and no operator attribute in this spec's scope claims the burger's radius (FR-41-33 splits border colour/width/style/radius for ITEMS, not the menu button) | A burger border-radius attribute being added — at which point this becomes a hardcoded default overriding it |
| `style.css` — `@supports not (background-color: color-mix(…)) { .sgs-nav-menu__burger:hover }` — `background-color: rgba(128, 128, 128, 0.12)` | **Already named and accepted as a residual at FR-41-17a(c)** (0.4.4) — a legacy-browser rescue for the burger's ordinary hover, longhand, (0,1,0), beaten by every uid-scoped operator rule, and no attribute controls it. ⛔ Do NOT delete it | Nothing in this spec. It is cross-referenced here only so a future census does not re-discover it as new |
| `style.css` — `@media (forced-colors: active) { .sgs-nav-menu__burger }` — `border: 1px solid ButtonText` | A WCAG forced-colors rule using a system-colour keyword, active only in a mode where the UA has already neutralised every operator colour. Removing it fails the a11y requirement it exists for | Nothing. It must stay |
| `style.css` — `.sgs-nav-menu__bar--drawer[data-drill-enhanced] … .sgs-nav-menu__submenu` — `background: var(--sgs-nm-submenu-bg, inherit)` | **Attribute-driven** (`--sgs-nm-submenu-bg` has a real writer from `submenuBg`) with a fallback of `inherit`, not a hardcoded colour. It is structurally load-bearing: the drill-down sub-panel is `position:absolute; inset:0` over the top-level list, so it must be opaque or the list shows through. It paints the PANEL, not a link, so no text sweep is on this selector | A submenu-panel GRADIENT attribute. This is the `background` shorthand, so a panel `background-image` would be reset by it |

Each rule's fate, named — the current-page rules first, then the paint rules the later passes
found. **Eleven censused rules, eleven fates: 6 DELETE (#3, #4, #5, #6, #8, #10), 3 CONVERT (#1,
#7, #9), 2 KEEP (#2, #11).** ⚠ The table below holds **12** rows, not 11, and the arithmetic is
stated so it does not read as a discrepancy: it carries the ten censused rules whose fate is a
single call, **plus two rules that are not in the census at all** (the two `[aria-current="page"]`
rules on the bar — they carry no `background`/`border` declaration, so the scan never sees them, but
their fate belongs beside the drawer's current-page rule it would otherwise be read against).
Census **#9** is the eleventh and has its own per-declaration table directly after this one, because
its five declarations do not share one fate. ⚠ Every row below is
part of ONE table; there is no blank line inside it (0.4.4's census-#6 row was appended after a
blank line and rendered as detached plain text rather than a table row — a formatting break that
made the fate table look one row shorter than it was, which is exactly the kind of invisible
undercount this FR keeps producing).

| Rule (source file named per row; unmarked rows are `render.php`) | Fate |
|---|---|
| `{uid} .sgs-nav-menu__sublink[aria-current="page"]{color:var(--sgs-nm-submenu-current-colour, var(--wp--preset--color--primary-dark, currentColor));…}` | **CONVERT.** ⚠ `--sgs-nm-submenu-current-colour` is **never written anywhere** — verified: `grep -rn "sgs-nm-submenu-current-colour" plugins/sgs-blocks/src/` returns exactly one hit, this consuming rule. The rule is dead-but-firing: it always falls through to its own hardcoded fallback. Rewire it to read the new `submenuColourCurrent` attribute, keeping `var(--wp--preset--color--primary-dark, currentColor)` as the unset fallback so an untouched nav renders identically. |
| `{uid} .sgs-nav-menu__link[aria-current="page"], {uid} .sgs-nav-menu__sublink[aria-current="page"]{font-weight:600;}` | **CONVERT** to read `itemFontWeightCurrent` (default `"600"`), under FR-41-6's never-lighter guard. Same rendered output when `itemFontWeight` is unset, which is its shipped default. |
| `.sgs-nav-drawer {uid} .sgs-nav-menu__link[aria-current="page"], … .sgs-nav-menu__sublink[aria-current="page"]{border-left:3px solid currentColor;background:color-mix(in srgb, currentColor 8%, transparent);}` | **DELETE both declarations.** The `border-left` is superseded by the item border's own Current state (FR-41-7 — an operator wanting a left rule sets one, in either instance independently). The `background` tint is superseded by `itemBgCurrent` / `submenuLinkBgCurrent`. Leaving either would paint *in addition to* the operator's choice, producing a tint they never asked for on top of the colour they did. |
| `.sgs-nav-drawer {uid} .sgs-nav-menu__sublink{…border-left:2px solid color-mix(in srgb, currentColor 25%, transparent);}` *(census #2)* | **KEEP.** This is the drawer's resting sub-item indent rule, not a current-page rule, and `render.php`'s own comment records that the marker icon's `12px padding + 14px icon + 8px gap` is measured against the 32px indent this border occupies. It is structural, not stateful. Named here only so it is not swept up with the row above it, which it sits beside. |
| **`sgs_hover_guarded_rule( '.sgs-nav-drawer {uid} .sgs-nav-menu__link:hover,.sgs-nav-drawer {uid} .sgs-nav-menu__sublink:hover', 'background:color-mix(in srgb, currentColor 12%, transparent)' )`** *(census #4 — **ADDED 0.4.3**)* | ⛔ **DELETE.** Superseded outright by the operator's own `itemBgHover` / `submenuLinkBgHover` (FR-41-9, FR-41-23), exactly as census #5's tint is superseded by `itemBgCurrent` / `submenuLinkBgCurrent`. It is the same rule shape, one state earlier, and it was missed only because it emits through a helper call rather than a literal string concat. **Three independent reasons it cannot be left standing, any one sufficient:** (a) it paints a 12% tint the operator never asked for, *in addition to* the hover background they did ask for — the silent-override class `check-hardcoded-render-defaults.js` F3b exists to catch; (b) it is the `background` SHORTHAND, so it resets `background-image` to `none`, which **destroys the Sweep gradient on any drawer using it** — see the ⛔ directly below; (c) it applies to the sublink as well as the link, so it also fights `submenuLinkBgHover`. |
| `.sgs-nav-drawer {uid} .sgs-nav-menu__submenu{box-shadow:none;border:0;background:var(--sgs-nm-submenu-bg, color-mix(in srgb, currentColor 6%, transparent));…}` *(census #1 — **ADDED 0.4.3**)* | **CONVERT, in step with the bar's own panel hardcodes below.** The `background` half is already attribute-driven — `--sgs-nm-submenu-bg` IS written, from `submenuBg`, at `render.php`'s custom-property block (verified: unlike `--sgs-nm-submenu-current-colour`, this one has a real writer), so it needs only its `color-mix` fallback preserved. The `border:0` half is a hardcoded **suppression** and must become conditional: it may keep zeroing the bar's own `1px solid` panel border inside the drawer, but it must NOT survive once `submenuBorderWidth` is set, or an operator's drawer panel border silently renders nothing. Emit the `border:0` reset only when `submenuBorderWidth` is empty. |
| `.sgs-nav-drawer {uid} .sgs-nav-menu__item + .sgs-nav-menu__item, … .sgs-nav-menu__subitem{border-top:1px solid color-mix(in srgb, currentColor 15%, transparent);}` *(census #3 — **ADDED 0.4.3**)* | ⛔ **DELETE.** This is the drawer's hardcoded item separator, and FR-41-7 is explicit that the item border is the ONE separator mechanism — *"There is no `itemDivider` toggle"* — with FR-41-28 confirming it already applies identically in both forks. Leaving it means an operator who sets a bottom `itemBorderWidth` gets **two horizontal lines between drawer rows**: their own on the link's border box, and this one on the next `<li>`'s top edge. That is precisely the double-line bug class this redesign exists to remove, and it is invisible to specificity reasoning because the two rules are on different elements and never compete — they simply both paint. ⚠ Deleting it means an untouched drawer ships no separator; that is the same accepted default-reduction FR-41-17a(a) already records for the Hover signal, and it is closed the same way — one `itemBorderWidth` entry. |
| **`sgs_hover_guarded_rule( $uid_sel . ' .sgs-nav-menu__sublink:hover', 'background:var(--wp--preset--color--surface, rgba(0,0,0,.04))' )`** *(census #6 — **ADDED 0.4.4**)* | ⛔ **DELETE.** Superseded outright by `submenuLinkBgHover` (FR-41-9 / FR-41-23) — the same relationship census #4 has to `itemBgHover`. It is the SAME defect shape as #4, one fork wider: unconditional, ungated on any attribute, `background` SHORTHAND (so it resets `background-image` to `none`), emitted through a helper (so a literal-string scan misses it), and sitting immediately after the `submenuColourHover` emission block. ⚠ **It is scoped to `$uid_sel`, NOT `.sgs-nav-drawer $uid_sel`** — verified — so unlike #4 it fires on the bar's dropdown as well as inside the drawer, which makes it the broader of the two. **Three independent reasons, any one sufficient:** (a) it paints a `surface`-token tint the operator never asked for, in addition to the `submenuLinkBgHover` they did — the `check-hardcoded-render-defaults.js` F3b silent-override class; (b) the shorthand destroys the text sweep on the sublink in BOTH forks, by the identical mechanism spelled out for census #4 below; (c) its own comment records it as a 2026-07-31 design fix for a stray `currentColor` underline — a problem the operator's own three-state fill now answers directly. ⚠ Deleting it means an untouched sublink shows no hover tint; that is the same accepted default-reduction FR-41-17a(a) records, closed the same way — one `submenuLinkBgHover` entry. |
| **`$uid_sel . ' .sgs-nav-menu__subitem--featured .sgs-nav-menu__sublink{…background:var(--sgs-nm-featured-bg, var(--wp--preset--color--primary, transparent));…}'`** *(census #7 — **ADDED 0.4.5**)* | **CONVERT — and the decision rests on a check, not a guess: a real operator attribute family already exists and already drives this rule.** Verified in `block.json` and `render.php`: `featuredBg` / `featuredBgGradient` / `featuredColour` / `featuredRadius` / `featuredWeight` are declared attributes, and `render.php` **republishes their RESOLVED values** as `--sgs-nm-featured-bg` / `--sgs-nm-featured-colour` / `--sgs-nm-featured-radius` / `--sgs-nm-featured-weight` on `$uid_sel`, deliberately, so a featured SUB-item mirrors the featured BAR item (the block's own comment records this as the 2026-07-31 intent). So this is census #1's shape, not census #4's: the `var()` half is genuinely attribute-driven and stays. ⛔ **What must go is the FALLBACK.** The custom-property writer is conditional — with no featured colours set, `--sgs-nm-featured-bg` is never written and the rule falls through to `var(--wp--preset--color--primary, transparent)`, so an untouched nav paints every featured sub-item as a `primary` pill with inverse text that nobody asked for. **Emit the rule only when `--sgs-nm-featured-bg` is actually written** (the same gate that writes it), and switch `background:` → `background-color:` so the shorthand can never reset a sweep's `background-image` on this selector. |
| **`sgs_hover_guarded_rule( $uid_sel . ' .sgs-nav-menu__subitem--featured .sgs-nav-menu__sublink:hover', 'color:…;background:var(--sgs-nm-featured-bg-hover, var(--wp--preset--color--primary-dark, transparent))' )`** *(census #8 — **ADDED 0.4.5**)* | ⛔ **DELETE.** The third instance of one defect, and the signature is identical to #4 and #6 on every axis: unconditional, ungated on any attribute, `background` SHORTHAND, `:hover` state, emitted through `sgs_hover_guarded_rule()` (which is why two literal-string scans missed it), `$uid_sel`-scoped so it fires in BOTH forks. It destroys Sweep on featured sub-items by the exact mechanism spelled out for census #4 below. ⚠ **AND BOTH OF ITS CUSTOM PROPERTIES ARE DEAD.** Verified: `grep -rn "sgs-nm-featured-bg-hover\|sgs-nm-featured-colour-hover" plugins/sgs-blocks/src/` returns **only these two consuming references and no writer at all** — the same dead-but-firing shape this census already caught for `--sgs-nm-submenu-current-colour`. `featuredBgHover` / `featuredColourHover` / `featuredBgHoverGradient` DO exist as attributes, but they drive `$featured_sel` (the BAR item) and are never republished to the submenu, so this rule can only ever render its own hardcoded `primary-dark` fallback. Superseded outright by the submenu link's own three-state fill (FR-41-9 / FR-41-23). ⚠ Deleting it means an untouched featured sub-item shows no hover change; same accepted default-reduction as #4 and #6, closed the same way. |
| **`.sgs-nav-menu__item--drawer + .sgs-nav-menu__item--drawer{border-top:1px solid color-mix(in srgb, currentColor 15%, transparent);}`** in **`style.css`** *(census #10 — **ADDED 0.4.5**)* | ⛔ **DELETE.** The static twin of census #3, in the other file. ⚠ **Deleting #3 while leaving this standing would have left the bug fully intact** — the two selectors are different (`.sgs-nav-drawer {uid} .sgs-nav-menu__item + .sgs-nav-menu__item` vs `.sgs-nav-menu__item--drawer + .sgs-nav-menu__item--drawer`) but they paint the same edge of the same drawer rows, so an operator setting `itemBorderWidth` still gets the **two horizontal lines** FR-41-7 exists to remove. The fate that closes the bug is deleting BOTH. Same accepted default-reduction as #3, closed the same way — one `itemBorderWidth` entry. |
| **`.sgs-nav-menu__drill-back-btn{background:none;border:0;border-bottom:1px solid color-mix(in srgb, currentColor 15%, transparent);…}`** in **`style.css`** *(census #11 — **ADDED 0.4.5**)* | **KEEP — and named explicitly so it is not swept up with #10, which it closely resembles.** Same classification census #2 already carries: structural, not stateful. The `background:none;border:0` half is a `<button>` reset (the DISMISSED-table reasoning). The `border-bottom` is the separator under the drill-down **Back row**, which is JS-injected chrome (`nav-drilldown.js` prepends it), **not** a `.sgs-nav-menu__link` and not an `<li>` menu item — so FR-41-7's item border never paints on it and the double-line bug that condemns #3 and #10 cannot occur here. Deleting it would leave the Back row visually fused to the first sub-item with no control to restore the rule. ⚠ It returns to the census the day the item-border mechanism is extended to drawer chrome. |

**Census #9 — the BAR's own `{uid} .sgs-nav-menu__submenu{…}` panel rule. Every one of its five
declarations is accounted for below; none is handled "somewhere else" (0.4.5).** This rule was
previously carried ONLY in the narrower table that follows, under the heading *"panel defaults"*,
which is what made it read as a gap against the numbered census — the `background` half in
particular appeared nowhere. It is now census #9, and this is its complete per-declaration fate:

⚠ **This table was CORRECTED 2026-09-11 against the executed code, and one row had gone
outright FALSE.** The `border-radius` row read *"NO CHANGE — attribute-driven, writer verified:
emitted from `submenuRadius`"*. **`submenuRadius` was DELETED by §8.3 in the same phase**, so from
the manifest rewrite onward that declaration was **dead-but-firing** — the exact shape this census
already caught twice (`--sgs-nm-submenu-current-colour`, `--sgs-nm-featured-bg-hover`), arriving
this time through the spec's own fate table rather than past it. ⛔ **A "writer verified" row is
verified only against the attribute list of the day it was written**; a deletion elsewhere in the
same spec can falsify it silently, and nothing re-checks a row marked NO CHANGE. The fate below is
the real, current, verified one.

| Declaration in `{uid} .sgs-nav-menu__submenu{…}` | Fate (verified in `plugins/sgs-blocks/includes/nav-menu-submenu-css.php::sgs_nav_menu_submenu_css`, 2026-09-11) |
|---|---|
| `background:var(--sgs-nm-submenu-bg, var(--wp--preset--color--surface-alt, var(--wp--preset--color--surface, #fff)))` | **ATTRIBUTE-DRIVEN, and SPLIT SHORTHAND → LONGHANDS as built.** `--sgs-nm-submenu-bg` has a real writer from `submenuBg`, emitted inside an empty-guard so an unset attribute writes **no property at all** and the rule's own token fallback applies. ⚑ **As built it is now two declarations** — `background-color:var(--sgs-nm-submenu-bg, …)` plus `background-image:var(--sgs-nm-submenu-bg-gradient, none)` — written by the shared `sgs_custom_property_gradient_decls( 'sgs-nm-submenu-bg', … )`, which emits the gradient sibling only when `submenuBgGradient` is set. ⚠ **This supersedes §8.5 item 2's "no gradient on the submenu PANEL background"**: the panel DOES carry a Normal-state gradient (`submenuBgGradient`), adopted to match the shared fill-custom-property-gradient end shape every other background row in the codebase uses. Still Normal-only — no hover, no current. The chained `surface-alt → surface → #fff` fallback is deliberate and stays (the 2026-07-31 fix for a panel that painted literal white on a client whose surface token is `#fbf3dc`). |
| `min-width:var(--sgs-nm-submenu-min-width, 200px)` | **NO CHANGE — attribute-driven.** Writer verified: emitted from `submenuMinWidth` through the same empty-guarded custom-property block. Listed only so this table is exhaustive per-declaration rather than per-interesting-declaration. |
| `border-radius:var(--sgs-nm-submenu-radius, var(--wp--custom--border-radius--medium, 8px))` | ⛔ **CONVERT — the 0.4.5/0.4.6 "NO CHANGE … emitted from `submenuRadius`" fate is WRONG and is retired.** `submenuRadius` is deleted (§8.3), so its writer went with it and this declaration could only ever render its own token fallback. **As built, `--sgs-nm-submenu-radius` is written from `submenuBorderRadius` through `sgs_corner_object_shorthand()`** — the FLAT corner object helper (`topLeft`/`topRight`/`bottomRight`/`bottomLeft`), **not** the side-keyed `sgs_box_object_shorthand()` — mirroring `itemBorderRadius`'s own writer at `plugins/sgs-blocks/includes/nav-menu-css.php`. Same guarded block, so `submenuBorderRadius`'s `{}` default writes no property and the chained token fallback applies exactly as before (§8.4's ⚠ on why the panel keeps `{}` still holds). |
| `border:1px solid var(--wp--preset--color--border, transparent)` | **CONVERT — DONE.** As built it is three declarations: `border-width:var(--sgs-nm-submenu-border-width, 1px)` and `border-style:var(--sgs-nm-submenu-border-style, solid)` (written from `submenuBorderWidth` via `sgs_box_object_shorthand()` and from `submenuBorderStyle` via `sgs_css_keyword_sanitise()`, both empty-guarded), plus the previous literal kept as `border-color:var(--wp--preset--color--border, transparent)`. The COLOUR is then emitted by the shared `sgs_border_states_css()` **appended after this rule** — Normal-only, no `hover`, no `current`, **no `suppress_edges` key at all** (FR-41-9) — so a set colour wins on source order and an unset one leaves the token fallback standing. |
| `box-shadow:var(--wp--preset--shadow--raised, 0 4px 12px rgba(0,0,0,.1))` | **CONVERT — DONE.** As built it reads `box-shadow:var(--sgs-nm-submenu-shadow, var(--wp--preset--shadow--raised, …))`, with `--sgs-nm-submenu-shadow` composed from `submenuShadow` + `submenuShadowColour` by the shared `sgs_shadow_value_composed()`, same empty-guard and same unset-fallback discipline. |

⛔ **Census #4 is not merely redundant — left standing it BREAKS the Sweep treatment outright, on
every drawer.** The mechanism, stated so it is checkable rather than asserted:

FR-41-26's text sweep paints its travelling gradient into **`background-image`** on the link (or
sublink) itself, and makes the glyphs transparent with `-webkit-text-fill-color: transparent`.
Census #4 writes **`background:`** — the SHORTHAND — which resets every unset longhand it covers,
`background-image` included, to its initial value of `none`. Its selector
(`.sgs-nav-drawer .{uid} .sgs-nav-menu__link:hover`, four classes plus `:hover`) also out-ranks the
sweep's own base rule. So on hover inside a drawer:

1. the gradient the sweep travels is erased to `none`;
2. `-webkit-text-fill-color: transparent` still applies, because nothing in census #4 touches it;
3. the only remaining paint is census #4's own `currentColor 12%` tint —

which renders the hovered menu word at roughly 12% opacity: **legible text becomes near-invisible
on hover, on every drawer instance using Sweep.** ⚠ Note the failure is silent in both directions —
nothing errors, and a `getComputedStyle` check of `color` still returns the operator's colour,
because the glyph paint is governed by `-webkit-text-fill-color`, not `color`. Deleting the rule is
the fix; there is no version of it that coexists with the sweep.

⛔ **Do not leave any converted or deleted rule as-is alongside the new controls.** A hardcoded rule
that duplicates or overrides an operator attribute is a silent override — the failure class
`check-hardcoded-render-defaults.js` F3b exists to catch.

⚠ **Census #6 fails identically, and in BOTH forks (0.4.4).** Everything in the paragraphs above
about census #4 applies to it unchanged — same `background` shorthand, same reset of
`background-image` to `none`, same surviving `-webkit-text-fill-color: transparent`, same
near-invisible hovered word, same silence under a `getComputedStyle( el ).color` check. The only
differences make it worse, not better: it is scoped to `$uid_sel` rather than
`.sgs-nav-drawer $uid_sel`, so it breaks the sublink sweep on the bar's dropdown too; and it was
missed by a census that had *just been re-derived specifically to catch this shape*, because the
re-derivation was bounded to a line range instead of the shape. That is why the methodology at the
top of this FR is now shape-scoped and whole-file.

⚠ **Census #8 is the THIRD instance of the same failure, on the featured sub-item (0.4.5).**
Everything above about census #4 and #6 applies to it unchanged — same `background` shorthand, same
reset of `background-image` to `none`, same surviving `-webkit-text-fill-color: transparent`, same
near-invisible hovered word, same silence under a `getComputedStyle( el ).color` check, same
`$uid_sel` scope so it breaks both forks. **What makes it worse than #6: its `background` value is
`var(--sgs-nm-featured-bg-hover, …)` and `--sgs-nm-featured-bg-hover` has no writer anywhere in the
tree** — so the rule is not merely redundant with an operator's choice, it is *guaranteed* to paint
its own hardcoded `primary-dark` fallback on every single render, in every install, forever. A rule
that can only ever render its fallback is the same dead-but-firing shape this census already caught
once, at `--sgs-nm-submenu-current-colour`. **Three instances of one defect shape, found by three
separate reviews, is not three oversights — it is a defect CLASS**, and a class needs a detector,
not a fourth re-reading. ⚠ No gate covers it today: `check-hardcoded-render-defaults.js` F3b fires
on a hardcoded value for a property the block declares an *attribute* for, and none of #4 / #6 / #8
has a matching attribute on its own selector, so all three read clean. ⚑ **UPDATED 0.4.6 — the
detector is DECIDED and specified: FR-41-35 (`check-ungated-paint-rules.py`, framework-wide, gated
at G20c), with #4 / #6 / #8 as its negative controls.** Until it is BUILT and shows in
`npm run gate:list`, this census is defended by review alone — state that as the live position, and
do not read the existence of a written FR as enforcement.

⚠ **THE CENSUS SCOPE IS BOTH OF THIS BLOCK'S CSS SURFACES — `render.php` AND `style.css` — AND
BOTH WERE ACTUALLY READ (corrected 0.4.5).** 0.4.3 limited the claim to the drawer-scoped block of
`render.php`, which hid census #6; 0.4.4 widened it to the whole of `render.php` and **still implied
whole-block coverage while having checked one file**, which hid census #10 and #11. That is the
gap this correction closes, and it is stated as a checkable claim rather than a coverage adjective:

> **Checked: `plugins/sgs-blocks/src/blocks/nav-menu/render.php` (2,031 lines) and
> `plugins/sgs-blocks/src/blocks/nav-menu/style.css` (427 lines), in full, with the two commands at
> the top of this FR. Result: 18 `background`/`border`-carrying statements in `render.php`, and 7
> `background`/`border`-declaring rules (12 declarations) in `style.css`. Eleven CENSUSED, seven
> GATED, seven DISMISSED — all twenty-five published in the three tables above, none omitted.**

⛔ **`style.css` is a genuinely separate surface, not a corner of the same one.** Per-block
`style.css` is enqueued by WordPress as an ordinary stylesheet and never passes through PHP — this
project's own `plugins/sgs-blocks/CLAUDE.md` records it as the second surface that PHP-side helpers
and PHP-side scans cannot reach, which is why `plugins/sgs-blocks/scripts/hover-guard/` needs a build-time transform in
addition to the PHP helpers. A census of the PHP emitter alone is structurally incapable of seeing
it, and census #10 is the proof: deleting census #3 from `render.php` while leaving its static twin
standing in `style.css` would have left the double-line bug FR-41-7 exists to remove **fully
intact**, through a fix that read as complete.

If a future edit adds any `$css .=` emission or any static rule carrying an ungated `background` or
`border`, re-run BOTH commands at the top of this FR — a fate table is only complete as of the
command that produced it, only as wide as that command's scope, and only as deep as that command's
ability to span a statement.

---

## 7a. The universal hover-treatment pairing (0.4.0 — owner points 2, 9, 10, 12)

### FR-41-23 — Every stateful colour row gets ONE paired hover-treatment selector, not a separate mechanism

**Owner's challenge, verified rather than assumed:** *"Why isn't the sliding-highlight hover
treatment PAIRED with the colour picker of each element, instead of being a separate
mechanism?"* Checked against the real v0.3.0 design: it wasn't. Three genuinely independent
mechanisms all answered variants of "what happens visually between Normal and Hover on this
block" — the plain Hover-colour swap (every 3-state row), `borderHoverAnimation` (FR-41-8, border
only), and `indicatorStyle: 'pill'` (FR-41-14, background only, plus a whole standalone panel).
An operator styling one block had to know three different places to look for what is, at root,
one question asked three times: *"how should this property look when the item is hovered?"*

**The fix — one small reusable pattern, not a new shared component (see FR-41-24 for the
component-vs-block-private call).** Directly beneath the **Hover** swatch of every qualifying
colour row, a `ToggleGroupControl` offers exactly three options:

| Option | Meaning | What renders |
|---|---|---|
| **None** | No visual change on hover for this property | The property does not change between Normal and Hover (the Hover swatch, if any, is ignored for CSS purposes but stays stored so switching treatment back restores it) |
| **Swap** *(default — preserves today's shipped behaviour byte-for-byte)* | A plain colour change | Exactly what a 3-state row already renders today: `sgs_emit_state_colour_css()` / `sgs_border_states_css()` with the Hover colour |
| **Sweep** *(text, border)* / **Highlight** *(background only)* | An animated transition rather than an instant swap | The property-specific animated mechanism named below |

⛔ **`Swap` is the DEFAULT for every row, which is what makes this additive, not disruptive.**
An untouched block renders byte-identically to v0.3.0/pre-0.4.0 output — the selector is new UI,
the DEFAULT BEHAVIOUR is not.

**Which rows get the selector, and what the third option does on each — verified against the
real DOM/CSS each mechanism already touches, not assumed uniform:**

| Row | Attribute | Third-option name | Third-option mechanism |
|---|---|---|---|
| Item text | `itemColourHoverTreatment` | **Sweep** | The glyph colour-sweep, new capability — FR-41-26. ⚠ Offered only when the row passes FR-41-26's Sweep eligibility test |
| Item background | `itemBgHoverTreatment` | **Highlight** | The shared sliding pill across items — folds in what was `indicatorStyle: 'pill'` (FR-41-14/25). Paints in the row's OWN Hover swatch (`itemBgHover`/`itemBgHoverGradient`); there is no separate indicator colour |
| Item border | `itemBorderHoverTreatment` | **Sweep** | The directional band sweep (FR-41-8). Under `sweep`, the Hover and Current border-colour emissions are omitted for the swept edge — the band owns them |
| Submenu link text | `submenuColourHoverTreatment` | **Sweep** | Same glyph sweep as item text, scoped to `.sgs-nav-menu__sublink`. ⚠ Eligibility-gated — `.sgs-nav-menu__sublink` paints its OWN background (`submenuLinkBg*`), so Sweep is omitted whenever ANY of its three state fills or its gradient is set (0.4.4) |
| Submenu link background | `submenuLinkBgHoverTreatment` | **None only — no Highlight, no Sweep** | The shared sliding pill is an ITEM-row mechanism (`.sgs-nav-menu__indicator` slides between top-level items, never between dropdown links); a per-link background sweep-band on a strictly vertical list has no precedent and is out of scope here. The selector still renders (for the row's OWN consistency and because `None`/`Swap` are both meaningful choices) but its enum is `none`/`swap` only — two options, plain `ToggleGroupControl`, no third segment |
| Menu button icon colour | `burgerColourHoverTreatment` | **Sweep** | Same glyph sweep, scoped to `.sgs-nav-menu__burger`. ⚠ Eligibility-gated on THREE conditions, all in FR-41-26: `triggerMode` must not be `icon` (a pure-icon SVG has no glyphs for `background-clip:text` to grip), `burgerBg`/`burgerBgGradient`/**`burgerHoverColour`** must be unset (the button paints its own background on the same element, in BOTH states — the hover one added 0.4.4), and `burgerColourGradient` must be unset |
| Menu button background | `burgerBgHoverTreatment` | **None only — no Highlight, no Sweep** | A single button, not a repeated item row — neither the shared pill (needs ≥2 siblings to slide between) nor a horizontal sweep-band (the button is square, not a text baseline) has a meaningful referent. Two options only, same reasoning as the submenu-link-background row above |

⛔ **`Highlight` is genuinely NOT offered outside the item Background row, and that is a real
boundary, not an oversight.** The sliding pill is defined by having more than one sibling row to
slide BETWEEN — nothing else on this block has that shape.

**Rows that get NO hover-treatment selector at all, and why each is a real boundary:**

| Row | Why no selector |
|---|---|
| Nav bar background / text (`navBg*`/`navColour*`) | The bar is one element, not a repeated interactive target — neither a directional sweep nor a between-siblings highlight has a referent on a single static wrapper. Stays a plain 2-state Swap-only row, unchanged from v0.3.0. ⚠ **Built as a 2-state row with no `after` node** — verified in `edit.js`'s `colourRows`. |
| Item / submenu-link Current-state swatches | Hover-treatment governs the Normal↔Hover TRANSITION specifically (something a pointer moves across). Current is not pointer-driven — FR-41-3's "Current is emitted first, is never guarded" rule already establishes it has no touch/hover lifecycle to animate. The Current swatch stays a plain third colour, unaffected by whichever treatment the Hover row picked. |
| Submenu panel background/border colour (Normal-only, FR-41-9) | No Hover state exists on these rows at all — nothing to pair a treatment control under. |
| Sublink marker colour, shadow colour | Single-state rows with no Hover swatch of their own (FR-41-30(b) / §9.9). ✅ **The sublink marker half of this row was OPEN, RESOLVED 2026-09-11** — the owner's ruled direction gives it Hover/Current states and a gradient toggle once built, which will move it out of this table. Still BUILT Normal-only in the tree today; see FR-41-30(b)'s ✅ RESOLVED block and §12 item 8. The shadow-colour half is unaffected and stays. |

#### ⛔ THE ITEM BACKGROUND ROW PAINTS ALL THREE STATES ON `{link}::before` (0.4.4)

**New normative requirement, and it is load-bearing for a claim made elsewhere.**

> **The item Background row's **Normal, Hover AND Current** fills are ALL emitted onto
> `.{uid} .sgs-nav-menu__link::before` — the same layer, the same `z-index: -1`, the same
> `border-radius: inherit`. ⛔ No state's fill is emitted onto `.sgs-nav-menu__link` itself.**
> This holds for the `Swap` treatment (all three states) and for `Highlight` (which paints the
> shared pill and, per FR-41-14, skips the per-item hover/current emission entirely). The `None`
> treatment emits no hover fill at all, so it is trivially conformant.

**Why this needs saying, verified rather than assumed.** FR-41-4 item 6 covers the RESTING fill
only — verified in `render.php`, whose `::before` emission is gated on
`'' !== $item_bg_hex || '' !== $item_bg_gradient` and composes `sgs_background_paint_decl(
$item_bg_hex, $item_bg_gradient )`, i.e. the resting attributes alone. The HOVER fill today paints
`background-color:` **directly on `$hover_sel`** — the link element — inside the `hoverStyle ===
'pill'` branch that FR-41-4 deletes. **FR-41-4 deletes that branch without saying where its
replacement paints.** If the replacement landed back on the link element, the item-text row's
"Condition 1 passes always" would become false the instant an operator set `itemBgHover`, and the
Sweep they had already chosen would clip their new hover fill to the shape of the letters — the
exact defect class FR-41-26's whole eligibility section exists to prevent, arriving through the
front door.

⚠ **`{link}::before` is not contested by anything.** It carries the background layer only; the
border-sweep band owns `::after` (FR-41-4 items 6 + 7), and the text sweep claims no pseudo-element
at all (FR-41-26). Three states on one `::before` is three declarations on three selectors
(`::before`, `:hover::before`, `[aria-current="page"]::before`), not three competing layers.

⚠ **`{link}{position:relative;isolation:isolate;}` must be emitted whenever ANY of the three fills
is set, not only the resting one.** Verified: today's rule is emitted inside the resting-fill
condition, so an operator who sets a Hover fill and no Normal fill would get a `::before` with no
positioned ancestor and no stacking context. This is the same shape as FR-41-8 mechanism item 1's
`position:relative` requirement, and it is satisfied the same way — emit from whichever branch
fires first, and note the duplication is harmless (identical declarations, same selector).

**Cited by:** FR-41-26's eligibility table, item-text row, condition 1. ⛔ That citation points
HERE, not at FR-41-4 item 6, which does not cover the Hover or Current fill.

⛔ **Do NOT smuggle in different declarations via the treatment selector — it must select AMONG
the same three fixed options everywhere it appears, never a bespoke per-row enum invented ad
hoc**, except for the two explicit 2-option rows named above (which drop the unavailable third
option outright rather than rendering it disabled — the D609 field 9c "omit, don't disable"
rule, same as FR-41-14's own reasoning).

### FR-41-24 — Component shape: block-private for now, not a new shared component

**Verified, not assumed — a fresh search of the whole plugin tree found no existing precedent for
this exact pairing.** `grep -rn "sweep\|hover-treatment\|hoverTreatment" plugins/sgs-blocks/src`
returns hits only for: (a) this same nav-menu build's own new attributes, (b) `business-info`'s
one real sweep implementation (the precedent this spec copies — FR-41-26), and (c) unrelated GSAP
motion-path/webgl "sweep" naming with no connection to colour state. **No block anywhere in the
framework offers a "hover treatment" sub-control beneath a colour row today.**

**Decision: block-private for 0.4.0, not a new export from `plugins/sgs-blocks/src/components/`.** Building a
generic `<HoverTreatmentControl>` shared component now, before a second adopter exists, would be
designing an abstraction from a sample size of one — the same trap FR-41-2 already avoided once
in this spec ("the first draft proposed three new shared components; reading the real code
proved none were necessary"). The control is a plain `ToggleGroupControl` +
`ToggleGroupControlOption` pair (already imported from `primitives` by this block's `edit.js`),
rendered directly beneath its own row's control.

⚑ **AS BUILT (2026-09-11) — HOW it mounts, because "rendered inline beneath the `states` array" was
not expressible against the shared panel as it then stood.** `SgsColourPanel` had no post-control
slot at all, so the requirement was closed by FR-41-16's additive **`after` row-descriptor key**
(see that FR for the full contract). The seven selectors live as seven small block-private
components in `plugins/sgs-blocks/src/blocks/nav-menu/ColourRowExtras.js` — `ItemTextTreatment`,
`ItemBgTreatment`, `ItemBorderTreatment`, `SubmenuTextTreatment`, `SubmenuLinkBgTreatment`,
`BurgerIconTreatment`, `BurgerBgTreatment` — each passed as its row's `after` node from `edit.js`'s
`colourRows` array. Each reads its own row's attribute names directly rather than through an
abstraction layer; ⛔ none of them is exported from `plugins/sgs-blocks/src/components/`, and none may be until a
SECOND block asks for the pairing (§12).

**Named as a real, deliberately-not-taken opportunity (§12 gains a new entry):** if a SECOND
block wants this exact pairing later, promoting it to a shared `plugins/sgs-blocks/src/components/primitives`
export at that point is the correct call — matching this spec's own established pattern at
FR-41-21 ("named as a real opportunity, deliberately not taken here"). Do not build the shared
version speculatively.

**Storage.** Three new small enum attributes per applicable row (see the table in FR-41-23 for
the full name→enum list), each `"type": "string"`, PHP-validated with **no JSON `enum`** — same
reasoning FR-41-8/FR-41-10 already establish for every other small enum on this block (an
out-of-enum stored value silently coerces to the block.json default with no error, which bites
hardest via a programmatic writer). Default `"swap"` for every 3-option row (preserves today's
output); the 2-option rows (`submenuLinkBgHoverTreatment`, `burgerBgHoverTreatment`) default
`"swap"` too, for the identical reason.

### FR-41-25 — The Highlight treatment folds `indicatorStyle: 'pill'` in whole

Owner point 10: *"We have no need for an indicator panel."* Verified: FR-41-14's suppression
mechanism (per-STATE omission on the item Background row while the shared pill is active; stored
values preserved, not cleared; `render.php` skip) is **retained**. What changes is the trigger, the
pill's colour SOURCE, and the surrounding UI:

- **Trigger:** `'highlight' === itemBgHoverTreatment`, replacing `'pill' === indicatorStyle`.
  `indicatorStyle` (string, enum `none`/`pill`) is **deleted** — zero renders left standing once
  the treatment selector is the sole switch (§8.3; no deprecation, D270).
- ⛔ **`indicatorColour` and `indicatorColourGradient` are DELETED as attributes (0.4.1,
  owner-locked).** They were the one row on this block that broke the colour-reuse rule in §0:
  every other treatment reuses its row's existing Hover swatch, and Background alone carried a
  second, parallel colour pair for its third option. **Highlight now paints in `itemBgHover` /
  `itemBgHoverGradient`** — the same swatch `Swap` reads and, on the text row, the same shape
  `Sweep` reads. One picker, one property, three ways of applying it.
- **The standalone "Indicator" panel (v0.3.0 §9.10) is DELETED outright.** Its one control
  (Style: None/Pill) had no other content and is now redundant with the Background row's own
  treatment selector. There is no replacement row beneath the Background row either — with the
  pill reading the Hover swatch, there is nothing left to conditionally reveal.
- **Help text moves with the mechanism**, not lost: the item Background row's treatment control
  carries the plain-language explanation — *"Highlight paints one shape that slides between items,
  using the Hover colour you picked above. It replaces each item's own current-page background, so
  that swatch is hidden while it's selected."*

**Where the conditional-row pattern is still needed, write it as a spread of a ternary — never a
spread of a boolean-`&&`.** ⛔ `...( cond && { key: 'x', … } )` is invalid JavaScript: when `cond`
is falsy the spread target is `false`, and spreading a primitive into an ARRAY literal throws
(`false is not iterable`). The correct form is the one FR-41-14 already uses, and it is also the
form the static detector can resolve in both branches (FR-41-2):

```js
rows={ [
  normalRow,
  itemBgRow,
  ...( showMarkerColour ? [ markerColourRow ] : [] ),
] }
```

⛔ **No capability is lost, and the one thing that changes is named.** Every FR-41-14 guarantee
(per-state not per-row, stored-not-cleared, statically-resolvable array) survives. What does NOT
survive is the ability to give the pill a colour DIFFERENT from the item's own hover background —
by design, because two different colours for one visual outcome is what the owner's rule forbids.
An operator who previously wanted that now sets the Hover swatch to the colour they wanted the pill
to be, which is what it paints.

### FR-41-26 — The Sweep treatment on TEXT: the real, already-shipped precedent, adopted directly

**Owner's exact claim, verified against the real files rather than taken on trust:** *"the
sliding-highlight/sweep technique definitely already works on TEXT — I set exactly this up for
`sgs/business-info`'s attribution/credit-link hover effect."* Confirmed true, read in full from
`plugins/sgs-blocks/src/blocks/business-info/style.css`
(`.sgs-business-attribution .sgs-business-info__link`, lines ~104-139) and
`plugins/sgs-blocks/src/blocks/business-info/render.php` (the `--sgs-bi-link-hover-text` /
`--sgs-bi-link-hover-bg` custom-property emission, ~L609-623). **This is a live, shipped,
2026-09-10-dated technique — the CLAUDE.md line summarising it as "now an underline-grow"
instead of a sweep is itself STALE and describes only the accessory effect, not the mechanism
this spec adopts; the actual rule still carries the full `background-clip: text` gradient sweep
alongside the underline-growth accessory, verified by reading the file directly, not the prose
summary.**

**The mechanism, exactly as shipped (adopted, not reinvented):**

```css
{link} {
  position: relative;
  color: <normal colour, or inherit>;
  background-image: linear-gradient( to right, <HOVER colour> 50%, currentColor 50% );
  background-size: 200% 100%;
  background-position: 100% 0;
  background-repeat: no-repeat;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  transition: background-position 300ms ease;
}
{link}:hover, {link}:focus-visible { background-position: 0 0; }
@media (prefers-reduced-motion: reduce) { {link} { transition: none; } }
@media (forced-colors: active), print {
  {link} { background-image: none; -webkit-text-fill-color: currentColor; }
}
/* MANDATORY — see below. Emitted by sgs_text_colour_gradient_fallback_rule( $link_sel, $sweep ). */
@supports not ((background-clip: text) or (-webkit-background-clip: text)) {
  {link}        { background-image: none; -webkit-text-fill-color: currentColor; color: <NORMAL>; }
  {link}:hover,
  {link}:focus-visible                                                         { color: <HOVER>; }
}
```

⛔ **The fallback colour is the NORMAL (resting) colour, and the HOVER colour arrives via its own
separate rule inside the same `@supports` block. It is never "HOVER or NORMAL".** On a browser
without `background-clip: text` the base rule is what paints the element at rest, so seeding it
with the Hover value renders the menu **permanently hover-coloured** — a state the visitor can
never leave, on exactly the browsers least able to cope with it. Two rules, resting and hover, is
the only shape that degrades to the plain Swap behaviour rather than to a stuck state.

⚠ **The hover half of the fallback still routes through `sgs_hover_state_rules()`**, per FR-41-3
rule 1 — a bare `{link}:hover` here would be an unguarded hover rule, and `hover-guard/check.js`
(§11 G2) scans the PHP emitters as well as the stylesheets.

⛔ **The `@supports not ((background-clip:text))` fallback is MANDATORY and is not optional
belt-and-braces.** `plugins/sgs-blocks/CLAUDE.md`'s precedent registry marks it required for EVERY
`background-clip:text` paint in this codebase, for one reason: `-webkit-text-fill-color:transparent`
applies on a browser that does not support the clip, so the glyphs render transparent over nothing
and **the text is invisible** — a total content loss, not a degraded effect. Emit it by calling the
existing helper `sgs_text_colour_gradient_fallback_rule( $selector, $value )`
(`plugins/sgs-blocks/includes/helpers-tokens.php`), which this same block already calls on its Normal-state gradient
path. **Do not hand-roll the rule** — the helper is a no-op for a flat colour and emits the correct
shape for a gradient, which is exactly the branch this sweep needs. It sits alongside, not instead
of, the `forced-colors`/`print` rescues above: those cover a supporting browser in a special mode;
this covers a browser that never supported the mechanism at all.

**Why this is safe to adopt on the item link without the precondition workaround named in
CLAUDE.md's precedent registry (`textSharesElementWithBackground`).** That precondition exists
because `background-clip: text` clips the element's WHOLE background-painting area to the glyph
shapes — a problem only when the SAME selector also paints a real background. Verified against
FR-41-4 item 6: this block already moved its item background paint onto `{link}::before` for
exactly the unrelated reason of freeing `::after` for the (now-retired) underline — so
`.sgs-nav-menu__link` itself carries **no** background paint of its own. The text sweep is
therefore adoptable directly, with **no** background-layer move needed and **no** conflict with
the item Background row's own Swap/Highlight treatment, which paints `::before`.

⛔ **Text-sweep uses ZERO pseudo-elements — it is colour-only, unlike the border-sweep's
`::after` band.** Business-info's own underline-growth accessory (its `::after` scaleX rule) is
NOT copied here: FR-41-7 already retired the standalone underline/divider concept in favour of
the border system, and duplicating an underline accessory onto the text-sweep would recreate the
exact "two mechanisms answering one question" problem this whole section exists to remove. Text
Sweep = colour travel only. An operator wanting an animated line as well sets the Border row's
own Sweep treatment (FR-41-8/FR-41-23) — the two do not collide, because text-sweep claims no
pseudo-element and the border-sweep's band still owns `::after` alone.

#### SWEEP ELIGIBILITY — one predicate, applied to every text/icon row (0.4.1)

The mechanism above is safe on `.sgs-nav-menu__link` because of a precondition that was VERIFIED
for that one element and then, in 0.4.0, quietly assumed for the other two. It does not hold for
them. Rather than three ad-hoc gates, this is ONE rule the row builder evaluates per row:

> **`Sweep` is offered on a text/icon colour row only when ALL of the following are true:**
>
> 1. **The element paints no background of its own — from ANY source, attribute-driven OR
>    static/hardcoded CSS, in ANY state.** `background-clip: text` clips the element's WHOLE
>    background-painting area to the glyph shapes, so any real background on the same selector is
>    destroyed; and conversely a `background` SHORTHAND on that selector resets the sweep's own
>    `background-image` to `none`, leaving transparent glyphs over nothing. This is the
>    `textSharesElementWithBackground` precondition recorded in
>    `plugins/sgs-blocks/CLAUDE.md`'s precedent registry.
>
>    ⛔ **"Attribute-driven" is not the whole question, and reading it that way is what let a real
>    defect through 0.4.2.** The condition is about what the RENDERED element paints, not about
>    which attributes are set. A hardcoded rule counts, a rule emitted through a helper counts, a
>    rule emitted only inside the drawer fork counts, and a `:hover`-state rule counts as much as a
>    resting one. FR-41-15 census #4 was exactly this shape — an unconditional hardcoded
>    `background:` on `.sgs-nav-menu__link:hover` inside the drawer, reached through
>    `sgs_hover_guarded_rule()` — and it satisfied none of those readings while destroying the
>    sweep completely. It is deleted by FR-41-15; the condition is widened here so the NEXT one is
>    caught by the rule rather than by a council.
>
>    ⛔ **"IN ANY STATE" MEANS THE ATTRIBUTE LIST BELOW CARRIES EVERY STATE'S BACKGROUND, AND
>    0.4.3's DID NOT (0.4.4).** The prose said "in ANY state" while the per-row table listed only
>    RESTING background attributes — a gap, not a wording nicety, because two live hover-state
>    backgrounds fall straight through it. Verified in `render.php`: `burgerHoverColour` emits
>    `sgs_hover_state_rules( "{$uid_sel} .sgs-nav-menu__burger", 'background-color:' … )`, a real
>    background on the SAME element the burger sweep would clip; and the submenu-link row is a
>    3-state fill family (FR-41-9 / FR-41-23), so `submenuLinkBgHover` and `submenuLinkBgCurrent`
>    block the sublink sweep exactly as `submenuLinkBg` does. **Every state's background — flat AND
>    gradient — is a blocking input**, and the per-row table below now lists them all.
>    ⚠ `burgerHoverColour` is the `background-color` LONGHAND, so unlike census #4 it does not
>    reset the sweep's `background-image`; it fails condition 1 for the OTHER half of the clip
>    problem — `background-clip: text` clips the element's whole background-painting area, so the
>    operator's hover fill renders as coloured letter shapes instead of a filled button. Both
>    halves disqualify; neither is the only reason the condition exists.
>
>    ⚠ **One narrow, named exception this condition does NOT cover, disclosed rather than left
>    silent (0.4.4).** `plugins/sgs-blocks/src/blocks/nav-menu/style.css` carries a static
>    `@supports not (background-color: color-mix(in srgb, currentColor 8%, transparent)) {
>    .sgs-nav-menu__burger:hover, .sgs-nav-menu__burger:focus-visible { background-color:
>    rgba(128,128,128,0.12); } }` fallback. That IS a background on the swept element in a hover
>    state, so on a browser supporting `background-clip: text` but NOT `color-mix` it would be
>    clipped to the glyph shapes. It is deliberately **not** added to the predicate, for two
>    reasons stated rather than assumed: it is a longhand (the sweep's `background-image` survives,
>    so the failure is a cosmetic clip, not invisible text), and **no attribute controls it**, so
>    there is nothing for a per-row predicate to read — gating on it would mean withdrawing Sweep
>    from the menu button on every browser, permanently, to serve a shrinking intersection.
>    ⛔ Do NOT "fix" it by deleting the fallback: it is the non-`color-mix` rescue for the button's
>    ordinary hover state and has nothing to do with Sweep. Accepted, named, and carried as a
>    residual at **FR-41-17a(c)**.
> 2. **The row carries no Normal-state gradient.** Sweep and the row's own gradient both write
>    `background-image` on the identical selector. Whichever loses is invisible; and if the
>    gradient wins, the resting text renders with `-webkit-text-fill-color: transparent` over a
>    background the sweep never painted — **invisible resting text**.
> 3. **The element actually has glyphs.** `background-clip: text` needs text to grip.
>
> When any condition fails, the `Sweep` segment is **OMITTED** from that row's selector and the
> row renders as a two-option `None`/`Swap` control — **D609 field 9c, omit not disable**, the same
> discipline as every other conditional on this panel. A greyed-out `Sweep` a client can find and
> click to no effect is the failure this rule exists to prevent.

**Applied, per row — this is the whole set, nothing is left implicit. ⚑ Condition 1's attribute
list covers EVERY state, not just resting (0.4.4).**

| Row | Condition 1 — own background, **all states** | Condition 2 (own gradient) | Condition 3 (glyphs) | Net |
|---|---|---|---|---|
| **Item text** `.sgs-nav-menu__link` | ✅ passes always — **all three** of the item background row's fills paint on `{link}::before`, never on the element itself: resting per FR-41-4 item 6, Hover and Current per **FR-41-23's three-state `::before` rule** (0.4.4). ⚠ The `::before` guarantee is what this ✅ rests on — it is NOT a property of the element by nature, and if a future change moves any state's fill back onto the link, this row loses its always-pass | gated on `itemColourGradient` being empty | ✅ always | Sweep offered unless `itemColourGradient` is set |
| **Submenu link text** `.sgs-nav-menu__sublink` | gated on **`submenuLinkBg` AND `submenuLinkBgHover` AND `submenuLinkBgCurrent` AND `submenuLinkBgGradient`** all being empty — this element paints its background DIRECTLY, it has no `::before` indirection, and it is a 3-state fill family (FR-41-9), so a Hover or Current fill blocks the sweep exactly as the resting one does | gated on `submenuColourGradient` being empty | ✅ always | Sweep offered only on a sublink with no background in ANY state and no text gradient |
| **Menu button icon** `.sgs-nav-menu__burger` | gated on **`burgerBg` AND `burgerBgGradient` AND `burgerHoverColour`** all being empty — the button paints its own background, and `burgerHoverColour` is the HOVER background on that same element (§8.1's disambiguation table; verified emission `sgs_hover_state_rules( …'.sgs-nav-menu__burger', 'background-color:'… )`) | gated on `burgerColourGradient` being empty | gated on `triggerMode !== 'icon'` | Sweep offered only on a text-bearing button with no background in either state and no icon gradient |

⚠ **The FEATURED sub-item is a fourth blocking background on the sublink row, surfaced by
FR-41-15 census #7 (0.4.5).** `.sgs-nav-menu__subitem--featured .sgs-nav-menu__sublink` paints a
background directly on `.sgs-nav-menu__sublink` — driven by `featuredBg` / `featuredBgGradient`,
republished to the submenu as `--sgs-nm-featured-bg`. Census #7's CONVERT gates that paint on the
attribute actually being set, which removes the uncommanded-`primary` case but **not** the real
one: a nav with a featured pill configured still paints a background on a swept element.

**Resolution — the narrow fix, not the blunt one.** The predicate is per-ROW, and a featured
sub-item is a per-ITEM distinction, so adding `featuredBg` to condition 1 would withdraw Sweep from
**every** sub-item whenever a featured pill exists anywhere — punishing the ordinary rows for the
featured one. The emitter instead **scopes the sublink sweep selector to exclude featured
sub-items** (`{uid} .sgs-nav-menu__subitem:not(.sgs-nav-menu__subitem--featured) .sgs-nav-menu__sublink`),
which is one selector change and matches how FR-41-15's fate for the featured item already treats it
as owning its own treatment — the same reasoning `render.php` already applies when it suppresses the
generic item underline on the featured bar item. With that scoping in place `featuredBg` is **not**
added to the row's condition-1 list. ⛔ If the emitter does NOT scope the selector, then
`featuredBg` AND `featuredBgGradient` MUST be added to condition 1 and Sweep withdrawn from the
whole row — those are the only two compliant outcomes, and shipping neither means a featured
sub-item renders transparent glyphs over a clipped pill.

⚠ **`burgerColourHover` is NOT in that list and must not be added to it.** It is the icon/text
COLOUR on hover, not a background — the two names are anagram-close and §8.1 exists to keep them
apart. Adding it would withdraw Sweep from precisely the row it is designed for: a button whose
hover colour is the colour the sweep travels TO.

⛔ **Condition 1 is NOT satisfiable by moving those backgrounds onto `::before` too.** It was
considered and refused: `.sgs-nav-menu__sublink::before` is free today, but moving a working
background layer to buy an optional hover effect is churn on a shipped mechanism, and the burger's
`::before` would then collide with nothing today but with the FR-41-31 magnet's own transform
surface tomorrow. The honest answer is the gate.

#### THE PREDICATE IS EVALUATED TWICE — IN THE UI **AND** IN `render.php` (0.4.3)

⛔ **The eligibility predicate above is not a UI rule. It is the EMISSION rule, and the inspector
merely reflects it.** `render.php` evaluates the IDENTICAL predicate before honouring any stored
`'sweep'` value, and **when the predicate is false it falls back to `'swap'` regardless of what is
in the database.** Sweep CSS — the `background-image` gradient, `background-clip: text`,
`-webkit-text-fill-color: transparent`, the `@supports` fallback, the `forced-colors`/`print`
rescues — is **NEVER emitted while the predicate is false**, no matter what the attribute says.

**Why a UI-only gate is not a gate at all.** The predicate's inputs are OTHER attributes, and the
operator can change those AFTER choosing Sweep. Three reachable paths, all through legal
single-step edits, none of which touches the treatment attribute itself:

| Step 1 (legal at the time) | Step 2 | What a UI-only gate produces |
|---|---|---|
| `submenuColourHoverTreatment = 'sweep'` on an unstyled sublink | operator sets `submenuLinkBg` | The `Sweep` segment vanishes from the row, the stored `'sweep'` stays, and `render.php` keeps emitting `background-clip: text` — **the operator's brand-new background is clipped down to the shape of the letters.** They set a background and got coloured lettering on nothing. |
| `burgerColourHoverTreatment = 'sweep'` in `icon-and-text` mode | operator sets `burgerBg` | Same clip, on the menu button. |
| `burgerColourHoverTreatment = 'sweep'` in `icon-and-text` mode | operator switches `triggerMode` back to `'icon'` | No glyphs left to grip, so `background-clip: text` clips to nothing and `-webkit-text-fill-color: transparent` still applies — **the icon button renders empty.** |

⚠ **This is the same class of failure as a stored value surviving a deleted attribute (D338), and it
has the same root: storage outlives the control that wrote it.** Clearing the stored value instead
would be the wrong fix — it silently discards an operator choice that becomes valid again the moment
they clear the background, which is the opposite of the "stored values are not cleared" discipline
FR-41-14 and FR-41-23 already establish for every other treatment. **The stored `'sweep'` is kept;
the EMISSION is what is gated.** Switching the blocking attribute back off restores the swept render
with nothing lost, exactly as switching a treatment back to `Swap` does.

#### ONE DECLARED SOURCE, TWO EVALUATORS — the predicate is DATA, not a function (0.4.4)

⛔ **0.4.3 said "write the predicate ONCE, in PHP, and have both surfaces answer to it". That is
unsatisfiable and is REPLACED here.** The two evaluators are `render.php` (PHP, server) and
`edit.js` (React, browser) — **the inspector cannot call a PHP function**. A builder handed
"one function, in PHP" has no compliant path and ends up writing the second copy anyway, in the
place the rule was trying to prevent. The requirement is therefore restated in the only shape that
can actually hold:

> **ONE DECLARATIVE SOURCE, READ BY BOTH SURFACES. Neither surface re-derives the rule; each reads
> the same declared rows and applies them mechanically.**

**Where it lives: `plugins/sgs-blocks/src/blocks/nav-menu/block.json::supports.sgs.sweepEligibility`.** This is not a new mechanism — it
is the framework's established shape for a fact both halves of a block need. Verified, not assumed:
PHP already reads `supports.sgs.*` in this codebase
(`plugins/sgs-blocks/includes/helpers-container.php::sgs_block_wants_intrinsic_columns` reads
`$type->supports['sgs']['intrinsicColumns']`; `plugins/sgs-blocks/includes/hover-effects.php` reads
`$type->supports['sgs']`; `plugins/sgs-blocks/includes/image-controls.php` reads
`$supports['sgs']['imageControls']`), and the JS half already imports the manifest
(`plugins/sgs-blocks/src/blocks/nav-menu/index.js::metadata` is `import metadata from './block.json'`, so the file is
proven to bundle). ⛔ **Do NOT invent a separate JSON file, a PHP constant, or a JS constant** —
any of those is a second artefact to keep in sync, which is the failure this section exists to end.

**The declared shape — three keys per row, and nothing else. Both surfaces read exactly these:**

```json
"sweepEligibility": {
  "itemColourHoverTreatment": {
    "blockingBackgroundAttrs": [],
    "blockingGradientAttrs":  [ "itemColourGradient" ],
    "glyphGuard":             null
  },
  "submenuColourHoverTreatment": {
    "blockingBackgroundAttrs": [ "submenuLinkBg", "submenuLinkBgHover",
                                 "submenuLinkBgCurrent", "submenuLinkBgGradient" ],
    "blockingGradientAttrs":  [ "submenuColourGradient" ],
    "glyphGuard":             null
  },
  "burgerColourHoverTreatment": {
    "blockingBackgroundAttrs": [ "burgerBg", "burgerBgGradient", "burgerHoverColour" ],
    "blockingGradientAttrs":  [ "burgerColourGradient" ],
    "glyphGuard":             { "attr": "triggerMode", "disallowedValues": [ "icon" ] }
  }
}
```

| Key | Condition it encodes | How BOTH surfaces evaluate it |
|---|---|---|
| `blockingBackgroundAttrs` | Condition 1 | eligible only when **every** named attribute is empty |
| `blockingGradientAttrs` | Condition 2 | eligible only when **every** named attribute is empty |
| `glyphGuard` | Condition 3 | `null` = always passes. Otherwise ineligible when `attributes[attr]` is in `disallowedValues` |

⛔ **`itemColourHoverTreatment`'s empty `blockingBackgroundAttrs` array is a DECLARED FACT, not an
omission — and it is only true because of FR-41-23's three-state `::before` rule.** Write `[]`
explicitly; a missing key and an empty array must not be distinguishable by accident. ⚠ If any
item-background fill ever moves off `::before`, this array gains that attribute in the SAME change.

**What each surface does with it, stated so neither is left to interpret:**

- **`edit.js`** reads the row's entry from the imported manifest and OMITS the `Sweep` segment when
  the predicate is false (D609 field 9c — omit, never disable). It writes no logic of its own beyond
  the three mechanical checks in the table above.
- **`render.php`** reads the same entry via
  `WP_Block_Type_Registry::get_instance()->get_registered( 'sgs/nav-menu' )->supports['sgs']['sweepEligibility']`
  and, when the predicate is false, resolves the treatment to `'swap'` **regardless of the stored
  value** — emitting no `background-image` sweep, no `background-clip`, no
  `-webkit-text-fill-color`, no `@supports` fallback and no `forced-colors`/`print` rescue. The
  stored `'sweep'` is NOT cleared (see the ⚠ above).

⛔ **Both surfaces read; neither re-derives.** A builder tempted to inline "and also check X" on one
side has just recreated the two-copies problem in a form the gate below is specifically written to
catch. If a new blocking input is discovered, it is added to the DECLARED ROW — one edit, both
surfaces, automatically.

⚠ **The resolved treatment, not the stored one, is what every downstream rule keys on** — see the
sweep-plus-decoration rule below, which is the first consumer of that distinction.

**Acceptance: §11 G14 assertions (f) and (g).** (f) proves the emitter re-checks at all; **(g) is
the new one and is the direct proof of THIS section** — it asserts the two surfaces AGREE on a
stored value that straddles the boundary, which is the only failure a single-surface check cannot
see.

#### WHAT THE FALLBACK TO `'swap'` DOES WHEN THERE IS NO HOVER COLOUR TO SWAP TO (0.4.4)

**Stated because it was previously undefined, and an undefined degrade is how a silent one ships.**
The fallback resolves the treatment to `'swap'`; `'swap'` emits the row's Hover swatch. If that
swatch is **empty** — entirely legal, and reachable in one step — there is nothing to emit.

> **Expected behaviour: nothing is emitted for that property's hover state, so the element keeps
> whatever Normal-state colour already applies. There is genuinely no visual change on hover for
> that property.** ⛔ `render.php` does NOT substitute a colour of its own, does not fall back to a
> token default, and does not re-derive one from the background. An invented hover colour would be
> a hardcoded render default — the `check-hardcoded-render-defaults.js` F3b failure class — and it
> would be un-clearable by the operator, since clearing the swatch is exactly what produced it.

⚠ **This is an honest gap, not a covered case, and it is a REAL one:** an operator who picked Sweep
(a treatment with no second colour to set, §0's colour-reuse rule) and never filled the Hover swatch
can lose hover feedback on that property entirely the moment a blocking attribute is set. It is
narrower than it sounds — the item border's own Hover treatment is the block's primary non-colour
signal (FR-41-6) and is unaffected by this row's fallback — but on a border-less menu it can mean no
hover feedback at all on that element. **Recorded as an accepted residual at FR-41-17a(d)**, in the
same register as (a) and (b): named, not papered over, and closed by one swatch entry.

#### SWEEP + A HOVER TEXT-DECORATION: THE UNDERLINE MUST TRAVEL TOO (0.4.3)

⚠ **`text-decoration-color` is NOT governed by `-webkit-text-fill-color`, so the two mechanisms
compose wrongly by default.** When an operator sets `itemTextDecorationHover` (or its `submenu`
sibling, FR-41-6 / FR-41-21) on a row whose treatment is `sweep`, the glyphs travel to the Hover
colour while the underline stays painted in the RESTING colour — the letters change and the line
under them does not, which reads as a rendering fault rather than a design.

⛔ **This rule keys on the RESOLVED treatment — the value AFTER the eligibility re-check — never on
the raw stored attribute (0.4.4).** The stored value can be `'sweep'` while the resolved value is
`'swap'` (that is the entire point of the re-check above), and on a resolved `'swap'` the glyphs do
NOT travel: they change colour instantly via the ordinary hover rule, which `text-decoration-color`
already follows for free through `currentColor`. Keying on the stored value would fire this rule on
a row that never swept, forcing a decoration colour nothing asked for and overriding an inheritance
that was already correct. **Read the resolved treatment into a variable once, immediately after the
eligibility evaluation, and have every downstream rule in `render.php` read THAT variable** — the
stored attribute is not consulted again after resolution.

> **When the RESOLVED `…HoverTreatment` is `'sweep'` AND that prefix's hover text-decoration
> resolves to a permitted, non-`none` value, the SAME block-private emitter (FR-41-21) also sets
> `text-decoration-color` to the HOVER colour** — the row's own Hover swatch, per §0's colour-reuse
> rule, never a second colour attribute. It is emitted in the same `sgs_hover_state_rules()` call as
> the decoration itself, so the line and the glyphs arrive together.

⚠ **No transition is added to `text-decoration-color`.** The sweep's travel is a
`background-position` transition on a gradient; a decoration colour cannot be swept the same way, so
it swaps at the start of the travel. That is the honest composition — a swept word with a solidly
Hover-coloured line beneath it — and it is still strictly better than a line stuck at the resting
colour. Do not add a competing `transition` on the decoration in an attempt to sync them; two
transitions at different rates on one element is the exact "looked broken" failure
`sgs/business-info` hit and fixed on 2026-09-08.

⚠ **This composition only arises on the item-text and submenu-link-text rows.** The menu-button icon
row has no typography trio (`TypographyControls` is not mounted for the burger), and the border row
sweeps a band, not glyphs. **Gated: §11 G14 assertion (e).**

⚠ **Condition 2 also protects `itemSmartContrast` (FR-41-5).** Sweep sets
`-webkit-text-fill-color: transparent`, which overrides whatever foreground
`sgs_wcag_preferred_text_colour_for_bg()` resolves — so on a swept row the WCAG toggle silently
does nothing. Because Sweep is only reachable when the element paints no background of its own, and
the toggle only acts when a Hover or Current BACKGROUND is set, the two are mutually exclusive by
construction on the item text row. **State it in the toggle's help text anyway** — a client who
sets an item background and then finds Sweep gone from the text row deserves the one-line reason.

### FR-41-27 — `itemSmartContrast` relocates to the General-tab Accessibility panel

Owner point 11a. The toggle, its default, and its two-case contrast resolution are **unchanged**
from FR-41-5. Its inspector home moves from the Design-tab colour/state area to **§9.5
"Accessibility"**, alongside `navLabel` — both are "does the menu behave safely for every
visitor" controls, and grouping them is what General-tab Accessibility is for. See §9 for the
full relocated layout.

### FR-41-28 — One border/divider mechanism for BOTH layout forks — confirmed, not new work

Owner point 11c: *"what if EVERY menu item AND submenu item gets a divider/border regardless of
horizontal-bar or vertical-drawer layout — one unified mechanism instead of per-layout
treatments?"* **Checked against the real markup and FR-41-1's own architecture: this is ALREADY
true, by construction, since v0.3.0 — there is nothing left to build.** FR-41-1 is explicit that
every stateful control (border included) targets `.sgs-nav-menu__link`, and that the bar and the
drawer are **two separate block instances**, each with its own uid and its own inspector, but
**rendering the identical `itemBorderWidth`/`itemBorderColour*`/`itemBorderHoverTreatment`
mechanism onto the same class name** regardless of which fork is active. There is no
"bar-specific" or "drawer-specific" border code path to unify — the single `SgsBorderControl`
mount and the single `sgs_border_states_css()` call already apply uniformly to both, and an
operator styling the drawer's own nav-menu instance gets the exact same border/hover-treatment
controls as the bar's. **Confirmed YES to the simplification, and confirmed it shipped in
0.3.0** — the artifact simply never stated this plainly enough for it to read as settled.

### FR-41-29 — "Current-page weight" as a block-private field inside the Typography panel

Owner point 11d, re-confirmed against FR-41-6/FR-41-21 rather than re-litigated: `SGS_FONT_WEIGHT_OPTIONS`-fed `SelectControl`
writing `itemFontWeightCurrent`, **not** built into the shared `TypographyControls` helper
(which has no Current branch at all — not a control, not an attribute key, not a PHP read — and per
FR-41-21's standing "do NOT extend the shared helper" ruling, correctly so. ⚠ The Hover trio IS
adopted from that component (0.4.2), which does not weaken this: the component already RENDERS the
hover controls and `typographyAttrKeys()` already names their keys, so adopting them costs a
block-private PHP emitter and nothing else. A Current trio has no control and no key to adopt, so it
would mean changing the shared component itself — a categorically bigger ask, and one nobody has
asked for). **What moves is placement, not mechanism**: the field sits at
the bottom of the Typography panel's **Menu** target (FR-41-22), directly under that target's
native controls, rather than in the old standalone "Menu item — state signals" panel (deleted,
§9).

⛔ **It is the ONLY Current-state typography field.** `itemTextDecorationCurrent` is not declared
(FR-41-6 consequence 2) — Current gets ONE signal, and that signal is weight. A single
`SelectControl`, not a pair. ⚠ It sits beneath the shared component's own HOVER trio row (restored
0.4.2, §9.10) — that row is `TypographyControls`' output for the hover state and has no Current
member, which is why this field stays block-private rather than being folded into it.

### FR-41-30 — Icon Picker replaces two hardcoded icons: the menu button and the sublink marker

Owner point 12. **Verified, not assumed:** `plugins/sgs-blocks/src/components/IconPicker/IconPicker.js`'s own docblock
confirms four libraries (Lucide 1,917 · Emoji 1,914 · WordPress · Dashicons), search, and
category browsing; `plugins/sgs-blocks/src/blocks/icon/edit.js` is the real, live adopter
pairing it with a 2-state gradient-capable colour row (`iconColour`/`iconColourHover` via
`SgsColourPanel`) — confirmed by reading the file (`import { … IconPicker … } from
'../../components'`, the `<IconPicker>` mount at ~L300, the colour row at ~L235-256). This is the
precedent both new wirings below copy.

**(a) The burger trigger icon.** Verified gap: `render.php` hardcodes
`sgs_get_lucide_icon( 'menu' )` with no operator choice at all (FR-41-12's own citation). New
attribute `triggerIcon` (object, default `{"source":"lucide","name":"menu"}`, matching the
`{source,name}` shape `sgs/icon` already stores) — an `IconPicker` mount in the **"Menu Button"**
panel (§9.3), visible only when `triggerMode` includes an icon (`icon` or `icon-and-text`).
`render.php` resolves the SVG through the SAME source-aware resolver `sgs/icon` already calls,
never a bespoke lookup. The default renders byte-identically to today's hardcoded Lucide `menu`
glyph. Its colour is unchanged — the existing `burgerColour`/`burgerColourHover` row already
governs it; `Sweep` on that row is gated by FR-41-26's three-condition eligibility rule.

**(b) The submenu drawer sublink marker.** Verified gap, cited from
`reports/visual-diff/nav-menu-2026-09-10.md` Fix 3: `.sgs-nav-menu__sublink-marker` is a
hardcoded `chevron-right`, no operator choice. New attributes: `sublinkMarkerIcon` (object,
default `{"source":"lucide","name":"chevron-right"}`) via `IconPicker`, and `sublinkMarkerColour`
(string, `""`, **Normal-only — no Hover/Current sibling**). The Normal-only choice mirrors the
same reasoning already used for the submenu panel's own Normal-only properties (FR-41-9): the
marker is `aria-hidden="true"` decoration sitting beside the sublink's own text, which already
carries full 3-state colour; an unset `sublinkMarkerColour` inherits `currentColor` from that
text and therefore already changes with Hover/Current for free, so a second explicit 3-state
system on the decoration itself would be a redundant control, not a richer one. Lives in the new
**Submenu — Items** panel (§9, point 7).

> ⚠ **OPEN — THE MARKER COLOUR ROW'S DESIGN CHANGED ON 2026-09-11 AND THE NEW DIRECTION IS NOT YET
> BUILT. Do not read either design as settled, and do not "resolve" this by deleting one of them.**
>
> **What is BUILT, and it matches the paragraph above exactly:** `sublinkMarkerColour` is a
> single-state Normal-only row — `textRow( { key: 'sublink-marker', attrs: { base:
> 'sublinkMarkerColour' } } )` in `plugins/sgs-blocks/src/blocks/nav-menu/edit.js::Edit`'s `colourRows`, with no Hover
> swatch, no Current swatch, no gradient and no hover-treatment selector (FR-41-23's own
> "rows that get NO hover-treatment selector" table names it).
>
> ⛔ **The ORIGINAL Normal-only reasoning stays on the record above and must NOT be deleted** — it
> is a real argument (the marker is `aria-hidden` decoration beside text that already carries full
> three-state colour, so an unset value inherits `currentColor` and follows Hover and Current for
> free), and it is what the shipped code implements. A future reader needs to see BOTH what was
> decided and that it is being revisited.
>
> **The owner's newer direction (2026-09-11), which supersedes it if built:** the row should gain
> **full Hover and Current states plus a gradient toggle**, like the other stateful rows — **but its
> colour picker should stay HIDDEN by default**, silently inheriting the sublink text's own colour,
> and appear only once an operator has actually overridden it with a custom value.
>
> ⛔ **This is not a one-line change and must not be estimated as one.** Three things are genuinely
> undesigned: (a) what "has overridden it" means as a stored state, given that an empty string is
> currently indistinguishable from "never touched"; (b) how a progressively-revealed picker is
> expressed inside `SgsColourPanel`'s row contract, which today has `heading` / `after` /
> `contrastLargeText` and no reveal mechanism; and (c) whether the reveal affordance is an
> `after`-slot control, a `ToolsPanelItem`, or something new — a fourth additive row key would be
> another design-gated shared-component change (project rule 7).
>
> ⛔ **Until the owner rules, the built Normal-only row STANDS.** Do not add the states
> speculatively, and do not remove the row. Tracked as **§12 item 8**.

> ✅ **RESOLVED 2026-09-11 (owner ruling, same day as the OPEN note above — this supersedes it).**
> The block immediately above records the question as open; it is kept verbatim because it is a
> real record of what was undecided and why. **The owner has now ruled, and the built Normal-only
> row is SUPERSEDED, not confirmed.**
>
> **The mechanism, as ruled:**
>
> - The sublink marker defaults to **inheriting the sublink text's own colour**, with **no colour
>   picker shown in the inspector at all** by default.
> - The picker is **revealed only when the operator picks a DIFFERENT icon than the default
>   chevron/arrow** for the marker. ⛔ **The reveal condition is keyed on `sublinkMarkerIcon`'s
>   value being non-default — NOT on whether `sublinkMarkerColour` has been set.** This directly
>   answers sub-question (a) above: `block.json`'s `""`-means-unset convention already distinguishes
>   "unset" from "set" everywhere else on this block, but for *this* control the trigger is simpler
>   — it is the icon choice, not the colour value, that gates the reveal. Confirmed buildable by an
>   adversarial-council reviewer on 2026-09-11 (§0a.4).
> - Once revealed, the picker gets the **full 2-state+gradient treatment matching `sgs/button`'s
>   icon-colour control** as precedent — SVG-stroke gradient for lucide/wp-icon sources, text-gradient
>   for dashicon/emoji sources, via the existing `sgs_icon_gradient_css()` helper. **This dual-render
>   behaviour is ALREADY BUILT and reusable — it is not new work.**
> - This needs **ONE new additive `SgsColourPanel` row-descriptor key** for the conditional-reveal
>   behaviour (exact shape TBD at build time, per sub-question (b) above). It is **NOT** a new
>   duplicate helper file, and it is **NOT** a `fillRow3`/`textRow3`-style fork (FR-41-2 stays
>   correct — see §0a.4).
> - This ruling **supersedes** the earlier "Normal-only, exempt from states" draft language for the
>   sublink marker recorded above — that language stays on the record as history, not as the current
>   design.
>
> **Still not built** — this is a design decision, not a build. The mechanism above is what will be
> built; §12 item 8 is updated to reflect that the design question is closed and only the build
> remains.

---

## 7b. Motion + placement (0.4.1)

### FR-41-31 — The menu button gains an optional magnetic pull

**Block-private, Tier V, reusing 100% of the framework's shared `fx-magnet` runtime** (Spec 38
FR-38-30) **at the CSS/JS layer only.** No new JS module, no new CSS module, no DB row, and no
fx-panel or roster registration. ⚠ **One two-line, value-preserving edit to the EXISTING shared
stylesheet is in scope and is design-gated** — `plugins/sgs-blocks/assets/css/fx-magnet.css` exposing its own
transition as `--sgs-magnet-transition` so this block reads the value rather than duplicating it
(below). That is an addition to a shared file, not a new module, and it changes no rendered value
for any existing adopter (§11 G1(e)).

⚠ **Two independent reasons the roster route is wrong here, both verified rather than assumed.**
(1) `sgs/nav-menu` is deliberately EXCLUDED from the fx-panel roster under the motion system's own
containment rule — a functional navigation element does not get an effects panel. (2) The button is
a DESCENDANT of the block root, and the generic fx injector only reaches the root, so it could not
attach there even if the block were on the roster. This is the same category as the block's
existing `loopCarousel` and timeline-connector precedents: shared runtime, block-private wiring.

**New attributes (§8.4):**

| Attribute | Type | Default | Control |
|---|---|---|---|
| `triggerMagnetEnabled` | boolean | `false` | `ToggleControl` |
| `triggerMagnetRadius` | number | `120` | `RangeControl`, **min 20 max 400** |
| `triggerMagnetStrength` | number | `24` | `RangeControl`, **min 2 max 80** |

⛔ **The RangeControl bounds match `fx-magnet.js`'s own clamp exactly.** A wider slider would have
dead ends — a client dragging past the clamp sees the number change and the button not move, which
reads as a broken control. Do not widen either range without changing the runtime's clamp first.

⛔ **No axis control.** A square button has no axis story; omitting the attribute correctly falls
back to the runtime's `'both'` default. Adding one would be a control with no meaningful wrong
answer, which is a control with no reason to exist.

**Panel:** "Menu Button" (§9.3), Design tab, after the size control. Help text: *"Makes the menu
button lean toward the visitor's cursor as they approach it. Off automatically on touch devices and
when reduced motion is requested."*

**Render wiring — on the `<button class="sgs-nav-menu__burger">` element only.** When enabled, emit
`data-sgs-fx="magnet" data-sgs-fx-magnet-radius="{value}" data-sgs-fx-magnet-strength="{value}"`,
each value through `absint()` then `esc_attr()`. **When disabled, emit no attribute at all** —
byte-identical to today's markup.

⛔ **No `view.js` change and no enqueue code.** The motion registry's enqueue is **markup-sniffed**
— it regexes the rendered HTML for `data-sgs-fx="…"` — not roster-gated, so the shared `fx-magnet`
module and its stylesheet are picked up automatically the moment the attribute is emitted, and are
not loaded at all when it is not. Writing an enqueue here would be a second mechanism competing
with a working one.

⛔ **One companion CSS rule is REQUIRED, in nav-menu's own stylesheet, in the same change:**

```css
.sgs-nav-menu__burger[data-sgs-fx="magnet"] {
  transition: background-color var(--wp--custom--transition--fast, 150ms ease),
              var(--sgs-magnet-transition, transform 180ms ease-out);
}
```

Without it the shared magnet effect's own transition and the burger's existing hover-background
transition are **equal specificity**, and whichever stylesheet loads last wins — silently killing
one of the two. Which one dies depends on enqueue order, so it is a bug that reproduces
intermittently and looks like a runtime fault. The attribute-scoped selector means the rule applies
only when the effect is on, so a magnet-less button is untouched.

⛔ **The magnet half of that declaration is READ from a shared custom property, never retyped as a
literal (0.4.3).** Verified in `plugins/sgs-blocks/assets/css/fx-magnet.css` (note the path — the
stylesheet lives under `plugins/sgs-blocks/assets/css/`, registered by
`plugins/sgs-blocks/includes/class-sgs-motion-registry.php` as `'magnet' => 'assets/css/fx-magnet.css'`; there is no
`fx-magnet.css` beside the JS module): its `[data-sgs-fx="magnet"]` rule declares
`transition: transform 180ms ease-out`, and that file's own docblock explains WHY 180ms — *"the
transition is the release, not the pull … short enough that it never feels laggy while tracking."*
Copying the literal into nav-menu makes the number true in two places and correct in one the day it
is tuned.

**The shared file therefore exposes the value it already owns, and nav-menu consumes it:**

```css
/* assets/css/fx-magnet.css — the two-line addition */
[data-sgs-fx="magnet"] {
  --sgs-magnet-transition: transform 180ms ease-out;
  transition: var( --sgs-magnet-transition );
  /* …transform / will-change unchanged… */
}
```

⚠ **`--sgs-magnet-transition` is a CUSTOM PROPERTY, so it INHERITS to every descendant of the
element it is declared on (0.4.4).** Declared on `[data-sgs-fx="magnet"]`, its value is visible to
that element's whole subtree — on the burger, that is the SVG icon and any `__burger-text` span. It
is harmless here (nothing in the subtree reads it), but a future consumer of the shared
`fx-magnet.css` must not read it and conclude the element it read it ON is itself a magnet: an
inherited value is indistinguishable from a locally declared one at the point of use. **If a
descendant ever needs to know, key on the `[data-sgs-fx="magnet"]` ATTRIBUTE, which does not
inherit** — do not add `--sgs-magnet-transition: initial` resets down the tree, which would be a
second mechanism guarding a problem nothing currently has.

⚠ **This is a shared-file touch and is therefore DESIGN-GATED (project rule 7), small as it is.** It
is two lines, it changes no rendered value for any existing adopter (the property resolves to the
same declaration the file already emitted), and nav-menu's `var()` carries the identical literal as
its fallback so the rule is correct even if the property is never declared. **Acceptance: it rides
G1 as a fifth proof** — every existing `[data-sgs-fx="magnet"]` element renders a byte-identical
computed `transition` before and after.

⚠ **REDUCED MOTION: the companion rule OUT-RANKS the shared effect's own kill switch, and the thing
that rescues it is a pre-existing `!important` rule this spec had not named (0.4.3).** Stated
precisely, because the specificity numbers are the whole argument:

| Rule | Selector | Specificity | Under `reduce` |
|---|---|---|---|
| Shared kill switch | `[data-sgs-fx="magnet"]` inside `@media (prefers-reduced-motion: reduce)` (`plugins/sgs-blocks/assets/css/fx-magnet.css`) | **(0,1,0)** | sets `transform:none; transition:none` |
| This companion rule | `.sgs-nav-menu__burger[data-sgs-fx="magnet"]` | **(0,2,0)** | would re-assert a `transition` and **beat the kill switch** |
| The rescue | `.sgs-nav-menu__burger` inside `@media (prefers-reduced-motion: reduce)` (`plugins/sgs-blocks/src/blocks/nav-menu/style.css`, the four-selector list also naming `.sgs-nav-menu__link`, `.sgs-nav-menu__indicator` and `[data-magnet] .sgs-nav-menu__magnet-target`) | (0,1,0) **+ `!important`** | forces `transition-duration: 0.01ms`, which beats both |

**Net outcome: correct — the transition is killed and the `transform: none` half was never at risk**
(this companion rule declares no `transform`, so the shared kill switch's `transform: none` applies
unopposed). But it is correct *because of a rule written for four unrelated selectors*, which is a
dependency nobody would find by reading FR-41-31.

⛔ **Do NOT ALSO wrap the companion rule in `@media not (prefers-reduced-motion: reduce)`.** It was
considered and refused: the `!important` rescue cannot be removed (it governs three other elements),
so scoping would be a SECOND mechanism guaranteeing an outcome an unremovable existing rule already
guarantees — two overlapping fixes, neither falsifiable, neither ever safely deletable. The
dependency is named here and asserted at **§11 G9** instead. ⛔ And do **not** give the companion
rule `!important` to "make it win" — that would beat the rescue and reinstate the very transition
reduced motion is asking to remove.

**Acceptance: §11 G17.** With `triggerMagnetEnabled` false (its default), the rendered button
markup is byte-identical to a pre-0.4.1 build, and **no magnet module or stylesheet is enqueued on
the page** — assert the absence of the asset, not just the absence of the attribute.

### FR-41-32 — Cursor-reactive field: eligible, deliberately NOT offered, revisit after the design gate

**Written in the same spirit as FR-41-20 ("active-trail is not implemented"): a capability someone
will reasonably expect, named as not-built with the reason, rather than left to be rediscovered.**

**(a) The block genuinely qualifies as an emitter.** Verified fact, not speculation:
`sgs/nav-menu` declares `containerKind: "layout"`, which satisfies the effects system's own
eligibility check. Nothing structural is in the way.

**(b) It is deliberately not offered, because the only current mechanism is all-or-nothing.** The
sole route to cursor-field is `supports.sgs.fx.motionSurface: true`, and switching that on opens a
panel carrying **nine effects at once** — cursor-field, generative-background, grid-dots, morph,
motion-path, particles, scrub, wave-gradient, plus magnet, which would then need explicit
subtraction via `providesNatively` to avoid colliding with FR-41-31. The framework's effects system
has no way to offer ONE effect without its whole `requires`-token sibling group, and the
framework's own generator script **names `sgs/nav-menu` explicitly** as one of the blocks its
panel-bloat containment rule was measured and written to protect. Bundling eight unrelated
decorative effects onto a functional navigation element is exactly what that rule exists to
prevent.

**(c) Revisit after the design gate lands.**
`.claude/plans/2026-09-10-fx-selective-effect-offering-design-gate.md` will build a proper
per-block/per-effect selection system. When it does, this decision should be re-taken on merit
rather than inherited.

⛔ **No controls, no attributes and no panel placement are designed for this in 0.4.1.** It is out
of scope until that work lands (§1.2). Do not build a bespoke one-off cursor-field wiring here to
route around the containment rule — that is the rule's failure mode, not its exception.

### FR-41-33 — Border COLOUR joins the global Colour panel; width, style and radius stay with the element

**Owner-locked, 0.4.1, decided on merits and knowingly diverging from a generic framework rule.**

**The split:**

| Property | Home | Control |
|---|---|---|
| Border **width**, **style**, **radius** | the element's own panel — "Menu item" (§9.7), "Submenu — Container" (§9.9) | `SgsBorderControl` with **`showColour={ false }`** |
| Border **colour**, all states | the global Colour panel (§9.6), as an ordinary row alongside fill and text | `SgsColourPanel` row — 3 states on the item, Normal-only on the panel |

**Why the exception is taken, in its own terms.** `SgsColourPanel.js`'s docblock names border
colour as one of exactly three documented exemptions (with overlay and shadow colour), on the sound
general reasoning that each pairs a colour with a non-colour sibling the panel has no slot for.
**This block's whole redesign is a side-by-side comparison of every element's colours across three
states.** Border colour is precisely the kind of colour that must coordinate with the fill and the
text beside it — an operator matching a Current-state border to a Current-state text colour should
not have to hold one value in their head while opening another panel. Width, style and radius need
no such comparison and stay put. **This is a considered, block-scoped exception, not an error or an
oversight of the general rule**; the general rule is unchanged for every other block, and no other
block's inspector moves.

**Feasibility — checked, not assumed.**

1. ⛔ **`SgsBorderControl` has NO way to suppress its colour picker today.** Read in full: its prop
   contract offers `colourStates` / `colourValue` / `onColourChange` / `colourGradientValue` /
   `onColourGradientChange` / `colourLinked` / `colourLabel`, and it renders
   `<GradientCapableColourControl>` **unconditionally** inside its `.sgs-border-control__colour`
   `FlexItem`. Omitting the colour props does not omit the control — it renders an empty picker.
   **A small, additive prop is therefore required: `showColour` (boolean, default `true`).** When
   `false`, the colour `FlexItem` is not rendered. Every existing mount omits the prop and is
   byte-identical (§11 G1). ⚠ The mount roster is a live grep, never a cached count.

   ⛔ **`showColour={ false }` makes TEN existing props INERT, and that ignore-list is part of the
   prop's contract — it must be documented on the component, not left to be discovered (0.4.4).**
   All ten reach `GradientCapableColourControl` and nothing else; verified by reading
   `SgsBorderControl.js`'s destructured prop list and its single `<GradientCapableColourControl>`
   mount:

   | Prop | Inert under `showColour={ false }` because |
   |---|---|
   | `colourStates` | the multi-state array is only ever forwarded as that control's `states` |
   | `colourValue` / `onColourChange` | single-state colour pair, forwarded to the same control |
   | `colourGradientValue` / `onColourGradientChange` | gradient pair, same destination |
   | `colourLinked` | token-slug storage flag, same destination |
   | `colourLabel` | labels the suppressed swatch |
   | `clearable` · `enableAlpha` | picker affordances on the suppressed swatch |
   | `contrastAgainst` / `contrastLabel` / `contrastLargeText` | ⚠ **the dangerous one** — a caller can wire a full WCAG contrast check that then silently never runs, because the control that performs it is not rendered. A contrast check that is present in the source and absent at runtime reads as covered when it is not |

   ⛔ **`borderStyle` is NOT on this list** and must not join it — it also travels through
   `GradientCapableColourControl` today, which is precisely why item 2 below re-parents it rather
   than letting it die with the popover.

   ⚠ **`showColour={ false }` must not silently swallow these — the component's own docblock
   carries the ignore-list verbatim**, so a future caller reading the prop contract sees which of
   its props stop meaning anything. This is the exact shape recorded in this project's
   `not-declared-does-not-mean-does-nothing` lesson, inverted: here a prop stays *declared* and
   stops *doing* anything. ✅ `sgs/nav-menu`'s own two mounts pass none of the ten — the border
   colour rows carry `contrastAgainst` / `contrastLargeText: true` in the **Colour panel**
   (§9.6 / FR-41-17), where the control that reads them is actually rendered.
2. ⚠ **`borderStyle` currently rides INSIDE the colour popover** — `SgsBorderControl` forwards
   `styleValue`/`onStyleChange` into `GradientCapableColourControl` as
   `borderStyle`/`onBorderStyleChange`, because the native `BorderBoxControl` opens both from one
   swatch. **Suppressing the picker must not silently take border style with it.** Under
   `showColour={ false }`, `SgsBorderControl` renders **the existing shared
   `BorderStyleControl`** as its own sibling in the same row. No attribute moves, no capability is
   lost, and no new control is written — only the affordance changes, for the one mount that asks
   for it.

   ⛔ **REUSE `plugins/sgs-blocks/src/components/BorderStyleControl.js::BorderStyleControl` — do
   NOT hand-roll a `SelectControl`.** Verified, not assumed: the component exists, is exported from
   the barrel (`plugins/sgs-blocks/src/components/index.js::BorderStyleControl`), and already has
   TWO live adopters — `GradientCapableColourControl.js` (which is the very control
   `showColour={ false }` suppresses, so this is literally the same control the operator sees today,
   just re-parented) and `DesignTokenPicker.js`. It is a thin wrapper matching WP core's native
   `BorderControlStylePicker` exactly: a `ToggleGroupControl` with `isDeselectable` and three
   `ToggleGroupControlOptionIcon` entries (Solid / Dashed / Dotted), with "None" reached by
   deselecting the active option rather than a fourth segment. Its prop contract is
   `{ label?, value, onChange }`, and `onChange` receives `''` on deselect.

   ⚠ **Gate the sibling mount exactly the way `GradientCapableColourControl` already gates it** —
   verified in that file: `{ typeof onBorderStyleChange === 'function' && ( … ) }`. Under
   `showColour={ false }`, `SgsBorderControl` renders the sibling only when
   `typeof onStyleChange === 'function'`. A caller that never wired border style gets no orphan
   control appearing where a suppressed popover used to be — which would be a NEW control on an
   existing mount, and G1(d)'s byte-identity proof is exactly what that would break.

   ⚠ **A hand-rolled `SelectControl` would also silently RE-WIDEN the vocabulary.** The component's
   own docblock records that its three icons deliberately replaced a hand-rolled nine-option
   `SelectControl` (None/Solid/Dashed/Dotted/Double/Groove/Ridge/Inset/Outset) that had been
   duplicated across 13 blocks, on an owner ruling to match native exactly. Writing a fresh
   `SelectControl` here would reintroduce the fourteenth copy of the thing that decision deleted.
3. ✅ **`ShadowControl` is a precedent, and honestly only a partial one.** D621/D622 externalised its
   colour OWNERSHIP — the caller supplies `colour` / `onColourChange` and owns the sibling
   `{name}Colour` attribute — which proves that a composite not owning its own colour attribute is
   already an established, accepted pattern in this codebase. ⚠ It does **not** prove the second
   half: the control still RENDERS the picker itself, inside `ShadowStateBuilder`. `showColour` is
   genuinely new behaviour rather than an existing capability being reused, and is named as such.

⛔ **The split is exclusive: exactly ONE live control writes each attribute.** A duplicate writer
across two panels is banned by `check-duplicate-controls.js`, and a "convenience" second swatch
would be exactly that. **Acceptance: §11 G18.**

---

## 8. Attribute reconciliation — the full explicit list

Existing names WIN. New attributes extend the existing convention (`itemColourHover` exists → its
sibling is `itemColourCurrent`). Source of truth read in full:
`plugins/sgs-blocks/src/blocks/nav-menu/block.json`.

### 8.1 EXISTING — reused unchanged, now driven by a 3-state row

| Attribute | New role |
|---|---|
| `itemColour` / `itemColourHover` | Normal / Hover of the item text row |
| `itemColourGradient` | Item text Normal gradient (**Normal only** — see §8.5) |
| `itemBg` / `itemBgHover` | Normal / Hover of the item background row. `itemBgHover` is ALSO the Highlight pill's fill (FR-41-25) — one swatch, three treatments |
| `itemBgGradient` | Item background Normal gradient |
| `submenuColour` / `submenuColourHover` | Normal / Hover of the submenu link text row |
| `submenuColourGradient` | Submenu link text Normal gradient |
| `submenuBg` | Submenu **panel** background — Normal only, no new states (FR-41-9) |
| `navBg` / `navBgHover` / `navBgGradient` | 2-state — **the nav bar keeps two states**, not three (a bar is never "the current page") |
| `navColour` / `navColourHover` / `navColourGradient` | 2-state — same reason |
| `burgerColour` / `burgerColourGradient` / `burgerColourHover` / `burgerBg` / `burgerBgGradient` / `burgerHoverColour` / `burgerSize` | 2-state, unchanged; re-homed into the **"Menu Button"** panel + the Colour panel's **Menu button** grouping. ⛔ Names are NOT changed — the panel rename is a label, not an attribute rename (FR-41-12) |

⛔ **`burgerColourHover` and `burgerHoverColour` are two different attributes governing two
different properties, and nothing but this line disambiguates them (0.4.3).** Both exist today, both
are declared `{"type":"string","default":""}`, and their names are anagram-close — read the wrong one
and you wire a colour control to a background:

| Attribute | Governs | Verified emission |
|---|---|---|
| **`burgerColourHover`** | the **ICON/TEXT colour** on hover | `render.php` emits `color:` on `.sgs-nav-menu__burger` via `sgs_hover_state_rules()`. Manifest: `burger.states.hover.attrMap."css:color"`. It is the Hover half of the **Icon colour** row (§9.6) |
| **`burgerHoverColour`** | the **BUTTON BACKGROUND** on hover | `render.php` emits `background-color:` on the same element via `sgs_hover_state_rules()`. Manifest: `burger.states.hover.attrMap."css:background-color"`. It is the Hover half of the **Button background** row (§9.6), whose Normal half is `burgerBg` |

⛔ **Neither is renamed** — §8.4's zero-renames rule binds here as much as anywhere, and the
converter emits both names. The fix for the ambiguity is this table, not a rename. ⚠ The two rows
they belong to carry DIFFERENT treatment attributes for the same reason —
`burgerColourHoverTreatment` (3-option, Sweep eligibility-gated) on the icon-colour row,
`burgerBgHoverTreatment` (2-option) on the background row (FR-41-23). Crossing the two attributes
would also cross their treatments.
| `itemTextDecoration` | Unchanged as an attribute, Normal state. Gains `overline` as a fifth `enum` value (FR-41-6) and an explicit `attrMap` entry (§8.6a). ✅ **It gains a HOVER sibling (`itemTextDecorationHover`, §8.4 / FR-41-6 / FR-41-21).** ⛔ It gains **no** Current sibling — FR-41-6 consequence 2 |

### 8.2 EXISTING — untouched by this spec

`padding` · `margin` · `ref` · `collapsePoint` · `drawerRef` · `featuredItemIds` · `navLabel` ·
`gap` · `listColumns` · every `itemFontSize`/`FontWeight`/`FontStyle`/`LineHeight`/`FontFamily`/
`TextTransform`/`LetterSpacing`/`TextAlign`/`TextWrap`/`TextColumns`/`TextIndent`/`WritingMode`
(+ their `*Unit` siblings) · every `featured*` · `itemMagnetEnabled` · `sgsCustomCss` ·
`submenuAlign` · `submenuCaret` · `submenuCloseGrace` · `submenuMinWidth` · `submenuPadding`.

⛔ **`indicatorStyle` / `indicatorColour` / `indicatorColourGradient` are NOT in this list — all
three are DELETED (§8.3).** They appeared here in 0.4.0 while `indicatorStyle` was simultaneously
listed as deleted below; that contradiction is resolved by deleting all three, per FR-41-25.
⚠ The `itemMagnetEnabled` above is the EXISTING item-level magnet in the Effects panel (§9.11). It
is a different attribute from FR-41-31's new `triggerMagnetEnabled`, which scopes the same shared
`fx-magnet` runtime to the menu button. Neither reads the other's attributes.

### 8.3 DELETED

| Attribute | Why |
|---|---|
| `hoverStyle` | FR-41-4 — the whole chooser is retired |
| `underlineColour` · `underlineColourHover` · `underlineColourGradient` · `underlineThickness` · `underlineOffset` | FR-41-4 — superseded by the border + hover animation, not kept alongside |
| `itemRadius` · `itemRadiusHover` | Folded into `itemBorderRadius` on the `SgsBorderControl` pair (FR-41-7). Radius belongs with the border, per that control's own contract. |
| `submenuRadius` | Folded into `submenuBorderRadius` on the panel's own `SgsBorderControl` pair, same reason. Leaving a flat radius control beside a border mount that also renders radius is two controls for one property. |
| `indicatorStyle` **(0.4.0)** | FR-41-25 — folded into `itemBgHoverTreatment === 'highlight'`. The standalone "Indicator" panel is deleted with it. |
| `indicatorColour` · `indicatorColourGradient` **(0.4.1)** | FR-41-25 — the Highlight pill paints in the item Background row's own `itemBgHover` / `itemBgHoverGradient`. A second colour pair for one property broke the colour-reuse rule (§0); it was the only row on the block that did. |
| `borderHoverAnimation` **(0.4.0, renamed not just deleted)** | FR-41-23 — superseded by `itemBorderHoverTreatment` (enum `none`/`swap`/`sweep`, direction now a secondary control shown only under `sweep`). The MECHANISM (FR-41-8) is unchanged; only the attribute name and control placement move. |

⛔ No deprecation for any of these — project policy D270 (pre-production, zero block deprecations).

⛔ **All FIVE `indicator*` / `borderHoverAnimation` names, plus the `hoverStyle` / `underline*` /
`itemRadius*` / `submenuRadius` set above, are covered by the SAME deletion sweep and the SAME
stored-content check — §11 G5 and G5a.** `indicatorStyle` in particular carries a real stored value
on any page authored with a pill, and PHP does NOT drop an undeclared attribute before `render.php`
runs (D338) — so a page keeps handing it over until its next editor save. Omitting it from the
sweep is how a client's pill setting disappears with no explanation and no failing gate.

### 8.3a NET-NEW attributes proposed in 0.4.0 and NOT declared in 0.4.1

These were never shipped, so they are not deletions — they are proposals withdrawn before build.
Listed so a builder working from a 0.4.0 copy does not declare them.

| Proposed attribute | Withdrawn because |
|---|---|
| ~~`itemTextDecorationHover` · `itemTextTransformHover` · `itemFontWeightHover` · `submenuTextDecorationHover` · `submenuTextTransformHover` · `submenuFontWeightHover`~~ | ⚑ **NO LONGER WITHDRAWN — RESTORED IN 0.4.2 (owner-locked).** All six ARE declared; see §8.4 for their types and defaults, FR-41-6 for the reframing, FR-41-21 for the emitter. 0.4.1 withdrew them as collateral of dropping the underline's *framing*; the owner's correction is "keep all, just don't make underline this central control … treating it as the divider". Row kept as a tombstone so a 0.4.1 reader does not re-withdraw them. |
| `itemTextDecorationCurrent` | FR-41-6 consequence 2 — `TypographyControls` models resting + hover only, so there is no shared control for a Current decoration, and Current already carries `itemFontWeightCurrent` as its signal. Still withdrawn in 0.4.2. |
| `itemBorderColourGradient` | FR-41-7 — scope cut on a pseudo-element budget; `.sgs-nav-menu__link::before` is the item background layer. |
| `indicatorColour` · `indicatorColourGradient` | Existing attributes, so they are deletions (above) rather than withdrawals — named here too because a 0.4.0 reader will find them in FR-41-25's old text. |

### 8.4 NET-NEW attributes

| Attribute | Type | Default | Purpose |
|---|---|---|---|
| `itemColourCurrent` | string | `""` | Nav item text, current page |
| `itemBgCurrent` | string | `""` | Nav item background, current page |
| `itemBgCurrentGradient` | string | `""` | gradient sibling of `itemBgCurrent` |
| `itemBgHoverGradient` | string | `""` | gradient sibling of `itemBgHover`. **Completes the row's three-state gradient set** (`itemBgGradient` Normal / this / `itemBgCurrentGradient` Current) and is what the Highlight pill paints with when the operator picks a gradient — FR-41-25. ⚠ The row was the only 3-state fill on this block missing its Hover gradient sibling; declaring it is what lets Highlight read the Hover swatch in BOTH forms rather than flat-only |
| `itemFontWeightCurrent` | string | `"600"` | FR-41-6 non-colour Current signal; converts the existing hardcode. **String, not number** — matches `itemFontWeight` |
| `itemTextDecorationHover` | string | `""` | **RESTORED 0.4.2.** `showHover` trio member, Menu target. Optional secondary decoration — ⛔ never the block's primary non-colour signal and never "the divider" (FR-41-6) |
| `itemTextTransformHover` | string | `""` | **RESTORED 0.4.2.** `showHover` trio member, Menu target |
| `itemFontWeightHover` | string | `""` | **RESTORED 0.4.2.** `showHover` trio member, Menu target. **String, not number** — matches `itemFontWeight` / `itemFontWeightCurrent`. ⚠ Help text must carry the reflow caution (FR-41-6 consequence 3) |
| `submenuTextDecorationHover` | string | `""` | **RESTORED 0.4.2.** `showHover` trio member, Submenu target (FR-41-22) |
| `submenuTextTransformHover` | string | `""` | **RESTORED 0.4.2.** `showHover` trio member, Submenu target |
| `submenuFontWeightHover` | string | `""` | **RESTORED 0.4.2.** `showHover` trio member, Submenu target. **String, not number** |
| `itemSmartContrast` | boolean | `true` | FR-41-5 auto-readable foreground |
| `itemBorderWidth` | object | `{}` | box object, base-only, `SgsBorderControl` |
| `itemBorderStyle` | string | `""` | `SgsBorderControl`'s colour popover |
| `itemBorderRadius` | object | `{"topLeft":"8px","topRight":"8px","bottomRight":"8px","bottomLeft":"8px"}` | corner object, `SgsBorderControl`'s radius half. ⚑ **DEFAULT DECIDED 0.4.6 (owner): 8px on all four corners, NOT `{}`** — see the ⛔ below |
| `itemBorderColour` / `…Hover` / `…Current` | string | `""` each | the 3-state border colour, authored as an ordinary row in the global Colour panel — FR-41-33. ⛔ No gradient sibling (FR-41-7) |
| `submenuBgGradient` | string | `""` | ⚑ **ADDED AS BUILT 2026-09-11** — the submenu PANEL background's Normal-state gradient sibling, required by the shared `sgs_custom_property_gradient_decls()` end shape. **Normal only** (FR-41-9). Supersedes §8.5 item 2 — read that entry before concluding this is a drift |
| `submenuColourCurrent` | string | `""` | Submenu link text, current page |
| `submenuLinkBg` / `…Hover` / `…Current` | string | `""` each | Submenu **link** background, 3 states (FR-41-9) |
| `submenuLinkBgGradient` | string | `""` | Normal-state gradient sibling |
| `submenuAnimation` | string | `"none"` | FR-41-10 |
| `submenuTopOffset` | string | `""` | FR-41-11 |
| `submenuBorderWidth` | object | `{}` | box object, base-only, `SgsBorderControl` |
| `submenuBorderStyle` | string | `""` | `SgsBorderControl`'s colour popover |
| `submenuBorderRadius` | object | `{}` | corner object; supersedes `submenuRadius` |
| `submenuBorderColour` | string | `""` | Submenu **panel** border — **Normal only** (FR-41-9) |
| `submenuBorderColourGradient` | string | `""` | Normal-state gradient sibling |
| `submenuShadow` | string | `""` | Box-shadow **shape** on the floating panel (§9.9) |
| `submenuShadowColour` | string | `""` | Its colour — the name is forced by `plugins/sgs-blocks/src/components/ShadowControl.js::shadowAttrKeys`'s enumerated rule `colour = <base>Colour` (holds 22/22 in the corpus; the guessed `<base>HoverColour` rule scored 0/10) |
| `triggerMode` | string | `"icon"` | FR-41-12 |
| `triggerLabel` | string | `"Menu"` | FR-41-12 |
| `triggerMagnetEnabled` | boolean | `false` | FR-41-31 — menu-button magnetic pull, off by default |
| `triggerMagnetRadius` | number | `120` | FR-41-31 — `RangeControl` min 20 max 400, matching `fx-magnet.js`'s real clamp |
| `triggerMagnetStrength` | number | `24` | FR-41-31 — `RangeControl` min 2 max 80, same reasoning |
| `itemColourHoverTreatment` | string | `"swap"` | FR-41-23/26 — none / swap / sweep (sweep eligibility-gated, FR-41-26) |
| `itemBgHoverTreatment` | string | `"swap"` | FR-41-23/25 — none / swap / highlight (folds `indicatorStyle:'pill'`; the pill paints in `itemBgHover`/`itemBgHoverGradient`) |
| `itemBorderHoverTreatment` | string | `"swap"` | FR-41-23/8 — none / swap / sweep (replaces `borderHoverAnimation`) |
| `borderHoverAnimationDirection` | string | `"left-to-right"` | FR-41-23 secondary control, shown only when `itemBorderHoverTreatment==='sweep'`. Values `left-to-right`/`right-to-left`, same as v0.3.0's retired enum |
| `submenuColourHoverTreatment` | string | `"swap"` | FR-41-23/26 — none / swap / sweep. Sweep OMITTED whenever `submenuLinkBg` / **`submenuLinkBgHover`** / **`submenuLinkBgCurrent`** / `submenuLinkBgGradient` / `submenuColourGradient` is set (FR-41-26 eligibility; the two bolded state siblings were added 0.4.4 — a background in ANY state blocks the sweep, not just the resting one) |
| `submenuLinkBgHoverTreatment` | string | `"swap"` | FR-41-23 — none / swap ONLY (no Highlight — two-option row) |
| `burgerColourHoverTreatment` | string | `"swap"` | FR-41-23/26 — none / swap / sweep. Sweep OMITTED under `triggerMode:'icon'`, or whenever `burgerBg` / `burgerBgGradient` / **`burgerHoverColour`** / `burgerColourGradient` is set (FR-41-26 eligibility; `burgerHoverColour` added 0.4.4 — it is the button's HOVER BACKGROUND, §8.1). ⛔ `burgerColourHover` is NOT a blocking input — it is the icon colour the sweep travels TO |
| `burgerBgHoverTreatment` | string | `"swap"` | FR-41-23 — none / swap ONLY (two-option row) |
| `triggerIcon` | object | `{"source":"lucide","name":"menu"}` | FR-41-30(a) — replaces the hardcoded menu-button SVG |
| `sublinkMarkerIcon` | object | `{"source":"lucide","name":"chevron-right"}` | FR-41-30(b) — replaces the hardcoded `chevron-right` |
| `sublinkMarkerColour` | string | `""` | FR-41-30(b) — Normal-only; unset inherits `currentColor` from the sublink's own 3-state text colour |

⛔ **`itemBorderRadius`'s default is `8px` on all four corners, and the SHAPE is a FLAT corner
object, not a tier envelope (both decided 0.4.6).**

**Why 8px and not `{}`** — owner ruling, on merits, not on preserving the canary (the
never-reason-from-canary-content rule binds here as everywhere): a background-filled menu item with
hard square corners by default reads as unfinished, and nothing is gained by dropping a visual
behaviour the block already has. Verified against the real files rather than assumed:
`block.json` declares `itemRadius` as `{"type":"number","default":8}` **and** `render.php` applies
`: 8` as its `isset()` fallback, emitting `border-radius:8px` on `$link_sel` inside the
`if ( '' !== $item_bg_hex || '' !== $item_bg_gradient )` branch. **So an item with a background
renders 8px-rounded today from two independent sources.** An `{}` default would have changed that
silently, in the one case where the radius is actually visible.

**Why a FLAT corner object and not the `{"desktop":{}}` tier envelope — read the right precedent.**
Census across every block: **57** `borderRadius` attributes carry `{"desktop":{}}`, and every one of
them is the BLOCK-ROOT radius governed by `sgs_border_radius_tiers()`. `itemBorderRadius` is a
**PER-ELEMENT** radius (the nav item's link, not the block root), and the per-element precedent is
`sgs/product-card`'s `ctaBorderRadius`:
`{"topLeft":"10px","topRight":"10px","bottomLeft":"10px","bottomRight":"10px"}` — a flat corner
object holding CSS length STRINGS, consumed by `sgs_corner_object_shorthand()`, which reads exactly
`topLeft` / `topRight` / `bottomRight` / `bottomLeft` through `sgs_css_length_value()`. **That is the
only per-element corner object in the tree with a non-empty default, and it is the shape to copy.**
⛔ Reaching for the 57-strong root-radius shape here would author a tier envelope that
`sgs_corner_object_shorthand()` cannot read — it would find no corner keys and return `null`, so the
radius would silently vanish rather than error. ⚠ Values are STRINGS with units (`"8px"`), matching
`ctaBorderRadius`; a bare number is not the precedent.

⚠ **`submenuBorderRadius` keeps its `{}` default** — the panel already renders its own radius from
`--sgs-nm-submenu-radius` with a token fallback (census #9), so there is no existing behaviour to
preserve and nothing to decide. Same flat corner shape, empty default. Do not read the item's new
default as a reason to give the panel one.

**Full submenu typography family** — declared under FR-41-22, listed there rather than duplicated
here.

⛔ **Every `showHover` trio attribute defaults to `""` (unset) — all SIX of them, being the three
trio properties on each of the two targets. `itemTextDecorationHover` does NOT default to
`"underline"`, and that is the load-bearing half of 0.4.2's reframing.** Three independent reasons,
each sufficient on its own:

1. **A non-empty default would reinstate the underline as the block's SHIPPED hover signal** — the
   exact framing the owner's correction removes. An optional secondary decoration that appears
   without being asked for is not optional.
2. **It would ship an underline to every menu item of every install** — the design imposition
   FR-41-17a(a) and §10's ⛔ both refuse in terms ("do not close case (a) by re-defaulting").
   `itemBorderWidth`'s empty default is accepted on precisely this reasoning; a defaulted underline
   would close that residual by imposition instead.
3. **It would break the additive-defaults contract (G13).** The other two trio members have never
   had a non-empty default; a block with untouched typography must render CSS byte-identical to a
   pre-0.4.2 build, and an emitted `text-decoration:underline` on hover is not that.

⚠ **All SIX trio attributes — the three properties (decoration / transform / weight) on each of the
two targets — are plain `"type": "string"` with NO JSON `enum`, PHP-validated against the allowlists
in FR-41-21's table** — the same reasoning FR-41-8 / FR-41-10 / FR-41-24
already establish for every small enum on this block (an out-of-enum stored value silently coerces
to the block.json default with no error, which bites hardest via a programmatic writer). ⚠ This is
a **disclosed asymmetry** with the base sibling `itemTextDecoration`, which carries a real JSON
`enum` today and keeps it — an existing attribute is not restructured here, and §8.4's zero-renames
rule covers the shape as much as the name.

⛔ **Zero renames in this spec.** Every entry above is additive or a deletion; nothing is a rename.
(A rename's blast radius is the whole write path, not just the readers — the converter emits these
names too. Avoided by construction.)

### 8.4a Responsive font-size tiers — DECLARE NOTHING. The premise was checked and is false.

⚑ **DECIDED 0.4.6.** The owner's ruling was *"backfill the responsive font-size tiers in this
build"*, on the stated premise that `itemFontSizeTablet` / `itemFontSizeMobile` are named by
`typographyAttrKeys( 'item' )`, offered by the existing mount, undeclared in `block.json`, and
therefore **silently inert**. ⛔ **That premise was verified against the live files as this revision
was written, and it does not hold. There is no silent failure. Nothing is inert.** The ruling's
INTENT — the tablet and mobile tiers must genuinely persist and render, and a gate must prove it —
is adopted in full (§11 G20). The MECHANISM is corrected, because implementing the backfill as
stated would have created two dead attributes and fixed nothing.

**What was verified, and where:**

| Claim | Verified reading | Verdict |
|---|---|---|
| `itemFontSize` is a flat scalar with separate tier siblings | `block.json` declares `itemFontSize` as **`{"type":"object","default":{}}`** | **FALSE** — it is a migrated `{desktop,tablet,mobile}` TIER OBJECT |
| The editor writes `itemFontSizeTablet` / `…Mobile` | `plugins/sgs-blocks/src/components/TypographyControls.js::TypographyControls` computes `fontSizeIsTiered = isTieredValue( fontSizeRaw )`; `isTieredValue` returns true for any non-null, non-array object, so `{}` qualifies. The tiered branch renders `<ResponsiveOverride>` and writes **`{ [ k.fontSize ]: obj }`** — the whole tier object, one attribute | **FALSE** — the flat tier keys are never written on this block |
| `render.php` reads them | `sgs_typography_css_rule()` branches on `$size_is_tiered = is_array( $attributes[ $k_size ] )` and pushes a `$tiered_specs` entry emitting per-tier `@media` CSS via `sgs_emit_responsive_css()`. `FontSizeTablet` / `FontSizeMobile` are read **only** in the `else` (`$flat_specs`) branch | **FALSE** — the flat tier keys are never read on this block |
| Responsive tiers are therefore broken | Both surfaces take the tiered path, and the mount passes no `showResponsive={ false }` (it defaults `true`) | **FALSE** — tablet and mobile font size persist and render end-to-end **today** |

⛔ **Declaring `itemFontSizeTablet` / `itemFontSizeMobile` would have been an active regression, not
a neutral backfill.** Nothing writes them (the editor takes the tiered branch) and nothing reads them
(PHP takes the tiered branch), so the build would gain two attributes with zero writers and zero
readers — new dead-attribute debt, added by a fix whose whole justification was removing dead
capability. **`typographyAttrKeys()` returning a key name is not evidence that a block uses it**: the
function names the keys for BOTH storage shapes, and this block has already migrated past the flat
one. ⚠ `itemLetterSpacing` is `{"type":"object","default":{}}` too and is correct for the identical
reason — do not "complete the set" there either.

**REQUIREMENT (what the ruling's intent becomes).** No attribute is added. The tiered behaviour is
made a stated, gated guarantee rather than an undocumented accident: §11 **G20** asserts that a
tablet and a mobile font-size value, set through the editor, actually PERSIST and actually RENDER.
That gate is the deliverable, and it is the half the ruling correctly identified as missing — a
capability nobody has ever asserted is one nobody would notice losing.

⚠ **The one genuinely un-tiered member of this family is `itemLineHeight`, and it is NOT broken
either — it is merely un-migrated.** Declared `{"type":"number"}` with no default, so
`lineHeightIsTiered` is false and `TypographyControls` renders a single plain `LineHeightControl`
with **no responsive wrapper at all**, writing only `itemLineHeight`. That is a MISSING CAPABILITY
(no per-device line height is offered), never a silent discard — no control writes a key that
WordPress then drops. ⛔ **Do not "fix" it by declaring `itemLineHeightTablet` / `…Mobile`.** The
framework's settled direction is the tier-object migration, and the correct fix is to migrate
`itemLineHeight` to a tier object via `migrate-tier-object.py --property lineHeight` — which is that
codemod's job across every block, not this spec's. Named here so the next reader does not mistake it
for the defect this section just disproved.

### 8.5 Two deliberate boundaries — do not "complete the set"

1. **`itemColourGradient` stays Normal-only, and there is no `itemColourHoverGradient` or
   `itemColourCurrentGradient`.** Its own `block.json` description records why the hover sibling was
   never offered: a gradient has no single hex to contrast-test, so a hover TEXT gradient would have
   to disable the smart-contrast safety (FR-41-5). The same reasoning extends to Current.
   ⚠ **This is a TEXT-row boundary, not a general one — the item BACKGROUND row deliberately gets a
   full three-state gradient set (`itemBgGradient` / `itemBgHoverGradient` /
   `itemBgCurrentGradient`).** A background gradient has nothing to contrast-test against; it IS the
   thing being contrasted against, and `sgs_wcag_text_colour_for_bg()` resolves the foreground from
   the fill either way. Reading these two boundaries as one rule would wrongly delete
   `itemBgHoverGradient`, which FR-41-25's Highlight treatment reads.
2. ⚑ **SUPERSEDED AS BUILT (2026-09-11) — the panel background DOES carry a Normal-state
   gradient.** The original boundary read: *"No gradient on the submenu PANEL background in any
   state. The link's background gets one; the panel does not. Adding one is a separate decision,
   not an oversight."* **That separate decision was taken during the manifest rewrite**
   (`plugins/sgs-blocks/src/blocks/nav-menu/block.json::attributes.submenuBgGradient`, string, `""`), for a mechanism reason rather than a
   design one: the panel's fill is written by the shared
   `sgs_custom_property_gradient_decls( 'sgs-nm-submenu-bg', … )`, the fill-custom-property-gradient
   end shape every other background/border custom-property row in the codebase already uses, and
   that helper emits a `--sgs-nm-submenu-bg-gradient` sibling as part of its contract. ⛔ **The
   Normal-ONLY half of the boundary is untouched and still binds** — there is no
   `submenuBgGradientHover` and no `…Current`, because FR-41-9's argument (a panel is never the
   hovered surface) is about STATES, not about gradients. See FR-41-15 census #9's per-declaration
   table for the emitted shape.
3. **No gradient on the ITEM border in any state (`itemBorderColourGradient` is out of scope,
   FR-41-7), while the submenu PANEL border keeps one (`submenuBorderColourGradient`).** The
   asymmetry is a pseudo-element budget on one element, spelled out at FR-41-3(c) — do not
   "complete the set" in either direction.

### 8.6 Required `block.json` manifest changes

**(a) The `item` element gains a `current` state — with DISTINCT attribute names — and three
explicit new members.**

`supports.sgs.elements.item.states` declares `hover` only, and `item.clusters` is
`["text","fill","layout"]`. Required changes, each named:

| Change | Detail |
|---|---|
| Add `"border"` to `item.clusters` | Without it the forward-resolution pass never visits `css:border-color` / `css:border-width` / `css:border-style` and the attrMap for them is never consulted. **This exact trap is recorded live in this same file**, on the `indicator` element: *"clusters: [\"fill\"] is declared (not []) SPECIFICALLY so the forward-resolution pass actually visits css:background-color and consults this attrMap — an attrMap on an element with clusters: [] is never consulted"*. |
| **Repoint `css:border-radius`** | Base currently maps to `itemRadius`; `states.hover` currently maps to `itemRadiusHover`. Both attributes are deleted (§8.3). Base becomes `itemBorderRadius`; **the hover entry is REMOVED entirely** — radius has no hover state on the new control. ⛔ Leaving either as-is would leave two dangling references to deleted attributes in the manifest. |
| Add base border members | `"css:border-color": "itemBorderColour"`, `"css:border-width": "itemBorderWidth"`, `"css:border-style": "itemBorderStyle"` |
| Add base `css:text-decoration` | → `itemTextDecoration`. **Genuinely absent from the manifest today** — verified by reading `item.attrMap`, which declares only `css:color` / `css:color-gradient` / `css:background-color` / `css:background-image` / `css:border-radius` / `css:font-size` / `css:font-weight` / `css:font-style` / `css:line-height`. It is genuinely rendered (`sgs_typography_css_rule()` emits `text-decoration:` from `{prefix}TextDecoration`). ✅ It now has a hover sibling to pair with (below); it still has no current sibling (FR-41-6), and a base-plus-hover pair with no current entry is correct, not a finding. |
| Add base `css:text-transform` **(0.4.3)** | → `itemTextTransform`. **Also genuinely absent** — same read of `item.attrMap` as above. Required for the same reason as the decoration entry: without an explicit base, `itemTextTransform` and `itemTextTransformHover` both derive to `(text-transform, item, state=NULL)` and collide on ONE routing slot. ⛔ This is not belt-and-braces; it is the third instance of a collision this block's own manifest already records twice (see the ⛔ below). |
| ✅ Base `css:font-weight` — **ALREADY PRESENT, must SURVIVE (0.4.3)** | `item.attrMap` already declares `"css:font-weight": "itemFontWeight"` — verified, not assumed. It is listed in this table so a builder does not read the new hover + current `css:font-weight` entries below and conclude the base one is now redundant. ⛔ **Do not remove it.** Dropping it leaves two state entries with no base, which is the STATE_WITHOUT_BASE shape the manifest gate flags (Spec 35 FR-35-5) — the exact defect that put `burgerBg` into the manifest in the first place. |
| Add `states.hover` members | `"css:border-color": "itemBorderColourHover"`, `"css:background-image": "itemBgHoverGradient"`, and — **RESTORED 0.4.2** — `"css:text-decoration": "itemTextDecorationHover"`, `"css:text-transform": "itemTextTransformHover"`, `"css:font-weight": "itemFontWeightHover"`. ⛔ All three trio entries are **explicit**, never left to the `{prefix}Suffix` convention: the base `itemTextDecoration` and the hover `itemTextDecorationHover` would otherwise both derive to `(text-decoration, item, state=NULL)` and collide on one routing slot — the identical collision this element's own `_note` records twice (see the ⛔ below). |
| Add `states.current` | `"css:color": "itemColourCurrent"`, `"css:background-color": "itemBgCurrent"`, `"css:background-image": "itemBgCurrentGradient"`, `"css:border-color": "itemBorderColourCurrent"`, and — **explicitly** — `"css:font-weight": "itemFontWeightCurrent"` |

⚠ **`css:background-image` is claimed at all three states by three DIFFERENT attributes**
(`itemBgGradient` base / `itemBgHoverGradient` hover / `itemBgCurrentGradient` current). That is
the safe shape — see the last-write-wins warning below — but it must be declared explicitly at each
state, never left to a `{prefix}Suffix` convention.

⚠ **`css:font-weight` is now claimed at all three states too (0.4.2)** — `itemFontWeight` base /
`itemFontWeightHover` hover / `itemFontWeightCurrent` current — and `css:text-decoration` at two
(`itemTextDecoration` base / `itemTextDecorationHover` hover). Same safe shape, same obligation:
three (or two) DIFFERENT attribute names, each declared explicitly at its own state. Do not read
this as "the base entry is now redundant" — dropping it would leave a hover entry with no base,
which is the STATE_WITHOUT_BASE shape the manifest gate does flag.

⛔ **The explicit current `css:font-weight` entry is not belt-and-braces — this block's own manifest
records the same collision happening TWICE.** The
`burger` element's `_note` records `burgerColour` + `burgerColourHover` both deriving to
`(color, burger, state=NULL)` and colliding on one routing slot; the `sublink` element's `_note`
records the identical thing for `submenuColour` + `submenuColourHover`. Both were fixed by adding
the explicit state entry. A `{prefix}Suffix` convention does not separate a base attribute from its
state sibling on its own.

⛔ **THE `current` STATE HAS ALREADY CAUSED A SILENT BUG ONCE.** The `item._note` records that a
`selected` attrMap **byte-identical to `hover`** was removed on 2026-08-19 because the classifier's
`_record()` is **last-write-wins** — `selected` iterated second and silently overwrote the correct
hover derivation, tagging all three attributes with the wrong `css_state` in the DB, a state they
never render in. **The safe form is the one this spec creates: the `current` state maps DIFFERENT
attribute names, so there is nothing to overwrite.** Required verification, not optional: after the
change, assert via `/sgs-db` that `itemColourHover` and `itemBgHover` still carry
`css_state='hover'`, and that the new Current attrs carry `css_state='current'` — a negative control
proving the collision did not recur (§11 G4).

**(b) The `sublink` element gains a `current` state, a `fill` cluster, and explicit typography
members.** `submenuColourCurrent` on `states.current`; `submenuLinkBg` / `submenuLinkBgHover` /
`submenuLinkBgCurrent` across base + both states; `submenuLinkBgGradient` as
`css:background-image` at base. The element currently declares `"clusters": ["text"]` only — it
must gain `"fill"`, for the same forward-resolution reason as (a). ✅ **`states.hover` DOES carry
typography members (RESTORED 0.4.2)** — `"css:text-decoration": "submenuTextDecorationHover"`,
`"css:text-transform": "submenuTextTransformHover"`, `"css:font-weight": "submenuFontWeightHover"`,
each explicit for the same collision reason as (a). The element's `_note` already records
`submenuColour` + `submenuColourHover` colliding on one routing slot before an explicit state entry
was added; the trio would collide with its own base siblings identically.

⛔ **Each of those three hover members needs its BASE counterpart declared in the SAME change, and
on this element NONE of the three exists today (0.4.3).** Verified: `sublink.attrMap` declares only
`css:color` and `css:color-gradient` — no typography member of any kind. The three required base
entries are `"css:text-decoration": "submenuTextDecoration"`, `"css:text-transform":
"submenuTextTransform"` and `"css:font-weight": "submenuFontWeight"`. They are already itemised in
**FR-41-22(c)**'s full base-member list and are not restated here as a second roster — but the
PAIRING obligation is stated here, because it is what makes the hover trio safe: a hover member
whose base is missing is a STATE_WITHOUT_BASE finding, and a hover member whose base is present but
IMPLICIT would collide on one routing slot. ⚠ This element carries `"prefix": ""`, so nothing on it
resolves by the `{prefix}Suffix` convention at all — every member here is explicit by necessity, not
by choice, which is why the collision risk is lower here than on `item` and the omission risk is
higher.

⚠ **`sublink` declares `"prefix": ""` deliberately, and that must NOT change.** Its `_note` states
the reason: a `submenu` prefix would wrongly claim `submenuAlign`/`Caret`/`CloseGrace`/`MinWidth`/
`Radius`/`Padding`, which belong to the PANEL. FR-41-22 introduces genuinely `submenu`-prefixed
typography attributes that DO belong to this anchor, which partially reverses that reasoning —
**resolve it by adding an explicit `attrMap` entry per new typography property**, never by giving
the element a prefix (which would immediately re-claim the six panel attributes the empty prefix
exists to exclude). The full member list is in FR-41-22.

**(c) A NEW `submenu-panel` element is declared.** Verified: no element in
`supports.sgs.elements` claims `css:background-color` for `.sgs-nav-menu__submenu` today — the
panel background is unclaimed. The new element claims `submenuBg` (base only, no states —
FR-41-9), `submenuBorderColour` / `submenuBorderWidth` / `submenuBorderStyle` /
`submenuBorderRadius` (base only, no states), and the shadow attrs. Clusters:
`["fill","border","layout"]`. `"prefix": ""`, for the same reason `sublink` carries it.
⛔ **No `states` key at all** — the panel has no hover and no current state for any property.

**(d) The `underline` element is DELETED** — FR-41-4 item 4.

**(e) The `burger` element gains nothing for `triggerMode` / `triggerLabel` / `triggerIcon` / the
three `triggerMagnet*` attributes.** None is a CSS property; they are content, structure or
behaviour attributes with no `attrMap` destination. Declaring them would create phantom routing
slots. Its existing `css:width`/`css:height` → `burgerSize` pair is unchanged — FR-41-12's
`width:auto` behaviour is a render-time branch on `triggerMode`, not a different attribute, and
FR-41-31's magnet emits `data-` attributes plus one static CSS rule, never a routed property.

**(f) The `underline` deletion carries a MANDATORY reseed step.** The DB is derived from the
manifest, so deleting the element from `block.json` does not by itself remove its four routed
attributes from `sgs-framework.db` — a raw row survives until the next reseed, and a raw row does
not survive one (`a-raw-db-update-does-not-survive-a-reseed`). Three ordered steps, all required:

1. Delete the `underline` element from `block.json`.
2. Run `/sgs-update` to reseed the derived DB from the manifests.
3. Assert via `/sgs-db` that **zero** rows remain with `css_element='underline'` for
   `block_slug='sgs/nav-menu'`.

Step 3 is the gate (§11 G11), not a courtesy check — an orphan `css_element` is exactly the drift
the manifest-conformance gate exists to catch, and it would route four deleted attribute names into
the classifier forever.

**(g) A new `supports.sgs.sweepEligibility` key is declared — three rows, the shape in FR-41-26
(0.4.4).** It is the ONE declarative source both `edit.js` and `render.php` read for the Sweep
predicate; neither surface re-derives the rule. Four notes, each verified rather than assumed:

1. ⛔ **It is NOT an `elements` entry and routes NOTHING.** It sits beside `colourExemptions` /
   `hideExtensions` / `boxFamilies` — verified as this block's existing non-routing `supports.sgs`
   keys — and names no CSS property. Declaring it under `elements` would create phantom routing
   slots, the same failure §8.6(e) refuses for `triggerMode` / `triggerLabel`.
2. ✅ **Both read paths are proven, not hoped for.** PHP reads `supports.sgs.*` today
   (`plugins/sgs-blocks/includes/helpers-container.php`, `plugins/sgs-blocks/includes/hover-effects.php`,
   `plugins/sgs-blocks/includes/image-controls.php`); JS already imports this manifest
   (`plugins/sgs-blocks/src/blocks/nav-menu/index.js::metadata`).
3. ⚠ **Nothing in the tree constrains which keys `supports.sgs` may carry** — verified by
   searching the gate scripts for a key allowlist; there is none. Adding a key is precedented and
   needs no schema change.
4. ⛔ **Every attribute NAMED in the three rows must exist in `plugins/sgs-blocks/src/blocks/nav-menu/block.json::attributes`.** A typo
   in a `blockingBackgroundAttrs` entry reads as permanently empty, so the predicate silently
   always passes and the eligibility rule quietly stops existing — a dead-detector shape with no
   error. Assert name-by-name against the declared attribute list (§11 G12).

---

## 9. The inspector — two tabs, exact layout (rebuilt in full, 0.4.0)

⛔ **This section is the COMPLETE, control-by-control layout, and it is authoritative.** Every panel
below is the FULL set — nothing is summarised down to "unchanged" without also stating what it
contains, and the roster table at the end of §9 accounts for every panel that ever existed. If an
FR's prose and this section disagree, this section is what a builder implements and the FR is the
one to fix.

Panel order within a tab is the order below. `SgsColourPanel` must be rendered **before** any other
same-group `<InspectorControls>` in `edit()`, because WordPress concatenates same-group Fills in
mount order (`SgsColourPanel.js`'s own docblock).

⛔ **Every control below names its actual component. There is no "dropdown" in this spec.** The
segmented-vs-select boundary is data-driven, not stylistic:
`plugins/sgs-blocks/src/components/TypographyControls.js::SGS_TYPOGRAPHY_SWITCHER_MAX_SEGMENTED` is `3`, so 2–3 options is
`ToggleGroupControl` and 4+ is `SelectControl`. `ToggleGroupControl` and `ToggleGroupControlOption`
are imported from `plugins/sgs-blocks/src/components/primitives`, which this `edit.js` already
imports from. The hover-treatment selector (FR-41-23) is the same primitive at 2-3 options.

### TAB 1 — General

**9.1 Panel "Menu source"**

| Control | Component | Attribute | Default |
|---|---|---|---|
| Menu | WP menu picker | `ref` | `0` |

**9.2 Panel "Layout"**

| Control | Component | Attribute | Default |
|---|---|---|---|
| Item spacing | `SgsLengthControl` | `gap` | `"8px"` |
| Items per row on drawer | number | `listColumns` | `{}` |
| Collapse to burger below | `ToggleGroupControl` (4 scope presets + custom px) | `collapsePoint` | `768` |

**9.3 Panel "Menu Button"** *(renamed from "Burger"; help text opens with the plain-English
anchor — FR-41-12)*

> Help text, shown once at the top of the panel: *"Controls the button that opens the mobile menu
> (the 'burger')."*

| Control | Component | Attribute | Default |
|---|---|---|---|
| Icon | `IconPicker` **(NEW, FR-41-30a)** — shown when `triggerMode` is `icon` or `icon-and-text` | `triggerIcon` **(NEW)** | `{"source":"lucide","name":"menu"}` |
| Show as | `ToggleGroupControl` — **Icon \| Text \| Both** | `triggerMode` **(NEW)** | `"icon"` |
| ↳ Label *(shown when not `icon`)* | `TextControl` (`__nextHasNoMarginBottom __next40pxDefaultSize`) | `triggerLabel` **(NEW)** | `"Menu"` |
| Size | `SgsLengthControl` | `burgerSize` | `"44px"` |
| Magnetic pull | `ToggleControl` **(NEW, FR-41-31)** | `triggerMagnetEnabled` | `false` |
| ↳ Pull distance *(shown when on)* | `RangeControl` min 20 max 400 | `triggerMagnetRadius` | `120` |
| ↳ Pull strength *(shown when on)* | `RangeControl` min 2 max 80 | `triggerMagnetStrength` | `24` |

> Help text on the magnetic-pull toggle: *"Makes the menu button lean toward the visitor's cursor
> as they approach it. Off automatically on touch devices and when reduced motion is requested."*

⛔ **THE THIRD OPTION'S LABEL IS "Both", NOT "Icon and text" — and the STORED VALUE IS STILL
`icon-and-text` (corrected against the shipped code, 2026-09-11).** Earlier revisions of this table
named the label "Icon and text". **Measured: that string is 13 characters, over Spec 35 Part O's
12-character bound for a 2–4-option `ToggleGroupControl`** (a bound this same attribute family
produced — it was derived from `burger-morph` on `sgs/nav-drawer`'s `closeStyle`, D812). Part O's
remedy is to shorten the **LABEL**; ⛔ **never the VALUE**, which stays `icon-and-text` so the open
side and the close side share one vocabulary. Verified in
`plugins/sgs-blocks/src/blocks/nav-menu/BurgerPanel.js` (`<ToggleGroupControlOption
value="icon-and-text" label={ __( 'Both', 'sgs-blocks' ) } />`) and, identically, in
`plugins/sgs-blocks/src/blocks/nav-drawer/edit.js`. ⚠ **Both blocks shipped the same shortening, on
purpose.** If either label is ever re-lengthened, the control silently truncates or wraps and the
operator cannot read their own option.

**9.4 Panel "Submenu behaviour"**

| Control | Component | Attribute | Default |
|---|---|---|---|
| Alignment | `ToggleGroupControl` — Start / Centre / End | `submenuAlign` | `"start"` |
| Show expand arrow | `ToggleControl` | `submenuCaret` | `true` |
| Close delay | number (ms) | `submenuCloseGrace` | `170` |

**9.5 Panel "Accessibility"** *(gains `itemSmartContrast` — owner point 11a / FR-41-27)*

| Control | Component | Attribute | Default |
|---|---|---|---|
| Accessible menu label | `TextControl` | `navLabel` | `""` |
| Keep text readable automatically | `ToggleControl` **(RELOCATED from the old item-colour area — FR-41-27)** | `itemSmartContrast` | `true` |

Help text on the readability toggle: plain language, as FR-41-5 already specifies — no "WCAG", no
"contrast ratio", no "AA".

**9.5a Device visibility** — already present via the universal extension (§1.2). **Add nothing.**

### TAB 2 — Design

**9.6 Panel "Colour"** — ONE `SgsColourPanel`, sub-groupings via FR-41-16, every stateful row
paired with its hover-treatment selector (FR-41-23)

This is the framework's settled placement rule: every fill/text/link colour on a block lives in
`SgsColourPanel`. `sgs/nav-menu` already mounts exactly one (`plugins/sgs-blocks/src/blocks/nav-menu/edit.js::Edit`'s `colourRows`), so
this is a regrouping of rows already there plus the new ones — not a new panel. **Every row with
a Hover swatch below now also renders its hover-treatment `ToggleGroupControl` directly beneath
that swatch** (FR-41-23) — this is the control-by-control change owner point 2 asked for, made
explicit here rather than left in prose.

| Grouping | Row | States | Attributes | Hover treatment (below the Hover swatch) |
|---|---|---|---|---|
| **Menu** | Nav background | Normal, Hover | `navBg` / `navBgHover` (+ `navBgGradient`) | *(none — single static wrapper, FR-41-23)* |
| | Nav text | Normal, Hover | `navColour` / `navColourHover` (+ `navColourGradient`) | *(none, same reason)* |
| | Item text | Normal, Hover, **Current** | `itemColour` / `itemColourHover` / `itemColourCurrent` (+ `itemColourGradient`, Normal only) | None / Swap / **Sweep** — `itemColourHoverTreatment`. Sweep OMITTED when `itemColourGradient` is set (FR-41-26) |
| | Item background | Normal, Hover, **Current** *(Current omitted under Highlight — FR-41-14)* | `itemBg` / `itemBgHover` / `itemBgCurrent` (+ `itemBgGradient`, `itemBgHoverGradient`, `itemBgCurrentGradient`) | None / Swap / **Highlight** — `itemBgHoverTreatment`. Highlight paints in the row's OWN Hover swatch |
| | **Item border colour** **(MOVED HERE, FR-41-33)** | Normal, Hover, **Current** | `itemBorderColour` / `…Hover` / `…Current` | None / Swap / **Sweep** — `itemBorderHoverTreatment` |
| | ↳ Sweep direction *(shown only when treatment = Sweep)* | — | `borderHoverAnimationDirection` | — |
| **Submenu** | Panel background | Normal only | `submenuBg` | — (no Hover state to pair) |
| | **Panel border colour** **(MOVED HERE, FR-41-33)** | Normal only | `submenuBorderColour` (+ `submenuBorderColourGradient`) | — (Normal-only surface, FR-41-9) |
| | Link text | Normal, Hover, **Current** | `submenuColour` / `submenuColourHover` / `submenuColourCurrent` (+ `submenuColourGradient`) | None / Swap / **Sweep** — `submenuColourHoverTreatment`. Sweep OMITTED when the link paints its own background **in ANY of its three states** (0.4.4) or carries its own text gradient (FR-41-26) |
| | Link background | Normal, Hover, **Current** | `submenuLinkBg` / `…Hover` / `…Current` (+ `submenuLinkBgGradient`) | None / **Swap only** — `submenuLinkBgHoverTreatment` (2-option row, FR-41-23) |
| | Sublink marker colour *(FR-41-30b)* — ✅ **RESOLVED 2026-09-11 (reveal keyed on icon choice, full states once built); BUILT as Normal-only today, see FR-41-30(b)'s ✅ RESOLVED block** | Normal only *(as built)* | `sublinkMarkerColour` **(NEW)** | — |
| **Menu button** | Icon colour | Normal, Hover | `burgerColour` / `burgerColourHover` (+ `burgerColourGradient`) | None / Swap / **Sweep** — `burgerColourHoverTreatment`. Sweep OMITTED under `triggerMode:'icon'`, or when the button paints its own background **in EITHER state — `burgerBg` resting or `burgerHoverColour` on hover** (0.4.4) — or carries its own icon gradient (FR-41-26) |
| | Button background | Normal, Hover | `burgerBg` / `burgerHoverColour` (+ `burgerBgGradient`) | None / **Swap only** — `burgerBgHoverTreatment` (2-option row) |
| **Featured** | *(unchanged — out of scope, §1.2)* | | | |

> ⓘ **Cross-reference note rendered beneath the Item text and Item background rows (FR-41-5 /
> FR-41-27):** *"Automatic readable-text checking for these colours is switched on under General →
> Accessibility."* Without it the toggle governs these two rows from another tab with nothing here
> pointing at it, which reads as the control having been dropped. **Gated: §11 G16.**

> ⓘ **Cross-reference note rendered beneath the Item border colour row's hover-treatment selector
> (FR-41-6, 0.4.3):** *"This changes the line around the item. To underline the menu word itself
> instead, use Decoration (hover) under Typography — they're separate settings and don't do the
> same thing."*
>
> ⛔ **This note is RENDERED in the inspector, not merely stated in this spec.** FR-41-6 holds in
> bold that the border treatment and the hover typography trio must never be presented as the same
> control in different clothes — and an operator meets them in the editor, not in a document. A
> distinction that lives only in prose is left implicit at the exact place it matters, which is the
> thing FR-41-6 forbids. It is the twin of the §9.10 note below; **neither ships without the
> other**, or one control points at a partner that never points back. **Gated: §11 G19(e).**

⛔ **The standalone "Indicator" panel is DELETED (FR-41-25), and no indicator-colour row replaces
it.** The Highlight treatment paints in `itemBgHover` / `itemBgHoverGradient` — the same swatch
Swap reads — per the colour-reuse rule in §0. There is nothing left to conditionally reveal.

✅ **Border colour IS a row in this panel (FR-41-33).** Both border-colour rows above are ordinary
`SgsColourPanel` rows in the same row style as fill and text — not a duplicate control, because
`SgsBorderControl` is mounted with `showColour={ false }` in §9.7/§9.9 and no longer offers a
swatch. Each carries `contrastAgainst` with `contrastLargeText: true` (WCAG 1.4.11 UI-component
case at 3:1, never body text — the default `SgsBorderControl` used to apply for the caller).

⛔ **Mega Menu colours are NOT in this panel and are not touched by this spec.**

**9.7 Panel "Menu item"** *(border SHAPE lives here as a subsection; border COLOUR lives in the
Colour panel — FR-41-33)*

**Decision, stated once (owner-locked, 0.4.1).** The standalone "Menu item — border" panel is
retired as a top-level panel, and its content SPLITS along the colour/shape line:

- **Width, style and radius** stay here, as a labelled **Border** subsection inside the "Menu item"
  panel, rendered by `SgsBorderControl` with `showColour={ false }`.
- **Colour (all three states) moves to the global Colour panel** (§9.6), rendered as an ordinary
  row in the same style as item fill and item text — NOT inside the `SgsBorderControl` composite.

⚠ **This is a considered, block-scoped EXCEPTION to a real framework rule, not an oversight of it.**
`SgsColourPanel.js`'s own docblock names border colour as one of exactly three documented
exemptions (alongside overlay and shadow colour), and the reasoning behind that exemption is sound
in general: those three pair a colour with a genuinely non-colour sibling that `SgsColourPanel` has
no slot for. The exception is taken here on its own merits: **this block's entire redesign is built
around comparing every element's colours side by side across three states**, and border colour is
exactly the kind of colour that has to visually coordinate with the fill and the text beside it. An
operator matching a Current-state border to a Current-state text colour should not have to hold one
value in their head while opening a second panel. The width/style/radius siblings do not need that
comparison and stay where they are.

⛔ **The split is EXCLUSIVE — exactly one control writes each attribute.** `showColour={ false }`
suppresses `SgsBorderControl`'s own swatch entirely, so `check-duplicate-controls.js` sees one
writer per attribute. Do not leave the swatch rendered "for convenience"; a duplicate live control
writing the same attribute from two panels is banned, and is the failure this prop exists to avoid.

| Subsection | Control | Component | Attribute | Default |
|---|---|---|---|---|
| **Border** | Border | `SgsBorderControl` with **`showColour={ false }`** — per-side width (base only) + style (the shared `BorderStyleControl`, mounted as its own sibling, FR-41-2b / FR-41-33 item 2) + radius via `radiusValues`/`onRadiusChange` with `showRadiusResponsive={ false }`. **No colour swatch.** | `itemBorderWidth` / `itemBorderStyle` / `itemBorderRadius` | `{}` / `""` / `{}` |
| | *(colour)* | *(see §9.6 "Menu" grouping — Item border colour, 3 states, with its own hover-treatment selector and sweep direction beneath it)* | `itemBorderColour` + `…Hover` / `…Current` | `""` each |

**Verified fact an operator will ask about, unchanged and confirmed by construction (owner point
11c / FR-41-28): the same border mechanism already applies identically in the bar and the
drawer.** No per-layout-mode branching exists or is needed — see FR-41-28.

**9.8 Panel "Submenu — Items"** *(REBUILT — owner point 7; this whole panel was missing from the
v0.3.0 artifact)*

Everything specific to the LINKS inside the dropdown/drawer panel, as distinct from the panel
container itself (§9.9). Colour rows live in §9.6's Colour panel per the framework's placement
rule; this panel cross-references them rather than duplicating controls, exactly as §9.7 does for
border colour.

| Subsection | Control | Component | Attribute | Default |
|---|---|---|---|---|
| Colour | *(see §9.6 "Submenu" grouping — link text, link background, hover treatments, sublink marker colour, and the panel's own border colour)*. ✅ **The sublink marker colour row's state model was OPEN as of 2026-09-11 and is now RESOLVED** — built Normal-only per FR-41-30(b) today; the owner-ruled direction (icon-keyed reveal, full states once built) is recorded but not yet built. See FR-41-30(b)'s ✅ RESOLVED block and §12 item 8 | — | — | — |
| Marker icon | Icon | `IconPicker` **(NEW, FR-41-30b)** | `sublinkMarkerIcon` | `{"source":"lucide","name":"chevron-right"}` |
| Typography | *(see the Typography panel's "Submenu" target, §9.10 / FR-41-22)* | — | — | — |
| Spacing | *(no distinct submenu-LINK padding attribute exists today — `submenuPadding` belongs to the PANEL, §9.9. Named as a gap, not fabricated: see §12.)* | — | — | — |

**9.9 Panel "Submenu — Container"** *(renamed from "Dropdown (only affects items with sub-items)"
for clarity now that §9.8 exists as its sibling — same `ToolsPanel`, same rows, no content
change)*

Every row is a `ToolsPanelItem` with `hasValue` / `onDeselect`, matching the three already there.

| Control | Component | Attribute | Default |
|---|---|---|---|
| Open animation | `ToggleGroupControl` — None \| Fade \| Slide down | `submenuAnimation` | `"none"` |
| Distance below the bar | `SgsLengthControl` with `presets={ false }` | `submenuTopOffset` | `""` |
| Minimum width | `SgsLengthControl` with `presets={ false }` | `submenuMinWidth` | `""` |
| Inner spacing | `ResponsiveBoxControl` | `submenuPadding` | `{}` |
| Border | `SgsBorderControl` with **`showColour={ false }`** — width + style + radius only, matching §9.7. Its colour is a Normal-only row in §9.6's Submenu grouping (FR-41-33) | `submenuBorderWidth` / `submenuBorderStyle` / `submenuBorderRadius` | `{}` / `""` / `{}` |
| Box shadow | `ShadowControl` with `attrNames={ shadowAttrKeys( 'submenuShadow' ) }` | `submenuShadow` + `submenuShadowColour` | `""` |

⛔ **`submenuRadius` is gone** — its corner radius now rides the border control's radius half
(§8.3).

**The panel is single-state throughout, and the reasoning is one reasoning.** Background, border
and shadow all take Normal only — see FR-41-9's confirmation (owner point 1) that this was
already correct in v0.3.0. The point of a shadow is to make the floating dropdown look *lifted*;
a floating panel is either rendered (open) or absent (closed), with no meaningful hover or current
state. ⛔ Do not give the panel's border-colour row a Hover or Current state; a multi-state picker
on a surface that has one state is a control the client can reach and that does nothing.

⚠ **Shadow colour stays with `ShadowControl` and is NOT moved into `SgsColourPanel` by FR-41-33.**
The border exception is taken on the *comparison* argument (§9.7) — an operator matching a border
colour against the fill and text beside it. A floating panel's shadow colour has nothing to compare
against in that row set: it is a Normal-only property of a surface with no state, on an element
whose other colours are already Normal-only. Extending the exception to it would buy nothing and
would break `ShadowControl`'s own preset behaviour, where a chosen preset carries its own colour.

⚠ **Self-caught, surfaced not absorbed:** `ShadowControl.js`'s own D621/D622 docblock says its
colour is "rendered as a row in the block's `SgsColourPanel`", while the file itself renders the
picker inside `ShadowStateBuilder` and only the ATTRIBUTE is caller-owned. Both this spec and
`plugins/sgs-blocks/CLAUDE.md` follow the CODE (picker inside the control), and that is what §9.9
specifies. The docblock's wording is stale and is worth a one-line correction at source, out of
scope here — §12 carries it.

Reuse, do not rebuild: `plugins/sgs-blocks/src/components/ShadowControl.js::ShadowControl` for the
shape builder, and `plugins/sgs-blocks/includes/helpers-tokens.php::sgs_shadow_value_composed` for
the PHP shape+colour composition. `shadowAttrKeys( 'submenuShadow' )` with **no options** returns
exactly `{ base: 'submenuShadow', colour: 'submenuShadowColour' }` — the documented single-state
form. Reference mount for that shape: `plugins/sgs-blocks/src/blocks/info-box/edit.js::Edit`. The
PHP twin `plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_shadow_attr_map(
'submenuShadow' )` takes the same no-options call — **both sides must carry the same opt-in**, or
JS binds a key the block never declares and the editor silently discards every write to it (D338).

⛔ **Shadow is gradient-exempt by mechanism** — `box-shadow` takes a colour; a gradient there is
invalid CSS the browser drops. `inspector-scan` rule 31 encodes that exemption centrally. Declare
nothing per-block.

**9.10 Panel "Typography"** *(RESTORED — owner point 6; completely absent from the v0.3.0
artifact's layout despite being fully specified in prose at FR-41-22. Sits directly under the
Colour panel, per the owner's explicit placement instruction, as the second panel in the Design
tab.)*

The Menu/Submenu `targets` switcher — see FR-41-22 for the full attribute family and the
`TypographyTargetSwitcher` mechanics. Restated here as the control-by-control layout owner point
13 requires:

| Control | Component | Applies to |
|---|---|---|
| Target | `ToggleGroupControl` — Menu \| Submenu (2 targets, at the `SGS_TYPOGRAPHY_SWITCHER_MAX_SEGMENTED` threshold) | Selects which of the two attribute families the controls below write |
| Font family | `TypographyControls`' font-family picker | `{prefix}FontFamily` |
| Font size (+ responsive tiers) | `ResponsiveControl` wrapping `UnitControl` | `{prefix}FontSize` / `…Unit` / `…Tablet` / `…Mobile` |
| Weight / Style | native `SelectControl`s | `{prefix}FontWeight` / `{prefix}FontStyle` |
| Line height | `UnitControl` | `{prefix}LineHeight` / `…Unit` |
| Decoration / Transform / Letter spacing / Text align / Text wrap / Text columns / Text indent / Writing mode | native controls, per `TypographyControls`' standard field set — Normal state | `{prefix}TextDecoration` / `…Transform` / `…LetterSpacing`(+Unit) / `…TextAlign` / `…TextWrap` / `…TextColumns` / `…TextIndent` / `…WritingMode` |
| **Decoration (hover) / Transform (hover) / Weight (hover)** **(RESTORED 0.4.2)** | the three `SelectControl`s `TypographyControls` renders in ONE `<Flex>` row when `showHover: true` — fed `SGS_TEXT_DECORATION_OPTIONS` / `SGS_TEXT_TRANSFORM_OPTIONS` / `SGS_FONT_WEIGHT_OPTIONS`. ⛔ Not three hand-rolled controls — the flag renders them | `{prefix}TextDecorationHover` / `…TextTransformHover` / `…FontWeightHover`, all defaulting `""` | — |

✅ **The hover trio row IS present, on BOTH targets — `showHover: true` on each `targets` entry
(FR-41-6 / FR-41-21 / FR-41-22).** Six attributes are declared (§8.4) and emitted block-privately
(FR-41-21).

⛔ **How this row must be described, in help text and in every future edit of this spec.** It is an
**optional secondary decoration**. It is **not** the block's non-colour hover signal — that is the
item border row's own treatment selector in the Colour panel (§9.6) — and it is **not** an
alternative way of authoring the divider. A hover underline here paints a baseline-hugging
glyph-width decoration; the divider is a full-width edge treatment. Never present them as the same
control in different clothes.

> ⓘ **Cross-reference note rendered beneath the hover trio row (FR-41-6, 0.4.3) — the twin of the
> §9.6 note, and neither ships without the other:** *"These change how the menu word itself looks on
> hover. For a line across the whole item, use the item border's hover setting in the Colour panel
> instead."*

**The drafted help-text strings — these are the BINDING wording, not a description of what the
wording should contain (0.4.3).** FR-41-6 has held since 0.4.1 that this distinction must never be
left implicit and that the reflow caution must be in plain language; neither sentence had actually
been written, which left the binding requirement unbuildable. Both are written now. Adjust for
sentence rhythm if the surrounding UI copy demands it; do not adjust away the distinction either one
carries.

| Control | Help text (verbatim) |
|---|---|
| **Decoration (hover)** | *"Underlines the menu word itself on hover — not a full-width line. For a line under the whole item, use the border's hover setting in the Colour panel instead."* |
| **Weight (hover)** | *"Makes the word bolder when you point at it. Bolder text is a little wider, so the items to its right will shift across slightly as you move along the menu."* |

⛔ **Neither string may name WCAG, "contrast ratio", "AA", "signal" or "divider"** — the same
client-visible-string rule FR-41-5 already applies to the readability toggle. ⛔ And the Decoration
string must not be softened into *"another way to underline"*: it says what the control does and
where the other thing lives, which is what stops the two reading as one control in two places.

⚠ **The Weight (hover) caution is operator guidance, not a blocker** — it states the trade-off and
leaves the choice, per FR-41-6 consequence 3. It does not disable the control, warn on selection, or
gate the value.

**Block-private field, Menu target ONLY, at the bottom of that target's control set** (FR-41-29 —
NOT part of the shared `TypographyControls` component, a plain block-owned `SelectControl`):

| Control | Component | Attribute | Default |
|---|---|---|---|
| Current-page weight | `SelectControl` fed `SGS_FONT_WEIGHT_OPTIONS` | `itemFontWeightCurrent` | `"600"` |

Help text on that row should say, in plain language, that it is what keeps the menu usable for
someone who cannot tell two colours apart, and that its hover counterpart is the item border's
own hover treatment in the Colour panel.

⛔ **The old standalone "Menu item — state signals" panel (v0.3.0 §9.8) is DELETED.** Every
control it held now lives here — the hover decoration/transform/weight fields in the `showHover`
trio row above (RESTORED 0.4.2), the Current-page weight field below — or in §9.5
(`itemSmartContrast`). Nothing is dropped, everything has a named new home.

**9.11 Panel "Effects"** — `itemMagnetEnabled`, unchanged.

**9.12 Panel "Featured"** — unchanged, out of scope.

### Panel roster, before → after (so nothing reads as silently dropped)

| v0.3.0 panel | 0.4.x fate |
|---|---|
| Menu item — border (standalone) | SPLIT: width/style/radius → "Menu item" (§9.7) as a Border subsection; colour → the Colour panel (§9.6) as an ordinary 3-state row — FR-41-33 |
| Menu item — state signals | Deleted; every control it held has a named new home. `itemFontWeightCurrent` → Typography (§9.10), `itemSmartContrast` → Accessibility (§9.5), and the HOVER decoration/transform/weight fields → Typography's `showHover` trio row (§9.10, RESTORED 0.4.2). Only `itemTextDecorationCurrent` is not rebuilt anywhere — FR-41-6 consequence 2 |
| Burger | Renamed **"Menu Button"** (§9.3), and gains the icon picker + the magnetic-pull trio — FR-41-12/30/31 |
| Dropdown (only affects items with sub-items) | Renamed "Submenu — Container" (§9.9); its border loses only its colour swatch, which moves to §9.6 |
| *(missing from the artifact, present in prose)* Items typography | Restored as its own "Typography" panel (§9.10), Menu/Submenu switcher, **including the hover trio on both targets** (0.4.2) |
| *(missing entirely)* Submenu link-specific controls | New "Submenu — Items" panel (§9.8) |
| Indicator | Deleted; folded into the Colour panel's Item-background hover treatment (§9.6). No indicator-colour row replaces it — FR-41-25 |

⛔ **Every panel in this roster is either present in §9.1–§9.12 above or has a named new home for
each of its controls. Nothing is dropped without a destination.**

---

## 10. WCAG contrast, follow-ups + comment hygiene

### FR-41-17 — The existing WARN-ONLY contrast check carries forward UNCHANGED

`contrastAgainst` / `contrastLabel` feed
`plugins/sgs-blocks/src/components/GradientCapableColourControl.js`'s live luminance-ratio check.
Every 3-state row carries both props through with **identical behaviour**: it warns, it never
blocks a colour, it never alters a colour, and it is ignored on a row that is not
`gradientCapable` (a plain `DesignTokenPicker` has no contrast check).

The caller still owns working out *which background is actually behind this text* — there is no
general answer a row builder can derive. For `sgs/nav-menu`: item text contrasts against `itemBg`
(resting), `itemBgHover` (hover) and `itemBgCurrent` (current); submenu link text contrasts against
`submenuLinkBg` and, where that is unset, `submenuBg`.

⚠ **The two border-colour rows moved into this panel by FR-41-33 carry `contrastLargeText: true`.**
`SgsBorderControl` defaulted that flag to `true` for its callers precisely because a border is a
WCAG 1.4.11 UI-component case at 3:1, never body text. Moving the row out of that control moves the
obligation to remember the flag onto the row descriptor — set it explicitly, per row, and do not
inherit `GradientCapableColourControl`'s own `false` default by omission.

⚠ **This does not overlap FR-41-5's smart contrast.** That one lives in `render.php` and *changes
the rendered colour*; this one lives in the editor and only *warns*. They coexist.

⛔ **FR-41-17 checks a foreground against its BACKGROUND. It does not check two foreground states
against EACH OTHER, and nothing in this spec does.** See the residual risk below.

### FR-41-17a — Residual, accepted risk: colour-only state signals

**Four** distinct cases, all accepted, all named rather than papered over. (a) and (b) are the
original colour-only-signal pair; (c) and (d) were added in 0.4.4 and are Sweep-specific — they
belong here because both end in the same place: a state with no visible signal.

**(a) The default case — no border, no Hover signal.** `itemBorderWidth` defaults to `{}`, so an
untouched block ships no border and therefore no non-colour Hover signal at all (FR-41-6). Current
still ships its `"600"` weight. This is a genuine reduction against the retired underline, which
defaulted to visible; it is accepted because an unrequested underline on every menu item of every
install is a design imposition the owner rejected, and one border-width entry restores the signal.
⚠ **0.4.2's restored `itemTextDecorationHover` does NOT close this case and must not be recorded as
closing it.** It defaults to unset (§8.4), precisely so it does not reinstate that imposition; an
operator who sets it has added a second signal by choice, which is not the same as one shipping.

**(b) The switched-off case.** An operator can set `itemColourHover` and `itemColourCurrent` to two
perceptually similar colours **and** leave the border width empty **and** clear
`itemFontWeightCurrent`. At that point Hover and Current are distinguished by colour alone, at a
difference the operator may not be able to see and a colour-blind visitor certainly cannot — an
SC 1.4.1 failure the inspector never warns about.

**(c) The `color-mix`-less browser under Sweep on the menu button (0.4.4).** `style.css`'s
`@supports not (background-color: color-mix(…))` fallback paints
`background-color: rgba(128,128,128,0.12)` on `.sgs-nav-menu__burger:hover` / `:focus-visible`. On
the narrow intersection of browsers that support `background-clip: text` but NOT `color-mix`, that
hover fill is clipped to the glyph shapes while the Sweep runs. **Not gated by FR-41-26's
condition 1**, and the reasons are stated there in full: it is a longhand (the sweep survives, the
failure is cosmetic), and no attribute controls it, so a per-row predicate has nothing to read —
gating on it would withdraw Sweep from the menu button on every browser, permanently. ⛔ Do not
close this by deleting the fallback; it is the non-`color-mix` rescue for the button's ordinary
hover state and serves a case that has nothing to do with Sweep.

**(d) The Sweep fallback with an empty Hover swatch (0.4.4).** When the eligibility predicate turns
false at render time, the treatment resolves to `'swap'` and emits the row's Hover swatch — and if
that swatch is empty, **nothing is emitted and the property has no visual hover change at all.**
Reachable in one legal step, described in full at FR-41-26. It is accepted rather than papered over
because every alternative is worse: substituting a colour would be a hardcoded render default the
operator cannot clear (`check-hardcoded-render-defaults.js` F3b), and refusing the fallback would
leave the clip defect the fallback exists to prevent. ⚠ **It is narrower than (a) and (b):** the
item border's own Hover treatment is unaffected and remains the block's primary non-colour signal
(FR-41-6), so this bites only on a border-less menu. Closed by one swatch entry, by the same
operator, in the same panel.

**All four are named as accepted residual risks, not as covered work.** FR-41-17 does not cover
(a) or (b):
it measures each colour against the background behind it, which both of these may pass
comfortably while being indistinguishable from one another. No control in this spec warns at the
point of switching a signal off.

**The fix, if it is ever taken, is a distinct piece of work** — extend the existing warn-only
contrast UI to also flag *perceptual similarity between two state colours on the same element*
when every non-colour signal for those states is off. It is a new comparison (state-vs-state,
not state-vs-background), a new trigger condition, and a new string. It is not FR-41-17 with a
wider input, and it must not be described as such.

⛔ **Do not close this by removing the operator's ability to switch the signals off, and do not
close case (a) by re-defaulting `itemBorderWidth` to a non-empty value.** Shipping every install a
border nobody asked for is the same imposition, wearing different clothes. A client who leaves the
border empty or clears the Current weight has made a choice in their own inspector; documenting the
risk is the honest answer, not removing the choice.

### FR-41-18 — "Auto-adjust for readability" — a SEPARATE, EXPLICITLY NON-BLOCKING follow-up

⛔ **This FR does NOT block FR-41-1 … FR-41-17a or FR-41-19 … FR-41-22.** Everything else ships
whether or not it exists.

**What it is.** An optional per-colour-row toggle. When on, the colour the operator picks is nudged
toward the nearest WCAG-AA-safe value against the resolved background. **Off by default** — a
client's picked colour is never silently changed unless they asked for it.

| Aspect | Decision |
|---|---|
| Attribute | `{attrName}AutoAdjust`, boolean, default `false`, one per row that offers it |
| Placement | Inside the row's own popover, beneath the states |
| Scope | Only rows that already supply `contrastAgainst` |
| Direction | Nudge toward AA; never past it into a colour the operator would not recognise |
| Storage | Store the **operator's original pick**; adjust at render. Overwriting the stored value would make the toggle irreversible. |

Help text plain language, e.g. *"Automatically brightens or darkens your chosen colour just enough
to stay easy to read against the background behind it. Your original colour is kept — switch this
off to go back to it."*

### FR-41-19 — Required code-comment updates

`plugins/sgs-blocks/src/blocks/nav-menu/block.json::supports.sgs.elements.item._note` currently ends: *"This block has NO
operator-controllable current-page colour at all; adding one is separate work (FR-35-5)."*

**This spec IS that work.** Replace the sentence with a statement of what the code now does, citing
FR-41-1 and this spec, and naming `itemColourCurrent` / `itemBgCurrent` / `itemFontWeightCurrent`
as the attributes that carry it. The note's stale `selected`-vs-`hover` paragraph and its
`underlineThickness/underlineOffset/underlineColour(Hover)` sentence both go with the underline
element (FR-41-4 item 4).

⚠ **The citation in that comment is `FR-35-5`, not `FR-36-5`** — read it in the file before
editing; a fix aimed at the wrong FR number would leave the real stale reference in place.

The `sublink._note`'s `"prefix": ""` paragraph must also be updated to state the current rule:
the empty prefix stands, and `submenu`-prefixed typography attributes reach this element through
explicit `attrMap` entries (§8.6b / FR-41-22).

⛔ **No retirement narration.** Each replacement states what the code does now. Neither says "this
used to have no current-page colour" — that is the `no-retirement-narration-in-active-comments`
anti-pattern.

### FR-41-20 — Active-trail is NOT built, and this spec does not claim it

**Verified:** `plugins/sgs-blocks/src/blocks/nav-menu/view.js::markCurrentPage` normalises `window.location.pathname` and marks a link only
when `path !== '' && path === current` — **exact path equality**. A parent menu item whose *child*
page is the current page receives no marking whatsoever. There is no trail of ancestors, and no
data attribute from which one could be derived without a second mechanism.

**This spec implements "this exact link is the current page." It does not implement active-trail.**
Spec 36 FR-36-4's clause names both; only the first half has a mechanism here, and Spec 36's
FR-36-28 says so.

Building active-trail would need, at minimum: an ancestor-path list emitted per item at render
time (the menu tree is known server-side, so this is cheap), plus a client-side prefix match in
`markCurrentPage` stamping a distinct signal — **not** `aria-current="page"`, which is
single-valued per page and belongs to the exact link. It is a coherent, self-contained piece of
work and it is **not in this spec's scope**. Recorded here so nobody assumes it shipped.

---

## 10a. Typography

### FR-41-21 — The `showHover` trio has no shared PHP emitter, so this block emits it itself

⚑ **RESTORED IN 0.4.2.** The flag IS switched on, on both targets (FR-41-6), so the trio must be
emitted — and the shared helper still cannot do it. **The block-private emit at the end of this FR
is BUILT.** The prohibition survives unchanged: do not extend `sgs_typography_css_rule()` as part of
this spec.

**Verified 2026-09-10 against the live files, not carried forward on trust** — every claim below
was re-read for this revision, because the whole restoration rests on it:

- `plugins/sgs-blocks/src/components/TypographyControls.js::TypographyControls` accepts
  `showHover = false` and, when true, renders exactly three `SelectControl`s in one `<Flex>` row —
  "Decoration (hover)" (`SGS_TEXT_DECORATION_OPTIONS`), "Transform (hover)"
  (`SGS_TEXT_TRANSFORM_OPTIONS`) and "Weight (hover)" (`SGS_FONT_WEIGHT_OPTIONS`) — writing
  `k.textDecorationHover` / `k.textTransformHover` / `k.fontWeightHover`. Its own comment states the
  opt-in condition: *"only render for a block that DECLARES + renders the `{prop}Hover` companions,
  else the dead-control gate flags it."*
- **`sgs_typography_css_rule()` STILL has no hover branch of any kind.** Re-verified by reading
  `plugins/sgs-blocks/includes/helpers-typography.php`: the only `:hover` emission in that file
  belongs to `sgs_link_colour_css()`, a different function for link *colour*
  (`sgs_hover_state_rules( $link_selector, $hover_decl )`). Nothing reads
  `{prefix}TextDecorationHover`, `{prefix}TextTransformHover` or `{prefix}FontWeightHover`.
- **`showHover` still has ZERO adopters tree-wide** (`grep -rn "showHover" plugins/sgs-blocks/src/
  --include=*.js` returns only the component's own definition and its docblock). `sgs/nav-menu` is
  the first.

⚠ **`typographyAttrKeys( prefix )` already returns all three hover key names** (`fontWeightHover` /
`textDecorationHover` / `textTransformHover`, with the file's own comment: *"Consumed only when
showHover is enabled AND the block declares + renders them"*), so the attribute NAMES are the
shared contract — this block invents none of them. What is missing is only the rendering half.

**The emitter cost is the single biggest hidden cost in adopting `showHover`, and 0.4.2 pays it
rather than avoiding it.**

**Consequence, stated plainly: switching `showHover` on without emitting the three attributes
creates three dead controls and fails `check-dead-controls.js`.** Six, once FR-41-22 adds the
`submenu` prefix. So the emit below is not optional polish — it is what makes the six declared
attributes legal.

**0.4.2 decision — switch the flag on, on both targets, and pay the emitter cost.** The owner's
ruling is to keep all three controls; the flag is all-or-nothing, so refusing the *framing* of the
decoration control (FR-41-6) is no reason to lose the other two. Six attributes, six controls (three
per target, from ONE flag per target), one block-private emitter.

**The block-private emit — BUILT (0.4.2).** One `sgs_hover_state_rules()` call per prefix, composing
whichever of the three declarations are set:

```php
sgs_hover_state_rules( $link_sel,    '<font-weight/text-decoration/text-transform decls>', ':focus-visible' );
sgs_hover_state_rules( $sublink_sel, '<same, submenu prefix>',                              ':focus-visible' );
```

⛔ **Each value is validated against the SAME allowlist the base path applies, and the allowlists are
read from `sgs_typography_css_rule()` rather than invented.** Verified in
`plugins/sgs-blocks/includes/helpers-typography.php`, they are inline arrays inside that function —
there is no exported constant to import, so the block-private emitter reproduces the three checks
literally:

| Property | Check the base path applies | Emitter must apply |
|---|---|---|
| `text-decoration` | `in_array( $v, [ 'none', 'underline', 'line-through', 'overline' ], true )` | the same four |
| `text-transform` | `in_array( $v, [ 'none', 'uppercase', 'lowercase', 'capitalize' ], true )` | the same four |
| `font-weight` | `preg_replace( '/[^a-z0-9]/i', '', (string) $v )` | the same strip |

⚠ **Duplicating a three-line allowlist locally is the accepted cost of NOT extending the shared
helper** — it is three lines with zero blast radius, against a design-gated change to a helper with
callers across most of the block library. If the base path's allowlists ever change, this emitter
changes in the same commit; §12 keeps the shared-helper extension open as the better long-term fix.

⛔ **A hover value that is set but not permitted emits NOTHING — it never falls back to the base
value.** Falling back would repaint the resting declaration inside a `:hover` rule, which is
invisible when it agrees with the base and a silent override when it does not.

⚠ **Emit both calls through `sgs_hover_state_rules()`, never a bare `{sel}:hover`** — the helper
carries both touch guards and splits `:focus-visible` out unguarded (FR-41-3 rule 1). A stuck hover
weight on a touchscreen reflows the bar and stays reflowed until the visitor taps elsewhere.

⛔ **Do NOT extend `sgs_typography_css_rule()` to carry the trio as part of this spec.** It is a
shared helper with callers across most of the block library; adding a hover branch to it is a
design-gated change with real blast radius, and it would make this spec's acceptance depend on
re-verifying every one of those callers. The block-private emit costs two lines and has zero blast
radius. The shared extension is a legitimate follow-up and is named in §12 as one.

### FR-41-22 — Submenu typography: the Items panel becomes a Menu / Submenu switcher

Today `.sgs-nav-menu__sublink` has no typography controls at all — its size, weight, family and
spacing are whatever the panel's own CSS and the theme resolve to. An operator who wants dropdown
links a step smaller than the bar cannot express it.

**The switcher itself is NOT new component work.** `TypographyControls`' `targets` prop already
exists (built 2026-09-05) and is already adopted by eight blocks — `card-grid`, `icon-list`,
`option-picker`, `pricing-table`, `product-card`, `team-member`, `testimonial`, `trust-bar`.
Reference implementation to copy: `plugins/sgs-blocks/src/blocks/card-grid/edit.js::Edit`'s
Title/Subtitle two-target switcher. At two targets it renders a `ToggleGroupControl` (the threshold
is `SGS_TYPOGRAPHY_SWITCHER_MAX_SEGMENTED = 3`).

⛔ **In `targets` mode, per-field flags MUST live on each target entry, not on the outer element.**
Verified in `plugins/sgs-blocks/src/components/TypographyControls.js::TypographyControls`: when `targets.length > 1` it renders
`<TypographyTargetSwitcher attributes setAttributes targets />` and **discards `singleProps`
entirely**; `TypographyTargetSwitcher` then destructures `{ key, label, prefix, ...fieldProps }`
from the selected target and forwards only `fieldProps`. Leaving the existing mount's nine `show*`
flags on the outer element would **silently delete nine working controls** from the Items panel.
Each target must also carry its own `prefix` — the switcher reads `prefix` from the target, never
from the outer props.

The correct mount, replacing the existing single `<TypographyControls prefix="item" …>`:

```js
<TypographyControls
  attributes={ attributes }
  setAttributes={ setAttributes }
  targets={ [
    {
      key: 'item',
      label: __( 'Menu', 'sgs-blocks' ),
      prefix: 'item',
      fontSizePresets: true, showFontFamily: true, showDecoration: true,
      showTransform: true, showLetterSpacing: true, showTextAlign: true,
      showTextWrap: true, showTextColumns: true, showTextIndent: true,
      showWritingMode: true,
      showHover: true, // RESTORED 0.4.2 — FR-41-6 / FR-41-21
    },
    {
      key: 'submenu',
      label: __( 'Submenu', 'sgs-blocks' ),
      prefix: 'submenu',
      fontSizePresets: true, showFontFamily: true, showDecoration: true,
      showTransform: true, showLetterSpacing: true, showTextAlign: true,
      showTextWrap: true, showTextColumns: true, showTextIndent: true,
      showWritingMode: true,
      showHover: true, // RESTORED 0.4.2 — FR-41-6 / FR-41-21
    },
  ] }
/>
```

⛔ **`showHover` goes on EACH TARGET ENTRY, never on the outer element** — the same rule as every
other `show*` flag above it, for the same verified reason: in `targets` mode
`TypographyControls` discards `singleProps` entirely and `TypographyTargetSwitcher` forwards only
the selected target's own `fieldProps`. A `showHover` left on the outer element renders no trio on
either target while every gate stays green, because six declared-and-rendered attributes with no
control is the INVERSE shape `check-dead-controls.js` looks for.

**This is real new work, and it is not small.** Three required additions:

**(a) Declare the full `submenu*` typography family in `block.json`**, matching
`typographyAttrKeys( 'submenu' )`'s naming exactly — that function is the contract, and a key that
does not match it is a control writing to an attribute nothing reads:

`submenuFontFamily` · `submenuFontSize` · `submenuFontSizeUnit` · `submenuFontWeight` ·
`submenuFontStyle` · `submenuLineHeight` · `submenuLineHeightUnit` · `submenuTextDecoration` ·
`submenuTextTransform` · `submenuLetterSpacing` · `submenuLetterSpacingUnit` · `submenuTextAlign` ·
`submenuTextWrap` · `submenuTextColumns` · `submenuTextIndent` · `submenuWritingMode`.

⛔ **`submenuFontSize` and `submenuLetterSpacing` are declared `{"type":"object","default":{}}` —
the TIER OBJECT shape — and there are NO `submenuFontSizeTablet` / `submenuFontSizeMobile`
siblings (corrected 0.4.6).** 0.4.2's list named those two flat tier keys; §8.4a proves why that
was wrong. `TypographyControls` and `sgs_typography_css_rule()` each branch on whether the stored
value is an ARRAY/object, and the object branch keeps all three tiers inside the one attribute. The
item family is already migrated (`itemFontSize` and `itemLetterSpacing` are both object-typed with
no tier siblings); a NEW family authored in the legacy flat shape would be born pre-migration debt
that `migrate-tier-object.py` would later have to undo. ⛔ **Mirror the item family's shapes exactly
— that is what "matching `typographyAttrKeys( 'submenu' )`'s naming" means in practice**, and the
contract is the KEY NAME function, not a guarantee that every key it can name is one this block uses.

⚠ **`submenuLineHeight` mirrors `itemLineHeight` as `{"type":"number"}`** — un-migrated on both
prefixes, deliberately kept symmetrical. ⛔ Do not give the submenu a tier-object line height the
item does not have: an asymmetry between the two targets of one switcher is a defect the operator
sees directly (per-device line height on Submenu, none on Menu, from the same panel). Both migrate
together, via the codemod, outside this spec.

✅ **PLUS the three `showHover` companions, RESTORED 0.4.2 (FR-41-6 / FR-41-21):**
`submenuTextDecorationHover` · `submenuTextTransformHover` · `submenuFontWeightHover`, each
`"type": "string"`, default `""`. `typographyAttrKeys( 'submenu' )` already returns these three key
names, so they are part of the same contract as the family above, not a separate one.

⛔ **All three of "flag set", "attributes declared" and "render emit added" land in the SAME
build.** Declaring them without the flag is three attributes no control writes; setting the flag
without them is three controls nothing renders; doing both without (b) below is six dead controls.
Never one or two of the three.

⚑ **CORRECTED 0.4.6 — this paragraph previously said the `item` family was INCOMPLETE** because
`itemFontSizeTablet` / `itemFontSizeMobile` are undeclared, and that their absence made the mount's
responsive tiers write to attributes WordPress discards. **That was checked against the live files
and is false.** `itemFontSize` is an object-typed TIER attribute, so both the control and the PHP
emitter take the tiered branch and the flat tier keys are neither written nor read. The item family
is COMPLETE; the two keys are legacy-shape names this block has already migrated past. Full
verification table: **§8.4a**. ⛔ Do not declare them, here or anywhere — and declare the submenu
family in the same TIER-OBJECT shape (above), never the flat one.

**(b) Add the render call.** One line in `render.php`, beside the existing item call:

```php
$css .= sgs_typography_css_rule( $attributes, 'submenu', $uid_sel . ' .sgs-nav-menu__sublink' );
```

⛔ **Without this every one of the new attributes is a dead control and the build fails
`check-dead-controls.js`.**

**Plus the companion HOVER emit (RESTORED 0.4.2) — one more line, per prefix**, because
`sgs_typography_css_rule()` covers the base state only and has no hover branch (FR-41-21, re-verified
for this revision):

```php
$css .= sgs_nav_menu_typography_hover_rule( $attributes, 'item',    $link_sel );
$css .= sgs_nav_menu_typography_hover_rule( $attributes, 'submenu', $uid_sel . ' .sgs-nav-menu__sublink' );
```

⛔ **That helper is BLOCK-PRIVATE to `sgs/nav-menu` — NOT an addition to any shared helper file.**
It composes the permitted declarations (FR-41-21's allowlist table) and returns one
`sgs_hover_state_rules()` call's output, or `''` when nothing is set. Promoting it to a shared
helper is the §12 follow-up, not this build. ⚠ A top-level function declaration in a per-instance
include fatals on the second instance — declare it inside a `function_exists()` guard, as this
codebase does everywhere else.

✅ **AS BUILT — exactly as specified, and the `render.php` split did NOT move it.**
`sgs_nav_menu_typography_hover_rule()` is defined in
`plugins/sgs-blocks/src/blocks/nav-menu/render.php`, file-local, inside the required
`function_exists()` guard. ⚠ **Its two CALLERS live in other files** — `plugins/sgs-blocks/includes/nav-menu-css.php`
(prefix `item`, on `$link_sel`) and `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` (prefix `submenu`, on
`$sublink_sel`). ⚠ **That is safe only because those two modules merely DEFINE functions at include
time and call this one at render time**, by which point `render.php`'s own top level has already
declared it. ⛔ **Do not relocate the definition into one of the two modules** — the other module
does not `require_once` its sibling, so it would be calling an undefined function on any page where
the ordering differs. ⚠ It gained a fourth parameter as built,
`string $sweep_hover_colour = ''`, which is how FR-41-26's "the underline must travel too" rule
reaches it.

**(c) Add an explicit `attrMap` entry on `sublink` for each new typography property.** The element
declares `"prefix": ""` and that stays (§8.6b), so the default `{prefix}Suffix` convention resolves
nothing here — `submenuFontSize` would not be claimed by an element whose prefix is empty. Members
to add on `sublink`, at base: `css:font-family` → `submenuFontFamily`, `css:font-size` →
`submenuFontSize`, `css:font-weight` → `submenuFontWeight`, `css:font-style` → `submenuFontStyle`,
`css:line-height` → `submenuLineHeight`, `css:text-decoration` → `submenuTextDecoration`,
`css:text-transform` → `submenuTextTransform`, `css:letter-spacing` → `submenuLetterSpacing`,
`css:text-align` → `submenuTextAlign`. ✅ **PLUS three members on `states.hover` (RESTORED 0.4.2)**
— `css:text-decoration` → `submenuTextDecorationHover`, `css:text-transform` →
`submenuTextTransformHover`, `css:font-weight` → `submenuFontWeightHover`, sitting alongside the
colour/fill members already declared there (§8.6b). Each one explicit, for the collision reason
§8.6(a) records — with an empty prefix, nothing resolves by convention here anyway.

⛔ **Do not resolve this by giving `sublink` a `submenu` prefix.** That immediately re-claims
`submenuAlign` / `Caret` / `CloseGrace` / `MinWidth` / `Padding` and the whole new border family,
all of which belong to the PANEL — which is the exact conflation the empty prefix was introduced to
prevent, recorded in the element's own `_note`.

---

## 10b. Two mechanisms decided by the owner in 0.4.6

Both were §12 open items. Both are now IN SCOPE for this build. Neither reverses a 0.4.0–0.4.5
decision; each BUILDS the thing an earlier revision could only require.

### FR-41-34 — The migration notice: a post-meta flag, read once by a dismissible editor `Notice`

⚑ **DECIDED 0.4.6 (owner).** G5a already REQUIRES that a migration which visibly changes an
operator's colour tells them rather than logging it. 0.4.4 could not name the mechanism because none
existed. This FR names it. ⛔ **Do not downgrade any part of this back to `error_log()`** — that is
the failure the rule exists to prevent.

**(a) The meta key.** `_sgs_nav_menu_migration_notice`, registered on **`post` and `page`** via
`register_post_meta()`. Leading underscore = private, per this project's `_sgs_*` convention.

⚠ **This registration is genuinely NEW work, disclosed rather than assumed.** Verified: the plugin
already has a proven, REST-exposed, block-editor-reachable post-meta mechanism — but **every
existing `_sgs_*` key is registered against `sgs_product` / `product_variation` / `product`, and
none against `post` or `page`.** So the IDIOM is precedented and the REGISTRATION is not.

Registration shape, copied from the existing precedent rather than invented — `register_meta()` in
`plugins/sgs-blocks/includes/content-types/class-product-cpt.php::Product_CPT` and `register_post_meta()` in
`plugins/sgs-blocks/includes/class-configurator-meta.php`:

| Field | Value | Why |
|---|---|---|
| `single` | `true` | one record per post, matching every existing `_sgs_*` key |
| `type` / `show_in_rest` | `array`, with an explicit nested `schema` | the editor must READ it; a bare `'show_in_rest' => true` on an array meta is rejected by core. `_sgs_variation_sets` is the worked precedent for the schema form |
| `auth_callback` | a closure doing `current_user_can( 'edit_post', $post_id )` | ⛔ **NOT a bare `edit_posts`.** The existing configurator meta uses the per-object form specifically as an IDOR guard; a capability check that ignores the object is not a capability check |
| `sanitize_callback` | sanitises each record's fields (block `clientId`, attribute key, old value, new value) | the values are written by PHP, but meta is REST-writable and must not trust its input |
| `default` | `array()` | an absent flag and an empty flag must behave identically |

⚠ **A leading-underscore key is deliberately NOT surfaced by `core/post-meta` Block Bindings** —
that is correct here (this is an editor advisory, not bindable content) and is the same reasoning
`_sgs_variation_sets`'s own docblock records. ⚠ `page` and `post` support `custom-fields` in core,
so the CPT-`supports` trap that bites `register_meta()` on a custom post type does not apply — but
assert it rather than assuming it, because a meta that silently returns nothing looks identical to
one that was never written.

**(b) When it is set.** During the **G5a migration path only**, in the same pass that writes the
carried-across value — never on a fresh block, never on a save, never on render. One record is
appended per KEY that actually changed, matching G5a's per-key (not per-post) rule. A record names
the block, the attribute key, the old value and the new value.

⛔ **A SKIPPED key writes no record.** G5a's precedence rule keeps an existing `itemBgHover` and
skips the colour carry-across; nothing changed on screen for that key, so there is nothing to tell
the operator. ⛔ **And the UNSET-SOURCE case writes no record either** — G5a is explicit that the
operator sees the same accent pill before and after, so a notice there would report a change that
did not happen. ⚠ Both still LOG, per G5a; logging and surfacing are different obligations and this
FR adds the second without removing the first.

**(c) The component.** A dismissible `Notice` from `@wordpress/components`, rendered inside the
block's **default (Settings) `InspectorControls` group**.

✅ **The precedent is inside this block's own `edit.js` and is the only one in the plugin** —
verified: of 59 `<Notice>` mounts across `src/`, **58 are `isDismissible={ false }` and exactly one
is `true`: `sgs/nav-menu`'s own link-count advisory**, `status="info"`, in the default
`InspectorControls` group, with `style={ { marginBottom: '16px' } }`. Copy that mount exactly —
same group, same status, same spacing — so the migration notice reads as the same kind of object
the operator has already seen on this block.

⛔ **Nothing in the plugin uses `createNotice` / `useDispatch( noticesStore )`** (grepped; zero hits
across `src/`). Do not introduce the notices STORE for this — a snackbar is transient and this
message must survive until the operator dismisses it.

**(d) The wording — client-visible, so the string rules bind.** Plain English, names what changed
and the one-step correction. Worked example:

> Your menu's hover highlight colour was carried over automatically from the old pill setting. It
> was <old>, and is now <new>. To put it back, set the Item background row's Hover swatch to <old>.

⚠ **The string must not contain "WCAG", "contrast", "AA", "signal" or "migration"** — the same
client-visible-string rule §9.10 and FR-41-5 already bind. "Migration" is developer vocabulary; the
operator experienced a setting moving, not a migration.

**(e) Dismissal CLEARS the flag.** `onRemove` deletes the record(s) from the meta, so the notice
does not return on reload.

⛔ **This is the one genuinely new behaviour, and it is disclosed as such: there is NO precedent
anywhere in the plugin for a notice whose dismissal clears a persisted flag.** Verified — no
`<Notice>` in `src/` carries an `onRemove` or `onDismiss` handler of any kind, and the one
dismissible notice that exists persists nothing (it reappears on reload, because its visibility is a
pure function of link count). ⚠ Read the existing dismissible notice as the precedent for the
COMPONENT and its placement, never for the persistence — it has none.

Write via `useEntityProp( 'postType', postType, 'meta' )` — the proven idiom, live in
`plugins/sgs-blocks/src/plugins/product-variation-sets/index.js::registerPlugin`. ⚠ Gate on `postType` the same way
that plugin does; a meta write against a post type where the key is unregistered fails silently.

**(f) Gate: §11 G20b.**

### FR-41-35 — The ungated-paint detector, built framework-wide

⚑ **DECIDED 0.4.6 (owner): BUILD IT.** §12's retired item 13 recorded that FR-41-15's census was
found incomplete on three consecutive reviews and that nothing but review defends it. A method lives
in prose and prose is not enforcement. This FR is the enforcement.

**Scope decision, stated plainly as required: FRAMEWORK-WIDE, not `sgs/nav-menu`-only.**

The reasoning is empirical, not aspirational. FR-41-15's corrected methodology contains **nothing
nav-menu-specific**: it joins each `$css .=` / hover-helper statement to its terminating `;` and
tests the joined buffer for a `background`/`border` declaration, then reads the block's `style.css`
for the same shape. Both inputs are per-block paths; the classification input — "is this gated on an
operator attribute?" — comes from the block's own `plugins/sgs-blocks/src/blocks/<slug>/block.json::attributes`, which every block has.
A block-scoped build would be the same script with one path hardcoded, which is how a gate becomes a
lint. ⚠ **The block-agnosticity risk is not the scanner, it is the exemption set** — see (d).

**(a) Name and location.** `plugins/sgs-blocks/scripts/check-ungated-paint-rules.py`.

- **`check-*`** because it is gate-first, per this project's settled convention (`check-*` gates,
  `survey-*` censuses, `migrate-*` codemods).
- **Python, not JS.** The load-bearing half is PHP *statement* structure — the exact thing three
  line-anchored passes failed at — and every PHP-semantics-sensitive detector in this tree is Python
  (`check-dead-api-calls.py` is PHP-tokenizer-based; `check-render-undefined-vars.py`,
  `remove-vacuous-style-engine-guard.py`, `migrate-render-closures.py`). JS is the convention where
  the input is JSX AST or CSS. This input is both, and PHP dominates.
- ⛔ **It does NOT extend `check-hardcoded-render-defaults.js`,** and that is deliberate: that gate
  runs the INVERSE direction — *attribute exists → is its property also hardcoded?* — and its F3b
  check keys on a literal `block.json` `default` that flattens a theme.json `styles.elements`
  differentiated property, gated on the block declaring an enum of element keys. **None of
  census #4, #6 or #8 has a matching attribute on its own selector, so all three pass it clean.**
  This detector asks the opposite question — *declaration exists → does a governing attribute
  exist?* — and no existing gate asks it.

**(b) `--survey`.** Emits the census, in exactly FR-41-15's published three-bucket form, for one
block (`--block sgs/x`) or every block. Per hit: source file, selector, the verbatim declaration,
and its bucket — **CENSUSED / GATED (with the `if` named) / DISMISSED (with the reason AND the
condition that would return it to the census)**. ⛔ **All three buckets are emitted, never just the
findings** — an omission is indistinguishable from an oversight, and that ambiguity is precisely
what let three passes close early.

**(c) `--check`.** Exits non-zero when a `background` or `border` declaration is **emitted or
authored ungated on a selector carrying no corresponding operator attribute** — both surfaces, the
PHP emitter and the static `style.css`, in one run.

⛔ **Reuse FR-41-15's corrected scan logic verbatim; do not reinvent it.** Statement-aware (join to
the terminating `;` before testing), both files, scoped by defect SHAPE rather than by line range or
literal string. The three bounds that each hid a real rule are named in FR-41-15's history table —
a re-implementation that does not join statements reproduces the 0.4.4 failure exactly.

⚠ **Carry FR-41-15's own disclosed residual forward as a named limit, not a silent one:** the scan
is statement-aware, **not variable-aware**. A declaration accumulated into an intermediate PHP
variable and appended to `$css` in a later separate statement is outside what it can see.
`sgs/nav-menu`'s `$sgs_nm_featured_vars` assembly is a live instance. ⛔ The script must PRINT this
limit in its `--survey` output rather than leaving a reader to infer completeness — a census that
overstates its own reach is the defect this detector exists to end.

**(d) Exemptions — the real portability hazard, and where a block-scoped lint would hide.** Build
each as a GENERIC rule keyed on selector shape or on `supports.sgs`, never on a block name:

| Exemption | Rule |
|---|---|
| Resets | a declaration to `none` / `0` / `transparent` with no competing operator value |
| `:where()` defaults | zero-specificity fallbacks that any operator rule out-ranks by construction |
| Forced-colors / `@supports` a11y rules | not operator-facing paint |
| Wrapper-delegated blocks | the block declares a `supports.sgs` container kind and the paint belongs to `SGS_Container_Wrapper`, so no LOCAL attribute is expected |
| Attribute-driven `var()` with a live writer | the custom property has a real, empty-guarded writer — the `--sgs-x-*` bespoke pattern |

⛔ **The last one must verify the writer EXISTS, not merely that a `var()` is present.** Census #8 is
the worked counter-example: `--sgs-nm-featured-bg-hover` has **no writer anywhere in
`src/`**, so the rule can only ever paint its own hardcoded fallback — a `var()` with no writer is a
hardcode wearing a costume, and an exemption that matched on syntax alone would have cleared it.

⚠ **Precedent warning, taken from this gate family's own history (D649):** two attempts to widen
`check-hardcoded-render-defaults.js` were built and reverted the same day because string-coincidence
matches collided with real enums. ⛔ **If you find yourself writing `.sgs-nav-menu__` into an
exemption, you have written a nav-menu lint, not a gate** — stop and generalise the rule instead.

**(e) `--self-test`.** Negative controls are **census #4, #6 and #8** — three real, already-diagnosed
instances of the identical defect signature (unconditional, ungated, `background` SHORTHAND,
`:hover`, emitted through `sgs_hover_guarded_rule()`, `$uid_sel`-scoped). ⛔ **Assert each fixture
FAILS the check**, and assert the detector reports zero on a cleaned copy of the same fixture — a
check with no positive control passes against a dead feature, and a disabled rule returns 0 exactly
like a clean tree. ⚠ Add one fixture per exemption in (d) proving it does not OVER-match.

**(f) Wiring — the gate must be REACHABLE, not merely written.** Add an entry to
`plugins/sgs-blocks/scripts/gates.json` (the array of gate objects consumed by `run-gates.py`),
tier `fast`, with `id` / `cmd` / `tier` / `added_D` / `added_commit` / `budget_ms` / `order`
populated, plus the standalone `package.json` alias every sibling gate carries.

⛔ **A `package.json` alias alone does NOT wire a gate.** Since the 2026-08-24 split, the build chain
lives in `gates.json`; grepping `package.json` now returns a FALSE POSITIVE in exactly the direction
that matters. **Prove it with `npm run gate:list`**, not with a grep — this repo's recorded failure
mode is a detector built and left unreachable for three weeks (D338/D493).

**(g) Gate: §11 G20c.**

---

## 11. Acceptance

| Gate | Condition |
|---|---|
| **G1 — zero blast radius** | **Five** separate proofs, all required. (a) Every block mounting `SgsColourPanel` renders byte-identical inspector output before and after the FR-41-16 sub-heading change — diff at least three existing callers (verify the roster live: `grep -l "<SgsColourPanel" plugins/sgs-blocks/src/blocks/*/edit.js`; never cache the count). (b) All **122** existing `sgs_emit_state_colour_css()` call sites emit byte-identical CSS with the new 4th parameter defaulted (`grep -rn "sgs_emit_state_colour_css(" plugins/sgs-blocks --include=*.php \| wc -l` to re-derive the figure). (c) `sgs_fill_states_css()` / `sgs_text_states_css()` / `sgs_border_states_css()` emit byte-identical CSS for every caller whose `$map` has **neither a `current` key nor a `suppress_edges` key** — ✅ **EXTENDED 0.4.7** to cover FR-41-8's additive per-edge parameter alongside FR-41-3's third state, because both land on the same function and the same zero-blast-radius question. Re-derive the roster live (`grep -rn "sgs_border_states_css(" plugins/sgs-blocks --include=*.php`). ⛔ **Assert specifically that such a caller still receives the flat `border-color` SHORTHAND, not per-edge longhands** — an implementation that always emits longhands renders identically, is byte-different for 100% of existing callers, and would pass a looser "does it still paint the right colour?" check. (d) **NEW (0.4.1):** every existing `SgsBorderControl` mount renders byte-identical inspector output with the new `showColour` prop defaulting `true` — diff at least three existing callers, roster re-derived live (`grep -l "<SgsBorderControl" plugins/sgs-blocks/src/blocks/*/edit.js`; ⚠ that grep under-counts by at least one, because `sgs/media` mounts it only through the media-atom chain). `GradientCapableColourControl` is NOT edited at all, so its adopters are untouched by construction — ⚠ **but 0.4.3 mounts its `BorderStyleControl` child from a second place (FR-41-33 item 2), so assert that child's own adopters are unaffected too**: `DesignTokenPicker.js` and `GradientCapableColourControl.js` both render it today and neither is edited. **(e) NEW (0.4.3):** every element carrying `data-sgs-fx="magnet"` anywhere in the framework renders a byte-identical computed `transition` before and after `fx-magnet.css` gains `--sgs-magnet-transition` — the property resolves to the same declaration the file already emitted, so this is a refactor with a named zero-delta expectation, not a behaviour change. ⛔ Assert the COMPUTED value on a live magnet element, not that the file's text still contains `180ms`: a mistyped custom-property name would leave the text intact and the `var()` unresolved, and `transition` would silently fall back to the nav-menu rule's own literal on the burger while every OTHER magnet element lost its transition entirely. |
| **G2 — no bare `:hover`** | `plugins/sgs-blocks/scripts/hover-guard/check.js` passes. Every new hover rule traces to `sgs_hover_state_rules()` or `sgs_hover_guarded_rule()`. |
| **G3 — no inline styling** | `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0 (Spec 32 / FR-36-13). |
| **G4 — DB state routing** | `/sgs-db` shows `itemColourHover`/`itemBgHover` still at `css_state='hover'` after the manifest change, and every new Current attr at `css_state='current'`. This is §8.6(a)'s negative control — it must be RUN, not reasoned about. ⚠ **EXTENDED 0.4.3 — the restored typography trio is IN this gate, and it is the case most likely to collide.** For each of the three properties on each of the two prefixes, assert the BASE and the HOVER attribute occupy SEPARATE routing slots: `itemTextDecoration` / `itemTextTransform` / `itemFontWeight` at `css_state IS NULL`, and `itemTextDecorationHover` / `itemTextTransformHover` / `itemFontWeightHover` at `css_state='hover'`; the same six for the `submenu` prefix (`submenuTextDecoration…`/`submenuTextTransform…`/`submenuFontWeight…`). ⛔ **Twelve rows, twelve distinct `(css_property, css_element, css_state)` triples — assert the DISTINCTNESS, not merely that twelve rows exist.** The collision this catches does not delete a row; `_record()` is last-write-wins, so it silently retags one attribute with the other's state and both rows survive looking plausible. That exact shape is recorded twice in this block's own manifest `_note`s (`burgerColour`+`burgerColourHover`, `submenuColour`+`submenuColourHover`) and once more in the `item._note`'s removed `selected` map. ⚠ Assert `itemFontWeight`'s base row specifically — it is the one base member that already existed before this spec (§8.6a), so it is the one a builder is most likely to drop while adding its two state siblings. |
| **G5 — no dead controls, and no dangling references to deleted attributes** | `npm run check:dead-controls` and `npm run check:empty-inspector-containers` pass. Every new attribute is both written by a control and read by `render.php` — including the whole submenu typography family (FR-41-22) and the three `triggerMagnet*` attributes (FR-41-31). ⚠ **The six `showHover` attributes are IN this check, not exempt from it (0.4.2).** For each of `itemTextDecorationHover` / `itemTextTransformHover` / `itemFontWeightHover` / `submenuTextDecorationHover` / `submenuTextTransformHover` / `submenuFontWeightHover`, assert BOTH halves: the control renders (`showHover: true` on that target entry, FR-41-22) AND `render.php` emits it (the block-private hover rule, FR-41-21). ⛔ This gate's 0.4.1 form asserted the INVERSE — that none of the six was declared — so a builder working from a 0.4.1 copy would fail the build on a correct 0.4.2 implementation. The inverse assertion is retired; do not reinstate it. Every deleted attribute has zero remaining readers across **three** search scopes, not one: `grep -rnE "hoverStyle\|underlineColour\|underlineColourGradient\|underlineThickness\|underlineOffset\|itemRadius\|itemRadiusHover\|submenuRadius\|indicatorStyle\|indicatorColour\|indicatorColourGradient\|borderHoverAnimation[^D]" plugins/sgs-blocks/src/ plugins/sgs-blocks/scripts/ theme/` returns nothing. ⛔ **The whole `indicator*` family and `borderHoverAnimation` are in this sweep and must not be omitted** — `indicatorStyle` is an EXISTING shipped attribute with real stored values, so leaving it out is how a client's pill setting disappears with no explanation. ⚠ The `[^D]` guard on the last term is deliberate: `borderHoverAnimationDirection` is a LIVE attribute (§8.4) and an unanchored match would report it as a surviving reader of a deleted one. ⚠ **`plugins/sgs-blocks/scripts/` is not optional** — a scan for these names found live references in `plugins/sgs-blocks/scripts/consistency/attr-role-map.json`, `plugins/sgs-blocks/scripts/consistency/golden-controls.json`, `plugins/sgs-blocks/scripts/consistency/setting-types.json`, `plugins/sgs-blocks/scripts/consistency/setting-reclassification.json`, `plugins/sgs-blocks/scripts/behavioural-analyser/css-property-classifications.json`, `plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py`, `plugins/sgs-blocks/scripts/check-duplicate-controls.js`, `plugins/sgs-blocks/scripts/check-hover-state-classification.py` and `plugins/sgs-blocks/scripts/toolindex/index.json`. Also run `python plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py`. |
| **G5a — stored content** | ⛔ **PHP does NOT drop an undeclared attribute before `render.php` runs** (D338 correction — `WP_Block_Type::prepare_attributes_for_render()` merely `continue`s past it). A canary page holding a stored `hoverStyle` / `underline*` / `itemRadius*` / `submenuRadius` / **`indicatorStyle` / `indicatorColour` / `indicatorColourGradient` / `borderHoverAnimation`** value keeps handing it to `render.php` until the next editor save. Run `npm run audit:post-content -- <path>` over the canary's pulled `post_content` and confirm zero surviving references for **all** of them, then re-check the rendered page. ⛔ **A stored `indicatorStyle:'pill'` must be MIGRATED, not merely swept** — write `itemBgHoverTreatment:'highlight'` and carry the stored `indicatorColour` value across into `itemBgHover` (or `indicatorColourGradient` into `itemBgHoverGradient`) in the same pass, per FR-41-25. Deleting the attribute without the carry-across silently loses the client's pill and its colour with no error and no failing gate. A green build proves nothing here. ⛔ **PRECEDENCE, named rather than left to the implementer (0.4.3, justification corrected + surfacing added 0.4.4): if the stored content ALREADY carries a non-empty `itemBgHover` (or `itemBgHoverGradient`), KEEP IT and SKIP the migration write for that key — the treatment flip to `'highlight'` still happens, the colour carry-across does not.** ⚠ **The 0.4.3 justification for this rule was verified and RESTATED, because it was doing two jobs and only one of them was sound.** The sound half, verified in `render.php`: pre-migration, `indicatorStyle` gates only the indicator's own fill and the bar's data attribute — there is **no** per-item background suppression in the shipped code (FR-41-14's ⛔), so `indicatorColour` and `itemBgHover` really were both painted and both visible, and "the operator may never have seen it" was never true of either. The rule stands on the honest reason instead: ⛔ **never silently overwrite operator-stored data — including data that was not rendering.** A migration's job is to carry a mechanism across, not to adjudicate which of two deliberately-set colours the operator meant. ⛔ **And because the resulting pill DOES change colour on screen — from `indicatorColour` to the kept `itemBgHover` — the change must be SURFACED to the operator, not merely logged where nobody reads it.** Emit a dismissible editor notice on the affected post naming the block, the old pill colour and the new one, with the one-step correction (set the Item background row's Hover swatch to the old value). ⛔ A `error_log()` line is not surfacing: the person who needs to know is the operator, and they are in the editor. ⚠ **Self-caught and disclosed rather than assumed: no existing per-post migration-notice mechanism was found in the tree, so this is NEW work, not the reuse of a shipped one.** ⚑ **Its shape is no longer an owner call — DECIDED 0.4.6 and specified in full at FR-41-34** (a `_sgs_nav_menu_migration_notice` post-meta flag written by the migration, read once by a dismissible editor-side `Notice` whose dismissal clears it). Gate: G20b. ⛔ The requirement is not downgradeable to a silent log, and the mechanism now exists in writing, so its absence can no longer be offered as the reason. ⚠ FR-41-34 also states which cases write NO record — the skipped-key case and the unset-source case both changed nothing on screen, so neither takes a notice. ⚠ Per-key, not per-post: a page may carry `itemBgHover` and not `itemBgHoverGradient`, in which case the flat key is kept and the gradient key is carried across — and the notice names only the keys that actually changed. ⚠ Log every skip as well as surfacing it — a silent skip and a silent overwrite are equally invisible afterwards, and the whole point of this gate is that a green build proves nothing. ⛔ **UNSET-SOURCE CASE — the commonest real state, and 0.4.3 shipped it broken (0.4.4). When `indicatorStyle` is `'pill'` and BOTH `indicatorColour` and `itemBgHover` are empty, write `itemBgHover: 'accent'`** — do not leave it empty. Verified: `indicatorColour` defaults to `""` in `block.json`, and `style.css`'s `.sgs-nav-menu__indicator` rule declares `background-color: var(--wp--preset--color--accent, currentColor)`, so **a client who switched Pill on and never opened the colour picker is looking at an accent-coloured pill right now.** Carrying an empty value across produces `itemBgHoverTreatment: 'highlight'` with no fill at all — an invisible pill, a visible regression, and no failing gate. `accent` is a real palette slug (verified in `theme/sgs-theme/theme.json::settings.color.palette`), so the written value resolves to the same colour the CSS fallback was painting. ⚠ If the target theme declares no `accent` slug, the CSS fallback was `currentColor` and the slug will not resolve — **log that case explicitly as unresolved rather than writing a dead slug silently**, and surface it in the same notice. ⚠ This case takes NO notice about a colour change, because there is none: the operator sees the same accent pill before and after. |
| **G6 — one line, not two** | On the live canary, with a bottom border colour AND a sweep direction both set, the item row renders **exactly one** painted horizontal line, and `getComputedStyle( link ).borderBottomColor` is `rgba(0, 0, 0, 0)` while the `::after` band paints (FR-41-8 mechanism items 2 + 3). Count the line in the live DOM and assert the transparent border-colour — the mechanism, not just the appearance. |
| **G7 — live verification (R-31-11 / R-31-13)** | Playwright on the real page, **both forks**: hover a parent with a dropdown in the BAR, move into the dropdown, confirm via `getComputedStyle` that the parent's hover declarations are still applied; repeat inside the DRAWER's accordion. Tab into each panel and confirm the same via the `:has()` half. With a non-zero `submenuTopOffset`, move the pointer slowly across the gap and confirm the parent's paint never drops (FR-41-11's bridge). Confirm the Current state paints on the current page, and that the drawer's instance and the bar's instance carry independent borders. Plus Bean's eye — a number alone does not close this. |
| **G8 — touch** | On touch emulation, tapping a nav item does not leave it stuck in its hover colour, and the colour sweep does not strand half-finished. |
| **G9 — reduced motion** | Under `prefers-reduced-motion: reduce`, the colour sweep and the submenu open animation both land on their END state with no travel — and the submenu still opens. Assert both FIRE without the media query too; a check that only asserts 0 under reduced motion passes against a dead feature. ⚠ **EXTENDED 0.4.3 — assert the MAGNET's reduced-motion outcome AND the rule that produces it.** With `triggerMagnetEnabled` on and `reduce` emulated, assert on the live canary that (a) `getComputedStyle( burger ).transitionDuration` resolves to the killed value, not `180ms`, and (b) `getComputedStyle( burger ).transform` is `none`. ⛔ **Then assert the CAUSE, not just the outcome:** the winning `transition-duration` declaration must be the `!important` one from the four-selector `@media (prefers-reduced-motion: reduce)` rule in `plugins/sgs-blocks/src/blocks/nav-menu/style.css` (the list naming `.sgs-nav-menu__burger`, `.sgs-nav-menu__link`, `.sgs-nav-menu__indicator` and `[data-magnet] .sgs-nav-menu__magnet-target`). FR-41-31's companion rule sits at `(0,2,0)` and out-ranks `fx-magnet.css`'s own `(0,1,0)` kill switch, so that pre-existing `!important` rule is the ONLY thing killing the transition — an assertion on the outcome alone would still pass if someone later narrowed that selector list, and would pass for the wrong reason. ⚠ Also assert the companion rule itself carries NO `!important`: giving it one would beat the rescue and reinstate the transition. |
| **G10 — non-colour signal RENDERS, not just computes** | Two assertions, matching FR-41-6's two signals. **(a) Hover:** with a bottom `itemBorderWidth` set and every COLOUR attribute unset except `itemBorderColourHover`, hovering an item visibly changes the border — assert the computed `border-bottom-color` differs between resting and hovered, on the live page. ⚠ **Do NOT assert a signal on a border-less menu** — `itemBorderWidth` defaults to `{}`, so an untouched block ships no Hover signal and the gate would be asserting a capability the spec deliberately does not claim (FR-41-17a case a). **(b) Current:** with every colour attribute unset, the current-page item renders at the declared weight. ⛔ **`getComputedStyle` alone does not close the weight half.** Verified: `theme/sgs-theme/theme.json` registers `display` with a **single 400 face** and `dm-sans` with `400 700` — on either family, `font-weight:600` computes as `600` while painting at 400 (or a browser-synthesised approximation) and the computed-style check passes against no visible difference. Assert BOTH: (a) the computed value, and (b) a rendered difference — a `getBoundingClientRect().width` delta on a fixed test string between a Normal and a Current item, or a `document.fonts.check( '600 16px <family>' )` probe confirming a real face exists. |
| **G11 — underline element reseeded out** | After deleting the `underline` element and running `/sgs-update`, `/sgs-db` returns **zero** rows with `css_element='underline'` for `block_slug='sgs/nav-menu'`. §8.6(f) step 3 — an orphan `css_element` survives a manifest deletion until the reseed, and a raw row deletion does not survive one. |
| **G12 — manifest conformance** | `npm run audit:element-manifest` passes, and `python plugins/sgs-blocks/scripts/placement-reach.py --block sgs/nav-menu` reports no new CONTESTED attributes — the new border family is claimable by both `item` and `submenu-panel` by name, so each needs its explicit `attrMap` entry (§8.6a/c) rather than a guessed tie-break. ⚠ **EXTENDED 0.4.4 — assert `supports.sgs.sweepEligibility` name-by-name.** Every attribute named in its three rows' `blockingBackgroundAttrs` / `blockingGradientAttrs` / `glyphGuard.attr` must resolve to a real entry in `plugins/sgs-blocks/src/blocks/nav-menu/block.json::attributes`, and the three row KEYS must each be a declared `…HoverTreatment` attribute (§8.6g item 4). ⛔ A misspelt attribute name in that table reads as permanently empty, so the predicate always passes, the `Sweep` segment always offers and the emitter always emits — the eligibility rule silently ceases to exist with nothing failing. That is a dead-detector shape, and this is the only gate positioned to see it. |
| **G13 — hover-treatment default is byte-identical (0.4.0, restated 0.4.1)** | Every `{row}HoverTreatment` attribute defaults to `"swap"`; an untouched block renders CSS byte-identical to a pre-0.4.0 build with the same colours set (FR-41-23). ⚠ **The Highlight half is an INPUT-MAPPED equivalence, not an untouched-defaults one, and must be stated that way** — `indicatorColour` no longer exists, so "byte-identical on the same inputs" is meaningless as written. The real assertion: `itemBgHoverTreatment='highlight'` with `itemBgHover = X` renders CSS byte-identical to a pre-0.4.1 build with `indicatorStyle='pill'` and `indicatorColour = X`. Diff that pair, and the gradient pair (`itemBgHoverGradient` vs `indicatorColourGradient`) alongside it (FR-41-25). ⛔ **THIRD SCENARIO — the UNSET SOURCE, added 0.4.4, and it is the one a builder will skip because it looks like the trivial case.** Take a pre-0.4.1 page with `indicatorStyle='pill'` and **both** `indicatorColour` and `itemBgHover` empty; run the G5a migration; assert on the live canary that the post-migration pill renders the **same visible colour** as the pre-migration one. ⛔ Assert the RENDERED colour, not the stored attribute: pre-migration the colour comes from `style.css`'s `background-color: var(--wp--preset--color--accent, currentColor)` with no PHP emission at all (`render.php` gates the fill on `'' !== $indicator_colour`), so an attribute-level diff shows empty-vs-`'accent'` and tells you nothing about what the visitor sees. `getComputedStyle( indicator ).backgroundColor` must match across the pair. ⚠ A gate that only runs the both-set and one-set scenarios passes against a migration that ships an invisible pill to every client who never touched the colour picker — which is the commonest real state, not an edge case. **⛔ FOURTH SCENARIO — THE RADIUS, added 0.4.6, and it changes what "byte-identical default output" MEANS on this gate.** `itemRadius` is deleted and `itemBorderRadius` now defaults to 8px on all four corners (§8.4). **The byte-identity claim must now assert 8px-ROUNDED output, not square-cornered output** — an implementer reading this gate's pre-0.4.6 wording alongside an `{}`-defaulted radius would ratify exactly the regression the owner's decision refuses. Assert on the live canary: with an `itemBg` set and `itemBorderRadius` untouched, `getComputedStyle( link ).borderRadius` resolves to `8px` on all four corners, matching a pre-0.4.6 build byte-for-byte. ⛔ **Assert the COMPUTED value, not the emitted declaration** — pre-0.4.6 the 8px came from a `render.php` `isset()` fallback emitting `border-radius:8px` inline in the scoped rule, post-0.4.6 it comes from a `block.json` default flowing through `sgs_corner_object_shorthand()`, so the two builds emit DIFFERENT source text for the same painted result. A source-text diff fails here for the right reason and the wrong verdict. ⚠ Also assert the negative: an item with NO background set renders no `border-radius` rule at all on either build — the radius only ever applied inside the background branch, and defaulting the attribute must not leak a radius onto an unstyled item. |
| **G14 — text-sweep does not collide with background/border layers (0.4.0, tightened 0.4.1)** | Live DOM, and note the combination is only REACHABLE on the item text row: with `itemColourHoverTreatment='sweep'` AND `itemBgHoverTreatment` set AND `itemBorderHoverTreatment='sweep'` simultaneously, the item renders three independent, non-fighting effects — text glyphs sweep colour (no pseudo-element), background paints on `::before`, border band sweeps on `::after`. Confirm via `getComputedStyle` that `::before` and `::after` each carry their own expected declarations, neither empty nor doubled (FR-41-26). **Plus a NEGATIVE control for the eligibility rule:** set `submenuLinkBg`, then assert the submenu link-text row offers exactly TWO segments and no `Sweep`; repeat with `burgerBg` on the menu-button icon row, with `triggerMode='icon'`, and with `itemColourGradient` on the item-text row. A gate that only proves the positive path passes against an eligibility rule that never fires. **⚠ THREE assertions added 0.4.3 — this gate is the block's cross-mechanism-interaction gate (it is the one that already proves two mechanisms sharing an element do not fight), so the new combinations belong here rather than on G19, which is single-mechanism by construction.** **(e) Sweep × hover text-decoration compose correctly (FR-41-26, item 8's rule):** set `itemColourHoverTreatment='sweep'` AND `itemTextDecorationHover='underline'` on the same row, hover the item on the live canary, and assert `getComputedStyle( link ).textDecorationColor` equals the resolved HOVER colour — **NOT** the resting colour. ⛔ Asserting `textDecorationLine === 'underline'` is not enough and is the trap: the line renders either way, it just renders in the wrong colour, so the defect is invisible to a presence check. Repeat once on a sublink with `submenuColourHoverTreatment='sweep'` + `submenuTextDecorationHover`. ⛔ **Plus the RESOLVED-value negative control (0.4.4):** on that same sublink, ALSO set `submenuLinkBgHover` so the eligibility predicate fails and the treatment resolves to `'swap'` while the STORED value stays `'sweep'`; assert the decoration-colour rule does **not** fire — `textDecorationColor` follows the element's own hover `color` (inherited via `currentColor`), not a forced value. This is what proves the rule keys on the RESOLVED treatment rather than the raw attribute; without it, an implementation reading the stored value passes every other assertion in (e). **(f) THE EMITTER RE-CHECKS THE PREDICATE — the load-bearing assertion of the whole eligibility rule (FR-41-26, item 1's rule):** store `submenuColourHoverTreatment='sweep'` while `submenuLinkBg` is empty (legal), THEN set `submenuLinkBg`, WITHOUT touching the treatment attribute; re-render and assert the emitted CSS for `.sgs-nav-menu__sublink` contains **no `background-clip`, no `-webkit-background-clip` and no `-webkit-text-fill-color`**, and that the sublink's own background paints normally. Repeat both remaining paths: `burgerColourHoverTreatment='sweep'` then set `burgerBg`; and `burgerColourHoverTreatment='sweep'` in `icon-and-text` mode then switch `triggerMode` back to `'icon'`. ⛔ **Assert the ABSENCE of the clip declarations in the rendered CSS, not the presence of a UI segment** — the whole defect class is that the control disappears while the emission continues, so a check performed in the editor cannot see it. ⚠ Also assert the stored value is still `'sweep'` after each: the fix gates the EMISSION, it does not clear the attribute (FR-41-26), and a gate that accepted a cleared value would ratify the wrong fix. ⚠ **EXTENDED 0.4.4 — (f) now runs on FIVE paths, not three:** the two newly-covered blocking attributes are in scope too, so add `submenuColourHoverTreatment='sweep'` then set **`submenuLinkBgHover`** (leaving `submenuLinkBg` empty, which is the whole point — a resting-only check passes this one), and `burgerColourHoverTreatment='sweep'` then set **`burgerHoverColour`** (not `burgerBg`). ⛔ On the `burgerHoverColour` path assert specifically that the button's HOVER fill paints as a filled button and NOT as coloured letter shapes: it is a `background-color` longhand, so the sweep's `background-image` survives and the naive "no `background-image`" check passes while the clip still ruins the render. **(g) THE TWO SURFACES AGREE — the direct proof of FR-41-26's one-declared-source rule (0.4.4), and the only assertion here that a single-surface check cannot substitute for.** For each of the three rows, pick a stored value that STRADDLES the boundary — treatment stored as `'sweep'` with exactly one blocking attribute set — and assert, on the SAME post, in the SAME state: (i) the editor's row renders exactly TWO segments with no `Sweep` (UI says ineligible), AND (ii) the rendered front-end CSS for that selector carries no `background-clip` / `-webkit-background-clip` / `-webkit-text-fill-color` (PHP says ineligible). ⛔ **Both halves in one check, on one stored state — never the UI check on one fixture and the PHP check on another.** The defect this proves absent is *disagreement*, and two checks run on two different fixtures can both pass while the surfaces disagree on every real page. ⚠ Then assert the converse on an unblocked fixture: the `Sweep` segment IS offered AND the clip declarations ARE emitted. A check that only ever sees the ineligible side passes against two surfaces that both always say no — the positive control without which (g) is vacuous. ⚠ Run at least one path per row, including the `submenuLinkBgHover` and `burgerHoverColour` straddles, so the agreement is proven across all three `sweepEligibility` entries and both newly-covered attributes. |
| **G15 — icon pickers default byte-identical (0.4.0)** | With `triggerIcon`/`sublinkMarkerIcon` unset (their declared defaults), the rendered SVG markup is byte-identical to the pre-0.4.0 hardcoded `menu`/`chevron-right` glyphs (FR-41-30). |
| **G16 — the relocated readability toggle still works (0.4.1)** | Three assertions, all on the live canary, because a relocation with no gate is how a working control quietly stops working (FR-41-5/FR-41-27). (a) The toggle RENDERS in the General tab's Accessibility panel. (b) It is bound to `itemSmartContrast` — flipping it writes that attribute and no other. (c) Switching it OFF then ON actually changes the RENDERED text colour on an item with a Hover background set — assert the computed `color` differs between the two states. ⛔ Asserting the control exists is not asserting it acts; (c) is the load-bearing half. Also confirm the §9.6 cross-reference note renders beneath the Item text and Item background rows. |
| **G17 — magnet default is byte-identical and costs zero bytes (0.4.1)** | With `triggerMagnetEnabled` false (its default), the rendered `<button class="sgs-nav-menu__burger">` markup is byte-identical to a pre-0.4.1 build — no `data-sgs-fx` attribute of any kind — **and no magnet JS module or stylesheet is enqueued on the page**. Assert the ABSENCE of the asset in the page's script/style list, not merely the absence of the attribute: the enqueue is markup-sniffed, so proving the attribute is gone is not the same as proving the sniff found nothing (FR-41-31). Then switch it on and assert the inverse: attribute present, module enqueued, and the companion `transition` rule from nav-menu's own stylesheet is the winning declaration on the button. |
| **G18 — exactly one writer per border-colour attribute (0.4.1)** | `node plugins/sgs-blocks/scripts/check-duplicate-controls.js` passes, AND — because that gate's CHECK 2 scans literal JSX control elements and is blind to a duplicate writer living inside a row OBJECT LITERAL passed as a config prop — verify by hand in the live editor that `SgsBorderControl` under `showColour={ false }` renders **no colour swatch** on either mount (§9.7, §9.9), that border STYLE is still reachable as its own control, and that the border-colour rows in the Colour panel are the only place the three `itemBorderColour*` attributes can be set (FR-41-33). ⛔ **"Reachable" is NOT the assertion — 0.4.3 adds the WRITE and the EMIT halves, because the existing clause only proved the control is visible in the editor.** A style control re-parented out of a suppressed popover can render perfectly and be wired to nothing: `BorderStyleControl`'s `onChange` returns `''` on deselect, and a mount that forwards it to the wrong handler — or to none — looks identical on screen. Assert all three, in order: **(a) RENDERS** — the style control appears on both `showColour={ false }` mounts (§9.7 item, §9.9 submenu panel); **(b) WRITES** — picking Dashed on each mount stores `"dashed"` in `itemBorderStyle` and `submenuBorderStyle` respectively, and in NO other attribute; deselecting stores `""`; **(c) EMITS** — with a width also set, the live canary's rendered CSS carries `border-style:dashed` on `.sgs-nav-menu__link` (and on `.sgs-nav-menu__submenu`), and `getComputedStyle` agrees. ⚠ Run (b) and (c) as a matched pair on the SAME value: a write with no emit and an emit with no write are different bugs, and each passes the other's check. |
| **G19 — the hover typography trio renders, emits, and is NOT the default signal (0.4.2, extended 0.4.3)** | Five assertions, because the restoration has one failure mode in each direction — plus, from 0.4.3, the UX distinction FR-41-6 makes binding. ⚠ **Cross-mechanism combinations (trio × a hover treatment on the same row) are NOT here — they are G14(e), which is this block's cross-mechanism gate.** This gate proves the trio works on its own terms. **(a) Renders:** all six controls appear — three under the Typography panel's Menu target, three under its Submenu target — and each writes only its own attribute. **(b) Emits:** with `itemTextDecorationHover: "underline"` set and every colour attribute unset, hovering an item produces `getComputedStyle( link ).textDecorationLine === 'underline'` on the live canary, and the resting value is not `underline`. Repeat once on a sublink with `submenuFontWeightHover`. **(c) Additive default:** with all six unset (their declared defaults), the rendered CSS is byte-identical to a pre-0.4.2 build — ⛔ assert the ABSENCE of any hover `text-decoration` / `text-transform` / `font-weight` declaration, not merely that the page looks unchanged. **(d) NEGATIVE control on the allowlist:** set `itemTextTransformHover` to a value outside `none/uppercase/lowercase/capitalize` and assert the hover rule emits NOTHING for that property — not the base value, not the invalid value (FR-41-21). A check with no invalid input passes against an emitter that validates nothing. **(e) BOTH cross-reference notes RENDER, and each names the other (0.4.3).** In the live editor, assert the `ⓘ` note beneath the item border colour row's hover-treatment selector (§9.6) is present and points at Typography → Decoration (hover), AND that the note beneath the Typography panel's hover trio row (§9.10) is present and points at the item border's hover setting. ⛔ **Assert BOTH, in one check, not either** — FR-41-6 requires reciprocity, and a one-way pointer is the failure shape: it leaves the un-pointed control reading as the authoritative one, which is exactly the "two implementations of one thing" impression the notes exist to remove. ⚠ Also assert neither string contains "WCAG", "contrast", "AA", "signal" or "divider" — the client-visible-string rule that already binds FR-41-5's toggle binds these (§9.10). |
| **G20 — the responsive font-size tiers PERSIST and RENDER (0.4.6)** | §8.4a's requirement, and the half the owner's ruling correctly identified as never having been asserted. Three assertions, on the live canary, for **both** prefixes (`item` and `submenu`). **(a) PERSISTS:** switch the inspector's device toggle to Tablet, set a font size, reload the editor, and assert the value survives — then repeat for Mobile. ⛔ **Assert the value is stored INSIDE the tier object** (`itemFontSize.tablet`), and assert **no `itemFontSizeTablet` attribute exists on the post at all**. That second half is the load-bearing one: it is what proves the block is on the tiered path and would fail if someone "backfilled" the flat keys §8.4a refuses. **(b) RENDERS:** assert the emitted CSS carries a `@media` rule setting `font-size` at the tablet and mobile breakpoints, and that `getComputedStyle( link ).fontSize` differs across the three widths. **(c) NEGATIVE CONTROL:** with all three tiers unset, assert NO `font-size` `@media` rule is emitted for that prefix — a check with no unset case passes against an emitter that always emits. ⚠ Run (a)–(c) on `submenu` too: that family is declared new by FR-41-22, so it has never rendered at all, and a shape error there is invisible to any item-only check. |
| **G20b — the migration notice appears when, and ONLY when, a value visibly changed (0.4.6)** | FR-41-34. Four assertions, and the negatives are the point — a notice that always shows is noise the operator learns to dismiss unread. **(a) APPEARS:** run the G5a migration on a post whose `indicatorColour` genuinely differed from a non-empty `itemBgHover`, open the editor, and assert a dismissible `Notice` renders in the default `InspectorControls` group naming the block, the old colour and the new one. **(b) DOES NOT appear on a SKIPPED key:** G5a's precedence rule kept the operator's existing value and wrote nothing, so nothing changed on screen — assert no notice. **(c) DOES NOT appear on the UNSET-SOURCE case:** both sources empty, `itemBgHover: 'accent'` written, the operator sees the same accent pill before and after — assert no notice. **(d) DOES NOT appear on a FRESH block with no migration involved at all** — insert a brand-new `sgs/nav-menu` and assert the meta is absent and no notice renders. ⛔ **(d) is not redundant with (b) and (c):** those two prove the notice is correctly suppressed on a post that WAS migrated; (d) proves the mechanism does not fire on the overwhelming majority of posts that never were. An implementation that reads an absent meta as a truthy empty array passes (b) and (c) and fails only here. **(e) DISMISSAL CLEARS IT:** dismiss the notice, reload, assert it does not return AND assert the meta record is gone. ⚠ This is the half with no precedent anywhere in the plugin (FR-41-34e) — the one dismissible `<Notice>` that exists today persists nothing and reappears on reload, so an implementation that merely copies it passes every other assertion here and fails this one. ⚠ Also assert the rendered string contains none of "WCAG", "contrast", "AA", "signal", "migration". |
| **G20c — the ungated-paint detector exists, is REACHABLE, and can still fail (0.4.6)** | FR-41-35. **(a)** `python plugins/sgs-blocks/scripts/check-ungated-paint-rules.py --check` exits 0 on the post-FR-41-15 tree — all 11 censused rules deleted or converted. **(b)** `--self-test` passes, and its negative controls are census #4, #6 and #8: assert each fixture makes `--check` exit NON-ZERO, and that a cleaned copy of the same fixture exits 0. ⛔ **Both directions, or the self-test is vacuous** — a detector that stopped detecting returns 0 exactly like a clean tree, which is this project's recorded dead-detector shape. **(c) REACHABILITY:** `npm run gate:list` shows the gate with its tier and measured cost. ⛔ **Do not substitute a `package.json` grep** — since the 2026-08-24 gates.json split that grep returns a false positive in precisely this direction, and this repo has already shipped a detector that sat unreachable for three weeks (D338/D493). **(d) FRAMEWORK-WIDE, proven not asserted:** run `--survey` with no `--block` filter and confirm it enumerates every block, then confirm the source contains **no `sgs-nav-menu` string literal** outside test fixtures. That grep is the whole scope decision made checkable — if it fails, a gate was built as a nav-menu lint. **(e)** `--survey` output PRINTS its own variable-awareness limit (FR-41-35c), rather than presenting its census as complete. **(f) ENFORCEMENT SCOPE, added 0.4.7 (owner-ruled 2026-09-11) — and note that (d) and (f) are about two DIFFERENT things.** (d) governs the detector's *logic*, which stays generic and framework-wide. (f) governs its *hard-fail*, which lands on `sgs/nav-menu` alone for this build; every other block's findings are PRINTED and exit 0. Framework-wide hardening is explicitly separate future work, triaged against a real no-filter `--survey` run. Assert the scoping in BOTH directions: a planted ungated rule in `sgs/nav-menu` exits non-zero, and the same planted rule in any other block exits 0 with the finding printed. ⛔ A scope that silently hard-fails everything passes (a) and (b) and would turn the build red for every concurrent session on work nobody scoped — the standing-red failure this project already recorded on `wp-pre-merge-gate`. ⚠ The scope list lives in `gates.json` CONFIG with an explicit expiry-condition comment, never as a dict inside the script (R-31-1). |

---

## 12. Open tensions found while writing this spec

Recorded, not resolved — each needs an owner call if it matters. (**Five** items previously listed
here — the Spec 36 `hideExtensions` mis-statement, the stale `borderRow` claim in
`plugins/sgs-blocks/CLAUDE.md`, the `itemTextDecoration` enum gap, **the `sgs/business-info`
hover-effect description in `plugins/sgs-blocks/CLAUDE.md` (0.4.6), and `ShadowControl.js`'s
D621/D622 docblock (0.4.6)** — were plain factual errors with one correct answer each, not real
tensions. All five are now corrected directly at source (Spec 36 FR-36-14,
`plugins/sgs-blocks/CLAUDE.md` ×2, `ShadowControl.js`'s own docblock, and §8 above) rather than
carried here. The two 0.4.6 corrections are the ones this spec depended on most: the business-info
line now states that BOTH the `background-clip:text` colour sweep AND the sibling `::after`
underline-grow ship together, which is the precedent FR-41-26 adopts; and the `ShadowControl`
docblock now states that the control renders its colour picker itself inside `ShadowStateBuilder`
and that only the ATTRIBUTE is caller-owned, which is the precedent FR-41-33 cites — externalised
OWNERSHIP is proven, externalised RENDERING is not.)

⚑ **Four further items were DECIDED by the owner and are no longer open (0.4.6).** They are folded
into the body as settled requirements, not carried here: the responsive font-size tiers
(§8.4a + §11 G20), the `itemBorderRadius` default (§8.4 + §11 G13), the migration-notice mechanism
(**FR-41-34**) and the hardcoded-rule detector (**FR-41-35**). ⛔ Do not re-open any of the four as
a question — if one needs changing, change the requirement.

1. ~~**The `sgs/nav-drawer` close-side gaps** (no editable label, no icon-and-text form) —
   FR-41-12. Real, small, and belongs to that block's own track.~~
   ✅ **CLOSED — BUILT 2026-09-11.** It stopped being a follow-up at 0.4.7 (owner-ruled into this
   phase) and has now shipped: `closeLabel`, `closeIcon`, and `icon-and-text` added to BOTH
   `plugins/sgs-blocks/src/blocks/nav-drawer/block.json::attributes.closeStyle.enum` and
   `plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$sgs_nd_allowed_close_styles`, with the
   empty-label `aria-label` trap closed. Row kept as a tombstone, not deleted, so neither a 0.4.6
   reader (who would think it deferred) nor a 0.4.7 reader (who would think it pending) skips or
   redoes it. ⚠ The shipped third-option LABEL is **"Both"**, not "Icon and text" — see FR-41-12's
   STATUS note. ⛔ The magnetic-pull trio is still explicitly NOT mirrored onto the close button.
2. **`sgs_typography_css_rule()` still has no hover branch — and as of 0.4.2 `sgs/nav-menu` is the
   flag's FIRST adopter, paying that cost block-privately.** Re-verified for this revision: the
   helper reads the base properties only, its sole `:hover` emission belongs to
   `sgs_link_colour_css()`, and `showHover` had zero adopters tree-wide before this block. So the
   shared component ships a control set no block can use without writing its own PHP emitter first —
   a real gap in the framework, not in this spec — and FR-41-21 writes that emitter here rather than
   touching the shared helper (design-gated, callers across most of the block library). ⚠ **This
   tension is now LIVE rather than hypothetical**: there is a block-private emitter in the tree that
   duplicates three of the helper's own allowlists. Extending the helper to own the trio is the
   better long-term answer and would benefit every future adopter, and the day a SECOND block wants
   `showHover` is the day to take it rather than duplicate the emitter again.
3. **(0.4.0) No submenu-LINK padding attribute exists.** §9.8's Submenu — Items panel has a named
   empty slot for it rather than a fabricated attribute — `submenuPadding` is the PANEL's own
   inner spacing (§9.9), not a per-link control. If an operator ever asks for tighter/looser
   per-link spacing independent of the panel's padding, that is new scope, not something this
   spec silently invented or silently dropped.
4. **(0.4.0) The hover-treatment selector (FR-41-23/24) is deliberately block-private.** Promote
   it to a shared `plugins/sgs-blocks/src/components/primitives` export the day a SECOND block wants the same
   None/Swap/Sweep-or-Highlight pairing — not before. Building the generic version now would be
   designing an abstraction from a sample size of one, the exact trap FR-41-2 already named once
   in this same spec.
5. **(0.4.1) `SgsColourPanel.js`'s three documented exemptions now have a named block-scoped
   exception.** FR-41-33 moves border colour into the panel for `sgs/nav-menu` only. The general
   rule is unchanged and no other block moves — but if a second block ever takes the same
   exception, the exemption list itself should be re-litigated rather than accumulating one-offs.
   Flagged, not acted on.
6. **(0.4.1) The default non-colour Hover signal is now conditional on the operator setting a
    border width.** FR-41-17a(a) records this as an accepted residual. If it turns out in practice
    that clients routinely ship border-less menus with two similar state colours, the honest fix is
    a warn-only inspector notice, not a re-defaulted border — an owner call, not a silent change.
7. **(0.4.4) Every defect closed in this revision lives in a mechanism 0.4.3 introduced.** Not a
    tension in the design — a tension in the PROCESS, recorded because it will recur: a
    defect-closure pass writes new mechanisms under time pressure, and those arrive unreviewed
    while the pass itself reads as complete. Two of the four were bounded-search failures (a rule
    told to live where one of its two readers cannot reach; a census scoped to a line range), which
    is the same root as this project's own `a-gates-scope-is-not-the-defects-scope` lesson. Worth
    considering whether a fix pass should carry a standing "re-review what THIS pass added" step
    rather than relying on the next council to find it. An owner call on process, not on spec.
    ⚠ **It recurred in the BUILD, not just in a revision, and the new instance is worth naming:**
    FR-41-15 census #9's `border-radius` row said "NO CHANGE — attribute-driven, writer verified:
    emitted from `submenuRadius`" while §8.3 of the same spec DELETED `submenuRadius`. The row was
    true when written and was falsified by a decision elsewhere in the same document, with nothing
    re-checking a row marked NO CHANGE. It was caught during execution, not by a gate.

8. ~~⚠ **(2026-09-11, LIVE AND UNRESOLVED — the one genuinely open DESIGN question left) The
    sublink marker colour row's state model.** It is BUILT Normal-only, exactly as FR-41-30(b)
    specifies; the owner's newer direction gives it full Hover and Current states plus a gradient
    toggle, **with the colour picker hidden by default** (silently inheriting the sublink text's own
    colour) and revealed only once an operator has actually overridden it with a custom value. ⛔
    **Neither design is settled and neither may be deleted from this spec**: the original
    Normal-only reasoning is a real argument and is what the shipped code implements, and the new
    direction supersedes it only once built. Three sub-questions are undesigned — what "has
    overridden it" means as a stored state (an empty string is currently indistinguishable from
    "never touched"), how a progressively-revealed picker is expressed inside `SgsColourPanel`'s row
    contract, and whether the reveal affordance needs a FOURTH additive row key (which would be
    another design-gated shared-component change, project rule 7). Full detail and the
    do-not-resolve-either-way rule: FR-41-30(b)'s ⚠ OPEN note. **Owner call required before
    anything is built.**~~
    ✅ **RESOLVED 2026-09-11 (owner ruled the same day).** The reveal trigger is **the icon choice**
    (`sublinkMarkerIcon` non-default), **not** the colour value — closing sub-question (a) outright.
    Once revealed, the row gets the full 2-state+gradient treatment matching `sgs/button`'s
    icon-colour control (already-built `sgs_icon_gradient_css()` dual-render path, reused not
    rebuilt) — closing sub-question (b)'s shape question in outline, though the exact
    `SgsColourPanel` row-descriptor key is still TBD at build time. It needs **one new additive row
    key**, not a fourth-key explosion and not a `fillRow3`/`textRow3` fork — closing sub-question
    (c). Full mechanism recorded at FR-41-30(b)'s **new** ✅ RESOLVED block (immediately below its
    ⚠ OPEN note, which stays as history). Build itself is still pending — this closes the DESIGN
    question only. Confirmed buildable by the 2026-09-11 adversarial council (§0a.4).

9. ✅ **(2026-09-11, CLOSED — kept so it is not re-opened) The hardcoded-rule census had no
    detector.** Retired §12 item 13 recorded that FR-41-15's census was found incomplete on three
    consecutive reviews with nothing but review defending it.
    **`plugins/sgs-blocks/scripts/check-ungated-paint-rules.py` is BUILT** (FR-41-35), and the
    census itself is **fully EXECUTED** (FR-41-15's STATUS note). ⚠ **What is still open is the
    ENFORCEMENT flip, not the detector** — it ships WARN-ONLY until G20c(f)'s step runs, so until
    then the census is still defended by review. ⛔ Do not read "the detector exists" as "the gate
    is enforcing"; that is the dead-detector shape this project has shipped before (D338/D493).

---

## Revision history

**0.4.8 (2026-09-11)** — twelfth revision, a **same-day owner decision pass** recording three
finalised design decisions on top of the mid-build accuracy pass below. `spec_version` bumps because
this pass adds a genuinely new FR and resolves a live open question, unlike the accuracy pass (which
deliberately did not bump).

1. **FR-41-30(b)'s open note is RESOLVED.** The owner ruled: the sublink-marker colour picker stays
   hidden until the operator picks a non-default `sublinkMarkerIcon`, not until a colour value is
   set; once revealed it gets `sgs/button`'s existing 2-state+gradient icon-colour treatment; one new
   additive `SgsColourPanel` row-descriptor key is needed, not a `fillRow3`/`textRow3` fork. Recorded
   as a new ✅ RESOLVED block directly beneath FR-41-30(b)'s ⚠ OPEN note (kept as history, not
   deleted), with pointer updates at §12 item 8, §0a.3, and the three table rows that referenced the
   OPEN state (the hover-treatment-selector table, §9.6, §9.8).
2. **NEW §0a.4 — adversarial council review (2026-09-11), verdict GO conditional.** Five personas
   (design-systems architect B+, accessibility C-, Gutenberg internals B+, maintainability/blast-radius
   A-, CSS-pattern cynic B-). Two conditions before real-client deploy: (a) the submenu panel's
   `box-shadow` is clipped invisible by `.sgs-nav-menu__submenu-wrap`'s `overflow-y:auto` — not yet
   fixed; (b) the suspected parallel `fillRow3`/`textRow3`/`borderRow3` builder approach was checked
   and does NOT exist — FR-41-2(a)'s additive extension is confirmed correct, no action needed. Also
   confirmed accurate with no fixes needed: all three `colourExemptions` entries, the `hideExtensions`
   claim, and the §12 "border-row-helper" tension (already resolved, no `borderRow.js`, none should be
   built). FR-41-13 reconfirmed genuinely unbuilt, already correctly scheduled as a Wave C item — no
   plan change.
3. **NEW FR-41-36 — locked default colour scheme for item/submenu/drawer states.** Design-council-
   researched, owner-approved. Pins the actual default token values (`primary`/`accent`/`surface`/
   `surface-alt`/`border-light` family) across top bar, desktop submenu, drawer top-level and drawer
   nested submenu, states Normal/Hover/Current. Records the "top bar + drawer nested submenu" /
   "desktop submenu + drawer top-level" matched-pair structural principle, corrects an earlier
   working assumption that drawers default to a brand-coloured fill (checked against Kadence/Astra/
   GeneratePress/Divi — none do), and states the universal item-divider colour rule. Design decision
   only — not yet built. Placed after FR-41-1 as the natural home for the block's colour-model
   defaults.

**MID-BUILD ACCURACY PASS (2026-09-11) — ⛔ deliberately NOT a version bump.** `spec_version` stays
at **0.4.7**. This pass introduces no new FR, reverses no decision, renumbers nothing and changes no
requirement — it corrects places where the spec's prose had gone stale against the code the build had
already shipped, so a fresh reader can tell BUILT from PLANNED. **The `spec_version` decision belongs
to the phase's own Step 27 (living-docs update), which is scoped to take it.**

What changed, each verified against the real files before it was written (this FR set has a
documented history of exactly the opposite — three prior correction passes recorded in FR-41-15's own
history table):

- **NEW §0a — build status.** Names what is built vs written-but-unbuilt, each with the command that
  proves it, and single-sources step-level status to the phase plan rather than caching a count here.
  Its load-bearing half is §0a.1: ⛔ **`render.php` is now SIX PHP files, not one and not the four
  the plan named** — so a scan of `render.php` alone now reports a clean tree, which is FR-41-15's
  own bounded-search failure in a fourth costume.
- **FR-41-15 — STATUS: EXECUTED.** All 11 dispositions (6 DELETE / 3 CONVERT / 2 KEEP) plus the two
  current-page CONVERTs are applied; a per-rule table names where each survivor now lives. The
  requirement text is kept, not replaced.
- **FR-41-15 census #9 — one fate row was outright FALSE and is corrected.** The `border-radius` row
  read *"NO CHANGE … emitted from `submenuRadius`"* while §8.3 of the same spec DELETED
  `submenuRadius`; the declaration was dead-but-firing. As built it CONVERTS, reading
  `submenuBorderRadius` through `sgs_corner_object_shorthand()`. The background, border and
  box-shadow rows are corrected to the shapes actually emitted.
- **FR-41-2(a) — the premise moved.** nav-menu no longer writes only inline literal rows: `fillRow`
  / `textRow` were additively extended with `current` / `currentGradient` and are now the adopted
  mechanism, with exactly two rows still hand-written and both reasons named.
- **FR-41-16 / FR-41-24 — a real PLAN GAP, disclosed.** `heading` alone could not satisfy
  FR-41-24's "directly beneath the Hover swatch"; `SgsColourPanel` had no post-control slot at all.
  Closed by two further additive row keys, `after` and `contrastLargeText`, with `after` named as the
  ONLY sanctioned mount point for the treatment selector.
- **FR-41-10 — built end to end**, with the control → validation → modifier-class → keyframes chain
  named, and the "CSS `animation`, not `transition`" and "collapse the duration, don't remove it"
  constraints stated so neither is simplified away.
- **FR-41-12 / §9.3 — the shipped third-option LABEL is "Both", not "Icon and text"**, on BOTH
  blocks, under Spec 35 Part O's 12-character bound (D812). The stored value stays `icon-and-text`.
  The close-side mirror is marked BUILT.
- **FR-41-30(b) / §9.6 / §9.8 / §12 item 8 — ⚠ OPEN, not resolved.** The marker colour row is built
  Normal-only; the owner's 2026-09-11 direction (full Hover/Current + gradient, picker hidden until
  overridden) supersedes that and is not built. ⛔ Both the original reasoning and the new direction
  are kept visible; neither is silently adopted.
- **§8.5 item 2 / §8.4 — superseded as built.** The submenu PANEL background DOES now carry a
  Normal-state gradient (`submenuBgGradient`), required by the shared
  `sgs_custom_property_gradient_decls()` end shape. The Normal-ONLY half of the boundary still binds.
- **FR-41-22(b) — where the block-private hover emitter actually lives**, and why its two
  cross-module callers are safe.
- **§12 — item 1 closed (built), item 7 extended with the census-#9 recurrence, item 8 added (the
  live open question), item 9 added (detector built, enforcement flip still open).**

**0.4.7 (2026-09-11)** — eleventh revision. A **build-plan ruling pass**: the owner ruled on all
seven Key Judgement Calls raised by the phase plan
(`.claude/plans/phase-nav-menu-colour-state.md`), and two of the seven change what THIS spec says.
Nothing else in the body is touched, nothing is renumbered, and no 0.4.0–0.4.6 design decision is
reopened. The other five rulings live in the plan alone because they are execution decisions
(detector enforcement scope, migration-test method, lane parallelism, file-splitting criteria) or
because the spec was already correct and only the plan was ambiguous (FR-41-21's emitter placement —
the spec's literal wording *"a file-local function in this block's own `render.php`, not an addition
to `plugins/sgs-blocks/includes/`"* was confirmed as the intended reading, so no spec edit was needed).

**(1) FR-41-8's sweep suppression is rewritten to describe an API that exists.** ⛔ The 0.4.6 wording
— *"`sgs_border_states_css()` receives a `$map` whose `hover` (and `current`) keys are UNSET for the
`bottom` edge"* — **could not be executed and is retired.** Verified against the real file
(`grep -n "function sgs_border_states_css" -A 60 plugins/sgs-blocks/includes/helpers-colour-variants.php`):
the signature is `sgs_border_states_css( string $selector, array $attributes, array $map )` with **no
edge parameter and no per-edge branch**; it resolves one normal paint and one hover paint and emits a
single flat `border-color:` covering all four sides. The helper was edge-blind by construction, so
the instruction named a capability that did not exist — an executor reaching it stopped dead or
invented something. **The mechanism is now an ADDITIVE optional `$map['suppress_edges']`** in the
box-object `{top, right, bottom, left}` shape the project already uses for `itemBorderWidth` (§8.4):
when any edge is suppressed the non-resting rules emit per-edge `border-<edge>-color` longhands for
the unsuppressed edges only; when none is, the flat shorthand is emitted exactly as today; the
resting rule is never touched; and the gradient/ring path ignores the key silently, because
`sgs_border_gradient_css()` takes exactly two paints and has no per-edge concept. **§11 G1(c) is
extended** to prove zero blast radius — every caller whose `$map` carries neither a `current` key nor
a `suppress_edges` key emits byte-identical CSS, *including* the flat shorthand. ⚠ The rejected
alternative is recorded in FR-41-8 with its reason: a block-private `border-bottom-color` override
would have been a second mechanism painting border colour on one selector, i.e. two overlapping fixes
that are unfalsifiable and therefore never safely deletable. Per-edge awareness is a real gap in the
shared painter — border *width* has had the box-object concept for some time and border *colour*
never did — and FR-41-2/FR-41-3 already resolved the identical shape of finding the same way, with an
additive optional parameter rather than a new sibling function.

**(2) FR-41-12's close side moves from "future work" to IN SCOPE.** ⚑ 0.4.1–0.4.6 recorded
`sgs/nav-drawer`'s close-button gaps as a cross-block companion for "that block's own track"; the
owner has ruled them **into this phase**, built immediately after the Menu Button work by mirroring
it. `closeLabel` and `closeIcon` are added, and `closeStyle` gains a fourth value. **§12 item 1 is
struck through and kept as a tombstone** so a 0.4.6 reader does not conclude the work is still
deferred and skip it. ⛔ **One 0.4.6 assertion is WITHDRAWN, and the reason is the substantive finding
of this half:** *"its mode choice is adequately covered and needs no new enum"* was wrong, because
`closeStyle` **conflates two orthogonal axes**. `separate-x` and `text-swap` are the icon/text display
axis, but `burger-morph` is a **glyph choice** — a CSS-drawn two-bar span with no icon and no text —
so a one-to-one rename onto `triggerMode`'s three values would have silently deleted a shipped look.
The resolution is additive: keep all three values, add `icon-and-text` to the existing JSON enum AND
to `plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$sgs_nd_allowed_close_styles` in the same commit, because a value accepted by one
side and rejected by the other coerces to the default with no error on either. ⚠ Also recorded: the
close button's 2-state colour pairing (`toggleCloseColour` / `…Hover` / `…Gradient`) **already exists
and must not be rebuilt** — the gap was never colour — and the magnetic-pull trio is explicitly NOT
mirrored onto a close control inside an open modal. ⚠ `sgs/nav-drawer` is outside this spec's §11 gate
set, so the close-button work's acceptance conditions live in the build plan's own step rather than
as a new G-number; FR-41-12 names them.

**One further gate extension, and it belongs to ruling (4) rather than to either spec change above:**
**§11 G20c gains (f)**, separating the ungated-paint detector's *logic* scope (framework-wide and
generic — unchanged, still asserted by (d)) from its *enforcement* scope (hard-fail on `sgs/nav-menu`
alone for this build, warn-and-pass elsewhere), with a negative control in both directions and the
scope list held in `gates.json` config rather than a dict inside the script (R-31-1). Framework-wide
hardening is explicitly separate future work.

**0.4.6 (2026-09-11)** — tenth revision. A **decision-closure pass**, and the first since 0.4.1 to
add FR IDs. The owner ruled on the four remaining §12 open items; all four are folded into the body
as settled requirements rather than carried as questions. Two further §12 items were stale-doc
errors and were corrected at source the same day, so they leave the list too. **§12 goes from 13
items to 7.** No 0.4.0–0.4.5 design decision is reopened and nothing is renumbered.

**The ruling whose premise did not survive verification — and this is the substantive finding of the
pass.** The owner's call on the responsive font-size tiers was "backfill them in this build",
premised on `itemFontSizeTablet` / `itemFontSizeMobile` being named by `typographyAttrKeys( 'item' )`
but undeclared, and therefore silently inert. That premise was checked against the live files rather
than implemented on trust, and **it is false in every one of its four parts.** `block.json` declares
`itemFontSize` as `{"type":"object","default":{}}` — a migrated TIER OBJECT.
`TypographyControls.js` computes `fontSizeIsTiered` via `isTieredValue()`, which is true for any
non-null non-array object, so the tiered `<ResponsiveOverride>` branch renders and writes the whole
tier object to ONE attribute. `sgs_typography_css_rule()` branches the same way and reads
`FontSizeTablet` / `FontSizeMobile` only in its `else` arm. The mount passes no
`showResponsive={ false }`. **So the tablet and mobile tiers already persist and render end to end,
and declaring the two flat keys would have created two attributes with zero writers and zero readers
— new dead-attribute debt added by a fix whose justification was removing dead capability.** The
ruling's INTENT is adopted in full: the tiers must PROVABLY persist and render, which nothing had
ever asserted. That becomes **gate G20** (both prefixes; persist, render, and a negative control;
plus an explicit assertion that no `itemFontSizeTablet` attribute exists, so a future "backfill"
fails the gate). §8.4a carries the four-row verification table. Same discipline as 0.4.4's refused
premise-flip: verify, keep the intent, correct the mechanism, write down which was which.

Two live defects fell out of that check and are fixed in the same pass. **FR-41-22(a) was authoring
the NEW submenu family in the LEGACY flat shape** — it listed `submenuFontSizeTablet` /
`submenuFontSizeMobile`, which would have been born pre-migration debt for `migrate-tier-object.py`
to undo; the family now mirrors the item family's tier-object shapes exactly. And **FR-41-22's
`item`-family paragraph asserted the incompleteness that §8.4a disproves**; it now states the
correction and points at the table. `itemLineHeight` is named as the one genuinely un-tiered member
— a MISSING capability, not a silent discard, and the codemod's job, not this spec's.

**The radius: 8px stays, and the byte-identity gate had to change with it.** Verified that the
behaviour comes from two independent sources today — `itemRadius` declares `"default": 8` AND
`render.php` applies `: 8` as its `isset()` fallback — so an item with a background renders
8px-rounded, and an `{}` default would have changed that silently in the one case where the radius
is visible. `itemBorderRadius` now defaults to 8px on all four corners. **The shape mattered as much
as the value:** a census of every `borderRadius` attribute found 57 carrying `{"desktop":{}}` — all
of them BLOCK-ROOT radii read by `sgs_border_radius_tiers()` — while the correct precedent for a
PER-ELEMENT radius is `sgs/product-card`'s `ctaBorderRadius`, a flat corner object of CSS length
strings read by `sgs_corner_object_shorthand()`. Reaching for the 57-strong shape would have
produced a tier envelope with no corner keys, and the radius would have vanished silently rather
than erroring. **G13 gains a fourth scenario** asserting 8px-rounded output, on the COMPUTED value
rather than the emitted text (the two builds legitimately emit different source for the same painted
result), plus the negative that an unstyled item still gets no radius rule at all.

**FR-41-34 — the migration notice, built.** G5a has required since 0.4.4 that a migration visibly
changing an operator's colour tells them; 0.4.4 could not name the mechanism because none existed.
It is now specified end to end: a `_sgs_nav_menu_migration_notice` post meta registered on `post`
and `page`, written only on the G5a path and only per key that actually changed, read once by a
dismissible `Notice` in the default `InspectorControls` group, whose dismissal clears the record.
Every part is anchored to a verified precedent or disclosed as new. **The component precedent is
inside this block's own `edit.js`** — of 59 `<Notice>` mounts across `src/`, 58 are
`isDismissible={ false }` and the single `true` is `sgs/nav-menu`'s own link-count advisory, so the
mount is copied exactly. **The registration is new**: the plugin has a proven, REST-exposed,
`useEntityProp`-reachable post-meta mechanism, but every existing `_sgs_*` key sits on
`sgs_product` / `product_variation` / `product` and none on `post` or `page`; the schema-rich
`show_in_rest` form and the per-object `current_user_can( 'edit_post', $post_id )` IDOR guard are
taken from that precedent rather than invented. **And the persistence half is disclosed as having no
precedent at all** — no `<Notice>` in the plugin carries an `onRemove` of any kind, and the one
dismissible notice persists nothing, so an implementation that merely copies it would pass every
assertion except the one that matters. Gate **G20b** asserts the notice appears on a real change and
does NOT appear in three separate no-change cases, including a fresh block that was never migrated —
which is not redundant, because an implementation reading absent meta as truthy fails only there.

**FR-41-35 — the detector, built, and FRAMEWORK-WIDE.** Retired §12 item 13 recorded that
FR-41-15's census was found incomplete on three consecutive reviews and that nothing but review
defended it. **Scope decision, stated plainly as the ruling required: framework-wide, not
nav-menu-only** — FR-41-15's corrected methodology contains nothing nav-menu-specific (join each
`$css .=` / hover-helper statement to its `;`, test for a `background`/`border` declaration, scan
`style.css` too, classify against the block's own `plugins/sgs-blocks/src/blocks/<slug>/block.json::attributes`), so a block-scoped build
would be the same script with one path hardcoded, which is how a gate becomes a lint.
`check-ungated-paint-rules.py` — `check-*` because it is gate-first, Python because the load-bearing
half is PHP statement structure and that is where every PHP-semantics detector in this tree lives.
**It deliberately does not extend `check-hardcoded-render-defaults.js`**: that gate runs the inverse
direction, and its F3b arm keys on a `block.json` default flattening a theme.json element property —
none of census #4, #6 or #8 has an attribute on its own selector, so all three pass it clean, which
is exactly why a new detector is needed. `--self-test` uses those three as negative controls in both
directions. **The exemption set is named as the real portability hazard**, keyed on selector shape
and `supports.sgs` rather than block names, with the `var()`-without-a-writer case called out
(census #8's `--sgs-nm-featured-bg-hover` has no writer anywhere in `src/`, so a syntax-only
exemption would have cleared a hardcode in a costume) and D649's string-coincidence history cited as
precedent for how this family of widening goes wrong. Gate **G20c** asserts it exits 0, that its
self-test can still fail, that `npm run gate:list` shows it wired (a `package.json` grep is a false
positive since the gates.json split), and that its source contains **no `sgs-nav-menu` literal** —
which makes the scope decision itself checkable.

**Two stale-doc items leave §12 because they were fixed at source, not because they were dropped.**
`plugins/sgs-blocks/CLAUDE.md`'s `sgs/business-info` line now states that the colour sweep and the
underline-grow ship TOGETHER, and `ShadowControl.js`'s docblock now states that the control renders
its own colour picker inside `ShadowStateBuilder` with only the ATTRIBUTE externalised. Both matter
beyond tidiness: the first is the precedent FR-41-26 adopts, the second is the precedent FR-41-33
cites, and the stale wording made the second look stronger than it is. §12's preamble extends from
three corrected-at-source items to five.

**0.4.5 (2026-09-11)** — ninth revision. A **third defect-closure pass**, and it is entirely
FR-41-15's hardcoded-rule census. No new FR IDs, nothing renumbered, no 0.4.0–0.4.4 design decision
reopened. The census has now been found incomplete on three consecutive reviews (0.4.3: +3 rules;
0.4.4: +1; 0.4.5: +4 and a second file), so this pass did **not** patch in the reported rows —
**it re-derived the whole census from zero with a stronger method and published that method's
output.**

**Why it kept failing, named at last: the tool, not the diligence.** 0.4.4's own published command
is `grep -nE '\$css \.=' … | grep -E 'background|border'` — both halves match a single physical
line. Two of the rules it missed are **multi-line PHP concatenations whose `background:` sits on a
different line from its `$css .=`** (one with a `//` comment in between). That grep could not have
found them on any number of re-runs. 0.4.5 replaces it with a **statement-aware scan** that joins
each emission to its terminating `;` before testing, and runs it over **both** of the block's CSS
surfaces.

**Four new censused rules, one promoted, one formatting break, all verified in the real files.**

*Two more hardcoded rules in `render.php`, both on the featured sub-item (census #7, #8).* #8 is the
**third instance of the exact defect signature** already fixed twice (#4, #6): unconditional,
ungated, `background` SHORTHAND, `:hover`, emitted through `sgs_hover_guarded_rule()`,
`$uid_sel`-scoped so it fires in both forks — it destroys Sweep on featured sub-items the same way.
It is worse than its two siblings in one respect: **`--sgs-nm-featured-bg-hover` and
`--sgs-nm-featured-colour-hover` have no writer anywhere in `plugins/sgs-blocks/src/`** (grepped;
only these two consuming references exist), so the rule can only ever paint its own hardcoded
`primary-dark` fallback — the same dead-but-firing shape already caught at
`--sgs-nm-submenu-current-colour`. Fate DELETE. #7, the resting featured rule, is **CONVERT, decided
by checking rather than guessing**: the featured attribute family (`featuredBg` / `featuredBgGradient`
/ `featuredColour` / `featuredRadius` / `featuredWeight`) is real and already drives the rule through
republished custom properties, so the `var()` half stays — what goes is the ungated
`var(--wp--preset--color--primary, transparent)` fallback that paints a `primary` pill on every
untouched nav, plus the shorthand, which becomes `background-color`. Its knock-on for Sweep
eligibility is resolved in FR-41-26 by scoping the sublink sweep selector to exclude featured
sub-items — the narrow fix, rather than withdrawing Sweep from every sub-item whenever a featured
pill exists.

*The census only ever searched `render.php`, while claiming whole-block coverage (census #10, #11).*
`style.css` is a genuinely separate surface — enqueued as an ordinary stylesheet, never passing
through PHP, which is why this project's own tooling needs a build-time transform there in addition
to the PHP hover helpers. It carries `.sgs-nav-menu__item--drawer + .sgs-nav-menu__item--drawer {
border-top: … }`, a **static twin of census #3**: deleting #3 alone would have left FR-41-7's
double-line bug fully intact through a fix that read as complete. Both now DELETE. A second static
hit, the drill-down Back row's `border-bottom`, is KEPT and said so — structural chrome the item
border never reaches, the same classification census #2 carries. **The scope statement is now a
checkable claim** ("checked render.php 2,031 lines and style.css 427 lines, in full, with these two
commands, N hits, all published") rather than a coverage adjective.

*The bar's own panel rule is promoted into the numbered census (#9).* Its `background` half appeared
nowhere in the numbered table, which read as an accounting gap. It is not a defect — `--sgs-nm-submenu-bg`
has a real empty-guarded writer from `submenuBg` — but "correct and unlisted" is
indistinguishable from "missed", so all five of its declarations now carry an explicit per-declaration
fate (three NO CHANGE / attribute-driven, two CONVERT).

*A markdown break that made the table shorter than it was.* 0.4.4's census-#6 fate row was appended
**after a blank line**, detaching it from its own table and rendering it as plain text. Merged back;
the fate table is now one contiguous block of pipe rows.

**Dismissals are now published, which is the structural half of the fix.** Every scan hit lands in
one of three tables — CENSUSED (11), GATED (7, each with its `if` named), DISMISSED (7, each with
its reason *and the condition that would return it to the census*). The two button resets
(`.sgs-nav-menu__mega-trigger`, `.sgs-nav-menu__subtoggle`) are dismissed in writing rather than
silently skipped: they reset to `none`/`0` so there is no competing value for an operator colour to
collide with — with the falsifiable caveat that both use the `background` SHORTHAND, so either
enters the census the day a Sweep-bearing colour row targets it. Previously every dismissal was
implicit, which is precisely why the same file was re-read three times to answer "missing, or
deliberately excluded?"

**Final count: 11 censused rules — 6 DELETE, 3 CONVERT, 2 KEEP.** §12 gains item 13: three
consecutive incomplete censuses is a defect *class*, no existing gate covers it (F3b keys on
attribute-backed properties; #4/#6/#8 have none on their own selectors), and the structural answer
is a survey/check/self-test detector with those three rules as its negative controls — recorded as
an owner call rather than closed with a fourth "the census is now complete" sentence.

**0.4.4 (2026-09-11)** — eighth revision. A **second defect-closure pass**, on a
technical-correctness review of 0.4.3 against the real codebase: 6 must-fix, 5 should-fix and 3
missing items, all closed. No new FR IDs, nothing renumbered, and no 0.4.0–0.4.3 design decision
reopened. **Every finding was re-verified against the real files before its fix was written** —
`render.php`, `style.css`, `block.json`, `SgsBorderControl.js`, `plugins/sgs-blocks/assets/css/fx-magnet.css`,
`theme.json`. **Notably, every defect closed here lives in a mechanism 0.4.3 itself introduced**,
which is the pattern worth naming: a fix pass writes new mechanisms, and new mechanisms arrive
unreviewed.

**The one premise that did not survive verification.** The review argued that G5a's migration
precedence should FLIP — migrate `indicatorColour` into `itemBgHover` even when `itemBgHover`
already holds a value — on the grounds that FR-41-14 has `render.php` skipping the per-item hover
background while the pill is active, so the stored `itemBgHover` "was not actually painted". Read
against the code, that is false: `indicatorStyle` gates exactly two things today — the bar's
`data-sgs-nav-indicator` attribute and the indicator's own fill rule — and **there is no per-item
background suppression anywhere in `render.php`.** FR-41-14's skip is work this spec BUILDS, not
behaviour it describes. Pre-migration, both colours painted and both were visible. So the flip was
refused and the existing precedence kept — but its *justification* was doing two jobs and only one
was sound, so it is restated on the honest one: **never silently overwrite operator-stored data,
including data that was not rendering.** And because the pill visibly changes colour either way,
0.4.4 adds what was actually missing — the change must be **surfaced to the operator in an editor
notice**, not logged where nobody reads it. FR-41-14 now carries an explicit ⛔ marking its
suppression as prospective, so the next reader cannot make the same inference.

**Six must-fix.** *The predicate could not be written once.* 0.4.3 banned two independent copies of
the Sweep-eligibility rule and named PHP as its single home — but the other evaluator is the React
inspector, which cannot call PHP, so a builder had no compliant path and would have written the
second copy anyway. The requirement is restated in the only shape that holds: **one DECLARATIVE
source, two mechanical readers.** A three-row table at
`plugins/sgs-blocks/src/blocks/nav-menu/block.json::supports.sgs.sweepEligibility` (blocking background attrs / blocking gradient attrs /
glyph guard), read by `edit.js` via the manifest import it already makes and by `render.php` via
`WP_Block_Type_Registry`. Both paths verified live in the tree; no new artefact, because a second
file is the thing that drifts. *Condition 1 said "in ANY state" and listed only resting
backgrounds.* Two real hover-state backgrounds fell straight through: `burgerHoverColour`, which
emits a real `background-color` on the swept button, and `submenuLinkBgHover`/`…Current`, which are
equally blocking on a 3-state fill family. Every row's list now covers every state. *A sixth
unconditional hover-background rule was missed* — on the SUBLINK, bar-scoped so it fires in both
forks, the same `background:` shorthand shape as the drawer rule 0.4.3 had just fixed. It was
missed because the census was re-derived with a **line-range** grep around the drawer block; the
methodology is now scoped to the **defect shape across the whole file** (any `$css .=` or hover-helper
emission carrying an ungated `background`/`border`), because a line-bounded search reports its own
bound as the answer. *The item-text row's "Sweep always passes" rested on nothing.* FR-41-4 item 6
covers the RESTING fill only; the Hover fill today paints directly on the link inside the branch
FR-41-4 deletes, with no successor named. A new normative rule in FR-41-23 puts **all three** item
background fills on `{link}::before`, and the eligibility table's citation is repointed to it.
*The pill migration shipped an invisible Highlight in the commonest real case.* `indicatorColour`
defaults to `""`, but `style.css` paints `var(--wp--preset--color--accent, currentColor)` — so a
client who switched Pill on and never opened the picker is looking at an accent pill right now, and
carrying an empty value across left them with no fill at all. G5a now writes `itemBgHover: 'accent'`
when both sources are empty (`accent` verified as a real palette slug), logs the case, and logs an
unresolved-slug case honestly rather than writing a dead slug.

**Five should-fix.** The sweep-plus-decoration rule now keys on the **resolved** treatment, not the
stored value, so it cannot fire on a row that fell back to `'swap'`. The `@supports not (color-mix)`
burger hover fallback is named as an explicit narrow exception to condition 1, with both reasons it
is not gated — longhand, and no attribute to read — rather than left silently uncovered. The census
table's row 1 quotes the real declaration including `min-width:0`, because a census table that does
not match a grep cannot be falsified, which is its only job. `SgsBorderControl`'s
`showColour={ false }` carries a documented **ten-prop ignore-list**, with `contrastAgainst` /
`contrastLabel` / `contrastLargeText` flagged as the dangerous ones — a contrast check present in
source and absent at runtime reads as covered when it is not. And `--sgs-magnet-transition` is
noted as inheriting to descendants, with the correct alternative (key on the non-inheriting
attribute) named so nobody adds reset declarations down the tree.

**Three missing items added.** G14 gains **(g)**, the direct proof of the one-declared-source rule:
on ONE stored straddling state, assert the UI omits `Sweep` **and** the rendered CSS omits the clip
declarations — both halves in one check on one fixture, plus a positive control on an unblocked
fixture, because two checks on two fixtures can both pass while the surfaces disagree on every real
page. The render-time fallback's behaviour with an **empty** Hover swatch is now stated — nothing is
emitted, the Normal colour stands, no colour is invented (that would be a hardcoded render default
the operator cannot clear) — and recorded as accepted residual **FR-41-17a(d)**, alongside the new
`color-mix` residual **(c)**. And both newly-found unconditional rules are in the running census
with named fates, so "none left standing" is now a whole-file claim proven by a whole-file search.
G14(f) also gains the two newly-covered attribute paths, G14(e) a resolved-value negative control,
G13 the unset-source equivalence scenario, and G12 a name-by-name check of the new manifest table
(a misspelt entry there reads as permanently empty, so the predicate always passes and the
eligibility rule silently ceases to exist).

**0.4.3 (2026-09-11)** — seventh revision. A **defect-closure pass** on a focused adversarial
council against 0.4.2: 14 findings, all fixed. No new FR IDs, nothing renumbered, and no 0.4.0–0.4.2
design decision reopened. Every claim the council made about existing code was re-verified against
the real files before the fix was written — **two of its premises turned out partly wrong and are
corrected below rather than implemented as stated.**

**Two fatal gaps closed.**

*The Sweep eligibility predicate existed only in the inspector.* 0.4.1 built one rule covering all
three text/icon rows and had the row builder omit the `Sweep` segment when it failed — but nothing
said `render.php` re-checks it before honouring a value already in the database. Because the
predicate's inputs are OTHER attributes, an operator reaches the broken state through legal
single-step edits that never touch the treatment: choose Sweep on an unstyled submenu link, then set
a link background, and the segment disappears while the stored `'sweep'` keeps emitting
`background-clip: text` — their brand-new background clipped down to the shape of the letters. Two
more paths do the same via `burgerBg` and via `triggerMode` reverting to `'icon'`, the latter
rendering an empty button. FR-41-26 now states that the identical predicate is evaluated in
`render.php` and that a false predicate falls back to `'swap'` **regardless of the stored value** —
the emission is gated, the stored choice is kept (clearing it would discard a preference that
becomes valid again the moment the blocker is removed). Written once, in PHP, answered by both
surfaces. Gated as G14(f), which asserts the ABSENCE of the clip declarations in rendered CSS,
because a check performed in the editor cannot see this defect at all.

*A live hardcoded drawer rule was missing from the census and breaks Sweep outright.*
`render.php`'s drawer block emits `background: color-mix(in srgb, currentColor 12%, transparent)` on
`.sgs-nav-menu__link:hover` and `.sgs-nav-menu__sublink:hover` — absent from FR-41-15's four-rule
table, which nonetheless closed with "none left standing". It is the `background` SHORTHAND at
higher specificity than the sweep's own rule, so it resets `background-image` to `none` while
`-webkit-text-fill-color: transparent` still applies: the hovered word paints at roughly 12%
opacity, near-invisible, on every drawer using Sweep — and silently, since `color` still computes
correctly. **The census was re-derived by running the grep rather than re-asserting the list, and
found FIVE rules, not four** — three were missing, not one. All are now in the fate table: the hover
tint DELETE (superseded by `itemBgHover`/`submenuLinkBgHover`); the drawer's hardcoded
`border-top` item separator DELETE (it would paint a second line beneath any operator-set bottom
border — the exact double-line class this redesign exists to remove, and invisible to specificity
reasoning because the two rules sit on different elements and simply both paint); and the drawer's
`.sgs-nav-menu__submenu` override CONVERT, whose `border:0` half must stop suppressing an
operator-set `submenuBorderWidth`. FR-41-26's condition 1 is widened from "paints no background" to
"paints no background from ANY source, attribute-driven OR static/hardcoded, in ANY state" — a
hardcoded rule reached through a helper was exactly what slipped past.

**Two real, non-fatal gaps.** The restored hover-typography trio gained its missing base
attribute-to-CSS-property declarations in §8.6(a), and G4 now asserts twelve DISTINCT
`(property, element, state)` triples rather than twelve rows — the collision it guards does not
delete anything, it silently retags one attribute with the other's state, which this block's own
manifest records happening three times. ⚠ **The council said two base rows were missing; reading the
manifest showed `css:font-weight → itemFontWeight` is already declared.** Only
`css:text-transform → itemTextTransform` is a genuine addition; the font-weight row is now listed as
ALREADY-PRESENT-must-survive, because a builder reading the new hover and current `css:font-weight`
entries would otherwise conclude the base one had become redundant and drop it into a
STATE_WITHOUT_BASE finding. Separately, the reciprocal UX cross-reference FR-41-6 has demanded since
0.4.1 — that the border row's hover treatment and the hover underline are never left reading as one
control — is now **rendered in the inspector** as two `ⓘ` notes that name each other, not merely
stated in this document. Both ship or neither does.

**Eight smaller fixes.** The burger-magnet rule reads `--sgs-magnet-transition` from
`plugins/sgs-blocks/assets/css/fx-magnet.css` instead of retyping its `180ms ease-out`. That same rule sits at `(0,2,0)`
and out-ranks the shared effect's own `(0,1,0)` reduced-motion kill switch — the outcome is rescued
only by a pre-existing `transition-duration: 0.01ms !important` rule in nav-menu's stylesheet,
written for four unrelated selectors and never mentioned here; it is now named, and G9 asserts the
CAUSE rather than just the outcome. Scoping the rule in `@media not (prefers-reduced-motion: reduce)`
was refused as a second overlapping mechanism for an outcome an unremovable rule already guarantees.
FR-41-33 stops specifying a hand-rolled `SelectControl` for border style and reuses the existing
shared `BorderStyleControl` — already exported from the barrel and already mounted by both
`GradientCapableColourControl` and `DesignTokenPicker` — gated the same way its existing parent
gates it; a fresh `SelectControl` would also have reintroduced the nine-option vocabulary an owner
ruling deleted from thirteen blocks. Sweep composed with a hover text-decoration now carries the
underline to the hover colour, because `text-decoration-color` is untouched by
`-webkit-text-fill-color` and the line would otherwise stay at the resting colour while the glyphs
travelled. `burgerColourHover` (icon colour) and `burgerHoverColour` (button background) are
disambiguated in §8.1. FR-41-26's `@supports` fallback is stated as the NORMAL colour with hover on
its own rule, so unsupported browsers do not render the menu permanently hover-coloured. G5a names
the migration precedence when a client already has a real `itemBgHover`: keep it, skip the write,
per key, and log the skip. §8.4's "three trio attributes" reads as six. Two gates that did not exist
are added: the `borderStyle` write-and-emit halves on G18 (the old clause proved only editor
visibility, and a re-parented control can render perfectly while wired to nothing), and the
trio-plus-treatment combination on **G14** — chosen over G19 because G14 is already this block's
cross-mechanism-interaction gate while G19 is single-mechanism by construction.

**0.4.2 (2026-09-10)** — sixth revision. A **scoped correction to one 0.4.1 decision**, owner-ruled:
*"Keep all, just don't make underline this central control that you initially were doing and treating
it as the divider."* No new FR IDs, nothing renumbered, and nothing else from 0.4.1 revisited.

**What 0.4.1 got right, and what it got wrong.** It was right to stop treating an underline as the
block's primary hover signal — that framing is what made the border row and a decoration control read
as two implementations of one thing. It was **wrong to take two unrelated controls down with it**.
`TypographyControls`' `showHover` flag is all-or-nothing: it renders hover *decoration*, hover
*transform* and hover *weight* as one set, so refusing the framing of the first silently withdrew the
other two — and, on both targets, that was six attributes and FR-41-21's whole emitter, none of which
anyone had objected to.

**All six are restored** — `itemTextDecorationHover` / `itemTextTransformHover` /
`itemFontWeightHover` and their three `submenu` siblings — the flag is set on both `targets` entries,
and **FR-41-21's block-private PHP emitter is built** (re-verified for this revision:
`sgs_typography_css_rule()` still has no hover branch at all, and `showHover` still had zero adopters
tree-wide, so this block is the first and must emit the trio itself).

**The underline is reframed, not restored to its old job.** It is a literal
`text-decoration: underline` — it hugs the text baseline and spans only the glyphs, not the item's
width. The retired mechanism was a positioned `::after` bar that, in `render.php`'s own comment,
"spans the link box consistently" — chosen over plain `text-decoration` for exactly that reason. So
the `/research-check` finding that an underline and a border-bottom are used as ALTERNATIVES, never
stacked, was true **of the full-width bar** and does not transfer to a glyph-width baseline
decoration. Two different visual registers; they do not compete. **What does not change: the border
row's own Hover treatment (Swap/Sweep) remains the block's PRIMARY non-colour WCAG signal**, and the
trio is an optional secondary decorative layer — never presented, in this spec or in any help text, as
an alternative implementation of the divider or as required for compliance.

**Every trio attribute defaults to `""` (unset), deliberately NOT `"underline"`.** A non-empty default
would reinstate the underline as the shipped hover signal (the exact framing being removed), would
impose an underline on every menu item of every install (the imposition §10's ⛔ refuses in terms), and
would break the additive-defaults contract. The reflow caution on hover font-weight is kept as honest
operator guidance, not as a reason to omit the control.

**Surfaces updated together, so no two disagree:** §1.2 (the out-of-scope row becomes a tombstone; a
new row scopes out a CURRENT-state trio, which is genuinely not offered), FR-41-6, FR-41-21, FR-41-22,
FR-41-29, §8.1, §8.3a, §8.4 (+ the defaults rationale), §8.6(a)/(b), §9.10, the panel roster, §12 item
3 *(as numbered at 0.4.2 — that item is §12 item **2** after 0.4.6's renumber; historical number kept
so this entry still records what 0.4.2 actually touched)*, and the gates: **G5's 0.4.1 assertion was the INVERSE — that none of the six was declared — and is
retired**, replaced by a both-halves check; **new G19** proves the trio renders, emits, stays absent by
default, and rejects an out-of-allowlist value (negative control).

**0.4.1 (2026-09-10)** — fifth revision. A **harmonisation pass**, not another amendment layer: a
round-3 adversarial council's ten confirmed defects, the owner's own clarifying rule, a
`/research-check` outcome and two placement rulings were folded in TOGETHER, with every
contradiction they created against each other resolved at both ends rather than patched at one.
New work lands as FR-41-31 … FR-41-33; nothing is renumbered.

**Closed a real inconsistency the owner caught himself.** His rule — *one colour picker per element
property; the hover-treatment selector changes HOW the existing Hover swatch is applied, never adds
a second colour* — was already correctly implemented on item text (Sweep reuses `itemColourHover`),
item border (Sweep reuses `itemBorderColourHover`) and the menu-button icon (Sweep reuses
`burgerColourHover`). The item **background** row was the ONE exception: Highlight kept its own
`indicatorColour` / `indicatorColourGradient` pair. Both are now **deleted**; Highlight paints in
`itemBgHover` / `itemBgHoverGradient`, the same swatch Swap reads. The rule is stated once at §0 and
binds every row.

**Dropped the standalone underline-on-hover control entirely** (FR-41-6), after the owner's
`/research-check` confirmed the industry pattern: a `text-decoration` underline and a
border-bottom are ALTERNATIVES for one signal, never two stacked lines on one small element. The
border row's own Hover treatment now serves as the WCAG 1.4.1 non-colour signal.
`itemTextDecorationHover` / `itemTextDecorationCurrent` are withdrawn, and with them
`TypographyControls`' all-or-nothing `showHover` flag and its other five attributes — FR-41-21's
block-private emitter is no longer built. The base `itemTextDecoration` is untouched.
⚑ **This paragraph is SUPERSEDED IN PART by 0.4.2 above** — the framing change stands; the six
attribute withdrawals and the emitter retirement were reversed the same day. It is left here as the
record of what 0.4.1 did, not as live guidance.

**Split border placement on merits** (FR-41-33): width, style and radius stay in each element's own
panel via `SgsBorderControl` with a new, additive `showColour={ false }` prop (verified absent
today — it is a required small addition, not an existing capability); border COLOUR joins the
global Colour panel as an ordinary row beside fill and text. A named, block-scoped exception to
`SgsColourPanel`'s documented exemptions, taken because this block's whole design is a side-by-side
colour comparison.

**Applied the council's ten findings:** deleted the stale `borderHoverAnimation` row from §8.4;
removed FR-41-23's wrong claim that a pure-icon menu button could Sweep; unified three separate
Sweep hazards into ONE eligibility predicate at FR-41-26 (no own background, no own gradient,
must have glyphs) covering the item-text, submenu-link-text and menu-button-icon rows; made FR-41-8
omit the Hover and Current border-colour emissions on a swept edge, closing the duplicate-line bug
class this redesign exists to prevent; added the MANDATORY
`sgs_text_colour_gradient_fallback_rule()` to the text sweep; cut `itemBorderColourGradient` as a
named scope cut on a pseudo-element budget; fixed FR-41-25's invalid `...( cond && {…} )` snippet to
the ternary-to-array form; cross-referenced the relocated `itemSmartContrast` from the rows it
governs; and added `indicatorStyle` — plus the whole `indicator*` family — to the G5/G5a deletion
sweep, with a migration step so a stored pill setting is carried across rather than lost.

**Renamed the "Menu Trigger" panel to "Menu Button"** — a label change only; no attribute is
renamed. **Folded in FR-41-31**, an optional magnetic pull on that button, reusing the shared
`fx-magnet` runtime with zero new modules and a required companion `transition` rule without which
two equal-specificity transitions silently fight. **Folded in FR-41-32** as an explicit
NOT-OFFERED entry: cursor-field genuinely qualifies structurally, and is deliberately not offered
because the only current mechanism would bundle eight unrelated effects onto a functional
navigation element — revisit after the design gate at
`.claude/plans/2026-09-10-fx-selective-effect-offering-design-gate.md`.

**Three new gates** — G16 (the relocated readability toggle still acts, not just renders), G17 (the
magnet costs zero bytes when off), G18 (exactly one writer per border-colour attribute) — plus a
negative control added to G14 proving the Sweep eligibility rule actually fires, and G13's Highlight
clause restated honestly as an input-mapped equivalence rather than an impossible byte-identity.
**Two contradictions inherited from 0.4.0 were resolved rather than absorbed:** `indicatorStyle` was
listed simultaneously as untouched (§8.2) and deleted (§8.3), and the item-background row lacked
the `itemBgHoverGradient` sibling the Highlight treatment needs — now declared. Three further
self-caught contradictions are recorded in §12 (items 8-10) rather than silently fixed.

**0.4.0 (2026-09-10)** — fourth revision, after the owner rejected the v0.3.0 artifact and
inspector layout wholesale ("horrendous — too much got dropped or badly organised") and gave 13
numbered points, all resolved here, none renumbered (new work lands as FR-41-23 through FR-41-30;
superseded FRs are annotated in place, not rewritten, per this project's own
renumbering-breaks-pointers lesson). **Built one universal hover-treatment selector**
(FR-41-23/24) — a `None`/`Swap`/`Sweep`(or `Highlight` for background) `ToggleGroupControl`
paired directly beneath every stateful colour row's Hover swatch, replacing three previously
independent mechanisms (`borderHoverAnimation`, `indicatorStyle:'pill'`, and the plain Hover
swap) with one selector per property. **Extended the sweep to TEXT** (FR-41-26), adopting
`sgs/business-info`'s real, live `background-clip:text` colour-travel technique verbatim (read
directly from `style.css`/`render.php`, not from `plugins/sgs-blocks/CLAUDE.md`'s own stale
one-line summary of it — flagged then as a self-caught doc gap, and **corrected at source in
0.4.6**, so that file now describes both halves of the effect) — safe on the item link
because its background already lives on `::before`, so no precondition workaround is needed.
**Retired the standalone "Indicator" panel entirely**, folding its one capability into the item
Background row's own treatment selector (FR-41-25) — zero capability loss, verified against
FR-41-14's original suppression contract. **Relocated `itemSmartContrast`** from the Design-tab
colour area to the General-tab Accessibility panel (FR-41-27) — it is a safety toggle, not a
colour. **Restored the Typography panel to the visible layout** (§9.10) directly under Colour,
exactly as specified in prose at FR-41-22 all along — it had simply never been drawn. **Built a
new "Submenu — Items" panel** (§9.8) covering everything specific to the dropdown/drawer LINKS —
colour cross-references, hover treatments, the new sublink marker icon — as distinct from the
existing panel-container-only "Submenu — Container" (renamed from "Dropdown…", content
unchanged). **Moved the border panel to live as a subsection inside "Menu item"** rather than
standing alone (FR-41-7/§9.7) — a deliberate, disclosed divergence from the owner's most literal
framing (border colour physically inside the global Colour panel): the colour SWATCH stays
paired with width/style/radius inside `SgsBorderControl`, per a pre-existing, verified framework
rule (`SgsColourPanel.js`'s own documented exemptions), with a cross-reference note replacing a
banned duplicate control. **Confirmed, not rebuilt:** the submenu panel's Normal-only background
was already correctly the only mechanism (no dead hover control ever existed, FR-41-9); the
bar/drawer border mechanism was already unified by construction (FR-41-1/FR-41-28); "Menu
Trigger" already named the right thing, needing only a plain-English help-text anchor (FR-41-12).
**Wired the framework's own `IconPicker`** onto the burger trigger (`triggerIcon`) and the
drawer's sublink marker (`sublinkMarkerIcon`), replacing two hardcoded glyphs, using `sgs/icon`'s
real IconPicker+2-state-colour pairing as the verified precedent (FR-41-30). **Relabelled**
`itemTextDecorationHover` from "Underline on hover" to "Hover text style" with help text
distinguishing it from the border/divider system, after confirming they are genuinely different
CSS mechanisms rather than redundant (FR-41-6, owner point 8). Three new acceptance gates (G13-
G15) cover the additive defaults, the text-sweep/background/border non-collision, and the icon
defaults.

**0.3.0 (2026-09-10)** — third revision, after a second adversarial council round and a
control-helper precision audit. **Corrected FR-41-13's selectors against the real DOM**: the link
is nested inside `.sgs-nav-menu__submenu-root` (bar) or `.sgs-nav-menu__accordion-row` (drawer),
never a direct child of the `<li>`, and the drawer fork has no `.sgs-nav-menu__submenu-wrap` at all
— so the fix is four rules across two named forks, with the `:has()` half keyed on the shared
`ul.sgs-nav-menu__submenu`. **Replaced the published specificity numbers** with the general
state-pair tie rule after recomputing them from the real selector strings (`$link_sel` is two
classes, not one). **Removed the entire proposed `_3` PHP function family** in favour of additive
optional parameters on `sgs_emit_state_colour_css()` / `sgs_fill_decls()` / `sgs_text_decls()`, and
gave `sgs_border_states_css()` an explicit flat-path-only third state with Current declared
gradient-exempt at the masked-ring level. **Named three silent killers of FR-41-8's band**: the
`position:relative` it lost when the underline went, the unconditional
`{featured_sel}::after{content:none;}` that outranked it, and the padding-box/border-box geometry
that would have painted two lines — each now carries its own emitted rule. **Named
`submenuTopOffset`'s hover dead strip** and specified a `.sgs-nav-menu__submenu-wrap::before`
bridge, after verifying that `submenuCloseGrace` governs openness only and never touches CSS
`:hover`. **Made the submenu panel single-state throughout** — its border joins its background and
shadow, resolving a contradiction where an unhoverable panel was given a hover border. **Named the
exact component for every control**, replacing "dropdown" with `ToggleGroupControl` at the
framework's data-driven 3-option threshold, and adopted `TypographyControls`' `showHover` flag
rather than building a bespoke hover-decoration control. **Added FR-41-21**, recording that the
`showHover` trio has no shared PHP emitter and zero adopters, so `render.php` must emit it. **Added
FR-41-22**, the Menu/Submenu typography switcher — including the correction that per-field flags
must move onto each `targets` entry or nine existing controls silently vanish. **Added FR-41-17a**,
naming the two-similar-state-colours risk as an accepted residual rather than implying FR-41-17
covers it. Widened G5's deletion sweep to `plugins/sgs-blocks/scripts/` (nine real hits) and added
G5a for stored `post_content`, G10's rendered-difference check (the theme registers single-weight
faces), G11's post-deletion reseed assertion and G12's manifest-conformance gate.

**0.2.0 (2026-09-10)** — second revision, after an adversarial council round and a batch of owner
corrections. Renamed the third state `Active` → `current` throughout, to the framework's own
existing `golden-controls.json` vocabulary. Retired `hoverStyle` and the whole underline mechanism,
preserving the pill's auto-contrast as the `itemSmartContrast` toggle and its WCAG non-colour
guarantee as two explicit default signals. Dropped the separate "Item Divider" concept in favour of
one per-side 3-state border. Established that every stateful control targets the LINK, which
removed the `:has()`-for-Current construction and made the source-order rule uniform. Removed all
three proposed new shared components after reading the code: nav-menu writes literal row objects
rather than using row helpers, and `SgsBorderControl` / `GradientCapableColourControl` are already
N-state. Added the submenu panel/link background split, submenu open animation, submenu top offset,
and the menu-trigger icon/text mode. Named the fate of every existing hardcoded current-page rule.
Added FR-41-20 stating plainly that active-trail is NOT implemented.

**0.1.0 (2026-09-10)** — first draft.
