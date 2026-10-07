# F3 gate: E14 triage and baseline retriage

Subject: `plugins/sgs-blocks/scripts/check-hardcoded-render-defaults.js` (Gate B), baseline `plugins/sgs-blocks/scripts/hardcoded-render-defaults-baseline.json`.
Status: the analysis stands. Its highest-reach recommendations shipped in `6f1963c28` (2026-10-06), `75a583e23` and `53ba85750` (2026-10-07); section 6 carries the measured ceilings. The triage itself (sections 1 to 3 and the section 4.3 listing) was written 2026-10-06 against a 137-finding survey; the baseline edits of section 2.3 were the only repository change it made. Last updated 2026-10-07.

## 0. Method, and what the numbers rest on

- Reproduced the survey with `node scripts/check-hardcoded-render-defaults.js --survey --verbose`. At triage (2026-10-06) it reported 137 net-new E14 findings (68 CLASS-2, 5 CLASS-3, 64 CANNOT-RESOLVE), 20 classified CLASS 1, 17 legacy findings accepted by the baseline. The same command now (2026-10-07, after `c70b7eb54`) reports 91 net-new (35 CLASS-2, 1 CLASS-3, 55 CANNOT-RESOLVE), 20 CLASS 1, 17 accepted.
- To see what the gate saw for each finding (the control selectors it resolved, how many markup instances matched each side) I ran a scratch copy of the gate from the session scratchpad with one extra logging hook. Nothing under the repo was touched by that copy; it reproduced the same 137 (68 / 5 / 64).
- Reach is read from each block's own markup (`render.php`, sibling PHP, `includes/` helpers, `edit.js` and `view.js`). Every "no markup emits this class" claim comes from a search of all `.php` and `.js` files under `src/` and `includes/`, plus `theme/`; one such claim was wrong on first pass (the form table headings are built from a class map in `includes/forms/field-render-helpers.php::field_headings`) and was corrected, so the DEAD rows carry the search scope.
- Specificity is computed from the emitted selector strings (`.{uid}` stands for the per-instance class). An inherited property reaches a descendant only through inheritance, so specificity does not rescue a control that targets an ancestor: a declaration on the descendant wins at any specificity. Specificity matters only for same-element pairs (CLASS 1).

Headline numbers. The CLASS 2 and CLASS 3 rows count the 73 findings triaged on 2026-10-06; the CANNOT-RESOLVE rows count the 55 the gate reports now (section 4.2 gives the arithmetic):

| | Count |
|---|---|
| CLASS 2 + CLASS 3 findings triaged | 73 |
| ... judged FIX | 26 declarations (22 CLASS 2, 4 CLASS 3): **all resolved**. 24 closed by a control (4 in `6f1963c28`, 9 in `75a583e23`, 11 in `4a4d442fd`..`4289311a9`), 2 (`cta-section` headline) re-verdicted DEFENSIBLE on a live measurement |
| ... DEFENSIBLE (documented intent, UI chrome, or measured) | 36 (35 CLASS 2, 1 CLASS 3) |
| ... DEAD (no markup emits the class) | 10, deleted in `6f1963c28` |
| ... EDITOR-ONLY | 3, moved to `editor.css` in `6d30835bd` |
| CANNOT-RESOLVE now | 55 |
| ... CLASS 4 shaped (carried from the triage) | 40 |
| ... newly visible since `53ba85750`, not yet classified | 9 |
| ... own control already exists (CLASS 1 in effect) | 1 (`media` caption; the bare `figcaption` member keeps it unresolved) |
| ... CANNOT-TELL from source | 5 |
| Baseline entries | 18 before, 17 after (one stale entry removed) |

## 1. Item 1: E11 versus E14 on `button/style.css::.sgs-button { line-height: 1.2 }`

### What is true in the code

- E11 is the `helperGov` branch of `check-hardcoded-render-defaults.js::scanCssDeclarations` (`if ( helperGov && helperGov.has( attrName ) ) { if ( selectorReferencesGovernedToken( currentSelector, helperGov.get( attrName ) ) ) { nonExemptAttrs.push( attrName ); } continue; }`). It flags when the declaring selector shares a class name with the control's selector. It never compares specificity or element identity.
- E14 is `classifyInheritedHardcode`. It resolves the control to `.{uid}.sgs-button` and the declaration to `.sgs-button`, finds the same element, and returns `CLASS-1`. The survey prints it: `Legacy findings re-classified by element identity: 2 ... [CLASS-1] sgs/brand-strip ... line-height: 1.3` and `[CLASS-1] sgs/button ... line-height: 1.2`.
- The control wins in fact: `button/render.php` calls `sgs_typography_css_rule( $attributes, '', ".{$uid}.sgs-button" )` (0,2,0) against `.sgs-button` (0,1,0) on the same element, and the helper emits only properties that are set.
- The same two findings are the only entries E14 re-classifies. The other 15 accepted legacy findings are non-inherited properties (padding, margin, width, height, border-radius, max-width) that E14 does not audit, or the four F3b `block.json` colour defaults, which never pass through `scanCssDeclarations`. So option (a) moves exactly two baseline entries and no others.

### Option (a): narrow E11 so it respects specificity when E14 says CLASS 1

- Change: `scanCssDeclarations`, in the loop that already computes `verdict = classifyInheritedHardcode( f, model, declLog )` for each `legacyForAudit` finding. Drop a legacy finding when `verdict.cls === 'CLASS-1'`, but only after adding a real check that the control's selector specificity exceeds the declaration's. `classifyInheritedHardcode` currently asserts CLASS 1 from the documented convention that SGS controls emit two or more classes (the E14 header says "specificity beyond the CLASS 1 rule: not modelled"), so the specificity check is the part that is new.
- Removes: the false positive at source, for every future block with a base `.x__name { line-height }` and a same-element control. No new baseline entry is ever needed for that shape.
- Baseline entries that move: exactly `sgs/brand-strip` `line-height: 1.3` and `sgs/button` `line-height: 1.2`; both become unreferenced and are deleted in the same change. Nothing else changes.
- Risk: legacy findings block the build and E14 findings do not. Dropping a legacy finding on an E14 verdict is safe only if the CLASS 1 verdict is sound, which is why the specificity check must be real and not assumed. With it, a base rule that out-ranks or ties its control stays a blocking legacy finding.
- Cost: one small function (`selectorSpecificity`) and one comparison; the gate already has both selector strings in `ELEMENT_MODEL_STATS` and `declLog`.

### Option (b): keep the entry, rewrite the `reason` as `by-design` citing E14's CLASS 1

- Removes the confusion in the baseline text at no risk and with no gate change.
- Leaves a known false positive in the gate, so every future block that has the same shape needs a hand-written baseline entry. That is a baseline written to silence a finding the detector got wrong, which the standing rule says not to do; the entries already in `_meta.dispositionVocabulary` exist for the exceptions, not for a recurring class.

### Recommendation

Do (a), narrowly, with a real specificity check, as a follow-up task, because (b) turns a recurring detector error into a recurring baseline entry. I applied (b) to the two existing entries now (section 2.3) so the baseline is honest in the meantime, and each reason says to retire it when E11 is made specificity-aware.

Disposition choice: I used `by-design` as the brief specifies, because the declared value is correct and stays correct after (a). `detector-limitation` is also defensible, since the checker is what is wrong; it is a one-word change if you prefer it.

## 2. Item 2: retriage of the 18 baseline entries

### 2.1 Verdicts, each re-derived from the code

Disposition vocabulary (`_meta.dispositionVocabulary`): `by-design`, `accepted-debt`, `detector-limitation`, `blocked`. "Was" is the disposition the baseline carried; "Now" is what the file carries after this task. "Task 1" is the verdict in `f3-gate-capability-map.md`; I disagree with it on three rows and say why.

| # | Entry | Was | Now | Evidence (re-read, quoted) | vs Task 1 |
|---|---|---|---|---|---|
| 1 | `sgs/mega-menu` `max-width` | accepted-debt | **removed** | `src/blocks/mega-menu` does not exist (deleted in `23a3cf63e`, "retire legacy nav"). The survey counts 17 accepted findings against 18 entries: this is the entry with no producer. | agrees |
| 2 | `sgs/brand-strip` `line-height: 1.3` | accepted-debt | by-design | `brand-strip/style.css::.sgs-brand-strip__name` (0,1,0); control `sgs_typography_css_rule( $attributes, 'name', "{$root_sel} .sgs-brand-strip__name" )` with `$root_sel = '.' . $uid . '.wp-block-sgs-brand-strip'` (0,3,0). Same element; E14 CLASS-1. The CSS comment states the same specificity. | agrees |
| 3 | `sgs/button` `line-height: 1.2` | accepted-debt | by-design | `button/style.css::.sgs-button` (0,1,0); `sgs_typography_css_rule( $attributes, '', ".{$uid}.sgs-button" )` (0,2,0). Same element; E14 CLASS-1 (Item 1). | agrees |
| 4 | `sgs/mega-panel` `padding: 17px` | accepted-debt | accepted-debt, reason corrected | `mega-panel/style.css::.wp-block-sgs-mega-panel[ data-mega-style='cards' ] .sgs-mega-group { padding: 17px }`. `panelPadding` governs the panel (`$panel_padding_obj`). `mega-panel/block.json` has `drawerCardPadding` only; `mega-group/block.json` has `url`, `opensInNewTab`, `rel`. `render.php` repeats the literal: `$css .= $style_crd . $rel_group . '{padding:17px;border-radius:15px;...}'`. A real missing control, with the wrong attribute named. | **differs**: Task 1 said detector-limitation. The detector names the wrong attribute, but the value really has no control, which is the debt the entry exists to record. |
| 5 | `sgs/mega-panel` `border-radius: 15px` | accepted-debt | accepted-debt, reason corrected | Same rule and same repeat in `render.php`. `borderRadius` is the panel's (`$border_radius`); only `drawerCardRadius` exists for cards. | differs, as #4 |
| 6 | `sgs/product-card` `border-radius: 16px` | accepted-debt | by-design | `.product-card { border-radius: 16px }` (0,1,0) is the block root (`$classes = array( 'product-card' )`); `borderRadius` is emitted through `wp_style_engine_get_styles( $sgs_pc_style_engine_args, array( 'selector' => $sgs_pc_root_sel ) )`, `$sgs_pc_root_sel = '.' . $sgs_card_uid . '.wp-block-sgs-product-card'` (0,2,0). The attributes the entry names (`pickerPill*`, `tagBorderRadius`) are suffix collisions. | agrees |
| 7 | `sgs/card-grid` `block.json` `titleColour` default | detector-limitation | **unchanged** | Contested: see 2.2. | n/a |
| 8 | `sgs/pricing-table` `titleColour` default | detector-limitation | **unchanged** | Contested: see 2.2. | n/a |
| 9 | `sgs/process-steps` `titleColour` default | detector-limitation | **unchanged** | Contested: see 2.2. This time I read the emission: `process-steps/render.php`: `$scoped_css[] = "{$title_scope}{{$title_colour_decl};}";`. | n/a |
| 10 | `sgs/team-member` `nameColour` default | detector-limitation | **unchanged** | Contested: see 2.2. | n/a |
| 11 | `sgs/button` `padding: 14px 24px` | accepted-debt | by-design | `button/style.css::.sgs-button` (0,1,0); when `padding` is set, `wp_style_engine_get_styles( $base_style_engine_args, array( 'selector' => ".{$uid}.sgs-button" ) )` (0,2,0), same element. Not inherited, so E14 does not audit it; verdict is from reading both selectors. | agrees |
| 12 | `sgs/form` `padding: 1rem` | accepted-debt | accepted-debt, reason corrected | `form/style.css::.sgs-form-tile { padding: 1rem }`, the label from `form-field-tiles/render.php`: `echo '<label class="sgs-form-tile" for="' . esc_attr( $tile_id ) . '" ...'`. `form/block.json` has `padding`, `submitPadding`, `fieldPadding`; `form-field-tiles/block.json` has `gap` and `borderRadius`. No attribute pads the tile. | **differs**: as #4, a real gap. |
| 13 | `sgs/heading` `margin-bottom: 8px` | accepted-debt | by-design | `.wp-block-sgs-heading` (0,1,0), and the file header says the per-instance rule always wins; `$root_sel = '.' . $uid . '.wp-block-sgs-heading'` (0,2,0) carries `margin` from `$base_margin_obj`. | agrees |
| 14 | `sgs/option-picker` `margin: -1px` | accepted-debt | detector-limitation | `.sgs-sr-only { position: absolute; width: 1px; height: 1px; ... margin: -1px }` on `<legend id="%s" class="sgs-sr-only">`. `isLiteralConstant` exempts 1px but has no `-1px` margin case. Only the `.sgs-sr-only` declaration (the first of two `margin: -1px` in the file) is matched by this entry. | agrees |
| 15 | `sgs/product-faq` `margin-top: 8px` | accepted-debt | accepted-debt, reason corrected | `.sgs-product-faq-item + .sgs-product-faq-item { margin-top: 8px }`. `margin` is the root's. Neither `product-faq/block.json` nor `product-faq-item/block.json` declares an item gap. | **differs**: as #4, a real gap. |
| 16 | `sgs/whatsapp-cta` `margin: -1px` | accepted-debt | detector-limitation | `.sgs-sr-only` recipe on `<span class="sgs-sr-only">` in `whatsapp-cta/render.php`. | agrees |
| 17 | `sgs/nav-drawer` `width: 28px` | detector-limitation | unchanged | `.sgs-nav-drawer__close svg { width: 28px; height: 28px }` is the glyph; `closeSize` is emitted on `$close_sel = $root_sel . ' .sgs-nav-drawer__close'` (the button box, `width:` / `height:` / `min-width:` / `min-height:`). Different elements. The existing reason is accurate. | agrees |
| 18 | `sgs/nav-drawer` `height: 28px` | detector-limitation | unchanged | As #17. | agrees |

