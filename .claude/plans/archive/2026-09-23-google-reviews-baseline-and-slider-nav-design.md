# `sgs/google-reviews`: the Google design becomes the baseline, and the slider gets real navigation architecture

**doc_type:** design · **date:** 2026-09-23 · **status:** PROPOSED, needs Bean's approval on §6
**Follows:** D1142 (selector-routed fold + attribute redesign). **Written for:** Bean.

## 1. What went wrong (evidence, measured 2026-09-23 on page 11 against the draft at 1440)

My "it matches" compared the style values of elements found by their text. It never compared positions, whether an
element exists, or the heading outside the card, and I never looked at the two screenshots. Bean found six failures:

| # | Failure | Proven cause |
|---|---|---|
| 1 | Heading and eyebrow start at x=120, card at x=52 (draft: both at 52) | The heading's container stops at the theme's 1200px content width; the draft's content is full width (1336). The draft declares no max-width, and absence is not being transferred for this container. |
| 2 | The "7" has a curved foot | Roboto is **not loaded** on the site (0 faces; the draft loads 4). The browser falls back to Arial. Same for the heading: Playfair Display is in the Eye Care theme snapshot but is not loaded live either, so it shows a fallback serif. |
| 3 | G is 60px and on the right | `logoSize`/`logoPosition` exist but nothing reads the draft's 30px leading G; the block's own default (trailing, 60px) shows. |
| 4 | No G on each review card | `showCardLogo` exists, default off; nothing reads the draft's per-card G. |
| 5 | Arrows float over the cards | `navPosition` default is `overlay`, absolute over the rail. The draft puts them below, on the right. Overlay covering content is a bad default whatever the draft says. |
| 6 | Dots under the card | `showDots` default on, scrollbar default hidden. The draft has a visible thin scrollbar and no dots. |

Also: the converter chose `cardStyle: "bordered"` (its detector matches "has a border"), so the Google look never
applied even where it would have helped.

**Root cause of 3 to 6:** these are LAYOUT CHOICES (order, placement, presence), not CSS values. The pipeline carries
CSS values; nothing reads layout choices from a draft's structure, so they all fell back to the block's old defaults.
And the old defaults are the old design.

## 2. Target

The Eye Care Google widget is the block's **baseline**: a new block with no settings touched looks like it. Every
other look and layout is an option on top. Nothing is removed; the old looks (flat, bordered, elevated) and the other
display types (grid, list, wall, badges) stay, redeveloped to share the new structure.

## 3. Block architecture

**3.1 Navigation placement: `navPosition`** (replaces `overlay` | `below-end`)

| Value | Layout | Notes |
|---|---|---|
| `below-end` **(default)** | footnote left, arrows right, in a row under the rail | the draft |
| `below-center` | arrows centred under the rail | |
| `below-split` | prev under the left edge, next under the right edge | |
| `sides` | `[prev] [rail] [next]` in one flex row: the rail shrinks to make room, so arrows can never cover a card | precedent: `sgs/testimonial-slider` stage row. At mobile the arrows move below (a side gutter eats a 375px screen) |
| `overlay-inset` | arrows over the rail's edges, and the rail gets inline padding equal to arrow size + gap, so no card ever sits under an arrow | replaces today's `overlay`, which covers content |

Arrow size, border, radius and colours keep their existing attributes. Every value is a modifier class on the block
root plus scoped rules; no inline styles.

**3.2 Progress indicator: `pagination`** (replaces the `showDots` + `scrollbar` pair, which could contradict)

`scrollbar` **(default, the draft)** · `dots` · `none`. With `scrollbar`: `scrollbarStyle` (thin | standard) and
`scrollbarColour` (existing). With `dots`: the existing dot colours. Pre-production: no deprecation, the old
attributes are replaced and the content re-cloned (D271/D293).

**3.3 Header:** `logoPosition` default `leading`, `logoSize` default 30px, `logoOpacity` default 1; caption above
the score; both buttons on the right (already built).

**3.4 Review card:** `showCardLogo` default **on** (the per-card G, 17px, top right, as Google shows it).

**3.5 Baseline CSS:** the `google-card` look's values move into the base stylesheet (card 20px padding, 8px radius,
`#E8EAED` border, 340/270px wide; 40px round initials; 15px gold stars; 8-line clamp; scrollbar). `cardStyle` keeps
eight values; `google-card` becomes the default, and `flat`/`bordered`/`elevated` become variations of the baseline.

**3.6 Shared slider navigation (universal, R-31-9).** Three blocks each carry their own copy of arrows + dots +
slider script (`google-reviews`, `trustpilot-reviews`, `testimonial-slider`) and none can place arrows. The
placement layer is built ONCE: `includes/helpers-slider-nav.php` (markup for arrows, dots/scrollbar, the nav row) +
`assets/css/slider-nav.css` (the five placements) + the shared attribute set. `google-reviews` adopts it now; the
other two adopt it in follow-up commits (see §6 Q3).

## 4. Pipeline: read layout choices from the draft's structure

Annotator rungs, DB-driven (each keyed to the attribute's declared element classes, never a block name), each
reported with the evidence it used:

- **Presence:** an attribute with role `presence-boolean` whose element class exists in the draft is `true`, and
  `false` when the element is absent. The per-card G gives `showCardLogo: true`, and no dot elements plus a visible
  scrollbar gives `pagination: scrollbar`.
- **Order:** the header's logo comes before the caption in the draft, so `logoPosition` is `leading`.
- **Placement:** the arrows sit in a row AFTER the rail, so `navPosition` is `below-end`. Arrows flanking the rail
  give `sides`, and arrows inside the rail's box give `overlay-inset`.
- **Size:** the logo's width/height route to `logoSize` through the selector route (investigate why it did not route).
- **Look:** the preset detector gains one universal rule, **prefer the default on a tie**: when the block's default
  look already satisfies the draft's signals (the Google baseline has a border), it is kept, not swapped for
  `bordered`. This is a shared resolver change (rule 7).

## 5. The two site-level causes (not the block)

- **Heading width:** find why the heading's container gets 1200px when the draft declares none (the "absence means
  full width" rule, CLAUDE.md), fix universally, prove on Mama's that nothing else moves.
- **Fonts:** find why Playfair (in the snapshot) is not loaded and Roboto (a font the draft loads for the widget) is
  not captured at all (Spec 33 extractor). Fix at the snapshot/extractor, not in the block.

## 6. Decisions for Bean

1. **The Google design as the block's default look.** Recommended: yes (your instruction).
2. **Arrow placements:** the five in §3.1. Recommended: all five, with `below-end` as the default.
3. **Shared navigation scope:** A) build the shared layer and move all three sliders onto it now, or B) build it
   shared, put Google reviews on it now, and move the other two in follow-up commits. Recommended: **B**. It proves
   the layer on the block you are reviewing first, and the other two follow without re-design.
4. **Two shared-mechanism changes (rule 7):**
   - the annotator's structural rungs (§4);
   - the preset detector's "prefer the default on a tie" rule.

   Recommended: yes to both.

## 7. Verification (what "matches" will mean this time)

Measured against the draft at **all three device widths: 1440, 768 and 375** (Bean, 2026-09-23), and **all** must
hold at each width before I say it matches:
- heading left edge = card left edge;
- G at 30px, left of the caption;
- 13 per-card G marks;
- no arrow box intersects any card box, at every placement;
- no dots, scrollbar visible;
- Roboto and Playfair loaded; the score's "7" pixel-compared.

The draft and live screenshots are then put **side by side and looked at**, plus a pixel diff of the card, before
anything is reported to you. The editor is checked for every placement and every look.
