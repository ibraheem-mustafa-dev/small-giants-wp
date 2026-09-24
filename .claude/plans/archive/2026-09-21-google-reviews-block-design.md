# `sgs/google-reviews` — redesign to replicate the draft, plus ready-made looks

**doc_type:** design · **date:** 2026-09-21 · **status:** PROPOSED (needs Bean's approval on §7 R1)
**Scope:** `plugins/sgs-blocks/src/blocks/google-reviews/` + its DB rows. No converter change is
proposed here except the one already flagged in D1141 and re-raised in §7 R1.

---

## Plain English first

The draft's reviews panel is a **Google-styled card**: one bordered white box holding a header
row (Google "G", the caption "Google Reviews", a big 4.7, gold stars, "15 reviews", and two
pills on the right), a divider, a side-scrolling rail of review cards, then a footnote on the
left and two round arrow buttons on the right.

Our block already draws all the *pieces*. What it cannot do is **look like the draft**, because
about twenty of the draft's measurements (card padding, avatar size, star size, pill radius, the
divider colour, the big 4.7's font size, the logo's size and side) have **no attribute at all**
— there is nothing for the pipeline to write into and nothing for the client to change in the
editor. That is the whole job: add the missing attributes, declare where each one lives so the
converter reaches it without a code change, and wrap the whole look up as one pickable preset
alongside three other looks for other kinds of client.

