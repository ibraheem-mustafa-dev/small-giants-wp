---
doc_type: plan
title: States wave, clone coverage Order item 4 (Spec 48 FR-48-81)
status: active
created: 2026-10-20
spec: .claude/specs/48-CLONING-SYSTEM.md (FR-48-81, FR-48-13, FR-48-46, FR-48-34)
---

# States wave (FR-48-81)

## Why now
- **Problem:** `node scripts/computed-route/capabilities.mjs --gaps` listed 71 capabilities in wave "states" (50 CSS pseudo-classes, 10 ARIA attributes, 7 state/open motion presets, `block-setting:motion:motion`, the `sc-if` and `style-hover` constructs, `svg:set`). The route reads hover only, at rest it reads nothing under any other state, and nothing checks a state on the live page.
- **Effect:** a draft's focus, open, current, disabled and pressed looks are dropped, and Indus step 20 (the header slice) cannot start: Indus has 10 states rows (hover, focus, focus-visible, popover-open, aria-expanded/pressed/checked/hidden, `sc-if`, `style-hover`), Mama's 10.
- **Solution:** make the framework DB the one home for states, have the route read it instead of hand-written lists, and build the state reader, writer and check. With step 4.0 (done) this unblocks Indus step 20.

## What SGS already has (source inventory, 2026-10-20)

A generic scan of `plugins/sgs-blocks/{src,includes,assets}` and the theme (every pseudo-class, `[aria-*]`, `[open]` and `data-*` selector, every class or attribute toggled in JS or by `data-wp-*`, `supports.sgs` states and media-query states), plus the DB and the effects code, finds these families:

| # | Family | Examples | How it is reached |
|---|---|---|---|
| 1 | Pointer and keyboard | `:hover`, `:focus-visible`, `:focus`, `:focus-within`, group hover `[data-sgs-hover-group]` | `includes/helpers-hover-state.php::sgs_hover_state_rules`: every hover rule also paints on `:focus-visible`, touch-guarded by `:root:not(.sgs-touch-input)`, so a tap never engages hover |
| 2 | Press | `:active`, ripple on `pointerdown`/`click` | `includes/helpers-button-press.php` (snapshot `buttonPresets.*.active-*`); `src/shared/effects/fx-ripple.js` writes `data-sgs-ripple="play"`; `assets/js/touch-input.js` makes `:active` work on iOS taps |
| 3 | Current / selected | `aria-current` (page, true, step), `aria-selected`, `aria-pressed`, `.is-active`, `--current`, `--active`, `.is-selected`, `:checked` pills | `$extra_states` in `includes/helpers-tokens.php::sgs_emit_state_colour_css`; block view scripts |
| 4 | Open / expanded | `[open]`, `:modal`, `aria-expanded=true`, `.is-open`, `--open`, `--expanded`/`--collapsed`, `.is-closing`, `popover` | `<details>`, `<dialog>`, `data-wp-bind--aria-expanded`; the scrim shows through `includes/helpers-scrim.php::sgs_scrim_render`'s open rule |
| 5 | Disabled / unavailable | `:disabled`, `aria-disabled`, `--unavailable`, `--sold-out`, `itemDisabledColour` | block settings and view scripts |
| 6 | Named motion states | `data-sgs-motion-state`: open, close, `expanded`, `count-changed`, `count-loaded`, `invalid`, `success`, `step-changed`, `menu-open` | `src/shared/effects/motion-state.js` publishers; declared in `supports.sgs.motion.states` |
| 7 | Motion and effect triggers | load, visible, scroll, hover, pointerdown, click, open, state; motion field states rest, hover, focus, active (effect engaged), close, from, in-view, keyframe | `motion.schema.json`, `motion_presets.trigger`, `motion_fields.state`, `fx_effects.triggers` |
| 8 | Page and header | `is-header-scrolled`/`shrunk`/`scrolling-down`/`on-dark`/`on-light`, `is-row-*`, `data-theme` | `src/header-behaviours/view.js`, the theme toggle |
| 9 | Player and progress | `is-playing`, `is-muted`, `is-fullscreen`, `--paused`, `is-lit`, `is-reached`, `is-complete`, `is-dragging` | block view scripts, fixed styles (no settings) |
| 10 | Server-side | `--current`, `is-current`, `--empty`, `--disabled`, success/error, `--ended`, header's starting tone | render.php |
| 11 | Preferences and conditions | reduced motion, `pointer:fine`, `hover:none`, dark scheme, more contrast; `sgsCondition*`, `sgsHideOn*` | media queries; visibility extension |

