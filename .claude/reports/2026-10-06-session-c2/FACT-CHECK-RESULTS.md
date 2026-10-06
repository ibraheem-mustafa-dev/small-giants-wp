# Session C2 — fact-check results, all five lanes

**2026-10-06.** 178 of the 192 raw F rows fact-checked against source and the framework DB, under the
citation gate. The 14 `sgs/google-reviews` rows are the parallel track's and were excluded.

Every `real` verdict below was re-checked in the main thread against the cited symbol. No lane
committed, deployed, reseeded or touched a host.

## Headline

**178 rows reduce to 7 new candidate framework fixes, 2 register items already decided and still to
build (39-43 and 34/35), 4 tree edits, and 1 unproven row.**

| Lane | Rows | real | already settable | wrong block | artefact | decided | Distinct fixes |
|---|---|---|---|---|---|---|---|
| A accordion | 41 | 14 | 6 | 0 | 17 | 4 | **3** |
| B home visuals | 35 | 2 | 12 | 1 | 20 | 0 | **1** |
| C footer + contact | 38 | 8 | 3 | 7 | 3 | 17 | **2** (1 already decided) |
| D lens flow | 28 | 0 | 0 | 0 | 28 | 0 | **0** |
| E menus + product | 36 | 6 | 1 | 3 | 22 | 4 | **2 + 1 unsettled** |
| **total** | **178** | **30** | **22** | **11** | **90** | **25** | **8 + 1** |

**90 of 178 rows are measuring artefacts** — half the surviving F count is the route comparing a draft
and a live page that paint the same pixels by different mechanisms, or the walker pairing the wrong
node. That is the single largest category and it needs no framework work at all.

## The candidate fixes, each verified in the main thread

| # | Block | What is missing | Rows | Verified citation |
|---|---|---|---|---|
| 1 | `sgs/accordion` | `headerGap`. The item header hardcodes `gap: 12px`; the draft wants 20px on help, 16px on product | 9 | `accordion/style.css::.sgs-accordion-item__header` `gap: 12px`. No `headerGap` or `header-gap` exists anywhere under `plugins/`. `accordion/block.json::providesContext` has 25 entries, none for gap |
| 2 | `sgs/accordion` | Header `line-height: 1.4` is hardcoded, so the block's own `lineHeight` cannot reach the title | 2 | `accordion/style.css::.sgs-accordion-item__header` `line-height: 1.4`. DB holds `sgs/accordion / lineHeight / line-height / wrapper`, which paints the root only |
| 3 | `sgs/accordion` | `headerMinHeight`. Header hardcodes `min-height: 44px` | 3 | `accordion/style.css::.sgs-accordion-item__header` `min-height: 44px; /* touch target */`. Precedent `sgs/tabs / tabMinHeight / min-height / tab` |
| 4 | `sgs/card-grid` | `noImageLabelLineHeight` and its `Unit` | 2 | `card-grid/block.json` holds 8 `noImageLabel*` attributes and **no** `noImageLabelLineHeight`, while `card-grid/render.php` already calls `sgs_typography_css_rule( $attributes, 'noImageLabel', … )`, which reads it. **The render path already consumes it** |
| 5 | `sgs/business-info` | **Already decided — register 34/35.** The link must become one 21px line: remove the hardcoded hit-area padding and its cancelling negative margin. **Not a new control** | 8 | `business-info/style.css::.sgs-business-info__link` `padding: 0.5em 0.6em`, `margin: -0.5em -0.6em`, `margin-block: calc((1lh - max(44px, 1lh + 1em)) / 2)`. Register 34/35: "Phone link: no minimum height, no padding, so it is one 21px line" |
| 6 | `sgs/social-icons` | Brand mode overwrites the box colours per item; hover scale hardcoded | 17 | **Already decided — register 39-43.** The register's fix is a glyph-only brand variant with a white box and a light border, not per-property patching. Still to build |
| 7 | `sgs/buybox` | Selected-value text has no typography control; it inherits 16px where the draft is 13px | 2 | `buybox/style.css::.sgs-buybox .sgs-buybox__picker-selected-value` sets `color` only. `pickerLabelFontSize` reaches the label span, not this element |
| 8 | `sgs/tabs` | Tab hover underline hardcoded with no setting | 4 | `tabs/style.css::.sgs-tabs__tab:hover` `text-decoration: underline`. No decoration or hover-text-colour attribute on `sgs/tabs` |
| 9 | `sgs/whatsapp-cta` | Glyph colour **unsettled** | 1 | Source says the badge should be near-white (`color: var(--wp--preset--color--text-inverse)`, snapshot `#FAF8F5`) but live reads `rgb(20,20,20)`, which that CSS cannot produce. `git diff 94122e326 HEAD` on the block is empty, so a stale deploy does not explain it. Needs a live origin read |

