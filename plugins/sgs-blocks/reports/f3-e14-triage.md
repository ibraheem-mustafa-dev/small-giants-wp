# F3 gate: E14 triage and baseline retriage

Subject: `plugins/sgs-blocks/scripts/check-hardcoded-render-defaults.js` (Gate B), baseline `plugins/sgs-blocks/scripts/hardcoded-render-defaults-baseline.json`.
Status: the analysis stands; its highest-reach recommendations shipped 2026-10-06 in `6f1963c28` (see section 6). Originally: The one file changed besides this report is the baseline (section 2.3). No block `.php`, `.css` or `block.json` and no gate script was edited. Date: 2026-10-06.

## 0. Method, and what the numbers rest on

- Reproduced the survey with `node scripts/check-hardcoded-render-defaults.js --survey --verbose`: 137 net-new E14 findings (68 CLASS-2, 5 CLASS-3, 64 CANNOT-RESOLVE), 20 classified CLASS 1, 17 legacy findings accepted by the baseline.
- To see what the gate saw for each finding (the control selectors it resolved, how many markup instances matched each side) I ran a scratch copy of the gate from the session scratchpad with one extra logging hook. Nothing under the repo was touched by that copy; it reproduced the same 137 (68 / 5 / 64).
- Reach is read from each block's own markup (`render.php`, sibling PHP, `includes/` helpers, `edit.js` and `view.js`). Every "no markup emits this class" claim comes from a search of all `.php` and `.js` files under `src/` and `includes/`, plus `theme/`; one such claim was wrong on first pass (the form table headings are built from a class map in `includes/forms/field-render-helpers.php::field_headings`) and was corrected, so the DEAD rows carry the search scope.
- Specificity is computed from the emitted selector strings (`.{uid}` stands for the per-instance class). An inherited property reaches a descendant only through inheritance, so specificity does not rescue a control that targets an ancestor: a declaration on the descendant wins at any specificity. Specificity matters only for same-element pairs (CLASS 1).

Headline numbers:

| | Count |
|---|---|
| E14 findings triaged | 137 |
| CLASS 2 + CLASS 3 (73) judged FIX | 26 (22 CLASS 2, 4 CLASS 3) |
| ... DEFENSIBLE (documented intent or UI chrome) | 34 (33 CLASS 2, 1 CLASS 3) |
| ... DEAD (no markup emits the class) | 10 |
| ... EDITOR-ONLY | 3 |
| CANNOT-RESOLVE (64), CLASS 4 shaped | 52 |
| CANNOT-RESOLVE, editor-only | 5 |
| CANNOT-RESOLVE, own control already exists (CLASS 1 in effect) | 2 |
| CANNOT-RESOLVE, CANNOT-TELL from source | 5 |
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

Proof (run after the edit): `node scripts/check-hardcoded-render-defaults.js --check` exited **0** ("OK - 0 net-new legacy F3 violations across 95 blocks (17 known debt item(s) in baseline)"); `node scripts/check-hardcoded-render-defaults.js --self-test` printed **16/16 checks passed** and exited 0. The E14 line still reads `CLASS-2 68/68, CLASS-3 5/5, CANNOT-RESOLVE 64/64`, so no ceiling moved.

## 3. Item 3a: CLASS 2 and CLASS 3 (73 findings)

CLASS 2: the declaration is on a descendant of the element a control paints, so the control can never reach it. CLASS 3: a wrapper class declares a value that leaks into text children. Reach is the ranking key, so a rule nothing renders sits at the bottom whatever its class.

### 3.1 Ranking of the findings by reach

Reach is the number of live elements one block instance affects, read from the block's own markup. Where a count depends on a loop, the figure assumes 4 loop items (4 rows, 4 steps, 4 options, 4 reviews) or 6 form fields, and says so. Instances per page and pages per site are content, not code: CANNOT-TELL from source, so the ranking is per instance.

Verdict key: **FIX** a control cannot reach a live element. **DEFENSIBLE** documented intent, or UI chrome read as intended (marked "documented" only where the source says so). **EDITOR** only the editor renders it. **DEAD** no markup emits the class.

