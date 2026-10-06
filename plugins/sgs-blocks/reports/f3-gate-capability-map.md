# F3 gate capability map

Subject: `plugins/sgs-blocks/scripts/check-hardcoded-render-defaults.js` ("Gate B"), baseline `plugins/sgs-blocks/scripts/hardcoded-render-defaults-baseline.json`.
Status of this document: read-only analysis. No source file was changed. Date of analysis: 2026-10-06.

## 0. Method and evidence base

- Read the gate end to end (`checkBlock`, `scanCssDeclarations`, E1, E6, E8, E9, E10, E11, E13, F3b).
- Reproduced "the gate ran green" mechanically. I extracted three historical trees with `git archive` into the session scratchpad (the parent of `776a93639` for accordion, of `12c0a0bb6` for whatsapp-cta, of `7689ebb70` for business-info), copied the CURRENT gate and baseline over each, and ran `node scripts/check-hardcoded-render-defaults.js --json`. All three returned `netNew: 0`, and none of the three target declarations appeared in `accepted`.
- Turned each exemption off one at a time in scratch copies of the gate (a `sed` that replaces one `if (...) {` with `if ( false ) {`) and re-ran `checkBlock()` on each block. The results are the "counterfactual" lines in section 2. Nothing in the repo was touched; scratch files live only in the session scratchpad.
- Ran the current gate on HEAD: `netNew 0`, 17 accepted findings against 18 baseline entries (see the mega-menu row in section 3).

## 1. How the gate matches today

### 1.1 Attribute to property: names only

`check-hardcoded-render-defaults.js::attrToCssProps` maps an attribute name to CSS properties by lower-cased suffix:

```js
const lower = attrName.toLowerCase();
for ( const entry of SUFFIX_MAP ) {
	if ( lower.endsWith( entry.suffix ) ) {
		return new Set( entry.props );
```

`checkBlock` builds `cssToAttrs` (property to attribute set) from every block.json attribute, then `targetProps = new Set( cssToAttrs.keys() )`. So the first pairing is attribute-name suffix to property. No element is involved at this stage.

`SUFFIX_MAP` has no entry for `font-family`, `font-style`, `text-indent`, `text-decoration`, `word-spacing`, `white-space` or `writing-mode`. A control whose only property is one of those can never be paired.

### 1.2 Property to hardcode: `scanCssDeclarations`

`check-hardcoded-render-defaults.js::scanCssDeclarations` walks `style.css` line by line, keeps a `selectorStack`, and for each `prop: literal;` whose property is in `targetProps` and whose value passes `isLiteralConstant`, decides whether some owning attribute is "not exempt" for the current selector:

```js
const bemElements = extractBemElements( currentSelector );
for ( const attrName of owningAttrs ) {
	if ( helperGov && helperGov.has( attrName ) ) {            // E11
		if ( selectorReferencesGovernedToken( currentSelector, helperGov.get( attrName ) ) ) {
			nonExemptAttrs.push( attrName );
		}
		continue;
	}
	if ( isWrapperRootAttrMismatch( ... ) ) { continue; }       // E13 (gap / gridTemplateColumns only)
	if ( isBemSubElementMismatch( attrName, bemElements ) ) { continue; } // E1
	...                                                         // E6 (size suffix)
	nonExemptAttrs.push( attrName );
}
```

### 1.3 Does it compare elements? Only by two lexical proxies, never by DOM ancestry

There are two element-resolution mechanisms, both string heuristics:

1. **E1, `isBemSubElementMismatch` / `extractBemElements`.** The "element" of a declaring selector is the set of `__token` fragments in it (`selector.match( /__([a-zA-Z0-9-]+)/g )`, plus each dash part). The attribute "owns" that element only if its lower-cased NAME contains one of those tokens:

   ```js
   for ( const token of bemElements ) {
   	if ( lowerAttr.includes( token ) ) { return false; }   // attr maps to this element
   }
   return true;                                              // otherwise exempt
   ```

   A selector with no `__` (the root, or a hyphenated descendant such as `.sgs-form-tile`, `.sgs-mega-group`) returns `null` and is treated as the root.