## Tree edits, not framework fixes

| Block or ref | What | Citation |
|---|---|---|
| `cr-ref-contact-24` `sgs/container` | Map frame border, aspect ratio and ground belong on the parent container, not on `sgs/business-info` | `business-info/render.php` `case 'map'` returns a bare `div` wrapping an `iframe` inside the block wrapper, so the wrapper's `borderWidth` and `borderStyle` cannot reach it. 7 rows |
| `cr-ref-contact-9` | Phone underline wants the S2/S3 utility class added | Register S3; `utilities.css::.sgs-hover-underline-slide::after` |
| `cr-ref-footer-27` | Bottom footer row needs `layout: "flex"` | `site-footer-row/block.json::attributes.layout` defaults to `"grid"`; `class-sgs-container-wrapper.php` emits `justify-content` only in its flex and stack branches |
| `cr-ref-help-13` | A flex row of two links was modelled as inline `sgs/text` | DB `sgs/container / gap / gap / inner` already exists |

## Two corrections to the brief, both proven in source

**1. The footer `margin-top` diagnosis is REFUTED.** The C2 plan records "Cause 2: an inline WP-native
base margin beats a class rule" as proven in the source. It is not.

`class-sgs-container-wrapper.php` calls `wp_style_engine_get_styles()` with
`array( 'selector' => '.' . $uid )`, and its own comment states the function "produces the same CSS WP's
own style engine would have inlined, **just scoped to `.$uid` instead**". So the desktop base is a scoped
class rule at 0,1,0 — not inline.

The "lands INLINE on the wrapper" comment the diagnosis rests on sits in the *tablet* padding block and
is **stale**. Consequence: the tablet and mobile tiers still emit `!important` to beat an inline rule
that no longer exists, while the base-spacing comment states `!important` is unnecessary because source
order already lets a narrower tier win. The footer `margin-top` row's cause is **unproven**, and no fix
should be built on the refuted one.

**2. Edit-target shift #1 is right about the target and wrong about the mechanism.** The brief says
`sgs/accordion` "emits `--sgs-accordion-header-gap` beside the existing header-padding tiers". In fact
the parent only *provides context* and the **child** emits the custom property:
`accordion-item/render.php` writes `--sgs-accordion-header-pad` and `accordion/style.css` reads it. So
the fix touches both blocks, with the control on the parent. `headerGap` does not exist yet in any form.

## The 44px touch-target question, and why it only applies to fix 3

Fixes 3 and 5 both touch a hardcoded **44px touch-target floor**, annotated as such in the source:
`business-info/style.css` calls its padding a "Hit-area-extension technique: this padding plus
min-width/min-height guarantee a >=44px hit", and `accordion/style.css` marks `min-height: 44px` as
`/* touch target */`. WCAG 2.1 AA 44px targets are a project non-negotiable.

**Fix 5 is already settled, and in the opposite direction to a new control.** Register 34/35 reads:
"Phone hover; phone link 44px tall (draft 21px) … Phone link: **no minimum height, no padding, so it is
one 21px line. The 44px touch-target rule is met by the line spacing around it; check after.**" Status
`proven`, sweep `still open`.