**Verified counts in this document** come from these commands:

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT attr_name, css_property, css_element, css_state, css_tier, role, derived_selector FROM block_attributes WHERE block_slug='sgs/google-reviews' ORDER BY attr_name"
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT * FROM preset_implications WHERE block_slug='sgs/google-reviews'"
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT slug, variant_attr, tier FROM blocks WHERE slug='sgs/google-reviews'"   # -> variant_attr NULL
grep -oE 'sgs-google-reviews__[a-z-]+' plugins/sgs-blocks/src/blocks/google-reviews/render.php | sort -u
```

Draft source read in full: `sites/eye-care-ward-end/design_handoff_ward_end_eye_care_v2/Eye Care Birmingham.dc.html`
lines 969–1034 (markup) and 2294–2307 (`static REVIEWS`), 2756–2791 (`secPad`/`h2`/`googlePad`/
`revCardW`/`revPrev`/`revNext`). Emit read from
`pipeline-state/eye-care-ward-end-eye-care-birmingham-2026-09-21-175447/stage-4.json`.

---

## 1. Draft anatomy → attribute map

Column **Status**: ✓ = already covered · **GAP** = needs a new attribute · **OUT** = correctly a
sibling block, not this block.

| # | Draft element (line) | Draft value | Status | Attribute |
|---|---|---|---|---|
| 1 | Section band (969) | `background:#fff; border-top/bottom:1px #E6E1DA; padding:104px 52px / 56px 20px` | OUT | Emitted as the enclosing `sgs/container`. The annotator's box-owner climb puts the block root on the **inner bordered card**, not this band — correct, the band is page chrome. |
| 2 | Eyebrow "From the clinic" (972) | 12px / .24em / uppercase | OUT | Sibling `sgs/text`. Already in the emit. |
| 3 | H2 "What people say" (973) | Playfair 46px / 32px mobile | OUT | Sibling `sgs/heading`. **The heading is outside the card in the draft's DOM, so it must stay a sibling** — rendering it inside the block would be a mirror, not a convert. |
| 4 | Card box (976) | `border:1px #DADCE0; radius:12px; background:#fff; padding:28px 26px / 20px 16px; font-family:Roboto` | ✓ partly | `borderWidth` / `borderStyle` / `borderColour` / `borderRadius` all present **and already in the emit**. **GAP:** no `padding`, no background attr, no font-family attr on this block. |
| 5 | Header row (977) | `flex; space-between; gap:22px; wrap; padding-bottom:22px; border-bottom:1px #E8EAED` | GAP | `headerGap`, `headerPadding`, `headerDividerColour`, `headerDividerWidth` |
| 6 | Google "G" 30×30, **leading** (979) | `width:30;height:30`, opacity 1 | GAP | `showGoogleLogo` ✓ exists, but `style.css:77` hardcodes `width:60px; opacity:.7; margin-left:auto` → renders 60px on the **right**. Needs `logoSize`, `logoOpacity`, `logoPosition`. |
| 7 | Caption "Google Reviews" (981) | 13px #5F6368 / .01em | GAP | `sourceLabel` + `sourceLabel*` typography family. Not `businessName` — `block.json` already documents that a caption equal to the block's own name is reported SKIPPED, and that reasoning is right: this is the review **source**, not the client's business. |
| 8 | Big figure "4.7" (984) | 32px / line-height 1 / #202124 / 500 | ✓ content, GAP style | `averageRating` ✓ (emitted, 4.7). **GAP:** `score*` typography family + `scoreColour`. Needs render.php to give the `<strong>` its own class `__score`. |
| 9 | Star run, aggregate (985) | 18px glyphs, .12em, track #DADCE0, fill #FBBC04 at 94% | ✓ colour, GAP size | `starColour` ✓ (routing pending, §5). **GAP:** `aggregateStarSize`, `starEmptyColour`. |
| 10 | "15 reviews" (986) | 13.5px #5F6368 | ✓ content, GAP style | `reviewCount` ✓ (emitted, 15). **GAP:** `count*` typography + `countColour`. |
| 11 | "See all reviews" pill (990) | filled `#1A73E8`, white, radius 20, min-h 40, pad `0 22px`, 14px/500, hover `#1765CC` | GAP | **No second CTA exists on this block.** New `seeAll*` element (url, label, colours, radius, padding, min-height, typography) using the *same* `sgs_button_element_style_css()` recipe as `writeReview`. |
| 12 | "Write a review" pill (991) | outlined 1px `#DADCE0`, text `#1A73E8`, radius 20, min-h 40, pad `0 22px`, 14px/500, hover bg `#F1F6FE` | ✓ partly | `reviewRequestUrl` ✓ (emitted). `writeReviewColourText/Background(+Hover,+Gradient)` ✓. **GAP:** `writeReviewBorderWidth/Colour(+Hover)`, `writeReviewBorderRadius`, `writeReviewPadding`, `writeReviewMinHeight`, `writeReview*` typography, `writeReviewLabel` (render.php hardcodes "Write a Review" — wrong casing vs the draft). |
| 13 | Rail (996) | `flex; gap:16px; overflow-x:auto; scroll-snap x mandatory; padding-bottom:14px`, visible scrollbar | ✓ partly | `variant:"slider"` ✓ default. `gap` ✓ (element `inner`). **GAP:** `railPadding`, `scrollbar` (style.css:471–477 hides it unconditionally), `scrollbarColour`. |
| 14 | Review card `<figure>` (999) | `bg #fff; border 1px #E8EAED; radius 8px; padding 20px; flex col; gap 12px; width 340px / 270px` | GAP | `cardPadding`, `cardBorderWidth`, `cardBorderStyle`, `cardBorderColour`, `cardBorderRadius`, `cardBackground`, `cardGap`, `cardWidth`. (`cardStyle:"bordered"` ✓ is emitted but only sets a generic 1px + `--wp--preset--color--border`.) |
| 15 | Avatar (1001) | 40×40, radius 50%, `background:{{r.colour}}`, white 17px/500 initial | ✓ colour, GAP box | per-review `avatarColour` ✓ (all 13 emitted). **GAP:** `avatarSize`, `avatarBorderRadius`, `avatar*` typography family. style.css:275–305 hardcodes 40px / 50% / .9375rem / 700. |
| 16 | Author (1003) | 14px #202124 500, ellipsis | GAP | `author*` typography + `authorColour` |
| 17 | Reviewer meta (1004) | 12.5px #70757A | ✓ content, GAP style | per-review `meta` ✓ (emitted). **GAP:** `meta*` typography + `metaColour`. |
| 18 | Per-card Google "G" 17×17 (1006) | top-right of card header | GAP | `showCardLogo` (boolean, default `false`) + `cardLogoSize`. render.php draws no per-card logo today. |
| 19 | Card star run (1009) | 15px #FBBC04 | GAP | `starSize` (card-level; `aggregateStarSize` is the header one) |
| 20 | Card date (1010) | 12.5px #70757A | ✓ content, GAP style | per-review `date` ✓. **GAP:** `date*` typography + `dateColour`. |
| 21 | Blockquote (1012) | 14.5px / 1.6 / #3C4043 / `max-height:186px; overflow:hidden` (≈8 lines) | ✓ content, GAP style | per-review `text` ✓. **GAP:** `text*` typography + `textColour` + `textClamp` (bool) + `textClampLines` (number). style.css:355–359 hardcodes a 4-line clamp — this is the "cut to 4 lines" defect. |
| 22 | "Read the full review" (1014) | 13.5px #1A73E8, only when the review is long | GAP | per-review `url` ✓ **exists in the schema and is in the emit** (Hanif Ur-Rehman carries one) but render.php never draws it. Needs `showReviewLink`, `reviewLinkLabel`, `reviewLinkColour`, `reviewLink*` typography. |
| 23 | Footnote (1020) | "Scroll for more — 13 of the 15 reviews left a comment." 13px #5F6368, **bottom-left** | GAP | `footnote` (string, text-content) + `footnote*` typography + `footnoteColour`. **Recommend an attribute, not a sibling block** — it sits *inside* the bordered card and is laid out on the same flex row as the arrows, so a sibling could not be positioned there without mirroring the draft's DOM. |
| 24 | Prev/next arrows (1022, 1025) | 40×40 circle, border 1px #DADCE0, colour #1A73E8, **below-right, in flow** | ✓ partly | `showArrows` ✓, `arrowColour*` ✓. **GAP:** `arrowSize`, `arrowBorderWidth`, `arrowBorderRadius`, `navPosition`. style.css:496–508 fixes them `position:absolute; top:50%` over the rail and 44×44. |