| Rank | Block | Element (declaring class) | Decls | Class | Verdict | Elements per instance | Leak |
|---|---|---|---|---|---|---|---|
| 1 | `sgs/buybox` | `.buybox__value-ladder` | 1 | CLASS-3 | FIX | 12 | permanent (no ladder font-size control) |
| 2 | `sgs/process-steps` | `.sgs-process-steps__step` | 1 | CLASS-3 | FIX | 12 | icon, number and description: permanent (no `text-align` control). Title: default-state only (`titleTextAlign`) |
| 3 | `sgs/product-card` | `.product-card__value-ladder` | 1 | CLASS-3 | FIX | 12 | permanent (no ladder font-size control) |
| 4 | `sgs/form` | `.sgs-form-field__label` | 1 | CLASS-2 | FIX | 6 | permanent (no label typography control) |
| 5 | `sgs/form` | `.sgs-form-field__input` | 1 | CLASS-2 | FIX | 5 | permanent (`fieldFontSize` exists, no field line-height control) |
| 6 | `sgs/product-faq` | `.sgs-product-faq-item__question` | 3 | CLASS-2 | FIX | 4 | permanent (no question typography control anywhere) |
| 7 | `sgs/countdown-timer` | `.sgs-countdown__number` | 2 | CLASS-2 | FIX | 4 | permanent (the block has root controls only; none per element) |
| 8 | `sgs/countdown-timer` | `.sgs-countdown__label` | 2 | CLASS-2 | FIX | 4 | permanent |
| 9 | `sgs/form` | `.sgs-form-tile__icon` | 2 | CLASS-2 | FIX | 4 | permanent |
| 10 | `sgs/form` | `.sgs-form-tile__label` | 1 | CLASS-2 | FIX | 4 | permanent |
| 11 | `sgs/form` | `.sgs-form-review__term` | 1 | CLASS-2 | FIX | 4 | permanent |
| 12 | `sgs/option-picker` | `.sgs-option-picker__pill-text` | 1 | CLASS-3 | FIX | 4 | permanent for icon-less labels: `pillLineHeight` and `labelLineHeight` never reach the pill text |
| 13 | `sgs/form` | `.sgs-form__button` | 2 | CLASS-2 | FIX | 3 | weight: default-state only (`submitFontWeight` overrides it); line-height: permanent (no submit line-height control) |
| 14 | `sgs/cta-section` | `.sgs-cta-section__headline` | 2 | CLASS-2 | FIX | 1 | default-state only for the child block's own controls; permanent for the cta-section root controls |
| 15 | `sgs/countdown-timer` | `.sgs-countdown__expired` | 1 | CLASS-2 | FIX | 1 | permanent |
| 16 | `sgs/cta-section` | `.sgs-cta-section__body` | 1 | CLASS-2 | FIX | 1 | as the headline |
| 17 | `sgs/form` | `.sgs-form-field__consent-text` | 1 | CLASS-2 | FIX | 1 | permanent |
| 18 | `sgs/product-card` | `.price-from-label` | 1 | CLASS-2 | FIX | 1 | permanent (`priceFromLabelFontSize` exists; no font-family control for the label) |
| 19 | `sgs/table-of-contents` | `.sgs-toc__title` | 1 | CLASS-2 | FIX | 1 | permanent |
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
| 40 | `sgs/business-info` | `.sgs-business-info__placeholder` | 2 | CLASS-2 | EDITOR | 0 | n/a |
| 41 | `sgs/table-of-contents` | `.sgs-toc__empty` | 1 | CLASS-2 | EDITOR | 0 | n/a |
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
| `buybox/style.css::.sgs-buybox .buybox__value-ladder` | `font-size: 0.92em` | CLASS-3 | none on the leak targets named in the note; other controls for this property in the block: `.{uid}.wp-block-sgs-buybox .buybox__price--current` (0,3,0); `.{uid}.wp-block-sgs-buybox .buybox__add-to-cart` (0,3,0); +2 more | (0,2,0) | FIX |

