# F3 gate: E14 triage and baseline retriage

Subject: `plugins/sgs-blocks/scripts/check-hardcoded-render-defaults.js` (Gate B), baseline `plugins/sgs-blocks/scripts/hardcoded-render-defaults-baseline.json`.
Status: the analysis stands. Its highest-reach recommendations shipped in `6f1963c28` (2026-10-06), `75a583e23` and `53ba85750` (2026-10-07); section 6 carries the measured ceilings. The triage itself (sections 1 to 3 and the section 4.3 listing) was written 2026-10-06 against a 137-finding survey; the baseline edits of section 2.3 were the only repository change it made. Last updated 2026-10-07.

## 0. Method, and what the numbers rest on

- Reproduced the survey with `node scripts/check-hardcoded-render-defaults.js --survey --verbose`. At triage (2026-10-06) it reported 137 net-new E14 findings (68 CLASS-2, 5 CLASS-3, 64 CANNOT-RESOLVE), 20 classified CLASS 1, 17 legacy findings accepted by the baseline. The same command now (2026-10-07, after `51a67c791`, with `var()` values admitted) reports CLASS-2 31, CLASS-3 1, CANNOT-RESOLVE 54, 17 accepted.
- To see what the gate saw for each finding (the control selectors it resolved, how many markup instances matched each side) I ran a scratch copy of the gate from the session scratchpad with one extra logging hook. Nothing under the repo was touched by that copy; it reproduced the same 137 (68 / 5 / 64).
- Reach is read from each block's own markup (`render.php`, sibling PHP, `includes/` helpers, `edit.js` and `view.js`). Every "no markup emits this class" claim comes from a search of all `.php` and `.js` files under `src/` and `includes/`, plus `theme/`; one such claim was wrong on first pass (the form table headings are built from a class map in `includes/forms/field-render-helpers.php::field_headings`) and was corrected, so the DEAD rows carry the search scope.
- Specificity is computed from the emitted selector strings (`.{uid}` stands for the per-instance class). An inherited property reaches a descendant only through inheritance, so specificity does not rescue a control that targets an ancestor: a declaration on the descendant wins at any specificity. Specificity matters only for same-element pairs (CLASS 1).

