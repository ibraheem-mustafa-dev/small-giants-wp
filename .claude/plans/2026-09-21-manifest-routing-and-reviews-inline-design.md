# Declared routing from the draft manifest + a written mode for `sgs/google-reviews` (v2, after /qc-council, 2026-09-21)

Status: the written mode in `sgs/google-reviews` is BUILT and live-verified (D1137, commits `065fe5de6`, `6d2d1984e`); Bean chose it over the Business Profile sync, which is deferred. The routing design below (manifest annotation, boundary rule, spec note) is still DESIGN for Bean's approval; nothing of it is built. v1 of this file (same day) was run through a five-rater council; three of its five fixes did not survive. This v2 is what survived plus what the council's experiments proved instead. Follows A2 (D1134).

## Facts (verified 2026-09-20/21)

- The Eye Care ticker is the dark strip above the header with 4 trust messages and icons. It never became a section: `recogniser/per-section-convention-voter.py::auto_detect_sections` emits only `section, header, footer, main, aside, nav` tags (`SECTION_TAGS`); the ticker is a `<div>` with no such descendant.
- Only 4 blocks may claim a section root from a class (`blocks.tier='class-section'`: hero, trust-bar, cta-section, notice-banner). Any other block named by a section root class is demoted to `sgs/container` and its children route separately (`converter/recognition.py::recognise_section`, the R1 gate, 2026-08-04).
- Mama's routed its reviews to `sgs/testimonial-slider` because the draft named the block on an INNER element (`.sgs-testimonial-slider`, `.sgs-testimonial`). The section stayed a container; the gate never applies to nested elements.
- The draft manifest already lists the sections, a suggested block per section and the data source of each repeated group; nothing in the pipeline reads it.
- `sgs/google-reviews` today: reviews come from Google (`Google_Reviews_Settings::fetch_reviews`, which needs a place ID AND an API key, and Google returns at most 5 reviews); with no place ID, no key or any API error it shows three dummy reviews, and it emits `LocalBusiness` + `AggregateRating` schema unconditionally, with the dummy 4.9 / 47 when there is no live data. That is live behaviour now, independent of anything in this design.
- Eye Care Google place ID (from Bean, 2026-09-21): `ChIJ2exjouG7cEgR8GMcMRmpX9k` (Ward End Eye Care Birmingham, 644 Washwood Heath Rd, Birmingham B8 2HQ). Finder: developers.google.com/maps/documentation/javascript/examples/places-placeid-finder.

## What the council decided

| v1 proposal | Verdict | Evidence |
|---|---|---|
| G1 every manifest-listed root becomes a boundary | KEEP, moved | Inject inside `auto_detect_sections` (it feeds the voter, `write_tagged_mockup`, `screen_route`, Stage 4), never a second list at Stage -2. Best form: an element whose BEM root class names a class-section block is a boundary whatever its tag |
| G2 route = a converter hook (`recognition_for_slug`) | CHANGED | The hook routes the node and loses its content (ticker 724 to 171 chars, `100% genuine` gone; reviews 19,163 to 124). It is also a non-BEM recognition signal (R-31-2). Replaced by annotation, below |
| G3 mark six blocks `is_section_root` | FALSIFIED, dropped | Helps exactly one class in 39 drafts (`sgs-google-reviews`) and there destroys 19,163 chars. brand-strip never calls the container wrapper; all six are `container_kind='layout'`, flag alone leaves DB rows stale. Safe to mark only feature-grid and testimonial-slider, and no draft benefits |
| G4 fieldMap fills arrays from captured rows, no Spec 45 | FALSE as stated | The array resolver reads BEM-classed DOM only; the A2b rows are discarded after splicing; icons resolve to no slug; the draft has no per-review rating. Replaced by annotation, below |
| G5 write `status: confirmed` into the draft | CHANGED | Write decisions to Spec 44's git-tracked `recogniser/classless-recognition-log.jsonl` with `source:"manifest"` (per-client, already surfaced in `operator-review.html`) |

## The design that survived: declared BEM annotation of the run copy

