# Eye Care home page: whole-site audit, draft vs live (2026-09-24)

Method: `plugins/sgs-blocks/scripts/parity/draft-vs-live/README.md` (Spec 20 FR-20-12). Draft served locally
(`design_handoff_ward_end_eye_care_v2/Eye Care Birmingham.dc.html`), live = eye-care-test page 11
(`/eye-care-birmingham/`, last converted by run `eye-care-ward-end-eye-care-birmingham-2026-09-23-204246`).
Full-page captures at 1440, 768 and 375 on both, put side by side and looked at. Every finding was then traced in
the live DOM and the run's `extract.json` / `screens.json`.

**Page height:** draft 6,431px, live 4,956px at 1440 (draft 9,546 / live 5,677 at 768; 8,966 / 6,367 at 375).

## Section inventory (1440)

| # | Draft section | Draft top / height | Live | State |
|---|---|---|---|---|
| - | Site header (logo, nav, phone, bag) | 0 / 120 | Theme default header with a list of every page, plus the page title "Eye Care Birmingham (clone)" | **Missing** |
| 1 | Hero, "The same designer shades." | 120 / 756 | 96px empty dark band | **Missing** |
| 2 | Brand marquee | 876 / 97 | 230px white band, logos present but invisible | **Invisible** |
| 3 | Best sellers (8 product cards) | 973 / 1,219 | nothing | **Missing** |
| 4 | Why buy (4 reasons) | 2,192 / 674 | present; heading and the 4 card titles invisible | **Invisible parts** |
| 5 | Start with a shape (6 tiles) | 2,865 / 569 | heading only; tiles became one line of text | **Broken** |
| 6 | What people say (reviews) | 3,435 / 885 | matches (verified 2026-09-23 at 12 widths) | OK |
| 7 | About strip, "Any pair here" | 4,319 / 781 | no photo; the 3 steps became "First list item, Second, Third"; button became plain text | **Broken** |
| 8 | Optician, "I'm Fatima Nawaz" | 5,100 / 866 | text present; both buttons became one line of text; photo panel squashed to a strip | **Broken** |
| - | Other screens' templates | not on the home page | ~20 blocks of raw `{{ cur.brand }}`, `{{ o.title }}` etc. after the optician section | **Junk added** |
| - | Site footer (4 columns, socials) | 5,966 / 465 | copyright line only | **Missing** |

The same findings hold at 768 and 375: every defect is about presence, not width. Width-only differences: at 768 the
live trust ticker wraps into two static rows where the draft scrolls one line. (At a 768 window the draft shows its
phone layout; see the README trap. None of the findings depend on it.)

## Findings, ranked by what the visitor loses, each with its proven cause

1. **Hero missing.** The top of the page. `extract.json` b3 emits `<!-- wp:sgs/hero … /-->` with no content; four
   `content_gaps` rows read "composite-interior column has no BEM __element, cannot route by slot". The draft's hero
   interior is classless divs (image, overlay, text column with p/h1/p/buttons). **Layer: converter.** A composite's
   classless interior is dropped instead of routed.
2. **Best sellers missing.** b5 status `unmatched-classless-review`, zero markup: a classless section with no match
   (the known b3/b4/b6 queue in the 2026-09-20 plan), and its 8 products live only in the script's `PRODUCTS` array
   (plan Track A2). **Layer: recogniser + JS-content reader.**
3. **Header and footer missing.** b2 and b29 `chrome-skipped` by design; no Eye Care header or footer exists on the
   site, so the theme default shows (a page list as navigation). The page template also prints the page title,
   which the draft does not have. **Layer: header/footer emit not built (Spec 33 Part 2 / plan Track D).**
4. **Other screens' templates dumped on the home page.** `screens.json::outside_screens` lists b32–b37 and b65–b70:
   the lens drawer, loop items of the menu and bag, and the prescription choice flow. They sit outside every screen
   branch, so the run treats them like page content. The sc-var and dom-shape gates then convert them; every
   `{{ }}` is left raw. b38/b39 are Home-screen loop templates converted the same way. **Layer: pipeline.** Overlays
   are not told apart from page content; the draft manifest that already classifies them (drawer, modal, flow) is
   built but not called (plan section 1 item 8).