**Totals:** 24 draft elements · 3 correctly OUT · 8 fully or partly covered by existing
attributes · **19 rows carrying at least one gap.**

---

## 2. New attributes

Every row below follows the block's own existing convention — `{elementPrefix}{PascalSuffix}` —
which is exactly how `writeReviewColourBackground` and `arrowColourBorderHover` are already
named, and which `sgs_button_element_style_css()` reads by `$prefix . 'Suffix'` concatenation.
Mechanism for all of them: **a rule in the block's own scoped `<style>`** built in `render.php`
into `$gr_responsive_css` and printed once — never an inline `style=` property (Spec 32).

**Shared components reused, nothing reinvented:** `TypographyControls` (one call per prefix —
it already drives font size/family/weight/style/line-height/letter-spacing/decoration/case/align
+ tiers), `SgsColourPanel` + `DesignTokenPicker` for colours, `SgsBoxControl` /
`ResponsiveBoxControl` for every box family, `ResponsiveControl` + `ResponsiveOverride` for
tiered scalars, `SgsBorderControl` for border shorthand, `SgsLengthControl` for single lengths.

### 2a. Named attributes

`css_tier` is `desktop` for every responsive-object attribute below (the tier is carried inside
the object, as `borderRadius` already does); `css_state` is `null` unless the name ends `Hover`.