The manifest supplies BEM NAMES; recognition stays BEM-only (R-31-2 holds, no 4th walker exception, the converter is unchanged). A deterministic stage, run beside A1 and A2 on the run copy, reads the draft's `data-sgs-manifest` and adds classes:

1. A declared block on a class-section block (trust-bar): the root gets `sgs-trust-bar`; declared item and field elements get `sgs-trust-bar__item` / `__label`. **Proved on the real converter** (`qc2` probe, scratch): the ticker annotated this way emits `sgs/trust-bar` with `items:[4 labels]`, `100% genuine` present, 472 characters. Not yet proved: icons (`resolve_icon` returns no slug for these SVG paths; the raw `iconSvg` lifts) and `autoScroll` (never set by any run).
2. A declared block that is NOT a class-section block (reviews, brand strip, cards): the manifest names the INNER element that is the block (the rail), so the section stays `sgs/container` with its heading and aggregate, exactly the Mama's pattern. **Proved:** the rail annotated `sgs-testimonial-slider` with `sgs-testimonial` cards emits `testimonial-slider` + `testimonial` blocks inside the container, 11,973 characters; author and rating elements need their `__author` / `__rating` names from the same declaration.
3. Boundary (G1) as above.
4. Each declaration is checked: block in the DB, class found in the draft, block section-capable where a section root is claimed. A failure is a report row, never silent (rule 4). A draft with no manifest is byte-identical (Mama's in place).
5. Confidence: high accepted, medium and low queued through Spec 44's review queue; the decision is stored in the jsonl above.

Spec change: one new FR under Spec 31 §13.2 ("a declared class-to-block map is an authorised INPUT that becomes BEM class names in the run copy; recognition still reads BEM only") and a pointer under R-31-2.

## Written mode for `sgs/google-reviews` (council: SOUND-WITH-CHANGES)

Field names follow the `sgs/trustpilot-reviews` precedent, one shared normaliser `includes/reviews-inline.php` for both blocks (R-31-9; `render.php` is 865 lines):

1. `dataSource`: `synced` (today's Google fetch) | `inline` (written) | `placeholder` (the dummy reviews, only when asked for).
2. `reviews[]` item `{author, reviewBody, rating, datePublished, dateLabel, title, isVerified, photo, meta, profileUrl}` with `items.properties` declared and canonical slots set, otherwise `arrayContentLift` lifts nothing and the converter raises on its conservation check. `dateLabel` keeps the draft's free text ("2 years ago", "a year ago"); `strtotime("a year ago")` returns about now, so an ISO date and a label are stored and the label is shown when present.
3. Rows with no rating are not dropped by `minRating` (today every draft review would be filtered out silently), and the block has an empty state.
4. Schema: no `Review` / `AggregateRating` in `inline` or `placeholder` mode and no switch to turn it on. Google's review-snippet guidance makes reviews an entity controls about itself ineligible.
5. Editor: a repeater for every field; avatar colour by custom property (Spec 32, no inline style).
6. `/sgs-update` registration; canary and Eye Care live checks; all six variants render from written reviews.

**Fix now, separately (small, independent of the rest):** the dummy reviews and the unconditional `LocalBusiness` / `AggregateRating` schema must not reach a visitor when there is no live data. Gate the dummy behind `dataSource:'placeholder'` and emit schema only from live synced data.

## Order (each its own commit, each proved on the real page)

1. Gate the dummy reviews and the schema (small, standalone; canary check).
2. Annotation stage plus the boundary rule, proved on the ticker: `100% genuine` in `block_markup` and on the live page at 375 and 1440; Mama's byte-identical in place; planted-violation controls (unknown block, class not found, block not section-capable). Then icons and `autoScroll` as a stated follow-up, not assumed.
3. Written mode in the block and the shared normaliser.
4. Reviews: the manifest declares the rail as `google-reviews` (or `testimonial-slider` if written mode is not ready), 13 reviews in the block, no dummy on the page.
5. Spec FR + the Spec 44 jsonl write-back.

## Not in this design
The lenses flow and the WooCommerce price features, `<sc-if>` page-level branches, and the `flex-wrap` transfer for classless rails (moot for the reviews once they sit in a slider block).