**Where the DB holds states today:** `block_attributes.css_state` (hover, current, open, scrolled, shrunk); `modifier_suffixes` kind `state` (Hover, Active, Focus, Disabled); `block_supports.sgs` JSON (`elements.*.states`, `motion.states`); `motion_presets.trigger`, `motion_fields.state`, `fx_effects.triggers`. The `sgsMotion` object has no `block_attributes` row; its field states live in `motion_fields`.

**Root causes:**
1. No DB record of how a state is reached, so the route and the seeder keep their own lists (against FP-1): `lib/calibrate-instances.mjs::STATE_TRIGGERS`, `lib/intake-defects-force.mjs::FORCEABLE`, `lib/intake-inventory-tpl.mjs::PSEUDO_TRIGGER`, `behavioural-analyser/extract-signatures.py::_STATE_SELECTOR_PATTERNS`.
2. Under-tagging: the classifier maps only `:hover` and `[aria-selected=true]`, and the manifests declare `open` on sgs/accordion only. Untagged state settings include `sgs/account.menuActive*`, `sgs/language-switch.currentColour`, `sgs/choice-flow.stepperActiveColour`, `sgs/nav-drawer-menu.itemColourOpen`/`caretBoxBgOpen`/`caretBoxBorderColourOpen`, and both menus' `itemDisabledColour`. `lib/db.mjs::candidates` cannot see them. The scrim settings are not among them: `includes/helpers-scrim.php::sgs_scrim_render` declares the fill, opacity, blur and exit fade on the scrim's resting rule, and the open rule (`:root:has(<open>) .{uid}-scrim`) sets only the element's `opacity:1`, pointer events and the opening duration. They stay `css_state` NULL, and calibration reads them at rest from the body-level scrim (route session, 1712507b5).
3. Ripple's trigger is `click` in `motion_presets` and `pointerdown,click` in `fx_effects` and at runtime.

## Motion timings and states

A timing on the resting rule times both directions of a state change; one on a state rule times entering that state only. `css_state` and the new `css_state_selector` record which rule a setting sits in, so direction follows CSS semantics.