2. **E11, `collectHelperGovernance` / `selectorReferencesGovernedToken`.** For a call to `sgs_typography_css_rule` or `sgs_button_element_style_css` in `render.php` only, it takes the FIRST string literal in the call arguments as the prefix and every LATER string literal as selector text, extracts `.class` tokens, and maps `prefix + suffix` to that token set. A hardcode is then flagged only if the declaring selector contains one of those class tokens. The whole test is "does this class name appear in both selectors"; there is no descendant, ancestor or specificity reasoning.

   ```js
   const prefix = lits[ 0 ];
   const selectorText = lits.slice( 1 ).join( ' ' );
   ```

   Consequences that matter:
   - A selector passed as a PHP variable contributes no literal. `if ( lits.length < 2 ) { continue; }` skips a call such as `sgs_typography_css_rule( $attributes, 'label', $label_selector )`.
   - Only `render.php` is read (`readIfExists( renderPhpPath )`). Calls in sibling files are invisible, for example `whatsapp-cta/variant-render.php::sgs_whatsapp_cta_card_css`, which holds the `cardTitle` and `cardSubline` calls.
   - `HELPER_SELECTOR_SUFFIXES.sgs_typography_css_rule.suffixes` omits `FontFamily`, `TextAlign`, `TextWrap`, `TextIndent`, `TextColumns` and `WritingMode`, all of which `includes/helpers-typography.php::sgs_typography_css_rule` really emits (`$k_family`, `$k_align`, `$k_wrap`, `$k_indent`, `$k_columns`, `$k_writing`). Those prefixed attributes therefore fall back to the E1 name heuristic.
   - Prefix resolution itself is correct where it runs: `'' !== prefix ? prefix + suffix : lcfirst(suffix)` mirrors `sgs_typography_attr`.

So: the gate answers "does the declaring selector share a class name, or an attribute-name substring, with where the control is believed to land". It never asks "is the declaring element an ancestor of, a descendant of, or identical to the control's element".

### 1.4 Other pre-filters that remove whole properties before any selector is examined

- **E8, `getScopedStyleProps`.** If `render.php` mentions `#$x` or `.$x` and a `word:` within 500 characters, that property name is added to a set and `checkBlock` drops it from `effectiveTargetProps` for the whole block (`if ( scopedStyleProps.has( prop ) ) { continue; }`). It is block-wide and property-wide, not selector-wide. It is not the reason for any of the four controls: the probe returned `E8 scoped has line-height false font-weight false` for all three blocks.
- **E9, `checkBlock`.** `hasSelectorsTypography` removes `font-size`, `line-height`, `letter-spacing`, `font-weight`, `text-transform` from `targetProps` for the whole block. Ten blocks declare `selectors.typography`: counter, info-box, label, notice-banner, option-picker, testimonial-slider, theme-toggle, timeline, trust-bar, whatsapp-cta (measured with a read-only scan of every `block.json`).
- **E3/E4/E2.** Anything inside `:hover`/`:focus`, `@media`/`@container`, or a selector containing `--modifier` or `.is-style-` is skipped.
- **`scanPhpInlineStyles`.** Only matches `style="..."` literals on a line with no `$`. CSS emitted from `render.php` as scoped rule strings is never scanned. Example: `mega-panel/render.php` emits `{padding:17px;border-radius:15px;...}` on a line that also carries `$style_crd`, so it is invisible.

## 2. The blind spot, stated mechanically

Common root: CLASS 2 and 3 are, by definition, a declaration on a DIFFERENT element from the control's. Both E1 and E11 are built to EXEMPT any declaration on a selector that does not lexically match the control's element, which is precisely the CLASS 2/3 shape. The gate is therefore structurally unable to report them; its exemptions encode the opposite assumption (a different selector means an unrelated element).

Each control below is stopped by one or two independent exemptions. I proved independence by switching them off one at a time.

### 2.1 accordion `.sgs-accordion-item__header { line-height: 1.4 }` (CLASS 2)

State examined: parent of `776a93639`. Gate result: green, nothing reported for this block.

Mechanism, in order of execution for the `line-height` rule:

1. `attrToCssProps( 'lineHeight' )` gives `line-height`, so `cssToAttrs.get('line-height')` is `{lineHeight}`.
2. `collectHelperGovernance` reads `accordion/render.php`: `sgs_typography_css_rule( $attributes, '', $root_sel, $root_sel . ' :is(p, .wp-block-sgs-text) + :is(p, .wp-block-sgs-text)' )`. The root selector is the variable `$root_sel` (`$root_sel = '.' . $uid . '.wp-block-sgs-accordion';`), so the only selector literal the gate sees is the fourth argument. Probe output: `E11 lineHeight wp-block-sgs-text`. The governed token set for `lineHeight` is `{wp-block-sgs-text}`, which is not the element the control paints.
3. `scanCssDeclarations`: `helperGov.has('lineHeight')` is true, so the E11 branch runs, `selectorReferencesGovernedToken( '.sgs-accordion-item__header', {wp-block-sgs-text} )` is false, and `continue` skips the declaration. E1 is never reached.