- `.buybox__value-ladder` (FIX). **Reach:** `buybox/render.php`: `<ul class="buybox__value-ladder">` once, then per pack-size row `<li class="value-ladder__row">` holding `value-ladder__pack`, `value-ladder__per-unit`, optionally `value-ladder__saving` and a badge: about 3 to 4 text spans x rows (12 at 4 rows). Shown when `showLadder` is on and the ladder is not hidden. **Leak:** permanent (no ladder font-size control). **CLASS 4 element:** element-level: the block calls `sgs_typography_css_rule` 6 times, none for the ladder. **Evidence:** Same literal, byte for byte, as `product-card/style.css::.product-card__value-ladder` (the file says the two are intentionally identical). One fix serves both blocks.

#### sgs/countdown-timer

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `countdown-timer/style.css::.sgs-countdown__number` | `font-weight: 700` | CLASS-2 | `.{uid}.wp-block-sgs-countdown-timer` (0,2,0) | (0,1,0) | FIX |
| `countdown-timer/style.css::.sgs-countdown__number` | `line-height: 1.1` | CLASS-2 | `.{uid}.wp-block-sgs-countdown-timer` (0,2,0) | (0,1,0) | FIX |
| `countdown-timer/style.css::.sgs-countdown__label` | `text-transform: uppercase` | CLASS-2 | `.{uid}.wp-block-sgs-countdown-timer` (0,2,0) | (0,1,0) | FIX |
| `countdown-timer/style.css::.sgs-countdown__label` | `letter-spacing: 0.05em` | CLASS-2 | `.{uid}.wp-block-sgs-countdown-timer` (0,2,0) | (0,1,0) | FIX |
| `countdown-timer/style.css::.sgs-countdown__expired` | `font-weight: 600` | CLASS-2 | `.{uid}.wp-block-sgs-countdown-timer` (0,2,0) | (0,1,0) | FIX |

- `.sgs-countdown__number` (FIX). **Reach:** `countdown-timer/render.php`: `<span class="sgs-countdown__number ...">` once per unit in `$units` (days, hours, minutes, seconds, each optional): up to 4. **Leak:** permanent (the block has root controls only; none per element). **CLASS 4 element:** element-level: one helper call, root prefix only. **Evidence:** `block.json` says root typography is "an inherited default on the wrapper rather than a per-digit or per-label control". The number declares its own weight and line-height, so root `fontWeight` and `lineHeight` change nothing on the numbers. The same rule also declares `font-size: var(--wp--preset--font-size--xx-large, 3rem)`, a `var()` value this gate does not examine, so root `fontSize` is blocked the same way.
- `.sgs-countdown__label` (FIX). **Reach:** `<span class="sgs-countdown__label">` once per unit: up to 4. Root `textTransform` and `letterSpacing` cannot reach it (it declares `uppercase` and `0.05em`). **Leak:** permanent. **CLASS 4 element:** element-level (as above). **Evidence:** As the number rule. `font-size: var(--wp--preset--font-size--small, 0.875rem)` also blocks root `fontSize` (not examined by the gate).
- `.sgs-countdown__expired` (FIX). **Reach:** `<div class="sgs-countdown__expired">` once per timer, hidden until the timer ends (`$expired_hidden`). **Leak:** permanent. **CLASS 4 element:** element-level (as above). **Evidence:** Root `fontWeight` cannot reach the expired message.

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
| `form/style.css::.sgs-form-field__input` | `line-height: 1.5` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | FIX |
| `form/style.css::.sgs-form-field__label` | `font-weight: 600` | CLASS-2 | `.{uid}.sgs-form` (0,2,0) | (0,1,0) | FIX |
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
- `.sgs-form-field__input` (FIX). **Reach:** Every text-entry control: `class="sgs-form-field__input"` in `form-field-address/render.php` and the other `form-field-*` blocks (text, email, phone, number, date, select, textarea). 1 per input, select and textarea. **Leak:** permanent (`fieldFontSize` exists, no field line-height control). **CLASS 4 element:** element-level: no field line-height control. **Evidence:** Root `lineHeight` cannot reach the inputs (`.sgs-form-field__input { line-height: 1.5 }`).
- `.sgs-form-field__label` (FIX). **Reach:** `includes/forms/field-render-helpers.php::field_label`: `'<label for="%s" class="sgs-form-field__label%s">'`, called from 9 field blocks, plus `<legend class="sgs-form-field__label">` in `form-field-checkbox`, `form-field-radio` and `form-field-tiles`. 1 per labelled field. **Leak:** permanent (no label typography control). **CLASS 4 element:** element-level: no label typography control at all. **Evidence:** Root `fontWeight` cannot reach field labels (`font-weight: 600`); the same rule also hardcodes `font-size: var(--wp--preset--font-size--small, 0.9375rem)`, which this gate does not examine.
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
| `process-steps/style.css::.sgs-process-steps__step` | `text-align: center` | CLASS-3 | none on the leak targets named in the note; other controls for this property in the block: `.{uid}.sgs-process-steps .sgs-process-steps__title` (0,3,0) | (0,1,0) | FIX |