| Attribute | Type / default | Control | `css_property` | `css_element` | `derived_selector` | `role` | `box_family` |
|---|---|---|---|---|---|---|---|
| `padding` | object `{}` | `SgsBoxControl` | `padding` | `wrapper` | `.sgs-google-reviews__border` | `visual` | `padding` |
| `backgroundColour` | string `''` | `SgsColourPanel` | `background-color` | `wrapper` | `.sgs-google-reviews__border` | `color` | — |
| `backgroundColourGradient` | string `''` | `SgsColourPanel` | `background-image` | `wrapper` | `.sgs-google-reviews__border` | `colour-gradient` | — |
| `headerGap` | object `{}` | `ResponsiveControl` | `gap` | `header` | `.sgs-google-reviews__aggregate` | `layout` | — |
| `headerPadding` | object `{}` | `SgsBoxControl` | `padding` | `header` | `.sgs-google-reviews__aggregate` | `visual` | `headerPadding` |
| `headerDividerColour` | string `''` | `SgsColourPanel` | `border-bottom-color` | `header` | `.sgs-google-reviews__aggregate` | `color` | — |
| `headerDividerWidth` | string `''` | `SgsLengthControl` | `border-bottom-width` | `header` | `.sgs-google-reviews__aggregate` | `visual` | — |
| `logoSize` | object `{}` | `ResponsiveControl` | `height,width` | `google-logo` | `.sgs-google-reviews__google-logo` | `layout` | — |
| `logoOpacity` | number `0.7` | `RangeControl` | `opacity` | `google-logo` | `.sgs-google-reviews__google-logo` | `visual` | — |
| `logoPosition` | enum `leading\|trailing` = `trailing` | `SelectControl` | — | — | — | `css-modifier` | — |
| `sourceLabel` | string `''` | `TextControl` | — | — | `.sgs-google-reviews__source-label` | `text-content` | — |
| `scoreColour` | string `''` | `SgsColourPanel` | `color` | `score` | `.sgs-google-reviews__score` | `color` | — |
| `countColour` | string `''` | `SgsColourPanel` | `color` | `count` | `.sgs-google-reviews__count` | `color` | — |
| `starSize` | object `{}` | `ResponsiveControl` | `height,width` | `star` | `.sgs-google-reviews__star` | `layout` | — |
| `aggregateStarSize` | object `{}` | `ResponsiveControl` | `height,width` | `aggregate-star` | `.sgs-google-reviews__aggregate .sgs-google-reviews__star` | `layout` | — |
| `starEmptyColour` | string `''` | `SgsColourPanel` | `fill` | `star` | `.sgs-google-reviews__star--empty` | `color` | — |
| `cardPadding` | object `{}` | `SgsBoxControl` | `padding` | `review` | `.sgs-google-reviews__review` | `visual` | `cardPadding` |
| `cardBorderWidth` | object `{}` | `SgsBorderControl` | `border-width` | `review` | `.sgs-google-reviews__review` | `visual` | `cardBorderWidth` |
| `cardBorderStyle` | string `solid` | `SgsBorderControl` | `border-style` | `review` | `.sgs-google-reviews__review` | `visual` | — |
| `cardBorderColour` | string `''` | `SgsColourPanel` | `border-color` | `review` | `.sgs-google-reviews__review` | `color` | — |
| `cardBorderColourGradient` | string `''` | `SgsColourPanel` | `border-color-gradient` | `review` | `.sgs-google-reviews__review` | `colour-gradient` | — |
| `cardBorderRadius` | object `{desktop:{}}` | `ResponsiveBoxControl` | `border-radius` | `review` | `.sgs-google-reviews__review` | `visual` | `cardBorderRadius` |
| `cardBackground` | string `''` | `SgsColourPanel` | `background-color` | `review` | `.sgs-google-reviews__review` | `color` | — |
| `cardGap` | object `{}` | `ResponsiveControl` | `gap` | `review` | `.sgs-google-reviews__review` | `layout` | — |
| `cardWidth` | object `{}` | `ResponsiveControl` | `flex-basis` | `review` | `.sgs-google-reviews__review` | `layout` | — |
| `avatarSize` | object `{}` | `ResponsiveControl` | `height,width` | `avatar` | `.sgs-google-reviews__avatar` | `layout` | — |
| `avatarBorderRadius` | object `{desktop:{}}` | `ResponsiveBoxControl` | `border-radius` | `avatar` | `.sgs-google-reviews__avatar` | `visual` | `avatarBorderRadius` |
| `authorColour` | string `''` | `SgsColourPanel` | `color` | `author` | `.sgs-google-reviews__author` | `color` | — |
| `metaColour` | string `''` | `SgsColourPanel` | `color` | `meta` | `.sgs-google-reviews__meta` | `color` | — |
| `dateColour` | string `''` | `SgsColourPanel` | `color` | `date` | `.sgs-google-reviews__date` | `color` | — |
| `textColour` | string `''` | `SgsColourPanel` | `color` | `text` | `.sgs-google-reviews__text` | `color` | — |
| `textClamp` | boolean `true` | `ToggleControl` | — | — | — | `behaviour` | — |
| `textClampLines` | number `4` | `RangeControl` (1–20) | `-webkit-line-clamp` | `text` | `.sgs-google-reviews__text` | `visual` | — |
| `showCardLogo` | boolean `false` | `ToggleControl` | — | — | `.sgs-google-reviews__card-logo` | `presence-boolean` | — |
| `cardLogoSize` | object `{}` | `ResponsiveControl` | `height,width` | `card-logo` | `.sgs-google-reviews__card-logo` | `layout` | — |
| `showReviewLink` | boolean `false` | `ToggleControl` | — | — | `.sgs-google-reviews__review-link` | `presence-boolean` | — |
| `reviewLinkLabel` | string `''` | `TextControl` | — | — | `.sgs-google-reviews__review-link` | `text-content` | — |
| `reviewLinkColour` | string `''` | `SgsColourPanel` | `color` | `review-link` | `.sgs-google-reviews__review-link` | `color` | — |
| `footnote` | string `''` | `TextControl` | — | — | `.sgs-google-reviews__footnote` | `text-content` | — |
| `footnoteColour` | string `''` | `SgsColourPanel` | `color` | `footnote` | `.sgs-google-reviews__footnote` | `color` | — |
| `railPadding` | object `{}` | `SgsBoxControl` | `padding` | `list` | `.sgs-google-reviews__list` | `visual` | `railPadding` |
| `scrollbar` | enum `hidden\|thin\|visible` = `hidden` | `SelectControl` | `scrollbar-width` | `list` | `.sgs-google-reviews__list` | `visual` | — |
| `scrollbarColour` | string `''` | `SgsColourPanel` | `scrollbar-color` | `list` | `.sgs-google-reviews__list` | `color` | — |
| `navPosition` | enum `overlay\|below-end` = `overlay` | `SelectControl` | — | — | — | `css-modifier` | — |
| `arrowSize` | object `{}` | `ResponsiveControl` | `height,width` | `arrow` | `.sgs-google-reviews__arrow` | `layout` | — |
| `arrowBorderWidth` | object `{}` | `SgsBorderControl` | `border-width` | `arrow` | `.sgs-google-reviews__arrow` | `visual` | `arrowBorderWidth` |
| `arrowBorderRadius` | object `{desktop:{}}` | `ResponsiveBoxControl` | `border-radius` | `arrow` | `.sgs-google-reviews__arrow` | `visual` | `arrowBorderRadius` |
| `writeReviewLabel` | string `''` | `TextControl` | — | — | `.sgs-google-reviews__write-review` | `text-content` | — |
| `writeReviewBorderWidth` | object `{}` | `SgsBorderControl` | `border-width` | `write-review` | `.sgs-google-reviews__write-review` | `visual` | `writeReviewBorderWidth` |
| `writeReviewBorderColour` | string `''` | `SgsColourPanel` | `border-color` | `write-review` | `.sgs-google-reviews__write-review` | `color` | — |
| `writeReviewBorderColourHover` | string `''` | `SgsColourPanel` | `border-color` (`hover`) | `write-review` | `.sgs-google-reviews__write-review` | `color` | — |
| `writeReviewBorderRadius` | object `{desktop:{}}` | `ResponsiveBoxControl` | `border-radius` | `write-review` | `.sgs-google-reviews__write-review` | `visual` | `writeReviewBorderRadius` |
| `writeReviewPadding` | object `{}` | `SgsBoxControl` | `padding` | `write-review` | `.sgs-google-reviews__write-review` | `visual` | `writeReviewPadding` |
| `writeReviewMinHeight` | object `{}` | `ResponsiveControl` | `min-height` | `write-review` | `.sgs-google-reviews__write-review` | `layout` | — |
| `seeAllUrl` | string `''` | `TextControl` (URL) | — | — | `.sgs-google-reviews__see-all` | `link-href` | — |
| `seeAllLabel` | string `''` | `TextControl` | — | — | `.sgs-google-reviews__see-all` | `text-content` | — |
| `seeAll{ColourBackground,ColourBackgroundHover,ColourText,ColourTextHover,ColourBorder,ColourBorderHover}` + each one's `…Gradient` sibling | string `''` ×12 | `SgsColourPanel` | as the `arrow` element's identical set | `see-all` | `.sgs-google-reviews__see-all` | `color` / `colour-gradient` | — |
| `seeAllBorderWidth` / `seeAllBorderRadius` / `seeAllPadding` / `seeAllMinHeight` | object `{}` ×4 | as the `writeReview` siblings | `border-width` / `border-radius` / `padding` / `min-height` | `see-all` | `.sgs-google-reviews__see-all` | `visual` / `layout` | matching families |