Independence (current gate against the old tree, `checkBlock` on `accordion`):

| E1 | E11 | result |
|---|---|---|
| on | on | no finding (shipped state) |
| off | on | no finding (E11 exempts) |
| on | off | no finding (E1 exempts: selector tokens `{header}`, and `lineheight` does not contain `header`) |
| off | off | finding: `style.css` `line-height: 1.4`, attr `lineHeight` |

Even if the call-site selector had been resolved correctly (`.{uid}.wp-block-sgs-accordion`), `.sgs-accordion-item__header` does not contain `wp-block-sgs-accordion`, so E11 would still exempt it.

### 2.2 whatsapp-cta `.sgs-whatsapp-cta__btn { font-weight: 600 }` (CLASS 3) and 2.3 `line-height: 1` (CLASS 3)

State examined: parent of `12c0a0bb6`, where both declarations sit in the `__btn` rule (the current file no longer has them there). Gate result: green.

Both properties are in `WP_NATIVE_TYPOGRAPHY_PROPS` and the block's `block.json` carries `"selectors": {"root": ".sgs-whatsapp-cta", "typography": ".sgs-whatsapp-cta__label"}`. In `checkBlock`:

```js
if ( hasSelectorsTypography ) {
	for ( const prop of WP_NATIVE_TYPOGRAPHY_PROPS ) { targetProps.delete( prop ); }
}
```

so `font-weight` and `line-height` are removed from the block before any selector is read. E9's premise (WP's selectors API applies the user value on the declared child) is true for `__label`, but the exemption is block-wide, so it also silences the `__btn` declaration that leaks into `__card-title` and `__card-subline`.

Second independent stop, E1: `.sgs-whatsapp-cta__btn` gives tokens `{btn}`; `labelFontWeight`, `cardTitleFontWeight`, `cardSublineFontWeight` and the line-height trio contain no `btn`, so `isBemSubElementMismatch` returns true.

E11 plays no part here: `render.php` calls `sgs_typography_css_rule( $attributes, 'label', $label_selector )` with a variable selector (one literal, so skipped), and the `cardTitle`/`cardSubline` calls live in `variant-render.php`, which the gate never opens.

Counterfactual: E9 off alone gives no finding (E1 exempts). E9 and E1 both off gives two findings: `font-weight: 600` (attrs `labelFontWeight, cardTitleFontWeight, cardSublineFontWeight`) and `line-height: 1` (attrs `labelLineHeight, cardTitleLineHeight, cardSublineLineHeight`). So the name-level pairing could always see the controls; only the exemptions hid them.

### 2.4 business-info `.sgs-business-hours__day { font-weight: 600 }` (CLASS 2)

State examined: parent of `7689ebb70`. Gate result: green.

The control is the block's root `fontWeight` (plus `labelFontWeight`). The declaring selector `.sgs-business-hours__day` yields the single token `day`; neither `fontweight` nor `labelfontweight` contains `day`. `isBemSubElementMismatch` returns true and E1 exempts it.

E11 is not involved: `business-info/render.php` calls `sgs_typography_css_rule( $attributes, '', $root_sel )` and `( ..., 'label', $label_sel )` with variable selectors (`$label_sel = "{$root_sel} .sgs-business-hours__day"` is built on a separate line), so each call has fewer than two literals and is skipped; `helperGov` has no `fontWeight` entry.

Counterfactual: E1 off alone gives a finding at `style.css` `font-weight: 600`, attrs `labelFontWeight, fontWeight`. E1 is the single stopper for this control. E1 exempts because the element is named `day` while the attribute prefix is `label`; the name-substring test cannot connect them.

### 2.5 Summary table

| Control | Class | Dropped by | Also dropped by | Needs to be off to surface |
|---|---|---|---|---|
| accordion `__header` line-height 1.4 | 2 | E11 (wrong token set, selector held in a variable) | E1 (name does not contain `header`) | E1 and E11 |
| whatsapp-cta `__btn` font-weight 600 | 3 | E9 (block-wide, `checkBlock`) | E1 (`btn` not in attr name) | E9 and E1 |
| whatsapp-cta `__btn` line-height 1 | 3 | E9 | E1 | E9 and E1 |
| business-info `__day` font-weight 600 | 2 | E1 | none | E1 |