- `.sgs-process-steps__step` (FIX). **Reach:** `process-steps/render.php`: each step holds `__icon` (optional), `__number`, `<hN class="sgs-process-steps__title">` and `__description` (optional). 3 permanent leak targets per step: 12 at 4 steps. The `--layout-list` variant resets the step to `text-align: left`; every other layout is centred. **Leak:** icon, number and description: permanent (no `text-align` control). Title: default-state only (`titleTextAlign`). **CLASS 4 element:** icon, number, description have no text-align control. **Evidence:** The block exposes `align` and `titleTextAlign` only, so a client cannot left-align a step's description or number. Confirmed real in the brief.

#### sgs/product-card

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `product-card/style.css::.product-card .price-from-label` | `font-family: 'Inter', sans-serif` | CLASS-2 | `.{uid} .sgs-product-card__price, .{uid} .price, .{uid} .price-from-amount` (0,2,0) | (0,2,0) | FIX |
| `product-card/style.css::.product-card__value-ladder` | `font-size: 0.92em` | CLASS-3 | none on the leak targets named in the note; other controls for this property in the block: `.{uid} .sgs-product-card__title, .{uid} h3` (0,2,0); `.{uid} .sgs-product-card__price, .{uid} .price, .{uid} .price-from-amount` (0,2,0); +10 more | (0,1,0) | FIX |

- `.price-from-label` (FIX). **Reach:** `product-card/render.php`: `<span class="price-from-label">` at two template sites, once per card that shows a "From" price. **Leak:** permanent (`priceFromLabelFontSize` exists; no font-family control for the label). **CLASS 4 element:** element-level: no `priceFromLabelFontFamily`. **Evidence:** `font-family: 'Inter', sans-serif` is a literal font name in plugin CSS, which also conflicts with the project rule that client typography lives in `sites/<client>/`. `priceFontFamily` paints `.price` and `.price-from-amount`, so setting a price font leaves "From" in Inter.
- `.product-card__value-ladder` (FIX). **Reach:** `product-card/render.php`: `class="product-card__value-ladder"` once per card that shows a ladder, then `value-ladder__row` x rows holding 3 to 4 spans: 12 text spans at 4 rows, on every such card of a shop grid. **Leak:** permanent (no ladder font-size control). **CLASS 4 element:** element-level: product-card calls the helper 12 times, none for the ladder. **Evidence:** Identical declaration to `buybox/style.css::.sgs-buybox .buybox__value-ladder`; named in the brief as a known real finding.

#### sgs/product-faq

| Finding (`file::selector`) | Declaration | Class | Competing control, as emitted (specificity) | Declaration specificity | Verdict |
|---|---|---|---|---|---|
| `product-faq/style.css::.sgs-product-faq-item__question` | `font-weight: 600` | CLASS-2 | `.{uid}.wp-block-sgs-product-faq` (0,2,0) | (0,1,0) | FIX |
| `product-faq/style.css::.sgs-product-faq-item__question` | `font-size: 1rem` | CLASS-2 | `.{uid}.wp-block-sgs-product-faq` (0,2,0) | (0,1,0) | FIX |
| `product-faq/style.css::.sgs-product-faq-item__question` | `line-height: 1.4` | CLASS-2 | `.{uid}.wp-block-sgs-product-faq` (0,2,0) | (0,1,0) | FIX |