After this task: `by-design` 5, `accepted-debt` 4, `detector-limitation` 8 (the four contested colours plus #14, #16, #17, #18), `blocked` 0. Total 17.

### 2.2 The four contested colour entries: evidence and recommendation

I did not change these four entries. Question 1: is the painted value always a `var()`? Question 2: does a `var()`-bound default still flatten the theme-differentiated colour that `headingLevel` would give?

**Q1. Painted value: yes, always a `var()`; the baseline is right on this point.**

- All four defaults are bare slugs that are not CSS colours (`primary`, `text`), and each block paints them through the same chain: `sgs_resolve_text_colour_or_gradient` then `sgs_text_colour_decl` then `sgs_colour_value`. `includes/helpers-tokens.php::sgs_colour_value` ends: `return 'var(--wp--preset--color--' . $slug . ', currentColor)';`. So the painted declaration is `color:var(--wp--preset--color--<slug>, currentColor)`, never the literal slug.
- Two small inaccuracies in the baseline text: the returned value carries a `, currentColor` fallback, and the `render.php` line numbers it cites have moved (the code is now at the symbols in the table). Neither changes the conclusion.

| Block | Default | Emission (`file::symbol`) | Rule selector as emitted | Specificity | `headingLevel` |
|---|---|---|---|---|---|
| `sgs/card-grid` | `titleColour: "primary"` | `card-grid/render.php`: `$sgs_grid_typo_css .= "{$sgs_grid_title_sel}{{$title_colour_decl};}";` | `$sgs_grid_title_sel = '.' . $sgs_grid_uid . ' .sgs-card-grid__title'` | (0,2,0) | enum h2..h6, p; default h3 |
| `sgs/pricing-table` | `titleColour: "text"` | `pricing-table/render.php`: `$responsive_css .= $title_sel . '{' . $title_colour_decl . '}';` | `$root_sel . ' .sgs-pricing-table__name,' . $root_sel . ' .sgs-pricing-table__title'` | (0,3,0) | same |
| `sgs/process-steps` | `titleColour: "text"` | `process-steps/render.php`: `$scoped_css[] = "{$title_scope}{{$title_colour_decl};}";` | `$title_scope = $root_sel . ' .sgs-process-steps__title'` | (0,3,0) | same |
| `sgs/team-member` | `nameColour: "primary"` | `team-member/render.php`: `$scoped_css[] = "{$name_colour_sel}{{$name_colour_decl};}";` | `$name_colour_sel = $root_sel . ' .sgs-team-member__name'` | (0,3,0) | same |

**Q2. Flattening: yes, a `var()`-bound default still flattens the theme's heading colour.**

- The default is non-empty, so `$title_colour_effective` is non-empty and the scoped rule is emitted on every instance, whatever the author did. The F3b concern is not that the value is a literal; it is that a rule at (0,2,0) to (0,3,0) on the title out-ranks `theme.json` element colours, which the `getThemeGovernedProps` docblock in the gate puts at (0,0,1) ("sgs/heading's `textColour: "text"` emitted a (0,2,0) scoped rule that beat theme.json's `styles.elements.heading.color.text` (0,0,1)", the D343 case).
- The theme side is real, not hypothetical. `theme/sgs-theme/theme.json` sets one heading colour, `styles.elements.heading.color.text = var:preset|color|text`. Four of the eight client snapshots differentiate by level: `sites/sgs-construction`, `sgs-healthcare`, `sgs-mosque` and `sgs-professional` `theme-snapshot.json` set `h1` to `h4` to `text-primary`, `h5` to `accent` and `h6` to `text-secondary`. Two more set the heading colour away from `text`: `sites/indus-foods` (`heading` = `primary`) and `sites/helping-doctors` (`heading` = `primary-dark`).
- Concrete collisions, from the snapshot palettes: `indus-foods` heading `primary` is `#0A7EA8`, but a `sgs/pricing-table` or `sgs/process-steps` title paints the default `text`, `#2C3E50`. `sgs-healthcare` `h5` is `accent` `#4CAF88`, but a `sgs/card-grid` or `sgs/team-member` title at `headingLevel: h5` paints the default `primary`, `#1A5F6B`. `helping-doctors` heading is `primary-dark` `#1a4139`, but those titles paint `#2d6e5e` or `#1a1a1a`.
- Where the default equals what the theme would give (`card-grid` and `team-member` on `indus-foods`: `primary` both ways) there is no visible change today. The block still cannot follow a later heading-colour change.

**Recommendation (three sentences).** The baseline is correct that the painted value is a `var()`, but that is not what F3b measures: the default is always emitted at two or three classes and overrides the client's `theme.json` or snapshot heading colour, which four checked snapshots show matters (for example `indus-foods` `primary` #0A7EA8 against the pricing-table default `text` #2C3E50). I recommend relabelling all four from `detector-limitation` to `accepted-debt` with a reason that says "the default overrides the client's per-level heading colour; the `var()` form is irrelevant", because the gate's finding is right and only its "theme-differentiated" wording over-states how the base theme behaves (the base theme is uniform; the client snapshots are not). Whether these blocks should own a title colour by default at all is a design call the code cannot answer (CANNOT-TELL), so the fix (empty default, so the theme colour shows until an author sets one) is yours to decide.

### 2.3 Baseline edits made

Two kinds of edit only, both in `plugins/sgs-blocks/scripts/hardcoded-render-defaults-baseline.json`:

1. **Removed** the stale `sgs/mega-menu` entry (`max-width`, `min(900px, calc(100vw - 2rem))`).
2. **Rewrote `reason` (and `disposition` where it was wrong)** for 11 entries: `sgs/brand-strip` `line-height`, `sgs/button` `line-height` and `padding`, `sgs/mega-panel` `padding` and `border-radius`, `sgs/product-card` `border-radius`, `sgs/form` `padding`, `sgs/heading` `margin-bottom`, `sgs/option-picker` `margin`, `sgs/whatsapp-cta` `margin`, `sgs/product-faq` `margin-top`.

Not touched: the four contested colour entries and both `sgs/nav-drawer` entries. No entry added, no other entry removed; the file round-trips through a JSON parser with the same formatting.

The baseline edit moved no E14 ceiling. Proof (run 2026-10-07 from `plugins/sgs-blocks`): `node scripts/check-hardcoded-render-defaults.js --check` exits **0** ("OK — 0 net-new legacy F3 violations across 95 blocks (17 known debt item(s) in baseline)") and its E14 line reads `CLASS-2 48/48, CLASS-3 2/2, CANNOT-RESOLVE 61/61`; `node scripts/check-hardcoded-render-defaults.js --self-test` prints **24/24 checks passed**.

## 3. Item 3a: CLASS 2 and CLASS 3 (73 findings triaged)

CLASS 2: the declaration is on a descendant of the element a control paints, so the control can never reach it. CLASS 3: a wrapper class declares a value that leaks into text children. Reach is the ranking key, so a rule nothing renders sits at the bottom whatever its class.

### 3.1 Ranking of the findings by reach

Reach is the number of live elements one block instance affects, read from the block's own markup. Where a count depends on a loop, the figure assumes 4 loop items (4 rows, 4 steps, 4 options, 4 reviews) or 6 form fields, and says so. Instances per page and pages per site are content, not code: CANNOT-TELL from source, so the ranking is per instance.

Verdict key: **FIX** a control cannot reach a live element. All 26 FIX declarations are resolved: 24 closed by a control, and the 2 `cta-section` headline declarations re-verdicted DEFENSIBLE on a live measurement. **CLOSED** the commit named shipped the control. **DEFENSIBLE** documented intent, or UI chrome read as intended (marked "documented" only where the source says so). **EDITOR** only the editor renders it. **DEAD** no markup emits the class.

| Rank | Block | Element (declaring class) | Decls | Class | Verdict | Elements per instance | Leak |
|---|---|---|---|---|---|---|---|
| 1 | `sgs/buybox` | `.buybox__value-ladder` | 1 | CLASS-3 | **CLOSED `6f1963c28`** | 12 | was: permanent. Now `valueLadder` + `valueLadderSaving` surfaces; the literal sits in `:where()` |
| 2 | `sgs/process-steps` | `.sgs-process-steps__step` | 1 | CLASS-3 | **CLOSED `75a583e23`** | 12 | was: icon, number and description permanent. Now each owns its alignment through an `icon`, `number` or `description` typography surface; the step's literal sits in `:where()`, and no `step` prefix is needed |
| 3 | `sgs/product-card` | `.product-card__value-ladder` | 1 | CLASS-3 | **CLOSED `6f1963c28`** | 12 | was: permanent. Now `valueLadder` + `valueLadderSaving` surfaces; the literal sits in `:where()` |
| 4 | `sgs/form` | `.sgs-form-field__label` | 1 | CLASS-2 | **CLOSED `6f1963c28`** | 6 | was: permanent. Now a `label` surface on `sgs/form`; the literal and the floated state's size/weight sit in `:where()` |
| 5 | `sgs/form` | `.sgs-form-field__input` | 1 | CLASS-2 | **CLOSED `6f1963c28`** | 5 | was: no field line-height control. Now the full `field` surface; `fieldFontSize` moved onto the shared helper |
| 6 | `sgs/product-faq` | `.sgs-product-faq-item__question` | 3 | CLASS-2 | **CLOSED `75a583e23`** | 4 | was: permanent. Now a `question` surface on `sgs/product-faq`; the three literals sit in `:where()` and the open-state weight step is removed (section 3.2) |
| 7 | `sgs/countdown-timer` | `.sgs-countdown__number` | 2 | CLASS-2 | **CLOSED `75a583e23`** | 4 | was: permanent. Now a `number` surface; the literals and the `font-size` `var()` sit in `:where()` |
| 8 | `sgs/countdown-timer` | `.sgs-countdown__label` | 2 | CLASS-2 | **CLOSED `75a583e23`** | 4 | was: permanent. Now a `label` surface; the literals and the `font-size` `var()` sit in `:where()` |
| 9 | `sgs/form` | `.sgs-form-tile__icon` | 2 | CLASS-2 | **CLOSED `c9d0f7cf4`** | 4 | was: permanent. Now a `tileIcon` surface on the parent `sgs/form`; both literals sit in `:where()` |
| 10 | `sgs/form` | `.sgs-form-tile__label` | 1 | CLASS-2 | **CLOSED `c9d0f7cf4`** | 4 | was: permanent. Now a `tileLabel` surface; the (0,3,0) selected-tile bold stays as the WCAG 1.4.1 non-colour cue and outranks it in that state only |
| 11 | `sgs/form` | `.sgs-form-review__term` | 1 | CLASS-2 | **CLOSED `c9d0f7cf4`** | 4 | was: permanent. Now a `reviewTerm` surface; `view.js::populateReview` builds the `<dt>` inside the uid root |
| 12 | `sgs/option-picker` | `.sgs-option-picker__pill-text` | 1 | CLASS-3 | **CLOSED `4a4d442fd`** | 4 | was: `pillLineHeight` and `labelLineHeight` never reached the pill text. The 1.25 default moved up to `:where(.sgs-option-picker__pill)`, so both controls (and `product-card`'s own `pill` prefix) reach the text by inheritance; no new attributes |
| 13 | `sgs/form` | `.sgs-form__button` | 2 | CLASS-2 | **CLOSED `c9d0f7cf4`** | 3 | was: no line-height control on any button. `submit*` completed to the full surface on the shared helper; Previous/Next get their own `navButton` surface; the shared defaults sit in `:where()` |
| 14 | `sgs/cta-section` | `.sgs-cta-section__headline` | 2 | CLASS-2 | **DEFENSIBLE (measured, `4289311a9`)** | 1 | with the cta literals neutralised live, the headline read line-height 24px / weight 500 against a root set to 40px / 300: the theme's global `h1`-`h6` styles block every container's root typography from any heading. Its own `sgs/heading` controls (0,2,0) own it; the (0,1,0) defaults stay, because `:where()` would hand the headline to the theme rule |
| 15 | `sgs/countdown-timer` | `.sgs-countdown__expired` | 1 | CLASS-2 | **CLOSED `75a583e23`** | 1 | was: permanent. Now an `expired` surface; the literal sits in `:where()` |
| 16 | `sgs/cta-section` | `.sgs-cta-section__body` | 1 | CLASS-2 | **CLOSED `4289311a9`** | 1 | was: root `lineHeight` never reached the body. Measured INHERITS (32px to 40px) with the literal gone, so the body's size and line-height defaults moved up to `:where(.sgs-cta-section)` |
| 17 | `sgs/form` | `.sgs-form-field__consent-text` | 1 | CLASS-2 | **CLOSED `c9d0f7cf4`** | 1 | was: permanent. Now a `consent` surface on the parent `sgs/form` |
| 18 | `sgs/product-card` | `.price-from-label` | 1 | CLASS-2 | **CLOSED `018d39351`** | 1 | was: no font-family control. `priceFromLabel` completed to the full surface; the typography defaults sit in `:where()` (they tied the control at (0,2,0)) and the `'Inter'` literal is deleted |
| 19 | `sgs/table-of-contents` | `.sgs-toc__title` | 1 | CLASS-2 | **CLOSED `6d30835bd`** | 1 | was: permanent. Now a `title` surface; weight and size defaults sit in `:where()` |
| 20 | `sgs/business-info` | `.sgs-business-hours__time` | 1 | CLASS-2 | DEFENSIBLE | 7 | permanent (no control for the time column) |
| 21 | `sgs/google-reviews` | `.sgs-google-reviews__maps-link` | 1 | CLASS-2 | DEFENSIBLE | 5 | permanent (the 12 element controls do not include the maps link) |
| 22 | `sgs/google-reviews` | `.sgs-google-reviews__breakdown-row` | 1 | CLASS-2 | DEFENSIBLE | 5 | permanent |
| 23 | `sgs/google-reviews` | `.sgs-google-reviews__stars` | 1 | CLASS-2 | DEFENSIBLE | 5 | permanent |
| 24 | `sgs/form` | `.sgs-form-field__column-heading` | 3 | CLASS-2 | DEFENSIBLE | 4 | permanent |
| 25 | `sgs/form` | `.sgs-form-field__row-heading` | 2 | CLASS-2 | DEFENSIBLE | 4 | permanent |
| 26 | `sgs/form` | `.sgs-form__progress-step-number` | 2 | CLASS-2 | DEFENSIBLE | 4 | permanent |
| 27 | `sgs/testimonial-slider` | `.sgs-testimonial-slider__arrow` | 2 | CLASS-2 | DEFENSIBLE | 2 | permanent |
| 28 | `sgs/post-grid` | `.sgs-post-grid__error` | 1 | CLASS-3 | DEFENSIBLE | 2 | permanent for the empty-state text |
| 29 | `sgs/cta-section` | `.sgs-cta-section__ribbon` | 4 | CLASS-2 | DEFENSIBLE | 1 | permanent |
| 30 | `sgs/form` | `.sgs-form-field__file-button` | 4 | CLASS-2 | DEFENSIBLE | 1 | permanent |
| 31 | `sgs/notice-banner` | `.sgs-notice-banner__icon` | 2 | CLASS-2 | DEFENSIBLE | 1 | default-state only (`iconSize` owns the glyph) |
| 32 | `sgs/notice-banner` | `.sgs-notice-banner__close` | 2 | CLASS-2 | DEFENSIBLE | 1 | permanent |
| 33 | `sgs/testimonial-slider` | `.sgs-testimonial-slider__pause-icon` | 2 | CLASS-2 | DEFENSIBLE | 1 | permanent |
| 34 | `sgs/button` | `.sgs-button__note` | 1 | CLASS-2 | DEFENSIBLE | 1 | permanent (documented) |
| 35 | `sgs/form` | `.sgs-form-field__file-label` | 1 | CLASS-2 | DEFENSIBLE | 1 | permanent |
| 36 | `sgs/form` | `.sgs-form-file__progress` | 1 | CLASS-2 | DEFENSIBLE | 1 | permanent |
| 37 | `sgs/google-reviews` | `.sgs-google-reviews__badge-text` | 1 | CLASS-2 | DEFENSIBLE | 1 | permanent |
| 38 | `sgs/store-selector` | `.sgs-store-selector__item` | 1 | CLASS-2 | DEFENSIBLE | 1 | permanent |
| 39 | `sgs/testimonial-slider` | `.sgs-testimonial-slider__pause-btn` | 1 | CLASS-2 | DEFENSIBLE | 1 | permanent |
| 40 | `sgs/business-info` | `.sgs-business-info__placeholder` | 2 | CLASS-2 | **CLOSED `6d30835bd`** (moved to `editor.css`) | 0 | n/a |
| 41 | `sgs/table-of-contents` | `.sgs-toc__empty` | 1 | CLASS-2 | **CLOSED `6d30835bd`** (moved to `editor.css`) | 0 | n/a |
| 42 | `sgs/cta-section` | `.sgs-cta-section__btn` | 3 | CLASS-2 | DEAD | 0 | n/a |
| 43 | `sgs/notice-banner` | `.sgs-notice-banner__text` | 2 | CLASS-2 | DEAD | 0 | n/a |
| 44 | `sgs/testimonial-slider` | `.sgs-testimonial-slider__empty` | 2 | CLASS-2 | DEAD | 0 | n/a |
| 45 | `sgs/cta-section` | `.sgs-cta-section__btn-icon` | 1 | CLASS-2 | DEAD | 0 | n/a |
| 46 | `sgs/google-reviews` | `.sgs-google-reviews__error` | 1 | CLASS-2 | DEAD | 0 | n/a |
| 47 | `sgs/google-reviews` | `.sgs-google-reviews__powered-by` | 1 | CLASS-2 | DEAD | 0 | n/a |

### 3.2 Every finding, grouped by block

Each table row is one declaration. "Competing control" is the control the gate resolved for the same property, as emitted by the block (`.{uid}` is the per-instance class), with its specificity; for CLASS 2 it is the ancestor control that cannot reach the declaring element, for CLASS 3 it is the controls the block has for the property. The bullets under each table give the reach, the leak, whether the element is a CLASS 4 element, and the evidence.

#### sgs/business-info

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `business-info/style.css::.sgs-business-hours__time` | `text-align: right` | CLASS-2 | `.{uid}` (0,1,0) | (0,1,0) | DEFENSIBLE |
| `business-info/style.css::.sgs-business-info__placeholder` | `font-style: italic` | CLASS-2 | `.{uid}` (0,1,0) | (0,1,0) | EDITOR |
| `business-info/style.css::.sgs-business-info__placeholder` | `font-size: 0.875em` | CLASS-2 | `.{uid}` (0,1,0) | (0,1,0) | EDITOR |

- `.sgs-business-hours__time` (DEFENSIBLE). **Reach:** 1 `<dd>` per hours row, at most 7 per block (`business-info/render.php`: `'<div class="sgs-business-hours__row"><dt class="sgs-business-hours__day">%s</dt><dd class="sgs-business-hours__time">%s</dd></div>'`); the `--condensed-inline` variant resets it to `text-align: left`. **Leak:** permanent (no control for the time column). **Evidence:** Documented in `business-info/style.css`: "KEEP: a day/time row layout choice (day left, time right), not a content textAlign".
- `.sgs-business-info__placeholder` (EDITOR). **Reach:** Front end: 0. Every use of `$placeholder` in `business-info/render.php` is gated, e.g. `$html = $sgs_is_editor_render ? '<p class="sgs-business-info sgs-business-phone">' . $placeholder . '</p>' : '';`. **Leak:** n/a. **Evidence:** Editor-only operator hint; the italic muted look is deliberate.

#### sgs/button

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `button/style.css::.sgs-button__note` | `font-weight: 400` | CLASS-2 | `.{uid}.sgs-button` (0,2,0) | (0,1,0) | DEFENSIBLE |

- `.sgs-button__note` (DEFENSIBLE). **Reach:** 1 `<span>` per button that has a `note` (`includes/helpers-button-note.php::sgs_button_note_html`: `'<span class="sgs-button__note">'`). Markup lives outside the block directory, so the gate matched 0 instances. **Leak:** permanent (documented). **Evidence:** Documented in the helper docblock: "a short muted line beside the label ... Plain text, never uppercased". Resetting weight, spacing and case on the note is the stated design.

#### sgs/buybox

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `buybox/style.css::.sgs-buybox .buybox__value-ladder` | `font-size: 0.92em` | CLASS-3 | none on the leak targets named in the note; other controls for this property in the block: `.{uid}.wp-block-sgs-buybox .buybox__price--current` (0,3,0); `.{uid}.wp-block-sgs-buybox .buybox__add-to-cart` (0,3,0); +2 more | (0,2,0) | CLOSED `6f1963c28` |

- `.buybox__value-ladder` (CLOSED `6f1963c28`). **Reach:** `buybox/render.php`: `<ul class="buybox__value-ladder">` once, then per pack-size row `<li class="value-ladder__row">` holding `value-ladder__pack`, `value-ladder__per-unit`, optionally `value-ladder__saving` and a badge: about 3 to 4 text spans x rows (12 at 4 rows). Shown when `showLadder` is on and the ladder is not hidden. **Leak:** permanent (no ladder font-size control). **CLASS 4 element:** element-level: the block calls `sgs_typography_css_rule` 6 times, none for the ladder. **Evidence:** Same literal, byte for byte, as `product-card/style.css::.product-card__value-ladder` (the file says the two are intentionally identical). One fix serves both blocks.

#### sgs/countdown-timer

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `countdown-timer/style.css::.sgs-countdown__number` | `font-weight: 700` | CLASS-2 | `.{uid}.wp-block-sgs-countdown-timer` (0,2,0) | (0,1,0) | CLOSED `75a583e23` |
| `countdown-timer/style.css::.sgs-countdown__number` | `line-height: 1.1` | CLASS-2 | `.{uid}.wp-block-sgs-countdown-timer` (0,2,0) | (0,1,0) | CLOSED `75a583e23` |
| `countdown-timer/style.css::.sgs-countdown__label` | `text-transform: uppercase` | CLASS-2 | `.{uid}.wp-block-sgs-countdown-timer` (0,2,0) | (0,1,0) | CLOSED `75a583e23` |
| `countdown-timer/style.css::.sgs-countdown__label` | `letter-spacing: 0.05em` | CLASS-2 | `.{uid}.wp-block-sgs-countdown-timer` (0,2,0) | (0,1,0) | CLOSED `75a583e23` |
| `countdown-timer/style.css::.sgs-countdown__expired` | `font-weight: 600` | CLASS-2 | `.{uid}.wp-block-sgs-countdown-timer` (0,2,0) | (0,1,0) | CLOSED `75a583e23` |

- `.sgs-countdown__number` (CLOSED `75a583e23`). **Reach:** `countdown-timer/render.php`: `<span class="sgs-countdown__number ...">` once per unit in `$units` (days, hours, minutes, seconds, each optional): up to 4. **Fix:** a `number` typography prefix, so the element has its own full `TypographyControls` surface. The rule also declared `font-size: var(--wp--preset--font-size--xx-large, 3rem)`, a `var()` value this gate does not examine (section 7, gap 1) that blocked a font-size control exactly as a literal does; it was de-specified into `:where()` with the literals, so the control reaches it.
- `.sgs-countdown__label` (CLOSED `75a583e23`). **Reach:** `<span class="sgs-countdown__label">` once per unit: up to 4. **Fix:** a `label` prefix; `text-transform`, `letter-spacing` and the `font-size: var(--wp--preset--font-size--small, 0.875rem)` sit in `:where()`.
- `.sgs-countdown__expired` (CLOSED `75a583e23`). **Reach:** `<div class="sgs-countdown__expired">` once per timer, hidden until the timer ends (`$expired_hidden`). **Fix:** an `expired` prefix; the weight literal and its `font-size` `var()` sit in `:where()`.
- The three prefixes mount as targets of one Typography panel through `src/components/TypographyControls.js::TypographyTargetSwitcher`, section 6.

#### sgs/cta-section

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `cta-section/style.css::.sgs-cta-section__headline` | `font-weight: 700` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | FIX |
| `cta-section/style.css::.sgs-cta-section__headline` | `line-height: 1.2` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | FIX |
| `cta-section/style.css::.sgs-cta-section__body` | `line-height: 1.6` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | FIX |
| `cta-section/style.css::.sgs-cta-section__btn` | `font-weight: 600` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | DEAD |
| `cta-section/style.css::.sgs-cta-section__btn` | `text-align: center` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | DEAD |
| `cta-section/style.css::.sgs-cta-section__btn` | `line-height: 1.4` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | DEAD |
| `cta-section/style.css::.sgs-cta-section__btn-icon` | `font-size: 1.2em` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | DEAD |
| `cta-section/style.css::.sgs-cta-section__ribbon` | `font-weight: 700` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `cta-section/style.css::.sgs-cta-section__ribbon` | `letter-spacing: 0.05em` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `cta-section/style.css::.sgs-cta-section__ribbon` | `text-transform: uppercase` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `cta-section/style.css::.sgs-cta-section__ribbon` | `line-height: 1.4` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | DEFENSIBLE |

- `.sgs-cta-section__headline` (FIX). **Reach:** The headline is an InnerBlocks child: `edit.js::CTA_TEMPLATE` is `[ 'sgs/heading', { level: 'h2', className: 'sgs-cta-section__headline' } ]`. 1 per CTA section. `sgs/heading` has its own controls at `.{uid}.wp-block-sgs-heading` (0,2,0), which beat this rule (0,1,0), so the child is reachable; the cta-section root controls are not. **Leak:** default-state only for the child block's own controls; permanent for the cta-section root controls. **Evidence:** `cta-section/render.php` states the design: root typography is emitted to `$root_sel` and "rel[ies] on plain CSS inheritance to reach their InnerBlocks children". Declaring weight and line-height on the child defeats exactly that inheritance.
- `.sgs-cta-section__body` (FIX). **Reach:** `edit.js::CTA_TEMPLATE`: `[ 'sgs/text', { className: 'sgs-cta-section__body' } ]`. 1 per CTA section. **Leak:** as the headline. **Evidence:** As the headline: root `lineHeight` cannot reach the body text.
- `.sgs-cta-section__btn` (DEAD). **Reach:** No markup emits `sgs-cta-section__btn`: absent from every `render.php`, `edit.js`, `save.js`, `includes/` and `theme/` file (only `style.css` and `editor.css` name it). The buttons are `sgs/multi-button` InnerBlocks (`edit.js::CTA_TEMPLATE`). **Leak:** n/a. **Evidence:** Leftover from the pre-FR-22-6 scalar-button markup. Deleting the rule changes nothing rendered.
- `.sgs-cta-section__btn-icon` (DEAD). **Reach:** No markup emits `sgs-cta-section__btn-icon` (same search as `__btn`). **Leak:** n/a. **Evidence:** As `__btn`.
- `.sgs-cta-section__ribbon` (DEFENSIBLE). **Reach:** `cta-section/render.php`: `$ribbon_html = '<span class="sgs-cta-section__ribbon" aria-hidden="true">' . esc_html( $ribbon ) . '</span>';` once, only when ribbon text is set. **Leak:** permanent. **Evidence:** A corner badge (absolute positioned, uppercase, tracked). Reading from source: a badge is not body text, so the section's typography should not restyle it. Intent not documented.

#### sgs/form

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `form/style.css::.sgs-form-field__column-heading` | `font-size: 11px` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `form/style.css::.sgs-form-field__column-heading` | `letter-spacing: 0.12em` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `form/style.css::.sgs-form-field__column-heading` | `text-transform: uppercase` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `form/style.css::.sgs-form-field__row-heading` | `font-size: 13px` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `form/style.css::.sgs-form-field__row-heading` | `font-weight: 500` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `form/style.css::.sgs-form-field__input` | `line-height: 1.5` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `6f1963c28` |
| `form/style.css::.sgs-form-field__label` | `font-weight: 600` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `6f1963c28` |
| `form/style.css::.sgs-form-tile__icon` | `font-size: 1.5rem` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | FIX |
| `form/style.css::.sgs-form-tile__icon` | `line-height: 1` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | FIX |
| `form/style.css::.sgs-form-tile__label` | `font-weight: 500` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | FIX |
| `form/style.css::.sgs-form-field__file-label` | `text-align: center` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `form/style.css::.sgs-form-field__file-button` | `font-size: 12.5px` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `form/style.css::.sgs-form-field__file-button` | `line-height: 1.5` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `form/style.css::.sgs-form-field__file-button` | `letter-spacing: 0.12em` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `form/style.css::.sgs-form-field__file-button` | `text-transform: uppercase` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `form/style.css::.sgs-form-file__progress` | `text-align: center` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `form/style.css::.sgs-form-field__consent-text` | `line-height: 1.5` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | FIX |
| `form/style.css::.sgs-form__progress-step-number` | `font-size: 0.8125rem` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `form/style.css::.sgs-form__progress-step-number` | `font-weight: 600` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `form/style.css::.sgs-form__button` | `font-weight: 600` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | FIX |
| `form/style.css::.sgs-form__button` | `line-height: 1.5` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | FIX |
| `form/style.css::.sgs-form-review__term` | `font-weight: 600` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | FIX |

- `.sgs-form-field__column-heading` (DEFENSIBLE). **Reach:** LIVE, built from a class map: `includes/forms/field-render-helpers.php::field_headings` (`'columnHeading' => 'sgs-form-field__column-heading'`), one `<span aria-hidden="true">` per field that sets `columnHeading`. A literal search for the class finds only the map, so reach depends on content. **Leak:** permanent. **CLASS 4 element:** element-level: the form has no heading-typography control. **Evidence:** Visual micro-label ("SPH") above a box, 11px uppercase tracked. Reading from source: a table-heading look; intent not documented. Reach per field is 1; count per form depends on how many fields set it (CANNOT-TELL without content).
- `.sgs-form-field__row-heading` (DEFENSIBLE). **Reach:** LIVE, same map: `'rowHeading' => 'sgs-form-field__row-heading'`, one `<span aria-hidden="true">` per field that sets `rowHeading`. **Leak:** permanent. **CLASS 4 element:** element-level (as above). **Evidence:** As the column heading.
- `.sgs-form-field__input` (CLOSED `6f1963c28`). **Reach:** Every text-entry control: `class="sgs-form-field__input"` in `form-field-address/render.php` and the other `form-field-*` blocks (text, email, phone, number, date, select, textarea). 1 per input, select and textarea. **Leak:** permanent (`fieldFontSize` exists, no field line-height control). **CLASS 4 element:** element-level: no field line-height control. **Evidence:** Root `lineHeight` cannot reach the inputs (`.sgs-form-field__input { line-height: 1.5 }`).
- `.sgs-form-field__label` (CLOSED `6f1963c28`). **Reach:** `includes/forms/field-render-helpers.php::field_label`: `'<label for="%s" class="sgs-form-field__label%s">'`, called from 9 field blocks, plus `<legend class="sgs-form-field__label">` in `form-field-checkbox`, `form-field-radio` and `form-field-tiles`. 1 per labelled field. **Leak:** permanent (no label typography control). **CLASS 4 element:** element-level: no label typography control at all. **Evidence:** Root `fontWeight` cannot reach field labels (`font-weight: 600`); the same rule also hardcodes `font-size: var(--wp--preset--font-size--small, 0.9375rem)`, which this gate does not examine.
- `.sgs-form-tile__icon` (FIX). **Reach:** `form-field-tiles/render.php`: `echo '<span class="sgs-form-tile__icon" aria-hidden="true">'` once per tile that has an icon. **Leak:** permanent. **CLASS 4 element:** element-level. **Evidence:** Tiles field only.
- `.sgs-form-tile__label` (FIX). **Reach:** `form-field-tiles/render.php`: `echo '<span class="sgs-form-tile__label">' . esc_html( $tile['label'] ?? '' ) . '</span>';` once per tile. **Leak:** permanent. **CLASS 4 element:** element-level. **Evidence:** Tiles field only.
- `.sgs-form-field__file-label` (DEFENSIBLE). **Reach:** `form-field-file/render.php`: `echo '<div class="sgs-form-field__file-label">'` once per file field. **Leak:** permanent. **Evidence:** Centred upload-panel caption. Reading from source: a panel layout choice; intent not documented.
- `.sgs-form-field__file-button` (DEFENSIBLE). **Reach:** `form-field-file/render.php`: `<span class="sgs-form-field__file-button" aria-hidden="true">` once per file field. 4 declarations (size, line-height, tracking, case). **Leak:** permanent. **Evidence:** A decorative "Choose file" chip inside the upload panel (aria-hidden). Reading from source: button-like chrome; intent not documented.
- `.sgs-form-file__progress` (DEFENSIBLE). **Reach:** `form-field-file/render.php`: `echo '<div class="sgs-form-file__progress" hidden>'` once per file field, visible only while uploading. **Leak:** permanent. **Evidence:** Transient status text.
- `.sgs-form-field__consent-text` (FIX). **Reach:** `form-field-consent/render.php`: `echo '<span class="sgs-form-field__consent-text">'` once per consent field. **Leak:** permanent. **CLASS 4 element:** element-level. **Evidence:** Root `lineHeight` cannot reach the consent wording.
- `.sgs-form__progress-step-number` (DEFENSIBLE). **Reach:** `form/render.php`: `<span class="sgs-form__progress-step-number">` once per step of a multi-step form (the progress bar). **Leak:** permanent. **Evidence:** A numbered bubble in a progress indicator; reading from source: UI chrome; intent not documented.
- `.sgs-form__button` (FIX). **Reach:** 3 instances matched in the form markup (submit plus step navigation). `form/render.php` documents the existing overrides: "`.sgs-form__button` (style.css) fixes font-weight:600 and font-size ... these are independent overrides on the SAME scoped rule". **Leak:** weight: default-state only (`submitFontWeight` overrides it); line-height: permanent (no submit line-height control). **Evidence:** The `font-weight` row is therefore a controlled default; only `line-height: 1.5` has no control.
- `.sgs-form-review__term` (FIX). **Reach:** Built in JavaScript only: `form/view.js`: `dt.className = 'sgs-form-review__term';`, one `<dt>` per answered field on the review step. **Leak:** permanent. **CLASS 4 element:** element-level. **Evidence:** Review step of a multi-step form only.

#### sgs/google-reviews

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `google-reviews/style.css::.sgs-google-reviews__error` | `font-weight: 600` | CLASS-2 | `.{uid}.wp-block-sgs-google-reviews.sgs-google-reviews` (0,3,0) | (0,1,0) | DEAD |
| `google-reviews/style.css::a.sgs-google-reviews__maps-link` | `font-size: 13.5px` | CLASS-2 | `.{uid}.wp-block-sgs-google-reviews.sgs-google-reviews` (0,3,0) | (0,1,1) | DEFENSIBLE |
| `google-reviews/style.css::.sgs-google-reviews__breakdown-row` | `font-size: 0.875rem` | CLASS-2 | `.{uid}.wp-block-sgs-google-reviews.sgs-google-reviews` (0,3,0) | (0,1,0) | DEFENSIBLE |
| `google-reviews/style.css::.sgs-google-reviews__stars` | `line-height: 1` | CLASS-2 | `.{uid}.wp-block-sgs-google-reviews.sgs-google-reviews` (0,3,0) | (0,1,0) | DEFENSIBLE |
| `google-reviews/style.css::.sgs-google-reviews__powered-by` | `font-size: 0.75rem` | CLASS-2 | `.{uid}.wp-block-sgs-google-reviews.sgs-google-reviews` (0,3,0) | (0,1,0) | DEAD |
| `google-reviews/style.css::.sgs-google-reviews__badge-text span` | `font-size: 0.8125rem` | CLASS-2 | `.{uid}.wp-block-sgs-google-reviews.sgs-google-reviews` (0,3,0) | (0,1,1) | DEFENSIBLE |

- `.sgs-google-reviews__error` (DEAD). **Reach:** No markup emits `sgs-google-reviews__error` (searched every `.php` and `.js` under `src/` and `includes/`). **Leak:** n/a. **Evidence:** The rule's own comment calls it the "API failure notice"; nothing renders it.
- `.sgs-google-reviews__maps-link` (DEFENSIBLE). **Reach:** `google-reviews/render.php`: `class="sgs-google-reviews__maps-link"` once per review card, plus `...--place` once in the attribution. At 4 reviews, 5. **Leak:** permanent (the 12 element controls do not include the maps link). **CLASS 4 element:** element-level: no control for it. **Evidence:** The block is a look-alike of Google's own widget: `style.css` header "THE BASELINE IS THE GOOGLE REVIEWS WIDGET" and the recorded decision that Google's sizes are accepted defaults. The leak is real; the value is deliberate. Whether the maps link should gain a control is a design call.
- `.sgs-google-reviews__breakdown-row` (DEFENSIBLE). **Reach:** `google-reviews/render.php`: `<div class="sgs-google-reviews__breakdown-row" role="row">` once per star level, 5 per breakdown. **Leak:** permanent. **CLASS 4 element:** element-level: no control for it. **Evidence:** Google-widget fidelity (as above).
- `.sgs-google-reviews__stars` (DEFENSIBLE). **Reach:** `google-reviews/render.php`: `'<div class="sgs-google-reviews__stars' . ...` once per star row (each review plus the header). **Leak:** permanent. **Evidence:** `line-height: 1` on an SVG star row is a rendering necessity, not text styling.
- `.sgs-google-reviews__powered-by` (DEAD). **Reach:** No markup emits `sgs-google-reviews__powered-by` (searched every `.php` and `.js` under `src/` and `includes/`). **Leak:** n/a. **Evidence:** Nothing renders it.
- `.sgs-google-reviews__badge-text` (DEFENSIBLE). **Reach:** `google-reviews/render.php`: `<div class="sgs-google-reviews__badge-text">` once in the badge layout, holding a `<strong>` and a `<span>` (the rule targets the `<span>`). **Leak:** permanent. **CLASS 4 element:** element-level: no control for it. **Evidence:** Google-widget fidelity (as above).

#### sgs/notice-banner

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `notice-banner/style.css::.sgs-notice-banner__icon` | `font-size: 20px` | CLASS-2 | `.{uid}.wp-block-sgs-notice-banner` (0,2,0); `.sgs-notice-banner` (0,1,0) | (0,1,0) | DEFENSIBLE |
| `notice-banner/style.css::.sgs-notice-banner__icon` | `line-height: 1` | CLASS-2 | `.{uid}.wp-block-sgs-notice-banner` (0,2,0); `.sgs-notice-banner` (0,1,0) | (0,1,0) | DEFENSIBLE |
| `notice-banner/style.css::.sgs-notice-banner__text` | `line-height: 1.5` | CLASS-2 | `.{uid}.wp-block-sgs-notice-banner` (0,2,0); `.sgs-notice-banner` (0,1,0) | (0,1,0) | DEAD |
| `notice-banner/style.css::.sgs-notice-banner__text strong` | `font-weight: 700` | CLASS-2 | `.{uid}.wp-block-sgs-notice-banner` (0,2,0); `.sgs-notice-banner` (0,1,0) | (0,1,1) | DEAD |
| `notice-banner/style.css::.sgs-notice-banner__close` | `font-size: 1.25rem` | CLASS-2 | `.{uid}.wp-block-sgs-notice-banner` (0,2,0); `.sgs-notice-banner` (0,1,0) | (0,1,0) | DEFENSIBLE |
| `notice-banner/style.css::.sgs-notice-banner__close` | `line-height: 1` | CLASS-2 | `.{uid}.wp-block-sgs-notice-banner` (0,2,0); `.sgs-notice-banner` (0,1,0) | (0,1,0) | DEFENSIBLE |

- `.sgs-notice-banner__icon` (DEFENSIBLE). **Reach:** `notice-banner/render.php`: `$sgs_nb_icon_classes` once per banner with an icon. **Leak:** default-state only (`iconSize` owns the glyph). **Evidence:** The block has its own `iconSize` control for the glyph (`block.json` attributes `iconSize`, `iconStyle`); a body-typography control should not resize an icon.
- `.sgs-notice-banner__text` (DEAD). **Reach:** No current markup emits `sgs-notice-banner__text`: `notice-banner/render.php` says "FR-22-6: text content is $content (sgs/text InnerBlock). R-31-14: no fallback." Only `style.css`, `editor.css` and one conformance fixture (`scripts/tests/fixtures/conformance/sgs-notice-banner.html`) name it. **Leak:** n/a. **Evidence:** Legacy scalar-text markup. The message is an `sgs/text` child with its own controls. Two rows (`__text` and `__text strong`).
- `.sgs-notice-banner__close` (DEFENSIBLE). **Reach:** `notice-banner/render.php`: `<button class="sgs-notice-banner__close" ...><span aria-hidden="true">&times;</span></button>` once per dismissible announcement. **Leak:** permanent. **Evidence:** A glyph button; a body-typography control should not resize the dismiss cross.

#### sgs/option-picker

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `option-picker/style.css::.sgs-option-picker__pill-text` | `line-height: 1.25` | CLASS-3 | none on the leak targets named in the note; other controls for this property in the block: `.{uid}.wp-block-sgs-option-picker .sgs-option-picker__label` (0,3,0); `.{uid}.wp-block-sgs-option-picker .sgs-option-picker__pill` (0,3,0); +1 more | (0,1,0) | FIX |

- `.sgs-option-picker__pill-text` (FIX). **Reach:** `option-picker/render.php`: `$pill_text_html = '<span class="sgs-option-picker__pill-text"><span class="sgs-option-picker__pill-label">' . ...` once per option, inside `<span class="sgs-option-picker__pill%s">`. Every pill of every picker (product-card also styles pills of its own pickers: `sgs_typography_css_rule( $attributes, 'pill', '.' . $sgs_card_uid . ' .sgs-option-picker__pill' )`). The wrapper nests label, term badge, sub-label and term description. **Leak:** permanent for icon-less labels: `pillLineHeight` and `labelLineHeight` never reach the pill text. **CLASS 4 element:** sub-label and term-badge have no controls. **Evidence:** MISCLASSIFIED by the gate as CLASS 3. The pill carries the control (`sgs_typography_css_rule( $attributes, 'pill', $sel_pill )`, 3 classes) and `pill-text` is its descendant that declares its own `line-height: 1.25`, so this is CLASS 2 for `pillLineHeight` and CLASS 3 for the sub-label. The gate dropped the pill from its markup model because the class is glued to a sprintf `%s`.

#### sgs/post-grid

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `post-grid/style.css::.sgs-post-grid__empty, .sgs-post-grid__error` | `text-align: center` | CLASS-3 | none on the leak targets named in the note; other controls for this property in the block: `.{uid}.wp-block-sgs-post-grid .sgs-post-grid__title` (0,3,0) | (0,1,0) | DEFENSIBLE |

- `.sgs-post-grid__error` (DEFENSIBLE). **Reach:** `post-grid/render.php`: `echo '<div class="sgs-post-grid__empty" role="status">'` holding `__empty-heading` and `__empty-text`; renders only when the query returns no posts. `view.js` builds `sgs-post-grid__error` the same way on a failed load. **Leak:** permanent for the empty-state text. **Evidence:** A centred empty/error message block; the centring is the point of the state. 1 container, 2 text children, and only in the empty state.

#### sgs/process-steps

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `process-steps/style.css::.sgs-process-steps__step` | `text-align: center` | CLASS-3 | none on the leak targets named in the note; other controls for this property in the block: `.{uid}.sgs-process-steps .sgs-process-steps__title` (0,3,0) | (0,1,0) | CLOSED `75a583e23` |

- `.sgs-process-steps__step` (CLOSED `75a583e23`). **Reach:** `process-steps/render.php`: each step holds `__icon` (optional), `__number`, `<hN class="sgs-process-steps__title">` and `__description` (optional). 3 leak targets per step: 12 at 4 steps. The `--layout-list` variant resets the step to `text-align: left`; every other layout is centred. **Fix:** each leak target owns its alignment: `icon` and `description` are new prefixes and the existing `number` family is completed, so no `step` prefix is needed. The title keeps `titleTextAlign`. The step's `text-align: center` is wrapped in `:where()` and remains the default.

#### sgs/product-card

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `product-card/style.css::.product-card .price-from-label` | `font-family: 'Inter', sans-serif` | CLASS-2 | `.{uid} .sgs-product-card__price, .{uid} .price, .{uid} .price-from-amount` (0,2,0) | (0,2,0) | FIX |
| `product-card/style.css::.product-card__value-ladder` | `font-size: 0.92em` | CLASS-3 | none on the leak targets named in the note; other controls for this property in the block: `.{uid} .sgs-product-card__title, .{uid} h3` (0,2,0); `.{uid} .sgs-product-card__price, .{uid} .price, .{uid} .price-from-amount` (0,2,0); +10 more | (0,1,0) | CLOSED `6f1963c28` |

- `.price-from-label` (FIX). **Reach:** `product-card/render.php`: `<span class="price-from-label">` at two template sites, once per card that shows a "From" price. **Leak:** permanent (`priceFromLabelFontSize` exists; no font-family control for the label). **CLASS 4 element:** element-level: no `priceFromLabelFontFamily`. **Evidence:** `font-family: 'Inter', sans-serif` is a literal font name in plugin CSS, which also conflicts with the project rule that client typography lives in `sites/<client>/`. `priceFontFamily` paints `.price` and `.price-from-amount`, so setting a price font leaves "From" in Inter.
- `.product-card__value-ladder` (CLOSED `6f1963c28`). **Reach:** `product-card/render.php`: `class="product-card__value-ladder"` once per card that shows a ladder, then `value-ladder__row` x rows holding 3 to 4 spans: 12 text spans at 4 rows, on every such card of a shop grid. **Leak:** permanent (no ladder font-size control). **CLASS 4 element:** element-level: product-card calls the helper 12 times, none for the ladder. **Evidence:** Identical declaration to `buybox/style.css::.sgs-buybox .buybox__value-ladder`; named in the brief as a known real finding.

#### sgs/product-faq

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `product-faq/style.css::.sgs-product-faq-item__question` | `font-weight: 600` | CLASS-2 | `.{uid}.wp-block-sgs-product-faq` (0,2,0) | (0,1,0) | CLOSED `75a583e23` |
| `product-faq/style.css::.sgs-product-faq-item__question` | `font-size: 1rem` | CLASS-2 | `.{uid}.wp-block-sgs-product-faq` (0,2,0) | (0,1,0) | CLOSED `75a583e23` |
| `product-faq/style.css::.sgs-product-faq-item__question` | `line-height: 1.4` | CLASS-2 | `.{uid}.wp-block-sgs-product-faq` (0,2,0) | (0,1,0) | CLOSED `75a583e23` |

- `.sgs-product-faq-item__question` (CLOSED `75a583e23`). **Reach:** `product-faq-item/render.php`: `<summary class="sgs-product-faq-item__question" ...>` once per FAQ item. 3 declarations: weight, size, line-height. **Fix:** a `question` prefix on the PARENT `sgs/product-faq`. Its uid class is a genuine ancestor of every child `<summary>`, and `product-faq-item` declares no typography attributes, no `text` cluster and no stylesheet, so one parent surface reaches every question. The three literals sit in `:where()`.
- **Open-state weight removed.** The rule's open-state `font-weight: 700` was removed, not kept. Its comment had claimed WCAG SC 1.4.1 (Use of Colour) required it as the non-colour cue for the open state. The Understanding document for 1.4.1 says the criterion "does not apply to situations where color has not been used to convey information", and the open state is carried by the revealed answer panel and the chevron's 180 degree rotation. Technique G182 lists bold as one sufficient technique, and W3C states that techniques "are not required to meet WCAG". GOV.UK Frontend's Details and Accordion, USWDS's Accordion and the WordPress core Details block all ship with no open-state weight step. Confidence: medium-high. No W3C document says in so many words that a disclosure state sits outside 1.4.1.

#### sgs/store-selector

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `store-selector/style.css::.sgs-store-selector__item a[aria-current="true"]` | `font-weight: 600` | CLASS-2 | `.{uid}.sgs-store-selector` (0,2,0) | (0,2,1) | DEFENSIBLE |

- `.sgs-store-selector__item` (DEFENSIBLE). **Reach:** `store-selector/render.php`: `( $is_current ? ' aria-current="true"' : '' )`, so the selector matches 1 link per list (the current store). **Leak:** permanent. **Evidence:** State emphasis on the current item. The gate exempts `:hover` and `:focus` states (E3) but not `[aria-current]`, a gate-model gap rather than a block defect.

#### sgs/table-of-contents

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `table-of-contents/style.css::.sgs-toc__title` | `font-weight: 600` | CLASS-2 | `.{uid}.wp-block-sgs-table-of-contents` (0,2,0) | (0,1,0) | FIX |
| `table-of-contents/style.css::.sgs-toc__empty` | `font-style: italic` | CLASS-2 | `.{uid}.wp-block-sgs-table-of-contents` (0,2,0) | (0,1,0) | EDITOR |

- `.sgs-toc__title` (FIX). **Reach:** `table-of-contents/render.php`: `<summary class="sgs-toc__title">` (collapsible) or `<p class="sgs-toc__title">` once per TOC that has a title. **Leak:** permanent. **Evidence:** Root `fontWeight` cannot reach the title. The same rule hardcodes `font-size: var(--wp--preset--font-size--medium, 1rem)` (not examined by the gate).
- `.sgs-toc__empty` (EDITOR). **Reach:** Front end: 0. `sgs-toc__empty` appears only in `table-of-contents/edit.js` (`<p className="sgs-toc__empty">`), never in `render.php`. **Leak:** n/a. **Evidence:** Editor-only empty-state hint.

#### sgs/testimonial-slider

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `testimonial-slider/style.css::.sgs-testimonial-slider__arrow` | `font-size: 24px` | CLASS-2 | `.{uid}.wp-block-sgs-testimonial-slider` (0,2,0); `.wp-block-sgs-testimonial-slider` (0,1,0) | (0,1,0) | DEFENSIBLE |
| `testimonial-slider/style.css::.sgs-testimonial-slider__arrow` | `line-height: 1` | CLASS-2 | `.{uid}.wp-block-sgs-testimonial-slider` (0,2,0); `.wp-block-sgs-testimonial-slider` (0,1,0) | (0,1,0) | DEFENSIBLE |
| `testimonial-slider/style.css::.sgs-testimonial-slider__pause-btn` | `font-size: 16px` | CLASS-2 | `.{uid}.wp-block-sgs-testimonial-slider` (0,2,0); `.wp-block-sgs-testimonial-slider` (0,1,0) | (0,1,0) | DEFENSIBLE |
| `testimonial-slider/style.css::.sgs-testimonial-slider__pause-icon` | `font-size: 14px` | CLASS-2 | `.{uid}.wp-block-sgs-testimonial-slider` (0,2,0); `.wp-block-sgs-testimonial-slider` (0,1,0) | (0,1,0) | DEFENSIBLE |
| `testimonial-slider/style.css::.sgs-testimonial-slider__pause-icon` | `line-height: 1` | CLASS-2 | `.{uid}.wp-block-sgs-testimonial-slider` (0,2,0); `.wp-block-sgs-testimonial-slider` (0,1,0) | (0,1,0) | DEFENSIBLE |
| `testimonial-slider/style.css::.sgs-testimonial-slider__empty` | `text-align: center` | CLASS-2 | `.{uid}.wp-block-sgs-testimonial-slider` (0,2,0) | (0,1,0) | DEAD |
| `testimonial-slider/style.css::.sgs-testimonial-slider__empty` | `font-style: italic` | CLASS-2 | `.{uid}.wp-block-sgs-testimonial-slider` (0,2,0) | (0,1,0) | DEAD |

- `.sgs-testimonial-slider__arrow` (DEFENSIBLE). **Reach:** `testimonial-slider/render.php`: `$arrow_prev_html` and `$arrow_next_html`, 2 per slider when `showArrows` is on. **Leak:** permanent. **Evidence:** Glyph buttons (24px); a body-typography control should not resize them. The block has no arrow size control, so size is fixed.
- `.sgs-testimonial-slider__pause-btn` (DEFENSIBLE). **Reach:** Built in JavaScript only: `testimonial-slider/view.js`: `pauseBtn.className = 'sgs-testimonial-slider__pause-btn';`, 1 per autoplaying slider. **Leak:** permanent. **Evidence:** UI chrome glyph button.
- `.sgs-testimonial-slider__pause-icon` (DEFENSIBLE). **Reach:** Built in JavaScript only: `view.js`: `icon.className = 'sgs-testimonial-slider__pause-icon';`, 1 per autoplaying slider. 2 declarations. **Leak:** permanent. **Evidence:** UI chrome glyph.
- `.sgs-testimonial-slider__empty` (DEAD). **Reach:** No markup emits `sgs-testimonial-slider__empty` (absent from `render.php`, `view.js`, `edit.js`, `includes/`). 2 declarations. **Leak:** n/a. **Evidence:** Nothing renders it.


## 4. Item 3b: CANNOT-RESOLVE (61 findings)

The gate reports CANNOT-RESOLVE when it could not tell which element a control paints, or how the declaring element relates to it, and it will not guess. Section 4.1 groups the 55 by why. Section 4.2 says what they are once the cause is removed. Section 4.3 lists every one, as `node scripts/check-hardcoded-render-defaults.js --survey --verbose` prints them.

### 4.1 Causes, with counts

| Cause | Findings | Why the control or markup could not be resolved | What the gate would need |
|---|---|---|---|
| **A. Editor-only markup** | 0 | A declaring class that exists only in `edit.js` renders nothing on the front end. The gate no longer reports one (`87eb25957`): a class with no emitter in the block's PHP, its required PHP, its other scripts or `includes/` is excluded. | Done. |
| **B. Markup built outside the block directory** | 19 | The class is emitted by a shared PHP builder in `includes/` (`class-grid-pagination.php`, `buybox-guided.php`, `product-card-*.php`), or built at run time from a prefix argument (`$base_class . '__page-btn'`). `readBlockPhpFiles` now follows a block's `require` / `require_once` one hop (`53ba85750`), which resolved the 12 `sgs/post-grid` card-part findings. The hop is not transitive, deliberately: `includes/render-helpers.php` requires the whole helper tree and almost every block requires it, so a transitive follower would put every helper's markup into every block's element model and manufacture false findings. The 19 rows that remain carry the original B label (`buybox` guided 6, `card-grid` 2, `post-grid` page buttons 2, `product-card` 9). Which of the 19 are caused by a missing `require` and which by a class built from a prefix argument is **not re-counted**: the original 31 was attributed by reading the markup, and only the 12 resolved rows are measured. | Resolve a class built as `$prefix . '__x'` from the call site's prefix argument (the hop stays non-transitive). |
| **C. JavaScript-built markup** | 4 | The element is created in `view.js` / `guided.js` (`el.className = '...'`), so no PHP tag carries it. | Parse `className = '...'` assignments and `createElement` chains in the block's front-end scripts into the markup tree. |
| **D. A control's target element is not a parseable literal tag** | 20 | The declaring element IS found, but at least one control for the same property targets an element whose class is assembled in a PHP variable (`buybox/render.php`: `$add_to_cart_button_classes = 'wp-element-button buybox__add-to-cart'`) or inside a sprintf template (`cart/render.php`: `'<span class="sgs-cart__badge%2$s" ...'`). One unplaceable control makes every declaration of that property in the block unresolvable, even when that control is on an unrelated element (a notify-form label against an add-to-cart button). | Resolve a class held in a `$classes` variable and a class glued to a sprintf placeholder. Separately, decide a declaration against only the controls that could plausibly be its ancestors, so an unplaceable control on a sibling leaf does not poison it. |
| **E. A bare-tag declaring selector** | 2 | The declaring selector ends in a tag (`.product-card h3`, `.sgs-theme-toggle__icon svg`), which has no class for `matchInstances` to match. | Match a tag compound through its nearest classed ancestor and the tags present in that subtree. |
| **F. A printf placeholder as the tag name** | 1 | `media/render.php`: `'<%1$s class="sgs-media__caption">%2$s</%1$s>'`. The tag scanner requires a letter after `<`, so the element is never added to the markup tree. The control selector also starts with an unresolved `$id_wrap`. | Treat `<%N$s` as an element of unknown tag and keep its class list; evaluate `$id_wrap = '.' . $scope_esc`. |
| **G. A printf placeholder glued to a class token** | 0 | `option-picker/render.php`: `'<span class="sgs-option-picker__pill%s">%s</span>'`. The class token `sgs-option-picker__pill%s` fails the class-name test and the whole class is dropped, so the pill (the control's element) is missing from the model. Its one finding, the pill's own `line-height: 1`, is gone: the declaration was dead (a flex or grid container whose only text overrode it) and was removed in `4a4d442fd`. The gap itself is still open for any future declaration on a sprintf-glued class. | Strip a trailing `%s` / `%N$s` from a class token and keep the stem. |
| **H. A control selector in a required `includes/` file cannot be resolved** | 9 | Newly visible after `53ba85750`: the gate now reads `sgs/account` (6) and `sgs/nav-drawer-menu` (3) required `includes/` files, which hold typography calls whose selectors it cannot resolve to a class (survey reason: "a control selector in the PHP could not be resolved to a class"). The cause inside those selectors is not yet diagnosed. | Diagnose per call; likely the same variable-built selectors as cause D. |
| Total | 55 | | |

Net effect of the `require` hop on the CANNOT-RESOLVE count is -3 (64 to 61): 12 `sgs/post-grid` findings resolved and 9 findings that were invisible appeared (H). Most rows labelled B in the original triage were never require-caused: `sgs/buybox`'s notify-heading rows come from `notify-form.php`, which was always inside the block directory, and fail on dynamic class markup (cause D) instead. The original count of 31 for cause B overstated what a `require` follower could fix.

### 4.2 What the 55 are really, one level down

- **CLASS 4 shaped: 40 of 61** (52 at triage, less the 12 `sgs/post-grid` card parts that now resolve and are no longer findings, though those elements still have no control). For these the block has controls for the property but none on, or above, the declaring element (the only controls are on sibling leaf elements such as a title, a price or a label), so the real question is "this element has no control", not "the gate could not place it". This is a reading of the controls list and the markup, not gate output; the gate cannot prove it.
- **Own control already exists: 1** (`media` figcaption font-size). The gate now checks a resolved own control first (`87eb25957`), but this selector list also holds a bare `figcaption` the gate cannot place (section 7 gap 4), so the row stays CANNOT-RESOLVE. CLASS 1 in effect.
- **CANNOT-TELL from source: 5** (`product-card` `h3` specificity tie; `cart` badge x2; `buybox` cart-price; `theme-toggle` icon glyph, which is not text).
- **Newly visible, not classified: 9** (cause H: `sgs/account` 6, `sgs/nav-drawer-menu` 3). Whether they are CLASS 4 shaped has not been read.

40 + 1 + 5 + 9 = 55.

### 4.3 Every finding

| Block | Finding (`file::selector`) | Declaration | Cause | CLASS 4 shaped | Note |
|---|---|---|---|---|---|
| `sgs/account` | `account/style.css::.sgs-account__card-desc` | `font-size: 0.9em` | H | not assessed |  |
| `sgs/account` | `account/style.css::.sgs-account__chip` | `font-size: 0.85em` | H | not assessed |  |
| `sgs/account` | `account/style.css::.sgs-account__chip` | `font-weight: 600` | H | not assessed |  |
| `sgs/account` | `account/style.css::.sgs-account__progress-step` | `text-align: center` | H | not assessed |  |
| `sgs/account` | `account/style.css::.sgs-account__progress-step` | `font-size: 0.8em` | H | not assessed |  |
| `sgs/account` | `account/style.css::.sgs-account__guest-line` | `text-align: center` | H | not assessed |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox .buybox__stock` | `font-weight: 600` | D | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox .buybox__cart-price` | `font-weight: 700` | D | see note | CANNOT-TELL: may sit inside the add-to-cart button that `addToCartFontWeight` paints |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox__notify-heading` | `font-weight: 700` | D | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox__notify-heading` | `font-size: 1rem` | D | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox__notify-label` | `font-size: 0.9rem` | D | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox__notify-label` | `font-weight: 600` | D | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox__notify-email` | `font-size: 1rem` | D | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox__notify-consent-label` | `font-size: 0.9rem` | D | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox__notify-submit` | `font-size: 1rem` | D | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox__notify-submit` | `font-weight: 600` | D | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox__notify-status` | `font-size: 0.9rem` | D | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox .sgs-buybox__saving-badge` | `font-size: 12px` | D | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox .sgs-buybox__saving-badge` | `font-weight: 400` | D | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox .sgs-buybox__saving-badge` | `letter-spacing: 0.1em` | D | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox .sgs-buybox__saving-badge` | `text-transform: uppercase` | D | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox-guided__meter-btn` | `font-size: 0.8125rem` | B | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox-guided__meter-btn` | `line-height: 1.2` | B | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox-guided__meter-index` | `font-weight: 600` | B | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox-guided__meter-compact` | `font-size: 0.8125rem` | B | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox-guided__group-title` | `font-size: 1rem` | B | yes |  |
| `sgs/buybox` | `buybox/style.css::.sgs-buybox-guided__group-title` | `font-weight: 600` | B | yes |  |
| `sgs/card-grid` | `card-grid/style.css::.sgs-card-grid__page-btn` | `font-size: 0.875rem` | B | yes |  |
| `sgs/card-grid` | `card-grid/style.css::.sgs-card-grid__page-btn` | `font-weight: 600` | B | yes |  |
| `sgs/cart` | `cart/style.css::.sgs-cart__badge` | `font-size: 11px` | D | see note | CLASS 2 or CLASS 4 depending on whether the badge sits inside `.sgs-cart__trigger` (`pillFontSize`), whose markup the gate cannot see; CANNOT-TELL |
| `sgs/cart` | `cart/style.css::.sgs-cart__badge` | `font-weight: 700` | D | see note | CLASS 2 or CLASS 4 depending on whether the badge sits inside `.sgs-cart__trigger` (`pillFontSize`), whose markup the gate cannot see; CANNOT-TELL |
| `sgs/media` | `media/style.css::.wp-block-sgs-media figcaption, .wp-block-sgs-media .sgs-media__cap...` | `font-size: 0.9em` | F | see note | own control exists: `captionFontSize` on `.sgs-media__caption`; the selector prefix `$id_wrap` did not resolve: probably CLASS 1 |
| `sgs/media` | `media/style.css::.sgs-video__bar` | `line-height: 1` | C | yes |  |
| `sgs/media` | `media/style.css::.sgs-video__time` | `font-size: 12px` | C | yes |  |
| `sgs/nav-drawer-menu` | `nav-drawer-menu/style.css::.sgs-nav-drawer-menu__ornament` | `line-height: 1` | H | not assessed |  |
| `sgs/nav-drawer-menu` | `nav-drawer-menu/style.css::.sgs-nav-drawer-menu__drill-back-btn` | `font-weight: 600` | H | not assessed |  |
| `sgs/nav-drawer-menu` | `nav-drawer-menu/style.css::.sgs-nav-drawer-menu__drill-back-btn` | `text-align: start` | H | not assessed |  |
| `sgs/post-grid` | `post-grid/style.css::.sgs-post-grid__page-btn` | `font-size: 0.875rem` | B | yes |  |
| `sgs/post-grid` | `post-grid/style.css::.sgs-post-grid__page-btn` | `font-weight: 600` | B | yes |  |
| `sgs/post-grid` | `post-grid/style.css::.sgs-post-grid__load-more` | `font-size: 1rem` | C | yes |  |
| `sgs/post-grid` | `post-grid/style.css::.sgs-post-grid__load-more` | `font-weight: 600` | C | yes |  |
| `sgs/product-card` | `product-card/style.css::.product-card h3` | `font-weight: 500` | E | see note | `titleFontWeight` is emitted on `.{uid} h3` (0,1,1), the same specificity as `.product-card h3` (0,1,1): a tie decided by source order, CANNOT-TELL from source |
| `sgs/product-card` | `product-card/style.css::.product-card .sgs-product-card__cta-row .sgs-button` | `text-align: center` | D | yes |  |
| `sgs/product-card` | `product-card/style.css::.product-card .product-card__cta-secondary` | `text-align: center` | D | yes |  |
| `sgs/product-card` | `product-card/style.css::.sgs-product-card__attribute-tag` | `text-transform: uppercase` | D | yes |  |
| `sgs/product-card` | `product-card/style.css::.sgs-product-card__rating` | `font-size: 13px` | B | yes |  |
| `sgs/product-card` | `product-card/style.css::.sgs-product-card__rating-stars` | `letter-spacing: 0.12em` | B | yes |  |
| `sgs/product-card` | `product-card/style.css::.sgs-product-card__brand` | `text-transform: uppercase` | B | yes |  |
| `sgs/product-card` | `product-card/style.css::.sgs-product-card__saving-badge` | `font-size: 11px` | B | yes |  |
| `sgs/product-card` | `product-card/style.css::.sgs-product-card__saving-badge` | `font-weight: 400` | B | yes |  |
| `sgs/product-card` | `product-card/style.css::.sgs-product-card__saving-badge` | `letter-spacing: 0.1em` | B | yes |  |
| `sgs/product-card` | `product-card/style.css::.sgs-product-card__saving-badge` | `text-transform: uppercase` | B | yes |  |
| `sgs/product-card` | `product-card/style.css::.sgs-product-card__swatch-more` | `line-height: 1.3` | B | yes |  |
| `sgs/product-card` | `product-card/style.css::.sgs-product-card__rrp` | `font-size: 13px` | B | yes |  |
| `sgs/theme-toggle` | `theme-toggle/style.css::.sgs-theme-toggle__icon svg` | `font-size: 20px` | E | see note | a glyph size (`svg`), not text; `labelFontSize` paints the label, a different element |

## 5. CLASS 4 flags (an element, or a whole block, with no typography control at all)

Two scales, kept apart.

**Whole blocks (E14 is blind to them).** E14 builds a model only for blocks whose PHP calls `sgs_typography_css_rule` or `sgs_button_element_style_css` with a prefix that matches a declared attribute. 44 of 95 blocks have no model, so none of the findings can come from them (`--survey`: "Blocks with a resolvable control: 51"). The 86-declaration indicator below was measured at triage over 47 blocks. The brief's measured context (46 never call the helper; `choice-flow` and `choice-flow-question` 0 calls, `cart` 1, `product-card` 12) is consistent with that; I did not recount helper calls. As a rough size of the unmeasured pool, a throwaway regex walker (not gate output, nested at-rules approximated) found 86 literal declarations of inherited typography properties outside hover, media and modifier selectors in the triage's 47 unmodelled blocks' `style.css`: `trustpilot-reviews` 19, `choice-flow-question` 11, `gallery` 9, `hero` 8, `account` 6 (now modelled; its 6 findings are cause H), `audio` 6, `wishlist-panel` 6, `choice-flow-result` 5, the rest 1 to 4 each. Treat 86 as an indicator, not a finding count.

**Elements inside blocks that do call the helper.** These are CLASS 4 shaped: the block has controls for the property, none on the leaked-into or declaring element.

| Block | Elements with no control | Source of the flag |
|---|---|---|
| `sgs/post-grid` | meta, badge, category, excerpt, readmore, page buttons, load-more: the only typography attributes are `title*`. The gate now resolves the 12 card-part rows through `53ba85750` and reports no finding for them; 4 CANNOT-RESOLVE rows remain (page buttons, load-more) | `block.json` attribute list |
| `sgs/buybox` | notify form (9), saving badge (4), stock line (1), guided steps (6), value ladder (1, CLASS 3): the only controls are `price*`, `pickerLabel*`, `pickerValue*`, `addToCart*` | `block.json` attribute list |
| `sgs/product-card` | attribute-tag text-transform, brand text-transform, rating, rating stars, saving badge (4), swatch-more, RRP, CTA text-align, value ladder, "From" label font-family | `block.json` attribute list |
| `sgs/card-grid` | pagination buttons (2): controls cover `title`, `subtitle`, `noImageLabel` only | `block.json` attribute list |
| `sgs/form` | label, input line-height, tile icon and label, consent text, review term, column and row headings | `block.json` of `form` and the `form-field-*` blocks has no label or heading typography attribute |
| `sgs/option-picker` | sub-label, term badge, term description | `block.json` |
| `sgs/google-reviews` | maps link, breakdown row, badge text (12 element controls exist, none for these) | `block.json` |
| `sgs/media` | video bar and time (2 CANNOT-RESOLVE findings) | `block.json` |

`sgs/cart` (1 helper call, `pill` prefix) has the badge as a CANNOT-TELL (section 4).

## 6. What this lets a later task lower, and what it cannot

`E14_OPEN_BACKLOG` is `CLASS-2: 35`, `CLASS-3: 1`, `CANNOT-RESOLVE: 55`. The ceilings follow the gate's own output, so a ceiling moves only when findings disappear, and only in the commit that removes them. Never raise them.

Measured 2026-10-07 on a clean detached worktree at `4289311a9` (no other session's uncommitted files), from `plugins/sgs-blocks`: `node scripts/check-hardcoded-render-defaults.js --check` reports `CLASS-2 35/35, CLASS-3 1/1, CANNOT-RESOLVE 55/55` and 0 net-new legacy violations, and `--self-test` reports `31/31 checks passed`.

**Shipped in `6f1963c28` (2026-10-06).** The 10 DEAD declarations deleted with their whole rules; `sgs/form` given `label` and `field` typography surfaces; both value ladders given `valueLadder` and `valueLadderSaving` surfaces, with their duplicated markup unified into `includes/helpers-value-ladder.php::sgs_value_ladder_markup`. Every literal on an element that now owns a control sits inside `:where()`, which also repaired two real defects: the floated-label state's (0,4,0) size and weight, which no control could beat, and the ladder row weights, which blocked the ladder's own font-weight control. Unifying the ladder markup put it outside the block-directory walk, which cost 4 CANNOT-RESOLVE rows, and buybox's first `line-height` control made one pre-existing literal visible; both were absorbed by de-specifying those literals.

**Shipped in `75a583e23` (2026-10-07): nine unreachable typography literals became client controls on three blocks.**

- `sgs/product-faq` gained a `question` prefix on the parent, `sgs/countdown-timer` gained `number`, `label` and `expired`, and `sgs/process-steps` gained `icon` and `description` with its existing `number` family completed.
- **Each block has ONE Typography panel**, built with the `targets` array of `src/components/TypographyControls.js::TypographyTargetSwitcher` (2 to 3 targets render as segmented buttons, 4 or more as a dropdown), not a panel per element. `src/blocks/trust-bar/edit.js` is the reference mount. Existing single-prefix mounts were folded into the one panel.
- Every literal was wrapped in `:where()` rather than deleted, so the default still paints while the control outranks it; layout declarations keep their own specificity. `sgs/process-steps` needed no `step` prefix, because each leak target owns its alignment.
- Every helper call builds its selector inline, which is what registers element governance.
- This closed 9 FIX declarations.

**Shipped in `53ba85750` (2026-10-07): the gate follows a block's `require` one hop into shared PHP.** `readBlockPhpFiles` resolves `require` and `require_once` one hop from the block's own PHP files; section 4.1 gives the effect and why the hop is not transitive. The behaviour carries its own negative control: `selfTestRequireHop` asserts that a file required BY THE BLOCK is in the model and that a file required by THAT file is not, because a test of the positive alone passes identically for a transitive follower. Making the follower transitive on purpose drops the suite to 21/24.

24 `sgs/product-card::valueLadder*::L3` gaps were accepted into `scripts/wiring-fingerprint-baseline.json`, which has no per-entry reason field: the justification lives only in `6f1963c28`'s commit message under `[gates-ok]`, which is the form that gate's own output asks for. In short, the gate credits `ServerSideRender` only when it is unconditional, and product-card's is gated to bound mode with a real typed-mode branch; the ladder exists only in bound mode and its inspector targets are gated to it too, so the canvas shows render.php's own output wherever a client can set these. The fixed `sgs/cart::hideOnCartCheckoutPages::L3` entry was removed in the same pass. **Deferred by Bean's explicit decision (2026-10-07): building a bound-mode canvas mirror so those 24 clear on merit is needed, but not a priority now.** Nothing in the baseline was moved or re-baselined.

**Shipped 2026-10-07 (`87eb25957`..`c70b7eb54`): every remaining FIX declaration resolved, and two gate precision fixes.**

- **The 13 open declarations.** `sgs/form` gained `tileIcon`, `tileLabel`, `consent`, `reviewTerm` and `navButton` surfaces on the parent, and `submit` was completed to the full surface on the shared helper (rows 9, 10, 11, 13, 17; `c9d0f7cf4`). `sgs/table-of-contents` gained `title` (row 19; `6d30835bd`). `sgs/product-card`'s `priceFromLabel` was completed and its `'Inter'` literal deleted (row 18; `018d39351`). `sgs/option-picker` needed no attributes: the pill text's line-height default moved up to the pill so its controls reach the text by inheritance (row 12; `4a4d442fd`).
- **Inheritance rows were decided by measurement, not by wrapping.** `:where()` only lets a control win that paints the element itself; a zero-specificity declaration still beats an inherited value. So every row whose competing control sits on an ancestor got its own control, or had its default moved up to that ancestor. For `sgs/cta-section` a live probe settled it (`4289311a9`): the body inherits once its literal is gone (row 16 closed), while the headline is held by the theme's global heading styles whatever the cta-section stylesheet does (row 14, 2 declarations, DEFENSIBLE).
- **The 3 EDITOR-only declarations** moved into each block's `editor.css` (`6d30835bd`).
- **Gate precision** (`87eb25957`): a class whose only emitter is the block's `edit.js` is no longer reported (5 CANNOT-RESOLVE rows), and a resolved control on the declaring element itself wins before the ancestor and unresolved paths, but only when it strictly out-specifies the literal (an exact tie stays reported). Each change carries a negative self-test that turns red when the logic is reverted.

| Step | Where | CLASS-2 | CLASS-3 | CANNOT-RESOLVE |
|---|---|---|---|---|
| Before this work | | 68 | 5 | 64 |
| After `6f1963c28` | | 56 | 3 | 64 |
| After `75a583e23`, `53ba85750` | | 48 | 2 | 61 |
| **Now (`87eb25957`..`c70b7eb54`)** | 3.1, 3.2, 4.1 | **35** | **1** | **55** |
| Remaining floor | | 35 | 1 | the CLASS 4 shaped rows, the unclassified (cause H) and the CANNOT-TELL, until the gate gains a CLASS 4 category and the causes of section 4 are modelled |

The descent this section predicted was 33 / 1 / 54. The two differences are measured, not missed: the `cta-section` headline pair is DEFENSIBLE (2 CLASS-2), and the own-control reorder clears only one of its two named rows, because `media`'s caption selector list also contains a bare `figcaption` that the gate cannot place (causes E and F), so 1 CANNOT-RESOLVE remains. The option-picker pill's row went with its dead `line-height: 1`.

The 36 DEFENSIBLE findings (35 CLASS-2, 1 CLASS-3) are the floor of the CLASS-2 and CLASS-3 ceilings: they stay in the count unless a mechanism removes them. Three options, none implemented: (i) leave them counted (the ceiling stays 35 and 1; no new mechanism); (ii) add a per-declaration marker comment the gate honours (new gate capability, needs a decision on what the marker must say); (iii) record them as `by-design` baseline entries, which conflicts with the standing rule against baselining a finding to silence it, so it needs Bean's explicit decision. I recommend (i) now.

## 7. Capability gaps in the gate that this triage exposed

Each is evidence for a later gate task and is still open. Shared `includes/` PHP is read one hop from a block's `require` by `readBlockPhpFiles` (section 4.1), so it is not on this list.

1. **`var()`-valued declarations are invisible to E14.** `isLiteralConstant` rejects them, but a `var(--wp--preset--font-size--x-large)` on a descendant blocks an ancestor control exactly as a literal does. Measured with a scratch copy of the gate that admits `var(` values for inherited properties: +48 findings (27 CLASS-2, 21 CANNOT-RESOLVE) in 11 blocks (`form` 15, `choice-flow` 12, `cta-section` 5, `product-card` 4, `countdown-timer` 3, `option-picker` 3, `google-reviews` 2, and one each in `notice-banner`, `process-steps`, `table-of-contents`, `team-member`). Example: `countdown-timer/style.css::.sgs-countdown__number { font-size: var(--wp--preset--font-size--xx-large, 3rem) }` made the root `fontSize` control do nothing on the numbers, and the gate said nothing. Direct evidence from closing the countdown-timer rows (`75a583e23`): `__number`, `__label` and `__expired` each also declared `font-size: var(--wp--preset--font-size--...)`, which blocked the root control exactly as a literal does while the gate reported nothing for it. Those were de-specified into `:where()` alongside the literals, so the control now reaches them, but the gate still cannot see that class of defect.
2. **Own-control verdicts: fixed for a single-member selector, open for a selector list.** `classifyInheritedHardcode` now checks a resolved control on the declaring element first (`87eb25957`). `media`'s caption rule is still CANNOT-RESOLVE because its selector list also holds a bare `figcaption` that the gate cannot place (gap 4); the verdict needs every member resolved.
3. **One unplaceable control poisons the whole property.** Cause D: 20 findings are CANNOT-RESOLVE because one control for the property targets an element built from a variable or sprintf template, even where that control is on an unrelated element.
4. **sprintf placeholders drop elements.** `'<span class="sgs-option-picker__pill%s">'` loses the class token and `'<%1$s class="sgs-media__caption">'` is not parsed as a tag. The former also mislabels the `option-picker` pill-text finding as CLASS 3; it is a CLASS 2 for `pillLineHeight`. Dynamic tags (`<<?php echo esc_attr( $heading_level ); ?> class="sgs-process-steps__title">`) are not parsed either, which is why the process-steps note lists three leak targets and not the title.
5. **Class maps are not followed.** `includes/forms/field-render-helpers.php::field_headings` builds two live classes from a PHP array; a literal search finds only the map.
6. **State selectors are not exempt.** `[aria-current="true"]` (`store-selector`) is a state, like the `:hover` and `:focus` that E3 already exempts.
7. **No CLASS 4 category.** 40 of the 61 CANNOT-RESOLVE findings, and the largest real gaps (post-grid card parts, which the gate no longer reports at all, and the buybox notify form), are "this element has no control". The gate has no way to say so.
8. **44 blocks have no E14 model**, so the gate reports nothing for them (section 5).

## 8. Scope limits and CANNOT-TELL

**E14 covers the INHERITANCE half of this family only, and that is deliberate.** A hardcode beats a
control either because it sits on a descendant of the control's element (inheritance — what E14
detects, and only for inherited properties), or because it out-specifies the control on the SAME
element (specificity — NOT detected). CLASS 1 assumes an SGS control always wins at `(0,2,0)` over a
`(0,1,0)` base rule. A block stylesheet that uses an element+class selector breaks that assumption.

**A proven live instance of the uncovered half exists**, found independently by the Spec 47 route
session on 2026-10-06: `sgs/hero`'s `maxWidth` paints nothing, because the shared wrapper emits the
base value as `.uid` `(0,1,0)` while `hero/style.css`'s `section.sgs-hero{max-width:none}` is
`(0,1,1)` and wins. It was proven by inserting each selector into the page's CSSOM: `.uid` does not
apply, `.uid.wp-block-sgs-hero` does. `max-width` is not an inherited property, so E14 correctly
never looks at it. Proofs and the reason the offending CSS must NOT simply be deleted (D725: removing
it shifts the section 24px off-screen) are in `HERO-DEAD-SETTINGS.md` §9.

Whoever extends this gate next should start there: the specificity half needs the control's emitted
selector compared against the competing rule's, not just their elements, and hero is a ready-made
positive control with a live proof already attached.


- **Reach is per block instance.** Instances per page and pages per site are content; I cannot derive them from code. Counts that depend on a loop assume 4 items (6 for form fields) and say so. Where a count is a range from the markup ("at most 7 rows", "up to 4 units") the bound is stated.
- **DEFENSIBLE is a reading, not a ruling.** Where I wrote "documented", the source says so (`business-hours__time` comment, `helpers-button-note.php` docblock, the `google-reviews` style header). For UI chrome (arrows, pause buttons, ribbons, the upload chip, progress bubbles) the intent is not recorded anywhere I could find: CANNOT-TELL whether the owner wants those reachable from typography controls.
- **DEAD means "no current emitter in code".** I searched `src/`, `includes/` and `theme/` (and the `plugins/` tree for `__btn`). I did not and cannot search stored post content in a database, which could still carry a legacy class (the `notice-banner` conformance fixture carries `sgs-notice-banner__text`). CANNOT-TELL for stored content.
- **No browser, no computed styles.** Specificity is computed from selector strings with a simple parser; "wins" and "cannot reach" follow from CSS inheritance and specificity rules, not from a measured page. The `.product-card h3` pair is an exact tie, decided by source order: CANNOT-TELL.
- **Scratch tooling.** The survey detail (control selectors, matched-instance counts) and the `var()` experiment (+48) came from scratch copies of the gate in the session scratchpad; the repo gate at triage time is the one reported in section 0; its later change is `53ba85750`.
- **The crude 86 (section 5) is an indicator only.**
- **Not checked:** `editor.css` and the editor canvas, `theme/` stylesheets, `includes/` helpers that hardcode typography, and `scripts/computed-route/` and `scripts/parity/` (out of scope by instruction).