5. **Brand logos invisible.** The 16 logos are uploaded, loaded and placed (155×158 tiles), but they paint behind
   the section's white background. `assets/css/media-element.css::.sgs-media-el` sets
   `z-index: var(--sgs-media-svg-zindex, -1)`: an SVG-layer default that applies to every media element. Inside
   the brand strip's flex item, `z-index` takes effect, so the image drops below the white background.
   **Layer: framework CSS bug**, and not specific to Eye Care: any sgs/media image that is a flex or grid item
   with no stacking context is affected.
6. **Why-buy heading and card titles invisible.** Near-black text on the black band: computed `rgb(20,20,20)` from
   `h1, h2, h3, h4, h5, h6 { color: var(--wp--preset--color--text) }`. That rule comes from the snapshot's
   `styles.elements.heading.color.text`. The band sets `#FAF8F5` and the eyebrow and body text inherit it; the
   headings cannot inherit, because the element rule wins. In the draft, headings inherit their section's colour.
   **Layer: Spec 33 extractor / theme.** A global heading colour was written although the draft's headings
   inherit.
7. **Shape tiles flattened.** b7's six tiles (photo, outline icon, label) became one `sgs/text` holding their
   labels. The tiles are a `<sc-for>` over the `SHAPES` array with images. **Layer: JS-content reader (Track A2).**
8. **About strip broken.** Three causes in b9:
   - the `<ol>` steps became an `sgs/icon-list` with no items (gap row: "no content arm produced a result"), so
     the block's placeholder items show;
   - the `sgs/media` was emitted with no image;
   - the `<button>` "How lenses work here" became `sgs/text`.

   **Layer: converter.** List item text is lost, image source is lost, and the draft's `<button onClick>` links
   are not recognised as buttons.
9. **Optician buttons lost.** b10 puts the WhatsApp `<a>` and the "My qualifications" `<button>` into one
   `sgs/text`. The photo placeholder became a text block with no height. **Layer: converter** (same `<button>`
   cause as 8).
10. **Detail (after the above):** the eyebrow and numeral accent colours (draft tan, live white), the trust
    ticker's scroll at 768, and a site title.

## Recommended fix order

1. **Finding 5** (logos): a one-rule framework fix, proven, small. It also protects every other media image.
2. **Finding 6** (heading colour): a Spec 33 extractor rule. It is shared across clients, so it gets a short
   design note first.
3. **Finding 4** (junk on the page): wire the draft manifest's overlay classification so outside-screen overlays
   are reported, not converted. It is a converter change, so rule 7 applies (design gate).
4. **Findings 1, 8, 9** (hero, about strip, optician): converter routing for classless composite interiors, `<ol>`
   items, image sources and `<button>` links. Rule 7 design gate.
5. **Findings 2, 7** (best sellers, shapes): the JS-array content reader, plan Track A2, with its own design gate.
6. **Finding 3** (header, footer): Spec 33 Part 2 / Track D.
7. Then re-clone page 11 and re-run this audit at 1440/768/375.

## Progress

- **2026-09-24, findings 5 and 6 fixed** (commit f0d94efd4, deployed to eye-care-test):
  - Verified live at 1440, 768 and 375:
    - all 16 logos paint, and every `.sgs-media-el` computes `z-index: auto`;
    - the why-buy heading and the four card titles compute `rgb(250,248,245)`;
    - negative control: the headings on light sections stay `rgb(20,20,20)`.
  - New detail found: the live logo tiles are 155px squares in a 230px band, against the draft's small logos in a
    97px strip, and the draft's 64s marquee speed has no attribute to go to (b4 `content_gaps`).
- **Found while fixing, not yet addressed:** regenerating the Eye Care snapshot from the current draft files
  changes far more than the heading colour. The primary colour would become `#1A73E8` (Google blue), and the
  button presets change too. The committed snapshot's `draft_source_sha256` matches none of the three draft
  folders. Only the heading rule was applied to the committed snapshot. The drift needs its own investigation
  before any full re-extract.
- **2026-09-24, finding 4 fixed** (D1147). The page was re-cloned from the v2 draft (run `2026-09-24-000044`), and
  this also applies the D1145 full-width revert.
  - Live at 1440, 768 and 375: zero `{{` characters, no stray "Click Here" button, and all real sections present.
  - The 14 overlay pieces and 1 nested item are listed in that run's `extract.json`.
- **Correction to the drift note above:** the snapshot was built from the v1 draft folder, and v2 is the current
  draft. The regeneration differences are v1 against v2, not unexplained drift. A v2 extraction picks Google blue
  as the primary colour, which is still to be fixed before the snapshot is rebuilt from v2.