So Bean has already decided this one, already accounted for the touch target through line spacing, and
already asked for a post-check. The work is to **remove** the hardcoded padding, the cancelling negative
margin and the `margin-block` calc that assumes a 44px floor — not to add a `linkPadding` control. The
`linkMinHeight` control already exists and the tree should set it to 0. Lane C verdicted these 8 rows
`real` while also citing 34/35, which is an internal contradiction in its report; the register wins, and
the rows are **`decided`**.

**That leaves fix 3 as the only genuine 44px question.** Making `min-height: 44px` client-settable on the
accordion header would let a client drop below 44px with nothing to stop them. Either the control
enforces a 44px floor, or the hardcode stays. Lane A independently rated it low value anyway, because
the floor never binds in any sampled state — the header's height is driven by padding plus the icon box.

**Net effect on the count: 8 new candidate fixes, not 9**, plus two register items already decided and
still to build (39-43 and 34/35).

## The canvas-settable claims met in passing

Lanes recorded these for the live test, none as a closure:

- Lane B: every brand-strip typography row cites `cr-ref-home-7` `sgs/container` typography. Expected to
  **fail** — container 7 is a wrapper, the tile text is explicitly declared on `.brand-text`, and
  container typography would restyle every descendant.
- Lane B: the `sgs/media` ground row cites `backgroundOverlayColour`, which is an overlay layer, not a
  ground. Expected to fail.
- Lane D: `choice-flow` `border-radius` cites `sgs/form-step::borderRadius`, `where: sibling`. Expected
  to fail, being a sibling block rather than the root.
- Lane C: the 7 map rows cite `sgs/container` `gridItemBorder`, `boxAspectRatio` and
  `backgroundOverlayColour` on `cr-ref-contact-24`. Plausible, but the iframe's hardcoded `height="400"`
  may defeat a parent aspect ratio.
- Lane E: the help-15 gap rows cite `cr-ref-help-13`, the *neighbouring* container, not the node.

Four of the five lanes expect their citations to fail. That pattern is itself the most useful input to
the live test, and it is why the citation was always a claim and never a closure.

## Lane D is the strongest single result

All 28 lens rows are measuring artefacts and the lane needs **zero** fixes.

**The conclusion holds, but the lane's evidence was overstated and the real account is better.** A
main-thread spot-check of the walk report found two distinct situations, not one:

- **`option-card` padding rows: boxes genuinely identical.** Draft `0px` padding against live `16px` /
  `18px`, with the same box on both sides, because the draft pads an inner span. A true artefact.
- **`stage` and `close` rows: boxes differ by exactly 2px.** `close` is draft `h: 42` against live
  `h: 44`; `stage` is draft `{x:0,y:74,w:375,h:100}` against live `{x:0,y:76,w:375,h:98}`.

That 2px has a proven, deliberate cause:
`choice-flow/style.css::.sgs-choice-flow__chrome-close` sets `width: 44px; height: 44px; padding: 0`,
and the file comments nearby on elements "shrinking under 44px tall — both stay comfortably tappable".
The draft's close button is 42px. So live is 2px taller **by design**, to meet the 44px touch target, and
the `stage` offset is that button pushing content down by the same 2px.

**This is an accepted difference, not a gap** — the same shape as Bean's existing ruling that
`sgs/google-reviews`' 40px pills follow Google's own UI and are never flagged. Worth stating on the list
so the lens surface's residual has a named cause rather than reading as unexplained.

This independently corroborates Bean's own read that the lens flow looks right, and it retires all three
low-confidence candidates earlier sessions carried:

- `choice-flow` `border-radius` is **not** an F row at all — it is a `W` row marked `canvas-settable`.
  Lane D's circumstantial cause is the theme's `*:focus-visible` rule applying a 4px radius and glow to
  the flow root, which `chrome.js` focuses when the dialog opens. Unproven; one live reading settles it.
- Option-button `align-items` — the 0-row DB query is confirmed, but the box is identical, so it is an
  artefact rather than `real`.
- `__summary-summary` `justify-content` **does** reproduce, contrary to the "no open diff" note, and is
  an artefact.