### 2b. Typography families (one `TypographyControls` call each, no bespoke controls)

Each prefix expands to the component's standard attribute set
(`{p}FontSize`, `{p}FontSizeUnit`, `{p}FontSizeTablet`, `{p}FontSizeMobile`, `{p}FontFamily`,
`{p}FontWeight`, `{p}FontStyle`, `{p}LineHeight`, `{p}LineHeightUnit`, `{p}LetterSpacing`,
`{p}LetterSpacingUnit`, `{p}TextTransform`, `{p}TextDecoration`, `{p}TextAlign`, `{p}TextWrap`),
rendered server-side by the one shared `sgs_typography_css_rule()` helper.

| Prefix | `derived_selector` for every member (one `attr-classification-overrides.json` entry per attr) | Draft value it carries |
|---|---|---|
| `''` (wrapper) | `.sgs-google-reviews__border` | `font-family:'Roboto',Arial,sans-serif` on the card — **this is the "card font family" gap** |
| `sourceLabel` | `.sgs-google-reviews__source-label` | 13px, letter-spacing .01em |
| `score` | `.sgs-google-reviews__score` | 32px / line-height 1 / weight 500 |
| `count` | `.sgs-google-reviews__count` | 13.5px |
| `author` | `.sgs-google-reviews__author` | 14px / 500 |
| `meta` | `.sgs-google-reviews__meta` | 12.5px |
| `date` | `.sgs-google-reviews__date` | 12.5px |
| `text` | `.sgs-google-reviews__text` | 14.5px / 1.6 |
| `avatar` | `.sgs-google-reviews__avatar-initials` | 17px / 500 |
| `footnote` | `.sgs-google-reviews__footnote` | 13px |
| `reviewLink` | `.sgs-google-reviews__review-link` | 13.5px |
| `writeReview` | `.sgs-google-reviews__write-review` | 14px / 500 |
| `seeAll` | `.sgs-google-reviews__see-all` | 14px / 500 |

**Count: 74 new named attributes (2a) + 13 typography families (2b).** Inspector cost is only
**13 extra panel rows**, because each typography family is one component call.

### 2c. New BEM classes `render.php` must emit (none exist today)

`__source-label` · `__score` (on the existing `<strong>`) · `__card-logo` · `__review-link` ·
`__footnote` · `__see-all`. Verified absent by
`grep -oE 'sgs-google-reviews__[a-z-]+' render.php | sort -u`.

---

## 3. Presets — ready-made looks

**Mechanism: extend the existing `cardStyle` attribute. No new mechanism, no new code.**
`cardStyle` is already declared in `block.json::supports.sgs.presetSelectors` and already has
three auto-derived `preset_implications` rows (`bordered`→`border` present, `elevated`→
`box-shadow` present, `flat`→neutral). `/sgs-update` re-derives those rows from `style.css`, so
adding a `.sgs-google-reviews--card-{slug}` rule block is all that is needed for the DB to learn
the new preset. Relabel the control "Card look".

