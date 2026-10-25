# Fill: header

Client indus-foods. Draft: sites/indus-foods/handoff (served locally). 19 nodes, 31 measured elements (draftRef and draftSlots). Fill writes rest-state styles, spacing, presence, words, links and motion (each node's sgsMotion: entrances and hover moves) in one root-down pass; hover, focus and active colour states are Solve's.

| What | Count |
|---|---|
| Settings written | 315 (and 7 a later write on the same setting replaced, marked `supersededBy`) |
| Custom-CSS rules with a gaps row (the native control each could become) | 1 |
| UNMAPPED (framework work, known before the first build) | 128 |
| Handover (content outside the tree) | 5 (site-info 5, product-data 0, content-page 0, behaviour 0, woocommerce-text 0) |
| Fluid sizes found | 0 (0 written as clamp()) |
| Breakpoint steps logged for a human | 50 |
| Already held (the element renders the draft's value; not a gap) | 18 (covered 16, inherited 0, inert 2) |
| Held by the divergence ledger | 0 |
| Not read (settings no read reached and no decision judged) | 165 |
| Settled (read, nothing to write; each row in fill-report.json `settled`) | 2312 (equal 1503, already-set 88, used-size 22, not-painted 616, row-held 8, logo-size 0, width-ladder 17, dimension 21, motion 37) |
| Confirm records (declared against rendered, FR-48-8) | 267 (confirmed 194, render-wins 0, draft-defect 0, effect-differs 1, open 72) |

## UNMAPPED

Each row is a draft value no block setting can hold (or that the draft paints and the block cannot), with the reason the resolver gave.

| Property | Value | State | Node | Block | Element | Reason |
|---|---|---|---|---|---|---|
| display | block |  | cr-ref-header-0 | sgs/site-header |  | no-setting: no layout setting holds display:block on sgs/site-header "" (candidates: sgsHideOnDesktop, sgsHideOnMobile, sgsHideOnTablet); equivalence: 1 spelling: no shorthand \| 2 values: draft block |
| transition-duration | 0.3s |  | cr-ref-header-0 | sgs/site-header |  | no-setting: sgs/site-header has no setting for transition-duration; equivalence: 1 spelling: shorthands transition \| 2 values: draft 0.3s (canonical 300); default paint 0s \| 3 inert: no (transition- |
| position | sticky |  | cr-ref-header-0 | sgs/site-header |  | no-setting: sgs/site-header has no setting for position; equivalence: 1 spelling: no shorthand \| 2 values: draft sticky; the default paint is unmeasured \| 3 inert: no (position applies at 1440 (allE |
| z-index | 200 |  | cr-ref-header-0 | sgs/site-header |  | no-setting: sgs/site-header has no setting for z-index; equivalence: 1 spelling: no shorthand \| 2 values: draft 200; the default paint is unmeasured \| 3 inert: no (z-index applies at 1440 (positione |
| display | {"375":"block","768":"flex","1440":"flex"} |  | cr-ref-header-1 | sgs/site-header-row |  | no-setting: no layout setting holds display:block, flex on sgs/site-header-row "" (candidates: sgsHideOnDesktop, sgsHideOnMobile, sgsHideOnTablet); equivalence: 1 spelling: no shorthand \| 2 values: d |
| position | relative |  | cr-ref-header-1 | sgs/site-header-row |  | no-setting: sgs/site-header-row has no setting for position; equivalence: 1 spelling: no shorthand \| 2 values: draft relative; the default paint is unmeasured \| 3 inert: no (position applies at 1440 |
| z-index | 201 |  | cr-ref-header-1 | sgs/site-header-row |  | no-setting: sgs/site-header-row has no setting for z-index; equivalence: 1 spelling: no shorthand \| 2 values: draft 201; the default paint is unmeasured \| 3 inert: no (z-index applies at 1440 (posit |
| display | flex |  | cr-ref-header-3 | sgs/button |  | no-setting: no layout setting holds display:flex on sgs/button "" (candidates: sgsHideOnDesktop, sgsHideOnMobile, sgsHideOnTablet); equivalence: 1 spelling: no shorthand \| 2 values: draft flex; defau |
| text-align | start |  | cr-ref-header-3 | sgs/button |  | shape: start is not one of , left, center, right, justify |
| transition-duration | 0.2s, 0.25s, 0.2s, 0.2s |  | cr-ref-header-3 | sgs/button |  | no-setting: sgs/button has no setting for transition-duration; equivalence: 1 spelling: shorthands transition \| 2 values: draft 0.2s, 0.25s, 0.2s, 0.2s (canonical 200, 250, 200, 200); default paint 0 |
| white-space-collapse | collapse |  | cr-ref-header-3 | sgs/button |  | no-setting: sgs/button has no setting for white-space-collapse; held (default): the block's calibrated default paint of this element is already white-space-collapse collapse (read from white-space) |
| svg | iconSource |  | cr-ref-header-4 | sgs/button |  | the block declares no iconSource, so the draft icon's iconSource is not written |
| display | flex |  | cr-ref-header-4 | sgs/button |  | no-setting: no layout setting holds display:flex on sgs/button "" (candidates: sgsHideOnDesktop, sgsHideOnMobile, sgsHideOnTablet); equivalence: 1 spelling: no shorthand \| 2 values: draft flex; defau |
| text-align | start |  | cr-ref-header-4 | sgs/button |  | shape: start is not one of , left, center, right, justify |
| transition-duration | 0.2s, 0.25s, 0.2s, 0.2s |  | cr-ref-header-4 | sgs/button |  | no-setting: sgs/button has no setting for transition-duration; equivalence: 1 spelling: shorthands transition \| 2 values: draft 0.2s, 0.25s, 0.2s, 0.2s (canonical 200, 250, 200, 200); default paint 0 |
| white-space-collapse | collapse |  | cr-ref-header-4 | sgs/button |  | no-setting: sgs/button has no setting for white-space-collapse; held (default): the block's calibrated default paint of this element is already white-space-collapse collapse (read from white-space) |
| svg | iconSource |  | cr-ref-header-5 | sgs/button |  | the block declares no iconSource, so the draft icon's iconSource is not written |
| display | flex |  | cr-ref-header-5 | sgs/button |  | no-setting: no layout setting holds display:flex on sgs/button "" (candidates: sgsHideOnDesktop, sgsHideOnMobile, sgsHideOnTablet); equivalence: 1 spelling: no shorthand \| 2 values: draft flex; defau |
| text-align | start |  | cr-ref-header-5 | sgs/button |  | shape: start is not one of , left, center, right, justify |
| transition-duration | 0.2s, 0.25s, 0.2s, 0.2s |  | cr-ref-header-5 | sgs/button |  | no-setting: sgs/button has no setting for transition-duration; equivalence: 1 spelling: shorthands transition \| 2 values: draft 0.2s, 0.25s, 0.2s, 0.2s (canonical 200, 250, 200, 200); default paint 0 |
| white-space-collapse | collapse |  | cr-ref-header-5 | sgs/button |  | no-setting: sgs/button has no setting for white-space-collapse; held (default): the block's calibrated default paint of this element is already white-space-collapse collapse (read from white-space) |
| svg | iconSource |  | cr-ref-header-6 | sgs/button |  | the block declares no iconSource, so the draft icon's iconSource is not written |
| display | flex |  | cr-ref-header-6 | sgs/button |  | no-setting: no layout setting holds display:flex on sgs/button "" (candidates: sgsHideOnDesktop, sgsHideOnMobile, sgsHideOnTablet); equivalence: 1 spelling: no shorthand \| 2 values: draft flex; defau |
| text-align | start |  | cr-ref-header-6 | sgs/button |  | shape: start is not one of , left, center, right, justify |
| transition-duration | 0.2s, 0.25s, 0.2s, 0.2s |  | cr-ref-header-6 | sgs/button |  | no-setting: sgs/button has no setting for transition-duration; equivalence: 1 spelling: shorthands transition \| 2 values: draft 0.2s, 0.25s, 0.2s, 0.2s (canonical 200, 250, 200, 200); default paint 0 |
| white-space-collapse | collapse |  | cr-ref-header-6 | sgs/button |  | no-setting: sgs/button has no setting for white-space-collapse; held (default): the block's calibrated default paint of this element is already white-space-collapse collapse (read from white-space) |
| transition-duration | 0.35s, 0.25s |  | cr-ref-header-11 | sgs/icon |  | no-setting: sgs/icon has no setting for transition-duration; equivalence: 1 spelling: shorthands transition \| 2 values: draft 0.35s, 0.25s (canonical 350, 250); default paint 0.25s, 0.25s, 0.25s, 0.2 |
| transition-timing-function | cubic-bezier(0.34, 1.56, 0.64, 1), ease |  | cr-ref-header-11 | sgs/icon |  | no-setting: sgs/icon has no setting for transition-timing-function; equivalence: 1 spelling: shorthands transition \| 2 values: draft cubic-bezier(0.34, 1.56, 0.64, 1), ease (canonical 0.34,1.56,0.64, |
| height | 34px |  | cr-ref-header-11 | sgs/icon |  | no-setting: sgs/icon has no setting for height; equivalence: 1 spelling: no shorthand \| 2 values: draft 34px; default paint 32px \| 3 inert: no (height applies at 1440 (allElementsButNonReplacedAndTa |
| justify-content | center |  | cr-ref-header-11 | sgs/icon |  | no-setting: sgs/icon has no setting for justify-content; equivalence: 1 spelling: shorthands place-content \| 2 values: draft center; default paint normal \| 3 inert: no (justify-content applies at 14 |
| align-items | center |  | cr-ref-header-11 | sgs/icon |  | no-setting: sgs/icon has no setting for align-items; equivalence: 1 spelling: shorthands place-items \| 2 values: draft center; default paint normal \| 3 inert: no (align-items applies at 1440 (allEle |
| transition-duration | 0.35s, 0.25s |  | cr-ref-header-11 | sgs/icon |  | no-setting: sgs/icon has no setting for transition-duration; equivalence: 1 spelling: shorthands transition \| 2 values: draft 0.35s, 0.25s (canonical 350, 250); default paint 0s \| 3 inert: no (trans |
| transition-timing-function | cubic-bezier(0.34, 1.56, 0.64, 1), ease |  | cr-ref-header-11 | sgs/icon |  | no-setting: sgs/icon has no setting for transition-timing-function; equivalence: 1 spelling: shorthands transition \| 2 values: draft cubic-bezier(0.34, 1.56, 0.64, 1), ease (canonical 0.34,1.56,0.64, |
| height | 34px |  | cr-ref-header-11 | sgs/icon |  | no-setting: sgs/icon has no setting for height; equivalence: 1 spelling: no shorthand \| 2 values: draft 34px; default paint 32px \| 3 inert: no (height applies at 1440 (allElementsButNonReplacedAndTa |
| justify-content | normal |  | cr-ref-header-11 | sgs/icon | .sgs-icon__shape > .sgs-icon__svg | ambiguous: iconSource=wp-icon, iconSource=emoji all give justify-content on ".sgs-icon__shape > .sgs-icon__glyph" |
| align-items | normal |  | cr-ref-header-11 | sgs/icon | .sgs-icon__shape > .sgs-icon__svg | ambiguous: iconSource=wp-icon, iconSource=emoji all give align-items on ".sgs-icon__shape > .sgs-icon__glyph" |
| fill | rgb(255, 255, 255) |  | cr-ref-header-11 | sgs/icon | .sgs-icon__shape > .sgs-icon__svg | no-setting: sgs/icon has no setting for fill; equivalence: 1 spelling: no shorthand \| 2 values: draft rgb(255, 255, 255); default paint rgb(0, 0, 0) \| 3 inert: no (fill applies at 1440 (limitedSVGEl |
| height | 17px |  | cr-ref-header-11 | sgs/icon | .sgs-icon__shape > .sgs-icon__svg | no-setting: sgs/icon has no setting for height; equivalence: 1 spelling: no shorthand \| 2 values: draft 17px; default paint 32px \| 3 inert: no (height applies at 1440 (allElementsButNonReplacedAndTa |
| height | 15px |  | cr-ref-header-10 | sgs/icon | .sgs-icon__shape > .sgs-icon__svg | no-setting: sgs/icon has no setting for height; equivalence: 1 spelling: no shorthand \| 2 values: draft 15px; default paint 32px \| 3 inert: no (height applies at 1440 (allElementsButNonReplacedAndTa |
| border-bottom-style | solid |  | cr-ref-header-12 | sgs/site-header-row |  | shape: borderStyle holds one value for every side; draft has border-top-style none, border-right-style none, border-bottom-style solid, border-left-style none at 1440 |
| position | relative |  | cr-ref-header-12 | sgs/site-header-row | .sgs-container__inner | no-setting: sgs/site-header-row has no setting for position; equivalence: 1 spelling: no shorthand \| 2 values: draft relative; the default paint is unmeasured \| 3 inert: no (position applies at 1440 |
| display | block |  | cr-ref-header-13 | sgs/responsive-logo |  | no-setting: no layout setting holds display:block on sgs/responsive-logo "" (candidates: sgsHideOnDesktop, sgsHideOnMobile, sgsHideOnTablet); equivalence: 1 spelling: no shorthand \| 2 values: draft b |
| color | rgb(10, 126, 168) |  | cr-ref-header-13 | sgs/responsive-logo |  | no-setting: sgs/responsive-logo has no setting for color; equivalence: 1 spelling: no shorthand \| 2 values: draft rgb(10, 126, 168); the default paint is unmeasured \| 3 inert: no (color applies at 1 |
| aspect-ratio | 3741 / 848 |  | cr-ref-header-13 | sgs/responsive-logo |  | no-setting: sgs/responsive-logo has no setting for aspect-ratio; equivalence: 1 spelling: no shorthand \| 2 values: draft 3741 / 848; default paint auto \| 3 inert: no (aspect-ratio applies at 1440 (a |
| display | flex |  | cr-ref-header-15 | sgs/button |  | no-setting: no layout setting holds display:flex on sgs/button "" (candidates: sgsHideOnDesktop, sgsHideOnMobile, sgsHideOnTablet); equivalence: 1 spelling: no shorthand \| 2 values: draft flex; defau |
| text-align | start |  | cr-ref-header-15 | sgs/button |  | shape: start is not one of , left, center, right, justify |
| transition-duration | 0.25s, 0.25s, 0.2s, 0.2s |  | cr-ref-header-15 | sgs/button |  | no-setting: sgs/button has no setting for transition-duration; equivalence: 1 spelling: shorthands transition \| 2 values: draft 0.25s, 0.25s, 0.2s, 0.2s (canonical 250, 250, 200, 200); default paint  |
| transition-timing-function | cubic-bezier(0.2, 0.8, 0.2, 1), ease, ease, ease |  | cr-ref-header-15 | sgs/button |  | no-setting: sgs/button has no setting for transition-timing-function; equivalence: 1 spelling: shorthands transition \| 2 values: draft cubic-bezier(0.2, 0.8, 0.2, 1), ease, ease, ease (canonical 0.2, |
| white-space-collapse | collapse |  | cr-ref-header-15 | sgs/button |  | no-setting: sgs/button has no setting for white-space-collapse; held (default): the block's calibrated default paint of this element is already white-space-collapse collapse (read from white-space) |
| font-size | 17px |  | cr-ref-header-16 | sgs/nav-bar-menu |  | no-setting: no font-size setting on sgs/nav-bar-menu paints "" (candidates: itemFontSize, burgerFontSize, submenuFontSize, itemBadgeFontSize); equivalence: 1 spelling: shorthands font \| 2 values: dra |
| font-weight | 600 |  | cr-ref-header-16 | sgs/nav-bar-menu |  | unpaired-part: itemFontWeight paints the item part (calibrated at ".sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item > .sgs-nav-bar-menu__link"), but font-weight 600 was read from "", an element the dr |
| line-height | 24px |  | cr-ref-header-16 | sgs/nav-bar-menu |  | unpaired-part: itemLineHeight paints the item part (calibrated at ".sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item > .sgs-nav-bar-menu__link"), but line-height 24px was read from "", an element the d |
| letter-spacing | -0.17px |  | cr-ref-header-16 | sgs/nav-bar-menu |  | unpaired-part: burgerLetterSpacing paints the burger part (calibrated at ".sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger"), but letter-spacing -0.17px was read from "", an element the draf |
| height | 100% |  | cr-ref-header-16 | sgs/nav-bar-menu |  | no-setting: no height setting on sgs/nav-bar-menu paints "" (candidates: burgerSize, triggerDetachSize, burgerIconHeight, submenuCaretSize, burgerBarThickness); equivalence: 1 spelling: no shorthand \ |
| position | relative |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | no-setting: sgs/nav-bar-menu has no setting for position; equivalence: 1 spelling: no shorthand \| 2 values: draft relative; the default paint is unmeasured \| 3 inert: no (position applies at 1440 (a |
| position | relative |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | no-setting: sgs/nav-bar-menu has no setting for position; equivalence: 1 spelling: no shorthand \| 2 values: draft relative; the default paint is unmeasured \| 3 inert: no (position applies at 1440 (a |
| display | block |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret | no-setting: no layout setting holds display:block on sgs/nav-bar-menu ".sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle  |
| text-align | center |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret | no-setting: no text-align setting on sgs/nav-bar-menu paints ".sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-na |
| color | "custom-ink" |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret | conflict: navColour (one setting, two elements): color "custom-ink" read on .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subto |
| opacity | 0.6 |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret | no-setting: no opacity setting on sgs/nav-bar-menu paints ".sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-b |
| height | 11px |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret | no-setting: no height setting on sgs/nav-bar-menu paints ".sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-ba |
| transition-duration | 0.25s, 0.25s, 0.4s, 0.25s |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | no-setting: no transition-duration setting on sgs/nav-bar-menu paints ".sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger" (candidates: itemMotionDuration, submenuCaretTurnDuration, scrimFadeD |
| transition-timing-function | ease, ease, cubic-bezier(0.34, 1.56, 0.64, 1), ease |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | no-setting: no transition-timing-function setting on sgs/nav-bar-menu paints ".sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger" (candidates: itemMotionEasing, submenuCaretTurnEasingCustom, s |
| flex-direction | column |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | no-setting: sgs/nav-bar-menu has no setting for flex-direction; equivalence: 1 spelling: shorthands flex-flow \| 2 values: draft column; default paint row \| 3 inert: no (flex-direction applies at 768 |
| flex-shrink | 0 |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | no-setting: sgs/nav-bar-menu has no setting for flex-shrink; equivalence: 1 spelling: shorthands flex \| 2 values: draft 0; default paint 1 \| 3 inert: no (whether flex-shrink (flexItemsAndInFlowPseud |
| text-align | center |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(1) | no-setting: no text-align setting on sgs/nav-bar-menu paints ".sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(1) |
| transition-duration | 0s |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(1) | no-setting: no transition-duration setting on sgs/nav-bar-menu paints ".sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-o |
| text-align | center |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(2) | no-setting: no text-align setting on sgs/nav-bar-menu paints ".sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(2) |
| text-align | center |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(3) | no-setting: no text-align setting on sgs/nav-bar-menu paints ".sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(3) |
| display | flex |  | cr-ref-header-17 | sgs/button |  | no-setting: no layout setting holds display:flex on sgs/button "" (candidates: sgsHideOnDesktop, sgsHideOnMobile, sgsHideOnTablet); equivalence: 1 spelling: no shorthand \| 2 values: draft flex; defau |
| text-align | start |  | cr-ref-header-17 | sgs/button |  | shape: start is not one of , left, center, right, justify |
| transition-duration | 0.25s, 0.25s, 0.2s, 0.2s |  | cr-ref-header-17 | sgs/button |  | no-setting: sgs/button has no setting for transition-duration; equivalence: 1 spelling: shorthands transition \| 2 values: draft 0.25s, 0.25s, 0.2s, 0.2s (canonical 250, 250, 200, 200); default paint  |
| transition-timing-function | cubic-bezier(0.2, 0.8, 0.2, 1), ease, ease, ease |  | cr-ref-header-17 | sgs/button |  | no-setting: sgs/button has no setting for transition-timing-function; equivalence: 1 spelling: shorthands transition \| 2 values: draft cubic-bezier(0.2, 0.8, 0.2, 1), ease, ease, ease (canonical 0.2, |
| white-space-collapse | collapse |  | cr-ref-header-17 | sgs/button |  | no-setting: sgs/button has no setting for white-space-collapse; held (default): the block's calibrated default paint of this element is already white-space-collapse collapse (read from white-space) |
| transition-duration | {"375":"0.3s","768":"0.3s","1440":"0.3s"} |  | cr-ref-header-0 | sgs/site-header |  | timing-no-home: sgs/site-header has no setting that holds the resting transition-duration of this element (no-setting) |
| font-weight | {"768":"700"} | hover | cr-ref-header-15 | sgs/button |  | no-setting: sgs/button has no setting for font-weight (hover); equivalence: 1 spelling: shorthands font \| 2 values: draft 700; the default paint is unmeasured (a hover value is not compared with the  |
| color | {"1440":"rgb(30, 42, 60)"} | hover | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | default-state: navColourHover already holds "primary" on this block, and this element's resting color is "custom-ink" |
| transform | {"1440":"matrix(-1, 0, 0, -1, 0, 0)"} | open | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret | script-look: open on Root/50#0 (open-panel look): no-setting: sgs/nav-bar-menu has no setting for transform (open); equivalence: 1 spelling: no shorthand \| 2 values: draft matrix(-1, 0, 0, -1, 0, 0); |
| color | {"1440":"rgb(30, 42, 60)"} | hover | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret | default-state: navColourHover already holds "primary" on this block, and this element's resting color is "custom-ink" |
| font-weight | {"1440":"700"} | hover | cr-ref-header-17 | sgs/button |  | no-setting: sgs/button has no setting for font-weight (hover); equivalence: 1 spelling: shorthands font \| 2 values: draft 700; the default paint is unmeasured (a hover value is not compared with the  |
| settings.custom.focus.offset | "0px" | focus | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | conflict: the browser's own focus ring differs between elements and the site focus token settings.custom.focus.offset holds one value: cr-ref-header-3 root shows "1px" (kept), cr-ref-header-16 .sgs-na |
| motion | TR-008 |  | cr-ref-header-0 | sgs/site-header |  | a state state transition: the states wave (FR-48-81) or the owning block's setting |
| motion | RM-01 |  | cr-ref-header-0 | sgs/site-header |  | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| motion | RM-01 |  | cr-ref-header-1 | sgs/site-header-row |  | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| motion | RM-01 |  | cr-ref-header-1 | sgs/site-header-row | .sgs-container__inner | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| motion | RM-01 |  | cr-ref-header-2 | sgs/multi-button |  | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| motion | RM-01 |  | cr-ref-header-3 | sgs/button |  | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| motion | RM-01 |  | cr-ref-header-4 | sgs/button |  | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| motion | RM-01 |  | cr-ref-header-5 | sgs/button |  | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| motion | RM-01 |  | cr-ref-header-6 | sgs/button |  | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| motion | RM-01 |  | cr-ref-header-12 | sgs/site-header-row |  | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| motion | RM-01 |  | cr-ref-header-12 | sgs/site-header-row | .sgs-container__inner | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| motion | RM-01 |  | cr-ref-header-13 | sgs/responsive-logo |  | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| motion | RM-01 |  | cr-ref-header-14 | sgs/container |  | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| motion | RM-01 |  | cr-ref-header-15 | sgs/button |  | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| motion | RM-01 |  | cr-ref-header-16 | sgs/nav-bar-menu |  | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| motion | TR-009 |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | no declared part of sgs/nav-bar-menu is this element (.sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link); the record is also skipped: a state state transition:  |
| motion | RM-01 |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | no declared part of sgs/nav-bar-menu is this element (.sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link); the record is also skipped: a reduced-motion rule: the |
| motion | TR-009 |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | no declared part of sgs/nav-bar-menu is this element (.sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link); the record is also skipped: a state state transition:  |
| motion | RM-01 |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | no declared part of sgs/nav-bar-menu is this element (.sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link); the record is also skipped: a reduced-motion rule: the |
| motion | TR-011 |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret | no declared part of sgs/nav-bar-menu is this element (.sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-me |
| motion | RM-01 |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret | no declared part of sgs/nav-bar-menu is this element (.sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-me |
| motion | RM-01 |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| motion | RM-01 |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(1) | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| motion | RM-01 |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(2) | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| motion | RM-01 |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(3) | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| motion | RM-01 |  | cr-ref-header-17 | sgs/button |  | a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12) |
| transition-property | {"375":"box-shadow","768":"box-shadow","1440":"box-shadow"} |  | cr-ref-header-0 | sgs/site-header |  | calibration has no reading of transition-property for the block root of sgs/site-header (lib/calibrate-props.mjs::READ_PROPS does not read it), so whether live transitions the draft's box-shadow is un |
| transition-behavior | {"375":"normal","768":"normal","1440":"normal"} |  | cr-ref-header-0 | sgs/site-header |  | calibration has no reading of transition-behavior for the block root of sgs/site-header (lib/calibrate-props.mjs::READ_PROPS does not read it), so whether live transitions the draft's box-shadow with  |
| transition-property | {"375":"transform, box-shadow, background, color"} |  | cr-ref-header-3 | sgs/button |  | no-setting: sgs/button has no setting for which properties the block root transitions; its sgsMotion hover state transitions color, background-color, border-color, box-shadow, transform, translate, op |
| transition-property | {"375":"transform, box-shadow, background, color","768":"transform, box-shadow, background, color","1440":"transform, box-shadow, background, color"} |  | cr-ref-header-4 | sgs/button |  | no-setting: sgs/button has no setting for which properties the block root transitions; its sgsMotion hover state transitions color, background-color, border-color, box-shadow, transform, translate, op |
| transition-property | {"375":"transform, box-shadow, background, color","768":"transform, box-shadow, background, color","1440":"transform, box-shadow, background, color"} |  | cr-ref-header-5 | sgs/button |  | no-setting: sgs/button has no setting for which properties the block root transitions; its sgsMotion hover state transitions color, background-color, border-color, box-shadow, transform, translate, op |
| transition-property | {"768":"transform, box-shadow, background, color","1440":"transform, box-shadow, background, color"} |  | cr-ref-header-6 | sgs/button |  | no-setting: sgs/button has no setting for which properties the block root transitions; its sgsMotion hover state transitions color, background-color, border-color, box-shadow, transform, translate, op |
| transition-property | {"768":"transform, box-shadow","1440":"transform, box-shadow"} |  | cr-ref-header-8 | sgs/icon |  | no-setting: sgs/icon has no setting for which properties the block root transitions; its sgsMotion hover state transitions color, background-color, border-color, box-shadow and the entries its movemen |
| transition-property | {"768":"transform, box-shadow","1440":"transform, box-shadow"} |  | cr-ref-header-9 | sgs/icon |  | no-setting: sgs/icon has no setting for which properties the block root transitions; its sgsMotion hover state transitions color, background-color, border-color, box-shadow and the entries its movemen |
| transition-property | {"768":"transform, box-shadow","1440":"transform, box-shadow"} |  | cr-ref-header-10 | sgs/icon |  | no-setting: sgs/icon has no setting for which properties the block root transitions; its sgsMotion hover state transitions color, background-color, border-color, box-shadow and the entries its movemen |
| transition-property | {"768":"transform, box-shadow","1440":"transform, box-shadow"} |  | cr-ref-header-11 | sgs/icon |  | no-setting: sgs/icon has no setting for which properties the block root transitions; its sgsMotion hover state transitions color, background-color, border-color, box-shadow and the entries its movemen |
| transition-property | {"768":"transform, box-shadow, background, color"} |  | cr-ref-header-15 | sgs/button |  | no-setting: sgs/button has no setting for which properties the block root transitions; its sgsMotion hover state transitions color, background-color, border-color, box-shadow, transform, translate, op |
| transition-property | {"1440":"background, color"} |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | calibration has no reading of transition-property for .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link of sgs/nav-bar-menu (lib/calibrate-props.mjs::READ_PROPS |
| transition-behavior | {"1440":"normal, normal"} |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | calibration has no reading of transition-behavior for .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link of sgs/nav-bar-menu (lib/calibrate-props.mjs::READ_PROPS |
| transition-property | {"1440":"background, color"} |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | calibration has no reading of transition-property for .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link of sgs/nav-bar-menu (lib/calibrate-props.mjs::READ_PROPS |
| transition-behavior | {"1440":"normal, normal"} |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | calibration has no reading of transition-behavior for .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link of sgs/nav-bar-menu (lib/calibrate-props.mjs::READ_PROPS |
| transition-property | {"1440":"transform"} |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret | calibration has no reading of transition-property for .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-me |
| transition-behavior | {"1440":"normal"} |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret | calibration has no reading of transition-behavior for .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-me |
| transition-property | {"375":"background, color, transform, box-shadow","768":"background, color, transform, box-shadow"} |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | no-setting: sgs/nav-bar-menu has no setting for which properties .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger transitions; its sgsMotion hover state transitions color, background-color,  |
| transition-property | {"375":"width","768":"width"} |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(2) | no-setting: sgs/nav-bar-menu has no setting for which properties .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type |
| transition-property | {"375":"width","768":"width"} |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(3) | no-setting: sgs/nav-bar-menu has no setting for which properties .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type |
| transition-property | {"1440":"transform, box-shadow, background, color"} |  | cr-ref-header-17 | sgs/button |  | no-setting: sgs/button has no setting for which properties the block root transitions; its sgsMotion hover state transitions color, background-color, border-color, box-shadow, transform, translate, op |

## Already held

Rows the resolver could not place by name that the element already renders at every width they state, so nothing needs writing. `covered`: a written setting (or an sgsMotion state) paints this value on this element. `inherited`: an inherited property on an element with no text of its own, equal to its parent. `default`: the value is the calibrated default paint of this element. A value that differs by one unit, or holds at some widths only, stays in UNMAPPED.

### covered (16)

| Property | Value | State | Node | Block | Element | Held because |
|---|---|---|---|---|---|---|
| text-wrap-mode | nowrap |  | cr-ref-header-3 | sgs/button |  | textWrap was written for this element and paints text-wrap-mode at the draft's value |
| text-wrap-mode | nowrap |  | cr-ref-header-4 | sgs/button |  | textWrap was written for this element and paints text-wrap-mode at the draft's value |
| text-wrap-mode | nowrap |  | cr-ref-header-5 | sgs/button |  | textWrap was written for this element and paints text-wrap-mode at the draft's value |
| text-wrap-mode | nowrap |  | cr-ref-header-6 | sgs/button |  | textWrap was written for this element and paints text-wrap-mode at the draft's value |
| text-wrap-mode | nowrap |  | cr-ref-header-15 | sgs/button |  | textWrap was written for this element and paints text-wrap-mode at the draft's value |
| background-color | rgb(10, 126, 168) |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(1) | navColour was written for this element and paints background-color at the draft's value |
| background-color | rgb(10, 126, 168) |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(2) | navColour was written for this element and paints background-color at the draft's value |
| background-color | rgb(10, 126, 168) |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(3) | navColour was written for this element and paints background-color at the draft's value |
| text-wrap-mode | nowrap |  | cr-ref-header-17 | sgs/button |  | textWrap was written for this element and paints text-wrap-mode at the draft's value |
| transition-timing-function | ease, ease |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | itemMotionEasing was written for this element and paints transition-timing-function at the draft's value |
| transition-timing-function | ease, ease |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | itemMotionEasing was written for this element and paints transition-timing-function at the draft's value |
| border-bottom-left-radius | 50% |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | burgerBorderRadius was written for this element and paints border-bottom-left-radius at the draft's value |
| border-bottom-right-radius | 50% |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | burgerBorderRadius was written for this element and paints border-bottom-right-radius at the draft's value |
| border-top-left-radius | 50% |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | burgerBorderRadius was written for this element and paints border-top-left-radius at the draft's value |
| border-top-right-radius | 50% |  | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | burgerBorderRadius was written for this element and paints border-top-right-radius at the draft's value |
| color | {"1440":"rgb(10, 126, 168)"} | current | cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | itemColourCurrent was written for this element and paints color at the draft's value |

### inherited (0)

None.

### inert (2)

| Property | Value | State | Node | Block | Element | Held because |
|---|---|---|---|---|---|---|
| justify-content | normal |  | cr-ref-header-0 | sgs/site-header |  | justify-content applies to spec: multicol containers, flex containers, and grid containers and the element is display block, position sticky, parent display unknown at 1440 |
| flex-direction | row |  | cr-ref-header-0 | sgs/site-header |  | flex-direction applies to spec: flex containers and the element is display block, position sticky, parent display unknown at 1440 |

## Not read

Settings the block's calibration or the framework database knows that no read reached and no decision judged on a measured node: a draftSlots finder the skeleton does not give, or a calibration reading that does not exist. Nothing here was written.

| Node | Block | Kind | Element | Settings | Reason |
|---|---|---|---|---|---|
| cr-ref-header-0 | sgs/site-header | element | .sgs-container__inner | contentWidth, padding | no draftSlots finder names ".sgs-container__inner", so the draft element these settings paint was never read |
| cr-ref-header-0 | sgs/site-header | element | ::before | backgroundAttachment, backgroundSize, borderColourGradient | no draftSlots finder names "::before", so the draft element these settings paint was never read |
| cr-ref-header-0 | sgs/site-header | element | .sgs-container__image-bg | backgroundImage | no draftSlots finder names ".sgs-container__image-bg", so the draft element these settings paint was never read |
| cr-ref-header-0 | sgs/site-header | element | @controls:2 | backgroundImageMobile, backgroundImageTablet | no draftSlots finder names "@controls:2", so the draft element these settings paint was never read |
| cr-ref-header-0 | sgs/site-header | element | .sgs-container__overlay | backgroundOverlayColour, overlayGradient, backgroundOverlayOpacity | no draftSlots finder names ".sgs-container__overlay", so the draft element these settings paint was never read |
| cr-ref-header-0 | sgs/site-header | presence |  | shadowLiftOnHover | calibration has no presence reading for shadowLiftOnHover (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-0 | sgs/site-header | presence |  | sgsHideOnDesktop | calibration has no presence reading for sgsHideOnDesktop (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-0 | sgs/site-header | presence | .sgs-container > .sgs-container__inner > .sgs-nav-bar-menu > .sgs-nav-bar-menu__toggle-wrap | sgsHideOnMobile | no draftSlots finder names an element it shows or hides (".sgs-container > .sgs-container__inner > .sgs-nav-bar-menu > .sgs-nav-bar-menu__toggle-wrap"), so the draft gave no evidence |
| cr-ref-header-0 | sgs/site-header | presence |  | sgsHideOnTablet | calibration has no presence reading for sgsHideOnTablet (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-0 | sgs/site-header | structure |  | bgSvgPosition | calibration has no presence reading for its values (background, foreground), so the draft cannot choose one |
| cr-ref-header-1 | sgs/site-header-row | element | ::before | borderColourGradient | no draftSlots finder names "::before", so the draft element these settings paint was never read |
| cr-ref-header-1 | sgs/site-header-row | presence |  | sgsHideOnDesktop | calibration has no presence reading for sgsHideOnDesktop (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-1 | sgs/site-header-row | presence |  | sgsHideOnMobile | calibration has no presence reading for sgsHideOnMobile (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-1 | sgs/site-header-row | presence |  | sgsHideOnTablet | calibration has no presence reading for sgsHideOnTablet (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-1 | sgs/site-header-row | presence |  | rowAnimate | calibration has no presence reading for rowAnimate (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-1 | sgs/site-header-row | structure |  | layout | calibration has no presence reading for its values (flex, grid), so the draft cannot choose one |
| cr-ref-header-2 | sgs/multi-button | element | .sgs-container__inner | contentWidth, padding | no draftSlots finder names ".sgs-container__inner", so the draft element these settings paint was never read |
| cr-ref-header-2 | sgs/multi-button | element | ::after | backgroundColour, backgroundColourGradient | no draftSlots finder names "::after", so the draft element these settings paint was never read |
| cr-ref-header-2 | sgs/multi-button | element | .sgs-container__image-bg | backgroundImage, backgroundSize | no draftSlots finder names ".sgs-container__image-bg", so the draft element these settings paint was never read |
| cr-ref-header-2 | sgs/multi-button | element | .sgs-container__overlay | backgroundOverlayColour, overlayGradient, backgroundOverlayOpacity | no draftSlots finder names ".sgs-container__overlay", so the draft element these settings paint was never read |
| cr-ref-header-2 | sgs/multi-button | element | .sgs-button:nth-of-type(1) | childBtnBackground, childBtnTextColour, childBtnBorderColour, childBtnBorderRadius, childBtnFontSize, childBtnFontWeight, childBtnBorderWidth, childBtnBorderStyle, childBtnBackgroundGradient | no draftSlots finder names ".sgs-button:nth-of-type(1)", so the draft element these settings paint was never read |
| cr-ref-header-2 | sgs/multi-button | element | ::before | borderColourGradient | no draftSlots finder names "::before", so the draft element these settings paint was never read |
| cr-ref-header-2 | sgs/multi-button | presence |  | sgsHideOnDesktop | calibration has no presence reading for sgsHideOnDesktop (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-2 | sgs/multi-button | presence |  | sgsHideOnMobile | calibration has no presence reading for sgsHideOnMobile (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-2 | sgs/multi-button | presence |  | sgsHideOnTablet | calibration has no presence reading for sgsHideOnTablet (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-2 | sgs/multi-button | structure |  | bgSvgPosition | calibration has no presence reading for its values (background, foreground), so the draft cannot choose one |
| cr-ref-header-3 | sgs/button | element | .sgs-button__icon | iconColour, iconColourHover, iconBackground, iconBackgroundHover | no draftSlots finder names ".sgs-button__icon", so the draft element these settings paint was never read |
| cr-ref-header-3 | sgs/button | element | .sgs-button__icon > svg | iconColourGradient, iconColourHoverGradient | no draftSlots finder names ".sgs-button__icon > svg", so the draft element these settings paint was never read |
| cr-ref-header-3 | sgs/button | element | ::before | borderColourGradient, borderColourHoverGradient | no draftSlots finder names "::before", so the draft element these settings paint was never read |
| cr-ref-header-3 | sgs/button | presence |  | download | calibration has no presence reading for download (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-3 | sgs/button | presence |  | isSubmit | calibration has no presence reading for isSubmit (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-3 | sgs/button | presence |  | shadowLiftOnHover | calibration has no presence reading for shadowLiftOnHover (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-3 | sgs/button | presence |  | sgsHideOnDesktop | calibration has no presence reading for sgsHideOnDesktop (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-3 | sgs/button | presence |  | sgsHideOnMobile | calibration has no presence reading for sgsHideOnMobile (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-3 | sgs/button | presence |  | sgsHideOnTablet | calibration has no presence reading for sgsHideOnTablet (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-3 | sgs/button | presence |  | labelFromSiteInfo | calibration has no presence reading for labelFromSiteInfo (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-3 | sgs/button | text |  | iconTitle | calibration has no text reading for iconTitle |
| cr-ref-header-3 | sgs/button | text |  | contentAlign | calibration has no text reading for contentAlign |
| cr-ref-header-4 | sgs/button | element | .sgs-button__icon | iconColour, iconColourHover, iconBackground, iconBackgroundHover | no draftSlots finder names ".sgs-button__icon", so the draft element these settings paint was never read |
| cr-ref-header-4 | sgs/button | element | .sgs-button__icon > svg | iconColourGradient, iconColourHoverGradient | no draftSlots finder names ".sgs-button__icon > svg", so the draft element these settings paint was never read |
| cr-ref-header-4 | sgs/button | element | ::before | borderColourGradient, borderColourHoverGradient | no draftSlots finder names "::before", so the draft element these settings paint was never read |
| cr-ref-header-4 | sgs/button | presence |  | download | calibration has no presence reading for download (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-4 | sgs/button | presence |  | isSubmit | calibration has no presence reading for isSubmit (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-4 | sgs/button | presence |  | shadowLiftOnHover | calibration has no presence reading for shadowLiftOnHover (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-4 | sgs/button | presence |  | sgsHideOnDesktop | calibration has no presence reading for sgsHideOnDesktop (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-4 | sgs/button | presence |  | sgsHideOnMobile | calibration has no presence reading for sgsHideOnMobile (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-4 | sgs/button | presence |  | sgsHideOnTablet | calibration has no presence reading for sgsHideOnTablet (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-4 | sgs/button | text |  | iconTitle | calibration has no text reading for iconTitle |
| cr-ref-header-4 | sgs/button | text |  | contentAlign | calibration has no text reading for contentAlign |
| cr-ref-header-5 | sgs/button | element | .sgs-button__icon | iconColour, iconColourHover, iconBackground, iconBackgroundHover | no draftSlots finder names ".sgs-button__icon", so the draft element these settings paint was never read |
| cr-ref-header-5 | sgs/button | element | .sgs-button__icon > svg | iconColourGradient, iconColourHoverGradient | no draftSlots finder names ".sgs-button__icon > svg", so the draft element these settings paint was never read |
| cr-ref-header-5 | sgs/button | element | ::before | borderColourGradient, borderColourHoverGradient | no draftSlots finder names "::before", so the draft element these settings paint was never read |
| cr-ref-header-5 | sgs/button | presence |  | download | calibration has no presence reading for download (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-5 | sgs/button | presence |  | isSubmit | calibration has no presence reading for isSubmit (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-5 | sgs/button | presence |  | shadowLiftOnHover | calibration has no presence reading for shadowLiftOnHover (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-5 | sgs/button | presence |  | sgsHideOnDesktop | calibration has no presence reading for sgsHideOnDesktop (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-5 | sgs/button | presence |  | sgsHideOnMobile | calibration has no presence reading for sgsHideOnMobile (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-5 | sgs/button | presence |  | sgsHideOnTablet | calibration has no presence reading for sgsHideOnTablet (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-5 | sgs/button | presence |  | labelFromSiteInfo | calibration has no presence reading for labelFromSiteInfo (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-5 | sgs/button | text |  | iconTitle | calibration has no text reading for iconTitle |
| cr-ref-header-5 | sgs/button | text |  | contentAlign | calibration has no text reading for contentAlign |
| cr-ref-header-6 | sgs/button | element | .sgs-button__icon | iconColour, iconColourHover, iconBackground, iconBackgroundHover | no draftSlots finder names ".sgs-button__icon", so the draft element these settings paint was never read |
| cr-ref-header-6 | sgs/button | element | .sgs-button__icon > svg | iconColourGradient, iconColourHoverGradient | no draftSlots finder names ".sgs-button__icon > svg", so the draft element these settings paint was never read |
| cr-ref-header-6 | sgs/button | element | ::before | borderColourGradient, borderColourHoverGradient | no draftSlots finder names "::before", so the draft element these settings paint was never read |
| cr-ref-header-6 | sgs/button | presence |  | download | calibration has no presence reading for download (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-6 | sgs/button | presence |  | isSubmit | calibration has no presence reading for isSubmit (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-6 | sgs/button | presence |  | shadowLiftOnHover | calibration has no presence reading for shadowLiftOnHover (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-6 | sgs/button | presence |  | sgsHideOnDesktop | calibration has no presence reading for sgsHideOnDesktop (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-6 | sgs/button | presence |  | sgsHideOnMobile | calibration has no presence reading for sgsHideOnMobile (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-6 | sgs/button | presence |  | sgsHideOnTablet | calibration has no presence reading for sgsHideOnTablet (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-6 | sgs/button | text |  | iconTitle | calibration has no text reading for iconTitle |
| cr-ref-header-6 | sgs/button | text |  | contentAlign | calibration has no text reading for contentAlign |
| cr-ref-header-7 | sgs/social-icons | element | .sgs-icon:nth-of-type(1) > .sgs-icon__link > .sgs-icon__shape > .sgs-icon__glyph | childIconSize | no draftSlots finder names ".sgs-icon:nth-of-type(1) > .sgs-icon__link > .sgs-icon__shape > .sgs-icon__glyph", so the draft element these settings paint was never read |
| cr-ref-header-7 | sgs/social-icons | element | .sgs-icon:nth-of-type(1) > .sgs-icon__link > .sgs-icon__shape | childIconColour, childIconBackground, childIconBackgroundGradient, childIconBorderColour, childIconBorderWidth, childIconBorderStyle, childIconBoxShadow | no draftSlots finder names ".sgs-icon:nth-of-type(1) > .sgs-icon__link > .sgs-icon__shape", so the draft element these settings paint was never read |
| cr-ref-header-7 | sgs/social-icons | element | .sgs-social-icons__defs | childIconColourGradient, childIconColourHoverGradient | no draftSlots finder names ".sgs-social-icons__defs", so the draft element these settings paint was never read |
| cr-ref-header-7 | sgs/social-icons | presence |  | sgsHideOnDesktop | calibration has no presence reading for sgsHideOnDesktop (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-7 | sgs/social-icons | presence |  | sgsHideOnMobile | calibration has no presence reading for sgsHideOnMobile (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-7 | sgs/social-icons | presence |  | sgsHideOnTablet | calibration has no presence reading for sgsHideOnTablet (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-7 | sgs/social-icons | presence |  | childIconShapeSizeLinked | calibration has no presence reading for childIconShapeSizeLinked (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-7 | sgs/social-icons | presence | .sgs-icon:nth-of-type(1) > .sgs-icon__link > .sgs-icon__label-text | childIconShowLabel | no draftSlots finder names an element it shows or hides (".sgs-icon:nth-of-type(1) > .sgs-icon__link > .sgs-icon__label-text"), so the draft gave no evidence |
| cr-ref-header-7 | sgs/social-icons | presence |  | childIconShadowLiftOnHover | calibration has no presence reading for childIconShadowLiftOnHover (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-7 | sgs/social-icons | link |  | hiddenLinks | calibration has no link reading for hiddenLinks |
| cr-ref-header-7 | sgs/social-icons | structure |  | colourMode | calibration has no presence reading for its values (inherit, theme, brand, brand-glyph), so the draft cannot choose one |
| cr-ref-header-7 | sgs/social-icons | structure |  | childIconLabelPosition | calibration has no presence reading for its values (end, start, below, above), so the draft cannot choose one |
| cr-ref-header-12 | sgs/site-header-row | element | ::before | borderColourGradient | no draftSlots finder names "::before", so the draft element these settings paint was never read |
| cr-ref-header-12 | sgs/site-header-row | presence |  | sgsHideOnDesktop | calibration has no presence reading for sgsHideOnDesktop (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-12 | sgs/site-header-row | presence |  | sgsHideOnMobile | calibration has no presence reading for sgsHideOnMobile (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-12 | sgs/site-header-row | presence |  | sgsHideOnTablet | calibration has no presence reading for sgsHideOnTablet (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-12 | sgs/site-header-row | presence |  | rowAnimate | calibration has no presence reading for rowAnimate (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-12 | sgs/site-header-row | structure |  | layout | calibration has no presence reading for its values (flex, grid), so the draft cannot choose one |
| cr-ref-header-13 | sgs/responsive-logo | element | ::before | borderColourGradient, borderColourHoverGradient | no draftSlots finder names "::before", so the draft element these settings paint was never read |
| cr-ref-header-13 | sgs/responsive-logo | presence | .sgs-responsive-logo__picture | linkToHome | no draftSlots finder names an element it shows or hides (".sgs-responsive-logo__picture"), so the draft gave no evidence |
| cr-ref-header-13 | sgs/responsive-logo | presence |  | logoDecorative | calibration has no presence reading for logoDecorative (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-13 | sgs/responsive-logo | presence |  | sgsHideOnDesktop | calibration has no presence reading for sgsHideOnDesktop (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-13 | sgs/responsive-logo | presence |  | sgsHideOnMobile | calibration has no presence reading for sgsHideOnMobile (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-13 | sgs/responsive-logo | presence |  | sgsHideOnTablet | calibration has no presence reading for sgsHideOnTablet (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-13 | sgs/responsive-logo | presence |  | inlineSvg | calibration has no presence reading for inlineSvg (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-13 | sgs/responsive-logo | text |  | logoUrlTablet | calibration has no text reading for logoUrlTablet |
| cr-ref-header-13 | sgs/responsive-logo | text |  | logoUrlMobile | calibration has no text reading for logoUrlMobile |
| cr-ref-header-13 | sgs/responsive-logo | structure |  | logoSwitchMode | calibration has no presence reading for its values (mobile, tablet, custom), so the draft cannot choose one |
| cr-ref-header-14 | sgs/container | element | .sgs-container__inner | columns, gridTemplateColumns, justifyContent, flexDirection, flexWrap, contentWidth, padding, justifyItems | no draftSlots finder names ".sgs-container__inner", so the draft element these settings paint was never read |
| cr-ref-header-14 | sgs/container | element | .sgs-container__image-bg | backgroundImage, backgroundSize | no draftSlots finder names ".sgs-container__image-bg", so the draft element these settings paint was never read |
| cr-ref-header-14 | sgs/container | element | .sgs-container__overlay | backgroundOverlayColour, overlayGradient, backgroundOverlayOpacity | no draftSlots finder names ".sgs-container__overlay", so the draft element these settings paint was never read |
| cr-ref-header-14 | sgs/container | element | .sgs-container__svg-bg | bgSvgOpacity | no draftSlots finder names ".sgs-container__svg-bg", so the draft element these settings paint was never read |
| cr-ref-header-14 | sgs/container | element | ::before | borderColourGradient, borderColourHoverGradient | no draftSlots finder names "::before", so the draft element these settings paint was never read |
| cr-ref-header-14 | sgs/container | element | .sgs-container__inner > p:nth-of-type(2) | textIndent, gridItemBackgroundHoverGradient, gridItemTextColourHoverGradient | no draftSlots finder names ".sgs-container__inner > p:nth-of-type(2)", so the draft element these settings paint was never read |
| cr-ref-header-14 | sgs/container | element | .sgs-container__inner > p:nth-of-type(1) | gridItemPadding, gridItemBackground, gridItemBorderRadius, gridItemBorder, gridItemShadow, gridItemTextColour, gridItemBackgroundGradient, gridItemTextColourGradient | no draftSlots finder names ".sgs-container__inner > p:nth-of-type(1)", so the draft element these settings paint was never read |
| cr-ref-header-14 | sgs/container | element | .sgs-container__inner > p:nth-of-type(1)::before | gridItemBorderGradient | no draftSlots finder names ".sgs-container__inner > p:nth-of-type(1)::before", so the draft element these settings paint was never read |
| cr-ref-header-14 | sgs/container | presence |  | shadowLiftOnHover | calibration has no presence reading for shadowLiftOnHover (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-14 | sgs/container | presence |  | sgsHideOnDesktop | calibration has no presence reading for sgsHideOnDesktop (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-14 | sgs/container | presence |  | sgsHideOnMobile | calibration has no presence reading for sgsHideOnMobile (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-14 | sgs/container | presence |  | sgsHideOnTablet | calibration has no presence reading for sgsHideOnTablet (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-14 | sgs/container | structure |  | bgSvgPosition | calibration has no presence reading for its values (background, foreground), so the draft cannot choose one |
| cr-ref-header-15 | sgs/button | element | .sgs-button__icon | iconColour, iconColourHover, iconBackground, iconBackgroundHover | no draftSlots finder names ".sgs-button__icon", so the draft element these settings paint was never read |
| cr-ref-header-15 | sgs/button | element | .sgs-button__icon > svg | iconColourGradient, iconColourHoverGradient | no draftSlots finder names ".sgs-button__icon > svg", so the draft element these settings paint was never read |
| cr-ref-header-15 | sgs/button | element | ::before | borderColourGradient, borderColourHoverGradient | no draftSlots finder names "::before", so the draft element these settings paint was never read |
| cr-ref-header-15 | sgs/button | presence |  | download | calibration has no presence reading for download (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-15 | sgs/button | presence |  | isSubmit | calibration has no presence reading for isSubmit (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-15 | sgs/button | presence |  | shadowLiftOnHover | calibration has no presence reading for shadowLiftOnHover (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-15 | sgs/button | presence |  | sgsHideOnDesktop | calibration has no presence reading for sgsHideOnDesktop (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-15 | sgs/button | presence |  | sgsHideOnMobile | calibration has no presence reading for sgsHideOnMobile (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-15 | sgs/button | presence |  | sgsHideOnTablet | calibration has no presence reading for sgsHideOnTablet (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-15 | sgs/button | presence |  | labelFromSiteInfo | calibration has no presence reading for labelFromSiteInfo (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-15 | sgs/button | text |  | iconTitle | calibration has no text reading for iconTitle |
| cr-ref-header-15 | sgs/button | text |  | contentAlign | calibration has no text reading for contentAlign |
| cr-ref-header-16 | sgs/nav-bar-menu | element | ::after | navBg, navBgHover, navBgGradient | no draftSlots finder names "::after", so the draft element these settings paint was never read |
| cr-ref-header-16 | sgs/nav-bar-menu | element | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link::before | itemBg, itemBgGradient, itemBgCurrentGradient, itemBgHoverGradient | no draftSlots finder names ".sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link::before", so the draft element these settings paint was never read |
| cr-ref-header-16 | sgs/nav-bar-menu | element | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__link | itemColourHover, itemTextDecorationHover, itemTextTransformHover, itemFontWeightHover, itemBorderColourHover, submenuTextDecorationHover, itemOpacityHover, itemColourOpen | no draftSlots finder names ".sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__link", so the draft element these settings paint was  |
| cr-ref-header-16 | sgs/nav-bar-menu | element | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root::after | itemColourHoverGradient | no draftSlots finder names ".sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root::after", so the draft element these settings paint was never read |
| cr-ref-header-16 | sgs/nav-bar-menu | element | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__link::before | itemBgHover, itemBgOpen | no draftSlots finder names ".sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__link::before", so the draft element these settings pa |
| cr-ref-header-16 | sgs/nav-bar-menu | element | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-text | burgerFontSize, burgerFontFamily, burgerFontWeight, burgerTextTransform, burgerLetterSpacing, burgerFontStyle, burgerLineHeight | no draftSlots finder names ".sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-text", so the draft element these settings paint was never read |
| cr-ref-header-16 | sgs/nav-bar-menu | element | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__submenu-wrap > .sgs-nav-bar-menu__submenu | submenuBg, submenuBgGradient, submenuBorderWidth, submenuBorderStyle, submenuBorderRadius, submenuBorderColour | no draftSlots finder names ".sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__submenu-wrap > .sgs-nav-bar-menu__submenu", so the dr |
| cr-ref-header-16 | sgs/nav-bar-menu | element | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__submenu-wrap > .sgs-nav-bar-menu__submenu > .sgs-nav-bar-menu__subitem:nth-of-typ | submenuColour, submenuColourGradient, submenuColourHover, submenuLinkBg, submenuLinkBgHover, submenuLinkBgGradient, submenuFontFamily, submenuFontSize, submenuFontWeight, submenuFontStyle, submenuLine | no draftSlots finder names ".sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__submenu-wrap > .sgs-nav-bar-menu__submenu > .sgs-nav- |
| cr-ref-header-16 | sgs/nav-bar-menu | element | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link::before | itemBgCurrent | no draftSlots finder names ".sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link::before", so the draft element these settings paint was never read |
| cr-ref-header-16 | sgs/nav-bar-menu | element | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__submenu-wrap > .sgs-nav-bar-menu__submenu::before | submenuBorderColourGradient | no draftSlots finder names ".sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__submenu-wrap > .sgs-nav-bar-menu__submenu::before", s |
| cr-ref-header-16 | sgs/nav-bar-menu | element | @scrim::before | scrimOpacity | no draftSlots finder names "@scrim::before", so the draft element these settings paint was never read |
| cr-ref-header-16 | sgs/nav-bar-menu | element | @scrim | scrimBlur, scrimFadeDuration, scrimFadeEasing | no draftSlots finder names "@scrim", so the draft element these settings paint was never read |
| cr-ref-header-16 | sgs/nav-bar-menu | element | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(4) > .sgs-nav-bar-menu__link > .sgs-nav-bar-menu__badge | itemBadgeColour, itemBadgeTextColour, itemBadgeFontSize, itemBadgeFontWeight, itemBadgeLetterSpacing, itemBadgeTextTransform, itemBadgePadding, itemBadgeBorderRadius, itemBadgeGap | no draftSlots finder names ".sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(4) > .sgs-nav-bar-menu__link > .sgs-nav-bar-menu__badge", so the draft element these settings paint was never r |
| cr-ref-header-16 | sgs/nav-bar-menu | element | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-text > .sgs-roll | labelRoll | no draftSlots finder names ".sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-text > .sgs-roll", so the draft element these settings paint was never read |
| cr-ref-header-16 | sgs/nav-bar-menu | element | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon | burgerIconHeight | no draftSlots finder names ".sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon", so the draft element these settings paint was never read |
| cr-ref-header-16 | sgs/nav-bar-menu | element | .sgs-nav-bar-menu__bar | flexWrap | no draftSlots finder names ".sgs-nav-bar-menu__bar", so the draft element these settings paint was never read |
| cr-ref-header-16 | sgs/nav-bar-menu | element | @companion | triggerDetachSize, triggerDetachOffset | no draftSlots finder names "@companion", so the draft element these settings paint was never read |
| cr-ref-header-16 | sgs/nav-bar-menu | element | @companion > .sgs-nav-bar-menu__detach-wrap > .sgs-nav-bar-menu__burger | triggerDetachRadius, triggerDetachBackground, triggerDetachBackgroundHover | no draftSlots finder names "@companion > .sgs-nav-bar-menu__detach-wrap > .sgs-nav-bar-menu__burger", so the draft element these settings paint was never read |
| cr-ref-header-16 | sgs/nav-bar-menu | presence |  | itemMagnetEnabled | calibration has no presence reading for itemMagnetEnabled (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-16 | sgs/nav-bar-menu | presence |  | submenuCaret | calibration has no presence reading for submenuCaret (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-16 | sgs/nav-bar-menu | presence |  | itemSmartContrast | calibration has no presence reading for itemSmartContrast (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-16 | sgs/nav-bar-menu | presence |  | triggerMagnetEnabled | calibration has no presence reading for triggerMagnetEnabled (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-16 | sgs/nav-bar-menu | presence |  | sgsHideOnDesktop | calibration has no presence reading for sgsHideOnDesktop (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-16 | sgs/nav-bar-menu | presence |  | sgsHideOnTablet | calibration has no presence reading for sgsHideOnTablet (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-16 | sgs/nav-bar-menu | text |  | triggerHoverLabel | calibration has no text reading for triggerHoverLabel |
| cr-ref-header-16 | sgs/nav-bar-menu | text |  | triggerOpenLabel | calibration has no text reading for triggerOpenLabel |
| cr-ref-header-16 | sgs/nav-bar-menu | structure |  | itemWritingMode | calibration has no presence reading for its values (horizontal-tb, vertical-rl, vertical-lr), so the draft cannot choose one |
| cr-ref-header-16 | sgs/nav-bar-menu | structure |  | triggerIconPosition | calibration has no presence reading for its values (before, after), so the draft cannot choose one |
| cr-ref-header-17 | sgs/button | element | .sgs-button__icon | iconColour, iconColourHover, iconBackground, iconBackgroundHover | no draftSlots finder names ".sgs-button__icon", so the draft element these settings paint was never read |
| cr-ref-header-17 | sgs/button | element | .sgs-button__icon > svg | iconColourGradient, iconColourHoverGradient | no draftSlots finder names ".sgs-button__icon > svg", so the draft element these settings paint was never read |
| cr-ref-header-17 | sgs/button | element | ::before | borderColourGradient, borderColourHoverGradient | no draftSlots finder names "::before", so the draft element these settings paint was never read |
| cr-ref-header-17 | sgs/button | presence |  | download | calibration has no presence reading for download (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-17 | sgs/button | presence |  | isSubmit | calibration has no presence reading for isSubmit (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-17 | sgs/button | presence |  | shadowLiftOnHover | calibration has no presence reading for shadowLiftOnHover (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-17 | sgs/button | presence |  | sgsHideOnDesktop | calibration has no presence reading for sgsHideOnDesktop (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-17 | sgs/button | presence |  | sgsHideOnMobile | calibration has no presence reading for sgsHideOnMobile (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-17 | sgs/button | presence |  | sgsHideOnTablet | calibration has no presence reading for sgsHideOnTablet (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-17 | sgs/button | presence |  | labelFromSiteInfo | calibration has no presence reading for labelFromSiteInfo (recalibrate, or give it a precondition in calibration-fixtures.json) |
| cr-ref-header-17 | sgs/button | text |  | iconTitle | calibration has no text reading for iconTitle |
| cr-ref-header-17 | sgs/button | text |  | contentAlign | calibration has no text reading for contentAlign |

## Confirm records: the render overrides the code, or the code never paints

Every written value keeps a confirm record in fill-report.json (`confirm`). These are the ones whose declared value and rendered draft value disagree: `render-wins` writes the rendered value; `draft-defect` is a declaration intake lists as never painting (FR-48-34), for Bean. The check fills in the rendered-live value.

None.

## Handover

| Owner | Kind | Node | Element | Evidence | Reason |
|---|---|---|---|---|---|
| site-info | link | cr-ref-header-8 |  | {"key":"linkUrl","draft":"/","width":1440,"siteInfoKey":"socials.linkedin","kind":"link","ref":"cr-ref-header-8","path":""} | linkUrl is bound to Site Info "socials.linkedin"; the draft links to /, kept as the fallback. Fill Site Info "socials.linkedin" from it |
| site-info | link | cr-ref-header-9 |  | {"key":"linkUrl","draft":"/","width":1440,"siteInfoKey":"socials.facebook","kind":"link","ref":"cr-ref-header-9","path":""} | linkUrl is bound to Site Info "socials.facebook"; the draft links to /, kept as the fallback. Fill Site Info "socials.facebook" from it |
| site-info | link | cr-ref-header-10 |  | {"key":"linkUrl","draft":"/","width":1440,"siteInfoKey":"socials.google","kind":"link","ref":"cr-ref-header-10","path":""} | linkUrl is bound to Site Info "socials.google"; the draft links to /, kept as the fallback. Fill Site Info "socials.google" from it |
| site-info | link | cr-ref-header-11 |  | {"key":"linkUrl","draft":"/","width":1440,"siteInfoKey":"socials.instagram","kind":"link","ref":"cr-ref-header-11","path":""} | linkUrl is bound to Site Info "socials.instagram"; the draft links to /, kept as the fallback. Fill Site Info "socials.instagram" from it |
| site-info | presence | cr-ref-header-13 |  | {"key":"presence","draft":"shown","width":1440,"kind":"presence","ref":"cr-ref-header-13","path":""} | the logo image: a logo block's image setting paints a measured size, so a skeleton cannot hold it; choose the site logo in the editor |

## Settings written

| Node | Block | Element | Property | Setting | Before | After | Tiers | How |
|---|---|---|---|---|---|---|---|---|
| cr-ref-header-0 | sgs/site-header |  | color | textColour |  | custom-ink | 1440 | single |
| cr-ref-header-0 | sgs/site-header |  | min-height | minHeight |  | {"desktop":"0px"} | 1440 | tiers |
| cr-ref-header-0 | sgs/site-header |  | max-width | maxWidth |  | {"desktop":"none"} | 1440 | tiers |
| cr-ref-header-1 | sgs/site-header-row |  | color | textColour |  | surface | 1440 | single |
| cr-ref-header-1 | sgs/site-header-row |  | background-color | backgroundColour |  | primary | 1440 | single |
| cr-ref-header-1 | sgs/site-header-row | .sgs-container__inner | column-gap | gap |  | {"tablet":"12px","desktop":"12px"} | 768,1440 | tiers |
| cr-ref-header-1 | sgs/site-header-row | .sgs-container__inner | padding-right | padding |  | {"mobile":{"right":"20px"},"tablet":{"right":"32px"},"desktop":{"right":"40px"}} | 375,768,1440 | tiers |
| cr-ref-header-1 | sgs/site-header-row | .sgs-container__inner | padding-left | padding | {"mobile":{"right":"20px"},"tablet":{"right":"32px"},"desktop":{"right":"40px"}} | {"mobile":{"right":"20px","left":"20px"},"tablet":{"right":"32px","left":"32px"},"desktop":{"right":"40px","left":"40px"}} | 375,768,1440 | tiers |
| cr-ref-header-1 | sgs/site-header-row | .sgs-container__inner | justify-content | justifyContent |  | space-between | 1440 | single |
| cr-ref-header-1 | sgs/site-header-row | .sgs-container__inner | max-width | contentWidth |  | {"desktop":"1320px"} | 1440 | tiers |
| cr-ref-header-2 | sgs/multi-button |  | column-gap | gap |  | {"mobile":"10px","desktop":"10px"} | 375,1440 | tiers |
| cr-ref-header-3 | sgs/button |  | font-weight | fontWeight |  | 700 | 375 | single |
| cr-ref-header-3 | sgs/button |  | line-height | lineHeight |  | {"mobile":1.55} | 375 | tiers |
| cr-ref-header-3 | sgs/button |  | color | colourText |  | primary | 375 | single |
| cr-ref-header-3 | sgs/button |  | background-color | colourBackground |  | surface | 375 | single |
| cr-ref-header-3 | sgs/button |  | border-top-style | borderStyle |  | none | 375 | single |
| cr-ref-header-3 | sgs/button |  | box-shadow | boxShadow |  | rgba(0, 0, 0, 0.15) 0px 2px 6px 0px | 375 | single |
| cr-ref-header-3 | sgs/button |  | padding-top | padding |  | {"mobile":{"top":"6px"}} | 375 | tiers |
| cr-ref-header-3 | sgs/button |  | padding-right | padding | {"mobile":{"top":"6px"}} | {"mobile":{"top":"6px","right":"14px"}} | 375 | tiers |
| cr-ref-header-3 | sgs/button |  | padding-bottom | padding | {"mobile":{"top":"6px","right":"14px"}} | {"mobile":{"top":"6px","right":"14px","bottom":"6px"}} | 375 | tiers |
| cr-ref-header-3 | sgs/button |  | padding-left | padding | {"mobile":{"top":"6px","right":"14px","bottom":"6px"}} | {"mobile":{"top":"6px","right":"14px","bottom":"6px","left":"14px"}} | 375 | tiers |
| cr-ref-header-3 | sgs/button |  | text-wrap | textWrap |  | nowrap | 375 | single |
| cr-ref-header-4 | sgs/button |  | (content) | url |  | tel:01217714330 |  | content |
| cr-ref-header-4 | sgs/button |  | (content) | iconSvg |  | <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5 3h2.6l1.3 3.6-1.8 1.2a9 9 0 0 0 5 5l1.2-1.8 3.7 1.3V15a2 2 0 0 1-2 2A13.5 13.5 0 0 1 3 5a2 2 0 0 1 2-2z" stroke="currentColor" s |  | content |
| cr-ref-header-4 | sgs/button |  | (content) | iconPosition |  | before |  | content |
| cr-ref-header-4 | sgs/button |  | font-weight | fontWeight |  | 700 | 1440 | single |
| cr-ref-header-4 | sgs/button |  | line-height | lineHeight |  | {"desktop":1.55} | 1440 | tiers |
| cr-ref-header-4 | sgs/button |  | color | colourText |  | primary | 1440 | single |
| cr-ref-header-4 | sgs/button |  | background-color | colourBackground |  | surface | 1440 | single |
| cr-ref-header-4 | sgs/button |  | border-top-style | borderStyle |  | none | 1440 | single |
| cr-ref-header-4 | sgs/button |  | box-shadow | boxShadow |  | rgba(0, 0, 0, 0.15) 0px 2px 6px 0px | 1440 | single |
| cr-ref-header-4 | sgs/button |  | padding-top | padding |  | {"desktop":{"top":"6px"}} | 1440 | tiers |
| cr-ref-header-4 | sgs/button |  | padding-right | padding | {"desktop":{"top":"6px"}} | {"desktop":{"top":"6px","right":"14px"}} | 1440 | tiers |
| cr-ref-header-4 | sgs/button |  | padding-bottom | padding | {"desktop":{"top":"6px","right":"14px"}} | {"desktop":{"top":"6px","right":"14px","bottom":"6px"}} | 1440 | tiers |
| cr-ref-header-4 | sgs/button |  | padding-left | padding | {"desktop":{"top":"6px","right":"14px","bottom":"6px"}} | {"desktop":{"top":"6px","right":"14px","bottom":"6px","left":"14px"}} | 1440 | tiers |
| cr-ref-header-4 | sgs/button |  | column-gap | iconGap |  | {"desktop":"7px"} | 1440 | tiers |
| cr-ref-header-4 | sgs/button |  | text-wrap | textWrap |  | nowrap | 1440 | single |
| cr-ref-header-5 | sgs/button |  | (content) | url |  | tel:01217714330 |  | content |
| cr-ref-header-5 | sgs/button |  | (content) | iconSvg |  | <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5 3h2.6l1.3 3.6-1.8 1.2a9 9 0 0 0 5 5l1.2-1.8 3.7 1.3V15a2 2 0 0 1-2 2A13.5 13.5 0 0 1 3 5a2 2 0 0 1 2-2z" stroke="currentColor" s |  | content |
| cr-ref-header-5 | sgs/button |  | (content) | iconPosition |  | before |  | content |
| cr-ref-header-5 | sgs/button |  | font-weight | fontWeight |  | 700 | 375 | single |
| cr-ref-header-5 | sgs/button |  | line-height | lineHeight |  | {"mobile":1.55} | 375 | tiers |
| cr-ref-header-5 | sgs/button |  | color | colourText |  | primary | 375 | single |
| cr-ref-header-5 | sgs/button |  | background-color | colourBackground |  | surface | 375 | single |
| cr-ref-header-5 | sgs/button |  | border-top-style | borderStyle |  | none | 375 | single |
| cr-ref-header-5 | sgs/button |  | box-shadow | boxShadow |  | rgba(0, 0, 0, 0.15) 0px 2px 6px 0px | 375 | single |
| cr-ref-header-5 | sgs/button |  | padding-top | padding |  | {"mobile":{"top":"6px"}} | 375 | tiers |
| cr-ref-header-5 | sgs/button |  | padding-right | padding | {"mobile":{"top":"6px"}} | {"mobile":{"top":"6px","right":"14px"}} | 375 | tiers |
| cr-ref-header-5 | sgs/button |  | padding-bottom | padding | {"mobile":{"top":"6px","right":"14px"}} | {"mobile":{"top":"6px","right":"14px","bottom":"6px"}} | 375 | tiers |
| cr-ref-header-5 | sgs/button |  | padding-left | padding | {"mobile":{"top":"6px","right":"14px","bottom":"6px"}} | {"mobile":{"top":"6px","right":"14px","bottom":"6px","left":"14px"}} | 375 | tiers |
| cr-ref-header-5 | sgs/button |  | column-gap | iconGap |  | {"mobile":"7px"} | 375 | tiers |
| cr-ref-header-5 | sgs/button |  | text-wrap | textWrap |  | nowrap | 375 | single |
| cr-ref-header-6 | sgs/button |  | (content) | iconSvg |  | <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect x="2.5" y="4" width="15" height="12" rx="2" stroke="currentColor" stroke-width="1.7px" stroke-linecap="round" stroke-linejoin="round"  |  | content |
| cr-ref-header-6 | sgs/button |  | (content) | iconPosition |  | before |  | content |
| cr-ref-header-6 | sgs/button |  | font-weight | fontWeight |  | 700 | 1440 | single |
| cr-ref-header-6 | sgs/button |  | line-height | lineHeight |  | {"desktop":1.55} | 1440 | tiers |
| cr-ref-header-6 | sgs/button |  | color | colourText |  | primary | 1440 | single |
| cr-ref-header-6 | sgs/button |  | background-color | colourBackground |  | surface | 1440 | single |
| cr-ref-header-6 | sgs/button |  | border-top-style | borderStyle |  | none | 1440 | single |
| cr-ref-header-6 | sgs/button |  | box-shadow | boxShadow |  | rgba(0, 0, 0, 0.15) 0px 2px 6px 0px | 1440 | single |
| cr-ref-header-6 | sgs/button |  | padding-top | padding |  | {"desktop":{"top":"6px"}} | 1440 | tiers |
| cr-ref-header-6 | sgs/button |  | padding-right | padding | {"desktop":{"top":"6px"}} | {"desktop":{"top":"6px","right":"14px"}} | 1440 | tiers |
| cr-ref-header-6 | sgs/button |  | padding-bottom | padding | {"desktop":{"top":"6px","right":"14px"}} | {"desktop":{"top":"6px","right":"14px","bottom":"6px"}} | 1440 | tiers |
| cr-ref-header-6 | sgs/button |  | padding-left | padding | {"desktop":{"top":"6px","right":"14px","bottom":"6px"}} | {"desktop":{"top":"6px","right":"14px","bottom":"6px","left":"14px"}} | 1440 | tiers |
| cr-ref-header-6 | sgs/button |  | column-gap | iconGap |  | {"desktop":"7px"} | 1440 | tiers |
| cr-ref-header-6 | sgs/button |  | text-wrap | textWrap |  | nowrap | 1440 | single |
| cr-ref-header-7 | sgs/social-icons |  | column-gap | gap |  | {"desktop":"10px"} | 1440 | tiers |
| cr-ref-header-7 | sgs/social-icons |  | flex-wrap | flexWrap |  | nowrap | 1440 | single |
| cr-ref-header-7 | sgs/social-icons |  | border-radius | childIconShape |  | circle |  | row-lift |
| cr-ref-header-7 | sgs/social-icons |  | width | childIconShapeSize |  | {"desktop":{"width":"34px"}} |  | row-lift |
| cr-ref-header-7 | sgs/social-icons |  | (switch) | childIconShowBackground |  | true |  | row-lift |
| cr-ref-header-8 | sgs/icon |  | color | iconColour |  | surface | 768,1440 | row-child |
| cr-ref-header-8 | sgs/icon |  | background-color | backgroundColour |  | #0A66C2 | 768,1440 | row-child |
| cr-ref-header-8 | sgs/icon | .sgs-icon__shape > .sgs-icon__svg | display | iconSource | brand | emoji | 768,1440 | row-child (superseded by write 90) |
| cr-ref-header-8 | sgs/icon | .sgs-icon__shape > .sgs-icon__svg | width | iconSize |  | {"desktop":"17px"} | 768,1440 | row-child |
| cr-ref-header-9 | sgs/icon |  | color | iconColour |  | surface | 768,1440 | row-child |
| cr-ref-header-9 | sgs/icon |  | background-color | backgroundColour |  | #1877F2 | 768,1440 | row-child |
| cr-ref-header-9 | sgs/icon | .sgs-icon__shape > .sgs-icon__svg | display | iconSource | brand | emoji | 768,1440 | row-child (superseded by write 95) |
| cr-ref-header-9 | sgs/icon | .sgs-icon__shape > .sgs-icon__svg | width | iconSize |  | {"desktop":"17px"} | 768,1440 | row-child |
| cr-ref-header-10 | sgs/icon |  | color | iconColour |  | surface | 768,1440 | row-child |
| cr-ref-header-10 | sgs/icon |  | background-color | backgroundColour |  | surface | 768,1440 | row-child |
| cr-ref-header-10 | sgs/icon |  | box-shadow | boxShadow |  | rgba(0, 0, 0, 0.18) 0px 2px 6px 0px | 768,1440 | row-child |
| cr-ref-header-10 | sgs/icon | .sgs-icon__shape > .sgs-icon__svg | display | iconSource | brand | emoji | 768,1440 | row-child (superseded by write 100) |
| cr-ref-header-10 | sgs/icon | .sgs-icon__shape > .sgs-icon__svg | width | iconSize |  | {"desktop":"15px"} | 768,1440 | row-child |
| cr-ref-header-11 | sgs/icon |  | color | iconColour |  | surface | 768,1440 | row-child |
| cr-ref-header-11 | sgs/icon |  | background-image | backgroundColourGradient |  | radial-gradient(circle at 30% 107%, rgb(253, 244, 151) 0%, rgb(253, 89, 73) 45%, rgb(214, 36, 159) 60%, rgb(40, 90, 235) 90%) | 768,1440 | row-child |
| cr-ref-header-11 | sgs/icon | .sgs-icon__shape > .sgs-icon__svg | display | iconSource | brand | emoji | 768,1440 | row-child (superseded by write 105) |
| cr-ref-header-11 | sgs/icon | .sgs-icon__shape > .sgs-icon__svg | width | iconSize |  | {"desktop":"17px"} | 768,1440 | row-child |
| cr-ref-header-8 | sgs/icon |  | (content) | linkUrl |  | / |  | content |
| cr-ref-header-8 | sgs/icon |  | (content) | ariaLabel |  | LinkedIn |  | content |
| cr-ref-header-8 | sgs/icon |  | (content) | iconSource | emoji | custom |  | content |
| cr-ref-header-8 | sgs/icon |  | (content) | iconSvg |  | <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true"><path d="M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4 |  | content |
| cr-ref-header-8 | sgs/icon |  | (content) | iconFill |  | true |  | content |
| cr-ref-header-9 | sgs/icon |  | (content) | linkUrl |  | / |  | content |
| cr-ref-header-9 | sgs/icon |  | (content) | ariaLabel |  | Facebook |  | content |
| cr-ref-header-9 | sgs/icon |  | (content) | iconSource | emoji | custom |  | content |
| cr-ref-header-9 | sgs/icon |  | (content) | iconSvg |  | <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true"><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.25-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 |  | content |
| cr-ref-header-9 | sgs/icon |  | (content) | iconFill |  | true |  | content |
| cr-ref-header-10 | sgs/icon |  | (content) | linkUrl |  | / |  | content |
| cr-ref-header-10 | sgs/icon |  | (content) | ariaLabel |  | Google |  | content |
| cr-ref-header-10 | sgs/icon |  | (content) | iconSource | emoji | custom |  | content |
| cr-ref-header-10 | sgs/icon |  | (content) | iconSvg |  | <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true"><path fill="rgb(234, 67, 53)" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.5 |  | content |
| cr-ref-header-10 | sgs/icon |  | (content) | iconFill |  | true |  | content |
| cr-ref-header-11 | sgs/icon |  | (content) | linkUrl |  | / |  | content |
| cr-ref-header-11 | sgs/icon |  | (content) | ariaLabel |  | Instagram |  | content |
| cr-ref-header-11 | sgs/icon |  | (content) | iconSource | emoji | custom |  | content |
| cr-ref-header-11 | sgs/icon |  | (content) | iconSvg |  | <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3  |  | content |
| cr-ref-header-11 | sgs/icon |  | (content) | iconFill |  | true |  | content |
| cr-ref-header-12 | sgs/site-header-row |  | background-color | backgroundColour |  | surface | 1440 | single |
| cr-ref-header-12 | sgs/site-header-row |  | border-bottom-width | borderWidth |  | {"top":"0px","right":"0px","left":"0px","bottom":"3px"} | 1440 | single |
| cr-ref-header-12 | sgs/site-header-row |  | border-bottom-color | borderColour |  | accent | 1440 | single |
| cr-ref-header-12 | sgs/site-header-row | .sgs-container__inner | column-gap | gap |  | {"mobile":"20px","tablet":"20px","desktop":"20px"} | 375,768,1440 | tiers |
| cr-ref-header-12 | sgs/site-header-row | .sgs-container__inner | justify-content | justifyContent |  | space-between | 1440 | single |
| cr-ref-header-12 | sgs/site-header-row | .sgs-container__inner | padding-right | padding |  | {"mobile":{"right":"20px"},"tablet":{"right":"32px"},"desktop":{"right":"40px"}} | 375,768,1440 | tiers |
| cr-ref-header-12 | sgs/site-header-row | .sgs-container__inner | padding-left | padding | {"mobile":{"right":"20px"},"tablet":{"right":"32px"},"desktop":{"right":"40px"}} | {"mobile":{"right":"20px","left":"20px"},"tablet":{"right":"32px","left":"32px"},"desktop":{"right":"40px","left":"40px"}} | 375,768,1440 | tiers |
| cr-ref-header-12 | sgs/site-header-row | .sgs-container__inner | max-width | contentWidth |  | {"desktop":"1320px"} | 1440 | tiers |
| cr-ref-header-13 | sgs/responsive-logo |  | (content) | alt |  | Indus Foods Ltd |  | content |
| cr-ref-header-13 | sgs/responsive-logo | .sgs-responsive-logo__link > .sgs-responsive-logo__picture > .sgs-responsive-logo__image | height | maxHeight |  | {"mobile":54,"tablet":56,"desktop":63.359} | 375,768,1440 | equivalent:self |
| cr-ref-header-14 | sgs/container |  | column-gap | gap |  | {"tablet":"10px"} | 768 | tiers |
| cr-ref-header-14 | sgs/container | .sgs-container__inner | align-items | alignItems |  | center | 768 | single |
| cr-ref-header-15 | sgs/button |  | font-size | fontSize |  | {"tablet":17} | 768 | tiers |
| cr-ref-header-15 | sgs/button |  | line-height | lineHeight |  | {"tablet":1.55} | 768 | tiers |
| cr-ref-header-15 | sgs/button |  | border-top-width | borderWidth |  | {"right":"0px","bottom":"0px","left":"0px","top":"2px"} | 768 | single |
| cr-ref-header-15 | sgs/button |  | border-top-color | borderColour |  | primary | 768 | single |
| cr-ref-header-15 | sgs/button |  | border-bottom-width | borderWidth | {"right":"0px","bottom":"0px","left":"0px","top":"2px"} | {"right":"0px","bottom":"2px","left":"0px","top":"2px"} | 768 | single |
| cr-ref-header-15 | sgs/button |  | border-left-width | borderWidth | {"right":"0px","bottom":"2px","left":"0px","top":"2px"} | {"right":"0px","bottom":"2px","left":"2px","top":"2px"} | 768 | single |
| cr-ref-header-15 | sgs/button |  | border-right-width | borderWidth | {"right":"0px","bottom":"2px","left":"2px","top":"2px"} | {"right":"2px","bottom":"2px","left":"2px","top":"2px"} | 768 | single |
| cr-ref-header-15 | sgs/button |  | box-shadow | boxShadow |  | rgba(10, 126, 168, 0.65) 0px 8px 18px -8px | 768 | single |
| cr-ref-header-15 | sgs/button |  | padding-top | padding |  | {"tablet":{"top":"10px"}} | 768 | tiers |
| cr-ref-header-15 | sgs/button |  | padding-bottom | padding | {"tablet":{"top":"10px"}} | {"tablet":{"top":"10px","bottom":"10px"}} | 768 | tiers |
| cr-ref-header-15 | sgs/button |  | text-wrap | textWrap |  | nowrap | 768 | single |
| cr-ref-header-16 | sgs/nav-bar-menu |  | color | navColour |  | primary | 1440 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar | column-gap | gap |  | {"desktop":"2px"} | 1440 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | font-size | itemFontSize |  | {"desktop":17} | 1440 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | font-size | itemFontSizeUnit |  | px | 1440 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | font-weight | itemFontWeight |  | 600 | 1440 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | line-height | itemLineHeight |  | 1.412 | 1440 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | letter-spacing | itemLetterSpacing |  | {"desktop":-0.01} | 1440 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | text-align | itemTextAlign |  | center | 1440 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | color | itemColour |  | custom-ink | 1440 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | border-radius | itemBorderRadius |  | {"topLeft":"11px","topRight":"11px","bottomRight":"11px","bottomLeft":"11px"} | 1440 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | padding-top | itemPadding |  | {"desktop":{"top":"0px"}} | 1440 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | padding-right | itemPadding | {"desktop":{"top":"0px"}} | {"desktop":{"top":"0px","right":"15px"}} | 1440 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | padding-bottom | itemPadding | {"desktop":{"top":"0px","right":"15px"}} | {"desktop":{"top":"0px","right":"15px","bottom":"0px"}} | 1440 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | padding-left | itemPadding | {"desktop":{"top":"0px","right":"15px","bottom":"0px"}} | {"desktop":{"top":"0px","right":"15px","bottom":"0px","left":"15px"}} | 1440 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | column-gap | submenuCaretGap |  | 6px | 1440 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | min-height | itemMinHeight |  | {"desktop":"auto"} | 1440 | tiers (superseded by write 149) |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | transition-duration | itemMotionDuration |  | 220 | 1440 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | text-wrap | itemTextWrap |  | wrap | 1440 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | height | itemMinHeight | {"desktop":"auto"} | {"desktop":"42px"} | 1440 | equivalent:self (superseded by write 154) |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | padding-top | itemPadding | {"desktop":{"top":"0px","right":"15px","bottom":"0px","left":"15px"}} | {"desktop":{"top":"0px","right":"15px","bottom":"0px","left":"15px"}} | 1440 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | padding-right | itemPadding | {"desktop":{"top":"0px","right":"15px","bottom":"0px","left":"15px"}} | {"desktop":{"top":"0px","right":"15px","bottom":"0px","left":"15px"}} | 1440 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | padding-bottom | itemPadding | {"desktop":{"top":"0px","right":"15px","bottom":"0px","left":"15px"}} | {"desktop":{"top":"0px","right":"15px","bottom":"0px","left":"15px"}} | 1440 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | padding-left | itemPadding | {"desktop":{"top":"0px","right":"15px","bottom":"0px","left":"15px"}} | {"desktop":{"top":"0px","right":"15px","bottom":"0px","left":"15px"}} | 1440 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | min-height | itemMinHeight | {"desktop":"42px"} | {"desktop":"auto"} | 1440 | tiers (superseded by write 155) |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | height | itemMinHeight | {"desktop":"auto"} | {"desktop":"42px"} | 1440 | equivalent:self |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret | transition-duration | submenuCaretTurnDuration |  | 300 | 1440 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret | transition-timing-function | submenuCaretTurnEasingCustom |  | cubic-bezier(0.16, 0.84, 0.32, 1) | 1440 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret | width | submenuCaretSize |  | 11px | 1440 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | color | burgerColour |  | primary | 768 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | background-color | burgerBg |  | surface | 768 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | border-top-width | burgerBorderWidth |  | {"right":"0px","bottom":"0px","left":"0px","top":"2px"} | 768 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | border-top-style | burgerBorderStyle |  | solid | 768 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | border-top-color | burgerBorderColour |  | primary | 768 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | border-bottom-width | burgerBorderWidth | {"right":"0px","bottom":"0px","left":"0px","top":"2px"} | {"right":"0px","bottom":"2px","left":"0px","top":"2px"} | 768 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | border-left-width | burgerBorderWidth | {"right":"0px","bottom":"2px","left":"0px","top":"2px"} | {"right":"0px","bottom":"2px","left":"2px","top":"2px"} | 768 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | border-right-width | burgerBorderWidth | {"right":"0px","bottom":"2px","left":"2px","top":"2px"} | {"right":"2px","bottom":"2px","left":"2px","top":"2px"} | 768 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | padding-right | burgerPadding |  | {"tablet":{"right":"13px"}} | 768 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | padding-left | burgerPadding | {"tablet":{"right":"13px"}} | {"tablet":{"right":"13px","left":"13px"}} | 768 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | column-gap | burgerTextGap |  | {"tablet":"4px"} | 768 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon | align-items | burgerBarAlign |  | end | 768 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | width | burgerWidth |  | {"mobile":"48px","tablet":"48px"} | 375,768 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | height | burgerSize |  | 48px | 768 | single |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(1) | border-radius | burgerBar1BorderRadius |  | {"tablet":"2px"} | 768 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(1) | width | burgerIconWidth |  | {"mobile":"18px","tablet":"18px"} | 375,768 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(2) | border-radius | burgerBar2BorderRadius |  | {"tablet":"2px"} | 768 | tiers |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(3) | border-radius | burgerBar3BorderRadius |  | {"tablet":"2px"} | 768 | tiers |
| cr-ref-header-17 | sgs/button |  | font-size | fontSize |  | {"desktop":17} | 1440 | tiers |
| cr-ref-header-17 | sgs/button |  | line-height | lineHeight |  | {"desktop":1.55} | 1440 | tiers |
| cr-ref-header-17 | sgs/button |  | border-top-width | borderWidth |  | {"right":"0px","bottom":"0px","left":"0px","top":"2px"} | 1440 | single |
| cr-ref-header-17 | sgs/button |  | border-top-color | borderColour |  | primary | 1440 | single |
| cr-ref-header-17 | sgs/button |  | border-bottom-width | borderWidth | {"right":"0px","bottom":"0px","left":"0px","top":"2px"} | {"right":"0px","bottom":"2px","left":"0px","top":"2px"} | 1440 | single |
| cr-ref-header-17 | sgs/button |  | border-left-width | borderWidth | {"right":"0px","bottom":"2px","left":"0px","top":"2px"} | {"right":"0px","bottom":"2px","left":"2px","top":"2px"} | 1440 | single |
| cr-ref-header-17 | sgs/button |  | border-right-width | borderWidth | {"right":"0px","bottom":"2px","left":"2px","top":"2px"} | {"right":"2px","bottom":"2px","left":"2px","top":"2px"} | 1440 | single |
| cr-ref-header-17 | sgs/button |  | box-shadow | boxShadow |  | rgba(10, 126, 168, 0.65) 0px 8px 18px -8px | 1440 | single |
| cr-ref-header-17 | sgs/button |  | padding-right | padding |  | {"desktop":{"right":"22px"}} | 1440 | tiers |
| cr-ref-header-17 | sgs/button |  | padding-left | padding | {"desktop":{"right":"22px"}} | {"desktop":{"right":"22px","left":"22px"}} | 1440 | tiers |
| cr-ref-header-17 | sgs/button |  | text-wrap | textWrap |  | nowrap | 1440 | single |
| cr-ref-header-1 | sgs/site-header-row |  | color | textColourHover |  | surface | 1440 | fill-state-hold |
| cr-ref-header-1 | sgs/site-header-row |  | background-color | backgroundColourHover |  | primary | 1440 | fill-state-hold |
| cr-ref-header-3 | sgs/button |  | background-color | colourBackgroundHover |  | accent | 375 | fill-state |
| cr-ref-header-3 | sgs/button |  | box-shadow | boxShadowHover |  | rgba(0, 0, 0, 0.2) 0px 6px 20px 0px | 375 | fill-state |
| cr-ref-header-3 | sgs/button |  | color | colourTextHover |  | accent-text | 375 | fill-state |
| cr-ref-header-4 | sgs/button |  | background-color | colourBackgroundHover |  | accent | 1440 | fill-state |
| cr-ref-header-4 | sgs/button |  | box-shadow | boxShadowHover |  | rgba(0, 0, 0, 0.2) 0px 6px 20px 0px | 1440 | fill-state |
| cr-ref-header-4 | sgs/button |  | color | colourTextHover |  | accent-text | 1440 | fill-state |
| cr-ref-header-5 | sgs/button |  | background-color | colourBackgroundHover |  | accent | 1440 | fill-state |
| cr-ref-header-5 | sgs/button |  | box-shadow | boxShadowHover |  | rgba(0, 0, 0, 0.2) 0px 6px 20px 0px | 1440 | fill-state |
| cr-ref-header-5 | sgs/button |  | color | colourTextHover |  | accent-text | 1440 | fill-state |
| cr-ref-header-6 | sgs/button |  | background-color | colourBackgroundHover |  | accent | 1440 | fill-state |
| cr-ref-header-6 | sgs/button |  | box-shadow | boxShadowHover |  | rgba(0, 0, 0, 0.2) 0px 6px 20px 0px | 1440 | fill-state |
| cr-ref-header-6 | sgs/button |  | color | colourTextHover |  | accent-text | 1440 | fill-state |
| cr-ref-header-8 | sgs/icon |  | color | iconColourHover |  | surface | 1440 | fill-state-hold |
| cr-ref-header-8 | sgs/icon |  | background-color | backgroundColourHover |  | #0A66C2 | 1440 | fill-state-hold |
| cr-ref-header-9 | sgs/icon |  | color | iconColourHover |  | surface | 1440 | fill-state-hold |
| cr-ref-header-9 | sgs/icon |  | background-color | backgroundColourHover |  | #1877F2 | 1440 | fill-state-hold |
| cr-ref-header-10 | sgs/icon |  | color | iconColourHover |  | surface | 1440 | fill-state-hold |
| cr-ref-header-10 | sgs/icon |  | background-color | backgroundColourHover |  | surface | 1440 | fill-state-hold |
| cr-ref-header-11 | sgs/icon |  | color | iconColourHover |  | surface | 1440 | fill-state-hold |
| cr-ref-header-12 | sgs/site-header-row |  | color | textColourHover |  | custom-ink | 1440 | fill-state-hold |
| cr-ref-header-12 | sgs/site-header-row |  | background-color | backgroundColourHover |  | surface | 1440 | fill-state-hold |
| cr-ref-header-14 | sgs/container |  | color | textColourHover |  | custom-ink | 768 | fill-state-hold |
| cr-ref-header-15 | sgs/button |  | box-shadow | boxShadowHover |  | rgba(0, 0, 0, 0.25) 0px 6px 20px 0px | 768 | fill-state |
| cr-ref-header-15 | sgs/button |  | background-color | colourBackgroundHover |  | primary | 768 | fill-state-hold |
| cr-ref-header-15 | sgs/button |  | border-top-color | borderColourHover |  | primary | 768 | fill-state-hold |
| cr-ref-header-15 | sgs/button |  | color | colourTextHover |  | surface | 768 | fill-state-hold |
| cr-ref-header-16 | sgs/nav-bar-menu |  | color | navColourHover |  | primary | 1440 | fill-state-hold |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | transition-duration | itemMotionDuration | 220 | 220 | 1440 | fill-timing |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | transition-timing-function | itemMotionEasing |  | ease | 1440 | fill-timing |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | background-color | itemBgOpen |  | #0A7EA81F | 1440 | fill-state |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | color | itemColourOpen |  | primary | 1440 | fill-state |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | transition-duration | itemMotionDuration | 220 | 220 | 1440 | fill-timing |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | transition-timing-function | itemMotionEasing | ease | ease | 1440 | fill-timing |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | color | itemColourCurrent |  | primary | 1440 | fill-state |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret | transition-duration | submenuCaretTurnDuration | 300 | 300 | 1440 | fill-timing |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret | transition-timing-function | submenuCaretTurnEasingCustom | cubic-bezier(0.16, 0.84, 0.32, 1) | cubic-bezier(0.16, 0.84, 0.32, 1) | 1440 | fill-timing |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | background-color | burgerHoverColour |  | primary | 768 | fill-state |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | box-shadow | burgerShadowHover |  | rgba(10, 126, 168, 0.85) 0px 10px 22px -10px | 768 | fill-state |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | color | burgerColourHover |  | surface | 768 | fill-state |
| cr-ref-header-17 | sgs/button |  | box-shadow | boxShadowHover |  | rgba(0, 0, 0, 0.25) 0px 6px 20px 0px | 1440 | fill-state |
| cr-ref-header-17 | sgs/button |  | background-color | colourBackgroundHover |  | primary | 1440 | fill-state-hold |
| cr-ref-header-17 | sgs/button |  | border-top-color | borderColourHover |  | primary | 1440 | fill-state-hold |
| cr-ref-header-17 | sgs/button |  | color | colourTextHover |  | surface | 1440 | fill-state-hold |
| cr-ref-header-3 | sgs/button |  | background-color, box-shadow, color | sgsFocusRests |  | true |  | fill-state-focus-rests |
| cr-ref-header-4 | sgs/button |  | background-color, box-shadow, color | sgsFocusRests |  | true |  | fill-state-focus-rests |
| cr-ref-header-5 | sgs/button |  | background-color, box-shadow, color | sgsFocusRests |  | true |  | fill-state-focus-rests |
| cr-ref-header-6 | sgs/button |  | background-color, box-shadow, color | sgsFocusRests |  | true |  | fill-state-focus-rests |
| cr-ref-header-15 | sgs/button |  | box-shadow | sgsFocusRests |  | true |  | fill-state-focus-rests |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | background-color, box-shadow, color | sgsFocusRests |  | true |  | fill-state-focus-rests |
| cr-ref-header-17 | sgs/button |  | box-shadow | sgsFocusRests |  | true |  | fill-state-focus-rests |
| cr-ref-header-1 | sgs/site-header-row |  | align-items | alignItems |  | center | 1440 | width-ladder |
| cr-ref-header-2 | sgs/multi-button |  | align-items | alignItems |  | {"desktop":"center","mobile":"center"} | 375,768,1440 | width-ladder |
| cr-ref-header-2 | sgs/multi-button |  | flex-direction | flexDirection |  | {"desktop":"row","mobile":"row"} | 375,768,1440 | width-ladder |
| cr-ref-header-3 | sgs/button |  | width ladder (justify-content): scoped @media rule | sgsCustomCss |  | @media (max-width: 767px) { & { justify-content: flex-start; } } @media (min-width: 768px) { & { justify-content: normal; } } | 375,768,1440 | width-gate |
| cr-ref-header-3 | sgs/button |  | width ladder (justify-content): scope key | sgsCustomCssId |  | wgate3 | 375,768,1440 | width-gate |
| cr-ref-header-3 | sgs/button |  | width ladder (justify-content): label | sgsCustomCssNote |  | Width ladder justify-content: 0-767px flex-start, 768px and up normal | 375,768,1440 | width-gate |
| cr-ref-header-4 | sgs/button |  | width ladder (justify-content): scoped @media rule | sgsCustomCss |  | @media (max-width: 767px) { & { justify-content: normal; } } @media (min-width: 768px) { & { justify-content: flex-start; } } | 375,768,1440 | width-gate |
| cr-ref-header-4 | sgs/button |  | width ladder (justify-content): scope key | sgsCustomCssId |  | wgate4 | 375,768,1440 | width-gate |
| cr-ref-header-4 | sgs/button |  | width ladder (justify-content): label | sgsCustomCssNote |  | Width ladder justify-content: 0-767px normal, 768px and up flex-start | 375,768,1440 | width-gate |
| cr-ref-header-5 | sgs/button |  | width ladder (justify-content): scoped @media rule | sgsCustomCss |  | @media (max-width: 767px) { & { justify-content: flex-start; } } @media (min-width: 768px) { & { justify-content: normal; } } | 375,768,1440 | width-gate |
| cr-ref-header-5 | sgs/button |  | width ladder (justify-content): scope key | sgsCustomCssId |  | wgate5 | 375,768,1440 | width-gate |
| cr-ref-header-5 | sgs/button |  | width ladder (justify-content): label | sgsCustomCssNote |  | Width ladder justify-content: 0-767px flex-start, 768px and up normal | 375,768,1440 | width-gate |
| cr-ref-header-6 | sgs/button |  | width ladder (justify-content): scoped @media rule | sgsCustomCss |  | @media (max-width: 767px) { & { justify-content: normal; } } @media (min-width: 768px) { & { justify-content: flex-start; } } | 375,768,1440 | width-gate |
| cr-ref-header-6 | sgs/button |  | width ladder (justify-content): scope key | sgsCustomCssId |  | wgate6 | 375,768,1440 | width-gate |
| cr-ref-header-6 | sgs/button |  | width ladder (justify-content): label | sgsCustomCssNote |  | Width ladder justify-content: 0-767px normal, 768px and up flex-start | 375,768,1440 | width-gate |
| cr-ref-header-15 | sgs/button |  | width ladder (justify-content): scoped @media rule | sgsCustomCss |  | @media (max-width: 767px) { & { justify-content: normal; } } @media (min-width: 768px) and (max-width: 1023px) { & { justify-content: flex-start; } } @media (min-width: 1024px) { & { justify-content:  | 375,768,1440 | width-gate |
| cr-ref-header-15 | sgs/button |  | width ladder (justify-content): scope key | sgsCustomCssId |  | wgate15 | 375,768,1440 | width-gate |
| cr-ref-header-15 | sgs/button |  | width ladder (justify-content): label | sgsCustomCssNote |  | Width ladder justify-content: 0-767px normal, 768-1023px flex-start, 1024px and up normal | 375,768,1440 | width-gate |
| cr-ref-header-16 | sgs/nav-bar-menu |  | justify-content | justifyContent |  | flex-start | 1440 | width-ladder |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | border-radius | burgerBorderRadius |  | {"desktop":"50%","tablet":"50%","mobile":"50%"} | 375,768,1440 | width-ladder |
| cr-ref-header-17 | sgs/button |  | width ladder (justify-content): scoped @media rule | sgsCustomCss |  | @media (max-width: 1263px) { & { justify-content: normal; } } @media (min-width: 1264px) { & { justify-content: flex-start; } } | 375,768,1440 | width-gate |
| cr-ref-header-17 | sgs/button |  | width ladder (justify-content): scope key | sgsCustomCssId |  | wgate17 | 375,768,1440 | width-gate |
| cr-ref-header-17 | sgs/button |  | width ladder (justify-content): label | sgsCustomCssNote |  | Width ladder justify-content: 0-1263px normal, 1264px and up flex-start | 375,768,1440 | width-gate |
| cr-ref-header-8 | sgs/icon |  | box-shadow | boxShadowHover |  | rgba(0, 0, 0, 0.45) 0px 10px 20px -6px | 1440 | width-ladder |
| cr-ref-header-9 | sgs/icon |  | box-shadow | boxShadowHover |  | rgba(0, 0, 0, 0.45) 0px 10px 20px -6px | 1440 | width-ladder |
| cr-ref-header-10 | sgs/icon |  | box-shadow | boxShadowHover |  | rgba(0, 0, 0, 0.45) 0px 10px 20px -6px | 1440 | width-ladder |
| cr-ref-header-11 | sgs/icon |  | box-shadow | boxShadowHover |  | rgba(0, 0, 0, 0.45) 0px 10px 20px -6px | 1440 | width-ladder |
| cr-ref-header-1 | sgs/site-header-row | .sgs-container__inner | min-height | minHeight |  | {"desktop":"46px"} | 1440 | dimension |
| cr-ref-header-3 | sgs/button |  | min-height | minHeight |  | {"mobile":35.25} | 375 | dimension |
| cr-ref-header-4 | sgs/button |  | min-height | minHeight |  | {"desktop":35.25} | 1440 | dimension |
| cr-ref-header-5 | sgs/button |  | min-height | minHeight |  | {"mobile":35.25} | 375 | dimension |
| cr-ref-header-6 | sgs/button |  | min-height | minHeight |  | {"desktop":35.25} | 1440 | dimension |
| cr-ref-header-8 | sgs/icon |  | flex-shrink | sgsChildSizing |  | {"desktop":"fixed","tablet":"fixed","mobile":"fixed"} | 375,768,1440 | dimension |
| cr-ref-header-8 | sgs/icon |  | flex-shrink | sgsChildWidth |  | {"desktop":"34px","tablet":"34px","mobile":"auto"} | 375,768,1440 | dimension |
| cr-ref-header-9 | sgs/icon |  | flex-shrink | sgsChildSizing |  | {"desktop":"fixed","tablet":"fixed","mobile":"fixed"} | 375,768,1440 | dimension |
| cr-ref-header-9 | sgs/icon |  | flex-shrink | sgsChildWidth |  | {"desktop":"34px","tablet":"34px","mobile":"auto"} | 375,768,1440 | dimension |
| cr-ref-header-10 | sgs/icon |  | flex-shrink | sgsChildSizing |  | {"desktop":"fixed","tablet":"fixed","mobile":"fixed"} | 375,768,1440 | dimension |
| cr-ref-header-10 | sgs/icon |  | flex-shrink | sgsChildWidth |  | {"desktop":"34px","tablet":"34px","mobile":"auto"} | 375,768,1440 | dimension |
| cr-ref-header-11 | sgs/icon |  | flex-shrink | sgsChildSizing |  | {"desktop":"fixed","tablet":"fixed","mobile":"fixed"} | 375,768,1440 | dimension |
| cr-ref-header-11 | sgs/icon |  | flex-shrink | sgsChildWidth |  | {"desktop":"34px","tablet":"34px","mobile":"auto"} | 375,768,1440 | dimension |
| cr-ref-header-12 | sgs/site-header-row | .sgs-container__inner | min-height | minHeight |  | {"tablet":"75px","desktop":"87px"} | 768,1440 | dimension |
| cr-ref-header-13 | sgs/responsive-logo |  | max-width | maxWidth |  | {"mobile":238.22,"tablet":247.05,"desktop":279.5} | 375,768,1440 | dimension |
| cr-ref-header-13 | sgs/responsive-logo |  | flex-shrink | sgsChildSizing |  | {"desktop":"fixed","tablet":"fixed","mobile":"fixed"} | 375,768,1440 | dimension |
| cr-ref-header-13 | sgs/responsive-logo |  | flex-shrink | sgsChildWidth |  | {"desktop":"auto","tablet":"auto","mobile":"auto"} | 375,768,1440 | dimension |
| cr-ref-header-15 | sgs/button |  | flex-shrink | sgsChildSizing |  | {"desktop":"fixed","tablet":"fixed","mobile":"fixed"} | 375,768,1440 | dimension |
| cr-ref-header-15 | sgs/button |  | flex-shrink | sgsChildWidth |  | {"desktop":"auto","tablet":"auto","mobile":"auto"} | 375,768,1440 | dimension |
| cr-ref-header-17 | sgs/button |  | flex-shrink | sgsChildSizing |  | {"desktop":"fixed","tablet":"fixed","mobile":"fixed"} | 375,768,1440 | dimension |
| cr-ref-header-17 | sgs/button |  | flex-shrink | sgsChildWidth |  | {"desktop":"auto","tablet":"auto","mobile":"auto"} | 375,768,1440 | dimension |
| cr-ref-header-16 | sgs/nav-bar-menu |  | step ladder: scoped @media rule | sgsCustomCss |  | @media (min-width: 1024px) and (max-width: 1199px) { & .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item > .sgs-nav-bar-menu__link { padding-right: 10px; padding-left: 10px; } } |  | width-gate |
| cr-ref-header-16 | sgs/nav-bar-menu |  | step ladder: scope key | sgsCustomCssId |  | wgate16 |  | width-gate |
| cr-ref-header-16 | sgs/nav-bar-menu |  | step ladder: label | sgsCustomCssNote |  | Step ladder: .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item > .sgs-nav-bar-menu__link 1024-1199px padding-right: 10px; padding-left: 10px; |  | width-gate |
| cr-ref-header-3 | sgs/button |  | width gate (m): hide on tablet | sgsHideOnTablet |  | true |  | width-gate |
| cr-ref-header-3 | sgs/button |  | width gate (m): hide on desktop | sgsHideOnDesktop |  | true |  | width-gate |
| cr-ref-header-4 | sgs/button |  | width gate (a width variant is shown at 375px): hide on mobile | sgsHideOnMobile |  | true |  | width-gate |
| cr-ref-header-5 | sgs/button |  | width gate (m): hide on tablet | sgsHideOnTablet |  | true |  | width-gate |
| cr-ref-header-5 | sgs/button |  | width gate (m): hide on desktop | sgsHideOnDesktop |  | true |  | width-gate |
| cr-ref-header-6 | sgs/button |  | width gate (!m): hide on mobile | sgsHideOnMobile |  | true |  | width-gate |
| cr-ref-header-7 | sgs/social-icons |  | width gate (!m): hide on mobile | sgsHideOnMobile |  | true |  | width-gate |
| cr-ref-header-15 | sgs/button |  | width gate (t and isCompact): hide on mobile | sgsHideOnMobile |  | true |  | width-gate |
| cr-ref-header-15 | sgs/button |  | width gate (t and isCompact): hide on desktop | sgsHideOnDesktop |  | true |  | width-gate |
| cr-ref-header-17 | sgs/button |  | width gate (w >= 1260 and d): scoped @media rule | sgsCustomCss | @media (max-width: 1263px) { & { justify-content: normal; } } @media (min-width: 1264px) { & { justify-content: flex-start; } } | @media (max-width: 1263px) { & { justify-content: normal; } } @media (min-width: 1264px) { & { justify-content: flex-start; } } @media (max-width: 1259px) { & { display: none; } } |  | width-gate |
| cr-ref-header-17 | sgs/button |  | width gate (w >= 1260 and d): scope key | sgsCustomCssId | wgate17 | wgate17 |  | width-gate |
| cr-ref-header-17 | sgs/button |  | width gate (w >= 1260 and d): label | sgsCustomCssNote | Width ladder justify-content: 0-1263px normal, 1264px and up flex-start | Width ladder justify-content: 0-1263px normal, 1264px and up flex-start; Width gate w >= 1260 and d: hidden at 0-1259px |  | width-gate |
| cr-ref-header-0 | sgs/site-header |  | J-12 scrolledOffset | scrolledOffset |  | 8 |  | motion |
| cr-ref-header-0 | sgs/site-header |  | J-12 shadowScrolled | shadowScrolled |  | 0px 10px 30px -18px |  | motion |
| cr-ref-header-0 | sgs/site-header |  | J-12 shadowScrolledColour | shadowScrolledColour |  | #14283C59 |  | motion |
| cr-ref-header-0 | sgs/site-header |  | J-12 headerSticky | headerSticky |  | {"desktop":"on"} |  | motion |
| cr-ref-header-1 | sgs/site-header-row |  | rowHideOnScroll | rowHideOnScroll |  | {"desktop":"on"} |  | motion |
| cr-ref-header-1 | sgs/site-header-row |  | rowAnimate | rowAnimate |  | false |  | motion |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | J-66 itemMagnetEnabled | itemMagnetEnabled |  | true |  | motion |
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | J-66 itemMagnetStrength | itemMagnetStrength |  | 0.14 |  | motion |
| cr-ref-header-3 | sgs/button |  | motion root | sgsMotion |  | {"v":1,"elements":{"root":{"hover":{"state":{"values":{"duration":200,"easing":"token:easing.ease","paintDuration":200,"paintEasing":"token:easing.ease","shadowDuration":"token:duration.fast","shadowE | 375 | motion |
| cr-ref-header-4 | sgs/button |  | motion root | sgsMotion |  | {"v":1,"elements":{"root":{"hover":{"state":{"values":{"duration":200,"easing":"token:easing.ease","paintDuration":200,"paintEasing":"token:easing.ease","shadowDuration":"token:duration.fast","shadowE | 768,1440 | motion |
| cr-ref-header-5 | sgs/button |  | motion root | sgsMotion |  | {"v":1,"elements":{"root":{"hover":{"state":{"values":{"duration":200,"easing":"token:easing.ease","paintDuration":200,"paintEasing":"token:easing.ease","shadowDuration":"token:duration.fast","shadowE | 375 | motion |
| cr-ref-header-6 | sgs/button |  | motion root | sgsMotion |  | {"v":1,"elements":{"root":{"hover":{"state":{"values":{"duration":200,"easing":"token:easing.ease","paintDuration":200,"paintEasing":"token:easing.ease","shadowDuration":"token:duration.fast","shadowE | 768,1440 | motion |
| cr-ref-header-8 | sgs/icon |  | motion root | sgsMotion |  | {"v":1,"elements":{"root":{"hover":{"state":{"values":{"scale":1.15,"translateY":-3.45,"rotate":-8,"duration":350,"easing":"token:easing.spring"}}}}}} | 768,1440 | motion |
| cr-ref-header-9 | sgs/icon |  | motion root | sgsMotion |  | {"v":1,"elements":{"root":{"hover":{"state":{"values":{"scale":1.15,"translateY":-3.45,"rotate":-8,"duration":350,"easing":"token:easing.spring"}}}}}} | 768,1440 | motion |
| cr-ref-header-10 | sgs/icon |  | motion root | sgsMotion |  | {"v":1,"elements":{"root":{"hover":{"state":{"values":{"scale":1.15,"translateY":-3.45,"rotate":-8,"duration":350,"easing":"token:easing.spring"}}}}}} | 768,1440 | motion |
| cr-ref-header-11 | sgs/icon |  | motion root | sgsMotion |  | {"v":1,"elements":{"root":{"hover":{"state":{"values":{"scale":1.15,"translateY":-3.45,"rotate":-8,"duration":350,"easing":"token:easing.spring"}}}}}} | 768,1440 | motion |
| cr-ref-header-15 | sgs/button |  | motion root | sgsMotion |  | {"v":1,"elements":{"root":{"hover":{"state":{"values":{"duration":"token:duration.fast","easing":"cubic-bezier(.2,.8,.2,1)","paintDuration":200,"paintEasing":"token:easing.ease","shadowDuration":"toke | 768 | motion |
| cr-ref-header-16 | sgs/nav-bar-menu |  | motion burger, burger-bar-2, burger-bar-3 | sgsMotion |  | {"v":1,"elements":{"burger":{"hover":{"state":{"values":{"scale":1.07,"duration":400,"easing":"token:easing.spring"}}}},"burger-bar-2":{"hover":{"state":{"values":{"restWidth":"13px","width":"18px","d |  | motion |
| cr-ref-header-17 | sgs/button |  | motion root | sgsMotion |  | {"v":1,"elements":{"root":{"hover":{"state":{"values":{"duration":"token:duration.fast","easing":"cubic-bezier(.2,.8,.2,1)","paintDuration":200,"paintEasing":"token:easing.ease","shadowDuration":"toke | 1440 | motion |

## Custom-CSS gaps

| Node | Block | Element | Properties | Native control | Rule |
|---|---|---|---|---|---|
| cr-ref-header-16 | sgs/nav-bar-menu | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item > .sgs-nav-bar-menu__link | padding-right, padding-left | itemPadding with a step at 1200px | @media (min-width: 1024px) and (max-width: 1199px) { & .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item > .sgs-nav-bar-menu__link { padding-right: 10px; padding-left: 10px; } } |

## Theme snapshot patch

Keys for the client's theme-snapshot.json, written beside this report as `theme-snapshot.patch.json` (Fill never edits the snapshot): the draft's focus look, button press looks and link-state looks. Merge it with the snapshot, then run the focus-token gate.

| Key | Value | State | Node | Block | Element |
|---|---|---|---|---|---|
| settings.custom.focus.width | 1px | focus | cr-ref-header-3 | sgs/button |  |
| settings.custom.focus.ring | #101010 | focus | cr-ref-header-3 | sgs/button |  |
| settings.custom.focus.ringOnDark | #101010 | focus | cr-ref-header-3 | sgs/button |  |
| settings.custom.focus.offset | 1px | focus | cr-ref-header-3 | sgs/button |  |
| settings.custom.focus.bloom | 0 | focus | cr-ref-header-3 | sgs/button |  |
| settings.custom.focus.source | draft | focus | cr-ref-header-3 | sgs/button |  |
| settings.custom.focus.style | auto | focus | cr-ref-header-3 | sgs/button |  |
| settings.custom.focus.ringOnly | 1 | focus | cr-ref-header-3 | sgs/button |  |

## Spacing ownership

Decided per tier from the rendered gaps between consecutive children's border boxes (equal means within 0.5px). Parent: it holds the gap and the children give up their between-sibling margins. Children: the parent gap is 0 and each child keeps its own margin.

| Node | Width | Owner | Rendered children | Decisions |
|---|---|---|---|---|
| cr-ref-header-0 | 375 | unknown | 2 |  |
| cr-ref-header-0 | 768 | unknown | 2 |  |
| cr-ref-header-0 | 1440 | unknown | 2 |  |
| cr-ref-header-1 | 768 | parent | 2 | column-gap parent 12px (gaps 166.61) |
| cr-ref-header-1 | 1440 | parent | 2 | column-gap parent 12px (gaps 702.61) |
| cr-ref-header-2 | 375 | parent | 2 | column-gap parent 10px (gaps 10) |
| cr-ref-header-2 | 768 | parent | 2 | column-gap parent 10px (gaps 10) |
| cr-ref-header-2 | 1440 | parent | 2 | column-gap parent 10px (gaps 10) |
| cr-ref-header-7 | 768 | parent | 4 | column-gap parent 10px (gaps 10, 10, 10) |
| cr-ref-header-7 | 1440 | parent | 4 | column-gap parent 10px (gaps 10, 10, 10) |
| cr-ref-header-12 | 375 | parent | 2 | column-gap parent 20px (gaps 48.78) |
| cr-ref-header-12 | 768 | parent | 2 | column-gap parent 20px (gaps 152.13) |
| cr-ref-header-12 | 1440 | parent | 2 | column-gap parent 20px (gaps 705.67) |

## Fluid sizes

None.

## Breakpoint steps

Each element swept every 16px from 320 to 1920. A step is where a value changes against its neighbour; the nearest SGS boundary (768, 1024) is named, and `on boundary` says the step lands on it. For a human to decide against `divergences.json`: Fill writes no ledger entry.

| Node | Element | Property | From | To | At | Nearest boundary | Offset | On boundary |
|---|---|---|---|---|---|---|---|---|
| cr-ref-header-1 |  | align-items | normal | center | 768 | 768 | 0 | yes |
| cr-ref-header-1 |  | column-gap | 0px | 12px | 768 | 768 | 0 | yes |
| cr-ref-header-1 |  | justify-content | normal | space-between | 768 | 768 | 0 | yes |
| cr-ref-header-1 |  | row-gap | 0px | 12px | 768 | 768 | 0 | yes |
| cr-ref-header-1 | .sgs-container__inner | padding-left | 20px | 32px | 768 | 768 | 0 | yes |
| cr-ref-header-1 | .sgs-container__inner | padding-right | 20px | 32px | 768 | 768 | 0 | yes |
| cr-ref-header-1 | .sgs-container__inner | padding-left | 32px | 40px | 1024 | 1024 | 0 | yes |
| cr-ref-header-1 | .sgs-container__inner | padding-right | 32px | 40px | 1024 | 1024 | 0 | yes |
| cr-ref-header-2 |  | width | 280px | 296px | 336 | 768 | -432 | no |
| cr-ref-header-2 |  | width | 296px | 300.594px | 352 | 768 | -416 | no |
| cr-ref-header-2 |  | width | 300.594px | 371.391px | 768 | 768 | 0 | yes |
| cr-ref-header-3 |  | (rendered) | present | absent | 768 | 768 | 0 | yes |
| cr-ref-header-4 |  | width | 75.2188px | 143.125px | 768 | 768 | 0 | yes |
| cr-ref-header-5 |  | width | 75.2188px | 143.125px | 768 | 768 | 0 | yes |
| cr-ref-header-6 |  | (rendered) | absent | present | 768 | 768 | 0 | yes |
| cr-ref-header-7 |  | (rendered) | absent | present | 768 | 768 | 0 | yes |
| cr-ref-header-8 |  | (rendered) | absent | present | 768 | 768 | 0 | yes |
| cr-ref-header-8 | .sgs-icon__shape > .sgs-icon__svg | (rendered) | absent | present | 768 | 768 | 0 | yes |
| cr-ref-header-9 |  | (rendered) | absent | present | 768 | 768 | 0 | yes |
| cr-ref-header-9 | .sgs-icon__shape > .sgs-icon__svg | (rendered) | absent | present | 768 | 768 | 0 | yes |
| cr-ref-header-10 |  | (rendered) | absent | present | 768 | 768 | 0 | yes |
| cr-ref-header-10 | .sgs-icon__shape > .sgs-icon__svg | (rendered) | absent | present | 768 | 768 | 0 | yes |
| cr-ref-header-11 |  | (rendered) | absent | present | 768 | 768 | 0 | yes |
| cr-ref-header-11 | .sgs-icon__shape > .sgs-icon__svg | (rendered) | absent | present | 768 | 768 | 0 | yes |
| cr-ref-header-12 | .sgs-container__inner | padding-left | 20px | 32px | 768 | 768 | 0 | yes |
| cr-ref-header-12 | .sgs-container__inner | padding-right | 20px | 32px | 768 | 768 | 0 | yes |
| cr-ref-header-12 | .sgs-container__inner | padding-left | 32px | 40px | 1024 | 1024 | 0 | yes |
| cr-ref-header-12 | .sgs-container__inner | padding-right | 32px | 40px | 1024 | 1024 | 0 | yes |
| cr-ref-header-13 |  | width | 238.219px | 247.047px | 768 | 768 | 0 | yes |
| cr-ref-header-13 |  | width | 247.047px | 238.219px | 1024 | 1024 | 0 | yes |
| cr-ref-header-14 |  | width | 48px | 304.828px | 768 | 768 | 0 | yes |
| cr-ref-header-14 |  | (rendered) | present | absent | 1024 | 1024 | 0 | yes |
| cr-ref-header-15 |  | (rendered) | absent | present | 768 | 768 | 0 | yes |
| cr-ref-header-15 |  | (rendered) | present | absent | 1024 | 1024 | 0 | yes |
| cr-ref-header-16 |  | (rendered) | absent | present | 1024 | 1024 | 0 | yes |
| cr-ref-header-16 |  | width | 483.828px | 543.828px | 1200 | 1024 | 176 | no |
| cr-ref-header-16 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret | (rendered) | absent | present | 1024 | 1024 | 0 | yes |
| cr-ref-header-16 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | (rendered) | absent | present | 1024 | 1024 | 0 | yes |
| cr-ref-header-16 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | padding-left | 10px | 15px | 1200 | 1024 | 176 | no |
| cr-ref-header-16 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | padding-right | 10px | 15px | 1200 | 1024 | 176 | no |
| cr-ref-header-16 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link | width | 80.1406px | 90.1406px | 1200 | 1024 | 176 | no |
| cr-ref-header-16 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | (rendered) | absent | present | 1024 | 1024 | 0 | yes |
| cr-ref-header-16 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | padding-left | 10px | 15px | 1200 | 1024 | 176 | no |
| cr-ref-header-16 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | padding-right | 10px | 15px | 1200 | 1024 | 176 | no |
| cr-ref-header-16 | .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(7) > .sgs-nav-bar-menu__link | width | 62.875px | 72.875px | 1200 | 1024 | 176 | no |
| cr-ref-header-16 | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger | (rendered) | present | absent | 1024 | 1024 | 0 | yes |
| cr-ref-header-16 | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(1) | (rendered) | present | absent | 1024 | 1024 | 0 | yes |
| cr-ref-header-16 | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(2) | (rendered) | present | absent | 1024 | 1024 | 0 | yes |
| cr-ref-header-16 | .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(3) | (rendered) | present | absent | 1024 | 1024 | 0 | yes |
| cr-ref-header-17 |  | (rendered) | absent | present | 1264 | 1024 | 240 | no |

## Entrances

None.

## Divergence ledger

None.

## Token snaps

| Where | From | To | Distance | Kind |
|---|---|---|---|---|
| sgs/site-header  color@mobile | rgb(30, 42, 60) | custom-ink | 0 | exact |
| sgs/site-header  color@tablet | rgb(30, 42, 60) | custom-ink | 0 | exact |
| sgs/site-header  color@desktop | rgb(30, 42, 60) | custom-ink | 0 | exact |
| sgs/site-header-row  color@mobile | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/site-header-row  color@tablet | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/site-header-row  color@desktop | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/site-header-row  background-color@mobile | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/site-header-row  background-color@tablet | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/site-header-row  background-color@desktop | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/button  color@mobile | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/button  background-color@mobile | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/button  color@tablet | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/button  color@desktop | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/button  background-color@tablet | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/button  background-color@desktop | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/button  color@mobile | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/button  background-color@mobile | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/button  color@tablet | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/button  color@desktop | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/button  background-color@tablet | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/button  background-color@desktop | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/social-icons .sgs-icon:nth-of-type(1) > .sgs-icon__link > .sgs-icon__shape background-color@tablet | rgb(10, 102, 194) | #0A66C2 | 16.69 | literal |
| sgs/social-icons .sgs-icon:nth-of-type(1) > .sgs-icon__link > .sgs-icon__shape background-color@desktop | rgb(10, 102, 194) | #0A66C2 | 16.69 | literal |
| sgs/social-icons .sgs-icon:nth-of-type(1) > .sgs-icon__link > .sgs-icon__shape background-color@tablet | rgb(24, 119, 242) | #1877F2 | 6.454 | literal |
| sgs/social-icons .sgs-icon:nth-of-type(1) > .sgs-icon__link > .sgs-icon__shape background-color@desktop | rgb(24, 119, 242) | #1877F2 | 6.454 | literal |
| sgs/social-icons .sgs-icon:nth-of-type(1) > .sgs-icon__link > .sgs-icon__shape background-color@tablet | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/social-icons .sgs-icon:nth-of-type(1) > .sgs-icon__link > .sgs-icon__shape background-color@desktop | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/icon .sgs-icon__shape color@tablet | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/icon .sgs-icon__shape color@desktop | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/icon .sgs-icon__shape background-color@tablet | rgb(10, 102, 194) | #0A66C2 | 16.69 | literal |
| sgs/icon .sgs-icon__shape background-color@desktop | rgb(10, 102, 194) | #0A66C2 | 16.69 | literal |
| sgs/icon .sgs-icon__shape color@tablet | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/icon .sgs-icon__shape color@desktop | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/icon .sgs-icon__shape background-color@tablet | rgb(24, 119, 242) | #1877F2 | 6.454 | literal |
| sgs/icon .sgs-icon__shape background-color@desktop | rgb(24, 119, 242) | #1877F2 | 6.454 | literal |
| sgs/icon .sgs-icon__shape color@tablet | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/icon .sgs-icon__shape color@desktop | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/icon .sgs-icon__shape background-color@tablet | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/icon .sgs-icon__shape background-color@desktop | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/icon .sgs-icon__shape color@tablet | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/icon .sgs-icon__shape color@desktop | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/site-header-row  background-color@mobile | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/site-header-row  background-color@tablet | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/site-header-row  background-color@desktop | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/site-header-row  border-bottom-color@mobile | rgb(216, 202, 80) | accent | 0 | exact |
| sgs/site-header-row  border-bottom-color@tablet | rgb(216, 202, 80) | accent | 0 | exact |
| sgs/site-header-row  border-bottom-color@desktop | rgb(216, 202, 80) | accent | 0 | exact |
| sgs/button  border-top-color@tablet | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/button  border-bottom-color@tablet | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/button  border-left-color@tablet | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/button  border-right-color@tablet | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/nav-bar-menu  color@desktop | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link color@desktop | rgb(30, 42, 60) | custom-ink | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret color@desktop | rgb(30, 42, 60) | custom-ink | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger color@mobile | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger color@tablet | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger background-color@mobile | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger background-color@tablet | rgb(255, 255, 255) | surface | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger border-top-color@mobile | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger border-top-color@tablet | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger border-bottom-color@mobile | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger border-bottom-color@tablet | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger border-left-color@mobile | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger border-left-color@tablet | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger border-right-color@mobile | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger border-right-color@tablet | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(1) color@mobile | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(1) color@tablet | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(2) color@mobile | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(2) color@tablet | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(3) color@mobile | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/nav-bar-menu .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(3) color@tablet | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/button  border-top-color@desktop | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/button  border-bottom-color@desktop | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/button  border-left-color@desktop | rgb(10, 126, 168) | primary | 0 | exact |
| sgs/button  border-right-color@desktop | rgb(10, 126, 168) | primary | 0 | exact |

## Notes

- sgs/site-header: calibration has no text, link key, so those were not judged for this block (recalibrate it to read them)
- sgs/site-header-row: calibration has no presence, text, link key, so those were not judged for this block (recalibrate it to read them)
- sgs/multi-button: calibration has no presence, text, link key, so those were not judged for this block (recalibrate it to read them)
- sgs/button: calibration has no presence key, so those were not judged for this block (recalibrate it to read them)
- cr-ref-header-3 sgs/button: url holds "#/apply"; the draft links to "/apply/"
- cr-ref-header-4 sgs/button: the draft draws the icon before the label: iconPosition before
- cr-ref-header-5 sgs/button: the draft draws the icon before the label: iconPosition before
- cr-ref-header-6 sgs/button: the draft draws the icon before the label: iconPosition before
- sgs/social-icons: calibration has no text, link key, so those were not judged for this block (recalibrate it to read them)
- sgs/icon: calibration has no presence key, so those were not judged for this block (recalibrate it to read them)
- sgs/responsive-logo: calibration has no text, link key, so those were not judged for this block (recalibrate it to read them)
- sgs/container: calibration has no presence, text, link key, so those were not judged for this block (recalibrate it to read them)
- cr-ref-header-15 sgs/button: url holds "#/apply"; the draft links to "/apply/"
- sgs/nav-bar-menu: calibration has no text, link key, so those were not judged for this block (recalibrate it to read them)
- cr-ref-header-17 sgs/button: url holds "#/apply"; the draft links to "/apply/"
- cr-ref-header-1 sgs/site-header-row (.sgs-container__inner) justify-content: the draft's space-between does the same as "space-between" at every width; written as that one value
- cr-ref-header-1 sgs/site-header-row (.sgs-container__inner) align-items: the draft's center does the same as "center" at every width; written as that one value
- cr-ref-header-2 sgs/multi-button justify-content: the block's own default paint (start at 375, start at 768, start at 1440) does what the draft's normal does; nothing to write
- cr-ref-header-2 sgs/multi-button align-items: alignItems holds a value per device, so the draft's center at 375, center at 768, center at 1440 is written there
- cr-ref-header-2 sgs/multi-button flex-direction: flexDirection holds a value per device, so the draft's row at 375, row at 768, row at 1440 is written there
- cr-ref-header-3 sgs/button justify-content: no setting holds normal at 375, normal at 768, normal at 1440; written as a scoped @media rule in Additional CSS (0-767px flex-start, 768px and up normal)
- cr-ref-header-4 sgs/button justify-content: no setting holds normal at 375, normal at 768, normal at 1440; written as a scoped @media rule in Additional CSS (0-767px normal, 768px and up flex-start)
- cr-ref-header-5 sgs/button justify-content: no setting holds normal at 375, normal at 768, normal at 1440; written as a scoped @media rule in Additional CSS (0-767px flex-start, 768px and up normal)
- cr-ref-header-6 sgs/button justify-content: no setting holds normal at 375, normal at 768, normal at 1440; written as a scoped @media rule in Additional CSS (0-767px normal, 768px and up flex-start)
- cr-ref-header-15 sgs/button justify-content: no setting holds normal at 375, normal at 768, normal at 1440; written as a scoped @media rule in Additional CSS (0-767px normal, 768-1023px flex-start, 1024px and up normal)
- cr-ref-header-16 sgs/nav-bar-menu justify-content: the block draws its own narrow alternative under collapsePoint = 1024px, so the setting holds the wide value flex-start
- cr-ref-header-16 sgs/nav-bar-menu (.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger) border-radius: burgerBorderRadius holds a value per device, so the draft's 50% at 375, 50% at 768, 50% at 1440 is written there
- cr-ref-header-17 sgs/button justify-content: no setting holds normal at 375, normal at 768, normal at 1440; written as a scoped @media rule in Additional CSS (0-1263px normal, 1264px and up flex-start)
- node 8 sgs/icon: the setting paints .sgs-icon__link > .sgs-icon__shape, where the skeleton pairs no draft element; the values are read on the root
- cr-ref-header-8 sgs/icon (.sgs-icon__link > .sgs-icon__shape) box-shadow hover: the draft's rgba(0, 0, 0, 0.45) 0px 10px 20px -6px does the same as "rgba(0, 0, 0, 0.45) 0px 10px 20px -6px" at every width; written as that one value
- node 9 sgs/icon: the setting paints .sgs-icon__link > .sgs-icon__shape, where the skeleton pairs no draft element; the values are read on the root
- cr-ref-header-9 sgs/icon (.sgs-icon__link > .sgs-icon__shape) box-shadow hover: the draft's rgba(0, 0, 0, 0.45) 0px 10px 20px -6px does the same as "rgba(0, 0, 0, 0.45) 0px 10px 20px -6px" at every width; written as that one value
- node 10 sgs/icon: the setting paints .sgs-icon__link > .sgs-icon__shape, where the skeleton pairs no draft element; the values are read on the root
- cr-ref-header-10 sgs/icon (.sgs-icon__link > .sgs-icon__shape) box-shadow hover: the draft's rgba(0, 0, 0, 0.45) 0px 10px 20px -6px does the same as "rgba(0, 0, 0, 0.45) 0px 10px 20px -6px" at every width; written as that one value
- node 11 sgs/icon: the setting paints .sgs-icon__link > .sgs-icon__shape, where the skeleton pairs no draft element; the values are read on the root
- cr-ref-header-11 sgs/icon (.sgs-icon__link > .sgs-icon__shape) box-shadow hover: the draft's rgba(0, 0, 0, 0.45) 0px 10px 20px -6px does the same as "rgba(0, 0, 0, 0.45) 0px 10px 20px -6px" at every width; written as that one value
- cr-ref-header-1 sgs/site-header-row (.sgs-container__inner) min-height: the draft declares height 46px / 46px / 46px, no setting holds height and the content fits, so it is the block's minimum, written on the root (the draft's .sgs-container__inner is the root's content box; the root's own 0px / 0px / 0px of padding and border is added)
- cr-ref-header-3 sgs/button min-height: the block paints min-height 48px where the draft renders 35px (min-height auto); the draft's rendered size is written
- cr-ref-header-4 sgs/button min-height: the block paints min-height 48px / 48px where the draft renders 35px / 35px (min-height auto); the draft's rendered size is written
- cr-ref-header-5 sgs/button min-height: the block paints min-height 48px where the draft renders 35px (min-height auto); the draft's rendered size is written
- cr-ref-header-6 sgs/button min-height: the block paints min-height 48px / 48px where the draft renders 35px / 35px (min-height auto); the draft's rendered size is written
- cr-ref-header-8 sgs/icon flex-shrink: fixed child sizing at desktop 34px, tablet 34px, mobile auto
- cr-ref-header-9 sgs/icon flex-shrink: fixed child sizing at desktop 34px, tablet 34px, mobile auto
- cr-ref-header-10 sgs/icon flex-shrink: fixed child sizing at desktop 34px, tablet 34px, mobile auto
- cr-ref-header-11 sgs/icon flex-shrink: fixed child sizing at desktop 34px, tablet 34px, mobile auto
- cr-ref-header-12 sgs/site-header-row (.sgs-container__inner) min-height: the draft declares height 72px / 72px / 84px, no setting holds height and the content fits, so it is the block's minimum, written on the root (the draft's .sgs-container__inner is the root's content box; the root's own 3px / 3px / 3px of padding and border is added)
- cr-ref-header-13 sgs/responsive-logo max-width: the block paints max-width 100% / 100% / 100% where the draft renders 238px / 247px / 280px (max-width none); the draft's rendered size is written as the ceiling (a ceiling at the unconstrained size paints the same as none)
- cr-ref-header-13 sgs/responsive-logo flex-shrink: fixed child sizing at desktop auto, tablet auto, mobile auto
- cr-ref-header-15 sgs/button min-height: the block's min-height (48 / 48 / 48px) does not contradict the draft's rendered size; nothing to write
- cr-ref-header-15 sgs/button flex-shrink: fixed child sizing at desktop auto, tablet auto, mobile auto
- cr-ref-header-16 sgs/nav-bar-menu min-height: the block's min-height (0 / 0 / 0px) does not contradict the draft's rendered size; nothing to write
- cr-ref-header-16 sgs/nav-bar-menu (.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger) min-height: the block's min-height (44 / 44 / 44px) does not contradict the draft's rendered size; nothing to write
- cr-ref-header-16 sgs/nav-bar-menu (.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(1)) min-height: the block's min-height (0 / 0px) does not contradict the draft's rendered size; nothing to write
- cr-ref-header-16 sgs/nav-bar-menu (.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(2)) min-height: the block's min-height (0 / 0px) does not contradict the draft's rendered size; nothing to write
- cr-ref-header-16 sgs/nav-bar-menu (.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(3)) min-height: the block's min-height (0 / 0px) does not contradict the draft's rendered size; nothing to write
- cr-ref-header-17 sgs/button min-height: the block's min-height (48 / 48 / 48px) does not contradict the draft's rendered size; nothing to write
- cr-ref-header-17 sgs/button flex-shrink: fixed child sizing at desktop auto, tablet auto, mobile auto
- cr-ref-header-16 sgs/nav-bar-menu: the draft changes padding-right, padding-left between the read widths, which a per-device setting cannot hold; written as scoped @media rules in Additional CSS (1024-1199px on every sibling of 2 measured)
- cr-ref-header-3 sgs/button: shown only at 0-767 (m); hidden on tablet, desktop
- cr-ref-header-4 sgs/button: shown only at 768-up (a width variant is shown at 375px); hidden on mobile
- cr-ref-header-5 sgs/button: shown only at 0-767 (m); hidden on tablet, desktop
- cr-ref-header-6 sgs/button: shown only at 768-up (!m); hidden on mobile
- cr-ref-header-7 sgs/social-icons: shown only at 768-up (!m); hidden on mobile
- cr-ref-header-15 sgs/button: shown only at 768-1023 (t and isCompact); hidden on mobile, desktop
- cr-ref-header-16 sgs/nav-bar-menu: d is its own setting collapsePoint = 1024; no hiding flag is written
- cr-ref-header-17 sgs/button: w >= 1260 and d has no tier-aligned hiding setting and no breakpoint setting; written as a scoped @media rule in Additional CSS
- cr-ref-header-16 (.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(1)) color hover: default-state: color follows .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger, whose hover look the draft declares, so the element changes with it
- cr-ref-header-16 (.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(1)) background-color hover: default-state: background-color follows .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger, whose hover look the draft declares, so the element changes with it
- cr-ref-header-16 (.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(2)) color hover: default-state: color follows .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger, whose hover look the draft declares, so the element changes with it
- cr-ref-header-16 (.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(2)) background-color hover: default-state: background-color follows .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger, whose hover look the draft declares, so the element changes with it
- cr-ref-header-16 (.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(3)) color hover: default-state: color follows .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger, whose hover look the draft declares, so the element changes with it
- cr-ref-header-16 (.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(3)) background-color hover: default-state: background-color follows .sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger, whose hover look the draft declares, so the element changes with it
- cr-ref-header-3: its preset holds the hover transform, so the hover scale, translateY of sgsMotion is not written
- cr-ref-header-4: its preset holds the hover transform, so the hover scale, translateY of sgsMotion is not written
- cr-ref-header-5: its preset holds the hover transform, so the hover scale, translateY of sgsMotion is not written
- cr-ref-header-6: its preset holds the hover transform, so the hover scale, translateY of sgsMotion is not written
- cr-ref-header-15: its preset holds the hover transform, so the hover scale, translateY of sgsMotion is not written
- cr-ref-header-17: its preset holds the hover transform, so the hover scale, translateY of sgsMotion is not written
- cr-ref-header-0 sgs/site-header: J-12: the scrolled shadow switches once the page has scrolled past the threshold (scrolledOffset, shadowScrolled, shadowScrolledColour, headerSticky)
- cr-ref-header-1 sgs/site-header-row: the draft pins its header bar and lets this strip scroll away: the row hides on scroll
- cr-ref-header-1 sgs/site-header-row: the draft's row times nothing at rest (transition-duration 0s, 0s, 0s at every width it renders at, and no state look times it), so its collapse jumps: rowAnimate off
- cr-ref-header-3 sgs/button: box-shadow hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-3 sgs/button: background hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-3 sgs/button: color hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-4 sgs/button: box-shadow hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-4 sgs/button: background hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-4 sgs/button: color hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-5 sgs/button: box-shadow hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-5 sgs/button: background hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-5 sgs/button: color hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-6 sgs/button: box-shadow hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-6 sgs/button: background hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-6 sgs/button: color hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-8 sgs/icon: the draft times colour, background, border colour and shadow at 0.25s ease, the client's transition.fast, which the hover layer's paint runs on unset; no paint field is written
- cr-ref-header-9 sgs/icon: the draft times colour, background, border colour and shadow at 0.25s ease, the client's transition.fast, which the hover layer's paint runs on unset; no paint field is written
- cr-ref-header-10 sgs/icon: the draft times colour, background, border colour and shadow at 0.25s ease, the client's transition.fast, which the hover layer's paint runs on unset; no paint field is written
- cr-ref-header-11 sgs/icon: the draft times colour, background, border colour and shadow at 0.25s ease, the client's transition.fast, which the hover layer's paint runs on unset; no paint field is written
- cr-ref-header-15 sgs/button: box-shadow hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-15 sgs/button: background hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-15 sgs/button: color hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-15 sgs/button: A-30: ripple is written from the draft's script
- cr-ref-header-15 sgs/button: A-31: sheen is written from the draft's script
- cr-ref-header-15 sgs/button: J-49: the handler sets the transition of the translate it writes toward the pointer: the magnet effect holds that return timing
- cr-ref-header-15 sgs/button: J-50: magnet is written from the draft's script
- cr-ref-header-16 sgs/nav-bar-menu (.sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link): J-66: magnet is the sgs/nav-bar-menu setting itemMagnetEnabled true, itemMagnetStrength 0.14
- cr-ref-header-16 sgs/nav-bar-menu (.sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link): J-67: the handler clears the pointer-written position when the pointer leaves: the magnet effect returns the element to rest itself; the magnet is the sgs/nav-bar-menu block-level setting, whose own return timing stands for the draft's 200ms ease-out
- cr-ref-header-16 sgs/nav-bar-menu (.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger): background hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-16 sgs/nav-bar-menu (.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger): color hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-16 sgs/nav-bar-menu (.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger): box-shadow hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-16 sgs/nav-bar-menu (.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger): the draft times colour, background, border colour and shadow at 0.25s ease, the client's transition.fast, which the hover layer's paint runs on unset; no paint field is written
- cr-ref-header-17 sgs/button: box-shadow hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-17 sgs/button: background hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-17 sgs/button: color hover belongs to the block's hover colour, border or shadow settings
- cr-ref-header-17 sgs/button: A-30: ripple is written from the draft's script
- cr-ref-header-17 sgs/button: A-31: sheen is written from the draft's script
- cr-ref-header-17 sgs/button: J-49: the handler sets the transition of the translate it writes toward the pointer: the magnet effect holds that return timing
- cr-ref-header-17 sgs/button: J-50: magnet is written from the draft's script
- site : J-01: the drawer is a modal dialog; it locks the page scroll while it is open
- site : J-04: the drawer is a modal dialog; it locks the page scroll while it is open
- site : A-12: the page fades in on a route change: the site's page transition (fade, 380ms ease-out) with the custom duration and easing, which win over the style's own
- site : A-12: the draft fades only the page body; SGS fades the page (an accepted difference, Ruling 5)
- binding R.px sets justifyContent to "space-between" on 2 elements in 1 sections: one shared setting
- binding R.px sets contentWidth to {"desktop":"1320px"} on 2 elements in 1 sections: one shared setting
- binding item.activeBg sets itemMotionDuration to 220 on 3 elements in 1 sections: one shared setting
- binding R.navPad sets itemMotionDuration to 220 on 3 elements in 1 sections: one shared setting
- binding item.activeColor sets itemMotionDuration to 220 on 3 elements in 1 sections: one shared setting
- binding item.activeBg sets itemMotionEasing to "ease" on 2 elements in 1 sections: one shared setting
- binding R.navPad sets itemMotionEasing to "ease" on 2 elements in 1 sections: one shared setting
- binding item.activeColor sets itemMotionEasing to "ease" on 2 elements in 1 sections: one shared setting
- binding R.px sets gap to 2 different values: not grouped
- binding R.px sets padding to 2 different values: not grouped
- binding item.activeBg sets itemPadding to 4 different values: not grouped
- binding R.navPad sets itemPadding to 4 different values: not grouped
- binding item.activeColor sets itemPadding to 4 different values: not grouped
- binding item.activeBg sets itemMinHeight to 2 different values: not grouped
- binding R.navPad sets itemMinHeight to 2 different values: not grouped
- binding item.activeColor sets itemMinHeight to 2 different values: not grouped
- binding R.px sets minHeight to 2 different values: not grouped