- **Close reverses open (Bean, 2026-10-20; Spec 38A's default).** An `open` entrance's close values fall back to its from-values, duration and easing (`includes/motion/class-sgs-motion-trigger-open-state.php`, `assets/css/motion-triggers.css`); optional close values are the only override. Resting-rule transitions reverse on the same timing. The state reader treats a draft's close as the reverse of its open unless the draft declares a different close.
- **Exceptions:** named-`state` entrances snap back when no close values are stored; the cart drawer (below); the nav-drawer-menu accordion's explicit in/out pair (`submenuAnimationDuration`, `submenuExitDuration`).
- **Cart drawer:** `panelSlideDuration`/`panelSlideEasing` are documented as slide-in only (inspector labels, attribute descriptions, the block.json note, `includes/helpers-cart-panel-css.php::sgs_cart_panel_css`) and emitted as `animation-*` on `.{uid}.sgs-cart__panel[open]`. The shared nav store (`src/shared/nav-interactivity/store.js::runClose`) keeps `[open]` while it adds `.is-closing`, so by specificity a set value appears to also time the close, whose own rule is a fixed `0.2s ease-in` (`src/blocks/cart/style.css`, `.sgs-cart__panel--drawer.is-closing`). Intent is unrecorded and the effect is unmeasured. Step 2 probes it live, then aligns the cart with the reverse rule.
- **Both directions:** hover transitions (gallery, hero, info-box, post-grid, process-steps, team-member, testimonial), `itemMotion*` (icon-list, both menus), mega-panel `groupTransitionDuration`, `submenuCaretTurn*`, `scrimFade*`, site-header `ink*`, row `rowShrink*`, cart `freeDeliveryFill*`.
- **Not state timings:** counter `duration`, nav-drawer-menu `itemOrnamentFrameDuration` and `submenuAnimation`, testimonial-slider `transition*` (slide change).
- **Defect:** sgs/tabs `transitionDuration` writes `--sgs-transition-duration`, which no tabs rule reads.
- **DB mismatches:** cart `panelSlide*` (`animation-*` on `[open]`, not `transition-*` on `panelFrame`); tabs `transitionDuration` (not consumed); testimonial-slider `transition*` (on `__list`); process-steps `transition*` (consumed on `__step`); hero `transition*` (longhands only); nav-drawer-menu `itemMotion*` (also times link, caret, ornaments, media); nav-drawer-menu `submenuAnimationEasing` (untagged while its duration is `open`).

## Decisions (Bean, 2026-10-20)

- Form-field states (`:valid :invalid :user-valid :user-invalid :required :optional :placeholder-shown :in-range :out-of-range :read-only :read-write :default :indeterminate :autofill :enabled`, aria-invalid, aria-disabled, aria-busy) belong to wave "shop, forms and data": sgs/form draws them. `:disabled` and `:checked` stay here (pickers, menus, buybox).
- A draft popover maps to the existing SGS surfaces (modal, nav-drawer, mega-menu).
- Excluded, signed by Bean: media playback states (`:playing :paused :buffering :seeking :stalled :muted :volume-locked`), caption-cue timing (`:past :future :current`), `:fullscreen :picture-in-picture`, Web Components states (`:has-slotted :state()`), `:blank`. The view-transition states (`:active-view-transition`, `-type`, `:navigation-source`) belong to "site and surfaces" beside `fx:page-transitions`. `:empty` matches at rest, so the rest declared read covers it (step 7 records its refs).
- The framework DB is the one home for states, with these state words: hover, focus, active (press), current (with pressed, selected, checked), open, disabled, scrolled, shrunk.
- Focus looks equal to hover go through hover settings; a different focus look and `:active` on buttons go to the theme tokens (`settings.custom.focus`, `buttonPresets.*.active-*`) through a minimal token writer.
- Closing reverses opening on the same timing unless a close override is set.
- sgs/tabs `transitionDuration` is wired, not removed.

## Coordination

The route-calibration session (FR-48-8 step 5, coverage d2) owns `lib/calibrate-read.mjs`, `lib/calibrate-instances.mjs` and `calibration-fixtures.json` until its handoff, and leaves `extract-signatures.py`, `STATE_TRIGGERS`, `READ_KEY`, fixture preconditions and `clone-coverage.json` to this wave. Its reseed landed at 2a4c0d542. `lib/calibrate-read.mjs::readUnderTrigger` now returns `{ read, why }`. The motion-timing DB mismatches are this wave's to fix. It reports when its recalibration finishes and when it hands off. Steps 1 and 4 to 6 (data file and new modules) run now; steps 2 and 3 and every calibration run wait for that handoff.

## Steps

Every new rule ships a MUST FAIL test and a mutation check.

1. **Coverage housekeeping.** `data/clone-coverage.json`: the 15 exclusions, 18 form entries to "shop, forms and data", 3 view-transition entries to "site and surfaces". Done when `capabilities.mjs --gate` exits 0 and the wave lists 35.
2. **States in the framework DB** (`/migration-method`; serial queue for the reseed).
   - Reference table `states` (from new `plugins/sgs-blocks/scripts/data/states.json`, seeded by `dbschema/seed_reference_data.py`): each state word, its family, every mechanism that expresses it (pseudo-class, ARIA attribute and value, native attribute, class pattern, data attribute) and how to reach it (force a pseudo-class, set an attribute, toggle a class, fixture, scroll). Named motion states and manifest states join it as rows with block and source.
   - `block_attributes.css_state` stays the per-setting state; a new `css_state_selector` column beside it records the selector the setting paints under. The classifier writes both from the rule it already walks; `extract-signatures.py` derives `css_state` from `states`, not `_STATE_SELECTOR_PATTERNS`.
   - Manifests declare the missing states (nav-drawer-menu, nav-bar-menu, account, language-switch, choice-flow). Scrim settings stay resting settings.
   - The motion DB mismatches are fixed at their declaration; tabs `transitionDuration` is wired; ripple's preset trigger matches `fx_effects`.
   - Cart: a live computed-style probe of the panel during close (setting set and unset), then the close reverses the open on the same duration and curve (the fixed rule goes, the labels become "Slide time" / "Slide speed curve"), then the probe again.
   - `scripts/check-hover-state-classification.py` becomes a states gate: a setting painted under a state selector with a NULL `css_state` fails.
   - Exhaustiveness gate: the source scanner plus a live CSSOM pass over the canary's fixture pages (every rule in `document.styleSheets`, which includes PHP-assembled selectors) maps every state-bearing selector to a tagged setting, a `states` row or a recorded fixed behaviour.
   - Done when the reseed (clean HEAD worktree) tags every listed setting, both gates exit 0 and their self-tests go red on a planted untagged row.
3. **The route reads the DB.** `STATE_TRIGGERS`, `FORCEABLE` and `PSEUDO_TRIGGER` become `lib/db.mjs` reads of `states`; `disabled` and `pressed` gain triggers. `READ_KEY` does not change, but newly tagged rows make their blocks' calibration files due: recalibrate those blocks through the serial queue.
4. **State reader,** new `lib/fill-state-read.mjs`, extending FR-48-8 (`lib/fill-declared.mjs`, `lib/fill-confirm.mjs`). For each draft element with a state rule it reaches the state by the `states` method (`CSS.forcePseudoState`, an attribute, `showPopover()`, a class), reads declared values at 375/768/1440, and adds `state` to the confirm record. It recognises `sc-if`, `style-hover` and state-triggered motion; popovers map to modal, drawer or mega by `lib/intake-inventory-surfaces.mjs`.
5. **Writer,** new `lib/fill-state.mjs`: `lib/resolve.mjs::resolve( …, state )` for every family into the ledger (as hover is today, Solve applies); new `lib/snapshot-tokens.mjs` for the focus and press tokens; open-state timing to role-`motion` settings; `svg:set` through step 4.0's SVG path.
6. **Check,** new `lib/state-check.mjs` and FR-48-13's generator: force each state the same way on the draft and the live page and compare (the confirm tolerances); generate the state map from `surfaces.json`, every `sc-if` and `css_state_selector`, list unreachable states as gap rows, diff against `scripts/parity/flows/state-map-reasons.json`.
7. **Coverage refs** (`path#symbol`) for every remaining states entry. The `fx:*` entries stay in "behaviour recognisers" and read the same `states` table.
8. **Proof (FR-48-81 done-when):** `--gaps` lists no states entry and `--gate` exits 0; new `tests/states-planted-draft.test.mjs` plants hover, focus-visible, an `aria-expanded` disclosure, a popover, `[open]`, `aria-current` and `:disabled`, raises no seen-but-unsupported row, and raises it again with the writer ref nulled; the live page pairs with the draft at 375, 768 and 1440 (Bean's eye).
9. **Docs and close:** Order item 4, FR-48-81 (and FR-48-13, FR-48-46) Status, a Spec 02 "States" section naming the DB home, the Indus plan's step 20 and states row, LEDGER Front M; `/qc-council`, then `/handoff`.

**Later wave (FP-9):** the cart and other hand-written drawer motion move onto the motion model's `open` trigger.

## Status

- [x] Step 1 (2026-10-20): 15 exclusions signed, 21 entries re-waved; the wave lists 35; `capabilities.mjs --gate` exits 0.
- [ ] Steps 2 and 3: wait for the route-calibration handoff.
- [ ] Steps 4 to 9.