Headline numbers. The CLASS 2 and CLASS 3 rows count the 73 findings triaged on 2026-10-06; the CANNOT-RESOLVE rows count the 54 the gate reported at triage (section 4.2 gives the arithmetic; section 6 has today's counts, 28 / 1 / 4):

| | Count |
|---|---|
| CLASS 2 + CLASS 3 findings triaged | 73 |
| ... judged FIX | 26 declarations (22 CLASS 2, 4 CLASS 3): **all resolved**. 24 closed by a control (4 in `6f1963c28`, 9 in `75a583e23`, 11 in `4a4d442fd`..`4289311a9`), 2 (`cta-section` headline) re-verdicted DEFENSIBLE on a live measurement |
| ... DEFENSIBLE (documented intent, UI chrome, or measured) | 24 remain (23 CLASS 2, 1 CLASS 3); the `sgs/form` file button's 4 and file prompt's `text-align` got controls (`880aab178`, `f21461b1a`), the `cta-section` ribbon's 4 and the form file progress's `text-align` got controls (`7dfc6552b`, `875196fe5`), and the `cta-section` headline's 3 are CLASS 1 now the gate reads its `sgs/heading` child's controls (section 7 gap 9) |
| ... DEAD (no markup emits the class) | 10, deleted in `6f1963c28` |
| ... EDITOR-ONLY | 3, moved to `editor.css` in `6d30835bd` |
| CANNOT-RESOLVE at triage | 54 |
| ... CLASS 4 shaped (carried from the triage) | 40 |
| ... newly visible since `53ba85750`, not yet classified | 9 |
| ... own control already exists (CLASS 1 in effect) | 1 (`media` caption; the bare `figcaption` member keeps it unresolved) |
| ... CANNOT-TELL from source | 4 |
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
| 20 | `sgs/business-info` | `.sgs-business-hours__time` | 1 | CLASS-2 | **CLOSED `9ef97b909`** | 7 | was: permanent (no control for the time column). The right-alignment default sits in `:where()`; the time column has no control of its own |
| 21 | `sgs/google-reviews` | `.sgs-google-reviews__maps-link` | 1 | CLASS-2 | DEFENSIBLE | 5 | permanent (the 12 element controls do not include the maps link) |
| 22 | `sgs/google-reviews` | `.sgs-google-reviews__breakdown-row` | 1 | CLASS-2 | DEFENSIBLE | 5 | permanent |
| 23 | `sgs/google-reviews` | `.sgs-google-reviews__stars` | 1 | CLASS-2 | DEFENSIBLE | 5 | permanent |
| 24 | `sgs/form` | `.sgs-form-field__column-heading` | 3 | CLASS-2 | **CLOSED `e0a22e070`** | 4 | was: permanent. Now a `gridColHeading` surface on `sgs/form`; the literals sit in `:where()` |
| 25 | `sgs/form` | `.sgs-form-field__row-heading` | 2 | CLASS-2 | **CLOSED `e0a22e070`** | 4 | was: permanent. Now a `gridRowHeading` surface on `sgs/form`; the literals sit in `:where()` |
| 26 | `sgs/form` | `.sgs-form__progress-step-number` | 2 | CLASS-2 | **CLOSED `e0a22e070`** | 4 | was: permanent. Now a `stepNumber` surface on `sgs/form`; the literals, including the narrow-container size, sit in `:where()` |
| 27 | `sgs/testimonial-slider` | `.sgs-testimonial-slider__arrow` | 2 | CLASS-2 | **CLOSED `e0a22e070`** | 2 | was: permanent. The declarations were inert (the button holds only an SVG sized by `.sgs-testimonial-slider__arrow-icon`) and are removed |
| 28 | `sgs/post-grid` | `.sgs-post-grid__error` | 1 | CLASS-3 | DEFENSIBLE | 2 | permanent for the empty-state text |
| 29 | `sgs/cta-section` | `.sgs-cta-section__ribbon` | 4 | CLASS-2 | DEFENSIBLE | 1 | permanent |
| 30 | `sgs/form` | `.sgs-form-field__file-button` | 4 | CLASS-2 | CLOSED `880aab178` | 1 | `fileButton` surface |
| 31 | `sgs/notice-banner` | `.sgs-notice-banner__icon` | 2 | CLASS-2 | **CLOSED `e0a22e070`** | 1 | was: default-state only (`iconSize` owns the glyph). The glyph size and line height sit in `:where()` (no surface of its own); `iconSize` still owns the glyph |
| 32 | `sgs/notice-banner` | `.sgs-notice-banner__close` | 2 | CLASS-2 | **CLOSED `e0a22e070`** | 1 | was: permanent. The glyph size and line height sit in `:where()` (no surface of its own) |
| 33 | `sgs/testimonial-slider` | `.sgs-testimonial-slider__pause-icon` | 2 | CLASS-2 | **CLOSED `e0a22e070`** | 1 | was: permanent. The glyph size and line height sit in `:where()` (no surface of its own) |
| 34 | `sgs/button` | `.sgs-button__note` | 1 | CLASS-2 | **CLOSED `9ef97b909`** | 1 | was: permanent (documented). The weight default sits in `:where()`; the note has no control of its own |
| 35 | `sgs/form` | `.sgs-form-field__file-label` | 1 | CLASS-2 | CLOSED `880aab178` | 1 | `filePrompt` surface |
| 36 | `sgs/form` | `.sgs-form-file__progress` | 1 | CLASS-2 | DEFENSIBLE | 1 | permanent |
| 37 | `sgs/google-reviews` | `.sgs-google-reviews__badge-text` | 1 | CLASS-2 | DEFENSIBLE | 1 | permanent |
| 38 | `sgs/store-selector` | `.sgs-store-selector__item` | 1 | CLASS-2 | **CLOSED `9ef97b909`** | 1 | was: permanent. The weight default sits in `:where()`; the current link has no control of its own (the root `fontWeight` reaches it only by inheritance) |
| 39 | `sgs/testimonial-slider` | `.sgs-testimonial-slider__pause-btn` | 1 | CLASS-2 | **CLOSED `e0a22e070`** | 1 | was: permanent. The declaration was inert (the only child sets its own size) and is removed |
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
| `business-info/style.css::.sgs-business-hours__time` | `text-align: right` | CLASS-2 | `.{uid}` (0,1,0) | (0,1,0) | CLOSED `9ef97b909` |
| `business-info/style.css::.sgs-business-info__placeholder` | `font-style: italic` | CLASS-2 | `.{uid}` (0,1,0) | (0,1,0) | EDITOR, moved to `editor.css` in `6d30835bd` |
| `business-info/style.css::.sgs-business-info__placeholder` | `font-size: 0.875em` | CLASS-2 | `.{uid}` (0,1,0) | (0,1,0) | EDITOR, moved to `editor.css` in `6d30835bd` |
- `.sgs-business-hours__time` (DEFENSIBLE). **Reach:** 1 `<dd>` per hours row, at most 7 per block (`business-info/render.php`: `'<div class="sgs-business-hours__row"><dt class="sgs-business-hours__day">%s</dt><dd class="sgs-business-hours__time">%s</dd></div>'`); the `--condensed-inline` variant resets it to `text-align: left`. **Leak:** permanent (no control for the time column). **Evidence:** Documented in `business-info/style.css`: "KEEP: a day/time row layout choice (day left, time right), not a content textAlign".
- `.sgs-business-info__placeholder` (EDITOR, moved to `editor.css` in `6d30835bd`). **Reach:** Front end: 0. Every use of `$placeholder` in `business-info/render.php` is gated, e.g. `$html = $sgs_is_editor_render ? '<p class="sgs-business-info sgs-business-phone">' . $placeholder . '</p>' : '';`. **Leak:** n/a. **Evidence:** Editor-only operator hint; the italic muted look is deliberate.

#### sgs/button

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `button/style.css::.sgs-button__note` | `font-weight: 400` | CLASS-2 | `.{uid}.sgs-button` (0,2,0) | (0,1,0) | CLOSED `9ef97b909` |

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

- `.sgs-countdown__number` (CLOSED `75a583e23`). **Reach:** `countdown-timer/render.php`: `<span class="sgs-countdown__number ...">` once per unit in `$units` (days, hours, minutes, seconds, each optional): up to 4. **Fix:** a `number` typography prefix, so the element has its own full `TypographyControls` surface. The rule also declared `font-size: var(--wp--preset--font-size--xx-large, 3rem)`, a `var()` value, which blocked a font-size control exactly as a literal does; it was de-specified into `:where()` with the literals, so the control reaches it.
- `.sgs-countdown__label` (CLOSED `75a583e23`). **Reach:** `<span class="sgs-countdown__label">` once per unit: up to 4. **Fix:** a `label` prefix; `text-transform`, `letter-spacing` and the `font-size: var(--wp--preset--font-size--small, 0.875rem)` sit in `:where()`.
- `.sgs-countdown__expired` (CLOSED `75a583e23`). **Reach:** `<div class="sgs-countdown__expired">` once per timer, hidden until the timer ends (`$expired_hidden`). **Fix:** an `expired` prefix; the weight literal and its `font-size` `var()` sit in `:where()`.
- The three prefixes mount as targets of one Typography panel through `src/components/TypographyControls.js::TypographyTargetSwitcher`, section 6.

#### sgs/cta-section

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `cta-section/style.css::.sgs-cta-section__headline` | `font-weight: 700` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | DEFENSIBLE (measured, `4289311a9`) |
| `cta-section/style.css::.sgs-cta-section__headline` | `line-height: 1.2` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | DEFENSIBLE (measured, `4289311a9`) |
| `cta-section/style.css::.sgs-cta-section__body` | `line-height: 1.6` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | CLOSED `4289311a9` |
| `cta-section/style.css::.sgs-cta-section__btn` | `font-weight: 600` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | DEAD |
| `cta-section/style.css::.sgs-cta-section__btn` | `text-align: center` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | DEAD |
| `cta-section/style.css::.sgs-cta-section__btn` | `line-height: 1.4` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | DEAD |
| `cta-section/style.css::.sgs-cta-section__btn-icon` | `font-size: 1.2em` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | DEAD |
| `cta-section/style.css::.sgs-cta-section__ribbon` | `font-weight: 700` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `cta-section/style.css::.sgs-cta-section__ribbon` | `letter-spacing: 0.05em` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `cta-section/style.css::.sgs-cta-section__ribbon` | `text-transform: uppercase` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `cta-section/style.css::.sgs-cta-section__ribbon` | `line-height: 1.4` | CLASS-2 | `.{uid}.wp-block-sgs-cta-section` (0,2,0) | (0,1,0) | DEFENSIBLE |

- `.sgs-cta-section__headline` (DEFENSIBLE (measured, `4289311a9`)). **Reach:** The headline is an InnerBlocks child: `edit.js::CTA_TEMPLATE` is `[ 'sgs/heading', { level: 'h2', className: 'sgs-cta-section__headline' } ]`. 1 per CTA section. `sgs/heading` has its own controls at `.{uid}.wp-block-sgs-heading` (0,2,0), which beat this rule (0,1,0), so the child is reachable; the cta-section root controls are not. **Leak:** default-state only for the child block's own controls; permanent for the cta-section root controls. **Evidence:** `cta-section/render.php` states the design: root typography is emitted to `$root_sel` and "rel[ies] on plain CSS inheritance to reach their InnerBlocks children". Declaring weight and line-height on the child defeats exactly that inheritance.
- `.sgs-cta-section__body` (CLOSED `4289311a9`). **Reach:** `edit.js::CTA_TEMPLATE`: `[ 'sgs/text', { className: 'sgs-cta-section__body' } ]`. 1 per CTA section. **Leak:** as the headline. **Evidence:** As the headline: root `lineHeight` cannot reach the body text.
- `.sgs-cta-section__btn` (DEAD). **Reach:** No markup emits `sgs-cta-section__btn`: absent from every `render.php`, `edit.js`, `save.js`, `includes/` and `theme/` file (only `style.css` and `editor.css` name it). The buttons are `sgs/multi-button` InnerBlocks (`edit.js::CTA_TEMPLATE`). **Leak:** n/a. **Evidence:** Leftover from the pre-FR-22-6 scalar-button markup. Deleting the rule changes nothing rendered.
- `.sgs-cta-section__btn-icon` (DEAD). **Reach:** No markup emits `sgs-cta-section__btn-icon` (same search as `__btn`). **Leak:** n/a. **Evidence:** As `__btn`.
- `.sgs-cta-section__ribbon` (DEFENSIBLE). **Reach:** `cta-section/render.php`: `$ribbon_html = '<span class="sgs-cta-section__ribbon" aria-hidden="true">' . esc_html( $ribbon ) . '</span>';` once, only when ribbon text is set. **Leak:** permanent. **Evidence:** A corner badge (absolute positioned, uppercase, tracked). Reading from source: a badge is not body text, so the section's typography should not restyle it. Intent not documented.

#### sgs/form

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `form/style.css::.sgs-form-field__column-heading` | `font-size: 11px` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `e0a22e070` |
| `form/style.css::.sgs-form-field__column-heading` | `letter-spacing: 0.12em` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `e0a22e070` |
| `form/style.css::.sgs-form-field__column-heading` | `text-transform: uppercase` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `e0a22e070` |
| `form/style.css::.sgs-form-field__row-heading` | `font-size: 13px` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `e0a22e070` |
| `form/style.css::.sgs-form-field__row-heading` | `font-weight: 500` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `e0a22e070` |
| `form/style.css::.sgs-form-field__input` | `line-height: 1.5` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `6f1963c28` |
| `form/style.css::.sgs-form-field__label` | `font-weight: 600` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `6f1963c28` |
| `form/style.css::.sgs-form-tile__icon` | `font-size: 1.5rem` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `c9d0f7cf4` |
| `form/style.css::.sgs-form-tile__icon` | `line-height: 1` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `c9d0f7cf4` |
| `form/style.css::.sgs-form-tile__label` | `font-weight: 500` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `c9d0f7cf4` |
| `form/style.css::.sgs-form-field__file-label` | `text-align: center` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `880aab178` |
| `form/style.css::.sgs-form-field__file-button` | `font-size: 12.5px` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `880aab178` |
| `form/style.css::.sgs-form-field__file-button` | `line-height: 1.5` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `880aab178` |
| `form/style.css::.sgs-form-field__file-button` | `letter-spacing: 0.12em` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `880aab178` |
| `form/style.css::.sgs-form-field__file-button` | `text-transform: uppercase` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `880aab178` |
| `form/style.css::.sgs-form-file__progress` | `text-align: center` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | DEFENSIBLE |
| `form/style.css::.sgs-form-field__consent-text` | `line-height: 1.5` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `c9d0f7cf4` |
| `form/style.css::.sgs-form__progress-step-number` | `font-size: 0.8125rem` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `e0a22e070` |
| `form/style.css::.sgs-form__progress-step-number` | `font-weight: 600` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `e0a22e070` |
| `form/style.css::.sgs-form__button` | `font-weight: 600` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `c9d0f7cf4` |
| `form/style.css::.sgs-form__button` | `line-height: 1.5` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `c9d0f7cf4` |
| `form/style.css::.sgs-form-review__term` | `font-weight: 600` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | CLOSED `c9d0f7cf4` |

- `.sgs-form-field__column-heading` (DEFENSIBLE). **Reach:** LIVE, built from a class map: `includes/forms/field-render-helpers.php::field_headings` (`'columnHeading' => 'sgs-form-field__column-heading'`), one `<span aria-hidden="true">` per field that sets `columnHeading`. A literal search for the class finds only the map, so reach depends on content. **Leak:** permanent. **CLASS 4 element:** element-level: the form has no heading-typography control. **Evidence:** Visual micro-label ("SPH") above a box, 11px uppercase tracked. Reading from source: a table-heading look; intent not documented. Reach per field is 1; count per form depends on how many fields set it (CANNOT-TELL without content).
- `.sgs-form-field__row-heading` (DEFENSIBLE). **Reach:** LIVE, same map: `'rowHeading' => 'sgs-form-field__row-heading'`, one `<span aria-hidden="true">` per field that sets `rowHeading`. **Leak:** permanent. **CLASS 4 element:** element-level (as above). **Evidence:** As the column heading.
- `.sgs-form-field__input` (CLOSED `6f1963c28`). **Reach:** Every text-entry control: `class="sgs-form-field__input"` in `form-field-address/render.php` and the other `form-field-*` blocks (text, email, phone, number, date, select, textarea). 1 per input, select and textarea. **Leak:** permanent (`fieldFontSize` exists, no field line-height control). **CLASS 4 element:** element-level: no field line-height control. **Evidence:** Root `lineHeight` cannot reach the inputs (`.sgs-form-field__input { line-height: 1.5 }`).
- `.sgs-form-field__label` (CLOSED `6f1963c28`). **Reach:** `includes/forms/field-render-helpers.php::field_label`: `'<label for="%s" class="sgs-form-field__label%s">'`, called from 9 field blocks, plus `<legend class="sgs-form-field__label">` in `form-field-checkbox`, `form-field-radio` and `form-field-tiles`. 1 per labelled field. **Leak:** permanent (no label typography control). **CLASS 4 element:** element-level: no label typography control at all. **Evidence:** Root `fontWeight` cannot reach field labels (`font-weight: 600`); the same rule also hardcodes `font-size: var(--wp--preset--font-size--small, 0.9375rem)`, which this gate does not examine.
- `.sgs-form-tile__icon` (CLOSED `c9d0f7cf4`). **Reach:** `form-field-tiles/render.php`: `echo '<span class="sgs-form-tile__icon" aria-hidden="true">'` once per tile that has an icon. **Leak:** permanent. **CLASS 4 element:** element-level. **Evidence:** Tiles field only.
- `.sgs-form-tile__label` (CLOSED `c9d0f7cf4`). **Reach:** `form-field-tiles/render.php`: `echo '<span class="sgs-form-tile__label">' . esc_html( $tile['label'] ?? '' ) . '</span>';` once per tile. **Leak:** permanent. **CLASS 4 element:** element-level. **Evidence:** Tiles field only.
- `.sgs-form-field__file-label` (CLOSED `880aab178`: the `filePrompt` surface). **Reach:** `form-field-file/render.php`: `echo '<div class="sgs-form-field__file-label">'` once per file field. **Leak:** permanent. **Evidence:** Centred upload-panel caption. Reading from source: a panel layout choice; intent not documented.
- `.sgs-form-field__file-button` (CLOSED `880aab178`: the `fileButton` surface). **Reach:** `form-field-file/render.php`: `<span class="sgs-form-field__file-button" aria-hidden="true">` once per file field. 4 declarations (size, line-height, tracking, case). **Leak:** permanent. **Evidence:** A decorative "Choose file" chip inside the upload panel (aria-hidden). Reading from source: button-like chrome; intent not documented.
- `.sgs-form-file__progress` (DEFENSIBLE). **Reach:** `form-field-file/render.php`: `echo '<div class="sgs-form-file__progress" hidden>'` once per file field, visible only while uploading. **Leak:** permanent. **Evidence:** Transient status text.
- `.sgs-form-field__consent-text` (CLOSED `c9d0f7cf4`). **Reach:** `form-field-consent/render.php`: `echo '<span class="sgs-form-field__consent-text">'` once per consent field. **Leak:** permanent. **CLASS 4 element:** element-level. **Evidence:** Root `lineHeight` cannot reach the consent wording.
- `.sgs-form__progress-step-number` (DEFENSIBLE). **Reach:** `form/render.php`: `<span class="sgs-form__progress-step-number">` once per step of a multi-step form (the progress bar). **Leak:** permanent. **Evidence:** A numbered bubble in a progress indicator; reading from source: UI chrome; intent not documented.
- `.sgs-form__button` (CLOSED `c9d0f7cf4`). **Reach:** 3 instances matched in the form markup (submit plus step navigation). `form/render.php` documents the existing overrides: "`.sgs-form__button` (style.css) fixes font-weight:600 and font-size ... these are independent overrides on the SAME scoped rule". **Leak:** weight: default-state only (`submitFontWeight` overrides it); line-height: permanent (no submit line-height control). **Evidence:** The `font-weight` row is therefore a controlled default; only `line-height: 1.5` has no control.
- `.sgs-form-review__term` (CLOSED `c9d0f7cf4`). **Reach:** Built in JavaScript only: `form/view.js`: `dt.className = 'sgs-form-review__term';`, one `<dt>` per answered field on the review step. **Leak:** permanent. **CLASS 4 element:** element-level. **Evidence:** Review step of a multi-step form only.

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
| `notice-banner/style.css::.sgs-notice-banner__icon` | `font-size: 20px` | CLASS-2 | `.{uid}.wp-block-sgs-notice-banner` (0,2,0); `.sgs-notice-banner` (0,1,0) | (0,1,0) | CLOSED `e0a22e070` |
| `notice-banner/style.css::.sgs-notice-banner__icon` | `line-height: 1` | CLASS-2 | `.{uid}.wp-block-sgs-notice-banner` (0,2,0); `.sgs-notice-banner` (0,1,0) | (0,1,0) | CLOSED `e0a22e070` |
| `notice-banner/style.css::.sgs-notice-banner__text` | `line-height: 1.5` | CLASS-2 | `.{uid}.wp-block-sgs-notice-banner` (0,2,0); `.sgs-notice-banner` (0,1,0) | (0,1,0) | DEAD |
| `notice-banner/style.css::.sgs-notice-banner__text strong` | `font-weight: 700` | CLASS-2 | `.{uid}.wp-block-sgs-notice-banner` (0,2,0); `.sgs-notice-banner` (0,1,0) | (0,1,1) | DEAD |
| `notice-banner/style.css::.sgs-notice-banner__close` | `font-size: 1.25rem` | CLASS-2 | `.{uid}.wp-block-sgs-notice-banner` (0,2,0); `.sgs-notice-banner` (0,1,0) | (0,1,0) | CLOSED `e0a22e070` |
| `notice-banner/style.css::.sgs-notice-banner__close` | `line-height: 1` | CLASS-2 | `.{uid}.wp-block-sgs-notice-banner` (0,2,0); `.sgs-notice-banner` (0,1,0) | (0,1,0) | CLOSED `e0a22e070` |

- `.sgs-notice-banner__icon` (DEFENSIBLE). **Reach:** `notice-banner/render.php`: `$sgs_nb_icon_classes` once per banner with an icon. **Leak:** default-state only (`iconSize` owns the glyph). **Evidence:** The block has its own `iconSize` control for the glyph (`block.json` attributes `iconSize`, `iconStyle`); a body-typography control should not resize an icon.
- `.sgs-notice-banner__text` (DEAD). **Reach:** No current markup emits `sgs-notice-banner__text`: `notice-banner/render.php` says "FR-22-6: text content is $content (sgs/text InnerBlock). R-31-14: no fallback." Only `style.css`, `editor.css` and one conformance fixture (`scripts/tests/fixtures/conformance/sgs-notice-banner.html`) name it. **Leak:** n/a. **Evidence:** Legacy scalar-text markup. The message is an `sgs/text` child with its own controls. Two rows (`__text` and `__text strong`).
- `.sgs-notice-banner__close` (DEFENSIBLE). **Reach:** `notice-banner/render.php`: `<button class="sgs-notice-banner__close" ...><span aria-hidden="true">&times;</span></button>` once per dismissible announcement. **Leak:** permanent. **Evidence:** A glyph button; a body-typography control should not resize the dismiss cross.

#### sgs/option-picker

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `option-picker/style.css::.sgs-option-picker__pill-text` | `line-height: 1.25` | CLASS-3 | none on the leak targets named in the note; other controls for this property in the block: `.{uid}.wp-block-sgs-option-picker .sgs-option-picker__label` (0,3,0); `.{uid}.wp-block-sgs-option-picker .sgs-option-picker__pill` (0,3,0); +1 more | (0,1,0) | CLOSED `4a4d442fd` |

- `.sgs-option-picker__pill-text` (CLOSED `4a4d442fd`). **Reach:** `option-picker/render.php`: `$pill_text_html = '<span class="sgs-option-picker__pill-text"><span class="sgs-option-picker__pill-label">' . ...` once per option, inside `<span class="sgs-option-picker__pill%s">`. Every pill of every picker (product-card also styles pills of its own pickers: `sgs_typography_css_rule( $attributes, 'pill', '.' . $sgs_card_uid . ' .sgs-option-picker__pill' )`). The wrapper nests label, term badge, sub-label and term description. **Leak:** permanent for icon-less labels: `pillLineHeight` and `labelLineHeight` never reach the pill text. **CLASS 4 element:** sub-label and term-badge have no controls. **Evidence:** MISCLASSIFIED by the gate as CLASS 3. The pill carries the control (`sgs_typography_css_rule( $attributes, 'pill', $sel_pill )`, 3 classes) and `pill-text` is its descendant that declares its own `line-height: 1.25`, so this is CLASS 2 for `pillLineHeight` and CLASS 3 for the sub-label. The gate dropped the pill from its markup model because the class is glued to a sprintf `%s`.

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
| `product-card/style.css::.product-card .price-from-label` | `font-family: 'Inter', sans-serif` | CLASS-2 | `.{uid} .sgs-product-card__price, .{uid} .price, .{uid} .price-from-amount` (0,2,0) | (0,2,0) | CLOSED `018d39351` |
| `product-card/style.css::.product-card__value-ladder` | `font-size: 0.92em` | CLASS-3 | none on the leak targets named in the note; other controls for this property in the block: `.{uid} .sgs-product-card__title, .{uid} h3` (0,2,0); `.{uid} .sgs-product-card__price, .{uid} .price, .{uid} .price-from-amount` (0,2,0); +10 more | (0,1,0) | CLOSED `6f1963c28` |

- `.price-from-label` (CLOSED `018d39351`). **Reach:** `product-card/render.php`: `<span class="price-from-label">` at two template sites, once per card that shows a "From" price. **Leak:** permanent (`priceFromLabelFontSize` exists; no font-family control for the label). **CLASS 4 element:** element-level: no `priceFromLabelFontFamily`. **Evidence:** `font-family: 'Inter', sans-serif` is a literal font name in plugin CSS, which also conflicts with the project rule that client typography lives in `sites/<client>/`. `priceFontFamily` paints `.price` and `.price-from-amount`, so setting a price font leaves "From" in Inter.
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
| `store-selector/style.css::.sgs-store-selector__item a[aria-current="true"]` | `font-weight: 600` | CLASS-2 | `.{uid}.sgs-store-selector` (0,2,0) | (0,2,1) | CLOSED `9ef97b909` |

- `.sgs-store-selector__item` (DEFENSIBLE). **Reach:** `store-selector/render.php`: `( $is_current ? ' aria-current="true"' : '' )`, so the selector matches 1 link per list (the current store). **Leak:** permanent. **Evidence:** State emphasis on the current item. The gate exempts `:hover` and `:focus` states (E3) but not `[aria-current]`, a gate-model gap rather than a block defect.

#### sgs/table-of-contents

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `table-of-contents/style.css::.sgs-toc__title` | `font-weight: 600` | CLASS-2 | `.{uid}.wp-block-sgs-table-of-contents` (0,2,0) | (0,1,0) | CLOSED `6d30835bd` |
| `table-of-contents/style.css::.sgs-toc__empty` | `font-style: italic` | CLASS-2 | `.{uid}.wp-block-sgs-table-of-contents` (0,2,0) | (0,1,0) | EDITOR, moved to `editor.css` in `6d30835bd` |
- `.sgs-toc__title` (CLOSED `6d30835bd`). **Reach:** `table-of-contents/render.php`: `<summary class="sgs-toc__title">` (collapsible) or `<p class="sgs-toc__title">` once per TOC that has a title. **Leak:** permanent. **Evidence:** Root `fontWeight` cannot reach the title. The same rule hardcodes `font-size: var(--wp--preset--font-size--medium, 1rem)` (not examined by the gate).
- `.sgs-toc__empty` (EDITOR, moved to `editor.css` in `6d30835bd`). **Reach:** Front end: 0. `sgs-toc__empty` appears only in `table-of-contents/edit.js` (`<p className="sgs-toc__empty">`), never in `render.php`. **Leak:** n/a. **Evidence:** Editor-only empty-state hint.

#### sgs/testimonial-slider

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `testimonial-slider/style.css::.sgs-testimonial-slider__arrow` | `font-size: 24px` | CLASS-2 | `.{uid}.wp-block-sgs-testimonial-slider` (0,2,0); `.wp-block-sgs-testimonial-slider` (0,1,0) | (0,1,0) | CLOSED `e0a22e070` |
| `testimonial-slider/style.css::.sgs-testimonial-slider__arrow` | `line-height: 1` | CLASS-2 | `.{uid}.wp-block-sgs-testimonial-slider` (0,2,0); `.wp-block-sgs-testimonial-slider` (0,1,0) | (0,1,0) | CLOSED `e0a22e070` |
| `testimonial-slider/style.css::.sgs-testimonial-slider__pause-btn` | `font-size: 16px` | CLASS-2 | `.{uid}.wp-block-sgs-testimonial-slider` (0,2,0); `.wp-block-sgs-testimonial-slider` (0,1,0) | (0,1,0) | CLOSED `e0a22e070` |
| `testimonial-slider/style.css::.sgs-testimonial-slider__pause-icon` | `font-size: 14px` | CLASS-2 | `.{uid}.wp-block-sgs-testimonial-slider` (0,2,0); `.wp-block-sgs-testimonial-slider` (0,1,0) | (0,1,0) | CLOSED `e0a22e070` |
| `testimonial-slider/style.css::.sgs-testimonial-slider__pause-icon` | `line-height: 1` | CLASS-2 | `.{uid}.wp-block-sgs-testimonial-slider` (0,2,0); `.wp-block-sgs-testimonial-slider` (0,1,0) | (0,1,0) | CLOSED `e0a22e070` |
| `testimonial-slider/style.css::.sgs-testimonial-slider__empty` | `text-align: center` | CLASS-2 | `.{uid}.wp-block-sgs-testimonial-slider` (0,2,0) | (0,1,0) | DEAD |
| `testimonial-slider/style.css::.sgs-testimonial-slider__empty` | `font-style: italic` | CLASS-2 | `.{uid}.wp-block-sgs-testimonial-slider` (0,2,0) | (0,1,0) | DEAD |

- `.sgs-testimonial-slider__arrow` (DEFENSIBLE). **Reach:** `testimonial-slider/render.php`: `$arrow_prev_html` and `$arrow_next_html`, 2 per slider when `showArrows` is on. **Leak:** permanent. **Evidence:** Glyph buttons (24px); a body-typography control should not resize them. The block has no arrow size control, so size is fixed.
- `.sgs-testimonial-slider__pause-btn` (DEFENSIBLE). **Reach:** Built in JavaScript only: `testimonial-slider/view.js`: `pauseBtn.className = 'sgs-testimonial-slider__pause-btn';`, 1 per autoplaying slider. **Leak:** permanent. **Evidence:** UI chrome glyph button.
- `.sgs-testimonial-slider__pause-icon` (DEFENSIBLE). **Reach:** Built in JavaScript only: `view.js`: `icon.className = 'sgs-testimonial-slider__pause-icon';`, 1 per autoplaying slider. 2 declarations. **Leak:** permanent. **Evidence:** UI chrome glyph.
- `.sgs-testimonial-slider__empty` (DEAD). **Reach:** No markup emits `sgs-testimonial-slider__empty` (absent from `render.php`, `view.js`, `edit.js`, `includes/`). 2 declarations. **Leak:** n/a. **Evidence:** Nothing renders it.


## 4. Item 3b: CANNOT-RESOLVE (54 findings)

**Status (2026-10-07): 4 remain.** Every row below marked CLASS 4 shaped, the 9 cause-H rows (the `nav-drawer-menu` ornament closed through gap 13 and a `:where()` default), and the `buybox` cart price (it sits inside the add-to-cart button, so its literal was removed and it inherits `addToCartFontWeight`) were closed by giving the element a client control (`ea574379a`, `6ff3e3687`). Section 6 lists the 4 that remain. The table is the triage as it was measured.

The gate reports CANNOT-RESOLVE when it could not tell which element a control paints, or how the declaring element relates to it, and it will not guess. Section 4.1 groups the 54 by why. Section 4.2 says what they are once the cause is removed. Section 4.3 lists every one, as `node scripts/check-hardcoded-render-defaults.js --survey --verbose` prints them.

### 4.1 Causes, with counts

| Cause | Findings | Why the control or markup could not be resolved | What the gate would need |
|---|---|---|---|
| **A. Editor-only markup** | 0 | A declaring class that exists only in `edit.js` renders nothing on the front end. The gate no longer reports one (`87eb25957`): a class with no emitter in the block's PHP, its required PHP, its other scripts or `includes/` is excluded. | Done. |
| **B. Markup built outside the block directory** | 19 | The class is emitted by a shared PHP builder in `includes/` (`class-grid-pagination.php`, `buybox-guided.php`, `product-card-*.php`), or built at run time from a prefix argument (`$base_class . '__page-btn'`). `readBlockPhpFiles` now follows a block's `require` / `require_once` one hop (`53ba85750`), which resolved the 12 `sgs/post-grid` card-part findings. The hop is not transitive, deliberately: `includes/render-helpers.php` requires the whole helper tree and almost every block requires it, so a transitive follower would put every helper's markup into every block's element model and manufacture false findings. A file named for the block (`<slug>-*.php`) is the exception: it is followed at any depth, except one named for a longer-named sibling block (`nav-drawer-menu-*.php` is not followed from `nav-drawer`). The 19 rows that remain carry the original B label (`buybox` guided 6, `card-grid` 2, `post-grid` page buttons 2, `product-card` 9). Which of the 19 are caused by a missing `require` and which by a class built from a prefix argument is **not re-counted**: the original 31 was attributed by reading the markup, and only the 12 resolved rows are measured. | Resolve a class built as `$prefix . '__x'` from the call site's prefix argument (the hop stays non-transitive). |
| **C. JavaScript-built markup** | 4 | The element is created in `view.js` / `guided.js` (`el.className = '...'`), so no PHP tag carries it. | Parse `className = '...'` assignments and `createElement` chains in the block's front-end scripts into the markup tree. |
| **D. A control's target element is not a parseable literal tag** | 20 | The declaring element IS found, but at least one control for the same property targets an element whose class is assembled in a PHP variable (`buybox/render.php`: `$add_to_cart_button_classes = 'wp-element-button buybox__add-to-cart'`) or inside a sprintf template (`cart/render.php`: `'<span class="sgs-cart__badge%2$s" ...'`). One unplaceable control makes every declaration of that property in the block unresolvable, even when that control is on an unrelated element (a notify-form label against an add-to-cart button). | Resolve a class held in a `$classes` variable and a class glued to a sprintf placeholder. Separately, decide a declaration against only the controls that could plausibly be its ancestors, so an unplaceable control on a sibling leaf does not poison it. |
| **E. A bare-tag declaring selector** | 1 | The declaring selector ends in a tag (`.sgs-theme-toggle__icon svg`), which has no class for `matchInstances` to match. | Match a tag compound through its nearest classed ancestor and the tags present in that subtree. |
| **F. A printf placeholder as the tag name** | 1 | `media/render.php`: `'<%1$s class="sgs-media__caption">%2$s</%1$s>'`. The tag scanner requires a letter after `<`, so the element is never added to the markup tree. The control selector also starts with an unresolved `$id_wrap`. | Treat `<%N$s` as an element of unknown tag and keep its class list; evaluate `$id_wrap = '.' . $scope_esc`. |
| **G. A printf placeholder glued to a class token** | 0 | `option-picker/render.php`: `'<span class="sgs-option-picker__pill%s">%s</span>'`. The class token `sgs-option-picker__pill%s` fails the class-name test and the whole class is dropped, so the pill (the control's element) is missing from the model. Its one finding, the pill's own `line-height: 1`, is gone: the declaration was dead (a flex or grid container whose only text overrode it) and was removed in `4a4d442fd`. The gap itself is still open for any future declaration on a sprintf-glued class. | Strip a trailing `%s` / `%N$s` from a class token and keep the stem. |
| **H. A control selector in a required `includes/` file cannot be resolved** | 9 | Newly visible after `53ba85750`: the gate now reads `sgs/account` (6) and `sgs/nav-drawer-menu` (3) required `includes/` files, which hold typography calls whose selectors it cannot resolve to a class (survey reason: "a control selector in the PHP could not be resolved to a class"). The cause inside those selectors is not yet diagnosed. | Diagnose per call; likely the same variable-built selectors as cause D. |
| Total | 54 | | |

Net effect of the `require` hop on the CANNOT-RESOLVE count is -3 (64 to 61): 12 `sgs/post-grid` findings resolved and 9 findings that were invisible appeared (H). Most rows labelled B in the original triage were never require-caused: `sgs/buybox`'s notify-heading rows come from `notify-form.php`, which was always inside the block directory, and fail on dynamic class markup (cause D) instead. The original count of 31 for cause B overstated what a `require` follower could fix.

### 4.2 What the 54 are really, one level down

As measured at triage. Every CLASS 4 shaped row below now has a control (section 7 gap 7).


- **CLASS 4 shaped: 40** (52 at triage, less the 12 `sgs/post-grid` card parts that now resolve and are no longer findings, though those elements still have no control). For these the block has controls for the property but none on, or above, the declaring element (the only controls are on sibling leaf elements such as a title, a price or a label), so the real question is "this element has no control", not "the gate could not place it". This is a reading of the controls list and the markup, not gate output; the gate cannot prove it.
- **Own control already exists: 1** (`media` figcaption font-size). The gate now checks a resolved own control first (`87eb25957`), but this selector list also holds a bare `figcaption` the gate cannot place (section 7 gap 4), so the row stays CANNOT-RESOLVE. CLASS 1 in effect.
- **CANNOT-TELL from source: 4** (`cart` badge x2; `buybox` cart-price; `theme-toggle` icon glyph, which is not text).
- **Newly visible, not classified: 9** (cause H: `sgs/account` 6, `sgs/nav-drawer-menu` 3). Whether they are CLASS 4 shaped has not been read.

40 + 1 + 4 + 9 = 54.

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

As measured at triage. Every element in the second table now has a control (`ea574379a`, `6ff3e3687`, `fd0be21e4`; section 7 gap 7), except three rows this work did not touch: the value ladder and `form` elements (closed earlier, section 6), `option-picker` (not re-checked; the gate reports none of its rows) and `google-reviews` (its own session).

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

`E14_OPEN_BACKLOG` is `CLASS-2: 4`, `CLASS-3: 1`, `CANNOT-RESOLVE: 2`. The ceilings follow the gate's own output, so a ceiling moves only when findings disappear, and only in the commit that removes them. Never raise them.

Measured 2026-10-07 on clean detached worktrees, from `plugins/sgs-blocks`: `node scripts/check-hardcoded-render-defaults.js --check` reports `CLASS-2 4/4, CLASS-3 1/1, CANNOT-RESOLVE 2/2` and 0 net-new legacy violations (each lowering measured in the commit that removed the rows: 31 to 28 at `05b5923d8`, 54 to 21 at `ea574379a`, 21 to 5 at `6ff3e3687`, 5 to 4 by gap 13, 4 to 3 by the theme-toggle `iconSize` control, 3 to 2 by the bare-tag and JS-leaf rules of gap 4; CLASS-2 28 to 23 by the `sgs/form` `fileButton` and `filePrompt` surfaces); `--self-test` reports `124/124 checks passed`.

**Shipped in `6f1963c28` (2026-10-06).** The 10 DEAD declarations deleted with their whole rules; `sgs/form` given `label` and `field` typography surfaces; both value ladders given `valueLadder` and `valueLadderSaving` surfaces, with their duplicated markup unified into `includes/helpers-value-ladder.php::sgs_value_ladder_markup`. Every literal on an element that now owns a control sits inside `:where()`, which also repaired two real defects: the floated-label state's (0,4,0) size and weight, which no control could beat, and the ladder row weights, which blocked the ladder's own font-weight control. Unifying the ladder markup put it outside the block-directory walk, which cost 4 CANNOT-RESOLVE rows, and buybox's first `line-height` control made one pre-existing literal visible; both were absorbed by de-specifying those literals.

**Shipped in `75a583e23` (2026-10-07): nine unreachable typography literals became client controls on three blocks.**

- `sgs/product-faq` gained a `question` prefix on the parent, `sgs/countdown-timer` gained `number`, `label` and `expired`, and `sgs/process-steps` gained `icon` and `description` with its existing `number` family completed.
- **Each block has ONE Typography panel**, built with the `targets` array of `src/components/TypographyControls.js::TypographyTargetSwitcher` (2 to 3 targets render as segmented buttons, 4 or more as a dropdown), not a panel per element. `src/blocks/trust-bar/edit.js` is the reference mount. Existing single-prefix mounts were folded into the one panel.
- Every literal was wrapped in `:where()` rather than deleted, so the default still paints while the control outranks it; layout declarations keep their own specificity. `sgs/process-steps` needed no `step` prefix, because each leak target owns its alignment.
- Every helper call builds its selector inline, which is what registers element governance.
- This closed 9 FIX declarations.

**Shipped in `53ba85750` (2026-10-07): the gate follows a block's `require` one hop into shared PHP.** `readBlockPhpFiles` resolves `require` and `require_once` one hop from the block's own PHP files; section 4.1 gives the effect, why the hop is not transitive, and the exception for files named for the block. The behaviour carries its own negative control: `selfTestRequireHop` asserts that a file required BY THE BLOCK is in the model and that a file required by THAT file is not, because a test of the positive alone passes identically for a transitive follower. Making the follower transitive on purpose drops the suite to 21/24.

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
| After `87eb25957`..`c70b7eb54` | 3.1, 3.2, 4.1 | 35 | 1 | 55 |
| var() fixed and admitted (`00994a40d`..`dc822fcdd`) | 7 gap 1 | 31 | 1 | 54 |
| InnerBlocks template children modelled (`05b5923d8`) | 7 gap 9 | 28 | 1 | 54 |
| Controls for every CLASS 4 shaped element (`ea574379a`, `6ff3e3687`) | 4.3, 5, 7 gap 7 | 28 | 1 | 5 |
| Returned markup placed in its caller's element | 7 gap 13 | 28 | 1 | 4 |
| `sgs/theme-toggle` `iconSize` control | 3, 4.3 | 28 | 1 | 3 |
| Bare tag on an unknown-tag element, childless JS-built control element | 7 gap 4 | 28 | 1 | 2 |
| `sgs/form` `fileButton` and `filePrompt` surfaces (`880aab178`, `f21461b1a`) | 3.2 | 23 | 1 | 2 |
| Form heading and step-number surfaces; slider, banner, business-info, button and store-selector defaults (`e0a22e070`, `9ef97b909`) | 3.2 | 4 | 1 | 2 |
| **Now: floor** | | **4** | **1** | **2** |
| Remaining floor | | 4 | 1 | 2: the `cart` badge (two rows; accepted floor, verdict below) |

The descent this section predicted was 33 / 1 / 54. The two differences are measured, not missed: the `cta-section` headline pair is DEFENSIBLE (2 CLASS-2), and the own-control reorder clears only one of its two named rows, because `media`'s caption selector list also contained a bare `figcaption` that the gate could not place (causes E and F); gap 4 now places it. The option-picker pill's row went with its dead `line-height: 1`.

The 5 DEFENSIBLE findings (4 CLASS-2, 1 CLASS-3) are the floor of the CLASS-2 and CLASS-3 ceilings: they stay counted unless a mechanism removes them. Bean (2026-10-07) chose controls over exemptions for the `var()` rows; no marker comment or baseline entry exists. The `cta-section` headline's 3 rows are CLASS 1: the gate reads its `sgs/heading` child's controls (section 7 gap 9).

**Shipped 2026-10-07 (`00994a40d`..the admission commit): every `var()` row fixed, then `var()` admitted.**

- The selector capture no longer leaks a multi-line value (`linear-gradient(` … `);`) into the next rule's selector (`00994a40d`, with a self-test that fails without it).
- `sgs/form` gained `helpText`, `errorText`, `fileStatus`, `reviewHeading`, `reviewDetail` and `stepLabel` surfaces (`875196fe5`). `sgs/product-card` lost twelve unwritten custom-property hooks, merged its duplicate title rule and gained `valueLadderSavingColour` (`9924e4e3f`). `choice-flow` gained four colour controls through its showcase colour map, `google-reviews` gained `mutedTextColour` and `accentColour` (Google's palette stays the default), `team-member` gained `socialLink`, and `table-of-contents` moved its root size into `:where()` (`5a9b9b9da`). `cta-section` gained `ribbon` and `stats` (`7dfc6552b`).
- The `cta-section` headline got no section-level surface: it is an `sgs/heading` child whose own controls (0,2,0) out-rank the stylesheet default, and HC2 keeps a composite's text typography on the child. Its three rows are CLASS 1 since gap 9 was built.
- Admission: `isLiteralConstant`'s E14 call admits a `var()` value unless the block writes one of the properties it reads (`isUnwrittenVarValue`, `collectWrittenCustomProps`). Measured on a clean worktree, the ceilings fell to 31 / 1 / 54.
- A /qc-council pass (block CSS, gate logic, project rules; 2026-10-07) found no control left to a source-order tie only after these follow-ups: the product-card CTA defaults now load after the shared `.sgs-button` base (block.json `style` lists `sgs-button-style` first), the bound-card price, description, note, from-label and brand defaults moved to `:where(.product-card) .X` with nine unwritten hooks removed, the live variable card's prices lost a hard-coded `'Fraunces'` for the display token, the form's active step weight and choice-flow's note sub-line were fixed (`ef7a33daf`, `4fa8c204f`), and the gate's selector capture and writer set were hardened with each branch pinned by a mutation-tested self-test (`dc822fcdd`, 47/47). google-reviews' accent hover and active shades still read Google's fixed blues: handed to the session that owns google-reviews.
- **Live, eye-care-test (deploy 3e54d6f08, 7 fixture specs, 375 / 768 / 1440, D / S / C with a sham sibling):** every default is unchanged against a before-deploy baseline except the intended bound price family; every new control wins on its element; the product-card CTA holds weight 600 and line-height 21px on typed and bound cards; the editor shows 0 console errors and the card title at 20px. Not coverable on that site: the value-ladder saving colour (no product with pack-size variations), the google-reviews maps link (synced data only), choice-flow step 2.

**Shipped 2026-10-07 (`0feec30c9`..`94755870d`): the four small items this section listed.**

- `sgs/product-card` has one Typography switcher in both modes (`0feec30c9`). The bound-only "Brand overlay typography" panel is gone; the `brand` target shows in both modes and offers size, family, weight and letter spacing, which typed cards lacked.
- `sgs/form` `fieldFontWeight` and `fieldFontStyle` name `css_element: field-input` (`cc144ca96`). Before, `db_lookup.py::attr_for_property('sgs/form', 'font-weight'|'font-style')` raised `AmbiguousCssPropAttrError`, because `_root_domain_element_clause` counts a NULL element as root, so a cloned form's root weight or italic could not be written. A sweep of all 2,071 block/property pairs found these two as the only typography collisions; the other 30 (max-width, background, padding, min-height) belong to the cloning track.
- `scripts/check-import-shadowing.js` (fast tier, `fbc62f399`, `6c1f55708`, `94755870d`) fails an attribute destructured under the name of an import or a top-level function, class or variable, including through a renamed attributes object, which counts only inside the function that renames it. A reassignment (`let attrs = attributes;`) is not followed. `cd004d31a^`'s `product-card/edit.js` gives exactly its 1 violation; HEAD gives 0.
- The `var()` admission was measured and planned (section 7 gap 1).

**Still open on this track, outside the gate gaps of section 7** (each resumable cold):

- **`sgs/nav-drawer-menu` drill-down panel: fixed and proved live (2026-10-08).** The open panel (`position: absolute; inset: 0`) was anchored to the 44px item and accordion row. Two causes, both removed in `style.css`: the item and row were `position: relative` (now static in `[data-drill-enhanced]`, the row a one-cell grid so the expander keeps its place, and a whole-row toggle stays full width), and the drawer's entrance stagger (`animation ... both`) left `translate: 0px` on the item, which makes it a containing block (now `animation-fill-mode: backwards` in drill mode). Measured on sandybrown through the preview route (a draft copy of the test drawer set to drill-down, deleted afterwards; the active drawer is still 3778) at 375 and 1440: panel 252px, equal to the bar, the Back row and all four sub-items 44px, the Back row with no border, each sub-item's own separator line (`::before`) as the only divider, and a keyboard focus ring on the Back row. Before the second cause was fixed, the same page showed a 44px panel with the item `position: static`, and a style tag setting `animation-fill-mode: backwards` on the items gave 252px. Accordion mode is untouched: every new rule sits under `[data-drill-enhanced]`.
- **`sgs/cart` badge (2 CANNOT-RESOLVE rows, verdict 2026-10-07).** The badge is not the unseen part; the element its control sits on is. The only font-size and weight control is the `pill` typography surface, whose selector is `.sgs-cart__trigger`, and that element is built in `includes/helpers-cart-panel.php::sgs_cart_trigger_html`, a PHP file that `render.php` reaches only through `includes/render-helpers.php` (two hops, and not named for the block), so the gate has no `.sgs-cart__trigger` element and the control reads as unplaceable. The badge itself is built in `render.php` by `sprintf`, not by JS (`view.js` and `count-pop.js` only toggle `sgs-cart__badge--visible` and `--pop`, so `isEditorOnlyClass` is not involved); its icon-mode class is glued to a placeholder (`sgs-cart__badge%2$s`) and is lost, while the pill-mode badge parses. Clearing both rows would need all of: reading `helpers-cart-panel.php`, placing `$trigger_inner_html` (a ternary-assigned variable in top-level code, which gap 13 does not follow) into the trigger's `%3$s`/`%4$s`, and keeping a class glued to a placeholder. That is three gate features for two rows, so none is built; Bean (2026-10-08) accepted the two rows as the permanent floor of the CANNOT-RESOLVE ceiling. The CSS is also in a defensible state: the `font-size: 11px` literal applies to the icon-mode overlay badge only, and the pill style overrides it with `inherit`.
- **`sgs/media` editor sample.** In video mode the canvas shows a black 64px bar reading "0:00 / 1:24" under the "Preview not available" notice so the `videoTime` typography is visible; it reads as a broken player. A clearer frame (a label, or the poster behind it) is a design call.
- **`sgs/product-card::valueLadder*::L3`** (24 baselined wiring-fingerprint gaps) need a bound-mode canvas mirror. **Parked by Bean (2026-10-07).** The `#block-{clientId}` scoped `typographyPreviewCss` rule that cleared `priceFromLabel*` (`02e259b33`) is the mechanism that would clear these too.

## 7. Capability gaps in the gate that this triage exposed

Gaps 1, 4 (tag names, bare tag on an unknown-tag element, JS-built leaf controls), 9, 10(b), 12 and 13 are built; the others are open, each evidence for a later gate task. Shared `includes/` PHP is read one hop from a block's `require`, and files named for the block at any depth, by `readBlockPhpFiles` (section 4.1), so it is not on this list.

1. **`var()`-valued declarations: built (2026-10-07).** The record below is how it was designed and measured.

   **Was: `var()`-valued declarations are invisible to E14.** `isLiteralConstant` rejects any value containing `var(--`, but a `var(--wp--preset--font-size--small)` on a descendant blocks an ancestor control exactly as a literal does, and so does a block's own `var(--sgs-x, 14px)` when nothing writes `--sgs-x`. Direct evidence: closing the countdown-timer rows (`75a583e23`) needed `__number`, `__label` and `__expired`'s `var()` font sizes de-specified alongside their literals, while the gate reported nothing for them.

   **Admission rule (built).** A `var()` value counts as a literal on the E14 path (`modelEligible`, never the legacy path) unless the block WRITES one of the custom properties it reads: an assignment (`--x:` or `'--x' =>`) or a whole quoted `'--x'` map entry in the block's own PHP or JS, or in any PHP its files reach by `require`. The writer set follows requires transitively, unlike the element model: `nav-drawer-menu` writes `--sgs-ndm-orn-size` three hops out (render.php, nav-menu-markup, nav-drawer-menu-items, nav-drawer-menu-extras-css), and a write cannot pollute the element model. A bare mention is not a write (`google-reviews/render.php` passes the string `'var(--sgs-gr-blue)'` as a hover value, which is a read), and a property defined only in a stylesheet is a default, never a control channel. A preset token (`--wp--preset--*`) is never written by a block, so it always counts. Measured with a scratch copy of the gate (`isLiteralConstant` bypassed for `modelEligible` values matching `CSS_VAR_RE`, legacy owners left untouched), diffed against `--survey --verbose` from the real gate on `95b21c01f`: +45 findings, of which 7 use a property some block file writes (`--sgs-gr-blue` x2, `--sgs-ndm-orn-size`, `--sgs-ndm-trail-size`, `--sgs-pc-badge-fg`, `--sgs-card-title-colour`, `--sgs-whatsapp-cta-card-text-wrap`) and were taken as exempt; a /qc-council rater then showed `--sgs-gr-blue` is only read, so 6 fall out under the rule and 2 more google-reviews rows (`a.sgs-google-reviews__maps-link`, `.sgs-google-reviews .sgs-google-reviews__review-link`, `color: var( --sgs-gr-blue )`, CANNOT-RESOLVE) join the table below, which therefore lists 38 of the 40. 12 of product-card's own properties have no writer anywhere in `src/` or `includes/`, so they are literals that only look like hooks.

   **The 40 rows the rule admitted (13 CLASS-2, 27 CANNOT-RESOLVE), all fixed before admission except the `cta-section` headline size (gap 9).** Bean's decision (2026-10-07): fix them all first, then admit `var()` into the existing categories at zero ceiling cost; no separate counter.

   **The six "DEFENSIBLE" rows get controls (Bean, 2026-10-07).** The 5 google-reviews colours (Google's own palette) and the `cta-section` headline `font-size` are not exempted: each gets an inspector control whose default is today's exact value, so the rendered default is unchanged and a client may still override it. No marker comment and no ceiling rise. Outcome: the 5 google-reviews colours got two block-wide controls; the headline already had one, its own `sgs/heading` child's (gap 9), which the gate reads since gap 9 was built.

   **Caveats on the product-card rows.** `.product-card h3` and `.product-card .sgs-product-card__title` both declare `font-size: var(--sgs-card-title-font-size, 20px)` on the same element, so 14 rows are about 11 distinct fixes. Two rows (`.product-card .sgs-button` weight and line-height) are reported under a selector the gate garbled: its multi-line value capture leaked a `linear-gradient( 135deg, … )` continuation into the selector text. Fix that capture before admission, or those rows cannot be verified. `.product-card h3 color` sits under the theme-heading caveat too. Each row gets the same treatment as the literal rows of section 3: its own control, or its default moved up to the ancestor whose control should reach it, never a bare `:where()` wrap where the control is on an ancestor. Rows on headings must be measured live first (the theme's global heading styles hold `h1`-`h6`; see the `cta-section` headline, already DEFENSIBLE as a literal).

   | Block | Class | Selector | Declaration |
   |---|---|---|---|
   | `sgs/choice-flow` | CANNOT-RESOLVE | `.sgs-choice-flow__progress-badge` | `color: var(--wp--preset--color--primary-dark, #0F4C4C)` |
   | `sgs/choice-flow` | CANNOT-RESOLVE | `.sgs-choice-flow__stepper-circle` | `color: var(--wp--preset--color--text-muted, #606D80)` |
   | `sgs/choice-flow` | CANNOT-RESOLVE | `.sgs-choice-flow__stepper-item.is-current .sgs-choice-flow__stepper-circle, .sgs-choice-flow__stepper-item.is-complete .sgs-choice-flow__stepper-circle` | `color: var(--wp--preset--color--primary, #1F7A7A)` |
   | `sgs/choice-flow` | CANNOT-RESOLVE | `.sgs-choice-flow__stepper-item.is-current .sgs-choice-flow__stepper-label, .sgs-choice-flow__stepper-item.is-complete .sgs-choice-flow__stepper-label` | `color: var(--wp--preset--color--primary, #1F7A7A)` |
   | `sgs/choice-flow` | CANNOT-RESOLVE | `.sgs-choice-flow__stepper-label` | `color: var(--wp--preset--color--text-muted, #606D80)` |
   | `sgs/choice-flow` | CANNOT-RESOLVE | `.sgs-choice-flow__summary-note` | `color: var(--wp--preset--color--text-muted, #6b7280)` |
   | `sgs/cta-section` | CLASS-2 | `.sgs-cta-section__headline` | `font-size: var(--wp--preset--font-size--x-large)` |
   | `sgs/cta-section` | CLASS-2 | `.sgs-cta-section__ribbon` | `font-size: var(--wp--preset--font-size--x-small, 0.75rem)` |
   | `sgs/cta-section` | CLASS-2 | `.sgs-cta-section__stats` | `font-size: var(--wp--preset--font-size--small)` |
   | `sgs/form` | CLASS-2 | `.sgs-form-field__error` | `font-size: var(--wp--preset--font-size--x-small, 0.8125rem)` |
   | `sgs/form` | CLASS-2 | `.sgs-form-field__error-message` | `font-size: var(--wp--preset--font-size--x-small, 0.8125rem)` |
   | `sgs/form` | CLASS-2 | `.sgs-form-field__file-hint` | `font-size: var(--wp--preset--font-size--x-small, 0.8125rem)` |
   | `sgs/form` | CLASS-2 | `.sgs-form-field__help` | `font-size: var(--wp--preset--font-size--x-small, 0.8125rem)` |
   | `sgs/form` | CLASS-2 | `.sgs-form-file__preview` | `font-size: var(--wp--preset--font-size--small, 0.9375rem)` |
   | `sgs/form` | CLASS-2 | `.sgs-form-file__progress` | `font-size: var(--wp--preset--font-size--small, 0.9375rem)` |
   | `sgs/form` | CLASS-2 | `.sgs-form-review__detail` | `font-size: var(--wp--preset--font-size--small, 0.9375rem)` |
   | `sgs/form` | CLASS-2 | `.sgs-form-review__heading` | `font-size: var(--wp--preset--font-size--medium, 1.125rem)` |
   | `sgs/form` | CLASS-2 | `.sgs-form__progress-step-label` | `font-size: var(--wp--preset--font-size--x-small, 0.75rem)` |
   | `sgs/google-reviews` | CANNOT-RESOLVE | `.sgs-google-reviews__badge-text span` | `color: var( --sgs-gr-ink-muted )` |
   | `sgs/google-reviews` | CANNOT-RESOLVE | `.sgs-google-reviews__date` | `color: var( --sgs-gr-ink-muted )` |
   | `sgs/google-reviews` | CANNOT-RESOLVE | `.sgs-google-reviews__meta` | `color: var( --sgs-gr-ink-muted )` |
   | `sgs/product-card` | CANNOT-RESOLVE | `.product-card .sgs-button` | `font-weight: var(--sgs-product-card-btn-font-weight, 600)` |
   | `sgs/product-card` | CANNOT-RESOLVE | `.product-card .sgs-button` | `line-height: var(--sgs-product-card-btn-line-height, 1.4)` |
   | `sgs/product-card` | CANNOT-RESOLVE | `.product-card .sgs-product-card__description` | `font-size: var(--sgs-product-card-desc-font-size, 14px)` |
   | `sgs/product-card` | CANNOT-RESOLVE | `.product-card .sgs-product-card__price` | `font-family: var( --wp--preset--font-family--display )` |
   | `sgs/product-card` | CANNOT-RESOLVE | `.product-card .sgs-product-card__price` | `font-size: var( --sgs-card-price-font-size, 28px )` |
   | `sgs/product-card` | CANNOT-RESOLVE | `.product-card .sgs-product-card__price` | `font-weight: var( --sgs-card-price-font-weight, 700 )` |
   | `sgs/product-card` | CANNOT-RESOLVE | `.product-card .sgs-product-card__price-note` | `font-size: var(--sgs-product-card-price-note-font-size, 13px)` |
   | `sgs/product-card` | CANNOT-RESOLVE | `.product-card .sgs-product-card__tag` | `font-size: var(--sgs-product-card-tag-font-size, 11px)` |
   | `sgs/product-card` | CANNOT-RESOLVE | `.product-card .sgs-product-card__title` | `font-size: var( --sgs-card-title-font-size, 20px )` |
   | `sgs/product-card` | CANNOT-RESOLVE | `.product-card .sgs-product-card__title` | `font-weight: var( --sgs-card-title-font-weight, 500 )` |
   | `sgs/product-card` | CANNOT-RESOLVE | `.product-card h3` | `color: var(--wp--preset--color--text, #3a2e26)` |
   | `sgs/product-card` | CANNOT-RESOLVE | `.product-card h3` | `font-size: var(--sgs-card-title-font-size, 20px)` |
   | `sgs/product-card` | CANNOT-RESOLVE | `.sgs-product-card__swatch-more` | `font-size: var( --sgs-pc-swatch-more-font-size, 11px )` |
   | `sgs/product-card` | CANNOT-RESOLVE | `.value-ladder__saving` | `color: var( --wp--preset--color--text, #1a1a1a )` |
   | `sgs/table-of-contents` | CANNOT-RESOLVE | `.sgs-toc` | `font-size: var(--wp--preset--font-size--small, 0.875rem)` |
   | `sgs/team-member` | CANNOT-RESOLVE | `.sgs-team-member__overlay-bio` | `font-size: var(--wp--preset--font-size--small, 0.875rem)` |
   | `sgs/team-member` | CLASS-2 | `.sgs-team-member__social-link` | `font-size: var(--wp--preset--font-size--small, 0.75rem)` |

   Per block: product-card 14, form 9, choice-flow 6, google-reviews 5 (3 listed plus the 2 `--sgs-gr-blue` rows above), cta-section 3, team-member 2, table-of-contents 1. Team-member's overlay-bio row was already in `:where()` before this work began, so 39 were open. The admission's self-tests: a preset token fires, a written `--sgs-*` property does not, a stylesheet-only definition still fires, and the writer set is transitive, counts JS, and ignores a `var(--x)` read and a stylesheet. The ceilings fell to the clean-worktree measurement.

2. **Own-control verdicts: built.** `classifyInheritedHardcode` checks a resolved control on the declaring element first (`87eb25957`); the verdict needs every member of a selector list resolved, and `media`'s bare `figcaption` member now is (gap 4).
3. **One unplaceable control poisons the whole property: open, and moves no count today.** Cause D: a control whose element the gate cannot place leaves every declaration of that property CANNOT-RESOLVE, even where the control is on an unrelated element. The survey lists two unplaceable controls (`account` menu `a`, `text` root with a run-time class) and no row depends on either; the `media` video-time control that did was a different case (a leaf element built by `view.js`), closed by gap 4. Build it when a row needs it.
4. **A tag name that is not literal: built (2026-10-07); a bare tag against it and a JS-built leaf control: built (2026-10-08).** `'<%1$s class="sgs-media__caption">'` and `<<?php echo esc_attr( $level ); ?> class="x">` are read as an element of unknown tag (`*`) that keeps its class, and a close tag of the same shape ends it (`buildMarkupModel`; `selfTestUnknownTag`, each branch mutation-checked). Measured on a clean detached worktree, `--survey --verbose` on `origin/main`'s gate against the same gate with the change: byte-identical, because the `media` caption row stays CANNOT-RESOLVE (its selector list also holds a bare `figcaption`, which still cannot be placed) and no other declaration sat on such an element. **Still open:** a class glued to a placeholder (`class="sgs-cart__badge%2$s"`, `'<span class="sgs-option-picker__pill%s">'`) loses the class token, and the process-steps title is still not listed as a leak target.

   **Bare tag on an unknown-tag element (built).** A declaring compound that is a bare tag (`.wp-block-sgs-media figcaption`) is the same element as a control on an unknown-tag element (`scripts/lib/e14-unknown-tag.js::bareTagMatchesUnknownTag`) when the block file that built the element offers the tag as a value the tag can take: a whole quoted string inside an array literal (`array( 'figcaption', 'div' )` in `$allowed_caption_tags`) or as a ternary or `??` branch; a plain assignment (`$wrap = 'div'`), a comparison or a call argument is not evidence (a /qc-council rater reproduced a false match from `$wrap = 'div'`), and the element sits under the prefix (a root prefix holds for any element of the block; a classed prefix needs the element to be its descendant). A tag the PHP never names, a literal-tag element and an element outside a classed prefix all stay unresolved. `relateElements` runs it before the bare-tag branch returns `unknown`.

   **A control on a childless JS-built element (built).** `scripts/lib/e14-js-leaf.js::isJsLeafClass`: when the block's front-end JS creates the control's element (`const time = el( 'span', 'sgs-video__time', … )`) and never adds a child to its variable (`append`, `appendChild`, `prepend`, `insertBefore`, `replaceChildren`, `replaceWith`, `innerHTML`, `outerHTML`, `insertAdjacent*`), no PHP element is inside it and it is none of them, so `relateElements` returns `unrelated` (a class the PHP markup also emits is never a leaf). `media`'s caption row needed both: `.sgs-video__time` (built by `view.js`) was the control that kept the verdict at `unknown` once the `figcaption` member was placed.

   Measured on a clean detached worktree at `be986230e`, `--survey --verbose` before and after: the only changes are the `sgs/media` row leaving CANNOT-RESOLVE for CLASS 1 (`CANNOT-RESOLVE` 3 to 2, `NET-NEW` 32 to 31, `Classified CLASS 1` 54 to 55); no other line differs. Self-tests (`selfTestBareTagOnUnknownTag`) pin each branch, and a scratch mutation run that disables one branch at a time (the unknown-tag test, the ternary-branch evidence, the array evidence, the evidence call, the classed-prefix ancestry, the root-prefix shortcut, the child-adding test, the creation test, the PHP-emitted exclusion) turned the suite red for all nine.
5. **Class maps are not followed.** `includes/forms/field-render-helpers.php::field_headings` builds two live classes from a PHP array; a literal search finds only the map.
6. **State selectors are not exempt: kept that way on purpose (2026-10-08).** `[aria-current="true"]` (`store-selector`) is a state like `:hover`, but `.sgs-store-selector__item a[aria-current="true"] { font-weight: 600 }` out-specifies the link's `fontWeight` control, so a client cannot un-bold the current item. It is a real CLASS-2 finding; exempting it would lower a count by hiding a defect. Fix it with a control or `:where()`, not with an exemption.
7. **No CLASS 4 category; no row needs one now.** The 40 rows of that shape got controls instead of a label (Bean, 2026-10-07: "do all"): `product-card` rating, rating stars, RRP, saving badge, swatch count, brand and attribute-tag transforms, CTA line-height and text-align (`ctaLineHeight` through `sgs_button_element_style_css`'s scalar `LineHeight`); `buybox` stock, saving badge, the notify form (heading, labels, input, submit, status) and the guided meter and group title; `post-grid` and `card-grid` pagination, `post-grid` load-more, meta, badge, category, excerpt and read-more, `card-grid` glyph initial and badge; `media` video time; `account` card description, chip, progress step and guest line; `nav-drawer-menu` drill-back button. Adding controls to the grids made 16 more rows checkable, all fixed in `6ff3e3687`. A new uncontrolled element still trips the CANNOT-RESOLVE ceiling (4), so a separate category would hold nothing today.
8. **44 blocks have no E14 model**, so the gate reports nothing for them (section 5).
9. **InnerBlocks template children: built (2026-10-07).** A `[ 'sgs/<child>', { className: '<cls>' } ]` tuple in a block's editor template (`collectTemplateChildren`) makes `<cls>` a front-end class: the child renders it and the className is saved into the post, so `isEditorOnlyClass` no longer treats it as editor-only (before, a template class whose only literal sat in `edit.js` was silently skipped; `cta-section` was reported only because `includes/variations/sgs-cta-section-variations.php` repeats the class). The child's controls that paint its own root (`childRootControls`, built from the child's own element model) own the element when one strictly out-specifies the literal (`.{uid}.wp-block-sgs-heading`, (0,2,0), against (0,1,0)); a tie stays reported, as does any declaration whose selector holds a sibling combinator or `:not()`/`:is()`/`:has()` (the parsed chain under-counts its specificity), and a class two template tuples place is owned only when every tuple's child paints the property (qc-council 2026-10-07, also applied to the own-control branch; survey unchanged). The `cta-section` headline's size, weight and line-height moved to CLASS 1 (CLASS-2 31 to 28). Self-test case 13: a child with a root control exempts, a child without one still reports CLASS-2; removing either the ownership branch or the editor-only exception turns one of the pair red.
10. **The writer set is block-wide and cannot tell a control from a computed write** (qc-council, 2026-10-07; none mis-exempts a row today, all 25 exempted rows have a real writer). (a) A computed write counts: `product-card/render.php` writes `--sgs-pc-badge-fg` from `sgs_wcag_text_colour_for_bg()`, an auto-contrast value, which exempts its three `color: var(--sgs-pc-badge-fg, …)` rows. (b) **Built (2026-10-07):** a write inside a named function of a required file counts only when the block reaches that function (called, `->`/`::` called, or quoted as a callback by the block's own PHP, by top-level code of a required file, or by a reachable function; `collectWrittenCustomProps`, `phpFunctionBodies`, `phpNamesReferenced`); top-level code of a required file still counts because it runs on require. Measured against the previous gate on the same tree: no property gained anywhere, the median writer set fell from 94 to 90, the survey is byte-identical, and `nav-drawer-menu` keeps `--sgs-ndm-orn-size`. The remaining large sets are real: all 26 blocks holding `--sgs-gi-color` call the container wrapper or the grid-item helper. Reach is by name, so a common method name (`render`) reaches every function of that name; a quoted callback counts only when it holds an underscore (a prefixed name), so a quoted data word such as `'style'` reaches nothing (qc-council 2026-10-07; no block's writer set changed). Self-tests: a called helper, its callee and a quoted callback write; an unreached helper does not, even with a `}` inside a string; dropping the restriction, the string-aware brace match or the call-chain closure each turns one red. (c) A CSS default inside a PHP string (`'.x{--x:1.4}'`) and a PHP `#` comment still count as writes. (d) Computed names (`sprintf('--%s', …)`, `'--sgs-' . $n`, a JS template literal) are missed, which errs safe: the row is reported. JS comments, `getPropertyValue`/`removeProperty` reads and `*.test.js` files are excluded and self-tested.
11. **A control selector ending in a bare tag is unplaceable.** `includes/account/helpers-account-render-css.php::sgs_account_scoped_css` paints `menu` typography on `$root_sel . ' .woocommerce-MyAccount-navigation a'`; WooCommerce's `<a>` has no class, so `collectControlEmissions`' `addControl` sets `members` to null and every declaration of those properties in `sgs/account` becomes CANNOT-RESOLVE (cause D's mechanism, gap 3). `bareTags` already exists for a declaring selector; a control member ending in a tag could keep its classed ancestor and be `unknown` only for itself. **Measured 2026-10-07 after gap 12: no `sgs/account` row is CANNOT-RESOLVE today** (every account declaration is CLASS 1 through its other controls), so building this moves no count; it is precision for a future account declaration on a bare `a`, and the account menu selector still reads as the one unresolved control in `--survey --verbose`.
12. **Function parameters bind to call-site literals: built (2026-10-07).** `buildPhpVarResolver( files ).scopedAt( file, pos )` resolves a name inside the function that encloses the position: a name the function assigns itself reads its own body, and a parameter is bound to the argument each caller passes (the default for a call that omits it, UNK for a function nothing calls or a spread/named call), each argument resolved in its own caller's scope, so a pass-through chain such as `f( $bem_root )` carries the literal and two functions sharing a parameter name never conflict. `collectControlEmissions` resolves every helper call through it. Measured on the same tree before and after: `selector resolved to a class` 162 to 167 and `selector NOT resolved` 7 to 2 (the 5 gained are the `item` and `submenu` controls of `nav-bar-menu` and `nav-drawer-menu`, plus the item-padding call), no finding added or removed, ceilings unchanged. Self-tests pin each branch (`selfTestParamBinding`). A first version that pooled parameters block-wide conflicted on `$bem_root` (`nav-menu-markup.php` passes both blocks' roots to `sgs_nav_shared_badge_html`) and broke `account`'s `$root_sel` through its same-named argument; the scoped design fixes both. A /qc-council rater probed it (2026-10-07): method and static calls sharing a function's name, and a parameter the parser cannot read (attribute, intersection type) shifting later positions, were fixed with self-tests; the survey is byte-identical before and after. Known limits, each latent (the survey shows no block affected): a closure inside a function shares that function's scope, and call sites inside comments or strings count as callers. Both degrade toward UNK, never toward a wrong class, unless the only "caller" is a comment.
13. **Markup a function returns is placed in the element its caller puts it in: built (2026-10-07).** Three causes kept `.sgs-nav-drawer-menu__ornament` out of `__link`, and each is fixed:
    - **The markup is built in one place and spliced in another.** `lib/e14-markup-splice.js::spliceFragments` gives the outermost elements of a function (instances with no parent, inside its body) the parent each call of it lands in, whatever the assembly: an argument of `sprintf()`/`printf()` (the element holding that argument's `%N$s` or Nth plain `%s`), an argument of another block function (the element holding that parameter, wherever the function uses it), a concatenation inside one literal element in the same statement, a variable assigned from the call (every later read, through copies), or the function's return value (its own callers). A function with several landing elements gets one copy per element. Anything else stays unplaced and the row stays CANNOT-RESOLVE. A tag opened in an EARLIER statement never counts.
    - **A class value with a run-time part lost its literal class.** `class="sgs-x__orn' . ( … ) . '"` left the token `sgs-x__orn'` with its string quote, which failed the class-name test, so the ornament had no class and could not be matched at all. `classValueTokens` strips the quote from a token that touches one. A literal that ends in a quote and is followed by a plain call or variable (`'x--w' . esc_attr( $w )`) is only the front of a class, and a literal glued after a `.` onto code (`$base . '__pagination'`) is only the back of one, so neither becomes a class (a first version that kept both invented `__pagination` and `__dots` classes on the grids; a /qc-council rater found it).
    - **The helper file was two hops out.** `nav-drawer-menu-items.php` is required by `nav-menu-markup.php`, itself a hop-1 file, so it was never read. `readBlockPhpFiles` now follows a file named for the block (`<slug>-*.php`) at any depth, except a file named for a longer-named sibling block (`nav-drawer-menu-*.php` is not followed from `nav-drawer`); any other file is still followed one hop only (section 4.1). The blocks that read extra files today: `nav-drawer-menu` (six `nav-drawer-menu-*.php`), `nav-drawer` (`nav-drawer-chrome-css.php`), `choice-flow`, `container` and `media` (two each). The two extra helper calls come from `nav-drawer-chrome-css.php`, whose `chrome-slot` controls (`color`, `font-style`) are now checked; no verdict changed.

    Measured on clean detached worktrees at `origin/main`, `--survey --verbose` before and after: the only changes are the ornament row leaving CANNOT-RESOLVE (5 to 4), `Helper calls found` 170 to 172 and `selector resolved to a class` 167 to 169 (the `nav-drawer` chrome-slot controls above), with CLASS-2 unchanged. The ornament then read CLASS-2 under `item`, which is why `.sgs-nav-drawer-menu__ornament { line-height: 1 }` moved into `:where()` in the same change (no control: the ornament's box is one line tall by construction and a row line-height has no business on it). Self-tests pin the sprintf slot (numbered and plain), a wrapper parameter, a variable chain, a returned call, the class-token rules, the block-named require and its sibling exclusion, and the negative controls below; disabling each of 30 branches turns at least one test red.

    A /qc-council pass (2026-10-07; three raters, each finding reproduced) found seven wrong parents in the first version, all fixed with a test each: a copy made for a second landing element lost the parent of an inner function's elements when that function was defined first; two functions returning each other's markup made a parent cycle that hung the gate; a `?>` or `<?php` did not end a statement, so HTML opened before it adopted a later call; a call inside an attribute value (`aria-label="%1$s"`) became a child element; a variable read after the variable was reassigned, or in a comparison, still carried the call; a call inside a function the block does not define (`wp_strip_all_tags( … )`) or defines twice was treated as a pass-through (only `esc_html`, `esc_attr`, `esc_textarea`, `wp_kses_post`, `wp_kses`, `trim`, `ltrim`, `rtrim`, `strval`, `implode`, `join` and the `return`/`echo`/`print` constructs are); and a call inside a closure passed to `array_map` was read as part of the statement around it. A function with more than 400 elements (an icon set) stays under its first landing element, because copying it per element grew `nav-drawer-menu` from 9,731 to 114,377 instances for no verdict.

    The second pass found that those fixes over-corrected, and each is pinned too: a `<?php`/`<?=` boundary hid the HTML around an `echo` (`<div><?php echo F(); ?></div>` lost its placement), so output goes into whichever element is open at that point; an unknown function hid a literal element built inside its own argument (`apply_filters( 'f', '<a>' . F() . '</a>' )`), so an element the argument builds is checked first; `array()` is a pass-through again (`return array( 'html' => F() )`); a closure body is its own statement and its `return` is not the named function's; a reassignment ends the old value only after its own right-hand side and only outside a branch opened since; an aligned comparison (`$x      === ''`) and a method call that shares a function's name (`$o->sgs_x_wrap()`) are no landing. Compared with the first version over every block (713 non-icon placements, a harness in `C:\tmp\qc-a2`), the final module loses none; the icon-library rows differ only because of the 400-element cap.

    Known limits, all of which leave a fragment unplaced (a row then reads "unrelated" or CANNOT-RESOLVE, never a wrong CLASS-2): a landing site inside a double-quoted string (`"…$x…"`) is not read; a variable chain in top-level code (outside a function) is not followed; heredoc contents are not masked; a call whose result is built into a template held in a variable (`sprintf( $format, … )`) stays unplaced; a copy made before another function is placed under it does not carry that function.

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
- **No browser, no computed styles.** Specificity is computed from selector strings with a simple parser; "wins" and "cannot reach" follow from CSS inheritance and specificity rules, not from a measured page.
- **Scratch tooling.** The survey detail (control selectors, matched-instance counts) and the `var()` experiment (+48) came from scratch copies of the gate in the session scratchpad; the repo gate at triage time is the one reported in section 0; its later change is `53ba85750`.
- **The crude 86 (section 5) is an indicator only.**
- **Not checked:** `editor.css` and the editor canvas, `theme/` stylesheets, `includes/` helpers that hardcode typography, and `scripts/computed-route/` and `scripts/parity/` (out of scope by instruction).