## 3. Per-entry verdict on all 18 baseline entries

Verdict vocabulary: CLASS-1-FALSE-POSITIVE, REAL-DEBT, DETECTOR-COLLISION, CANNOT-TELL. One entry fits none (the block no longer exists), so I added STALE-ENTRY rather than force it. "Vocab" is the baseline `dispositionVocabulary` value I would assign; "now" is what the baseline carries.

| # | Block / file / property | Verdict | Vocab | Reason, with code |
|---|---|---|---|---|
| 1 | sgs/mega-menu `style.css` `max-width` | STALE-ENTRY | n/a (now accepted-debt) | `src/blocks/mega-menu` does not exist; commit `23a3cf63e` ("retire legacy nav - delete sgs/adaptive-nav + sgs/mega-menu"). The current gate emits 17 findings against 18 keys; this is the one with no producer. Delete the entry. |
| 2 | sgs/brand-strip `style.css` `line-height: 1.3` (nameLineHeight) | CLASS-1-FALSE-POSITIVE | by-design (now accepted-debt) | Rule is `.sgs-brand-strip__name`. `render.php` calls `sgs_typography_css_rule( $attributes, 'name', "{$root_sel} .sgs-brand-strip__name" )` with `$root_sel = '.' . $uid . '.wp-block-sgs-brand-strip'`: the SAME element at (0,3,0) against (0,1,0). The style.css comment says so itself. |
| 3 | sgs/button `style.css` `line-height: 1.2` (lineHeight) | CLASS-1-FALSE-POSITIVE | by-design (now accepted-debt) | Agrees with the brief. `.sgs-button { line-height: 1.2 }` is (0,1,0). `button/render.php` calls `sgs_typography_css_rule( $attributes, '', ".{$uid}.sgs-button" )` with `$uid = 'sgs-btn-' . substr( md5( ... ), 0, 8 )` (a class), so the control is `.{uid}.sgs-button` at (0,2,0) on the same element, and the helper only emits properties that are set. No disagreement with the brief. |
| 4 | sgs/mega-panel `style.css` `padding: 17px` (panelPadding, drawer*) | DETECTOR-COLLISION | detector-limitation (now accepted-debt) | Rule is `.wp-block-sgs-mega-panel[ data-mega-style='cards' ] .sgs-mega-group`, the group card (a child block). `panelPadding` is emitted on `$root_sel` (`sgs_emit_responsive_css( $root_sel, ... 'css' => 'padding' )`), the panel root. Different elements. The hyphenated `.sgs-mega-group` has no `__`, so `extractBemElements` returns `null` and E1 treats it as the root (the E13 docblock names this gap). Secondary: `mega-group/block.json` has no padding or radius attribute, so card padding is a CLASS 4 candidate (no control), not a CLASS 1 problem. |
| 5 | sgs/mega-panel `style.css` `border-radius: 15px` (borderRadius) | DETECTOR-COLLISION | detector-limitation (now accepted-debt) | Same rule and reasoning as #4. `borderRadius` lands on `$root_sel` (`'border-radius:' . $border_radius`), the panel; 15px sits on `.sgs-mega-group`. `render.php` also hardcodes `{padding:17px;border-radius:15px;...}` for the same card, which the gate cannot see (section 1.4). CLASS 4 candidate. |
| 6 | sgs/product-card `style.css` `border-radius: 16px` (pickerPill*, tagBorderRadius) | CLASS-1-FALSE-POSITIVE | by-design (now accepted-debt) | `.product-card` is the block root (`$classes = array( 'product-card' )` fed to the wrapper). The real control `borderRadius` is applied through `wp_style_engine_get_styles(..., array( 'selector' => $sgs_pc_root_sel ))` with `$sgs_pc_root_sel = '.' . $sgs_card_uid . '.wp-block-sgs-product-card'`: same element, higher specificity. The attribute names listed in the entry (pickerPill*, tagBorderRadius) are name-suffix collisions on other elements; `borderRadius` is the one that applies and it wins. |
| 7 | sgs/card-grid `block.json` default `color: primary` (titleColour) | REAL-DEBT | accepted-debt (now detector-limitation) | F3b path (`checkBlockJsonDefaults`), outside CLASS 1 to 4. The baseline reason says a `var()` result makes it exempt. That is not the test: `render.php` emits `{$sgs_grid_title_sel}{{$title_colour_decl};}` with `$sgs_grid_title_sel = '.' . $sgs_grid_uid . ' .sgs-card-grid__title'` (two classes) and the default is present in `$attributes`, so a (0,2,0) rule beats theme.json `styles.elements.heading.color.text`. That is the D343 case in `getThemeGovernedProps`'s own docblock ("sgs/heading's textColour: 'text' ... theme.json is silently disabled"). The finding text ("theme-differentiated") is inaccurate: theme.json colour is uniform across h1 to h6 (`elements.heading.color.text`), and the divergence the detector sees is `p` being absent from the element map (`getDivergentProps` counts absence as a distinct state). Whether the block should deliberately own a title colour is a design call I cannot read from code. |
| 8 | sgs/pricing-table `block.json` `color: text` (titleColour) | REAL-DEBT | accepted-debt (now detector-limitation) | Same mechanism. `pricing-table/render.php`: `$title_sel = $root_sel . ' .sgs-pricing-table__name,' ...` and `$responsive_css .= $title_sel . '{' . $title_colour_decl . '}'`. Default `text` equals the theme heading colour today, so no visible change now, but a client re-colouring headings in theme.json would not reach this title. |
| 9 | sgs/process-steps `block.json` `color: text` (titleColour) | REAL-DEBT | accepted-debt (now detector-limitation) | Same family as #8. I did not open this block's emission lines; the verdict rests on the identical `sgs_resolve_text_colour_or_gradient` pattern in the three sibling blocks I did read and on the baseline's own citation. One notch lower confidence than #7, #8 and #10. |
| 10 | sgs/team-member `block.json` `color: primary` (nameColour) | REAL-DEBT | accepted-debt (now detector-limitation) | `team-member/render.php`: `$name_colour_sel = $root_sel . ' .sgs-team-member__name'` and `$scoped_css[] = "{$name_colour_sel}{{$name_colour_decl};}"`, emitted with the default. Same as #7. |
| 11 | sgs/button `style.css` `padding: 14px 24px` (padding) | CLASS-1-FALSE-POSITIVE | by-design (now accepted-debt) | `.sgs-button` (0,1,0). Control: `wp_style_engine_get_styles( $base_style_engine_args, array( 'selector' => ".{$uid}.sgs-button" ) )` (0,2,0), same element. |
| 12 | sgs/form `style.css` `padding: 1rem` (padding, submitPadding, fieldPadding) | DETECTOR-COLLISION | detector-limitation (now accepted-debt) | Rule is `.sgs-form-tile`, the label emitted by the child block (`form-field-tiles/render.php`: `<label class="sgs-form-tile" ...>`). `padding` governs the form root, `submitPadding` the submit button, `fieldPadding` `$sgs_field_sel` (fields). The tile is a different element and no attribute pads it: CLASS 4 candidate. Non-inherited property, so no leak. |
| 13 | sgs/heading `style.css` `margin-bottom: 8px` (margin) | CLASS-1-FALSE-POSITIVE | by-design (now accepted-debt) | `.wp-block-sgs-heading` (0,1,0). `heading/render.php`: `$root_sel = '.' . $uid . '.wp-block-sgs-heading'` with `$uid = 'sgs-hdg-' . ...`, same element (the heading is its own root, per the style.css header). |
| 14 | sgs/option-picker `style.css` `margin: -1px` (margin) | DETECTOR-COLLISION | detector-limitation (now accepted-debt) | Rule is `.sgs-sr-only` (`position:absolute; width:1px; height:1px; margin:-1px; clip...`), the visually-hidden utility used on `<legend class="sgs-sr-only">`. `isLiteralConstant` exempts `1px` on width/height/border but has no `-1px` margin case, so the standard sr-only recipe is flagged against the block's `margin`. No attribute should own it. |
| 15 | sgs/product-faq `style.css` `margin-top: 8px` (margin) | DETECTOR-COLLISION | detector-limitation (now accepted-debt) | Rule is `.sgs-product-faq-item + .sgs-product-faq-item`, the spacing between items (a child block). `margin` governs the product-faq root. No item-gap attribute exists on either block (attribute lists read from both `block.json` files): CLASS 4 candidate. |
| 16 | sgs/whatsapp-cta `style.css` `margin: -1px` (margin) | DETECTOR-COLLISION | detector-limitation (now accepted-debt) | Same `.sgs-sr-only` utility as #14 (`<span class="sgs-sr-only">` in `whatsapp-cta/render.php`). |
| 17 | sgs/nav-drawer `style.css` `width: 28px` (closeSize) | DETECTOR-COLLISION | detector-limitation (correct) | `.sgs-nav-drawer__close svg`, the glyph. `closeSize` is emitted on `$close_sel = $root_sel . ' .sgs-nav-drawer__close'` (the button box). Different element, non-inherited property. Baseline reason confirmed against code. |
| 18 | sgs/nav-drawer `style.css` `height: 28px` (closeSize) | DETECTOR-COLLISION | detector-limitation (correct) | Same as #17. |