- `.sgs-product-faq-item__question` (FIX). **Reach:** `product-faq-item/render.php`: `<summary class="sgs-product-faq-item__question" ...>` once per FAQ item. 3 declarations: weight, size, line-height. **Leak:** permanent (no question typography control anywhere). **CLASS 4 element:** element-level: neither product-faq nor product-faq-item exposes question typography. **Evidence:** The three product-faq root controls (`fontWeight`, `fontSize`, `lineHeight`) cannot change a single question, which is the main text of the block. `product-faq-item/block.json` has `question` (the string) but no typography attribute.

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


## 4. Item 3b: CANNOT-RESOLVE (64 findings)

The gate reports CANNOT-RESOLVE when it could not tell which element a control paints, or how the declaring element relates to it, and it will not guess. Section 4.1 groups the 64 by why. Section 4.2 says what they are once the cause is removed.

### 4.1 Causes, with counts

| Cause | Findings | Why the control or markup could not be resolved | What the gate would need |
|---|---|---|---|
| **A. Editor-only markup** | 5 | The declaring class exists only in `edit.js` (the editor canvas). Nothing renders on the front end, so there is nothing to resolve. | Nothing: these should be dropped from the count as unreachable. The gate would need to know which classes the front end emits (any `.php` emitter), which it can already read. |
| **B. Markup built outside the block directory** | 31 | The class is emitted by a shared PHP builder in `includes/` (`class-post-grid-rest.php`, `class-grid-pagination.php`, `buybox-guided.php`, `product-card-*.php`), or built at run time from a prefix argument (`$base_class . '__page-btn'`). `readBlockPhpFiles` reads only the block directory. | Read the PHP files a block `require`s from `includes/`, and resolve a class built as `$prefix . '__x'` from the call site's prefix argument. |
| **C. JavaScript-built markup** | 4 | The element is created in `view.js` / `guided.js` (`el.className = '...'`), so no PHP tag carries it. | Parse `className = '...'` assignments and `createElement` chains in the block's front-end scripts into the markup tree. |
| **D. A control's target element is not a parseable literal tag** | 20 | The declaring element IS found, but at least one control for the same property targets an element whose class is assembled in a PHP variable (`buybox/render.php`: `$add_to_cart_button_classes = 'wp-element-button buybox__add-to-cart'`) or inside a sprintf template (`cart/render.php`: `'<span class="sgs-cart__badge%2$s" ...'`). One unplaceable control makes every declaration of that property in the block unresolvable, even when that control is on an unrelated element (a notify-form label against an add-to-cart button). | Resolve a class held in a `$classes` variable and a class glued to a sprintf placeholder. Separately, decide a declaration against only the controls that could plausibly be its ancestors, so an unplaceable control on a sibling leaf does not poison it. |
| **E. A bare-tag declaring selector** | 2 | The declaring selector ends in a tag (`.product-card h3`, `.sgs-theme-toggle__icon svg`), which has no class for `matchInstances` to match. | Match a tag compound through its nearest classed ancestor and the tags present in that subtree. |
| **F. A printf placeholder as the tag name** | 1 | `media/render.php`: `'<%1$s class="sgs-media__caption">%2$s</%1$s>'`. The tag scanner requires a letter after `<`, so the element is never added to the markup tree. The control selector also starts with an unresolved `$id_wrap`. | Treat `<%N$s` as an element of unknown tag and keep its class list; evaluate `$id_wrap = '.' . $scope_esc`. |
| **G. A printf placeholder glued to a class token** | 1 | `option-picker/render.php`: `'<span class="sgs-option-picker__pill%s">%s</span>'`. The class token `sgs-option-picker__pill%s` fails the class-name test and the whole class is dropped, so the pill (the control's element) is missing from the model. This also turns the neighbouring CLASS 3 finding into a mislabelled one. | Strip a trailing `%s` / `%N$s` from a class token and keep the stem. |
| Total | 64 | | |

### 4.2 What the 64 are really, one level down

- **CLASS 4 shaped: 52 of 64.** For these the block has controls for the property but none on, or above, the declaring element (the only controls are on sibling leaf elements such as a title, a price or a label), so the real question is "this element has no control", not "the gate could not place it". This is a reading of the controls list and the markup, not gate output; the gate cannot prove it.
- **Own control already exists: 2** (`option-picker` pill line-height, `media` figcaption font-size). The gate reports CANNOT-RESOLVE because `classifyInheritedHardcode` returns as soon as any control for the property is unresolved, before it looks at the `same` verdicts. These are CLASS 1 in effect.
- **CANNOT-TELL from source: 5** (`product-card` `h3` specificity tie; `cart` badge x2; `buybox` cart-price; `theme-toggle` icon glyph, which is not text).
- **Editor-only: 5** (cause A).

### 4.3 Every finding

| Block | Finding (`file::selector`) | Declaration | Cause | CLASS 4 shaped | Note |
|---|---|---|---|---|---|
| `sgs/brand-strip` | `brand-strip/style.css::.sgs-brand-strip__empty` | `text-align: center` | A | editor-only |  |
| `sgs/brand-strip` | `brand-strip/style.css::.sgs-brand-strip__empty` | `font-style: italic` | A | editor-only |  |
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
| `sgs/option-picker` | `option-picker/style.css::.sgs-option-picker__pill` | `line-height: 1` | G | see note | own control exists: `pillLineHeight` at `.{uid}.wp-block-sgs-option-picker .sgs-option-picker__pill` (0,3,0) beats this (0,1,0): effectively CLASS 1, hidden by the gate's resolution order |
| `sgs/option-picker` | `option-picker/style.css::.sgs-option-picker__empty-notice` | `font-style: italic` | A | editor-only |  |
| `sgs/post-grid` | `post-grid/style.css::.sgs-post-grid__meta` | `font-size: 0.8125rem` | B | yes |  |
| `sgs/post-grid` | `post-grid/style.css::.sgs-post-grid__badge` | `font-size: 0.75rem` | B | yes |  |
| `sgs/post-grid` | `post-grid/style.css::.sgs-post-grid__badge` | `font-weight: 600` | B | yes |  |
| `sgs/post-grid` | `post-grid/style.css::.sgs-post-grid__badge` | `line-height: 1.4` | B | yes |  |
| `sgs/post-grid` | `post-grid/style.css::.sgs-post-grid__category` | `font-size: 0.75rem` | B | yes |  |
| `sgs/post-grid` | `post-grid/style.css::.sgs-post-grid__category` | `font-weight: 700` | B | yes |  |
| `sgs/post-grid` | `post-grid/style.css::.sgs-post-grid__category` | `text-transform: uppercase` | B | yes |  |
| `sgs/post-grid` | `post-grid/style.css::.sgs-post-grid__category` | `letter-spacing: 0.06em` | B | yes |  |
| `sgs/post-grid` | `post-grid/style.css::.sgs-post-grid__excerpt` | `font-size: 0.9375rem` | B | yes |  |
| `sgs/post-grid` | `post-grid/style.css::.sgs-post-grid__excerpt` | `line-height: 1.6` | B | yes |  |
| `sgs/post-grid` | `post-grid/style.css::.sgs-post-grid__readmore` | `font-size: 0.875rem` | B | yes |  |
| `sgs/post-grid` | `post-grid/style.css::.sgs-post-grid__readmore` | `font-weight: 600` | B | yes |  |
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
| `sgs/theme-toggle` | `theme-toggle/style.css::.sgs-theme-toggle-notice` | `font-style: italic` | A | editor-only |  |
| `sgs/whatsapp-cta` | `whatsapp-cta/style.css::.sgs-whatsapp-cta__warning` | `font-size: 12px` | A | editor-only |  |

## 5. CLASS 4 flags (an element, or a whole block, with no typography control at all)

Two scales, kept apart.

**Whole blocks (E14 is blind to them).** E14 builds a model only for blocks whose PHP calls `sgs_typography_css_rule` or `sgs_button_element_style_css` with a prefix that matches a declared attribute. 47 of 95 blocks have no model, so none of the 137 findings can come from them (`--survey`: "Blocks with a resolvable control: 48"). The brief's measured context (46 never call the helper; `choice-flow` and `choice-flow-question` 0 calls, `cart` 1, `product-card` 12) is consistent with that; I did not recount helper calls. As a rough size of the unmeasured pool, a throwaway regex walker (not gate output, nested at-rules approximated) found 86 literal declarations of inherited typography properties outside hover, media and modifier selectors in those 47 blocks' `style.css`: `trustpilot-reviews` 19, `choice-flow-question` 11, `gallery` 9, `hero` 8, `account` 6, `audio` 6, `wishlist-panel` 6, `choice-flow-result` 5, the rest 1 to 4 each. Treat 86 as an indicator, not a finding count.

**Elements inside blocks that do call the helper.** These are CLASS 4 shaped: the block has controls for the property, none on the leaked-into or declaring element.

| Block | Elements with no control | Source of the flag |
|---|---|---|
| `sgs/post-grid` | meta, badge, category, excerpt, readmore, page buttons, load-more (16 CANNOT-RESOLVE findings): the only typography attributes are `title*` | `block.json` attribute list |
| `sgs/buybox` | notify form (9), saving badge (4), stock line (1), guided steps (6), value ladder (1, CLASS 3): the only controls are `price*`, `pickerLabel*`, `pickerValue*`, `addToCart*` | `block.json` attribute list |
| `sgs/product-card` | attribute-tag text-transform, brand text-transform, rating, rating stars, saving badge (4), swatch-more, RRP, CTA text-align, value ladder, "From" label font-family | `block.json` attribute list |
| `sgs/card-grid` | pagination buttons (2): controls cover `title`, `subtitle`, `noImageLabel` only | `block.json` attribute list |
| `sgs/form` | label, input line-height, tile icon and label, consent text, review term, column and row headings | `block.json` of `form` and the `form-field-*` blocks has no label or heading typography attribute |
| `sgs/countdown-timer` | number, label, expired message (root controls only; one helper call) | `block.json` `_note` and `render.php` |
| `sgs/product-faq` | the question (neither `product-faq` nor `product-faq-item` has it) | `block.json` of both |
| `sgs/process-steps` | icon, number, description text-align | `block.json` |
| `sgs/option-picker` | sub-label, term badge, term description | `block.json` |
| `sgs/google-reviews` | maps link, breakdown row, badge text (12 element controls exist, none for these) | `block.json` |
| `sgs/media` | video bar and time (2 CANNOT-RESOLVE findings) | `block.json` |

`sgs/cart` (1 helper call, `pill` prefix) has the badge as a CANNOT-TELL (section 4).

## 6. What this lets a later task lower, and what it cannot

`E14_OPEN_BACKLOG` is `CLASS-2: 68`, `CLASS-3: 5`, `CANNOT-RESOLVE: 64`. The ceilings follow the gate's own output, so a ceiling moves only when findings disappear, and only in the commit that removes them. Never raise them.

**Shipped 2026-10-06 (`6f1963c28`): the ceilings now stand at CLASS-2 56, CLASS-3 3,
CANNOT-RESOLVE 64**, measured by `--check` and lowered in the commit that earned them. What landed:
the 10 DEAD declarations deleted with their whole rules; `sgs/form` given `label` and `field`
typography surfaces; both value ladders given `valueLadder` and `valueLadderSaving` surfaces, with
their duplicated markup unified into `includes/helpers-value-ladder.php::sgs_value_ladder_markup`.
Every literal on an element that now owns a control sits inside `:where()` (Fix option 3), which
also repaired two real defects: the floated-label state's (0,4,0) size and weight, which no control
could beat, and the ladder row weights, which blocked the ladder's own font-weight control.

CANNOT-RESOLVE did not fall, and the composition changed: unifying the ladder markup put it outside
`readBlockPhpFiles`'s block-directory walk (cause B below), which cost 4 rows, and buybox's first
`line-height` control made one pre-existing literal visible. Both were absorbed by de-specifying
those literals, so the number held at 64 rather than being raised.

| Step | Where | CLASS-2 | CLASS-3 | CANNOT-RESOLVE |
|---|---|---|---|---|
| Before this work | | 68 | 5 | 64 |
| **Now (shipped)** | | **56** | **3** | **64** |
| Move the 3 EDITOR-only declarations (`business-info` `__placeholder` x2, `table-of-contents` `__empty`) into each block's `editor.css`, which the gate excludes by design. | 3.2 | 55 | 5 | 64 |
| Fix the 26 FIX declarations (22 CLASS-2, 4 CLASS-3) | 3.1 | 33 | 1 | 64 |
| Gate: drop editor-only classes (cause A, 5) and let an own control win (2) | 4.1 | 33 | 1 | 57 |
| Remaining floor | | 33 | 1 | the CLASS 4 shaped 52 plus the 5 CANNOT-TELL, until the gate gains a CLASS 4 category and the five causes of section 4 are modelled | 

The 34 DEFENSIBLE findings (33 CLASS-2, 1 CLASS-3) are the floor of the CLASS-2 and CLASS-3 ceilings: they stay in the count unless a mechanism removes them. Three options, none implemented: (i) leave them counted (the ceiling stays 33 and 1; no new mechanism); (ii) add a per-declaration marker comment the gate honours (new gate capability, needs a decision on what the marker must say); (iii) record them as `by-design` baseline entries, which conflicts with the standing rule against baselining a finding to silence it, so it needs Bean's explicit decision. I recommend (i) now.

## 7. Capability gaps in the gate that this triage exposed

Each is evidence for a later gate task; none was changed here.

1. **`var()`-valued declarations are invisible to E14.** `isLiteralConstant` rejects them, but a `var(--wp--preset--font-size--x-large)` on a descendant blocks an ancestor control exactly as a literal does. Measured with a scratch copy of the gate that admits `var(` values for inherited properties: +48 findings (27 CLASS-2, 21 CANNOT-RESOLVE) in 11 blocks (`form` 15, `choice-flow` 12, `cta-section` 5, `product-card` 4, `countdown-timer` 3, `option-picker` 3, `google-reviews` 2, and one each in `notice-banner`, `process-steps`, `table-of-contents`, `team-member`). Example: `countdown-timer/style.css::.sgs-countdown__number { font-size: var(--wp--preset--font-size--xx-large, 3rem) }` makes the root `fontSize` control do nothing on the numbers, and the gate says nothing.
2. **Own-control verdicts are overridden by resolution order.** `classifyInheritedHardcode` returns CLASS-2 as soon as any control is above, and CANNOT-RESOLVE as soon as any is unresolved, before it considers a `same` control. Two CANNOT-RESOLVE rows are CLASS 1 in effect (`option-picker` pill `line-height`, `media` caption `font-size`).
3. **One unplaceable control poisons the whole property.** Cause D: 20 findings are CANNOT-RESOLVE because one control for the property targets an element built from a variable or sprintf template, even where that control is on an unrelated element.
4. **sprintf placeholders drop elements.** `'<span class="sgs-option-picker__pill%s">'` loses the class token and `'<%1$s class="sgs-media__caption">'` is not parsed as a tag. The former also mislabels the `option-picker` pill-text finding as CLASS 3; it is a CLASS 2 for `pillLineHeight`. Dynamic tags (`<<?php echo esc_attr( $heading_level ); ?> class="sgs-process-steps__title">`) are not parsed either, which is why the process-steps note lists three leak targets and not the title.
5. **Class maps are not followed.** `includes/forms/field-render-helpers.php::field_headings` builds two live classes from a PHP array; a literal search finds only the map.
6. **State selectors are not exempt.** `[aria-current="true"]` (`store-selector`) is a state, like the `:hover` and `:focus` that E3 already exempts.
7. **No CLASS 4 category.** 52 of the 64 CANNOT-RESOLVE findings, and the largest real gaps (post-grid card parts, buybox notify form), are "this element has no control". The gate has no way to say so.
8. **47 blocks have no E14 model**, so the gate reports nothing for them (section 5).

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
- **Scratch tooling.** The survey detail (control selectors, matched-instance counts) and the `var()` experiment (+48) came from scratch copies of the gate in the session scratchpad; the repo gate is unchanged and its output is the same as before.
- **The crude 86 (section 5) is an indicator only.**
- **Not checked:** `editor.css` and the editor canvas, `theme/` stylesheets, `includes/` helpers that hardcode typography, and `scripts/computed-route/` and `scripts/parity/` (out of scope by instruction).