`blocks.variant_attr` is **NULL** for this block and `variant` is the *display type*, not a look
— so the `variant_slots` route is the wrong one here (that table stores the discriminating slots
of a composite's structural variants, e.g. `sgs/hero` `split`).

| Preset slug | Who it suits | Implied values |
|---|---|---|
| `google-card` | **Reproduces the Eye Care draft exactly.** Any local business showing Google reviews. | card: `padding 20px`, `border 1px #E8EAED`, `radius 8px`, `background #fff`, `gap 12px`, `width 340px/270px`; wrapper `padding 28px 26px`, `radius 12px`, `border 1px #DADCE0`, font-family Roboto; `logoPosition:leading`, `logoSize 30px`, `logoOpacity 1`; `headerDividerColour #E8EAED`; `avatarSize 40px`, `avatarBorderRadius 50%`; `starSize 15px`, `aggregateStarSize 18px`, `starColour #FBBC04`, `starEmptyColour #DADCE0`; pills `radius 20px`, `padding 0 22px`, `minHeight 40px`; `navPosition:below-end`, `arrowSize 40px`, `arrowBorderRadius 50%`; `scrollbar:thin`; `textClampLines 8` |
| `quote-minimal` | Law firm, consultancy — restraint, no boxes | card: no border, no background, `padding 0`, `gap 8px`; text italic, larger; avatar hidden circle→square 32px; `navPosition:below-end`; `cardStyle` implies nothing else |
| `boxed` | Restaurant, trade — solid, confident tiles | card: `background` surface-alt, `padding 28px`, `radius 4px`, no border; `showCardLogo:false`; heavier author weight |
| `bubble` | Wedding planner, salon — soft speech-bubble cards with a tail | card: `radius 18px`, `background #fff`, `box-shadow`, `padding 22px`, a `::after` tail; avatar 48px sitting below the bubble |
| `wall-tile` | Any client wanting a masonry/wall of many short reviews | card: thin 1px hairline, `radius 0`, `padding 16px`, `gap 8px`, `textClampLines 3`; pairs with `variant:"wall"` |
| `flat` / `bordered` / `elevated` | existing — kept, unchanged | as today |

### How a draft value still beats a preset

A preset rule is written at **two classes**:
`.sgs-google-reviews--card-google-card .sgs-google-reviews__review { … }` → specificity (0,2,0).

An attribute-driven rule is written by `render.php` into the block's scoped `<style>` at
**three classes**: `.{$gr_uid}.wp-block-sgs-google-reviews .sgs-google-reviews__review { … }`
→ specificity (0,3,0), using the existing `$gr_root_sel` that `render.php` already builds.

**(0,3,0) > (0,2,0), so any value the pipeline writes into an attribute always paints over the
preset.** Presets are therefore pure starting points and need no converter policy change — the
converter can keep emitting whatever `cardStyle` it detects (the Eye Care run already emits
`"cardStyle":"bordered"`) without ever contesting a routed draft value. Gate this claim in
Task 4 with a negative control: set `cardStyle:"elevated"` **and** `cardBorderRadius 8px`, assert
the live computed `border-radius` is `8px`.

---

## 4. Display types

`variant` keeps its six values and its `slider` default (already correct in `block.json`).

| `variant` | What it looks like | Canvas |
|---|---|---|
| `slider` **(default)** | One horizontal rail, scroll-snap, arrows + dots, drag optional. The draft's shape. | ✓ |
| `grid` | `columns` tiles per tier (3/2/1 default), equal height | ✓ |
| `list` | Full-width stacked rows, one review per row | ✓ |
| `wall` | Dense masonry of short cards; pairs with `wall-tile` | ✓ |
| `badge` / `floating-badge` | Compact aggregate-only chip; breakdown suppressed | ✓ |

**Editor canvas:** no plan change is needed. `edit.js` already mounts `<ServerSideRender>` and
`preview-plan.js` + `editor-preview.js` already sanitise attributes and provide Sample / Empty /
Loading / Error states, so the canvas is **the real `render.php` output for every variant**, with
real reviews (written, live Google, or the clearly-labelled `dataSource:"placeholder"` set).
Because the canvas is the server render, every new attribute above appears in the canvas the
moment `render.php` emits it — no second copy of the layout to keep in step. Task 3's only job is
the inspector UI plus `editor.css` rules for the new element classes inside the canvas iframe.

---

## 5. Pipeline fit

| Attribute group | How the draft reaches it | Still needed |
|---|---|---|
| `averageRating`, `reviewCount`, `reviewRequestUrl`, per-review `author`/`text`/`date`/`meta`/`rating`/`avatarColour`/`url` | **Working today** — the header ladder + `arrayContentLift` + `scalarContentLift`; all 13 reviews are in `stage-4.json` | nothing |
| `sourceLabel`, `footnote`, `writeReviewLabel`, `seeAllLabel`, `reviewLinkLabel`, `seeAllUrl` | class-to-camel attribute-name match on an annotated `__source-label` / `__footnote` / `__see-all` element, exactly the route `reviewRequestUrl` uses | **Annotator work:** the header ladder must additionally name the caption, the footnote and the *second* anchor. Today it maps one anchor only — the `See all reviews` / `Write a review` pair must be told apart, which the DB can do by role (`link-href` for both) plus order, so add a `seeAllUrl` rung keyed on **first anchor in the header**, `reviewRequestUrl` on the **second** |
| Every CSS attribute in §2a / §2b | the converter's per-area fold, matched by the attribute's `derived_selector` against the annotated element | ⛔ **BLOCKED — see §7 R1.** The Eye Care draft styles these elements **inline**, and `styling_content.py` honours `derived_selector` only for class-CSS drafts. Until the fold honours `derived_selector` for inline declarations, every one of these is *reported skipped*, not routed (`test_area_css_skip_reporting.py`) |

**Recommendations on the three "absent" items from D1141:**

- **"See all reviews" → an attribute (`seeAllUrl`/`seeAllLabel`), not a sibling block.** It sits
  inside the bordered card, on the same flex row as the "Write a review" pill. A sibling block
  could not be placed there without mirroring the draft's DOM, which R-31-1/rule 1 forbids.
- **Caption "Google Reviews" → an attribute (`sourceLabel`), not `businessName`.** `block.json`
  already documents (and the annotator already enforces) that a caption equal to the block's own
  name is skipped; a dedicated source-label attribute is the honest home for it.
- **Footnote → an attribute (`footnote`).** Same in-card layout argument as "See all reviews".
- **Scrollbar → an attribute (`scrollbar` + `scrollbarColour`).** It is pure presentation of the
  block's own rail; there is nothing for a sibling block to be.

Nothing here needs a hardcoded dict: every routing decision is a `block_attributes` row
(`css_property`/`css_element`/`css_state`/`derived_selector`/`role`) plus one
`attr-classification-overrides.json` entry per attribute, seeded by `/sgs-update`.

---

## 6. Build split — 4 tasks, disjoint files

**Order: T1 → (T2 ‖ T3) → T4.** T1 must land first because T2 and T3 both read the schema.

### T1 — Schema + DB (blocking)
**Files:** `src/blocks/google-reviews/block.json` · `scripts/attr-classification-overrides.json`
**Do:** add all §2a + §2b attributes; add `elements` entries for the new prefixes (`header`,
`review`, `avatar`, `author`, `meta`, `date`, `text`, `score`, `count`, `source-label`,
`footnote`, `review-link`, `card-logo`, `see-all`, `list`, `google-logo`, `aggregate-star`) with
their `attrMap`; extend `supports.sgs.boxFamilies`; extend the `cardStyle` enum with the five new
preset slugs; add one override entry per attribute carrying `derived_selector` (+ `role` where
the suffix rule would mis-derive it).
**Accept:**
```bash
python plugins/sgs-blocks/scripts/sgs-update-v2.py            # reseed
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT count(*) FROM block_attributes WHERE block_slug='sgs/google-reviews' AND derived_selector IS NOT NULL"
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT enum_value, implied_property, is_neutral FROM preset_implications WHERE block_slug='sgs/google-reviews'"
```
Pass = every §2a/§2b attribute has a non-null `derived_selector`; `preset_implications` shows
8 `cardStyle` rows; `python plugins/sgs-blocks/scripts/consistency/check_db_consistency.py` green.

### T2 — Server render + stylesheet
**Files:** `src/blocks/google-reviews/render.php` · `src/blocks/google-reviews/style.css`
**Do:** emit the six new BEM classes (§2c); emit every §2a/§2b value into `$gr_responsive_css` at
`$gr_root_sel` scope; call `sgs_button_element_style_css($attributes,'seeAll', …)` alongside the
two existing calls; call `sgs_typography_css_rule()` once per §2b prefix; delete the hardcoded
`width:60px`/`opacity:.7` on `__google-logo`, the `-webkit-line-clamp:4`, the `40px`/`50%` avatar
box, the `44px` arrow box and the unconditional scrollbar hiding, replacing each with a
`:where()`-wrapped zero-specificity default; add the five new `--card-{slug}` preset rule blocks.
**Accept:** `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0 ·
`php -l` on render.php · `composer run phpcs -- src/blocks/google-reviews` ·
`python plugins/sgs-blocks/scripts/orchestrator/check_no_mirror.py` green.

### T3 — Editor UI
**Files:** `src/blocks/google-reviews/edit.js` · `editor-preview.js` · `preview-plan.js` ·
`editor.css` · `components/WrittenReviewsPanel.js`
**Do:** add ToolsPanel sections — *Card*, *Header*, *Reviewer*, *Review text*, *Buttons*,
*Navigation* — each built from `TypographyControls` / `SgsColourPanel` / `SgsBoxControl` /
`ResponsiveControl` / `DesignTokenPicker`; no bespoke control. Import `ToolsPanel` /
`ToolsPanelItem` from `../../components/primitives` **only** (D1141: the unprefixed import is the
crash). Add a "Card look" `SelectControl` for the extended `cardStyle`.
**Accept:** `npm --prefix plugins/sgs-blocks run build` clean ·
`npx jest plugins/sgs-blocks/tests/js --testPathPattern google-reviews` ·
`node plugins/sgs-blocks/scripts/survey-experimental-imports.js` exits 0 ·
`node plugins/sgs-blocks/scripts/qa/check-editor-render-parity.js` reports every new attribute
reflected in the canvas · `node plugins/sgs-blocks/scripts/check-dead-controls.js` 0 dead.

### T4 — Tests + live verification
**Files:** `plugins/sgs-blocks/tests/**` (new `google-reviews-attrs` suites) ·
`reports/visual-diff/2026-09-21-google-reviews.md`
**Do:** a unit test per §2a group asserting the emitted CSS; a **negative control** per preset
(disable the preset rule, assert the test fails); the specificity negative control from §3.
Then deploy and measure live.
**Accept (live, `--target eye-care-test`, real headed Chrome, one window):**
`python plugins/sgs-blocks/scripts/build-deploy.py --target eye-care-test`, then Playwright
`getComputedStyle` keyed by text content, at **1440** and **375**:

| Element | 1440 must equal | 375 must equal |
|---|---|---|
| card wrapper | `border-radius 12px`, `padding 28px 26px`, `border 1px solid rgb(218,220,224)` | `padding 20px 16px` |
| `__score` | `font-size 32px`, `font-weight 500`, `color rgb(32,33,36)` | same |
| `__star--full` (aggregate) | `fill rgb(251,188,4)`, `height 18px` | same |
| `__review` | `padding 20px`, `border-radius 8px`, `gap 12px`, `flex-basis 340px` | `flex-basis 270px` |
| `__avatar` | `width 40px`, `border-radius 50%` | same |
| `__text` | `font-size 14.5px`, `line-height 23.2px`, `-webkit-line-clamp 8` | same |
| `__write-review` | `border-radius 20px`, `min-height 40px`, `border-color rgb(218,220,224)`, `color rgb(26,115,232)` | same |
| `__see-all` | `background-color rgb(26,115,232)`, `color rgb(255,255,255)` | same |
| `__arrow` | `width 40px`, `border-radius 50%`, **not** `position:absolute` | same |

Plus `Stage 11.6 computed-parity.json` for the reviews section, and Bean's eye (R-31-13).

---

## 7. Risks and open questions — ranked

### R1 ⛔ NEEDS BEAN'S APPROVAL — the inline-CSS fold is a shared-mechanism change
**Problem.** The converter's per-area fold routes a declaration by **element name** only. The
Eye Care draft styles every element **inline**, so a declaration whose target is identified by an
attribute's `derived_selector` is reported skipped, never routed. This is already recorded in
D1141 and in twelve `attr-classification-overrides.json` `_reason` fields.
**Effect.** Without it, **every attribute in §2 stays at its default on this draft.** The block
gains the controls (real client value, real editor UI) but the pipeline still produces a
non-faithful clone — the gold stars stay taupe and the pill stays black.
**Recommendation.** Approve the fold change: honour `derived_selector` for inline declarations
exactly as `styling_content.py` already does for class CSS. It is one shared mechanism, it is the
*only* thing standing between this design and a faithful clone, and it is gated by an existing
test (`test_area_css_skip_reporting.py`) that will show the skip rows disappearing.
**This is a converter change and must not be built before Bean says yes** (project rule 7).

### R2 — 74 new attributes is a lot of surface
**Problem.** The block already has 76 attributes; this roughly doubles it.
**Effect.** Risk of an inspector a tech-illiterate client cannot navigate, and of a future
"dead control" (an attribute with no visible effect).
**Recommendation.** Ship it, but with two guards, both of which already exist in the tree:
`check-dead-controls.js` in T3's acceptance (catches any attribute with no render path), and the
six-section ToolsPanel grouping so the panel opens collapsed and shows ~13 rows, not 74. The
alternative — fewer attributes — simply moves the gap back to "cannot clone the draft", which is
the thing we are fixing.

### R3 — Two header CTAs where the block has one
**Problem.** The draft header carries **both** "See all reviews" (filled) and "Write a review"
(outlined); the block has only `reviewRequestUrl`. The annotator currently maps one anchor, and
in a previous run it lifted `"See all reviews"` into `reviewRequestUrl` as *text* (fixed by the
`link-href` role).
**Effect.** If the ladder is not extended, one of the two pills is silently lost, or the wrong
URL lands in the wrong attribute.
**Recommendation.** Add the `seeAll*` element (§2a) using the same `sgs_button_element_style_css()`
prefix recipe — zero new mechanism — and extend the header ladder with an **order-keyed** rung
(first header anchor → `seeAllUrl`, second → `reviewRequestUrl`), with both anchors' absence
reported per class under rule 4. This is annotator work inside `manifest_annotation.py`'s existing
header ladder, not a new shared mechanism, so it does **not** need a separate approval gate — but
flag the ladder diff in the T1 review.

---

## Open, tracked

- R1 blocks fidelity but **not** this build: T1–T4 are all valuable and all shippable without it.
  Build them, then land the fold change once approved and re-run the Eye Care clone.
- The two `dotColourGradient` / `dotColourHoverGradient` rows have `css_property` NULL in the DB
  (verified by the §0 query) — pre-existing, out of scope here, worth a separate fix.