Counts (18 total):

- CLASS-1-FALSE-POSITIVE: 5 (#2, #3, #6, #11, #13)
- DETECTOR-COLLISION: 8 (#4, #5, #12, #14, #15, #16, #17, #18)
- REAL-DEBT: 4 (#7, #8, #9, #10), all F3b block.json defaults, none of them CLASS 2 or 3
- STALE-ENTRY: 1 (#1)
- CANNOT-TELL: 0

Observations that follow from the table:

- Zero baseline entries are real CLASS 2 or 3 defects. The gate has no recorded true positive for the class, which is consistent with section 2: it cannot produce one.
- Seven baseline entries are labelled `accepted-debt` but are not debt (#2, #3, #6, #11, #13 are by-design; #14 and #16 are detector gaps). Three CLASS 4 candidates sit behind #4/#5, #12 and #15.
- The four F3b entries are labelled `detector-limitation` on reasoning that does not hold (a `var()` result is irrelevant to whether a default outranks `elements.heading.color`). I did not re-derive whether `p` in the enum should be excluded from the divergence test; that is a gate design question.
- Baseline keys embed Windows separators (`src\\blocks\\...`, built from `path.relative`). On a POSIX runner the keys would not match and all 17 would read as net-new. I did not test this on POSIX; see section 5.

## 4. What it would take to see CLASS 2 and 3 (design only, no code changed)

Goal: for an INHERITED property P (the scoping list in the brief), decide whether a declaration of P on selector S is on a different element from the control's selector S_c, and whether that element is a descendant of S_c's element (CLASS 2) or a shared wrapper over text children with no control (CLASS 3).

New inputs required:

1. **A control emission map per block: property to set of resolved selectors.** Sources, in order of reliability:
   - Call sites of `sgs_typography_css_rule( $attributes, '<prefix>', <selector> )` across `render.php` AND every sibling PHP file in the block directory (`variant-render.php`, `media-render.php`, ...). The prefix resolves attribute names exactly as `sgs_typography_attr` does, and the property set is what `sgs_typography_css_rule` can emit (FontSize, FontWeight, FontStyle, TextTransform, TextDecoration, LineHeight, LetterSpacing, TextAlign, TextWrap, TextIndent, FontFamily).
   - A resolver that evaluates simple PHP string assignments (`$root_sel = '.' . $uid . '.wp-block-x'`, `$label_sel = "{$root_sel} .sgs-x__day"`), so a variable selector argument yields a selector string. This is the single largest defect in today's E11: variable selectors silently yield no governance.
   - Native-wrapper controls (block-level `fontWeight`, `lineHeight` that `SGS_Container_Wrapper` paints on the root) as selector `.<uid>.wp-block-<slug>`.
   - Candidate shortcut: `block_attributes.css_element` in `sgs-framework.db` already names an element per attribute (for example `sgs/accordion lineHeight` is `wrapper`, `sgs/whatsapp-cta cardTitleFontWeight` is `card-title`). It cannot be trusted as is: its `derived_selector` values do not match the real selectors in the three blocks I checked (`.sgs-whatsapp-cta__heading` against real `__card-title`; `.sgs-accordion__header` against real `.sgs-accordion-item__header`; `.sgs-business-info__label` against real `.sgs-business-hours__day`), and the project memory records `css_element` as inert in the resolver. Use it as a cross-check, not the source.
2. **Element ancestry for the declaring selector.** Two options, in increasing cost:
   - Selector-relation only: classify S against S_c lexically. Same last compound means CLASS 1 (then compare specificity); S ending in a descendant class of S_c's root class (descendant combinator, or a `__` element of the same block) means CLASS 2. This needs no markup but fails for blocks whose children are sibling blocks (`.sgs-mega-group` inside `.sgs-mega-panel`, `.sgs-form-tile` inside form).
   - Markup ancestry: parse the class nesting that `render.php` emits (HTML literals such as `<label class="sgs-form-tile">`) into a tree, then for each text-bearing leaf class compute the nearest ancestor that carries a control for P. A CLASS 3 finding is: S is an ancestor of a text leaf, and that leaf has no control for P and no direct declaration of P. This needs the HTML templates; blocks that build markup with `sprintf` in helper files will be partly invisible and should report CANNOT-TELL.
3. **Per-property, inherited-only scoping.** Add the brief's inherited list as a constant and run the new descendant and wrapper classification only for those; keep the existing same-element path for non-inherited properties. Without this, the new check would turn the eight DETECTOR-COLLISION rows above into false CLASS 2 or 3 findings.

Functions to change:

- `collectHelperGovernance` and `captureCallArgRegions`: scan all `*.php` in the block directory, resolve variable selector arguments, stop discarding `lits.length < 2` calls, and store a selector list instead of a class-token set. Extend `HELPER_SELECTOR_SUFFIXES.sgs_typography_css_rule.suffixes` with the six omitted suffixes.
- `attrToCssProps` / `SUFFIX_MAP`: add `fontfamily`, `fontstyle`, `textindent`, `textdecoration`, `wordspacing`, `whitespace`.
- `scanCssDeclarations`: replace the E11 "token referenced" branch and the E1 "name contains token" branch with a relation test between S and each S_c; return a `class` field. Keep E1 only as a fallback when no emission map exists for the property.
- `checkBlock`: make E9 per selector rather than per block (exempt only a declaration whose selector is the `selectors.typography` target, `.sgs-whatsapp-cta__label` in the example), and make E8 selector-aware instead of property-wide.
- `scanPhpInlineStyles`: either extend to scoped-rule strings emitted in `render.php`, or document that those hardcodes (the mega-panel `{padding:17px;border-radius:15px;...}` string) are out of scope.
- New exemption for the `.sgs-sr-only` visually-hidden recipe (negative margin plus `clip`), retiring #14 and #16.
- `findingKey`: normalise path separators so the baseline matches on POSIX.
- Baseline schema: add `class` (1 to 4) and make `disposition` mandatory; re-seed the 18 with the dispositions in section 3.

Regression fixtures this map provides: the four positive controls (trees at the parents of `776a93639`, `12c0a0bb6`, `7689ebb70`) must flip from green to flagged, and the button `.sgs-button` line-height and padding rows (same element, (0,1,0) against (0,2,0)) must stay unflagged. The scratch harness in section 0 (current gate against `git archive` of the old trees) is the cheapest way to assert both.

## 5. Scope limits and CANNOT-TELL

- I did not open `process-steps/render.php` emission lines (entry #9); the verdict rests on pattern identity with three sibling blocks plus the baseline's own citation.
- CANNOT-TELL: whether a block-level default colour on a card title is a deliberate design choice (entries #7 to #10). The code shows it overrides the theme heading colour; intent is not in the code.
- CANNOT-TELL: baseline key behaviour on a POSIX runner (separator point above). I did not run the gate on Linux; I would need a Linux or CI run to confirm.
- CANNOT-TELL: how many of the 95 blocks hold a live CLASS 2 or 3 defect today. I proved the mechanism on four known instances and did not run a new detector across the blocks. The measured ground truth I relied on (46 of 95 blocks never call `sgs_typography_css_rule`; product-card 12 calls; choice-flow and choice-flow-question 0; cart 1) was given to me; my own re-count found 46 `render.php` files without the call, which excludes sibling PHP files.
- Not covered: editor.css and the editor canvas (the gate excludes editor.css by design); `theme/` stylesheets; `includes/` helpers that hardcode typography; CSS under `src/blocks/*/index.css` (filter-search, product-search); `scripts/computed-route/` and `scripts/parity/` (out of scope by instruction); live computed-style verification (no browser run, by instruction).
- The counterfactual runs used scratch edits of a copy of the gate, one `if` at a time. Combinations beyond those listed were not run, so the "needs to be off to surface" column in section 2.5 is exact only for the pairs shown.
- I did not trace whether other accordion-family blocks repeat the pattern.
